import { meta } from "../catalog";
import { choice, trueFalse } from "../helpers";
import type { Exercise, ExerciseGen, Rich, Topic } from "../types";
import {
  complement, difference, integersIn, intersect, iv, minusPoints, signSolve, union, unionTex, type Interval,
} from "@/lib/math/intervals";
import { fmt, frac, interval, terms } from "@/lib/math/tex";
import type { Rng } from "@/lib/math/rng";

/* ----------------------------- utilidades locales ----------------------------- */

const setTex = (xs: (number | string)[]) => (xs.length ? `\\{${xs.join(", ")}\\}` : "\\varnothing");
const sortNum = (xs: number[]) => [...xs].sort((a, b) => a - b);

function randomSubset(r: Rng, pool: number[], min: number, max: number): number[] {
  return sortNum(r.sample(pool, r.int(min, max)));
}

/** Intervalo aleatorio acotado con extremos enteros. */
function randomInterval(r: Rng, lo = -6, hi = 6): Interval {
  const a = r.int(lo, hi - 2);
  const b = r.int(a + 1, hi);
  return iv(a, b, r.bool(), r.bool());
}

function ivTex(I: Interval) {
  return interval(I.lo, I.hi, I.loClosed, I.hiClosed);
}

/** Desigualdad equivalente a un intervalo: [a, b) -> a \le x < b */
function ineqTex(I: Interval, v = "x") {
  const l = Number.isFinite(I.lo) ? `${fmt(I.lo)} ${I.loClosed ? "\\le" : "<"} ` : "";
  const h = Number.isFinite(I.hi) ? ` ${I.hiClosed ? "\\le" : "<"} ${fmt(I.hi)}` : "";
  if (!l && !h) return `${v} \\in \\mathbb{R}`;
  if (!l) return `${v}${h}`;
  if (!h) return `${v} ${I.loClosed ? "\\ge" : ">"} ${fmt(I.lo)}`;
  return `${l}${v}${h}`;
}

/* ----------------------------------- ejercicios ----------------------------------- */

const pertenencia: ExerciseGen = {
  id: "pertenencia",
  title: "¿Pertenece o no pertenece?",
  level: 1,
  generate: (r) => {
    const nums: { tex: string; kind: 0 | 1 | 2 | 3; why: string }[] = [
      { tex: String(r.int(1, 30)), kind: 0, why: "es un número natural, sirve para contar" },
      { tex: "0", kind: 1, why: "en este curso los naturales empiezan en 1, así que el 0 es entero pero no natural" },
      { tex: String(-r.int(1, 20)), kind: 1, why: "es entero negativo, y los naturales solo son positivos" },
      { tex: frac(r.pick([1, 3, 5, 7]), r.pick([2, 4])), kind: 2, why: "es una fracción que no da un entero, así que es racional pero no entero" },
      { tex: `${fmt(r.int(1, 9))}{,}${r.int(1, 9)}`, kind: 2, why: "es un decimal finito, se puede escribir como fracción, así que es racional" },
      { tex: r.pick(["\\sqrt{2}", "\\sqrt{3}", "\\pi", "\\sqrt{5}"]), kind: 3, why: "no se puede escribir como fracción de enteros, es irracional. Está en $\\mathbb{R}$ pero no en $\\mathbb{Q}$" },
    ];
    const n = r.pick(nums);
    const sets = [
      { tex: "\\mathbb{N}", name: "naturales", rank: 0 },
      { tex: "\\mathbb{Z}", name: "enteros", rank: 1 },
      { tex: "\\mathbb{Q}", name: "racionales", rank: 2 },
      { tex: "\\mathbb{R}", name: "reales", rank: 3 },
    ];
    const s = r.pick(sets);
    // Un número de "tipo k" pertenece a los conjuntos de rango >= k, salvo los irracionales en Q.
    const belongs = n.kind === 3 ? s.rank === 3 : s.rank >= n.kind;
    return {
      statement: `¿Es cierto que $${n.tex} \\in ${s.tex}$?`,
      parts: [trueFalse(belongs, `El número $${n.tex}$ ${n.why}. Por eso ${belongs ? "sí" : "no"} está en los ${s.name}.`)],
      hints: ["Recuerda la cadena $\\mathbb{N} \\subset \\mathbb{Z} \\subset \\mathbb{Q} \\subset \\mathbb{R}$. Ubica primero el conjunto más pequeño que contiene al número."],
      solution: [
        `El número $${n.tex}$ ${n.why}.`,
        `Por lo tanto $${n.tex} ${belongs ? "\\in" : "\\notin"} ${s.tex}$.`,
      ],
    };
  },
};

const extension: ExerciseGen = {
  id: "extension",
  title: "De comprensión a extensión",
  level: 1,
  generate: (r) => {
    const a = r.int(-5, 2);
    const b = a + r.int(3, 6);
    const loClosed = r.bool();
    const hiClosed = r.bool();
    const I = iv(a, b, loClosed, hiClosed);
    const elems = integersIn([I]);
    return {
      statement: `Escribe por extensión el conjunto $A = \\{ x \\in \\mathbb{Z} \\;/\\; {${ineqTex(I)}} \\}$.`,
      parts: [
        {
          kind: "set",
          before: "A =",
          answer: elems,
          mistakes: [
            { answer: integersIn([iv(a, b, true, true)]), feedback: "Incluiste un extremo que no cumple la desigualdad. Con $<$ el extremo no entra." },
            { answer: integersIn([iv(a, b, false, false)]), feedback: "Te faltó un extremo. Con $\\le$ el extremo sí entra." },
          ].filter((m) => m.answer.join() !== elems.join()),
        },
      ],
      hints: [
        "Los elementos de $\\mathbb{Z}$ son los enteros: $\\dots, -2, -1, 0, 1, 2, \\dots$",
        `Revisa los extremos. ¿$${a}$ cumple la condición? ¿Y $${b}$?`,
      ],
      solution: [
        `Buscamos los enteros que cumplen $${ineqTex(I)}$.`,
        `El extremo $${a}$ ${loClosed ? "entra porque la desigualdad es $\\le$" : "no entra porque la desigualdad es estricta"}, y el extremo $${b}$ ${hiClosed ? "entra" : "no entra"}.`,
        `Por lo tanto $A = ${setTex(elems)}$.`,
      ],
    };
  },
};

const operacionesFinitas: ExerciseGen = {
  id: "operaciones-finitas",
  title: "Unión, intersección y diferencia",
  level: 1,
  generate: (r) => {
    const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    let A: number[], B: number[], inter: number[];
    do {
      A = randomSubset(r, pool, 3, 5);
      B = randomSubset(r, pool, 3, 5);
      inter = A.filter((x) => B.includes(x));
    } while (inter.length === 0 || inter.length === A.length || inter.length === B.length);
    const uni = sortNum([...new Set([...A, ...B])]);
    const AmB = A.filter((x) => !B.includes(x));
    const BmA = B.filter((x) => !A.includes(x));
    const op = r.pick(["cup", "cap", "AmB", "BmA"] as const);
    const data = {
      cup: { tex: "A \\cup B", ans: uni, rule: "todos los elementos que están en $A$, en $B$ o en ambos, sin repetir" },
      cap: { tex: "A \\cap B", ans: inter, rule: "solo los elementos que están en $A$ y también en $B$" },
      AmB: { tex: "A - B", ans: AmB, rule: "los elementos de $A$ que no están en $B$" },
      BmA: { tex: "B - A", ans: BmA, rule: "los elementos de $B$ que no están en $A$" },
    }[op];
    const mistakes: { answer: number[]; feedback: Rich }[] = [];
    if (op === "cup") mistakes.push({ answer: inter, feedback: "Eso es la intersección. La unión junta todo lo de los dos conjuntos." });
    if (op === "cap") mistakes.push({ answer: uni, feedback: "Eso es la unión. La intersección se queda solo con lo que se repite en ambos." });
    if (op === "AmB") mistakes.push({ answer: BmA, feedback: "Calculaste $B - A$. El orden importa: $A - B$ son los de $A$ que no están en $B$." });
    if (op === "BmA") mistakes.push({ answer: AmB, feedback: "Calculaste $A - B$. El orden importa: $B - A$ son los de $B$ que no están en $A$." });
    return {
      statement: `Sean $A = ${setTex(A)}$ y $B = ${setTex(B)}$. Calcula $${data.tex}$.`,
      parts: [{ kind: "set", before: `${data.tex} =`, answer: data.ans, mistakes }],
      hints: [`$${data.tex}$ contiene ${data.rule}.`],
      solution: [
        `$${data.tex}$ contiene ${data.rule}.`,
        `Los elementos comunes son $${setTex(inter)}$.`,
        `Resultado: $${data.tex} = ${setTex(data.ans)}$.`,
      ],
    };
  },
};

const desigualdadAIntervalo: ExerciseGen = {
  id: "desigualdad-a-intervalo",
  title: "De desigualdad a intervalo",
  level: 1,
  generate: (r) => {
    const kind = r.pick(["bounded", "left", "right"] as const);
    let I: Interval;
    if (kind === "bounded") {
      const a = r.int(-8, 4);
      I = iv(a, a + r.int(1, 7), r.bool(), r.bool());
    } else if (kind === "left") {
      I = iv(-Infinity, r.int(-6, 6), false, r.bool());
    } else {
      I = iv(r.int(-6, 6), Infinity, r.bool(), false);
    }
    return {
      statement: `Escribe como intervalo el conjunto de los $x$ que cumplen $${ineqTex(I)}$.`,
      parts: [{ kind: "interval", answer: [I] }],
      hints: [
        "Con $<$ o $>$ el extremo va abierto, con paréntesis. Con $\\le$ o $\\ge$ va cerrado, con corchete.",
        "Del lado del infinito siempre va paréntesis.",
      ],
      solution: [
        `Los números que cumplen $${ineqTex(I)}$ forman el intervalo $${ivTex(I)}$.`,
        kind === "bounded"
          ? "Cada extremo lleva corchete si la desigualdad incluye la igualdad y paréntesis si no."
          : "El infinito no es un número que se alcance, por eso ese lado siempre va abierto.",
      ],
    };
  },
};

const intervaloADesigualdad: ExerciseGen = {
  id: "intervalo-a-desigualdad",
  title: "De intervalo a desigualdad",
  level: 1,
  generate: (r) => {
    const a = r.int(-7, 3);
    const b = a + r.int(2, 6);
    const lc = r.bool();
    const hc = r.bool();
    const I = iv(a, b, lc, hc);
    const variants = [
      [lc, hc], [!lc, hc], [lc, !hc], [!lc, !hc],
    ].map(([l, h]) => ineqTex(iv(a, b, l, h)));
    return {
      statement: `¿Qué desigualdad describe el intervalo $${ivTex(I)}$?`,
      parts: [
        choice(`$${variants[0]}$`, [
          [`$${variants[1]}$`, "Revisa el extremo izquierdo. ¿Lleva corchete o paréntesis?"],
          [`$${variants[2]}$`, "Revisa el extremo derecho. ¿Lleva corchete o paréntesis?"],
          [`$${variants[3]}$`, "Los dos extremos están cambiados."],
        ]),
      ],
      hints: ["Corchete significa que el extremo se incluye, y eso se escribe con $\\le$."],
      solution: [
        `El extremo $${a}$ va con ${lc ? "corchete, así que se incluye ($\\le$)" : "paréntesis, así que no se incluye ($<$)"}.`,
        `El extremo $${b}$ va con ${hc ? "corchete, así que se incluye ($\\le$)" : "paréntesis, así que no se incluye ($<$)"}.`,
        `Resultado: $${variants[0]}$.`,
      ],
    };
  },
};

const operacionIntervalos: ExerciseGen = {
  id: "operacion-intervalos",
  title: "Operaciones con intervalos",
  level: 2,
  generate: (r) => {
    let A: Interval, B: Interval, res: Interval[], op: "cup" | "cap" | "AmB" | "BmA";
    // Que los intervalos se solapen para que el ejercicio tenga sustancia
    do {
      A = randomInterval(r);
      B = randomInterval(r);
      op = r.pick(["cup", "cap", "AmB", "BmA"] as const);
      res = op === "cup" ? union([A], [B]) : op === "cap" ? intersect([A], [B]) : op === "AmB" ? difference([A], [B]) : difference([B], [A]);
    } while (intersect([A], [B]).length === 0 || res.length === 0 || (A.lo === B.lo && A.hi === B.hi));
    const tex = { cup: "A \\cup B", cap: "A \\cap B", AmB: "A - B", BmA: "B - A" }[op];
    const other = op === "AmB" ? difference([B], [A]) : op === "BmA" ? difference([A], [B]) : op === "cup" ? intersect([A], [B]) : union([A], [B]);
    return {
      statement: `Sean $A = ${ivTex(A)}$ y $B = ${ivTex(B)}$. Calcula $${tex}$.`,
      parts: [
        {
          kind: "interval",
          before: `${tex} =`,
          answer: res,
          mistakes: [
            {
              answer: other,
              feedback:
                op === "AmB" || op === "BmA"
                  ? "Calculaste la diferencia al revés. En $A - B$ te quedas con lo de $A$ que no toca a $B$."
                  : op === "cup"
                    ? "Eso es la intersección. La unión cubre todo lo que pintan los dos intervalos."
                    : "Eso es la unión. La intersección es solo la parte donde se pisan.",
            },
          ],
        },
      ],
      hints: [
        "Dibuja los dos intervalos sobre la misma recta numérica, uno encima del otro.",
        "Fíjate en cada extremo. Un número entra en el resultado solo si cumple la condición de la operación.",
      ],
      solution: [
        `Sobre la recta, $A$ va de $${fmt(A.lo)}$ a $${fmt(A.hi)}$ y $B$ va de $${fmt(B.lo)}$ a $${fmt(B.hi)}$.`,
        op === "cup"
          ? "La unión es todo lo que está pintado por alguno de los dos."
          : op === "cap"
            ? "La intersección es la zona pintada por los dos a la vez."
            : `La diferencia se queda con lo de $${op === "AmB" ? "A" : "B"}$ que no está en $${op === "AmB" ? "B" : "A"}$. Un extremo que pertenece al conjunto que restas queda fuera.`,
        `Resultado: $${tex} = ${unionTex(res)}$.`,
      ],
    };
  },
};

const complementoIntervalo: ExerciseGen = {
  id: "complemento",
  title: "Complemento en los reales",
  level: 2,
  generate: (r) => {
    const twoParts = r.bool(0.35);
    let A: Interval[];
    if (twoParts) {
      const a = r.int(-7, -2);
      const b = a + r.int(1, 3);
      const c = b + r.int(1, 3);
      const d = c + r.int(1, 4);
      A = [iv(a, b, r.bool(), r.bool()), iv(c, d, r.bool(), r.bool())];
    } else if (r.bool()) {
      A = [randomInterval(r)];
    } else {
      A = [r.bool() ? iv(r.int(-5, 5), Infinity, r.bool(), false) : iv(-Infinity, r.int(-5, 5), false, r.bool())];
    }
    const res = complement(A);
    return {
      statement: `Si el universo es $\\mathbb{R}$, calcula el complemento de $A = ${unionTex(A)}$.`,
      parts: [{ kind: "interval", before: "A^c =", answer: res }],
      hints: [
        "El complemento es todo lo que queda fuera de $A$ en la recta.",
        "Si un extremo estaba incluido en $A$, en el complemento queda excluido, y al revés.",
      ],
      solution: [
        "El complemento $A^c$ son los números reales que no están en $A$.",
        "Cada extremo cambia: lo cerrado pasa a abierto y lo abierto a cerrado.",
        `Resultado: $A^c = ${unionTex(res)}$.`,
      ],
    };
  },
};

const enterosEnIntervalo: ExerciseGen = {
  id: "enteros-sin-cero",
  title: "Enteros que cumplen una condición",
  level: 2,
  exam: true,
  generate: (r) => {
    const a = r.int(-7, -3);
    const b = r.int(1, 4);
    const res = integersIn([iv(a, b)]).filter((x) => x !== 0);
    return {
      statement: `Determina por extensión $B = \\{ x \\in \\mathbb{Z} - \\{0\\} \\;/\\; {${a}} < x < ${b} \\}$.`,
      parts: [
        {
          kind: "set",
          before: "B =",
          answer: res,
          mistakes: [
            { answer: integersIn([iv(a, b)]), feedback: "Incluiste el $0$. El conjunto de referencia es $\\mathbb{Z} - \\{0\\}$, así que el cero no puede estar." },
            { answer: integersIn([iv(a, b, true, true)]).filter((x) => x !== 0), feedback: "Los extremos no entran porque las desigualdades son estrictas." },
          ],
        },
      ],
      hints: ["$\\mathbb{Z} - \\{0\\}$ son todos los enteros menos el cero."],
      solution: [
        `Los enteros entre $${a}$ y $${b}$, sin incluir los extremos, son $${setTex(integersIn([iv(a, b)]))}$.`,
        "Quitamos el $0$ porque no pertenece a $\\mathbb{Z} - \\{0\\}$.",
        `Resultado: $B = ${setTex(res)}$.`,
      ],
    };
  },
};

const conjuntoRacional: ExerciseGen = {
  id: "conjunto-inecuacion",
  title: "Conjuntos definidos por una inecuación (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    // A = { x ∈ R / (x + a)/(x - b) op k }
    const b = r.int(-3, 4);
    const k = r.pick([1, 1, 2, -1]);
    const op = r.pick(["<", ">", "<=", ">="] as const);
    let a: number;
    let numRoot: number | null = null;
    if (k === 1) {
      do a = r.nz(-6, 6); while (a + b === 0);
    } else {
      // Escoger la raíz del numerador entera y deducir a
      do numRoot = r.int(-6, 6); while (numRoot === b);
      a = -numRoot * (1 - k) - k * b;
    }
    const opTex = { "<": "<", ">": ">", "<=": "\\le", ">=": "\\ge" }[op];
    const lead = k === 1 ? a + b : 1 - k;
    const factors = k === 1 ? [{ root: b, den: true }] : [{ root: numRoot! }, { root: b, den: true }];
    const A = signSolve(factors, lead, op);
    const lo = r.int(-6, -3);
    const hi = r.int(2, 4);
    const Bset = integersIn([iv(lo, hi)]).filter((x) => x !== 0);
    const inter = Bset.filter((x) => A.some((I) => intersect([I], [iv(x, x, true, true)]).length));
    const AminusB = minusPoints(A, Bset);
    const numTex = terms([[1 - k, "x"], [a + k * b, ""]]);
    const xa = a === 0 ? "x" : a > 0 ? `x + ${a}` : `x - ${-a}`;
    const xb = b === 0 ? "x" : b > 0 ? `x - ${b}` : `x + ${-b}`;
    const minusK = k === 1 ? `- (${xb})` : k === -1 ? `+ (${xb})` : `- ${k}(${xb})`;
    return {
      statement: `Dados los conjuntos $A = \\left\\{ x \\in \\mathbb{R} \\;/\\; \\dfrac{${xa}}{${xb}} ${opTex} ${k} \\right\\}$ y $B = \\{ x \\in \\mathbb{Z} - \\{0\\} \\;/\\; {${lo}} < x < ${hi} \\}$, resuelve paso a paso.`,
      sequential: true,
      parts: [
        { kind: "interval", prompt: "Determina $A$ como intervalo o unión de intervalos.", before: "A =", answer: A },
        { kind: "set", prompt: "Determina $B$ por extensión.", before: "B =", answer: Bset },
        { kind: "set", prompt: "Determina $A \\cap B$.", before: "A \\cap B =", answer: inter },
        { kind: "interval", prompt: "Determina $A - B$.", before: "A - B =", answer: AminusB },
      ],
      hints: [
        `No multipliques por $${xb}$ sin saber su signo. Pasa el ${k} a la izquierda y saca común denominador.`,
        "Con la fracción comparada con cero, haz una tabla de signos con las raíces del numerador y del denominador.",
        "Para $A - B$, a $A$ le quitas los puntos de $B$ que estén dentro de $A$. Cada punto quitado parte el intervalo.",
      ],
      solution: [
        k > 0
          ? `Restamos ${k} en ambos lados: $\\dfrac{${xa}}{${xb}} - ${k} ${opTex} 0$.`
          : `Sumamos ${-k} en ambos lados: $\\dfrac{${xa}}{${xb}} + ${-k} ${opTex} 0$.`,
        `Con común denominador: $\\dfrac{${xa} ${minusK}}{${xb}} ${opTex} 0$, es decir $\\dfrac{${numTex}}{${xb}} ${opTex} 0$.`,
        k === 1
          ? `El numerador es la constante $${a + b}$, ${a + b > 0 ? "positiva" : "negativa"}. El signo de la fracción depende solo del denominador, y $x = ${b}$ nunca entra porque anula el denominador.`
          : `Los puntos críticos son $x = ${numRoot}$ (numerador) y $x = ${b}$ (denominador, que nunca entra). La tabla de signos da el resultado.`,
        `$A = ${unionTex(A)}$.`,
        `$B = ${setTex(Bset)}$.`,
        `$A \\cap B = ${setTex(inter)}$, los enteros de $B$ que están dentro de $A$.`,
        `$A - B = ${unionTex(AminusB)}$.`,
      ],
    };
  },
};

const vfConjuntos: ExerciseGen = {
  id: "vf-union",
  title: "Verdadero o falso con uniones (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const letters = ["a", "b", "c", "d"];
    const nums = ["1", "2", "3", "4", "5"];
    const U = [...r.sample(letters, 3).sort(), ...r.sample(nums, 4).sort()];
    const A = [U[0], ...r.sample(U.slice(1), 2)].sort();
    const forced = U.filter((x) => !A.includes(x));
    const kind = r.pick(["equal", "contains", "disjoint"] as const);
    let claim: string;
    let isTrue: boolean;
    let why: string;
    if (kind === "equal") {
      const wrongB = r.bool() ? U.filter((x) => /\d/.test(x)) : forced;
      claim = `se puede deducir que $B = ${setTex(wrongB)}$`;
      isTrue = false;
      why = `De $A \\cup B$ solo sabemos que $B$ contiene a $${setTex(forced)}$, los elementos de la unión que no están en $A$. $B$ podría tener además elementos de $A$, así que no se puede deducir un único $B$.`;
    } else if (kind === "contains") {
      claim = `se puede deducir que $${setTex(forced)} \\subseteq B$`;
      isTrue = true;
      why = "Todo elemento de la unión que no está en $A$ tiene que venir de $B$.";
    } else {
      claim = "se puede deducir que $A \\cap B = \\varnothing$";
      isTrue = false;
      why = "Nada impide que $B$ comparta elementos con $A$. La unión no dice nada sobre lo que se repite.";
    }
    return {
      statement: `Si $A \\cup B = ${setTex(U)}$ y $A = ${setTex(A)}$, entonces ${claim}. ¿Verdadero o falso?`,
      parts: [trueFalse(isTrue, why)],
      hints: ["Piensa qué elementos de la unión están obligados a venir de $B$ y cuáles podrían venir de cualquiera de los dos."],
      solution: [
        `Los elementos de $A \\cup B$ que no están en $A$ son $${setTex(forced)}$, y esos tienen que estar en $B$.`,
        "Los elementos de $A$ pueden estar o no en $B$. La unión no lo dice.",
        `${isTrue ? "Verdadero" : "Falso"}. ${why}`,
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("conjuntos"),
  objectives: [
    "Leer y escribir conjuntos por extensión y por comprensión.",
    "Calcular uniones, intersecciones, diferencias y complementos.",
    "Pasar de una desigualdad a un intervalo y operar con intervalos.",
    "Resolver conjuntos definidos por una inecuación, como en el primer parcial.",
  ],
  sections: [
    {
      id: "que-es",
      title: "Qué es un conjunto",
      blocks: [
        {
          type: "text",
          md: "Un conjunto es una colección de objetos bien definida. Bien definida quiere decir que, para cualquier objeto, se puede decidir sin dudas si está o no está en el conjunto. Las vocales del alfabeto forman un conjunto. Los estudiantes altos de tu salón no, porque nadie se pone de acuerdo en qué es ser alto.\n\nLos conjuntos se nombran con letras mayúsculas y sus elementos se escriben entre llaves.",
        },
        {
          type: "definition",
          title: "Pertenencia",
          md: "Si $a$ es un elemento del conjunto $A$ se escribe $a \\in A$ y se lee \"$a$ pertenece a $A$\". Si no lo es, se escribe $a \\notin A$.\n\n$$V = \\{a, e, i, o, u\\} \\qquad e \\in V \\qquad b \\notin V$$",
        },
        {
          type: "text",
          md: "Hay dos maneras de describir un conjunto:\n\n- **Por extensión**, nombrando uno por uno sus elementos: $A = \\{1, 2, 3, 4\\}$.\n- **Por comprensión**, dando la condición que cumplen: $A = \\{ x \\in \\mathbb{N} \\;/\\; x < 5 \\}$.\n\nLa barra $/$ se lee \"tal que\". La segunda forma se lee: \"los $x$ de los naturales tal que $x$ es menor que 5\".",
        },
        {
          type: "example",
          title: "Pasar de comprensión a extensión",
          problem: "Escribe por extensión $A = \\{ x \\in \\mathbb{Z} \\;/\\; {-2} \\le x < 3 \\}$.",
          steps: [
            "Los $x$ tienen que ser enteros, es decir, números sin parte decimal: $\\dots, -2, -1, 0, 1, 2, \\dots$",
            "La condición $-2 \\le x$ deja entrar al $-2$ porque el símbolo $\\le$ incluye la igualdad.",
            "La condición $x < 3$ deja fuera al $3$ porque el símbolo $<$ es estricto.",
          ],
          answer: "$A = \\{-2, -1, 0, 1, 2\\}$",
        },
        { type: "heading", text: "Los conjuntos numéricos" },
        {
          type: "table",
          headers: ["Símbolo", "Nombre", "Qué contiene", "Ejemplos"],
          rows: [
            ["$\\mathbb{N}$", "Naturales", "Los números para contar", "$1, 2, 3, 15$"],
            ["$\\mathbb{Z}$", "Enteros", "Naturales, el cero y los negativos", "$-4, 0, 7$"],
            ["$\\mathbb{Q}$", "Racionales", "Todo lo que se escribe como fracción de enteros", "$\\frac{1}{2}, -0{,}75, 3$"],
            ["$\\mathbb{R}$", "Reales", "Racionales e irracionales: toda la recta", "$\\sqrt{2}, \\pi, -1{,}5$"],
          ],
          caption: "Cada conjunto contiene al anterior: $\\mathbb{N} \\subset \\mathbb{Z} \\subset \\mathbb{Q} \\subset \\mathbb{R}$.",
        },
        {
          type: "note",
          tone: "tip",
          title: "Dos ideas que vas a usar todo el semestre",
          md: "El **conjunto vacío** $\\varnothing$ no tiene elementos. $A$ es **subconjunto** de $B$, y se escribe $A \\subseteq B$, cuando todo elemento de $A$ también está en $B$.\n\nTambién verás escrituras como $\\mathbb{Z} - \\{0\\}$, que significa \"los enteros menos el cero\", o $\\mathbb{R} - \\{1\\}$, \"todos los reales menos el 1\".",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Es cierto que $-3 \\in \\mathbb{N}$?",
            parts: [trueFalse(false, "Los naturales son los números para contar: $1, 2, 3, \\dots$ El $-3$ es entero, pero no natural.")],
            solution: ["$-3$ es negativo, así que no es natural. Sí es entero: $-3 \\in \\mathbb{Z}$."],
          },
        },
      ],
    },
    {
      id: "operaciones",
      title: "Operaciones entre conjuntos",
      blocks: [
        {
          type: "text",
          md: "Con dos conjuntos se pueden armar otros nuevos. Toca los botones del diagrama para ver qué zona corresponde a cada operación.",
        },
        { type: "widget", widget: { kind: "venn", a: ["1", "2", "3", "4"], b: ["3", "4", "5", "6", "7"], universe: ["8", "9"] } },
        {
          type: "table",
          headers: ["Operación", "Contiene", "Con el diagrama"],
          rows: [
            ["Unión $A \\cup B$", "Lo que está en $A$ o en $B$", "$\\{1, 2, 3, 4, 5, 6, 7\\}$"],
            ["Intersección $A \\cap B$", "Lo que está en $A$ y en $B$", "$\\{3, 4\\}$"],
            ["Diferencia $A - B$", "Lo de $A$ que no está en $B$", "$\\{1, 2\\}$"],
            ["Complemento $A^c$", "Lo del universo que no está en $A$", "$\\{5, 6, 7, 8, 9\\}$"],
            ["Diferencia simétrica $A \\triangle B$", "Lo que está en uno solo de los dos", "$\\{1, 2, 5, 6, 7\\}$"],
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "El orden importa en la diferencia",
          md: "$A - B$ y $B - A$ casi nunca son iguales. Con el diagrama de arriba, $A - B = \\{1, 2\\}$ pero $B - A = \\{5, 6, 7\\}$.",
        },
        {
          type: "note",
          tone: "idea",
          title: "Leyes de De Morgan",
          md: "El complemento cambia unión por intersección y al revés:\n\n$$(A \\cup B)^c = A^c \\cap B^c$$\n\n$$(A \\cap B)^c = A^c \\cup B^c$$",
        },
        {
          type: "example",
          title: "Operaciones con conjuntos finitos",
          problem: "Sean $A = \\{2, 4, 6, 8\\}$ y $B = \\{1, 2, 3, 4\\}$. Calcula $A \\cup B$, $A \\cap B$ y $A - B$.",
          steps: [
            "Unión: juntamos todo sin repetir. $A \\cup B = \\{1, 2, 3, 4, 6, 8\\}$.",
            "Intersección: lo que está en los dos. $A \\cap B = \\{2, 4\\}$.",
            "Diferencia: lo de $A$ quitando lo que también está en $B$. $A - B = \\{6, 8\\}$.",
          ],
        },
      ],
    },
    {
      id: "intervalos",
      title: "Intervalos",
      blocks: [
        {
          type: "text",
          md: "Cuando un conjunto tiene infinitos números reales seguidos, como \"todos los números entre 2 y 5\", no se pueden nombrar uno por uno. Para eso existen los intervalos, que son tramos de la recta real.\n\nEl paréntesis indica que el extremo **no** entra y el corchete indica que **sí** entra.",
        },
        {
          type: "table",
          headers: ["Intervalo", "Desigualdad", "Se lee"],
          rows: [
            ["$(a, b)$", "$a < x < b$", "Abierto: sin extremos"],
            ["$[a, b]$", "$a \\le x \\le b$", "Cerrado: con los dos extremos"],
            ["$[a, b)$", "$a \\le x < b$", "Incluye $a$, excluye $b$"],
            ["$(a, b]$", "$a < x \\le b$", "Excluye $a$, incluye $b$"],
            ["$(a, +\\infty)$", "$x > a$", "Todos los mayores que $a$"],
            ["$(-\\infty, b]$", "$x \\le b$", "Todos los menores o iguales a $b$"],
          ],
        },
        { type: "widget", widget: { kind: "numberline", set: [iv(-2, 3, true, false)], label: "[-2, 3)" }, caption: "El intervalo $[-2, 3)$: el punto relleno entra, el punto hueco no." },
        {
          type: "note",
          tone: "warning",
          title: "El infinito siempre va con paréntesis",
          md: "$\\infty$ no es un número al que se llegue, solo indica que el tramo no termina. Por eso $[3, +\\infty]$ está mal escrito. Lo correcto es $[3, +\\infty)$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Escribe como intervalo los $x$ que cumplen $-1 < x \\le 4$.",
            parts: [{ kind: "interval", answer: [iv(-1, 4, false, true)] }],
            solution: ["El $-1$ no entra porque la desigualdad es estricta, y el $4$ sí entra. Resultado: $(-1, 4]$."],
          },
        },
      ],
    },
    {
      id: "operaciones-intervalos",
      title: "Operaciones con intervalos",
      blocks: [
        {
          type: "text",
          md: "Las operaciones con intervalos son las mismas que con conjuntos finitos. La diferencia es que ahora conviene dibujar. Pon los dos intervalos sobre la misma recta, uno arriba del otro, y lee el resultado mirando el dibujo.",
        },
        {
          type: "example",
          title: "Unión, intersección y diferencia",
          problem: "Sean $A = [-2, 3)$ y $B = (1, 5]$. Calcula $A \\cup B$, $A \\cap B$, $A - B$ y $B - A$.",
          steps: [
            "Unión: todo lo pintado por alguno. Va desde $-2$, que está en $A$, hasta $5$, que está en $B$. $A \\cup B = [-2, 5]$.",
            "Intersección: donde se pisan. Empieza después de $1$ (el $1$ no está en $B$) y termina antes de $3$ (el $3$ no está en $A$). $A \\cap B = (1, 3)$.",
            "$A - B$: lo de $A$ que no toca a $B$. Va desde $-2$ hasta $1$, y el $1$ sí entra porque no pertenece a $B$. $A - B = [-2, 1]$.",
            "$B - A$: lo de $B$ que no toca a $A$. Va desde $3$, que entra porque no está en $A$, hasta $5$. $B - A = [3, 5]$.",
          ],
        },
        { type: "widget", widget: { kind: "numberline", set: [iv(-2, 3, true, false)], range: [-4, 7], label: "A = [-2, 3)" } },
        { type: "widget", widget: { kind: "numberline", set: [iv(1, 5, false, true)], range: [-4, 7], label: "B = (1, 5]" } },
        { type: "widget", widget: { kind: "numberline", set: [iv(1, 3)], range: [-4, 7], label: "A ∩ B = (1, 3)" } },
        {
          type: "note",
          tone: "tip",
          title: "El truco de los extremos",
          md: "En una diferencia $A - B$, un extremo que pertenece a $B$ queda fuera del resultado y un extremo que no pertenece a $B$ queda dentro. El paréntesis se convierte en corchete y al revés.",
        },
        {
          type: "text",
          md: "Quitar puntos sueltos también parte un intervalo. Por ejemplo, $\\mathbb{R} - \\{1\\} = (-\\infty, 1) \\cup (1, +\\infty)$, y $(0, 5) - \\{2, 3\\} = (0, 2) \\cup (2, 3) \\cup (3, 5)$.",
        },
      ],
    },
    {
      id: "inecuaciones",
      title: "Conjuntos definidos por una inecuación",
      blocks: [
        {
          type: "text",
          md: "En el primer parcial es común que un conjunto venga dado por una inecuación. Para escribirlo como intervalo hay que resolverla. Si aún no dominas las inecuaciones, repasa el tema de nivelación **Desigualdades e inecuaciones** y vuelve aquí.",
        },
        {
          type: "example",
          title: "Ejercicio tipo parcial",
          problem: "Dados $A = \\left\\{ x \\in \\mathbb{R} \\;/\\; \\dfrac{x+4}{x-2} < 1 \\right\\}$ y $B = \\{ x \\in \\mathbb{Z} - \\{0\\} \\;/\\; {-5} < x < 2 \\}$, determina $A$, $B$, $A - B$ y $A \\cap B$.",
          steps: [
            "No se puede multiplicar por $x - 2$ porque no sabemos si es positivo o negativo, y eso decide si la desigualdad se voltea. Mejor pasamos el $1$ restando: $\\dfrac{x+4}{x-2} - 1 < 0$.",
            "Común denominador: $\\dfrac{x + 4 - (x - 2)}{x-2} < 0$, que queda $\\dfrac{6}{x-2} < 0$.",
            "El numerador $6$ es positivo, así que la fracción es negativa justo cuando $x - 2 < 0$, es decir, $x < 2$. Por lo tanto $A = (-\\infty, 2)$.",
            "Para $B$ buscamos los enteros entre $-5$ y $2$ sin los extremos y sin el cero: $B = \\{-4, -3, -2, -1, 1\\}$.",
            "Todos los elementos de $B$ son menores que $2$, así que están en $A$. Entonces $A \\cap B = B = \\{-4, -3, -2, -1, 1\\}$.",
            "$A - B$ es $A$ sin esos cinco puntos. Cada punto quitado corta el intervalo: $A - B = (-\\infty, -4) \\cup (-4, -3) \\cup (-3, -2) \\cup (-2, -1) \\cup (-1, 1) \\cup (1, 2)$.",
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "El error más común",
          md: "Multiplicar ambos lados por $x - 2$ como si fuera positivo. Si $x - 2$ es negativo, la desigualdad se voltea y el resultado sale mal. Siempre compara con cero y usa una tabla de signos.",
        },
      ],
    },
  ],
  exercises: [
    pertenencia,
    extension,
    operacionesFinitas,
    desigualdadAIntervalo,
    intervaloADesigualdad,
    operacionIntervalos,
    complementoIntervalo,
    enterosEnIntervalo,
    conjuntoRacional,
    vfConjuntos,
  ],
};

export default topic;
