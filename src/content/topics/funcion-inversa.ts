import { meta } from "../catalog";
import { choice, trueFalse } from "../helpers";
import type { ExerciseGen, Mistake, Rich, Topic } from "../types";
import { iv, minusPoints, R, type Interval } from "@/lib/math/intervals";
import { poly, signed, terms } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

function xMinus(a: number, v = "x") {
  return a === 0 ? v : a > 0 ? `${v} - ${a}` : `${v} + ${-a}`;
}

function sq(h: number, v = "x") {
  return h === 0 ? `${v}^2` : `(${xMinus(h, v)})^2`;
}

/** Suma un término constante solo si no es cero: "algo + 3". */
function plus(base: string, c: number) {
  return c === 0 ? base : `${base} ${signed(c)}`;
}

/** Fracción (x - n)/m escrita limpia. */
function linInv(m: number, n: number, v = "x") {
  if (m === 1) return xMinus(n, v);
  if (m === -1) return terms([[-1, v], [n, ""]]);
  return `\\frac{${xMinus(n, v)}}{${m}}`;
}

const L_SI = "Sí, porque es biyectiva.";
const L_NI = "No, porque no es inyectiva.";
const L_NS = "No, porque no es sobreyectiva.";
const L_NN = "No, porque no es inyectiva ni sobreyectiva.";

/* ----------------------------------- ejercicios ----------------------------------- */

const inversaLineal: ExerciseGen = {
  id: "inversa-lineal",
  title: "Inversa de una función lineal",
  level: 1,
  generate: (r) => {
    const m = r.nz(-5, 5, [1]);
    const n = r.nz(-8, 8);
    const rule = terms([[m, "x"], [n, ""]]);
    const ans = linInv(m, n);
    const mistakes: Mistake[] = [
      { answer: `\\frac{${xMinus(-n)}}{${m}}`, feedback: `Revisa el signo al pasar el $${n}$ al otro lado: si está sumando, pasa restando.` },
      { answer: `\\frac{1}{${rule}}`, feedback: "Eso es $\\frac{1}{f(x)}$, el recíproco. La inversa deshace la operación, no la voltea." },
      { answer: `\\frac{x}{${m}} ${signed(-n)}`, feedback: `Despejaste en el orden equivocado. Primero se quita el $${n}$ y después se divide entre $${m}$.` },
    ];
    return {
      statement: `Halla la regla de la inversa de $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = ${rule}$.`,
      parts: [{ kind: "expr", before: "f^{-1}(x) =", answer: ans, vars: ["x"], mistakes }],
      hints: [`Escribe $y = ${rule}$ y despeja $x$.`, "Al final cambia el nombre de las variables: la nueva variable independiente se llama $x$."],
      solution: [
        `$y = ${rule}$, así que $${terms([[m, "x"]])} = ${xMinus(n, "y")}$.`,
        `Dividiendo entre $${m}$: $x = ${linInv(m, n, "y")}$.`,
        `Cambiando los nombres: $f^{-1}(x) = ${ans}$.`,
      ],
    };
  },
};

const evaluarInversa: ExerciseGen = {
  id: "evaluar-inversa",
  title: "Evaluar la inversa",
  level: 1,
  generate: (r) => {
    const m = r.nz(-4, 4);
    const n = r.int(-6, 6);
    const x0 = r.int(-5, 5);
    const k = m * x0 + n;
    const fk = m * k + n;
    return {
      statement: `Sea $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = ${terms([[m, "x"], [n, ""]])}$. Calcula $f^{-1}(${k})$.`,
      parts: [
        {
          kind: "expr",
          before: `f^{-1}(${k}) =`,
          answer: String(x0),
          maxOps: 0,
          mistakes: fk !== x0 ? [{ answer: String(fk), feedback: `Calculaste $f(${k})$. $f^{-1}(${k})$ es el $x$ que $f$ manda al $${k}$.` }] : [],
        },
      ],
      hints: [`$f^{-1}(${k})$ es el número $x$ que cumple $f(x) = ${k}$.`],
      solution: [
        `Buscamos el $x$ con $${terms([[m, "x"], [n, ""]])} = ${k}$.`,
        `$${terms([[m, "x"]])} = ${k - n}$, así que $x = ${x0}$.`,
        `Comprobación: $f(${x0}) = ${k}$. Por lo tanto $f^{-1}(${k}) = ${x0}$.`,
      ],
    };
  },
};

const puntoSimetrico: ExerciseGen = {
  id: "punto-simetrico",
  title: "Un punto de la gráfica de la inversa",
  level: 1,
  generate: (r) => {
    let a: number, b: number;
    do {
      a = r.int(-5, 5);
      b = r.int(-5, 5);
    } while (a === b);
    return {
      statement: `El punto $(${a}, ${b})$ está en la gráfica de una función biyectiva $f$. Ubica el punto que con seguridad está en la gráfica de $f^{-1}$.`,
      parts: [
        {
          kind: "point",
          graph: {
            x: [-6, 6],
            y: [-6, 6],
            curves: [{ fn: "x", color: "muted", dashed: true, label: "y = x" }],
            points: [{ x: a, y: b, color: "blue", label: `(${a}, ${b})` }],
          },
          answer: [b, a],
          start: [0, 0],
        },
      ],
      hints: ["Si $f(a) = b$, entonces $f^{-1}(b) = a$.", "Las coordenadas se intercambian. El punto nuevo es el reflejo respecto de la recta $y = x$."],
      solution: [
        `$(${a}, ${b}) \\in f$ significa $f(${a}) = ${b}$.`,
        `Entonces $f^{-1}(${b}) = ${a}$, es decir, $(${b}, ${a})$ está en la gráfica de $f^{-1}$.`,
        "Geométricamente, es el reflejo del punto original respecto de la recta $y = x$.",
      ],
    };
  },
};

const existeInversa: ExerciseGen = {
  id: "existe-inversa",
  title: "¿Tiene inversa?",
  level: 1,
  generate: (r) => {
    const k = r.int(-4, 4);
    const h = r.int(-3, 3);
    const m = r.nz(-4, 4);
    const pool: { def: string; label: string; why: Rich }[] = [
      { def: `f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = ${terms([[m, "x"], [k, ""]])}`, label: L_SI, why: "Una función lineal con pendiente distinta de cero es inyectiva y sobreyectiva." },
      { def: "f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = x^3", label: L_SI, why: "$x^3$ es creciente y toma todos los valores reales." },
      { def: `f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = ${plus("x^2", k)}`, label: L_NN, why: `$f(-1) = f(1)$, así que no es inyectiva, y su rango es $[${k}, +\\infty)$, así que no es sobreyectiva.` },
      { def: `f: \\mathbb{R} \\to [${k}, +\\infty) \\;/\\; y = ${plus("x^2", k)}`, label: L_NI, why: `Es sobreyectiva, pero $f(-1) = f(1) = ${1 + k}$.` },
      { def: `f: [0, +\\infty) \\to [${k}, +\\infty) \\;/\\; y = ${plus("x^2", k)}`, label: L_SI, why: "Con $x \\ge 0$ la parábola solo crece, y el conjunto de llegada es su rango." },
      { def: "f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = e^x", label: L_NS, why: "Es inyectiva, pero $e^x > 0$: los $y \\le 0$ no tienen preimagen." },
      { def: "f: \\mathbb{R} \\to (0, +\\infty) \\;/\\; y = e^x", label: L_SI, why: "Es inyectiva y su rango es exactamente $(0, +\\infty)$." },
      { def: `f: [${h}, +\\infty) \\to \\mathbb{R} \\;/\\; y = \\sqrt{${xMinus(h)}}`, label: L_NS, why: "Es inyectiva, pero una raíz cuadrada nunca es negativa." },
    ];
    const c = r.pick(pool);
    const fb: Record<string, Rich> = {
      [L_SI]: "Para tener inversa tiene que ser inyectiva y sobreyectiva a la vez. Revisa las dos.",
      [L_NI]: "Revisa la inyectividad: ¿hay dos $x$ distintos con la misma imagen?",
      [L_NS]: "Revisa la sobreyectividad: ¿el rango coincide con el conjunto de llegada?",
      [L_NN]: "Revisa cada propiedad por separado.",
    };
    const wrong = [L_SI, L_NI, L_NS, L_NN].filter((l) => l !== c.label).map((l) => [l, `${fb[l]} ${c.why}`] as [Rich, Rich]);
    return {
      statement: `¿Admite inversa la función $${c.def}$?`,
      parts: [choice(c.label, wrong)],
      hints: ["Una función admite inversa si y solo si es biyectiva.", "Fíjate también en el conjunto de llegada: decide la sobreyectividad."],
      solution: [c.why, c.label],
    };
  },
};

const domRanIntercambio: ExerciseGen = {
  id: "dominio-rango-inversa",
  title: "Dominio y rango de la inversa",
  level: 1,
  generate: (r) => {
    const m = r.pick([1, -1, 2, -2, 3]);
    const n = r.int(-4, 4);
    const a = r.int(-4, 0);
    const b = a + r.int(2, 4);
    const fa = m * a + n;
    const fb = m * b + n;
    const A = iv(a, b, true, true);
    const B = iv(Math.min(fa, fb), Math.max(fa, fb), true, true);
    return {
      statement: `La función $f: [${a}, ${b}] \\to [${B.lo}, ${B.hi}] \\;/\\; y = ${terms([[m, "x"], [n, ""]])}$ es biyectiva.`,
      parts: [
        { kind: "interval", prompt: "¿Cuál es el dominio de $f^{-1}$?", before: "\\text{Dom } f^{-1} =", answer: [B], mistakes: [{ answer: [A], feedback: "Ese es el dominio de $f$. Al invertir, dominio y rango se intercambian." }] },
        { kind: "interval", prompt: "¿Cuál es el rango de $f^{-1}$?", before: "\\text{Ran } f^{-1} =", answer: [A], mistakes: [{ answer: [B], feedback: "Ese es el rango de $f$. El rango de la inversa es el dominio de $f$." }] },
      ],
      hints: ["La inversa recorre las flechas al revés: lo que salía ahora entra."],
      solution: [
        "La inversa intercambia los papeles: $\\text{Dom } f^{-1} = \\text{Ran } f$ y $\\text{Ran } f^{-1} = \\text{Dom } f$.",
        `Como $f$ es biyectiva, su rango es el conjunto de llegada $[${B.lo}, ${B.hi}]$.`,
        `Entonces $f^{-1}: [${B.lo}, ${B.hi}] \\to [${a}, ${b}]$.`,
      ],
    };
  },
};

const inversaRacional: ExerciseGen = {
  id: "inversa-racional",
  title: "Inversa de un cociente",
  level: 2,
  generate: (r) => {
    let a: number, b: number, c: number;
    do {
      a = r.nz(-4, 4);
      b = r.int(-6, 6);
      c = r.int(-4, 4);
    } while (a * c + b === 0 || a === c);
    const rule = `\\dfrac{${terms([[a, "x"], [b, ""]])}}{${xMinus(c)}}`;
    const ans = `\\frac{${terms([[c, "x"], [b, ""]])}}{${xMinus(a)}}`;
    return {
      statement: `La función $f: \\mathbb{R} - \\{${c}\\} \\to \\mathbb{R} - \\{${a}\\} \\;/\\; y = ${rule}$ es biyectiva. Halla su inversa.`,
      sequential: true,
      parts: [
        {
          kind: "expr",
          prompt: "Regla de la inversa.",
          before: "f^{-1}(x) =",
          answer: ans,
          vars: ["x"],
          mistakes: [
            { answer: `\\frac{${xMinus(c)}}{${terms([[a, "x"], [b, ""]])}}`, feedback: "Eso es $\\frac{1}{f(x)}$. La inversa se obtiene despejando $x$, no volteando la fracción." },
          ],
        },
        {
          kind: "interval",
          prompt: "Dominio de la inversa.",
          before: "\\text{Dom } f^{-1} =",
          answer: minusPoints(R, [a]),
          mistakes: [{ answer: minusPoints(R, [c]), feedback: "Ese es el dominio de $f$. El de la inversa es el rango de $f$." }],
        },
      ],
      hints: [
        `Multiplica en cruz: $y(${xMinus(c)}) = ${terms([[a, "x"], [b, ""]])}$.`,
        "Pasa todos los términos con $x$ a un lado y saca $x$ como factor común.",
      ],
      solution: [
        `$y(${xMinus(c)}) = ${terms([[a, "x"], [b, ""]])}$, es decir $xy ${signed(-c)}y = ${terms([[a, "x"], [b, ""]])}$.`,
        `$xy - ${a < 0 ? `(${a})` : a}x = ${terms([[c, "y"], [b, ""]])}$, así que $x(${xMinus(a, "y")}) = ${terms([[c, "y"], [b, ""]])}$.`,
        `$x = \\dfrac{${terms([[c, "y"], [b, ""]])}}{${xMinus(a, "y")}}$. Cambiando nombres: $f^{-1}(x) = ${ans}$.`,
        `Definición: $f^{-1}: \\mathbb{R} - \\{${a}\\} \\to \\mathbb{R} - \\{${c}\\} \\;/\\; y = ${ans}$.`,
      ],
    };
  },
};

const inversaRaiz: ExerciseGen = {
  id: "inversa-raiz",
  title: "Inversa de una raíz",
  level: 2,
  generate: (r) => {
    const h = r.int(-4, 4);
    const k = r.int(-4, 4);
    const rule = plus(`\\sqrt{${xMinus(h)}}`, k);
    const ans = plus(sq(k), h);
    const mistakes: Mistake[] = [];
    if (h !== 0) mistakes.push({ answer: plus(sq(k), -h), feedback: `Revisa el signo de $${h}$ al despejar $x$ de $${xMinus(h)}$.` });
    if (h !== k) mistakes.push({ answer: plus(sq(h), k), feedback: "Intercambiaste los números de lugar. Despeja con cuidado: primero se aísla la raíz y después se eleva al cuadrado." });
    return {
      statement: `La función $f: [${h}, +\\infty) \\to [${k}, +\\infty) \\;/\\; y = ${rule}$ es biyectiva. Define su inversa.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Regla de la inversa.", before: "f^{-1}(x) =", answer: ans, vars: ["x"], domain: [k, k + 4], mistakes },
        {
          kind: "interval",
          prompt: "Dominio de la inversa.",
          before: "\\text{Dom } f^{-1} =",
          answer: [iv(k, Infinity, true, false)],
          mistakes: [{ answer: [iv(h, Infinity, true, false)], feedback: "Ese es el dominio de $f$. El de la inversa es el rango de $f$." }, { answer: R, feedback: `La regla $${ans}$ admite cualquier $x$, pero como inversa solo vale en el rango de $f$. Si no, dejaría de ser inyectiva.` }],
        },
      ],
      hints: [k === 0 ? "Eleva al cuadrado los dos lados." : `Primero aísla la raíz: $y ${signed(-k)} = \\sqrt{${xMinus(h)}}$. Luego eleva al cuadrado.`],
      solution: [
        `$y = ${rule}$, así que $${k === 0 ? "y" : xMinus(k, "y")} = \\sqrt{${xMinus(h)}}$, con $y \\ge ${k}$.`,
        `Elevando al cuadrado: $${sq(k, "y")} = ${xMinus(h)}$, es decir $x = ${plus(sq(k, "y"), h)}$.`,
        `Cambiando nombres: $f^{-1}(x) = ${ans}$.`,
        `Definición: $f^{-1}: [${k}, +\\infty) \\to [${h}, +\\infty) \\;/\\; y = ${ans}$. La restricción $x \\ge ${k}$ es indispensable: sin ella la parábola no sería inyectiva.`,
      ],
    };
  },
};

const inversaExpLog: ExerciseGen = {
  id: "inversa-exp-log",
  title: "Exponencial y logaritmo, una inversa de la otra",
  level: 2,
  generate: (r) => {
    const h = r.int(-3, 3);
    const k = r.int(-3, 3);
    const isExp = r.bool();
    if (isExp) {
      const rule = plus(`e^{${xMinus(h)}}`, k);
      const ans = plus(`\\ln(${xMinus(k)})`, h);
      const mistakes: Mistake[] = [{ answer: `\\frac{1}{${rule}}`, feedback: "Eso es $\\frac{1}{f(x)}$. La inversa de una exponencial es un logaritmo." }];
      if (k !== 0) mistakes.push({ answer: plus(`\\ln(${xMinus(-k)})`, h), feedback: `Revisa el signo: primero se pasa el $${k}$ al otro lado.` });
      if (h !== 0) mistakes.push({ answer: plus(`\\ln(${xMinus(k)})`, -h), feedback: "Revisa el último paso: al despejar $x$ el número cambia de lado y de signo." });
      return {
        statement: `La función $f: \\mathbb{R} \\to (${k}, +\\infty) \\;/\\; y = ${rule}$ es biyectiva. Define su inversa.`,
        sequential: true,
        parts: [
          { kind: "expr", prompt: "Regla de la inversa.", before: "f^{-1}(x) =", answer: ans, vars: ["x"], domain: [k + 0.2, k + 6], mistakes },
          { kind: "interval", prompt: "Dominio de la inversa.", before: "\\text{Dom } f^{-1} =", answer: [iv(k, Infinity)], mistakes: [{ answer: [iv(k, Infinity, true, false)], feedback: "El logaritmo de $0$ no existe. El extremo va abierto." }, { answer: R, feedback: "Ese es el dominio de $f$." }] },
        ],
        hints: [k === 0 ? "Aplica $\\ln$ a ambos lados." : `Aísla la exponencial: $y ${signed(-k)} = e^{${xMinus(h)}}$. Luego aplica $\\ln$.`],
        solution: [
          `$${k === 0 ? "y" : xMinus(k, "y")} = e^{${xMinus(h)}}$.`,
          `Aplicando $\\ln$: $\\ln(${xMinus(k, "y")}) = ${xMinus(h)}$, así que $x = ${plus(`\\ln(${xMinus(k, "y")})`, h)}$.`,
          `Definición: $f^{-1}: (${k}, +\\infty) \\to \\mathbb{R} \\;/\\; y = ${ans}$.`,
        ],
      };
    }
    const rule = plus(`\\ln(${xMinus(h)})`, k);
    const ans = plus(`e^{${xMinus(k)}}`, h);
    const mistakes: Mistake[] = [];
    if (k !== 0) mistakes.push({ answer: plus(`e^{${xMinus(-k)}}`, h), feedback: `Revisa el signo: primero se pasa el $${k}$ al otro lado.` });
    if (h !== 0) mistakes.push({ answer: plus(`e^{${xMinus(k)}}`, -h), feedback: "Revisa el último paso: al despejar $x$ el número cambia de lado y de signo." });
    mistakes.push({ answer: `\\frac{1}{${rule}}`, feedback: "Eso es $\\frac{1}{f(x)}$. La inversa de un logaritmo es una exponencial." });
    return {
      statement: `La función $f: (${h}, +\\infty) \\to \\mathbb{R} \\;/\\; y = ${rule}$ es biyectiva. Define su inversa.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Regla de la inversa.", before: "f^{-1}(x) =", answer: ans, vars: ["x"], domain: [-2, 2], mistakes },
        { kind: "interval", prompt: "Rango de la inversa.", before: "\\text{Ran } f^{-1} =", answer: [iv(h, Infinity)], mistakes: [{ answer: R, feedback: "Ese es el rango de $f$. El rango de la inversa es el dominio de $f$." }, { answer: [iv(h, Infinity, true, false)], feedback: `$e^{\\text{algo}}$ nunca vale $0$, así que $${h}$ no se alcanza.` }] },
      ],
      hints: [k === 0 ? "Aplica la exponencial a ambos lados." : `Aísla el logaritmo: $y ${signed(-k)} = \\ln(${xMinus(h)})$. Luego aplica la exponencial.`],
      solution: [
        `$${k === 0 ? "y" : xMinus(k, "y")} = \\ln(${xMinus(h)})$.`,
        `Aplicando la exponencial: $e^{${xMinus(k, "y")}} = ${xMinus(h)}$, así que $x = ${plus(`e^{${xMinus(k, "y")}}`, h)}$.`,
        `Definición: $f^{-1}: \\mathbb{R} \\to (${h}, +\\infty) \\;/\\; y = ${ans}$.`,
      ],
    };
  },
};

const composicionIdentidad: ExerciseGen = {
  id: "composicion-identidad",
  title: "Comprobar una inversa con la composición",
  level: 2,
  generate: (r) => {
    const m = r.nz(-4, 4, [1, -1]);
    const n = r.nz(-6, 6);
    const kind = r.pick(["ok", "ok", "signo", "orden"] as const);
    const gTex = kind === "ok" ? linInv(m, n) : kind === "signo" ? `\\frac{${xMinus(-n)}}{${m}}` : `\\frac{x}{${m}} ${signed(-n)}`;
    // f(g(x)) = m g(x) + n
    const shift = kind === "ok" ? 0 : kind === "signo" ? 2 * n : n - m * n;
    const comp = plus("x", shift);
    const isInv = kind === "ok";
    return {
      statement: `Sean $f(x) = ${terms([[m, "x"], [n, ""]])}$ y $g(x) = ${gTex}$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Calcula y simplifica $(f \\circ g)(x)$.", before: "(f \\circ g)(x) =", answer: comp, vars: ["x"], maxOps: 1 },
        trueFalse(
          isInv,
          isInv ? "La composición da $x$, así que $g$ deshace lo que hace $f$." : `La composición da $${comp}$, no $x$. Si $g$ fuera la inversa, $f(g(x))$ tendría que devolver $x$.`,
          "¿Es $g$ la inversa de $f$?",
        ),
      ],
      hints: [`Sustituye $g(x)$ en lugar de $x$ dentro de $f$: $f(g(x)) = ${m}\\cdot g(x) ${signed(n)}$.`, "Si $g = f^{-1}$, la composición tiene que dar exactamente $x$."],
      solution: [
        `$(f \\circ g)(x) = ${m}\\left(${gTex}\\right) ${signed(n)}$.`,
        `Simplificando: $(f \\circ g)(x) = ${comp}$.`,
        isInv ? "Da la identidad, así que $g = f^{-1}$." : `No da $x$, así que $g$ no es la inversa. La inversa correcta es $f^{-1}(x) = ${linInv(m, n)}$.`,
      ],
    };
  },
};

const inversaCuadraticaParcial: ExerciseGen = {
  id: "inversa-cuadratica-parcial",
  title: "Restringir y hallar la inversa de una parábola (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const h = r.int(-3, 3);
    const k = r.int(-4, 4);
    const rule = poly([1, -2 * h, h * h + k]);
    const ans = plus(`\\sqrt{${xMinus(k)}}`, h);
    const mistakes: Mistake[] = [{ answer: `${h === 0 ? "" : h} - \\sqrt{${xMinus(k)}}`, feedback: `Esa es la rama de la izquierda, la que corresponde a $x \\le ${h}$. Con el dominio $[${h}, +\\infty)$ va el signo $+$.` }];
    if (h !== 0) mistakes.push({ answer: plus(`\\sqrt{${xMinus(k)}}`, -h), feedback: `Revisa el signo del $${h}$ al despejar.` });
    if (k !== 0) mistakes.push({ answer: plus(`\\sqrt{${xMinus(-k)}}`, h), feedback: `Revisa el signo del $${k}$ dentro de la raíz.` });
    return {
      statement: `Sea $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = ${rule}$. Resuelve paso a paso.`,
      sequential: true,
      parts: [
        choice(
          `Porque no es biyectiva: $f(${h - 1}) = f(${h + 1})$, así que no es inyectiva, y $y = ${k - 1}$ no tiene preimagen, así que no es sobreyectiva.`,
          [
            ["Porque las funciones cuadráticas nunca tienen inversa.", "Restringidas a un tramo donde solo suben o solo bajan, sí la tienen."],
            ["Porque no es función.", "Sí es función: todo $x$ real tiene una única imagen."],
            [`Porque $f(${h}) = ${k}$.`, "Ese es el vértice. Que exista no impide nada por sí solo."],
          ],
          "¿Por qué $f$ no tiene inversa?",
        ),
        {
          kind: "interval",
          prompt: "Restringe el dominio al tramo a la derecha del vértice, incluyéndolo.",
          before: "A =",
          answer: [iv(h, Infinity, true, false)],
          mistakes: [{ answer: [iv(-Infinity, h, false, true)], feedback: "Ese tramo también sirve, pero se pidió el de la derecha." }],
        },
        {
          kind: "interval",
          prompt: "Restringe el conjunto de llegada para que sea sobreyectiva.",
          before: "B =",
          answer: [iv(k, Infinity, true, false)],
          mistakes: [{ answer: [iv(k, Infinity)], feedback: `El valor $${k}$ se alcanza en el vértice. Va cerrado.` }],
        },
        { kind: "expr", prompt: "Halla la regla de la inversa.", before: "f^{-1}(x) =", answer: ans, vars: ["x"], domain: [k + 0.1, k + 6], mistakes },
        {
          kind: "interval",
          prompt: "Dominio de la inversa.",
          before: "\\text{Dom } f^{-1} =",
          answer: [iv(k, Infinity, true, false)],
          mistakes: [{ answer: [iv(h, Infinity, true, false)], feedback: "Ese es el dominio de $f$ restringida. El de la inversa es su rango." }],
        },
      ],
      hints: [
        `Completa el cuadrado: $${rule} = ${plus(sq(h), k)}$.`,
        `Para despejar: $${plus(sq(h), k)} = y$ da $${sq(h)} = ${xMinus(k, "y")}$. Al sacar raíz, el signo lo decide el dominio $x \\ge ${h}$.`,
      ],
      solution: [
        `Completando el cuadrado, $f(x) = ${plus(sq(h), k)}$, con vértice $(${h}, ${k})$. No es inyectiva ni sobreyectiva, así que no es biyectiva y no tiene inversa.`,
        `Restricción: $f: [${h}, +\\infty) \\to [${k}, +\\infty) \\;/\\; y = ${rule}$, que sí es biyectiva.`,
        `Despeje: $${sq(h)} = ${xMinus(k, "y")}$. Como $x \\ge ${h}$, $${xMinus(h)} \\ge 0$ y tomamos la raíz positiva: $${xMinus(h)} = \\sqrt{${xMinus(k, "y")}}$.`,
        `$x = ${plus(`\\sqrt{${xMinus(k, "y")}}`, h)}$. Cambiando nombres: $f^{-1}(x) = ${ans}$.`,
        `Definición: $f^{-1}: [${k}, +\\infty) \\to [${h}, +\\infty) \\;/\\; y = ${ans}$.`,
      ],
    };
  },
};

const inversaRacionalParcial: ExerciseGen = {
  id: "inversa-racional-parcial",
  title: "Condiciones de existencia y la inversa de un cociente (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const p = r.nz(-4, 4);
    const c = r.nz(-3, 3);
    const q = r.int(-3, 3);
    const base = `\\dfrac{${p}}{${terms([[c, ""], [-1, "x"]])}}`;
    const rule = plus(base, q);
    const ans = `${c} ${p > 0 ? "-" : "+"} \\frac{${Math.abs(p)}}{${xMinus(q)}}`;
    const D = minusPoints(R, [c]);
    const Bq = minusPoints(R, [q]);
    return {
      statement: `Sea la función $f: D \\subseteq \\mathbb{R} \\to \\mathbb{R}$ tal que $f(x) = ${rule}$, con $D$ su dominio natural. Resuelve paso a paso.`,
      sequential: true,
      parts: [
        { kind: "interval", prompt: "Halla $D$.", before: "D =", answer: D },
        choice(
          `Hay que tomar como conjunto de llegada el rango, $\\mathbb{R} - \\{${q}\\}$. Así $f$ es biyectiva.`,
          [
            ["Basta con que $f$ sea función.", "Para tener inversa no basta con ser función: tiene que ser biyectiva."],
            [`Hay que restringir el dominio a $x > ${c}$.`, "No hace falta. En todo su dominio $f$ ya es inyectiva: cada rama de la hipérbola es monótona y no se repiten valores."],
            ["No puede tener inversa porque es racional.", "Muchas funciones racionales tienen inversa. Lo que importa es que sea biyectiva."],
          ],
          "¿Qué restricción hace falta para que $f$ admita inversa?",
        ),
        {
          kind: "expr",
          prompt: "Halla la regla de $f^{-1}$.",
          before: "f^{-1}(x) =",
          answer: ans,
          vars: ["x"],
          mistakes: [{ answer: `\\frac{1}{${rule}}`, feedback: "Eso es $\\frac{1}{f(x)}$, el recíproco. La inversa se obtiene despejando $x$." }],
        },
        { kind: "interval", prompt: "Dominio de $f^{-1}$.", before: "\\text{Dom } f^{-1} =", answer: Bq, mistakes: [{ answer: D, feedback: "Ese es el dominio de $f$. El de la inversa es el rango de $f$." }] },
        { kind: "interval", prompt: "Rango de $f^{-1}$.", before: "\\text{Ran } f^{-1} =", answer: D, mistakes: [{ answer: Bq, feedback: "Ese es el dominio de la inversa. El rango de la inversa es el dominio de $f$." }] },
      ],
      hints: [
        `El denominador $${terms([[c, ""], [-1, "x"]])}$ no puede ser cero.`,
        q === 0 ? `Despeja: $${terms([[c, ""], [-1, "x"]])} = \\dfrac{${p}}{y}$.` : `Despeja: $y ${signed(-q)} = ${base}$, luego $${terms([[c, ""], [-1, "x"]])} = \\dfrac{${p}}{${xMinus(q, "y")}}$.`,
      ],
      solution: [
        `$${terms([[c, ""], [-1, "x"]])} \\ne 0$ da $x \\ne ${c}$. $D = \\mathbb{R} - \\{${c}\\}$.`,
        `$f$ es inyectiva en $D$, pero nunca vale $${q}$, porque $${base}$ nunca es cero. Su rango es $\\mathbb{R} - \\{${q}\\}$, y con ese conjunto de llegada $f: \\mathbb{R} - \\{${c}\\} \\to \\mathbb{R} - \\{${q}\\}$ es biyectiva.`,
        `Despeje: $${xMinus(q, "y")} = ${base}$, así que $${terms([[c, ""], [-1, "x"]])} = \\dfrac{${p}}{${xMinus(q, "y")}}$ y $x = ${c} - \\dfrac{${p}}{${xMinus(q, "y")}}$.`,
        `Definición: $f^{-1}: \\mathbb{R} - \\{${q}\\} \\to \\mathbb{R} - \\{${c}\\} \\;/\\; y = ${ans}$.`,
      ],
    };
  },
};

const inversaAbsParcial: ExerciseGen = {
  id: "inversa-abs-parcial",
  title: "Inversa de |x| + cx restringida (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const p = r.int(1, 4);
    const s = r.int(2, 4);
    const rule = `|x| - ${s === 2 ? "" : s - 1}x`;
    const simple = `-${s}x`;
    const inv = `-\\frac{x}{${s}}`;
    const B: Interval = iv(0, s * p, true, true);
    const A: Interval = iv(-p, 0, true, true);
    return {
      statement: `Sea $f: [${-p}, 0] \\to [0, ${s * p}] \\;/\\; y = ${rule}$. Define su inversa.`,
      sequential: true,
      parts: [
        {
          kind: "expr",
          prompt: "En el dominio dado, ¿a qué se reduce la regla?",
          before: "f(x) =",
          answer: simple,
          vars: ["x"],
          domain: [-p, -0.1],
          maxOps: 1,
          mistakes: [{ answer: `${s - 2 === 0 ? "0" : `-${s - 2}x`}`, feedback: "Tomaste $|x| = x$, pero en este dominio $x \\le 0$, así que $|x| = -x$." }],
        },
        {
          kind: "expr",
          prompt: "Regla de la inversa.",
          before: "f^{-1}(x) =",
          answer: inv,
          vars: ["x"],
          domain: [0.1, s * p],
          mistakes: [
            { answer: `\\frac{x}{${s}}`, feedback: `Revisa el signo. Si $y = -${s}x$, entonces $x = -\\frac{y}{${s}}$.` },
            { answer: simple, feedback: "Esa es $f$, no su inversa." },
          ],
        },
        { kind: "interval", prompt: "Dominio de $f^{-1}$.", before: "\\text{Dom } f^{-1} =", answer: [B], mistakes: [{ answer: [A], feedback: "Ese es el dominio de $f$." }] },
        { kind: "interval", prompt: "Rango de $f^{-1}$.", before: "\\text{Ran } f^{-1} =", answer: [A], mistakes: [{ answer: [B], feedback: "Ese es el rango de $f$. El de la inversa es el dominio de $f$." }] },
      ],
      hints: [
        "En $[" + -p + ", 0]$ todos los $x$ son menores o iguales que cero. Ahí $|x| = -x$.",
        "Con la regla simplificada, despeja $x$ y cambia los nombres.",
      ],
      solution: [
        `Para $x \\le 0$, $|x| = -x$. Entonces $f(x) = -x - ${s === 2 ? "" : s - 1}x = ${simple}$.`,
        `$y = ${simple}$ da $x = -\\frac{y}{${s}}$. Cambiando nombres: $f^{-1}(x) = ${inv}$.`,
        `Dominio y rango se intercambian: $f^{-1}: [0, ${s * p}] \\to [${-p}, 0] \\;/\\; y = ${inv}$.`,
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("funcion-inversa"),
  objectives: [
    "Saber cuándo una función admite inversa y restringirla si hace falta.",
    "Hallar la regla de la inversa despejando.",
    "Definir $f^{-1}: B \\to A$ completa, con dominio y rango intercambiados.",
    "Relacionar las gráficas de $f$ y $f^{-1}$ con la recta $y = x$, y comprobar una inversa con la composición.",
  ],
  sections: [
    {
      id: "idea",
      title: "Deshacer lo que hace una función",
      blocks: [
        {
          type: "text",
          md: "Una función toma un $x$ y devuelve un $y$. La inversa hace el camino de regreso: recibe el $y$ y te dice de qué $x$ salió. Si $f$ multiplica por $2$ y suma $3$, su inversa resta $3$ y divide entre $2$, en ese orden.",
        },
        {
          type: "widget",
          widget: { kind: "machine", fns: [{ name: "f", tex: "2x + 3" }, { name: "f^{-1}", tex: "\\frac{x - 3}{2}" }], input: 4, min: -5, max: 5 },
          caption: "Lo que entra a $f$ sale intacto después de pasar por $f^{-1}$.",
        },
        {
          type: "text",
          md: "En pares ordenados, invertir es voltear cada par: si $(x, y) \\in f$, entonces $(y, x) \\in f^{-1}$. Eso siempre produce una relación. La pregunta es si esa relación vuelve a ser **función**.",
        },
        {
          type: "widget",
          widget: { kind: "mapping", domain: ["1", "2", "3"], codomain: ["a", "b", "c"], arrows: [[0, 0], [1, 0], [2, 2]] },
          caption: "Si volteas las flechas, la $a$ tendría dos imágenes y la $b$ ninguna. La relación inversa no es función.",
        },
        {
          type: "definition",
          title: "Existencia de la inversa",
          md: "Para que la relación inversa de $f: A \\to B$ sea función de $B$ en $A$ hacen falta dos cosas:\n\n- Todo elemento de $B$ tiene que tener a dónde ir: $f$ **sobreyectiva**.\n- Esa imagen tiene que ser única: $f$ **inyectiva**.\n\nEn resumen, $f$ admite inversa si y solo si $f$ es **biyectiva**. En ese caso\n\n$$f^{-1}: B \\to A, \\qquad x = f^{-1}(y) \\iff y = f(x)$$",
        },
        {
          type: "note",
          tone: "warning",
          title: "El −1 no es un exponente",
          md: "$f^{-1}(x)$ es la función inversa, no $\\frac{1}{f(x)}$. Con $f(x) = 2x + 3$, la inversa es $\\frac{x - 3}{2}$, mientras que $\\frac{1}{2x + 3}$ es otra cosa.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Admite inversa $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = x^2$?",
            parts: [trueFalse(false, "No es inyectiva, porque $f(-2) = f(2)$, ni sobreyectiva, porque los negativos no son imagen.")],
            solution: ["No es biyectiva, así que no admite inversa. Para que la tenga hay que restringir dominio y conjunto de llegada."],
          },
        },
      ],
    },
    {
      id: "despeje",
      title: "Cómo hallar la regla de la inversa",
      blocks: [
        {
          type: "text",
          md: "La receta tiene tres pasos:\n\n- Escribe $y = f(x)$.\n- Despeja $x$ en función de $y$.\n- Cambia los nombres: la variable independiente vuelve a llamarse $x$. Ese resultado es $f^{-1}(x)$.",
        },
        {
          type: "example",
          title: "Una función lineal",
          problem: "Halla la inversa de $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = 3x - 6$.",
          steps: [
            "$y = 3x - 6$, así que $3x = y + 6$.",
            "$x = \\dfrac{y + 6}{3}$.",
            "Cambiando nombres: $f^{-1}(x) = \\dfrac{x + 6}{3}$.",
          ],
          answer: "$f^{-1}: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = \\dfrac{x + 6}{3}$",
        },
        {
          type: "example",
          title: "Un cociente (reparación)",
          problem: "Sea $f: D \\subseteq \\mathbb{R} \\to \\mathbb{R}$ con $f(x) = \\dfrac{1}{1 - x}$. Haz las restricciones para que admita inversa y halla $f^{-1}$ con su dominio y su rango.",
          steps: [
            "Dominio: $1 - x \\ne 0$, así que $D = \\mathbb{R} - \\{1\\}$.",
            "Un cociente con numerador $1$ nunca vale $0$, así que el rango es $\\mathbb{R} - \\{0\\}$. Para que sea sobreyectiva tomamos $f: \\mathbb{R} - \\{1\\} \\to \\mathbb{R} - \\{0\\}$.",
            "Despeje: $y(1 - x) = 1$, así que $1 - x = \\dfrac{1}{y}$ y $x = 1 - \\dfrac{1}{y} = \\dfrac{y - 1}{y}$.",
            "Cambiando nombres: $f^{-1}(x) = \\dfrac{x - 1}{x}$.",
          ],
          answer: "$f^{-1}: \\mathbb{R} - \\{0\\} \\to \\mathbb{R} - \\{1\\} \\;/\\; y = \\dfrac{x - 1}{x}$",
        },
        {
          type: "quick",
          exercise: {
            statement: "Halla la inversa de $f(x) = 5x + 2$.",
            parts: [{ kind: "expr", before: "f^{-1}(x) =", answer: "\\frac{x - 2}{5}", vars: ["x"], mistakes: [{ answer: "\\frac{1}{5x + 2}", feedback: "Eso es $\\frac{1}{f(x)}$, no la inversa." }] }],
            solution: ["$y = 5x + 2$ da $x = \\frac{y - 2}{5}$. Cambiando nombres: $f^{-1}(x) = \\frac{x - 2}{5}$."],
          },
        },
      ],
    },
    {
      id: "dominio-rango",
      title: "Dominio y rango se intercambian",
      blocks: [
        {
          type: "text",
          md: "Como la inversa voltea los pares, lo que eran entradas pasan a ser salidas y al revés:\n\n$$\\text{Dom } f^{-1} = \\text{Ran } f \\qquad \\text{Ran } f^{-1} = \\text{Dom } f$$\n\nEsto es lo que permite \"definir la función inversa\" completa en el parcial: no basta con la regla, hay que escribir $f^{-1}: B \\to A \\;/\\; y = f^{-1}(x)$.",
        },
        {
          type: "example",
          title: "Una raíz (parcial)",
          problem: "Define la función inversa de $f(x) = \\sqrt{x + 1}$.",
          steps: [
            "Dominio de $f$: $x + 1 \\ge 0$, así que $[-1, +\\infty)$. Rango: $[0, +\\infty)$, porque la raíz nunca es negativa.",
            "Así, $f: [-1, +\\infty) \\to [0, +\\infty)$ es biyectiva.",
            "Despeje: $y = \\sqrt{x + 1}$ con $y \\ge 0$. Elevando al cuadrado, $y^2 = x + 1$ y $x = y^2 - 1$.",
            "Cambiando nombres e intercambiando dominio y rango: $f^{-1}: [0, +\\infty) \\to [-1, +\\infty) \\;/\\; y = x^2 - 1$.",
          ],
        },
        {
          type: "graph",
          spec: {
            x: [-2, 4],
            y: [-2, 4],
            curves: [
              { fn: "\\sqrt{x + 1}", domain: [-1, 4], color: "accent", label: "f" },
              { fn: "x^2 - 1", domain: [0, 2.2], color: "blue", label: "f⁻¹" },
              { fn: "x", color: "muted", dashed: true, label: "y = x" },
            ],
            points: [{ x: -1, y: 0, color: "accent" }, { x: 0, y: -1, color: "blue" }],
          },
          caption: "La inversa es solo la mitad derecha de la parábola $x^2 - 1$. La otra mitad no corresponde a ningún punto de $f$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "La restricción no es un adorno",
          md: "La regla $x^2 - 1$ por sí sola define una parábola completa, que no es inyectiva. Lo que la convierte en la inversa de $\\sqrt{x + 1}$ es el dominio $[0, +\\infty)$. Si lo olvidas, la respuesta está incompleta.",
        },
        {
          type: "example",
          title: "Un logaritmo (parcial)",
          problem: "Define la inversa de $g(x) = \\ln(x - 4)$.",
          steps: [
            "Dominio: $x - 4 > 0$, así que $(4, +\\infty)$. El logaritmo toma todos los valores reales: rango $\\mathbb{R}$.",
            "Despeje: $y = \\ln(x - 4)$ da $e^y = x - 4$, así que $x = e^y + 4$.",
          ],
          answer: "$g^{-1}: \\mathbb{R} \\to (4, +\\infty) \\;/\\; y = e^x + 4$",
        },
        {
          type: "quick",
          exercise: {
            statement: "Si $f: [2, 5] \\to [1, 7]$ es biyectiva, ¿cuál es el dominio de $f^{-1}$?",
            parts: [{ kind: "interval", before: "\\text{Dom } f^{-1} =", answer: [iv(1, 7, true, true)], mistakes: [{ answer: [iv(2, 5, true, true)], feedback: "Ese es el dominio de $f$. Se intercambian." }] }],
            solution: ["$\\text{Dom } f^{-1} = \\text{Ran } f = [1, 7]$."],
          },
        },
      ],
    },
    {
      id: "grafica",
      title: "La gráfica: un espejo en la recta y = x",
      blocks: [
        {
          type: "text",
          md: "Si el punto $(a, b)$ está en la gráfica de $f$, el punto $(b, a)$ está en la de $f^{-1}$. Intercambiar las coordenadas es reflejar el punto respecto de la recta $y = x$. Por eso la gráfica de la inversa es el reflejo de la gráfica de $f$ en ese espejo.",
        },
        {
          type: "graph",
          spec: {
            x: [-4, 6],
            y: [-4, 6],
            curves: [
              { fn: "e^{x}", color: "accent", label: "y = eˣ" },
              { fn: "\\ln(x)", domain: [0.02, 6], color: "blue", label: "y = ln x" },
              { fn: "x", color: "muted", dashed: true, label: "y = x" },
            ],
            points: [
              { x: 0, y: 1, color: "accent", label: "(0, 1)" },
              { x: 1, y: 0, color: "blue", label: "(1, 0)" },
            ],
          },
          caption: "$e^x$ y $\\ln x$ son inversas: una es el reflejo de la otra. El punto $(0, 1)$ de la exponencial se convierte en el $(1, 0)$ del logaritmo.",
        },
        {
          type: "table",
          headers: ["Función", "Inversa", "Dominio de la inversa"],
          rows: [
            ["$e^x: \\mathbb{R} \\to (0, +\\infty)$", "$\\ln x$", "$(0, +\\infty)$"],
            ["$\\ln x: (0, +\\infty) \\to \\mathbb{R}$", "$e^x$", "$\\mathbb{R}$"],
            ["$x^3: \\mathbb{R} \\to \\mathbb{R}$", "$\\sqrt[3]{x}$", "$\\mathbb{R}$"],
            ["$x^2: [0, +\\infty) \\to [0, +\\infty)$", "$\\sqrt{x}$", "$[0, +\\infty)$"],
            ["$a^x: \\mathbb{R} \\to (0, +\\infty)$", "$\\log_a x$", "$(0, +\\infty)$"],
          ],
        },
        {
          type: "quick",
          exercise: {
            statement: "El punto $(2, 7)$ está en la gráfica de $f$. Ubica un punto de la gráfica de $f^{-1}$.",
            parts: [{ kind: "point", graph: { x: [-1, 8], y: [-1, 8], curves: [{ fn: "x", color: "muted", dashed: true }], points: [{ x: 2, y: 7, color: "blue" }] }, answer: [7, 2], start: [0, 0] }],
            solution: ["Se intercambian las coordenadas: $(7, 2)$."],
          },
        },
      ],
    },
    {
      id: "composicion",
      title: "La composición devuelve la identidad",
      blocks: [
        {
          type: "text",
          md: "Aplicar $f$ y después $f^{-1}$ te deja donde empezaste. Lo mismo al revés. Eso da una forma de **comprobar** que una inversa está bien calculada.",
        },
        {
          type: "definition",
          title: "Propiedades de la inversa",
          md: "Si $f: A \\to B$ es biyectiva:\n\n$$(f^{-1} \\circ f)(x) = x \\;\\; \\forall x \\in A \\qquad (f \\circ f^{-1})(y) = y \\;\\; \\forall y \\in B$$\n\nEs decir, $f^{-1} \\circ f = i_A$ y $f \\circ f^{-1} = i_B$, las funciones identidad de cada conjunto.",
        },
        {
          type: "example",
          title: "Comprobar una inversa",
          problem: "Comprueba que $g(x) = \\dfrac{x + 6}{3}$ es la inversa de $f(x) = 3x - 6$.",
          steps: [
            "$(f \\circ g)(x) = 3 \\cdot \\dfrac{x + 6}{3} - 6 = x + 6 - 6 = x$.",
            "$(g \\circ f)(x) = \\dfrac{(3x - 6) + 6}{3} = \\dfrac{3x}{3} = x$.",
          ],
          answer: "Las dos composiciones dan $x$, así que $g = f^{-1}$.",
        },
        {
          type: "note",
          tone: "econ",
          title: "La demanda inversa",
          md: "Una demanda $q = 100 - 2p$ dice cuánto se compra a cada precio. Su inversa, $p = 50 - \\dfrac{q}{2}$, dice qué precio hace falta para vender una cantidad dada. En economía se le llama **demanda inversa**, y es la forma en que suelen graficarse oferta y demanda, con el precio en el eje vertical.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Si $f(x) = 4x - 1$ y $g(x) = \\frac{x + 1}{4}$, calcula $(f \\circ g)(x)$.",
            parts: [{ kind: "expr", before: "(f \\circ g)(x) =", answer: "x", vars: ["x"], maxOps: 0 }],
            solution: ["$4 \\cdot \\frac{x + 1}{4} - 1 = x + 1 - 1 = x$. Por lo tanto $g = f^{-1}$."],
          },
        },
      ],
    },
    {
      id: "cuadraticas",
      title: "Inversa de una parábola restringida",
      blocks: [
        {
          type: "text",
          md: "Las parábolas son el caso típico del parcial: en $\\mathbb{R}$ no tienen inversa, pero restringidas a un lado del vértice sí. El cuidado está en el despeje: al sacar raíz aparecen dos signos, y el dominio escogido decide cuál se queda.",
        },
        {
          type: "example",
          title: "Restringir y despejar",
          problem: "Sea $f: \\mathbb{R} \\to \\mathbb{R} \\;/\\; y = x^2 - 4x + 1$. Restríngela para que tenga inversa y define $f^{-1}$.",
          steps: [
            "Completamos el cuadrado: $f(x) = (x - 2)^2 - 3$. Vértice $(2, -3)$.",
            "Restricción: $f: [2, +\\infty) \\to [-3, +\\infty)$, que es biyectiva.",
            "Despeje: $(x - 2)^2 = y + 3$. Como $x \\ge 2$, $x - 2 \\ge 0$ y tomamos la raíz positiva: $x - 2 = \\sqrt{y + 3}$.",
            "$x = 2 + \\sqrt{y + 3}$. Cambiando nombres: $f^{-1}(x) = 2 + \\sqrt{x + 3}$.",
          ],
          answer: "$f^{-1}: [-3, +\\infty) \\to [2, +\\infty) \\;/\\; y = 2 + \\sqrt{x + 3}$",
        },
        {
          type: "graph",
          spec: {
            x: [-4, 8],
            y: [-4, 8],
            step: 2,
            curves: [
              { fn: "x^2 - 4x + 1", domain: [2, 5.5], color: "accent", label: "f" },
              { fn: "2 + \\sqrt{x + 3}", domain: [-3, 8], color: "blue", label: "f⁻¹" },
              { fn: "x", color: "muted", dashed: true },
            ],
            points: [{ x: 2, y: -3, color: "accent" }, { x: -3, y: 2, color: "blue" }],
          },
          caption: "La rama derecha de la parábola y su inversa, reflejadas en la recta $y = x$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "El signo de la raíz",
          md: "Si hubieras escogido el dominio $(-\\infty, 2]$, entonces $x - 2 \\le 0$ y la inversa sería $2 - \\sqrt{x + 3}$. Escribir $\\pm$ en la respuesta está mal: una función no puede dar dos valores.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Sea $f: [0, +\\infty) \\to [1, +\\infty) \\;/\\; y = x^2 + 1$. Halla $f^{-1}(x)$.",
            parts: [
              {
                kind: "expr",
                before: "f^{-1}(x) =",
                answer: "\\sqrt{x - 1}",
                vars: ["x"],
                domain: [1.1, 6],
                mistakes: [{ answer: "-\\sqrt{x - 1}", feedback: "Como $x \\ge 0$ en el dominio de $f$, la inversa toma la raíz positiva." }],
              },
            ],
            solution: ["$y = x^2 + 1$ da $x^2 = y - 1$. Como $x \\ge 0$, $x = \\sqrt{y - 1}$. Entonces $f^{-1}(x) = \\sqrt{x - 1}$, con dominio $[1, +\\infty)$."],
          },
        },
      ],
    },
  ],
  exercises: [
    inversaLineal,
    evaluarInversa,
    puntoSimetrico,
    existeInversa,
    domRanIntercambio,
    inversaRacional,
    inversaRaiz,
    inversaExpLog,
    composicionIdentidad,
    inversaCuadraticaParcial,
    inversaRacionalParcial,
    inversaAbsParcial,
  ],
};

export default topic;
