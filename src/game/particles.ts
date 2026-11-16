export type ParticleShape = 'shard' | 'spark' | 'diamond';

export interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  vRot: number;
  gravity: number;
  drag: number;
  shape: ParticleShape;
}

function seededUnit(seed: number, idx: number): number {
  const x = Math.sin(seed * 12.9898 + idx * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function createExplosionParticles(params: {
  left: number;
  top: number;
  tileW: number;
  tileH: number;
  colors: readonly string[];
  seed: number;
  isMassExplosion?: boolean;
  comboCount?: number;
}): ExplosionParticle[] {
  const {
    left,
    top,
    tileW,
    tileH,
    colors,
    seed,
    isMassExplosion = false,
    comboCount = 1,
  } = params;

  const palette = colors.length > 0 ? colors : ['#FBBF24', '#38BDF8', '#34D399', '#FFFFFF'];
  const comboBonus = Math.min(14, Math.max(0, comboCount - 1) * 4);
  const count = (isMassExplosion ? 18 : 34) + comboBonus;
  const speedBase = Math.max(130, tileW * (isMassExplosion ? 3.2 : 4.2));
  const out: ExplosionParticle[] = [];

  for (let i = 0; i < count; i++) {
    const r1 = seededUnit(seed, i * 7 + 1);
    const r2 = seededUnit(seed, i * 7 + 2);
    const r3 = seededUnit(seed, i * 7 + 3);
    const r4 = seededUnit(seed, i * 7 + 4);
    const r5 = seededUnit(seed, i * 7 + 5);

    const angle = (i / count) * Math.PI * 2 + (r1 - 0.5) * 0.45;
    const speed = speedBase * (0.42 + r2 * 0.95);
    const shape: ParticleShape =
      i % 5 === 0 ? 'diamond' : i % 3 === 0 ? 'shard' : 'spark';

    const maxLife = (isMassExplosion ? 0.55 : 0.68) + r3 * 0.34;
    const size =
      shape === 'shard'
        ? Math.max(4, tileW * (0.1 + r4 * 0.08))
        : shape === 'diamond'
        ? Math.max(5, tileW * (0.11 + r4 * 0.07))
        : Math.max(2.5, tileW * (0.06 + r4 * 0.05));

    out.push({
      x: left + (r1 - 0.5) * tileW * 0.52,
      y: top + (r5 - 0.5) * tileH * 0.52,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - speedBase * 0.32,
      size,
      color: palette[i % palette.length],
      alpha: 1,
      life: 0,
      maxLife,
      rotation: r4 * Math.PI * 2,
      vRot: (r5 - 0.5) * 11,
      gravity: shape === 'spark' ? 280 : 420,
      drag: shape === 'spark' ? 0.96 : 0.975,
      shape,
    });
  }

  return out;
}

export function stepExplosionParticles(
  particles: readonly ExplosionParticle[],
  dtSec: number
): ExplosionParticle[] {
  const dt = Math.max(0.001, Math.min(0.05, dtSec));
  const dragScale = dt * 60;
  const next: ExplosionParticle[] = [];

  for (const p of particles) {
    const life = p.life + dt;
    if (life >= p.maxLife) continue;

    const damp = Math.pow(p.drag, dragScale);
    const vx = p.vx * damp;
    const vy = (p.vy + p.gravity * dt) * damp;
    const progress = life / p.maxLife;
    const alpha = Math.max(0, 1 - Math.pow(progress, 1.6));

    next.push({
      ...p,
      x: p.x + vx * dt,
      y: p.y + vy * dt,
      vx,
      vy,
      life,
      alpha,
      rotation: p.rotation + p.vRot * dt,
    });
  }

  return next;
}
