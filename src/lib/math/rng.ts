// Generador pseudoaleatorio con semilla y utilidades para armar ejercicios.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  /** Real en [0, 1). */
  next(): number;
  /** Entero en [a, b], ambos incluidos. */
  int(a: number, b: number): number;
  /** Entero en [a, b] distinto de cero (y de los valores en `not`). */
  nz(a: number, b: number, not?: number[]): number;
  pick<T>(xs: readonly T[]): T;
  shuffle<T>(xs: readonly T[]): T[];
  /** +1 o -1. */
  sign(): 1 | -1;
  bool(p?: number): boolean;
  /** Toma k elementos distintos. */
  sample<T>(xs: readonly T[], k: number): T[];
}

export function makeRng(seed: number): Rng {
  const r = mulberry32(seed);
  const rng: Rng = {
    next: r,
    int: (a, b) => a + Math.floor(r() * (b - a + 1)),
    nz: (a, b, not = []) => {
      for (let i = 0; i < 200; i++) {
        const v = a + Math.floor(r() * (b - a + 1));
        if (v !== 0 && !not.includes(v)) return v;
      }
      return a !== 0 ? a : b;
    },
    pick: (xs) => xs[Math.floor(r() * xs.length)],
    shuffle: (xs) => {
      const out = [...xs];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    sign: () => (r() < 0.5 ? -1 : 1),
    bool: (p = 0.5) => r() < p,
    sample: (xs, k) => rng.shuffle(xs).slice(0, k),
  };
  return rng;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
