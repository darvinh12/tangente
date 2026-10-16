// Script temporal: verifica numéricamente las derivadas de los generadores.
import path from "node:path";
import { pathToFileURL } from "node:url";
import { makeRng } from "../src/lib/math/rng";
import { parse, evaluate } from "../src/lib/math/parse";

const slug = process.argv[2];
let bad = 0;
let checked = 0;

function fnOf(tex: string, vars = ["x"]) {
  const ast = parse(tex, { vars });
  return (s: Record<string, number>) => evaluate(ast, s);
}
function close(a: number, b: number, tol = 1e-4) {
  return Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
}
const d1 = (f: (x: number) => number, x: number, h = 1e-5) => (f(x + h) - f(x - h)) / (2 * h);
const d2 = (f: (x: number) => number, x: number, h = 1e-3) => (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
const dn = (f: (x: number) => number, x: number, n: number): number => {
  if (n === 0) return f(x);
  const h = 2e-2;
  return (dn(f, x + h, n - 1) - dn(f, x - h, n - 1)) / (2 * h);
};

(async () => {
  const mod = await import(pathToFileURL(path.join(process.cwd(), "src/content/topics", slug + ".ts")).href);
  const topic = mod.default?.default ?? mod.default;
  for (const g of topic.exercises) {
    for (let s = 1; s <= 80; s++) {
      const ex = g.generate(makeRng(s * 7919));
      const st: string = ex.statement;
      const m = st.match(/\$([a-zA-Z])\(x\) = ([^$]+)\$/);
      const report = (msg: string) => {
        bad++;
        if (bad < 40) console.log(`MAL ${g.id} seed ${s}: ${msg}\n   ${st}`);
      };
      for (const p of ex.parts) {
        if (p.kind !== "expr" || !p.before) continue;
        // Derivadas de f(x)
        if (m) {
          const L = m[1];
          const F = fnOf(m[2]);
          const f = (x: number) => F({ x });
          const b = p.before.replace(/\s+/g, "");
          const order = b.startsWith(`${L}''''`) ? 4 : b.startsWith(`${L}'''`) ? 3 : b.startsWith(`${L}''`) ? 2 : b.startsWith(`${L}'`) ? 1 : b.startsWith(`${L}^{(`) ? Number(b.match(/\^\{\((\d+)\)\}/)![1]) : 0;
          if (!order) continue;
          const arg = b.match(/\((.+)\)=$/)?.[1];
          const A = fnOf(p.answer, p.vars ?? []);
          const pts: number[] = [];
          if (arg === "x") {
            const [lo, hi] = p.domain ?? [-3, 3];
            for (let i = 0; i < 7; i++) pts.push(lo + ((hi - lo) * (i + 0.37)) / 7);
          } else if (arg !== undefined) {
            pts.push(evaluate(parse(arg, { vars: [] })));
          }
          for (const x of pts) {
            const want = order === 1 ? d1(f, x) : order === 2 ? d2(f, x) : dn(f, x, order);
            const got = arg === "x" ? A({ x }) : A({});
            if (!Number.isFinite(want) || !Number.isFinite(got)) continue;
            checked++;
            const tol = order === 1 ? 1e-4 : order === 2 ? 1e-3 : 2e-2;
            if (!close(want, got, tol)) { report(`${p.before} ${p.answer} en x=${x}: esperado ${want}, dio ${got}`); break; }
          }
        }
      }
      // Chequeos específicos por generador
      const extra = (globalThis as any).__extra?.[g.id];
      if (extra) { checked++; const msg = extra(ex); if (msg) report(msg); }
    }
  }
  console.log(`\n${slug}: ${checked} comprobaciones, ${bad} fallos`);
})();
