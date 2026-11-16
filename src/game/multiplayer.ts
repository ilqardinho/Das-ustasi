import { LEVELS } from './levels.ts';
import type { LevelConfig, RoomCategoryFilter, RoomPlayerState } from './types.ts';

export const ROOM_CREATE_COST_COINS = 50;
export const ROOM_TIME_OPTIONS_SEC = [60, 90, 120, 180, 300] as const;

const PLAYER_ID_SESSION_KEY = 'stone_master_room_player_id_v1';
const PLAYER_NAME_STORAGE_KEY = 'stone_master_player_name_v1';

export function getLevelsForCategory(category: RoomCategoryFilter): LevelConfig[] {
  if (category === 'all') return LEVELS;
  return LEVELS.filter((lvl) => lvl.difficulty === category);
}

export function getOrCreateClientPlayerId(): string {
  if (typeof window === 'undefined') {
    return 'server-player';
  }
  try {
    const existing = window.sessionStorage.getItem(PLAYER_ID_SESSION_KEY);
    if (existing && existing.length >= 6) return existing;
    const generated = `p_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
    window.sessionStorage.setItem(PLAYER_ID_SESSION_KEY, generated);
    return generated;
  } catch {
    return `p_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function loadSavedPlayerName(fallback = 'Usta'): string {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY)?.trim();
    return saved && saved.length > 0 ? saved.slice(0, 24) : fallback;
  } catch {
    return fallback;
  }
}

export function savePlayerName(name: string): string {
  const clean = name.trim().slice(0, 24);
  if (typeof window !== 'undefined') {
    try {
      if (clean) {
        window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, clean);
      } else {
        window.localStorage.removeItem(PLAYER_NAME_STORAGE_KEY);
      }
    } catch {
      // Ignore storage quota errors
    }
  }
  return clean;
}

export function buildRoomInviteUrl(code: string): string {
  const clean = code.trim().toUpperCase();
  if (typeof window === 'undefined') {
    return `/?room=${encodeURIComponent(clean)}`;
  }
  return `${window.location.origin}/?room=${encodeURIComponent(clean)}`;
}

export function extractRoomCodeFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('room');
  if (!raw) return null;
  const clean = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean.length >= 4 && clean.length <= 10 ? clean : null;
}

export function sortRoomPlayersForLeaderboard(players: RoomPlayerState[]): RoomPlayerState[] {
  const statusRank = (s: RoomPlayerState['status']) => {
    if (s === 'won') return 0;
    if (s === 'playing') return 1;
    if (s === 'waiting') return 2;
    return 3;
  };
  return [...players].sort((a, b) => {
    const rDiff = statusRank(a.status) - statusRank(b.status);
    if (rDiff !== 0) return rDiff;
    if (b.score !== a.score) return b.score - a.score;
    if (a.remainingTiles !== b.remainingTiles) return a.remainingTiles - b.remainingTiles;
    if (a.finishTimeSec != null && b.finishTimeSec != null && a.finishTimeSec !== b.finishTimeSec) {
      return a.finishTimeSec - b.finishTimeSec;
    }
    return a.joinedAt - b.joinedAt;
  });
}
