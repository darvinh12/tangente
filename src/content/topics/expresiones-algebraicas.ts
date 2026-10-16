import { meta } from "../catalog";
import { choice, uniqueWrong } from "../helpers";
import type { ExerciseGen, Mistake, Part, Rich, Topic } from "../types";
import type { Ast } from "@/lib/math/parse";
import { coef, minus, num, paren, poly, terms } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

/** Polinomio como lista de coeficientes, de mayor a menor grado. */
type P = number[];

function trim(p: P): P {
  let i = 0;
  while (i < p.length - 1 && p[i] === 0) i++;
  return p.slice(i);
}
function padd(a: P, b: P): P {
  const n = Math.max(a.length, b.length);
  const A = [...Array(n - a.length).fill(0), ...a];
  const B = [...Array(n - b.length).fill(0), ...b];
  return trim(A.map((x, i) => x + B[i]));
}
const pscale = (a: P, k: number): P => trim(a.map((x) => x * k));
const psub = (a: P, b: P): P => padd(a, pscale(b, -1));
function pmul(a: P, b: P): P {
  const out = Array(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => (out[i + j] += x * y)));
  return trim(out);
}
const pevalAt = (a: P, x: number) => a.reduce((s, c) => s * x + c, 0);
const nonzero = (a: P) => a.filter((c) => c !== 0).length || 1;
const samePoly = (a: P, b: P) => {
  const A = trim(a);
  const B = trim(b);
  return A.length === B.length && A.every((x, i) => x === B[i]);
};

/** x^e limpio. */
const pw = (v: string, e: number) => (e === 0 ? "" : e === 1 ? v : `${v}^{${e}}`);
/** Monomio c·x^d. */
const monoT = (c: number, d: number, v = "x") => terms([[c, pw(v, d)]]);

/* Validación de forma: suma de monomios sin paréntesis y sin términos semejantes repetidos. */

function addends(a: Ast, out: Ast[]): boolean {
  if (a.t === "bin" && (a.op === "+" || a.op === "-")) return addends(a.a, out) && addends(a.b, out);
  if (a.t === "neg") {
    if (a.a.t === "bin" && (a.a.op === "+" || a.a.op === "-")) return false;
    out.push(a.a);
    return true;
  }
  out.push(a);
  return true;
}

function isMonomial(a: Ast): boolean {
  const count: Record<string, number> = {};
  let nums = 0;
  let dens = 0;
  let ok = true;
  const walk = (b: Ast) => {
    if (b.t === "num") nums++;
    else if (b.t === "var") count[b.name] = (count[b.name] ?? 0) + 1;
    else if (b.t === "neg") walk(b.a);
    else if (b.t === "bin" && b.op === "*") {
      walk(b.a);
      walk(b.b);
    } else if (b.t === "bin" && b.op === "/" && b.b.t === "num") {
      dens++;
      walk(b.a);
    } else if (b.t === "bin" && b.op === "^" && b.a.t === "var" && b.b.t === "num") count[b.a.name] = (count[b.a.name] ?? 0) + 1;
    else ok = false;
  };
  walk(a);
  return ok && nums <= 1 && dens <= 1 && Object.values(count).every((c) => c <= 1);
}

function expanded(maxTerms: number) {
  return (ast: Ast): string | null => {
    const ts: Ast[] = [];
    if (!addends(ast, ts) || !ts.every(isMonomial)) return "Desarrolla por completo: deja una suma de términos, sin paréntesis y con cada término multiplicado.";
    if (ts.length > maxTerms) return "Todavía hay términos semejantes que se pueden reducir.";
    return null;
  };
}

/** Respuesta polinómica en forma desarrollada. */
function polyPart(answer: P, mistakes: [P | null, Rich][] = [], before?: string, v = "x", prompt?: Rich): Part {
  const ms: Mistake[] = [];
  const seen: P[] = [answer];
  for (const [m, fb] of mistakes) {
    if (!m || seen.some((s) => samePoly(s, m))) continue;
    seen.push(m);
    ms.push({ answer: poly(m, v), feedback: fb });
  }
  return { kind: "expr", prompt, answer: poly(answer, v), vars: [v], validate: expanded(nonzero(answer)), before, mistakes: ms };
}

/** Respuesta entera. */
function intPart(answer: number, mistakes: [number, Rich][] = [], before?: string, prompt?: Rich): Part {
  const seen = new Set<number>([answer]);
  const ms: Mistake[] = [];
  for (const [v, fb] of mistakes) {
    if (seen.has(v)) continue;
    seen.add(v);
    ms.push({ answer: String(v), feedback: fb });
  }
  return { kind: "expr", prompt, answer: String(answer), maxOps: 0, before, mistakes: ms };
}

/** Tabla de Ruffini para dividir P entre (x - a). */
function ruffini(Pc: P, a: number): { q: P; rem: number; tex: string; mids: number[]; b: number[] } {
  const b: number[] = [Pc[0]];
  const mids: number[] = [];
  for (let i = 1; i < Pc.length; i++) {
    const m = b[i - 1] * a;
    mids.push(m);
    b.push(Pc[i] + m);
  }
  const n = Pc.length;
  const tex = `\\begin{array}{r|${"r".repeat(n)}} & ${Pc.join(" & ")} \\\\ ${a} & & ${mids.join(" & ")} \\\\ \\hline & ${b.join(" & ")} \\end{array}`;
  return { q: b.slice(0, -1), rem: b[n - 1], tex, mids, b };
}

/** División larga con pasos explicados. D debe ser mónico para que todo quede entero. */
function longDivision(N: P, D: P): { q: P; r: P; steps: Rich[] } {
  const cur = [...N];
  const qdeg = N.length - D.length;
  const Q: number[] = Array(qdeg + 1).fill(0);
  const steps: Rich[] = [];
  for (let i = 0; i <= qdeg; i++) {
    const deg = N.length - 1 - i;
    const lead = cur[i];
    const c = lead / D[0];
    Q[i] = c;
    const tdeg = qdeg - i;
    const prod = [...D.map((d) => d * c), ...Array(tdeg).fill(0)];
    for (let j = 0; j < D.length; j++) cur[i + j] -= D[j] * c;
    const rest = trim(cur.slice(i + 1));
    if (c === 0) {
      if (rest.length - 1 < D.length - 1) {
        steps.push("Lo que queda ya tiene grado menor que el divisor, así que ahí termina la división.");
        break;
      }
      steps.push(`Lo que queda no tiene término de grado $${deg}$, así que el cociente lleva $0$ en ese lugar.`);
      continue;
    }
    steps.push(
      `$${monoT(lead, deg)} \\div ${monoT(D[0], D.length - 1)} = ${monoT(c, tdeg)}$. Multiplicamos $${monoT(c, tdeg)}$ por el divisor: $${poly(trim(prod))}$. Al restar queda $${poly(rest)}$.`,
    );
  }
  return { q: trim(Q), r: trim(cur.slice(qdeg + 1)), steps };
}

/* ----------------------------------- ejercicios ----------------------------------- */

const traducir: ExerciseGen = {
  id: "traducir",
  title: "Del enunciado a la expresión",
  level: 1,
  generate: (r) => {
    const k = r.int(2, 9);
    const F = r.int(2, 9) * 100;
    const c = r.int(5, 40);
    const p = r.pick([10, 15, 20, 25, 30]);
    const pool: { text: Rich; ok: string; wrong: [string, Rich][] }[] = [
      {
        text: `El doble de un número, aumentado en ${k}.`,
        ok: `$2x + ${k}$`,
        wrong: [[`$2(x + ${k})$`, `Eso sería el doble de la suma. Aquí primero se duplica el número y después se suma ${k}.`], [`$x^{2} + ${k}$`, "El doble es multiplicar por 2, no elevar al cuadrado."], [`$2 + x + ${k}$`, "El doble de un número es $2x$, no $2 + x$."]],
      },
      {
        text: `El cuadrado de la suma de un número y ${k}.`,
        ok: `$(x + ${k})^{2}$`,
        wrong: [[`$x^{2} + ${k}^{2}$`, "Eso es la suma de los cuadrados. Aquí se suma primero y luego se eleva."], [`$x^{2} + ${k}$`, "Se eleva al cuadrado toda la suma, no solo el número."], [`$2(x + ${k})$`, "El cuadrado no es el doble."]],
      },
      {
        text: "La suma de los cuadrados de dos números.",
        ok: "$x^{2} + y^{2}$",
        wrong: [["$(x + y)^{2}$", "Eso es el cuadrado de la suma. Aquí cada número se eleva por separado y después se suman."], ["$2x + 2y$", "Elevar al cuadrado no es duplicar."], ["$(xy)^{2}$", "Eso es el cuadrado del producto."]],
      },
      {
        text: `La mitad de la diferencia entre un número y ${k}.`,
        ok: `$\\dfrac{x - ${k}}{2}$`,
        wrong: [[`$\\dfrac{x}{2} - ${k}$`, `Eso es la mitad del número menos ${k}. Aquí se toma la mitad de toda la diferencia.`], [`$2(x - ${k})$`, "La mitad es dividir entre 2, no multiplicar."], [`$\\dfrac{${k} - x}{2}$`, `La diferencia entre un número y ${k} es $x - ${k}$, en ese orden.`]],
      },
      {
        text: "Tres números enteros consecutivos.",
        ok: "$x, \\; x + 1, \\; x + 2$",
        wrong: [["$x, \\; 2x, \\; 3x$", "Esos son múltiplos, no consecutivos. Los consecutivos van de uno en uno."], ["$x, \\; x + 2, \\; x + 4$", "Esos serían pares o impares consecutivos, que van de dos en dos."], ["$x, \\; x^{2}, \\; x^{3}$", "Consecutivos quiere decir que cada uno es el anterior más 1."]],
      },
      {
        text: `El costo total de producir $q$ unidades, si hay un costo fijo de ${F} bolívares y cada unidad cuesta ${c} bolívares.`,
        ok: `$${F} + ${c}q$`,
        wrong: [[`$(${F} + ${c})q$`, "El costo fijo se paga una sola vez, no por cada unidad."], [`$${F}q + ${c}$`, "Lo que se multiplica por $q$ es el costo de cada unidad."], [`$${c}q$`, "Faltó el costo fijo, que se paga aunque no se produzca nada."]],
      },
      {
        text: `El precio $x$ de un artículo después de un descuento del ${p} %.`,
        ok: `$${num((100 - p) / 100)}x$`,
        wrong: [[`$x - ${p}$`, `El descuento es el ${p} % del precio, no ${p} bolívares.`], [`$${num(p / 100)}x$`, "Eso es solo el descuento. El precio final es lo que queda."], [`$x - ${p}x$`, `El ${p} % es $\\frac{${p}}{100}$, no ${p}.`]],
      },
      {
        text: "El producto de un número por su consecutivo.",
        ok: "$x(x + 1)$",
        wrong: [["$x + (x + 1)$", "Producto significa multiplicación, no suma."], ["$x \\cdot x + 1$", "Faltan los paréntesis: se multiplica por todo el consecutivo."], ["$2x + 1$", "Esa es la suma de un número y su consecutivo."]],
      },
    ];
    const it = r.pick(pool);
    return {
      statement: `¿Qué expresión traduce este enunciado? "${it.text}"`,
      parts: [choice(it.ok, uniqueWrong(it.ok, it.wrong))],
      hints: ["Lee despacio y busca qué operación se hace primero. \"El cuadrado de la suma\" y \"la suma de los cuadrados\" no son lo mismo."],
      solution: [`La traducción correcta es ${it.ok}.`],
    };
  },
};

const valorNumerico: ExerciseGen = {
  id: "valor-numerico",
  title: "Valor numérico",
  level: 1,
  generate: (r) => {
    if (r.bool(0.65)) {
      const a = r.nz(-4, 5);
      const b = r.nz(-6, 6);
      const c = r.int(-9, 9);
      const x0 = r.nz(-4, 4, [1]);
      const Pc = [a, b, c];
      const v = pevalAt(Pc, x0);
      const wrong = a * -(x0 * x0) + b * x0 + c;
      return {
        statement: `Calcula el valor numérico de $P(x) = ${poly(Pc)}$ para $x = ${x0}$.`,
        parts: [intPart(v, x0 < 0 ? [[wrong, `$(${x0})^{2} = ${x0 * x0}$, positivo. Un negativo al cuadrado da positivo.`]] : [], `P(${x0}) =`)],
        hints: ["Cambia cada $x$ por el número, siempre entre paréntesis.", "Respeta la jerarquía: primero la potencia, luego las multiplicaciones y al final las sumas."],
        solution: [
          `$P(${x0}) = ${a === 1 ? "" : a === -1 ? "-" : a}(${x0})^{2} ${b < 0 ? "-" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}(${x0}) ${c < 0 ? `- ${-c}` : `+ ${c}`}$.`,
          `$= ${a * x0 * x0} ${b * x0 < 0 ? "-" : "+"} ${Math.abs(b * x0)} ${c < 0 ? `- ${-c}` : `+ ${c}`} = ${v}$.`,
        ],
      };
    }
    const a = r.nz(-3, 4);
    const b = r.nz(-4, 4);
    const c = r.nz(-3, 3);
    const x0 = r.nz(-3, 3);
    const y0 = r.nz(-3, 3);
    const v = a * x0 * x0 + b * x0 * y0 + c * y0 * y0;
    const tex = terms([[a, "x^{2}"], [b, "xy"], [c, "y^{2}"]]);
    return {
      statement: `Calcula el valor de $${tex}$ para $x = ${x0}$ e $y = ${y0}$.`,
      parts: [intPart(v)],
      hints: ["Sustituye cada letra entre paréntesis y calcula término por término."],
      solution: [
        `$${coef(a, "")}${a === 1 || a === -1 ? "" : " \\cdot "}(${x0})^{2} = ${a * x0 * x0}$, $${coef(b, "")}${b === 1 || b === -1 ? "" : " \\cdot "}(${x0})(${y0}) = ${b * x0 * y0}$ y $${coef(c, "")}${c === 1 || c === -1 ? "" : " \\cdot "}(${y0})^{2} = ${c * y0 * y0}$.`,
        `Sumando: $${a * x0 * x0} ${b * x0 * y0 < 0 ? "-" : "+"} ${Math.abs(b * x0 * y0)} ${c * y0 * y0 < 0 ? "-" : "+"} ${Math.abs(c * y0 * y0)} = ${v}$.`,
      ],
    };
  },
};

const reducir: ExerciseGen = {
  id: "reducir",
  title: "Reducir términos semejantes",
  level: 1,
  generate: (r) => {
    const two = r.bool(0.4);
    const lits = two ? ["x^{2}", "xy", "y^{2}"] : ["x^{2}", "x", ""];
    const final = lits.map(() => r.nz(-7, 7));
    const pieces: [number, string][] = [];
    final.forEach((A, i) => {
      let A1: number;
      do A1 = r.nz(-8, 8); while (A1 === A);
      pieces.push([A1, lits[i]], [A - A1, lits[i]]);
    });
    let shuffled: [number, string][];
    do shuffled = r.shuffle(pieces); while (shuffled[0][1] === shuffled[1][1]);
    const answerTex = terms(final.map((A, i) => [A, lits[i]] as [number, string]));
    const vars = two ? ["x", "y"] : ["x"];
    const groupTex = (lit: string) => {
      const ps = pieces.filter((p) => p[1] === lit).map((p) => p[0]);
      const sum = ps.reduce((s, x) => s + x, 0);
      return `${lit === "" ? "Números" : `Términos en $${lit}$`}: $${ps[0]} ${ps[1] < 0 ? `- ${-ps[1]}` : `+ ${ps[1]}`} = ${sum}$`;
    };
    return {
      statement: `Reduce los términos semejantes: $${terms(shuffled)}$.`,
      parts: [{ kind: "expr", answer: answerTex, vars, validate: expanded(3) }],
      hints: ["Agrupa los términos que tienen exactamente la misma parte literal.", "Suma sus coeficientes y deja la parte literal igual."],
      solution: [...lits.map(groupTex).map((s) => `${s}.`), `Resultado: $${answerTex}$.`],
    };
  },
};

const grado: ExerciseGen = {
  id: "grado",
  title: "Grado y coeficientes de un polinomio",
  level: 1,
  generate: (r) => {
    const n = r.int(3, 5);
    const degs = r.sample([1, 2, 3, 4, 5, 6], n - 1);
    const items: [number, number][] = [...degs.map((d) => [r.nz(-9, 9), d] as [number, number]), [r.nz(-9, 9), 0]];
    let order: [number, number][];
    do order = r.shuffle(items); while (order[0][1] === Math.max(...degs));
    const tex = terms(order.map(([c, d]) => [c, pw("x", d)] as [number, string]));
    const top = items.reduce((m, it) => (it[1] > m[1] ? it : m));
    const indep = items.find((it) => it[1] === 0)![0];
    const ask = r.int(0, 2);
    if (ask === 0) {
      return {
        statement: `¿Cuál es el grado de $P(x) = ${tex}$?`,
        parts: [intPart(top[1], [[order[0][1], "Ese es el exponente del primer término escrito, pero el polinomio no está ordenado. El grado es el mayor exponente."], [n, "El grado no es la cantidad de términos, es el mayor exponente."]], "\\text{grado} =")],
        hints: ["El grado de un polinomio en $x$ es el mayor exponente de $x$ que aparece."],
        solution: [`Ordenado de mayor a menor grado: $P(x) = ${poly(Array.from({ length: top[1] + 1 }, (_, i) => items.find((it) => it[1] === top[1] - i)?.[0] ?? 0))}$.`, `El mayor exponente es $${top[1]}$, así que el grado es $${top[1]}$.`],
      };
    }
    if (ask === 1) {
      return {
        statement: `¿Cuál es el coeficiente principal de $P(x) = ${tex}$?`,
        parts: [intPart(top[0], [[order[0][0], "Ese es el coeficiente del primer término escrito. El principal es el que acompaña a la mayor potencia de $x$."], [top[1], "Ese es el grado. El coeficiente es el número que multiplica a la potencia."]])],
        hints: ["Busca el término de mayor grado. Su coeficiente, con signo, es el coeficiente principal."],
        solution: [`El término de mayor grado es $${monoT(top[0], top[1])}$.`, `Su coeficiente es $${top[0]}$.`],
      };
    }
    return {
      statement: `¿Cuál es el término independiente de $P(x) = ${tex}$?`,
      parts: [intPart(indep, [[-indep, "Revisa el signo: el término independiente lleva el signo que tiene delante."]])],
      hints: ["El término independiente es el que no tiene $x$. También es $P(0)$."],
      solution: [`El término sin $x$ es $${indep}$. Es lo que vale $P(0)$.`],
    };
  },
};

const monomioPolinomio: ExerciseGen = {
  id: "monomio-por-polinomio",
  title: "Monomio por polinomio",
  level: 1,
  generate: (r) => {
    const m = r.nz(-5, 5, [1]);
    const k = r.int(1, 2);
    const p = [r.nz(-6, 6), r.nz(-6, 6), r.nz(-9, 9)];
    const mono = [m, ...Array(k).fill(0)];
    const res = pmul(mono, p);
    const firstOnly = padd(pmul(mono, [p[0], 0, 0]), [p[1], p[2]]);
    const signFlip = padd(pmul(mono, [p[0], 0, 0]), pmul(pscale(mono, -1), [p[1], p[2]]));
    const monoTex = coef(m, pw("x", k));
    return {
      statement: `Desarrolla $${monoTex}\\left(${poly(p)}\\right)$.`,
      parts: [polyPart(res, [[firstOnly, "Multiplicaste solo el primer término. El monomio multiplica a todos los términos del paréntesis."], [signFlip, "Revisa la ley de los signos en cada producto."]])],
      hints: ["Propiedad distributiva: el monomio multiplica a cada término del paréntesis.", "En cada producto multiplica los números y suma los exponentes de $x$."],
      solution: [
        p.map((c, i) => `$${monoTex} \\cdot ${c < 0 ? `(${monoT(c, 2 - i)})` : monoT(c, 2 - i)} = ${monoT(m * c, k + 2 - i)}$`).join(", ") + ".",
        `Resultado: $${poly(res)}$.`,
      ],
    };
  },
};

const sumaResta: ExerciseGen = {
  id: "suma-resta-polinomios",
  title: "Sumar y restar polinomios",
  level: 2,
  generate: (r) => {
    let A: P, B: P, ka: number, kb: number, res: P;
    do {
      const da = r.int(2, 3);
      const db = r.int(2, 3);
      A = [r.nz(-6, 6), ...Array.from({ length: da }, () => r.int(-8, 8))];
      B = [r.nz(-6, 6), ...Array.from({ length: db }, () => r.int(-8, 8))];
      const scaled = r.bool(0.4);
      ka = scaled ? r.int(2, 3) : 1;
      kb = scaled ? r.int(2, 3) : 1;
      res = psub(pscale(A, ka), pscale(B, kb));
    } while (res.length < 2 || nonzero(A) < 3 || nonzero(B) < 3);
    const opTex = `${ka === 1 ? "" : ka}P(x) - ${kb === 1 ? "" : kb}Q(x)`;
    const Bk = pscale(B, kb);
    const onlyFirst = padd(psub(pscale(A, ka), [Bk[0], ...Array(Bk.length - 1).fill(0)]), [0, ...Bk.slice(1)]);
    return {
      statement: `Si $P(x) = ${poly(A)}$ y $Q(x) = ${poly(B)}$, calcula $${opTex}$.`,
      parts: [polyPart(res, [[onlyFirst, "Al restar un polinomio se cambia el signo de todos sus términos, no solo del primero."], [padd(pscale(A, ka), Bk), "Sumaste en lugar de restar."]], `${opTex} =`)],
      hints: [
        kb === 1 ? "Restar $Q(x)$ es cambiar el signo de cada uno de sus términos y sumar." : "Primero multiplica cada polinomio por su número. Después cambia todos los signos del que se resta.",
        "Al final junta los términos del mismo grado.",
      ],
      solution: [
        ka === 1 && kb === 1
          ? `Cambiamos todos los signos de $Q$: $-Q(x) = ${poly(pscale(B, -1))}$.`
          : `$${ka === 1 ? "" : ka}P(x) = ${poly(pscale(A, ka))}$ y $-${kb === 1 ? "" : kb}Q(x) = ${poly(pscale(B, -kb))}$.`,
        `Sumamos término a término: $${poly(pscale(A, ka))} ${poly(pscale(B, -kb)).startsWith("-") ? "" : "+ "}${poly(pscale(B, -kb))}$.`,
        `Resultado: $${poly(res)}$.`,
      ],
    };
  },
};

const productoBinomios: ExerciseGen = {
  id: "producto-polinomios",
  title: "Multiplicar polinomios",
  level: 2,
  generate: (r) => {
    if (r.bool(0.55)) {
      const a = r.pick([1, 2, 3]);
      const b = r.nz(-7, 7);
      const c = r.pick([1, 2, 3, -1]);
      const d = r.nz(-7, 7);
      const A = [a, b];
      const B = [c, d];
      const res = pmul(A, B);
      return {
        statement: `Desarrolla $\\left(${poly(A)}\\right)\\left(${poly(B)}\\right)$.`,
        parts: [polyPart(res, [[[a * c, 0, b * d], "Faltan los productos cruzados. Cada término del primero multiplica a cada término del segundo: son cuatro productos."]])],
        hints: ["Multiplica cada término del primer paréntesis por cada término del segundo. Salen cuatro productos.", "Junta los dos términos en $x$."],
        solution: [
          `Los cuatro productos: $${monoT(a * c, 2)}$, $${monoT(a * d, 1)}$, $${monoT(b * c, 1)}$ y $${b * d}$.`,
          `Juntando los términos en $x$: $${monoT(a * d, 1)} ${b * c < 0 ? "-" : "+"} ${monoT(Math.abs(b * c), 1)} = ${monoT(a * d + b * c, 1)}$.`,
          `Resultado: $${poly(res)}$.`,
        ],
      };
    }
    const a = r.nz(-5, 5);
    const b = r.nz(-5, 5);
    const c = r.nz(-6, 6);
    const A = [1, a];
    const B = [1, b, c];
    const res = pmul(A, B);
    return {
      statement: `Desarrolla $\\left(${poly(A)}\\right)\\left(${poly(B)}\\right)$.`,
      parts: [polyPart(res, [[padd([1, b, c, 0], [a]), `El $${a}$ también multiplica a todo el segundo paréntesis, no solo se suma.`]])],
      hints: ["Multiplica $x$ por cada término del trinomio, después el otro término por cada término del trinomio.", "Ordena por grado y reduce."],
      solution: [
        `$x\\left(${poly(B)}\\right) = ${poly([1, b, c, 0])}$.`,
        `$${paren(a)}\\left(${poly(B)}\\right) = ${poly(pscale(B, a))}$.`,
        `Sumando y reduciendo: $${poly(res)}$.`,
      ],
    };
  },
};

const productoNotable: ExerciseGen = {
  id: "producto-notable",
  title: "Productos notables",
  level: 2,
  generate: (r) => {
    const form = r.int(0, 2);
    if (form === 0) {
      const a = r.pick([1, 2, 3, 4]);
      const b = r.nz(-6, 6);
      const A = [a, b];
      const res = pmul(A, A);
      return {
        statement: `Desarrolla $\\left(${poly(A)}\\right)^{2}$.`,
        parts: [polyPart(res, [[[a * a, 0, b * b], "Falta el doble producto. $(a + b)^{2} = a^{2} + 2ab + b^{2}$."], [[a * a, a * b, b * b], "El término del medio es el doble del producto, $2ab$."], [[a * a, 2 * a * b, -b * b], "El último término es un cuadrado, siempre positivo."]])],
        hints: [`Usa $(a ${b < 0 ? "-" : "+"} b)^{2} = a^{2} ${b < 0 ? "-" : "+"} 2ab + b^{2}$ con $a = ${coef(a, "x")}$ y $b = ${Math.abs(b)}$.`],
        solution: [
          `Cuadrado del primero: $(${coef(a, "x")})^{2} = ${monoT(a * a, 2)}$.`,
          `Doble del producto: $2 \\cdot ${coef(a, "x")} \\cdot ${paren(b)} = ${monoT(2 * a * b, 1)}$.`,
          `Cuadrado del segundo: $${paren(b)}^{2} = ${b * b}$.`,
          `Resultado: $${poly(res)}$.`,
        ],
      };
    }
    if (form === 1) {
      const a = r.pick([1, 2, 3, 4, 5]);
      const b = r.int(1, 9);
      const res = [a * a, 0, -b * b];
      return {
        statement: `Desarrolla $\\left(${poly([a, b])}\\right)\\left(${poly([a, -b])}\\right)$.`,
        parts: [polyPart(res, [[[a * a, 0, b * b], "El último término queda con signo menos: $b \\cdot (-b) = -b^{2}$."], [[a * a, -2 * a * b, -b * b], "Los términos cruzados se cancelan entre sí."]])],
        hints: ["Es suma por diferencia: $(a + b)(a - b) = a^{2} - b^{2}$."],
        solution: [`Suma por diferencia de $${coef(a, "x")}$ y $${b}$.`, `$(${coef(a, "x")})^{2} - ${b}^{2} = ${poly(res)}$. Los términos en $x$ se cancelan.`],
      };
    }
    const b = r.nz(-3, 3);
    const res = pmul(pmul([1, b], [1, b]), [1, b]);
    return {
      statement: `Desarrolla $\\left(${poly([1, b])}\\right)^{3}$.`,
      parts: [polyPart(res, [[[1, 0, 0, b ** 3], "Faltan los dos términos del medio. $(a + b)^{3} = a^{3} + 3a^{2}b + 3ab^{2} + b^{3}$."]])],
      hints: [`Usa $(a + b)^{3} = a^{3} + 3a^{2}b + 3ab^{2} + b^{3}$ con $a = x$ y $b = ${b}$.`],
      solution: [
        `$a^{3} = x^{3}$, $3a^{2}b = 3x^{2}${paren(b)} = ${monoT(3 * b, 2)}$, $3ab^{2} = 3x${paren(b)}^{2} = ${monoT(3 * b * b, 1)}$ y $b^{3} = ${b ** 3}$.`,
        `Resultado: $${poly(res)}$.`,
      ],
    };
  },
};

const divisionSintetica: ExerciseGen = {
  id: "division-sintetica",
  title: "División sintética (Ruffini)",
  level: 2,
  generate: (r) => {
    const Q = [r.pick([1, 1, 2, 3, -1]), r.int(-5, 5), r.int(-6, 6)];
    const a = r.nz(-4, 4);
    const R = r.int(-9, 9);
    const Pc = padd(pmul([1, -a], Q), [R]);
    const rf = ruffini(Pc, a);
    const wrong = ruffini(Pc, -a);
    return {
      statement: `Usa la división sintética para dividir $P(x) = ${poly(Pc)}$ entre $${minus("x", a)}$. Escribe el cociente y el resto.`,
      parts: [
        polyPart(rf.q, [[wrong.q, `El número que va en la esquina de Ruffini es $${a}$, el valor que anula a $${minus("x", a)}$.`]], "Q(x) =", "x", "Cociente:"),
        intPart(rf.rem, [[wrong.rem, `Usaste $${-a}$ en lugar de $${a}$. Para $${minus("x", a)}$ el número es $${a}$.`]], "R =", "Resto:"),
      ],
      hints: [
        `El número de la esquina es $${a}$, porque $${minus("x", a)} = 0$ cuando $x = ${a}$.`,
        "Baja el primer coeficiente. Multiplica por el número de la esquina, súmalo al siguiente coeficiente y repite.",
        "El último número de abajo es el resto. Los demás son los coeficientes del cociente, que tiene un grado menos.",
      ],
      solution: [
        `Coeficientes de $P$: $${Pc.join(", \\; ")}$. Número de la esquina: $${a}$.`,
        `$$${rf.tex}$$`,
        `Cociente: $Q(x) = ${poly(rf.q)}$. Resto: $R = ${rf.rem}$.`,
        `Comprobación con el teorema del resto: $P(${a}) = ${pevalAt(Pc, a)}$.`,
      ],
    };
  },
};

const teoremaResto: ExerciseGen = {
  id: "teorema-resto",
  title: "Teorema del resto",
  level: 2,
  generate: (r) => {
    const Pc = [r.nz(-3, 3), r.int(-5, 5), r.int(-6, 6), r.int(-9, 9)];
    const a = r.nz(-3, 3);
    const v = pevalAt(Pc, a);
    return {
      statement: `Sin hacer la división, halla el resto de dividir $P(x) = ${poly(Pc)}$ entre $${minus("x", a)}$.`,
      parts: [intPart(v, [[pevalAt(Pc, -a), `Para $${minus("x", a)}$ hay que evaluar en $x = ${a}$, el valor que lo anula.`]], "R =")],
      hints: ["El resto de dividir $P(x)$ entre $x - a$ es $P(a)$.", `¿Qué valor de $x$ hace $${minus("x", a)} = 0$?`],
      solution: [
        `$${minus("x", a)} = 0$ cuando $x = ${a}$, así que el resto es $P(${a})$.`,
        `$P(${a}) = ${Pc.map((c, i) => `${i === 0 ? (c < 0 ? "-" : "") : c < 0 ? " - " : " + "}${Math.abs(c) === 1 && 3 - i > 0 ? "" : Math.abs(c)}${3 - i > 0 ? `(${a})${3 - i > 1 ? `^{${3 - i}}` : ""}` : ""}`).join("")} = ${v}$.`,
      ],
    };
  },
};

const divisionLarga: ExerciseGen = {
  id: "division-larga",
  title: "División larga de polinomios (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    let D: P, Q: P, R: P, N: P;
    do {
      D = [1, r.int(-3, 3), r.nz(-4, 4)];
      Q = r.bool() ? [r.pick([1, 2, 3]), r.int(-4, 4), r.int(-5, 5)] : [r.pick([1, 2, 3, -2]), r.int(-5, 5)];
      R = [r.int(-6, 6), r.int(-9, 9)];
      N = padd(pmul(D, Q), R);
    } while (R[0] === 0 && R[1] === 0);
    const ld = longDivision(N, D);
    const Rt = trim(R);
    return {
      statement: `Divide $P(x) = ${poly(N)}$ entre $D(x) = ${poly(D)}$. Halla el cociente $Q(x)$ y el resto $R(x)$.`,
      sequential: true,
      parts: [
        polyPart(ld.q, [], "Q(x) =", "x", "Cociente:"),
        polyPart(Rt, [], "R(x) =", "x", "Resto:"),
      ],
      hints: [
        "Divide el primer término del dividendo entre el primer término del divisor. Ese es el primer término del cociente.",
        "Multiplica ese término por todo el divisor y réstalo del dividendo. Repite con lo que queda.",
        "Te detienes cuando lo que queda tiene grado menor que el divisor. Eso es el resto.",
      ],
      solution: [
        ...ld.steps,
        `El cociente es $Q(x) = ${poly(ld.q)}$ y el resto es $R(x) = ${poly(Rt)}$, de grado menor que el divisor.`,
        `Comprobación: $D(x) \\cdot Q(x) + R(x) = ${poly(N)}$.`,
      ],
    };
  },
};

const utilidad: ExerciseGen = {
  id: "utilidad",
  title: "Ingreso, costo y utilidad (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const a = r.pick([1, 2]);
    const p = r.int(8, 20) * 5;
    const c = r.int(1, 6) * 5;
    const F = r.int(2, 10) * 50;
    const q0 = r.int(5, 20);
    const I = [-a, p, 0];
    const C = [c, F];
    const U = psub(I, C);
    const u0 = pevalAt(U, q0);
    return {
      statement: `Una empresa tiene ingreso $I(q) = ${p}q - ${a === 1 ? "" : a}q^{2}$ y costo $C(q) = ${F} + ${c}q$, donde $q$ es la cantidad producida (datos de ejemplo). La utilidad es $U(q) = I(q) - C(q)$.`,
      sequential: true,
      parts: [
        polyPart(U, [[[-a, p + c, -F], "El signo menos va delante de todo el costo: $-(" + `${F} + ${c}q` + ") = -" + `${F} - ${c}q` + "$."], [[-a, p - c, F], "El costo fijo también se resta."]], "U(q) =", "q", "Escribe $U(q)$ desarrollada y reducida."),
        intPart(u0, [], `U(${q0}) =`, `Calcula la utilidad cuando se producen $${q0}$ unidades.`),
      ],
      hints: ["Pon el costo entre paréntesis antes de restar: $U(q) = I(q) - (C(q))$.", "Para el valor numérico sustituye $q$ en la utilidad ya simplificada."],
      solution: [
        `$U(q) = ${p}q - ${a === 1 ? "" : a}q^{2} - (${F} + ${c}q) = ${p}q - ${a === 1 ? "" : a}q^{2} - ${F} - ${c}q$.`,
        `Reduciendo: $U(q) = ${poly(U, "q")}$.`,
        `$U(${q0}) = ${-a === -1 ? "-" : -a}(${q0})^{2} + ${p - c}(${q0}) - ${F} = ${-a * q0 * q0} + ${(p - c) * q0} - ${F} = ${u0}$.`,
        u0 < 0 ? `La utilidad es negativa: con $${q0}$ unidades la empresa tiene una pérdida de $${-u0}$.` : `Con $${q0}$ unidades la empresa gana $${u0}$.`,
      ],
    };
  },
};

const simplificarNotables: ExerciseGen = {
  id: "simplificar-notables",
  title: "Simplificar con productos notables (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    let a: number, b: number, c: number, s: number, res: P;
    do {
      a = r.nz(-5, 5);
      b = r.nz(-5, 5);
      c = r.nz(-5, 5);
      s = r.pick([1, -1]);
      res = padd(psub(pmul([1, a], [1, a]), pmul([1, -b], [1, b])), pscale(pmul([1, -c], [1, -c]), s));
    } while (res.length < 2);
    const sq1 = pmul([1, a], [1, a]);
    const dif = pmul([1, -b], [1, b]);
    const sq2 = pmul([1, -c], [1, -c]);
    const wrong = padd(padd(sq1, [-1, 0, -b * b]), pscale(sq2, s));
    const tex = `\\left(${poly([1, a])}\\right)^{2} - \\left(${poly([1, -b])}\\right)\\left(${poly([1, b])}\\right) ${s > 0 ? "+" : "-"} \\left(${poly([1, -c])}\\right)^{2}`;
    return {
      statement: `Desarrolla y simplifica $${tex}$.`,
      parts: [polyPart(res, [[wrong, "El signo menos delante del segundo producto cambia el signo de todo su resultado: $-(x^{2} - b^{2}) = -x^{2} + b^{2}$."], [padd(padd([1, 0, a * a], pscale(dif, -1)), pscale([1, 0, c * c], s)), "Faltan los dobles productos en los cuadrados de binomios."]])],
      hints: [
        "Desarrolla cada producto notable por separado y escribe cada resultado entre paréntesis.",
        "Después quita los paréntesis cuidando el signo que tiene delante, y reduce.",
      ],
      solution: [
        `$\\left(${poly([1, a])}\\right)^{2} = ${poly(sq1)}$.`,
        `$\\left(${poly([1, -b])}\\right)\\left(${poly([1, b])}\\right) = ${poly(dif)}$.`,
        `$\\left(${poly([1, -c])}\\right)^{2} = ${poly(sq2)}$.`,
        `Juntando: $\\left(${poly(sq1)}\\right) - \\left(${poly(dif)}\\right) ${s > 0 ? "+" : "-"} \\left(${poly(sq2)}\\right) = ${poly(res)}$.`,
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("expresiones-algebraicas"),
  objectives: [
    "Traducir enunciados en palabras a expresiones con letras.",
    "Calcular el valor numérico de una expresión, con cuidado en los signos.",
    "Reducir términos semejantes y sumar, restar y multiplicar polinomios.",
    "Desarrollar productos notables sin multiplicar término a término.",
    "Dividir polinomios con división larga y con Ruffini, y usar el teorema del resto.",
  ],
  sections: [
    {
      id: "lenguaje",
      title: "Del español al álgebra",
      blocks: [
        {
          type: "text",
          md: "En álgebra se usan letras para representar números que no conocemos o que pueden cambiar. Si no sabes cuánto cuesta un artículo, lo llamas $x$, y puedes seguir razonando con él como si fuera un número. Una **expresión algebraica** combina números y letras con operaciones: $3x + 5$, $x^{2} - 2xy$, $\\frac{q}{2}$.\n\nEl primer paso de casi cualquier problema es traducir el enunciado a una expresión.",
        },
        {
          type: "table",
          headers: ["En palabras", "En álgebra"],
          rows: [
            ["El doble de un número", "$2x$"],
            ["Un número aumentado en 5", "$x + 5$"],
            ["Un número disminuido en 3", "$x - 3$"],
            ["La mitad de un número", "$\\frac{x}{2}$"],
            ["El cuadrado de un número", "$x^{2}$"],
            ["El cuadrado de la suma de dos números", "$(x + y)^{2}$"],
            ["La suma de los cuadrados de dos números", "$x^{2} + y^{2}$"],
            ["Tres enteros consecutivos", "$x, \\; x + 1, \\; x + 2$"],
            ["Un número par / un número impar", "$2n$ / $2n + 1$"],
            ["El 20 % de un número", "$0{,}2x$"],
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "El orden de las palabras importa",
          md: "\"El cuadrado de la suma\" es $(x + y)^{2}$: primero se suma y después se eleva. \"La suma de los cuadrados\" es $x^{2} + y^{2}$: primero se eleva cada uno y después se suma. Con $x = 1$ e $y = 2$ dan 9 y 5.",
        },
        {
          type: "example",
          title: "Traducir un enunciado",
          problem: "Ana tiene 10 bolívares menos que el triple de lo que tiene Luis. Escribe lo que tiene Ana y lo que tienen entre los dos.",
          steps: [
            "Llama $x$ a lo que tiene Luis.",
            "El triple de lo de Luis es $3x$. Diez menos que eso es $3x - 10$. Eso tiene Ana.",
            "Entre los dos: $x + (3x - 10) = 4x - 10$.",
          ],
        },
        {
          type: "note",
          tone: "econ",
          title: "Las tres expresiones básicas de la empresa",
          md: "Si una empresa tiene un costo fijo de 500 (alquiler, por ejemplo), cada unidad le cuesta 20 producirla y la vende a 35 (datos de ejemplo), y $q$ es la cantidad producida y vendida:\n\n- Costo total: $C(q) = 500 + 20q$.\n- Ingreso: $I(q) = 35q$.\n- Utilidad: $U(q) = I(q) - C(q) = 35q - (500 + 20q) = 15q - 500$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Qué expresión es \"el cuadrado de la suma de un número y 3\"?",
            parts: [choice("$(x + 3)^{2}$", [["$x^{2} + 9$", "Eso es la suma de los cuadrados."], ["$x^{2} + 3$", "Se eleva toda la suma, no solo el número."], ["$2(x + 3)$", "El cuadrado no es el doble."]])],
            solution: ["Primero la suma, $x + 3$, y después el cuadrado: $(x + 3)^{2}$."],
          },
        },
      ],
    },
    {
      id: "valor-numerico",
      title: "Valor numérico",
      blocks: [
        {
          type: "text",
          md: "Calcular el **valor numérico** de una expresión es reemplazar cada letra por un número y hacer las cuentas. Es lo que harás cada vez que evalúes una función, así que vale la pena hacerlo sin errores.",
        },
        {
          type: "example",
          title: "Sustituir con un número negativo",
          problem: "Calcula $P(x) = 3x^{2} - 2x + 1$ para $x = -2$.",
          steps: [
            "Reemplaza cada $x$ por $(-2)$, con paréntesis: $P(-2) = 3(-2)^{2} - 2(-2) + 1$.",
            "Potencia: $(-2)^{2} = 4$.",
            "Multiplicaciones: $3 \\cdot 4 = 12$ y $-2 \\cdot (-2) = 4$.",
            "Suma: $12 + 4 + 1 = 17$.",
          ],
          answer: "$P(-2) = 17$",
        },
        {
          type: "widget",
          widget: { kind: "machine", fns: [{ name: "P", tex: "x^{2} - 3x + 2" }], input: 3, min: -5, max: 5 },
          caption: "Cambia la entrada y mira el valor numérico de $P(x) = x^{2} - 3x + 2$. Prueba con $x = 1$ y con $x = 2$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Siempre con paréntesis",
          md: "Si $x = -3$, entonces $x^{2} = (-3)^{2} = 9$, pero $-x^{2} = -(-3)^{2} = -9$. Sin paréntesis es fácil escribir $-3^{2}$ y equivocarse de signo.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Evaluar un costo",
          md: "Con $C(q) = 500 + 20q$, producir 100 unidades cuesta $C(100) = 500 + 20 \\cdot 100 = 2500$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $x^{2} - 5x$ para $x = -1$.",
            parts: [{ kind: "expr", answer: "6", maxOps: 0, mistakes: [{ answer: "4", feedback: "$(-1)^{2} = 1$ y $-5(-1) = +5$." }, { answer: "-4", feedback: "$-5 \\cdot (-1)$ es positivo." }] }],
            solution: ["$(-1)^{2} - 5(-1) = 1 + 5 = 6$."],
          },
        },
      ],
    },
    {
      id: "terminos-semejantes",
      title: "Términos, polinomios y términos semejantes",
      blocks: [
        {
          type: "text",
          md: "Un **término** es un producto de un número por letras con exponentes, como $-5x^{2}y$. El número es el **coeficiente** ($-5$) y las letras con sus exponentes son la **parte literal** ($x^{2}y$). Una expresión con un término es un **monomio**, con dos un **binomio**, con tres un **trinomio**.",
        },
        {
          type: "definition",
          title: "Polinomio en x",
          md: "Es una suma de términos de la forma $a x^{n}$ donde los exponentes $n$ son naturales o cero:\n\n$$P(x) = a_n x^{n} + \\cdots + a_1 x + a_0$$\n\n- El **grado** es el mayor exponente que aparece.\n- El **coeficiente principal** es el que acompaña a esa potencia.\n- El **término independiente** es $a_0$, el que no tiene $x$. Es lo que vale $P(0)$.\n\n$\\frac{1}{x}$ y $\\sqrt{x}$ no son polinomios, porque equivalen a exponentes $-1$ y $\\frac{1}{2}$.",
        },
        {
          type: "definition",
          title: "Términos semejantes",
          md: "Son los que tienen exactamente la misma parte literal: mismas letras con los mismos exponentes. Solo esos se pueden juntar, sumando sus coeficientes.\n\n$$4x^{2} - 7x^{2} = -3x^{2}$$\n\n$$2xy + xy = 3xy$$",
        },
        {
          type: "example",
          title: "Reducir",
          problem: "Reduce $3x^{2} - 5x + 7 - x^{2} + 2x - 4$.",
          steps: [
            "Términos en $x^{2}$: $3 - 1 = 2$, queda $2x^{2}$.",
            "Términos en $x$: $-5 + 2 = -3$, queda $-3x$.",
            "Números: $7 - 4 = 3$.",
          ],
          answer: "$2x^{2} - 3x + 3$",
        },
        {
          type: "note",
          tone: "warning",
          title: "Qué no se puede juntar",
          md: "- $3x + 2x^{2}$ se queda así. Tienen distinta parte literal.\n- $x + x = 2x$, pero $x \\cdot x = x^{2}$.\n- $2x + 3y$ tampoco se junta.",
        },
        {
          type: "text",
          md: "Cuando hay signos de agrupación, se quitan de adentro hacia afuera. Un signo menos delante de un paréntesis cambia el signo de todo lo que tiene adentro: $-(2x - 3) = -2x + 3$.",
        },
        {
          type: "example",
          title: "Paréntesis anidados",
          problem: "Simplifica $4x - [2x - 3(x - 1)]$.",
          steps: [
            "Adentro: $-3(x - 1) = -3x + 3$, así que el corchete es $2x - 3x + 3 = -x + 3$.",
            "Quitamos el corchete cambiando signos: $4x - (-x + 3) = 4x + x - 3$.",
            "Reducimos: $5x - 3$.",
          ],
          answer: "$5x - 3$",
        },
        {
          type: "quick",
          exercise: {
            statement: "Reduce $5a - 3b + 2a + 4b$.",
            parts: [{ kind: "expr", answer: "7a + b", vars: ["a", "b"], validate: expanded(2) }],
            solution: ["$5a + 2a = 7a$ y $-3b + 4b = b$. Resultado: $7a + b$."],
          },
        },
      ],
    },
    {
      id: "operaciones",
      title: "Suma, resta y multiplicación de polinomios",
      blocks: [
        {
          type: "text",
          md: "Para **sumar** polinomios se juntan los términos semejantes. Para **restar** se cambia el signo de todos los términos del que se resta y después se suma.",
        },
        {
          type: "example",
          title: "Resta de polinomios",
          problem: "Si $P(x) = 3x^{3} - 2x + 5$ y $Q(x) = x^{3} + 4x^{2} - 2x - 1$, calcula $P(x) - Q(x)$.",
          steps: [
            "Cambiamos todos los signos de $Q$: $-Q(x) = -x^{3} - 4x^{2} + 2x + 1$.",
            "Sumamos por grados: $x^{3}$: $3 - 1 = 2$. $x^{2}$: $0 - 4 = -4$. $x$: $-2 + 2 = 0$. Números: $5 + 1 = 6$.",
          ],
          answer: "$2x^{3} - 4x^{2} + 6$",
        },
        {
          type: "definition",
          title: "Propiedad distributiva",
          md: "$$a(b + c) = ab + ac$$\n\nPara multiplicar un monomio por un polinomio, el monomio multiplica a cada término. Para multiplicar dos polinomios, cada término del primero multiplica a cada término del segundo, y al final se reducen los semejantes. En cada producto se multiplican los coeficientes y se suman los exponentes de la misma letra.",
        },
        {
          type: "example",
          title: "Binomio por trinomio",
          problem: "Desarrolla $(2x - 3)(x^{2} + x - 4)$.",
          steps: [
            "$2x$ por cada término: $2x^{3} + 2x^{2} - 8x$.",
            "$-3$ por cada término: $-3x^{2} - 3x + 12$.",
            "Reducimos: $2x^{3} + (2 - 3)x^{2} + (-8 - 3)x + 12$.",
          ],
          answer: "$2x^{3} - x^{2} - 11x + 12$",
        },
        {
          type: "note",
          tone: "tip",
          title: "Control rápido",
          md: "El grado del producto es la suma de los grados. En el ejemplo, $1 + 2 = 3$. Si te sale otro grado, hay un error.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Utilidad con polinomios",
          md: "Si $I(q) = 50q - q^{2}$ y $C(q) = 200 + 10q$ (datos de ejemplo), la utilidad es\n\n$$\\begin{aligned} U(q) &= 50q - q^{2} - (200 + 10q) \\\\ &= -q^{2} + 40q - 200 \\end{aligned}$$\n\nEl paréntesis alrededor del costo es indispensable: el menos afecta al costo completo.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Desarrolla $-3x(2x^{2} - x + 4)$.",
            parts: [{ kind: "expr", answer: "-6x^{3} + 3x^{2} - 12x", vars: ["x"], validate: expanded(3), mistakes: [{ answer: "-6x^{3} - 3x^{2} + 12x", feedback: "Revisa los signos: $-3x \\cdot (-x) = +3x^{2}$." }] }],
            solution: ["$-3x \\cdot 2x^{2} = -6x^{3}$, $-3x \\cdot (-x) = 3x^{2}$ y $-3x \\cdot 4 = -12x$."],
          },
        },
      ],
    },
    {
      id: "productos-notables",
      title: "Productos notables",
      blocks: [
        {
          type: "text",
          md: "Algunos productos aparecen tanto que conviene saber el resultado de memoria. Ahorran tiempo y, leídos al revés, son la base de la factorización.",
        },
        {
          type: "definition",
          title: "Los seis productos notables",
          md: "**Cuadrado de una suma**\n\n$$(a + b)^{2} = a^{2} + 2ab + b^{2}$$\n\n**Cuadrado de una diferencia**\n\n$$(a - b)^{2} = a^{2} - 2ab + b^{2}$$\n\n**Suma por diferencia**\n\n$$(a + b)(a - b) = a^{2} - b^{2}$$\n\n**Binomios con término común**\n\n$$(x + a)(x + b) = x^{2} + (a + b)x + ab$$\n\n**Cubo de una suma**\n\n$$(a + b)^{3} = a^{3} + 3a^{2}b + 3ab^{2} + b^{3}$$\n\n**Cubo de una diferencia**\n\n$$(a - b)^{3} = a^{3} - 3a^{2}b + 3ab^{2} - b^{3}$$",
        },
        {
          type: "graph",
          spec: {
            x: [0.3, 6.5],
            y: [0.3, 6.5],
            height: 300,
            step: 1,
            segments: [
              { from: [1, 1], to: [6, 1], color: "ink" },
              { from: [6, 1], to: [6, 6], color: "ink" },
              { from: [6, 6], to: [1, 6], color: "ink" },
              { from: [1, 6], to: [1, 1], color: "ink" },
              { from: [4, 1], to: [4, 6], color: "accent" },
              { from: [1, 4], to: [6, 4], color: "accent" },
            ],
            labels: [
              { x: 2.5, y: 2.5, text: "$a^{2}$", color: "blue" },
              { x: 5, y: 2.5, text: "$ab$", color: "orange" },
              { x: 2.5, y: 5, text: "$ab$", color: "orange" },
              { x: 5, y: 5, text: "$b^{2}$", color: "green" },
              { x: 2.5, y: 0.65, text: "$a$" },
              { x: 5, y: 0.65, text: "$b$" },
            ],
          },
          caption: "Un cuadrado de lado $a + b$ tiene área $(a + b)^{2}$. Partido en cuatro piezas suma $a^{2} + ab + ab + b^{2}$. Por eso aparece el $2ab$.",
        },
        {
          type: "example",
          title: "Usar las fórmulas",
          problem: "Desarrolla $(3x - 2)^{2}$, $(2x + 5)(2x - 5)$ y $(x - 1)^{3}$.",
          steps: [
            "$(3x - 2)^{2} = (3x)^{2} - 2(3x)(2) + 2^{2} = 9x^{2} - 12x + 4$.",
            "$(2x + 5)(2x - 5) = (2x)^{2} - 5^{2} = 4x^{2} - 25$.",
            "$(x - 1)^{3} = x^{3} - 3x^{2}(1) + 3x(1)^{2} - 1^{3} = x^{3} - 3x^{2} + 3x - 1$.",
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "El error más repetido del álgebra",
          md: "$(a + b)^{2} \\ne a^{2} + b^{2}$. Siempre falta el término $2ab$. Si dudas, prueba con números: $(1 + 2)^{2} = 9$, pero $1^{2} + 2^{2} = 5$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Desarrolla $(x + 4)^{2}$.",
            parts: [{ kind: "expr", answer: "x^{2} + 8x + 16", vars: ["x"], validate: expanded(3), mistakes: [{ answer: "x^{2} + 16", feedback: "Falta el doble producto, $2 \\cdot x \\cdot 4 = 8x$." }, { answer: "x^{2} + 4x + 16", feedback: "El término del medio es el doble del producto: $8x$." }] }],
            solution: ["$x^{2} + 2 \\cdot x \\cdot 4 + 4^{2} = x^{2} + 8x + 16$."],
          },
        },
      ],
    },
    {
      id: "division",
      title: "División de polinomios",
      blocks: [
        {
          type: "text",
          md: "Con números, $17 \\div 5$ da cociente 3 y resto 2, porque $17 = 5 \\cdot 3 + 2$ y el resto es menor que el divisor. Con polinomios pasa igual:\n\n$$P(x) = D(x) \\cdot Q(x) + R(x)$$\n\ndonde $Q$ es el cociente y el resto $R$ tiene grado menor que el divisor $D$.\n\nDividir un polinomio entre un monomio es fácil: se divide cada término. $\\dfrac{12x^{5} - 8x^{3}}{4x^{2}} = 3x^{3} - 2x$.",
        },
        {
          type: "example",
          title: "División larga",
          problem: "Divide $2x^{3} + 3x^{2} - 5x + 6$ entre $x + 2$.",
          steps: [
            "$2x^{3} \\div x = 2x^{2}$. Multiplicamos: $2x^{2}(x + 2) = 2x^{3} + 4x^{2}$. Restamos: queda $-x^{2} - 5x + 6$.",
            "$-x^{2} \\div x = -x$. Multiplicamos: $-x(x + 2) = -x^{2} - 2x$. Restamos: queda $-3x + 6$.",
            "$-3x \\div x = -3$. Multiplicamos: $-3(x + 2) = -3x - 6$. Restamos: queda $12$.",
            "$12$ tiene grado 0, menor que el del divisor. Ahí paramos.",
          ],
          answer: "Cociente $2x^{2} - x - 3$, resto $12$.",
        },
        {
          type: "definition",
          title: "División sintética o regla de Ruffini",
          md: "Sirve cuando el divisor es de la forma $x - a$. Es la misma división larga, escrita solo con los coeficientes.\n\n1. Escribe los coeficientes del dividendo ordenados, con $0$ en los grados que falten.\n\n2. Pon $a$ en la esquina. Para $x + 2$, que es $x - (-2)$, el número es $-2$.\n\n3. Baja el primer coeficiente. Multiplícalo por $a$, escríbelo bajo el siguiente y suma. Repite hasta el final.\n\n4. El último número es el resto. Los anteriores son los coeficientes del cociente, que tiene un grado menos.",
        },
        {
          type: "example",
          title: "La misma división con Ruffini",
          problem: "Divide $2x^{3} + 3x^{2} - 5x + 6$ entre $x + 2$ con Ruffini.",
          steps: [
            "Coeficientes $2, 3, -5, 6$ y número de la esquina $-2$.",
            "$$\\begin{array}{r|rrrr} & 2 & 3 & -5 & 6 \\\\ -2 & & -4 & 2 & 6 \\\\ \\hline & 2 & -1 & -3 & 12 \\end{array}$$",
            "Cociente $2x^{2} - x - 3$ y resto $12$, igual que con la división larga.",
          ],
        },
        {
          type: "definition",
          title: "Teorema del resto",
          md: "El resto de dividir $P(x)$ entre $x - a$ es $P(a)$.\n\nEn el ejemplo,\n\n$$\\begin{aligned} P(-2) &= 2(-8) + 3(4) - 5(-2) + 6 \\\\ &= -16 + 12 + 10 + 6 = 12 \\end{aligned}$$\n\nSi $P(a) = 0$, la división es exacta y $x - a$ es un factor de $P(x)$. Esa idea es la que se usa para factorizar.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Dos descuidos frecuentes en Ruffini",
          md: "- Olvidar los ceros de los términos que faltan. En $x^{3} - 2x + 5$ los coeficientes son $1, 0, -2, 5$.\n- Usar el signo equivocado. Para $x - 3$ el número es $3$, y para $x + 3$ es $-3$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Cuál es el resto de dividir $x^{3} - 2x + 5$ entre $x - 2$?",
            parts: [{ kind: "expr", answer: "9", maxOps: 0, mistakes: [{ answer: "1", feedback: "Evalúa en $x = 2$, no en $x = -2$." }] }],
            solution: ["Por el teorema del resto, es $P(2) = 8 - 4 + 5 = 9$."],
          },
        },
      ],
    },
  ],
  exercises: [
    traducir,
    valorNumerico,
    reducir,
    grado,
    monomioPolinomio,
    sumaResta,
    productoBinomios,
    productoNotable,
    divisionSintetica,
    teoremaResto,
    divisionLarga,
    utilidad,
    simplificarNotables,
  ],
};

export default topic;
