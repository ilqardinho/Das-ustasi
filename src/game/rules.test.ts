import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BONUS_COIN_AMOUNT,
  BONUS_TIME_SEC,
  calculateLevelResult,
  calculateMatchScore,
  dealSolvableBoard,
  doTilesMatch,
  findDropTargetTile,
  findValidMoves,
  getFreeTiles,
  getStandardDoubleSixSet,
  isBonusSpecial,
  isTileCovered,
  isTileFree,
  isTrapSpecial,
  MAX_MISTAKES,
  MISTAKE_TIME_PENALTY_SEC,
  shuffleRemainingTiles,
  TRAP_TIME_PENALTY_SEC,
} from './rules';
import {
  calculateStageTimeLimitSec,
  getDailyChallengeLevel,
  getLevelSeed,
  LEVELS,
} from './levels';
import {
  getAllDominiPrewarmEntries,
  getDominiDefeatMessage,
  getDominiMatchReaction,
  getDominiMenuGreeting,
  getDominiMistakeWarning,
  getDominiSpecialReaction,
  getDominiTimeWarning,
  getDominiUtilityReaction,
  getDominiVoiceTestMessage,
  getSpokenDominiText,
} from './domini';
import { computePlayerStats, formatStatsDuration } from './stats';
import {
  buildRoomInviteUrl,
  getLevelsForCategory,
  ROOM_CREATE_COST_COINS,
  ROOM_TIME_OPTIONS_SEC,
  sortRoomPlayersForLeaderboard,
} from './multiplayer';
import { getDefaultProgress, getDefaultSettings, normalizeSettings } from '../utils/storage';
import { computeMusicAdaptiveProfile, triggerHaptic } from '../utils/audio';
import { createExplosionParticles, stepExplosionParticles } from './particles';
import { BoardTile, RoomPlayerState, TileSlot } from './types';

test('standard double-six domino set contains exactly 28 unique tiles', () => {
  const set = getStandardDoubleSixSet();
  assert.equal(set.length, 28);
  const keys = new Set(set.map((t) => `${t.top}-${t.bottom}`));
  assert.equal(keys.size, 28);
});

test('isTileCovered detects upper-layer overlapping tiles accurately', () => {
  const bottom: TileSlot = { x: 2, y: 2, z: 0 };
  const halfOverlapTop: TileSlot = { x: 3, y: 2, z: 1 };
  const nonOverlapTop: TileSlot = { x: 4, y: 2, z: 1 };

  assert.equal(isTileCovered(bottom, [bottom, nonOverlapTop]), false);
  assert.equal(isTileCovered(bottom, [bottom, halfOverlapTop]), true);
});

test('isTileFree enforces uncovered AND at least one free horizontal side', () => {
  const left: TileSlot = { x: 0, y: 0, z: 0 };
  const middle: TileSlot = { x: 2, y: 0, z: 0 };
  const right: TileSlot = { x: 4, y: 0, z: 0 };
  const aboveMiddle: TileSlot = { x: 2, y: 0, z: 1 };

  // Middle is pinched on both sides at z=0
  assert.equal(isTileFree(left, [left, middle, right]), true);
  assert.equal(isTileFree(middle, [left, middle, right]), false);
  assert.equal(isTileFree(right, [left, middle, right]), true);

  // Removing right frees middle
  assert.equal(isTileFree(middle, [left, middle]), true);

  // Covering middle blocks it even if right side is open
  assert.equal(isTileFree(middle, [left, middle, aboveMiddle]), false);
});

test('all 12 levels have even slot counts, no same-layer overlaps, balanced bonuses/traps, and are 100% solvable', () => {
  assert.equal(LEVELS.length, 12);
  assert.ok(MISTAKE_TIME_PENALTY_SEC >= 5);
  assert.ok(BONUS_TIME_SEC >= 10 && BONUS_COIN_AMOUNT >= 20 && TRAP_TIME_PENALTY_SEC >= 5);

  for (const level of LEVELS) {
    assert.equal(
      level.slots.length % 2,
      0,
      `Level ${level.id} must have an even number of tiles (got ${level.slots.length})`
    );
    assert.ok(level.slots.length >= 34, `Level ${level.id} must have at least 34 tiles`);

    const coordKeys = new Set(level.slots.map((s) => `${s.x}:${s.y}:${s.z}`));
    assert.equal(
      coordKeys.size,
      level.slots.length,
      `Level ${level.id} has duplicate slot coordinates`
    );

    // Ensure no two slots on the same z-layer overlap footprints
    for (let i = 0; i < level.slots.length; i++) {
      for (let j = i + 1; j < level.slots.length; j++) {
        const a = level.slots[i];
        const b = level.slots[j];
        if (a.z === b.z) {
          assert.ok(
            Math.abs(a.x - b.x) >= 2 || Math.abs(a.y - b.y) >= 2,
            `Level ${level.id} has overlapping same-layer slots (${a.x},${a.y},${a.z}) and (${b.x},${b.y},${b.z})`
          );
        }
      }
    }

    // Deal board and verify balanced bonuses/traps + complete clearability
    let board = dealSolvableBoard(level.slots, getLevelSeed(level.id));
    assert.equal(board.length, level.slots.length);

    const bonusCount = board.filter((t) => isBonusSpecial(t.special)).length;
    const trapCount = board.filter((t) => isTrapSpecial(t.special)).length;
    assert.ok(bonusCount >= 3, `Level ${level.id} should have at least 3 bonus tiles`);
    assert.ok(trapCount >= 2, `Level ${level.id} should have at least 2 trap tiles`);

    const initialFree = getFreeTiles(board);
    assert.ok(
      initialFree.some((t) => isBonusSpecial(t.special)) ||
        board.some((t) => isBonusSpecial(t.special)),
      'Board has bonus tiles'
    );

    let guard = 0;
    while (board.length > 0 && guard < 100) {
      guard++;
      let moves = findValidMoves(board);
      if (moves.length === 0) {
        board = shuffleRemainingTiles(board, getLevelSeed(level.id) + guard);
        moves = findValidMoves(board);
      }
      assert.ok(moves.length > 0, `Level ${level.id} should always have moves after deal/shuffle`);
      const chosen = moves[0];
      assert.equal(doTilesMatch(chosen.a, chosen.b), true);
      board = board.filter((t) => t.id !== chosen.a.id && t.id !== chosen.b.id);
    }

    assert.equal(board.length, 0, `Level ${level.id} failed to clear completely`);
  }
});

test('shuffleRemainingTiles preserves pairs, preserves specials, and guarantees at least one immediate move', () => {
  const stuckBoard: BoardTile[] = [
    { id: '1', x: 0, y: 0, z: 0, top: 1, bottom: 2, special: 'bonus_coin' },
    { id: '2', x: 2, y: 0, z: 0, top: 3, bottom: 4, special: 'trap_time' },
    { id: '3', x: 4, y: 0, z: 0, top: 1, bottom: 2 },
    { id: '4', x: 6, y: 0, z: 0, top: 3, bottom: 4 },
  ];
  const trapped: BoardTile[] = [
    { id: 'a', x: 0, y: 0, z: 0, top: 0, bottom: 1, special: 'bonus_time' },
    { id: 'b', x: 2, y: 0, z: 0, top: 0, bottom: 1 },
    { id: 'c', x: 4, y: 0, z: 0, top: 5, bottom: 6, special: 'trap_mix' },
    { id: 'd', x: 6, y: 0, z: 0, top: 5, bottom: 6 },
  ];
  assert.equal(findValidMoves(trapped).length, 0);

  const reshuffled = shuffleRemainingTiles(trapped, 42);
  assert.equal(reshuffled.length, 4);
  assert.ok(findValidMoves(reshuffled).length >= 1);
  assert.equal(reshuffled.filter((t) => isBonusSpecial(t.special)).length, 1);
  assert.equal(reshuffled.filter((t) => isTrapSpecial(t.special)).length, 1);
  assert.equal(findValidMoves(stuckBoard).length, 0);
});

test('scoring scales with combo multiplier, pip values, and layer depth', () => {
  const s1 = calculateMatchScore({ top: 0, bottom: 0 }, { top: 0, bottom: 0 }, 1, 0);
  const s2 = calculateMatchScore({ top: 6, bottom: 6 }, { top: 6, bottom: 6 }, 3, 2);
  assert.equal(s1, 100);
  assert.equal(s2, 564);
});

test('calculateLevelResult computes stars and coin rewards accurately', () => {
  const threeStars = calculateLevelResult({
    score: 2500,
    parScore: 1800,
    baseCoinReward: 40,
    hintsUsed: 0,
    timeRemainingSec: 60,
    timeLimitSec: 120,
  });
  assert.equal(threeStars.stars, 3);
  assert.equal(threeStars.coinsEarned, 40 + 30 + 10);

  const oneStar = calculateLevelResult({
    score: 1200,
    parScore: 1800,
    baseCoinReward: 40,
    hintsUsed: 2,
    timeRemainingSec: null,
    timeLimitSec: null,
  });
  assert.equal(oneStar.stars, 1);
  assert.equal(oneStar.coinsEarned, 40);
});

test('daily challenge is deterministic for a given date', () => {
  const d1 = getDailyChallengeLevel('2026-11-13');
  const d2 = getDailyChallengeLevel('2026-11-13');
  const d3 = getDailyChallengeLevel('2026-11-14');
  assert.equal(d1.seed, d2.seed);
  assert.notEqual(d1.seed, d3.seed);
});

test('findDropTargetTile picks closest candidate within snap radius and excludes dragged tile', () => {
  const candidates = [
    { id: 'dragged', cx: 100, cy: 100 },
    { id: 'far', cx: 300, cy: 300 },
    { id: 'near', cx: 130, cy: 120 },
  ];
  assert.equal(findDropTargetTile('dragged', 110, 110, candidates, 60), 'near');
  assert.equal(findDropTargetTile('dragged', 110, 110, candidates, 15), null);
});

test('Domini mascot triggers combo, bonus, trap, and endgame reactions appropriately', () => {
  const first = getDominiMatchReaction({
    language: 'az',
    comboCount: 1,
    remainingTiles: 26,
    matchesSoFar: 1,
  });
  assert.ok(first !== null && first.mood === 'happy');
  assert.equal(first.message.trim().split(/\s+/).length, 1);

  const bonusReaction = getDominiSpecialReaction('az', 'bonus_coin', 1);
  assert.equal(bonusReaction.mood, 'hype');
  assert.equal(bonusReaction.message.trim().split(/\s+/).length, 1);

  const trapReaction = getDominiSpecialReaction('az', 'trap_time', 0);
  assert.equal(trapReaction.mood, 'oops');
  assert.equal(trapReaction.message.trim().split(/\s+/).length, 1);

  const combo3 = getDominiMatchReaction({
    language: 'az',
    comboCount: 3,
    remainingTiles: 20,
    matchesSoFar: 4,
  });
  assert.ok(combo3 !== null && combo3.mood === 'hype');
  assert.equal(combo3.message.trim().split(/\s+/).length, 1);

  const endgame = getDominiMatchReaction({
    language: 'az',
    comboCount: 1,
    remainingTiles: 2,
    matchesSoFar: 13,
  });
  assert.ok(endgame !== null && endgame.mood === 'endgame');
  assert.equal(endgame.message.trim().split(/\s+/).length, 1);

  const shuffleMsg = getDominiUtilityReaction('az', 'shuffle', 1);
  assert.equal(shuffleMsg.mood, 'happy');
  assert.equal(shuffleMsg.message.trim().split(/\s+/).length, 1);

  const oopsMsg = getDominiUtilityReaction('az', 'oops', 0);
  assert.equal(oopsMsg.mood, 'oops');
  assert.equal(oopsMsg.message.trim().split(/\s+/).length, 1);

  assert.equal(MAX_MISTAKES, 3);
  const warn1 = getDominiMistakeWarning('az', 1, MAX_MISTAKES);
  assert.equal(warn1.mood, 'oops');
  assert.ok(warn1.message.includes('Son 2 şans'));
  assert.ok(!warn1.message.includes('/'));

  const warn2 = getDominiMistakeWarning('az', 2, MAX_MISTAKES);
  assert.equal(warn2.mood, 'warning');
  assert.ok(warn2.message.includes('Son 1 şans'));
  assert.ok(!warn2.message.includes('/'));

  const prewarm = getAllDominiPrewarmEntries('az', MAX_MISTAKES);
  assert.ok(prewarm.length >= 15);
  assert.equal(prewarm[0].mood, 'happy');
  const menuGreeting = getDominiMenuGreeting('az');
  assert.ok(menuGreeting.message.includes('Salam'));
  assert.ok(prewarm.some((e) => e.message === menuGreeting.message));
  const voiceTest = getDominiVoiceTestMessage('az');
  assert.ok(voiceTest.message.includes('Domini'));
  assert.ok(prewarm.some((e) => e.message === voiceTest.message));
  assert.ok(prewarm.some((e) => e.message.includes('Son 2 şans')));
  assert.ok(prewarm.some((e) => e.message.includes('Son 1 şans')));
  const timeWarn = getDominiTimeWarning('az');
  assert.equal(timeWarn.mood, 'warning');
  assert.equal(timeWarn.message, 'Tələs!!');
  assert.equal(timeWarn.message.trim().split(/\s+/).length, 1);
  assert.ok(prewarm.some((e) => e.message === timeWarn.message));
  assert.equal(getSpokenDominiText('Tələs!!', 'az'), 'Tələs!');
  assert.equal(getSpokenDominiText('Əlaaa!', 'az'), 'Əla!');
  assert.equal(getSpokenDominiText('Qəşəəəng!', 'az'), 'Qəşəng!');
  assert.equal(getSpokenDominiText('Uduzdun! Bir də yoxla!', 'az'), 'Uduzdun! Bir də yoxla!');
  assert.equal(getSpokenDominiText('Gooood!', 'en'), 'Good!');
  const defeatMsg = getDominiDefeatMessage('az');
  assert.equal(defeatMsg.mood, 'sad');
  assert.equal(defeatMsg.message, 'Uduzdun! Bir də yoxla!');
  assert.ok(prewarm.some((e) => e.message === defeatMsg.message));
  assert.ok(
    prewarm.every((e) => !/(gooood|well done|yess|finish)/i.test(e.message)),
    'Azerbaijani Domini phrases should not contain English filler words'
  );
  const uniqueKeys = new Set(prewarm.map((e) => `${e.mood}:${e.message}`));
  assert.equal(uniqueKeys.size, prewarm.length);
});

test('difficulty-calibrated stage timers scale strictly and remain challenging', () => {
  assert.equal(calculateStageTimeLimitSec(34, 'easy'), 60);
  assert.equal(calculateStageTimeLimitSec(68, 'master'), 95);
  for (const level of LEVELS) {
    assert.ok(
      level.timeLimitSec !== null && level.timeLimitSec >= 55 && level.timeLimitSec <= 100,
      `Level ${level.id} timer (${level.timeLimitSec}s) should be tight and challenging`
    );
  }
});

test('computePlayerStats and formatStatsDuration summarize total play time, stars, and fastest victory', () => {
  const fresh = getDefaultProgress();
  const freshStats = computePlayerStats(fresh);
  assert.deepEqual(freshStats, {
    totalPlayTimeSec: 0,
    totalStars: 0,
    fastestWinSec: null,
  });
  assert.equal(formatStatsDuration(freshStats.totalPlayTimeSec), '0:00');
  assert.equal(formatStatsDuration(freshStats.fastestWinSec), '—');

  const populated = {
    ...fresh,
    totalPlayTimeSec: 185,
    fastestWinSec: 27,
    levelRecords: {
      1: { stars: 3, bestScore: 2200, bestTimeSec: 42 },
      2: { stars: 2, bestScore: 1900, bestTimeSec: 31 },
    },
  };
  const stats = computePlayerStats(populated);
  assert.deepEqual(stats, {
    totalPlayTimeSec: 185,
    totalStars: 5,
    fastestWinSec: 27,
  });
  assert.equal(formatStatsDuration(stats.totalPlayTimeSec), '3:05');
  assert.equal(formatStatsDuration(stats.fastestWinSec), '0:27');
  assert.equal(formatStatsDuration(3665), '1:01:05');

  // Legacy levelRecords fallback when fastestWinSec is null
  const legacyStats = computePlayerStats({
    ...fresh,
    fastestWinSec: null,
    levelRecords: {
      1: { stars: 2, bestScore: 1500, bestTimeSec: 54 },
      3: { stars: 3, bestScore: 2600, bestTimeSec: 38 },
    },
  });
  assert.equal(legacyStats.totalStars, 5);
  assert.equal(legacyStats.fastestWinSec, 38);
});

test('multiplayer helpers filter categories, enforce 50 coin room fee, build invite URL, and sort leaderboard', () => {
  assert.equal(ROOM_CREATE_COST_COINS, 50);
  assert.ok(ROOM_TIME_OPTIONS_SEC.includes(60) && ROOM_TIME_OPTIONS_SEC.includes(120));

  assert.equal(getLevelsForCategory('all').length, LEVELS.length);
  const easyLevels = getLevelsForCategory('easy');
  assert.ok(easyLevels.length >= 2 && easyLevels.every((l) => l.difficulty === 'easy'));
  const masterLevels = getLevelsForCategory('master');
  assert.ok(masterLevels.length >= 2 && masterLevels.every((l) => l.difficulty === 'master'));

  assert.equal(buildRoomInviteUrl('dm8k4p'), '/?room=DM8K4P');

  const players: RoomPlayerState[] = [
    {
      id: 'p1',
      name: 'Aysel',
      avatarId: 'avatar_1',
      isHost: true,
      connected: true,
      ready: true,
      score: 1800,
      remainingTiles: 4,
      totalTiles: 34,
      matchesCleared: 15,
      mistakes: 0,
      status: 'playing',
      finishTimeSec: null,
      joinedAt: 1,
    },
    {
      id: 'p2',
      name: 'Murad',
      avatarId: 'avatar_2',
      isHost: false,
      connected: true,
      ready: true,
      score: 2100,
      remainingTiles: 0,
      totalTiles: 34,
      matchesCleared: 17,
      mistakes: 0,
      status: 'won',
      finishTimeSec: 32,
      joinedAt: 2,
    },
    {
      id: 'p3',
      name: 'Ləman',
      avatarId: 'avatar_3',
      isHost: false,
      connected: true,
      ready: true,
      score: 900,
      remainingTiles: 12,
      totalTiles: 34,
      matchesCleared: 11,
      mistakes: 3,
      status: 'lost',
      finishTimeSec: null,
      joinedAt: 3,
    },
  ];
  const sorted = sortRoomPlayersForLeaderboard(players);
  assert.deepEqual(
    sorted.map((p) => p.id),
    ['p2', 'p1', 'p3']
  );
});

test('music settings default cleanly and clamp persisted volume bounds', () => {
  const defaults = getDefaultSettings();
  assert.equal(defaults.soundEnabled, true);
  assert.equal(defaults.musicEnabled, true);
  assert.equal(defaults.musicVolume, 0.55);

  const clampedHigh = normalizeSettings({ musicEnabled: false, musicVolume: 2.5 });
  assert.equal(clampedHigh.musicEnabled, false);
  assert.equal(clampedHigh.musicVolume, 1);

  const clampedLow = normalizeSettings({ musicEnabled: true, musicVolume: -0.4 });
  assert.equal(clampedLow.musicEnabled, true);
  assert.equal(clampedLow.musicVolume, 0);

  const invalidFallback = normalizeSettings({ musicVolume: Number.NaN });
  assert.equal(invalidFallback.musicVolume, 0.55);
  assert.equal(invalidFallback.musicEnabled, true);
});

test('interactive music adaptive profile responds to menu, combo, urgency, endgame, and pause', () => {
  const menu = computeMusicAdaptiveProfile({ scene: 'menu', combo: 0, urgent: false, endgame: false });
  const calmPlay = computeMusicAdaptiveProfile({ scene: 'playing', combo: 1, urgent: false, endgame: false });
  const hotCombo = computeMusicAdaptiveProfile({ scene: 'playing', combo: 4, urgent: false, endgame: true });
  const urgentPlay = computeMusicAdaptiveProfile({ scene: 'playing', combo: 1, urgent: true, endgame: false });
  const paused = computeMusicAdaptiveProfile({ scene: 'paused', combo: 4, urgent: true, endgame: true });

  assert.equal(menu.enableBass, false);
  assert.equal(menu.enablePercussion, false);
  assert.ok(menu.bpm < 70);
  assert.ok(calmPlay.bpm > menu.bpm && calmPlay.bpm <= 72);
  assert.equal(calmPlay.enableBass, true);
  assert.equal(calmPlay.enablePercussion, true);

  assert.ok(hotCombo.bpm > calmPlay.bpm && hotCombo.bpm <= 80);
  assert.equal(hotCombo.sparkleIntensity, 3);
  assert.equal(hotCombo.pitchSemitoneShift, 2);

  assert.ok(urgentPlay.bpm > calmPlay.bpm && urgentPlay.bpm <= 84);
  assert.equal(urgentPlay.urgentPulse, true);

  assert.ok(paused.gainMultiplier < 0.5);
  assert.ok(paused.filterCutoffHz < 650);
  assert.equal(paused.enablePercussion, false);
});

test('vibrationEnabled setting controls triggerHaptic calls to navigator.vibrate', () => {
  const defaults = getDefaultSettings();
  assert.equal(defaults.vibrationEnabled, true);
  assert.equal(normalizeSettings({ vibrationEnabled: false }).vibrationEnabled, false);

  const calls: Array<number | number[]> = [];
  const origDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      vibrate: (pattern: number | number[]) => {
        calls.push(pattern);
        return true;
      },
    },
  });

  try {
    assert.equal(triggerHaptic(false, 12), false);
    assert.equal(calls.length, 0);

    assert.equal(triggerHaptic(true, 12), true);
    assert.deepEqual(calls, [12]);

    assert.equal(triggerHaptic(true, [18, 22, 26]), true);
    assert.deepEqual(calls, [12, [18, 22, 26]]);
  } finally {
    if (origDescriptor) {
      Object.defineProperty(globalThis, 'navigator', origDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'navigator');
    }
  }
});

test('createExplosionParticles and stepExplosionParticles generate, animate, and expire match explosion particles', () => {
  const base = createExplosionParticles({
    left: 200,
    top: 150,
    tileW: 52,
    tileH: 84,
    colors: ['#FBBF24', '#38BDF8', '#34D399'],
    seed: 42,
    comboCount: 1,
  });
  assert.equal(base.length, 34);
  assert.ok(base.some((p) => p.shape === 'shard'));
  assert.ok(base.some((p) => p.shape === 'spark'));
  assert.ok(base.some((p) => p.shape === 'diamond'));

  const comboBurst = createExplosionParticles({
    left: 200,
    top: 150,
    tileW: 52,
    tileH: 84,
    colors: ['#FBBF24'],
    seed: 99,
    comboCount: 4,
  });
  assert.ok(comboBurst.length > base.length);

  const afterOneFrame = stepExplosionParticles(base, 0.016);
  assert.equal(afterOneFrame.length, base.length);
  assert.ok(afterOneFrame[0].x !== base[0].x || afterOneFrame[0].y !== base[0].y);
  assert.ok(afterOneFrame[0].vy > base[0].vy * 0.9); // gravity pulls vy down

  // Advance past maxLife (~1.1s total across multiple steps)
  let current = base;
  for (let i = 0; i < 40; i++) {
    current = stepExplosionParticles(current, 0.04);
  }
  assert.equal(current.length, 0);
});

