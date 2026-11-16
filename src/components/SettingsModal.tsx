import React, { useState } from 'react';
import { ArrowLeft, Globe, Hash, Eye, Music, Shield, Trash2, Vibrate, Volume1, Volume2 } from 'lucide-react';
import { getDominiVoiceTestMessage } from '../game/domini';
import { LanguageCode, PlayerProgress, PlayerSettings } from '../game/types';
import { LANGUAGE_LABELS, Translations } from '../i18n/translations';
import { triggerHaptic } from '../utils/audio';
import { speakDominiMessage } from '../utils/dominiVoice';

interface SettingsScreenProps {
  t: Translations;
  progress: PlayerProgress;
  settings: PlayerSettings;
  onUpdateSettings: (patch: Partial<PlayerSettings>) => void;
  onResetAllData: () => void;
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  t,
  progress,
  settings,
  onUpdateSettings,
  onResetAllData,
  onBack,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletedToast, setDeletedToast] = useState(false);

  const languages: LanguageCode[] = ['az', 'en', 'tr', 'ru'];

  const handleConfirmDelete = () => {
    onResetAllData();
    setConfirmDelete(false);
    setDeletedToast(true);
    window.setTimeout(() => setDeletedToast(false), 3000);
  };

  return (
    <div className="min-h-full w-full text-stone-100 flex flex-col">
      <header className="sticky top-0 z-20 bg-black/65 border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
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
              {t.settings}
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-5 flex flex-col gap-5">
        {deletedToast && (
          <div
            role="status"
            className="rounded-xl bg-emerald-600/30 border border-emerald-400/50 px-4 py-3 text-sm font-medium text-emerald-100"
          >
            {t.dataDeletedToast}
          </div>
        )}

        {/* Audio, Haptics & Gameplay Aids */}
        <section className="rounded-2xl bg-black/35 border border-white/15 divide-y divide-white/10">
          <label className="min-h-[56px] px-4 py-3 flex items-center justify-between gap-4 cursor-pointer">
            <span className="flex items-center gap-3 text-sm font-medium text-white">
              <Volume2 className="w-5 h-5 text-amber-300 shrink-0" />
              <span>{t.soundLabel}</span>
            </span>
            <input
              type="checkbox"
              data-testid="settings-sound-toggle"
              checked={settings.soundEnabled}
              onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
              className="w-5 h-5 accent-amber-500 cursor-pointer"
            />
          </label>

          <label className="min-h-[56px] px-4 py-3 flex items-center justify-between gap-4 cursor-pointer">
            <span className="flex items-center gap-3 text-sm font-medium text-white">
              <Music className="w-5 h-5 text-amber-300 shrink-0" />
              <span>{t.musicLabel}</span>
            </span>
            <input
              type="checkbox"
              data-testid="settings-music-toggle"
              checked={settings.musicEnabled}
              onChange={(e) => {
                const nextEnabled = e.target.checked;
                onUpdateSettings({
                  musicEnabled: nextEnabled,
                  musicVolume:
                    nextEnabled && settings.musicVolume <= 0 ? 0.45 : settings.musicVolume,
                });
              }}
              className="w-5 h-5 accent-amber-500 cursor-pointer"
            />
          </label>

          <div className="min-h-[60px] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
            <label
              htmlFor="settings-music-volume"
              className="flex items-center gap-3 text-sm font-medium text-white shrink-0"
            >
              <Volume1 className="w-5 h-5 text-sky-300 shrink-0" />
              <span>{t.musicVolumeLabel}</span>
            </label>
            <div className="flex items-center gap-3 w-full sm:w-56">
              <input
                id="settings-music-volume"
                type="range"
                data-testid="settings-music-volume"
                min={0}
                max={100}
                step={5}
                value={Math.round((settings.musicEnabled ? settings.musicVolume : 0) * 100)}
                onChange={(e) => {
                  const pct = Number(e.target.value);
                  const nextVol = Math.max(0, Math.min(1, pct / 100));
                  onUpdateSettings({
                    musicEnabled: nextVol > 0 ? true : false,
                    musicVolume: nextVol > 0 ? nextVol : 0,
                  });
                }}
                aria-label={t.musicVolumeLabel}
                className="flex-1 h-2 rounded-lg accent-amber-500 cursor-pointer"
              />
              <span
                data-testid="settings-music-volume-value"
                className="font-mono-num tabular-nums text-xs font-bold text-amber-200 w-10 text-right shrink-0"
              >
                {Math.round((settings.musicEnabled ? settings.musicVolume : 0) * 100)}%
              </span>
            </div>
          </div>

          <div className="min-h-[56px] px-4 py-3 flex items-center justify-between gap-4">
            <span className="flex items-center gap-3 text-sm font-medium text-white">
              <Volume2 className="w-5 h-5 text-emerald-300 shrink-0" />
              <span>{t.dominiVoiceLabel}</span>
            </span>
            <button
              type="button"
              data-testid="settings-voice-test-btn"
              onClick={() => {
                const sample = getDominiVoiceTestMessage(settings.language);
                void speakDominiMessage({
                  text: sample.message,
                  language: settings.language,
                  mood: sample.mood,
                  enabled: true,
                });
              }}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{t.dominiVoiceTestBtn}</span>
            </button>
          </div>

          <label className="min-h-[56px] px-4 py-3 flex items-center justify-between gap-4 cursor-pointer">
            <span className="flex items-center gap-3 text-sm font-medium text-white">
              <Vibrate className="w-5 h-5 text-amber-300 shrink-0" />
              <span>{t.vibrationLabel}</span>
            </span>
            <input
              type="checkbox"
              data-testid="settings-vibration-toggle"
              checked={settings.vibrationEnabled}
              onChange={(e) => {
                const nextEnabled = e.target.checked;
                onUpdateSettings({ vibrationEnabled: nextEnabled });
                if (nextEnabled) {
                  triggerHaptic(true, 15);
                }
              }}
              className="w-5 h-5 accent-amber-500 cursor-pointer"
            />
          </label>

          <label className="min-h-[56px] px-4 py-3 flex items-center justify-between gap-4 cursor-pointer">
            <span className="flex items-center gap-3 text-sm font-medium text-white">
              <Hash className="w-5 h-5 text-sky-300 shrink-0" />
              <span>{t.numbersAidLabel}</span>
            </span>
            <input
              type="checkbox"
              checked={settings.showNumbersAid}
              onChange={(e) => onUpdateSettings({ showNumbersAid: e.target.checked })}
              className="w-5 h-5 accent-amber-500 cursor-pointer"
            />
          </label>

          <label className="min-h-[56px] px-4 py-3 flex items-center justify-between gap-4 cursor-pointer">
            <span className="flex items-center gap-3 text-sm font-medium text-white">
              <Eye className="w-5 h-5 text-emerald-300 shrink-0" />
              <span>{t.highlightFreeLabel}</span>
            </span>
            <input
              type="checkbox"
              checked={settings.highlightFreeTiles}
              onChange={(e) => onUpdateSettings({ highlightFreeTiles: e.target.checked })}
              className="w-5 h-5 accent-amber-500 cursor-pointer"
            />
          </label>
        </section>

        {/* Language Switcher */}
        <section className="rounded-2xl bg-black/35 border border-white/15 p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <Globe className="w-5 h-5 text-amber-300" />
            <h2 className="font-display font-bold text-base text-white">
              {t.languageLabel}
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {languages.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => onUpdateSettings({ language: lang })}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  settings.language === lang
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-white/10 hover:bg-white/15 text-stone-200'
                }`}
              >
                {LANGUAGE_LABELS[lang]}
              </button>
            ))}
          </div>
        </section>

        {/* Privacy Policy, Terms of Service & Account Deletion */}
        <section className="rounded-2xl bg-black/35 border border-white/15 p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-emerald-300" />
            <h2 className="font-display font-bold text-base text-white">
              {t.legalTitle}
            </h2>
          </div>

          <div className="space-y-2 text-sm">
            <h3 className="font-semibold text-amber-200">{t.privacyPolicy}</h3>
            <p className="text-stone-300 leading-relaxed text-xs sm:text-sm">
              {t.privacyPolicyBody}
            </p>
          </div>

          <div className="space-y-2 text-sm pt-2 border-t border-white/10">
            <h3 className="font-semibold text-amber-200">{t.termsOfService}</h3>
            <p className="text-stone-300 leading-relaxed text-xs sm:text-sm">
              {t.termsOfServiceBody}
            </p>
          </div>

          <div className="pt-3 border-t border-white/10">
            <h3 className="font-semibold text-rose-300 flex items-center gap-2 text-sm">
              <Trash2 className="w-4 h-4" />
              <span>{t.deleteAccount}</span>
            </h3>
            <p className="text-xs text-stone-300 mt-1 leading-relaxed">
              {t.deleteAccountDesc}
            </p>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="mt-3 min-h-[44px] px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 text-xs sm:text-sm font-semibold cursor-pointer"
              >
                {t.deleteAccountBtn}
              </button>
            ) : (
              <div className="mt-3 p-3 rounded-xl bg-rose-950/60 border border-rose-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-rose-100">{t.deleteAccountConfirm}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-stone-800 text-stone-200 text-xs font-semibold cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                  >
                    {t.confirm}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
