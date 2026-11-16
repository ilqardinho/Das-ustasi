import { PlayerProgress, PlayerSettings } from '../game/types';

const PROGRESS_KEY = 'stone_master_progress_v1';
const SETTINGS_KEY = 'stone_master_settings_v1';

export function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDefaultProgress(): PlayerProgress {
  return {
    coins: 120,
    highestUnlockedLevel: 1,
    levelRecords: {},
    dailyChallengeCompletedDate: null,
    dailyLoginStreak: 0,
    lastLoginClaimDate: null,
    unlockedCosmetics: ['tile_ivory', 'table_emerald', 'fx_classic', 'avatar_1'],
    equippedCosmetics: {
      tiles: 'tile_ivory',
      tables: 'table_emerald',
      effects: 'fx_classic',
      avatars: 'avatar_1',
    },
    totalMatchesCleared: 0,
    totalLevelsWon: 0,
    totalPlayTimeSec: 0,
    fastestWinSec: null,
  };
}

export function getDefaultSettings(): PlayerSettings {
  return {
    soundEnabled: true,
    musicEnabled: true,
    musicVolume: 0.55,
    vibrationEnabled: true,
    showNumbersAid: false,
    highlightFreeTiles: true,
    language: 'az',
  };
}

export function normalizeSettings(partial?: Partial<PlayerSettings> | null): PlayerSettings {
  const defaults = getDefaultSettings();
  if (!partial || typeof partial !== 'object') return defaults;
  const rawVol = partial.musicVolume;
  const musicVolume =
    typeof rawVol === 'number' && Number.isFinite(rawVol)
      ? Math.min(1, Math.max(0, rawVol))
      : defaults.musicVolume;
  return {
    soundEnabled:
      typeof partial.soundEnabled === 'boolean' ? partial.soundEnabled : defaults.soundEnabled,
    musicEnabled:
      typeof partial.musicEnabled === 'boolean' ? partial.musicEnabled : defaults.musicEnabled,
    musicVolume,
    vibrationEnabled:
      typeof partial.vibrationEnabled === 'boolean'
        ? partial.vibrationEnabled
        : defaults.vibrationEnabled,
    showNumbersAid:
      typeof partial.showNumbersAid === 'boolean'
        ? partial.showNumbersAid
        : defaults.showNumbersAid,
    highlightFreeTiles:
      typeof partial.highlightFreeTiles === 'boolean'
        ? partial.highlightFreeTiles
        : defaults.highlightFreeTiles,
    language: partial.language ?? defaults.language,
  };
}

export function loadProgress(): PlayerProgress {
  if (typeof window === 'undefined') return getDefaultProgress();
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return getDefaultProgress();
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    const defaults = getDefaultProgress();
    const levelRecords = parsed.levelRecords ?? {};
    let derivedFastest: number | null = parsed.fastestWinSec ?? null;
    if (derivedFastest === null) {
      for (const rec of Object.values(levelRecords)) {
        if (rec?.bestTimeSec != null) {
          derivedFastest =
            derivedFastest === null ? rec.bestTimeSec : Math.min(derivedFastest, rec.bestTimeSec);
        }
      }
    }
    return {
      ...defaults,
      ...parsed,
      equippedCosmetics: {
        ...defaults.equippedCosmetics,
        ...(parsed.equippedCosmetics ?? {}),
      },
      unlockedCosmetics: Array.isArray(parsed.unlockedCosmetics)
        ? Array.from(new Set([...defaults.unlockedCosmetics, ...parsed.unlockedCosmetics]))
        : defaults.unlockedCosmetics,
      levelRecords,
      totalPlayTimeSec:
        typeof parsed.totalPlayTimeSec === 'number' && Number.isFinite(parsed.totalPlayTimeSec)
          ? Math.max(0, Math.round(parsed.totalPlayTimeSec))
          : 0,
      fastestWinSec: derivedFastest,
    };
  } catch {
    return getDefaultProgress();
  }
}

export function saveProgress(progress: PlayerProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadSettings(): PlayerSettings {
  if (typeof window === 'undefined') return getDefaultSettings();
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return getDefaultSettings();
    const parsed = JSON.parse(raw) as Partial<PlayerSettings>;
    return normalizeSettings(parsed);
  } catch {
    return getDefaultSettings();
  }
}

export function saveSettings(settings: PlayerSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

export function resetAllLocalData(): {
  progress: PlayerProgress;
  settings: PlayerSettings;
} {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(PROGRESS_KEY);
      window.localStorage.removeItem(SETTINGS_KEY);
    } catch {
      // Ignore
    }
  }
  return {
    progress: getDefaultProgress(),
    settings: getDefaultSettings(),
  };
}
