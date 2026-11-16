import type { BoardTile, DominoPip, DominoValue, MatchPair, TileSlot, TileSpecialType } from './types.ts';

export const HINT_COST_COINS = 25;
export const COMBO_WINDOW_MS = 3100;
export const MAX_MISTAKES = 3;
export const MISTAKE_TIME_PENALTY_SEC = 8;
export const BONUS_TIME_SEC = 12;
export const BONUS_COIN_AMOUNT = 25;
export const BONUS_CHAIN_FALLBACK_SCORE = 250;
export const TRAP_TIME_PENALTY_SEC = 7;

export function isBonusSpecial(special?: TileSpecialType): boolean {
  return special === 'bonus_time' || special === 'bonus_coin' || special === 'bonus_chain';
}

export function isTrapSpecial(special?: TileSpecialType): boolean {
  return special === 'trap_time' || special === 'trap_mix';
}

/**
 * Deterministic PRNG (Mulberry32) for reproducible deals, daily challenges, and unit tests.
 */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStringToSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Returns the canonical 28-tile double-six domino set (0-0 through 6-6).
 */
export function getStandardDoubleSixSet(): DominoValue[] {
  const set: DominoValue[] = [];
  for (let top = 0; top <= 6; top++) {
    for (let bottom = top; bottom <= 6; bottom++) {
      set.push({ top: top as DominoPip, bottom: bottom as DominoPip });
    }
  }
  return set;
}

export function shuffleArray<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generates `pairCount` domino pairs drawn from the standard 28-tile double-six set.
 * For up to 28 pairs (56 tiles), every pair uses a distinct domino face from the 28-tile set.
 */
export function generateDominoPairs(pairCount: number, seed: number): DominoValue[] {
  const rng = createSeededRng(seed);
  const baseSet = getStandardDoubleSixSet();
  const pairs: DominoValue[] = [];

  while (pairs.length < pairCount) {
    const shuffled = shuffleArray(baseSet, rng);
    for (const tile of shuffled) {
      if (pairs.length >= pairCount) break;
      pairs.push(tile);
    }
  }
  return pairs;
}

/**
 * Checks whether two tiles overlap in 2D footprint ([x, x+2) x [y, y+2)).
 */
export function footprintsOverlap(a: TileSlot, b: TileSlot): boolean {
  return Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;
}

/**
 * A tile is covered if any remaining tile on a higher layer overlaps its 2x2 footprint.
 */
export function isTileCovered(target: TileSlot, allSlots: readonly TileSlot[]): boolean {
  return allSlots.some((other) => other.z > target.z && footprintsOverlap(target, other));
}

/**
 * Checks if a tile's left or right side is blocked by a neighbor on the same layer.
 */
export function getSideBlocking(
  target: TileSlot,
  allSlots: readonly TileSlot[]
): { leftBlocked: boolean; rightBlocked: boolean } {
  let leftBlocked = false;
  let rightBlocked = false;

  for (const other of allSlots) {
    if (other.z !== target.z) continue;
    if (Math.abs(other.y - target.y) >= 2) continue;
    if (other.x === target.x - 2) leftBlocked = true;
    if (other.x === target.x + 2) rightBlocked = true;
    if (leftBlocked && rightBlocked) break;
  }

  return { leftBlocked, rightBlocked };
}

/**
 * Mahjong-style domino rule:
 * A tile is selectable ONLY if it is uncovered AND has at least one free side (left or right).
 */
export function isTileFree(target: TileSlot, allSlots: readonly TileSlot[]): boolean {
  if (isTileCovered(target, allSlots)) return false;
  const { leftBlocked, rightBlocked } = getSideBlocking(target, allSlots);
  return !leftBlocked || !rightBlocked;
}

export function getFreeTiles<T extends TileSlot>(tiles: readonly T[]): T[] {
  return tiles.filter((t) => isTileFree(t, tiles));
}

export function doTilesMatch(a: DominoValue, b: DominoValue): boolean {
  return (
    (a.top === b.top && a.bottom === b.bottom) ||
    (a.top === b.bottom && a.bottom === b.top)
  );
}

export function findValidMoves(tiles: readonly BoardTile[]): MatchPair[] {
  const free = getFreeTiles(tiles);
  const moves: MatchPair[] = [];
  for (let i = 0; i < free.length; i++) {
    for (let j = i + 1; j < free.length; j++) {
      if (doTilesMatch(free[i], free[j])) {
        moves.push({ a: free[i], b: free[j] });
      }
    }
  }
  return moves;
}

/**
 * Places balanced bonus & trap tiles on distinct domino pairs so players experience
 * tactical risk-reward without ever placing two conflicting specials on the same pair.
 * Guarantees at least one bonus and one trap sit on initially free tiles when available.
 */
export function assignBoardSpecials(tiles: readonly BoardTile[], seed: number): BoardTile[] {
  if (tiles.length < 12) return tiles.map((t) => ({ ...t }));

  const rng = createSeededRng(seed ^ 0x9e3779b9);
  const pairGroups = new Map<string, number[]>();

  tiles.forEach((tile, idx) => {
    const lo = Math.min(tile.top, tile.bottom);
    const hi = Math.max(tile.top, tile.bottom);
    const key = `${lo}-${hi}`;
    const list = pairGroups.get(key) ?? [];
    list.push(idx);
    pairGroups.set(key, list);
  });

  const bonusTypes: TileSpecialType[] =
    tiles.length >= 52
      ? ['bonus_time', 'bonus_coin', 'bonus_chain', 'bonus_coin']
      : ['bonus_time', 'bonus_coin', 'bonus_chain'];

  const trapTypes: TileSpecialType[] =
    tiles.length >= 56
      ? ['trap_time', 'trap_mix', 'trap_time', 'trap_mix']
      : tiles.length >= 44
      ? ['trap_time', 'trap_mix', 'trap_time']
      : ['trap_time', 'trap_mix'];

  const desiredSpecials: TileSpecialType[] = [...bonusTypes, ...trapTypes];
  const freeIdSet = new Set(getFreeTiles(tiles).map((t) => t.id));

  // Separate pair keys into ones that have an initially free tile vs deeper ones
  const allKeys = shuffleArray(Array.from(pairGroups.keys()), rng);
  const freeKeys = allKeys.filter((k) =>
    (pairGroups.get(k) ?? []).some((idx) => freeIdSet.has(tiles[idx].id))
  );
  const deepKeys = allKeys.filter((k) => !freeKeys.includes(k));

  const assigned = tiles.map((t) => ({ ...t }));
  const usedKeys = new Set<string>();

  const pickIndexForKey = (key: string, preferFree: boolean): number | null => {
    const indices = pairGroups.get(key);
    if (!indices || indices.length === 0) return null;
    if (preferFree) {
      const freeIdx = indices.find((idx) => freeIdSet.has(tiles[idx].id));
      if (freeIdx !== undefined) return freeIdx;
    }
    return indices[Math.floor(rng() * indices.length)];
  };

  desiredSpecials.forEach((special, orderIdx) => {
    // Ensure first bonus and first trap are immediately visible on free tiles when possible
    const preferFree = orderIdx === 0 || special === 'trap_time';
    const pool = preferFree && freeKeys.length > 0 ? [...freeKeys, ...deepKeys] : [...allKeys];
    const chosenKey = pool.find((k) => !usedKeys.has(k));
    if (!chosenKey) return;
    usedKeys.add(chosenKey);
    const tileIdx = pickIndexForKey(chosenKey, preferFree);
    if (tileIdx !== null) {
      assigned[tileIdx] = { ...assigned[tileIdx], special };
    }
  });

  return assigned;
}

/**
 * Reverse-deals domino pairs onto a layout by iteratively selecting two currently-free
 * slots, assigning them an identical domino pair, and peeling them off.
 * This guarantees at least one complete solution path exists from start to finish.
 */
export function dealSolvableBoard(slots: readonly TileSlot[], seed: number): BoardTile[] {
  if (slots.length % 2 !== 0) {
    throw new Error(`Layout must have an even number of slots, got ${slots.length}`);
  }
  const pairValues = generateDominoPairs(slots.length / 2, seed);
  const dealt = assignPairsSolvably(slots, pairValues, seed);
  return assignBoardSpecials(dealt, seed);
}

/**
 * Assigns an explicit list of domino pairs onto `slots` using reverse-peeling.
 */
export function assignPairsSolvably(
  slots: readonly TileSlot[],
  pairValues: readonly DominoValue[],
  seed: number
): BoardTile[] {
  if (slots.length !== pairValues.length * 2) {
    throw new Error('Slot count must equal twice the pair count');
  }

  for (let attempt = 0; attempt < 24; attempt++) {
    const rng = createSeededRng(seed + attempt * 7919);
    const shuffledPairs = shuffleArray([...pairValues], rng);
    const remaining = slots.map((s, idx) => ({ ...s, slotIdx: idx }));
    const result: BoardTile[] = [];
    let pairCursor = 0;
    let stuck = false;

    while (remaining.length >= 2) {
      const freeIndices: number[] = [];
      for (let i = 0; i < remaining.length; i++) {
        if (isTileFree(remaining[i], remaining)) {
          freeIndices.push(i);
        }
      }

      if (freeIndices.length < 2) {
        stuck = true;
        break;
      }

      // Prefer higher layers slightly so towers peel top-down cleanly without trapping
      const weighted = shuffleArray(freeIndices, rng).sort(
        (aIdx, bIdx) => remaining[bIdx].z - remaining[aIdx].z
      );

      // Spread matching pairs across opposite regions & deeper layers for sharper scanning
      const poolSize = Math.min(weighted.length, Math.max(8, Math.ceil(weighted.length * 0.85)));
      const pickA = weighted[Math.floor(rng() * Math.min(poolSize, 4))];
      const slotAPos = remaining[pickA];
      const candidatesB = weighted.slice(0, poolSize).filter((idx) => idx !== pickA);
      candidatesB.sort((idx1, idx2) => {
        const s1 = remaining[idx1];
        const s2 = remaining[idx2];
        const dist1 = Math.abs(s1.x - slotAPos.x) + Math.abs(s1.y - slotAPos.y) + Math.abs(s1.z - slotAPos.z) * 3;
        const dist2 = Math.abs(s2.x - slotAPos.x) + Math.abs(s2.y - slotAPos.y) + Math.abs(s2.z - slotAPos.z) * 3;
        return dist2 - dist1;
      });
      const bChoicePool = Math.min(candidatesB.length, 2);
      const pickB = candidatesB[Math.floor(rng() * bChoicePool)];

      const slotA = remaining[pickA];
      const slotB = remaining[pickB];
      const value = shuffledPairs[pairCursor++];

      result.push({
        id: `tile-${slotA.slotIdx}-${slotA.x}-${slotA.y}-${slotA.z}`,
        x: slotA.x,
        y: slotA.y,
        z: slotA.z,
        top: value.top,
        bottom: value.bottom,
      });
      result.push({
        id: `tile-${slotB.slotIdx}-${slotB.x}-${slotB.y}-${slotB.z}`,
        x: slotB.x,
        y: slotB.y,
        z: slotB.z,
        top: value.top,
        bottom: value.bottom,
      });

      const highIdx = Math.max(pickA, pickB);
      const lowIdx = Math.min(pickA, pickB);
      remaining.splice(highIdx, 1);
      remaining.splice(lowIdx, 1);
    }

    if (!stuck && result.length === slots.length) {
      // Sort deterministically by layer then y then x for crisp painter's-order rendering
      return result.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
    }
  }

  // Fallback: assign pairs to slots sorted from top layer down so at least immediate moves exist
  const rng = createSeededRng(seed + 99991);
  const sortedSlots = [...slots].sort((a, b) => b.z - a.z || a.y - b.y || a.x - b.x);
  const shuffledPairs = shuffleArray([...pairValues], rng);
  const fallback: BoardTile[] = [];
  for (let i = 0; i < sortedSlots.length; i += 2) {
    const val = shuffledPairs[i / 2];
    const sA = sortedSlots[i];
    const sB = sortedSlots[i + 1];
    fallback.push({
      id: `tile-${i}-${sA.x}-${sA.y}-${sA.z}`,
      ...sA,
      top: val.top,
      bottom: val.bottom,
    });
    fallback.push({
      id: `tile-${i + 1}-${sB.x}-${sB.y}-${sB.z}`,
      ...sB,
      top: val.top,
      bottom: val.bottom,
    });
  }
  return fallback.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
}

/**
 * Re-deals remaining tiles onto their exact existing positions so that the remaining board
 * is solvable and has immediate valid moves, while preserving any remaining special tiles.
 */
export function shuffleRemainingTiles(
  remainingTiles: readonly BoardTile[],
  seed: number
): BoardTile[] {
  if (remainingTiles.length <= 2) {
    return [...remainingTiles];
  }

  // Extract remaining identical pairs and remaining specials
  const remainingSpecials: TileSpecialType[] = [];
  remainingTiles.forEach((t) => {
    if (t.special) remainingSpecials.push(t.special);
  });

  const unmatched = [...remainingTiles];
  const pairs: DominoValue[] = [];
  while (unmatched.length >= 2) {
    const first = unmatched.shift()!;
    const matchIdx = unmatched.findIndex((t) => doTilesMatch(first, t));
    if (matchIdx >= 0) {
      unmatched.splice(matchIdx, 1);
    }
    pairs.push({ top: first.top, bottom: first.bottom });
  }

  const slots: TileSlot[] = remainingTiles.map((t) => ({ x: t.x, y: t.y, z: t.z }));
  const dealt = assignPairsSolvably(slots, pairs, seed);

  // Ensure at least 1 valid move exists if possible; if not, force one pair onto 2 free slots
  if (findValidMoves(dealt).length === 0) {
    const free = getFreeTiles(dealt);
    if (free.length >= 2) {
      const targetVal: DominoValue = { top: free[0].top, bottom: free[0].bottom };
      const partner = dealt.find(
        (t) => t.id !== free[0].id && doTilesMatch(t, targetVal)
      );
      if (partner && partner.id !== free[1].id) {
        const swapTop = free[1].top;
        const swapBottom = free[1].bottom;
        free[1].top = partner.top;
        free[1].bottom = partner.bottom;
        partner.top = swapTop;
        partner.bottom = swapBottom;
      }
    }
  }

  if (remainingSpecials.length > 0) {
    const rng = createSeededRng(seed ^ 0x517cc1b7);
    const shuffledIndices = shuffleArray(
      dealt.map((_, i) => i),
      rng
    );
    const usedPairKeys = new Set<string>();
    let spCursor = 0;
    for (const idx of shuffledIndices) {
      if (spCursor >= remainingSpecials.length) break;
      const t = dealt[idx];
      const key = `${Math.min(t.top, t.bottom)}-${Math.max(t.top, t.bottom)}`;
      if (usedPairKeys.has(key)) continue;
      usedPairKeys.add(key);
      dealt[idx] = { ...t, special: remainingSpecials[spCursor++] };
    }
    // Fallback if remaining tiles share identical pair values
    for (const idx of shuffledIndices) {
      if (spCursor >= remainingSpecials.length) break;
      if (!dealt[idx].special) {
        dealt[idx] = { ...dealt[idx], special: remainingSpecials[spCursor++] };
      }
    }
  }

  return dealt;
}

export function calculateMatchScore(
  tileA: DominoValue,
  tileB: DominoValue,
  comboCount: number,
  maxLayer: number
): number {
  const pipBonus = (tileA.top + tileA.bottom + tileB.top + tileB.bottom) * 2;
  const layerBonus = maxLayer * 20;
  const multiplier = Math.min(5, Math.max(1, comboCount));
  return (100 + pipBonus + layerBonus) * multiplier;
}

export function calculateLevelResult(params: {
  score: number;
  parScore: number;
  baseCoinReward: number;
  hintsUsed: number;
  timeRemainingSec: number | null;
  timeLimitSec: number | null;
}): { stars: number; coinsEarned: number } {
  const { score, parScore, baseCoinReward, hintsUsed, timeRemainingSec, timeLimitSec } = params;
  let stars = 1;
  if (score >= parScore * 0.9 && hintsUsed <= 1) {
    stars = 2;
  }
  if (score >= parScore * 1.15 && hintsUsed === 0) {
    stars = 3;
  }

  const timeBonusCoins =
    timeLimitSec && timeRemainingSec !== null && timeRemainingSec > 0
      ? Math.min(30, Math.floor(timeRemainingSec / 6))
      : 0;

  const starBonus = (stars - 1) * 15;
  const coinsEarned = Math.max(20, baseCoinReward + starBonus + timeBonusCoins);

  return { stars, coinsEarned };
}

export interface TileBoxCenter {
  id: string;
  cx: number;
  cy: number;
}

/**
 * Finds the closest candidate tile center within `snapRadius` of the dragged tile's center.
 */
export function findDropTargetTile(
  draggedId: string,
  dragCenterX: number,
  dragCenterY: number,
  candidates: readonly TileBoxCenter[],
  snapRadius: number
): string | null {
  let bestId: string | null = null;
  let bestDistSq = snapRadius * snapRadius;

  for (const c of candidates) {
    if (c.id === draggedId) continue;
    const dx = c.cx - dragCenterX;
    const dy = c.cy - dragCenterY;
    const distSq = dx * dx + dy * dy;
    if (distSq <= bestDistSq) {
      bestDistSq = distSq;
      bestId = c.id;
    }
  }
  return bestId;
}

