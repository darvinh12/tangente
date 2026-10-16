import { meta } from "../catalog";
import { choice, trueFalse, uniqueWrong } from "../helpers";
import type { ExerciseGen, Mistake, Part, Rich, Topic } from "../types";
import { fmt, frac, num, paren } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

type Op = "+" | "-";

/** Cadena de sumas y restas: el primer número va tal cual y los demás con su operador y paréntesis si son negativos. */
function chain(nums: number[], ops: Op[]): string {
  return nums.map((n, i) => (i === 0 ? String(n) : `${ops[i - 1]} ${paren(n)}`)).join(" ");
}

/** Suma de enteros con los signos ya simplificados: [-7, 4, 5, -9] -> "-7 + 4 + 5 - 9" */
function signsTex(ns: number[]): string {
  return ns.map((n, i) => (i === 0 ? String(n) : n < 0 ? `- ${-n}` : `+ ${n}`)).join(" ");
}

/** Errores típicos numéricos sin repetir y distintos de la respuesta. */
function mistakesFor(answer: number, list: [number, Rich][]): Mistake[] {
  const key = (v: number) => v.toFixed(9);
  const seen = new Set<string>([key(answer)]);
  const out: Mistake[] = [];
  for (const [v, fb] of list) {
    if (!Number.isFinite(v) || seen.has(key(v))) continue;
    seen.add(key(v));
    out.push({ answer: fmt(v), feedback: fb });
  }
  return out;
}

/** Parte de respuesta numérica que exige un solo número (no acepta la cuenta copiada). */
function numPart(answer: number, mistakes: [number, Rich][] = [], before?: string): Part {
  return { kind: "expr", answer: fmt(answer), maxOps: 0, before, mistakes: mistakesFor(answer, mistakes) };
}

const abs = (x: number) => Math.abs(x);

/* ----------------------------------- ejercicios ----------------------------------- */

type Kind = "N" | "Z" | "Q" | "I";
const RANK: Record<Kind, number> = { N: 0, Z: 1, Q: 2, I: 3 };
const LABEL: Record<Kind, string> = {
  N: "Naturales, $\\mathbb{N}$",
  Z: "Enteros, $\\mathbb{Z}$",
  Q: "Racionales, $\\mathbb{Q}$",
  I: "Irracionales, $\\mathbb{I}$",
};

const clasificar: ExerciseGen = {
  id: "clasificar",
  title: "¿En qué conjunto numérico está?",
  level: 1,
  generate: (r) => {
    const n = r.int(2, 9);
    const odd = r.pick([1, 3, 5, 7]);
    const nonSquare = r.pick([2, 3, 5, 6, 7, 10, 11, 15]);
    const pool: { tex: string; kind: Kind; why: string }[] = [
      { tex: String(r.int(1, 40)), kind: "N", why: "es un número de contar, positivo y sin parte decimal" },
      { tex: "0", kind: "Z", why: "el cero no es natural en este curso, pero sí es entero" },
      { tex: String(-r.int(1, 25)), kind: "Z", why: "es un entero negativo" },
      { tex: `\\sqrt{${n * n}}`, kind: "N", why: `la raíz es exacta: $\\sqrt{${n * n}} = ${n}$, que es natural` },
      { tex: `\\frac{${3 * n}}{3}`, kind: "N", why: `la división es exacta: $\\frac{${3 * n}}{3} = ${n}$, que es natural` },
      { tex: `-\\frac{${2 * n}}{2}`, kind: "Z", why: `la división es exacta: vale $-${n}$, un entero negativo` },
      { tex: frac(odd * r.sign(), r.pick([2, 4])), kind: "Q", why: "es una fracción que no da un entero" },
      { tex: `${r.int(0, 9)}{,}${r.int(1, 9)}${r.int(1, 9)}`, kind: "Q", why: "es un decimal finito, y todo decimal finito se escribe como fracción" },
      { tex: `0{,}\\overline{${r.int(1, 8)}}`, kind: "Q", why: "es un decimal periódico, y todo periódico se escribe como fracción" },
      { tex: `\\sqrt{${nonSquare}}`, kind: "I", why: `$${nonSquare}$ no es un cuadrado perfecto, así que su raíz tiene infinitos decimales sin patrón` },
      { tex: r.pick(["\\pi", "-\\sqrt{2}", "2\\pi"]), kind: "I", why: "tiene infinitos decimales que no se repiten en bloque" },
    ];
    const x = r.pick(pool);
    const feedback = (k: Kind): Rich => {
      if (x.kind === "I") return "Ese conjunto solo tiene números que se escriben como fracción de enteros, y este no se puede escribir así.";
      if (k === "I") return "Este número sí se puede escribir como fracción de enteros, así que no es irracional.";
      if (RANK[k] > RANK[x.kind]) return "El número sí está en ese conjunto, pero hay uno más pequeño que también lo contiene.";
      return `No está en ese conjunto: ${x.why}.`;
    };
    const NAME: Record<Kind, string> = { N: "naturales", Z: "enteros", Q: "racionales", I: "irracionales" };
    const kinds: Kind[] = ["N", "Z", "Q", "I"];
    return {
      statement: `¿Cuál es el conjunto numérico más pequeño que contiene a $${x.tex}$?`,
      parts: [choice(LABEL[x.kind], kinds.filter((k) => k !== x.kind).map((k) => [LABEL[k], feedback(k)] as [Rich, Rich]))],
      hints: [
        "Recuerda la cadena $\\mathbb{N} \\subset \\mathbb{Z} \\subset \\mathbb{Q}$. Los irracionales $\\mathbb{I}$ van aparte.",
        "Si el número tiene una raíz o una fracción, primero mira si la cuenta da exacta.",
      ],
      solution: [`Para $${x.tex}$: ${x.why}.`, `El conjunto más pequeño que lo contiene es el de los ${NAME[x.kind]}.`],
    };
  },
};

const comparar: ExerciseGen = {
  id: "comparar",
  title: "Ordenar de menor a mayor",
  level: 1,
  generate: (r) => {
    const make = (): { v: number; tex: string } => {
      const k = r.int(0, 2);
      if (k === 0) {
        const v = r.int(-9, 9);
        return { v, tex: String(v) };
      }
      if (k === 1) {
        const p = r.pick([1, 3, 5, 7, 9, 11]) * r.sign();
        return { v: p / 2, tex: frac(p, 2) };
      }
      const v = r.sign() * (r.int(0, 8) + r.pick([0.25, 0.5, 0.75]));
      return { v, tex: num(v) };
    };
    let xs: { v: number; tex: string }[];
    do {
      xs = [make(), make(), make()];
    } while (
      new Set(xs.map((x) => abs(x.v))).size < 3 ||
      xs.filter((x) => x.v < 0).length < 2
    );
    const asc = [...xs].sort((a, b) => a.v - b.v);
    const desc = [...asc].reverse();
    const byAbs = [...xs].sort((a, b) => abs(a.v) - abs(b.v));
    const show = (l: { tex: string }[]) => `$${l.map((x) => x.tex).join(", \\; ")}$`;
    const correct = show(asc);
    const wrong = uniqueWrong(correct, [
      [show(byAbs), "Ordenaste por tamaño sin mirar el signo. Entre negativos, el que está más lejos del cero es el menor."],
      [show(desc), "Ese orden va de mayor a menor. Se pedía de menor a mayor."],
      [show([asc[1], asc[0], asc[2]]), "Revisa los dos primeros. En la recta, el menor es el que queda más a la izquierda."],
      [show([asc[0], asc[2], asc[1]]), "Revisa los dos últimos. El mayor es el que queda más a la derecha."],
    ] as [Rich, Rich][]);
    return {
      statement: `Ordena de menor a mayor los números $${xs.map((x) => x.tex).join(", \\; ")}$.`,
      parts: [choice(correct, wrong.slice(0, 3))],
      hints: [
        "Ubica cada número en la recta real. El menor es el que queda más a la izquierda.",
        "Si te cuesta comparar una fracción con un decimal, pasa la fracción a decimal.",
      ],
      solution: [
        `En decimal los números son $${xs.map((x) => num(x.v)).join(", \\; ")}$.`,
        "Los negativos van primero, y entre ellos el más alejado del cero es el menor.",
        `Orden: $${asc.map((x) => x.tex).join(" < ")}$.`,
      ],
    };
  },
};

const sumaResta: ExerciseGen = {
  id: "suma-resta",
  title: "Sumas y restas con signos",
  level: 1,
  generate: (r) => {
    const k = r.int(4, 5);
    const nums = Array.from({ length: k }, () => r.nz(-12, 12));
    const ops: Op[] = nums.slice(1).map(() => r.pick(["+", "-"] as const));
    // Siempre al menos una resta de un negativo, que es donde está el error típico
    const i = r.int(1, k - 1);
    ops[i - 1] = "-";
    nums[i] = -r.int(2, 9);
    const eff = nums.map((n, j) => (j > 0 && ops[j - 1] === "-" ? -n : n));
    const value = eff.reduce((a, b) => a + b, 0);
    const wrongEff = nums.map((n, j) => (j > 0 && ops[j - 1] === "-" ? -abs(n) : n));
    const wrong = wrongEff.reduce((a, b) => a + b, 0);
    const pos = eff.filter((x) => x > 0);
    const neg = eff.filter((x) => x < 0);
    const P = pos.reduce((a, b) => a + b, 0);
    const N = neg.reduce((a, b) => a + b, 0);
    return {
      statement: `Calcula $${chain(nums, ops)}$.`,
      parts: [numPart(value, [[wrong, "Restar un negativo es sumar: $-(-a) = +a$. Revisa los signos de los paréntesis."], [-value, "El tamaño está bien pero el signo no. Gana el signo del grupo más grande."]])],
      hints: [
        "Primero quita los paréntesis: restar un negativo es sumar, y sumar un negativo es restar.",
        "Junta por un lado todo lo positivo y por otro todo lo negativo.",
      ],
      solution: [
        `Quitamos los paréntesis cambiando cada resta de un negativo por una suma: $${signsTex(eff)}$.`,
        `Positivos: $${pos.length > 1 ? `${pos.join(" + ")} = ` : ""}${P}$. Negativos: $${neg.length > 1 ? `${signsTex(neg)} = ` : ""}${N}$.`,
        `Resultado: $${P} ${N < 0 ? `- ${-N}` : `+ ${N}`} = ${value}$.`,
      ],
    };
  },
};

const multDiv: ExerciseGen = {
  id: "multiplicacion-division",
  title: "Multiplicar y dividir con la ley de los signos",
  level: 1,
  generate: (r) => {
    const form = r.int(0, 1);
    let tex: string, value: number, negs: number, detail: string;
    if (form === 0) {
      const f = [r.nz(-6, 6, [1, -1]), r.nz(-6, 6, [1, -1]), r.nz(-5, 5, [1, -1])];
      if (f.every((x) => x > 0)) f[r.int(0, 2)] *= -1;
      tex = f.map((x, i) => (i === 0 ? String(x) : paren(x))).join(" \\cdot ");
      value = f[0] * f[1] * f[2];
      negs = f.filter((x) => x < 0).length;
      detail = `Los tamaños se multiplican: $${f.map(abs).join(" \\cdot ")} = ${abs(value)}$.`;
    } else {
      const c = r.nz(-6, 6, [1, -1]);
      const a = r.nz(-9, 9, [1, -1, 0]);
      const k = r.nz(-4, 4, [1, -1]);
      const b = c * k;
      // (a · b) ÷ c con división exacta
      tex = `(${a} \\cdot ${paren(b)}) \\div ${paren(c)}`;
      value = (a * b) / c;
      negs = [a, b, c].filter((x) => x < 0).length;
      detail = `Primero el paréntesis: $${a} \\cdot ${paren(b)} = ${a * b}$. Después $${a * b} \\div ${paren(c)} = ${value}$, y en tamaños $${abs(a * b)} \\div ${abs(c)} = ${abs(value)}$.`;
    }
    return {
      statement: `Calcula $${tex}$.`,
      parts: [numPart(value, [[-value, "El tamaño está bien, revisa el signo. Cuenta cuántos factores negativos hay."]])],
      hints: ["Cuenta los signos negativos. Si son una cantidad par, el resultado es positivo. Si son impar, es negativo."],
      solution: [
        `Hay ${negs} ${negs === 1 ? "factor negativo" : "factores negativos"}, ${negs % 2 === 0 ? "una cantidad par, así que el resultado es positivo" : "una cantidad impar, así que el resultado es negativo"}.`,
        detail,
        `Resultado: $${value}$.`,
      ],
    };
  },
};

const valorAbsoluto: ExerciseGen = {
  id: "valor-absoluto",
  title: "Calcular con valor absoluto",
  level: 1,
  generate: (r) => {
    const form = r.int(0, 2);
    const A = (x: string) => `\\left|${x}\\right|`;
    if (form === 0) {
      const a = -r.int(2, 15);
      const b = r.nz(-12, 12);
      const value = abs(a) - abs(b);
      return {
        statement: `Calcula $${A(String(a))} - ${A(String(b))}$.`,
        parts: [numPart(value, [[a - abs(b), `$${A(String(a))}$ no es $${a}$. El valor absoluto es una distancia, siempre da positivo o cero.`], [a - b, "Quitaste las barras sin calcular el valor absoluto. Las barras convierten cualquier número en su tamaño."]])],
        hints: ["El valor absoluto de un número es su distancia al cero. Nunca es negativo."],
        solution: [`$${A(String(a))} = ${abs(a)}$ y $${A(String(b))} = ${abs(b)}$.`, `Entonces $${abs(a)} - ${abs(b)} = ${value}$.`],
      };
    }
    if (form === 1) {
      const a = r.nz(-9, 9);
      const b = -Math.sign(a) * r.int(2, 9);
      const inside = a - b;
      const value = abs(inside);
      return {
        statement: `Calcula $${A(`${a} - ${paren(b)}`)}$.`,
        parts: [numPart(value, [[abs(a) - abs(b), "No se puede repartir el valor absoluto en una resta. Primero se calcula lo de adentro."], [inside, "Te faltó aplicar el valor absoluto al final. El resultado no puede ser negativo."]])],
        hints: ["Las barras funcionan como un paréntesis: primero se resuelve lo de adentro."],
        solution: [`Adentro: $${a} - ${paren(b)} = ${inside}$.`, `Luego $${A(String(inside))} = ${value}$.`],
      };
    }
    const a = r.nz(-9, 9);
    const b = r.int(2, 5);
    const c = -r.int(2, 9);
    const value = -abs(a) + b * abs(c);
    return {
      statement: `Calcula $-${A(String(a))} + ${b}${A(String(c))}$.`,
      parts: [numPart(value, [[abs(a) + b * abs(c), "El signo menos que está afuera de las barras se queda. $-|a|$ siempre es negativo o cero."], [-abs(a) + b * c, `$${A(String(c))} = ${abs(c)}$, no $${c}$.`]])],
      hints: ["El menos de afuera no lo toca el valor absoluto. Calcula primero cada valor absoluto y después opera."],
      solution: [
        `$${A(String(a))} = ${abs(a)}$, así que $-${A(String(a))} = ${-abs(a)}$.`,
        `$${A(String(c))} = ${abs(c)}$, así que $${b} \\cdot ${abs(c)} = ${b * abs(c)}$.`,
        `Resultado: $${-abs(a)} + ${b * abs(c)} = ${value}$.`,
      ],
    };
  },
};

const jerarquia: ExerciseGen = {
  id: "jerarquia",
  title: "El orden de las operaciones",
  level: 2,
  generate: (r) => {
    const t = r.int(0, 3);
    if (t === 0) {
      const a = r.nz(-9, 9);
      const b = r.int(2, 7);
      const c = r.nz(-6, 6, [1]);
      const value = a + b * c;
      return {
        statement: `Calcula $${a} + ${b} \\cdot ${paren(c)}$.`,
        parts: [numPart(value, [[(a + b) * c, "Sumaste antes de multiplicar. La multiplicación va primero."]])],
        hints: ["La multiplicación se hace antes que la suma."],
        solution: [`Primero la multiplicación: $${b} \\cdot ${paren(c)} = ${b * c}$.`, `Después la suma: $${a} + ${paren(b * c)} = ${value}$.`],
      };
    }
    if (t === 1) {
      const a = r.nz(-9, 12);
      const b = r.int(2, 6);
      const c = r.nz(-6, 8);
      const d = r.nz(-6, 8, [c]);
      const value = a - b * (c - d);
      return {
        statement: `Calcula $${a} - ${b} \\cdot (${c} - ${paren(d)})$.`,
        parts: [numPart(value, [[(a - b) * (c - d), "Restaste antes de multiplicar. Después del paréntesis va la multiplicación."], [a - b * (c + d), "Dentro del paréntesis, restar un negativo es sumar."]])],
        hints: ["Primero el paréntesis, luego la multiplicación y al final la resta."],
        solution: [
          `Paréntesis: $${c} - ${paren(d)} = ${c - d}$.`,
          `Multiplicación: $${b} \\cdot ${paren(c - d)} = ${b * (c - d)}$.`,
          `Resta: $${a} - ${paren(b * (c - d))} = ${value}$.`,
        ],
      };
    }
    if (t === 2) {
      const b = r.int(2, 6);
      const k = r.nz(-6, 6, [1, -1]);
      const a = b * k;
      const c = r.int(2, 5);
      const extra = r.nz(-9, 9);
      const value = k * c + extra;
      return {
        statement: `Calcula $${a} \\div ${b} \\cdot ${c} ${extra < 0 ? "-" : "+"} ${abs(extra)}$.`,
        parts: [numPart(value, [[a / (b * c) + extra, `Multiplicaste antes de dividir. Multiplicación y división tienen el mismo rango y se hacen de izquierda a derecha.`]])],
        hints: ["Multiplicación y división tienen el mismo nivel. Se resuelven en el orden en que aparecen, de izquierda a derecha."],
        solution: [
          `De izquierda a derecha, primero la división: $${a} \\div ${b} = ${k}$.`,
          `Después la multiplicación: $${paren(k)} \\cdot ${c} = ${k * c}$.`,
          `Por último la ${extra < 0 ? "resta" : "suma"}: $${k * c} ${extra < 0 ? "-" : "+"} ${abs(extra)} = ${value}$.`,
        ],
      };
    }
    const a = r.nz(-4, 4);
    const b = r.nz(-4, 4, [-a]);
    const c = r.int(2, 5);
    const d = r.nz(-5, 5);
    const s = a + b;
    const value = s * s - c * d;
    return {
      statement: `Calcula $(${a} + ${paren(b)})^{2} - ${c} \\cdot ${paren(d)}$.`,
      parts: [numPart(value, [[(s * s - c) * d, "Restaste antes de multiplicar."], [a * a + b * b - c * d, "El cuadrado de una suma no es la suma de los cuadrados. Primero resuelve el paréntesis."]])],
      hints: ["Orden: paréntesis, potencia, multiplicación y al final la resta."],
      solution: [
        `Paréntesis: $${a} + ${paren(b)} = ${s}$.`,
        `Potencia: $${paren(s)}^{2} = ${s * s}$.`,
        `Multiplicación: $${c} \\cdot ${paren(d)} = ${c * d}$.`,
        `Resta: $${s * s} - ${paren(c * d)} = ${value}$.`,
      ],
    };
  },
};

const potenciaNegativo: ExerciseGen = {
  id: "potencia-negativo",
  title: "Potencias con signo menos",
  level: 2,
  generate: (r) => {
    const a = r.int(2, 6);
    const b = r.int(2, 4);
    const n = r.int(3, 12);
    type Piece = { tex: string; v: number; wrong: number; why: string };
    const tricky: Piece = { tex: `-${a}^{2}`, v: -a * a, wrong: a * a, why: `$-${a}^{2} = -(${a} \\cdot ${a}) = ${-a * a}$, porque el cuadrado solo afecta al ${a}` };
    const others: Piece[] = [
      { tex: `(-${b})^{2}`, v: b * b, wrong: b * b, why: `$(-${b})^{2} = (-${b})(-${b}) = ${b * b}$` },
      { tex: `(-${b})^{3}`, v: -(b ** 3), wrong: -(b ** 3), why: `$(-${b})^{3} = (-${b})(-${b})(-${b}) = ${-(b ** 3)}$, tres negativos dan negativo` },
      { tex: `-(-${b})^{2}`, v: -b * b, wrong: -b * b, why: `$(-${b})^{2} = ${b * b}$ y el menos de afuera lo vuelve $${-b * b}$` },
      { tex: `(-1)^{${n}}`, v: n % 2 === 0 ? 1 : -1, wrong: n % 2 === 0 ? 1 : -1, why: `$(-1)^{${n}} = ${n % 2 === 0 ? 1 : -1}$ porque ${n} es ${n % 2 === 0 ? "par" : "impar"}` },
    ];
    const other = r.pick(others);
    const pieces = r.bool() ? [tricky, other] : [other, tricky];
    const join = (p: Piece[]) => (p[1].tex.startsWith("-") ? `${p[0].tex} - ${p[1].tex.slice(1)}` : `${p[0].tex} + ${p[1].tex}`);
    const value = pieces[0].v + pieces[1].v;
    const wrong = pieces[0].wrong + pieces[1].wrong;
    return {
      statement: `Calcula $${join(pieces)}$.`,
      parts: [numPart(value, [[wrong, `Ojo con $-${a}^{2}$. El exponente solo afecta al número que toca, no al signo: vale $${-a * a}$, no $${a * a}$.`]])],
      hints: [
        "Fíjate si el signo menos está dentro del paréntesis o fuera. El exponente solo afecta a lo que toca.",
        "$(-3)^{2} = 9$ pero $-3^{2} = -9$.",
      ],
      solution: [`${pieces[0].why}.`, `${pieces[1].why}.`, `Resultado: $${pieces[0].v} ${pieces[1].v < 0 ? "-" : "+"} ${abs(pieces[1].v)} = ${value}$.`],
    };
  },
};

const saldo: ExerciseGen = {
  id: "saldo",
  title: "Problemas con ganancias, deudas y temperaturas",
  level: 2,
  generate: (r) => {
    const ctx = r.int(0, 2);
    if (ctx === 0) {
      const meses = ["enero", "febrero", "marzo", "abril"];
      const u = meses.map(() => r.nz(-15, 15));
      if (u.every((x) => x > 0)) u[r.int(0, 3)] = -r.int(3, 15);
      const total = u.reduce((a, b) => a + b, 0);
      return {
        statement: `Un pequeño negocio anotó su utilidad de cada mes, en miles de bolívares (datos de ejemplo): ${meses.map((m, i) => `${m} $${u[i]}$`).join(", ")}. Una utilidad negativa es una pérdida. ¿Cuál fue la utilidad acumulada de los cuatro meses?`,
        parts: [numPart(total, [[u.reduce((a, b) => a + abs(b), 0), "Sumaste las pérdidas como si fueran ganancias. Una utilidad negativa resta."]], "U =")],
        hints: ["Suma los cuatro números respetando sus signos."],
        solution: [
          `Sumamos con signo: $${signsTex(u)}$.`,
          `Ganancias: $${u.filter((x) => x > 0).reduce((a, b) => a + b, 0)}$. Pérdidas: $${u.filter((x) => x < 0).reduce((a, b) => a + b, 0)}$.`,
          `Utilidad acumulada: $${total}$ mil bolívares${total < 0 ? ", es decir, una pérdida" : ""}.`,
        ],
      };
    }
    if (ctx === 1) {
      const S = r.int(5, 30) * 10;
      const k = r.int(2, 4);
      const p = r.int(3, 9) * 10;
      const m = r.int(1, 3);
      const d = r.int(2, 8) * 10;
      const total = S - k * p + m * d;
      return {
        statement: `Una cuenta tiene un saldo de $${S}$ bolívares. Se hacen ${k} pagos de $${p}$ cada uno y llegan ${m} ${m === 1 ? "depósito" : "depósitos"} de $${d}$. ¿Cuál es el saldo final? (Si da negativo, la cuenta quedó en rojo.)`,
        parts: [numPart(total, [[(S - k) * p + m * d, "Restaste antes de multiplicar. Primero calcula cuánto suman los pagos."]], "\\text{saldo} =")],
        hints: [`Escribe la cuenta completa: $${S} - ${k} \\cdot ${p} + ${m} \\cdot ${d}$.`, "Haz primero las multiplicaciones."],
        solution: [
          `La operación es $${S} - ${k} \\cdot ${p} + ${m} \\cdot ${d}$.`,
          `Multiplicaciones: $${k} \\cdot ${p} = ${k * p}$ y $${m} \\cdot ${d} = ${m * d}$.`,
          `Saldo: $${S} - ${k * p} + ${m * d} = ${total}$ bolívares.`,
        ],
      };
    }
    const t0 = -r.int(1, 8);
    const up = r.int(5, 14);
    const down = r.int(6, 18);
    const total = t0 + up - down;
    return {
      statement: `En la madrugada un termómetro marca $${t0}$ °C. Al mediodía la temperatura sube $${up}$ grados y en la noche baja $${down}$ grados respecto al mediodía. ¿Qué temperatura marca en la noche?`,
      parts: [numPart(total, [[abs(t0) + up - down, "La temperatura inicial era bajo cero, es decir, negativa."]], "T =")],
      hints: ["Subir es sumar y bajar es restar. Empieza en el número negativo."],
      solution: [`La cuenta es $${t0} + ${up} - ${down}$.`, `$${t0} + ${up} = ${t0 + up}$, y $${t0 + up} - ${down} = ${total}$.`, `En la noche marca $${total}$ °C.`],
    };
  },
};

const distancia: ExerciseGen = {
  id: "distancia",
  title: "Distancia entre dos puntos de la recta",
  level: 2,
  generate: (r) => {
    let a: number, b: number;
    do {
      a = r.int(-10, 10);
      b = r.int(-10, 10);
    } while (a === b || (a >= 0 && b >= 0) || abs(a - b) < 3);
    const d = abs(a - b);
    return {
      statement: `¿Cuál es la distancia entre $${a}$ y $${b}$ en la recta real?`,
      graph: {
        x: [-12, 12],
        y: [-1, 1],
        height: 110,
        step: 1,
        points: [{ x: a, y: 0 }, { x: b, y: 0 }],
        labels: [a, b].map((v) => ({ x: v - String(v).length * 0.31 - 0.45, y: 0.25, text: String(v).replace("-", "−") })),
      },
      parts: [numPart(d, [[abs(abs(a) - abs(b)), "Restaste los tamaños sin mirar los signos. Cuando los puntos están a lados distintos del cero, las distancias al cero se suman."], [a - b, "Una distancia no puede ser negativa. Usa el valor absoluto."]], "d =")],
      hints: ["La distancia entre $a$ y $b$ es $|a - b|$.", "También puedes contar los pasos de uno a otro sobre la recta."],
      solution: [`$d = |${a} - ${paren(b)}| = |${a - b}| = ${d}$.`, "El orden de la resta no importa: $|b - a|$ da lo mismo."],
    };
  },
};

const combinada: ExerciseGen = {
  id: "combinada",
  title: "Operación combinada (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const d = r.nz(-4, 4);
    const E = r.int(-5, 5);
    const D = E + d;
    const C = r.int(-6, 10);
    const inner = C - d * d;
    const B = r.int(2, 4);
    const G = r.nz(-4, 4, [1, -1]);
    const k = r.nz(-5, 5);
    const F = G * k;
    const A = r.int(-10, 10);
    const value = A - B * inner + k;
    const tex = `${A} - ${B}\\left[${C} - (${D} - ${paren(E)})^{2}\\right] + ${paren(F)} \\div ${paren(G)}`;
    return {
      statement: `Calcula paso a paso $${tex}$.`,
      parts: [numPart(value, [[(A - B) * inner + k, `Restaste $${A} - ${B}$ antes de multiplicar por el corchete. La multiplicación va primero.`], [A - B * (C + d * d) + k, "Revisa el corchete: lo que se resta es el cuadrado, que es positivo."]])],
      hints: [
        "Empieza por el paréntesis más interno, luego la potencia y luego el corchete.",
        "Después haz la multiplicación y la división, y al final las sumas y restas.",
      ],
      solution: [
        `Paréntesis: $${D} - ${paren(E)} = ${d}$.`,
        `Potencia: $${paren(d)}^{2} = ${d * d}$.`,
        `Corchete: $${C} - ${d * d} = ${inner}$.`,
        `Multiplicación y división: $${B} \\cdot ${paren(inner)} = ${B * inner}$ y $${paren(F)} \\div ${paren(G)} = ${k}$.`,
        `Sumas y restas: $${A} - ${paren(B * inner)} + ${paren(k)} = ${value}$.`,
      ],
    };
  },
};

const agrupacion: ExerciseGen = {
  id: "agrupacion",
  title: "Signos de agrupación anidados (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const f = r.int(-8, 12);
    const a = r.nz(-9, 9);
    const b = r.nz(-9, 9);
    const c = r.nz(-9, 9);
    const d = r.nz(-9, 9, [c]);
    const e = r.nz(-9, 9);
    const p1 = c - d;
    const p2 = b - p1;
    const p3 = a - p2 + e;
    const value = f - p3;
    const wrong = f - a + p2 + e;
    const tex = `${f} - \\left\\{ ${a} - \\left[ ${b} - (${c} - ${paren(d)}) \\right] + ${paren(e)} \\right\\}`;
    return {
      statement: `Calcula:\n\n$$${tex}$$`,
      parts: [numPart(value, [[wrong, "El menos delante de la llave cambia el signo de todo lo que está adentro, también del último término."], [f + p3, "Te faltó el signo menos que está delante de la llave."]])],
      hints: ["Trabaja de adentro hacia afuera: primero el paréntesis, luego el corchete y al final la llave.", "Un signo menos delante de un signo de agrupación cambia el signo de su resultado."],
      solution: [
        `Paréntesis: $${c} - ${paren(d)} = ${p1}$.`,
        `Corchete: $${b} - ${paren(p1)} = ${p2}$.`,
        `Llave: $${a} - ${paren(p2)} + ${paren(e)} = ${p3}$.`,
        `Final: $${f} - ${paren(p3)} = ${value}$.`,
      ],
    };
  },
};

const vfPropiedades: ExerciseGen = {
  id: "vf-propiedades",
  title: "Verdadero o falso con números reales (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const a = r.int(2, 9);
    const b = r.int(2, 9);
    const big = a + b;
    const claims: { tex: Rich; ok: boolean; why: Rich }[] = [
      { tex: `$-${a}^{2} = ${a * a}$`, ok: false, why: `El exponente solo afecta al ${a}: $-${a}^{2} = -${a * a}$. El que vale $${a * a}$ es $(-${a})^{2}$.` },
      { tex: `$\\lvert ${-a} + ${b} \\rvert = \\lvert ${-a} \\rvert + \\lvert ${b} \\rvert$`, ok: false, why: `$\\lvert ${-a} + ${b} \\rvert = ${abs(b - a)}$ pero $\\lvert ${-a} \\rvert + \\lvert ${b} \\rvert = ${a + b}$. El valor absoluto no se reparte en una suma cuando los signos son distintos.` },
      { tex: `Si $a < b$, entonces $-a > -b$.`, ok: true, why: "Cambiar de signo refleja los números al otro lado del cero, y el orden se invierte. Por ejemplo $2 < 5$ y $-2 > -5$." },
      { tex: `$\\dfrac{${a}}{0} = 0$`, ok: false, why: "La división entre cero no está definida. No existe un número que multiplicado por 0 dé un número distinto de 0." },
      { tex: `$0 \\div ${a} = 0$`, ok: true, why: `Repartir nada entre ${a} da nada: $0 \\div ${a} = 0$ porque $0 \\cdot ${a} = 0$.` },
      { tex: "El producto de dos números negativos es negativo.", ok: false, why: "Menos por menos da más. Por ejemplo $(-2)(-3) = 6$." },
      { tex: `$-(-${a}) = ${a}$`, ok: true, why: "El opuesto del opuesto es el número original." },
      { tex: "Todo número entero es racional.", ok: true, why: "Cualquier entero $n$ se escribe como $\\frac{n}{1}$." },
      { tex: "La suma de dos números irracionales siempre es irracional.", ok: false, why: "Por ejemplo $\\sqrt{2} + (-\\sqrt{2}) = 0$, que es racional." },
      { tex: `$-${big} < -${a}$`, ok: true, why: `$-${big}$ está más a la izquierda en la recta, así que es menor.` },
      { tex: `$${a} - (${b} - ${big}) = ${a} - ${b} - ${big}$`, ok: false, why: `El menos delante del paréntesis cambia todos los signos de adentro: $${a} - ${b} + ${big}$.` },
    ];
    const c = r.pick(claims);
    return {
      statement: `¿Verdadero o falso? ${c.tex}`,
      parts: [trueFalse(c.ok, c.why)],
      hints: ["Prueba con números concretos. Un solo contraejemplo basta para que una afirmación general sea falsa."],
      solution: [`${c.ok ? "Verdadero" : "Falso"}. ${c.why}`],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("numeros"),
  objectives: [
    "Reconocer naturales, enteros, racionales, irracionales y reales, y ubicarlos en la recta.",
    "Sumar, restar, multiplicar y dividir números con signo sin equivocarte en la ley de los signos.",
    "Resolver operaciones combinadas respetando la jerarquía y los signos de agrupación.",
    "Calcular valores absolutos y distancias entre puntos de la recta real.",
  ],
  sections: [
    {
      id: "conjuntos-numericos",
      title: "Los números que vas a usar",
      blocks: [
        {
          type: "text",
          md: "Los primeros números que aprendiste sirven para contar: $1, 2, 3, 4, \\dots$ Se llaman **naturales** y se agrupan en el conjunto $\\mathbb{N}$.\n\nCon ellos no se puede responder cuánto es $3 - 5$. Si tienes 3 mil bolívares y gastas 5 mil, quedas debiendo 2 mil. Esa deuda se escribe $-2$, un **número negativo**. Al juntar los naturales, el cero y los negativos se obtienen los **enteros**, $\\mathbb{Z}$.\n\nTampoco alcanzan los enteros para repartir una torta entre 4 personas: a cada una le toca $\\frac{1}{4}$. Los números que se escriben como fracción de dos enteros se llaman **racionales**, $\\mathbb{Q}$. Sus decimales o se acaban ($0{,}25$) o se repiten en bloque ($0{,}333\\dots$).",
        },
        {
          type: "text",
          md: "Hay números que no se pueden escribir como fracción. La diagonal de un cuadrado de lado 1 mide $\\sqrt{2} = 1{,}41421356\\dots$ y sus decimales nunca se acaban ni se repiten. Lo mismo pasa con $\\pi = 3{,}14159\\dots$ Estos son los **irracionales**, $\\mathbb{I}$. Racionales e irracionales juntos forman los **reales**, $\\mathbb{R}$, que son todos los números con los que vas a trabajar en el curso.",
        },
        {
          type: "table",
          headers: ["Conjunto", "Qué contiene", "Ejemplos"],
          rows: [
            ["Naturales $\\mathbb{N}$", "Los números de contar", "$1, 2, 3, 40$"],
            ["Enteros $\\mathbb{Z}$", "Naturales, el cero y los negativos", "$-7, 0, 12$"],
            ["Racionales $\\mathbb{Q}$", "Fracciones de enteros, decimales finitos o periódicos", "$\\frac{3}{4}, -2{,}5, 0{,}\\overline{3}$"],
            ["Irracionales $\\mathbb{I}$", "Decimales infinitos sin bloque que se repita", "$\\sqrt{2}, \\sqrt{5}, \\pi$"],
            ["Reales $\\mathbb{R}$", "Racionales e irracionales", "Todos los anteriores"],
          ],
          caption: "Se cumple $\\mathbb{N} \\subset \\mathbb{Z} \\subset \\mathbb{Q} \\subset \\mathbb{R}$ y también $\\mathbb{I} \\subset \\mathbb{R}$. Un número no puede ser racional e irracional a la vez.",
        },
        {
          type: "note",
          tone: "tip",
          title: "El cero",
          md: "En este curso los naturales empiezan en 1, así que $0 \\notin \\mathbb{N}$ pero $0 \\in \\mathbb{Z}$. Algunos libros incluyen el cero en los naturales. Sigue la convención de tu profesor.",
        },
        {
          type: "example",
          title: "Clasificar números",
          problem: "¿En qué conjunto más pequeño está cada número? $\\sqrt{16}$, $-\\frac{8}{4}$, $0{,}75$ y $\\sqrt{7}$.",
          steps: [
            "$\\sqrt{16} = 4$ porque $4 \\cdot 4 = 16$. Es natural, aunque esté escrito con una raíz.",
            "$-\\frac{8}{4} = -2$. Es un entero negativo.",
            "$0{,}75 = \\frac{75}{100} = \\frac{3}{4}$. Es racional y no es entero.",
            "$7$ no es un cuadrado perfecto, así que $\\sqrt{7} = 2{,}6457\\dots$ tiene infinitos decimales sin patrón. Es irracional.",
          ],
          answer: "$\\sqrt{16} \\in \\mathbb{N}$, $-\\frac{8}{4} \\in \\mathbb{Z}$, $0{,}75 \\in \\mathbb{Q}$ y $\\sqrt{7} \\in \\mathbb{I}$.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Los negativos en economía",
          md: "Una utilidad negativa es una pérdida. Una variación de precio de $-3\\%$ es una baja. Un saldo de $-500$ es una deuda. Cada vez que veas un signo menos en un problema económico, pregúntate qué significa en la vida real.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Cuál de estos números es irracional?",
            parts: [
              choice("$\\sqrt{10}$", [
                ["$\\sqrt{9}$", "$\\sqrt{9} = 3$, la raíz es exacta."],
                ["$0{,}\\overline{3}$", "Es periódico, así que es racional: vale $\\frac{1}{3}$."],
                ["$-\\frac{5}{2}$", "Ya está escrito como fracción de enteros."],
              ]),
            ],
            solution: ["$10$ no es un cuadrado perfecto, así que $\\sqrt{10}$ es irracional. Los otros tres se escriben como fracción."],
          },
        },
      ],
    },
    {
      id: "recta-real",
      title: "La recta real y el orden",
      blocks: [
        {
          type: "text",
          md: "Dibuja una recta, marca un punto y llámalo $0$. A la derecha, con pasos iguales, van $1, 2, 3, \\dots$ y a la izquierda $-1, -2, -3, \\dots$ Entre ellos caben las fracciones y los irracionales. A cada número real le corresponde un punto, y a cada punto un número. Por eso se habla de la **recta real**.",
        },
        {
          type: "graph",
          spec: {
            x: [-6, 6],
            y: [-0.8, 0.8],
            height: 120,
            step: 1,
            points: [
              { x: -3.5, y: 0, color: "red" },
              { x: -1, y: 0, color: "red" },
              { x: 0, y: 0 },
              { x: Math.SQRT2, y: 0, color: "blue" },
              { x: Math.PI, y: 0, color: "blue" },
              { x: 5, y: 0 },
            ],
            labels: [
              { x: -4.25, y: 0.15, text: "−7/2", color: "red" },
              { x: -1.55, y: 0.15, text: "−1", color: "red" },
              { x: -0.45, y: 0.15, text: "0" },
              { x: 0.95, y: 0.15, text: "√2", color: "blue" },
              { x: 2.8, y: 0.15, text: "π", color: "blue" },
              { x: 4.6, y: 0.15, text: "5" },
            ],
          },
          caption: "Cada número ocupa un lugar. $\\sqrt{2} \\approx 1{,}41$ y $\\pi \\approx 3{,}14$ también tienen su punto.",
        },
        {
          type: "definition",
          title: "Orden",
          md: "$a < b$ (se lee \"$a$ es menor que $b$\") significa que $a$ está a la izquierda de $b$ en la recta. $a > b$ significa que $a$ está a la derecha.\n\n$\\le$ quiere decir \"menor o igual\" y $\\ge$ \"mayor o igual\".",
        },
        {
          type: "text",
          md: "El **opuesto** de un número $a$ es $-a$: está a la misma distancia del cero pero del otro lado. El opuesto de $4$ es $-4$ y el opuesto de $-4$ es $4$. Por eso $-(-4) = 4$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Entre negativos, el más grande en tamaño es el menor",
          md: "$-10 < -1$. Piénsalo con deudas: deber 10 es peor que deber 1. En la recta, $-10$ está mucho más a la izquierda.",
        },
        {
          type: "example",
          title: "Ordenar números con signo",
          problem: "Ordena de menor a mayor $-\\frac{3}{2}$, $0{,}5$, $-2$ y $-0{,}75$.",
          steps: [
            "Pasa todo a decimal: $-1{,}5$, $0{,}5$, $-2$ y $-0{,}75$.",
            "El único positivo, $0{,}5$, es el mayor.",
            "Entre los negativos, el más alejado del cero es el menor: $-2 < -1{,}5 < -0{,}75$.",
          ],
          answer: "$-2 < -\\frac{3}{2} < -0{,}75 < 0{,}5$",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Verdadero o falso? $-7 > -3$",
            parts: [trueFalse(false, "$-7$ está a la izquierda de $-3$, así que $-7 < -3$.")],
            solution: ["En la recta, $-7$ queda a la izquierda de $-3$. Por lo tanto $-7 < -3$ y la afirmación es falsa."],
          },
        },
      ],
    },
    {
      id: "suma-resta",
      title: "Sumar y restar con signos",
      blocks: [
        {
          type: "text",
          md: "La forma más fácil de pensar los signos es con dinero. Un número positivo es plata que tienes y un negativo es plata que debes.\n\n- Si tienes 5 y ganas 3, tienes 8: $5 + 3 = 8$.\n- Si debes 5 y te endeudas 3 más, debes 8: $-5 - 3 = -8$.\n- Si tienes 5 y debes 3, al pagar te quedan 2: $5 - 3 = 2$.\n- Si tienes 3 y debes 5, al pagar sigues debiendo 2: $3 - 5 = -2$.",
        },
        {
          type: "definition",
          title: "Reglas para sumar",
          md: "**Mismo signo:** se suman los tamaños y se deja el signo. $-4 + (-6) = -10$.\n\n**Signos distintos:** se resta el tamaño menor del mayor y se deja el signo del que tiene mayor tamaño. $-9 + 4 = -5$ porque $9 - 4 = 5$ y el $9$ era negativo.",
        },
        {
          type: "definition",
          title: "Restar es sumar el opuesto",
          md: "$$a - b = a + (-b)$$\n\n$$a - (-b) = a + b$$\n\nQuitar una deuda es lo mismo que ganar dinero. Por eso $5 - (-3) = 5 + 3 = 8$.",
        },
        {
          type: "example",
          title: "Una suma larga con signos",
          problem: "Calcula $-8 + 3 - (-6) - 4$.",
          steps: [
            "Cambia la resta del negativo por una suma: $-8 + 3 + 6 - 4$.",
            "Junta los positivos: $3 + 6 = 9$.",
            "Junta los negativos: $-8 - 4 = -12$.",
            "Combina: $9 - 12 = -3$.",
          ],
          answer: "$-3$",
        },
        {
          type: "note",
          tone: "warning",
          title: "Dos negativos seguidos no se cancelan en una suma",
          md: "$-3 - 5 = -8$, no $-2$ ni $8$. Son dos deudas que se acumulan. La regla \"menos por menos da más\" es de la multiplicación, no de la suma.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $-5 - (-9) + 2$.",
            parts: [{ kind: "expr", answer: "6", maxOps: 0, mistakes: [{ answer: "-12", feedback: "Restar $-9$ es sumar $9$." }] }],
            solution: ["$-5 - (-9) + 2 = -5 + 9 + 2 = 6$."],
          },
        },
      ],
    },
    {
      id: "ley-signos",
      title: "Multiplicar y dividir: la ley de los signos",
      blocks: [
        {
          type: "text",
          md: "Multiplicar es sumar varias veces lo mismo. $3 \\cdot (-4)$ es sumar tres deudas de 4: $(-4) + (-4) + (-4) = -12$. Para dividir se usa la misma regla de signos que para multiplicar.",
        },
        {
          type: "table",
          headers: ["Signos", "Resultado", "Ejemplo"],
          rows: [
            ["$(+)(+)$", "$+$", "$3 \\cdot 4 = 12$"],
            ["$(+)(-)$", "$-$", "$3 \\cdot (-4) = -12$"],
            ["$(-)(+)$", "$-$", "$(-12) \\div 4 = -3$"],
            ["$(-)(-)$", "$+$", "$(-3)(-4) = 12$"],
          ],
          caption: "Signos iguales dan positivo, signos distintos dan negativo.",
        },
        { type: "heading", text: "¿Por qué menos por menos da más?" },
        {
          type: "table",
          headers: ["Operación", "Resultado"],
          rows: [
            ["$(-3) \\cdot 2$", "$-6$"],
            ["$(-3) \\cdot 1$", "$-3$"],
            ["$(-3) \\cdot 0$", "$0$"],
            ["$(-3) \\cdot (-1)$", "$3$"],
            ["$(-3) \\cdot (-2)$", "$6$"],
          ],
          caption: "Cada vez que el segundo factor baja 1, el resultado sube 3. El patrón obliga a que $(-3)(-1) = 3$.",
        },
        {
          type: "text",
          md: "También se ve con dinero. Si te quitan ($-$) 2 deudas ($-$) de 3 bolívares cada una, quedas 6 bolívares más rico: $(-2)(-3) = +6$.",
        },
        {
          type: "note",
          tone: "idea",
          title: "Con muchos factores, cuenta los negativos",
          md: "Si la cantidad de factores negativos es par, el resultado es positivo. Si es impar, es negativo. $(-1)(-2)(-3) = -6$ porque hay tres negativos.",
        },
        {
          type: "note",
          tone: "warning",
          title: "El exponente solo afecta a lo que toca",
          md: "$(-3)^{2} = (-3)(-3) = 9$, pero $-3^{2} = -(3 \\cdot 3) = -9$. En $-3^2$ el cuadrado se aplica al 3 y el menos se queda afuera. Una potencia par de un negativo es positiva, y una impar es negativa: $(-2)^{3} = -8$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "No se divide entre cero",
          md: "$0 \\div 5 = 0$ porque $0 \\cdot 5 = 0$. Pero $5 \\div 0$ no existe: haría falta un número que multiplicado por 0 diera 5, y ese número no existe.",
        },
        {
          type: "example",
          title: "Varios factores",
          problem: "Calcula $(-2)(-3)(-5) \\div (-6)$.",
          steps: [
            "Hay cuatro signos negativos, una cantidad par, así que el resultado es positivo.",
            "Tamaños: $2 \\cdot 3 \\cdot 5 = 30$ y $30 \\div 6 = 5$.",
          ],
          answer: "$5$",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $(-24) \\div 6 \\cdot (-2)$.",
            parts: [{ kind: "expr", answer: "8", maxOps: 0, mistakes: [{ answer: "2", feedback: "Multiplicaste antes de dividir. Van de izquierda a derecha." }, { answer: "-8", feedback: "Hay dos negativos, el resultado es positivo." }] }],
            solution: ["De izquierda a derecha: $(-24) \\div 6 = -4$ y luego $(-4)(-2) = 8$."],
          },
        },
      ],
    },
    {
      id: "jerarquia",
      title: "El orden de las operaciones",
      blocks: [
        {
          type: "text",
          md: "¿Cuánto es $2 + 3 \\cdot 4$? Si sumas primero da 20 y si multiplicas primero da 14. Para que todo el mundo obtenga lo mismo hay un orden acordado, y según ese orden la respuesta es 14.",
        },
        {
          type: "definition",
          title: "Jerarquía de las operaciones",
          md: "1. **Signos de agrupación** $(\\;)$, $[\\;]$, $\\{\\;\\}$, del más interno al más externo.\n\n2. **Potencias y raíces.**\n\n3. **Multiplicaciones y divisiones**, de izquierda a derecha.\n\n4. **Sumas y restas**, de izquierda a derecha.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Multiplicar y dividir tienen el mismo rango",
          md: "$12 \\div 4 \\cdot 3 = 3 \\cdot 3 = 9$, no $12 \\div 12 = 1$. Cuando están en el mismo nivel se hace primero la que aparece primero, leyendo de izquierda a derecha. Con la suma y la resta pasa igual: $10 - 4 + 2 = 8$.",
        },
        {
          type: "note",
          tone: "tip",
          title: "La raya de fracción agrupa",
          md: "En $\\dfrac{8 + 4}{2 + 1}$ el numerador y el denominador se calculan completos antes de dividir: $\\dfrac{12}{3} = 4$. Es como si cada uno tuviera su propio paréntesis.",
        },
        {
          type: "example",
          title: "Paso a paso",
          problem: "Calcula $18 - 3 \\cdot (5 - 7)^{2} + 10 \\div (-2)$.",
          steps: [
            "Paréntesis: $5 - 7 = -2$.",
            "Potencia: $(-2)^{2} = 4$.",
            "Multiplicación y división: $3 \\cdot 4 = 12$ y $10 \\div (-2) = -5$.",
            "Sumas y restas: $18 - 12 + (-5) = 18 - 12 - 5 = 1$.",
          ],
          answer: "$1$",
        },
        {
          type: "text",
          md: "Un signo menos delante de un paréntesis cambia el signo de todo lo que hay adentro: $-(3 - 8 + 2) = -3 + 8 - 2$. Si hay varios signos de agrupación, uno dentro de otro, se resuelven de adentro hacia afuera.",
        },
        {
          type: "example",
          title: "Agrupaciones anidadas",
          problem: "Calcula $5 - \\{2 - [3 - (4 - 6)]\\}$.",
          steps: [
            "Paréntesis: $4 - 6 = -2$.",
            "Corchete: $3 - (-2) = 3 + 2 = 5$.",
            "Llave: $2 - 5 = -3$.",
            "Final: $5 - (-3) = 8$.",
          ],
          answer: "$8$",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $7 - 2 \\cdot (3 - 8)$.",
            parts: [{ kind: "expr", answer: "17", maxOps: 0, mistakes: [{ answer: "-25", feedback: "Restaste $7 - 2$ antes de multiplicar." }, { answer: "-3", feedback: "$-2 \\cdot (-5)$ es positivo: $+10$." }] }],
            solution: ["Paréntesis: $3 - 8 = -5$. Multiplicación: $2 \\cdot (-5) = -10$. Resta: $7 - (-10) = 17$."],
          },
        },
      ],
    },
    {
      id: "valor-absoluto",
      title: "Valor absoluto y distancia",
      blocks: [
        {
          type: "text",
          md: "El valor absoluto de un número es su distancia al cero. Se escribe entre barras. Como una distancia nunca es negativa, el valor absoluto tampoco: $|5| = 5$, $|-5| = 5$ y $|0| = 0$. En pocas palabras, el valor absoluto le quita el signo a un número.",
        },
        {
          type: "definition",
          title: "Valor absoluto",
          md: "$$|a| = \\begin{cases} a & \\text{si } a \\ge 0 \\\\ -a & \\text{si } a < 0 \\end{cases}$$\n\nLa segunda línea asusta un poco, pero tiene sentido: si $a$ es negativo, $-a$ es positivo. Por ejemplo $|-4| = -(-4) = 4$.",
        },
        {
          type: "graph",
          spec: {
            x: [-6, 6],
            y: [-0.8, 0.9],
            height: 140,
            step: 1,
            segments: [{ from: [-3, 0.3], to: [4, 0.3], color: "accent" }],
            points: [
              { x: -3, y: 0, label: "−3", color: "red" },
              { x: 4, y: 0, label: "4", color: "blue" },
            ],
            labels: [{ x: -1.3, y: 0.45, text: "distancia = 7", color: "accent" }],
          },
          caption: "La distancia entre $-3$ y $4$ es $|-3 - 4| = |-7| = 7$.",
        },
        {
          type: "definition",
          title: "Distancia entre dos números",
          md: "La distancia entre $a$ y $b$ en la recta es $|a - b|$. El orden no importa: $|a - b| = |b - a|$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Dos errores frecuentes",
          md: "El signo de afuera no lo toca el valor absoluto: $-|-6| = -6$.\n\nEl valor absoluto no se reparte en sumas: $|-3 + 5| = |2| = 2$, pero $|-3| + |5| = 8$.",
        },
        {
          type: "example",
          title: "Calcular con barras",
          problem: "Calcula $|2 - 9| - |-4| + 3|-1|$.",
          steps: [
            "Las barras funcionan como paréntesis: $|2 - 9| = |-7| = 7$.",
            "$|-4| = 4$ y $|-1| = 1$.",
            "Queda $7 - 4 + 3 \\cdot 1 = 6$.",
          ],
          answer: "$6$",
        },
        {
          type: "note",
          tone: "econ",
          title: "El tamaño de un cambio",
          md: "Si un precio sube 8 bolívares y otro baja 8, los cambios son $+8$ y $-8$. Tienen el mismo tamaño, $|+8| = |-8| = 8$, aunque van en direcciones opuestas. El valor absoluto aparece cuando importa cuánto cambió algo y no hacia dónde, como en la elasticidad que verás al final del curso.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $|-7| - |3 - 10|$.",
            parts: [{ kind: "expr", answer: "0", maxOps: 0, mistakes: [{ answer: "14", feedback: "$|3 - 10| = 7$, y se resta." }, { answer: "-14", feedback: "$|-7| = 7$, el valor absoluto quita el signo." }] }],
            solution: ["$|-7| = 7$ y $|3 - 10| = |-7| = 7$. Resultado: $7 - 7 = 0$."],
          },
        },
      ],
    },
  ],
  exercises: [
    clasificar,
    comparar,
    sumaResta,
    multDiv,
    valorAbsoluto,
    jerarquia,
    potenciaNegativo,
    saldo,
    distancia,
    combinada,
    agrupacion,
    vfPropiedades,
  ],
};

export default topic;
