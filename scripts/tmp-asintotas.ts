import topic from "../src/content/topics/asintotas";
import { makeRng } from "../src/lib/math/rng";
import { parse, evaluate } from "../src/lib/math/parse";

const ev = (tex: string) => {
  const ast = parse(tex.replace(/\\dfrac/g, "\\frac"), { vars: ["x"] });
  return (x: number) => evaluate(ast, { x });
};
const num = (s: string) => evaluate(parse(s));
let bad = 0;
const fail = (id: string, seed: number, msg: string) => { bad++; console.log(`FALLA ${id} seed ${seed}: ${msg}`); };
const close = (a: number, b: number, tol = 1e-3) => Math.abs(a - b) < tol * Math.max(1, Math.abs(b));

function fOf(stmt: string): (x: number) => number {
  const m = stmt.match(/f\(x\) = (.*?)\$/);
  return ev(m![1]);
}
function avCheck(id: string, seed: number, f: (x: number) => number, ans: number[]) {
  for (let x = -7; x <= 7; x++) {
    const big = Math.abs(f(x + 1e-7)) > 1e4 || Math.abs(f(x - 1e-7)) > 1e4;
    if (big !== ans.includes(x)) fail(id, seed, `AV en ${x}: grande=${big} respuesta=${ans}`);
  }
}

for (const g of topic.exercises) {
  for (let s = 1; s <= 60; s++) {
    const ex = g.generate(makeRng(s * 7919));
    const P = ex.parts as any[];
    try {
      switch (g.id) {
        case "av-racional": avCheck(g.id, s, fOf(ex.statement), P[0].answer); break;
        case "ah-racional": { const f = fOf(ex.statement); const L = num(P[0].answer); if (!close(f(1e7), L) || !close(f(-1e7), L)) fail(g.id, s, `AH ${L} vs ${f(1e7)}`); break; }
        case "oblicua-racional": {
          const f = fOf(ex.statement); const a = num(P[0].answer), m = num(P[1].answer), b = num(P[2].answer);
          avCheck(g.id, s, f, [a]);
          for (const X of [1e6, -1e6]) { if (!close(f(X) / X, m) || !close(f(X) - m * X, b, 1e-2)) fail(g.id, s, `oblicua ${m},${b}`); }
          break;
        }
        case "ah-exponencial-raiz": { const f = fOf(ex.statement); const X = ex.statement.includes("sqrt") ? 1e7 : 60; if (!close(f(X), num(P[0].answer)) || !close(f(-X), num(P[1].answer))) fail(g.id, s, `AH ${f(60)} ${f(-60)}`); break; }
        case "asintotas-raiz": {
          const f = fOf(ex.statement); const av = P[0].answer as number[];
          for (const a of av) if (Math.abs(f(a + Math.sign(a) * 1e-9)) < 1e3) fail(g.id, s, "AV raiz");
          const [mp, bp, mn, bn] = [1, 2, 3, 4].map((i) => num(P[i].answer));
          const X = 1e6;
          if (!close(f(X) / X, mp) || !close(f(X) - mp * X, bp, 1e-2)) fail(g.id, s, `+inf ${f(X) / X} ${f(X) - mp * X}`);
          if (!close(f(-X) / -X, mn) || !close(f(-X) - mn * -X, bn, 1e-2)) fail(g.id, s, `-inf ${f(-X) / -X} ${f(-X) - mn * -X}`);
          break;
        }
        case "asintotas-racional-hueco": {
          const f = fOf(ex.statement); avCheck(g.id, s, f, P[0].answer);
          const m = num(P[2].answer), b = num(P[3].answer);
          for (const X of [1e6, -1e6]) if (!close(f(X) / X, m) || !close(f(X) - m * X, b, 1e-2)) fail(g.id, s, "oblicua");
          break;
        }
        case "asintotas-trozos": {
          const body = ex.statement.match(/\\begin\{cases\}(.*)\\end\{cases\}/)![1];
          const rows = body.split("\\\\").map((r) => r.split("&")[0].trim());
          const [f1, , f3] = rows.map(ev);
          const av = P[0].answer as number[];
          for (let x = -7; x < 0; x++) { const big = Math.abs(f1(x + 1e-8)) > 1e4; if (big !== av.includes(x)) fail(g.id, s, `AV izq ${x}`); }
          for (let x = 3; x <= 7; x++) { const big = Math.abs(f3(x + 1e-8)) > 1e4; if (big !== av.includes(x)) fail(g.id, s, `AV der ${x}`); }
          if (!close(f1(-1e7), num(P[1].answer))) fail(g.id, s, "AH");
          const m = num(P[2].answer), b = num(P[3].answer);
          if (!close(f3(1e6) / 1e6, m) || !close(f3(1e6) - m * 1e6, b, 1e-2)) fail(g.id, s, "AO");
          break;
        }
        case "bosquejo-condiciones": {
          const sol = ex.solution[ex.solution.length - 1];
          const f = ev(sol.match(/f\(x\) = (.*?)\$/)![1]);
          const a = Number(ex.statement.match(/x \\to (-?\d+)\^-/)![1]);
          const sl = ex.statement.match(/\^-\} f\(x\) = ([+-])\\infty/)![1];
          const sr = ex.statement.match(/\^\+\} f\(x\) = ([+-])\\infty/)![1];
          const L = Number(ex.statement.match(/-\\infty\} f\(x\) = (-?\d+)/)![1]);
          if (Math.sign(f(a - 1e-6)) !== (sl === "+" ? 1 : -1) || Math.sign(f(a + 1e-6)) !== (sr === "+" ? 1 : -1)) fail(g.id, s, "laterales");
          if (!close(f(1e6), L)) fail(g.id, s, "AH");
          const opt = P[0].options.find((o: any) => o.correct);
          if (opt.graph.curves[0].fn !== sol.match(/f\(x\) = (.*?)\$/)![1]) fail(g.id, s, "grafica correcta no coincide");
          break;
        }
      }
    } catch (e) {
      fail(g.id, s, (e as Error).message);
    }
  }
}
console.log(bad ? `${bad} fallas` : "todo bien");
