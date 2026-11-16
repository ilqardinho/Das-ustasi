export type AmbientParticleKind = 'orb' | 'diamond' | 'speck' | 'domino';

export interface AmbientParticle {
  x: number; // Normalized 0..1 across viewport width
  y: number; // Normalized 0..1 across viewport height
  vx: number; // Normalized units / sec
  vy: number; // Normalized units / sec
  depth: number; // 0.2 (far) .. 1.0 (near)
  radius: number; // Base CSS pixel radius
  alpha: number; // 0.05 .. 0.34
  phase: number; // Radians for gentle breathing & sway
  swayAmp: number; // Gentle horizontal oscillation speed
  rotation: number;
  vRot: number;
  color: string;
  kind: AmbientParticleKind;
}

export function getAmbientPalette(tableId: string): readonly string[] {
  switch (tableId) {
    case 'table_walnut':
      return ['#FBBF24', '#FDE68A', '#FDBA74', '#FEF3C7'];
    case 'table_indigo':
      return ['#7DD3FC', '#93C5FD', '#FDE68A', '#C4B5FD'];
    case 'table_terracotta':
      return ['#FBBF24', '#FDBA74', '#FED7AA', '#FFE4E6'];
    case 'table_emerald':
    default:
      return ['#FBBF24', '#6EE7B7', '#FEF3C7', '#34D399'];
  }
}

function seededUnit(seed: number, idx: number): number {
  const x = Math.sin(seed * 19.371 + idx * 91.173) * 43758.5453;
  return x - Math.floor(x);
}

export function createAmbientParticles(params: {
  count?: number;
  tableId?: string;
  seed?: number;
}): AmbientParticle[] {
  const { count = 42, tableId = 'table_emerald', seed = 2026 } = params;
  const palette = getAmbientPalette(tableId);
  const particles: AmbientParticle[] = [];

  for (let i = 0; i < count; i++) {
    const r1 = seededUnit(seed, i * 9 + 1);
    const r2 = seededUnit(seed, i * 9 + 2);
    const r3 = seededUnit(seed, i * 9 + 3);
    const r4 = seededUnit(seed, i * 9 + 4);
    const r5 = seededUnit(seed, i * 9 + 5);
    const r6 = seededUnit(seed, i * 9 + 6);

    const depth = 0.2 + r3 * 0.8;
    const kind: AmbientParticleKind =
      i % 9 === 0
        ? 'domino'
        : i % 4 === 0
        ? 'orb'
        : i % 2 === 0
        ? 'diamond'
        : 'speck';

    const radius =
      kind === 'orb'
        ? 14 + depth * 22
        : kind === 'domino'
        ? 6 + depth * 5
        : kind === 'diamond'
        ? 2.2 + depth * 2.6
        : 1.4 + depth * 1.8;

    const alpha =
      kind === 'orb'
        ? 0.04 + depth * 0.055
        : kind === 'domino'
        ? 0.065 + depth * 0.06
        : 0.12 + depth * 0.2;

    particles.push({
      x: r1,
      y: r2,
      vx: (r4 - 0.5) * 0.006 * depth,
      vy: -(0.0045 + r5 * 0.011) * depth,
      depth,
      radius,
      alpha,
      phase: r6 * Math.PI * 2,
      swayAmp: 0.002 + r4 * 0.004,
      rotation: r5 * Math.PI * 2,
      vRot: (r6 - 0.5) * 0.22,
      color: palette[i % palette.length],
      kind,
    });
  }

  return particles;
}

export function stepAmbientParticles(
  particles: readonly AmbientParticle[],
  dtSec: number,
  elapsedSec: number
): AmbientParticle[] {
  const dt = Math.max(0.001, Math.min(0.08, dtSec));
  return particles.map((p) => {
    const sway = Math.sin(elapsedSec * 0.55 + p.phase) * p.swayAmp;
    let x = p.x + (p.vx + sway) * dt;
    let y = p.y + p.vy * dt;

    if (y < -0.06) y = 1.06;
    if (y > 1.08) y = -0.04;
    if (x < -0.05) x = 1.05;
    if (x > 1.05) x = -0.05;

    return {
      ...p,
      x,
      y,
      rotation: p.rotation + p.vRot * dt,
    };
  });
}
