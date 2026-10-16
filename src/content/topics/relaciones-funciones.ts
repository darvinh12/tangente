import { meta } from "../catalog";
import { choice, trueFalse } from "../helpers";
import type { ExerciseGen, GraphSpec, Part, Rich, Topic } from "../types";
import { iv, minusPoints, R, unionTex, type Interval } from "@/lib/math/intervals";
import { frac, paren, poly, signed, terms } from "@/lib/math/tex";
import type { Rng } from "@/lib/math/rng";

/* ----------------------------- utilidades locales ----------------------------- */

type El = number | string;

const setTex = (xs: El[]) => (xs.length ? `\\{${xs.join(", ")}\\}` : "\\varnothing");
const sortNum = (xs: number[]) => [...xs].sort((a, b) => a - b);
const uniqSorted = (xs: number[]) => sortNum([...new Set(xs)]);
const pairsTex = (ps: [El, El][]) => (ps.length ? `\\{${ps.map(([a, b]) => `(${a}, ${b})`).join(", ")}\\}` : "\\varnothing");
const sameSet = (a: El[], b: El[]) => a.length === b.length && a.every((x) => b.includes(x));

/** Opción múltiple con varias respuestas correctas. */
function multi(options: { label: Rich; correct?: boolean; feedback?: Rich }[], prompt?: Rich): Part {
  return { kind: "choice", multiple: true, prompt, options };
}

/** Gráficas pequeñas para opciones. */
function small(spec: Omit<GraphSpec, "x" | "y" | "height">): GraphSpec {
  return { x: [-5, 5], y: [-5, 5], height: 200, ...spec };
}

/** x - a escrito limpio. */
function xMinus(a: number) {
  return a === 0 ? "x" : a > 0 ? `x - ${a}` : `x + ${-a}`;
}

/* ----------------------------------- ejercicios ----------------------------------- */

const productoCartesiano: ExerciseGen = {
  id: "producto-cartesiano",
  title: "Producto cartesiano",
  level: 1,
  generate: (r) => {
    const A = sortNum(r.sample([1, 2, 3, 4, 5, 6], r.int(2, 3)));
    const B = r.sample(["a", "b", "c", "d"], r.int(2, 3)).sort();
    const x = r.pick(A);
    const y = r.pick(B);
    const outside = r.pick([1, 2, 3, 4, 5, 6, 7, 8].filter((n) => !A.includes(n)));
    const all: [El, El][] = A.flatMap((a) => B.map((b) => [a, b] as [El, El]));
    return {
      statement: `Sean $A = ${setTex(A)}$ y $B = ${setTex(B)}$.`,
      parts: [
        {
          kind: "expr",
          prompt: "¿Cuántos pares ordenados tiene $A \\times B$?",
          answer: String(A.length * B.length),
          maxOps: 0,
          mistakes:
            A.length + B.length === A.length * B.length
              ? []
              : [{ answer: String(A.length + B.length), feedback: "Sumaste las cantidades. Cada elemento de $A$ se combina con cada elemento de $B$, así que se multiplican." }],
        },
        choice(
          `$(${x}, ${y})$`,
          [
            [`$(${y}, ${x})$`, "El orden importa. En $A \\times B$ la primera componente sale de $A$ y la segunda de $B$."],
            [`$(${outside}, ${y})$`, `La primera componente tiene que estar en $A$, y $${outside} \\notin A$.`],
            [`$(${x}, ${r.pick(A.filter((a) => a !== x).length ? A.filter((a) => a !== x) : A)})$`, "La segunda componente tiene que estar en $B$, y aquí pusiste un número de $A$."],
          ],
          "¿Cuál de estos pares pertenece a $A \\times B$?",
        ),
      ],
      hints: [
        "$A \\times B$ son todos los pares $(x, y)$ con $x$ en $A$ y $y$ en $B$, en ese orden.",
        "Si $A$ tiene $m$ elementos y $B$ tiene $n$, el producto tiene $m \\cdot n$ pares.",
      ],
      solution: [
        `Combinamos cada elemento de $A$ con cada elemento de $B$: $A \\times B = ${pairsTex(all)}$.`,
        `Son $${A.length} \\cdot ${B.length} = ${A.length * B.length}$ pares.`,
        `El par $(${x}, ${y})$ pertenece porque $${x} \\in A$ y $${y} \\in B$.`,
      ],
    };
  },
};

type Cond = { tex: string; test: (x: number, y: number) => boolean };

function randomRelation(r: Rng, minPairs = 2) {
  let A: number[], B: number[], cond: Cond, pairs: [number, number][];
  do {
    A = sortNum(r.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], r.int(3, 4)));
    B = sortNum(r.sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], r.int(3, 4)));
    const k = r.int(1, 3);
    const s = r.int(7, 11);
    cond = r.pick<Cond>([
      { tex: "x < y", test: (x, y) => x < y },
      { tex: "x > y", test: (x, y) => x > y },
      { tex: `y = x + ${k}`, test: (x, y) => y === x + k },
      { tex: `x + y = ${s}`, test: (x, y) => x + y === s },
      { tex: "x + y \\text{ es par}", test: (x, y) => (x + y) % 2 === 0 },
    ]);
    pairs = A.flatMap((x) => B.filter((y) => cond.test(x, y)).map((y) => [x, y] as [number, number]));
  } while (pairs.length < minPairs);
  const dom = uniqSorted(pairs.map((p) => p[0]));
  const ran = uniqSorted(pairs.map((p) => p[1]));
  return { A, B, cond, pairs, dom, ran };
}

const relacionDominioRango: ExerciseGen = {
  id: "relacion-dominio-rango",
  title: "Dominio y rango de una relación",
  level: 1,
  generate: (r) => {
    const { A, B, cond, pairs, dom, ran } = randomRelation(r);
    return {
      statement: `Sean $A = ${setTex(A)}$, $B = ${setTex(B)}$ y la relación $R = \\{(x, y) \\in A \\times B \\;/\\; ${cond.tex}\\}$.`,
      parts: [
        {
          kind: "set",
          prompt: "Escribe el dominio de $R$.",
          before: "\\text{Dom } R =",
          answer: dom,
          mistakes: sameSet(dom, A) ? [] : [{ answer: A, feedback: "Ese es el conjunto de partida completo. El dominio solo tiene los $x$ que aparecen como primera componente de algún par de $R$." }],
        },
        {
          kind: "set",
          prompt: "Escribe el rango de $R$.",
          before: "\\text{Ran } R =",
          answer: ran,
          mistakes: sameSet(ran, B) ? [] : [{ answer: B, feedback: "Ese es el conjunto de llegada completo. El rango solo tiene los $y$ que aparecen como segunda componente de algún par." }],
        },
      ],
      hints: [
        "Primero escribe $R$ por extensión: revisa cada par de $A \\times B$ y quédate con los que cumplen la condición.",
        "El dominio son las primeras componentes de esos pares y el rango las segundas.",
      ],
      solution: [
        `Revisando los pares de $A \\times B$ que cumplen $${cond.tex}$: $R = ${pairsTex(pairs)}$.`,
        `Primeras componentes: $\\text{Dom } R = ${setTex(dom)}$.`,
        `Segundas componentes: $\\text{Ran } R = ${setTex(ran)}$.`,
      ],
    };
  },
};

const esFuncionPares: ExerciseGen = {
  id: "es-funcion-pares",
  title: "¿Es función? A partir de los pares",
  level: 1,
  generate: (r) => {
    const A = sortNum(r.sample([1, 2, 3, 4, 5, 6, 7], r.int(3, 4)));
    const B = r.sample(["a", "b", "c", "d", "e"], r.int(3, 4)).sort();
    const kind = r.pick(["ok", "ok", "missing", "double"] as const);
    let pairs: [El, El][] = A.map((x) => [x, r.pick(B)] as [El, El]);
    const special = r.pick(A);
    if (kind === "missing") pairs = pairs.filter((p) => p[0] !== special);
    if (kind === "double") {
      const first = pairs.find((p) => p[0] === special)!;
      pairs.push([special, r.pick(B.filter((b) => b !== first[1]))]);
    }
    pairs = r.shuffle(pairs);
    const Lok = "Sí es función: cada elemento de $A$ tiene exactamente una imagen.";
    const Lmiss = "No es función: hay un elemento de $A$ que no tiene imagen.";
    const Ldouble = "No es función: hay un elemento de $A$ con dos imágenes.";
    const Lshare = "No es función: dos elementos de $A$ tienen la misma imagen.";
    const Lfree = "No es función: hay elementos de $B$ que no son imagen de nadie.";
    const fb: Record<string, Rich> = {
      [Lok]:
        kind === "missing"
          ? `Falla la primera condición: el $${special}$ no aparece como primera componente de ningún par.`
          : `Falla la segunda condición: el $${special}$ aparece en dos pares con segundas componentes distintas.`,
      [Lmiss]: kind === "double" ? "Todos los elementos de $A$ tienen imagen. El problema es otro." : "Revisa: todos los elementos de $A$ aparecen como primera componente.",
      [Ldouble]: kind === "missing" ? "Ningún elemento aparece dos veces. El problema es otro." : "Revisa: cada elemento de $A$ aparece en un solo par.",
      [Lshare]: "Eso está permitido. Dos elementos de $A$ pueden ir al mismo elemento de $B$.",
      [Lfree]: "Eso no afecta. La definición de función solo pone condiciones sobre los elementos de $A$.",
    };
    const correct = kind === "ok" ? Lok : kind === "missing" ? Lmiss : Ldouble;
    const wrong = [Lok, Lmiss, Ldouble, Lshare, Lfree].filter((l) => l !== correct).map((l) => [l, fb[l]] as [Rich, Rich]);
    return {
      statement: `Sean $A = ${setTex(A)}$, $B = ${setTex(B)}$ y la relación $f = ${pairsTex(pairs)}$ de $A$ en $B$. ¿Es $f$ una función de $A$ en $B$?`,
      parts: [choice(correct, wrong)],
      hints: [
        "Revisa los elementos de $A$ uno por uno. ¿Aparece cada uno como primera componente? ¿Aparece una sola vez?",
      ],
      solution: [
        "Para ser función, cada elemento de $A$ debe aparecer exactamente una vez como primera componente.",
        kind === "ok"
          ? "Eso se cumple: todos los elementos de $A$ aparecen y ninguno se repite. Que dos compartan imagen o que sobren elementos en $B$ no importa."
          : kind === "missing"
            ? `El $${special}$ no aparece en ningún par, así que no tiene imagen. No es función.`
            : `El $${special}$ aparece en dos pares con imágenes distintas. No es función.`,
      ],
    };
  },
};

const calcularImagen: ExerciseGen = {
  id: "calcular-imagen",
  title: "Calcular una imagen",
  level: 1,
  generate: (r) => {
    const linear = r.bool(0.3);
    const a = linear ? 0 : r.nz(-3, 3);
    const b = linear ? r.nz(-5, 5) : r.int(-5, 5);
    const c = r.int(-6, 6);
    const x0 = r.nz(-4, 4);
    const val = a * x0 * x0 + b * x0 + c;
    const wrongSq = -a * x0 * x0 + b * x0 + c;
    const pieces = terms([
      [a * x0 * x0, ""],
      [b * x0, ""],
      [c, ""],
    ]);
    return {
      statement: `Sea $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = f(x) = ${poly([a, b, c])}$. Calcula la imagen de $x = ${x0}$.`,
      parts: [
        {
          kind: "expr",
          before: `f(${x0}) =`,
          answer: String(val),
          maxOps: 0,
          mistakes:
            !linear && x0 < 0 && wrongSq !== val
              ? [{ answer: String(wrongSq), feedback: `Cuidado con el signo: $(${x0})^2 = ${x0 * x0}$, positivo. El cuadrado de un negativo es positivo.` }]
              : [],
        },
      ],
      hints: [
        `Cambia cada $x$ de la regla por $(${x0})$, con paréntesis.`,
        "Resuelve primero las potencias, después las multiplicaciones y al final las sumas.",
      ],
      solution: [
        linear
          ? `$f(${x0}) = ${b}\\cdot${paren(x0)} ${signed(c)}$.`
          : `$f(${x0}) = ${a}\\cdot ${paren(x0)}^2${b === 0 ? "" : `${signed(b)}\\cdot${paren(x0)}`} ${c === 0 ? "" : signed(c)}$.`,
        `$f(${x0}) = ${pieces} = ${val}$.`,
        `La imagen de $${x0}$ es $${val}$, y el punto $(${x0}, ${val})$ está en la gráfica de $f$.`,
      ],
    };
  },
};

const rectaVertical: ExerciseGen = {
  id: "recta-vertical",
  title: "Prueba de la recta vertical",
  level: 1,
  generate: (r) => {
    const a = r.int(1, 3);
    const goods: { g: GraphSpec; why: string }[] = [
      { g: small({ curves: [{ fn: `x^2 - ${a}`, color: "accent" }] }), why: "parábola que abre hacia arriba" },
      { g: small({ curves: [{ fn: `|${xMinus(a - 2)}|`, color: "accent" }] }), why: "gráfica de un valor absoluto" },
      { g: small({ curves: [{ fn: `\\frac{x^3}{${a + 3}}`, color: "accent" }] }), why: "cúbica" },
      { g: small({ curves: [{ fn: `\\sqrt{x + ${a}}`, color: "accent", domain: [-a, 5] }], points: [{ x: -a, y: 0, color: "accent" }] }), why: "media parábola acostada, solo la rama de arriba" },
    ];
    const rad = r.int(2, 4);
    const nonFns: [GraphSpec, Rich][] = [
      [
        small({ curves: [{ fn: `\\sqrt{${rad * rad} - x^2}`, color: "accent", domain: [-rad, rad] }, { fn: `-\\sqrt{${rad * rad} - x^2}`, color: "accent", domain: [-rad, rad] }] }),
        `Es una circunferencia. La recta vertical $x = 0$ la corta en $(0, ${rad})$ y en $(0, -${rad})$: el $0$ tendría dos imágenes.`,
      ],
      [
        small({ curves: [{ fn: `\\sqrt{x + ${a}}`, color: "accent", domain: [-a, 5] }, { fn: `-\\sqrt{x + ${a}}`, color: "accent", domain: [-a, 5] }] }),
        `Es una parábola acostada. La recta vertical $x = ${4 - a}$ la corta en $(${4 - a}, 2)$ y en $(${4 - a}, -2)$.`,
      ],
      [
        small({ segments: [{ from: [a - 2, -6], to: [a - 2, 6], color: "accent" }] }),
        `Es la recta vertical $x = ${a - 2}$. Al $${a - 2}$ le corresponden infinitos valores de $y$, y los demás $x$ no tienen ninguno.`,
      ],
    ];
    const findNon = r.bool();
    type Opt = { g: GraphSpec; correct: boolean; fb?: Rich };
    let opts: Opt[];
    let explain: string;
    if (!findNon) {
      const good = r.pick(goods);
      opts = [{ g: good.g, correct: true }, ...nonFns.map(([g, fb]) => ({ g, correct: false, fb }))];
      explain = `es una ${good.why}: cada recta vertical la corta a lo sumo una vez. Las otras fallan.`;
    } else {
      const [bad, why] = r.pick(nonFns);
      opts = [
        { g: bad, correct: true },
        ...r.sample(goods, 3).map((x) => ({ g: x.g, correct: false, fb: `Esta es una ${x.why}. Ninguna recta vertical la corta dos veces, así que sí es función.` })),
      ];
      explain = `no es función. ${why}`;
    }
    opts = r.shuffle(opts);
    const letters = ["A", "B", "C", "D"];
    const correctLetter = letters[opts.findIndex((o) => o.correct)];
    return {
      statement: findNon
        ? "¿Cuál de estas curvas **no** es la gráfica de una función $y = f(x)$?"
        : r.pick(["¿Cuál de estas gráficas representa una función $y = f(x)$?", "¿Cuál de estas curvas pasa la prueba de la recta vertical?"]),
      parts: [
        {
          kind: "choice",
          shuffle: false,
          options: opts.map((o, i) => ({ label: `Gráfica ${letters[i]}`, correct: o.correct || undefined, feedback: o.fb, graph: o.g })),
        },
      ],
      hints: ["Imagina una recta vertical que recorre el plano de izquierda a derecha. Si en algún momento corta la curva en dos puntos o más, no es función."],
      solution: [
        "Una curva es gráfica de una función cuando ninguna recta vertical la corta en más de un punto.",
        `La gráfica ${correctLetter} ${explain}`,
      ],
    };
  },
};

const preimagen: ExerciseGen = {
  id: "preimagen",
  title: "Hallar preimágenes",
  level: 2,
  generate: (r) => {
    const linear = r.bool(0.3);
    if (linear) {
      const m = r.nz(-4, 4, [1]);
      const n = r.int(-6, 6);
      const t = r.int(-5, 5);
      const k = m * t + n;
      const img = m * k + n;
      return {
        statement: `Sea $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = ${terms([[m, "x"], [n, ""]])}$. Halla el conjunto de preimágenes de $y = ${k}$.`,
        parts: [
          {
            kind: "set",
            before: `\\{x \\;/\\; f(x) = ${k}\\} =`,
            answer: [t],
            mistakes: img !== t ? [{ answer: [img], feedback: `Calculaste $f(${k})$, la imagen de $${k}$. Lo que se pide es al revés: los $x$ cuya imagen es $${k}$.` }] : [],
          },
        ],
        hints: [`Plantea la ecuación $${terms([[m, "x"], [n, ""]])} = ${k}$ y despeja $x$.`],
        solution: [
          `Buscamos los $x$ con $f(x) = ${k}$: $${terms([[m, "x"], [n, ""]])} = ${k}$.`,
          `$${terms([[m, "x"]])} = ${k - n}$, así que $x = ${frac(k - n, m)}$.`,
          `La única preimagen de $${k}$ es $${t}$.`,
        ],
      };
    }
    const h = r.int(-2, 2);
    const s = r.int(1, 3);
    const c = r.int(-4, 4);
    const k = c + s * s;
    const ruleTex = poly([1, -2 * h, h * h + c]);
    return {
      statement: `Sea $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = ${ruleTex}$. Halla el conjunto de preimágenes de $y = ${k}$.`,
      parts: [
        {
          kind: "set",
          before: `\\{x \\;/\\; f(x) = ${k}\\} =`,
          answer: uniqSorted([h - s, h + s]),
          mistakes: [{ answer: [h + s], feedback: "Te falta una. Al sacar raíz cuadrada aparecen dos signos, $+$ y $-$." }],
        },
      ],
      hints: [
        `Plantea $${ruleTex} = ${k}$.`,
        h === 0 ? "Despeja $x^2$ y saca raíz cuadrada con los dos signos." : `Pasa todo a un lado y factoriza, o completa el cuadrado: $${ruleTex} = (${xMinus(h)})^2 ${signed(c)}$.`,
      ],
      solution: [
        `Buscamos los $x$ con $f(x) = ${k}$: $${ruleTex} = ${k}$.`,
        h === 0 ? `$x^2 = ${s * s}$.` : `Completando el cuadrado: $(${xMinus(h)})^2 ${signed(c)} = ${k}$, es decir $(${xMinus(h)})^2 = ${s * s}$.`,
        h === 0 ? `$x = ${s}$ o $x = -${s}$.` : `$${xMinus(h)} = ${s}$ o $${xMinus(h)} = -${s}$, así que $x = ${h + s}$ o $x = ${h - s}$.`,
        `El $${k}$ tiene dos preimágenes: $${setTex(uniqSorted([h - s, h + s]))}$. Una imagen puede tener varias preimágenes, eso no rompe la función.`,
      ],
    };
  },
};

const porQueSinImagen: ExerciseGen = {
  id: "por-que-sin-imagen",
  title: "¿Por qué este x no tiene imagen?",
  level: 2,
  generate: (r) => {
    const kind = r.pick(["den", "raiz", "log", "parcial"] as const);
    const a = r.int(1, 5);
    let rule: string, x0: number, correct: Rich, sub: string;
    const Lden = "Porque al sustituir, el denominador vale $0$ y la división entre cero no está definida.";
    const Lraiz = "Porque al sustituir queda la raíz cuadrada de un número negativo, que no es un número real.";
    const Llog = "Porque queda el logaritmo de un número menor o igual que cero, que no está definido.";
    if (kind === "den") {
      const p = r.nz(-3, 3);
      const q = r.int(-5, 5);
      rule = `\\dfrac{${terms([[p, "x"], [q, ""]])}}{${xMinus(a)}}`;
      x0 = a;
      correct = Lden;
      sub = `f(${a}) = \\dfrac{${p * a + q}}{0}`;
    } else if (kind === "raiz") {
      x0 = a - r.int(1, 4);
      rule = `\\sqrt{${xMinus(a)}}`;
      correct = Lraiz;
      sub = `f(${x0}) = \\sqrt{${x0 - a}}`;
    } else if (kind === "log") {
      x0 = a - r.int(0, 3);
      rule = `\\ln(${xMinus(a)})`;
      correct = Llog;
      sub = `f(${x0}) = \\ln(${x0 - a})`;
    } else {
      const p = r.int(1, 5);
      rule = `\\sqrt{\\dfrac{x^2 + ${p}}{${xMinus(a)}}}`;
      x0 = 0;
      correct = Lraiz;
      sub = `f(0) = \\sqrt{\\dfrac{${p}}{${-a}}} = \\sqrt{${frac(-p, a)}}`;
    }
    const pool: [Rich, Rich][] = [
      [Lden, kind === "parcial" ? `Al sustituir $x = 0$ el denominador vale $${-a}$, que no es cero.` : "Esta regla no tiene un denominador que se anule ahí."],
      [Lraiz, "Esta regla no tiene raíz cuadrada que se vuelva negativa en ese punto."],
      [Llog, "Esta regla no tiene logaritmo."],
      ["Porque la imagen de ese $x$ es $0$.", "Si la imagen fuera $0$, sí tendría imagen: el $0$ es un número real."],
      ["Porque ese número no pertenece al conjunto de llegada.", "El conjunto de llegada tiene que ver con las imágenes, no con los $x$ que entran."],
    ];
    const wrong = pool.filter(([l]) => l !== correct);
    return {
      statement: `Sea la relación $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = ${rule}$. ¿Por qué $x = ${x0}$ no tiene imagen?`,
      parts: [choice(correct, r.sample(wrong, 3))],
      hints: [`Sustituye $x = ${x0}$ en la regla y mira qué operación no se puede hacer.`],
      solution: [
        `Sustituimos: $${sub}$.`,
        correct,
        `Por eso $x = ${x0}$ no tiene imagen, y $f$ no es función de $\\mathbb{R}$ en $\\mathbb{R}$ mientras no se excluya ese valor del conjunto de partida.`,
      ],
    };
  },
};

const porQueNoEsImagen: ExerciseGen = {
  id: "por-que-no-es-imagen",
  title: "¿Por qué este y no es imagen?",
  level: 2,
  generate: (r) => {
    const kind = r.pick(["raiz", "cuad", "exp", "abs"] as const);
    const c = r.int(-3, 3);
    const k = r.int(1, 4);
    let rule: string, y0: number, correct: Rich, eq: string;
    if (kind === "raiz") {
      const a = r.int(-3, 3);
      rule = `\\sqrt{${xMinus(a)}}`;
      y0 = -k;
      correct = "Porque una raíz cuadrada nunca da un resultado negativo.";
      eq = `\\sqrt{${xMinus(a)}} = ${y0}`;
    } else if (kind === "cuad") {
      rule = terms([[1, "x^2"], [c, ""]]);
      y0 = c - k;
      correct = `Porque $x^2 \\ge 0$ para todo $x$, así que $f(x) \\ge ${c}$ y nunca vale $${y0}$.`;
      eq = `x^2 = ${-k}`;
    } else if (kind === "exp") {
      rule = terms([[1, "e^{x}"], [c, ""]]);
      y0 = c - r.int(0, 3);
      correct = `Porque $e^x > 0$ para todo $x$, así que $f(x) > ${c}$ y nunca vale $${y0}$.`;
      eq = `e^x = ${y0 - c}`;
    } else {
      const a = r.int(-3, 3);
      rule = terms([[1, `|${xMinus(a)}|`], [c, ""]]);
      y0 = c - k;
      correct = `Porque un valor absoluto nunca es negativo, así que $f(x) \\ge ${c}$ y nunca vale $${y0}$.`;
      eq = `|${xMinus(a)}| = ${-k}`;
    }
    return {
      statement: `Sea $f: A \\subseteq \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = ${rule}$, con $A$ su dominio. ¿Por qué $y = ${y0}$ no es imagen de ningún $x$?`,
      parts: [
        choice(correct, [
          [`Porque al sustituir $x = ${y0}$ en la regla no se obtiene un número real.`, `Eso estudiaría si $${y0}$ tiene imagen como $x$. La pregunta es al revés: si existe algún $x$ cuya imagen sea $${y0}$.`],
          [`Porque $${y0}$ no pertenece al dominio de $f$.`, "El dominio son los $x$ que entran. Aquí $y$ es un valor que saldría, así que hay que mirar el rango."],
          ["Porque $f$ no es inyectiva.", "La inyectividad trata de imágenes repetidas. Aquí el problema es que ningún $x$ produce ese valor."],
        ]),
      ],
      hints: [`Plantea $f(x) = ${y0}$ y trata de despejar $x$. ¿Llegas a algo posible?`],
      solution: [
        `Si $${y0}$ fuera imagen, existiría $x$ con $f(x) = ${y0}$. Despejando queda $${eq}$.`,
        `${correct} Esa ecuación no tiene solución.`,
        `Por eso $${y0}$ no está en el rango de $f$.`,
      ],
    };
  },
};

const funcionComoPares: ExerciseGen = {
  id: "funcion-como-pares",
  title: "La función como conjunto de pares",
  level: 2,
  generate: (r) => {
    const A = sortNum(r.sample([-3, -2, -1, 0, 1, 2, 3], 4));
    const quad = r.bool();
    const m = r.nz(-3, 3);
    const n = r.int(-3, 3);
    const c = r.int(-2, 2);
    const f = (x: number) => (quad ? x * x + c : m * x + n);
    const ruleTex = quad ? terms([[1, "x^2"], [c, ""]]) : terms([[m, "x"], [n, ""]]);
    const pairs: [El, El][] = A.map((x) => [x, f(x)]);
    const ran = uniqSorted(A.map(f));
    const swapped: [El, El][] = A.map((x) => [f(x), x]);
    const bad = r.int(0, 3);
    const off: [El, El][] = A.map((x, i) => [x, i === bad ? f(x) + r.pick([1, -1]) : f(x)]);
    const missing: [El, El][] = pairs.filter((_, i) => i !== bad);
    return {
      statement: `Sea $f: A \\to \\mathbb{R} \\;/\\; y = ${ruleTex}$, con $A = ${setTex(A)}$.`,
      sequential: true,
      parts: [
        choice(
          `$f = ${pairsTex(pairs)}$`,
          [
            [`$f = ${pairsTex(swapped)}$`, "Invertiste el orden. En cada par va primero $x$ y después su imagen $f(x)$."],
            [`$f = ${pairsTex(off)}$`, `Revisa la imagen de $${A[bad]}$: $f(${A[bad]}) = ${f(A[bad])}$.`],
            [`$f = ${pairsTex(missing)}$`, `Falta el par del $${A[bad]}$. Todo elemento del dominio tiene que aparecer.`],
          ],
          "¿Cuál es $f$ escrita como conjunto de pares ordenados?",
        ),
        {
          kind: "set",
          prompt: "Escribe el rango de $f$.",
          before: "\\text{Ran } f =",
          answer: ran,
          mistakes: sameSet(ran, A) ? [] : [{ answer: A, feedback: "Ese es el dominio. El rango son las imágenes, las segundas componentes." }],
        },
      ],
      hints: ["Calcula la imagen de cada elemento de $A$ y forma los pares $(x, f(x))$."],
      solution: [
        `Imágenes: ${A.map((x) => `$f(${x}) = ${f(x)}$`).join(", ")}.`,
        `Entonces $f = ${pairsTex(pairs)}$.`,
        `El rango son las segundas componentes, sin repetir: $\\text{Ran } f = ${setTex(ran)}$.`,
      ],
    };
  },
};

const argumentaNoFuncion: ExerciseGen = {
  id: "argumenta-no-funcion",
  title: "Argumenta por qué no es función (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const kind = r.pick(["den", "raiz", "log", "rel"] as const);
    let rel: string, A: Interval[], noImg: string, twoImg: string | null = null;
    let ruleAfter: string | null = null;
    const a = r.int(-4, 5);
    if (kind === "den") {
      const p = r.nz(-3, 3);
      const q = r.int(-5, 5);
      const qq = p * a + q === 0 ? q + 1 : q;
      rel = `y = \\dfrac{${terms([[p, "x"], [qq, ""]])}}{${xMinus(a)}}`;
      A = minusPoints(R, [a]);
      noImg = `$x = ${a}$ anula el denominador`;
    } else if (kind === "raiz") {
      rel = `y = \\sqrt{${terms([[a, ""], [-1, "x"]])}}`;
      A = [iv(-Infinity, a, false, true)];
      noImg = `$x = ${a + 1}$ da $\\sqrt{-1}$`;
    } else if (kind === "log") {
      rel = `y = \\ln(${xMinus(a)})`;
      A = [iv(a, Infinity)];
      noImg = `$x = ${a}$ da $\\ln 0$`;
    } else {
      const k = r.int(4, 12);
      rel = `y^2 + x = ${k}`;
      A = [iv(-Infinity, k, false, true)];
      noImg = `$x = ${k + 1}$ da $y^2 = -1$`;
      twoImg = `$x = ${k - 4}$ da $y^2 = 4$, es decir $y = 2$ y $y = -2$`;
      ruleAfter = `\\sqrt{${k} - x}`;
    }
    const parts: Part[] = [
      multi(
        [
          { label: `Hay elementos del conjunto de partida sin imagen. Por ejemplo, ${noImg}.`, correct: true },
          twoImg
            ? { label: `Hay elementos del conjunto de partida con más de una imagen. Por ejemplo, ${twoImg}.`, correct: true }
            : { label: "Hay elementos del conjunto de partida con más de una imagen.", feedback: "Con esta regla, cada $x$ que sí funciona da un solo resultado. Ese no es el problema." },
          { label: "Hay elementos del conjunto de llegada que no son imagen de ningún $x$.", feedback: "Aunque pase, no impide ser función. La definición no exige que se use todo el conjunto de llegada. Eso tiene que ver con ser sobreyectiva." },
          { label: "La regla no es un polinomio.", feedback: "Muchas funciones no son polinomios. Lo que importa son las dos condiciones de la definición." },
        ],
        "Marca **todas** las razones por las cuales $f$ no representa una función de $\\mathbb{R}$ en $\\mathbb{R}$.",
      ),
      {
        kind: "interval",
        prompt: kind === "rel"
          ? "Restringe el conjunto de partida para que todo $x$ tenga imagen. ¿Cuál es $A$?"
          : "Restringe el conjunto de partida para que $f$ sea función. ¿Cuál es el conjunto $A$ de $f: A \\to \\mathbb{R}$?",
        before: "A =",
        answer: A,
      },
    ];
    if (ruleAfter) {
      parts.push({
        kind: "expr",
        prompt: "Para que cada $x$ tenga una sola imagen, quédate con los $y \\ge 0$. Despeja $y$.",
        before: "y =",
        answer: ruleAfter,
        vars: ["x"],
        domain: [-6, 3],
        mistakes: [{ answer: `${rel.split("= ")[1]} - x`, feedback: "Olvidaste que $y$ está al cuadrado. Despeja $y^2$ y luego saca la raíz." }],
      });
    }
    return {
      statement: `Sea $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; ${rel}$. Responde paso a paso.`,
      sequential: true,
      parts,
      hints: [
        "Una relación de $\\mathbb{R}$ en $\\mathbb{R}$ es función si **todo** $x$ real tiene imagen y esa imagen es **única**. Busca un $x$ que falle cada condición.",
        "Para restringir, quita del conjunto de partida los $x$ que no tienen imagen.",
      ],
      solution: [
        `Primera condición, todo $x$ tiene imagen: falla, porque ${noImg}.`,
        twoImg ? `Segunda condición, la imagen es única: también falla, porque ${twoImg}.` : "Segunda condición, la imagen es única: se cumple, cada $x$ válido da un solo valor.",
        `Restringimos el conjunto de partida a los $x$ que sí tienen imagen: $A = ${unionTex(A)}$.`,
        ruleAfter
          ? `Para la unicidad tomamos la rama $y \\ge 0$: $y = ${ruleAfter}$. La función queda definida como $f: ${unionTex(A)} \\to \\mathbb{R} \\;/\\; y = ${ruleAfter}$.`
          : `La función queda definida como $f: ${unionTex(A)} \\to \\mathbb{R} \\;/\\; ${rel}$.`,
      ],
    };
  },
};

const vfConceptos: ExerciseGen = {
  id: "vf-conceptos",
  title: "Verdadero o falso sobre funciones (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const a = r.nz(-5, 5);
    const pool: [string, boolean, Rich][] = [
      [`La recta vertical $x = ${a}$ es una función real de variable real.`, false, `Al $${a}$ le corresponden infinitos valores de $y$, y ningún otro $x$ tiene imagen. Falla la prueba de la recta vertical.`],
      [`La recta horizontal $y = ${a}$ es una función real de variable real.`, true, `Es $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = ${a}$. Todo $x$ tiene imagen y es única: siempre $${a}$.`],
      ["Si $f: A \\to B$ es función, entonces el rango de $f$ es un subconjunto de $B$.", true, "Las imágenes salen del conjunto de llegada, así que $\\text{Ran } f \\subseteq B$."],
      ["Si $f: A \\to B$ es función, entonces todo elemento de $B$ tiene preimagen.", false, "Pueden sobrar elementos en $B$. Eso solo pasa si además $f$ es sobreyectiva."],
      ["Si $f: A \\to B$ es función, dos elementos distintos de $A$ pueden tener la misma imagen.", true, "La definición no lo prohíbe. Por ejemplo, $f(x) = x^2$ manda $2$ y $-2$ al $4$."],
      ["Si $f: A \\to B$ es función, un elemento de $A$ puede tener dos imágenes distintas.", false, "La segunda condición de la definición exige que la imagen sea única."],
      ["El dominio de una función $f: A \\to B$ es el conjunto $A$.", true, "Para que $f$ sea función de $A$ en $B$, todo elemento de $A$ tiene imagen, así que $\\text{Dom } f = A$."],
      ["Para cualquier par de conjuntos $A$ y $B$, $A \\times B = B \\times A$.", false, "El orden de los pares importa. Con $A = \\{1\\}$ y $B = \\{2\\}$, $A \\times B = \\{(1, 2)\\}$ y $B \\times A = \\{(2, 1)\\}$."],
      [`La relación $y^2 = x + ${Math.abs(a)}$ define a $y$ como función de $x$ en todo $\\mathbb{R}$.`, false, `Para $x = ${4 - Math.abs(a)}$ se obtiene $y = 2$ y $y = -2$: un $x$ con dos imágenes.`],
      ["Toda función es una relación.", true, "Una función es una relación de $A$ en $B$ que además cumple las dos condiciones."],
      ["Toda relación es una función.", false, "Una relación puede dejar elementos de $A$ sin imagen o darles varias. Por ejemplo, $x^2 + y^2 = 1$."],
    ];
    const [claim, isTrue, why] = r.pick(pool);
    return {
      statement: `¿Verdadero o falso? ${claim}`,
      parts: [trueFalse(isTrue, why)],
      hints: ["Repasa las dos condiciones: todo elemento del conjunto de partida tiene imagen, y esa imagen es única."],
      solution: [`${isTrue ? "Verdadero" : "Falso"}. ${why}`],
    };
  },
};

const relacionCompleta: ExerciseGen = {
  id: "relacion-completa",
  title: "Estudio completo de una relación (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const { A, B, cond, pairs, dom, ran } = randomRelation(r, 2);
    const noImage = A.filter((x) => !dom.includes(x));
    const multiImg = A.filter((x) => pairs.filter((p) => p[0] === x).length > 1);
    const isFn = noImage.length === 0 && multiImg.length === 0;
    const Lyes = "Sí, cada elemento de $A$ tiene exactamente una imagen.";
    const Lno1 = "No, hay elementos de $A$ sin imagen.";
    const Lno2 = "No, hay elementos de $A$ con más de una imagen.";
    const Lno3 = "No, hay elementos de $A$ sin imagen y otros con más de una.";
    const correct = isFn ? Lyes : noImage.length && multiImg.length ? Lno3 : noImage.length ? Lno1 : Lno2;
    const wrong: [Rich, Rich][] = [Lyes, Lno1, Lno2, Lno3]
      .filter((l) => l !== correct)
      .map((l) => [
        l,
        l === Lyes
          ? "Compara el dominio con $A$ y revisa si algún $x$ aparece en dos pares."
          : "Revisa con cuidado: compara el dominio con $A$ y cuenta cuántas veces aparece cada $x$.",
      ]);
    return {
      statement: `Dados $A = ${setTex(A)}$, $B = ${setTex(B)}$ y la relación $R = \\{(x, y) \\in A \\times B \\;/\\; ${cond.tex}\\}$, resuelve paso a paso.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Escribe $R$ por extensión en tu cuaderno. ¿Cuántos pares tiene?", answer: String(pairs.length), maxOps: 0 },
        { kind: "set", prompt: "Determina el dominio de $R$.", before: "\\text{Dom } R =", answer: dom },
        { kind: "set", prompt: "Determina el rango de $R$.", before: "\\text{Ran } R =", answer: ran },
        choice(correct, wrong, "¿Es $R$ una función de $A$ en $B$?"),
      ],
      hints: [
        `Recorre $A \\times B$ par por par y quédate con los que cumplen $${cond.tex}$.`,
        "Para decidir si es función, compara el dominio con $A$ y fíjate si algún $x$ se repite como primera componente.",
      ],
      solution: [
        `$R = ${pairsTex(pairs)}$, con ${pairs.length} pares.`,
        `Conjunto de partida $A$, conjunto de llegada $B$. $\\text{Dom } R = ${setTex(dom)}$ y $\\text{Ran } R = ${setTex(ran)}$.`,
        noImage.length
          ? noImage.length === 1 ? `El elemento $${noImage[0]}$ de $A$ no tiene imagen.` : `Los elementos $${noImage.join(", ")}$ de $A$ no tienen imagen.`
          : "Todos los elementos de $A$ tienen imagen.",
        multiImg.length
          ? multiImg.length === 1 ? `El elemento $${multiImg[0]}$ tiene más de una imagen.` : `Los elementos $${multiImg.join(", ")}$ tienen más de una imagen.`
          : "Ningún elemento tiene más de una imagen.",
        isFn ? "Por lo tanto $R$ es función de $A$ en $B$." : "Por lo tanto $R$ no es función de $A$ en $B$.",
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("relaciones-funciones"),
  objectives: [
    "Construir el producto cartesiano de dos conjuntos y reconocer una relación como un subconjunto suyo.",
    "Decidir si una relación es función revisando sus dos condiciones en pares, en un diagrama o en una gráfica.",
    "Calcular imágenes y preimágenes.",
    "Escribir una función completa con la notación $f: A \\to B \\;/\\; y = f(x)$.",
    "Argumentar por qué una relación no es función y restringirla para que lo sea.",
  ],
  sections: [
    {
      id: "producto-cartesiano",
      title: "Pares ordenados y producto cartesiano",
      blocks: [
        {
          type: "text",
          md: "En la vida diaria emparejamos cosas todo el tiempo: cada estudiante con su nota, cada producto con su precio. En matemática esos emparejamientos se escriben como **pares ordenados** $(x, y)$.\n\nLa palabra _ordenados_ importa. El par $(2, 5)$ no es el mismo que $(5, 2)$: en el plano son puntos distintos, y en una lista de precios no es lo mismo \"producto 2 cuesta 5\" que \"producto 5 cuesta 2\". Dos pares son iguales solo si coinciden componente a componente.",
        },
        {
          type: "definition",
          title: "Producto cartesiano",
          md: "Dados dos conjuntos $A$ y $B$, el producto cartesiano $A \\times B$ es el conjunto de **todos** los pares cuya primera componente está en $A$ y cuya segunda componente está en $B$:\n\n$$A \\times B = \\{(x, y) \\;/\\; x \\in A \\wedge y \\in B\\}$$",
        },
        {
          type: "example",
          title: "Armar un producto cartesiano",
          problem: "Sean $A = \\{1, 2, 3\\}$ y $B = \\{a, b\\}$. Escribe $A \\times B$ y $B \\times A$.",
          steps: [
            "Tomamos cada elemento de $A$ y lo combinamos con cada elemento de $B$, en ese orden.",
            "$A \\times B = \\{(1, a), (1, b), (2, a), (2, b), (3, a), (3, b)\\}$. Son $3 \\cdot 2 = 6$ pares.",
            "En $B \\times A$ la primera componente sale de $B$: $B \\times A = \\{(a, 1), (a, 2), (a, 3), (b, 1), (b, 2), (b, 3)\\}$.",
          ],
          answer: "Los dos productos tienen 6 pares, pero son conjuntos distintos.",
        },
        {
          type: "note",
          tone: "warning",
          title: "El producto no es conmutativo",
          md: "En general $A \\times B \\ne B \\times A$. Lo que sí se cumple es que tienen la misma cantidad de pares: si $A$ tiene $m$ elementos y $B$ tiene $n$, cada producto tiene $m \\cdot n$.",
        },
        {
          type: "text",
          md: "El plano cartesiano es justamente $\\mathbb{R} \\times \\mathbb{R} = \\mathbb{R}^2$: todos los pares de números reales. Cada punto del plano es un par $(x, y)$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Si $A$ tiene 3 elementos y $B$ tiene 4, ¿cuántos pares tiene $A \\times B$?",
            parts: [{ kind: "expr", answer: "12", maxOps: 0, mistakes: [{ answer: "7", feedback: "Se multiplican, no se suman: cada elemento de $A$ se combina con los 4 de $B$." }] }],
            solution: ["Cada uno de los 3 elementos de $A$ forma un par con cada uno de los 4 de $B$: $3 \\cdot 4 = 12$."],
          },
        },
      ],
    },
    {
      id: "relaciones",
      title: "Relaciones",
      blocks: [
        {
          type: "text",
          md: "El producto cartesiano junta **todas** las parejas posibles. Casi nunca nos interesan todas, sino las que cumplen alguna condición. Escoger algunos pares de $A \\times B$ es armar una relación.",
        },
        {
          type: "definition",
          title: "Relación de A en B",
          md: "Una relación $R$ de $A$ en $B$ es cualquier subconjunto del producto cartesiano: $R \\subseteq A \\times B$.\n\n- $A$ es el **conjunto de partida** y $B$ el **conjunto de llegada**.\n- El **dominio** de $R$ son las primeras componentes de sus pares: $\\text{Dom } R = \\{x \\;/\\; (x, y) \\in R\\}$.\n- El **rango** de $R$ son las segundas componentes: $\\text{Ran } R = \\{y \\;/\\; (x, y) \\in R\\}$.",
        },
        {
          type: "example",
          title: "Una relación dada por un enunciado",
          problem: "Sean $A = \\{1, 3, 5, 7\\}$ y $B = \\{0, 2, 4, 6\\}$. Determina $R = \\{(x, y) \\in A \\times B \\;/\\; x < y\\}$, su dominio y su rango.",
          steps: [
            "$A \\times B$ tiene $4 \\cdot 4 = 16$ pares. Revisamos cuáles cumplen $x < y$.",
            "El $1$ es menor que $2$, $4$ y $6$. El $3$ es menor que $4$ y $6$. El $5$ es menor que $6$. El $7$ no es menor que ninguno.",
            "$R = \\{(1, 2), (1, 4), (1, 6), (3, 4), (3, 6), (5, 6)\\}$.",
            "Primeras componentes: $\\text{Dom } R = \\{1, 3, 5\\}$. Segundas componentes: $\\text{Ran } R = \\{2, 4, 6\\}$.",
          ],
          answer: "El $7$ está en el conjunto de partida pero no en el dominio, y el $0$ está en el de llegada pero no en el rango.",
        },
        {
          type: "widget",
          widget: { kind: "mapping", domain: ["1", "3", "5", "7"], codomain: ["0", "2", "4", "6"], arrows: [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]] },
          caption: "Diagrama sagital de la relación $x < y$. Cada flecha es un par de $R$.",
        },
        {
          type: "note",
          tone: "tip",
          title: "Conjunto de partida no es lo mismo que dominio",
          md: "El conjunto de partida es el que declaras de entrada. El dominio son los elementos que de verdad tienen alguna flecha. En una relación cualquiera pueden ser distintos.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Sea $R = \\{(1, 2), (1, 4), (3, 4), (6, 2)\\}$. Escribe el dominio de $R$.",
            parts: [{ kind: "set", before: "\\text{Dom } R =", answer: [1, 3, 6], mistakes: [{ answer: [2, 4], feedback: "Ese es el rango. El dominio son las primeras componentes." }] }],
            solution: ["Las primeras componentes son $1, 1, 3, 6$. Sin repetir: $\\text{Dom } R = \\{1, 3, 6\\}$."],
          },
        },
      ],
    },
    {
      id: "que-es-funcion",
      title: "Cuándo una relación es función",
      blocks: [
        {
          type: "text",
          md: "Piensa en una máquina expendedora. Cada botón que existe tiene que dar un producto, y siempre el mismo. Si un botón no da nada, o si a veces da una cosa y a veces otra, la máquina está dañada.\n\nUna función es una relación que se porta como esa máquina bien hecha.",
        },
        {
          type: "definition",
          title: "Función",
          md: "Una relación $f$ de $A$ en $B$ es una **función** si todo elemento de $A$ se relaciona con uno y solo un elemento de $B$. Son dos condiciones:\n\n- **Existencia.** Todo $x \\in A$ tiene imagen: existe $y \\in B$ con $(x, y) \\in f$.\n- **Unicidad.** Esa imagen es única: si $(x, y) \\in f$ y $(x, z) \\in f$, entonces $y = z$.\n\nSe escribe $f: A \\to B$ y se lee \"$f$ es función de $A$ en $B$\".",
        },
        {
          type: "text",
          md: "En un diagrama sagital las dos condiciones se ven así: de **cada** elemento de $A$ sale **exactamente una** flecha. Dibuja flechas en el diagrama y mira cómo la aplicación clasifica lo que hiciste.",
        },
        {
          type: "widget",
          widget: { kind: "mapping", domain: ["a", "b", "c"], codomain: ["1", "2", "3", "4"], arrows: [[0, 1], [1, 0], [2, 1]], editable: true },
          caption: "Prueba dejar un elemento sin flecha, sacar dos flechas del mismo elemento o mandar dos elementos al mismo número.",
        },
        {
          type: "example",
          title: "Tres relaciones de A = {1, 2, 3} en B = {p, q, r}",
          problem: "Decide cuáles son funciones: $R_1 = \\{(1, p), (2, q), (3, p)\\}$, $R_2 = \\{(1, p), (2, r)\\}$ y $R_3 = \\{(1, p), (1, q), (2, r), (3, r)\\}$.",
          steps: [
            "$R_1$: el $1$, el $2$ y el $3$ tienen una imagen cada uno. Es función, aunque el $1$ y el $3$ compartan imagen y la $r$ quede sin usar.",
            "$R_2$: el $3$ no aparece en ningún par. Falla la existencia, no es función.",
            "$R_3$: el $1$ aparece con $p$ y con $q$. Falla la unicidad, no es función.",
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "Lo que no rompe una función",
          md: "Que dos elementos de $A$ vayan al mismo elemento de $B$ está permitido. Que sobren elementos en $B$ sin flecha también. Las dos condiciones solo hablan de los elementos de $A$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Sean $A = \\{1, 2, 3\\}$ y $B = \\{5, 6\\}$. ¿Es $f = \\{(1, 5), (2, 5), (3, 5)\\}$ una función de $A$ en $B$?",
            parts: [trueFalse(true, "Cada elemento de $A$ tiene exactamente una imagen. Que todas sean $5$ y que el $6$ sobre no importa.", "¿Es función?")],
            solution: ["El $1$, el $2$ y el $3$ aparecen una vez cada uno. Se cumplen la existencia y la unicidad, así que es función. Es una función constante."],
          },
        },
      ],
    },
    {
      id: "imagen-preimagen",
      title: "Imagen y preimagen",
      blocks: [
        {
          type: "text",
          md: "Si $(x, y)$ es un par de la función $f$, decimos que $y$ es la **imagen** de $x$ y que $x$ es una **preimagen** (o contraimagen) de $y$. Como la imagen de cada $x$ es única, se le puede dar nombre: se escribe $y = f(x)$ y se lee \"$y$ es igual a $f$ de $x$\".\n\nLa regla $y = f(x)$ es la **regla de correspondencia**: la receta que dice qué hacer con cada $x$.",
        },
        {
          type: "widget",
          widget: { kind: "machine", fns: [{ name: "f", tex: "x^2 - 1" }], input: 3, min: -5, max: 5 },
          caption: "La máquina de $f(x) = x^2 - 1$. Cambia la entrada y mira su imagen. Fíjate que $3$ y $-3$ salen iguales.",
        },
        {
          type: "example",
          title: "Imágenes y preimágenes de f(x) = x² − 1",
          problem: "Sea $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = x^2 - 1$. Halla la imagen de $3$, las preimágenes de $8$ y las preimágenes de $-2$.",
          steps: [
            "Imagen de $3$: sustituimos. $f(3) = 3^2 - 1 = 8$.",
            "Preimágenes de $8$: buscamos los $x$ con $x^2 - 1 = 8$, es decir $x^2 = 9$. Hay dos: $x = 3$ y $x = -3$.",
            "Preimágenes de $-2$: $x^2 - 1 = -2$ da $x^2 = -1$, que no tiene solución real. El $-2$ no tiene preimagen.",
          ],
          answer: "Cada $x$ tiene una sola imagen, pero un $y$ puede tener dos preimágenes, una o ninguna.",
        },
        {
          type: "note",
          tone: "tip",
          title: "Imagen se calcula, preimagen se despeja",
          md: "Para la imagen sustituyes $x$ en la regla. Para la preimagen planteas la ecuación $f(x) = y$ y la resuelves. Confundir las dos es el error más frecuente.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Sea $f(x) = 2x + 3$. Halla la preimagen de $11$.",
            parts: [{ kind: "set", before: "x \\in", answer: [4], mistakes: [{ answer: [25], feedback: "Calculaste $f(11)$. La preimagen es el $x$ que cumple $2x + 3 = 11$." }] }],
            solution: ["$2x + 3 = 11$, así que $2x = 8$ y $x = 4$. Comprobación: $f(4) = 11$."],
          },
        },
      ],
    },
    {
      id: "notacion",
      title: "Definir una función completa",
      blocks: [
        {
          type: "text",
          md: "Una función no es solo su fórmula. En esta cátedra una función queda definida con tres piezas: el **dominio**, el **conjunto de llegada** (codominio) y la **regla de correspondencia**. Por eso, cuando un parcial dice \"defínela\", hay que escribir las tres:\n\n$$f: A \\to B \\;/\\; y = f(x)$$\n\nSe lee \"$f$ de $A$ en $B$ tal que $y$ es igual a $f$ de $x$\". Como todo $x$ de $A$ tiene imagen, $\\text{Dom } f = A$. El rango cumple $\\text{Ran } f \\subseteq B$.",
        },
        {
          type: "definition",
          title: "La función como conjunto de pares",
          md: "Con la regla conocida, la función es el conjunto de pares\n\n$$f = \\{(x, y) \\in A \\times B \\;/\\; y = f(x)\\}$$\n\nSi $A$ es finito se puede escribir por extensión. Si es infinito, solo por comprensión.",
        },
        {
          type: "example",
          title: "De la regla a los pares",
          problem: "Sea $f: \\{-1, 0, 1, 2\\} \\to \\mathbb{R} \\;/\\; y = 2x + 1$. Escribe $f$ como conjunto de pares y halla su rango.",
          steps: [
            "Calculamos cada imagen: $f(-1) = -1$, $f(0) = 1$, $f(1) = 3$, $f(2) = 5$.",
            "$f = \\{(-1, -1), (0, 1), (1, 3), (2, 5)\\}$.",
            "El rango son las segundas componentes: $\\text{Ran } f = \\{-1, 1, 3, 5\\}$, que es un subconjunto de $\\mathbb{R}$.",
          ],
        },
        {
          type: "example",
          title: "La misma regla, otra función",
          problem: "¿Es $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = \\dfrac{1}{x}$ una función? Si no lo es, restríngela y defínela.",
          steps: [
            "El $0$ está en el conjunto de partida, pero $\\dfrac{1}{0}$ no existe. El $0$ no tiene imagen, falla la existencia.",
            "Quitamos el $0$ del conjunto de partida. Para los demás $x$ la imagen existe y es única.",
            "Definición: $f: \\mathbb{R} - \\{0\\} \\to \\mathbb{R} \\;/\\; y = \\dfrac{1}{x}$.",
          ],
        },
        {
          type: "note",
          tone: "econ",
          title: "La demanda como función",
          md: "Una función de demanda asocia a cada precio $p$ la cantidad demandada $q$. Por ejemplo, $q = 100 - 2p$. Como precio y cantidad no pueden ser negativos, la función completa es $D: [0, 50] \\to \\mathbb{R} \\;/\\; q = 100 - 2p$. Para precios mayores que $50$ la fórmula daría cantidades negativas, que no tienen sentido.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Cuál de estas escrituras define una función completa, al estilo de la cátedra?",
            parts: [
              choice("$f: \\mathbb{R} - \\{2\\} \\to \\mathbb{R} \\;/\\; y = \\dfrac{1}{x - 2}$", [
                ["$f(x) = \\dfrac{1}{x - 2}$", "Falta decir el dominio y el conjunto de llegada."],
                ["$f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = \\dfrac{1}{x - 2}$", "El $2$ no tiene imagen, así que con ese conjunto de partida no es función."],
                ["$\\text{Dom } f = \\mathbb{R} - \\{2\\}$", "Falta la regla y el conjunto de llegada."],
              ]),
            ],
            solution: ["Hay que dar dominio, conjunto de llegada y regla, y el dominio no puede tener elementos sin imagen. Solo la primera opción cumple todo."],
          },
        },
      ],
    },
    {
      id: "recta-vertical",
      title: "Funciones reales y la prueba de la recta vertical",
      blocks: [
        {
          type: "text",
          md: "En este curso casi todas las funciones son **reales de variable real**: $f: A \\to \\mathbb{R}$ con $A \\subseteq \\mathbb{R}$. Su gráfica es el conjunto de puntos $(x, f(x))$ del plano.\n\nLa condición de unicidad tiene una traducción visual muy cómoda. Una recta vertical $x = a$ junta todos los puntos del plano con primera componente $a$. Si corta la gráfica en dos puntos, el $a$ tendría dos imágenes.",
        },
        {
          type: "definition",
          title: "Prueba de la recta vertical",
          md: "Una curva del plano es la gráfica de una función $y = f(x)$ si y solo si **ninguna recta vertical la corta en más de un punto**.",
        },
        {
          type: "graph",
          spec: {
            x: [-4, 4],
            y: [-3, 3],
            step: 1,
            curves: [
              { fn: "\\sqrt{4 - x^2}", domain: [-2, 2], color: "accent" },
              { fn: "-\\sqrt{4 - x^2}", domain: [-2, 2], color: "accent" },
            ],
            vlines: [{ x: 1, color: "red", dashed: true, label: "x = 1" }],
            points: [{ x: 1, y: Math.sqrt(3), color: "red" }, { x: 1, y: -Math.sqrt(3), color: "red" }],
          },
          caption: "La circunferencia $x^2 + y^2 = 4$ no es función: la recta $x = 1$ la corta dos veces.",
        },
        {
          type: "example",
          title: "Argumentar y restringir (tipo parcial)",
          problem: "Sea $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y^2 + x = 12$. Argumenta todas las razones por las cuales $f$ no es función, haz las restricciones para que lo sea y defínela.",
          steps: [
            "Despejamos: $y^2 = 12 - x$.",
            "Existencia: para $x = 13$ queda $y^2 = -1$, sin solución real. Todo $x > 12$ queda sin imagen.",
            "Unicidad: para $x = 3$ queda $y^2 = 9$, así que $y = 3$ y $y = -3$. Ese $x$ tiene dos imágenes.",
            "Para la existencia restringimos el conjunto de partida a $x \\le 12$. Para la unicidad nos quedamos con una sola rama, por ejemplo $y \\ge 0$: $y = \\sqrt{12 - x}$.",
            "Definición: $f: (-\\infty, 12] \\to \\mathbb{R} \\;/\\; y = \\sqrt{12 - x}$.",
          ],
          answer: "También vale la rama de abajo, $y = -\\sqrt{12 - x}$. Lo importante es escoger una sola.",
        },
        {
          type: "graph",
          spec: {
            x: [-6, 14],
            y: [-5, 5],
            step: 2,
            curves: [
              { fn: "\\sqrt{12 - x}", domain: [-6, 12], color: "accent", label: "y = √(12 − x)" },
              { fn: "-\\sqrt{12 - x}", domain: [-6, 12], color: "muted", dashed: true },
            ],
            points: [{ x: 12, y: 0, color: "accent" }],
          },
          caption: "La relación $y^2 + x = 12$ es una parábola acostada. La rama de arriba sí pasa la prueba de la recta vertical.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Rectas verticales y horizontales",
          md: "La recta horizontal $y = 3$ es función: todo $x$ tiene la imagen $3$. La recta vertical $x = 3$ no lo es: el $3$ tiene infinitas imágenes y los demás $x$ ninguna. Esta pregunta suele aparecer como verdadero o falso en el parcial.",
        },
        {
          type: "quick",
          exercise: {
            statement: "La recta vertical $x = 2$ es la gráfica de una función real de variable real.",
            parts: [trueFalse(false, "La propia recta $x = 2$ corta la gráfica en infinitos puntos: al $2$ le corresponden infinitas imágenes.")],
            solution: ["Falso. Falla la prueba de la recta vertical, y además los $x \\ne 2$ no tienen imagen."],
          },
        },
      ],
    },
  ],
  exercises: [
    productoCartesiano,
    relacionDominioRango,
    esFuncionPares,
    calcularImagen,
    rectaVertical,
    preimagen,
    porQueSinImagen,
    porQueNoEsImagen,
    funcionComoPares,
    argumentaNoFuncion,
    vfConceptos,
    relacionCompleta,
  ],
};

export default topic;
