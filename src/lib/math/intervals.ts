import { type Interval, normalizeUnion } from "./check";
import { fmt } from "./tex";

export type { Interval };

export const R: Interval[] = [{ lo: -Infinity, hi: Infinity, loClosed: false, hiClosed: false }];

export function iv(lo: number, hi: number, loClosed = false, hiClosed = false): Interval {
  return { lo, hi, loClosed, hiClosed };
}

/** Un solo punto {a} como intervalo degenerado. */
export function pt(a: number): Interval {
  return { lo: a, hi: a, loClosed: true, hiClosed: true };
}

export function contains(set: Interval[], x: number): boolean {
  return set.some(
    (I) =>
      (x > I.lo || (x === I.lo && I.loClosed)) && (x < I.hi || (x === I.hi && I.hiClosed)),
  );
}

export function union(...sets: Interval[][]): Interval[] {
  return normalizeUnion(sets.flat());
}

export function intersect(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const I of normalizeUnion(a)) {
    for (const J of normalizeUnion(b)) {
      let lo: number, loClosed: boolean, hi: number, hiClosed: boolean;
      if (I.lo > J.lo) [lo, loClosed] = [I.lo, I.loClosed];
      else if (J.lo > I.lo) [lo, loClosed] = [J.lo, J.loClosed];
      else [lo, loClosed] = [I.lo, I.loClosed && J.loClosed];
      if (I.hi < J.hi) [hi, hiClosed] = [I.hi, I.hiClosed];
      else if (J.hi < I.hi) [hi, hiClosed] = [J.hi, J.hiClosed];
      else [hi, hiClosed] = [I.hi, I.hiClosed && J.hiClosed];
      if (lo < hi || (lo === hi && loClosed && hiClosed)) out.push({ lo, hi, loClosed, hiClosed });
    }
  }
  return normalizeUnion(out);
}

export function complement(a: Interval[]): Interval[] {
  const A = normalizeUnion(a);
  const out: Interval[] = [];
  let lo = -Infinity;
  let loClosed = false;
  for (const I of A) {
    out.push({ lo, hi: I.lo, loClosed, hiClosed: !I.loClosed });
    lo = I.hi;
    loClosed = !I.hiClosed;
  }
  if (lo < Infinity) out.push({ lo, hi: Infinity, loClosed, hiClosed: false });
  return normalizeUnion(out.filter((I) => I.lo < I.hi || (I.lo === I.hi && I.loClosed && I.hiClosed)));
}

export function difference(a: Interval[], b: Interval[]): Interval[] {
  return intersect(a, complement(b));
}

/** Quita puntos sueltos de un conjunto: R - {1, 3} = minus(R, [1, 3]) */
export function minusPoints(a: Interval[], points: number[]): Interval[] {
  return difference(a, points.map(pt));
}

/** Escribe una unión de intervalos en LaTeX. */
export function unionTex(a: Interval[]): string {
  const A = normalizeUnion(a);
  if (!A.length) return "\\varnothing";
  return A.map((I) => {
    if (I.lo === I.hi) return `\\{${fmt(I.lo)}\\}`;
    const l = Number.isFinite(I.lo) ? fmt(I.lo) : "-\\infty";
    const h = Number.isFinite(I.hi) ? fmt(I.hi) : "+\\infty";
    return `${I.loClosed ? "[" : "("}${l}, ${h}${I.hiClosed ? "]" : ")"}`;
  }).join(" \\cup ");
}

export type IneqOp = "<" | "<=" | ">" | ">=";

export interface SignFactor {
  /** Raíz del factor lineal (x - root). */
  root: number;
  /** Multiplicidad. Las pares no cambian el signo. */
  mult?: number;
  /** Factor del denominador: su raíz nunca entra en la solución. */
  den?: boolean;
}

/**
 * Resuelve  lead * Π (x - r_i)^{m_i} / Π (x - s_j)^{n_j}  op  0  por tabla de signos.
 * lead es el signo (o valor) del coeficiente principal.
 */
export function signSolve(factors: SignFactor[], lead: number, op: IneqOp): Interval[] {
  const roots = [...new Set(factors.map((f) => f.root))].sort((a, b) => a - b);
  const signAt = (x: number) => {
    let s = Math.sign(lead);
    for (const f of factors) {
      const v = Math.pow(x - f.root, f.mult ?? 1);
      s *= Math.sign(v);
    }
    return s;
  };
  const wantPos = op === ">" || op === ">=";
  const inclusive = op === "<=" || op === ">=";
  const denRoots = new Set(factors.filter((f) => f.den).map((f) => f.root));
  const numRoots = new Set(factors.filter((f) => !f.den).map((f) => f.root));
  const out: Interval[] = [];
  const cuts = [-Infinity, ...roots, Infinity];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i];
    const b = cuts[i + 1];
    const mid = !Number.isFinite(a) ? b - 1 : !Number.isFinite(b) ? a + 1 : (a + b) / 2;
    const s = signAt(mid);
    if ((wantPos && s > 0) || (!wantPos && s < 0)) out.push({ lo: a, hi: b, loClosed: false, hiClosed: false });
  }
  if (inclusive) {
    for (const r of numRoots) if (!denRoots.has(r)) out.push(pt(r));
  }
  return normalizeUnion(out);
}

/** Enteros dentro de una unión de intervalos acotada. */
export function integersIn(a: Interval[], limit = 60): number[] {
  const out: number[] = [];
  for (const I of normalizeUnion(a)) {
    const lo = Number.isFinite(I.lo) ? Math.ceil(I.lo) : -limit;
    const hi = Number.isFinite(I.hi) ? Math.floor(I.hi) : limit;
    for (let k = lo; k <= hi; k++) if (contains([I], k)) out.push(k);
  }
  return out;
}
