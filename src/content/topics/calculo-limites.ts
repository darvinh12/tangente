import { meta } from "../catalog";
import { choice } from "../helpers";
import type { ExerciseGen, Part, Rich, Topic } from "../types";
import { cases, coef, fmt, frac, minus, paren, poly, signed, terms } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

type ExprPart = Extract<Part, { kind: "expr" }>;
const SPECIAL: ExprPart["special"] = ["inf", "-inf", "dne"];

function limPart(answer: string, extra: Partial<Omit<ExprPart, "kind" | "answer">> = {}): ExprPart {
  return { kind: "expr", answer, special: SPECIAL, ...extra };
}

/** Errores típicos numéricos, sin repetir y sin el valor correcto. */
function wrongNums(ans: number, list: [number, Rich][]) {
  const out: { answer: string; feedback: Rich }[] = [];
  const used: number[] = [ans];
  for (const [v, feedback] of list) {
    if (!Number.isFinite(v) || used.some((u) => Math.abs(u - v) < 1e-9)) continue;
    used.push(v);
    out.push({ answer: fmt(v), feedback });
  }
  return out;
}

const ZERO_ONE = (ans: number) =>
  wrongNums(ans, [
    [0, "$\\frac{0}{0}$ no vale $0$. Es una indeterminación: hay que simplificar antes de sustituir."],
    [1, "$\\frac{0}{0}$ no vale $1$. Es una indeterminación: hay que simplificar antes de sustituir."],
  ]);

const lim = (p: number | string, expr: string, v = "x") => `\\lim_{${v} \\to ${p}} ${expr}`;
const dfrac = (n: string, d: string) => `\\dfrac{${n}}{${d}}`;
const sq = (inner: string) => `\\sqrt{${inner}}`;
/** x + k como LaTeX */
const xp = (k: number) => terms([[1, "x"], [k, ""]]);

/* ----------------------------------- ejercicios ----------------------------------- */

const sustitucion: ExerciseGen = {
  id: "sustitucion",
  title: "Sustitución directa",
  level: 1,
  generate: (r) => {
    const tpl = r.pick(["racional", "raiz", "compuesta"] as const);
    let expr: string, a: number, ans: string, steps: Rich[];
    if (tpl === "racional") {
      a = r.int(-3, 3);
      const p = r.nz(-2, 3);
      const q = r.int(-4, 4);
      const c = r.int(-6, 6);
      const s = r.pick([1, 2, 3, -1]);
      const t = r.nz(-5, 5, [-s * a]);
      const N = p * a * a + q * a + c;
      const D = s * a + t;
      expr = dfrac(poly([p, q, c]), poly([s, t]));
      ans = frac(N, D);
      steps = [
        `El denominador en $x = ${a}$ vale $${D} \\ne 0$, así que no hay problema y se sustituye directo.`,
        `Numerador: al sustituir $x = ${a}$ en $${poly([p, q, c])}$ se obtiene $${N}$.`,
        `El límite es $\\dfrac{${N}}{${D}} = ${ans}$.`,
      ];
    } else if (tpl === "raiz") {
      const m = r.int(1, 4);
      a = r.int(-3, 6);
      const k = m * m - a;
      const c = r.nz(-3, 3);
      expr = `${sq(xp(k))} ${c < 0 ? "-" : "+"} ${coef(Math.abs(c), "x")}`;
      ans = fmt(m + c * a);
      steps = [
        `La raíz está definida cerca de $x = ${a}$ porque $${a} ${signed(k)} = ${m * m} > 0$. Se sustituye directo.`,
        `$${sq(String(m * m))} ${c < 0 ? "-" : "+"} ${Math.abs(c)} \\cdot ${paren(a)} = ${m} ${signed(c * a)} = ${ans}$.`,
      ];
    } else {
      const pair = r.pick([
        [3, 4],
        [4, 5],
        [1, 2],
        [2, 3],
        [2, 4],
        [1, 3],
      ]);
      a = pair[0] * r.sign();
      const m = pair[1];
      const k = m * m - a * a;
      expr = sq(`x^{2} ${signed(k)}`);
      ans = String(m);
      steps = [
        `La raíz es continua donde lo de adentro es positivo, así que el límite entra en la raíz: $${lim(a, expr)} = ${sq(`\\lim_{x \\to ${a}} (x^{2} ${signed(k)})`)}$.`,
        `Adentro: $${paren(a)}^{2} ${signed(k)} = ${m * m}$, y $${sq(String(m * m))} = ${m}$.`,
      ];
    }
    return {
      statement: `Calcula $$${lim(a, expr)}$$`,
      parts: [limPart(ans)],
      hints: ["Antes de hacer cualquier cosa, sustituye. Si no sale ni división entre cero ni raíz de negativo, ese es el límite."],
      solution: steps,
    };
  },
};

const propiedades: ExerciseGen = {
  id: "propiedades",
  title: "Usar las propiedades",
  level: 1,
  generate: (r) => {
    const a = r.int(-3, 4);
    const tpl = r.pick(["lineal", "producto", "cuadrado", "raiz"] as const);
    let p = r.nz(-5, 5);
    let q = r.nz(-5, 5, [p]);
    let expr: string, ans: number, step: Rich;
    if (tpl === "lineal") {
      const al = r.nz(-4, 4);
      const be = r.nz(-4, 4);
      expr = `\\left[ ${coef(al, "f(x)")} ${be < 0 ? "-" : "+"} ${coef(Math.abs(be), "g(x)")} \\right]`;
      ans = al * p + be * q;
      step = `Por la suma y el múltiplo constante: $${al} \\cdot ${paren(p)} ${signed(be)} \\cdot ${paren(q)} = ${ans}$.`;
    } else if (tpl === "producto") {
      expr = dfrac("f(x) \\cdot g(x)", "f(x) - g(x)");
      ans = (p * q) / (p - q);
      step = `Por producto y cociente (el denominador da $${p} - ${paren(q)} = ${p - q} \\ne 0$): $\\dfrac{${p} \\cdot ${paren(q)}}{${p - q}} = ${frac(p * q, p - q)}$.`;
    } else if (tpl === "cuadrado") {
      const be = r.nz(-3, 3);
      expr = `\\left[ \\left(f(x)\\right)^{2} ${be < 0 ? "-" : "+"} ${coef(Math.abs(be), "g(x)")} \\right]`;
      ans = p * p + be * q;
      step = `Por la potencia y la suma: $${paren(p)}^{2} ${signed(be)} \\cdot ${paren(q)} = ${ans}$.`;
    } else {
      const m = r.int(2, 5);
      p = r.nz(-4, m * m + 3, [m * m]);
      q = m * m - p;
      expr = sq("f(x) + g(x)");
      ans = m;
      step = `Por la raíz y la suma: $${sq(`${p} ${signed(q)}`)} = ${sq(String(m * m))} = ${m}$.`;
    }
    return {
      statement: `Si $\\lim_{x \\to ${a}} f(x) = ${p}$ y $\\lim_{x \\to ${a}} g(x) = ${q}$, calcula $$${lim(a, expr)}$$`,
      parts: [limPart(tpl === "producto" ? frac(p * q, p - q) : fmt(ans))],
      hints: ["Las propiedades permiten reemplazar cada límite por su valor y operar con los números."],
      solution: [step],
    };
  },
};

const clasificarForma: ExerciseGen = {
  id: "clasificar-forma",
  title: "¿Qué sale al sustituir?",
  level: 1,
  generate: (r) => {
    const type = r.pick(["00", "k0", "0k", "num"] as const);
    const n1 = r.int(-4, 4);
    const n2 = r.int(-4, 4);
    let d: number, a: number;
    const roots = [n1, n2];
    if (type === "00") {
      d = n1;
      a = n1;
    } else if (type === "k0") {
      do d = r.int(-5, 5); while (roots.includes(d));
      a = d;
    } else if (type === "0k") {
      do d = r.int(-5, 5); while (roots.includes(d));
      a = n1;
    } else {
      do d = r.int(-5, 5); while (roots.includes(d));
      do a = r.int(-5, 5); while (roots.includes(a) || a === d);
    }
    const N = poly([1, -(n1 + n2), n1 * n2]);
    const D = minus("x", d);
    const Na = (a - n1) * (a - n2);
    const Da = a - d;
    const labels = {
      "00": "$\\frac{0}{0}$: es una indeterminación y hay que simplificar antes de concluir.",
      k0: "$\\frac{k}{0}$ con $k \\neq 0$: no es indeterminación, el límite es infinito o no existe.",
      "0k": "$\\frac{0}{k}$ con $k \\neq 0$: el límite es $0$.",
      num: "Un cociente de dos números distintos de cero: ese es el límite.",
    };
    const why = `Al sustituir $x = ${a}$, el numerador da $${Na}$ y el denominador da $${Da}$.`;
    return {
      statement: `Al sustituir $x = ${a}$ en $$${lim(a, dfrac(N, D))}$$ ¿qué se obtiene?`,
      parts: [
        choice(
          labels[type],
          (Object.keys(labels) as (keyof typeof labels)[]).filter((k) => k !== type).map((k) => [labels[k], why] as [Rich, Rich]),
        ),
      ],
      hints: ["Sustituye por separado en el numerador y en el denominador."],
      solution: [
        why,
        type === "00"
          ? "Sale $\\frac{0}{0}$. No se puede concluir nada todavía: hay que factorizar y simplificar."
          : type === "k0"
            ? `Sale $\\frac{${Na}}{0}$. Un número distinto de cero dividido entre algo que tiende a cero crece sin control: el límite es infinito o, si los lados no coinciden en signo, no existe.`
            : type === "0k"
              ? `Sale $\\frac{0}{${Da}}$, que vale $0$. Ese es el límite.`
              : `Sale $\\frac{${Na}}{${Da}} = ${frac(Na, Da)}$, y ese es el límite.`,
      ],
    };
  },
};

const factorCuadratica: ExerciseGen = {
  id: "factor-cuadratica",
  title: "Factorizar el numerador",
  level: 1,
  generate: (r) => {
    const tpl = r.pick(["T1", "T2", "T3"] as const);
    let a: number, expr: string, ans: number, steps: Rich[];
    if (tpl === "T3") {
      a = r.nz(-4, 4);
      const k = r.pick([2, 3, 4]);
      const D = terms([[k, "x"], [-k * a, ""]]);
      expr = dfrac(`x^{2} - ${a * a}`, D);
      ans = (2 * a) / k;
      steps = [
        `Al sustituir sale $\\frac{0}{0}$.`,
        `Numerador: diferencia de cuadrados, $x^{2} - ${a * a} = (${minus("x", a)})(${minus("x", -a)})$. Denominador: factor común, $${D} = ${k}(${minus("x", a)})$.`,
        `Se cancela $(${minus("x", a)})$, que no es cero porque $x \\ne ${a}$: queda $\\dfrac{${minus("x", -a)}}{${k}}$.`,
        `Sustituimos: $\\dfrac{${a} ${signed(a)}}{${k}} = ${frac(2 * a, k)}$.`,
      ];
    } else {
      a = r.nz(-4, 5);
      const b = r.int(-5, 5);
      const bb = b === a ? a + 2 : b;
      const N = poly([1, -(a + bb), a * bb]);
      if (tpl === "T1") {
        expr = dfrac(N, minus("x", a));
        ans = a - bb;
        steps = [
          `Al sustituir sale $\\frac{0}{0}$, así que $x = ${a}$ es raíz del numerador y $(${minus("x", a)})$ es un factor.`,
          `Factorizamos: $${N} = (${minus("x", a)})(${minus("x", bb)})$.`,
          `Cancelamos $(${minus("x", a)})$: queda $${minus("x", bb)}$.`,
          `Sustituimos: $${a} ${signed(-bb)} = ${ans}$.`,
        ];
      } else {
        expr = dfrac(N, `${a} - x`);
        ans = bb - a;
        steps = [
          `Al sustituir sale $\\frac{0}{0}$.`,
          `Factorizamos: $${N} = (${minus("x", a)})(${minus("x", bb)})$. El denominador es $${a} - x = -(${minus("x", a)})$.`,
          `Cancelamos $(${minus("x", a)})$ y queda $-(${minus("x", bb)})$.`,
          `Sustituimos: $-(${a} ${signed(-bb)}) = ${ans}$.`,
        ];
      }
    }
    return {
      statement: `Calcula $$${lim(a, expr)}$$`,
      parts: [limPart(fmt(ans), { mistakes: ZERO_ONE(ans) })],
      hints: [
        "Si al sustituir sale $\\frac{0}{0}$, el número al que tiende $x$ es raíz de los dos polinomios.",
        `Entonces $(${minus("x", a)})$ es factor del numerador y del denominador. Factoriza y cancela.`,
      ],
      solution: steps,
    };
  },
};

const factorAmbos: ExerciseGen = {
  id: "factor-ambos",
  title: "Factorizar numerador y denominador",
  level: 2,
  generate: (r) => {
    const a = r.int(-3, 4);
    const b = r.int(-5, 5);
    const bb = b === a ? a + 3 : b;
    let c = r.int(-5, 5);
    while (c === a || c === bb) c++;
    const k = r.pick([1, 1, 2, 3]);
    const N = poly([k, -k * (a + bb), k * a * bb]);
    const D = poly([1, -(a + c), a * c]);
    const ans = (k * (a - bb)) / (a - c);
    const ansTex = frac(k * (a - bb), a - c);
    const fk = k === 1 ? "" : String(k);
    return {
      statement: `Calcula $$${lim(a, dfrac(N, D))}$$`,
      parts: [
        limPart(ansTex, {
          mistakes: [
            ...ZERO_ONE(ans),
            ...(a !== 0 && c !== 0 ? wrongNums(ans, [[(k * a * bb) / (a * c), "Parece que dividiste los términos independientes. En una fracción solo se cancelan factores, nunca términos sueltos."]]) : []),
          ].filter((m, i, arr) => arr.findIndex((x) => x.answer === m.answer) === i),
        }),
      ],
      hints: [
        `Al sustituir $x = ${a}$ sale $\\frac{0}{0}$. Los dos polinomios tienen el factor $(${minus("x", a)})$.`,
        "Factoriza cada trinomio buscando dos números que sumen el coeficiente de $x$ y multipliquen el término independiente.",
      ],
      solution: [
        `Numerador: $${N} = ${fk}(${minus("x", a)})(${minus("x", bb)})$.`,
        `Denominador: $${D} = (${minus("x", a)})(${minus("x", c)})$.`,
        `Cancelamos $(${minus("x", a)})$: $\\dfrac{${fk}(${minus("x", bb)})}{${minus("x", c)}}$.`,
        `Sustituimos $x = ${a}$: $\\dfrac{${fk}(${a} ${signed(-bb)})}{${a} ${signed(-c)}} = ${ansTex}$.`,
      ],
    };
  },
};

const factorCubica: ExerciseGen = {
  id: "factor-cubica",
  title: "Polinomios de grado tres",
  level: 2,
  generate: (r) => {
    const tpl = r.pick(["cubos", "ruffini", "comun"] as const);
    let a: number, expr: string, ans: number, steps: Rich[];
    if (tpl === "cubos") {
      a = r.nz(-3, 3);
      const a3 = a ** 3;
      expr = dfrac(`x^{3} ${signed(-a3)}`, `x^{2} - ${a * a}`);
      ans = (3 * a) / 2;
      steps = [
        "Al sustituir sale $\\frac{0}{0}$.",
        `Numerador, ${a > 0 ? "diferencia" : "suma"} de cubos: $x^{3} ${signed(-a3)} = (${minus("x", a)})(${terms([[1, "x^{2}"], [a, "x"], [a * a, ""]])})$.`,
        `Denominador: $x^{2} - ${a * a} = (${minus("x", a)})(${minus("x", -a)})$.`,
        `Cancelamos $(${minus("x", a)})$ y sustituimos: $\\dfrac{${paren(a)}^{2} + ${paren(a)}^{2} + ${a * a}}{${a} ${signed(a)}} = ${a * a === 1 ? "" : `\\dfrac{${3 * a * a}}{${2 * a}} = `}${frac(3 * a, 2)}$.`,
      ];
    } else if (tpl === "ruffini") {
      a = r.nz(-2, 3);
      const m = r.int(-3, 3);
      const n = r.int(-4, 4);
      const cub = [1, m - a, n - a * m, -a * n];
      expr = dfrac(poly(cub), minus("x", a));
      ans = a * a + m * a + n;
      steps = [
        `Al sustituir $x = ${a}$ el numerador da $0$, así que $(${minus("x", a)})$ es factor. Dividimos por Ruffini con $${a}$.`,
        `Los coeficientes $1, \\; ${cub[1]}, \\; ${cub[2]}, \\; ${cub[3]}$ dan cociente $1, \\; ${m}, \\; ${n}$ y resto $0$: $${poly(cub)} = (${minus("x", a)})(${poly([1, m, n])})$.`,
        `Cancelamos y sustituimos: $${paren(a)}^{2} ${signed(m)} \\cdot ${paren(a)} ${signed(n)} = ${ans}$.`,
      ];
    } else {
      a = r.nz(-4, 4);
      expr = dfrac(`x^{3} - ${a * a}x`, terms([[1, "x^{2}"], [-a, "x"]]));
      ans = 2 * a;
      steps = [
        "Al sustituir sale $\\frac{0}{0}$.",
        `Numerador: $x^{3} - ${a * a}x = x(x^{2} - ${a * a}) = x(${minus("x", a)})(${minus("x", -a)})$.`,
        `Denominador: $${terms([[1, "x^{2}"], [-a, "x"]])} = x(${minus("x", a)})$.`,
        `Cancelamos $x(${minus("x", a)})$ y queda $${minus("x", -a)}$, que en $x = ${a}$ vale $${ans}$.`,
      ];
    }
    return {
      statement: `Calcula $$${lim(a, expr)}$$`,
      parts: [limPart(fmt(ans), { mistakes: ZERO_ONE(ans) })],
      hints: [
        `Si al sustituir sale $\\frac{0}{0}$, entonces $(${minus("x", a)})$ es factor del numerador y del denominador.`,
        "Para un polinomio de grado tres usa Ruffini, productos notables (suma o diferencia de cubos) o saca factor común.",
      ],
      solution: steps,
    };
  },
};

const racionalizarSimple: ExerciseGen = {
  id: "racionalizar-simple",
  title: "Racionalizar con el conjugado",
  level: 2,
  generate: (r) => {
    const tpl = r.pick(["T1", "T2", "T3", "T4"] as const);
    const m = r.int(1, 4);
    let a = r.int(-3, 6);
    if (tpl === "T3" && a === 0) a = 2;
    let k = m * m - a;
    let expr: string, ans: string, ansNum: number, steps: Rich[];
    const R = () => sq(xp(k));
    if (tpl === "T1") {
      expr = dfrac(`${R()} - ${m}`, minus("x", a));
      ans = frac(1, 2 * m);
      ansNum = 1 / (2 * m);
      steps = [
        `Al sustituir sale $\\frac{${m} - ${m}}{0} = \\frac{0}{0}$. Multiplicamos arriba y abajo por el conjugado $${R()} + ${m}$.`,
        `Arriba queda $(${R()})^{2} - ${m * m} = ${xp(k)} - ${m * m} = ${minus("x", a)}$.`,
        `La fracción es $\\dfrac{${minus("x", a)}}{(${minus("x", a)})(${R()} + ${m})} = \\dfrac{1}{${R()} + ${m}}$.`,
        `Sustituimos: $\\dfrac{1}{${m} + ${m}} = ${ans}$.`,
      ];
    } else if (tpl === "T2") {
      expr = dfrac(minus("x", a), `${R()} - ${m}`);
      ans = String(2 * m);
      ansNum = 2 * m;
      steps = [
        `Al sustituir sale $\\frac{0}{0}$. Multiplicamos arriba y abajo por $${R()} + ${m}$.`,
        `Abajo queda $${xp(k)} - ${m * m} = ${minus("x", a)}$, que se cancela con el numerador.`,
        `Queda $${R()} + ${m}$, que en $x = ${a}$ vale $${m} + ${m} = ${2 * m}$.`,
      ];
    } else if (tpl === "T3") {
      expr = dfrac(`${m} - ${R()}`, `x^{2} - ${a * a}`);
      ans = frac(-1, 4 * m * a);
      ansNum = -1 / (4 * m * a);
      steps = [
        `Al sustituir sale $\\frac{0}{0}$. Multiplicamos por el conjugado $${m} + ${R()}$.`,
        `Arriba: $${m * m} - (${xp(k)}) = ${terms([[-1, "x"], [a, ""]])} = -(${minus("x", a)})$. Abajo: $x^{2} - ${a * a} = (${minus("x", a)})(${minus("x", -a)})$.`,
        `Cancelamos y queda $\\dfrac{-1}{(${minus("x", -a)})(${m} + ${R()})}$.`,
        `Sustituimos: $\\dfrac{-1}{(${2 * a})(${2 * m})} = ${ans}$.`,
      ];
    } else {
      k = r.pick([2, 3, 5, 6, 7]);
      a = 0;
      expr = dfrac(`${sq(xp(k))} - ${sq(String(k))}`, "x");
      ans = `\\frac{1}{2\\sqrt{${k}}}`;
      ansNum = 1 / (2 * Math.sqrt(k));
      steps = [
        `Al sustituir sale $\\frac{0}{0}$. Multiplicamos por el conjugado $${sq(xp(k))} + ${sq(String(k))}$.`,
        `Arriba: $(${xp(k)}) - ${k} = x$, que se cancela con el $x$ de abajo.`,
        `Queda $\\dfrac{1}{${sq(xp(k))} + ${sq(String(k))}}$, que en $x = 0$ vale $\\dfrac{1}{2${sq(String(k))}} = \\dfrac{${sq(String(k))}}{${2 * k}}$.`,
      ];
    }
    return {
      statement: `Calcula $$${lim(a, expr)}$$`,
      parts: [
        limPart(ans, {
          mistakes: [
            ...ZERO_ONE(ansNum),
            ...(tpl === "T1" ? wrongNums(ansNum, [[1 / m, "Te faltó un factor. Al sustituir en $\\sqrt{\\;} + " + m + "$ se suman dos veces $" + m + "$."]]) : []),
          ],
        }),
      ],
      hints: [
        "Cuando hay una raíz y sale $\\frac{0}{0}$, multiplica arriba y abajo por el conjugado: la misma expresión con el signo del medio cambiado.",
        "Usa $(A - B)(A + B) = A^2 - B^2$ para que desaparezca la raíz. Después cancela el factor que se anula.",
      ],
      solution: steps,
    };
  },
};

const fraccionesResta: ExerciseGen = {
  id: "fracciones-resta",
  title: "Resta de fracciones (tipo parcial)",
  level: 2,
  exam: true,
  generate: (r) => {
    const tpl = r.pick(["T1", "T2"] as const);
    let a: number, expr: string, ans: number, steps: Rich[];
    if (tpl === "T1") {
      a = r.nz(-4, 4);
      const t = 2 * a;
      expr = `\\left( ${dfrac("1", minus("x", a))} ${t > 0 ? "-" : "+"} ${dfrac(String(Math.abs(t)), `x^{2} - ${a * a}`)} \\right)`;
      ans = 1 / (2 * a);
      steps = [
        "Al sustituir aparecen dos fracciones con denominador cero. Hay que restarlas primero.",
        `Común denominador $x^{2} - ${a * a} = (${minus("x", a)})(${minus("x", -a)})$: $\\dfrac{(${minus("x", -a)}) ${signed(-t)}}{x^{2} - ${a * a}} = \\dfrac{${minus("x", a)}}{(${minus("x", a)})(${minus("x", -a)})}$.`,
        `Cancelamos $(${minus("x", a)})$: queda $\\dfrac{1}{${minus("x", -a)}}$.`,
        `Sustituimos $x = ${a}$: $\\dfrac{1}{${a} ${signed(a)}} = ${frac(1, 2 * a)}$.`,
      ];
    } else {
      a = r.pick([1, 1, 2, 3, -1, -2]);
      const a3 = a ** 3;
      expr = `\\left( ${dfrac("1", `${a} - x`)} - ${dfrac(String(3 * a * a), `${a3} - x^{3}`)} \\right)`;
      ans = -1 / a;
      steps = [
        "Al sustituir aparecen dos fracciones con denominador cero. Hay que restarlas primero.",
        `Como $${a3} - x^{3} = (${a} - x)(${poly([1, a, a * a])})$, el común denominador es $${a3} - x^{3}$.`,
        `Numerador: $${poly([1, a, a * a])} - ${3 * a * a} = ${poly([1, a, -2 * a * a])} = (${minus("x", a)})(${minus("x", -2 * a)})$.`,
        `Como $${a} - x = -(${minus("x", a)})$, al cancelar queda $\\dfrac{-(${minus("x", -2 * a)})}{${poly([1, a, a * a])}}$.`,
        `Sustituimos $x = ${a}$: $\\dfrac{-${paren(3 * a)}}{${3 * a * a}} = ${frac(-1, a)}$.`,
      ];
    }
    return {
      statement: `Calcula $$${lim(a, expr)}$$`,
      parts: [
        limPart(fmt(ans), {
          mistakes: wrongNums(ans, [[0, "No se pueden restar los infinitos. Hay que hacer la resta de fracciones con común denominador y simplificar."]]),
        }),
      ],
      hints: [
        "No se puede sustituir directamente. Primero resta las fracciones con común denominador.",
        tpl === "T1" ? `Usa $x^{2} - ${a * a} = (${minus("x", a)})(${minus("x", -a)})$.` : `Usa la diferencia de cubos $${a ** 3} - x^{3} = (${a} - x)(${poly([1, a, a * a])})$.`,
      ],
      solution: steps,
    };
  },
};

const trozosLimite: ExerciseGen = {
  id: "trozos-limite",
  title: "Límite de una función a trozos con 0/0",
  level: 2,
  generate: (r) => {
    const p = r.int(-3, 3);
    const s = r.nz(-4, 4, [p]);
    const N = poly([1, -(p + s), p * s]);
    const L = p - s;
    const R = r.bool() ? L : L + r.nz(-3, 3);
    const m = r.nz(-3, 3);
    const b = R - m * p;
    const right = terms([[m, "x"], [b, ""]]);
    const fTex = cases([
      [dfrac(N, minus("x", p)), `x < ${p}`],
      [right, `x \\ge ${p}`],
    ]);
    const lf = `\\lim_{x \\to ${p}`;
    return {
      statement: `Sea $$f(x) = ${fTex}$$ Estudia el límite de $f$ cuando $x \\to ${p}$.`,
      sequential: true,
      parts: [
        limPart(fmt(L), { before: `${lf}^{-}} f(x) =`, mistakes: ZERO_ONE(L) }),
        limPart(fmt(R), { before: `${lf}^{+}} f(x) =` }),
        limPart(L === R ? fmt(L) : "dne", { before: `${lf}} f(x) =` }),
      ],
      hints: [
        `Por la izquierda manda la fracción. Al sustituir da $\\frac{0}{0}$, así que factoriza el numerador.`,
        "Por la derecha manda la recta: sustituye directo. Después compara.",
      ],
      solution: [
        `Izquierda: $${N} = (${minus("x", p)})(${minus("x", s)})$, así que para $x < ${p}$ la fracción es $${minus("x", s)}$ y su límite es $${L}$.`,
        `Derecha: $${coef(m, paren(p))} ${signed(b)} = ${R}$.`.replace(" + 0 ", " "),
        L === R ? `Los laterales coinciden: $\\lim_{x \\to ${p}} f(x) = ${L}$.` : `Los laterales son distintos ($${L} \\ne ${R}$): el límite no existe.`,
      ],
    };
  },
};

const racionalizarDoble: ExerciseGen = {
  id: "racionalizar-doble",
  title: "Racionalizar con dos raíces (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const tpl = r.pick(["T1", "T2"] as const);
    let a: number, expr: string, ans: string, steps: Rich[];
    if (tpl === "T1") {
      a = r.int(-2, 5);
      const [m, n] = r.sample([1, 2, 3, 4], 2);
      const p = m * m - a;
      const q = n * n - a;
      expr = dfrac(`${sq(xp(p))} - ${m}`, `${sq(xp(q))} - ${n}`);
      ans = frac(n, m);
      steps = [
        "Al sustituir sale $\\frac{0}{0}$ y hay raíces arriba y abajo. Multiplicamos por los dos conjugados.",
        `Arriba: $(${sq(xp(p))} - ${m})(${sq(xp(p))} + ${m}) = ${xp(p)} - ${m * m} = ${minus("x", a)}$.`,
        `Abajo: $(${sq(xp(q))} - ${n})(${sq(xp(q))} + ${n}) = ${xp(q)} - ${n * n} = ${minus("x", a)}$.`,
        `Se cancela $(${minus("x", a)})$ y queda $\\dfrac{${sq(xp(q))} + ${n}}{${sq(xp(p))} + ${m}}$.`,
        `Sustituimos: $\\dfrac{${n} + ${n}}{${m} + ${m}} = ${ans}$.`,
      ];
    } else {
      a = r.int(0, 3);
      const M = r.pick([2, 3]);
      const [p, rr] = r.sample([1, 2, 3, 4], 2);
      const q = M * M - p * a;
      const s = M * M - rr * a;
      const A = terms([[p, "x"], [q, ""]]);
      const B = terms([[rr, "x"], [s, ""]]);
      expr = dfrac(`${sq(A)} - ${sq(B)}`, minus("x", a));
      ans = frac(p - rr, 2 * M);
      steps = [
        `Al sustituir, las dos raíces valen $${M}$ y sale $\\frac{0}{0}$. Multiplicamos por el conjugado $${sq(A)} + ${sq(B)}$.`,
        `Arriba: $(${A}) - (${B}) = ${terms([[p - rr, "x"], [q - s, ""]])} = ${p - rr === 1 ? "" : p - rr === -1 ? "-" : p - rr}(${minus("x", a)})$.`,
        `Se cancela $(${minus("x", a)})$ y queda $\\dfrac{${p - rr}}{${sq(A)} + ${sq(B)}}$.`,
        `Sustituimos: $\\dfrac{${p - rr}}{${M} + ${M}} = ${ans}$.`,
      ];
    }
    return {
      statement: `Calcula $$${lim(a, expr)}$$`,
      parts: [limPart(ans, { mistakes: ZERO_ONE(0.5) })],
      hints: [
        "Cada raíz que se anula necesita su conjugado. Si hay una raíz arriba y otra abajo, multiplica por los dos conjugados.",
        "Después de multiplicar, el factor que hace cero tiene que aparecer arriba y abajo. Cancélalo y sustituye.",
      ],
      solution: steps,
    };
  },
};

const cambioVariable: ExerciseGen = {
  id: "cambio-variable",
  title: "Cambio de variable con raíces (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const tpl = r.pick(["cubica", "mixta", "mixta-inv"] as const);
    let a: number, expr: string, ans: string, steps: Rich[];
    if (tpl === "cubica") {
      const m = r.int(1, 3);
      a = r.int(-3, 3);
      const k = m ** 3 - a;
      const root = `\\sqrt[3]{${xp(k)}}`;
      expr = dfrac(`${root} - ${m}`, minus("x", a));
      ans = frac(1, 3 * m * m);
      steps = [
        `Al sustituir sale $\\frac{0}{0}$. Cambiamos de variable: $t = ${root}$. Entonces $x = t^{3} ${signed(-k)}$ y, cuando $x \\to ${a}$, $t \\to ${m}$.`,
        `El denominador queda $${minus("x", a)} = t^{3} - ${m ** 3}$ y el límite es $\\lim_{t \\to ${m}} \\dfrac{t - ${m}}{t^{3} - ${m ** 3}}$.`,
        `Diferencia de cubos: $t^{3} - ${m ** 3} = (t - ${m})(${terms([[1, "t^{2}"], [m, "t"], [m * m, ""]])})$. Se cancela $(t - ${m})$.`,
        `Queda $\\dfrac{1}{${terms([[1, "t^{2}"], [m, "t"], [m * m, ""]])}}$ en $t = ${m}$: $\\dfrac{1}{${3 * m * m}}$.`,
      ];
    } else {
      const t0 = r.pick(["1", "2", "r2"] as const);
      const c = t0 === "r2" ? r.pick([1, 1, 0, 2, -1]) : r.int(-2, 3);
      const six = t0 === "1" ? 1 : t0 === "2" ? 64 : 8;
      a = six + c;
      const t2 = t0 === "1" ? "1" : t0 === "2" ? "4" : "2";
      const t3 = t0 === "1" ? "1" : t0 === "2" ? "8" : "2\\sqrt{2}";
      const tt = t0 === "1" ? "1" : t0 === "2" ? "2" : "\\sqrt{2}";
      const inner = minus("x", c);
      const cb = `\\sqrt[3]{${inner}}`;
      const sr = sq(inner);
      const inv = tpl === "mixta-inv";
      expr = inv ? dfrac(`${sr} - ${t3}`, `${cb} - ${t2}`) : dfrac(`${cb} - ${t2}`, `${sr} - ${t3}`);
      ans = inv
        ? t0 === "1" ? "\\frac{3}{2}" : t0 === "2" ? "3" : "\\frac{3\\sqrt{2}}{2}"
        : t0 === "1" ? "\\frac{2}{3}" : t0 === "2" ? "\\frac{1}{3}" : "\\frac{\\sqrt{2}}{3}";
      const q = `t^{2} + ${tt === "1" ? "" : tt}t + ${t2}`;
      const ratio = inv ? `\\dfrac{${q}}{t + ${tt}}` : `\\dfrac{t + ${tt}}{${q}}`;
      steps = [
        `Hay una raíz cúbica y una cuadrada de lo mismo. El índice común es $6$, así que tomamos $t = \\sqrt[6]{${inner}}$. Entonces $${cb} = t^{2}$ y $${sr} = t^{3}$.`,
        `Cuando $x \\to ${a}$, $${inner} \\to ${six}$ y $t \\to \\sqrt[6]{${six}} = ${tt}$.`,
        inv
          ? `El límite queda $\\lim_{t \\to ${tt}} \\dfrac{t^{3} - ${t3}}{t^{2} - ${t2}} = \\lim_{t \\to ${tt}} \\dfrac{(t - ${tt})(${q})}{(t - ${tt})(t + ${tt})}$.`
          : `El límite queda $\\lim_{t \\to ${tt}} \\dfrac{t^{2} - ${t2}}{t^{3} - ${t3}} = \\lim_{t \\to ${tt}} \\dfrac{(t - ${tt})(t + ${tt})}{(t - ${tt})(${q})}$.`,
        `Cancelamos $(t - ${tt})$ y sustituimos en $${ratio}$: el resultado es $${ans}$.`,
      ];
    }
    return {
      statement: `Calcula $$${lim(a, expr)}$$`,
      parts: [limPart(ans, { mistakes: ZERO_ONE(0.5) })],
      hints: [
        "Cuando hay raíces de distinto índice, el conjugado no alcanza. Cambia de variable para que las raíces desaparezcan.",
        "Elige $t$ como la raíz de índice igual al mínimo común múltiplo de los índices. Así cada raíz es una potencia entera de $t$.",
        "Recuerda la diferencia de cubos: $t^{3} - c^{3} = (t - c)(t^{2} + ct + c^{2})$.",
      ],
      solution: steps,
    };
  },
};

const parametroExiste: ExerciseGen = {
  id: "parametro-existe",
  title: "Parámetros para que existan los límites (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const p = r.pick([-2, -1]);
    const q = r.pick([1, 2, 3]);
    const m1 = r.nz(-3, 3);
    const c = r.int(-3, 3);
    const b = r.nz(-3, 3);
    const a = p * p + c - m1 * p;
    const d = q * q + c - b * q;
    const fTex = cases([
      [`${coef(m1, "x")} + a`, `x < ${p}`],
      [terms([[1, "x^{2}"], [c, ""]]), `${p} \\le x < ${q}`],
      [`bx${d === 0 ? "" : ` ${signed(d)}`}`, `x \\ge ${q}`],
    ]);
    const Bp = p * p + c;
    const Bq = q * q + c;
    return {
      statement: `Sea $$f(x) = ${fTex}$$ Halla $a$ y $b$ para que existan $\\lim_{x \\to ${p}} f(x)$ y $\\lim_{x \\to ${q}} f(x)$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: `Valor de $a$ (usa el punto $x = ${p}$).`, answer: fmt(a), before: "a =" },
        { kind: "expr", prompt: `Valor de $b$ (usa el punto $x = ${q}$).`, answer: fmt(b), before: "b =" },
        limPart(fmt(Bp), { prompt: "Con esos valores, calcula el límite en el primer punto.", before: `\\lim_{x \\to ${p}} f(x) =` }),
      ],
      hints: [
        "Cada parámetro sale de un punto distinto. En cada punto iguala el límite por la izquierda con el de la derecha.",
        `En $x = ${p}$ se encuentran el primer trozo y el segundo. En $x = ${q}$, el segundo y el tercero.`,
      ],
      solution: [
        `En $x = ${p}$: por la izquierda $${coef(m1, `(${p})`)} + a = ${m1 * p} + a$, por la derecha $(${p})^{2} ${signed(c)} = ${Bp}$.`,
        `Igualamos: $${m1 * p} + a = ${Bp}$, así que $a = ${a}$.`,
        `En $x = ${q}$: por la izquierda $${q}^{2} ${signed(c)} = ${Bq}$, por la derecha $${q}b ${signed(d)}$.`.replace(" + 0$", "$"),
        `Igualamos: $${q}b ${signed(d)} = ${Bq}$, así que $b = ${b}$.`.replace(" + 0 ", " "),
        `Con estos valores, $\\lim_{x \\to ${p}} f(x) = ${Bp}$ y $\\lim_{x \\to ${q}} f(x) = ${Bq}$.`,
      ],
    };
  },
};

const factorParametrico: ExerciseGen = {
  id: "factor-parametrico",
  title: "Factorizar con un parámetro (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const tpl = r.pick(["T1", "T2", "T3"] as const);
    let N: string, D: string, ans: string, steps: Rich[];
    if (tpl === "T1") {
      const k = r.int(1, 5);
      const kk = k === 1 ? "" : String(k);
      N = `${kk}x^{2} - ${2 * k}cx + ${kk}c^{2}`;
      D = "x^{3} - cx^{2} - c^{2}x + c^{3}";
      ans = `\\frac{${k}}{2c}`;
      steps = [
        "Al sustituir $x = c$ arriba queda $" + `${kk}c^{2} - ${2 * k}c^{2} + ${kk}c^{2} = 0` + "$ y abajo $c^{3} - c^{3} - c^{3} + c^{3} = 0$.",
        `Numerador: $${N} = ${k === 1 ? "" : `${kk}(x^{2} - 2cx + c^{2}) = ${kk}`}(x - c)^{2}$.`,
        "Denominador, por agrupación: $x^{2}(x - c) - c^{2}(x - c) = (x - c)(x^{2} - c^{2}) = (x - c)^{2}(x + c)$.",
        `Cancelamos $(x - c)^{2}$ y queda $\\dfrac{${k}}{x + c}$. En $x = c$: $${ans}$.`,
      ];
    } else if (tpl === "T2") {
      const k = r.int(1, 4);
      const kk = k === 1 ? "" : String(k);
      N = `${kk}x^{2} - ${kk}c^{2}`;
      D = "x^{2} - 3cx + 2c^{2}";
      ans = String(-2 * k);
      steps = [
        "Al sustituir $x = c$ sale $\\frac{0}{0}$.",
        `Numerador: $${kk}(x - c)(x + c)$. Denominador: $(x - c)(x - 2c)$, porque $-c$ y $-2c$ suman $-3c$ y multiplican $2c^{2}$.`,
        `Cancelamos $(x - c)$ y queda $\\dfrac{${kk}(x + c)}{x - 2c}$.`,
        `En $x = c$: $\\dfrac{${kk}(2c)}{-c} = ${-2 * k}$. El resultado no depende de $c$.`,
      ];
    } else {
      const j = r.int(2, 5);
      N = `x^{2} + ${j - 1 === 1 ? "" : j - 1}cx - ${j}c^{2}`;
      D = "x^{2} - c^{2}";
      ans = frac(1 + j, 2);
      steps = [
        "Al sustituir $x = c$ sale $\\frac{0}{0}$.",
        `Numerador: $(x - c)(x + ${j}c)$, porque $-c$ y $${j}c$ suman $${j - 1}c$ y multiplican $-${j}c^{2}$. Denominador: $(x - c)(x + c)$.`,
        `Cancelamos $(x - c)$ y queda $\\dfrac{x + ${j}c}{x + c}$.`,
        `En $x = c$: $\\dfrac{${1 + j}c}{2c} = ${ans}$.`,
      ];
    }
    return {
      statement: `Calcula, para $c \\neq 0$, $$${lim("c", dfrac(N, D))}$$`,
      parts: [limPart(ans, { vars: ["c"], domain: [0.5, 4] })],
      hints: [
        "Trata a $c$ como un número fijo. Si al sustituir $x = c$ sale $\\frac{0}{0}$, entonces $(x - c)$ es factor arriba y abajo.",
        "Para el denominador de grado tres prueba agrupar términos de a dos.",
      ],
      solution: steps,
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("calculo-limites"),
  objectives: [
    "Usar las propiedades de los límites y la sustitución directa.",
    "Reconocer la indeterminación 0/0 y entender por qué no tiene un valor fijo.",
    "Resolver 0/0 por factorización, racionalización y cambio de variable.",
    "Calcular límites de funciones a trozos y hallar parámetros para que el límite exista.",
  ],
  sections: [
    {
      id: "propiedades",
      title: "Propiedades y sustitución directa",
      blocks: [
        {
          type: "text",
          md: "Hacer tablas para cada límite sería eterno. Por suerte los límites se llevan bien con las operaciones: el límite de una suma es la suma de los límites, el de un producto es el producto, y así. Si $\\lim_{x \\to a} f(x) = L$ y $\\lim_{x \\to a} g(x) = M$:",
        },
        {
          type: "table",
          headers: ["Propiedad", "Se escribe"],
          rows: [
            ["Constante", "$\\lim_{x \\to a} k = k$"],
            ["Suma y resta", "$\\lim_{x \\to a} [f(x) \\pm g(x)] = L \\pm M$"],
            ["Múltiplo", "$\\lim_{x \\to a} k\\,f(x) = k\\,L$"],
            ["Producto", "$\\lim_{x \\to a} f(x)\\,g(x) = L\\,M$"],
            ["Cociente", "$\\lim_{x \\to a} \\dfrac{f(x)}{g(x)} = \\dfrac{L}{M}$, si $M \\ne 0$"],
            ["Potencia y raíz", "$\\lim_{x \\to a} [f(x)]^n = L^n$, $\\;\\lim_{x \\to a} \\sqrt[n]{f(x)} = \\sqrt[n]{L}$"],
          ],
          caption: "En la raíz de índice par se necesita $L > 0$.",
        },
        {
          type: "text",
          md: "La consecuencia práctica es enorme: en polinomios, fracciones de polinomios con denominador distinto de cero, raíces, exponenciales y logaritmos dentro de su dominio, **el límite se calcula sustituyendo**. A esto se le llama sustitución directa.\n\nTambién vale para composiciones: si $g(x) \\to b$ y $f$ es continua en $b$, entonces $\\lim_{x \\to a} f(g(x)) = f(b)$. Por ejemplo, $\\lim_{x \\to 3} \\sqrt{x^2 + 7} = \\sqrt{16} = 4$.",
        },
        {
          type: "example",
          title: "Sustitución directa",
          problem: "Calcula $\\lim_{x \\to 2} \\dfrac{3x^2 - x + 1}{x + 1}$.",
          steps: [
            "El denominador en $x = 2$ vale $3$, que no es cero. Se puede sustituir.",
            "Numerador: $3 \\cdot 4 - 2 + 1 = 11$.",
          ],
          answer: "$\\lim_{x \\to 2} \\dfrac{3x^2 - x + 1}{x + 1} = \\dfrac{11}{3}$",
        },
        {
          type: "note",
          tone: "tip",
          title: "Siempre sustituye primero",
          md: "El primer paso de cualquier límite es sustituir. Si sale un número, terminaste. Solo si sale algo como $\\frac{0}{0}$ hay que trabajar más.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $$\\lim_{x \\to -1} (2x^3 - 4x + 5)$$",
            parts: [limPart("7")],
            solution: ["Es un polinomio: sustituimos. $2(-1)^3 - 4(-1) + 5 = -2 + 4 + 5 = 7$."],
          },
        },
      ],
    },
    {
      id: "indeterminaciones",
      title: "Qué es una indeterminación",
      blocks: [
        {
          type: "text",
          md: "Al sustituir en $\\dfrac{x^2 - 4}{x - 2}$ con $x = 2$ sale $\\frac{0}{0}$. La tentación es decir que eso vale $0$, o $1$, o que no existe. Ninguna de las tres es correcta en general. Mira lo que pasa con fracciones que dan todas $\\frac{0}{0}$ en $x = 0$:",
        },
        {
          type: "table",
          headers: ["Límite", "Al sustituir", "Simplificado", "Resultado"],
          rows: [
            ["$\\lim_{x \\to 0} \\dfrac{x}{x}$", "$\\frac{0}{0}$", "$1$", "$1$"],
            ["$\\lim_{x \\to 0} \\dfrac{3x}{x}$", "$\\frac{0}{0}$", "$3$", "$3$"],
            ["$\\lim_{x \\to 0} \\dfrac{x^2}{x}$", "$\\frac{0}{0}$", "$x$", "$0$"],
            ["$\\lim_{x \\to 0} \\dfrac{x}{x^2}$", "$\\frac{0}{0}$", "$\\frac{1}{x}$", "No existe"],
          ],
          caption: "La misma forma $\\frac{0}{0}$ termina en resultados distintos.",
        },
        {
          type: "text",
          md: "Por eso se llama **indeterminación**: la forma sola no determina el resultado. Lo que decide es qué tan rápido se va a cero el numerador comparado con el denominador, y eso solo se ve simplificando.\n\nHay siete formas indeterminadas. En este tema trabajamos $\\frac{0}{0}$. Las demás aparecen en los temas que siguen.\n\n$$\\frac{0}{0} \\qquad \\frac{\\infty}{\\infty} \\qquad \\infty - \\infty \\qquad 0 \\cdot \\infty \\qquad 1^{\\infty} \\qquad 0^{0} \\qquad \\infty^{0}$$",
        },
        {
          type: "note",
          tone: "warning",
          title: "Lo que no es indeterminación",
          md: "$\\frac{0}{5}$ vale $0$, sin discusión. Y $\\frac{5}{0}$ tampoco es indeterminación: un número fijo entre algo que se hace diminuto crece sin control, así que el límite es infinito o no existe. Eso lo estudiamos en **Límites infinitos y al infinito**.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Al sustituir $x = 3$ en $\\dfrac{x^2 - 9}{x - 3}$ se obtiene $\\frac{0}{0}$. ¿Qué se puede concluir?",
            parts: [
              choice("Todavía nada: hay que simplificar la fracción y volver a sustituir.", [
                ["Que el límite es $0$.", "$\\frac{0}{0}$ no vale $0$. Es una forma indeterminada."],
                ["Que el límite es $1$.", "$\\frac{0}{0}$ no vale $1$. Es una forma indeterminada."],
                ["Que el límite no existe.", "Una indeterminación no significa que el límite no exista. Aquí, de hecho, vale $6$."],
              ]),
            ],
            solution: ["Es una indeterminación. Al factorizar, $\\frac{(x-3)(x+3)}{x-3} = x + 3$ y el límite es $6$."],
          },
        },
      ],
    },
    {
      id: "factorizacion",
      title: "Factorización",
      blocks: [
        {
          type: "text",
          md: "Si al sustituir $x = a$ el numerador y el denominador dan $0$, entonces $a$ es raíz de los dos polinomios. Por el teorema del factor, los dos tienen el factor $(x - a)$. El método es:\n\n- Factoriza el numerador y el denominador.\n- Cancela el factor $(x - a)$. Es válido porque en el límite $x \\ne a$, así que $x - a \\ne 0$.\n- Sustituye en lo que queda.",
        },
        {
          type: "example",
          title: "Dos trinomios",
          problem: "Calcula $\\lim_{x \\to 3} \\dfrac{x^2 - 5x + 6}{x^2 - 9}$.",
          steps: [
            "Sustituyendo: $\\frac{9 - 15 + 6}{9 - 9} = \\frac{0}{0}$.",
            "Factorizamos: $x^2 - 5x + 6 = (x - 2)(x - 3)$ y $x^2 - 9 = (x - 3)(x + 3)$.",
            "Cancelamos $(x - 3)$: queda $\\dfrac{x - 2}{x + 3}$.",
            "Sustituimos: $\\dfrac{1}{6}$.",
          ],
          answer: "$\\dfrac{1}{6}$",
        },
        {
          type: "widget",
          widget: { kind: "limit", fn: "\\frac{x^2-5x+6}{x^2-9}", a: 3, x: [0, 6], y: [-1, 1] },
          caption: "La gráfica tiene un hueco en $x = 3$ a la altura $\\frac{1}{6}$.",
        },
        {
          type: "example",
          title: "Grado tres con Ruffini",
          problem: "Calcula $\\lim_{x \\to 1} \\dfrac{x^3 - 2x^2 - x + 2}{x^2 - 1}$.",
          steps: [
            "Sustituyendo sale $\\frac{1 - 2 - 1 + 2}{0} = \\frac{0}{0}$.",
            "Ruffini con $1$ en el numerador: coeficientes $1, -2, -1, 2$ dan cociente $1, -1, -2$ y resto $0$. Entonces $x^3 - 2x^2 - x + 2 = (x - 1)(x^2 - x - 2)$.",
            "Denominador: $x^2 - 1 = (x - 1)(x + 1)$. Cancelamos $(x - 1)$: queda $\\dfrac{x^2 - x - 2}{x + 1} = \\dfrac{(x - 2)(x + 1)}{x + 1} = x - 2$.",
            "Sustituimos: $1 - 2 = -1$.",
          ],
          answer: "$-1$",
        },
        {
          type: "example",
          title: "Resta de fracciones (salió en parciales)",
          problem: "Calcula $\\lim_{x \\to 1} \\left( \\dfrac{1}{1 - x} - \\dfrac{3}{1 - x^3} \\right)$.",
          steps: [
            "Cada fracción por separado explota. Hay que restarlas primero.",
            "Como $1 - x^3 = (1 - x)(1 + x + x^2)$, el común denominador es $1 - x^3$: $\\dfrac{1 + x + x^2 - 3}{1 - x^3} = \\dfrac{x^2 + x - 2}{1 - x^3}$.",
            "Numerador: $(x - 1)(x + 2)$. Denominador: $(1 - x)(1 + x + x^2) = -(x - 1)(1 + x + x^2)$.",
            "Cancelamos $(x - 1)$: $\\dfrac{-(x + 2)}{1 + x + x^2}$, que en $x = 1$ vale $\\dfrac{-3}{3} = -1$.",
          ],
          answer: "$-1$",
        },
        {
          type: "note",
          tone: "econ",
          title: "Un 0/0 que vas a ver en economía",
          md: "Si el ingreso por vender $q$ unidades es $I(q) = 50q - q^2$, el cambio de ingreso por unidad entre $10$ y $q$ unidades es $\\dfrac{I(q) - I(10)}{q - 10}$. Cuando $q \\to 10$ eso da $\\frac{0}{0}$. Factorizando:\n\n$$\\dfrac{-(q^2 - 50q + 400)}{q - 10} = \\dfrac{-(q - 10)(q - 40)}{q - 10} = 40 - q \\to 30$$\n\nEse $30$ es el **ingreso marginal** en $q = 10$, y es justo la idea de derivada que verás más adelante.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $$\\lim_{x \\to -2} \\dfrac{x^2 + 5x + 6}{x + 2}$$",
            parts: [limPart("1", { mistakes: [{ answer: "0", feedback: "$\\frac{0}{0}$ no vale $0$. Factoriza el numerador." }] })],
            solution: ["$x^2 + 5x + 6 = (x + 2)(x + 3)$. Cancelamos $(x + 2)$ y queda $x + 3$, que en $-2$ vale $1$."],
          },
        },
      ],
    },
    {
      id: "racionalizacion",
      title: "Racionalización",
      blocks: [
        {
          type: "text",
          md: "Cuando el $\\frac{0}{0}$ viene de una raíz, no se puede factorizar directamente. El truco es multiplicar arriba y abajo por el **conjugado**: si aparece $\\sqrt{A} - B$, el conjugado es $\\sqrt{A} + B$. Por la diferencia de cuadrados,\n\n$$(\\sqrt{A} - B)(\\sqrt{A} + B) = A - B^2$$\n\ny la raíz desaparece. Después aparece el factor que se anula y se cancela.",
        },
        {
          type: "example",
          title: "Racionalizar el numerador",
          problem: "Calcula $\\lim_{x \\to 0} \\dfrac{\\sqrt{x + 2} - \\sqrt{2}}{x}$.",
          steps: [
            "Sustituyendo sale $\\frac{0}{0}$. Multiplicamos arriba y abajo por $\\sqrt{x + 2} + \\sqrt{2}$.",
            "Arriba: $(x + 2) - 2 = x$. Abajo: $x(\\sqrt{x + 2} + \\sqrt{2})$.",
            "Cancelamos $x$: $\\dfrac{1}{\\sqrt{x + 2} + \\sqrt{2}}$.",
            "Sustituimos: $\\dfrac{1}{2\\sqrt{2}} = \\dfrac{\\sqrt{2}}{4}$.",
          ],
          answer: "$\\dfrac{\\sqrt{2}}{4}$",
        },
        {
          type: "example",
          title: "Tipo parcial",
          problem: "Calcula $\\lim_{x \\to 7} \\dfrac{2 - \\sqrt{x - 3}}{x^2 - 49}$.",
          steps: [
            "Sustituyendo: $\\frac{2 - 2}{0} = \\frac{0}{0}$. Multiplicamos por $2 + \\sqrt{x - 3}$.",
            "Arriba: $4 - (x - 3) = 7 - x = -(x - 7)$. Abajo: $(x - 7)(x + 7)(2 + \\sqrt{x - 3})$.",
            "Cancelamos $(x - 7)$: $\\dfrac{-1}{(x + 7)(2 + \\sqrt{x - 3})}$.",
            "Sustituimos: $\\dfrac{-1}{14 \\cdot 4} = -\\dfrac{1}{56}$.",
          ],
          answer: "$-\\dfrac{1}{56}$",
        },
        {
          type: "example",
          title: "Doble racionalización",
          problem: "Calcula $\\lim_{x \\to 1} \\dfrac{\\sqrt{x + 3} - 2}{\\sqrt{x + 8} - 3}$.",
          steps: [
            "Hay raíces arriba y abajo, y las dos se anulan. Multiplicamos por los dos conjugados: $\\sqrt{x + 3} + 2$ y $\\sqrt{x + 8} + 3$.",
            "Arriba queda $(x + 3 - 4)(\\sqrt{x + 8} + 3) = (x - 1)(\\sqrt{x + 8} + 3)$.",
            "Abajo queda $(x + 8 - 9)(\\sqrt{x + 3} + 2) = (x - 1)(\\sqrt{x + 3} + 2)$.",
            "Cancelamos $(x - 1)$ y sustituimos: $\\dfrac{3 + 3}{2 + 2} = \\dfrac{3}{2}$.",
          ],
          answer: "$\\dfrac{3}{2}$",
        },
        {
          type: "note",
          tone: "warning",
          title: "Multiplica arriba y abajo",
          md: "Si multiplicas solo el numerador por el conjugado, cambiaste la fracción. Arriba y abajo va el mismo factor, así se multiplica por $1$. Y no hace falta desarrollar el factor que no se cancela: déjalo indicado y sustituye al final.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $$\\lim_{x \\to 9} \\dfrac{\\sqrt{x} - 3}{x - 9}$$",
            parts: [limPart("\\frac{1}{6}", { mistakes: [{ answer: "\\frac{1}{3}", feedback: "Te faltó sumar: al sustituir en $\\sqrt{x} + 3$ queda $3 + 3 = 6$." }] })],
            solution: ["Multiplicamos por $\\sqrt{x} + 3$: arriba queda $x - 9$, que se cancela. Queda $\\frac{1}{\\sqrt{x} + 3} \\to \\frac{1}{6}$."],
          },
        },
      ],
    },
    {
      id: "cambio-variable",
      title: "Cambio de variable con raíces",
      blocks: [
        {
          type: "text",
          md: "Con raíces cúbicas el conjugado cuadrado no sirve. Lo más limpio es cambiar de variable para que la raíz desaparezca: llamas $t$ a la raíz, despejas $x$ y reescribes el límite en $t$. Si hay raíces de índices distintos de la misma expresión, usa como $t$ la raíz cuyo índice es el mínimo común múltiplo. Con una raíz cuadrada y una cúbica, el índice es $6$.",
        },
        {
          type: "example",
          title: "Una raíz cúbica",
          problem: "Calcula $\\lim_{x \\to 8} \\dfrac{\\sqrt[3]{x} - 2}{x - 8}$.",
          steps: [
            "Sea $t = \\sqrt[3]{x}$. Entonces $x = t^3$ y, cuando $x \\to 8$, $t \\to 2$.",
            "El límite queda $\\lim_{t \\to 2} \\dfrac{t - 2}{t^3 - 8}$.",
            "Diferencia de cubos: $t^3 - 8 = (t - 2)(t^2 + 2t + 4)$. Cancelamos $(t - 2)$.",
            "Sustituimos: $\\dfrac{1}{4 + 4 + 4} = \\dfrac{1}{12}$.",
          ],
          answer: "$\\dfrac{1}{12}$",
        },
        {
          type: "example",
          title: "Raíces de distinto índice (salió en parciales)",
          problem: "Calcula $\\lim_{x \\to 9} \\dfrac{\\sqrt[3]{x - 1} - 2}{\\sqrt{x - 1} - 2\\sqrt{2}}$.",
          steps: [
            "Tomamos $t = \\sqrt[6]{x - 1}$. Entonces $\\sqrt[3]{x - 1} = t^2$ y $\\sqrt{x - 1} = t^3$. Cuando $x \\to 9$, $t \\to \\sqrt[6]{8} = \\sqrt{2}$.",
            "El límite queda $\\lim_{t \\to \\sqrt{2}} \\dfrac{t^2 - 2}{t^3 - 2\\sqrt{2}}$.",
            "Arriba: $(t - \\sqrt{2})(t + \\sqrt{2})$. Abajo, diferencia de cubos: $(t - \\sqrt{2})(t^2 + \\sqrt{2}\\,t + 2)$.",
            "Cancelamos y sustituimos: $\\dfrac{2\\sqrt{2}}{2 + 2 + 2} = \\dfrac{\\sqrt{2}}{3}$.",
          ],
          answer: "$\\dfrac{\\sqrt{2}}{3}$",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula $$\\lim_{x \\to 1} \\dfrac{\\sqrt[3]{x} - 1}{x - 1}$$",
            parts: [limPart("\\frac{1}{3}")],
            solution: ["Con $t = \\sqrt[3]{x}$ queda $\\lim_{t \\to 1} \\frac{t - 1}{t^3 - 1} = \\lim_{t \\to 1} \\frac{1}{t^2 + t + 1} = \\frac{1}{3}$."],
          },
        },
      ],
    },
    {
      id: "trozos-parametros",
      title: "Funciones a trozos y parámetros",
      blocks: [
        {
          type: "text",
          md: "En una función a trozos, el límite en un punto de cambio se calcula con los laterales, cada uno con su fórmula. Si la fórmula trae una letra desconocida, la pregunta típica es: ¿qué valor debe tener para que el límite exista? La respuesta sale de igualar los dos laterales.",
        },
        {
          type: "example",
          title: "Dos parámetros, dos puntos",
          problem: "Sea $f(x) = \\begin{cases} 2x + a & \\text{si } x < -1 \\\\ x^2 & \\text{si } -1 \\le x < 2 \\\\ bx & \\text{si } x \\ge 2 \\end{cases}$. Halla $a$ y $b$ para que existan los límites en $x = -1$ y en $x = 2$.",
          steps: [
            "En $x = -1$: por la izquierda $2(-1) + a = a - 2$, por la derecha $(-1)^2 = 1$. Igualamos: $a - 2 = 1$, así que $a = 3$.",
            "En $x = 2$: por la izquierda $2^2 = 4$, por la derecha $2b$. Igualamos: $2b = 4$, así que $b = 2$.",
          ],
          answer: "$a = 3$ y $b = 2$",
        },
        {
          type: "note",
          tone: "warning",
          title: "El valor en el punto no entra en la cuenta",
          md: "Para que el límite exista solo importan los laterales. Si además te piden continuidad, ahí sí tienes que revisar que $f(a)$ coincida con el límite. Eso lo ves en el tema **Continuidad**.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Sea $f(x) = \\begin{cases} x^2 + k & \\text{si } x < 1 \\\\ 3x - 1 & \\text{si } x \\ge 1 \\end{cases}$. Halla $k$ para que exista $\\lim_{x \\to 1} f(x)$.",
            parts: [{ kind: "expr", answer: "1", before: "k =" }],
            solution: ["Por la izquierda $1 + k$, por la derecha $3 - 1 = 2$. Igualamos: $1 + k = 2$, así que $k = 1$."],
          },
        },
      ],
    },
  ],
  exercises: [
    sustitucion,
    propiedades,
    clasificarForma,
    factorCuadratica,
    factorAmbos,
    factorCubica,
    racionalizarSimple,
    fraccionesResta,
    trozosLimite,
    racionalizarDoble,
    cambioVariable,
    parametroExiste,
    factorParametrico,
  ],
};

export default topic;
