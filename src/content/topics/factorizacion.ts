import { meta } from "../catalog";
import { choice, trueFalse } from "../helpers";
import type { ExerciseGen, Rich, Topic } from "../types";
import { evaluate, freeVars, type Ast } from "@/lib/math/parse";
import { coef, frac, gcd, minus, paren, poly, terms } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

/** Producto de polinomios dados por coeficientes de mayor a menor grado. */
function polyMul(a: number[], b: number[]): number[] {
  const out = Array(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => (out[i + j] += x * y)));
  return out;
}

/** Polinomio mónico con esas raíces. */
function fromRoots(roots: number[]): number[] {
  return roots.reduce((acc, r) => polyMul(acc, [1, -r]), [1]);
}

function evalPoly(c: number[], x: number): number {
  return c.reduce((acc, k) => acc * x + k, 0);
}

/** División sintética entre (x - a). Devuelve la fila de sumas, el cociente y el residuo. */
function ruffini(c: number[], a: number) {
  const row = [c[0]];
  for (let i = 1; i < c.length; i++) row.push(c[i] + row[i - 1] * a);
  return { row, q: row.slice(0, -1), rem: row[row.length - 1] };
}

/** Sustitución escrita: 2(3)^{2} - 5(3) + 1 */
function substTex(c: number[], a: number): string {
  const deg = c.length - 1;
  const out: string[] = [];
  c.forEach((k, i) => {
    const p = deg - i;
    if (k === 0) return;
    const pw = p === 0 ? "" : p === 1 ? `(${a})` : `(${a})^{${p}}`;
    const abs = Math.abs(k);
    const body = p === 0 ? String(abs) : `${abs === 1 ? "" : `${abs} \\cdot `}${pw}`;
    out.push(out.length === 0 ? (k < 0 ? `-${body}` : body) : k < 0 ? `- ${body}` : `+ ${body}`);
  });
  return out.join(" ");
}

/** Producto de factores (x - r) agrupando los repetidos: (x - 1)^{2}(x + 3) */
function rootsTex(roots: number[]): string {
  const counts = new Map<number, number>();
  for (const r of [...roots].sort((a, b) => a - b)) counts.set(r, (counts.get(r) ?? 0) + 1);
  return [...counts]
    .map(([r, m]) => {
      const f = r === 0 ? "x" : `(${minus("x", r)})`;
      return m === 1 ? f : `${f}^{${m}}`;
    })
    .join("");
}

function divisors(n: number): number[] {
  const out: number[] = [];
  for (let d = 1; d <= Math.abs(n); d++) if (n % d === 0) out.push(d);
  return out;
}

/** Grado de una expresión polinómica, o Infinity si no es un polinomio. */
function degree(a: Ast): number {
  switch (a.t) {
    case "num":
    case "const":
      return 0;
    case "var":
      return 1;
    case "neg":
      return degree(a.a);
    case "bin": {
      const da = degree(a.a);
      const db = degree(a.b);
      if (a.op === "+" || a.op === "-") return Math.max(da, db);
      if (a.op === "*") return da + db;
      if (a.op === "/") return db === 0 ? da : Infinity;
      if (db !== 0) return Infinity;
      if (da === 0) return 0;
      const n = evaluate(a.b);
      return Number.isInteger(n) && n >= 0 ? da * n : Infinity;
    }
    default:
      return degree(a.a) === 0 ? 0 : Infinity;
  }
}

/** Separa un producto en sus factores (ignora signos y constantes que dividen). */
function factorsOf(a: Ast, out: Ast[] = []): Ast[] {
  if (a.t === "neg") return factorsOf(a.a, out);
  if (a.t === "bin" && a.op === "*") {
    factorsOf(a.a, out);
    factorsOf(a.b, out);
    return out;
  }
  if (a.t === "bin" && a.op === "/" && degree(a.b) === 0) return factorsOf(a.a, out);
  if (a.t === "bin" && a.op === "^" && degree(a.b) === 0 && degree(a.a) > 0) {
    const n = evaluate(a.b);
    if (Number.isInteger(n) && n > 0) return factorsOf(a.a, out);
  }
  out.push(a);
  return out;
}

/**
 * Exige una factorización completa en los reales: cada factor es de grado 1
 * o es cuadrático sin raíces reales.
 */
function fullyFactored(ast: Ast): string | null {
  const v = freeVars(ast)[0] ?? "x";
  const nonConst = factorsOf(ast).filter((f) => degree(f) > 0);
  for (const f of nonConst) {
    const d = degree(f);
    if (d === 1) continue;
    if (d === Infinity) return "Escribe la respuesta como un producto de polinomios, sin dividir entre la variable.";
    if (d === 2) {
      const at = (x: number) => evaluate(f, { [v]: x });
      const c = at(0);
      const p = at(1);
      const m = at(-1);
      const A = (p + m) / 2 - c;
      const B = (p - m) / 2;
      if (Math.abs(A) < 1e-9) continue;
      if (B * B - 4 * A * c < -1e-9) continue;
    }
    return nonConst.length === 1
      ? "Eso sigue siendo una suma. Escríbelo como un producto de factores."
      : "Uno de los factores todavía se puede descomponer. Sigue factorizando.";
  }
  return null;
}

/* ----------------------------------- ejercicios ----------------------------------- */

const factorComun: ExerciseGen = {
  id: "factor-comun",
  title: "Sacar el máximo factor común",
  level: 1,
  generate: (r) => {
    const g = r.pick([2, 3, 4, 5, 6]);
    const m = r.int(1, 2);
    const n = r.pick([2, 3]);
    let inner: number[];
    do {
      inner = [r.int(1, 5), ...Array.from({ length: n - 1 }, () => r.nz(-6, 6))];
      if (r.bool(0.4)) inner[n - 1] = r.sign();
    } while (inner.reduce((a, b) => gcd(a, b)) !== 1);
    const xm = m === 1 ? "x" : `x^{${m}}`;
    const gcf = `${g}${xm}`;
    const full = [...inner.map((c) => c * g), ...Array(m).fill(0)];
    const fullTex = poly(full);
    const innerTex = poly(inner);
    const last = inner[n - 1];
    const firstMistakes = [
      { answer: String(g), feedback: `Te faltó la parte con $x$. Todos los términos tienen por lo menos $${xm}$.` },
      { answer: xm, feedback: `Te faltó el número. El máximo común divisor de los coeficientes es $${g}$.` },
    ];
    if (m === 2) firstMistakes.push({ answer: `${g}x`, feedback: "Todos los términos tienen al menos $x^{2}$, así que puedes sacar $x^{2}$ y no solo $x$." });
    return {
      statement: `Factoriza $${fullTex}$ sacando el máximo factor común.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "¿Cuál es el máximo factor común?", answer: gcf, vars: ["x"], mistakes: firstMistakes },
        {
          kind: "expr",
          prompt: "Completa la factorización.",
          before: `${fullTex} = ${gcf}(`,
          after: ")",
          answer: innerTex,
          vars: ["x"],
          mistakes:
            Math.abs(last) === 1
              ? [{ answer: poly([...inner.slice(0, -1), 0]), feedback: "Te faltó un término. Cuando un término es igual al factor común, adentro queda $1$ (o $-1$), no $0$." }]
              : [],
        },
      ],
      hints: [
        "Busca el máximo común divisor de los coeficientes.",
        "Para la $x$, toma la menor potencia que aparece en todos los términos.",
      ],
      solution: [
        `El máximo común divisor de los coeficientes es $${g}$.`,
        `La menor potencia de $x$ que aparece en todos los términos es $${xm}$. El factor común es $${gcf}$.`,
        `Dividimos cada término entre $${gcf}$ y queda $${innerTex}$.`,
        `Resultado: $${fullTex} = ${gcf}(${innerTex})$.`,
      ],
    };
  },
};

const difCuadrados: ExerciseGen = {
  id: "diferencia-cuadrados",
  title: "Diferencia de cuadrados",
  level: 1,
  generate: (r) => {
    let a: number, b: number;
    do {
      a = r.pick([1, 1, 2, 3, 4, 5]);
      b = r.int(1, 9);
    } while (gcd(a, b) !== 1 || (a === 1 && b === 1));
    const ax = coef(a, "x");
    const ax2 = coef(a * a, "x^{2}");
    const rev = r.bool(0.3);
    const tex = rev ? `${b * b} - ${ax2}` : `${ax2} - ${b * b}`;
    const answer = rev ? `(${b} - ${ax})(${b} + ${ax})` : `(${ax} - ${b})(${ax} + ${b})`;
    const mistakes = [
      {
        answer: rev ? `(${b} - ${ax})^{2}` : `(${ax} - ${b})^{2}`,
        feedback: "Ese cuadrado tiene término del medio al desarrollarlo. La diferencia de cuadrados lleva un paréntesis con resta y otro con suma.",
      },
    ];
    if (rev) mistakes.push({ answer: `(${ax} - ${b})(${ax} + ${b})`, feedback: `Revisa el orden. La expresión es $${b * b}$ menos algo, así que el $${b}$ va primero en la resta.` });
    return {
      statement: `Factoriza $${tex}$.`,
      parts: [{ kind: "expr", before: `${tex} =`, answer, vars: ["x"], validate: fullyFactored, mistakes }],
      hints: ["Los dos términos son cuadrados perfectos y están restando.", "Usa $a^2 - b^2 = (a - b)(a + b)$."],
      solution: [
        `Los dos términos son cuadrados: ${a === 1 ? "$x^{2}$ es el cuadrado de $x$" : `$${ax2} = (${ax})^{2}$`} y $${b * b} = ${b}^{2}$.`,
        "Aplicamos $a^2 - b^2 = (a - b)(a + b)$.",
        `Resultado: $${tex} = ${answer}$.`,
      ],
    };
  },
};

const trinomioMonico: ExerciseGen = {
  id: "trinomio-monico",
  title: "Trinomio de la forma x² + bx + c",
  level: 1,
  generate: (r) => {
    let r1: number, r2: number;
    do {
      r1 = r.nz(-9, 9);
      r2 = r.nz(-9, 9);
    } while (r1 === r2 || r1 + r2 === 0 || Math.abs(r1 * r2) > 54);
    const tex = poly([1, -(r1 + r2), r1 * r2]);
    const m = -r1;
    const n = -r2;
    const answer = `(${minus("x", r1)})(${minus("x", r2)})`;
    return {
      statement: `Factoriza $${tex}$.`,
      parts: [
        {
          kind: "expr",
          before: `${tex} =`,
          answer,
          vars: ["x"],
          validate: fullyFactored,
          mistakes: [{ answer: `(${minus("x", -r1)})(${minus("x", -r2)})`, feedback: "Los signos quedaron al revés. Multiplica de vuelta y verás que el término del medio cambia de signo." }],
        },
      ],
      hints: [
        `Busca dos números que multiplicados den $${r1 * r2}$ y sumados den $${-(r1 + r2)}$.`,
        r1 * r2 > 0 ? "El producto es positivo, así que los dos números tienen el mismo signo." : "El producto es negativo, así que los dos números tienen signos distintos.",
      ],
      solution: [
        `Buscamos dos números con producto $${r1 * r2}$ y suma $${-(r1 + r2)}$.`,
        `Son $${m}$ y $${n}$, porque $${paren(m)} \\cdot ${paren(n)} = ${m * n}$ y $${paren(m)} + ${paren(n)} = ${m + n}$.`,
        `Resultado: $${tex} = ${answer}$.`,
      ],
    };
  },
};

const cuadradoPerfecto: ExerciseGen = {
  id: "cuadrado-perfecto",
  title: "Trinomio cuadrado perfecto",
  level: 1,
  generate: (r) => {
    let a: number, b: number;
    do {
      a = r.pick([1, 1, 2, 3, 4]);
      b = r.int(1, 7);
    } while (gcd(a, b) !== 1);
    const s = r.sign();
    const full = poly([a * a, 2 * a * b * s, b * b]);
    const inner = poly([a, s * b]);
    const ax = coef(a, "x");
    return {
      statement: `Escribe $${full}$ como el cuadrado de un binomio.`,
      parts: [
        {
          kind: "expr",
          before: `${full} = (`,
          after: ")^{2}",
          answer: inner,
          accept: [poly([-a, -s * b])],
          vars: ["x"],
          mistakes: [{ answer: poly([a, -s * b]), feedback: "El signo dentro del paréntesis es el mismo del término del medio." }],
        },
      ],
      hints: [
        "Saca la raíz cuadrada del primer término y la del último.",
        "Comprueba que el término del medio sea el doble del producto de esas dos raíces.",
      ],
      solution: [
        `${a === 1 ? "$x^{2}$ es el cuadrado de $x$" : `$${coef(a * a, "x^{2}")} = (${ax})^{2}$`} y $${b * b} = ${b}^{2}$.`,
        `El doble producto es $2 \\cdot ${a === 1 ? "x" : `${a}x`} \\cdot ${b} = ${coef(2 * a * b, "x")}$, que coincide con el término del medio. Es un trinomio cuadrado perfecto.`,
        `El signo del medio es ${s > 0 ? "positivo" : "negativo"}, así que $${full} = (${inner})^{2}$.`,
      ],
    };
  },
};

const resto: ExerciseGen = {
  id: "teorema-resto",
  title: "Teorema del resto y del factor",
  level: 1,
  generate: (r) => {
    const a = r.nz(-3, 3);
    const isRoot = r.bool(0.45);
    let c: number[];
    if (isRoot) {
      c = polyMul([1, -a], [1, r.int(-4, 4), r.nz(-6, 6)]);
    } else {
      do c = [1, r.int(-5, 5), r.int(-6, 6), r.nz(-9, 9)];
      while (evalPoly(c, a) === 0 || evalPoly(c, -a) === evalPoly(c, a));
    }
    const val = evalPoly(c, a);
    const xa = minus("x", a);
    return {
      statement: `Sea $P(x) = ${poly(c)}$.`,
      sequential: true,
      parts: [
        {
          kind: "expr",
          prompt: `¿Cuál es el residuo de dividir $P(x)$ entre $${xa}$?`,
          answer: String(val),
          maxOps: 0,
          mistakes:
            evalPoly(c, -a) !== val
              ? [{ answer: String(evalPoly(c, -a)), feedback: `Sustituiste $x = ${-a}$. El divisor $${xa}$ se anula en $x = ${a}$, y ese es el valor que va en $P$.` }]
              : [],
        },
        trueFalse(
          isRoot,
          isRoot ? `El residuo es $0$, así que $(${xa})$ sí es factor.` : `El residuo es $${val}$, distinto de cero, así que $(${xa})$ no es factor.`,
          `¿Es $(${xa})$ un factor de $P(x)$?`,
        ),
      ],
      hints: [`El residuo de dividir entre $x - a$ es $P(a)$. Aquí $a = ${a}$.`, "Si el residuo es cero, el divisor es un factor."],
      solution: [
        `Por el teorema del resto, el residuo es $P(${a})$.`,
        `$P(${a}) = ${substTex(c, a)} = ${val}$.`,
        isRoot ? `Como $P(${a}) = 0$, el teorema del factor dice que $(${xa})$ es factor de $P(x)$.` : `Como $P(${a}) \\neq 0$, $(${xa})$ no es factor de $P(x)$.`,
      ],
    };
  },
};

const trinomioGeneral: ExerciseGen = {
  id: "trinomio-general",
  title: "Trinomio de la forma ax² + bx + c",
  level: 2,
  generate: (r) => {
    let p: number, q: number, s: number, t: number;
    do {
      p = r.int(1, 3);
      s = r.int(1, 3);
      q = r.nz(-7, 7);
      t = r.nz(-7, 7);
    } while (p * s < 2 || p * s > 6 || gcd(p, q) !== 1 || gcd(s, t) !== 1 || p * t + q * s === 0 || (p === s && q === t));
    const A = p * s;
    const B = p * t + q * s;
    const C = q * t;
    const tex = poly([A, B, C]);
    const f2 = poly([s, t]);
    const answer = `(${poly([p, q])})(${f2})`;
    return {
      statement: `Factoriza $${tex}$.`,
      parts: [
        {
          kind: "expr",
          before: `${tex} =`,
          answer,
          vars: ["x"],
          validate: fullyFactored,
          mistakes: [{ answer: `(${poly([p, -q])})(${poly([s, -t])})`, feedback: "Los signos de los números quedaron al revés. Multiplica de vuelta para comprobar el término del medio." }],
        },
      ],
      hints: [
        `Método ac: busca dos números que multiplicados den $${A} \\cdot ${paren(C)} = ${A * C}$ y sumados den $${B}$.`,
        "Parte el término del medio en dos usando esos números y agrupa de a dos.",
      ],
      solution: [
        `$a \\cdot c = ${A} \\cdot ${paren(C)} = ${A * C}$. Dos números con producto $${A * C}$ y suma $${B}$ son $${p * t}$ y $${q * s}$.`,
        `Partimos el término del medio: $${terms([[A, "x^{2}"], [p * t, "x"], [q * s, "x"], [C, ""]])}$.`,
        `Agrupamos de a dos: $${coef(p, "x")}(${f2}) ${q > 0 ? "+" : "-"} ${Math.abs(q) === 1 ? "" : Math.abs(q)}(${f2})$.`,
        `Sale el paréntesis común: $${tex} = ${answer}$.`,
      ],
    };
  },
};

const agrupacion: ExerciseGen = {
  id: "agrupacion",
  title: "Factorizar por agrupación",
  level: 2,
  generate: (r) => {
    const k = r.pick([1, 1, 2, 3]);
    let a: number;
    do a = r.nz(-6, 6);
    while (gcd(k, a) !== 1);
    const b = r.int(1, 9);
    const tex = poly([k, a, k * b, a * b]);
    const lin = poly([k, a]);
    const answer = `(${lin})(x^{2} + ${b})`;
    return {
      statement: `Factoriza $${tex}$.`,
      parts: [
        {
          kind: "expr",
          before: `${tex} =`,
          answer,
          vars: ["x"],
          validate: fullyFactored,
          mistakes: [{ answer: `(${lin})(x^{2} - ${b})`, feedback: "Revisa el signo del factor común del segundo grupo." }],
        },
      ],
      hints: ["Son cuatro términos. Agrupa los dos primeros y los dos últimos.", "Saca factor común en cada grupo. Tiene que quedar el mismo paréntesis en los dos."],
      solution: [
        `Agrupamos: $(${poly([k, a, 0, 0])}) + (${poly([k * b, a * b])})$.`,
        `Factor común en cada grupo: $x^{2}(${lin}) + ${b}(${lin})$.`,
        `El paréntesis $(${lin})$ se repite y sale como factor: $${answer}$.`,
        `$x^{2} + ${b}$ no se factoriza porque nunca vale cero.`,
      ],
    };
  },
};

const cubos: ExerciseGen = {
  id: "cubos",
  title: "Suma y diferencia de cubos",
  level: 2,
  generate: (r) => {
    let a: number, b: number;
    do {
      a = r.pick([1, 1, 2, 3]);
      b = r.int(1, 5);
    } while (gcd(a, b) !== 1 || (a === 1 && b === 1));
    const s = r.sign();
    const ax = coef(a, "x");
    const full = poly([a ** 3, 0, 0, s * b ** 3]);
    const bin = poly([a, s * b]);
    const answer = `(${bin})(${poly([a * a, -s * a * b, b * b])})`;
    return {
      statement: `Factoriza $${full}$.`,
      parts: [
        {
          kind: "expr",
          before: `${full} =`,
          answer,
          vars: ["x"],
          validate: fullyFactored,
          mistakes: [
            { answer: `(${bin})^{3}`, feedback: "El cubo de un binomio tiene cuatro términos al desarrollarlo. Aquí solo hay dos." },
            { answer: `(${bin})(${poly([a * a, s * a * b, b * b])})`, feedback: "El término del medio del trinomio lleva el signo contrario al del binomio." },
          ],
        },
      ],
      hints: [
        `Escribe cada término como un cubo: $${b ** 3} = ${b}^{3}$.`,
        "$a^3 - b^3 = (a - b)(a^2 + ab + b^2)$ y $a^3 + b^3 = (a + b)(a^2 - ab + b^2)$.",
      ],
      solution: [
        `Es ${s > 0 ? "una suma" : "una diferencia"} de cubos: $${a === 1 ? "x^{3}" : `${a ** 3}x^{3} = (${ax})^{3}`}$ y $${b ** 3} = ${b}^{3}$.`,
        `Con $a = ${ax}$ y $b = ${b}$ usamos $a^3 ${s > 0 ? "+" : "-"} b^3 = (a ${s > 0 ? "+" : "-"} b)(a^2 ${s > 0 ? "-" : "+"} ab + b^2)$.`,
        `Resultado: $${full} = ${answer}$.`,
        "El trinomio que queda no se factoriza, porque su discriminante es negativo.",
      ],
    };
  },
};

const utilidadCero: ExerciseGen = {
  id: "utilidad-cero",
  title: "Utilidad cero: factorizar para hallar el equilibrio",
  level: 2,
  generate: (r) => {
    const r1 = r.int(2, 8);
    const r2 = r1 + r.int(2, 10);
    const S = r1 + r2;
    const Pr = r1 * r2;
    const U = poly([-1, S, -Pr], "q");
    const answer = `-(q - ${r1})(q - ${r2})`;
    return {
      statement: `En una pequeña fábrica (ejemplo con números inventados), la utilidad en miles de dólares al producir $q$ unidades es $U(q) = ${U}$.`,
      sequential: true,
      parts: [
        {
          kind: "expr",
          prompt: "Factoriza $U(q)$.",
          before: "U(q) =",
          answer,
          vars: ["q"],
          validate: fullyFactored,
          mistakes: [{ answer: `(q - ${r1})(q - ${r2})`, feedback: "Te faltó el signo menos que sacaste como factor común. Multiplica de vuelta: el término $q^2$ tiene que quedar negativo." }],
        },
        {
          kind: "set",
          prompt: "¿Con qué niveles de producción la utilidad es cero?",
          before: "q \\in",
          answer: [r1, r2],
          mistakes: [{ answer: [-r1, -r2], feedback: `El factor $(q - ${r1})$ se anula en $q = ${r1}$, no en $q = ${-r1}$.` }],
        },
      ],
      hints: [
        "Saca $-1$ como factor común para que el $q^2$ quede positivo adentro.",
        "Un producto vale cero cuando alguno de sus factores vale cero.",
      ],
      solution: [
        `Sacamos $-1$: $U(q) = -(${poly([1, -S, Pr], "q")})$.`,
        `Dos números con producto $${Pr}$ y suma $${-S}$ son $${-r1}$ y $${-r2}$. Entonces $U(q) = ${answer}$.`,
        `$U(q) = 0$ cuando $q - ${r1} = 0$ o $q - ${r2} = 0$, es decir en $q = ${r1}$ y $q = ${r2}$.`,
        "Esos son los puntos de equilibrio: ahí la empresa no gana ni pierde.",
      ],
    };
  },
};

const ruffiniCubico: ExerciseGen = {
  id: "ruffini-cubico",
  title: "Factorizar un polinomio de grado 3 con Ruffini (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    let rs: number[];
    do rs = [r.nz(-5, 5), r.nz(-5, 5), r.nz(-5, 5)];
    while (new Set(rs).size < 2 || Math.abs(rs[0] * rs[1] * rs[2]) > 60);
    const c = fromRoots(rs);
    const r0 = [...rs].sort((x, y) => Math.abs(x) - Math.abs(y) || x - y)[0];
    const others = [...rs];
    others.splice(others.indexOf(r0), 1);
    const { q } = ruffini(c, r0);
    const answer = rootsTex(rs);
    const divs = divisors(c[3]);
    return {
      statement: `Factoriza completamente $P(x) = ${poly(c)}$.`,
      parts: [{ kind: "expr", before: "P(x) =", answer, vars: ["x"], validate: fullyFactored }],
      hints: [
        `Las raíces enteras posibles son los divisores de $${c[3]}$. Prueba primero los más pequeños.`,
        "Cuando encuentres una raíz $a$, divide entre $(x - a)$ con Ruffini y factoriza el trinomio que queda.",
      ],
      solution: [
        `Candidatos a raíz: $${divs.map((d) => `\\pm ${d}`).join(", ")}$.`,
        `Probamos $x = ${r0}$: $P(${r0}) = ${substTex(c, r0)} = 0$. Entonces $(${minus("x", r0)})$ es factor.`,
        `Ruffini con $${r0}$ sobre los coeficientes $${c.join(", ")}$ da el cociente $${poly(q)}$ y residuo $0$.`,
        `Factorizamos el cociente: $${poly(q)} = ${rootsTex(others)}$.`,
        `Resultado: $P(x) = ${answer}$.`,
      ],
    };
  },
};

const ruffiniGuiado: ExerciseGen = {
  id: "ruffini-raiz-dada",
  title: "Ruffini con una raíz dada y coeficiente principal distinto de 1 (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const d = r.pick([2, 3]);
    let n: number;
    do n = r.nz(-5, 5);
    while (gcd(n, d) !== 1);
    let r1: number, r2: number;
    do {
      r1 = r.nz(-4, 4);
      r2 = r.nz(-4, 4);
    } while (r1 === r2);
    const c = polyMul(polyMul([d, -n], [1, -r1]), [1, -r2]);
    const { row, q } = ruffini(c, r1);
    const wrong = ruffini(c, -r1).q;
    const xr1 = minus("x", r1);
    const answer = `(${xr1})(${minus("x", r2)})(${poly([d, -n])})`;
    return {
      statement: `Sea $P(x) = ${poly(c)}$. Se sabe que $x = ${r1}$ es raíz de $P$. Factoriza $P(x)$ por completo.`,
      sequential: true,
      parts: [
        {
          kind: "expr",
          prompt: `Divide entre $${xr1}$ con Ruffini y escribe el cociente.`,
          before: `P(x) = (${xr1})(`,
          after: ")",
          answer: poly(q),
          vars: ["x"],
          mistakes: [{ answer: poly(wrong), feedback: `Usaste $${-r1}$ en Ruffini. Para dividir entre $x - a$ se usa $a$, y aquí $a = ${r1}$.` }],
        },
        { kind: "expr", prompt: "Factoriza el cociente y escribe la factorización completa.", before: "P(x) =", answer, vars: ["x"], validate: fullyFactored },
      ],
      hints: [
        `Por el teorema del factor, $(${xr1})$ es factor. En la tabla de Ruffini va el número $${r1}$.`,
        "El cociente es un trinomio con coeficiente principal distinto de 1. Usa el método ac o la fórmula general.",
      ],
      solution: [
        `Ruffini con $${r1}$ sobre los coeficientes $${c.join(", ")}$. La fila de resultados es $${row.join(", ")}$.`,
        `El residuo es $0$ y el cociente es $${poly(q)}$.`,
        `Las raíces del cociente son $${r2}$ y $${frac(n, d)}$, así que $${poly(q)} = (${minus("x", r2)})(${poly([d, -n])})$.`,
        `Resultado: $P(x) = ${answer}$.`,
      ],
    };
  },
};

const factorizacionCompleta: ExerciseGen = {
  id: "factorizacion-completa",
  title: "Factorización completa en varios pasos (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const v = r.int(1, 5);
    let tex: string;
    let answer: string;
    let steps: Rich[];
    if (v === 1) {
      const k = r.int(2, 5);
      const a = r.int(1, 5);
      tex = poly([k, 0, -k * a * a, 0]);
      answer = `${k}x(x - ${a})(x + ${a})`;
      steps = [`Factor común $${k}x$: $${k}x(x^{2} - ${a * a})$.`, `El paréntesis es diferencia de cuadrados: $x^{2} - ${a * a} = (x - ${a})(x + ${a})$.`];
    } else if (v === 2) {
      const k = r.int(1, 3);
      let r1: number, r2: number;
      do {
        r1 = r.nz(-6, 6);
        r2 = r.nz(-6, 6);
      } while (r1 === r2 || r1 + r2 === 0);
      tex = poly(fromRoots([r1, r2, 0]).map((x) => k * x));
      const kx = coef(k, "x");
      answer = `${kx}(${minus("x", r1)})(${minus("x", r2)})`;
      steps = [
        `Factor común $${kx}$: $${kx}(${poly([1, -(r1 + r2), r1 * r2])})$.`,
        `En el trinomio, dos números con producto $${r1 * r2}$ y suma $${-(r1 + r2)}$ son $${-r1}$ y $${-r2}$.`,
      ];
    } else if (v === 3) {
      const a = r.int(1, 3);
      tex = poly([1, 0, 0, 0, -(a ** 4)]);
      answer = `(x - ${a})(x + ${a})(x^{2} + ${a * a})`;
      steps = [
        `Es diferencia de cuadrados con $x^{4} = (x^{2})^{2}$ y $${a ** 4} = (${a * a})^{2}$: $(x^{2} - ${a * a})(x^{2} + ${a * a})$.`,
        `El primer paréntesis vuelve a ser diferencia de cuadrados: $(x - ${a})(x + ${a})$. El segundo es una suma de cuadrados y no se factoriza.`,
      ];
    } else if (v === 4) {
      const m = r.int(1, 3);
      const n = r.int(m + 1, 4);
      tex = poly([1, 0, -(m * m + n * n), 0, m * m * n * n]);
      answer = `(x - ${m})(x + ${m})(x - ${n})(x + ${n})`;
      steps = [
        `Piensa en $x^{2}$ como una sola cosa. Dos números con producto $${m * m * n * n}$ y suma $${-(m * m + n * n)}$ son $${-m * m}$ y $${-n * n}$.`,
        `Entonces $${tex} = (x^{2} - ${m * m})(x^{2} - ${n * n})$.`,
        "Cada paréntesis es una diferencia de cuadrados.",
      ];
    } else {
      const c = r.nz(-4, 4);
      tex = poly([1, -c, -c * c, c ** 3]);
      answer = `(${minus("x", c)})^{2}(${minus("x", -c)})`;
      steps = [
        `Agrupamos de a dos: $x^{2}(${minus("x", c)}) - ${c * c}(${minus("x", c)})$.`,
        `Sale el paréntesis común: $(${minus("x", c)})(x^{2} - ${c * c})$.`,
        `$x^{2} - ${c * c} = (${minus("x", c)})(${minus("x", -c)})$, así que el factor $(${minus("x", c)})$ aparece dos veces.`,
      ];
    }
    return {
      statement: `Factoriza completamente $P(x) = ${tex}$.`,
      parts: [{ kind: "expr", before: "P(x) =", answer, vars: ["x"], validate: fullyFactored }],
      hints: ["Empieza siempre por el factor común, si lo hay.", "Después de cada paso, revisa si algún factor se puede seguir descomponiendo."],
      solution: [...steps, `Resultado: $P(x) = ${answer}$.`],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("factorizacion"),
  objectives: [
    "Entender qué significa factorizar y para qué sirve en ecuaciones, fracciones y límites.",
    "Sacar factor común y factorizar por agrupación.",
    "Reconocer diferencias de cuadrados, trinomios cuadrados perfectos y sumas o diferencias de cubos.",
    "Factorizar trinomios $x^2 + bx + c$ y $ax^2 + bx + c$.",
    "Usar el teorema del factor, las raíces racionales y Ruffini en polinomios de grado 3 o más.",
  ],
  sections: [
    {
      id: "que-es",
      title: "Qué significa factorizar",
      blocks: [
        {
          type: "text",
          md: "Factorizar es escribir algo como una multiplicación. Con números ya lo haces: $12 = 2 \\cdot 2 \\cdot 3$. Con polinomios la idea es la misma. En vez de ver $x^2 - x - 6$ como una suma de tres términos, lo escribes como el producto $(x - 3)(x + 2)$.\n\nLas dos formas valen lo mismo para cualquier $x$. Lo que cambia es lo que puedes hacer con cada una.",
        },
        {
          type: "text",
          md: "- **Resolver ecuaciones.** Un producto vale cero solo si alguno de sus factores vale cero. Si $(x - 3)(x + 2) = 0$, entonces $x = 3$ o $x = -2$.\n- **Simplificar fracciones.** En $\\dfrac{x^2 - 9}{x - 3}$ no se puede tachar nada hasta que factorizas el numerador: $\\dfrac{(x - 3)(x + 3)}{x - 3} = x + 3$.\n- **Calcular límites.** En Matemática I vas a encontrar límites que dan $\\frac{0}{0}$. La mayoría se resuelve factorizando y cancelando el factor que produce el cero.",
        },
        {
          type: "example",
          title: "Comprobar una factorización",
          problem: "¿Es cierto que $x^2 - x - 6 = (x - 3)(x + 2)$?",
          steps: [
            "Multiplica cada término del primer paréntesis por cada término del segundo: $x \\cdot x + x \\cdot 2 - 3 \\cdot x - 3 \\cdot 2$.",
            "Eso da $x^2 + 2x - 3x - 6$.",
            "Juntando los términos con $x$: $x^2 - x - 6$. Coincide.",
          ],
          answer: "Sí. Multiplicar de vuelta es la manera de comprobar cualquier factorización.",
        },
        {
          type: "note",
          tone: "idea",
          title: "Factorizar es multiplicar al revés",
          md: "Casi todo lo que sigue son productos notables leídos de derecha a izquierda. Si sabes que $(a + b)(a - b) = a^2 - b^2$, también sabes que $a^2 - b^2 = (a + b)(a - b)$. Si los productos notables están flojos, repasa el tema **Expresiones algebraicas**.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Cuál de estas expresiones está factorizada?",
            parts: [
              choice("$(x + 1)(x - 4)$", [
                ["$x^2 - 3x - 4$", "Es una suma de términos. Vale lo mismo, pero no está escrita como producto."],
                ["$x(x + 1) - 4(x + 1)$", "Tiene productos adentro, pero al final es una resta de dos términos. Falta sacar el $(x + 1)$ común."],
                ["$x^2 + x - 4x - 4$", "Es una suma de cuatro términos, no un producto."],
              ]),
            ],
            solution: ["Una expresión está factorizada cuando la última operación es una multiplicación. Solo $(x + 1)(x - 4)$ cumple eso."],
          },
        },
      ],
    },
    {
      id: "factor-comun",
      title: "Factor común y agrupación",
      blocks: [
        {
          type: "text",
          md: "Es lo primero que se intenta, siempre. Si todos los términos comparten algo (un número, una letra o un paréntesis completo), ese algo sale afuera multiplicando. Adentro queda lo que sobra de cada término al dividirlo entre lo que sacaste.",
        },
        {
          type: "definition",
          title: "Factor común",
          md: "$$ab + ac = a(b + c)$$\n\nEl **máximo factor común** se arma con el máximo común divisor de los coeficientes y con cada letra que aparece en todos los términos, elevada al menor exponente con que aparece.",
        },
        {
          type: "example",
          title: "Sacar el máximo factor común",
          problem: "Factoriza $6x^3 - 9x^2 + 3x$.",
          steps: [
            "Los coeficientes son $6$, $9$ y $3$. Su máximo común divisor es $3$.",
            "La $x$ está en los tres términos y el menor exponente es $1$. El factor común es $3x$.",
            "Dividimos cada término entre $3x$: $\\dfrac{6x^3}{3x} = 2x^2$, $\\dfrac{-9x^2}{3x} = -3x$ y $\\dfrac{3x}{3x} = 1$.",
            "Resultado: $6x^3 - 9x^2 + 3x = 3x(2x^2 - 3x + 1)$. Para comprobar, multiplica de vuelta.",
          ],
          answer: "$3x(2x^2 - 3x + 1)$. El paréntesis todavía se factoriza como $(2x - 1)(x - 1)$, lo verás más abajo.",
        },
        {
          type: "note",
          tone: "warning",
          title: "El 1 que se olvida",
          md: "Cuando un término es justo el factor común, al dividir queda $1$, no $0$. En $3x(2x^2 - 3x + 1)$ ese $1$ viene del término $3x$. Si lo borras, al multiplicar de vuelta te falta un término.",
        },
        {
          type: "example",
          title: "Un paréntesis como factor común",
          problem: "Factoriza $2x(x - 1) + 5(x - 1)$.",
          steps: [
            "Los dos términos comparten el paréntesis completo $(x - 1)$.",
            "Lo sacas como si fuera una letra: $(x - 1)(2x + 5)$.",
          ],
        },
        { type: "heading", text: "Agrupación" },
        {
          type: "text",
          md: "Con cuatro términos que no tienen un factor común para todos, se agrupan de a dos. Sacas factor común en cada grupo y, si los paréntesis que quedan son iguales, ese paréntesis sale como factor.",
        },
        {
          type: "example",
          title: "Factorizar por agrupación",
          problem: "Factoriza $x^3 - 2x^2 + 3x - 6$.",
          steps: [
            "Agrupamos: $(x^3 - 2x^2) + (3x - 6)$.",
            "Factor común en cada grupo: $x^2(x - 2) + 3(x - 2)$.",
            "El paréntesis $(x - 2)$ se repite: $(x - 2)(x^2 + 3)$.",
            "$x^2 + 3$ ya no se descompone, porque nunca vale cero.",
          ],
          answer: "$x^3 - 2x^2 + 3x - 6 = (x - 2)(x^2 + 3)$",
        },
        {
          type: "quick",
          exercise: {
            statement: "Completa la factorización de $5x^2 - 15x$.",
            parts: [{ kind: "expr", before: "5x^{2} - 15x = 5x(", after: ")", answer: "x - 3", vars: ["x"] }],
            solution: ["El factor común es $5x$. Al dividir: $\\dfrac{5x^2}{5x} = x$ y $\\dfrac{-15x}{5x} = -3$. Queda $5x(x - 3)$."],
          },
        },
      ],
    },
    {
      id: "productos-notables",
      title: "Diferencia de cuadrados, cuadrados perfectos y cubos",
      blocks: [
        {
          type: "text",
          md: "Hay formas que conviene reconocer de vista, porque se factorizan de inmediato. Son los productos notables leídos al revés.",
        },
        {
          type: "definition",
          title: "Formas que se factorizan de vista",
          md: "**Diferencia de cuadrados**\n\n$$a^2 - b^2 = (a - b)(a + b)$$\n\n**Trinomio cuadrado perfecto**\n\n$$a^2 + 2ab + b^2 = (a + b)^2$$\n\n$$a^2 - 2ab + b^2 = (a - b)^2$$\n\n**Diferencia de cubos**\n\n$$a^3 - b^3 = (a - b)(a^2 + ab + b^2)$$\n\n**Suma de cubos**\n\n$$a^3 + b^3 = (a + b)(a^2 - ab + b^2)$$",
        },
        {
          type: "example",
          title: "Diferencia de cuadrados",
          problem: "Factoriza $9x^2 - 25$ y $x^4 - 16$.",
          steps: [
            "$9x^2 = (3x)^2$ y $25 = 5^2$. Con $a = 3x$ y $b = 5$: $9x^2 - 25 = (3x - 5)(3x + 5)$.",
            "$x^4 = (x^2)^2$ y $16 = 4^2$. Entonces $x^4 - 16 = (x^2 - 4)(x^2 + 4)$.",
            "El primer paréntesis vuelve a ser diferencia de cuadrados: $x^4 - 16 = (x - 2)(x + 2)(x^2 + 4)$.",
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "La suma de cuadrados no se factoriza",
          md: "$x^2 + 4$ no se puede escribir como producto de factores con números reales. Nunca vale cero, porque $x^2 \\ge 0$ y le sumas $4$. No la confundas con $x^2 - 4$.",
        },
        {
          type: "example",
          title: "Trinomio cuadrado perfecto",
          problem: "Factoriza $4x^2 - 12x + 9$.",
          steps: [
            "Los extremos son cuadrados: $4x^2 = (2x)^2$ y $9 = 3^2$.",
            "Revisa el término del medio: $2 \\cdot (2x) \\cdot 3 = 12x$. Coincide, así que es un trinomio cuadrado perfecto.",
            "El signo del medio es negativo: $4x^2 - 12x + 9 = (2x - 3)^2$.",
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "El cuadrado de una suma",
          md: "$(a + b)^2$ no es $a^2 + b^2$. Falta el doble producto $2ab$. Por ejemplo, $(x + 3)^2 = x^2 + 6x + 9$ y no $x^2 + 9$.",
        },
        {
          type: "example",
          title: "Suma y diferencia de cubos",
          problem: "Factoriza $x^3 - 8$ y $27x^3 + 1$.",
          steps: [
            "$x^3 - 8 = x^3 - 2^3$. Con $a = x$ y $b = 2$: $(x - 2)(x^2 + 2x + 4)$.",
            "$27x^3 + 1 = (3x)^3 + 1^3$. Con $a = 3x$ y $b = 1$: $(3x + 1)(9x^2 - 3x + 1)$.",
            "Los trinomios que quedan no se factorizan más. Vas a ver por qué en la sección siguiente.",
          ],
        },
        {
          type: "note",
          tone: "tip",
          title: "Los signos de los cubos",
          md: "El binomio lleva el mismo signo que la expresión original. El trinomio lleva el signo contrario en el término del medio, y su último término siempre es positivo.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Factoriza $x^2 - 49$.",
            parts: [{ kind: "expr", before: "x^{2} - 49 =", answer: "(x - 7)(x + 7)", vars: ["x"], validate: fullyFactored }],
            solution: ["$x^2 - 49 = x^2 - 7^2$, una diferencia de cuadrados. Resultado: $(x - 7)(x + 7)$."],
          },
        },
      ],
    },
    {
      id: "trinomios",
      title: "Trinomios de segundo grado",
      blocks: [
        {
          type: "text",
          md: "Un trinomio como $x^2 + 5x + 6$ casi nunca es un cuadrado perfecto. Para factorizarlo hay que buscar dos números.",
        },
        {
          type: "definition",
          title: "Trinomio $x^2 + bx + c$",
          md: "Si encuentras dos números $m$ y $n$ tales que $$m \\cdot n = c \\qquad m + n = b$$ entonces $x^2 + bx + c = (x + m)(x + n)$.",
        },
        {
          type: "example",
          title: "Buscar los dos números",
          problem: "Factoriza $x^2 + x - 12$.",
          steps: [
            "Buscamos dos números que multiplicados den $-12$ y sumados den $1$.",
            "Como el producto es negativo, uno es positivo y el otro negativo. Probando parejas: $4 \\cdot (-3) = -12$ y $4 + (-3) = 1$.",
            "Resultado: $x^2 + x - 12 = (x + 4)(x - 3)$.",
          ],
        },
        {
          type: "note",
          tone: "tip",
          title: "Los signos te orientan",
          md: "- Si $c > 0$, los dos números tienen el mismo signo, que es el signo de $b$.\n- Si $c < 0$, tienen signos distintos, y el de mayor valor absoluto lleva el signo de $b$.",
        },
        {
          type: "widget",
          widget: {
            kind: "sliders",
            fn: "(x - r)(x + s)",
            params: [
              { name: "r", min: 0, max: 5, step: 1, value: 3 },
              { name: "s", min: 0, max: 5, step: 1, value: 2 },
            ],
            x: [-7, 7],
            y: [-8, 8],
            formula: "f(x) = (x - {r})(x + {s})",
          },
          caption: "La parábola corta el eje $x$ justo en $x = r$ y en $x = -s$. Cada corte con el eje corresponde a un factor: si la gráfica pasa por $x = 3$, el factor $(x - 3)$ está en el polinomio.",
        },
        { type: "heading", text: "Cuando el coeficiente de $x^2$ no es 1" },
        {
          type: "text",
          md: "Para $ax^2 + bx + c$ con $a \\neq 1$ hay dos caminos. El primero es el **método ac**: buscas dos números que multiplicados den $a \\cdot c$ y sumados den $b$, partes el término del medio en dos y agrupas.",
        },
        {
          type: "example",
          title: "Método ac",
          problem: "Factoriza $6x^2 + x - 2$.",
          steps: [
            "$a \\cdot c = 6 \\cdot (-2) = -12$. Dos números con producto $-12$ y suma $1$ son $4$ y $-3$.",
            "Partimos el término del medio: $6x^2 + 4x - 3x - 2$.",
            "Agrupamos: $2x(3x + 2) - 1(3x + 2)$.",
            "Sale el paréntesis común: $(3x + 2)(2x - 1)$.",
          ],
        },
        {
          type: "text",
          md: "El segundo camino usa las raíces. Si la ecuación $ax^2 + bx + c = 0$ tiene soluciones $x_1$ y $x_2$, entonces $$ax^2 + bx + c = a(x - x_1)(x - x_2)$$ Las soluciones salen de la fórmula general $x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$, que verás en el tema **Ecuaciones**. Si $b^2 - 4ac < 0$ no hay soluciones reales y el trinomio no se factoriza.",
        },
        {
          type: "example",
          title: "Con la fórmula general",
          problem: "Factoriza $2x^2 - 5x - 3$.",
          steps: [
            "$b^2 - 4ac = 25 + 24 = 49$, y $\\sqrt{49} = 7$.",
            "$x = \\dfrac{5 \\pm 7}{4}$, así que $x_1 = 3$ y $x_2 = -\\dfrac{1}{2}$.",
            "$2x^2 - 5x - 3 = 2(x - 3)\\left(x + \\dfrac{1}{2}\\right)$.",
            "Si metes el $2$ en el segundo paréntesis, queda sin fracciones: $(x - 3)(2x + 1)$.",
          ],
        },
        {
          type: "quick",
          exercise: {
            statement: "Factoriza $x^2 + 2x - 15$.",
            parts: [{ kind: "expr", before: "x^{2} + 2x - 15 =", answer: "(x + 5)(x - 3)", vars: ["x"], validate: fullyFactored }],
            hints: ["Dos números con producto $-15$ y suma $2$."],
            solution: ["$5 \\cdot (-3) = -15$ y $5 + (-3) = 2$. Resultado: $(x + 5)(x - 3)$."],
          },
        },
      ],
    },
    {
      id: "ruffini",
      title: "Teorema del factor, raíces racionales y Ruffini",
      blocks: [
        {
          type: "text",
          md: "Para grado 3 o más no hay una fórmula práctica. La herramienta es encontrar una raíz, es decir, un número que al sustituirlo da cero, y dividir.",
        },
        {
          type: "definition",
          title: "Teorema del factor",
          md: "Si $P(a) = 0$, entonces $(x - a)$ es factor de $P(x)$. Y al revés: si $(x - a)$ es factor, $P(a) = 0$.\n\nMás en general, el **teorema del resto** dice que el residuo de dividir $P(x)$ entre $(x - a)$ es $P(a)$.",
        },
        {
          type: "definition",
          title: "Candidatos a raíz racional",
          md: "Si $P(x)$ tiene coeficientes enteros, sus raíces racionales están entre los números $\\pm\\dfrac{p}{q}$, donde $p$ divide al término independiente y $q$ divide al coeficiente principal. Si el coeficiente principal es $1$, basta con probar los divisores del término independiente.",
        },
        {
          type: "example",
          title: "Factorizar un polinomio de grado 3",
          problem: "Factoriza $P(x) = x^3 - 2x^2 - 5x + 6$.",
          steps: [
            "Candidatos: los divisores de $6$, o sea $\\pm 1, \\pm 2, \\pm 3, \\pm 6$.",
            "Probamos $x = 1$: $P(1) = 1 - 2 - 5 + 6 = 0$. Entonces $(x - 1)$ es factor.",
            "Dividimos con Ruffini (tabla de abajo). Bajas el primer coeficiente, lo multiplicas por $1$, lo sumas al siguiente y repites. La última fila da el cociente $x^2 - x - 6$ y el residuo $0$.",
            "El cociente es un trinomio: $x^2 - x - 6 = (x - 3)(x + 2)$.",
          ],
          answer: "$P(x) = (x - 1)(x - 3)(x + 2)$",
        },
        {
          type: "text",
          md: "$$\\begin{array}{c|rrrr} & 1 & -2 & -5 & 6 \\\\ 1 & & 1 & -1 & -6 \\\\ \\hline & 1 & -1 & -6 & 0 \\end{array}$$\n\nEsa es la tabla de Ruffini con $x = 1$. Arriba van los coeficientes de $P$, en el medio los productos y abajo las sumas. El último número es el residuo.",
        },
        {
          type: "note",
          tone: "warning",
          title: "No te saltes coeficientes",
          md: "Si falta una potencia, su coeficiente es $0$ y tiene que ir en la tabla. Para $x^3 - 7x + 6$ los coeficientes son $1, 0, -7, 6$.",
        },
        {
          type: "example",
          title: "Coeficiente principal distinto de 1",
          problem: "Factoriza $P(x) = 2x^3 - 3x^2 - 3x + 2$.",
          steps: [
            "Candidatos: $\\pm 1, \\pm 2, \\pm \\frac{1}{2}$.",
            "$P(2) = 16 - 12 - 6 + 2 = 0$. Ruffini con $2$ sobre $2, -3, -3, 2$ da la fila $2, 1, -1, 0$. El cociente es $2x^2 + x - 1$.",
            "Para $2x^2 + x - 1$, método ac: $a \\cdot c = -2$, los números son $2$ y $-1$. Queda $2x^2 + 2x - x - 1 = 2x(x + 1) - (x + 1) = (x + 1)(2x - 1)$.",
          ],
          answer: "$P(x) = (x - 2)(x + 1)(2x - 1)$",
        },
        {
          type: "quick",
          exercise: {
            statement: "Sea $P(x) = x^3 - 4x^2 + x + 6$. ¿Es $(x - 2)$ un factor de $P(x)$?",
            parts: [trueFalse(true, "$P(2) = 8 - 16 + 2 + 6 = 0$, así que $(x - 2)$ sí es factor.")],
            solution: ["Por el teorema del factor basta calcular $P(2) = 8 - 16 + 2 + 6 = 0$. Como da cero, $(x - 2)$ es factor."],
          },
        },
      ],
    },
    {
      id: "estrategia",
      title: "Estrategia completa y para qué la vas a usar",
      blocks: [
        {
          type: "text",
          md: "Cuando te den un polinomio para factorizar, sigue este orden:\n\n- Saca factor común si lo hay.\n- Cuenta los términos. Con dos, piensa en diferencia de cuadrados o en suma o diferencia de cubos. Con tres, en trinomio cuadrado perfecto o en el método de los dos números. Con cuatro, en agrupación.\n- Si el grado es 3 o más y nada de lo anterior sirve, busca una raíz y usa Ruffini.\n- Revisa cada factor que quedó. Si alguno se puede seguir factorizando, sigue.",
        },
        {
          type: "example",
          title: "Varios pasos seguidos",
          problem: "Factoriza completamente $2x^3 - 8x$.",
          steps: [
            "Factor común $2x$: $2x(x^2 - 4)$.",
            "El paréntesis es una diferencia de cuadrados: $2x(x - 2)(x + 2)$.",
          ],
        },
        {
          type: "example",
          title: "Tomado de un parcial",
          problem: "Factoriza $x^3 - cx^2 - c^2x + c^3$, con $c \\neq 0$.",
          steps: [
            "Agrupa de a dos: $x^2(x - c) - c^2(x - c)$.",
            "Sale el paréntesis común: $(x - c)(x^2 - c^2)$.",
            "$x^2 - c^2$ es diferencia de cuadrados: $(x - c)(x - c)(x + c) = (x - c)^2(x + c)$.",
          ],
          answer: "$(x - c)^2(x + c)$. En el parcial era el denominador de un límite con $x \\to c$, y factorizado se ve de inmediato qué factor produce el cero.",
        },
        {
          type: "example",
          title: "Factorizar para simplificar",
          problem: "Simplifica $\\dfrac{x^2 - 4}{x^2 - x - 2}$.",
          steps: [
            "Numerador: $(x - 2)(x + 2)$. Denominador: $(x - 2)(x + 1)$.",
            "Se cancela el factor común $(x - 2)$, válido para $x \\neq 2$: queda $\\dfrac{x + 2}{x + 1}$.",
            "En el tema de límites vas a calcular este límite cuando $x \\to 2$. Sin factorizar da $\\frac{0}{0}$. Simplificado da $\\frac{4}{3}$.",
          ],
        },
        {
          type: "note",
          tone: "econ",
          title: "Utilidad y punto de equilibrio",
          md: "Supón que la utilidad de una empresa es $U(q) = -q^2 + 10q - 16$, en miles de dólares (números inventados para el ejemplo). Factorizar dice cuándo no gana ni pierde: $U(q) = -(q^2 - 10q + 16) = -(q - 2)(q - 8)$. La utilidad es cero en $q = 2$ y en $q = 8$, y entre esos dos niveles de producción es positiva.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Factoriza completamente $3x^3 - 12x$.",
            parts: [{ kind: "expr", before: "3x^{3} - 12x =", answer: "3x(x - 2)(x + 2)", vars: ["x"], validate: fullyFactored }],
            hints: ["Primero el factor común, después mira qué quedó en el paréntesis."],
            solution: ["Factor común $3x$: $3x(x^2 - 4)$.", "Diferencia de cuadrados: $3x(x - 2)(x + 2)$."],
          },
        },
      ],
    },
  ],
  exercises: [
    factorComun,
    difCuadrados,
    trinomioMonico,
    cuadradoPerfecto,
    resto,
    trinomioGeneral,
    agrupacion,
    cubos,
    utilidadCero,
    ruffiniCubico,
    ruffiniGuiado,
    factorizacionCompleta,
  ],
};

export default topic;
