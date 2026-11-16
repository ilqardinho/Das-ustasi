import React from 'react';
import { Clock, Coins, Flame, Shuffle, Zap } from 'lucide-react';
import { BoardTile, DominoPip, TileSpecialType } from '../game/types';

export const TILE_EXTRUSION_X_RATIO = 0.24;
export const TILE_EXTRUSION_Y_RATIO = 0.88;

export function getTileDepth(width: number): number {
  return Math.max(3, Math.round(width * 0.068));
}

export interface TileMaterialColors {
  faceBg: string;
  faceSheen: string;
  sideUpper: string;
  sideMid: string;
  sideLower: string;
  border: string;
  innerTopHighlight: string;
  innerSideHighlight: string;
  innerBottomShade: string;
  innerRightShade: string;
  dividerDark: string;
  dividerLight: string;
  rivetBg: string;
  numColor: string;
  isDarkFace: boolean;
}

export function getTileMaterialColors(tileTheme: string): TileMaterialColors {
  switch (tileTheme) {
    case 'tile_obsidian':
      return {
        faceBg: 'linear-gradient(155deg, #323c4e 0%, #1d2432 50%, #111620 100%)',
        faceSheen:
          'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.03) 38%, rgba(0,0,0,0) 65%)',
        sideUpper: '#2b3446',
        sideMid: '#181f2c',
        sideLower: '#090d14',
        border: '#475569',
        innerTopHighlight: 'rgba(255, 255, 255, 0.24)',
        innerSideHighlight: 'rgba(255, 255, 255, 0.12)',
        innerBottomShade: 'rgba(0, 0, 0, 0.45)',
        innerRightShade: 'rgba(0, 0, 0, 0.35)',
        dividerDark: 'rgba(251, 191, 36, 0.42)',
        dividerLight: 'rgba(255, 255, 255, 0.1)',
        rivetBg: 'radial-gradient(circle at 32% 32%, #fef3c7, #f59e0b 65%, #78350f)',
        numColor: 'rgba(248, 250, 252, 0.6)',
        isDarkFace: true,
      };
    case 'tile_amber':
      return {
        faceBg: 'linear-gradient(155deg, #fffef6 0%, #fef0b8 48%, #fcd34d 100%)',
        faceSheen:
          'linear-gradient(135deg, rgba(255,255,255,0.68) 0%, rgba(255,255,255,0.12) 42%, rgba(0,0,0,0) 68%)',
        sideUpper: '#eab308',
        sideMid: '#b45309',
        sideLower: '#7c2d12',
        border: '#fbbf24',
        innerTopHighlight: 'rgba(255, 255, 255, 0.9)',
        innerSideHighlight: 'rgba(255, 255, 255, 0.55)',
        innerBottomShade: 'rgba(146, 64, 14, 0.28)',
        innerRightShade: 'rgba(146, 64, 14, 0.22)',
        dividerDark: 'rgba(120, 53, 15, 0.38)',
        dividerLight: 'rgba(255, 251, 235, 0.72)',
        rivetBg: 'radial-gradient(circle at 32% 32%, #fef3c7, #d97706 65%, #451a03)',
        numColor: 'rgba(120, 53, 15, 0.7)',
        isDarkFace: false,
      };
    case 'tile_jade':
      return {
        faceBg: 'linear-gradient(155deg, #f4fffb 0%, #c6f9e3 48%, #7be8ba 100%)',
        faceSheen:
          'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.15) 42%, rgba(0,0,0,0) 68%)',
        sideUpper: '#10b981',
        sideMid: '#059669',
        sideLower: '#064e3b',
        border: '#6ee7b7',
        innerTopHighlight: 'rgba(255, 255, 255, 0.9)',
        innerSideHighlight: 'rgba(255, 255, 255, 0.55)',
        innerBottomShade: 'rgba(6, 78, 59, 0.24)',
        innerRightShade: 'rgba(6, 78, 59, 0.18)',
        dividerDark: 'rgba(6, 78, 59, 0.34)',
        dividerLight: 'rgba(236, 253, 245, 0.78)',
        rivetBg: 'radial-gradient(circle at 32% 32%, #ecfdf5, #059669 65%, #022c22)',
        numColor: 'rgba(6, 78, 59, 0.68)',
        isDarkFace: false,
      };
    case 'tile_ivory':
    default:
      return {
        faceBg: 'linear-gradient(155deg, #ffffff 0%, #fcf8ee 46%, #efe4cc 88%, #e4d4b4 100%)',
        faceSheen:
          'linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.14) 42%, rgba(0,0,0,0) 68%)',
        sideUpper: '#dfd2b8',
        sideMid: '#bfa984',
        sideLower: '#8c7450',
        border: '#ede2cc',
        innerTopHighlight: 'rgba(255, 255, 255, 0.95)',
        innerSideHighlight: 'rgba(255, 255, 255, 0.65)',
        innerBottomShade: 'rgba(120, 96, 60, 0.24)',
        innerRightShade: 'rgba(120, 96, 60, 0.18)',
        dividerDark: 'rgba(68, 55, 38, 0.34)',
        dividerLight: 'rgba(255, 255, 255, 0.82)',
        rivetBg: 'radial-gradient(circle at 32% 32%, #fef3c7, #d97706 65%, #78350f)',
        numColor: 'rgba(28, 25, 23, 0.58)',
        isDarkFace: false,
      };
  }
}

/**
 * Generates a continuous, gap-free stepped 3D slab extrusion plus
 * contact ambient occlusion and directional cast shadow.
 */
export function build3DTileBoxShadow(params: {
  colors: TileMaterialColors;
  depth: number;
  zLevel?: number;
  lift?: number;
  ringColor?: string | null;
  ringWidth?: number;
}): string {
  const { colors, depth, zLevel = 0, lift = 0, ringColor = null, ringWidth = 2.5 } = params;
  const shadows: string[] = [
    `inset 0 1.5px 0 ${colors.innerTopHighlight}`,
    `inset 1px 0 0 ${colors.innerSideHighlight}`,
    `inset 0 -2px 2px ${colors.innerBottomShade}`,
    `inset -1.5px 0 2px ${colors.innerRightShade}`,
  ];

  if (ringColor) {
    shadows.push(`0 0 0 ${ringWidth}px ${ringColor}`);
  }

  const upperBreak = Math.max(1, Math.round(depth * 0.35));
  const midBreak = Math.max(upperBreak + 1, Math.round(depth * 0.78));

  for (let i = 1; i <= depth; i++) {
    const dx = (i * TILE_EXTRUSION_X_RATIO).toFixed(2);
    const dy = i;
    const stepColor =
      i <= upperBreak ? colors.sideUpper : i <= midBreak ? colors.sideMid : colors.sideLower;
    shadows.push(`${dx}px ${dy}px 0 ${stepColor}`);
  }

  // Subtle contact occlusion hugging the base of the slim 3D tile
  const baseDx = (depth * TILE_EXTRUSION_X_RATIO).toFixed(1);
  shadows.push(
    `${baseDx}px ${depth + 1}px ${2 + Math.round(lift * 0.2)}px rgba(0, 0, 0, ${
      lift > 8 ? 0.26 : 0.46
    })`
  );

  // Soft directional table cast shadow
  const castDx = (depth * 0.4 + lift * 0.32).toFixed(1);
  const castDy = depth + 3 + lift;
  const castBlur = Math.round(7 + lift * 1.15 + zLevel * 2.5);
  const castAlpha = Math.min(0.6, 0.28 + zLevel * 0.055 + (lift > 8 ? 0.14 : 0)).toFixed(2);
  shadows.push(`${castDx}px ${castDy}px ${castBlur}px rgba(0, 0, 0, ${castAlpha})`);

  // Soft ambient floor shadow
  shadows.push(
    `0 ${depth + 2 + Math.round(lift * 0.4)}px ${Math.round(10 + lift * 1.2)}px rgba(0, 0, 0, 0.18)`
  );

  return shadows.join(', ');
}

interface DominoTileViewProps {
  tile: BoardTile;
  width: number;
  height: number;
  originShiftX?: number;
  originShiftY?: number;
  isFree: boolean;
  isCovered?: boolean;
  isSelected: boolean;
  isHinted: boolean;
  isShaking: boolean;
  isDragging?: boolean;
  dragOffset?: { dx: number; dy: number };
  dragTiltDeg?: number;
  dropTargetState?: 'match' | 'mismatch' | null;
  tileTheme: string;
  showNumbersAid: boolean;
  highlightFreeTiles: boolean;
  onSelect: (tile: BoardTile) => void;
  onPointerStart?: (tile: BoardTile, e: React.PointerEvent<HTMLButtonElement>) => void;
}

const PIP_POSITIONS: Record<DominoPip, number[]> = {
  0: [],
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function getPipColor(pip: DominoPip, tileTheme: string): { main: string; deep: string } {
  if (tileTheme === 'tile_obsidian') {
    const darkPalette: Record<DominoPip, { main: string; deep: string }> = {
      0: { main: 'transparent', deep: 'transparent' },
      1: { main: '#FB7185', deep: '#BE123C' },
      2: { main: '#34D399', deep: '#047857' },
      3: { main: '#60A5FA', deep: '#1D4ED8' },
      4: { main: '#FBBF24', deep: '#B45309' },
      5: { main: '#C084FC', deep: '#7E22CE' },
      6: { main: '#F8FAFC', deep: '#94A3B8' },
    };
    return darkPalette[pip];
  }
  const lightPalette: Record<DominoPip, { main: string; deep: string }> = {
    0: { main: 'transparent', deep: 'transparent' },
    1: { main: '#DC2626', deep: '#7F1D1D' },
    2: { main: '#059669', deep: '#064E3B' },
    3: { main: '#2563EB', deep: '#1E3A8A' },
    4: { main: '#D97706', deep: '#78350F' },
    5: { main: '#7C3AED', deep: '#4C1D95' },
    6: { main: '#1F2937', deep: '#030712' },
  };
  return lightPalette[pip];
}

export function getPipBubbleColors(
  pip: DominoPip,
  _tileTheme: string
): { light: string; main: string; deep: string; glow: string; rim: string } {
  const candyPalette: Record<
    DominoPip,
    { light: string; main: string; deep: string; glow: string; rim: string }
  > = {
    0: {
      light: '#FEF9C3',
      main: '#FDE047',
      deep: '#F59E0B',
      glow: 'rgba(253, 224, 71, 0.92)',
      rim: '#67E8F9',
    },
    1: {
      light: '#FFE4E6',
      main: '#FF477E',
      deep: '#E11D48',
      glow: 'rgba(255, 71, 126, 0.95)',
      rim: '#FDE047',
    },
    2: {
      light: '#D1FAE5',
      main: '#2EE59D',
      deep: '#059669',
      glow: 'rgba(46, 229, 157, 0.95)',
      rim: '#67E8F9',
    },
    3: {
      light: '#E0F2FE',
      main: '#38BDF8',
      deep: '#2563EB',
      glow: 'rgba(56, 189, 248, 0.95)',
      rim: '#F0ABFC',
    },
    4: {
      light: '#FEF3C7',
      main: '#FBBF24',
      deep: '#EA580C',
      glow: 'rgba(251, 191, 36, 0.95)',
      rim: '#FDA4AF',
    },
    5: {
      light: '#FAE8FF',
      main: '#E879F9',
      deep: '#9333EA',
      glow: 'rgba(232, 121, 249, 0.95)',
      rim: '#67E8F9',
    },
    6: {
      light: '#ECFEFF',
      main: '#67E8F9',
      deep: '#4F46E5',
      glow: 'rgba(103, 232, 249, 0.95)',
      rim: '#FDE047',
    },
  };
  return candyPalette[pip];
}

function getSpecialVisuals(special?: TileSpecialType): {
  ringColor: string;
  cornerBg: string;
  cornerBorder: string;
  cornerText: string;
  tintOverlay: string;
  label: string;
} | null {
  switch (special) {
    case 'bonus_time':
      return {
        ringColor: '#10B981',
        cornerBg: '#065F46',
        cornerBorder: '#6EE7B7',
        cornerText: '#ECFDF5',
        tintOverlay: 'radial-gradient(circle at 86% 14%, rgba(16,185,129,0.22), transparent 55%)',
        label: '+12s',
      };
    case 'bonus_coin':
      return {
        ringColor: '#F59E0B',
        cornerBg: '#92400E',
        cornerBorder: '#FDE68A',
        cornerText: '#FEF3C7',
        tintOverlay: 'radial-gradient(circle at 86% 14%, rgba(251,191,36,0.26), transparent 55%)',
        label: '+25',
      };
    case 'bonus_chain':
      return {
        ringColor: '#06B6D4',
        cornerBg: '#155E75',
        cornerBorder: '#67E8F9',
        cornerText: '#ECFEFF',
        tintOverlay: 'radial-gradient(circle at 86% 14%, rgba(34,211,238,0.24), transparent 55%)',
        label: 'x2',
      };
    case 'trap_time':
      return {
        ringColor: '#F43F5E',
        cornerBg: '#881337',
        cornerBorder: '#FDA4AF',
        cornerText: '#FFE4E6',
        tintOverlay: 'radial-gradient(circle at 86% 14%, rgba(244,63,94,0.24), transparent 55%)',
        label: '-7s',
      };
    case 'trap_mix':
      return {
        ringColor: '#A855F7',
        cornerBg: '#581C87',
        cornerBorder: '#E9D5FF',
        cornerText: '#FAF5FF',
        tintOverlay: 'radial-gradient(circle at 86% 14%, rgba(168,85,247,0.24), transparent 55%)',
        label: '!',
      };
    default:
      return null;
  }
}

function PipHalf({
  value,
  tileTheme,
  pipSize,
  dimmed,
}: {
  value: DominoPip;
  tileTheme: string;
  pipSize: number;
  dimmed: boolean;
}) {
  const activeIndices = PIP_POSITIONS[value];
  const { main, deep } = getPipColor(value, tileTheme);
  const isDark = tileTheme === 'tile_obsidian';

  return (
    <div
      className={`grid grid-cols-3 grid-rows-3 place-items-center w-full h-full p-[12%] ${
        dimmed ? 'opacity-65' : 'opacity-100'
      }`}
    >
      {Array.from({ length: 9 }).map((_, idx) => {
        const active = activeIndices.includes(idx);
        return (
          <span
            key={idx}
            className="rounded-full block"
            style={{
              width: pipSize,
              height: pipSize,
              background: active
                ? `radial-gradient(circle at 62% 66%, ${main} 45%, ${deep} 100%)`
                : 'transparent',
              boxShadow: active
                ? isDark
                  ? 'inset 0 1.5px 2px rgba(0,0,0,0.72), 0 1px 0 rgba(255,255,255,0.18)'
                  : 'inset 0 1.5px 2px rgba(0,0,0,0.52), 0 1px 0 rgba(255,255,255,0.82)'
                : 'none',
            }}
          />
        );
      })}
    </div>
  );
}

export const DominoTileView: React.FC<DominoTileViewProps> = React.memo(
  ({
    tile,
    width,
    height,
    originShiftX = 0,
    originShiftY = 0,
    isFree,
    isCovered = false,
    isSelected,
    isHinted,
    isShaking,
    isDragging = false,
    dragOffset,
    dragTiltDeg = 0,
    dropTargetState = null,
    tileTheme,
    showNumbersAid,
    highlightFreeTiles,
    onSelect,
    onPointerStart,
  }) => {
    const colors = getTileMaterialColors(tileTheme);
    const pipSize = Math.max(4, Math.round(width * 0.145));
    const depth = getTileDepth(width);
    const rivetSize = Math.max(3, Math.round(width * 0.085));

    // Align z-elevation inversely to the 3D extrusion vector so stacked tiles sit flush
    const left = originShiftX + tile.x * (width / 2) - tile.z * (depth * TILE_EXTRUSION_X_RATIO);
    const top = originShiftY + tile.y * (height / 2) - tile.z * (depth * TILE_EXTRUSION_Y_RATIO);

    const dimmed = isCovered || (!isFree && highlightFreeTiles);

    let computedTransform: string | undefined;
    if (isDragging && dragOffset) {
      computedTransform = `translate3d(${dragOffset.dx}px, ${dragOffset.dy - 6}px, 0) scale(1.12) rotate(${dragTiltDeg.toFixed(
        1
      )}deg)`;
    } else if (dropTargetState === 'match') {
      computedTransform = 'translateY(-5px) scale(1.07)';
    } else if (isSelected) {
      computedTransform = 'translateY(-7px) scale(1.045)';
    }

    const specialVisuals = getSpecialVisuals(tile.special);

    const ringColor =
      dropTargetState === 'match'
        ? '#34d399'
        : dropTargetState === 'mismatch'
        ? '#fb7185'
        : isDragging || isSelected
        ? '#fbbf24'
        : isHinted
        ? '#34d399'
        : specialVisuals
        ? specialVisuals.ringColor
        : null;

    const lift = isDragging ? 15 : isSelected || dropTargetState === 'match' ? 7 : 0;

    const computedBoxShadow = build3DTileBoxShadow({
      colors,
      depth,
      zLevel: tile.z,
      lift,
      ringColor,
      ringWidth: isDragging || dropTargetState === 'match' ? 2.8 : specialVisuals ? 2 : 2.2,
    });

    const borderColor = ringColor ?? colors.border;

    return (
      <button
        type="button"
        onClick={() => onSelect(tile)}
        onPointerDown={(e) => onPointerStart?.(tile, e)}
        data-tile-id={tile.id}
        data-free={isFree ? 'true' : 'false'}
        data-dragging={isDragging ? 'true' : 'false'}
        data-special={tile.special ?? 'none'}
        data-value={`${tile.top}-${tile.bottom}`}
        aria-label={`Domino ${tile.top}-${tile.bottom}${
          tile.special ? ` (${tile.special})` : ''
        }${isSelected ? ' (selected)' : ''}${isFree ? '' : ' (blocked)'}`}
        aria-pressed={isSelected}
        className={`absolute rounded-[8px] select-none focus-visible:outline-2 focus-visible:outline-amber-400 focus-visible:outline-offset-2 ${
          isDragging ? '' : 'transition-transform duration-200 ease-out'
        } ${isSelected && !isDragging ? 'animate-tile-selected z-40' : ''} ${
          isHinted && !isDragging ? 'animate-tile-hint z-30' : ''
        } ${isShaking ? 'animate-tile-shake' : ''} ${
          isFree
            ? isDragging
              ? 'cursor-grabbing'
              : 'cursor-grab hover:-translate-y-0.5 active:translate-y-0'
            : 'cursor-not-allowed'
        }`}
        style={{
          left,
          top,
          width,
          height,
          touchAction: isFree ? 'none' : 'auto',
          zIndex: isDragging
            ? 1000
            : dropTargetState
            ? 900
            : tile.z * 100 + tile.y * 2 + (isSelected ? 50 : 0),
          transform: computedTransform,
          boxShadow: computedBoxShadow,
          background: colors.faceBg,
          border: `1px solid ${borderColor}`,
          filter: isCovered
            ? 'brightness(0.74) saturate(0.85)'
            : dimmed
            ? 'brightness(0.84) saturate(0.9)'
            : undefined,
        }}
      >
        <div className="relative flex flex-col w-full h-full overflow-hidden rounded-[7px]">
          {/* Studio top-left specular sheen (brighter on playable tiles) */}
          {!dimmed && (
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: colors.faceSheen }}
            />
          )}

          {/* Subtle corner aura tint on Bonus / Trap tiles */}
          {specialVisuals && (
            <div
              className="pointer-events-none absolute inset-0 z-[5]"
              style={{ background: specialVisuals.tintOverlay }}
            />
          )}

          {/* Deep shadow shade on underneath / blocked tiles so top tiles pop */}
          {dimmed && (
            <div
              className="pointer-events-none absolute inset-0 z-10"
              style={{
                backgroundColor: colors.isDarkFace
                  ? isCovered
                    ? 'rgba(0, 0, 0, 0.56)'
                    : 'rgba(0, 0, 0, 0.44)'
                  : isCovered
                  ? 'rgba(14, 10, 6, 0.46)'
                  : 'rgba(18, 14, 10, 0.32)',
              }}
            />
          )}

          {/* Crisp Bonus / Trap Diegetic Center Medallion (never covers any pip) */}
          {specialVisuals && tile.special && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 inline-flex items-center gap-0.5 px-1.5 py-[1.5px] rounded-[5px] font-mono-num font-extrabold leading-none shadow-md"
              style={{
                backgroundColor: specialVisuals.cornerBg,
                border: `1px solid ${specialVisuals.cornerBorder}`,
                color: specialVisuals.cornerText,
                fontSize: Math.max(8, Math.round(width * 0.14)),
              }}
            >
              {tile.special === 'bonus_time' && <Clock className="w-2.5 h-2.5 shrink-0" />}
              {tile.special === 'bonus_coin' && <Coins className="w-2.5 h-2.5 shrink-0" />}
              {tile.special === 'bonus_chain' && <Zap className="w-2.5 h-2.5 shrink-0" />}
              {tile.special === 'trap_time' && <Flame className="w-2.5 h-2.5 shrink-0" />}
              {tile.special === 'trap_mix' && <Shuffle className="w-2.5 h-2.5 shrink-0" />}
              <span>{specialVisuals.label}</span>
            </span>
          )}

          {/* Top half */}
          <div className="flex-1 w-full relative">
            <PipHalf value={tile.top} tileTheme={tileTheme} pipSize={pipSize} dimmed={dimmed} />
            {showNumbersAid && (
              <span
                className="absolute top-0.5 left-1 font-mono-num font-bold leading-none pointer-events-none"
                style={{
                  fontSize: Math.max(8, Math.round(width * 0.17)),
                  color: colors.numColor,
                }}
              >
                {tile.top}
              </span>
            )}
          </div>

          {/* Engraved center channel + tournament brass spinner rivet */}
          <div className="relative w-full flex items-center justify-center shrink-0 my-[1px]">
            <div
              className="w-[80%] h-[1.5px] rounded-full"
              style={{
                backgroundColor: colors.dividerDark,
                boxShadow: `0 1px 0 ${colors.dividerLight}`,
              }}
            />
            <span
              aria-hidden="true"
              className="absolute rounded-full pointer-events-none"
              style={{
                width: rivetSize,
                height: rivetSize,
                background: colors.rivetBg,
                boxShadow: 'inset 0 0.5px 1px rgba(255,255,255,0.6), 0 1px 1px rgba(0,0,0,0.3)',
              }}
            />
          </div>

          {/* Bottom half */}
          <div className="flex-1 w-full relative">
            <PipHalf value={tile.bottom} tileTheme={tileTheme} pipSize={pipSize} dimmed={dimmed} />
            {showNumbersAid && (
              <span
                className="absolute bottom-0.5 right-1 font-mono-num font-bold leading-none pointer-events-none"
                style={{
                  fontSize: Math.max(8, Math.round(width * 0.17)),
                  color: colors.numColor,
                }}
              >
                {tile.bottom}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  }
);

DominoTileView.displayName = 'DominoTileView';
