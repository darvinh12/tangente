import { meta } from "../catalog";
import { trueFalse } from "../helpers";
import type { ExerciseGen, Mistake, Topic } from "../types";
import { coef, fmt, frac, num, poly, signed, terms } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

function dpoly(c: number[]): number[] {
  const deg = c.length - 1;
  return c.slice(0, -1).map((k, i) => k * (deg - i));
}

function evalPoly(c: number[], x: number): number {
  return c.reduce((acc, k) => acc * x + k, 0);
}

/** Recta y = mx + b escrita limpia. */
function lineTex(m: string | number, b: string | number): string {
  const ms = typeof m === "number" ? fmt(m) : m;
  const bs = typeof b === "number" ? fmt(b) : b;
  const mPart = ms === "0" ? "" : ms === "1" ? "x" : ms === "-1" ? "-x" : `${ms}x`;
  if (!mPart) return bs;
  if (bs === "0") return mPart;
  return bs.startsWith("-") ? `${mPart} - ${bs.slice(1)}` : `${mPart} + ${bs}`;
}

/** Número con paréntesis si es negativo, para sustituir. */
function p(n: number): string {
  return n < 0 ? `(${fmt(n)})` : fmt(n);
}

/** Redondeo para evitar ruido de coma flotante. */
function round(n: number, d = 6): number {
  return Math.round(n * 10 ** d) / 10 ** d;
}

/** "x - a" o "x + a" según el signo. */
function xMinus(a: number): string {
  return a === 0 ? "x" : a > 0 ? `x - ${fmt(a)}` : `x + ${fmt(-a)}`;
}

/** Factor lineal: 0 -> "x", 3 -> "(x - 3)" */
function fac(a: number): string {
  return a === 0 ? "x" : `(${xMinus(a)})`;
}

/* ----------------------------------- ejercicios ----------------------------------- */

const vfTangente: ExerciseGen = {
  id: "vf-tangente",
  title: "Conceptos de tangente y diferencial",
  level: 1,
  generate: (r) => {
    const A = r.int(2, 9);
    const B = r.int(1, 9);
    const items: [string, boolean, string][] = [
      ["Si $f'(a) = 0$, la recta tangente a la gráfica en $x = a$ es horizontal.", true, "Pendiente cero significa recta horizontal: $y = f(a)$."],
      ["La recta normal en $x = a$ tiene pendiente $-f'(a)$.", false, "La normal es perpendicular a la tangente. Su pendiente es $-\\frac{1}{f'(a)}$: inverso y con el signo cambiado."],
      ["El diferencial $dy$ siempre es igual al incremento $\\Delta y$.", false, "$dy$ mide el cambio sobre la recta tangente y $\\Delta y$ el cambio real sobre la curva. Solo se parecen cuando $\\Delta x$ es pequeño."],
      ["Dos rectas paralelas tienen la misma pendiente.", true, "Paralelas significa misma inclinación, es decir, misma pendiente."],
      [`La pendiente de la recta $${A}x - y + ${B} = 0$ es $-${A}$.`, false, `Despejando $y$: $y = ${A}x + ${B}$. La pendiente es $${A}$.`],
      ["$f'(a)$ es la recta tangente a la gráfica de $f$ en el punto $(a, f(a))$.", false, "$f'(a)$ es un número: la pendiente de la tangente. La recta es $y - f(a) = f'(a)(x - a)$."],
      ["Si $\\Delta x$ es pequeño, $f(a + \\Delta x) \\approx f(a) + f'(a)\\,\\Delta x$.", true, "Es la aproximación lineal: cerca de $a$ la curva y su tangente casi coinciden."],
      ["Si dos rectas son perpendiculares y ninguna es vertical, el producto de sus pendientes es $-1$.", true, "Por eso la pendiente de una perpendicular es $-\\frac{1}{m}$."],
    ];
    const [claim, isTrue, why] = r.pick(items);
    return {
      statement: `¿Verdadero o falso? ${claim}`,
      parts: [trueFalse(isTrue, why)],
      hints: ["Recuerda que $f'(a)$ es la pendiente de la tangente en $x = a$."],
      solution: [`${isTrue ? "Verdadero" : "Falso"}. ${why}`],
    };
  },
};

const tangentePolinomio: ExerciseGen = {
  id: "tangente-polinomio",
  title: "Recta tangente en un punto",
  level: 1,
  generate: (r) => {
    const cubic = r.bool(0.4);
    const c = cubic ? [r.pick([1, -1]), r.int(-2, 2), r.int(-3, 3), r.int(-4, 4)] : [r.nz(-3, 3), r.int(-5, 5), r.int(-6, 6)];
    const a = r.int(-2, 2);
    const fa = evalPoly(c, a);
    const m = evalPoly(dpoly(c), a);
    const b = fa - m * a;
    const mistakesB: Mistake[] = [];
    if (fa !== b) mistakesB.push({ answer: fmt(fa), feedback: `$${fmt(fa)}$ es $f(${a})$, la altura del punto. El corte $b$ sale de despejar $y$ en $y - f(a) = m(x - a)$.` });
    const mistakesM: Mistake[] = [];
    if (fa !== m) mistakesM.push({ answer: fmt(fa), feedback: "Ese es el valor de la función. La pendiente es el valor de la derivada en el punto." });
    return {
      statement: `Halla la recta tangente a la gráfica de $f(x) = ${poly(c)}$ en $x = ${a}$. Escríbela en la forma $y = mx + b$.`,
      parts: [
        { kind: "expr", before: "m =", answer: fmt(m), mistakes: mistakesM },
        { kind: "expr", before: "b =", answer: fmt(b), mistakes: mistakesB },
      ],
      hints: [
        `Necesitas un punto y una pendiente. El punto es $(${a}, f(${a}))$ y la pendiente es $f'(${a})$.`,
        "Sustituye en $y - f(a) = f'(a)(x - a)$ y despeja $y$.",
      ],
      solution: [
        `Punto: $f(${a}) = ${fmt(fa)}$, así que pasa por $(${a}, ${fmt(fa)})$.`,
        `Derivada: $f'(x) = ${poly(dpoly(c))}$, y la pendiente es $m = f'(${a}) = ${fmt(m)}$.`,
        `$y - ${p(fa)} = ${p(m)}(${xMinus(a)})$, que al despejar da $y = ${lineTex(m, b)}$.`,
      ],
    };
  },
};

const pendienteEnPunto: ExerciseGen = {
  id: "pendiente-en-punto",
  title: "Pendiente de la tangente",
  level: 1,
  generate: (r) => {
    const kind = r.pick(["sqrt", "inv", "ln", "exp", "pot"] as const);
    let fTex: string, a: number, ans: string, why: string, dTex: string;
    const mistakes: Mistake[] = [];
    if (kind === "sqrt") {
      const k = r.int(1, 5);
      a = k * k;
      fTex = "\\sqrt{x}";
      dTex = "\\frac{1}{2\\sqrt{x}}";
      ans = frac(1, 2 * k);
      why = `$f'(${a}) = \\frac{1}{2\\sqrt{${a}}} = \\frac{1}{${2 * k}}$`;
      mistakes.push({ answer: String(k), feedback: "Ese es $f(" + a + ")$, no la pendiente." });
    } else if (kind === "inv") {
      a = r.nz(-4, 4);
      const c = r.int(1, 6);
      fTex = `\\frac{${c}}{x}`;
      dTex = `-\\frac{${c}}{x^{2}}`;
      ans = frac(-c, a * a);
      why = `$f'(${a}) = -\\frac{${c}}{${p(a)}^{2}} = ${ans}$`;
      mistakes.push({ answer: frac(c, a * a), feedback: "Perdiste el signo. La derivada de $x^{-1}$ es $-x^{-2}$." });
    } else if (kind === "ln") {
      a = r.int(1, 6);
      const c = r.int(1, 4);
      fTex = c === 1 ? "\\ln x" : `${c}\\ln x`;
      dTex = `\\frac{${c}}{x}`;
      ans = frac(c, a);
      why = `$f'(${a}) = \\frac{${c}}{${a}} = ${ans}$`;
    } else if (kind === "exp") {
      const k = r.nz(-3, 3);
      a = 0;
      const c = r.int(1, 4);
      fTex = `${c === 1 ? "" : c}e^{${coef(k, "x")}}`;
      dTex = `${coef(c * k, `e^{${coef(k, "x")}}`)}`;
      ans = String(c * k);
      why = `$f'(0) = ${c * k}e^{0} = ${c * k}$`;
      if (c !== c * k) mistakes.push({ answer: String(c), feedback: "Ese es $f(0)$. Falta multiplicar por la derivada del exponente." });
    } else {
      const n = r.int(3, 5);
      a = r.nz(-2, 2);
      fTex = `x^{${n}}`;
      dTex = `${n}x^{${n - 1}}`;
      ans = String(n * a ** (n - 1));
      why = `$f'(${a}) = ${n}\\cdot ${p(a)}^{${n - 1}} = ${ans}$`;
    }
    return {
      statement: `Calcula la pendiente de la recta tangente a la gráfica de $f(x) = ${fTex}$ en $x = ${a}$.`,
      parts: [{ kind: "expr", before: `f'(${a}) =`, answer: ans, mistakes }],
      hints: ["La pendiente de la tangente en $x = a$ es $f'(a)$. Deriva y sustituye."],
      solution: [`$f'(x) = ${dTex}$.`, `${why}.`],
    };
  },
};

const horizontalVertice: ExerciseGen = {
  id: "horizontal-vertice",
  title: "Dónde la tangente es horizontal",
  level: 1,
  generate: (r) => {
    const a = r.nz(-2, 2);
    const h = r.int(-4, 4);
    const k = r.int(-4, 4);
    const c = [a, -2 * a * h, a * h * h + k];
    return {
      statement: `La gráfica de $f(x) = ${poly(c)}$ tiene un único punto donde la recta tangente es horizontal. Ubícalo en el plano.`,
      parts: [{ kind: "point", graph: { x: [-6, 6], y: [-6, 6] }, answer: [h, k] }],
      hints: ["Tangente horizontal quiere decir pendiente cero: resuelve $f'(x) = 0$.", "Con la $x$ que encuentres, calcula la altura $f(x)$."],
      solution: [
        `$f'(x) = ${poly(dpoly(c))}$.`,
        `$f'(x) = 0$ cuando $x = ${h}$.`,
        `$f(${h}) = ${k}$. El punto es $(${h}, ${k})$, que es el vértice de la parábola.`,
      ],
    };
  },
};

const tangenteLnExp: ExerciseGen = {
  id: "tangente-ln-exp",
  title: "Tangentes a raíces, exponenciales y logaritmos",
  level: 2,
  generate: (r) => {
    const kind = r.pick(["ln", "exp", "sqrt", "xexp", "lne", "inv"] as const);
    let fTex: string, aTex: string, aVal: number, fa: string, m: string, b: string, dTex: string;
    if (kind === "ln") {
      const k = r.nz(-3, 4);
      fTex = coef(k, "\\ln x");
      aTex = "1";
      aVal = 1;
      fa = "0";
      dTex = `\\frac{${k}}{x}`;
      m = String(k);
      b = String(-k);
    } else if (kind === "exp") {
      const k = r.nz(-3, 3);
      fTex = `e^{${coef(k, "x")}}`;
      aTex = "0";
      aVal = 0;
      fa = "1";
      dTex = `${coef(k, fTex)}`;
      m = String(k);
      b = "1";
    } else if (kind === "sqrt") {
      const c = r.int(1, 5);
      fTex = "\\sqrt{x}";
      aVal = c * c;
      aTex = String(aVal);
      fa = String(c);
      dTex = "\\frac{1}{2\\sqrt{x}}";
      m = frac(1, 2 * c);
      b = frac(c, 2);
    } else if (kind === "xexp") {
      const c = r.int(-3, 3);
      fTex = `(${xMinus(-c)})e^{x}`;
      aTex = "0";
      aVal = 0;
      fa = String(c);
      dTex = `(${xMinus(-(c + 1))})e^{x}`;
      m = String(c + 1);
      b = String(c);
    } else if (kind === "lne") {
      fTex = "\\ln x";
      aTex = "e";
      aVal = Math.E;
      fa = "1";
      dTex = "\\frac{1}{x}";
      m = "\\frac{1}{e}";
      b = "0";
    } else {
      const c = r.nz(-4, 4);
      fTex = "\\frac{1}{x}";
      aVal = c;
      aTex = String(c);
      fa = frac(1, c);
      dTex = "-\\frac{1}{x^{2}}";
      m = frac(-1, c * c);
      b = frac(2, c);
    }
    return {
      statement: `Halla la recta tangente a $f(x) = ${fTex}$ en $x = ${aTex}$, escrita como $y = mx + b$.`,
      parts: [
        { kind: "expr", before: "m =", answer: m },
        {
          kind: "expr",
          before: "b =",
          answer: b,
          mistakes: fa !== b ? [{ answer: fa, feedback: "Ese es $f(a)$, la altura del punto de tangencia. Para hallar $b$ despeja $y$ en la ecuación de la recta." }] : [],
        },
      ],
      hints: [`El punto de tangencia es $(${aTex}, f(${aTex}))$ y la pendiente es $f'(${aTex})$.`, "Usa $y - f(a) = f'(a)(x - a)$ y despeja."],
      solution: [
        `Punto: $f(${aTex}) = ${fa}$.`,
        `Derivada: $f'(x) = ${dTex}$, así que $m = f'(${aTex}) = ${m}$.`,
        `$y - ${fa.startsWith("-") ? `(${fa})` : fa} = ${m}(x - ${aVal < 0 ? `(${aTex})` : aTex})$, y despejando, $y = ${lineTex(m, b)}$.`,
      ],
    };
  },
};

const normal: ExerciseGen = {
  id: "normal",
  title: "Recta normal",
  level: 2,
  generate: (r) => {
    let c: number[], a: number, m: number;
    do {
      c = [r.nz(-2, 2), r.int(-4, 4), r.int(-5, 5)];
      a = r.int(-2, 2);
      m = evalPoly(dpoly(c), a);
    } while (m === 0);
    const fa = evalPoly(c, a);
    const mn = -1 / m;
    const bn = fa - mn * a;
    return {
      statement: `Halla la recta normal a la gráfica de $f(x) = ${poly(c)}$ en $x = ${a}$, escrita como $y = mx + b$.`,
      parts: [
        {
          kind: "expr",
          before: "m =",
          answer: frac(-1, m),
          mistakes: [
            ...(m !== 1 && m !== -1 ? [{ answer: fmt(-m), feedback: "Solo cambiaste el signo. La pendiente de la normal es $-\\frac{1}{f'(a)}$: también hay que invertir." }] : []),
            { answer: frac(1, m), feedback: "Invertiste pero falta cambiar el signo." },
            ...(m !== -1 ? [{ answer: fmt(m), feedback: "Esa es la pendiente de la tangente. La normal es perpendicular a ella." }] : []),
          ],
        },
        { kind: "expr", before: "b =", answer: frac(Math.round(bn * m), m) },
      ],
      hints: [
        `Calcula primero la pendiente de la tangente, $f'(${a})$.`,
        "La normal pasa por el mismo punto y su pendiente es $-\\dfrac{1}{f'(a)}$.",
      ],
      solution: [
        `Punto: $(${a}, ${fmt(fa)})$. Pendiente de la tangente: $f'(${a}) = ${fmt(m)}$.`,
        `Pendiente de la normal: $-\\dfrac{1}{${fmt(m)}} = ${frac(-1, m)}$.`,
        `$y - ${p(fa)} = ${frac(-1, m)}(${xMinus(a)})$, y despejando, $y = ${lineTex(frac(-1, m), frac(Math.round(bn * m), m))}$.`,
      ],
    };
  },
};

const pendienteDada: ExerciseGen = {
  id: "pendiente-dada",
  title: "Punto con pendiente dada",
  level: 2,
  generate: (r) => {
    const x0 = r.int(-3, 3);
    const m = r.int(-4, 4);
    const pc = m - 2 * x0;
    const y0 = r.int(-5, 5);
    const q = y0 - x0 * x0 - pc * x0;
    const c = [1, pc, q];
    return {
      statement: `¿En qué punto de la gráfica de $f(x) = ${poly(c)}$ la recta tangente tiene pendiente $${m}$? Ubícalo en el plano.`,
      parts: [{ kind: "point", graph: { x: [-6, 6], y: [-6, 6] }, answer: [x0, y0] }],
      hints: [`La pendiente de la tangente es $f'(x)$. Plantea $f'(x) = ${m}$ y despeja $x$.`, "Después calcula $f$ en ese valor para la altura."],
      solution: [
        `$f'(x) = ${poly(dpoly(c))}$.`,
        `$${poly(dpoly(c))} = ${m}$ da $x = ${x0}$.`,
        `$f(${x0}) = ${y0}$. El punto es $(${x0}, ${y0})$.`,
      ],
    };
  },
};

const aproximacion: ExerciseGen = {
  id: "aproximacion",
  title: "Aproximar con la recta tangente",
  level: 2,
  generate: (r) => {
    const kind = r.pick(["sqrt", "sqrt", "cbrt", "exp", "ln"] as const);
    if (kind === "sqrt") {
      const a = r.pick([2, 4, 5, 10]);
      const h = r.pick([-1, 1, 2, 3]);
      const N = a * a + h;
      const approx = frac(2 * a * a + h, 2 * a);
      return {
        statement: `Usa la recta tangente a $f(x) = \\sqrt{x}$ en $x = ${a * a}$ para aproximar $\\sqrt{${N}}$.`,
        sequential: true,
        parts: [
          { kind: "expr", prompt: "Pendiente de la tangente en el punto.", before: `f'(${a * a}) =`, answer: frac(1, 2 * a) },
          {
            kind: "expr",
            prompt: `Aproximación de $\\sqrt{${N}}$ (puedes escribirla como fracción o decimal exacto).`,
            before: `\\sqrt{${N}} \\approx`,
            answer: approx,
            mistakes: [{ answer: frac(a * a + h, a), feedback: "Revisa la pendiente. La derivada de $\\sqrt{x}$ es $\\frac{1}{2\\sqrt{x}}$, con el 2 en el denominador." }],
          },
        ],
        hints: [
          `Cerca de $${a * a}$: $\\sqrt{x} \\approx f(${a * a}) + f'(${a * a})(x - ${a * a})$.`,
          `$f(${a * a}) = ${a}$ y $f'(${a * a}) = \\frac{1}{2\\cdot ${a}}$.`,
        ],
        solution: [
          `$f(${a * a}) = ${a}$ y $f'(x) = \\frac{1}{2\\sqrt{x}}$, así que $f'(${a * a}) = ${frac(1, 2 * a)}$.`,
          `$\\sqrt{${N}} \\approx ${a} + ${frac(1, 2 * a)}\\cdot(${h}) = ${approx} = ${num((2 * a * a + h) / (2 * a))}$.`,
          `El valor real es $${num(Math.sqrt(N), 4)}\\dots$ La aproximación es muy buena porque $${N}$ está cerca de $${a * a}$.`,
        ],
      };
    }
    if (kind === "cbrt") {
      const [a, h] = r.pick([[2, 0.12], [2, 0.24], [2, -0.12], [3, 0.27], [3, 0.54], [3, -0.27]] as const);
      const N = round(a ** 3 + h);
      const slope = 1 / (3 * a * a);
      const approx = round(a + slope * h);
      return {
        statement: `Usa la recta tangente a $f(x) = \\sqrt[3]{x}$ en $x = ${a ** 3}$ para aproximar $\\sqrt[3]{${num(N)}}$.`,
        sequential: true,
        parts: [
          { kind: "expr", prompt: "Pendiente de la tangente en el punto.", before: `f'(${a ** 3}) =`, answer: frac(1, 3 * a * a) },
          { kind: "expr", prompt: `Aproximación de $\\sqrt[3]{${num(N)}}$ en decimal.`, before: `\\sqrt[3]{${num(N)}} \\approx`, answer: String(approx) },
        ],
        hints: [
          `$f'(x) = \\frac{1}{3}x^{-2/3} = \\dfrac{1}{3\\sqrt[3]{x^{2}}}$.`,
          `Usa $f(x) \\approx f(${a ** 3}) + f'(${a ** 3})(x - ${a ** 3})$ con $x - ${a ** 3} = ${num(h)}$.`,
        ],
        solution: [
          `$f(${a ** 3}) = ${a}$ y $f'(${a ** 3}) = \\dfrac{1}{3\\cdot ${a * a}} = ${frac(1, 3 * a * a)}$.`,
          `$\\sqrt[3]{${num(N)}} \\approx ${a} + ${frac(1, 3 * a * a)}\\cdot(${num(h)}) = ${num(approx)}$.`,
          `El valor real es $${num(Math.cbrt(N), 5)}\\dots$`,
        ],
      };
    }
    const h = r.pick([0.1, 0.05, 0.02, -0.1, -0.05, 0.2]);
    if (kind === "exp") {
      return {
        statement: `Usa la recta tangente a $f(x) = e^{x}$ en $x = 0$ para aproximar $e^{${num(h)}}$.`,
        sequential: true,
        parts: [
          { kind: "expr", prompt: "Pendiente de la tangente en $x = 0$.", before: "f'(0) =", answer: "1" },
          { kind: "expr", prompt: `Aproximación de $e^{${num(h)}}$ en decimal.`, before: `e^{${num(h)}} \\approx`, answer: String(round(1 + h)), mistakes: [{ answer: String(h), feedback: "Te faltó sumar $f(0) = e^{0} = 1$." }] },
        ],
        hints: ["$f(0) = 1$ y $f'(x) = e^{x}$, así que $f'(0) = 1$.", "La tangente en $0$ es $y = 1 + x$."],
        solution: [
          "$f(0) = 1$ y $f'(0) = e^{0} = 1$. La tangente es $y = 1 + x$.",
          `$e^{${num(h)}} \\approx 1 + ${h < 0 ? `(${num(h)})` : num(h)} = ${num(round(1 + h))}$.`,
          `El valor real es $${num(Math.exp(h), 5)}\\dots$`,
        ],
      };
    }
    return {
      statement: `Usa la recta tangente a $f(x) = \\ln x$ en $x = 1$ para aproximar $\\ln(${num(round(1 + h))})$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Pendiente de la tangente en $x = 1$.", before: "f'(1) =", answer: "1" },
        { kind: "expr", prompt: `Aproximación de $\\ln(${num(round(1 + h))})$ en decimal.`, before: `\\ln(${num(round(1 + h))}) \\approx`, answer: String(h), mistakes: [{ answer: String(round(1 + h)), feedback: "Revisa el punto: $f(1) = \\ln 1 = 0$, no $1$." }] },
      ],
      hints: ["$f(1) = \\ln 1 = 0$ y $f'(1) = \\frac{1}{1} = 1$.", "La tangente en $x = 1$ es $y = x - 1$."],
      solution: [
        "$f(1) = 0$ y $f'(1) = 1$. La tangente es $y = x - 1$.",
        `$\\ln(${num(round(1 + h))}) \\approx ${num(round(1 + h))} - 1 = ${num(h)}$.`,
        `El valor real es $${num(Math.log(1 + h), 5)}\\dots$`,
      ],
    };
  },
};

const paralelaRecta: ExerciseGen = {
  id: "paralela-recta",
  title: "Tangente paralela o perpendicular a una recta (tipo parcial)",
  level: 2,
  exam: true,
  generate: (r) => {
    let a: number, b: number, x0: number, A: number;
    do {
      a = r.pick([1, 2, 3, -1, -2]);
      b = r.int(-3, 3);
      x0 = r.nz(-3, 3);
      A = 2 * a * x0 + b;
    } while (A === 0);
    const c = r.int(-5, 5);
    const B = r.nz(-6, 6);
    const coefs = [a, b, c];
    const y0 = evalPoly(coefs, x0);
    const bb = y0 - A * x0;
    const perp = r.bool(0.4);
    const absA = Math.abs(A);
    const lineEq = perp
      ? `x ${A < 0 ? "-" : "+"} ${absA === 1 ? "" : absA}y ${signed(B)} = 0`
      : `${coef(A, "x")} - y ${signed(B)} = 0`;
    const slopeLine = perp ? frac(-1, A) : String(A);
    return {
      statement: `Encuentra la ecuación de la recta tangente a la gráfica de $f(x) = ${poly(coefs)}$ que es ${perp ? "perpendicular" : "paralela"} a la recta $${lineEq}$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Pendiente que debe tener la tangente.", before: "m =", answer: String(A), mistakes: perp && slopeLine !== String(A) ? [{ answer: slopeLine, feedback: "Esa es la pendiente de la recta dada. La tangente es perpendicular a ella, así que su pendiente es $-\\frac{1}{m}$." }] : [] },
        { kind: "expr", prompt: "Abscisa del punto de tangencia.", before: "x_0 =", answer: String(x0) },
        { kind: "expr", prompt: "Término independiente de la tangente $y = mx + b$.", before: "b =", answer: String(bb), mistakes: y0 !== bb ? [{ answer: String(y0), feedback: `$${y0}$ es la altura del punto de tangencia, $f(${x0})$. Falta despejar $y$.` }] : [] },
      ],
      hints: [
        perp
          ? "Despeja $y$ en la recta dada para leer su pendiente. La tangente buscada tiene pendiente $-\\frac{1}{m}$."
          : "Despeja $y$ en la recta dada para leer su pendiente. Paralelas tienen la misma pendiente.",
        "Iguala $f'(x)$ a esa pendiente y despeja $x$. Ese es el punto de tangencia.",
        "Con el punto $(x_0, f(x_0))$ y la pendiente, escribe $y - f(x_0) = m(x - x_0)$.",
      ],
      solution: [
        perp
          ? `Despejando, la recta dada tiene pendiente $${slopeLine}$. La perpendicular tiene pendiente $-1 \\div \\left(${slopeLine}\\right) = ${A}$.`
          : `Despejando, la recta dada es $y = ${lineTex(A, B)}$, con pendiente $${A}$. La tangente debe tener pendiente $${A}$.`,
        `$f'(x) = ${poly(dpoly(coefs))}$. Igualando: $${poly(dpoly(coefs))} = ${A}$, de donde $x_0 = ${x0}$.`,
        `$f(${x0}) = ${y0}$. La tangente es $y - ${p(y0)} = ${A}(${xMinus(x0)})$, es decir, $y = ${lineTex(A, bb)}$.`,
      ],
    };
  },
};

const incrementoDiferencial: ExerciseGen = {
  id: "incremento-diferencial",
  title: "Incremento, diferencial y error (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const cubic = r.bool();
    const c = cubic ? [1, 0, r.int(-4, 0), r.int(-3, 3)] : [r.nz(-2, 3), r.int(-4, 4), r.int(-5, 5)];
    const x0 = r.int(1, 4);
    const big = r.bool(0.4);
    const dx = big ? r.pick([-3, -2, 2, 3]) : r.pick([0.1, 0.2, -0.1, 0.5]);
    const x1 = round(x0 + dx);
    const dy = round(evalPoly(dpoly(c), x0) * dx);
    const Dy = round(evalPoly(c, x1) - evalPoly(c, x0));
    const err = round(Math.abs(Dy - dy));
    const mov = dx > 0 ? "aumenta" : "disminuye";
    return {
      statement: `Sea $f(x) = ${poly(c)}$. La variable $x$ ${mov} de $x = ${x0}$ a $x = ${num(x1)}$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Calcula la variación real de la función.", before: "\\Delta y =", answer: String(Dy) },
        { kind: "expr", prompt: "Calcula su aproximación con el diferencial.", before: "dy =", answer: String(dy), mistakes: Dy !== dy ? [{ answer: String(Dy), feedback: "Ese es el incremento real. El diferencial usa la derivada: $dy = f'(x_0)\\,\\Delta x$." }] : [] },
        { kind: "expr", prompt: "Calcula el error cometido, $|\\Delta y - dy|$.", before: "\\text{error} =", answer: String(err) },
      ],
      hints: [
        `$\\Delta x = ${num(x1)} - ${x0} = ${num(dx)}$. El incremento real es $\\Delta y = f(${num(x1)}) - f(${x0})$.`,
        `El diferencial es $dy = f'(${x0})\\cdot\\Delta x$.`,
        "El error es la distancia entre los dos: $|\\Delta y - dy|$.",
      ],
      solution: [
        `$\\Delta x = ${num(dx)}$. $f(${x0}) = ${num(evalPoly(c, x0))}$ y $f(${num(x1)}) = ${num(round(evalPoly(c, x1)))}$, así que $\\Delta y = ${num(Dy)}$.`,
        `$f'(x) = ${poly(dpoly(c))}$, $f'(${x0}) = ${evalPoly(dpoly(c), x0)}$. Entonces $dy = ${evalPoly(dpoly(c), x0)}\\cdot(${num(dx)}) = ${num(dy)}$.`,
        `Error: $|${num(Dy)} - (${num(dy)})| = ${num(err)}$.`,
        big
          ? "El error es grande porque $\\Delta x$ no es pequeño. El diferencial solo aproxima bien cerca del punto."
          : "Con un $\\Delta x$ pequeño el diferencial aproxima muy bien el cambio real.",
      ],
    };
  },
};

const tangenteCorteEje: ExerciseGen = {
  id: "tangente-corte-eje",
  title: "Tangente en el corte con el eje x (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const kind = r.pick(["expsqrt", "expsqrt", "pow", "ln"] as const);
    let fTex: string, r0: number, m: string, b: string, steps: string[];
    if (kind === "expsqrt") {
      const k = r.int(1, 3);
      r0 = r.int(1, 5);
      const t = r.int(1, 3);
      const c = t * t - r0;
      const inner = c === 0 ? "x" : c > 0 ? `x+${c}` : `x-${-c}`;
      fTex = `(${terms([[k, "x"], [-k * r0, ""]])})e^{\\sqrt{${inner}}}`;
      const eT = t === 1 ? "e" : `e^{${t}}`;
      m = `${k === 1 ? "" : k}${eT}`;
      b = `-${k * r0}${eT}`;
      steps = [
        `La exponencial nunca vale cero, así que $f(x) = 0$ solo cuando $${terms([[k, "x"], [-k * r0, ""]])} = 0$, es decir, $x = ${r0}$.`,
        `Producto: $f'(x) = ${k === 1 ? "" : k}e^{\\sqrt{${inner}}} + (${terms([[k, "x"], [-k * r0, ""]])})e^{\\sqrt{${inner}}}\\cdot\\dfrac{1}{2\\sqrt{${inner}}}$.`,
        `En $x = ${r0}$ el segundo término se anula y $\\sqrt{${r0}${c === 0 ? "" : c > 0 ? `+${c}` : `-${-c}`}} = ${t}$. Entonces $m = f'(${r0}) = ${m}$.`,
        `$y - 0 = ${m}(x - ${r0})$, es decir, $y = ${m}x - ${k * r0}${eT}$.`,
      ];
    } else if (kind === "pow") {
      const base = r.pick([2, 3, 5]);
      r0 = r.nz(-3, 4);
      fTex = `${base}^{${xMinus(r0)}} - 1`;
      m = `\\ln ${base}`;
      b = r0 === 1 ? `-\\ln ${base}` : `${-r0}\\ln ${base}`;
      steps = [
        `$${base}^{${xMinus(r0)}} = 1$ solo cuando el exponente es $0$, así que el corte es $x = ${r0}$.`,
        `$f'(x) = ${base}^{${xMinus(r0)}}\\ln ${base}$, y $f'(${r0}) = ${base}^{0}\\ln ${base} = \\ln ${base}$.`,
        `$y - 0 = \\ln ${base}\\,(${xMinus(r0)})$, es decir, $y = (\\ln ${base})x ${r0 > 0 ? "-" : "+"} ${Math.abs(r0) === 1 ? "" : Math.abs(r0)}\\ln ${base}$.`,
      ];
    } else {
      const k = r.int(2, 5);
      r0 = r.int(1, 4);
      const c = k * r0 - 1;
      fTex = `\\ln(${k}x - ${c})`;
      m = String(k);
      b = String(-k * r0);
      steps = [
        `$\\ln u = 0$ cuando $u = 1$: $${k}x - ${c} = 1$, así que $x = ${r0}$.`,
        `$f'(x) = \\dfrac{${k}}{${k}x - ${c}}$, y $f'(${r0}) = \\dfrac{${k}}{1} = ${k}$.`,
        `$y - 0 = ${k}(x - ${r0})$, es decir, $y = ${k}x - ${k * r0}$.`,
      ];
    }
    return {
      statement: `Determina la ecuación de la recta tangente a la curva de $f(x) = ${fTex}$ en el punto cuya ordenada es cero.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Abscisa del punto donde la curva corta al eje $x$.", before: "x_0 =", answer: String(r0) },
        { kind: "expr", prompt: "Pendiente de la tangente en ese punto.", before: "m =", answer: m },
        { kind: "expr", prompt: "Término independiente de la tangente $y = mx + b$.", before: "b =", answer: b },
      ],
      hints: [
        "Ordenada cero quiere decir $f(x) = 0$. Resuelve esa ecuación primero.",
        "Deriva y evalúa en ese punto. Muchos términos se anulan porque ahí un factor vale cero.",
        "Como el punto es $(x_0, 0)$, la recta es $y = m(x - x_0)$.",
      ],
      solution: steps,
    };
  },
};

const horizontalCuadrante: ExerciseGen = {
  id: "horizontal-cuadrante",
  title: "Tangente horizontal en un cuadrante (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const s = r.int(3, 5);
    const k = r.int(1, 2);
    const c = s * s - 2 * k * k;
    const d = s * s - k * k;
    const third = r.bool();
    const x0 = third ? -s : s;
    const sd = Math.sqrt(d);
    return {
      statement: `Sea $f(x) = \\dfrac{${c} - x^{2}}{\\sqrt{x^{2} - ${d}}}$. Determina la ecuación de la recta tangente a la curva sabiendo que es paralela al eje $x$ y que el punto de tangencia está en el ${third ? "tercer" : "cuarto"} cuadrante.`,
      sequential: true,
      parts: [
        {
          kind: "expr",
          prompt: "Deriva y simplifica.",
          before: "f'(x) =",
          answer: `\\frac{x(${s * s} - x^{2})}{(x^{2} - ${d})^{\\frac{3}{2}}}`,
          vars: ["x"],
          domain: [sd + 0.3, sd + 3],
        },
        { kind: "expr", prompt: "Abscisa del punto de tangencia.", before: "x_0 =", answer: String(x0), mistakes: [{ answer: String(-x0), feedback: `Ese punto está en el ${third ? "cuarto" : "tercer"} cuadrante. Fíjate en el signo de $x$.` }] },
        { kind: "expr", prompt: "La tangente es horizontal, $y = b$. Halla $b$.", before: "y =", answer: String(-2 * k) },
      ],
      hints: [
        "Paralela al eje $x$ quiere decir pendiente cero: resuelve $f'(x) = 0$.",
        `Con la regla del cociente y multiplicando arriba y abajo por $\\sqrt{x^{2} - ${d}}$ queda un numerador $x(${s * s} - x^{2})$.`,
        `$x = 0$ no está en el dominio, porque ahí $x^{2} - ${d} < 0$. Elige la raíz según el cuadrante.`,
      ],
      solution: [
        `$f'(x) = \\dfrac{-2x\\sqrt{x^{2}-${d}} - (${c} - x^{2})\\frac{x}{\\sqrt{x^{2}-${d}}}}{x^{2}-${d}}$.`,
        `Multiplicando arriba y abajo por $\\sqrt{x^{2}-${d}}$: numerador $-2x(x^{2}-${d}) - x(${c} - x^{2}) = -x^{3} + ${s * s}x = x(${s * s} - x^{2})$. Queda $f'(x) = \\dfrac{x(${s * s} - x^{2})}{(x^{2}-${d})^{3/2}}$.`,
        `$f'(x) = 0$ da $x = 0$ (fuera del dominio) o $x = \\pm ${s}$. En el ${third ? "tercer cuadrante $x < 0$, así que $x_0 = " + -s + "$" : "cuarto cuadrante $x > 0$, así que $x_0 = " + s + "$"}.`,
        `$f(${x0}) = \\dfrac{${c} - ${s * s}}{\\sqrt{${s * s} - ${d}}} = \\dfrac{${c - s * s}}{${k}} = ${-2 * k}$, negativo como corresponde al cuadrante.`,
        `La tangente horizontal es $y = ${-2 * k}$.`,
      ],
    };
  },
};

const ubicarTangencia: ExerciseGen = {
  id: "ubicar-tangencia",
  title: "Ubicar el punto de tangencia en el plano",
  level: 2,
  generate: (r) => {
    const plane = { x: [-5, 5] as [number, number], y: [-6, 6] as [number, number] };
    if (r.bool()) {
      // Cúbica s((x - h)^3 - 3(x - h)) + d: tangente horizontal en x = h ± 1.
      const s = r.pick([1, -1]);
      const h = r.int(-2, 2);
      const d = r.int(-2, 2);
      const c = [s, -3 * s * h, s * (3 * h * h - 3), s * (3 * h - h ** 3) + d];
      const mayor = r.bool();
      const x0 = mayor ? h + 1 : h - 1;
      const other = mayor ? h - 1 : h + 1;
      const y0 = evalPoly(c, x0);
      return {
        statement: `La recta tangente a $f(x) = ${poly(c)}$ es horizontal en dos puntos. Halla el de abscisa ${mayor ? "mayor" : "menor"} y ubícalo en el plano.`,
        sequential: true,
        parts: [
          {
            kind: "expr",
            prompt: "Abscisa del punto de tangencia",
            before: "x_0 =",
            answer: String(x0),
            mistakes: [{ answer: String(other), feedback: `En ese punto la tangente también es horizontal, pero su abscisa es la ${mayor ? "menor" : "mayor"} de las dos.` }],
          },
          {
            kind: "place",
            prompt: "Arrastra el punto hasta el punto de tangencia. Al acertar verás la curva y la tangente.",
            graph: plane,
            items: [{ type: "point", label: "P", answer: [x0, y0], start: [4, -5] }],
            reveal: [
              { fn: poly(c), color: "accent" },
              { fn: String(y0), color: "orange", dashed: true },
            ],
          },
        ],
        hints: ["Tangente horizontal quiere decir $f'(x) = 0$.", "Después calcula la altura con $f$, no con $f'$."],
        solution: [
          `$f'(x) = ${poly(dpoly(c))} = ${coef(3 * s, h + 1 === 0 ? `x${fac(h - 1)}` : `${fac(h - 1)}${fac(h + 1)}`)}$.`,
          `$f'(x) = 0$ en $x = ${h - 1}$ y $x = ${h + 1}$. La abscisa ${mayor ? "mayor" : "menor"} es $x_0 = ${x0}$.`,
          `$f(${x0}) = ${y0}$. El punto es $(${x0}, ${y0})$ y la tangente es la recta horizontal $y = ${y0}$.`,
        ],
      };
    }
    // Parábola a x^2 + b x + c con pendiente m en x0.
    const a = r.pick([1, -1]);
    const x0 = r.int(-3, 3);
    const y0 = r.int(-4, 4);
    const m = r.nz(-4, 4);
    const b = m - 2 * a * x0;
    const c = [a, b, y0 - a * x0 * x0 - b * x0];
    const bt = y0 - m * x0;
    return {
      statement: `¿En qué punto de la gráfica de $f(x) = ${poly(c)}$ la recta tangente tiene pendiente $${m}$? Halla su abscisa y ubícalo en el plano.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Abscisa del punto de tangencia", before: "x_0 =", answer: String(x0) },
        {
          kind: "place",
          prompt: "Arrastra el punto hasta el punto de tangencia. Al acertar verás la curva y la tangente.",
          graph: plane,
          items: [{ type: "point", label: "P", answer: [x0, y0], start: [4, -5] }],
          reveal: [
            { fn: poly(c), color: "accent" },
            { fn: lineTex(m, bt), color: "orange", dashed: true },
          ],
        },
      ],
      hints: [`La pendiente de la tangente es $f'(x)$. Resuelve $f'(x) = ${m}$.`, "Con la abscisa, calcula la altura en $f$."],
      solution: [
        `$f'(x) = ${poly(dpoly(c))}$.`,
        `$${poly(dpoly(c))} = ${m}$ da $x_0 = ${x0}$.`,
        `$f(${x0}) = ${y0}$. El punto es $(${x0}, ${y0})$ y la tangente es $y = ${lineTex(m, bt)}$.`,
      ],
    };
  },
};

const tangenteParalelaPlano: ExerciseGen = {
  id: "tangente-paralela-plano",
  title: "Tangente paralela a una recta, en el plano (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    // f(x) = s(x - h)^3 + t(x - h) + d, con f'(x) = 3s(x - h)^2 + t = m en x = h ± 1.
    let s: number, t: number, m: number;
    do {
      s = r.pick([1, -1]);
      t = r.int(-3, 3);
      m = 3 * s + t;
    } while (m === 0);
    const h = r.int(-2, 2);
    const d = r.int(-2, 2);
    const c = [s, -3 * s * h, 3 * s * h * h + t, -s * h ** 3 - t * h + d];
    const mayor = r.bool();
    const x0 = mayor ? h + 1 : h - 1;
    const y0 = evalPoly(c, x0);
    const bt = y0 - m * x0;
    const B = r.nz(-6, 6);
    const perp = r.bool(0.4);
    const absM = Math.abs(m);
    const lineEq = perp ? `x ${m < 0 ? "-" : "+"} ${absM === 1 ? "" : absM}y ${signed(B)} = 0` : `${coef(m, "x")} - y ${signed(B)} = 0`;
    const slopeLine = perp ? frac(-1, m) : String(m);
    return {
      statement: `La gráfica de $f(x) = ${poly(c)}$ tiene dos rectas tangentes ${perp ? "perpendiculares" : "paralelas"} a la recta $${lineEq}$. Halla la que toca la curva en el punto de abscisa ${mayor ? "mayor" : "menor"}.`,
      sequential: true,
      parts: [
        {
          kind: "expr",
          prompt: "Pendiente que deben tener las tangentes",
          before: "m =",
          answer: String(m),
          mistakes: perp && slopeLine !== String(m) ? [{ answer: slopeLine, feedback: "Esa es la pendiente de la recta dada. La tangente es perpendicular, así que su pendiente es $-\\frac{1}{k}$." }] : [],
        },
        {
          kind: "set",
          prompt: "Abscisas donde $f'(x)$ toma ese valor",
          before: "x \\in",
          answer: [h - 1, h + 1],
          mistakes: [{ answer: [x0], feedback: "La ecuación es de segundo grado y tiene dos soluciones. Escríbelas las dos." }],
        },
        {
          kind: "place",
          prompt: `Arrastra el punto hasta el punto de tangencia de abscisa ${mayor ? "mayor" : "menor"}. Al acertar verás la curva y la tangente.`,
          graph: { x: [-5, 5], y: [-7, 7] },
          items: [{ type: "point", label: "P", answer: [x0, y0], start: [4, -6] }],
          reveal: [
            { fn: poly(c), color: "accent" },
            { fn: lineTex(m, bt), color: "orange", dashed: true },
          ],
        },
        {
          kind: "expr",
          prompt: "Término independiente de la tangente $y = mx + b$",
          before: "b =",
          answer: String(bt),
          mistakes: y0 !== bt ? [{ answer: String(y0), feedback: `$${y0}$ es la altura del punto de tangencia. Falta despejar $y$ en $y - f(x_0) = m(x - x_0)$.` }] : [],
        },
      ],
      hints: [
        perp
          ? "Despeja $y$ en la recta dada para leer su pendiente $k$. La tangente buscada tiene pendiente $-\\frac{1}{k}$."
          : "Despeja $y$ en la recta dada para leer su pendiente. Paralelas tienen la misma pendiente.",
        "Iguala $f'(x)$ a esa pendiente. Salen dos abscisas.",
        "Con el punto $(x_0, f(x_0))$ y la pendiente, escribe $y - f(x_0) = m(x - x_0)$.",
      ],
      solution: [
        perp
          ? `La recta dada tiene pendiente $${slopeLine}$. La perpendicular tiene pendiente $-1 \\div \\left(${slopeLine}\\right) = ${m}$.`
          : `Despejando, la recta dada es $y = ${lineTex(m, B)}$, con pendiente $${m}$.`,
        `$f'(x) = ${poly(dpoly(c))}$. Igualando a $${m}$: $${poly(dpoly(c))} = ${m}$, que da $x = ${h - 1}$ o $x = ${h + 1}$.`,
        `La abscisa ${mayor ? "mayor" : "menor"} es $x_0 = ${x0}$, con $f(${x0}) = ${y0}$. El punto de tangencia es $(${x0}, ${y0})$.`,
        `$y - ${p(y0)} = ${coef(m, fac(x0))}$, es decir, $y = ${lineTex(m, bt)}$.`,
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("recta-tangente"),
  objectives: [
    "Escribir la ecuación de la recta tangente y de la recta normal en un punto.",
    "Hallar puntos donde la tangente tiene una pendiente dada, es horizontal o es paralela o perpendicular a una recta.",
    "Aproximar valores de una función con la recta tangente.",
    "Distinguir el incremento $\\Delta y$ del diferencial $dy$ y calcular el error.",
  ],
  sections: [
    {
      id: "ecuacion",
      title: "La ecuación de la recta tangente",
      blocks: [
        {
          type: "text",
          md: "Si haces zoom sobre una curva suave en un punto, cada vez se parece más a una recta. Esa recta es la tangente, y su pendiente es la derivada en ese punto. Para escribir cualquier recta basta con un punto y una pendiente, y aquí tenemos las dos cosas: el punto $(a, f(a))$ y la pendiente $f'(a)$.",
        },
        {
          type: "widget",
          widget: { kind: "tangent", fn: "\\frac{x^{3}}{4} - x + 1", x: [-4, 4], y: [-4, 5], derivative: "\\frac{3x^{2}}{4} - 1" },
          caption: "Mueve el punto y observa cómo cambia la tangente. Donde la derivada vale cero, la tangente queda horizontal.",
        },
        {
          type: "definition",
          title: "Recta tangente en x = a",
          md: "$$y - f(a) = f'(a)\\,(x - a)$$\n\nEs la ecuación punto pendiente con el punto $(a, f(a))$ y la pendiente $m = f'(a)$. Al despejar $y$ queda en la forma $y = mx + b$.",
        },
        {
          type: "example",
          title: "Tangente a un polinomio",
          problem: "Halla la recta tangente a $f(x) = x^{2} - 3x + 1$ en $x = 2$.",
          steps: [
            "Punto: $f(2) = 4 - 6 + 1 = -1$. La tangente pasa por $(2, -1)$.",
            "Pendiente: $f'(x) = 2x - 3$, así que $m = f'(2) = 1$.",
            "Ecuación: $y - (-1) = 1\\cdot(x - 2)$, es decir, $y + 1 = x - 2$.",
          ],
          answer: "$y = x - 3$",
        },
        {
          type: "example",
          title: "Tangente al logaritmo",
          problem: "Halla la recta tangente a $f(x) = \\ln x$ en el punto $(e, 1)$.",
          steps: [
            "$f'(x) = \\frac{1}{x}$, así que la pendiente es $f'(e) = \\frac{1}{e}$.",
            "$y - 1 = \\frac{1}{e}(x - e) = \\frac{x}{e} - 1$.",
            "Despejando: $y = \\frac{x}{e}$. Curiosamente, la tangente pasa por el origen.",
          ],
          answer: "$y = \\dfrac{x}{e}$",
        },
        {
          type: "graph",
          spec: {
            x: [-1, 7],
            y: [-2, 3],
            curves: [
              { fn: "\\ln x", domain: [0.05, 7], color: "accent", label: "y = ln x" },
              { fn: "\\frac{x}{e}", color: "orange", dashed: true, label: "tangente" },
            ],
            points: [{ x: Math.E, y: 1, label: "(e, 1)" }],
          },
          caption: "La tangente a $\\ln x$ en $(e, 1)$ es $y = \\frac{x}{e}$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Halla la recta tangente a $f(x) = x^{3}$ en $x = 1$, escrita como $y = mx + b$.",
            parts: [
              { kind: "expr", before: "m =", answer: "3" },
              { kind: "expr", before: "b =", answer: "-2", mistakes: [{ answer: "1", feedback: "Ese es $f(1)$. Despeja $y$ en $y - 1 = 3(x - 1)$." }] },
            ],
            solution: ["$f(1) = 1$ y $f'(x) = 3x^{2}$, así que $m = 3$.", "$y - 1 = 3(x - 1)$ da $y = 3x - 2$."],
          },
        },
      ],
    },
    {
      id: "normal",
      title: "La recta normal",
      blocks: [
        {
          type: "text",
          md: "La recta normal pasa por el mismo punto que la tangente pero es perpendicular a ella. Dos rectas son perpendiculares cuando el producto de sus pendientes es $-1$, así que la pendiente de la normal es el inverso de $f'(a)$ con el signo cambiado.",
        },
        {
          type: "definition",
          title: "Recta normal en x = a",
          md: "$$y - f(a) = -\\frac{1}{f'(a)}\\,(x - a)$$\n\nVale cuando $f'(a) \\ne 0$. Si $f'(a) = 0$ la tangente es horizontal y la normal es la recta vertical $x = a$.",
        },
        {
          type: "example",
          title: "Tangente y normal juntas",
          problem: "Halla la tangente y la normal a $f(x) = x^{2}$ en $x = 1$.",
          steps: [
            "Punto: $(1, 1)$. Pendiente de la tangente: $f'(1) = 2$.",
            "Tangente: $y - 1 = 2(x - 1)$, es decir, $y = 2x - 1$.",
            "Pendiente de la normal: $-\\frac{1}{2}$.",
            "Normal: $y - 1 = -\\frac{1}{2}(x - 1)$, es decir, $y = -\\frac{1}{2}x + \\frac{3}{2}$.",
          ],
        },
        {
          type: "graph",
          spec: {
            x: [-2, 4],
            y: [-1, 5],
            step: 1,
            curves: [
              { fn: "x^{2}", color: "accent" },
              { fn: "2x - 1", color: "orange", dashed: true, label: "tangente" },
              { fn: "-\\frac{x}{2} + \\frac{3}{2}", color: "blue", dashed: true, label: "normal" },
            ],
            points: [{ x: 1, y: 1, label: "(1, 1)" }],
          },
        },
        {
          type: "note",
          tone: "warning",
          title: "No basta con cambiar el signo",
          md: "Si la tangente tiene pendiente $2$, la normal no tiene pendiente $-2$ sino $-\\frac{1}{2}$. Hay que invertir y cambiar el signo.",
        },
        {
          type: "quick",
          exercise: {
            statement: "La tangente a una curva en un punto tiene pendiente $4$. ¿Cuál es la pendiente de la normal en ese punto?",
            parts: [{ kind: "expr", before: "m_N =", answer: "-\\frac{1}{4}", mistakes: [{ answer: "-4", feedback: "Falta invertir: la pendiente de la normal es $-\\frac{1}{m}$." }, { answer: "\\frac{1}{4}", feedback: "Falta cambiar el signo." }] }],
            solution: ["$m_N = -\\frac{1}{4}$."],
          },
        },
      ],
    },
    {
      id: "pendiente-dada",
      title: "Tangentes con una condición",
      blocks: [
        {
          type: "text",
          md: "Muchas preguntas de parcial dan la pendiente y piden el punto. La idea es siempre la misma: traducir la condición a una pendiente $m$, resolver $f'(x) = m$ para encontrar dónde ocurre, y después armar la recta.\n\n- **Horizontal o paralela al eje $x$:** $m = 0$.\n- **Paralela a una recta:** la misma pendiente que esa recta.\n- **Perpendicular a una recta de pendiente $k$:** $m = -\\frac{1}{k}$.",
        },
        {
          type: "example",
          title: "Paralela a una recta dada",
          problem: "Encuentra la recta tangente a $f(x) = 2x^{2} + 3$ que es paralela a $8x - y + 3 = 0$.",
          steps: [
            "Despejando $y$ en la recta: $y = 8x + 3$. Su pendiente es $8$.",
            "La tangente debe tener pendiente $8$: $f'(x) = 4x = 8$, así que $x = 2$.",
            "Punto de tangencia: $f(2) = 11$, es decir, $(2, 11)$.",
            "$y - 11 = 8(x - 2)$, que da $y = 8x - 5$.",
          ],
          answer: "$y = 8x - 5$",
        },
        {
          type: "example",
          title: "Tangentes horizontales",
          problem: "¿En qué puntos de $f(x) = x^{3} - 3x$ la tangente es horizontal?",
          steps: [
            "$f'(x) = 3x^{2} - 3 = 0$ da $x^{2} = 1$, es decir, $x = 1$ o $x = -1$.",
            "$f(1) = -2$ y $f(-1) = 2$.",
            "Las tangentes horizontales son $y = -2$ en $(1, -2)$ y $y = 2$ en $(-1, 2)$.",
          ],
        },
        {
          type: "graph",
          spec: {
            x: [-3, 3],
            y: [-4, 4],
            step: 1,
            curves: [{ fn: "x^{3} - 3x", color: "accent" }],
            hlines: [
              { y: 2, color: "orange", dashed: true },
              { y: -2, color: "orange", dashed: true },
            ],
            points: [
              { x: -1, y: 2, label: "(-1, 2)" },
              { x: 1, y: -2, label: "(1, -2)" },
            ],
          },
          caption: "En la cima y en el fondo de cada ondulación la tangente es horizontal.",
        },
        {
          type: "example",
          title: "Pendiente dada en una función racional",
          problem: "¿En qué puntos de $y = \\dfrac{x}{1 - x^{2}}$ la tangente tiene pendiente $1$?",
          steps: [
            "Cociente: $y' = \\dfrac{(1 - x^{2}) - x(-2x)}{(1 - x^{2})^{2}} = \\dfrac{1 + x^{2}}{(1 - x^{2})^{2}}$.",
            "$y' = 1$ da $1 + x^{2} = (1 - x^{2})^{2} = 1 - 2x^{2} + x^{4}$, es decir, $x^{4} - 3x^{2} = 0$.",
            "$x^{2}(x^{2} - 3) = 0$ da $x = 0$ o $x = \\pm\\sqrt{3}$.",
            "Los puntos son $(0, 0)$, $\\left(\\sqrt{3}, -\\frac{\\sqrt{3}}{2}\\right)$ y $\\left(-\\sqrt{3}, \\frac{\\sqrt{3}}{2}\\right)$.",
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "Lee bien la pendiente de la recta dada",
          md: "En $ax + by + c = 0$ la pendiente es $-\\frac{a}{b}$, no $a$. Lo más seguro es despejar $y$ antes de leer nada. En $8x - y + 3 = 0$ queda $y = 8x + 3$, con pendiente $8$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿En qué valor de $x$ la tangente a $f(x) = x^{2} - 6x + 5$ es horizontal?",
            parts: [{ kind: "expr", before: "x =", answer: "3" }],
            solution: ["$f'(x) = 2x - 6 = 0$ da $x = 3$."],
          },
        },
        {
          type: "quick",
          exercise: {
            statement: "Arrastra el punto hasta el lugar de $f(x) = x^{2} - 4x + 1$ donde la tangente es horizontal. Al acertar verás la curva y la tangente.",
            parts: [{
              kind: "place",
              graph: { x: [-2, 6], y: [-4, 6] },
              items: [{ type: "point", label: "P", answer: [2, -3], start: [5, 4] }],
              reveal: [
                { fn: "x^{2} - 4x + 1", color: "accent" },
                { fn: "-3", color: "orange", dashed: true },
              ],
            }],
            hints: ["Resuelve $f'(x) = 0$ y calcula la altura con $f$."],
            solution: ["$f'(x) = 2x - 4 = 0$ da $x = 2$, y $f(2) = 4 - 8 + 1 = -3$. El punto es $(2, -3)$ y la tangente es $y = -3$."],
          },
        },
      ],
    },
    {
      id: "aproximacion",
      title: "Aproximación lineal",
      blocks: [
        {
          type: "text",
          md: "Cerca del punto de tangencia la curva y su tangente casi coinciden. Por eso se puede usar la tangente, que es una recta fácil de evaluar, para estimar valores de la función que son difíciles de calcular a mano.",
        },
        {
          type: "definition",
          title: "Aproximación lineal",
          md: "Para $x$ cerca de $a$:\n\n$$f(x) \\approx f(a) + f'(a)\\,(x - a)$$\n\nEl lado derecho es justo la recta tangente en $x = a$.",
        },
        {
          type: "example",
          title: "Una raíz sin calculadora",
          problem: "Aproxima $\\sqrt{4{,}1}$.",
          steps: [
            "Usamos $f(x) = \\sqrt{x}$ cerca de $a = 4$, porque ahí la raíz es exacta: $f(4) = 2$.",
            "$f'(x) = \\frac{1}{2\\sqrt{x}}$, así que $f'(4) = \\frac{1}{4}$.",
            "$\\sqrt{4{,}1} \\approx 2 + \\frac{1}{4}(0{,}1) = 2{,}025$.",
            "El valor real es $2{,}02485\\dots$ La diferencia aparece recién en la cuarta cifra decimal.",
          ],
        },
        {
          type: "example",
          title: "Leer la aproximación en una gráfica",
          problem: "La gráfica de $f$ pasa por $(5, 20)$ y su recta tangente en ese punto corta al eje $y$ en $5$. Aproxima $f(6)$.",
          steps: [
            "La tangente pasa por $(0, 5)$ y $(5, 20)$. Su pendiente es $\\frac{20 - 5}{5 - 0} = 3$, así que $f'(5) = 3$.",
            "$f(6) \\approx f(5) + f'(5)(6 - 5) = 20 + 3 = 23$.",
            "Como la curva es cóncava hacia abajo, queda por debajo de la tangente y el valor real es un poco menor que $23$.",
          ],
        },
        {
          type: "graph",
          spec: {
            x: [-1, 9],
            y: [-3, 30],
            step: 5,
            curves: [
              { fn: "-0.3(x-5)^{2}+3x+5", domain: [0, 9], color: "accent", label: "f" },
              { fn: "3x+5", color: "orange", dashed: true, label: "tangente" },
            ],
            points: [
              { x: 5, y: 20, label: "(5, 20)" },
              { x: 6, y: 23, color: "orange", label: "23" },
              { x: 0, y: 5, color: "orange" },
            ],
          },
          caption: "La tangente en $x = 5$ sirve para estimar $f(6)$.",
        },
        {
          type: "note",
          tone: "econ",
          title: "El costo de una unidad más",
          md: "Con $\\Delta q = 1$ la aproximación lineal dice $C(q + 1) - C(q) \\approx C'(q)$. Por eso el costo marginal $C'(q)$ se interpreta como el costo aproximado de producir una unidad adicional.",
        },
      ],
    },
    {
      id: "diferencial",
      title: "Incremento y diferencial",
      blocks: [
        {
          type: "text",
          md: "Cuando $x$ pasa de $x_0$ a $x_0 + \\Delta x$, la función cambia en una cantidad exacta llamada incremento. Si en vez de moverte sobre la curva te mueves sobre la tangente, el cambio se llama diferencial. El diferencial es fácil de calcular y, si $\\Delta x$ es pequeño, se parece mucho al incremento.",
        },
        {
          type: "definition",
          title: "Incremento, diferencial y error",
          md: "- **Incremento (cambio real):** $\\Delta y = f(x_0 + \\Delta x) - f(x_0)$.\n- **Diferencial (cambio sobre la tangente):** $dy = f'(x_0)\\,dx$, con $dx = \\Delta x$.\n- **Error de la aproximación:** $|\\Delta y - dy|$.",
        },
        {
          type: "graph",
          spec: {
            x: [-0.5, 3],
            y: [-0.5, 5],
            step: 1,
            curves: [
              { fn: "x^{2}", color: "accent" },
              { fn: "2x - 1", color: "orange", dashed: true },
            ],
            segments: [
              { from: [1, 1], to: [2, 1], color: "muted", dashed: true },
              { from: [2, 1], to: [2, 3], color: "orange" },
              { from: [2.08, 1], to: [2.08, 4], color: "blue" },
            ],
            points: [
              { x: 1, y: 1, label: "(1, 1)" },
              { x: 2, y: 4 },
              { x: 2, y: 3, color: "orange" },
            ],
            labels: [
              { x: 1.5, y: 0.7, text: "$dx$" },
              { x: 1.75, y: 2.2, text: "$dy$", color: "orange" },
              { x: 2.3, y: 2.6, text: "$\\Delta y$", color: "blue" },
            ],
          },
          caption: "Con $f(x) = x^2$, $x_0 = 1$ y $dx = 1$: el cambio sobre la tangente es $dy = 2$ y el cambio real es $\\Delta y = 3$.",
        },
        {
          type: "example",
          title: "Paso pequeño",
          problem: "Para $f(x) = x^{2}$, compara $\\Delta y$ y $dy$ cuando $x$ pasa de $3$ a $3{,}1$.",
          steps: [
            "$\\Delta y = f(3{,}1) - f(3) = 9{,}61 - 9 = 0{,}61$.",
            "$dy = f'(3)\\cdot 0{,}1 = 6 \\cdot 0{,}1 = 0{,}6$.",
            "Error: $|0{,}61 - 0{,}6| = 0{,}01$. Muy pequeño.",
          ],
        },
        {
          type: "example",
          title: "Paso grande, como en un parcial",
          problem: "Sea $h(x) = (2x - 8)e^{\\sqrt{x + 5}}$. La variable disminuye de $x = 4$ a $x = -1$. Calcula la variación real, su aproximación con el diferencial y el error.",
          steps: [
            "$\\Delta x = -1 - 4 = -5$.",
            "Variación real: $h(-1) = -10e^{2}$ y $h(4) = 0$, así que $\\Delta y = -10e^{2} \\approx -73{,}9$.",
            "$h'(x) = 2e^{\\sqrt{x+5}} + (2x - 8)e^{\\sqrt{x+5}}\\dfrac{1}{2\\sqrt{x+5}}$. En $x = 4$ el segundo término se anula: $h'(4) = 2e^{3}$.",
            "Diferencial: $dy = 2e^{3}\\cdot(-5) = -10e^{3} \\approx -200{,}9$. Significa que, según la tangente, la función bajaría unas 201 unidades.",
            "Error: $|\\Delta y - dy| = 10e^{3} - 10e^{2} \\approx 127$. El error es enorme porque un salto de 5 unidades no es un cambio pequeño.",
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "dy no es el cambio real",
          md: "$dy$ es una estimación y $\\Delta y$ es lo que de verdad pasa. Si te piden la variación de la función, calcula $\\Delta y$. Si te piden una aproximación, usa $dy$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Para $f(x) = x^{3}$ en $x = 2$ con $dx = 0{,}1$, calcula el diferencial.",
            parts: [{ kind: "expr", before: "dy =", answer: "1.2", mistakes: [{ answer: "1.261", feedback: "Ese es el incremento real $\\Delta y$. El diferencial es $f'(2)\\,dx$." }] }],
            solution: ["$f'(x) = 3x^{2}$, $f'(2) = 12$. $dy = 12 \\cdot 0{,}1 = 1{,}2$."],
          },
        },
      ],
    },
  ],
  exercises: [
    vfTangente,
    tangentePolinomio,
    pendienteEnPunto,
    horizontalVertice,
    tangenteLnExp,
    normal,
    pendienteDada,
    ubicarTangencia,
    aproximacion,
    paralelaRecta,
    tangenteParalelaPlano,
    incrementoDiferencial,
    tangenteCorteEje,
    horizontalCuadrante,
  ],
};

export default topic;
