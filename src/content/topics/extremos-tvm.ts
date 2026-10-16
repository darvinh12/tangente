import { meta } from "../catalog";
import { choice, trueFalse } from "../helpers";
import type { ExerciseGen, Mistake, Rich, Topic } from "../types";
import { intersect, iv, signSolve, unionTex, type Interval } from "@/lib/math/intervals";
import { evaluate, parse } from "@/lib/math/parse";
import { fmt, frac, num, poly } from "@/lib/math/tex";
import type { Rng } from "@/lib/math/rng";

/* ----------------------------- utilidades locales ----------------------------- */

/** Evalúa un polinomio dado por coeficientes de mayor a menor grado. */
const pval = (c: number[], x: number) => c.reduce((acc, k) => acc * x + k, 0);
/** Coeficiente pegado: 1 -> "", -1 -> "-" */
const cf = (k: number) => (k === 1 ? "" : k === -1 ? "-" : fmt(k));
/** "x - 3", "x + 2", "x" */
const xm = (a: number) => (a === 0 ? "x" : a > 0 ? `x - ${fmt(a)}` : `x + ${fmt(-a)}`);
/** Factor lineal: 0 -> "x", 3 -> "(x - 3)" */
const fx = (a: number) => (a === 0 ? "x" : `(${xm(a)})`);
/** Número entre paréntesis si es negativo. */
const par = (n: number) => (n < 0 ? `(${fmt(n)})` : fmt(n));
/** Suma de números con signos limpios, sin los ceros: [16, -8, 0] -> "16 - 8" */
const sumTex = (xs: number[]) => {
  const t = xs.filter((x) => x !== 0);
  if (!t.length) return "0";
  return t.map((x, i) => (i === 0 ? fmt(x) : x < 0 ? `- ${fmt(-x)}` : `+ ${fmt(x)}`)).join(" ");
};
/** Coeficiente decimal pegado: 1 -> "", 0.5 -> "0{,}5" */
const cfn = (k: number) => (k === 1 ? "" : num(k));
/** e^{r}: 0 -> "e^{0}", 1 -> "e" */
const eT = (r: number) => (r === 1 ? "e" : `e^{${r}}`);
/** v·e^{r} escrito limpio. */
const expTex = (v: number, r: number) => (v === 0 ? "0" : r === 0 ? fmt(v) : `${cf(v)}e${r === 1 ? "" : `^{${r}}`}`);

function value(tex: string): number {
  try {
    return evaluate(parse(tex));
  } catch {
    return NaN;
  }
}

/** Quita errores típicos que coinciden con la respuesta o entre sí. */
function clean(answer: string, ms: Mistake[]): Mistake[] {
  const seen = [value(answer)];
  const out: Mistake[] = [];
  for (const m of ms) {
    const v = value(m.answer);
    if (Number.isNaN(v) || seen.some((s) => Math.abs(s - v) < 1e-9)) continue;
    seen.push(v);
    out.push(m);
  }
  return out;
}

/**
 * Cúbica con puntos críticos p < q: f'(x) = 3a(x - p)(x - q).
 * Devuelve los coeficientes enteros de f.
 */
function cubicWithCritical(r: Rng, range: [number, number], aChoices: number[]) {
  for (;;) {
    const a = r.pick(aChoices);
    const p = r.int(range[0], range[1] - 1);
    const q = r.int(p + 1, range[1]);
    if (Math.abs(a) % 2 === 1 && (p + q) % 2 !== 0) continue;
    const d = r.int(-4, 4);
    const coefs = [a, (-3 * a * (p + q)) / 2, 3 * a * p * q, d];
    return { a, p, q, d, coefs };
  }
}

const ivTex = (I: Interval[]) => unionTex(I);

/* ----------------------------------- ejercicios ----------------------------------- */

const puntosCriticos: ExerciseGen = {
  id: "puntos-criticos",
  title: "Puntos críticos de una cúbica",
  level: 1,
  generate: (r) => {
    const doble = r.bool(0.2);
    let coefs: number[], crit: number[], dTex: string, fac: string;
    if (doble) {
      const a = r.pick([1, -1, 2]);
      const p = r.int(-3, 3);
      const d = r.int(-4, 4);
      coefs = [a, -3 * a * p, 3 * a * p * p, -a * p ** 3 + d];
      crit = [p];
      dTex = poly([3 * a, -6 * a * p, 3 * a * p * p]);
      fac = `${cf(3 * a)}${fx(p)}^{2}`;
    } else {
      const c = cubicWithCritical(r, [-4, 4], [1, -1, 2, -2]);
      coefs = c.coefs;
      crit = [c.p, c.q];
      dTex = poly([3 * c.a, -3 * c.a * (c.p + c.q), 3 * c.a * c.p * c.q]);
      fac = `${cf(3 * c.a)}${fx(c.p)}${fx(c.q)}`;
    }
    return {
      statement: `Halla los puntos críticos de primer orden de $f(x) = ${poly(coefs)}$.`,
      parts: [
        {
          kind: "set",
          before: "x \\in",
          answer: crit,
          mistakes: doble || crit[0] === -crit[1] ? [] : [{ answer: crit.map((x) => -x), feedback: "Revisa los signos al factorizar. Si el factor es $(x - p)$, la raíz es $p$, no $-p$." }],
        },
      ],
      hints: ["Deriva, iguala a cero y resuelve.", "Saca factor común el coeficiente principal y factoriza el trinomio que queda."],
      solution: [
        `$f'(x) = ${dTex}$.`,
        `Factorizando, $f'(x) = ${fac}$.`,
        crit.length === 1
          ? `Se anula solo en $x = ${crit[0]}$. Como $f$ es un polinomio, la derivada existe en todo punto, así que ese es el único punto crítico.`
          : `Se anula en $x = ${crit[0]}$ y $x = ${crit[1]}$. La derivada existe en todo $\\mathbb{R}$, así que no hay otros puntos críticos.`,
      ],
    };
  },
};

const crecimientoDesdeDerivada: ExerciseGen = {
  id: "crecimiento-desde-derivada",
  title: "Leer el crecimiento en la derivada",
  level: 1,
  generate: (r) => {
    const fam = r.pick(["cuad", "exp"] as const);
    const want = r.pick(["creciente", "decreciente"] as const);
    let dTex: string, ans: Interval[], other: Interval[], why: string;
    const op = want === "creciente" ? ">" : "<";
    const opOther = want === "creciente" ? "<" : ">";
    if (fam === "cuad") {
      const k = r.pick([1, -1, 2, -2, 3]);
      const p = r.int(-5, 3);
      const q = r.int(p + 1, 5);
      dTex = `${cf(k)}${fx(p)}${fx(q)}`;
      ans = signSolve([{ root: p }, { root: q }], k, op);
      other = signSolve([{ root: p }, { root: q }], k, opOther);
      why = `Las raíces son $${p}$ y $${q}$. ${k > 0 ? "Con coeficiente positivo" : "Con coeficiente negativo"} la derivada es ${k > 0 ? "positiva fuera" : "negativa fuera"} de las raíces y ${k > 0 ? "negativa" : "positiva"} entre ellas.`;
    } else {
      const k = r.pick([1, -1, 2, -3]);
      const p = r.int(-4, 4);
      const s = r.pick([1, -1]);
      dTex = `${cf(k)}${fx(p)}e^{${s === 1 ? "x" : "-x"}}`;
      ans = signSolve([{ root: p }], k, op);
      other = signSolve([{ root: p }], k, opOther);
      why = `La exponencial siempre es positiva, así que el signo de $f'$ es el de $${cf(k)}${fx(p)}$, que cambia en $x = ${p}$.`;
    }
    return {
      statement: `La derivada de una función $f$ es $f'(x) = ${dTex}$. ¿En qué intervalos es $f$ ${want}? Usa intervalos abiertos.`,
      parts: [{ kind: "interval", answer: ans, mistakes: [{ answer: other, feedback: `Ahí la derivada es ${want === "creciente" ? "negativa, así que $f$ decrece" : "positiva, así que $f$ crece"}. Revisa el signo de cada factor.` }] }],
      hints: [
        `$f$ es ${want} donde $f'(x) ${want === "creciente" ? ">" : "<"} 0$.`,
        "Haz una tabla de signos con las raíces de cada factor.",
      ],
      solution: [why, `$f$ es ${want} en $${ivTex(ans)}$.`],
    };
  },
};

const tvmCuadratica: ExerciseGen = {
  id: "tvm-cuadratica",
  title: "El punto del valor medio en una parábola",
  level: 1,
  generate: (r) => {
    const al = r.pick([1, -1, 2, -2, 3]);
    const be = r.int(-6, 6);
    const ga = r.int(-5, 5);
    const a = r.int(-4, 2);
    const b = a + r.int(2, 5);
    const co = [al, be, ga];
    const fa = pval(co, a);
    const fb = pval(co, b);
    const m = (fb - fa) / (b - a);
    const c = frac(a + b, 2);
    return {
      statement: `Halla el valor de $c$ que garantiza el teorema del valor medio para $f(x) = ${poly(co)}$ en $[${a}, ${b}]$.`,
      parts: [{
        kind: "expr",
        before: "c =",
        answer: c,
        mistakes: clean(c, [
          { answer: fmt(m), feedback: "Ese número es la pendiente de la secante, $f'(c)$. Falta despejar $c$ de $f'(c) = $ esa pendiente." },
          { answer: "0", feedback: "$c$ tiene que estar dentro de $(a, b)$ y cumplir $f'(c) = \\frac{f(b) - f(a)}{b - a}$." },
        ]),
      }],
      hints: ["Calcula la pendiente de la secante: $\\frac{f(b) - f(a)}{b - a}$.", `Iguala $f'(c) = ${poly([2 * al, be], "c")}$ a esa pendiente y despeja.`],
      solution: [
        `$f(${a}) = ${fa}$ y $f(${b}) = ${fb}$. La pendiente de la secante es $\\dfrac{${fb} - ${par(fa)}}{${b} - ${par(a)}} = ${fmt(m)}$.`,
        `$f'(x) = ${poly([2 * al, be])}$, así que $${poly([2 * al, be], "c")} = ${fmt(m)}$.`,
        `Despejando, $c = ${c}$, que está dentro de $(${a}, ${b})$. En una parábola el punto siempre es el centro del intervalo.`,
      ],
    };
  },
};

const VF: { s: string; v: boolean; why: string }[] = [
  { s: "Si $f'(a) = 0$, entonces $f$ tiene un máximo o un mínimo local en $a$.", v: false, why: "$f(x) = x^{3}$ cumple $f'(0) = 0$ y no tiene extremo en $0$: crece a los dos lados." },
  { s: "Si $f$ es derivable en $a$ y tiene un mínimo local en $a$, entonces $f'(a) = 0$.", v: true, why: "Es el teorema de los extremos locales: en un extremo donde hay derivada, la tangente es horizontal." },
  { s: "Una función puede tener un extremo local en un punto donde no es derivable.", v: true, why: "$f(x) = |x|$ tiene un mínimo en $0$ y no es derivable allí. Por eso los puntos donde $f'$ no existe también son críticos." },
  { s: "La función $f(x) = |x|$ cumple las hipótesis del teorema de Rolle en $[-1, 1]$.", v: false, why: "Es continua y $f(-1) = f(1)$, pero no es derivable en $x = 0$. Falla una hipótesis, y de hecho no hay ningún $c$ con $f'(c) = 0$." },
  { s: "Si $f'(x) = 0$ para todo $x$ de $(a, b)$, entonces $f$ es constante en $(a, b)$.", v: true, why: "Es un corolario del TVM: para dos puntos cualesquiera, $f(x_2) - f(x_1) = f'(c)(x_2 - x_1) = 0$." },
  { s: "Si $f$ es continua en $[a, b]$, alcanza un máximo y un mínimo absolutos en $[a, b]$.", v: true, why: "Es el teorema de Weierstrass. Por eso en un intervalo cerrado siempre hay extremos absolutos." },
  { s: "Un mínimo local siempre es menor que cualquier máximo local de la misma función.", v: false, why: "$f(x) = x + \\frac{4}{x}$ tiene un máximo local de valor $-4$ en $x = -2$ y un mínimo local de valor $4$ en $x = 2$." },
  { s: "El teorema del valor medio asegura que hay exactamente un $c$ con $f'(c) = \\frac{f(b) - f(a)}{b - a}$.", v: false, why: "Asegura que hay al menos uno. Puede haber varios." },
];

const vfTeoria: ExerciseGen = {
  id: "vf-teoria",
  title: "Verdadero o falso sobre extremos y valor medio",
  level: 1,
  generate: (r) => {
    const it = r.pick(VF);
    return {
      statement: `${it.s} ¿Verdadero o falso?`,
      parts: [trueFalse(it.v, it.why)],
      hints: ["Busca un contraejemplo sencillo, como $x^{3}$ o $|x|$."],
      solution: [`${it.v ? "Verdadero" : "Falso"}. ${it.why}`],
    };
  },
};

const clasificarExtremos: ExerciseGen = {
  id: "clasificar-extremos",
  title: "Máximo y mínimo local de una cúbica",
  level: 2,
  generate: (r) => {
    const { a, p, q, coefs } = cubicWithCritical(r, [-3, 3], [1, -1, 2, -2]);
    const maxX = a > 0 ? p : q;
    const minX = a > 0 ? q : p;
    const fmax = pval(coefs, maxX);
    const fmin = pval(coefs, minX);
    const signs = a > 0 ? ["+", "-", "+"] : ["-", "+", "-"];
    return {
      statement: `Para $f(x) = ${poly(coefs)}$, halla el máximo local y el mínimo local con el criterio de la primera derivada.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "¿En qué $x$ está el máximo local?", before: "x =", answer: String(maxX), mistakes: clean(String(maxX), [{ answer: String(minX), feedback: "Ahí la derivada pasa de negativa a positiva: es un mínimo." }]) },
        { kind: "expr", prompt: "¿Cuánto vale el máximo local?", before: `f(${maxX}) =`, answer: String(fmax) },
        { kind: "expr", prompt: "¿En qué $x$ está el mínimo local?", before: "x =", answer: String(minX) },
        { kind: "expr", prompt: "¿Cuánto vale el mínimo local?", before: `f(${minX}) =`, answer: String(fmin) },
      ],
      hints: [
        "Deriva, factoriza y halla los puntos críticos.",
        "Estudia el signo de $f'$ a la izquierda y a la derecha de cada punto crítico.",
        "Para el valor, sustituye el punto en $f$, no en $f'$.",
      ],
      solution: [
        `$f'(x) = ${poly([3 * a, -3 * a * (p + q), 3 * a * p * q])} = ${cf(3 * a)}${fx(p)}${fx(q)}$. Puntos críticos: $x = ${p}$ y $x = ${q}$.`,
        `Signo de $f'$: $${signs[0]}$ en $(-\\infty, ${p})$, $${signs[1]}$ en $(${p}, ${q})$ y $${signs[2]}$ en $(${q}, +\\infty)$.`,
        `En $x = ${maxX}$ la derivada pasa de $+$ a $-$: máximo local, $f(${maxX}) = ${fmax}$.`,
        `En $x = ${minX}$ la derivada pasa de $-$ a $+$: mínimo local, $f(${minX}) = ${fmin}$.`,
      ],
    };
  },
};

const intervalosCrecimiento: ExerciseGen = {
  id: "intervalos-crecimiento",
  title: "Intervalos de crecimiento con dominio restringido",
  level: 2,
  generate: (r) => {
    const fam = r.pick(["inv", "exp", "log"] as const);
    const k = r.int(1, 3);
    let f: string, d: string, inc: Interval[], dec: Interval[], steps: string[];
    if (fam === "inv") {
      f = `x + \\frac{${k * k}}{x}`;
      d = `1 - \\frac{${k * k}}{x^{2}} = \\frac{(x - ${k})(x + ${k})}{x^{2}}`;
      const fs = [{ root: -k }, { root: k }, { root: 0, mult: 2, den: true }];
      inc = signSolve(fs, 1, ">");
      dec = signSolve(fs, 1, "<");
      steps = [
        "El dominio es $\\mathbb{R} - \\{0\\}$.",
        `$f'(x) = ${d}$. Puntos críticos: $x = \\pm ${k}$. El $0$ no es crítico porque no está en el dominio, pero sí separa intervalos.`,
        `El denominador $x^{2}$ es positivo, así que el signo lo da $(x - ${k})(x + ${k})$: positivo fuera de $[-${k}, ${k}]$ y negativo dentro.`,
      ];
    } else if (fam === "exp") {
      const kk = r.pick([1, 2]);
      f = kk === 1 ? "x^{2}e^{-x}" : "x^{2}e^{-\\frac{x}{2}}";
      d = kk === 1 ? "(2x - x^{2})e^{-x} = -x(x - 2)e^{-x}" : "\\left(2x - \\frac{x^{2}}{2}\\right)e^{-\\frac{x}{2}} = -\\frac{1}{2}x(x - 4)e^{-\\frac{x}{2}}";
      const fs = [{ root: 0 }, { root: 2 * kk }];
      inc = signSolve(fs, -1, ">");
      dec = signSolve(fs, -1, "<");
      steps = [
        "El dominio es $\\mathbb{R}$.",
        `Por la regla del producto, $f'(x) = ${d}$. Puntos críticos: $x = 0$ y $x = ${2 * kk}$.`,
        "La exponencial es positiva. El factor que queda es una parábola abierta hacia abajo, positiva entre sus raíces.",
      ];
    } else {
      f = `x^{2} - ${2 * k * k}\\ln x`;
      d = `2x - \\frac{${2 * k * k}}{x} = \\frac{2(x - ${k})(x + ${k})}{x}`;
      const dom = [iv(0, Infinity)];
      const fs = [{ root: -k }, { root: k }, { root: 0, den: true }];
      inc = intersect(signSolve(fs, 1, ">"), dom);
      dec = intersect(signSolve(fs, 1, "<"), dom);
      steps = [
        "El logaritmo exige $x > 0$, así que el dominio es $(0, +\\infty)$.",
        `$f'(x) = ${d}$. La raíz $x = -${k}$ queda fuera del dominio, así que el único punto crítico es $x = ${k}$.`,
        `Para $0 < x < ${k}$ la derivada es negativa y para $x > ${k}$ es positiva.`,
      ];
    }
    return {
      statement: `Determina los intervalos de crecimiento y de decrecimiento de $f(x) = ${f}$. Usa intervalos abiertos.`,
      parts: [
        {
          kind: "interval",
          prompt: "$f$ es creciente en",
          answer: inc,
          mistakes: fam === "log" ? [{ answer: signSolve([{ root: -k }, { root: k }, { root: 0, den: true }], 1, ">"), feedback: "Incluiste valores negativos, pero ahí $\\ln x$ no existe. Todo tiene que estar dentro del dominio." }] : [],
        },
        {
          kind: "interval",
          prompt: "$f$ es decreciente en",
          answer: dec,
          mistakes: fam === "inv" ? [{ answer: [iv(-k, k)], feedback: "El $0$ no está en el dominio, así que el intervalo se parte en dos." }] : [],
        },
      ],
      hints: ["Empieza por el dominio.", "Deriva, factoriza y haz la tabla de signos solo dentro del dominio."],
      solution: [...steps, `Creciente en $${ivTex(inc)}$. Decreciente en $${ivTex(dec)}$.`],
    };
  },
};

const absolutosCerrado: ExerciseGen = {
  id: "absolutos-cerrado",
  title: "Extremos absolutos en un intervalo cerrado",
  level: 2,
  generate: (r) => {
    const { p, q, coefs } = cubicWithCritical(r, [-2, 2], [1, -1]);
    const solo = r.bool(0.35) && q - p >= 2;
    const loF = solo ? r.int(p + 1, q - 1) : p - r.int(1, 2);
    const hi = q + r.int(1, 2);
    const cands = [loF, hi, ...[p, q].filter((c) => c > loF && c < hi)].sort((x, y) => x - y);
    const vals = cands.map((x) => pval(coefs, x));
    const M = Math.max(...vals);
    const m = Math.min(...vals);
    const critIn = [p, q].filter((c) => c > loF && c < hi);
    return {
      statement: `Halla el máximo y el mínimo absolutos de $f(x) = ${poly(coefs)}$ en el intervalo $[${loF}, ${hi}]$.`,
      parts: [
        { kind: "expr", prompt: "Valor máximo absoluto", answer: String(M) },
        { kind: "expr", prompt: "Valor mínimo absoluto", answer: String(m) },
      ],
      hints: [
        "Los candidatos son los puntos críticos que caen dentro del intervalo y los dos extremos del intervalo.",
        "Evalúa $f$ en cada candidato y compara.",
      ],
      solution: [
        `$f'(x) = ${poly([3 * coefs[0], 2 * coefs[1], coefs[2]])}$, con raíces $x = ${p}$ y $x = ${q}$.`,
        critIn.length === 2
          ? "Los dos puntos críticos están dentro del intervalo."
          : `Solo $x = ${critIn[0]}$ está dentro del intervalo. El otro punto crítico no cuenta.`,
        `Valores: ${cands.map((x, i) => `$f(${x}) = ${vals[i]}$`).join(", ")}.`,
        `El mayor es $${M}$ y el menor es $${m}$.`,
      ],
    };
  },
};

const tvmC: ExerciseGen = {
  id: "tvm-c",
  title: "Hallar el punto del valor medio",
  level: 2,
  generate: (r) => {
    const fam = r.pick(["inv", "raiz", "ln", "cubo"] as const);
    let f: string, a: string, b: string, slope: string, eq: string, ans: string;
    if (fam === "inv") {
      const [x1, x2] = r.pick([[1, 4], [1, 9], [2, 8], [4, 9], [1, 16], [3, 12], [2, 18], [4, 16]]);
      f = "\\frac{1}{x}";
      a = String(x1);
      b = String(x2);
      slope = frac(-1, x1 * x2);
      eq = `-\\frac{1}{c^{2}} = ${slope} \\Rightarrow c^{2} = ${x1 * x2}`;
      ans = String(Math.sqrt(x1 * x2));
    } else if (fam === "raiz") {
      const [m, n] = r.pick([[0, 2], [1, 3], [0, 4], [2, 4], [1, 5], [3, 5], [0, 6], [2, 6]]);
      f = "\\sqrt{x}";
      a = String(m * m);
      b = String(n * n);
      slope = frac(1, m + n);
      eq = `\\frac{1}{2\\sqrt{c}} = ${slope} \\Rightarrow \\sqrt{c} = ${frac(m + n, 2)}`;
      ans = String(((m + n) / 2) ** 2);
    } else if (fam === "ln") {
      const k = r.int(1, 3);
      f = "\\ln x";
      a = "1";
      b = k === 1 ? "e" : `e^{${k}}`;
      slope = `\\frac{${k}}{${b} - 1}`;
      eq = `\\frac{1}{c} = ${slope}`;
      ans = k === 1 ? "e - 1" : `\\frac{e^{${k}} - 1}{${k}}`;
    } else {
      const k = r.pick([1, 2, 3, 6]);
      f = "x^{3}";
      a = "0";
      b = String(k);
      slope = String(k * k);
      eq = `3c^{2} = ${k * k} \\Rightarrow c^{2} = ${frac(k * k, 3)}`;
      ans = `\\frac{${k}}{\\sqrt{3}}`;
    }
    return {
      statement: `La función $f(x) = ${f}$ cumple las hipótesis del teorema del valor medio en $[${a}, ${b}]$. Halla el $c$ que garantiza el teorema.`,
      parts: [{
        kind: "expr",
        before: "c =",
        answer: ans,
        mistakes: clean(ans, [{ answer: slope, feedback: "Esa es la pendiente de la secante, el valor de $f'(c)$. Falta despejar $c$." }]),
      }],
      hints: ["Calcula la pendiente de la secante entre los extremos.", "Iguala $f'(c)$ a esa pendiente y despeja. Quédate con la solución que cae dentro del intervalo."],
      solution: [
        `La pendiente de la secante es $\\dfrac{f(${b}) - f(${a})}{${b} - ${a}} = ${slope}$.`,
        `Igualamos con la derivada: $${eq}$.`,
        `La solución dentro del intervalo es $c = ${ans}$.`,
      ],
    };
  },
};

const rolleHipotesis: ExerciseGen = {
  id: "rolle-hipotesis",
  title: "¿Se puede aplicar Rolle?",
  level: 2,
  generate: (r) => {
    const m = r.int(1, 4);
    return {
      statement: "Solo una de estas funciones cumple las hipótesis del teorema de Rolle en el intervalo indicado. Identifícala y halla el $c$ correspondiente.",
      sequential: true,
      parts: [
        choice(`$f(x) = x^{2} - ${2 * m}x$ en $[0, ${2 * m}]$`, [
          [`$f(x) = |x - ${m}|$ en $[${m - 1}, ${m + 1}]$`, `Los valores en los extremos coinciden, pero no es derivable en $x = ${m}$, donde tiene un pico.`],
          [`$f(x) = \\frac{1}{(x - ${m})^{2}}$ en $[${m - 1}, ${m + 1}]$`, `No está definida en $x = ${m}$, así que no es continua en el intervalo.`],
          [`$f(x) = x^{2} + ${m}x$ en $[0, ${m}]$`, `Es continua y derivable, pero $f(0) = 0$ y $f(${m}) = ${2 * m * m}$ no son iguales.`],
        ]),
        { kind: "expr", prompt: "Halla el $c$ con $f'(c) = 0$.", before: "c =", answer: String(m) },
      ],
      hints: ["Revisa las tres hipótesis: continua en $[a, b]$, derivable en $(a, b)$ y $f(a) = f(b)$.", "Para el $c$, deriva e iguala a cero."],
      solution: [
        `$f(x) = x^{2} - ${2 * m}x$ es un polinomio, así que es continua y derivable. Además $f(0) = 0$ y $f(${2 * m}) = 0$.`,
        `$f'(c) = 2c - ${2 * m} = 0$ da $c = ${m}$, que está en $(0, ${2 * m})$.`,
      ],
    };
  },
};

const MONO = [
  { f: "e^{kx}g(x)", cond: "positiva y creciente", ans: 0, why: "$f'(x) = e^{kx}\\left(kg(x) + g'(x)\\right)$. La exponencial es positiva, $kg(x) > 0$ y $g'(x) > 0$, así que $f'(x) > 0$." },
  { f: "e^{-kx}g(x)", cond: "positiva y decreciente", ans: 1, why: "$f'(x) = e^{-kx}\\left(g'(x) - kg(x)\\right)$. Como $g'(x) < 0$ y $-kg(x) < 0$, la suma es negativa y $f'(x) < 0$." },
  { f: "e^{-kx}g(x)", cond: "positiva y creciente", ans: 2, why: "$f'(x) = e^{-kx}\\left(g'(x) - kg(x)\\right)$. Aquí $g'(x) > 0$ pero $-kg(x) < 0$, y sin más datos no se sabe cuál pesa más." },
  { f: "\\left(g(x)\\right)^{2}", cond: "positiva y creciente", ans: 0, why: "$f'(x) = 2g(x)g'(x)$. Con $g > 0$ y $g' > 0$ el producto es positivo." },
  { f: "\\left(g(x)\\right)^{2}", cond: "negativa y creciente", ans: 1, why: "$f'(x) = 2g(x)g'(x)$. Con $g < 0$ y $g' > 0$ el producto es negativo." },
  { f: "\\frac{1}{g(x)}", cond: "positiva y creciente", ans: 1, why: "$f'(x) = -\\frac{g'(x)}{g(x)^{2}}$. El numerador $g'$ es positivo y hay un signo menos delante." },
];
const MONO_END = ["Por lo tanto $f$ es creciente.", "Por lo tanto $f$ es decreciente.", "Por lo tanto no se puede asegurar si crece o decrece."];

const monotoniaProducto: ExerciseGen = {
  id: "monotonia-producto",
  title: "Demostrar la monotonía de una función compuesta",
  level: 2,
  generate: (r) => {
    const it = r.pick(MONO);
    const k = r.int(1, 4);
    const sub = (s: string) => s.replace(/\{-kx\}/g, `{-${k === 1 ? "" : k}x}`).replace(/\{kx\}/g, `{${k === 1 ? "" : k}x}`).replace(/kg\(x\)/g, `${k === 1 ? "" : k}g(x)`);
    const opts = ["$f$ es creciente", "$f$ es decreciente", "No se puede asegurar"];
    const why = sub(it.why);
    return {
      statement: `Sea $g$ una función derivable, ${it.cond} en todo su dominio (con $g'(x) > 0$ si es creciente y $g'(x) < 0$ si es decreciente). ¿Qué se puede asegurar de $f(x) = ${sub(it.f)}$?`,
      parts: [{
        kind: "choice",
        shuffle: false,
        options: opts.map((o, i) => ({ label: o, correct: i === it.ans, feedback: i === it.ans ? undefined : why })),
      }],
      hints: ["Deriva $f$ con la regla del producto, del cociente o de la cadena.", "Analiza el signo de cada factor de $f'$ con lo que sabes de $g$ y $g'$."],
      solution: [why, MONO_END[it.ans]],
    };
  },
};

const estudioMonotonia: ExerciseGen = {
  id: "estudio-monotonia",
  title: "Crecimiento y extremos de una exponencial (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const r1 = r.int(-4, 1);
    const r2 = r.int(r1 + 1, 3);
    const b = -(r1 + r2) - 2;
    const c = r1 * r2 - b;
    const P = [1, b, c];
    const v1 = pval(P, r1);
    const v2 = pval(P, r2);
    const fmax = expTex(v1, r1);
    const fmin = expTex(v2, r2);
    const inc = signSolve([{ root: r1 }, { root: r2 }], 1, ">");
    const dec = [iv(r1, r2)];
    return {
      statement: `Sea $f(x) = (${poly(P)})e^{x}$. Determina los intervalos de crecimiento y decrecimiento y los extremos locales.`,
      sequential: true,
      parts: [
        { kind: "interval", prompt: "Intervalos donde $f$ es creciente", answer: inc, mistakes: [{ answer: dec, feedback: "Ese es el intervalo donde $f' < 0$, es decir donde decrece." }] },
        { kind: "interval", prompt: "Intervalo donde $f$ es decreciente", answer: dec },
        { kind: "expr", prompt: "Abscisa del máximo local", before: "x =", answer: String(r1), mistakes: clean(String(r1), [{ answer: String(r2), feedback: "En ese punto $f'$ pasa de negativa a positiva: es el mínimo." }]) },
        { kind: "expr", prompt: "Valor del máximo local", before: `f(${r1}) =`, answer: fmax, mistakes: clean(fmax, [{ answer: String(v1), feedback: `Te faltó el factor $e^{${r1}}$.` }]) },
        { kind: "expr", prompt: "Abscisa del mínimo local", before: "x =", answer: String(r2) },
        { kind: "expr", prompt: "Valor del mínimo local", before: `f(${r2}) =`, answer: fmin },
      ],
      hints: [
        "Usa la regla del producto: $(u e^{x})' = (u' + u)e^{x}$.",
        "Como $e^{x} > 0$, el signo de $f'$ es el del polinomio que la acompaña.",
        "Para los valores, sustituye en $f$ y deja la respuesta en términos de $e$.",
      ],
      solution: [
        `$f'(x) = (${poly([2, b])})e^{x} + (${poly(P)})e^{x} = (${poly([1, b + 2, b + c])})e^{x}$.`,
        `Factorizando, $f'(x) = ${fx(r1)}${fx(r2)}e^{x}$. Puntos críticos: $x = ${r1}$ y $x = ${r2}$.`,
        `$f' > 0$ en $${unionTex(inc)}$, donde $f$ crece, y $f' < 0$ en $(${r1}, ${r2})$, donde decrece.`,
        `Máximo local en $x = ${r1}$: $f(${r1}) = (${sumTex([r1 * r1, b * r1, c])})${eT(r1)} = ${fmax}$.`,
        `Mínimo local en $x = ${r2}$: $f(${r2}) = (${sumTex([r2 * r2, b * r2, c])})${eT(r2)} = ${fmin}$.`,
      ],
    };
  },
};

const costoPromedio: ExerciseGen = {
  id: "costo-promedio",
  title: "Costo promedio mínimo (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const [a, q] = r.pick([[1, 10], [2, 5], [0.5, 20], [0.1, 50], [0.25, 40], [0.2, 30], [1, 15], [0.5, 30]] as [number, number][]);
    const F = a * q * q;
    const b = r.int(2, 12);
    const cp = 2 * a * q + b;
    const aT = num(a);
    return {
      statement: `El costo total de producir $q$ unidades es $C(q) = ${aT === "1" ? "" : aT}q^{2} + ${b}q + ${num(F)}$ (en dólares, valores de ejemplo). Halla el nivel de producción que minimiza el costo promedio.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Cantidad que minimiza el costo promedio", before: "q =", answer: String(q), mistakes: clean(String(q), [{ answer: num(F), feedback: "Revisa el despeje: $q^{2} = \\frac{F}{a}$, falta sacar raíz." }]) },
        { kind: "expr", prompt: "Costo promedio mínimo", before: "\\overline{C} =", answer: num(cp), mistakes: clean(num(cp), [{ answer: num(a * q * q + b * q + F), feedback: "Ese es el costo total. El costo promedio es $\\frac{C(q)}{q}$." }]) },
        choice("Son iguales", [
          ["El costo marginal es mayor", `Calcula $C'(${q}) = ${num(2 * a)}\\cdot ${q} + ${b}$ y compáralo.`],
          ["El costo marginal es menor", `Calcula $C'(${q}) = ${num(2 * a)}\\cdot ${q} + ${b}$ y compáralo.`],
        ], `En $q = ${q}$, ¿cómo se comparan el costo marginal $C'(q)$ y el costo promedio?`),
      ],
      hints: [
        "El costo promedio es $\\overline{C}(q) = \\frac{C(q)}{q}$. Divide cada término entre $q$.",
        "Deriva $\\overline{C}$, iguala a cero y quédate con la solución positiva.",
      ],
      solution: [
        `$\\overline{C}(q) = ${aT === "1" ? "" : aT}q + ${b} + \\dfrac{${num(F)}}{q}$.`,
        `$\\overline{C}'(q) = ${aT} - \\dfrac{${num(F)}}{q^{2}} = 0$, de donde $q^{2} = ${num(q * q)}$ y $q = ${q}$.`,
        `Para $q < ${q}$ la derivada es negativa y para $q > ${q}$ es positiva: es un mínimo.`,
        `$\\overline{C}(${q}) = ${num(a * q)} + ${b} + ${num(F / q)} = ${num(cp)}$ dólares por unidad.`,
        `El costo marginal es $C'(q) = ${cfn(2 * a)}q + ${b}$, y $C'(${q}) = ${num(cp)}$. En el mínimo del costo promedio los dos coinciden.`,
      ],
    };
  },
};

const utilidadMaxima: ExerciseGen = {
  id: "utilidad-maxima",
  title: "Utilidad máxima de un monopolista (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const B = r.pick([1, 2, 3, 0.5]);
    const q = r.pick([10, 15, 20, 25, 30, 40]);
    const c = r.pick([5, 10, 12, 20, 25]);
    const A = c + 2 * B * q;
    const F = r.pick([50, 100, 150, 200]);
    const U = B * q * q - F;
    const p = A - B * q;
    const BT = num(B);
    return {
      statement: `Un monopolista enfrenta la demanda $p = ${A} - ${BT === "1" ? "" : BT}q$ y su costo total es $C(q) = ${c}q + ${F}$ (valores de ejemplo). Halla la producción que maximiza la utilidad, el precio y la utilidad máxima.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Cantidad que maximiza la utilidad", before: "q =", answer: String(q), mistakes: clean(String(q), [{ answer: num(A / (2 * B)), feedback: "Esa cantidad maximiza el ingreso, no la utilidad. Falta restar el costo." }]) },
        { kind: "expr", prompt: "Precio de venta", before: "p =", answer: num(p), mistakes: clean(num(p), [{ answer: num(A), feedback: "Sustituye la cantidad óptima en la demanda." }]) },
        { kind: "expr", prompt: "Utilidad máxima", before: "U =", answer: num(U), mistakes: clean(num(U), [{ answer: num(p * q), feedback: "Ese es el ingreso. La utilidad es ingreso menos costo." }]) },
      ],
      hints: [
        "El ingreso es precio por cantidad: $I(q) = p \\cdot q$. La utilidad es $U(q) = I(q) - C(q)$.",
        "Deriva $U$, iguala a cero y comprueba que es un máximo.",
      ],
      solution: [
        `$I(q) = (${A} - ${BT === "1" ? "" : BT}q)q = ${A}q - ${BT === "1" ? "" : BT}q^{2}$.`,
        `$U(q) = ${A}q - ${BT === "1" ? "" : BT}q^{2} - ${c}q - ${F} = ${A - c}q - ${BT === "1" ? "" : BT}q^{2} - ${F}$.`,
        `$U'(q) = ${A - c} - ${num(2 * B)}q = 0$, así que $q = ${q}$. Como $U'$ pasa de positiva a negativa, es un máximo.`,
        `Precio: $p = ${A} - ${B === 1 ? q : `${num(B)} \\cdot ${q}`} = ${num(p)}$.`,
        `Utilidad: $U(${q}) = ${num((A - c) * q)} - ${num(B * q * q)} - ${F} = ${num(U)}$.`,
        `En el óptimo el ingreso marginal $${A} - ${num(2 * B)}q$ vale $${c}$, igual al costo marginal.`,
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("extremos-tvm"),
  objectives: [
    "Hallar los puntos críticos de primer orden de una función.",
    "Determinar los intervalos de crecimiento y decrecimiento con el signo de la derivada.",
    "Clasificar extremos locales con el criterio de la primera derivada y hallar extremos absolutos en un intervalo cerrado.",
    "Enunciar e interpretar los teoremas de Rolle y del valor medio, y hallar el punto $c$ que garantizan.",
    "Resolver problemas económicos de optimización: ingreso, utilidad y costo promedio.",
  ],
  sections: [
    {
      id: "crecimiento",
      title: "Crecimiento y signo de la derivada",
      blocks: [
        {
          type: "text",
          md: "La derivada es la pendiente de la recta tangente. Si en un tramo todas las tangentes suben, la función sube. Si todas bajan, la función baja. Mueve el punto sobre la curva y mira cómo el signo de la pendiente coincide con lo que hace la gráfica.",
        },
        {
          type: "widget",
          widget: { kind: "tangent", fn: "x^{3} - 3x", x: [-3, 3], y: [-4, 4], showAnalysis: true, derivative: "3x^{2} - 3" },
          caption: "$f(x) = x^{3} - 3x$. La pendiente es positiva antes de $x = -1$ y después de $x = 1$, y negativa entre los dos.",
        },
        {
          type: "definition",
          title: "Signo de la derivada y monotonía",
          md: "Sea $f$ derivable en el intervalo $(a, b)$.\n\n- Si $f'(x) > 0$ para todo $x \\in (a, b)$, $f$ es **creciente** en $(a, b)$.\n- Si $f'(x) < 0$ para todo $x \\in (a, b)$, $f$ es **decreciente** en $(a, b)$.\n- Si $f'(x) = 0$ para todo $x \\in (a, b)$, $f$ es **constante** en $(a, b)$.\n\nEstos resultados salen del teorema del valor medio, que verás más abajo.",
        },
        {
          type: "example",
          title: "Intervalos de crecimiento",
          problem: "Halla los intervalos de crecimiento y decrecimiento de $f(x) = x^{3} - 3x$.",
          steps: [
            "Derivamos: $f'(x) = 3x^{2} - 3 = 3(x - 1)(x + 1)$.",
            "Las raíces $x = -1$ y $x = 1$ parten la recta en tres tramos. Hacemos la tabla de signos de abajo.",
            "$f' > 0$ en $(-\\infty, -1)$ y en $(1, +\\infty)$. $f' < 0$ en $(-1, 1)$.",
          ],
          answer: "Creciente en $(-\\infty, -1) \\cup (1, +\\infty)$, decreciente en $(-1, 1)$.",
        },
        {
          type: "table",
          headers: ["", "$(-\\infty, -1)$", "$(-1, 1)$", "$(1, +\\infty)$"],
          rows: [
            ["$x + 1$", "$-$", "$+$", "$+$"],
            ["$x - 1$", "$-$", "$-$", "$+$"],
            ["$f'(x)$", "$+$", "$-$", "$+$"],
            ["$f$", "crece", "decrece", "crece"],
          ],
        },
        {
          type: "example",
          title: "Demostrar que una función crece (pregunta de parcial)",
          problem: "Sea $g$ una función derivable, positiva y creciente. Demuestra que $f(x) = e^{x}g(x)$ es creciente.",
          steps: [
            "Por la regla del producto, $f'(x) = e^{x}g(x) + e^{x}g'(x) = e^{x}\\left(g(x) + g'(x)\\right)$.",
            "$e^{x} > 0$ siempre. $g(x) > 0$ por hipótesis, y como $g$ es creciente, $g'(x) \\ge 0$.",
            "Entonces $g(x) + g'(x) > 0$ y $f'(x) > 0$ en todo el dominio, así que $f$ es creciente.",
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "Primero el dominio",
          md: "Los intervalos de crecimiento tienen que estar dentro del dominio. En $f(x) = x^{2} - 8\\ln x$ la derivada $\\frac{2(x-2)(x+2)}{x}$ se anula en $x = -2$, pero ese punto no cuenta porque $\\ln x$ solo existe para $x > 0$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿En qué intervalo es decreciente $f(x) = x^{2} - 4x$?",
            parts: [{ kind: "interval", answer: [iv(-Infinity, 2)] }],
            solution: ["$f'(x) = 2x - 4$, que es negativa cuando $x < 2$. Decrece en $(-\\infty, 2)$."],
          },
        },
      ],
    },
    {
      id: "puntos-criticos",
      title: "Extremos locales y puntos críticos",
      blocks: [
        {
          type: "text",
          md: "Piensa en la gráfica como el perfil de una montaña. Una cima es un **máximo local**: el punto más alto comparado con sus vecinos, aunque más allá haya cimas más altas. Un valle es un **mínimo local**.",
        },
        {
          type: "definition",
          title: "Máximo y mínimo local",
          md: "$f$ tiene un **máximo local** en $a$ si existe $\\delta > 0$ tal que $f(x) \\le f(a)$ para todo $x \\in (a - \\delta, a + \\delta)$.\n\n$f$ tiene un **mínimo local** en $b$ si existe $\\delta > 0$ tal que $f(x) \\ge f(b)$ para todo $x \\in (b - \\delta, b + \\delta)$.\n\nEl número $f(a)$ es el valor máximo local y $a$ es el punto donde se alcanza.",
        },
        {
          type: "definition",
          title: "Punto crítico de primer orden",
          md: "Un punto $a$ del dominio de $f$ es **punto crítico de primer orden** si $f'(a) = 0$ o si $f'(a)$ no existe.\n\nSi $f$ es derivable en $a$ y tiene un extremo local en $a$, entonces $f'(a) = 0$: en una cima o en un valle suave la tangente es horizontal. Por eso los extremos se buscan entre los puntos críticos.",
        },
        {
          type: "note",
          tone: "warning",
          title: "El recíproco es falso",
          md: "Que $f'(a) = 0$ no garantiza un extremo. Con $f(x) = x^{3}$ se tiene $f'(0) = 0$, pero la función crece a los dos lados del $0$. Los puntos críticos son solo candidatos.",
        },
        {
          type: "graph",
          spec: { x: [-2, 2], y: [-3, 3], curves: [{ fn: "x^{3}", color: "accent" }], points: [{ x: 0, y: 0, label: "f'(0) = 0" }] },
          caption: "$f(x) = x^{3}$ tiene tangente horizontal en el origen, pero no tiene extremo allí.",
        },
        {
          type: "example",
          title: "Un punto crítico que no es extremo",
          problem: "Halla los puntos críticos de $f(x) = x^{3} - 3x^{2} + 3x - 2$.",
          steps: [
            "$f'(x) = 3x^{2} - 6x + 3 = 3(x - 1)^{2}$.",
            "Se anula solo en $x = 1$, que es el único punto crítico.",
            "Pero $3(x - 1)^{2} \\ge 0$ a los dos lados de $1$. La función crece antes y después, así que en $x = 1$ no hay ni máximo ni mínimo.",
          ],
        },
        {
          type: "example",
          title: "Un punto crítico sin derivada",
          problem: "Halla los puntos críticos de $f(x) = |x - 2|$.",
          steps: [
            "Para $x > 2$, $f'(x) = 1$. Para $x < 2$, $f'(x) = -1$. Nunca vale cero.",
            "En $x = 2$ las derivadas laterales no coinciden, así que $f'(2)$ no existe. $x = 2$ es punto crítico.",
            "Allí la función pasa de decrecer a crecer: tiene un mínimo local, $f(2) = 0$.",
          ],
        },
        {
          type: "quick",
          exercise: {
            statement: "Halla los puntos críticos de $f(x) = x^{3} - 12x$.",
            parts: [{ kind: "set", before: "x \\in", answer: [-2, 2] }],
            solution: ["$f'(x) = 3x^{2} - 12 = 3(x - 2)(x + 2)$, que se anula en $x = \\pm 2$."],
          },
        },
      ],
    },
    {
      id: "primera-derivada",
      title: "Criterio de la primera derivada",
      blocks: [
        {
          type: "text",
          md: "Para saber qué pasa en un punto crítico basta mirar el signo de la derivada justo antes y justo después. Si la función subía y empieza a bajar, pasó por una cima.",
        },
        {
          type: "definition",
          title: "Criterio de la primera derivada",
          md: "Sea $a$ un punto crítico de $f$, con $f$ continua en $a$ y derivable cerca de $a$ (no hace falta que lo sea en $a$).\n\n- Si $f'$ pasa de **positiva a negativa** en $a$, $f$ tiene un **máximo local** en $a$.\n- Si $f'$ pasa de **negativa a positiva** en $a$, $f$ tiene un **mínimo local** en $a$.\n- Si $f'$ no cambia de signo, no hay extremo en $a$.",
        },
        {
          type: "example",
          title: "Máximo y mínimo de una cúbica",
          problem: "Halla los extremos locales de $f(x) = x^{3} - 6x^{2} + 9x + 1$.",
          steps: [
            "$f'(x) = 3x^{2} - 12x + 9 = 3(x - 1)(x - 3)$. Puntos críticos: $x = 1$ y $x = 3$.",
            "Signo de $f'$: positivo en $(-\\infty, 1)$, negativo en $(1, 3)$, positivo en $(3, +\\infty)$.",
            "En $x = 1$ pasa de $+$ a $-$: máximo local, $f(1) = 1 - 6 + 9 + 1 = 5$.",
            "En $x = 3$ pasa de $-$ a $+$: mínimo local, $f(3) = 27 - 54 + 27 + 1 = 1$.",
          ],
          answer: "Máximo local en $(1, 5)$ y mínimo local en $(3, 1)$.",
        },
        {
          type: "graph",
          spec: {
            x: [-1, 5],
            y: [-3, 8],
            curves: [{ fn: "x^{3} - 6x^{2} + 9x + 1", color: "accent" }],
            points: [{ x: 1, y: 5, label: "máx (1, 5)", color: "red" }, { x: 3, y: 1, label: "mín (3, 1)", color: "blue" }],
          },
        },
        {
          type: "example",
          title: "Con un punto fuera del dominio",
          problem: "Halla los extremos locales de $f(x) = x + \\dfrac{4}{x}$.",
          steps: [
            "El dominio es $\\mathbb{R} - \\{0\\}$.",
            "$f'(x) = 1 - \\dfrac{4}{x^{2}} = \\dfrac{(x - 2)(x + 2)}{x^{2}}$. Puntos críticos: $x = -2$ y $x = 2$.",
            "Signo de $f'$: $+$ en $(-\\infty, -2)$, $-$ en $(-2, 0)$, $-$ en $(0, 2)$, $+$ en $(2, +\\infty)$.",
            "Máximo local en $x = -2$ con $f(-2) = -4$. Mínimo local en $x = 2$ con $f(2) = 4$.",
          ],
        },
        {
          type: "note",
          tone: "idea",
          title: "Local no es absoluto",
          md: "En el ejemplo anterior el máximo local vale $-4$ y el mínimo local vale $4$. El máximo es menor que el mínimo. No hay contradicción: cada uno se compara solo con sus vecinos.",
        },
        {
          type: "note",
          tone: "warning",
          title: "El 0 separa, pero no es crítico",
          md: "En $x + \\frac{4}{x}$ el $0$ no está en el dominio, así que no es punto crítico ni puede ser extremo. Igual hay que ponerlo en la tabla de signos, porque la derivada puede cambiar de signo al cruzarlo.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Si $f'$ es negativa a la izquierda de $x = 3$ y positiva a la derecha, ¿qué tiene $f$ en $x = 3$?",
            parts: [choice("Un mínimo local", [
              ["Un máximo local", "La función baja y luego sube. Eso es un valle, no una cima."],
              ["Ni máximo ni mínimo", "La derivada sí cambia de signo, así que hay extremo."],
            ])],
            solution: ["La función decrece antes de $3$ y crece después: mínimo local."],
          },
        },
      ],
    },
    {
      id: "absolutos",
      title: "Extremos absolutos en un intervalo cerrado",
      blocks: [
        {
          type: "text",
          md: "A veces interesa el valor más grande y el más pequeño en todo un intervalo, no solo entre vecinos. El teorema de Weierstrass garantiza que una función continua en un intervalo cerrado $[a, b]$ alcanza un máximo y un mínimo absolutos. Esos valores solo pueden estar en dos lugares: en un punto crítico de dentro, o en uno de los extremos del intervalo.\n\nEl procedimiento es directo:\n\n- Halla los puntos críticos que están dentro de $(a, b)$.\n- Evalúa $f$ en esos puntos y en $a$ y $b$.\n- El mayor valor es el máximo absoluto y el menor es el mínimo absoluto.",
        },
        {
          type: "example",
          title: "Cúbica en un intervalo cerrado",
          problem: "Halla los extremos absolutos de $f(x) = x^{3} - 3x$ en $[-2, 3]$.",
          steps: [
            "$f'(x) = 3(x - 1)(x + 1)$. Los puntos críticos $-1$ y $1$ están dentro del intervalo.",
            "$f(-2) = -2$, $f(-1) = 2$, $f(1) = -2$, $f(3) = 18$.",
            "El mayor es $18$, en $x = 3$. El menor es $-2$, que se alcanza en $x = -2$ y en $x = 1$.",
          ],
          answer: "Máximo absoluto $18$ y mínimo absoluto $-2$.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Capacidad limitada",
          md: "Si una planta solo puede producir entre $0$ y $100$ unidades, la producción óptima está en un punto crítico o en uno de los límites. Cuando la utilidad sigue creciendo en $q = 100$, lo mejor es producir a plena capacidad, aunque la derivada no sea cero allí.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Halla el máximo absoluto de $f(x) = x^{2} - 4x + 1$ en $[0, 5]$.",
            parts: [{ kind: "expr", answer: "6", mistakes: [{ answer: "-3", feedback: "Ese es el mínimo, en el vértice $x = 2$. El máximo está en un extremo del intervalo." }, { answer: "1", feedback: "Compara también con $f(5)$." }] }],
            solution: ["Punto crítico: $x = 2$, con $f(2) = -3$. En los extremos, $f(0) = 1$ y $f(5) = 6$. El máximo absoluto es $6$."],
          },
        },
      ],
    },
    {
      id: "rolle-tvm",
      title: "Teoremas de Rolle y del valor medio",
      blocks: [
        {
          type: "text",
          md: "Si en un viaje recorres 240 km en 3 horas, tu velocidad media fue de 80 km/h. Aunque hayas ido más rápido y más lento, en algún instante el velocímetro marcó exactamente 80. Eso es el teorema del valor medio: la tasa instantánea alcanza en algún momento a la tasa media.",
        },
        {
          type: "definition",
          title: "Teorema de Rolle",
          md: "Si $f$ es continua en $[a, b]$, derivable en $(a, b)$ y $f(a) = f(b)$, entonces existe al menos un $c \\in (a, b)$ tal que $f'(c) = 0$.",
        },
        {
          type: "definition",
          title: "Teorema del valor medio (TVM)",
          md: "Si $f$ es continua en $[a, b]$ y derivable en $(a, b)$, existe al menos un $c \\in (a, b)$ tal que\n\n$$f'(c) = \\frac{f(b) - f(a)}{b - a}$$",
        },
        {
          type: "text",
          md: "**Lectura geométrica.** El cociente $\\frac{f(b) - f(a)}{b - a}$ es la pendiente de la secante que une $(a, f(a))$ con $(b, f(b))$. El teorema dice que en algún punto intermedio la tangente es paralela a esa secante. Rolle es el caso en que la secante es horizontal.\n\n**Lectura analítica.** El cociente es la variación media de $f$ en $[a, b]$ y $f'(c)$ es la variación instantánea en $c$. En algún punto las dos coinciden.",
        },
        {
          type: "graph",
          spec: {
            x: [-0.5, 2.5],
            y: [-1, 5],
            curves: [{ fn: "x^{2}", color: "accent" }, { fn: "2x - 1", color: "orange", dashed: true, domain: [-0.3, 2.5] }],
            segments: [{ from: [0, 0], to: [2, 4], color: "blue" }],
            points: [{ x: 0, y: 0, label: "a" }, { x: 2, y: 4, label: "b" }, { x: 1, y: 1, label: "c = 1", color: "orange" }],
          },
          caption: "$f(x) = x^{2}$ en $[0, 2]$. La secante tiene pendiente $2$ y la tangente en $c = 1$ también.",
        },
        {
          type: "example",
          title: "Hallar el c del TVM",
          problem: "Verifica el TVM para $f(x) = x^{3}$ en $[0, 3]$ y halla $c$.",
          steps: [
            "$f$ es un polinomio: continua y derivable en todas partes. Se cumplen las hipótesis.",
            "Pendiente de la secante: $\\dfrac{27 - 0}{3 - 0} = 9$.",
            "$f'(c) = 3c^{2} = 9$ da $c^{2} = 3$, es decir $c = \\pm\\sqrt{3}$.",
            "Solo $c = \\sqrt{3} \\approx 1{,}73$ está dentro de $(0, 3)$.",
          ],
          answer: "$c = \\sqrt{3}$",
        },
        {
          type: "example",
          title: "Rolle en una parábola",
          problem: "Verifica Rolle para $f(x) = x^{2} - 4x + 3$ en $[1, 3]$.",
          steps: [
            "Es un polinomio, así que es continua y derivable. Además $f(1) = 0$ y $f(3) = 0$.",
            "$f'(c) = 2c - 4 = 0$ da $c = 2$, que está en $(1, 3)$.",
          ],
          answer: "$c = 2$",
        },
        {
          type: "note",
          tone: "warning",
          title: "Sin hipótesis no hay teorema",
          md: "$f(x) = |x|$ en $[-1, 1]$ cumple $f(-1) = f(1) = 1$, pero su derivada vale $-1$ o $1$, nunca $0$. No contradice a Rolle: la función no es derivable en $x = 0$ y falla una hipótesis.",
        },
        {
          type: "note",
          tone: "idea",
          title: "De dónde salen los criterios de crecimiento",
          md: "El TVM se demuestra aplicando Rolle a $h(x) = f(x) - \\frac{f(b) - f(a)}{b - a}(x - a)$, que cumple $h(a) = h(b) = f(a)$.\n\nA su vez, el TVM justifica el criterio de crecimiento. Si $f' > 0$ y $x_1 < x_2$, existe $c$ entre ellos con $f(x_2) - f(x_1) = f'(c)(x_2 - x_1) > 0$. Por eso $f(x_2) > f(x_1)$ y la función crece.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Tasa media y tasa instantánea",
          md: "Si la producción de una planta pasó de 100 a 180 unidades en 4 horas, la tasa media fue de 20 unidades por hora. Si la producción varía de forma continua y derivable, el TVM asegura que en algún instante la tasa de producción fue exactamente 20 unidades por hora.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Halla el $c$ del teorema de Rolle para $f(x) = x^{2} - 6x$ en $[0, 6]$.",
            parts: [{ kind: "expr", before: "c =", answer: "3" }],
            solution: ["$f(0) = f(6) = 0$. $f'(c) = 2c - 6 = 0$ da $c = 3$."],
          },
        },
      ],
    },
    {
      id: "optimizacion",
      title: "Problemas de optimización en economía",
      blocks: [
        {
          type: "text",
          md: "Maximizar la utilidad o minimizar el costo es buscar un extremo. El procedimiento siempre es el mismo:\n\n- Escribe la función que quieres optimizar en una sola variable.\n- Fija el dominio con sentido económico, por ejemplo $q \\ge 0$.\n- Deriva, iguala a cero y despeja.\n- Comprueba con el criterio de la primera derivada que es un máximo o un mínimo.\n- Responde lo que se pregunta, con unidades.",
        },
        {
          type: "example",
          title: "Ingreso máximo",
          problem: "La demanda de un producto es $p = 80 - 2q$. ¿Qué cantidad maximiza el ingreso?",
          steps: [
            "Ingreso es precio por cantidad: $I(q) = (80 - 2q)q = 80q - 2q^{2}$.",
            "$I'(q) = 80 - 4q = 0$ da $q = 20$.",
            "$I'$ es positiva para $q < 20$ y negativa para $q > 20$: es un máximo.",
            "El precio es $p = 80 - 40 = 40$ y el ingreso máximo $I(20) = 800$.",
          ],
        },
        {
          type: "example",
          title: "Costo promedio mínimo",
          problem: "El costo de producir $q$ unidades es $C(q) = 0{,}1q^{2} + 3q + 250$ (valores de ejemplo). ¿Qué producción minimiza el costo promedio?",
          steps: [
            "Costo promedio: $\\overline{C}(q) = \\dfrac{C(q)}{q} = 0{,}1q + 3 + \\dfrac{250}{q}$.",
            "$\\overline{C}'(q) = 0{,}1 - \\dfrac{250}{q^{2}} = 0$ da $q^{2} = 2500$, es decir $q = 50$.",
            "Para $q < 50$ la derivada es negativa y para $q > 50$ es positiva: es un mínimo.",
            "$\\overline{C}(50) = 5 + 3 + 5 = 13$ por unidad.",
          ],
        },
        {
          type: "note",
          tone: "econ",
          title: "El costo marginal corta al promedio en su mínimo",
          md: "En el ejemplo, $C'(q) = 0{,}2q + 3$ y $C'(50) = 13$, igual al costo promedio mínimo. No es casualidad: mientras producir una unidad más cueste menos que el promedio, el promedio baja. Cuando cuesta más, sube.",
        },
        {
          type: "example",
          title: "Utilidad máxima",
          problem: "Con demanda $p = 100 - q$ y costo $C(q) = 20q + 500$, halla la producción que maximiza la utilidad.",
          steps: [
            "$U(q) = I(q) - C(q) = 100q - q^{2} - 20q - 500 = 80q - q^{2} - 500$.",
            "$U'(q) = 80 - 2q = 0$ da $q = 40$. La derivada pasa de positiva a negativa: es un máximo.",
            "Precio: $p = 60$. Utilidad: $U(40) = 3200 - 1600 - 500 = 1100$.",
          ],
        },
        {
          type: "note",
          tone: "econ",
          title: "Ingreso marginal igual a costo marginal",
          md: "Igualar $U'(q) = 0$ es lo mismo que pedir $I'(q) = C'(q)$. En el ejemplo, $I'(40) = 100 - 80 = 20$ y $C'(40) = 20$. Es la regla clásica de la empresa que maximiza su utilidad.",
        },
        {
          type: "quick",
          exercise: {
            statement: "La demanda es $p = 60 - 3q$. ¿Qué cantidad maximiza el ingreso?",
            parts: [{ kind: "expr", before: "q =", answer: "10", mistakes: [{ answer: "20", feedback: "Ahí el precio es cero y el ingreso también. Deriva $I(q) = 60q - 3q^{2}$." }] }],
            solution: ["$I(q) = 60q - 3q^{2}$, $I'(q) = 60 - 6q = 0$ da $q = 10$."],
          },
        },
      ],
    },
  ],
  exercises: [
    puntosCriticos,
    crecimientoDesdeDerivada,
    tvmCuadratica,
    vfTeoria,
    clasificarExtremos,
    intervalosCrecimiento,
    absolutosCerrado,
    tvmC,
    rolleHipotesis,
    monotoniaProducto,
    estudioMonotonia,
    costoPromedio,
    utilidadMaxima,
  ],
};

export default topic;
