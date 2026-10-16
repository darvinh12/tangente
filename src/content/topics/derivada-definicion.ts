import { meta } from "../catalog";
import { choice, trueFalse } from "../helpers";
import type { ExerciseGen, Rich, Topic } from "../types";
import { evaluate, type Ast } from "@/lib/math/parse";
import { coef, fmt, frac, minus, num, poly, signed, terms } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

/** Rechaza cocientes en los que todavía no se puede sustituir h = 0. */
function noHDen(extra: Record<string, number> = {}) {
  return (ast: Ast): string | null => {
    const v = evaluate(ast, { x: 1.37, ...extra, h: 0 });
    return Number.isFinite(v) ? null : "Todavía queda una $h$ que anula un denominador. Simplifica hasta que puedas sustituir $h = 0$.";
  };
}

const lineTex = (m: number, b: number) => terms([[m, "x"], [b, ""]]);
/** p(a+h)^2 + q(a+h) + r escrito sin simplificar. */
const evalAt = (coefs: number[], at: string) =>
  terms(coefs.map((c, i) => {
    const p = coefs.length - 1 - i;
    return [c, p === 0 ? "" : p === 1 ? at : `${at}^{${p}}`] as [number, string];
  }));
/** Valor de un polinomio. */
const pval = (coefs: number[], x: number) => coefs.reduce((acc, c) => acc * x + c, 0);
const par = (n: number) => (n < 0 ? `(${n})` : String(n));

/* ----------------------------------- ejercicios ----------------------------------- */

const tasaMedia: ExerciseGen = {
  id: "tasa-media",
  title: "Tasa media de cambio",
  level: 1,
  generate: (r) => {
    const p = r.nz(-3, 3);
    const q = r.int(-6, 6);
    const c = r.int(-5, 5);
    const a = r.int(-3, 3);
    const b = a + r.int(2, 4);
    const f = [p, q, c];
    const fa = pval(f, a);
    const fb = pval(f, b);
    const ans = (fb - fa) / (b - a);
    return {
      statement: `Calcula la tasa media de cambio de $f(x) = ${poly(f)}$ en el intervalo $[${a}, ${b}]$.`,
      parts: [
        {
          kind: "expr",
          before: "\\text{TMC} =",
          answer: fmt(ans),
          mistakes: [{ answer: String(fb - fa), feedback: `Eso es el cambio total $f(${b}) - f(${a})$. La tasa media lo reparte entre las $${b - a}$ unidades que avanzó $x$.` }].filter(() => fb - fa !== ans),
        },
      ],
      hints: ["La tasa media es $\\dfrac{f(b) - f(a)}{b - a}$, la pendiente de la recta que une los dos puntos de la gráfica."],
      solution: [
        `$f(${a}) = ${fa}$ y $f(${b}) = ${fb}$.`,
        `$\\text{TMC} = \\dfrac{${fb} - ${par(fa)}}{${b} - ${par(a)}} = \\dfrac{${fb - fa}}{${b - a}} = ${fmt(ans)}$.`,
        `En promedio, por cada unidad que avanza $x$ entre $${a}$ y $${b}$, la función cambia $${fmt(ans)}$.`,
      ],
    };
  },
};

const leerTangente: ExerciseGen = {
  id: "leer-tangente",
  title: "La derivada como pendiente de la tangente",
  level: 1,
  generate: (r) => {
    const s = r.pick([1, -1]);
    const p = r.int(-2, 2);
    const a = p + r.nz(-2, 2);
    const q = s > 0 ? r.int(-3, 0) : r.int(0, 3);
    const fa = s * (a - p) ** 2 / 2 + q;
    const m = s * (a - p);
    const fTex = `${s < 0 ? "-" : ""}\\frac{(${minus("x", p)})^{2}}{2}${q === 0 ? "" : ` ${signed(q)}`}`;
    const tan =
      m === 0
        ? num(fa)
        : `${coef(m, `(${minus("x", a)})`)}${fa === 0 ? "" : ` ${fa < 0 ? "-" : "+"} ${num(Math.abs(fa))}`}`;
    return {
      statement: `La gráfica muestra $f$ y su recta tangente en el punto $(${a}, ${num(fa)})$. ¿Cuánto vale $f'(${a})$?`,
      graph: {
        x: [-6, 6],
        y: [-8, 8],
        curves: [
          { fn: fTex, color: "accent" },
          { fn: tan, color: "orange", dashed: true },
        ],
        points: [
          { x: a, y: fa, label: `(${a}; ${num(fa).replace("{,}", ",")})` },
          { x: a + 2, y: fa + 2 * m, label: `(${a + 2}; ${num(fa + 2 * m).replace("{,}", ",")})`, color: "orange" },
        ],
      },
      parts: [
        {
          kind: "expr",
          before: `f'(${a}) =`,
          answer: String(m),
          mistakes: [{ answer: num(fa).replace("{,}", "."), feedback: `Eso es $f(${a})$, la altura del punto. La derivada es la pendiente de la recta tangente.` }].filter(() => fa !== m),
        },
      ],
      hints: [
        "$f'(a)$ es la pendiente de la recta tangente en $x = a$.",
        "Usa los dos puntos marcados sobre la tangente: pendiente $= \\dfrac{\\Delta y}{\\Delta x}$.",
      ],
      solution: [
        `La recta tangente pasa por $(${a}, ${num(fa)})$ y $(${a + 2}, ${num(fa + 2 * m)})$.`,
        `Su pendiente es $\\dfrac{${num(fa + 2 * m)} - ${fa < 0 ? `(${num(fa)})` : num(fa)}}{2} = ${m}$.`,
        `Por lo tanto $f'(${a}) = ${m}$.${m === 0 ? " La tangente es horizontal: en ese punto la función ni sube ni baja." : ""}`,
      ],
    };
  },
};

const derivadaPunto: ExerciseGen = {
  id: "derivada-punto",
  title: "Derivada en un punto por definición",
  level: 1,
  generate: (r) => {
    const p = r.nz(-3, 3);
    const q = r.int(-6, 6);
    const c = r.int(-5, 5);
    const a = r.int(-3, 3);
    const f = [p, q, c];
    const m = 2 * p * a + q;
    const ah = a === 0 ? "h" : `(${a} + h)`;
    return {
      statement: `Usa la definición para calcular $f'(${a})$ si $f(x) = ${poly(f)}$.`,
      sequential: true,
      parts: [
        {
          kind: "expr",
          prompt: `Simplifica el cociente $\\dfrac{f(${a} + h) - f(${a})}{h}$ hasta que no quede $h$ en el denominador.`,
          before: `\\dfrac{f(${a} + h) - f(${a})}{h} =`,
          answer: terms([[m, ""], [p, "h"]]),
          vars: ["h"],
          validate: noHDen(),
          mistakes: [
            { answer: String(m), feedback: "Eso ya es el límite. Aquí se pide el cociente antes de hacer $h \\to 0$, que todavía tiene $h$." },
          ],
        },
        { kind: "expr", prompt: "Ahora haz $h \\to 0$.", before: `f'(${a}) =`, answer: String(m) },
      ],
      hints: [
        `Calcula $f(${a} + h) = ${evalAt(f, ah)}$ y desarrolla el cuadrado.`,
        "Al restar $f(a)$ se cancelan todos los términos sin $h$. Después saca $h$ factor común y simplifica.",
      ],
      solution: [
        `$f(${a} + h) = ${evalAt(f, ah)} = ${terms([[p * a * a + q * a + c, ""], [m, "h"], [p, "h^{2}"]])}$.`,
        `$f(${a}) = ${pval(f, a)}$, así que $f(${a} + h) - f(${a}) = ${terms([[m, "h"], [p, "h^{2}"]])}$.`,
        `Dividiendo entre $h$: $\\dfrac{${terms([[m, "h"], [p, "h^{2}"]])}}{h} = ${terms([[m, ""], [p, "h"]])}$.`,
        `$f'(${a}) = \\lim_{h \\to 0} (${terms([[m, ""], [p, "h"]])}) = ${m}$.`,
      ],
    };
  },
};

const notacion: ExerciseGen = {
  id: "definicion-correcta",
  title: "Reconocer la definición",
  level: 1,
  generate: (r) => {
    const fs = [
      { tex: "x^{2}", at: (s: string) => `(${s})^{2}` },
      { tex: "x^{3}", at: (s: string) => `(${s})^{3}` },
      { tex: "3x^{2}", at: (s: string) => `3(${s})^{2}` },
      { tex: "\\sqrt{x}", at: (s: string) => `\\sqrt{${s}}` },
      { tex: "\\frac{1}{x}", at: (s: string) => `\\frac{1}{${s}}` },
    ];
    const f = r.pick(fs);
    const a = r.int(1, 4);
    const fa = f.at(String(a));
    const fah = f.at(`${a} + h`);
    const correct = `$\\displaystyle\\lim_{h \\to 0} \\frac{${fah} - ${fa}}{h}$`;
    const wrong: [Rich, Rich][] = r.sample(
      [
        [`$\\displaystyle\\lim_{h \\to 0} \\left[ ${fah} - ${fa} \\right]$`, "Falta dividir entre $h$. Sin dividir, la diferencia tiende a $0$ y no mide ninguna pendiente."],
        [`$\\displaystyle\\frac{${fah} - ${fa}}{h}$`, "Sin el límite, eso es la pendiente de una secante para un $h$ fijo, no la de la tangente."],
        [`$\\displaystyle\\lim_{h \\to 0} \\frac{${fah} - ${f.at("h")}}{h}$`, `Se resta $f(${a})$, el valor en el punto, no $f(h)$.`],
        [`$\\displaystyle\\lim_{h \\to \\infty} \\frac{${fah} - ${fa}}{h}$`, "$h$ tiene que tender a $0$: el segundo punto se acerca al primero."],
      ] as [Rich, Rich][],
      3,
    );
    return {
      statement: `Si $f(x) = ${f.tex}$, ¿cuál expresión es $f'(${a})$?`,
      parts: [choice(correct, wrong)],
      hints: ["$f'(a) = \\lim_{h \\to 0} \\dfrac{f(a + h) - f(a)}{h}$."],
      solution: [`Por definición $f'(${a}) = \\lim_{h \\to 0} \\dfrac{f(${a} + h) - f(${a})}{h}$. Sustituyendo la fórmula queda ${correct}.`],
    };
  },
};

const derivadaPolinomio: ExerciseGen = {
  id: "derivada-polinomio",
  title: "La función derivada de un polinomio",
  level: 2,
  generate: (r) => {
    if (r.bool(0.6)) {
      const p = r.nz(-4, 4);
      const q = r.int(-8, 8);
      const c = r.int(-6, 6);
      const f = [p, q, c];
      return {
        statement: `Calcula, aplicando la definición, la derivada de $f(x) = ${poly(f)}$.`,
        sequential: true,
        parts: [
          {
            kind: "expr",
            prompt: "Simplifica $\\dfrac{f(x + h) - f(x)}{h}$.",
            before: "\\dfrac{f(x + h) - f(x)}{h} =",
            answer: terms([[2 * p, "x"], [q, ""], [p, "h"]]),
            vars: ["x", "h"],
            validate: noHDen(),
          },
          {
            kind: "expr",
            prompt: "Haz $h \\to 0$.",
            before: "f'(x) =",
            answer: lineTex(2 * p, q),
            vars: ["x"],
            mistakes: [{ answer: lineTex(p, q), feedback: "Al desarrollar $(x + h)^2 = x^2 + 2xh + h^2$ aparece un $2$ en el término $2xh$. No lo pierdas." }],
          },
        ],
        hints: [
          "$(x + h)^2 = x^2 + 2xh + h^2$.",
          "Al restar $f(x)$ se van los términos que no tienen $h$. Saca $h$ factor común.",
        ],
        solution: [
          `$f(x + h) = ${evalAt(f, "(x + h)")} = ${terms([[p, "x^{2}"], [2 * p, "xh"], [p, "h^{2}"], [q, "x"], [q, "h"], [c, ""]])}$.`,
          `$f(x + h) - f(x) = ${terms([[2 * p, "xh"], [p, "h^{2}"], [q, "h"]])} = h(${terms([[2 * p, "x"], [p, "h"], [q, ""]])})$.`,
          `$\\dfrac{f(x + h) - f(x)}{h} = ${terms([[2 * p, "x"], [p, "h"], [q, ""]])}$.`,
          `$f'(x) = \\lim_{h \\to 0} (${terms([[2 * p, "x"], [p, "h"], [q, ""]])}) = ${lineTex(2 * p, q)}$.`,
        ],
      };
    }
    const p = r.pick([1, 2, -1]);
    const q = r.int(-6, 6);
    const c = r.int(-5, 5);
    const f = [p, 0, q, c];
    return {
      statement: `Calcula, aplicando la definición, la derivada de $f(x) = ${poly(f)}$.`,
      sequential: true,
      parts: [
        {
          kind: "expr",
          prompt: "Simplifica $\\dfrac{f(x + h) - f(x)}{h}$.",
          before: "\\dfrac{f(x + h) - f(x)}{h} =",
          answer: terms([[3 * p, "x^{2}"], [3 * p, "xh"], [p, "h^{2}"], [q, ""]]),
          vars: ["x", "h"],
          validate: noHDen(),
        },
        {
          kind: "expr",
          prompt: "Haz $h \\to 0$.",
          before: "f'(x) =",
          answer: poly([3 * p, 0, q]),
          vars: ["x"],
          mistakes: [{ answer: poly([p, 0, q]), feedback: "Revisa el desarrollo: $(x + h)^3 = x^3 + 3x^2h + 3xh^2 + h^3$." }],
        },
      ],
      hints: ["$(x + h)^3 = x^3 + 3x^2h + 3xh^2 + h^3$.", "Después de restar $f(x)$ todos los términos tienen $h$: sácalo factor común."],
      solution: [
        `$f(x + h) - f(x) = ${terms([[3 * p, "x^{2}h"], [3 * p, "xh^{2}"], [p, "h^{3}"], [q, "h"]])}$.`,
        `Dividiendo entre $h$: $${terms([[3 * p, "x^{2}"], [3 * p, "xh"], [p, "h^{2}"], [q, ""]])}$.`,
        `Con $h \\to 0$ los términos con $h$ desaparecen: $f'(x) = ${poly([3 * p, 0, q])}$.`,
      ],
    };
  },
};

const derivadaRacional: ExerciseGen = {
  id: "derivada-racional",
  title: "Derivada por definición de una fracción",
  level: 2,
  generate: (r) => {
    const kind = r.pick(["k", "lineal", "cuadrado"] as const);
    if (kind === "cuadrado") {
      const k = r.nz(-4, 4);
      return {
        statement: `Calcula, aplicando la definición, la derivada de $f(x) = \\dfrac{${k}}{x^{2}}$.`,
        sequential: true,
        parts: [
          {
            kind: "expr",
            prompt: "Resta las fracciones, simplifica la $h$ y escribe el cociente que queda.",
            before: "\\dfrac{f(x + h) - f(x)}{h} =",
            answer: `\\frac{${-k}(2x + h)}{x^{2}(x + h)^{2}}`,
            vars: ["x", "h"],
            domain: [0.5, 3],
            validate: noHDen(),
          },
          { kind: "expr", prompt: "Haz $h \\to 0$.", before: "f'(x) =", answer: `\\frac{${-2 * k}}{x^{3}}`, vars: ["x"], domain: [0.5, 3] },
        ],
        hints: [
          "Común denominador: $\\dfrac{k}{(x+h)^2} - \\dfrac{k}{x^2} = \\dfrac{k x^2 - k(x+h)^2}{x^2(x+h)^2}$.",
          "$x^2 - (x + h)^2 = -2xh - h^2 = -h(2x + h)$.",
        ],
        solution: [
          `$f(x+h) - f(x) = \\dfrac{${k}}{(x+h)^{2}} - \\dfrac{${k}}{x^{2}} = \\dfrac{${k}[x^{2} - (x+h)^{2}]}{x^{2}(x+h)^{2}} = \\dfrac{${-k}h(2x + h)}{x^{2}(x+h)^{2}}$.`,
          `Dividiendo entre $h$: $\\dfrac{${-k}(2x + h)}{x^{2}(x+h)^{2}}$.`,
          `Con $h \\to 0$: $f'(x) = \\dfrac{${-k} \\cdot 2x}{x^{4}} = \\dfrac{${-2 * k}}{x^{3}}$.`,
        ],
      };
    }
    const c = r.int(-4, 4);
    const xc = minus("x", -c);
    const xhc = c === 0 ? "x + h" : `x + h ${signed(c)}`;
    let numTex: string, K: number;
    if (kind === "k") {
      K = r.nz(-5, 5);
      numTex = String(K);
    } else {
      let p: number;
      do p = r.int(-5, 5); while (p === c);
      numTex = minus("x", -p);
      K = c - p;
    }
    const kk = kind === "k" ? -K : K;
    const fTex = `\\dfrac{${numTex}}{${xc}}`;
    return {
      statement: `Calcula, aplicando la definición, la derivada de $f(x) = ${fTex}$.`,
      sequential: true,
      parts: [
        {
          kind: "expr",
          prompt: "Resta las fracciones, simplifica la $h$ y escribe el cociente que queda.",
          before: "\\dfrac{f(x + h) - f(x)}{h} =",
          answer: `\\frac{${kk}}{(${xhc})(${xc})}`,
          vars: ["x", "h"],
          validate: noHDen(),
        },
        {
          kind: "expr",
          prompt: "Haz $h \\to 0$.",
          before: "f'(x) =",
          answer: `\\frac{${kk}}{(${xc})^{2}}`,
          vars: ["x"],
          mistakes: [{ answer: `\\frac{${-kk}}{(${xc})^{2}}`, feedback: "Revisa el signo al restar las fracciones: es $f(x+h) - f(x)$, en ese orden." }],
        },
      ],
      hints: [
        "Escribe $f(x + h) - f(x)$ con común denominador $(x + h + c)(x + c)$.",
        "En el numerador se cancela casi todo y queda un múltiplo de $h$, que se simplifica con el $h$ de abajo.",
      ],
      solution: [
        kind === "k"
          ? `$f(x+h) - f(x) = \\dfrac{${K}}{${xhc}} - \\dfrac{${K}}{${xc}} = \\dfrac{${K}(${xc}) - ${K < 0 ? `(${K})` : K}(${xhc})}{(${xhc})(${xc})} = \\dfrac{${-K}h}{(${xhc})(${xc})}$.`
          : `$f(x+h) - f(x) = \\dfrac{${numTex.replace("x", "x + h")}}{${xhc}} - \\dfrac{${numTex}}{${xc}}$. Con común denominador, el numerador es $(${numTex.replace("x", "x + h")})(${xc}) - (${numTex})(${xhc}) = ${kk}h$.`,
        `Dividiendo entre $h$: $\\dfrac{${kk}}{(${xhc})(${xc})}$.`,
        `Con $h \\to 0$: $f'(x) = \\dfrac{${kk}}{(${xc})^{2}}$.`,
      ],
    };
  },
};

const derivadaRaiz: ExerciseGen = {
  id: "derivada-raiz",
  title: "Derivada por definición de una raíz",
  level: 2,
  generate: (r) => {
    const a = r.pick([1, 2, 3, 4]);
    const b = r.int(0, 5);
    const inner = terms([[a, "x"], [b, ""]]);
    const innerH = terms([[a, "x"], [a, "h"], [b, ""]]);
    const finalTex = a % 2 === 0 ? `\\frac{${a / 2}}{\\sqrt{${inner}}}` : `\\frac{${a}}{2\\sqrt{${inner}}}`;
    const mistakes = a !== 1 ? [{ answer: `\\frac{1}{2\\sqrt{${inner}}}`, feedback: `Al racionalizar el numerador queda $${a}h$, no $h$. Ese $${a}$ sobrevive.` }] : [];
    return {
      statement: `Calcula, aplicando la definición, la derivada de $f(x) = \\sqrt{${inner}}$.`,
      sequential: true,
      parts: [
        {
          kind: "expr",
          prompt: "Multiplica por el conjugado, simplifica la $h$ y escribe el cociente que queda.",
          before: "\\dfrac{f(x + h) - f(x)}{h} =",
          answer: `\\frac{${a}}{\\sqrt{${innerH}} + \\sqrt{${inner}}}`,
          vars: ["x", "h"],
          domain: [0.5, 4],
          validate: noHDen(),
        },
        { kind: "expr", prompt: "Haz $h \\to 0$.", before: "f'(x) =", answer: finalTex, vars: ["x"], domain: [0.5, 4], mistakes },
      ],
      hints: [
        "Sustituir $h = 0$ da $\\frac{0}{0}$. Multiplica arriba y abajo por el conjugado $\\sqrt{f(x+h)} + \\sqrt{f(x)}$.",
        "$(\\sqrt{A} - \\sqrt{B})(\\sqrt{A} + \\sqrt{B}) = A - B$.",
      ],
      solution: [
        `$\\dfrac{\\sqrt{${innerH}} - \\sqrt{${inner}}}{h} \\cdot \\dfrac{\\sqrt{${innerH}} + \\sqrt{${inner}}}{\\sqrt{${innerH}} + \\sqrt{${inner}}}$.`,
        `El numerador queda $(${innerH}) - (${inner}) = ${coef(a, "h")}$.`,
        `Simplificando $h$: $\\dfrac{${a}}{\\sqrt{${innerH}} + \\sqrt{${inner}}}$.`,
        `Con $h \\to 0$ las dos raíces son iguales: $f'(x) = \\dfrac{${a}}{2\\sqrt{${inner}}}${a % 2 === 0 ? ` = ${finalTex}` : ""}$.`,
      ],
    };
  },
};

const costoMarginal: ExerciseGen = {
  id: "costo-marginal",
  title: "Costo marginal por definición",
  level: 2,
  generate: (r) => {
    const c = r.pick([1, 2, 3]);
    const v = r.int(5, 30);
    const F = r.int(10, 60) * 10;
    const x0 = r.int(5, 25);
    const C = [c, v, F];
    const mg = 2 * c * x0 + v;
    const diff = pval(C, x0 + 1) - pval(C, x0);
    return {
      statement: `Una empresa tiene costo total $C(x) = ${poly(C)}$ (en dólares) al producir $x$ unidades. Calcula con la definición el costo marginal en $x = ${x0}$ y compáralo con el costo de producir la unidad número $${x0 + 1}$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: `Costo marginal $C'(${x0})$:`, before: `C'(${x0}) =`, answer: String(mg), mistakes: [{ answer: String(diff), feedback: "Ese es el costo exacto de la unidad siguiente. El marginal sale del límite con $h \\to 0$." }] },
        { kind: "expr", prompt: `Costo de la unidad siguiente, $C(${x0 + 1}) - C(${x0})$:`, before: `C(${x0 + 1}) - C(${x0}) =`, answer: String(diff) },
      ],
      hints: [
        `$\\dfrac{C(${x0} + h) - C(${x0})}{h}$ se simplifica a $${terms([[mg, ""], [c, "h"]])}$.`,
        "Para la segunda parte evalúa $C$ en los dos puntos y resta.",
      ],
      solution: [
        `$C(${x0} + h) - C(${x0}) = ${terms([[mg, "h"], [c, "h^{2}"]])}$, así que el cociente es $${terms([[mg, ""], [c, "h"]])}$.`,
        `$C'(${x0}) = ${mg}$ dólares por unidad.`,
        `$C(${x0 + 1}) - C(${x0}) = ${pval(C, x0 + 1)} - ${pval(C, x0)} = ${diff}$.`,
        `Los dos valores se parecen: el costo marginal aproxima lo que cuesta producir una unidad más. La diferencia, $${diff - mg}$, es el término $${coef(c, "h^{2}")}$ con $h = 1$.`,
      ],
    };
  },
};

const productoLineales: ExerciseGen = {
  id: "producto-lineales",
  title: "Derivada por definición de un producto de rectas",
  level: 2,
  exam: true,
  generate: (r) => {
    if (r.bool(0.5)) {
      const L = r.pick([["a", "b", "c", "d"], ["m", "n", "p", "q"], ["A", "B", "C", "D"]]);
      const [A, B, Cc, D] = L;
      const vars = ["x", ...L];
      return {
        statement: `Utilizando la definición, calcula la derivada de $g(x) = (${A}x + ${B})(${Cc}x + ${D})$, donde $${A}, ${B}, ${Cc}, ${D}$ son constantes.`,
        sequential: true,
        parts: [
          {
            kind: "expr",
            prompt: "Simplifica $\\dfrac{g(x + h) - g(x)}{h}$.",
            before: "\\dfrac{g(x + h) - g(x)}{h} =",
            answer: `${A}${Cc}(2x + h) + ${A}${D} + ${B}${Cc}`,
            vars: [...vars, "h"],
            validate: noHDen({ [A]: 1.1, [B]: 0.7, [Cc]: 1.3, [D]: -0.4 }),
          },
          { kind: "expr", prompt: "Haz $h \\to 0$.", before: "g'(x) =", answer: `2${A}${Cc}x + ${A}${D} + ${B}${Cc}`, vars },
        ],
        hints: [
          `Desarrolla primero: $g(x) = ${A}${Cc}x^2 + (${A}${D} + ${B}${Cc})x + ${B}${D}$.`,
          "Ahora es un polinomio de grado 2 con coeficientes literales. Trabaja igual que con números.",
        ],
        solution: [
          `$g(x) = ${A}${Cc}x^{2} + (${A}${D} + ${B}${Cc})x + ${B}${D}$.`,
          `$g(x + h) - g(x) = ${A}${Cc}(2xh + h^{2}) + (${A}${D} + ${B}${Cc})h$.`,
          `Dividiendo entre $h$: $${A}${Cc}(2x + h) + ${A}${D} + ${B}${Cc}$.`,
          `Con $h \\to 0$: $g'(x) = 2${A}${Cc}x + ${A}${D} + ${B}${Cc}$.`,
        ],
      };
    }
    const p = r.nz(-3, 3);
    const q = r.nz(-5, 5);
    const s1 = r.nz(-3, 3);
    const s2 = r.nz(-5, 5);
    const A2 = p * s1;
    const B1 = p * s2 + q * s1;
    return {
      statement: `Utilizando la definición, calcula la derivada de $g(x) = (${lineTex(p, q)})(${lineTex(s1, s2)})$.`,
      sequential: true,
      parts: [
        {
          kind: "expr",
          prompt: "Simplifica $\\dfrac{g(x + h) - g(x)}{h}$.",
          before: "\\dfrac{g(x + h) - g(x)}{h} =",
          answer: terms([[2 * A2, "x"], [A2, "h"], [B1, ""]]),
          vars: ["x", "h"],
          validate: noHDen(),
        },
        { kind: "expr", prompt: "Haz $h \\to 0$.", before: "g'(x) =", answer: lineTex(2 * A2, B1), vars: ["x"] },
      ],
      hints: [`Desarrolla primero el producto: $g(x) = ${poly([A2, B1, q * s2])}$.`],
      solution: [
        `$g(x) = ${poly([A2, B1, q * s2])}$.`,
        `$g(x + h) - g(x) = ${terms([[2 * A2, "xh"], [A2, "h^{2}"], [B1, "h"]])}$.`,
        `Dividiendo entre $h$ y haciendo $h \\to 0$: $g'(x) = ${lineTex(2 * A2, B1)}$.`,
      ],
    };
  },
};

const puntoConRaiz: ExerciseGen = {
  id: "punto-con-raiz",
  title: "Derivada en un punto con raíz (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const p = r.int(-3, 4);
    const s = r.pick([1, 2, 3]);
    const a = r.int(-2, 4);
    const c = s * s - a;
    const fTex = `${p === 0 ? "" : `${coef(p, "x")} + `}\\sqrt{${minus("x", -c)}}`;
    const fa = p * a + s;
    const ans = frac(2 * p * s + 1, 2 * s);
    return {
      statement: `Aplicando la definición $f'(x_1) = \\lim_{h \\to 0} \\dfrac{f(x_1 + h) - f(x_1)}{h}$, calcula $f'(${a})$ siendo $f(x) = ${fTex}$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Primero, el valor en el punto.", before: `f(${a}) =`, answer: String(fa) },
        {
          kind: "expr",
          prompt: "Separa el cociente, racionaliza la parte de la raíz y escríbelo sin $h$ en el denominador.",
          before: `\\dfrac{f(${a} + h) - f(${a})}{h} =`,
          answer: `${p} + \\frac{1}{\\sqrt{${s * s} + h} + ${s}}`,
          vars: ["h"],
          domain: [-0.5, 0.5],
          validate: noHDen(),
        },
        {
          kind: "expr",
          prompt: "Haz $h \\to 0$.",
          before: `f'(${a}) =`,
          answer: ans,
          mistakes: [{ answer: String(p), feedback: "Te faltó el aporte de la raíz. Después de racionalizar, esa parte tiende a $\\frac{1}{2\\sqrt{\\cdot}}$." }],
        },
      ],
      hints: [
        `$f(${a} + h) = ${p === 0 ? "" : `${coef(p, `(${a} + h)`)} + `}\\sqrt{${s * s} + h}$.`,
        `El cociente se separa en $${p}$ más $\\dfrac{\\sqrt{${s * s} + h} - ${s}}{h}$.`,
        `Multiplica esa fracción por $\\dfrac{\\sqrt{${s * s} + h} + ${s}}{\\sqrt{${s * s} + h} + ${s}}$.`,
      ],
      solution: [
        `$f(${a}) = ${p === 0 ? "" : `${p * a} + `}\\sqrt{${s * s}} = ${fa}$ y $f(${a} + h) = ${p === 0 ? "" : `${terms([[p * a, ""], [p, "h"]])} + `}\\sqrt{${s * s} + h}$.`,
        `$\\dfrac{f(${a} + h) - f(${a})}{h} = ${p === 0 ? "" : `\\dfrac{${coef(p, "h")}}{h} + `}\\dfrac{\\sqrt{${s * s} + h} - ${s}}{h}$.`,
        `Racionalizando: $\\dfrac{(${s * s} + h) - ${s * s}}{h(\\sqrt{${s * s} + h} + ${s})} = \\dfrac{1}{\\sqrt{${s * s} + h} + ${s}}$.`,
        `Con $h \\to 0$: $f'(${a}) = ${p} + \\dfrac{1}{${2 * s}} = ${ans}$.`,
      ],
    };
  },
};

const inversaRaiz: ExerciseGen = {
  id: "inversa-raiz",
  title: "Derivada por definición de 1 entre raíz (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const k = r.pick([1, 1, 2, 4]);
    const c = r.int(-3, 3);
    const s = r.pick([1, 2, 2, 3]);
    const inner = minus("x", -c);
    const innerH = c === 0 ? "x + h" : `x + h ${signed(c)}`;
    const slope = frac(-k, 2 * s ** 3);
    const x0 = s * s - c;
    const kp = k === 1 ? "" : String(k);
    const D = [1 - c, 6 - c] as [number, number];
    return {
      statement: `Dada $f(x) = \\dfrac{${k}}{\\sqrt{${inner}}}$, calcula la derivada por definición y luego determina el valor de $x$ para el cual la pendiente de la tangente es $${slope}$.`,
      sequential: true,
      parts: [
        {
          kind: "expr",
          prompt: "Derivada por definición:",
          before: "f'(x) =",
          answer: `\\frac{${-k}}{2(${inner})\\sqrt{${inner}}}`,
          vars: ["x"],
          domain: D,
          mistakes: [{ answer: `\\frac{${k}}{2(${inner})\\sqrt{${inner}}}`, feedback: "Revisa el signo: al restar $f(x+h) - f(x)$, el numerador queda $\\sqrt{x+c} - \\sqrt{x+h+c}$, que es negativo para $h > 0$." }],
        },
        { kind: "expr", prompt: `¿Para qué $x$ vale $${slope}$ la pendiente?`, before: "x =", answer: String(x0) },
      ],
      hints: [
        `Resta las fracciones: $\\dfrac{${k}}{\\sqrt{${innerH}}} - \\dfrac{${k}}{\\sqrt{${inner}}} = \\dfrac{${kp}(\\sqrt{${inner}} - \\sqrt{${innerH}})}{\\sqrt{${innerH}}\\,\\sqrt{${inner}}}$.`,
        "Multiplica por el conjugado $\\sqrt{x + c} + \\sqrt{x + h + c}$. El numerador queda $-h$ por una constante.",
        `Para la segunda parte, iguala $f'(x)$ a $${slope}$. Te conviene llamar $u = \\sqrt{${inner}}$.`,
      ],
      solution: [
        `$\\dfrac{f(x+h) - f(x)}{h} = \\dfrac{${kp}(\\sqrt{${inner}} - \\sqrt{${innerH}})}{h\\sqrt{${innerH}}\\,\\sqrt{${inner}}}$.`,
        `Por el conjugado, $\\sqrt{${inner}} - \\sqrt{${innerH}} = \\dfrac{-h}{\\sqrt{${inner}} + \\sqrt{${innerH}}}$. Se cancela $h$ y queda $\\dfrac{${-k}}{\\sqrt{${innerH}}\\,\\sqrt{${inner}}\\,(\\sqrt{${inner}} + \\sqrt{${innerH}})}$.`,
        `Con $h \\to 0$: $f'(x) = \\dfrac{${-k}}{(${inner}) \\cdot 2\\sqrt{${inner}}} = \\dfrac{${-k}}{2(${inner})^{3/2}}$.`,
        `Si $u = \\sqrt{${inner}}$, la ecuación es $\\dfrac{${-k}}{2u^3} = ${slope}$, así que $u^3 = ${s ** 3}$, $u = ${s}$ y $${inner} = ${s * s}$. Resultado: $x = ${x0}$.`,
      ],
    };
  },
};

const lnExp: ExerciseGen = {
  id: "ln-exp-definicion",
  title: "Logaritmo y exponencial por definición (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    if (r.bool(0.65)) {
      const a = r.pick([-1, -1, 1, 2, -2, 3]);
      let b: number;
      do b = a < 0 ? r.int(1, 5) : r.int(-3, 4); while (Math.abs(a) > 1 && b % a === 0);
      const inner = terms([[a, "x"], [b, ""]]);
      const z = -b / a;
      const D = (a > 0 ? [z + 0.5, z + 4] : [z - 4, z - 0.5]) as [number, number];
      const mistakes = a !== 1 ? [{ answer: `\\frac{1}{${inner}}`, feedback: `Te faltó el factor $${a}$ que aparece al escribir $f(x+h)$: el argumento cambia en $${coef(a, "h")}$, no en $h$.` }] : [];
      return {
        statement: `Si $f(x) = \\ln(${inner})$, determina $f'(x) = \\lim_{h \\to 0} \\dfrac{f(x+h) - f(x)}{h}$.`,
        sequential: true,
        parts: [
          {
            kind: "expr",
            prompt: "Usa $\\ln A - \\ln B = \\ln \\frac{A}{B}$ y completa:",
            before: "f(x + h) - f(x) = \\ln(1 +",
            after: ")",
            answer: `\\frac{${coef(a, "h")}}{${inner}}`,
            vars: ["x", "h"],
            domain: D,
          },
          { kind: "expr", prompt: "Calcula el límite.", before: "f'(x) =", answer: `\\frac{${a}}{${inner}}`, vars: ["x"], domain: D, mistakes },
        ],
        hints: [
          `$\\dfrac{${terms([[a, "x"], [a, "h"], [b, ""]])}}{${inner}} = 1 + \\dfrac{${coef(a, "h")}}{${inner}}$.`,
          "Usa el límite notable $\\lim_{u \\to 0} \\dfrac{\\ln(1 + u)}{u} = 1$, que sale de $\\lim_{u \\to 0} (1 + u)^{1/u} = e$.",
          `Llama $u = \\dfrac{${coef(a, "h")}}{${inner}}$ y escribe $\\dfrac{\\ln(1+u)}{h} = \\dfrac{\\ln(1+u)}{u} \\cdot \\dfrac{u}{h}$.`,
        ],
        solution: [
          `$f(x+h) - f(x) = \\ln\\dfrac{${terms([[a, "x"], [a, "h"], [b, ""]])}}{${inner}} = \\ln\\left(1 + \\dfrac{${coef(a, "h")}}{${inner}}\\right)$.`,
          `Con $u = \\dfrac{${coef(a, "h")}}{${inner}}$, que tiende a $0$ cuando $h \\to 0$: $\\dfrac{\\ln(1+u)}{h} = \\dfrac{\\ln(1+u)}{u} \\cdot \\dfrac{${a}}{${inner}}$.`,
          `El primer factor tiende a $1$, así que $f'(x) = \\dfrac{${a}}{${inner}}$.`,
        ],
      };
    }
    const k = r.pick([2, 3, -1, -2]);
    const e = `e^{${coef(k, "x")}}`;
    return {
      statement: `Si $f(x) = ${e}$, determina $f'(x) = \\lim_{h \\to 0} \\dfrac{f(x+h) - f(x)}{h}$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: `Saca $${e}$ factor común y completa:`, before: `f(x + h) - f(x) = ${e}(`, after: ")", answer: `e^{${coef(k, "h")}} - 1`, vars: ["x", "h"], domain: [-1, 1] },
        {
          kind: "expr",
          prompt: "Calcula el límite.",
          before: "f'(x) =",
          answer: coef(k, `e^{${coef(k, "x")}}`),
          vars: ["x"],
          domain: [-1, 1],
          mistakes: [{ answer: e, feedback: `Falta el factor $${k}$: $\\dfrac{e^{${coef(k, "h")}} - 1}{h} \\to ${k}$, no $1$.` }],
        },
      ],
      hints: [
        `$e^{${k}(x + h)} = ${e} \\cdot e^{${coef(k, "h")}}$.`,
        "Usa el límite notable $\\lim_{u \\to 0} \\dfrac{e^u - 1}{u} = 1$ con $u = " + coef(k, "h") + "$.",
      ],
      solution: [
        `$f(x+h) - f(x) = ${e} \\cdot e^{${coef(k, "h")}} - ${e} = ${e}(e^{${coef(k, "h")}} - 1)$.`,
        `$\\dfrac{e^{${coef(k, "h")}} - 1}{h} = ${k} \\cdot \\dfrac{e^{${coef(k, "h")}} - 1}{${coef(k, "h")}} \\to ${k} \\cdot 1$.`,
        `$f'(x) = ${coef(k, `e^{${coef(k, "x")}}`)}$.`,
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("derivada-definicion"),
  objectives: [
    "Calcular e interpretar la tasa media de cambio como pendiente de una secante.",
    "Entender la derivada como la pendiente de la recta tangente y como tasa de cambio instantánea.",
    "Calcular $f'(a)$ y $f'(x)$ con el límite $\\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$ en polinomios, fracciones, raíces y logaritmos.",
    "Leer la derivada en economía como costo, ingreso o utilidad marginal.",
  ],
  sections: [
    {
      id: "tasa-media",
      title: "Cuánto cambia, en promedio",
      blocks: [
        {
          type: "text",
          md: "Si un producto costaba 40 dólares hace 2 meses y hoy cuesta 46, el precio subió 6 dólares en 2 meses: 3 dólares por mes en promedio. Esa cuenta, cambio de la salida entre cambio de la entrada, es la tasa media de cambio.",
        },
        {
          type: "definition",
          title: "Tasa media de cambio",
          md: "La tasa media de cambio de $f$ entre $x = a$ y $x = b$ es\n\n$$\\text{TMC} = \\frac{f(b) - f(a)}{b - a} = \\frac{\\Delta y}{\\Delta x}$$\n\nGráficamente es la pendiente de la recta **secante** que une los puntos $(a, f(a))$ y $(b, f(b))$.",
        },
        {
          type: "example",
          title: "Una tasa media",
          problem: "Calcula la tasa media de cambio de $f(x) = x^2$ entre $x = 1$ y $x = 3$.",
          steps: ["$f(1) = 1$ y $f(3) = 9$.", "$\\text{TMC} = \\dfrac{9 - 1}{3 - 1} = \\dfrac{8}{2} = 4$."],
          answer: "En promedio la función sube $4$ por cada unidad que avanza $x$ en ese tramo.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Costo promedio de las unidades adicionales",
          md: "Si $C(x)$ es el costo de producir $x$ unidades, $\\frac{C(120) - C(100)}{20}$ es lo que cuesta, en promedio, cada una de las 20 unidades extra. Es la tasa media de cambio del costo.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula la tasa media de cambio de $f(x) = x^2 + 1$ entre $x = 0$ y $x = 2$.",
            parts: [{ kind: "expr", before: "\\text{TMC} =", answer: "2", mistakes: [{ answer: "4", feedback: "Eso es el cambio $f(2) - f(0)$. Falta dividir entre $2 - 0$." }] }],
            solution: ["$\\frac{f(2) - f(0)}{2 - 0} = \\frac{5 - 1}{2} = 2$."],
          },
        },
      ],
    },
    {
      id: "tangente",
      title: "De la secante a la tangente",
      blocks: [
        {
          type: "text",
          md: "La tasa media habla de un tramo. Muchas veces interesa el cambio en un instante: la velocidad que marca el velocímetro ahora, no la promedio del viaje. Para eso se acerca el segundo punto al primero.\n\nToma el punto $(a, f(a))$ y otro un poco más allá, $(a + h, f(a + h))$. La secante que los une tiene pendiente\n\n$$\\frac{f(a + h) - f(a)}{h}$$\n\nMueve $h$ hacia cero en el widget y mira cómo la secante gira hasta quedar pegada a la curva en un solo punto. Esa posición límite es la recta tangente.",
        },
        { type: "widget", widget: { kind: "secant", fn: "x^{2}", a: 1, x: [-2, 4], y: [-1, 9] }, caption: "Con $f(x) = x^2$ y $a = 1$, la pendiente de la secante es $2 + h$ y tiende a $2$." },
        {
          type: "table",
          headers: ["$h$", "$1$", "$0{,}5$", "$0{,}1$", "$0{,}01$", "$0{,}001$"],
          rows: [["Pendiente de la secante", "$3$", "$2{,}5$", "$2{,}1$", "$2{,}01$", "$2{,}001$"]],
          caption: "Para $f(x) = x^2$ en $a = 1$, las pendientes se acercan a $2$.",
        },
        {
          type: "definition",
          title: "Recta tangente",
          md: "La recta tangente a la gráfica de $f$ en $(a, f(a))$ es la recta que pasa por ese punto y tiene pendiente\n\n$$m = \\lim_{h \\to 0} \\frac{f(a + h) - f(a)}{h}$$\n\nsiempre que ese límite exista y sea finito.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Para $f(x) = x^2$ en $a = 1$, ¿cuál es la pendiente de la secante con $h = 0{,}2$?",
            parts: [{ kind: "expr", answer: "2.2", before: "m =" }],
            solution: ["$\\frac{(1{,}2)^2 - 1}{0{,}2} = \\frac{0{,}44}{0{,}2} = 2{,}2$. Es $2 + h$ con $h = 0{,}2$."],
          },
        },
      ],
    },
    {
      id: "en-un-punto",
      title: "La derivada en un punto",
      blocks: [
        {
          type: "definition",
          title: "Derivada de $f$ en $x = a$",
          md: "$f$ es **derivable** en $a$ si existe y es finito el límite\n\n$$f'(a) = \\lim_{h \\to 0} \\frac{f(a + h) - f(a)}{h}$$\n\nEse número se llama derivada de $f$ en $a$. Es la pendiente de la tangente en $(a, f(a))$ y la tasa de cambio instantánea de $f$ en ese punto.\n\nUna forma equivalente, con $x = a + h$, es $f'(a) = \\lim_{x \\to a} \\dfrac{f(x) - f(a)}{x - a}$.",
        },
        {
          type: "text",
          md: "Al sustituir $h = 0$ directamente siempre sale $\\frac{0}{0}$. El trabajo consiste en transformar el cociente hasta poder cancelar la $h$ del denominador. El procedimiento tiene cuatro pasos:\n\n- Calcula $f(a + h)$ sustituyendo $x$ por $a + h$ en la fórmula.\n- Resta $f(a)$ y simplifica.\n- Divide entre $h$ y cancela. Si hay raíces, racionaliza. Si hay fracciones, saca común denominador.\n- Haz $h \\to 0$.",
        },
        {
          type: "example",
          title: "Un polinomio",
          problem: "Calcula $f'(2)$ si $f(x) = x^2 - 3x$.",
          steps: [
            "$f(2 + h) = (2 + h)^2 - 3(2 + h) = 4 + 4h + h^2 - 6 - 3h = h^2 + h - 2$.",
            "$f(2) = 4 - 6 = -2$, así que $f(2 + h) - f(2) = h^2 + h$.",
            "$\\dfrac{h^2 + h}{h} = h + 1$.",
            "$f'(2) = \\lim_{h \\to 0} (h + 1) = 1$.",
          ],
          answer: "$f'(2) = 1$. Cerca de $x = 2$ la función sube más o menos lo mismo que avanza $x$.",
        },
        {
          type: "example",
          title: "Con raíz, tipo parcial",
          problem: "Aplicando la definición, calcula $f'(1)$ siendo $f(x) = 2x + \\sqrt{x + 3}$.",
          steps: [
            "$f(1) = 2 + \\sqrt{4} = 4$ y $f(1 + h) = 2 + 2h + \\sqrt{4 + h}$.",
            "$\\dfrac{f(1+h) - f(1)}{h} = \\dfrac{2h + \\sqrt{4 + h} - 2}{h} = 2 + \\dfrac{\\sqrt{4 + h} - 2}{h}$.",
            "Racionalizamos la fracción: $\\dfrac{\\sqrt{4 + h} - 2}{h} \\cdot \\dfrac{\\sqrt{4 + h} + 2}{\\sqrt{4 + h} + 2} = \\dfrac{4 + h - 4}{h(\\sqrt{4 + h} + 2)} = \\dfrac{1}{\\sqrt{4 + h} + 2}$.",
            "$f'(1) = 2 + \\lim_{h \\to 0} \\dfrac{1}{\\sqrt{4 + h} + 2} = 2 + \\dfrac{1}{4}$.",
          ],
          answer: "$f'(1) = \\frac{9}{4}$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Los dos errores que más restan puntos",
          md: "Sustituir $h = 0$ antes de simplificar, que da $\\frac{0}{0}$ y no lleva a nada. Y escribir $f(a + h) = f(a) + h$, que es falso: hay que meter $a + h$ dentro de la fórmula. Por ejemplo, si $f(x) = x^2$, $f(2 + h) = (2 + h)^2$, no $4 + h$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Con la definición, calcula $f'(3)$ si $f(x) = x^2$.",
            parts: [{ kind: "expr", before: "f'(3) =", answer: "6", mistakes: [{ answer: "9", feedback: "Eso es $f(3)$. La derivada sale del límite del cociente: $\\frac{(3+h)^2 - 9}{h} = 6 + h$." }] }],
            solution: ["$\\frac{(3 + h)^2 - 9}{h} = \\frac{6h + h^2}{h} = 6 + h \\to 6$."],
          },
        },
      ],
    },
    {
      id: "funcion-derivada",
      title: "La función derivada y sus notaciones",
      blocks: [
        {
          type: "text",
          md: "En lugar de repetir la cuenta para cada punto, se hace una sola vez con un $x$ cualquiera. El resultado es una nueva función, $f'$, que a cada $x$ le asigna la pendiente de la tangente en ese punto.",
        },
        {
          type: "definition",
          title: "Función derivada",
          md: "$$f'(x) = \\lim_{h \\to 0} \\frac{f(x + h) - f(x)}{h}$$\n\nSu dominio son los $x$ donde ese límite existe y es finito.",
        },
        {
          type: "example",
          title: "La derivada de un polinomio",
          problem: "Calcula por definición la derivada de $f(x) = 3x^2 - 5x + 1$.",
          steps: [
            "$f(x + h) = 3(x + h)^2 - 5(x + h) + 1 = 3x^2 + 6xh + 3h^2 - 5x - 5h + 1$.",
            "$f(x + h) - f(x) = 6xh + 3h^2 - 5h = h(6x + 3h - 5)$.",
            "$\\dfrac{f(x + h) - f(x)}{h} = 6x + 3h - 5$.",
            "$f'(x) = \\lim_{h \\to 0} (6x + 3h - 5) = 6x - 5$.",
          ],
          answer: "$f'(x) = 6x - 5$. Por ejemplo, $f'(2) = 7$ y $f'(0) = -5$.",
        },
        {
          type: "widget",
          widget: { kind: "tangent", fn: "x^{3} - 3x", x: [-3, 3], y: [-5, 5], showAnalysis: true, derivative: "3x^{2} - 3" },
          caption: "Mueve el punto. Donde la tangente sube, $f'(x) > 0$. Donde baja, $f'(x) < 0$. En $x = \\pm 1$ la tangente es horizontal.",
        },
        {
          type: "table",
          headers: ["Notación", "Se lee", "Quién la usa"],
          rows: [
            ["$f'(x)$", "efe prima de equis", "Lagrange, la más común en el curso"],
            ["$y'$", "ye prima", "Cuando la función se escribe $y = \\dots$"],
            ["$\\dfrac{dy}{dx}$, $\\dfrac{df}{dx}$", "derivada de $y$ respecto de $x$", "Leibniz, útil en economía y en la regla de la cadena"],
            ["$D_x f$", "derivada de $f$ respecto de $x$", "Algunos libros"],
          ],
        },
        {
          type: "note",
          tone: "econ",
          title: "Lo marginal es la derivada",
          md: "En economía, la derivada recibe el nombre de **marginal**. Si $C(x)$ es el costo total, $C'(x)$ es el costo marginal: cuánto aumenta el costo por cada unidad adicional cuando la producción está en $x$. Igual con el ingreso marginal $I'(x)$ y la utilidad marginal $U'(x)$. Como la unidad es pequeña frente a la producción total, $C'(x) \\approx C(x + 1) - C(x)$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Con la definición, calcula la derivada de $f(x) = x^2 + 4x$.",
            parts: [{ kind: "expr", before: "f'(x) =", answer: "2x + 4", vars: ["x"], mistakes: [{ answer: "x + 4", feedback: "$(x + h)^2 = x^2 + 2xh + h^2$: el término cruzado lleva un $2$." }] }],
            solution: ["$\\frac{(x+h)^2 + 4(x+h) - x^2 - 4x}{h} = \\frac{2xh + h^2 + 4h}{h} = 2x + h + 4 \\to 2x + 4$."],
          },
        },
      ],
    },
    {
      id: "fracciones-raices",
      title: "Fracciones y raíces: común denominador y conjugado",
      blocks: [
        {
          type: "text",
          md: "Con polinomios la $h$ sale sola al desarrollar. Con fracciones y raíces hace falta un truco algebraico antes de poder cancelarla:\n\n- **Fracciones**: resta con común denominador. En el numerador aparece un factor $h$.\n- **Raíces**: multiplica arriba y abajo por el conjugado. El producto $(\\sqrt{A} - \\sqrt{B})(\\sqrt{A} + \\sqrt{B}) = A - B$ elimina las raíces del numerador.",
        },
        {
          type: "example",
          title: "Una fracción",
          problem: "Calcula por definición la derivada de $f(x) = \\dfrac{1}{x + 2}$.",
          steps: [
            "$f(x + h) - f(x) = \\dfrac{1}{x + h + 2} - \\dfrac{1}{x + 2} = \\dfrac{(x + 2) - (x + h + 2)}{(x + h + 2)(x + 2)} = \\dfrac{-h}{(x + h + 2)(x + 2)}$.",
            "Dividiendo entre $h$: $\\dfrac{-1}{(x + h + 2)(x + 2)}$.",
            "Con $h \\to 0$: $f'(x) = \\dfrac{-1}{(x + 2)^2}$.",
          ],
        },
        {
          type: "example",
          title: "Una raíz, tipo parcial",
          problem: "Calcula por definición la derivada de $g(x) = \\sqrt{2x + 1}$.",
          steps: [
            "$\\dfrac{g(x + h) - g(x)}{h} = \\dfrac{\\sqrt{2x + 2h + 1} - \\sqrt{2x + 1}}{h}$.",
            "Multiplicamos por $\\dfrac{\\sqrt{2x + 2h + 1} + \\sqrt{2x + 1}}{\\sqrt{2x + 2h + 1} + \\sqrt{2x + 1}}$. El numerador queda $(2x + 2h + 1) - (2x + 1) = 2h$.",
            "Cancelando $h$: $\\dfrac{2}{\\sqrt{2x + 2h + 1} + \\sqrt{2x + 1}}$.",
            "Con $h \\to 0$: $g'(x) = \\dfrac{2}{2\\sqrt{2x + 1}} = \\dfrac{1}{\\sqrt{2x + 1}}$.",
          ],
        },
        {
          type: "example",
          title: "Fracción y raíz a la vez",
          problem: "Calcula por definición la derivada de $f(x) = \\dfrac{1}{\\sqrt{x}}$.",
          steps: [
            "Común denominador: $\\dfrac{1}{\\sqrt{x + h}} - \\dfrac{1}{\\sqrt{x}} = \\dfrac{\\sqrt{x} - \\sqrt{x + h}}{\\sqrt{x}\\sqrt{x + h}}$.",
            "Conjugado: $\\sqrt{x} - \\sqrt{x + h} = \\dfrac{x - (x + h)}{\\sqrt{x} + \\sqrt{x + h}} = \\dfrac{-h}{\\sqrt{x} + \\sqrt{x + h}}$.",
            "Dividiendo entre $h$: $\\dfrac{-1}{\\sqrt{x}\\sqrt{x + h}(\\sqrt{x} + \\sqrt{x + h})}$.",
            "Con $h \\to 0$: $f'(x) = \\dfrac{-1}{\\sqrt{x} \\cdot \\sqrt{x} \\cdot 2\\sqrt{x}} = \\dfrac{-1}{2x\\sqrt{x}}$.",
          ],
          answer: "$f'(x) = -\\dfrac{1}{2x\\sqrt{x}}$. Por ejemplo, la pendiente vale $-\\frac{1}{16}$ cuando $x = 4$.",
        },
        {
          type: "example",
          title: "Una raíz con parámetro",
          problem: "Halla por definición la derivada de $f(x) = \\sqrt{ax^3}$, con $a > 0$ y $x > 0$.",
          steps: [
            "Conjugado: $\\sqrt{a(x+h)^3} - \\sqrt{ax^3} = \\dfrac{a[(x+h)^3 - x^3]}{\\sqrt{a(x+h)^3} + \\sqrt{ax^3}}$.",
            "$(x + h)^3 - x^3 = 3x^2h + 3xh^2 + h^3 = h(3x^2 + 3xh + h^2)$.",
            "Dividiendo entre $h$: $\\dfrac{a(3x^2 + 3xh + h^2)}{\\sqrt{a(x+h)^3} + \\sqrt{ax^3}}$.",
            "Con $h \\to 0$: $f'(x) = \\dfrac{3ax^2}{2\\sqrt{ax^3}} = \\dfrac{3ax^2}{2x\\sqrt{ax}} = \\dfrac{3}{2}\\sqrt{ax}$.",
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "El conjugado va arriba y abajo",
          md: "Multiplicar solo el numerador por el conjugado cambia la expresión. Se multiplica por una fracción que vale $1$, con el conjugado en el numerador y en el denominador. Y en el denominador no lo desarrolles: déjalo multiplicado, que ahí está la $h$ que vas a cancelar.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Con la definición, calcula la derivada de $f(x) = \\sqrt{x}$.",
            parts: [{ kind: "expr", before: "f'(x) =", answer: "\\frac{1}{2\\sqrt{x}}", vars: ["x"], domain: [0.5, 4], mistakes: [{ answer: "\\frac{1}{\\sqrt{x}}", feedback: "Al hacer $h \\to 0$, el denominador $\\sqrt{x + h} + \\sqrt{x}$ queda $2\\sqrt{x}$." }] }],
            solution: ["$\\frac{\\sqrt{x+h} - \\sqrt{x}}{h} = \\frac{1}{\\sqrt{x+h} + \\sqrt{x}} \\to \\frac{1}{2\\sqrt{x}}$."],
          },
        },
      ],
    },
    {
      id: "logaritmos",
      title: "Logaritmos y exponenciales por definición",
      blocks: [
        {
          type: "text",
          md: "Para estas funciones no alcanza con álgebra. Hacen falta dos límites notables que salen del número $e$:\n\n$$\\lim_{u \\to 0} \\frac{\\ln(1 + u)}{u} = 1 \\qquad \\lim_{u \\to 0} \\frac{e^u - 1}{u} = 1$$\n\nEl primero viene de $\\frac{\\ln(1+u)}{u} = \\ln (1 + u)^{1/u}$ y de que $(1 + u)^{1/u} \\to e$. El segundo se obtiene del primero cambiando $e^u - 1 = t$.",
        },
        {
          type: "example",
          title: "Un logaritmo, tipo parcial",
          problem: "Sea $f(x) = \\ln(2 - x)$. Halla la derivada por definición.",
          steps: [
            "$f(x + h) - f(x) = \\ln(2 - x - h) - \\ln(2 - x) = \\ln \\dfrac{2 - x - h}{2 - x} = \\ln\\left(1 - \\dfrac{h}{2 - x}\\right)$.",
            "Llamamos $u = -\\dfrac{h}{2 - x}$. Cuando $h \\to 0$, también $u \\to 0$.",
            "$\\dfrac{f(x + h) - f(x)}{h} = \\dfrac{\\ln(1 + u)}{h} = \\dfrac{\\ln(1 + u)}{u} \\cdot \\dfrac{u}{h} = \\dfrac{\\ln(1 + u)}{u} \\cdot \\dfrac{-1}{2 - x}$.",
            "El primer factor tiende a $1$: $f'(x) = \\dfrac{-1}{2 - x} = \\dfrac{1}{x - 2}$.",
          ],
          answer: "$f'(x) = \\dfrac{1}{x - 2}$, para $x < 2$.",
        },
        {
          type: "example",
          title: "La exponencial",
          problem: "Halla por definición la derivada de $f(x) = e^x$.",
          steps: [
            "$\\dfrac{e^{x + h} - e^x}{h} = \\dfrac{e^x(e^h - 1)}{h} = e^x \\cdot \\dfrac{e^h - 1}{h}$.",
            "La fracción tiende a $1$ por el límite notable.",
          ],
          answer: "$f'(x) = e^x$. La exponencial es su propia derivada.",
        },
        {
          type: "note",
          tone: "tip",
          title: "El orden importa al usar la propiedad del logaritmo",
          md: "$\\ln A - \\ln B = \\ln \\frac{A}{B}$. Pon $f(x + h)$ arriba y $f(x)$ abajo, y escribe el cociente como $1 + \\text{algo}$. Ese \"algo\" es la $u$ del límite notable.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Si $f(x) = \\ln x$, la definición da $f'(x) = \\lim_{h \\to 0} \\dfrac{\\ln(1 + h/x)}{h}$. ¿Cuánto vale?",
            parts: [{ kind: "expr", before: "f'(x) =", answer: "\\frac{1}{x}", vars: ["x"], domain: [0.5, 4] }],
            solution: ["Con $u = \\frac{h}{x}$: $\\frac{\\ln(1+u)}{u} \\cdot \\frac{1}{x} \\to \\frac{1}{x}$."],
          },
        },
        {
          type: "quick",
          exercise: {
            statement: "Si $f$ es derivable en $x_0$, el número $f'(x_0)$ es la ecuación de la recta tangente en $(x_0, f(x_0))$. ¿Verdadero o falso?",
            parts: [trueFalse(false, "$f'(x_0)$ es un número: la pendiente de la tangente. La ecuación de la recta es $y = f(x_0) + f'(x_0)(x - x_0)$.")],
            solution: ["Falso. La derivada da la pendiente, no la recta completa."],
          },
        },
      ],
    },
  ],
  exercises: [
    tasaMedia,
    leerTangente,
    derivadaPunto,
    notacion,
    derivadaPolinomio,
    derivadaRacional,
    derivadaRaiz,
    costoMarginal,
    productoLineales,
    puntoConRaiz,
    inversaRaiz,
    lnExp,
  ],
};

export default topic;
