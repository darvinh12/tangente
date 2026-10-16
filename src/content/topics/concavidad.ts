import { meta } from "../catalog";
import { choice, trueFalse } from "../helpers";
import type { ExerciseGen, GraphSpec, Mistake, Part, Rich, Topic } from "../types";
import { iv, signSolve, unionTex, type Interval } from "@/lib/math/intervals";
import { evaluate, parse } from "@/lib/math/parse";
import { fmt, frac, poly } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

const pval = (c: number[], x: number) => c.reduce((acc, k) => acc * x + k, 0);
/** Coeficiente pegado: 1 -> "", -1 -> "-" */
const cf = (k: number) => (k === 1 ? "" : k === -1 ? "-" : fmt(k));
/** "x - 3", "x + 2", "x" */
const xm = (a: number) => (a === 0 ? "x" : a > 0 ? `x - ${fmt(a)}` : `x + ${fmt(-a)}`);
/** Factor lineal: 0 -> "x", 3 -> "(x - 3)" */
const fx = (a: number) => (a === 0 ? "x" : `(${xm(a)})`);
/** Número entre paréntesis si es negativo. */
const par = (n: number) => (n < 0 ? `(${n})` : String(n));
/** Coeficiente 1/k pegado: 1 -> "", -1 -> "-", 2 -> "\frac{1}{2}", -3 -> "-\frac{1}{3}" */
const inv = (k: number) => (k === 1 ? "" : k === -1 ? "-" : `${k < 0 ? "-" : ""}\\frac{1}{${Math.abs(k)}}`);
/** Derivada de un polinomio dado por coeficientes. */
const dpoly = (c: number[]) => c.slice(0, -1).map((k, i) => k * (c.length - 1 - i));

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

/** Cúbica con inflexión en x = r: f'' = 6a(x - r). */
function cubicInflection(r: { int: (a: number, b: number) => number; pick: <T>(xs: readonly T[]) => T }) {
  const a = r.pick([1, -1, 2, -2]);
  const p = r.int(-3, 3);
  const c = r.int(-6, 6);
  const d = r.int(-5, 5);
  return { a, p, coefs: [a, -3 * a * p, c, d] };
}

/** Cuártica s(x^4 - 2(p+q)x^3 + 6pq x^2) + cx + d con f'' = 12s(x - p)(x - q). */
function quarticInflection(p: number, q: number, s: number, c: number, d: number) {
  return [s, -2 * s * (p + q), 6 * s * p * q, c, d];
}

/** Producto de dos factores lineales con la x sola delante: (-2, 0) -> "x(x + 2)" */
const fx2 = (p: number, q: number) => (q === 0 ? `x${fx(p)}` : `${fx(p)}${fx(q)}`);

/** Signo de g en cada intervalo que dejan los puntos ordenados (se prueba en un punto interior). */
function signsOn(pts: number[], g: (x: number) => number): (1 | -1)[] {
  const test = [pts[0] - 1, ...pts.slice(1).map((b, i) => (pts[i] + b) / 2), pts[pts.length - 1] + 1];
  return test.map((x) => (g(x) > 0 ? 1 : -1));
}

/* --------------------------------- gráficas de forma --------------------------------- */

type Shape = "cc" | "ck" | "dc" | "dk";
const SHAPES: Record<Shape, { fn: string; text: string; d1: string; d2: string }> = {
  cc: { fn: "\\frac{x^{2}}{4}", text: "creciente y convexa", d1: "f' > 0", d2: "f'' > 0" },
  ck: { fn: "2\\sqrt{x}", text: "creciente y cóncava", d1: "f' > 0", d2: "f'' < 0" },
  dc: { fn: "\\frac{(x - 4)^{2}}{4}", text: "decreciente y convexa", d1: "f' < 0", d2: "f'' > 0" },
  dk: { fn: "4 - \\frac{x^{2}}{4}", text: "decreciente y cóncava", d1: "f' < 0", d2: "f'' < 0" },
};
const shapeGraph = (s: Shape): GraphSpec => ({ x: [-0.5, 4.5], y: [-0.5, 4.5], height: 180, step: 1, curves: [{ fn: SHAPES[s].fn, domain: [0, 4], color: "accent" }] });

/* ----------------------------------- ejercicios ----------------------------------- */

const signoSegunda: ExerciseGen = {
  id: "signo-segunda",
  title: "Intervalos de convexidad",
  level: 1,
  generate: (r) => {
    const want = r.pick(["convexa", "cóncava"] as const);
    const op = want === "convexa" ? ">" : "<";
    const opo = want === "convexa" ? "<" : ">";
    let coefs: number[], d2: string, ans: Interval[], other: Interval[], why: string;
    if (r.bool()) {
      const c = cubicInflection(r);
      coefs = c.coefs;
      d2 = `${poly([6 * c.a, -6 * c.a * c.p])} = ${cf(6 * c.a)}${fx(c.p)}`;
      ans = signSolve([{ root: c.p }], c.a, op);
      other = signSolve([{ root: c.p }], c.a, opo);
      why = `$f''$ es una recta que se anula en $x = ${c.p}$ y tiene pendiente ${c.a > 0 ? "positiva" : "negativa"}.`;
    } else {
      const p = r.int(-3, 1);
      const q = r.int(p + 1, 3);
      const s = r.pick([1, -1]);
      coefs = quarticInflection(p, q, s, r.int(-5, 5), r.int(-5, 5));
      d2 = `${poly(dpoly(dpoly(coefs)))} = ${cf(12 * s)}${fx(p)}${fx(q)}`;
      ans = signSolve([{ root: p }, { root: q }], s, op);
      other = signSolve([{ root: p }, { root: q }], s, opo);
      why = `$f''$ es una parábola con raíces $${p}$ y $${q}$, ${s > 0 ? "positiva fuera de ellas y negativa entre ellas" : "negativa fuera de ellas y positiva entre ellas"}.`;
    }
    return {
      statement: `¿En qué intervalos es ${want} $f(x) = ${poly(coefs)}$? Usa intervalos abiertos.`,
      parts: [{ kind: "interval", answer: ans, mistakes: [{ answer: other, feedback: `Ahí $f'' ${opo} 0$. En este curso, $f'' > 0$ es convexa y $f'' < 0$ es cóncava.` }] }],
      hints: ["Deriva dos veces y factoriza $f''$.", "Convexa (abierta hacia arriba) donde $f'' > 0$. Cóncava (abierta hacia abajo) donde $f'' < 0$."],
      solution: [`$f'(x) = ${poly(dpoly(coefs))}$ y $f''(x) = ${d2}$.`, why, `$f$ es ${want} en $${unionTex(ans)}$.`],
    };
  },
};

const convencion: ExerciseGen = {
  id: "convencion",
  title: "Convexa o cóncava",
  level: 1,
  generate: (r) => {
    const kind = r.pick(["pos", "neg", "fun", "libros"] as const);
    if (kind === "pos" || kind === "neg") {
      const pos = kind === "pos";
      return {
        statement: `Si $f''(x) ${pos ? ">" : "<"} 0$ para todo $x$ de $(a, b)$, ¿cómo es $f$ en $(a, b)$?`,
        parts: [choice(pos ? "Convexa" : "Cóncava", [
          [pos ? "Cóncava" : "Convexa", `Con la convención de la cátedra, $f'' > 0$ es convexa (abierta hacia arriba) y $f'' < 0$ es cóncava (abierta hacia abajo).`],
          ["Creciente", "El signo de $f''$ habla de la curvatura. El crecimiento lo dice el signo de $f'$."],
          ["Decreciente", "El signo de $f''$ habla de la curvatura. El crecimiento lo dice el signo de $f'$."],
        ])],
        hints: ["$f'' > 0$ quiere decir que $f'$ crece: las pendientes van aumentando y la curva se abre hacia arriba."],
        solution: [`$f'' ${pos ? ">" : "<"} 0$ hace que $f'$ sea ${pos ? "creciente" : "decreciente"}, y la curva queda abierta hacia ${pos ? "arriba" : "abajo"}. La cátedra la llama ${pos ? "convexa" : "cóncava"}.`],
      };
    }
    if (kind === "fun") {
      const f = r.pick([
        { tex: "x^{2}", conv: true, d2: "2" },
        { tex: "e^{x}", conv: true, d2: "e^{x}" },
        { tex: "e^{-x}", conv: true, d2: "e^{-x}" },
        { tex: "x^{4} + 1", conv: true, d2: "12x^{2}" },
        { tex: "-x^{2}", conv: false, d2: "-2" },
        { tex: "\\ln x", conv: false, d2: "-\\frac{1}{x^{2}}" },
        { tex: "\\sqrt{x}", conv: false, d2: "-\\frac{1}{4x\\sqrt{x}}" },
      ]);
      return {
        statement: `¿Cómo es $f(x) = ${f.tex}$ en todo su dominio?`,
        parts: [choice(f.conv ? "Convexa" : "Cóncava", [[f.conv ? "Cóncava" : "Convexa", `Calcula $f''(x) = ${f.d2}$ y mira su signo.`], ["Cambia de concavidad", "Su segunda derivada no cambia de signo."]])],
        hints: ["Calcula la segunda derivada y mira su signo."],
        solution: [`$f''(x) = ${f.d2}$, que es ${f.conv ? "positiva (o cero en un punto aislado)" : "negativa"}. La función es ${f.conv ? "convexa" : "cóncava"}.`],
      };
    }
    return {
      statement: "Lo que la cátedra llama función convexa, ¿cómo lo llaman muchos libros?",
      parts: [choice("Cóncava hacia arriba", [
        ["Cóncava hacia abajo", "Ese es el nombre de lo que la cátedra llama cóncava, con $f'' < 0$."],
        ["Creciente", "Convexidad y crecimiento son cosas distintas. Una función convexa puede decrecer, como $e^{-x}$."],
      ])],
      hints: ["Piensa en la forma de $x^{2}$: la cátedra la llama convexa."],
      solution: ["La forma de $x^{2}$, abierta hacia arriba, es convexa para la cátedra y cóncava hacia arriba en muchos libros. Lo que importa es el signo de $f''$, no el nombre."],
    };
  },
};

const inflexionCubica: ExerciseGen = {
  id: "inflexion-cubica",
  title: "Punto de inflexión de una cúbica",
  level: 1,
  generate: (r) => {
    const { a, p, coefs } = cubicInflection(r);
    const y = pval(coefs, p);
    return {
      statement: `Halla el punto de inflexión de $f(x) = ${poly(coefs)}$.`,
      parts: [
        { kind: "expr", prompt: "Abscisa", before: "x =", answer: String(p) },
        { kind: "expr", prompt: "Ordenada", before: `f(${p}) =`, answer: String(y) },
      ],
      hints: ["Iguala $f''(x)$ a cero.", "Para la ordenada, sustituye en $f$, no en $f''$."],
      solution: [
        `$f'(x) = ${poly(dpoly(coefs))}$ y $f''(x) = ${poly([6 * a, -6 * a * p])}$.`,
        `$f''(x) = 0$ en $x = ${p}$, y $f''$ cambia de signo allí porque es una recta.`,
        `$f(${p}) = ${y}$. El punto de inflexión es $(${p}, ${y})$.`,
      ],
    };
  },
};

const criterioSimple: ExerciseGen = {
  id: "criterio-segunda-simple",
  title: "Usar el criterio de la segunda derivada",
  level: 1,
  generate: (r) => {
    const opts = ["Un máximo local", "Un mínimo local", "El criterio no decide"];
    if (r.bool(0.25)) {
      const p = r.int(-3, 3);
      const k = r.int(-4, 4);
      const s = r.pick([1, -1]);
      const f = `${s === 1 ? "" : "-"}${fx(p)}^{4}${k === 0 ? "" : ` ${k < 0 ? "-" : "+"} ${Math.abs(k)}`}`;
      return {
        statement: `$f(x) = ${f}$ tiene un punto crítico en $x = ${p}$. Según el criterio de la segunda derivada, ¿qué tiene $f$ en $x = ${p}$?`,
        parts: [{ kind: "choice", shuffle: false, options: opts.map((o, i) => ({ label: o, correct: i === 2, feedback: i === 2 ? undefined : `$f''(${p}) = 0$ y con eso el criterio no concluye nada. Mirando el signo de $f'$, en realidad hay un ${s === 1 ? "mínimo" : "máximo"}.` })) }],
        hints: ["Calcula $f''$ en el punto crítico."],
        solution: [`$f''(x) = ${cf(12 * s)}${fx(p)}^{2}$, así que $f''(${p}) = 0$.`, `El criterio no decide. Con la primera derivada se ve que hay un ${s === 1 ? "mínimo" : "máximo"} local.`],
      };
    }
    const a = r.pick([1, -1, 2, -2]);
    let p: number, q: number;
    do {
      p = r.int(-3, 2);
      q = r.int(p + 1, 3);
    } while (Math.abs(a) % 2 === 1 && (p + q) % 2 !== 0);
    const coefs = [a, (-3 * a * (p + q)) / 2, 3 * a * p * q, r.int(-4, 4)];
    const x0 = r.pick([p, q]);
    const d2 = pval(dpoly(dpoly(coefs)), x0);
    const ans = d2 < 0 ? 0 : 1;
    return {
      statement: `$f(x) = ${poly(coefs)}$ tiene un punto crítico en $x = ${x0}$. Según el criterio de la segunda derivada, ¿qué tiene $f$ allí?`,
      parts: [{ kind: "choice", shuffle: false, options: opts.map((o, i) => ({ label: o, correct: i === ans, feedback: i === ans ? undefined : `$f''(${x0}) = ${d2}$, que es ${d2 < 0 ? "negativo: la curva es cóncava y el punto es una cima" : "positivo: la curva es convexa y el punto es un valle"}.` })) }],
      hints: ["Calcula $f''(x)$ y evalúala en el punto crítico.", "$f'' < 0$ da máximo y $f'' > 0$ da mínimo."],
      solution: [
        `$f'(x) = ${poly(dpoly(coefs))}$ y $f''(x) = ${poly(dpoly(dpoly(coefs)))}$.`,
        `$f''(${x0}) = ${d2}$, ${d2 < 0 ? "negativo" : "positivo"}. Hay un ${d2 < 0 ? "máximo" : "mínimo"} local en $x = ${x0}$.`,
      ],
    };
  },
};

const inflexionCuartica: ExerciseGen = {
  id: "inflexion-cuartica",
  title: "Puntos de inflexión de una cuártica",
  level: 2,
  generate: (r) => {
    const s = r.pick([1, -1]);
    const doble = r.bool(0.2);
    const p = r.int(-3, 2);
    const q = doble ? p : r.int(p + 1, 3);
    const coefs = quarticInflection(p, q, s, r.int(-4, 4), r.int(-4, 4));
    const ans = doble ? [] : [p, q];
    return {
      statement: `Halla las abscisas de los puntos de inflexión de $f(x) = ${poly(coefs)}$. Si no tiene, responde conjunto vacío.`,
      parts: [{
        kind: "set",
        before: "x \\in",
        answer: ans,
        mistakes: doble ? [{ answer: [p], feedback: `$f''(${p}) = 0$, pero $f''$ no cambia de signo allí porque el factor está al cuadrado. No hay inflexión.` }] : [],
      }],
      hints: ["Deriva dos veces y factoriza $f''$.", "Un punto de inflexión necesita que $f''$ cambie de signo, no basta con que valga cero."],
      solution: [
        `$f''(x) = ${poly(dpoly(dpoly(coefs)))} = ${cf(12 * s)}${doble ? `${fx(p)}^{2}` : `${fx(p)}${fx(q)}`}$.`,
        doble
          ? `$f''$ se anula en $x = ${p}$ pero tiene siempre el mismo signo, porque el factor está al cuadrado. No hay puntos de inflexión.`
          : `$f''$ cambia de signo en $x = ${p}$ y en $x = ${q}$. Esos son los puntos de inflexión.`,
      ],
    };
  },
};

const expSegunda: ExerciseGen = {
  id: "exp-segunda",
  title: "Concavidad de una exponencial",
  level: 2,
  generate: (r) => {
    const k = r.pick([1, -1, 2, -2]);
    const a = r.int(-3, 3);
    const xi = -a - 2 / k;
    const ek = `e^{${k === 1 ? "" : k === -1 ? "-" : k}x}`;
    const f = `${fx(-a)}${ek}`;
    const conv = [iv(xi, Infinity)];
    return {
      statement: `Sea $f(x) = ${f}$. Halla su punto de inflexión y el intervalo donde es convexa.`,
      parts: [
        { kind: "expr", prompt: "Abscisa del punto de inflexión", before: "x =", answer: fmt(xi), mistakes: clean(fmt(xi), [{ answer: fmt(-a - 1 / k), feedback: "Ese es el punto crítico, donde $f' = 0$. La inflexión sale de $f'' = 0$." }]) },
        { kind: "interval", prompt: "$f$ es convexa en", answer: conv, mistakes: [{ answer: [iv(-Infinity, xi)], feedback: "Ahí $f'' < 0$. Fíjate que $f''$ lleva el factor $k^{2}$, que siempre es positivo." }] },
      ],
      hints: [
        `Por la regla del producto, $f'(x) = ${ek}\\left(1 ${k < 0 ? "-" : "+"} ${cf(Math.abs(k))}${fx(-a)}\\right)$.`,
        "Deriva otra vez con la regla del producto y saca factor común la exponencial.",
      ],
      solution: [
        `$f'(x) = ${ek}(${poly([k, k * a + 1])})$.`,
        `$f''(x) = ${cf(k)}${ek}(${poly([k, k * a + 1])}) ${k < 0 ? "-" : "+"} ${cf(Math.abs(k))}${ek} = ${ek}(${poly([k * k, k * k * a + 2 * k])})$.`,
        `La exponencial es positiva y $${poly([k * k, k * k * a + 2 * k])}$ se anula en $x = ${fmt(xi)}$, pasando de negativo a positivo.`,
        `Inflexión en $x = ${fmt(xi)}$. $f$ es convexa en $${unionTex(conv)}$ y cóncava en $(-\\infty, ${fmt(xi)})$.`,
      ],
    };
  },
};

const graficaSignos: ExerciseGen = {
  id: "grafica-signos",
  title: "Elegir la gráfica por los signos de f' y f''",
  level: 2,
  generate: (r) => {
    const target = r.pick(["cc", "ck", "dc", "dk"] as Shape[]);
    const order = r.shuffle(["cc", "ck", "dc", "dk"] as Shape[]);
    const letters = ["A", "B", "C", "D"];
    const t = SHAPES[target];
    const part: Part = {
      kind: "choice",
      shuffle: false,
      options: order.map((s, i) => ({
        label: `Gráfica ${letters[i]}`,
        graph: shapeGraph(s),
        correct: s === target,
        feedback: s === target ? undefined : `Esa gráfica es ${SHAPES[s].text}. Buscas una que sea ${t.text}.`,
      })),
    };
    return {
      statement: `En el intervalo $(0, 4)$ una función cumple $${t.d1}$ y $${t.d2}$. ¿Cuál puede ser su gráfica?`,
      parts: [part],
      hints: ["El signo de $f'$ dice si sube o baja.", "El signo de $f''$ dice si se abre hacia arriba (convexa) o hacia abajo (cóncava)."],
      solution: [`$${t.d1}$ indica que la función ${t.text.startsWith("creciente") ? "sube" : "baja"}, y $${t.d2}$ que es ${t.text.split(" y ")[1]}. La gráfica correcta es ${t.text}.`],
    };
  },
};

const VF: { s: string; v: boolean; why: string }[] = [
  { s: "Si $f''(a) = 0$, entonces $f$ tiene un punto de inflexión en $a$.", v: false, why: "$f(x) = x^{4}$ cumple $f''(0) = 0$ y es convexa a los dos lados del $0$. No hay cambio de concavidad." },
  { s: "$f(x) = \\frac{1}{x}$ es cóncava en $(-\\infty, 0)$ y convexa en $(0, +\\infty)$, así que tiene un punto de inflexión en $x = 0$.", v: false, why: "El $0$ no está en el dominio. Un punto de inflexión tiene que ser un punto de la gráfica." },
  { s: "$f(x) = \\sqrt[3]{x}$ tiene un punto de inflexión en $x = 0$, aunque $f''(0)$ no existe.", v: true, why: "$f''(x) = -\\frac{2}{9}x^{-5/3}$ es positiva para $x < 0$ y negativa para $x > 0$. Cambia la concavidad y $x = 0$ está en el dominio." },
  { s: "En un punto de inflexión, la recta tangente cruza la gráfica.", v: true, why: "De un lado la curva queda por encima de la tangente (convexa) y del otro por debajo (cóncava)." },
  { s: "Si $f$ es convexa en $(a, b)$, sus rectas tangentes quedan por debajo de la gráfica en ese intervalo.", v: true, why: "Es una de las caracterizaciones de la convexidad: la curva se abre hacia arriba, por encima de cada tangente." },
  { s: "Si $f'(a) = 0$ y $f''(a) = 0$, entonces $f$ no tiene extremo en $a$.", v: false, why: "$f(x) = x^{4}$ cumple las dos condiciones en $0$ y tiene un mínimo. Con $f''(a) = 0$ el criterio de la segunda derivada simplemente no decide." },
  { s: "Si $f''(x) > 0$ en $(a, b)$, entonces $f'$ es creciente en $(a, b)$.", v: true, why: "$f''$ es la derivada de $f'$. Si es positiva, $f'$ crece." },
];

const vfInflexion: ExerciseGen = {
  id: "vf-inflexion",
  title: "Verdadero o falso sobre inflexión y concavidad",
  level: 2,
  generate: (r) => {
    const it = r.pick(VF);
    return {
      statement: `${it.s} ¿Verdadero o falso?`,
      parts: [trueFalse(it.v, it.why)],
      hints: ["Prueba con ejemplos sencillos como $x^{3}$, $x^{4}$, $\\frac{1}{x}$ o $\\sqrt[3]{x}$."],
      solution: [`${it.v ? "Verdadero" : "Falso"}. ${it.why}`],
    };
  },
};

const parametroInflexion: ExerciseGen = {
  id: "parametro-inflexion",
  title: "Parámetro para una inflexión dada",
  level: 2,
  generate: (r) => {
    if (r.bool()) {
      const p = r.nz(-4, 4);
      const c = r.int(-5, 5);
      const k = -3 * p;
      return {
        statement: `Halla $k$ para que $f(x) = x^{3} + kx^{2} ${c < 0 ? "-" : "+"} ${Math.abs(c)}x$ tenga un punto de inflexión en $x = ${p}$.`,
        parts: [{ kind: "expr", before: "k =", answer: String(k), mistakes: clean(String(k), [{ answer: String(3 * p), feedback: "Revisa el signo al despejar $k$ de $6x + 2k = 0$." }, { answer: String(-6 * p), feedback: "La segunda derivada de $kx^{2}$ es $2k$, no $k$." }]) }],
        hints: ["En la inflexión $f''(x) = 0$.", "$f''(x) = 6x + 2k$."],
        solution: [`$f''(x) = 6x + 2k$. En $x = ${p}$: $${6 * p} + 2k = 0$, así que $k = ${k}$.`, "Como $f''$ es una recta con pendiente $6$, cambia de signo allí. Sí es inflexión."],
      };
    }
    const p = r.pick([1, -1, 2, -2]);
    const k = 2 / p;
    const c = r.int(1, 6);
    return {
      statement: `Halla $k$ para que $f(x) = kx^{3} - 6x^{2} + ${c}$ tenga un punto de inflexión en $x = ${p}$.`,
      parts: [{ kind: "expr", before: "k =", answer: String(k), mistakes: clean(String(k), [{ answer: String(-k), feedback: "Revisa el signo al despejar." }, { answer: frac(p, 2), feedback: "Despejaste al revés. De $6kx - 12 = 0$ sale $k = \\frac{2}{x}$." }]) }],
      hints: ["$f''(x) = 6kx - 12$.", "Iguala a cero en el punto dado y despeja $k$."],
      solution: [`$f''(x) = 6kx - 12$. En $x = ${p}$: $${6 * p}k - 12 = 0$, así que $k = ${k}$.`, "Con $k \\neq 0$, $f''$ es una recta no horizontal y cambia de signo en ese punto."],
    };
  },
};

const extremosSegundaExp: ExerciseGen = {
  id: "extremos-segunda-exp",
  title: "Criterio de la segunda derivada con exponencial (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const n = r.int(1, 3);
    const m = r.pick([1, 2, 3, -1, -2]);
    const am = Math.abs(m);
    const expo = `e^{${m < 0 ? "-" : ""}${am === 1 ? "x" : `\\frac{x}{${am}}`}}`;
    const lead = n === 1 ? "x" : `\\frac{x}{${n}}`;
    const xc = -m;
    // h''(-m) = e^{-1}/(n m)
    const d2 = m > 0 ? `\\frac{1}{${n * m === 1 ? "" : n * m}e}` : `-\\frac{1}{${n * am === 1 ? "" : n * am}e}`;
    const g = Math.abs(m) % n === 0 ? n : 1;
    const num_ = am / g;
    const den = n / g;
    const hv = `${m > 0 ? "-" : ""}\\frac{${num_}}{${den === 1 ? "" : den}e}`;
    const isMin = m > 0;
    return {
      statement: `Determina los extremos de $h(x) = ${lead}${expo}$ aplicando el criterio de la segunda derivada.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Punto crítico", before: "x =", answer: String(xc), mistakes: clean(String(xc), [{ answer: String(m), feedback: "Revisa el signo al despejar $1 + \\frac{x}{m} = 0$." }]) },
        { kind: "expr", prompt: "Valor de la segunda derivada en ese punto", before: `h''(${xc}) =`, answer: d2 },
        choice(isMin ? "Mínimo local" : "Máximo local", [[isMin ? "Máximo local" : "Mínimo local", `$h''(${xc})$ es ${isMin ? "positiva" : "negativa"}: la curva es ${isMin ? "convexa" : "cóncava"} allí.`], ["El criterio no decide", "El criterio solo falla cuando $h''$ vale cero en el punto crítico."]], "¿Qué tipo de extremo es?"),
        { kind: "expr", prompt: "Valor del extremo", before: `h(${xc}) =`, answer: hv, mistakes: clean(hv, [{ answer: String(xc), feedback: "Esa es la abscisa. Sustitúyela en $h$." }]) },
      ],
      hints: [
        `Por la regla del producto, $h'(x) = ${inv(n)}${expo}\\left(1 ${m < 0 ? "-" : "+"} \\frac{x}{${am}}\\right)$.`,
        "Deriva otra vez y saca factor común la exponencial.",
        "Recuerda que $e^{-1} = \\frac{1}{e}$.",
      ],
      solution: [
        `$h'(x) = ${inv(n)}${expo} ${m < 0 ? "-" : "+"} \\frac{x}{${n * am}}${expo} = ${inv(n * m)}${expo}(${xm(-m)})$. Se anula en $x = ${xc}$.`,
        `$h''(x) = ${inv(n * m * m)}${expo}(${xm(-2 * m)})$, así que $h''(${xc}) = ${inv(n * m * m)}e^{-1}\\cdot ${par(m)} = ${d2}$.`,
        `Como $h''(${xc}) ${isMin ? "> 0" : "< 0"}$, hay un ${isMin ? "mínimo" : "máximo"} local en $x = ${xc}$.`,
        `$h(${xc}) = ${n === 1 ? cf(xc) : `${xc < 0 ? "-" : ""}\\frac{${Math.abs(xc)}}{${n}}`}e^{-1} = ${hv}$. El punto es $\\left(${xc}, ${hv}\\right)$.`,
      ],
    };
  },
};

const raizSegunda: ExerciseGen = {
  id: "raiz-segunda",
  title: "Extremos de x por una raíz (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const k = r.int(1, 3);
    const c = r.pick([1, 2, 3, -1, -2]);
    const A = 2 * k * k;
    const g = `${cf(c)}x\\sqrt{${A} - x^{2}}`;
    const x0 = r.pick([k, -k]);
    const d2 = -4 * c * Math.sign(x0);
    const gv = c * x0 * k;
    const isMax = d2 < 0;
    return {
      statement: `Sea $g(x) = ${g}$. Halla los puntos críticos donde $g' = 0$ y clasifícalos con el criterio de la segunda derivada.`,
      sequential: true,
      parts: [
        { kind: "set", prompt: "Puntos donde $g'(x) = 0$", before: "x \\in", answer: [-k, k], mistakes: [{ answer: [k], feedback: "La ecuación $x^{2} = " + k * k + "$ tiene dos soluciones." }] },
        { kind: "expr", prompt: `Calcula $g''(${x0})$`, before: `g''(${x0}) =`, answer: String(d2), mistakes: clean(String(d2), [{ answer: String(-d2), feedback: "Revisa el signo. Evalúa con cuidado el factor $x$ que queda delante." }]) },
        choice(isMax ? "Máximo local" : "Mínimo local", [[isMax ? "Mínimo local" : "Máximo local", `$g''(${x0}) = ${d2}$ es ${isMax ? "negativa" : "positiva"}.`], ["El criterio no decide", "Solo pasa si la segunda derivada vale cero."]], `¿Qué hay en $x = ${x0}$?`),
        { kind: "expr", prompt: `Valor de $g(${x0})$`, before: `g(${x0}) =`, answer: String(gv) },
      ],
      hints: [
        `El dominio es $[-\\sqrt{${A}}, \\sqrt{${A}}]$, donde el radicando no es negativo.`,
        `Con la regla del producto, $g'(x) = ${cf(c)}\\dfrac{${A} - 2x^{2}}{\\sqrt{${A} - x^{2}}}$.`,
        `Derivando otra vez se llega a $g''(x) = ${cf(c)}\\dfrac{x(2x^{2} - ${3 * A})}{(${A} - x^{2})^{3/2}}$.`,
      ],
      solution: [
        `Dominio: $${A} - x^{2} \\ge 0$, es decir $[-\\sqrt{${A}}, \\sqrt{${A}}]$.`,
        `$g'(x) = ${cf(c)}\\left(\\sqrt{${A} - x^{2}} - \\dfrac{x^{2}}{\\sqrt{${A} - x^{2}}}\\right) = ${cf(c)}\\dfrac{${A} - 2x^{2}}{\\sqrt{${A} - x^{2}}}$.`,
        `$g'(x) = 0$ cuando $x^{2} = ${k * k}$, o sea $x = \\pm ${k}$. En $x = \\pm\\sqrt{${A}}$ la derivada no existe: también son críticos, pero son extremos del dominio y el criterio de la segunda derivada no se aplica allí.`,
        `$g''(x) = ${cf(c)}\\dfrac{x(2x^{2} - ${3 * A})}{(${A} - x^{2})^{3/2}}$. En $x = ${x0}$: $g''(${x0}) = ${cf(c)}\\dfrac{${par(x0)}(${2 * k * k} - ${3 * A})}{${k * k * k}} = ${d2}$.`,
        `Como es ${isMax ? "negativa" : "positiva"}, hay un ${isMax ? "máximo" : "mínimo"} local en $x = ${x0}$, con $g(${x0}) = ${gv}$. En $x = ${-x0}$ pasa lo contrario.`,
      ],
    };
  },
};

const parametrosNormal: ExerciseGen = {
  id: "parametros-normal",
  title: "Concavidad con parámetros (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const a = r.pick([1, 2, 3, -1, -2]);
    const m = r.int(1, 3);
    const b = 2 * m * m;
    const pre = a === 1 ? "" : a === -1 ? "-" : `${a < 0 ? "-" : ""}\\frac{1}{${Math.abs(a)}}`;
    const f = `${pre}e^{-\\frac{x^{2}}{${b}}}`;
    const out = signSolve([{ root: -m }, { root: m }], 1, ">");
    const ins = [iv(-m, m)];
    const conv = a > 0 ? out : ins;
    const conc = a > 0 ? ins : out;
    const yv = `${pre}e^{-\\frac{1}{2}}`;
    return {
      statement: `Dada $f(x) = ${f}$, determina los intervalos de convexidad y concavidad y los puntos de inflexión.`,
      sequential: true,
      parts: [
        { kind: "interval", prompt: "$f$ es convexa en", answer: conv, mistakes: [{ answer: conc, feedback: a > 0 ? "Esos son los intervalos donde $f'' < 0$." : `Cuidado con el signo de $\\frac{1}{${a}}$: al ser negativo invierte el signo de $f''$.` }] },
        { kind: "interval", prompt: "$f$ es cóncava en", answer: conc },
        { kind: "expr", prompt: "Abscisa positiva del punto de inflexión", before: "x =", answer: String(m), mistakes: clean(String(m), [{ answer: String(b), feedback: `De $2x^{2} - ${b} = 0$ sale $x^{2} = ${m * m}$.` }, { answer: String(m * m), feedback: "Falta sacar la raíz cuadrada." }]) },
        { kind: "expr", prompt: "Ordenada de los puntos de inflexión", before: `f(\\pm ${m}) =`, answer: yv },
      ],
      hints: [
        `$f'(x) = ${pre === "" ? "" : pre === "-" ? "-" : pre}e^{-\\frac{x^{2}}{${b}}}\\cdot\\left(-\\frac{2x}{${b}}\\right)$ por la regla de la cadena.`,
        "Para $f''$ usa la regla del producto y saca factor común la exponencial.",
        "La exponencial siempre es positiva. El signo lo deciden la constante y un polinomio de grado 2.",
      ],
      solution: [
        `$f'(x) = ${inv(-a * m * m)}xe^{-\\frac{x^{2}}{${b}}}$.`,
        `$f''(x) = ${inv(-a * m * m)}e^{-\\frac{x^{2}}{${b}}} ${a > 0 ? "+" : "-"} ${inv(Math.abs(a) * m * m)}x\\cdot\\frac{x}{${m * m}}e^{-\\frac{x^{2}}{${b}}} = ${inv(a * m ** 4)}e^{-\\frac{x^{2}}{${b}}}\\left(x^{2} - ${m * m}\\right)$.`,
        `La exponencial es positiva. $x^{2} - ${m * m}$ es positivo fuera de $[-${m}, ${m}]$ y negativo dentro. ${a > 0 ? "La constante es positiva y no cambia ese signo." : "La constante es negativa e invierte ese signo."}`,
        `Convexa en $${unionTex(conv)}$ y cóncava en $${unionTex(conc)}$.`,
        `Inflexión en $x = \\pm ${m}$, con $f(\\pm ${m}) = ${yv}$.`,
      ],
    };
  },
};

const leerSignos: ExerciseGen = {
  id: "leer-signos",
  title: "Leer una función a partir de los signos de f' y f'' (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const s = r.pick([1, -1]);
    const c1 = r.int(-5, -1);
    const i1 = c1 + r.int(1, 2);
    const c2 = i1 + r.int(1, 2);
    const i0 = r.bool() ? c1 - r.int(1, 2) : null;
    const i2 = r.bool() ? c2 + r.int(1, 2) : null;
    const infl = [i0, i1, i2].filter((x): x is number => x !== null);
    const f1pos = s > 0 ? signSolve([{ root: c1 }, { root: c2 }], 1, ">") : [iv(c1, c2)];
    const f1neg = s > 0 ? [iv(c1, c2)] : signSolve([{ root: c1 }, { root: c2 }], 1, ">");
    // f'' cerca de c1 tiene signo -s y cerca de c2 signo s. Cambia en cada punto de infl.
    const d2Sign = (x: number) => {
      let sg = x < i1 ? -s : s;
      if (i0 !== null && x < i0) sg = -sg;
      if (i2 !== null && x > i2) sg = -sg;
      return sg;
    };
    const cuts = [-Infinity, ...infl, Infinity];
    const f2pos: Interval[] = [];
    const f2neg: Interval[] = [];
    for (let i = 0; i < cuts.length - 1; i++) {
      const mid = !Number.isFinite(cuts[i]) ? cuts[i + 1] - 1 : !Number.isFinite(cuts[i + 1]) ? cuts[i] + 1 : (cuts[i] + cuts[i + 1]) / 2;
      (d2Sign(mid) > 0 ? f2pos : f2neg).push(iv(cuts[i], cuts[i + 1]));
    }
    const xMax = s > 0 ? c1 : c2;
    const xMin = s > 0 ? c2 : c1;
    // tramo para la pregunta cualitativa
    const allCuts = [...new Set([c1, c2, ...infl])].sort((x, y) => x - y);
    const j = r.int(0, allCuts.length - 2);
    const lo = allCuts[j];
    const hi = allCuts[j + 1];
    const mid = (lo + hi) / 2;
    const up = s > 0 ? mid < c1 || mid > c2 : mid > c1 && mid < c2;
    const conv = d2Sign(mid) > 0;
    const desc = `${up ? "creciente" : "decreciente"} y ${conv ? "convexa" : "cóncava"}`;
    const allDesc = ["creciente y convexa", "creciente y cóncava", "decreciente y convexa", "decreciente y cóncava"];
    return {
      statement: `Una función $f$ continua en $\\mathbb{R}$ cumple:\n\n- $f'(${c1}) = f'(${c2}) = 0$, y $${infl.map((x) => `f''(${x})`).join(" = ")} = 0$.\n- $f'(x) > 0$ en $${unionTex(f1pos)}$ y $f'(x) < 0$ en $${unionTex(f1neg)}$.\n- $f''(x) > 0$ en $${unionTex(f2pos)}$ y $f''(x) < 0$ en $${unionTex(f2neg)}$.\n\nResponde a partir de esa información.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Abscisa del máximo local", before: "x =", answer: String(xMax), mistakes: clean(String(xMax), [{ answer: String(xMin), feedback: "Ahí $f'$ pasa de negativa a positiva: es un mínimo." }]) },
        { kind: "expr", prompt: "Abscisa del mínimo local", before: "x =", answer: String(xMin) },
        { kind: "interval", prompt: "Intervalos de convexidad", answer: f2pos, mistakes: [{ answer: f2neg, feedback: "Esos son los intervalos donde $f'' < 0$, es decir, de concavidad." }] },
        { kind: "set", prompt: "Abscisas de los puntos de inflexión", before: "x \\in", answer: infl, mistakes: [{ answer: [c1, c2], feedback: "Esos son los puntos críticos, donde $f' = 0$. La inflexión está donde $f''$ cambia de signo." }] },
        choice(`Es ${desc}`, allDesc.filter((d) => d !== desc).map((d) => [`Es ${d}`, `Mira el signo de $f'$ y de $f''$ en ese intervalo.`] as [Rich, Rich]), `¿Cómo es $f$ en $(${lo}, ${hi})$?`),
      ],
      hints: [
        "Máximo local donde $f'$ pasa de positiva a negativa. Mínimo donde pasa de negativa a positiva.",
        "Convexa donde $f'' > 0$. Hay inflexión donde $f''$ cambia de signo.",
      ],
      solution: [
        `En $x = ${xMax}$, $f'$ pasa de $+$ a $-$: máximo local. En $x = ${xMin}$ pasa de $-$ a $+$: mínimo local.`,
        `$f$ es convexa en $${unionTex(f2pos)}$ y cóncava en $${unionTex(f2neg)}$.`,
        `$f''$ cambia de signo en $x = ${infl.join(", ")}$, y como $f$ es continua, ${infl.length === 1 ? "ese es el punto" : "esos son los puntos"} de inflexión.`,
        `En $(${lo}, ${hi})$ se tiene $f' ${up ? ">" : "<"} 0$ y $f'' ${conv ? ">" : "<"} 0$: la función es ${desc}.`,
      ],
    };
  },
};

const tablaSignosSegunda: ExerciseGen = {
  id: "tabla-signos-segunda",
  title: "Tabla de signos de la segunda derivada",
  level: 2,
  generate: (r) => {
    if (r.bool()) {
      const s = r.pick([1, -1]);
      const p = r.int(-3, 1);
      const q = r.int(p + 1, 3);
      const coefs = quarticInflection(p, q, s, r.int(-5, 5), r.int(-5, 5));
      const pts = [p, q];
      const d2 = (x: number) => 12 * s * (x - p) * (x - q);
      const conv = signSolve([{ root: p }, { root: q }], s, ">");
      const conc = signSolve([{ root: p }, { root: q }], s, "<");
      const rows: { label: string; signs: (1 | -1)[] }[] = [];
      if (s < 0) rows.push({ label: "-12", signs: [-1, -1, -1] });
      rows.push(
        { label: xm(p), signs: signsOn(pts, (x) => x - p) },
        { label: xm(q), signs: signsOn(pts, (x) => x - q) },
        { label: "f''(x)", signs: signsOn(pts, d2) },
      );
      return {
        statement: `Estudia la convexidad de $f(x) = ${poly(coefs)}$ con una tabla de signos de $f''$.`,
        sequential: true,
        parts: [
          {
            kind: "expr",
            prompt: "Calcula la segunda derivada.",
            before: "f''(x) =",
            answer: poly(dpoly(dpoly(coefs))),
            vars: ["x"],
            mistakes: [{ answer: poly(dpoly(coefs)), feedback: "Esa es la primera derivada. Deriva una vez más." }],
          },
          {
            kind: "signs",
            prompt: `Factorizando, $f''(x) = ${cf(12 * s)}${fx2(p, q)}$. Completa la tabla.`,
            points: [String(p), String(q)],
            rows,
            given: s < 0 ? [0] : undefined,
          },
          { kind: "interval", prompt: "$f$ es convexa en", answer: conv, mistakes: [{ answer: conc, feedback: "Ahí $f'' < 0$. Para la cátedra, $f'' > 0$ es convexa y $f'' < 0$ es cóncava." }] },
          { kind: "set", prompt: "Abscisas de los puntos de inflexión", before: "x \\in", answer: [p, q] },
        ],
        hints: [
          "Deriva dos veces y saca factor común $12$ o $-12$.",
          "Convexa donde $f'' > 0$. Hay inflexión donde $f''$ cambia de signo.",
        ],
        solution: [
          `$f'(x) = ${poly(dpoly(coefs))}$ y $f''(x) = ${poly(dpoly(dpoly(coefs)))} = ${cf(12 * s)}${fx2(p, q)}$.`,
          `Signo de $f''$: $${s > 0 ? "+" : "-"}$ en $(-\\infty, ${p})$, $${s > 0 ? "-" : "+"}$ en $(${p}, ${q})$ y $${s > 0 ? "+" : "-"}$ en $(${q}, +\\infty)$.`,
          `Convexa en $${unionTex(conv)}$ y cóncava en $${unionTex(conc)}$.`,
          `$f''$ cambia de signo en $x = ${p}$ y en $x = ${q}$: los dos son puntos de inflexión.`,
        ],
      };
    }
    const k = r.pick([1, -1]);
    const c = r.int(-3, 3);
    const xi = c - 2 * k;
    const ek = k === 1 ? "x" : "-x";
    const conv = [iv(xi, Infinity)];
    const d1 = k === 1 ? `${fx(c - 1)}e^{x}` : `(${poly([-1, c + 1])})e^{-x}`;
    return {
      statement: `Estudia la convexidad de $f(x) = ${fx(c)}e^{${ek}}$ con una tabla de signos de $f''$.`,
      sequential: true,
      parts: [
        {
          kind: "expr",
          prompt: "Calcula la segunda derivada y saca factor común la exponencial.",
          before: "f''(x) =",
          answer: `${fx(xi)}e^{${ek}}`,
          vars: ["x"],
          mistakes: [{ answer: d1, feedback: "Esa es la primera derivada. Deriva una vez más con la regla del producto." }],
        },
        {
          kind: "signs",
          prompt: "Completa la tabla de signos.",
          points: [String(xi)],
          rows: [
            { label: xm(xi), signs: [-1, 1] },
            { label: `e^{${ek}}`, signs: [1, 1] },
            { label: "f''(x)", signs: [-1, 1] },
          ],
        },
        { kind: "interval", prompt: "$f$ es convexa en", answer: conv, mistakes: [{ answer: [iv(-Infinity, xi)], feedback: "Ahí $f'' < 0$: la función es cóncava." }] },
        { kind: "set", prompt: "Abscisa del punto de inflexión", before: "x \\in", answer: [xi], mistakes: [{ answer: [c - k], feedback: "Ese es el punto crítico, donde $f' = 0$. La inflexión sale de $f''$." }] },
      ],
      hints: [
        `Regla del producto: la derivada de $e^{${ek}}$ es $${k === 1 ? "" : "-"}e^{${ek}}$.`,
        "Después de cada derivada saca factor común la exponencial. Siempre queda un polinomio de grado 1 por la exponencial.",
        "La exponencial es positiva y no cambia el signo.",
      ],
      solution: [
        `$f'(x) = ${d1}$.`,
        `$f''(x) = ${fx(xi)}e^{${ek}}$.`,
        `La exponencial es positiva, así que el signo de $f''$ es el de $${xm(xi)}$: $-$ antes de $${xi}$ y $+$ después.`,
        `Convexa en $(${xi}, +\\infty)$, cóncava en $(-\\infty, ${xi})$ e inflexión en $x = ${xi}$.`,
      ],
    };
  },
};

const inflexionEnPlano: ExerciseGen = {
  id: "inflexion-en-el-plano",
  title: "Ubicar el punto de inflexión (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const a = r.pick([1, -1, 2, -2]);
    const p = r.int(-3, 3);
    const m = r.int(-3, 3);
    const yi = r.int(-4, 4);
    const coefs = [a, -3 * a * p, 3 * a * p * p + m, -a * p ** 3 - m * p + yi];
    const rows: { label: string; signs: (1 | -1)[] }[] = [];
    if (a < 0) rows.push({ label: String(6 * a), signs: [-1, -1] });
    rows.push({ label: xm(p), signs: [-1, 1] }, { label: "f''(x)", signs: a > 0 ? [-1, 1] : [1, -1] });
    const toConv = a > 0;
    return {
      statement: `Sea $f(x) = ${poly(coefs)}$. Estudia el signo de $f''$ y ubica el punto de inflexión en el plano.`,
      sequential: true,
      parts: [
        {
          kind: "expr",
          prompt: "Calcula la segunda derivada.",
          before: "f''(x) =",
          answer: poly([6 * a, -6 * a * p]),
          vars: ["x"],
          mistakes: [{ answer: poly(dpoly(coefs)), feedback: "Esa es la primera derivada. Deriva una vez más." }],
        },
        {
          kind: "signs",
          prompt: `Como $f''(x) = ${cf(6 * a)}${fx(p)}$, completa la tabla.`,
          points: [String(p)],
          rows,
          given: a < 0 ? [0] : undefined,
        },
        choice(toConv ? "De cóncava a convexa" : "De convexa a cóncava", [
          [toConv ? "De convexa a cóncava" : "De cóncava a convexa", "Lee la última fila de la tabla: $f'' < 0$ es cóncava y $f'' > 0$ es convexa."],
          ["No cambia de curvatura", `$f''$ sí cambia de signo en $x = ${p}$.`],
        ], `¿Cómo cambia la curvatura de $f$ al pasar por $x = ${p}$?`),
        {
          kind: "place",
          prompt: "Arrastra el punto hasta el punto de inflexión. Al acertar verás la curva y su tangente en ese punto.",
          graph: { x: [-5, 5], y: [-6, 6] },
          items: [{ type: "point", label: "\\text{inflexión}", answer: [p, yi], start: [4, -5] }],
          reveal: [
            { fn: poly(coefs), color: "accent" },
            { fn: poly([m, yi - m * p]), color: "orange", dashed: true },
          ],
        },
      ],
      hints: [
        "Deriva dos veces. $f''$ es una recta.",
        "Hay inflexión donde $f''$ cambia de signo.",
        "La altura del punto sale de sustituir en $f$, no en $f''$.",
      ],
      solution: [
        `$f'(x) = ${poly(dpoly(coefs))}$ y $f''(x) = ${poly([6 * a, -6 * a * p])} = ${cf(6 * a)}${fx(p)}$.`,
        `$f''$ se anula en $x = ${p}$. Es ${toConv ? "negativa antes y positiva después: pasa de cóncava a convexa" : "positiva antes y negativa después: pasa de convexa a cóncava"}.`,
        `$f(${p}) = ${yi}$. El punto de inflexión es $(${p}, ${yi})$.`,
        `La tangente allí es $y = ${poly([m, yi - m * p])}$ y atraviesa la curva: de un lado la curva queda encima y del otro debajo.`,
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("concavidad"),
  objectives: [
    "Calcular la segunda derivada y leer en su signo la forma de la gráfica.",
    "Determinar intervalos de convexidad y concavidad con la convención de la cátedra.",
    "Hallar puntos de inflexión y distinguirlos de los puntos donde $f'' = 0$ sin cambio de signo.",
    "Clasificar extremos con el criterio de la segunda derivada.",
    "Hallar parámetros a partir de condiciones y leer una gráfica desde los signos de $f'$ y $f''$.",
  ],
  sections: [
    {
      id: "convexa-concava",
      title: "Funciones convexas y cóncavas",
      blocks: [
        {
          type: "text",
          md: "Dos funciones pueden crecer en el mismo intervalo y tener formas muy distintas. Una sube cada vez más rápido, como $e^{x}$. Otra sube cada vez más lento, como $\\ln x$. La primera se abre hacia arriba y la segunda hacia abajo. Esa curvatura es lo que estudia este tema.",
        },
        {
          type: "definition",
          title: "Convención de la cátedra",
          md: "Una función es **convexa** en un intervalo si su gráfica se abre hacia arriba, como $x^{2}$. Es **cóncava** si se abre hacia abajo, como $-x^{2}$.\n\nMuchos libros llaman \"cóncava hacia arriba\" a lo que aquí es convexa, y \"cóncava hacia abajo\" a lo que aquí es cóncava. En este curso se usan las palabras convexa y cóncava. Ante la duda, el signo de $f''$ lo aclara todo.",
        },
        {
          type: "text",
          md: "La definición formal usa cuerdas. $f$ es convexa en $[a, b]$ si el segmento que une dos puntos cualesquiera de la gráfica queda **por encima** de la curva. Es cóncava si el segmento queda **por debajo**. Con un parámetro $t \\in (0, 1)$, la condición para que sea convexa se escribe así:\n\n$$f\\big((1-t)a + tb\\big) < (1-t)f(a) + tf(b)$$\n\nEsta forma es la que más se usa en teoría económica.",
        },
        {
          type: "graph",
          spec: {
            x: [-3, 3],
            y: [-1, 5],
            height: 260,
            step: 1,
            curves: [{ fn: "\\frac{x^{2}}{2}", color: "accent" }],
            segments: [{ from: [-2, 2], to: [1.5, 1.125], color: "orange" }],
            points: [{ x: -2, y: 2 }, { x: 1.5, y: 1.125 }],
            labels: [{ x: 0.3, y: 3.6, text: "convexa", color: "accent" }],
          },
          caption: "Convexa: la cuerda queda por encima de la curva.",
        },
        {
          type: "graph",
          spec: {
            x: [-3, 3],
            y: [-1, 5],
            height: 260,
            step: 1,
            curves: [{ fn: "4 - \\frac{x^{2}}{2}", color: "blue" }],
            segments: [{ from: [-2, 2], to: [1.5, 2.875], color: "orange" }],
            points: [{ x: -2, y: 2 }, { x: 1.5, y: 2.875 }],
            labels: [{ x: -2.2, y: 0.5, text: "cóncava", color: "blue" }],
          },
          caption: "Cóncava: la cuerda queda por debajo de la curva.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Rendimientos decrecientes",
          md: "Una función de producción cóncava dice que cada trabajador adicional aporta menos que el anterior: rendimientos decrecientes. Una función de costo convexa dice que producir cada unidad extra cuesta más que la anterior. Por eso en economía la concavidad y la convexidad aparecen en casi todos los modelos.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Cómo es $f(x) = e^{x}$ según la convención de la cátedra?",
            parts: [choice("Convexa", [["Cóncava", "$e^{x}$ se abre hacia arriba: sube cada vez más rápido."]])],
            solution: ["$f''(x) = e^{x} > 0$. Es convexa (cóncava hacia arriba en otros libros)."],
          },
        },
      ],
    },
    {
      id: "segunda-derivada",
      title: "La segunda derivada decide",
      blocks: [
        {
          type: "text",
          md: "En una curva convexa las pendientes de las tangentes van aumentando de izquierda a derecha: $f'$ es creciente. En una cóncava van disminuyendo: $f'$ es decreciente. Y para saber si $f'$ crece basta mirar el signo de su derivada, que es $f''$.",
        },
        {
          type: "definition",
          title: "Criterio de la segunda derivada para la convexidad",
          md: "Si $f''(x) > 0$ para todo $x$ de $(a, b)$, $f$ es **convexa** en $(a, b)$.\n\nSi $f''(x) < 0$ para todo $x$ de $(a, b)$, $f$ es **cóncava** en $(a, b)$.",
        },
        {
          type: "widget",
          widget: { kind: "tangent", fn: "x^{3} - 3x^{2} + 2", x: [-1.5, 3.5], y: [-3, 3], showAnalysis: true, derivative: "3x^{2} - 6x" },
          caption: "Mueve el punto. A la izquierda de $x = 1$ las pendientes bajan (cóncava) y a la derecha suben (convexa).",
        },
        {
          type: "example",
          title: "Intervalos de convexidad",
          problem: "Halla los intervalos de convexidad y concavidad de $f(x) = x^{4} - 3x^{2} + 6$.",
          steps: [
            "$f'(x) = 4x^{3} - 6x$ y $f''(x) = 12x^{2} - 6 = 6(2x^{2} - 1)$.",
            "$f''(x) = 0$ cuando $x^{2} = \\frac{1}{2}$, es decir $x = \\pm\\frac{\\sqrt{2}}{2}$.",
            "$2x^{2} - 1$ es positivo fuera de $\\left[-\\frac{\\sqrt{2}}{2}, \\frac{\\sqrt{2}}{2}\\right]$ y negativo dentro.",
          ],
          answer: "Convexa en $\\left(-\\infty, -\\frac{\\sqrt{2}}{2}\\right) \\cup \\left(\\frac{\\sqrt{2}}{2}, +\\infty\\right)$ y cóncava en $\\left(-\\frac{\\sqrt{2}}{2}, \\frac{\\sqrt{2}}{2}\\right)$.",
        },
        {
          type: "graph",
          spec: {
            x: [-2.3, 2.3],
            y: [2, 10],
            step: 1,
            curves: [{ fn: "x^{4} - 3x^{2} + 6", color: "accent" }],
            points: [{ x: -0.7071, y: 4.75, color: "orange" }, { x: 0.7071, y: 4.75, color: "orange" }],
            labels: [
              { x: -1.05, y: 3, text: "inflexión", color: "orange" },
              { x: 0.35, y: 3, text: "inflexión", color: "orange" },
            ],
          },
          caption: "$f(x) = x^{4} - 3x^{2} + 6$ cambia de convexa a cóncava y de vuelta a convexa.",
        },
        {
          type: "note",
          tone: "warning",
          title: "No confundas los signos",
          md: "$f'$ dice si la función sube o baja. $f''$ dice hacia dónde se abre. Una función puede ser decreciente y convexa a la vez, como $e^{-x}$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿En qué intervalo es cóncava $f(x) = x^{3} - 6x^{2} + 1$?",
            parts: [{ kind: "interval", answer: [iv(-Infinity, 2)] }],
            solution: ["$f''(x) = 6x - 12$, negativa para $x < 2$. Cóncava en $(-\\infty, 2)$."],
          },
        },
        {
          type: "quick",
          exercise: {
            statement: "En el ejemplo, $f''(x) = 12\\left(x + \\frac{\\sqrt{2}}{2}\\right)\\left(x - \\frac{\\sqrt{2}}{2}\\right)$. Completa la tabla de signos de $f''$.",
            parts: [{
              kind: "signs",
              points: ["-\\frac{\\sqrt{2}}{2}", "\\frac{\\sqrt{2}}{2}"],
              rows: [
                { label: "x + \\frac{\\sqrt{2}}{2}", signs: [-1, 1, 1] },
                { label: "x - \\frac{\\sqrt{2}}{2}", signs: [-1, -1, 1] },
                { label: "f''(x)", signs: [1, -1, 1] },
              ],
            }],
            hints: ["$\\frac{\\sqrt{2}}{2} \\approx 0{,}71$. Prueba con $x = -1$, $x = 0$ y $x = 1$."],
            solution: [
              "Cada factor es negativo a la izquierda de su raíz y positivo a la derecha.",
              "Multiplicando por columnas, $f''$ es $+$, $-$, $+$: convexa, cóncava y convexa otra vez.",
            ],
          },
        },
      ],
    },
    {
      id: "inflexion",
      title: "Puntos de inflexión",
      blocks: [
        {
          type: "text",
          md: "Un punto de inflexión es un punto de la gráfica donde la curva cambia de forma: pasa de convexa a cóncava o al revés. Allí la recta tangente atraviesa la curva.",
        },
        {
          type: "definition",
          title: "Punto de inflexión",
          md: "$f$ tiene un **punto de inflexión** en $a$, con $a$ en el dominio y $f$ continua en $a$, si $f''$ cambia de signo en $a$: existe $\\delta > 0$ tal que $f'' > 0$ en $(a - \\delta, a)$ y $f'' < 0$ en $(a, a + \\delta)$, o al revés.\n\nSi $f'$ es derivable en un punto de inflexión $a$, entonces $f''(a) = 0$.",
        },
        {
          type: "definition",
          title: "Punto crítico de segundo orden",
          md: "Un punto $a$ del dominio es **punto crítico de segundo orden** si $f''(a) = 0$ o si $f''(a)$ no existe. Son los candidatos a inflexión. Para confirmar hay que ver que $f''$ cambia de signo.",
        },
        {
          type: "example",
          title: "Inflexión de una exponencial",
          problem: "Halla el punto de inflexión de $f(x) = xe^{x}$.",
          steps: [
            "$f'(x) = e^{x} + xe^{x} = (x + 1)e^{x}$.",
            "$f''(x) = e^{x} + (x + 1)e^{x} = (x + 2)e^{x}$.",
            "$e^{x} > 0$, así que el signo de $f''$ es el de $x + 2$: negativo antes de $-2$ y positivo después. Cambia de signo.",
            "$f(-2) = -2e^{-2}$.",
          ],
          answer: "Punto de inflexión en $\\left(-2, -2e^{-2}\\right)$. Cóncava en $(-\\infty, -2)$ y convexa en $(-2, +\\infty)$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Que f'' valga cero no basta",
          md: "$f(x) = x^{4}$ tiene $f''(x) = 12x^{2}$, que vale $0$ en $x = 0$. Pero $f''$ es positiva a los dos lados: la función es convexa en todo $\\mathbb{R}$ y no hay inflexión.",
        },
        {
          type: "note",
          tone: "tip",
          title: "Dónde más buscar",
          md: "La concavidad también puede cambiar donde $f''$ no existe. $f(x) = \\sqrt[3]{x}$ tiene inflexión en $x = 0$ aunque allí $f''$ no exista. En cambio $\\frac{1}{x}$ cambia de cóncava a convexa al cruzar $x = 0$, pero ese punto no está en el dominio y no es inflexión. Igual hay que ponerlo en la tabla de signos.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Halla las abscisas de los puntos de inflexión de $f(x) = x^{4} - 6x^{2}$.",
            parts: [{ kind: "set", before: "x \\in", answer: [-1, 1] }],
            solution: ["$f''(x) = 12x^{2} - 12 = 12(x - 1)(x + 1)$, que cambia de signo en $x = \\pm 1$."],
          },
        },
        {
          type: "quick",
          exercise: {
            statement: "Arrastra el punto hasta el punto de inflexión de $f(x) = x^{3} - 3x^{2} + 2$. Al acertar aparece la curva.",
            parts: [{
              kind: "place",
              graph: { x: [-2, 4], y: [-4, 4] },
              items: [{ type: "point", label: "\\text{inflexión}", answer: [1, 0], start: [3, 3] }],
              reveal: [{ fn: "x^{3} - 3x^{2} + 2", color: "accent" }],
            }],
            hints: ["$f''(x) = 6x - 6$.", "Después de hallar la abscisa, calcula la altura con $f$."],
            solution: [
              "$f''(x) = 6x - 6$ se anula en $x = 1$ y pasa de negativa a positiva: de cóncava a convexa.",
              "$f(1) = 1 - 3 + 2 = 0$. El punto de inflexión es $(1, 0)$.",
            ],
          },
        },
      ],
    },
    {
      id: "criterio-segunda",
      title: "Criterio de la segunda derivada para extremos",
      blocks: [
        {
          type: "text",
          md: "Cerca de un mínimo la curva se abre hacia arriba, y cerca de un máximo se abre hacia abajo. Por eso, en un punto donde la tangente es horizontal, el signo de $f''$ dice qué tipo de extremo hay sin tener que estudiar los signos de $f'$.",
        },
        {
          type: "definition",
          title: "Criterio de la segunda derivada",
          md: "Sea $a$ con $f'(a) = 0$.\n\n- Si $f''(a) < 0$, $f$ tiene un **máximo local** en $a$.\n- Si $f''(a) > 0$, $f$ tiene un **mínimo local** en $a$.\n- Si $f''(a) = 0$, el criterio **no decide**. Hay que volver al criterio de la primera derivada.",
        },
        {
          type: "example",
          title: "Pregunta de parcial",
          problem: "Determina los extremos de $h(x) = \\dfrac{x}{2}e^{\\frac{x}{2}}$ con el criterio de la segunda derivada.",
          steps: [
            "$h'(x) = \\frac{1}{2}e^{x/2} + \\frac{x}{4}e^{x/2} = \\frac{1}{4}e^{x/2}(x + 2)$. Se anula en $x = -2$.",
            "$h''(x) = \\frac{1}{8}e^{x/2}(x + 2) + \\frac{1}{4}e^{x/2} = \\frac{1}{8}e^{x/2}(x + 4)$.",
            "$h''(-2) = \\frac{1}{8}e^{-1}\\cdot 2 = \\frac{1}{4e} > 0$: mínimo local.",
            "$h(-2) = -e^{-1} = -\\frac{1}{e}$.",
          ],
          answer: "Mínimo local en $\\left(-2, -\\frac{1}{e}\\right)$. No hay máximos.",
        },
        {
          type: "example",
          title: "Otra de parcial, con raíz",
          problem: "Halla los puntos críticos de $g(x) = x\\sqrt{2 - x^{2}}$ y clasifícalos con el criterio de la segunda derivada.",
          steps: [
            "Dominio: $[-\\sqrt{2}, \\sqrt{2}]$.",
            "$g'(x) = \\sqrt{2 - x^{2}} - \\dfrac{x^{2}}{\\sqrt{2 - x^{2}}} = \\dfrac{2 - 2x^{2}}{\\sqrt{2 - x^{2}}}$. Se anula en $x = \\pm 1$. En $x = \\pm\\sqrt{2}$ no existe, pero son los bordes del dominio.",
            "$g''(x) = \\dfrac{2x(x^{2} - 3)}{(2 - x^{2})^{3/2}}$.",
            "$g''(1) = \\frac{2(-2)}{1} = -4 < 0$: máximo local, $g(1) = 1$.",
            "$g''(-1) = 4 > 0$: mínimo local, $g(-1) = -1$.",
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "Cuando f'' vale cero",
          md: "$x^{4}$, $-x^{4}$ y $x^{3}$ cumplen $f'(0) = 0$ y $f''(0) = 0$. La primera tiene un mínimo, la segunda un máximo y la tercera nada. Por eso con $f''(a) = 0$ el criterio no concluye.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Condición de segundo orden",
          md: "En economía, $U'(q) = 0$ se llama condición de primer orden y $U''(q) < 0$ condición de segundo orden. La segunda asegura que el punto hallado es un máximo de utilidad y no un mínimo.",
        },
        {
          type: "quick",
          exercise: {
            statement: "$f(x) = x^{3} - 3x$ tiene puntos críticos en $x = \\pm 1$. ¿Qué tiene en $x = 1$?",
            parts: [choice("Un mínimo local", [["Un máximo local", "$f''(1) = 6 > 0$: la curva es convexa allí."], ["El criterio no decide", "$f''(1) = 6 \\neq 0$, el criterio sí decide."]])],
            solution: ["$f''(x) = 6x$ y $f''(1) = 6 > 0$: mínimo local."],
          },
        },
      ],
    },
    {
      id: "parametros",
      title: "Hallar parámetros",
      blocks: [
        {
          type: "text",
          md: "En los parciales aparecen funciones con letras en lugar de números, y te piden los valores que hacen que la función cumpla ciertas condiciones. Cada condición se traduce en una ecuación:\n\n- Pasa por $(a, b)$: $f(a) = b$.\n- Extremo en $x = a$: $f'(a) = 0$.\n- Inflexión en $x = a$: $f''(a) = 0$.",
        },
        {
          type: "example",
          title: "Coeficientes de una cúbica (pregunta de parcial)",
          problem: "Halla $a$, $b$, $c$ y $d$ para que $f(x) = ax^{3} + bx^{2} + cx + d$ tenga un extremo en $(1, -2)$ y un punto de inflexión en $(0, 0)$.",
          steps: [
            "$f'(x) = 3ax^{2} + 2bx + c$ y $f''(x) = 6ax + 2b$.",
            "Pasa por $(0, 0)$: $f(0) = d = 0$. Inflexión en $0$: $f''(0) = 2b = 0$, así que $b = 0$.",
            "Pasa por $(1, -2)$: $a + c = -2$. Extremo en $1$: $f'(1) = 3a + c = 0$.",
            "Restando las dos ecuaciones: $2a = 2$, $a = 1$ y $c = -3$.",
            "$f(x) = x^{3} - 3x$. Comprobación: $f''(1) = 6 > 0$, así que el extremo en $(1, -2)$ es un mínimo.",
          ],
          answer: "$a = 1$, $b = 0$, $c = -3$, $d = 0$.",
        },
        {
          type: "example",
          title: "Concavidad con parámetros (pregunta de parcial)",
          problem: "Sea $f(x) = \\dfrac{1}{a}e^{-\\frac{x^{2}}{b}}$ con $a \\neq 0$ y $b > 0$. Halla sus intervalos de convexidad y concavidad y sus puntos de inflexión.",
          steps: [
            "$f'(x) = \\dfrac{1}{a}e^{-x^{2}/b}\\cdot\\left(-\\dfrac{2x}{b}\\right) = -\\dfrac{2x}{ab}e^{-x^{2}/b}$.",
            "$f''(x) = -\\dfrac{2}{ab}e^{-x^{2}/b} + \\dfrac{4x^{2}}{ab^{2}}e^{-x^{2}/b} = \\dfrac{2}{ab^{2}}e^{-x^{2}/b}\\left(2x^{2} - b\\right)$.",
            "$f''(x) = 0$ cuando $x = \\pm\\sqrt{b/2}$. El factor $2x^{2} - b$ es positivo fuera de ese intervalo y negativo dentro.",
            "Si $a > 0$: convexa en $\\left(-\\infty, -\\sqrt{b/2}\\right) \\cup \\left(\\sqrt{b/2}, +\\infty\\right)$ y cóncava en $\\left(-\\sqrt{b/2}, \\sqrt{b/2}\\right)$. Si $a < 0$ se intercambian.",
            "Inflexión en $x = \\pm\\sqrt{b/2}$, con $f = \\frac{1}{a}e^{-1/2}$.",
          ],
        },
        {
          type: "graph",
          spec: {
            x: [-4, 4],
            y: [-0.2, 1.2],
            curves: [{ fn: "e^{-\\frac{x^{2}}{2}}", color: "accent" }],
            points: [{ x: -1, y: 0.6065, color: "orange" }, { x: 1, y: 0.6065, color: "orange" }],
            labels: [
              { x: -2.55, y: 0.62, text: "inflexión", color: "orange" },
              { x: 1.25, y: 0.62, text: "inflexión", color: "orange" },
            ],
          },
          caption: "Con $a = 1$ y $b = 2$ las inflexiones están en $x = \\pm 1$. Es la forma de la campana de Gauss.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Halla $k$ para que $f(x) = x^{3} + kx^{2}$ tenga un punto de inflexión en $x = 2$.",
            parts: [{ kind: "expr", before: "k =", answer: "-6" }],
            solution: ["$f''(x) = 6x + 2k$. En $x = 2$: $12 + 2k = 0$, $k = -6$."],
          },
        },
      ],
    },
    {
      id: "grafica-signos",
      title: "La gráfica a partir de los signos de f' y f''",
      blocks: [
        {
          type: "text",
          md: "Con los signos de $f'$ y $f''$ en cada tramo se puede dibujar la forma de la gráfica sin conocer la fórmula. Hay cuatro combinaciones posibles:",
        },
        {
          type: "table",
          headers: ["$f'$", "$f''$", "Forma", "Ejemplo"],
          rows: [
            ["$+$", "$+$", "Sube cada vez más rápido", "$e^{x}$"],
            ["$+$", "$-$", "Sube cada vez más lento", "$\\ln x$"],
            ["$-$", "$+$", "Baja cada vez más lento", "$e^{-x}$"],
            ["$-$", "$-$", "Baja cada vez más rápido", "$-e^{x}$"],
          ],
        },
        {
          type: "example",
          title: "Leer la información",
          problem: "Una función continua cumple $f'(x) > 0$ en $(-\\infty, -1) \\cup (2, +\\infty)$, $f'(x) < 0$ en $(-1, 2)$, $f''(x) < 0$ en $(-\\infty, \\frac{1}{2})$ y $f''(x) > 0$ en $(\\frac{1}{2}, +\\infty)$. Describe su forma.",
          steps: [
            "En $x = -1$, $f'$ pasa de $+$ a $-$: máximo local.",
            "En $x = 2$, $f'$ pasa de $-$ a $+$: mínimo local.",
            "En $x = \\frac{1}{2}$, $f''$ pasa de $-$ a $+$: punto de inflexión, de cóncava a convexa.",
            "Se dibuja subiendo y curvada hacia abajo hasta $-1$, bajando hasta $2$ con el cambio de curvatura en $\\frac{1}{2}$, y subiendo curvada hacia arriba después de $2$.",
          ],
        },
        {
          type: "note",
          tone: "tip",
          title: "Cómo lo piden en el parcial",
          md: "Suelen dar además valores como $f(0) = 4$, límites como $\\lim_{x \\to 1^{-}} f(x) = \\infty$ o una asíntota oblicua. Primero ubica los puntos y las asíntotas, después une los tramos respetando el crecimiento y la curvatura de cada uno.",
        },
        {
          type: "quick",
          exercise: {
            statement: "En $(0, 4)$ una función cumple $f' < 0$ y $f'' > 0$. ¿Cuál puede ser su gráfica?",
            parts: [{
              kind: "choice",
              shuffle: false,
              options: [
                { label: "Gráfica A", graph: shapeGraph("dk"), feedback: "Esa baja cada vez más rápido: es cóncava." },
                { label: "Gráfica B", graph: shapeGraph("dc"), correct: true },
                { label: "Gráfica C", graph: shapeGraph("ck"), feedback: "Esa sube. Con $f' < 0$ tiene que bajar." },
              ],
            }],
            solution: ["Baja ($f' < 0$) y se abre hacia arriba ($f'' > 0$): la gráfica B."],
          },
        },
      ],
    },
  ],
  exercises: [
    signoSegunda,
    convencion,
    inflexionCubica,
    criterioSimple,
    inflexionCuartica,
    expSegunda,
    tablaSignosSegunda,
    graficaSignos,
    vfInflexion,
    parametroInflexion,
    extremosSegundaExp,
    raizSegunda,
    parametrosNormal,
    leerSignos,
    inflexionEnPlano,
  ],
};

export default topic;
