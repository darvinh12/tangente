import { meta } from "../catalog";
import { choice, trueFalse } from "../helpers";
import type { ExerciseGen, Mistake, Part, Rich, Topic } from "../types";
import { evaluate, parse } from "@/lib/math/parse";
import { frac } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

type Special = "inf" | "-inf" | "dne";
const SP: Special[] = ["inf", "-inf", "dne"];

/** \lim_{x \to a} f */
const lim = (a: string, f: string) => `\\lim_{x \\to ${a}} ${f}`;

function value(tex: string): number {
  try {
    return evaluate(parse(tex));
  } catch {
    return NaN;
  }
}

function same(a: number, b: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a));
}

/** Quita errores típicos que coinciden con la respuesta o entre sí. */
function clean(answer: string, ms: Mistake[]): Mistake[] {
  const seen = [value(answer)];
  const out: Mistake[] = [];
  for (const m of ms) {
    const v = value(m.answer);
    if (Number.isNaN(v) || seen.some((s) => same(s, v))) continue;
    seen.push(v);
    out.push(m);
  }
  return out;
}

/** Parte de respuesta para un límite, siempre con los botones especiales. */
function limPart(answer: string, mistakes: Mistake[] = [], prompt?: Rich, before?: string): Part {
  return { kind: "expr", prompt, answer, special: [...SP], mistakes: clean(answer, mistakes), before };
}

/** "x - 3", "x + 2" */
const xMinus = (a: number) => (a === 0 ? "x" : a > 0 ? `x - ${a}` : `x + ${-a}`);
/** kx con coeficiente limpio */
const kx = (k: number) => (k === 1 ? "x" : k === -1 ? "-x" : `${k}x`);
/** e^{kx} */
const ekx = (k: number) => `e^{${kx(k)}}`;
const infTex = (v: number) => (v > 0 ? "+\\infty" : "-\\infty");
/** Coeficiente pegado: 1 -> "", -1 -> "-" */
const cf = (k: number) => (k === 1 ? "" : k === -1 ? "-" : String(k));
/** Potencia de x: 0 -> "1", 1 -> "x" */
const pw = (n: number) => (n === 0 ? "1" : n === 1 ? "x" : `x^{${n}}`);

/* ----------------------------------- ejercicios ----------------------------------- */

const FORMS = {
  "00": "$\\frac{0}{0}$",
  ii: "$\\frac{\\infty}{\\infty}$",
  "0i": "$0 \\cdot \\infty$",
  imi: "$\\infty - \\infty$",
  "1i": "$1^{\\infty}$",
  "000": "$0^{0}$",
  i0: "$\\infty^{0}$",
  none: "No es una indeterminación",
} as const;
type FormKey = keyof typeof FORMS;

const identificarForma: ExerciseGen = {
  id: "identificar-forma",
  title: "¿Qué indeterminación es?",
  level: 1,
  generate: (r) => {
    const a = r.int(2, 6);
    const n = r.int(2, 4);
    const cases: { lim: string; form: FormKey; why: string }[] = [
      { lim: lim(String(a), `\\frac{x^{2} - ${a * a}}{x - ${a}}`), form: "00", why: `arriba $${a}^2 - ${a * a} = 0$ y abajo $${a} - ${a} = 0$` },
      { lim: lim("+\\infty", `\\frac{x^{${n}} + ${a}}{e^{x}}`), form: "ii", why: "arriba y abajo crecen sin control" },
      { lim: lim("0^{+}", `x^{${n}} \\ln x`), form: "0i", why: `$x^{${n}} \\to 0$ mientras $\\ln x \\to -\\infty$` },
      { lim: lim("0^{+}", `\\frac{1}{x} - \\frac{1}{e^{x} - 1}`), form: "imi", why: "los dos términos crecen a $+\\infty$ y se están restando" },
      { lim: lim("+\\infty", `\\left(1 + \\frac{${a}}{x}\\right)^{x}`), form: "1i", why: "la base tiende a $1$ y el exponente a $+\\infty$" },
      { lim: lim("0^{+}", `x^{${n}x}`), form: "000", why: "la base y el exponente tienden a $0$" },
      { lim: lim("+\\infty", `x^{\\frac{${n}}{x}}`), form: "i0", why: "la base crece sin control y el exponente tiende a $0$" },
      { lim: lim("0", `\\frac{x + ${a}}{x + ${a + 1}}`), form: "none", why: `al sustituir queda $\\frac{${a}}{${a + 1}}$, un número. No hay nada indeterminado` },
      { lim: lim("0^{+}", `\\frac{\\ln x}{x}`), form: "none", why: "arriba $\\ln x \\to -\\infty$ y abajo $x \\to 0^{+}$. Un número enorme negativo entre uno muy pequeño positivo da $-\\infty$, sin dudas" },
    ];
    const c = r.pick(cases);
    const others = r.sample((Object.keys(FORMS) as FormKey[]).filter((k) => k !== c.form), 3);
    return {
      statement: `¿De qué forma es el límite $${c.lim}$ al sustituir directamente?`,
      parts: [
        choice(
          FORMS[c.form],
          others.map((k) => [FORMS[k], `Sustituye cada pedazo por separado: ${c.why}.`] as [Rich, Rich]),
        ),
      ],
      hints: ["Mira a qué tiende cada pedazo por separado: numerador y denominador, o base y exponente."],
      solution: [
        `Al sustituir, ${c.why}.`,
        c.form === "none" ? "No es una indeterminación, el límite se obtiene directamente." : `Es una indeterminación de la forma ${FORMS[c.form]}.`,
      ],
    };
  },
};

const potenciaCociente: ExerciseGen = {
  id: "potencia-cociente",
  title: "Cociente de potencias que se anulan",
  level: 1,
  generate: (r) => {
    const a = r.nz(-3, 3);
    const n = r.int(2, 4);
    const m = r.int(1, Math.min(2, n - 1));
    const an = a ** n;
    const am = a ** m;
    const num = `x^{${n}} ${an < 0 ? "+" : "-"} ${Math.abs(an)}`;
    const den = m === 1 ? xMinus(a) : `x^{${m}} ${am < 0 ? "+" : "-"} ${Math.abs(am)}`;
    const ans = frac(n * a ** (n - 1), m * a ** (m - 1));
    return {
      statement: `Calcula $$${lim(String(a), `\\frac{${num}}{${den}}`)}$$`,
      parts: [
        limPart(ans, [
          { answer: "0", feedback: "Al sustituir sale $\\frac{0}{0}$, que no vale cero. Es una indeterminación, hay que derivar." },
          { answer: frac(n, m), feedback: "Derivaste bien, pero olvidaste sustituir $x$ en las derivadas." },
          { answer: frac(n * a ** (n - 1), 1), feedback: "Revisa la derivada del denominador." },
        ]),
      ],
      hints: [
        `Sustituye $x = ${a}$ arriba y abajo. Si los dos dan cero, aplica la regla.`,
        `La derivada de $x^{${n}}$ es $${n}x^{${n - 1}}$.`,
      ],
      solution: [
        `Al sustituir $x = ${a}$: arriba $${a < 0 ? `(${a})` : a}^{${n}} ${an < 0 ? "+" : "-"} ${Math.abs(an)} = 0$ y abajo también da $0$. Es $\\frac{0}{0}$.`,
        `Derivamos por separado: arriba $${n}x^{${n - 1}}$, abajo $${m === 1 ? "1" : `${m}x`}$.`,
        `$${lim(String(a), `\\frac{${n}x^{${n - 1}}}{${m === 1 ? "1" : `${m}x`}}`)} = ${ans}$.`,
      ],
    };
  },
};

const expSobreX: ExerciseGen = {
  id: "exp-sobre-x",
  title: "Exponenciales y logaritmos cerca de cero",
  level: 1,
  generate: (r) => {
    const k = r.nz(-4, 4, [1]);
    const m = r.int(1, 4);
    const fam = r.pick(["exp", "uno-menos", "ln"] as const);
    const den = m === 1 ? "x" : `${m}x`;
    let f: string, ans: string, dNum: string, why: string;
    if (fam === "exp") {
      f = `\\frac{${ekx(k)} - 1}{${den}}`;
      ans = frac(k, m);
      dNum = `${cf(k)}${ekx(k)}`;
      why = `arriba $e^{0} - 1 = 0$`;
    } else if (fam === "uno-menos") {
      f = `\\frac{1 - ${ekx(k)}}{${den}}`;
      ans = frac(-k, m);
      dNum = `${cf(-k)}${ekx(k)}`;
      why = `arriba $1 - e^{0} = 0$`;
    } else {
      const kk = Math.abs(k);
      f = `\\frac{\\ln(1 + ${kk}x)}{${den}}`;
      ans = frac(kk, m);
      dNum = `\\frac{${kk}}{1 + ${kk}x}`;
      why = "arriba $\\ln 1 = 0$";
    }
    const ansV = value(ans);
    return {
      statement: `Calcula $$${lim("0", f)}$$`,
      parts: [
        limPart(ans, [
          { answer: frac(-Math.round(ansV * m), m), feedback: "Revisa el signo. La regla de la cadena saca el coeficiente con su signo." },
          { answer: frac(m, Math.round(ansV * m)), feedback: "Invertiste el resultado. Va derivada de arriba entre derivada de abajo." },
          { answer: "1", feedback: "Olvidaste la regla de la cadena al derivar la exponencial o el logaritmo." },
        ]),
      ],
      hints: ["Sustituye $x = 0$. Si sale $\\frac{0}{0}$, deriva arriba y abajo por separado.", "Cuidado con la regla de la cadena: $(e^{kx})' = ke^{kx}$."],
      solution: [
        `Al sustituir $x = 0$, ${why} y abajo $0$. Es $\\frac{0}{0}$.`,
        `Derivada del numerador: $${dNum}$. Derivada del denominador: $${m}$.`,
        `Sustituimos $x = 0$ en el nuevo cociente: el límite es $${ans}$.`,
      ],
    };
  },
};

const lnPunto: ExerciseGen = {
  id: "ln-punto",
  title: "Logaritmos con indeterminación 0/0",
  level: 1,
  generate: (r) => {
    const fam = r.pick(["e", "ln-arriba", "ln-abajo"] as const);
    if (fam === "e") {
      const m = r.int(1, 3);
      const em = m === 1 ? "e" : `e^{${m}}`;
      const ans = `\\frac{1}{${em}}`;
      return {
        statement: `Calcula $$${lim(em, `\\frac{\\ln x - ${m}}{x - ${em}}`)}$$`,
        parts: [limPart(ans, [
          { answer: em, feedback: "La derivada de $\\ln x$ es $\\frac{1}{x}$, no $x$. Al sustituir queda $\\frac{1}{x}$ evaluado en el punto." },
          { answer: "0", feedback: "Sale $\\frac{0}{0}$ al sustituir, y eso no significa cero." },
          { answer: "1", feedback: "Te faltó sustituir $x$ en la derivada $\\frac{1}{x}$." },
        ])],
        hints: [`Recuerda que $\\ln ${em} = ${m}$.`, "La derivada de $\\ln x$ es $\\frac{1}{x}$."],
        solution: [
          `Al sustituir $x = ${em}$: arriba $\\ln ${em} - ${m} = 0$ y abajo $0$. Es $\\frac{0}{0}$.`,
          "Derivamos: arriba $\\frac{1}{x}$, abajo $1$.",
          `$${lim(em, "\\frac{1}{x}")} = ${ans}$.`,
        ],
      };
    }
    const n = r.int(2, 5);
    const up = fam === "ln-arriba";
    const f = up ? `\\frac{\\ln x}{x^{${n}} - 1}` : `\\frac{x^{${n}} - 1}{\\ln x}`;
    const ans = up ? `\\frac{1}{${n}}` : String(n);
    return {
      statement: `Calcula $$${lim("1", f)}$$`,
      parts: [limPart(ans, [
        { answer: up ? String(n) : `\\frac{1}{${n}}`, feedback: "Invertiste el cociente. Va la derivada del numerador entre la derivada del denominador." },
        { answer: "0", feedback: "Sale $\\frac{0}{0}$ al sustituir, y eso no significa cero." },
      ])],
      hints: ["$\\ln 1 = 0$ y $1^{n} - 1 = 0$.", `La derivada de $x^{${n}}$ es $${n}x^{${n - 1}}$.`],
      solution: [
        "Al sustituir $x = 1$ arriba y abajo da $0$. Es $\\frac{0}{0}$.",
        up
          ? `Derivamos: $\\dfrac{1/x}{${n}x^{${n - 1}}} = \\dfrac{1}{${n}x^{${n}}}$.`
          : `Derivamos: $\\dfrac{${n}x^{${n - 1}}}{1/x} = ${n}x^{${n}}$.`,
        `En $x = 1$ el resultado es $${ans}$.`,
      ],
    };
  },
};

const ERR = {
  sinIndet: "Aplicó la regla sin que hubiera indeterminación.",
  cociente: "Derivó el cociente completo en vez de derivar arriba y abajo por separado.",
  exponente: "Calculó el límite del logaritmo y olvidó volver a la función original.",
  ok: "No hay ningún error.",
} as const;

const encuentraError: ExerciseGen = {
  id: "encuentra-error",
  title: "Encuentra el error",
  level: 1,
  generate: (r) => {
    const kind = r.pick(["sinIndet", "cociente", "exponente"] as const);
    let work: string, why: string;
    if (kind === "sinIndet") {
      const a = r.int(1, 4);
      const p = r.int(1, 5);
      const q = r.int(1, 4);
      work = `Para calcular $\\displaystyle ${lim(String(a), `\\frac{x^{2} + ${p}}{x + ${q}}`)}$ un estudiante deriva arriba y abajo y escribe $${lim(String(a), "\\frac{2x}{1}")} = ${2 * a}$.`;
      why = `Al sustituir queda $\\frac{${a * a + p}}{${a + q}}$, que es un número. No había indeterminación, así que la regla no se podía usar. El límite correcto es $${frac(a * a + p, a + q)}$.`;
    } else if (kind === "cociente") {
      const k = r.int(2, 5);
      work = `Para calcular $\\displaystyle ${lim("0", `\\frac{e^{${k}x} - 1}{x}`)}$ un estudiante escribe $$${lim("0", `\\frac{${k}e^{${k}x} \\cdot x - (e^{${k}x} - 1)}{x^{2}}`)}$$ y vuelve a obtener $\\frac{0}{0}$.`;
      why = `Usó la regla del cociente, que sirve para derivar una función, no para L'Hôpital. Se deriva arriba ($${k}e^{${k}x}$) y abajo ($1$) por separado, y el límite es $${k}$.`;
    } else {
      const a = r.int(2, 5);
      work = `Para calcular $${lim("+\\infty", `\\left(1 + \\frac{${a}}{x}\\right)^{x}`)}$ un estudiante toma $y = \\left(1 + \\frac{${a}}{x}\\right)^{x}$, prueba que $\\lim \\ln y = ${a}$ y responde que el límite es $${a}$.`;
      why = `Lo que vale $${a}$ es el límite de $\\ln y$. Como $y = e^{\\ln y}$, el límite pedido es $e^{${a}}$.`;
    }
    const others = (Object.keys(ERR) as (keyof typeof ERR)[]).filter((k) => k !== kind);
    return {
      statement: `${work} ¿Cuál es el error?`,
      parts: [choice(ERR[kind], others.map((k) => [ERR[k], why] as [Rich, Rich]))],
      hints: ["Revisa tres cosas: si había indeterminación, cómo se derivó y si la respuesta corresponde a lo que se pedía."],
      solution: [why],
    };
  },
};

const infinitoInfinito: ExerciseGen = {
  id: "infinito-infinito",
  title: "Infinito entre infinito",
  level: 2,
  generate: (r) => {
    const fam = r.pick(["pot-exp", "exp-pot", "polilog", "ln-ln", "ln-pot"] as const);
    let f: string, ans: string, steps: string[];
    const mistakes: Mistake[] = [];
    if (fam === "pot-exp") {
      const n = r.int(2, 3);
      const k = r.int(1, 3);
      f = `\\frac{x^{${n}}}{${ekx(k)}}`;
      ans = "0";
      steps = [
        `Arriba y abajo tienden a $+\\infty$. Es $\\frac{\\infty}{\\infty}$.`,
        `Cada derivada baja en uno la potencia de arriba, mientras la exponencial de abajo sigue siendo exponencial${k === 1 ? "" : `, multiplicada por $${k}$ cada vez`}. Después de ${n} derivadas queda $\\frac{${n === 2 ? 2 : 6}}{${cf(k ** n)}${ekx(k)}}$.`,
        "Arriba una constante y abajo algo que crece sin control: el límite es $0$.",
      ];
      mistakes.push({ answer: "\\infty", feedback: "Es al revés. La exponencial crece mucho más rápido que cualquier potencia, por eso el cociente se va a cero." });
    } else if (fam === "exp-pot") {
      const n = r.int(2, 3);
      const k = r.int(1, 3);
      const a = r.int(2, 5);
      f = `\\frac{${ekx(k)}}{${a}x^{${n}}}`;
      ans = "\\infty";
      steps = [
        "Arriba y abajo tienden a $+\\infty$. Es $\\frac{\\infty}{\\infty}$.",
        `Derivando ${n} veces, abajo queda la constante $${a * (n === 2 ? 2 : 6)}$ y arriba $${k ** n}${ekx(k)}$.`,
        "Arriba crece sin control y abajo hay una constante positiva: el límite es $+\\infty$.",
      ];
      mistakes.push({ answer: "0", feedback: "Es al revés. La exponencial está arriba y le gana a la potencia." });
    } else if (fam === "polilog") {
      const a = r.nz(-5, 5);
      const b = r.int(1, 6);
      const c = r.int(1, 5);
      f = `\\frac{${a === 1 ? "" : a === -1 ? "-" : a}x^{2} + ${b}x}{${c === 1 ? "" : c}x^{2} + \\ln x}`;
      ans = frac(a, c);
      steps = [
        "Arriba y abajo crecen sin control (el de arriba puede ir a $-\\infty$, igual es indeterminado).",
        `Primera derivada: $\\dfrac{${2 * a}x + ${b}}{${2 * c}x + \\frac{1}{x}}$, sigue siendo $\\frac{\\infty}{\\infty}$.`,
        `Segunda derivada: $\\dfrac{${2 * a}}{${2 * c} - \\frac{1}{x^{2}}}$, que tiende a $\\frac{${2 * a}}{${2 * c}} = ${ans}$.`,
      ];
      mistakes.push({ answer: "0", feedback: "El $\\ln x$ crece muy lento comparado con $x^2$, así que mandan los términos con $x^2$." });
      mistakes.push({ answer: frac(b, 1), feedback: "Mandan los términos de mayor crecimiento, que son los de $x^{2}$." });
    } else if (fam === "ln-ln") {
      const n = r.int(2, 5);
      const a = r.int(1, 6);
      f = `\\frac{\\ln(${a === 1 ? "" : a}x^{${n}} + 1)}{\\ln x}`;
      ans = String(n);
      steps = [
        "Arriba y abajo tienden a $+\\infty$. Es $\\frac{\\infty}{\\infty}$.",
        `Derivamos: arriba $\\dfrac{${a * n}x^{${n - 1}}}{${a === 1 ? "" : a}x^{${n}} + 1}$, abajo $\\dfrac{1}{x}$. El cociente es $\\dfrac{${a * n}x^{${n}}}{${a === 1 ? "" : a}x^{${n}} + 1}$.`,
        `Dividiendo arriba y abajo entre $x^{${n}}$ el límite es $${n}$.`,
      ];
      mistakes.push({ answer: String(a * n), feedback: `Revisa el último paso: el $${a}$ aparece arriba y abajo y se cancela.` });
      mistakes.push({ answer: "1", feedback: "No basta con mirar que arriba y abajo hay logaritmos. Deriva y simplifica." });
    } else {
      const n = r.int(1, 3);
      const a = r.int(1, 4);
      f = `\\frac{\\ln x}{${a === 1 ? "" : a}${n === 1 ? "x" : `x^{${n}}`}}`;
      ans = "0";
      steps = [
        "Arriba y abajo tienden a $+\\infty$. Es $\\frac{\\infty}{\\infty}$.",
        `Derivamos: $\\dfrac{1/x}{${a * n}${n === 1 ? "" : pw(n - 1)}} = \\dfrac{1}{${cf(a * n)}${pw(n)}}$.`,
        "Eso tiende a $0$: el logaritmo crece más lento que cualquier potencia.",
      ];
      mistakes.push({ answer: "\\infty", feedback: "El logaritmo crece más lento que cualquier potencia de $x$, por eso el cociente se apaga." });
    }
    return {
      statement: `Calcula $$${lim("+\\infty", f)}$$`,
      parts: [limPart(ans, mistakes)],
      hints: ["Comprueba que es $\\frac{\\infty}{\\infty}$ y deriva arriba y abajo.", "Si después de derivar sigue indeterminado, vuelve a derivar."],
      solution: steps,
    };
  },
};

const dosVeces: ExerciseGen = {
  id: "dos-veces",
  title: "Aplicar la regla dos veces",
  level: 2,
  generate: (r) => {
    const k = r.nz(-3, 3);
    const m = r.int(1, 3);
    const lnFam = r.bool() && k > 0;
    const den = m === 1 ? "x^{2}" : `${m}x^{2}`;
    const f = lnFam
      ? `\\frac{\\ln(1 + ${kx(k)}) - ${kx(k)}}{${den}}`
      : `\\frac{${ekx(k)} - 1 ${k > 0 ? "-" : "+"} ${kx(Math.abs(k))}}{${den}}`;
    const ans = frac(lnFam ? -k * k : k * k, 2 * m);
    const d1 = lnFam ? `\\frac{${k}}{1 + ${kx(k)}} - ${k}` : `${cf(k)}${ekx(k)} ${k > 0 ? "-" : "+"} ${Math.abs(k)}`;
    const d2 = lnFam ? `-\\frac{${k * k}}{(1 + ${kx(k)})^{2}}` : `${cf(k * k)}${ekx(k)}`;
    return {
      statement: `Calcula $$${lim("0", f)}$$`,
      parts: [limPart(ans, [
        { answer: frac(lnFam ? -k * k : k * k, m), feedback: `La segunda derivada de $${den}$ es $${2 * m}$, no $${m}$.` },
        { answer: "0", feedback: "Después de derivar una vez sigue siendo $\\frac{0}{0}$. Hay que derivar otra vez antes de sustituir." },
        { answer: frac(lnFam ? k * k : -k * k, 2 * m), feedback: "Revisa el signo de la segunda derivada del numerador." },
      ])],
      hints: [
        "Al sustituir $x = 0$ sale $\\frac{0}{0}$. Deriva arriba y abajo.",
        "Después de la primera derivada vuelve a sustituir: sigue siendo $\\frac{0}{0}$.",
      ],
      solution: [
        "Al sustituir $x = 0$ arriba y abajo dan $0$.",
        `Primera aplicación: $\\dfrac{${d1}}{${2 * m}x}$. En $x = 0$ sigue siendo $\\frac{0}{0}$.`,
        `Segunda aplicación: $\\dfrac{${d2}}{${2 * m}}$.`,
        `En $x = 0$ queda $${ans}$.`,
      ],
    };
  },
};

const ceroPorInfinito: ExerciseGen = {
  id: "cero-por-infinito",
  title: "Cero por infinito",
  level: 2,
  generate: (r) => {
    const fam = r.pick(["exp", "ln", "pot-ln", "pot-exp"] as const);
    const k = r.int(1, 5);
    const m = r.int(1, 4);
    const mm = m === 1 ? "" : String(m);
    let a: string, f: string, ans: string, steps: string[];
    if (fam === "exp") {
      a = "+\\infty";
      f = `${mm}x\\left(e^{\\frac{${k}}{x}} - 1\\right)`;
      ans = String(m * k);
      steps = [
        "$x \\to +\\infty$ mientras $e^{k/x} - 1 \\to 0$. Es $\\infty \\cdot 0$.",
        `Lo escribimos como cociente: $${mm}\\dfrac{e^{${k}/x} - 1}{1/x}$, que es $\\frac{0}{0}$.`,
        `Derivamos: arriba $e^{${k}/x} \\cdot \\left(-\\frac{${k}}{x^{2}}\\right)$, abajo $-\\frac{1}{x^{2}}$. El cociente queda $${k}e^{${k}/x}$.`,
        `Como $e^{${k}/x} \\to 1$, el límite es $${mm ? `${m} \\cdot ${k} = ` : ""}${m * k}$.`,
      ];
    } else if (fam === "ln") {
      a = "+\\infty";
      f = `${mm}x\\ln\\left(1 + \\frac{${k}}{x}\\right)`;
      ans = String(m * k);
      steps = [
        "$x \\to +\\infty$ mientras $\\ln(1 + k/x) \\to \\ln 1 = 0$. Es $\\infty \\cdot 0$.",
        `Lo escribimos como cociente: $${mm}\\dfrac{\\ln(1 + ${k}/x)}{1/x}$, que es $\\frac{0}{0}$.`,
        `Derivamos: arriba $\\dfrac{-${k}/x^{2}}{1 + ${k}/x}$, abajo $-\\frac{1}{x^{2}}$. El cociente queda $\\dfrac{${k}}{1 + ${k}/x}$.`,
        `Eso tiende a $${k}$, así que el límite es $${m * k}$.`,
      ];
    } else if (fam === "pot-ln") {
      const n = r.int(1, 3);
      a = "0^{+}";
      f = `${mm}${n === 1 ? "x" : `x^{${n}}`} \\ln x`;
      ans = "0";
      steps = [
        `$${pw(n)} \\to 0$ y $\\ln x \\to -\\infty$. Es $0 \\cdot \\infty$.`,
        `Pasamos la potencia abajo: $${mm}\\dfrac{\\ln x}{x^{-${n}}}$, que es $\\frac{\\infty}{\\infty}$.`,
        `Derivamos: $\\dfrac{1/x}{-${n}x^{-${n + 1}}} = -\\dfrac{x^{${n}}}{${n}}$.`,
        "Eso tiende a $0$.",
      ];
    } else {
      const n = r.int(2, 3);
      a = "+\\infty";
      f = `${mm}x^{${n}}e^{-${k === 1 ? "" : k}x}`;
      ans = "0";
      steps = [
        `$x^{${n}} \\to \\infty$ y $e^{-${k === 1 ? "" : k}x} \\to 0$. Es $\\infty \\cdot 0$.`,
        `Escribimos $${mm}\\dfrac{x^{${n}}}{e^{${k === 1 ? "" : k}x}}$, que es $\\frac{\\infty}{\\infty}$.`,
        `Derivando ${n} veces arriba queda una constante y abajo sigue una exponencial que crece sin control.`,
        "El límite es $0$.",
      ];
    }
    return {
      statement: `Calcula $$${lim(a, f)}$$`,
      parts: [limPart(ans, [
        { answer: "0", feedback: "Que un factor tienda a cero no basta: el otro crece sin control. Lleva el producto a un cociente." },
        { answer: String(k), feedback: `No olvides el factor $${m}$ que multiplica.` },
        { answer: "1", feedback: "Revisa la derivada interna al derivar." },
      ])],
      hints: [
        "Un producto $0 \\cdot \\infty$ se convierte en cociente pasando un factor al denominador: $f \\cdot g = \\dfrac{f}{1/g}$.",
        "Deja abajo el factor que sea más fácil de derivar. El logaritmo casi siempre conviene dejarlo arriba.",
      ],
      solution: steps,
    };
  },
};

const restaInfinitos: ExerciseGen = {
  id: "resta-infinitos",
  title: "Infinito menos infinito",
  level: 2,
  generate: (r) => {
    const a = r.int(1, 6);
    const fam = r.pick(["exp", "ln1", "ln0"] as const);
    let p: string, f: string, ans: string, steps: string[];
    if (fam === "exp") {
      p = "0^{+}";
      f = `\\frac{${a}}{x} - \\frac{${a}}{e^{x} - 1}`;
      ans = frac(a, 2);
      steps = [
        "Los dos términos tienden a $+\\infty$. Es $\\infty - \\infty$.",
        `Común denominador: $${a === 1 ? "" : `${a}\\cdot`}\\dfrac{e^{x} - 1 - x}{x(e^{x} - 1)}$, que es $\\frac{0}{0}$.`,
        "Primera derivada: $\\dfrac{e^{x} - 1}{e^{x} - 1 + xe^{x}}$, sigue $\\frac{0}{0}$.",
        "Segunda derivada: $\\dfrac{e^{x}}{2e^{x} + xe^{x}}$, que en $x = 0$ vale $\\frac{1}{2}$.",
        `El límite es $${a} \\cdot \\frac{1}{2} = ${ans}$.`,
      ];
    } else if (fam === "ln1") {
      p = "1^{+}";
      f = `\\frac{${a}}{x - 1} - \\frac{${a}}{\\ln x}`;
      ans = frac(-a, 2);
      steps = [
        "Los dos términos tienden a $+\\infty$. Es $\\infty - \\infty$.",
        `Común denominador: $${a === 1 ? "" : `${a}\\cdot`}\\dfrac{\\ln x - (x - 1)}{(x - 1)\\ln x}$, que es $\\frac{0}{0}$.`,
        "Primera derivada: $\\dfrac{\\frac{1}{x} - 1}{\\ln x + \\frac{x-1}{x}}$. Multiplicando arriba y abajo por $x$: $\\dfrac{1 - x}{x\\ln x + x - 1}$, sigue $\\frac{0}{0}$.",
        "Segunda derivada: $\\dfrac{-1}{\\ln x + 2}$, que en $x = 1$ vale $-\\frac{1}{2}$.",
        `El límite es $${a} \\cdot \\left(-\\frac{1}{2}\\right) = ${ans}$.`,
      ];
    } else {
      p = "0^{+}";
      f = `\\frac{${a}}{\\ln(1 + x)} - \\frac{${a}}{x}`;
      ans = frac(a, 2);
      steps = [
        "Los dos términos tienden a $+\\infty$. Es $\\infty - \\infty$.",
        `Común denominador: $${a === 1 ? "" : `${a}\\cdot`}\\dfrac{x - \\ln(1 + x)}{x\\ln(1 + x)}$, que es $\\frac{0}{0}$.`,
        "Primera derivada: $\\dfrac{1 - \\frac{1}{1+x}}{\\ln(1+x) + \\frac{x}{1+x}}$. Multiplicando por $1 + x$: $\\dfrac{x}{(1+x)\\ln(1+x) + x}$, sigue $\\frac{0}{0}$.",
        "Segunda derivada: $\\dfrac{1}{\\ln(1+x) + 2}$, que en $x = 0$ vale $\\frac{1}{2}$.",
        `El límite es $${a} \\cdot \\frac{1}{2} = ${ans}$.`,
      ];
    }
    return {
      statement: `Calcula $$${lim(p, `\\left(${f}\\right)`)}$$`,
      parts: [limPart(ans, [
        { answer: "0", feedback: "$\\infty - \\infty$ no es cero. Junta las fracciones con común denominador y aplica la regla." },
        { answer: frac(-value(ans) * 2, 2), feedback: "Revisa el signo al juntar las fracciones." },
        { answer: String(a), feedback: "Te faltó el factor $\\frac{1}{2}$ que sale de la segunda derivada." },
      ])],
      hints: [
        "Junta las dos fracciones en una sola con común denominador.",
        "Te quedará $\\frac{0}{0}$. Puede que necesites aplicar la regla dos veces.",
      ],
      solution: steps,
    };
  },
};

const potencia1Inf: ExerciseGen = {
  id: "potencia-1-inf",
  title: "La forma uno elevado a infinito (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const fam = r.pick(["inf", "cero", "uno"] as const);
    let a = r.nz(-3, 3);
    const b = r.nz(-3, 3);
    let p: string, f: string, lnY: string, steps: string[];
    if (fam === "inf") {
      p = "+\\infty";
      f = `\\left(1 ${a > 0 ? "+" : "-"} \\frac{${Math.abs(a)}}{x}\\right)^{${kx(b)}}`;
      lnY = `${kx(b)}\\ln\\left(1 ${a > 0 ? "+" : "-"} \\frac{${Math.abs(a)}}{x}\\right)`;
      steps = [
        `La base tiende a $1$ y el exponente a $${infTex(b)}$. Es $1^{\\infty}$.`,
        `Tomamos $y$ igual a la función: $\\ln y = ${lnY}$, que es de la forma $\\infty \\cdot 0$.`,
        `Como cociente: $\\ln y = ${b}\\cdot\\dfrac{\\ln(1 ${a > 0 ? "+" : "-"} ${Math.abs(a)}/x)}{1/x}$. Al derivar arriba y abajo queda $${b}\\cdot\\dfrac{${a}}{1 ${a > 0 ? "+" : "-"} ${Math.abs(a)}/x} \\to ${a * b}$.`,
      ];
    } else if (fam === "cero") {
      p = "0";
      f = `(1 ${a > 0 ? "+" : "-"} ${kx(Math.abs(a))})^{\\frac{${b}}{x}}`;
      lnY = `\\frac{${b}\\ln(1 ${a > 0 ? "+" : "-"} ${kx(Math.abs(a))})}{x}`;
      steps = [
        "La base tiende a $1$ y el exponente crece sin control. Es $1^{\\infty}$.",
        `Tomamos $y$ igual a la función: $\\ln y = ${lnY}$, que es $\\frac{0}{0}$.`,
        `Derivamos arriba y abajo: $\\dfrac{${b} \\cdot ${a < 0 ? `(${a})` : a}}{1 ${a > 0 ? "+" : "-"} ${kx(Math.abs(a))}} \\to ${a * b}$.`,
      ];
    } else {
      a = 1;
      p = "1";
      f = `x^{\\frac{${b}}{x - 1}}`;
      lnY = `\\frac{${b}\\ln x}{x - 1}`;
      steps = [
        "La base tiende a $1$ y el exponente crece sin control. Es $1^{\\infty}$.",
        `Tomamos $y$ igual a la función: $\\ln y = ${lnY}$, que es $\\frac{0}{0}$.`,
        `Derivamos arriba y abajo: $\\dfrac{${b}/x}{1} \\to ${b}$.`,
      ];
    }
    const L = a * b;
    const ans = L === 1 ? "e" : `e^{${L}}`;
    return {
      statement: `Calcula $$${lim(p, f)}$$`,
      sequential: true,
      parts: [
        choice(FORMS["1i"], [
          [FORMS["0i"], "Mira la función completa: es una potencia con la base cerca de $1$."],
          [FORMS.i0, "La base no crece, se acerca a $1$."],
          [FORMS.none, "Que la base tienda a $1$ no basta para decir que el resultado es $1$, porque el exponente crece sin control."],
        ], "¿De qué forma es la indeterminación?"),
        limPart(String(L), [{ answer: ans, feedback: "Eso es el límite de $y$. Aquí se pide el de $\\ln y$." }], "Si $y$ es la función, calcula el límite de $\\ln y$.", "\\lim \\ln y ="),
        limPart(ans, [
          { answer: String(L), feedback: "Ese es el límite de $\\ln y$. Falta deshacer el logaritmo: el límite de $y$ es $e$ elevado a ese número." },
          { answer: "1", feedback: "$1^{\\infty}$ es indeterminado. La base solo se acerca a $1$, nunca vale exactamente $1$." },
        ], "Calcula el límite pedido.", `${lim(p, "y")} =`),
      ],
      hints: [
        "Llama $y$ a la función y toma logaritmo: el exponente baja multiplicando.",
        "El límite de $\\ln y$ sale con la regla de L'Hôpital.",
        "Al final, el límite de $y$ es $e$ elevado al límite de $\\ln y$.",
      ],
      solution: [...steps, `Por lo tanto $\\lim \\ln y = ${L}$ y el límite pedido es $${ans}$.`],
    };
  },
};

const potencias00: ExerciseGen = {
  id: "potencias-cero-infinito",
  title: "Las formas cero a la cero e infinito a la cero (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const fam = r.pick(["00", "exp", "pot"] as const);
    const a = r.nz(-3, 4);
    const b = r.int(1, 4);
    const k = r.int(2, 4);
    let p: string, f: string, form: FormKey, L: number, steps: string[];
    if (fam === "00") {
      p = "0^{+}";
      f = `x^{\\frac{${a}}{${b} + \\ln x}}`;
      form = "000";
      L = a;
      steps = [
        `La base tiende a $0$ y el exponente también, porque el denominador $${b} + \\ln x \\to -\\infty$. Es $0^{0}$.`,
        `$\\ln y = \\dfrac{${cf(a)}\\ln x}{${b} + \\ln x}$, que es $\\frac{\\infty}{\\infty}$.`,
        `Derivamos arriba y abajo: $\\dfrac{${a}/x}{1/x} = ${a}$.`,
      ];
    } else if (fam === "exp") {
      p = "+\\infty";
      f = `(e^{x} + x)^{\\frac{${a}}{x}}`;
      form = "i0";
      L = a;
      steps = [
        "La base crece sin control y el exponente tiende a $0$. Es $\\infty^{0}$.",
        `$\\ln y = \\dfrac{${cf(a)}\\ln(e^{x} + x)}{x}$, que es $\\frac{\\infty}{\\infty}$.`,
        `Derivamos: $\\dfrac{${a}(e^{x} + 1)}{e^{x} + x}$, otra vez $\\frac{\\infty}{\\infty}$. Una vez más: $\\dfrac{${a}e^{x}}{e^{x} + 1} \\to ${a}$.`,
      ];
    } else {
      p = "+\\infty";
      f = `(1 + x^{${k}})^{\\frac{${a}}{\\ln x}}`;
      form = "i0";
      L = a * k;
      steps = [
        "La base crece sin control y el exponente tiende a $0$. Es $\\infty^{0}$.",
        `$\\ln y = \\dfrac{${cf(a)}\\ln(1 + x^{${k}})}{\\ln x}$, que es $\\frac{\\infty}{\\infty}$.`,
        `Derivamos arriba y abajo: $\\dfrac{${a}\\cdot\\frac{${k}x^{${k - 1}}}{1 + x^{${k}}}}{\\frac{1}{x}} = \\dfrac{${a * k}x^{${k}}}{1 + x^{${k}}} \\to ${a * k}$.`,
      ];
    }
    const ans = L === 1 ? "e" : `e^{${L}}`;
    const wrongForms = (["000", "i0", "1i", "0i"] as FormKey[]).filter((x) => x !== form);
    return {
      statement: `Calcula $$${lim(p, f)}$$`,
      sequential: true,
      parts: [
        choice(FORMS[form], wrongForms.map((w) => [FORMS[w], "Revisa a qué tienden por separado la base y el exponente."] as [Rich, Rich]), "¿De qué forma es la indeterminación?"),
        limPart(String(L), [{ answer: ans, feedback: "Eso es el límite de $y$. Aquí se pide el de $\\ln y$." }], "Si $y$ es la función, calcula el límite de $\\ln y$.", "\\lim \\ln y ="),
        limPart(ans, [
          { answer: String(L), feedback: "Ese es el límite de $\\ln y$. El límite de $y$ es $e$ elevado a ese número." },
          { answer: "1", feedback: "Una potencia con exponente que tiende a cero no siempre da $1$ cuando la base también cambia." },
          { answer: "0", feedback: "Calcula el límite de $\\ln y$ y luego exponencia." },
        ], "Calcula el límite pedido.", `${lim(p, "y")} =`),
      ],
      hints: [
        "Llama $y$ a la función y toma logaritmo. El exponente pasa a multiplicar.",
        "El nuevo límite es un cociente con $\\frac{\\infty}{\\infty}$. Aplica la regla.",
        "No olvides exponenciar al final.",
      ],
      solution: [...steps, `Así $\\lim \\ln y = ${L}$ y el límite pedido es $${ans}$.`],
    };
  },
};

const parcialLimites: ExerciseGen = {
  id: "parcial-limites",
  title: "Tres límites de parcial",
  level: 3,
  exam: true,
  generate: (r) => {
    const m = r.int(1, 2);
    const em = m === 1 ? "e" : `e^{${m}}`;
    const k = r.int(2, 5);
    const a = r.int(1, 5);
    const b = r.int(1, 5);
    const la = lim(em, `\\frac{\\ln x - ${m}}{x - ${em}}`);
    const lb = lim("0", `\\frac{1 - e^{${k}x}}{x}`);
    const lc = lim("+\\infty", `\\frac{${a === 1 ? "" : a}x + \\ln x}{${b === 1 ? "" : b}x - \\ln x}`);
    const ansA = `\\frac{1}{${em}}`;
    const ansC = frac(a, b);
    return {
      statement: "Calcula los siguientes límites. En cada uno revisa primero que haya indeterminación.",
      parts: [
        limPart(ansA, [{ answer: em, feedback: "La derivada de $\\ln x$ es $\\frac{1}{x}$. Evaluada en el punto da el inverso." }], `a) $\\displaystyle ${la}$`),
        limPart(String(-k), [
          { answer: String(k), feedback: "Revisa el signo: el numerador es $1 - e^{kx}$, su derivada es negativa." },
          { answer: "-1", feedback: `Falta la regla de la cadena: $(e^{${k}x})' = ${k}e^{${k}x}$.` },
        ], `b) $\\displaystyle ${lb}$`),
        limPart(ansC, [
          { answer: "1", feedback: "Mandan los términos con $x$, no los logaritmos. Deriva y mira." },
          { answer: "0", feedback: "Arriba y abajo crecen a la misma velocidad. Deriva y compara los coeficientes." },
        ], `c) $\\displaystyle ${lc}$`),
      ],
      hints: [
        `En a), $\\ln ${em} = ${m}$. Es $\\frac{0}{0}$.`,
        "En b), al sustituir $x = 0$ arriba queda $1 - 1 = 0$.",
        "En c), al derivar aparece $\\frac{1}{x}$, que tiende a $0$.",
      ],
      solution: [
        `a) Es $\\frac{0}{0}$. Derivando: $\\dfrac{1/x}{1}$, que en $x = ${em}$ vale $${ansA}$.`,
        `b) Es $\\frac{0}{0}$. Derivando: $\\dfrac{-${k}e^{${k}x}}{1}$, que en $x = 0$ vale $${-k}$.`,
        `c) Es $\\frac{\\infty}{\\infty}$. Derivando: $\\dfrac{${a} + \\frac{1}{x}}{${b} - \\frac{1}{x}} \\to ${ansC}$.`,
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("lhopital"),
  objectives: [
    "Reconocer cuándo un límite es de la forma $\\frac{0}{0}$ o $\\frac{\\infty}{\\infty}$ y aplicar la regla de L'Hôpital.",
    "Aplicar la regla varias veces seguidas, revisando la indeterminación en cada paso.",
    "Llevar las formas $0 \\cdot \\infty$ e $\\infty - \\infty$ a un cociente.",
    "Resolver las potencias indeterminadas $1^{\\infty}$, $0^{0}$ e $\\infty^{0}$ con logaritmos.",
    "Evitar los errores típicos: aplicar la regla sin indeterminación, usar la regla del cociente u olvidar exponenciar.",
  ],
  sections: [
    {
      id: "la-regla",
      title: "La idea y la regla",
      blocks: [
        {
          type: "text",
          md: "En los temas de límites resolviste indeterminaciones $\\frac{0}{0}$ factorizando o racionalizando. Hay límites donde ese truco no sirve, como $\\lim_{x \\to 0} \\frac{1 - e^{2x}}{x}$, porque no hay nada que factorizar. La regla de L'Hôpital resuelve estos casos con derivadas.\n\nLa idea es sencilla. Si $f(a) = 0$ y $g(a) = 0$, cerca de $a$ cada función se parece a su recta tangente: $f(x) \\approx f'(a)(x - a)$ y $g(x) \\approx g'(a)(x - a)$. Al dividir, el factor $(x - a)$ se cancela y queda $\\frac{f'(a)}{g'(a)}$. El cociente de las funciones se comporta como el cociente de sus pendientes.",
        },
        {
          type: "definition",
          title: "Regla de L'Hôpital",
          md: "Si $\\lim_{x \\to c} \\frac{f(x)}{g(x)}$ es una indeterminación de la forma $\\frac{0}{0}$ o $\\frac{\\infty}{\\infty}$, $f$ y $g$ son derivables cerca de $c$ con $g'(x) \\neq 0$, y el límite de $\\frac{f'(x)}{g'(x)}$ existe, entonces\n\n$$\\lim_{x \\to c} \\frac{f(x)}{g(x)} = \\lim_{x \\to c} \\frac{f'(x)}{g'(x)}$$\n\nLa regla vale igual para límites laterales y cuando $x \\to \\pm\\infty$. También se puede aplicar varias veces seguidas.",
        },
        {
          type: "example",
          title: "Un límite de parcial",
          problem: "Calcula $\\lim_{x \\to e} \\dfrac{\\ln x - 1}{x - e}$.",
          steps: [
            "Sustituimos $x = e$. Arriba queda $\\ln e - 1 = 0$ y abajo $e - e = 0$. Es $\\frac{0}{0}$, así que la regla aplica.",
            "Derivamos por separado. La derivada de $\\ln x - 1$ es $\\frac{1}{x}$ y la de $x - e$ es $1$.",
            "$\\lim_{x \\to e} \\dfrac{1/x}{1} = \\dfrac{1}{e}$.",
          ],
          answer: "$\\dfrac{1}{e}$",
        },
        {
          type: "example",
          title: "Exponencial cerca de cero",
          problem: "Calcula $\\lim_{x \\to 0} \\dfrac{1 - e^{2x}}{x}$.",
          steps: [
            "Al sustituir $x = 0$: arriba $1 - e^{0} = 0$ y abajo $0$. Es $\\frac{0}{0}$.",
            "La derivada de $1 - e^{2x}$ es $-2e^{2x}$, por la regla de la cadena. La derivada de $x$ es $1$.",
            "$\\lim_{x \\to 0} \\dfrac{-2e^{2x}}{1} = -2$.",
          ],
          answer: "$-2$",
        },
        {
          type: "widget",
          widget: { kind: "limit", fn: "\\frac{1 - e^{2x}}{x}", a: 0, x: [-2, 2], y: [-8, 2] },
          caption: "La función no existe en $x = 0$, pero sus valores se acercan a $-2$ por los dos lados.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Primero comprueba la indeterminación",
          md: "La regla solo vale para $\\frac{0}{0}$ y $\\frac{\\infty}{\\infty}$. En $\\lim_{x \\to 0} \\frac{x + 1}{x + 2}$ basta sustituir y da $\\frac{1}{2}$. Si derivaras sin mirar obtendrías $\\frac{1}{1} = 1$, que está mal.",
        },
        {
          type: "note",
          tone: "warning",
          title: "No es la regla del cociente",
          md: "Se deriva el numerador por un lado y el denominador por otro. La fórmula $\\frac{f'g - fg'}{g^{2}}$ sirve para derivar un cociente, no para calcular su límite con L'Hôpital.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $\\lim_{x \\to 1} \\dfrac{\\ln x}{x - 1}$.",
            parts: [limPart("1", [{ answer: "0", feedback: "Sale $\\frac{0}{0}$, que no es cero. Deriva arriba y abajo." }])],
            solution: ["Es $\\frac{0}{0}$. Derivando: $\\dfrac{1/x}{1}$, que en $x = 1$ vale $1$."],
          },
        },
      ],
    },
    {
      id: "infinito",
      title: "Infinito entre infinito",
      blocks: [
        {
          type: "text",
          md: "La regla también resuelve cocientes donde arriba y abajo crecen sin control. En la práctica sirve para comparar qué tan rápido crece cada función.",
        },
        {
          type: "example",
          title: "Potencia contra exponencial",
          problem: "Calcula $\\lim_{x \\to +\\infty} \\dfrac{x^{2}}{e^{x}}$.",
          steps: [
            "Arriba y abajo tienden a $+\\infty$. Es $\\frac{\\infty}{\\infty}$.",
            "Derivamos: $\\dfrac{2x}{e^{x}}$. Sigue siendo $\\frac{\\infty}{\\infty}$.",
            "Derivamos otra vez: $\\dfrac{2}{e^{x}}$. Arriba una constante y abajo algo que crece sin control.",
          ],
          answer: "$0$",
        },
        {
          type: "example",
          title: "Logaritmo contra potencia",
          problem: "Calcula $\\lim_{x \\to +\\infty} \\dfrac{\\ln x}{x}$.",
          steps: [
            "Arriba y abajo tienden a $+\\infty$.",
            "Derivamos: $\\dfrac{1/x}{1} = \\dfrac{1}{x}$, que tiende a $0$.",
          ],
          answer: "$0$",
        },
        {
          type: "text",
          md: "Cuando $x \\to +\\infty$, de la más lenta a la más rápida van $\\ln x$, después $x^{p}$ con $p > 0$ y por último $e^{kx}$ con $k > 0$. Cada una le gana a las anteriores, así que el cociente de una lenta entre una rápida tiende a $0$.",
        },
        {
          type: "graph",
          spec: {
            x: [0, 8],
            y: [-3, 20],
            step: 2,
            curves: [
              { fn: "\\ln x", domain: [0.05, 8], color: "green", label: "ln x" },
              { fn: "x^{2}", color: "blue", label: "x²" },
              { fn: "e^{x}", color: "red", label: "eˣ" },
            ],
          },
          caption: "Cerca de $0$ las tres curvas van parejas, pero $e^{x}$ se dispara antes que $x^{2}$ y $\\ln x$ casi no sube.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Interés compuesto contra crecimiento polinómico",
          md: "Un capital con interés compuesto continuo crece como $Ce^{rt}$. Cualquier cantidad que crezca como un polinomio en $t$ termina quedándose atrás. Por ejemplo, $\\lim_{t \\to \\infty} \\frac{t^{3}}{e^{0{,}05t}} = 0$, aunque al principio $t^{3}$ sea mucho mayor.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $\\lim_{x \\to +\\infty} \\dfrac{\\ln x}{x^{2}}$.",
            parts: [limPart("0", [{ answer: "\\infty", feedback: "El logaritmo crece más lento que cualquier potencia." }])],
            solution: ["Es $\\frac{\\infty}{\\infty}$. Derivando: $\\dfrac{1/x}{2x} = \\dfrac{1}{2x^{2}} \\to 0$."],
          },
        },
      ],
    },
    {
      id: "varias-veces",
      title: "Aplicar la regla varias veces",
      blocks: [
        {
          type: "text",
          md: "Después de derivar una vez puede que el nuevo cociente siga siendo $\\frac{0}{0}$ o $\\frac{\\infty}{\\infty}$. En ese caso se aplica la regla otra vez. Antes de cada derivación hay que sustituir y comprobar que todavía hay indeterminación.",
        },
        {
          type: "example",
          title: "Dos derivaciones",
          problem: "Calcula $\\lim_{x \\to 0} \\dfrac{e^{x} - 1 - x}{x^{2}}$.",
          steps: [
            "En $x = 0$: arriba $1 - 1 - 0 = 0$, abajo $0$. Es $\\frac{0}{0}$.",
            "Primera derivación: $\\dfrac{e^{x} - 1}{2x}$. En $x = 0$ sigue siendo $\\frac{0}{0}$.",
            "Segunda derivación: $\\dfrac{e^{x}}{2}$. En $x = 0$ vale $\\frac{1}{2}$.",
          ],
          answer: "$\\dfrac{1}{2}$",
        },
        {
          type: "example",
          title: "Un polinomio con raíz doble",
          problem: "Calcula $\\lim_{x \\to 1} \\dfrac{x^{3} - 3x + 2}{x^{2} - 2x + 1}$.",
          steps: [
            "En $x = 1$: arriba $1 - 3 + 2 = 0$, abajo $1 - 2 + 1 = 0$.",
            "Primera derivación: $\\dfrac{3x^{2} - 3}{2x - 2}$. En $x = 1$ sigue $\\frac{0}{0}$.",
            "Segunda derivación: $\\dfrac{6x}{2}$, que en $x = 1$ vale $3$.",
          ],
          answer: "$3$",
        },
        {
          type: "note",
          tone: "warning",
          title: "Revisa antes de cada derivación",
          md: "En $\\lim_{x \\to 0} \\frac{e^{x} - 1}{x^{2} + x}$, la primera derivación da $\\frac{e^{x}}{2x + 1}$, que en $x = 0$ vale $1$. Ahí se termina. Si derivaras otra vez sin revisar obtendrías $\\frac{e^{x}}{2} \\to \\frac{1}{2}$, que es falso.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $\\lim_{x \\to 0} \\dfrac{e^{2x} - 1 - 2x}{x^{2}}$.",
            parts: [limPart("2", [{ answer: "4", feedback: "La segunda derivada de $x^{2}$ es $2$. Divide entre ese $2$." }])],
            solution: [
              "Primera derivación: $\\dfrac{2e^{2x} - 2}{2x}$, sigue $\\frac{0}{0}$.",
              "Segunda derivación: $\\dfrac{4e^{2x}}{2}$, que en $x = 0$ vale $2$.",
            ],
          },
        },
      ],
    },
    {
      id: "producto-resta",
      title: "Productos y restas: llevarlos a cociente",
      blocks: [
        {
          type: "text",
          md: "La regla solo trabaja con cocientes. Las formas $0 \\cdot \\infty$ e $\\infty - \\infty$ hay que reescribirlas primero.\n\n- **Producto** $0 \\cdot \\infty$: un factor pasa al denominador invertido, $f \\cdot g = \\dfrac{f}{1/g}$.\n- **Resta** $\\infty - \\infty$: se juntan las fracciones con común denominador.",
        },
        {
          type: "example",
          title: "Cero por infinito",
          problem: "Calcula $\\lim_{x \\to 0^{+}} x \\ln x$.",
          steps: [
            "$x \\to 0$ y $\\ln x \\to -\\infty$. Es $0 \\cdot \\infty$.",
            "Pasamos $x$ al denominador como $\\frac{1}{x}$: $\\dfrac{\\ln x}{1/x}$, que es $\\frac{\\infty}{\\infty}$.",
            "Derivamos: $\\dfrac{1/x}{-1/x^{2}} = -x$, que tiende a $0$.",
          ],
          answer: "$0$",
        },
        {
          type: "note",
          tone: "tip",
          title: "Qué factor bajar",
          md: "Baja el factor que tenga la derivada más simple. Si hubieras escrito $x \\ln x = \\frac{x}{1/\\ln x}$, la derivada de abajo sería más complicada que la de arriba. El logaritmo casi siempre conviene dejarlo arriba.",
        },
        {
          type: "example",
          title: "Infinito menos infinito",
          problem: "Calcula $\\lim_{x \\to 1^{+}} \\left(\\dfrac{1}{\\ln x} - \\dfrac{1}{x - 1}\\right)$.",
          steps: [
            "Los dos términos tienden a $+\\infty$. Es $\\infty - \\infty$.",
            "Común denominador: $\\dfrac{x - 1 - \\ln x}{(x - 1)\\ln x}$, que es $\\frac{0}{0}$.",
            "Primera derivación: $\\dfrac{1 - \\frac{1}{x}}{\\ln x + \\frac{x - 1}{x}}$. Multiplicando arriba y abajo por $x$ queda $\\dfrac{x - 1}{x\\ln x + x - 1}$, todavía $\\frac{0}{0}$.",
            "Segunda derivación: $\\dfrac{1}{\\ln x + 1 + 1}$, que en $x = 1$ vale $\\frac{1}{2}$.",
          ],
          answer: "$\\dfrac{1}{2}$",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $\\lim_{x \\to +\\infty} x\\left(e^{\\frac{1}{x}} - 1\\right)$.",
            parts: [limPart("1", [{ answer: "0", feedback: "Un factor tiende a $0$ pero el otro crece sin control. Escríbelo como cociente." }])],
            solution: [
              "Escribimos $\\dfrac{e^{1/x} - 1}{1/x}$, que es $\\frac{0}{0}$.",
              "Derivando: $\\dfrac{e^{1/x}\\cdot(-1/x^{2})}{-1/x^{2}} = e^{1/x} \\to 1$.",
            ],
          },
        },
      ],
    },
    {
      id: "potencias",
      title: "Potencias indeterminadas",
      blocks: [
        {
          type: "text",
          md: "Cuando la base y el exponente cambian a la vez aparecen tres indeterminaciones nuevas: $1^{\\infty}$, $0^{0}$ e $\\infty^{0}$. El truco es bajar el exponente con un logaritmo.",
        },
        {
          type: "definition",
          title: "Método del logaritmo",
          md: "Para calcular $L = \\lim f(x)^{g(x)}$:\n\n- Llama $y = f(x)^{g(x)}$ y toma logaritmo: $\\ln y = g(x)\\ln f(x)$.\n- Calcula $\\lim \\ln y$. Suele ser $0 \\cdot \\infty$, que se lleva a cociente y se resuelve con L'Hôpital.\n- Si $\\lim \\ln y = M$, entonces $L = e^{M}$.",
        },
        {
          type: "example",
          title: "Cero a la cero",
          problem: "Calcula $\\lim_{x \\to 0^{+}} x^{x}$.",
          steps: [
            "La base y el exponente tienden a $0$. Es $0^{0}$.",
            "$\\ln y = x \\ln x$, y ya vimos que $\\lim_{x \\to 0^{+}} x\\ln x = 0$.",
            "Entonces $\\lim y = e^{0} = 1$.",
          ],
          answer: "$1$",
        },
        {
          type: "example",
          title: "Uno elevado a infinito",
          problem: "Calcula $\\lim_{x \\to +\\infty} \\left(1 + \\dfrac{3}{x}\\right)^{x}$.",
          steps: [
            "La base tiende a $1$ y el exponente a $+\\infty$. Es $1^{\\infty}$.",
            "$\\ln y = x\\ln\\left(1 + \\frac{3}{x}\\right) = \\dfrac{\\ln(1 + 3/x)}{1/x}$, que es $\\frac{0}{0}$.",
            "Derivamos arriba y abajo: $\\dfrac{\\frac{-3/x^{2}}{1 + 3/x}}{-1/x^{2}} = \\dfrac{3}{1 + 3/x} \\to 3$.",
            "Entonces $\\lim y = e^{3}$.",
          ],
          answer: "$e^{3}$",
        },
        {
          type: "note",
          tone: "econ",
          title: "De aquí sale el interés continuo",
          md: "Un capital $C$ al $r$ anual capitalizado $n$ veces al año vale $C\\left(1 + \\frac{r}{n}\\right)^{nt}$ después de $t$ años. Si $n \\to \\infty$ es una forma $1^{\\infty}$, y con el método del logaritmo sale $Ce^{rt}$, la fórmula del interés compuesto continuo.",
        },
        {
          type: "note",
          tone: "warning",
          title: "No olvides exponenciar",
          md: "El error más común es calcular $\\lim \\ln y$ y dar ese número como respuesta. Lo que pide el ejercicio es $\\lim y$, que es $e$ elevado a ese número.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $\\lim_{x \\to +\\infty} x^{\\frac{1}{x}}$.",
            parts: [limPart("1", [{ answer: "0", feedback: "Ese es el límite de $\\ln y$. Exponencia: $e^{0} = 1$." }])],
            solution: [
              "$\\ln y = \\dfrac{\\ln x}{x}$, que tiende a $0$.",
              "Entonces $\\lim y = e^{0} = 1$.",
            ],
          },
        },
      ],
    },
    {
      id: "resumen",
      title: "Resumen y errores típicos",
      blocks: [
        {
          type: "table",
          headers: ["Forma", "Qué hacer"],
          rows: [
            ["$\\frac{0}{0}$, $\\frac{\\infty}{\\infty}$", "Aplicar la regla directamente"],
            ["$0 \\cdot \\infty$", "Pasar un factor al denominador: $f \\cdot g = \\frac{f}{1/g}$"],
            ["$\\infty - \\infty$", "Común denominador, o sacar factor común"],
            ["$1^{\\infty}$, $0^{0}$, $\\infty^{0}$", "Tomar logaritmo, resolver $\\lim \\ln y$ y exponenciar"],
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "Los errores que más se repiten",
          md: "- Aplicar la regla cuando no hay indeterminación.\n- Usar la regla del cociente en vez de derivar arriba y abajo por separado.\n- Seguir derivando después de que la indeterminación desapareció.\n- Dar el límite de $\\ln y$ como respuesta final.\n- Pensar que $1^{\\infty} = 1$. La base solo se acerca a $1$, y el exponente enorme puede cambiarlo todo.",
        },
        {
          type: "note",
          tone: "idea",
          title: "Cuando la regla no dice nada",
          md: "La regla exige que exista el límite de $\\frac{f'}{g'}$. Si ese límite no existe, la regla no permite concluir nada, y hay que buscar otro camino, como dividir entre la potencia mayor.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Es cierto que $\\lim_{x \\to 2} \\dfrac{x^{2} + 1}{x + 3} = \\lim_{x \\to 2} \\dfrac{2x}{1} = 4$?",
            parts: [trueFalse(false, "Al sustituir sale $\\frac{5}{5} = 1$, un número. No había indeterminación y la regla no aplica.")],
            solution: ["Por sustitución directa el límite es $\\frac{5}{5} = 1$. La regla de L'Hôpital no se podía usar."],
          },
        },
      ],
    },
  ],
  exercises: [
    identificarForma,
    potenciaCociente,
    expSobreX,
    lnPunto,
    encuentraError,
    infinitoInfinito,
    dosVeces,
    ceroPorInfinito,
    restaInfinitos,
    potencia1Inf,
    potencias00,
    parcialLimites,
  ],
};

export default topic;
