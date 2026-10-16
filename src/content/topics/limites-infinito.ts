import { meta } from "../catalog";
import { choice } from "../helpers";
import type { ExerciseGen, Part, Rich, Topic } from "../types";
import { coef, fmt, frac, minus, poly, signed, terms } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

type ExprPart = Extract<Part, { kind: "expr" }>;
const SPECIAL: ExprPart["special"] = ["inf", "-inf", "dne"];

function limPart(answer: string, extra: Partial<Omit<ExprPart, "kind" | "answer">> = {}): ExprPart {
  return { kind: "expr", answer, special: SPECIAL, ...extra };
}

const INF = "\\infty";
const NINF = "-\\infty";
const infTex = (s: number) => (s > 0 ? INF : NINF);
const infWord = (s: number) => (s > 0 ? "+\\infty" : "-\\infty");
/** Punto al infinito para escribir debajo del límite. */
const atInf = (s: number) => (s > 0 ? "+\\infty" : "-\\infty");
const lim = (p: number | string, expr: string, v = "x") => `\\lim_{${v} \\to ${p}} ${expr}`;
const dfrac = (n: string, d: string) => `\\dfrac{${n}}{${d}}`;
const sq = (inner: string) => `\\sqrt{${inner}}`;
const sideTex = (a: number, s: number) => `${a}^{${s > 0 ? "+" : "-"}}`;
/** (x - a)^2 bien escrito aunque a = 0. */
const sqDen = (a: number) => (a === 0 ? "x^{2}" : `(${minus("x", a)})^{2}`);

/** Término " + \frac{c}{den}" con el signo bien puesto, vacío si c = 0. */
const fracTerm = (c: number, den: string) => (c === 0 ? "" : ` ${c < 0 ? "-" : "+"} \\frac{${Math.abs(c)}}{${den}}`);

const oppositeInf =(s: number): { answer: string; feedback: Rich }[] => [
  { answer: infTex(-s), feedback: "El tamaño está bien pero el signo no. Revisa el signo del numerador y el del denominador por separado." },
];

/** Errores típicos numéricos, sin repetir y sin el valor correcto. */
function wrongNums(ans: number, list: [number, Rich][]) {
  const out: { answer: string; feedback: Rich }[] = [];
  const used: number[] = [ans];
  for (const [v, feedback] of list) {
    if (!Number.isFinite(v) || used.some((u) => Math.abs(u - v) < 1e-9)) continue;
    used.push(v);
    out.push({ answer: fmt(v), feedback });
  }
  return out;
}

/* ----------------------------------- ejercicios ----------------------------------- */

const kSobreCero: ExerciseGen = {
  id: "k-sobre-cero",
  title: "Límites de la forma k/0",
  level: 1,
  generate: (r) => {
    const tpl = r.pick(["lineal", "invertido", "cuadrado"] as const);
    const a = r.int(-3, 4);
    const p = r.nz(-3, 3);
    let q: number;
    do q = r.int(-5, 5); while (p * a + q === 0);
    const Na = p * a + q;
    const s = r.sign();
    const N = terms([[p, "x"], [q, ""]]);
    let expr: string, sign: number, point: string, denWhy: Rich;
    if (tpl === "lineal") {
      expr = dfrac(N, minus("x", a));
      sign = Math.sign(Na) * s;
      point = sideTex(a, s);
      denWhy = `Si $x \\to ${point}$, entonces $x ${s > 0 ? ">" : "<"} ${a}$ y el denominador $${minus("x", a)}$ es ${s > 0 ? "positivo" : "negativo"} y muy pequeño: tiende a $0^{${s > 0 ? "+" : "-"}}$.`;
    } else if (tpl === "invertido") {
      expr = dfrac(N, `${a} - x`);
      sign = -Math.sign(Na) * s;
      point = sideTex(a, s);
      denWhy = `Si $x \\to ${point}$, entonces $x ${s > 0 ? ">" : "<"} ${a}$ y el denominador $${a} - x$ es ${s > 0 ? "negativo" : "positivo"} y muy pequeño: tiende a $0^{${s > 0 ? "-" : "+"}}$.`;
    } else {
      expr = dfrac(N, sqDen(a));
      sign = Math.sign(Na);
      point = String(a);
      denWhy = `El denominador $${sqDen(a)}$ es un cuadrado: es positivo por los dos lados y tiende a $0^{+}$.`;
    }
    return {
      statement: `Calcula $$${lim(point, expr)}$$`,
      parts: [limPart(infTex(sign), { mistakes: oppositeInf(sign) })],
      hints: [
        "Sustituye en el numerador. Si da un número distinto de cero y el denominador tiende a cero, el resultado es infinito. Falta el signo.",
        "Averigua si el denominador se acerca a cero con valores positivos o negativos. Prueba con un número cercano al punto, del lado indicado.",
      ],
      solution: [
        `Al sustituir $x = ${a}$, el numerador $${N}$ da $${Na}$, que es ${Na > 0 ? "positivo" : "negativo"}. El denominador da $0$: la forma es $\\frac{${Na}}{0}$.`,
        denWhy,
        `Un número ${Na > 0 ? "positivo" : "negativo"} entre algo que tiende a $0$ con signo ${(sign > 0) === (Na > 0) ? "positivo" : "negativo"} crece sin control con signo ${sign > 0 ? "positivo" : "negativo"}: el límite es $${infWord(sign)}$.`,
      ],
    };
  },
};

const gradoIgual: ExerciseGen = {
  id: "grado-igual",
  title: "Cociente de polinomios del mismo grado",
  level: 1,
  generate: (r) => {
    const n = r.pick([2, 2, 3]);
    const a = r.nz(-6, 6);
    const d = r.nz(-5, 5);
    const num = [a, ...Array.from({ length: n }, () => r.int(-6, 6))];
    const den = [d, ...Array.from({ length: n }, () => r.int(-6, 6))];
    if (num[n] === 0) num[n] = 1;
    if (den[n] === 0) den[n] = r.nz(-6, 6);
    const s = r.sign();
    const ans = a / d;
    return {
      statement: `Calcula $$${lim(atInf(s), dfrac(poly(num), poly(den)))}$$`,
      parts: [
        limPart(frac(a, d), {
          mistakes: wrongNums(ans, [
            [num[n] / den[n], "Dividiste los términos independientes. Eso sería el límite cuando $x \\to 0$. Al infinito mandan los términos de mayor grado."],
            [0, "El resultado es $0$ solo si el grado del numerador es menor que el del denominador. Aquí son iguales."],
          ]),
        }),
      ],
      hints: [
        `Al sustituir sale $\\frac{\\infty}{\\infty}$. Divide numerador y denominador entre $x^{${n}}$, la mayor potencia.`,
        "Cada término $\\frac{k}{x^m}$ tiende a $0$ cuando $x$ se va al infinito.",
      ],
      solution: [
        `Es una indeterminación $\\frac{\\infty}{\\infty}$. Dividimos todo entre $x^{${n}}$.`,
        `Todos los términos con $x$ en el denominador tienden a $0$. Quedan solo los coeficientes principales: $\\dfrac{${a}}{${d}}$.`,
        `El límite es $${frac(a, d)}$. Cuando los grados son iguales, el límite es el cociente de los coeficientes principales.`,
      ],
    };
  },
};

const polinomioInfinito: ExerciseGen = {
  id: "polinomio-infinito",
  title: "Polinomios en el infinito",
  level: 1,
  generate: (r) => {
    const n = r.int(2, 5);
    const a = r.nz(-4, 4);
    const b = r.int(-9, 9);
    const c = r.int(-9, 9);
    const s = r.sign();
    const coefs = [a, b, ...Array(n - 2).fill(0), c];
    const sign = Math.sign(a) * (s > 0 ? 1 : (-1) ** n);
    return {
      statement: `Calcula $$${lim(atInf(s), `(${poly(coefs)})`)}$$`,
      parts: [limPart(infTex(sign), { mistakes: oppositeInf(sign) })],
      hints: [
        `Saca factor común $x^{${n}}$. Lo que queda dentro del paréntesis tiende a $${a}$.`,
        s < 0 ? `Cuidado con el signo: $x^{${n}}$ con $x$ negativo es ${n % 2 === 0 ? "positivo" : "negativo"}.` : "Con $x$ positivo y grande, $x^n$ es positivo y enorme.",
      ],
      solution: [
        `Factor común: $x^{${n}}\\left(${a}${fracTerm(b, "x")}${fracTerm(c, `x^{${n}}`)}\\right)$. El paréntesis tiende a $${a}$.`,
        `Si $x \\to ${atInf(s)}$, $x^{${n}} \\to ${s > 0 || n % 2 === 0 ? "+\\infty" : "-\\infty"}$${s < 0 ? ` porque el exponente es ${n % 2 === 0 ? "par" : "impar"}` : ""}.`,
        `El producto con $${a}$ da $${infWord(sign)}$. Un polinomio en el infinito se comporta como su término de mayor grado.`,
      ],
    };
  },
};

const expBasico: ExerciseGen = {
  id: "exp-basico",
  title: "Exponenciales y logaritmos en los extremos",
  level: 1,
  generate: (r) => {
    const k = r.int(1, 4);
    const kx = k === 1 ? "x" : `${k}x`;
    const b = r.pick([2, 3, 5]);
    const A = r.int(1, 9);
    const B = r.int(1, 4);
    const pool: { expr: string; p: string; ans: string; why: Rich }[] = [
      { expr: `e^{${kx}}`, p: "-\\infty", ans: "0", why: `Si $x \\to -\\infty$, el exponente $${kx}$ es muy negativo y $e^{${kx}} = \\frac{1}{e^{${k === 1 ? "" : k}|x|}}$ se hace diminuto.` },
      { expr: `e^{${kx}}`, p: "+\\infty", ans: INF, why: "La exponencial de base mayor que $1$ crece sin control cuando el exponente crece." },
      { expr: `e^{-${kx}}`, p: "+\\infty", ans: "0", why: `$e^{-${kx}} = \\frac{1}{e^{${kx}}}$, y el denominador crece sin control.` },
      { expr: `e^{-${kx}}`, p: "-\\infty", ans: INF, why: `Si $x \\to -\\infty$, el exponente $-${kx}$ se va a $+\\infty$.` },
      { expr: `${b}^{x}`, p: "-\\infty", ans: "0", why: `$${b}^{x} = \\frac{1}{${b}^{-x}}$ y, si $x \\to -\\infty$, $${b}^{-x}$ crece sin control.` },
      { expr: `\\left(\\frac{1}{${b}}\\right)^{x}`, p: "+\\infty", ans: "0", why: "Una base entre $0$ y $1$ elevada a exponentes cada vez mayores se hace cada vez más pequeña." },
      { expr: `\\left(\\frac{1}{${b}}\\right)^{x}`, p: "-\\infty", ans: INF, why: `$\\left(\\frac{1}{${b}}\\right)^{x} = ${b}^{-x}$, y si $x \\to -\\infty$ el exponente $-x$ se va a $+\\infty$.` },
      { expr: "\\ln x", p: "+\\infty", ans: INF, why: "El logaritmo crece sin tope, aunque muy despacio." },
      { expr: "\\ln x", p: "0^{+}", ans: NINF, why: "Cerca de $0$ el logaritmo de un número positivo muy pequeño es muy negativo: $\\ln 0{,}001 \\approx -6{,}9$." },
      { expr: "e^{\\frac{1}{x}}", p: "0^{+}", ans: INF, why: "Si $x \\to 0^{+}$, $\\frac{1}{x} \\to +\\infty$ y la exponencial también." },
      { expr: "e^{\\frac{1}{x}}", p: "0^{-}", ans: "0", why: "Si $x \\to 0^{-}$, $\\frac{1}{x} \\to -\\infty$ y $e^{-\\infty}$ se interpreta como $0$." },
      { expr: dfrac(String(A), `${B} + e^{-x}`), p: "+\\infty", ans: frac(A, B), why: `$e^{-x} \\to 0$, así que queda $\\frac{${A}}{${B}}$.` },
      { expr: dfrac(String(A), `${B} + e^{-x}`), p: "-\\infty", ans: "0", why: `$e^{-x} \\to +\\infty$, así que el denominador crece sin control y la fracción tiende a $0$.` },
    ];
    const c = r.pick(pool);
    return {
      statement: `Calcula $$${lim(c.p, c.expr)}$$`,
      parts: [limPart(c.ans)],
      hints: [
        "Recuerda la forma de las gráficas: $e^{x}$ pega con el eje $x$ por la izquierda y sube sin control por la derecha. $\\ln x$ baja sin control cerca de $0$ y sube despacio hacia la derecha.",
      ],
      solution: [c.why, `$$${lim(c.p, c.expr)} = ${c.ans}$$`],
    };
  },
};

const bilateralInfinito: ExerciseGen = {
  id: "bilateral-infinito",
  title: "Laterales infinitos y existencia",
  level: 2,
  generate: (r) => {
    const tpl = r.pick(["cuadrado", "producto"] as const);
    const a = r.int(-3, 3);
    const p = r.nz(-3, 3);
    let q: number;
    do q = r.int(-5, 5); while (p * a + q === 0);
    const Na = p * a + q;
    const N = terms([[p, "x"], [q, ""]]);
    let D: string, left: number, right: number, steps: Rich[];
    if (tpl === "cuadrado") {
      D = sqDen(a);
      left = right = Math.sign(Na);
      steps = [
        `El numerador tiende a $${Na}$. El denominador $${D}$ es un cuadrado, así que tiende a $0^{+}$ por los dos lados.`,
        `Por los dos lados: $\\frac{${Na}}{0^{+}} = ${infWord(left)}$.`,
        `Los laterales coinciden, así que $\\lim_{x \\to ${a}} f(x) = ${infWord(left)}$.`,
      ];
    } else {
      let b = r.int(-4, 4);
      if (b === a) b = a + 2;
      D = poly([1, -(a + b), a * b]);
      const sb = Math.sign(a - b);
      left = Math.sign(Na) * sb * -1;
      right = Math.sign(Na) * sb;
      steps = [
        `El denominador se factoriza: $${D} = (${minus("x", a)})(${minus("x", b)})$. El numerador tiende a $${Na}$.`,
        `Cerca de $x = ${a}$, el factor $(${minus("x", b)})$ tiende a $${a - b}$, que es ${sb > 0 ? "positivo" : "negativo"}. El factor $(${minus("x", a)})$ tiende a $0^{-}$ por la izquierda y a $0^{+}$ por la derecha.`,
        `Por la izquierda el signo es $(${Na > 0 ? "+" : "-"}) / [(-)(${sb > 0 ? "+" : "-"})]$, el límite es $${infWord(left)}$. Por la derecha es $(${Na > 0 ? "+" : "-"}) / [(+)(${sb > 0 ? "+" : "-"})]$, el límite es $${infWord(right)}$.`,
        "Los laterales tienen signos distintos, así que el límite no existe.",
      ];
    }
    const lf = `\\lim_{x \\to ${a}`;
    return {
      statement: `Sea $$f(x) = ${dfrac(N, D)}$$ Estudia el comportamiento de $f$ cerca de $x = ${a}$.`,
      sequential: true,
      parts: [
        limPart(infTex(left), { before: `${lf}^{-}} f(x) =`, mistakes: oppositeInf(left) }),
        limPart(infTex(right), { before: `${lf}^{+}} f(x) =`, mistakes: oppositeInf(right) }),
        limPart(left === right ? infTex(left) : "dne", { before: `${lf}} f(x) =` }),
      ],
      hints: [
        `Al sustituir $x = ${a}$ sale $\\frac{${Na}}{0}$, que no es indeterminación. El resultado es infinito y hay que averiguar el signo de cada lado.`,
        "Factoriza el denominador y estudia el signo de cada factor un poco a la izquierda y un poco a la derecha del punto.",
      ],
      solution: steps,
    };
  },
};

const gradosDistintos: ExerciseGen = {
  id: "grados-distintos",
  title: "Cociente de polinomios de grados distintos",
  level: 2,
  generate: (r) => {
    const s = r.sign();
    const up = r.bool();
    const a = r.nz(-5, 5);
    const d = r.nz(-4, 4);
    let n: number, m: number;
    if (up) {
      m = r.int(1, 2);
      n = m + r.int(1, 2);
    } else {
      n = r.int(1, 2);
      m = n + r.int(1, 2);
    }
    const num = [a, ...Array.from({ length: n }, () => r.int(-5, 5))];
    const den = [d, ...Array.from({ length: m }, () => r.int(-5, 5))];
    if (den[m] === 0) den[m] = r.nz(-5, 5);
    let ans: string, sign = 0;
    if (up) {
      sign = Math.sign(a / d) * (s > 0 ? 1 : (-1) ** (n - m));
      ans = infTex(sign);
    } else ans = "0";
    return {
      statement: `Calcula $$${lim(atInf(s), dfrac(poly(num), poly(den)))}$$`,
      parts: [
        limPart(ans, {
          mistakes: [
            { answer: frac(a, d), feedback: "El cociente de coeficientes principales solo sale cuando los grados son iguales. Aquí no lo son." },
            ...(up ? oppositeInf(sign) : []),
          ],
        }),
      ],
      hints: [
        "Compara el grado del numerador con el del denominador.",
        up
          ? `Divide entre $x^{${m}}$, la mayor potencia del denominador. Arriba sobrevive un término $${a}x^{${n - m === 1 ? "" : n - m}}$ que crece sin control.`.replace("x^{}", "x")
          : `Divide entre $x^{${m}}$. Arriba todo tiende a $0$ y abajo queda $${d}$.`,
      ],
      solution: up
        ? [
            `El numerador tiene grado $${n}$ y el denominador grado $${m}$. Manda el numerador.`,
            `Para $x$ muy grande en valor absoluto, la fracción se comporta como $\\dfrac{${a}x^{${n}}}{${d}x^{${m}}} = ${frac(a, d)}\\,x^{${n - m}}$.`,
            `Con $x \\to ${atInf(s)}$, $x^{${n - m}} \\to ${s > 0 || (n - m) % 2 === 0 ? "+\\infty" : "-\\infty"}$, y al multiplicar por $${frac(a, d)}$ el límite es $${infWord(sign)}$.`,
          ]
        : [
            `El numerador tiene grado $${n}$ y el denominador grado $${m}$. Manda el denominador.`,
            `Dividiendo entre $x^{${m}}$, arriba todo tiende a $0$ y abajo queda $${d}$.`,
            "El límite es $0$.",
          ],
    };
  },
};

const raizSobreLineal: ExerciseGen = {
  id: "raiz-sobre-lineal",
  title: "Raíces en el infinito",
  level: 2,
  generate: (r) => {
    const A = r.int(1, 3);
    const b = r.int(-6, 6);
    const c = r.int(1, 9);
    const p = r.nz(-3, 3);
    const q = r.int(-5, 5);
    const s = r.sign();
    const inner = terms([[A * A, "x^{2}"], [b, "x"], [c, ""]]);
    const ans = (s * A) / p;
    return {
      statement: `Calcula $$${lim(atInf(s), dfrac(sq(inner), terms([[p, "x"], [q, ""]])))}$$`,
      parts: [
        limPart(frac(s * A, p), {
          mistakes: wrongNums(ans, [
            [-ans, s < 0 ? "Revisa el signo. Si $x \\to -\\infty$, entonces $\\sqrt{x^2} = |x| = -x$." : "Revisa el signo. Si $x \\to +\\infty$, $\\sqrt{x^2} = x$."],
            [(A * A) / p, "Olvidaste sacar la raíz del coeficiente principal."],
          ]),
        }),
      ],
      hints: [
        "Arriba el término que manda es $\\sqrt{" + (A * A === 1 ? "" : A * A) + "x^{2}} = " + (A === 1 ? "" : A) + "|x|$. Abajo manda el término en $x$.",
        "Cuando $x \\to -\\infty$, $|x| = -x$. Ese signo menos cambia el resultado.",
      ],
      solution: [
        `Sacamos $x^{2}$ de la raíz: $${sq(inner)} = |x|\\,${sq(`${A * A}${fracTerm(b, "x")}${fracTerm(c, "x^{2}")}`)}$.`,
        s > 0 ? "Como $x \\to +\\infty$, $|x| = x$." : "Como $x \\to -\\infty$, $|x| = -x$.",
        `Dividimos arriba y abajo entre $x$: queda $\\dfrac{${s > 0 ? "" : "-"}${sq(`${A * A} + \\dots`)}}{${p}${fracTerm(q, "x")}} \\to \\dfrac{${s > 0 ? "" : "-"}${A}}{${p}} = ${frac(s * A, p)}$.`,
      ],
    };
  },
};

const conjugadoBasico: ExerciseGen = {
  id: "conjugado-basico",
  title: "∞ − ∞ con el conjugado",
  level: 2,
  generate: (r) => {
    const A = r.pick([1, 1, 2, 3]);
    const b = r.nz(-8, 8);
    const c = A === 1 ? r.int(-5, 5) : 0;
    const inner = terms([[A * A, "x^{2}"], [b, "x"], [c, ""]]);
    const Ax = A === 1 ? "x" : `${A}x`;
    const ans = b / (2 * A);
    return {
      statement: `Calcula $$${lim("+\\infty", `\\left( ${sq(inner)} - ${Ax} \\right)`)}$$`,
      parts: [
        limPart(frac(b, 2 * A), {
          mistakes: wrongNums(ans, [
            [0, "$\\infty - \\infty$ no vale $0$. Es una indeterminación: hay que multiplicar por el conjugado."],
            [b / A, "Te faltó el $2$ del denominador: al final quedan dos raíces que suman."],
          ]),
        }),
      ],
      hints: [
        "Al sustituir sale $\\infty - \\infty$. Multiplica y divide por el conjugado $" + sq(inner) + " + " + Ax + "$.",
        "Arriba la raíz desaparece y se cancelan los términos en $x^2$. Después divide todo entre $x$.",
      ],
      solution: [
        `Multiplicamos y dividimos por $${sq(inner)} + ${Ax}$. Arriba queda $(${inner}) - ${A * A === 1 ? "" : A * A}x^{2} = ${terms([[b, "x"], [c, ""]])}$.`,
        `El límite queda $\\lim \\dfrac{${terms([[b, "x"], [c, ""]])}}{${sq(inner)} + ${Ax}}$. Dividimos entre $x$ (positivo).`,
        `Arriba tiende a $${b}$ y abajo a $${A} + ${A} = ${2 * A}$. El límite es $${frac(b, 2 * A)}$.`,
      ],
    };
  },
};

const jerarquia: ExerciseGen = {
  id: "jerarquia",
  title: "Quién crece más rápido",
  level: 2,
  generate: (r) => {
    const n = r.int(2, 6);
    const k = r.int(2, 5);
    const pool: { expr: string; ans: string; why: Rich }[] = [
      { expr: dfrac(`x^{${n}}`, "e^{x}"), ans: "0", why: `La exponencial le gana a cualquier potencia. Abajo crece mucho más rápido que $x^{${n}}$.` },
      { expr: dfrac("e^{x}", `x^{${n}}`), ans: INF, why: "La exponencial le gana a cualquier potencia. Arriba crece mucho más rápido." },
      { expr: dfrac("\\ln x", "x"), ans: "0", why: "Cualquier potencia positiva de $x$ le gana al logaritmo." },
      { expr: dfrac("\\ln x", "\\sqrt{x}"), ans: "0", why: "Incluso $\\sqrt{x} = x^{1/2}$ le gana al logaritmo." },
      { expr: dfrac(`x^{${n}}`, "\\ln x"), ans: INF, why: "La potencia le gana al logaritmo, y está arriba." },
      { expr: dfrac(`x^{${n}} + ${k}e^{x}`, "e^{x}"), ans: String(k), why: `Dividimos entre $e^{x}$: queda $\\frac{x^{${n}}}{e^{x}} + ${k}$, y el primer término tiende a $0$.` },
      { expr: dfrac(`${k}^{x} + x^{2}`, `${k}^{x} + 1`), ans: "1", why: `Dividimos entre $${k}^{x}$: queda $\\dfrac{1 + \\frac{x^{2}}{${k}^{x}}}{1 + \\frac{1}{${k}^{x}}} \\to \\dfrac{1 + 0}{1 + 0}$.` },
      { expr: dfrac(`2^{x} + x^{${n}}`, "3^{x}"), ans: "0", why: "Separamos: $\\left(\\frac{2}{3}\\right)^{x} \\to 0$ y $\\frac{x^n}{3^x} \\to 0$." },
      { expr: dfrac(`\\ln x + ${k}x`, "x"), ans: String(k), why: `Separamos: $\\frac{\\ln x}{x} \\to 0$ y $\\frac{${k}x}{x} = ${k}$.` },
    ];
    const c = r.pick(pool);
    return {
      statement: `Calcula $$${lim("+\\infty", c.expr)}$$`,
      parts: [limPart(c.ans)],
      hints: ["Jerarquía de crecimiento cuando $x \\to +\\infty$: $\\ln x \\ll x^p \\ll b^x$ con $b > 1$. El que crece más rápido manda."],
      solution: [c.why, `El límite es $${c.ans}$.`],
    };
  },
};

const conjugadoDesplazado: ExerciseGen = {
  id: "conjugado-desplazado",
  title: "∞ − ∞ con raíz y recta (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const v = r.pick(["x", "x", "k"]);
    const b = r.nz(-6, 6);
    const c = r.int(1, 9);
    const d = r.int(-6, 6);
    const s = v === "k" ? 1 : r.sign();
    const inner = terms([[1, `${v}^{2}`], [b, v], [c, ""]]);
    let expr: string, ansNum: number, steps: Rich[];
    if (s > 0) {
      expr = `\\left[ ${sq(inner)} - (${minus(v, -d)}) \\right]`;
      ansNum = b / 2 - d;
      const numer = terms([[b + 2 * d, v], [c - d * d, ""]]);
      steps = [
        `Al sustituir sale $\\infty - \\infty$. Multiplicamos y dividimos por $${sq(inner)} + (${minus(v, -d)})$.`,
        `Arriba: $(${inner}) - (${minus(v, -d)})^{2} = ${numer}$.`,
        `Dividimos arriba y abajo entre $${v}$: arriba tiende a $${b + 2 * d}$ y abajo a $1 + 1 = 2$.`,
        `El límite es $\\dfrac{${b + 2 * d}}{2} = ${frac(b - 2 * d, 2)}$.`,
      ];
    } else {
      expr = `\\left( ${sq(inner)} + x ${d === 0 ? "" : signed(d)} \\right)`.replace("  ", " ");
      ansNum = -b / 2 + d;
      steps = [
        "Con $x \\to -\\infty$, la raíz tiende a $+\\infty$ y $x$ a $-\\infty$: es $\\infty - \\infty$. Conviene cambiar $x = -t$ con $t \\to +\\infty$.",
        `Queda $\\lim_{t \\to +\\infty} \\left( ${sq(terms([[1, "t^{2}"], [-b, "t"], [c, ""]]))} - t ${d === 0 ? "" : signed(d)} \\right)$.`.replace("  ", " "),
        `Con el conjugado, $${sq(terms([[1, "t^{2}"], [-b, "t"], [c, ""]]))} - t \\to \\dfrac{${-b}}{2}$.`,
        `El límite es $${frac(-b, 2)} ${d === 0 ? "" : signed(d)} = ${frac(-b + 2 * d, 2)}$.`.replace("  ", " "),
      ];
    }
    return {
      statement: `Calcula $$${lim(atInf(s), expr, v)}$$`,
      parts: [
        limPart(fmt(ansNum), {
          mistakes: wrongNums(ansNum, [
            [0, "$\\infty - \\infty$ no vale $0$. Hay que multiplicar por el conjugado."],
            [s > 0 ? b / 2 : -b / 2, "Olvidaste el término independiente de la recta. Al elevar al cuadrado también aporta términos en $x$."],
            [-ansNum, "Revisa el signo. Con $x \\to -\\infty$ hay que cuidar que $\\sqrt{x^2} = -x$."],
          ]),
        }),
      ],
      hints: [
        "Es $\\infty - \\infty$. Multiplica y divide por el conjugado: la misma expresión con el signo del medio cambiado.",
        "Arriba se cancelan los términos de grado dos. Después divide entre la variable.",
        ...(s < 0 ? ["Para $x \\to -\\infty$ es más seguro cambiar $x = -t$ y trabajar con $t \\to +\\infty$."] : []),
      ],
      solution: steps,
    };
  },
};

const raicesMixtas: ExerciseGen = {
  id: "raices-mixtas",
  title: "Cociente con raíces de distinto índice (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const P = r.int(1, 3);
    const Q = r.int(1, 2);
    const R = r.int(1, 3);
    const D = r.int(1, 3);
    const al = r.nz(-5, 5);
    const be = r.nz(-6, 6);
    const s = r.sign();
    const t1 = sq(terms([[P * P, "x^{4}"], [al, "x"], [-1, ""]]));
    const t2 = `\\sqrt[3]{${terms([[Q ** 3, "x^{6}"], [be, "x"]])}}`;
    const t3 = sq(terms([[R * R, "x^{4}"], [1, ""]]));
    const den = `${t3} + ${D === 1 ? "" : D}x^{2}`;
    const ans = frac(P + Q, R + D);
    return {
      statement: `Calcula $$${lim(atInf(s), dfrac(`${t1} + ${t2}`, den))}$$`,
      parts: [
        limPart(ans, {
          mistakes: wrongNums((P + Q) / (R + D), [
            [(P * P + Q ** 3) / (R * R + D), "Olvidaste sacar las raíces de los coeficientes principales."],
            [0, "Los grados efectivos son iguales: arriba y abajo todo se comporta como $x^2$."],
          ]),
        }),
      ],
      hints: [
        "Busca el grado efectivo de cada término: $\\sqrt{x^4} = x^2$ y $\\sqrt[3]{x^6} = x^2$. Todo es de grado dos.",
        "Divide arriba y abajo entre $x^{2}$. Para meterlo en una raíz cuadrada se escribe como $\\sqrt{x^4}$ y en una cúbica como $\\sqrt[3]{x^6}$.",
      ],
      solution: [
        "Todos los términos se comportan como $x^{2}$, que es positivo tanto en $+\\infty$ como en $-\\infty$. Dividimos arriba y abajo entre $x^{2}$.",
        `Arriba: $\\sqrt{${P * P}${fracTerm(al, "x^{3}")} - \\frac{1}{x^{4}}} + \\sqrt[3]{${Q ** 3}${fracTerm(be, "x^{5}")}} \\to ${P} + ${Q}$.`,
        `Abajo: $\\sqrt{${R * R} + \\frac{1}{x^{4}}} + ${D} \\to ${R} + ${D}$.`,
        `El límite es $\\dfrac{${P + Q}}{${R + D}}${ans !== `\\frac{${P + Q}}{${R + D}}` ? ` = ${ans}` : ""}$.`,
      ],
    };
  },
};

const parametrosGrado: ExerciseGen = {
  id: "parametros-grado",
  title: "Parámetros para un límite al infinito (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const tpl = r.pick(["cubica", "cuadratica"] as const);
    const L = r.nz(-4, 5);
    const d = r.int(1, 3);
    const c = r.nz(-5, 5);
    const e = r.int(1, 6);
    const n = tpl === "cubica" ? 3 : 2;
    const num = tpl === "cubica" ? `ax^{3} + bx^{2} ${c < 0 ? "-" : "+"} ${coef(Math.abs(c), "x")} + 1` : `ax^{2} + bx ${signed(c)}`;
    const den = tpl === "cubica" ? terms([[d, "x^{2}"], [e, ""]]) : terms([[d, "x"], [e, ""]]);
    const b = L * d;
    return {
      statement: `Sea $f(x) = ${dfrac(num, den)}$. Halla $a$ y $b$ para que $\\lim_{x \\to +\\infty} f(x) = ${L}$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Valor de $a$.", answer: "0", before: "a =", mistakes: [{ answer: String(L * d), feedback: `Si $a \\ne 0$ el numerador tendría grado $${n}$, mayor que el del denominador, y el límite sería infinito.` }] },
        { kind: "expr", prompt: "Valor de $b$.", answer: String(b), before: "b =", mistakes: [{ answer: frac(L, d), feedback: `El límite es $\\frac{b}{${d}}$. Para que valga $${L}$ hay que multiplicar, no dividir.` }].filter((m) => m.answer !== String(b)) },
        limPart(String(L), { prompt: "Con esos valores, ¿cuánto vale el límite cuando $x \\to -\\infty$?", before: "\\lim_{x \\to -\\infty} f(x) =" }),
      ],
      hints: [
        "Un límite al infinito finito y distinto de cero solo sale si el numerador y el denominador tienen el mismo grado.",
        `El denominador tiene grado $${n - 1}$. El término de grado $${n}$ del numerador tiene que desaparecer.`,
        "Con grados iguales, el límite es el cociente de los coeficientes principales.",
      ],
      solution: [
        `Si $a \\ne 0$, el numerador tiene grado $${n}$ y el denominador grado $${n - 1}$: el límite sería $\\pm\\infty$. Por eso $a = 0$.`,
        `Con $a = 0$ los dos tienen grado $${n - 1}$ y el límite es ${d === 1 ? "$b$" : `$\\dfrac{b}{${d}}$`}. Igualamos: ${d === 1 ? `$b = ${L}$` : `$\\dfrac{b}{${d}} = ${L}$, así que $b = ${b}$`}.`,
        `Con grados iguales el límite no depende del signo de $x$: cuando $x \\to -\\infty$ también vale $${L}$.`,
      ],
    };
  },
};

const cubicaDiferencia: ExerciseGen = {
  id: "cubica-diferencia",
  title: "∞ − ∞ con raíces cúbicas (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const tpl = r.pick(["dos", "una", "cuadrados"] as const);
    const s = r.sign();
    let expr: string, ans: string, steps: Rich[];
    if (tpl === "dos") {
      const al = r.int(-3, 3);
      let ga = r.int(-3, 3);
      if (ga === al) ga = al === 3 ? -2 : al + 1;
      const be = r.int(-5, 5);
      const de = r.int(-5, 5);
      const A = terms([[1, "x^{3}"], [al, "x^{2}"], [be, ""]]);
      const B = terms([[1, "x^{3}"], [ga, "x^{2}"], [de, ""]]);
      expr = `\\left( \\sqrt[3]{${A}} - \\sqrt[3]{${B}} \\right)`;
      ans = frac(al - ga, 3);
      steps = [
        "Es $\\infty - \\infty$. Con raíces cúbicas se usa $u - v = \\dfrac{u^{3} - v^{3}}{u^{2} + uv + v^{2}}$.",
        `Con $u = \\sqrt[3]{${A}}$ y $v = \\sqrt[3]{${B}}$: $u^{3} - v^{3} = ${terms([[al - ga, "x^{2}"], [be - de, ""]])}$.`,
        "Abajo, cada uno de los tres términos $u^{2}$, $uv$, $v^{2}$ se comporta como $x^{2}$. En total, como $3x^{2}$.",
        `Dividimos entre $x^{2}$: el límite es $\\dfrac{${al - ga}}{3}${frac(al - ga, 3) === `\\frac{${al - ga}}{3}` ? "" : ` = ${ans}`}$.`,
      ];
    } else if (tpl === "una") {
      const p = r.nz(-6, 6);
      const A = terms([[1, "x^{3}"], [p, "x^{2}"]]);
      expr = `\\left( \\sqrt[3]{${A}} - x \\right)`;
      ans = frac(p, 3);
      steps = [
        "Es $\\infty - \\infty$. Usamos $u - v = \\dfrac{u^{3} - v^{3}}{u^{2} + uv + v^{2}}$ con $u = \\sqrt[3]{" + A + "}$ y $v = x$.",
        `Arriba: $u^{3} - v^{3} = ${A} - x^{3} = ${p}x^{2}$.`,
        "Abajo: $u^{2} + uv + v^{2}$ se comporta como $3x^{2}$.",
        `El límite es $\\dfrac{${p}}{3}${frac(p, 3) === `\\frac{${p}}{3}` ? "" : ` = ${ans}`}$.`,
      ];
    } else {
      const m = r.int(1, 2);
      expr = `\\left( \\sqrt[3]{(x + ${m})^{2}} - \\sqrt[3]{(x - ${m})^{2}} \\right)`;
      ans = "0";
      steps = [
        "Es $\\infty - \\infty$. Con $u = \\sqrt[3]{(x + " + m + ")^{2}}$ y $v = \\sqrt[3]{(x - " + m + ")^{2}}$ usamos $u - v = \\dfrac{u^{3} - v^{3}}{u^{2} + uv + v^{2}}$.",
        `Arriba: $(x + ${m})^{2} - (x - ${m})^{2} = ${4 * m}x$, de grado uno.`,
        "Abajo, cada término se comporta como $\\sqrt[3]{x^{4}} = x^{4/3}$, de grado mayor que uno.",
        "El denominador crece más rápido, así que el límite es $0$.",
      ];
    }
    return {
      statement: `Calcula $$${lim(atInf(s), expr)}$$`,
      parts: [limPart(ans, { mistakes: ans === "0" ? [] : [{ answer: "0", feedback: "$\\infty - \\infty$ no vale $0$. Usa la factorización de la diferencia de cubos." }] })],
      hints: [
        "El conjugado de las raíces cuadradas no sirve con raíces cúbicas. Usa $u^{3} - v^{3} = (u - v)(u^{2} + uv + v^{2})$.",
        "Multiplica y divide por $u^{2} + uv + v^{2}$. Arriba quedará $u^{3} - v^{3}$, sin raíces.",
      ],
      solution: steps,
    };
  },
};

const ahGradosUbicar: ExerciseGen = {
  id: "ah-grados-ubicar",
  title: "Ubicar la recta a la que se pega la gráfica",
  level: 1,
  generate: (r) => {
    const igual = r.bool(0.65);
    const d = r.pick([1, 1, 2, 3]);
    const k = r.int(1, 4);
    const b = igual ? r.int(-3, 3) : r.nz(-3, 3);
    let c = r.int(-3, 3);
    if (b === 0 && c === 0) c = r.nz(-3, 3);
    const L = igual ? r.nz(-4, 4) : 0;
    // f(x) = L + (bx + c)/(d(x^2 + k))
    const num = igual ? [L * d, b, c + L * d * k] : [b, c];
    const den = [d, 0, d * k];
    const fTex = dfrac(poly(num), poly(den));
    return {
      statement: `Cuando $x \\to \\pm\\infty$, la gráfica de $f(x) = ${fTex}$ se pega a una recta horizontal. Calcula $${lim("\\pm\\infty", "f(x)")}$ y arrastra la recta hasta esa altura.`,
      parts: [
        {
          kind: "place",
          graph: { x: [-8, 8], y: [-8, 8], height: 280 },
          items: [{ type: "hline", label: "y = L", answer: L }],
          reveal: [{ fn: `\\frac{${poly(num)}}{${poly(den)}}`, color: "accent" }],
        },
      ],
      hints: [
        "Compara el grado del numerador con el del denominador.",
        igual ? "Con grados iguales, divide todo entre $x^{2}$: quedan los coeficientes principales." : "Si el denominador tiene mayor grado, la fracción se hace cada vez más pequeña.",
      ],
      solution: igual
        ? [
            "Numerador y denominador tienen grado 2. Dividimos todo entre $x^{2}$ y los términos con $x$ abajo tienden a $0$.",
            `Queda $\\dfrac{${L * d}}{${d}} = ${L}$. La recta es $y = ${L}$, igual hacia los dos lados.`,
            "Al acertar aparece la curva. Cerca del origen puede cruzar la recta, pero lejos se pega a ella.",
          ]
        : [
            `El numerador tiene grado ${b === 0 ? 0 : 1} y el denominador grado 2. Manda el denominador.`,
            "Dividiendo entre $x^{2}$, arriba todo tiende a $0$ y abajo queda un número distinto de cero. El límite es $0$ y la recta es $y = 0$, el eje $x$.",
          ],
    };
  },
};

const signosKCero: ExerciseGen = {
  id: "signos-k-cero",
  title: "Tabla de signos para decidir +∞ o −∞",
  level: 2,
  generate: (r) => {
    const cuadrado = r.bool(0.35);
    const a = r.int(-4, 4);
    let p: number;
    do p = r.int(-5, 5); while (p === a);
    const flip = r.bool();
    const numTex = flip ? (p === 0 ? "-x" : `${p} - x`) : minus("x", p);
    const denTex = cuadrado ? sqDen(a) : minus("x", a);
    const numS = (x: number) => (flip ? Math.sign(p - x) : Math.sign(x - p));
    const denS = (x: number) => (cuadrado ? 1 : Math.sign(x - a));
    const pts = [p, a].sort((u, v) => u - v);
    const probe = [pts[0] - 1, (pts[0] + pts[1]) / 2, pts[1] + 1];
    const row = (f: (x: number) => number) => probe.map((x) => (f(x) > 0 ? 1 : -1) as 1 | -1);
    const sN = row(numS);
    const sD = row(denS);
    const sQ = sN.map((s, j) => (s * sD[j]) as 1 | -1);
    const ia = pts.indexOf(a);
    const left = sQ[ia];
    const right = sQ[ia + 1];
    const Na = flip ? p - a : a - p;
    return {
      statement: `Sea $$f(x) = ${dfrac(numTex, denTex)}$$ Al sustituir $x = ${a}$ sale $\\frac{${Na}}{0}$, así que $f$ se dispara cerca de $${a}$. Usa una tabla de signos para decidir hacia dónde va a cada lado.`,
      sequential: true,
      parts: [
        {
          kind: "signs",
          prompt: "Completa la tabla de signos.",
          points: pts.map(String),
          rows: [
            { label: numTex, signs: sN },
            { label: denTex, signs: sD },
            { label: `\\frac{${numTex}}{${denTex}}`, signs: sQ },
          ],
        },
        limPart(infTex(left), { before: `\\lim_{x \\to ${sideTex(a, -1)}} f(x) =`, mistakes: oppositeInf(left) }),
        limPart(infTex(right), { before: `\\lim_{x \\to ${sideTex(a, 1)}} f(x) =`, mistakes: oppositeInf(right) }),
        limPart(left === right ? infTex(left) : "dne", { before: `\\lim_{x \\to ${a}} f(x) =` }),
      ],
      hints: [
        `Los puntos críticos son el cero del numerador, $x = ${p}$, y el del denominador, $x = ${a}$.`,
        "En cada intervalo prueba con un número cualquiera y mira el signo de cada factor.",
        `El límite por la izquierda de $${a}$ toma el signo del intervalo que termina en $${a}$. El de la derecha, el del intervalo que empieza en $${a}$.`,
      ],
      solution: [
        `Puntos críticos: $x = ${pts[0]}$ y $x = ${pts[1]}$. El numerador $${numTex}$ es ${flip ? "positivo a la izquierda de su raíz y negativo a la derecha" : "negativo a la izquierda de su raíz y positivo a la derecha"}. ${cuadrado ? `El denominador $${denTex}$ es un cuadrado: positivo a los dos lados de $${a}$.` : `El denominador $${denTex}$ es negativo a la izquierda de $${a}$ y positivo a la derecha.`}`,
        `Multiplicando los signos de cada columna, el cociente es $${sQ.map((s) => (s > 0 ? "+" : "-")).join("\\;")}$ en los tres intervalos.`,
        `Justo a la izquierda de $${a}$ el cociente es ${left > 0 ? "positivo" : "negativo"} y su tamaño crece sin control: $\\lim_{x \\to ${sideTex(a, -1)}} f(x) = ${infWord(left)}$. Justo a la derecha es ${right > 0 ? "positivo" : "negativo"}: $\\lim_{x \\to ${sideTex(a, 1)}} f(x) = ${infWord(right)}$.`,
        left === right ? `Los dos lados coinciden, así que $\\lim_{x \\to ${a}} f(x) = ${infWord(left)}$.` : "Los laterales tienen signos distintos, así que el límite no existe.",
      ],
    };
  },
};

const ahDosLadosUbicar: ExerciseGen = {
  id: "ah-dos-lados-ubicar",
  title: "Una asíntota horizontal distinta a cada lado (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const tpl = r.pick(["raiz", "raiz", "exp"] as const);
    let fTex: string, fn: string, R: number, Lf: number, steps: Rich[], hints: Rich[];
    if (tpl === "raiz") {
      const A = r.pick([1, 1, 2]);
      const m = r.nz(-3, 3);
      const p = A * m;
      const q = r.int(-4, 4);
      const k = r.pick([1, 4, 9]);
      const inner = terms([[A * A, "x^{2}"], [k, ""]]);
      const N = terms([[p, "x"], [q, ""]]);
      fTex = dfrac(N, sq(inner));
      fn = `\\frac{${N}}{\\sqrt{${inner}}}`;
      R = m;
      Lf = -m;
      hints = [
        `Saca $x^{2}$ de la raíz: $${sq(inner)} = |x|\\,${sq(`${A * A}${fracTerm(k, "x^{2}")}`)}$.`,
        "Para $x < 0$, $|x| = -x$. Ese signo cambia el resultado por la izquierda.",
      ];
      steps = [
        `$${sq(inner)} = |x|\\,${sq(`${A * A}${fracTerm(k, "x^{2}")}`)}$, y la raíz que queda tiende a $${A}$.`,
        `Si $x \\to +\\infty$, $|x| = x$: $f(x) = \\dfrac{${p}${fracTerm(q, "x")}}{${sq(`${A * A}${fracTerm(k, "x^{2}")}`)}} \\to \\dfrac{${p}}{${A}} = ${R}$. Asíntota $y = ${R}$.`,
        `Si $x \\to -\\infty$, $|x| = -x$ y el cociente cambia de signo: tiende a $${Lf}$. Asíntota $y = ${Lf}$.`,
      ];
    } else {
      let p: number, q: number;
      do {
        p = r.int(-4, 4);
        q = r.int(-4, 4);
      } while (p === q);
      const ex = r.pick(["e^{x}", "e^{2x}"]);
      const N = terms([[p, ex], [q, ""]]);
      fTex = dfrac(N, `${ex} + 1`);
      fn = `\\frac{${N}}{${ex} + 1}`;
      R = p;
      Lf = q;
      hints = [
        `Recuerda que $${ex} \\to +\\infty$ si $x \\to +\\infty$ y $${ex} \\to 0$ si $x \\to -\\infty$.`,
        `Por la derecha, divide numerador y denominador entre $${ex}$.`,
      ];
      steps = [
        `Por la derecha dividimos entre $${ex}$: $\\dfrac{${p}${fracTerm(q, ex)}}{1 + \\frac{1}{${ex}}} \\to ${p}$. Asíntota $y = ${p}$.`,
        `Por la izquierda $${ex} \\to 0$: queda $\\dfrac{${p} \\cdot 0 ${signed(q)}}{0 + 1} = ${q}$. Asíntota $y = ${q}$.`,
      ];
    }
    return {
      statement: `Determina las asíntotas horizontales de $f(x) = ${fTex}$, una hacia cada lado, y arrastra cada recta hasta su altura.`,
      parts: [
        {
          kind: "place",
          graph: { x: [-8, 8], y: [-6, 6], height: 280 },
          items: [
            { type: "hline", label: "x \\to +\\infty", answer: R, start: 5 },
            { type: "hline", label: "x \\to -\\infty", answer: Lf, start: -5 },
          ],
          reveal: [{ fn, color: "accent" }],
        },
      ],
      hints,
      solution: [...steps, "Una función puede tener una asíntota horizontal distinta a cada lado. Al acertar se ve la curva pegándose a cada recta por su lado."],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("limites-infinito"),
  objectives: [
    "Calcular límites de la forma k/0 estudiando el signo del denominador.",
    "Calcular límites al infinito de polinomios y de cocientes de polinomios comparando grados.",
    "Resolver ∞/∞ y ∞ − ∞, también con raíces y con x → −∞.",
    "Comparar el crecimiento de logaritmos, potencias y exponenciales.",
  ],
  sections: [
    {
      id: "limites-infinitos",
      title: "Límites infinitos",
      blocks: [
        {
          type: "text",
          md: "Mira $f(x) = \\dfrac{1}{x^2}$ cerca de $0$. Con $x = 0{,}1$ vale $100$, con $x = 0{,}01$ vale $10\\,000$ y con $x = 0{,}001$ vale un millón. Mientras más cerca de cero, más grande. Y pasa por los dos lados, porque el cuadrado siempre es positivo. Eso se escribe\n\n$$\\lim_{x \\to 0} \\frac{1}{x^2} = +\\infty$$",
        },
        {
          type: "definition",
          title: "Límite infinito",
          md: "$\\lim_{x \\to a} f(x) = +\\infty$ significa que $f(x)$ supera cualquier número, por grande que sea, cuando $x$ está suficientemente cerca de $a$. Con $-\\infty$, $f(x)$ baja de cualquier número.\n\nEn rigor el límite no existe como número real. Escribir $+\\infty$ describe **cómo** no existe. En los ejercicios, si un lado da $+\\infty$ y el otro $-\\infty$, la respuesta es \"no existe\".",
        },
        {
          type: "widget",
          widget: { kind: "limit", fn: "\\frac{1}{x-2}", a: 2, x: [-1, 5], y: [-10, 10], breaks: [2] },
          caption: "$\\frac{1}{x-2}$: por la derecha de $2$ sube sin control y por la izquierda baja sin control.",
        },
        {
          type: "text",
          md: "Cuando al sustituir sale $\\frac{k}{0}$ con $k \\ne 0$, el límite es infinito. Lo único que hay que averiguar es el **signo**, y eso depende de si el denominador se acerca a cero con valores positivos ($0^+$) o negativos ($0^-$).",
        },
        {
          type: "table",
          headers: ["Forma", "Resultado"],
          rows: [
            ["$\\dfrac{k}{0^+}$ con $k > 0$", "$+\\infty$"],
            ["$\\dfrac{k}{0^-}$ con $k > 0$", "$-\\infty$"],
            ["$\\dfrac{k}{0^+}$ con $k < 0$", "$-\\infty$"],
            ["$\\dfrac{k}{0^-}$ con $k < 0$", "$+\\infty$"],
          ],
          caption: "Es la ley de los signos de siempre.",
        },
        {
          type: "example",
          title: "Análisis de signo",
          problem: "Calcula $\\lim_{x \\to 2^+} \\dfrac{x + 1}{x - 2}$ y $\\lim_{x \\to 2^-} \\dfrac{x + 1}{x - 2}$.",
          steps: [
            "El numerador tiende a $3$, positivo. El denominador tiende a $0$.",
            "Si $x \\to 2^+$, por ejemplo $x = 2{,}01$, el denominador es $0{,}01 > 0$. Queda $\\frac{3}{0^+} = +\\infty$.",
            "Si $x \\to 2^-$, por ejemplo $x = 1{,}99$, el denominador es $-0{,}01 < 0$. Queda $\\frac{3}{0^-} = -\\infty$.",
            "Como los laterales son distintos, $\\lim_{x \\to 2} \\frac{x + 1}{x - 2}$ no existe.",
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "No escribas k/0 = ∞ sin mirar el signo",
          md: "El resultado $\\frac{5}{0}$ no basta. Hay que decir de qué lado viene el cero. Un truco rápido: evalúa el denominador en un número muy cercano al punto, del lado que te piden, y mira su signo.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $$\\lim_{x \\to 1} \\dfrac{-3}{(x - 1)^2}$$",
            parts: [limPart(NINF, { mistakes: [{ answer: INF, feedback: "El denominador es positivo, pero el numerador es negativo." }] })],
            solution: ["El denominador es un cuadrado: tiende a $0^+$ por los dos lados. Queda $\\frac{-3}{0^+} = -\\infty$ por ambos lados."],
          },
        },
        {
          type: "text",
          md: "Cuando hay varios factores, una **tabla de signos** ordena el trabajo: marcas los ceros del numerador y del denominador, miras el signo de cada factor en cada intervalo y multiplicas por columnas. El signo del cociente justo a cada lado del punto es el signo del infinito.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Sea $f(x) = \\dfrac{x - 3}{x + 1}$. Completa la tabla de signos y decide hacia dónde va $f$ a cada lado de $x = -1$.",
            sequential: true,
            parts: [
              {
                kind: "signs",
                points: ["-1", "3"],
                rows: [
                  { label: "x - 3", signs: [-1, -1, 1] },
                  { label: "x + 1", signs: [-1, 1, 1] },
                  { label: "\\frac{x-3}{x+1}", signs: [1, -1, 1] },
                ],
              },
              limPart(INF, { before: "\\lim_{x \\to -1^{-}} f(x) =", mistakes: oppositeInf(1) }),
              limPart(NINF, { before: "\\lim_{x \\to -1^{+}} f(x) =", mistakes: oppositeInf(-1) }),
            ],
            hints: ["Prueba con $x = -2$, $x = 0$ y $x = 4$, uno en cada intervalo."],
            solution: [
              "$x - 3$ es negativo antes de $3$ y positivo después. $x + 1$ es negativo antes de $-1$ y positivo después.",
              "El cociente queda $+$, $-$, $+$. Justo a la izquierda de $-1$ es positivo, así que $f \\to +\\infty$. Justo a la derecha es negativo, así que $f \\to -\\infty$.",
            ],
          },
        },
      ],
    },
    {
      id: "al-infinito",
      title: "Límites al infinito",
      blocks: [
        {
          type: "text",
          md: "Ahora la pregunta cambia: ¿qué le pasa a $f(x)$ cuando $x$ crece sin parar ($x \\to +\\infty$) o decrece sin parar ($x \\to -\\infty$)? El caso básico es $\\frac{1}{x}$: con $x = 1000$ vale $0{,}001$, con $x = 1\\,000\\,000$ vale $0{,}000001$. Se acerca a $0$.\n\n$$\\lim_{x \\to \\pm\\infty} \\frac{k}{x^n} = 0 \\quad (n > 0)$$",
        },
        {
          type: "text",
          md: "En un polinomio, cuando $x$ es enorme, el término de mayor grado aplasta a los demás. Por ejemplo, con $x = 1000$, en $x^3 - 100x^2$ el primer término vale mil millones y el segundo cien millones. Sacando factor común se ve claro:\n\n$$x^3 - 100x^2 = x^3\\left(1 - \\frac{100}{x}\\right)$$\n\ny el paréntesis tiende a $1$. **Un polinomio en el infinito se comporta como su término de mayor grado.**",
        },
        {
          type: "example",
          title: "Polinomios hacia menos infinito",
          problem: "Calcula $\\lim_{x \\to -\\infty} (2x^3 - 5x^2 + 1)$ y $\\lim_{x \\to -\\infty} (-x^4 + 3x)$.",
          steps: [
            "El primero se comporta como $2x^3$. Con $x$ muy negativo, $x^3$ es muy negativo y $2x^3 \\to -\\infty$.",
            "El segundo se comporta como $-x^4$. Con $x$ muy negativo, $x^4$ es muy positivo (exponente par) y $-x^4 \\to -\\infty$.",
          ],
          answer: "Los dos límites valen $-\\infty$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $$\\lim_{x \\to +\\infty} (x^2 - 7x)$$",
            parts: [limPart(INF, { mistakes: [{ answer: "0", feedback: "$\\infty - \\infty$ no es $0$. Saca factor común $x^2$." }] })],
            solution: ["Parece $\\infty - \\infty$, pero $x^2 - 7x = x^2\\left(1 - \\frac{7}{x}\\right)$ y el paréntesis tiende a $1$. El límite es $+\\infty$."],
          },
        },
      ],
    },
    {
      id: "racionales",
      title: "Cocientes de polinomios: ∞/∞",
      blocks: [
        {
          type: "text",
          md: "En $\\dfrac{3x^2 - x}{2x^2 + 5}$, con $x \\to \\infty$ el numerador y el denominador crecen sin control. Sale $\\frac{\\infty}{\\infty}$, que es indeterminación. La técnica es **dividir numerador y denominador entre la mayor potencia del denominador**. Así los términos pequeños se convierten en fracciones que tienden a cero.",
        },
        {
          type: "example",
          title: "Mismo grado",
          problem: "Calcula $\\lim_{x \\to \\infty} \\dfrac{3x^2 - x}{2x^2 + 5}$.",
          steps: [
            "Dividimos todo entre $x^2$: $\\dfrac{3 - \\frac{1}{x}}{2 + \\frac{5}{x^2}}$.",
            "Las fracciones con $x$ abajo tienden a $0$: queda $\\dfrac{3}{2}$.",
          ],
          answer: "$\\dfrac{3}{2}$",
        },
        {
          type: "example",
          title: "Grados distintos",
          problem: "Calcula $\\lim_{x \\to \\infty} \\dfrac{4x + 1}{x^2 - 3}$ y $\\lim_{x \\to -\\infty} \\dfrac{x^3 + 1}{2x - 1}$.",
          steps: [
            "En el primero, dividiendo entre $x^2$: $\\dfrac{\\frac{4}{x} + \\frac{1}{x^2}}{1 - \\frac{3}{x^2}} \\to \\dfrac{0}{1} = 0$.",
            "En el segundo, la fracción se comporta como $\\dfrac{x^3}{2x} = \\dfrac{x^2}{2}$, que con $x \\to -\\infty$ tiende a $+\\infty$.",
          ],
          answer: "$0$ y $+\\infty$",
        },
        {
          type: "table",
          headers: ["Grados", "Límite de $\\frac{P(x)}{Q(x)}$ en $\\pm\\infty$"],
          rows: [
            ["grado $P$ < grado $Q$", "$0$"],
            ["grado $P$ = grado $Q$", "cociente de los coeficientes principales"],
            ["grado $P$ > grado $Q$", "$+\\infty$ o $-\\infty$, según los signos"],
          ],
        },
        {
          type: "note",
          tone: "econ",
          title: "Costo promedio a largo plazo",
          md: "Supón que una fábrica tiene costo $C(q) = 5000 + 20q$: $5000$ fijos y $20$ por unidad. El costo promedio es\n\n$$\\frac{C(q)}{q} = \\frac{5000 + 20q}{q}$$\n\nCuando $q \\to \\infty$ es un cociente de grados iguales y tiende a $20$. Al producir mucho, el costo fijo se reparte entre tantas unidades que casi no pesa, y cada unidad cuesta en promedio lo mismo que su costo variable, $20$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $$\\lim_{x \\to +\\infty} \\dfrac{5x^3 - 2}{1 - 2x^3}$$",
            parts: [limPart("-\\frac{5}{2}", { mistakes: [{ answer: "-2", feedback: "Dividiste los términos independientes. Al infinito mandan los de mayor grado." }] })],
            solution: ["Mismo grado: el límite es el cociente de los coeficientes de $x^3$, $\\frac{5}{-2} = -\\frac{5}{2}$."],
          },
        },
        {
          type: "quick",
          exercise: {
            statement: "Lejos del origen, la gráfica de $f(x) = \\dfrac{4x^{2} + x}{x^{2} + 1}$ se pega a una recta horizontal. Calcula el límite en $\\pm\\infty$ y arrastra la recta hasta esa altura.",
            parts: [
              {
                kind: "place",
                graph: { x: [-8, 8], y: [-3, 7], height: 260 },
                items: [{ type: "hline", label: "y = L", answer: 4, start: 1 }],
                reveal: [{ fn: "\\frac{4x^{2}+x}{x^{2}+1}", color: "accent" }],
              },
            ],
            hints: ["Grados iguales: mandan los coeficientes de $x^{2}$."],
            solution: ["Dividiendo entre $x^{2}$ queda $\\dfrac{4 + \\frac{1}{x}}{1 + \\frac{1}{x^{2}}} \\to 4$. La recta es $y = 4$."],
          },
        },
      ],
    },
    {
      id: "raices",
      title: "Raíces en el infinito",
      blocks: [
        {
          type: "text",
          md: "Con raíces la idea es la misma: buscar el término que manda. Pero hay una trampa. Para meter una $x$ dentro de una raíz cuadrada se usa $\\sqrt{x^2} = |x|$, **no** $x$. Cuando $x \\to +\\infty$ da lo mismo, pero cuando $x \\to -\\infty$ resulta $|x| = -x$, y ese signo menos cambia el resultado.",
        },
        {
          type: "example",
          title: "Los dos infinitos dan distinto",
          problem: "Calcula $\\lim_{x \\to \\pm\\infty} \\dfrac{\\sqrt{4x^2 + 1}}{x + 3}$.",
          steps: [
            "Arriba: $\\sqrt{4x^2 + 1} = |x|\\sqrt{4 + \\frac{1}{x^2}}$.",
            "Si $x \\to +\\infty$, $|x| = x$ y queda $\\dfrac{x\\sqrt{4 + \\frac{1}{x^2}}}{x\\left(1 + \\frac{3}{x}\\right)} \\to \\dfrac{2}{1} = 2$.",
            "Si $x \\to -\\infty$, $|x| = -x$ y queda $\\dfrac{-x\\sqrt{4 + \\frac{1}{x^2}}}{x\\left(1 + \\frac{3}{x}\\right)} \\to -2$.",
          ],
          answer: "$2$ cuando $x \\to +\\infty$ y $-2$ cuando $x \\to -\\infty$.",
        },
        {
          type: "example",
          title: "Raíces de distinto índice (salió en parciales)",
          problem: "Calcula $\\lim_{x \\to \\infty} \\dfrac{\\sqrt{7x^4 + 2x - 1} + \\sqrt[3]{2x^6 + 5x}}{\\sqrt{2x^4 + 1} + 2x^2}$.",
          steps: [
            "Grado efectivo de cada término: $\\sqrt{x^4} = x^2$ y $\\sqrt[3]{x^6} = x^2$. Todo es de grado dos.",
            "Dividimos entre $x^2$, que dentro de la raíz cuadrada es $\\sqrt{x^4}$ y dentro de la cúbica es $\\sqrt[3]{x^6}$.",
            "Arriba: $\\sqrt{7 + \\frac{2}{x^3} - \\frac{1}{x^4}} + \\sqrt[3]{2 + \\frac{5}{x^5}} \\to \\sqrt{7} + \\sqrt[3]{2}$.",
            "Abajo: $\\sqrt{2 + \\frac{1}{x^4}} + 2 \\to \\sqrt{2} + 2$.",
          ],
          answer: "$\\dfrac{\\sqrt{7} + \\sqrt[3]{2}}{\\sqrt{2} + 2}$",
        },
        {
          type: "note",
          tone: "warning",
          title: "El error clásico",
          md: "Escribir $\\sqrt{x^2} = x$ cuando $x \\to -\\infty$. Si haces la cuenta así, te sale el resultado con el signo cambiado. Con raíces de índice impar no hay problema: $\\sqrt[3]{x^3} = x$ siempre.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $$\\lim_{x \\to -\\infty} \\dfrac{\\sqrt{9x^2 + x}}{3x - 1}$$",
            parts: [limPart("-1", { mistakes: [{ answer: "1", feedback: "Con $x \\to -\\infty$, $\\sqrt{x^2} = -x$. Falta un signo menos." }] })],
            solution: ["Arriba se comporta como $3|x| = -3x$ y abajo como $3x$. El cociente tiende a $-1$."],
          },
        },
      ],
    },
    {
      id: "infinito-menos-infinito",
      title: "La indeterminación ∞ − ∞",
      blocks: [
        {
          type: "text",
          md: "En $\\sqrt{x^2 + 3x} - x$ con $x \\to \\infty$ los dos términos crecen sin control y se restan. No se puede saber a simple vista quién gana, y de hecho la diferencia se estabiliza en un número. Cuando hay una raíz cuadrada, el método es el **conjugado**, igual que en $\\frac{0}{0}$:\n\n$$\\sqrt{A} - B = \\frac{A - B^2}{\\sqrt{A} + B}$$",
        },
        {
          type: "example",
          title: "Conjugado",
          problem: "Calcula $\\lim_{x \\to \\infty} \\left( \\sqrt{x^2 + 3x} - x \\right)$.",
          steps: [
            "Multiplicamos y dividimos por $\\sqrt{x^2 + 3x} + x$. Arriba queda $x^2 + 3x - x^2 = 3x$.",
            "El límite es $\\lim \\dfrac{3x}{\\sqrt{x^2 + 3x} + x}$. Dividimos entre $x$: $\\dfrac{3}{\\sqrt{1 + \\frac{3}{x}} + 1}$.",
            "Tiende a $\\dfrac{3}{1 + 1} = \\dfrac{3}{2}$.",
          ],
          answer: "$\\dfrac{3}{2}$",
        },
        {
          type: "example",
          title: "Tipo parcial",
          problem: "Calcula $\\lim_{k \\to +\\infty} \\left[ \\sqrt{k^2 + k + 2} - (k - 5) \\right]$.",
          steps: [
            "Multiplicamos por el conjugado. Arriba queda\n\n$$k^2 + k + 2 - (k - 5)^2 = 11k - 23$$",
            "Abajo queda $\\sqrt{k^2 + k + 2} + k - 5$. Dividimos todo entre $k$.",
            "Arriba tiende a $11$ y abajo a $1 + 1 = 2$.",
          ],
          answer: "$\\dfrac{11}{2}$",
        },
        {
          type: "example",
          title: "Con raíces cúbicas",
          problem: "Calcula $\\lim_{x \\to +\\infty} \\left( \\sqrt[3]{x^3 + 1} - \\sqrt[3]{x^3 - x^2 + 1} \\right)$.",
          steps: [
            "Con cubos se usa\n\n$$u - v = \\dfrac{u^3 - v^3}{u^2 + uv + v^2}$$",
            "Arriba: $(x^3 + 1) - (x^3 - x^2 + 1) = x^2$.",
            "Abajo, cada uno de los tres términos se comporta como $x^2$: en total, $3x^2$.",
          ],
          answer: "$\\dfrac{1}{3}$",
        },
        {
          type: "note",
          tone: "warning",
          title: "∞ − ∞ no es cero",
          md: "Igual que $\\frac{0}{0}$, la forma $\\infty - \\infty$ puede terminar en cualquier cosa. Cuando $x \\to +\\infty$:\n\n- $(x + 5) - x \\to 5$\n- $x^2 - x \\to +\\infty$\n- $x - x^2 \\to -\\infty$\n\nSi no hay raíces, saca factor común la mayor potencia. Si hay raíces, usa el conjugado.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $$\\lim_{x \\to +\\infty} \\left( \\sqrt{x^2 + 8x} - x \\right)$$",
            parts: [limPart("4", { mistakes: [{ answer: "0", feedback: "$\\infty - \\infty$ no vale $0$. Usa el conjugado." }, { answer: "8", feedback: "Te faltó dividir entre $2$: abajo quedan dos términos que tienden a $1$." }] })],
            solution: ["Con el conjugado: $\\dfrac{8x}{\\sqrt{x^2 + 8x} + x} \\to \\dfrac{8}{2} = 4$."],
          },
        },
      ],
    },
    {
      id: "exp-log",
      title: "Exponenciales, logaritmos y jerarquía",
      blocks: [
        {
          type: "text",
          md: "Las exponenciales y los logaritmos tienen límites que conviene saber de memoria, porque salen de la forma de su gráfica.",
        },
        {
          type: "table",
          headers: ["Función", "$x \\to -\\infty$", "$x \\to +\\infty$", "Otro"],
          rows: [
            ["$e^{x}$, o $b^{x}$ con $b > 1$", "$0$", "$+\\infty$", ""],
            ["$e^{-x}$, o $b^{x}$ con $0 < b < 1$", "$+\\infty$", "$0$", ""],
            ["$\\ln x$", "no está definida", "$+\\infty$", "$\\lim_{x \\to 0^+} \\ln x = -\\infty$"],
          ],
        },
        {
          type: "note",
          tone: "tip",
          title: "Una pregunta que salió en un parcial",
          md: "Para $\\lim_{n \\to +\\infty} b^{-n}$ con $b > 0$ hay tres casos. Si $b > 1$, $b^{-n} = \\frac{1}{b^n} \\to 0$. Si $0 < b < 1$, el límite es $+\\infty$. Si $b = 1$, vale $1$ siempre.",
        },
        {
          type: "text",
          md: "Cuando $x \\to +\\infty$, todas estas funciones crecen sin control, pero a ritmos muy distintos. La **jerarquía** es:\n\n$$\\ln x \\ll x^p \\ll b^x \\qquad (p > 0, \\; b > 1)$$\n\nEl símbolo $\\ll$ quiere decir \"crece mucho más lento que\". En la práctica: en un cociente, si arriba está el que crece más rápido el límite es infinito, y si está abajo el límite es $0$.",
        },
        {
          type: "widget",
          widget: {
            kind: "sliders",
            fn: "\\frac{x^{n}}{e^{x}}",
            params: [{ name: "n", min: 1, max: 4, step: 1, value: 4 }],
            x: [-0.5, 15],
            y: [-1, 7],
            formula: "f(x) = \\frac{x^{{n}}}{e^{x}}",
          },
          caption: "Al principio $x^n$ va ganando, pero tarde o temprano la exponencial lo aplasta y el cociente cae a $0$.",
        },
        {
          type: "example",
          title: "Dividir entre lo que más crece",
          problem: "Calcula $\\lim_{x \\to +\\infty} \\dfrac{5e^{x} + x^2}{e^{x} + 1}$.",
          steps: [
            "Lo que más crece es $e^{x}$. Dividimos todo entre $e^{x}$: $\\dfrac{5 + \\frac{x^2}{e^x}}{1 + \\frac{1}{e^x}}$.",
            "Por la jerarquía, $\\frac{x^2}{e^x} \\to 0$. Y $\\frac{1}{e^x} \\to 0$.",
          ],
          answer: "$5$",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $$\\lim_{x \\to +\\infty} \\dfrac{\\ln x}{x}$$",
            parts: [limPart("0", { mistakes: [{ answer: "1", feedback: "Arriba y abajo crecen, pero a ritmos distintos. La potencia le gana al logaritmo." }] })],
            solution: ["$x$ crece mucho más rápido que $\\ln x$, así que el cociente tiende a $0$."],
          },
        },
      ],
    },
  ],
  exercises: [
    kSobreCero,
    gradoIgual,
    ahGradosUbicar,
    polinomioInfinito,
    expBasico,
    bilateralInfinito,
    signosKCero,
    gradosDistintos,
    raizSobreLineal,
    conjugadoBasico,
    jerarquia,
    conjugadoDesplazado,
    raicesMixtas,
    parametrosGrado,
    cubicaDiferencia,
    ahDosLadosUbicar,
  ],
};

export default topic;
