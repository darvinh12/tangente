import { meta } from "../catalog";
import { choice, trueFalse } from "../helpers";
import type { ExerciseGen, GraphSpec, Part, Rich, Topic } from "../types";
import { iv, minusPoints, R, unionTex, type Interval } from "@/lib/math/intervals";
import { poly, signed, terms } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

type El = number | string;

const setTex = (xs: El[]) => (xs.length ? `\\{${xs.join(", ")}\\}` : "\\varnothing");
const pairsTex = (ps: [El, El][]) => `\\{${ps.map(([a, b]) => `(${a}, ${b})`).join(", ")}\\}`;

function xMinus(a: number) {
  return a === 0 ? "x" : a > 0 ? `x - ${a}` : `x + ${-a}`;
}

/** Coeficiente pegado a un paréntesis: 1 -> "", -1 -> "-". */
function kc(k: number) {
  return k === 1 ? "" : k === -1 ? "-" : String(k);
}

function sq(h: number) {
  return h === 0 ? "x^2" : `(${xMinus(h)})^2`;
}

function small(spec: Omit<GraphSpec, "x" | "y" | "height">): GraphSpec {
  return { x: [-5, 5], y: [-5, 5], height: 200, ...spec };
}

const L_INY = "Inyectiva, pero no sobreyectiva";
const L_SOB = "Sobreyectiva, pero no inyectiva";
const L_BIY = "Biyectiva";
const L_NIN = "Ni inyectiva ni sobreyectiva";

function classLabel(iny: boolean, sob: boolean) {
  return iny && sob ? L_BIY : iny ? L_INY : sob ? L_SOB : L_NIN;
}

/** Opciones de clasificación con retroalimentación según qué propiedad se equivocó. */
function classify(iny: boolean, sob: boolean, whyIny: Rich, whySob: Rich, prompt?: Rich): Part {
  const correct = classLabel(iny, sob);
  const props: Record<string, [boolean, boolean]> = {
    [L_INY]: [true, false],
    [L_SOB]: [false, true],
    [L_BIY]: [true, true],
    [L_NIN]: [false, false],
  };
  const wrong = [L_INY, L_SOB, L_BIY, L_NIN]
    .filter((l) => l !== correct)
    .map((l) => [l, props[l][0] !== iny ? whyIny : whySob] as [Rich, Rich]);
  return choice(correct, wrong, prompt);
}

/* ----------------------------------- ejercicios ----------------------------------- */

const clasificarDiagrama: ExerciseGen = {
  id: "clasificar-diagrama",
  title: "Clasificar una función finita",
  level: 1,
  generate: (r) => {
    const target = r.pick(["iny", "sob", "biy", "nin"] as const);
    let n: number, m: number;
    if (target === "iny") [n, m] = r.pick([[2, 3], [3, 4], [2, 4]]);
    else if (target === "sob") [n, m] = r.pick([[3, 2], [4, 3], [4, 2]]);
    else if (target === "biy") n = m = r.int(3, 4);
    else [n, m] = r.pick([[3, 3], [4, 4], [3, 4], [4, 3]]);
    const A = [1, 2, 3, 4, 5, 6].slice(0, n);
    const B = r.sample(["a", "b", "c", "d", "e"], m).sort();
    let imgs: string[];
    if (target === "iny" || target === "biy") imgs = r.sample(B, n);
    else if (target === "sob") imgs = r.shuffle([...B, ...Array.from({ length: n - m }, () => r.pick(B))]);
    else {
      const used = r.sample(B, Math.min(m - 1, n - 1));
      imgs = r.shuffle([...used, ...Array.from({ length: n - used.length }, () => r.pick(used))]);
    }
    const pairs: [El, El][] = A.map((a, i) => [a, imgs[i]]);
    const iny = new Set(imgs).size === imgs.length;
    const sob = B.every((b) => imgs.includes(b));
    const dupB = imgs.find((b, i) => imgs.indexOf(b) !== i);
    const dupA = dupB ? A.filter((_, i) => imgs[i] === dupB) : [];
    const free = B.find((b) => !imgs.includes(b));
    const whyIny = iny ? "Sí es inyectiva: no hay dos elementos de $A$ con la misma imagen." : `No es inyectiva: $${dupA[0]}$ y $${dupA[1]}$ tienen la misma imagen, $${dupB}$.`;
    const whySob = sob ? "Sí es sobreyectiva: todo elemento de $B$ es imagen de alguien." : `No es sobreyectiva: $${free}$ no es imagen de ningún elemento de $A$.`;
    return {
      statement: `Sea $f: A \\to B$ con $A = ${setTex(A)}$, $B = ${setTex(B)}$ y $f = ${pairsTex(pairs)}$. ¿Cómo se clasifica $f$?`,
      parts: [classify(iny, sob, whyIny, whySob)],
      hints: [
        "Inyectiva: ninguna segunda componente se repite.",
        "Sobreyectiva: todos los elementos de $B$ aparecen como segunda componente.",
      ],
      solution: [whyIny, whySob, `Clasificación: ${classLabel(iny, sob).toLowerCase()}.`],
    };
  },
};

const rectaHorizontal: ExerciseGen = {
  id: "recta-horizontal",
  title: "Prueba de la recta horizontal",
  level: 1,
  generate: (r) => {
    const a = r.int(1, 3);
    const inj: { g: GraphSpec; name: string }[] = [
      { g: small({ curves: [{ fn: `\\frac{x^3}{${a + 3}}`, color: "accent" }] }), name: "una cúbica" },
      { g: small({ curves: [{ fn: `e^{x} - ${a}`, color: "accent" }] }), name: "una exponencial" },
      { g: small({ curves: [{ fn: `\\sqrt{x + ${a + 1}}`, color: "accent", domain: [-a - 1, 5] }], points: [{ x: -a - 1, y: 0, color: "accent" }] }), name: "una raíz cuadrada" },
      { g: small({ curves: [{ fn: `\\ln(x + ${a})`, color: "accent", domain: [-a + 0.01, 5] }], vlines: [{ x: -a, dashed: true, color: "muted" }] }), name: "un logaritmo" },
    ];
    const non: { g: GraphSpec; why: Rich }[] = [
      { g: small({ curves: [{ fn: `x^2 - ${a}`, color: "accent" }] }), why: `Es una parábola. La recta $y = ${1 - a}$ la corta en $x = -1$ y en $x = 1$.` },
      { g: small({ curves: [{ fn: `|x| - ${a}`, color: "accent" }] }), why: `Es un valor absoluto. La recta $y = ${1 - a}$ la corta en $x = -1$ y en $x = 1$.` },
      { g: small({ curves: [{ fn: `-(x - 1)^2 + ${a}`, color: "accent" }] }), why: `Es una parábola. La recta $y = ${a - 1}$ la corta en $x = 0$ y en $x = 2$.` },
    ];
    const findNon = r.bool();
    type Opt = { g: GraphSpec; correct: boolean; fb?: Rich };
    let opts: Opt[];
    let explain: string;
    if (!findNon) {
      const good = r.pick(inj);
      opts = [{ g: good.g, correct: true }, ...non.map((x) => ({ g: x.g, correct: false, fb: x.why }))];
      explain = `es ${good.name}: cada recta horizontal la corta a lo sumo una vez. Las otras tienen rectas horizontales que las cortan dos veces.`;
    } else {
      const bad = r.pick(non);
      opts = [{ g: bad.g, correct: true }, ...r.sample(inj, 3).map((x) => ({ g: x.g, correct: false, fb: `Es ${x.name}. Ninguna recta horizontal la corta dos veces, así que es inyectiva.` }))];
      explain = `no es inyectiva. ${bad.why}`;
    }
    opts = r.shuffle(opts);
    const letters = ["A", "B", "C", "D"];
    return {
      statement: findNon ? "¿Cuál de estas funciones **no** es inyectiva?" : r.pick(["¿Cuál de estas funciones es inyectiva?", "¿Cuál de estas gráficas pasa la prueba de la recta horizontal?"]),
      parts: [
        {
          kind: "choice",
          shuffle: false,
          options: opts.map((o, i) => ({ label: `Gráfica ${letters[i]}`, correct: o.correct || undefined, feedback: o.fb, graph: o.g })),
        },
      ],
      hints: ["Pasa rectas horizontales por la gráfica. Si alguna la corta en dos puntos, hay dos $x$ con la misma imagen."],
      solution: [
        "Una función es inyectiva si ninguna recta horizontal corta su gráfica en más de un punto.",
        `La gráfica ${letters[opts.findIndex((o) => o.correct)]} ${explain}`,
      ],
    };
  },
};

const contraejemplo: ExerciseGen = {
  id: "contraejemplo",
  title: "Un contraejemplo a la inyectividad",
  level: 1,
  generate: (r) => {
    const h = r.int(-3, 3);
    const k = r.int(-4, 4);
    const d = r.int(1, 3) * r.sign();
    const x1 = h + d;
    const x2 = h - d;
    const abs = r.bool(0.35);
    const rule = abs ? terms([[1, `|${xMinus(h)}|`], [k, ""]]) : poly([1, -2 * h, h * h + k]);
    const val = abs ? Math.abs(d) + k : d * d + k;
    return {
      statement: `La función $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = ${rule}$ no es inyectiva. Halla el otro valor de $x$ que tiene la misma imagen que $x = ${x1}$.`,
      parts: [
        {
          kind: "expr",
          before: "x =",
          answer: String(x2),
          maxOps: 0,
          mistakes: h !== 0 ? [{ answer: String(-x1), feedback: `$f(${-x1}) \\ne f(${x1})$. La simetría no es respecto de $x = 0$ sino respecto del vértice, $x = ${h}$.` }] : [],
        },
      ],
      hints: [
        `Calcula $f(${x1})$ y luego busca los $x$ con esa misma imagen.`,
        abs ? `La gráfica es simétrica respecto de $x = ${h}$.` : `Completa el cuadrado: $f(x) = ${sq(h)} ${k === 0 ? "" : signed(k)}$. La gráfica es simétrica respecto de $x = ${h}$.`,
      ],
      solution: [
        `$f(${x1}) = ${val}$.`,
        abs
          ? `$|${xMinus(h)}| ${k === 0 ? "" : signed(k)} = ${val}$ da $|${xMinus(h)}| = ${Math.abs(d)}$, es decir $x = ${h + Math.abs(d)}$ o $x = ${h - Math.abs(d)}$.`
          : `$${sq(h)} ${k === 0 ? "" : signed(k)} = ${val}$ da $${sq(h)} = ${d * d}$, es decir $x = ${h + Math.abs(d)}$ o $x = ${h - Math.abs(d)}$.`,
        `Entonces $f(${x2}) = f(${x1}) = ${val}$ con $${x2} \\ne ${x1}$. Este par es la prueba de que $f$ no es inyectiva.`,
      ],
    };
  },
};

const sobreVF: ExerciseGen = {
  id: "sobre-vf",
  title: "¿Es sobreyectiva?",
  level: 1,
  generate: (r) => {
    const k = r.int(-4, 4);
    const h = r.int(-3, 3);
    const m = r.nz(-4, 4);
    const pool: { def: string; isTrue: boolean; why: Rich }[] = [
      { def: `f: \\mathbb{R} \\to [${k}, +\\infty) \\;/\\; y = ${terms([[1, "x^2"], [k, ""]])}`, isTrue: true, why: `El rango es $[${k}, +\\infty)$ y coincide con el conjunto de llegada.` },
      { def: `f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = ${terms([[1, "x^2"], [k, ""]])}`, isTrue: false, why: `El rango es $[${k}, +\\infty)$. Por ejemplo, $y = ${k - 1}$ no tiene preimagen porque $x^2 = -1$ no tiene solución.` },
      { def: `f: \\mathbb{R} \\to (${k}, +\\infty) \\;/\\; y = ${terms([[1, "e^{x}"], [k, ""]])}`, isTrue: true, why: `$e^x$ toma todos los valores positivos, así que el rango es $(${k}, +\\infty)$, igual al conjunto de llegada.` },
      { def: `f: \\mathbb{R} \\to [${k}, +\\infty) \\;/\\; y = ${terms([[1, "e^{x}"], [k, ""]])}`, isTrue: false, why: `$y = ${k}$ exigiría $e^x = 0$, imposible. El rango es $(${k}, +\\infty)$.` },
      { def: `f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = ${terms([[m, "x"], [k, ""]])}`, isTrue: true, why: `Para cualquier $y$, el $x = \\frac{y ${signed(-k)}}{${m}}$ cumple $f(x) = y$.` },
      { def: `f: [${h}, +\\infty) \\to \\mathbb{R} \\;/\\; y = \\sqrt{${xMinus(h)}}`, isTrue: false, why: "Una raíz cuadrada nunca es negativa. Los $y < 0$ del conjunto de llegada no tienen preimagen." },
      { def: `f: [${h}, +\\infty) \\to [0, +\\infty) \\;/\\; y = \\sqrt{${xMinus(h)}}`, isTrue: true, why: `Para cada $y \\ge 0$, $x = y^2 ${signed(h)}$ cumple $f(x) = y$.` },
      { def: `f: \\mathbb{R} - \\{${h}\\} \\to \\mathbb{R} \\;/\\; y = \\dfrac{1}{${xMinus(h)}}`, isTrue: false, why: "$y = 0$ exigiría que $1$ dividido entre algo diera $0$, imposible." },
    ];
    const c = r.pick(pool);
    return {
      statement: `¿Es sobreyectiva la función $${c.def}$?`,
      parts: [trueFalse(c.isTrue, c.why, "Responde verdadero si es sobreyectiva y falso si no.")],
      hints: ["Halla el rango y compáralo con el conjunto de llegada, el que está a la derecha de la flecha."],
      solution: [`${c.isTrue ? "Sí es sobreyectiva" : "No es sobreyectiva"}. ${c.why}`],
    };
  },
};

const clasificarReal: ExerciseGen = {
  id: "clasificar-real",
  title: "Clasificar una función de R en R",
  level: 2,
  generate: (r) => {
    const k = r.int(-4, 4);
    const h = r.nz(-3, 3);
    const m = r.nz(-4, 4);
    const pool: { rule: string; iny: boolean; sob: boolean; whyIny: Rich; whySob: Rich }[] = [
      {
        rule: terms([[m, "x"], [k, ""]]),
        iny: true,
        sob: true,
        whyIny: `Sí es inyectiva: $${m}a ${signed(k)} = ${m}b ${signed(k)}$ obliga a $a = b$.`,
        whySob: `Sí es sobreyectiva: cualquier $y$ es imagen de $x = \\frac{y ${signed(-k)}}{${m}}$.`,
      },
      {
        rule: `${sq(h)} ${k === 0 ? "" : signed(k)}`,
        iny: false,
        sob: false,
        whyIny: `No es inyectiva: $f(${h - 1}) = f(${h + 1}) = ${1 + k}$.`,
        whySob: `No es sobreyectiva: el rango es $[${k}, +\\infty)$, así que $y = ${k - 1}$ no es imagen.`,
      },
      {
        rule: terms([[1, "x^3"], [k, ""]]),
        iny: true,
        sob: true,
        whyIny: "Sí es inyectiva: $a^3 = b^3$ obliga a $a = b$, porque la raíz cúbica es única.",
        whySob: `Sí es sobreyectiva: cualquier $y$ es imagen de $x = \\sqrt[3]{y ${signed(-k)}}$.`,
      },
      {
        rule: terms([[1, "e^{x}"], [k, ""]]),
        iny: true,
        sob: false,
        whyIny: "Sí es inyectiva: la exponencial siempre crece, nunca repite valores.",
        whySob: `No es sobreyectiva: $e^x > 0$, así que el rango es $(${k}, +\\infty)$ y $y = ${k}$ no es imagen.`,
      },
      {
        rule: terms([[1, `|${xMinus(h)}|`], [k, ""]]),
        iny: false,
        sob: false,
        whyIny: `No es inyectiva: $f(${h - 1}) = f(${h + 1}) = ${1 + k}$.`,
        whySob: `No es sobreyectiva: el rango es $[${k}, +\\infty)$, así que $y = ${k - 1}$ no es imagen.`,
      },
      {
        rule: "x^3 - 4x",
        iny: false,
        sob: true,
        whyIny: "No es inyectiva: $f(0) = f(2) = f(-2) = 0$.",
        whySob: "Sí es sobreyectiva: una cúbica sube sin límite por un lado y baja sin límite por el otro, sin cortes, así que pasa por todos los valores.",
      },
    ];
    const c = r.pick(pool);
    return {
      statement: `Clasifica la función $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = ${c.rule}$.`,
      parts: [classify(c.iny, c.sob, c.whyIny, c.whySob)],
      hints: [
        "Para la inyectividad, busca dos $x$ distintos con la misma imagen. Si no existen, es inyectiva.",
        "Para la sobreyectividad, halla el rango y compáralo con $\\mathbb{R}$.",
      ],
      solution: [c.whyIny, c.whySob, `Clasificación: ${classLabel(c.iny, c.sob).toLowerCase()}.`],
    };
  },
};

const inyectivaAlgebraica: ExerciseGen = {
  id: "inyectiva-algebraica",
  title: "Probar la inyectividad con f(a) = f(b)",
  level: 2,
  generate: (r) => {
    const kind = r.pick(["racional", "racional", "lineal"] as const);
    let rule: string, K: number, steps: string[];
    if (kind === "lineal") {
      const m = r.nz(-6, 6, [1]);
      const n = r.int(-8, 8);
      rule = terms([[m, "x"], [n, ""]]);
      K = m;
      steps = [
        `$f(a) = f(b)$ es $${terms([[m, "a"], [n, ""]])} = ${terms([[m, "b"], [n, ""]])}$.`,
        `Restando $${n}$ de ambos lados y pasando todo a la izquierda: $${m}a - ${m < 0 ? `(${m})` : m}b = 0$, es decir $${m}(a - b) = 0$.`,
      ];
    } else {
      let p: number, q: number, c: number;
      do {
        p = r.nz(-4, 4);
        q = r.int(-6, 6);
        c = r.int(-5, 5);
      } while (p * c + q === 0);
      rule = `\\dfrac{${terms([[p, "x"], [q, ""]])}}{${xMinus(c)}}`;
      K = p * c + q;
      steps = [
        `$f(a) = f(b)$ es $\\dfrac{${terms([[p, "a"], [q, ""]])}}{${c === 0 ? "a" : `a ${signed(-c)}`}} = \\dfrac{${terms([[p, "b"], [q, ""]])}}{${c === 0 ? "b" : `b ${signed(-c)}`}}$.`,
        q * c === 0
          ? `Multiplicando en cruz y desarrollando, el término $${p === 1 ? "" : p === -1 ? "-" : p}ab$ aparece en los dos lados y se cancela.`
          : `Multiplicando en cruz y desarrollando, los términos $${p === 1 ? "" : p === -1 ? "-" : p}ab$ y $${-q * c}$ aparecen en los dos lados y se cancelan.`,
        `Queda $${terms([[-p * c, "a"], [q, "b"]])} = ${terms([[-p * c, "b"], [q, "a"]])}$, que se agrupa como $${kc(K)}(b - a) = 0$, o lo que es igual, $${kc(-K)}(a - b) = 0$.`,
      ];
    }
    return {
      statement: `Queremos probar que $f(x) = ${rule}$ es inyectiva en su dominio. Se parte de $f(a) = f(b)$ y, simplificando, se llega a una igualdad de la forma $K(a - b) = 0$.`,
      sequential: true,
      parts: [
        {
          kind: "expr",
          prompt: "¿Cuánto vale $K$? (Vale el número o su opuesto, según de qué lado agrupes.)",
          before: "K =",
          answer: String(K),
          accept: [String(-K)],
          maxOps: 0,
        },
        choice(
          "Como $K \\ne 0$, se puede dividir entre $K$: $a - b = 0$, así que $a = b$ y $f$ es inyectiva.",
          [
            ["Como $K \\ne 0$, $f$ no es inyectiva.", "Al revés: $K \\ne 0$ es justo lo que permite concluir $a = b$."],
            ["Hay que probar con varios números para estar seguros.", "Los ejemplos sirven para mostrar que algo **no** es inyectiva. Para probar que sí lo es hace falta el argumento general con $a$ y $b$."],
            ["De ahí sale $a = -b$, así que no es inyectiva.", "Revisa el factor: es $(a - b)$, no $(a + b)$."],
          ],
          "¿Qué se concluye?",
        ),
      ],
      hints: ["Escribe $f(a) = f(b)$, multiplica en cruz si hay fracciones y pasa todo a un lado.", "Saca factor común $(a - b)$."],
      solution: [...steps, `Como $${K} \\ne 0$, se divide entre él: $a - b = 0$, es decir $a = b$. Por lo tanto $f$ es inyectiva.`],
    };
  },
};

const restringirCuadratica: ExerciseGen = {
  id: "restringir-cuadratica",
  title: "Restringir una parábola para que sea biyectiva",
  level: 2,
  generate: (r) => {
    const a = r.pick([1, 1, -1]);
    const h = r.int(-4, 4);
    const k = r.int(-5, 5);
    const rule = poly([a, -2 * a * h, a * h * h + k]);
    const B: Interval[] = a > 0 ? [iv(k, Infinity, true, false)] : [iv(-Infinity, k, false, true)];
    return {
      statement: `Sea $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = ${rule}$. Sin cambiar la regla, se quiere restringirla al tramo $[x_v, +\\infty)$, donde $x_v$ es la abscisa del vértice, y escoger el conjunto de llegada para que quede biyectiva.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Halla la abscisa del vértice.", before: "x_v =", answer: String(h), maxOps: 0, mistakes: h !== 0 ? [{ answer: String(-h), feedback: "Revisa el signo. Para $ax^2 + bx + c$ el vértice está en $x = -\\frac{b}{2a}$." }] : [] },
        {
          kind: "interval",
          prompt: `Con $f: [${h}, +\\infty) \\to B$, ¿qué conjunto de llegada $B$ la hace sobreyectiva?`,
          before: "B =",
          answer: B,
          mistakes: [
            { answer: R, feedback: "Con $\\mathbb{R}$ como llegada sobran valores que nunca se alcanzan." },
            { answer: a > 0 ? [iv(k, Infinity)] : [iv(-Infinity, k)], feedback: `El valor $${k}$ sí se alcanza, en el vértice. El extremo va cerrado.` },
          ],
        },
      ],
      hints: [
        `El vértice está en $x = -\\frac{b}{2a}$. También puedes completar el cuadrado.`,
        "Para que sea sobreyectiva, el conjunto de llegada tiene que ser exactamente el rango del tramo escogido.",
      ],
      solution: [
        `$x_v = -\\frac{${-2 * a * h}}{2 \\cdot ${a === 1 ? 1 : "(-1)"}} = ${h}$. Completando el cuadrado, $f(x) = ${a < 0 ? "-" : ""}${sq(h)} ${k === 0 ? "" : signed(k)}$, con vértice $(${h}, ${k})$.`,
        `En $[${h}, +\\infty)$ la parábola ${a > 0 ? "crece" : "decrece"} sin volver atrás, así que es inyectiva.`,
        `Su rango en ese tramo es $${unionTex(B)}$. Con eso como llegada es sobreyectiva.`,
        `Definición: $f: [${h}, +\\infty) \\to ${unionTex(B)} \\;/\\; y = ${rule}$, biyectiva.`,
      ],
    };
  },
};

const porQueNoSobre: ExerciseGen = {
  id: "por-que-no-sobre",
  title: "¿Por qué no es sobreyectiva?",
  level: 2,
  generate: (r) => {
    const h = r.int(-3, 3);
    const k = r.int(-4, 4);
    const cases: { dom: string; rule: string; ran: Interval[]; y0: number; why: string }[] = [
      { dom: `[${h}, +\\infty)`, rule: `\\sqrt{${xMinus(h)}} ${k === 0 ? "" : signed(k)}`, ran: [iv(k, Infinity, true, false)], y0: k - 1, why: "una raíz cuadrada nunca es negativa" },
      { dom: "\\mathbb{R}", rule: `${sq(h)} ${k === 0 ? "" : signed(k)}`, ran: [iv(k, Infinity, true, false)], y0: k - 1, why: "un cuadrado nunca es negativo" },
      { dom: "\\mathbb{R}", rule: terms([[1, "e^{x}"], [k, ""]]), ran: [iv(k, Infinity)], y0: k, why: "$e^x$ nunca vale $0$ ni es negativo" },
      { dom: `\\mathbb{R} - \\{${h}\\}`, rule: `\\dfrac{1}{${xMinus(h)}}`, ran: minusPoints(R, [0]), y0: 0, why: "una fracción con numerador $1$ nunca vale $0$" },
    ];
    const c = r.pick(cases);
    return {
      statement: `Sea $f: ${c.dom} \\to \\mathbb{R} \\;/\\; y = ${c.rule}$.`,
      sequential: true,
      parts: [
        choice(
          `Porque el rango es $${unionTex(c.ran)}$, distinto del conjunto de llegada $\\mathbb{R}$. Por ejemplo, $y = ${c.y0}$ no tiene preimagen.`,
          [
            ["Porque no es inyectiva.", "Inyectiva y sobreyectiva son propiedades independientes. Una no decide la otra."],
            ["Porque hay valores de $x$ sin imagen.", "Con este dominio todo $x$ tiene imagen. Además eso tendría que ver con ser función, no con ser sobreyectiva."],
            ["Porque el dominio no es todo $\\mathbb{R}$.", "La sobreyectividad no mira el dominio. Compara el rango con el conjunto de llegada."],
          ],
          "¿Por qué $f$ no es sobreyectiva?",
        ),
        { kind: "interval", prompt: "¿Qué conjunto de llegada $B$ la haría sobreyectiva sin cambiar el dominio ni la regla?", before: "B =", answer: c.ran },
      ],
      hints: ["Halla el rango. ¿Coincide con el conjunto de llegada?"],
      solution: [
        `Como ${c.why}, el rango es $${unionTex(c.ran)}$.`,
        `El conjunto de llegada es $\\mathbb{R}$, y $y = ${c.y0}$ no es imagen de nadie. Por eso no es sobreyectiva.`,
        `Cambiando la llegada por $B = ${unionTex(c.ran)}$ queda sobreyectiva.`,
      ],
    };
  },
};

const biyectivaParcial: ExerciseGen = {
  id: "biyectiva-parcial",
  title: "Convertirla en biyectiva y definirla (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const abs = r.bool(0.35);
    const a = abs ? 1 : r.pick([1, 1, -1]);
    const h = r.int(-3, 3);
    const k = r.int(-4, 4);
    const rule = abs ? terms([[1, `|${xMinus(h)}|`], [k, ""]]) : poly([a, -2 * a * h, a * h * h + k]);
    const v = k + a;
    const yOut = a > 0 ? k - 1 : k + 1;
    const B: Interval[] = a > 0 ? [iv(k, Infinity, true, false)] : [iv(-Infinity, k, false, true)];
    return {
      statement: `Dada $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = ${rule}$, responde paso a paso.`,
      sequential: true,
      parts: [
        choice(
          `No, porque $f(${h - 1}) = f(${h + 1}) = ${v}$ con $${h - 1} \\ne ${h + 1}$.`,
          [
            ["Sí, porque cada $x$ tiene una sola imagen.", "Eso dice que $f$ es función. Inyectiva significa que dos $x$ distintos nunca comparten imagen."],
            [`No, porque $y = ${yOut}$ no tiene preimagen.`, "Ese argumento es sobre la sobreyectividad, no sobre la inyectividad."],
            ["Sí, porque es creciente.", "No es creciente en todo $\\mathbb{R}$: cambia de sentido en el vértice."],
          ],
          "¿Es $f$ inyectiva? Argumenta.",
        ),
        choice(
          `No, porque el rango es $${unionTex(B)}$ y, por ejemplo, $y = ${yOut}$ no es imagen de ningún $x$.`,
          [
            ["Sí, porque todo $x$ real tiene imagen.", "Eso es de la definición de función. Sobreyectiva se refiere a los elementos del conjunto de llegada."],
            ["No, porque no es inyectiva.", "Una cosa no implica la otra. Hay que comparar el rango con el conjunto de llegada."],
          ],
          "¿Es $f$ sobreyectiva? Argumenta.",
        ),
        {
          kind: "interval",
          prompt: "Manteniendo la regla, restringe el dominio al mayor intervalo a la derecha del vértice, incluyéndolo.",
          before: "A =",
          answer: [iv(h, Infinity, true, false)],
          mistakes: [
            { answer: [iv(h, Infinity)], feedback: `Incluye el vértice $x = ${h}$: sin él, el valor $${k}$ se queda sin preimagen.` },
            { answer: [iv(-Infinity, h, false, true)], feedback: "Ese tramo también serviría, pero se pidió el de la derecha." },
          ],
        },
        {
          kind: "interval",
          prompt: "Restringe el conjunto de llegada para que sea sobreyectiva.",
          before: "B =",
          answer: B,
          mistakes: [{ answer: R, feedback: "Con $\\mathbb{R}$ como llegada sigue sin ser sobreyectiva." }],
        },
      ],
      hints: [
        "Ubica el vértice. Los puntos a la misma distancia del vértice, a un lado y al otro, tienen la misma imagen.",
        "La restricción del dominio quita la mitad repetida. La del conjunto de llegada lo ajusta al rango.",
      ],
      solution: [
        abs
          ? `La gráfica es una V con vértice $(${h}, ${k})$.`
          : `Completando el cuadrado, $f(x) = ${a < 0 ? "-" : ""}${sq(h)} ${k === 0 ? "" : signed(k)}$. Es una parábola que abre hacia ${a > 0 ? "arriba" : "abajo"} con vértice $(${h}, ${k})$.`,
        `No es inyectiva: $f(${h - 1}) = f(${h + 1}) = ${v}$.`,
        `No es sobreyectiva: el rango es $${unionTex(B)}$ y $y = ${yOut}$ no tiene preimagen.`,
        `A la derecha del vértice la función es ${a > 0 ? "creciente" : "decreciente"}, así que con dominio $[${h}, +\\infty)$ es inyectiva. Su rango ahí sigue siendo $${unionTex(B)}$.`,
        `Definición: $f: [${h}, +\\infty) \\to ${unionTex(B)} \\;/\\; y = ${rule}$, biyectiva.`,
      ],
    };
  },
};

const valorAbsolutoParcial: ExerciseGen = {
  id: "valor-absoluto-parcial",
  title: "La función |x| − x (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const p = r.int(1, 4);
    const minus = r.bool();
    const rule = minus ? "|x| - x" : "|x| + x";
    const zeroSet: Interval[] = minus ? [iv(0, p, true, true)] : [iv(-p, 0, true, true)];
    const ran: Interval[] = [iv(0, 2 * p, true, true)];
    const injDom: Interval[] = minus ? [iv(-p, 0, true, true)] : [iv(0, p, true, true)];
    const other = minus ? p : -p;
    const graph: GraphSpec = {
      x: [-p - 1, p + 1],
      y: [-1, 2 * p + 1],
      curves: [{ fn: rule, domain: [-p, p], color: "accent" }],
      points: [
        { x: -p, y: minus ? 2 * p : 0, color: "accent" },
        { x: p, y: minus ? 0 : 2 * p, color: "accent" },
      ],
    };
    return {
      statement: `Dada la función $f: [${-p}, ${p}] \\to \\mathbb{R} \\;/\\; y = ${rule}$, cuya gráfica se muestra, responde paso a paso.`,
      graph,
      sequential: true,
      parts: [
        {
          kind: "interval",
          prompt: "¿Cuál es la preimagen de cero? Escríbela como intervalo.",
          before: "\\{x \\;/\\; f(x) = 0\\} =",
          answer: zeroSet,
          mistakes: [{ answer: [iv(0, 0, true, true)], feedback: `No solo el $0$. Prueba con $x = ${other}$: $f(${other}) = ${minus ? `${p} - ${p}` : `${p} + (${-p})`} = 0$.` }],
        },
        choice(
          `Porque $f(0) = f(${other}) = 0$, con $0 \\ne ${other}$.`,
          [
            ["Porque hay elementos del conjunto de llegada sin preimagen.", "Eso muestra que no es sobreyectiva, no que no sea inyectiva."],
            ["Porque tiene un valor absoluto.", "Hay funciones con valor absoluto que sí son inyectivas en ciertos dominios. Hay que dar dos $x$ concretos con la misma imagen."],
            [`Porque $f(${-p}) \\ne f(${p})$.`, "Que dos imágenes sean distintas no prueba nada. Hay que encontrar dos $x$ distintos con la misma imagen."],
          ],
          "Demuestra que $f$ no es inyectiva.",
        ),
        {
          kind: "interval",
          prompt: "Determina el rango de $f$.",
          before: "\\text{Ran } f =",
          answer: ran,
          mistakes: [{ answer: [iv(-p, p, true, true)], feedback: "Ese es el dominio. El rango se lee en el eje $y$." }],
        },
        choice(
          `Porque el rango es $[0, ${2 * p}]$ y el conjunto de llegada es $\\mathbb{R}$. Por ejemplo, $y = -1$ no tiene preimagen.`,
          [
            ["Porque no es inyectiva.", "Son propiedades independientes."],
            [`Porque el dominio es $[${-p}, ${p}]$ y no $\\mathbb{R}$.`, "La sobreyectividad compara rango y conjunto de llegada. El dominio no entra en esa comparación."],
          ],
          "Demuestra que $f$ no es sobreyectiva.",
        ),
        {
          kind: "interval",
          prompt: "Para que tenga inversa, restringe el dominio al mayor intervalo cerrado donde $f$ es inyectiva.",
          before: "A =",
          answer: injDom,
          mistakes: [{ answer: zeroSet, feedback: "Ahí $f$ vale $0$ en todos los puntos: es constante, lo menos inyectivo que hay." }],
        },
      ],
      hints: [
        "Separa en dos casos según el signo de $x$: si $x \\ge 0$, $|x| = x$, y si $x < 0$, $|x| = -x$.",
        minus ? "Para $x \\ge 0$ queda $f(x) = 0$, y para $x < 0$ queda $f(x) = -2x$." : "Para $x \\ge 0$ queda $f(x) = 2x$, y para $x < 0$ queda $f(x) = 0$.",
      ],
      solution: [
        minus
          ? `Si $x \\ge 0$: $f(x) = x - x = 0$. Si $x < 0$: $f(x) = -x - x = -2x$.`
          : `Si $x \\ge 0$: $f(x) = x + x = 2x$. Si $x < 0$: $f(x) = -x + x = 0$.`,
        `La preimagen de cero es $${unionTex(zeroSet)}$: todos esos $x$ comparten la imagen $0$. Por eso no es inyectiva, por ejemplo $f(0) = f(${other}) = 0$.`,
        `El rango es $[0, ${2 * p}]$, que no es todo $\\mathbb{R}$. No es sobreyectiva.`,
        `En $${unionTex(injDom)}$ la regla es $y = ${minus ? "-2x" : "2x"}$, que es inyectiva. Restringiendo también la llegada: $f: ${unionTex(injDom)} \\to [0, ${2 * p}] \\;/\\; y = ${rule}$ es biyectiva y tiene inversa.`,
      ],
    };
  },
};

const inyectivaRaiz: ExerciseGen = {
  id: "inyectiva-raiz",
  title: "¿En qué caso es inyectiva? (tipo prueba corta)",
  level: 3,
  exam: true,
  generate: (r) => {
    const menos = r.bool(0.6);
    const a = r.int(1, 5);
    const rule = menos ? `\\sqrt{x^2 - ${a * a}}` : `\\sqrt{x^2 + ${a * a}}`;
    const dom: Interval[] = menos ? [iv(-Infinity, -a, false, true), iv(a, Infinity, true, false)] : R;
    const x0 = menos ? a + r.int(1, 4) : r.int(1, 5);
    const right = menos ? `[${a}, +\\infty)` : "[0, +\\infty)";
    const left = menos ? `(-\\infty, ${-a}]` : "(-\\infty, 0]";
    return {
      statement: `Sea $f: A \\subseteq \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = ${rule}$, con $A$ su dominio natural.`,
      sequential: true,
      parts: [
        {
          kind: "interval",
          prompt: "Halla el dominio $A$.",
          before: "A =",
          answer: dom,
          mistakes: menos ? [{ answer: [iv(-a, a, true, true)], feedback: "Esa es la zona donde el radicando es negativo. Hay que tomar la contraria." }] : [],
        },
        { kind: "expr", prompt: `¿Qué otro valor de $x$ tiene la misma imagen que $x = ${x0}$?`, before: "x =", answer: String(-x0), maxOps: 0 },
        choice(
          `Si se restringe el dominio a $${right}$, o a $${left}$.`,
          [
            ["Si se restringe el conjunto de llegada a $[0, +\\infty)$.", "Eso la hace sobreyectiva, no inyectiva. La inyectividad se arregla quitando $x$ del dominio."],
            ["Nunca, porque tiene una raíz cuadrada.", `En $${right}$ la función crece siempre, así que sí es inyectiva ahí.`],
            ["Si el dominio es todo $\\mathbb{R}$.", menos ? `Con $\\mathbb{R}$ ni siquiera sería función: los $x$ entre $${-a}$ y $${a}$ no tienen imagen.` : `En $\\mathbb{R}$ sigue pasando que $f(${-x0}) = f(${x0})$.`],
          ],
          "¿En qué caso $f$ es inyectiva? Razona tu respuesta.",
        ),
      ],
      hints: [
        menos ? `El radicando $x^2 - ${a * a}$ tiene que ser $\\ge 0$.` : `El radicando $x^2 + ${a * a}$ es siempre positivo.`,
        "Como $x$ aparece al cuadrado, $f(-x) = f(x)$. Eso rompe la inyectividad.",
      ],
      solution: [
        menos ? `$x^2 - ${a * a} \\ge 0$ da $x \\le ${-a}$ o $x \\ge ${a}$. $A = ${unionTex(dom)}$.` : `$x^2 + ${a * a} > 0$ siempre, así que $A = \\mathbb{R}$.`,
        `Como $(-x)^2 = x^2$, $f(${-x0}) = f(${x0})$. No es inyectiva en $A$.`,
        `Para evitarlo hay que quedarse con un solo signo de $x$. En $${right}$ la función es creciente y por lo tanto inyectiva. Lo mismo en $${left}$, donde es decreciente.`,
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("clasificacion-funciones"),
  objectives: [
    "Decidir si una función es inyectiva con la prueba de la recta horizontal y con $f(a) = f(b) \\Rightarrow a = b$.",
    "Decidir si es sobreyectiva comparando el rango con el conjunto de llegada.",
    "Reconocer las funciones biyectivas.",
    "Restringir dominio y conjunto de llegada, sin cambiar la regla, para obtener una biyección y definirla.",
  ],
  sections: [
    {
      id: "idea",
      title: "Tres preguntas sobre las flechas",
      blocks: [
        {
          type: "text",
          md: "Ya sabes que en una función de cada elemento de $A$ sale exactamente una flecha. Ahora la atención pasa al conjunto de llegada $B$, y hay dos preguntas nuevas:\n\n- ¿Algún elemento de $B$ recibe **dos o más** flechas? Si nunca pasa, la función es **inyectiva**.\n- ¿Algún elemento de $B$ se queda **sin** flecha? Si nunca pasa, la función es **sobreyectiva**.\n\nSi se cumplen las dos cosas, cada elemento de $B$ recibe exactamente una flecha, y la función es **biyectiva**.",
        },
        { type: "widget", widget: { kind: "mapping", domain: ["1", "2", "3"], codomain: ["a", "b", "c", "d"], arrows: [[0, 0], [1, 2], [2, 3]] }, caption: "Inyectiva, no sobreyectiva: nadie comparte imagen, pero la $b$ queda libre." },
        { type: "widget", widget: { kind: "mapping", domain: ["1", "2", "3", "4"], codomain: ["a", "b", "c"], arrows: [[0, 0], [1, 1], [2, 2], [3, 2]] }, caption: "Sobreyectiva, no inyectiva: todo $B$ se usa, pero $3$ y $4$ comparten la $c$." },
        { type: "widget", widget: { kind: "mapping", domain: ["1", "2", "3"], codomain: ["a", "b", "c"], arrows: [[0, 1], [1, 2], [2, 0]] }, caption: "Biyectiva: cada elemento de $B$ recibe exactamente una flecha." },
        {
          type: "text",
          md: "Arma tus propios ejemplos en el diagrama de abajo y mira cómo cambia la clasificación.",
        },
        { type: "widget", widget: { kind: "mapping", domain: ["1", "2", "3"], codomain: ["a", "b", "c"], arrows: [], editable: true } },
        {
          type: "quick",
          exercise: {
            statement: "Sea $f: \\{1, 2, 3\\} \\to \\{a, b\\}$ con $f = \\{(1, a), (2, b), (3, a)\\}$. ¿Es inyectiva?",
            parts: [trueFalse(false, "El $1$ y el $3$ tienen la misma imagen, $a$.")],
            solution: ["$f(1) = f(3) = a$ con $1 \\ne 3$. No es inyectiva. Sí es sobreyectiva, porque $a$ y $b$ se usan."],
          },
        },
      ],
    },
    {
      id: "inyectiva",
      title: "Funciones inyectivas",
      blocks: [
        {
          type: "definition",
          title: "Inyectiva",
          md: "$f: A \\to B$ es inyectiva si elementos distintos del dominio tienen imágenes distintas:\n\n$$\\forall a, b \\in A: \\; a \\ne b \\Rightarrow f(a) \\ne f(b)$$\n\nLa forma equivalente, que es la que se usa para demostrar:\n\n$$\\forall a, b \\in A: \\; f(a) = f(b) \\Rightarrow a = b$$",
        },
        {
          type: "text",
          md: "En la gráfica, dos $x$ con la misma imagen son dos puntos a la misma altura. Una recta horizontal los junta. De ahí sale una prueba visual.",
        },
        {
          type: "definition",
          title: "Prueba de la recta horizontal",
          md: "Una función es inyectiva si y solo si **ninguna recta horizontal corta su gráfica en más de un punto**.",
        },
        {
          type: "graph",
          spec: {
            x: [-4, 4],
            y: [-1, 7],
            curves: [{ fn: "x^2", color: "accent", label: "y = x²" }],
            hlines: [{ y: 4, color: "red", dashed: true, label: "y = 4" }],
            points: [{ x: -2, y: 4, color: "red", label: "(−2, 4)" }, { x: 2, y: 4, color: "red", label: "(2, 4)" }],
          },
          caption: "$f(x) = x^2$ no es inyectiva en $\\mathbb{R}$: la recta $y = 4$ la corta en $x = -2$ y en $x = 2$.",
        },
        {
          type: "example",
          title: "Demostrar que sí es inyectiva",
          problem: "Demuestra que $f: \\mathbb{R} - \\{3\\} \\to \\mathbb{R} \\;/\\; y = \\dfrac{2x + 1}{x - 3}$ es inyectiva.",
          steps: [
            "Partimos de $f(a) = f(b)$: $\\dfrac{2a + 1}{a - 3} = \\dfrac{2b + 1}{b - 3}$.",
            "Multiplicamos en cruz: $(2a + 1)(b - 3) = (2b + 1)(a - 3)$.",
            "Desarrollamos: $2ab - 6a + b - 3 = 2ab - 6b + a - 3$.",
            "Cancelamos $2ab$ y $-3$: $-6a + b = -6b + a$, es decir $7b = 7a$.",
            "Entonces $a = b$.",
          ],
          answer: "Como $f(a) = f(b)$ obliga a $a = b$, la función es inyectiva.",
        },
        {
          type: "example",
          title: "Demostrar que no es inyectiva",
          problem: "Demuestra que $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = x^2 - 4x$ no es inyectiva.",
          steps: [
            "Basta un contraejemplo: dos $x$ distintos con la misma imagen.",
            "$f(0) = 0$ y $f(4) = 16 - 16 = 0$.",
          ],
          answer: "$f(0) = f(4)$ con $0 \\ne 4$. No es inyectiva.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Ejemplos sí, pero solo para negar",
          md: "Un contraejemplo alcanza para probar que una función **no** es inyectiva. Para probar que **sí** lo es no basta con probar algunos números: hace falta el argumento general con $a$ y $b$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Para $f(x) = (x - 1)^2$, ¿qué otro $x$ tiene la misma imagen que $x = 4$?",
            parts: [{ kind: "expr", before: "x =", answer: "-2", maxOps: 0, mistakes: [{ answer: "-4", feedback: "$f(-4) = 25$ y $f(4) = 9$. La simetría es respecto de $x = 1$, no de $x = 0$." }] }],
            solution: ["$f(4) = 9$. $(x - 1)^2 = 9$ da $x - 1 = \\pm 3$, es decir $x = 4$ o $x = -2$."],
          },
        },
      ],
    },
    {
      id: "sobreyectiva",
      title: "Funciones sobreyectivas",
      blocks: [
        {
          type: "definition",
          title: "Sobreyectiva",
          md: "$f: A \\to B$ es sobreyectiva si todo elemento del conjunto de llegada es imagen de algún elemento del dominio:\n\n$$\\forall y \\in B, \\; \\exists x \\in A: \\; y = f(x)$$\n\nDicho de otra forma, $f$ es sobreyectiva si y solo si $\\text{Ran } f = B$.",
        },
        {
          type: "text",
          md: "Aquí está el detalle que más se olvida: la sobreyectividad depende del conjunto de llegada que escribas en la definición. La misma regla puede ser sobreyectiva o no según lo que pongas a la derecha de la flecha.",
        },
        {
          type: "example",
          title: "La misma regla, dos respuestas",
          problem: "¿Son sobreyectivas $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = x^2$ y $g: \\mathbb{R} \\to [0, +\\infty) \\;/\\; y = x^2$?",
          steps: [
            "Las dos tienen rango $[0, +\\infty)$, porque un cuadrado nunca es negativo y toma todos los valores no negativos.",
            "Para $f$ el conjunto de llegada es $\\mathbb{R}$. El $-1$ no es imagen de nadie. No es sobreyectiva.",
            "Para $g$ el conjunto de llegada es $[0, +\\infty)$, igual al rango. Sí es sobreyectiva.",
          ],
        },
        {
          type: "note",
          tone: "tip",
          title: "Cómo se argumenta en el parcial",
          md: "Para decir que no es sobreyectiva, da el rango y nombra un elemento del conjunto de llegada que se queda fuera: \"el rango es $[0, +\\infty)$, así que $y = -1 \\in \\mathbb{R}$ no tiene preimagen\".",
        },
        {
          type: "note",
          tone: "econ",
          title: "Precios que nunca se ven",
          md: "Si una función de costo es $C: [0, +\\infty) \\to \\mathbb{R} \\;/\\; C(q) = 500 + 20q$, ningún nivel de producción da un costo menor que $500$, el costo fijo. Como función de $[0, +\\infty)$ en $\\mathbb{R}$ no es sobreyectiva. Con llegada $[500, +\\infty)$ sí lo es.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Es sobreyectiva $f: \\mathbb{R} \\to (0, +\\infty) \\;/\\; y = e^x$?",
            parts: [trueFalse(true, "$e^x$ toma todos los valores positivos: para cada $y > 0$, $x = \\ln y$ cumple $e^x = y$.")],
            solution: ["El rango de $e^x$ es $(0, +\\infty)$, igual al conjunto de llegada. Es sobreyectiva."],
          },
        },
      ],
    },
    {
      id: "biyectiva",
      title: "Funciones biyectivas",
      blocks: [
        {
          type: "definition",
          title: "Biyectiva",
          md: "$f: A \\to B$ es biyectiva si es inyectiva y sobreyectiva a la vez. Cada elemento de $B$ es imagen de **exactamente un** elemento de $A$.",
        },
        {
          type: "text",
          md: "Las biyecciones son importantes porque son justamente las funciones que tienen inversa. Si cada $y$ viene de un único $x$, se puede recorrer el camino al revés sin ambigüedad.",
        },
        {
          type: "table",
          headers: ["Función de $\\mathbb{R}$ en $\\mathbb{R}$", "¿Inyectiva?", "¿Sobreyectiva?", "Clasificación"],
          rows: [
            ["$y = 2x + 1$", "Sí", "Sí", "Biyectiva"],
            ["$y = x^3$", "Sí", "Sí", "Biyectiva"],
            ["$y = x^2$", "No: $f(-1) = f(1)$", "No: rango $[0, +\\infty)$", "Ninguna"],
            ["$y = e^x$", "Sí", "No: rango $(0, +\\infty)$", "Solo inyectiva"],
            ["$y = x^3 - x$", "No: $f(0) = f(1)$", "Sí", "Solo sobreyectiva"],
            ["$y = |x|$", "No: $f(-2) = f(2)$", "No: rango $[0, +\\infty)$", "Ninguna"],
          ],
        },
        {
          type: "quick",
          exercise: {
            statement: "Clasifica $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = 5 - 3x$.",
            parts: [
              classify(
                true,
                true,
                "Sí es inyectiva: $5 - 3a = 5 - 3b$ obliga a $a = b$.",
                "Sí es sobreyectiva: cualquier $y$ es imagen de $x = \\frac{5 - y}{3}$.",
              ),
            ],
            solution: ["Toda función lineal con pendiente distinta de cero es biyectiva de $\\mathbb{R}$ en $\\mathbb{R}$."],
          },
        },
      ],
    },
    {
      id: "restringir",
      title: "Restringir para obtener una biyección",
      blocks: [
        {
          type: "text",
          md: "En el parcial se pide: \"manteniendo la regla de correspondencia, haz las restricciones necesarias para convertirla en biyectiva y defínela\". La regla no se toca. Lo que se cambia es el dominio y el conjunto de llegada.\n\n- **Para la inyectividad** se recorta el dominio a un tramo donde la gráfica solo sube o solo baja. Así ninguna recta horizontal la corta dos veces.\n- **Para la sobreyectividad** se cambia el conjunto de llegada por el rango de ese tramo.",
        },
        {
          type: "example",
          title: "Una parábola",
          problem: "Convierte en biyectiva $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = x^2 - 4x + 1$ y defínela.",
          steps: [
            "Completamos el cuadrado: $x^2 - 4x + 1 = (x - 2)^2 - 3$. Vértice $(2, -3)$, abre hacia arriba.",
            "No es inyectiva: $f(1) = f(3) = -2$. No es sobreyectiva: el rango es $[-3, +\\infty)$.",
            "A la derecha del vértice la parábola solo sube. Tomamos el dominio $[2, +\\infty)$.",
            "En ese tramo el rango es $[-3, +\\infty)$. Lo ponemos como conjunto de llegada.",
          ],
          answer: "$f: [2, +\\infty) \\to [-3, +\\infty) \\;/\\; y = x^2 - 4x + 1$ es biyectiva. También vale $(-\\infty, 2]$ como dominio.",
        },
        {
          type: "graph",
          spec: {
            x: [-2, 6],
            y: [-4, 5],
            curves: [
              { fn: "x^2 - 4x + 1", domain: [-2, 2], color: "muted", dashed: true },
              { fn: "x^2 - 4x + 1", domain: [2, 6], color: "accent" },
            ],
            points: [{ x: 2, y: -3, color: "accent", label: "(2, −3)" }],
          },
          caption: "La rama de la derecha, desde el vértice, sí pasa la prueba de la recta horizontal.",
        },
        {
          type: "example",
          title: "Un caso de parcial: |x| − x",
          problem: "Sea $f: [-2, 2] \\to \\mathbb{R} \\;/\\; y = |x| - x$. ¿Cuál es la preimagen de cero? Demuestra que no es inyectiva ni sobreyectiva y restríngela para que sea biyectiva.",
          steps: [
            "Separamos por el signo de $x$. Si $x \\ge 0$, $|x| = x$ y $f(x) = 0$. Si $x < 0$, $|x| = -x$ y $f(x) = -2x$.",
            "Preimagen de cero: todo el intervalo $[0, 2]$.",
            "No es inyectiva: $f(0) = f(1) = 0$. No es sobreyectiva: el rango es $[0, 4]$ y el conjunto de llegada es $\\mathbb{R}$.",
            "En $[-2, 0]$ la regla equivale a $y = -2x$, que es inyectiva. Su rango ahí es $[0, 4]$.",
          ],
          answer: "$f: [-2, 0] \\to [0, 4] \\;/\\; y = |x| - x$ es biyectiva.",
        },
        {
          type: "graph",
          spec: {
            x: [-3, 3],
            y: [-1, 5],
            curves: [{ fn: "|x| - x", domain: [-2, 2], color: "accent" }],
            points: [{ x: -2, y: 4, color: "accent" }, { x: 2, y: 0, color: "accent" }],
          },
          caption: "$y = |x| - x$ en $[-2, 2]$: plana a la derecha del cero, recta de pendiente $-2$ a la izquierda.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Escribe la definición completa",
          md: "La respuesta no es solo \"$x \\ge 2$\". Hay que escribir la función con su nuevo dominio, su nuevo conjunto de llegada y la regla sin cambios: $f: A \\to B \\;/\\; y = f(x)$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Sea $f: [0, +\\infty) \\to B \\;/\\; y = x^2 + 2$. ¿Qué conjunto $B$ la hace biyectiva?",
            parts: [{ kind: "interval", before: "B =", answer: [iv(2, Infinity, true, false)], mistakes: [{ answer: R, feedback: "Con $\\mathbb{R}$ los valores menores que $2$ quedan sin preimagen." }] }],
            solution: ["En $[0, +\\infty)$ la función es creciente, así que es inyectiva. Su rango es $[2, +\\infty)$, que debe ser $B$."],
          },
        },
      ],
    },
  ],
  exercises: [
    clasificarDiagrama,
    rectaHorizontal,
    contraejemplo,
    sobreVF,
    clasificarReal,
    inyectivaAlgebraica,
    restringirCuadratica,
    porQueNoSobre,
    biyectivaParcial,
    valorAbsolutoParcial,
    inyectivaRaiz,
  ],
};

export default topic;
