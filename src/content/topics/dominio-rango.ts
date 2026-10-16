import { meta } from "../catalog";
import { choice, trueFalse } from "../helpers";
import type { ExerciseGen, GraphSpec, Part, Rich, Topic } from "../types";
import { iv, minusPoints, R, signSolve, union, unionTex, type Interval } from "@/lib/math/intervals";
import { sameUnion } from "@/lib/math/check";
import { coef, fmt, poly, signed, terms } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

const setTex = (xs: (number | string)[]) => (xs.length ? `\\{${xs.join(", ")}\\}` : "\\varnothing");

/** x - a escrito limpio. */
function xMinus(a: number) {
  return a === 0 ? "x" : a > 0 ? `x - ${a}` : `x + ${-a}`;
}

/** (x - h)^2, o x^2 si h = 0. */
function sq(h: number) {
  return h === 0 ? "x^2" : `(${xMinus(h)})^2`;
}

/** Factor (x - a) entre paréntesis, o solo x si a = 0. */
function fac(a: number) {
  return a === 0 ? "x" : `(${xMinus(a)})`;
}

/** (x - a)(x - b) con el factor x adelante si alguna raíz es 0. */
function prod(a: number, b: number) {
  if (a === 0) return `x${fac(b)}`;
  if (b === 0) return `x${fac(a)}`;
  return `${fac(a)}${fac(b)}`;
}

/** Quita de la lista los errores que coinciden con la respuesta o se repiten. */
function cleanMistakes(answer: Interval[], list: { answer: Interval[]; feedback: Rich }[]) {
  const out: { answer: Interval[]; feedback: Rich }[] = [];
  for (const m of list) {
    if (sameUnion(m.answer, answer)) continue;
    if (out.some((o) => sameUnion(o.answer, m.answer))) continue;
    out.push(m);
  }
  return out;
}

/** "\\mathbb{R} - \\{a, b\\}" */
function rMinusTex(pts: number[]) {
  return `\\mathbb{R} - ${setTex([...pts].sort((a, b) => a - b))}`;
}

/** Desigualdad del tipo x >= r a partir de un intervalo con un extremo infinito. */
function rayIneq(I: Interval) {
  if (!Number.isFinite(I.lo)) return `x ${I.hiClosed ? "\\le" : "<"} ${fmt(I.hi)}`;
  return `x ${I.loClosed ? "\\ge" : ">"} ${fmt(I.lo)}`;
}

/* ----------------------------------- ejercicios ----------------------------------- */

const dominioRacional: ExerciseGen = {
  id: "dominio-racional",
  title: "Dominio de un cociente",
  level: 1,
  generate: (r) => {
    const kind = r.pick(["uno", "dos", "cuadrados"] as const);
    let rule: string, roots: number[], den: string, solve: string;
    if (kind === "uno") {
      const a = r.int(-6, 6);
      const p = r.nz(-4, 4);
      const q = r.int(-6, 6);
      roots = [a];
      den = xMinus(a);
      rule = `\\dfrac{${terms([[p, "x"], [q, ""]])}}{${den}}`;
      solve = `$${den} = 0$ da $x = ${a}$.`;
    } else if (kind === "dos") {
      const r1 = r.int(-5, 3);
      const r2 = r1 + r.int(1, 5);
      roots = [r1, r2];
      den = poly([1, -(r1 + r2), r1 * r2]);
      rule = `\\dfrac{${terms([[1, "x"], [r.int(-5, 5), ""]])}}{${den}}`;
      solve = `$${den} = ${prod(r1, r2)} = 0$ da $x = ${r1}$ o $x = ${r2}$.`;
    } else {
      const k = r.int(1, 6);
      roots = [-k, k];
      den = `x^2 - ${k * k}`;
      rule = `\\dfrac{${r.int(1, 9)}}{${den}}`;
      solve = `$x^2 - ${k * k} = 0$ da $x^2 = ${k * k}$, es decir $x = ${k}$ o $x = -${k}$.`;
    }
    const answer = minusPoints(R, roots);
    const mistakes = cleanMistakes(answer, [
      { answer: R, feedback: "El denominador se anula en algún punto. Esos valores hay que sacarlos del dominio." },
      ...(roots.length === 2
        ? [
            { answer: minusPoints(R, [roots[1]]), feedback: "Te faltó un valor. El denominador se anula en dos puntos." },
            { answer: minusPoints(R, [roots[0]]), feedback: "Te faltó un valor. El denominador se anula en dos puntos." },
          ]
        : []),
    ]);
    return {
      statement: `Halla el dominio de $f(x) = ${rule}$.`,
      parts: [{ kind: "interval", before: "\\text{Dom } f =", answer, mistakes }],
      hints: ["En un cociente lo único prohibido es dividir entre cero.", "Iguala el denominador a cero y resuelve. Esos valores se excluyen."],
      solution: [
        "La única restricción es que el denominador no sea cero.",
        solve,
        `Dominio: $${rMinusTex(roots)} = ${unionTex(answer)}$.`,
      ],
    };
  },
};

const dominioRaizLog: ExerciseGen = {
  id: "dominio-raiz-log",
  title: "Dominio de una raíz o un logaritmo",
  level: 1,
  generate: (r) => {
    const isLog = r.bool();
    const root = r.int(-6, 6);
    const m = r.nz(-3, 3);
    const b = -m * root;
    const inner = terms([[m, "x"], [b, ""]]);
    const rule = isLog ? `\\ln(${inner})` : `\\sqrt{${inner}}`;
    const closed = !isLog;
    const answer = m > 0 ? [iv(root, Infinity, closed, false)] : [iv(-Infinity, root, false, closed)];
    const flipped = m > 0 ? [iv(-Infinity, root, false, closed)] : [iv(root, Infinity, closed, false)];
    const other = m > 0 ? [iv(root, Infinity, !closed, false)] : [iv(-Infinity, root, false, !closed)];
    const sym = isLog ? ">" : "\\ge";
    return {
      statement: `Halla el dominio de $f(x) = ${rule}$.`,
      parts: [
        {
          kind: "interval",
          before: "\\text{Dom } f =",
          answer,
          mistakes: cleanMistakes(answer, [
            { answer: flipped, feedback: m < 0 ? "Al despejar dividiste entre un número negativo. En ese momento la desigualdad se voltea." : "Revisa el sentido de la desigualdad al despejar." },
            {
              answer: other,
              feedback: isLog
                ? `El logaritmo de $0$ no existe, así que $x = ${root}$ no entra. La condición es estricta.`
                : `La raíz de $0$ sí existe y vale $0$, así que $x = ${root}$ entra.`,
            },
          ]),
        },
      ],
      hints: [
        isLog ? "El argumento de un logaritmo tiene que ser estrictamente positivo." : "Lo que está dentro de una raíz cuadrada no puede ser negativo, pero sí puede ser cero.",
        `Resuelve $${inner} ${sym} 0$.`,
      ],
      solution: [
        isLog ? `Condición: $${inner} > 0$.` : `Condición: $${inner} \\ge 0$.`,
        m < 0
          ? `Despejando, $${coef(m, "x")} ${sym} ${-b}$. Al dividir entre $${m}$, que es negativo, la desigualdad se voltea: $${rayIneq(answer[0])}$.`
          : `Despejando, $${coef(m, "x")} ${sym} ${-b}$, así que $${rayIneq(answer[0])}$.`,
        `Dominio: $${unionTex(answer)}$.`,
      ],
    };
  },
};

const condicionDominio: ExerciseGen = {
  id: "condicion-dominio",
  title: "¿Qué condición pide el dominio?",
  level: 1,
  generate: (r) => {
    const a = r.int(-5, 5);
    const inner = xMinus(a);
    const kind = r.pick(["den", "raiz", "log", "libre"] as const);
    const Lden = `$${inner} \\ne 0$`;
    const Lraiz = `$${inner} \\ge 0$`;
    const Llog = `$${inner} > 0$`;
    const Llibre = "Ninguna: el dominio es $\\mathbb{R}$";
    const free = r.pick([`\\sqrt[3]{${inner}}`, `e^{${inner}}`, `(${inner})^3`, `|${inner}|`]);
    const data = {
      den: { rule: `\\dfrac{${r.int(1, 9)}}{${inner}}`, correct: Lden, why: "En un cociente, el denominador no puede ser cero." },
      raiz: { rule: `\\sqrt{${inner}}`, correct: Lraiz, why: "Una raíz cuadrada pide radicando mayor o igual que cero." },
      log: { rule: `\\ln(${inner})`, correct: Llog, why: "Un logaritmo pide argumento estrictamente positivo." },
      libre: { rule: free, correct: Llibre, why: "Raíces impares, exponenciales, potencias y valores absolutos aceptan cualquier número real." },
    }[kind];
    const fb: Record<string, Rich> = {
      [Lden]: "Esa condición es la de un denominador, y esta regla no divide entre esa expresión.",
      [Lraiz]: kind === "log" ? "El logaritmo de $0$ no existe, así que la desigualdad tiene que ser estricta." : "Esa es la condición de una raíz cuadrada, y esta regla no la tiene.",
      [Llog]: kind === "raiz" ? "La raíz de $0$ sí existe. La condición incluye la igualdad." : "Esa es la condición de un logaritmo, y esta regla no lo tiene.",
      [Llibre]: "Esta regla sí tiene una operación con restricción.",
    };
    const wrong = [Lden, Lraiz, Llog, Llibre].filter((l) => l !== data.correct).map((l) => [l, fb[l]] as [Rich, Rich]);
    return {
      statement: `Para hallar el dominio de $f(x) = ${data.rule}$, ¿qué condición hay que imponer?`,
      parts: [choice(data.correct, wrong)],
      hints: ["Hay tres operaciones que restringen el dominio: dividir, sacar raíz de índice par y tomar logaritmo."],
      solution: [data.why, `La condición es ${data.correct.startsWith("$") ? data.correct : "ninguna, y el dominio es $\\mathbb{R}$"}.`],
    };
  },
};

const rangoCuadratica: ExerciseGen = {
  id: "rango-cuadratica",
  title: "Rango de una parábola",
  level: 1,
  generate: (r) => {
    const a = r.pick([1, -1, 2, -2, 3]);
    const h = r.int(-4, 4);
    const k = r.int(-6, 6);
    const rule = `${a === 1 ? "" : a === -1 ? "-" : a}${sq(h)} ${k === 0 ? "" : signed(k)}`;
    const answer = a > 0 ? [iv(k, Infinity, true, false)] : [iv(-Infinity, k, false, true)];
    return {
      statement: `Halla el rango de $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = ${rule}$.`,
      parts: [
        {
          kind: "interval",
          before: "\\text{Ran } f =",
          answer,
          mistakes: [
            { answer: a > 0 ? [iv(k, Infinity)] : [iv(-Infinity, k)], feedback: `El valor $${k}$ sí se alcanza: es la imagen de $x = ${h}$. El extremo va cerrado.` },
            { answer: a > 0 ? [iv(-Infinity, k, false, true)] : [iv(k, Infinity, true, false)], feedback: a > 0 ? "Con coeficiente positivo la parábola abre hacia arriba, así que el vértice es el punto más bajo." : "Con coeficiente negativo la parábola abre hacia abajo, así que el vértice es el punto más alto." },
          ],
        },
      ],
      hints: [
        `Un cuadrado nunca es negativo: $${sq(h)} \\ge 0$.`,
        a > 0 ? "Multiplicar por un positivo no voltea la desigualdad." : "Multiplicar por un negativo voltea la desigualdad.",
      ],
      solution: [
        `Para todo $x$, $${sq(h)} \\ge 0$, y vale $0$ justo en $x = ${h}$.`,
        a > 0
          ? `${a === 1 ? "Sumando" : `Multiplicando por $${a}$ y sumando`} $${k}$: $y \\ge ${k}$. La parábola abre hacia arriba con vértice $(${h}, ${k})$.`
          : `Multiplicando por $${a}$ la desigualdad se voltea, y al sumar $${k}$: $y \\le ${k}$. La parábola abre hacia abajo con vértice $(${h}, ${k})$.`,
        `Rango: $${unionTex(answer)}$.`,
      ],
    };
  },
};

const rangoGrafica: ExerciseGen = {
  id: "rango-grafica",
  title: "Leer el rango en la gráfica",
  level: 1,
  generate: (r) => {
    const quad = r.bool(0.4);
    if (quad) {
      const h = r.int(-1, 1);
      const k = r.int(-4, -1);
      const a = h - r.int(1, 3);
      const b = h + r.int(1, 3);
      const f = (x: number) => (x - h) ** 2 + k;
      const top = Math.max(f(a), f(b));
      const answer = [iv(k, top, true, true)];
      const spec: GraphSpec = {
        x: [-6, 6],
        y: [k - 2, top + 2],
        curves: [{ fn: `${sq(h)} ${signed(k)}`, domain: [a, b], color: "accent" }],
        points: [{ x: a, y: f(a), color: "accent" }, { x: b, y: f(b), color: "accent" }, { x: h, y: k, color: "accent" }],
      };
      return {
        statement: `La gráfica es la de $f: [${a}, ${b}] \\to \\mathbb{R}$. Determina su rango.`,
        graph: spec,
        parts: [
          {
            kind: "interval",
            before: "\\text{Ran } f =",
            answer,
            mistakes: cleanMistakes(answer, [
              { answer: [iv(Math.min(f(a), f(b)), top, true, true)], feedback: "Miraste solo los extremos. La curva baja hasta el vértice, que es el punto más bajo." },
              { answer: [iv(a, b, true, true)], feedback: "Ese es el dominio, sobre el eje $x$. El rango se lee en el eje $y$." },
            ]),
          },
        ],
        hints: ["Proyecta la curva sobre el eje $y$: ¿cuál es su punto más bajo y cuál el más alto?"],
        solution: [
          `El punto más bajo es el vértice $(${h}, ${k})$.`,
          `El más alto es el extremo $(${f(a) >= f(b) ? a : b}, ${top})$, que está incluido.`,
          `Rango: $[${k}, ${top}]$.`,
        ],
      };
    }
    const m = r.pick([1, -1, 2, -2]);
    const a = r.int(-4, -1);
    const b = r.int(1, 3);
    const n = r.int(-2, 2);
    const lc = r.bool();
    const hc = r.bool();
    const fa = m * a + n;
    const fb = m * b + n;
    const lo = Math.min(fa, fb);
    const hi = Math.max(fa, fb);
    const loClosed = m > 0 ? lc : hc;
    const hiClosed = m > 0 ? hc : lc;
    const answer = [iv(lo, hi, loClosed, hiClosed)];
    const dom = iv(a, b, lc, hc);
    const spec: GraphSpec = {
      x: [-6, 6],
      y: [lo - 2, hi + 2],
      step: hi - lo > 10 ? 2 : 1,
      curves: [{ fn: terms([[m, "x"], [n, ""]]), domain: [a, b], color: "accent" }],
      points: [
        { x: a, y: fa, open: !lc, color: "accent" },
        { x: b, y: fb, open: !hc, color: "accent" },
      ],
    };
    return {
      statement: `La gráfica es la de $f: ${unionTex([dom])} \\to \\mathbb{R}$. Determina su rango. Los puntos huecos no pertenecen a la gráfica.`,
      graph: spec,
      parts: [
        {
          kind: "interval",
          before: "\\text{Ran } f =",
          answer,
          mistakes: cleanMistakes(answer, [
            { answer: [dom], feedback: "Ese es el dominio, sobre el eje $x$. El rango se lee en el eje $y$." },
            { answer: [iv(lo, hi, true, true)], feedback: "Un punto hueco significa que ese valor no se alcanza. Ese extremo va abierto." },
          ]),
        },
      ],
      hints: ["Proyecta la gráfica sobre el eje $y$.", "Si el punto del extremo está hueco, ese valor de $y$ no entra en el rango."],
      solution: [
        `La gráfica va de $(${a}, ${fa})$ a $(${b}, ${fb})$.`,
        `Sobre el eje $y$ cubre desde $${lo}$ hasta $${hi}$. El $${lo}$ ${loClosed ? "entra" : "no entra"} y el $${hi}$ ${hiClosed ? "entra" : "no entra"}, según si el punto correspondiente está relleno o hueco.`,
        `Rango: $${unionTex(answer)}$.`,
      ],
    };
  },
};

const dominioCuadraticaRaiz: ExerciseGen = {
  id: "dominio-cuadratica",
  title: "Dominio con un polinomio de grado 2 dentro",
  level: 2,
  generate: (r) => {
    const r1 = r.int(-5, 3);
    const r2 = r1 + r.int(1, 5);
    const lead = r.pick([1, 1, -1]);
    const isLog = r.bool();
    const inner = poly([lead, -lead * (r1 + r2), lead * r1 * r2]);
    const op = isLog ? ">" : ">=";
    const answer = signSolve([{ root: r1 }, { root: r2 }], lead, op);
    const opp = signSolve([{ root: r1 }, { root: r2 }], lead, isLog ? "<" : "<=");
    const swapped = signSolve([{ root: r1 }, { root: r2 }], lead, isLog ? ">=" : ">");
    const rule = isLog ? `\\ln(${inner})` : `\\sqrt{${inner}}`;
    const fact = `${lead < 0 ? "-" : ""}${prod(r1, r2)}`;
    return {
      statement: `Halla el dominio de $f(x) = ${rule}$.`,
      parts: [
        {
          kind: "interval",
          before: "\\text{Dom } f =",
          answer,
          mistakes: cleanMistakes(answer, [
            { answer: opp, feedback: "Esa es la zona donde el polinomio es negativo. Revisa los signos de la tabla." },
            {
              answer: swapped,
              feedback: isLog ? "Las raíces anulan el argumento, y $\\ln 0$ no existe. Van abiertas." : "En las raíces el radicando vale $0$, y $\\sqrt{0} = 0$ existe. Van cerradas.",
            },
          ]),
        },
      ],
      hints: [
        `Factoriza: $${inner} = ${fact}$.`,
        `Resuelve $${fact} ${isLog ? ">" : "\\ge"} 0$ con una tabla de signos.`,
      ],
      solution: [
        `Condición: $${inner} ${isLog ? ">" : "\\ge"} 0$.`,
        `Factorizando, $${fact} ${isLog ? ">" : "\\ge"} 0$. Las raíces son $${r1}$ y $${r2}$.`,
        lead > 0
          ? "El coeficiente principal es positivo: el polinomio es positivo fuera de las raíces y negativo entre ellas."
          : "El coeficiente principal es negativo: el polinomio es positivo entre las raíces y negativo fuera.",
        `Dominio: $${unionTex(answer)}$.`,
      ],
    };
  },
};

const dominioCombinado: ExerciseGen = {
  id: "dominio-combinado",
  title: "Dominio con varias restricciones",
  level: 2,
  generate: (r) => {
    const kind = r.pick(["raizDen", "logDen", "raizLog", "raizAbajo"] as const);
    let rule: string, answer: Interval[], conds: string[], mistakes: { answer: Interval[]; feedback: Rich }[];
    if (kind === "raizDen") {
      const a = r.int(-5, 2);
      const b = a + r.int(1, 4);
      rule = `\\dfrac{\\sqrt{${xMinus(a)}}}{${xMinus(b)}}`;
      answer = minusPoints([iv(a, Infinity, true, false)], [b]);
      conds = [`$${xMinus(a)} \\ge 0$, es decir $x \\ge ${a}$`, `$${xMinus(b)} \\ne 0$, es decir $x \\ne ${b}$`];
      mistakes = [{ answer: [iv(a, Infinity, true, false)], feedback: `Te faltó quitar $x = ${b}$, que anula el denominador.` }];
    } else if (kind === "logDen") {
      const a = r.int(-5, 2);
      const b = a + r.int(1, 4);
      rule = `\\ln(${xMinus(a)}) + \\dfrac{${r.int(1, 5)}}{${xMinus(b)}}`;
      answer = minusPoints([iv(a, Infinity)], [b]);
      conds = [`$${xMinus(a)} > 0$, es decir $x > ${a}$`, `$${xMinus(b)} \\ne 0$, es decir $x \\ne ${b}$`];
      mistakes = [
        { answer: [iv(a, Infinity)], feedback: `Te faltó quitar $x = ${b}$, que anula el denominador.` },
        { answer: minusPoints([iv(a, Infinity, true, false)], [b]), feedback: `El logaritmo de $0$ no existe: $x = ${a}$ no entra.` },
      ];
    } else if (kind === "raizLog") {
      const b = r.int(-5, 1);
      const a = b + r.int(2, 5);
      rule = `\\sqrt{${terms([[a, ""], [-1, "x"]])}} + \\ln(${xMinus(b)})`;
      answer = [iv(b, a, false, true)];
      conds = [`$${terms([[a, ""], [-1, "x"]])} \\ge 0$, es decir $x \\le ${a}$`, `$${xMinus(b)} > 0$, es decir $x > ${b}$`];
      mistakes = [
        { answer: [iv(b, a, true, true)], feedback: `El logaritmo de $0$ no existe: $x = ${b}$ no entra.` },
        { answer: union([iv(-Infinity, a, false, true)], [iv(b, Infinity)]), feedback: "Hiciste la unión de las condiciones. Tienen que cumplirse las dos a la vez, así que va la intersección." },
      ];
    } else {
      const a = r.int(-5, 5);
      rule = `\\dfrac{${r.int(1, 9)}}{\\sqrt{${xMinus(a)}}}`;
      answer = [iv(a, Infinity)];
      conds = [`$${xMinus(a)} \\ge 0$ por la raíz`, `$\\sqrt{${xMinus(a)}} \\ne 0$ por el denominador. Juntas dan $${xMinus(a)} > 0$, es decir $x > ${a}$`];
      mistakes = [{ answer: [iv(a, Infinity, true, false)], feedback: `En $x = ${a}$ la raíz vale $0$ y queda en el denominador. Ese punto no entra.` }];
    }
    return {
      statement: `Halla el dominio de $f(x) = ${rule}$.`,
      parts: [{ kind: "interval", before: "\\text{Dom } f =", answer, mistakes: cleanMistakes(answer, mistakes) }],
      hints: [
        "Anota una condición por cada operación peligrosa: denominador, raíz par, logaritmo.",
        "El dominio es la intersección: los $x$ que cumplen todas las condiciones a la vez.",
      ],
      solution: [
        `Condiciones: ${conds.join(" y ")}.`,
        "Intersectamos las condiciones sobre la recta numérica.",
        `Dominio: $${unionTex(answer)}$.`,
      ],
    };
  },
};

const rangoRacional: ExerciseGen = {
  id: "rango-racional",
  title: "Rango de un cociente por despeje",
  level: 2,
  generate: (r) => {
    let a: number, b: number, c: number;
    do {
      a = r.nz(-4, 4);
      b = r.int(-6, 6);
      c = r.int(-5, 5);
    } while (a * c + b === 0 || a === c);
    const rule = `\\dfrac{${terms([[a, "x"], [b, ""]])}}{${xMinus(c)}}`;
    const answer = minusPoints(R, [a]);
    return {
      statement: `Sea $f: ${rMinusTex([c])} \\to \\mathbb{R} \\;/\\; y = ${rule}$. Halla el rango de $f$.`,
      parts: [
        {
          kind: "interval",
          before: "\\text{Ran } f =",
          answer,
          mistakes: [
            { answer: minusPoints(R, [c]), feedback: `$\\mathbb{R} - \\{${c}\\}$ es el dominio. Para el rango hay que despejar $x$ y ver qué valores de $y$ dan problemas.` },
            { answer: R, feedback: `Al despejar $x$ aparece un denominador $y ${signed(-a)}$. Ese valor de $y$ no tiene preimagen.` },
          ],
        },
      ],
      hints: [
        "Escribe $y = f(x)$ y despeja $x$ en función de $y$.",
        `Multiplica en cruz: $y(${xMinus(c)}) = ${terms([[a, "x"], [b, ""]])}$. Agrupa los términos con $x$.`,
      ],
      solution: [
        `$y(${xMinus(c)}) = ${terms([[a, "x"], [b, ""]])}$, así que $xy ${signed(-c)}y = ${terms([[a, "x"], [b, ""]])}$.`,
        `Agrupando: $x(y ${signed(-a)}) = ${terms([[c, "y"], [b, ""]])}$, y despejando $x = \\dfrac{${terms([[c, "y"], [b, ""]])}}{y ${signed(-a)}}$.`,
        `Ese despeje existe para todo $y \\ne ${a}$. Además nunca da $x = ${c}$, porque eso exigiría $${a * c + b} = 0$.`,
        `Rango: $${rMinusTex([a])}$.`,
      ],
    };
  },
};

const rangoRaizExp: ExerciseGen = {
  id: "rango-raiz-exp",
  title: "Rango de raíces, exponenciales y valor absoluto",
  level: 2,
  generate: (r) => {
    const kind = r.pick(["raizMas", "raizMenos", "exp", "expMenos", "abs"] as const);
    const h = r.int(-4, 4);
    const k = r.int(-5, 5);
    let rule: string, answer: Interval[], why: string, open: Interval[];
    if (kind === "raizMas") {
      rule = `\\sqrt{${xMinus(h)}} ${signed(k)}`;
      answer = [iv(k, Infinity, true, false)];
      open = [iv(k, Infinity)];
      why = `$\\sqrt{${xMinus(h)}} \\ge 0$ y vale $0$ en $x = ${h}$. Sumando $${k}$: $y \\ge ${k}$.`;
    } else if (kind === "raizMenos") {
      rule = `${k} - \\sqrt{${xMinus(h)}}`;
      answer = [iv(-Infinity, k, false, true)];
      open = [iv(-Infinity, k)];
      why = `$\\sqrt{${xMinus(h)}} \\ge 0$, así que $-\\sqrt{${xMinus(h)}} \\le 0$ y $y \\le ${k}$. El $${k}$ se alcanza en $x = ${h}$.`;
    } else if (kind === "exp") {
      rule = `e^{${xMinus(h)}} ${signed(k)}`;
      answer = [iv(k, Infinity)];
      open = [iv(k, Infinity, true, false)];
      why = `$e^{${xMinus(h)}} > 0$ y nunca vale $0$. Sumando $${k}$: $y > ${k}$, sin alcanzar el $${k}$.`;
    } else if (kind === "expMenos") {
      rule = `${k} - e^{x}`;
      answer = [iv(-Infinity, k)];
      open = [iv(-Infinity, k, false, true)];
      why = `$e^x > 0$, así que $-e^x < 0$ y $y < ${k}$. El $${k}$ nunca se alcanza.`;
    } else {
      rule = `|${xMinus(h)}| ${signed(k)}`;
      answer = [iv(k, Infinity, true, false)];
      open = [iv(k, Infinity)];
      why = `$|${xMinus(h)}| \\ge 0$ y vale $0$ en $x = ${h}$. Sumando $${k}$: $y \\ge ${k}$.`;
    }
    const isExp = kind === "exp" || kind === "expMenos";
    return {
      statement: `Halla el rango de $f(x) = ${rule}$, definida en su dominio natural.`,
      parts: [
        {
          kind: "interval",
          before: "\\text{Ran } f =",
          answer,
          mistakes: [
            {
              answer: open,
              feedback: isExp ? "Una exponencial nunca vale $0$, así que ese extremo no se alcanza." : "Ese extremo sí se alcanza, cuando lo que está dentro vale $0$.",
            },
          ],
        },
      ],
      hints: [
        isExp ? "Recuerda que $e^{\\text{algo}}$ siempre es positivo y nunca llega a $0$." : "Una raíz cuadrada y un valor absoluto nunca son negativos, y pueden valer $0$.",
        "Parte de esa desigualdad y aplícale las operaciones de la regla.",
      ],
      solution: [why, `Rango: $${unionTex(answer)}$.`],
    };
  },
};

const rangoRestringido: ExerciseGen = {
  id: "rango-restringido",
  title: "Rango de una parábola en un intervalo",
  level: 2,
  generate: (r) => {
    const h = r.int(-3, 3);
    const k = r.int(-5, 3);
    const inside = r.bool(0.65);
    let a: number, b: number;
    if (inside) {
      a = h - r.int(1, 3);
      b = h + r.int(1, 3);
    } else if (r.bool()) {
      a = h + r.int(0, 1);
      b = a + r.int(2, 3);
    } else {
      b = h - r.int(0, 1);
      a = b - r.int(2, 3);
    }
    const f = (x: number) => (x - h) ** 2 + k;
    const lo = inside ? k : Math.min(f(a), f(b));
    const hi = Math.max(f(a), f(b));
    const answer = [iv(lo, hi, true, true)];
    const rule = poly([1, -2 * h, h * h + k]);
    return {
      statement: `Halla el rango de $f: [${a}, ${b}] \\to \\mathbb{R} \\;/\\; y = ${rule}$.`,
      parts: [
        {
          kind: "interval",
          before: "\\text{Ran } f =",
          answer,
          mistakes: cleanMistakes(answer, [
            { answer: [iv(Math.min(f(a), f(b)), hi, true, true)], feedback: `Solo evaluaste los extremos. El vértice $x = ${h}$ está dentro de $[${a}, ${b}]$ y ahí la parábola llega a su mínimo, $${k}$.` },
            { answer: [iv(k, Infinity, true, false)], feedback: "Ese sería el rango en todo $\\mathbb{R}$. Aquí el dominio está cortado, así que el rango también." },
          ]),
        },
      ],
      hints: [
        `Completa el cuadrado: $${rule} = ${sq(h)} ${k === 0 ? "" : signed(k)}$. El vértice es $(${h}, ${k})$.`,
        `¿El vértice cae dentro de $[${a}, ${b}]$? Evalúa también los extremos.`,
      ],
      solution: [
        `Completando el cuadrado, $f(x) = ${sq(h)} ${k === 0 ? "" : signed(k)}$. Es una parábola que abre hacia arriba con vértice $(${h}, ${k})$.`,
        inside
          ? `El vértice está dentro del intervalo, así que el mínimo es $${k}$.`
          : h <= a
            ? `En $[${a}, ${b}]$ todos los $x$ cumplen $x \\ge ${h}$, a la derecha del vértice. Ahí la función es creciente y el mínimo está en $x = ${a}$.`
            : `En $[${a}, ${b}]$ todos los $x$ cumplen $x \\le ${h}$, a la izquierda del vértice. Ahí la función es decreciente y el mínimo está en $x = ${b}$.`,
        `$f(${a}) = ${f(a)}$ y $f(${b}) = ${f(b)}$. El máximo es $${hi}$.`,
        `Rango: $[${lo}, ${hi}]$.`,
      ],
    };
  },
};

const noFuncionLog: ExerciseGen = {
  id: "no-funcion-log",
  title: "Restricciones para que sea función (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const r1 = r.int(-3, 2);
    const r2 = r1 + r.int(1, 3);
    const p = r.bool() ? r1 - r.int(2, 6) : r2 + r.int(1, 4);
    const inner = poly([1, -(r1 + r2), r1 * r2]);
    const rule = `\\dfrac{\\ln(${inner})}{${xMinus(p)}}`;
    const logOk = signSolve([{ root: r1 }, { root: r2 }], 1, ">");
    const D = minusPoints(logOk, [p]);
    const parts: Part[] = [
      {
        kind: "choice",
        multiple: true,
        prompt: "Marca **todas** las razones por las cuales $f$ no representa una función de $\\mathbb{R}$ en $\\mathbb{R}$.",
        options: [
          { label: `Los $x$ de $[${r1}, ${r2}]$ no tienen imagen, porque ahí el argumento del logaritmo es menor o igual que cero.`, correct: true },
          { label: `$x = ${p}$ no tiene imagen, porque anula el denominador.`, correct: true },
          { label: "Hay valores de $x$ con dos imágenes.", feedback: "Cada $x$ que sí funciona produce un único número. El problema es de existencia, no de unicidad." },
          { label: "El rango no es todo $\\mathbb{R}$.", feedback: "Eso no impide ser función. Tiene que ver con ser sobreyectiva, no con la definición de función." },
        ],
      },
      {
        kind: "interval",
        prompt: "Restringe el conjunto de partida. ¿Cuál es el conjunto $A$ para que $f: A \\to \\mathbb{R}$ sea función?",
        before: "A =",
        answer: D,
        mistakes: cleanMistakes(D, [
          { answer: logOk, feedback: `Te faltó quitar $x = ${p}$, que anula el denominador.` },
          { answer: minusPoints(signSolve([{ root: r1 }, { root: r2 }], 1, ">="), [p]), feedback: `En $x = ${r1}$ y $x = ${r2}$ el argumento vale $0$, y $\\ln 0$ no existe. Esos extremos van abiertos.` },
          { answer: minusPoints(R, [p]), feedback: "Solo miraste el denominador. El logaritmo también restringe." },
        ]),
      },
      choice(
        `$f: ${unionTex(D)} \\to \\mathbb{R} \\;/\\; y = ${rule}$`,
        [
          [`$f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = ${rule}$`, "Con $\\mathbb{R}$ como conjunto de partida no es función. Hay que poner el dominio que hallaste."],
          [`$f: ${unionTex(logOk)} \\to \\mathbb{R} \\;/\\; y = ${rule}$`, `Ese conjunto todavía contiene a $${p}$, que no tiene imagen.`],
          [`$f: ${unionTex(D)} \\to \\mathbb{R}$`, "Falta la regla de correspondencia. Definir la función es dar dominio, conjunto de llegada y regla."],
        ],
        "¿Cuál es la definición correcta de la función?",
      ),
    ];
    return {
      statement: `Sea $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = ${rule}$. Resuelve paso a paso.`,
      sequential: true,
      parts,
      hints: [
        "Hay dos operaciones con restricción: el logaritmo pide argumento positivo y el cociente pide denominador distinto de cero.",
        `Factoriza $${inner} = ${prod(r1, r2)}$ y haz la tabla de signos.`,
      ],
      solution: [
        `Logaritmo: $${prod(r1, r2)} > 0$ da $${unionTex(logOk)}$. Los $x$ de $[${r1}, ${r2}]$ no tienen imagen.`,
        `Denominador: $${xMinus(p)} \\ne 0$, así que $x \\ne ${p}$, que también queda sin imagen.`,
        `Intersectando: $A = ${unionTex(D)}$.`,
        `Definición: $f: ${unionTex(D)} \\to \\mathbb{R} \\;/\\; y = ${rule}$.`,
      ],
    };
  },
};

const pruebaCorta: ExerciseGen = {
  id: "prueba-corta-raiz",
  title: "Dominio, imagen y sobreyectividad (tipo prueba corta)",
  level: 3,
  exam: true,
  generate: (r) => {
    const a = r.int(1, 4);
    const p = r.int(1, 6);
    const yNeg = -r.int(1, 6);
    const x0 = r.pick([0, ...[-2, -1, 0].filter((x) => x < a)]);
    const rule = `\\sqrt{\\dfrac{x^2 + ${p}}{${xMinus(a)}}}`;
    const D = [iv(a, Infinity)];
    const val = `\\sqrt{\\dfrac{${x0 * x0 + p}}{${x0 - a}}}`;
    return {
      statement: `Dada la relación $R: \\mathbb{R} \\to \\mathbb{R} \\;/\\; f(x) = ${rule}$, responde paso a paso.`,
      sequential: true,
      parts: [
        choice(
          "No, porque hay números reales sin imagen.",
          [
            ["Sí, porque toda raíz cuadrada es una función.", `Prueba con $x = ${x0}$: el radicando queda negativo.`],
            ["No, porque algunos $x$ tienen dos imágenes, la raíz positiva y la negativa.", "El símbolo $\\sqrt{\\;}$ denota solo la raíz no negativa. Cada $x$ válido da un único valor."],
            ["No, porque el numerador puede anularse.", `$x^2 + ${p} > 0$ siempre, nunca se anula.`],
          ],
          "¿Es $R$ una función real de variable real?",
        ),
        {
          kind: "interval",
          prompt: "Haz las restricciones necesarias. ¿Cuál es el dominio de la función?",
          before: "\\text{Dom } f =",
          answer: D,
          mistakes: [
            { answer: [iv(a, Infinity, true, false)], feedback: `En $x = ${a}$ el denominador vale $0$. Ese punto no entra.` },
            { answer: minusPoints(R, [a]), feedback: "Solo quitaste el cero del denominador. El radicando también tiene que ser no negativo." },
          ],
        },
        choice(
          `Porque $f(${x0}) = ${val}$ es la raíz cuadrada de un número negativo.`,
          [
            [`Porque el denominador se anula en $x = ${x0}$.`, `En $x = ${x0}$ el denominador vale $${x0 - a}$, no cero.`],
            [`Porque $${x0}$ no pertenece al conjunto de llegada.`, "El conjunto de llegada es $\\mathbb{R}$ y no tiene que ver con los $x$ que entran."],
            [`Porque la imagen de $${x0}$ es $0$.`, "Si fuera $0$ sí tendría imagen. El problema es que el radicando es negativo."],
          ],
          `¿Por qué $x = ${x0}$ no tiene imagen?`,
        ),
        choice(
          "Porque una raíz cuadrada nunca da un resultado negativo.",
          [
            [`Porque $${yNeg}$ no pertenece al dominio.`, "El dominio es de los $x$. Aquí la pregunta es si algún $x$ produce ese valor de $y$."],
            [`Porque al sustituir $x = ${yNeg}$ no se obtiene un número real.`, `Eso dice que $${yNeg}$ no tiene imagen. La pregunta es si $${yNeg}$ es imagen de alguien.`],
            ["Porque $f$ no es inyectiva.", "La inyectividad trata de imágenes repetidas, no de valores que nunca se alcanzan."],
          ],
          `¿Por qué $y = ${yNeg}$ no es imagen de ningún $x$?`,
        ),
        choice(
          "Porque el conjunto de llegada es $\\mathbb{R}$ y los números negativos no son imagen de nadie: el rango no coincide con el conjunto de llegada.",
          [
            ["Porque hay $x$ reales sin imagen.", "Eso tiene que ver con ser función. Ser sobreyectiva es una propiedad del conjunto de llegada."],
            ["Porque no es inyectiva.", "Inyectiva y sobreyectiva son propiedades independientes."],
            ["Porque el dominio no es $\\mathbb{R}$.", "Lo que decide la sobreyectividad es el rango comparado con el conjunto de llegada."],
          ],
          "Con $f: \\text{Dom } f \\to \\mathbb{R}$, ¿por qué $f$ no es sobreyectiva?",
        ),
      ],
      hints: [
        `El numerador $x^2 + ${p}$ siempre es positivo. El signo del radicando lo decide el denominador.`,
        "Para el dominio, el radicando tiene que ser mayor o igual que cero y el denominador distinto de cero.",
      ],
      solution: [
        `$x^2 + ${p} > 0$ para todo $x$. Entonces $\\dfrac{x^2 + ${p}}{${xMinus(a)}} \\ge 0$ exactamente cuando $${xMinus(a)} > 0$. El caso $= 0$ no se da porque el numerador no se anula, y $x = ${a}$ queda fuera por el denominador.`,
        `Dominio: $(${a}, +\\infty)$. Los $x \\le ${a}$ no tienen imagen, así que $R: \\mathbb{R} \\to \\mathbb{R}$ no es función. Restringida queda $f: (${a}, +\\infty) \\to \\mathbb{R} \\;/\\; y = ${rule}$.`,
        `$f(${x0}) = ${val}$: radicando negativo, sin imagen real.`,
        `$y = ${yNeg}$ exigiría una raíz cuadrada negativa, imposible.`,
        "El rango está dentro de $(0, +\\infty)$ y el conjunto de llegada es $\\mathbb{R}$. Como $\\text{Ran } f \\ne \\mathbb{R}$, no es sobreyectiva.",
      ],
    };
  },
};

const conjuntoParaRango: ExerciseGen = {
  id: "conjunto-para-rango",
  title: "Hallar el dominio a partir del rango (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const cube = r.bool();
    const c = r.int(-3, 6);
    let rule: string, m: number, A: Interval[], steps: string[], bound: number;
    if (cube) {
      m = r.pick([1, 2, -1]);
      bound = c - m ** 3;
      rule = `\\sqrt[3]{${terms([[c, ""], [-1, "x"]])}}`;
      A = [iv(-Infinity, bound, false, true)];
      steps = [
        `Queremos $\\sqrt[3]{${terms([[c, ""], [-1, "x"]])}} \\ge ${m}$. Elevar al cubo conserva la desigualdad: $${terms([[c, ""], [-1, "x"]])} \\ge ${m ** 3}$.`,
        `Despejando: $-x \\ge ${m ** 3 - c}$, es decir $x \\le ${bound}$.`,
        `Como la raíz cúbica de $${terms([[c, ""], [-1, "x"]])}$ es decreciente, al bajar $x$ la imagen sube sin límite. Así se cubre todo $[${m}, +\\infty)$.`,
      ];
    } else {
      m = r.int(1, 3);
      bound = c + m * m;
      rule = `\\sqrt{${xMinus(c)}}`;
      A = [iv(bound, Infinity, true, false)];
      steps = [
        `Queremos $\\sqrt{${xMinus(c)}} \\ge ${m}$. Los dos lados son no negativos, así que podemos elevar al cuadrado: $${xMinus(c)} \\ge ${m * m}$.`,
        `Despejando: $x \\ge ${bound}$.`,
        `La raíz es creciente y no acotada, así que con $x \\ge ${bound}$ las imágenes cubren todo $[${m}, +\\infty)$.`,
      ];
    }
    const claimSet = cube ? [iv(c, Infinity, true, false)] : [iv(c, Infinity, true, false)];
    return {
      statement: `Dada la función $f: A \\subseteq \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = ${rule}$, se quiere que el rango sea $[${m}, +\\infty)$.`,
      sequential: true,
      parts: [
        trueFalse(
          false,
          cube
            ? `Con $x \\ge ${c}$ el radicando $${terms([[c, ""], [-1, "x"]])}$ es menor o igual que cero, y las imágenes quedan en $(-\\infty, 0]$.`
            : `Con $x \\ge ${c}$ las imágenes empiezan en $\\sqrt{0} = 0$, no en $${m}$.`,
          `¿Verdadero o falso? Para eso, el conjunto $A$ es $${unionTex(claimSet)}$.`,
        ),
        {
          kind: "interval",
          prompt: "Halla el conjunto $A$ correcto.",
          before: "A =",
          answer: A,
          mistakes: cleanMistakes(A, [
            { answer: claimSet, feedback: "Ese conjunto no produce el rango pedido. Plantea la desigualdad $f(x) \\ge$ el extremo del rango y despeja." },
            {
              answer: cube ? [iv(bound, Infinity, true, false)] : [iv(-Infinity, bound, false, true)],
              feedback: cube ? "Al despejar $-x$ y pasar a $x$, la desigualdad se voltea." : "Revisa el sentido de la desigualdad: la raíz crece cuando $x$ crece.",
            },
          ]),
        },
      ],
      hints: [
        `Plantea $${rule} \\ge ${m}$ y despeja $x$.`,
        cube ? "Elevar al cubo no cambia el sentido de una desigualdad, ni siquiera con negativos." : "Elevar al cuadrado conserva la desigualdad cuando los dos lados son no negativos.",
      ],
      solution: [...steps, `Por lo tanto $A = ${unionTex(A)}$, y la afirmación del enunciado es falsa.`],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("dominio-rango"),
  objectives: [
    "Hallar el dominio natural de polinomios, cocientes, raíces pares, logaritmos y sus combinaciones.",
    "Hallar el rango despejando $x$ o leyendo la gráfica.",
    "Argumentar por qué una relación de $\\mathbb{R}$ en $\\mathbb{R}$ no es función.",
    "Hacer las restricciones necesarias y definir la función completa, como piden los parciales.",
  ],
  sections: [
    {
      id: "idea",
      title: "Qué son el dominio y el rango",
      blocks: [
        {
          type: "text",
          md: "El **dominio** de una función son los valores de $x$ que puedes meter en ella. El **rango** son los valores de $y$ que efectivamente salen.\n\nCuando un ejercicio solo da la regla, por ejemplo $f(x) = \\sqrt{x - 1}$, se sobrentiende el **dominio natural**: el conjunto más grande de números reales para los que la regla produce un número real. Hallar ese dominio es la tarea más frecuente del primer parcial.",
        },
        {
          type: "definition",
          title: "Dominio y rango",
          md: "Para $f: A \\to B \\;/\\; y = f(x)$:\n\n- $\\text{Dom } f$ es el conjunto de preimágenes. Para que $f$ sea función, $\\text{Dom } f = A$.\n- $\\text{Ran } f = \\{y \\in B \\;/\\; y = f(x) \\text{ para algún } x \\in A\\}$ es el conjunto de imágenes. Siempre $\\text{Ran } f \\subseteq B$.",
        },
        {
          type: "graph",
          spec: {
            x: [-3, 7],
            y: [-2, 5],
            curves: [{ fn: "\\sqrt{x + 2}", domain: [-2, 7], color: "accent" }],
            points: [{ x: -2, y: 0, color: "accent" }],
            segments: [
              { from: [-2, -0.15], to: [7, -0.15], color: "blue" },
              { from: [-2.85, 0], to: [-2.85, 5], color: "green" },
            ],
          },
          caption: "$f(x) = \\sqrt{x + 2}$. Su sombra sobre el eje $x$ (azul) es el dominio, $[-2, +\\infty)$. Su sombra sobre el eje $y$ (verde) es el rango, $[0, +\\infty)$.",
        },
        {
          type: "note",
          tone: "tip",
          title: "Dominio en el eje x, rango en el eje y",
          md: "Mirando una gráfica, el dominio es la sombra que proyecta sobre el eje horizontal y el rango la que proyecta sobre el eje vertical.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Sea $f: \\{0, 1, 2, 3\\} \\to \\mathbb{R} \\;/\\; y = x^2 - 2x$. Halla el rango.",
            parts: [{ kind: "set", before: "\\text{Ran } f =", answer: [-1, 0, 3], mistakes: [{ answer: [0, 1, 2, 3], feedback: "Ese es el dominio. Calcula las imágenes." }] }],
            solution: ["$f(0) = 0$, $f(1) = -1$, $f(2) = 0$, $f(3) = 3$. Sin repetir: $\\text{Ran } f = \\{-1, 0, 3\\}$."],
          },
        },
      ],
    },
    {
      id: "reglas",
      title: "Las tres operaciones que restringen el dominio",
      blocks: [
        {
          type: "text",
          md: "Casi todas las operaciones aceptan cualquier número real. Solo tres ponen condiciones, y son las únicas que tienes que vigilar.",
        },
        {
          type: "table",
          headers: ["Si la regla tiene", "Condición", "Ejemplo", "Dominio"],
          rows: [
            ["Solo sumas, restas, productos y potencias naturales", "Ninguna", "$x^3 - 4x + 1$", "$\\mathbb{R}$"],
            ["Un cociente $\\dfrac{P}{Q}$", "$Q \\ne 0$", "$\\dfrac{1}{x - 3}$", "$\\mathbb{R} - \\{3\\}$"],
            ["Una raíz de índice par $\\sqrt{Q}$", "$Q \\ge 0$", "$\\sqrt{x + 2}$", "$[-2, +\\infty)$"],
            ["Un logaritmo $\\ln Q$", "$Q > 0$", "$\\ln(5 - x)$", "$(-\\infty, 5)$"],
            ["Raíz impar, exponencial, valor absoluto", "Ninguna", "$\\sqrt[3]{x}, \\; e^x, \\; |x|$", "$\\mathbb{R}$"],
          ],
        },
        {
          type: "example",
          title: "Un cociente con dos raíces en el denominador",
          problem: "Halla el dominio de $f(x) = \\dfrac{x + 1}{x^2 - 4}$.",
          steps: [
            "La única restricción es el denominador: $x^2 - 4 \\ne 0$.",
            "$x^2 - 4 = 0$ da $x^2 = 4$, es decir $x = 2$ o $x = -2$.",
            "Quitamos esos dos valores de $\\mathbb{R}$.",
          ],
          answer: "$\\text{Dom } f = \\mathbb{R} - \\{-2, 2\\} = (-\\infty, -2) \\cup (-2, 2) \\cup (2, +\\infty)$",
        },
        {
          type: "example",
          title: "Una raíz con coeficiente negativo",
          problem: "Halla el dominio de $f(x) = \\sqrt{6 - 2x}$.",
          steps: [
            "Condición: $6 - 2x \\ge 0$.",
            "$-2x \\ge -6$. Al dividir entre $-2$ la desigualdad se voltea: $x \\le 3$.",
            "El $3$ entra porque $\\sqrt{0} = 0$ existe.",
          ],
          answer: "$\\text{Dom } f = (-\\infty, 3]$",
        },
        {
          type: "example",
          title: "Un logaritmo de un polinomio de grado 2",
          problem: "Halla el dominio de $f(x) = \\ln(x^2 - 3x + 2)$.",
          steps: [
            "Condición: $x^2 - 3x + 2 > 0$.",
            "Factorizamos: $(x - 1)(x - 2) > 0$. Las raíces son $1$ y $2$.",
            "Tabla de signos: el producto es positivo antes de $1$ y después de $2$, y negativo entre ellos.",
            "Los extremos no entran porque la desigualdad es estricta.",
          ],
          answer: "$\\text{Dom } f = (-\\infty, 1) \\cup (2, +\\infty)$",
        },
        { type: "widget", widget: { kind: "numberline", set: [iv(-Infinity, 1), iv(2, Infinity)], range: [-3, 5], label: "(-∞, 1) ∪ (2, +∞)" }, caption: "Dominio de $\\ln(x^2 - 3x + 2)$." },
        {
          type: "note",
          tone: "warning",
          title: "Cero en la raíz sí, cero en el logaritmo no",
          md: "$\\sqrt{0} = 0$ existe, así que en una raíz los extremos van cerrados. $\\ln 0$ no existe, así que en un logaritmo van abiertos. Y si la raíz está en un denominador, el cero vuelve a quedar fuera.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Halla el dominio de $f(x) = \\ln(x + 4)$.",
            parts: [{ kind: "interval", before: "\\text{Dom } f =", answer: [iv(-4, Infinity)], mistakes: [{ answer: [iv(-4, Infinity, true, false)], feedback: "$\\ln 0$ no existe, así que el $-4$ no entra." }] }],
            solution: ["$x + 4 > 0$ da $x > -4$. Dominio: $(-4, +\\infty)$."],
          },
        },
      ],
    },
    {
      id: "combinaciones",
      title: "Varias restricciones a la vez",
      blocks: [
        {
          type: "text",
          md: "Cuando la regla mezcla varias operaciones, anota una condición por cada operación peligrosa y después **intersecta**: el dominio son los $x$ que cumplen todas a la vez. Dibujar cada condición sobre la misma recta numérica evita errores.",
        },
        {
          type: "example",
          title: "Raíz arriba, cociente abajo",
          problem: "Halla el dominio de $f(x) = \\dfrac{\\sqrt{x + 3}}{x - 2}$.",
          steps: [
            "Raíz: $x + 3 \\ge 0$, es decir $x \\ge -3$.",
            "Denominador: $x - 2 \\ne 0$, es decir $x \\ne 2$.",
            "Intersección: los $x \\ge -3$ quitando el $2$.",
          ],
          answer: "$\\text{Dom } f = [-3, 2) \\cup (2, +\\infty)$",
        },
        {
          type: "example",
          title: "Una raíz de un cociente (prueba corta)",
          problem: "Halla el dominio de $f(x) = \\sqrt{\\dfrac{x^2 + 2}{x - 1}}$.",
          steps: [
            "Condición de la raíz: $\\dfrac{x^2 + 2}{x - 1} \\ge 0$. Condición del cociente: $x \\ne 1$.",
            "El numerador $x^2 + 2$ es siempre positivo, porque $x^2 \\ge 0$. Nunca se anula.",
            "Entonces el signo de la fracción es el del denominador. Necesitamos $x - 1 > 0$, estricto porque $x = 1$ anula el denominador.",
          ],
          answer: "$\\text{Dom } f = (1, +\\infty)$",
        },
        {
          type: "note",
          tone: "tip",
          title: "Factores que siempre son positivos",
          md: "Expresiones como $x^2 + 2$, $e^x$ o $x^2 + x + 1$ (discriminante negativo) nunca cambian de signo. En una tabla de signos se pueden ignorar, lo que ahorra mucho trabajo.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Halla el dominio de $f(x) = \\sqrt{4 - x} + \\ln(x + 1)$.",
            parts: [{ kind: "interval", before: "\\text{Dom } f =", answer: [iv(-1, 4, false, true)] }],
            solution: ["Raíz: $4 - x \\ge 0$, así que $x \\le 4$. Logaritmo: $x + 1 > 0$, así que $x > -1$.", "Intersección: $(-1, 4]$."],
          },
        },
      ],
    },
    {
      id: "rango-despeje",
      title: "Hallar el rango despejando",
      blocks: [
        {
          type: "text",
          md: "El rango responde la pregunta: ¿qué valores de $y$ tienen al menos una preimagen? Eso se averigua despejando. Escribe $y = f(x)$, despeja $x$ en función de $y$ y mira para qué valores de $y$ ese despeje existe y cae dentro del dominio.",
        },
        {
          type: "example",
          title: "Rango de un cociente",
          problem: "Halla el rango de $f: \\mathbb{R} - \\{3\\} \\to \\mathbb{R} \\;/\\; y = \\dfrac{2x + 1}{x - 3}$.",
          steps: [
            "Multiplicamos en cruz: $y(x - 3) = 2x + 1$, es decir $xy - 3y = 2x + 1$.",
            "Agrupamos los términos con $x$: $xy - 2x = 3y + 1$, así que $x(y - 2) = 3y + 1$.",
            "Despejamos: $x = \\dfrac{3y + 1}{y - 2}$. Este despeje existe para todo $y \\ne 2$.",
            "Revisamos que nunca dé $x = 3$: $\\dfrac{3y + 1}{y - 2} = 3$ llevaría a $3y + 1 = 3y - 6$, imposible.",
          ],
          answer: "$\\text{Ran } f = \\mathbb{R} - \\{2\\}$",
        },
        {
          type: "example",
          title: "Rango de una raíz desplazada",
          problem: "Halla el rango de $f(x) = \\sqrt{x - 1} + 2$.",
          steps: [
            "$y - 2 = \\sqrt{x - 1}$. Como la raíz nunca es negativa, necesitamos $y - 2 \\ge 0$, es decir $y \\ge 2$.",
            "Con $y \\ge 2$ elevamos al cuadrado: $x = (y - 2)^2 + 1$, que siempre es $\\ge 1$ y cae en el dominio.",
          ],
          answer: "$\\text{Ran } f = [2, +\\infty)$",
        },
        {
          type: "note",
          tone: "warning",
          title: "El despeje esconde condiciones",
          md: "Al elevar al cuadrado se pierde la información de que la raíz era no negativa. Si en el ejemplo anterior solo miras $x = (y - 2)^2 + 1$, parece que todo $y$ sirve. Anota la condición $y - 2 \\ge 0$ **antes** de elevar.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Rango de una demanda",
          md: "Si la demanda es $q = 120 - 3p$ con $p \\in [0, 40]$, la cantidad va de $q = 120$ (precio cero) a $q = 0$ (precio $40$). El rango es $[0, 120]$: son todas las cantidades que el mercado puede llegar a demandar.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Halla el rango de $f(x) = e^x + 3$.",
            parts: [{ kind: "interval", before: "\\text{Ran } f =", answer: [iv(3, Infinity)], mistakes: [{ answer: [iv(3, Infinity, true, false)], feedback: "$e^x$ nunca vale $0$, así que $y = 3$ no se alcanza." }] }],
            solution: ["$e^x > 0$, así que $e^x + 3 > 3$. Despejando, $x = \\ln(y - 3)$ existe para todo $y > 3$. Rango: $(3, +\\infty)$."],
          },
        },
      ],
    },
    {
      id: "rango-grafica",
      title: "Leer el rango en la gráfica",
      blocks: [
        {
          type: "text",
          md: "Si tienes la gráfica, el rango se lee proyectándola sobre el eje $y$. Busca el punto más bajo y el más alto, y revisa si esos valores se alcanzan (punto relleno) o no (punto hueco o asíntota).",
        },
        {
          type: "graph",
          spec: {
            x: [-3, 6],
            y: [-5, 6],
            curves: [{ fn: "x^2 - 2x - 3", domain: [-1, 4], color: "accent" }],
            points: [
              { x: -1, y: 0, color: "accent" },
              { x: 4, y: 5, color: "accent", label: "(4, 5)" },
              { x: 1, y: -4, color: "accent", label: "(1, −4)" },
            ],
            hlines: [
              { y: 5, color: "green", dashed: true },
              { y: -4, color: "green", dashed: true },
            ],
          },
          caption: "$f: [-1, 4] \\to \\mathbb{R} \\;/\\; y = x^2 - 2x - 3$. El rango va del vértice al extremo más alto: $[-4, 5]$.",
        },
        {
          type: "example",
          title: "Parábola con dominio recortado",
          problem: "Halla el rango de $f: [-1, 4] \\to \\mathbb{R} \\;/\\; y = x^2 - 2x - 3$.",
          steps: [
            "Completamos el cuadrado: $x^2 - 2x - 3 = (x - 1)^2 - 4$. Vértice en $(1, -4)$, abre hacia arriba.",
            "El vértice está dentro de $[-1, 4]$, así que el mínimo es $-4$.",
            "Evaluamos los extremos: $f(-1) = 0$ y $f(4) = 5$. El máximo es $5$.",
          ],
          answer: "$\\text{Ran } f = [-4, 5]$. Evaluar solo los extremos habría dado $[0, 5]$, que está mal.",
        },
        {
          type: "widget",
          widget: {
            kind: "sliders",
            fn: "a(x-h)^2+k",
            params: [
              { name: "a", min: -3, max: 3, step: 0.5, value: 1 },
              { name: "h", min: -4, max: 4, step: 1, value: 1 },
              { name: "k", min: -4, max: 4, step: 1, value: -2 },
            ],
            x: [-6, 6],
            y: [-6, 6],
            formula: "f(x) = a(x - h)^2 + k \\qquad a = {a},\\; h = {h},\\; k = {k}",
          },
          caption: "Mueve $a$, $h$ y $k$. Con $a > 0$ el rango es $[k, +\\infty)$ y con $a < 0$ es $(-\\infty, k]$. El valor de $h$ no cambia el rango.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Halla el rango de $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = -(x + 2)^2 + 5$.",
            parts: [{ kind: "interval", before: "\\text{Ran } f =", answer: [iv(-Infinity, 5, false, true)] }],
            solution: ["Abre hacia abajo con vértice $(-2, 5)$. El punto más alto es $5$ y se alcanza. Rango: $(-\\infty, 5]$."],
          },
        },
      ],
    },
    {
      id: "restricciones",
      title: "Restricciones para que una relación sea función",
      blocks: [
        {
          type: "text",
          md: "En los parciales aparece una y otra vez el mismo enunciado: \"Sea $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = \\dots$. Argumenta todas las razones por las cuales $f$ no es función, haz las restricciones y defínela\".\n\nLa clave es que el enunciado declara $\\mathbb{R}$ como conjunto de partida. Si algún real no tiene imagen, o tiene más de una, la relación no es función de $\\mathbb{R}$ en $\\mathbb{R}$. Las razones posibles son solo dos:\n\n- Hay elementos del conjunto de partida **sin imagen**.\n- Hay elementos del conjunto de partida **con más de una imagen**.\n\nLa restricción consiste en cambiar el conjunto de partida por el dominio natural (y, si hace falta, quedarse con una sola rama).",
        },
        {
          type: "example",
          title: "Ejercicio tipo parcial",
          problem: "Sea $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = \\dfrac{\\ln(x^2 - 3x + 2)}{x + 6}$. Argumenta por qué no es función, haz las restricciones y defínela.",
          steps: [
            "Logaritmo: necesita $x^2 - 3x + 2 > 0$, o sea $(x - 1)(x - 2) > 0$, que da $(-\\infty, 1) \\cup (2, +\\infty)$. Los $x$ de $[1, 2]$ no tienen imagen. Por ejemplo, $x = 1$ da $\\ln 0$.",
            "Denominador: $x + 6 \\ne 0$, así que $x = -6$ no tiene imagen.",
            "Para los demás $x$ la regla da un único número, así que no hay $x$ con dos imágenes. La única razón es la falta de imagen.",
            "Restricción: intersectamos las dos condiciones. $A = (-\\infty, -6) \\cup (-6, 1) \\cup (2, +\\infty)$.",
            "Definición: $f: (-\\infty, -6) \\cup (-6, 1) \\cup (2, +\\infty) \\to \\mathbb{R} \\;/\\; y = \\dfrac{\\ln(x^2 - 3x + 2)}{x + 6}$.",
          ],
        },
        { type: "widget", widget: { kind: "numberline", set: [iv(-Infinity, -6), iv(-6, 1), iv(2, Infinity)], range: [-9, 5], label: "A" }, caption: "El conjunto de partida restringido: sin $[1, 2]$ y sin el $-6$." },
        {
          type: "note",
          tone: "warning",
          title: "Argumentar es dar un ejemplo concreto",
          md: "No basta con decir \"hay valores sin imagen\". Nombra uno y muestra la operación que falla: \"$x = 1$ no tiene imagen porque $\\ln(1^2 - 3 + 2) = \\ln 0$ no existe\". Así se gana el punto completo.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Sea $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = \\dfrac{1}{\\sqrt{x - 5}}$. ¿Cuál es el conjunto $A$ que la convierte en función $f: A \\to \\mathbb{R}$?",
            parts: [{ kind: "interval", before: "A =", answer: [iv(5, Infinity)], mistakes: [{ answer: [iv(5, Infinity, true, false)], feedback: "En $x = 5$ la raíz vale $0$ y está en el denominador." }] }],
            solution: ["La raíz pide $x - 5 \\ge 0$ y el denominador pide que la raíz no sea $0$. Juntas: $x > 5$. $A = (5, +\\infty)$."],
          },
        },
      ],
    },
  ],
  exercises: [
    dominioRacional,
    dominioRaizLog,
    condicionDominio,
    rangoCuadratica,
    rangoGrafica,
    dominioCuadraticaRaiz,
    dominioCombinado,
    rangoRacional,
    rangoRaizExp,
    rangoRestringido,
    noFuncionLog,
    pruebaCorta,
    conjuntoParaRango,
  ],
};

export default topic;
