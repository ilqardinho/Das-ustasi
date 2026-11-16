export type LanguageCode = 'az' | 'en' | 'tr' | 'ru';

export type GameScreenState = 'title' | 'playing' | 'paused' | 'gameover';

export type AppView =
  | 'title'
  | 'playing'
  | 'map'
  | 'shop'
  | 'daily'
  | 'settings'
  | 'multiplayer';

export type DominoPip = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface DominoValue {
  top: DominoPip;
  bottom: DominoPip;
}

export interface TileSlot {
  x: number; // Half-unit horizontal coordinate; tile footprint is [x, x+2)
  y: number; // Half-unit vertical coordinate; tile footprint is [y, y+2)
  z: number; // Layer index (0 = bottom table layer)
}

export type TileSpecialType =
  | 'bonus_time'
  | 'bonus_coin'
  | 'bonus_chain'
  | 'trap_time'
  | 'trap_mix';

export interface BoardTile extends TileSlot {
  id: string;
  top: DominoPip;
  bottom: DominoPip;
  special?: TileSpecialType;
}

export interface LevelConfig {
  id: number;
  key: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'master';
  timeLimitSec: number | null; // Optional time limit in seconds
  coinReward: number;
  parScore: number;
  slots: TileSlot[];
}

export interface MatchPair {
  a: BoardTile;
  b: BoardTile;
}

export type CosmeticCategory = 'tiles' | 'tables' | 'effects' | 'avatars';

export interface ShopItem {
  id: string;
  category: CosmeticCategory;
  price: number;
  nameKey: string;
  descKey: string;
  previewPrimary: string;
  previewSecondary: string;
  previewAccent: string;
}

export interface PlayerSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  musicVolume: number; // 0..1
  vibrationEnabled: boolean;
  showNumbersAid: boolean;
  highlightFreeTiles: boolean;
  language: LanguageCode;
}

export interface LevelProgressRecord {
  stars: number; // 1..3
  bestScore: number;
  bestTimeSec: number | null;
}

export interface PlayerProgress {
  coins: number;
  highestUnlockedLevel: number; // 1-based
  levelRecords: Record<number, LevelProgressRecord>;
  dailyChallengeCompletedDate: string | null; // YYYY-MM-DD
  dailyLoginStreak: number; // 0..7
  lastLoginClaimDate: string | null; // YYYY-MM-DD
  unlockedCosmetics: string[];
  equippedCosmetics: {
    tiles: string;
    tables: string;
    effects: string;
    avatars: string;
  };
  totalMatchesCleared: number;
  totalLevelsWon: number;
  totalPlayTimeSec: number;
  fastestWinSec: number | null;
}

export interface MoveSnapshot {
  tiles: BoardTile[];
  score: number;
  comboCount: number;
  timeRemaining: number | null;
}

export type RoomCategoryFilter = 'all' | 'easy' | 'medium' | 'hard' | 'master';

export type MultiplayerRoomStatus = 'waiting' | 'playing' | 'finished';

export interface RoomPlayerState {
  id: string;
  name: string;
  avatarId: string;
  isHost: boolean;
  connected: boolean;
  ready: boolean;
  score: number;
  remainingTiles: number;
  totalTiles: number;
  matchesCleared: number;
  mistakes: number;
  status: 'waiting' | 'playing' | 'won' | 'lost';
  finishTimeSec: number | null;
  joinedAt: number;
}

export interface MultiplayerRoomState {
  code: string;
  hostId: string;
  category: RoomCategoryFilter;
  levelId: number;
  timeLimitSec: number;
  seed: number;
  totalTiles: number;
  entryCostCoins: number;
  status: MultiplayerRoomStatus;
  createdAt: number;
  startedAt: number | null;
  serverRemainingSec: number | null;
  players: RoomPlayerState[];
}
