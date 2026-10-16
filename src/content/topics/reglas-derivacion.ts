import { meta } from "../catalog";
import { choice, trueFalse } from "../helpers";
import type { ExerciseGen, Rich, Topic } from "../types";
import { coef, frac, gcd, poly, signed, terms } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

/** Coeficientes de la derivada de un polinomio (de mayor a menor grado). */
function dpoly(c: number[]): number[] {
  const deg = c.length - 1;
  return c.slice(0, -1).map((k, i) => k * (deg - i));
}

/** x elevado a p, escrito limpio: 0 -> "", 1 -> "x", 3 -> "x^{3}". */
function xp(p: number): string {
  if (p === 0) return "";
  if (p === 1) return "x";
  return `x^{${p}}`;
}

/** Fracción con numerador entero y denominador en LaTeX, con el signo afuera. */
function fracTex(n: number, den: string): string {
  return n < 0 ? `-\\frac{${-n}}{${den}}` : `\\frac{${n}}{${den}}`;
}

/** Prefijo de un coeficiente que multiplica a algo que empieza con número. */
function kdot(k: number): string {
  if (k === 1) return "";
  if (k === -1) return "-";
  return `${k} \\cdot `;
}

/** Fracción reducida p/q escrita como coeficiente con su parte literal. */
function fcoef(p: number, q: number, lit: string): string {
  const g = gcd(p, q);
  return coef(p / g / (q / g), lit);
}

/** Raíz n-ésima de u^m en LaTeX. */
function rootTex(u: string, m: number, n: number): string {
  const inner = m === 1 ? u : `(${u})^{${m}}`;
  return n === 2 ? `\\sqrt{${inner}}` : `\\sqrt[${n}]{${inner}}`;
}

/* ----------------------------------- ejercicios ----------------------------------- */

const polinomio: ExerciseGen = {
  id: "polinomio",
  title: "Derivar un polinomio",
  level: 1,
  generate: (r) => {
    const deg = r.pick([3, 4]);
    let c: number[];
    do {
      c = [r.nz(-5, 5), ...Array.from({ length: deg - 1 }, () => r.int(-6, 6)), r.int(-9, 9)];
    } while (c.filter((x) => x !== 0).length < 3);
    const dc = dpoly(c);
    const ans = poly(dc);
    const noReduce = poly(c.map((k, i) => k * (deg - i)));
    const lines = c
      .map((k, i) => {
        const p = deg - i;
        if (k === 0) return "";
        const t = p === 0 ? String(k) : coef(k, xp(p));
        const d = p === 0 ? "0" : p === 1 ? String(k) : coef(k * p, xp(p - 1));
        return `- $(${t})' = ${d}$`;
      })
      .filter(Boolean)
      .join("\n");
    const mistakes = [
      { answer: noReduce, feedback: "Bajaste el exponente pero no le restaste 1. La regla es $(x^n)' = nx^{n-1}$." },
    ];
    if (c[deg] !== 0) {
      mistakes.push({ answer: `${ans} ${signed(c[deg])}`, feedback: "La derivada de una constante es $0$. El término independiente desaparece." });
    }
    return {
      statement: `Deriva $f(x) = ${poly(c)}$.`,
      parts: [{ kind: "expr", before: "f'(x) =", answer: ans, vars: ["x"], mistakes }],
      hints: [
        "Deriva término a término. La derivada de una suma es la suma de las derivadas.",
        "En cada término baja el exponente a multiplicar y réstale 1: $(ax^n)' = anx^{n-1}$.",
      ],
      solution: [`Derivamos cada término por separado:\n\n${lines}`, `Resultado: $f'(x) = ${ans}$.`],
    };
  },
};

const potencias: ExerciseGen = {
  id: "potencias",
  title: "Exponentes negativos y fraccionarios",
  level: 1,
  generate: (r) => {
    if (r.bool()) {
      const k = r.int(2, 4);
      const c = r.nz(-6, 6);
      const ans = fracTex(-c * k, `x^{${k + 1}}`);
      return {
        statement: `Escribe la función como potencia de $x$ y deriva $f(x) = ${fracTex(c, `x^{${k}}`)}$.`,
        parts: [
          {
            kind: "expr",
            before: "f'(x) =",
            answer: ans,
            vars: ["x"],
            domain: [0.5, 4],
            mistakes: [
              { answer: fracTex(c * k, `x^{${k + 1}}`), feedback: `Perdiste el signo. El exponente es $-${k}$, y al bajarlo multiplica con su signo negativo.` },
              { answer: fracTex(c, `${k}${xp(k - 1)}`), feedback: "Derivaste solo el denominador. Primero escribe la función como potencia con exponente negativo." },
            ],
          },
        ],
        hints: [
          `Pasa la potencia al numerador: $${fracTex(c, `x^{${k}}`)} = ${coef(c, `x^{-${k}}`)}$.`,
          `Aplica la regla de la potencia con $n = -${k}$. Al restarle 1 el exponente queda $-${k + 1}$.`,
        ],
        solution: [
          `Reescribimos: $f(x) = ${coef(c, `x^{-${k}}`)}$.`,
          `Regla de la potencia: $f'(x) = ${c}\\cdot(-${k})x^{-${k}-1} = ${coef(-c * k, `x^{-${k + 1}}`)}$.`,
          `Volvemos a la forma de fracción: $f'(x) = ${ans}$.`,
        ],
      };
    }
    const [m, n] = r.pick([[1, 2], [3, 2], [1, 3], [2, 3], [5, 2], [3, 4]] as const);
    const c = r.nz(-4, 4);
    const fTex = coef(c, rootTex("x", m, n).replace("(x)", "x"));
    const expo = frac(m - n, n);
    const ans = fcoef(c * m, n, `x^{${expo}}`);
    return {
      statement: `Escribe la función como potencia de $x$ y deriva $f(x) = ${fTex}$.`,
      parts: [
        {
          kind: "expr",
          before: "f'(x) =",
          answer: ans,
          vars: ["x"],
          domain: [0.5, 4],
          mistakes: [
            { answer: fcoef(c * m, n, `x^{${frac(m, n)}}`), feedback: "Bajaste el exponente pero no le restaste 1." },
            { answer: fcoef(c * n, m, `x^{${frac(n - m, m)}}`), feedback: `La raíz se escribe con el índice abajo: $\\sqrt[n]{x^m} = x^{m/n}$. Volteaste la fracción del exponente.` },
          ],
        },
      ],
      hints: [
        `Una raíz es una potencia fraccionaria: $\\sqrt[n]{x^m} = x^{m/n}$. Aquí $f(x) = ${coef(c, `x^{${frac(m, n)}}`)}$.`,
        `Resta 1 al exponente: $${frac(m, n)} - 1 = ${expo}$.`,
      ],
      solution: [
        `Reescribimos la raíz como potencia: $f(x) = ${coef(c, `x^{${frac(m, n)}}`)}$.`,
        `Regla de la potencia: $f'(x) = ${c} \\cdot ${frac(m, n)}\\, x^{${frac(m, n)} - 1} = ${ans}$.`,
        m - n < 0
          ? "Si quieres, el exponente negativo se puede devolver al denominador como raíz. Las dos formas son correctas."
          : "El exponente quedó positivo, así que la respuesta ya está en una forma cómoda.",
      ],
    };
  },
};

const producto: ExerciseGen = {
  id: "producto",
  title: "Regla del producto",
  level: 1,
  generate: (r) => {
    const a = r.nz(-4, 4);
    const b = r.nz(-5, 5);
    const c = r.nz(-3, 3);
    const d = r.nz(-6, 6);
    const f1 = terms([[a, "x"], [b, ""]]);
    const f2 = terms([[c, "x^{2}"], [d, ""]]);
    const ans = poly([3 * a * c, 2 * b * c, a * d]);
    return {
      statement: `Deriva $f(x) = (${f1})(${f2})$ usando la regla del producto.`,
      parts: [
        {
          kind: "expr",
          before: "f'(x) =",
          answer: ans,
          vars: ["x"],
          mistakes: [
            { answer: coef(2 * a * c, "x"), feedback: "Multiplicaste las dos derivadas. La derivada de un producto no es el producto de las derivadas: $(uv)' = u'v + uv'$." },
            { answer: `${a}(${f2})`, feedback: "Te faltó el segundo término: el primer factor sin derivar por la derivada del segundo." },
          ],
        },
      ],
      hints: [
        "Llama $u$ al primer paréntesis y $v$ al segundo. La regla es $(uv)' = u'v + uv'$.",
        `Aquí $u' = ${a}$ y $v' = ${coef(2 * c, "x")}$.`,
      ],
      solution: [
        `Sean $u = ${f1}$ y $v = ${f2}$. Entonces $u' = ${a}$ y $v' = ${coef(2 * c, "x")}$.`,
        `$f'(x) = u'v + uv' = ${a}(${f2}) + (${f1})(${coef(2 * c, "x")})$.`,
        `Desarrollando y agrupando: $f'(x) = ${ans}$.`,
      ],
    };
  },
};

const cadenaPotencia: ExerciseGen = {
  id: "cadena-potencia",
  title: "Potencia de una función",
  level: 1,
  generate: (r) => {
    const n = r.int(3, 6);
    const quad = r.bool();
    const a = quad ? r.nz(-3, 4) : r.nz(-3, 4, [1]);
    const b = r.nz(-6, 6);
    const u = quad ? terms([[a, "x^{2}"], [b, ""]]) : terms([[a, "x"], [b, ""]]);
    const du = quad ? coef(2 * a, "x") : String(a);
    const ans = quad ? `${coef(2 * a * n, "x")}(${u})^{${n - 1}}` : `${n * a}(${u})^{${n - 1}}`;
    return {
      statement: `Deriva $f(x) = (${u})^{${n}}$.`,
      parts: [
        {
          kind: "expr",
          before: "f'(x) =",
          answer: ans,
          vars: ["x"],
          domain: [-2, 2],
          mistakes: [
            { answer: `${n}(${u})^{${n - 1}}`, feedback: `Olvidaste multiplicar por la derivada de lo de adentro, que es $${du}$. Esa es la regla de la cadena.` },
          ],
        },
      ],
      hints: [
        "Es una función elevada a una potencia. Usa $(u^n)' = n\\,u^{n-1}\\,u'$.",
        `Lo de adentro es $u = ${u}$, y su derivada es $u' = ${du}$.`,
      ],
      solution: [
        `Con $u = ${u}$ tenemos $f(x) = u^{${n}}$ y $u' = ${du}$.`,
        `$f'(x) = ${n}(${u})^{${n - 1}} \\cdot ${quad ? `${coef(2 * a, "x")}` : `(${a})`}$.`,
        `Ordenando: $f'(x) = ${ans}$.`,
      ],
    };
  },
};

const exponencial: ExerciseGen = {
  id: "exponencial",
  title: "Derivar exponenciales",
  level: 1,
  generate: (r) => {
    if (r.bool()) {
      const a = r.nz(-2, 2);
      const b = r.int(-3, 3);
      const u = poly([a, b, 0]);
      const du = poly([2 * a, b]);
      const ans = b === 0 ? `${coef(2 * a, "x")}e^{${u}}` : `(${du})e^{${u}}`;
      return {
        statement: `Deriva $f(x) = e^{${u}}$.`,
        parts: [
          {
            kind: "expr",
            before: "f'(x) =",
            answer: ans,
            vars: ["x"],
            domain: [-2, 2],
            mistakes: [{ answer: `e^{${u}}`, feedback: `La exponencial se copia igual, pero falta multiplicar por la derivada del exponente, $${du}$.` }],
          },
        ],
        hints: ["$(e^{u})' = e^{u}\\,u'$. La exponencial se copia igual y se multiplica por la derivada del exponente."],
        solution: [
          `El exponente es $u = ${u}$ y su derivada es $u' = ${du}$.`,
          `$f'(x) = e^{${u}} \\cdot ${b === 0 ? coef(2 * a, "x") : `(${du})`} = ${ans}$.`,
        ],
      };
    }
    const base = r.pick([2, 3, 5, 10]);
    const k = r.pick([-2, -1, 2, 3]);
    const c = r.int(-2, 2);
    const u = terms([[k, "x"], [c, ""]]);
    const ans = `${kdot(k)}${base}^{${u}}\\ln ${base}`;
    return {
      statement: `Deriva $f(x) = ${base}^{${u}}$.`,
      parts: [
        {
          kind: "expr",
          before: "f'(x) =",
          answer: ans,
          vars: ["x"],
          domain: [-2, 2],
          mistakes: [
            { answer: `${kdot(k)}${base}^{${u}}`, feedback: `Te faltó el factor $\\ln ${base}$. Solo la base $e$ se deriva sin logaritmo, porque $\\ln e = 1$.` },
            { answer: `${k}(${u})\\cdot ${base}^{${terms([[k, "x"], [c - 1, ""]])}}`, feedback: "Usaste la regla de la potencia. Esa regla es para base variable y exponente fijo. Aquí la base es fija y el exponente variable." },
          ],
        },
      ],
      hints: [
        "Para una base constante $a$: $(a^{u})' = a^{u}\\,\\ln a \\cdot u'$.",
        `La derivada del exponente $${u}$ es $${k}$.`,
      ],
      solution: [
        `La base es la constante $${base}$ y el exponente es $u = ${u}$, con $u' = ${k}$.`,
        `$f'(x) = ${base}^{${u}} \\cdot \\ln ${base} \\cdot (${k}) = ${ans}$.`,
      ],
    };
  },
};

const RULES = {
  prod: { label: "Regla del producto", why: "Para usar la regla del producto la función tiene que ser una multiplicación de dos funciones que dependen de $x$." },
  coc: { label: "Regla del cociente", why: "El cociente se usa cuando hay una división con $x$ tanto arriba como abajo." },
  cad: { label: "Regla de la cadena", why: "La cadena se usa cuando hay una función dentro de otra, como $(\\dots)^n$, $e^{(\\dots)}$ o $\\ln(\\dots)$ con algo más que $x$ adentro." },
  pot: { label: "Solo potencia y suma", why: "Las reglas básicas alcanzan solo cuando cada término es una constante por $x^n$." },
} as const;
type RuleKey = keyof typeof RULES;

const elegirRegla: ExerciseGen = {
  id: "elegir-regla",
  title: "¿Qué regla toca primero?",
  level: 1,
  generate: (r) => {
    const n = r.int(2, 5);
    const k = r.int(1, 9);
    const items: [string, RuleKey, string][] = [
      [`x^{${n}}e^{x}`, "prod", `Es $x^{${n}}$ multiplicado por $e^{x}$, dos funciones de $x$.`],
      [`\\frac{x^{2}+${k}}{x-${n}}`, "coc", "Hay $x$ en el numerador y en el denominador."],
      [`e^{x^{2}+${k}}`, "cad", `El exponente $x^{2}+${k}$ es una función dentro de la exponencial.`],
      [`(${n}x-${k})^{7}`, "cad", "Es un paréntesis elevado a una potencia: función dentro de otra."],
      [`\\ln(x^{2}+${k})`, "cad", "El logaritmo tiene adentro $x^2 + " + k + "$, no solo $x$."],
      [`x^{${n}}\\ln x`, "prod", "Es una potencia de $x$ multiplicada por $\\ln x$."],
      [`\\frac{e^{x}}{x^{${n}}}`, "coc", "Hay una división con $x$ arriba y abajo."],
      [`\\sqrt{${n}x+${k}}`, "cad", "La raíz tiene adentro una expresión, no solo $x$."],
      [`${k}x^{${n + 2}} - ${n}x`, "pot", "Cada término es una constante por una potencia de $x$."],
      [`\\frac{${k}}{x^{${n}}}`, "pot", `Se reescribe como $${k}x^{-${n}}$ y basta la regla de la potencia.`],
    ];
    const [f, key, why] = r.pick(items);
    const wrong = (Object.keys(RULES) as RuleKey[]).filter((x) => x !== key).map((x) => [RULES[x].label, RULES[x].why] as [Rich, Rich]);
    return {
      statement: `¿Qué regla necesitas primero para derivar $f(x) = ${f}$?`,
      parts: [choice(RULES[key].label, wrong)],
      hints: ["Mira cuál es la última operación que harías si calcularas $f(x)$ con un número. Esa decide la regla."],
      solution: [why, `Por eso la regla que se aplica primero es: ${RULES[key].label.toLowerCase()}.`],
    };
  },
};

const cociente: ExerciseGen = {
  id: "cociente",
  title: "Regla del cociente",
  level: 2,
  generate: (r) => {
    if (r.bool()) {
      let a: number, b: number, c: number, d: number;
      do {
        a = r.nz(-5, 5);
        b = r.int(-6, 6);
        c = r.nz(-3, 3);
        d = r.nz(-6, 6);
      } while (a * d - b * c === 0);
      const num = terms([[a, "x"], [b, ""]]);
      const den = terms([[c, "x"], [d, ""]]);
      const ans = fracTex(a * d - b * c, `(${den})^{2}`);
      return {
        statement: `Deriva $f(x) = \\dfrac{${num}}{${den}}$.`,
        parts: [
          {
            kind: "expr",
            before: "f'(x) =",
            answer: ans,
            vars: ["x"],
            mistakes: [
              { answer: frac(a, c), feedback: "Dividiste las derivadas. La derivada de un cociente no es el cociente de las derivadas." },
              { answer: fracTex(b * c - a * d, `(${den})^{2}`), feedback: "El orden del numerador importa: primero va la derivada de arriba por lo de abajo, y se le resta lo de arriba por la derivada de abajo." },
            ],
          },
        ],
        hints: [
          "$\\left(\\dfrac{u}{v}\\right)' = \\dfrac{u'v - uv'}{v^{2}}$. Un truco para recordarlo: \"derivada de arriba por abajo, menos arriba por derivada de abajo, sobre abajo al cuadrado\".",
          `Aquí $u' = ${a}$ y $v' = ${c}$.`,
        ],
        solution: [
          `Sean $u = ${num}$ y $v = ${den}$, con $u' = ${a}$ y $v' = ${c}$.`,
          `$f'(x) = \\dfrac{${a}(${den}) - (${num})(${c})}{(${den})^{2}}$.`,
          `En el numerador los términos con $x$ se cancelan y queda $${a * d - b * c}$. Resultado: $f'(x) = ${ans}$.`,
        ],
      };
    }
    const b = r.nz(-6, 6);
    const d = r.nz(-5, 5);
    const num = terms([[1, "x^{2}"], [b, ""]]);
    const den = terms([[1, "x"], [d, ""]]);
    const top = poly([1, 2 * d, -b]);
    const ans = `\\frac{${top}}{(${den})^{2}}`;
    return {
      statement: `Deriva $f(x) = \\dfrac{${num}}{${den}}$.`,
      parts: [
        {
          kind: "expr",
          before: "f'(x) =",
          answer: ans,
          vars: ["x"],
          mistakes: [
            { answer: "2x", feedback: "Dividiste las derivadas, $\\frac{2x}{1}$. La derivada de un cociente no funciona así." },
            { answer: `\\frac{${poly([-1, -2 * d, b])}}{(${den})^{2}}`, feedback: "Restaste en el orden contrario. Va $u'v - uv'$, no $uv' - u'v$." },
          ],
        },
      ],
      hints: [
        "$\\left(\\dfrac{u}{v}\\right)' = \\dfrac{u'v - uv'}{v^{2}}$.",
        `Aquí $u' = 2x$ y $v' = 1$. Desarrolla el numerador con cuidado.`,
      ],
      solution: [
        `Sean $u = ${num}$ y $v = ${den}$, con $u' = 2x$ y $v' = 1$.`,
        `$f'(x) = \\dfrac{2x(${den}) - (${num})}{(${den})^{2}}$.`,
        `Numerador: $${poly([2, 2 * d, 0])} - ${num.startsWith("x") ? `(${num})` : num} = ${top}$. Resultado: $f'(x) = ${ans}$.`,
      ],
    };
  },
};

const logaritmo: ExerciseGen = {
  id: "logaritmo",
  title: "Derivar logaritmos",
  level: 2,
  generate: (r) => {
    const kind = r.pick(["ln", "logb", "lnk"] as const);
    if (kind === "lnk") {
      const k = r.int(2, 9);
      const n = r.int(1, 4);
      const ans = `\\frac{${n}}{x}`;
      return {
        statement: `Deriva $f(x) = \\ln(${k}${xp(n)})$.`,
        parts: [
          {
            kind: "expr",
            before: "f'(x) =",
            answer: ans,
            vars: ["x"],
            domain: [0.5, 4],
            mistakes: [{ answer: `\\frac{1}{${k}${xp(n)}}`, feedback: "Pusiste $\\frac{1}{u}$ pero falta multiplicar por $u'$. Recuerda $(\\ln u)' = \\frac{u'}{u}$." }],
          },
        ],
        hints: [
          `Puedes usar propiedades antes de derivar: $\\ln(${k}${xp(n)}) = \\ln ${k} + ${n === 1 ? "" : n}\\ln x$.`,
          `$\\ln ${k}$ es una constante, así que su derivada es $0$.`,
        ],
        solution: [
          `Por propiedades: $f(x) = \\ln ${k} + ${n === 1 ? "" : n}\\ln x$.`,
          `$\\ln ${k}$ es constante y $(\\ln x)' = \\frac{1}{x}$. Entonces $f'(x) = ${ans}$.`,
          `Con la cadena sale lo mismo: $\\dfrac{${n === 1 ? k : `${k * n}x^{${n - 1}}`.replace("x^{1}", "x")}}{${k}${xp(n)}} = ${ans}$.`,
        ],
      };
    }
    const a = r.int(1, 3);
    const b = r.int(0, 5);
    const c = r.int(1, 9);
    const u = poly([a, b, c]);
    const du = poly([2 * a, b]);
    if (kind === "ln") {
      const ans = `\\frac{${du}}{${u}}`;
      return {
        statement: `Deriva $f(x) = \\ln(${u})$.`,
        parts: [
          {
            kind: "expr",
            before: "f'(x) =",
            answer: ans,
            vars: ["x"],
            domain: [0.5, 4],
            mistakes: [{ answer: `\\frac{1}{${u}}`, feedback: `Falta multiplicar por la derivada de adentro, $${du}$. $(\\ln u)' = \\frac{u'}{u}$.` }],
          },
        ],
        hints: ["$(\\ln u)' = \\dfrac{u'}{u}$: la derivada de lo de adentro sobre lo de adentro."],
        solution: [`Lo de adentro es $u = ${u}$, con $u' = ${du}$.`, `$f'(x) = \\dfrac{u'}{u} = ${ans}$.`],
      };
    }
    const base = r.pick([2, 3, 5, 10]);
    const logTex = base === 10 ? "\\log" : `\\log_{${base}}`;
    const ans = `\\frac{${du}}{(${u})\\ln ${base}}`;
    return {
      statement: `Deriva $f(x) = ${logTex}(${u})$.${base === 10 ? " Aquí $\\log$ es el logaritmo en base 10." : ""}`,
      parts: [
        {
          kind: "expr",
          before: "f'(x) =",
          answer: ans,
          vars: ["x"],
          domain: [0.5, 4],
          mistakes: [
            { answer: `\\frac{${du}}{${u}}`, feedback: `Esa es la derivada de $\\ln$. Para base $${base}$ falta dividir entre $\\ln ${base}$.` },
            { answer: `\\frac{1}{(${u})\\ln ${base}}`, feedback: `Falta multiplicar por la derivada de adentro, $${du}$.` },
          ],
        },
      ],
      hints: [
        "$(\\log_b u)' = \\dfrac{u'}{u \\ln b}$. Sale de cambiar de base: $\\log_b u = \\dfrac{\\ln u}{\\ln b}$.",
        `Aquí $u = ${u}$ y $u' = ${du}$.`,
      ],
      solution: [
        `Cambiamos de base: $f(x) = \\dfrac{\\ln(${u})}{\\ln ${base}}$, y $\\ln ${base}$ es una constante.`,
        `Derivamos el logaritmo natural con la cadena: $f'(x) = \\dfrac{1}{\\ln ${base}} \\cdot \\dfrac{${du}}{${u}} = ${ans}$.`,
      ],
    };
  },
};

const raizCadena: ExerciseGen = {
  id: "raiz-cadena",
  title: "Raíces de una función",
  level: 2,
  generate: (r) => {
    const [m, n] = r.pick([[1, 2], [1, 2], [1, 3], [2, 3], [3, 2]] as const);
    const a = r.int(1, 3);
    const c = r.int(1, 9);
    const u = terms([[a, "x^{2}"], [c, ""]]);
    const fTex = rootTex(u, m, n);
    const expo = frac(m - n, n);
    // f' = (m/n) u^{(m-n)/n} * 2a x
    const ans = `${fcoef(2 * a * m, n, "x")}(${u})^{${expo}}`;
    return {
      statement: `Deriva $f(x) = ${fTex}$.`,
      parts: [
        {
          kind: "expr",
          before: "f'(x) =",
          answer: ans,
          vars: ["x"],
          mistakes: [
            { answer: `${frac(m, n)}(${u})^{${expo}}`, feedback: `Falta multiplicar por la derivada de adentro, $${coef(2 * a, "x")}$.` },
            { answer: `${fcoef(2 * a * m, n, "x")}(${u})^{${frac(m, n)}}`, feedback: "Al exponente le falta restarle 1." },
          ],
        },
      ],
      hints: [
        `Escribe la raíz como potencia: $f(x) = (${u})^{${frac(m, n)}}$.`,
        `Ahora es una potencia de una función: $(u^{k})' = k\\,u^{k-1}u'$ con $u' = ${coef(2 * a, "x")}$.`,
      ],
      solution: [
        `Como potencia: $f(x) = (${u})^{${frac(m, n)}}$.`,
        `$f'(x) = ${frac(m, n)}(${u})^{${frac(m, n)} - 1} \\cdot ${coef(2 * a, "x")} = ${ans}$.`,
        m === 1 && n === 2
          ? `En forma de raíz: $f'(x) = \\dfrac{${coef(a, "x")}}{\\sqrt{${u}}}$.`
          : "El exponente negativo o fraccionario se puede devolver a forma de raíz si lo prefieres.",
      ],
    };
  },
};

const productoExpLog: ExerciseGen = {
  id: "producto-exp-log",
  title: "Productos con exponenciales y logaritmos",
  level: 2,
  generate: (r) => {
    const kind = r.pick(["xe", "xln", "eln"] as const);
    if (kind === "xe") {
      const k = r.int(1, 3);
      const a = r.pick([-2, -1, 2, 3]);
      const inner = terms([[k, xp(k - 1)], [a, xp(k)]]);
      const ans = `e^{${coef(a, "x")}}(${inner})`;
      return {
        statement: `Deriva $f(x) = ${xp(k)}e^{${coef(a, "x")}}$.`,
        parts: [
          {
            kind: "expr",
            before: "f'(x) =",
            answer: ans,
            vars: ["x"],
            domain: [-2, 2],
            mistakes: [
              { answer: `${coef(k * a, xp(k - 1))}e^{${coef(a, "x")}}`, feedback: "Multiplicaste las derivadas de cada factor. Usa la regla del producto." },
              { answer: `e^{${coef(a, "x")}}(${terms([[k, xp(k - 1)], [1, xp(k)]])})`, feedback: `Olvidaste la cadena en la exponencial: $(e^{${coef(a, "x")}})' = ${a}e^{${coef(a, "x")}}$.` },
            ],
          },
        ],
        hints: ["Regla del producto: $(uv)' = u'v + uv'$.", `Para el segundo factor usa la cadena: $(e^{${coef(a, "x")}})' = ${a}e^{${coef(a, "x")}}$.`],
        solution: [
          `$u = ${xp(k)}$, $u' = ${k === 1 ? "1" : coef(k, xp(k - 1))}$. $v = e^{${coef(a, "x")}}$, $v' = ${coef(a, `e^{${coef(a, "x")}}`)}$.`,
          `$f'(x) = ${k === 1 ? "" : coef(k, xp(k - 1))}e^{${coef(a, "x")}} + ${xp(k)}\\cdot ${a === -1 ? "(-1)" : a < 0 ? `(${a})` : a}e^{${coef(a, "x")}}$.`,
          `Sacando factor común $e^{${coef(a, "x")}}$: $f'(x) = ${ans}$.`,
        ],
      };
    }
    if (kind === "xln") {
      const k = r.int(1, 4);
      const ans = k === 1 ? "\\ln x + 1" : `${coef(k, xp(k - 1))}\\ln x + ${xp(k - 1)}`;
      return {
        statement: `Deriva $f(x) = ${xp(k)}\\ln x$.`,
        parts: [
          {
            kind: "expr",
            before: "f'(x) =",
            answer: ans,
            vars: ["x"],
            domain: [0.5, 4],
            mistakes: [{ answer: k === 2 ? "2" : k === 1 ? "\\frac{1}{x}" : coef(k, xp(k - 2)), feedback: "Multiplicaste las dos derivadas. Usa $(uv)' = u'v + uv'$." }],
          },
        ],
        hints: ["Regla del producto con $u = " + xp(k) + "$ y $v = \\ln x$.", "$(\\ln x)' = \\dfrac{1}{x}$."],
        solution: [
          `$f'(x) = ${k === 1 ? "1" : coef(k, xp(k - 1))}\\cdot\\ln x + ${xp(k)}\\cdot\\dfrac{1}{x}$.`,
          `Simplificando $\\frac{${xp(k)}}{x} = ${k === 1 ? "1" : xp(k - 1)}$: $f'(x) = ${ans}$.`,
        ],
      };
    }
    const a = r.pick([1, 2, 3, -1]);
    const b = r.int(2, 5);
    const ex = `e^{${coef(a, "x")}}`;
    const ans = `${coef(a, ex)}\\ln(${b}x) + \\frac{${ex}}{x}`;
    return {
      statement: `Deriva $f(x) = ${ex}\\ln(${b}x)$.`,
      parts: [
        {
          kind: "expr",
          before: "f'(x) =",
          answer: ans,
          vars: ["x"],
          domain: [0.5, 3],
          mistakes: [
            { answer: `\\frac{${coef(a, ex)}}{x}`, feedback: "Multiplicaste las dos derivadas. Usa la regla del producto." },
            { answer: `${coef(a, ex)}\\ln(${b}x) + \\frac{${ex}}{${b}x}`, feedback: `$(\\ln ${b}x)' = \\frac{${b}}{${b}x} = \\frac{1}{x}$. Te faltó multiplicar por la derivada de adentro.` },
          ],
        },
      ],
      hints: ["Regla del producto: $(uv)' = u'v + uv'$.", `$(\\ln ${b}x)' = \\dfrac{${b}}{${b}x} = \\dfrac{1}{x}$.`],
      solution: [
        `$u = ${ex}$, $u' = ${coef(a, ex)}$. $v = \\ln(${b}x)$, $v' = \\frac{1}{x}$.`,
        `$f'(x) = ${ans}$.`,
      ],
    };
  },
};

const vfErrores: ExerciseGen = {
  id: "vf-errores",
  title: "¿Derivada bien o mal hecha?",
  level: 2,
  generate: (r) => {
    const n = r.int(2, 5);
    const k = r.int(2, 9);
    const b = r.pick([2, 3, 5, 7]);
    const items: [string, boolean, string][] = [
      [`(x^{${n}}e^{x})' = ${coef(n, xp(n - 1))}e^{x}`, false, `Eso es derivar cada factor y multiplicar. Con la regla del producto: $${coef(n, xp(n - 1))}e^{x} + x^{${n}}e^{x}$.`],
      [`(\\ln ${k}x)' = \\frac{1}{x}`, true, `$\\ln ${k}x = \\ln ${k} + \\ln x$, y $\\ln ${k}$ es constante. Con la cadena también sale $\\frac{${k}}{${k}x} = \\frac{1}{x}$.`],
      [`(${b}^{x})' = x\\cdot ${b}^{x-1}`, false, `La regla de la potencia es para base variable y exponente fijo. Aquí la base es fija: $(${b}^{x})' = ${b}^{x}\\ln ${b}$.`],
      [`(e^{${k}})' = e^{${k}}`, false, `$e^{${k}}$ es un número, no depende de $x$. Su derivada es $0$.`],
      [`\\left(\\frac{1}{x^{${n}}}\\right)' = -\\frac{${n}}{x^{${n + 1}}}`, true, `$\\frac{1}{x^{${n}}} = x^{-${n}}$ y su derivada es $-${n}x^{-${n + 1}}$.`],
      [`(\\sqrt{x^{2}+${k}})' = \\frac{1}{2\\sqrt{x^{2}+${k}}}`, false, `Falta multiplicar por la derivada de adentro, $2x$. Lo correcto es $\\frac{x}{\\sqrt{x^{2}+${k}}}$.`],
      [`(e^{-${k}x})' = -${k}e^{-${k}x}`, true, `Por la cadena, la exponencial se copia y se multiplica por la derivada del exponente, $-${k}$.`],
      [`(\\log_{${b}} x)' = \\frac{1}{x\\ln ${b}}`, true, `Como $\\log_{${b}} x = \\frac{\\ln x}{\\ln ${b}}$, su derivada es $\\frac{1}{x \\ln ${b}}$.`],
      [`(x^{e})' = e\\,x^{e-1}`, true, "$e$ es una constante, así que $x^{e}$ es una potencia común y se deriva con la regla de la potencia."],
      [`\\left(\\frac{x^{${n}}}{x+${k}}\\right)' = ${coef(n, xp(n - 1))}`, false, `Eso es derivar arriba y abajo por separado: $\\frac{${coef(n, xp(n - 1))}}{1}$. La derivada de un cociente no es el cociente de las derivadas. Usa $\\frac{u'v - uv'}{v^{2}}$.`],
    ];
    const [claim, isTrue, why] = r.pick(items);
    return {
      statement: `¿Es correcta esta derivada? $$${claim}$$`,
      parts: [trueFalse(isTrue, why)],
      hints: ["Identifica qué regla corresponde y aplícala tú. Luego compara."],
      solution: [`${isTrue ? "Verdadero" : "Falso"}. ${why}`],
    };
  },
};

const parcialLogaritmo: ExerciseGen = {
  id: "parcial-logaritmo",
  title: "Logaritmos compuestos (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const kind = r.pick(["raiz", "cuadrado", "cociente", "sqrtsum", "logexp"] as const);
    if (kind === "raiz") {
      const n = r.pick([3, 5]);
      const m = r.pick([2, 4]);
      const c = r.int(1, 9);
      const u = `x^{2}+${c}`;
      const g = gcd(2 * m, n);
      const ans = `\\frac{${coef((2 * m) / g, "x")}}{${n / g === 1 ? "" : n / g}(${u})}`;
      return {
        statement: `Deriva $f(x) = \\ln\\sqrt[${n}]{(${u})^{${m}}}$.`,
        parts: [
          {
            kind: "expr",
            before: "f'(x) =",
            answer: ans,
            vars: ["x"],
            mistakes: [
              { answer: `\\frac{${frac(m, n)}}{${u}}`, feedback: "Falta multiplicar por la derivada de $x^2 + " + c + "$, que es $2x$." },
              { answer: `\\frac{2x}{${u}}`, feedback: `Perdiste el factor $${frac(m, n)}$ que sale de la raíz. $\\ln\\sqrt[${n}]{u^{${m}}} = ${frac(m, n)}\\ln u$.` },
            ],
          },
        ],
        hints: [
          `Antes de derivar, baja el exponente con propiedades: $\\ln\\sqrt[${n}]{u^{${m}}} = \\ln u^{${m}/${n}} = ${frac(m, n)}\\ln u$.`,
          "Ahora $(\\ln u)' = \\dfrac{u'}{u}$.",
        ],
        solution: [
          `Por propiedades del logaritmo: $f(x) = ${frac(m, n)}\\ln(${u})$.`,
          `$f'(x) = ${frac(m, n)}\\cdot\\dfrac{2x}{${u}} = ${ans}$.`,
        ],
      };
    }
    if (kind === "cuadrado") {
      const c = r.nz(-1, 5);
      const u = `x^{2} ${signed(c)}`;
      const ans = `\\frac{16x\\ln(${u})}{9(${u})}`;
      return {
        statement: `Deriva $g(x) = \\left[\\ln\\sqrt[3]{(${u})^{2}}\\right]^{2}$.`,
        parts: [
          {
            kind: "expr",
            before: "g'(x) =",
            answer: ans,
            vars: ["x"],
            domain: c < 0 ? [1.5, 4] : [0.5, 4],
            mistakes: [
              { answer: `\\frac{8x\\ln(${u})}{9(${u})}`, feedback: "Revisa los factores: el $\\frac{2}{3}$ queda al cuadrado, $\\frac{4}{9}$, y al derivar el cuadrado sale otro $2$." },
              { answer: `\\frac{4}{3}\\ln(${u})`, feedback: "Derivaste el cuadrado pero no lo de adentro. Falta multiplicar por la derivada de $\\frac{2}{3}\\ln(" + u + ")$." },
            ],
          },
        ],
        hints: [
          `Simplifica primero: $\\ln\\sqrt[3]{(${u})^{2}} = \\frac{2}{3}\\ln(${u})$, así que $g(x) = \\frac{4}{9}\\left[\\ln(${u})\\right]^{2}$.`,
          "Es una potencia de una función: $(u^2)' = 2u\\,u'$, con $u = \\ln(" + u + ")$.",
        ],
        solution: [
          `Por propiedades: $g(x) = \\left[\\tfrac{2}{3}\\ln(${u})\\right]^{2} = \\tfrac{4}{9}\\left[\\ln(${u})\\right]^{2}$.`,
          `Regla de la cadena: $g'(x) = \\tfrac{4}{9}\\cdot 2\\ln(${u})\\cdot\\dfrac{2x}{${u}}$.`,
          `Resultado: $g'(x) = ${ans}$.`,
        ],
      };
    }
    if (kind === "cociente") {
      const a = r.int(1, 5);
      const b = r.int(1, 5);
      const ans = `\\frac{${a + b}}{(x-${a})(x+${b})}`;
      return {
        statement: `Deriva $f(x) = \\ln\\left(\\dfrac{x-${a}}{x+${b}}\\right)$.`,
        parts: [
          {
            kind: "expr",
            before: "f'(x) =",
            answer: ans,
            vars: ["x"],
            domain: [a + 0.5, a + 4],
            mistakes: [
              { answer: `\\frac{x+${b}}{x-${a}}`, feedback: "Pusiste $\\frac{1}{u}$ sin multiplicar por $u'$." },
              { answer: `\\frac{1}{x-${a}} + \\frac{1}{x+${b}}`, feedback: "El logaritmo de un cociente es una resta: $\\ln(x-" + a + ") - \\ln(x+" + b + ")$." },
            ],
          },
        ],
        hints: [
          `Usa $\\ln\\frac{A}{B} = \\ln A - \\ln B$ antes de derivar. Te ahorras la regla del cociente.`,
          "Cada logaritmo se deriva con $(\\ln u)' = \\dfrac{u'}{u}$.",
        ],
        solution: [
          `$f(x) = \\ln(x-${a}) - \\ln(x+${b})$.`,
          `$f'(x) = \\dfrac{1}{x-${a}} - \\dfrac{1}{x+${b}}$.`,
          `Con común denominador: $f'(x) = \\dfrac{(x+${b}) - (x-${a})}{(x-${a})(x+${b})} = ${ans}$.`,
        ],
      };
    }
    if (kind === "sqrtsum") {
      const c = r.int(1, 9);
      const ans = `\\frac{1}{\\sqrt{x^{2}+${c}}}`;
      return {
        statement: `Deriva $f(x) = \\ln\\left(x + \\sqrt{x^{2}+${c}}\\right)$ y simplifica.`,
        parts: [
          {
            kind: "expr",
            before: "f'(x) =",
            answer: ans,
            vars: ["x"],
            mistakes: [{ answer: `\\frac{1}{x+\\sqrt{x^{2}+${c}}}`, feedback: "Ese es $\\frac{1}{u}$. Falta multiplicar por $u' = 1 + \\frac{x}{\\sqrt{x^2+" + c + "}}$." }],
          },
        ],
        hints: [
          `$u = x + \\sqrt{x^{2}+${c}}$ y $u' = 1 + \\dfrac{x}{\\sqrt{x^{2}+${c}}}$.`,
          `Escribe $u'$ con denominador común: $u' = \\dfrac{\\sqrt{x^{2}+${c}} + x}{\\sqrt{x^{2}+${c}}}$. Compáralo con $u$.`,
        ],
        solution: [
          `$u' = 1 + \\dfrac{x}{\\sqrt{x^{2}+${c}}} = \\dfrac{\\sqrt{x^{2}+${c}} + x}{\\sqrt{x^{2}+${c}}}$.`,
          `$f'(x) = \\dfrac{u'}{u} = \\dfrac{\\sqrt{x^{2}+${c}} + x}{\\sqrt{x^{2}+${c}}\\,(x + \\sqrt{x^{2}+${c}})}$.`,
          `El numerador y el paréntesis del denominador son iguales y se cancelan: $f'(x) = ${ans}$.`,
        ],
      };
    }
    const base = r.pick([2, 3, 5]);
    const c = r.int(1, 8);
    const k = r.pick([1, 2, 3, 5]);
    const ex = `e^{${coef(k, "x")}}`;
    const ans = `${ex}\\left(\\frac{3x^{2}}{2(x^{3}+${c})\\ln ${base}} + \\frac{${k}}{2}\\log_{${base}}(x^{3}+${c})\\right)`;
    return {
      statement: `Deriva $f(x) = \\log_{${base}}\\left(\\sqrt{x^{3}+${c}}\\right) e^{${coef(k, "x")}}$.`,
      parts: [
        {
          kind: "expr",
          before: "f'(x) =",
          answer: ans,
          vars: ["x"],
          domain: [0.5, 2],
          mistakes: [
            { answer: `${ex}\\left(\\frac{3x^{2}}{2(x^{3}+${c})} + \\frac{${k}}{2}\\log_{${base}}(x^{3}+${c})\\right)`, feedback: `Al derivar $\\log_{${base}}$ falta dividir entre $\\ln ${base}$.` },
          ],
        },
      ],
      hints: [
        `Simplifica el logaritmo: $\\log_{${base}}\\sqrt{x^{3}+${c}} = \\frac{1}{2}\\log_{${base}}(x^{3}+${c})$.`,
        "Después es un producto: $(uv)' = u'v + uv'$, con $v = e^{" + coef(k, "x") + "}$.",
      ],
      solution: [
        `$f(x) = \\tfrac{1}{2}\\log_{${base}}(x^{3}+${c})\\cdot ${ex}$.`,
        `$u = \\tfrac{1}{2}\\log_{${base}}(x^{3}+${c})$ tiene $u' = \\dfrac{3x^{2}}{2(x^{3}+${c})\\ln ${base}}$. $v = ${ex}$ tiene $v' = ${coef(k, ex)}$.`,
        `$f'(x) = u'v + uv' = ${ans}$.`,
      ],
    };
  },
};

const parcialCociente: ExerciseGen = {
  id: "parcial-cociente",
  title: "Cocientes y productos largos (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const kind = r.pick(["raices", "lnpot", "lnsqrt", "gauss", "expfrac"] as const);
    if (kind === "raices") {
      const k = r.int(1, 3);
      const ans = `\\frac{${k}}{\\sqrt{x}\\,(${k}-\\sqrt{x})^{2}}`;
      return {
        statement: `Deriva $f(x) = \\dfrac{${k}+\\sqrt{x}}{${k}-\\sqrt{x}}$.`,
        parts: [
          {
            kind: "expr",
            before: "f'(x) =",
            answer: ans,
            vars: ["x"],
            domain: [0.1, 0.9],
            mistakes: [{ answer: "-1", feedback: "Dividiste las derivadas de arriba y de abajo. Usa la regla del cociente." }],
          },
        ],
        hints: [
          "$(\\sqrt{x})' = \\dfrac{1}{2\\sqrt{x}}$. La derivada de abajo es $-\\dfrac{1}{2\\sqrt{x}}$.",
          "En el numerador de la regla del cociente saca factor común $\\frac{1}{2\\sqrt{x}}$.",
        ],
        solution: [
          `$u = ${k}+\\sqrt{x}$, $u' = \\frac{1}{2\\sqrt{x}}$. $v = ${k}-\\sqrt{x}$, $v' = -\\frac{1}{2\\sqrt{x}}$.`,
          `Numerador: $\\frac{1}{2\\sqrt{x}}(${k}-\\sqrt{x}) + (${k}+\\sqrt{x})\\frac{1}{2\\sqrt{x}} = \\frac{1}{2\\sqrt{x}}\\cdot ${2 * k} = \\frac{${k}}{\\sqrt{x}}$.`,
          `$f'(x) = ${ans}$.`,
        ],
      };
    }
    if (kind === "lnpot") {
      const k = r.int(1, 3);
      const ans = `\\frac{1-${k === 1 ? "" : k}\\ln x}{x^{${k + 1}}}`;
      return {
        statement: `Deriva $f(x) = \\dfrac{\\ln x}{${xp(k)}}$.`,
        parts: [
          {
            kind: "expr",
            before: "f'(x) =",
            answer: ans,
            vars: ["x"],
            domain: [0.5, 4],
            mistakes: [
              { answer: k === 1 ? "\\frac{1}{x}" : `\\frac{1}{${k}x^{${k}}}`, feedback: "Dividiste las derivadas. La regla del cociente es $\\frac{u'v - uv'}{v^2}$." },
              { answer: `\\frac{${k === 1 ? "" : k}\\ln x - 1}{x^{${k + 1}}}`, feedback: "Restaste al revés. Primero va $u'v$." },
            ],
          },
        ],
        hints: ["Regla del cociente con $u = \\ln x$ y $v = " + xp(k) + "$.", "Al final simplifica una $x$ del numerador con el denominador."],
        solution: [
          `$f'(x) = \\dfrac{\\frac{1}{x}\\cdot ${xp(k)} - \\ln x\\cdot ${k === 1 ? "1" : coef(k, xp(k - 1))}}{x^{${2 * k}}}$.`,
          `El numerador es $${k === 1 ? "1" : xp(k - 1)} - ${k === 1 ? "" : coef(k, xp(k - 1))}\\ln x${k === 1 ? "" : ` = ${xp(k - 1)}(1 - ${k}\\ln x)`}$.`,
          `Simplificando: $f'(x) = ${ans}$.`,
        ],
      };
    }
    if (kind === "lnsqrt") {
      const ans = "\\frac{2-\\ln x}{2x\\sqrt{x}}";
      const c = r.int(2, 5);
      // f = c ln x / sqrt x
      const full = `\\frac{${c}(2-\\ln x)}{2x\\sqrt{x}}`;
      return {
        statement: `Deriva $h(x) = \\dfrac{${c}\\ln x}{\\sqrt{x}}$.`,
        parts: [
          {
            kind: "expr",
            before: "h'(x) =",
            answer: full,
            vars: ["x"],
            domain: [0.5, 4],
            mistakes: [{ answer: `\\frac{${2 * c}}{\\sqrt{x}}`, feedback: "Dividiste las derivadas. Usa la regla del cociente." }],
          },
        ],
        hints: ["La constante sale afuera: $h(x) = " + c + "\\cdot\\dfrac{\\ln x}{\\sqrt{x}}$.", "Regla del cociente con $u = \\ln x$ y $v = \\sqrt{x}$, $v' = \\frac{1}{2\\sqrt{x}}$."],
        solution: [
          `$\\left(\\dfrac{\\ln x}{\\sqrt{x}}\\right)' = \\dfrac{\\frac{1}{x}\\sqrt{x} - \\ln x\\cdot\\frac{1}{2\\sqrt{x}}}{x}$.`,
          `Multiplicamos arriba y abajo por $2\\sqrt{x}$: $\\dfrac{2 - \\ln x}{2x\\sqrt{x}}$, porque $\\frac{1}{x}\\sqrt{x}\\cdot 2\\sqrt{x} = 2$.`,
          `Con la constante: $h'(x) = ${full}$. Sin ella sería $${ans}$.`,
        ],
      };
    }
    if (kind === "gauss") {
      const k = r.pick([1, 2, 3]);
      const half = r.bool() && k === 1;
      const expo = half ? "-\\frac{x^{2}}{2}" : `-${k === 1 ? "" : k}x^{2}`;
      const kk = half ? 0.5 : k;
      const ans = `e^{${expo}}(1 - ${2 * kk === 1 ? "" : 2 * kk}x^{2})`;
      return {
        statement: `Deriva $F(x) = x\\,e^{${expo}}$.`,
        parts: [
          {
            kind: "expr",
            before: "F'(x) =",
            answer: ans,
            vars: ["x"],
            domain: [-2, 2],
            mistakes: [
              { answer: `e^{${expo}}(1 + x)`, feedback: "Olvidaste la cadena: $(e^{u})' = e^{u}u'$, y aquí $u'$ es " + `$-${2 * kk === 1 ? "" : 2 * kk}x$.` },
              { answer: `-${2 * kk === 1 ? "" : 2 * kk}x e^{${expo}}`, feedback: "Multiplicaste las derivadas. Usa la regla del producto." },
            ],
          },
        ],
        hints: ["Producto de $x$ por una exponencial: $(uv)' = u'v + uv'$.", `$(e^{${expo}})' = e^{${expo}}\\cdot(-${2 * kk === 1 ? "" : 2 * kk}x)$.`],
        solution: [
          `$F'(x) = 1\\cdot e^{${expo}} + x\\cdot e^{${expo}}(-${2 * kk === 1 ? "" : 2 * kk}x)$.`,
          `Sacando factor común: $F'(x) = ${ans}$.`,
        ],
      };
    }
    const a = r.pick([1, 2, 3, -1]);
    const c = r.int(1, 6);
    const ex = `e^{${coef(a, "x")}}`;
    const top = poly([a, -2, a * c]);
    const ans = `\\frac{${ex}(${top})}{(x^{2}+${c})^{2}}`;
    return {
      statement: `Deriva $f(x) = \\dfrac{${ex}}{x^{2}+${c}}$.`,
      parts: [
        {
          kind: "expr",
          before: "f'(x) =",
          answer: ans,
          vars: ["x"],
          domain: [-2, 2],
          mistakes: [{ answer: `\\frac{${coef(a, ex)}}{2x}`, feedback: "Dividiste las derivadas. Usa la regla del cociente." }],
        },
      ],
      hints: ["Regla del cociente con $u = " + ex + "$, $u' = " + coef(a, ex) + "$, $v = x^2 + " + c + "$, $v' = 2x$.", "Saca factor común la exponencial en el numerador."],
      solution: [
        `$f'(x) = \\dfrac{${coef(a, ex)}(x^{2}+${c}) - ${ex}\\cdot 2x}{(x^{2}+${c})^{2}}$.`,
        `Factor común $${ex}$: el numerador queda $${ex}(${top})$.`,
        `$f'(x) = ${ans}$.`,
      ],
    };
  },
};

const parcialEvaluar: ExerciseGen = {
  id: "parcial-evaluar",
  title: "Derivar y evaluar (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const kind = r.pick(["potexp", "lnsqrt", "expfrac", "xsqrt"] as const);
    const a = r.int(1, 3);
    let fTex: string, dTex: string, val: number | string, steps: string[];
    if (kind === "potexp") {
      const n = r.int(2, 4);
      const c = a * a - 1;
      const u = c === 0 ? "x^{2}" : `x^{2}-${c}`;
      fTex = `(${u})^{${n}}e^{x-${a}}`;
      const pw = n - 1 === 1 ? `(${u})` : `(${u})^{${n - 1}}`;
      dTex = `e^{x-${a}}${pw}(${2 * n}x + ${u})`;
      val = 2 * n * a + 1;
      steps = [
        `Producto: $f'(x) = ${n}${pw}\\cdot 2x\\cdot e^{x-${a}} + (${u})^{${n}}e^{x-${a}}$.`,
        `Factor común: $f'(x) = ${dTex}$.`,
        `En $x = ${a}$: $${u.replace("x", `${a}`)} = 1$ y $e^{0} = 1$, así que $f'(${a}) = ${2 * n}\\cdot ${a} + 1 = ${val}$.`,
      ];
    } else if (kind === "lnsqrt") {
      const t = r.int(2, 4);
      const s = t * t - a;
      const c = a * a - 1;
      const u = c === 0 ? "x^{2}" : `x^{2}-${c}`;
      fTex = `\\ln(${u})\\sqrt{x+${s}}`;
      dTex = `\\frac{2x\\sqrt{x+${s}}}{${u}} + \\frac{\\ln(${u})}{2\\sqrt{x+${s}}}`;
      val = 2 * a * t;
      steps = [
        `Producto: $f'(x) = \\dfrac{2x}{${u}}\\sqrt{x+${s}} + \\ln(${u})\\cdot\\dfrac{1}{2\\sqrt{x+${s}}}$.`,
        `En $x = ${a}$: $${a}^{2}${c === 0 ? "" : `-${c}`} = 1$, así que $\\ln 1 = 0$ y el segundo término desaparece. Además $\\sqrt{${a}+${s}} = ${t}$.`,
        `$f'(${a}) = \\dfrac{2\\cdot ${a}}{1}\\cdot ${t} = ${val}$.`,
      ];
    } else if (kind === "expfrac") {
      const c = r.int(1, 5);
      fTex = `\\frac{e^{x-${a}}}{x^{2}+${c}}`;
      dTex = `\\frac{e^{x-${a}}(x^{2}-2x+${c})}{(x^{2}+${c})^{2}}`;
      val = frac(a * a - 2 * a + c, (a * a + c) ** 2);
      steps = [
        `Cociente: $f'(x) = \\dfrac{e^{x-${a}}(x^{2}+${c}) - e^{x-${a}}\\cdot 2x}{(x^{2}+${c})^{2}} = ${dTex}$.`,
        `En $x = ${a}$: $e^{0} = 1$, numerador $${a * a} - ${2 * a} + ${c} = ${a * a - 2 * a + c}$, denominador $${(a * a + c) ** 2}$.`,
        `$f'(${a}) = ${val}$.`,
      ];
    } else {
      const t = a + r.int(1, 3);
      const c = t * t - a * a;
      fTex = `x\\sqrt{x^{2}+${c}}`;
      dTex = `\\frac{2x^{2}+${c}}{\\sqrt{x^{2}+${c}}}`;
      val = frac(2 * a * a + c, t);
      steps = [
        `Producto: $f'(x) = \\sqrt{x^{2}+${c}} + x\\cdot\\dfrac{x}{\\sqrt{x^{2}+${c}}}$.`,
        `Con denominador común: $f'(x) = ${dTex}$.`,
        `En $x = ${a}$: $\\sqrt{${a * a}+${c}} = ${t}$, así que $f'(${a}) = \\dfrac{${2 * a * a + c}}{${t}} = ${val}$.`,
      ];
    }
    return {
      statement: `Sea $f(x) = ${fTex}$. Calcula $f'(x)$ y después $f'(${a})$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Derivada general.", before: "f'(x) =", answer: dTex, vars: ["x"], domain: [a + 0.1, a + 1.5] },
        { kind: "expr", prompt: `Valor en $x = ${a}$.`, before: `f'(${a}) =`, answer: String(val) },
      ],
      hints: [
        "Identifica la operación principal (producto o cociente) y deriva cada pieza con la cadena.",
        `Al evaluar en $x = ${a}$ busca qué factores valen $0$ o $1$. Eso simplifica mucho la cuenta.`,
      ],
      solution: steps,
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("reglas-derivacion"),
  objectives: [
    "Derivar polinomios y potencias con exponente negativo o fraccionario sin usar el límite.",
    "Aplicar las reglas del producto y del cociente.",
    "Reconocer una función compuesta y derivarla con la regla de la cadena.",
    "Derivar exponenciales y logaritmos en cualquier base, incluidos los que llevan raíces adentro.",
  ],
  sections: [
    {
      id: "potencia",
      title: "Del límite a las reglas",
      blocks: [
        {
          type: "text",
          md: "Calcular cada derivada con el límite $\\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$ funciona, pero es largo. Por suerte ese límite se calcula una sola vez para cada tipo de función y el resultado queda como regla. Con un puñado de reglas puedes derivar casi cualquier función del curso en pocas líneas.\n\nLa derivada se escribe de varias formas que significan lo mismo: $f'(x)$, $y'$ o $\\dfrac{dy}{dx}$.",
        },
        {
          type: "widget",
          widget: { kind: "tangent", fn: "x^{3} - 3x", x: [-3, 3], y: [-5, 5], derivative: "3x^{2} - 3" },
          caption: "Mueve el punto. La pendiente de la tangente en cada $x$ es justo el valor de $f'(x) = 3x^2 - 3$. Las reglas te dan esa fórmula sin calcular límites.",
        },
        {
          type: "definition",
          title: "Reglas básicas",
          md: "- **Constante:** $(c)' = 0$. Una constante no cambia, su tasa de cambio es cero.\n- **Potencia:** $(x^n)' = n\\,x^{n-1}$ para cualquier exponente real $n$.\n- **Constante por función:** $(c\\,f)' = c\\,f'$.\n- **Suma y resta:** $(f \\pm g)' = f' \\pm g'$.",
        },
        {
          type: "example",
          title: "Potencias de todo tipo",
          problem: "Deriva $f(x) = 4x^{5} - \\dfrac{3}{x^{2}} + 6\\sqrt[3]{x^{2}} - 7$.",
          steps: [
            "Antes de derivar, escribe todo como potencia de $x$: $\\dfrac{3}{x^{2}} = 3x^{-2}$ y $\\sqrt[3]{x^{2}} = x^{2/3}$. Queda $f(x) = 4x^{5} - 3x^{-2} + 6x^{2/3} - 7$.",
            "Primer término: $(4x^{5})' = 4 \\cdot 5x^{4} = 20x^{4}$.",
            "Segundo: $(-3x^{-2})' = -3\\cdot(-2)x^{-3} = 6x^{-3}$. Ojo, el exponente baja de $-2$ a $-3$.",
            "Tercero: $(6x^{2/3})' = 6\\cdot\\frac{2}{3}x^{-1/3} = 4x^{-1/3}$.",
            "La constante $-7$ tiene derivada $0$.",
          ],
          answer: "$f'(x) = 20x^{4} + \\dfrac{6}{x^{3}} + \\dfrac{4}{\\sqrt[3]{x}}$",
        },
        {
          type: "note",
          tone: "warning",
          title: "Reescribe antes de derivar",
          md: "La regla de la potencia solo se aplica a $x^n$. Si ves $\\frac{1}{x^3}$ o $\\sqrt{x}$, pásalos primero a $x^{-3}$ y $x^{1/2}$. Un error muy común es derivar $\\frac{1}{x^3}$ como $\\frac{1}{3x^2}$, que está mal: lo correcto es $-3x^{-4} = -\\frac{3}{x^4}$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Deriva $f(x) = 4x^{3} - 2x + 7$.",
            parts: [{ kind: "expr", before: "f'(x) =", answer: "12x^{2} - 2", vars: ["x"] }],
            solution: ["Término a término: $(4x^3)' = 12x^2$, $(-2x)' = -2$ y $(7)' = 0$. Resultado: $12x^2 - 2$."],
          },
        },
      ],
    },
    {
      id: "producto-cociente",
      title: "Producto y cociente",
      blocks: [
        {
          type: "text",
          md: "Cuando dos funciones de $x$ se multiplican o se dividen no basta con derivar cada una por separado. Hay que usar estas dos reglas, que la cátedra demuestra a partir de la definición de derivada.",
        },
        {
          type: "definition",
          title: "Regla del producto y regla del cociente",
          md: "$$(u\\,v)' = u'\\,v + u\\,v'$$\n\n$$\\left(\\frac{u}{v}\\right)' = \\frac{u'\\,v - u\\,v'}{v^{2}} \\qquad (v \\ne 0)$$\n\nEn el cociente el orden importa porque hay una resta. Se recita así: \"derivada de arriba por abajo, menos arriba por derivada de abajo, todo sobre abajo al cuadrado\".",
        },
        {
          type: "example",
          title: "Un producto",
          problem: "Deriva $f(x) = (x^{2}+1)(3x-2)$.",
          steps: [
            "$u = x^{2}+1$ con $u' = 2x$, y $v = 3x-2$ con $v' = 3$.",
            "$f'(x) = 2x(3x-2) + (x^{2}+1)\\cdot 3$.",
            "Desarrollando: $6x^{2} - 4x + 3x^{2} + 3 = 9x^{2} - 4x + 3$.",
          ],
          answer: "$f'(x) = 9x^{2} - 4x + 3$",
        },
        {
          type: "example",
          title: "Un cociente",
          problem: "Deriva $f(x) = \\dfrac{2x+1}{x-3}$.",
          steps: [
            "$u = 2x+1$ con $u' = 2$, y $v = x-3$ con $v' = 1$.",
            "$f'(x) = \\dfrac{2(x-3) - (2x+1)\\cdot 1}{(x-3)^{2}}$.",
            "Numerador: $2x - 6 - 2x - 1 = -7$.",
          ],
          answer: "$f'(x) = -\\dfrac{7}{(x-3)^{2}}$",
        },
        {
          type: "note",
          tone: "warning",
          title: "Las dos trampas de siempre",
          md: "$(u\\,v)' \\ne u'\\,v'$ y $\\left(\\dfrac{u}{v}\\right)' \\ne \\dfrac{u'}{v'}$. Si derivas cada pedazo y multiplicas o divides, la respuesta sale mal. Por ejemplo, con $x^{2}\\cdot x^{3} = x^{5}$ la derivada correcta es $5x^4$, mientras que $2x\\cdot 3x^{2} = 6x^{3}$.",
        },
        {
          type: "note",
          tone: "econ",
          title: "El ingreso es un producto",
          md: "Si una empresa vende $q$ unidades a un precio $p(q)$ que depende de cuánto vende, el ingreso es $I(q) = p(q)\\cdot q$. Por la regla del producto, $I'(q) = p'(q)\\,q + p(q)$. Lo vas a usar en el tema de análisis marginal.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Deriva $f(x) = \\dfrac{x^{2}}{x+1}$.",
            parts: [{ kind: "expr", before: "f'(x) =", answer: "\\frac{x^{2}+2x}{(x+1)^{2}}", vars: ["x"], mistakes: [{ answer: "2x", feedback: "Dividiste las derivadas. Usa la regla del cociente." }] }],
            solution: ["$f'(x) = \\dfrac{2x(x+1) - x^{2}}{(x+1)^{2}} = \\dfrac{x^{2}+2x}{(x+1)^{2}}$."],
          },
        },
      ],
    },
    {
      id: "cadena",
      title: "La regla de la cadena",
      blocks: [
        {
          type: "text",
          md: "Muchas funciones son una función metida dentro de otra. En $h(x) = \\sqrt{x^{2}+1}$ primero se calcula $x^{2}+1$ y después se le saca raíz. Es una composición: $h = f \\circ g$ con $g(x) = x^{2}+1$ (la de adentro) y $f(x) = \\sqrt{x}$ (la de afuera).",
        },
        {
          type: "widget",
          widget: { kind: "machine", fns: [{ name: "g", tex: "x^{2} + 1" }, { name: "f", tex: "\\sqrt{x}" }], input: 2 },
          caption: "La entrada pasa primero por $g$ y su salida entra en $f$. Para derivar hay que tomar en cuenta las dos máquinas.",
        },
        {
          type: "definition",
          title: "Regla de la cadena",
          md: "$$(f \\circ g)'(x) = f'\\big(g(x)\\big)\\cdot g'(x)$$\n\nEn palabras: derivas la de afuera dejando quieta la de adentro, y multiplicas por la derivada de la de adentro. Un caso que vas a usar a cada rato es la potencia de una función:\n\n$$\\left(u^{n}\\right)' = n\\,u^{n-1}\\,u'$$",
        },
        {
          type: "example",
          title: "Potencia de un paréntesis",
          problem: "Deriva $f(x) = (3x^{2}-5)^{4}$.",
          steps: [
            "Afuera hay una potencia cuarta y adentro $u = 3x^{2}-5$, con $u' = 6x$.",
            "$f'(x) = 4(3x^{2}-5)^{3}\\cdot 6x$.",
          ],
          answer: "$f'(x) = 24x(3x^{2}-5)^{3}$",
        },
        {
          type: "example",
          title: "Raíces",
          problem: "Deriva $f(x) = \\sqrt{x^{2}+1}$ y $g(x) = \\sqrt[3]{(x^{2}-1)^{2}}$.",
          steps: [
            "$f(x) = (x^{2}+1)^{1/2}$. Entonces $f'(x) = \\frac{1}{2}(x^{2}+1)^{-1/2}\\cdot 2x = \\dfrac{x}{\\sqrt{x^{2}+1}}$.",
            "$g(x) = (x^{2}-1)^{2/3}$. Entonces $g'(x) = \\frac{2}{3}(x^{2}-1)^{-1/3}\\cdot 2x = \\dfrac{4x}{3\\sqrt[3]{x^{2}-1}}$.",
            "En general $\\left(\\sqrt[n]{u}\\right)' = \\dfrac{u'}{n\\sqrt[n]{u^{n-1}}}$, que sale de escribir la raíz como $u^{1/n}$.",
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "El error número uno",
          md: "Olvidar multiplicar por la derivada de adentro. Si derivas $(3x^{2}-5)^{4}$ como $4(3x^{2}-5)^{3}$ y te detienes, te faltó el $6x$. Antes de cerrar una derivada pregúntate: ¿lo de adentro era solo $x$? Si no, falta un factor.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Deriva $f(x) = (2x+1)^{5}$.",
            parts: [{ kind: "expr", before: "f'(x) =", answer: "10(2x+1)^{4}", vars: ["x"], domain: [-2, 2], mistakes: [{ answer: "5(2x+1)^{4}", feedback: "Falta multiplicar por la derivada de adentro, que es $2$." }] }],
            solution: ["$f'(x) = 5(2x+1)^{4}\\cdot 2 = 10(2x+1)^{4}$."],
          },
        },
      ],
    },
    {
      id: "exponenciales",
      title: "Exponenciales",
      blocks: [
        {
          type: "text",
          md: "La función $e^{x}$ tiene una propiedad única: su derivada es ella misma. En cada punto, la pendiente de su gráfica es igual a su altura. Para otras bases aparece un factor $\\ln a$, que la guía de la cátedra deduce tomando logaritmo: si $f(x) = a^{x}$, entonces $\\ln f(x) = x\\ln a$, y al derivar los dos lados sale $f'(x) = a^{x}\\ln a$.",
        },
        {
          type: "definition",
          title: "Derivadas de exponenciales",
          md: "$$(e^{x})' = e^{x} \\qquad (e^{u})' = e^{u}\\,u'$$\n\n$$(a^{x})' = a^{x}\\ln a \\qquad (a > 0)$$\n\n$$(a^{u})' = a^{u}\\ln a\\cdot u'$$",
        },
        {
          type: "example",
          title: "Tres exponenciales",
          problem: "Deriva $f(x) = e^{x^{2}-1}$, $g(x) = 5^{3x}$ y $h(x) = x\\,e^{-x^{2}/2}$.",
          steps: [
            "$f$: el exponente es $u = x^{2}-1$ con $u' = 2x$. Entonces $f'(x) = 2x\\,e^{x^{2}-1}$.",
            "$g$: base $5$, exponente $3x$. Entonces $g'(x) = 5^{3x}\\ln 5\\cdot 3 = 3\\ln 5\\cdot 5^{3x}$.",
            "$h$ es un producto. $(x)' = 1$ y $(e^{-x^{2}/2})' = e^{-x^{2}/2}\\cdot(-x)$.",
            "$h'(x) = e^{-x^{2}/2} + x\\,e^{-x^{2}/2}(-x) = e^{-x^{2}/2}(1 - x^{2})$.",
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "Potencia y exponencial no son lo mismo",
          md: "En $x^{3}$ la base es variable y el exponente fijo: regla de la potencia, $3x^{2}$. En $3^{x}$ la base es fija y el exponente variable: regla exponencial, $3^{x}\\ln 3$. Derivar $3^{x}$ como $x\\cdot 3^{x-1}$ es un error frecuente.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Crecimiento continuo",
          md: "Una población o un capital que crece de forma continua a una tasa $r$ se modela con $P(t) = P_0 e^{rt}$. Su derivada es $P'(t) = r\\,P_0e^{rt} = r\\,P(t)$: la velocidad de crecimiento es proporcional a lo que ya hay. Por eso $r$ se llama tasa de crecimiento.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Deriva $f(x) = e^{3x}$.",
            parts: [{ kind: "expr", before: "f'(x) =", answer: "3e^{3x}", vars: ["x"], domain: [-2, 2], mistakes: [{ answer: "e^{3x}", feedback: "Falta multiplicar por la derivada del exponente, $3$." }] }],
            solution: ["$(e^{3x})' = e^{3x}\\cdot 3 = 3e^{3x}$."],
          },
        },
      ],
    },
    {
      id: "logaritmos",
      title: "Logaritmos",
      blocks: [
        {
          type: "text",
          md: "La derivada de $\\ln x$ es $\\frac{1}{x}$. Con la cadena, la derivada de $\\ln u$ es la derivada de adentro sobre lo de adentro. Para otras bases se cambia a logaritmo natural, $\\log_b u = \\frac{\\ln u}{\\ln b}$, y aparece $\\ln b$ dividiendo.",
        },
        {
          type: "definition",
          title: "Derivadas de logaritmos",
          md: "$$(\\ln x)' = \\frac{1}{x} \\qquad (\\ln u)' = \\frac{u'}{u}$$\n\n$$(\\log_b u)' = \\frac{u'}{u\\,\\ln b}$$\n\nEn los parciales $\\log$ sin base es base 10 y $\\operatorname{Ln}$ es lo mismo que $\\ln$.",
        },
        {
          type: "example",
          title: "Usar propiedades antes de derivar",
          problem: "Deriva $f(x) = \\ln\\left(\\dfrac{x-1}{x+1}\\right)$ y $g(x) = \\log_3\\sqrt{x^{3}+4}$.",
          steps: [
            "Para $f$ separa con $\\ln\\frac{A}{B} = \\ln A - \\ln B$: $f(x) = \\ln(x-1) - \\ln(x+1)$.",
            "$f'(x) = \\dfrac{1}{x-1} - \\dfrac{1}{x+1} = \\dfrac{2}{x^{2}-1}$. Sin la propiedad habrías tenido que hacer un cociente dentro de la cadena.",
            "Para $g$ baja el exponente de la raíz: $g(x) = \\frac{1}{2}\\log_3(x^{3}+4)$.",
            "$g'(x) = \\dfrac{1}{2}\\cdot\\dfrac{3x^{2}}{(x^{3}+4)\\ln 3} = \\dfrac{3x^{2}}{2(x^{3}+4)\\ln 3}$.",
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "Lo que el logaritmo no hace",
          md: "Las propiedades valen para productos, cocientes y potencias, no para sumas: $\\ln(a+b) \\ne \\ln a + \\ln b$. Y al derivar, $(\\ln u)'$ no es $\\frac{1}{u}$ a secas, falta multiplicar por $u'$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Deriva $f(x) = \\ln(5x)$.",
            parts: [{ kind: "expr", before: "f'(x) =", answer: "\\frac{1}{x}", vars: ["x"], domain: [0.5, 4], mistakes: [{ answer: "\\frac{1}{5x}", feedback: "Falta multiplicar por la derivada de $5x$, que es $5$." }] }],
            solution: ["$(\\ln 5x)' = \\dfrac{5}{5x} = \\dfrac{1}{x}$. También sale de $\\ln 5x = \\ln 5 + \\ln x$."],
          },
        },
      ],
    },
    {
      id: "resumen",
      title: "Tabla resumen y derivadas largas",
      blocks: [
        {
          type: "table",
          headers: ["Función", "Derivada", "Ejemplo"],
          rows: [
            ["$c$", "$0$", "$(7)' = 0$"],
            ["$x^{n}$", "$n\\,x^{n-1}$", "$(x^{-2})' = -2x^{-3}$"],
            ["$u^{n}$", "$n\\,u^{n-1}u'$", "$((x^2+1)^3)' = 6x(x^2+1)^2$"],
            ["$\\sqrt{u}$", "$\\dfrac{u'}{2\\sqrt{u}}$", "$(\\sqrt{5x})' = \\frac{5}{2\\sqrt{5x}}$"],
            ["$\\sqrt[n]{u}$", "$\\dfrac{u'}{n\\sqrt[n]{u^{n-1}}}$", "$(\\sqrt[3]{x})' = \\frac{1}{3\\sqrt[3]{x^{2}}}$"],
            ["$e^{u}$", "$e^{u}\\,u'$", "$(e^{2x})' = 2e^{2x}$"],
            ["$a^{u}$", "$a^{u}\\ln a\\cdot u'$", "$(2^{x^2})' = 2x\\,2^{x^2}\\ln 2$"],
            ["$\\ln u$", "$\\dfrac{u'}{u}$", "$(\\ln(x^2+1))' = \\frac{2x}{x^2+1}$"],
            ["$\\log_b u$", "$\\dfrac{u'}{u\\ln b}$", "$(\\log_2 x)' = \\frac{1}{x\\ln 2}$"],
            ["$u\\,v$", "$u'v + uv'$", "$(xe^x)' = e^x + xe^x$"],
            ["$\\dfrac{u}{v}$", "$\\dfrac{u'v - uv'}{v^{2}}$", "$\\left(\\frac{1}{x}\\right)' = -\\frac{1}{x^{2}}$"],
            ["$f(g(x))$", "$f'(g(x))\\,g'(x)$", "$(\\ln(\\ln x))' = \\frac{1}{x\\ln x}$"],
          ],
        },
        {
          type: "text",
          md: "En los parciales salen funciones largas que mezclan varias reglas. El método es ir por capas:\n\n- Mira cuál es la última operación que harías al evaluar la función. Esa decide la primera regla.\n- Usa propiedades de logaritmos y de potencias para simplificar antes de derivar.\n- Deriva cada pieza con la cadena y no simplifiques hasta el final.",
        },
        {
          type: "example",
          title: "Ejercicio tipo parcial",
          problem: "Deriva $y = \\dfrac{\\ln(x^{2}+2x)}{x+1}$.",
          steps: [
            "La última operación es una división: regla del cociente con $u = \\ln(x^{2}+2x)$ y $v = x+1$.",
            "$u' = \\dfrac{2x+2}{x^{2}+2x} = \\dfrac{2(x+1)}{x^{2}+2x}$ y $v' = 1$.",
            "$y' = \\dfrac{\\frac{2(x+1)}{x^{2}+2x}(x+1) - \\ln(x^{2}+2x)}{(x+1)^{2}}$.",
            "Separando la fracción: $y' = \\dfrac{2}{x^{2}+2x} - \\dfrac{\\ln(x^{2}+2x)}{(x+1)^{2}}$.",
          ],
        },
        {
          type: "example",
          title: "Producto con logaritmo",
          problem: "Deriva $y = e^{x}\\ln\\left(\\dfrac{x}{2}\\right)$.",
          steps: [
            "Producto con $u = e^{x}$ y $v = \\ln\\frac{x}{2}$.",
            "$v' = \\dfrac{1/2}{x/2} = \\dfrac{1}{x}$.",
            "$y' = e^{x}\\ln\\left(\\dfrac{x}{2}\\right) + \\dfrac{e^{x}}{x}$.",
          ],
        },
        {
          type: "quick",
          exercise: {
            statement: "Deriva $f(x) = x^{2}e^{x}$.",
            parts: [{ kind: "expr", before: "f'(x) =", answer: "2xe^{x} + x^{2}e^{x}", vars: ["x"], domain: [-2, 2], mistakes: [{ answer: "2xe^{x}", feedback: "Multiplicaste las derivadas. Usa la regla del producto." }] }],
            solution: ["$f'(x) = 2x\\,e^{x} + x^{2}e^{x} = x\\,e^{x}(2 + x)$."],
          },
        },
      ],
    },
  ],
  exercises: [
    polinomio,
    potencias,
    producto,
    cadenaPotencia,
    exponencial,
    elegirRegla,
    cociente,
    logaritmo,
    raizCadena,
    productoExpLog,
    vfErrores,
    parcialLogaritmo,
    parcialCociente,
    parcialEvaluar,
  ],
};

export default topic;
