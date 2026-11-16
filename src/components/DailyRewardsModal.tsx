import React from 'react';
import { ArrowLeft, Check, Coins, Gift } from 'lucide-react';
import { DAILY_LOGIN_REWARDS } from '../data/shop';
import { PlayerProgress } from '../game/types';
import { Translations } from '../i18n/translations';

interface DailyRewardsScreenProps {
  t: Translations;
  progress: PlayerProgress;
  canClaimToday: boolean;
  onClaimToday: () => void;
  onBack: () => void;
}

export const DailyRewardsScreen: React.FC<DailyRewardsScreenProps> = ({
  t,
  progress,
  canClaimToday,
  onClaimToday,
  onBack,
}) => {
  const currentDayIndex = progress.dailyLoginStreak % DAILY_LOGIN_REWARDS.length;

  return (
    <div className="min-h-full w-full text-stone-100 flex flex-col">
      <header className="sticky top-0 z-20 bg-black/65 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
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
              {t.dailyRewards}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-amber-400/30 text-amber-300 shrink-0">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-mono-num font-bold text-sm">{progress.coins}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        <div className="rounded-2xl bg-black/35 border border-white/15 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/35 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-white">
                {t.streakTitle}
              </h2>
              <p className="text-sm text-stone-300 mt-0.5">{t.streakDesc}</p>
            </div>
          </div>

          <button
            type="button"
            disabled={!canClaimToday}
            onClick={onClaimToday}
            className={`min-h-[48px] px-6 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap shrink-0 transition-colors ${
              canClaimToday
                ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer'
                : 'bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 cursor-default'
            }`}
          >
            {canClaimToday ? t.claimReward : t.claimed}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {DAILY_LOGIN_REWARDS.map((amount, idx) => {
            const isPast = idx < currentDayIndex || (!canClaimToday && idx === currentDayIndex);
            const isToday = canClaimToday && idx === currentDayIndex;

            return (
              <div
                key={idx}
                className={`rounded-2xl border p-4 flex flex-col items-center justify-between gap-2 text-center ${
                  isToday
                    ? 'bg-amber-500/20 border-amber-400'
                    : isPast
                    ? 'bg-emerald-500/15 border-emerald-400/30'
                    : 'bg-black/30 border-white/10'
                }`}
              >
                <span className="text-xs font-semibold text-stone-300">
                  {t.dayLabel} {idx + 1}
                </span>

                <div className="flex items-center gap-1 text-amber-300 font-mono-num font-bold text-lg">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>+{amount}</span>
                </div>

                {isPast ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-300 font-semibold">
                    <Check className="w-3.5 h-3.5" />
                    {t.claimed}
                  </span>
                ) : isToday ? (
                  <span className="text-xs text-amber-300 font-bold">{t.claimReward}</span>
                ) : (
                  <span className="text-xs text-stone-500">·</span>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};
