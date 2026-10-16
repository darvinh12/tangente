import { meta } from "../catalog";
import { choice, trueFalse } from "../helpers";
import type { ExerciseGen, GraphSpec, Part, Rich, Topic } from "../types";
import { cases, coef, minus, poly, signed, terms } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

type Punto = "derivable" | "anguloso" | "cuspidal" | "vertical" | "discontinua";

const PUNTO_LABEL: Record<Punto, string> = {
  derivable: "Es derivable en ese punto",
  anguloso: "Punto anguloso",
  cuspidal: "Punto cuspidal",
  vertical: "Tangente vertical (derivada infinita)",
  discontinua: "No es continua, así que no es derivable",
};
const PUNTO_FB: Record<Punto, string> = {
  derivable: "Para ser derivable las dos derivadas laterales tienen que ser finitas e iguales. La curva tendría que pasar suave, sin picos.",
  anguloso: "Un punto anguloso tiene derivadas laterales finitas y distintas: dos rectas de pendientes diferentes que se juntan en un pico.",
  cuspidal: "Un punto cuspidal tiene derivadas laterales infinitas de signo contrario: la curva llega en punta, con tangente vertical por los dos lados.",
  vertical: "Una tangente vertical tiene las dos derivadas laterales infinitas del mismo signo: la curva pasa sin pico pero se pone vertical.",
  discontinua: "Si la función fuera discontinua habría un salto, un hueco o una asíntota. Aquí la curva no se corta.",
};

function puntoChoice(t: Punto, opts: Punto[] = ["derivable", "anguloso", "cuspidal", "vertical", "discontinua"], prompt?: Rich): Part {
  return {
    kind: "choice",
    prompt,
    shuffle: false,
    options: opts.map((k) => ({ label: PUNTO_LABEL[k], correct: k === t || undefined, feedback: k === t ? undefined : PUNTO_FB[k] })),
  };
}

const plusConst = (tex: string, c: number) => (c === 0 ? tex : `${tex} ${signed(c)}`);
const lineTex = (m: number, b: number) => terms([[m, "x"], [b, ""]]);
const inf = (s: number) => (s > 0 ? "+\\infty" : "-\\infty");
const infAns = (s: number) => (s > 0 ? "\\infty" : "-\\infty");
const SPECIAL: ("inf" | "-inf" | "dne")[] = ["inf", "-inf", "dne"];
const pval = (coefs: number[], x: number) => coefs.reduce((acc, c) => acc * x + c, 0);
const fl = (a: number) => `f'_{-}(${a})`;
const fr = (a: number) => `f'_{+}(${a})`;

/** Gráfica de un punto típico en x = a, altura k. */
function puntoGraph(t: Punto, a: number, k: number, c = 1): GraphSpec {
  const g: GraphSpec = { x: [-5, 5], y: [-5, 5], height: 220, curves: [], points: [] };
  if (t === "derivable") g.curves = [{ fn: plusConst(`${c < 0 ? "-" : ""}\\frac{(${minus("x", a)})^{2}}{2}`, k), color: "accent" }];
  if (t === "anguloso") {
    g.curves = [
      { fn: plusConst(coef(c > 0 ? -1 : 2, `(${minus("x", a)})`), k), domain: [-5, a], color: "accent" },
      { fn: plusConst(coef(c > 0 ? 2 : -1, `(${minus("x", a)})`), k), domain: [a, 5], color: "accent" },
    ];
  }
  if (t === "cuspidal") g.curves = [{ fn: plusConst(`${c < 0 ? "-" : ""}2\\sqrt[3]{(${minus("x", a)})^{2}}`, k), color: "accent" }];
  if (t === "vertical") g.curves = [{ fn: plusConst(`${c < 0 ? "-" : ""}2\\sqrt[3]{${minus("x", a)}}`, k), color: "accent" }];
  if (t === "discontinua") {
    g.curves = [
      { fn: plusConst(`\\frac{${minus("x", a)}}{2}`, k), domain: [-5, a], color: "accent" },
      { fn: plusConst(`\\frac{${minus("x", a)}}{2}`, k + 2 * c), domain: [a, 5], color: "accent" },
    ];
    g.points = [{ x: a, y: k, color: "accent" }, { x: a, y: k + 2 * c, open: true }];
  }
  g.points!.push(...(t === "discontinua" ? [] : [{ x: a, y: k, color: "accent" as const }]));
  return g;
}

/* ----------------------------------- ejercicios ----------------------------------- */

const lateralesAbs: ExerciseGen = {
  id: "laterales-abs",
  title: "Derivadas laterales con valor absoluto",
  level: 1,
  generate: (r) => {
    const a = r.int(-4, 4);
    const c = r.nz(-3, 3);
    const m = r.int(-2, 2);
    const k = r.int(-5, 5);
    const absT = `${c === 1 ? "" : c === -1 ? "-" : c}|${minus("x", a)}|`;
    const fTex = `${absT}${m === 0 ? "" : ` ${m > 0 ? "+" : "-"} ${coef(Math.abs(m), "x")}`}${k === 0 ? "" : ` ${signed(k)}`}`;
    const L = m - c;
    const R = m + c;
    return {
      statement: `Calcula las derivadas laterales de $f(x) = ${fTex}$ en $x = ${a}$ y decide si $f$ es derivable ahí.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Por la izquierda:", before: `${fl(a)} =`, answer: String(L), special: SPECIAL, mistakes: [{ answer: String(R), feedback: `Para $x < ${a}$, $|${minus("x", a)}| = -(${minus("x", a)})$. Ese signo cambia la pendiente.` }] },
        { kind: "expr", prompt: "Por la derecha:", before: `${fr(a)} =`, answer: String(R), special: SPECIAL, mistakes: [{ answer: String(L), feedback: `Para $x > ${a}$, $|${minus("x", a)}| = ${minus("x", a)}$.` }] },
        trueFalse(false, `Las derivadas laterales valen $${L}$ y $${R}$. Son distintas, así que no es derivable: hay un punto anguloso.`, `¿Verdadero o falso? $f$ es derivable en $x = ${a}$.`),
      ],
      hints: [
        `Quita el valor absoluto: a la derecha de $${a}$ vale $${minus("x", a)}$ y a la izquierda vale $-(${minus("x", a)})$.`,
        "Cada lado queda como una recta. Su pendiente es la derivada lateral.",
      ],
      solution: [
        `Para $x > ${a}$: $f(x) = ${lineTex(m + c, -c * a + k)}$, pendiente $${R}$.`,
        `Para $x < ${a}$: $f(x) = ${lineTex(m - c, c * a + k)}$, pendiente $${L}$.`,
        `Por definición, $${fl(a)} = \\lim_{h \\to 0^-} \\dfrac{${c === 1 ? "" : c === -1 ? "-" : c}|h|${m === 0 ? "" : ` ${m > 0 ? "+" : "-"} ${coef(Math.abs(m), "h")}`}}{h} = ${L}$ porque $|h| = -h$, y $${fr(a)} = ${R}$ porque $|h| = h$.`,
        `Como $${L} \\neq ${R}$, $f$ no es derivable en $x = ${a}$. Es continua, así que ahí hay un punto anguloso.`,
      ],
    };
  },
};

const clasificarPunto: ExerciseGen = {
  id: "clasificar-punto",
  title: "¿Qué tipo de punto es?",
  level: 1,
  generate: (r) => {
    const t = r.pick(["derivable", "anguloso", "anguloso", "cuspidal", "cuspidal", "vertical", "vertical", "discontinua"] as Punto[]);
    const a = r.int(-2, 2);
    const k = r.int(-2, 2);
    const c = r.pick([1, -1]);
    return {
      statement: `Observa la gráfica de $f$ cerca de $x = ${a}$. ¿Qué pasa con la derivabilidad en ese punto?`,
      graph: puntoGraph(t, a, k, c),
      parts: [puntoChoice(t)],
      hints: ["Pregúntate primero si la curva se corta. Si no se corta, mira si hay pico y si la curva se pone vertical."],
      solution: [
        {
          derivable: "La curva pasa suave, sin pico ni tramos verticales. Admite una tangente con pendiente finita.",
          anguloso: "La curva es continua pero llega en pico con dos pendientes finitas distintas. Derivadas laterales finitas y distintas: punto anguloso.",
          cuspidal: "La curva llega en punta y por los dos lados se pone vertical, una vez subiendo y otra bajando. Derivadas laterales $+\\infty$ y $-\\infty$: punto cuspidal.",
          vertical: "La curva pasa sin pico pero en ese punto se pone vertical. Las dos derivadas laterales son infinitas con el mismo signo: tangente vertical.",
          discontinua: "La curva salta. Si no es continua no puede ser derivable.",
        }[t],
      ],
    };
  },
};

const lateralesTrozos: ExerciseGen = {
  id: "laterales-trozos",
  title: "Derivadas laterales de una función a trozos",
  level: 1,
  generate: (r) => {
    const a = r.int(-2, 2);
    const k = r.int(-4, 4);
    const m1 = r.int(-3, 3);
    const same = r.bool(0.35);
    let m2: number;
    if (same) m2 = m1;
    else do m2 = r.int(-3, 3); while (m2 === m1);
    // izquierda: (x - a)^2 + m1 (x - a) + k ; derecha: m2 (x - a) + k
    const left = [1, m1 - 2 * a, a * a - m1 * a + k];
    const right = lineTex(m2, k - m2 * a);
    return {
      statement: `Sea $$f(x) = ${cases([[poly(left), `x \\le ${a}`], [right, `x > ${a}`]])}$$ Comprueba que es continua en $x = ${a}$, calcula sus derivadas laterales y decide si es derivable.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Valor de la función:", before: `f(${a}) =`, answer: String(k) },
        { kind: "expr", prompt: "Derivada por la izquierda:", before: `${fl(a)} =`, answer: String(m1), special: SPECIAL },
        { kind: "expr", prompt: "Derivada por la derecha:", before: `${fr(a)} =`, answer: String(m2), special: SPECIAL },
        trueFalse(same, same ? "Las laterales coinciden y la función es continua, así que es derivable." : `Las laterales son $${m1}$ y $${m2}$, distintas: punto anguloso.`, `¿Verdadero o falso? $f$ es derivable en $x = ${a}$.`),
      ],
      hints: [
        `Los dos tramos dan $${k}$ en $x = ${a}$, así que es continua. Eso permite derivar cada rama y evaluar en $${a}$.`,
        `La rama de la izquierda tiene derivada $${lineTex(2, m1 - 2 * a)}$. La de la derecha es una recta.`,
      ],
      solution: [
        `$f(${a}) = ${k}$ con la primera rama y $\\lim_{x \\to ${a}^+} f(x) = ${k}$ con la segunda: es continua.`,
        `Por la izquierda: $(${poly(left)})' = ${lineTex(2, m1 - 2 * a)}$, que en $x = ${a}$ vale $${m1}$.`,
        `Por la derecha la pendiente de la recta es $${m2}$.`,
        same ? `Como $${fl(a)} = ${fr(a)} = ${m1}$, $f$ es derivable en $x = ${a}$ y $f'(${a}) = ${m1}$.` : `Como $${m1} \\neq ${m2}$, no es derivable: punto anguloso.`,
      ],
    };
  },
};

const implica: ExerciseGen = {
  id: "derivable-continua",
  title: "Qué se puede concluir",
  level: 1,
  generate: (r) => {
    const a = r.int(-5, 5);
    const kind = r.pick(["derivable", "salto", "continua", "noDerivable"] as const);
    const data = {
      derivable: {
        stmt: `$f$ es derivable en $x = ${a}$`,
        part: choice(`$f$ es continua en $x = ${a}$`, [
          [`$f$ puede tener un salto en $x = ${a}$`, "Si tuviera un salto no sería continua, y una función derivable siempre es continua."],
          [`$f$ tiene un punto anguloso en $x = ${a}$`, "En un punto anguloso la función no es derivable."],
        ]),
        why: "Derivable implica continua. Es un teorema.",
      },
      salto: {
        stmt: `$f$ tiene una discontinuidad de salto en $x = ${a}$`,
        part: choice(`$f$ no es derivable en $x = ${a}$`, [
          ["$f$ es derivable si las fórmulas de cada lado tienen la misma derivada", "Sin continuidad no hay derivada, aunque las ramas tengan la misma pendiente. La derivada lateral por definición se va a infinito."],
          [`$f$ tiene un punto anguloso en $x = ${a}$`, "Un punto anguloso exige que la función sea continua."],
        ]),
        why: "Si $f$ no es continua en un punto, no es derivable ahí. Es el contrarrecíproco de \"derivable implica continua\".",
      },
      continua: {
        stmt: `$f$ es continua en $x = ${a}$`,
        part: choice("No se puede saber si es derivable", [
          [`$f$ es derivable en $x = ${a}$`, `No siempre. $f(x) = |${minus("x", a)}|$ es continua en $x = ${a}$ y no es derivable ahí.`],
          [`$f$ no es derivable en $x = ${a}$`, `No siempre. $f(x) = (${minus("x", a)})^2$ es continua y derivable en $x = ${a}$.`],
        ]),
        why: "Continua no implica derivable. Puede haber un pico o una tangente vertical.",
      },
      noDerivable: {
        stmt: `$f$ no es derivable en $x = ${a}$`,
        part: choice("No se puede saber si es continua", [
          [`$f$ no es continua en $x = ${a}$`, `No siempre. $f(x) = |${minus("x", a)}|$ no es derivable en $x = ${a}$ y sí es continua.`],
          [`$f$ es continua en $x = ${a}$`, "No siempre. Una función con un salto tampoco es derivable."],
        ]),
        why: "No derivable puede venir de una discontinuidad o de un pico en una función continua.",
      },
    }[kind];
    return {
      statement: `Se sabe que ${data.stmt}. ¿Qué se puede concluir con seguridad?`,
      parts: [data.part],
      hints: ["La única implicación que siempre vale es: derivable $\\Rightarrow$ continua. Y su contrarrecíproca: no continua $\\Rightarrow$ no derivable."],
      solution: [data.why],
    };
  },
};

const trozosDerivable: ExerciseGen = {
  id: "trozos-derivable",
  title: "Continuidad y derivabilidad de una función a trozos",
  level: 2,
  exam: true,
  generate: (r) => {
    const a = r.int(-2, 3);
    const sc = r.pick(["discontinua", "anguloso", "derivable"] as const);
    // izquierda cuadrática, derecha recta
    const p = r.pick([1, -1, 2]);
    const q = r.int(-4, 4);
    const k = r.int(-4, 4);
    const left = [p, q, k - p * a * a - q * a];
    const dl = 2 * p * a + q;
    let m: number;
    if (sc === "derivable") m = dl;
    else do m = r.int(-4, 4); while (m === dl);
    const jump = sc === "discontinua" ? r.nz(-3, 3) : 0;
    const R = k + jump;
    const right = lineTex(m, R - m * a);
    const fTex = cases([[poly(left), `x \\le ${a}`], [right, `x > ${a}`]]);
    const parts: Part[] = [
      { kind: "expr", prompt: "Valor en el punto:", before: `f(${a}) =`, answer: String(k) },
      { kind: "expr", prompt: "Límite por la derecha:", before: `\\lim_{x \\to ${a}^+} f(x) =`, answer: String(R), special: SPECIAL },
      trueFalse(sc !== "discontinua", sc === "discontinua" ? `$f(${a}) = ${k}$ y por la derecha el límite es $${R}$. Hay un salto.` : "Los dos valores coinciden: es continua.", `¿Verdadero o falso? $f$ es continua en $x = ${a}$.`),
    ];
    if (sc !== "discontinua") {
      parts.push(
        { kind: "expr", prompt: "Derivada por la izquierda:", before: `${fl(a)} =`, answer: String(dl), special: SPECIAL },
        { kind: "expr", prompt: "Derivada por la derecha:", before: `${fr(a)} =`, answer: String(m), special: SPECIAL },
      );
    }
    parts.push(puntoChoice(sc, ["derivable", "anguloso", "discontinua"], "Conclusión:"));
    return {
      statement: `Estudia la continuidad y la derivabilidad de $$f(x) = ${fTex}$$ en $x = ${a}$.`,
      sequential: true,
      parts,
      hints: [
        "Primero la continuidad. Si no es continua, ya sabes que no es derivable.",
        "Si es continua, deriva cada rama y evalúa en el punto para obtener las derivadas laterales.",
      ],
      solution: [
        `$f(${a}) = ${k}$ y $\\lim_{x \\to ${a}^+} (${right}) = ${R}$.`,
        sc === "discontinua"
          ? `Como $${k} \\neq ${R}$, $f$ no es continua en $x = ${a}$ y por lo tanto no es derivable. Por definición, $${fr(a)} = \\lim_{h \\to 0^+} \\dfrac{f(${a} + h) - ${k}}{h}$ tiene numerador que tiende a $${jump}$ y se va a infinito.`
          : `Es continua. Por la izquierda, $(${poly(left)})' = ${lineTex(2 * p, q)}$, que en $${a}$ vale $${dl}$. Por la derecha, la pendiente es $${m}$.`,
        { discontinua: "Conclusión: no es derivable porque no es continua.", anguloso: `Conclusión: $${dl} \\neq ${m}$, punto anguloso.`, derivable: `Conclusión: las laterales coinciden, $f'(${a}) = ${dl}$.` }[sc],
      ],
    };
  },
};

const parametrosDerivable: ExerciseGen = {
  id: "parametros-derivable",
  title: "Parámetros para que sea derivable",
  level: 2,
  generate: (r) => {
    const x0 = r.int(-2, 3);
    if (r.bool()) {
      // izquierda conocida p x^2 + q x + c, derecha a x + b
      const p = r.pick([1, -1, 2]);
      const q = r.int(-4, 4);
      const c = r.int(-4, 4);
      const left = [p, q, c];
      const a = 2 * p * x0 + q;
      const b = pval(left, x0) - a * x0;
      return {
        statement: `Determina $a$ y $b$ para que $$f(x) = ${cases([[poly(left), `x \\le ${x0}`], ["ax + b", `x > ${x0}`]])}$$ sea derivable en $x = ${x0}$.`,
        sequential: true,
        parts: [
          { kind: "expr", prompt: "Iguala las derivadas laterales.", before: "a =", answer: String(a) },
          { kind: "expr", prompt: "Ahora usa la continuidad.", before: "b =", answer: String(b), mistakes: b !== pval(left, x0) ? [{ answer: String(pval(left, x0)), feedback: `Ese es $f(${x0})$. La condición es $${x0 === 0 ? "" : `${x0}a + `}b = f(${x0})$, así que hay que restar $${x0}a$.` }] : [] },
        ],
        hints: [
          "Derivable exige dos cosas: continua en el punto y derivadas laterales iguales.",
          `La derivada de la rama izquierda en $x = ${x0}$ es $${a}$, y la de la recta es $a$.`,
        ],
        solution: [
          `Derivadas laterales: por la izquierda $${lineTex(2 * p, q)}$ en $x = ${x0}$ da $${a}$. Por la derecha es $a$. Entonces $a = ${a}$.`,
          `Continuidad: $f(${x0}) = ${pval(left, x0)}$ y por la derecha $${x0 === 0 ? "b" : `${x0}a + b`}$. Con $a = ${a}$: $b = ${pval(left, x0)} - ${x0 < 0 ? `(${a * x0})` : a * x0} = ${b}$.`,
          `La recta $y = ${lineTex(a, b)}$ es justo la tangente a la parábola en $x = ${x0}$.`,
        ],
      };
    }
    // izquierda a x^2 + b x, derecha recta conocida m x + n
    const X = x0 === 0 ? r.pick([-1, 1, 2]) : x0;
    const A = r.nz(-3, 3);
    const B = r.int(-4, 4);
    const m = 2 * A * X + B;
    const n = A * X * X + B * X - m * X;
    return {
      statement: `Determina $a$ y $b$ para que $$f(x) = ${cases([["ax^{2} + bx", `x < ${X}`], [lineTex(m, n), `x \\ge ${X}`]])}$$ sea derivable en $x = ${X}$.`,
      sequential: true,
      parts: [
        { kind: "expr", before: "a =", answer: String(A) },
        { kind: "expr", before: "b =", answer: String(B) },
      ],
      hints: [
        `Continuidad: $a(${X})^2 + b(${X}) = f(${X})$.`,
        `Derivadas laterales: $2a(${X}) + b = ${m}$.`,
        "Resuelve el sistema de dos ecuaciones.",
      ],
      solution: [
        `Continuidad: $${coef(X * X, "a")} ${X > 0 ? "+" : "-"} ${coef(Math.abs(X), "b")} = ${m * X + n}$.`,
        `Derivadas iguales: $${coef(2 * X, "a")} + b = ${m}$.`,
        `Multiplicando la segunda por $${X}$ y restando la primera: $${coef(X * X, "a")} = ${m * X - (m * X + n)}$, así que $a = ${A}$ y $b = ${m} - ${2 * X * A < 0 ? `(${2 * X * A})` : 2 * X * A} = ${B}$.`,
      ],
    };
  },
};

const derivadaInfinita: ExerciseGen = {
  id: "derivada-infinita",
  title: "Derivadas laterales infinitas",
  level: 2,
  generate: (r) => {
    const a = r.int(-3, 3);
    const k = r.int(-4, 4);
    const c = r.pick([1, 2, -1, -3]);
    const cusp = r.bool();
    const inner = cusp ? `(${minus("x", a)})^{2}` : minus("x", a);
    const fTex = plusConst(`${c === 1 ? "" : c === -1 ? "-" : c}\\sqrt[3]{${inner}}`, k);
    const sR = Math.sign(c);
    const sL = cusp ? -Math.sign(c) : Math.sign(c);
    const t: Punto = cusp ? "cuspidal" : "vertical";
    const cc = c === 1 ? "" : c === -1 ? "-" : String(c);
    return {
      statement: `Estudia la derivabilidad de $f(x) = ${fTex}$ en $x = ${a}$ usando la definición.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Por la derecha:", before: `${fr(a)} =`, answer: infAns(sR), special: SPECIAL, mistakes: [{ answer: "0", feedback: "Cuidado: el cociente es $\\frac{\\sqrt[3]{\\cdots}}{h}$ y el denominador tiende a cero más rápido que el numerador." }] },
        { kind: "expr", prompt: "Por la izquierda:", before: `${fl(a)} =`, answer: infAns(sL), special: SPECIAL, mistakes: [{ answer: infAns(-sL), feedback: "Revisa el signo: para $h < 0$ el denominador $h$ es negativo." }] },
        puntoChoice(t, ["derivable", "anguloso", "cuspidal", "vertical"], "¿Qué ocurre en el punto?"),
      ],
      hints: [
        `$f(${a} + h) - f(${a}) = ${cc}\\sqrt[3]{${cusp ? "h^2" : "h"}}$.`,
        `Escribe $\\dfrac{\\sqrt[3]{${cusp ? "h^2" : "h"}}}{h} = ${cusp ? "h^{-1/3}" : "h^{-2/3}"}$ y piensa en su signo según $h$ sea positivo o negativo.`,
      ],
      solution: [
        `$\\dfrac{f(${a} + h) - f(${a})}{h} = \\dfrac{${cc}\\sqrt[3]{${cusp ? "h^2" : "h"}}}{h} = ${cc}${cusp ? "\\dfrac{1}{\\sqrt[3]{h}}" : "\\dfrac{1}{\\sqrt[3]{h^2}}"}$.`,
        cusp
          ? `Si $h \\to 0^+$, $\\sqrt[3]{h} \\to 0^+$ y el cociente va a $${inf(sR)}$. Si $h \\to 0^-$, $\\sqrt[3]{h} \\to 0^-$ y va a $${inf(sL)}$.`
          : `$\\sqrt[3]{h^2}$ es positivo por los dos lados, así que el cociente va a $${inf(sR)}$ por la derecha y por la izquierda.`,
        cusp ? "Derivadas laterales infinitas de signo contrario: punto cuspidal." : "Las dos laterales son infinitas del mismo signo: tangente vertical. La función es continua pero no derivable.",
      ],
    };
  },
};

const vfDerivabilidad: ExerciseGen = {
  id: "vf-derivabilidad",
  title: "Verdadero o falso sobre derivabilidad (tipo parcial)",
  level: 2,
  exam: true,
  generate: (r) => {
    const items: [string, boolean, string][] = [
      ["Si $f$ es derivable en $x_0$, entonces es continua en $x_0$.", true, "Es el teorema: $\\lim [f(x_0+h) - f(x_0)] = \\lim \\frac{f(x_0+h) - f(x_0)}{h} \\cdot h = f'(x_0) \\cdot 0 = 0$."],
      ["Si $f$ es continua en $x_0$, entonces es derivable en $x_0$.", false, "$|x|$ es continua en $0$ y no es derivable ahí, porque sus derivadas laterales son $-1$ y $1$."],
      ["Si $f$ no es derivable en $x_0$, entonces no es continua en $x_0$.", false, "$|x|$ no es derivable en $0$ y sí es continua."],
      ["Si $f$ no es continua en $x_0$, entonces no es derivable en $x_0$.", true, "Es el contrarrecíproco del teorema \"derivable implica continua\"."],
      ["Si $f$ no es continua ni derivable en $x_0$, entonces en $x_0$ hay un punto anguloso.", false, "En un punto anguloso la función tiene que ser continua. Con una discontinuidad no se habla de punto anguloso."],
      ["Si $f$ es continua y derivable en $x_0$, entonces en $x_0$ hay un punto cuspidal.", false, "En un punto cuspidal la función no es derivable: las derivadas laterales son infinitas."],
      ["Las derivadas laterales en un punto anguloso tienden a infinito.", false, "En un punto anguloso las derivadas laterales son finitas y distintas. Las infinitas aparecen en los puntos cuspidales y en las tangentes verticales."],
      ["Para que exista $f'(x_0)$ es necesario que $f$ esté definida en $x_0$.", true, "La definición usa $f(x_0)$ en el cociente $\\frac{f(x_0 + h) - f(x_0)}{h}$. Además, derivable implica continua."],
      ["$f'(x_0)$ es la pendiente de la recta tangente a la gráfica de $f$ en $(x_0, f(x_0))$.", true, "Esa es la interpretación geométrica de la derivada."],
      ["Si las derivadas laterales de $f$ en $x_0$ son iguales y finitas, $f$ es derivable en $x_0$ aunque no sea continua.", false, "Si no es continua, las derivadas laterales calculadas por definición no pueden ser finitas e iguales. Ojo: lo que coincide a veces son las derivadas de las fórmulas de cada rama, que no es lo mismo."],
    ];
    const [claim, ok, why] = r.pick(items);
    return {
      statement: `${claim} ¿Verdadero o falso?`,
      parts: [trueFalse(ok, why)],
      hints: ["Piensa en el ejemplo de $|x|$ en $x = 0$: continua pero no derivable."],
      solution: [`${ok ? "Verdadero" : "Falso"}. ${why}`],
    };
  },
};

const estudioTrozos: ExerciseGen = {
  id: "estudio-trozos",
  title: "Continuidad y derivabilidad en dos puntos (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const x1 = r.int(-3, -1);
    const x2 = r.int(1, 3);
    const lnFirst = r.bool();
    // tramo del medio: recta m x + n en [x1, x2)
    const m = r.pick([-2, -1, 1, 2]);
    const n = r.int(-3, 3);
    const v1 = m * x1 + n;
    const v2 = m * x2 + n;
    // primer tramo
    let first: string, firstCond: string, cont1: boolean, d1L = 0, lnArg = 0;
    if (lnFirst) {
      const c = r.int(2, 5) - x1; // ln(x + c), definido para x > -c, con x1 + c >= 2
      lnArg = x1 + c;
      first = `\\ln(${minus("x", -c)})`;
      firstCond = `${-c} < x < ${x1}`;
      cont1 = false;
    } else {
      const s = r.pick([1, -1]);
      d1L = r.int(-3, 3);
      const coefs = [s, d1L - 2 * s * x1, v1 - s * x1 * x1 - (d1L - 2 * s * x1) * x1];
      first = poly(coefs);
      firstCond = `x < ${x1}`;
      cont1 = true;
    }
    // tercer tramo: (x - p)^2 + q con valor v2 en x2 y derivada 2(x2 - p)
    const p = r.int(x2 - 3, x2 + 3);
    const q = v2 - (x2 - p) ** 2;
    const d2R = 2 * (x2 - p);
    const third = plusConst(`(${minus("x", p)})^{2}`, q);
    const der2 = d2R === m;
    const ang1 = cont1 && d1L !== m;
    const fTex = cases([[first, firstCond], [lineTex(m, n), `${x1} \\le x < ${x2}`], [third, `x \\ge ${x2}`]]);
    const firstVal = lnFirst ? `\\ln ${lnArg}` : String(v1);
    const r1: Punto = !cont1 ? "discontinua" : ang1 ? "anguloso" : "derivable";
    return {
      statement: `Dada $$f(x) = ${fTex}$$ estudia la continuidad y la derivabilidad de $f$ en $x = ${x1}$ y en $x = ${x2}$.`,
      sequential: true,
      parts: [
        trueFalse(cont1, cont1 ? `Por la izquierda el límite es $${v1}$ y $f(${x1}) = ${v1}$.` : `Por la izquierda el límite es $${firstVal}$, que no es un entero, y $f(${x1}) = ${v1}$. Hay un salto.`, `¿Verdadero o falso? $f$ es continua en $x = ${x1}$.`),
        puntoChoice(r1, ["derivable", "anguloso", "discontinua"], `¿Es derivable en $x = ${x1}$?`),
        { kind: "expr", prompt: `En $x = ${x2}$, derivada por la izquierda:`, before: `${fl(x2)} =`, answer: String(m), special: SPECIAL },
        { kind: "expr", prompt: `En $x = ${x2}$, derivada por la derecha:`, before: `${fr(x2)} =`, answer: String(d2R), special: SPECIAL, mistakes: d2R !== 2 * x2 ? [{ answer: String(2 * x2), feedback: `La derivada de $(${minus("x", p)})^2$ es $2(${minus("x", p)})$, no $2x$.` }] : [] },
        puntoChoice(der2 ? "derivable" : "anguloso", ["derivable", "anguloso", "cuspidal", "vertical"], `¿Qué ocurre en $(${x2}, f(${x2}))$?`),
      ],
      hints: [
        "En cada punto, primero la continuidad: valor en el punto y límites laterales.",
        "Si es continua, deriva cada rama y evalúa en el punto.",
        `En $x = ${x2}$: $f(${x2}) = ${v2}$ y $\\lim_{x \\to ${x2}^-} f(x) = ${v2}$. Es continua.`,
      ],
      solution: [
        lnFirst
          ? `En $x = ${x1}$: $f(${x1}) = ${v1}$ por la segunda rama, pero $\\lim_{x \\to ${x1}^-} ${first} = ${firstVal}$. Son distintos: salto, y entonces no es derivable.`
          : `En $x = ${x1}$: $f(${x1}) = ${v1}$ y por la izquierda $${first}$ también tiende a $${v1}$. Es continua. Derivadas laterales: $${d1L}$ por la izquierda y $${m}$ por la derecha. ${ang1 ? "Distintas: punto anguloso." : "Iguales: es derivable."}`,
        `En $x = ${x2}$: $f(${x2}) = ${third.replace(/x/g, `(${x2})`)} = ${v2}$ y por la izquierda $${lineTex(m, n)} \\to ${v2}$. Es continua.`,
        `Por la izquierda la pendiente es $${m}$. Por la derecha, $[${third}]' = 2(${minus("x", p)})$, que en $x = ${x2}$ vale $${d2R}$.`,
        der2 ? `Coinciden: $f'(${x2}) = ${m}$, es derivable.` : `$${m} \\neq ${d2R}$: no es derivable, $(${x2}, ${v2})$ es un punto anguloso.`,
      ],
    };
  },
};

const tresParametros: ExerciseGen = {
  id: "tres-parametros",
  title: "Tres parámetros: continua en un punto y derivable en otro (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const k = r.pick([1, 2, 3, -1]);
    const n = r.pick([2, 3]);
    const M = r.pick([1, 2]);
    const variant = r.pick(["A", "B"] as const);
    const ek = `e^{${coef(k, "x")}}`;
    const rightTex = coef(M, `x^{${n}}`);
    const fTex = cases([[ek, "x < 0"], ["ax^{2} + bx + c", "0 \\le x \\le 1"], [rightTex, "x > 1"]]);
    let a: number, b: number, c: number;
    let statement: string, sol: string[];
    if (variant === "A") {
      // continua en 0 y derivable en 1
      c = 1;
      a = n * M - M + 1;
      b = M - 1 - a;
      statement = `Sea $$f(x) = ${fTex}$$ Determina $a$, $b$ y $c$ para que $f$ sea continua en $x = 0$ y derivable en $x = 1$.`;
      sol = [
        `Continuidad en $0$: $\\lim_{x \\to 0^-} ${ek} = 1$ y $f(0) = c$, así que $c = 1$.`,
        `Derivable en $1$ exige continuidad: $f(1) = a + b + c$ y $\\lim_{x \\to 1^+} ${rightTex} = ${M}$. Con $c = 1$: $a + b = ${M - 1}$.`,
        `Derivadas laterales en $1$: $2a + b$ por la izquierda y $${n * M}$ por la derecha, porque $(${rightTex})' = ${coef(n * M, n === 2 ? "x" : "x^{2}")}$. Entonces $2a + b = ${n * M}$.`,
        `Restando: $a = ${n * M} - ${M - 1 < 0 ? `(${M - 1})` : M - 1} = ${a}$ y $b = ${M - 1} - ${a < 0 ? `(${a})` : a} = ${b}$.`,
      ];
    } else {
      // derivable en 0 y continua en 1
      c = 1;
      b = k;
      a = M - 1 - k;
      statement = `Sea $$f(x) = ${fTex}$$ Determina $a$, $b$ y $c$ para que $f$ sea derivable en $x = 0$ y continua en $x = 1$.`;
      sol = [
        `Derivable en $0$ exige continuidad: $\\lim_{x \\to 0^-} ${ek} = 1 = f(0) = c$, así que $c = 1$.`,
        `Derivadas laterales en $0$: $(${ek})' = ${coef(k, ek)}$ vale $${k}$ en $x = 0$, y $(ax^2 + bx + c)' = 2ax + b$ vale $b$. Entonces $b = ${k}$.`,
        `Continuidad en $1$: $a + b + c = ${M}$, así que $a = ${M} - ${k < 0 ? `(${k})` : k} - 1 = ${a}$.`,
      ];
    }
    return {
      statement,
      sequential: true,
      parts: [
        { kind: "expr", before: "c =", answer: String(c), mistakes: [{ answer: "0", feedback: "$e^0 = 1$, no $0$." }] },
        { kind: "expr", before: "a =", answer: String(a) },
        { kind: "expr", before: "b =", answer: String(b) },
      ],
      hints: [
        "Continua en un punto da una ecuación. Derivable en un punto da dos: continuidad y derivadas laterales iguales.",
        "Empieza por el punto $x = 0$: $e^0 = 1$.",
        "Con $c$ conocido quedan dos ecuaciones lineales en $a$ y $b$.",
      ],
      solution: sol,
    };
  },
};

const tipoPuntoRaiz: ExerciseGen = {
  id: "tipo-punto-raiz",
  title: "¿Anguloso, cuspidal o de tangente vertical? (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const a = r.int(-3, 3);
    const k = r.int(-3, 3);
    const kind = r.pick(["raices", "raices", "rectas"] as const);
    if (kind === "rectas") {
      const m1 = r.int(-3, 3);
      let m2: number;
      do m2 = r.int(-3, 3); while (m2 === m1);
      const left = plusConst(coef(m1 === 0 ? 1 : m1, `(${minus("x", a)})`), k);
      const leftTex = m1 === 0 ? String(k) : left;
      const rightTex = plusConst(`(${minus("x", a)})^{2}${m2 === 0 ? "" : ` ${m2 > 0 ? "+" : "-"} ${coef(Math.abs(m2), `(${minus("x", a)})`)}`}`, k);
      return {
        statement: `Dada $$f(x) = ${cases([[leftTex, `x \\le ${a}`], [rightTex, `x > ${a}`]])}$$ calcula las derivadas laterales en $x = ${a}$. ¿Es $(${a}, f(${a}))$ un punto anguloso, cuspidal o de tangente vertical?`,
        sequential: true,
        parts: [
          { kind: "expr", before: `${fl(a)} =`, answer: String(m1), special: SPECIAL },
          { kind: "expr", before: `${fr(a)} =`, answer: String(m2), special: SPECIAL },
          puntoChoice("anguloso", ["derivable", "anguloso", "cuspidal", "vertical"]),
        ],
        hints: ["Las dos ramas valen $" + k + "$ en el punto: es continua.", "Deriva cada rama y evalúa en el punto."],
        solution: [
          `Es continua: las dos ramas dan $${k}$ en $x = ${a}$.`,
          `$${fl(a)} = ${m1}$ y $${fr(a)} = ${m2}$, por la derivada de cada rama.`,
          "Laterales finitas y distintas: punto anguloso.",
        ],
      };
    }
    const cL = r.pick([1, -1, 2]);
    const cR = r.pick([1, -1, 2]);
    const sL = -Math.sign(cL); // lim h->0-  cL*sqrt(-h)/h
    const sR = Math.sign(cR);
    const t: Punto = sL === sR ? "vertical" : "cuspidal";
    const cTex = (c: number) => (c === 1 ? "+" : c === -1 ? "-" : `+ ${c}`);
    const leftTex = `${k === 0 ? "" : k} ${cTex(cL)}\\sqrt{${a === 0 ? "-x" : `${a} - x`}}`.trim().replace(/^\+ /, "").replace(/^\+/, "");
    const rightTex = `${k === 0 ? "" : k} ${cTex(cR)}\\sqrt{${minus("x", a)}}`.trim().replace(/^\+ /, "").replace(/^\+/, "");
    return {
      statement: `Dada $$f(x) = ${cases([[leftTex, `x \\le ${a}`], [rightTex, `x > ${a}`]])}$$ calcula las derivadas laterales en $x = ${a}$ por definición. ¿Es $(${a}, f(${a}))$ un punto anguloso, cuspidal o de tangente vertical?`,
      sequential: true,
      parts: [
        { kind: "expr", before: `${fl(a)} =`, answer: infAns(sL), special: SPECIAL, mistakes: [{ answer: infAns(-sL), feedback: "Para $h < 0$, $\\sqrt{-h}$ es positivo y $h$ es negativo. Revisa el signo del cociente." }] },
        { kind: "expr", before: `${fr(a)} =`, answer: infAns(sR), special: SPECIAL },
        puntoChoice(t, ["derivable", "anguloso", "cuspidal", "vertical"]),
      ],
      hints: [
        `$f(${a}) = ${k}$. Las dos ramas tienden a $${k}$, así que es continua.`,
        `Por la izquierda, $f(${a} + h) - f(${a}) = ${cL === 1 ? "" : cL === -1 ? "-" : cL}\\sqrt{-h}$ con $h < 0$. Por la derecha, $${cR === 1 ? "" : cR === -1 ? "-" : cR}\\sqrt{h}$ con $h > 0$.`,
        "$\\dfrac{\\sqrt{h}}{h} = \\dfrac{1}{\\sqrt{h}}$ y $\\dfrac{\\sqrt{-h}}{h} = -\\dfrac{1}{\\sqrt{-h}}$.",
      ],
      solution: [
        `Continuidad: $f(${a}) = ${k}$ y las dos raíces tienden a $0$. Es continua.`,
        `Izquierda: $\\lim_{h \\to 0^-} \\dfrac{${cL === 1 ? "" : cL === -1 ? "-" : cL}\\sqrt{-h}}{h} = \\lim_{h \\to 0^-} \\dfrac{${-cL}}{\\sqrt{-h}} = ${inf(sL)}$.`,
        `Derecha: $\\lim_{h \\to 0^+} \\dfrac{${cR === 1 ? "" : cR === -1 ? "-" : cR}\\sqrt{h}}{h} = \\lim_{h \\to 0^+} \\dfrac{${cR}}{\\sqrt{h}} = ${inf(sR)}$.`,
        t === "vertical"
          ? "Las dos son infinitas con el mismo signo: tangente vertical, también llamado punto de derivada infinita."
          : "Son infinitas de signo contrario: punto cuspidal.",
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("derivabilidad"),
  objectives: [
    "Calcular derivadas laterales por definición y decidir si una función es derivable en un punto.",
    "Usar que derivable implica continua, y reconocer que lo contrario no es cierto.",
    "Distinguir puntos angulosos, cuspidales y de tangente vertical, en fórmulas y en gráficas.",
    "Hallar parámetros para que una función a trozos sea continua y derivable, como en el segundo parcial.",
  ],
  sections: [
    {
      id: "idea",
      title: "Cuándo hay recta tangente",
      blocks: [
        {
          type: "text",
          md: "Una función es derivable en un punto cuando su gráfica admite ahí una recta tangente con pendiente finita. Casi todas las funciones del curso lo son en casi todos sus puntos. Lo interesante son los puntos donde falla, y fallan por dos motivos:\n\n- La gráfica se rompe: salto, hueco o asíntota. Si no hay continuidad no hay tangente.\n- La gráfica es continua pero hace un pico o se pone vertical.",
        },
        {
          type: "widget",
          widget: { kind: "tangent", fn: "|x|", x: [-4, 4], y: [-2, 4] },
          caption: "Mueve el punto sobre $|x|$. A la izquierda la pendiente es $-1$ y a la derecha $1$. En $x = 0$ no hay una sola tangente posible.",
        },
        {
          type: "note",
          tone: "idea",
          title: "Suave quiere decir derivable",
          md: "Si haces zoom sobre un punto donde la función es derivable, la curva se ve cada vez más recta. En un pico, por mucho que acerques, el pico sigue ahí. Esa es la intuición de la derivabilidad.",
        },
        {
          type: "quick",
          exercise: {
            statement: "La función $f(x) = |x - 3|$ es derivable en $x = 3$. ¿Verdadero o falso?",
            parts: [trueFalse(false, "En $x = 3$ la gráfica tiene un pico: pendiente $-1$ a la izquierda y $1$ a la derecha.")],
            solution: ["Falso. Hay un punto anguloso en $x = 3$."],
          },
        },
      ],
    },
    {
      id: "laterales",
      title: "Derivadas laterales",
      blocks: [
        {
          type: "text",
          md: "Igual que el límite se estudia por cada lado, la derivada también. Se hace $h \\to 0$ solo con valores negativos o solo con valores positivos.",
        },
        {
          type: "definition",
          title: "Derivadas laterales",
          md: "$$f'_-(a) = \\lim_{h \\to 0^-} \\frac{f(a + h) - f(a)}{h}$$\n\n$$f'_+(a) = \\lim_{h \\to 0^+} \\frac{f(a + h) - f(a)}{h}$$\n\n$f$ es derivable en $a$ si y solo si las dos existen, son finitas y son iguales. En ese caso $f'(a)$ es ese valor común.",
        },
        {
          type: "example",
          title: "El valor absoluto",
          problem: "Estudia la derivabilidad de $f(x) = {|x - 2|}$ en $x = 2$.",
          steps: [
            "$f(2) = 0$ y $f(2 + h) = |h|$, así que el cociente es $\\dfrac{|h|}{h}$.",
            "Si $h > 0$, $|h| = h$ y el cociente vale $1$: $f'_+(2) = 1$.",
            "Si $h < 0$, $|h| = -h$ y el cociente vale $-1$: $f'_-(2) = -1$.",
          ],
          answer: "Las laterales son distintas, $f$ no es derivable en $x = 2$.",
        },
        {
          type: "example",
          title: "Una función a trozos que sí es derivable",
          problem: "Estudia la derivabilidad en $x = 1$ de $f(x) = \\begin{cases} x^2 & \\text{si } x \\le 1 \\\\ 2x - 1 & \\text{si } x > 1 \\end{cases}$",
          steps: [
            "Continuidad: $f(1) = 1$ y $\\lim_{x \\to 1^+} (2x - 1) = 1$. Es continua.",
            "Por la izquierda: $\\dfrac{(1 + h)^2 - 1}{h} = 2 + h \\to 2$. Así que $f'_-(1) = 2$.",
            "Por la derecha: $\\dfrac{2(1 + h) - 1 - 1}{h} = \\dfrac{2h}{h} = 2$. Así que $f'_+(1) = 2$.",
          ],
          answer: "Las laterales coinciden: $f$ es derivable en $x = 1$ y $f'(1) = 2$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Derivar las ramas solo vale si hay continuidad",
          md: "El atajo de derivar cada fórmula y evaluar en el punto funciona cuando $f$ es continua ahí. Mira esta función:\n\n$$f(x) = \\begin{cases} x^2 & \\text{si } x < 1 \\\\ 2x + 1 & \\text{si } x \\ge 1 \\end{cases}$$\n\nLas dos ramas tienen derivada $2$ en $x = 1$, pero $f(1) = 3$ y por la izquierda la función llega a $1$. Por definición,\n\n$$f'_-(1) = \\lim_{h \\to 0^-} \\dfrac{(1 + h)^2 - 3}{h} = +\\infty$$\n\nNo es derivable porque ni siquiera es continua.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $f'_-(0)$ si $f(x) = |x| + 3x$.",
            parts: [{ kind: "expr", before: "f'_{-}(0) =", answer: "2", special: SPECIAL, mistakes: [{ answer: "4", feedback: "Esa es la derivada por la derecha. Para $x < 0$, $|x| = -x$ y $f(x) = 2x$." }] }],
            solution: ["Para $x < 0$, $f(x) = -x + 3x = 2x$. Su pendiente es $2$."],
          },
        },
      ],
    },
    {
      id: "continuidad",
      title: "Derivable implica continua",
      blocks: [
        {
          type: "definition",
          title: "Teorema",
          md: "Si $f$ es derivable en $a$, entonces $f$ es continua en $a$.",
        },
        {
          type: "example",
          title: "Por qué es cierto",
          problem: "Supón que existe $f'(a)$. Demuestra que $\\lim_{x \\to a} f(x) = f(a)$.",
          steps: [
            "Escribe la diferencia como un producto: $f(a + h) - f(a) = \\dfrac{f(a + h) - f(a)}{h} \\cdot h$.",
            "Toma límite con $h \\to 0$: el primer factor tiende a $f'(a)$, que es un número, y el segundo a $0$.",
            "Entonces $\\lim_{h \\to 0} [f(a + h) - f(a)] = f'(a) \\cdot 0 = 0$, que es lo mismo que $\\lim_{x \\to a} f(x) = f(a)$.",
          ],
        },
        {
          type: "table",
          headers: ["Si sabes que...", "Puedes concluir"],
          rows: [
            ["$f$ es derivable en $a$", "$f$ es continua en $a$"],
            ["$f$ no es continua en $a$", "$f$ no es derivable en $a$"],
            ["$f$ es continua en $a$", "nada sobre la derivada. $|x|$ es continua en $0$ y no es derivable ahí."],
            ["$f$ no es derivable en $a$", "nada sobre la continuidad. Puede ser continua, como $|x|$ en $0$."],
          ],
          caption: "La implicación va en un solo sentido.",
        },
        {
          type: "note",
          tone: "warning",
          title: "El recíproco es falso",
          md: "Es la pregunta de verdadero o falso que más se repite. \"Si $f$ es continua entonces es derivable\" es **falso**, y el contraejemplo de siempre es $|x|$ en $x = 0$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Si $f$ no es derivable en $x_0$, entonces no es continua en $x_0$. ¿Verdadero o falso?",
            parts: [trueFalse(false, "$|x|$ no es derivable en $0$ pero sí es continua.")],
            solution: ["Falso. La no derivabilidad puede venir de un pico en una función continua."],
          },
        },
      ],
    },
    {
      id: "puntos",
      title: "Puntos angulosos, cuspidales y de tangente vertical",
      blocks: [
        {
          type: "text",
          md: "Cuando $f$ es continua en $a$ pero no derivable, las derivadas laterales dicen qué forma tiene la gráfica en ese punto.",
        },
        {
          type: "table",
          headers: ["Tipo", "Derivadas laterales y forma"],
          rows: [
            ["Punto anguloso", "Finitas y distintas. Un pico con dos pendientes, como $|x|$ en $0$."],
            ["Punto cuspidal", "Infinitas de signo contrario. Una punta afilada, vertical por los dos lados, como $\\sqrt[3]{x^2}$ en $0$."],
            ["Tangente vertical", "Infinitas del mismo signo. Pasa sin pico pero se pone vertical, como $\\sqrt[3]{x}$ en $0$."],
          ],
        },
        { type: "graph", spec: puntoGraph("anguloso", 0, 0, 1), caption: "Punto anguloso: pendiente $-1$ a la izquierda y $2$ a la derecha." },
        { type: "graph", spec: puntoGraph("cuspidal", 0, 0, 1), caption: "Punto cuspidal: $2\\sqrt[3]{x^2}$. Llega bajando en vertical y sale subiendo en vertical." },
        { type: "graph", spec: puntoGraph("vertical", 0, 0, 1), caption: "Tangente vertical: $2\\sqrt[3]{x}$. La recta tangente en el origen es el eje $y$." },
        {
          type: "example",
          title: "Raíz cúbica en el origen",
          problem: "Estudia la derivabilidad de $f(x) = \\sqrt[3]{x}$ y de $g(x) = \\sqrt[3]{x^2}$ en $x = 0$.",
          steps: [
            "Para $f$: $\\dfrac{\\sqrt[3]{h}}{h} = \\dfrac{1}{\\sqrt[3]{h^2}}$. El denominador es positivo y tiende a $0$ por los dos lados, así que las dos derivadas laterales valen $+\\infty$. Tangente vertical.",
            "Para $g$: $\\dfrac{\\sqrt[3]{h^2}}{h} = \\dfrac{1}{\\sqrt[3]{h}}$. Si $h \\to 0^+$ da $+\\infty$ y si $h \\to 0^-$ da $-\\infty$. Punto cuspidal.",
          ],
          answer: "Ninguna de las dos es derivable en $0$, aunque ambas son continuas.",
        },
        {
          type: "note",
          tone: "tip",
          title: "Nombres que vas a ver en el parcial",
          md: "Al punto de tangente vertical algunos profesores lo llaman \"punto de derivada infinita\". Y a veces piden \"demostrar gráficamente\" que $f$ no es derivable: basta dibujar la función cerca del punto y mostrar el pico, la punta o el tramo vertical.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Si $f'_-(a) = -\\infty$ y $f'_+(a) = +\\infty$, con $f$ continua en $a$, ¿qué tiene $f$ en $x = a$?",
            parts: [puntoChoice("cuspidal", ["anguloso", "cuspidal", "vertical"])],
            solution: ["Laterales infinitas de signo contrario: punto cuspidal."],
          },
        },
      ],
    },
    {
      id: "trozos",
      title: "Derivabilidad de funciones a trozos",
      blocks: [
        {
          type: "text",
          md: "En el parcial casi siempre viene una función a trozos y piden estudiar la derivabilidad en los puntos de cambio. El orden de trabajo es este:\n\n- Estudia la continuidad. Si no es continua, ya terminaste: no es derivable.\n- Si es continua, calcula las dos derivadas laterales. Puedes usar la definición o, como ya sabes que es continua, derivar cada rama y evaluar en el punto.\n- Compara: iguales y finitas, derivable. Finitas y distintas, anguloso. Infinitas, cuspidal o tangente vertical según los signos.",
        },
        {
          type: "example",
          title: "Tipo parcial",
          problem: "Sea\n\n$$f(x) = \\begin{cases} \\ln(x + 6) & \\text{si } -6 < x < -2 \\\\ -\\dfrac{x}{4} + \\dfrac{5}{2} & \\text{si } -2 \\le x < 2 \\\\ (x - 4)^2 - 2 & \\text{si } x \\ge 2 \\end{cases}$$\n\nEstudia la derivabilidad en $x = -2$ y en $x = 2$. ¿Es $(2, f(2))$ un punto anguloso, cuspidal o de derivada infinita?",
          steps: [
            "En $x = -2$: $f(-2) = \\frac{1}{2} + \\frac{5}{2} = 3$, pero por la izquierda $\\ln(-2 + 6) = \\ln 4 \\approx 1{,}39$. Hay un salto. No es continua, así que no es derivable.",
            "En $x = 2$: $f(2) = (2 - 4)^2 - 2 = 2$ y por la izquierda $-\\frac{2}{4} + \\frac{5}{2} = 2$. Es continua.",
            "Por la izquierda, con la definición: $\\dfrac{-\\frac{2 + h}{4} + \\frac{5}{2} - 2}{h} = \\dfrac{-\\frac{h}{4}}{h} = -\\dfrac{1}{4}$.",
            "Por la derecha: $\\dfrac{(h - 2)^2 - 2 - 2}{h} = \\dfrac{h^2 - 4h}{h} = h - 4 \\to -4$.",
          ],
          answer: "$f'_-(2) = -\\frac{1}{4}$ y $f'_+(2) = -4$: finitas y distintas. $(2, 2)$ es un punto anguloso.",
        },
        {
          type: "graph",
          spec: {
            x: [-6, 7],
            y: [-3, 5],
            curves: [
              { fn: "\\ln(x + 6)", domain: [-5.9, -2], color: "accent" },
              { fn: "-\\frac{x}{4} + \\frac{5}{2}", domain: [-2, 2], color: "accent" },
              { fn: "(x - 4)^{2} - 2", domain: [2, 7], color: "accent" },
            ],
            points: [{ x: -2, y: 1.386, open: true }, { x: -2, y: 3, color: "accent" }, { x: 2, y: 2, color: "accent" }],
          },
          caption: "El salto en $x = -2$ y el pico en $x = 2$ se ven a simple vista. Eso es demostrarlo gráficamente.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Sea $f(x) = x^2 + 1$ si $x \\le 0$ y $f(x) = x + 1$ si $x > 0$. ¿Es derivable en $x = 0$?",
            parts: [puntoChoice("anguloso", ["derivable", "anguloso", "discontinua"])],
            solution: ["Es continua: las dos ramas dan $1$. Laterales: $2 \\cdot 0 = 0$ por la izquierda y $1$ por la derecha. Punto anguloso."],
          },
        },
      ],
    },
    {
      id: "parametros",
      title: "Parámetros para que sea derivable",
      blocks: [
        {
          type: "text",
          md: "Si piden que $f$ sea derivable en un punto de cambio, salen **dos** ecuaciones: una por la continuidad y otra por la igualdad de las derivadas laterales. Si solo piden continuidad, sale una.\n\nMueve los deslizadores hasta que la recta $y = ax + b$ toque a la parábola $y = x^2$ en $x = 1$ sin cortarla. Eso ocurre con $a = 2$ y $b = -1$: la recta es la tangente.",
        },
        {
          type: "widget",
          widget: {
            kind: "sliders",
            fn: "ax + b",
            params: [
              { name: "a", min: -4, max: 4, step: 0.5, value: 0 },
              { name: "b", min: -4, max: 4, step: 0.5, value: 1 },
            ],
            x: [-3, 4],
            y: [-3, 8],
            formula: "y = {a}x + {b}",
            reference: [{ fn: "x^{2}", domain: [-3, 1], color: "muted" }],
          },
          caption: "La parábola es la rama $x \\le 1$. La recta es la rama $x > 1$.",
        },
        {
          type: "example",
          title: "Dos parámetros",
          problem: "Determina $a$ y $b$ para que esta función sea derivable en $x = 1$:\n\n$$f(x) = \\begin{cases} x^2 & \\text{si } x \\le 1 \\\\ ax + b & \\text{si } x > 1 \\end{cases}$$",
          steps: [
            "Continuidad: $f(1) = 1$ y por la derecha $a + b$. Ecuación: $a + b = 1$.",
            "Derivadas laterales: $2x$ en $x = 1$ da $2$, y la recta tiene pendiente $a$. Ecuación: $a = 2$.",
            "Entonces $b = 1 - 2 = -1$.",
          ],
          answer: "$a = 2$, $b = -1$.",
        },
        {
          type: "example",
          title: "Tres parámetros, tipo parcial",
          problem: "Sea\n\n$$h(z) = \\begin{cases} e^{3z} & \\text{si } z < 0 \\\\ dz^2 + ez + f & \\text{si } 0 \\le z \\le 1 \\\\ z^3 & \\text{si } z > 1 \\end{cases}$$\n\nDetermina $d$, $e$ y $f$ para que $h$ sea continua en $z = 0$ y derivable en $z = 1$.",
          steps: [
            "Aquí $e$ es un parámetro, no el número de Euler. En el exponente $e^{3z}$ sí es el número de Euler.",
            "Continua en $0$: $\\lim_{z \\to 0^-} e^{3z} = 1$ y $h(0) = f$. Entonces $f = 1$.",
            "Derivable en $1$ exige continuidad: $d + e + f = 1^3 = 1$, así que $d + e = 0$.",
            "Derivadas laterales en $1$: $2d + e$ por la izquierda y $3z^2 = 3$ por la derecha. Entonces $2d + e = 3$.",
            "Restando: $d = 3$ y $e = -3$.",
          ],
          answer: "$d = 3$, $e = -3$, $f = 1$.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Costos sin quiebres",
          md: "Cuando una empresa cambia de tecnología a partir de cierto volumen, su función de costo puede ir por tramos. Si además de continua es derivable en el cambio, el costo marginal no salta: la unidad siguiente cuesta lo mismo justo antes y justo después del cambio. Eso es pedir derivabilidad.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Qué valor de $a$ hace falta para que esta función sea derivable en $x = 1$?\n\n$$f(x) = \\begin{cases} 3x^2 & \\text{si } x \\le 1 \\\\ ax + b & \\text{si } x > 1 \\end{cases}$$",
            parts: [{ kind: "expr", before: "a =", answer: "6", mistakes: [{ answer: "3", feedback: "Ese es $f(1)$. La pendiente de la recta tiene que igualar a $(3x^2)' = 6x$ en $x = 1$." }] }],
            solution: ["$(3x^2)' = 6x$ vale $6$ en $x = 1$. Entonces $a = 6$, y por continuidad $b = 3 - 6 = -3$."],
          },
        },
      ],
    },
  ],
  exercises: [
    lateralesAbs,
    clasificarPunto,
    lateralesTrozos,
    implica,
    trozosDerivable,
    parametrosDerivable,
    derivadaInfinita,
    vfDerivabilidad,
    estudioTrozos,
    tresParametros,
    tipoPuntoRaiz,
  ],
};

export default topic;

