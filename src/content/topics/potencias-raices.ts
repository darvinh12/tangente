import { meta } from "../catalog";
import { trueFalse } from "../helpers";
import type { ExerciseGen, Mistake, Part, Rich, Topic } from "../types";
import type { Ast } from "@/lib/math/parse";
import { equivalent } from "@/lib/math/check";
import { frac, gcd, num } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

/** Fracción reducida [numerador, denominador] con denominador positivo. */
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
const qt = (x: Q) => frac(x[0], x[1]);
const same = (x: Q, y: Q) => x[0] === y[0] && x[1] === y[1];
/** Potencia entera de una fracción. */
function qpow(x: Q, n: number): Q {
  if (n >= 0) return q(x[0] ** n, x[1] ** n);
  return q(x[1] ** -n, x[0] ** -n);
}

function numVal(a: Ast): number | null {
  if (a.t === "num") return a.v;
  if (a.t === "neg") {
    const v = numVal(a.a);
    return v === null ? null : -v;
  }
  if (a.t === "bin" && a.op === "/") {
    const p = numVal(a.a);
    const d = numVal(a.b);
    if (p !== null && d !== null && d !== 0) return p / d;
  }
  return null;
}

function fracForm(a: Ast): [number, number] | null {
  if (a.t === "neg") {
    const f = fracForm(a.a);
    return f ? [-f[0], f[1]] : null;
  }
  if (a.t === "num") return [a.v, 1];
  if (a.t === "bin" && a.op === "/" && (a.a.t === "num" || a.a.t === "neg") && (a.b.t === "num" || a.b.t === "neg")) {
    const p = numVal(a.a);
    const d = numVal(a.b);
    if (p !== null && d !== null) return [p, d];
  }
  return null;
}

/** Entero o fracción irreducible, sin potencias ni raíces indicadas. */
function irreducible(ast: Ast): string | null {
  const f = fracForm(ast);
  if (!f) return "Escribe el resultado como un solo número entero o una sola fracción, sin potencias ni raíces.";
  const [p, d] = f;
  if (!Number.isInteger(p) || !Number.isInteger(d)) return "Usa una fracción de enteros, sin decimales.";
  if (gcd(p, d) !== 1) return "La fracción todavía se puede simplificar.";
  return null;
}

/** ¿n tiene algún factor p^k con p >= 2? */
function hasPowerFactor(n: number, k: number): boolean {
  n = Math.abs(n);
  for (let p = 2; p ** k <= n; p++) if (n % p ** k === 0) return true;
  return false;
}

/** Radicando como monomio: coeficiente entero y exponentes enteros de cada letra. */
function radicandMono(a: Ast, acc: { c: number; e: Record<string, number>; ok: boolean }) {
  if (a.t === "num") acc.c *= a.v;
  else if (a.t === "var") acc.e[a.name] = (acc.e[a.name] ?? 0) + 1;
  else if (a.t === "bin" && a.op === "*") {
    radicandMono(a.a, acc);
    radicandMono(a.b, acc);
  } else if (a.t === "bin" && a.op === "^" && a.a.t === "var") {
    const v = numVal(a.b);
    if (v === null || !Number.isInteger(v) || v < 0) acc.ok = false;
    else acc.e[a.a.name] = (acc.e[a.a.name] ?? 0) + v;
  } else acc.ok = false;
}

/** Revisa que todas las raíces estén simplificadas y que no queden exponentes fraccionarios ni potencias de números. */
function radicalsSimplified(a: Ast): string | null {
  switch (a.t) {
    case "root": {
      const k = numVal(a.n);
      if (k === null || !Number.isInteger(k)) return "El índice de la raíz debe ser un entero.";
      const acc = { c: 1, e: {} as Record<string, number>, ok: true };
      radicandMono(a.a, acc);
      if (!acc.ok || !Number.isInteger(acc.c)) return "Dentro de la raíz deja solo un número entero y letras con exponente.";
      if (hasPowerFactor(acc.c, k)) return "Todavía puedes sacar un factor numérico de la raíz.";
      if (Object.values(acc.e).some((e) => e >= k)) return "Todavía puedes sacar letras de la raíz: ningún exponente de adentro puede ser mayor o igual que el índice.";
      if (acc.c === 1 && Object.keys(acc.e).length === 0) return "Una raíz de 1 vale 1. Simplifícala.";
      return null;
    }
    case "bin":
      if (a.op === "^") {
        const e = numVal(a.b);
        if (a.a.t !== "var" || e === null || !Number.isInteger(e)) return "Escribe el resultado con radicales y exponentes enteros, sin exponentes fraccionarios ni potencias de números.";
        return null;
      }
      return radicalsSimplified(a.a) ?? radicalsSimplified(a.b);
    case "neg":
      return radicalsSimplified(a.a);
    case "num":
    case "var":
      return null;
    default:
      return "Escribe el resultado como producto de números, letras y radicales.";
  }
}

/** Monomio cociente: cada letra una sola vez, exponentes positivos y números simplificados. */
function monomialPositive(ast: Ast): string | null {
  const acc = { ok: true, count: {} as Record<string, number>, numC: 1, denC: 1, nums: 0, negExp: false };
  const walk = (a: Ast, den: boolean) => {
    if (a.t === "num") {
      acc.nums++;
      if (den) acc.denC *= a.v;
      else acc.numC *= a.v;
    } else if (a.t === "var") acc.count[a.name] = (acc.count[a.name] ?? 0) + 1;
    else if (a.t === "neg") walk(a.a, den);
    else if (a.t === "bin" && a.op === "*") {
      walk(a.a, den);
      walk(a.b, den);
    } else if (a.t === "bin" && a.op === "/") {
      walk(a.a, den);
      walk(a.b, !den);
    } else if (a.t === "bin" && a.op === "^" && a.a.t === "var") {
      const e = numVal(a.b);
      if (e === null) acc.ok = false;
      else if (e < 0) acc.negExp = true;
      acc.count[a.a.name] = (acc.count[a.a.name] ?? 0) + 1;
    } else acc.ok = false;
  };
  walk(ast, false);
  if (!acc.ok) return "Escribe el resultado como un solo término: números y letras con exponente, sin paréntesis.";
  if (Object.values(acc.count).some((c) => c > 1)) return "Cada letra debe aparecer una sola vez. Junta sus exponentes.";
  if (acc.negExp) return "Escribe los exponentes positivos. Un exponente negativo se pasa al otro piso de la fracción.";
  if (acc.nums > 2 || (Number.isInteger(acc.numC) && Number.isInteger(acc.denC) && gcd(acc.numC, acc.denC) > 1)) return "Simplifica los números.";
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

/** Respuesta numérica exacta: entero o fracción irreducible. */
function fracPart(answer: Q, mistakes: [Q | null, Rich][] = [], before?: string): Part {
  return { kind: "expr", answer: qt(answer), maxOps: 1, validate: irreducible, before, mistakes: mistakesQ(answer, mistakes) };
}

/** x^e escrito limpio: x^1 -> x */
const pw = (v: string, e: number) => (e === 1 ? v : `${v}^{${e}}`);

/** Escribe c·x^a·y^b con exponentes tal cual (pueden ser negativos). */
function monoTex(c: number, ex: [string, number][]): string {
  const body = ex.filter(([, e]) => e !== 0).map(([v, e]) => pw(v, e)).join("");
  if (c === 1) return body || "1";
  if (c === -1) return body ? `-${body}` : "-1";
  return `${c}${body}`;
}

/** Escribe coef·x^a·y^b como fracción con exponentes positivos. */
function monoFrac(coef: Q, ex: [string, number][]): string {
  const top = ex.filter(([, e]) => e > 0).map(([v, e]) => pw(v, e)).join("");
  const bot = ex.filter(([, e]) => e < 0).map(([v, e]) => pw(v, -e)).join("");
  const sign = coef[0] < 0 ? "-" : "";
  const cn = Math.abs(coef[0]);
  const cd = coef[1];
  const numStr = cn === 1 ? top || "1" : `${cn}${top}`;
  const denStr = cd === 1 ? bot : `${cd}${bot}`;
  return denStr ? `${sign}\\frac{${numStr}}{${denStr}}` : `${sign}${numStr}`;
}

const rootTex = (n: number, inner: string | number) => (n === 2 ? `\\sqrt{${inner}}` : `\\sqrt[${n}]{${inner}}`);

/* ----------------------------------- ejercicios ----------------------------------- */

const potenciaNumerica: ExerciseGen = {
  id: "potencia-numerica",
  title: "Calcular potencias",
  level: 1,
  generate: (r) => {
    const form = r.int(0, 3);
    if (form <= 1) {
      let a: number, n: number;
      do {
        a = r.int(2, 5);
        n = r.int(2, 5);
      } while (a ** n > 256);
      const inside = form === 0;
      const value = inside ? (-a) ** n : -(a ** n);
      const tex = inside ? `(-${a})^{${n}}` : `-${a}^{${n}}`;
      return {
        statement: `Calcula $${tex}$.`,
        parts: [
          fracPart(q(value), [
            [q(inside ? -a * n : -a * n), "La potencia no es multiplicar la base por el exponente. Es multiplicar la base por sí misma tantas veces como diga el exponente."],
            [q(-value), inside ? `Revisa el signo. Con exponente ${n % 2 === 0 ? "par el resultado es positivo" : "impar el resultado es negativo"}.` : `El exponente solo afecta al ${a}. El signo menos queda afuera.`],
          ]),
        ],
        hints: [inside ? "El paréntesis dice que la base es negativa: multiplica el negativo por sí mismo." : "Sin paréntesis, el exponente solo afecta al número. El menos se pone al final."],
        solution: [
          inside
            ? `$(-${a})^{${n}} = ${Array(n).fill(`(-${a})`).join("")} = ${value}$. Hay ${n} factores negativos, una cantidad ${n % 2 === 0 ? "par" : "impar"}.`
            : `$-${a}^{${n}} = -(${Array(n).fill(a).join(" \\cdot ")}) = ${value}$.`,
        ],
      };
    }
    let p: number, d: number, n: number;
    do {
      p = r.int(1, 5);
      d = r.int(2, 5);
      n = r.int(2, 3);
    } while (gcd(p, d) !== 1 || d ** n > 125);
    const neg = form === 3 && n === 3;
    const base = q(neg ? -p : p, d);
    const value = qpow(base, n);
    const tex = `\\left(${neg ? "-" : ""}\\frac{${p}}{${d}}\\right)^{${n}}`;
    return {
      statement: `Calcula $${tex}$.`,
      parts: [fracPart(value, [[q((neg ? -1 : 1) * p ** n, d), "El exponente afecta al numerador y también al denominador."], [q((neg ? -1 : 1) * p * n, d * n), "Multiplicaste por el exponente en lugar de elevar."]])],
      hints: ["Eleva el numerador y el denominador por separado: $\\left(\\frac{a}{b}\\right)^{n} = \\frac{a^{n}}{b^{n}}$."],
      solution: [`$${tex} = \\dfrac{${neg ? "-" : ""}${p}^{${n}}}{${d}^{${n}}} = ${qt(value)}$.`],
    };
  },
};

const ceroNegativo: ExerciseGen = {
  id: "cero-negativo",
  title: "Exponentes cero y negativos",
  level: 1,
  generate: (r) => {
    const form = r.int(0, 2);
    if (form === 0) {
      let a: number, n: number;
      do {
        a = r.int(2, 6);
        n = r.int(1, 3);
      } while (a ** n > 125);
      const negBase = r.bool(0.3);
      const b = negBase ? -a : a;
      const value = qpow(q(b), -n);
      const tex = negBase ? `(-${a})^{-${n}}` : `${a}^{-${n}}`;
      return {
        statement: `Calcula $${tex}$ y escribe el resultado como fracción.`,
        parts: [fracPart(value, [[q(-(a ** n)), "Un exponente negativo no vuelve negativo el resultado. Lo que hace es invertir la base."], [q(-a * n), "El exponente negativo no se multiplica por la base."], [q(b ** n), "Elevaste bien pero faltó invertir. $a^{-n} = \\frac{1}{a^{n}}$."]])],
        hints: ["$a^{-n} = \\dfrac{1}{a^{n}}$. El signo menos del exponente manda la potencia al denominador."],
        solution: [n === 1 ? `$${tex} = ${qt(value)}$: el exponente $-1$ invierte la base.` : `$${tex} = \\dfrac{1}{${negBase ? `(-${a})` : a}^{${n}}} = ${qt(value)}$.`],
      };
    }
    if (form === 1) {
      let p: number, d: number, n: number;
      do {
        p = r.int(1, 5);
        d = r.int(2, 6);
        n = r.int(1, 3);
      } while (gcd(p, d) !== 1 || p === d || Math.max(p, d) ** n > 125);
      const value = qpow(q(p, d), -n);
      return {
        statement: `Calcula $\\left(\\dfrac{${p}}{${d}}\\right)^{-${n}}$.`,
        parts: [fracPart(value, [[qpow(q(p, d), n), "Faltó invertir la fracción. El exponente negativo da vuelta a la fracción."], [q(-(p ** n), d ** n), "El exponente negativo no cambia el signo, invierte la fracción."]])],
        hints: ["$\\left(\\dfrac{a}{b}\\right)^{-n} = \\left(\\dfrac{b}{a}\\right)^{n}$."],
        solution: [`Invertimos y cambiamos el signo del exponente: $\\left(\\dfrac{${d}}{${p}}\\right)^{${n}} = \\dfrac{${d ** n}}{${p ** n}}${p ** n === 1 ? ` = ${d ** n}` : ""}$.`],
      };
    }
    const a = r.int(2, 30);
    const b = r.int(2, 9);
    const c = r.int(2, 5);
    const value = add(add(q(1), q(1, b)), q(1, c * c));
    return {
      statement: `Calcula $${a}^{0} + ${b}^{-1} + ${c}^{-2}$.`,
      parts: [fracPart(value, [[add(q(1, b), q(1, c * c)), `Cualquier número distinto de cero elevado a la 0 da 1, no 0.`], [add(add(q(a), q(1, b)), q(1, c * c)), `$${a}^{0}$ no es $${a}$. Vale 1.`], [add(add(q(1), q(-b)), q(-c * c)), "Un exponente negativo invierte la base, no la vuelve negativa."]])],
      hints: ["$a^{0} = 1$ y $a^{-n} = \\frac{1}{a^{n}}$.", "Al final suma las fracciones con denominador común."],
      solution: [
        `$${a}^{0} = 1$, $${b}^{-1} = \\frac{1}{${b}}$ y $${c}^{-2} = \\frac{1}{${c * c}}$.`,
        `$1 + \\frac{1}{${b}} + \\frac{1}{${c * c}} = ${qt(value)}$.`,
      ],
    };
  },
};

const raizExacta: ExerciseGen = {
  id: "raiz-exacta",
  title: "Raíces exactas",
  level: 1,
  generate: (r) => {
    const form = r.int(0, 3);
    if (form === 0) {
      const n = r.int(2, 15);
      return {
        statement: `Calcula $\\sqrt{${n * n}}$.`,
        parts: [fracPart(q(n), [[(n * n) % 2 === 0 ? q((n * n) / 2) : null, "La raíz cuadrada no es la mitad. Busca el número que multiplicado por sí mismo da el radicando."]])],
        hints: [`¿Qué número multiplicado por sí mismo da $${n * n}$?`],
        solution: [`$${n} \\cdot ${n} = ${n * n}$, así que $\\sqrt{${n * n}} = ${n}$.`],
      };
    }
    if (form === 1) {
      const n = r.int(2, 6);
      const neg = r.bool();
      const R = neg ? -(n ** 3) : n ** 3;
      return {
        statement: `Calcula $\\sqrt[3]{${R}}$.`,
        parts: [fracPart(q(neg ? -n : n), [[q(neg ? n : -n), neg ? "Una raíz cúbica de un negativo es negativa, porque un negativo al cubo es negativo." : "Revisa el signo."]])],
        hints: [`¿Qué número elevado al cubo da $${R}$?`, "Las raíces de índice impar sí existen para números negativos."],
        solution: [`$${neg ? `(-${n})` : n}^{3} = ${R}$, así que $\\sqrt[3]{${R}} = ${neg ? -n : n}$.`],
      };
    }
    if (form === 2) {
      const k = r.pick([4, 5]);
      const n = k === 4 ? r.int(2, 4) : r.int(2, 3);
      return {
        statement: `Calcula $\\sqrt[${k}]{${n ** k}}$.`,
        parts: [fracPart(q(n), [[q((n ** k) / k), "La raíz no es dividir entre el índice."]])],
        hints: [`Busca el número que elevado a la ${k} da $${n ** k}$.`],
        solution: [`$${n}^{${k}} = ${n ** k}$, así que $\\sqrt[${k}]{${n ** k}} = ${n}$.`],
      };
    }
    let a: number, b: number;
    do {
      a = r.int(1, 9);
      b = r.int(2, 12);
    } while (gcd(a, b) !== 1);
    return {
      statement: `Calcula $\\sqrt{\\dfrac{${a * a}}{${b * b}}}$.`,
      parts: [fracPart(q(a, b))],
      hints: ["La raíz de una fracción es la raíz del numerador entre la raíz del denominador."],
      solution: [`$\\sqrt{\\dfrac{${a * a}}{${b * b}}} = \\dfrac{\\sqrt{${a * a}}}{\\sqrt{${b * b}}} = ${qt(q(a, b))}$.`],
    };
  },
};

const leyesExponente: ExerciseGen = {
  id: "leyes-exponente",
  title: "Leyes de los exponentes",
  level: 1,
  generate: (r) => {
    const form = r.int(0, 4);
    const a = r.nz(-5, 8, [1]);
    const b = r.nz(-5, 8, [1]);
    const c = r.int(2, 9);
    let tex: string, n: number, wrong: [number, Rich][], steps: string;
    if (form === 0) {
      tex = `x^{${a}} \\cdot x^{${b}}`;
      n = a + b;
      wrong = [[a * b, "Al multiplicar potencias de la misma base, los exponentes se suman, no se multiplican."]];
      steps = `Misma base multiplicando: se suman los exponentes. $${a} + ${b < 0 ? `(${b})` : b} = ${n}$.`;
    } else if (form === 1) {
      tex = `\\dfrac{x^{${a}}}{x^{${b}}}`;
      n = a - b;
      wrong = [[a + b, "Al dividir, los exponentes se restan: el de arriba menos el de abajo."], [b - a, "Restaste al revés. Es el exponente de arriba menos el de abajo."]];
      steps = `Misma base dividiendo: se restan los exponentes. $${a} - ${b < 0 ? `(${b})` : b} = ${n}$.`;
    } else if (form === 2) {
      tex = `\\left(x^{${a}}\\right)^{${c}}`;
      n = a * c;
      wrong = [[a + c, "En una potencia de potencia los exponentes se multiplican."]];
      steps = `Potencia de una potencia: se multiplican los exponentes. $${a} \\cdot ${c} = ${n}$.`;
    } else if (form === 3) {
      tex = `\\dfrac{x^{${a}} \\cdot x^{${b}}}{x^{${c}}}`;
      n = a + b - c;
      wrong = [[a * b - c, "Arriba los exponentes se suman, no se multiplican."], [a + b + c, "El exponente del denominador se resta."]];
      steps = `Arriba: $${a} + ${b < 0 ? `(${b})` : b} = ${a + b}$. Al dividir: $${a + b} - ${c} = ${n}$.`;
    } else {
      tex = `\\left(x^{${a}}\\right)^{${c}} \\cdot x^{${b}}`;
      n = a * c + b;
      wrong = [[a + c + b, "En la potencia de potencia los exponentes se multiplican."], [a * c * b, "Al multiplicar por $x^{" + b + "}$ los exponentes se suman."]];
      steps = `Potencia de potencia: $${a} \\cdot ${c} = ${a * c}$. Luego se suma el otro: $${a * c} + ${b < 0 ? `(${b})` : b} = ${n}$.`;
    }
    return {
      statement: `Escribe $${tex}$ como una sola potencia $x^{n}$. ¿Cuánto vale $n$?`,
      parts: [{ kind: "expr", before: "n =", answer: String(n), maxOps: 0, mistakes: wrong.filter(([v]) => v !== n).map(([v, fb]) => ({ answer: String(v), feedback: fb })) }],
      hints: ["Producto de igual base: se suman los exponentes. Cociente: se restan. Potencia de potencia: se multiplican."],
      solution: [steps, `Resultado: $${tex} = x^{${n}}$.`],
    };
  },
};

function standardForm(digits: string, decs: number, n: number): { tex: string; plain: string } {
  // valor = 0.digits... ajustado: coeficiente con `decs` decimales por 10^n
  if (n >= decs) {
    const s = digits + "0".repeat(n - decs);
    const groups: string[] = [];
    for (let i = s.length; i > 0; i -= 3) groups.unshift(s.slice(Math.max(0, i - 3), i));
    return { tex: groups.join("\\,"), plain: s };
  }
  const s = "0{,}" + "0".repeat(-n - 1) + digits;
  return { tex: s, plain: s };
}

const notacionCientifica: ExerciseGen = {
  id: "notacion-cientifica",
  title: "Notación científica",
  level: 1,
  generate: (r) => {
    const decs = r.pick([0, 1, 2]);
    const digits = decs === 0 ? String(r.int(1, 9)) : decs === 1 ? String(r.int(11, 99)) : String(r.int(101, 999));
    if (digits.endsWith("0")) return notacionCientifica.generate(r);
    const coef = Number(digits) / 10 ** decs;
    const n = r.bool() ? r.int(3, 9) : -r.int(2, 7);
    const std = standardForm(digits, decs, n);
    if (r.bool(0.6)) {
      return {
        statement: `Escribe $${std.tex}$ en notación científica, es decir, como $a \\times 10^{n}$ con $1 \\le a < 10$.`,
        parts: [
          { kind: "expr", prompt: "El número $a$:", before: "a =", answer: num(coef), maxOps: 0 },
          { kind: "expr", prompt: "El exponente $n$:", before: "n =", answer: String(n), maxOps: 0, mistakes: [{ answer: String(-n), feedback: n > 0 ? "Un número grande lleva exponente positivo." : "Un número menor que 1 lleva exponente negativo." }] },
        ],
        hints: ["Mueve la coma hasta que quede una sola cifra distinta de cero a su izquierda.", "Cuenta cuántos lugares la moviste. Si el número era grande, el exponente es positivo. Si era menor que 1, es negativo."],
        solution: [
          `La coma se mueve ${Math.abs(n)} lugares hacia la ${n > 0 ? "izquierda" : "derecha"} para que quede $${num(coef)}$.`,
          `$${std.tex} = ${num(coef)} \\times 10^{${n}}$.`,
        ],
      };
    }
    return {
      statement: `Escribe $${num(coef)} \\times 10^{${n}}$ como número decimal normal, sin potencias.`,
      parts: [{ kind: "expr", answer: std.plain, maxOps: 0 }],
      hints: [n > 0 ? `Multiplicar por $10^{${n}}$ mueve la coma ${n} lugares a la derecha.` : `Multiplicar por $10^{${n}}$ mueve la coma ${-n} lugares a la izquierda.`],
      solution: [`Movemos la coma ${Math.abs(n)} lugares hacia la ${n > 0 ? "derecha" : "izquierda"}: $${std.tex}$.`],
    };
  },
};

const simplificarMonomio: ExerciseGen = {
  id: "simplificar-monomio",
  title: "Simplificar con las leyes de exponentes",
  level: 2,
  generate: (r) => {
    let c1: number, m: number, a1: number, b1: number, c2: number, a2: number, b2: number, ex: number, ey: number;
    do {
      m = r.pick([2, 2, 3, -1, -2]);
      c1 = Math.abs(m) === 3 ? r.pick([1, 2]) : r.pick([1, 2, 3]);
      a1 = r.nz(-3, 3);
      b1 = r.nz(-3, 3);
      c2 = r.pick([1, 2, 3, 4, 6, 8, 9]);
      a2 = r.nz(-4, 4);
      b2 = r.nz(-4, 4);
      ex = a1 * m - a2;
      ey = b1 * m - b2;
    } while ((ex === 0 && ey === 0) || Math.abs(ex) > 10 || Math.abs(ey) > 10 || (c1 === 1 && c2 === 1));
    const coef = m > 0 ? q(c1 ** m, c2) : q(1, c1 ** -m * c2);
    const answer = monoFrac(coef, [["x", ex], ["y", ey]]);
    const top = monoTex(c1, [["x", a1], ["y", b1]]);
    const bottom = monoTex(c2, [["x", a2], ["y", b2]]);
    const tex = `\\dfrac{\\left(${top}\\right)^{${m}}}{${bottom}}`;
    const wrongAns = monoFrac(coef, [["x", a1 + m - a2], ["y", b1 + m - b2]]);
    const mistakes: Mistake[] = [];
    if (!equivalent(wrongAns, answer, { vars: ["x", "y"], domain: [0.5, 2.5] })) {
      mistakes.push({ answer: wrongAns, feedback: "En una potencia de potencia los exponentes se multiplican, no se suman." });
    }
    const expanded = monoTex(1, [["x", a1 * m], ["y", b1 * m]]);
    const c1m = m > 0 ? String(c1 ** m) : qt(q(1, c1 ** -m));
    return {
      statement: `Simplifica $${tex}$ y escribe el resultado con exponentes positivos.`,
      parts: [{ kind: "expr", answer, vars: ["x", "y"], domain: [0.5, 2.5], validate: monomialPositive, mistakes }],
      hints: [
        `Primero eleva el paréntesis a la ${m}: cada factor de adentro queda elevado a la ${m}.`,
        "Después divide restando exponentes de la misma letra. Al final, los exponentes negativos pasan al denominador.",
      ],
      solution: [
        `Paréntesis: $\\left(${top}\\right)^{${m}} = ${c1 === 1 ? "" : `${c1m}\\,`}${expanded}$.`,
        `Dividimos entre $${bottom}$: la $x$ queda con exponente $${a1 * m} - ${a2 < 0 ? `(${a2})` : a2} = ${ex}$ y la $y$ con $${b1 * m} - ${b2 < 0 ? `(${b2})` : b2} = ${ey}$. El número queda $${qt(coef)}$.`,
        `Con exponentes positivos: $${answer}$.`,
      ],
    };
  },
};

const expFracNum: ExerciseGen = {
  id: "exponente-fraccionario",
  title: "Exponentes fraccionarios con números",
  level: 2,
  generate: (r) => {
    let b: number, n: number, m: number;
    do {
      b = r.int(2, 5);
      n = r.pick([2, 3]);
      m = r.int(1, 3);
    } while (gcd(m, n) !== 1 || b ** n > 125 || b ** m > 125 || (m === 1 && r.bool(0.5)));
    const neg = r.bool(0.35);
    const A = b ** n;
    const value = qpow(q(b), neg ? -m : m);
    const tex = neg ? `${A}^{-\\frac{${m}}{${n}}}` : `${A}^{\\frac{${m}}{${n}}}`;
    return {
      statement: `Calcula $${tex}$.`,
      parts: [fracPart(value, [[q((neg ? -1 : 1) * A * m, n), "El exponente fraccionario no se multiplica por la base. El denominador es el índice de una raíz."], [neg ? q(-(b ** m)) : null, "El exponente negativo invierte, no cambia el signo."]])],
      hints: [`$a^{\\frac{m}{n}} = \\left(\\sqrt[n]{a}\\right)^{m}$. Empieza por la raíz: $${rootTex(n, A)} = ${b}$.`],
      solution: [
        `El denominador ${n} es el índice de la raíz: $${rootTex(n, A)} = ${b}$.`,
        `El numerador ${m} es la potencia: $${b}^{${m}} = ${b ** m}$.`,
        neg ? `Por el signo negativo se invierte: $${qt(value)}$.` : `Resultado: $${b ** m}$.`,
      ],
    };
  },
};

const simplificarRadical: ExerciseGen = {
  id: "simplificar-radical",
  title: "Simplificar un radical",
  level: 2,
  generate: (r) => {
    const cube = r.bool(0.35);
    let k: number, s: number, N: number;
    const idx = cube ? 3 : 2;
    do {
      k = cube ? r.int(2, 4) : r.int(2, 7);
      s = cube ? r.pick([2, 3, 4, 5, 6, 7, 9, 10]) : r.pick([2, 3, 5, 6, 7, 10, 11, 13, 14, 15]);
      N = k ** idx * s;
    } while (N > (cube ? 500 : 300));
    const answer = `${k}${rootTex(idx, s)}`;
    return {
      statement: `Simplifica $${rootTex(idx, N)}$.`,
      parts: [{ kind: "expr", answer, maxOps: 2, validate: radicalsSimplified, mistakes: [{ answer: `${k ** idx}${rootTex(idx, s)}`, feedback: `Al sacar $${k}^{${idx}}$ de la raíz sale su raíz, $${k}$, no $${k ** idx}$.` }] }],
      hints: [`Busca el mayor ${cube ? "cubo" : "cuadrado"} perfecto que divida a $${N}$.`, `$${N} = ${k ** idx} \\cdot ${s}$.`],
      solution: [
        `$${N} = ${k ** idx} \\cdot ${s}$ y $${k ** idx} = ${k}^{${idx}}$ es ${cube ? "un cubo" : "un cuadrado"} perfecto.`,
        `$${rootTex(idx, N)} = ${rootTex(idx, k ** idx)} \\cdot ${rootTex(idx, s)} = ${answer}$.`,
        `$${s}$ ya no tiene factores ${cube ? "cúbicos" : "cuadrados"}, así que no se puede simplificar más.`,
      ],
    };
  },
};

const sumaRadicales: ExerciseGen = {
  id: "suma-radicales",
  title: "Sumar radicales semejantes",
  level: 2,
  generate: (r) => {
    let terms: { m: number; k: number; sg: number }[], total: number, s: number;
    do {
      s = r.pick([2, 3, 5, 6, 7]);
      const n = r.int(2, 3);
      const ks = r.sample([1, 2, 3, 4, 5], n);
      terms = ks.map((k, i) => ({ k, m: r.pick([1, 1, 1, 2, 3]), sg: i === 0 ? 1 : r.sign() }));
      total = terms.reduce((t, x) => t + x.sg * x.m * x.k, 0);
    } while (total === 0 || terms.every((t) => t.k === 1) || terms.some((t) => t.k * t.k * s > 200));
    const tex = terms.map((t, i) => `${i === 0 ? "" : t.sg < 0 ? "- " : "+ "}${t.m === 1 ? "" : t.m}\\sqrt{${t.k * t.k * s}}`).join(" ");
    const answer = total === 1 ? `\\sqrt{${s}}` : total === -1 ? `-\\sqrt{${s}}` : `${total}\\sqrt{${s}}`;
    const mistakes: Mistake[] = [];
    const radSum = terms.reduce((t, x) => t + x.sg * x.k * x.k * s, 0);
    if (terms.every((t) => t.m === 1) && radSum > 0 && Math.abs(Math.sqrt(radSum) - total * Math.sqrt(s)) > 1e-6) {
      mistakes.push({ answer: `\\sqrt{${radSum}}`, feedback: "Las raíces no se suman juntando los radicandos. $\\sqrt{a} + \\sqrt{b} \\ne \\sqrt{a + b}$." });
    }
    return {
      statement: `Simplifica $${tex}$.`,
      parts: [{ kind: "expr", answer, maxOps: 2, validate: radicalsSimplified, mistakes }],
      hints: ["Simplifica cada raíz por separado.", `Todas deberían quedar como múltiplos de $\\sqrt{${s}}$. Después suma los coeficientes como términos semejantes.`],
      solution: [
        terms.map((t) => `$${t.m === 1 ? "" : t.m}\\sqrt{${t.k * t.k * s}} = ${t.m * t.k === 1 ? "" : t.m * t.k}\\sqrt{${s}}$`).join(", ") + ".",
        `Sumamos coeficientes: $${terms.map((t, i) => `${i === 0 ? "" : t.sg < 0 ? "- " : "+ "}${t.m * t.k}`).join(" ")} = ${total}$.`,
        `Resultado: $${answer}$.`,
      ],
    };
  },
};

const expFracVar: ExerciseGen = {
  id: "exponente-fraccionario-variable",
  title: "Raíces como exponentes fraccionarios",
  level: 2,
  generate: (r) => {
    const form = r.int(0, 2);
    const xr = (n: number, m: number) => rootTex(n, m === 1 ? "x" : `x^{${m}}`);
    if (form === 0) {
      let n1: number, m1: number, n2: number, m2: number;
      do {
        n1 = r.pick([2, 3, 4]);
        n2 = r.pick([2, 3, 4, 5]);
        m1 = r.int(1, n1 + 1);
        m2 = r.int(1, n2 - 1);
      } while (gcd(m1, n1) !== 1 || gcd(m2, n2) !== 1 || n1 === n2);
      const res = add(q(m1, n1), q(m2, n2));
      return {
        statement: `Escribe $${xr(n1, m1)} \\cdot ${xr(n2, m2)}$ como una sola potencia $x^{n}$ (con $x > 0$). ¿Cuánto vale $n$?`,
        parts: [fracPart(res, [[q(m1 * m2, n1 * n2), "Al multiplicar potencias de igual base los exponentes se suman."], [add(q(n1, m1), q(n2, m2)), "Invertiste los exponentes. El índice de la raíz va en el denominador."]], "n =")],
        hints: ["$\\sqrt[n]{x^{m}} = x^{\\frac{m}{n}}$: el índice va abajo y la potencia arriba.", "Luego suma las dos fracciones."],
        solution: [
          `$${xr(n1, m1)} = x^{${qt(q(m1, n1))}}$ y $${xr(n2, m2)} = x^{${qt(q(m2, n2))}}$.`,
          `Sumamos exponentes: $${qt(q(m1, n1))} + ${qt(q(m2, n2))} = ${qt(res)}$.`,
          `Resultado: $x^{${qt(res)}}$.`,
        ],
      };
    }
    if (form === 1) {
      let a: number, n: number, m: number;
      do {
        a = r.int(1, 4);
        n = r.pick([2, 3, 4, 5]);
        m = r.int(1, n + 2);
      } while (gcd(m, n) !== 1);
      const res = sub(q(a), q(m, n));
      return {
        statement: `Escribe $\\dfrac{${pw("x", a)}}{${xr(n, m)}}$ como una sola potencia $x^{n}$ (con $x > 0$). ¿Cuánto vale $n$?`,
        parts: [fracPart(res, [[add(q(a), q(m, n)), "Al dividir, el exponente de abajo se resta."], [sub(q(a), q(n, m)), "El índice de la raíz va en el denominador del exponente."]], "n =")],
        hints: ["Pasa la raíz a exponente fraccionario y resta los exponentes."],
        solution: [
          `$${xr(n, m)} = x^{${qt(q(m, n))}}$.`,
          `Restamos: $${a} - ${qt(q(m, n))} = ${qt(res)}$.`,
          `Resultado: $x^{${qt(res)}}$.`,
        ],
      };
    }
    const a = r.int(1, 3);
    const k = r.pick([2, 3]);
    const res = q(a * k + 1, 2 * k);
    return {
      statement: `Escribe $\\sqrt{${pw("x", a)}\\,${rootTex(k, "x")}}$ como una sola potencia $x^{n}$ (con $x > 0$). ¿Cuánto vale $n$?`,
      parts: [fracPart(res, [[add(q(a), q(1, k)), "Te faltó la raíz cuadrada de afuera, que divide todo el exponente entre 2."]], "n =")],
      hints: [`Adentro: $${pw("x", a)} \\cdot x^{\\frac{1}{${k}}}$. Suma esos exponentes.`, "La raíz cuadrada de afuera es elevar a $\\frac{1}{2}$, que multiplica el exponente por $\\frac{1}{2}$."],
      solution: [
        `Adentro: $${pw("x", a)} \\cdot x^{\\frac{1}{${k}}} = x^{${qt(add(q(a), q(1, k)))}}$.`,
        `La raíz cuadrada multiplica el exponente por $\\frac{1}{2}$: $${qt(add(q(a), q(1, k)))} \\cdot \\frac{1}{2} = ${qt(res)}$.`,
        `Resultado: $x^{${qt(res)}}$.`,
      ],
    };
  },
};

const combinada: ExerciseGen = {
  id: "combinada",
  title: "Operación combinada con potencias y raíces (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    let a: number, b: number;
    do {
      a = r.int(2, 6);
      b = r.int(2, 6);
    } while (a === b);
    const op = r.pick(["+", "-"] as const);
    const inv = op === "+" ? add(q(1, a), q(1, b)) : sub(q(1, a), q(1, b));
    const first = q(inv[1], inv[0]);
    const c = r.int(2, 40);
    const M = r.pick([8, 27, 64]);
    const mr = Math.round(Math.cbrt(M));
    const value = sub(add(first, q(1)), q(mr * mr));
    const tex = `\\left(${a}^{-1} ${op} ${b}^{-1}\\right)^{-1} + ${c}^{0} - ${M}^{\\frac{2}{3}}`;
    return {
      statement: `Calcula $${tex}$ y escribe el resultado como fracción irreducible.`,
      parts: [
        fracPart(value, [
          [sub(add(q(op === "+" ? a + b : a - b), q(1)), q(mr * mr)), "$\\left(a^{-1} + b^{-1}\\right)^{-1}$ no es $a + b$. El exponente $-1$ no se reparte en una suma: primero suma las fracciones y después invierte."],
          [sub(first, q(mr * mr)), `$${c}^{0} = 1$, no $0$.`],
          [sub(add(first, q(1)), q((M * 2) / 3)), `$${M}^{\\frac{2}{3}}$ no es $${M} \\cdot \\frac{2}{3}$. Es la raíz cúbica elevada al cuadrado.`],
        ]),
      ],
      hints: [
        `Dentro del paréntesis: $${a}^{-1} = \\frac{1}{${a}}$ y $${b}^{-1} = \\frac{1}{${b}}$. Opera esas fracciones y luego invierte el resultado.`,
        `$${M}^{\\frac{2}{3}} = \\left(\\sqrt[3]{${M}}\\right)^{2}$.`,
      ],
      solution: [
        `Paréntesis: $\\frac{1}{${a}} ${op} \\frac{1}{${b}} = ${qt(inv)}$. Elevado a $-1$ se invierte: $${qt(first)}$.`,
        `$${c}^{0} = 1$.`,
        `$${M}^{\\frac{2}{3}} = \\left(\\sqrt[3]{${M}}\\right)^{2} = ${mr}^{2} = ${mr * mr}$.`,
        `Total: $${qt(first)} + 1 - ${mr * mr} = ${qt(value)}$.`,
      ],
    };
  },
};

const radicalVariables: ExerciseGen = {
  id: "radical-variables",
  title: "Simplificar radicales con letras (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const cube = r.bool(0.4);
    const idx = cube ? 3 : 2;
    let k: number, s: number, e1: number, e2: number;
    do {
      k = cube ? r.int(2, 3) : r.int(2, 5);
      s = cube ? r.pick([1, 2, 3, 4, 5]) : r.pick([1, 2, 3, 5, 6, 7]);
      e1 = r.int(idx + 1, idx * 3 + 1);
      e2 = r.int(1, idx * 2 + 1);
    } while (e1 % idx === 0 && e2 % idx === 0 && s === 1);
    const C = k ** idx * s;
    const q1 = Math.floor(e1 / idx);
    const r1 = e1 % idx;
    const q2 = Math.floor(e2 / idx);
    const r2 = e2 % idx;
    const outside = `${k}${q1 ? pw("x", q1) : ""}${q2 ? pw("y", q2) : ""}`;
    const insideParts = `${s === 1 ? "" : s}${r1 ? pw("x", r1) : ""}${r2 ? pw("y", r2) : ""}`;
    const answer = insideParts ? `${outside}${rootTex(idx, insideParts)}` : outside;
    const radicand = `${C}${pw("x", e1)}${pw("y", e2)}`;
    const wrong = `${k ** idx}${q1 ? pw("x", q1) : ""}${q2 ? pw("y", q2) : ""}${insideParts ? rootTex(idx, insideParts) : ""}`;
    return {
      statement: `Simplifica $${rootTex(idx, radicand)}$, suponiendo $x > 0$ e $y > 0$.`,
      parts: [{ kind: "expr", answer, vars: ["x", "y"], domain: [0.5, 2.5], validate: radicalsSimplified, mistakes: [{ answer: wrong, feedback: `Del número sale $${k}$, la raíz de $${k ** idx}$, no $${k ** idx}$.` }] }],
      hints: [
        `Separa el número: $${C} = ${k ** idx} \\cdot ${s}$.`,
        `Para cada letra divide su exponente entre ${idx}. El cociente es lo que sale y el resto es lo que se queda adentro.`,
      ],
      solution: [
        `Número: $${C} = ${k}^{${idx}} \\cdot ${s}$, así que sale $${k}$${s === 1 ? "" : ` y queda $${s}$ adentro`}.`,
        `$${pw("x", e1)}$: $${e1} = ${idx} \\cdot ${q1} + ${r1}$, sale $${pw("x", q1)}$${r1 ? ` y queda $${pw("x", r1)}$` : ""}.`,
        `$${pw("y", e2)}$: $${e2} = ${idx} \\cdot ${q2} + ${r2}$, ${q2 ? `sale $${pw("y", q2)}$` : "no sale nada"}${r2 ? ` y queda $${pw("y", r2)}$` : ""}.`,
        `Resultado: $${answer}$.`,
      ],
    };
  },
};

const vfErrores: ExerciseGen = {
  id: "vf-errores",
  title: "Verdadero o falso con potencias y raíces (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const a = r.int(2, 5);
    const b = r.int(2, 5);
    const m = r.int(2, 4);
    const n = r.int(2, 4);
    const s = r.pick([2, 3, 5, 6, 7]);
    const claims: { tex: Rich; ok: boolean; why: Rich }[] = [
      { tex: `$(${a} + ${b})^{2} = ${a}^{2} + ${b}^{2}$`, ok: false, why: `$(${a} + ${b})^{2} = ${(a + b) ** 2}$, pero $${a}^{2} + ${b}^{2} = ${a * a + b * b}$. Falta el término doble: $(a + b)^{2} = a^{2} + 2ab + b^{2}$.` },
      { tex: `$\\sqrt{${a * a} + ${b * b}} = ${a} + ${b}$`, ok: false, why: `$\\sqrt{${a * a + b * b}} \\ne ${a + b}$, porque $${a + b}^{2} = ${(a + b) ** 2}$. La raíz no se reparte en una suma.` },
      { tex: `$${a}^{-${n}} = -${a ** n}$`, ok: false, why: `Un exponente negativo invierte: $${a}^{-${n}} = \\frac{1}{${a ** n}}$.` },
      { tex: `$x^{${m}} \\cdot x^{${n}} = x^{${m + n}}$`, ok: true, why: "Misma base multiplicando: los exponentes se suman." },
      { tex: `$\\left(x^{${m}}\\right)^{${n}} = x^{${m + n}}$`, ok: false, why: `En una potencia de potencia se multiplican: $\\left(x^{${m}}\\right)^{${n}} = x^{${m * n}}$.` },
      { tex: `$\\sqrt{${a * a} \\cdot ${s}} = ${a}\\sqrt{${s}}$`, ok: true, why: `La raíz de un producto es el producto de las raíces: $\\sqrt{${a * a}} \\cdot \\sqrt{${s}} = ${a}\\sqrt{${s}}$.` },
      { tex: `$${a + 5}^{0} = 0$`, ok: false, why: "Todo número distinto de cero elevado a la 0 da 1." },
      { tex: `$\\sqrt{(-${a})^{2}} = ${a}$`, ok: true, why: `$(-${a})^{2} = ${a * a}$ y $\\sqrt{${a * a}} = ${a}$. En general $\\sqrt{x^{2}} = |x|$.` },
      { tex: `$${a * a}^{\\frac{1}{2}} = \\frac{${a * a}}{2}$`, ok: false, why: `El exponente $\\frac{1}{2}$ es una raíz cuadrada: $${a * a}^{\\frac{1}{2}} = \\sqrt{${a * a}} = ${a}$.` },
      { tex: `$${a}^{${m}} + ${a}^{${n}} = ${a}^{${m + n}}$`, ok: false, why: `Los exponentes se suman al multiplicar, no al sumar. $${a}^{${m}} + ${a}^{${n}} = ${a ** m + a ** n}$ y $${a}^{${m + n}} = ${a ** (m + n)}$.` },
      { tex: `$\\dfrac{x^{${m + n}}}{x^{${n}}} = x^{${m}}$`, ok: true, why: "Misma base dividiendo: los exponentes se restan." },
      { tex: "$\\sqrt{-16} = -4$", ok: false, why: "$(-4)^{2} = 16$, no $-16$. Ningún número real al cuadrado da negativo, así que $\\sqrt{-16}$ no es un número real." },
    ];
    const c = r.pick(claims);
    return {
      statement: `¿Verdadero o falso? ${c.tex}`,
      parts: [trueFalse(c.ok, c.why)],
      hints: ["Prueba la igualdad con los números. Si los dos lados dan distinto, es falsa."],
      solution: [`${c.ok ? "Verdadero" : "Falso"}. ${c.why}`],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("potencias-raices"),
  objectives: [
    "Calcular potencias de números con signo y de fracciones.",
    "Aplicar las leyes de los exponentes, incluidos los exponentes cero, negativos y fraccionarios.",
    "Pasar de raíces a exponentes fraccionarios y al revés.",
    "Simplificar radicales y sumar radicales semejantes.",
    "Leer y escribir números en notación científica.",
  ],
  sections: [
    {
      id: "potencia",
      title: "Qué es una potencia",
      blocks: [
        {
          type: "text",
          md: "Escribir $2 \\cdot 2 \\cdot 2 \\cdot 2 \\cdot 2$ es largo. Para eso existe la potencia: $2^{5}$. El número de abajo, la **base**, es lo que se multiplica. El de arriba, el **exponente**, dice cuántas veces aparece la base como factor.",
        },
        {
          type: "definition",
          title: "Potencia de exponente natural",
          md: "$$a^{n} = \\underbrace{a \\cdot a \\cdots a}_{n \\text{ veces}}$$\n\n$3^{4} = 3 \\cdot 3 \\cdot 3 \\cdot 3 = 81$ y $10^{3} = 1000$. Las potencias de 10 son un 1 seguido de tantos ceros como diga el exponente.",
        },
        {
          type: "note",
          tone: "warning",
          title: "La potencia no es una multiplicación por el exponente",
          md: "$2^{3} = 2 \\cdot 2 \\cdot 2 = 8$, no $2 \\cdot 3 = 6$.",
        },
        {
          type: "table",
          headers: ["Base", "Exponente par", "Exponente impar"],
          rows: [
            ["Positiva", "$2^{4} = 16$", "$2^{3} = 8$"],
            ["Negativa", "$(-2)^{4} = 16$", "$(-2)^{3} = -8$"],
          ],
          caption: "Una base negativa con exponente par da positivo, porque los negativos se cancelan de dos en dos. Con exponente impar sobra uno y el resultado es negativo.",
        },
        {
          type: "note",
          tone: "warning",
          title: "El paréntesis cambia todo",
          md: "$(-3)^{2} = 9$ porque la base es $-3$. En $-3^{2}$ la base es solo el 3: $-3^{2} = -9$.",
        },
        {
          type: "example",
          title: "Potencias de fracciones",
          problem: "Calcula $\\left(\\dfrac{2}{3}\\right)^{3}$ y $\\left(-\\dfrac{1}{2}\\right)^{4}$.",
          steps: [
            "El exponente afecta al numerador y al denominador: $\\left(\\dfrac{2}{3}\\right)^{3} = \\dfrac{2^{3}}{3^{3}} = \\dfrac{8}{27}$.",
            "Base negativa con exponente par da positivo: $\\left(-\\dfrac{1}{2}\\right)^{4} = \\dfrac{1}{16}$.",
          ],
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $(-2)^{5}$.",
            parts: [{ kind: "expr", answer: "-32", maxOps: 0, mistakes: [{ answer: "32", feedback: "Exponente impar con base negativa da negativo." }, { answer: "-10", feedback: "La potencia no es multiplicar por el exponente." }] }],
            solution: ["$(-2)^{5} = (-2)(-2)(-2)(-2)(-2) = -32$. Cinco factores negativos dan negativo."],
          },
        },
      ],
    },
    {
      id: "leyes",
      title: "Las leyes de los exponentes",
      blocks: [
        {
          type: "text",
          md: "Las leyes de los exponentes no hay que memorizarlas a ciegas. Todas salen de contar factores. Por ejemplo, $a^{3} \\cdot a^{2} = (a \\cdot a \\cdot a)(a \\cdot a) = a^{5}$: hay $3 + 2$ factores.",
        },
        {
          type: "table",
          headers: ["Ley", "Fórmula", "Ejemplo"],
          rows: [
            ["Producto de igual base", "$a^{m} \\cdot a^{n} = a^{m+n}$", "$x^{3} \\cdot x^{4} = x^{7}$"],
            ["Cociente de igual base", "$\\dfrac{a^{m}}{a^{n}} = a^{m-n}$", "$\\dfrac{x^{7}}{x^{2}} = x^{5}$"],
            ["Potencia de una potencia", "$\\left(a^{m}\\right)^{n} = a^{m \\cdot n}$", "$\\left(x^{2}\\right)^{3} = x^{6}$"],
            ["Potencia de un producto", "$(ab)^{n} = a^{n} b^{n}$", "$(2x)^{3} = 8x^{3}$"],
            ["Potencia de un cociente", "$\\left(\\dfrac{a}{b}\\right)^{n} = \\dfrac{a^{n}}{b^{n}}$", "$\\left(\\dfrac{x}{3}\\right)^{2} = \\dfrac{x^{2}}{9}$"],
          ],
        },
        {
          type: "example",
          title: "Combinar varias leyes",
          problem: "Simplifica $\\dfrac{\\left(2x^{3}y\\right)^{2} \\cdot x}{4x^{5}y^{2}}$.",
          steps: [
            "Potencia de un producto: $\\left(2x^{3}y\\right)^{2} = 2^{2}\\left(x^{3}\\right)^{2}y^{2} = 4x^{6}y^{2}$.",
            "Arriba queda $4x^{6}y^{2} \\cdot x = 4x^{7}y^{2}$.",
            "Dividimos: los 4 se cancelan, $x^{7-5} = x^{2}$ y $y^{2-2} = y^{0} = 1$.",
          ],
          answer: "$x^{2}$",
        },
        {
          type: "note",
          tone: "warning",
          title: "Lo que las leyes no dicen",
          md: "- $(a + b)^{2} \\ne a^{2} + b^{2}$. Prueba con $a = 1$, $b = 2$: $9 \\ne 5$.\n- $x^{2} \\cdot x^{3} = x^{5}$, no $x^{6}$.\n- $x^{2} + x^{3}$ no se puede juntar en una sola potencia.\n- Las leyes de producto y cociente piden la **misma base**: $2^{3} \\cdot 3^{2}$ no se simplifica así.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Escribe $\\dfrac{x^{4} \\cdot x^{6}}{x^{3}}$ como $x^{n}$. ¿Cuánto vale $n$?",
            parts: [{ kind: "expr", before: "n =", answer: "7", maxOps: 0, mistakes: [{ answer: "21", feedback: "Arriba los exponentes se suman, no se multiplican." }, { answer: "13", feedback: "El exponente de abajo se resta." }] }],
            solution: ["Arriba: $4 + 6 = 10$. Al dividir: $10 - 3 = 7$."],
          },
        },
      ],
    },
    {
      id: "cero-negativos",
      title: "Exponente cero y exponentes negativos",
      blocks: [
        {
          type: "text",
          md: "¿Qué puede significar $2^{0}$ o $2^{-3}$, si no se puede multiplicar el 2 \"cero veces\" o \"menos tres veces\"? Mira la tabla. Cada vez que el exponente baja 1, el resultado se divide entre 2. Si se sigue el patrón, aparecen solos los valores.",
        },
        {
          type: "table",
          headers: ["Potencia", "$2^{3}$", "$2^{2}$", "$2^{1}$", "$2^{0}$", "$2^{-1}$", "$2^{-2}$", "$2^{-3}$"],
          rows: [["Valor", "$8$", "$4$", "$2$", "$1$", "$\\frac{1}{2}$", "$\\frac{1}{4}$", "$\\frac{1}{8}$"]],
          caption: "Dividiendo entre 2 en cada paso: $2^{0} = 1$ y $2^{-n} = \\frac{1}{2^{n}}$.",
        },
        {
          type: "definition",
          title: "Exponente cero y negativo",
          md: "Para $a \\ne 0$:\n\n$$a^{0} = 1 \\qquad a^{-n} = \\frac{1}{a^{n}} \\qquad \\left(\\frac{a}{b}\\right)^{-n} = \\left(\\frac{b}{a}\\right)^{n}$$\n\nLa ley del cociente lo confirma: $\\dfrac{a^{3}}{a^{3}} = 1$ y también $\\dfrac{a^{3}}{a^{3}} = a^{3-3} = a^{0}$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Exponente negativo no es número negativo",
          md: "$2^{-3} = \\frac{1}{8}$, que es positivo. El signo menos del exponente invierte la base, no le cambia el signo.",
        },
        {
          type: "note",
          tone: "tip",
          title: "Cambiar de piso",
          md: "Un factor con exponente negativo puede pasar al otro piso de la fracción cambiando el signo del exponente: $\\dfrac{x^{-2}}{y^{-3}} = \\dfrac{y^{3}}{x^{2}}$. Esto solo vale para factores, no para sumandos.",
        },
        {
          type: "example",
          title: "Calcular con exponentes negativos",
          problem: "Calcula $\\left(\\dfrac{2}{3}\\right)^{-2}$ y $3^{-1} + 2^{-2}$.",
          steps: [
            "Invertimos la fracción: $\\left(\\dfrac{2}{3}\\right)^{-2} = \\left(\\dfrac{3}{2}\\right)^{2} = \\dfrac{9}{4}$.",
            "$3^{-1} = \\frac{1}{3}$ y $2^{-2} = \\frac{1}{4}$. Sumamos: $\\frac{4}{12} + \\frac{3}{12} = \\frac{7}{12}$.",
          ],
        },
        {
          type: "note",
          tone: "econ",
          title: "Valor presente",
          md: "Si un banco paga un interés $i$ por año, una cantidad $VF$ que recibirás dentro de $n$ años vale hoy\n\n$$VP = VF \\cdot (1 + i)^{-n}$$\n\nCon datos de ejemplo, 1000 bolívares dentro de 2 años al 10 % anual valen hoy $1000 \\cdot 1{,}1^{-2} = \\frac{1000}{1{,}21} \\approx 826{,}45$. El exponente negativo es el que \"trae al presente\".",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $4^{-2}$.",
            parts: [{ kind: "expr", answer: "\\frac{1}{16}", maxOps: 1, validate: irreducible, mistakes: [{ answer: "-16", feedback: "El exponente negativo invierte, no cambia el signo." }, { answer: "-8", feedback: "La potencia no es multiplicar por el exponente." }] }],
            solution: ["$4^{-2} = \\dfrac{1}{4^{2}} = \\dfrac{1}{16}$."],
          },
        },
      ],
    },
    {
      id: "raices",
      title: "Raíces",
      blocks: [
        {
          type: "text",
          md: "La raíz deshace la potencia. $\\sqrt{9} = 3$ porque $3^{2} = 9$. $\\sqrt[3]{8} = 2$ porque $2^{3} = 8$. El número pequeño de la raíz es el **índice** y el de adentro es el **radicando**. Si no se escribe índice, es 2.",
        },
        {
          type: "definition",
          title: "Raíz n-ésima",
          md: "$$\\sqrt[n]{a} = b \\quad \\text{significa} \\quad b^{n} = a$$\n\nCon índice par se pide además que $a \\ge 0$ y $b \\ge 0$.",
        },
        {
          type: "text",
          md: "- **Índice par y radicando negativo:** no hay raíz real. $\\sqrt{-4}$ no existe en $\\mathbb{R}$, porque ningún número al cuadrado da negativo.\n- **Índice impar:** siempre existe. $\\sqrt[3]{-8} = -2$ porque $(-2)^{3} = -8$.\n- **La raíz cuadrada es la positiva:** $\\sqrt{9} = 3$, no $\\pm 3$. Por eso $\\sqrt{x^{2}} = |x|$.",
        },
        {
          type: "table",
          headers: ["$n$", "$1$", "$2$", "$3$", "$4$", "$5$", "$6$", "$7$", "$8$", "$9$", "$10$"],
          rows: [
            ["$n^{2}$", "$1$", "$4$", "$9$", "$16$", "$25$", "$36$", "$49$", "$64$", "$81$", "$100$"],
            ["$n^{3}$", "$1$", "$8$", "$27$", "$64$", "$125$", "$216$", "$343$", "$512$", "$729$", "$1000$"],
          ],
          caption: "Cuadrados y cubos que conviene reconocer a simple vista.",
        },
        {
          type: "note",
          tone: "warning",
          title: "La raíz no se reparte en una suma",
          md: "$\\sqrt{9 + 16} = \\sqrt{25} = 5$, pero $\\sqrt{9} + \\sqrt{16} = 7$. En cambio sí se reparte en un producto: $\\sqrt{4 \\cdot 9} = \\sqrt{4} \\cdot \\sqrt{9} = 6$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $\\sqrt[3]{-125}$.",
            parts: [{ kind: "expr", answer: "-5", maxOps: 0, mistakes: [{ answer: "5", feedback: "La raíz cúbica de un negativo es negativa." }] }],
            solution: ["$(-5)^{3} = -125$, así que $\\sqrt[3]{-125} = -5$."],
          },
        },
      ],
    },
    {
      id: "exponentes-fraccionarios",
      title: "Exponentes fraccionarios",
      blocks: [
        {
          type: "text",
          md: "¿Qué debería ser $9^{\\frac{1}{2}}$? Si las leyes siguen valiendo, $\\left(9^{\\frac{1}{2}}\\right)^{2} = 9^{\\frac{1}{2} \\cdot 2} = 9^{1} = 9$. Entonces $9^{\\frac{1}{2}}$ es un número que al cuadrado da 9: es $\\sqrt{9} = 3$. Un exponente fraccionario es otra forma de escribir una raíz.",
        },
        {
          type: "definition",
          title: "Exponente fraccionario",
          md: "$$a^{\\frac{1}{n}} = \\sqrt[n]{a} \\qquad a^{\\frac{m}{n}} = \\sqrt[n]{a^{m}} = \\left(\\sqrt[n]{a}\\right)^{m}$$\n\nEl denominador es el índice de la raíz y el numerador es la potencia.",
        },
        {
          type: "example",
          title: "Calcular exponentes fraccionarios",
          problem: "Calcula $8^{\\frac{2}{3}}$, $27^{-\\frac{1}{3}}$ y $16^{\\frac{3}{4}}$.",
          steps: [
            "$8^{\\frac{2}{3}} = \\left(\\sqrt[3]{8}\\right)^{2} = 2^{2} = 4$.",
            "$27^{-\\frac{1}{3}} = \\dfrac{1}{27^{\\frac{1}{3}}} = \\dfrac{1}{3}$.",
            "$16^{\\frac{3}{4}} = \\left(\\sqrt[4]{16}\\right)^{3} = 2^{3} = 8$.",
          ],
        },
        {
          type: "note",
          tone: "tip",
          title: "Primero la raíz",
          md: "En $a^{\\frac{m}{n}}$ conviene sacar primero la raíz y después elevar. Los números quedan más pequeños: $\\left(\\sqrt[3]{8}\\right)^{2} = 4$ es más cómodo que $\\sqrt[3]{64}$.",
        },
        {
          type: "text",
          md: "Como las leyes de los exponentes siguen valiendo, sirven para multiplicar raíces de distinto índice: $\\sqrt{x} \\cdot \\sqrt[3]{x} = x^{\\frac{1}{2}} \\cdot x^{\\frac{1}{3}} = x^{\\frac{5}{6}} = \\sqrt[6]{x^{5}}$.",
        },
        {
          type: "widget",
          widget: {
            kind: "sliders",
            fn: "x^{n}",
            params: [{ name: "n", min: -2, max: 3, step: 0.25, value: 0.5, label: "exponente n" }],
            x: [0, 4],
            y: [0, 6],
            formula: "f(x) = x^{{n}}",
            reference: [{ fn: "x", color: "muted", dashed: true }],
          },
          caption: "Con $n = 0{,}5$ ves la raíz cuadrada. Si $0 < n < 1$ la curva crece cada vez más despacio, si $n > 1$ cada vez más rápido, y si $n < 0$ baja. La recta punteada es $n = 1$.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Funciones de producción",
          md: "En economía es común la función de Cobb-Douglas $Q = A K^{\\frac{1}{2}} L^{\\frac{1}{2}}$, donde $K$ es el capital y $L$ el trabajo. Los exponentes fraccionarios dicen que duplicar solo el trabajo no duplica la producción: hay rendimientos decrecientes.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $16^{\\frac{3}{4}}$.",
            parts: [{ kind: "expr", answer: "8", maxOps: 0, mistakes: [{ answer: "12", feedback: "El exponente no se multiplica por la base." }] }],
            solution: ["$\\sqrt[4]{16} = 2$ y $2^{3} = 8$."],
          },
        },
      ],
    },
    {
      id: "radicales",
      title: "Simplificar radicales",
      blocks: [
        {
          type: "definition",
          title: "Propiedades de los radicales",
          md: "Para $a, b \\ge 0$:\n\n$$\\sqrt[n]{a \\cdot b} = \\sqrt[n]{a} \\cdot \\sqrt[n]{b} \\qquad \\sqrt[n]{\\frac{a}{b}} = \\frac{\\sqrt[n]{a}}{\\sqrt[n]{b}}$$",
        },
        {
          type: "text",
          md: "Simplificar un radical es sacar de la raíz todo lo que se pueda. Con raíz cuadrada, se busca el mayor cuadrado perfecto que divida al radicando. Con raíz cúbica, el mayor cubo.",
        },
        {
          type: "example",
          title: "Sacar factores de una raíz",
          problem: "Simplifica $\\sqrt{72}$ y $\\sqrt[3]{54}$.",
          steps: [
            "$72 = 36 \\cdot 2$ y $36$ es un cuadrado. $\\sqrt{72} = \\sqrt{36} \\cdot \\sqrt{2} = 6\\sqrt{2}$.",
            "Con factores primos: $72 = 2^{3} \\cdot 3^{2} = 2^{2} \\cdot 3^{2} \\cdot 2$. Sale un 2 y un 3, y queda un 2 adentro: $2 \\cdot 3\\sqrt{2} = 6\\sqrt{2}$.",
            "$54 = 27 \\cdot 2$ y $27 = 3^{3}$. $\\sqrt[3]{54} = 3\\sqrt[3]{2}$.",
          ],
        },
        {
          type: "text",
          md: "Los **radicales semejantes** tienen el mismo índice y el mismo radicando. Se suman como términos semejantes: $3\\sqrt{2} + 5\\sqrt{2} = 8\\sqrt{2}$. A veces hay que simplificar primero para descubrir que son semejantes: $\\sqrt{50} + \\sqrt{18} = 5\\sqrt{2} + 3\\sqrt{2} = 8\\sqrt{2}$. En cambio $\\sqrt{2} + \\sqrt{3}$ no se puede simplificar.",
        },
        {
          type: "example",
          title: "Radicales con letras",
          problem: "Simplifica $\\sqrt{12x^{5}}$ con $x \\ge 0$.",
          steps: [
            "Número: $12 = 4 \\cdot 3$, sale un 2 y queda un 3.",
            "Letra: divide el exponente entre el índice. $5 = 2 \\cdot 2 + 1$: sale $x^{2}$ y queda $x$.",
            "Resultado: $2x^{2}\\sqrt{3x}$.",
          ],
        },
        {
          type: "note",
          tone: "tip",
          title: "Racionalizar, en una línea",
          md: "Si queda una raíz en el denominador, se multiplica arriba y abajo por esa raíz: $\\dfrac{1}{\\sqrt{2}} = \\dfrac{\\sqrt{2}}{\\sqrt{2}\\sqrt{2}} = \\dfrac{\\sqrt{2}}{2}$. Lo verás completo en **Fracciones algebraicas**.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Error clásico",
          md: "$\\sqrt{x^{2} + 9} \\ne x + 3$. La raíz no se reparte en sumas. Compruébalo con $x = 4$: $\\sqrt{25} = 5$, pero $4 + 3 = 7$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Simplifica $\\sqrt{75}$.",
            parts: [{ kind: "expr", answer: "5\\sqrt{3}", maxOps: 2, validate: radicalsSimplified, mistakes: [{ answer: "25\\sqrt{3}", feedback: "Del 25 sale su raíz, 5." }] }],
            solution: ["$75 = 25 \\cdot 3$. $\\sqrt{75} = \\sqrt{25}\\sqrt{3} = 5\\sqrt{3}$."],
          },
        },
      ],
    },
    {
      id: "notacion-cientifica",
      title: "Notación científica",
      blocks: [
        {
          type: "text",
          md: "Los números muy grandes o muy pequeños se leen mejor con potencias de 10. En lugar de $4\\,750\\,000$ se escribe $4{,}75 \\times 10^{6}$, y en lugar de $0{,}00032$ se escribe $3{,}2 \\times 10^{-4}$.",
        },
        {
          type: "definition",
          title: "Notación científica",
          md: "Un número está en notación científica si se escribe como\n\n$$a \\times 10^{n} \\qquad \\text{con } 1 \\le a < 10 \\text{ y } n \\text{ entero}$$\n\nEl exponente cuenta cuántos lugares se movió la coma. Si el número es grande, $n$ es positivo. Si es menor que 1, $n$ es negativo.",
        },
        {
          type: "example",
          title: "Multiplicar en notación científica",
          problem: "Calcula $\\left(3 \\times 10^{5}\\right)\\left(4 \\times 10^{-2}\\right)$.",
          steps: [
            "Multiplica los números: $3 \\cdot 4 = 12$.",
            "Multiplica las potencias sumando exponentes: $10^{5} \\cdot 10^{-2} = 10^{3}$.",
            "$12 \\times 10^{3}$ no cumple $a < 10$. Se ajusta: $12 = 1{,}2 \\times 10$, así que queda $1{,}2 \\times 10^{4}$.",
          ],
          answer: "$1{,}2 \\times 10^{4}$",
        },
        {
          type: "note",
          tone: "econ",
          title: "Cifras macroeconómicas",
          md: "Un presupuesto de $25\\,000\\,000\\,000$ dólares (cifra de ejemplo) se escribe $2{,}5 \\times 10^{10}$. Así se comparan magnitudes de un vistazo: $10^{10}$ es diez mil veces $10^{6}$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Si escribes $0{,}0006$ como $6 \\times 10^{n}$, ¿cuánto vale $n$?",
            parts: [{ kind: "expr", before: "n =", answer: "-4", maxOps: 0, mistakes: [{ answer: "4", feedback: "Un número menor que 1 lleva exponente negativo." }, { answer: "-3", feedback: "Cuenta otra vez los lugares que se mueve la coma hasta pasar el 6." }] }],
            solution: ["La coma se mueve 4 lugares a la derecha para llegar a 6, así que $0{,}0006 = 6 \\times 10^{-4}$."],
          },
        },
      ],
    },
  ],
  exercises: [
    potenciaNumerica,
    ceroNegativo,
    raizExacta,
    leyesExponente,
    notacionCientifica,
    simplificarMonomio,
    expFracNum,
    simplificarRadical,
    sumaRadicales,
    expFracVar,
    combinada,
    radicalVariables,
    vfErrores,
  ],
};

export default topic;
