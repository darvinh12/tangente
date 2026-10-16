import { meta } from "../catalog";
import { choice, trueFalse } from "../helpers";
import type { ExerciseGen, Part, Rich, Topic } from "../types";
import { R, intersect, iv, minusPoints, unionTex, type Interval } from "@/lib/math/intervals";
import { frac, minus, poly } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

const ivTex = (I: Interval[]) => unionTex(I);
const plusK = (k: number) => (k === 0 ? "" : k > 0 ? ` + ${k}` : ` - ${-k}`);
const par = (n: number) => (n < 0 ? `(${n})` : String(n));

/** Tabla de valores en LaTeX para funciones definidas en {1, 2, 3, 4}. */
function tableTex(f: number[], g: number[]) {
  return `\\begin{array}{c|cccc} x & 1 & 2 & 3 & 4 \\\\ \\hline f(x) & ${f.join(" & ")} \\\\ g(x) & ${g.join(" & ")} \\end{array}`;
}

/* ----------------------------------- ejercicios ----------------------------------- */

const evaluarCompuesta: ExerciseGen = {
  id: "evaluar-compuesta",
  title: "Evaluar una compuesta",
  level: 1,
  generate: (r) => {
    const m = r.pick([2, 3, -2, -1, 4]);
    const b = r.int(-5, 5);
    const c = r.int(-4, 4);
    const fTex = poly([m, b]);
    const gTex = poly([1, 0, c]);
    const f = (x: number) => m * x + b;
    const g = (x: number) => x * x + c;
    const a = r.nz(-3, 3);
    const fog = r.bool();
    const ans = fog ? f(g(a)) : g(f(a));
    const other = fog ? g(f(a)) : f(g(a));
    const prod = f(a) * g(a);
    const mistakes: { answer: string; feedback: Rich }[] = [];
    if (other !== ans) mistakes.push({ answer: String(other), feedback: `Calculaste en el orden contrario. En $(${fog ? "f \\circ g" : "g \\circ f"})(${a})$ primero actúa ${fog ? "$g$" : "$f$"}, la que está a la derecha.` });
    if (prod !== ans && prod !== other) mistakes.push({ answer: String(prod), feedback: "Multiplicaste $f$ por $g$. Componer no es multiplicar: el resultado de una función entra en la otra." });
    const inner = fog ? g(a) : f(a);
    return {
      statement: `Sean $f(x) = ${fTex}$ y $g(x) = ${gTex}$. Calcula $(${fog ? "f \\circ g" : "g \\circ f"})(${a})$.`,
      parts: [{ kind: "expr", before: `(${fog ? "f \\circ g" : "g \\circ f"})(${a}) =`, answer: String(ans), mistakes }],
      hints: [`$(${fog ? "f \\circ g" : "g \\circ f"})(${a}) = ${fog ? `f(g(${a}))` : `g(f(${a}))`}$. Empieza por la de adentro.`],
      solution: [
        fog ? `Primero $g(${a}) = ${par(a)}^2${plusK(c)} = ${inner}$.` : `Primero $f(${a}) = ${m}\\cdot ${par(a)}${plusK(b)} = ${inner}$.`,
        fog ? `Luego $f(${inner}) = ${m} \\cdot ${par(inner)}${plusK(b)} = ${ans}$.` : `Luego $g(${inner}) = ${par(inner)}^2${plusK(c)} = ${ans}$.`,
      ],
    };
  },
};

const formulaCompuesta: ExerciseGen = {
  id: "formula-compuesta",
  title: "Fórmula de una compuesta",
  level: 1,
  generate: (r) => {
    const m = r.pick([2, 3, -2, -1, 5]);
    const b = r.nz(-5, 5);
    const c = r.nz(-4, 4);
    const fTex = poly([m, b]);
    const gTex = poly([1, 0, c]);
    const fog = r.bool();
    const ans = fog ? `${m}(x^{2}${plusK(c)})${plusK(b)}` : `(${fTex})^{2}${plusK(c)}`;
    const other = fog ? `(${fTex})^{2}${plusK(c)}` : `${m}(x^{2}${plusK(c)})${plusK(b)}`;
    const expanded = fog ? poly([m, 0, m * c + b]) : poly([m * m, 2 * m * b, b * b + c]);
    return {
      statement: `Sean $f(x) = ${fTex}$ y $g(x) = ${gTex}$. Halla $(${fog ? "f \\circ g" : "g \\circ f"})(x)$.`,
      parts: [{
        kind: "expr", before: `(${fog ? "f \\circ g" : "g \\circ f"})(x) =`, answer: ans, vars: ["x"],
        mistakes: [
          { answer: other, feedback: "Compusiste en el orden contrario. La función de la derecha es la que actúa primero." },
          { answer: `(${fTex})(${gTex})`, feedback: "Eso es el producto $f \\cdot g$. Componer es meter una función dentro de la otra." },
        ],
      }],
      hints: [
        fog ? "$(f \\circ g)(x) = f(g(x))$. Escribe la fórmula de $f$ y donde aparece $x$ pon $g(x)$ completo." : "$(g \\circ f)(x) = g(f(x))$. Escribe la fórmula de $g$ y donde aparece $x$ pon $f(x)$ completo.",
        "Usa paréntesis al sustituir.",
      ],
      solution: [
        fog ? `$f(g(x)) = ${m}\\,g(x)${plusK(b)} = ${ans}$.` : `$g(f(x)) = [f(x)]^2${plusK(c)} = ${ans}$.`,
        `Desarrollando: $${expanded}$.`,
      ],
    };
  },
};

const operacionEvaluar: ExerciseGen = {
  id: "operacion-evaluar",
  title: "Operar funciones en un punto",
  level: 1,
  generate: (r) => {
    const f = { a: r.nz(-3, 3), b: r.int(-5, 5) };
    const g = { c: r.int(-4, 4) };
    const fTex = poly([f.a, f.b]);
    const gTex = poly([1, 0, g.c]);
    const F = (x: number) => f.a * x + f.b;
    const G = (x: number) => x * x + g.c;
    let a: number;
    do a = r.int(-3, 3); while (G(a) === 0);
    const op = r.pick(["+", "-", "\\cdot", "/"] as const);
    const fa = F(a);
    const ga = G(a);
    const val = op === "+" ? String(fa + ga) : op === "-" ? String(fa - ga) : op === "\\cdot" ? String(fa * ga) : frac(fa, ga);
    const name = op === "/" ? "\\frac{f}{g}" : `f ${op} g`;
    return {
      statement: `Sean $f(x) = ${fTex}$ y $g(x) = ${gTex}$. Calcula $\\left(${name}\\right)(${a})$.`,
      parts: [{ kind: "expr", before: `\\left(${name}\\right)(${a}) =`, answer: val }],
      hints: ["Operar funciones es operar sus imágenes: calcula $f(" + a + ")$ y $g(" + a + ")$ por separado y después opera los números."],
      solution: [
        `$f(${a}) = ${fa}$ y $g(${a}) = ${ga}$.`,
        op === "/" ? `$\\left(\\frac{f}{g}\\right)(${a}) = \\frac{${fa}}{${ga}} = ${val}$.` : `$(${name})(${a}) = ${par(fa)} ${op} ${par(ga)} = ${val}$.`,
      ],
    };
  },
};

const dominioSuma: ExerciseGen = {
  id: "dominio-suma",
  title: "Dominio de una suma de funciones",
  level: 1,
  generate: (r) => {
    let fTex: string, gTex: string, Df: Interval[], Dg: Interval[];
    if (r.bool()) {
      const a = r.int(-5, 2);
      const b = a + r.int(1, 6);
      fTex = `\\sqrt{${minus("x", a)}}`;
      gTex = `\\sqrt{${b} - x}`;
      Df = [iv(a, Infinity, true)];
      Dg = [iv(-Infinity, b, false, true)];
    } else {
      const a = r.int(-5, 3);
      const b = r.int(-5, 6);
      fTex = `\\ln(${minus("x", a)})`;
      gTex = `\\frac{1}{${minus("x", b)}}`;
      Df = [iv(a, Infinity)];
      Dg = minusPoints(R, [b]);
    }
    const D = intersect(Df, Dg);
    return {
      statement: `Sean $f(x) = ${fTex}$ y $g(x) = ${gTex}$. Halla el dominio de $f + g$.`,
      parts: [{ kind: "interval", before: "\\text{Dom}(f + g) =", answer: D, mistakes: [{ answer: Df, feedback: "Ese es solo el dominio de $f$. Para sumar hacen falta las dos imágenes, así que $x$ tiene que estar en los dos dominios." }] }],
      hints: ["$\\text{Dom}(f + g) = \\text{Dom} f \\cap \\text{Dom} g$.", "Halla cada dominio por separado y dibújalos en la misma recta."],
      solution: [
        `$\\text{Dom} f = ${ivTex(Df)}$ y $\\text{Dom} g = ${ivTex(Dg)}$.`,
        `La suma solo existe donde existen las dos: $\\text{Dom}(f + g) = ${ivTex(D)}$.`,
      ],
    };
  },
};

const ordenImporta: ExerciseGen = {
  id: "orden-importa",
  title: "¿Importa el orden?",
  level: 1,
  generate: (r) => {
    const a = r.nz(-5, 5);
    const b = r.nz(-5, 5);
    const k = r.int(2, 4);
    const pairs: { f: string; g: string; fog: string; gof: string; same: boolean }[] = [
      { f: `x${plusK(a)}`, g: `x${plusK(b)}`, fog: `x${plusK(a + b)}`, gof: `x${plusK(a + b)}`, same: true },
      { f: "x^{2}", g: "x^{3}", fog: "(x^{3})^{2} = x^{6}", gof: "(x^{2})^{3} = x^{6}", same: true },
      { f: `${k}x`, g: `${-k - 1}x`, fog: `${k * (-k - 1)}x`, gof: `${k * (-k - 1)}x`, same: true },
      { f: "x^{2}", g: `x${plusK(a)}`, fog: `(x${plusK(a)})^{2}`, gof: `x^{2}${plusK(a)}`, same: false },
      { f: `${k}x`, g: `x${plusK(a)}`, fog: `${k}(x${plusK(a)}) = ${poly([k, k * a])}`, gof: `${k}x${plusK(a)}`, same: false },
      { f: "\\sqrt{x}", g: `x + ${Math.abs(a)}`, fog: `\\sqrt{x + ${Math.abs(a)}}`, gof: `\\sqrt{x} + ${Math.abs(a)}`, same: false },
      { f: "\\frac{1}{x}", g: `x + ${Math.abs(b)}`, fog: `\\frac{1}{x + ${Math.abs(b)}}`, gof: `\\frac{1}{x} + ${Math.abs(b)}`, same: false },
    ];
    const p = r.pick(pairs);
    const why = p.same
      ? `En este caso sí coinciden: $(f \\circ g)(x) = ${p.fog}$ y $(g \\circ f)(x) = ${p.gof}$. Es una casualidad de estas dos funciones, no una regla.`
      : `$(f \\circ g)(x) = ${p.fog}$ pero $(g \\circ f)(x) = ${p.gof}$. Son distintas.`;
    return {
      statement: `Sean $f(x) = ${p.f}$ y $g(x) = ${p.g}$. ¿Es cierto que $(f \\circ g)(x) = (g \\circ f)(x)$ para todo $x$?`,
      parts: [trueFalse(p.same, why)],
      hints: ["Calcula las dos compuestas y compáralas. Si dudas, prueba con un número como $x = 1$."],
      solution: [`$(f \\circ g)(x) = f(g(x)) = ${p.fog}$.`, `$(g \\circ f)(x) = g(f(x)) = ${p.gof}$.`, p.same ? "Coinciden para estas funciones." : "No coinciden. La composición no es conmutativa."],
    };
  },
};

const dominioCociente: ExerciseGen = {
  id: "dominio-cociente",
  title: "Dominio de un cociente",
  level: 2,
  generate: (r) => {
    const a = r.int(-4, 2);
    const fTex = `\\sqrt{${minus("x", a)}}`;
    const Df = [iv(a, Infinity, true)];
    let gTex: string, zeros: number[];
    if (r.bool()) {
      const c = r.int(1, 4);
      gTex = `x^{2} - ${c * c}`;
      zeros = [-c, c];
    } else {
      const z1 = r.int(-5, 5);
      let z2 = r.int(-5, 5);
      if (z2 === z1) z2 = z1 + 2;
      gTex = poly([1, -(z1 + z2), z1 * z2]);
      zeros = [z1, z2].sort((p, q) => p - q);
    }
    const D = minusPoints(Df, zeros);
    const inside = zeros.filter((z) => z >= a);
    const qName = r.bool() ? "f/g" : "g/f";
    const isFg = qName === "f/g";
    const Dq = isFg ? D : [iv(a, Infinity)];
    return {
      statement: `Sean $f(x) = ${fTex}$ y $g(x) = ${gTex}$. Halla el dominio de $${isFg ? "\\frac{f}{g}" : "\\frac{g}{f}"}$.`,
      parts: [{
        kind: "interval", before: `\\text{Dom}\\,${isFg ? "\\frac{f}{g}" : "\\frac{g}{f}"} =`, answer: Dq,
        mistakes: isFg && !inside.length ? [] : [{ answer: Df, feedback: isFg ?"Te faltó quitar los ceros del denominador $g$." : `El denominador ahora es $f$, que vale 0 en $x = ${a}$. Ese punto sale.` }],
      }],
      hints: [
        "El dominio de un cociente es la intersección de los dominios, menos los puntos donde el denominador vale cero.",
        isFg ? "Iguala $g(x) = 0$ y quita solo las raíces que estén dentro de $\\text{Dom} f$." : "Aquí el denominador es la raíz. ¿Dónde vale cero?",
      ],
      solution: isFg
        ? [
            `$\\text{Dom} f = [${a}, +\\infty)$ y $\\text{Dom} g = \\mathbb{R}$. La intersección es $[${a}, +\\infty)$.`,
            `$g(x) = 0$ en $x = ${zeros.join("$ y $x = ")}$. ${inside.length ? `Dentro de $[${a}, +\\infty)$ ${inside.length > 1 ? "están" : "está"} $${inside.join(", ")}$, que se quita${inside.length > 1 ? "n" : ""}.` : `Ninguno está en $[${a}, +\\infty)$, así que no hay que quitar nada.`}`,
            `$\\text{Dom}\\,\\frac{f}{g} = ${ivTex(D)}$.`,
          ]
        : [
            `$\\text{Dom} f = [${a}, +\\infty)$ y $\\text{Dom} g = \\mathbb{R}$. La intersección es $[${a}, +\\infty)$.`,
            `El denominador $f(x) = ${fTex}$ vale 0 solo en $x = ${a}$, así que ese extremo sale.`,
            `$\\text{Dom}\\,\\frac{g}{f} = (${a}, +\\infty)$.`,
          ],
    };
  },
};

const dominioCompuesta: ExerciseGen = {
  id: "dominio-compuesta",
  title: "Dominio de una compuesta",
  level: 2,
  generate: (r) => {
    const kind = r.pick(["sqrt-lin", "ln-lin", "frac-sq", "sqrt-sq"] as const);
    let fTex: string, gTex: string, comp: string, D: Interval[], steps: string[];
    if (kind === "sqrt-lin") {
      const m = r.pick([2, -2, 3, -1, 1]);
      const x0 = r.int(-4, 4);
      gTex = poly([m, -m * x0]);
      fTex = "\\sqrt{x}";
      comp = `\\sqrt{${gTex}}`;
      D = m > 0 ? [iv(x0, Infinity, true)] : [iv(-Infinity, x0, false, true)];
      steps = [`Necesitamos $g(x) \\in \\text{Dom} f = [0, +\\infty)$, o sea $${gTex} \\ge 0$.`, `Despejando: $x ${m > 0 ? "\\ge" : "\\le"} ${x0}$.`];
    } else if (kind === "ln-lin") {
      const a = r.int(-5, 5);
      const left = r.bool();
      gTex = left ? `${a} - x` : minus("x", a);
      fTex = "\\ln x";
      comp = `\\ln(${gTex})`;
      D = left ? [iv(-Infinity, a)] : [iv(a, Infinity)];
      steps = [`Necesitamos $g(x) \\in \\text{Dom} f = (0, +\\infty)$, o sea $${gTex} > 0$.`, `Despejando: $x ${left ? "<" : ">"} ${a}$.`];
    } else if (kind === "frac-sq") {
      const k = r.int(1, 4);
      gTex = "x^{2}";
      fTex = `\\frac{1}{x - ${k * k}}`;
      comp = `\\frac{1}{x^{2} - ${k * k}}`;
      D = minusPoints(R, [-k, k]);
      steps = [`Necesitamos $g(x) \\in \\text{Dom} f = \\mathbb{R} - \\{${k * k}\\}$, o sea $x^2 \\ne ${k * k}$.`, `Eso excluye $x = ${k}$ y $x = ${-k}$.`];
    } else {
      const k = r.int(1, 4);
      gTex = "x^{2}";
      fTex = `\\sqrt{x - ${k * k}}`;
      comp = `\\sqrt{x^{2} - ${k * k}}`;
      D = [iv(-Infinity, -k, false, true), iv(k, Infinity, true)];
      steps = [`Necesitamos $g(x) \\in \\text{Dom} f = [${k * k}, +\\infty)$, o sea $x^2 \\ge ${k * k}$.`, `Eso pasa cuando $x \\le ${-k}$ o $x \\ge ${k}$.`];
    }
    return {
      statement: `Sean $f(x) = ${fTex}$ y $g(x) = ${gTex}$. Halla el dominio de $f \\circ g$.`,
      parts: [{ kind: "interval", before: "\\text{Dom}(f \\circ g) =", answer: D, mistakes: [{ answer: R, feedback: "Ese es el dominio de $g$. Además hace falta que $g(x)$ caiga dentro del dominio de $f$." }] }],
      hints: [
        "$\\text{Dom}(f \\circ g) = \\{ x \\in \\text{Dom} g \\;/\\; g(x) \\in \\text{Dom} f \\}$.",
        `La compuesta es $(f \\circ g)(x) = ${comp}$. Pide lo que exige esa fórmula.`,
      ],
      solution: [
        `$(f \\circ g)(x) = f(g(x)) = ${comp}$. Además $\\text{Dom} g = \\mathbb{R}$.`,
        ...steps,
        `$\\text{Dom}(f \\circ g) = ${ivTex(D)}$.`,
      ],
    };
  },
};

const descomponer: ExerciseGen = {
  id: "descomponer",
  title: "Descomponer en dos funciones",
  level: 2,
  generate: (r) => {
    const a = r.pick([2, 3, 5, -2]);
    const b = r.nz(-6, 6);
    const n = r.pick([3, 4, 5]);
    const lin = poly([a, b]);
    const quad = `x^{2}${plusK(Math.abs(b))}`;
    const cases: { h: string; outer: string; inner: string; bad: string }[] = [
      { h: `(${lin})^{${n}}`, outer: `x^{${n}}`, inner: lin, bad: `x${plusK(b)}` },
      { h: `\\sqrt{${quad}}`, outer: "\\sqrt{x}", inner: quad, bad: "x^{2}" },
      { h: `e^{${lin}}`, outer: "e^{x}", inner: lin, bad: `${a}x` },
      { h: `\\ln(${quad})`, outer: "\\ln x", inner: quad, bad: "x^{2}" },
      { h: `\\frac{1}{${lin}}`, outer: "\\frac{1}{x}", inner: lin, bad: `x${plusK(b)}` },
    ];
    const c = r.pick(cases);
    return {
      statement: `¿Cuál par de funciones cumple $h = f \\circ g$, si $h(x) = ${c.h}$?`,
      parts: [choice(`$f(x) = ${c.outer}$ y $g(x) = ${c.inner}$`, [
        [`$f(x) = ${c.inner}$ y $g(x) = ${c.outer}$`, `Ese par da $h = g \\circ f$. En $f \\circ g$ la que actúa primero es $g$, la de adentro.`],
        [`$f(x) = ${c.outer}$ y $g(x) = ${c.bad}$`, `Con ese $g$ la compuesta da $${c.outer.replace(/x/g, `(${c.bad})`)}$, que no es $h$.`],
      ])],
      hints: ["Piensa qué haría una calculadora: ¿qué cuenta harías primero con $x$ y cuál al final?", "Lo que se calcula primero es $g$ (adentro). Lo último es $f$ (afuera)."],
      solution: [
        `Para calcular $h(x)$ primero se obtiene $${c.inner}$ y después se le aplica ${c.outer === "\\sqrt{x}" ? "la raíz" : c.outer === "e^{x}" ? "la exponencial" : c.outer === "\\ln x" ? "el logaritmo" : c.outer === "\\frac{1}{x}" ? "el recíproco" : "la potencia"}.`,
        `Por eso $g(x) = ${c.inner}$ y $f(x) = ${c.outer}$. Comprobación: $f(g(x)) = ${c.h}$.`,
      ],
    };
  },
};

const tablasCompuesta: ExerciseGen = {
  id: "tablas-compuesta",
  title: "Componer con tablas",
  level: 2,
  generate: (r) => {
    const f = [1, 2, 3, 4].map(() => r.int(1, 4));
    const g = [1, 2, 3, 4].map(() => r.int(1, 4));
    const a = r.int(1, 4);
    const b = r.int(1, 4);
    const fog = f[g[a - 1] - 1];
    const gof = g[f[b - 1] - 1];
    const ff = f[f[a - 1] - 1];
    return {
      statement: `Las funciones $f$ y $g$, con dominio $\\{1, 2, 3, 4\\}$, vienen dadas por la tabla. $$${tableTex(f, g)}$$`,
      parts: [
        { kind: "expr", prompt: `Calcula $(f \\circ g)(${a})$.`, before: `(f \\circ g)(${a}) =`, answer: String(fog), mistakes: g[f[a - 1] - 1] !== fog ? [{ answer: String(g[f[a - 1] - 1]), feedback: "Ese es $(g \\circ f)$. Primero se busca $g$, la de la derecha." }] : [] },
        { kind: "expr", prompt: `Calcula $(g \\circ f)(${b})$.`, before: `(g \\circ f)(${b}) =`, answer: String(gof) },
        { kind: "expr", prompt: `Calcula $(f \\circ f)(${a})$.`, before: `(f \\circ f)(${a}) =`, answer: String(ff) },
      ],
      hints: ["Busca primero la función de la derecha en la tabla. El resultado lo buscas otra vez en la fila de la otra función."],
      solution: [
        `$g(${a}) = ${g[a - 1]}$ y luego $f(${g[a - 1]}) = ${fog}$. Así $(f \\circ g)(${a}) = ${fog}$.`,
        `$f(${b}) = ${f[b - 1]}$ y luego $g(${f[b - 1]}) = ${gof}$. Así $(g \\circ f)(${b}) = ${gof}$.`,
        `$f(${a}) = ${f[a - 1]}$ y luego $f(${f[a - 1]}) = ${ff}$.`,
      ],
    };
  },
};

const definirCompuesta: ExerciseGen = {
  id: "definir-compuesta",
  title: "Definir g∘f con su dominio (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    let fTex: string, gTex: string, comp: string, D: Interval[], Df: Interval[], steps: string[], test: [number, number];
    if (r.bool()) {
      // f logarítmica, g raíz
      const a = r.int(-3, 4);
      const variant = r.pick([["\\ln", 0, 0], ["\\log_{2}", 2, 1], ["\\log_{2}", 2, 2], ["\\log_{3}", 3, 1], ["\\log", 10, 1]] as const);
      const [lg, base, c] = variant;
      const thr = a + (base === 0 ? 1 : base ** c);
      fTex = `${lg}(${minus("x", a)})`;
      gTex = c === 0 ? "\\sqrt{x}" : `\\sqrt{x - ${c}}`;
      comp = c === 0 ? `\\sqrt{${fTex}}` : `\\sqrt{${fTex} - ${c}}`;
      Df = [iv(a, Infinity)];
      D = [iv(thr, Infinity, true)];
      const pow = base === 0 ? "e^{0} = 1" : `${base}^{${c}} = ${base ** c}`;
      steps = [
        `$\\text{Dom} f = (${a}, +\\infty)$ y $\\text{Dom} g = [${c}, +\\infty)$.`,
        `Condición: $x \\in \\text{Dom} f$ y $f(x) \\in \\text{Dom} g$, es decir, $x > ${a}$ y $${fTex} \\ge ${c}$.`,
        `Como el logaritmo es creciente, $${fTex} \\ge ${c}$ equivale a $${minus("x", a)} \\ge ${pow}$, o sea $x \\ge ${thr}$.`,
        `Las dos condiciones juntas dan $x \\ge ${thr}$.`,
      ];
      test = [thr + 0.5, thr + 8];
    } else {
      // f raíz, g logaritmo
      const a = r.int(-4, 5);
      const c = r.int(1, 3);
      const thr = c * c - a;
      fTex = `\\sqrt{${minus("x", -a)}}`;
      gTex = `\\ln(x - ${c})`;
      comp = `\\ln\\left(${fTex} - ${c}\\right)`;
      Df = [iv(-a, Infinity, true)];
      D = [iv(thr, Infinity)];
      steps = [
        `$\\text{Dom} f = [${-a}, +\\infty)$ y $\\text{Dom} g = (${c}, +\\infty)$.`,
        `Condición: $x \\ge ${-a}$ y $f(x) > ${c}$, es decir, $${fTex} > ${c}$.`,
        `Ambos lados son positivos, así que elevamos al cuadrado: $${minus("x", -a)} > ${c * c}$, o sea $x > ${thr}$.`,
        `Como $${thr} > ${-a}$, la condición $x > ${thr}$ ya incluye a la primera.`,
      ];
      test = [thr + 0.5, thr + 8];
    }
    return {
      statement: `Dadas $f(x) = ${fTex}$ y $g(x) = ${gTex}$, define $g \\circ f$: su regla y su dominio.`,
      sequential: true,
      parts: [
        {
          kind: "expr", prompt: "Regla de la compuesta", before: "(g \\circ f)(x) =", answer: comp, vars: ["x"], domain: test,
        },
        {
          kind: "interval", prompt: "Dominio de la compuesta", before: "\\text{Dom}(g \\circ f) =", answer: D,
          mistakes: [{ answer: Df, feedback: "Ese es el dominio de $f$. Falta exigir que $f(x)$ caiga dentro del dominio de $g$." }],
        },
      ],
      hints: [
        "$(g \\circ f)(x) = g(f(x))$: en la fórmula de $g$, cambia $x$ por $f(x)$.",
        "$\\text{Dom}(g \\circ f) = \\{ x \\in \\text{Dom} f \\;/\\; f(x) \\in \\text{Dom} g \\}$.",
      ],
      solution: [
        `$(g \\circ f)(x) = g(f(x)) = ${comp}$.`,
        ...steps,
        `Definición: $g \\circ f : ${ivTex(D)} \\to \\mathbb{R}$, $(g \\circ f)(x) = ${comp}$.`,
      ],
    };
  },
};

const evaluarParcial: ExerciseGen = {
  id: "evaluar-compuesta-parcial",
  title: "Evaluar una compuesta con logaritmos (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const k = r.int(2, 4);
    const s = r.int(0, k - 1);
    const m = k * k - s * s;
    const c = r.nz(-3, 3);
    const fTex = `\\sqrt{x^{2} - ${m}}`;
    const gTex = `\\ln(x${plusK(c)})`;
    const x0 = `e^{${k}}${plusK(-c)}`;
    const x1 = `${1 - c}`;
    return {
      statement: `Sean $f(x) = ${fTex}$ y $g(x) = ${gTex}$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: `Calcula $g\\left(${x0}\\right)$.`, before: `g\\left(${x0}\\right) =`, answer: String(k) },
        { kind: "expr", prompt: `Calcula $(f \\circ g)\\left(${x0}\\right)$.`, before: `(f \\circ g)\\left(${x0}\\right) =`, answer: String(s) },
        {
          kind: "choice",
          prompt: `¿Existe $(f \\circ g)(${x1})$?`,
          shuffle: false,
          options: [
            { label: "Sí", feedback: `$g(${x1}) = \\ln 1 = 0$ y $f(0) = \\sqrt{-${m}}$, que no es un número real.` },
            { label: "No", correct: true },
          ],
        },
      ],
      hints: [
        "$\\ln(e^{k}) = k$: el logaritmo natural y la exponencial se deshacen.",
        "Para que la compuesta exista en un punto, $g$ tiene que existir ahí y su resultado tiene que estar en el dominio de $f$.",
      ],
      solution: [
        `$g\\left(${x0}\\right) = \\ln\\left(${x0}${plusK(c)}\\right) = \\ln e^{${k}} = ${k}$.`,
        `$(f \\circ g)\\left(${x0}\\right) = f(${k}) = \\sqrt{${k * k} - ${m}} = \\sqrt{${s * s}} = ${s}$.`,
        `En $x = ${x1}$: $g(${x1}) = \\ln 1 = 0$, pero $f(0) = \\sqrt{-${m}}$ no existe. Así que $${x1} \\notin \\text{Dom}(f \\circ g)$.`,
      ],
    };
  },
};

const propiedadesVF: ExerciseGen = {
  id: "propiedades-vf",
  title: "Propiedades de las operaciones (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const claims: [string, boolean, string][] = [
      ["La composición de funciones cumple la propiedad asociativa: $h \\circ (g \\circ f) = (h \\circ g) \\circ f$.", true, "Los dos lados significan aplicar $f$, después $g$ y después $h$: $h(g(f(x)))$. Solo cambia cómo se agrupan, no el orden."],
      ["La composición de funciones es conmutativa: $f \\circ g = g \\circ f$.", false, "Contraejemplo: con $f(x) = x^2$ y $g(x) = x + 1$, $(f \\circ g)(x) = (x + 1)^2$ pero $(g \\circ f)(x) = x^2 + 1$. En $x = 1$ dan 4 y 2."],
      ["$\\text{Dom}(g \\circ f) \\subseteq \\text{Dom} f$.", true, "Para calcular $g(f(x))$ primero hay que calcular $f(x)$, así que $x$ tiene que estar en el dominio de $f$."],
      ["$\\text{Dom}(f + g) = \\text{Dom} f \\cup \\text{Dom} g$.", false, "Para sumar hacen falta las dos imágenes, así que es la intersección: $\\text{Dom} f \\cap \\text{Dom} g$."],
      ["$(f \\circ g)(x) = f(x) \\cdot g(x)$.", false, "Componer es meter $g(x)$ dentro de $f$, no multiplicar. Con $f(x) = x + 1$ y $g(x) = 2x$, $(f \\circ g)(x) = 2x + 1$ pero $f(x)g(x) = 2x^2 + 2x$."],
      ["Si $i(x) = x$ es la identidad, entonces $f \\circ i = f$ e $i \\circ f = f$.", true, "$f(i(x)) = f(x)$ e $i(f(x)) = f(x)$. La identidad no cambia nada."],
      ["El producto de funciones es conmutativo: $f \\cdot g = g \\cdot f$.", true, "Se multiplican imágenes, que son números reales, y el producto de reales es conmutativo. El dominio $\\text{Dom} f \\cap \\text{Dom} g$ también es el mismo."],
      ["$\\text{Dom}\\,\\frac{f}{g} = \\text{Dom} f \\cap \\text{Dom} g$.", false, "Falta quitar los puntos donde $g(x) = 0$, porque ahí no se puede dividir."],
      ["$f \\cdot (g + h) = f \\cdot g + f \\cdot h$.", true, "Es la propiedad distributiva de los reales aplicada a las imágenes en cada $x$."],
    ];
    const [claim, ok, why] = r.pick(claims);
    return {
      statement: `¿Verdadero o falso? Justifica. ${claim}`,
      parts: [trueFalse(ok, why)],
      hints: ["Si crees que es falso, busca un contraejemplo con funciones sencillas como $x^2$ y $x + 1$."],
      solution: [`${ok ? "Verdadero" : "Falso"}. ${why}`],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("composicion"),
  objectives: [
    "Sumar, restar, multiplicar y dividir funciones y hallar el dominio de cada resultado.",
    "Calcular $f \\circ g$ y $g \\circ f$, evaluarlas y comprobar que el orden importa.",
    "Hallar el dominio de una compuesta con la condición $x \\in \\text{Dom} g$ y $g(x) \\in \\text{Dom} f$.",
    "Descomponer una función complicada en dos funciones más simples.",
  ],
  sections: [
    {
      id: "operaciones",
      title: "Sumar, restar, multiplicar y dividir funciones",
      blocks: [
        {
          type: "text",
          md: "Si una empresa tiene un ingreso $I(q)$ y un costo $C(q)$, su utilidad es $U(q) = I(q) - C(q)$. Acabas de restar dos funciones. La idea es simple: para cada $x$ se calculan las dos imágenes y se opera con esos números.\n\nEl único cuidado es el dominio. Si en algún $x$ una de las dos funciones no existe, no hay nada que operar.",
        },
        {
          type: "definition",
          title: "Operaciones con funciones",
          md: "Sean $f$ y $g$ con dominios $\\text{Dom} f$ y $\\text{Dom} g$.\n\n- $(f + g)(x) = f(x) + g(x)$ y $(f - g)(x) = f(x) - g(x)$, con dominio $\\text{Dom} f \\cap \\text{Dom} g$.\n- $(f \\cdot g)(x) = f(x) \\cdot g(x)$, con dominio $\\text{Dom} f \\cap \\text{Dom} g$.\n- $\\left(\\dfrac{f}{g}\\right)(x) = \\dfrac{f(x)}{g(x)}$, con dominio $(\\text{Dom} f \\cap \\text{Dom} g) - \\{x \\;/\\; g(x) = 0\\}$.",
        },
        {
          type: "example",
          title: "El ejemplo de la guía",
          problem: "Sean $f(x) = \\sqrt{x^2 - 4}$ y $g(x) = \\log(x - 3)$. Halla los dominios de $f + g$ y de $\\frac{f}{g}$.",
          steps: [
            "$\\text{Dom} f$: $x^2 - 4 \\ge 0$, que da $(-\\infty, -2] \\cup [2, +\\infty)$.",
            "$\\text{Dom} g$: $x - 3 > 0$, que da $(3, +\\infty)$.",
            "La intersección es $(3, +\\infty)$, porque todo número mayor que 3 ya cumple $x \\ge 2$. Ese es el dominio de $f + g$, $f - g$ y $f \\cdot g$.",
            "Para el cociente quitamos donde $g(x) = 0$: $\\log(x - 3) = 0$ cuando $x - 3 = 1$, o sea $x = 4$.",
          ],
          answer: "$\\text{Dom}(f + g) = (3, +\\infty)$ y $\\text{Dom}\\,\\frac{f}{g} = (3, 4) \\cup (4, +\\infty)$.",
        },
        {
          type: "table",
          headers: ["Propiedad", "Suma", "Producto"],
          rows: [
            ["Conmutativa", "$f + g = g + f$", "$f \\cdot g = g \\cdot f$"],
            ["Asociativa", "$(f + g) + h = f + (g + h)$", "$(f \\cdot g) \\cdot h = f \\cdot (g \\cdot h)$"],
            ["Distributiva", "$f \\cdot (g + h) = f \\cdot g + f \\cdot h$", ""],
          ],
          caption: "Se heredan de las propiedades de los números reales, porque se opera imagen por imagen.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Simplificar no devuelve el dominio",
          md: "Con $f(x) = x^2 - 1$ y $g(x) = x - 1$, el cociente es $\\frac{x^2 - 1}{x - 1}$. Se puede simplificar a $x + 1$, pero el dominio sigue siendo $\\mathbb{R} - \\{1\\}$. El dominio se calcula **antes** de simplificar.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Ingreso como producto",
          md: "Si la demanda es $q(p) = 100 - 2p$, el ingreso es precio por cantidad: $I(p) = p \\cdot q(p) = p(100 - 2p)$. Es el producto de la identidad $p$ por la función de demanda. La guía de la cátedra construye así el ingreso y la utilidad.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Sean $f(x) = \\sqrt{x}$ y $g(x) = x - 4$. Halla el dominio de $\\frac{f}{g}$.",
            parts: [{ kind: "interval", answer: [iv(0, 4, true, false), iv(4, Infinity)], mistakes: [{ answer: [iv(0, Infinity, true)], feedback: "Falta quitar $x = 4$, donde el denominador vale cero." }] }],
            solution: ["$\\text{Dom} f \\cap \\text{Dom} g = [0, +\\infty)$. El denominador vale 0 en $x = 4$, que está adentro. Resultado: $[0, 4) \\cup (4, +\\infty)$."],
          },
        },
      ],
    },
    {
      id: "composicion",
      title: "Componer funciones",
      blocks: [
        {
          type: "text",
          md: "Componer es encadenar. Imagina dos máquinas en fila: metes $x$ en la primera, lo que sale entra en la segunda y obtienes el resultado final. Si la primera máquina es $g$ y la segunda es $f$, el resultado es $f(g(x))$.",
        },
        {
          type: "definition",
          title: "Función compuesta",
          md: "$$(f \\circ g)(x) = f(g(x))$$\n\nSe lee \"$f$ compuesta con $g$\". Aunque $f$ se escribe primero, **la que actúa primero es $g$**, la de la derecha.",
        },
        {
          type: "widget",
          widget: { kind: "machine", fns: [{ name: "g", tex: "x+1" }, { name: "f", tex: "x^{2}" }], input: 2, min: -5, max: 5 },
          caption: "Entra $x = 2$, $g$ lo convierte en $3$ y $f$ lo convierte en $9$. Eso es $(f \\circ g)(2) = 9$.",
        },
        {
          type: "example",
          title: "Las dos compuestas",
          problem: "Sean $f(x) = x^2$ y $g(x) = x + 3$. Halla $f \\circ g$ y $g \\circ f$, y evalúa las dos en $x = 1$.",
          steps: [
            "$(f \\circ g)(x) = f(g(x)) = f(x + 3) = (x + 3)^2$.",
            "$(g \\circ f)(x) = g(f(x)) = g(x^2) = x^2 + 3$.",
            "En $x = 1$: $(f \\circ g)(1) = 16$ y $(g \\circ f)(1) = 4$.",
          ],
          answer: "Son funciones distintas. El orden importa.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Componer no es multiplicar",
          md: "$(f \\circ g)(x)$ no es $f(x) \\cdot g(x)$. En el ejemplo, $f(x) \\cdot g(x) = x^2(x + 3)$, que no se parece a $(x + 3)^2$. El circulito $\\circ$ significa \"meter una dentro de la otra\".",
        },
        {
          type: "quick",
          exercise: {
            statement: "Sean $f(x) = 2x - 1$ y $g(x) = x^2$. Calcula $(f \\circ g)(3)$.",
            parts: [{ kind: "expr", before: "(f \\circ g)(3) =", answer: "17", mistakes: [{ answer: "25", feedback: "Eso es $(g \\circ f)(3)$. Primero actúa $g$." }] }],
            solution: ["$g(3) = 9$ y $f(9) = 17$."],
          },
        },
      ],
    },
    {
      id: "dominio-compuesta",
      title: "El dominio de la compuesta",
      blocks: [
        {
          type: "text",
          md: "En la cadena de máquinas puede pasar que la primera funcione bien y entregue un número que la segunda no acepta. Por ejemplo, si $g(x) = x - 4$ y $f(x) = \\sqrt{x}$, al meter $x = 3$ la primera da $-1$ y la raíz se atasca. Ese $x = 3$ no está en el dominio de $f \\circ g$.",
        },
        {
          type: "widget",
          widget: { kind: "machine", fns: [{ name: "g", tex: "x-4" }, { name: "f", tex: "\\sqrt{x}" }], input: 6, min: -2, max: 10 },
          caption: "Prueba con varias entradas. Solo pasan las que hacen $x - 4 \\ge 0$.",
        },
        {
          type: "definition",
          title: "Dominio de la compuesta",
          md: "$$\\text{Dom}(f \\circ g) = \\{ x \\in \\text{Dom} g \\;/\\; g(x) \\in \\text{Dom} f \\}$$\n\nSon dos condiciones: que $g$ acepte a $x$, y que $f$ acepte lo que sale de $g$.",
        },
        {
          type: "example",
          title: "Pregunta del parcial de 2015",
          problem: "Dadas $f(x) = \\ln(x - e)$ y $g(x) = \\sqrt{x - 1}$, define $g \\circ f$.",
          steps: [
            "Regla: $(g \\circ f)(x) = g(f(x)) = \\sqrt{\\ln(x - e) - 1}$.",
            "Primera condición, $x \\in \\text{Dom} f$: $x - e > 0$, o sea $x > e$.",
            "Segunda condición, $f(x) \\in \\text{Dom} g = [1, +\\infty)$: $\\ln(x - e) \\ge 1$.",
            "El logaritmo natural es creciente y $\\ln e = 1$, así que $\\ln(x - e) \\ge 1$ equivale a $x - e \\ge e$, o sea $x \\ge 2e$.",
            "Como $2e > e$, las dos condiciones juntas dan $x \\ge 2e$.",
          ],
          answer: "$g \\circ f : [2e, +\\infty) \\to \\mathbb{R}$, $(g \\circ f)(x) = \\sqrt{\\ln(x - e) - 1}$.",
        },
        {
          type: "example",
          title: "La versión B del mismo parcial",
          problem: "Dadas $f(x) = \\sqrt{x + 1}$ y $g(x) = \\ln(x - 4)$, define $g \\circ f$.",
          steps: [
            "Regla: $(g \\circ f)(x) = \\ln\\left(\\sqrt{x + 1} - 4\\right)$.",
            "$x \\in \\text{Dom} f$: $x \\ge -1$.",
            "$f(x) \\in \\text{Dom} g = (4, +\\infty)$: $\\sqrt{x + 1} > 4$. Elevando al cuadrado, $x + 1 > 16$, o sea $x > 15$.",
          ],
          answer: "$g \\circ f : (15, +\\infty) \\to \\mathbb{R}$, $(g \\circ f)(x) = \\ln\\left(\\sqrt{x + 1} - 4\\right)$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "No calcules el dominio con la fórmula simplificada",
          md: "Con $f(x) = x^2$ y $g(x) = \\sqrt{x}$, la compuesta es $(f \\circ g)(x) = (\\sqrt{x})^2 = x$. La fórmula final parece aceptar cualquier $x$, pero $g$ solo acepta $x \\ge 0$. El dominio es $[0, +\\infty)$, no $\\mathbb{R}$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Sean $f(x) = \\ln x$ y $g(x) = 5 - x$. Halla el dominio de $f \\circ g$.",
            parts: [{ kind: "interval", before: "\\text{Dom}(f \\circ g) =", answer: [iv(-Infinity, 5)], mistakes: [{ answer: [iv(5, Infinity)], feedback: "$5 - x > 0$ da $x < 5$, no $x > 5$." }] }],
            solution: ["$(f \\circ g)(x) = \\ln(5 - x)$. Pedimos $5 - x > 0$, o sea $x < 5$. Dominio $(-\\infty, 5)$."],
          },
        },
      ],
    },
    {
      id: "propiedades",
      title: "Propiedades de la composición",
      blocks: [
        {
          type: "text",
          md: "La composición se porta distinto a la suma y al producto. Tiene dos propiedades que vale la pena saber justificar, porque salen como verdadero o falso en los parciales.",
        },
        {
          type: "table",
          headers: ["Propiedad", "¿Se cumple?", "Por qué"],
          rows: [
            ["Conmutativa: $f \\circ g = g \\circ f$", "No", "Con $f(x) = x^2$ y $g(x) = x + 3$ salen $(x + 3)^2$ y $x^2 + 3$"],
            ["Asociativa: $h \\circ (g \\circ f) = (h \\circ g) \\circ f$", "Sí", "Los dos lados son $h(g(f(x)))$"],
            ["Identidad: $f \\circ i = i \\circ f = f$", "Sí", "$i(x) = x$ no cambia nada"],
          ],
        },
        {
          type: "note",
          tone: "idea",
          title: "Inyectividad y composición",
          md: "Si $f$ y $g$ son inyectivas, $g \\circ f$ también lo es. Lo mismo pasa con sobreyectiva y biyectiva. Esto se usa en el tema de función inversa.",
        },
        {
          type: "example",
          title: "Pregunta de un examen de reparación",
          problem: "Sea $f(x) = \\dfrac{1}{1 - x}$. Demuestra que $[f \\circ (f \\circ f)](x) = x$.",
          steps: [
            "Primero $f \\circ f$: $f(f(x)) = \\dfrac{1}{1 - \\frac{1}{1 - x}}$. Con común denominador abajo, $1 - \\frac{1}{1 - x} = \\frac{1 - x - 1}{1 - x} = \\frac{-x}{1 - x}$.",
            "Así $(f \\circ f)(x) = \\dfrac{1 - x}{-x} = \\dfrac{x - 1}{x}$. Su dominio excluye $x = 1$ (por $f$) y $x = 0$ (donde $f(x) = 1$).",
            "Ahora $f\\left(\\frac{x - 1}{x}\\right) = \\dfrac{1}{1 - \\frac{x - 1}{x}} = \\dfrac{1}{\\frac{x - (x - 1)}{x}} = \\dfrac{1}{\\frac{1}{x}} = x$.",
          ],
          answer: "$[f \\circ (f \\circ f)](x) = x$ para todo $x \\in \\mathbb{R} - \\{0, 1\\}$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Verdadero o falso? La composición de funciones es conmutativa.",
            parts: [trueFalse(false, "Basta un contraejemplo: con $f(x) = 2x$ y $g(x) = x + 1$, $(f \\circ g)(0) = 2$ y $(g \\circ f)(0) = 1$.")],
            solution: ["Falso. En general $f \\circ g \\ne g \\circ f$. Lo que sí se cumple es la asociativa."],
          },
        },
      ],
    },
    {
      id: "descomponer",
      title: "Descomponer una función",
      blocks: [
        {
          type: "text",
          md: "A veces conviene hacer el camino inverso: ver una función complicada como dos sencillas encadenadas. Esto va a ser clave para derivar con la regla de la cadena.\n\nEl truco es pensar como una calculadora. Para calcular $h(x) = \\sqrt{3x^2 + 1}$ con un número, primero harías $3x^2 + 1$ y al final sacarías la raíz. Lo que haces primero es la función de adentro, $g$, y lo último es la de afuera, $f$.",
        },
        {
          type: "example",
          title: "Encontrar la de adentro y la de afuera",
          problem: "Escribe $h(x) = (2x - 5)^7$ y $k(x) = e^{x^2}$ como $f \\circ g$.",
          steps: [
            "En $h$ primero se calcula $2x - 5$ y luego se eleva a la 7. Entonces $g(x) = 2x - 5$ y $f(x) = x^7$.",
            "En $k$ primero se eleva al cuadrado y luego se aplica la exponencial. Entonces $g(x) = x^2$ y $f(x) = e^x$.",
          ],
          answer: "$h = f \\circ g$ con $f(x) = x^7$, $g(x) = 2x - 5$. $k = f \\circ g$ con $f(x) = e^x$, $g(x) = x^2$.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Composición en economía",
          md: "Si el costo depende de la producción, $C(q) = 200 + 5q$, y la producción depende de los días trabajados, $q(t) = 40t$, el costo en función de los días es $C(q(t)) = 200 + 5 \\cdot 40t = 200 + 200t$. Es una compuesta: de días a unidades y de unidades a bolívares.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Si $h(x) = \\ln(x^2 + 4)$ y $h = f \\circ g$, ¿cuál es $g$?",
            parts: [choice("$g(x) = x^2 + 4$", [["$g(x) = \\ln x$", "El logaritmo se aplica al final, así que es la de afuera, $f$."], ["$g(x) = x + 4$", "Con ese $g$ quedaría $f(g(x)) = \\ln(x + 4)$, que no es $h$."]])],
            solution: ["Primero se calcula $x^2 + 4$ y después el logaritmo. $g(x) = x^2 + 4$ y $f(x) = \\ln x$."],
          },
        },
      ],
    },
  ],
  exercises: [
    evaluarCompuesta,
    formulaCompuesta,
    operacionEvaluar,
    dominioSuma,
    ordenImporta,
    dominioCociente,
    dominioCompuesta,
    descomponer,
    tablasCompuesta,
    definirCompuesta,
    evaluarParcial,
    propiedadesVF,
  ],
};

export default topic;
