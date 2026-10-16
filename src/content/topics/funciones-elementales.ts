import { meta } from "../catalog";
import { choice, trueFalse } from "../helpers";
import type { ExerciseGen, GraphSpec, Part, Rich, Topic } from "../types";
import { R, iv, minusPoints, unionTex, type Interval } from "@/lib/math/intervals";
import { coef, frac, minus, poly } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

const ivTex = (I: Interval[]) => unionTex(I);
const setTex = (xs: number[]) => (xs.length ? `\\{${xs.join(", ")}\\}` : "\\varnothing");
/** "+ 3", "- 2" o "" para sumar una constante al final de una fórmula. */
const plusK = (k: number) => (k === 0 ? "" : k > 0 ? ` + ${k}` : ` - ${-k}`);

/** Posición inicial de un punto arrastrable que no coincida con ninguna respuesta. */
function libre(want: [number, number], taken: [number, number][]): [number, number] {
  let x = want[0];
  while (taken.some((t) => t[0] === x && t[1] === want[1])) x += 1;
  return [x, want[1]];
}

/** Familias básicas con su gráfica, para reconocerlas. */
const FAMILIAS: { tex: string; name: string; graph: GraphSpec; look: string }[] = [
  {
    tex: "x^{2}",
    name: "cuadrática",
    look: "una parábola en forma de U con vértice en el origen",
    graph: { x: [-4, 4], y: [-2, 6], curves: [{ fn: "x^{2}", color: "accent" }] },
  },
  {
    tex: "x^{3}",
    name: "cúbica",
    look: "una curva que viene de abajo, se aplana en el origen y sigue subiendo",
    graph: { x: [-3, 3], y: [-5, 5], step: 1, curves: [{ fn: "x^{3}", color: "accent" }] },
  },
  {
    tex: "|x|",
    name: "valor absoluto",
    look: "una V con la punta en el origen",
    graph: { x: [-4, 4], y: [-2, 5], step: 1, curves: [{ fn: "|x|", color: "accent" }] },
  },
  {
    tex: "\\frac{1}{x}",
    name: "1/x",
    look: "dos ramas separadas por los ejes, una en el primer cuadrante y otra en el tercero",
    graph: { x: [-4, 4], y: [-4, 4], curves: [{ fn: "\\frac{1}{x}", color: "accent", breaks: [0] }] },
  },
  {
    tex: "\\sqrt{x}",
    name: "raíz cuadrada",
    look: "media rama que sale del origen hacia la derecha y crece cada vez más despacio",
    graph: { x: [-2, 6], y: [-2, 4], step: 1, curves: [{ fn: "\\sqrt{x}", color: "accent", domain: [0, 6] }] },
  },
  {
    tex: "\\sqrt[3]{x}",
    name: "raíz cúbica",
    look: "una curva que existe a ambos lados del origen y se pone vertical justo en el origen",
    graph: { x: [-6, 6], y: [-3, 3], curves: [{ fn: "\\sqrt[3]{x}", color: "accent" }] },
  },
  {
    tex: "2^{x}",
    name: "exponencial creciente",
    look: "una curva pegada al eje $x$ por la izquierda que pasa por $(0, 1)$ y se dispara a la derecha",
    graph: { x: [-4, 4], y: [-1, 7], curves: [{ fn: "2^{x}", color: "accent" }], points: [{ x: 0, y: 1 }] },
  },
  {
    tex: "\\left(\\frac{1}{2}\\right)^{x}",
    name: "exponencial decreciente",
    look: "una curva que baja desde la izquierda, pasa por $(0, 1)$ y se pega al eje $x$ por la derecha",
    graph: { x: [-4, 4], y: [-1, 7], curves: [{ fn: "\\left(\\frac{1}{2}\\right)^{x}", color: "accent" }], points: [{ x: 0, y: 1 }] },
  },
  {
    tex: "\\ln x",
    name: "logarítmica",
    look: "una curva que solo existe para $x > 0$, baja sin límite cerca del eje $y$ y pasa por $(1, 0)$",
    graph: { x: [-1, 7], y: [-3, 3], step: 1, curves: [{ fn: "\\ln(x)", color: "accent", domain: [0.02, 7] }], points: [{ x: 1, y: 0 }] },
  },
];

/* ----------------------------------- ejercicios ----------------------------------- */

const corteLineal: ExerciseGen = {
  id: "cortes-recta",
  title: "Cortes de una recta con los ejes",
  level: 1,
  generate: (r) => {
    const m = r.pick([-3, -2, -1, 1, 2, 3, 4]);
    const x0 = r.nz(-5, 5);
    const b = -m * x0;
    const fTex = poly([m, b]);
    const askX = r.bool(0.6);
    const parts: Part[] = askX
      ? [{
          kind: "expr",
          prompt: "Abscisa del corte con el eje $x$",
          before: "x =",
          answer: String(x0),
          mistakes: [{ answer: String(-x0), feedback: "Revisa el despeje. De $mx + b = 0$ sale $x = -\\frac{b}{m}$, con el signo menos." }],
        }]
      : [{
          kind: "expr",
          prompt: "Ordenada del corte con el eje $y$",
          before: "y =",
          answer: String(b),
          mistakes: b === x0 ? [] : [{ answer: String(x0), feedback: "Ese es el corte con el eje $x$. El corte con el eje $y$ sale de hacer $x = 0$." }],
        }];
    return {
      statement: `Para la función lineal $f(x) = ${fTex}$, halla el corte con el eje ${askX ? "$x$" : "$y$"}.`,
      parts,
      hints: askX
        ? ["En el eje $x$ la altura es cero. Plantea $f(x) = 0$ y despeja."]
        : ["En el eje $y$ se cumple $x = 0$. Calcula $f(0)$."],
      solution: askX
        ? [`Planteamos $${fTex} = 0$.`, `Despejamos: $${coef(m, "x")} = ${-b}$, así que $x = ${x0}$.`, `La recta corta al eje $x$ en $(${x0}, 0)$.`]
        : [`Hacemos $x = 0$: $f(0) = ${b}$.`, `La recta corta al eje $y$ en $(0, ${b})$. Es el término independiente.`],
    };
  },
};

const evaluarFamilia: ExerciseGen = {
  id: "evaluar-familia",
  title: "Evaluar funciones de uso frecuente",
  level: 1,
  generate: (r) => {
    const k = r.int(2, 5);
    const cases: { f: string; x: string; ans: string; why: string }[] = [
      { f: "|x|", x: String(-k * 3), ans: String(k * 3), why: `El valor absoluto quita el signo: $|${-k * 3}| = ${k * 3}$.` },
      { f: "\\sqrt{x}", x: String(k * k), ans: String(k), why: `$\\sqrt{${k * k}} = ${k}$ porque $${k}^2 = ${k * k}$.` },
      { f: "\\sqrt[3]{x}", x: String(-(k ** 3)), ans: String(-k), why: `$(${-k})^3 = ${-(k ** 3)}$, así que $\\sqrt[3]{${-(k ** 3)}} = ${-k}$. La raíz cúbica sí acepta negativos.` },
      { f: "2^{x}", x: String(-k), ans: frac(1, 2 ** k), why: `Un exponente negativo invierte: $2^{${-k}} = \\frac{1}{2^{${k}}} = ${frac(1, 2 ** k)}$.` },
      { f: "\\log_{2} x", x: String(2 ** k), ans: String(k), why: `$\\log_{2} ${2 ** k}$ pregunta a qué exponente hay que elevar el 2 para obtener $${2 ** k}$. Como $2^{${k}} = ${2 ** k}$, la respuesta es $${k}$.` },
      { f: "\\log_{3} x", x: frac(1, 3 ** (k - 1)), ans: String(-(k - 1)), why: `$3^{${-(k - 1)}} = ${frac(1, 3 ** (k - 1))}$, así que el logaritmo vale $${-(k - 1)}$.` },
      { f: "\\frac{1}{x}", x: frac(-1, k), ans: String(-k), why: `Dividir 1 entre $${frac(-1, k)}$ es lo mismo que multiplicar por $${-k}$.` },
      { f: "\\ln x", x: `e^{${k}}`, ans: String(k), why: `$\\ln$ y $e$ se deshacen: $\\ln e^{${k}} = ${k}$.` },
    ];
    const c = r.pick(cases);
    return {
      statement: `Si $f(x) = ${c.f}$, calcula $f\\left(${c.x}\\right)$.`,
      parts: [{ kind: "expr", before: `f\\left(${c.x}\\right) =`, answer: c.ans, maxOps: 1 }],
      hints: ["Sustituye $x$ por el número y usa la definición de la función."],
      solution: [c.why, `Resultado: $${c.ans}$.`],
    };
  },
};

const reconocerGrafica: ExerciseGen = {
  id: "reconocer-grafica",
  title: "¿Qué función es?",
  level: 1,
  generate: (r) => {
    const [ok, ...others] = r.sample(FAMILIAS, 4);
    return {
      statement: "¿Qué fórmula corresponde a la gráfica?",
      graph: ok.graph,
      parts: [
        choice(
          `$y = ${ok.tex}$`,
          others.map((o) => [`$y = ${o.tex}$`, `La gráfica de $y = ${o.tex}$ es ${o.look}. No coincide con la que ves.`] as [Rich, Rich]),
        ),
      ],
      hints: ["Fíjate en el dominio (dónde existe la curva), en si toca el origen y en cómo se comporta a la izquierda y a la derecha."],
      solution: [`La gráfica es ${ok.look}.`, `Esa es la forma de la función ${ok.name}, $y = ${ok.tex}$.`],
    };
  },
};

const dominioElemental: ExerciseGen = {
  id: "dominio-elemental",
  title: "Dominio de una función elemental trasladada",
  level: 1,
  generate: (r) => {
    const a = r.nz(-6, 6);
    const xa = minus("x", a);
    const ax = a === 0 ? "-x" : `${a} - x`;
    const all = [
      { f: `\\sqrt{${xa}}`, D: [iv(a, Infinity, true)], why: `La raíz cuadrada pide radicando mayor o igual a cero: $${xa} \\ge 0$, es decir, $x \\ge ${a}$.`, bad: [iv(a, Infinity)], badFb: "El radicando puede valer cero, porque $\\sqrt{0} = 0$ existe. El extremo va cerrado." },
      { f: `\\ln(${xa})`, D: [iv(a, Infinity)], why: `El logaritmo solo acepta números positivos: $${xa} > 0$, es decir, $x > ${a}$.`, bad: [iv(a, Infinity, true)], badFb: "$\\ln 0$ no existe. El argumento del logaritmo tiene que ser estrictamente positivo." },
      { f: `\\frac{1}{${xa}}`, D: minusPoints(R, [a]), why: `Solo hay que evitar que el denominador valga cero: $x \\ne ${a}$.`, bad: [iv(a, Infinity)], badFb: "El denominador puede ser negativo sin problema. Solo se excluye el punto donde vale cero." },
      { f: `\\sqrt[3]{${xa}}`, D: R, why: "La raíz cúbica existe para cualquier número real, incluso negativo.", bad: [iv(a, Infinity, true)], badFb: "Eso pasa con la raíz cuadrada. La raíz cúbica de un negativo existe: $\\sqrt[3]{-8} = -2$." },
      { f: `\\sqrt{${ax}}`, D: [iv(-Infinity, a, false, true)], why: `Pedimos $${ax} \\ge 0$, que equivale a $x \\le ${a}$.`, bad: [iv(a, Infinity, true)], badFb: `Cuidado con el signo de la $x$. $${ax} \\ge 0$ significa $x \\le ${a}$.` },
      { f: `e^{${xa}}`, D: R, why: "La exponencial acepta cualquier exponente real.", bad: [iv(a, Infinity)], badFb: "El exponente puede ser cualquier número. Es la salida la que siempre es positiva, no la entrada." },
    ];
    const c = r.pick(all);
    return {
      statement: `Halla el dominio de $f(x) = ${c.f}$.`,
      parts: [{ kind: "interval", before: "\\text{Dom } f =", answer: c.D, mistakes: [{ answer: c.bad, feedback: c.badFb }] }],
      hints: ["Pregúntate qué números no se pueden meter: raíz cuadrada de negativos, logaritmo de cero o negativos, división entre cero."],
      solution: [c.why, `$\\text{Dom } f = ${ivTex(c.D)}$.`],
    };
  },
};

const vertice: ExerciseGen = {
  id: "vertice",
  title: "Vértice de una parábola",
  level: 2,
  generate: (r) => {
    const a = r.pick([1, -1, 2, -2, 3]);
    const h = r.nz(-4, 4);
    const k = r.int(-6, 6);
    const b = -2 * a * h;
    const c = a * h * h + k;
    const fTex = poly([a, b, c]);
    return {
      statement: `Halla el vértice de la parábola $f(x) = ${fTex}$.`,
      parts: [
        {
          kind: "expr",
          prompt: "Abscisa del vértice",
          before: "x_v =",
          answer: String(h),
          mistakes: [{ answer: String(-h), feedback: "Te comiste el signo menos de la fórmula $x_v = -\\frac{b}{2a}$." }],
        },
        { kind: "expr", prompt: "Ordenada del vértice", before: "y_v =", answer: String(k) },
      ],
      hints: [
        "La abscisa del vértice es $x_v = -\\dfrac{b}{2a}$.",
        "La ordenada se obtiene evaluando: $y_v = f(x_v)$.",
      ],
      solution: [
        `Aquí $a = ${a}$ y $b = ${b}$.`,
        `$x_v = -\\dfrac{${b}}{2 \\cdot ${a < 0 ? `(${a})` : a}} = ${h}$.`,
        `$y_v = f(${h}) = ${a === 1 ? "" : a === -1 ? "-" : a}(${h})^2 ${b < 0 ? "-" : "+"} ${Math.abs(b)}(${h}) ${c < 0 ? "-" : "+"} ${Math.abs(c)} = ${k}$.`,
        `El vértice es $(${h}, ${k})$.`,
      ],
    };
  },
};

const rangoCuadratica: ExerciseGen = {
  id: "rango-cuadratica",
  title: "Rango de una función cuadrática",
  level: 2,
  generate: (r) => {
    const a = r.pick([1, -1, 2, -2, -3]);
    let h: number, k: number;
    do {
      h = r.int(-4, 4);
      k = r.int(-6, 6);
    } while (h === k);
    const fTex = poly([a, -2 * a * h, a * h * h + k]);
    const up = a > 0;
    const ans = up ? [iv(k, Infinity, true)] : [iv(-Infinity, k, false, true)];
    const other = up ? [iv(-Infinity, k, false, true)] : [iv(k, Infinity, true)];
    const absc = up ? [iv(h, Infinity, true)] : [iv(-Infinity, h, false, true)];
    return {
      statement: `Halla el rango de $f(x) = ${fTex}$, con dominio $\\mathbb{R}$.`,
      parts: [{
        kind: "interval",
        before: "\\text{Ran } f =",
        answer: ans,
        mistakes: [
          { answer: other, feedback: `Miraste mal hacia dónde abre. Con $a = ${a}$ la parábola abre hacia ${up ? "arriba" : "abajo"}.` },
          { answer: absc, feedback: "Usaste la abscisa del vértice. El rango se lee en el eje $y$, con la ordenada del vértice." },
        ],
      }],
      hints: [
        "El rango de una parábola empieza o termina en la ordenada del vértice.",
        "Si $a > 0$ abre hacia arriba y el vértice es el punto más bajo. Si $a < 0$, es el más alto.",
      ],
      solution: [
        `$x_v = -\\frac{${-2 * a * h}}{2 \\cdot ${a < 0 ? `(${a})` : a}} = ${h}$ y $y_v = f(${h}) = ${k}$.`,
        `Como $a = ${a}$ ${up ? "es positivo, la parábola abre hacia arriba y $" + k + "$ es el valor más bajo" : "es negativo, la parábola abre hacia abajo y $" + k + "$ es el valor más alto"}.`,
        `$\\text{Ran } f = ${ivTex(ans)}$.`,
      ],
    };
  },
};

const cortesCuadratica: ExerciseGen = {
  id: "cortes-cuadratica",
  title: "Cortes de una parábola con el eje x",
  level: 2,
  generate: (r) => {
    const a = r.pick([1, 1, -1, 2]);
    const r1 = r.nz(-5, 4);
    const r2 = r.bool(0.85) ? r.int(r1 + 1, 6) : r1;
    const b = -a * (r1 + r2);
    const c = a * r1 * r2;
    const fTex = poly([a, b, c]);
    const roots = r1 === r2 ? [r1] : [r1, r2];
    const disc = b * b - 4 * a * c;
    const neg = roots.map((x) => -x).sort((p, q) => p - q);
    return {
      statement: `¿En qué valores de $x$ corta al eje $x$ la parábola $f(x) = ${fTex}$?`,
      parts: [{
        kind: "set",
        before: "x \\in",
        answer: roots,
        mistakes: neg.join() === roots.join() ? [] : [{ answer: neg, feedback: "Los signos están cambiados. Si un factor es $(x - 3)$, la raíz es $x = 3$, no $-3$." }],
      }],
      hints: [
        "Plantea $f(x) = 0$.",
        "Factoriza o usa la resolvente $x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.",
      ],
      solution: [
        `Planteamos $${fTex} = 0$.`,
        `El discriminante es $\\Delta = (${b})^2 - 4(${a})(${c}) = ${disc}$. ${disc === 0 ? "Como vale cero, hay un solo corte: la parábola toca el eje en su vértice." : "Como es positivo, hay dos cortes."}`,
        `Las soluciones son $${setTex(roots)}$.`,
      ],
    };
  },
};

const expLogVF: ExerciseGen = {
  id: "exp-log-vf",
  title: "Exponencial y logaritmo: verdadero o falso",
  level: 2,
  generate: (r) => {
    const b = r.pick([2, 3, 5, 10]);
    const s = r.pick([2, 3, 4]);
    const claims: [string, boolean, string][] = [
      [`$f(x) = ${b}^{x}$ es creciente en todo $\\mathbb{R}$.`, true, `La base $${b}$ es mayor que 1, y con base mayor que 1 la exponencial crece.`],
      [`$f(x) = \\left(\\frac{1}{${s}}\\right)^{x}$ es creciente en todo $\\mathbb{R}$.`, false, `La base $\\frac{1}{${s}}$ está entre 0 y 1, así que la exponencial decrece.`],
      [`El rango de $f(x) = ${b}^{x}$ es $(0, +\\infty)$.`, true, "Una potencia de base positiva nunca da cero ni negativo, y toma todos los positivos."],
      [`El rango de $f(x) = ${b}^{x}$ es $[0, +\\infty)$.`, false, "La exponencial nunca vale cero. Se acerca al eje $x$ pero no lo toca, así que el 0 no está en el rango."],
      [`El dominio de $f(x) = \\log_{${b}} x$ es $(0, +\\infty)$.`, true, "Solo existen logaritmos de números positivos."],
      [`El rango de $f(x) = \\log_{${b}} x$ es $(0, +\\infty)$.`, false, "El logaritmo toma todos los reales: es negativo entre 0 y 1, cero en 1 y positivo después. Su rango es $\\mathbb{R}$."],
      [`La gráfica de $f(x) = \\log_{${b}} x$ pasa por $(1, 0)$.`, true, `$\\log_{${b}} 1 = 0$ porque $${b}^{0} = 1$.`],
      [`La gráfica de $f(x) = ${b}^{x}$ pasa por $(0, ${b})$.`, false, `$${b}^{0} = 1$, así que pasa por $(0, 1)$.`],
      [`La gráfica de $f(x) = ${b}^{x}$ corta al eje $x$.`, false, "Para cortar al eje $x$ tendría que valer 0, y una exponencial nunca vale 0."],
    ];
    const [claim, ok, why] = r.pick(claims);
    return {
      statement: claim,
      parts: [trueFalse(ok, why)],
      hints: ["Recuerda la forma de la gráfica: la exponencial siempre está por encima del eje $x$ y pasa por $(0, 1)$. El logaritmo vive a la derecha del eje $y$ y pasa por $(1, 0)$."],
      solution: [`${ok ? "Verdadero" : "Falso"}. ${why}`],
    };
  },
};

const parabolaCompleta: ExerciseGen = {
  id: "parabola-completa",
  title: "Estudio completo de una parábola (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const a = r.pick([1, -1, 1, -1, 2, -2]);
    const r1 = r.int(-5, 2);
    const r2 = r1 + 2 * r.int(1, 3);
    const h = (r1 + r2) / 2;
    const b = -a * (r1 + r2);
    const c = a * r1 * r2;
    const k = a * (h - r1) * (h - r2);
    const fTex = poly([a, b, c]);
    const rango = a > 0 ? [iv(k, Infinity, true)] : [iv(-Infinity, k, false, true)];
    return {
      statement: `Dada $f(x) = ${fTex}$ con dominio $\\mathbb{R}$, halla sus elementos para graficarla.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Abscisa del vértice", before: "x_v =", answer: String(h), mistakes: h === 0 ? [] : [{ answer: String(-h), feedback: "Revisa el signo en $x_v = -\\frac{b}{2a}$." }] },
        { kind: "expr", prompt: "Ordenada del vértice", before: "y_v =", answer: String(k) },
        { kind: "set", prompt: "Cortes con el eje $x$", before: "x \\in", answer: [r1, r2] },
        { kind: "expr", prompt: "Corte con el eje $y$", before: "y =", answer: String(c) },
        { kind: "interval", prompt: "Rango", before: "\\text{Ran } f =", answer: rango },
      ],
      hints: [
        "Vértice: $x_v = -\\frac{b}{2a}$ y $y_v = f(x_v)$.",
        "Cortes con $x$: resuelve $f(x) = 0$. Corte con $y$: calcula $f(0)$.",
        "El rango sale del vértice y de hacia dónde abre la parábola.",
      ],
      solution: [
        `$a = ${a}$, $b = ${b}$, $c = ${c}$. La parábola abre hacia ${a > 0 ? "arriba" : "abajo"}.`,
        `$x_v = -\\frac{${b}}{2 \\cdot ${a < 0 ? `(${a})` : a}} = ${h}$ y $y_v = f(${h}) = ${k}$. Vértice $(${h}, ${k})$.`,
        `Factorizando, $f(x) = ${a === 1 ? "" : a === -1 ? "-" : a}(${minus("x", r1)})(${minus("x", r2)})$, así que corta al eje $x$ en $x = ${r1}$ y $x = ${r2}$.`,
        `$f(0) = ${c}$, el corte con el eje $y$ es $(0, ${c})$.`,
        `Como el vértice es el punto más ${a > 0 ? "bajo" : "alto"}, $\\text{Ran } f = ${ivTex(rango)}$.`,
      ],
    };
  },
};

const rangoDado: ExerciseGen = {
  id: "dominio-para-rango",
  title: "Qué dominio produce un rango dado (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const c = r.nz(-3, 8);
    const useCbrt = r.bool(0.65);
    let fTex: string, target: Interval[], A: Interval[], steps: string[];
    if (useCbrt) {
      const k = r.pick([1, 2, -1]);
      const up = r.bool(0.7);
      fTex = `\\sqrt[3]{${c} - x}`;
      const k3 = k ** 3;
      target = up ? [iv(k, Infinity, true)] : [iv(-Infinity, k, false, true)];
      A = up ? [iv(-Infinity, c - k3, false, true)] : [iv(c - k3, Infinity, true)];
      steps = [
        `Queremos $\\sqrt[3]{${c} - x} ${up ? "\\ge" : "\\le"} ${k}$.`,
        `La raíz cúbica es creciente, así que podemos elevar al cubo sin voltear: $${c} - x ${up ? "\\ge" : "\\le"} ${k3}$.`,
        `Despejamos: $-x ${up ? "\\ge" : "\\le"} ${k3 - c}$, y al multiplicar por $-1$ la desigualdad se voltea: $x ${up ? "\\le" : "\\ge"} ${c - k3}$.`,
      ];
    } else {
      const k = r.int(1, 3);
      fTex = `\\sqrt{${minus("x", c)}}`;
      target = [iv(k, Infinity, true)];
      A = [iv(c + k * k, Infinity, true)];
      steps = [
        `Queremos $\\sqrt{${minus("x", c)}} \\ge ${k}$.`,
        `Ambos lados son positivos, así que elevamos al cuadrado: $${minus("x", c)} \\ge ${k * k}$.`,
        `Despejamos: $x \\ge ${c + k * k}$.`,
      ];
    }
    const wrong = useCbrt ? [iv(c, Infinity, true)] : [iv(c, Infinity, true)];
    const claimTrue = r.bool(0.35);
    const claimed = claimTrue ? A : wrong;
    return {
      statement: `Dada $f: A \\subseteq \\mathbb{R} \\to \\mathbb{R}$ con $f(x) = ${fTex}$. Se afirma que para que el rango sea $${ivTex(target)}$, el conjunto $A$ es $${ivTex(claimed)}$.`,
      sequential: true,
      parts: [
        trueFalse(claimTrue, "Comprueba la afirmación resolviendo la desigualdad que impone el rango.", "¿Verdadero o falso?"),
        { kind: "interval", prompt: "Halla el conjunto $A$ correcto.", before: "A =", answer: A },
      ],
      hints: [
        `Que el rango sea $${ivTex(target)}$ significa que $f(x)$ tiene que cumplir esa desigualdad. Plantéala y despeja $x$.`,
        "Al multiplicar o dividir por un negativo la desigualdad se voltea.",
      ],
      solution: [
        ...steps,
        `Por lo tanto $A = ${ivTex(A)}$, y la afirmación es ${claimTrue ? "verdadera" : "falsa"}.`,
      ],
    };
  },
};

const expLogTrasladada: ExerciseGen = {
  id: "exp-log-trasladada",
  title: "Exponencial o logaritmo trasladado (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const b = r.pick([2, 3]);
    const h = r.int(-2, 0);
    if (r.bool()) {
      const k = r.nz(-4, 4);
      const fTex = `${b}^{${minus("x", h)}} ${k < 0 ? "-" : "+"} ${Math.abs(k)}`;
      const y0 = b ** -h + k;
      return {
        statement: `Para $f(x) = ${fTex}$ determina dominio, rango, asíntota horizontal y corte con el eje $y$.`,
        sequential: true,
        parts: [
          { kind: "interval", prompt: "Dominio", before: "\\text{Dom } f =", answer: R },
          { kind: "interval", prompt: "Rango", before: "\\text{Ran } f =", answer: [iv(k, Infinity)], mistakes: [{ answer: [iv(0, Infinity)], feedback: `Ese es el rango de $${b}^x$. El $${k < 0 ? "-" : "+"} ${Math.abs(k)}$ mueve toda la gráfica, también su piso.` }, { answer: [iv(k, Infinity, true)], feedback: `La curva se acerca a $y = ${k}$ pero nunca llega, porque $${b}^{${minus("x", h)}}$ nunca vale 0. El extremo va abierto.` }] },
          { kind: "expr", prompt: "Asíntota horizontal", before: "y =", answer: String(k) },
          { kind: "expr", prompt: "Corte con el eje $y$", before: "y =", answer: String(y0) },
        ],
        hints: [
          `Parte de $y = ${b}^x$: dominio $\\mathbb{R}$, rango $(0, +\\infty)$ y asíntota $y = 0$.`,
          `Sumar $${k}$ sube o baja la gráfica, así que también mueve la asíntota.`,
        ],
        solution: [
          "Una exponencial acepta cualquier exponente: $\\text{Dom } f = \\mathbb{R}$.",
          `$${b}^{${minus("x", h)}}$ toma todos los valores positivos. Al sumar $${k}$, $f$ toma todos los valores mayores que $${k}$: $\\text{Ran } f = (${k}, +\\infty)$.`,
          `La asíntota horizontal es $y = ${k}$.`,
          `$f(0) = ${b}^{${-h}} ${k < 0 ? "-" : "+"} ${Math.abs(k)} = ${y0}$.`,
        ],
      };
    }
    const k = r.int(-2, 0);
    const fTex = `\\log_{${b}}(${minus("x", h)})${k === 0 ? "" : ` ${k < 0 ? "-" : "+"} ${Math.abs(k)}`}`;
    const x0 = h + b ** -k;
    return {
      statement: `Para $f(x) = ${fTex}$ determina dominio, rango, asíntota vertical y corte con el eje $x$.`,
      sequential: true,
      parts: [
        { kind: "interval", prompt: "Dominio", before: "\\text{Dom } f =", answer: [iv(h, Infinity)], mistakes: [{ answer: [iv(h, Infinity, true)], feedback: "El logaritmo de 0 no existe. El extremo va abierto." }] },
        { kind: "interval", prompt: "Rango", before: "\\text{Ran } f =", answer: R, mistakes: [{ answer: [iv(0, Infinity)], feedback: "Ese es el dominio de $\\log x$, no su rango. El logaritmo toma todos los reales." }] },
        { kind: "expr", prompt: "Asíntota vertical", before: "x =", answer: String(h) },
        { kind: "expr", prompt: "Corte con el eje $x$", before: "x =", answer: String(x0) },
      ],
      hints: [
        "El argumento del logaritmo tiene que ser positivo. La asíntota vertical está donde el argumento vale 0.",
        `Para el corte con el eje $x$ plantea $f(x) = 0$ y usa que $\\log_{${b}} u = m$ equivale a $u = ${b}^m$.`,
      ],
      solution: [
        `Pedimos $${minus("x", h)} > 0$, o sea $x > ${h}$. $\\text{Dom } f = (${h}, +\\infty)$ y la asíntota vertical es $x = ${h}$.`,
        "Un logaritmo toma todos los reales, y sumarle una constante no cambia eso: $\\text{Ran } f = \\mathbb{R}$.",
        `$f(x) = 0$ da $\\log_{${b}}(${minus("x", h)}) = ${-k}$, así que $${minus("x", h)} = ${b}^{${-k}} = ${b ** -k}$ y $x = ${x0}$.`,
      ],
    };
  },
};

const ubicarVerticeCorteY: ExerciseGen = {
  id: "ubicar-vertice-corte-y",
  title: "Ubicar el vértice y el corte con el eje y",
  level: 1,
  generate: (r) => {
    let a: number, h: number, k: number, c: number;
    do {
      a = r.pick([1, -1]);
      h = r.nz(-4, 4);
      k = r.int(-5, 5);
      c = a * h * h + k;
    } while (Math.abs(c) > 7);
    const b = -2 * a * h;
    const fTex = poly([a, b, c]);
    const V: [number, number] = [h, k];
    const Y: [number, number] = [0, c];
    const evalTex = `${a === 1 ? "" : "-"}(${h})^2 ${b < 0 ? "-" : "+"} ${Math.abs(b)}(${h})${plusK(c)}`;
    return {
      statement: `Halla el vértice y el corte con el eje $y$ de $f(x) = ${fTex}$. Después arrastra cada punto hasta su lugar.`,
      parts: [
        {
          kind: "place",
          graph: { x: [-8, 8], y: [-8, 8], height: 300 },
          items: [
            { type: "point", label: "\\text{vértice}", answer: V, start: libre([-7, 7], [V, Y]) },
            { type: "point", label: "\\text{corte con } y", answer: Y, start: libre([4, -7], [V, Y]) },
          ],
          reveal: [{ fn: fTex, color: "accent" }],
        },
      ],
      hints: [
        "La abscisa del vértice es $x_v = -\\dfrac{b}{2a}$ y su ordenada es $f(x_v)$.",
        "El corte con el eje $y$ sale de calcular $f(0)$, que es el término independiente.",
      ],
      solution: [
        `Aquí $a = ${a}$ y $b = ${b}$, así que $x_v = -\\dfrac{${b}}{2 \\cdot ${a < 0 ? `(${a})` : a}} = ${h}$.`,
        `$y_v = f(${h}) = ${evalTex} = ${k}$. El vértice es $(${h}, ${k})$.`,
        `$f(0) = ${c}$, así que la parábola corta al eje $y$ en $(0, ${c})$.`,
        `Como $a = ${a}$ es ${a > 0 ? "positivo, la parábola abre hacia arriba" : "negativo, la parábola abre hacia abajo"}.`,
      ],
    };
  },
};

const ubicarParabolaCortes: ExerciseGen = {
  id: "ubicar-parabola-cortes",
  title: "Ubicar el vértice y los cortes con el eje x",
  level: 2,
  generate: (r) => {
    const a = r.pick([1, -1, 2, -2]);
    const d = Math.abs(a) === 1 ? r.int(1, 3) : r.int(1, 2);
    const h = r.int(-4, 4);
    const r1 = h - d;
    const r2 = h + d;
    const k = -a * d * d;
    const b = -a * (r1 + r2);
    const c = a * r1 * r2;
    const fTex = poly([a, b, c]);
    const pre = a === 1 ? "" : a === -1 ? "-" : String(a);
    const V: [number, number] = [h, k];
    const A: [number, number] = [r1, 0];
    const B: [number, number] = [r2, 0];
    const all = [V, A, B];
    return {
      statement: `Halla el vértice y los cortes con el eje $x$ de $f(x) = ${fTex}$. Ubica los tres puntos en el plano.`,
      parts: [
        {
          kind: "place",
          graph: { x: [-8, 8], y: [-10, 10], height: 320 },
          items: [
            { type: "point", label: "\\text{vértice}", answer: V, start: libre([-7, 9], all) },
            { type: "point", label: "\\text{corte izquierdo}", answer: A, start: libre([-7, -9], all) },
            { type: "point", label: "\\text{corte derecho}", answer: B, start: libre([5, -9], all) },
          ],
          reveal: [{ fn: fTex, color: "accent" }],
        },
      ],
      hints: [
        Math.abs(a) === 1 ? "Plantea $f(x) = 0$ y factoriza." : `Plantea $f(x) = 0$ y saca factor común $${a}$ antes de factorizar.`,
        "El vértice queda justo en medio de los dos cortes. Su ordenada es $f(x_v)$.",
      ],
      solution: [
        `Factorizando, $f(x) = ${pre}${r1 === 0 ? `x(${minus("x", r2)})` : r2 === 0 ? `x(${minus("x", r1)})` : `(${minus("x", r1)})(${minus("x", r2)})`}$. Se anula en $x = ${r1}$ y en $x = ${r2}$: cortes $(${r1}, 0)$ y $(${r2}, 0)$.`,
        `La parábola es simétrica, así que el vértice está en el punto medio: $x_v = \\dfrac{${r1} + ${r2 < 0 ? `(${r2})` : r2}}{2} = ${h}$.`,
        `$y_v = f(${h}) = ${pre}(${h - r1})(${h - r2}) = ${k}$. El vértice es $(${h}, ${k})$.`,
        `Abre hacia ${a > 0 ? "arriba" : "abajo"}, así que el vértice es el punto más ${a > 0 ? "bajo" : "alto"}.`,
      ],
    };
  },
};

const ubicarExponencial: ExerciseGen = {
  id: "ubicar-exponencial",
  title: "Asíntota y corte de una exponencial trasladada (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const inc = r.bool(0.6);
    const b = inc ? r.pick([2, 3]) : 2;
    const h = inc ? (b === 2 ? r.int(-2, 0) : r.int(-1, 0)) : r.int(0, 2);
    const val = inc ? b ** -h : 2 ** h;
    const k = r.nz(-5, 3);
    const y0 = val + k;
    const base = inc ? String(b) : "\\left(\\frac{1}{2}\\right)";
    const fTex = `${base}^{${minus("x", h)}}${plusK(k)}`;
    const Y: [number, number] = [0, y0];
    return {
      statement: `Sea $f(x) = ${fTex}$. Ubica su asíntota horizontal y su corte con el eje $y$, y luego escribe su rango.`,
      sequential: true,
      parts: [
        {
          kind: "place",
          graph: { x: [-7, 7], y: [-7, 9], height: 320 },
          items: [
            { type: "hline", label: "\\text{asíntota}", answer: k, start: k > 0 ? -6 : 7 },
            { type: "point", label: "\\text{corte con } y", answer: Y, start: libre([5, -5], [Y]) },
          ],
          reveal: [{ fn: fTex, color: "accent" }],
        },
        {
          kind: "interval",
          prompt: "Rango",
          before: "\\text{Ran } f =",
          answer: [iv(k, Infinity)],
          mistakes: [
            { answer: [iv(k, Infinity, true)], feedback: `La curva se acerca a $y = ${k}$ pero nunca la toca. El extremo va abierto.` },
            { answer: [iv(0, Infinity)], feedback: `Ese es el rango de la exponencial sin trasladar. El $${plusK(k).trim()}$ mueve también el piso de la gráfica.` },
          ],
        },
      ],
      hints: [
        `Parte de $y = ${inc ? `${b}^{x}` : "\\left(\\frac{1}{2}\\right)^{x}"}$: tiene asíntota $y = 0$ y pasa por $(0, 1)$.`,
        "Lo que se suma afuera sube o baja la asíntota. El corte con el eje $y$ sale de calcular $f(0)$.",
      ],
      solution: [
        `$${base}^{${minus("x", h)}}$ siempre es positivo y se acerca a $0$ hacia ${inc ? "la izquierda" : "la derecha"}. Al ${k > 0 ? "sumar" : "restar"} $${Math.abs(k)}$, $f$ se acerca a $${k}$: la asíntota horizontal es $y = ${k}$.`,
        `$f(0) = ${base}^{${-h}}${plusK(k)} = ${val}${plusK(k)} = ${y0}$. Corta al eje $y$ en $(0, ${y0})$.`,
        `Como $${base}^{${minus("x", h)}}$ toma todos los valores positivos, $f$ toma todos los mayores que $${k}$: $\\text{Ran } f = (${k}, +\\infty)$.`,
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("funciones-elementales"),
  objectives: [
    "Reconocer la gráfica de las funciones constante, lineal, cuadrática, cúbica, valor absoluto, $1/x$, raíces, exponencial y logarítmica.",
    "Dar el dominio, el rango y los cortes con los ejes de cada una.",
    "Hallar el vértice de una parábola y usarlo para escribir su rango.",
    "Explicar cómo cambian la exponencial y el logaritmo según su base.",
  ],
  sections: [
    {
      id: "constante-lineal",
      title: "Constante y lineal",
      blocks: [
        {
          type: "text",
          md: "Casi todas las funciones del curso se arman con un puñado de piezas básicas. Si reconoces la forma de cada pieza, vas a poder dibujar funciones mucho más complicadas sin tabla de valores.\n\nLa más sencilla es la **función constante** $f(x) = C$. Da lo mismo qué $x$ metas, la salida siempre es $C$. Su gráfica es una recta horizontal a la altura $C$. Corta al eje $y$ en $(0, C)$ y no corta al eje $x$, salvo que $C = 0$.",
        },
        {
          type: "definition",
          title: "Función lineal",
          md: "Es la de la forma $f(x) = mx + b$, con $m$ y $b$ números reales. Su gráfica es una recta.\n\n- $m$ es la **pendiente**: cuánto sube $y$ cada vez que $x$ avanza una unidad.\n- $b$ es el **corte con el eje $y$**, porque $f(0) = b$.\n\nSi $m > 0$ la recta sube, si $m < 0$ baja y si $m = 0$ es una constante.",
        },
        {
          type: "widget",
          widget: {
            kind: "sliders",
            fn: "mx+b",
            params: [
              { name: "m", min: -4, max: 4, step: 0.5, value: 1, label: "pendiente" },
              { name: "b", min: -5, max: 5, step: 1, value: 2, label: "corte con y" },
            ],
            x: [-6, 6],
            y: [-6, 6],
            formula: "y = mx + b \\qquad m = {m},\\; b = {b}",
          },
          caption: "Mueve $m$ y fíjate que la recta gira sobre el punto $(0, b)$. Mueve $b$ y la recta sube o baja sin girar.",
        },
        {
          type: "example",
          title: "Cortes de una recta",
          problem: "Halla los cortes con los ejes de $f(x) = -2x + 6$.",
          steps: [
            "Corte con el eje $y$: hacemos $x = 0$ y queda $f(0) = 6$. El punto es $(0, 6)$.",
            "Corte con el eje $x$: la altura es cero, así que planteamos $-2x + 6 = 0$. Despejando, $x = 3$. El punto es $(3, 0)$.",
            "Con esos dos puntos ya se dibuja la recta. Como $m = -2$, baja dos unidades por cada unidad que avanza.",
          ],
          answer: "Corta al eje $y$ en $(0, 6)$ y al eje $x$ en $(3, 0)$.",
        },
        {
          type: "graph",
          spec: {
            x: [-2, 6], y: [-3, 8],
            curves: [{ fn: "-2x+6", color: "accent" }],
            labels: [{ x: 2.5, y: 4, text: "f(x) = −2x + 6", color: "accent" }],
            points: [{ x: 0, y: 6, label: "(0, 6)" }, { x: 3, y: 0, label: "(3, 0)" }],
          },
        },
        {
          type: "note",
          tone: "econ",
          title: "La recta en economía",
          md: "Un costo total del tipo $C(q) = 500 + 20q$ es una función lineal. El 500 es el corte con el eje vertical, lo que cuesta producir cero unidades (el costo fijo). El 20 es la pendiente, lo que suma cada unidad adicional.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿En qué valor de $x$ corta al eje $x$ la recta $f(x) = 3x - 12$?",
            parts: [{ kind: "expr", before: "x =", answer: "4" }],
            solution: ["Planteamos $3x - 12 = 0$, así que $3x = 12$ y $x = 4$."],
          },
        },
      ],
    },
    {
      id: "cuadratica",
      title: "La función cuadrática y su vértice",
      blocks: [
        {
          type: "text",
          md: "Cuando la $x$ aparece elevada al cuadrado, la gráfica deja de ser recta y se vuelve una **parábola**. Piensa en el chorro de una manguera: sube, llega a un punto más alto y baja de forma simétrica. Ese punto de giro se llama **vértice**.",
        },
        {
          type: "definition",
          title: "Función cuadrática",
          md: "$f(x) = ax^2 + bx + c$, con $a \\ne 0$.\n\n- Si $a > 0$ la parábola abre hacia arriba y el vértice es el punto más bajo.\n- Si $a < 0$ abre hacia abajo y el vértice es el punto más alto.\n\nEl vértice está en\n\n$$x_v = -\\frac{b}{2a}, \\qquad y_v = f(x_v)$$",
        },
        {
          type: "widget",
          widget: {
            kind: "sliders",
            fn: "a(x-h)^{2}+k",
            params: [
              { name: "a", min: -3, max: 3, step: 0.5, value: 1 },
              { name: "h", min: -4, max: 4, step: 1, value: 0 },
              { name: "k", min: -4, max: 4, step: 1, value: 0 },
            ],
            x: [-7, 7],
            y: [-7, 7],
            formula: "y = a(x - h)^2 + k \\qquad a = {a},\\; h = {h},\\; k = {k}",
            reference: [{ fn: "x^{2}", color: "muted", dashed: true }],
          },
          caption: "En la forma $a(x - h)^2 + k$ el vértice se lee directo: es $(h, k)$. El signo de $a$ decide hacia dónde abre y su tamaño decide qué tan cerrada es.",
        },
        {
          type: "example",
          title: "Vértice, cortes y rango",
          problem: "Estudia $f(x) = x^2 - 4x + 3$.",
          steps: [
            "Aquí $a = 1$, $b = -4$, $c = 3$. Como $a > 0$, abre hacia arriba.",
            "Vértice: $x_v = -\\frac{-4}{2 \\cdot 1} = 2$ y $y_v = f(2) = 4 - 8 + 3 = -1$. El vértice es $(2, -1)$.",
            "Corte con el eje $y$: $f(0) = 3$.",
            "Cortes con el eje $x$: $x^2 - 4x + 3 = (x - 1)(x - 3) = 0$, así que $x = 1$ y $x = 3$.",
            "El punto más bajo está a altura $-1$ y la parábola sube sin límite. Por eso el rango es $[-1, +\\infty)$.",
          ],
          answer: "Vértice $(2, -1)$, cortes $(1, 0)$, $(3, 0)$ y $(0, 3)$, rango $[-1, +\\infty)$.",
        },
        {
          type: "graph",
          spec: {
            x: [-2, 6], y: [-2, 6],
            curves: [{ fn: "x^{2}-4x+3", color: "accent" }],
            points: [{ x: 2, y: -1, label: "vértice" }, { x: 1, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 3 }],
            vlines: [{ x: 2, dashed: true, color: "muted" }],
          },
          caption: "La recta punteada $x = 2$ es el eje de simetría. Los dos cortes con el eje $x$ quedan a la misma distancia de ella.",
        },
        {
          type: "table",
          headers: ["Discriminante $\\Delta = b^2 - 4ac$", "Cortes con el eje $x$"],
          rows: [
            ["$\\Delta > 0$", "Dos cortes"],
            ["$\\Delta = 0$", "Uno solo, en el vértice"],
            ["$\\Delta < 0$", "Ninguno, la parábola no toca el eje"],
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "El rango no es todo $\\mathbb{R}$",
          md: "Una parábola nunca cubre todos los reales. Si abre hacia arriba, su rango es $[y_v, +\\infty)$. Si abre hacia abajo, es $(-\\infty, y_v]$. El error típico es poner la abscisa $x_v$ en lugar de la ordenada $y_v$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Cuál es la abscisa del vértice de $f(x) = x^2 + 6x + 5$?",
            parts: [{ kind: "expr", before: "x_v =", answer: "-3", mistakes: [{ answer: "3", feedback: "Falta el signo menos de $-\\frac{b}{2a}$." }] }],
            solution: ["$x_v = -\\frac{6}{2 \\cdot 1} = -3$."],
          },
        },
        {
          type: "quick",
          exercise: {
            statement: "Halla el vértice y los cortes con el eje $x$ de $f(x) = x^2 + 2x - 3$. Arrastra cada punto hasta su lugar y aparecerá la parábola.",
            parts: [
              {
                kind: "place",
                graph: { x: [-6, 6], y: [-6, 6], height: 280 },
                items: [
                  { type: "point", label: "\\text{vértice}", answer: [-1, -4], start: [-5, 5] },
                  { type: "point", label: "\\text{corte izquierdo}", answer: [-3, 0], start: [3, 5] },
                  { type: "point", label: "\\text{corte derecho}", answer: [1, 0], start: [5, 5] },
                ],
                reveal: [{ fn: "x^{2}+2x-3", color: "accent" }],
              },
            ],
            hints: ["Factoriza para los cortes. El vértice queda en medio de ellos."],
            solution: [
              "$x^2 + 2x - 3 = (x + 3)(x - 1)$, así que corta al eje $x$ en $-3$ y en $1$.",
              "$x_v = -\\frac{2}{2} = -1$, justo en medio de los cortes, y $f(-1) = 1 - 2 - 3 = -4$. Vértice $(-1, -4)$.",
            ],
          },
        },
      ],
    },
    {
      id: "cubica-polinomios",
      title: "Cúbica y polinomios",
      blocks: [
        {
          type: "text",
          md: "La **función cúbica** $f(x) = ax^3$ se parece a la recta en que toma todos los valores reales, pero se dobla. Con $a > 0$ viene de abajo, se aplana al pasar por el origen y sigue subiendo. Con $a < 0$ hace lo mismo al revés.\n\nA diferencia de $x^2$, el cubo respeta el signo: $(-2)^3 = -8$. Por eso la gráfica tiene una mitad debajo del eje $x$.",
        },
        {
          type: "graph",
          spec: {
            x: [-3, 3], y: [-6, 6], step: 1,
            curves: [
              { fn: "x^{3}", color: "accent", label: "x³" },
              { fn: "\\frac{1}{4}x^{3}", color: "blue", label: "x³/4" },
              { fn: "-x^{3}", color: "red", label: "−x³" },
            ],
          },
          caption: "Un coeficiente mayor que 1 acerca la curva al eje $y$, uno entre 0 y 1 la abre, y el signo menos la refleja.",
        },
        {
          type: "definition",
          title: "Función polinómica",
          md: "$f(x) = c_n x^n + \\dots + c_1 x + c_0$, con $n$ entero no negativo. El número $n$ es el **grado**. La constante es grado 0, la lineal grado 1, la cuadrática grado 2 y $ax^3$ es un caso de grado 3. El dominio de cualquier polinomio es $\\mathbb{R}$.",
        },
        {
          type: "example",
          title: "Cortes de un polinomio factorizado",
          problem: "Halla los cortes con los ejes de $f(x) = x^3 - 4x$.",
          steps: [
            "Corte con el eje $y$: $f(0) = 0$. Pasa por el origen.",
            "Cortes con el eje $x$: sacamos factor común, $x^3 - 4x = x(x^2 - 4) = x(x - 2)(x + 2)$.",
            "Un producto es cero cuando algún factor es cero: $x = 0$, $x = 2$ o $x = -2$.",
          ],
          answer: "Corta al eje $x$ en $-2$, $0$ y $2$.",
        },
        {
          type: "graph",
          spec: {
            x: [-3, 3], y: [-5, 5], step: 1,
            curves: [{ fn: "x^{3}-4x", color: "accent" }],
            points: [{ x: -2, y: 0 }, { x: 0, y: 0 }, { x: 2, y: 0 }],
          },
        },
        {
          type: "quick",
          exercise: {
            statement: "Si $f(x) = x^3$, ¿cuánto vale $f(-2)$?",
            parts: [{ kind: "expr", before: "f(-2) =", answer: "-8", mistakes: [{ answer: "8", feedback: "Un número negativo elevado a una potencia impar sigue siendo negativo." }] }],
            solution: ["$(-2)^3 = (-2)(-2)(-2) = -8$."],
          },
        },
      ],
    },
    {
      id: "valor-absoluto-inversa",
      title: "Valor absoluto y la función 1/x",
      blocks: [
        {
          type: "text",
          md: "El **valor absoluto** mide la distancia de un número al cero, sin importar el lado. Por eso $|{-5}| = 5$ y $|5| = 5$. Como función se escribe a trozos:\n\n$$|x| = \\begin{cases} x & \\text{si } x \\ge 0 \\\\ -x & \\text{si } x < 0 \\end{cases}$$\n\nA la derecha del cero copia la recta $y = x$. A la izquierda le cambia el signo a los negativos y los vuelve positivos. El resultado es una V con la punta en el origen.",
        },
        {
          type: "graph",
          spec: {
            x: [-5, 5], y: [-3, 5],
            curves: [
              { fn: "|x|", color: "accent", label: "y = |x|" },
              { fn: "x", color: "muted", dashed: true, domain: [-5, 0] },
            ],
          },
          caption: "La parte punteada es $y = x$ para negativos. El valor absoluto la refleja hacia arriba.",
        },
        {
          type: "text",
          md: "La función $f(x) = \\dfrac{1}{x}$ responde a otra idea: mientras más grande es $x$, más pequeño es $\\frac{1}{x}$, y al revés. No existe en $x = 0$ porque no se divide entre cero. Cerca del cero se dispara hacia $+\\infty$ por la derecha y hacia $-\\infty$ por la izquierda. Lejos del cero se pega al eje $x$ sin tocarlo. Su gráfica se llama **hipérbola** y los ejes son sus **asíntotas**.",
        },
        {
          type: "graph",
          spec: {
            x: [-5, 5], y: [-5, 5],
            curves: [{ fn: "\\frac{1}{x}", color: "accent", breaks: [0] }],
            points: [{ x: 1, y: 1 }, { x: -1, y: -1 }, { x: 2, y: 0.5 }, { x: 0.5, y: 2 }],
          },
        },
        {
          type: "table",
          headers: ["Función", "Dominio", "Rango", "Cortes"],
          rows: [
            ["$|x|$", "$\\mathbb{R}$", "$[0, +\\infty)$", "Solo el origen"],
            ["$\\frac{1}{x}$", "$\\mathbb{R} - \\{0\\}$", "$\\mathbb{R} - \\{0\\}$", "Ninguno"],
          ],
        },
        {
          type: "example",
          title: "Dominio y rango de 1/x",
          problem: "Explica por qué el rango de $f(x) = \\frac{1}{x}$ es $\\mathbb{R} - \\{0\\}$.",
          steps: [
            "Para que $\\frac{1}{x} = 0$ el numerador tendría que ser cero, y es 1. Así que el 0 nunca sale.",
            "Cualquier otro número $y \\ne 0$ sí sale: basta tomar $x = \\frac{1}{y}$, porque $f\\left(\\frac{1}{y}\\right) = y$.",
          ],
          answer: "$\\text{Ran } f = \\mathbb{R} - \\{0\\} = (-\\infty, 0) \\cup (0, +\\infty)$.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Demanda con forma de hipérbola",
          md: "Una demanda como $q = \\frac{100}{p}$ usa la rama positiva de $\\frac{1}{x}$. Si el precio se acerca a cero la cantidad demandada crece sin límite, y si el precio sube mucho la cantidad se acerca a cero.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Cuál es el rango de $f(x) = |x|$?",
            parts: [{ kind: "interval", before: "\\text{Ran } f =", answer: [iv(0, Infinity, true)], mistakes: [{ answer: [iv(0, Infinity)], feedback: "$|0| = 0$, así que el cero sí está en el rango." }] }],
            solution: ["Un valor absoluto nunca es negativo y vale 0 en $x = 0$. Toma todos los valores desde 0 hacia arriba: $[0, +\\infty)$."],
          },
        },
      ],
    },
    {
      id: "raices",
      title: "Raíz cuadrada y raíz cúbica",
      blocks: [
        {
          type: "text",
          md: "La **raíz cuadrada** $\\sqrt{x}$ responde a qué número positivo elevado al cuadrado da $x$. Como ningún real al cuadrado da negativo, solo existe para $x \\ge 0$. Su gráfica es media parábola acostada: sale del origen y crece cada vez más lento.\n\nLa **raíz cúbica** $\\sqrt[3]{x}$ no tiene ese problema, porque los cubos sí pueden ser negativos: $\\sqrt[3]{-8} = -2$. Existe en todo $\\mathbb{R}$.",
        },
        {
          type: "graph",
          spec: {
            x: [-8, 8], y: [-3, 5],
            curves: [
              { fn: "\\sqrt{x}", color: "accent", domain: [0, 8], label: "√x" },
              { fn: "\\sqrt[3]{x}", color: "blue", label: "∛x" },
            ],
            points: [{ x: 0, y: 0 }, { x: 4, y: 2, color: "accent" }, { x: -8, y: -2, color: "blue" }, { x: 8, y: 2, color: "blue" }],
          },
        },
        {
          type: "table",
          headers: ["Función", "Dominio", "Rango", "Forma"],
          rows: [
            ["$\\sqrt{x}$", "$[0, +\\infty)$", "$[0, +\\infty)$", "Media rama desde el origen"],
            ["$\\sqrt[3]{x}$", "$\\mathbb{R}$", "$\\mathbb{R}$", "S acostada, vertical en el origen"],
          ],
        },
        {
          type: "example",
          title: "Dominio con una raíz cuadrada",
          problem: "Halla el dominio y el rango de $f(x) = \\sqrt{6 - 2x}$.",
          steps: [
            "El radicando tiene que ser mayor o igual a cero: $6 - 2x \\ge 0$.",
            "Despejamos: $-2x \\ge -6$. Al dividir entre $-2$ la desigualdad se voltea: $x \\le 3$.",
            "El radicando recorre todos los valores de $[0, +\\infty)$, así que la raíz también.",
          ],
          answer: "$\\text{Dom } f = (-\\infty, 3]$ y $\\text{Ran } f = [0, +\\infty)$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Raíz par contra raíz impar",
          md: "Las raíces de índice par ($\\sqrt{\\ }$, $\\sqrt[4]{\\ }$) exigen radicando $\\ge 0$. Las de índice impar ($\\sqrt[3]{\\ }$, $\\sqrt[5]{\\ }$) no exigen nada. Confundirlas es la forma más rápida de perder puntos en un ejercicio de dominio.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $\\sqrt[3]{-27}$.",
            parts: [{ kind: "expr", answer: "-3" }],
            solution: ["$(-3)^3 = -27$, así que $\\sqrt[3]{-27} = -3$."],
          },
        },
      ],
    },
    {
      id: "exponencial-logaritmica",
      title: "Exponencial y logarítmica",
      blocks: [
        {
          type: "text",
          md: "En la **función exponencial** $f(x) = a^x$ la variable está en el exponente. La base $a$ es un número positivo distinto de 1. Lo que la distingue es que crece (o decrece) multiplicando: con $a = 2$, cada paso de una unidad en $x$ duplica la salida.\n\nHay dos datos que no cambian con la base. Siempre pasa por $(0, 1)$, porque $a^0 = 1$. Y nunca toca el eje $x$, porque una potencia de base positiva nunca da cero ni negativo.",
        },
        {
          type: "widget",
          widget: {
            kind: "sliders",
            fn: "a^{x}",
            params: [{ name: "a", min: 0.2, max: 4.1, step: 0.3, value: 2, label: "base" }],
            x: [-5, 5],
            y: [-1, 8],
            formula: "y = a^{x} \\qquad a = {a}",
          },
          caption: "Con $a > 1$ la curva crece. Con $0 < a < 1$ decrece. Todas pasan por $(0, 1)$.",
        },
        {
          type: "text",
          md: "La **función logarítmica** $f(x) = \\log_a x$ hace el trabajo contrario: responde a qué exponente hay que elevar $a$ para obtener $x$. Por ejemplo $\\log_2 8 = 3$ porque $2^3 = 8$. Como $a^y$ siempre es positivo, solo existen logaritmos de números positivos.\n\nSu gráfica es la de la exponencial reflejada sobre la recta $y = x$. Pasa por $(1, 0)$ y tiene el eje $y$ como asíntota vertical. Cuando la base es $e \\approx 2{,}718$ se escribe $\\ln x$ y se llama logaritmo natural.",
        },
        {
          type: "widget",
          widget: {
            kind: "sliders",
            fn: "\\log_{a}(x)",
            params: [{ name: "a", min: 0.2, max: 4.1, step: 0.3, value: 2, label: "base" }],
            x: [-1, 8],
            y: [-4, 4],
            formula: "y = \\log_{a} x \\qquad a = {a}",
          },
          caption: "Con base mayor que 1 el logaritmo crece, y con base entre 0 y 1 decrece. Todas pasan por $(1, 0)$.",
        },
        {
          type: "table",
          headers: ["", "$a^x$", "$\\log_a x$"],
          rows: [
            ["Dominio", "$\\mathbb{R}$", "$(0, +\\infty)$"],
            ["Rango", "$(0, +\\infty)$", "$\\mathbb{R}$"],
            ["Punto fijo", "$(0, 1)$", "$(1, 0)$"],
            ["Asíntota", "$y = 0$", "$x = 0$"],
          ],
          caption: "El dominio de una es el rango de la otra. Son funciones inversas.",
        },
        {
          type: "example",
          title: "Exponencial trasladada",
          problem: "Halla dominio, rango, asíntota y corte con el eje $y$ de $f(x) = 2^{x} - 3$.",
          steps: [
            "La exponencial acepta cualquier exponente, así que $\\text{Dom } f = \\mathbb{R}$.",
            "$2^x$ toma todos los valores de $(0, +\\infty)$. Al restar 3, todo baja tres unidades: $\\text{Ran } f = (-3, +\\infty)$.",
            "La asíntota $y = 0$ también baja: ahora es $y = -3$.",
            "$f(0) = 2^0 - 3 = -2$, así que corta al eje $y$ en $(0, -2)$.",
          ],
        },
        {
          type: "note",
          tone: "econ",
          title: "Interés compuesto",
          md: "Un capital de 1000 al 10 % anual compuesto vale $1000 \\cdot (1{,}1)^t$ después de $t$ años. Es una exponencial de base $1{,}1$. El logaritmo responde la pregunta inversa: cuántos años hacen falta para llegar a cierto monto.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Rango de la exponencial",
          md: "El rango de $a^x$ es $(0, +\\infty)$ con paréntesis en el cero. La curva se acerca al eje pero nunca vale 0.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Cuánto vale $\\log_3 81$?",
            parts: [{ kind: "expr", answer: "4", maxOps: 0 }],
            solution: ["$3^4 = 81$, así que $\\log_3 81 = 4$."],
          },
        },
        {
          type: "quick",
          exercise: {
            statement: "Ubica la asíntota horizontal y el corte con el eje $y$ de $f(x) = 2^{x + 1} - 4$.",
            parts: [
              {
                kind: "place",
                graph: { x: [-6, 6], y: [-6, 6], height: 280 },
                items: [
                  { type: "hline", label: "\\text{asíntota}", answer: -4, start: 4 },
                  { type: "point", label: "\\text{corte con } y", answer: [0, -2], start: [4, -5] },
                ],
                reveal: [{ fn: "2^{x+1}-4", color: "accent" }],
              },
            ],
            hints: ["El $-4$ de afuera baja la asíntota $y = 0$. Para el corte calcula $f(0)$."],
            solution: [
              "$2^{x + 1}$ nunca vale $0$ pero se le acerca por la izquierda. Al restar 4, la asíntota pasa a ser $y = -4$.",
              "$f(0) = 2^{1} - 4 = -2$. Corta al eje $y$ en $(0, -2)$.",
            ],
          },
        },
      ],
    },
  ],
  exercises: [
    corteLineal,
    evaluarFamilia,
    reconocerGrafica,
    dominioElemental,
    vertice,
    rangoCuadratica,
    cortesCuadratica,
    expLogVF,
    parabolaCompleta,
    rangoDado,
    expLogTrasladada,
    ubicarVerticeCorteY,
    ubicarParabolaCortes,
    ubicarExponencial,
  ],
};

export default topic;
