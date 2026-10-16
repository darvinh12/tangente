import { meta } from "../catalog";
import { choice, trueFalse, uniqueWrong } from "../helpers";
import type { ExerciseGen, Mistake, Rich, Topic } from "../types";
import { R, iv, minusPoints, signSolve, unionTex, type Interval } from "@/lib/math/intervals";
import { coef, frac, minus, num, poly, terms } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

/** \log para base 10 (convención de la cátedra), \log_{b} para las demás. */
const logTex = (b: number | string) => (b === 10 ? "\\log" : `\\log_{${b}}`);
const lin = (a: number, b: number) => terms([[a, "x"], [b, ""]]);
const sameSet = (a: Interval[], b: Interval[]) => unionTex(a) === unionTex(b);

/** Quita errores típicos que coinciden con la respuesta o se repiten. */
function keepNum(answer: number, list: [number, string, Rich][]): Mistake[] {
  const out: Mistake[] = [];
  const seen: number[] = [answer];
  for (const [v, tex, feedback] of list) {
    if (!Number.isFinite(v) || seen.some((s) => Math.abs(s - v) < 1e-9)) continue;
    seen.push(v);
    out.push({ answer: tex, feedback });
  }
  return out;
}

/** Como terms, pero con \cdot cuando la parte literal empieza con un dígito (5 \cdot 2^{x}). */
function sumTex(list: [number, string][]): string {
  const out: string[] = [];
  for (const [c, lit] of list) {
    if (c === 0) continue;
    const abs = Math.abs(c);
    const body = lit === "" ? String(abs) : abs === 1 ? lit : /^\d/.test(lit) ? `${abs} \\cdot ${lit}` : `${abs}${lit}`;
    out.push(out.length === 0 ? (c < 0 ? `-${body}` : body) : c < 0 ? `- ${body}` : `+ ${body}`);
  }
  return out.join(" ");
}

/** ln(t)/k escrito limpio. */
function lnOver(t: number, k: number): string {
  if (k === 1) return `\\ln ${t}`;
  if (k === -1) return `-\\ln ${t}`;
  return `${k < 0 ? "-" : ""}\\frac{\\ln ${t}}{${Math.abs(k)}}`;
}

/* ----------------------------------- ejercicios ----------------------------------- */

const evaluarLog: ExerciseGen = {
  id: "evaluar-log",
  title: "Calcular un logaritmo",
  level: 1,
  generate: (r) => {
    const b = r.pick([2, 3, 5, 10]);
    const maxK = b === 2 ? 6 : b === 3 ? 4 : b === 5 ? 3 : 4;
    const kind = r.pick(["pos", "pos", "neg", "raiz", "uno"] as const);
    let arg: string, ans: number, ansTex: string, why: string;
    const mistakes: [number, string, Rich][] = [];
    if (kind === "pos") {
      const k = r.int(1, maxK);
      arg = String(b ** k);
      ans = k;
      ansTex = String(k);
      why = `$${b}^{${k}} = ${b ** k}$`;
      mistakes.push([b ** k / b, String(b ** k / b), "El logaritmo no es una división. Pregunta a qué exponente hay que elevar la base."]);
    } else if (kind === "neg") {
      const k = r.int(1, Math.min(maxK, 3));
      arg = `\\frac{1}{${b ** k}}`;
      ans = -k;
      ansTex = String(-k);
      why = `$${b}^{-${k}} = \\frac{1}{${b}^{${k}}} = \\frac{1}{${b ** k}}$`;
      mistakes.push([k, String(k), `Revisa el signo. Para obtener una fracción $\\frac{1}{${b ** k}}$ el exponente tiene que ser negativo.`]);
    } else if (kind === "raiz") {
      const q = r.pick([2, 3]);
      arg = q === 2 ? `\\sqrt{${b}}` : `\\sqrt[3]{${b}}`;
      ans = 1 / q;
      ansTex = `\\frac{1}{${q}}`;
      why = `$${arg} = ${b}^{1/${q}}$`;
      mistakes.push([q, String(q), `Una raíz es un exponente fraccionario: $${arg} = ${b}^{1/${q}}$.`]);
    } else {
      arg = "1";
      ans = 0;
      ansTex = "0";
      why = `$${b}^{0} = 1$`;
      mistakes.push([1, "1", `$${b}^{1} = ${b}$, no $1$. Todo número (distinto de cero) elevado a la cero da $1$.`]);
    }
    return {
      statement: `Calcula $${logTex(b)} ${arg}$.`,
      parts: [{ kind: "expr", answer: ansTex, mistakes: keepNum(ans, mistakes) }],
      hints: [
        `Pregúntate: ¿a qué exponente hay que elevar $${b}$ para obtener $${arg}$?`,
        kind === "neg" ? "Recuerda que $b^{-n} = \\frac{1}{b^n}$." : kind === "raiz" ? "Recuerda que $\\sqrt[n]{b} = b^{1/n}$." : `Prueba con $${b}^1$, $${b}^2$, $${b}^3$, hasta llegar.`,
      ],
      solution: [
        `Buscamos el exponente $y$ tal que $${b}^{y} = ${arg}$.`,
        `Como ${why}, el exponente es $${ansTex}$.`,
        `$${logTex(b)} ${arg} = ${ansTex}$.`,
      ],
    };
  },
};

const formaExponencial: ExerciseGen = {
  id: "forma-exponencial",
  title: "De logaritmo a potencia y de vuelta",
  level: 1,
  generate: (r) => {
    const b = r.pick([2, 3, 4, 5, 10]);
    const c = r.int(2, b === 2 ? 6 : b === 10 ? 4 : 3);
    const a = b ** c;
    const toExp = r.bool();
    if (toExp) {
      const correct = `$${b}^{${c}} = ${a}$`;
      return {
        statement: `¿Qué igualdad equivale a $${logTex(b)} ${a} = ${c}$?`,
        parts: [
          choice(correct, uniqueWrong(correct, [
            [`$${c}^{${b}} = ${a}$`, "La base del logaritmo es la base de la potencia, y el resultado del logaritmo es el exponente."],
            [`$${a}^{${c}} = ${b}$`, "El argumento del logaritmo es el resultado de la potencia, no la base."],
            [`$${b}^{${a}} = ${c}$`, "El logaritmo es el exponente. Aquí el exponente es el resultado del logaritmo."],
          ] as [Rich, Rich][])),
        ],
        hints: ["$\\log_b x = y$ significa $b^y = x$. La base se queda como base y el logaritmo pasa a ser el exponente."],
        solution: [`$${logTex(b)} ${a} = ${c}$ dice que el exponente al que se eleva $${b}$ para obtener $${a}$ es $${c}$.`, `Es decir, ${correct}.`],
      };
    }
    const correct = `$${logTex(b)} ${a} = ${c}$`;
    return {
      statement: `¿Qué igualdad equivale a $${b}^{${c}} = ${a}$?`,
      parts: [
        choice(correct, uniqueWrong(correct, [
          [`$${logTex(b)} ${c} = ${a}$`, "El argumento del logaritmo es el resultado de la potencia, y el logaritmo da el exponente."],
          [`$${logTex(c)} ${a} = ${b}$`, "La base de la potencia es la base del logaritmo."],
          [`$${logTex(a)} ${b} = ${c}$`, "Cambiaste la base por el argumento."],
        ] as [Rich, Rich][])),
      ],
      hints: ["$b^y = x$ se escribe $\\log_b x = y$: el logaritmo es el exponente."],
      solution: [`En $${b}^{${c}} = ${a}$ la base es $${b}$, el exponente $${c}$ y el resultado $${a}$.`, `En forma de logaritmo: ${correct}.`],
    };
  },
};

const leyesPotencias: ExerciseGen = {
  id: "leyes-potencias",
  title: "Leyes de los exponentes",
  level: 1,
  generate: (r) => {
    const kind = r.pick(["cociente", "potencia", "raiz"] as const);
    let expr: string, ans: string, val: number, steps: string;
    const ms: [number, string, Rich][] = [];
    if (kind === "cociente") {
      const m = r.int(2, 7);
      const n = r.nz(-3, 6);
      const p = r.int(1, 9);
      expr = `\\dfrac{x^{${m}} \\cdot x^{${n}}}{${p === 1 ? "x" : `x^{${p}}`}}`;
      val = m + n - p;
      ans = String(val);
      steps = `Producto: se suman los exponentes, $${m} + ${n < 0 ? `(${n})` : n} = ${m + n}$. Cociente: se restan, $${m + n} - ${p} = ${val}$.`;
      ms.push([m * n - p, String(m * n - p), "Al multiplicar potencias de la misma base los exponentes se suman, no se multiplican."]);
    } else if (kind === "potencia") {
      const m = r.int(2, 5);
      const n = r.int(2, 4);
      const p = r.nz(-5, 5);
      expr = `\\left(x^{${m}}\\right)^{${n}} \\cdot x^{${p}}`;
      val = m * n + p;
      ans = String(val);
      steps = `Potencia de potencia: se multiplican, $${m} \\cdot ${n} = ${m * n}$. Luego el producto suma: $${m * n} ${p < 0 ? "-" : "+"} ${Math.abs(p)} = ${val}$.`;
      ms.push([m + n + p, String(m + n + p), "En una potencia de potencia los exponentes se multiplican: $(x^m)^n = x^{mn}$."]);
    } else {
      const q = r.pick([2, 3]);
      let m: number;
      do m = r.int(1, 8); while (m % q === 0);
      const p = r.int(1, 4);
      const root = q === 2 ? `\\sqrt{x^{${m}}}` : `\\sqrt[3]{x^{${m}}}`;
      expr = `\\dfrac{${root}}{${p === 1 ? "x" : `x^{${p}}`}}`;
      val = (m - p * q) / q;
      ans = frac(m - p * q, q);
      steps = `La raíz es un exponente fraccionario: $${root} = x^{${m}/${q}}$. Al dividir se restan: $\\frac{${m}}{${q}} - ${p} = ${ans}$.`;
      ms.push([m * q - p, String(m * q - p), `La raíz de índice ${q} divide el exponente entre ${q}, no lo multiplica.`]);
    }
    return {
      statement: `Escribe $${expr}$ como una sola potencia $x^n$ (con $x > 0$). ¿Cuánto vale $n$?`,
      parts: [{ kind: "expr", before: "n =", answer: ans, mistakes: keepNum(val, ms) }],
      hints: [
        "$x^m \\cdot x^n = x^{m+n}$, $\\dfrac{x^m}{x^n} = x^{m-n}$ y $(x^m)^n = x^{mn}$.",
        "Una raíz es un exponente fraccionario: $\\sqrt[q]{x^m} = x^{m/q}$.",
      ],
      solution: [steps, `Resultado: $x^{${ans}}$, así que $n = ${ans}$.`],
    };
  },
};

const expVf: ExerciseGen = {
  id: "exponencial-vf",
  title: "Propiedades de la función exponencial",
  level: 1,
  generate: (r) => {
    const base = r.pick([
      { tex: "2", v: 2 },
      { tex: "3", v: 3 },
      { tex: "5", v: 5 },
      { tex: "e", v: Math.E },
      { tex: "\\left(\\frac{1}{2}\\right)", v: 0.5 },
      { tex: "\\left(\\frac{1}{3}\\right)", v: 1 / 3 },
      { tex: "(0{,}4)", v: 0.4 },
    ]);
    const grows = base.v > 1;
    const claims = [
      { text: "es creciente en todo $\\mathbb{R}$.", ok: grows, why: grows ? "La base es mayor que 1, así que al aumentar $x$ la función aumenta." : "La base está entre 0 y 1, así que la función es decreciente." },
      { text: "es decreciente en todo $\\mathbb{R}$.", ok: !grows, why: grows ? "La base es mayor que 1, así que la función es creciente." : "La base está entre 0 y 1: cada vez que $x$ aumenta en 1, el valor se multiplica por un número menor que 1." },
      { text: "pasa por el punto $(0, 1)$.", ok: true, why: "Cualquier base positiva elevada a la cero da 1." },
      { text: "corta al eje $x$ en algún punto.", ok: false, why: "Una exponencial nunca vale cero. El eje $x$ es una asíntota: la curva se acerca pero no lo toca." },
      { text: "tiene rango $(0, +\\infty)$.", ok: true, why: "Toma todos los valores positivos y ninguno negativo ni cero." },
      { text: "toma valores negativos cuando $x < 0$.", ok: false, why: "Con exponente negativo el resultado es una fracción positiva, por ejemplo $a^{-1} = \\frac{1}{a}$. Una exponencial nunca es negativa." },
    ];
    const c = r.pick(claims);
    return {
      statement: `La función $f(x) = ${base.tex}^{x}$ ${c.text} ¿Verdadero o falso?`,
      parts: [trueFalse(c.ok, c.why)],
      hints: ["Si te ayuda, calcula $f(-1)$, $f(0)$ y $f(1)$."],
      solution: [c.why, `La afirmación es ${c.ok ? "verdadera" : "falsa"}.`],
    };
  },
};

const lnE: ExerciseGen = {
  id: "ln-e",
  title: "ln y e se deshacen",
  level: 1,
  generate: (r) => {
    const kind = r.pick(["lnExp", "expLn", "raiz", "inverso", "potencia"] as const);
    let expr: string, ans: string, val: number, why: string;
    const ms: [number, string, Rich][] = [];
    if (kind === "lnExp") {
      const k = r.nz(-5, 7);
      expr = `\\ln\\left(e^{${k}}\\right)`;
      val = k; ans = String(k);
      why = `$\\ln$ es el logaritmo en base $e$, así que $\\ln(e^{${k}})$ pregunta a qué exponente hay que elevar $e$ para obtener $e^{${k}}$.`;
    } else if (kind === "expLn") {
      const k = r.int(2, 15);
      expr = `e^{\\ln ${k}}`;
      val = k; ans = String(k);
      why = "$e^x$ y $\\ln x$ son inversas: una deshace lo que hace la otra.";
      ms.push([Math.log(k), `\\ln ${k}`, "La exponencial deshace el logaritmo. El resultado es el argumento."]);
    } else if (kind === "raiz") {
      const q = r.pick([2, 3]);
      let p: number;
      do p = r.int(1, 5); while (p % q === 0);
      const inner = p === 1 ? "e" : `e^{${p}}`;
      expr = `\\ln ${q === 2 ? `\\sqrt{${inner}}` : `\\sqrt[3]{${inner}}`}`;
      val = p / q; ans = frac(p, q);
      why = `La raíz es un exponente fraccionario: $${q === 2 ? `\\sqrt{${inner}}` : `\\sqrt[3]{${inner}}`} = e^{${p}/${q}}$.`;
      ms.push([q / p, frac(q, p), "Invertiste la fracción. La raíz de índice $q$ divide el exponente entre $q$."]);
    } else if (kind === "inverso") {
      const k = r.int(1, 6);
      expr = `\\ln \\dfrac{1}{e^{${k}}}`;
      val = -k; ans = String(-k);
      why = `$\\dfrac{1}{e^{${k}}} = e^{-${k}}$.`;
      ms.push([k, String(k), "Revisa el signo: $\\frac{1}{e^k} = e^{-k}$."]);
    } else {
      const a = r.pick([2, 3, 5]);
      const k = r.int(2, 3);
      expr = `e^{${k}\\ln ${a}}`;
      val = a ** k; ans = String(a ** k);
      why = `Primero la propiedad de la potencia: $${k}\\ln ${a} = \\ln ${a}^{${k}} = \\ln ${a ** k}$. Luego $e^{\\ln ${a ** k}} = ${a ** k}$.`;
      ms.push([k * a, String(k * a), `El ${k} es un exponente de $${a}$, no un factor: $${k}\\ln ${a} = \\ln(${a}^{${k}})$.`]);
    }
    return {
      statement: `Calcula $${expr}$.`,
      parts: [{ kind: "expr", answer: ans, mistakes: keepNum(val, ms) }],
      hints: ["$\\ln(e^x) = x$ y $e^{\\ln x} = x$ para $x > 0$."],
      solution: [why, `$${expr} = ${ans}$.`],
    };
  },
};

const propiedadesCalc: ExerciseGen = {
  id: "propiedades",
  title: "Calcular con las propiedades",
  level: 2,
  generate: (r) => {
    const kind = r.pick(["suma", "resta", "potencia", "potenciaResta"] as const);
    let expr: string, ans: number, steps: string[];
    if (kind === "suma") {
      const data: Record<number, [number, number, number][]> = {
        6: [[4, 9, 2], [2, 18, 2], [3, 12, 2], [3, 72, 3], [8, 27, 3]],
        10: [[4, 25, 2], [2, 50, 2], [5, 20, 2], [8, 125, 3], [25, 40, 3], [4, 250, 3]],
        12: [[3, 48, 2], [8, 18, 2], [4, 36, 2]],
        15: [[5, 45, 2], [9, 25, 2], [3, 75, 2]],
      };
      const b = r.pick([6, 10, 12, 15]);
      const [m, n, k] = r.pick(data[b]);
      expr = `${logTex(b)} ${m} + ${logTex(b)} ${n}`;
      ans = k;
      steps = [
        `Propiedad del producto: $${expr} = ${logTex(b)} (${m} \\cdot ${n}) = ${logTex(b)} ${m * n}$.`,
        `Como $${b}^{${k}} = ${m * n}$, el resultado es $${k}$.`,
      ];
    } else if (kind === "resta") {
      const b = r.pick([2, 3, 5]);
      const n = r.pick([3, 5, 6, 7, 10].filter((x) => x !== b));
      const k = r.int(1, b === 2 ? 4 : 2);
      const m = n * b ** k;
      expr = `${logTex(b)} ${m} - ${logTex(b)} ${n}`;
      ans = k;
      steps = [
        `Propiedad del cociente: $${expr} = ${logTex(b)} \\dfrac{${m}}{${n}} = ${logTex(b)} ${b ** k}$.`,
        `Como $${b}^{${k}} = ${b ** k}$, el resultado es $${k}$.`,
      ];
    } else if (kind === "potencia") {
      const data: [number, number, number][] = [[6, 3, 4], [6, 2, 9], [10, 5, 4], [10, 2, 25], [12, 6, 4], [12, 2, 36], [15, 5, 9], [15, 3, 25]];
      const [b, u, v] = r.pick(data);
      expr = `2${logTex(b)} ${u} + ${logTex(b)} ${v}`;
      ans = 2;
      steps = [
        `Propiedad de la potencia: $2${logTex(b)} ${u} = ${logTex(b)} ${u}^2 = ${logTex(b)} ${u * u}$.`,
        `Propiedad del producto: $${logTex(b)} ${u * u} + ${logTex(b)} ${v} = ${logTex(b)} ${u * u * v}$.`,
        `Como $${b}^2 = ${u * u * v}$, el resultado es $2$.`,
      ];
    } else {
      const data: [number, number, number, number][] = [[2, 6, 9, 2], [3, 6, 4, 2], [5, 10, 4, 2], [2, 12, 9, 4], [3, 18, 4, 4], [2, 10, 25, 2]];
      const [b, u, v, k] = r.pick(data);
      expr = `2${logTex(b)} ${u} - ${logTex(b)} ${v}`;
      ans = k;
      steps = [
        `Propiedad de la potencia: $2${logTex(b)} ${u} = ${logTex(b)} ${u * u}$.`,
        `Propiedad del cociente: $${logTex(b)} ${u * u} - ${logTex(b)} ${v} = ${logTex(b)} \\dfrac{${u * u}}{${v}} = ${logTex(b)} ${(u * u) / v}$.`,
        `Como $${b}^{${k}} = ${(u * u) / v}$, el resultado es $${k}$.`,
      ];
    }
    return {
      statement: `Calcula $${expr}$ sin calculadora.`,
      parts: [{ kind: "expr", answer: String(ans) }],
      hints: [
        "Junta todo en un solo logaritmo con las propiedades del producto, el cociente y la potencia.",
        "Al final te queda el logaritmo de una potencia exacta de la base.",
      ],
      solution: steps,
    };
  },
};

const ecMismaBase: ExerciseGen = {
  id: "ecuacion-misma-base",
  title: "Ecuación exponencial igualando bases",
  level: 2,
  generate: (r) => {
    const b = r.pick([2, 3, 5]);
    const m = r.pick([2, 3, -1]);
    const p = r.pick([1, 2, 3].filter((x) => x !== m));
    const x0 = r.int(-3, 4);
    const s = r.int(-3, 3);
    const q = m * (x0 + s) - p * x0;
    const lhs = `${b}^{${lin(p, q)}}`;
    const rhsBase = m === -1 ? `\\left(\\dfrac{1}{${b}}\\right)` : String(b ** m);
    const rhs = `${rhsBase}^{${lin(1, s)}}`;
    const baseAs = m === -1 ? `\\dfrac{1}{${b}} = ${b}^{-1}` : `${b ** m} = ${b}^{${m}}`;
    const expRight = s === 0 ? coef(m, "x") : m === -1 ? `-(${lin(1, s)})` : `${m}(${lin(1, s)})`;
    const wrong = p !== 1 ? (s - q) / (p - 1) : NaN;
    return {
      statement: `Resuelve $${lhs} = ${rhs}$.`,
      parts: [
        {
          kind: "expr",
          before: "x =",
          answer: frac(x0, 1),
          mistakes: keepNum(x0, [[wrong, Number.isFinite(wrong) ? frac(s - q, p - 1) : "0", `Igualaste los exponentes sin escribir antes $${rhsBase}$ como potencia de $${b}$.`]]),
        },
      ],
      hints: [`Escribe $${rhsBase}$ como una potencia de $${b}$.`, "Con la misma base a ambos lados, los exponentes tienen que ser iguales."],
      solution: [
        `Como $${baseAs}$, el lado derecho es $${b}^{${expRight}}$.`,
        `Igualamos exponentes: $${lin(p, q)} = ${terms([[m, "x"], [m * s, ""]])}$.`,
        `$${coef(p - m, "x")} = ${m * s - q}$, así que $x = ${x0}$.`,
      ],
    };
  },
};

const ecExpLog: ExerciseGen = {
  id: "ecuacion-con-logaritmos",
  title: "Despejar con logaritmos",
  level: 2,
  generate: (r) => {
    const kind = r.pick(["base", "coef", "shift"] as const);
    if (kind === "base") {
      const b = r.pick([2, 3, 5]);
      const c = r.pick([6, 7, 10, 11, 13].filter((x) => x !== b));
      return {
        statement: `Resuelve $${b}^{x} = ${c}$. Deja el resultado en términos de $\\ln$.`,
        parts: [
          {
            kind: "expr",
            before: "x =",
            answer: `\\frac{\\ln ${c}}{\\ln ${b}}`,
            mistakes: [
              { answer: `\\frac{\\ln ${b}}{\\ln ${c}}`, feedback: "Lo invertiste. Al despejar $x$ de $x \\ln b = \\ln c$ se divide entre $\\ln b$." },
              { answer: `\\ln ${c} - \\ln ${b}`, feedback: `Eso es $\\ln \\frac{${c}}{${b}}$. El cociente de logaritmos no es la resta.` },
              { answer: `\\frac{${c}}{${b}}`, feedback: "No se puede dividir para despejar un exponente. Hay que tomar logaritmo." },
            ],
          },
        ],
        hints: ["Toma $\\ln$ en ambos lados.", "La propiedad de la potencia baja el exponente: $\\ln(b^x) = x \\ln b$."],
        solution: [
          `Tomamos logaritmo natural: $\\ln(${b}^{x}) = \\ln ${c}$.`,
          `Bajamos el exponente: $x \\ln ${b} = \\ln ${c}$.`,
          `$x = \\dfrac{\\ln ${c}}{\\ln ${b}} \\approx ${num(Math.log(c) / Math.log(b), 4)}$.`,
        ],
      };
    }
    if (kind === "coef") {
      const a = r.int(2, 5);
      const t = r.pick([3, 5, 7, 10]);
      const k = r.pick([1, 2, 3, -1, -2]);
      const ans = lnOver(t, k);
      return {
        statement: `Resuelve $${a}e^{${coef(k, "x")}} = ${a * t}$.`,
        parts: [
          {
            kind: "expr",
            before: "x =",
            answer: ans,
            mistakes: keepNum(Math.log(t) / k, [
              [Math.log(a * t) / k, lnOver(a * t, k), `Primero hay que dividir entre $${a}$ para dejar sola la exponencial.`],
              [Math.log(t), `\\ln ${t}`, `Al final falta dividir entre $${k}$.`],
            ]),
          },
        ],
        hints: [`Divide entre $${a}$ para dejar sola la exponencial.`, "Toma $\\ln$ en ambos lados: $\\ln(e^{u}) = u$."],
        solution: [
          `Dividimos entre $${a}$: $e^{${coef(k, "x")}} = ${t}$.`,
          `Tomamos $\\ln$: $${coef(k, "x")} = \\ln ${t}$.`,
          `$x = ${ans} \\approx ${num(Math.log(t) / k, 4)}$.`,
        ],
      };
    }
    const c = r.nz(-4, 4);
    const t = r.pick([2, 3, 5, 7, 10]);
    const ans = c > 0 ? `\\ln ${t} + ${c}` : `\\ln ${t} - ${-c}`;
    return {
      statement: `Resuelve $e^{${minus("x", c)}} = ${t}$.`,
      parts: [
        {
          kind: "expr",
          before: "x =",
          answer: ans,
          mistakes: [{ answer: c > 0 ? `\\ln ${t} - ${c}` : `\\ln ${t} + ${-c}`, feedback: "Revisa el signo al despejar la $x$ del exponente." }],
        },
      ],
      hints: ["Toma $\\ln$ en ambos lados.", `Queda $${minus("x", c)} = \\ln ${t}$.`],
      solution: [
        `Tomamos $\\ln$: $${minus("x", c)} = \\ln ${t}$.`,
        `Despejamos: $x = ${ans} \\approx ${num(Math.log(t) + c, 4)}$.`,
      ],
    };
  },
};

const cambioBase: ExerciseGen = {
  id: "cambio-base",
  title: "Cambio de base",
  level: 2,
  generate: (r) => {
    if (r.bool()) {
      const b = r.pick([2, 3]);
      const m = r.pick([2, 3]);
      let n: number;
      do n = r.int(1, 6); while (n % m === 0);
      const B = b ** m;
      const A = b ** n;
      return {
        statement: `Calcula $\\log_{${B}} ${A}$.`,
        parts: [{ kind: "expr", answer: frac(n, m), mistakes: [{ answer: frac(m, n), feedback: "Invertiste la fracción. El logaritmo de la base nueva va en el denominador." }] }],
        hints: [`Escribe $${B}$ y $${A}$ como potencias de $${b}$.`, `$\\log_{${B}} ${A} = \\dfrac{\\log_{${b}} ${A}}{\\log_{${b}} ${B}}$.`],
        solution: [
          `$${B} = ${b}^{${m}}$ y $${A} = ${b}^{${n}}$.`,
          `Con cambio de base a $${b}$: $\\log_{${B}} ${A} = \\dfrac{\\log_{${b}} ${A}}{\\log_{${b}} ${B}} = \\dfrac{${n}}{${m}}$.`,
          `Comprobación: $${B}^{${n}/${m}} = (${b}^{${m}})^{${n}/${m}} = ${b}^{${n}} = ${A}$.`,
        ],
      };
    }
    const b = r.pick([2, 3, 5, 7]);
    const c = r.pick([3, 5, 6, 7, 10, 11].filter((x) => x !== b));
    return {
      statement: `Escribe $\\log_{${b}} ${c}$ usando solo logaritmos naturales.`,
      parts: [
        {
          kind: "expr",
          answer: `\\frac{\\ln ${c}}{\\ln ${b}}`,
          validate: (_ast, latex) => (/\\log/.test(latex) ? "Escríbelo con $\\ln$, sin $\\log$." : null),
          mistakes: [
            { answer: `\\frac{\\ln ${b}}{\\ln ${c}}`, feedback: "Lo invertiste. El argumento va arriba y la base abajo." },
            { answer: `\\ln ${c} - \\ln ${b}`, feedback: `Eso es $\\ln \\frac{${c}}{${b}}$, que es otra cosa. El cambio de base es un cociente de logaritmos.` },
          ],
        },
      ],
      hints: ["$\\log_b M = \\dfrac{\\ln M}{\\ln b}$."],
      solution: [
        `Por cambio de base: $\\log_{${b}} ${c} = \\dfrac{\\ln ${c}}{\\ln ${b}}$.`,
        `Con calculadora: $\\approx ${num(Math.log(c) / Math.log(b), 4)}$.`,
      ],
    };
  },
};

const dominioLog: ExerciseGen = {
  id: "dominio-log",
  title: "Dominio de un logaritmo",
  level: 2,
  generate: (r) => {
    const kind = r.pick(["lin", "cuad", "parab", "racional", "siempre", "abs"] as const);
    let fx: string, cond: string, ans: Interval[], closedWrong: Interval[] | null = null, why: string;
    const p = r.int(-5, 2);
    const q = p + r.int(1, 5);
    switch (kind) {
      case "lin": {
        const a = r.pick([1, 2, 3, -1, -2, -3]);
        const s = r.int(-5, 5);
        fx = `\\ln(${lin(a, -a * s)})`;
        cond = `${lin(a, -a * s)} > 0`;
        ans = a > 0 ? [iv(s, Infinity)] : [iv(-Infinity, s)];
        closedWrong = a > 0 ? [iv(s, Infinity, true, false)] : [iv(-Infinity, s, false, true)];
        why = a > 0 ? `Despejando, $x > ${s}$.` : `Al dividir entre $${a}$ la desigualdad se voltea: $x < ${s}$.`;
        break;
      }
      case "cuad": {
        const k = r.int(1, 5);
        fx = `\\ln(x^{2} - ${k * k})`;
        cond = `x^2 - ${k * k} > 0`;
        ans = signSolve([{ root: -k }, { root: k }], 1, ">");
        closedWrong = signSolve([{ root: -k }, { root: k }], 1, ">=");
        why = `$(x - ${k})(x + ${k}) > 0$ se cumple afuera de las raíces.`;
        break;
      }
      case "parab": {
        fx = `\\log(${poly([-1, p + q, -p * q])})`;
        cond = `${poly([-1, p + q, -p * q])} > 0`;
        ans = signSolve([{ root: p }, { root: q }], -1, ">");
        closedWrong = signSolve([{ root: p }, { root: q }], -1, ">=");
        why = `Multiplicando por $-1$: $${poly([1, -(p + q), p * q])} < 0$, que se cumple entre las raíces $${p}$ y $${q}$.`;
        break;
      }
      case "racional": {
        fx = `\\ln\\left(\\dfrac{${minus("x", p)}}{${minus("x", q)}}\\right)`;
        cond = `\\dfrac{${minus("x", p)}}{${minus("x", q)}} > 0`;
        ans = signSolve([{ root: p }, { root: q, den: true }], 1, ">");
        closedWrong = signSolve([{ root: p }, { root: q, den: true }], 1, ">=");
        why = `Con la tabla de signos, la fracción es positiva afuera de $${p}$ y $${q}$.`;
        break;
      }
      case "siempre": {
        const c = r.int(1, 9);
        fx = `\\ln(x^{2} + ${c})`;
        cond = `x^2 + ${c} > 0`;
        ans = R;
        why = `$x^2 \\ge 0$, así que $x^2 + ${c} \\ge ${c} > 0$ para todo $x$.`;
        break;
      }
      default: {
        const a = r.nz(-5, 5);
        fx = `\\ln|${minus("x", a)}|`;
        cond = `|${minus("x", a)}| > 0`;
        ans = minusPoints(R, [a]);
        why = `Un valor absoluto es positivo salvo cuando vale cero, y eso pasa solo en $x = ${a}$.`;
      }
    }
    const mistakes: { answer: Interval[]; feedback: Rich }[] = [];
    if (closedWrong && !sameSet(closedWrong, ans)) mistakes.push({ answer: closedWrong, feedback: "Los extremos no entran: $\\ln 0$ no existe. La condición es estrictamente mayor que cero." });
    return {
      statement: `Halla el dominio de $f(x) = ${fx}$.`,
      parts: [{ kind: "interval", before: "\\operatorname{Dom} f =", answer: ans, mistakes }],
      hints: ["El logaritmo solo existe para argumentos estrictamente positivos.", `Resuelve $${cond}$.`],
      solution: [`El argumento tiene que ser positivo: $${cond}$.`, why, `$\\operatorname{Dom} f = ${unionTex(ans)}$.`],
    };
  },
};

const ecLog: ExerciseGen = {
  id: "ecuacion-logaritmica",
  title: "Ecuación logarítmica con solución falsa (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const opts: [number, number][] = [[2, 3], [2, 4], [2, 5], [3, 2], [3, 3], [10, 2], [6, 2]];
    const [b, k] = r.pick(opts);
    const N = b ** k;
    const pairs: [number, number][] = [];
    for (let u = 1; u * u < N; u++) if (N % u === 0) pairs.push([u, N / u]);
    const [u1, u2] = r.pick(pairs);
    const d = u2 - u1;
    const p = r.int(-4, 4);
    const q = p + d;
    const x1 = u1 - p;
    const x2 = -u2 - p;
    const L = logTex(b);
    const A = minus("x", -p);
    const B = minus("x", -q);
    const quad = poly([1, p + q, p * q - N]);
    return {
      statement: `Resuelve $${L}(${A}) + ${L}(${B}) = ${k}$.`,
      sequential: true,
      parts: [
        {
          kind: "set",
          prompt: "Junta los logaritmos, pasa a forma exponencial y resuelve la cuadrática que queda. ¿Cuáles son sus raíces?",
          answer: [x1, x2].sort((a, c) => a - c),
        },
        {
          kind: "set",
          prompt: "¿Cuáles de esas raíces son soluciones de la ecuación original?",
          answer: [x1],
          mistakes: [{ answer: [x1, x2].sort((a, c) => a - c), feedback: `Revisa el dominio. Con $x = ${x2}$ queda $${L}(${x2 + p})$, el logaritmo de un número negativo, que no existe.` }],
        },
      ],
      hints: [
        `Propiedad del producto: $${L} M + ${L} N = ${L}(MN)$.`,
        `$${L} y = ${k}$ significa $y = ${b}^{${k}} = ${N}$.`,
        "Al final sustituye cada raíz en los argumentos de los logaritmos. Todos tienen que ser positivos.",
      ],
      solution: [
        `Dominio: hace falta $${A} > 0$ y $${B} > 0$, es decir, $x > ${-p}$.`,
        `Propiedad del producto: $${L}\\big[(${A})(${B})\\big] = ${k}$.`,
        `Forma exponencial: $(${A})(${B}) = ${N}$, o sea $${quad} = 0$.`,
        `Factorizando: $(${minus("x", x1)})(${minus("x", x2)}) = 0$. Las raíces son $x = ${x1}$ y $x = ${x2}$.`,
        `$x = ${x2}$ no cumple $x > ${-p}$: daría el logaritmo de $${x2 + p}$. Se descarta.`,
        `$x = ${x1}$ sí sirve: $${L} ${x1 + p} + ${L} ${x1 + q} = ${L} ${N} = ${k}$. La única solución es $x = ${x1}$.`,
      ],
    };
  },
};

const ecExpCuad: ExerciseGen = {
  id: "ecuacion-exponencial-cuadratica",
  title: "Exponencial con cambio de variable (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const variant = r.pick(["e", "e", "2", "3"] as const);
    let r2 = -r.int(1, 6);
    let r1: number, big: string, small: string, ansTex: string, ansVal: number;
    if (variant === "e") {
      r1 = r.int(2, 7);
      big = "e^{2x}";
      small = "e^{x}";
      ansTex = `\\ln ${r1}`;
      ansVal = Math.log(r1);
    } else if (variant === "2") {
      const n = r.int(1, 4);
      r1 = 2 ** n;
      big = "4^{x}";
      small = "2^{x}";
      ansTex = String(n);
      ansVal = n;
    } else {
      const n = r.int(1, 3);
      r1 = 3 ** n;
      big = "9^{x}";
      small = "3^{x}";
      ansTex = String(n);
      ansVal = n;
    }
    // Evita que desaparezca el término del medio
    if (r1 + r2 === 0) r2 = r2 === -1 ? -2 : r2 + 1;
    const Bc = -(r1 + r2);
    const Cc = r1 * r2;
    const eq = `${sumTex([[1, big], [Bc, small], [Cc, ""]])} = 0`;
    const uPoly = poly([1, Bc, Cc], "u");
    return {
      statement: `Resuelve $${eq}$.`,
      sequential: true,
      parts: [
        {
          kind: "set",
          prompt: `Con el cambio $u = ${small}$ la ecuación se vuelve cuadrática en $u$. ¿Cuáles son sus raíces?`,
          answer: [r2, r1],
        },
        {
          kind: "expr",
          prompt: "Halla $x$. Solo una de las raíces sirve.",
          before: "x =",
          answer: ansTex,
          mistakes: keepNum(ansVal, [[r1, String(r1), `Ese es el valor de $u = ${small}$. Falta despejar $x$.`]]),
        },
      ],
      hints: [
        variant === "e" ? "$e^{2x} = (e^x)^2$." : `$${big} = (${small})^2$.`,
        `Con $u = ${small}$ queda $${uPoly} = 0$. Factoriza.`,
        `$${small}$ nunca es negativo.`,
      ],
      solution: [
        `Como $${big} = (${small})^2$, con $u = ${small}$ la ecuación es $${uPoly} = 0$.`,
        `Factorizando: $(u - ${r1})(u + ${-r2}) = 0$, así que $u = ${r1}$ o $u = ${r2}$.`,
        `$${small} = ${r2}$ no tiene solución, porque una exponencial nunca es negativa.`,
        variant === "e"
          ? `$e^{x} = ${r1}$ da $x = \\ln ${r1} \\approx ${num(Math.log(r1), 4)}$.`
          : `$${small} = ${r1} = ${variant}^{${ansTex}}$ da $x = ${ansTex}$.`,
      ],
    };
  },
};

const interes: ExerciseGen = {
  id: "interes-compuesto",
  title: "Interés compuesto y continuo (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const P = r.pick([1000, 2000, 5000, 10000]);
    const pct = r.pick([4, 5, 6, 8, 10, 12]);
    const rate = pct / 100;
    const t = r.int(2, 10);
    const n = r.pick([1, 2, 4, 12]);
    const perNames: Record<number, string> = { 1: "anualmente", 2: "semestralmente", 4: "trimestralmente", 12: "mensualmente" };
    const per = perNames[n];
    const adj = per.replace("mente", "");
    const compTex = `${P}\\left(1 + \\frac{${pct}}{${100 * n}}\\right)^{${n * t}}`;
    const comp = P * (1 + rate / n) ** (n * t);
    const contTex = `${P}e^{${num(rate * t)}}`;
    const cont = P * Math.exp(rate * t);
    const dbl = Math.log(2) / rate;
    return {
      statement: `Se invierten $${P}$ dólares al $${pct}\\,\\%$ de interés anual. Puedes dejar cada resultado como expresión o escribirlo con dos decimales.`,
      sequential: true,
      parts: [
        {
          kind: "expr",
          prompt: `¿Cuánto hay después de $${t}$ años si los intereses se capitalizan ${per}?`,
          before: "A =",
          answer: compTex,
          tol: 1e-5,
          mistakes: keepNum(comp, [
            [P * (1 + rate * t), `${P}(1 + ${num(rate)} \\cdot ${t})`, "Eso es interés simple. En el compuesto los intereses ganan intereses: se eleva a una potencia."],
            [P * (1 + rate) ** t, `${P}(1 + ${num(rate)})^{${t}}`, `Esa fórmula capitaliza una vez al año. Aquí se capitaliza ${n} veces al año: la tasa por período es $\\frac{r}{${n}}$ y hay $${n * t}$ períodos.`],
          ]),
        },
        {
          kind: "expr",
          prompt: `¿Cuánto hay después de $${t}$ años con capitalización continua?`,
          before: "A =",
          answer: contTex,
          tol: 1e-5,
          mistakes: keepNum(cont, [[P * Math.exp(pct * t), `${P}e^{${pct * t}}`, "La tasa va en decimal: $" + pct + "\\,\\% = " + num(rate) + "$."]]),
        },
        {
          kind: "expr",
          prompt: "Con capitalización continua, ¿en cuántos años se duplica el capital?",
          before: "t =",
          answer: `\\frac{\\ln 2}{${num(rate)}}`,
          tol: 1e-3,
          mistakes: keepNum(dbl, [[Math.log(2) * rate, `${num(rate)}\\ln 2`, "Al despejar $t$ de $rt = \\ln 2$ se divide entre $r$."]]),
        },
      ],
      hints: [
        "Compuesto: $A = P\\left(1 + \\frac{r}{n}\\right)^{nt}$, con $r$ en decimal.",
        "Continuo: $A = Pe^{rt}$.",
        "Duplicar es llegar a $2P$: resuelve $2P = Pe^{rt}$ tomando $\\ln$.",
      ],
      solution: [
        `$r = ${num(rate)}$, $n = ${n}$, $t = ${t}$: $A = ${compTex} \\approx ${num(comp, 2)}$ dólares.`,
        `Continuo: $A = ${P}e^{${num(rate)} \\cdot ${t}} = ${contTex} \\approx ${num(cont, 2)}$ dólares. Es un poco más que con capitalización ${adj}.`,
        `$2P = Pe^{${num(rate)}t}$ da $e^{${num(rate)}t} = 2$, o sea $${num(rate)}t = \\ln 2$ y $t = \\dfrac{\\ln 2}{${num(rate)}} \\approx ${num(dbl, 2)}$ años.`,
      ],
    };
  },
};

const vfLog: ExerciseGen = {
  id: "vf-logaritmos",
  title: "Verdadero o falso con logaritmos (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const a = r.int(2, 9);
    let c: number;
    do c = r.int(2, 9); while (c === a);
    const k = r.int(2, 5);
    const b = r.pick([2, 3, 5, 10]);
    const claims: { text: string; ok: boolean; why: string }[] = [
      { text: `$\\ln(${a} + ${c}) = \\ln ${a} + \\ln ${c}$.`, ok: false, why: `La suma de logaritmos es el logaritmo del producto: $\\ln ${a} + \\ln ${c} = \\ln ${a * c}$, y $\\ln ${a + c} \\ne \\ln ${a * c}$. No hay propiedad para el logaritmo de una suma.` },
      { text: `$${logTex(b)} ${a * c} - ${logTex(b)} ${c} = ${logTex(b)} ${a}$.`, ok: true, why: `Por la propiedad del cociente, $${logTex(b)} ${a * c} - ${logTex(b)} ${c} = ${logTex(b)} \\frac{${a * c}}{${c}} = ${logTex(b)} ${a}$.` },
      { text: `$\\ln(x^{${2 * k}}) = ${2 * k}\\ln x$ para todo $x \\ne 0$.`, ok: false, why: `El lado izquierdo existe para $x < 0$ pero $\\ln x$ no. Lo correcto es $\\ln(x^{${2 * k}}) = ${2 * k}\\ln|x|$.` },
      { text: `$(\\ln x)^{${k}} = ${k}\\ln x$ para todo $x > 0$.`, ok: false, why: `La propiedad de la potencia es $\\ln(x^{${k}}) = ${k}\\ln x$. El exponente tiene que estar dentro del logaritmo. Con $x = e$ el lado izquierdo da $1$ y el derecho $${k}$.` },
      { text: `$\\dfrac{\\ln ${a}}{\\ln ${c}} = \\ln ${a} - \\ln ${c}$.`, ok: false, why: `La resta es $\\ln \\frac{${a}}{${c}}$. El cociente $\\frac{\\ln ${a}}{\\ln ${c}}$ es otra cosa: $\\log_{${c}} ${a}$, por cambio de base.` },
      { text: `$e^{${k}\\ln x} = x^{${k}}$ para todo $x > 0$.`, ok: true, why: `$${k}\\ln x = \\ln(x^{${k}})$ y $e^{\\ln(x^{${k}})} = x^{${k}}$.` },
      { text: `La ecuación $\\ln x = -${k}$ no tiene solución.`, ok: false, why: `Sí la tiene: $x = e^{-${k}}$, un número positivo entre 0 y 1. El logaritmo puede ser negativo, lo que no puede ser negativo es su argumento.` },
      { text: `La ecuación $e^{x} = -${k}$ no tiene solución.`, ok: true, why: "La exponencial siempre es positiva, así que nunca vale un número negativo." },
    ];
    const cl = r.pick(claims);
    return {
      statement: `${cl.text} ¿Verdadero o falso?`,
      parts: [trueFalse(cl.ok, cl.why)],
      hints: ["Las propiedades válidas son tres: producto, cociente y potencia (con el exponente dentro del logaritmo). Desconfía de todo lo demás.", "Prueba con valores concretos como $x = e$ o $x = 1$."],
      solution: [cl.why, `La afirmación es ${cl.ok ? "verdadera" : "falsa"}.`],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("exponenciales-logaritmos"),
  objectives: [
    "Operar con potencias de exponente entero, fraccionario y real.",
    "Reconocer la función exponencial, su gráfica y el número e.",
    "Entender el logaritmo como un exponente y usar sus propiedades.",
    "Resolver ecuaciones exponenciales y logarítmicas verificando el dominio.",
    "Calcular interés compuesto, capitalización continua y tiempos de crecimiento.",
  ],
  sections: [
    {
      id: "potencias",
      title: "Potencias con cualquier exponente",
      blocks: [
        {
          type: "text",
          md: "Una potencia es una multiplicación repetida: $2^3 = 2 \\cdot 2 \\cdot 2 = 8$. El número de abajo es la **base** y el de arriba el **exponente**. Las leyes de los exponentes salen de contar factores. Después se usan para darle sentido a exponentes negativos, fraccionarios y hasta irracionales.",
        },
        {
          type: "table",
          headers: ["Ley", "Fórmula", "Ejemplo"],
          rows: [
            ["Producto con la misma base", "$a^m \\cdot a^n = a^{m+n}$", "$2^3 \\cdot 2^4 = 2^7$"],
            ["Cociente con la misma base", "$\\dfrac{a^m}{a^n} = a^{m-n}$", "$\\dfrac{5^6}{5^2} = 5^4$"],
            ["Potencia de una potencia", "$(a^m)^n = a^{mn}$", "$(3^2)^4 = 3^8$"],
            ["Exponente cero", "$a^0 = 1$ (con $a \\ne 0$)", "$7^0 = 1$"],
            ["Exponente negativo", "$a^{-n} = \\dfrac{1}{a^n}$", "$2^{-3} = \\dfrac{1}{8}$"],
            ["Exponente fraccionario", "$a^{m/n} = \\sqrt[n]{a^m}$", "$8^{2/3} = \\sqrt[3]{64} = 4$"],
          ],
        },
        {
          type: "example",
          title: "Usar las leyes",
          problem: "Calcula $27^{2/3}$ y $16^{-1/2}$, y simplifica $\\dfrac{(x^2)^3 \\cdot x^{-1}}{x^4}$.",
          steps: [
            "$27^{2/3} = \\left(\\sqrt[3]{27}\\right)^2 = 3^2 = 9$.",
            "$16^{-1/2} = \\dfrac{1}{16^{1/2}} = \\dfrac{1}{\\sqrt{16}} = \\dfrac{1}{4}$.",
            "$(x^2)^3 = x^6$. Luego $x^6 \\cdot x^{-1} = x^5$, y $\\dfrac{x^5}{x^4} = x$.",
          ],
        },
        {
          type: "text",
          md: "¿Y un exponente irracional, como en $2^{\\sqrt{2}}$? Ya no se pueden contar factores, pero se puede aproximar. Como $\\sqrt{2} \\approx 1{,}41421$, las potencias $2^{1{,}4}$, $2^{1{,}41}$, $2^{1{,}414}$, que tienen exponente fraccionario, se van acercando a un número fijo: $2^{\\sqrt{2}} \\approx 2{,}665$. Así $a^x$ tiene sentido para cualquier real $x$ siempre que la base $a$ sea positiva.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Dos errores de signos y paréntesis",
          md: "- $-3^2 = -9$, porque el exponente solo afecta al 3. En cambio $(-3)^2 = 9$.\n- $(a + b)^2$ no es $a^2 + b^2$. Las potencias se reparten en productos, no en sumas: $(ab)^2 = a^2 b^2$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Escribe $\\dfrac{x^{5} \\cdot x^{-2}}{\\sqrt{x}}$ como $x^n$. ¿Cuánto vale $n$?",
            parts: [{ kind: "expr", before: "n =", answer: "\\frac{5}{2}", mistakes: [{ answer: "1", feedback: "La raíz cuadrada es el exponente $\\frac{1}{2}$, no $2$." }] }],
            solution: ["$x^5 \\cdot x^{-2} = x^3$ y $\\sqrt{x} = x^{1/2}$. Entonces $x^{3 - 1/2} = x^{5/2}$."],
          },
        },
      ],
    },
    {
      id: "funcion-exponencial",
      title: "La función exponencial",
      blocks: [
        {
          type: "text",
          md: "Si dejas fija la base y mueves el exponente, obtienes una función exponencial, $f(x) = a^x$. En $x^2$ la variable está en la base. Aquí está arriba, y eso hace que crezca, o decrezca, muy rápido. Cada vez que $x$ aumenta en 1, el valor se multiplica por $a$.",
        },
        {
          type: "table",
          headers: ["$x$", "$-2$", "$-1$", "$0$", "$1$", "$2$", "$3$"],
          rows: [["$2^x$", "$\\frac{1}{4}$", "$\\frac{1}{2}$", "$1$", "$2$", "$4$", "$8$"]],
          caption: "Cada paso a la derecha duplica el valor. Hacia la izquierda se reduce a la mitad, pero nunca llega a cero.",
        },
        {
          type: "definition",
          title: "Función exponencial de base $a$",
          md: "Para $a > 0$ con $a \\ne 1$, $f(x) = a^x$ cumple:\n\n- Dominio: todos los reales. Rango: $(0, +\\infty)$. Nunca vale cero ni es negativa.\n- Pasa por $(0, 1)$, porque $a^0 = 1$.\n- Si $a > 1$ es creciente. Si $0 < a < 1$ es decreciente.\n- El eje $x$ es asíntota horizontal: la curva se le pega sin tocarlo.",
        },
        {
          type: "widget",
          widget: {
            kind: "sliders",
            fn: "a^{x}",
            params: [{ name: "a", min: 0.2, max: 4, step: 0.1, value: 2, label: "base a" }],
            x: [-4, 4],
            y: [-1, 8],
            formula: "f(x) = {a}^{x}",
            reference: [{ fn: "e^{x}", color: "muted", dashed: true, label: "e^x" }],
          },
          caption: "Con $a > 1$ la curva sube. Con $a$ entre 0 y 1 baja. Todas pasan por $(0, 1)$. La punteada es $e^x$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "No confundas $2^x$ con $x^2$",
          md: "$x^2$ es una parábola y vale $0$ en $x = 0$. $2^x$ es una exponencial y vale $1$ en $x = 0$. Además una exponencial nunca es negativa, así que $2^x = -4$ no tiene solución y $2^x > 0$ se cumple para todo $x$.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Crecer a un porcentaje fijo",
          md: "Crecer a un porcentaje fijo es crecer exponencialmente. Una población que aumenta 3 % al año se multiplica por $1{,}03$ cada año, así que después de $t$ años es $P(t) = P_0 (1{,}03)^t$. Algo que pierde 10 % de su valor cada año vale $V_0 (0{,}9)^t$, una exponencial decreciente.",
        },
        {
          type: "quick",
          exercise: {
            statement: "La función $f(x) = (0{,}5)^x$ es creciente. ¿Verdadero o falso?",
            parts: [trueFalse(false, "La base $0{,}5$ está entre 0 y 1, así que la función es decreciente: cada paso a la derecha reduce el valor a la mitad.")],
            solution: ["Base entre 0 y 1: decreciente. Por ejemplo $f(0) = 1$ y $f(1) = 0{,}5$."],
          },
        },
      ],
    },
    {
      id: "numero-e",
      title: "El número e",
      blocks: [
        {
          type: "text",
          md: "Hay una base que aparece sola en economía, en finanzas y en casi todo el cálculo: el número $e \\approx 2{,}71828$. Para ver de dónde sale, piensa en un banco muy generoso.\n\nDepositas 1 dólar al 100 % de interés anual. Si el banco paga los intereses una vez al año, al final tienes $1 + 1 = 2$. Si los paga cada seis meses, al 50 % cada vez, y los reinviertes, tienes $\\left(1 + \\frac{1}{2}\\right)^2 = 2{,}25$. Si los paga $n$ veces al año, tienes $\\left(1 + \\frac{1}{n}\\right)^n$.",
        },
        {
          type: "table",
          headers: ["Capitalización", "$n$", "$\\left(1 + \\frac{1}{n}\\right)^n$"],
          rows: [
            ["Anual", "$1$", "$2$"],
            ["Semestral", "$2$", "$2{,}25$"],
            ["Trimestral", "$4$", "$2{,}4414$"],
            ["Mensual", "$12$", "$2{,}6130$"],
            ["Diaria", "$365$", "$2{,}7146$"],
            ["Cada instante", "$1\\,000\\,000$", "$2{,}71828$"],
          ],
        },
        {
          type: "text",
          md: "El monto crece, pero cada vez menos, y se acerca a un tope: $e = 2{,}71828\\dots$ Es un número irracional, como $\\pi$. La función $f(x) = e^x$ es **la** exponencial, la que vas a usar casi siempre. En el tema **El número e y los límites $1^\\infty$** verás esta idea escrita como un límite.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Capitalización continua",
          md: "Si los intereses se reinvierten a cada instante, un capital $P$ a una tasa anual $r$ (en decimal) se convierte en $Pe^{rt}$ después de $t$ años. Es el tope del interés compuesto cuando la capitalización se hace cada vez más frecuente.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Si un banco capitaliza los intereses cada vez más seguido, el monto final crece sin límite. ¿Verdadero o falso?",
            parts: [trueFalse(false, "El monto crece, pero se acerca a un tope. Con 100 % anual ese tope es $e \\approx 2{,}718$ veces el capital.")],
            solution: ["La tabla muestra que $\\left(1 + \\frac{1}{n}\\right)^n$ se estabiliza cerca de $2{,}718$. No crece sin límite."],
          },
        },
      ],
    },
    {
      id: "logaritmo",
      title: "Qué es un logaritmo",
      blocks: [
        {
          type: "text",
          md: "Un logaritmo responde una pregunta: ¿a qué exponente hay que elevar la base para obtener cierto número? Como $2^3 = 8$, el logaritmo en base 2 de 8 es 3, y se escribe $\\log_2 8 = 3$. Un logaritmo **es un exponente**. Si recuerdas esa frase, todas sus propiedades se vuelven razonables.",
        },
        {
          type: "definition",
          title: "Logaritmo en base $b$",
          md: "Para $b > 0$, $b \\ne 1$ y $x > 0$:\n\n$$\\log_b x = y \\iff b^y = x$$\n\nSe lee \"logaritmo en base $b$ de $x$\". El número $x$ es el argumento y tiene que ser positivo, porque $b^y$ nunca es cero ni negativo.",
        },
        {
          type: "example",
          title: "Calcular logaritmos sin calculadora",
          problem: "Calcula $\\log_3 81$, $\\log 1000$, $\\log_2 \\frac{1}{8}$ y $\\log_5 \\sqrt{5}$.",
          steps: [
            "$3^4 = 81$, así que $\\log_3 81 = 4$.",
            "$10^3 = 1000$, así que $\\log 1000 = 3$.",
            "$2^{-3} = \\frac{1}{8}$, así que $\\log_2 \\frac{1}{8} = -3$.",
            "$\\sqrt{5} = 5^{1/2}$, así que $\\log_5 \\sqrt{5} = \\frac{1}{2}$.",
          ],
        },
        {
          type: "table",
          headers: ["Escritura", "Base", "Nombre"],
          rows: [
            ["$\\ln x$", "$e$", "Logaritmo natural o neperiano"],
            ["$\\log x$", "$10$", "Logaritmo decimal (cuando no se escribe la base)"],
            ["$\\log_b x$", "$b$", "Logaritmo en base $b$"],
          ],
          caption: "Es la convención de la guía de la cátedra: $\\log x$ sin base significa base 10.",
        },
        {
          type: "note",
          tone: "idea",
          title: "Consecuencias inmediatas de la definición",
          md: "$$\\log_b 1 = 0 \\qquad \\log_b b = 1 \\qquad \\log_b (b^x) = x \\qquad b^{\\log_b x} = x$$\n\nLa exponencial y el logaritmo de la misma base se deshacen el uno al otro: son funciones inversas. Por ejemplo $\\ln(e^5) = 5$ y $e^{\\ln 7} = 7$.",
        },
        {
          type: "graph",
          spec: {
            x: [-4, 6],
            y: [-4, 6],
            height: 320,
            curves: [
              { fn: "e^{x}", color: "accent", label: "y = e^x" },
              { fn: "\\ln x", color: "blue", label: "y = ln x", domain: [0.02, 6] },
              { fn: "x", color: "muted", dashed: true, label: "y = x" },
            ],
            points: [{ x: 0, y: 1, label: "(0, 1)" }, { x: 1, y: 0, label: "(1, 0)" }],
            vlines: [{ x: 0, dashed: true, color: "muted" }],
          },
          caption: "$\\ln x$ es el reflejo de $e^x$ sobre la recta $y = x$. Solo existe para $x > 0$, vale $0$ en $x = 1$ y es negativo entre $0$ y $1$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Argumentos prohibidos",
          md: "$\\ln 0$ y $\\ln(-2)$ no existen. El dominio de $\\ln x$ es $(0, +\\infty)$. Ojo: el logaritmo sí puede dar un resultado negativo, por ejemplo $\\ln \\frac{1}{e} = -1$. Lo que no puede ser negativo es lo de adentro.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $\\log_2 32$.",
            parts: [{ kind: "expr", answer: "5", mistakes: [{ answer: "16", feedback: "El logaritmo no divide entre la base. Pregunta a qué exponente hay que elevar 2 para obtener 32." }] }],
            solution: ["$2^5 = 32$, así que $\\log_2 32 = 5$."],
          },
        },
      ],
    },
    {
      id: "propiedades",
      title: "Propiedades de los logaritmos",
      blocks: [
        {
          type: "text",
          md: "Como un logaritmo es un exponente, sus propiedades son las leyes de los exponentes vistas al revés. Multiplicar potencias suma exponentes, así que el logaritmo de un producto es la suma de los logaritmos. Dividir resta exponentes, y elevar a una potencia los multiplica.",
        },
        {
          type: "table",
          headers: ["Propiedad", "Fórmula", "Ejemplo"],
          rows: [
            ["Producto", "$\\log_b(MN) = \\log_b M + \\log_b N$", "$\\log_6 4 + \\log_6 9 = \\log_6 36 = 2$"],
            ["Cociente", "$\\log_b \\dfrac{M}{N} = \\log_b M - \\log_b N$", "$\\log_2 24 - \\log_2 3 = \\log_2 8 = 3$"],
            ["Potencia", "$\\log_b(M^k) = k \\log_b M$", "$\\ln(x^5) = 5\\ln x$"],
            ["Cambio de base", "$\\log_b M = \\dfrac{\\ln M}{\\ln b}$", "$\\log_3 7 = \\dfrac{\\ln 7}{\\ln 3} \\approx 1{,}7712$"],
          ],
          caption: "Valen para $M > 0$ y $N > 0$.",
        },
        {
          type: "example",
          title: "Expandir",
          problem: "Escribe $\\ln \\dfrac{x^3 \\sqrt{y}}{z^2}$ como suma y resta de logaritmos simples ($x, y, z > 0$).",
          steps: [
            "Cociente: $\\ln(x^3 \\sqrt{y}) - \\ln(z^2)$.",
            "Producto: $\\ln(x^3) + \\ln \\sqrt{y} - \\ln(z^2)$.",
            "Potencia, con $\\sqrt{y} = y^{1/2}$: $3\\ln x + \\frac{1}{2}\\ln y - 2\\ln z$.",
          ],
        },
        {
          type: "example",
          title: "Condensar",
          problem: "Escribe $2\\ln x - \\ln(x + 1) + \\ln 3$ como un solo logaritmo.",
          steps: [
            "Potencia: $2\\ln x = \\ln(x^2)$.",
            "Lo que suma va al numerador y lo que resta al denominador: $\\ln \\dfrac{3x^2}{x + 1}$.",
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "Lo que las propiedades no dicen",
          md: "- $\\ln(M + N) \\ne \\ln M + \\ln N$. No hay regla para el logaritmo de una suma.\n- $(\\ln x)^2 \\ne 2\\ln x$. El exponente baja solo si está dentro del logaritmo.\n- $\\dfrac{\\ln M}{\\ln N} \\ne \\ln M - \\ln N$. Ese cociente es un cambio de base: $\\log_N M$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $\\log_5 75 - \\log_5 3$.",
            parts: [{ kind: "expr", answer: "2" }],
            solution: ["Cociente: $\\log_5 \\dfrac{75}{3} = \\log_5 25 = 2$."],
          },
        },
      ],
    },
    {
      id: "ecuaciones",
      title: "Ecuaciones exponenciales y logarítmicas",
      blocks: [
        {
          type: "text",
          md: "Hay tres estrategias para las exponenciales y una para las logarítmicas. La elección depende de cómo venga la ecuación.",
        },
        {
          type: "example",
          title: "Igualar bases",
          problem: "Resuelve $2^{x+1} = 8^{x-1}$.",
          steps: [
            "$8 = 2^3$, así que el lado derecho es $2^{3(x-1)} = 2^{3x - 3}$.",
            "Con la misma base, los exponentes son iguales: $x + 1 = 3x - 3$.",
            "$4 = 2x$, así que $x = 2$. Comprobación: $2^3 = 8$ y $8^1 = 8$.",
          ],
          answer: "$x = 2$",
        },
        {
          type: "example",
          title: "Sacar logaritmo",
          problem: "Resuelve $3^x = 7$ y $5e^{2x} = 40$.",
          steps: [
            "Tomamos $\\ln$: $\\ln(3^x) = \\ln 7$. La potencia baja: $x\\ln 3 = \\ln 7$, así que $x = \\dfrac{\\ln 7}{\\ln 3} \\approx 1{,}7712$.",
            "En la segunda primero dejamos sola la exponencial: $e^{2x} = 8$.",
            "Tomamos $\\ln$: $2x = \\ln 8$, así que $x = \\dfrac{\\ln 8}{2} \\approx 1{,}0397$.",
          ],
        },
        {
          type: "example",
          title: "Cambio de variable",
          problem: "Resuelve $e^{2x} - 3e^{x} + 2 = 0$.",
          steps: [
            "Como $e^{2x} = (e^x)^2$, llamamos $u = e^x$: $u^2 - 3u + 2 = 0$.",
            "$(u - 1)(u - 2) = 0$, así que $u = 1$ o $u = 2$.",
            "$e^x = 1$ da $x = 0$, y $e^x = 2$ da $x = \\ln 2$.",
          ],
          answer: "$x = 0$ o $x = \\ln 2$",
        },
        {
          type: "example",
          title: "Ecuación logarítmica",
          problem: "Resuelve $\\log_2 x + \\log_2(x - 2) = 3$.",
          steps: [
            "Dominio: $x > 0$ y $x - 2 > 0$, es decir, $x > 2$.",
            "Producto: $\\log_2[x(x - 2)] = 3$.",
            "Forma exponencial: $x(x - 2) = 2^3 = 8$, o sea $x^2 - 2x - 8 = 0$.",
            "$(x - 4)(x + 2) = 0$ da $x = 4$ o $x = -2$.",
            "$x = -2$ no está en el dominio: $\\log_2(-2)$ no existe. Se descarta.",
          ],
          answer: "$x = 4$",
        },
        {
          type: "note",
          tone: "warning",
          title: "Verifica siempre el dominio",
          md: "Al juntar logaritmos con las propiedades, la ecuación nueva acepta valores que la original no acepta. Por eso aparecen soluciones falsas. Antes de dar la respuesta, sustituye cada candidato en los argumentos de la ecuación original. Todos tienen que ser positivos.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Resuelve $3^{x-1} = 27$.",
            parts: [{ kind: "expr", before: "x =", answer: "4", mistakes: [{ answer: "3", feedback: "$27 = 3^3$, así que $x - 1 = 3$. Falta sumar 1." }] }],
            solution: ["$27 = 3^3$, así que $x - 1 = 3$ y $x = 4$."],
          },
        },
      ],
    },
    {
      id: "aplicaciones",
      title: "Interés compuesto y crecimiento",
      blocks: [
        {
          type: "definition",
          title: "Interés compuesto",
          md: "Un capital $P$ a una tasa anual $r$ (en decimal), capitalizable $n$ veces al año, después de $t$ años se convierte en\n\n$$A = P\\left(1 + \\frac{r}{n}\\right)^{nt}$$\n\nCon capitalización continua: $A = Pe^{rt}$.",
        },
        {
          type: "example",
          title: "Compuesto y continuo",
          problem: "Se invierten 5000 dólares al 8 % anual durante 3 años. Calcula el monto con capitalización trimestral y con capitalización continua.",
          steps: [
            "Trimestral: $n = 4$, la tasa por trimestre es $\\frac{0{,}08}{4} = 0{,}02$ y hay $4 \\cdot 3 = 12$ trimestres.",
            "$A = 5000(1{,}02)^{12} \\approx 6341{,}21$ dólares.",
            "Continua: $A = 5000e^{0{,}08 \\cdot 3} = 5000e^{0{,}24} \\approx 6356{,}25$ dólares.",
          ],
        },
        {
          type: "example",
          title: "¿Cuánto tarda en duplicarse?",
          problem: "Con capitalización continua al 6 % anual, ¿en cuánto tiempo se duplica un capital?",
          steps: [
            "Duplicar es pasar de $P$ a $2P$: $2P = Pe^{0{,}06t}$.",
            "Dividimos entre $P$: $e^{0{,}06t} = 2$. El capital inicial no importa.",
            "Tomamos $\\ln$: $0{,}06t = \\ln 2$, así que $t = \\dfrac{\\ln 2}{0{,}06} \\approx 11{,}55$ años.",
          ],
        },
        {
          type: "note",
          tone: "econ",
          title: "La regla del 70",
          md: "Como $\\ln 2 \\approx 0{,}693$, el tiempo para duplicar es más o menos $\\dfrac{70}{\\text{tasa en porcentaje}}$ años. Al 7 % anual un capital, una economía o una población se duplica en unos 10 años.",
        },
        {
          type: "text",
          md: "El mismo modelo describe cualquier cantidad que cambia a un ritmo proporcional a su tamaño: $P(t) = P_0 e^{kt}$. Con $k > 0$ es crecimiento, por ejemplo una población o un PIB. Con $k < 0$ es decrecimiento, por ejemplo el valor de un equipo que se deprecia en forma exponencial.",
        },
        {
          type: "example",
          title: "Crecimiento de una población",
          problem: "Una ciudad de 2 millones de habitantes crece a una tasa continua de 1,5 % anual. ¿Cuándo llega a 3 millones?",
          steps: [
            "$3 = 2e^{0{,}015t}$, así que $e^{0{,}015t} = 1{,}5$.",
            "Tomamos $\\ln$: $0{,}015t = \\ln 1{,}5$.",
            "$t = \\dfrac{\\ln 1{,}5}{0{,}015} \\approx 27{,}03$ años.",
          ],
        },
        {
          type: "quick",
          exercise: {
            statement: "Con capitalización continua al 7 % anual, ¿en cuántos años se duplica un capital? Escribe la expresión exacta o el resultado con dos decimales.",
            parts: [{ kind: "expr", before: "t =", answer: "\\frac{\\ln 2}{0{,}07}", tol: 0.005, mistakes: [{ answer: "\\frac{\\ln 2}{7}", feedback: "La tasa va en decimal: $7\\,\\% = 0{,}07$." }] }],
            solution: ["$e^{0{,}07t} = 2$ da $t = \\dfrac{\\ln 2}{0{,}07} \\approx 9{,}90$ años."],
          },
        },
      ],
    },
  ],
  exercises: [
    evaluarLog,
    formaExponencial,
    leyesPotencias,
    expVf,
    lnE,
    propiedadesCalc,
    ecMismaBase,
    ecExpLog,
    cambioBase,
    dominioLog,
    ecLog,
    ecExpCuad,
    interes,
    vfLog,
  ],
};

export default topic;
