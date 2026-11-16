import { hashStringToSeed } from './rules.ts';
import type { LevelConfig, TileSlot } from './types.ts';

function rectLayer(
  cols: number,
  rows: number,
  z: number,
  offsetX = 0,
  offsetY = 0
): TileSlot[] {
  const slots: TileSlot[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({
        x: offsetX + c * 2,
        y: offsetY + r * 2,
        z,
      });
    }
  }
  return slots;
}

function dedupeSlots(slots: TileSlot[]): TileSlot[] {
  const seen = new Set<string>();
  const out: TileSlot[] = [];
  for (const s of slots) {
    const key = `${s.x}:${s.y}:${s.z}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(s);
    }
  }
  return out;
}

// Stage 1: 34 tiles (17 pairs) — 4-tier starter courtyard with crisp timed pace
const stage1Slots: TileSlot[] = dedupeSlots([
  ...rectLayer(6, 3, 0, 0, 0), // 18
  ...rectLayer(4, 2, 1, 2, 1), // 8
  ...rectLayer(3, 2, 2, 3, 1), // 6
  { x: 4, y: 2, z: 3 },
  { x: 6, y: 2, z: 3 }, // 2 => Total 34
]);

// Stage 2: 38 tiles (19 pairs) — Inner City Arch (İçərişəhər)
const stage2Slots: TileSlot[] = dedupeSlots([
  ...rectLayer(6, 4, 0, 0, 0).filter((s) => !(s.x === 4 && s.y === 2) && !(s.x === 6 && s.y === 2)), // 22
  ...rectLayer(4, 2, 1, 2, 2), // 8
  ...rectLayer(3, 2, 2, 3, 2), // 6
  { x: 4, y: 3, z: 3 },
  { x: 6, y: 3, z: 3 }, // 2 => Total 38
]);

// Stage 3: 42 tiles (21 pairs) — Maiden Tower (Qız Qalası)
const stage3Slots: TileSlot[] = dedupeSlots([
  ...rectLayer(6, 4, 0, 0, 0), // 24
  ...rectLayer(4, 2, 1, 2, 2), // 8
  ...rectLayer(2, 2, 2, 4, 2), // 4
  ...rectLayer(2, 1, 3, 4, 3), // 2
  { x: 4, y: 1, z: 3 },
  { x: 6, y: 1, z: 3 }, // 2
  { x: 0, y: 3, z: 1 },
  { x: 10, y: 3, z: 1 }, // 2 => Total 42
]);

// Stage 4: 46 tiles (23 pairs) — Caspian Wave (Xəzər Dalğası)
const stage4Slots: TileSlot[] = dedupeSlots([
  ...rectLayer(7, 4, 0, 0, 0).filter((s) => !((s.x === 0 || s.x === 12) && s.y === 0)), // 26
  ...rectLayer(5, 2, 1, 2, 2), // 10
  ...rectLayer(3, 2, 2, 4, 2), // 6
  ...rectLayer(2, 2, 3, 5, 2), // 4 => Total 46
]);

// Stage 5: 50 tiles (25 pairs) — Flame Towers (Alov Qüllələri)
const stage5Slots: TileSlot[] = dedupeSlots([
  ...rectLayer(6, 4, 0, 0, 0), // 24
  ...rectLayer(2, 3, 1, 0, 1), // 6
  ...rectLayer(2, 3, 1, 6, 1), // 6
  { x: 1, y: 2, z: 2 },
  { x: 1, y: 4, z: 2 },
  { x: 7, y: 2, z: 2 },
  { x: 7, y: 4, z: 2 }, // 4
  { x: 1, y: 3, z: 3 },
  { x: 7, y: 3, z: 3 }, // 2
  { x: 4, y: 2, z: 1 },
  { x: 4, y: 4, z: 1 }, // 2
  { x: 4, y: 2, z: 2 },
  { x: 4, y: 4, z: 2 }, // 2
  { x: 4, y: 3, z: 3 },
  { x: 4, y: 3, z: 4 }, // 2
  { x: 1, y: 3, z: 4 },
  { x: 7, y: 3, z: 4 }, // 2 => Total 50
]);

// Stage 6: 52 tiles (26 pairs) — Sheki Lattice (Şəki Şəbəkəsi)
const stage6Slots: TileSlot[] = dedupeSlots([
  ...rectLayer(7, 4, 0, 0, 0), // 28
  ...rectLayer(4, 3, 1, 3, 1), // 12
  ...rectLayer(2, 3, 2, 5, 1), // 6
  ...rectLayer(2, 2, 3, 5, 1), // 4
  { x: 6, y: 1, z: 4 },
  { x: 6, y: 3, z: 4 }, // 2 => Total 52
]);

// Stage 7: 54 tiles (27 pairs) — Gobustan Terraces (Qobustan Qayaları)
const stage7Slots: TileSlot[] = dedupeSlots([
  ...rectLayer(8, 4, 0, 0, 0).filter((s) => !(s.x === 6 && s.y === 2) && !(s.x === 8 && s.y === 2)), // 30
  ...rectLayer(4, 3, 1, 4, 1), // 12
  ...rectLayer(2, 3, 2, 6, 1), // 6
  { x: 6, y: 3, z: 3 },
  { x: 8, y: 3, z: 3 },
  { x: 6, y: 1, z: 3 },
  { x: 8, y: 1, z: 3 }, // 4
  { x: 7, y: 1, z: 4 },
  { x: 7, y: 3, z: 4 }, // 2 => Total 54
]);

// Stage 8: 56 tiles (28 pairs) — Carpet Motif (Xalça Naxışı)
const stage8Slots: TileSlot[] = dedupeSlots([
  ...rectLayer(8, 4, 0, 0, 0), // 32
  ...rectLayer(7, 2, 1, 1, 2), // 14
  ...rectLayer(3, 2, 2, 5, 2), // 6
  { x: 7, y: 2, z: 3 },
  { x: 7, y: 4, z: 3 }, // 2
  { x: 6, y: 3, z: 4 },
  { x: 8, y: 3, z: 4 }, // 2 => Total 56
]);

// Stage 9: 58 tiles (29 pairs) — Shirvanshahs Palace (Şirvanşahlar Sarayı)
const stage9Slots: TileSlot[] = dedupeSlots([
  ...rectLayer(7, 4, 0, 0, 0), // 28
  ...rectLayer(7, 2, 1, 0, 2), // 14
  ...rectLayer(3, 2, 2, 4, 2), // 6
  ...rectLayer(2, 2, 3, 5, 2), // 4
  { x: 1, y: 3, z: 2 },
  { x: 11, y: 3, z: 2 },
  { x: 5, y: 3, z: 4 },
  { x: 7, y: 3, z: 4 }, // 4
  { x: 5, y: 3, z: 5 },
  { x: 7, y: 3, z: 5 }, // 2 => Total 58
]);

// Stage 10: 62 tiles (31 pairs) — Ganja Gates (Gəncə Qapısı)
const stage10Slots: TileSlot[] = dedupeSlots([
  ...rectLayer(8, 4, 0, 0, 0), // 32
  ...rectLayer(6, 3, 1, 2, 1), // 18
  ...rectLayer(3, 2, 2, 5, 2), // 6
  ...rectLayer(2, 1, 3, 6, 3), // 2
  { x: 6, y: 1, z: 3 },
  { x: 8, y: 1, z: 3 }, // 2
  { x: 7, y: 1, z: 4 },
  { x: 7, y: 3, z: 4 }, // 2 => Total 62
]);

// Stage 11: 64 tiles (32 pairs) — Khari Bulbul (Xarıbülbül)
const stage11Slots: TileSlot[] = dedupeSlots([
  ...rectLayer(8, 4, 0, 0, 0), // 32
  ...rectLayer(4, 4, 1, 4, 0), // 16
  ...rectLayer(2, 4, 2, 6, 0), // 8
  ...rectLayer(2, 2, 3, 6, 2), // 4
  ...rectLayer(2, 2, 4, 6, 2), // 4 => Total 64
]);

// Stage 12: 68 tiles (34 pairs) — Master's Crown (Usta Taxtı)
const stage12Slots: TileSlot[] = dedupeSlots([
  ...rectLayer(8, 4, 0, 0, 0), // 32
  ...rectLayer(5, 4, 1, 3, 0), // 20
  ...rectLayer(3, 3, 2, 5, 1), // 9
  ...rectLayer(2, 2, 3, 6, 2), // 4
  ...rectLayer(2, 1, 4, 6, 3), // 2
  { x: 7, y: 3, z: 5 }, // 1 => Total 68
]);

export function calculateStageTimeLimitSec(
  slotCount: number,
  difficulty: LevelConfig['difficulty']
): number {
  const pairs = Math.max(1, Math.floor(slotCount / 2));
  const secPerPair =
    difficulty === 'easy'
      ? 3.1
      : difficulty === 'medium'
      ? 2.85
      : difficulty === 'hard'
      ? 2.65
      : 2.5;
  const baseBufferSec =
    difficulty === 'easy'
      ? 7
      : difficulty === 'medium'
      ? 8
      : difficulty === 'hard'
      ? 9
      : 10;
  return Math.round(baseBufferSec + pairs * secPerPair);
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    key: 'level_1',
    difficulty: 'easy',
    timeLimitSec: calculateStageTimeLimitSec(stage1Slots.length, 'easy'),
    coinReward: 45,
    parScore: 2500,
    slots: stage1Slots,
  },
  {
    id: 2,
    key: 'level_2',
    difficulty: 'easy',
    timeLimitSec: calculateStageTimeLimitSec(stage2Slots.length, 'easy'),
    coinReward: 50,
    parScore: 2900,
    slots: stage2Slots,
  },
  {
    id: 3,
    key: 'level_3',
    difficulty: 'medium',
    timeLimitSec: calculateStageTimeLimitSec(stage3Slots.length, 'medium'),
    coinReward: 60,
    parScore: 3400,
    slots: stage3Slots,
  },
  {
    id: 4,
    key: 'level_4',
    difficulty: 'medium',
    timeLimitSec: calculateStageTimeLimitSec(stage4Slots.length, 'medium'),
    coinReward: 70,
    parScore: 3800,
    slots: stage4Slots,
  },
  {
    id: 5,
    key: 'level_5',
    difficulty: 'medium',
    timeLimitSec: calculateStageTimeLimitSec(stage5Slots.length, 'medium'),
    coinReward: 80,
    parScore: 4300,
    slots: stage5Slots,
  },
  {
    id: 6,
    key: 'level_6',
    difficulty: 'hard',
    timeLimitSec: calculateStageTimeLimitSec(stage6Slots.length, 'hard'),
    coinReward: 95,
    parScore: 4600,
    slots: stage6Slots,
  },
  {
    id: 7,
    key: 'level_7',
    difficulty: 'hard',
    timeLimitSec: calculateStageTimeLimitSec(stage7Slots.length, 'hard'),
    coinReward: 105,
    parScore: 4900,
    slots: stage7Slots,
  },
  {
    id: 8,
    key: 'level_8',
    difficulty: 'hard',
    timeLimitSec: calculateStageTimeLimitSec(stage8Slots.length, 'hard'),
    coinReward: 115,
    parScore: 5300,
    slots: stage8Slots,
  },
  {
    id: 9,
    key: 'level_9',
    difficulty: 'hard',
    timeLimitSec: calculateStageTimeLimitSec(stage9Slots.length, 'hard'),
    coinReward: 125,
    parScore: 5700,
    slots: stage9Slots,
  },
  {
    id: 10,
    key: 'level_10',
    difficulty: 'master',
    timeLimitSec: calculateStageTimeLimitSec(stage10Slots.length, 'master'),
    coinReward: 140,
    parScore: 6200,
    slots: stage10Slots,
  },
  {
    id: 11,
    key: 'level_11',
    difficulty: 'master',
    timeLimitSec: calculateStageTimeLimitSec(stage11Slots.length, 'master'),
    coinReward: 155,
    parScore: 6700,
    slots: stage11Slots,
  },
  {
    id: 12,
    key: 'level_12',
    difficulty: 'master',
    timeLimitSec: calculateStageTimeLimitSec(stage12Slots.length, 'master'),
    coinReward: 190,
    parScore: 7300,
    slots: stage12Slots,
  },
];

export function getLevelSeed(levelId: number): number {
  return 10007 + levelId * 4999;
}

export function getDailyChallengeLevel(dateIso: string): {
  config: LevelConfig;
  seed: number;
} {
  const seed = hashStringToSeed(`stone-master-daily-${dateIso}`);
  const pool = [LEVELS[4], LEVELS[6], LEVELS[8], LEVELS[10], LEVELS[11]];
  const chosen = pool[seed % pool.length];
  const baseLimit = chosen.timeLimitSec ?? calculateStageTimeLimitSec(chosen.slots.length, chosen.difficulty);
  return {
    config: {
      ...chosen,
      id: 999,
      key: 'daily_challenge',
      timeLimitSec: Math.max(70, baseLimit - 4),
      coinReward: 160,
    },
    seed,
  };
}
