import { meta } from "../catalog";
import { trueFalse } from "../helpers";
import type { ExerciseGen, GraphSpec, Mistake, Part, Topic } from "../types";
import { coef, fmt, frac, gcd, minus, signed, terms } from "@/lib/math/tex";
import type { Rng } from "@/lib/math/rng";

/* ----------------------------- utilidades locales ----------------------------- */

/** Ecuación general Ax + By + C = 0. */
const general = (A: number, B: number, C: number) => `${terms([[A, "x"], [B, "y"], [C, ""]])} = 0`;
/** mx + b, con m y b posiblemente fraccionarios. */
const yForm = (m: number, b: number) => terms([[m, "x"], [b, ""]]);
const pt = (x: number, y: number) => `(${fmt(x)}, ${fmt(y)})`;
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
/** Coeficiente de un paréntesis: 1 -> "", -1 -> "-", 2/3 -> \frac{2}{3}. */
const mCoef = (m: number) => (near(m, 1) ? "" : near(m, -1) ? "-" : fmt(m));
/** Forma punto-pendiente y - y1 = m(x - x1). */
const pointSlope = (m: number, x1: number, y1: number) =>
  `${y1 === 0 ? "y" : `y ${signed(-y1)}`} = ${x1 === 0 ? coef(m, "x") : near(m, 1) ? minus("x", x1) : `${mCoef(m)}(${minus("x", x1)})`}`;
/** Envuelve negativos en paréntesis. */
const par = (n: number) => (n < 0 ? `(${fmt(n)})` : fmt(n));

/** Raíz cuadrada simplificada: 20 -> 2\sqrt{5}. */
function sqrtTex(n: number): string {
  let out = 1;
  let rest = n;
  for (let k = Math.floor(Math.sqrt(n)); k >= 2; k--) {
    if (rest % (k * k) === 0) {
      out = k;
      rest = rest / (k * k);
      break;
    }
  }
  if (rest === 1) return String(out);
  return `${out === 1 ? "" : out}\\sqrt{${rest}}`;
}

/** Pendiente aleatoria p/q en forma irreducible con denominador pequeño. */
function randomSlope(r: Rng, allowZero = false): { p: number; q: number; m: number } {
  let p: number, q: number;
  do {
    q = r.pick([1, 1, 2, 3]);
    p = allowZero ? r.int(-4, 4) : r.nz(-4, 4);
  } while (gcd(p, q) !== 1 && p !== 0);
  return { p, q, m: p / q };
}

const plane = (lim = 6): GraphSpec => ({ x: [-lim, lim], y: [-lim, lim], height: 320 });

function quadrantOf(x: number, y: number): 1 | 2 | 3 | 4 {
  if (x > 0) return y > 0 ? 1 : 4;
  return y > 0 ? 2 : 3;
}
const QNAME = { 1: "primer", 2: "segundo", 3: "tercer", 4: "cuarto" } as const;
const QSIGNS = { 1: "$x > 0$ y $y > 0$", 2: "$x < 0$ y $y > 0$", 3: "$x < 0$ y $y < 0$", 4: "$x > 0$ y $y < 0$" } as const;

function exprMistakes(answer: number, list: [number, string][]): Mistake[] {
  const out: Mistake[] = [];
  for (const [v, feedback] of list) {
    if (!Number.isFinite(v) || near(v, answer) || out.some((o) => o.answer === fmt(v))) continue;
    out.push({ answer: fmt(v), feedback });
  }
  return out;
}

/* ----------------------------------- ejercicios ----------------------------------- */

const ubicarPunto: ExerciseGen = {
  id: "ubicar-punto",
  title: "Ubicar un punto en el plano",
  level: 1,
  generate: (r) => {
    let x: number, y: number;
    do {
      x = r.int(-5, 5);
      y = r.int(-5, 5);
    } while (x === 0 && y === 0);
    const mx = x === 0 ? "no te mueves en horizontal" : `te mueves $${Math.abs(x)}$ ${Math.abs(x) === 1 ? "unidad" : "unidades"} a la ${x > 0 ? "derecha" : "izquierda"}`;
    const my = y === 0 ? "no subes ni bajas" : `${y > 0 ? "subes" : "bajas"} $${Math.abs(y)}$`;
    const where = x === 0 ? "El punto queda sobre el eje $y$." : y === 0 ? "El punto queda sobre el eje $x$." : `El punto queda en el ${QNAME[quadrantOf(x, y)]} cuadrante.`;
    return {
      statement: `Ubica el punto $P = ${pt(x, y)}$ en el plano.`,
      parts: [{ kind: "point", graph: plane(), answer: [x, y], start: [0, 0] }],
      hints: [
        "El primer número es la $x$: cuánto moverte a la derecha (si es positivo) o a la izquierda (si es negativo).",
        "El segundo número es la $y$: cuánto subir (positivo) o bajar (negativo).",
      ],
      solution: [`Desde el origen ${mx} y después ${my}.`, where],
    };
  },
};

const cuadrante: ExerciseGen = {
  id: "cuadrante",
  title: "¿En qué cuadrante está?",
  level: 1,
  generate: (r) => {
    const x = r.nz(-9, 9);
    const y = r.nz(-9, 9);
    const q = quadrantOf(x, y);
    const part: Part = {
      kind: "choice",
      shuffle: false,
      options: ([1, 2, 3, 4] as const).map((k) => ({
        label: `${QNAME[k][0].toUpperCase()}${QNAME[k].slice(1)} cuadrante`,
        correct: k === q,
        feedback: k === q ? undefined : `En el ${QNAME[k]} cuadrante se cumple ${QSIGNS[k]}. Aquí $x = ${x}$ y $y = ${y}$.`,
      })),
    };
    return {
      statement: `¿En qué cuadrante está el punto $${pt(x, y)}$?`,
      parts: [part],
      hints: ["Mira solo los signos. Los cuadrantes se numeran del I al IV en sentido contrario a las agujas del reloj, empezando arriba a la derecha."],
      solution: [
        `La $x$ es ${x > 0 ? "positiva (derecha)" : "negativa (izquierda)"} y la $y$ es ${y > 0 ? "positiva (arriba)" : "negativa (abajo)"}.`,
        `Eso corresponde al ${QNAME[q]} cuadrante, donde ${QSIGNS[q]}.`,
      ],
    };
  },
};

const distancia: ExerciseGen = {
  id: "distancia",
  title: "Distancia entre dos puntos",
  level: 1,
  generate: (r) => {
    let dx: number, dy: number, ans: string;
    if (r.bool(0.6)) {
      const [a, b, c] = r.pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 6, 10], [9, 12, 15]]);
      [dx, dy] = r.bool() ? [a, b] : [b, a];
      dx *= r.sign();
      dy *= r.sign();
      ans = String(c);
    } else {
      do {
        dx = r.nz(-5, 5);
        dy = r.nz(-5, 5);
      } while (Number.isInteger(Math.sqrt(dx * dx + dy * dy)));
      ans = sqrtTex(dx * dx + dy * dy);
    }
    const x1 = r.int(-6, 6);
    const y1 = r.int(-6, 6);
    const x2 = x1 + dx;
    const y2 = y1 + dy;
    const s = dx * dx + dy * dy;
    const sub = (a: number, b: number) => `${a} - ${b < 0 ? `(${b})` : b}`;
    return {
      statement: `Calcula la distancia entre $A = ${pt(x1, y1)}$ y $B = ${pt(x2, y2)}$.`,
      parts: [
        {
          kind: "expr",
          before: "d(A, B) =",
          answer: ans,
          mistakes: [
            { answer: String(s), feedback: "Ese es el cuadrado de la distancia. Te faltó sacar la raíz." },
            { answer: String(Math.abs(dx) + Math.abs(dy)), feedback: "Sumaste las diferencias. La distancia en línea recta se calcula con Pitágoras: raíz de la suma de los cuadrados." },
          ],
        },
      ],
      hints: [
        "Usa $d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$.",
        `Las diferencias son $\\Delta x = ${dx}$ y $\\Delta y = ${dy}$.`,
      ],
      solution: [
        `$\\Delta x = ${sub(x2, x1)} = ${dx}$ y $\\Delta y = ${sub(y2, y1)} = ${dy}$.`,
        `$d = \\sqrt{${par(dx)}^2 + ${par(dy)}^2} =\\sqrt{${dx * dx} + ${dy * dy}} = \\sqrt{${s}}$.`,
        `$d = ${ans}$.`,
      ],
    };
  },
};

const puntoMedio: ExerciseGen = {
  id: "punto-medio",
  title: "Punto medio de un segmento",
  level: 1,
  generate: (r) => {
    let x1: number, y1: number, x2: number, y2: number;
    do {
      x1 = r.int(-8, 8);
      y1 = r.int(-8, 8);
      x2 = r.int(-8, 8);
      y2 = r.int(-8, 8);
    } while (x1 === x2 || y1 === y2);
    const xm = (x1 + x2) / 2;
    const ym = (y1 + y2) / 2;
    return {
      statement: `Halla el punto medio $M$ del segmento que une $A = ${pt(x1, y1)}$ y $B = ${pt(x2, y2)}$.`,
      parts: [
        { kind: "expr", before: "x_M =", answer: fmt(xm), mistakes: exprMistakes(xm, [[(x2 - x1) / 2, "Restaste las coordenadas. El punto medio es el promedio: se suman y se divide entre 2."]]) },
        { kind: "expr", before: "y_M =", answer: fmt(ym), mistakes: exprMistakes(ym, [[(y2 - y1) / 2, "Restaste las coordenadas. El punto medio es el promedio: se suman y se divide entre 2."]]) },
      ],
      hints: ["Cada coordenada del punto medio es el promedio de las coordenadas de los extremos."],
      solution: [
        `$x_M = \\dfrac{${x1} + ${x2 < 0 ? `(${x2})` : x2}}{2} = ${frac(x1 + x2, 2)}$.`,
        `$y_M = \\dfrac{${y1} + ${y2 < 0 ? `(${y2})` : y2}}{2} = ${frac(y1 + y2, 2)}$.`,
        `$M = \\left(${frac(x1 + x2, 2)}, ${frac(y1 + y2, 2)}\\right)$.`,
      ],
    };
  },
};

const pendiente: ExerciseGen = {
  id: "pendiente",
  title: "Pendiente entre dos puntos",
  level: 1,
  generate: (r) => {
    const dx = r.nz(-6, 6);
    const dy = r.bool(0.12) ? 0 : r.nz(-8, 8);
    const x1 = r.int(-5, 5);
    const y1 = r.int(-5, 5);
    const x2 = x1 + dx;
    const y2 = y1 + dy;
    const m = dy / dx;
    const sub = (a: number, b: number) => `${a} - ${b < 0 ? `(${b})` : b}`;
    return {
      statement: `Calcula la pendiente de la recta que pasa por $${pt(x1, y1)}$ y $${pt(x2, y2)}$.`,
      parts: [
        {
          kind: "expr",
          before: "m =",
          answer: frac(dy, dx),
          mistakes: exprMistakes(m, [
            [dy !== 0 ? dx / dy : NaN, "Pusiste el cambio en $x$ arriba. La pendiente es cambio en $y$ entre cambio en $x$."],
            [-m, "El signo está mal. Revisa que restaste en el mismo orden arriba y abajo."],
          ]),
        },
      ],
      hints: ["$m = \\dfrac{y_2 - y_1}{x_2 - x_1}$", "Resta en el mismo orden arriba y abajo."],
      solution: [
        `$m = \\dfrac{${sub(y2, y1)}}{${sub(x2, x1)}} = \\dfrac{${dy}}{${dx}} = ${frac(dy, dx)}$.`,
        m === 0
          ? "La pendiente es cero: la recta es horizontal."
          : `Por cada unidad que avanzas a la derecha, la recta ${m > 0 ? "sube" : "baja"} $${fmt(Math.abs(m))}$.`,
      ],
    };
  },
};

const ecuacionDosPuntos: ExerciseGen = {
  id: "ecuacion-dos-puntos",
  title: "Ecuación de la recta por dos puntos",
  level: 2,
  generate: (r) => {
    const { p, q, m } = randomSlope(r);
    const b = r.int(-6, 6);
    const [t1, t2] = r.sample([-3, -2, -1, 0, 1, 2, 3], 2);
    const x1 = q * t1;
    const x2 = q * t2;
    const y1 = m * x1 + b;
    const y2 = m * x2 + b;
    const mInv = q / p;
    return {
      statement: `Halla la ecuación de la recta que pasa por $A = ${pt(x1, y1)}$ y $B = ${pt(x2, y2)}$. Escríbela en la forma $y = mx + b$.`,
      parts: [
        {
          kind: "expr",
          before: "y =",
          answer: yForm(m, b),
          vars: ["x"],
          mistakes: [
            { answer: yForm(mInv, y1 - mInv * x1), feedback: "La pendiente está invertida. Es cambio en $y$ entre cambio en $x$." },
            { answer: yForm(-m, y1 + m * x1), feedback: "La pendiente tiene el signo cambiado. Resta en el mismo orden arriba y abajo." },
          ].filter((mk) => !near(mInv, m) || mk.answer !== yForm(mInv, y1 - mInv * x1)),
        },
      ],
      hints: [
        "Primero la pendiente: $m = \\dfrac{y_2 - y_1}{x_2 - x_1}$.",
        "Con la pendiente y el punto $A$ usa $y - y_1 = m(x - x_1)$ y despeja $y$.",
      ],
      solution: [
        `$m = \\dfrac{${fmt(y2)} - ${y1 < 0 ? `(${fmt(y1)})` : fmt(y1)}}{${x2} - ${x1 < 0 ? `(${x1})` : x1}} = \\dfrac{${fmt(y2 - y1)}}{${x2 - x1}} = ${frac(p, q)}$.`,
        `Forma punto-pendiente con $A$: $${pointSlope(m, x1, y1)}$.`,
        `Despejando $y$: $y = ${yForm(m, b)}$.`,
        `Comprobación con $B$: $${fmt(m)} \\cdot ${par(x2)}${b !== 0 ? ` ${signed(b)}` : ""} = ${fmt(y2)}$.`,
      ],
    };
  },
};

const generalPendiente: ExerciseGen = {
  id: "general-pendiente",
  title: "De la forma general a la pendiente",
  level: 2,
  generate: (r) => {
    const A = r.nz(-6, 6);
    const B = r.nz(-6, 6);
    const C = r.int(-9, 9);
    const m = -A / B;
    const b = -C / B;
    return {
      statement: `Para la recta $${general(A, B, C)}$, halla la pendiente $m$ y el corte con el eje $y$ (la ordenada al origen $b$).`,
      parts: [
        {
          kind: "expr",
          before: "m =",
          answer: frac(-A, B),
          mistakes: exprMistakes(m, [
            [A / B, "Te faltó el signo menos. La pendiente de $Ax + By + C = 0$ es $-\\dfrac{A}{B}$."],
            [-B / A, "Invertiste la fracción. Es $-\\dfrac{A}{B}$: el coeficiente de $x$ arriba."],
          ]),
        },
        {
          kind: "expr",
          before: "b =",
          answer: frac(-C, B),
          mistakes: exprMistakes(b, [[C / B, "Revisa el signo. Al pasar $C$ al otro lado cambia de signo: $b = -\\dfrac{C}{B}$."]]),
        },
      ],
      hints: ["Despeja $y$: deja el término con $y$ solo de un lado y divide entre su coeficiente.", "O usa directamente $m = -\\dfrac{A}{B}$ y $b = -\\dfrac{C}{B}$."],
      solution: [
        `Aquí $A = ${A}$, $B = ${B}$ y $C = ${C}$.`,
        B === 1
          ? `Despejamos: $y = ${yForm(m, b)}$.`
          : `Despejamos: $${coef(B, "y")} = ${terms([[-A, "x"], [-C, ""]])}$, así que $y = ${yForm(m, b)}$.`,
        `Pendiente $m = -\\dfrac{${A}}{${B}} = ${frac(-A, B)}$ y corte con el eje $y$ en $b = ${frac(-C, B)}$.`,
      ],
    };
  },
};

const cortesEjes: ExerciseGen = {
  id: "cortes-ejes",
  title: "Cortes con los ejes",
  level: 2,
  generate: (r) => {
    const p = r.nz(-6, 6);
    const q = r.nz(-6, 6);
    // x/p + y/q = 1  ->  q x + p y - p q = 0
    let A = q, B = p, C = -p * q;
    const g = gcd(gcd(A, B), C);
    const s = r.sign();
    A = (s * A) / g;
    B = (s * B) / g;
    C = (s * C) / g;
    return {
      statement: `Halla los puntos donde la recta $${general(A, B, C)}$ corta a los ejes.`,
      parts: [
        {
          kind: "expr",
          prompt: "Corte con el eje $x$, el punto $(x, 0)$:",
          before: "x =",
          answer: String(p),
          mistakes: p !== q ? [{ answer: String(q), feedback: "Ese es el corte con el eje $y$. Para el eje $x$ se hace $y = 0$." }] : [],
        },
        {
          kind: "expr",
          prompt: "Corte con el eje $y$, el punto $(0, y)$:",
          before: "y =",
          answer: String(q),
          mistakes: p !== q ? [{ answer: String(p), feedback: "Ese es el corte con el eje $x$. Para el eje $y$ se hace $x = 0$." }] : [],
        },
      ],
      hints: ["Sobre el eje $x$ la altura es cero: haz $y = 0$ y despeja $x$.", "Sobre el eje $y$ se cumple $x = 0$."],
      solution: [
        `Con $y = 0$: $${coef(A, "x")} ${signed(C)} = 0$, así que $x = ${p}$. Corte en $(${p}, 0)$.`,
        `Con $x = 0$: $${coef(B, "y")} ${signed(C)} = 0$, así que $y = ${q}$. Corte en $(0, ${q})$.`,
      ],
    };
  },
};

const interseccion: ExerciseGen = {
  id: "interseccion",
  title: "Intersección de dos rectas",
  level: 2,
  generate: (r) => {
    const x0 = r.int(-4, 4);
    const y0 = r.int(-4, 4);
    let a1: number, b1: number, a2: number, b2: number;
    do {
      a1 = r.nz(-4, 4);
      b1 = r.nz(-4, 4);
      a2 = r.nz(-4, 4);
      b2 = r.nz(-4, 4);
    } while (a1 * b2 - a2 * b1 === 0);
    const c1 = a1 * x0 + b1 * y0;
    const c2 = a2 * x0 + b2 * y0;
    const e1 = `${terms([[a1, "x"], [b1, "y"]])} = ${c1}`;
    const e2 = `${terms([[a2, "x"], [b2, "y"]])} = ${c2}`;
    // Eliminación de x: (a2)·E1 - (a1)·E2
    const ky = a2 * b1 - a1 * b2;
    const kc = a2 * c1 - a1 * c2;
    return {
      statement: `Halla el punto donde se cortan las rectas\n\n$$\\begin{cases} ${e1} \\\\ ${e2} \\end{cases}$$`,
      parts: [
        { kind: "expr", before: "x =", answer: String(x0) },
        { kind: "expr", before: "y =", answer: String(y0) },
      ],
      hints: [
        "El punto de corte cumple las dos ecuaciones a la vez. Resuelve el sistema.",
        "Multiplica cada ecuación por un número para que los coeficientes de $x$ queden iguales y réstalas.",
      ],
      solution: [
        `Multiplicamos la primera ecuación por $${a2}$ y la segunda por $${a1}$ para igualar los coeficientes de $x$, y restamos.`,
        `Queda $${coef(ky, "y")} = ${kc}$, así que $y = ${y0}$.`,
        `Sustituimos en la primera: $${coef(a1, "x")} ${signed(b1 * y0)} = ${c1}$, de donde $x = ${x0}$.`,
        `Las rectas se cortan en $${pt(x0, y0)}$.`,
      ],
    };
  },
};

const depreciacion: ExerciseGen = {
  id: "depreciacion",
  title: "Depreciación lineal",
  level: 2,
  generate: (r) => {
    const d = r.pick([500, 800, 1000, 1200, 1500, 2000, 2500]);
    const life = r.int(6, 12);
    const V0 = d * life;
    const k = r.int(1, 3);
    const Vk = V0 - d * k;
    const ts = r.int(k + 1, life - 1);
    const W = V0 - d * ts;
    return {
      statement: `Una empresa compra una máquina en $${V0}$ dólares. Se deprecia linealmente y después de ${k === 1 ? "un año" : `$${k}$ años`} vale $${Vk}$ dólares.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "¿Cuánto valor pierde cada año?", before: "d =", answer: String(d), mistakes: [{ answer: String(d * k), feedback: `Esa es la pérdida total en ${k} años. Divide entre ${k} para obtener la de un año.` }].filter((m) => k !== 1) },
        { kind: "expr", prompt: "Escribe el valor $V(t)$ después de $t$ años.", before: "V(t) =", answer: `${V0} - ${d}t`, vars: ["t"], mistakes: [{ answer: `${V0} + ${d}t`, feedback: "El valor baja con el tiempo, así que la pendiente es negativa." }] },
        { kind: "expr", prompt: `¿A los cuántos años la máquina vale $${W}$ dólares?`, before: "t =", answer: String(ts) },
      ],
      hints: [
        "La pérdida por año es la pendiente de la recta, con signo negativo.",
        "En $V(t) = V_0 - dt$, $V_0$ es el valor inicial.",
        `Para la última parte resuelve $V(t) = ${W}$.`,
      ],
      solution: [
        `En ${k} ${k === 1 ? "año" : "años"} perdió $${V0} - ${Vk} = ${V0 - Vk}$ dólares, es decir, $d = ${d}$ por año.`,
        `$V(t) = ${V0} - ${d}t$. La pendiente $-${d}$ es la tasa de cambio del valor: baja $${d}$ por año.`,
        `$${V0} - ${d}t = ${W}$ da $${d}t = ${V0 - W}$, así que $t = ${ts}$ años.`,
      ],
    };
  },
};

const paralelaPerpendicular: ExerciseGen = {
  id: "paralela-perpendicular",
  title: "Recta paralela o perpendicular (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const { p, q, m } = randomSlope(r);
    const s = r.sign();
    const C0 = r.int(-6, 6);
    const [A, B, C] = [s * p, -s * q, s * C0];
    const parallel = r.bool();
    const m2 = parallel ? m : -q / p;
    const x0 = r.int(-2, 2) * (parallel ? q : Math.abs(p));
    const y0 = r.int(-5, 5);
    const b2 = y0 - m2 * x0;
    const through = (mm: number) => yForm(mm, y0 - mm * x0);
    const wrongs: [number, string][] = parallel
      ? [[-m, "La pendiente de la recta dada es $-\\dfrac{A}{B}$. Revisa el signo."], [-1 / m, "Usaste la pendiente perpendicular. Las paralelas tienen la misma pendiente."]]
      : [[1 / m, "Invertiste la pendiente pero te faltó cambiarle el signo. Debe cumplirse $m_1 \\cdot m_2 = -1$."], [m, "Esa es la pendiente de una paralela. La perpendicular cumple $m_1 \\cdot m_2 = -1$."]];
    return {
      statement: `Halla la ecuación de la recta ${parallel ? "paralela" : "perpendicular"} a $${general(A, B, C)}$ que pasa por el punto $${pt(x0, y0)}$.`,
      sequential: true,
      parts: [
        {
          kind: "expr",
          prompt: "Pendiente de la recta dada:",
          before: "m_1 =",
          answer: frac(p, q),
          mistakes: exprMistakes(m, [[-m, "Te faltó un signo. En $Ax + By + C = 0$ la pendiente es $-\\dfrac{A}{B}$."], [q / p, "Invertiste la fracción. Es $-\\dfrac{A}{B}$."]]),
        },
        {
          kind: "expr",
          prompt: `Pendiente de la recta ${parallel ? "paralela" : "perpendicular"}:`,
          before: "m_2 =",
          answer: fmt(m2),
          mistakes: exprMistakes(m2, wrongs.slice(1)),
        },
        {
          kind: "expr",
          prompt: "Ecuación de la recta pedida en la forma $y = mx + b$:",
          before: "y =",
          answer: yForm(m2, b2),
          vars: ["x"],
          mistakes: wrongs.filter(([mm]) => !near(mm, m2)).map(([mm, fb]) => ({ answer: through(mm), feedback: fb })),
        },
      ],
      hints: [
        "Saca la pendiente de la recta dada con $m = -\\dfrac{A}{B}$.",
        parallel ? "Las rectas paralelas tienen la misma pendiente." : "Las perpendiculares cumplen $m_1 \\cdot m_2 = -1$: se invierte la pendiente y se le cambia el signo.",
        "Con la nueva pendiente y el punto, usa $y - y_0 = m(x - x_0)$.",
      ],
      solution: [
        `En $${general(A, B, C)}$, $A = ${A}$ y $B = ${B}$. Entonces $m_1 = -\\dfrac{${A}}{${B}} = ${frac(p, q)}$.`,
        parallel ? `Paralela: $m_2 = m_1 = ${fmt(m2)}$.` : `Perpendicular: $m_2 = -\\dfrac{1}{m_1} = ${fmt(m2)}$. Comprobación: $${frac(p, q)} \\cdot \\left(${fmt(m2)}\\right) = -1$.`,
        `Punto-pendiente: $${pointSlope(m2, x0, y0)}$.`,
        `Despejando: $y = ${yForm(m2, b2)}$.`,
      ],
    };
  },
};

const vfPendiente: ExerciseGen = {
  id: "vf-pendiente",
  title: "Verdadero o falso con rectas (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const kind = r.pick(["general", "general", "general", "vertical", "horizontal"] as const);
    if (kind === "vertical" || kind === "horizontal") {
      const k = r.nz(-6, 6);
      const isVert = kind === "vertical";
      const text = isVert
        ? `La recta vertical $x = ${k}$ es la gráfica de una función real de variable real.`
        : `La recta $y = ${k}$ tiene pendiente cero y es paralela al eje de las abscisas.`;
      const ok = !isVert;
      const why = isVert
        ? `A $x = ${k}$ le corresponden infinitos valores de $y$, y una función asigna a cada $x$ una sola imagen. Una recta vertical no es función.`
        : `Todos sus puntos tienen la misma altura $${k}$, así que no sube ni baja: pendiente cero, recta horizontal, paralela al eje $x$.`;
      return {
        statement: `${text} ¿Verdadero o falso?`,
        parts: [trueFalse(ok, why)],
        hints: ["Dibuja la recta y piensa cuántos valores de $y$ hay para cada $x$."],
        solution: [why, `La afirmación es ${ok ? "verdadera" : "falsa"}.`],
      };
    }
    const c1 = r.int(2, 9);
    let c2: number;
    do c2 = r.int(2, 9); while (gcd(c1, c2) !== 1);
    const s1 = r.sign();
    const s2 = r.sign();
    const k = r.nz(-9, 9);
    const line = `${s1 < 0 ? "-" : ""}${c1}ax ${s2 < 0 ? "-" : "+"} ${c2}by ${k < 0 ? "-" : "+"} ${Math.abs(k)} = 0`;
    const sign = -s1 * s2; // signo de -A/B
    const fracAB = `\\dfrac{${c1}a}{${c2}b}`;
    const fracBA = `\\dfrac{${c2}b}{${c1}a}`;
    const correctTex = `${sign < 0 ? "-" : ""}${fracAB}`;
    const claim = r.pick(["ok", "ok", "signo", "invertida"] as const);
    const shown = claim === "ok" ? correctTex : claim === "signo" ? `${sign > 0 ? "-" : ""}${fracAB}` : `${sign < 0 ? "-" : ""}${fracBA}`;
    const ok = claim === "ok";
    const A = `${s1 < 0 ? "-" : ""}${c1}a`;
    const B = `${s2 < 0 ? "-" : ""}${c2}b`;
    const why = `Con $A = ${A}$ y $B = ${B}$, la pendiente es $-\\dfrac{A}{B} = -\\dfrac{${A}}{${B}} = ${correctTex}$.${ok ? "" : claim === "signo" ? " El signo de la afirmación está cambiado." : " La afirmación invierte la fracción."}`;
    return {
      statement: `La pendiente de la recta $${line}$, donde $a, b \\in \\mathbb{R}$ y $b \\ne 0$, es $${shown}$. ¿Verdadero o falso?`,
      parts: [trueFalse(ok, why)],
      hints: ["En $Ax + By + C = 0$ la pendiente es $-\\dfrac{A}{B}$. Identifica $A$ y $B$ con todo y signo."],
      solution: [
        `La recta está en forma general con $A = ${A}$ (lo que acompaña a $x$) y $B = ${B}$ (lo que acompaña a $y$).`,
        `$m = -\\dfrac{A}{B} = -\\dfrac{${A}}{${B}} = ${correctTex}$. Se pide $b \\ne 0$ porque si $b = 0$ la recta sería vertical.`,
        `La afirmación es ${ok ? "verdadera" : "falsa"}.`,
      ],
    };
  },
};

const costoLineal: ExerciseGen = {
  id: "costo-lineal",
  title: "Costo lineal (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const cv = r.int(3, 30);
    const cf = 100 * r.int(5, 50);
    const q1 = 10 * r.int(1, 10);
    const q2 = q1 + r.pick([50, 100, 150, 200]);
    const q3 = 10 * r.int(1, 40);
    const C1 = cv * q1 + cf;
    const C2 = cv * q2 + cf;
    return {
      statement: `Una fábrica observa que producir $${q1}$ unidades le cuesta $${C1}$ dólares y producir $${q2}$ unidades le cuesta $${C2}$ dólares. Supón que el costo total es lineal en la cantidad $q$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Costo variable por unidad (la pendiente):", before: "c_v =", answer: String(cv), mistakes: [{ answer: fmt((q2 - q1) / (C2 - C1)), feedback: "Invertiste el cociente. Es cambio en costo entre cambio en cantidad." }] },
        { kind: "expr", prompt: "Costo fijo (el costo cuando $q = 0$):", before: "C_F =", answer: String(cf), mistakes: [{ answer: String(C1), feedback: `Ese es el costo de producir ${q1} unidades. El costo fijo es lo que se paga sin producir nada.` }] },
        { kind: "expr", prompt: "Escribe la función de costo:", before: "C(q) =", answer: `${cv}q + ${cf}`, vars: ["q"] },
        { kind: "expr", prompt: `¿Cuánto cuesta producir $${q3}$ unidades?`, before: `C(${q3}) =`, answer: String(cv * q3 + cf) },
      ],
      hints: [
        "La pendiente es $\\dfrac{C_2 - C_1}{q_2 - q_1}$.",
        "Para el costo fijo sustituye uno de los puntos en $C(q) = c_v q + C_F$ y despeja.",
      ],
      solution: [
        `$c_v = \\dfrac{${C2} - ${C1}}{${q2} - ${q1}} = \\dfrac{${C2 - C1}}{${q2 - q1}} = ${cv}$ dólares por unidad. Cada unidad adicional cuesta ${cv}.`,
        `Con el primer punto: $${C1} = ${cv} \\cdot ${q1} + C_F$, así que $C_F = ${C1} - ${cv * q1} = ${cf}$.`,
        `$C(q) = ${cv}q + ${cf}$.`,
        `$C(${q3}) = ${cv} \\cdot ${q3} + ${cf} = ${cv * q3 + cf}$ dólares.`,
      ],
    };
  },
};

const equilibrio: ExerciseGen = {
  id: "equilibrio",
  title: "Equilibrio de mercado (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const qs = r.int(5, 30);
    const b = r.int(1, 4);
    const d = r.int(1, 4);
    const c = r.int(2, 30);
    const ps = c + d * qs;
    const a = ps + b * qs;
    return {
      statement: `La demanda de un producto es $p = ${a} - ${coef(b, "q")}$ y la oferta es $p = ${c} + ${coef(d, "q")}$, donde $p$ es el precio en dólares y $q$ la cantidad. Halla el punto de equilibrio.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Cantidad de equilibrio:", before: "q^* =", answer: String(qs), mistakes: exprMistakes(qs, [[(a - c) / (b - d), "Revisa el signo al pasar los términos con $q$ a un mismo lado."], [(a + c) / (b + d), "Al pasar el término independiente de un lado al otro cambia de signo."]]) },
        { kind: "expr", prompt: "Precio de equilibrio:", before: "p^* =", answer: String(ps) },
      ],
      hints: ["En el equilibrio el precio de la demanda y el de la oferta coinciden. Iguala las dos expresiones.", "Con $q^*$ calculado, sustitúyelo en cualquiera de las dos ecuaciones."],
      solution: [
        `Igualamos: $${a} - ${coef(b, "q")} = ${c} + ${coef(d, "q")}$.`,
        `Juntamos: $${a - c} = ${coef(b + d, "q")}$, así que $q^* = ${qs}$ unidades.`,
        `Precio: $p^* = ${c} + ${d} \\cdot ${qs} = ${ps}$ dólares. Con la demanda da lo mismo: $${a} - ${b} \\cdot ${qs} = ${ps}$.`,
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("recta"),
  objectives: [
    "Ubicar puntos en el plano y calcular la distancia y el punto medio entre dos puntos.",
    "Calcular la pendiente de una recta y leerla como tasa de cambio.",
    "Escribir la ecuación de una recta en sus distintas formas y pasar de una a otra.",
    "Reconocer rectas paralelas y perpendiculares y hallar dónde se cortan dos rectas.",
    "Modelar costo, depreciación, oferta y demanda con rectas.",
  ],
  sections: [
    {
      id: "plano",
      title: "El plano cartesiano",
      blocks: [
        {
          type: "text",
          md: "Una recta numérica sirve para ubicar números en una línea. Si cruzas dos rectas numéricas en ángulo recto, una horizontal y otra vertical, puedes ubicar puntos en un plano. La horizontal es el **eje $x$**, o eje de las abscisas. La vertical es el **eje $y$**, o eje de las ordenadas. Se cruzan en el **origen** $(0, 0)$.\n\nCada punto se describe con un par ordenado $(x, y)$. El primer número dice cuánto moverse a la derecha (si es positivo) o a la izquierda (si es negativo). El segundo dice cuánto subir o bajar.",
        },
        {
          type: "graph",
          spec: {
            x: [-6, 6],
            y: [-5, 5],
            height: 300,
            points: [
              { x: 3, y: 2, label: "A(3, 2)", color: "accent" },
              { x: -4, y: 1, label: "B(-4, 1)", color: "blue" },
              { x: -2, y: -3, label: "C(-2, -3)", color: "red" },
              { x: 1, y: -4, label: "D(1, -4)", color: "green" },
            ],
            labels: [
              { x: 4.5, y: 4.2, text: "I", color: "muted" },
              { x: -4.5, y: 4.2, text: "II", color: "muted" },
              { x: -4.5, y: -4.2, text: "III", color: "muted" },
              { x: 4.5, y: -4.2, text: "IV", color: "muted" },
            ],
          },
          caption: "Los ejes dividen el plano en cuatro cuadrantes, numerados en sentido contrario a las agujas del reloj.",
        },
        {
          type: "table",
          headers: ["Cuadrante", "Signo de $x$", "Signo de $y$", "Ejemplo"],
          rows: [
            ["I", "$+$", "$+$", "$(3, 2)$"],
            ["II", "$-$", "$+$", "$(-4, 1)$"],
            ["III", "$-$", "$-$", "$(-2, -3)$"],
            ["IV", "$+$", "$-$", "$(1, -4)$"],
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "El orden importa",
          md: "$(2, 5)$ y $(5, 2)$ son puntos distintos. Primero va siempre la $x$. Los puntos que están sobre un eje, como $(0, 3)$ o $(-2, 0)$, no pertenecen a ningún cuadrante.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Ubica el punto $(-3, 2)$.",
            parts: [{ kind: "point", graph: { x: [-5, 5], y: [-5, 5], height: 280 }, answer: [-3, 2], start: [0, 0] }],
            solution: ["Desde el origen, 3 unidades a la izquierda y 2 hacia arriba. Queda en el segundo cuadrante."],
          },
        },
      ],
    },
    {
      id: "distancia",
      title: "Distancia y punto medio",
      blocks: [
        {
          type: "text",
          md: "Para medir la distancia entre dos puntos se arma un triángulo rectángulo. El lado horizontal mide la diferencia de las $x$ y el lado vertical la diferencia de las $y$. La distancia que buscamos es la hipotenusa, y el teorema de Pitágoras dice cuánto mide.",
        },
        {
          type: "graph",
          spec: {
            x: [-1, 6],
            y: [-1, 7],
            height: 280,
            points: [{ x: 1, y: 2, label: "(1, 2)" }, { x: 4, y: 6, label: "(4, 6)" }],
            segments: [
              { from: [1, 2], to: [4, 6], color: "accent" },
              { from: [1, 2], to: [4, 2], color: "muted", dashed: true },
              { from: [4, 2], to: [4, 6], color: "muted", dashed: true },
            ],
            labels: [{ x: 2.5, y: 1.5, text: "3" }, { x: 4.4, y: 4, text: "4" }, { x: 2.1, y: 4.4, text: "d = 5", color: "accent" }],
          },
          caption: "Los catetos miden $3$ y $4$, así que la distancia es $\\sqrt{3^2 + 4^2} = 5$.",
        },
        {
          type: "definition",
          title: "Distancia entre dos puntos",
          md: "Para $P_1 = (x_1, y_1)$ y $P_2 = (x_2, y_2)$:\n\n$$d(P_1, P_2) = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$$\n\nComo las diferencias van al cuadrado, da igual cuál punto llames primero.",
        },
        {
          type: "example",
          title: "Calcular una distancia",
          problem: "Halla la distancia entre $A = (-2, 1)$ y $B = (4, -7)$.",
          steps: [
            "$\\Delta x = 4 - (-2) = 6$ y $\\Delta y = -7 - 1 = -8$.",
            "$d = \\sqrt{6^2 + (-8)^2} = \\sqrt{36 + 64} = \\sqrt{100}$.",
          ],
          answer: "$d = 10$",
        },
        {
          type: "definition",
          title: "Punto medio",
          md: "El punto medio del segmento entre $P_1$ y $P_2$ es el promedio de las coordenadas:\n\n$$M = \\left( \\frac{x_1 + x_2}{2}, \\frac{y_1 + y_2}{2} \\right)$$",
        },
        {
          type: "example",
          title: "Calcular un punto medio",
          problem: "Halla el punto medio entre $(-2, 5)$ y $(4, -1)$.",
          steps: ["$x_M = \\dfrac{-2 + 4}{2} = 1$.", "$y_M = \\dfrac{5 + (-1)}{2} = 2$."],
          answer: "$M = (1, 2)$",
        },
        {
          type: "note",
          tone: "warning",
          title: "Cuidado con los negativos",
          md: "Al restar una coordenada negativa usa paréntesis. Si $x_1 = -3$ y $x_2 = 5$, la diferencia es $5 - (-3) = 8$, no $2$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula la distancia entre $(-1, 3)$ y $(5, -5)$.",
            parts: [{ kind: "expr", before: "d =", answer: "10", mistakes: [{ answer: "100", feedback: "Te faltó sacar la raíz." }] }],
            solution: ["$\\Delta x = 6$ y $\\Delta y = -8$. $d = \\sqrt{36 + 64} = \\sqrt{100} = 10$."],
          },
        },
      ],
    },
    {
      id: "pendiente",
      title: "La pendiente: cuánto sube por cada paso",
      blocks: [
        {
          type: "text",
          md: "Imagina que caminas sobre una recta de izquierda a derecha. La pendiente dice cuánto subes, o bajas, por cada unidad que avanzas en horizontal. Una recta tiene la misma pendiente en todas partes, y eso es justo lo que la hace recta.",
        },
        {
          type: "definition",
          title: "Pendiente",
          md: "La pendiente de la recta que pasa por $P_1 = (x_1, y_1)$ y $P_2 = (x_2, y_2)$, con $x_1 \\ne x_2$, es\n\n$$m = \\frac{y_2 - y_1}{x_2 - x_1} = \\frac{\\Delta y}{\\Delta x}$$\n\nSe lee \"cambio en $y$ entre cambio en $x$\". La letra griega $\\Delta$ (delta) significa \"cambio\".",
        },
        {
          type: "example",
          title: "Calcular e interpretar una pendiente",
          problem: "Halla la pendiente de la recta que pasa por $(1, -1)$ y $(3, 5)$.",
          steps: [
            "$m = \\dfrac{5 - (-1)}{3 - 1} = \\dfrac{6}{2} = 3$.",
            "Por cada unidad que avanzas a la derecha, la recta sube 3 unidades.",
          ],
          answer: "$m = 3$",
        },
        {
          type: "table",
          headers: ["Pendiente", "La recta", "Ejemplo"],
          rows: [
            ["$m > 0$", "Sube de izquierda a derecha", "$y = 2x + 1$"],
            ["$m < 0$", "Baja de izquierda a derecha", "$y = -x + 4$"],
            ["$m = 0$", "Es horizontal", "$y = 3$"],
            ["No existe", "Es vertical ($\\Delta x = 0$, no se puede dividir)", "$x = -2$"],
          ],
        },
        {
          type: "note",
          tone: "econ",
          title: "La pendiente es una tasa de cambio",
          md: "Si el costo de producir $q$ unidades es $C(q) = 12q + 800$, la pendiente $12$ dice que cada unidad adicional sube el costo en 12 dólares. En economía eso se llama costo marginal.\n\nSi la cantidad demandada de un bien es $q = 500 - 3p$, la pendiente $-3$ dice que cada dólar que sube el precio se venden 3 unidades menos. El signo negativo es la ley de la demanda.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Resta en el mismo orden",
          md: "Si arriba haces $y_2 - y_1$, abajo va $x_2 - x_1$, no $x_1 - x_2$. Mezclar el orden cambia el signo de la pendiente.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Calcula la pendiente de la recta que pasa por $(-2, 4)$ y $(2, -2)$.",
            parts: [{ kind: "expr", before: "m =", answer: "-\\frac{3}{2}", mistakes: [{ answer: "\\frac{3}{2}", feedback: "El signo está mal. La recta baja: $y$ pasa de 4 a $-2$ mientras $x$ aumenta." }, { answer: "-\\frac{2}{3}", feedback: "Invertiste la fracción. Es $\\Delta y$ entre $\\Delta x$." }] }],
            solution: ["$m = \\dfrac{-2 - 4}{2 - (-2)} = \\dfrac{-6}{4} = -\\dfrac{3}{2}$."],
          },
        },
      ],
    },
    {
      id: "ecuacion",
      title: "La ecuación de la recta",
      blocks: [
        {
          type: "text",
          md: "Una recta queda determinada por un punto y su pendiente. Si $(x, y)$ es cualquier otro punto de la recta, la pendiente entre $(x_1, y_1)$ y $(x, y)$ tiene que dar $m$:\n\n$$\\frac{y - y_1}{x - x_1} = m$$\n\nMultiplicando por $x - x_1$ sale la primera forma de la ecuación. Las demás son reacomodos de la misma igualdad.",
        },
        {
          type: "table",
          headers: ["Forma", "Ecuación", "Cuándo conviene"],
          rows: [
            ["Punto-pendiente", "$y - y_1 = m(x - x_1)$", "Conoces un punto y la pendiente"],
            ["Pendiente-ordenada", "$y = mx + b$", "Para leer la pendiente $m$ y el corte $b$ con el eje $y$"],
            ["General", "$Ax + By + C = 0$", "Así viene en muchos ejercicios"],
            ["Horizontal", "$y = k$", "Pendiente cero"],
            ["Vertical", "$x = k$", "Sin pendiente"],
          ],
        },
        {
          type: "widget",
          widget: {
            kind: "sliders",
            fn: "m x + b",
            params: [
              { name: "m", min: -4, max: 4, step: 0.5, value: 1, label: "pendiente m" },
              { name: "b", min: -5, max: 5, step: 0.5, value: 2, label: "corte b" },
            ],
            x: [-6, 6],
            y: [-6, 6],
            formula: "y = {m}x + {b}",
          },
          caption: "Mueve $m$ y mira cómo cambia la inclinación. Mueve $b$ y la recta sube o baja sin girar, porque $b$ es el punto donde corta al eje $y$.",
        },
        {
          type: "example",
          title: "Recta por dos puntos",
          problem: "Halla la ecuación de la recta que pasa por $(2, 1)$ y $(4, 7)$.",
          steps: [
            "Pendiente: $m = \\dfrac{7 - 1}{4 - 2} = 3$.",
            "Punto-pendiente con $(2, 1)$: $y - 1 = 3(x - 2)$.",
            "Despejamos: $y = 3x - 6 + 1 = 3x - 5$.",
            "Comprobación con el otro punto: $3 \\cdot 4 - 5 = 7$. Correcto.",
          ],
          answer: "$y = 3x - 5$",
        },
        {
          type: "definition",
          title: "De la forma general a la pendiente",
          md: "En $Ax + By + C = 0$ con $B \\ne 0$ se despeja $y$: $By = -Ax - C$, y al dividir entre $B$ queda $y = -\\frac{A}{B}x - \\frac{C}{B}$. Por lo tanto\n\n$$m = -\\frac{A}{B} \\qquad b = -\\frac{C}{B}$$",
        },
        {
          type: "note",
          tone: "warning",
          title: "Pregunta de parcial",
          md: "¿La pendiente de $5ax - 8by - 2 = 0$ es $\\frac{5a}{8b}$? Aquí $A = 5a$ y $B = -8b$, con todo y signo. Entonces $m = -\\frac{5a}{-8b} = \\frac{5a}{8b}$. Es verdadero, siempre que $b \\ne 0$. El menos de la fórmula y el de $B$ se cancelan, y ahí es donde muchos se equivocan.",
        },
        {
          type: "example",
          title: "Cortes con los ejes",
          problem: "Halla dónde corta la recta $2x + 3y - 6 = 0$ a cada eje.",
          steps: [
            "Eje $y$: hacemos $x = 0$. Queda $3y - 6 = 0$, así que $y = 2$. Corta en $(0, 2)$.",
            "Eje $x$: hacemos $y = 0$. Queda $2x - 6 = 0$, así que $x = 3$. Corta en $(3, 0)$.",
            "Con esos dos puntos ya se puede dibujar la recta.",
          ],
        },
        {
          type: "note",
          tone: "idea",
          title: "Rectas horizontales y verticales",
          md: "$y = 4$ es horizontal. Todos sus puntos tienen altura 4 y su pendiente es cero.\n\n$x = -2$ es vertical. Todos sus puntos tienen $x = -2$ y no tiene pendiente. Además una recta vertical **no es una función** de $x$, porque a $x = -2$ le corresponden infinitos valores de $y$. Esto aparece como verdadero o falso en los parciales.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Cuál es la pendiente de la recta $4x + 2y - 6 = 0$?",
            parts: [{ kind: "expr", before: "m =", answer: "-2", mistakes: [{ answer: "2", feedback: "Te faltó el signo: $m = -\\dfrac{A}{B}$." }, { answer: "-\\frac{1}{2}", feedback: "Invertiste: es $A$ entre $B$, con signo menos." }] }],
            solution: ["Despejando: $2y = -4x + 6$, o sea $y = -2x + 3$. La pendiente es $-2$."],
          },
        },
      ],
    },
    {
      id: "paralelas-perpendiculares",
      title: "Rectas paralelas y perpendiculares",
      blocks: [
        {
          type: "text",
          md: "Dos rectas paralelas nunca se cortan, porque tienen la misma inclinación. Dos rectas perpendiculares se cortan formando un ángulo recto. Las dos situaciones se reconocen solo mirando las pendientes.",
        },
        {
          type: "definition",
          title: "Criterio con las pendientes",
          md: "Si $L_1$ y $L_2$ tienen pendientes $m_1$ y $m_2$:\n\n- Son **paralelas** cuando $m_1 = m_2$.\n- Son **perpendiculares** cuando $m_1 \\cdot m_2 = -1$, es decir, $m_2 = -\\dfrac{1}{m_1}$. La pendiente se invierte y se le cambia el signo.",
        },
        {
          type: "graph",
          spec: {
            x: [-5, 5],
            y: [-5, 5],
            height: 300,
            curves: [
              { fn: "2x+1", color: "blue", label: "y = 2x + 1" },
              { fn: "2x-3", color: "blue", dashed: true, label: "y = 2x - 3" },
              { fn: "-\\frac{1}{2}x+2", color: "red", label: "y = -x/2 + 2" },
            ],
          },
          caption: "Las dos azules tienen pendiente $2$ y son paralelas. La roja tiene pendiente $-\\frac{1}{2}$ y es perpendicular a ambas, porque $2 \\cdot \\left(-\\frac{1}{2}\\right) = -1$.",
        },
        {
          type: "example",
          title: "Paralela a una recta en forma general",
          problem: "Halla la recta paralela a $8x - y + 3 = 0$ que pasa por $(1, 2)$.",
          steps: [
            "Pendiente de la recta dada: $A = 8$ y $B = -1$, así que $m = -\\dfrac{8}{-1} = 8$.",
            "La paralela tiene la misma pendiente, $8$.",
            "Punto-pendiente: $y - 2 = 8(x - 1)$, que da $y = 8x - 6$.",
          ],
          answer: "$y = 8x - 6$",
        },
        {
          type: "example",
          title: "Perpendicular por un punto",
          problem: "Halla la recta perpendicular a $y = \\frac{2}{3}x + 1$ que pasa por $(2, -1)$.",
          steps: [
            "La pendiente dada es $\\frac{2}{3}$. La perpendicular tiene $m = -\\frac{3}{2}$.",
            "Punto-pendiente: $y + 1 = -\\frac{3}{2}(x - 2)$.",
            "Despejando: $y = -\\frac{3}{2}x + 3 - 1 = -\\frac{3}{2}x + 2$.",
          ],
          answer: "$y = -\\frac{3}{2}x + 2$",
        },
        {
          type: "note",
          tone: "tip",
          title: "Lo vas a volver a usar",
          md: "En el tema de recta tangente te pedirán la tangente a una curva que sea paralela a una recta dada, por ejemplo a $8x - y + 3 = 0$. El primer paso siempre es el mismo: sacar la pendiente de la recta dada.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Qué pendiente tiene una recta perpendicular a $3x + y - 1 = 0$?",
            parts: [{ kind: "expr", before: "m_2 =", answer: "\\frac{1}{3}", mistakes: [{ answer: "-\\frac{1}{3}", feedback: "Invertiste la pendiente pero faltó cambiarle el signo." }, { answer: "-3", feedback: "Esa es la pendiente de la recta dada. La perpendicular es $-\\dfrac{1}{m_1}$." }] }],
            solution: ["La recta dada tiene $m_1 = -\\dfrac{3}{1} = -3$. La perpendicular tiene $m_2 = -\\dfrac{1}{-3} = \\dfrac{1}{3}$."],
          },
        },
      ],
    },
    {
      id: "interseccion",
      title: "Dónde se cortan dos rectas",
      blocks: [
        {
          type: "text",
          md: "El punto donde se cortan dos rectas está en las dos a la vez, así que cumple las dos ecuaciones. Encontrarlo es resolver un sistema de dos ecuaciones con dos incógnitas. Si las dos rectas vienen despejadas como $y = \\dots$, lo más rápido es igualarlas.",
        },
        {
          type: "example",
          title: "Igualando",
          problem: "Halla el punto de corte de $y = 2x - 1$ y $y = -x + 5$.",
          steps: [
            "En el punto de corte las dos $y$ son iguales: $2x - 1 = -x + 5$.",
            "$3x = 6$, así que $x = 2$.",
            "Sustituimos en cualquiera: $y = 2 \\cdot 2 - 1 = 3$.",
          ],
          answer: "$(2, 3)$",
        },
        {
          type: "graph",
          spec: {
            x: [-2, 6],
            y: [-3, 7],
            height: 280,
            curves: [{ fn: "2x-1", color: "blue", label: "y = 2x - 1" }, { fn: "-x+5", color: "red", label: "y = -x + 5" }],
            points: [{ x: 2, y: 3, label: "(2, 3)", color: "accent" }],
          },
        },
        {
          type: "example",
          title: "Por sustitución",
          problem: "Halla el punto de corte de $2x + 3y = 12$ y $x - y = 1$.",
          steps: [
            "De la segunda: $x = y + 1$.",
            "En la primera: $2(y + 1) + 3y = 12$, o sea $5y = 10$ y $y = 2$.",
            "Entonces $x = 2 + 1 = 3$.",
          ],
          answer: "$(3, 2)$",
        },
        {
          type: "note",
          tone: "idea",
          title: "Cuando no hay un único punto",
          md: "Si las dos rectas tienen la misma pendiente y son distintas, son paralelas y no se cortan: el sistema no tiene solución. Si resultan ser la misma recta, tienen infinitos puntos en común.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Halla el punto donde se cortan $y = 3x - 4$ y $y = x + 2$.",
            parts: [{ kind: "expr", before: "x =", answer: "3" }, { kind: "expr", before: "y =", answer: "5" }],
            solution: ["$3x - 4 = x + 2$ da $2x = 6$, o sea $x = 3$. Entonces $y = 3 + 2 = 5$. El punto es $(3, 5)$."],
          },
        },
      ],
    },
    {
      id: "economia",
      title: "Rectas en economía",
      blocks: [
        {
          type: "text",
          md: "Muchos modelos económicos sencillos son rectas. En todos, la pendiente es una tasa de cambio y la ordenada al origen es el valor de partida.",
        },
        { type: "heading", text: "Costo lineal" },
        {
          type: "text",
          md: "Si cada unidad cuesta lo mismo de producir, el costo total es una recta: $C(q) = c_v q + C_F$. La pendiente $c_v$ es el costo variable por unidad. La ordenada $C_F$ es el costo fijo, lo que pagas aunque no produzcas nada, como el alquiler.",
        },
        {
          type: "example",
          title: "Costo a partir de dos datos",
          problem: "Producir 100 unidades cuesta 3500 dólares y producir 300 cuesta 7500. Halla la función de costo, suponiendo que es lineal.",
          steps: [
            "Pendiente: $c_v = \\dfrac{7500 - 3500}{300 - 100} = \\dfrac{4000}{200} = 20$ dólares por unidad.",
            "Con el primer dato: $3500 = 20 \\cdot 100 + C_F$, así que $C_F = 1500$.",
          ],
          answer: "$C(q) = 20q + 1500$",
        },
        { type: "heading", text: "Depreciación lineal" },
        {
          type: "text",
          md: "Una máquina pierde valor con el tiempo. En la depreciación lineal pierde la misma cantidad cada año, así que su valor es $V(t) = V_0 - dt$, con pendiente negativa $-d$.",
        },
        {
          type: "example",
          title: "Una máquina que se deprecia",
          problem: "Una máquina cuesta 24000 dólares y a los 8 años no vale nada. ¿Cuánto vale a los 5 años?",
          steps: [
            "Pierde $\\dfrac{24000}{8} = 3000$ dólares por año.",
            "$V(t) = 24000 - 3000t$.",
            "$V(5) = 24000 - 15000 = 9000$.",
          ],
          answer: "9000 dólares",
        },
        { type: "heading", text: "Oferta, demanda y equilibrio" },
        {
          type: "text",
          md: "La demanda baja cuando sube el precio, así que su recta tiene pendiente negativa. La oferta sube con el precio, con pendiente positiva. El **equilibrio** es el punto donde se cortan: la cantidad que los consumidores quieren comprar coincide con la que los productores quieren vender.",
        },
        {
          type: "example",
          title: "Punto de equilibrio",
          problem: "La demanda es $p = 100 - 2q$ y la oferta es $p = 20 + 3q$. Halla el equilibrio.",
          steps: [
            "Igualamos los precios: $100 - 2q = 20 + 3q$.",
            "$80 = 5q$, así que $q^* = 16$.",
            "$p^* = 20 + 3 \\cdot 16 = 68$.",
          ],
          answer: "$q^* = 16$ unidades a $p^* = 68$ dólares.",
        },
        {
          type: "graph",
          spec: {
            x: [0, 45],
            y: [0, 110],
            height: 300,
            step: 10,
            curves: [
              { fn: "100-2x", color: "blue", label: "Demanda", domain: [0, 45] },
              { fn: "20+3x", color: "red", label: "Oferta", domain: [0, 30] },
            ],
            points: [{ x: 16, y: 68, label: "(16, 68)", color: "accent" }],
          },
          caption: "Cantidad en el eje horizontal y precio en el vertical. Las rectas se cortan en el equilibrio.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Una costumbre de los economistas",
          md: "Aunque la cantidad demandada depende del precio, en los gráficos de economía el precio va en el eje vertical y la cantidad en el horizontal. Por eso muchas veces la demanda se escribe como $p$ en función de $q$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "La demanda es $p = 50 - q$ y la oferta es $p = 10 + q$. Halla el equilibrio.",
            parts: [{ kind: "expr", before: "q^* =", answer: "20" }, { kind: "expr", before: "p^* =", answer: "30" }],
            solution: ["$50 - q = 10 + q$ da $2q = 40$, o sea $q^* = 20$. Entonces $p^* = 10 + 20 = 30$."],
          },
        },
      ],
    },
  ],
  exercises: [
    ubicarPunto,
    cuadrante,
    distancia,
    puntoMedio,
    pendiente,
    ecuacionDosPuntos,
    generalPendiente,
    cortesEjes,
    interseccion,
    depreciacion,
    paralelaPerpendicular,
    vfPendiente,
    costoLineal,
    equilibrio,
  ],
};

export default topic;
