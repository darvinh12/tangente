import { meta } from "../catalog";
import { choice } from "../helpers";
import type { ExerciseGen, Mistake, Rich, Topic } from "../types";
import { iv, signSolve, unionTex, type Interval } from "@/lib/math/intervals";
import { evaluate, parse } from "@/lib/math/parse";
import { fmt, frac, gcd, poly } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

type Special = "inf" | "-inf" | "dne";
const SP: Special[] = ["inf", "-inf", "dne"];

const pval = (c: number[], x: number) => c.reduce((acc, k) => acc * x + k, 0);
const dpoly = (c: number[]) => c.slice(0, -1).map((k, i) => k * (c.length - 1 - i));
/** Coeficiente pegado: 1 -> "", -1 -> "-" */
const cf = (k: number) => (k === 1 ? "" : k === -1 ? "-" : fmt(k));
/** "x - 3", "x + 2", "x" */
const xm = (a: number) => (a === 0 ? "x" : a > 0 ? `x - ${fmt(a)}` : `x + ${fmt(-a)}`);
/** Factor lineal: 0 -> "x", 3 -> "(x - 3)" */
const fx = (a: number) => (a === 0 ? "x" : `(${xm(a)})`);
/** e^{r}: 1 -> "e" */
const eT = (r: number) => (r === 1 ? "e" : `e^{${r}}`);
/** v·e^{r} limpio. */
const expTex = (v: number, r: number) => (v === 0 ? "0" : r === 0 ? fmt(v) : `${cf(v)}${eT(r)}`);

/** Raíz cuadrada simplificada: 12 -> 2\sqrt{3}, 9 -> 3 */
function sqrtTex(n: number): string {
  let k = 1;
  for (let i = 2; i * i <= n; i++) if (n % (i * i) === 0) k = i;
  const m = n / (k * k);
  if (m === 1) return String(k);
  return `${k === 1 ? "" : k}\\sqrt{${m}}`;
}

function value(tex: string): number {
  try {
    return evaluate(parse(tex));
  } catch {
    return NaN;
  }
}

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

/** Signo de g en cada intervalo que dejan los puntos ordenados (se prueba en un punto interior). */
function signsOn(pts: number[], g: (x: number) => number): (1 | -1)[] {
  const test = [pts[0] - 1, ...pts.slice(1).map((b, i) => (pts[i] + b) / 2), pts[pts.length - 1] + 1];
  return test.map((x) => (g(x) > 0 ? 1 : -1));
}

/* ----------------------------------- ejercicios ----------------------------------- */

const asintotasRacional: ExerciseGen = {
  id: "asintotas-racional",
  title: "Asíntotas de una función racional",
  level: 1,
  generate: (r) => {
    const a = r.pick([1, 2, 3, -1, -2]);
    const c = r.nz(-4, 4);
    let b: number;
    do b = r.int(-6, 6); while (a * c + b === 0);
    const f = `\\frac{${poly([a, b])}}{${xm(c)}}`;
    return {
      statement: `Halla la asíntota vertical y la asíntota horizontal de $f(x) = ${f}$.`,
      parts: [
        { kind: "expr", prompt: "Asíntota vertical", before: "x =", answer: String(c), mistakes: clean(String(c), [{ answer: String(-c), feedback: `El denominador se anula cuando $${xm(c)} = 0$, es decir en $x = ${c}$.` }]) },
        { kind: "expr", prompt: "Asíntota horizontal", before: "y =", answer: String(a), mistakes: clean(String(a), [{ answer: "0", feedback: "La horizontal es $y = 0$ solo cuando el grado de arriba es menor. Aquí los grados son iguales." }, { answer: frac(b, -c), feedback: "Ese es el corte con el eje $y$. Para la horizontal mira el límite cuando $x \\to \\pm\\infty$." }]) },
      ],
      hints: ["La vertical está donde se anula el denominador y no el numerador.", "Con grados iguales arriba y abajo, la horizontal es el cociente de los coeficientes principales."],
      solution: [
        `El denominador se anula en $x = ${c}$, donde el numerador vale $${a * c + b} \\neq 0$. Asíntota vertical $x = ${c}$.`,
        `$\\lim_{x \\to \\pm\\infty} f(x) = \\frac{${a}}{1} = ${a}$. Asíntota horizontal $y = ${a}$.`,
      ],
    };
  },
};

const cortesEjes: ExerciseGen = {
  id: "cortes-ejes",
  title: "Cortes con los ejes",
  level: 1,
  generate: (r) => {
    let p: number, q: number, rr: number;
    do {
      p = r.int(-5, 4);
      q = r.int(p + 1, 5);
      rr = r.nz(-5, 5);
    } while (rr === p || rr === q);
    const f = `\\frac{${poly([1, -(p + q), p * q])}}{${xm(rr)}}`;
    const y0 = frac(-p * q, rr);
    return {
      statement: `Halla los cortes de $f(x) = ${f}$ con los ejes.`,
      parts: [
        { kind: "set", prompt: "Abscisas de los cortes con el eje $x$", before: "x \\in", answer: [p, q], mistakes: [{ answer: [p, q, rr], feedback: `En $x = ${rr}$ la función no existe. Ahí hay una asíntota, no un corte.` }] },
        { kind: "expr", prompt: "Ordenada del corte con el eje $y$", before: "f(0) =", answer: y0, mistakes: clean(y0, [{ answer: frac(p * q, rr), feedback: "Revisa el signo del denominador al sustituir $x = 0$." }, { answer: String(p * q), feedback: "Te faltó dividir entre el denominador evaluado en $0$." }]) },
      ],
      hints: ["Corte con el eje $x$: $f(x) = 0$, o sea, el numerador vale cero (y el denominador no).", "Corte con el eje $y$: sustituye $x = 0$."],
      solution: [
        `El numerador se factoriza como $${fx(p)}${fx(q)}$, que se anula en $x = ${p}$ y $x = ${q}$. Ninguno anula el denominador.`,
        `$f(0) = \\dfrac{${p * q}}{${-rr}} = ${y0}$. El corte con el eje $y$ es $(0, ${y0})$.`,
      ],
    };
  },
};

const SIM: { f: (k: number) => string; t: 0 | 1 | 2; why: (k: number) => string }[] = [
  { f: (k) => `\\frac{x}{x^{2} + ${k}}`, t: 1, why: () => "Al cambiar $x$ por $-x$ el numerador cambia de signo y el denominador no: $f(-x) = -f(x)$." },
  { f: (k) => `\\frac{x^{2}}{x^{2} + ${k}}`, t: 0, why: () => "Solo aparece $x^{2}$, que no cambia al poner $-x$: $f(-x) = f(x)$." },
  { f: (k) => `x^{3} - ${cf(k)}x`, t: 1, why: (k) => `Todas las potencias son impares: $f(-x) = -x^{3} + ${cf(k)}x = -f(x)$.` },
  { f: (k) => `e^{-\\frac{x^{2}}{${k}}}`, t: 0, why: () => "Depende solo de $x^{2}$: $f(-x) = f(x)$." },
  { f: (k) => `x^{4} - ${cf(k)}x^{2}`, t: 0, why: () => "Solo hay potencias pares: $f(-x) = f(x)$." },
  { f: (k) => `\\frac{x + ${k}}{x^{2} + 1}`, t: 2, why: (k) => `$f(-x) = \\frac{-x + ${k}}{x^{2} + 1}$, que no es ni $f(x)$ ni $-f(x)$.` },
  { f: (k) => `${cf(k)}xe^{x}`, t: 2, why: (k) => `$f(-x) = -${cf(k)}xe^{-x}$, que no coincide con $f(x)$ ni con $-f(x)$.` },
  { f: (k) => `\\frac{x^{3}}{x^{2} - ${k}}`, t: 1, why: () => "Numerador impar y denominador par: el cociente es impar." },
];
const SIM_LABELS = ["Par", "Impar", "Ni par ni impar"];

const simetria: ExerciseGen = {
  id: "simetria",
  title: "Simetría",
  level: 1,
  generate: (r) => {
    const it = r.pick(SIM);
    const k = r.int(1, 6);
    const why = it.why(k);
    return {
      statement: `¿Qué simetría tiene $f(x) = ${it.f(k)}$?`,
      parts: [{ kind: "choice", shuffle: false, options: SIM_LABELS.map((l, i) => ({ label: l, correct: i === it.t, feedback: i === it.t ? undefined : why })) }],
      hints: ["Calcula $f(-x)$ y compárala con $f(x)$ y con $-f(x)$.", "Par: simétrica respecto al eje $y$. Impar: simétrica respecto al origen."],
      solution: [why, `La función es ${SIM_LABELS[it.t].toLowerCase()}.`],
    };
  },
};

const asintotaDeLimites: ExerciseGen = {
  id: "asintota-de-limites",
  title: "La asíntota oblicua a partir de límites",
  level: 1,
  generate: (r) => {
    const q = r.pick([1, 2, 3]);
    const p = r.nz(-3, 3);
    const t = q * r.nz(-3, 3);
    const m = frac(p, q);
    const n = (-p * t) / q;
    const side = r.pick(["-\\infty", "+\\infty"]);
    return {
      statement: `Una función cumple $$\\begin{aligned} &\\lim_{x \\to ${side}} \\frac{f(x)}{x} = ${m} \\\\ &\\lim_{x \\to ${side}} \\left[f(x) ${p < 0 ? "+" : "-"} ${frac(Math.abs(p), q) === "1" ? "" : frac(Math.abs(p), q)}x\\right] = ${n} \\end{aligned}$$ Escribe su asíntota oblicua, de la forma $y = mx + n$, y halla dónde corta al eje $x$.`,
      parts: [
        { kind: "expr", before: "m =", answer: m },
        { kind: "expr", before: "n =", answer: String(n) },
        { kind: "expr", prompt: "La asíntota corta al eje $x$ en", before: "x =", answer: String(t), mistakes: clean(String(t), [{ answer: String(-t), feedback: "Revisa el despeje de $mx + n = 0$: $x = -\\frac{n}{m}$." }]) },
      ],
      hints: ["La pendiente $m$ es el primer límite y la ordenada $n$ el segundo.", "Para el corte con el eje $x$ resuelve $mx + n = 0$."],
      solution: [
        `Por definición de asíntota oblicua, $m = ${m}$ y $n = ${n}$. La recta es $y = ${m === "1" ? "" : m === "-1" ? "-" : m}x ${n < 0 ? "-" : "+"} ${Math.abs(n)}$.`,
        `$${m === "1" ? "" : m === "-1" ? "-" : m}x ${n < 0 ? "-" : "+"} ${Math.abs(n)} = 0$ da $x = ${t}$. La asíntota pasa por $(${t}, 0)$ y por $(0, ${n})$.`,
      ],
    };
  },
};

const crecimientoRacional: ExerciseGen = {
  id: "crecimiento-racional",
  title: "Extremos de una función racional acotada",
  level: 2,
  generate: (r) => {
    const k = r.int(1, 3);
    const a = r.pick([1, 2, 4, -1, -2, -4]);
    const f = `\\frac{${cf(a)}x}{x^{2} + ${k * k}}`;
    const xMax = a > 0 ? k : -k;
    const M = frac(Math.abs(a), 2 * k);
    const out = signSolve([{ root: -k }, { root: k }], 1, ">");
    const dec = a > 0 ? out : [iv(-k, k)];
    return {
      statement: `Para $f(x) = ${f}$, halla el máximo local y los intervalos de decrecimiento.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Abscisa del máximo local", before: "x =", answer: String(xMax), mistakes: clean(String(xMax), [{ answer: String(-xMax), feedback: "Ahí $f'$ pasa de negativa a positiva: es el mínimo." }]) },
        { kind: "expr", prompt: "Valor del máximo local", before: `f(${xMax}) =`, answer: M },
        { kind: "interval", prompt: "$f$ es decreciente en", answer: dec, mistakes: [{ answer: a > 0 ? [iv(-k, k)] : out, feedback: "Ahí $f' > 0$: la función crece." }] },
      ],
      hints: [
        `Usa la regla del cociente. El denominador $(x^{2} + ${k * k})^{2}$ siempre es positivo.`,
        "El signo de $f'$ lo decide el numerador.",
      ],
      solution: [
        `$f'(x) = \\dfrac{${a < 0 ? `(${a})` : a}(x^{2} + ${k * k}) - (${cf(a)}x)(2x)}{(x^{2} + ${k * k})^{2}} = \\dfrac{${cf(a)}(${k * k} - x^{2})}{(x^{2} + ${k * k})^{2}}$.`,
        `Se anula en $x = \\pm ${k}$. ${a > 0 ? `Es positiva entre $-${k}$ y $${k}$ y negativa fuera` : `Es negativa entre $-${k}$ y $${k}$ y positiva fuera`}.`,
        `Máximo local en $x = ${xMax}$: $f(${xMax}) = \\dfrac{${a * xMax}}{${2 * k * k}} = ${M}$.`,
        `Decreciente en $${unionTex(dec)}$.`,
      ],
    };
  },
};

const expEstudio: ExerciseGen = {
  id: "exp-estudio",
  title: "Estudio de una exponencial",
  level: 2,
  generate: (r) => {
    const a = r.int(-2, 3);
    const s = r.pick([1, -1]);
    const lin = s === 1 ? xm(a) : poly([-1, a]);
    const f = lin === "x" ? "xe^{x}" : `(${lin})e^{x}`;
    const xe = a - 1;
    const xi = a - 2;
    const ve = expTex(-s, xe);
    const isMin = s > 0;
    return {
      statement: `Sea $f(x) = ${f}$. Estudia su comportamiento.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Calcula $\\lim_{x \\to -\\infty} f(x)$", answer: "0", special: [...SP], mistakes: [{ answer: s > 0 ? "-\\infty" : "\\infty", feedback: "Es $\\infty \\cdot 0$. Escríbelo como cociente con $e^{-x}$ abajo y aplica L'Hôpital: la exponencial gana." }] },
        { kind: "expr", prompt: "Abscisa del extremo local", before: "x =", answer: String(xe), mistakes: clean(String(xe), [{ answer: String(xi), feedback: "Ese es el punto de inflexión, donde $f'' = 0$." }]) },
        choice(isMin ? "Mínimo" : "Máximo", [[isMin ? "Máximo" : "Mínimo", `Calcula $f''(${xe})$ y mira su signo.`]], "¿Qué tipo de extremo es?"),
        { kind: "expr", prompt: "Valor del extremo", before: `f(${xe}) =`, answer: ve },
        { kind: "expr", prompt: "Abscisa del punto de inflexión", before: "x =", answer: String(xi) },
      ],
      hints: [
        "Para el límite: $f(x) = \\dfrac{\\text{polinomio}}{e^{-x}}$ es $\\frac{\\infty}{\\infty}$.",
        "$f'(x)$ y $f''(x)$ salen con la regla del producto, y siempre queda $e^{x}$ por un polinomio de grado 1.",
      ],
      solution: [
        `$\\lim_{x \\to -\\infty} \\dfrac{${lin}}{e^{-x}}$ es $\\frac{\\infty}{\\infty}$. Por L'Hôpital queda $\\dfrac{${s}}{-e^{-x}} \\to 0$. Asíntota horizontal $y = 0$ por la izquierda.`,
        `$f'(x) = ${s > 0 ? "" : "-"}e^{x} + (${lin})e^{x} = (${s > 0 ? xm(xe) : poly([-1, xe])})e^{x}$, que se anula en $x = ${xe}$.`,
        `$f''(x) = (${s > 0 ? xm(xi) : poly([-1, xi])})e^{x}$. En $x = ${xe}$ vale $${s > 0 ? "" : "-"}${eT(xe)}$, ${isMin ? "positivo: mínimo" : "negativo: máximo"}.`,
        `$f(${xe}) = ${ve}$.`,
        `$f''$ cambia de signo en $x = ${xi}$: punto de inflexión.`,
      ],
    };
  },
};

const asintotaOblicua: ExerciseGen = {
  id: "asintota-oblicua",
  title: "Asíntota oblicua de una racional",
  level: 2,
  generate: (r) => {
    const a = r.pick([1, 2, -1]);
    const rr = r.nz(-3, 3);
    let b: number, c: number;
    do {
      b = r.int(-5, 5);
      c = r.int(-6, 6);
    } while (c + rr * (b + a * rr) === 0);
    const n = b + a * rr;
    const R = c + rr * n;
    const f = `\\frac{${poly([a, b, c])}}{${xm(rr)}}`;
    return {
      statement: `Halla las asíntotas de $f(x) = ${f}$.`,
      parts: [
        { kind: "expr", prompt: "Asíntota vertical", before: "x =", answer: String(rr) },
        { kind: "expr", prompt: "Pendiente de la asíntota oblicua", before: "m =", answer: String(a) },
        { kind: "expr", prompt: "Ordenada en el origen de la asíntota oblicua", before: "n =", answer: String(n), mistakes: clean(String(n), [{ answer: String(b), feedback: "Falta un término. Al dividir aparece también el producto con la raíz del denominador." }, { answer: String(R), feedback: "Ese es el resto de la división. La asíntota es el cociente." }]) },
      ],
      hints: [
        "El grado de arriba supera en uno al de abajo: hay asíntota oblicua.",
        "Divide el numerador entre el denominador (Ruffini). El cociente es la asíntota.",
      ],
      solution: [
        `El denominador se anula en $x = ${rr}$ y el numerador allí vale $${R} \\neq 0$: asíntota vertical $x = ${rr}$.`,
        `Dividiendo, $f(x) = ${poly([a, n])} + \\dfrac{${R}}{${xm(rr)}}$.`,
        `Cuando $x \\to \\pm\\infty$ la fracción tiende a $0$, así que la asíntota oblicua es $y = ${poly([a, n])}$.`,
      ],
    };
  },
};

const coefCuadratica: ExerciseGen = {
  id: "coeficientes-cuadratica",
  title: "Coeficientes de una parábola",
  level: 2,
  generate: (r) => {
    const a = r.pick([1, -1, 2, -2, 3]);
    const h = r.nz(-3, 3);
    const c0 = r.int(-5, 5);
    const k = c0 - a * h * h;
    const b = -2 * a * h;
    return {
      statement: `Halla $a$, $b$ y $c$ para que $f(x) = ax^{2} + bx + c$ corte al eje $y$ en $(0, ${c0})$ y tenga un extremo en $(${h}, ${k})$.`,
      sequential: true,
      parts: [
        { kind: "expr", before: "c =", answer: String(c0) },
        { kind: "expr", before: "a =", answer: String(a), mistakes: clean(String(a), [{ answer: String(-a), feedback: "Revisa el signo al despejar." }]) },
        { kind: "expr", before: "b =", answer: String(b) },
      ],
      hints: ["Cada condición es una ecuación: $f(0) = " + c0 + "$, $f'(" + h + ") = 0$ y $f(" + h + ") = " + k + "$.", "De $f'(x) = 2ax + b = 0$ sale $b$ en función de $a$."],
      solution: [
        `$f(0) = c = ${c0}$.`,
        `$f'(${h}) = ${cf(2 * h)}a + b = 0$, así que $b = ${cf(-2 * h)}a$.`,
        `$f(${h}) = ${cf(h * h)}a ${h < 0 ? "-" : "+"} ${cf(Math.abs(h))}b ${c0 < 0 ? "-" : "+"} ${Math.abs(c0)} = ${k}$. Sustituyendo $b$: $${cf(h * h)}a - ${2 * h * h}a = ${k - c0}$, es decir $${cf(-h * h)}a = ${k - c0}$ y $a = ${a}$.`,
        `Entonces $b = ${b}$ y $f(x) = ${poly([a, b, c0])}$. Como $f''(x) = ${2 * a}$ es ${a > 0 ? "positiva, el extremo es un mínimo" : "negativa, el extremo es un máximo"}.`,
      ],
    };
  },
};

const estudioG: ExerciseGen = {
  id: "estudio-completo-asintota",
  title: "Estudio completo con asíntota vertical (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    let m: number, p: number, q: number;
    do {
      m = r.pick([1, 2, 4, -1, -2, -4]);
      q = r.int(-2, 2);
      p = q + r.pick([1, 2, -1, -2]);
    } while (p === 0 && q === 0);
    const d = p - q;
    const num_ = poly([m, -m * p]);
    const g = `\\frac{${num_}}{${fx(q)}^{2}}`;
    const xc = 2 * p - q;
    const xi = 3 * p - 2 * q;
    const M = frac(m, 4 * d);
    const Mi = frac(2 * m, 9 * d);
    const isMax = m * d > 0;
    const range: Interval[] = isMax ? [iv(-Infinity, m / (4 * d), false, true)] : [iv(m / (4 * d), Infinity, true, false)];
    const g1 = poly([-m, m * xc]);
    const g2 = poly([2 * m, -2 * m * xi]);
    const vaSign = m * (q - p) > 0 ? "+\\infty" : "-\\infty";
    // Lado de la asíntota donde está el extremo y lado de afuera.
    const near = xc > q ? iv(q, xc) : iv(xc, q);
    const far = xc > q ? iv(xc, Infinity) : iv(-Infinity, xc);
    const other = xc > q ? iv(-Infinity, q) : iv(q, Infinity);
    const nearUp = isMax === xc > q;
    const growth = `$g$ ${nearUp ? "crece" : "decrece"} en $${unionTex([near])}$, ${nearUp ? "decrece" : "crece"} en $${unionTex([far])}$ y ${nearUp ? "decrece" : "crece"} en $${unionTex([other])}$.`;
    return {
      statement: `Realiza el estudio completo de $\\displaystyle g(x) = ${g}$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Asíntota vertical", before: "x =", answer: String(q) },
        { kind: "expr", prompt: "Asíntota horizontal", before: "y =", answer: "0" },
        { kind: "expr", prompt: "Corte con el eje $x$", before: "x =", answer: String(p) },
        { kind: "expr", prompt: "Abscisa del extremo local", before: "x =", answer: String(xc), mistakes: clean(String(xc), [{ answer: String(xi), feedback: "Ese es el punto de inflexión. El extremo sale de $g' = 0$." }]) },
        choice(isMax ? "Máximo local" : "Mínimo local", [[isMax ? "Mínimo local" : "Máximo local", "Mira cómo cambia el signo de $g'$ alrededor del punto."]], "¿Qué tipo de extremo es?"),
        { kind: "expr", prompt: "Valor del extremo", before: `g(${xc}) =`, answer: M },
        { kind: "expr", prompt: "Abscisa del punto de inflexión", before: "x =", answer: String(xi) },
        { kind: "interval", prompt: "Rango de $g$", answer: range, mistakes: [{ answer: [iv(-Infinity, Infinity)], feedback: "La función tiene un extremo absoluto. No toma todos los valores." }] },
      ],
      hints: [
        "La vertical está donde se anula el denominador. Como el grado de arriba es menor, la horizontal es $y = 0$.",
        "Al derivar con la regla del cociente simplifica un factor $(x - q)$ arriba y abajo.".replace("(x - q)", fx(q)),
        "Para el rango, junta lo que hace la función cerca de la asíntota vertical, en el extremo y en el infinito.",
      ],
      solution: [
        `Dominio: $\\mathbb{R} - \\{${q}\\}$. Corte con el eje $x$ en $x = ${p}$.${q !== 0 ? ` Corte con el eje $y$: $g(0) = ${frac(-m * p, q * q)}$.` : ""}`,
        `Cerca de $x = ${q}$ el numerador tiende a $${m * (q - p)}$ y el denominador a $0^{+}$, así que $g \\to ${vaSign}$ por los dos lados. Asíntota vertical $x = ${q}$. Como el grado de arriba es menor, la horizontal es $y = 0$.`,
        `$g'(x) = \\dfrac{${g1}}{${fx(q)}^{3}}$, que se anula en $x = ${xc}$.`,
        `${growth} Hay un ${isMax ? "máximo" : "mínimo"} local en $(${xc}, ${M})$.`,
        `$g''(x) = \\dfrac{${g2}}{${fx(q)}^{4}}$, que cambia de signo en $x = ${xi}$. Punto de inflexión $(${xi}, ${Mi})$.`,
        `Del lado de la asíntota donde está el extremo, $g$ va de $${vaSign}$ hasta $${M}$ y luego se acerca a $0$. Del otro lado toma valores entre $0$ y $${vaSign}$. El rango es $${unionTex(range)}$.`,
      ],
    };
  },
};

const estudioAcotada: ExerciseGen = {
  id: "estudio-completo-acotada",
  title: "Estudio completo de una racional acotada (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const a = r.pick([1, 2, 3, 4]);
    const c = r.pick([1, 2, 2, 3, 4, 9]);
    const rc = sqrtTex(c);
    const r3 = sqrtTex(3 * c);
    const g = gcd(a, 2);
    const A = a / g;
    const B = 2 / g;
    const sq = Number.isInteger(Math.sqrt(c));
    const M = sq ? frac(a, 2 * Math.sqrt(c)) : `\\frac{${A}}{${B === 1 ? "" : B}\\sqrt{${c}}}`;
    const f = `\\frac{${cf(a)}x}{x^{2} + ${c}}`;
    const mT = sq ? frac(-a, 2 * Math.sqrt(c)) : `-${M}`;
    return {
      statement: `Realiza el estudio completo de $\\displaystyle f(x) = ${f}$.`,
      sequential: true,
      parts: [
        { kind: "choice", prompt: "Simetría", shuffle: false, options: SIM_LABELS.map((l, i) => ({ label: l, correct: i === 1, feedback: i === 1 ? undefined : `$f(-x) = \\frac{-${cf(a)}x}{x^{2} + ${c}} = -f(x)$.` })) },
        { kind: "expr", prompt: "Asíntota horizontal", before: "y =", answer: "0", mistakes: [{ answer: String(a), feedback: "El grado de arriba es menor que el de abajo, así que el límite en el infinito es $0$." }] },
        { kind: "expr", prompt: "Abscisa del máximo local", before: "x =", answer: rc, mistakes: clean(rc, [{ answer: String(c), feedback: "Falta la raíz: $x^{2} = " + c + "$." }, { answer: `-${rc}`, feedback: "Ahí está el mínimo, por la simetría impar." }]) },
        { kind: "expr", prompt: "Valor máximo", before: `f(${rc}) =`, answer: M },
        { kind: "set", prompt: "Abscisas de los puntos de inflexión", before: "x \\in", answer: [`-${r3}`, 0, r3], mistakes: [{ answer: [`-${r3}`, r3], feedback: "Te faltó $x = 0$: el factor $x$ de $f''$ también cambia de signo." }] },
        choice(`$\\left[${mT}, ${M}\\right]$`, [
          [`$\\left(${mT}, ${M}\\right)$`, "El máximo y el mínimo se alcanzan, así que los extremos del rango entran."],
          ["$\\mathbb{R}$", "La función está acotada: nunca supera su máximo ni baja de su mínimo."],
          [`$\\left[0, ${M}\\right]$`, "Para $x < 0$ la función es negativa."],
        ], "Rango de $f$"),
      ],
      hints: [
        "Dominio: el denominador nunca se anula. No hay asíntotas verticales.",
        `$f'(x) = \\dfrac{${cf(a)}(${c} - x^{2})}{(x^{2} + ${c})^{2}}$.`,
        `$f''(x) = \\dfrac{${2 * a}x(x^{2} - ${3 * c})}{(x^{2} + ${c})^{3}}$.`,
      ],
      solution: [
        `Dominio $\\mathbb{R}$, sin asíntotas verticales. Único corte con los ejes: $(0, 0)$. Es impar, así que la gráfica es simétrica respecto al origen.`,
        `$\\lim_{x \\to \\pm\\infty} f(x) = 0$: asíntota horizontal $y = 0$.`,
        `$f'(x) = \\dfrac{${cf(a)}(${c} - x^{2})}{(x^{2} + ${c})^{2}}$ se anula en $x = \\pm ${rc}$. Crece en $(-${rc}, ${rc})$ y decrece fuera.`,
        `Máximo local en $x = ${rc}$ con $f(${rc}) = ${M}$, y mínimo en $x = -${rc}$ con valor $${mT}$.`,
        `$f''(x) = \\dfrac{${2 * a}x(x^{2} - ${3 * c})}{(x^{2} + ${c})^{3}}$ cambia de signo en $x = 0$ y $x = \\pm ${r3}$: tres puntos de inflexión.`,
        `Como la función se acerca a $0$ en el infinito y sus extremos son absolutos, el rango es $\\left[${mT}, ${M}\\right]$.`,
      ],
    };
  },
};

const coefCubica: ExerciseGen = {
  id: "coeficientes-cubica",
  title: "Coeficientes de una cúbica por condiciones (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const a = r.pick([1, -1, 2, -2]);
    const h = r.pick([0, 0, 1, -1]);
    let p: number;
    do p = r.int(h - 2, h + 2); while (p === h || (Math.abs(a) === 2 && Math.abs(p - h) === 2));
    const s = r.int(-3, 3);
    const b = -3 * a * h;
    const c = -3 * a * p * p + 6 * a * h * p;
    const d = s - (a * h ** 3 + b * h * h + c * h);
    const coefs = [a, b, c, d];
    const q = pval(coefs, p);
    const isMin = a * (p - h) > 0;
    return {
      statement: `Sea $f(x) = ax^{3} + bx^{2} + cx + d$. Halla $a$, $b$, $c$ y $d$ sabiendo que $f$ alcanza un extremo en $(${p}, ${q})$ y tiene un punto de inflexión en $(${h}, ${s})$.`,
      sequential: true,
      parts: [
        { kind: "expr", before: "a =", answer: String(a) },
        { kind: "expr", before: "b =", answer: String(b) },
        { kind: "expr", before: "c =", answer: String(c) },
        { kind: "expr", before: "d =", answer: String(d) },
        choice(isMin ? "Mínimo local" : "Máximo local", [[isMin ? "Máximo local" : "Mínimo local", `Evalúa $f''(${p})$ con los coeficientes hallados.`], ["Ninguno de los dos", `$f''(${p}) \\neq 0$, así que sí hay extremo.`]], `¿Qué tipo de extremo hay en $x = ${p}$?`),
      ],
      hints: [
        "$f'(x) = 3ax^{2} + 2bx + c$ y $f''(x) = 6ax + 2b$.",
        `Las cuatro condiciones: $f(${p}) = ${q}$, $f'(${p}) = 0$, $f(${h}) = ${s}$ y $f''(${h}) = 0$.`,
        h === 0 ? "Empieza por las condiciones en $x = 0$: dan $d$ y $b$ de inmediato." : "De $f''(" + h + ") = 0$ sale $b$ en función de $a$.",
      ],
      solution: [
        `$f''(${h}) = ${6 * h}a + 2b = 0$, así que $b = ${-3 * h}a$.`,
        `$f'(${p}) = ${3 * p * p}a + ${2 * p}b + c = 0$.`,
        `$f(${h}) = ${s}$ y $f(${p}) = ${q}$ completan el sistema de cuatro ecuaciones.`,
        `Resolviendo: $a = ${a}$, $b = ${b}$, $c = ${c}$, $d = ${d}$, es decir $f(x) = ${poly(coefs)}$.`,
        `Comprobación: $f''(${p}) = ${6 * a * p + 2 * b}$, ${isMin ? "positiva: el extremo es un mínimo" : "negativa: el extremo es un máximo"}.`,
      ],
    };
  },
};

const ubicarAsintotas: ExerciseGen = {
  id: "ubicar-asintotas",
  title: "Ubicar las asíntotas en el plano",
  level: 1,
  generate: (r) => {
    const c = r.int(-3, 3);
    let f: string, h: number, why: string;
    if (r.bool()) {
      const a = r.pick([1, 2, 3, -1, -2, -3]);
      let b: number;
      do b = r.int(-6, 6); while (a * c + b === 0);
      f = `\\frac{${poly([a, b])}}{${xm(c)}}`;
      h = a;
      why = `Numerador y denominador tienen grado 1, así que $\\lim_{x \\to \\pm\\infty} f(x) = \\frac{${a}}{1} = ${a}$. Asíntota horizontal $y = ${a}$.`;
    } else {
      const k = r.nz(-4, 4);
      h = r.int(-3, 3);
      f = `${k < 0 ? "-" : ""}\\frac{${Math.abs(k)}}{${xm(c)}}${h === 0 ? "" : h > 0 ? ` + ${h}` : ` - ${-h}`}`;
      why = `Cuando $x \\to \\pm\\infty$ la fracción tiende a $0$ y queda $\\lim_{x \\to \\pm\\infty} f(x) = ${h}$. Asíntota horizontal $y = ${h}$.`;
    }
    return {
      statement: `Arrastra las dos rectas punteadas hasta las asíntotas de $f(x) = ${f}$. Al acertar aparece la gráfica.`,
      parts: [{
        kind: "place",
        graph: { x: [-6, 6], y: [-6, 6] },
        items: [
          { type: "vline", label: "\\text{asíntota vertical}", answer: c },
          { type: "hline", label: "\\text{asíntota horizontal}", answer: h },
        ],
        reveal: [{ fn: f, breaks: [c], color: "accent" }],
      }],
      hints: [
        "La vertical va donde se anula el denominador y no el numerador.",
        "La horizontal es el límite de $f(x)$ cuando $x \\to \\pm\\infty$.",
      ],
      solution: [
        `El denominador se anula en $x = ${c}$ y allí el numerador no vale cero. Asíntota vertical $x = ${c}$.`,
        why,
      ],
    };
  },
};

const tablaDerivadasAsintota: ExerciseGen = {
  id: "tabla-derivadas-asintota",
  title: "Tabla de f' y f'' y gráfica con asíntotas (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const q = r.int(-2, 2);
    const d = r.pick([1, -1, 2, -2]);
    const M = Math.abs(d) === 2 ? r.pick([1, -1]) : r.pick([1, 2, -1, -2]);
    const p = q + d;
    const m = 4 * d * M;
    const xc = q + 2 * d;
    const xi = q + 3 * d;
    const pts = [q, xc, xi].sort((u, v) => u - v);
    const g = `\\frac{${poly([m, -m * p])}}{${fx(q)}^{2}}`;
    const g1 = (x: number) => (-m * (x - xc)) / (x - q) ** 3;
    const g2 = (x: number) => (2 * m * (x - xi)) / (x - q) ** 4;
    const isMax = M > 0;
    const conv = signSolve([{ root: xi }, { root: q, mult: 4, den: true }], m, ">");
    const conc = signSolve([{ root: xi }, { root: q, mult: 4, den: true }], m, "<");
    const lo = Math.min(q, xi) - 3;
    const hi = Math.max(q, xi) + 3;
    const s1 = signsOn(pts, g1).map((s) => (s > 0 ? "+" : "-")).join(", ");
    const s2 = signsOn(pts, g2).map((s) => (s > 0 ? "+" : "-")).join(", ");
    return {
      statement: `Sea $\\displaystyle g(x) = ${g}$. Sus derivadas son $$g'(x) = \\frac{${poly([-m, m * xc])}}{${fx(q)}^{3}} \\qquad g''(x) = \\frac{${poly([2 * m, -2 * m * xi])}}{${fx(q)}^{4}}$$ Completa el estudio.`,
      sequential: true,
      parts: [
        {
          kind: "signs",
          prompt: `Completa la tabla de signos de $g'$ y de $g''$. El punto $x = ${q}$ entra en la tabla porque anula el denominador.`,
          points: pts.map(String),
          rows: [
            { label: "g'(x)", signs: signsOn(pts, g1) },
            { label: "g''(x)", signs: signsOn(pts, g2) },
          ],
        },
        choice(isMax ? "Máximo local" : "Mínimo local", [
          [isMax ? "Mínimo local" : "Máximo local", "Mira cómo cambia el signo de $g'$ en ese punto."],
          ["Punto de inflexión", "La inflexión está donde cambia el signo de $g''$, no el de $g'$."],
        ], `¿Qué tiene $g$ en $x = ${xc}$?`),
        { kind: "interval", prompt: "$g$ es convexa en", answer: conv, mistakes: [{ answer: conc, feedback: "Ahí $g'' < 0$: es cóncava." }] },
        {
          kind: "place",
          prompt: "Arrastra la asíntota vertical, la asíntota horizontal y el extremo local a su lugar. Al acertar aparece la gráfica.",
          graph: { x: [lo, hi], y: [-5, 5] },
          items: [
            { type: "vline", label: "\\text{asíntota vertical}", answer: q },
            { type: "hline", label: "\\text{asíntota horizontal}", answer: 0 },
            { type: "point", label: "\\text{extremo}", answer: [xc, M], start: [hi - 1, -4] },
          ],
          reveal: [{ fn: g, breaks: [q], color: "accent" }],
        },
      ],
      hints: [
        "El signo de una fracción es el del numerador por el del denominador. Una potencia par del denominador siempre es positiva, una impar cambia de signo en su raíz.",
        `El grado de arriba es menor que el de abajo: la horizontal es $y = 0$. La vertical está en $x = ${q}$.`,
        `Para la altura del extremo calcula $g(${xc})$.`,
      ],
      solution: [
        `Puntos de la tabla: $${pts.join("$, $")}$. Signos de $g'$ en los cuatro intervalos: $${s1}$. Signos de $g''$: $${s2}$.`,
        `En $x = ${xc}$, $g'$ pasa de $${g1(xc - 0.5) > 0 ? "+" : "-"}$ a $${g1(xc + 0.5) > 0 ? "+" : "-"}$: ${isMax ? "máximo" : "mínimo"} local.`,
        `Convexa en $${unionTex(conv)}$ y cóncava en $${unionTex(conc)}$. La inflexión está en $x = ${xi}$.`,
        `Asíntota vertical $x = ${q}$ y horizontal $y = 0$. El extremo es $g(${xc}) = \\dfrac{${m * (xc - p)}}{${(xc - q) ** 2}} = ${M}$, es decir el punto $(${xc}, ${M})$.`,
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("estudio-funciones"),
  objectives: [
    "Seguir el procedimiento completo para estudiar una función: dominio, cortes, simetría, asíntotas, crecimiento y concavidad.",
    "Resumir el estudio en una tabla y dibujar la gráfica a partir de ella.",
    "Deducir el rango de una función a partir de su estudio.",
    "Determinar los coeficientes de una función a partir de condiciones sobre sus extremos e inflexiones.",
    "Dibujar una función a partir de condiciones sobre sus límites y sus derivadas.",
  ],
  sections: [
    {
      id: "procedimiento",
      title: "El procedimiento completo",
      blocks: [
        {
          type: "text",
          md: "Estudiar una función es juntar todo lo que sabes de ella hasta poder dibujarla sin calculadora. Cada paso aporta una pieza: dónde existe, dónde corta los ejes, hacia dónde se va, dónde sube y baja, hacia dónde se curva. Al final las piezas encajan en una sola gráfica.",
        },
        {
          type: "text",
          md: "Los pasos, en orden:\n\n- **1. Dominio.** Dónde está definida $f$. Dice qué tramos dibujar y dónde buscar asíntotas verticales.\n- **2. Cortes.** $f(x) = 0$ y $f(0)$, para ubicar los puntos sobre los ejes.\n- **3. Simetría.** Comparar $f(-x)$ con $f(x)$. Si es par o impar, basta estudiar la mitad.\n- **4. Asíntotas.** Límites en los bordes del dominio y en $\\pm\\infty$. Dicen hacia dónde se va la gráfica.\n- **5. Crecimiento.** Signo de $f'$: intervalos de crecimiento, máximos y mínimos.\n- **6. Concavidad.** Signo de $f''$: intervalos de convexidad y puntos de inflexión.\n- **7. Tabla y gráfica.** Valores en los puntos notables y dibujo uniendo todo.\n- **8. Rango.** Se lee en la gráfica: qué valores toma $f$.",
        },
        {
          type: "note",
          tone: "tip",
          title: "Un paso controla al otro",
          md: "Si la función tiene un máximo en $x = 1$ pero tu tabla dice que crece en $(0, 3)$, algo está mal. Si hay asíntota horizontal $y = 0$ y la función es positiva para $x$ grande, tiene que acercarse a $0$ desde arriba. Usa estas coherencias para detectar errores antes de dibujar.",
        },
        {
          type: "definition",
          title: "Simetrías",
          md: "$f$ es **par** si $f(-x) = f(x)$ para todo $x$ del dominio. Su gráfica es simétrica respecto al eje $y$, como $x^{2}$.\n\n$f$ es **impar** si $f(-x) = -f(x)$. Su gráfica es simétrica respecto al origen, como $x^{3}$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Qué simetría tiene $f(x) = \\dfrac{x}{x^{2} + 2}$?",
            parts: [{ kind: "choice", shuffle: false, options: [{ label: "Par", feedback: "$f(-x) = \\frac{-x}{x^{2} + 2} = -f(x)$." }, { label: "Impar", correct: true }, { label: "Ni par ni impar", feedback: "$f(-x) = \\frac{-x}{x^{2} + 2} = -f(x)$." }] }],
            solution: ["$f(-x) = \\frac{-x}{x^{2} + 2} = -f(x)$. Es impar."],
          },
        },
      ],
    },
    {
      id: "ejemplo-acotada",
      title: "Ejemplo de parcial: una racional acotada",
      blocks: [
        {
          type: "example",
          title: "Estudio completo de f(x) = x/(x² + 2)",
          problem: "Realiza el estudio completo de $f(x) = \\dfrac{x}{x^{2} + 2}$: dominio, rango, cortes, asíntotas, crecimiento, extremos, concavidad, inflexiones y gráfica.",
          steps: [
            "**Dominio.** $x^{2} + 2$ nunca vale cero, así que el dominio es $\\mathbb{R}$. No hay asíntotas verticales.",
            "**Cortes y simetría.** $f(x) = 0$ solo en $x = 0$. El único corte es el origen. Como $f(-x) = -f(x)$, es impar.",
            "**Asíntotas.** El grado de arriba es menor: $\\lim_{x \\to \\pm\\infty} f(x) = 0$. Asíntota horizontal $y = 0$.",
            "**Crecimiento.** $f'(x) = \\dfrac{(x^{2} + 2) - x \\cdot 2x}{(x^{2} + 2)^{2}} = \\dfrac{2 - x^{2}}{(x^{2} + 2)^{2}}$. Se anula en $x = \\pm\\sqrt{2}$. Crece en $(-\\sqrt{2}, \\sqrt{2})$ y decrece fuera.",
            "**Extremos.** Mínimo en $x = -\\sqrt{2}$ con $f = -\\frac{\\sqrt{2}}{4}$. Máximo en $x = \\sqrt{2}$ con $f = \\frac{\\sqrt{2}}{4} \\approx 0{,}35$.",
            "**Concavidad.** $f''(x) = \\dfrac{2x(x^{2} - 6)}{(x^{2} + 2)^{3}}$. Se anula en $x = 0$ y $x = \\pm\\sqrt{6}$, y cambia de signo en los tres.",
            "Convexa en $(-\\sqrt{6}, 0) \\cup (\\sqrt{6}, +\\infty)$ y cóncava en $(-\\infty, -\\sqrt{6}) \\cup (0, \\sqrt{6})$. Inflexiones en $(0, 0)$ y $\\left(\\pm\\sqrt{6}, \\pm\\frac{\\sqrt{6}}{8}\\right)$.",
            "**Rango.** La función va de $0$ (en $-\\infty$) al mínimo, sube al máximo y vuelve a $0$. Rango $\\left[-\\frac{\\sqrt{2}}{4}, \\frac{\\sqrt{2}}{4}\\right]$.",
          ],
        },
        {
          type: "table",
          headers: ["Intervalo", "$f'$", "$f''$", "Forma"],
          rows: [
            ["$(-\\infty, -\\sqrt{6})$", "$-$", "$-$", "decrece, cóncava"],
            ["$(-\\sqrt{6}, -\\sqrt{2})$", "$-$", "$+$", "decrece, convexa"],
            ["$(-\\sqrt{2}, 0)$", "$+$", "$+$", "crece, convexa"],
            ["$(0, \\sqrt{2})$", "$+$", "$-$", "crece, cóncava"],
            ["$(\\sqrt{2}, \\sqrt{6})$", "$-$", "$-$", "decrece, cóncava"],
            ["$(\\sqrt{6}, +\\infty)$", "$-$", "$+$", "decrece, convexa"],
          ],
          caption: "La tabla resume el estudio. Cada fila es un tramo de la gráfica.",
        },
        {
          type: "graph",
          spec: {
            x: [-8, 8],
            y: [-0.5, 0.5],
            curves: [{ fn: "\\frac{x}{x^{2} + 2}", color: "accent" }],
            points: [
              { x: 1.4142, y: 0.3536, label: "máx", color: "red" },
              { x: -1.4142, y: -0.3536, label: "mín", color: "blue" },
              { x: 0, y: 0, color: "orange" },
              { x: 2.4495, y: 0.3062, color: "orange" },
              { x: -2.4495, y: -0.3062, color: "orange" },
            ],
          },
          caption: "$f(x) = \\frac{x}{x^{2} + 2}$. Los puntos naranjas son las tres inflexiones. La escala vertical está ampliada para que se vea la forma.",
        },
        {
          type: "note",
          tone: "warning",
          title: "El cero también es inflexión",
          md: "Es fácil quedarse con $x = \\pm\\sqrt{6}$ y olvidar el factor $x$ de $f''$. Ese factor también cambia de signo, y el origen es un punto de inflexión.",
        },
      ],
    },
    {
      id: "ejemplo-asintota",
      title: "Ejemplo de parcial: con asíntota vertical",
      blocks: [
        {
          type: "example",
          title: "Estudio completo de g(x) = (4x − 8)/(x − 1)²",
          problem: "Estudia $g(x) = \\dfrac{4x - 8}{(x - 1)^{2}}$ y halla su rango.",
          steps: [
            "**Dominio.** $\\mathbb{R} - \\{1\\}$.",
            "**Cortes.** $g(x) = 0$ en $x = 2$. $g(0) = \\frac{-8}{1} = -8$. Cortes en $(2, 0)$ y $(0, -8)$.",
            "**Asíntotas.** Cerca de $x = 1$ el numerador tiende a $-4$ y el denominador a $0^{+}$: $g \\to -\\infty$ por los dos lados. Asíntota vertical $x = 1$. Como el grado de arriba es menor, asíntota horizontal $y = 0$.",
            "**Crecimiento.** $g'(x) = \\dfrac{4(x-1)^{2} - (4x - 8)\\cdot 2(x - 1)}{(x - 1)^{4}} = \\dfrac{-4(x - 3)}{(x - 1)^{3}}$. Signo: $-$ en $(-\\infty, 1)$, $+$ en $(1, 3)$, $-$ en $(3, +\\infty)$.",
            "**Extremos.** Máximo local en $x = 3$: $g(3) = \\frac{4}{4} = 1$.",
            "**Concavidad.** $g''(x) = \\dfrac{8(x - 4)}{(x - 1)^{4}}$. Cóncava en $(-\\infty, 1) \\cup (1, 4)$, convexa en $(4, +\\infty)$. Inflexión en $\\left(4, \\frac{8}{9}\\right)$.",
            "**Rango.** A la izquierda de $1$, $g$ baja desde $0$ hasta $-\\infty$. A la derecha sube desde $-\\infty$ hasta $1$ y luego baja hacia $0$. Rango $(-\\infty, 1]$.",
          ],
        },
        {
          type: "graph",
          spec: {
            x: [-4, 12],
            y: [-10, 3],
            curves: [{ fn: "\\frac{4x - 8}{(x - 1)^{2}}", color: "accent", breaks: [1] }],
            vlines: [{ x: 1, dashed: true, label: "x = 1", color: "muted" }],
            points: [
              { x: 2, y: 0 },
              { x: 0, y: -8 },
              { x: 3, y: 1, label: "máx", color: "red" },
              { x: 4, y: 0.8889, color: "orange" },
            ],
          },
          caption: "Máximo en $(3, 1)$ e inflexión en $\\left(4, \\frac{8}{9}\\right)$, el punto naranja.",
        },
        {
          type: "note",
          tone: "tip",
          title: "Simplifica antes de seguir",
          md: "Al derivar un cociente con $(x - 1)^{2}$ abajo, el numerador siempre tiene un factor $(x - 1)$ que se cancela. Simplificarlo a tiempo deja $g'$ con $(x - 1)^{3}$ abajo y ahorra mucho trabajo en $g''$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Cuál es el rango de $g(x) = \\dfrac{4x - 8}{(x - 1)^{2}}$?",
            parts: [{ kind: "interval", answer: [iv(-Infinity, 1, false, true)] }],
            solution: ["El valor más alto es el máximo $g(3) = 1$ y la función baja sin límite cerca de $x = 1$. Rango $(-\\infty, 1]$."],
          },
        },
        {
          type: "quick",
          exercise: {
            statement: "Sin mirar la gráfica de arriba, arrastra las dos asíntotas y el máximo de $g(x) = \\dfrac{4x - 8}{(x - 1)^{2}}$ a su lugar. Al acertar aparece la curva.",
            parts: [{
              kind: "place",
              graph: { x: [-4, 10], y: [-6, 3] },
              items: [
                { type: "vline", label: "\\text{asíntota vertical}", answer: 1 },
                { type: "hline", label: "\\text{asíntota horizontal}", answer: 0 },
                { type: "point", label: "\\text{máximo}", answer: [3, 1], start: [8, -5] },
              ],
              reveal: [{ fn: "\\frac{4x - 8}{(x - 1)^{2}}", breaks: [1], color: "accent" }],
            }],
            hints: ["Usa el estudio del ejemplo: dominio, asíntotas y el signo de $g'$."],
            solution: ["Asíntota vertical $x = 1$, asíntota horizontal $y = 0$ y máximo local en $(3, 1)$."],
          },
        },
      ],
    },
    {
      id: "oblicua-exponencial",
      title: "Asíntotas oblicuas y exponenciales",
      blocks: [
        {
          type: "text",
          md: "Cuando el grado del numerador supera en uno al del denominador, la gráfica se acerca a una recta inclinada: una asíntota oblicua $y = mx + n$. Se obtiene dividiendo, o con los límites\n\n$$m = \\lim_{x \\to \\pm\\infty} \\frac{f(x)}{x} \\qquad n = \\lim_{x \\to \\pm\\infty} \\left[f(x) - mx\\right]$$",
        },
        {
          type: "example",
          title: "Una racional con asíntota oblicua",
          problem: "Estudia $f(x) = \\dfrac{x^{2}}{x - 1}$.",
          steps: [
            "Dominio $\\mathbb{R} - \\{1\\}$. Corte único en $(0, 0)$.",
            "Dividiendo, $f(x) = x + 1 + \\dfrac{1}{x - 1}$. Asíntota oblicua $y = x + 1$ y asíntota vertical $x = 1$, con $f \\to -\\infty$ por la izquierda y $f \\to +\\infty$ por la derecha.",
            "$f'(x) = 1 - \\dfrac{1}{(x - 1)^{2}} = \\dfrac{x(x - 2)}{(x - 1)^{2}}$. Máximo local $(0, 0)$ y mínimo local $(2, 4)$.",
            "$f''(x) = \\dfrac{2}{(x - 1)^{3}}$: cóncava en $(-\\infty, 1)$ y convexa en $(1, +\\infty)$. No hay inflexión porque $x = 1$ no está en el dominio.",
            "Rango: $(-\\infty, 0] \\cup [4, +\\infty)$. Los valores entre $0$ y $4$ nunca se alcanzan.",
          ],
        },
        {
          type: "graph",
          spec: {
            x: [-5, 7],
            y: [-8, 12],
            curves: [
              { fn: "\\frac{x^{2}}{x - 1}", color: "accent", breaks: [1] },
              { fn: "x + 1", color: "muted", dashed: true },
            ],
            vlines: [{ x: 1, dashed: true, color: "muted" }],
            points: [{ x: 0, y: 0, label: "máx", color: "red" }, { x: 2, y: 4, label: "mín", color: "blue" }],
            labels: [{ x: 3.2, y: 2.6, text: "y = x + 1", color: "muted" }],
          },
          caption: "La curva se pega a la recta $y = x + 1$ cuando $x$ se aleja.",
        },
        {
          type: "example",
          title: "Una exponencial",
          problem: "Estudia $f(x) = xe^{x}$.",
          steps: [
            "Dominio $\\mathbb{R}$, corte único en $(0, 0)$, sin simetría.",
            "$\\lim_{x \\to +\\infty} xe^{x} = +\\infty$. Hacia $-\\infty$ es $\\infty \\cdot 0$: $\\lim_{x \\to -\\infty} \\dfrac{x}{e^{-x}} = \\lim_{x \\to -\\infty} \\dfrac{1}{-e^{-x}} = 0$ por L'Hôpital. Asíntota horizontal $y = 0$ solo por la izquierda.",
            "$f'(x) = (x + 1)e^{x}$: mínimo en $\\left(-1, -\\frac{1}{e}\\right)$.",
            "$f''(x) = (x + 2)e^{x}$: inflexión en $\\left(-2, -\\frac{2}{e^{2}}\\right)$, cóncava antes y convexa después.",
            "Rango: $\\left[-\\frac{1}{e}, +\\infty\\right)$.",
          ],
        },
        {
          type: "graph",
          spec: {
            x: [-7, 2],
            y: [-1, 2],
            curves: [{ fn: "xe^{x}", color: "accent" }],
            points: [{ x: -1, y: -0.3679, color: "blue" }, { x: -2, y: -0.2707, color: "orange" }],
          },
          caption: "$f(x) = xe^{x}$. El punto azul es el mínimo, en $x = -1$, y el naranja la inflexión, en $x = -2$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Para $f(x) = xe^{x}$ se tiene $f'(x) = (x + 1)e^{x}$ y $f''(x) = (x + 2)e^{x}$. Completa en una sola tabla los signos de $f'$ y de $f''$.",
            parts: [{
              kind: "signs",
              points: ["-2", "-1"],
              rows: [
                { label: "f'(x)", signs: [-1, -1, 1] },
                { label: "f''(x)", signs: [-1, 1, 1] },
              ],
            }],
            hints: ["La exponencial es positiva. El signo de cada derivada es el de su factor lineal."],
            solution: [
              "$f'$ cambia de signo solo en $-1$ y $f''$ solo en $-2$.",
              "En $(-\\infty, -2)$ decrece y es cóncava, en $(-2, -1)$ decrece y es convexa, y en $(-1, +\\infty)$ crece y es convexa.",
            ],
          },
        },
        {
          type: "note",
          tone: "econ",
          title: "Curvas de este tipo en economía",
          md: "Funciones como $te^{-t}$ describen fenómenos que suben rápido, llegan a un pico y se apagan: la respuesta de las ventas a una campaña publicitaria o el efecto de una medida a lo largo del tiempo. El estudio completo dice cuándo es el pico y cuándo empieza a frenarse la caída.",
        },
      ],
    },
    {
      id: "coeficientes",
      title: "Hallar coeficientes por condiciones",
      blocks: [
        {
          type: "text",
          md: "Otra pregunta clásica da la forma de la función con letras y unas condiciones, y pide los coeficientes. Cada condición se traduce en una ecuación, y hacen falta tantas ecuaciones como incógnitas.\n\n- Pasa por $(a, b)$: $f(a) = b$.\n- Extremo en $x = a$: $f'(a) = 0$.\n- Inflexión en $x = a$: $f''(a) = 0$.",
        },
        {
          type: "example",
          title: "Cúbica con extremo e inflexión dados",
          problem: "Halla $a$, $b$, $c$ y $d$ para que $f(x) = ax^{3} + bx^{2} + cx + d$ tenga un máximo local en $(-1, 11)$ y un punto de inflexión en $(1, -5)$.",
          steps: [
            "$f'(x) = 3ax^{2} + 2bx + c$ y $f''(x) = 6ax + 2b$.",
            "Inflexión en $1$: $6a + 2b = 0$, así que $b = -3a$.",
            "Extremo en $-1$: $3a - 2b + c = 0$. Con $b = -3a$ queda $c = -9a$.",
            "Pasa por $(1, -5)$: $a + b + c + d = -5$, o sea $-11a + d = -5$.",
            "Pasa por $(-1, 11)$: $-a + b - c + d = 11$, o sea $5a + d = 11$.",
            "Restando las dos últimas: $16a = 16$, $a = 1$. Entonces $b = -3$, $c = -9$, $d = 6$.",
            "Comprobación: $f''(-1) = -6 - 6 = -12 < 0$. Es un máximo, como pedía el enunciado.",
          ],
          answer: "$f(x) = x^{3} - 3x^{2} - 9x + 6$",
        },
        {
          type: "example",
          title: "Dos incógnitas",
          problem: "Halla $a$ y $b$ para que $f(x) = ax^{3} + bx^{2}$ tenga un extremo en $(2, 4)$.",
          steps: [
            "$f(2) = 8a + 4b = 4$ y $f'(2) = 12a + 4b = 0$.",
            "Restando: $4a = -4$, así que $a = -1$ y $b = 3$.",
            "$f''(2) = 6(-1)(2) + 2(3) = -6 < 0$: es un máximo.",
          ],
          answer: "$a = -1$, $b = 3$",
        },
        {
          type: "note",
          tone: "warning",
          title: "Comprueba al final",
          md: "Las ecuaciones $f'(a) = 0$ y $f''(a) = 0$ son necesarias, pero no garantizan que haya extremo o inflexión. Con los coeficientes hallados, revisa que $f''$ no se anule en el extremo y que cambie de signo en la inflexión.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Halla $b$ para que $f(x) = x^{2} + bx + 3$ tenga un extremo en $x = 2$.",
            parts: [{ kind: "expr", before: "b =", answer: "-4", mistakes: [{ answer: "4", feedback: "De $2x + b = 0$ en $x = 2$ sale $4 + b = 0$." }] }],
            solution: ["$f'(x) = 2x + b$. En $x = 2$: $4 + b = 0$, $b = -4$."],
          },
        },
      ],
    },
    {
      id: "condiciones",
      title: "Dibujar a partir de condiciones",
      blocks: [
        {
          type: "text",
          md: "En el parcial también aparece el problema al revés: te dan límites, valores y signos de las derivadas, y tienes que dibujar una función que los cumpla. El orden de trabajo es el mismo del estudio completo.",
        },
        {
          type: "example",
          title: "Pregunta de parcial",
          problem: "Dibuja una función que cumpla: $f(2) = 0$, $f(0) = 4$; $\\lim_{x \\to 1^{-}} f(x) = +\\infty$ y $\\lim_{x \\to 1^{+}} f(x) = -\\infty$; $\\lim_{x \\to +\\infty} f(x) = 3$; $\\lim_{x \\to -\\infty} \\frac{f(x)}{x} = \\frac{2}{3}$ y $\\lim_{x \\to -\\infty} \\left[f(x) - \\frac{2}{3}x\\right] = 2$.",
          steps: [
            "Los dos límites laterales en $x = 1$ dan una asíntota vertical. Por la izquierda la curva sube sin control y por la derecha baja sin control.",
            "$\\lim_{x \\to +\\infty} f(x) = 3$ es una asíntota horizontal $y = 3$, solo por la derecha.",
            "Los dos últimos límites dan una asíntota oblicua por la izquierda: $y = \\frac{2}{3}x + 2$. Corta al eje $x$ en $x = -3$ y al eje $y$ en $(0, 2)$.",
            "Se marcan los puntos $(2, 0)$ y $(0, 4)$ y se dibujan las tres asíntotas punteadas.",
            "A la izquierda de $1$ la curva viene pegada a la oblicua, pasa por $(0, 4)$ y sube hacia la vertical. A la derecha sale de $-\\infty$, corta en $(2, 0)$ y se acerca a $y = 3$.",
          ],
        },
        {
          type: "graph",
          spec: {
            x: [-8, 10],
            y: [-6, 8],
            curves: [
              { fn: "\\frac{2}{3}x + 2 + \\frac{2}{1 - x}", domain: [-8, 0.85], color: "accent" },
              { fn: "3 - \\frac{3}{x - 1}", domain: [1.3, 10], color: "accent" },
              { fn: "\\frac{2}{3}x + 2", color: "muted", dashed: true, domain: [-8, 1] },
            ],
            vlines: [{ x: 1, dashed: true, color: "muted" }],
            hlines: [{ y: 3, dashed: true, color: "muted" }],
            points: [{ x: 0, y: 4 }, { x: 2, y: 0 }],
          },
          caption: "Una de las muchas funciones que cumplen las condiciones. Lo que se evalúa es que respete asíntotas, puntos y signos.",
        },
        {
          type: "note",
          tone: "tip",
          title: "Orden para dibujar",
          md: "- Primero las asíntotas, punteadas.\n- Después los puntos dados.\n- Luego los tramos de crecimiento y decrecimiento con los signos de $f'$.\n- Al final la curvatura con los signos de $f''$.\n\nSi te dan $f'$ y $f''$, cada tramo tiene una de las cuatro formas: sube o baja, abierta hacia arriba o hacia abajo.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Se sabe que $\\displaystyle\\lim_{x \\to -\\infty} \\frac{f(x)}{x} = 2$ y $\\displaystyle\\lim_{x \\to -\\infty} [f(x) - 2x] = -4$. ¿En qué valor de $x$ corta la asíntota oblicua al eje horizontal?",
            parts: [{ kind: "expr", before: "x =", answer: "2", mistakes: [{ answer: "-2", feedback: "La asíntota es $y = 2x - 4$. Iguala a cero: $2x - 4 = 0$." }] }],
            solution: ["La asíntota es $y = 2x - 4$, que vale cero en $x = 2$."],
          },
        },
      ],
    },
  ],
  exercises: [
    asintotasRacional,
    ubicarAsintotas,
    cortesEjes,
    simetria,
    asintotaDeLimites,
    crecimientoRacional,
    expEstudio,
    asintotaOblicua,
    coefCuadratica,
    estudioG,
    estudioAcotada,
    coefCubica,
    tablaDerivadasAsintota,
  ],
};

export default topic;
