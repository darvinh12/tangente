import { meta } from "../catalog";
import { choice } from "../helpers";
import type { ExerciseGen, Rich, Topic } from "../types";
import { pt } from "@/lib/math/intervals";
import { fmt, frac, gcd, lcm, minus, paren, poly, terms } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

function polyMul(a: number[], b: number[]): number[] {
  const out = Array(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => (out[i + j] += x * y)));
  return out;
}

const setTex = (xs: (number | string)[]) =>
  xs.length ? `\\{${xs.map((x) => (typeof x === "number" ? fmt(x) : x)).join(", ")}\\}` : "\\varnothing";

const sortNum = (xs: number[]) => [...xs].sort((a, b) => a - b);

/** Sistema 2x2 en LaTeX. */
function sysTex(a1: number, b1: number, c1: number, a2: number, b2: number, c2: number): string {
  return `\\begin{cases} ${terms([[a1, "x"], [b1, "y"]])} = ${c1} \\\\ ${terms([[a2, "x"], [b2, "y"]])} = ${c2} \\end{cases}`;
}

/** k(x - q) sin paréntesis ni unos de más. */
function mul(k: number, q: number): string {
  const c = k === 1 ? "" : k === -1 ? "-" : String(k);
  if (q === 0) return `${c}x`;
  return k === 1 ? minus("x", q) : `${c}(${minus("x", q)})`;
}

/** "3x = 12, así que x = 4", o solo "x = 4" si el coeficiente es 1. */
function finish(coef: number, rhs: number, x0: number): string {
  return coef === 1 ? `$x = ${x0}$` : `$${terms([[coef, "x"]])} = ${rhs}$, así que $x = ${x0}$`;
}

const EMPTY_HINT = 'Si no hay solución, escribe "vacío".';

/* ----------------------------------- ejercicios ----------------------------------- */

const lineal: ExerciseGen = {
  id: "lineal",
  title: "Ecuación lineal",
  level: 1,
  generate: (r) => {
    const x0 = r.int(-9, 9);
    let a: number, c: number;
    do {
      a = r.nz(-9, 9);
      c = r.int(-6, 6);
    } while (a === c);
    const b = r.int(-15, 15);
    const d = (a - c) * x0 + b;
    const lhs = terms([[a, "x"], [b, ""]]);
    const rhs = terms([[c, "x"], [d, ""]]);
    const mistakes = [];
    if ((d + b) / (a - c) !== x0) mistakes.push({ answer: frac(d + b, a - c), feedback: "Al pasar un término al otro lado del igual, cambia de signo. Revisa el número que pasaste." });
    return {
      statement: `Resuelve $${lhs} = ${rhs}$.`,
      parts: [{ kind: "expr", before: "x =", answer: String(x0), maxOps: 1, mistakes }],
      hints: ["Deja los términos con $x$ de un lado y los números del otro.", "Lo que está sumando pasa restando, y al revés."],
      solution: [
        `Pasamos las $x$ a la izquierda y los números a la derecha: $${terms([[a, "x"], [-c, "x"]])} = ${terms([[d, ""], [-b, ""]])}$.`,
        `Simplificamos: ${finish(a - c, d - b, x0)}.`,
      ],
    };
  },
};

const linealParentesis: ExerciseGen = {
  id: "lineal-parentesis",
  title: "Ecuación lineal con paréntesis",
  level: 1,
  generate: (r) => {
    let k: number, n: number, p: number, q: number, m: number, x0: number;
    do {
      k = r.int(2, 6);
      n = r.nz(-5, 5);
      p = r.nz(-6, 6);
      q = r.nz(-6, 6);
      x0 = r.int(-8, 8);
      m = n * (x0 - q) - k * (x0 + p);
    } while (k === n || Math.abs(m) > 30 || m === 0);
    const lhs = `${k}(${minus("x", -p)}) ${m > 0 ? "+" : "-"} ${Math.abs(m)}`;
    const rhs = mul(n, q);
    const wrong = (-q - p - m) / (k - n);
    const mistakes = Number.isFinite(wrong) && wrong !== x0 ? [{ answer: frac(-q - p - m, k - n), feedback: "El número de afuera multiplica a todos los términos del paréntesis, no solo al primero." }] : [];
    return {
      statement: `Resuelve $${lhs} = ${rhs}$.`,
      parts: [{ kind: "expr", before: "x =", answer: String(x0), maxOps: 1, mistakes }],
      hints: ["Primero quita los paréntesis con la propiedad distributiva.", "Después agrupa las $x$ de un lado y los números del otro."],
      solution: [
        `Distribuimos: $${terms([[k, "x"], [k * p, ""], [m, ""]])} = ${terms([[n, "x"], [-n * q, ""]])}$.`,
        `Simplificamos la izquierda: $${terms([[k, "x"], [k * p + m, ""]])} = ${terms([[n, "x"], [-n * q, ""]])}$.`,
        `Agrupamos: $${terms([[k - n, "x"]])} = ${-n * q - k * p - m}$.`,
        `Resultado: $x = ${x0}$.`,
      ],
    };
  },
};

const cuadraticaFactorizable: ExerciseGen = {
  id: "cuadratica-factorizable",
  title: "Ecuación cuadrática por factorización",
  level: 1,
  generate: (r) => {
    const v = r.pick([1, 1, 2, 3]);
    if (v === 2) {
      const k = r.nz(-9, 9);
      return {
        statement: `Resuelve $x^{2} = ${k}x$.`,
        parts: [
          {
            kind: "set",
            before: "S =",
            answer: sortNum([0, k]),
            mistakes: [{ answer: [k], feedback: "Dividiste entre $x$ y perdiste la solución $x = 0$. Nunca dividas entre algo que puede valer cero: saca factor común." }],
          },
        ],
        hints: ["Pasa todo a un lado para que quede igualado a cero.", "Saca $x$ como factor común."],
        solution: [`Pasamos todo a la izquierda: $${poly([1, -k, 0])} = 0$.`, `Factor común: $x(${minus("x", k)}) = 0$.`, `$x = 0$ o $x = ${k}$. Resultado: $S = ${setTex(sortNum([0, k]))}$.`],
      };
    }
    if (v === 3) {
      const a = r.int(1, 10);
      return {
        statement: `Resuelve $x^{2} - ${a * a} = 0$.`,
        parts: [{ kind: "set", before: "S =", answer: [-a, a], mistakes: [{ answer: [a], feedback: `Falta la solución negativa. $(${-a})^{2} = ${a * a}$ también.` }] }],
        hints: ["Es una diferencia de cuadrados."],
        solution: [`$x^{2} - ${a * a} = (x - ${a})(x + ${a}) = 0$.`, `Resultado: $S = \\{${-a}, ${a}\\}$.`],
      };
    }
    let r1: number, r2: number;
    do {
      r1 = r.nz(-9, 9);
      r2 = r.nz(-9, 9);
    } while (r1 >= r2 || r1 + r2 === 0 || Math.abs(r1 * r2) > 54);
    const tex = poly([1, -(r1 + r2), r1 * r2]);
    return {
      statement: `Resuelve $${tex} = 0$.`,
      parts: [{ kind: "set", before: "S =", answer: [r1, r2], mistakes: [{ answer: [-r1, -r2], feedback: `Los signos quedaron al revés. El factor $(${minus("x", r1)})$ se anula en $x = ${r1}$.` }] }],
      hints: [`Factoriza: dos números con producto $${r1 * r2}$ y suma $${-(r1 + r2)}$.`, "Cada factor igualado a cero da una solución."],
      solution: [`Factorizamos: $(${minus("x", r1)})(${minus("x", r2)}) = 0$.`, `Cada factor igualado a cero: $x = ${r1}$ o $x = ${r2}$.`, `Resultado: $S = \\{${r1}, ${r2}\\}$.`],
    };
  },
};

const discriminante: ExerciseGen = {
  id: "discriminante",
  title: "El discriminante decide cuántas soluciones hay",
  level: 1,
  generate: (r) => {
    let a: number, b: number, c: number;
    if (r.bool(0.25)) {
      const p = r.int(1, 3);
      const q = r.nz(-5, 5);
      [a, b, c] = [p * p, 2 * p * q, q * q];
    } else {
      do {
        a = r.nz(-3, 4);
        b = r.int(-7, 7);
        c = r.nz(-8, 8);
      } while (b * b - 4 * a * c === 0);
    }
    const D = b * b - 4 * a * c;
    const opts = ["Dos soluciones reales distintas", "Una sola solución real", "Ninguna solución real"];
    const idx = D > 0 ? 0 : D === 0 ? 1 : 2;
    const why = [
      "El discriminante es positivo, así que hay dos soluciones reales distintas.",
      "El discriminante es cero: hay una sola solución (doble).",
      "El discriminante es negativo: la raíz cuadrada no existe en los reales y no hay soluciones.",
    ];
    const tex = poly([a, b, c]);
    const D2 = b * b + 4 * a * c;
    return {
      statement: `Considera la ecuación $${tex} = 0$.`,
      sequential: true,
      parts: [
        {
          kind: "expr",
          prompt: "Calcula el discriminante $\\Delta = b^2 - 4ac$.",
          before: "\\Delta =",
          answer: String(D),
          maxOps: 0,
          mistakes: D2 !== D ? [{ answer: String(D2), feedback: "Revisa los signos. Si $a$ y $c$ tienen el mismo signo, $-4ac$ es negativo." }] : [],
        },
        choice(
          opts[idx],
          opts.filter((_, i) => i !== idx).map((o) => [o, `Con $\\Delta = ${D}$ eso no ocurre. ${why[idx]}`] as [Rich, Rich]),
          "¿Cuántas soluciones reales tiene?",
        ),
      ],
      hints: [`Aquí $a = ${a}$, $b = ${b}$ y $c = ${c}$.`, "$\\Delta > 0$: dos soluciones. $\\Delta = 0$: una. $\\Delta < 0$: ninguna."],
      solution: [`$\\Delta = ${paren(b)}^{2} - 4 \\cdot ${paren(a)} \\cdot ${paren(c)} = ${b * b} ${-4 * a * c >= 0 ? "+" : "-"} ${Math.abs(4 * a * c)} = ${D}$.`, why[idx]],
    };
  },
};

const valorAbsoluto: ExerciseGen = {
  id: "valor-absoluto",
  title: "Ecuación con valor absoluto",
  level: 1,
  generate: (r) => {
    const a = r.pick([1, 1, 2, 3]);
    const t = r.int(1, 5);
    const k = a * t;
    const x1 = r.int(-5, 6);
    const b = k - a * x1;
    const x2 = x1 - 2 * t;
    const inside = poly([a, b]);
    if (r.bool(0.15)) {
      return {
        statement: `Resuelve $|${inside}| = ${-k}$. ${EMPTY_HINT}`,
        parts: [{ kind: "set", before: "S =", answer: [] }],
        hints: ["¿Puede un valor absoluto dar un número negativo?"],
        solution: [`Un valor absoluto nunca es negativo, así que no puede valer $${-k}$. La ecuación no tiene solución: $S = \\varnothing$.`],
      };
    }
    return {
      statement: `Resuelve $|${inside}| = ${k}$.`,
      parts: [{ kind: "set", before: "S =", answer: sortNum([x1, x2]), mistakes: [{ answer: [x1], feedback: `Falta un caso. Lo de adentro puede valer $${k}$ o $${-k}$.` }] }],
      hints: [`Lo que está adentro vale $${k}$ o vale $${-k}$.`, "Resuelve las dos ecuaciones lineales por separado."],
      solution: [
        `Caso positivo: $${inside} = ${k}$, así que $x = ${x1}$.`,
        `Caso negativo: $${inside} = ${-k}$, así que $x = ${x2}$.`,
        `Resultado: $S = ${setTex(sortNum([x1, x2]))}$.`,
      ],
    };
  },
};

const fraccionLineal: ExerciseGen = {
  id: "fraccion-lineal",
  title: "Ecuación lineal con fracciones",
  level: 2,
  generate: (r) => {
    const [a, c] = r.sample([2, 3, 4, 5, 6], 2);
    const L = lcm(a, c);
    const x0 = L * r.nz(-2, 3);
    const b = c * r.nz(-3, 3);
    const d = x0 / a - (x0 - b) / c;
    const A = L / a;
    const C = L / c;
    const wrong = (L * d + C * b) / (A - C);
    const mistakes = wrong !== x0 ? [{ answer: frac(L * d + C * b, A - C), feedback: "El menos delante de la fracción afecta a todo el numerador. Al multiplicar queda $-" + `${C}(${minus("x", b)})` + "$, y eso cambia el signo de los dos términos." }] : [];
    return {
      statement: `Resuelve $\\dfrac{x}{${a}} - \\dfrac{${minus("x", b)}}{${c}} = ${d}$.`,
      parts: [{ kind: "expr", before: "x =", answer: String(x0), maxOps: 1, mistakes }],
      hints: [`Multiplica todos los términos por el mcm de los denominadores, que es $${L}$.`, "Pon paréntesis en el numerador que va restando."],
      solution: [
        `Multiplicamos todo por $${L}$: $${A === 1 ? "" : A}x - ${C === 1 ? "" : C}(${minus("x", b)}) = ${L * d}$.`,
        `Quitamos el paréntesis: $${terms([[A, "x"], [-C, "x"], [C * b, ""]])} = ${L * d}$.`,
        `$${terms([[A - C, "x"]])} = ${L * d - C * b}$, así que $x = ${x0}$.`,
      ],
    };
  },
};

const formulaGeneral: ExerciseGen = {
  id: "formula-general",
  title: "Fórmula general",
  level: 2,
  generate: (r) => {
    if (r.bool(0.3)) {
      const h = r.int(-4, 4);
      const n = r.pick([2, 3, 5, 6, 7]);
      const b = -2 * h;
      const c = h * h - n;
      const tex = poly([1, b, c]);
      const D = b * b - 4 * c;
      const sols = [`${h} - \\sqrt{${n}}`, `${h} + \\sqrt{${n}}`].map((s) => s.replace(/^0 - /, "-").replace(/^0 \+ /, ""));
      return {
        statement: `Resuelve $${tex} = 0$ con la fórmula general.`,
        parts: [{ kind: "set", before: "S =", answer: sols }],
        hints: ["$x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.", `El discriminante es $${D} = 4 \\cdot ${n}$, y $\\sqrt{4 \\cdot ${n}} = 2\\sqrt{${n}}$.`],
        solution: [
          `$a = 1$, $b = ${b}$, $c = ${c}$.`,
          `$\\Delta = ${paren(b)}^{2} - 4 \\cdot ${paren(c)} = ${D}$, y $\\sqrt{${D}} = 2\\sqrt{${n}}$.`,
          `$x = \\dfrac{${-b} \\pm 2\\sqrt{${n}}}{2} = ${h === 0 ? "" : h} \\pm \\sqrt{${n}}$.`,
          `Resultado: $S = \\{${sols.join(", ")}\\}$.`,
        ],
      };
    }
    let p1: number, q1: number, p2: number, q2: number;
    do {
      q1 = r.int(1, 3);
      q2 = r.int(1, 3);
      p1 = r.nz(-6, 6);
      p2 = r.int(-6, 6);
    } while (q1 * q2 < 2 || gcd(p1, q1) !== 1 || gcd(p2, q2) !== 1 || p1 * q2 === p2 * q1);
    const co = polyMul([q1, -p1], [q2, -p2]);
    const [a, b, c] = co;
    const D = b * b - 4 * a * c;
    const sq = Math.round(Math.sqrt(D));
    const s1 = frac(-b - sq, 2 * a);
    const s2 = frac(-b + sq, 2 * a);
    return {
      statement: `Resuelve $${poly(co)} = 0$.`,
      parts: [
        {
          kind: "set",
          before: "S =",
          answer: [s1, s2],
          mistakes: [{ answer: [frac(b - sq, 2 * a), frac(b + sq, 2 * a)], feedback: "En la fórmula va $-b$, no $b$. Revisa el signo." }],
        },
      ],
      hints: ["$x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.", `Aquí $a = ${a}$, $b = ${b}$, $c = ${c}$.`],
      solution: [
        `$\\Delta = ${paren(b)}^{2} - 4 \\cdot ${a} \\cdot ${paren(c)} = ${D}$, y $\\sqrt{${D}} = ${sq}$.`,
        `$x = \\dfrac{${-b} \\pm ${sq}}{${2 * a}}$.`,
        `$x_1 = \\dfrac{${-b - sq}}{${2 * a}} = ${s1}$ y $x_2 = \\dfrac{${-b + sq}}{${2 * a}} = ${s2}$.`,
        `Resultado: $S = \\left\\{${s1}, ${s2}\\right\\}$.`,
      ],
    };
  },
};

const racional: ExerciseGen = {
  id: "racional",
  title: "Ecuación con la incógnita en el denominador",
  level: 2,
  generate: (r) => {
    if (r.bool(0.25)) {
      const k = r.int(1, 7);
      const m = r.int(2, 5);
      const xk = minus("x", k);
      return {
        statement: `Resuelve $\\dfrac{x}{${xk}} = \\dfrac{${k}}{${xk}} + ${m}$. ${EMPTY_HINT}`,
        parts: [{ kind: "set", before: "S =", answer: [], mistakes: [{ answer: [k], feedback: `$x = ${k}$ anula el denominador, así que está prohibido. No puede ser solución.` }] }],
        hints: [`Anota primero la restricción: $x \\neq ${k}$.`, `Multiplica todo por $${xk}$ y resuelve. Después revisa la restricción.`],
        solution: [
          `Restricción: $x \\neq ${k}$.`,
          `Multiplicamos por $${xk}$: $x = ${k} + ${m}(${xk})$.`,
          `$x = ${terms([[m, "x"], [k - m * k, ""]])}$, así que $${terms([[1 - m, "x"]])} = ${m * k - k}$ y $x = ${k}$.`,
          `Pero $x = ${k}$ está prohibido. La ecuación no tiene solución: $S = \\varnothing$.`,
        ],
      };
    }
    let x0: number, d1: number, d2: number;
    do {
      x0 = r.nz(-6, 6);
      d1 = r.nz(-4, 4);
      d2 = r.nz(-4, 4);
    } while (d1 === d2 || Math.sign(d1) !== Math.sign(d2));
    const g = gcd(d1, d2);
    const a = Math.abs(d1) / g;
    const b = Math.abs(d2) / g;
    const p = x0 - d1;
    const q = x0 - d2;
    return {
      statement: `Resuelve $\\dfrac{${a}}{${minus("x", p)}} = \\dfrac{${b}}{${minus("x", q)}}$. ${EMPTY_HINT}`,
      parts: [{ kind: "set", before: "S =", answer: [x0] }],
      hints: [`Restricciones: $x \\neq ${p}$ y $x \\neq ${q}$.`, "Multiplica en cruz y resuelve la ecuación lineal."],
      solution: [
        `Restricciones: $x \\neq ${p}$ y $x \\neq ${q}$.`,
        `Multiplicamos en cruz: $${mul(a, q)} = ${mul(b, p)}$.`,
        `$${terms([[a, "x"], [-a * q, ""]])} = ${terms([[b, "x"], [-b * p, ""]])}$. Entonces ${finish(a - b, a * q - b * p, x0)}.`,
        `$${x0}$ no está prohibido. Resultado: $S = \\{${x0}\\}$.`,
      ],
    };
  },
};

const bicuadratica: ExerciseGen = {
  id: "bicuadratica",
  title: "Ecuación bicuadrática",
  level: 2,
  generate: (r) => {
    const m = r.int(1, 3);
    const n = r.int(m + 1, 4);
    const neg = r.bool(0.35);
    const u1 = m * m;
    const u2 = neg ? -n * n : n * n;
    const tex = poly([1, 0, -(u1 + u2), 0, u1 * u2]);
    const answer = neg ? [-m, m] : [-n, -m, m, n];
    return {
      statement: `Resuelve $${tex} = 0$.`,
      parts: [
        {
          kind: "set",
          before: "S =",
          answer,
          mistakes: [
            { answer: neg ? [u1] : [u1, u2], feedback: "Esos son los valores de $u = x^2$. Falta deshacer el cambio sacando raíz cuadrada." },
            { answer: neg ? [m] : [m, n], feedback: "Faltan las soluciones negativas: si $x^2 = 4$, $x$ puede ser $2$ o $-2$." },
          ],
        },
      ],
      hints: ["Haz el cambio $u = x^2$ y resuelve la cuadrática en $u$.", "Para cada $u \\ge 0$, $x = \\pm\\sqrt{u}$. Los $u$ negativos no dan soluciones."],
      solution: [
        `Con $u = x^{2}$ queda $${poly([1, -(u1 + u2), u1 * u2], "u")} = 0$.`,
        `Factorizamos: $(${minus("u", u1)})(${minus("u", u2)}) = 0$, así que $u = ${u1}$ o $u = ${u2}$.`,
        `$x^{2} = ${u1}$ da $x = \\pm ${m}$.`,
        neg ? `$x^{2} = ${u2}$ no tiene solución real, porque un cuadrado no es negativo.` : `$x^{2} = ${u2}$ da $x = \\pm ${n}$.`,
        `Resultado: $S = ${setTex(answer)}$.`,
      ],
    };
  },
};

const sistema: ExerciseGen = {
  id: "sistema",
  title: "Sistema de dos ecuaciones",
  level: 2,
  generate: (r) => {
    let a1: number, b1: number, a2: number, b2: number, x0: number, y0: number;
    do {
      a1 = r.nz(-5, 5);
      b1 = r.nz(-5, 5);
      a2 = r.nz(-5, 5);
      b2 = r.nz(-5, 5);
      x0 = r.int(-6, 6);
      y0 = r.int(-6, 6);
    } while (a1 * b2 - a2 * b1 === 0 || (Math.abs(b1) !== 1 && Math.abs(b2) !== 1 && Math.abs(a1) !== 1 && Math.abs(a2) !== 1));
    const c1 = a1 * x0 + b1 * y0;
    const c2 = a2 * x0 + b2 * y0;
    const L = lcm(b1, b2);
    const m1 = L / b1;
    const m2 = L / b2;
    const mults: string[] = [];
    if (m1 !== 1) mults.push(`la primera ecuación por $${paren(m1)}$`);
    if (m2 !== 1) mults.push(`la segunda por $${paren(m2)}$`);
    return {
      statement: `Resuelve el sistema $${sysTex(a1, b1, c1, a2, b2, c2)}$`,
      parts: [
        { kind: "expr", before: "x =", answer: String(x0), maxOps: 1 },
        { kind: "expr", before: "y =", answer: String(y0), maxOps: 1 },
      ],
      hints: ["Elige el método que deje las cuentas más simples. Si alguna incógnita tiene coeficiente $1$ o $-1$, despéjala y sustituye.", "Para reducción, multiplica cada ecuación para que una incógnita tenga el mismo coeficiente en las dos y resta."],
      solution: [
        mults.length
          ? `Por reducción: multiplicamos ${mults.join(" y ")}, así $y$ queda con el mismo coeficiente en las dos.`
          : "Por reducción: las dos ecuaciones ya tienen el mismo coeficiente en $y$.",
        `$${terms([[a1 * m1, "x"], [L, "y"]])} = ${c1 * m1}$ y $${terms([[a2 * m2, "x"], [L, "y"]])} = ${c2 * m2}$.`,
        `Restamos: ${finish(a1 * m1 - a2 * m2, c1 * m1 - c2 * m2, x0)}.`,
        `Sustituimos en la primera: $${a1 === 1 ? "" : a1 === -1 ? "-" : `${a1} \\cdot `}${paren(x0)} ${b1 > 0 ? "+" : "-"} ${Math.abs(b1) === 1 ? "" : Math.abs(b1)}y = ${c1}$, de donde $y = ${y0}$.`,
      ],
    };
  },
};

const radical: ExerciseGen = {
  id: "radical",
  title: "Ecuación con radical y soluciones extrañas (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    let c: number, r1: number, r2: number, a: number, b: number;
    const bothValid = r.bool(0.25);
    do {
      c = r.int(-3, 3);
      r1 = r.int(-c, -c + 6);
      r2 = bothValid ? r.int(-c, -c + 6) : r.int(-c - 6, -c - 1);
      a = 2 * c + r1 + r2;
      b = c * c - r1 * r2;
    } while (r1 === r2 || a === 0);
    const inner = poly([a, b]);
    const rhs = minus("x", -c);
    const valid = bothValid ? sortNum([r1, r2]) : [r1];
    const check = (x: number) => {
      const L = Math.sqrt(a * x + b);
      const R = x + c;
      return `$x = ${x}$: $\\sqrt{${a * x + b}} = ${L}$ y $${x} ${c >= 0 ? "+" : "-"} ${Math.abs(c)} = ${R}$. ${L === R ? "Sirve." : "No sirve, es una solución extraña."}`;
    };
    return {
      statement: `Resuelve $\\sqrt{${inner}} = ${rhs}$.`,
      parts: [
        {
          kind: "set",
          before: "S =",
          answer: valid,
          mistakes: bothValid ? [] : [{ answer: sortNum([r1, r2]), feedback: `No verificaste. Con $x = ${r2}$ el lado derecho da $${r2 + c}$, negativo, y una raíz cuadrada nunca es negativa.` }],
        },
      ],
      hints: ["Eleva los dos lados al cuadrado y resuelve la cuadrática.", "Sustituye cada candidato en la ecuación original. La raíz nunca da negativo."],
      solution: [
        `Elevamos al cuadrado: $${inner} = (${rhs})^{2} = ${poly([1, 2 * c, c * c])}$.`,
        `Ordenamos: $${poly([1, 2 * c - a, c * c - b])} = 0$, que se factoriza como $(${minus("x", Math.min(r1, r2))})(${minus("x", Math.max(r1, r2))}) = 0$. Candidatos: $${Math.min(r1, r2)}$ y $${Math.max(r1, r2)}$.`,
        check(r1),
        check(r2),
        `Resultado: $S = ${setTex(valid)}$.`,
      ],
    };
  },
};

const equilibrioMercado: ExerciseGen = {
  id: "equilibrio-mercado",
  title: "Equilibrio de mercado (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const q0 = r.int(4, 30);
    const a = r.int(1, 4);
    const b = r.int(5, 30);
    const p0 = a * q0 + b;
    const d = r.int(1, 5);
    const c = p0 + d * q0;
    return {
      statement: `En un mercado (datos de ejemplo), la oferta es $p = ${terms([[a, "q"], [b, ""]])}$ y la demanda es $p = ${terms([[c, ""], [-d, "q"]])}$, con $q$ en miles de unidades y $p$ en dólares. Halla el equilibrio.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Cantidad de equilibrio.", before: "q =", answer: String(q0), maxOps: 1 },
        { kind: "expr", prompt: "Precio de equilibrio.", before: "p =", answer: String(p0), maxOps: 1 },
      ],
      hints: ["En el equilibrio el precio de oferta y el de demanda son iguales.", "Iguala las dos expresiones de $p$ y despeja $q$."],
      solution: [
        `Igualamos: $${terms([[a, "q"], [b, ""]])} = ${terms([[c, ""], [-d, "q"]])}$.`,
        `$${terms([[a + d, "q"]])} = ${c - b}$, así que $q = ${q0}$ mil unidades.`,
        `Sustituimos en la oferta: $p = ${a === 1 ? "" : `${a} \\cdot `}${q0} + ${b} = ${p0}$ dólares.`,
        "A ese precio, lo que los productores quieren vender coincide con lo que los consumidores quieren comprar.",
      ],
    };
  },
};

const puntoEquilibrio: ExerciseGen = {
  id: "punto-equilibrio",
  title: "Punto de equilibrio de una empresa (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const v = r.int(4, 40);
    const m = r.int(2, 15);
    const p = v + m;
    const q0 = r.int(5, 40) * 10;
    const F = m * q0;
    const q1 = q0 + r.pick([-1, 1, 2]) * r.int(2, 8) * 10;
    const U1 = m * q1 - F;
    return {
      statement: `Una empresa tiene costos fijos de $${F}$ dólares al mes y un costo variable de $${v}$ dólares por unidad. Vende cada unidad a $${p}$ dólares. (Datos de ejemplo.)`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "¿Cuántas unidades debe vender para no ganar ni perder?", before: "q =", answer: String(q0), maxOps: 1 },
        {
          kind: "expr",
          prompt: `¿Cuál es la utilidad si vende $${q1}$ unidades? (Si hay pérdida, el número es negativo.)`,
          before: "U =",
          answer: String(U1),
          maxOps: 0,
          mistakes: [{ answer: String(p * q1), feedback: "Eso es solo el ingreso. La utilidad es ingreso menos costo total." }],
        },
      ],
      hints: [`Costo: $C(q) = ${F} + ${v}q$. Ingreso: $I(q) = ${p}q$.`, "En el punto de equilibrio $I(q) = C(q)$. La utilidad es $U = I - C$."],
      solution: [
        `Costo total: $C(q) = ${F} + ${v}q$. Ingreso: $I(q) = ${p}q$.`,
        `Equilibrio: $${p}q = ${F} + ${v}q$, así que $${m}q = ${F}$ y $q = ${q0}$ unidades.`,
        `Utilidad: $U(q) = ${p}q - (${F} + ${v}q) = ${m}q - ${F}$.`,
        `$U(${q1}) = ${m} \\cdot ${q1} - ${F} = ${U1}$ dólares${U1 < 0 ? ", es decir, una pérdida" : ""}.`,
      ],
    };
  },
};

const ingresoPrecio: ExerciseGen = {
  id: "ingreso-precio",
  title: "Precio que produce un ingreso dado (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const B = r.pick([1, 2, 4, 5]);
    const p1 = r.int(2, 15);
    const p2 = p1 + r.int(2, 20);
    const A = B * (p1 + p2);
    const I0 = B * p1 * p2;
    return {
      statement: `La demanda de un producto es $q = ${A} - ${B === 1 ? "" : B}p$, donde $p$ es el precio en dólares y $q$ las unidades vendidas (datos de ejemplo). ¿A qué precios el ingreso es de $${I0}$ dólares?`,
      parts: [
        {
          kind: "set",
          before: "p \\in",
          answer: [p1, p2],
          mistakes: [{ answer: [B * p1, B * p2].filter((x, i, xs) => xs.indexOf(x) === i), feedback: "Revisa la división entre el coeficiente de $p^2$ antes de factorizar." }].filter(() => B !== 1),
        },
      ],
      hints: ["El ingreso es precio por cantidad: $I = p \\cdot q$.", `Plantea $p(${A} - ${B === 1 ? "" : B}p) = ${I0}$ y ordénala como cuadrática.`],
      solution: [
        `Ingreso: $I = p(${A} - ${B === 1 ? "" : B}p) = ${poly([-B, A, 0], "p")}$.`,
        `Igualamos: $${poly([-B, A, 0], "p")} = ${I0}$, o sea $${poly([B, -A, I0], "p")} = 0$.`,
        B === 1 ? "La ecuación ya tiene coeficiente principal $1$." : `Dividimos entre $${B}$: $${poly([1, -(p1 + p2), p1 * p2], "p")} = 0$.`,
        `Factorizamos: $(p - ${p1})(p - ${p2}) = 0$, así que $p = ${p1}$ o $p = ${p2}$.`,
        `Los dos sirven: con $p = ${p1}$ se venden $${A - B * p1}$ unidades y con $p = ${p2}$ se venden $${A - B * p2}$. En ambos casos el ingreso es $${I0}$.`,
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("ecuaciones"),
  objectives: [
    "Resolver ecuaciones lineales, incluso con paréntesis y fracciones.",
    "Resolver ecuaciones cuadráticas por factorización y con la fórmula general, y leer el discriminante.",
    "Resolver ecuaciones bicuadráticas, con radicales, con la incógnita en el denominador y con valor absoluto, verificando las soluciones.",
    "Resolver sistemas de dos ecuaciones con dos incógnitas por sustitución, igualación y reducción.",
    "Plantear y resolver problemas, entre ellos el punto de equilibrio y el equilibrio de mercado.",
  ],
  sections: [
    {
      id: "lineales",
      title: "Qué es una ecuación. Ecuaciones lineales",
      blocks: [
        {
          type: "text",
          md: "Una ecuación es una igualdad con un número desconocido, la incógnita. Resolverla es encontrar todos los valores que hacen cierta la igualdad. En $3x + 5 = 20$ el único valor que funciona es $x = 5$, porque $3 \\cdot 5 + 5 = 20$.\n\nPiensa en una balanza en equilibrio. Si haces lo mismo en los dos platos (sumar, restar, multiplicar o dividir por un número distinto de cero), la balanza sigue equilibrada. Con esa regla se va aislando la $x$.",
        },
        {
          type: "definition",
          title: "Ecuación lineal",
          md: "Es la que, después de simplificar, queda de la forma $ax + b = 0$ con $a \\neq 0$. Tiene una única solución: $$x = -\\frac{b}{a}$$",
        },
        {
          type: "example",
          title: "Con paréntesis",
          problem: "Resuelve $2(x - 3) - 4 = 5x + 1$.",
          steps: [
            "Distribuimos el $2$: $2x - 6 - 4 = 5x + 1$, o sea $2x - 10 = 5x + 1$.",
            "Pasamos las $x$ a un lado y los números al otro: $2x - 5x = 1 + 10$.",
            "$-3x = 11$, así que $x = -\\dfrac{11}{3}$.",
          ],
          answer: "$x = -\\dfrac{11}{3}$",
        },
        {
          type: "note",
          tone: "tip",
          title: "Comprueba siempre",
          md: "Sustituye el resultado en la ecuación original. Si los dos lados dan lo mismo, está bien. Con $x = -\\frac{11}{3}$, el lado izquierdo da $2\\left(-\\frac{11}{3} - 3\\right) - 4 = -\\frac{52}{3}$ y el derecho $5\\left(-\\frac{11}{3}\\right) + 1 = -\\frac{52}{3}$.",
        },
        {
          type: "example",
          title: "Con fracciones",
          problem: "Resuelve $\\dfrac{x}{2} - \\dfrac{x - 1}{3} = 2$.",
          steps: [
            "El mcm de $2$ y $3$ es $6$. Multiplicamos todos los términos por $6$: $3x - 2(x - 1) = 12$.",
            "Cuidado con el signo: $3x - 2x + 2 = 12$.",
            "$x + 2 = 12$, así que $x = 10$.",
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "Multiplica todos los términos",
          md: "Al multiplicar por el mcm también se multiplica el lado derecho. Y el menos delante de una fracción afecta a todo su numerador: $-\\dfrac{x - 1}{3}$ por $6$ es $-2(x - 1) = -2x + 2$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Resuelve $4x - 7 = x + 8$.",
            parts: [{ kind: "expr", before: "x =", answer: "5", maxOps: 1 }],
            solution: ["$4x - x = 8 + 7$, así que $3x = 15$ y $x = 5$."],
          },
        },
      ],
    },
    {
      id: "con-fracciones",
      title: "La incógnita en el denominador",
      blocks: [
        {
          type: "text",
          md: "Si la $x$ aparece en un denominador, hay valores prohibidos: los que anulan ese denominador. El método es anotar esas restricciones, multiplicar por el mcm para quitar los denominadores, resolver y descartar cualquier resultado prohibido.",
        },
        {
          type: "example",
          title: "Multiplicar en cruz",
          problem: "Resuelve $\\dfrac{3}{x - 2} = \\dfrac{5}{x + 2}$.",
          steps: [
            "Restricciones: $x \\neq 2$ y $x \\neq -2$.",
            "Multiplicamos en cruz: $3(x + 2) = 5(x - 2)$.",
            "$3x + 6 = 5x - 10$, así que $16 = 2x$ y $x = 8$.",
            "El $8$ no está prohibido.",
          ],
          answer: "$x = 8$",
        },
        {
          type: "example",
          title: "Una solución que no sirve",
          problem: "Resuelve $\\dfrac{x}{x - 1} = \\dfrac{1}{x - 1} + 2$.",
          steps: [
            "Restricción: $x \\neq 1$.",
            "Multiplicamos todo por $x - 1$: $x = 1 + 2(x - 1)$.",
            "$x = 2x - 1$, así que $x = 1$.",
            "Pero $x = 1$ está prohibido.",
          ],
          answer: "La ecuación no tiene solución: $S = \\varnothing$",
        },
        {
          type: "note",
          tone: "warning",
          title: "Anota las restricciones antes de empezar",
          md: "Al multiplicar por una expresión con $x$ pueden aparecer soluciones falsas. Si no anotaste qué valores estaban prohibidos, no te vas a dar cuenta.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Resuelve $\\dfrac{2}{x + 1} = \\dfrac{1}{x - 3}$.",
            parts: [{ kind: "expr", before: "x =", answer: "7", maxOps: 1 }],
            solution: ["Restricciones: $x \\neq -1$ y $x \\neq 3$.", "En cruz: $2(x - 3) = x + 1$, así que $2x - 6 = x + 1$ y $x = 7$."],
          },
        },
      ],
    },
    {
      id: "cuadraticas",
      title: "Ecuaciones cuadráticas",
      blocks: [
        {
          type: "text",
          md: "Una ecuación cuadrática tiene la forma $ax^2 + bx + c = 0$ con $a \\neq 0$. Puede tener dos soluciones, una o ninguna. Hay dos caminos para resolverla: factorizar o usar la fórmula general.",
        },
        {
          type: "definition",
          title: "Propiedad del producto cero",
          md: "Si $A \\cdot B = 0$, entonces $A = 0$ o $B = 0$. Por eso, si factorizas $ax^2 + bx + c$, cada factor igualado a cero da una solución.",
        },
        {
          type: "example",
          title: "Por factorización",
          problem: "Resuelve $x^2 - x - 6 = 0$.",
          steps: ["Factorizamos: $(x - 3)(x + 2) = 0$.", "$x - 3 = 0$ da $x = 3$. $x + 2 = 0$ da $x = -2$."],
          answer: "$S = \\{-2, 3\\}$",
        },
        {
          type: "example",
          title: "Cuadráticas incompletas",
          problem: "Resuelve $x^2 = 5x$ y $x^2 = 9$.",
          steps: [
            "$x^2 = 5x$: pasamos todo a un lado, $x^2 - 5x = 0$, y sacamos factor común: $x(x - 5) = 0$. Soluciones: $0$ y $5$.",
            "$x^2 = 9$: $x^2 - 9 = 0$, o sea $(x - 3)(x + 3) = 0$. Soluciones: $3$ y $-3$.",
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "No dividas entre x",
          md: "En $x^2 = 5x$, dividir entre $x$ deja solo $x = 5$ y se pierde $x = 0$. Nunca se divide entre algo que puede valer cero. Saca factor común.",
        },
        {
          type: "definition",
          title: "Fórmula general",
          md: "Las soluciones de $ax^2 + bx + c = 0$ son $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$ El número $\\Delta = b^2 - 4ac$ se llama **discriminante**.",
        },
        {
          type: "table",
          headers: ["Discriminante", "Soluciones", "La parábola $y = ax^2 + bx + c$"],
          rows: [
            ["$\\Delta > 0$", "Dos soluciones reales distintas", "Corta el eje $x$ en dos puntos"],
            ["$\\Delta = 0$", "Una solución (doble)", "Toca el eje $x$ en un solo punto"],
            ["$\\Delta < 0$", "Ninguna solución real", "No toca el eje $x$"],
          ],
        },
        {
          type: "widget",
          widget: {
            kind: "sliders",
            fn: "x^2 - 2x + c",
            params: [{ name: "c", min: -3, max: 4, step: 0.5, value: -3 }],
            x: [-3, 5],
            y: [-5, 8],
            formula: "f(x) = x^2 - 2x + c, \\quad c = {c}",
          },
          caption: "Aquí $\\Delta = 4 - 4c$. Mueve $c$: con $c < 1$ hay dos cortes, con $c = 1$ la parábola toca el eje en $x = 1$ y con $c > 1$ ya no lo toca.",
        },
        {
          type: "example",
          title: "Con la fórmula general",
          problem: "Resuelve $2x^2 - 4x - 1 = 0$.",
          steps: [
            "$a = 2$, $b = -4$, $c = -1$.",
            "$\\Delta = (-4)^2 - 4 \\cdot 2 \\cdot (-1) = 16 + 8 = 24$.",
            "$x = \\dfrac{4 \\pm \\sqrt{24}}{4} = \\dfrac{4 \\pm 2\\sqrt{6}}{4} = 1 \\pm \\dfrac{\\sqrt{6}}{2}$.",
          ],
          answer: "$S = \\left\\{1 - \\dfrac{\\sqrt{6}}{2}, \\; 1 + \\dfrac{\\sqrt{6}}{2}\\right\\}$",
        },
        {
          type: "note",
          tone: "warning",
          title: "El signo de b",
          md: "En la fórmula va $-b$. Si $b = -4$, entonces $-b = 4$. Y en $b^2$ el resultado siempre es positivo: $(-4)^2 = 16$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Resuelve $x^2 + x - 12 = 0$.",
            parts: [{ kind: "set", before: "S =", answer: [-4, 3] }],
            solution: ["$(x + 4)(x - 3) = 0$, así que $S = \\{-4, 3\\}$."],
          },
        },
      ],
    },
    {
      id: "reducibles",
      title: "Bicuadráticas y ecuaciones con radicales",
      blocks: [
        {
          type: "text",
          md: "Algunas ecuaciones no son cuadráticas, pero se convierten en una con un cambio de variable o elevando al cuadrado.",
        },
        {
          type: "definition",
          title: "Ecuación bicuadrática",
          md: "Tiene la forma $ax^4 + bx^2 + c = 0$. Con el cambio $u = x^2$ queda $au^2 + bu + c = 0$, una cuadrática en $u$. Al final se deshace el cambio con $x = \\pm\\sqrt{u}$, solo para los $u \\ge 0$.",
        },
        {
          type: "example",
          title: "Cuatro soluciones",
          problem: "Resuelve $x^4 - 13x^2 + 36 = 0$.",
          steps: [
            "Con $u = x^2$: $u^2 - 13u + 36 = 0$.",
            "Factorizamos: $(u - 4)(u - 9) = 0$, así que $u = 4$ o $u = 9$.",
            "$x^2 = 4$ da $x = \\pm 2$. $x^2 = 9$ da $x = \\pm 3$.",
          ],
          answer: "$S = \\{-3, -2, 2, 3\\}$",
        },
        {
          type: "example",
          title: "Un valor de u que no sirve",
          problem: "Resuelve $x^4 - 3x^2 - 4 = 0$.",
          steps: [
            "Con $u = x^2$: $u^2 - 3u - 4 = 0$, que da $(u - 4)(u + 1) = 0$.",
            "$u = 4$ da $x = \\pm 2$.",
            "$u = -1$ pediría $x^2 = -1$, y ningún real al cuadrado da negativo. Se descarta.",
          ],
          answer: "$S = \\{-2, 2\\}$",
        },
        { type: "heading", text: "Ecuaciones con radicales" },
        {
          type: "text",
          md: "Para quitar una raíz cuadrada se aísla la raíz en un lado y se elevan los dos lados al cuadrado. El problema es que elevar al cuadrado puede crear soluciones que no estaban: $-2 \\neq 2$, pero $(-2)^2 = 2^2$. Por eso **siempre** hay que verificar en la ecuación original.",
        },
        {
          type: "example",
          title: "Verificar los candidatos",
          problem: "Resuelve $\\sqrt{x + 7} = x + 1$.",
          steps: [
            "Elevamos al cuadrado: $x + 7 = (x + 1)^2 = x^2 + 2x + 1$.",
            "Ordenamos: $x^2 + x - 6 = 0$, o sea $(x + 3)(x - 2) = 0$. Candidatos: $x = -3$ y $x = 2$.",
            "Verificamos $x = 2$: $\\sqrt{9} = 3$ y $2 + 1 = 3$. Sirve.",
            "Verificamos $x = -3$: $\\sqrt{4} = 2$, pero $-3 + 1 = -2$. No sirve. Es una solución extraña.",
          ],
          answer: "$S = \\{2\\}$",
        },
        {
          type: "note",
          tone: "warning",
          title: "La raíz cuadrada nunca es negativa",
          md: "$\\sqrt{\\;\\;}$ siempre da un número mayor o igual que cero. Si al verificar el otro lado da negativo, el candidato se descarta.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Resuelve $\\sqrt{2x - 1} = 3$.",
            parts: [{ kind: "expr", before: "x =", answer: "5", maxOps: 1 }],
            solution: ["Elevamos al cuadrado: $2x - 1 = 9$, así que $x = 5$.", "Verificación: $\\sqrt{9} = 3$. Sirve."],
          },
        },
      ],
    },
    {
      id: "valor-absoluto",
      title: "Ecuaciones con valor absoluto",
      blocks: [
        {
          type: "text",
          md: "El valor absoluto $|a|$ es la distancia de $a$ al cero, así que nunca es negativo: $|5| = 5$ y $|-5| = 5$. Si $|A| = 7$, lo que está adentro vale $7$ o vale $-7$.",
        },
        {
          type: "definition",
          title: "Cómo se resuelve",
          md: "Si $k > 0$: $$|A| = k \\iff A = k \\;\\text{ o }\\; A = -k$$ Si $k = 0$, la única opción es $A = 0$. Si $k < 0$, no hay solución.",
        },
        {
          type: "example",
          title: "Dos casos",
          problem: "Resuelve $|2x - 3| = 7$.",
          steps: [
            "Caso positivo: $2x - 3 = 7$, así que $x = 5$.",
            "Caso negativo: $2x - 3 = -7$, así que $x = -2$.",
            "Comprobación: $|10 - 3| = 7$ y $|-4 - 3| = 7$.",
          ],
          answer: "$S = \\{-2, 5\\}$",
        },
        {
          type: "widget",
          widget: { kind: "numberline", set: [pt(-2), pt(4)], range: [-5, 7], label: "|x - 1| = 3" },
          caption: "$|x - 1|$ es la distancia entre $x$ y $1$. La ecuación $|x - 1| = 3$ pide los puntos a distancia $3$ del $1$: son $-2$ y $4$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Un valor absoluto no da negativo",
          md: "$|x + 4| = -2$ no tiene solución, y no hace falta hacer cuentas para saberlo.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Resuelve $|x + 2| = 5$.",
            parts: [{ kind: "set", before: "S =", answer: [-7, 3] }],
            solution: ["$x + 2 = 5$ da $x = 3$. $x + 2 = -5$ da $x = -7$. $S = \\{-7, 3\\}$."],
          },
        },
      ],
    },
    {
      id: "sistemas",
      title: "Sistemas de dos ecuaciones",
      blocks: [
        {
          type: "text",
          md: "Un sistema de dos ecuaciones con dos incógnitas pide un par de valores $(x, y)$ que cumpla las dos a la vez. Cada ecuación lineal es una recta, y la solución es el punto donde se cortan.",
        },
        {
          type: "example",
          title: "Tres métodos para el mismo sistema",
          problem: "Resuelve $\\begin{cases} x + 2y = 8 \\\\ 3x - y = 3 \\end{cases}$",
          steps: [
            "**Sustitución.** Despeja una incógnita y sustitúyela en la otra ecuación. De la segunda, $y = 3x - 3$. En la primera: $x + 2(3x - 3) = 8$, o sea $7x - 6 = 8$ y $x = 2$. Entonces $y = 3 \\cdot 2 - 3 = 3$.",
            "**Igualación.** Despeja la misma incógnita en las dos e iguala. $x = 8 - 2y$ y $x = \\dfrac{3 + y}{3}$. Igualando: $3(8 - 2y) = 3 + y$, $24 - 6y = 3 + y$ y $y = 3$. Entonces $x = 8 - 6 = 2$.",
            "**Reducción.** Multiplica para que una incógnita quede con coeficientes opuestos y suma. La segunda por $2$: $6x - 2y = 6$. Sumada a la primera: $7x = 14$ y $x = 2$. Luego $y = 3$.",
          ],
          answer: "$x = 2$, $y = 3$. Los tres métodos dan lo mismo. Usa el que deje las cuentas más simples.",
        },
        {
          type: "graph",
          spec: {
            x: [-1, 6],
            y: [-2, 6],
            curves: [
              { fn: "\\frac{8-x}{2}", color: "blue", label: "x + 2y = 8" },
              { fn: "3x-3", color: "red", label: "3x - y = 3" },
            ],
            points: [{ x: 2, y: 3, label: "(2, 3)" }],
          },
          caption: "Las dos rectas se cortan en $(2, 3)$, la solución del sistema.",
        },
        {
          type: "note",
          tone: "idea",
          title: "Cuando no hay una única solución",
          md: "Si las rectas son paralelas, no se cortan y el sistema no tiene solución. Si son la misma recta, hay infinitas. Lo notas porque al reducir desaparecen las dos incógnitas: queda algo falso como $0 = 5$ (sin solución) o algo siempre cierto como $0 = 0$ (infinitas soluciones).",
        },
        {
          type: "note",
          tone: "econ",
          title: "Equilibrio de mercado",
          md: "Si la oferta es $p = 2q + 10$ y la demanda es $p = 100 - 3q$ (datos de ejemplo), el equilibrio es el punto donde coinciden. Igualando, $2q + 10 = 100 - 3q$, así que $q = 18$ y $p = 46$. A ese precio se vende exactamente lo que se produce.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Resuelve $\\begin{cases} x + y = 7 \\\\ x - y = 1 \\end{cases}$",
            parts: [
              { kind: "expr", before: "x =", answer: "4", maxOps: 1 },
              { kind: "expr", before: "y =", answer: "3", maxOps: 1 },
            ],
            solution: ["Sumando las dos ecuaciones: $2x = 8$, así que $x = 4$.", "En la primera: $4 + y = 7$, así que $y = 3$."],
          },
        },
      ],
    },
    {
      id: "problemas",
      title: "Plantear problemas",
      blocks: [
        {
          type: "text",
          md: "Lo difícil de un problema no suele ser resolver la ecuación sino escribirla. Un método que funciona:\n\n- Lee todo el enunciado y di con tus palabras qué te piden.\n- Ponle nombre a la incógnita, con unidades: \"$q$ = unidades vendidas al mes\".\n- Traduce cada frase a una expresión.\n- Resuelve y revisa que la respuesta tenga sentido. Una cantidad o un precio no pueden ser negativos.",
        },
        {
          type: "table",
          headers: ["En palabras", "En símbolos"],
          rows: [
            ["El doble de un número", "$2x$"],
            ["Un número aumentado en $5$", "$x + 5$"],
            ["La mitad de un número", "$\\dfrac{x}{2}$"],
            ["Dos números consecutivos", "$x$ y $x + 1$"],
            ["El $15\\%$ de una cantidad", "$0{,}15x$"],
            ["Ingreso: precio por cantidad", "$I = p \\cdot q$"],
            ["Utilidad: ingreso menos costo", "$U = I - C$"],
          ],
        },
        {
          type: "example",
          title: "Un reparto",
          problem: "Ana tiene el triple de dinero que Luis. Entre los dos tienen $120$ dólares. ¿Cuánto tiene cada uno?",
          steps: [
            "Sea $x$ el dinero de Luis. Ana tiene $3x$.",
            "Entre los dos: $x + 3x = 120$, o sea $4x = 120$ y $x = 30$.",
            "Luis tiene $30$ dólares y Ana $90$. Comprobación: $30 + 90 = 120$.",
          ],
        },
        {
          type: "example",
          title: "Punto de equilibrio",
          problem: "Una fábrica tiene costos fijos de $2000$ dólares al mes y gasta $15$ dólares por unidad. Vende cada unidad a $25$ dólares. ¿Cuántas unidades debe vender para no perder? (Datos de ejemplo.)",
          steps: [
            "Sea $q$ el número de unidades. Costo: $C = 2000 + 15q$. Ingreso: $I = 25q$.",
            "En el punto de equilibrio no hay ganancia ni pérdida: $I = C$.",
            "$25q = 2000 + 15q$, así que $10q = 2000$ y $q = 200$.",
          ],
          answer: "$200$ unidades. Con más de $200$ hay ganancia.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Margen de contribución",
          md: "Cada unidad vendida en el ejemplo anterior deja $25 - 15 = 10$ dólares por encima de su costo variable. Ese margen es el que va pagando el costo fijo, y hacen falta $2000 / 10 = 200$ unidades para cubrirlo completo. Por debajo de $200$ la empresa pierde.",
        },
        {
          type: "example",
          title: "Precio y demanda",
          problem: "La demanda de un producto es $q = 100 - 2p$, donde $p$ es el precio en dólares. ¿A qué precio el ingreso es de $1200$ dólares? (Datos de ejemplo.)",
          steps: [
            "Ingreso: $I = p \\cdot q = p(100 - 2p)$.",
            "$p(100 - 2p) = 1200$ da $100p - 2p^2 = 1200$, es decir $2p^2 - 100p + 1200 = 0$.",
            "Dividiendo entre $2$: $p^2 - 50p + 600 = 0$, que se factoriza como $(p - 20)(p - 30) = 0$.",
            "Los dos precios sirven: con $p = 20$ se venden $60$ unidades y con $p = 30$ se venden $40$. En ambos casos el ingreso es $1200$.",
          ],
          answer: "$p = 20$ o $p = 30$ dólares",
        },
        {
          type: "quick",
          exercise: {
            statement: "Dos números consecutivos suman $47$. ¿Cuál es el menor?",
            parts: [{ kind: "expr", answer: "23", maxOps: 0 }],
            solution: ["Sea $x$ el menor. El siguiente es $x + 1$.", "$x + (x + 1) = 47$, así que $2x = 46$ y $x = 23$."],
          },
        },
      ],
    },
  ],
  exercises: [
    lineal,
    linealParentesis,
    cuadraticaFactorizable,
    discriminante,
    valorAbsoluto,
    fraccionLineal,
    formulaGeneral,
    racional,
    bicuadratica,
    sistema,
    radical,
    equilibrioMercado,
    puntoEquilibrio,
    ingresoPrecio,
  ],
};

export default topic;
