import { meta } from "../catalog";
import { choice, trueFalse } from "../helpers";
import type { ExerciseGen, GraphSpec, GraphPoint, Part, Rich, Topic } from "../types";
import { cases, coef, fmt, frac, minus, num, signed, terms } from "@/lib/math/tex";
import type { Rng } from "@/lib/math/rng";

/* ----------------------------- utilidades locales ----------------------------- */

type ExprPart = Extract<Part, { kind: "expr" }>;
const SPECIAL: ExprPart["special"] = ["inf", "-inf", "dne"];

/** Parte de respuesta para un límite: siempre con los botones de infinito y "no existe". */
function limPart(answer: string, extra: Partial<Omit<ExprPart, "kind" | "answer">> = {}): ExprPart {
  return { kind: "expr", answer, special: SPECIAL, ...extra };
}

/** Errores típicos numéricos, sin repetir y sin el valor correcto. */
function wrongNums(ans: number | null, list: [number, Rich][]) {
  const out: { answer: string; feedback: Rich }[] = [];
  const used: number[] = ans === null ? [] : [ans];
  for (const [v, feedback] of list) {
    if (used.some((u) => Math.abs(u - v) < 1e-9)) continue;
    used.push(v);
    out.push({ answer: fmt(v), feedback });
  }
  return out;
}

/** Recta con pendiente m que pasa por (x0, y0), como LaTeX en x. */
const lineThrough = (x0: number, y0: number, m: number) => terms([[m, "x"], [y0 - m * x0, ""]]);

/** Punto al que tiende x, con lado opcional: 2^{-}, -1^{+}. */
const pt = (a: number, side?: "-" | "+") => (side ? `${a}^{${side}}` : `${a}`);
const limF = (a: number, side?: "-" | "+") => `\\lim_{x \\to ${pt(a, side)}} f(x)`;

/** Tabla horizontal de valores en LaTeX. */
function tableTex(xs: number[], ys: number[]) {
  return `\\begin{array}{c|${"c".repeat(xs.length)}} x & ${xs.map((v) => num(v)).join(" & ")} \\\\ \\hline f(x) & ${ys
    .map((v) => num(v))
    .join(" & ")} \\end{array}`;
}

const NEAR = [-0.1, -0.01, -0.001, 0.001, 0.01, 0.1];

/** Función lineal a trozos con un salto en c1 y un hueco en c2, como en los parciales. */
interface PwGraph {
  c1: number;
  c2: number;
  yA: number;
  yB: number;
  yC: number;
  yD: number;
  f1: number;
  /** Límite por cada lado en un x cualquiera. */
  side: (x: number, s: -1 | 1) => number;
  spec: GraphSpec;
}

function randomPw(r: Rng): PwGraph {
  const c1 = r.int(-3, -2);
  const c2 = r.int(2, 3);
  const yA = r.int(-4, 4);
  const sA = r.pick([-1, -0.5, 0.5, 1]);
  const yB = r.nz(-4, 4, [yA]);
  const yC = r.int(-4, 4);
  const yCfix = yC === yB ? yB + (yB < 3 ? 2 : -2) : yC;
  const yD = r.nz(-4, 4, [yCfix]);
  const mode = r.pick(["A", "B", "O"] as const);
  const f1 = mode === "A" ? yA : mode === "B" ? yB : r.nz(-4, 4, [yA, yB]);
  const sB = (yCfix - yB) / (c2 - c1);
  const A = (x: number) => yA + sA * (x - c1);
  const B = (x: number) => yB + sB * (x - c1);
  const points: GraphPoint[] = [
    { x: c1, y: yA, open: f1 !== yA },
    { x: c1, y: yB, open: f1 !== yB },
    { x: c2, y: yCfix, open: true },
    { x: c2, y: yD },
  ];
  if (mode === "O") points.push({ x: c1, y: f1 });
  return {
    c1,
    c2,
    yA,
    yB,
    yC: yCfix,
    yD,
    f1,
    side: (x, s) => (x < c1 || (x === c1 && s === -1) ? A(x) : B(x)),
    spec: {
      x: [-7, 7],
      y: [-7, 7],
      curves: [
        { fn: lineThrough(c1, yA, sA), domain: [-7, c1], color: "accent" },
        { fn: lineThrough(c1, yB, sB), domain: [c1, 7], color: "accent" },
      ],
      points,
    },
  };
}

/* ----------------------------------- ejercicios ----------------------------------- */

const tabla: ExerciseGen = {
  id: "tabla",
  title: "Estimar un límite con una tabla",
  level: 1,
  generate: (r) => {
    const cubic = r.bool(0.35);
    let a: number, L: number, fTex: string, simple: string;
    let f: (x: number) => number;
    if (cubic) {
      a = r.pick([-2, -1, 1, 2]);
      L = 3 * a * a;
      fTex = `\\dfrac{x^{3} ${signed(-(a ** 3))}}{${minus("x", a)}}`;
      simple = terms([[1, "x^{2}"], [a, "x"], [a * a, ""]]);
      f = (x) => x * x + a * x + a * a;
    } else {
      a = r.int(-3, 4);
      const b = r.nz(-5, 5);
      L = a + b;
      fTex = `\\dfrac{${terms([[1, "x^{2}"], [b - a, "x"], [-a * b, ""]])}}{${minus("x", a)}}`;
      simple = minus("x", -b);
      f = (x) => x + b;
    }
    const xs = NEAR.map((h) => a + h);
    const ys = xs.map(f);
    return {
      statement: `La función $f(x) = ${fTex}$ no está definida en $x = ${a}$ porque ahí el denominador vale cero. La tabla muestra valores de $f$ cerca de $${a}$.\n\n$$${tableTex(xs, ys)}$$\n\nEstima $${limF(a)}$.`,
      parts: [
        limPart(fmt(L), {
          before: `${limF(a)} =`,
          mistakes: wrongNums(L, [
            [Math.round(ys[2] * 1e4) / 1e4, "Ese es un valor de la tabla, no el límite. Fíjate a qué número se acercan los valores de los dos lados."],
            [Math.round(ys[3] * 1e4) / 1e4, "Ese es un valor de la tabla, no el límite. Fíjate a qué número se acercan los valores de los dos lados."],
          ]),
        }),
      ],
      hints: [
        "Lee la fila de $f(x)$ de izquierda a derecha. Los valores del medio son los que están más cerca del punto.",
        "Por la izquierda y por la derecha los valores se juntan alrededor de un mismo número.",
      ],
      solution: [
        `Por la izquierda: $${num(ys[0])}, \\; ${num(ys[1])}, \\; ${num(ys[2])}$, que se acercan a $${L}$.`,
        `Por la derecha: $${num(ys[5])}, \\; ${num(ys[4])}, \\; ${num(ys[3])}$, que también se acercan a $${L}$.`,
        `Como los dos lados se acercan al mismo número, $${limF(a)} = ${L}$. Se confirma con álgebra: para $x \\ne ${a}$ la fracción se simplifica a $${simple}$, y en $x = ${a}$ eso da $${L}$.`,
      ],
    };
  },
};

const tablaLaterales: ExerciseGen = {
  id: "tabla-laterales",
  title: "Laterales a partir de una tabla",
  level: 1,
  generate: (r) => {
    const a = r.int(-3, 4);
    const p = r.int(-4, 5);
    const q = r.bool(0.35) ? p : r.nz(-4, 5, [p]);
    const m1 = r.pick([-3, -2, -1, 1, 2, 3]);
    const m2 = r.pick([-3, -2, -1, 1, 2, 3]);
    const xs = NEAR.map((h) => a + h);
    const ys = NEAR.map((h) => (h < 0 ? p + m1 * h : q + m2 * h));
    const same = p === q;
    return {
      statement: `La tabla muestra valores de una función $f$ cerca de $x = ${a}$.\n\n$$${tableTex(xs, ys)}$$\n\nUsa la tabla para estimar los límites.`,
      sequential: true,
      parts: [
        limPart(fmt(p), {
          prompt: `Límite por la izquierda.`,
          before: `${limF(a, "-")} =`,
          mistakes: wrongNums(p, [[q, "Ese es el valor al que se acercan los $x$ mayores que el punto. Por la izquierda se miran los $x$ menores."]]),
        }),
        limPart(fmt(q), {
          prompt: `Límite por la derecha.`,
          before: `${limF(a, "+")} =`,
          mistakes: wrongNums(q, [[p, "Ese es el límite por la izquierda. Por la derecha se miran los $x$ mayores que el punto."]]),
        }),
        limPart(same ? fmt(p) : "dne", { prompt: "Límite en el punto.", before: `${limF(a)} =` }),
      ],
      hints: [
        `Las tres primeras columnas tienen $x < ${a}$, son el lado izquierdo. Las tres últimas tienen $x > ${a}$.`,
        "El límite existe solo si los dos lados se acercan al mismo número.",
      ],
      solution: [
        `Con $x < ${a}$ los valores son $${num(ys[0])}, ${num(ys[1])}, ${num(ys[2])}$, que se acercan a $${p}$. Entonces $${limF(a, "-")} = ${p}$.`,
        `Con $x > ${a}$ los valores son $${num(ys[5])}, ${num(ys[4])}, ${num(ys[3])}$, que se acercan a $${q}$. Entonces $${limF(a, "+")} = ${q}$.`,
        same
          ? `Los laterales coinciden, así que $${limF(a)} = ${p}$.`
          : `Los laterales son distintos ($${p} \\ne ${q}$), así que $${limF(a)}$ no existe.`,
      ],
    };
  },
};

const lateralLectura: ExerciseGen = {
  id: "lateral-grafica",
  title: "Leer un límite en una gráfica con salto",
  level: 1,
  generate: (r) => {
    const a = r.int(-2, 2);
    const yL = r.int(-4, 4);
    const yR = r.nz(-4, 4, [yL]);
    const mode = r.pick(["L", "R", "O"] as const);
    const yF = mode === "L" ? yL : mode === "R" ? yR : r.nz(-4, 4, [yL, yR]);
    const m1 = r.pick([-1, -0.5, 0, 0.5, 1]);
    const m2 = r.pick([-1, -0.5, 0, 0.5, 1]);
    const points: GraphPoint[] = [
      { x: a, y: yL, open: yF !== yL },
      { x: a, y: yR, open: yF !== yR },
    ];
    if (mode === "O") points.push({ x: a, y: yF });
    const graph: GraphSpec = {
      x: [-6, 6],
      y: [-6, 6],
      curves: [
        { fn: lineThrough(a, yL, m1), domain: [-6, a], color: "accent" },
        { fn: lineThrough(a, yR, m2), domain: [a, 6], color: "accent" },
      ],
      points,
    };
    const target = r.pick(["left", "right", "both", "value"] as const);
    const ask = {
      left: { tex: limF(a, "-"), ans: fmt(yL) },
      right: { tex: limF(a, "+"), ans: fmt(yR) },
      both: { tex: limF(a), ans: "dne" },
      value: { tex: `f(${a})`, ans: fmt(yF) },
    }[target];
    const ansNum = target === "left" ? yL : target === "right" ? yR : target === "value" ? yF : null;
    const mistakes = wrongNums(ansNum, [
      [yL, "Ese es el límite por la izquierda: a donde llega la curva que viene desde los $x$ menores."],
      [yR, "Ese es el límite por la derecha: a donde llega la curva que viene desde los $x$ mayores."],
      [yF, `Ese es $f(${a})$, la altura del punto relleno. El límite mira la curva cerca del punto, no el punto mismo.`],
    ]);
    return {
      statement: `Observa la gráfica de $f$. Los puntos huecos no pertenecen a la gráfica y los rellenos sí. Halla $${ask.tex}$.`,
      graph,
      parts: [
        target === "value"
          ? { kind: "expr", answer: ask.ans, before: `${ask.tex} =`, mistakes }
          : limPart(ask.ans, { before: `${ask.tex} =`, mistakes: target === "both" ? [] : mistakes }),
      ],
      hints: [
        target === "value"
          ? "El valor de la función es la altura del punto relleno que está sobre $x = " + a + "$."
          : "Recorre la curva con el dedo acercándote a $x = " + a + "$ por el lado que te piden. Mira a qué altura llegas.",
        "Si te piden el límite sin lado, compara los dos laterales.",
      ],
      solution: [
        `Por la izquierda la curva llega a la altura $${yL}$: $${limF(a, "-")} = ${yL}$.`,
        `Por la derecha llega a la altura $${yR}$: $${limF(a, "+")} = ${yR}$.`,
        `Los laterales son distintos, así que $${limF(a)}$ no existe. El punto relleno está a la altura $${yF}$, así que $f(${a}) = ${yF}$.`,
      ],
    };
  },
};

const existeVF: ExerciseGen = {
  id: "vf-existencia",
  title: "Verdadero o falso sobre la existencia del límite",
  level: 1,
  generate: (r) => {
    const a = r.int(-4, 5);
    const p = r.int(-5, 5);
    const q = r.nz(-5, 5, [p]);
    const pool: { claim: Rich; t: boolean; why: Rich }[] = [
      {
        claim: `Si $f(${a})$ no está definido, entonces $\\lim_{x \\to ${a}} f(x)$ no existe.`,
        t: false,
        why: "El límite solo mira lo que pasa cerca del punto. La función $\\frac{x^2-1}{x-1}$ no está definida en $1$ y aun así su límite en $1$ vale $2$.",
      },
      {
        claim: `Si $${limF(a, "-")} = ${p}$ y $${limF(a, "+")} = ${p}$, entonces $${limF(a)} = ${p}$.`,
        t: true,
        why: "Es justo el criterio de existencia: si los dos laterales valen lo mismo, el límite existe y vale eso.",
      },
      {
        claim: `Si $f(${a}) = ${p}$, entonces $${limF(a)} = ${p}$.`,
        t: false,
        why: "El valor en el punto puede ser distinto del límite, o el límite puede no existir. Piensa en una gráfica con un punto relleno separado de la curva.",
      },
      {
        claim: `Si $${limF(a, "-")} = ${p}$ y $${limF(a, "+")} = ${q}$, entonces $${limF(a)} = ${frac(p + q, 2)}$.`,
        t: false,
        why: "Los laterales no se promedian. Si son distintos, el límite no existe.",
      },
      {
        claim: `Una función puede tener dos límites distintos cuando $x \\to ${a}$.`,
        t: false,
        why: "El teorema de unicidad dice que si el límite existe, es uno solo.",
      },
      {
        claim: `Puede ocurrir que $${limF(a)} = ${p}$ aunque $f(${a}) = ${q}$.`,
        t: true,
        why: "Sí. Basta con una curva que se acerca a la altura " + p + " con un hueco en el punto y un punto relleno aparte a la altura " + q + ".",
      },
    ];
    const c = r.pick(pool);
    return {
      statement: `¿Verdadero o falso? ${c.claim}`,
      parts: [trueFalse(c.t, c.why)],
      hints: ["Recuerda que el límite describe lo que pasa cerca del punto, no en el punto."],
      solution: [`${c.t ? "Verdadero" : "Falso"}. ${c.why}`],
    };
  },
};

const interpretar: ExerciseGen = {
  id: "interpretar-notacion",
  title: "Qué dice la notación de límite",
  level: 1,
  generate: (r) => {
    const a = r.int(-5, 5);
    const b = r.nz(-6, 6, [a]);
    const side = r.pick(["+", "-", ""] as const);
    const tex = `\\lim_{x \\to ${side ? pt(a, side) : a}} f(x) = ${b}`;
    const right = `Cuando $x$ se acerca a $${a}$ con valores mayores que $${a}$, $f(x)$ se acerca a $${b}$.`;
    const left = `Cuando $x$ se acerca a $${a}$ con valores menores que $${a}$, $f(x)$ se acerca a $${b}$.`;
    const both = `Cuando $x$ se acerca a $${a}$ por cualquiera de los dos lados, $f(x)$ se acerca a $${b}$.`;
    const correct = side === "+" ? right : side === "-" ? left : both;
    const wrong: [Rich, Rich][] = [
      [`$f(${a}) = ${b}$`, "El límite no habla del valor en el punto. La función podría valer otra cosa en $x = " + a + "$ o no estar definida."],
      [`Cuando $x$ se acerca a $${b}$, $f(x)$ se acerca a $${a}$.`, "Intercambiaste los papeles. Abajo de la flecha va a dónde se acerca $x$, y a la derecha del igual va a dónde se acerca $f(x)$."],
    ];
    if (side !== "+") wrong.push([right, "Eso sería el límite por la derecha, que se escribe con el signo $+$ arriba del número."]);
    if (side !== "-") wrong.push([left, "Eso sería el límite por la izquierda, que se escribe con el signo $-$ arriba del número."]);
    return {
      statement: `¿Qué significa $${tex}$?`,
      parts: [choice(correct, wrong)],
      hints: ["El signo arriba del número indica el lado: $+$ son valores mayores, $-$ son valores menores. Sin signo, son los dos lados."],
      solution: [
        side === "+"
          ? `El $+$ indica que $x$ se acerca a $${a}$ por la derecha, con valores como $${num(a + 0.1)}, ${num(a + 0.01)}, \\dots$`
          : side === "-"
            ? `El $-$ indica que $x$ se acerca a $${a}$ por la izquierda, con valores como $${num(a - 0.1)}, ${num(a - 0.01)}, \\dots$`
            : "Sin signo, $x$ se acerca por los dos lados.",
        `El número a la derecha del igual, $${b}$, es la altura a la que se acerca $f(x)$. Nada se dice sobre $f(${a})$.`,
      ],
    };
  },
};

const trozosLaterales: ExerciseGen = {
  id: "trozos-laterales",
  title: "Límite de una función a trozos",
  level: 2,
  generate: (r) => {
    const a = r.int(-2, 3);
    const p = r.nz(-2, 2);
    const q = r.int(-4, 4);
    const R = p * a * a + q;
    const L = r.bool() ? R : R + r.nz(-4, 4);
    const m1 = r.nz(-3, 3);
    const b1 = L - m1 * a;
    const linTex = terms([[m1, "x"], [b1, ""]]);
    const quadTex = terms([[p, "x^{2}"], [q, ""]]);
    const fTex = cases([
      [linTex, `x < ${a}`],
      [quadTex, `x \\ge ${a}`],
    ]);
    const exists = L === R;
    return {
      statement: `Sea $$f(x) = ${fTex}$$ Estudia el límite de $f$ cuando $x \\to ${a}$.`,
      sequential: true,
      parts: [
        limPart(fmt(L), {
          before: `${limF(a, "-")} =`,
          mistakes: wrongNums(L, [[R, `Usaste la fórmula de la derecha. Para $x < ${a}$ la función es $${linTex}$.`]]),
        }),
        limPart(fmt(R), {
          before: `${limF(a, "+")} =`,
          mistakes: wrongNums(R, [[L, `Usaste la fórmula de la izquierda. Para $x > ${a}$ la función es $${quadTex}$.`]]),
        }),
        limPart(exists ? fmt(R) : "dne", { before: `${limF(a)} =` }),
      ],
      hints: [
        `Para el límite por la izquierda usa la fórmula que vale cuando $x < ${a}$. Para la derecha, la que vale cuando $x > ${a}$.`,
        "Cada fórmula es un polinomio, así que basta sustituir $x = " + a + "$ en ella.",
        "Compara los dos laterales.",
      ],
      solution: [
        `Por la izquierda: $${limF(a, "-")} = ${coef(m1, `(${a})`)}${b1 === 0 ? "" : ` ${signed(b1)}`} = ${L}$.`,
        `Por la derecha: $${limF(a, "+")} = ${coef(p, `(${a})^{2}`)}${q === 0 ? "" : ` ${signed(q)}`} = ${R}$.`,
        exists
          ? `Los laterales coinciden, así que $${limF(a)} = ${R}$.`
          : `Los laterales son distintos ($${L} \\ne ${R}$), así que $${limF(a)}$ no existe. La gráfica tiene un salto en $x = ${a}$.`,
      ],
    };
  },
};

const trozosTres: ExerciseGen = {
  id: "trozos-tres",
  title: "Función de tres trozos",
  level: 2,
  generate: (r) => {
    const p = r.int(-3, -1);
    const q = r.int(1, 3);
    const c = r.int(-3, 3);
    const Bp = p * p + c;
    const Bq = q * q + c;
    const contP = r.bool();
    const contQ = r.bool();
    const Ap = contP ? Bp : Bp + r.nz(-3, 3);
    const Cq = contQ ? Bq : Bq + r.nz(-3, 3);
    const m1 = r.nz(-2, 2);
    const m3 = r.pick([-1, 1, 2]);
    const A = terms([[m1, "x"], [Ap - m1 * p, ""]]);
    const B = terms([[1, "x^{2}"], [c, ""]]);
    const C = terms([[m3, "x"], [Cq - m3 * q, ""]]);
    return {
      statement: `Sea $$f(x) = ${cases([
        [A, `x < ${p}`],
        [B, `${p} \\le x \\le ${q}`],
        [C, `x > ${q}`],
      ])}$$ Calcula los límites en los puntos donde cambia la fórmula. Si no existe, márcalo.`,
      sequential: true,
      parts: [
        limPart(contP ? fmt(Bp) : "dne", { before: `${limF(p)} =` }),
        limPart(contQ ? fmt(Bq) : "dne", { before: `${limF(q)} =` }),
      ],
      hints: [
        `En $x = ${p}$ se encuentran el primer y el segundo trozo. En $x = ${q}$, el segundo y el tercero.`,
        "Calcula los dos laterales en cada punto y compáralos.",
      ],
      solution: [
        `En $x = ${p}$: por la izquierda $${A}$ da $${Ap}$ y por la derecha $${B}$ da $${Bp}$. ${contP ? `Coinciden, el límite es $${Bp}$.` : "Son distintos, el límite no existe."}`,
        `En $x = ${q}$: por la izquierda $${B}$ da $${Bq}$ y por la derecha $${C}$ da $${Cq}$. ${contQ ? `Coinciden, el límite es $${Bq}$.` : "Son distintos, el límite no existe."}`,
      ],
    };
  },
};

const valorAbsoluto: ExerciseGen = {
  id: "valor-absoluto",
  title: "Laterales con valor absoluto (tipo parcial)",
  level: 2,
  exam: true,
  generate: (r) => {
    const kind = r.pick(["cociente", "cuadrado"] as const);
    let fTex: string, L: number, R: number, steps: Rich[];
    let a: number;
    if (kind === "cociente") {
      a = r.int(-3, 3);
      const k = r.pick([1, 1, 2, 3]);
      const m = r.pick([1, 2, 3, 4, -2]);
      const den = terms([[m, "x"], [-m * a, ""]]);
      fTex = `\\dfrac{${k === 1 ? "" : k}|${minus("x", a)}|}{${den}}`;
      R = k / m;
      L = -k / m;
      const factored = a === 0 || m === 1 ? den : `${m === -1 ? "-" : m}(${minus("x", a)})`;
      steps = [
        `El denominador es $${den} = ${factored}$, que se anula en $x = ${a}$. Al sustituir sale $\\frac{0}{0}$.`,
        `Si $x > ${a}$, entonces $|${minus("x", a)}| = ${minus("x", a)}$ y la fracción se simplifica a $${frac(k, m)}$. Por eso $${limF(a, "+")} = ${frac(k, m)}$.`,
        `Si $x < ${a}$, entonces $|${minus("x", a)}| = -(${minus("x", a)})$ y la fracción se simplifica a $${frac(-k, m)}$. Por eso $${limF(a, "-")} = ${frac(-k, m)}$.`,
      ];
    } else {
      a = r.nz(-3, 3);
      fTex = `\\dfrac{x^{2} - ${a * a}}{|${minus("x", a)}|}`;
      R = 2 * a;
      L = -2 * a;
      steps = [
        `El numerador es una diferencia de cuadrados: $x^{2} - ${a * a} = (${minus("x", a)})(${minus("x", -a)})$.`,
        `Si $x > ${a}$, $|${minus("x", a)}| = ${minus("x", a)}$ y la fracción queda $${minus("x", -a)}$. Por eso $${limF(a, "+")} = ${R}$.`,
        `Si $x < ${a}$, $|${minus("x", a)}| = -(${minus("x", a)})$ y la fracción queda $-(${minus("x", -a)})$. Por eso $${limF(a, "-")} = ${L}$.`,
      ];
    }
    return {
      statement: `Sea $$f(x) = ${fTex}$$ Calcula los límites laterales en $x = ${a}$ y decide si existe el límite.`,
      sequential: true,
      parts: [
        limPart(fmt(L), {
          before: `${limF(a, "-")} =`,
          mistakes: wrongNums(L, [[R, `Ese es el límite por la derecha. Para $x < ${a}$ lo de adentro del valor absoluto es negativo y cambia de signo.`]]),
        }),
        limPart(fmt(R), {
          before: `${limF(a, "+")} =`,
          mistakes: wrongNums(R, [[L, `Ese es el límite por la izquierda. Para $x > ${a}$ lo de adentro del valor absoluto es positivo y sale tal cual.`]]),
        }),
        limPart("dne", { before: `${limF(a)} =` }),
      ],
      hints: [
        "Al sustituir directamente sale $\\frac{0}{0}$. Hay que quitar el valor absoluto, y eso depende del lado.",
        `Para $x > ${a}$, $|${minus("x", a)}| = ${minus("x", a)}$. Para $x < ${a}$, $|${minus("x", a)}| = -(${minus("x", a)})$.`,
      ],
      solution: [...steps, `Los laterales son distintos, así que $${limF(a)}$ no existe.`],
    };
  },
};

const deltaLineal: ExerciseGen = {
  id: "delta-lineal",
  title: "Hallar δ para un ε dado",
  level: 2,
  generate: (r) => {
    const m = r.pick([2, 3, 4, 5, -2, -3, -4]);
    const a = r.int(-3, 4);
    const k = r.int(-5, 5);
    const e = r.pick([10, 20, 30, 5, 6, 12]);
    const L = m * a + k;
    const fTex = terms([[m, "x"], [k, ""]]);
    const am = Math.abs(m);
    const epsTex = num(e / 100);
    const delta = frac(e, 100 * am);
    return {
      statement: `Para $f(x) = ${fTex}$ se quiere que $f(x)$ quede a menos de $\\varepsilon = ${epsTex}$ de su límite cuando $x \\to ${a}$.`,
      sequential: true,
      parts: [
        limPart(fmt(L), { prompt: "Calcula el límite $L$.", before: `L = \\lim_{x \\to ${a}} f(x) =` }),
        {
          kind: "expr",
          prompt: `¿Cuál es el mayor $\\delta$ tal que $0 < |x - ${a < 0 ? `(${a})` : a}| < \\delta$ garantiza $|f(x) - L| < ${epsTex}$? Puedes escribirlo como fracción.`,
          answer: delta,
          before: "\\delta =",
          mistakes: [
            { answer: frac(e * am, 100), feedback: `Multiplicaste por $${am}$. Como $|f(x) - L| = ${am}\\,|x - ${a}|$, hay que dividir $\\varepsilon$ entre $${am}$.` },
            { answer: epsTex, feedback: `Con $\\delta = \\varepsilon$ no alcanza: la recta tiene pendiente $${m}$ y estira las distancias $${am}$ veces.` },
          ],
        },
      ],
      hints: [
        `Escribe $|f(x) - L|$ y saca factor común. Debe quedar un múltiplo de $|x - ${a}|$.`,
        `Si $|f(x) - L| = ${am}\\,|x - ${a}|$, la condición $${am}\\,|x - ${a}| < \\varepsilon$ equivale a $|x - ${a}| < \\dfrac{\\varepsilon}{${am}}$.`,
      ],
      solution: [
        `Como $f$ es un polinomio, $L = f(${a}) = ${L}$.`,
        `$|f(x) - L| = |${terms([[m, "x"], [k - L, ""]])}| = |${m}(${minus("x", a)})| = ${am}\\,|${minus("x", a)}|$.`,
        `Queremos $${am}\\,|${minus("x", a)}| < ${epsTex}$, es decir $|${minus("x", a)}| < \\dfrac{${epsTex}}{${am}}$.`,
        `El mayor valor que sirve es $\\delta = ${delta}$. Cualquier $\\delta$ más pequeño también sirve.`,
      ],
    };
  },
};

const graficaCompleta: ExerciseGen = {
  id: "grafica-completa",
  title: "Lectura completa de una gráfica (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const G = randomPw(r);
    const { c1, c2, yA, yB, yC, yD, f1 } = G;
    return {
      statement: "Observa la gráfica de $f$. Los puntos huecos no pertenecen a la gráfica y los rellenos sí. Completa cada valor. Si un límite no existe, márcalo.",
      graph: G.spec,
      sequential: true,
      parts: [
        limPart(fmt(yA), {
          before: `${limF(c1, "-")} =`,
          mistakes: wrongNums(yA, [[yB, "Ese es el límite por la derecha. Por la izquierda te acercas desde los $x$ menores."]]),
        }),
        limPart(fmt(yB), {
          before: `${limF(c1, "+")} =`,
          mistakes: wrongNums(yB, [[yA, "Ese es el límite por la izquierda. Por la derecha te acercas desde los $x$ mayores."]]),
        }),
        limPart("dne", { before: `${limF(c1)} =` }),
        {
          kind: "expr",
          answer: fmt(f1),
          before: `f(${c1}) =`,
          mistakes: wrongNums(f1, [
            [yA, "Ese punto está hueco, no pertenece a la gráfica. Busca el punto relleno."],
            [yB, "Ese punto está hueco, no pertenece a la gráfica. Busca el punto relleno."],
          ]),
        },
        limPart(fmt(yC), {
          before: `${limF(c2)} =`,
          mistakes: wrongNums(yC, [[yD, `Ese es $f(${c2})$, el punto relleno. El límite es la altura a la que llega la curva, aunque ahí tenga un hueco.`]]),
        }),
        {
          kind: "expr",
          answer: fmt(yD),
          before: `f(${c2}) =`,
          mistakes: wrongNums(yD, [[yC, "Ese es el límite. En la curva hay un hueco, el valor de la función es el punto relleno que está aparte."]]),
        },
      ],
      hints: [
        "Para un límite lateral recorre la curva hacia el punto desde el lado indicado y mira la altura a la que llegas.",
        "El valor $f(a)$ es la altura del punto relleno sobre $x = a$. Los huecos no cuentan.",
      ],
      solution: [
        `En $x = ${c1}$ la curva de la izquierda llega a $${yA}$ y la de la derecha sale desde $${yB}$. Los laterales son $${yA}$ y $${yB}$, distintos, así que el límite no existe.`,
        `El punto relleno sobre $x = ${c1}$ está a la altura $${f1}$, así que $f(${c1}) = ${f1}$.`,
        `En $x = ${c2}$ la curva pasa por la altura $${yC}$ con un hueco, por los dos lados. Entonces $${limF(c2)} = ${yC}$.`,
        `El punto relleno sobre $x = ${c2}$ está a la altura $${yD}$, así que $f(${c2}) = ${yD}$. El límite y el valor no coinciden.`,
      ],
    };
  },
};

const leerCondiciones: ExerciseGen = {
  id: "leer-condiciones",
  title: "¿Hacia dónde tiende x? (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const G = randomPw(r);
    const { c1, c2, yA, yB, yC, yD } = G;
    const limAt = (x: number) => {
      const L = G.side(x, -1);
      const R = G.side(x, 1);
      return Math.abs(L - R) < 1e-9 ? L : NaN;
    };
    const pool = [c1, c2, -5, -4, -1, 0, 1, 4, 5].filter((v, i, arr) => arr.indexOf(v) === i);
    const distractors1 = r
      .shuffle(pool.filter((x) => x !== c2 && !(Math.abs(limAt(x) - yC) < 1e-9)))
      .filter((x) => x !== c1)
      .slice(0, 2);
    const fb = (x: number): Rich => {
      if (x === c1) return `En $x = ${c1}$ los laterales valen $${yA}$ y $${yB}$, así que ahí el límite no existe.`;
      const v = limAt(x);
      return `Cerca de $x = ${x}$ la curva está a la altura $${fmt(v)}$, no a la altura $${yC}$.`;
    };
    const part1 = choice(
      `$a = ${c2}$`,
      [[`$a = ${c1}$`, fb(c1)] as [Rich, Rich], ...distractors1.map((x) => [`$a = ${x}$`, fb(x)] as [Rich, Rich])],
      `¿Para qué valor de $a$ se cumple $\\lim_{x \\to a} f(x) = ${yC}$?`,
    );
    const others2 = r.shuffle(pool.filter((x) => x !== c1 && x !== c2)).slice(0, 2);
    const part2 = choice(
      `$a = ${c1}$`,
      [
        [`$a = ${c2}$`, `En $x = ${c2}$ el límite sí existe y vale $${yC}$. Lo que pasa es que $f(${c2}) = ${yD}$ es distinto, pero eso no impide que el límite exista.`] as [Rich, Rich],
        ...others2.map((x) => [`$a = ${x}$`, `En $x = ${x}$ la curva es continua: el límite existe y coincide con el valor.`] as [Rich, Rich]),
      ],
      "¿En qué valor $a$ está definida $f(a)$ pero no existe $\\lim_{x \\to a} f(x)$?",
    );
    return {
      statement: "Observa la gráfica de $f$. Los puntos huecos no pertenecen a la gráfica y los rellenos sí.",
      graph: G.spec,
      sequential: true,
      parts: [part1, part2],
      hints: [
        "Para que el límite exista, la curva tiene que llegar a la misma altura por la izquierda y por la derecha.",
        "Un punto relleno aislado cambia el valor de la función, pero no el límite.",
      ],
      solution: [
        `En $x = ${c2}$ la curva llega a la altura $${yC}$ por los dos lados (hay un hueco ahí). Entonces $\\lim_{x \\to ${c2}} f(x) = ${yC}$.`,
        `En $x = ${c1}$ hay un salto: por la izquierda la curva llega a $${yA}$ y por la derecha a $${yB}$. El límite no existe, aunque $f(${c1})$ sí está definida.`,
      ],
    };
  },
};

const parametroTrozos: ExerciseGen = {
  id: "parametro-trozos",
  title: "Hallar k para que exista el límite (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const tpl = r.pick(["A", "B"] as const);
    const k = r.nz(-3, 3);
    let a: number, left: string, right: string, eq: Rich[], L: number;
    if (tpl === "A") {
      a = r.pick([-3, -2, 2, 3]);
      const m = r.nz(-3, 3);
      const b1 = m * a + k - k * a * a;
      left = `kx^{2}${b1 === 0 ? "" : ` ${signed(b1)}`}`;
      right = `${coef(m, "x")} + k`;
      L = m * a + k;
      const lk = terms([[a * a, "k"], [b1, ""]]);
      const rk = terms([[1, "k"], [m * a, ""]]);
      eq = [
        `Por la izquierda: $${limF(a, "-")} = k(${a})^{2}${b1 === 0 ? "" : ` ${signed(b1)}`} = ${lk}$.`,
        `Por la derecha: $${limF(a, "+")} = ${coef(m, `(${a})`)} + k = ${rk}$.`,
        `Igualamos: $${lk} = ${rk}$, de donde $${coef(a * a - 1, "k")} = ${m * a - b1}$ y $k = ${k}$.`,
        `Con $k = ${k}$, los dos laterales valen $${L}$.`,
      ];
    } else {
      a = r.pick([-3, -2, 0, 1, 2, 3]);
      const b1 = a * a - k - k * a;
      left = `kx${b1 === 0 ? "" : ` ${signed(b1)}`}`;
      right = "x^{2} - k";
      L = a * a - k;
      const lk = terms([[a, "k"], [b1, ""]]);
      const rk = terms([[-1, "k"], [a * a, ""]]);
      eq = [
        `Por la izquierda: $${limF(a, "-")} = k(${a})${b1 === 0 ? "" : ` ${signed(b1)}`} = ${lk}$.`,
        `Por la derecha: $${limF(a, "+")} = (${a})^{2} - k = ${rk}$.`,
        `Igualamos: $${lk} = ${rk}$, de donde $${coef(a + 1, "k")} = ${a * a - b1}$ y $k = ${k}$.`,
        `Con $k = ${k}$, los dos laterales valen $${L}$.`,
      ];
    }
    return {
      statement: `Sea $$f(x) = ${cases([
        [left, `x < ${a}`],
        [right, `x \\ge ${a}`],
      ])}$$ Halla el valor de $k$ para que exista $\\lim_{x \\to ${a}} f(x)$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Valor de $k$.", answer: fmt(k), before: "k =" },
        limPart(fmt(L), { prompt: "Con ese $k$, calcula el límite.", before: `${limF(a)} =` }),
      ],
      hints: [
        "El límite existe solo si los dos laterales son iguales. Escribe cada lateral en función de $k$.",
        "Iguala los dos laterales. Te queda una ecuación lineal en $k$.",
      ],
      solution: eq,
    };
  },
};

const ubicarLimiteTabla: ExerciseGen = {
  id: "ubicar-limite-tabla",
  title: "Ubicar en el plano el punto al que se acerca la gráfica",
  level: 1,
  generate: (r) => {
    const a = r.int(-3, 4);
    const L = r.int(-5, 5);
    const m = r.pick([-2, -1, 1, 2, 3]);
    const curva = r.bool(0.4);
    const s = r.pick([-1, 1]);
    // f(x) = L + m(x - a) + s(x - a)^2 si es curva
    const f = (x: number) => L + m * (x - a) + (curva ? s * (x - a) ** 2 : 0);
    const u = minus("x", a);
    const fn = `${L} ${m > 0 ? "+" : "-"} ${Math.abs(m)}(${u})${curva ? ` ${s > 0 ? "+" : "-"} (${u})^{2}` : ""}`;
    const xs = NEAR.map((h) => a + h);
    const ys = xs.map(f);
    return {
      statement: `Una función $f$ no está definida en $x = ${a}$. La tabla muestra algunos de sus valores cerca de ese punto.\n\n$$${tableTex(xs, ys)}$$\n\nSu gráfica tiene un hueco. Arrastra el punto hasta ese hueco, es decir, hasta $(${a}, ${limF(a)})$.`,
      parts: [
        {
          kind: "place",
          graph: { x: [-6, 6], y: [-8, 8], height: 280 },
          items: [{ type: "point", label: "P", answer: [a, L], start: [-5, 7] }],
          reveal: [{ fn, breaks: [a], color: "accent" }],
        },
      ],
      hints: [
        "La primera coordenada es el valor al que se acerca $x$.",
        "La segunda es el número al que se acercan los valores de $f(x)$ por los dos lados.",
      ],
      solution: [
        `Por la izquierda: $${num(ys[0])}, \\; ${num(ys[1])}, \\; ${num(ys[2])}$, que se acercan a $${L}$.`,
        `Por la derecha: $${num(ys[5])}, \\; ${num(ys[4])}, \\; ${num(ys[3])}$, que también se acercan a $${L}$.`,
        `Entonces $${limF(a)} = ${L}$ y el hueco está en $(${a}, ${L})$. Al acertar aparece la curva: pasa justo por ese punto, aunque $f(${a})$ no exista.`,
      ],
    };
  },
};

const ubicarLaterales: ExerciseGen = {
  id: "ubicar-laterales",
  title: "Ubicar los límites laterales de una función a trozos (tipo parcial)",
  level: 2,
  exam: true,
  generate: (r) => {
    const a = r.int(-3, 3);
    const L1 = r.int(-5, 5);
    const same = r.bool(0.35);
    let L2 = L1;
    if (!same) do L2 = r.int(-5, 5); while (L2 === L1);
    const m1 = r.nz(-2, 2);
    const b1 = L1 - m1 * a;
    const p = r.pick([-1, 1]);
    const q = L2 - p * a * a;
    const linTex = terms([[m1, "x"], [b1, ""]]);
    const quadTex = terms([[p, "x^{2}"], [q, ""]]);
    return {
      statement: `Sea $$f(x) = ${cases([[linTex, `x < ${a}`], [quadTex, `x \\ge ${a}`]])}$$ Calcula los límites laterales en $x = ${a}$ y ubica en el plano el punto al que llega la curva por cada lado.`,
      sequential: true,
      parts: [
        {
          kind: "place",
          graph: { x: [-6, 6], y: [-8, 8], height: 280 },
          items: [
            { type: "point", label: "\\text{izquierda}", answer: [a, L1], start: [-5, -7] },
            { type: "point", label: "\\text{derecha}", answer: [a, L2], start: [5, -7] },
          ],
          reveal: [
            { fn: linTex, domain: [-6, a], color: "accent" },
            { fn: quadTex, domain: [a, 6], color: "accent" },
          ],
        },
        limPart(same ? fmt(L1) : "dne", { prompt: "Con esos dos puntos, calcula el límite. Si no existe, márcalo.", before: `${limF(a)} =` }),
      ],
      hints: [
        `Por la izquierda manda $${linTex}$ y por la derecha $${quadTex}$. Sustituye $x = ${a}$ en cada una.`,
        `Los dos puntos van sobre la recta vertical $x = ${a}$. Solo cambia la altura.`,
        "Si los dos puntos quedan en el mismo lugar, el límite existe.",
      ],
      solution: [
        `Por la izquierda: $${limF(a, "-")} = ${coef(m1, `(${a})`)}${b1 === 0 ? "" : ` ${signed(b1)}`} = ${L1}$. El punto es $(${a}, ${L1})$.`,
        `Por la derecha: $${limF(a, "+")} = ${coef(p, `(${a})^{2}`)}${q === 0 ? "" : ` ${signed(q)}`} = ${L2}$. El punto es $(${a}, ${L2})$.`,
        same
          ? `Los dos puntos coinciden: $${limF(a)} = ${L1}$.`
          : `Los puntos están a alturas distintas, la gráfica tiene un salto y $${limF(a)}$ no existe.`,
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const lecturaSpec: GraphSpec = {
  x: [-4, 6],
  y: [-2, 6],
  curves: [
    { fn: "x+2", domain: [-4, 1], color: "accent" },
    { fn: "x-1", domain: [1, 6], color: "accent" },
  ],
  points: [{ x: 1, y: 3, open: true }, { x: 1, y: 0 }, { x: 3, y: 2, open: true }, { x: 3, y: 4 }],
};

const topic: Topic = {
  ...meta("idea-limite"),
  objectives: [
    "Estimar un límite con una tabla de valores, acercándote al punto por los dos lados.",
    "Calcular límites laterales y decidir con ellos si el límite existe.",
    "Leer límites y valores de una función en su gráfica, incluidas funciones a trozos.",
    "Entender la definición formal con ε y δ, y por qué el límite es único.",
  ],
  sections: [
    {
      id: "acercarse",
      title: "Acercarse sin llegar",
      blocks: [
        {
          type: "text",
          md: "Mira la función $f(x) = \\dfrac{x^2 - 1}{x - 1}$. En $x = 1$ el denominador vale cero, así que $f(1)$ no existe. Pero eso no impide preguntar otra cosa: ¿qué le pasa a $f(x)$ cuando $x$ está **muy cerca** de $1$, sin ser $1$?\n\nLa forma más honesta de averiguarlo es calcular. Tomamos valores de $x$ cada vez más cerca de $1$, unos por debajo y otros por encima.",
        },
        {
          type: "table",
          headers: ["$x$", "$0{,}9$", "$0{,}99$", "$0{,}999$", "$1{,}001$", "$1{,}01$", "$1{,}1$"],
          rows: [["$f(x)$", "$1{,}9$", "$1{,}99$", "$1{,}999$", "$2{,}001$", "$2{,}01$", "$2{,}1$"]],
          caption: "Por los dos lados, los valores de $f(x)$ se pegan al $2$.",
        },
        {
          type: "text",
          md: "Los valores se acercan a $2$ por ambos lados. Eso se escribe\n\n$$\\lim_{x \\to 1} \\frac{x^2-1}{x-1} = 2$$\n\ny se lee \"el límite de $f(x)$ cuando $x$ tiende a $1$ es $2$\". Hay una explicación algebraica: si $x \\ne 1$, el numerador es $(x-1)(x+1)$ y la fracción se simplifica a $x + 1$, que cerca de $1$ vale casi $2$.",
        },
        {
          type: "widget",
          widget: { kind: "limit", fn: "\\frac{x^2-1}{x-1}", a: 1, x: [-1, 3], y: [-1, 4] },
          caption: "Mueve $x$ hacia $1$ desde cada lado y mira a qué altura llega la curva. En $x = 1$ hay un hueco.",
        },
        {
          type: "definition",
          title: "Límite (idea intuitiva)",
          md: "Decimos que $\\lim_{x \\to a} f(x) = L$ cuando los valores de $f(x)$ se acercan tanto como queramos a $L$ al tomar $x$ suficientemente cerca de $a$, por los dos lados, con $x \\ne a$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "El valor en el punto no importa",
          md: "El límite describe lo que pasa **cerca** de $a$, nunca **en** $a$. La función puede no estar definida en $a$, o valer otra cosa, y el límite sigue siendo el mismo.",
        },
        {
          type: "example",
          title: "Estimar con una tabla",
          problem: "Estima $\\lim_{x \\to 2} \\dfrac{x^2 + x - 6}{x - 2}$.",
          steps: [
            "En $x = 2$ sale $\\frac{0}{0}$, así que la función no está definida ahí. Hacemos tabla.",
            "Con $x = 1{,}99$ da $4{,}99$ y con $x = 1{,}999$ da $4{,}999$. Por la izquierda se acerca a $5$.",
            "Con $x = 2{,}01$ da $5{,}01$ y con $x = 2{,}001$ da $5{,}001$. Por la derecha también se acerca a $5$.",
            "Comprobación: $x^2 + x - 6 = (x-2)(x+3)$, y para $x \\ne 2$ la fracción es $x + 3$, que en $2$ vale $5$.",
          ],
          answer: "$\\lim_{x \\to 2} \\dfrac{x^2 + x - 6}{x - 2} = 5$",
        },
        {
          type: "quick",
          exercise: {
            statement: "Una función cumple $f(2{,}9) = 6{,}8$, $f(2{,}99) = 6{,}98$, $f(3{,}01) = 7{,}02$ y $f(3{,}1) = 7{,}2$. Estima $\\lim_{x \\to 3} f(x)$.",
            parts: [limPart("7", { before: "\\lim_{x \\to 3} f(x) =" })],
            solution: ["Por la izquierda los valores $6{,}8$ y $6{,}98$ suben hacia $7$. Por la derecha $7{,}2$ y $7{,}02$ bajan hacia $7$. El límite es $7$."],
          },
        },
      ],
    },
    {
      id: "laterales",
      title: "Límites laterales",
      blocks: [
        {
          type: "text",
          md: "A veces los dos lados no cuentan la misma historia. Por eso conviene mirar cada lado por separado.\n\n- $\\lim_{x \\to a^-} f(x)$ es el **límite por la izquierda**: $x$ se acerca a $a$ con valores menores que $a$.\n- $\\lim_{x \\to a^+} f(x)$ es el **límite por la derecha**: $x$ se acerca a $a$ con valores mayores que $a$.\n\nEl signo pequeño arriba del número indica el lado. No es un exponente.",
        },
        {
          type: "definition",
          title: "Existencia del límite",
          md: "El límite existe si y solo si los dos laterales existen y son iguales:\n\n$$\\lim_{x \\to a} f(x) = L \\iff \\lim_{x \\to a^-} f(x) = \\lim_{x \\to a^+} f(x) = L$$",
        },
        {
          type: "example",
          title: "Un límite que no existe",
          problem: "Estudia $\\lim_{x \\to 0} \\dfrac{|x|}{x}$.",
          steps: [
            "Si $x > 0$, $|x| = x$ y la fracción vale $\\frac{x}{x} = 1$. Entonces $\\lim_{x \\to 0^+} \\frac{|x|}{x} = 1$.",
            "Si $x < 0$, $|x| = -x$ y la fracción vale $\\frac{-x}{x} = -1$. Entonces $\\lim_{x \\to 0^-} \\frac{|x|}{x} = -1$.",
            "Los laterales son distintos, así que el límite no existe.",
          ],
          answer: "$\\lim_{x \\to 0} \\dfrac{|x|}{x}$ no existe.",
        },
        {
          type: "graph",
          spec: {
            x: [-4, 4],
            y: [-3, 3],
            curves: [
              { fn: "-1", domain: [-4, 0], color: "accent" },
              { fn: "1", domain: [0, 4], color: "accent" },
            ],
            points: [{ x: 0, y: -1, open: true }, { x: 0, y: 1, open: true }],
          },
          caption: "La gráfica de $\\frac{|x|}{x}$ salta de $-1$ a $1$ en $x = 0$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Los laterales no se promedian",
          md: "Si un lado da $-1$ y el otro da $1$, el límite no es $0$. Simplemente no existe. En el parcial se escribe \"no existe porque los límites laterales son distintos\".",
        },
        {
          type: "quick",
          exercise: {
            statement: "Si $\\lim_{x \\to 4^-} f(x) = 3$ y $\\lim_{x \\to 4^+} f(x) = 3$, ¿cuánto vale $\\lim_{x \\to 4} f(x)$?",
            parts: [limPart("3", { before: "\\lim_{x \\to 4} f(x) =" })],
            solution: ["Los dos laterales valen $3$, así que el límite existe y vale $3$."],
          },
        },
      ],
    },
    {
      id: "graficas",
      title: "Leer límites en una gráfica",
      blocks: [
        {
          type: "text",
          md: "En el segundo parcial suele aparecer una gráfica con la orden de completar límites. La regla es simple: para un límite recorres la curva con el dedo hacia el punto y miras la altura a la que llegas. Para el valor $f(a)$ buscas el punto **relleno** sobre $x = a$. Los puntos huecos indican alturas a las que la curva llega pero que no toma.",
        },
        {
          type: "graph",
          spec: lecturaSpec,
          caption: "Una función con un salto en $x = 1$ y un hueco en $x = 3$.",
        },
        {
          type: "table",
          headers: ["Pregunta", "Respuesta", "Por qué"],
          rows: [
            ["$\\lim_{x \\to 1^-} f(x)$", "$3$", "Por la izquierda la curva sube hasta el hueco en altura $3$"],
            ["$\\lim_{x \\to 1^+} f(x)$", "$0$", "Por la derecha la curva sale desde la altura $0$"],
            ["$\\lim_{x \\to 1} f(x)$", "No existe", "Los laterales son distintos"],
            ["$f(1)$", "$0$", "El punto relleno sobre $x = 1$ está en altura $0$"],
            ["$\\lim_{x \\to 3} f(x)$", "$2$", "Por los dos lados la curva llega a la altura $2$"],
            ["$f(3)$", "$4$", "El punto relleno aislado está en altura $4$"],
          ],
        },
        {
          type: "note",
          tone: "tip",
          title: "Preguntas al revés",
          md: "También preguntan \"$\\lim_{x \\to ?} f(x) = 2$\". Ahí buscas en qué $x$ la curva llega, por los dos lados, a la altura $2$. En la gráfica de arriba la respuesta es $x = 3$, aunque $f(3)$ valga $4$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Con la gráfica, calcula $\\lim_{x \\to 3} f(x)$.",
            graph: lecturaSpec,
            parts: [
              limPart("2", {
                before: "\\lim_{x \\to 3} f(x) =",
                mistakes: [{ answer: "4", feedback: "Ese es $f(3)$, el punto relleno. El límite es la altura a la que llega la curva." }],
              }),
            ],
            solution: ["La curva llega a la altura $2$ por los dos lados, donde hay un hueco. El límite es $2$. El punto relleno en $4$ es el valor $f(3)$, que no cuenta para el límite."],
          },
        },
        {
          type: "quick",
          exercise: {
            statement: "Ahora sin gráfica. La función $f(x) = \\dfrac{x^2 - 2x - 3}{x - 3}$ no está definida en $x = 3$. Arrastra el punto hasta $\\left(3, \\lim_{x \\to 3} f(x)\\right)$, el hueco de su gráfica.",
            parts: [
              {
                kind: "place",
                graph: { x: [-3, 6], y: [-3, 7], height: 260 },
                items: [{ type: "point", label: "P", answer: [3, 4], start: [-2, -2] }],
                reveal: [{ fn: "x+1", breaks: [3], color: "accent" }],
              },
            ],
            hints: ["Factoriza el numerador: una de sus raíces es $3$."],
            solution: ["$x^2 - 2x - 3 = (x - 3)(x + 1)$. Para $x \\neq 3$, $f(x) = x + 1$, que cerca de $3$ se acerca a $4$. El hueco está en $(3, 4)$."],
          },
        },
      ],
    },
    {
      id: "trozos",
      title: "Funciones a trozos",
      blocks: [
        {
          type: "text",
          md: "En una función a trozos la fórmula cambia en ciertos puntos. Lejos de esos puntos el límite se calcula sustituyendo en la fórmula que corresponde. Justo en el punto de cambio hay que calcular cada lateral con su propia fórmula y compararlos.",
        },
        {
          type: "example",
          title: "Los laterales coinciden",
          problem: "Sea $f(x) = \\begin{cases} x^2 - 1 & \\text{si } x < 2 \\\\ 2x - 1 & \\text{si } x \\ge 2 \\end{cases}$. Calcula $\\lim_{x \\to 2} f(x)$.",
          steps: [
            "Por la izquierda manda $x^2 - 1$: $\\lim_{x \\to 2^-} f(x) = 2^2 - 1 = 3$.",
            "Por la derecha manda $2x - 1$: $\\lim_{x \\to 2^+} f(x) = 2 \\cdot 2 - 1 = 3$.",
            "Los dos valen $3$.",
          ],
          answer: "$\\lim_{x \\to 2} f(x) = 3$",
        },
        {
          type: "example",
          title: "Los laterales no coinciden",
          problem: "Sea $g(x) = \\begin{cases} x + 1 & \\text{si } x \\le 0 \\\\ x^2 + 3 & \\text{si } x > 0 \\end{cases}$. Calcula $\\lim_{x \\to 0} g(x)$.",
          steps: [
            "Por la izquierda: $\\lim_{x \\to 0^-} g(x) = 0 + 1 = 1$.",
            "Por la derecha: $\\lim_{x \\to 0^+} g(x) = 0^2 + 3 = 3$.",
            "Como $1 \\ne 3$, el límite no existe. Ojo: $g(0) = 1$ sí existe, porque $x = 0$ cae en el primer trozo.",
          ],
          answer: "$\\lim_{x \\to 0} g(x)$ no existe.",
        },
        {
          type: "graph",
          spec: {
            x: [-4, 4],
            y: [-2, 8],
            curves: [
              { fn: "x+1", domain: [-4, 0], color: "accent" },
              { fn: "x^2+3", domain: [0, 4], color: "accent" },
            ],
            points: [{ x: 0, y: 1 }, { x: 0, y: 3, open: true }],
          },
          caption: "La gráfica de $g$: el salto en $x = 0$ hace que el límite no exista.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Tarifas por tramos",
          md: "Muchos precios funcionan a trozos. Por ejemplo, una empresa de envíos podría cobrar 5 dólares por paquetes de hasta 2 kg y 8 dólares por paquetes de más de 2 kg. Cerca de 2 kg, el costo por la izquierda tiende a 5 y por la derecha a 8. El límite del costo en 2 kg no existe, y eso es justo lo que se nota como un salto en la tarifa.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Sea $f(x) = \\begin{cases} 3x & \\text{si } x < 1 \\\\ x + 2 & \\text{si } x \\ge 1 \\end{cases}$. Calcula $\\lim_{x \\to 1} f(x)$.",
            parts: [limPart("3", { before: "\\lim_{x \\to 1} f(x) =" })],
            solution: ["Por la izquierda $3 \\cdot 1 = 3$ y por la derecha $1 + 2 = 3$. Coinciden, el límite es $3$."],
          },
        },
      ],
    },
    {
      id: "definicion-formal",
      title: "La definición formal",
      blocks: [
        {
          type: "text",
          md: "\"Acercarse\" es una palabra vaga. Para que el límite sea una herramienta precisa hay que decir cuánto es \"cerca\". La idea es un desafío entre dos personas.\n\n- Alguien te exige una tolerancia $\\varepsilon$ (épsilon), un número positivo pequeño: quiere que $f(x)$ esté a menos de $\\varepsilon$ de $L$.\n- Tú respondes con un margen $\\delta$ (delta): si $x$ está a menos de $\\delta$ de $a$, la exigencia se cumple.\n\nSi siempre puedes responder, para cualquier $\\varepsilon$ por pequeño que sea, entonces el límite es $L$.",
        },
        {
          type: "definition",
          title: "Definición ε-δ",
          md: "Sea $a$ un punto de acumulación del dominio de $f$.\n\n$$\\lim_{x \\to a} f(x) = L \\iff \\forall \\varepsilon > 0, \\; \\exists \\delta > 0 : 0 < |x - a| < \\delta \\Rightarrow |f(x) - L| < \\varepsilon$$\n\nEl $0 < |x - a|$ dice que $x \\ne a$: otra vez, el valor en el punto no cuenta.",
        },
        {
          type: "example",
          title: "Demostrar un límite lineal",
          problem: "Demuestra que $\\lim_{x \\to 2} (3x + 1) = 7$.",
          steps: [
            "Medimos qué tan lejos está $f(x)$ de $7$: $|(3x + 1) - 7| = |3x - 6| = 3\\,|x - 2|$.",
            "Queremos $3\\,|x - 2| < \\varepsilon$, que equivale a $|x - 2| < \\dfrac{\\varepsilon}{3}$.",
            "Entonces elegimos $\\delta = \\dfrac{\\varepsilon}{3}$. Si $0 < |x - 2| < \\delta$, se cumple $|f(x) - 7| = 3\\,|x - 2| < 3 \\cdot \\dfrac{\\varepsilon}{3} = \\varepsilon$.",
            "Por ejemplo, si te exigen $\\varepsilon = 0{,}6$, respondes $\\delta = 0{,}2$: todo $x$ entre $1{,}8$ y $2{,}2$ da $f(x)$ entre $6{,}4$ y $7{,}6$.",
          ],
        },
        {
          type: "graph",
          spec: {
            x: [1, 3],
            y: [5, 9],
            step: 0.5,
            curves: [{ fn: "3x+1", color: "accent" }],
            hlines: [
              { y: 6.4, dashed: true, color: "orange", label: "L − ε" },
              { y: 7.6, dashed: true, color: "orange", label: "L + ε" },
            ],
            vlines: [
              { x: 1.8, dashed: true, color: "blue", label: "a − δ" },
              { x: 2.2, dashed: true, color: "blue", label: "a + δ" },
            ],
            points: [{ x: 2, y: 7 }],
          },
          caption: "Con $\\varepsilon = 0{,}6$ y $\\delta = 0{,}2$: dentro de la franja azul, la recta queda dentro de la franja naranja.",
        },
        {
          type: "note",
          tone: "idea",
          title: "δ depende de ε",
          md: "Mientras más exigente es la tolerancia $\\varepsilon$, más pequeño tiene que ser $\\delta$. En una recta $mx + k$ la cuenta siempre da\n\n$$\\delta = \\frac{\\varepsilon}{|m|}$$\n\nAsí, una recta empinada exige que $x$ esté más cerca.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Para $\\lim_{x \\to 3} (2x + 1) = 7$ te exigen $\\varepsilon = 0{,}1$. ¿Cuál es el mayor $\\delta$ que sirve?",
            parts: [
              {
                kind: "expr",
                answer: "0{,}05",
                before: "\\delta =",
                mistakes: [{ answer: "0{,}2", feedback: "Multiplicaste por la pendiente. Hay que dividir: $\\delta = \\frac{\\varepsilon}{2}$." }],
              },
            ],
            solution: ["$|(2x + 1) - 7| = 2\\,|x - 3| < 0{,}1$ equivale a $|x - 3| < 0{,}05$. Entonces $\\delta = 0{,}05$."],
          },
        },
      ],
    },
    {
      id: "unicidad",
      title: "El límite es único",
      blocks: [
        {
          type: "text",
          md: "Una función no puede acercarse a dos alturas distintas a la vez. Si los valores de $f(x)$ se pegan a $L$, no pueden pegarse también a otro número $M$, porque $L$ y $M$ están separados por una distancia fija y $f(x)$ no puede estar muy cerca de los dos al mismo tiempo.",
        },
        {
          type: "definition",
          title: "Teorema de unicidad",
          md: "Si $\\lim_{x \\to a} f(x) = L$ y también $\\lim_{x \\to a} f(x) = M,$ entonces $L = M$.",
        },
        {
          type: "text",
          md: "Este teorema es el que justifica el criterio de los laterales. Si por la izquierda la función se acerca a $3$ y por la derecha a $0$, no hay un único número al que se acerque, y por eso el límite no existe.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Verdadero o falso? Si $\\lim_{x \\to 2^-} f(x) = 5$ y $\\lim_{x \\to 2^+} f(x) = 1$, entonces $\\lim_{x \\to 2} f(x) = 3$.",
            parts: [trueFalse(false, "Los laterales no se promedian. Como son distintos, el límite no existe.")],
            solution: ["Falso. Los laterales valen $5$ y $1$. Al ser distintos, el límite no existe."],
          },
        },
      ],
    },
  ],
  exercises: [
    tabla,
    tablaLaterales,
    ubicarLimiteTabla,
    lateralLectura,
    existeVF,
    interpretar,
    trozosLaterales,
    trozosTres,
    ubicarLaterales,
    valorAbsoluto,
    deltaLineal,
    graficaCompleta,
    leerCondiciones,
    parametroTrozos,
  ],
};

export default topic;
