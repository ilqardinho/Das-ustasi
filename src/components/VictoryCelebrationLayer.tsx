import React from 'react';

interface CelebrationParticle {
  id: number;
  kind: 'star' | 'confetti-rect' | 'confetti-ribbon' | 'confetti-diamond';
  startXPercent: number;
  driftPx: number;
  startYOffsetVh: number;
  delayMs: number;
  durationMs: number;
  rotationDeg: number;
  scale: number;
  color: string;
}

const CELEBRATION_COLORS = [
  '#FBBF24', // gold
  '#F59E0B', // amber
  '#FEF08A', // champagne
  '#34D399', // emerald
  '#38BDF8', // sky
  '#FB7185', // rose
  '#F8FAFC', // ivory white
];

// Deterministic festive particle distribution concentrated in the center column of the screen
const PARTICLES: CelebrationParticle[] = Array.from({ length: 42 }, (_, idx) => {
  const isStar = idx % 3 === 0;
  const normalized = (idx * 37 + 13) % 100; // 0..99
  const startXPercent = 8 + (normalized * 84) / 100; // 8%..92% inside centered 560px stage
  const swayDir = idx % 2 === 0 ? 1 : -1;
  const driftPx = swayDir * (14 + ((idx * 19) % 44));
  const startYOffsetVh = -8 - ((idx * 7) % 24);
  const delayMs = (idx % 14) * 145;
  const durationMs = isStar ? 2450 + (idx % 5) * 280 : 2150 + (idx % 6) * 260;
  const rotationDeg = swayDir * (320 + ((idx * 53) % 420));
  const scale = isStar ? 0.82 + (idx % 4) * 0.16 : 0.78 + (idx % 4) * 0.14;
  const color = isStar
    ? CELEBRATION_COLORS[idx % 4]
    : CELEBRATION_COLORS[idx % CELEBRATION_COLORS.length];

  const confettiKind: CelebrationParticle['kind'] =
    idx % 3 === 1 ? 'confetti-ribbon' : idx % 4 === 2 ? 'confetti-diamond' : 'confetti-rect';

  return {
    id: idx,
    kind: isStar ? 'star' : confettiKind,
    startXPercent,
    driftPx,
    startYOffsetVh,
    delayMs,
    durationMs,
    rotationDeg,
    scale,
    color,
  };
});

export const VictoryCelebrationLayer: React.FC = () => {
  return (
    <div
      data-testid="victory-celebration"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[105] overflow-hidden flex justify-center"
    >
      {/* Subtle rotating golden sunburst rays behind Victory overlay */}
      <div
        className="animate-victory-rays absolute top-1/2 left-1/2 w-[min(640px,115vw)] h-[min(640px,115vw)] rounded-full"
        style={{
          background:
            'repeating-conic-gradient(from 0deg, rgba(251, 191, 36, 0.16) 0deg 12deg, transparent 12deg 30deg)',
          maskImage: 'radial-gradient(circle, rgba(0,0,0,0.9) 18%, transparent 68%)',
          WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,0.9) 18%, transparent 68%)',
        }}
      />

      {/* Subtle central golden celebration aura */}
      <div
        className="animate-victory-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(480px,92vw)] h-[min(480px,92vw)] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(251, 191, 36, 0.24) 0%, rgba(245, 158, 11, 0.08) 46%, rgba(0, 0, 0, 0) 74%)',
        }}
      />

      {/* Centered rain zone so stars & confetti shower directly across the middle of the screen */}
      <div className="relative h-full w-full max-w-[560px]">
        {PARTICLES.map((p) => {
          const style = {
            left: `${p.startXPercent}%`,
            top: '8%',
            '--cy-start': `${p.startYOffsetVh}vh`,
            '--cx-drift': `${p.driftPx}px`,
            '--crot': `${p.rotationDeg}deg`,
            '--cscale': `${p.scale}`,
            animationDelay: `${p.delayMs}ms`,
            animationDuration: `${p.durationMs}ms`,
          } as React.CSSProperties;

          if (p.kind === 'star') {
            return (
              <span
                key={p.id}
                data-celebration-kind="star"
                className="animate-star-rain absolute block"
                style={style}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill={p.color}
                  className="drop-shadow-[0_2px_6px_rgba(251,191,36,0.55)]"
                >
                  <path d="M12 2.2l2.92 6.08 6.7.92-4.88 4.7 1.19 6.66L12 17.35l-5.93 3.21 1.19-6.66-4.88-4.7 6.7-.92L12 2.2z" />
                </svg>
              </span>
            );
          }

          if (p.kind === 'confetti-diamond') {
            return (
              <span
                key={p.id}
                data-celebration-kind="confetti"
                className="animate-confetti-rain absolute block w-2.5 h-2.5 rotate-45 rounded-[2px]"
                style={{
                  ...style,
                  backgroundColor: p.color,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.28)',
                }}
              />
            );
          }

          if (p.kind === 'confetti-ribbon') {
            return (
              <span
                key={p.id}
                data-celebration-kind="confetti"
                className="animate-confetti-rain absolute block w-2 h-4 rounded-full"
                style={{
                  ...style,
                  backgroundColor: p.color,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.28)',
                }}
              />
            );
          }

          return (
            <span
              key={p.id}
              data-celebration-kind="confetti"
              className="animate-confetti-rain absolute block w-3 h-2 rounded-[2px]"
              style={{
                ...style,
                backgroundColor: p.color,
                boxShadow: '0 1px 4px rgba(0,0,0,0.28)',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
