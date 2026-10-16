import { meta } from "../catalog";
import type { ExerciseGen, Part, Rich, Topic } from "../types";
import { coef, frac, minus, num, signed, terms } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

type ExprPart = Extract<Part, { kind: "expr" }>;
const SPECIAL: ExprPart["special"] = ["inf", "-inf", "dne"];

function limPart(answer: string, extra: Partial<Omit<ExprPart, "kind" | "answer">> = {}): ExprPart {
  return { kind: "expr", answer, special: SPECIAL, ...extra };
}

const lim = (p: number | string, expr: string, v = "x") => `\\lim_{${v} \\to ${p}} ${expr}`;
const dfrac = (n: string, d: string) => `\\dfrac{${n}}{${d}}`;
/** e elevado a un racional p/q, escrito limpio: e, e^{3}, e^{-\frac{1}{2}}. */
function ePow(p: number, q = 1): string {
  const f = frac(p, q);
  if (f === "0") return "1";
  if (f === "1") return "e";
  return `e^{${f}}`;
}
/** "kx" con coeficiente limpio: 1 -> x, -1 -> -x. */
const kx = (k: number, v = "x") => coef(k, v);
/** 1 + k/x o 1 - k/x */
const onePlus = (k: number, den = "x") => `1 ${k < 0 ? "-" : "+"} \\frac{${Math.abs(k)}}{${den}}`;

const ONE_MISTAKE = { answer: "1", feedback: "$1^{\\infty}$ no vale $1$. La base se acerca a $1$ pero el exponente crece sin control, y los dos efectos compiten." };

/** Agrega el error típico "1" solo si no coincide con la respuesta. */
const withOne = (ans: string) => (ans === "1" ? [] : [ONE_MISTAKE]);

/* ----------------------------------- ejercicios ----------------------------------- */

const interesContinuo: ExerciseGen = {
  id: "interes-continuo",
  title: "Del interés compuesto al continuo",
  level: 1,
  generate: (r) => {
    const C = r.pick([100, 500, 1000, 2000, 5000]);
    const rp = r.pick([5, 8, 10, 12, 20]);
    const t = r.pick([1, 2, 3, 5, 10]);
    const rate = num(rp / 100);
    const rt = num((rp * t) / 100);
    const expo = t === 1 ? "n" : `${t}n`;
    return {
      statement: `Un capital de $${C}$ dólares se invierte a una tasa anual de $${rp}\\%$ durante $${t}$ ${t === 1 ? "año" : "años"}, capitalizando $n$ veces al año. Calcula el monto si la capitalización es continua, es decir $$${lim("\\infty", `${C}\\left(1 + \\frac{${rate}}{n}\\right)^{${expo}}`, "n")}$$ Escribe la respuesta exacta usando $e$.`,
      parts: [
        limPart(`${C}${rt === "1" ? "e" : `e^{${rt}}`}`, {
          mistakes: [
            { answer: `${C}(1 + ${rate})^{${t}}`, feedback: "Eso es el interés compuesto una vez al año. Con capitalización continua $n \\to \\infty$." },
            { answer: `${C}(1 + ${rt})`, feedback: "Eso es interés simple. Aquí los intereses se capitalizan." },
          ],
        }),
      ],
      hints: [
        "Usa que $\\lim_{n \\to \\infty} \\left(1 + \\frac{r}{n}\\right)^{n} = e^{r}$.",
        `El exponente es $${expo}$, así que el resultado queda elevado a la $${t}$.`,
      ],
      solution: [
        `Escribimos $\\left(1 + \\frac{${rate}}{n}\\right)^{${expo}} = \\left[\\left(1 + \\frac{${rate}}{n}\\right)^{n}\\right]^{${t}}$.`,
        `El corchete tiende a $e^{${rate}}$, así que todo tiende a $e^{${rate} \\cdot ${t}} = ${rt === "1" ? "e" : `e^{${rt}}`}$.`,
        `El monto con capitalización continua es $${C}${rt === "1" ? "e" : `e^{${rt}}`} \\approx ${num(C * Math.exp((rp * t) / 100), 2)}$ dólares.`,
      ],
    };
  },
};

const unoKSobreX: ExerciseGen = {
  id: "uno-k-sobre-x",
  title: "Límites de la forma (1 + k/x)^x",
  level: 1,
  generate: (r) => {
    const symbolic = r.bool(0.2);
    if (symbolic) {
      return {
        statement: `Calcula, para un número real $n$ fijo, $$${lim("\\infty", "\\left(1 + \\frac{n}{x}\\right)^{x}")}$$`,
        parts: [limPart("e^{n}", { vars: ["n"], domain: [-3, 3], mistakes: [{ answer: "1", feedback: ONE_MISTAKE.feedback }] })],
        hints: ["Cambia de variable $u = \\frac{x}{n}$. Entonces $x = nu$ y aparece $\\left(1 + \\frac{1}{u}\\right)^{nu}$."],
        solution: [
          "Es $1^{\\infty}$. Con $u = \\frac{x}{n}$ queda $\\left[\\left(1 + \\frac{1}{u}\\right)^{u}\\right]^{n}$.",
          "El corchete tiende a $e$, así que el límite es $e^{n}$.",
        ],
      };
    }
    const k = r.nz(-5, 5);
    const m = r.pick([1, 1, 2, 3]);
    const ans = ePow(k * m);
    return {
      statement: `Calcula $$${lim("\\infty", `\\left(${onePlus(k)}\\right)^{${kx(m)}}`)}$$`,
      parts: [
        limPart(ans, {
          mistakes: [ONE_MISTAKE, ...(m !== 1 ? [{ answer: ePow(k), feedback: `Te faltó el $${m}$ del exponente. Al final el resultado queda elevado a la $${m}$.` }] : [])],
        }),
      ],
      hints: [
        "La base tiende a $1$ y el exponente a $\\infty$: es $1^{\\infty}$.",
        `Usa la fórmula $\\lim f^{g} = e^{\\lim g\\,(f - 1)}$. Aquí $f - 1 = \\frac{${k}}{x}$.`,
      ],
      solution: [
        `Es la forma $1^{\\infty}$. Con la fórmula, calculamos $\\lim ${kx(m)} \\cdot \\dfrac{${k}}{x} = ${k * m}$.`,
        `El límite es $e^{${k * m}}${ans === `e^{${k * m}}` ? "" : ` = ${ans}`}$.`,
      ],
    };
  },
};

const noIndeterminado: ExerciseGen = {
  id: "no-indeterminado",
  title: "¿Es de verdad 1^∞?",
  level: 1,
  generate: (r) => {
    const [p, rr] = r.pick([
      [2, 1],
      [3, 1],
      [1, 2],
      [1, 3],
      [3, 2],
      [2, 3],
    ]);
    const q = r.int(1, 5);
    const s = r.int(1, 5);
    const big = p / rr > 1;
    const ans = big ? "\\infty" : "0";
    return {
      statement: `Calcula $$${lim("+\\infty", `\\left(${dfrac(terms([[p, "x"], [q, ""]]), terms([[rr, "x"], [s, ""]]))}\\right)^{x}`)}$$`,
      parts: [
        limPart(ans, {
          mistakes: [
            ONE_MISTAKE,
            { answer: big ? "0" : "\\infty", feedback: `La base tiende a $${frac(p, rr)}$, que es ${big ? "mayor" : "menor"} que $1$. Piensa qué le pasa a ese número elevado a exponentes enormes.` },
          ],
        }),
      ],
      hints: [
        "Antes de usar la fórmula del número $e$, calcula a qué tiende la base.",
        "Si la base tiende a un número distinto de $1$, no hay indeterminación.",
      ],
      solution: [
        `La base tiende a $\\dfrac{${p}}{${rr}}${frac(p, rr) === `\\frac{${p}}{${rr}}` ? "" : ` = ${frac(p, rr)}`}$, no a $1$. No es $1^{\\infty}$.`,
        big
          ? `Un número mayor que $1$ elevado a exponentes que crecen sin control crece sin control: el límite es $+\\infty$.`
          : `Un número entre $0$ y $1$ elevado a exponentes cada vez mayores se hace cada vez más pequeño: el límite es $0$.`,
      ],
    };
  },
};

const notableLn: ExerciseGen = {
  id: "notable-ln",
  title: "El límite notable del logaritmo",
  level: 1,
  generate: (r) => {
    const k = r.nz(-5, 6);
    const m = r.pick([1, 2, 3, 4, -2]);
    const inv = r.bool(0.3);
    const lnT = `\\ln(1 ${k < 0 ? "-" : "+"} ${kx(Math.abs(k))})`;
    const expr = inv ? dfrac(kx(m), lnT) : dfrac(lnT, kx(m));
    const ans = inv ? frac(m, k) : frac(k, m);
    return {
      statement: `Calcula $$${lim(0, expr)}$$`,
      parts: [limPart(ans, { mistakes: [{ answer: "0", feedback: "Al sustituir sale $\\frac{0}{0}$, que no vale $0$. Usa el límite notable." }] })],
      hints: [
        "Usa $\\lim_{u \\to 0} \\dfrac{\\ln(1 + u)}{u} = 1$.",
        `Aquí $u = ${kx(k)}$. Multiplica y divide por $${kx(k)}$ para que aparezca el notable.`,
      ],
      solution: [
        `Al sustituir sale $\\frac{0}{0}$. Llamamos $u = ${kx(k)}$, que tiende a $0$.`,
        inv
          ? `Escribimos $\\dfrac{${kx(m)}}{${lnT}} = ${frac(m, k)} \\cdot \\dfrac{${kx(k)}}{${lnT}}$, y la segunda fracción tiende a $1$.`
          : `Escribimos $\\dfrac{${lnT}}{${kx(m)}} = ${frac(k, m)} \\cdot \\dfrac{${lnT}}{${kx(k)}}$, y la segunda fracción tiende a $1$.`,
        `El límite es $${ans}$.`,
      ],
    };
  },
};

const racionalExponente: ExerciseGen = {
  id: "racional-exponente",
  title: "Cociente elevado a x + c",
  level: 2,
  generate: (r) => {
    const a = r.int(-5, 5);
    const b = r.int(-5, 5);
    const bb = b === a ? a - 3 : b;
    const c = r.int(-4, 4);
    const d = a - bb;
    const ans = ePow(d);
    return {
      statement: `Calcula $$${lim("\\infty", `\\left(${dfrac(minus("x", -a), minus("x", -bb))}\\right)^{${minus("x", -c)}}`)}$$`,
      parts: [
        limPart(ans, {
          mistakes: [ONE_MISTAKE, { answer: ePow(-d), feedback: "Revisa el orden de la resta en $f - 1$: es la base menos $1$, no al revés." }],
        }),
      ],
      hints: [
        "La base tiende a $1$ y el exponente a $\\infty$. Usa $\\lim f^{g} = e^{\\lim g\\,(f - 1)}$.",
        `Calcula $f - 1 = \\dfrac{${minus("x", -a)}}{${minus("x", -bb)}} - 1$ con común denominador.`,
      ],
      solution: [
        "Es $1^{\\infty}$: la base es un cociente de grados iguales con coeficientes principales $1$ y $1$.",
        `$f - 1 = \\dfrac{(${minus("x", -a)}) - (${minus("x", -bb)})}{${minus("x", -bb)}} = \\dfrac{${d}}{${minus("x", -bb)}}$.`,
        `$g\\,(f - 1) = \\dfrac{${d}(${minus("x", -c)})}{${minus("x", -bb)}} \\to ${d}$.`,
        `El límite es $${ans === "e" ? "e^{1} = e" : ans === "1" ? "e^{0} = 1" : ans}$.`,
      ],
    };
  },
};

const racionalMx: ExerciseGen = {
  id: "racional-mx",
  title: "Cocientes con coeficientes y exponente mx",
  level: 2,
  generate: (r) => {
    const tpl = r.pick(["mx", "px", "simbolico"] as const);
    let expr: string, ans: string, steps: Rich[];
    if (tpl === "mx") {
      const a = r.int(-4, 4);
      const b = r.nz(-4, 4, [a]);
      const m = r.pick([2, 3]);
      expr = `\\left(${dfrac(minus("x", -a), minus("x", -b))}\\right)^{${m}x}`;
      ans = ePow(m * (a - b));
      steps = [
        `Es $1^{\\infty}$. $f - 1 = \\dfrac{${a - b}}{${minus("x", -b)}}$.`,
        `$g\\,(f - 1) = \\dfrac{${m * (a - b)}x}{${minus("x", -b)}} \\to ${m * (a - b)}$.`,
        `El límite es $${ans}$.`,
      ];
    } else if (tpl === "px") {
      const p = r.pick([2, 3, 4]);
      const a = r.int(-4, 4);
      const b = r.nz(-4, 4, [a]);
      expr = `\\left(${dfrac(terms([[p, "x"], [a, ""]]), terms([[p, "x"], [b, ""]]))}\\right)^{x}`;
      ans = ePow(a - b, p);
      steps = [
        `La base tiende a $\\frac{${p}}{${p}} = 1$ y el exponente a $\\infty$: es $1^{\\infty}$.`,
        `$f - 1 = \\dfrac{${a - b}}{${terms([[p, "x"], [b, ""]])}}$.`,
        `$g\\,(f - 1) = \\dfrac{${a - b}x}{${terms([[p, "x"], [b, ""]])}} \\to \\dfrac{${a - b}}{${p}}$.`,
        `El límite es $${ans}$.`,
      ];
    } else {
      expr = "\\left(\\dfrac{2x + a}{2x + a - 1}\\right)^{x}";
      ans = "e^{\\frac{1}{2}}";
      steps = [
        "La base tiende a $1$ para cualquier valor de $a$, y el exponente a $\\infty$: es $1^{\\infty}$.",
        "$f - 1 = \\dfrac{(2x + a) - (2x + a - 1)}{2x + a - 1} = \\dfrac{1}{2x + a - 1}$.",
        "$g\\,(f - 1) = \\dfrac{x}{2x + a - 1} \\to \\dfrac{1}{2}$.",
        "El límite es $e^{\\frac{1}{2}} = \\sqrt{e}$, y no depende de $a$.",
      ];
    }
    return {
      statement: `Calcula${tpl === "simbolico" ? ", para un número real $a$ fijo," : ""} $$${lim("\\infty", expr)}$$`,
      parts: [limPart(ans, { mistakes: withOne(ans) })],
      hints: [
        "Comprueba que la base tiende a $1$. Después usa $\\lim f^{g} = e^{\\lim g\\,(f - 1)}$.",
        "Para $f - 1$ resta con común denominador: arriba queda solo una constante.",
      ],
      solution: steps,
    };
  },
};

const notableExp: ExerciseGen = {
  id: "notable-exp",
  title: "El límite notable de la exponencial",
  level: 2,
  generate: (r) => {
    const tpl = r.pick(["T1", "T2", "T3"] as const);
    let expr: string, ans: string, steps: Rich[];
    if (tpl === "T1") {
      const k = r.nz(-4, 5);
      const m = r.pick([1, 2, 3, -1]);
      expr = dfrac(`e^{${kx(k)}} - 1`, kx(m));
      ans = frac(k, m);
      steps = [
        `Al sustituir sale $\\frac{0}{0}$. Con $u = ${kx(k)}$ escribimos $\\dfrac{e^{${kx(k)}} - 1}{${kx(m)}} = ${frac(k, m) === "1" ? "" : `${frac(k, m)} \\cdot `}\\dfrac{e^{u} - 1}{u}$.`,
        `Como $\\dfrac{e^{u} - 1}{u} \\to 1$, el límite es $${ans}$.`,
      ];
    } else if (tpl === "T2") {
      const k = r.nz(-4, 5);
      expr = dfrac(`1 - e^{${kx(k)}}`, "x");
      ans = String(-k);
      steps = [
        `Al sustituir sale $\\frac{0}{0}$. Sacamos el signo: $\\dfrac{1 - e^{${kx(k)}}}{x} = -${k < 0 ? `(${k})` : k} \\cdot \\dfrac{e^{${kx(k)}} - 1}{${kx(k)}}$.`,
        `La fracción tiende a $1$, así que el límite es $${ans}$.`,
      ];
    } else {
      const a = r.nz(-3, 5);
      const b = r.nz(-3, 5, [a]);
      expr = dfrac(`e^{${kx(a)}} - e^{${kx(b)}}`, "x");
      ans = String(a - b);
      steps = [
        `Al sustituir sale $\\frac{0}{0}$. Sumamos y restamos $1$: $\\dfrac{e^{${kx(a)}} - 1}{x} - \\dfrac{e^{${kx(b)}} - 1}{x}$.`,
        `Cada fracción es un notable: la primera tiende a $${a}$ y la segunda a $${b}$.`,
        `El límite es $${a} ${signed(-b)} = ${ans}$.`,
      ];
    }
    return {
      statement: `Calcula $$${lim(0, expr)}$$`,
      parts: [limPart(ans, { mistakes: [{ answer: "0", feedback: "Al sustituir sale $\\frac{0}{0}$, que no vale $0$. Usa el límite notable." }].filter(() => ans !== "0") })],
      hints: [
        "Usa $\\lim_{u \\to 0} \\dfrac{e^{u} - 1}{u} = 1$.",
        "Acomoda la expresión para que el exponente de $e$ aparezca también en el denominador.",
      ],
      solution: steps,
    };
  },
};

const enUnPunto: ExerciseGen = {
  id: "en-un-punto",
  title: "1^∞ cuando x tiende a cero",
  level: 2,
  generate: (r) => {
    const k = r.nz(-4, 4);
    const m = r.pick([1, 2, 3, 4]);
    const tpl = r.pick(["arriba", "abajo"] as const);
    const base = `\\left(1 ${k < 0 ? "-" : "+"} ${kx(Math.abs(k))}\\right)`;
    let expo: string, L: [number, number];
    if (tpl === "arriba") {
      expo = `\\frac{${m}}{x}`;
      L = [k * m, 1];
    } else {
      expo = `\\frac{1}{${m === 1 ? "" : m}x}`;
      L = [k, m];
    }
    const ans = ePow(L[0], L[1]);
    return {
      statement: `Calcula $$${lim(0, `${base}^{${expo}}`)}$$`,
      parts: [limPart(ans, { mistakes: withOne(ans) })],
      hints: [
        "Cuando $x \\to 0$ la base tiende a $1$ y el exponente a $\\pm\\infty$. Es $1^{\\infty}$.",
        `Calcula $\\lim g\\,(f - 1)$ con $f - 1 = ${kx(k)}$.`,
      ],
      solution: [
        `Es $1^{\\infty}$. $f - 1 = ${kx(k)}$ y $g = ${expo}$.`,
        `$g\\,(f - 1) = ${expo} \\cdot ${k < 0 ? `(${kx(k)})` : kx(k)} = ${frac(L[0], L[1])}$, que es constante.`,
        `El límite es $${ans}$.`,
      ],
    };
  },
};

const cuadratico: ExerciseGen = {
  id: "cuadratico",
  title: "1^∞ con cocientes de grado dos (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const tpl = r.pick(["x2", "x", "bx"] as const);
    const a = r.int(1, 3);
    const ax2 = a === 1 ? "x^{2}" : `${a}x^{2}`;
    let num: string, den: string, expo: string, ans: string, steps: Rich[];
    if (tpl === "bx") {
      const b = r.nz(-4, 4);
      const c = r.int(1, 6);
      num = terms([[a, "x^{2}"], [b, "x"]]);
      den = `${ax2} + ${c}`;
      expo = "x";
      ans = ePow(b, a);
      steps = [
        `La base tiende a $\\frac{${a}}{${a}} = 1$ y el exponente a $\\infty$. Es $1^{\\infty}$.`,
        `$f - 1 = \\dfrac{${num} - (${den})}{${den}} = \\dfrac{${terms([[b, "x"], [-c, ""]])}}{${den}}$.`,
        `$g\\,(f - 1) = \\dfrac{${terms([[b, "x^{2}"], [-c, "x"]])}}{${den}} \\to \\dfrac{${b}}{${a}}$, porque los grados son iguales.`,
        `El límite es $${ans}$.`,
      ];
    } else {
      const b = r.int(-4, 5);
      let c = r.int(-4, 5);
      if (c === b) c = b - 3;
      num = `${ax2} ${signed(b)}`;
      den = `${ax2} ${signed(c)}`;
      expo = tpl === "x2" ? "x^{2}" : "x";
      ans = tpl === "x2" ? ePow(b - c, a) : "1";
      steps = [
        `La base tiende a $1$ y el exponente a $\\infty$. Es $1^{\\infty}$.`,
        `$f - 1 = \\dfrac{(${num}) - (${den})}{${den}} = \\dfrac{${b - c}}{${den}}$.`,
        tpl === "x2"
          ? `$g\\,(f - 1) = \\dfrac{${b - c}x^{2}}{${den}} \\to \\dfrac{${b - c}}{${a}}$.`
          : `$g\\,(f - 1) = \\dfrac{${b - c}x}{${den}} \\to 0$, porque el denominador tiene mayor grado.`,
        tpl === "x2" ? `El límite es $${ans}$.` : "El límite es $e^{0} = 1$. Aquí sí da $1$, pero hubo que calcularlo.",
      ];
    }
    return {
      statement: `Calcula $$${lim("+\\infty", `\\left(${dfrac(num, den)}\\right)^{${expo}}`)}$$`,
      parts: [
        limPart(ans, {
          mistakes:
            tpl === "x"
              ? [{ answer: "e", feedback: "Revisa el grado: $g\\,(f - 1)$ tiene el denominador de mayor grado y tiende a $0$." }]
              : withOne(ans),
        }),
      ],
      hints: [
        "Comprueba que es $1^{\\infty}$ y usa $\\lim f^{g} = e^{\\lim g\\,(f - 1)}$.",
        "Al restar $f - 1$ se cancelan los términos en $x^2$. Después compara grados en $g\\,(f - 1)$.",
      ],
      solution: steps,
    };
  },
};

const cubicoExam: ExerciseGen = {
  id: "cubico",
  title: "1^∞ con cocientes de grado tres (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const p = r.nz(-3, 3);
    const k = r.pick([1, 2, 3]);
    const q = r.int(-3, 3);
    const rr = r.int(1, 8);
    const num = terms([[1, "x^{3}"], [p, "x^{2}"], [q, ""]]);
    const den = terms([[1, "x^{3}"], [rr, ""]]);
    const diff = terms([[p, "x^{2}"], [q - rr, ""]]);
    const ans = ePow(k * p);
    return {
      statement: `Calcula $$${lim("+\\infty", `\\left[${dfrac(num, den)}\\right]^{${kx(k)}}`)}$$`,
      parts: [limPart(ans, { mistakes: [ONE_MISTAKE, { answer: ePow(p), feedback: `Te faltó multiplicar por el $${k}$ del exponente.` }].filter((m) => m.answer !== ans) })],
      hints: [
        "La base tiende a $1$ porque numerador y denominador tienen el mismo grado y coeficiente principal $1$.",
        "Calcula $f - 1$ con común denominador y después $g\\,(f - 1)$. Compara grados.",
      ],
      solution: [
        "Es $1^{\\infty}$.",
        `$f - 1 = \\dfrac{(${num}) - (${den})}{${den}} = \\dfrac{${diff}}{${den}}$.`,
        `$g\\,(f - 1) = \\dfrac{${k === 1 ? "" : k}x(${diff})}{${den}}$, que es un cociente de grado tres sobre grado tres. Tiende a $${k * p}$.`,
        `El límite es $${ans}$.`,
      ],
    };
  },
};

const puntoDesplazado: ExerciseGen = {
  id: "punto-desplazado",
  title: "1^∞ cuando x tiende a un número (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const tpl = r.pick(["T1", "T2", "T3"] as const);
    let a: number, expr: string, ans: string, steps: Rich[];
    if (tpl === "T1") {
      a = r.int(-2, 4);
      const k = r.nz(-4, 4);
      expr = `\\left(${minus("x", a - 1)}\\right)^{${k < 0 ? "-" : ""}\\frac{${Math.abs(k)}}{${minus("x", a)}}}`;
      ans = ePow(k);
      steps = [
        `Cuando $x \\to ${a}$, la base tiende a $${a} ${signed(-(a - 1))} = 1$ y el exponente a $\\pm\\infty$. Es $1^{\\infty}$.`,
        `$f - 1 = ${minus("x", a)}$, así que $g\\,(f - 1) = \\dfrac{${k}}{${minus("x", a)}} \\cdot (${minus("x", a)}) = ${k}$.`,
        `El límite es $${ans}$.`,
      ];
    } else if (tpl === "T2") {
      a = r.int(-2, 4);
      const S = r.int(2, 6);
      const b = S - a;
      const k = r.nz(-3, 4);
      expr = `\\left(${dfrac(minus("x", -b), String(S))}\\right)^{${k < 0 ? "-" : ""}\\frac{${Math.abs(k)}}{${minus("x", a)}}}`;
      ans = ePow(k, S);
      steps = [
        `Cuando $x \\to ${a}$, la base tiende a $\\frac{${S}}{${S}} = 1$ y el exponente a $\\pm\\infty$. Es $1^{\\infty}$.`,
        `$f - 1 = \\dfrac{${minus("x", -b)} - ${S}}{${S}} = \\dfrac{${minus("x", a)}}{${S}}$.`,
        `$g\\,(f - 1) = \\dfrac{${k}}{${minus("x", a)}} \\cdot \\dfrac{${minus("x", a)}}{${S}} = ${frac(k, S)}$.`,
        `El límite es $${ans}$.`,
      ];
    } else {
      a = r.int(2, 5);
      expr = `\\left(\\frac{x}{${a}}\\right)^{\\frac{1}{${minus("x", a)}}}`;
      ans = ePow(1, a);
      steps = [
        `Cuando $x \\to ${a}$, la base tiende a $1$ y el exponente a $\\pm\\infty$. Es $1^{\\infty}$.`,
        `$f - 1 = \\dfrac{x - ${a}}{${a}}$, así que $g\\,(f - 1) = \\dfrac{1}{x - ${a}} \\cdot \\dfrac{x - ${a}}{${a}} = \\dfrac{1}{${a}}$.`,
        `El límite es $${ans}$.`,
      ];
    }
    return {
      statement: `Calcula $$${lim(a, expr)}$$`,
      parts: [limPart(ans, { mistakes: withOne(ans) })],
      hints: [
        "La fórmula $\\lim f^{g} = e^{\\lim g\\,(f - 1)}$ también sirve cuando $x$ tiende a un número.",
        "Al multiplicar $g$ por $f - 1$, el factor que se anula debería cancelarse.",
      ],
      solution: steps,
    };
  },
};

const lnTraslado: ExerciseGen = {
  id: "ln-traslado",
  title: "Notables trasladados a otro punto (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const tpl = r.pick(["ln", "lne", "exp"] as const);
    let p: string, expr: string, ans: string, steps: Rich[];
    if (tpl === "ln") {
      const a = r.int(2, 6);
      p = String(a);
      expr = dfrac(`\\ln x - \\ln ${a}`, `x - ${a}`);
      ans = frac(1, a);
      steps = [
        `Al sustituir sale $\\frac{0}{0}$. Juntamos los logaritmos: $\\ln x - \\ln ${a} = \\ln\\frac{x}{${a}}$.`,
        `Cambiamos $u = \\dfrac{x - ${a}}{${a}}$, que tiende a $0$. Entonces $\\frac{x}{${a}} = 1 + u$ y $x - ${a} = ${a}u$.`,
        `Queda $\\dfrac{\\ln(1 + u)}{${a}u} = \\dfrac{1}{${a}} \\cdot \\dfrac{\\ln(1 + u)}{u} \\to \\dfrac{1}{${a}}$.`,
      ];
    } else if (tpl === "lne") {
      p = "e";
      expr = dfrac("\\ln x - 1", "x - e");
      ans = "\\frac{1}{e}";
      steps = [
        "Al sustituir sale $\\frac{0}{0}$ porque $\\ln e = 1$. Escribimos $\\ln x - 1 = \\ln x - \\ln e = \\ln\\frac{x}{e}$.",
        "Cambiamos $u = \\dfrac{x - e}{e}$, que tiende a $0$. Entonces $\\frac{x}{e} = 1 + u$ y $x - e = eu$.",
        "Queda $\\dfrac{\\ln(1 + u)}{eu} = \\dfrac{1}{e} \\cdot \\dfrac{\\ln(1 + u)}{u} \\to \\dfrac{1}{e}$.",
      ];
    } else {
      const a = r.pick([1, 2, 3, -1, -2]);
      p = String(a);
      const ea = a === 1 ? "e" : `e^{${a}}`;
      expr = dfrac(`e^{x} - ${ea}`, minus("x", a));
      ans = ea;
      steps = [
        `Al sustituir sale $\\frac{0}{0}$. Sacamos factor común: $e^{x} - ${ea} = ${ea}\\left(e^{${minus("x", a)}} - 1\\right)$.`,
        `Con $u = ${minus("x", a)} \\to 0$ queda $${ea} \\cdot \\dfrac{e^{u} - 1}{u} \\to ${ea}$.`,
      ];
    }
    return {
      statement: `Calcula $$${lim(p, expr)}$$`,
      parts: [limPart(ans, { mistakes: [{ answer: "0", feedback: "Al sustituir sale $\\frac{0}{0}$, que no vale $0$. Lleva la expresión a un límite notable." }] })],
      hints: [
        "Al sustituir sale $\\frac{0}{0}$. Cambia de variable para que la nueva variable tienda a $0$.",
        "Los notables son $\\lim_{u \\to 0} \\frac{\\ln(1 + u)}{u} = 1$ y $\\lim_{u \\to 0} \\frac{e^{u} - 1}{u} = 1$.",
      ],
      solution: steps,
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("numero-e"),
  objectives: [
    "Explicar de dónde sale el número $e$ con el interés compuesto.",
    "Reconocer la indeterminación $1^{\\infty}$ y resolverla con $\\lim f^{g} = e^{\\lim g\\,(f - 1)}$.",
    "Calcular límites $1^{\\infty}$ con cocientes de polinomios, al infinito y en un punto.",
    "Usar los límites notables $\\frac{\\ln(1 + x)}{x} \\to 1$ y $\\frac{e^{x} - 1}{x} \\to 1$.",
  ],
  sections: [
    {
      id: "interes-compuesto",
      title: "Interés compuesto",
      blocks: [
        {
          type: "text",
          md: "Imagina que depositas $1$ dólar en un banco que paga $100\\%$ de interés anual. Al final del año tienes $2$. Ahora el banco ofrece capitalizar dos veces al año: a mitad de año te pagan $50\\%$ y ese interés también gana intereses el resto del año. Terminas con $(1 + \\frac{1}{2})^2 = 2{,}25$. Ganas más.\n\nSi capitalizan $n$ veces al año, cada período paga $\\frac{1}{n}$ y al final tienes $\\left(1 + \\frac{1}{n}\\right)^n$. ¿Se puede ganar todo lo que uno quiera capitalizando más y más seguido?",
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
            ["Por hora", "$8760$", "$2{,}7181$"],
          ],
          caption: "El monto crece, pero cada vez menos. Se frena cerca de $2{,}71828$.",
        },
        {
          type: "text",
          md: "No: el monto tiene un techo. Por más que se capitalice, nunca pasa de $2{,}718281828\\dots$ Ese número es tan importante que tiene nombre propio, el **número $e$**. Capitalizar en cada instante se llama **capitalización continua**.",
        },
        {
          type: "widget",
          widget: {
            kind: "sliders",
            fn: "\\left(1+\\frac{1}{n}\\right)^{nx}",
            params: [{ name: "n", min: 1, max: 50, step: 1, value: 1, label: "veces por año" }],
            x: [0, 2],
            y: [0, 8],
            formula: "M(t) = \\left(1 + \\frac{1}{{n}}\\right)^{{n}t}",
            reference: [{ fn: "e^{x}", color: "orange", dashed: true, label: "e^t" }],
          },
          caption: "Monto de $1$ dólar al $100\\%$ anual después de $t$ años. Al subir $n$, la curva se pega a $e^{t}$, la curva punteada.",
        },
        {
          type: "note",
          tone: "econ",
          title: "La fórmula del interés continuo",
          md: "Con un capital $C$, una tasa anual $r$ y $n$ capitalizaciones al año, después de $t$ años el monto es $C\\left(1 + \\frac{r}{n}\\right)^{nt}$. Si $n \\to \\infty$:\n\n$$\\lim_{n \\to \\infty} C\\left(1 + \\frac{r}{n}\\right)^{nt} = Ce^{rt}$$\n\nPor ejemplo, $1000$ dólares al $8\\%$ durante $5$ años dan $1000e^{0{,}4} \\approx 1491{,}82$ dólares con capitalización continua, frente a unos $1489{,}85$ con capitalización mensual.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $$\\lim_{n \\to \\infty} 500\\left(1 + \\frac{0{,}1}{n}\\right)^{2n}$$ Escribe la respuesta exacta usando $e$.",
            parts: [limPart("500e^{0{,}2}", { mistakes: [{ answer: "500(1 + 0{,}1)^{2}", feedback: "Eso es capitalizar una vez al año. Con $n \\to \\infty$ aparece $e$." }] })],
            solution: ["Con $C = 500$, $r = 0{,}1$ y $t = 2$, el límite es $500e^{0{,}1 \\cdot 2} = 500e^{0{,}2}$."],
          },
        },
      ],
    },
    {
      id: "definicion-e",
      title: "El número e como límite",
      blocks: [
        {
          type: "definition",
          title: "El número e",
          md: "$$e = \\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^{n} \\approx 2{,}71828$$\n\nEs irracional, como $\\pi$. Es la base de la función exponencial $e^{x}$ y del logaritmo natural $\\ln x$.",
        },
        {
          type: "graph",
          spec: {
            x: [0, 20],
            y: [0, 4],
            curves: [{ fn: "\\left(1+\\frac{1}{x}\\right)^{x}", domain: [0.05, 20], color: "accent" }],
            hlines: [{ y: 2.71828, dashed: true, color: "orange", label: "y = e" }],
          },
          caption: "La gráfica de $\\left(1 + \\frac{1}{x}\\right)^x$ sube y se pega a la recta $y = e$ sin cruzarla.",
        },
        {
          type: "text",
          md: "El resultado no depende de la letra. Lo que importa es la forma: **uno más uno sobre algo, elevado a ese mismo algo, cuando ese algo crece sin control**. Si $u \\to \\infty$,\n\n$$\\lim \\left(1 + \\frac{1}{u}\\right)^{u} = e$$\n\nY si se cambia $u$ por $\\frac{1}{u}$, la misma idea se escribe con $u \\to 0$: $\\lim_{u \\to 0} (1 + u)^{1/u} = e$.",
        },
        {
          type: "example",
          title: "Un cambio de variable",
          problem: "Calcula $\\lim_{x \\to \\infty} \\left(1 + \\dfrac{3}{x}\\right)^{x}$.",
          steps: [
            "Queremos que aparezca $\\frac{1}{u}$. Tomamos $u = \\frac{x}{3}$, que también tiende a $\\infty$. Entonces $\\frac{3}{x} = \\frac{1}{u}$ y $x = 3u$.",
            "Queda $\\left(1 + \\frac{1}{u}\\right)^{3u} = \\left[\\left(1 + \\frac{1}{u}\\right)^{u}\\right]^{3}$.",
            "El corchete tiende a $e$, así que todo tiende a $e^{3}$.",
          ],
          answer: "$e^{3}$. En general, $\\lim_{x \\to \\infty} \\left(1 + \\frac{k}{x}\\right)^{x} = e^{k}$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "1 elevado a infinito no es 1",
          md: "La tentación es decir: la base tiende a $1$ y $1$ elevado a cualquier cosa es $1$. Pero la base nunca es exactamente $1$, y el exponente crece sin control. Los dos efectos compiten, y el resultado puede ser cualquier número positivo. Por eso $1^{\\infty}$ es una indeterminación.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $$\\lim_{x \\to \\infty} \\left(1 + \\frac{2}{x}\\right)^{x}$$",
            parts: [limPart("e^{2}", { mistakes: [ONE_MISTAKE] })],
            solution: ["Con $u = \\frac{x}{2}$ queda $\\left[\\left(1 + \\frac{1}{u}\\right)^{u}\\right]^{2} \\to e^{2}$."],
          },
        },
      ],
    },
    {
      id: "formula-1-infinito",
      title: "La fórmula para 1^∞",
      blocks: [
        {
          type: "text",
          md: "Hacer el cambio de variable cada vez es engorroso. Hay una fórmula que resuelve cualquier $1^{\\infty}$ de una vez. Si $f(x) \\to 1$ y $g(x) \\to \\infty$:\n\n$$\\lim f(x)^{g(x)} = e^{\\lim g(x)\\,[f(x) - 1]}$$\n\nDe dónde sale: escribimos $f = 1 + (f - 1)$ y llamamos $u = \\frac{1}{f - 1}$, que tiende a infinito. Entonces $f^{g} = \\left[\\left(1 + \\frac{1}{u}\\right)^{u}\\right]^{g\\,(f - 1)}$. El corchete tiende a $e$ y queda el exponente $g\\,(f - 1)$.",
        },
        {
          type: "definition",
          title: "Receta para 1^∞",
          md: "- Comprueba que la base tiende a $1$ y el exponente a $\\pm\\infty$.\n- Calcula $f - 1$ con común denominador y simplifica.\n- Calcula $L = \\lim g\\,(f - 1)$. Normalmente es un límite de cocientes de polinomios.\n- El resultado es $e^{L}$.",
        },
        {
          type: "example",
          title: "Cociente de grado uno",
          problem: "Calcula $\\lim_{x \\to \\infty} \\left(\\dfrac{x + 3}{x - 1}\\right)^{x + 2}$.",
          steps: [
            "La base tiende a $1$ y el exponente a $\\infty$: es $1^{\\infty}$.",
            "$f - 1 = \\dfrac{x + 3 - (x - 1)}{x - 1} = \\dfrac{4}{x - 1}$.",
            "$g\\,(f - 1) = \\dfrac{4(x + 2)}{x - 1} \\to 4$, porque los grados son iguales.",
          ],
          answer: "$e^{4}$",
        },
        {
          type: "example",
          title: "Dos ejemplos de parcial",
          problem: "Calcula $\\lim_{x \\to \\infty} \\left(\\dfrac{2x^2 + 2}{2x^2 - 1}\\right)^{x}$ y $\\lim_{x \\to +\\infty} \\left[\\dfrac{x^3 - 2x^2 + 1}{x^3 + 6}\\right]^{2x}$.",
          steps: [
            "Primero: $f - 1 = \\dfrac{3}{2x^2 - 1}$ y $g\\,(f - 1) = \\dfrac{3x}{2x^2 - 1} \\to 0$. El resultado es $e^{0} = 1$.",
            "Segundo: $f - 1 = \\dfrac{-2x^2 - 5}{x^3 + 6}$ y $g\\,(f - 1) = \\dfrac{2x(-2x^2 - 5)}{x^3 + 6} = \\dfrac{-4x^3 - 10x}{x^3 + 6} \\to -4$. El resultado es $e^{-4}$.",
          ],
          answer: "$1$ y $e^{-4}$",
        },
        {
          type: "note",
          tone: "warning",
          title: "Primero mira la base",
          md: "La fórmula solo vale si la base tiende a $1$. En $\\left(\\frac{2x + 1}{x + 3}\\right)^{x}$ la base tiende a $2$, y $2^{\\infty} = \\infty$. En $\\left(\\frac{x + 1}{2x}\\right)^{x}$ tiende a $\\frac{1}{2}$, y $\\left(\\frac{1}{2}\\right)^{\\infty} = 0$. Ninguno de los dos es indeterminado.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $$\\lim_{x \\to \\infty} \\left(\\dfrac{x + 5}{x + 2}\\right)^{x}$$",
            parts: [limPart("e^{3}", { mistakes: [ONE_MISTAKE] })],
            solution: ["$f - 1 = \\frac{3}{x + 2}$ y $g\\,(f - 1) = \\frac{3x}{x + 2} \\to 3$. El límite es $e^{3}$."],
          },
        },
      ],
    },
    {
      id: "en-un-punto",
      title: "1^∞ cuando x tiende a un número",
      blocks: [
        {
          type: "text",
          md: "La fórmula no exige que $x$ vaya al infinito. Lo único que pide es que la base tienda a $1$ y el exponente a infinito. Eso pasa a menudo cuando $x \\to a$ y el exponente tiene $x - a$ en el denominador.",
        },
        {
          type: "example",
          title: "Cuando x tiende a cero",
          problem: "Calcula $\\lim_{x \\to 0} (1 + 2x)^{1/x}$.",
          steps: [
            "La base tiende a $1$ y el exponente $\\frac{1}{x}$ a $\\pm\\infty$. Es $1^{\\infty}$.",
            "$f - 1 = 2x$ y $g\\,(f - 1) = \\frac{1}{x} \\cdot 2x = 2$.",
          ],
          answer: "$e^{2}$",
        },
        {
          type: "example",
          title: "Cuando x tiende a otro número",
          problem: "Calcula $\\lim_{x \\to 2} \\left(\\dfrac{x}{2}\\right)^{\\frac{1}{x - 2}}$.",
          steps: [
            "En $x = 2$ la base vale $1$ y el exponente explota. Es $1^{\\infty}$.",
            "$f - 1 = \\dfrac{x - 2}{2}$ y $g\\,(f - 1) = \\dfrac{1}{x - 2} \\cdot \\dfrac{x - 2}{2} = \\dfrac{1}{2}$.",
          ],
          answer: "$e^{1/2} = \\sqrt{e}$",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $$\\lim_{x \\to 0} (1 - 3x)^{\\frac{1}{x}}$$",
            parts: [limPart("e^{-3}", { mistakes: [ONE_MISTAKE, { answer: "e^{3}", feedback: "Revisa el signo: $f - 1 = -3x$." }] })],
            solution: ["$f - 1 = -3x$ y $g\\,(f - 1) = \\frac{1}{x} \\cdot (-3x) = -3$. El límite es $e^{-3}$."],
          },
        },
      ],
    },
    {
      id: "notables",
      title: "Límites notables con ln y e",
      blocks: [
        {
          type: "text",
          md: "Del número $e$ salen dos límites que conviene tener a mano, porque resuelven muchos $\\frac{0}{0}$ con logaritmos y exponenciales.\n\n$$\\lim_{x \\to 0} \\frac{\\ln(1 + x)}{x} = 1 \\qquad \\lim_{x \\to 0} \\frac{e^{x} - 1}{x} = 1$$",
        },
        {
          type: "text",
          md: "El primero sale de $\\frac{\\ln(1 + x)}{x} = \\ln\\left[(1 + x)^{1/x}\\right]$, y lo de adentro tiende a $e$, así que el logaritmo tiende a $\\ln e = 1$. El segundo sale del primero con el cambio $u = e^{x} - 1$: entonces $x = \\ln(1 + u)$ y queda $\\frac{u}{\\ln(1 + u)} \\to 1$.\n\nIgual que con $e$, la letra no importa: si $u \\to 0$, entonces $\\frac{\\ln(1 + u)}{u} \\to 1$ y $\\frac{e^{u} - 1}{u} \\to 1$. Por ejemplo, $\\lim_{x \\to 0} \\frac{\\ln(1 + 3x)}{x} = 3$.",
        },
        {
          type: "example",
          title: "Exponencial (salió en parciales)",
          problem: "Calcula $\\lim_{x \\to 0} \\dfrac{1 - e^{2x}}{x}$.",
          steps: [
            "Al sustituir sale $\\frac{0}{0}$.",
            "Escribimos $\\dfrac{1 - e^{2x}}{x} = -2 \\cdot \\dfrac{e^{2x} - 1}{2x}$.",
            "Con $u = 2x \\to 0$, la fracción tiende a $1$.",
          ],
          answer: "$-2$",
        },
        {
          type: "example",
          title: "Logaritmo cerca de e (salió en parciales)",
          problem: "Calcula $\\lim_{x \\to e} \\dfrac{\\ln x - 1}{x - e}$.",
          steps: [
            "Al sustituir sale $\\frac{0}{0}$. Como $1 = \\ln e$, el numerador es $\\ln x - \\ln e = \\ln\\frac{x}{e}$.",
            "Cambiamos $u = \\frac{x - e}{e}$, que tiende a $0$. Entonces $\\frac{x}{e} = 1 + u$ y $x - e = eu$.",
            "Queda $\\dfrac{\\ln(1 + u)}{eu} = \\dfrac{1}{e} \\cdot \\dfrac{\\ln(1 + u)}{u} \\to \\dfrac{1}{e}$.",
          ],
          answer: "$\\dfrac{1}{e}$",
        },
        {
          type: "note",
          tone: "econ",
          title: "Tasa continua y tasa efectiva",
          md: "Si un banco paga una tasa continua $r$, un dólar se convierte en $e^{r}$ al cabo de un año. La tasa efectiva anual es $e^{r} - 1$. El notable $\\frac{e^{r} - 1}{r} \\to 1$ dice que, para tasas pequeñas, la efectiva y la continua casi coinciden: con $r = 0{,}05$ la efectiva es $0{,}0513$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $$\\lim_{x \\to 0} \\dfrac{\\ln(1 + 5x)}{x}$$",
            parts: [limPart("5", { mistakes: [{ answer: "1", feedback: "El notable da $1$ solo si arriba y abajo está lo mismo. Aquí arriba hay $5x$ y abajo $x$." }] })],
            solution: ["$\\dfrac{\\ln(1 + 5x)}{x} = 5 \\cdot \\dfrac{\\ln(1 + 5x)}{5x} \\to 5 \\cdot 1 = 5$."],
          },
        },
      ],
    },
  ],
  exercises: [
    interesContinuo,
    unoKSobreX,
    noIndeterminado,
    notableLn,
    racionalExponente,
    racionalMx,
    notableExp,
    enUnPunto,
    cuadratico,
    cubicoExam,
    puntoDesplazado,
    lnTraslado,
  ],
};

export default topic;
