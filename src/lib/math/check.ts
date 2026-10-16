import { type Ast, evaluate, parse, ParseError } from "./parse";
import { mulberry32 } from "./rng";

export interface EquivOptions {
  vars?: string[];
  /** Rango donde se toman los puntos de prueba de cada variable. */
  domain?: [number, number];
  /** Tolerancia relativa. Para respuestas redondeadas usar algo como 0.01. */
  tol?: number;
}

function close(a: number, b: number, tol: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= tol * scale;
}

/**
 * Compara dos AST evaluándolos en puntos aleatorios. Si no hay variables,
 * compara los valores numéricos directamente.
 */
export function equivalentAst(a: Ast, b: Ast, opts: EquivOptions = {}): boolean {
  const vars = opts.vars ?? [];
  const tol = opts.tol ?? 1e-6;
  if (vars.length === 0) {
    return close(evaluate(a), evaluate(b), tol);
  }
  const [lo, hi] = opts.domain ?? [-4, 4];
  const rng = mulberry32(12345);
  let valid = 0;
  let tries = 0;
  while (valid < 10 && tries < 80) {
    tries++;
    const scope: Record<string, number> = {};
    for (const v of vars) scope[v] = lo + (hi - lo) * rng();
    const x = evaluate(a, scope);
    const y = evaluate(b, scope);
    const xBad = !Number.isFinite(x);
    const yBad = !Number.isFinite(y);
    if (xBad && yBad) continue;
    if (xBad !== yBad) {
      // Uno existe y el otro no: cuenta como diferencia solo si es claro
      if (Number.isNaN(x) || Number.isNaN(y)) continue;
      return false;
    }
    if (!close(x, y, tol * 10)) return false;
    valid++;
  }
  return valid >= 4;
}

export function equivalent(a: string, b: string, opts: EquivOptions = {}): boolean {
  try {
    return equivalentAst(parse(a, { vars: opts.vars }), parse(b, { vars: opts.vars }), opts);
  } catch {
    return false;
  }
}

export function tryParse(src: string, vars?: string[]): { ast?: Ast; error?: string } {
  try {
    return { ast: parse(src, { vars }) };
  } catch (e) {
    if (e instanceof ParseError) return { error: e.message };
    return { error: "No pude leer la respuesta. Revisa que esté bien escrita." };
  }
}

/* ---------- Intervalos ---------- */

export interface Interval {
  lo: number; // -Infinity permitido
  hi: number; // Infinity permitido
  loClosed: boolean;
  hiClosed: boolean;
}

/** Normaliza una unión de intervalos: ordena y fusiona los que se tocan. */
export function normalizeUnion(list: Interval[]): Interval[] {
  const xs = list
    .filter((I) => I.lo < I.hi || (I.lo === I.hi && I.loClosed && I.hiClosed))
    .map((I) => ({
      ...I,
      loClosed: Number.isFinite(I.lo) ? I.loClosed : false,
      hiClosed: Number.isFinite(I.hi) ? I.hiClosed : false,
    }))
    .sort((a, b) => a.lo - b.lo || Number(b.loClosed) - Number(a.loClosed));
  const out: Interval[] = [];
  for (const I of xs) {
    const last = out[out.length - 1];
    if (last && (I.lo < last.hi || (I.lo === last.hi && (I.loClosed || last.hiClosed)))) {
      if (I.hi > last.hi) {
        last.hi = I.hi;
        last.hiClosed = I.hiClosed;
      } else if (I.hi === last.hi) {
        last.hiClosed = last.hiClosed || I.hiClosed;
      }
      if (I.lo === last.lo) last.loClosed = last.loClosed || I.loClosed;
    } else {
      out.push({ ...I });
    }
  }
  return out;
}

export function sameUnion(a: Interval[], b: Interval[], tol = 1e-9): boolean {
  const A = normalizeUnion(a);
  const B = normalizeUnion(b);
  if (A.length !== B.length) return false;
  const eq = (x: number, y: number) => (Number.isFinite(x) ? Math.abs(x - y) <= tol * Math.max(1, Math.abs(x)) : x === y);
  return A.every(
    (I, i) => eq(I.lo, B[i].lo) && eq(I.hi, B[i].hi) && I.loClosed === B[i].loClosed && I.hiClosed === B[i].hiClosed,
  );
}

/** Diagnóstico amable de por qué dos uniones de intervalos difieren. */
export function diagnoseUnion(user: Interval[], answer: Interval[]): string | null {
  const U = normalizeUnion(user);
  const A = normalizeUnion(answer);
  if (U.length === A.length) {
    const sameEnds = U.every(
      (I, i) => Math.abs(I.lo - A[i].lo) < 1e-9 || (I.lo === A[i].lo),
    ) && U.every((I, i) => Math.abs(I.hi - A[i].hi) < 1e-9 || I.hi === A[i].hi);
    if (sameEnds) {
      return "Los extremos están bien, pero revisa si cada extremo va abierto ( ) o cerrado [ ]. Pregúntate si ese número cumple la condición.";
    }
  }
  if (U.length !== A.length) {
    return A.length > U.length
      ? "Te falta al menos un tramo. La respuesta tiene más intervalos unidos."
      : "Tienes tramos de más. Revisa si algún intervalo sobra o si dos se pueden juntar.";
  }
  return null;
}

/** Interpreta un extremo escrito por el estudiante: "-3", "1/2", "-inf", "sqrt(2)". */
export function parseEndpoint(src: string): number | null {
  const s = src.trim();
  if (!s) return null;
  try {
    const v = evaluate(parse(s, { vars: [] }));
    if (Number.isNaN(v)) return null;
    return v;
  } catch {
    return null;
  }
}

/* ---------- Conjuntos finitos ---------- */

export function normalizeElement(e: string): string {
  const s = e.trim().replace(/\s+/g, "");
  const n = parseEndpoint(s);
  if (n !== null && Number.isFinite(n)) return String(Math.round(n * 1e9) / 1e9);
  return s.toLowerCase();
}

export function parseFiniteSet(src: string): string[] | null {
  let s = src.trim();
  if (/^(∅|\{\s*\}|vac[ií]o|conjunto vac[ií]o|ø|Ø)$/i.test(s)) return [];
  s = s.replace(/^\{/, "").replace(/\}$/, "");
  if (!s.trim()) return [];
  const parts = s.split(/[;,]/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  return [...new Set(parts.map(normalizeElement))];
}

export function sameFiniteSet(a: string[], b: string[]): boolean {
  const A = new Set(a.map(normalizeElement));
  const B = new Set(b.map(normalizeElement));
  if (A.size !== B.size) return false;
  for (const x of A) if (!B.has(x)) return false;
  return true;
}
