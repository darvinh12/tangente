import { meta } from "../catalog";
import type { ExerciseGen, Mistake, Part, Rich, Topic } from "../types";
import { iv } from "@/lib/math/intervals";
import type { Ast } from "@/lib/math/parse";
import { frac, gcd, lcm, num } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

/** Fracción como par [numerador, denominador], siempre reducida y con denominador positivo. */
type Q = [number, number];

function q(n: number, d = 1): Q {
  const g = gcd(n, d);
  let a = n / g;
  let b = d / g;
  if (b < 0) {
    a = -a;
    b = -b;
  }
  return [a === 0 ? 0 : a, b];
}
const add = (x: Q, y: Q): Q => q(x[0] * y[1] + y[0] * x[1], x[1] * y[1]);
const sub = (x: Q, y: Q): Q => q(x[0] * y[1] - y[0] * x[1], x[1] * y[1]);
const mul = (x: Q, y: Q): Q => q(x[0] * y[0], x[1] * y[1]);
const div = (x: Q, y: Q): Q => q(x[0] * y[1], x[1] * y[0]);
const qt = (x: Q) => frac(x[0], x[1]);
const same = (x: Q, y: Q) => x[0] === y[0] && x[1] === y[1];

/** Término con signo para encadenar sumas: "+ \frac{1}{2}" o "- \frac{1}{2}". */
const signedQ = (x: Q) => (x[0] < 0 ? `- ${qt([-x[0], x[1]])}` : `+ ${qt(x)}`);

/** Factorización prima en LaTeX: 72 -> 2^{3} \cdot 3^{2} */
function factorTex(n: number): string {
  const fs: [number, number][] = [];
  let m = Math.abs(n);
  for (let p = 2; p * p <= m; p++) {
    let e = 0;
    while (m % p === 0) {
      m /= p;
      e++;
    }
    if (e) fs.push([p, e]);
  }
  if (m > 1) fs.push([m, 1]);
  return fs.map(([p, e]) => (e === 1 ? `${p}` : `${p}^{${e}}`)).join(" \\cdot ") || "1";
}

/** Lee un número o una fracción de enteros desde el AST. */
function numVal(a: Ast): number | null {
  if (a.t === "num") return a.v;
  if (a.t === "neg") {
    const v = numVal(a.a);
    return v === null ? null : -v;
  }
  return null;
}
function fracForm(a: Ast): [number, number] | null {
  if (a.t === "neg") {
    const f = fracForm(a.a);
    return f ? [-f[0], f[1]] : null;
  }
  if (a.t === "num") return [a.v, 1];
  if (a.t === "bin" && a.op === "/") {
    const p = numVal(a.a);
    const d = numVal(a.b);
    if (p !== null && d !== null) return [p, d];
  }
  return null;
}

/** Exige un entero o una fracción irreducible. */
function irreducible(ast: Ast): string | null {
  const f = fracForm(ast);
  if (!f) return "Escribe el resultado como un solo número entero o una sola fracción.";
  const [p, d] = f;
  if (!Number.isInteger(p) || !Number.isInteger(d)) return "Usa una fracción de enteros, sin decimales.";
  if (gcd(p, d) !== 1) return "La fracción todavía se puede simplificar.";
  return null;
}

function mistakesQ(answer: Q, list: [Q | null, Rich][]): Mistake[] {
  const out: Mistake[] = [];
  const seen: Q[] = [answer];
  for (const [m, fb] of list) {
    if (!m || !Number.isFinite(m[0] / m[1]) || seen.some((s) => same(s, m))) continue;
    seen.push(m);
    out.push({ answer: qt(m), feedback: fb });
  }
  return out;
}

/** Respuesta en fracción irreducible (o entero). */
function fracPart(answer: Q, mistakes: [Q | null, Rich][] = [], before?: string): Part {
  return { kind: "expr", answer: qt(answer), maxOps: 1, validate: irreducible, before, mistakes: mistakesQ(answer, mistakes) };
}

/** Respuesta entera o decimal sin operaciones. */
function numPart(answer: number, mistakes: [number, Rich][] = [], before?: string, after?: string): Part {
  const seen = new Set<string>([answer.toFixed(9)]);
  const ms: Mistake[] = [];
  for (const [v, fb] of mistakes) {
    if (!Number.isFinite(v) || seen.has(v.toFixed(9))) continue;
    seen.add(v.toFixed(9));
    ms.push({ answer: num(v), feedback: fb });
  }
  return { kind: "expr", answer: num(answer), maxOps: 0, before, after, mistakes: ms };
}

const coprime = (a: number, b: number) => gcd(a, b) === 1;

/* ----------------------------------- ejercicios ----------------------------------- */

const simplificar: ExerciseGen = {
  id: "simplificar",
  title: "Simplificar una fracción",
  level: 1,
  generate: (r) => {
    let p: number, d: number;
    do {
      p = r.int(1, 13);
      d = r.int(2, 13);
    } while (!coprime(p, d) || p === d);
    const m = r.pick([2, 3, 4, 5, 6, 8, 9, 10, 12, 14, 15]);
    const N = p * m;
    const D = d * m;
    return {
      statement: `Simplifica $\\dfrac{${N}}{${D}}$ hasta que sea irreducible.`,
      parts: [fracPart(q(p, d))],
      hints: [
        "Busca un número que divida al numerador y al denominador a la vez, y divide ambos.",
        `Descompón en factores primos: $${N} = ${factorTex(N)}$ y $${D} = ${factorTex(D)}$.`,
      ],
      solution: [
        `$${N} = ${factorTex(N)}$ y $${D} = ${factorTex(D)}$.`,
        `El máximo común divisor es $${m}$. Dividimos arriba y abajo entre $${m}$: $\\dfrac{${N} \\div ${m}}{${D} \\div ${m}} = ${qt(q(p, d))}$.`,
        `$${p}$ y $${d}$ ya no tienen divisores comunes, así que $${qt(q(p, d))}$ es irreducible.`,
      ],
    };
  },
};

const sumaSimple: ExerciseGen = {
  id: "suma-simple",
  title: "Sumar y restar fracciones sencillas",
  level: 1,
  generate: (r) => {
    let a: number, b: number, c: number, d: number, k: number, op: "+" | "-", res: Q;
    do {
      b = r.int(2, 9);
      k = r.pick([1, 2, 3]);
      d = b * k;
      a = r.int(1, 9);
      c = r.int(1, 9);
      op = r.pick(["+", "-"] as const);
      res = op === "+" ? add(q(a, b), q(c, d)) : sub(q(a, b), q(c, d));
    } while (!coprime(a, b) || !coprime(c, d) || res[0] === 0 || d > 20);
    const sgn = op === "+" ? 1 : -1;
    const naive: Q | null = q(a + sgn * c, b + d);
    return {
      statement: `Calcula $\\dfrac{${a}}{${b}} ${op} \\dfrac{${c}}{${d}}$ y simplifica.`,
      parts: [
        fracPart(res, [
          [naive, "No se suman los denominadores. Primero hay que llevar las dos fracciones al mismo denominador."],
          [k > 1 ? q(a + sgn * c, d) : null, `Cambiaste el denominador de $\\frac{${a}}{${b}}$ sin multiplicar también el numerador.`],
        ]),
      ],
      hints: k === 1
        ? ["Tienen el mismo denominador: se suman o restan los numeradores y el denominador se deja igual."]
        : [`$${d}$ es múltiplo de $${b}$. Convierte $\\frac{${a}}{${b}}$ en una fracción con denominador $${d}$.`],
      solution: k === 1
        ? [`Mismo denominador: $\\dfrac{${a} ${op} ${c}}{${b}} = \\dfrac{${a + sgn * c}}{${b}}$.`, `Simplificado: $${qt(res)}$.`]
        : [
            `El denominador común es $${d}$. Multiplicamos arriba y abajo de la primera por $${k}$: $\\dfrac{${a}}{${b}} = \\dfrac{${a * k}}{${d}}$.`,
            `$\\dfrac{${a * k}}{${d}} ${op} \\dfrac{${c}}{${d}} = \\dfrac{${a * k + sgn * c}}{${d}}$.`,
            `Simplificado: $${qt(res)}$.`,
          ],
    };
  },
};

const producto: ExerciseGen = {
  id: "producto",
  title: "Multiplicar fracciones",
  level: 1,
  generate: (r) => {
    let a: number, b: number, c: number, d: number;
    do {
      a = r.int(1, 9);
      b = r.int(2, 10);
      c = r.int(1, 9);
      d = r.int(2, 10);
    } while (!coprime(a, b) || !coprime(c, d) || (gcd(a, d) === 1 && gcd(c, b) === 1 && r.bool(0.7)));
    const neg = r.bool(0.4);
    const x = q(neg ? -a : a, b);
    const y = q(c, d);
    const res = mul(x, y);
    return {
      statement: `Calcula $${neg ? "-" : ""}\\dfrac{${a}}{${b}} \\cdot \\dfrac{${c}}{${d}}$ y simplifica.`,
      parts: [fracPart(res, [[div(x, y), "Multiplicaste en cruz. Eso se hace al dividir. Para multiplicar, numerador por numerador y denominador por denominador."], [neg ? q(a * c, b * d) : null, "Revisa el signo: un negativo por un positivo da negativo."]])],
      hints: ["Numerador por numerador y denominador por denominador.", "Puedes simplificar en cruz antes de multiplicar para trabajar con números más pequeños."],
      solution: [
        `$\\dfrac{${neg ? "-" : ""}${a} \\cdot ${c}}{${b} \\cdot ${d}} = \\dfrac{${(neg ? -1 : 1) * a * c}}{${b * d}}$.`,
        `Simplificado: $${qt(res)}$.`,
      ],
    };
  },
};

const fraccionCantidad: ExerciseGen = {
  id: "fraccion-de-cantidad",
  title: "Fracción de una cantidad",
  level: 1,
  generate: (r) => {
    let p: number, d: number;
    do {
      d = r.pick([3, 4, 5, 6, 8, 10]);
      p = r.int(1, d - 1);
    } while (!coprime(p, d));
    const m = r.int(2, 15);
    const N = d * m;
    const ctx = r.pick([
      `De un lote de $${N}$ unidades se vendieron $\\frac{${p}}{${d}}$. ¿Cuántas unidades se vendieron?`,
      `Una empresa destina $\\frac{${p}}{${d}}$ de un presupuesto de $${N}$ mil bolívares a salarios (dato de ejemplo). ¿Cuántos miles de bolívares van a salarios?`,
      `En una sección de $${N}$ estudiantes, $\\frac{${p}}{${d}}$ aprobaron el primer parcial. ¿Cuántos aprobaron?`,
    ]);
    return {
      statement: ctx,
      parts: [numPart(p * m, [[m, `Eso es solo $\\frac{1}{${d}}$ de la cantidad. Falta multiplicar por $${p}$.`], [N * d / p, "Invertiste la fracción."]])],
      hints: [`Primero divide $${N}$ en $${d}$ partes iguales.`, `Después toma $${p}$ de esas partes.`],
      solution: [`Cada parte es $${N} \\div ${d} = ${m}$.`, `Tomamos $${p}$ partes: $${p} \\cdot ${m} = ${p * m}$.`, `Es lo mismo que $\\frac{${p}}{${d}} \\cdot ${N} = ${p * m}$.`],
    };
  },
};

const porcentajeDe: ExerciseGen = {
  id: "porcentaje-de",
  title: "Porcentaje de una cantidad",
  level: 1,
  generate: (r) => {
    const p = r.pick([5, 10, 12, 15, 20, 25, 30, 40, 50, 60, 75, 80]);
    const base = 100 / gcd(p, 100);
    const N = base * r.int(1, Math.max(2, Math.floor(800 / base)));
    const v = (p * N) / 100;
    return {
      statement: `Calcula el $${p}\\%$ de $${N}$.`,
      parts: [numPart(v, [[p * N, "Te faltó dividir entre 100. El porcentaje significa \"de cada cien\"."], [N - v, `Eso es lo que queda después de quitar el $${p}\\%$.`]])],
      hints: [`$${p}\\% = \\frac{${p}}{100}$.`],
      solution: [`$${p}\\%$ de $${N}$ es $\\dfrac{${p}}{100} \\cdot ${N}$.`, `$\\dfrac{${p} \\cdot ${N}}{100} = \\dfrac{${p * N}}{100} = ${num(v)}$.`],
    };
  },
};

const sumaDistinto: ExerciseGen = {
  id: "suma-distinto",
  title: "Sumas y restas con distinto denominador",
  level: 2,
  generate: (r) => {
    let fs: Q[], res: Q, L: number;
    do {
      const n = r.bool(0.5) ? 2 : 3;
      const dens = r.sample([2, 3, 4, 5, 6, 8, 9, 10, 12, 15], n);
      fs = dens.map((d) => {
        let a: number;
        do a = r.int(1, 2 * d - 1); while (!coprime(a, d));
        return q(r.sign() * a, d);
      });
      if (fs[0][0] < 0) fs[0] = q(-fs[0][0], fs[0][1]);
      res = fs.reduce((s, x) => add(s, x), q(0));
      L = fs.reduce((l, x) => lcm(l, x[1]), 1);
    } while (res[0] === 0 || L > 60);
    const tex = fs.map((x, i) => (i === 0 ? qt(x) : signedQ(x))).join(" ");
    const naive = q(fs.reduce((s, x) => s + x[0], 0), fs.reduce((s, x) => s + x[1], 0));
    const amp = fs.map((x) => x[0] * (L / x[1]));
    const sumTex = amp.map((v, i) => (i === 0 ? `${v}` : v < 0 ? `- ${-v}` : `+ ${v}`)).join(" ");
    const total = amp.reduce((s, v) => s + v, 0);
    return {
      statement: `Calcula $${tex}$ y simplifica.`,
      parts: [fracPart(res, [[naive, "Sumaste numeradores con numeradores y denominadores con denominadores. Así no se suman fracciones: primero va el denominador común."]])],
      hints: [
        `Busca el mínimo común múltiplo de los denominadores ${fs.map((x) => `$${x[1]}$`).join(", ")}.`,
        "Convierte cada fracción a ese denominador multiplicando arriba y abajo por el mismo número.",
      ],
      solution: [
        `$\\text{mcm}(${fs.map((x) => x[1]).join(", ")}) = ${L}$.`,
        `Cada fracción con denominador $${L}$: ${fs.map((x) => `$${qt(x)} = \\frac{${x[0] * (L / x[1])}}{${L}}$`).join(", ")}.`,
        `Sumamos numeradores: $\\dfrac{${sumTex}}{${L}} = \\dfrac{${total}}{${L}}$.`,
        `Simplificado: $${qt(res)}$.`,
      ],
    };
  },
};

const division: ExerciseGen = {
  id: "division",
  title: "Dividir fracciones",
  level: 2,
  generate: (r) => {
    let x: Q, y: Q, res: Q;
    let xTex: string, yTex: string;
    do {
      const a = r.int(1, 12);
      const b = r.int(2, 9);
      const c = r.int(1, 12);
      const d = r.int(2, 9);
      const form = r.int(0, 2);
      if (form === 0) {
        x = q(a, b);
        y = q(c, d);
      } else if (form === 1) {
        x = q(r.int(2, 9));
        y = q(c, d);
      } else {
        x = q(a, b);
        y = q(r.int(2, 9));
      }
      if (r.bool(0.35)) x = q(-x[0], x[1]);
      xTex = x[1] === 1 ? `${x[0]}` : qt(x);
      yTex = y[1] === 1 ? `${y[0]}` : qt(y);
      res = div(x, y);
    } while (x[0] === 0 || y[1] * y[0] === 0 || (x[1] === 1 && y[1] === 1) || res[1] > 40 || Math.abs(res[0]) > 60 || (x[1] !== 1 && !coprime(x[0], x[1])));
    const yInv = q(y[1], y[0]);
    return {
      statement: `Calcula $${xTex} \\div ${yTex}$ y simplifica.`,
      parts: [
        fracPart(res, [
          [mul(x, y), "Multiplicaste sin invertir. Para dividir se multiplica por el inverso de la segunda fracción."],
          [mul(q(x[1], x[0]), y), "Invertiste la primera fracción. Solo se invierte la que divide, la segunda."],
        ]),
      ],
      hints: ["Dividir es multiplicar por el inverso: $\\dfrac{a}{b} \\div \\dfrac{c}{d} = \\dfrac{a}{b} \\cdot \\dfrac{d}{c}$.", "Un entero $n$ es la fracción $\\frac{n}{1}$."],
      solution: [
        `El inverso de $${yTex}$ es $${qt(yInv)}$.`,
        `$${xTex} \\div ${yTex} = ${xTex} \\cdot ${qt(yInv)} = ${qt(res)}$.`,
      ],
    };
  },
};

const decimalFraccion: ExerciseGen = {
  id: "decimal-fraccion",
  title: "De decimal a fracción",
  level: 2,
  generate: (r) => {
    const kind = r.int(0, 2);
    if (kind === 0) {
      let p: number, d: number;
      do {
        d = r.pick([2, 4, 5, 8, 20, 25, 40, 50]);
        p = r.int(1, 3 * d - 1);
      } while (!coprime(p, d));
      const v = p / d;
      const s = String(v);
      const decs = s.includes(".") ? s.split(".")[1].length : 0;
      const pow = 10 ** decs;
      return {
        statement: `Escribe $${num(v)}$ como fracción irreducible.`,
        parts: [fracPart(q(p, d), [[q(Math.round(v * pow), pow * 10), "Revisa la potencia de 10: lleva tantos ceros como cifras decimales tiene el número."]])],
        hints: [`Tiene ${decs} ${decs === 1 ? "cifra decimal" : "cifras decimales"}. Escríbelo sobre $${pow}$ y simplifica.`],
        solution: [
          `$${num(v)} = \\dfrac{${Math.round(v * pow)}}{${pow}}$, porque tiene ${decs} ${decs === 1 ? "decimal" : "decimales"}.`,
          `Simplificando: $${qt(q(p, d))}$.`,
        ],
      };
    }
    if (kind === 1) {
      const n = r.pick([0, 0, 1, 2]);
      const two = r.bool();
      let per: number;
      if (two) {
        do per = r.int(10, 98); while (per % 11 === 0);
      } else per = r.int(1, 8);
      const den = two ? 99 : 9;
      const res = add(q(n), q(per, den));
      const tex = `${n}{,}\\overline{${per}}`;
      return {
        statement: `Escribe el decimal periódico $${tex}$ como fracción irreducible.`,
        parts: [fracPart(res, [[add(q(n), q(per, two ? 100 : 10)), "Eso sería un decimal finito. En un periódico puro el denominador lleva un 9 por cada cifra del periodo."]])],
        hints: [`El periodo tiene ${two ? "dos cifras" : "una cifra"}, así que la parte decimal es $\\frac{${per}}{${den}}$.`, n > 0 ? `No olvides sumar la parte entera, $${n}$.` : "La parte entera es cero."],
        solution: [
          `La parte decimal $0{,}\\overline{${per}}$ es $\\dfrac{${per}}{${den}}$: el periodo arriba y un 9 por cada cifra del periodo abajo.`,
          n > 0 ? `Sumamos la parte entera: $${n} + \\dfrac{${per}}{${den}} = \\dfrac{${n * den + per}}{${den}}$.` : `Queda $\\dfrac{${per}}{${den}}$.`,
          `Simplificado: $${qt(res)}$.`,
        ],
      };
    }
    let a: number, b: number;
    do {
      a = r.int(1, 9);
      b = r.int(1, 9);
    } while (a === b);
    const res = q(10 * a + b - a, 90);
    return {
      statement: `Escribe el decimal periódico mixto $0{,}${a}\\overline{${b}}$ como fracción irreducible.`,
      parts: [fracPart(res, [[q(10 * a + b, 99), "Ese método es para periódicos puros. Aquí el $" + a + "$ no se repite."], [q(10 * a + b, 90), `Al numerador hay que restarle la parte que no se repite, $${a}$.`]])],
      hints: [
        "Numerador: todas las cifras decimales hasta el final del primer periodo, menos las que no se repiten.",
        "Denominador: un 9 por cada cifra del periodo seguido de un 0 por cada cifra que no se repite.",
      ],
      solution: [
        `Numerador: $${a}${b} - ${a} = ${10 * a + b - a}$.`,
        "Denominador: una cifra se repite y una no, así que es $90$.",
        `$\\dfrac{${10 * a + b - a}}{90} = ${qt(res)}$.`,
      ],
    };
  },
};

const mcm: ExerciseGen = {
  id: "mcm",
  title: "Mínimo común múltiplo",
  level: 2,
  generate: (r) => {
    let ns: number[];
    do {
      ns = r.sample([4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 24, 30, 36], r.bool(0.7) ? 2 : 3).sort((x, y) => x - y);
    } while (ns.some((x) => ns.some((y) => y !== x && y % x === 0)) || ns.reduce((l, x) => lcm(l, x), 1) > 400);
    const L = ns.reduce((l, x) => lcm(l, x), 1);
    const prod = ns.reduce((p, x) => p * x, 1);
    const G = ns.reduce((g, x) => gcd(g, x), 0);
    return {
      statement: `Calcula $\\text{mcm}(${ns.join(", ")})$.`,
      parts: [numPart(L, [[prod, "El producto siempre es múltiplo común, pero no siempre el menor."], [G, "Ese es el máximo común divisor, no el mínimo común múltiplo."]], `\\text{mcm} =`)],
      hints: ["Descompón cada número en factores primos.", "El mcm lleva todos los primos que aparecen, comunes y no comunes, cada uno con su mayor exponente."],
      solution: [
        ns.map((x) => `$${x} = ${factorTex(x)}$`).join(", ") + ".",
        `Tomamos cada primo con el mayor exponente: $\\text{mcm} = ${factorTex(L)} = ${L}$.`,
      ],
    };
  },
};

const aumentoDescuento: ExerciseGen = {
  id: "aumento-descuento",
  title: "Aumentos y descuentos",
  level: 2,
  generate: (r) => {
    let P: number, p: number;
    do {
      P = r.pick([40, 60, 80, 120, 150, 180, 200, 240, 250, 300, 360, 450, 500, 800, 1200]);
      p = r.pick([5, 10, 15, 16, 20, 25, 30, 40]);
    } while (!Number.isInteger((P * p) / 100));
    const up = r.bool();
    const amount = (P * p) / 100;
    const final = up ? P + amount : P - amount;
    const statement = up
      ? `Un producto cuesta $${P}$ bolívares y su precio sube un $${p}\\%$. ¿Cuál es el nuevo precio?`
      : `Una camisa cuesta $${P}$ bolívares y tiene un descuento del $${p}\\%$. ¿Cuánto se paga?`;
    return {
      statement,
      parts: [numPart(final, [[amount, up ? "Ese es solo el aumento. Hay que sumarlo al precio original." : "Ese es solo el descuento. Hay que restarlo del precio original."], [up ? P - amount : P + amount, up ? "Es un aumento, se suma." : "Es un descuento, se resta."]], "\\text{precio} =")],
      hints: [`Calcula el $${p}\\%$ de $${P}$.`, up ? `También puedes multiplicar directo por $1 + \\frac{${p}}{100} = ${num(1 + p / 100)}$.` : `También puedes multiplicar directo por $1 - \\frac{${p}}{100} = ${num(1 - p / 100)}$.`],
      solution: [
        `El $${p}\\%$ de $${P}$ es $\\frac{${p}}{100} \\cdot ${P} = ${num(amount)}$.`,
        `${up ? "Nuevo precio" : "Precio a pagar"}: $${P} ${up ? "+" : "-"} ${num(amount)} = ${num(final)}$.`,
        `En un solo paso: $${P} \\cdot ${num(up ? 1 + p / 100 : 1 - p / 100)} = ${num(final)}$.`,
      ],
    };
  },
};

const combinada: ExerciseGen = {
  id: "combinada",
  title: "Operación combinada con fracciones (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    let a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number;
    let inner: Q, divd: Q, res: Q;
    do {
      b = r.pick([2, 3, 4, 5, 6]);
      d = r.pick([2, 3, 4, 6, 8]);
      a = r.int(1, 7);
      c = r.int(1, 7);
      e = r.int(1, 6);
      f = r.pick([2, 3, 4, 5]);
      g = r.nz(-5, 5);
      h = r.pick([2, 3, 4, 6]);
      inner = sub(q(a, b), q(c, d));
      divd = div(inner, q(e, f));
      res = add(divd, q(g, h));
    } while (
      b === d || !coprime(a, b) || !coprime(c, d) || !coprime(e, f) || !coprime(g, h) ||
      inner[0] === 0 || res[0] === 0 || res[1] > 36 || Math.abs(res[0]) > 60 || divd[1] > 24
    );
    const ef = q(e, f);
    const gh = q(g, h);
    const den2 = add(ef, gh);
    const tex = `\\left(\\dfrac{${a}}{${b}} - \\dfrac{${c}}{${d}}\\right) \\div \\dfrac{${e}}{${f}} ${g < 0 ? "-" : "+"} \\dfrac{${Math.abs(g)}}{${h}}`;
    return {
      statement: `Calcula y simplifica $${tex}$.`,
      parts: [fracPart(res, [[den2[0] !== 0 ? div(inner, den2) : null, "Sumaste antes de dividir. La división va antes que la suma."]])],
      hints: [
        "Primero el paréntesis, con denominador común.",
        "Después la división, multiplicando por el inverso. La suma va al final.",
      ],
      solution: [
        `Paréntesis: $\\dfrac{${a}}{${b}} - \\dfrac{${c}}{${d}} = ${qt(inner)}$, con denominador común $${lcm(b, d)}$.`,
        `División: $${qt(inner)} \\div \\dfrac{${e}}{${f}} = ${qt(inner)} \\cdot \\dfrac{${f}}{${e}} = ${qt(divd)}$.`,
        `Suma: $${qt(divd)} ${signedQ(gh)} = ${qt(res)}$.`,
      ],
    };
  },
};

const compleja: ExerciseGen = {
  id: "compleja",
  title: "Fracción compuesta (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    let a: number, b: number, c: number, d: number, e: number, f: number;
    let top: Q, bot: Q, res: Q;
    const op2 = r.bool() ? "-" : "+";
    do {
      a = r.int(1, 4);
      b = r.int(1, 5);
      c = r.pick([2, 3, 4, 5]);
      d = r.int(1, 4);
      e = r.int(1, 7);
      f = r.pick([2, 3, 4, 5, 6]);
      top = add(q(a), q(b, c));
      bot = op2 === "-" ? sub(q(d), q(e, f)) : add(q(d), q(e, f));
      res = bot[0] === 0 ? q(0) : div(top, bot);
    } while (!coprime(b, c) || !coprime(e, f) || bot[0] === 0 || res[1] > 40 || Math.abs(res[0]) > 80 || same(res, q(1)));
    return {
      statement: `Simplifica la fracción compuesta $\\dfrac{${a} + \\frac{${b}}{${c}}}{${d} ${op2} \\frac{${e}}{${f}}}$.`,
      parts: [fracPart(res, [[div(bot, top), "Invertiste la fracción. El numerador grande queda arriba."]])],
      hints: ["Resuelve por separado el numerador y el denominador grandes.", "Al final divide: multiplica el de arriba por el inverso del de abajo."],
      solution: [
        `Numerador: $${a} + \\dfrac{${b}}{${c}} = \\dfrac{${a * c + b}}{${c}}$.`,
        `Denominador: $${d} ${op2} \\dfrac{${e}}{${f}} = \\dfrac{${d * f + (op2 === "+" ? e : -e)}}{${f}}$.`,
        `División: $\\dfrac{${a * c + b}}{${c}} \\cdot \\dfrac{${f}}{${d * f + (op2 === "+" ? e : -e)}} = ${qt(res)}$.`,
      ],
    };
  },
};

const porcentajesSucesivos: ExerciseGen = {
  id: "porcentajes-sucesivos",
  title: "Porcentajes sucesivos y precio original (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    if (r.bool(0.6)) {
      let p1: number, p2: number, s1: number, s2: number, change: number;
      do {
        p1 = r.pick([10, 20, 30, 40, 50]);
        p2 = r.pick([10, 20, 30, 40, 50]);
        s1 = r.bool(0.75) ? 1 : -1;
        s2 = r.bool(0.6) ? -1 : 1;
        change = ((100 + s1 * p1) * (100 + s2 * p2)) / 100 - 100;
      } while (change === 0 || change === s1 * p1 + s2 * p2);
      const word = (s: number) => (s > 0 ? "sube" : "baja");
      const f1 = 1 + (s1 * p1) / 100;
      const f2 = 1 + (s2 * p2) / 100;
      return {
        statement: `El precio de un bien ${word(s1)} un $${p1}\\%$ en enero y en febrero ${word(s2)} un $${p2}\\%$ sobre el precio de enero. ¿En qué porcentaje cambió el precio en total? (Escribe un número negativo si bajó.)`,
        parts: [numPart(change, [[s1 * p1 + s2 * p2, "Los porcentajes sucesivos no se suman, porque el segundo se aplica sobre un precio que ya cambió."]], "\\text{cambio} =", "\\%")],
        hints: [
          "Supón que el precio inicial es 100.",
          `Cada cambio es multiplicar: por $${num(f1)}$ en enero y por $${num(f2)}$ en febrero.`,
        ],
        solution: [
          `Un cambio de $${s1 * p1}\\%$ multiplica por $${num(f1)}$ y uno de $${s2 * p2}\\%$ multiplica por $${num(f2)}$.`,
          `En total: $${num(f1)} \\cdot ${num(f2)} = ${num(f1 * f2)}$.`,
          `Si empezó en 100, terminó en $${num(100 * f1 * f2)}$. El cambio total es $${num(change)}\\%$.`,
        ],
      };
    }
    let O: number, p: number, F: number;
    do {
      O = r.int(2, 30) * 20;
      p = r.pick([10, 20, 25, 30, 40, 50]);
      F = O * (1 - p / 100);
    } while (!Number.isInteger(F));
    return {
      statement: `Después de un descuento del $${p}\\%$, un artículo cuesta $${F}$ bolívares. ¿Cuál era el precio antes del descuento?`,
      parts: [numPart(O, [[F * (1 + p / 100), `Sumarle el $${p}\\%$ al precio final no devuelve el original, porque el descuento se calculó sobre el precio original, que es mayor.`], [F - (F * p) / 100, "El precio original tiene que ser mayor que el precio con descuento."]], "\\text{precio original} =")],
      hints: [`Si el precio original es $x$, después del descuento se paga $${num(1 - p / 100)}x$.`, `Resuelve $${num(1 - p / 100)}x = ${F}$.`],
      solution: [
        `Con un descuento del $${p}\\%$ se paga el $${100 - p}\\%$ del precio: $${num(1 - p / 100)}x = ${F}$.`,
        `$x = \\dfrac{${F}}{${num(1 - p / 100)}} = ${O}$.`,
        `Comprobación: el $${p}\\%$ de $${O}$ es $${num((O * p) / 100)}$, y $${O} - ${num((O * p) / 100)} = ${F}$.`,
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("fracciones"),
  objectives: [
    "Entender qué representa una fracción y reconocer fracciones equivalentes.",
    "Simplificar fracciones y calcular el mínimo común múltiplo.",
    "Sumar, restar, multiplicar y dividir fracciones, incluso en operaciones combinadas.",
    "Pasar de fracción a decimal y de decimal, finito o periódico, a fracción.",
    "Calcular porcentajes, aumentos, descuentos y cambios porcentuales sucesivos.",
  ],
  sections: [
    {
      id: "que-es",
      title: "Qué es una fracción",
      blocks: [
        {
          type: "text",
          md: "Imagina una barra de chocolate dividida en 4 pedazos iguales. Si te comes 3, te comiste $\\frac{3}{4}$ de la barra. El número de abajo, el **denominador**, dice en cuántas partes iguales se cortó la unidad. El de arriba, el **numerador**, dice cuántas de esas partes tomas.",
        },
        { type: "widget", widget: { kind: "numberline", set: [iv(0, 0.75, true, true)], range: [0, 2], label: "3/4" }, caption: "El tramo de $0$ a $1$ partido en 4 trozos iguales. Tres trozos llegan hasta $\\frac{3}{4}$." },
        {
          type: "text",
          md: "Una fracción también es una división: $\\frac{3}{4} = 3 \\div 4 = 0{,}75$. Por eso el denominador nunca puede ser cero, porque no se divide entre cero.\n\nEl signo puede ir arriba, abajo o delante, y significa lo mismo: $-\\frac{3}{4} = \\frac{-3}{4} = \\frac{3}{-4}$.",
        },
        {
          type: "definition",
          title: "Propias, impropias y números mixtos",
          md: "Una fracción es **propia** si el numerador es menor que el denominador, como $\\frac{3}{4}$, y vale menos que 1. Es **impropia** si el numerador es mayor o igual, como $\\frac{7}{4}$, y vale 1 o más.\n\nUna impropia se puede escribir como **número mixto**: $\\frac{7}{4} = 1 + \\frac{3}{4}$, que a veces se escribe $1\\frac{3}{4}$. En matemática conviene más la forma impropia, así que úsala siempre que puedas.",
        },
        {
          type: "example",
          title: "Fracción de una cantidad",
          problem: "¿Cuánto es $\\frac{3}{5}$ de $40$?",
          steps: [
            "Partimos 40 en 5 partes iguales: $40 \\div 5 = 8$.",
            "Tomamos 3 de esas partes: $3 \\cdot 8 = 24$.",
            "En un solo paso: $\\frac{3}{5} \\cdot 40 = \\frac{120}{5} = 24$. La palabra \"de\" se traduce como multiplicar.",
          ],
          answer: "$24$",
        },
        {
          type: "note",
          tone: "econ",
          title: "Repartir un presupuesto",
          md: "Si una empresa gasta $\\frac{2}{5}$ de su presupuesto en salarios y $\\frac{1}{4}$ en materia prima, las fracciones dicen qué parte del total se lleva cada rubro sin importar si el presupuesto es de mil o de un millón.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Cuánto es $\\frac{2}{3}$ de $27$?",
            parts: [{ kind: "expr", answer: "18", maxOps: 0, mistakes: [{ answer: "9", feedback: "Eso es $\\frac{1}{3}$ de 27. Faltó multiplicar por 2." }] }],
            solution: ["$27 \\div 3 = 9$ y $2 \\cdot 9 = 18$."],
          },
        },
      ],
    },
    {
      id: "equivalentes",
      title: "Fracciones equivalentes y simplificación",
      blocks: [
        {
          type: "text",
          md: "Media pizza es lo mismo que dos cuartos o que cuatro octavos. Cambia el número de cortes, pero la cantidad de pizza es la misma: $\\frac{1}{2} = \\frac{2}{4} = \\frac{4}{8}$. Son **fracciones equivalentes**.",
        },
        { type: "widget", widget: { kind: "numberline", set: [iv(0, 0.5, true, true)], range: [0, 1], label: "1/2" } },
        { type: "widget", widget: { kind: "numberline", set: [iv(0, 0.5, true, true)], range: [0, 1], label: "2/4 = 4/8" }, caption: "Las tres fracciones marcan el mismo tramo de la recta." },
        {
          type: "definition",
          title: "Regla de equivalencia",
          md: "Si multiplicas o divides el numerador y el denominador por el mismo número distinto de cero, la fracción no cambia de valor.\n\n$$\\frac{a}{b} = \\frac{a \\cdot k}{b \\cdot k}$$\n\n**Simplificar** es dividir arriba y abajo por un divisor común. Cuando ya no queda ningún divisor común salvo el 1, la fracción es **irreducible**.",
        },
        {
          type: "example",
          title: "Simplificar paso a paso",
          problem: "Simplifica $\\dfrac{84}{126}$.",
          steps: [
            "Los dos son pares. Dividimos entre 2: $\\dfrac{42}{63}$.",
            "Las cifras de 42 suman 6 y las de 63 suman 9, así que ambos son múltiplos de 3. Dividimos entre 3: $\\dfrac{14}{21}$.",
            "Los dos son múltiplos de 7: $\\dfrac{2}{3}$.",
            "Con factores primos se ve en un paso: $84 = 2^{2} \\cdot 3 \\cdot 7$ y $126 = 2 \\cdot 3^{2} \\cdot 7$. Los factores comunes dan $2 \\cdot 3 \\cdot 7 = 42$, y $\\frac{84 \\div 42}{126 \\div 42} = \\frac{2}{3}$.",
          ],
          answer: "$\\dfrac{2}{3}$",
        },
        {
          type: "note",
          tone: "tip",
          title: "Reglas rápidas de divisibilidad",
          md: "- Entre 2: el número termina en cifra par.\n- Entre 3: la suma de sus cifras es múltiplo de 3.\n- Entre 5: termina en 0 o en 5.\n- Entre 10: termina en 0.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Solo se tachan factores, nunca sumandos",
          md: "$\\dfrac{3 \\cdot 5}{3} = 5$ está bien, porque el 3 multiplica. Pero $\\dfrac{3 + 5}{3}$ **no** es 5: vale $\\frac{8}{3}$. Un número que suma no se puede tachar. Este error aparece muchísimo con letras más adelante.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Simplifica $\\dfrac{36}{48}$ hasta que sea irreducible.",
            parts: [{ kind: "expr", answer: "\\frac{3}{4}", maxOps: 1, validate: irreducible }],
            solution: ["El máximo común divisor de 36 y 48 es 12. $\\dfrac{36 \\div 12}{48 \\div 12} = \\dfrac{3}{4}$."],
          },
        },
      ],
    },
    {
      id: "mcm",
      title: "Múltiplos, divisores y mínimo común múltiplo",
      blocks: [
        {
          type: "text",
          md: "Los **múltiplos** de 6 son los que salen de la tabla del 6: $6, 12, 18, 24, 30, 36, \\dots$ Los de 4 son $4, 8, 12, 16, 20, 24, \\dots$ Los que aparecen en las dos listas, como $12, 24, 36$, son múltiplos comunes. El menor de ellos, $12$, es el **mínimo común múltiplo**: $\\text{mcm}(4, 6) = 12$.\n\nLos **divisores** de un número son los que lo dividen exacto. Los de 12 son $1, 2, 3, 4, 6, 12$. Un número es **primo** si solo tiene dos divisores, el 1 y él mismo: $2, 3, 5, 7, 11, 13, \\dots$",
        },
        {
          type: "definition",
          title: "mcm y mcd con factores primos",
          md: "Descompón cada número en factores primos.\n\n- **mcm**: todos los primos que aparecen, comunes y no comunes, cada uno con su **mayor** exponente.\n- **mcd** (máximo común divisor): solo los primos comunes, con su **menor** exponente.",
        },
        {
          type: "example",
          title: "mcm y mcd de 12 y 18",
          problem: "Calcula $\\text{mcm}(12, 18)$ y $\\text{mcd}(12, 18)$.",
          steps: [
            "$12 = 2^{2} \\cdot 3$ y $18 = 2 \\cdot 3^{2}$.",
            "mcm: el 2 con exponente 2 y el 3 con exponente 2. $\\text{mcm} = 2^{2} \\cdot 3^{2} = 36$.",
            "mcd: el 2 con exponente 1 y el 3 con exponente 1. $\\text{mcd} = 2 \\cdot 3 = 6$.",
          ],
          answer: "$\\text{mcm} = 36$, $\\text{mcd} = 6$",
        },
        {
          type: "note",
          tone: "tip",
          title: "Dos atajos",
          md: "Si un número es múltiplo del otro, el mcm es el mayor: $\\text{mcm}(5, 15) = 15$. Si no comparten ningún primo, el mcm es el producto: $\\text{mcm}(4, 9) = 36$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $\\text{mcm}(8, 12)$.",
            parts: [{ kind: "expr", answer: "24", maxOps: 0, mistakes: [{ answer: "96", feedback: "El producto es múltiplo común, pero no el menor." }, { answer: "4", feedback: "Ese es el mcd." }] }],
            solution: ["$8 = 2^{3}$ y $12 = 2^{2} \\cdot 3$. $\\text{mcm} = 2^{3} \\cdot 3 = 24$."],
          },
        },
      ],
    },
    {
      id: "suma-resta",
      title: "Sumar y restar fracciones",
      blocks: [
        {
          type: "text",
          md: "Si los pedazos son del mismo tamaño, se cuentan y listo: dos séptimos más tres séptimos son cinco séptimos, $\\frac{2}{7} + \\frac{3}{7} = \\frac{5}{7}$. El denominador no cambia, porque el tamaño de los pedazos no cambió.\n\nSi los pedazos son de distinto tamaño, como medios y tercios, primero hay que cortarlos a un tamaño común. Eso es buscar fracciones equivalentes con el mismo denominador, y el más cómodo es el mcm.",
        },
        {
          type: "definition",
          title: "Suma con distinto denominador",
          md: "1. Calcula el mcm de los denominadores.\n\n2. Convierte cada fracción a ese denominador multiplicando arriba y abajo por lo que haga falta.\n\n3. Suma o resta los numeradores y deja el denominador común.\n\n4. Simplifica si se puede.",
        },
        {
          type: "example",
          title: "Tres fracciones",
          problem: "Calcula $\\dfrac{5}{6} - \\dfrac{3}{4} + \\dfrac{1}{3}$.",
          steps: [
            "$\\text{mcm}(6, 4, 3) = 12$.",
            "$\\dfrac{5}{6} = \\dfrac{10}{12}$, $\\dfrac{3}{4} = \\dfrac{9}{12}$ y $\\dfrac{1}{3} = \\dfrac{4}{12}$.",
            "$\\dfrac{10 - 9 + 4}{12} = \\dfrac{5}{12}$, que ya es irreducible.",
          ],
          answer: "$\\dfrac{5}{12}$",
        },
        {
          type: "note",
          tone: "warning",
          title: "No se suman los denominadores",
          md: "$\\frac{1}{2} + \\frac{1}{3}$ **no** es $\\frac{2}{5}$. Basta mirar que $\\frac{2}{5}$ es menor que $\\frac{1}{2}$, y sumarle algo positivo a $\\frac{1}{2}$ no puede dar menos. Lo correcto es $\\frac{3}{6} + \\frac{2}{6} = \\frac{5}{6}$.",
        },
        {
          type: "text",
          md: "Un entero es una fracción con denominador 1: $2 + \\frac{3}{4} = \\frac{8}{4} + \\frac{3}{4} = \\frac{11}{4}$.\n\nCon dos fracciones también sirve la fórmula general, aunque a veces deja números más grandes que hay que simplificar:\n\n$$\\frac{a}{b} + \\frac{c}{d} = \\frac{ad + bc}{bd}$$",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $\\dfrac{2}{3} + \\dfrac{1}{4}$.",
            parts: [{ kind: "expr", answer: "\\frac{11}{12}", maxOps: 1, validate: irreducible, mistakes: [{ answer: "\\frac{3}{7}", feedback: "No se suman los denominadores." }] }],
            solution: ["$\\text{mcm}(3, 4) = 12$. $\\dfrac{8}{12} + \\dfrac{3}{12} = \\dfrac{11}{12}$."],
          },
        },
      ],
    },
    {
      id: "producto-cociente",
      title: "Multiplicar y dividir fracciones",
      blocks: [
        {
          type: "text",
          md: "Multiplicar es más fácil que sumar: numerador por numerador y denominador por denominador.\n\n$$\\frac{a}{b} \\cdot \\frac{c}{d} = \\frac{a \\cdot c}{b \\cdot d}$$\n\nTiene sentido. La mitad de tres cuartos de pizza es $\\frac{1}{2} \\cdot \\frac{3}{4} = \\frac{3}{8}$: si partes cada cuarto por la mitad, te quedan octavos, y tienes tres.",
        },
        {
          type: "example",
          title: "Simplificar antes de multiplicar",
          problem: "Calcula $\\dfrac{6}{35} \\cdot \\dfrac{14}{9}$.",
          steps: [
            "Antes de multiplicar busca factores comunes en cruz. El 6 y el 9 comparten un 3: quedan 2 y 3.",
            "El 14 y el 35 comparten un 7: quedan 2 y 5.",
            "$\\dfrac{2}{5} \\cdot \\dfrac{2}{3} = \\dfrac{4}{15}$.",
          ],
          answer: "$\\dfrac{4}{15}$",
        },
        {
          type: "definition",
          title: "Dividir es multiplicar por el inverso",
          md: "El inverso de $\\frac{c}{d}$ es $\\frac{d}{c}$. Para dividir, se multiplica por el inverso de la segunda fracción:\n\n$$\\frac{a}{b} \\div \\frac{c}{d} = \\frac{a}{b} \\cdot \\frac{d}{c} = \\frac{a \\cdot d}{b \\cdot c}$$\n\n¿Por qué? Pregúntate cuántas mitades caben en 3. Caben 6, y en efecto $3 \\div \\frac{1}{2} = 3 \\cdot 2 = 6$.",
        },
        {
          type: "example",
          title: "Fracción compuesta",
          problem: "Simplifica $\\dfrac{1 + \\frac{1}{2}}{2 - \\frac{1}{3}}$.",
          steps: [
            "Numerador: $1 + \\frac{1}{2} = \\frac{3}{2}$.",
            "Denominador: $2 - \\frac{1}{3} = \\frac{5}{3}$.",
            "Dividimos: $\\frac{3}{2} \\div \\frac{5}{3} = \\frac{3}{2} \\cdot \\frac{3}{5} = \\frac{9}{10}$.",
          ],
          answer: "$\\dfrac{9}{10}$",
        },
        {
          type: "note",
          tone: "warning",
          title: "Se invierte solo la que divide",
          md: "En $\\frac{3}{4} \\div \\frac{9}{8}$ la que se invierte es $\\frac{9}{8}$, la segunda. La primera se queda igual.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $\\dfrac{3}{4} \\div \\dfrac{9}{8}$.",
            parts: [{ kind: "expr", answer: "\\frac{2}{3}", maxOps: 1, validate: irreducible, mistakes: [{ answer: "\\frac{27}{32}", feedback: "Multiplicaste sin invertir la segunda." }, { answer: "\\frac{3}{2}", feedback: "Invertiste el resultado. Revisa cuál fracción se invierte." }] }],
            solution: ["$\\dfrac{3}{4} \\cdot \\dfrac{8}{9} = \\dfrac{24}{36} = \\dfrac{2}{3}$."],
          },
        },
      ],
    },
    {
      id: "decimales",
      title: "De fracción a decimal y de vuelta",
      blocks: [
        {
          type: "text",
          md: "Para pasar de fracción a decimal se divide. $\\frac{3}{8} = 3 \\div 8 = 0{,}375$, un **decimal finito**. En cambio $\\frac{2}{3} = 0{,}666\\dots$ nunca termina: es un **decimal periódico** y se escribe $0{,}\\overline{6}$, con una raya sobre la parte que se repite.\n\nUna fracción irreducible da decimal finito justo cuando su denominador solo tiene los factores primos 2 y 5. Por eso $\\frac{3}{8}$ es finito y $\\frac{2}{3}$ no.",
        },
        {
          type: "definition",
          title: "Decimal finito a fracción",
          md: "Escribe el número sin coma sobre 1 seguido de tantos ceros como cifras decimales tenga. Después simplifica.\n\n$$0{,}45 = \\frac{45}{100} = \\frac{9}{20} \\qquad 2{,}5 = \\frac{25}{10} = \\frac{5}{2}$$",
        },
        {
          type: "definition",
          title: "Decimal periódico a fracción",
          md: "**Periódico puro** (todo lo de después de la coma se repite): el periodo arriba y un 9 por cada cifra del periodo abajo.\n\n$$0{,}\\overline{36} = \\frac{36}{99} = \\frac{4}{11}$$\n\n**Periódico mixto** (hay cifras que no se repiten antes del periodo): arriba, las cifras hasta el primer periodo menos las que no se repiten. Abajo, un 9 por cada cifra del periodo seguido de un 0 por cada cifra que no se repite.\n\n$$0{,}1\\overline{6} = \\frac{16 - 1}{90} = \\frac{15}{90} = \\frac{1}{6}$$",
        },
        {
          type: "example",
          title: "De dónde sale la regla del 9",
          problem: "Demuestra que $0{,}\\overline{3} = \\frac{1}{3}$.",
          steps: [
            "Llama $x = 0{,}333\\dots$",
            "Multiplica por 10: $10x = 3{,}333\\dots$",
            "Resta las dos igualdades. Las colas infinitas se cancelan: $10x - x = 3$, es decir, $9x = 3$.",
            "$x = \\frac{3}{9} = \\frac{1}{3}$.",
          ],
        },
        {
          type: "note",
          tone: "idea",
          title: "Una curiosidad",
          md: "Con la misma regla, $0{,}\\overline{9} = \\frac{9}{9} = 1$. No es \"casi 1\": es exactamente 1.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Escribe $0{,}35$ como fracción irreducible.",
            parts: [{ kind: "expr", answer: "\\frac{7}{20}", maxOps: 1, validate: irreducible }],
            solution: ["$0{,}35 = \\dfrac{35}{100}$. Dividiendo entre 5: $\\dfrac{7}{20}$."],
          },
        },
      ],
    },
    {
      id: "porcentajes",
      title: "Porcentajes",
      blocks: [
        {
          type: "text",
          md: "Un porcentaje es una fracción con denominador 100. \"El 25 %\" quiere decir \"25 de cada 100\": $25\\% = \\frac{25}{100} = \\frac{1}{4} = 0{,}25$.",
        },
        {
          type: "table",
          headers: ["Porcentaje", "Fracción", "Decimal"],
          rows: [
            ["$50\\%$", "$\\frac{1}{2}$", "$0{,}5$"],
            ["$25\\%$", "$\\frac{1}{4}$", "$0{,}25$"],
            ["$75\\%$", "$\\frac{3}{4}$", "$0{,}75$"],
            ["$20\\%$", "$\\frac{1}{5}$", "$0{,}2$"],
            ["$10\\%$", "$\\frac{1}{10}$", "$0{,}1$"],
            ["$1\\%$", "$\\frac{1}{100}$", "$0{,}01$"],
          ],
        },
        {
          type: "definition",
          title: "Porcentaje de una cantidad",
          md: "$$p\\% \\text{ de } N = \\frac{p}{100} \\cdot N$$\n\nEl 15 % de 240 es $0{,}15 \\cdot 240 = 36$.",
        },
        {
          type: "definition",
          title: "Aumentos y descuentos",
          md: "Subir un $p\\%$ es multiplicar por $1 + \\frac{p}{100}$. Bajar un $p\\%$ es multiplicar por $1 - \\frac{p}{100}$.\n\nUn aumento del 16 % multiplica por $1{,}16$ y un descuento del 20 % multiplica por $0{,}8$.",
        },
        {
          type: "example",
          title: "Descuento y luego impuesto",
          problem: "Un artículo cuesta 250. Tiene un descuento del 20 % y sobre el precio rebajado se cobra un impuesto del 16 %. ¿Cuánto se paga?",
          steps: [
            "Descuento: $250 \\cdot 0{,}8 = 200$.",
            "Impuesto sobre el precio rebajado: $200 \\cdot 1{,}16 = 232$.",
            "En un solo paso: $250 \\cdot 0{,}8 \\cdot 1{,}16 = 232$.",
          ],
          answer: "$232$",
        },
        {
          type: "definition",
          title: "Cambio porcentual",
          md: "Si una cantidad pasa de un valor inicial $V_i$ a un valor final $V_f$, el cambio porcentual es\n\n$$\\frac{V_f - V_i}{V_i} \\cdot 100\\%$$\n\nDe 80 a 92 el cambio es $\\frac{12}{80} = 0{,}15$, es decir, un 15 %.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Los porcentajes sucesivos no se suman",
          md: "Subir 20 % y luego bajar 20 % no te deja igual. Multiplicas por $1{,}2$ y luego por $0{,}8$, y $1{,}2 \\cdot 0{,}8 = 0{,}96$. Terminas 4 % por debajo, porque el 20 % de bajada se calculó sobre un precio más alto.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Inflación acumulada",
          md: "Con una inflación de 10 % mensual durante dos meses (dato de ejemplo), los precios no suben 20 %. Se multiplican por $1{,}1 \\cdot 1{,}1 = 1{,}21$, así que suben 21 %. Esa diferencia crece rápido cuando son muchos meses, y es la misma idea del interés compuesto que verás con el número $e$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula el $15\\%$ de $240$.",
            parts: [{ kind: "expr", answer: "36", maxOps: 0, mistakes: [{ answer: "3600", feedback: "Faltó dividir entre 100." }] }],
            solution: ["$\\dfrac{15}{100} \\cdot 240 = \\dfrac{3600}{100} = 36$."],
          },
        },
      ],
    },
  ],
  exercises: [
    simplificar,
    sumaSimple,
    producto,
    fraccionCantidad,
    porcentajeDe,
    sumaDistinto,
    division,
    decimalFraccion,
    mcm,
    aumentoDescuento,
    combinada,
    compleja,
    porcentajesSucesivos,
  ],
};

export default topic;
