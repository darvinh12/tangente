import { meta } from "../catalog";
import { choice } from "../helpers";
import type { Curve, Exercise, ExerciseGen, GraphPoint, GraphSpec, Part, Rich, Topic } from "../types";
import { R, iv, pt, union, unionTex, type Interval } from "@/lib/math/intervals";
import { fmt, minus, poly } from "@/lib/math/tex";
import type { Rng } from "@/lib/math/rng";

/* ----------------------------- utilidades locales ----------------------------- */

const ivTex = (I: Interval[]) => unionTex(I);
const LETTERS = ["A", "B", "C", "D"];
const uds = (n: number) => (n === 1 ? "1 unidad" : `${n} unidades`);

/** "+ 3", "- 2" o "" para sumar una constante al final de una fórmula. */
const plusK = (k: number) => (k === 0 ? "" : k > 0 ? ` + ${k}` : ` - ${-k}`);

/** Condición de una rama: -2 \le x < 1, x < 3, x \ge 0 */
function condTex(lo: number, hi: number, loC: boolean, hiC: boolean): string {
  const l = Number.isFinite(lo) ? `${fmt(lo)} ${loC ? "\\le" : "<"} ` : "";
  const h = Number.isFinite(hi) ? ` ${hiC ? "\\le" : "<"} ${fmt(hi)}` : "";
  if (!l && !h) return "x \\in \\mathbb{R}";
  if (!l) return `x${h}`;
  if (!h) return `x ${loC ? "\\ge" : ">"} ${fmt(lo)}`;
  return `${l}x${h}`;
}

/** Imagen de una rama continua a partir de sus valores extremos candidatos. */
function imageOf(vals: { v: number; c: boolean }[]): Interval {
  const min = Math.min(...vals.map((v) => v.v));
  const max = Math.max(...vals.map((v) => v.v));
  const minC = Number.isFinite(min) && vals.some((v) => v.v === min && v.c);
  const maxC = Number.isFinite(max) && vals.some((v) => v.v === max && v.c);
  return iv(min, max, minC, maxC);
}

interface Branch {
  tex: string;
  f: (x: number) => number;
  lo: number;
  hi: number;
  loC: boolean;
  hiC: boolean;
  img: Interval;
  why: string;
}

type Slot = "left" | "mid" | "right";

/** Construye una rama al azar según su posición en la recta. */
function makeBranch(r: Rng, slot: Slot, lo: number, hi: number, loC: boolean, hiC: boolean, simple = false): Branch {
  const base = { lo, hi, loC, hiC };
  if (slot === "left") {
    if (!simple && r.bool(0.45)) {
      const k = r.int(-3, 2);
      const f = (x: number) => Math.exp(x - hi) + k;
      return {
        ...base, f, tex: `e^{${minus("x", hi)}}${plusK(k)}`,
        img: imageOf([{ v: k, c: false }, { v: 1 + k, c: hiC }]),
        why: `Cuando $x \\to -\\infty$ la exponencial se acerca a 0, así que la rama se acerca a $${k}$ sin tocarlo. En $x = ${hi}$ vale $e^0${plusK(k)} = ${1 + k}$${hiC ? ", y ese valor se alcanza" : ", pero ese punto no es de la rama"}.`,
      };
    }
    const m = r.pick([1, -1, 2, -2]);
    const y0 = r.int(-3, 4);
    const f = (x: number) => m * (x - hi) + y0;
    return {
      ...base, f, tex: poly([m, y0 - m * hi]),
      img: imageOf([{ v: m > 0 ? -Infinity : Infinity, c: false }, { v: y0, c: hiC }]),
      why: `Es una recta de pendiente $${m}$. En $x = ${hi}$ llega a $${y0}$ ${hiC ? "(incluido)" : "(sin incluirlo)"} y hacia la izquierda ${m > 0 ? "baja" : "sube"} sin límite.`,
    };
  }
  if (slot === "right") {
    const kind = simple ? r.pick(["lin", "const"] as const) : r.pick(["sqrt", "ln", "lin", "const", "recip"] as const);
    const k = r.int(-3, 3);
    if (kind === "sqrt") {
      return {
        ...base, f: (x) => Math.sqrt(x - lo) + k, tex: `\\sqrt{${minus("x", lo)}}${plusK(k)}`,
        img: imageOf([{ v: k, c: loC }, { v: Infinity, c: false }]),
        why: `La raíz arranca en $x = ${lo}$ con valor $${k}$ ${loC ? "(incluido)" : "(punto hueco)"} y crece sin límite.`,
      };
    }
    if (kind === "ln") {
      return {
        ...base, f: (x) => Math.log(x - lo + 1) + k, tex: `\\ln(${minus("x", lo - 1)})${plusK(k)}`,
        img: imageOf([{ v: k, c: loC }, { v: Infinity, c: false }]),
        why: `En $x = ${lo}$ el logaritmo vale $\\ln 1${plusK(k)} = ${k}$ ${loC ? "(incluido)" : "(punto hueco)"}. Después crece sin límite, aunque despacio.`,
      };
    }
    if (kind === "recip") {
      return {
        ...base, f: (x) => 1 / (x - lo + 1) + k, tex: `\\frac{1}{${minus("x", lo - 1)}}${plusK(k)}`,
        img: imageOf([{ v: 1 + k, c: loC }, { v: k, c: false }]),
        why: `En $x = ${lo}$ vale $1${plusK(k)} = ${1 + k}$ ${loC ? "(incluido)" : "(punto hueco)"}. Luego decrece y se acerca a $${k}$ sin llegar.`,
      };
    }
    if (kind === "const") {
      const c = r.nz(-3, 4);
      return {
        ...base, f: () => c, tex: String(c), img: pt(c),
        why: `Es constante: solo aporta el valor $${c}$.`,
      };
    }
    const m = r.pick([1, -1, 2, -2]);
    const y0 = r.int(-3, 3);
    return {
      ...base, f: (x) => m * (x - lo) + y0, tex: poly([m, y0 - m * lo]),
      img: imageOf([{ v: y0, c: loC }, { v: m > 0 ? Infinity : -Infinity, c: false }]),
      why: `Recta de pendiente $${m}$. Arranca en $${y0}$ ${loC ? "(incluido)" : "(sin incluirlo)"} y ${m > 0 ? "sube" : "baja"} sin límite.`,
    };
  }
  // tramo acotado
  const kind = r.pick(["parab", "parab", "abs", "lin", "const"] as const);
  if (kind === "const") {
    const c = r.nz(-3, 4);
    return { ...base, f: () => c, tex: String(c), img: pt(c), why: `Es constante: solo aporta el valor $${c}$.` };
  }
  if (kind === "lin") {
    const m = r.pick([1, -1, 2, -2]);
    const b = r.int(-3, 3);
    const f = (x: number) => m * x + b;
    return {
      ...base, f, tex: poly([m, b]),
      img: imageOf([{ v: f(lo), c: loC }, { v: f(hi), c: hiC }]),
      why: `Recta. En los extremos vale $f(${lo}) = ${f(lo)}$ ${loC ? "(incluido)" : "(hueco)"} y $f(${hi}) = ${f(hi)}$ ${hiC ? "(incluido)" : "(hueco)"}.`,
    };
  }
  const s = r.pick([1, -1]);
  const h = r.int(lo, hi);
  const K = r.int(-3, 3);
  const f = kind === "parab" ? (x: number) => s * (x - h) ** 2 + K : (x: number) => s * Math.abs(x - h) + K;
  const tex = kind === "parab" ? poly([s, -2 * s * h, s * h * h + K]) : `${s < 0 ? "-" : ""}|${minus("x", h)}|${plusK(K)}`;
  const vals = [{ v: f(lo), c: loC }, { v: f(hi), c: hiC }];
  const inside = h > lo && h < hi;
  if (inside) vals.push({ v: K, c: true });
  const name = kind === "parab" ? "vértice" : "punta de la V";
  return {
    ...base, f, tex, img: imageOf(vals),
    why: `${kind === "parab" ? "Parábola" : "Valor absoluto"} con ${name} en $(${h}, ${K})$${inside ? ", que está dentro del tramo" : ""}. En los extremos vale $f(${lo}) = ${f(lo)}$ ${loC ? "(incluido)" : "(hueco)"} y $f(${hi}) = ${f(hi)}$ ${hiC ? "(incluido)" : "(hueco)"}.`,
  };
}

/** Función a trozos que cubre toda la recta con n ramas (2, 3 o 4). */
function makePiecewise(r: Rng, n: 2 | 3 | 4, simple = false): Branch[] {
  const cuts: number[] = [];
  let p = n === 2 ? r.int(-1, 2) : r.int(-4, -2);
  for (let i = 0; i < n - 1; i++) {
    cuts.push(p);
    p += r.int(2, 3);
  }
  const owners = cuts.map(() => r.bool()); // true: el punto de corte pertenece a la rama de la derecha
  const out: Branch[] = [];
  for (let i = 0; i < n; i++) {
    const lo = i === 0 ? -Infinity : cuts[i - 1];
    const hi = i === n - 1 ? Infinity : cuts[i];
    const loC = i > 0 && owners[i - 1];
    const hiC = i < n - 1 && !owners[i];
    const slot: Slot = i === 0 ? "left" : i === n - 1 ? "right" : "mid";
    out.push(makeBranch(r, slot, lo, hi, loC, hiC, simple));
  }
  // Evita ramas vecinas con la misma fórmula
  if (out.some((b, i) => i > 0 && b.tex === out[i - 1].tex)) return makePiecewise(r, n, simple);
  return out;
}

const piecewiseTex = (bs: Branch[]) =>
  `\\begin{cases} ${bs.map((b) => `${b.tex} & \\text{si } ${condTex(b.lo, b.hi, b.loC, b.hiC)}`).join(" \\\\ ")} \\end{cases}`;

/** Gráfica de una función a trozos con sus puntos abiertos y cerrados. */
function piecewiseGraph(bs: Branch[], x: [number, number], y: [number, number], flip: (i: number) => number = () => 1, swapEnds = false): GraphSpec {
  const curves: Curve[] = [];
  const points: GraphPoint[] = [];
  bs.forEach((b, i) => {
    const s = flip(i);
    const lo = Math.max(b.lo, x[0]);
    const hi = Math.min(b.hi, x[1]);
    const fn = s === 1 ? b.tex : `-(${b.tex})`;
    curves.push({ fn, domain: [lo, hi], color: "accent" });
    const loC = swapEnds && Number.isFinite(b.lo) ? !b.loC : b.loC;
    const hiC = swapEnds && Number.isFinite(b.hi) ? !b.hiC : b.hiC;
    if (Number.isFinite(b.lo)) points.push({ x: b.lo, y: s * b.f(b.lo), open: !loC, color: "accent" });
    if (Number.isFinite(b.hi)) points.push({ x: b.hi, y: s * b.f(b.hi), open: !hiC, color: "accent" });
  });
  return { x, y, height: 220, curves, points };
}

/* ------------------------------ familias base ------------------------------ */

const BASES = [
  { name: "x^2", f: (x: number) => x * x, tex: (h: number, k: number) => `(${minus("x", h)})^{2}${plusK(k)}`, base: "x^{2}", start: "vértice" },
  { name: "|x|", f: (x: number) => Math.abs(x), tex: (h: number, k: number) => `|${minus("x", h)}|${plusK(k)}`, base: "|x|", start: "punta de la V" },
  { name: "sqrt", f: (x: number) => Math.sqrt(x), tex: (h: number, k: number) => `\\sqrt{${minus("x", h)}}${plusK(k)}`, base: "\\sqrt{x}", start: "punto de partida" },
];

function shiftedGraph(baseIdx: number, h: number, k: number): GraphSpec {
  const B = BASES[baseIdx];
  const fn = B.tex(h, k);
  return {
    x: [-7, 7], y: [-6, 6], height: 200,
    curves: [{ fn, color: "accent", domain: B.name === "sqrt" ? [h, 7] : undefined }],
    points: [{ x: h, y: k, color: "accent" }],
  };
}

/* ----------------------------------- ejercicios ----------------------------------- */

const describirTraslacion: ExerciseGen = {
  id: "describir-traslacion",
  title: "Describir una traslación",
  level: 1,
  generate: (r) => {
    const h = r.nz(-5, 5);
    const k = r.nz(-5, 5);
    const arg = minus("x", h);
    const hor = (s: number) => `${uds(Math.abs(h))} a la ${s > 0 ? "derecha" : "izquierda"}`;
    const ver = (s: number) => `${uds(Math.abs(k))} hacia ${s > 0 ? "arriba" : "abajo"}`;
    const sh = Math.sign(h);
    const sk = Math.sign(k);
    return {
      statement: `La gráfica de $g(x) = f(${arg})${plusK(k)}$ se obtiene a partir de la gráfica de $f$...`,
      parts: [
        choice(`moviéndola ${hor(sh)} y ${ver(sk)}.`, [
          [`moviéndola ${hor(-sh)} y ${ver(sk)}.`, `El cambio dentro del paréntesis va al revés de lo que parece. $f(${arg})$ mueve la gráfica hacia la ${sh > 0 ? "derecha" : "izquierda"}.`],
          [`moviéndola ${hor(sh)} y ${ver(-sk)}.`, `Lo que se suma afuera mueve en el mismo sentido del signo. $${plusK(k).trim()}$ va hacia ${sk > 0 ? "arriba" : "abajo"}.`],
          [`moviéndola ${hor(-sh)} y ${ver(-sk)}.`, "Las dos direcciones están cambiadas."],
        ]),
      ],
      hints: [
        "Lo que se suma o resta fuera de $f$ mueve la gráfica en vertical, en el mismo sentido del signo.",
        "Lo que se suma o resta dentro, junto a la $x$, la mueve en horizontal y al revés del signo.",
      ],
      solution: [
        `Dentro: $f(${arg})$ toma en $x = ${h}$ el valor que $f$ tenía en $0$. Todo se corre ${hor(sh)}.`,
        `Fuera: $${plusK(k).trim()}$ sube o baja cada altura. Todo se corre ${ver(sk)}.`,
      ],
    };
  },
};

const marcarVertice: ExerciseGen = {
  id: "marcar-vertice",
  title: "Ubicar el vértice de una gráfica trasladada",
  level: 1,
  generate: (r) => {
    const h = r.int(-5, 5);
    const k = r.int(-5, 5);
    const a = r.pick([1, -1, 2, -2]);
    const isParab = r.bool();
    const pre = a === 1 ? "" : a === -1 ? "-" : String(a);
    const fTex = isParab ? `${pre}(${minus("x", h)})^{2}${plusK(k)}` : `${pre}|${minus("x", h)}|${plusK(k)}`;
    const what = isParab ? "el vértice de la parábola" : "la punta de la V";
    return {
      statement: `Marca en el plano ${what} $y = ${fTex}$.`,
      parts: [{ kind: "point", graph: { x: [-7, 7], y: [-7, 7] }, answer: [h, k], snap: 1, start: [0, 0] }],
      hints: [
        `La gráfica base tiene ${what === "el vértice de la parábola" ? "el vértice" : "la punta"} en el origen.`,
        "En la forma $a\\,f(x - h) + k$ ese punto se mueve a $(h, k)$. Ojo con el signo de $h$.",
      ],
      solution: [
        `$y = ${fTex}$ tiene la forma $a\\,f(x - h) + k$ con $h = ${h}$ y $k = ${k}$.`,
        `El punto que estaba en el origen se mueve a $(${h}, ${k})$. ${a === 1 ? "" : `El coeficiente $${a}$ solo estira o refleja, no mueve ese punto.`}`,
      ],
    };
  },
};

const evaluarTrozos: ExerciseGen = {
  id: "evaluar-trozos",
  title: "Evaluar una función a trozos",
  level: 1,
  generate: (r) => {
    const bs = makePiecewise(r, 3, true);
    const cut = r.bool(0.65);
    let x0: number;
    if (cut) {
      x0 = r.pick([bs[0].hi, bs[1].hi]);
    } else {
      const i = r.int(0, 2);
      const b = bs[i];
      x0 = Number.isFinite(b.lo) && Number.isFinite(b.hi) ? r.int(b.lo, b.hi) : Number.isFinite(b.lo) ? b.lo + r.int(1, 3) : b.hi - r.int(1, 3);
    }
    const inB = (b: Branch) => (x0 > b.lo || (x0 === b.lo && b.loC)) && (x0 < b.hi || (x0 === b.hi && b.hiC));
    const idx = bs.findIndex(inB);
    const b = bs[idx];
    const val = b.f(x0);
    const other = bs.find((q, j) => j !== idx && (q.lo === x0 || q.hi === x0));
    const wrong = other ? other.f(x0) : NaN;
    return {
      statement: `Sea $f(x) = ${piecewiseTex(bs)}$. Calcula $f(${x0})$.`,
      parts: [{
        kind: "expr", before: `f(${x0}) =`, answer: String(val),
        mistakes: other && wrong !== val ? [{ answer: String(wrong), feedback: `Usaste la rama $${other.tex}$, pero $x = ${x0}$ no cumple su condición. Revisa quién lleva el $\\le$ o el $\\ge$.` }] : [],
      }],
      hints: ["Primero busca cuál condición cumple el número. Solo una de ellas lo incluye.", "En un punto de corte, la rama correcta es la que tiene la desigualdad con igual."],
      solution: [
        `$x = ${x0}$ cumple $${condTex(b.lo, b.hi, b.loC, b.hiC)}$, así que usamos la rama $${b.tex}$.`,
        `$f(${x0}) = ${val}$.`,
      ],
    };
  },
};

const rangoTransformada: ExerciseGen = {
  id: "rango-transformada",
  title: "Rango de una función trasladada",
  level: 1,
  generate: (r) => {
    const h = r.nz(-5, 5);
    const k = r.nz(-5, 5);
    const s = r.pick([1, -1]);
    const kind = r.pick(["sqrt", "abs", "exp"] as const);
    const sg = s < 0 ? "-" : "";
    const fTex = kind === "sqrt" ? `${sg}\\sqrt{${minus("x", h)}}${plusK(k)}` : kind === "abs" ? `${sg}|${minus("x", h)}|${plusK(k)}` : `${sg}e^{${minus("x", h)}}${plusK(k)}`;
    const closed = kind !== "exp";
    const rango = s > 0 ? [iv(k, Infinity, closed)] : [iv(-Infinity, k, false, closed)];
    const parts: Part[] = [];
    if (kind === "sqrt") {
      parts.push({ kind: "interval", prompt: "Dominio", before: "\\text{Dom} f =", answer: [iv(h, Infinity, true)], mistakes: [{ answer: [iv(-h, Infinity, true)], feedback: `El radicando es $${minus("x", h)} \\ge 0$, que da $x \\ge ${h}$.` }] });
    }
    parts.push({
      kind: "interval", prompt: "Rango", before: "\\text{Rgo} f =", answer: rango,
      mistakes: [{ answer: s > 0 ? [iv(-Infinity, k, false, closed)] : [iv(k, Infinity, closed)], feedback: s > 0 ? "No hay signo menos delante, así que la gráfica no se refleja: va hacia arriba." : "El signo menos delante refleja la gráfica: ahora va hacia abajo desde la altura $k$." }],
    });
    const baseR = kind === "exp" ? "(0, +\\infty)" : "[0, +\\infty)";
    return {
      statement: `Sea $f(x) = ${fTex}$. Halla ${kind === "sqrt" ? "su dominio y su rango" : "su rango"}.`,
      parts,
      hints: [
        `La función base ${kind === "sqrt" ? "$\\sqrt{x}$" : kind === "abs" ? "$|x|$" : "$e^x$"} tiene rango $${baseR}$.`,
        "El movimiento horizontal no cambia el rango. El signo menos lo refleja y la constante de afuera lo traslada.",
      ],
      solution: [
        ...(kind === "sqrt" ? [`Dominio: $${minus("x", h)} \\ge 0$, o sea $x \\ge ${h}$.`] : []),
        `La parte ${kind === "sqrt" ? `$\\sqrt{${minus("x", h)}}$` : kind === "abs" ? `$|${minus("x", h)}|$` : `$e^{${minus("x", h)}}$`} toma los valores $${baseR}$.`,
        s < 0 ? "Con el signo menos pasa a tomar los valores opuestos, hacia abajo desde 0." : "Sin signo menos se queda igual.",
        `Al sumar $${k}$ todo se traslada: $\\text{Rgo} f = ${ivTex(rango)}$.`,
      ],
    };
  },
};

const cualGrafica: ExerciseGen = {
  id: "cual-grafica",
  title: "¿Cuál gráfica corresponde?",
  level: 1,
  generate: (r) => {
    const bi = r.int(0, BASES.length - 1);
    const B = BASES[bi];
    const h = r.nz(-4, 4);
    const k = r.nz(-4, 4);
    const combos: [number, number, Rich | undefined][] = [
      [h, k, undefined],
      [-h, k, `Esta es $y = ${B.tex(-h, k)}$. El movimiento horizontal va al revés del signo dentro del paréntesis.`],
      [h, -k, `Esta es $y = ${B.tex(h, -k)}$. El movimiento vertical sigue el signo de la constante de afuera.`],
      [-h, -k, `Esta es $y = ${B.tex(-h, -k)}$. Las dos direcciones están cambiadas.`],
    ];
    const order = r.shuffle(combos);
    const correctLetter = LETTERS[order.findIndex((c) => c[2] === undefined)];
    return {
      statement: `¿Cuál de las gráficas corresponde a $y = ${B.tex(h, k)}$?`,
      parts: [{
        kind: "choice",
        shuffle: false,
        options: order.map(([hh, kk, fb], i) => ({ label: `Gráfica ${LETTERS[i]}`, correct: fb === undefined, feedback: fb, graph: shiftedGraph(bi, hh, kk) })),
      }],
      hints: [`Ubica el ${B.start} de $y = ${B.base}$ en el origen y muévelo según la fórmula.`],
      solution: [
        `$y = ${B.tex(h, k)}$ mueve la gráfica de $y = ${B.base}$ ${uds(Math.abs(h))} a la ${h > 0 ? "derecha" : "izquierda"} y ${uds(Math.abs(k))} hacia ${k > 0 ? "arriba" : "abajo"}.`,
        `El ${B.start} queda en $(${h}, ${k})$. Es la gráfica ${correctLetter}.`,
      ],
    };
  },
};

const reflexionGrafica: ExerciseGen = {
  id: "reflexion-grafica",
  title: "Reflexiones: elegir la gráfica",
  level: 2,
  generate: (r) => {
    const bases = [
      { tex: "\\sqrt{x}", f: (x: string) => `\\sqrt{${x}}`, dom: (s: number): [number, number] => (s > 0 ? [0, 6] : [-6, 0]) },
      { tex: "2^{x}", f: (x: string) => `2^{${x}}`, dom: (): [number, number] => [-6, 6] },
      { tex: "\\ln x", f: (x: string) => `\\ln(${x})`, dom: (s: number): [number, number] => (s > 0 ? [0.02, 6] : [-6, -0.02]) },
      { tex: "\\sqrt{x} + 1", f: (x: string) => `\\sqrt{${x}} + 1`, dom: (s: number): [number, number] => (s > 0 ? [0, 6] : [-6, 0]) },
    ];
    const B = r.pick(bases);
    const variants = [
      { sx: 1, sy: 1, tex: `y = ${B.f("x")}` },
      { sx: 1, sy: -1, tex: `y = -${B.tex.includes("+") ? `(${B.f("x")})` : B.f("x")}` },
      { sx: -1, sy: 1, tex: `y = ${B.f("-x")}` },
      { sx: -1, sy: -1, tex: `y = -${B.tex.includes("+") ? `(${B.f("-x")})` : B.f("-x")}` },
    ];
    const target = r.int(1, 3);
    const order = r.shuffle([0, 1, 2, 3]);
    const desc = (v: { sx: number; sy: number }) =>
      v.sx === 1 && v.sy === 1 ? "la función original sin reflejar" : v.sx === 1 ? "la reflexión sobre el eje $x$, que es $-f(x)$" : v.sy === 1 ? "la reflexión sobre el eje $y$, que es $f(-x)$" : "la reflexión sobre los dos ejes, que es $-f(-x)$";
    const graphOf = (v: { sx: number; sy: number }): GraphSpec => {
      const inner = v.sx === 1 ? "x" : "-x";
      const body = B.f(inner);
      return { x: [-6, 6], y: [-4, 4], height: 200, curves: [{ fn: v.sy === 1 ? body : `-(${body})`, domain: B.dom(v.sx), color: "accent" }] };
    };
    const t = variants[target];
    return {
      statement: `Si $f(x) = ${B.tex}$, ¿cuál es la gráfica de $${t.tex}$?`,
      parts: [{
        kind: "choice",
        shuffle: false,
        options: order.map((j, i) => ({
          label: `Gráfica ${LETTERS[i]}`,
          correct: j === target,
          feedback: j === target ? undefined : `Esa es ${desc(variants[j])}.`,
          graph: graphOf(variants[j]),
        })),
      }],
      hints: ["Un signo menos afuera, $-f(x)$, voltea la gráfica de arriba abajo. Un signo menos en la $x$, $f(-x)$, la voltea de izquierda a derecha."],
      solution: [`$${t.tex}$ es ${desc(t)}.`, `Es la gráfica ${LETTERS[order.indexOf(target)]}.`],
    };
  },
};

const formulaDesdeGrafica: ExerciseGen = {
  id: "formula-desde-grafica",
  title: "De la gráfica a la fórmula",
  level: 2,
  generate: (r) => {
    const h = r.nz(-4, 4);
    let k = r.nz(-4, 4);
    if (k === h) k = -k;
    const s = r.pick([1, -1]);
    const isParab = r.bool();
    const make = (ss: number, hh: number, kk: number) => `${ss < 0 ? "-" : ""}${isParab ? `(${minus("x", hh)})^{2}` : `|${minus("x", hh)}|`}${plusK(kk)}`;
    const fn = make(s, h, k);
    return {
      statement: "¿Qué fórmula tiene la función graficada?",
      graph: { x: [-7, 7], y: [-7, 7], curves: [{ fn, color: "accent" }], points: [{ x: h, y: k, label: `(${h}, ${k})` }] },
      parts: [
        choice(`$y = ${fn}$`, [
          [`$y = ${make(s, -h, k)}$`, `Esa fórmula pone el ${isParab ? "vértice" : "pico"} en $x = ${-h}$. Recuerda que $x - h$ mueve hacia la derecha cuando $h > 0$.`],
          [`$y = ${make(s, h, -k)}$`, `Esa fórmula pone el ${isParab ? "vértice" : "pico"} a altura $${-k}$.`],
          [`$y = ${make(-s, h, k)}$`, `El signo del frente decide si abre hacia arriba o hacia abajo. Esta gráfica abre hacia ${s > 0 ? "arriba" : "abajo"}.`],
        ]),
      ],
      hints: ["Lee primero el punto marcado: es $(h, k)$. Luego mira si la gráfica abre hacia arriba o hacia abajo."],
      solution: [
        `El ${isParab ? "vértice" : "pico de la V"} está en $(${h}, ${k})$, así que la fórmula tiene $${isParab ? `(${minus("x", h)})^2` : `|${minus("x", h)}|`}$ y termina en $${plusK(k).trim()}$.`,
        `Abre hacia ${s > 0 ? "arriba, sin signo menos delante" : "abajo, con signo menos delante"}: $y = ${fn}$.`,
      ],
    };
  },
};

const absDeF: ExerciseGen = {
  id: "abs-de-f",
  title: "La gráfica de |f(x)|",
  level: 2,
  generate: (r) => {
    let fTex: string, neg: Interval[], f: (x: number) => number, why: string;
    if (r.bool()) {
      const m = r.pick([1, -1, 2, -2, 3]);
      const x0 = r.nz(-4, 4);
      fTex = poly([m, -m * x0]);
      f = (x) => m * (x - x0);
      neg = m > 0 ? [iv(-Infinity, x0)] : [iv(x0, Infinity)];
      why = `La recta corta al eje en $x = ${x0}$ y tiene pendiente ${m > 0 ? "positiva, así que es negativa a la izquierda" : "negativa, así que es negativa a la derecha"} de ese punto.`;
    } else {
      const c = r.int(1, 4);
      const s = r.pick([1, -1]);
      fTex = s > 0 ? `x^{2} - ${c * c}` : `${c * c} - x^{2}`;
      f = (x) => s * (x * x - c * c);
      neg = s > 0 ? [iv(-c, c)] : [iv(-Infinity, -c), iv(c, Infinity)];
      why = `La parábola corta al eje en $x = \\pm ${c}$. ${s > 0 ? "Abre hacia arriba, así que queda negativa entre los cortes." : "Abre hacia abajo, así que queda negativa fuera de los cortes."}`;
    }
    const candidates = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].filter((x) => f(x) < 0);
    const x1 = r.pick(candidates);
    return {
      statement: `Sea $f(x) = ${fTex}$ y $g(x) = |f(x)|$.`,
      sequential: true,
      parts: [
        { kind: "interval", prompt: "¿En qué conjunto la gráfica de $g$ es distinta de la de $f$?", answer: neg },
        { kind: "expr", prompt: `Calcula $g(${x1})$.`, before: `g(${x1}) =`, answer: String(Math.abs(f(x1))), mistakes: [{ answer: String(f(x1)), feedback: "Ese es $f$, no $g$. El valor absoluto vuelve positivo el resultado." }] },
      ],
      hints: [
        "$|f(x)|$ deja igual lo que está por encima del eje $x$ y refleja hacia arriba lo que está por debajo.",
        "Así que $g$ cambia exactamente donde $f(x) < 0$.",
      ],
      solution: [
        why,
        `Donde $f(x) < 0$, $g$ es el reflejo de $f$: eso pasa en $${ivTex(neg)}$.`,
        `$f(${x1}) = ${f(x1)}$, así que $g(${x1}) = |${f(x1)}| = ${Math.abs(f(x1))}$.`,
      ],
    };
  },
};

const rangoTrozos2: ExerciseGen = {
  id: "rango-trozos-2",
  title: "Rango de una función de dos ramas",
  level: 2,
  generate: (r) => {
    const bs = makePiecewise(r, 2);
    const rango = union(...bs.map((b) => [b.img]));
    return {
      statement: `Halla el rango de $f(x) = ${piecewiseTex(bs)}$.`,
      parts: [{ kind: "interval", before: "\\text{Rgo} f =", answer: rango }],
      hints: [
        "Calcula qué valores toma cada rama dentro de su propio tramo, sin salirte de él.",
        "El rango es la unión de esos dos conjuntos. Un hueco de una rama puede quedar tapado por la otra.",
      ],
      solution: [
        ...bs.map((b, i) => `Rama ${i + 1}, $${b.tex}$ para $${condTex(b.lo, b.hi, b.loC, b.hiC)}$. ${b.why} Toma $${ivTex([b.img])}$.`),
        `Uniendo: $\\text{Rgo} f = ${ivTex(rango)}$.`,
      ],
    };
  },
};

const rangoTrozosParcial: ExerciseGen = {
  id: "rango-trozos-parcial",
  title: "Graficar a trozos y hallar el rango (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const n = r.pick([3, 4] as const);
    const bs = makePiecewise(r, n);
    const rango = union(...bs.map((b) => [b.img]));
    const parts: Part[] = bs.map((b, i) => ({
      kind: "interval",
      prompt: `Valores que toma la rama ${i + 1}, $${b.tex}$, en su tramo.`,
      answer: [b.img],
    }));
    parts.push({ kind: "interval", prompt: "Rango de $f$", before: "\\text{Rgo} f =", answer: rango });
    return {
      statement: `Dada $f: \\mathbb{R} \\to \\mathbb{R}$, $f(x) = ${piecewiseTex(bs)}$, grafícala en tu cuaderno y determina su rango.`,
      sequential: true,
      parts,
      hints: [
        "Dibuja cada rama solo en su tramo. En cada punto de corte, relleno si la condición lleva igual y hueco si no.",
        "Para cada rama mira sus valores en los extremos del tramo, y si es parábola o valor absoluto, también el vértice.",
        "El rango es la unión de lo que aporta cada rama. Proyecta la gráfica sobre el eje $y$.",
      ],
      solution: [
        ...bs.map((b, i) => `Rama ${i + 1}. ${b.why} Aporta $${ivTex([b.img])}$.`),
        `Uniendo todo: $\\text{Rgo} f = ${ivTex(rango)}$.`,
      ],
    };
  },
};

const elegirGraficaTrozos: ExerciseGen = {
  id: "elegir-grafica-trozos",
  title: "Elegir la gráfica de una función a trozos (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    let bs: Branch[];
    do bs = makePiecewise(r, 2);
    while (bs[0].f(bs[0].hi) === bs[1].f(bs[1].lo) || bs[1].f(bs[1].lo) === 0 || bs[0].f(bs[0].hi) === 0);
    const p = bs[0].hi;
    const X: [number, number] = [p - 5, p + 5];
    const Y: [number, number] = [-6, 6];
    const opts: { g: GraphSpec; fb?: Rich }[] = [
      { g: piecewiseGraph(bs, X, Y) },
      { g: piecewiseGraph(bs, X, Y, () => 1, true), fb: `Los puntos de $x = ${p}$ están al revés. El relleno va en la rama cuya condición incluye a $${p}$.` },
      { g: piecewiseGraph(bs, X, Y, (i) => (i === 1 ? -1 : 1)), fb: "La segunda rama está reflejada. Evalúa un punto de esa rama y compara la altura." },
      { g: piecewiseGraph(bs, X, Y, (i) => (i === 0 ? -1 : 1)), fb: "La primera rama está reflejada. Evalúa un punto de esa rama y compara la altura." },
    ];
    const order = r.shuffle([0, 1, 2, 3]);
    const owner = bs[0].hiC ? 1 : 2;
    return {
      statement: `¿Cuál es la gráfica de $f(x) = ${piecewiseTex(bs)}$?`,
      parts: [{
        kind: "choice",
        shuffle: false,
        options: order.map((j, i) => ({ label: `Gráfica ${LETTERS[i]}`, correct: j === 0, feedback: opts[j].fb, graph: opts[j].g })),
      }],
      hints: [
        `Calcula el valor de cada rama en $x = ${p}$. Uno es relleno y el otro hueco.`,
        "Evalúa además un punto cualquiera de cada rama para comprobar la forma.",
      ],
      solution: [
        `La rama 1 llega a $x = ${p}$ con altura $${fmt(bs[0].f(p))}$ y la rama 2 sale de $x = ${p}$ con altura $${fmt(bs[1].f(p))}$.`,
        `El punto $x = ${p}$ pertenece a la rama ${owner}, así que ese extremo va relleno y el otro hueco.`,
        `La gráfica correcta es la ${LETTERS[order.indexOf(0)]}.`,
      ],
    };
  },
};

const transformacionCompuesta: ExerciseGen = {
  id: "transformacion-compuesta",
  title: "Varias transformaciones a la vez (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const A = r.pick([2, -2, -1, 3, -3]);
    const h = r.nz(-4, 4);
    const k = r.int(-4, 4);
    const kind = r.pick(["sqrt", "abs", "sq"] as const);
    const inner = kind === "sqrt" ? `\\sqrt{${minus("x", h)}}` : kind === "abs" ? `|${minus("x", h)}|` : `(${minus("x", h)})^{2}`;
    const pre = A === -1 ? "-" : String(A);
    const fTex = `${pre}${inner}${plusK(k)}`;
    const rango = A > 0 ? [iv(k, Infinity, true)] : [iv(-Infinity, k, false, true)];
    const x1 = h + 1;
    const y1 = A + k;
    const parts: Part[] = [
      { kind: "point", prompt: `Marca el ${kind === "sqrt" ? "punto donde arranca la gráfica" : "vértice"}.`, graph: { x: [-7, 7], y: [-7, 7] }, answer: [h, k] },
    ];
    if (kind === "sqrt") parts.push({ kind: "interval", prompt: "Dominio", before: "\\text{Dom} g =", answer: [iv(h, Infinity, true)] });
    parts.push(
      { kind: "interval", prompt: "Rango", before: "\\text{Rgo} g =", answer: rango, mistakes: [{ answer: A > 0 ? [iv(-Infinity, k, false, true)] : [iv(k, Infinity, true)], feedback: A > 0 ? "El coeficiente es positivo, así que no hay reflexión." : "El coeficiente negativo refleja la gráfica hacia abajo." }] },
      { kind: "expr", prompt: `Calcula $g(${x1})$.`, before: `g(${x1}) =`, answer: String(y1) },
    );
    const baseName = kind === "sqrt" ? "\\sqrt{x}" : kind === "abs" ? "|x|" : "x^2";
    return {
      statement: `Sea $g(x) = ${fTex}$, obtenida a partir de $y = ${baseName}$.`,
      sequential: true,
      parts,
      hints: [
        `Ordena los pasos: primero mueve $${baseName}$ en horizontal, luego multiplica por $${A}$ y al final suma $${k}$.`,
        "Multiplicar por un número negativo refleja sobre el eje $x$. Su tamaño estira la gráfica.",
      ],
      solution: [
        `Paso 1: $y = ${inner}$ mueve la gráfica ${uds(Math.abs(h))} a la ${h > 0 ? "derecha" : "izquierda"}. El punto clave pasa a $(${h}, 0)$.`,
        `Paso 2: multiplicar por $${A}$ ${A < 0 ? "refleja sobre el eje $x$ y " : ""}${Math.abs(A) === 1 ? "no cambia el tamaño" : `estira la gráfica por un factor ${Math.abs(A)}`}. El punto clave sigue en $(${h}, 0)$.`,
        `Paso 3: ${k === 0 ? "no hay traslación vertical" : `${k > 0 ? "sumar" : "restar"} $${Math.abs(k)}$ mueve todo ${uds(Math.abs(k))} hacia ${k > 0 ? "arriba" : "abajo"}`}. El punto clave queda en $(${h}, ${k})$.`,
        ...(kind === "sqrt" ? [`Dominio: $${minus("x", h)} \\ge 0$, así que $\\text{Dom} g = [${h}, +\\infty)$.`] : []),
        `La gráfica ${A > 0 ? "sube" : "baja"} desde la altura $${k}$: $\\text{Rgo} g = ${ivTex(rango)}$.`,
        `$g(${x1}) = ${A} \\cdot 1${plusK(k)} = ${y1}$.`,
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const quickRangoGrafica: Exercise = {
  statement: "La gráfica muestra una función en su dominio completo. ¿Cuál es su rango?",
  graph: {
    x: [-2, 5], y: [-1, 5],
    segments: [{ from: [0, 1], to: [3, 4], color: "accent" }],
    points: [{ x: 0, y: 1, color: "accent" }, { x: 3, y: 4, open: true, color: "accent" }],
  },
  parts: [{ kind: "interval", before: "\\text{Rgo} f =", answer: [iv(1, 4, true, false)], mistakes: [{ answer: [iv(0, 3, true, false)], feedback: "Ese es el dominio, que se lee en el eje $x$. El rango se lee en el eje $y$." }] }],
  solution: ["Proyectando sobre el eje $y$, la gráfica cubre desde la altura 1, con punto relleno, hasta la altura 4, con punto hueco. El rango es $[1, 4)$."],
};

const topic: Topic = {
  ...meta("graficas-transformaciones"),
  objectives: [
    "Obtener la gráfica de $f(x - h) + k$, $-f(x)$, $f(-x)$ y $a\\,f(x)$ a partir de la gráfica de $f$.",
    "Dibujar $|f(x)|$ reflejando hacia arriba la parte negativa.",
    "Graficar funciones a trozos con sus puntos abiertos y cerrados.",
    "Leer el dominio y el rango de una gráfica, incluidas las funciones a trozos del parcial.",
  ],
  sections: [
    {
      id: "traslaciones",
      title: "Traslaciones",
      blocks: [
        {
          type: "text",
          md: "No hace falta una tabla de valores para dibujar $y = \\sqrt{x + 2} - 1$. Basta con saber cómo es $y = \\sqrt{x}$ y moverla. Las funciones del tema anterior son las piezas, y las transformaciones son las instrucciones para colocarlas.\n\nHay dos movimientos básicos. Si sumas una constante **afuera**, $f(x) + k$, cada altura cambia en $k$ y la gráfica sube o baja. Si la sumas **adentro**, $f(x - h)$, la gráfica se corre hacia los lados.",
        },
        {
          type: "definition",
          title: "Traslación",
          md: "Con $h$ y $k$ positivos:\n\n- $f(x) + k$ sube la gráfica $k$ unidades. $f(x) - k$ la baja.\n- $f(x - h)$ la mueve $h$ unidades a la **derecha**. $f(x + h)$ la mueve a la **izquierda**.",
        },
        {
          type: "widget",
          widget: {
            kind: "sliders",
            fn: "\\sqrt{x-h}+k",
            params: [
              { name: "h", min: -5, max: 5, step: 1, value: -2 },
              { name: "k", min: -4, max: 4, step: 1, value: -1 },
            ],
            x: [-7, 7],
            y: [-5, 5],
            formula: "y = \\sqrt{x - h} + k \\qquad h = {h},\\; k = {k}",
            reference: [{ fn: "\\sqrt{x}", color: "muted", dashed: true, domain: [0, 7] }],
          },
          caption: "La curva punteada es $y = \\sqrt{x}$. El punto donde arranca la raíz se mueve a $(h, k)$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "El signo de adentro engaña",
          md: "$f(x - 3)$ mueve la gráfica a la **derecha**, aunque haya un signo menos. La razón: para obtener la salida que $f$ daba en $x = 0$, ahora hay que meter $x = 3$. Todo ocurre tres unidades más tarde.",
        },
        {
          type: "example",
          title: "Graficar sin tabla",
          problem: "Dibuja $g(x) = \\sqrt{x + 2} - 1$ y halla su dominio y su rango.",
          steps: [
            "Partimos de $y = \\sqrt{x}$, que arranca en $(0, 0)$ y sube hacia la derecha.",
            "El $+2$ de adentro mueve la gráfica 2 unidades a la izquierda. Ahora arranca en $(-2, 0)$.",
            "El $-1$ de afuera la baja una unidad. Arranca en $(-2, -1)$.",
            "Dominio: los $x$ desde $-2$ en adelante, $[-2, +\\infty)$. Rango: las alturas desde $-1$ hacia arriba, $[-1, +\\infty)$.",
          ],
        },
        {
          type: "graph",
          spec: {
            x: [-4, 6], y: [-3, 4],
            curves: [
              { fn: "\\sqrt{x}", color: "muted", dashed: true, domain: [0, 6], label: "√x" },
              { fn: "\\sqrt{x+2}-1", color: "accent", domain: [-2, 6], label: "g" },
            ],
            points: [{ x: 0, y: 0, color: "muted" }, { x: -2, y: -1, color: "accent", label: "(-2, -1)" }],
          },
        },
        {
          type: "quick",
          exercise: {
            statement: "La gráfica de $y = (x + 4)^2$ es la de $y = x^2$ movida...",
            parts: [choice("4 unidades a la izquierda.", [["4 unidades a la derecha.", "El $+4$ está adentro, así que mueve al revés del signo."], ["4 unidades hacia arriba.", "Para subir, el 4 tendría que sumarse afuera: $x^2 + 4$."]])],
            solution: ["El vértice pasa de $(0, 0)$ a $(-4, 0)$, porque $(x + 4)^2 = 0$ cuando $x = -4$."],
          },
        },
      ],
    },
    {
      id: "reflexiones",
      title: "Reflexiones",
      blocks: [
        {
          type: "text",
          md: "Un signo menos también mueve la gráfica, pero como un espejo. Depende de dónde se ponga:\n\n- $-f(x)$ cambia el signo de cada **salida**. Lo que estaba arriba pasa abajo: es un reflejo sobre el **eje $x$**.\n- $f(-x)$ cambia el signo de cada **entrada**. Lo que estaba a la derecha pasa a la izquierda: es un reflejo sobre el **eje $y$**.",
        },
        {
          type: "graph",
          spec: {
            x: [-4, 4], y: [-5, 5],
            curves: [
              { fn: "e^{x}", color: "accent", label: "e^x" },
              { fn: "-e^{x}", color: "red", label: "-e^x" },
              { fn: "e^{-x}", color: "blue", label: "e^{-x}" },
            ],
          },
          caption: "$-e^x$ refleja sobre el eje $x$ y $e^{-x}$ refleja sobre el eje $y$.",
        },
        {
          type: "example",
          title: "Dominio y rango de un reflejo",
          problem: "Halla dominio y rango de $g(x) = -\\sqrt{x}$ y de $h(x) = \\sqrt{-x}$.",
          steps: [
            "$g$ refleja $\\sqrt{x}$ sobre el eje $x$. El dominio no cambia, $[0, +\\infty)$. Las alturas cambian de signo: el rango pasa a $(-\\infty, 0]$.",
            "$h$ refleja sobre el eje $y$. Ahora el radicando $-x$ tiene que ser $\\ge 0$, o sea $x \\le 0$. Dominio $(-\\infty, 0]$ y rango $[0, +\\infty)$.",
          ],
        },
        {
          type: "note",
          tone: "tip",
          title: "Qué cambia con cada reflejo",
          md: "$-f(x)$ cambia el rango y deja el dominio. $f(-x)$ cambia el dominio y deja el rango.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Cuál es el rango de $y = -2^{x}$?",
            parts: [{ kind: "interval", answer: [iv(-Infinity, 0)], mistakes: [{ answer: [iv(0, Infinity)], feedback: "Ese es el rango de $2^x$. El signo menos lo refleja." }, { answer: [iv(-Infinity, 0, false, true)], feedback: "$2^x$ nunca vale 0, así que $-2^x$ tampoco. El cero va abierto." }] }],
            solution: ["$2^x$ toma los valores $(0, +\\infty)$. Con el signo menos pasan a $(-\\infty, 0)$."],
          },
        },
      ],
    },
    {
      id: "estiramientos",
      title: "Estiramientos y el orden de los pasos",
      blocks: [
        {
          type: "text",
          md: "Multiplicar la función por un número $a$ multiplica cada altura. Si $|a| > 1$ la gráfica se estira en vertical y se ve más cerrada. Si $0 < |a| < 1$ se aplasta y se ve más abierta. Si $a$ es negativo, además se refleja.",
        },
        {
          type: "widget",
          widget: {
            kind: "sliders",
            fn: "a|x|",
            params: [{ name: "a", min: -3, max: 3, step: 0.25, value: 2 }],
            x: [-5, 5],
            y: [-6, 6],
            formula: "y = a|x| \\qquad a = {a}",
            reference: [{ fn: "|x|", color: "muted", dashed: true }],
          },
          caption: "Con $a = 2$ la V se cierra, con $a = 0{,}5$ se abre y con $a$ negativo se voltea.",
        },
        {
          type: "text",
          md: "Para una fórmula como $y = a\\,f(x - h) + k$ conviene seguir este orden: primero el movimiento horizontal, después el estiramiento o la reflexión y al final el movimiento vertical. El punto clave de la gráfica base, el que estaba en el origen, termina en $(h, k)$.",
        },
        {
          type: "example",
          title: "Tres transformaciones",
          problem: "Describe la gráfica de $y = -2(x - 1)^2 + 3$ a partir de $y = x^2$.",
          steps: [
            "$(x - 1)^2$: la parábola se mueve 1 unidad a la derecha. Vértice en $(1, 0)$.",
            "$-2(x - 1)^2$: el 2 la cierra y el signo menos la voltea. Ahora abre hacia abajo, vértice en $(1, 0)$.",
            "$+3$: todo sube 3. Vértice en $(1, 3)$.",
            "Abre hacia abajo desde altura 3, así que el rango es $(-\\infty, 3]$.",
          ],
        },
        {
          type: "graph",
          spec: {
            x: [-3, 5], y: [-5, 5],
            curves: [
              { fn: "x^{2}", color: "muted", dashed: true },
              { fn: "-2(x-1)^{2}+3", color: "accent" },
            ],
            points: [{ x: 1, y: 3, label: "(1, 3)" }],
          },
        },
        {
          type: "quick",
          exercise: {
            statement: "Marca la punta de la V de $y = -|x + 2| + 3$.",
            parts: [{ kind: "point", graph: { x: [-6, 6], y: [-6, 6] }, answer: [-2, 3] }],
            solution: ["$|x + 2|$ mueve la punta a $x = -2$, el signo menos voltea la V y el $+3$ la sube. La punta queda en $(-2, 3)$."],
          },
        },
      ],
    },
    {
      id: "valor-absoluto-de-f",
      title: "La gráfica de |f(x)|",
      blocks: [
        {
          type: "text",
          md: "Poner toda la función dentro de un valor absoluto, $y = |f(x)|$, tiene un efecto muy concreto. Donde $f(x) \\ge 0$ nada cambia. Donde $f(x) < 0$ la gráfica se refleja hacia arriba, como si el eje $x$ fuera un espejo que no deja pasar nada por debajo.",
        },
        {
          type: "graph",
          spec: {
            x: [-4, 4], y: [-5, 6],
            curves: [
              { fn: "x^{2}-4", color: "muted", dashed: true, label: "x² - 4" },
              { fn: "|x^{2}-4|", color: "accent", label: "|x² - 4|" },
            ],
          },
          caption: "Entre $-2$ y $2$ la parábola estaba por debajo del eje. El valor absoluto la sube y forma una joroba.",
        },
        {
          type: "example",
          title: "Una función del primer parcial",
          problem: "Escribe $f(x) = |x| - x$ sin valor absoluto y halla su rango.",
          steps: [
            "Si $x \\ge 0$, $|x| = x$ y queda $f(x) = x - x = 0$.",
            "Si $x < 0$, $|x| = -x$ y queda $f(x) = -x - x = -2x$.",
            "Para $x < 0$, $-2x$ es positivo y crece sin límite hacia la izquierda. A la derecha la función vale 0.",
          ],
          answer: "$f(x) = \\begin{cases} -2x & \\text{si } x < 0 \\\\ 0 & \\text{si } x \\ge 0 \\end{cases}$ y su rango es $[0, +\\infty)$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "$|f(x)|$ no es lo mismo que $f(|x|)$",
          md: "En $|f(x)|$ el valor absoluto actúa sobre la salida y refleja hacia arriba. En $f(|x|)$ actúa sobre la entrada: la mitad derecha de la gráfica se copia en la izquierda.",
        },
        {
          type: "quick",
          exercise: {
            statement: "¿Cuál es el rango de $y = |\\ln x|$?",
            parts: [{ kind: "interval", answer: [iv(0, Infinity, true)], mistakes: [{ answer: R, feedback: "Ese es el rango de $\\ln x$. El valor absoluto elimina los negativos." }] }],
            solution: ["$\\ln x$ toma todos los reales. El valor absoluto convierte los negativos en positivos y deja el 0, que se alcanza en $x = 1$. Rango $[0, +\\infty)$."],
          },
        },
      ],
    },
    {
      id: "a-trozos",
      title: "Funciones a trozos",
      blocks: [
        {
          type: "text",
          md: "Una función a trozos usa reglas distintas según dónde caiga $x$. Pasa mucho en economía: una tarifa eléctrica cobra un precio por los primeros kilovatios y otro precio a partir de cierto consumo.\n\nPara graficarla se dibuja cada rama **solo en su tramo**. En los puntos de corte importa el detalle: si la condición incluye el número ($\\le$ o $\\ge$) el extremo va **relleno**, y si no lo incluye ($<$ o $>$) va **hueco**.",
        },
        {
          type: "example",
          title: "Graficar y hallar el rango",
          problem: "Grafica $f(x) = \\begin{cases} x + 4 & \\text{si } x < -2 \\\\ x^2 - 2 & \\text{si } -2 \\le x \\le 1 \\\\ 3 & \\text{si } x > 1 \\end{cases}$ y halla su rango.",
          steps: [
            "Rama 1, la recta $x + 4$ para $x < -2$. En $x = -2$ llegaría a $2$, pero ese punto no es suyo: hueco en $(-2, 2)$. Hacia la izquierda baja sin límite. Aporta $(-\\infty, 2)$.",
            "Rama 2, la parábola $x^2 - 2$ en $[-2, 1]$. Vale $2$ en $x = -2$ (relleno), tiene su vértice en $(0, -2)$ y vale $-1$ en $x = 1$ (relleno). Aporta $[-2, 2]$.",
            "Rama 3, la constante 3 para $x > 1$. Empieza con un hueco en $(1, 3)$. Aporta solo el valor $3$.",
            "Unimos: $(-\\infty, 2) \\cup [-2, 2] \\cup \\{3\\} = (-\\infty, 2] \\cup \\{3\\}$. El hueco de la rama 1 en altura 2 queda tapado por la rama 2.",
          ],
          answer: "$\\text{Rgo} f = (-\\infty, 2] \\cup \\{3\\}$",
        },
        {
          type: "graph",
          spec: {
            x: [-6, 5], y: [-3, 5],
            curves: [
              { fn: "x+4", domain: [-6, -2], color: "accent" },
              { fn: "x^{2}-2", domain: [-2, 1], color: "blue" },
              { fn: "3", domain: [1, 5], color: "green" },
            ],
            points: [
              { x: -2, y: 2, color: "blue" },
              { x: 1, y: -1, color: "blue" },
              { x: 1, y: 3, open: true, color: "green" },
              { x: 0, y: -2, label: "vértice", color: "blue" },
            ],
          },
          caption: "Cada color es una rama. En $x = 1$ hay un salto: el punto relleno es de la parábola y el hueco es de la constante.",
        },
        {
          type: "example",
          title: "La función del parcial de 2015",
          problem: "Grafica $f(x) = \\begin{cases} x^2 + 1 & \\text{si } -5 \\le x < -3 \\\\ -|x + 3| & \\text{si } -3 \\le x < 0 \\\\ \\log x & \\text{si } 0 < x \\le 1 \\\\ \\sqrt{x - 1} + 2 & \\text{si } 1 < x \\le 5 \\end{cases}$ y determina su rango.",
          steps: [
            "$x^2 + 1$ en $[-5, -3)$: para negativos la parábola baja al acercarse a 0. Vale $26$ en $-5$ (relleno) y $10$ en $-3$ (hueco). Aporta $(10, 26]$.",
            "$-|x + 3|$ en $[-3, 0)$: es una V invertida con punta en $(-3, 0)$, que es relleno. Baja hasta $-3$ en $x = 0$, que es hueco. Aporta $(-3, 0]$.",
            "$\\log x$ en $(0, 1]$: cerca de 0 baja sin límite y en $x = 1$ vale $0$ (relleno). Aporta $(-\\infty, 0]$.",
            "$\\sqrt{x - 1} + 2$ en $(1, 5]$: arranca en $(1, 2)$ con hueco y llega a $(5, 4)$ relleno. Aporta $(2, 4]$.",
            "Unimos. $(-3, 0]$ ya está dentro de $(-\\infty, 0]$, así que el rango queda en tres pedazos.",
          ],
          answer: "$\\text{Rgo} f = (-\\infty, 0] \\cup (2, 4] \\cup (10, 26]$. El dominio es $[-5, 5] - \\{0\\}$.",
        },
        {
          type: "graph",
          spec: {
            x: [-6, 6], y: [-6, 28], height: 420, step: 2,
            curves: [
              { fn: "x^{2}+1", domain: [-5, -3], color: "accent" },
              { fn: "-|x+3|", domain: [-3, 0], color: "blue" },
              { fn: "\\log(x)", domain: [0.001, 1], color: "green" },
              { fn: "\\sqrt{x-1}+2", domain: [1, 5], color: "orange" },
            ],
            points: [
              { x: -5, y: 26, color: "accent" },
              { x: -3, y: 10, open: true, color: "accent" },
              { x: -3, y: 0, color: "blue" },
              { x: 0, y: -3, open: true, color: "blue" },
              { x: 1, y: 0, color: "green" },
              { x: 1, y: 2, open: true, color: "orange" },
              { x: 5, y: 4, color: "orange" },
            ],
          },
        },
        {
          type: "note",
          tone: "warning",
          title: "Errores que cuestan puntos",
          md: "Dibujar una rama fuera de su tramo, por ejemplo la parábola completa en lugar del pedazo que le toca. Y olvidar los huecos: si un extremo es hueco, ese valor solo entra al rango si otra rama lo alcanza.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Halla el rango de $f(x) = \\begin{cases} 2x & \\text{si } x < 1 \\\\ 5 & \\text{si } x \\ge 1 \\end{cases}$.",
            parts: [{ kind: "interval", before: "\\text{Rgo} f =", answer: [iv(-Infinity, 2), pt(5)] }],
            solution: ["La recta $2x$ para $x < 1$ toma todos los valores menores que 2, sin el 2: $(-\\infty, 2)$.", "La constante aporta el 5. Rango: $(-\\infty, 2) \\cup \\{5\\}$."],
          },
        },
      ],
    },
    {
      id: "leer-rango",
      title: "Leer dominio y rango en una gráfica",
      blocks: [
        {
          type: "text",
          md: "Con la gráfica en la mano, el dominio y el rango se leen como sombras. El **dominio** es la sombra de la gráfica sobre el eje $x$, como si una luz la alumbrara desde arriba. El **rango** es la sombra sobre el eje $y$, con la luz desde un costado.\n\nLos huecos solo quitan un valor si ningún otro punto de la gráfica lo tapa.",
        },
        {
          type: "graph",
          spec: {
            x: [-2, 6], y: [-1, 5],
            curves: [
              { fn: "-(x-1)^{2}+4", domain: [-1, 3], color: "accent" },
              { fn: "1", domain: [3, 5], color: "accent" },
            ],
            points: [
              { x: -1, y: 0, color: "accent" },
              { x: 3, y: 0, open: true, color: "accent" },
              { x: 3, y: 1, color: "accent" },
              { x: 5, y: 1, color: "accent" },
              { x: 1, y: 4, label: "(1, 4)" },
            ],
          },
        },
        {
          type: "example",
          title: "Leer la gráfica de arriba",
          problem: "Halla el dominio y el rango de la función graficada.",
          steps: [
            "Sombra en el eje $x$: la gráfica va desde $x = -1$ (relleno) hasta $x = 5$ (relleno), sin cortes. Dominio $[-1, 5]$.",
            "Sombra en el eje $y$: lo más alto es 4, en el vértice. Lo más bajo es 0.",
            "El punto $(3, 0)$ es hueco, pero la altura 0 sí se alcanza en $x = -1$. Por eso el 0 entra.",
            "El tramo horizontal aporta la altura 1, que ya estaba cubierta por la parábola.",
          ],
          answer: "$\\text{Dom} f = [-1, 5]$ y $\\text{Rgo} f = [0, 4]$.",
        },
        { type: "quick", exercise: quickRangoGrafica },
      ],
    },
  ],
  exercises: [
    describirTraslacion,
    marcarVertice,
    evaluarTrozos,
    rangoTransformada,
    cualGrafica,
    reflexionGrafica,
    formulaDesdeGrafica,
    absDeF,
    rangoTrozos2,
    rangoTrozosParcial,
    elegirGraficaTrozos,
    transformacionCompuesta,
  ],
};

export default topic;
