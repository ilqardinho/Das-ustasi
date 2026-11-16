import { PlayerProgress } from './types';

export interface PlayerSummaryStats {
  totalPlayTimeSec: number;
  totalStars: number;
  fastestWinSec: number | null;
}

/**
 * Computes pure summary statistics for the main menu Statistika panel
 * from persisted player progress.
 */
export function computePlayerStats(progress: PlayerProgress): PlayerSummaryStats {
  let totalStars = 0;
  let minRecordTime: number | null = null;

  for (const record of Object.values(progress.levelRecords ?? {})) {
    if (!record) continue;
    totalStars += Math.max(0, Math.round(record.stars ?? 0));
    if (record.bestTimeSec != null && Number.isFinite(record.bestTimeSec)) {
      const cleanSec = Math.max(0, Math.round(record.bestTimeSec));
      minRecordTime = minRecordTime === null ? cleanSec : Math.min(minRecordTime, cleanSec);
    }
  }

  let fastestWinSec: number | null =
    progress.fastestWinSec != null && Number.isFinite(progress.fastestWinSec)
      ? Math.max(0, Math.round(progress.fastestWinSec))
      : null;

  if (minRecordTime !== null) {
    fastestWinSec = fastestWinSec === null ? minRecordTime : Math.min(fastestWinSec, minRecordTime);
  }

  const totalPlayTimeSec =
    typeof progress.totalPlayTimeSec === 'number' && Number.isFinite(progress.totalPlayTimeSec)
      ? Math.max(0, Math.round(progress.totalPlayTimeSec))
      : 0;

  return {
    totalPlayTimeSec,
    totalStars,
    fastestWinSec,
  };
}

/**
 * Formats seconds cleanly as M:SS (or H:MM:SS when >= 1 hour).
 * Returns '—' when duration is null.
 */
export function formatStatsDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return '—';
  }
  const whole = Math.round(seconds);
  const hours = Math.floor(whole / 3600);
  const mins = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
