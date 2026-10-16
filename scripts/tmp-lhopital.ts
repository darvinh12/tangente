import path from "node:path";
import { pathToFileURL } from "node:url";
import { makeRng } from "../src/lib/math/rng";
import { parse, evaluate } from "../src/lib/math/parse";

const RE = /\\lim_\{x \\to ([^}]*\}?)\} (.+?)(?:\$|$)/;

function numLimit(A: string, F: string): number {
  const f = (x: number) => evaluate(parse(F, { vars: ["x"] }), { x });
  if (A.includes("infty")) {
    let last = NaN;
    for (const x of [50, 200, 1e3, 1e4, 1e5, 1e6]) {
      const v = f(x);
      if (Number.isFinite(v)) last = v;
    }
    if (Number.isNaN(last) || Math.abs(last) > 1e8) return f(50) > 0 ? Infinity : -Infinity;
    return last;
  }
  const plus = A.includes("^{+}");
  const a = evaluate(parse(A.replace("^{+}", "")));
  const h = 1e-5;
  const r = f(a + h);
  if (plus) return r;
  const l = f(a - h);
  if (Math.abs(l - r) > 1e-2 * Math.max(1, Math.abs(r))) return NaN;
  return (l + r) / 2;
}

(async () => {
  const mod = await import(pathToFileURL(path.join(process.cwd(), "src/content/topics/lhopital.ts")).href);
  const topic = mod.default?.default ?? mod.default;
  let bad = 0, ok = 0;
  const check = (where: string, A: string, F: string, ans: string) => {
    const want = ans === "\\infty" ? Infinity : ans === "-\\infty" ? -Infinity : evaluate(parse(ans));
    const got = numLimit(A, F);
    const good = Number.isFinite(want) ? Math.abs(got - want) <= 2e-2 * Math.max(1, Math.abs(want)) : got === want;
    if (!good) { bad++; console.log(`MAL ${where}: lim x->${A} ${F} = ${ans} (${want}) numérico ${got}`); } else ok++;
  };
  for (const g of topic.exercises) {
    for (let s = 1; s <= 60; s++) {
      const ex = g.generate(makeRng(s * 31));
      const exprs = ex.parts.filter((p: any) => p.kind === "expr");
      const m = ex.statement.match(RE);
      if (m && exprs.length) {
        const last = exprs[exprs.length - 1];
        check(`${g.id}#${s}`, m[1], m[2].replace(/\$+$/, ""), last.answer);
        if (exprs.length === 2) {
          const v1 = evaluate(parse(exprs[0].answer));
          const v2 = evaluate(parse(last.answer));
          if (Math.abs(Math.exp(v1) - v2) > 1e-9 * v2) { bad++; console.log(`MAL ln ${g.id}#${s}`); }
        }
      }
      for (const p of exprs) {
        const mp = (p.prompt ?? "").match(RE);
        if (mp) check(`${g.id}#${s} prompt`, mp[1], mp[2], p.answer);
      }
    }
  }
  for (const sec of topic.sections) for (const b of sec.blocks) if (b.type === "quick") {
    const m = b.exercise.statement.match(/\\lim_\{x \\to ([^}]*\}?)\} (.+?)\$/);
    const p = b.exercise.parts[0];
    if (m && p.kind === "expr") check(`quick ${sec.id}`, m[1], m[2].replace(/\\dfrac/g, "\\frac"), p.answer);
  }
  console.log(`ok ${ok}, mal ${bad}`);
})();
