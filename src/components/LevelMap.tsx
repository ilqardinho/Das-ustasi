import React, { useMemo, useState } from 'react';
import { ArrowLeft, Calendar, Coins, Lock, Star, Timer, Trophy, Users } from 'lucide-react';
import { getDailyChallengeLevel, LEVELS } from '../game/levels';
import { PlayerProgress } from '../game/types';
import { Translations } from '../i18n/translations';
import { getTodayIso } from '../utils/storage';
import { getTableBackgroundStyle } from './TableTheme';

interface LevelMapProps {
  t: Translations;
  progress: PlayerProgress;
  dailyDone: boolean;
  onSelectLevel: (levelId: number, forceTimed?: boolean) => void;
  onStartDaily: () => void;
  onOpenMultiplayer: () => void;
  onBack: () => void;
}

export const LevelMap: React.FC<LevelMapProps> = ({
  t,
  progress,
  dailyDone,
  onSelectLevel,
  onStartDaily,
  onOpenMultiplayer,
  onBack,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'timed'>('all');
  const tableStyle = getTableBackgroundStyle(progress.equippedCosmetics.tables);
  const dailyMeta = useMemo(() => getDailyChallengeLevel(getTodayIso()).config, []);

  const visibleLevels =
    filterMode === 'timed'
      ? LEVELS.filter((l) => l.timeLimitSec !== null)
      : LEVELS;

  const getDifficultyLabel = (d: string) => {
    if (d === 'easy') return t.difficultyEasy;
    if (d === 'medium') return t.difficultyMedium;
    if (d === 'hard') return t.difficultyHard;
    return t.difficultyMaster;
  };

  return (
    <div
      className="min-h-full w-full text-stone-100 flex flex-col"
      style={tableStyle}
    >
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-black/65 border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label={t.backToTitle}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 text-white cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display font-bold text-lg sm:text-xl text-white truncate">
              {t.levelMap}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-amber-400/30 text-amber-300">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="font-mono-num font-bold text-sm">{progress.coins}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-5 flex flex-col gap-6">
        {/* Daily Challenge & Mode Filter */}
        <div className="flex flex-col md:flex-row items-stretch justify-between gap-4">
          <button
            type="button"
            onClick={onStartDaily}
            className="flex-1 text-left rounded-2xl bg-black/35 hover:bg-black/45 border border-sky-400/35 p-4 flex items-center justify-between gap-4 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-sky-300" />
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-base text-white truncate">
                  {t.dailyChallenge}
                </p>
                <p className="text-xs text-stone-300 truncate">
                  {dailyDone ? t.dailyCompleted : t.dailyReady} · {dailyMeta.timeLimitSec}s · +{dailyMeta.coinReward} {t.coins}
                </p>
              </div>
            </div>
            <span className="px-3.5 py-2 rounded-xl bg-sky-500 text-stone-950 font-bold text-xs whitespace-nowrap shrink-0">
              {t.playNow}
            </span>
          </button>

          {/* Segmented Mode Filter */}
          <div className="flex items-center gap-1 p-1 bg-black/35 border border-white/10 rounded-xl self-start md:self-center shrink-0">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                filterMode === 'all'
                  ? 'bg-amber-500 text-stone-950'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              {t.levelMap} ({LEVELS.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('timed')}
              className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                filterMode === 'timed'
                  ? 'bg-amber-500 text-stone-950'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              {t.timedMode}
            </button>
          </div>
        </div>

        {/* Progressive Stage Grid */}
        <section aria-label={t.levelMap} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {visibleLevels.map((lvl) => {
            const isLocked = lvl.id > progress.highestUnlockedLevel;
            const record = progress.levelRecords[lvl.id];
            const stars = record?.stars ?? 0;
            const name = t.levelNames[lvl.key] ?? `${t.levelMap} ${lvl.id}`;

            return (
              <button
                key={lvl.id}
                type="button"
                disabled={isLocked}
                onClick={() => onSelectLevel(lvl.id)}
                className={`text-left rounded-2xl border p-4 transition-colors flex flex-col justify-between gap-3 ${
                  isLocked
                    ? 'bg-black/20 border-white/10 text-stone-400 cursor-not-allowed'
                    : 'bg-black/40 hover:bg-black/55 border-white/15 hover:border-amber-400/50 text-white cursor-pointer'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-xs ${isLocked ? 'text-stone-400/75' : 'text-stone-300/85'}`}>
                      {lvl.id}. {getDifficultyLabel(lvl.difficulty)} · {lvl.slots.length} {t.tilesLeft}
                    </p>
                    <h2 className={`font-display font-bold text-base mt-0.5 truncate ${isLocked ? 'text-stone-300' : 'text-white'}`}>
                      {name}
                    </h2>
                  </div>

                  {isLocked ? (
                    <Lock className="w-4 h-4 text-stone-400 shrink-0 mt-1" />
                  ) : lvl.timeLimitSec ? (
                    <span className="inline-flex items-center gap-1 text-xs font-mono-num text-amber-300 shrink-0">
                      <Timer className="w-3.5 h-3.5" />
                      {lvl.timeLimitSec}s
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                  <div className="flex items-center gap-1" aria-label={`${stars}/3 ${t.starsLabel}`}>
                    {[1, 2, 3].map((sIdx) => (
                      <Star
                        key={sIdx}
                        className={`w-4 h-4 ${
                          sIdx <= stars ? 'text-amber-400 fill-amber-400' : 'text-stone-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-mono-num text-stone-300">
                    {record ? `${t.bestScore}: ${record.bestScore}` : `+${lvl.coinReward} ${t.coins}`}
                  </span>
                </div>
              </button>
            );
          })}
        </section>

        {/* Future Phase 2 Modes (Clearly non-simulated roadmap cards) */}
        <section className="pt-2">
          <h2 className="font-display font-bold text-base text-stone-200 mb-3">
            {t.futureModesTitle}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="rounded-2xl bg-black/25 border border-white/10 p-4 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/25 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-amber-300" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-amber-300 font-semibold">{t.phase2Badge}</p>
                <h3 className="font-display font-bold text-sm text-white">
                  {t.weeklyTournament}
                </h3>
                <p className="text-xs text-stone-300/80 mt-1 leading-relaxed">
                  {t.weeklyTournamentDesc}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenMultiplayer}
              className="text-left rounded-2xl bg-black/35 hover:bg-black/50 border border-emerald-400/35 p-4 flex items-start gap-3.5 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/35 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-amber-300 font-semibold font-mono-num">50 {t.coins}</p>
                <h3 className="font-display font-bold text-sm text-white">
                  {t.friendsMultiplayer}
                </h3>
                <p className="text-xs text-stone-300/85 mt-1 leading-relaxed">
                  {t.friendsMultiplayerDesc}
                </p>
              </div>
            </button>
          </div>
        </section>

        {/* Banner Ad Slot Notice (Menu/Map only) */}
        <div className="rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-stone-300">
          <span className="font-semibold text-stone-200">{t.adBannerSlotTitle}</span>
          <span className="text-stone-400">{t.adBannerSlotDesc}</span>
        </div>
      </main>
    </div>
  );
};
