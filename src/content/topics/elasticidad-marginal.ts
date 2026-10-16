import { meta } from "../catalog";
import { choice } from "../helpers";
import type { ExerciseGen, Part, Rich, Topic } from "../types";
import { coef, fmt, frac, num, terms } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

/** Polinomio con coeficientes decimales escritos con coma: 0,1q^2 + 5q + 200. */
function polyD(c: number[], v = "x"): string {
  const deg = c.length - 1;
  const out: string[] = [];
  c.forEach((k, i) => {
    if (k === 0) return;
    const pw = deg - i;
    const abs = Math.abs(k);
    const cs = num(abs);
    const lit = pw === 0 ? "" : pw === 1 ? v : `${v}^{${pw}}`;
    const body = pw === 0 ? cs : `${abs === 1 ? "" : cs}${lit}`;
    out.push(out.length === 0 ? (k < 0 ? `-${body}` : body) : k < 0 ? `- ${body}` : `+ ${body}`);
  });
  return out.length ? out.join(" ") : "0";
}

function dpoly(c: number[]): number[] {
  const deg = c.length - 1;
  return c.slice(0, -1).map((k, i) => k * (deg - i));
}

function evalPoly(c: number[], x: number): number {
  return c.reduce((acc, k) => acc * x + k, 0);
}

type Clase = "elastica" | "inelastica" | "unitaria";

function clasifica(E: number): Clase {
  const a = Math.abs(E);
  if (Math.abs(a - 1) < 1e-9) return "unitaria";
  return a > 1 ? "elastica" : "inelastica";
}

const CLASES: Record<Clase, { label: string; why: string }> = {
  elastica: { label: "Elástica", why: "Es elástica cuando $|E| > 1$: la cantidad reacciona más que proporcionalmente al precio." },
  inelastica: { label: "Inelástica", why: "Es inelástica cuando $|E| < 1$: la cantidad reacciona menos que proporcionalmente al precio." },
  unitaria: { label: "De elasticidad unitaria", why: "Es unitaria cuando $|E| = 1$: precio y cantidad cambian en la misma proporción." },
};

/** Pregunta de clasificación con retroalimentación para cada opción errada. */
function clasePart(E: number, prompt?: Rich): Part {
  const ok = clasifica(E);
  const wrong = (Object.keys(CLASES) as Clase[]).filter((k) => k !== ok).map((k) => [CLASES[k].label, `${CLASES[k].why} Aquí $|E| = ${fmt(Math.abs(E))}$.`] as [Rich, Rich]);
  return choice(CLASES[ok].label, wrong, prompt);
}

/** Número decimal o fracción limpia como respuesta. */
function ans(n: number): string {
  const r = Math.round(n * 1e6) / 1e6;
  return Number.isInteger(r * 1000) ? String(r) : fmt(r);
}

/* ----------------------------------- ejercicios ----------------------------------- */

const costoMarginal: ExerciseGen = {
  id: "costo-marginal",
  title: "Costo marginal",
  level: 1,
  generate: (r) => {
    const a = r.pick([0.5, 1, 2, 3]);
    const b = r.int(2, 20);
    const F = r.pick([50, 100, 200, 500, 1000]);
    const c = [a, b, F];
    const q0 = r.pick([5, 10, 20, 25, 30, 40]);
    const cm = evalPoly(dpoly(c), q0);
    return {
      statement: `El costo total, en dólares, de producir $q$ unidades es $C(q) = ${polyD(c, "q")}$. Calcula el costo marginal cuando se producen ${q0} unidades.`,
      parts: [
        {
          kind: "expr",
          before: `C'(${q0}) =`,
          answer: String(cm),
          mistakes: [
            { answer: String(evalPoly(c, q0)), feedback: "Ese es el costo total $C(" + q0 + ")$. El costo marginal es la derivada." },
            ...(Math.abs(evalPoly(c, q0) / q0 - cm) > 1e-9
              ? [{ answer: fmt(evalPoly(c, q0) / q0), feedback: "Ese es el costo promedio $C(q)/q$. El marginal es $C'(q)$." }]
              : []),
          ],
        },
      ],
      hints: ["El costo marginal es la derivada del costo total: $C'(q)$.", "El costo fijo es una constante, así que no aparece en la derivada."],
      solution: [
        `$C'(q) = ${polyD(dpoly(c), "q")}$.`,
        `$C'(${q0}) = ${cm}$. Producir la unidad número ${q0 + 1} cuesta aproximadamente ${num(cm)} dólares.`,
      ],
    };
  },
};

const ingresoMarginal: ExerciseGen = {
  id: "ingreso-marginal",
  title: "Ingreso marginal",
  level: 1,
  generate: (r) => {
    const b = r.pick([1, 2, 3, 4, 5]);
    const a = r.pick([60, 80, 100, 120, 150, 200]);
    const qmax = a / b;
    const q0 = r.int(2, Math.floor(qmax / 2) + 3);
    const im = a - 2 * b * q0;
    const price = a - b * q0;
    return {
      statement: `Una empresa vende $q$ unidades a un precio $p = ${a} - ${coef(b, "q")}$ dólares por unidad, así que su ingreso es $I(q) = q(${a} - ${coef(b, "q")})$. Calcula el ingreso marginal en $q = ${q0}$.`,
      parts: [
        {
          kind: "expr",
          before: `I'(${q0}) =`,
          answer: String(im),
          mistakes: [
            { answer: String(price), feedback: "Ese es el precio de venta en ese nivel. El ingreso marginal es menor que el precio porque para vender una unidad más hay que bajar el precio de todas." },
            { answer: String(q0 * price), feedback: "Ese es el ingreso total. El marginal es la derivada $I'(q)$." },
          ],
        },
      ],
      hints: [`Desarrolla: $I(q) = ${a}q - ${coef(b, "q^{2}")}$.`, "Deriva y sustituye $q$."],
      solution: [
        `$I(q) = ${a}q - ${coef(b, "q^{2}")}$, así que $I'(q) = ${a} - ${coef(2 * b, "q")}$.`,
        `$I'(${q0}) = ${a} - ${2 * b * q0} = ${im}$.`,
        im >= 0
          ? `Vender una unidad más aumenta el ingreso en unos ${im} dólares.`
          : `Es negativo: vender una unidad más, bajando el precio, reduce el ingreso en unos ${-im} dólares.`,
      ],
    };
  },
};

const elasticidadPotencia: ExerciseGen = {
  id: "elasticidad-potencia",
  title: "Elasticidad de una potencia",
  level: 1,
  generate: (r) => {
    const k = r.int(2, 9);
    const kind = r.pick(["pos", "neg", "root"] as const);
    let fTex: string, n: number, nTex: string, dTex: string;
    if (kind === "pos") {
      n = r.int(2, 5);
      fTex = `${k}x^{${n}}`;
      nTex = String(n);
      dTex = `${k * n}x^{${n - 1}}`.replace("x^{1}", "x");
    } else if (kind === "neg") {
      n = -r.int(1, 3);
      fTex = n === -1 ? `\\frac{${k}}{x}` : `\\frac{${k}}{x^{${-n}}}`;
      nTex = String(n);
      dTex = `-\\frac{${-k * n}}{x^{${1 - n}}}`;
    } else {
      n = 0.5;
      fTex = `${k}\\sqrt{x}`;
      nTex = "\\frac{1}{2}";
      dTex = k % 2 === 0 ? (k === 2 ? "\\frac{1}{\\sqrt{x}}" : `\\frac{${k / 2}}{\\sqrt{x}}`) : `\\frac{${k}}{2\\sqrt{x}}`;
    }
    const x0 = kind === "root" ? r.pick([4, 9, 16, 25]) : r.int(1, 6);
    const fp0 = kind === "root" ? k / (2 * Math.sqrt(x0)) : k * n * x0 ** (n - 1);
    return {
      statement: `Calcula la elasticidad de $f(x) = ${fTex}$ en $x = ${x0}$.`,
      parts: [
        {
          kind: "expr",
          before: `E_f(${x0}) =`,
          answer: nTex,
          mistakes: Math.abs(fp0 - n) > 1e-9 ? [{ answer: fmt(Math.round(fp0 * 1e9) / 1e9), feedback: "Ese es $f'(" + x0 + ")$. La elasticidad multiplica la derivada por $\\frac{x}{f(x)}$." }] : [],
        },
      ],
      hints: ["$E_f(x) = \\dfrac{x}{f(x)}\\,f'(x)$.", "Haz la cuenta con $x$ general antes de sustituir. Fíjate qué se simplifica."],
      solution: [
        `$f'(x) = ${dTex}$.`,
        `$E_f(x) = \\dfrac{x}{${fTex}}\\cdot ${dTex.startsWith("-") ? `\\left(${dTex}\\right)` : dTex} = ${nTex}$, porque las potencias de $x$ se cancelan.`,
        `Así que $E_f(${x0}) = ${nTex}$. En una función $kx^{n}$ la elasticidad vale $n$ en todos los puntos.`,
      ],
    };
  },
};

const clasificar: ExerciseGen = {
  id: "clasificar",
  title: "Elástica, inelástica o unitaria",
  level: 1,
  generate: (r) => {
    const E = r.pick([-0.4, -2.5, -1, -1.2, -0.8, -3, -0.25, -1.5, -0.6]);
    const pct = r.pick([1, 2, 5, 10]);
    const cambio = Math.abs(E) * pct;
    return {
      statement: `En cierto precio, la elasticidad precio de la demanda de un bien es $E = ${num(E)}$. ¿Cómo es la demanda en ese precio?`,
      parts: [clasePart(E)],
      hints: ["Compara el valor absoluto $|E|$ con $1$."],
      solution: [
        `$|E| = ${num(Math.abs(E))}$. ${CLASES[clasifica(E)].why}`,
        `Interpretación: si el precio sube ${pct} %, la cantidad demandada baja aproximadamente ${num(cambio)} %.`,
      ],
    };
  },
};

const marginalReal: ExerciseGen = {
  id: "marginal-real",
  title: "Costo marginal frente al costo real de una unidad más",
  level: 2,
  generate: (r) => {
    const a = r.pick([0.1, 0.2, 0.5, 1]);
    const b = r.int(2, 15);
    const F = r.pick([100, 200, 300, 500]);
    const c = [a, b, F];
    const q0 = r.pick([10, 20, 30, 40, 50]);
    const cm = Math.round(evalPoly(dpoly(c), q0) * 1e6) / 1e6;
    const real = Math.round((evalPoly(c, q0 + 1) - evalPoly(c, q0)) * 1e6) / 1e6;
    return {
      statement: `El costo total, en dólares, es $C(q) = ${polyD(c, "q")}$. Compara el costo marginal en $q = ${q0}$ con el costo real de producir la unidad ${q0 + 1}.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Costo marginal.", before: `C'(${q0}) =`, answer: ans(cm) },
        {
          kind: "expr",
          prompt: `Costo real de la unidad ${q0 + 1}.`,
          before: `C(${q0 + 1}) - C(${q0}) =`,
          answer: ans(real),
          mistakes: [{ answer: ans(cm), feedback: "Ese es el costo marginal, que es una aproximación. Aquí te piden la diferencia exacta entre los dos costos totales." }],
        },
      ],
      hints: ["El costo marginal es $C'(q)$.", `El costo real de la unidad ${q0 + 1} es $C(${q0 + 1}) - C(${q0})$. El costo fijo se cancela en la resta.`],
      solution: [
        `$C'(q) = ${polyD(dpoly(c), "q")}$, así que $C'(${q0}) = ${num(cm)}$.`,
        `$C(${q0 + 1}) - C(${q0}) = ${num(evalPoly(c, q0 + 1))} - ${num(evalPoly(c, q0))} = ${num(real)}$.`,
        `La diferencia es solo $${num(Math.abs(real - cm))}$. Por eso el costo marginal se usa como el costo de una unidad adicional.`,
      ],
    };
  },
};

const utilidadMarginal: ExerciseGen = {
  id: "utilidad-marginal",
  title: "Utilidad marginal",
  level: 2,
  generate: (r) => {
    const b = r.pick([1, 2, 3, 5]);
    const qs = r.int(5, 30);
    const c = r.int(5, 40);
    const a = c + 2 * b * qs;
    const F = r.pick([100, 200, 500, 800]);
    let q0: number;
    do q0 = r.int(2, 2 * qs); while (q0 === qs);
    const um = a - c - 2 * b * q0;
    const U = [-b, a - c, -F];
    return {
      statement: `La demanda de un producto es $p = ${a} - ${coef(b, "q")}$ y el costo total es $C(q) = ${c}q + ${F}$, todo en dólares.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: `Calcula la utilidad marginal en $q = ${q0}$.`, before: `U'(${q0}) =`, answer: String(um) },
        { kind: "expr", prompt: "¿Para qué cantidad la utilidad marginal vale cero?", before: "q =", answer: String(qs) },
      ],
      hints: [
        "La utilidad es ingreso menos costo: $U(q) = p\\cdot q - C(q)$.",
        `$U(q) = q(${a} - ${coef(b, "q")}) - (${c}q + ${F})$. Desarrolla antes de derivar.`,
      ],
      solution: [
        `$U(q) = ${polyD(U, "q")}$.`,
        `$U'(q) = ${polyD(dpoly(U), "q")}$, así que $U'(${q0}) = ${um}$. ${um > 0 ? "Producir una unidad más aumenta la utilidad." : "Producir una unidad más reduce la utilidad."}`,
        `$U'(q) = 0$ cuando $${polyD(dpoly(U), "q")} = 0$, es decir, $q = ${qs}$. Ahí el ingreso marginal y el costo marginal son iguales.`,
      ],
    };
  },
};

const costoPromedio: ExerciseGen = {
  id: "costo-promedio",
  title: "Costo promedio y su derivada",
  level: 2,
  generate: (r) => {
    const a = r.pick([1, 2, 3]);
    const s = r.pick([5, 10, 20]);
    const F = a * s * s;
    const b = r.int(2, 12);
    let q0: number;
    do q0 = r.pick([2, 4, 5, 8, 10, 20, 25, 40]); while (q0 === s);
    const dAvg = a - F / (q0 * q0);
    return {
      statement: `El costo total es $C(q) = ${polyD([a, b, F], "q")}$. Sea $\\overline{C}(q) = \\dfrac{C(q)}{q}$ el costo promedio.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: `Calcula la derivada del costo promedio en $q = ${q0}$.`, before: `\\overline{C}'(${q0}) =`, answer: frac(a * q0 * q0 - F, q0 * q0) },
        { kind: "expr", prompt: "¿En qué cantidad el costo promedio deja de bajar y empieza a subir?", before: "q =", answer: String(s) },
        { kind: "expr", prompt: "Comprueba: ¿cuánto vale el costo marginal en esa cantidad?", before: `C'(${s}) =`, answer: String(2 * a * s + b) },
      ],
      hints: [
        `Divide término a término: $\\overline{C}(q) = ${coef(a, "q")} + ${b} + \\dfrac{${F}}{q}$.`,
        "La derivada de $\\dfrac{k}{q}$ es $-\\dfrac{k}{q^{2}}$.",
        "El costo promedio deja de bajar donde su derivada vale cero.",
      ],
      solution: [
        `$\\overline{C}(q) = ${coef(a, "q")} + ${b} + \\dfrac{${F}}{q}$, así que $\\overline{C}'(q) = ${a} - \\dfrac{${F}}{q^{2}}$.`,
        `$\\overline{C}'(${q0}) = ${a} - \\dfrac{${F}}{${q0 * q0}} = ${frac(a * q0 * q0 - F, q0 * q0)}$. ${dAvg < 0 ? "Es negativa: el costo promedio todavía baja." : "Es positiva: el costo promedio ya sube."}`,
        `$\\overline{C}'(q) = 0$ da $q^{2} = ${s * s}$, es decir, $q = ${s}$.`,
        `$C'(q) = ${polyD([2 * a, b], "q")}$, así que $C'(${s}) = ${2 * a * s + b}$, y $\\overline{C}(${s}) = ${a * s} + ${b} + ${F / s} = ${2 * a * s + b}$. En el mínimo del costo promedio, el marginal y el promedio coinciden.`,
      ],
    };
  },
};

const elasticidadLineal: ExerciseGen = {
  id: "elasticidad-lineal",
  title: "Elasticidad de una función lineal",
  level: 2,
  generate: (r) => {
    let m: number, k: number, x0: number;
    do {
      m = r.nz(-4, 5);
      k = r.int(-10, 20);
      x0 = r.int(1, 8);
    } while (m * x0 + k === 0 || k === 0);
    const fx0 = m * x0 + k;
    const E = frac(m * x0, fx0);
    return {
      statement: `Calcula la elasticidad de $f(x) = ${terms([[m, "x"], [k, ""]])}$ en $x = ${x0}$.`,
      parts: [
        {
          kind: "expr",
          before: `E_f(${x0}) =`,
          answer: E,
          mistakes: m !== m * x0 / fx0 ? [{ answer: String(m), feedback: "Esa es la pendiente. La elasticidad la multiplica por $\\frac{x}{f(x)}$, así que cambia de un punto a otro." }] : [],
        },
      ],
      hints: ["$E_f(x) = \\dfrac{x}{f(x)}\\,f'(x)$.", `Aquí $f'(x) = ${m}$ y $f(${x0}) = ${fx0}$.`],
      solution: [
        `$f'(x) = ${m}$ y $f(${x0}) = ${fx0}$.`,
        `$E_f(${x0}) = \\dfrac{${x0}}{${fx0}}\\cdot ${m < 0 ? `(${m})` : m} = ${E}$.`,
        `La derivada es la misma en todos los puntos, pero la elasticidad no. Si $x$ sube 1 % desde $${x0}$, $f$ cambia aproximadamente $${E.startsWith("-") ? E.slice(1) : E}$ % ${E.startsWith("-") ? "hacia abajo" : "hacia arriba"}.`,
      ],
    };
  },
};

/** Precio máximo P y precio p0 con elasticidad -p0/(P - p0) limpia. */
function demandaLineal(r: Parameters<ExerciseGen["generate"]>[0]) {
  const b = r.pick([1, 2, 3, 4, 5]);
  const P = r.pick([20, 30, 40, 50, 60]);
  const p0 = r.pick([P / 5, P / 4, P / 2, (3 * P) / 4, (4 * P) / 5, P / 10, (3 * P) / 5].filter((x) => Number.isInteger(x)));
  return { b, P, a: b * P, p0, q0: b * (P - p0), E: -p0 / (P - p0) };
}

const elasticidadDemanda: ExerciseGen = {
  id: "elasticidad-demanda",
  title: "Elasticidad de una demanda lineal",
  level: 2,
  generate: (r) => {
    const { b, a, p0, q0, E } = demandaLineal(r);
    const Etex = frac(-b * p0, q0);
    return {
      statement: `La demanda de un bien es $q(p) = ${a} - ${coef(b, "p")}$, con $p$ en dólares. Calcula la elasticidad precio de la demanda en $p = ${p0}$ y clasifícala.`,
      sequential: true,
      parts: [
        {
          kind: "expr",
          before: `E(${p0}) =`,
          answer: Etex,
          mistakes: [
            { answer: frac(b * p0, q0), feedback: "Revisa el signo. La demanda baja cuando sube el precio, así que $q'(p) < 0$ y la elasticidad sale negativa." },
            ...(Math.abs(-b - E) > 1e-9 ? [{ answer: String(-b), feedback: "Esa es la derivada $q'(p)$. Falta multiplicar por $\\frac{p}{q}$." }] : []),
          ],
        },
        clasePart(E, "¿Cómo es la demanda en ese precio?"),
      ],
      hints: [
        "$E(p) = \\dfrac{p}{q(p)}\\,q'(p)$.",
        `$q'(p) = -${b}$ y $q(${p0}) = ${q0}$.`,
      ],
      solution: [
        `$q(${p0}) = ${a} - ${b * p0} = ${q0}$ y $q'(p) = -${b}$.`,
        `$E(${p0}) = \\dfrac{${p0}}{${q0}}\\cdot(-${b}) = ${Etex}$.`,
        `$|E| = ${frac(b * p0, q0)}$. ${CLASES[clasifica(E)].why}`,
      ],
    };
  },
};

const demandaIngreso: ExerciseGen = {
  id: "demanda-ingreso",
  title: "Elasticidad e ingreso total (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    let d = demandaLineal(r);
    while (clasifica(d.E) === "unitaria") d = demandaLineal(r);
    const { b, a, P, p0, q0, E } = d;
    const Etex = frac(-b * p0, q0);
    const elastic = clasifica(E) === "elastica";
    return {
      statement: `La demanda de un bien es $q(p) = ${a} - ${coef(b, "p")}$. La empresa vende hoy a $p = ${p0}$ dólares.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Calcula la elasticidad precio de la demanda en el precio actual.", before: `E(${p0}) =`, answer: Etex },
        clasePart(E, "¿Cómo es la demanda en ese precio?"),
        choice(
          elastic ? "Disminuye" : "Aumenta",
          [
            [elastic ? "Aumenta" : "Disminuye", elastic ? "Con demanda elástica la cantidad cae más que proporcionalmente, y eso pesa más que el aumento de precio." : "Con demanda inelástica la cantidad cae poco, así que el aumento de precio pesa más."],
            ["No cambia", "El ingreso solo se queda quieto, en primera aproximación, cuando la elasticidad es unitaria."],
          ],
          "Si la empresa sube un poco el precio, ¿qué pasa con el ingreso total?",
        ),
        { kind: "expr", prompt: "¿En qué precio la elasticidad es unitaria y el ingreso es máximo?", before: "p =", answer: String(P / 2) },
      ],
      hints: [
        "$E(p) = \\dfrac{p}{q}\\,q'(p)$.",
        "El ingreso es $I(p) = p\\,q(p)$ y su derivada es $I'(p) = q(1 + E)$. Mira el signo de $1 + E$.",
        "La elasticidad es unitaria cuando $E = -1$. Plantea esa ecuación.",
      ],
      solution: [
        `$q(${p0}) = ${q0}$ y $q'(p) = -${b}$, así que $E(${p0}) = \\dfrac{${p0}}{${q0}}(-${b}) = ${Etex}$.`,
        `$|E| = ${frac(b * p0, q0)}$, la demanda es ${CLASES[clasifica(E)].label.toLowerCase()}.`,
        `$I'(p) = q(p)\\,(1 + E)$. Como $1 + E = ${frac(q0 - b * p0, q0)}$ es ${elastic ? "negativo, subir el precio reduce el ingreso" : "positivo, subir el precio aumenta el ingreso"}.`,
        `$E(p) = \\dfrac{${coef(-b, "p")}}{${a} - ${coef(b, "p")}} = -1$ da $${coef(b, "p")} = ${a} - ${coef(b, "p")}$, es decir, $p = ${P / 2}$. Ahí $I(p) = ${a}p - ${coef(b, "p^{2}")}$ alcanza su máximo.`,
      ],
    };
  },
};

const elasticidadExpRaiz: ExerciseGen = {
  id: "elasticidad-exp-raiz",
  title: "Elasticidad de demandas no lineales (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const kind = r.pick(["exp", "sqrt", "frac", "pot"] as const);
    let qTex: string, p0: number, E: number, Etex: string, steps: string[];
    if (kind === "exp") {
      const k = r.pick([0.1, 0.2, 0.05, 0.5]);
      const A = r.pick([100, 500, 1000, 2000]);
      p0 = r.pick([2, 4, 5, 8, 10, 15, 20]);
      E = -Math.round(k * p0 * 1e6) / 1e6;
      Etex = ans(E);
      qTex = `${A}e^{-${num(k)}p}`;
      steps = [
        `$q'(p) = ${A}e^{-${num(k)}p}\\cdot(-${num(k)})$.`,
        `$E(p) = \\dfrac{p}{${A}e^{-${num(k)}p}}\\cdot(-${num(k)})${A}e^{-${num(k)}p} = -${num(k)}p$. La exponencial se cancela.`,
        `$E(${p0}) = -${num(k)}\\cdot ${p0} = ${num(E)}$.`,
      ];
    } else if (kind === "sqrt") {
      const d = r.pick([1, 2, 4]);
      const qs = r.int(2, 8);
      p0 = r.int(2, 12);
      const c = qs * qs + d * p0;
      E = (-d * p0) / (2 * qs * qs);
      Etex = frac(-d * p0, 2 * qs * qs);
      qTex = `\\sqrt{${c} - ${coef(d, "p")}}`;
      steps = [
        `$q'(p) = \\dfrac{-${d}}{2\\sqrt{${c} - ${coef(d, "p")}}}$.`,
        `$E(p) = \\dfrac{p}{\\sqrt{${c} - ${coef(d, "p")}}}\\cdot\\dfrac{-${d}}{2\\sqrt{${c} - ${coef(d, "p")}}} = \\dfrac{-${coef(d, "p")}}{2(${c} - ${coef(d, "p")})}$.`,
        `En $p = ${p0}$: $${c} - ${d * p0} = ${qs * qs}$, así que $E(${p0}) = \\dfrac{-${d * p0}}{${2 * qs * qs}} = ${Etex}$.`,
      ];
    } else if (kind === "frac") {
      const c = r.int(1, 10);
      const A = r.pick([100, 200, 600, 1000]);
      p0 = r.int(1, 20);
      E = -p0 / (p0 + c);
      Etex = frac(-p0, p0 + c);
      qTex = `\\frac{${A}}{p + ${c}}`;
      steps = [
        `$q'(p) = -\\dfrac{${A}}{(p + ${c})^{2}}$.`,
        `$E(p) = \\dfrac{p(p + ${c})}{${A}}\\cdot\\left(-\\dfrac{${A}}{(p + ${c})^{2}}\\right) = -\\dfrac{p}{p + ${c}}$.`,
        `$E(${p0}) = -\\dfrac{${p0}}{${p0 + c}} = ${Etex}$.`,
      ];
    } else {
      const n = r.pick([2, 3]);
      const A = r.pick([100, 500, 1000]);
      p0 = r.int(2, 20);
      E = -n;
      Etex = String(-n);
      qTex = `\\frac{${A}}{p^{${n}}}`;
      steps = [
        `$q(p) = ${A}p^{-${n}}$, así que $q'(p) = -${A * n}p^{-${n + 1}}$.`,
        `$E(p) = \\dfrac{p}{${A}p^{-${n}}}\\cdot(-${A * n}p^{-${n + 1}}) = -${n}$, sin importar el precio.`,
        `$E(${p0}) = -${n}$.`,
      ];
    }
    const absTex = Etex.startsWith("-") ? Etex.slice(1) : Etex;
    return {
      statement: `La demanda de un bien es $q(p) = ${qTex}$. Calcula la elasticidad precio de la demanda en $p = ${p0}$ e interprétala.`,
      sequential: true,
      parts: [
        { kind: "expr", before: `E(${p0}) =`, answer: Etex },
        clasePart(E, "¿Cómo es la demanda en ese precio?"),
      ],
      hints: [
        "$E(p) = \\dfrac{p}{q(p)}\\,q'(p)$.",
        "Calcula $E(p)$ con $p$ general antes de sustituir. Muchas cosas se cancelan.",
      ],
      solution: [...steps, `$|E| = ${absTex}$. ${CLASES[clasifica(E)].why} Si el precio sube 1 %, la cantidad baja cerca de $${absTex}$ %.`],
    };
  },
};

const elasticidadGeneral: ExerciseGen = {
  id: "elasticidad-general",
  title: "Función elasticidad (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const kind = r.pick(["xexp", "pot", "xsqrt", "xln", "exp2"] as const);
    let fTex: string, Ex: string, x0: number, E0: string, steps: string[], dom: [number, number] = [0.5, 4];
    if (kind === "xexp") {
      const n = r.int(1, 3);
      const k = r.nz(-2, 3);
      fTex = `${n === 1 ? "x" : `x^{${n}}`}e^{${coef(k, "x")}}`;
      Ex = `${n} ${k < 0 ? "-" : "+"} ${coef(Math.abs(k), "x")}`;
      x0 = r.int(1, 4);
      E0 = String(n + k * x0);
      steps = [
        `$f'(x) = ${n === 1 ? "" : `${n}x^{${n - 1}}`.replace("x^{1}", "x")}e^{${coef(k, "x")}} + ${n === 1 ? "x" : `x^{${n}}`}\\cdot ${k < 0 ? `(${k})` : k}e^{${coef(k, "x")}} = ${n === 1 ? "" : n === 2 ? "x" : `x^{${n - 1}}`}e^{${coef(k, "x")}}(${n} ${k < 0 ? "-" : "+"} ${coef(Math.abs(k), "x")})$.`,
        `$E_f(x) = \\dfrac{x}{${fTex}}\\cdot ${n === 1 ? "" : n === 2 ? "x" : `x^{${n - 1}}`}e^{${coef(k, "x")}}(${Ex}) = ${Ex}$.`,
        `$E_f(${x0}) = ${E0}$.`,
      ];
    } else if (kind === "pot") {
      const a = r.int(1, 4);
      const b = r.int(1, 6);
      const n = r.int(2, 5);
      fTex = `(${a === 1 ? "" : a}x + ${b})^{${n}}`;
      Ex = `\\frac{${a * n}x}{${a === 1 ? "" : a}x + ${b}}`;
      x0 = r.int(1, 5);
      E0 = frac(a * n * x0, a * x0 + b);
      steps = [
        `$f'(x) = ${n * a}(${a === 1 ? "" : a}x + ${b})^{${n - 1}}$.`,
        `$E_f(x) = \\dfrac{x}{(${a === 1 ? "" : a}x + ${b})^{${n}}}\\cdot ${n * a}(${a === 1 ? "" : a}x + ${b})^{${n - 1}} = ${Ex}$.`,
        `$E_f(${x0}) = \\dfrac{${a * n * x0}}{${a * x0 + b}} = ${E0}$.`,
      ];
    } else if (kind === "xsqrt") {
      const c = r.int(1, 8);
      fTex = `x\\sqrt{x + ${c}}`;
      Ex = `\\frac{3x + ${2 * c}}{2(x + ${c})}`;
      x0 = r.int(1, 8);
      E0 = frac(3 * x0 + 2 * c, 2 * (x0 + c));
      steps = [
        `$f'(x) = \\sqrt{x + ${c}} + \\dfrac{x}{2\\sqrt{x + ${c}}} = \\dfrac{2(x + ${c}) + x}{2\\sqrt{x + ${c}}} = \\dfrac{3x + ${2 * c}}{2\\sqrt{x + ${c}}}$.`,
        `$E_f(x) = \\dfrac{x}{x\\sqrt{x + ${c}}}\\cdot\\dfrac{3x + ${2 * c}}{2\\sqrt{x + ${c}}} = ${Ex}$.`,
        `$E_f(${x0}) = \\dfrac{${3 * x0 + 2 * c}}{${2 * (x0 + c)}} = ${E0}$.`,
      ];
    } else if (kind === "xln") {
      fTex = "x\\ln x";
      Ex = "1 + \\frac{1}{\\ln x}";
      x0 = r.pick([2, 3, 4]);
      dom = [1.5, 4];
      const sx = r.bool();
      if (sx) {
        // evaluar en x = e
        x0 = Math.E;
        E0 = "2";
      } else {
        E0 = `1 + \\frac{1}{\\ln ${x0}}`;
      }
      steps = [
        "$f'(x) = \\ln x + x\\cdot\\dfrac{1}{x} = \\ln x + 1$.",
        `$E_f(x) = \\dfrac{x}{x\\ln x}(\\ln x + 1) = \\dfrac{\\ln x + 1}{\\ln x} = ${Ex}$.`,
        sx ? "$E_f(e) = 1 + \\dfrac{1}{\\ln e} = 1 + 1 = 2$." : `$E_f(${x0}) = ${E0} \\approx ${num(1 + 1 / Math.log(x0), 3)}$.`,
      ];
    } else {
      const k = r.int(1, 3);
      fTex = `e^{${coef(k, "x^{2}")}}`;
      Ex = `${2 * k}x^{2}`;
      x0 = r.int(1, 3);
      E0 = String(2 * k * x0 * x0);
      steps = [
        `$f'(x) = ${coef(2 * k, "x")}e^{${coef(k, "x^{2}")}}$.`,
        `$E_f(x) = \\dfrac{x}{e^{${coef(k, "x^{2}")}}}\\cdot ${coef(2 * k, "x")}e^{${coef(k, "x^{2}")}} = ${Ex}$.`,
        `$E_f(${x0}) = ${2 * k}\\cdot ${x0 * x0} = ${E0}$.`,
      ];
    }
    const x0Tex = x0 === Math.E ? "e" : String(x0);
    return {
      statement: `Sea $f(x) = ${fTex}$. Halla la función elasticidad $E_f(x)$ y luego evalúala en $x = ${x0Tex}$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Función elasticidad, simplificada.", before: "E_f(x) =", answer: Ex, vars: ["x"], domain: dom },
        { kind: "expr", prompt: `Elasticidad en $x = ${x0Tex}$.`, before: `E_f(${x0Tex}) =`, answer: E0 },
      ],
      hints: [
        "$E_f(x) = \\dfrac{x}{f(x)}\\,f'(x)$. Deriva primero y después arma el cociente.",
        "Antes de multiplicar, busca factores que se repitan arriba y abajo para cancelarlos.",
      ],
      solution: steps,
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("elasticidad-marginal"),
  objectives: [
    "Calcular e interpretar el costo, el ingreso y la utilidad marginal.",
    "Calcular el costo promedio y su derivada, y relacionarlo con el costo marginal.",
    "Calcular la elasticidad de una función en un punto con $E_f(x) = \\frac{x}{f(x)}f'(x)$.",
    "Clasificar la demanda como elástica, inelástica o unitaria y predecir qué pasa con el ingreso al cambiar el precio.",
  ],
  sections: [
    {
      id: "marginal",
      title: "Lo marginal es la derivada",
      blocks: [
        {
          type: "text",
          md: "En economía la palabra marginal significa \"lo que pasa con una unidad más\". Si una fábrica produce 50 unidades, el costo marginal responde a la pregunta: ¿cuánto más cuesta producir la número 51? Esa pregunta es una tasa de cambio, y por eso la respuesta es una derivada.",
        },
        {
          type: "definition",
          title: "Funciones marginales",
          md: "Si $C(q)$ es el costo total de producir $q$ unidades, el **costo marginal** es $C'(q)$. Del mismo modo, el **ingreso marginal** es $I'(q)$ y la **utilidad marginal** es $U'(q)$.\n\nPor la aproximación lineal, con $\\Delta q = 1$:\n\n$$C(q + 1) - C(q) \\approx C'(q)$$",
        },
        {
          type: "example",
          title: "Costo marginal y costo real",
          problem: "Supón que el costo total, en dólares, es $C(q) = 0{,}1q^{2} + 5q + 200$. Calcula el costo marginal en $q = 50$ y compáralo con el costo real de la unidad 51.",
          steps: [
            "$C'(q) = 0{,}2q + 5$, así que $C'(50) = 10 + 5 = 15$.",
            "Costo real: $C(51) - C(50) = (260{,}1 + 255 + 200) - (250 + 250 + 200) = 15{,}1$.",
            "La diferencia es de 10 céntimos. El costo marginal es una muy buena estimación del costo de la unidad siguiente.",
          ],
          answer: "$C'(50) = 15$ dólares por unidad",
        },
        {
          type: "widget",
          widget: { kind: "tangent", fn: "\\frac{x^{3}}{30} - \\frac{x^{2}}{2} + 4x + 2", x: [0, 12], y: [-4, 40], derivative: "\\frac{x^{2}}{10} - x + 4" },
          caption: "Una curva de costo total típica. La pendiente de la tangente es el costo marginal: primero baja y después sube.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Costo marginal no es costo total",
          md: "$C(50)$ es lo que cuesta producir las 50 unidades juntas. $C'(50)$ es lo que cuesta, aproximadamente, la siguiente. No los confundas al responder.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Si $C(q) = q^{2} + 4q + 100$, calcula el costo marginal en $q = 10$.",
            parts: [{ kind: "expr", before: "C'(10) =", answer: "24", mistakes: [{ answer: "240", feedback: "Ese es el costo total $C(10)$." }] }],
            solution: ["$C'(q) = 2q + 4$, así que $C'(10) = 24$."],
          },
        },
      ],
    },
    {
      id: "ingreso-utilidad",
      title: "Ingreso y utilidad marginal",
      blocks: [
        {
          type: "text",
          md: "El ingreso es precio por cantidad, $I(q) = p\\cdot q$. Si el precio es fijo, el ingreso marginal es el precio. Pero casi siempre, para vender más hay que bajar el precio, y la demanda se escribe como $p = a - bq$. Entonces el ingreso es un producto de dos cosas que dependen de $q$.\n\nLa utilidad, o ganancia, es lo que queda: $U(q) = I(q) - C(q)$. Al derivar, $U'(q) = I'(q) - C'(q)$.",
        },
        {
          type: "example",
          title: "Ingreso, costo y utilidad",
          problem: "Supón que la demanda es $p = 100 - 2q$ y el costo es $C(q) = 20q + 50$. Calcula el ingreso marginal y la utilidad marginal en $q = 15$.",
          steps: [
            "$I(q) = q(100 - 2q) = 100q - 2q^{2}$, así que $I'(q) = 100 - 4q$ e $I'(15) = 40$.",
            "$C'(q) = 20$.",
            "$U'(15) = I'(15) - C'(15) = 40 - 20 = 20$. Producir y vender la unidad 16 aumenta la utilidad en unos 20 dólares.",
            "$U'(q) = 80 - 4q = 0$ en $q = 20$. Ahí el ingreso marginal iguala al costo marginal y la utilidad deja de crecer.",
          ],
        },
        {
          type: "note",
          tone: "econ",
          title: "Ingreso marginal igual a costo marginal",
          md: "Mientras $I'(q) > C'(q)$, cada unidad extra deja más de lo que cuesta y conviene producirla. Cuando $I'(q) = C'(q)$ la utilidad deja de crecer. Esta es la regla de producción que verás en microeconomía, y en el tema de extremos vas a ver cómo comprobar que ahí hay un máximo.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Ingreso marginal no es el precio",
          md: "Con $p = 100 - 2q$ y $q = 15$ el precio es $70$, pero el ingreso marginal es $40$. La diferencia aparece porque, para vender una unidad más, hay que bajar el precio de todas las demás.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Si $I(q) = 50q - q^{2}$, calcula el ingreso marginal en $q = 20$.",
            parts: [{ kind: "expr", before: "I'(20) =", answer: "10", mistakes: [{ answer: "600", feedback: "Ese es el ingreso total $I(20)$." }] }],
            solution: ["$I'(q) = 50 - 2q$, así que $I'(20) = 10$."],
          },
        },
      ],
    },
    {
      id: "costo-promedio",
      title: "Costo promedio",
      blocks: [
        {
          type: "text",
          md: "El costo promedio es lo que cuesta, en promedio, cada unidad: $\\overline{C}(q) = \\dfrac{C(q)}{q}$. Al principio suele bajar, porque el costo fijo se reparte entre más unidades, y después sube.",
        },
        {
          type: "definition",
          title: "Derivada del costo promedio",
          md: "Por la regla del cociente:\n\n$$\\begin{aligned} \\overline{C}'(q) &= \\frac{q\\,C'(q) - C(q)}{q^{2}} \\\\ &= \\frac{1}{q}\\left(C'(q) - \\overline{C}(q)\\right) \\end{aligned}$$\n\nEl signo depende de comparar el marginal con el promedio. Si $C'(q) < \\overline{C}(q)$ el promedio baja. Si $C'(q) > \\overline{C}(q)$ el promedio sube. Donde son iguales, el promedio toca su mínimo.",
        },
        {
          type: "example",
          title: "El mínimo del costo promedio",
          problem: "Con $C(q) = q^{2} + 4q + 100$, halla dónde el costo promedio deja de bajar.",
          steps: [
            "$\\overline{C}(q) = q + 4 + \\dfrac{100}{q}$.",
            "$\\overline{C}'(q) = 1 - \\dfrac{100}{q^{2}}$, que vale cero cuando $q^{2} = 100$, es decir, $q = 10$.",
            "Comprobación: $C'(10) = 2\\cdot 10 + 4 = 24$ y $\\overline{C}(10) = 10 + 4 + 10 = 24$. Son iguales.",
          ],
        },
        {
          type: "graph",
          spec: {
            x: [-2, 30],
            y: [-6, 70],
            step: 10,
            curves: [
              { fn: "x + 4 + \\frac{100}{x}", domain: [1.5, 30], color: "accent" },
              { fn: "2x + 4", domain: [0, 30], color: "orange" },
            ],
            points: [{ x: 10, y: 24, label: "(10, 24)" }],
            labels: [
              { x: 18, y: 52, text: "$C'(q)$", color: "orange" },
              { x: 26, y: 27, text: "$\\overline{C}(q)$", color: "accent" },
            ],
          },
          caption: "La curva de costo marginal corta a la de costo promedio justo en su mínimo.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Con $C(q) = 2q^{2} + 50$, calcula $\\overline{C}'(5)$.",
            parts: [{ kind: "expr", before: "\\overline{C}'(5) =", answer: "0", mistakes: [{ answer: "20", feedback: "Ese es $C'(5)$, el costo marginal." }] }],
            solution: ["$\\overline{C}(q) = 2q + \\dfrac{50}{q}$, así que $\\overline{C}'(q) = 2 - \\dfrac{50}{q^{2}}$ y $\\overline{C}'(5) = 2 - 2 = 0$. En $q = 5$ el costo promedio es mínimo."],
          },
        },
      ],
    },
    {
      id: "elasticidad",
      title: "Elasticidad de una función",
      blocks: [
        {
          type: "text",
          md: "La derivada mide cambios en unidades: dólares por kilo, unidades por bolívar. Eso trae un problema, porque si cambias de unidades cambia la derivada. La elasticidad compara cambios **porcentuales**, así que no depende de las unidades. Responde: si $x$ sube 1 %, ¿en qué porcentaje cambia $f$?",
        },
        {
          type: "definition",
          title: "Elasticidad de f en x",
          md: "La guía de la cátedra la obtiene como el límite del cociente de las variaciones relativas:\n\n$$\\begin{aligned} E_f(x) &= \\lim_{h \\to 0}\\frac{\\frac{f(x+h) - f(x)}{f(x)}}{\\frac{h}{x}} \\\\ &= \\frac{x}{f(x)}\\,f'(x) \\end{aligned}$$\n\nVale donde $f(x) \\ne 0$. Lectura: si $x$ aumenta 1 %, $f(x)$ cambia aproximadamente $E_f(x)$ %.",
        },
        {
          type: "example",
          title: "Tres elasticidades",
          problem: "Calcula la elasticidad de $f(x) = x^{2}$, de $g(x) = 3x + 6$ en $x = 2$ y de $h(x) = \\frac{k}{x}$.",
          steps: [
            "$f$: $E_f(x) = \\dfrac{x}{x^{2}}\\cdot 2x = 2$. Vale $2$ en todos los puntos. Si $x$ sube 1 %, $x^2$ sube cerca de 2 %.",
            "$g$: $E_g(2) = \\dfrac{2}{12}\\cdot 3 = \\dfrac{1}{2}$. La derivada vale $3$ en todas partes, pero la elasticidad cambia según el punto.",
            "$h$: $E_h(x) = \\dfrac{x}{k/x}\\cdot\\left(-\\dfrac{k}{x^{2}}\\right) = -1$. Constante.",
          ],
        },
        {
          type: "note",
          tone: "tip",
          title: "Atajo para potencias",
          md: "Para $f(x) = k\\,x^{n}$ la elasticidad vale $n$ en todos los puntos. Además, la elasticidad de un producto es la suma de las elasticidades: $E_{fg} = E_f + E_g$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Evalúa todo en el mismo punto",
          md: "En $E_f(a) = \\frac{a}{f(a)}f'(a)$ las tres cosas van evaluadas en $a$. Un error común es usar $f'(a)$ sola, que es la derivada y no la elasticidad.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula la elasticidad de $f(x) = x^{3} + 1$ en $x = 1$.",
            parts: [{ kind: "expr", before: "E_f(1) =", answer: "\\frac{3}{2}", mistakes: [{ answer: "3", feedback: "Ese es $f'(1)$. Falta multiplicar por $\\frac{1}{f(1)} = \\frac{1}{2}$." }] }],
            solution: ["$f'(x) = 3x^{2}$, $f(1) = 2$ y $f'(1) = 3$. $E_f(1) = \\frac{1}{2}\\cdot 3 = \\frac{3}{2}$."],
          },
        },
      ],
    },
    {
      id: "demanda",
      title: "Elasticidad de la demanda",
      blocks: [
        {
          type: "text",
          md: "El uso más frecuente es la elasticidad precio de la demanda. Si $q = q(p)$ es la cantidad demandada a precio $p$:\n\n$$E(p) = \\frac{p}{q(p)}\\,q'(p)$$\n\nComo la demanda baja cuando sube el precio, $q'(p) < 0$ y la elasticidad sale negativa. Muchos libros, y la guía de la cátedra, le ponen un signo menos delante para trabajar con un número positivo. Para clasificar se usa el valor absoluto.",
        },
        {
          type: "table",
          headers: ["Valor", "La demanda es"],
          rows: [
            ["${|E| > 1}$", "**Elástica.** La cantidad cambia en mayor proporción que el precio."],
            ["${|E| < 1}$", "**Inelástica.** La cantidad cambia en menor proporción que el precio."],
            ["${|E| = 1}$", "**Unitaria.** Cambian en la misma proporción."],
          ],
        },
        {
          type: "example",
          title: "Una demanda lineal",
          problem: "Supón que la demanda es $q = 120 - 3p$. Calcula la elasticidad en $p = 10$, $p = 20$ y $p = 30$.",
          steps: [
            "$q'(p) = -3$, así que $E(p) = \\dfrac{-3p}{120 - 3p}$.",
            "$E(10) = \\dfrac{-30}{90} = -\\dfrac{1}{3}$. Inelástica: si el precio sube 1 %, la cantidad baja apenas un tercio de 1 %.",
            "$E(20) = \\dfrac{-60}{60} = -1$. Unitaria.",
            "$E(30) = \\dfrac{-90}{30} = -3$. Elástica: si el precio sube 1 %, la cantidad baja cerca de 3 %.",
          ],
        },
        {
          type: "graph",
          spec: {
            x: [-4, 45],
            y: [-12, 130],
            step: 10,
            curves: [
              { fn: "120 - 3x", domain: [0, 20], color: "green", label: "inelástica" },
              { fn: "120 - 3x", domain: [20, 40], color: "red", label: "elástica" },
            ],
            points: [{ x: 20, y: 60, label: "|E| = 1" }],
          },
          caption: "La demanda $q = 120 - 3p$ con el precio en el eje horizontal. La pendiente es la misma en toda la recta, pero la elasticidad no: por debajo de $p = 20$ es inelástica y por encima es elástica.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Pendiente y elasticidad son cosas distintas",
          md: "Una demanda lineal tiene pendiente constante y aun así pasa por los tres tipos de elasticidad. No digas que una recta \"empinada\" es inelástica sin hacer la cuenta en el punto.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Si $q = 120 - 3p$, ¿cómo es la demanda en $p = 35$?",
            parts: [choice("Elástica", [["Inelástica", "Calcula: $E(35) = \\frac{-105}{15} = -7$, y $|E| = 7 > 1$."], ["Unitaria", "Solo es unitaria en $p = 20$."]])],
            solution: ["$E(35) = \\dfrac{35}{15}(-3) = -7$. Como $|E| > 1$, es elástica."],
          },
        },
      ],
    },
    {
      id: "ingreso",
      title: "Elasticidad e ingreso",
      blocks: [
        {
          type: "text",
          md: "¿Le conviene a una empresa subir el precio? Depende de la elasticidad. El ingreso como función del precio es $I(p) = p\\,q(p)$. Por la regla del producto:\n\n$$\\begin{aligned} I'(p) &= q(p) + p\\,q'(p) \\\\ &= q(p)\\left(1 + \\frac{p}{q(p)}\\,q'(p)\\right) \\\\ &= q(p)\\,(1 + E) \\end{aligned}$$\n\nComo $q(p) > 0$, el signo de $I'(p)$ es el signo de $1 + E$.",
        },
        {
          type: "table",
          headers: ["Demanda", "Si el precio sube un poco"],
          rows: [
            ["Inelástica, ${|E| < 1}$", "${1 + E > 0}$, el ingreso aumenta"],
            ["Elástica, ${|E| > 1}$", "${1 + E < 0}$, el ingreso disminuye"],
            ["Unitaria, ${|E| = 1}$", "${1 + E = 0}$, el ingreso no cambia y está en su máximo"],
          ],
        },
        {
          type: "example",
          title: "El precio que maximiza el ingreso",
          problem: "Con la demanda $q = 120 - 3p$, ¿en qué precio el ingreso es máximo?",
          steps: [
            "$I(p) = p(120 - 3p) = 120p - 3p^{2}$ e $I'(p) = 120 - 6p$.",
            "$I'(p) = 0$ en $p = 20$, el mismo precio donde $E = -1$.",
            "Por debajo de $p = 20$ la demanda es inelástica y subir el precio aumenta el ingreso. Por encima es elástica y subirlo lo reduce.",
          ],
        },
        {
          type: "note",
          tone: "econ",
          title: "Lectura económica",
          md: "Los bienes con pocos sustitutos suelen tener demanda inelástica: aunque suba el precio, la gente sigue comprando casi lo mismo, y el ingreso del vendedor sube. Con muchos sustitutos la demanda es elástica y subir el precio espanta a los compradores.",
        },
        {
          type: "quick",
          exercise: {
            statement: "En el precio actual, la demanda de un producto tiene elasticidad $E = -0{,}5$. Si la empresa sube un poco el precio, el ingreso total:",
            parts: [choice("Aumenta", [["Disminuye", "Eso pasaría con demanda elástica. Aquí $|E| = 0{,}5 < 1$."], ["No cambia", "Solo con elasticidad unitaria."]])],
            solution: ["$1 + E = 0{,}5 > 0$, así que $I'(p) > 0$: subir el precio aumenta el ingreso."],
          },
        },
      ],
    },
  ],
  exercises: [
    costoMarginal,
    ingresoMarginal,
    elasticidadPotencia,
    clasificar,
    marginalReal,
    utilidadMarginal,
    costoPromedio,
    elasticidadLineal,
    elasticidadDemanda,
    demandaIngreso,
    elasticidadExpRaiz,
    elasticidadGeneral,
  ],
};

export default topic;
