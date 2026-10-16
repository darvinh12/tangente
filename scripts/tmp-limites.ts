// Verificación numérica temporal de los generadores de límites. Uso: npx tsx scripts/tmp-limites.ts <slug> [seeds]
import path from "node:path";
import { pathToFileURL } from "node:url";
import { makeRng } from "../src/lib/math/rng";
import { parse, evaluate, freeVars, type Ast } from "../src/lib/math/parse";

const [slug, nSeeds = "60"] = process.argv.slice(2);

function braceEnd(s: string, i: number): number {
  let d = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "{") d++;
    else if (s[j] === "}") { d--; if (d === 0) return j; }
  }
  return -1;
}

interface Lim { v: string; point: string; expr: string }
function findLims(text: string): Lim[] {
  const out: Lim[] = [];
  let i = 0;
  for (;;) {
    const k = text.indexOf("\\lim_{", i);
    if (k < 0) break;
    const b = k + 5;
    const e = braceEnd(text, b);
    const sub = text.slice(b + 1, e);
    const m = sub.match(/^\s*([a-z])\s*\\to\s*(.+)$/);
    let rest = text.slice(e + 1);
    const end = rest.search(/\$|=/);
    rest = end >= 0 ? rest.slice(0, end) : rest;
    if (m) out.push({ v: m[1], point: m[2].trim(), expr: rest.trim() });
    i = e + 1;
  }
  return out;
}
function findF(text: string): string | null {
  const m = text.match(/[fg]\(x\) = ([^$]+)\$/);
  return m ? m[1].trim() : null;
}

const PARAM = 1.37;
let PARAMS: Record<string, number> = {};
function compileExpr(src: string, v: string): ((x: number) => number) | null {
  if (src.includes("\\begin{cases}")) return compileCases(src, v);
  try {
    const ast: Ast = parse(src);
    const fv = freeVars(ast);
    if (/f\(x\)|g\(x\)/.test(src)) return null;
    const scope: Record<string, number> = {};
    for (const n of fv) if (n !== v) scope[n] = PARAMS[n] ?? PARAM;
    return (x) => evaluate(ast, { ...scope, [v]: x });
  } catch {
    return null;
  }
}
function condFn(c: string): (x: number) => boolean {
  const t = c.replace(/\\le/g, "<=").replace(/\\ge/g, ">=").replace(/\s+/g, "");
  const cmp = (op: string, a: number, b: number) => (op === "<" ? a < b : op === "<=" ? a <= b : op === ">" ? a > b : a >= b);
  let m = t.match(/^x(<=|<|>=|>)(-?[\d.]+)$/);
  if (m) { const op = m[1]; const n = Number(m[2]); return (x) => cmp(op, x, n); }
  m = t.match(/^(-?[\d.]+)(<=|<)x(<=|<)(-?[\d.]+)$/);
  if (m) { const [, a, o1, o2, b] = m; return (x) => cmp(o1, Number(a), x) && cmp(o2, x, Number(b)); }
  throw new Error("cond " + c);
}
function compileCases(src: string, v: string): ((x: number) => number) | null {
  const m = src.match(/\\begin\{cases\}(.*)\\end\{cases\}/);
  if (!m) return null;
  try {
    const rows = m[1].split("\\\\").map((row) => {
      const [e, c] = row.split("&");
      const f = compileExpr(e.trim(), v);
      if (!f) throw new Error("row");
      return { f, c: condFn(c.replace("\\text{si }", "").trim()) };
    });
    return (x) => { const r = rows.find((q) => q.c(x)); return r ? r.f(x) : NaN; };
  } catch {
    return null;
  }
}

function sideEst(f: (x: number) => number, a: number, s: number): number {
  const hs = [1e-3, 1e-4, 1e-5, 1e-6, 1e-7];
  const vals = hs.map((h) => f(a + s * h)).filter((y) => !Number.isNaN(y));
  if (!vals.length) return NaN;
  const last = vals[vals.length - 1];
  const prev = vals[vals.length - 2] ?? last;
  if (!Number.isFinite(last)) return last;
  if (Math.abs(last) > 1e4 && Math.abs(last) > Math.abs(prev) * 3 && Math.sign(last) === Math.sign(prev)) return last > 0 ? Infinity : -Infinity;
  return last;
}
function infEst(f: (x: number) => number, s: number): number {
  const X = [1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9];
  const all = X.map((x) => f(s * x));
  const vals = all.filter((y) => !Number.isNaN(y));
  if (!vals.length) return NaN;
  const fin = vals.filter(Number.isFinite);
  if (vals.some((y) => !Number.isFinite(y)) && (fin.length < 2 || Math.abs(fin[fin.length - 1]) > 50)) {
    return vals.find((y) => !Number.isFinite(y))!;
  }
  const last = fin[fin.length - 1];
  if (Math.abs(last) > 1e4) return last > 0 ? Infinity : -Infinity;
  const inc = fin.every((y, i) => i === 0 || y > fin[i - 1]);
  const dec = fin.every((y, i) => i === 0 || y < fin[i - 1]);
  if (inc && fin.length > 3 && last - fin[0] > 8 && fin[fin.length - 1] - fin[fin.length - 2] > 0.5) return Infinity;
  if (dec && fin.length > 3 && fin[0] - last > 8 && fin[fin.length - 2] - fin[fin.length - 1] > 0.5) return -Infinity;
  return last;
}

function estimate(f: (x: number) => number, point: string): number | "dne" {
  const p = point.replace(/\s+/g, "");
  if (/^\+?\\infty$/.test(p)) return infEst(f, 1);
  if (p === "-\\infty") return infEst(f, -1);
  let side = 0;
  let core = p;
  const sm = p.match(/^(.*)\^\{?([+-])\}?$/);
  if (sm) { core = sm[1]; side = sm[2] === "+" ? 1 : -1; }
  const a = evaluate(parse(core));
  if (side) return sideEst(f, a, side);
  const L = sideEst(f, a, -1);
  const R = sideEst(f, a, 1);
  if (L === R) return L;
  if (Number.isFinite(L) && Number.isFinite(R) && Math.abs(L - R) < 1e-3 * Math.max(1, Math.abs(L))) return (L + R) / 2;
  return "dne";
}

function expected(ans: string, vars: string[] | undefined): number | "dne" {
  if (ans === "dne") return "dne";
  const ast = parse(ans, { vars });
  return evaluate(ast, Object.fromEntries((vars ?? []).map((v) => [v, PARAM])));
}

function close(a: number | "dne", b: number | "dne"): boolean {
  if (a === "dne" || b === "dne") return a === b;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
  return Math.abs(a - b) <= 5e-3 * Math.max(1, Math.abs(b));
}

(async () => {
  const mod = await import(pathToFileURL(path.join(process.cwd(), "src/content/topics", slug + ".ts")).href);
  const topic = mod.default?.default ?? mod.default;
  let fails = 0;
  const exercises: { id: string; gen: (s: number) => any }[] = topic.exercises.map((g: any) => ({ id: g.id, gen: (s: number) => g.generate(makeRng(s * 7919)) }));
  // ejercicios rápidos de las secciones
  topic.sections.forEach((s: any) => s.blocks.forEach((b: any, i: number) => {
    if (b.type === "quick") exercises.push({ id: `quick:${s.id}.${i}`, gen: () => b.exercise });
  }));
  for (const g of exercises) {
    let checked = 0;
    let skipped = 0;
    const N = g.id.startsWith("quick") ? 1 : Number(nSeeds);
    for (let seed = 1; seed <= N; seed++) {
      const ex = g.gen(seed);
      const stLims = findLims(ex.statement);
      const fDef = findF(ex.statement);
      PARAMS = {};
      for (const p of ex.parts) {
        const bm = p.kind === "expr" && !p.special && (p.before ?? "").match(/^([a-z])\s*=$/);
        if (bm) PARAMS[bm[1]] = evaluate(parse(p.answer));
      }
      for (const p of ex.parts) {
        if (p.kind !== "expr" || !p.special) continue;
        const src = `${p.prompt ?? ""} $${p.before ?? ""}$`;
        const pl = findLims(src);
        let lim: Lim | undefined = pl[0] ?? (stLims.length === 1 ? stLims[0] : undefined);
        if (!lim) { skipped++; continue; }
        let exprSrc = lim.expr;
        if (!exprSrc || exprSrc === "f(x)" || exprSrc === "g(x)") {
          const st = stLims.find((l) => l.expr && l.expr !== "f(x)");
          exprSrc = fDef ?? st?.expr ?? "";
        }
        let f = compileExpr(exprSrc, lim.v);
        if (!f && ex.graph?.curves) {
          const cs = ex.graph.curves.map((c: any) => ({ f: compileExpr(c.fn, "x")!, d: c.domain ?? [-1e9, 1e9] }));
          f = (x: number) => { const c = cs.find((q: any) => x > q.d[0] && x < q.d[1]); return c ? c.f(x) : NaN; };
        }
        if (!f) { skipped++; continue; }
        let est: number | "dne";
        let exp: number | "dne";
        try {
          est = estimate(f, lim.point);
          exp = expected(p.answer, p.vars);
        } catch (e) {
          skipped++;
          continue;
        }
        checked++;
        if (!close(est, exp)) {
          fails++;
          console.log(`FALLA ${g.id} seed ${seed}: lim_{${lim.v}->${lim.point}} ${exprSrc}  esperado ${p.answer} (${exp}) estimado ${est}`);
        }
      }
    }
    console.log(`${g.id}: verificadas ${checked}, omitidas ${skipped}`);
  }
  console.log(`\n${fails} fallas`);
})();
