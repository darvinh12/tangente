import { meta } from "../catalog";
import { choice, trueFalse } from "../helpers";
import type { ExerciseGen, GraphSpec, Part, Rich, Topic } from "../types";
import { coef, frac, minus, poly, signed, terms } from "@/lib/math/tex";
import type { Rng } from "@/lib/math/rng";

/* ----------------------------- utilidades locales ----------------------------- */

/** Producto de polinomios dados por coeficientes de mayor a menor grado. */
function pmul(a: number[], b: number[]): number[] {
  const out = Array(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => (out[i + j] += x * y)));
  return out;
}

/** Suma una constante a una expresión LaTeX: "\\frac{2}{x}" y -3 -> "\\frac{2}{x} - 3" */
const plusConst = (tex: string, c: number) => (c === 0 ? tex : `${tex} ${signed(c)}`);

const lim = (to: string) => `\\lim_{x \\to ${to}}`;
const inf = (s: number) => (s > 0 ? "+\\infty" : "-\\infty");
const lineTex = (m: number, b: number) => terms([[m, "x"], [b, ""]]);
/** " + \\frac{c}{den}" con el signo bien puesto, o "" si c = 0. */
const sfrac = (c: number, den: string) => (c === 0 ? "" : ` ${c > 0 ? "+" : "-"} \\frac{${Math.abs(c)}}{${den}}`);
const sdfrac = (c: number, den: string) => (c === 0 ? "" : ` ${c > 0 ? "+" : "-"} \\dfrac{${Math.abs(c)}}{${den}}`);
/** "- 2x" o "+ 2x" para restar mx. */
const minusMx = (m: number) => (m === 0 ? "" : m > 0 ? ` - ${coef(m, "x")}` : ` + ${coef(-m, "x")}`);

/** Opción múltiple con gráficas. Baraja aquí y rotula A, B, C, D en orden. */
function graphChoice(r: Rng, correct: GraphSpec, wrong: { graph: GraphSpec; feedback: Rich }[], prompt?: Rich): Part {
  const all = r.shuffle([{ graph: correct, feedback: undefined as Rich | undefined, ok: true }, ...wrong.map((w) => ({ ...w, ok: false }))]);
  return {
    kind: "choice",
    prompt,
    shuffle: false,
    options: all.map((o, i) => ({
      label: `Gráfica ${"ABCDE"[i]}`,
      correct: o.ok || undefined,
      feedback: o.ok ? undefined : o.feedback,
      graph: o.graph,
    })),
  };
}

/** Gráfica de L + c/(x-a)^p con sus asíntotas punteadas. */
function hyperGraph(L: number, c: number, a: number, p: 1 | 2): GraphSpec {
  const den = p === 1 ? minus("x", a) : `(${minus("x", a)})^{2}`;
  return {
    x: [-8, 8],
    y: [-8, 8],
    height: 240,
    curves: [{ fn: plusConst(`\\frac{${c}}{${den}}`, L), breaks: [a], color: "accent" }],
    vlines: [{ x: a, dashed: true, color: "muted" }],
    hlines: [{ y: L, dashed: true, color: "muted" }],
  };
}

/* ----------------------------------- ejercicios ----------------------------------- */

const avRacional: ExerciseGen = {
  id: "av-racional",
  title: "Asíntotas verticales de una racional",
  level: 1,
  generate: (r) => {
    const [a, b] = r.sample([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5], 2).sort((x, y) => x - y);
    const cancel = r.bool(0.5);
    let p: number;
    if (cancel) p = r.pick([a, b]);
    else do p = r.int(-5, 5); while (p === a || p === b);
    const av = cancel ? [p === a ? b : a] : [a, b];
    const den = poly([1, -(a + b), a * b]);
    const mistakes: { answer: number[]; feedback: Rich }[] = [];
    if (cancel) mistakes.push({ answer: [a, b], feedback: `En $x = ${p}$ también se anula el numerador. Al simplificar el factor $(${minus("x", p)})$ desaparece y queda un hueco, no una asíntota.` });
    else mistakes.push({ answer: [p], feedback: `$x = ${p}$ anula el numerador, así que ahí la función vale $0$. Las asíntotas verticales salen del denominador.` });
    return {
      statement: `Halla las asíntotas verticales de $f(x) = \\dfrac{${minus("x", p)}}{${den}}$. Escribe el conjunto de los valores de $x$ donde hay asíntota vertical.`,
      parts: [{ kind: "set", before: "x \\in", answer: av, mistakes }],
      hints: [
        "Factoriza el denominador y busca dónde se anula.",
        "Si un factor del denominador también está en el numerador, simplifícalo antes de decidir.",
      ],
      solution: [
        `El denominador se factoriza como $(${minus("x", a)})(${minus("x", b)})$, que se anula en $x = ${a}$ y $x = ${b}$.`,
        cancel
          ? `Para $x \\neq ${p}$ se simplifica: $f(x) = \\dfrac{1}{${minus("x", av[0])}}$. En $x = ${p}$ el límite es finito, así que hay un hueco y no una asíntota.`
          : `El numerador vale $${a - p}$ en $x = ${a}$ y $${b - p}$ en $x = ${b}$, ambos distintos de cero. En ambos puntos el cociente es "número distinto de cero entre algo que tiende a cero", que se va a infinito.`,
        `Asíntotas verticales: ${av.map((v) => `$x = ${v}$`).join(" y ")}.`,
      ],
    };
  },
};

const ahRacional: ExerciseGen = {
  id: "ah-racional",
  title: "Asíntota horizontal de una racional",
  level: 1,
  generate: (r) => {
    const kind = r.pick(["igual", "igual", "menor"] as const);
    if (kind === "igual") {
      let a: number, d: number, c: number, f: number;
      do {
        d = r.nz(-4, 5);
        a = r.nz(-6, 6);
        c = r.nz(-6, 6);
        f = r.nz(-6, 6);
      } while (a === 0 || a * f === c * d);
      const bcoef = r.int(-5, 5);
      const ecoef = r.int(-5, 5);
      const num = poly([a, bcoef, c]);
      const den = poly([d, ecoef, f]);
      return {
        statement: `Halla la asíntota horizontal de $f(x) = \\dfrac{${num}}{${den}}$.`,
        parts: [
          {
            kind: "expr",
            before: "y =",
            answer: frac(a, d),
            mistakes: [{ answer: frac(c, f), feedback: "Dividiste los términos independientes. Cuando $x$ crece mandan los términos de mayor grado, no las constantes." }],
          },
        ],
        hints: [
          "Divide numerador y denominador entre $x^2$, la mayor potencia del denominador.",
          "Cuando $x \\to \\pm\\infty$, los términos $\\frac{1}{x}$ y $\\frac{1}{x^2}$ tienden a cero.",
        ],
        solution: [
          "Numerador y denominador tienen grado 2. Dividimos todo entre $x^2$.",
          `$$${lim("\\pm\\infty")} \\dfrac{${num}}{${den}} = ${lim("\\pm\\infty")} \\dfrac{${a}${sfrac(bcoef, "x")}${sfrac(c, "x^2")}}{${d}${sfrac(ecoef, "x")}${sfrac(f, "x^2")}} = \\dfrac{${a}}{${d}}$$`,
          `La asíntota horizontal es $y = ${frac(a, d)}$, igual hacia la derecha y hacia la izquierda.`,
        ],
      };
    }
    const a = r.nz(-5, 5);
    const b = r.int(-6, 6);
    const d = r.nz(-3, 4);
    const c = r.int(1, 9);
    const num = poly([a, b]);
    const den = poly([d, 0, d > 0 ? c : -c]);
    return {
      statement: `Halla la asíntota horizontal de $f(x) = \\dfrac{${num}}{${den}}$.`,
      parts: [
        {
          kind: "expr",
          before: "y =",
          answer: "0",
          mistakes: [{ answer: frac(a, d), feedback: "Ese cociente de coeficientes solo vale cuando los grados son iguales. Aquí el denominador tiene mayor grado y la fracción se va a cero." }],
        },
      ],
      hints: ["Compara los grados. Divide numerador y denominador entre $x^2$."],
      solution: [
        "El numerador tiene grado 1 y el denominador grado 2.",
        `Al dividir entre $x^2$: $\\dfrac{${a < 0 ? "-" : ""}\\frac{${Math.abs(a)}}{x}${sfrac(b, "x^2")}}{${d}${sfrac(d > 0 ? c : -c, "x^2")}} \\to \\dfrac{0}{${d}} = 0$.`,
        "La asíntota horizontal es $y = 0$, el eje $x$.",
      ],
    };
  },
};

const leerLimite: ExerciseGen = {
  id: "leer-limite",
  title: "Qué dice un límite sobre las asíntotas",
  level: 1,
  generate: (r) => {
    let a: number, b: number;
    do {
      a = r.int(-5, 5);
      b = r.int(-5, 5);
    } while (a === b);
    const kind = r.pick(["av", "ah", "infinito", "finito"] as const);
    const side = r.pick(["^-", "^+", ""]);
    const s = r.sign();
    const AV = `Asíntota vertical $x = ${a}$`;
    const AHa = `Asíntota horizontal $y = ${a}$`;
    const AHb = `Asíntota horizontal $y = ${b}$`;
    const AVb = `Asíntota vertical $x = ${b}$`;
    const none = "No indica ninguna asíntota";
    let statement: string, part: Part, why: string;
    if (kind === "av") {
      statement = `$${lim(`${a}${side}`)} f(x) = ${inf(s)}$`;
      why = `Cuando $x$ se acerca a $${a}$ la función se dispara hacia $${inf(s)}$. Eso es justo una asíntota vertical en $x = ${a}$.`;
      part = choice(AV, [
        [AHa, `El $${a}$ es el valor al que se acerca $x$, no $y$. Una recta $y = \\text{constante}$ sale de límites con $x \\to \\pm\\infty$.`],
        [none, "Un límite infinito cuando $x$ tiende a un número es la definición de asíntota vertical. Basta un lado."],
      ]);
    } else if (kind === "ah") {
      const to = r.pick(["+\\infty", "-\\infty"]);
      statement = `$${lim(to)} f(x) = ${b}$`;
      why = `Cuando $x$ se va a $${to}$ la función se acerca a $${b}$. La recta $y = ${b}$ es asíntota horizontal por ese lado.`;
      part = choice(AHb, [
        [AVb, "Las asíntotas verticales salen de límites infinitos con $x$ tendiendo a un número. Aquí $x$ tiende a infinito y el límite es finito."],
        [none, `Un límite finito cuando $x \\to ${to}$ es exactamente una asíntota horizontal.`],
      ]);
    } else if (kind === "infinito") {
      const to = r.pick(["+\\infty", "-\\infty"]);
      statement = `$${lim(to)} f(x) = ${inf(s)}$`;
      why = "La función crece sin control cuando $x$ crece sin control. No hay asíntota horizontal por ese lado. Podría haber una oblicua, y eso se decide calculando $m$ y $b$.";
      part = choice("No hay asíntota horizontal por ese lado", [
        ["Hay una asíntota vertical", "Para una asíntota vertical $x$ tiene que tender a un número, no a infinito."],
        [`Asíntota horizontal $y = ${inf(s)}$`, "Una recta $y = \\infty$ no existe. Una asíntota horizontal necesita un límite finito."],
      ]);
    } else {
      statement = `$${lim(String(a))} f(x) = ${b}$`;
      why = `El límite es un número finito. Cerca de $x = ${a}$ la función se acerca a $${b}$ sin dispararse, así que no hay asíntota ahí.`;
      part = choice(none, [
        [AV, `Para una asíntota vertical en $x = ${a}$ el límite tendría que ser infinito. Aquí vale $${b}$.`],
        [AHb, "Una asíntota horizontal sale de un límite con $x \\to \\pm\\infty$, no con $x$ tendiendo a un número."],
      ]);
    }
    return {
      statement: `Sabemos que ${statement}. ¿Qué te dice esto sobre las asíntotas de $f$?`,
      parts: [part],
      hints: [
        "Mira dos cosas: a dónde tiende $x$ (a un número o a infinito) y cuánto da el límite (finito o infinito).",
      ],
      solution: [why],
    };
  },
};

const leerGrafica: ExerciseGen = {
  id: "leer-grafica",
  title: "Leer las asíntotas en una gráfica",
  level: 1,
  generate: (r) => {
    let a: number, L: number;
    do {
      a = r.int(-3, 3);
      L = r.int(-3, 3);
    } while (a === L);
    const c = r.pick([-2, -1, 1, 2]);
    const g = hyperGraph(L, c, a, 1);
    g.vlines = [];
    g.hlines = [];
    g.height = 300;
    return {
      statement: "Observa la gráfica de $f$. Escribe la ecuación de su asíntota vertical y la de su asíntota horizontal.",
      graph: g,
      parts: [
        { kind: "expr", prompt: "Asíntota vertical:", before: "x =", answer: String(a), mistakes: [{ answer: String(L), feedback: "Ese es el nivel al que se acerca la curva hacia los lados, la asíntota horizontal." }] },
        { kind: "expr", prompt: "Asíntota horizontal:", before: "y =", answer: String(L), mistakes: [{ answer: String(a), feedback: "Ese es el valor de $x$ donde la curva se dispara, la asíntota vertical." }] },
      ],
      hints: [
        "La asíntota vertical está donde la curva sube o baja sin fin.",
        "La horizontal es la altura a la que se pega la curva cuando te vas muy a la derecha o muy a la izquierda.",
      ],
      solution: [
        `La curva se dispara cerca de $x = ${a}$: asíntota vertical $x = ${a}$.`,
        `Hacia los dos extremos la curva se pega a la altura $${L}$: asíntota horizontal $y = ${L}$.`,
        `La función dibujada es $f(x) = ${plusConst(`\\frac{${c}}{${minus("x", a)}}`, L)}$.`,
      ],
    };
  },
};

const tipoNoVertical: ExerciseGen = {
  id: "tipo-no-vertical",
  title: "¿Horizontal, oblicua o ninguna?",
  level: 2,
  generate: (r) => {
    const m = r.pick([1, 2]);
    const kind = r.pick(["menor", "igual", "oblicua", "ninguna"] as const);
    const n = { menor: m - 1, igual: m, oblicua: m + 1, ninguna: m + 2 }[kind];
    const a = r.nz(-5, 5);
    const d = r.nz(-3, 4, [a]);
    const numC = [a, ...Array.from({ length: n }, () => r.int(-6, 6))];
    if (numC[numC.length - 1] === 0) numC[numC.length - 1] = r.nz(-5, 5);
    const denC = m === 1 ? [d, r.nz(-6, 6)] : [d, r.int(-4, 4), r.nz(-6, 6)];
    const ratio = frac(a, d);
    const opts: Record<typeof kind, string> = {
      menor: "Horizontal $y = 0$",
      igual: `Horizontal $y = ${ratio}$`,
      oblicua: "Oblicua, de la forma ${y = mx + b}$ con $m \\neq 0$",
      ninguna: "Ni horizontal ni oblicua",
    };
    const fb: Record<typeof kind, string> = {
      menor: "Eso pasa cuando el numerador tiene menor grado que el denominador.",
      igual: "El cociente de coeficientes principales es la asíntota solo cuando los grados son iguales.",
      oblicua: "Hay oblicua cuando el numerador tiene exactamente un grado más que el denominador.",
      ninguna: "Eso pasa cuando el numerador supera al denominador en dos grados o más.",
    };
    return {
      statement: `¿Qué asíntota no vertical tiene esta función?\n\n$$f(x) = \\dfrac{${poly(numC)}}{${poly(denC)}}$$`,
      parts: [
        choice(
          opts[kind],
          (Object.keys(opts) as (typeof kind)[]).filter((k) => k !== kind).map((k) => [opts[k], fb[k]] as [Rich, Rich]),
        ),
      ],
      hints: ["Compara el grado del numerador con el del denominador."],
      solution: [
        `El numerador tiene grado ${n} y el denominador grado ${m}.`,
        {
          menor: "El denominador crece más rápido, la fracción tiende a $0$ y la asíntota es $y = 0$.",
          igual: `Los grados son iguales, la fracción tiende al cociente de coeficientes principales: $y = \\frac{${a}}{${d}} = ${ratio}$.`,
          oblicua: "El numerador tiene un grado más. Al dividir sale un cociente de grado 1, y esa recta es la asíntota oblicua.",
          ninguna: "El numerador tiene dos grados o más por encima. El cociente de la división es de grado 2 o mayor, no es una recta, así que no hay asíntota horizontal ni oblicua.",
        }[kind],
      ],
    };
  },
};

const oblicuaRacional: ExerciseGen = {
  id: "oblicua-racional",
  title: "Asíntota oblicua de una racional",
  level: 2,
  generate: (r) => {
    const m = r.pick([-2, -1, 1, 1, 2, 3]);
    const b = r.int(-5, 5);
    const a = r.nz(-4, 4);
    const R = r.nz(-6, 6);
    const num = [m, b - m * a, R - a * b];
    const fTex = `\\dfrac{${poly(num)}}{${minus("x", a)}}`;
    return {
      statement: `Halla las asíntotas de $f(x) = ${fTex}$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Asíntota vertical:", before: "x =", answer: String(a) },
        {
          kind: "expr",
          prompt: "Pendiente de la oblicua, $m = \\lim_{x \\to \\pm\\infty} \\frac{f(x)}{x}$:",
          before: "m =",
          answer: String(m),
        },
        {
          kind: "expr",
          prompt: "Ordenada, $b = \\lim_{x \\to \\pm\\infty} [f(x) - mx]$:",
          before: "b =",
          answer: String(b),
          mistakes: num[1] !== b ? [{ answer: String(num[1]), feedback: "Tomaste el coeficiente de $x$ del numerador. Hay que restar $mx$ a toda la fracción y calcular el límite." }] : [],
        },
      ],
      hints: [
        "La vertical sale del cero del denominador. Revisa que el numerador no se anule ahí.",
        `Para $m$, divide $f(x)$ entre $x$: queda una fracción con grados iguales.`,
        `Otra vía: divide el polinomio entre $${minus("x", a)}$. El cociente es la asíntota.`,
      ],
      solution: [
        `En $x = ${a}$ el numerador vale $${R}$, distinto de cero, y el denominador se anula: asíntota vertical $x = ${a}$.`,
        `$m = ${lim("\\pm\\infty")} \\dfrac{${poly(num)}}{x(${minus("x", a)})} = \\dfrac{${m}}{1} = ${m}$.`,
        `$b = ${lim("\\pm\\infty")} \\left[ ${fTex}${minusMx(m)} \\right] = ${lim("\\pm\\infty")} \\dfrac{${poly([b, R - a * b])}}{${minus("x", a)}} = ${b}$.`,
        `Con la división se ve todo junto: $f(x) = ${lineTex(m, b)}${sdfrac(R, minus("x", a))}$. La fracción tiende a cero, así que la asíntota oblicua es $y = ${lineTex(m, b)}$.`,
      ],
    };
  },
};

const expRaiz: ExerciseGen = {
  id: "ah-exponencial-raiz",
  title: "Dos asíntotas horizontales distintas",
  level: 2,
  generate: (r) => {
    const kind = r.pick(["exp", "raiz"] as const);
    if (kind === "exp") {
      let p: number, q: number;
      do {
        p = r.int(-4, 5);
        q = r.int(-4, 5);
      } while (p === q);
      const k = r.pick([1, 2]);
      const ex = k === 1 ? "e^{x}" : "e^{2x}";
      const fTex = `\\dfrac{${terms([[p, ex], [q, ""]])}}{${ex} + 1}`;
      return {
        statement: `Halla las asíntotas horizontales de $f(x) = ${fTex}$, por la derecha y por la izquierda.`,
        parts: [
          { kind: "expr", prompt: "Cuando $x \\to +\\infty$:", before: "y =", answer: String(p), mistakes: [{ answer: String(q), feedback: "Ese es el lado izquierdo. Cuando $x \\to +\\infty$ la exponencial crece y mandan sus coeficientes." }] },
          { kind: "expr", prompt: "Cuando $x \\to -\\infty$:", before: "y =", answer: String(q), mistakes: [{ answer: String(p), feedback: `Cuando $x \\to -\\infty$, $${ex} \\to 0$. Sustituye ese cero en la fracción.` }] },
        ],
        hints: [
          `Recuerda que $${ex} \\to +\\infty$ si $x \\to +\\infty$ y $${ex} \\to 0$ si $x \\to -\\infty$.`,
          `Por la derecha, divide numerador y denominador entre $${ex}$.`,
        ],
        solution: [
          `Por la derecha dividimos entre $${ex}$: $\\dfrac{${p}${sfrac(q, ex)}}{1 + \\frac{1}{${ex}}} \\to ${p}$. Asíntota $y = ${p}$.`,
          `Por la izquierda $${ex} \\to 0$: $\\dfrac{${p} \\cdot 0 ${signed(q)}}{0 + 1} = ${q}$. Asíntota $y = ${q}$.`,
          "Una función puede tener una asíntota horizontal distinta a cada lado.",
        ],
      };
    }
    const p = r.nz(-4, 4);
    const q = r.int(-5, 5);
    const c = r.pick([1, 2, 4, 9]);
    const fTex = `\\dfrac{${lineTex(p, q)}}{\\sqrt{x^{2} + ${c}}}`;
    return {
      statement: `Halla las asíntotas horizontales de $f(x) = ${fTex}$, por la derecha y por la izquierda.`,
      parts: [
        { kind: "expr", prompt: "Cuando $x \\to +\\infty$:", before: "y =", answer: String(p) },
        {
          kind: "expr",
          prompt: "Cuando $x \\to -\\infty$:",
          before: "y =",
          answer: String(-p),
          mistakes: [{ answer: String(p), feedback: "Cuidado: $\\sqrt{x^2} = |x|$, y para $x$ negativo $|x| = -x$. Por eso cambia el signo." }],
        },
      ],
      hints: [
        "Saca $x^2$ de la raíz: $\\sqrt{x^2 + c} = |x| \\sqrt{1 + \\frac{c}{x^2}}$.",
        "Para $x < 0$, $|x| = -x$.",
      ],
      solution: [
        `$\\sqrt{x^{2} + ${c}} = |x|\\sqrt{1 + \\frac{${c}}{x^{2}}}$.`,
        `Si $x \\to +\\infty$, $|x| = x$ y $f(x) = \\dfrac{${p}${sfrac(q, "x")}}{\\sqrt{1 + \\frac{${c}}{x^{2}}}} \\to ${p}$. Asíntota $y = ${p}$.`,
        `Si $x \\to -\\infty$, $|x| = -x$ y el cociente cambia de signo: tiende a $${-p}$. Asíntota $y = ${-p}$.`,
      ],
    };
  },
};

const elegirGrafica: ExerciseGen = {
  id: "bosquejo-condiciones",
  title: "Bosquejar a partir de condiciones",
  level: 2,
  exam: true,
  generate: (r) => {
    const a = r.int(-3, 3);
    const L = r.nz(-3, 3);
    const c = r.pick([-2, -1, 1, 2]);
    const p = r.pick([1, 2] as const);
    const sl = p === 1 ? -Math.sign(c) : Math.sign(c);
    const sr = Math.sign(c);
    const a2 = a + (a <= 0 ? 3 : -3);
    const L2 = L + (L <= 0 ? 3 : -3);
    return {
      statement: `Bosqueja una función $f$ que cumpla las condiciones siguientes y elige la gráfica que las cumple todas.\n\n- $${lim(`${a}^-`)} f(x) = ${inf(sl)}$ y $${lim(`${a}^+`)} f(x) = ${inf(sr)}$\n- $${lim("-\\infty")} f(x) = ${L}$ y $${lim("+\\infty")} f(x) = ${L}$\n- $f$ es continua en $\\mathbb{R} - \\{${a}\\}$`,
      parts: [
        graphChoice(r, hyperGraph(L, c, a, p), [
          { graph: hyperGraph(L, -c, a, p), feedback: `Las asíntotas están bien, pero los lados de $x = ${a}$ van al revés. Por la izquierda tiene que ir a $${inf(sl)}$.` },
          { graph: hyperGraph(L2, c, a, p), feedback: `La asíntota horizontal de esta gráfica es $y = ${L2}$. Los límites en $\\pm\\infty$ piden $y = ${L}$.` },
          { graph: hyperGraph(L, c, a2, p), feedback: `Esta gráfica tiene la asíntota vertical en $x = ${a2}$, no en $x = ${a}$.` },
        ]),
      ],
      hints: [
        "Primero dibuja punteadas las asíntotas: la vertical sale de los límites en un número y la horizontal de los límites en $\\pm\\infty$.",
        `Después mira hacia dónde va la curva a cada lado de $x = ${a}$.`,
      ],
      solution: [
        `Los límites infinitos en $x = ${a}$ dicen que hay asíntota vertical $x = ${a}$.`,
        `Por la izquierda la curva va a $${inf(sl)}$ y por la derecha a $${inf(sr)}$.`,
        `Los límites en $\\pm\\infty$ dan la asíntota horizontal $y = ${L}$.`,
        `Una función que cumple todo es $f(x) = ${plusConst(`\\frac{${c}}{${p === 1 ? minus("x", a) : `(${minus("x", a)})^{2}`}}`, L)}$.`,
      ],
    };
  },
};

const raizCompleto: ExerciseGen = {
  id: "asintotas-raiz",
  title: "Asíntotas de una función con raíz (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const a = r.pick([1, 2, 3]);
    const c = r.pick([1, 1, 2, -1]);
    const p = r.int(-2, 2);
    const q = r.int(-4, 4);
    const lin = p === 0 && q === 0 ? "" : lineTex(p, q);
    const fr = `\\dfrac{${coef(Math.abs(c), "x^{2}")}}{\\sqrt{x^{2} - ${a * a}}}`;
    const fTex = lin ? `${lin} ${c > 0 ? "+" : "-"} ${fr}` : `${c > 0 ? "" : "-"}${fr}`;
    const mp = p + c;
    const mn = p - c;
    const asin = (m: number) => (m === 0 ? `la horizontal $y = ${q}$` : `la oblicua $y = ${lineTex(m, q)}$`);
    return {
      statement: `Calcula las ecuaciones de las asíntotas de $f(x) = ${fTex}$.`,
      sequential: true,
      parts: [
        {
          kind: "set",
          prompt: "Valores de $x$ con asíntota vertical:",
          before: "x \\in",
          answer: [-a, a],
          mistakes: [{ answer: [a], feedback: `$\\sqrt{x^2 - ${a * a}}$ también se anula en $x = ${-a}$, y la función existe a la izquierda de ese punto.` }],
        },
        { kind: "expr", prompt: "Pendiente cuando $x \\to +\\infty$:", before: "m =", answer: String(mp) },
        { kind: "expr", prompt: "Ordenada cuando $x \\to +\\infty$:", before: "b =", answer: String(q) },
        {
          kind: "expr",
          prompt: "Pendiente cuando $x \\to -\\infty$:",
          before: "m =",
          answer: String(mn),
          mistakes: [{ answer: String(mp), feedback: "Para $x$ negativo, $\\sqrt{x^2} = |x| = -x$. El término de la raíz aporta pendiente con el signo cambiado." }],
        },
        { kind: "expr", prompt: "Ordenada cuando $x \\to -\\infty$:", before: "b =", answer: String(q) },
      ],
      hints: [
        `El dominio es $|x| > ${a}$. La raíz del denominador se anula en $x = \\pm ${a}$.`,
        `Usa $\\sqrt{x^2 - ${a * a}} = |x|\\sqrt{1 - \\frac{${a * a}}{x^2}}$. Para $x > 0$ es $x\\sqrt{\\cdots}$ y para $x < 0$ es $-x\\sqrt{\\cdots}$.`,
        "Para $b$, la diferencia $\\dfrac{x^2}{\\sqrt{x^2 - k}} - |x|$ tiende a $0$. Racionaliza si quieres comprobarlo.",
      ],
      solution: [
        `Dominio: $x^2 - ${a * a} > 0$, es decir $x < ${-a}$ o $x > ${a}$. Cuando $x \\to ${a}^+$ o $x \\to ${-a}^-$ la raíz del denominador tiende a $0^+$ y el numerador de la fracción a $${c * a * a}$, así que $f \\to ${inf(c)}$. Asíntotas verticales $x = ${-a}$ y $x = ${a}$.`,
        `Por la derecha: $\\dfrac{f(x)}{x} = ${p}${sfrac(q, "x")} ${c > 0 ? "+" : "-"} \\dfrac{${Math.abs(c) === 1 ? "" : Math.abs(c)}x}{x\\sqrt{1 - \\frac{${a * a}}{x^2}}} \\to ${p} ${signed(c)} = ${mp}$.`,
        `$b = ${lim("+\\infty")} [f(x)${minusMx(mp)}] = ${q} ${c > 0 ? "+" : "-"} ${Math.abs(c) === 1 ? "" : Math.abs(c)}${lim("+\\infty")} \\left[ \\dfrac{x^2}{\\sqrt{x^2 - ${a * a}}} - x \\right] = ${q} + 0 = ${q}$. Racionalizando, el corchete queda $\\dfrac{${a === 1 ? "" : a * a}x^2}{\\sqrt{x^2-${a * a}}\\,(x^2 + x\\sqrt{x^2-${a * a}})}$, que tiende a $0$.`,
        `Por la izquierda $\\sqrt{x^2} = -x$ y el término de la raíz se comporta como $${coef(-c, "x")}$: $m = ${p} ${signed(-c)} = ${mn}$ y otra vez $b = ${q}$.`,
        `Resumen: verticales $x = \\pm ${a}$, por la derecha ${asin(mp)} y por la izquierda ${asin(mn)}.`,
      ],
    };
  },
};

const racionalCompleto: ExerciseGen = {
  id: "asintotas-racional-hueco",
  title: "Asíntotas de una racional con factor común (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const m = r.pick([-2, -1, 1, 2]);
    const b = r.int(-4, 4);
    const a = r.nz(-4, 4);
    const h = r.nz(-4, 4, [a]);
    const R = r.nz(-5, 5);
    const inner = [m, b - m * a, R - a * b];
    const num = pmul([1, -h], inner);
    const den = pmul([1, -h], [1, -a]);
    return {
      statement: `Dada $f(x) = \\dfrac{${poly(num)}}{${poly(den)}}$, determina sus asíntotas verticales, horizontales y oblicuas.`,
      sequential: true,
      parts: [
        {
          kind: "set",
          prompt: "Valores de $x$ con asíntota vertical:",
          before: "x \\in",
          answer: [a],
          mistakes: [{ answer: [a, h], feedback: `En $x = ${h}$ se anulan numerador y denominador. Al simplificar el factor $(${minus("x", h)})$ queda un hueco, no una asíntota.` }],
        },
        choice("No tiene asíntota horizontal", [["Tiene asíntota horizontal $y = " + m + "$", "Con el numerador un grado por encima, $f(x) \\to \\pm\\infty$ cuando $x \\to \\pm\\infty$. No hay horizontal."]], "¿Tiene asíntota horizontal?"),
        { kind: "expr", prompt: "Asíntota oblicua, pendiente:", before: "m =", answer: String(m) },
        { kind: "expr", prompt: "Asíntota oblicua, ordenada:", before: "b =", answer: String(b) },
      ],
      hints: [
        `Factoriza el denominador. Prueba si $x = ${h}$ también anula el numerador.`,
        "Simplifica antes de buscar asíntotas.",
        "Después de simplificar, divide los polinomios. El cociente de grado 1 es la oblicua.",
      ],
      solution: [
        `El denominador es $(${minus("x", h)})(${minus("x", a)})$ y el numerador también tiene el factor $(${minus("x", h)})$: $f(x) = \\dfrac{${poly(inner)}}{${minus("x", a)}}$ para $x \\neq ${h}$.`,
        `En $x = ${h}$ hay un hueco. En $x = ${a}$ el numerador simplificado vale $${R}$, así que hay asíntota vertical $x = ${a}$.`,
        `Al dividir: $f(x) = ${lineTex(m, b)}${sdfrac(R, minus("x", a))}$. Como la fracción tiende a $0$ en $\\pm\\infty$, la oblicua es $y = ${lineTex(m, b)}$ a ambos lados y no hay horizontal.`,
      ],
    };
  },
};

const trozosAsintotas: ExerciseGen = {
  id: "asintotas-trozos",
  title: "Asíntotas de una función a trozos (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const inside = r.bool(0.6);
    const d = inside ? -r.int(1, 3) : r.int(1, 3); // raíz del denominador de la rama izquierda
    const al = r.nz(-3, 3);
    let be: number;
    do be = r.int(-6, 6); while (be === -al * d);
    const g = r.int(3, 5);
    const m = r.pick([-1, 1, 2]);
    const n = r.int(-4, 4);
    const R = r.nz(-5, 5);
    const right = [m, n - m * g, R - g * n];
    const mid = r.pick(["x^{2} - 1", "2x + 1", "3 - x", "x^{2}"]);
    const av = inside ? [d, g] : [g];
    const fTex = `\\begin{cases} \\dfrac{${lineTex(al, be)}}{${minus("x", d)}} & \\text{si } x < 0 \\\\ ${mid} & \\text{si } 0 \\le x \\le 2 \\\\ \\dfrac{${poly(right)}}{${minus("x", g)}} & \\text{si } x > 2 \\end{cases}`;
    const mistakes: { answer: number[]; feedback: Rich }[] = [];
    if (!inside) mistakes.push({ answer: [d, g], feedback: `$x = ${d}$ anula el denominador de la primera rama, pero esa rama solo vale para $x < 0$. En $x = ${d}$ manda otra fórmula.` });
    else mistakes.push({ answer: [g], feedback: `La primera rama vale para $x < 0$ y su denominador se anula en $x = ${d}$, que sí es negativo.` });
    return {
      statement: `Determina las asíntotas horizontales, verticales y oblicuas de $$f(x) = ${fTex}$$`,
      sequential: true,
      parts: [
        { kind: "set", prompt: "Valores de $x$ con asíntota vertical:", before: "x \\in", answer: av, mistakes },
        { kind: "expr", prompt: "Asíntota horizontal cuando $x \\to -\\infty$:", before: "y =", answer: String(al) },
        { kind: "expr", prompt: "Asíntota oblicua cuando $x \\to +\\infty$, pendiente:", before: "m =", answer: String(m) },
        { kind: "expr", prompt: "Asíntota oblicua, ordenada:", before: "b =", answer: String(n) },
      ],
      hints: [
        "Cada rama solo cuenta en su tramo. Un cero del denominador fuera del tramo no produce asíntota.",
        "Hacia $-\\infty$ manda la primera rama y hacia $+\\infty$ manda la última.",
        "La rama del medio es un polinomio en un intervalo cerrado y acotado: no aporta asíntotas.",
      ],
      solution: [
        inside
          ? `Primera rama: su denominador se anula en $x = ${d}$, que cumple $x < 0$. El numerador ahí vale $${al * d + be}$, así que hay asíntota vertical $x = ${d}$.`
          : `Primera rama: su denominador se anula en $x = ${d}$, pero esa rama solo vale para $x < 0$. No hay asíntota ahí.`,
        `Tercera rama: se anula en $x = ${g} > 2$ y el numerador vale $${R}$ en ese punto. Asíntota vertical $x = ${g}$.`,
        `Hacia $-\\infty$: $${lim("-\\infty")} \\dfrac{${lineTex(al, be)}}{${minus("x", d)}} = ${al}$. Asíntota horizontal $y = ${al}$.`,
        `Hacia $+\\infty$: dividiendo, $\\dfrac{${poly(right)}}{${minus("x", g)}} = ${lineTex(m, n)}${sdfrac(R, minus("x", g))}$. Asíntota oblicua $y = ${lineTex(m, n)}$.`,
      ],
    };
  },
};

/** Plano vacío para los ejercicios de arrastrar asíntotas. */
const planoVacio = (): GraphSpec => ({ x: [-8, 8], y: [-8, 8], height: 300 });

const ubicarAsintotas: ExerciseGen = {
  id: "ubicar-asintotas",
  title: "Ubicar las asíntotas en el plano",
  level: 1,
  generate: (r) => {
    const a = r.int(-4, 4);
    const L = r.int(-4, 4);
    const c = r.nz(-6, 6);
    const k = r.pick([1, 1, 2, 3]);
    // f(x) = L + c/(x - a), con numerador y denominador multiplicados por k
    const num = poly([k * L, k * (c - L * a)]);
    const den = poly([k, -k * a]);
    const fTex = `\\dfrac{${num}}{${den}}`;
    return {
      statement: `Halla las asíntotas de $f(x) = ${fTex}$ y arrastra cada recta hasta su lugar en el plano.`,
      parts: [
        {
          kind: "place",
          graph: planoVacio(),
          items: [
            { type: "vline", label: "\\text{vertical}", answer: a },
            { type: "hline", label: "\\text{horizontal}", answer: L },
          ],
          reveal: [{ fn: plusConst(`\\frac{${c}}{${minus("x", a)}}`, L), breaks: [a], color: "accent" }],
        },
      ],
      hints: [
        "La vertical va donde se anula el denominador, siempre que el numerador no se anule también.",
        L === 0
          ? "Compara los grados del numerador y del denominador."
          : "Numerador y denominador tienen el mismo grado: la horizontal es el cociente de los coeficientes principales.",
      ],
      solution: [
        `El denominador $${den}$ se anula en $x = ${a}$. Ahí el numerador vale $${k * c}$, distinto de cero, así que $f$ se dispara: asíntota vertical $x = ${a}$.`,
        L === 0
          ? `El numerador es una constante y el denominador tiene grado 1. Cuando $x \\to \\pm\\infty$ la fracción tiende a $0$: asíntota horizontal $y = 0$.`
          : `Los dos tienen grado 1, así que $${lim("\\pm\\infty")} f(x) = \\dfrac{${k * L}}{${k}} = ${L}$: asíntota horizontal $y = ${L}$.`,
        `Al acertar aparece la curva. Fíjate en que se pega a las dos rectas sin tocarlas.`,
      ],
    };
  },
};

const ubicarDosVerticales: ExerciseGen = {
  id: "ubicar-dos-verticales",
  title: "Determinar y ubicar tres asíntotas (tipo parcial)",
  level: 2,
  exam: true,
  generate: (r) => {
    const [a, b] = r.sample([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5], 2).sort((x, y) => x - y);
    const L = r.int(-3, 3);
    const k = r.pick([-6, -4, -3, -2, 2, 3, 4, 6]);
    // f(x) = L + k/((x - a)(x - b))
    const den = poly([1, -(a + b), a * b]);
    const num = poly([L, -L * (a + b), L * a * b + k]);
    const fTex = `\\dfrac{${num}}{${den}}`;
    return {
      statement: `Determina las asíntotas verticales y horizontales de $f(x) = ${fTex}$. Después arrastra cada recta hasta su lugar.`,
      parts: [
        {
          kind: "place",
          graph: planoVacio(),
          items: [
            { type: "vline", label: "\\text{vertical izquierda}", answer: a, start: -7 },
            { type: "vline", label: "\\text{vertical derecha}", answer: b, start: 7 },
            { type: "hline", label: "\\text{horizontal}", answer: L },
          ],
          reveal: [{ fn: plusConst(`\\frac{${k}}{(${minus("x", a)})(${minus("x", b)})}`, L), breaks: [a, b], color: "accent" }],
        },
      ],
      hints: [
        "Factoriza el denominador. Cada raíz es candidata a asíntota vertical.",
        "Revisa que el numerador no se anule en esas raíces.",
        "Para la horizontal compara los grados del numerador y del denominador.",
      ],
      solution: [
        `El denominador se factoriza como $(${minus("x", a)})(${minus("x", b)})$, que se anula en $x = ${a}$ y en $x = ${b}$.`,
        `El numerador vale $${k}$ en los dos puntos, distinto de cero. Hay asíntotas verticales $x = ${a}$ y $x = ${b}$.`,
        L === 0
          ? `El numerador es la constante $${k}$ y el denominador tiene grado 2. La fracción tiende a $0$: asíntota horizontal $y = 0$.`
          : `Numerador y denominador tienen grado 2. La horizontal es el cociente de los coeficientes principales: $y = \\frac{${L}}{1} = ${L}$.`,
        `Se puede comprobar escribiendo $f(x) = ${plusConst(`\\dfrac{${k}}{(${minus("x", a)})(${minus("x", b)})}`, L)}$: la fracción tiende a $0$ en $\\pm\\infty$.`,
      ],
    };
  },
};

const ubicarConHueco: ExerciseGen = {
  id: "ubicar-asintotas-hueco",
  title: "Asíntotas y hueco de una racional (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const a = r.int(-4, 4);
    const dd = r.pick([-2, -1, 1, 2]);
    const h = a + dd;
    const t = r.nz(-2, 2);
    const c = t * dd;
    const L = r.int(-3, 3);
    const yh = L + t;
    // g(x) = L + c/(x - a) simplificada; f = g con el factor (x - h) arriba y abajo
    const inner = [L, c - L * a];
    const num = pmul([1, -h], inner);
    const den = pmul([1, -h], [1, -a]);
    return {
      statement: `Dada $f(x) = \\dfrac{${poly(num)}}{${poly(den)}}$, determina sus asíntotas y el punto donde la gráfica tiene un hueco. Ubica todo en el plano.`,
      parts: [
        {
          kind: "place",
          graph: planoVacio(),
          items: [
            { type: "vline", label: "\\text{vertical}", answer: a },
            { type: "hline", label: "\\text{horizontal}", answer: L },
            { type: "point", label: "\\text{hueco}", answer: [h, yh] },
          ],
          reveal: [{ fn: plusConst(`\\frac{${c}}{${minus("x", a)}}`, L), breaks: [a, h], color: "accent" }],
        },
      ],
      hints: [
        `Factoriza el denominador y prueba si $x = ${h}$ también anula el numerador.`,
        "Simplifica el factor común. El cero que se cancela da un hueco y el que queda da la asíntota vertical.",
        "La altura del hueco es el valor de la función simplificada en ese punto.",
      ],
      solution: [
        `El denominador es $(${minus("x", h)})(${minus("x", a)})$ y el numerador es $${L === 0 ? coef(c, `(${minus("x", h)})`) : `(${minus("x", h)})(${poly(inner)})`}$. Para $x \\neq ${h}$: $f(x) = \\dfrac{${poly(inner)}}{${minus("x", a)}}$.`,
        `En $x = ${a}$ el numerador simplificado vale $${c}$, distinto de cero: asíntota vertical $x = ${a}$.`,
        `En $x = ${h}$ el límite es finito: $\\dfrac{${L * h + c - L * a}}{${h - a}} = ${yh}$. Hay un hueco en $(${h}, ${yh})$, no una asíntota.`,
        L === 0
          ? "Después de simplificar el numerador es constante y el denominador tiene grado 1: asíntota horizontal $y = 0$."
          : `Los grados son iguales y el cociente de coeficientes principales es $${L}$: asíntota horizontal $y = ${L}$.`,
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const ejemploBosquejo: GraphSpec = {
  x: [-9, 6],
  y: [-4, 8],
  curves: [
    { fn: "-x - 4 + \\frac{1}{(x+3)^{2}}", domain: [-9, -3], breaks: [-3], color: "accent" },
    { fn: "\\frac{1}{(x+3)^{2}} + \\frac{1}{x^{2}} - \\frac{5}{4}", domain: [-3, 0], breaks: [-3, 0], color: "accent" },
    { fn: "-1 + \\frac{4}{x^{2}}", domain: [0, 6], breaks: [0], color: "accent" },
    { fn: "-x - 4", domain: [-9, -3], dashed: true, color: "muted" },
  ],
  vlines: [{ x: -3, dashed: true, color: "muted" }, { x: 0, dashed: true, color: "muted" }],
  hlines: [{ y: -1, dashed: true, color: "muted" }],
  points: [{ x: -2, y: 0 }, { x: 2, y: 0 }],
};

const graficaLectura: GraphSpec = {
  x: [-9, 9],
  y: [-8, 8],
  curves: [
    { fn: "-1 + \\frac{3}{x+3}", domain: [-9, 0], breaks: [-3], color: "accent" },
    { fn: "x - 2 - \\frac{4}{x-2}", domain: [0, 9], breaks: [2], color: "accent" },
    { fn: "x - 2", domain: [2, 9], dashed: true, color: "muted" },
  ],
  vlines: [{ x: -3, dashed: true, color: "muted" }, { x: 2, dashed: true, color: "muted" }],
  hlines: [{ y: -1, dashed: true, color: "muted" }],
};

const topic: Topic = {
  ...meta("asintotas"),
  objectives: [
    "Hallar asíntotas verticales con límites infinitos y descartar los huecos.",
    "Hallar asíntotas horizontales con límites en ±∞, también con raíces y exponenciales.",
    "Calcular la asíntota oblicua y = mx + b con límites o dividiendo polinomios.",
    "Leer asíntotas en una gráfica y bosquejar una función a partir de sus límites, como en el segundo parcial.",
  ],
  sections: [
    {
      id: "idea",
      title: "Rectas a las que se pega la curva",
      blocks: [
        {
          type: "text",
          md: "Hay curvas que, lejos del origen o cerca de ciertos puntos, se parecen cada vez más a una recta sin llegar a confundirse con ella. Esa recta se llama **asíntota**. Saber dónde están las asíntotas es la mitad del trabajo de dibujar una función: marcas las rectas punteadas primero y la curva se acomoda alrededor.\n\nMira la gráfica de $f(x) = \\dfrac{2x+1}{x-1}$. Cerca de $x = 1$ la curva se dispara hacia arriba o hacia abajo. Lejos, a la derecha o a la izquierda, se aplana y se acerca a la altura $y = 2$.",
        },
        {
          type: "graph",
          spec: {
            x: [-6, 8],
            y: [-6, 10],
            curves: [{ fn: "\\frac{2x+1}{x-1}", breaks: [1], color: "accent" }],
            vlines: [{ x: 1, dashed: true, color: "muted", label: "x = 1" }],
            hlines: [{ y: 2, dashed: true, color: "muted", label: "y = 2" }],
          },
          caption: "La recta vertical $x = 1$ y la horizontal $y = 2$ son asíntotas de $f(x) = \\frac{2x+1}{x-1}$.",
        },
        {
          type: "text",
          md: "Hay tres tipos de asíntota y cada uno sale de un límite distinto:",
        },
        {
          type: "table",
          headers: ["Asíntota", "Cuándo existe"],
          rows: [
            ["Vertical $x = a$", "algún lateral en $a$ da $\\pm\\infty$"],
            ["Horizontal $y = L$", "$f(x) \\to L$ cuando $x \\to +\\infty$ o $x \\to -\\infty$"],
            ["Oblicua $y = mx + b$, con $m \\neq 0$", "$f(x) - (mx + b) \\to 0$ cuando $x \\to \\pm\\infty$"],
          ],
        },
        {
          type: "definition",
          title: "Asíntota no vertical",
          md: "La recta $y = mx + b$ es asíntota de $f$ cuando $x \\to +\\infty$ si\n\n$$\\lim_{x \\to +\\infty} [f(x) - (mx + b)] = 0$$\n\nes decir, si la distancia vertical entre la curva y la recta se hace tan pequeña como quieras. Lo mismo con $x \\to -\\infty$. Si $m = 0$ la asíntota es horizontal.",
        },
        {
          type: "note",
          tone: "tip",
          title: "La curva sí puede cortar a su asíntota",
          md: "Una asíntota horizontal u oblicua describe lo que pasa lejos. Cerca del origen la curva puede cruzarla, incluso varias veces. Lo que no puede pasar es que la curva corte una asíntota vertical, porque en ese $x$ la función no tiene un valor finito.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Si $\\lim_{x \\to +\\infty} f(x) = 4$, entonces $x = 4$ es una asíntota vertical de $f$. ¿Verdadero o falso?",
            parts: [trueFalse(false, "El límite con $x \\to +\\infty$ da una asíntota horizontal: $y = 4$. Las verticales salen de límites infinitos con $x$ tendiendo a un número.")],
            solution: ["Falso. Ese límite dice que la recta $y = 4$ es asíntota horizontal por la derecha."],
          },
        },
      ],
    },
    {
      id: "verticales",
      title: "Asíntotas verticales",
      blocks: [
        {
          type: "text",
          md: "Una asíntota vertical aparece donde la función se dispara. En una fracción eso pasa cuando el denominador tiende a cero y el numerador no. Los candidatos son los ceros del denominador, y en funciones con logaritmo, los puntos donde el argumento tiende a cero.\n\nUsa el deslizador para acercarte a $x = 2$ por los dos lados en $f(x) = \\frac{1}{x-2}$.",
        },
        { type: "widget", widget: { kind: "limit", fn: "\\frac{1}{x-2}", a: 2, x: [-2, 6], y: [-10, 10], breaks: [2] } },
        {
          type: "definition",
          title: "Asíntota vertical",
          md: "La recta $x = a$ es asíntota vertical de $f$ si al menos uno de los límites laterales es infinito:\n\n$$\\lim_{x \\to a^-} f(x) = \\pm\\infty \\quad \\text{o} \\quad \\lim_{x \\to a^+} f(x) = \\pm\\infty$$",
        },
        {
          type: "example",
          title: "No todo cero del denominador es asíntota",
          problem: "Halla las asíntotas verticales de $f(x) = \\dfrac{x+2}{x^2 - x - 6}$.",
          steps: [
            "Factoriza el denominador: $x^2 - x - 6 = (x-3)(x+2)$. Los candidatos son $x = 3$ y $x = -2$.",
            "En $x = -2$ el numerador también vale $0$. Para $x \\neq -2$ se simplifica: $f(x) = \\dfrac{1}{x-3}$.",
            "$\\lim_{x \\to -2} f(x) = \\frac{1}{-5} = -\\frac{1}{5}$, un número finito. En $x = -2$ hay un hueco, no una asíntota.",
            "En $x = 3$: $\\lim_{x \\to 3^-} \\frac{1}{x-3} = -\\infty$ y $\\lim_{x \\to 3^+} \\frac{1}{x-3} = +\\infty$.",
          ],
          answer: "Una sola asíntota vertical: $x = 3$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "El error más común",
          md: "Igualar el denominador a cero y declarar asíntota sin mirar el numerador. Si los dos se anulan en el mismo punto, simplifica primero. Si después de simplificar el límite es finito, es un hueco.",
        },
        {
          type: "example",
          title: "Con logaritmo",
          problem: "Halla las asíntotas verticales de $g(x) = \\ln(x - 1)$.",
          steps: [
            "El dominio es $x > 1$. Cuando $x \\to 1^+$, el argumento $x - 1 \\to 0^+$.",
            "El logaritmo de algo que tiende a $0^+$ tiende a $-\\infty$: $\\lim_{x \\to 1^+} \\ln(x-1) = -\\infty$.",
          ],
          answer: "Asíntota vertical $x = 1$, solo por la derecha.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Halla las asíntotas verticales de $f(x) = \\dfrac{x-1}{x^2-1}$.",
            parts: [{ kind: "set", before: "x \\in", answer: [-1], mistakes: [{ answer: [-1, 1], feedback: "En $x = 1$ se anulan numerador y denominador. Al simplificar queda $\\frac{1}{x+1}$, que en $x = 1$ vale $\\frac{1}{2}$." }] }],
            solution: ["$\\frac{x-1}{(x-1)(x+1)} = \\frac{1}{x+1}$ para $x \\neq 1$. Solo queda $x = -1$."],
          },
        },
      ],
    },
    {
      id: "horizontales",
      title: "Asíntotas horizontales",
      blocks: [
        {
          type: "text",
          md: "Para la horizontal se mira qué hace la función cuando $x$ se va muy lejos. Si se estabiliza en un número $L$, la recta $y = L$ es asíntota horizontal. Hay que revisar los dos lados por separado, porque el resultado puede cambiar.\n\nEn las funciones racionales basta comparar los grados del numerador y del denominador:",
        },
        {
          type: "table",
          headers: ["Grado del numerador", "Asíntota no vertical"],
          rows: [
            ["menor, como en $\\frac{3x+1}{x^2+4}$", "horizontal $y = 0$"],
            ["igual, como en $\\frac{6x^2 - x}{2x^2 + 5}$", "horizontal $y = \\frac{6}{2} = 3$"],
            ["uno más, como en $\\frac{x^2+2x}{x-2}$", "oblicua"],
            ["dos o más, como en $\\frac{x^3}{x-1}$", "ninguna"],
          ],
          caption: "Con grados iguales la asíntota es el cociente de los coeficientes principales.",
        },
        {
          type: "example",
          title: "Exponencial",
          problem: "Halla las asíntotas horizontales de $f(x) = e^{-x} + 2$.",
          steps: [
            "Por la derecha, $e^{-x} \\to 0$, así que $\\lim_{x \\to +\\infty} f(x) = 2$. Asíntota $y = 2$.",
            "Por la izquierda, $e^{-x} \\to +\\infty$, así que $f$ crece sin control. No hay asíntota horizontal por ese lado.",
          ],
          answer: "Solo $y = 2$, hacia la derecha.",
        },
        {
          type: "graph",
          spec: {
            x: [-3, 6],
            y: [-1, 8],
            curves: [{ fn: "e^{-x} + 2", color: "accent" }],
            hlines: [{ y: 2, dashed: true, color: "muted", label: "y = 2" }],
          },
          caption: "$e^{-x} + 2$ se pega a $y = 2$ por la derecha y se dispara por la izquierda.",
        },
        {
          type: "example",
          title: "Con raíz: una asíntota distinta a cada lado",
          problem: "Halla las asíntotas horizontales de $f(x) = \\dfrac{3x}{\\sqrt{x^2+1}}$.",
          steps: [
            "Sacamos $x^2$ de la raíz:\n\n$$\\sqrt{x^2+1} = \\sqrt{x^2}\\sqrt{1 + \\frac{1}{x^2}} = |x|\\sqrt{1 + \\frac{1}{x^2}}$$",
            "Si $x \\to +\\infty$, $|x| = x$ y $f(x) = \\dfrac{3x}{x\\sqrt{1 + 1/x^2}} \\to 3$.",
            "Si $x \\to -\\infty$, $|x| = -x$ y $f(x) = \\dfrac{3x}{-x\\sqrt{1 + 1/x^2}} \\to -3$.",
          ],
          answer: "$y = 3$ por la derecha y $y = -3$ por la izquierda.",
        },
        {
          type: "note",
          tone: "warning",
          title: "$\\sqrt{x^2}$ no es $x$",
          md: "$\\sqrt{x^2} = |x|$. Para $x$ negativo eso es $-x$. Olvidarlo hace que la asíntota por la izquierda salga con el signo equivocado, y es un error que se paga caro en el parcial.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Costo medio a largo plazo",
          md: "Si fabricar $x$ unidades cuesta $C(x) = 200 + 5x$, el costo medio por unidad es\n\n$$\\bar{C}(x) = \\frac{200 + 5x}{x} = 5 + \\frac{200}{x}$$\n\nSu asíntota horizontal es $y = 5$: con producciones muy grandes el costo fijo se reparte entre tantas unidades que cada una termina costando casi lo mismo que su costo variable.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Halla la asíntota horizontal de $f(x) = \\dfrac{4x^2 - 1}{2x^2 + x}$.",
            parts: [{ kind: "expr", before: "y =", answer: "2", mistakes: [{ answer: "-1", feedback: "Esas son las constantes. Con grados iguales mandan los coeficientes de $x^2$." }] }],
            solution: ["Grados iguales: $y = \\frac{4}{2} = 2$."],
          },
        },
      ],
    },
    {
      id: "oblicuas",
      title: "Asíntotas oblicuas",
      blocks: [
        {
          type: "text",
          md: "Cuando $f$ crece sin control pero lo hace como una recta inclinada, la asíntota es oblicua: $y = mx + b$. Si $f(x)$ se parece a $mx + b$ para $x$ grande, al dividir entre $x$ queda casi $m$, y al restar $mx$ queda casi $b$. De ahí salen las dos fórmulas.",
        },
        {
          type: "definition",
          title: "Cálculo de la asíntota oblicua",
          md: "$$m = \\lim_{x \\to \\pm\\infty} \\frac{f(x)}{x}$$\n\n$$b = \\lim_{x \\to \\pm\\infty} [f(x) - mx]$$\n\nSi los dos límites existen, son finitos y $m \\neq 0$, la recta $y = mx + b$ es asíntota oblicua por ese lado. Se calcula por separado hacia $+\\infty$ y hacia $-\\infty$.",
        },
        {
          type: "example",
          title: "Con las fórmulas",
          problem: "Determina las asíntotas de $f(x) = \\dfrac{x^2 + 2x}{x - 2}$.",
          steps: [
            "Vertical: el denominador se anula en $x = 2$ y el numerador vale $8$. Asíntota $x = 2$.",
            "$m = \\lim_{x \\to \\pm\\infty} \\dfrac{x^2 + 2x}{x(x-2)} = \\lim \\dfrac{x^2 + 2x}{x^2 - 2x} = 1$.",
            "$b = \\lim_{x \\to \\pm\\infty} \\left[ \\dfrac{x^2 + 2x}{x - 2} - x \\right] = \\lim \\dfrac{x^2 + 2x - x^2 + 2x}{x - 2} = \\lim \\dfrac{4x}{x-2} = 4$.",
            "Los límites dan lo mismo hacia los dos lados, así que es una sola recta.",
          ],
          answer: "Asíntota vertical $x = 2$ y oblicua $y = x + 4$.",
        },
        {
          type: "graph",
          spec: {
            x: [-10, 12],
            y: [-10, 22],
            step: 2,
            curves: [
              { fn: "\\frac{x^2+2x}{x-2}", breaks: [2], color: "accent" },
              { fn: "x + 4", dashed: true, color: "muted" },
            ],
            vlines: [{ x: 2, dashed: true, color: "muted" }],
          },
          caption: "La curva se pega a la recta $y = x + 4$ por los dos lados.",
        },
        {
          type: "example",
          title: "Por división de polinomios",
          problem: "Halla la oblicua de $f(x) = \\dfrac{x^2 + 2x}{x - 2}$ dividiendo.",
          steps: [
            "Divide $x^2 + 2x$ entre $x - 2$ (por Ruffini con $2$): cociente $x + 4$ y resto $8$.",
            "Entonces $f(x) = x + 4 + \\dfrac{8}{x - 2}$.",
            "La fracción $\\frac{8}{x-2}$ tiende a $0$ cuando $x \\to \\pm\\infty$, así que $f(x) - (x + 4) \\to 0$.",
          ],
          answer: "$y = x + 4$, el cociente de la división.",
        },
        {
          type: "example",
          title: "Con raíz, tipo parcial",
          problem: "Calcula las asíntotas de $f(x) = \\dfrac{x^2}{\\sqrt{x^2 - 9}}$.",
          steps: [
            "Dominio: $x^2 - 9 > 0$, o sea $x < -3$ o $x > 3$. Cuando $x \\to 3^+$ o $x \\to -3^-$ el denominador tiende a $0^+$ y el numerador a $9$: asíntotas verticales $x = 3$ y $x = -3$.",
            "Por la derecha:\n\n$$m = \\lim_{x \\to +\\infty} \\dfrac{x^2}{x\\sqrt{x^2-9}} = \\lim \\dfrac{x}{x\\sqrt{1 - 9/x^2}} = 1$$",
            "Para $b$:\n\n$$b = \\lim_{x \\to +\\infty} \\left[ \\dfrac{x^2}{\\sqrt{x^2-9}} - x \\right] = \\lim \\dfrac{x^2 - x\\sqrt{x^2-9}}{\\sqrt{x^2-9}}$$\n\nMultiplicando por el conjugado $x^2 + x\\sqrt{x^2 - 9}$ el numerador queda $x^4 - x^2(x^2-9) = 9x^2$, y el límite es\n\n$$\\lim \\dfrac{9x^2}{\\sqrt{x^2-9}\\,(x^2 + x\\sqrt{x^2-9})} = 0$$",
            "Por la izquierda $\\sqrt{x^2} = -x$, así que $m = -1$, y con la misma cuenta $b = 0$.",
          ],
          answer: "Verticales $x = \\pm 3$, oblicuas $y = x$ por la derecha y $y = -x$ por la izquierda.",
        },
        {
          type: "note",
          tone: "idea",
          title: "La horizontal es una oblicua con $m = 0$",
          md: "Si al calcular $m$ te da $0$, la recta $y = b$ es horizontal. Por eso una función no puede tener a la vez asíntota horizontal y oblicua hacia el mismo lado. Hacia lados distintos sí puede.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Halla la ordenada $b$ de la asíntota oblicua de $f(x) = \\dfrac{x^2 + 1}{x + 1}$, sabiendo que $m = 1$.",
            parts: [{ kind: "expr", before: "b =", answer: "-1", mistakes: [{ answer: "1", feedback: "Revisa la resta: $\\frac{x^2+1}{x+1} - x = \\frac{x^2 + 1 - x^2 - x}{x+1} = \\frac{1 - x}{x + 1}$." }] }],
            solution: ["$f(x) - x = \\dfrac{1 - x}{x + 1} \\to -1$. La oblicua es $y = x - 1$."],
          },
        },
      ],
    },
    {
      id: "leer-grafica",
      title: "Leer asíntotas en una gráfica",
      blocks: [
        {
          type: "text",
          md: "En el parcial suele venir una gráfica y te piden las ecuaciones de las asíntotas y completar límites. Lee la gráfica de izquierda a derecha y pregúntate en cada zona: ¿se dispara?, ¿se aplana?, ¿se pega a una recta inclinada?",
        },
        { type: "graph", spec: graficaLectura, caption: "Una función con dos asíntotas verticales, una horizontal por la izquierda y una oblicua por la derecha." },
        {
          type: "table",
          headers: ["Zona", "Lo que ves", "Asíntota"],
          rows: [
            ["Extremo izquierdo", "se aplana en $-1$, o sea $\\lim_{x \\to -\\infty} f(x) = -1$", "$y = -1$"],
            ["Cerca de $-3$", "$f \\to -\\infty$ por la izquierda y $f \\to +\\infty$ por la derecha", "$x = -3$"],
            ["Cerca de $2$", "$f \\to +\\infty$ por la izquierda y $f \\to -\\infty$ por la derecha", "$x = 2$"],
            ["Extremo derecho", "se pega a la recta que pasa por $(2, 0)$ y $(4, 2)$", "$y = x - 2$"],
          ],
        },
        {
          type: "note",
          tone: "tip",
          title: "Para la oblicua, saca la recta con dos puntos",
          md: "Si la recta punteada pasa por dos puntos de la cuadrícula, su pendiente es $m = \\dfrac{y_2 - y_1}{x_2 - x_1}$ y $b$ es el corte con el eje $y$. Aquí $m = \\frac{2 - 0}{4 - 2} = 1$ y $b = -2$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "En la gráfica de arriba, ¿cuánto vale $\\lim_{x \\to -\\infty} f(x)$?",
            parts: [{ kind: "expr", answer: "-1", special: ["inf", "-inf", "dne"], before: "\\lim_{x \\to -\\infty} f(x) =" }],
            solution: ["Hacia la izquierda la curva se aplana a la altura $-1$."],
          },
        },
        {
          type: "quick",
          exercise: {
            statement: "Ahora al revés: de la fórmula al dibujo. Halla las asíntotas de $f(x) = \\dfrac{3x - 6}{x + 2}$ y arrastra cada recta hasta su lugar.",
            parts: [
              {
                kind: "place",
                graph: { x: [-8, 8], y: [-6, 12], height: 300 },
                items: [
                  { type: "vline", label: "\\text{vertical}", answer: -2 },
                  { type: "hline", label: "\\text{horizontal}", answer: 3 },
                ],
                reveal: [{ fn: "\\frac{3x-6}{x+2}", breaks: [-2], color: "accent" }],
              },
            ],
            hints: ["La vertical sale del cero del denominador. Para la horizontal, los grados son iguales."],
            solution: [
              "El denominador se anula en $x = -2$ y ahí el numerador vale $-12$: asíntota vertical $x = -2$.",
              "Grados iguales: $y = \\frac{3}{1} = 3$.",
            ],
          },
        },
      ],
    },
    {
      id: "bosquejar",
      title: "Bosquejar una gráfica a partir de condiciones",
      blocks: [
        {
          type: "text",
          md: "Es una de las preguntas que más se repite en el segundo parcial: te dan una lista de valores y límites y piden una gráfica que los cumpla. No hace falta una fórmula. El orden de trabajo que funciona es este:\n\n- Dibuja punteadas todas las asíntotas. Las verticales salen de los límites infinitos en un número, la horizontal de un límite finito en $\\pm\\infty$ y la oblicua de los datos $m$ y $b$.\n- Marca los puntos que te dan, como $f(-2) = 0$.\n- Junto a cada asíntota vertical, haz un trazo corto en la dirección que dice cada límite lateral.\n- Une todo con trazos suaves, sin levantar el lápiz donde la función sea continua.",
        },
        {
          type: "example",
          title: "Condiciones tipo parcial",
          problem: "Construye la gráfica de una función $h$ que cumpla:\n\n- $h(-2) = h(2) = 0$\n- $\\lim_{x \\to 0} h(x) = +\\infty$\n- $\\lim_{x \\to -3} h(x) = +\\infty$\n- $\\lim_{x \\to +\\infty} h(x) = -1$\n- asíntota oblicua $y = -x - 4$ hacia la izquierda",
          steps: [
            "Asíntotas verticales: $x = -3$ y $x = 0$. A los dos lados de cada una la curva sube, porque el límite es $+\\infty$ sin especificar lado.",
            "Asíntota horizontal $y = -1$ por la derecha. Asíntota oblicua $y = -x - 4$ por la izquierda.",
            "Puntos: $(-2, 0)$ entre las dos verticales y $(2, 0)$ a la derecha de $x = 0$.",
            "Entre $-3$ y $0$ la curva baja desde $+\\infty$, pasa por $(-2, 0)$ y vuelve a subir. A la derecha de $0$ baja desde $+\\infty$, corta el eje en $x = 2$ y se acerca a $y = -1$.",
          ],
        },
        { type: "graph", spec: ejemploBosquejo, caption: "Una gráfica posible. Hay infinitas que cumplen las mismas condiciones." },
        {
          type: "note",
          tone: "warning",
          title: "Respeta cada condición, y solo esas",
          md: "Un detalle que se olvida: si te dicen que $f$ es continua en su dominio salvo en ciertos puntos, no puedes meter saltos ni huecos en otros lados. Y si el límite es $+\\infty$ sin indicar lado, la curva sube por los dos lados de la vertical.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Una función cumple $\\lim_{x \\to -\\infty} \\frac{f(x)}{x} = -\\frac{1}{2}$ y $\\lim_{x \\to -\\infty} \\left[ f(x) + \\frac{1}{2}x \\right] = -1$. ¿Qué asíntota tiene hacia la izquierda?",
            parts: [
              choice("$y = -\\frac{1}{2}x - 1$", [
                ["$y = \\frac{1}{2}x - 1$", "El segundo límite resta $mx$. Si aparece $f(x) + \\frac{1}{2}x$, es porque $m = -\\frac{1}{2}$."],
                ["$y = -1$", "Esa sería horizontal, pero $m = -\\frac{1}{2} \\neq 0$. Es oblicua."],
                ["$y = -\\frac{1}{2}x + 1$", "El segundo límite da directamente $b = -1$."],
              ]),
            ],
            solution: ["El primer límite da $m = -\\frac{1}{2}$ y el segundo es $\\lim [f(x) - mx] = b = -1$. La oblicua es $y = -\\frac{1}{2}x - 1$."],
          },
        },
      ],
    },
  ],
  exercises: [
    avRacional,
    ahRacional,
    leerLimite,
    leerGrafica,
    ubicarAsintotas,
    tipoNoVertical,
    ubicarDosVerticales,
    oblicuaRacional,
    expRaiz,
    elegirGrafica,
    raizCompleto,
    racionalCompleto,
    ubicarConHueco,
    trozosAsintotas,
  ],
};

export default topic;
