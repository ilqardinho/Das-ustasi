import React, { useEffect, useRef } from 'react';
import {
  AmbientParticle,
  createAmbientParticles,
  getAmbientPalette,
  stepAmbientParticles,
} from '../game/ambientParticles';

interface MenuAmbientCanvasProps {
  tableId: string;
}

export const MenuAmbientCanvas: React.FC<MenuAmbientCanvasProps> = ({ tableId }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<AmbientParticle[]>(
    createAmbientParticles({ count: 44, tableId })
  );
  const pointerTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerCurrentRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Smoothly retint existing particles when equipped table theme changes (without resetting positions)
  useEffect(() => {
    const palette = getAmbientPalette(tableId);
    particlesRef.current = particlesRef.current.map((p, idx) => ({
      ...p,
      color: palette[idx % palette.length],
    }));
  }, [tableId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const onPointerMove = (e: PointerEvent) => {
      pointerTargetRef.current = {
        x: (e.clientX / Math.max(1, width) - 0.5) * 2,
        y: (e.clientY / Math.max(1, height) - 0.5) * 2,
      };
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const drawFrame = (elapsedSec: number) => {
      ctx.clearRect(0, 0, width, height);

      const px = pointerCurrentRef.current.x;
      const py = pointerCurrentRef.current.y;

      for (const p of particlesRef.current) {
        const parallaxX = px * 11 * p.depth;
        const parallaxY = py * 9 * p.depth;
        const cx = p.x * width + parallaxX;
        const cy = p.y * height + parallaxY;
        const pulse = 0.78 + 0.22 * Math.sin(elapsedSec * 1.15 + p.phase);
        const alpha = p.alpha * pulse;

        ctx.save();
        ctx.translate(cx, cy);

        if (p.kind === 'orb') {
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius);
          grad.addColorStop(0, p.color);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.globalAlpha = alpha;
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === 'domino') {
          ctx.rotate(p.rotation);
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          const w = p.radius * 0.9;
          const h = p.radius * 1.65;
          ctx.beginPath();
          ctx.roundRect(-w / 2, -h / 2, w, h, 2.2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-w * 0.35, 0);
          ctx.lineTo(w * 0.35, 0);
          ctx.stroke();
        } else if (p.kind === 'diamond') {
          ctx.rotate(p.rotation);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          const r = p.radius;
          ctx.beginPath();
          ctx.moveTo(0, -r);
          ctx.lineTo(r * 0.72, 0);
          ctx.lineTo(0, r);
          ctx.lineTo(-r * 0.72, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    };

    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      drawFrame(0);
      return () => {
        window.removeEventListener('resize', resize);
        window.removeEventListener('pointermove', onPointerMove);
      };
    }

    let rafId = 0;
    let lastTime = performance.now();
    const startTime = lastTime;

    const tick = (now: number) => {
      if (!document.hidden) {
        const dtSec = Math.min(0.06, Math.max(0.001, (now - lastTime) / 1000));
        const elapsedSec = (now - startTime) / 1000;

        pointerCurrentRef.current.x +=
          (pointerTargetRef.current.x - pointerCurrentRef.current.x) * 0.05;
        pointerCurrentRef.current.y +=
          (pointerTargetRef.current.y - pointerCurrentRef.current.y) * 0.05;

        particlesRef.current = stepAmbientParticles(
          particlesRef.current,
          dtSec,
          elapsedSec
        );
        drawFrame(elapsedSec);
      }
      lastTime = now;
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="menu-ambient-canvas"
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
};
