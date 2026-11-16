import React, { useEffect, useRef } from 'react';
import {
  createExplosionParticles,
  ExplosionParticle,
  stepExplosionParticles,
} from '../game/particles';
import { getPipBubbleColors } from './DominoTileView';
import { BurstItem } from './MatchBurstLayer';

interface MatchParticleCanvasProps {
  bursts: readonly BurstItem[];
  width: number;
  height: number;
  tileTheme: string;
  effectColor: string;
}

export const MatchParticleCanvas: React.FC<MatchParticleCanvasProps> = React.memo(
  ({ bursts, width, height, tileTheme, effectColor }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<ExplosionParticle[]>([]);
    const seenIdsRef = useRef<Set<string>>(new Set());
    const rafIdRef = useRef<number | null>(null);
    const lastFrameRef = useRef<number>(0);

    const drawParticles = (ctx: CanvasRenderingContext2D, dpr: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      for (const p of particlesRef.current) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.shape === 'spark' ? 10 : 6;

        if (p.shape === 'spark') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'shard') {
          const w = p.size;
          const h = p.size * 0.62;
          ctx.fillRect(-w / 2, -h / 2, w, h);
        } else {
          // 4-point star diamond
          const rOuter = p.size * 0.72;
          const rInner = p.size * 0.24;
          ctx.beginPath();
          for (let k = 0; k < 8; k++) {
            const rad = k % 2 === 0 ? rOuter : rInner;
            const ang = (k * Math.PI) / 4;
            const px = Math.cos(ang) * rad;
            const py = Math.sin(ang) * rad;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    };

    const startLoop = () => {
      if (rafIdRef.current !== null) return;
      lastFrameRef.current = performance.now();

      const tick = (now: number) => {
        const dtSec = (now - lastFrameRef.current) / 1000;
        lastFrameRef.current = now;
        particlesRef.current = stepExplosionParticles(particlesRef.current, dtSec);

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          drawParticles(ctx, dpr);
        }

        if (particlesRef.current.length > 0) {
          rafIdRef.current = window.requestAnimationFrame(tick);
        } else {
          rafIdRef.current = null;
        }
      };

      rafIdRef.current = window.requestAnimationFrame(tick);
    };

    useEffect(() => {
      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) return;

      let spawned = false;
      for (const b of bursts) {
        if (seenIdsRef.current.has(b.id)) continue;
        seenIdsRef.current.add(b.id);

        const topColors = getPipBubbleColors(b.topPip, tileTheme);
        const bottomColors = getPipBubbleColors(b.bottomPip, tileTheme);
        const specialAccent =
          b.special === 'bonus_time'
            ? '#34D399'
            : b.special === 'bonus_coin'
            ? '#FBBF24'
            : b.special === 'bonus_chain'
            ? '#38BDF8'
            : b.special === 'trap_time'
            ? '#FB7185'
            : b.special === 'trap_mix'
            ? '#C084FC'
            : null;

        const palette = [
          topColors.main,
          topColors.light,
          bottomColors.main,
          effectColor,
          '#FFFFFF',
          ...(specialAccent ? [specialAccent] : []),
        ];

        const batch = createExplosionParticles({
          left: b.left,
          top: b.top,
          tileW: b.tileW,
          tileH: b.tileH,
          colors: palette,
          seed: b.seed,
          isMassExplosion: b.isMassExplosion,
          comboCount: b.comboCount,
        });
        particlesRef.current = [...particlesRef.current, ...batch];
        spawned = true;
      }

      if (seenIdsRef.current.size > 120) {
        const activeIds = new Set(bursts.map((b) => b.id));
        seenIdsRef.current = activeIds;
      }

      if (spawned && particlesRef.current.length > 0) {
        startLoop();
      }
    });

    useEffect(() => {
      return () => {
        if (rafIdRef.current !== null) {
          window.cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      };
    }, []);

    const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;

    return (
      <canvas
        ref={canvasRef}
        data-testid="match-particle-canvas"
        aria-hidden="true"
        width={Math.max(1, Math.round(width * dpr))}
        height={Math.max(1, Math.round(height * dpr))}
        style={{ width, height }}
        className="pointer-events-none absolute inset-0 z-[1250]"
      />
    );
  }
);

MatchParticleCanvas.displayName = 'MatchParticleCanvas';
