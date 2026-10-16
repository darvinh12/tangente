import { meta } from "../catalog";
import { choice, trueFalse } from "../helpers";
import type { ExerciseGen, Rich, Topic } from "../types";
import { evaluate, type Ast } from "@/lib/math/parse";
import { R, minusPoints, unionTex } from "@/lib/math/intervals";
import { fmt, frac, gcd, minus, poly, terms } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

function polyMul(a: number[], b: number[]): number[] {
  const out = Array(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => (out[i + j] += x * y)));
  return out;
}

function fromRoots(roots: number[]): number[] {
  return roots.reduce((acc, r) => polyMul(acc, [1, -r]), [1]);
}

/** Producto de factores (x - r) con los repetidos agrupados. */
function rootsTex(roots: number[]): string {
  const counts = new Map<number, number>();
  for (const r of [...roots].sort((a, b) => (a === 0 ? -1 : b === 0 ? 1 : a - b))) counts.set(r, (counts.get(r) ?? 0) + 1);
  return [...counts]
    .map(([r, m]) => {
      const f = r === 0 ? "x" : `(${minus("x", r)})`;
      return m === 1 ? f : `${f}^{${m}}`;
    })
    .join("");
}

const setTex = (xs: number[]) => `\\{${xs.map(fmt).join(", ")}\\}`;

/** a(x - q) escrito sin paréntesis de más. */
function times(a: number, q: number): string {
  const c = a === 1 ? "" : String(a);
  return q === 0 ? `${c}x` : `${c}(${minus("x", q)})`;
}

function hasRoot(a: Ast): boolean {
  switch (a.t) {
    case "root":
      return true;
    case "bin": {
      if (a.op === "^") {
        const e = evaluate(a.b);
        if (Number.isFinite(e) && !Number.isInteger(e)) return true;
      }
      return hasRoot(a.a) || hasRoot(a.b);
    }
    case "neg":
    case "abs":
    case "fact":
    case "fn":
      return hasRoot(a.a);
    default:
      return false;
  }
}

function rootInDen(a: Ast): boolean {
  switch (a.t) {
    case "bin":
      if (a.op === "/" && hasRoot(a.b)) return true;
      if (a.op === "^" && evaluate(a.b) < 0 && (hasRoot(a.a) || !Number.isInteger(evaluate(a.b)))) return true;
      return rootInDen(a.a) || rootInDen(a.b);
    case "neg":
    case "abs":
    case "fact":
    case "fn":
    case "root":
      return rootInDen(a.a);
    default:
      return false;
  }
}

/** La respuesta no puede dejar raíces en el denominador. */
const noRootBelow = (ast: Ast) =>
  rootInDen(ast) ? "Todavía queda una raíz en el denominador. Multiplica arriba y abajo por la raíz o por el conjugado." : null;

/** La respuesta tiene que existir en los puntos donde se canceló un factor. */
const noHoleAt = (pts: number[]) => (ast: Ast) =>
  pts.some((p) => !Number.isFinite(evaluate(ast, { x: p })))
    ? "Todavía queda un factor que se anula arriba y abajo. Factoriza y cancélalo."
    : null;

/** Exige una sola fracción. */
const singleFraction = (ast: Ast) => {
  let a = ast;
  while (a.t === "neg") a = a.a;
  return a.t === "bin" && a.op === "/" ? null : "Escribe el resultado como una sola fracción, con un solo numerador y un solo denominador.";
};

/* ----------------------------------- ejercicios ----------------------------------- */

const dominio: ExerciseGen = {
  id: "dominio-fraccion",
  title: "Dónde existe una fracción algebraica",
  level: 1,
  generate: (r) => {
    const v = r.int(1, 3);
    let den: string;
    let roots: number[];
    let steps: Rich[];
    if (v === 1) {
      let r1: number, r2: number;
      do {
        r1 = r.int(-6, 6);
        r2 = r.int(-6, 6);
      } while (r1 >= r2 || r1 + r2 === 0);
      roots = [r1, r2];
      den = poly(fromRoots(roots));
      steps = [`Igualamos el denominador a cero: $${den} = 0$.`, `Factorizando: $${rootsTex(roots)} = 0$, así que $x = ${r1}$ o $x = ${r2}$.`];
    } else if (v === 2) {
      const a = r.int(1, 7);
      roots = [-a, a];
      den = `x^{2} - ${a * a}`;
      steps = [`Igualamos el denominador a cero: $x^{2} - ${a * a} = 0$.`, `Es diferencia de cuadrados: $(x - ${a})(x + ${a}) = 0$, así que $x = ${a}$ o $x = ${-a}$.`];
    } else {
      const p = r.int(2, 5);
      let q: number;
      do q = r.nz(-7, 7);
      while (gcd(p, q) !== 1);
      roots = [q / p];
      den = poly([p, -q]);
      steps = [`Igualamos el denominador a cero: $${den} = 0$.`, `Despejando: $x = ${frac(q, p)}$.`];
    }
    let n: number;
    do n = r.nz(-6, 6);
    while (roots.includes(-n));
    const num = poly([1, n]);
    const answer = minusPoints(R, roots);
    const mistakes = [
      { answer: minusPoints(R, [...roots, -n]), feedback: `También quitaste $x = ${-n}$, que anula el numerador. Eso no molesta: un numerador cero da una fracción que vale cero. Solo se excluyen las raíces del denominador.` },
    ];
    if (roots.length === 2 && roots[0] + roots[1] !== 0) {
      mistakes.push({ answer: minusPoints(R, roots.map((x) => -x)), feedback: "Revisa los signos. El factor $(x - a)$ se anula en $x = a$, no en $x = -a$." });
    }
    return {
      statement: `Halla el dominio de $\\dfrac{${num}}{${den}}$.`,
      parts: [{ kind: "interval", before: "D =", answer, mistakes }],
      hints: ["Busca los valores de $x$ que hacen cero el denominador.", "El numerador no restringe nada."],
      solution: [...steps, `Esos valores quedan fuera: $D = \\mathbb{R} - ${setTex(roots)} = ${unionTex(answer)}$.`],
    };
  },
};

const simplificarBasica: ExerciseGen = {
  id: "simplificar",
  title: "Simplificar factorizando",
  level: 1,
  generate: (r) => {
    const v = r.int(1, 3);
    const h = r.nz(-6, 6);
    let num: string, den: string, answer: string;
    let steps: Rich[];
    const mistakes: { answer: string; feedback: Rich }[] = [];
    if (v === 1) {
      let p: number;
      do p = r.int(-6, 6);
      while (p === h);
      num = poly(fromRoots([h, p]));
      den = minus("x", h);
      answer = minus("x", p);
      steps = [`Factorizamos el numerador: $${num} = ${rootsTex([h, p])}$.`, `Cancelamos el factor $(${minus("x", h)})$, que está arriba y abajo.`];
    } else if (v === 2) {
      let p: number, s: number;
      do {
        p = r.int(-6, 6);
        s = r.nz(-6, 6);
      } while (p === h || s === h || p === s);
      num = poly(fromRoots([h, p]));
      den = poly(fromRoots([h, s]));
      answer = `\\frac{${minus("x", p)}}{${minus("x", s)}}`;
      steps = [`Numerador: $${num} = ${rootsTex([h, p])}$.`, `Denominador: $${den} = ${rootsTex([h, s])}$.`, `Cancelamos el factor común $(${minus("x", h)})$.`];
      if (p !== 0) mistakes.push({ answer: frac(p, s), feedback: "Tachaste las $x$. Solo se cancelan factores completos, y aquí la $x$ está sumando." });
    } else {
      num = poly([1, -h, 0]);
      den = `x^{2} - ${h * h}`;
      answer = `\\frac{x}{${minus("x", -h)}}`;
      steps = [`Numerador: $${num} = x(${minus("x", h)})$.`, `Denominador: $x^{2} - ${h * h} = (x - ${Math.abs(h)})(x + ${Math.abs(h)})$.`, `Cancelamos el factor común $(${minus("x", h)})$.`];
    }
    return {
      statement: `Simplifica $\\dfrac{${num}}{${den}}$.`,
      parts: [{ kind: "expr", answer, vars: ["x"], validate: noHoleAt([h]), mistakes }],
      hints: ["Factoriza el numerador y el denominador por separado.", "Tacha solo los factores que aparecen arriba y abajo."],
      solution: [...steps, `Resultado: $${answer}$, para $x \\neq ${h}$.`],
    };
  },
};

const erroresComunes: ExerciseGen = {
  id: "errores-comunes",
  title: "¿Se vale esta simplificación?",
  level: 1,
  generate: (r) => {
    const a = r.int(2, 9);
    let b: number;
    do b = r.int(2, 9);
    while (b === a);
    const n = r.pick([2, 3, 5, 6, 7, 10]);
    const claims: { tex: string; ok: boolean; why: Rich }[] = [
      { tex: `\\dfrac{x + ${a}}{x + ${b}} = \\dfrac{${a}}{${b}}`, ok: false, why: "La $x$ está sumando, no multiplicando, así que no se puede tachar. Prueba con $x = 1$ y verás que no da lo mismo." },
      { tex: `\\dfrac{${a}x + ${a * b}}{${a}} = x + ${b}`, ok: true, why: `El numerador es $${a}(x + ${b})$, y el factor $${a}$ se cancela con el denominador.` },
      { tex: `\\dfrac{x^{2} + ${a}}{x} = x + ${a}`, ok: false, why: `La $x$ del denominador divide a los dos términos: $\\dfrac{x^2}{x} + \\dfrac{${a}}{x} = x + \\dfrac{${a}}{x}$.` },
      { tex: `\\dfrac{${a} - x}{x - ${a}} = -1 \\text{ para } x \\neq ${a}`, ok: true, why: `$${a} - x = -(x - ${a})$, así que el cociente vale $-1$.` },
      { tex: `\\dfrac{1}{x} + \\dfrac{1}{${a}} = \\dfrac{1}{x + ${a}}`, ok: false, why: `Las fracciones no se suman sumando denominadores. Lo correcto es $\\dfrac{${a} + x}{${a}x}$.` },
      { tex: `\\dfrac{x^{2} - ${a * a}}{x - ${a}} = x + ${a} \\text{ para } x \\neq ${a}`, ok: true, why: `$x^2 - ${a * a} = (x - ${a})(x + ${a})$ y el factor $(x - ${a})$ se cancela.` },
      { tex: `\\sqrt{x^{2} + ${a * a}} = x + ${a}`, ok: false, why: `La raíz no se reparte en una suma. Con $x = 1$: $\\sqrt{${1 + a * a}}$ no es $${1 + a}$.` },
      { tex: `\\dfrac{${n}}{\\sqrt{${n}}} = \\sqrt{${n}}`, ok: true, why: `$${n} = \\sqrt{${n}} \\cdot \\sqrt{${n}}$, así que se cancela una de las raíces.` },
    ];
    const c = r.pick(claims);
    return {
      statement: `¿Es cierto que $${c.tex}$?`,
      parts: [trueFalse(c.ok, c.why)],
      hints: ["Solo se cancelan factores, es decir, cosas que están multiplicando a todo el numerador y a todo el denominador.", "Si dudas, prueba con un número concreto en lugar de $x$."],
      solution: [`${c.ok ? "Verdadero" : "Falso"}. ${c.why}`],
    };
  },
};

const conjugado: ExerciseGen = {
  id: "conjugado",
  title: "Elegir el conjugado",
  level: 1,
  generate: (r) => {
    const a = r.int(1, 9);
    const m = r.int(0, 6);
    const inner = m === 0 ? "x" : `x + ${m}`;
    const s = r.sign();
    const E = `\\sqrt{${inner}} ${s > 0 ? "+" : "-"} ${a}`;
    const conj = `\\sqrt{${inner}} ${s > 0 ? "-" : "+"} ${a}`;
    const inDen = r.bool();
    const k = r.int(1, 9);
    const statement = inDen
      ? `Para racionalizar $\\dfrac{${k}}{${E}}$, ¿por qué expresión multiplicas el numerador y el denominador?`
      : `Para racionalizar el numerador de $\\dfrac{${E}}{x}$, ¿por qué expresión multiplicas el numerador y el denominador?`;
    const prod = m === 0 ? `x - ${a * a}` : `(${inner}) - ${a * a} = ${poly([1, m - a * a])}`;
    return {
      statement,
      parts: [
        choice(`$${conj}$`, [
          [`$${E}$`, "Multiplicar por la misma expresión la eleva al cuadrado, y la raíz sigue apareciendo en el término del medio."],
          [`$\\sqrt{${inner}}$`, `La raíz se multiplica también por el $${a}$ y vuelve a aparecer.`],
          [`$${poly([1, m - a * a])}$`, "Eso es lo que queda después de multiplicar por el conjugado, no el conjugado."],
        ]),
      ],
      hints: ["El conjugado cambia solo el signo del medio."],
      solution: [`El conjugado de $${E}$ es $${conj}$, porque $(${E})(${conj}) = ${prod}$ y la raíz desaparece.`],
    };
  },
};

const racionalizarMonomio: ExerciseGen = {
  id: "racionalizar-monomio",
  title: "Racionalizar una raíz sola en el denominador",
  level: 1,
  generate: (r) => {
    const n = r.pick([2, 3, 5, 6, 7, 10]);
    const M = r.pick([1, 1, 2, 3]);
    const k = r.int(1, 12);
    const g = gcd(k, M * n);
    const top = k / g;
    const bot = (M * n) / g;
    const rt = `\\sqrt{${n}}`;
    const answer = bot === 1 ? `${top === 1 ? "" : top}${rt}` : `\\frac{${top === 1 ? "" : top}${rt}}{${bot}}`;
    const Mtex = M === 1 ? "" : String(M);
    return {
      statement: `Racionaliza $\\dfrac{${k}}{${Mtex}${rt}}$ y simplifica.`,
      parts: [
        {
          kind: "expr",
          answer,
          validate: noRootBelow,
          mistakes: [{ answer: M === 1 ? `${k}${rt}` : `\\frac{${k}${rt}}{${M}}`, feedback: `Abajo queda $${rt} \\cdot ${rt} = ${n}$. Te faltó dividir entre $${n}$.` }],
        },
      ],
      hints: [`Multiplica arriba y abajo por $${rt}$.`, `Recuerda que $${rt} \\cdot ${rt} = ${n}$.`],
      solution: [
        `Multiplicamos arriba y abajo por $${rt}$: $\\dfrac{${k}${rt}}{${Mtex}${rt} \\cdot ${rt}} = \\dfrac{${k}${rt}}{${M * n}}$.`,
        `Simplificamos la fracción de números: $${answer}$.`,
      ],
    };
  },
};

const multiplicarDividir: ExerciseGen = {
  id: "multiplicar-dividir",
  title: "Multiplicar y dividir fracciones algebraicas",
  level: 2,
  generate: (r) => {
    if (r.bool()) {
      const p = r.int(1, 6);
      let s: number;
      do s = r.nz(-6, 6);
      while (Math.abs(s) === p);
      const d1 = poly([1, -s, 0]);
      const answer = `\\frac{x - ${p}}{${minus("x", s)}}`;
      return {
        statement: `Calcula y simplifica $\\dfrac{x^{2} - ${p * p}}{${d1}} \\cdot \\dfrac{x}{x + ${p}}$.`,
        parts: [{ kind: "expr", answer, vars: ["x"], validate: noHoleAt([0, -p]) }],
        hints: ["Factoriza todo antes de multiplicar.", "Cancela los factores que estén arriba y abajo."],
        solution: [
          `Factorizamos: $x^{2} - ${p * p} = (x - ${p})(x + ${p})$ y $${d1} = x(${minus("x", s)})$.`,
          `Juntamos en una sola fracción: $\\dfrac{(x - ${p})(x + ${p}) \\cdot x}{x(${minus("x", s)})(x + ${p})}$.`,
          `Cancelamos $x$ y $(x + ${p})$. Resultado: $${answer}$.`,
        ],
      };
    }
    const s = r.int(1, 6);
    let r1: number, r2: number;
    do {
      r1 = r.nz(-6, 6);
      r2 = r.nz(-6, 6);
    } while (r1 === r2 || Math.abs(r1) === s || Math.abs(r2) === s);
    const n1 = poly(fromRoots([r1, r2]));
    const answer = `\\frac{${minus("x", r2)}}{x - ${s}}`;
    return {
      statement: `Calcula y simplifica $\\dfrac{${n1}}{x^{2} - ${s * s}} \\div \\dfrac{${minus("x", r1)}}{x + ${s}}$.`,
      parts: [
        {
          kind: "expr",
          answer,
          vars: ["x"],
          validate: noHoleAt([r1, -s]),
          mistakes: [{ answer: `\\frac{(${minus("x", r1)})^{2}(${minus("x", r2)})}{(x - ${s})(x + ${s})^{2}}`, feedback: "Multiplicaste sin invertir. Para dividir se multiplica por la segunda fracción dada vuelta." }],
        },
      ],
      hints: ["Dividir es multiplicar por la fracción invertida.", "Factoriza todo y cancela antes de multiplicar."],
      solution: [
        `Invertimos la segunda fracción: $\\dfrac{${n1}}{x^{2} - ${s * s}} \\cdot \\dfrac{x + ${s}}{${minus("x", r1)}}$.`,
        `Factorizamos: $\\dfrac{${rootsTex([r1, r2])}}{(x - ${s})(x + ${s})} \\cdot \\dfrac{x + ${s}}{${minus("x", r1)}}$.`,
        `Cancelamos $(${minus("x", r1)})$ y $(x + ${s})$. Resultado: $${answer}$.`,
      ],
    };
  },
};

const sumaResta: ExerciseGen = {
  id: "suma-resta",
  title: "Sumar y restar con denominador común",
  level: 2,
  generate: (r) => {
    const op = r.pick(["+", "-"] as const);
    const sg = op === "+" ? 1 : -1;
    const a = r.int(1, 5);
    const b = r.int(1, 5);
    let p: number, q: number;
    do {
      p = r.int(-5, 5);
      q = r.int(-5, 5);
    } while (p === q);
    const A = a + sg * b;
    const B = -(a * q) + sg * -(b * p);
    const den = rootsTex([p, q]);
    const answer = `\\frac{${poly([A, B])}}{${den}}`;
    const mistakes: { answer: string; feedback: Rich }[] = [
      { answer: `\\frac{${a + sg * b}}{${poly([2, -(p + q)])}}`, feedback: "Sumaste numerador con numerador y denominador con denominador. Así no se suman fracciones: hace falta un denominador común." },
    ];
    if (op === "-" && p !== 0) {
      mistakes.push({ answer: `\\frac{${poly([a - b, -a * q - b * p])}}{${den}}`, feedback: "El signo menos afecta a todo el segundo numerador. Pon paréntesis antes de restar." });
    }
    const expand = `${terms([[a, "x"], [-a * q, ""]])} ${op === "+" ? "+ " : "- ("}${terms([[b, "x"], [-b * p, ""]])}${op === "-" ? ")" : ""}`;
    return {
      statement: `Calcula $\\dfrac{${a}}{${minus("x", p)}} ${op} \\dfrac{${b}}{${minus("x", q)}}$ y escribe el resultado como una sola fracción.`,
      parts: [{ kind: "expr", answer, vars: ["x"], validate: singleFraction, mistakes }],
      hints: ["Los denominadores no tienen factores comunes, así que el mcm es su producto.", "Amplía cada fracción para que tenga ese denominador y después opera los numeradores."],
      solution: [
        `El mcm de los denominadores es $${den}$.`,
        `Ampliamos: $\\dfrac{${times(a, q)} ${op} ${times(b, p)}}{${den}}$.`,
        `Numerador: $${expand} = ${poly([A, B])}$.`,
        `Resultado: $${answer}$.`,
      ],
    };
  },
};

const fraccionCompleja: ExerciseGen = {
  id: "fraccion-compleja",
  title: "Fracciones complejas",
  level: 2,
  generate: (r) => {
    const v = r.int(1, 3);
    if (v === 1) {
      const a = r.int(2, 6);
      const answer = `-\\frac{1}{${a}x}`;
      return {
        statement: `Simplifica $\\dfrac{\\dfrac{1}{x} - \\dfrac{1}{${a}}}{x - ${a}}$.`,
        parts: [{ kind: "expr", answer, vars: ["x"], maxOps: 3, mistakes: [{ answer: `\\frac{1}{${a}x}`, feedback: `Se te perdió un signo. $${a} - x = -(x - ${a})$.` }] }],
        hints: ["Primero escribe el numerador como una sola fracción.", `Fíjate que $${a} - x$ y $x - ${a}$ son opuestos.`],
        solution: [
          `Numerador: $\\dfrac{1}{x} - \\dfrac{1}{${a}} = \\dfrac{${a} - x}{${a}x}$.`,
          `Dividir entre $x - ${a}$ es multiplicar por $\\dfrac{1}{x - ${a}}$: $\\dfrac{${a} - x}{${a}x(x - ${a})}$.`,
          `Como $${a} - x = -(x - ${a})$, se cancela dejando un signo menos: $${answer}$.`,
        ],
      };
    }
    if (v === 2) {
      const a = r.int(1, 6);
      const answer = `\\frac{x + ${a}}{x}`;
      return {
        statement: `Simplifica $\\dfrac{1 - \\dfrac{${a * a}}{x^{2}}}{1 - \\dfrac{${a}}{x}}$.`,
        parts: [{ kind: "expr", answer, vars: ["x"], maxOps: 3 }],
        hints: ["Multiplica arriba y abajo por $x^2$, el mcm de los denominadores pequeños.", "Después factoriza y cancela."],
        solution: [
          `Multiplicamos arriba y abajo por $x^{2}$: $\\dfrac{x^{2} - ${a * a}}{x^{2} - ${a}x}$.`,
          `Factorizamos: $\\dfrac{(x - ${a})(x + ${a})}{x(x - ${a})}$.`,
          `Cancelamos $(x - ${a})$. Resultado: $${answer}$.`,
        ],
      };
    }
    const k = r.int(1, 5);
    const answer = `-\\frac{${k}}{x(x + h)}`;
    return {
      statement: `Simplifica $\\dfrac{\\dfrac{${k}}{x + h} - \\dfrac{${k}}{x}}{h}$. Esta expresión aparece al derivar $\\dfrac{${k}}{x}$ con la definición.`,
      parts: [{ kind: "expr", answer, vars: ["x", "h"], maxOps: 4, mistakes: [{ answer: `\\frac{${k}}{x(x + h)}`, feedback: "Revisa el signo del numerador: $x - (x + h) = -h$." }] }],
      hints: ["Resta las dos fracciones de arriba con denominador común $x(x + h)$.", "El numerador queda proporcional a $h$, y esa $h$ se cancela con la de abajo."],
      solution: [
        `Numerador: $\\dfrac{${k}}{x + h} - \\dfrac{${k}}{x} = \\dfrac{${k}x - ${k}(x + h)}{x(x + h)} = \\dfrac{-${k}h}{x(x + h)}$.`,
        `Dividir entre $h$ es multiplicar por $\\dfrac{1}{h}$: $\\dfrac{-${k}h}{x(x + h)h}$.`,
        `Cancelamos $h$. Resultado: $${answer}$.`,
      ],
    };
  },
};

const racionalizarBinomio: ExerciseGen = {
  id: "racionalizar-binomio",
  title: "Racionalizar con el conjugado",
  level: 2,
  generate: (r) => {
    const s = r.sign();
    if (r.bool(0.55)) {
      let m: number, n: number, d: number;
      do {
        m = r.int(1, 4);
        d = r.pick([-3, -2, -1, 1, 2, 3]);
        n = m * m + d;
      } while (n < 2 || Number.isInteger(Math.sqrt(n)));
      const t = r.pick([1, 2, 3]) * r.sign();
      const c = d * t;
      const den = `\\sqrt{${n}} ${s > 0 ? "+" : "-"} ${m}`;
      const conj = `\\sqrt{${n}} ${s > 0 ? "-" : "+"} ${m}`;
      const wrongConj = den;
      const answer = t === 1 ? conj : t === -1 ? `-\\sqrt{${n}} ${s > 0 ? "+" : "-"} ${m}` : `${t}(${conj})`;
      return {
        statement: `Racionaliza $\\dfrac{${c}}{${den}}$ y simplifica.`,
        parts: [
          {
            kind: "expr",
            answer,
            validate: noRootBelow,
            mistakes: [{ answer: t === 1 ? wrongConj : `${t}(${wrongConj})`, feedback: "El signo del medio quedó igual que en el denominador original. Al multiplicar por el conjugado ese signo cambia." }],
          },
        ],
        hints: [`Multiplica arriba y abajo por el conjugado $${conj}$.`, `Abajo queda $${n} - ${m * m} = ${d}$.`],
        solution: [
          `Multiplicamos por el conjugado: $\\dfrac{${c}(${conj})}{(${den})(${conj})}$.`,
          `Abajo: $(\\sqrt{${n}})^{2} - ${m}^{2} = ${n} - ${m * m} = ${d}$.`,
          `$\\dfrac{${c}}{${d}} = ${t}$, así que el resultado es $${answer}$.`,
        ],
      };
    }
    const a = r.int(1, 5);
    const den = `\\sqrt{x} ${s > 0 ? "+" : "-"} ${a}`;
    const conj = `\\sqrt{x} ${s > 0 ? "-" : "+"} ${a}`;
    return {
      statement: `Simplifica $\\dfrac{x - ${a * a}}{${den}}$ racionalizando el denominador.`,
      parts: [{ kind: "expr", answer: conj, vars: ["x"], domain: [0.3, 30], validate: noRootBelow, mistakes: [{ answer: den, feedback: "Al multiplicar por el conjugado, arriba queda el conjugado. Revisa el signo." }] }],
      hints: [`Multiplica arriba y abajo por $${conj}$.`, `Abajo queda $x - ${a * a}$, igual que el numerador.`],
      solution: [
        `Multiplicamos por el conjugado: $\\dfrac{(x - ${a * a})(${conj})}{(${den})(${conj})}$.`,
        `Abajo: $(\\sqrt{x})^{2} - ${a * a} = x - ${a * a}$.`,
        `Se cancela $x - ${a * a}$. Resultado: $${conj}$.`,
      ],
    };
  },
};

const simplificarEvaluar: ExerciseGen = {
  id: "simplificar-evaluar",
  title: "Quitar la indeterminación 0/0 factorizando (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const v = r.int(1, 3);
    let num: string, den: string, simp: string, value: string;
    let h: number;
    let steps: Rich[];
    if (v === 1) {
      h = r.nz(-5, 5);
      let p: number, s: number;
      do {
        p = r.int(-5, 5);
        s = r.int(-5, 5);
      } while (p === h || s === h || p === s);
      num = poly(fromRoots([h, p]));
      den = poly(fromRoots([h, s]));
      simp = `\\frac{${minus("x", p)}}{${minus("x", s)}}`;
      value = frac(h - p, h - s);
      steps = [`Factorizamos: $\\dfrac{${rootsTex([h, p])}}{${rootsTex([h, s])}}$.`, `Cancelamos $(${minus("x", h)})$: $${simp}$.`];
    } else if (v === 2) {
      h = r.pick([1, 2, 3]) * r.sign();
      num = poly([1, 0, 0, -(h ** 3)]);
      den = poly([1, 0, -h * h]);
      const tri = poly([1, h, h * h]);
      simp = `\\frac{${tri}}{${minus("x", -h)}}`;
      value = frac(3 * h * h, 2 * h);
      steps = [
        `El numerador es ${h > 0 ? "diferencia" : "suma"} de cubos: $${num} = (${minus("x", h)})(${tri})$.`,
        `El denominador es diferencia de cuadrados: $${den} = (${minus("x", h)})(${minus("x", -h)})$.`,
        `Cancelamos $(${minus("x", h)})$: $${simp}$.`,
      ];
    } else {
      h = r.nz(-3, 3);
      num = poly([3, -6 * h, 3 * h * h]);
      den = poly([1, -h, -h * h, h ** 3]);
      simp = `\\frac{3}{${minus("x", -h)}}`;
      value = frac(3, 2 * h);
      steps = [
        `Numerador: factor común $3$ y trinomio cuadrado perfecto, $3(${minus("x", h)})^{2}$.`,
        `Denominador por agrupación: $x^{2}(${minus("x", h)}) - ${h * h}(${minus("x", h)}) = (${minus("x", h)})^{2}(${minus("x", -h)})$.`,
        `Cancelamos $(${minus("x", h)})^{2}$: $${simp}$.`,
      ];
    }
    return {
      statement: `La expresión $E(x) = \\dfrac{${num}}{${den}}$ da $\\frac{0}{0}$ en $x = ${h}$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Simplifícala factorizando.", before: "E(x) =", answer: simp, vars: ["x"], validate: noHoleAt([h]) },
        { kind: "expr", prompt: `¿Cuánto vale la expresión simplificada en $x = ${h}$?`, answer: value, maxOps: 1 },
      ],
      hints: [`Si sustituir $x = ${h}$ da $\\frac{0}{0}$, el factor $(${minus("x", h)})$ está arriba y abajo.`, "Factoriza los dos polinomios. Ruffini con ese número sirve si no ves la forma."],
      solution: [...steps, `En $x = ${h}$ la expresión simplificada vale $${value}$. Ese número es $\\lim_{x \\to ${h}} E(x)$.`],
    };
  },
};

const racionalizarNumerador: ExerciseGen = {
  id: "racionalizar-numerador",
  title: "Racionalizar el numerador para quitar el 0/0 (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const v = r.int(1, 3);
    let k: number, m: number, c: number;
    let tex: string, simp: string, value: string;
    let domain: [number, number] | undefined;
    let steps: Rich[];
    if (v === 1) {
      k = r.int(1, 4) * r.sign();
      m = Math.abs(k) + r.int(1, 3);
      c = m * m - k * k;
      tex = `\\dfrac{\\sqrt{x^{2} + ${c}} - ${m}}{${minus("x", k)}}`;
      simp = `\\frac{${minus("x", -k)}}{\\sqrt{x^{2} + ${c}} + ${m}}`;
      value = frac(k, m);
      steps = [
        `Multiplicamos arriba y abajo por el conjugado del numerador, $\\sqrt{x^{2} + ${c}} + ${m}$.`,
        `Arriba queda $x^{2} + ${c} - ${m * m} = x^{2} - ${k * k} = (${minus("x", k)})(${minus("x", -k)})$.`,
        `Cancelamos $(${minus("x", k)})$: $${simp}$.`,
      ];
    } else if (v === 2) {
      k = r.int(-3, 5);
      m = r.int(1, 4);
      c = m * m - k;
      const inner = c === 0 ? "x" : c > 0 ? `x + ${c}` : `x - ${-c}`;
      tex = `\\dfrac{\\sqrt{${inner}} - ${m}}{${minus("x", k)}}`;
      simp = `\\frac{1}{\\sqrt{${inner}} + ${m}}`;
      value = frac(1, 2 * m);
      domain = [-c + 0.2, -c + 10];
      steps = [
        `Multiplicamos arriba y abajo por $\\sqrt{${inner}} + ${m}$.`,
        `Arriba queda $${inner} - ${m * m} = ${minus("x", k)}$, igual que el denominador.`,
        `Cancelamos $(${minus("x", k)})$: $${simp}$.`,
      ];
    } else {
      k = r.int(2, 8);
      m = r.int(1, 3);
      c = m * m - k;
      const inner = c > 0 ? `x + ${c}` : `x - ${-c}`;
      tex = `\\dfrac{${m} - \\sqrt{${inner}}}{x^{2} - ${k * k}}`;
      simp = `-\\frac{1}{(x + ${k})(${m} + \\sqrt{${inner}})}`;
      value = frac(-1, 4 * k * m);
      domain = [-c + 0.2, -c + 12];
      steps = [
        `Multiplicamos arriba y abajo por $${m} + \\sqrt{${inner}}$.`,
        `Arriba queda $${m * m} - (${inner}) = ${k} - x = -(x - ${k})$.`,
        `Abajo, $x^{2} - ${k * k} = (x - ${k})(x + ${k})$. Cancelamos $(x - ${k})$ y queda $${simp}$.`,
      ];
    }
    return {
      statement: `La expresión $E(x) = ${tex}$ da $\\frac{0}{0}$ en $x = ${k}$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Racionaliza el numerador y simplifica.", before: "E(x) =", answer: simp, vars: ["x"], domain, validate: noHoleAt([k]) },
        { kind: "expr", prompt: `¿Cuánto vale la expresión simplificada en $x = ${k}$?`, answer: value, maxOps: 1 },
      ],
      hints: ["Multiplica arriba y abajo por el conjugado del numerador. Abajo no desarrolles el producto.", `Después de multiplicar, el factor $(${minus("x", k)})$ aparece arriba y abajo.`],
      solution: [...steps, `En $x = ${k}$ vale $${value}$. Ese es el valor de $\\lim_{x \\to ${k}} E(x)$.`],
    };
  },
};

const sumaSimplifica: ExerciseGen = {
  id: "suma-simplifica",
  title: "Restar fracciones y simplificar (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    if (r.bool()) {
      const k = r.nz(-5, 5);
      const m = r.int(1, 4);
      const t = 2 * m * k;
      const tex = `\\dfrac{${m}}{${minus("x", k)}} ${t > 0 ? "-" : "+"} \\dfrac{${Math.abs(t)}}{x^{2} - ${k * k}}`;
      const simp = `\\frac{${m}}{${minus("x", -k)}}`;
      const value = frac(m, 2 * k);
      return {
        statement: `Sea $E(x) = ${tex}$.`,
        sequential: true,
        parts: [
          { kind: "expr", prompt: "Escribe $E(x)$ como una sola fracción simplificada.", before: "E(x) =", answer: simp, vars: ["x"], validate: noHoleAt([k]) },
          { kind: "expr", prompt: `¿Cuánto vale la forma simplificada en $x = ${k}$?`, answer: value, maxOps: 1 },
        ],
        hints: [`$x^{2} - ${k * k} = (${minus("x", k)})(${minus("x", -k)})$, así que ese es el denominador común.`, "Después de restar, factoriza el numerador."],
        solution: [
          `Denominador común: $(${minus("x", k)})(${minus("x", -k)})$.`,
          `$E(x) = \\dfrac{${m === 1 ? "" : m}(${minus("x", -k)}) - ${paren2(t)}}{(${minus("x", k)})(${minus("x", -k)})} = \\dfrac{${poly([m, -m * k])}}{(${minus("x", k)})(${minus("x", -k)})}$.`,
          `El numerador es $${m === 1 ? "" : m}(${minus("x", k)})$. Cancelamos y queda $${simp}$.`,
          `En $x = ${k}$ vale $${value}$, que es el límite de $E(x)$ cuando $x \\to ${k}$.`,
        ],
      };
    }
    const k = r.int(1, 3);
    const tex = `\\dfrac{1}{${k} - x} - \\dfrac{${3 * k * k}}{${k ** 3} - x^{3}}`;
    const tri = poly([1, k, k * k]);
    const simp = `-\\frac{x + ${2 * k}}{${tri}}`;
    const value = frac(-1, k);
    return {
      statement: `Sea $E(x) = ${tex}$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Escribe $E(x)$ como una sola fracción simplificada.", before: "E(x) =", answer: simp, vars: ["x"], validate: noHoleAt([k]) },
        { kind: "expr", prompt: `¿Cuánto vale la forma simplificada en $x = ${k}$?`, answer: value, maxOps: 1 },
      ],
      hints: [`$${k ** 3} - x^{3}$ es una diferencia de cubos: $(${k} - x)(${tri})$.`, `Al final, $x - ${k} = -(${k} - x)$.`],
      solution: [
        `$${k ** 3} - x^{3} = (${k} - x)(${tri})$, y ese es el denominador común.`,
        `$E(x) = \\dfrac{${tri} - ${3 * k * k}}{(${k} - x)(${tri})} = \\dfrac{${poly([1, k, -2 * k * k])}}{(${k} - x)(${tri})}$.`,
        `El numerador se factoriza: $${poly([1, k, -2 * k * k])} = (x - ${k})(x + ${2 * k})$. Como $x - ${k} = -(${k} - x)$, se cancela dejando un signo menos.`,
        `Resultado: $${simp}$. En $x = ${k}$ vale $${value}$.`,
      ],
    };
  },
};

/** Número restado con paréntesis si es negativo. */
function paren2(n: number): string {
  return n < 0 ? `(${n})` : String(n);
}

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("fracciones-algebraicas"),
  objectives: [
    "Hallar los valores que anulan el denominador y escribir el dominio de una fracción algebraica.",
    "Simplificar fracciones algebraicas factorizando y cancelando solo factores.",
    "Sumar, restar, multiplicar y dividir fracciones algebraicas, incluidas las fracciones complejas.",
    "Racionalizar denominadores y numeradores con el conjugado para quitar indeterminaciones $\\frac{0}{0}$.",
  ],
  sections: [
    {
      id: "que-es",
      title: "Qué es una fracción algebraica y dónde existe",
      blocks: [
        {
          type: "text",
          md: "Una fracción algebraica es un cociente de polinomios, como $\\dfrac{x + 1}{x^2 - 4}$. Funciona igual que una fracción de números, con una diferencia: como $x$ puede tomar muchos valores, hay que cuidar que el denominador nunca valga cero.\n\nDividir entre cero no está definido. Por eso, antes de operar, se buscan los valores de $x$ que anulan el denominador y se dejan por fuera.",
        },
        {
          type: "definition",
          title: "Dominio de una fracción algebraica",
          md: "El dominio de $\\dfrac{P(x)}{Q(x)}$ son todos los números reales menos las raíces del denominador: $$D = \\mathbb{R} - \\{x \\;/\\; Q(x) = 0\\}$$",
        },
        {
          type: "example",
          title: "Buscar los valores prohibidos",
          problem: "Halla el dominio de $\\dfrac{x + 1}{x^2 - 5x + 6}$.",
          steps: [
            "Igualamos el denominador a cero: $x^2 - 5x + 6 = 0$.",
            "Factorizando: $(x - 2)(x - 3) = 0$, así que $x = 2$ o $x = 3$.",
            "Esos dos valores quedan fuera del dominio.",
          ],
          answer: "$D = \\mathbb{R} - \\{2, 3\\} = (-\\infty, 2) \\cup (2, 3) \\cup (3, +\\infty)$",
        },
        {
          type: "graph",
          spec: {
            x: [-3, 7],
            y: [-6, 6],
            curves: [{ fn: "\\frac{1}{x-2}", breaks: [2], color: "accent" }],
            vlines: [{ x: 2, dashed: true, label: "x = 2" }],
          },
          caption: "La gráfica de $\\dfrac{1}{x - 2}$ se rompe en $x = 2$. Ahí el denominador vale cero y la expresión no existe.",
        },
        {
          type: "note",
          tone: "warning",
          title: "El numerador no restringe",
          md: "Que el numerador valga cero no es problema: $\\dfrac{0}{5} = 0$. En $\\dfrac{x + 1}{x^2 - 5x + 6}$ el valor $x = -1$ sí está en el dominio. Solo se excluyen las raíces del denominador.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Halla el dominio de $\\dfrac{x}{x^2 - 9}$.",
            parts: [{ kind: "interval", before: "D =", answer: minusPoints(R, [-3, 3]) }],
            solution: ["$x^2 - 9 = (x - 3)(x + 3)$ se anula en $x = 3$ y en $x = -3$.", "$D = (-\\infty, -3) \\cup (-3, 3) \\cup (3, +\\infty)$."],
          },
        },
      ],
    },
    {
      id: "simplificar",
      title: "Simplificar",
      blocks: [
        {
          type: "text",
          md: "Una fracción se simplifica dividiendo el numerador y el denominador entre un mismo factor. Con números: $\\dfrac{12}{18} = \\dfrac{2 \\cdot 6}{3 \\cdot 6} = \\dfrac{2}{3}$. Con polinomios es igual, pero primero hay que factorizar para que los factores queden a la vista.",
        },
        {
          type: "example",
          title: "Factorizar y cancelar",
          problem: "Simplifica $\\dfrac{x^2 - 9}{x^2 + x - 6}$.",
          steps: [
            "Numerador: diferencia de cuadrados, $(x - 3)(x + 3)$.",
            "Denominador: dos números con producto $-6$ y suma $1$, son $3$ y $-2$. Queda $(x + 3)(x - 2)$.",
            "Cancelamos el factor común $(x + 3)$: $\\dfrac{x - 3}{x - 2}$.",
            "La fracción original no existía en $x = -3$ ni en $x = 2$. La simplificada sí existe en $x = -3$, así que la igualdad vale para $x \\neq -3$.",
          ],
          answer: "$\\dfrac{x - 3}{x - 2}$, para $x \\neq -3$",
        },
        {
          type: "note",
          tone: "warning",
          title: "Solo se tachan factores",
          md: "En $\\dfrac{x + 2}{x + 5}$ no se puede tachar la $x$, porque está sumando y no multiplicando. Una prueba rápida: con $x = 1$ la fracción vale $\\frac{3}{6} = \\frac{1}{2}$, y $\\frac{2}{5}$ no es lo mismo.",
        },
        {
          type: "example",
          title: "Factores opuestos",
          problem: "Simplifica $\\dfrac{4 - x^2}{x^2 - x - 2}$.",
          steps: [
            "Numerador: $(2 - x)(2 + x)$. Denominador: $(x - 2)(x + 1)$.",
            "$2 - x$ y $x - 2$ son opuestos: $2 - x = -(x - 2)$.",
            "$\\dfrac{-(x - 2)(x + 2)}{(x - 2)(x + 1)} = -\\dfrac{x + 2}{x + 1}$.",
          ],
        },
        {
          type: "graph",
          spec: {
            x: [-4, 4],
            y: [-3, 5],
            curves: [{ fn: "\\frac{x^2-1}{x-1}", color: "accent" }],
            points: [{ x: 1, y: 2, open: true, label: "(1, 2)" }],
          },
          caption: "$\\dfrac{x^2 - 1}{x - 1}$ es la recta $y = x + 1$ con un hueco en $x = 1$. Simplificar quita el factor, pero el hueco sigue ahí. Lo que pasa cerca de ese hueco es lo que estudia un límite.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Simplifica $\\dfrac{x^2 - 4}{x + 2}$.",
            parts: [{ kind: "expr", answer: "x - 2", vars: ["x"], validate: noHoleAt([-2]) }],
            solution: ["$x^2 - 4 = (x - 2)(x + 2)$. Cancelando $(x + 2)$ queda $x - 2$, para $x \\neq -2$."],
          },
        },
      ],
    },
    {
      id: "multiplicar-dividir",
      title: "Multiplicar y dividir",
      blocks: [
        {
          type: "text",
          md: "Para multiplicar, se multiplica numerador por numerador y denominador por denominador. Para dividir, se multiplica por la segunda fracción invertida. El truco está en no desarrollar nada: factoriza todo primero y cancela antes de multiplicar.",
        },
        {
          type: "definition",
          title: "Producto y cociente",
          md: "$$\\frac{A}{B} \\cdot \\frac{C}{D} = \\frac{A \\cdot C}{B \\cdot D} \\qquad \\frac{A}{B} \\div \\frac{C}{D} = \\frac{A}{B} \\cdot \\frac{D}{C}$$",
        },
        {
          type: "example",
          title: "Multiplicar",
          problem: "Calcula $\\dfrac{x^2 - 4}{x + 3} \\cdot \\dfrac{x^2 + 3x}{x - 2}$.",
          steps: [
            "Factorizamos: $x^2 - 4 = (x - 2)(x + 2)$ y $x^2 + 3x = x(x + 3)$.",
            "Juntamos en una sola fracción: $\\dfrac{(x - 2)(x + 2) \\cdot x(x + 3)}{(x + 3)(x - 2)}$.",
            "Cancelamos $(x - 2)$ y $(x + 3)$.",
          ],
          answer: "$x(x + 2)$, para $x \\neq 2$ y $x \\neq -3$",
        },
        {
          type: "example",
          title: "Dividir",
          problem: "Calcula $\\dfrac{x^2 - 1}{x^2 + 2x} \\div \\dfrac{x + 1}{x}$.",
          steps: [
            "Invertimos la segunda: $\\dfrac{x^2 - 1}{x^2 + 2x} \\cdot \\dfrac{x}{x + 1}$.",
            "Factorizamos: $\\dfrac{(x - 1)(x + 1)}{x(x + 2)} \\cdot \\dfrac{x}{x + 1}$.",
            "Cancelamos $x$ y $(x + 1)$.",
          ],
          answer: "$\\dfrac{x - 1}{x + 2}$",
        },
        {
          type: "note",
          tone: "warning",
          title: "En la división hay una restricción más",
          md: "Al dividir entre $\\dfrac{x + 1}{x}$ también se excluye $x = -1$, porque ahí esa fracción vale cero y no se puede dividir entre cero.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula y simplifica $\\dfrac{x^2 - 9}{x} \\cdot \\dfrac{2x}{x + 3}$.",
            parts: [{ kind: "expr", answer: "2(x - 3)", vars: ["x"], validate: noHoleAt([0, -3]) }],
            solution: ["$\\dfrac{(x - 3)(x + 3) \\cdot 2x}{x(x + 3)}$. Cancelando $x$ y $(x + 3)$ queda $2(x - 3)$."],
          },
        },
      ],
    },
    {
      id: "sumar-restar",
      title: "Sumar y restar",
      blocks: [
        {
          type: "text",
          md: "Para sumar fracciones hace falta el mismo denominador. Con números buscas el mínimo común múltiplo: $\\frac{1}{4} + \\frac{1}{6} = \\frac{3}{12} + \\frac{2}{12} = \\frac{5}{12}$. Con polinomios, el mcm se arma factorizando los denominadores y tomando cada factor distinto con su mayor exponente.",
        },
        {
          type: "example",
          title: "Denominadores sin factores comunes",
          problem: "Calcula $\\dfrac{2}{x - 1} + \\dfrac{3}{x + 1}$.",
          steps: [
            "Los denominadores no comparten factores. El mcm es su producto: $(x - 1)(x + 1)$.",
            "Ampliamos cada fracción: $\\dfrac{2(x + 1)}{(x - 1)(x + 1)} + \\dfrac{3(x - 1)}{(x - 1)(x + 1)}$.",
            "Sumamos los numeradores: $2x + 2 + 3x - 3 = 5x - 1$.",
          ],
          answer: "$\\dfrac{5x - 1}{(x - 1)(x + 1)}$, que también se escribe $\\dfrac{5x - 1}{x^2 - 1}$",
        },
        {
          type: "example",
          title: "Un denominador contiene al otro",
          problem: "Calcula $\\dfrac{x}{x^2 - 4} - \\dfrac{1}{x - 2}$.",
          steps: [
            "$x^2 - 4 = (x - 2)(x + 2)$ ya contiene a $x - 2$. El mcm es $(x - 2)(x + 2)$.",
            "La segunda fracción se amplía por $(x + 2)$: $\\dfrac{x}{(x - 2)(x + 2)} - \\dfrac{x + 2}{(x - 2)(x + 2)}$.",
            "Restamos los numeradores con paréntesis: $x - (x + 2) = -2$.",
          ],
          answer: "$\\dfrac{-2}{(x - 2)(x + 2)}$",
        },
        {
          type: "note",
          tone: "warning",
          title: "El menos afecta a todo el numerador",
          md: "En el ejemplo anterior, $x - (x + 2) = -2$. Si escribes $x - x + 2$ te da $2$ y el resultado sale con el signo cambiado. Pon siempre paréntesis al restar un numerador.",
        },
        {
          type: "example",
          title: "Tomado de un parcial",
          problem: "Simplifica $\\dfrac{1}{1 - x} - \\dfrac{3}{1 - x^3}$.",
          steps: [
            "$1 - x^3$ es diferencia de cubos: $(1 - x)(1 + x + x^2)$. Ese es el mcm.",
            "Ampliamos la primera fracción y restamos: $\\dfrac{1 + x + x^2 - 3}{(1 - x)(1 + x + x^2)} = \\dfrac{x^2 + x - 2}{(1 - x)(1 + x + x^2)}$.",
            "Factorizamos el numerador: $x^2 + x - 2 = (x - 1)(x + 2)$. Como $x - 1 = -(1 - x)$, se cancela dejando un signo menos.",
          ],
          answer: "$-\\dfrac{x + 2}{x^2 + x + 1}$. El parcial pedía el límite cuando $x \\to 1$. Con esta forma basta sustituir: $-\\dfrac{3}{3} = -1$.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Costo promedio",
          md: "Si producir $q$ unidades cuesta $C(q) = 2q^2 + 5q + 50$ (números de ejemplo), el costo promedio por unidad es $$\\frac{C(q)}{q} = 2q + 5 + \\frac{50}{q}$$ Partir la fracción así muestra que el costo fijo de $50$ se reparte entre más unidades a medida que $q$ crece.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $\\dfrac{1}{x} + \\dfrac{1}{x + 1}$ y escríbelo como una sola fracción.",
            parts: [{ kind: "expr", answer: "\\frac{2x + 1}{x(x + 1)}", vars: ["x"], validate: singleFraction }],
            solution: ["El mcm es $x(x + 1)$.", "$\\dfrac{x + 1 + x}{x(x + 1)} = \\dfrac{2x + 1}{x(x + 1)}$."],
          },
        },
      ],
    },
    {
      id: "fracciones-complejas",
      title: "Fracciones complejas",
      blocks: [
        {
          type: "text",
          md: "Una fracción compleja tiene fracciones dentro del numerador, del denominador o de los dos. Aparece mucho cuando se calcula una derivada con la definición. Hay dos maneras de simplificarla:\n\n- Reducir el numerador a una sola fracción, hacer lo mismo con el denominador y después dividir.\n- Multiplicar arriba y abajo por el mcm de todos los denominadores pequeños.",
        },
        {
          type: "example",
          title: "Multiplicar por el mcm",
          problem: "Simplifica $\\dfrac{1 - \\dfrac{1}{x}}{1 - \\dfrac{1}{x^2}}$.",
          steps: [
            "El mcm de los denominadores pequeños es $x^2$. Multiplicamos arriba y abajo: $\\dfrac{x^2 - x}{x^2 - 1}$.",
            "Factorizamos: $\\dfrac{x(x - 1)}{(x - 1)(x + 1)}$.",
            "Cancelamos $(x - 1)$.",
          ],
          answer: "$\\dfrac{x}{x + 1}$",
        },
        {
          type: "example",
          title: "La que aparece al derivar 1/x",
          problem: "Simplifica $\\dfrac{\\dfrac{1}{x + h} - \\dfrac{1}{x}}{h}$.",
          steps: [
            "Numerador en una sola fracción: $\\dfrac{x - (x + h)}{x(x + h)} = \\dfrac{-h}{x(x + h)}$.",
            "Dividir entre $h$ es multiplicar por $\\dfrac{1}{h}$: $\\dfrac{-h}{x(x + h) \\cdot h}$.",
            "Cancelamos $h$.",
          ],
          answer: "$-\\dfrac{1}{x(x + h)}$. Cuando $h \\to 0$ esto se acerca a $-\\dfrac{1}{x^2}$, que es la derivada de $\\dfrac{1}{x}$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Una raya de fracción por nivel",
          md: "Escribe la raya principal más larga que las demás. $\\dfrac{a/b}{c}$ y $\\dfrac{a}{b/c}$ son cosas distintas: la primera es $\\dfrac{a}{bc}$ y la segunda es $\\dfrac{ac}{b}$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Simplifica $\\dfrac{\\dfrac{1}{x} - \\dfrac{1}{2}}{x - 2}$.",
            parts: [{ kind: "expr", answer: "-\\frac{1}{2x}", vars: ["x"], maxOps: 3 }],
            hints: ["$\\dfrac{1}{x} - \\dfrac{1}{2} = \\dfrac{2 - x}{2x}$."],
            solution: ["Numerador: $\\dfrac{2 - x}{2x}$.", "Dividiendo entre $x - 2$: $\\dfrac{2 - x}{2x(x - 2)} = -\\dfrac{1}{2x}$."],
          },
        },
      ],
    },
    {
      id: "racionalizar",
      title: "Racionalizar",
      blocks: [
        {
          type: "text",
          md: "Racionalizar es sacar una raíz de donde estorba. En los ejercicios de nivelación suele estorbar en el denominador. En los límites $\\frac{0}{0}$ con raíces estorba en el numerador. La técnica es la misma: multiplicar arriba y abajo por algo que haga desaparecer la raíz.",
        },
        {
          type: "definition",
          title: "Conjugado",
          md: "El conjugado de $a + b$ es $a - b$, y al revés. Su producto es una diferencia de cuadrados: $$(\\sqrt{A} - B)(\\sqrt{A} + B) = A - B^2$$ La raíz desaparece porque $(\\sqrt{A})^2 = A$.",
        },
        {
          type: "example",
          title: "Raíz sola en el denominador",
          problem: "Racionaliza $\\dfrac{6}{\\sqrt{3}}$.",
          steps: [
            "Multiplicamos arriba y abajo por $\\sqrt{3}$: $\\dfrac{6\\sqrt{3}}{\\sqrt{3} \\cdot \\sqrt{3}} = \\dfrac{6\\sqrt{3}}{3}$.",
            "Simplificamos: $2\\sqrt{3}$.",
          ],
        },
        {
          type: "example",
          title: "Binomio en el denominador",
          problem: "Racionaliza $\\dfrac{4}{\\sqrt{5} - 1}$.",
          steps: [
            "El conjugado de $\\sqrt{5} - 1$ es $\\sqrt{5} + 1$.",
            "$\\dfrac{4(\\sqrt{5} + 1)}{(\\sqrt{5} - 1)(\\sqrt{5} + 1)} = \\dfrac{4(\\sqrt{5} + 1)}{5 - 1}$.",
            "Simplificamos: $\\sqrt{5} + 1$.",
          ],
        },
        {
          type: "example",
          title: "Racionalizar el numerador, como en un límite",
          problem: "Reescribe $\\dfrac{\\sqrt{x + 4} - 2}{x}$ de modo que el denominador no se anule en $x = 0$.",
          steps: [
            "Multiplicamos arriba y abajo por el conjugado del numerador, $\\sqrt{x + 4} + 2$. Abajo no desarrollamos.",
            "Arriba queda $(\\sqrt{x + 4})^2 - 2^2 = x + 4 - 4 = x$.",
            "$\\dfrac{x}{x(\\sqrt{x + 4} + 2)} = \\dfrac{1}{\\sqrt{x + 4} + 2}$.",
          ],
          answer: "$\\dfrac{1}{\\sqrt{x + 4} + 2}$. En $x = 0$ vale $\\dfrac{1}{4}$, y ese es el valor de $\\lim_{x \\to 0} \\dfrac{\\sqrt{x + 4} - 2}{x}$.",
        },
        {
          type: "example",
          title: "Tomado de un parcial",
          problem: "Simplifica $\\dfrac{\\sqrt{x^2 + 5} - 3}{x - 2}$ para poder evaluarla en $x = 2$.",
          steps: [
            "Conjugado del numerador: $\\sqrt{x^2 + 5} + 3$.",
            "Arriba: $x^2 + 5 - 9 = x^2 - 4 = (x - 2)(x + 2)$.",
            "Cancelamos $(x - 2)$: $\\dfrac{x + 2}{\\sqrt{x^2 + 5} + 3}$.",
          ],
          answer: "En $x = 2$ vale $\\dfrac{4}{6} = \\dfrac{2}{3}$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "El conjugado solo cambia el signo del medio",
          md: "$(\\sqrt{x} + 3)^2$ no elimina la raíz: da $x + 6\\sqrt{x} + 9$. Lo que la elimina es $(\\sqrt{x} + 3)(\\sqrt{x} - 3) = x - 9$.",
        },
        {
          type: "note",
          tone: "tip",
          title: "Raíces cúbicas",
          md: "Para $\\sqrt[3]{A} - B$ el factor que elimina la raíz sale de la diferencia de cubos: $$\\begin{aligned} &(\\sqrt[3]{A} - B)\\left(\\sqrt[3]{A^2} + B\\sqrt[3]{A} + B^2\\right) \\\\ &= A - B^3 \\end{aligned}$$ Lo vas a necesitar en algunos límites de los parciales.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Racionaliza $\\dfrac{10}{\\sqrt{5}}$ y simplifica.",
            parts: [{ kind: "expr", answer: "2\\sqrt{5}", validate: noRootBelow }],
            solution: ["$\\dfrac{10\\sqrt{5}}{5} = 2\\sqrt{5}$."],
          },
        },
      ],
    },
  ],
  exercises: [
    dominio,
    simplificarBasica,
    erroresComunes,
    conjugado,
    racionalizarMonomio,
    multiplicarDividir,
    sumaResta,
    fraccionCompleja,
    racionalizarBinomio,
    simplificarEvaluar,
    racionalizarNumerador,
    sumaSimplifica,
  ],
};

export default topic;
