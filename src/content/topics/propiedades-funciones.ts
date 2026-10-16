import { meta } from "../catalog";
import { choice, trueFalse } from "../helpers";
import type { ExerciseGen, GraphSpec, Part, Rich, Topic } from "../types";
import { iv, unionTex, type Interval } from "@/lib/math/intervals";
import { poly, terms } from "@/lib/math/tex";
import type { Rng } from "@/lib/math/rng";

/* ----------------------------- utilidades locales ----------------------------- */

const ivTex = (I: Interval[]) => unionTex(I);
const lit = (n: number) => (n === 0 ? "" : n === 1 ? "x" : `x^{${n}}`);

/** Polilínea con vértices enteros y pendientes que alternan de signo. */
function polyline(r: Rng, nSeg: number): [number, number][] {
  for (;;) {
    const pts: [number, number][] = [];
    let x = r.int(-6, -4);
    let y = r.int(-3, 3);
    pts.push([x, y]);
    let up = r.bool();
    for (let i = 0; i < nSeg; i++) {
      x += r.int(2, 3);
      const dy = r.int(1, 5) * (up ? 1 : -1);
      y += dy;
      pts.push([x, y]);
      up = !up;
    }
    const ys = pts.map((p) => p[1]);
    const max = Math.max(...ys);
    const min = Math.min(...ys);
    const uniqueExt = ys.filter((v) => v === max).length === 1 && ys.filter((v) => v === min).length === 1;
    if (max <= 6 && min >= -6 && pts[pts.length - 1][0] <= 7 && uniqueExt) return pts;
  }
}

function polylineGraph(pts: [number, number][], openLast = false): GraphSpec {
  return {
    x: [-7, 8], y: [-7, 7],
    segments: pts.slice(1).map((p, i) => ({ from: pts[i], to: p, color: "accent" as const })),
    points: pts.map(([x, y], i) => ({ x, y, color: "accent" as const, open: openLast && i === pts.length - 1 })),
  };
}

const ivStr = (a: number, b: number) => `$(${a}, ${b})$`;

/* ----------------------------------- ejercicios ----------------------------------- */

const parImparPolinomio: ExerciseGen = {
  id: "par-impar-polinomio",
  title: "¿Par, impar o ninguna? (polinomios)",
  level: 1,
  generate: (r) => {
    const kind = r.pick(["par", "impar", "ninguna"] as const);
    let exps: number[];
    if (kind === "par") exps = r.sample([4, 2, 0], r.int(2, 3));
    else if (kind === "impar") exps = r.sample([5, 3, 1], r.int(2, 3));
    else exps = [r.pick([4, 2, 0]), r.pick([3, 1])];
    exps.sort((a, b) => b - a);
    const coefs = exps.map(() => r.nz(-5, 5));
    const fTex = terms(exps.map((n, i) => [coefs[i], lit(n)]));
    const fNeg = terms(exps.map((n, i) => [coefs[i] * (n % 2 ? -1 : 1), lit(n)]));
    const answer = kind === "par" ? "Par" : kind === "impar" ? "Impar" : "Ni par ni impar";
    const why = kind === "par"
      ? "Todas las potencias son pares, así que $f(-x) = f(x)$."
      : kind === "impar"
        ? "Todas las potencias son impares, así que cada término cambia de signo y $f(-x) = -f(x)$."
        : "Hay potencias pares e impares mezcladas. Unos términos cambian de signo y otros no, así que no se cumple ninguna de las dos igualdades.";
    const all: [Rich, Rich][] = [
      ["Par", "Para ser par, $f(-x)$ tendría que dar exactamente $f(x)$. Compara término a término."],
      ["Impar", "Para ser impar, todos los términos tendrían que cambiar de signo en $f(-x)$."],
      ["Ni par ni impar", "Calcula $f(-x)$ con cuidado. Sí coincide con una de las dos condiciones."],
    ];
    return {
      statement: `Clasifica $f(x) = ${fTex}$.`,
      parts: [choice(answer, all.filter((o) => o[0] !== answer))],
      hints: ["Calcula $f(-x)$: cada potencia par de $-x$ queda igual y cada potencia impar cambia de signo. El término constante cuenta como potencia par."],
      solution: [`$f(-x) = ${fNeg}$.`, why, `Es ${answer.toLowerCase()}.`],
    };
  },
};

const simetriaPunto: ExerciseGen = {
  id: "simetria-punto",
  title: "Usar la simetría para evaluar",
  level: 1,
  generate: (r) => {
    const even = r.bool();
    const a = r.nz(-6, 6);
    const b = r.nz(-9, 9);
    const ans = even ? b : -b;
    return {
      statement: `Si $f$ es una función ${even ? "par" : "impar"} y $f(${a}) = ${b}$, ¿cuánto vale $f(${-a})$?`,
      parts: [{
        kind: "expr", before: `f(${-a}) =`, answer: String(ans),
        mistakes: [{ answer: String(-ans), feedback: even ? "En una función par los puntos simétricos tienen la misma altura. No hay cambio de signo." : "En una función impar los puntos simétricos tienen alturas opuestas." }],
      }],
      hints: [even ? "Par significa $f(-x) = f(x)$. La gráfica es simétrica respecto al eje $y$." : "Impar significa $f(-x) = -f(x)$. La gráfica es simétrica respecto al origen."],
      solution: [
        even ? `Como $f$ es par, $f(${-a}) = f(${a}) = ${b}$.` : `Como $f$ es impar, $f(${-a}) = -f(${a}) = -(${b}) = ${-b}$.`,
      ],
    };
  },
};

const creceDecreceGrafica: ExerciseGen = {
  id: "crece-decrece-grafica",
  title: "Leer el crecimiento en una gráfica",
  level: 1,
  generate: (r) => {
    const pts = polyline(r, 4);
    const segs = pts.slice(1).map((p, i) => ({ a: pts[i][0], b: p[0], up: p[1] > pts[i][1] }));
    const askUp = r.bool();
    const good = r.pick(segs.filter((s) => s.up === askUp));
    const wrong = segs.filter((s) => s.up !== askUp).map((s) => [ivStr(s.a, s.b), `En ese tramo la gráfica ${askUp ? "baja" : "sube"} al avanzar hacia la derecha.`] as [Rich, Rich]);
    const i = segs.indexOf(good);
    const span = i + 1 < segs.length ? segs[i + 1] : segs[i - 1];
    const spanLo = Math.min(good.a, span.a);
    const spanHi = Math.max(good.b, span.b);
    wrong.push([ivStr(spanLo, spanHi), "Ese intervalo mezcla un tramo de subida con uno de bajada. Para ser monótona tiene que hacer lo mismo en todo el intervalo."]);
    return {
      statement: `La gráfica muestra $f$ en todo su dominio. ¿En cuál de estos intervalos $f$ es ${askUp ? "creciente" : "decreciente"}?`,
      graph: polylineGraph(pts),
      parts: [choice(ivStr(good.a, good.b), wrong)],
      hints: ["Recorre la gráfica de izquierda a derecha. Creciente es que suba y decreciente que baje.", "Los intervalos de monotonía se leen en el eje $x$."],
      solution: [
        `Entre $x = ${good.a}$ y $x = ${good.b}$ la gráfica ${askUp ? "sube" : "baja"} sin interrupción.`,
        `Por eso $f$ es ${askUp ? "creciente" : "decreciente"} en $(${good.a}, ${good.b})$.`,
      ],
    };
  },
};

const acotadaVF: ExerciseGen = {
  id: "acotada-vf",
  title: "¿Acotada o no?",
  level: 1,
  generate: (r) => {
    const k = r.int(1, 6);
    const claims: [string, boolean, string][] = [
      [`$f(x) = e^{x} + ${k}$ es acotada inferiormente.`, true, `$e^x > 0$, así que $f(x) > ${k}$ para todo $x$. El número $${k}$ es una cota inferior.`],
      [`$f(x) = x^{2} + ${k}$ es acotada superiormente.`, false, "La parábola abre hacia arriba y crece sin límite. Ningún número queda por encima de todos sus valores."],
      [`$f(x) = ${k} - x^{2}$ es acotada superiormente.`, true, `$-x^2 \\le 0$, así que $f(x) \\le ${k}$. El vértice marca el techo.`],
      ["$f(x) = \\frac{1}{x}$ es acotada.", false, "Cerca de $x = 0$ toma valores tan grandes o tan negativos como se quiera."],
      [`$f(x) = \\frac{${k}}{x^{2} + 1}$ es acotada.`, true, `El denominador es al menos 1, así que $0 < f(x) \\le ${k}$.`],
      ["$f(x) = x^{3}$ es acotada inferiormente.", false, "Hacia la izquierda $x^3$ baja sin límite."],
      [`$f(x) = \\sqrt{x} - ${k}$ es acotada inferiormente.`, true, `$\\sqrt{x} \\ge 0$, así que $f(x) \\ge -${k}$.`],
      [`$f(x) = |x| - ${k}$ es acotada superiormente.`, false, "La V sube sin límite por los dos lados."],
    ];
    const [claim, ok, why] = r.pick(claims);
    return {
      statement: `¿Verdadero o falso? ${claim}`,
      parts: [trueFalse(ok, why)],
      hints: ["Piensa en la gráfica. Acotada superiormente significa que hay un techo que la gráfica nunca pasa. Inferiormente, un piso."],
      solution: [`${ok ? "Verdadero" : "Falso"}. ${why}`],
    };
  },
};

const parImparGeneral: ExerciseGen = {
  id: "par-impar-general",
  title: "¿Par, impar o ninguna? (otras funciones)",
  level: 2,
  generate: (r) => {
    const c = r.int(1, 9);
    const list: { f: string; fneg: string; kind: "Par" | "Impar" | "Ni par ni impar"; note?: string }[] = [
      { f: `\\frac{x}{x^{2} + ${c}}`, fneg: `\\frac{-x}{x^{2} + ${c}}`, kind: "Impar" },
      { f: `\\frac{x^{2}}{x^{2} + ${c}}`, fneg: `\\frac{x^{2}}{x^{2} + ${c}}`, kind: "Par" },
      { f: "x|x|", fneg: "(-x)|-x| = -x|x|", kind: "Impar" },
      { f: `|x| + ${c}x^{2}`, fneg: `|x| + ${c}x^{2}`, kind: "Par" },
      { f: "e^{x} + e^{-x}", fneg: "e^{-x} + e^{x}", kind: "Par" },
      { f: "e^{x} - e^{-x}", fneg: "e^{-x} - e^{x}", kind: "Impar" },
      { f: `\\ln(x^{2} + ${c})`, fneg: `\\ln(x^{2} + ${c})`, kind: "Par" },
      { f: `(x + ${c})^{2}`, fneg: `(-x + ${c})^{2}`, kind: "Ni par ni impar" },
      { f: `x^{3} + ${c}`, fneg: `-x^{3} + ${c}`, kind: "Ni par ni impar" },
      { f: "\\sqrt[3]{x}", fneg: "\\sqrt[3]{-x} = -\\sqrt[3]{x}", kind: "Impar" },
      { f: `\\sqrt{x + ${c}}`, fneg: `\\sqrt{-x + ${c}}`, kind: "Ni par ni impar", note: `Además su dominio $[-${c}, +\\infty)$ no es simétrico, así que ni siquiera se puede comparar en todos los puntos.` },
      { f: "e^{x}", fneg: "e^{-x}", kind: "Ni par ni impar" },
    ];
    const t = r.pick(list);
    const why = t.kind === "Par" ? "Coincide con $f(x)$." : t.kind === "Impar" ? "Es exactamente $-f(x)$." : "No es igual a $f(x)$ ni a $-f(x)$. Basta probar con un número, por ejemplo $x = 1$.";
    const all: [Rich, Rich][] = [
      ["Par", "Compara $f(-x)$ con $f(x)$: no son iguales para todo $x$."],
      ["Impar", "Compara $f(-x)$ con $-f(x)$: no son iguales para todo $x$."],
      ["Ni par ni impar", "Al simplificar $f(-x)$ sí aparece una de las dos relaciones."],
    ];
    return {
      statement: `Clasifica $f(x) = ${t.f}$.`,
      parts: [choice(t.kind, all.filter((o) => o[0] !== t.kind))],
      hints: ["Sustituye $x$ por $-x$ en toda la fórmula y simplifica.", "Recuerda que $(-x)^2 = x^2$, $|-x| = |x|$ y $(-x)^3 = -x^3$."],
      solution: [`$f(-x) = ${t.fneg}$.`, why, ...(t.note ? [t.note] : []), `Es ${t.kind.toLowerCase()}.`],
    };
  },
};

const crecimientoParabola: ExerciseGen = {
  id: "crecimiento-parabola",
  title: "Dónde crece y dónde decrece una parábola",
  level: 2,
  generate: (r) => {
    const a = r.pick([1, -1, 2, -2, 3]);
    const h = r.nz(-5, 5);
    const k = r.int(-5, 5);
    const fTex = poly([a, -2 * a * h, a * h * h + k]);
    const askUp = r.bool();
    const left = `$(-\\infty, ${h})$`;
    const right = `$(${h}, +\\infty)$`;
    const upOnLeft = a < 0;
    const correct = askUp === upOnLeft ? left : right;
    const other = correct === left ? right : left;
    const neg = [`$(-\\infty, ${-h})$`, `$(${-h}, +\\infty)$`];
    return {
      statement: `¿En qué intervalo es ${askUp ? "creciente" : "decreciente"} $f(x) = ${fTex}$?`,
      parts: [choice(correct, [
        [other, `Ahí la parábola hace lo contrario. Con $a = ${a}$ abre hacia ${a > 0 ? "arriba" : "abajo"}.`],
        [neg[correct === left ? 0 : 1], "El signo de la abscisa del vértice está cambiado. Revisa $x_v = -\\frac{b}{2a}$."],
        ["$\\mathbb{R}$", "Una parábola nunca es monótona en toda la recta: cambia de sentido en el vértice."],
      ])],
      hints: ["La parábola cambia de sentido en el vértice, $x_v = -\\frac{b}{2a}$.", "Si abre hacia arriba, baja antes del vértice y sube después."],
      solution: [
        `$x_v = ${h}$ y $a = ${a}$, así que abre hacia ${a > 0 ? "arriba" : "abajo"}.`,
        a > 0 ? `Decrece en $(-\\infty, ${h})$ y crece en $(${h}, +\\infty)$.` : `Crece en $(-\\infty, ${h})$ y decrece en $(${h}, +\\infty)$.`,
      ],
    };
  },
};

const extremoCuadratica: ExerciseGen = {
  id: "extremo-cuadratica",
  title: "Máximo o mínimo de una parábola",
  level: 2,
  generate: (r) => {
    const a = r.pick([1, -1, 2, -2, -3]);
    const h = r.nz(-5, 5);
    let k = r.int(-8, 8);
    if (k === h) k += 1;
    const fTex = poly([a, -2 * a * h, a * h * h + k]);
    const isMax = a < 0;
    return {
      statement: `Para $f(x) = ${fTex}$ en todo $\\mathbb{R}$, determina su extremo absoluto.`,
      sequential: true,
      parts: [
        choice(isMax ? "Tiene máximo absoluto y no tiene mínimo." : "Tiene mínimo absoluto y no tiene máximo.", [
          [isMax ? "Tiene mínimo absoluto y no tiene máximo." : "Tiene máximo absoluto y no tiene mínimo.", `Con $a = ${a}$ la parábola abre hacia ${isMax ? "abajo, así que el vértice es el punto más alto" : "arriba, así que el vértice es el punto más bajo"}.`],
          ["Tiene máximo y mínimo absolutos.", "Uno de los dos lados se va al infinito, así que solo hay un extremo."],
        ], "¿Qué tiene $f$?"),
        { kind: "expr", prompt: "¿En qué $x$ se alcanza?", before: "x =", answer: String(h), mistakes: [{ answer: String(-h), feedback: "Revisa el signo en $x_v = -\\frac{b}{2a}$." }] },
        { kind: "expr", prompt: `Valor ${isMax ? "máximo" : "mínimo"}`, before: "f(x_v) =", answer: String(k), mistakes: [{ answer: String(h), feedback: "Ese es el punto donde se alcanza. El valor es la altura $f(x_v)$." }] },
      ],
      hints: ["El extremo de una parábola está en el vértice.", "El valor extremo es $f(x_v)$, una altura, no un $x$."],
      solution: [
        `$x_v = -\\frac{${-2 * a * h}}{2 \\cdot ${a < 0 ? `(${a})` : a}} = ${h}$.`,
        `$f(${h}) = ${k}$.`,
        `Como $a ${a > 0 ? ">" : "<"} 0$, $f$ alcanza su valor ${isMax ? "máximo" : "mínimo"} $${k}$ en $x = ${h}$ y no tiene ${isMax ? "mínimo" : "máximo"}.`,
      ],
    };
  },
};

const cotasRango: ExerciseGen = {
  id: "cotas-rango",
  title: "Clasificar según la acotación",
  level: 2,
  generate: (r) => {
    const k = r.int(1, 5);
    const list: { f: string; ans: string; rango: string; why: string }[] = [
      { f: `e^{x} - ${k}`, ans: "Solo inferiormente", rango: `(-${k}, +\\infty)`, why: `Nunca baja de $-${k}$, pero crece sin límite.` },
      { f: `${k} - e^{x}`, ans: "Solo superiormente", rango: `(-\\infty, ${k})`, why: `Nunca pasa de $${k}$, pero hacia la derecha baja sin límite.` },
      { f: `-x^{2} + ${k}`, ans: "Solo superiormente", rango: `(-\\infty, ${k}]`, why: `El vértice $(0, ${k})$ es el techo y la parábola baja sin límite.` },
      { f: `\\frac{${k}}{x^{2} + 1}`, ans: "Acotada superior e inferiormente", rango: `(0, ${k}]`, why: `Está entre $0$ y $${k}$.` },
      { f: `\\sqrt{${k * k} - x^{2}}`, ans: "Acotada superior e inferiormente", rango: `[0, ${k}]`, why: `Es una semicircunferencia: va de $0$ a $${k}$.` },
      { f: `x^{3} - ${k}`, ans: "No es acotada", rango: "\\mathbb{R}", why: "Toma todos los reales." },
      { f: `\\ln x + ${k}`, ans: "No es acotada", rango: "\\mathbb{R}", why: "El logaritmo baja sin límite cerca de 0 y sube sin límite hacia la derecha." },
      { f: `|x - ${k}|`, ans: "Solo inferiormente", rango: "[0, +\\infty)", why: "El piso es 0 y no hay techo." },
    ];
    const t = r.pick(list);
    const opts = ["Solo superiormente", "Solo inferiormente", "Acotada superior e inferiormente", "No es acotada"];
    return {
      statement: `¿Cómo es $f(x) = ${t.f}$ en su dominio?`,
      parts: [choice(t.ans, opts.filter((o) => o !== t.ans).map((o) => [o, `Mira el rango: $${t.rango}$. ${t.why}`] as [Rich, Rich]))],
      hints: ["Halla el rango. Si tiene un extremo derecho finito, hay techo. Si tiene un extremo izquierdo finito, hay piso."],
      solution: [`$\\text{Rgo} f = ${t.rango}$. ${t.why}`, `Respuesta: ${t.ans.toLowerCase()}.`],
    };
  },
};

const extremosIntervalo: ExerciseGen = {
  id: "extremos-intervalo",
  title: "Máximo y mínimo en un intervalo cerrado (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const a = r.pick([1, -1, 1, -1, 2]);
    const h = r.int(-3, 3);
    const k = r.int(-5, 5);
    const f = (x: number) => a * (x - h) ** 2 + k;
    let p: number, q: number;
    do {
      p = r.int(-5, 3);
      q = p + r.int(2, 5);
    } while (f(p) === f(q));
    const fTex = poly([a, -2 * a * h, a * h * h + k]);
    const cands = [p, q, ...(h > p && h < q ? [h] : [])];
    const vals = cands.map(f);
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    const xMax = cands[vals.indexOf(max)];
    const xMin = cands[vals.indexOf(min)];
    const inside = h > p && h < q;
    return {
      statement: `Sea $f: [${p}, ${q}] \\to \\mathbb{R}$ con $f(x) = ${fTex}$. Halla sus extremos absolutos y su rango.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Valor máximo", before: "\\max f =", answer: String(max) },
        { kind: "expr", prompt: "¿En qué $x$ se alcanza el máximo?", before: "x =", answer: String(xMax) },
        { kind: "expr", prompt: "Valor mínimo", before: "\\min f =", answer: String(min), mistakes: inside || min === k ? [] : [{ answer: String(k), feedback: `El vértice está en $x = ${h}$, fuera de $[${p}, ${q}]$. No cuenta.` }] },
        { kind: "interval", prompt: "Rango", before: "\\text{Rgo} f =", answer: [iv(min, max, true, true)] },
      ],
      hints: [
        "En un intervalo cerrado los extremos solo pueden estar en los bordes del intervalo o en el vértice, si cae adentro.",
        "Evalúa $f$ en cada candidato y compara.",
      ],
      solution: [
        `El vértice está en $x = ${h}$, ${inside ? "dentro del intervalo" : h === p || h === q ? "justo en un borde del intervalo" : "fuera del intervalo, así que no cuenta"}.`,
        `Candidatos: ${cands.map((x) => `$f(${x}) = ${f(x)}$`).join(", ")}.`,
        `El mayor es $${max}$, en $x = ${xMax}$. El menor es $${min}$, en $x = ${xMin}$.`,
        `Como $f$ es continua en $[${p}, ${q}]$, toma todos los valores intermedios: $\\text{Rgo} f = [${min}, ${max}]$.`,
      ],
    };
  },
};

const demostrarParidad: ExerciseGen = {
  id: "demostrar-paridad",
  title: "Probar la paridad con álgebra (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const a = r.int(2, 5);
    const c = r.int(1, 9);
    const list: { f: string; fneg: string; kind: "Par" | "Impar" | "Ni par ni impar" }[] = [
      { f: `\\frac{${a}x^{3}}{x^{2} + ${c}}`, fneg: `-\\frac{${a}x^{3}}{x^{2} + ${c}}`, kind: "Impar" },
      { f: `\\frac{x^{2} + ${a}}{x^{4} + ${c}}`, fneg: `\\frac{x^{2} + ${a}}{x^{4} + ${c}}`, kind: "Par" },
      { f: `\\frac{x + ${a}}{x^{2} + ${c}}`, fneg: `\\frac{-x + ${a}}{x^{2} + ${c}}`, kind: "Ni par ni impar" },
      { f: `${a}x^{3} - ${c}x`, fneg: `-${a}x^{3} + ${c}x`, kind: "Impar" },
      { f: `x^{2} + ${a}x`, fneg: `x^{2} - ${a}x`, kind: "Ni par ni impar" },
      { f: `${a}|x| - x^{2}`, fneg: `${a}|x| - x^{2}`, kind: "Par" },
      { f: `x^{2}|x| + ${c}`, fneg: `x^{2}|x| + ${c}`, kind: "Par" },
      { f: `\\frac{${a}x}{|x| + ${c}}`, fneg: `-\\frac{${a}x}{|x| + ${c}}`, kind: "Impar" },
    ];
    const t = r.pick(list);
    const fNegPart: Part = {
      kind: "expr",
      prompt: "Calcula $f(-x)$ y simplifica.",
      before: "f(-x) =",
      answer: t.fneg,
      vars: ["x"],
      mistakes: t.kind === "Par" ? [] : [{ answer: t.f, feedback: "Ese es $f(x)$ sin cambios. Sustituye cada $x$ por $(-x)$ y simplifica los signos." }],
    };
    const all: [Rich, Rich][] = [
      ["Par", "Para ser par, $f(-x)$ tendría que ser igual a $f(x)$."],
      ["Impar", "Para ser impar, $f(-x)$ tendría que ser igual a $-f(x)$."],
      ["Ni par ni impar", "Mira bien tu $f(-x)$: coincide con $f(x)$ o con $-f(x)$."],
    ];
    return {
      statement: `Sea $f(x) = ${t.f}$, con dominio $\\mathbb{R}$. Determina analíticamente si es par, impar o ninguna de las dos.`,
      sequential: true,
      parts: [fNegPart, choice(t.kind, all.filter((o) => o[0] !== t.kind), "Entonces $f$ es...")],
      hints: [
        "El dominio $\\mathbb{R}$ es simétrico, así que basta comparar $f(-x)$ con $f(x)$ y con $-f(x)$.",
        "$(-x)^2 = x^2$, $(-x)^3 = -x^3$, $(-x)^4 = x^4$ y $|-x| = |x|$.",
      ],
      solution: [
        "El dominio es $\\mathbb{R}$, que es simétrico: si $x$ está, $-x$ también.",
        `$f(-x) = ${t.fneg}$.`,
        t.kind === "Par" ? "Eso es igual a $f(x)$ para todo $x$. La función es par y su gráfica es simétrica respecto al eje $y$."
          : t.kind === "Impar" ? "Eso es igual a $-f(x)$ para todo $x$. La función es impar y su gráfica es simétrica respecto al origen."
            : "No coincide con $f(x)$ ni con $-f(x)$. Para probarlo basta un contraejemplo: evalúa en $x = 1$ y en $x = -1$ y compara.",
      ],
    };
  },
};

const lecturaGrafica: ExerciseGen = {
  id: "lectura-grafica",
  title: "Extremos y rango desde una gráfica (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    let pts: [number, number][];
    let openLast: boolean;
    do {
      pts = polyline(r, r.int(3, 4));
      openLast = r.bool(0.4);
      const ys = pts.map((p) => p[1]);
      const last = ys[ys.length - 1];
      if (!openLast || (last !== Math.max(...ys) && last !== Math.min(...ys))) break;
    } while (true);
    const ys = pts.map((p) => p[1]);
    const max = Math.max(...ys);
    const min = Math.min(...ys);
    const xMax = pts[ys.indexOf(max)][0];
    const xMin = pts[ys.indexOf(min)][0];
    const a = pts[0][0];
    const b = pts[pts.length - 1][0];
    const segs = pts.slice(1).map((p, i) => ({ a: pts[i][0], b: p[0], up: p[1] > pts[i][1] }));
    const dec = segs.filter((s) => !s.up);
    const decTex = dec.map((s) => `(${s.a}, ${s.b})`).join(", ");
    return {
      statement: `La gráfica muestra $f: [${a}, ${b}${openLast ? ")" : "]"} \\to \\mathbb{R}$. Responde leyendo la gráfica.`,
      graph: polylineGraph(pts, openLast),
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Valor máximo absoluto", before: "\\max f =", answer: String(max), mistakes: max === xMax ? [] : [{ answer: String(xMax), feedback: "Ese es el $x$ donde se alcanza. El valor máximo es la altura." }] },
        { kind: "expr", prompt: "¿En qué $x$ se alcanza el máximo?", before: "x =", answer: String(xMax) },
        { kind: "expr", prompt: "Valor mínimo absoluto", before: "\\min f =", answer: String(min) },
        { kind: "interval", prompt: "Rango", before: "\\text{Rgo} f =", answer: [iv(min, max, true, true)] },
      ],
      hints: [
        "El máximo absoluto es la altura del punto más alto de toda la gráfica, y el mínimo la del más bajo.",
        "Un punto hueco no cuenta como alcanzado.",
        "Para el rango proyecta la gráfica sobre el eje $y$.",
      ],
      solution: [
        `El punto más alto es $(${xMax}, ${max})$: el valor máximo es $${max}$ y se alcanza en $x = ${xMax}$.`,
        `El punto más bajo es $(${xMin}, ${min})$: el valor mínimo es $${min}$.`,
        `La gráfica es continua, así que toma todas las alturas entre $${min}$ y $${max}$: $\\text{Rgo} f = [${min}, ${max}]$.`,
        `De paso, $f$ decrece en ${dec.length > 1 ? "los intervalos" : "el intervalo"} $${decTex}$ y crece en el resto.`,
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("propiedades-funciones"),
  objectives: [
    "Decidir si una función es par, impar o ninguna, con álgebra y mirando la gráfica.",
    "Dar los intervalos donde una función crece o decrece.",
    "Reconocer si una función es acotada y escribir una cota.",
    "Hallar los valores máximo y mínimo absolutos de una función en su dominio.",
  ],
  sections: [
    {
      id: "simetria",
      title: "Funciones pares e impares",
      blocks: [
        {
          type: "text",
          md: "Algunas gráficas se ven iguales en un espejo. La de $y = x^2$, por ejemplo, tiene la mitad izquierda idéntica a la derecha: $(-3)^2$ y $3^2$ dan lo mismo. Otras, como $y = x^3$, se repiten pero volteadas: $(-2)^3 = -8$ es justo el opuesto de $2^3 = 8$.\n\nEsas dos simetrías tienen nombre.",
        },
        {
          type: "definition",
          title: "Par e impar",
          md: "Sea $f$ con un dominio simétrico (si $x$ está, $-x$ también).\n\n- $f$ es **par** si $f(-x) = f(x)$ para todo $x$ del dominio. Su gráfica es simétrica respecto al **eje $y$**.\n- $f$ es **impar** si $f(-x) = -f(x)$ para todo $x$ del dominio. Su gráfica es simétrica respecto al **origen**: si giras la gráfica media vuelta, queda igual.",
        },
        {
          type: "graph",
          spec: {
            x: [-4, 4], y: [-5, 5],
            curves: [
              { fn: "x^{2}-2", color: "accent", label: "par" },
              { fn: "\\frac{x^{3}}{4}", color: "blue", label: "impar" },
            ],
            points: [
              { x: -2, y: 2, color: "accent" }, { x: 2, y: 2, color: "accent" },
              { x: -2, y: -2, color: "blue" }, { x: 2, y: 2, color: "blue" },
            ],
            segments: [{ from: [-2, 2], to: [2, 2], dashed: true, color: "accent" }, { from: [-2, -2], to: [2, 2], dashed: true, color: "blue" }],
          },
          caption: "En la par, $x = 2$ y $x = -2$ tienen la misma altura. En la impar tienen alturas opuestas y el segmento que los une pasa por el origen.",
        },
        {
          type: "example",
          title: "Tres casos",
          problem: "Clasifica $f(x) = x^4 - 3x^2$, $g(x) = x^3 - 5x$ y $h(x) = x^2 + x$.",
          steps: [
            "$f(-x) = (-x)^4 - 3(-x)^2 = x^4 - 3x^2 = f(x)$. Es par.",
            "$g(-x) = (-x)^3 - 5(-x) = -x^3 + 5x = -(x^3 - 5x) = -g(x)$. Es impar.",
            "$h(-x) = x^2 - x$. No es $h(x)$ ni $-h(x) = -x^2 - x$. Para confirmarlo basta un número: $h(1) = 2$ y $h(-1) = 0$, que no son ni iguales ni opuestos.",
          ],
          answer: "$f$ es par, $g$ es impar y $h$ no es ni par ni impar.",
        },
        {
          type: "note",
          tone: "tip",
          title: "Atajo para polinomios",
          md: "Si un polinomio solo tiene potencias pares (la constante cuenta como $x^0$), es par. Si solo tiene potencias impares, es impar. Si mezcla, no es ninguna.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Primero el dominio",
          md: "$\\sqrt{x}$ no es par ni impar, porque en $x = 4$ existe y en $x = -4$ no. Lo mismo pasa con $x^2$ definida solo en $[-1, 3]$: aunque la fórmula sea par, el dominio no es simétrico. La mayoría de las funciones no son ni pares ni impares.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Es par la función $f(x) = |x| + x^2$?",
            parts: [trueFalse(true, "$f(-x) = |-x| + (-x)^2 = |x| + x^2 = f(x)$.")],
            solution: ["$|-x| = |x|$ y $(-x)^2 = x^2$, así que $f(-x) = f(x)$. Es par."],
          },
        },
      ],
    },
    {
      id: "monotonia",
      title: "Crecimiento y decrecimiento",
      blocks: [
        {
          type: "text",
          md: "Leer una gráfica de izquierda a derecha es como caminar por un cerro. En unos tramos subes y en otros bajas. Que una función sea creciente en un intervalo quiere decir que, dentro de ese intervalo, cada paso a la derecha te deja más alto.",
        },
        {
          type: "definition",
          title: "Creciente y decreciente",
          md: "Sea $I$ un intervalo dentro del dominio de $f$.\n\n- $f$ es **creciente** en $I$ si para todo $a < b$ en $I$ se cumple $f(a) < f(b)$.\n- $f$ es **decreciente** en $I$ si para todo $a < b$ en $I$ se cumple $f(a) > f(b)$.\n\nCon $\\le$ en lugar de $<$ se habla de **no decreciente**, y con $\\ge$ de **no creciente**. Una función que hace una sola de esas cosas en $I$ es **monótona** en $I$.",
        },
        {
          type: "graph",
          spec: {
            x: [-3, 3], y: [-4, 4],
            curves: [{ fn: "x^{3}-3x", color: "accent" }],
            points: [{ x: -1, y: 2, label: "(-1, 2)" }, { x: 1, y: -2, label: "(1, -2)" }],
            vlines: [{ x: -1, dashed: true, color: "muted" }, { x: 1, dashed: true, color: "muted" }],
          },
          caption: "$f(x) = x^3 - 3x$ crece en $(-\\infty, -1)$, decrece en $(-1, 1)$ y vuelve a crecer en $(1, +\\infty)$.",
        },
        {
          type: "note",
          tone: "tip",
          title: "Cómo se escriben los intervalos",
          md: "Los intervalos de crecimiento se leen en el eje $x$, no en el $y$. La guía de la cátedra los escribe abiertos, como $(-1, 1)$, y así los vamos a escribir aquí.",
        },
        {
          type: "example",
          title: "Monotonía de una parábola",
          problem: "¿Dónde crece y dónde decrece $f(x) = -x^2 + 6x - 5$?",
          steps: [
            "Vértice: $x_v = -\\frac{6}{2(-1)} = 3$.",
            "Como $a = -1 < 0$, la parábola abre hacia abajo: sube hasta el vértice y después baja.",
          ],
          answer: "Crece en $(-\\infty, 3)$ y decrece en $(3, +\\infty)$.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Demanda y oferta",
          md: "La ley de la demanda dice que, si el precio sube, la cantidad demandada baja: la demanda es una función decreciente del precio. La oferta suele ser creciente, porque a mejor precio los productores quieren vender más. Muchos textos de economía dicen \"estrictamente creciente\" para lo que aquí llamamos creciente.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿En qué intervalo es decreciente $f(x) = x^2 - 4x$?",
            parts: [choice("$(-\\infty, 2)$", [["$(2, +\\infty)$", "Ahí la parábola sube. Abre hacia arriba, así que baja antes del vértice."], ["$(-\\infty, -2)$", "El vértice está en $x = 2$, no en $-2$."]])],
            solution: ["$x_v = -\\frac{-4}{2} = 2$ y la parábola abre hacia arriba. Decrece en $(-\\infty, 2)$."],
          },
        },
      ],
    },
    {
      id: "acotadas",
      title: "Funciones acotadas",
      blocks: [
        {
          type: "text",
          md: "Hay funciones que, por más que cambie $x$, nunca pasan de cierta altura. Es como un techo. Otras nunca bajan de un piso. Esa idea es la acotación, y se lee directo en el rango.",
        },
        {
          type: "definition",
          title: "Cotas",
          md: "- $f$ es **acotada superiormente** si existe un número $u$ con $f(x) \\le u$ para todo $x$ del dominio. Ese $u$ es una cota superior.\n- $f$ es **acotada inferiormente** si existe $l$ con $f(x) \\ge l$ para todo $x$.\n- $f$ es **acotada** si cumple las dos cosas, o sea, si su rango es un conjunto acotado.",
        },
        {
          type: "graph",
          spec: {
            x: [-6, 6], y: [-1, 3],
            curves: [{ fn: "\\frac{2}{x^{2}+1}", color: "accent" }],
            hlines: [{ y: 2, dashed: true, color: "red", label: "techo y = 2" }, { y: 0, dashed: true, color: "blue", label: "piso y = 0" }],
          },
          caption: "$f(x) = \\frac{2}{x^2 + 1}$ es acotada: su rango es $(0, 2]$. Alcanza el techo en $x = 0$ pero nunca toca el piso.",
        },
        {
          type: "example",
          title: "Leer las cotas en el rango",
          problem: "Clasifica $f(x) = e^x$, $g(x) = 4 - x^2$ y $h(x) = x^3$ según la acotación.",
          steps: [
            "$\\text{Rgo} f = (0, +\\infty)$. Tiene piso en 0 pero no techo: solo es acotada inferiormente.",
            "$\\text{Rgo} g = (-\\infty, 4]$. Tiene techo en 4 pero no piso: solo es acotada superiormente.",
            "$\\text{Rgo} h = \\mathbb{R}$. No tiene ni techo ni piso: no es acotada.",
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "La cota no tiene que alcanzarse",
          md: "$e^x$ es acotada inferiormente por 0 aunque nunca valga 0. Cualquier número menor, como $-5$, también es una cota inferior. Acotada no significa que tenga mínimo.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Es acotada la función $f(x) = \\frac{1}{x}$, con $x \\ne 0$?",
            parts: [trueFalse(false, "Cerca de 0, $\\frac{1}{x}$ toma valores tan grandes como quieras (y tan negativos como quieras del otro lado).")],
            solution: ["Su rango es $\\mathbb{R} - \\{0\\}$, que no tiene ni techo ni piso. No es acotada."],
          },
        },
      ],
    },
    {
      id: "extremos",
      title: "Máximos y mínimos absolutos",
      blocks: [
        {
          type: "text",
          md: "Cuando el techo sí se toca, se habla de máximo. El **valor máximo** de una función es la mayor altura que alcanza en todo su dominio. Hay que separar dos cosas que se confunden mucho: el valor máximo es una altura $f(a)$, y el lugar donde se alcanza es un $x = a$.",
        },
        {
          type: "definition",
          title: "Máximo y mínimo absolutos",
          md: "- $f$ tiene un **máximo** en $a$ si $f(x) \\le f(a)$ para todo $x$ del dominio. El número $f(a)$ es el valor máximo, el mayor elemento de $\\text{Rgo} f$.\n- $f$ tiene un **mínimo** en $b$ si $f(x) \\ge f(b)$ para todo $x$ del dominio. El número $f(b)$ es el valor mínimo.\n\nUna función puede alcanzar su máximo en varios puntos, pero el valor máximo es uno solo.",
        },
        {
          type: "example",
          title: "Extremos en un intervalo cerrado",
          problem: "Halla los extremos de $f(x) = x^2 - 2x$ en $[-1, 2]$.",
          steps: [
            "Vértice: $x_v = 1$, que está dentro del intervalo. $f(1) = -1$.",
            "Bordes: $f(-1) = 1 + 2 = 3$ y $f(2) = 4 - 4 = 0$.",
            "Comparamos los tres valores: el mayor es 3 y el menor es $-1$.",
          ],
          answer: "Máximo 3 en $x = -1$, mínimo $-1$ en $x = 1$. El rango es $[-1, 3]$.",
        },
        {
          type: "graph",
          spec: {
            x: [-2, 3], y: [-2, 4],
            curves: [{ fn: "x^{2}-2x", domain: [-1, 2], color: "accent" }, { fn: "x^{2}-2x", color: "muted", dashed: true }],
            points: [{ x: -1, y: 3, label: "máx (-1, 3)" }, { x: 2, y: 0 }, { x: 1, y: -1, label: "mín (1, -1)" }],
          },
        },
        {
          type: "note",
          tone: "warning",
          title: "Sin bordes puede no haber extremos",
          md: "$f(x) = x^2$ en $(0, 2)$ no tiene ni máximo ni mínimo. Se acerca a 0 y a 4, pero los bordes no están en el dominio. Por eso en los ejercicios importa tanto si el intervalo es abierto o cerrado.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Por qué importa en economía",
          md: "Buena parte de la economía consiste en buscar extremos: el nivel de producción que da la mayor utilidad o el que da el menor costo promedio. Con parábolas se resuelve con el vértice. Más adelante, con derivadas, se resuelve para cualquier función.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Cuál es el valor máximo de $f(x) = -x^2 + 4x + 1$?",
            parts: [{ kind: "expr", before: "\\max f =", answer: "5", mistakes: [{ answer: "2", feedback: "Ese es el $x$ del vértice. Te piden la altura $f(2)$." }] }],
            solution: ["$x_v = -\\frac{4}{2(-1)} = 2$ y $f(2) = -4 + 8 + 1 = 5$. Abre hacia abajo, así que 5 es el máximo."],
          },
        },
      ],
    },
    {
      id: "clasificacion",
      title: "Resumen de las funciones de uso frecuente",
      blocks: [
        {
          type: "text",
          md: "Con estas cuatro propiedades se puede describir cada función básica del tema anterior. La tabla resume la clasificación que hace la guía de la cátedra. Vale la pena saber justificar cada casilla con la gráfica.",
        },
        {
          type: "table",
          headers: ["Función", "Paridad", "Monotonía", "Acotación", "Extremos"],
          rows: [
            ["$C$ (constante)", "Par", "Ni crece ni decrece (es no decreciente)", "Acotada", "$C$ es máximo y mínimo"],
            ["$mx + b$, $m > 0$", "Impar solo si $b = 0$", "Creciente", "No acotada", "Ninguno"],
            ["$ax^2 + bx + c$, $a > 0$", "Par solo si $b = 0$", "Decrece y luego crece", "Solo inferiormente", "Mínimo en el vértice"],
            ["$ax^3$, $a > 0$", "Impar", "Creciente", "No acotada", "Ninguno"],
            ["$|x|$", "Par", "Decrece en $(-\\infty, 0)$, crece en $(0, +\\infty)$", "Solo inferiormente", "Mínimo 0 en $x = 0$"],
            ["$\\frac{1}{x}$", "Impar", "Decrece en $(-\\infty, 0)$ y en $(0, +\\infty)$", "No acotada", "Ninguno"],
            ["$\\sqrt{x}$", "Ninguna", "Creciente", "Solo inferiormente", "Mínimo 0 en $x = 0$"],
            ["$\\sqrt[3]{x}$", "Impar", "Creciente", "No acotada", "Ninguno"],
            ["$a^x$, $a > 1$", "Ninguna", "Creciente", "Solo inferiormente", "Ninguno"],
            ["$\\log_a x$, $a > 1$", "Ninguna", "Creciente", "No acotada", "Ninguno"],
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "La trampa de 1/x",
          md: "$\\frac{1}{x}$ es decreciente en $(-\\infty, 0)$ y también en $(0, +\\infty)$, pero **no** es decreciente en su dominio completo: $f(-1) = -1 < f(1) = 1$. Por eso se dan los dos intervalos por separado y no su unión.",
        },
        {
          type: "example",
          title: "Describir una función completa",
          problem: "Describe $f(x) = 2 - |x|$.",
          steps: [
            "$f(-x) = 2 - |-x| = 2 - |x| = f(x)$. Es par.",
            "Es una V invertida con punta en $(0, 2)$: crece en $(-\\infty, 0)$ y decrece en $(0, +\\infty)$.",
            "Su rango es $(-\\infty, 2]$: acotada superiormente, no inferiormente.",
            "Valor máximo 2 en $x = 0$. No tiene mínimo.",
          ],
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Cuál de estas funciones es impar?",
            parts: [choice("$f(x) = \\sqrt[3]{x}$", [["$f(x) = \\sqrt{x}$", "Su dominio $[0, +\\infty)$ no es simétrico."], ["$f(x) = |x|$", "Es par: $|-x| = |x|$."], ["$f(x) = 2^x$", "$2^{-x}$ no es igual a $-2^x$, que es negativo."]])],
            solution: ["$\\sqrt[3]{-x} = -\\sqrt[3]{x}$, así que la raíz cúbica es impar."],
          },
        },
      ],
    },
  ],
  exercises: [
    parImparPolinomio,
    simetriaPunto,
    creceDecreceGrafica,
    acotadaVF,
    parImparGeneral,
    crecimientoParabola,
    extremoCuadratica,
    cotasRango,
    extremosIntervalo,
    demostrarParidad,
    lecturaGrafica,
  ],
};

export default topic;
