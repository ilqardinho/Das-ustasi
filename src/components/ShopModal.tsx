import React, { useState } from 'react';
import { ArrowLeft, Check, Coins, RotateCcw, ShieldCheck, Video } from 'lucide-react';
import { PHASE2_COIN_PACKS, SHOP_ITEMS } from '../data/shop';
import { CosmeticCategory, PlayerProgress, ShopItem } from '../game/types';
import { Translations } from '../i18n/translations';
import { build3DTileBoxShadow, getTileMaterialColors } from './DominoTileView';
import { AvatarEmblem } from './TableTheme';

interface ShopScreenProps {
  t: Translations;
  progress: PlayerProgress;
  onBuyOrEquip: (item: ShopItem) => void;
  onBack: () => void;
}

export const ShopScreen: React.FC<ShopScreenProps> = ({
  t,
  progress,
  onBuyOrEquip,
  onBack,
}) => {
  const [tab, setTab] = useState<CosmeticCategory | 'coins'>('tiles');
  const [restoreNoteVisible, setRestoreNoteVisible] = useState(false);

  const tabs: { id: CosmeticCategory | 'coins'; label: string }[] = [
    { id: 'tiles', label: t.shopTiles },
    { id: 'tables', label: t.shopTables },
    { id: 'effects', label: t.shopEffects },
    { id: 'avatars', label: t.shopAvatars },
    { id: 'coins', label: t.shopCoins },
  ];

  const itemsForTab =
    tab === 'coins' ? [] : SHOP_ITEMS.filter((item) => item.category === tab);

  const isEquipped = (item: ShopItem) =>
    progress.equippedCosmetics[item.category] === item.id;

  return (
    <div className="min-h-full w-full text-stone-100 flex flex-col">
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
              {t.shop}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-amber-400/30 text-amber-300 shrink-0">
            <Coins className="w-4 h-4 text-amber-400" />
            <span data-testid="shop-coins" className="font-mono-num font-bold text-sm">
              {progress.coins}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-5 flex flex-col gap-5">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === item.id
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-black/35 text-stone-200 hover:bg-black/50 border border-white/10'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Cosmetic Items Grid */}
        {tab !== 'coins' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {itemsForTab.map((item) => {
              const owned = progress.unlockedCosmetics.includes(item.id);
              const equipped = isEquipped(item);
              const canAfford = progress.coins >= item.price;
              const copy = t.shopItems[item.id] ?? { name: item.id, desc: '' };

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 flex flex-col justify-between gap-4 ${
                    equipped
                      ? 'bg-black/45 border-amber-400/60'
                      : 'bg-black/35 border-white/15'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Preview Swatch */}
                    <div className="shrink-0">
                      {item.category === 'avatars' ? (
                        <AvatarEmblem avatarId={item.id} size={48} />
                      ) : item.category === 'tiles' ? (() => {
                        const mat = getTileMaterialColors(item.id);
                        return (
                          <div
                            className="w-11 h-16 rounded-lg flex flex-col items-center justify-between py-2 px-1.5 relative"
                            style={{
                              background: mat.faceBg,
                              border: `1px solid ${mat.border}`,
                              boxShadow: build3DTileBoxShadow({
                                colors: mat,
                                depth: 3,
                                zLevel: 1,
                                lift: 2,
                              }),
                            }}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{
                                backgroundColor: item.previewAccent,
                                boxShadow: 'inset 0 1px 1.5px rgba(0,0,0,0.45)',
                              }}
                            />
                            <span
                              className="w-6 h-[1.5px] opacity-40"
                              style={{ backgroundColor: item.previewAccent }}
                            />
                            <div className="flex items-center gap-1">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor: item.previewAccent,
                                  boxShadow: 'inset 0 1px 1.5px rgba(0,0,0,0.45)',
                                }}
                              />
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor: item.previewAccent,
                                  boxShadow: 'inset 0 1px 1.5px rgba(0,0,0,0.45)',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })() : (
                        <div
                          className="w-12 h-14 rounded-xl border border-white/25 flex items-center justify-center relative"
                          style={{
                            background: `linear-gradient(145deg, ${item.previewPrimary}, ${item.previewSecondary})`,
                          }}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full"
                            style={{ backgroundColor: item.previewAccent }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h2 className="font-display font-bold text-base text-white truncate">
                        {copy.name}
                      </h2>
                      <p className="text-xs text-stone-300/85 mt-0.5 leading-relaxed">
                        {copy.desc}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!owned && !canAfford}
                    onClick={() => onBuyOrEquip(item)}
                    className={`w-full min-h-[44px] px-4 py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                      equipped
                        ? 'bg-emerald-500/25 border border-emerald-400/50 text-emerald-200 cursor-default'
                        : owned
                        ? 'bg-white/15 hover:bg-white/25 text-white cursor-pointer'
                        : canAfford
                        ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer'
                        : 'bg-stone-800/70 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    {equipped ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{t.equipped}</span>
                      </>
                    ) : owned ? (
                      <span>{t.equip}</span>
                    ) : (
                      <>
                        <Coins className="w-4 h-4" />
                        <span className="font-mono-num">{item.price}</span>
                        <span>· {t.buy}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* Coin Packs & Rewarded Ads (Honest Phase 2 specification — NOT simulated) */
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-black/35 border border-amber-400/30 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-display font-bold text-base text-white">
                    {t.iapNoticeTitle}
                  </h2>
                  <p className="mt-1 text-sm text-stone-300 leading-relaxed">
                    {t.iapNoticeDesc}
                  </p>
                  <p className="mt-2 text-xs text-emerald-300 font-medium">
                    {t.fairPlayNote}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {PHASE2_COIN_PACKS.map((pack) => (
                <div
                  key={pack.id}
                  className="rounded-2xl bg-black/30 border border-white/10 p-4 flex flex-col justify-between gap-3"
                >
                  <div>
                    <p className="text-xs text-amber-300 font-semibold">{t.phase2Badge}</p>
                    <p className="mt-1 font-mono-num font-extrabold text-2xl text-white flex items-center gap-2">
                      <Coins className="w-5 h-5 text-amber-400" />
                      <span>{pack.coins}</span>
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="font-mono-num font-bold text-base text-stone-200">
                      {pack.priceDisplay}
                    </span>
                    <span className="text-xs text-stone-400">{t.phase2Badge}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="rounded-2xl bg-black/30 border border-white/10 p-4 flex items-start gap-3">
                <Video className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-display font-bold text-sm text-white">
                    {t.rewardedAdTitle}
                  </h3>
                  <p className="mt-1 text-xs text-stone-300 leading-relaxed">
                    {t.rewardedAdDesc}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-black/30 border border-white/10 p-4 flex flex-col justify-between gap-3">
                <div className="flex items-start gap-3">
                  <RotateCcw className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-display font-bold text-sm text-white">
                      {t.restorePurchases}
                    </h3>
                    <p className="mt-1 text-xs text-stone-300 leading-relaxed">
                      {t.restorePurchasesNote}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRestoreNoteVisible((v) => !v)}
                  className="self-start min-h-[40px] px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer"
                >
                  {t.restorePurchases}
                </button>
                {restoreNoteVisible && (
                  <p className="text-xs text-amber-200">{t.restorePurchasesNote}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
