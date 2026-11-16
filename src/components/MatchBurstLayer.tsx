import React from 'react';
import { DominoPip, TileSpecialType } from '../game/types';
import { getPipBubbleColors } from './DominoTileView';

export interface BurstItem {
  id: string;
  left: number;
  top: number;
  tileW: number;
  tileH: number;
  topPip: DominoPip;
  bottomPip: DominoPip;
  seed: number;
  points?: number;
  comboCount?: number;
  isMassExplosion?: boolean;
  special?: TileSpecialType;
}

interface MatchBurstLayerProps {
  bursts: readonly BurstItem[];
  tileTheme: string;
  effectColor: string;
}

function seededUnit(seed: number, idx: number): number {
  const x = Math.sin(seed * 12.9898 + idx * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function getSpecialBadgeText(special?: TileSpecialType): { text: string; color: string } | null {
  switch (special) {
    case 'bonus_time':
      return { text: '+12s!', color: '#34D399' };
    case 'bonus_coin':
      return { text: '+25', color: '#FBBF24' };
    case 'bonus_chain':
      return { text: 'x2!', color: '#38BDF8' };
    case 'trap_time':
      return { text: '-7s!', color: '#FB7185' };
    case 'trap_mix':
      return { text: '?!', color: '#C084FC' };
    default:
      return null;
  }
}

export const MatchBurstLayer: React.FC<MatchBurstLayerProps> = React.memo(
  ({ bursts, tileTheme, effectColor }) => {
    if (bursts.length === 0) return null;

    return (
      <>
        {bursts.map((b) => {
          const topColors = getPipBubbleColors(b.topPip, tileTheme);
          const bottomColors = getPipBubbleColors(b.bottomPip, tileTheme);
          const isMass = Boolean(b.isMassExplosion);
          const hasSpecial = Boolean(b.special);
          const radiusBase = Math.max(50, b.tileW * (isMass ? 1.08 : hasSpecial ? 1.48 : 1.36));
          const bubbleCount = isMass ? 10 : hasSpecial ? 30 : 26;
          const sparkleCount = isMass ? 7 : 18;
          const splashRingCount = isMass ? 2 : 9;
          const specialBadge = getSpecialBadgeText(b.special);

          const bubbles = Array.from({ length: bubbleCount }).map((_, idx) => {
            const halfCount = bubbleCount / 2;
            const isTopHalf = idx < halfCount;
            const colors = isTopHalf ? topColors : bottomColors;
            const localIdx = idx % halfCount;
            const baseAngle = isTopHalf
              ? -Math.PI * 0.98 + (localIdx / Math.max(1, halfCount - 1)) * Math.PI * 0.96
              : Math.PI * 0.02 + (localIdx / Math.max(1, halfCount - 1)) * Math.PI * 0.96;
            const jitterAngle = (seededUnit(b.seed, idx * 3 + 1) - 0.5) * 0.44;
            const angle = baseAngle + jitterAngle;
            const dist = radiusBase * (0.58 + seededUnit(b.seed, idx * 3 + 2) * 1.02);
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist - (18 + seededUnit(b.seed, idx * 3 + 3) * 28);
            const sway = (
              (idx % 2 === 0 ? 1 : -1) *
              (9 + seededUnit(b.seed, idx + 19) * 18)
            ).toFixed(1);

            // Mix hero glossy spheres (25%), medium iridescent bubbles (50%), and fizzy micro-bubbles (25%)
            const tierRoll = seededUnit(b.seed, idx + 31);
            const sizeRatio =
              tierRoll > 0.76
                ? 0.31 + seededUnit(b.seed, idx + 41) * 0.14
                : tierRoll > 0.25
                ? 0.2 + seededUnit(b.seed, idx + 41) * 0.1
                : 0.12 + seededUnit(b.seed, idx + 41) * 0.07;

            const size = Math.max(7, Math.round(b.tileW * sizeRatio));
            const delayMs = Math.round(seededUnit(b.seed, idx + 51) * (isMass ? 75 : 130));
            const scale = (0.92 + seededUnit(b.seed, idx + 71) * 0.54).toFixed(2);
            const originY = isTopHalf ? -b.tileH * 0.2 : b.tileH * 0.2;
            const isHero = tierRoll > 0.72;

            return {
              key: `bubble-${idx}`,
              colors,
              dx: `${dx.toFixed(1)}px`,
              dy: `${dy.toFixed(1)}px`,
              sway: `${sway}px`,
              size,
              delayMs,
              scale,
              originY,
              isHero,
            };
          });

          // Secondary pop splash rings right where hero bubbles burst
          const splashRings = Array.from({ length: splashRingCount }).map((_, idx) => {
            const pick =
              bubbles[Math.min(bubbles.length - 1, idx * Math.floor(bubbleCount / splashRingCount))];
            return {
              key: `splash-${idx}`,
              dx: pick.dx,
              dy: pick.dy,
              originY: pick.originY,
              color: pick.colors.main,
              glow: pick.colors.glow,
              delayMs: pick.delayMs + 340,
              size: Math.max(14, Math.round(pick.size * 1.18)),
            };
          });

          const sparkles = Array.from({ length: sparkleCount }).map((_, idx) => {
            const angle = (idx / sparkleCount) * Math.PI * 2 + seededUnit(b.seed, idx + 90) * 0.38;
            const dist = radiusBase * (0.9 + seededUnit(b.seed, idx + 100) * 0.85);
            const sx = `${(Math.cos(angle) * dist).toFixed(1)}px`;
            const sy = `${(Math.sin(angle) * dist).toFixed(1)}px`;
            const srot = `${Math.round(90 + seededUnit(b.seed, idx + 110) * 200)}deg`;
            const color =
              specialBadge && idx % 3 === 0
                ? specialBadge.color
                : idx % 3 === 0
                ? topColors.main
                : idx % 3 === 1
                ? bottomColors.main
                : effectColor;
            const starSize = idx % 3 === 0 ? 12 : 9;
            return { key: `spark-${idx}`, sx, sy, srot, color, starSize };
          });

          return (
            <div
              key={b.id}
              data-testid="match-burst"
              className="pointer-events-none absolute z-[1200]"
              style={{ left: b.left, top: b.top }}
            >
              {/* Shattering glossy tile silhouette */}
              <div
                className="absolute rounded-[8px] animate-tile-shatter"
                style={{
                  left: 0,
                  top: 0,
                  width: b.tileW,
                  height: b.tileH,
                  background: `linear-gradient(160deg, ${topColors.main}cc 0%, #ffffffea 48%, ${bottomColors.main}cc 100%)`,
                  boxShadow: `0 0 32px ${topColors.glow}, 0 0 34px ${bottomColors.glow}`,
                }}
              />

              {/* Intense luminous explosion bloom */}
              <div
                className="absolute rounded-full animate-explosion-bloom"
                style={{
                  left: 0,
                  top: 0,
                  width: b.tileW * 1.72,
                  height: b.tileW * 1.72,
                  background: specialBadge
                    ? `radial-gradient(circle, rgba(255,255,255,0.96) 0%, ${specialBadge.color}cc 36%, ${bottomColors.main}66 62%, transparent 78%)`
                    : `radial-gradient(circle, rgba(255,255,255,0.95) 0%, ${topColors.main}cc 32%, ${bottomColors.main}77 58%, transparent 76%)`,
                }}
              />

              {/* Expanding shockwave rings */}
              <div
                className="absolute rounded-full animate-match-burst"
                style={{
                  left: 0,
                  top: 0,
                  width: b.tileW * 1.4,
                  height: b.tileW * 1.4,
                  border: `3.5px solid ${specialBadge ? specialBadge.color : topColors.main}`,
                  boxShadow: `0 0 28px ${topColors.glow}`,
                }}
              />
              {!isMass && (
                <div
                  className="absolute rounded-full animate-match-burst"
                  style={{
                    left: 0,
                    top: 0,
                    width: b.tileW * 1.02,
                    height: b.tileW * 1.02,
                    border: `2.5px solid ${bottomColors.main}`,
                    boxShadow: `0 0 22px ${bottomColors.glow}`,
                    animationDelay: '55ms',
                  }}
                />
              )}

              {/* Pearlescent Translucent Soap/Candy Bubbles with Rainbow Rim Sheen & Dual Specular Glints */}
              {bubbles.map((bubble) => (
                <div
                  key={bubble.key}
                  data-testid="pip-bubble"
                  className="absolute rounded-full animate-bubble-pop overflow-hidden"
                  style={
                    {
                      left: 0,
                      top: bubble.originY,
                      width: bubble.size,
                      height: bubble.size,
                      background: `radial-gradient(circle at 36% 34%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 38%, ${bubble.colors.main}78 68%, ${bubble.colors.deep}d8 92%, ${bubble.colors.rim}f0 100%)`,
                      border: '1px solid rgba(255,255,255,0.92)',
                      boxShadow: `0 0 ${bubble.isHero ? 18 : 12}px ${bubble.colors.glow}, inset 2px 2px 5px rgba(255,255,255,0.88), inset -2px -3px 6px ${bubble.colors.deep}cc, inset 0 0 8px ${bubble.colors.rim}66`,
                      animationDelay: `${bubble.delayMs}ms`,
                      '--bx': bubble.dx,
                      '--by': bubble.dy,
                      '--bsway': bubble.sway,
                      '--bscale': bubble.scale,
                    } as React.CSSProperties
                  }
                >
                  {/* Iridescent prism arc shimmer inside the sphere */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full opacity-55"
                    style={{
                      background: `conic-gradient(from 40deg, ${bubble.colors.rim}88, transparent 28%, ${bubble.colors.light}99 54%, transparent 78%, ${bubble.colors.main}88)`,
                      maskImage: 'radial-gradient(circle, transparent 46%, black 76%)',
                      WebkitMaskImage: 'radial-gradient(circle, transparent 46%, black 76%)',
                    }}
                  />
                  {/* Primary glossy top-left specular crescent */}
                  <span
                    aria-hidden="true"
                    className="absolute rounded-full bg-white/95"
                    style={{
                      top: '13%',
                      left: '16%',
                      width: '38%',
                      height: '23%',
                      transform: 'rotate(-28deg)',
                    }}
                  />
                  {/* Secondary bottom-right bounce highlight */}
                  {bubble.size >= 11 && (
                    <span
                      aria-hidden="true"
                      className="absolute rounded-full bg-white/85"
                      style={{
                        bottom: '15%',
                        right: '17%',
                        width: '17%',
                        height: '13%',
                        transform: 'rotate(-20deg)',
                      }}
                    />
                  )}
                </div>
              ))}

              {/* Secondary bubble-pop splash rings */}
              {splashRings.map((ring) => (
                <div
                  key={ring.key}
                  data-testid="bubble-splash-ring"
                  className="absolute rounded-full animate-pop-ring"
                  style={
                    {
                      left: 0,
                      top: ring.originY,
                      width: ring.size,
                      height: ring.size,
                      border: `2px solid ${ring.color}`,
                      boxShadow: `0 0 14px ${ring.glow}`,
                      animationDelay: `${ring.delayMs}ms`,
                      '--bx': ring.dx,
                      '--by': ring.dy,
                    } as React.CSSProperties
                  }
                />
              ))}

              {/* Luminous 4-point star sparkles */}
              {sparkles.map((sp) => (
                <div
                  key={sp.key}
                  className="absolute animate-sparkle-fly"
                  style={
                    {
                      left: 0,
                      top: 0,
                      width: sp.starSize,
                      height: sp.starSize,
                      backgroundColor: sp.color,
                      clipPath:
                        'polygon(50% 0%, 63% 37%, 100% 50%, 63% 63%, 50% 100%, 37% 63%, 0% 50%, 37% 37%)',
                      boxShadow: `0 0 14px ${sp.color}`,
                      '--sx': sp.sx,
                      '--sy': sp.sy,
                      '--srot': sp.srot,
                    } as React.CSSProperties
                  }
                />
              ))}

              {/* Floating score, combo & special bonus/trap pop-up */}
              {(typeof b.points === 'number' || specialBadge) && (
                <div
                  data-testid="match-score-pop"
                  className="absolute left-0 top-0 whitespace-nowrap animate-float-score flex items-center gap-1.5 font-display font-extrabold tracking-tight"
                  style={{
                    top: -b.tileH * 0.38,
                    textShadow: '0 2px 10px rgba(0,0,0,0.88), 0 0 16px rgba(251,191,36,0.65)',
                  }}
                >
                  {typeof b.points === 'number' && (
                    <span className="text-base sm:text-lg text-white font-mono-num">
                      +{b.points}
                    </span>
                  )}
                  {b.comboCount && b.comboCount >= 2 && (
                    <span className="text-xs sm:text-sm text-amber-300 font-extrabold">
                      x{Math.min(5, b.comboCount)}!
                    </span>
                  )}
                  {specialBadge && (
                    <span
                      className="text-xs sm:text-sm font-mono-num font-black"
                      style={{ color: specialBadge.color }}
                    >
                      {specialBadge.text}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </>
    );
  }
);

MatchBurstLayer.displayName = 'MatchBurstLayer';
