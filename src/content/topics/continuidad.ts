import { meta } from "../catalog";
import { choice, trueFalse } from "../helpers";
import type { ExerciseGen, GraphSpec, Part, Rich, Topic } from "../types";
import { iv, minusPoints, unionTex, type Interval } from "@/lib/math/intervals";
import { cases, frac, minus, poly, signed, terms } from "@/lib/math/tex";
import type { Rng } from "@/lib/math/rng";

/* ----------------------------- utilidades locales ----------------------------- */

type Tipo = "continua" | "evitable" | "salto" | "infinita";

const plusConst = (tex: string, c: number) => (c === 0 ? tex : `${tex} ${signed(c)}`);
const lim = (to: string) => `\\lim_{x \\to ${to}}`;
const inf = (s: number) => (s > 0 ? "+\\infty" : "-\\infty");
const lineTex = (m: number, b: number) => terms([[m, "x"], [b, ""]]);

const TIPO_LABEL: Record<Tipo, string> = {
  continua: "Es continua en ese punto",
  evitable: "Discontinuidad evitable",
  salto: "Discontinuidad inevitable de salto",
  infinita: "Discontinuidad inevitable infinita",
};
const TIPO_FB: Record<Tipo, string> = {
  continua: "Para ser continua, los dos límites laterales tienen que existir, ser iguales y coincidir con $f(a)$.",
  evitable: "Evitable quiere decir que el límite existe (laterales finitos e iguales), pero $f(a)$ no existe o tiene otro valor.",
  salto: "De salto quiere decir que los dos laterales son finitos pero distintos.",
  infinita: "Infinita quiere decir que al menos un límite lateral es $+\\infty$ o $-\\infty$.",
};

/** Pregunta de clasificación con las cuatro opciones en orden fijo. */
function tipoChoice(t: Tipo, prompt?: Rich): Part {
  const order: Tipo[] = ["continua", "evitable", "salto", "infinita"];
  return {
    kind: "choice",
    prompt,
    shuffle: false,
    options: order.map((k) => ({ label: TIPO_LABEL[k], correct: k === t || undefined, feedback: k === t ? undefined : TIPO_FB[k] })),
  };
}

/** Gráfica con una sola posible discontinuidad en x = a. */
function oneDisc(t: Tipo, a: number, k: number, J = 3, undefinedAt = false): GraphSpec {
  const base = plusConst(`\\frac{${minus("x", a)}}{2}`, k);
  const g: GraphSpec = { x: [-6, 6], y: [-6, 6], height: 220, curves: [], points: [] };
  if (t === "continua") {
    g.curves = [{ fn: base, color: "accent" }];
    g.points = [{ x: a, y: k, color: "accent" }];
  } else if (t === "evitable") {
    g.curves = [{ fn: base, color: "accent" }];
    g.points = undefinedAt ? [{ x: a, y: k, open: true }] : [{ x: a, y: k, open: true }, { x: a, y: k + 2, color: "accent" }];
  } else if (t === "salto") {
    g.curves = [
      { fn: base, domain: [-6, a], color: "accent" },
      { fn: plusConst(`\\frac{${minus("x", a)}}{2}`, k + J), domain: [a, 6], color: "accent" },
    ];
    g.points = [{ x: a, y: k, color: "accent" }, { x: a, y: k + J, open: true }];
  } else {
    g.curves = [{ fn: plusConst(`\\frac{1}{${minus("x", a)}}`, k), breaks: [a], color: "accent" }];
    g.vlines = [{ x: a, dashed: true, color: "muted" }];
  }
  return g;
}

type Feat = { x: number; t: "E" | "S" | "I" };

/** Gráfica continua salvo en los puntos indicados: E evitable, S salto, I infinita. */
function multiDisc(feats: Feat[]): GraphSpec {
  const S = feats.filter((f) => f.t === "S").map((f) => f.x).sort((a, b) => a - b);
  const I = feats.filter((f) => f.t === "I").map((f) => f.x);
  const infTex = I.map((p) => ` + \\frac{1}{${minus("x", p)}}`).join("");
  const val = (x: number, left = false) =>
    x / 4 + 1 + 3 * S.filter((s) => (left ? x > s : x >= s)).length + I.reduce((acc, p) => acc + 1 / (x - p), 0);
  const cuts = [-7, ...S, 7];
  const curves = cuts.slice(0, -1).map((lo, i) => {
    const hi = cuts[i + 1];
    return {
      fn: plusConst("\\frac{x}{4}", 1 + 3 * i) + infTex,
      domain: [lo, hi] as [number, number],
      breaks: I.filter((p) => p > lo && p < hi),
      color: "accent" as const,
    };
  });
  const points: GraphSpec["points"] = [];
  for (const f of feats) {
    if (f.t === "E") {
      const y = val(f.x);
      points.push({ x: f.x, y, open: true }, { x: f.x, y: y + 2, color: "accent" });
    } else if (f.t === "S") {
      const yl = val(f.x, true);
      points.push({ x: f.x, y: yl, color: "accent" }, { x: f.x, y: yl + 3, open: true });
    }
  }
  return {
    x: [-7, 7],
    y: [-5, 11],
    height: 240,
    curves,
    points,
    vlines: I.map((p) => ({ x: p, dashed: true, color: "muted" as const })),
  };
}

/* ----------------------------------- ejercicios ----------------------------------- */

const tresCondiciones: ExerciseGen = {
  id: "tres-condiciones",
  title: "Las tres condiciones",
  level: 1,
  generate: (r) => {
    const a = r.int(-4, 4);
    const t = r.pick(["continua", "evitable", "evitable", "salto", "infinita"] as Tipo[]);
    const L = r.int(-5, 5);
    let L1 = L, L2 = L;
    let fa: string = String(L);
    let why: string;
    if (t === "continua") {
      why = `Los dos laterales valen $${L}$ y $f(${a}) = ${L}$. Se cumplen las tres condiciones.`;
    } else if (t === "evitable") {
      if (r.bool()) {
        fa = "\\text{ no existe}";
        why = `El límite existe y vale $${L}$, pero $f(${a})$ no está definida. Bastaría definir $f(${a}) = ${L}$ para arreglarla.`;
      } else {
        const v = L + r.nz(-3, 3);
        fa = String(v);
        why = `El límite existe y vale $${L}$, pero $f(${a}) = ${v}$. Redefiniendo $f(${a}) = ${L}$ la función queda continua.`;
      }
    } else if (t === "salto") {
      L2 = L + r.nz(-4, 4);
      fa = String(r.pick([L, L2]));
      why = `Los laterales son finitos pero distintos: $${L1}$ y $${L2}$. El límite no existe y ningún valor de $f(${a})$ lo arregla.`;
    } else {
      why = "Un límite lateral es infinito. La gráfica tiene una asíntota vertical en ese punto.";
    }
    const s = r.sign();
    const leftInf = t === "infinita" && r.bool();
    const lTex = t === "infinita" && leftInf ? inf(s) : String(L1);
    const rTex = t === "infinita" && !leftInf ? inf(s) : String(L2);
    return {
      statement: `De una función $f$ se sabe que $$${lim(`${a}^-`)} f(x) = ${lTex}, \\qquad ${lim(`${a}^+`)} f(x) = ${rTex}, \\qquad f(${a}) ${fa.includes("text") ? fa : `= ${fa}`}$$ ¿Qué pasa con la continuidad de $f$ en $x = ${a}$?`,
      parts: [tipoChoice(t)],
      hints: ["Primero compara los dos laterales. Si son iguales y finitos, compara ese valor con $f(a)$."],
      solution: [why, `Conclusión: ${TIPO_LABEL[t].toLowerCase()}.`],
    };
  },
};

const clasificarGrafica: ExerciseGen = {
  id: "clasificar-grafica",
  title: "Clasificar una discontinuidad en la gráfica",
  level: 1,
  generate: (r) => {
    const a = r.int(-2, 2);
    const k = r.int(-2, 2);
    const t = r.pick(["continua", "evitable", "evitable", "salto", "salto", "infinita"] as Tipo[]);
    const undef = r.bool();
    return {
      statement: `Observa la gráfica de $f$. ¿Es continua en $x = ${a}$? Si no lo es, ¿qué tipo de discontinuidad tiene ahí?`,
      graph: oneDisc(t, a, k, r.pick([-3, 3]), undef),
      parts: [tipoChoice(t)],
      hints: ["Un punto hueco es un valor que no se toma. Un punto relleno es el valor de $f$ en ese $x$."],
      solution: [
        {
          continua: "La curva pasa por el punto sin cortes. Los laterales coinciden con el valor de la función.",
          evitable: undef
            ? "La curva se acerca a la misma altura por los dos lados, pero en ese punto hay un hueco y la función no está definida."
            : "La curva se acerca a la misma altura por los dos lados, pero el punto relleno está en otra altura. El límite existe y no coincide con $f(a)$.",
          salto: "Por la izquierda la curva llega a una altura y por la derecha arranca en otra. Los laterales son finitos y distintos.",
          infinita: "La curva se dispara cerca del punto: hay una asíntota vertical.",
        }[t],
        `Conclusión: ${TIPO_LABEL[t].toLowerCase()}.`,
      ],
    };
  },
};

const dondeContinua: ExerciseGen = {
  id: "donde-continua",
  title: "Dónde es continua una función",
  level: 1,
  generate: (r) => {
    const kind = r.pick(["racional", "raiz", "log", "entera"] as const);
    let fTex: string, ans: Interval[], sol: string[];
    let mistakes: { answer: Interval[]; feedback: Rich }[] = [];
    if (kind === "racional") {
      const [a, b] = r.sample([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5], 2).sort((x, y) => x - y);
      let p: number;
      do p = r.int(-5, 5); while (p === a || p === b);
      fTex = `\\dfrac{${minus("x", p)}}{${poly([1, -(a + b), a * b])}}`;
      ans = minusPoints([iv(-Infinity, Infinity)], [a, b]);
      mistakes = [{ answer: minusPoints([iv(-Infinity, Infinity)], [p]), feedback: `El cero del numerador no da problemas. Lo que hay que quitar son los ceros del denominador.` }];
      sol = [
        "Una función racional es continua en todo su dominio.",
        `El denominador $(${minus("x", a)})(${minus("x", b)})$ se anula en $x = ${a}$ y $x = ${b}$.`,
        `Es continua en $${unionTex(ans)}$.`,
      ];
    } else if (kind === "raiz") {
      const a = r.int(-5, 5);
      fTex = `\\sqrt{${minus("x", a)}}`;
      ans = [iv(a, Infinity, true, false)];
      mistakes = [{ answer: [iv(a, Infinity)], feedback: `En $x = ${a}$ la función vale $0$ y es continua por la derecha. Como solo existe a la derecha de ese punto, el extremo entra.` }];
      sol = [
        `La raíz cuadrada existe si $${minus("x", a)} \\ge 0$, o sea $x \\ge ${a}$.`,
        `En $x = ${a}$ es continua por la derecha: $${lim(`${a}^+`)} \\sqrt{${minus("x", a)}} = 0 = f(${a})$.`,
        `Es continua en $${unionTex(ans)}$.`,
      ];
    } else if (kind === "log") {
      const a = r.int(-5, 5);
      fTex = `\\ln(${a === 0 ? "-x" : `${a} - x`})`;
      ans = [iv(-Infinity, a)];
      mistakes = [{ answer: [iv(-Infinity, a, false, true)], feedback: `En $x = ${a}$ el argumento vale $0$ y el logaritmo no existe.` }];
      sol = [`El logaritmo existe si su argumento es positivo: $${a === 0 ? "-x" : `${a} - x`} > 0$, o sea $x < ${a}$.`, `Es continua en todo su dominio: $${unionTex(ans)}$.`];
    } else {
      const k = r.int(1, 6);
      const p = r.int(-4, 4);
      fTex = `\\dfrac{${minus("x", p)}}{x^{2} + ${k}}`;
      ans = [iv(-Infinity, Infinity)];
      sol = [`El denominador $x^2 + ${k}$ nunca se anula porque $x^2 \\ge 0$.`, "Es continua en todo $\\mathbb{R}$."];
    }
    return {
      statement: `¿En qué conjunto es continua $f(x) = ${fTex}$? Escríbelo como intervalo o unión de intervalos.`,
      parts: [{ kind: "interval", answer: ans, mistakes }],
      hints: [
        "Polinomios, racionales, raíces, exponenciales y logaritmos son continuos en todo su dominio.",
        "Así que el problema se reduce a hallar el dominio.",
      ],
      solution: sol,
    };
  },
};

const valorEvitable: ExerciseGen = {
  id: "valor-evitable",
  title: "Redefinir para quitar una discontinuidad",
  level: 1,
  generate: (r) => {
    const a = r.nz(-5, 5);
    let s: number;
    do s = r.int(-5, 5); while (s === a);
    const ans = a - s;
    const num = poly([1, -(a + s), a * s]);
    const mistakes = [{ answer: "0", feedback: "Al sustituir sale $\\frac{0}{0}$, que no vale cero. Es una indeterminación: factoriza y simplifica." }].filter(() => ans !== 0);
    return {
      statement: `Sea $$G(x) = ${cases([[`\\dfrac{${num}}{${minus("x", a)}}`, `x \\neq ${a}`], ["A", `x = ${a}`]])}$$ ¿Qué valor de $A$ hace que $G$ sea continua en $x = ${a}$?`,
      parts: [{ kind: "expr", before: "A =", answer: String(ans), mistakes }],
      hints: [`Calcula $${lim(String(a))} G(x)$. Factoriza el numerador: una de sus raíces es $${a}$.`],
      solution: [
        `$${num} = (${minus("x", a)})(${minus("x", s)})$.`,
        `Para $x \\neq ${a}$: $G(x) = ${minus("x", s)}$, así que $${lim(String(a))} G(x) = ${a} ${signed(-s)} = ${ans}$.`,
        `Para que sea continua, $G(${a})$ tiene que ser igual al límite: $A = ${ans}$. La discontinuidad era evitable.`,
      ],
    };
  },
};

const trozosUnPunto: ExerciseGen = {
  id: "trozos-un-punto",
  title: "Continuidad de una función a trozos en un punto",
  level: 2,
  generate: (r) => {
    const a = r.int(-3, 3);
    const t = r.pick(["continua", "evitable", "salto", "salto"] as Tipo[]);
    const L1 = r.int(-5, 5);
    const L2 = t === "salto" ? L1 + r.nz(-4, 4) : L1;
    const c = t === "evitable" ? L1 + r.nz(-3, 3) : t === "continua" ? L1 : r.pick([L1, L2, L1 + r.nz(-2, 2)]);
    const m1 = r.nz(-3, 3);
    const left = lineTex(m1, L1 - m1 * a);
    const k = r.int(-3, 3);
    const right = poly([1, k, L2 - a * a - k * a]);
    const rightFirst = r.bool();
    const rows: [string, string][] = [[left, `x < ${a}`], [right, `x > ${a}`]];
    if (rightFirst) rows.reverse();
    rows.push([String(c), `x = ${a}`]);
    const fTex = cases(rows);
    return {
      statement: `Analiza la continuidad en $x = ${a}$ de $$f(x) = ${fTex}$$ Si es discontinua, señala el tipo de discontinuidad.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Límite por la izquierda:", before: `${lim(`${a}^-`)} f(x) =`, answer: String(L1), special: ["inf", "-inf", "dne"], mistakes: L1 !== L2 ? [{ answer: String(L2), feedback: `Usaste la rama de la derecha. Para $x < ${a}$ la fórmula es $${left}$.` }] : [] },
        { kind: "expr", prompt: "Límite por la derecha:", before: `${lim(`${a}^+`)} f(x) =`, answer: String(L2), special: ["inf", "-inf", "dne"], mistakes: L1 !== L2 ? [{ answer: String(L1), feedback: `Usaste la rama de la izquierda. Para $x > ${a}$ la fórmula es $${right}$.` }] : [] },
        { kind: "expr", prompt: "Valor de la función:", before: `f(${a}) =`, answer: String(c) },
        tipoChoice(t, "Conclusión:"),
      ],
      hints: [
        "Cada límite lateral se calcula con la rama que vale de ese lado.",
        `El valor $f(${a})$ sale de la fila que dice $x = ${a}$.`,
      ],
      solution: [
        `Por la izquierda: $${lim(`${a}^-`)} (${left}) = ${L1}$.`,
        `Por la derecha: $${lim(`${a}^+`)} (${right}) = ${L2}$.`,
        `Valor: $f(${a}) = ${c}$.`,
        {
          continua: `Los laterales son iguales y coinciden con $f(${a})$. Es continua en $x = ${a}$.`,
          evitable: `El límite existe y vale $${L1}$, pero $f(${a}) = ${c}$. Discontinuidad evitable.`,
          salto: `Los laterales son finitos y distintos, el límite no existe. Discontinuidad inevitable de salto.`,
          infinita: "",
        }[t],
      ],
    };
  },
};

const parametroContinua: ExerciseGen = {
  id: "parametro-continua",
  title: "Hallar un parámetro para que sea continua",
  level: 2,
  generate: (r) => {
    const kind = r.pick(["racional", "lineal"] as const);
    if (kind === "racional") {
      // (kx + m)/(n x) si x < 1, C si x >= 1:  (k + m)/n = C
      const n = r.pick([2, 3]);
      const C = r.int(-4, 10);
      const m = r.nz(-5, 5);
      const k = C * n - m;
      return {
        statement: `Sea $$f(x) = ${cases([[`\\dfrac{kx ${signed(m)}}{${n}x}`, "x < 1"], [String(C), "1 \\le x < 2"], ["x^{2} + 1", "x \\ge 2"]])}$$ Determina el valor de $k$ para que $f$ sea continua en $x = 1$.`,
        parts: [{ kind: "expr", before: "k =", answer: String(k) }],
        hints: ["Para $x$ cerca de 1 por la izquierda manda la primera rama. Por la derecha y en el punto manda la segunda.", "Iguala el límite por la izquierda con $f(1)$."],
        solution: [
          `$f(1) = ${C}$ y $${lim("1^+")} f(x) = ${C}$.`,
          `$${lim("1^-")} \\dfrac{kx ${signed(m)}}{${n}x} = \\dfrac{k ${signed(m)}}{${n}}$.`,
          `Igualando: $\\dfrac{k ${signed(m)}}{${n}} = ${C}$, de donde $k ${signed(m)} = ${C * n}$ y $k = ${k}$.`,
        ],
      };
    }
    const a = r.nz(-3, 3);
    const k = r.nz(-4, 4);
    const q = r.int(-5, 5);
    const p = a * a + q - k * a;
    const ka = a === 1 ? "k" : a === -1 ? "-k" : `${a}k`;
    const pc = p === 0 ? "" : ` ${signed(p)}`;
    return {
      statement: `Sea $$f(x) = ${cases([[`kx${pc}`, `x < ${a}`], [`x^{2}${q === 0 ? "" : ` ${signed(q)}`}`, `x \\ge ${a}`]])}$$ Determina $k$ para que $f$ sea continua en $x = ${a}$.`,
      parts: [{ kind: "expr", before: "k =", answer: String(k) }],
      hints: [`Calcula $f(${a})$ con la segunda rama y el límite por la izquierda con la primera.`],
      solution: [
        `$f(${a}) = ${lim(`${a}^+`)} f(x) = (${a})^2 ${signed(q)} = ${a * a + q}$.`,
        `$${lim(`${a}^-`)} f(x) = ${ka}${pc}$.`,
        `Igualando: $${ka}${pc} = ${a * a + q}$, así que $${ka} = ${a * a + q - p}$ y $k = ${k}$.`,
      ],
    };
  },
};

const bolzano: ExerciseGen = {
  id: "bolzano",
  title: "Localizar una raíz con Bolzano",
  level: 2,
  generate: (r) => {
    let b = 1, c = 0, n = 99;
    const P = (x: number) => x ** 3 + b * x + c;
    for (;;) {
      b = r.int(1, 5);
      c = r.int(-25, 25);
      n = [-3, -2, -1, 0, 1, 2].find((k) => P(k) < 0 && P(k + 1) > 0) ?? 99;
      if (n !== 99 && P(n) !== 0 && P(n + 1) !== 0) break;
    }
    const others = r.sample([-3, -2, -1, 0, 1, 2].filter((k) => k !== n), 3);
    const fTex = poly([1, 0, b, c]);
    const ivt = (k: number) => `$[${k}, ${k + 1}]$`;
    return {
      statement: `El polinomio $p(x) = ${fTex}$ tiene una sola raíz real. ¿En cuál de estos intervalos garantiza el teorema de Bolzano que está?`,
      parts: [
        choice(
          ivt(n),
          others.map((k) => [ivt(k), `$p(${k}) = ${P(k)}$ y $p(${k + 1}) = ${P(k + 1)}$ tienen el mismo signo. Bolzano no garantiza una raíz ahí.`] as [Rich, Rich]),
        ),
      ],
      hints: ["Evalúa $p$ en los extremos de cada intervalo.", "Busca el intervalo donde $p$ cambia de signo."],
      solution: [
        "$p$ es un polinomio, así que es continuo en cualquier intervalo cerrado.",
        `$p(${n}) = ${P(n)} < 0$ y $p(${n + 1}) = ${P(n + 1)} > 0$.`,
        `Por Bolzano existe $c \\in (${n}, ${n + 1})$ con $p(c) = 0$.`,
      ],
    };
  },
};

const racionalTipos: ExerciseGen = {
  id: "racional-tipos",
  title: "Discontinuidades de una racional",
  level: 2,
  exam: true,
  generate: (r) => {
    const h = r.int(-4, 4);
    let a: number;
    do a = r.int(-4, 4); while (a === h);
    let s: number;
    do s = r.int(-5, 5); while (s === a || s === h);
    const L = frac(h - s, h - a);
    const num = poly([1, -(h + s), h * s]);
    const den = poly([1, -(h + a), h * a]);
    return {
      statement: `Estudia las discontinuidades de $f(x) = \\dfrac{${num}}{${den}}$ y clasifícalas.`,
      sequential: true,
      parts: [
        {
          kind: "expr",
          prompt: `Calcula el límite en el punto donde se anulan numerador y denominador, $x = ${h}$:`,
          before: `${lim(String(h))} f(x) =`,
          answer: L,
          special: ["inf", "-inf", "dne"],
          mistakes: [{ answer: "0", feedback: "Sustituir da $\\frac{0}{0}$, que es una indeterminación y no vale $0$. Factoriza y simplifica." }],
        },
        tipoChoice("evitable", `Tipo de discontinuidad en $x = ${h}$:`),
        tipoChoice("infinita", `Tipo de discontinuidad en $x = ${a}$:`),
      ],
      hints: [
        "Factoriza numerador y denominador.",
        "Donde el factor se cancela, el límite existe. Donde solo se anula el denominador, la función se dispara.",
      ],
      solution: [
        `$f(x) = \\dfrac{(${minus("x", h)})(${minus("x", s)})}{(${minus("x", h)})(${minus("x", a)})} = \\dfrac{${minus("x", s)}}{${minus("x", a)}}$ para $x \\neq ${h}$.`,
        `En $x = ${h}$: el límite vale $\\frac{${h - s}}{${h - a}} = ${L}$, pero $f(${h})$ no existe. Discontinuidad evitable.`,
        `En $x = ${a}$: el numerador simplificado vale $${a - s} \\neq 0$ y el denominador tiende a $0$. Los laterales son infinitos: discontinuidad infinita.`,
      ],
    };
  },
};

const bosquejoDisc: ExerciseGen = {
  id: "bosquejo-discontinuidades",
  title: "Gráfica con tipos de discontinuidad dados",
  level: 2,
  exam: true,
  generate: (r) => {
    const [pE, pS, pI] = r.sample([-5, -3, -1, 1, 3, 5], 3);
    const good = multiDisc([{ x: pE, t: "E" }, { x: pS, t: "S" }, { x: pI, t: "I" }]);
    const wrong = [
      { graph: multiDisc([{ x: pE, t: "S" }, { x: pS, t: "E" }, { x: pI, t: "I" }]), feedback: `Aquí los tipos en $x = ${pE}$ y $x = ${pS}$ están cambiados: el salto está en $${pE}$ y el hueco en $${pS}$.` },
      { graph: multiDisc([{ x: pE, t: "E" }, { x: pS, t: "E" }, { x: pI, t: "I" }]), feedback: `En $x = ${pS}$ esta gráfica tiene un hueco, que es evitable. Se pedía un salto: dos alturas distintas a cada lado.` },
      { graph: multiDisc([{ x: pE, t: "E" }, { x: pS, t: "S" }, { x: pI, t: "S" }]), feedback: `En $x = ${pI}$ esta gráfica salta pero no se dispara. Una discontinuidad infinita necesita una asíntota vertical.` },
    ];
    const all = r.shuffle([{ graph: good, ok: true, feedback: undefined as string | undefined }, ...wrong.map((w) => ({ ...w, ok: false }))]);
    return {
      statement: `Se quiere graficar una función continua en $\\mathbb{R}$ salvo en tres puntos:\n\n- discontinuidad evitable en $x = ${pE}$\n- inevitable de salto en $x = ${pS}$\n- inevitable infinita en $x = ${pI}$\n\n¿Cuál gráfica cumple todo?`,
      parts: [
        {
          kind: "choice",
          shuffle: false,
          options: all.map((o, i) => ({ label: `Gráfica ${"ABCD"[i]}`, correct: o.ok || undefined, feedback: o.feedback, graph: o.graph })),
        },
      ],
      hints: ["Evitable: un hueco, con o sin un punto suelto en otra altura. Salto: la curva termina en una altura y sigue en otra. Infinita: asíntota vertical."],
      solution: [
        `En $x = ${pE}$ tiene que verse un hueco: el límite existe pero no coincide con el valor.`,
        `En $x = ${pS}$ la curva corta y sigue más arriba o más abajo: laterales finitos distintos.`,
        `En $x = ${pI}$ la curva se dispara a los dos lados de una asíntota vertical.`,
      ],
    };
  },
};

const trozosDosPuntos: ExerciseGen = {
  id: "trozos-dos-puntos",
  title: "Continuidad en dos puntos de una función a trozos (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const x1 = r.int(-3, 0);
    const x2 = x1 + r.int(2, 4);
    const t1 = r.pick(["continua", "evitable", "salto"] as Tipo[]);
    const t2 = r.pick(["continua", "salto", "infinita"] as Tipo[]);
    // Rama 1: (x - x1)(x + u)/(x - x1), límite x1 + u
    const u = r.int(-4, 4);
    const L1 = x1 + u;
    const num1 = poly([1, u - x1, -x1 * u]);
    // Rama 2: m x + n en el tramo del medio
    const m = r.nz(-2, 2);
    const R1 = t1 === "salto" ? L1 + r.nz(-3, 3) : L1; // límite por la derecha en x1
    const n = R1 - m * x1;
    const V2 = m * x2 + n;
    const c1 = L1 + r.nz(-3, 3);
    // Rama 3
    let r3: string, R2: string, sol3: string;
    if (t2 === "infinita") {
      const k = r.pick([-2, -1, 1, 2, 3]);
      r3 = `\\dfrac{${k}}{${minus("x", x2)}}`;
      R2 = inf(k);
      sol3 = `$${lim(`${x2}^+`)} \\dfrac{${k}}{${minus("x", x2)}} = ${inf(k)}$, porque el denominador tiende a $0^+$.`;
    } else {
      const target = t2 === "continua" ? V2 : V2 + r.nz(-3, 3);
      const k = r.int(-2, 2);
      r3 = poly([1, k, target - x2 * x2 - k * x2]);
      R2 = String(target);
      sol3 = `$${lim(`${x2}^+`)} (${r3}) = ${target}$.`;
    }
    const rows: [string, string][] = [[`\\dfrac{${num1}}{${minus("x", x1)}}`, `x < ${x1}`]];
    if (t1 === "evitable") {
      rows.push([String(c1), `x = ${x1}`]);
      rows.push([lineTex(m, n), `${x1} < x \\le ${x2}`]);
    } else rows.push([lineTex(m, n), `${x1} \\le x \\le ${x2}`]);
    rows.push([r3, `x > ${x2}`]);
    const f1 = t1 === "evitable" ? c1 : R1;
    return {
      statement: `Dada $$f(x) = ${cases(rows)}$$ estudia la continuidad de $f$ en $x = ${x1}$ y en $x = ${x2}$. Si es discontinua, indica el tipo de discontinuidad.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: `En $x = ${x1}$, límite por la izquierda:`, before: `${lim(`${x1}^-`)} f(x) =`, answer: String(L1), special: ["inf", "-inf", "dne"], mistakes: [{ answer: "0", feedback: "Sustituir da $\\frac{0}{0}$. Factoriza el numerador y simplifica." }].filter(() => L1 !== 0) },
        { kind: "expr", prompt: `En $x = ${x1}$, límite por la derecha:`, before: `${lim(`${x1}^+`)} f(x) =`, answer: String(R1), special: ["inf", "-inf", "dne"] },
        { kind: "expr", prompt: `Valor en el punto:`, before: `f(${x1}) =`, answer: String(f1) },
        tipoChoice(t1, `Conclusión en $x = ${x1}$:`),
        { kind: "expr", prompt: `En $x = ${x2}$, límite por la derecha:`, before: `${lim(`${x2}^+`)} f(x) =`, answer: R2, special: ["inf", "-inf", "dne"] },
        tipoChoice(t2, `Conclusión en $x = ${x2}$ (recuerda que $f(${x2}) = ${V2}$ y el límite por la izquierda también vale $${V2}$):`),
      ],
      hints: [
        `La primera rama da $\\frac{0}{0}$ en $x = ${x1}$. Factoriza su numerador.`,
        "Cada lateral se calcula con la rama de ese lado. El valor en el punto sale de la rama cuyo tramo incluye al punto.",
        "Laterales iguales pero distinto de $f(a)$: evitable. Laterales finitos distintos: salto. Algún lateral infinito: infinita.",
      ],
      solution: [
        `En $x = ${x1}$ por la izquierda: $\\dfrac{${num1}}{${minus("x", x1)}} = \\dfrac{${u === 0 ? "x" : `(${minus("x", -u)})`}(${minus("x", x1)})}{${minus("x", x1)}} = ${minus("x", -u)}$, así que el límite es $${L1}$.`,
        `Por la derecha manda $${lineTex(m, n)}$: el límite es $${R1}$. ${t1 === "evitable" ? `Y $f(${x1}) = ${c1}$ por la fila aparte.` : `Y $f(${x1}) = ${R1}$.`}`,
        {
          continua: `Laterales iguales y iguales a $f(${x1})$: continua en $x = ${x1}$.`,
          evitable: `El límite existe ($${L1}$) pero $f(${x1}) = ${c1}$: discontinuidad evitable en $x = ${x1}$.`,
          salto: `Laterales finitos y distintos ($${L1}$ y $${R1}$): discontinuidad de salto en $x = ${x1}$.`,
          infinita: "",
        }[t1],
        `En $x = ${x2}$: $f(${x2}) = ${V2}$ y por la izquierda el límite también es $${V2}$. Por la derecha, ${sol3}`,
        {
          continua: `Todo coincide: continua en $x = ${x2}$.`,
          salto: `Laterales finitos y distintos: discontinuidad de salto en $x = ${x2}$.`,
          infinita: `Un lateral es infinito: discontinuidad infinita en $x = ${x2}$, con asíntota vertical.`,
          evitable: "",
        }[t2],
      ],
    };
  },
};

const parametrosDos: ExerciseGen = {
  id: "parametros-dos",
  title: "Dos parámetros para que sea continua (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const x1 = r.int(-2, 1);
    const x2 = x1 + r.int(1, 3);
    let a: number, b: number;
    do {
      a = r.nz(-4, 4);
      b = r.int(-5, 5);
    } while (a * x1 + b === x1 * x1);
    // rama izquierda: (x - x1)(x + u)/(x - x1), con límite x1 + u = a x1 + b
    const u = a * x1 + b - x1;
    const num1 = poly([1, u - x1, -x1 * u]);
    const c2 = a * x2 + b + x2 * x2;
    const left = `\\dfrac{${num1}}{${minus("x", x1)}}`;
    const right = poly([-1, 0, c2]);
    const v1 = a * x1 + b;
    const v2 = a * x2 + b;
    return {
      statement: `Sea $$f(x) = ${cases([[left, `x < ${x1}`], ["ax + b", `${x1} \\le x \\le ${x2}`], [right, `x > ${x2}`]])}$$ Determina $a$ y $b$ para que $f$ sea continua en todo $\\mathbb{R}$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: `Primero, $${lim(`${x1}^-`)} f(x)$:`, before: `${lim(`${x1}^-`)} f(x) =`, answer: String(v1), special: ["inf", "-inf", "dne"] },
        { kind: "expr", prompt: `Y $${lim(`${x2}^+`)} f(x)$:`, before: `${lim(`${x2}^+`)} f(x) =`, answer: String(v2), special: ["inf", "-inf", "dne"] },
        { kind: "expr", prompt: "Resuelve el sistema.", before: "a =", answer: String(a) },
        { kind: "expr", before: "b =", answer: String(b) },
      ],
      hints: [
        "Las ramas de los extremos son continuas en sus tramos. Solo hay que revisar $x = " + x1 + "$ y $x = " + x2 + "$.",
        `En $x = ${x1}$ la condición es $${lim(`${x1}^-`)} f(x) = f(${x1}) = ${x1}a + b$. En $x = ${x2}$ es $f(${x2}) = ${x2}a + b = ${lim(`${x2}^+`)} f(x)$.`,
        "Resta las dos ecuaciones para despejar $a$.",
      ],
      solution: [
        `En $x = ${x1}$: $${left} = ${minus("x", -u)}$ para $x \\neq ${x1}$, así que el límite por la izquierda es $${v1}$. Como $f(${x1}) = ${x1 === 0 ? "b" : `${x1 === 1 ? "" : x1 === -1 ? "-" : x1}a + b`}$, queda $${x1 === 0 ? "b" : `${x1 === 1 ? "" : x1 === -1 ? "-" : x1}a + b`} = ${v1}$.`,
        `En $x = ${x2}$: $${lim(`${x2}^+`)} (${right}) = ${v2}$, y $f(${x2}) = ${x2 === 0 ? "b" : `${x2 === 1 ? "" : x2 === -1 ? "-" : x2}a + b`}$, así que $${x2 === 0 ? "b" : `${x2 === 1 ? "" : x2 === -1 ? "-" : x2}a + b`} = ${v2}$.`,
        `Restando: $${x2 - x1 === 1 ? "" : x2 - x1}a = ${v2 - v1}$, de donde $a = ${a}$ y $b = ${b}$.`,
      ],
    };
  },
};

const vfContinuidad: ExerciseGen = {
  id: "vf-continuidad",
  title: "Verdadero o falso sobre continuidad (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const a = r.int(-5, 5);
    const items: [string, boolean, string][] = [
      [`Si existe $${lim(String(a))} f(x)$, entonces $f$ es continua en $x = ${a}$.`, false, `El límite puede existir y aun así $f(${a})$ no existir o ser distinto. Eso es una discontinuidad evitable.`],
      [`Si $f$ es continua en $x = ${a}$, entonces existe $${lim(String(a))} f(x)$.`, true, "La continuidad pide justamente que el límite exista y valga $f(a)$."],
      ["Para que exista $\\lim_{x \\to a} f(x)$, $f$ tiene que estar definida en $x = a$.", false, "El límite mira los valores cerca de $a$, no en $a$. Por ejemplo $\\frac{x^2-1}{x-1}$ tiene límite $2$ en $x=1$ sin estar definida ahí."],
      ["Una discontinuidad de salto se elimina redefiniendo el valor de $f$ en el punto.", false, "En un salto los laterales son distintos, el límite no existe y ningún valor de $f(a)$ lo arregla. Por eso es inevitable."],
      ["Si $f$ es continua en $[a, b]$ y $f(a) \\cdot f(b) < 0$, entonces $f$ tiene al menos una raíz en $(a, b)$.", true, "Es el teorema de Bolzano: valores de signo contrario en los extremos de un intervalo donde la función es continua."],
      ["Si $f(a) \\cdot f(b) < 0$, entonces $f$ tiene una raíz en $(a, b)$, aunque no sea continua.", false, "Sin continuidad no vale. $f(x) = \\frac{1}{x}$ cumple $f(-1) \\cdot f(1) < 0$ y nunca vale cero."],
      ["Si $f$ es continua en $[a, b]$, entonces alcanza un valor máximo y un valor mínimo en $[a, b]$.", true, "Es el teorema de Weierstrass. El intervalo tiene que ser cerrado y acotado."],
      ["Si $f$ es continua en $(0, 1)$, entonces alcanza un valor máximo en $(0, 1)$.", false, "En intervalos abiertos no se garantiza. $f(x) = \\frac{1}{x}$ es continua en $(0,1)$ y crece sin control cerca de $0$."],
      ["Si $f$ y $g$ son continuas en $x = a$, entonces $f + g$ y $f \\cdot g$ también lo son.", true, "Las operaciones de suma y producto conservan la continuidad."],
      ["Si $f$ y $g$ son continuas en $x = a$, entonces $\\frac{f}{g}$ es continua en $x = a$.", false, "Falta pedir $g(a) \\neq 0$. Si $g(a) = 0$ el cociente ni siquiera está definido en $a$."],
    ];
    const [claim, ok, why] = r.pick(items);
    return {
      statement: `${claim} ¿Verdadero o falso?`,
      parts: [trueFalse(ok, why)],
      hints: ["Recuerda las tres condiciones: $f(a)$ existe, el límite existe y son iguales. Para los teoremas, revisa las hipótesis."],
      solution: [`${ok ? "Verdadero" : "Falso"}. ${why}`],
    };
  },
};

const taparHueco: ExerciseGen = {
  id: "tapar-hueco",
  title: "Tapar el hueco de una discontinuidad evitable",
  level: 1,
  generate: (r) => {
    const tpl = r.pick(["cuadrados", "trinomio", "redefinir"] as const);
    let a: number, s: number;
    if (tpl === "cuadrados") {
      a = r.nz(-3, 3);
      s = -a;
    } else {
      a = r.int(-4, 4);
      do s = r.int(-5, 5); while (s === a || Math.abs(a - s) > 6);
    }
    const L = a - s;
    const num = tpl === "cuadrados" ? `x^{2} - ${a * a}` : poly([1, -(a + s), a * s]);
    const frTex = `\\dfrac{${num}}{${minus("x", a)}}`;
    let c = 0;
    if (tpl === "redefinir") do c = r.int(-6, 6); while (c === L);
    const statement =
      tpl === "redefinir"
        ? `Sea $$G(x) = ${cases([[frTex, `x \\neq ${a}`], [String(c), `x = ${a}`]])}$$ El punto del plano es $(${a}, G(${a}))$. Muévelo hasta la altura que hace continua a $G$ en $x = ${a}$.`
        : `La función $f(x) = ${frTex}$ no está definida en $x = ${a}$, así que su gráfica tiene un hueco. Arrastra el punto hasta el lugar exacto que hay que rellenar para que $f$ sea continua.`;
    const factored = tpl === "cuadrados" ? `(${minus("x", a)})(${minus("x", -a)})` : `(${minus("x", a)})(${minus("x", s)})`;
    return {
      statement,
      parts: [
        {
          kind: "place",
          graph: { x: [-6, 6], y: [-8, 8], height: 280 },
          items: [{ type: "point", label: "P", answer: [a, L], start: tpl === "redefinir" ? [a, c] : [-5, 7] }],
          reveal: [{ fn: minus("x", s), breaks: [a], color: "accent" }],
        },
      ],
      hints: [
        tpl === "cuadrados" ? "El numerador es una diferencia de cuadrados." : `Factoriza el numerador: una de sus raíces es $${a}$.`,
        `Simplifica y calcula el límite cuando $x \\to ${a}$. Esa es la altura del hueco.`,
      ],
      solution: [
        `$${num} = ${factored}$. Para $x \\neq ${a}$ la fracción se simplifica a $${minus("x", s)}$.`,
        `$${lim(String(a))} ${tpl === "redefinir" ? "G" : "f"}(x) = ${a} ${signed(-s)} = ${L}$. El límite existe, así que la discontinuidad es evitable.`,
        tpl === "redefinir"
          ? `Hoy $G(${a}) = ${c}$, distinto del límite. Redefiniendo $G(${a}) = ${L}$ queda continua: el punto va en $(${a}, ${L})$.`
          : `Definiendo $f(${a}) = ${L}$ el hueco se tapa. El punto es $(${a}, ${L})$.`,
      ],
    };
  },
};

const continuidadSignos: ExerciseGen = {
  id: "continuidad-signos",
  title: "Continuidad de una raíz o un logaritmo de un cociente (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const kind = r.pick(["raiz", "log"] as const);
    const [p, q] = r.sample([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5], 2);
    const flip = r.bool();
    const numTex = flip ? (p === 0 ? "-x" : `${p} - x`) : minus("x", p);
    const denTex = minus("x", q);
    const quot = `\\dfrac{${numTex}}{${denTex}}`;
    const fTex = kind === "raiz" ? `\\sqrt{${quot}}` : `\\ln\\left(${quot}\\right)`;
    const pts = [p, q].sort((u, v) => u - v);
    const probe = [pts[0] - 1, (pts[0] + pts[1]) / 2, pts[1] + 1];
    const sg = (v: number) => (v > 0 ? 1 : -1) as 1 | -1;
    const sN = probe.map((x) => sg(flip ? p - x : x - p));
    const sD = probe.map((x) => sg(x - q));
    const sQ = sN.map((s, j) => (s * sD[j]) as 1 | -1);
    const bounds = [-Infinity, ...pts, Infinity];
    const build = (closeP: boolean): Interval[] =>
      sQ.flatMap((s, j) => {
        if (s < 0) return [];
        const lo = bounds[j];
        const hi = bounds[j + 1];
        return [iv(lo, hi, closeP && lo === p, closeP && hi === p)];
      });
    const ans = build(kind === "raiz");
    const mistakes: { answer: Interval[]; feedback: Rich }[] = [];
    if (kind === "raiz") {
      mistakes.push({ answer: build(false), feedback: `En $x = ${p}$ el cociente vale $0$ y $\\sqrt{0} = 0$ existe. Ese extremo entra.` });
      const withQ = ans.map((I) => ({ ...I, loClosed: I.loClosed || I.lo === q, hiClosed: I.hiClosed || I.hi === q }));
      mistakes.push({ answer: withQ, feedback: `En $x = ${q}$ se anula el denominador. Ahí la función no existe.` });
    } else {
      mistakes.push({ answer: build(true), feedback: `En $x = ${p}$ el argumento vale $0$ y $\\ln 0$ no existe. Ese extremo no entra.` });
    }
    const signWord = (s: number) => (s > 0 ? "+" : "-");
    return {
      statement: `Determina el conjunto donde es continua $$f(x) = ${fTex}$$`,
      sequential: true,
      parts: [
        {
          kind: "signs",
          prompt: "Primero, el signo del cociente. Completa la tabla.",
          points: pts.map(String),
          rows: [
            { label: numTex, signs: sN },
            { label: denTex, signs: sD },
            { label: `\\frac{${numTex}}{${denTex}}`, signs: sQ },
          ],
        },
        { kind: "interval", prompt: "Conjunto donde $f$ es continua:", answer: ans, mistakes },
      ],
      hints: [
        kind === "raiz"
          ? "La raíz es continua donde existe: el cociente tiene que ser mayor o igual que cero y el denominador distinto de cero."
          : "El logaritmo es continuo donde existe: su argumento tiene que ser estrictamente positivo.",
        `Los puntos críticos son $x = ${p}$, donde se anula el numerador, y $x = ${q}$, donde se anula el denominador.`,
        "Toma un número de prueba en cada intervalo y mira el signo de cada factor.",
      ],
      solution: [
        `${kind === "raiz" ? "La raíz" : "El logaritmo"} es continua en todo su dominio, así que basta resolver $${quot} ${kind === "raiz" ? "\\ge" : ">"} 0$.`,
        `Con los puntos críticos $${pts[0]}$ y $${pts[1]}$ quedan tres intervalos. El signo del cociente es $${sQ.map(signWord).join("\\;")}$, en ese orden.`,
        kind === "raiz"
          ? `Se toman los intervalos con signo $+$. Se agrega $x = ${p}$, donde el cociente vale $0$, y se excluye $x = ${q}$, donde el denominador se anula.`
          : `Se toman los intervalos con signo $+$, sin los extremos: en $x = ${p}$ el argumento vale $0$ y en $x = ${q}$ no existe.`,
        `$f$ es continua en $${unionTex(ans)}$.`,
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("continuidad"),
  objectives: [
    "Decidir si una función es continua en un punto revisando las tres condiciones.",
    "Clasificar una discontinuidad como evitable, de salto o infinita, con fórmulas y con gráficas.",
    "Estudiar la continuidad de funciones a trozos y hallar parámetros que la hagan continua.",
    "Usar los teoremas de Bolzano, del valor intermedio y de Weierstrass.",
  ],
  sections: [
    {
      id: "idea",
      title: "Sin levantar el lápiz",
      blocks: [
        {
          type: "text",
          md: "Un proceso es continuo cuando no tiene interrupciones. Con funciones pasa lo mismo: una función es continua en un punto si su gráfica pasa por ahí sin cortes, sin huecos y sin saltos. La prueba informal es dibujarla sin levantar el lápiz.\n\nPara convertir esa idea en algo que se pueda calcular, mira las formas en que una gráfica puede romperse en $x = a$:\n\n- La curva salta de una altura a otra, o se dispara al infinito. Ahí **no existe el límite**.\n- La curva llega a una altura pero el punto no está. Ahí **no existe $f(a)$**.\n- La curva llega a una altura y el punto está en otra. Ahí **el límite y $f(a)$ no coinciden**.\n\nPara que no ocurra ninguna de las tres hay que exigir lo contrario.",
        },
        {
          type: "definition",
          title: "Continuidad en un punto",
          md: "$f$ es continua en $x = a$ si\n\n$$\\lim_{x \\to a} f(x) = f(a)$$\n\nEsa igualdad encierra tres condiciones:\n\n- $f(a)$ existe.\n- $\\lim_{x \\to a} f(x)$ existe, es decir, los dos laterales existen, son finitos e iguales.\n- Los dos números anteriores son iguales.",
        },
        {
          type: "graph",
          spec: {
            x: [-4, 4],
            y: [-2, 6],
            curves: [{ fn: "\\frac{x^{2}}{2} + 1", color: "accent" }],
            points: [{ x: 1, y: 1.5, open: true }, { x: 1, y: 4, color: "accent" }],
          },
          caption: "Aquí $\\lim_{x \\to 1} f(x) = 1{,}5$ pero $f(1) = 4$. Falla la tercera condición.",
        },
        {
          type: "example",
          title: "Revisar las tres condiciones",
          problem: "¿Es continua $f(x) = x^2 - 3x$ en $x = 2$?",
          steps: [
            "$f(2) = 4 - 6 = -2$. Existe.",
            "$\\lim_{x \\to 2} (x^2 - 3x) = -2$, por sustitución directa en un polinomio.",
            "Límite y valor coinciden.",
          ],
          answer: "Sí, es continua en $x = 2$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Si $\\lim_{x \\to 3} f(x) = 5$ y $f(3) = 5$, entonces $f$ es continua en $x = 3$.",
            parts: [trueFalse(true, "Se cumplen las tres condiciones: el valor existe, el límite existe y coinciden.")],
            solution: ["Sí. El límite existe y es igual a $f(3)$."],
          },
        },
      ],
    },
    {
      id: "conjuntos",
      title: "Continuidad en conjuntos e intervalos",
      blocks: [
        {
          type: "text",
          md: "Revisar punto por punto sería eterno. Por suerte, las operaciones conservan la continuidad: si $f$ y $g$ son continuas en $a$, también lo son $f + g$, $f - g$, $f \\cdot g$ y $\\frac{f}{g}$ (esta última si $g(a) \\neq 0$). La composición también: si $f$ es continua en $a$ y $g$ en $f(a)$, entonces $g \\circ f$ es continua en $a$.\n\nDe ahí sale una regla práctica: las funciones de uso frecuente son continuas en todo su dominio.",
        },
        {
          type: "table",
          headers: ["Función", "Es continua en"],
          rows: [
            ["Polinomio", "Todo $\\mathbb{R}$"],
            ["Racional $\\frac{p(x)}{q(x)}$", "$\\mathbb{R}$ menos los ceros de $q$"],
            ["$\\sqrt{u(x)}$", "Donde $u(x) \\ge 0$"],
            ["$e^{u(x)}$, $a^{u(x)}$", "Donde $u$ es continua"],
            ["$\\ln u(x)$", "Donde $u(x) > 0$"],
          ],
        },
        {
          type: "definition",
          title: "Continuidad lateral",
          md: "$f$ es continua **por la izquierda** de $a$ si $\\lim_{x \\to a^-} f(x) = f(a)$, y **por la derecha** si $\\lim_{x \\to a^+} f(x) = f(a)$.\n\n$f$ es continua en $[a, b]$ si es continua en cada punto de $(a, b)$, continua por la derecha en $a$ y por la izquierda en $b$.",
        },
        {
          type: "example",
          title: "La raíz en el borde de su dominio",
          problem: "¿Dónde es continua $f(x) = \\sqrt{x - 1}$?",
          steps: [
            "El dominio es $[1, +\\infty)$.",
            "En $x = 1$ no hay nada a la izquierda. Basta la continuidad por la derecha: $\\lim_{x \\to 1^+} \\sqrt{x-1} = 0 = f(1)$.",
            "En cualquier $x > 1$ es continua por ser raíz de algo positivo.",
          ],
          answer: "Es continua en $[1, +\\infty)$, todo su dominio.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿En qué conjunto es continua $f(x) = \\dfrac{x + 1}{x^2 - 4}$?",
            parts: [{ kind: "interval", answer: minusPoints([iv(-Infinity, Infinity)], [-2, 2]), mistakes: [{ answer: minusPoints([iv(-Infinity, Infinity)], [-1]), feedback: "El cero del numerador no estorba. Hay que quitar los ceros del denominador." }] }],
            solution: ["$x^2 - 4 = 0$ en $x = \\pm 2$. Es continua en $(-\\infty, -2) \\cup (-2, 2) \\cup (2, +\\infty)$."],
          },
        },
      ],
    },
    {
      id: "tipos",
      title: "Tipos de discontinuidad",
      blocks: [
        {
          type: "text",
          md: "Cuando una función no es continua en $a$ se dice que tiene una discontinuidad ahí. La pregunta del parcial casi siempre es de qué tipo. La clasificación depende de si el límite existe.",
        },
        {
          type: "table",
          headers: ["Tipo", "Qué pasa con los laterales"],
          rows: [
            ["Evitable", "Existen, son finitos e iguales, pero $f(a)$ no existe o es distinto. Se arregla poniendo $f(a)$ igual al límite."],
            ["Inevitable de salto", "Existen, son finitos y distintos. Redefinir $f(a)$ no lo arregla."],
            ["Inevitable infinita", "Al menos uno es $\\pm\\infty$. Redefinir $f(a)$ no lo arregla."],
          ],
        },
        { type: "graph", spec: oneDisc("evitable", 0, 1, 3, true), caption: "Evitable: un hueco. El límite existe, el punto falta." },
        { type: "graph", spec: oneDisc("salto", 0, -1, 3), caption: "De salto: por la izquierda llega a $-1$ y por la derecha arranca en $2$." },
        { type: "graph", spec: oneDisc("infinita", 0, 1), caption: "Infinita: la curva se dispara, hay asíntota vertical." },
        {
          type: "example",
          title: "¿Se puede elegir el valor? (pregunta de parcial)",
          problem: "Sea $G(x) = \\dfrac{x^2 - 16}{x - 4}$ si $x \\neq 4$ y $G(4) = A$. ¿Se puede elegir $A$ para que $G$ sea continua?",
          steps: [
            "Para $x \\neq 4$: $\\dfrac{(x-4)(x+4)}{x-4} = x + 4$.",
            "$\\lim_{x \\to 4} G(x) = 8$. El límite existe.",
            "Basta tomar $A = 8$ para que el valor coincida con el límite.",
          ],
          answer: "Sí, con $A = 8$. La discontinuidad era evitable.",
        },
        {
          type: "quick",
          exercise: {
            statement: "La gráfica de $f(x) = \\dfrac{x^2 - 9}{x - 3}$ tiene un hueco. Arrastra el punto hasta el lugar que lo tapa.",
            parts: [
              {
                kind: "place",
                graph: { x: [-6, 6], y: [-4, 10], height: 260 },
                items: [{ type: "point", label: "P", answer: [3, 6], start: [-4, -2] }],
                reveal: [{ fn: "x+3", breaks: [3], color: "accent" }],
              },
            ],
            hints: ["Factoriza $x^2 - 9$ y simplifica. El hueco está en $x = 3$ y su altura es el límite."],
            solution: ["Para $x \\neq 3$, $f(x) = x + 3$. El límite en $3$ vale $6$, así que el punto que falta es $(3, 6)$."],
          },
        },
        {
          type: "note",
          tone: "warning",
          title: "Evitable no quiere decir que no importe",
          md: "Una discontinuidad evitable sigue siendo una discontinuidad. La función tal como está escrita no es continua. Lo de \"evitable\" solo dice que redefiniendo un punto se podría arreglar.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Si $\\lim_{x \\to 1^-} f(x) = 2$ y $\\lim_{x \\to 1^+} f(x) = -1$, ¿qué tipo de discontinuidad tiene $f$ en $x = 1$?",
            parts: [tipoChoice("salto")],
            solution: ["Los laterales son finitos y distintos: discontinuidad de salto, sin importar cuánto valga $f(1)$."],
          },
        },
      ],
    },
    {
      id: "trozos",
      title: "Funciones a trozos",
      blocks: [
        {
          type: "text",
          md: "Es el ejercicio más repetido del segundo parcial. Dentro de cada tramo la fórmula suele ser continua. Los puntos que hay que revisar son los de cambio de rama y los que anulan un denominador dentro de su propio tramo.\n\nEn cada punto de cambio el procedimiento es siempre el mismo:\n\n- Calcula el límite por la izquierda con la rama de la izquierda.\n- Calcula el límite por la derecha con la rama de la derecha.\n- Calcula $f(a)$ con la rama cuyo tramo incluye al punto.\n- Compara y clasifica.",
        },
        {
          type: "example",
          title: "Un solo punto",
          problem: "Analiza la continuidad en $x = 2$ de $f(x) = \\begin{cases} 3 - 2x & \\text{si } x > 2 \\\\ x^2 - 5 & \\text{si } x < 2 \\\\ 1 & \\text{si } x = 2 \\end{cases}$",
          steps: [
            "Por la izquierda: $\\lim_{x \\to 2^-} (x^2 - 5) = -1$.",
            "Por la derecha: $\\lim_{x \\to 2^+} (3 - 2x) = -1$.",
            "El límite existe y vale $-1$. Pero $f(2) = 1$.",
          ],
          answer: "Discontinuidad evitable en $x = 2$.",
        },
        {
          type: "example",
          title: "Varios puntos, tipo parcial",
          problem: "Estudia la continuidad de $g$ en $x = -3$, $x = 0$, $x = \\frac{1}{2}$ y $x = 5$: $$g(x) = \\begin{cases} 3 & \\text{si } x < -3 \\\\ |x + 2| - 3 & \\text{si } -3 \\le x \\le 0 \\\\ 2x - 1 & \\text{si } 0 < x \\le 5,\\ x \\neq \\frac{1}{2} \\\\ \\dfrac{1}{x - 5} & \\text{si } x > 5 \\end{cases}$$",
          steps: [
            "En $x = -3$: por la izquierda vale $3$. Por la derecha $|{-3} + 2| - 3 = -2$. Laterales finitos y distintos: **salto**.",
            "En $x = 0$: por la izquierda $|2| - 3 = -1$, por la derecha $2 \\cdot 0 - 1 = -1$, y $g(0) = -1$. **Continua**.",
            "En $x = \\frac{1}{2}$: la función no está definida, pero $\\lim_{x \\to 1/2} (2x - 1) = 0$. El límite existe: **evitable**.",
            "En $x = 5$: $g(5) = 9$ y por la izquierda el límite es $9$. Por la derecha $\\frac{1}{x - 5} \\to +\\infty$. **Infinita**.",
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "Cuidado con qué rama usas",
          md: "El error típico es calcular los dos laterales con la misma fórmula. Lee bien los tramos: el signo $<$ o $\\le$ decide a qué rama pertenece el punto, y eso es lo que da $f(a)$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Qué pasa en $x = 1$ con esta función?\n\n$$f(x) = \\begin{cases} x + 1 & \\text{si } x \\le 1 \\\\ 3x - 1 & \\text{si } x > 1 \\end{cases}$$",
            parts: [tipoChoice("continua")],
            solution: ["Por la izquierda y en el punto vale $2$. Por la derecha $3 - 1 = 2$. Es continua."],
          },
        },
      ],
    },
    {
      id: "parametros",
      title: "Parámetros para que sea continua",
      blocks: [
        {
          type: "text",
          md: "Otra variante clásica: la función trae una letra, como $a$ o $k$, y te piden su valor para que sea continua en un punto. Se plantea la condición de continuidad como una ecuación: límite por la izquierda igual a límite por la derecha igual a $f(a)$. Con dos letras salen dos ecuaciones, una por cada punto de cambio.",
        },
        {
          type: "example",
          title: "Un parámetro",
          problem: "Sea $f(x) = \\dfrac{ax + 3}{2x}$ si $x < 1$, $f(x) = 10$ si $1 \\le x < 2$. Determina $a$ para que $f$ sea continua en $x = 1$.",
          steps: [
            "$f(1) = 10$ y por la derecha el límite también es $10$.",
            "Por la izquierda: $\\lim_{x \\to 1^-} \\dfrac{ax + 3}{2x} = \\dfrac{a + 3}{2}$.",
            "Igualando: $\\dfrac{a + 3}{2} = 10$, así que $a + 3 = 20$.",
          ],
          answer: "$a = 17$.",
        },
        {
          type: "example",
          title: "Dos parámetros",
          problem: "Halla $a$ y $b$ para que esta función sea continua en $\\mathbb{R}$:\n\n$$f(x) = \\begin{cases} x^2 & \\text{si } x < 1 \\\\ ax + b & \\text{si } 1 \\le x \\le 3 \\\\ 2x + 1 & \\text{si } x > 3 \\end{cases}$$",
          steps: [
            "En $x = 1$: por la izquierda $1^2 = 1$, y $f(1) = a + b$. Ecuación: $a + b = 1$.",
            "En $x = 3$: $f(3) = 3a + b$ y por la derecha $2 \\cdot 3 + 1 = 7$. Ecuación: $3a + b = 7$.",
            "Restando: $2a = 6$, $a = 3$. Luego $b = 1 - 3 = -2$.",
          ],
          answer: "$a = 3$, $b = -2$.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Tarifas por tramos",
          md: "Muchas tarifas cambian de fórmula según el consumo. Si la tarifa del segundo tramo arranca más arriba de donde terminó la del primero, consumir una unidad más produce un salto en lo que pagas. Ajustar el término fijo del segundo tramo para que la función sea continua es justo resolver un ejercicio como este.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Qué valor de $k$ hace continua en $x = 2$ a esta función?\n\n$$f(x) = \\begin{cases} kx - 1 & \\text{si } x < 2 \\\\ x^2 + 1 & \\text{si } x \\ge 2 \\end{cases}$$",
            parts: [{ kind: "expr", before: "k =", answer: "3" }],
            solution: ["$f(2) = 5$ y por la izquierda $2k - 1$. Igualando, $2k = 6$ y $k = 3$."],
          },
        },
      ],
    },
    {
      id: "teoremas",
      title: "Teoremas de las funciones continuas",
      blocks: [
        {
          type: "text",
          md: "La continuidad en un intervalo cerrado $[a, b]$ trae garantías muy útiles. Todas dicen que algo existe, aunque no te digan dónde exactamente.",
        },
        {
          type: "definition",
          title: "Teorema de Bolzano",
          md: "Si $f$ es continua en $[a, b]$ y $f(a)$ y $f(b)$ tienen signos contrarios, existe al menos un $c \\in (a, b)$ con $f(c) = 0$.",
        },
        {
          type: "definition",
          title: "Teorema del valor intermedio",
          md: "Si $f$ es continua en $[a, b]$ y $k$ es cualquier número entre $f(a)$ y $f(b)$, existe al menos un $c \\in (a, b)$ con $f(c) = k$.",
        },
        {
          type: "definition",
          title: "Acotación y teorema de Weierstrass",
          md: "Si $f$ es continua en $[a, b]$, entonces está acotada en $[a, b]$ y además alcanza un valor máximo y un valor mínimo en ese intervalo.",
        },
        {
          type: "example",
          title: "Localizar una raíz",
          problem: "Demuestra que $p(x) = x^3 + x - 1$ tiene una raíz entre $0$ y $1$ y acércate a ella.",
          steps: [
            "$p$ es un polinomio, así que es continuo en $[0, 1]$.",
            "$p(0) = -1 < 0$ y $p(1) = 1 > 0$. Por Bolzano hay una raíz en $(0, 1)$.",
            "Partimos el intervalo a la mitad: $p(0{,}5) = -0{,}375 < 0$. La raíz está en $(0{,}5;\\ 1)$.",
            "Otra vez: $p(0{,}75) \\approx 0{,}17 > 0$. La raíz está en $(0{,}5;\\ 0{,}75)$.",
          ],
          answer: "La raíz está cerca de $0{,}68$. Cada mitad que descartas duplica la precisión.",
        },
        {
          type: "graph",
          spec: {
            x: [-1, 2],
            y: [-2, 3],
            step: 0.5,
            curves: [{ fn: "x^{3} + x - 1", color: "accent" }],
            points: [{ x: 0, y: -1, label: "p(0) = −1" }, { x: 1, y: 1, label: "p(1) = 1" }],
          },
          caption: "La curva no tiene cortes y pasa de debajo del eje a encima, así que tiene que cruzarlo.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Sin continuidad no hay garantía",
          md: "$f(x) = \\frac{1}{x}$ cumple $f(-1) = -1 < 0$ y $f(1) = 1 > 0$, pero nunca vale cero. Bolzano no falla: es que $f$ no es continua en $[-1, 1]$ porque no existe en $x = 0$.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Existencia del equilibrio",
          md: "Si el exceso de demanda $E(p) = D(p) - S(p)$ es continuo, positivo a precios bajos y negativo a precios altos, Bolzano asegura que existe un precio $p^*$ con $E(p^*) = 0$. Ese es un precio de equilibrio, aunque no sepamos calcularlo con una fórmula.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Sea $f$ continua en $[2, 5]$ con $f(2) = 3$ y $f(5) = 9$. Entonces existe con seguridad algún $c \\in (2, 5)$ con $f(c) = 7$.",
            parts: [trueFalse(true, "Como $7$ está entre $3$ y $9$, el teorema del valor intermedio lo garantiza.")],
            solution: ["Sí. Por el teorema del valor intermedio, toda altura entre $f(2) = 3$ y $f(5) = 9$ se alcanza."],
          },
        },
      ],
    },
  ],
  exercises: [
    tresCondiciones,
    clasificarGrafica,
    dondeContinua,
    valorEvitable,
    taparHueco,
    trozosUnPunto,
    parametroContinua,
    bolzano,
    racionalTipos,
    bosquejoDisc,
    trozosDosPuntos,
    parametrosDos,
    continuidadSignos,
    vfContinuidad,
  ],
};

export default topic;

