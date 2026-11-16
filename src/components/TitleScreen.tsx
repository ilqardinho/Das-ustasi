import React from 'react';
import { BarChart3, Calendar, Clock, Coins, Gift, Map, Music, Play, Settings, ShoppingBag, Sparkles, Star, Users, Volume2, VolumeX, WifiOff, Zap } from 'lucide-react';
import { getDominiMenuGreeting } from '../game/domini';
import { ROOM_CREATE_COST_COINS } from '../game/multiplayer';
import { computePlayerStats, formatStatsDuration } from '../game/stats';
import { PlayerProgress, PlayerSettings } from '../game/types';
import { Translations } from '../i18n/translations';
import { speakDominiMessage } from '../utils/dominiVoice';
import { getTileMaterialColors } from './DominoTileView';
import { AvatarEmblem } from './TableTheme';

interface TitleScreenProps {
  t: Translations;
  progress: PlayerProgress;
  settings: PlayerSettings;
  canClaimDailyReward: boolean;
  dailyChallengeDone: boolean;
  onStartContinue: () => void;
  onOpenMap: () => void;
  onOpenDailyChallenge: () => void;
  onOpenDailyRewards: () => void;
  onOpenShop: () => void;
  onOpenSettings: () => void;
  onOpenMultiplayer: () => void;
  onToggleMusic: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  t,
  progress,
  settings,
  canClaimDailyReward,
  dailyChallengeDone,
  onStartContinue,
  onOpenMap,
  onOpenDailyChallenge,
  onOpenDailyRewards,
  onOpenShop,
  onOpenSettings,
  onOpenMultiplayer,
  onToggleMusic,
}) => {
  const menuGreeting = getDominiMenuGreeting(settings.language);
  const stats = computePlayerStats(progress);
  const ivoryColors = getTileMaterialColors('tile_ivory');
  const heroShadowLeft = [
    `inset 0 1.5px 0 ${ivoryColors.innerTopHighlight}`,
    `0.25px 1px 0 ${ivoryColors.sideUpper}`,
    `0.5px 2px 0 ${ivoryColors.sideUpper}`,
    `0.75px 3px 0 ${ivoryColors.sideMid}`,
    `1px 4px 0 ${ivoryColors.sideLower}`,
    '3px 10px 16px rgba(0, 0, 0, 0.38)',
  ].join(', ');
  const heroShadowRight = [
    `inset 0 1.5px 0 ${ivoryColors.innerTopHighlight}`,
    '0 0 0 2px rgba(251, 191, 36, 0.7)',
    `0.25px 1px 0 ${ivoryColors.sideUpper}`,
    `0.5px 2px 0 ${ivoryColors.sideUpper}`,
    `0.75px 3px 0 ${ivoryColors.sideMid}`,
    `1px 4px 0 ${ivoryColors.sideLower}`,
    '4px 12px 18px rgba(0, 0, 0, 0.42)',
  ].join(', ');

  return (
    <div
      className="min-h-full w-full flex flex-col justify-between text-stone-100 relative overflow-x-hidden"
    >
      {/* Subtle geometric lattice overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25px 25px, #fde68a 1.5px, transparent 0)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* Compact Top Utility Strip */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <AvatarEmblem avatarId={progress.equippedCosmetics.avatars} size={40} />
          <div className="min-w-0">
            <p className="text-xs text-emerald-200/80 flex items-center gap-1.5 whitespace-nowrap">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              <span>{t.offlineReady}</span>
            </p>
            <p className="text-sm font-semibold text-white truncate">
              {t.appTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenShop}
            aria-label={`${t.coins}: ${progress.coins}`}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-black/35 border border-amber-400/30 flex items-center gap-2 text-amber-300 hover:bg-black/50 transition-colors cursor-pointer"
          >
            <Coins className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-mono-num font-bold text-sm">{progress.coins}</span>
          </button>

          <button
            type="button"
            data-testid="title-music-toggle"
            onClick={onToggleMusic}
            aria-label={t.musicMuteToggle}
            aria-pressed={settings.musicEnabled && settings.musicVolume > 0}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition-colors cursor-pointer ${
              settings.musicEnabled && settings.musicVolume > 0
                ? 'bg-black/35 border-amber-400/35 text-amber-200 hover:bg-black/50'
                : 'bg-black/35 border-white/15 text-stone-400 hover:bg-black/50'
            }`}
          >
            {settings.musicEnabled && settings.musicVolume > 0 ? (
              <Music className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label={t.settings}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-black/35 border border-white/15 text-stone-100 hover:bg-black/50 transition-colors cursor-pointer"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Hero Stage (Desktop 2-col balance / Mobile centered ergonomic flow) */}
      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-col items-center justify-center gap-5 lg:gap-6">
        <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12">
        {/* Interactive Domino Pair Centerpiece */}
        <div className="relative flex items-center justify-center py-4 lg:py-0 shrink-0">
          <div className="relative w-56 h-48 sm:w-64 sm:h-52 flex items-center justify-center">
            {/* Decorative geometric aura */}
            <svg
              viewBox="0 0 220 200"
              className="absolute inset-0 w-full h-full opacity-25 pointer-events-none"
              aria-hidden="true"
            >
              <polygon
                points="110,12 188,56 188,144 110,188 32,144 32,56"
                fill="none"
                stroke="#FBBF24"
                strokeWidth="1.5"
              />
              <polygon
                points="110,28 174,65 174,135 110,172 46,135 46,65"
                fill="none"
                stroke="#34D399"
                strokeWidth="1"
              />
            </svg>

            {/* Left Domino Card */}
            <div
              className="w-20 h-32 sm:w-24 sm:h-36 rounded-xl border-2 border-[#ede2cc] flex flex-col justify-between p-2.5 -rotate-12 -translate-x-5 translate-y-2 transition-transform duration-300 hover:-translate-y-1 relative"
              style={{ background: ivoryColors.faceBg, boxShadow: heroShadowLeft }}
              aria-hidden="true"
            >
              <div className="grid grid-cols-3 gap-1 place-items-center flex-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.8)]" />
                <span />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.8)]" />
                <span />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.8)]" />
                <span />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.8)]" />
                <span />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.8)]" />
              </div>
              <div className="relative flex items-center justify-center my-1">
                <div className="h-[2px] w-4/5 mx-auto bg-stone-500/35 rounded-full shadow-[0_1px_0_rgba(255,255,255,0.75)]" />
                <span
                  className="absolute w-1.5 h-1.5 rounded-full"
                  style={{ background: ivoryColors.rivetBg }}
                />
              </div>
              <div className="grid grid-cols-3 gap-1 place-items-center flex-1">
                <span />
                <span />
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.8)]" />
                <span />
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.8)]" />
                <span />
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.8)]" />
                <span />
                <span />
              </div>
            </div>

            {/* Right Domino Card */}
            <div
              className="w-20 h-32 sm:w-24 sm:h-36 rounded-xl border-2 border-amber-400 flex flex-col justify-between p-2.5 rotate-12 translate-x-5 -translate-y-2 transition-transform duration-300 hover:-translate-y-4 relative"
              style={{ background: ivoryColors.faceBg, boxShadow: heroShadowRight }}
              aria-hidden="true"
            >
              <div className="grid grid-cols-3 gap-1 place-items-center flex-1">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-900 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.8)]" />
                <span />
                <span className="w-2.5 h-2.5 rounded-full bg-stone-900 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.8)]" />
                <span className="w-2.5 h-2.5 rounded-full bg-stone-900 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.8)]" />
                <span />
                <span className="w-2.5 h-2.5 rounded-full bg-stone-900 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.8)]" />
                <span className="w-2.5 h-2.5 rounded-full bg-stone-900 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.8)]" />
                <span />
                <span className="w-2.5 h-2.5 rounded-full bg-stone-900 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.8)]" />
              </div>
              <div className="relative flex items-center justify-center my-1">
                <div className="h-[2px] w-4/5 mx-auto bg-stone-500/35 rounded-full shadow-[0_1px_0_rgba(255,255,255,0.75)]" />
                <span
                  className="absolute w-1.5 h-1.5 rounded-full"
                  style={{ background: ivoryColors.rivetBg }}
                />
              </div>
              <div className="grid grid-cols-3 gap-1 place-items-center flex-1">
                <span />
                <span />
                <span />
                <span />
                <span className="w-3 h-3 rounded-full bg-red-600 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.8)]" />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>

        {/* Title Emblem, Rules & Primary Actions */}
        <div className="w-full max-w-md flex flex-col items-center lg:items-start text-center lg:text-left">
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white [text-wrap:balance]">
            {t.appTitle}
          </h1>
          <p className="mt-1.5 text-base sm:text-lg font-medium text-amber-300">
            {t.appSubtitle}
          </p>
          <p className="mt-3 text-sm text-stone-200/85 leading-relaxed max-w-sm">
            {t.rulesShort}
          </p>

          {/* Interactive Domini Male Voice Greeting in Menu */}
          <button
            type="button"
            data-testid="menu-domini-speak-btn"
            onClick={() => {
              void speakDominiMessage({
                text: menuGreeting.message,
                language: settings.language,
                mood: menuGreeting.mood,
                enabled: settings.soundEnabled,
              });
            }}
            className="mt-3.5 w-full rounded-xl bg-black/35 hover:bg-black/50 border border-amber-400/35 px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
          >
            <span className="text-xs sm:text-sm text-amber-100 font-medium leading-snug">
              <strong className="text-amber-300 font-display mr-1.5">Domini:</strong>
              {menuGreeting.message}
            </span>
            <span className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 border border-amber-400/40 px-2.5 py-1 text-xs font-bold text-amber-200">
              <Volume2 className="w-3.5 h-3.5 shrink-0" />
              <span>{t.dominiVoiceTestBtn}</span>
            </span>
          </button>

          {/* Primary Play CTA */}
          <div className="mt-5 w-full flex flex-col gap-3">
            <button
              type="button"
              data-start="true"
              onClick={onStartContinue}
              className="w-full min-h-[52px] px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-stone-950 font-display font-bold text-lg flex items-center justify-center gap-2.5 shadow-lg shadow-amber-950/40 transition-all cursor-pointer whitespace-nowrap"
            >
              <Play className="w-5 h-5 fill-current shrink-0" />
              <span>
                {progress.highestUnlockedLevel > 1
                  ? `${t.continueLevel} ${progress.highestUnlockedLevel}`
                  : t.playNow}
              </span>
            </button>

            {/* Secondary Action Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onOpenMap}
                className="min-h-[48px] px-4 py-2.5 rounded-xl bg-black/35 hover:bg-black/50 border border-white/15 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Map className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>{t.levelMap}</span>
              </button>

              <button
                type="button"
                onClick={onOpenShop}
                className="min-h-[48px] px-4 py-2.5 rounded-xl bg-black/35 hover:bg-black/50 border border-white/15 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <ShoppingBag className="w-4 h-4 text-amber-300 shrink-0" />
                <span>{t.shop}</span>
              </button>

              <button
                type="button"
                onClick={onOpenDailyChallenge}
                className="min-h-[48px] px-3 py-2.5 rounded-xl bg-black/35 hover:bg-black/50 border border-white/15 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Calendar className="w-4 h-4 text-sky-300 shrink-0" />
                <span className="truncate">{t.dailyChallenge}</span>
                {dailyChallengeDone && (
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={onOpenDailyRewards}
                className={`min-h-[48px] px-3 py-2.5 rounded-xl border font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                  canClaimDailyReward
                    ? 'bg-emerald-600/40 hover:bg-emerald-600/55 border-emerald-400/60 text-emerald-100'
                    : 'bg-black/35 hover:bg-black/50 border-white/15 text-white'
                }`}
              >
                <Gift className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="truncate">{t.dailyRewards}</span>
              </button>
            </div>

            <button
              type="button"
              data-testid="open-multiplayer-btn"
              onClick={onOpenMultiplayer}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/45 text-sky-100 font-semibold text-sm flex items-center justify-between gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Users className="w-4 h-4 text-sky-300 shrink-0" />
                <span className="truncate">{t.friendsMultiplayer}</span>
              </span>
              <span className="font-mono-num text-xs font-bold text-amber-300 shrink-0">
                {ROOM_CREATE_COST_COINS} {t.coins}
              </span>
            </button>
          </div>
        </div>
        </div>

        {/* Main Menu Statistika Panel */}
        <section
          data-testid="stats-panel"
          aria-label={t.statsTitle}
          className="w-full max-w-3xl rounded-2xl bg-black/35 border border-white/15 px-4 py-3 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 mb-2.5">
            <BarChart3 className="w-4 h-4 text-amber-300 shrink-0" />
            <h2 className="font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-200/95">
              {t.statsTitle}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="rounded-xl bg-black/30 border border-white/10 px-3.5 py-2.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-400/25 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-sky-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-stone-300 truncate">
                  {t.statsTotalPlayTime}
                </p>
                <p
                  data-testid="stat-total-time"
                  className="font-mono-num tabular-nums text-lg font-extrabold text-white leading-tight"
                >
                  {formatStatsDuration(stats.totalPlayTimeSec)}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-black/30 border border-white/10 px-3.5 py-2.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-400/25 flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 text-amber-300 fill-amber-300/80" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-stone-300 truncate">
                  {t.statsTotalStars}
                </p>
                <p
                  data-testid="stat-total-stars"
                  className="font-mono-num tabular-nums text-lg font-extrabold text-amber-200 leading-tight"
                >
                  {stats.totalStars}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-black/30 border border-white/10 px-3.5 py-2.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-stone-300 truncate">
                  {t.statsFastestWin}
                </p>
                <p
                  data-testid="stat-fastest-win"
                  className="font-mono-num tabular-nums text-lg font-extrabold text-emerald-200 leading-tight"
                >
                  {formatStatsDuration(stats.fastestWinSec)}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Non-intrusive Phase 2 Menu Banner Slot + Controls Hint */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 pb-4 pt-2 flex flex-col items-center gap-2">
        <div className="w-full max-w-3xl rounded-xl bg-black/35 border border-white/10 px-4 py-2 flex items-center justify-between gap-4 text-xs text-stone-300">
          <span className="font-medium text-stone-100 whitespace-nowrap shrink-0">{t.adBannerSlotTitle}</span>
          <span className="text-stone-400 hidden sm:inline truncate">{t.adBannerSlotDesc}</span>
        </div>
        <p className="text-xs text-stone-300/75 text-center">{t.controlsHint}</p>
      </footer>
    </div>
  );
};
