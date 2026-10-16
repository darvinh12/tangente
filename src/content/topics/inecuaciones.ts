import { meta } from "../catalog";
import { trueFalse } from "../helpers";
import type { ExerciseGen, Rich, Topic } from "../types";
import {
  contains, iv, minusPoints, signSolve, unionTex, type IneqOp, type Interval, type SignFactor,
} from "@/lib/math/intervals";
import { coef, fmt, interval, minus, poly, terms } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

type Op = IneqOp;
const OPS: Op[] = ["<", "<=", ">", ">="];
const opTex: Record<Op, string> = { "<": "<", "<=": "\\le", ">": ">", ">=": "\\ge" };
const flipOp: Record<Op, Op> = { "<": ">", "<=": ">=", ">": "<", ">=": "<=" };
const isStrict = (op: Op) => op === "<" || op === ">";
const wantsPos = (op: Op) => op === ">" || op === ">=";

/** Solución de x op s como intervalo. */
function ray(op: Op, s: number): Interval[] {
  switch (op) {
    case "<": return [iv(-Infinity, s)];
    case "<=": return [iv(-Infinity, s, false, true)];
    case ">": return [iv(s, Infinity)];
    case ">=": return [iv(s, Infinity, true, false)];
  }
}

/** Solución de una desigualdad con valor absoluto cuyo "adentro" está entre lo y hi. */
function absSol(lo: number, hi: number, op: Op): Interval[] {
  const closed = !isStrict(op);
  if (op === "<" || op === "<=") return [iv(lo, hi, closed, closed)];
  return [iv(-Infinity, lo, false, closed), iv(hi, Infinity, closed, false)];
}

const sameSet = (a: Interval[], b: Interval[]) => unionTex(a) === unionTex(b);

function keep(answer: Interval[], ms: { answer: Interval[]; feedback: Rich }[]) {
  const out: { answer: Interval[]; feedback: Rich }[] = [];
  for (const m of ms) {
    if (sameSet(m.answer, answer)) continue;
    if (out.some((o) => sameSet(o.answer, m.answer))) continue;
    out.push(m);
  }
  return out;
}

/** (x - r) con paréntesis, o x si r = 0. */
const fac = (r: number) => (r === 0 ? "x" : `(${minus("x", r)})`);
/** Producto (x - p)(x - q) con la x suelta adelante. */
const prod2 = (p: number, q: number) => (q === 0 ? `x${fac(p)}` : `${fac(p)}${fac(q)}`);
const lin = (a: number, b: number) => terms([[a, "x"], [b, ""]]);

/** Describe el signo en cada tramo de la tabla de signos. */
function signSummary(factors: SignFactor[], lead: number): string {
  const roots = [...new Set(factors.map((f) => f.root))].sort((a, b) => a - b);
  const cuts = [-Infinity, ...roots, Infinity];
  const parts: string[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i];
    const b = cuts[i + 1];
    const mid = !Number.isFinite(a) ? b - 1 : !Number.isFinite(b) ? a + 1 : (a + b) / 2;
    let s = Math.sign(lead);
    for (const f of factors) s *= Math.sign(Math.pow(mid - f.root, f.mult ?? 1));
    parts.push(`en $${interval(a, b, false, false)}$ es ${s > 0 ? "positivo" : "negativo"}`);
  }
  return parts.join(", ");
}

/** Texto de la regla para quedarse con los tramos. */
function pickRule(op: Op, hasDen = false): string {
  const which = wantsPos(op) ? "positivos" : "negativos";
  if (isStrict(op)) return `Como la desigualdad es estricta, nos quedamos con los tramos ${which} y las raíces no entran.`;
  return hasDen
    ? `Nos quedamos con los tramos ${which}. Las raíces del numerador entran por el signo igual, las del denominador nunca.`
    : `Nos quedamos con los tramos ${which} y, por el signo igual, también con las raíces.`;
}

/* ----------------------------------- ejercicios ----------------------------------- */

const propiedades: ExerciseGen = {
  id: "propiedades",
  title: "¿Se voltea o no se voltea?",
  level: 1,
  generate: (r) => {
    const op = r.pick(OPS);
    const k = r.int(-6, 6);
    const kind = r.pick(["suma", "pos", "neg"] as const);
    const c = kind === "suma" ? r.nz(-7, 7) : kind === "pos" ? r.int(2, 6) : -r.int(2, 6);
    const lhs = kind === "suma" ? minus("x", -c) : coef(c, "x");
    const rhs = kind === "suma" ? fmt(k + c) : fmt(c * k);
    const right = kind === "neg" ? flipOp[op] : op;
    const isTrue = r.bool();
    const shown = isTrue ? right : flipOp[right];
    const action =
      kind === "suma"
        ? `${c > 0 ? "Sumar" : "Restar"} $${Math.abs(c)}$ en ambos lados no cambia el sentido de la desigualdad`
        : kind === "pos"
          ? `Multiplicar por $${c}$, que es positivo, no cambia el sentido de la desigualdad`
          : `Multiplicar por $${c}$, que es negativo, voltea el sentido de la desigualdad`;
    const why = `${action}. Lo correcto es $${lhs} ${opTex[right]} ${rhs}$.`;
    return {
      statement: `Si $x ${opTex[op]} ${k}$, entonces $${lhs} ${opTex[shown]} ${rhs}$. ¿Verdadero o falso?`,
      parts: [trueFalse(isTrue, why)],
      hints: ["Pregúntate qué se le hizo a la $x$: ¿se le sumó algo o se multiplicó por un número? ¿Ese número es negativo?"],
      solution: [
        kind === "suma"
          ? `Pasar de $x$ a $${lhs}$ es ${c > 0 ? "sumar" : "restar"} $${Math.abs(c)}$ en ambos lados.`
          : `Pasar de $x$ a $${lhs}$ es multiplicar ambos lados por $${c}$.`,
        `${action}: $${lhs} ${opTex[right]} ${rhs}$.`,
        `Por lo tanto la afirmación es ${isTrue ? "verdadera" : "falsa"}.`,
      ],
    };
  },
};

const lineal: ExerciseGen = {
  id: "lineal",
  title: "Inecuación lineal",
  level: 1,
  generate: (r) => {
    const op = r.pick(OPS);
    const a = r.int(2, 7);
    const s = r.int(-6, 6);
    const b = r.nz(-9, 9);
    const c = a * s + b;
    const ans = ray(op, s);
    return {
      statement: `Resuelve $${lin(a, b)} ${opTex[op]} ${c}$ y escribe la solución como intervalo.`,
      parts: [
        {
          kind: "interval",
          answer: ans,
          mistakes: keep(ans, [
            { answer: ray(flipOp[op], s), feedback: `Volteaste la desigualdad sin motivo. Dividir entre $${a}$, que es positivo, no cambia el sentido.` },
            { answer: ray(isStrict(op) ? (op === "<" ? "<=" : ">=") : op === "<=" ? "<" : ">", s), feedback: `Revisa el extremo $${s}$. ${isStrict(op) ? "Con desigualdad estricta no entra." : "Con $\\le$ o $\\ge$ sí entra."}` },
          ]),
        },
      ],
      hints: [
        `Primero ${b > 0 ? "resta" : "suma"} $${Math.abs(b)}$ en ambos lados para dejar solo el término con $x$.`,
        `Después divide entre $${a}$. Como es positivo, el signo se queda igual.`,
      ],
      solution: [
        `${b > 0 ? "Restamos" : "Sumamos"} $${Math.abs(b)}$ en ambos lados: $${a}x ${opTex[op]} ${c - b}$.`,
        `Dividimos entre $${a}$, que es positivo, así que el signo no cambia: $x ${opTex[op]} ${s}$.`,
        `Como intervalo: $${unionTex(ans)}$.`,
      ],
    };
  },
};

const linealNegativo: ExerciseGen = {
  id: "lineal-negativo",
  title: "Inecuación lineal con coeficiente negativo",
  level: 1,
  generate: (r) => {
    const op = r.pick(OPS);
    const a = r.int(2, 6);
    const s = r.int(-6, 6);
    const b = r.nz(-9, 9);
    const c = b - a * s;
    const ans = ray(flipOp[op], s);
    return {
      statement: `Resuelve $${terms([[b, ""], [-a, "x"]])} ${opTex[op]} ${c}$ y escribe la solución como intervalo.`,
      parts: [
        {
          kind: "interval",
          answer: ans,
          mistakes: [
            { answer: ray(op, s), feedback: `Al dividir entre $-${a}$, que es negativo, la desigualdad se voltea. Te faltó cambiar el sentido.` },
          ],
        },
      ],
      hints: [
        `Pasa el $${b}$ al otro lado. Te queda $-${a}x$ de un lado.`,
        "Para quitar el número negativo que acompaña a la $x$ tienes que dividir entre un negativo. ¿Qué le pasa a la desigualdad?",
      ],
      solution: [
        `${b > 0 ? "Restamos" : "Sumamos"} $${Math.abs(b)}$ en ambos lados: $-${a}x ${opTex[op]} ${c - b}$.`,
        `Dividimos entre $-${a}$. Como es negativo, el signo se voltea: $x ${opTex[flipOp[op]]} ${s}$.`,
        `Comprobación con un número de la solución: $x = ${s + (wantsPos(flipOp[op]) ? 1 : -1)}$ da $${b - a * (s + (wantsPos(flipOp[op]) ? 1 : -1))} ${opTex[op]} ${c}$, que se cumple.`,
        `Como intervalo: $${unionTex(ans)}$.`,
      ],
    };
  },
};

const linealAmbos: ExerciseGen = {
  id: "lineal-ambos-lados",
  title: "Con x en ambos lados",
  level: 1,
  generate: (r) => {
    const op = r.pick(OPS);
    let a: number, c: number;
    do {
      a = r.nz(-5, 7);
      c = r.nz(-5, 7);
    } while (a === c);
    const s = r.int(-5, 5);
    const b = r.int(-8, 8);
    const d = (a - c) * s + b;
    const k = a - c;
    const finalOp = k > 0 ? op : flipOp[op];
    const ans = ray(finalOp, s);
    return {
      statement: `Resuelve $${lin(a, b)} ${opTex[op]} ${lin(c, d)}$.`,
      parts: [
        {
          kind: "interval",
          answer: ans,
          mistakes: keep(ans, [
            {
              answer: ray(k > 0 ? flipOp[op] : op, s),
              feedback: k > 0
                ? `El coeficiente de $x$ quedó positivo ($${k}$), así que no había que voltear.`
                : `El coeficiente de $x$ quedó negativo ($${k}$). Al dividir entre él, la desigualdad se voltea.`,
            },
          ]),
        },
      ],
      hints: [
        "Pasa todos los términos con $x$ a la izquierda y todos los números a la derecha.",
        "Fíjate en el signo del número que queda multiplicando a la $x$ antes de dividir.",
      ],
      solution: [
        `Juntamos las $x$ a la izquierda y los números a la derecha: $${coef(k, "x")} ${opTex[op]} ${d - b}$.`,
        k === 1
          ? `Ya está despejada: $x ${opTex[op]} ${s}$.`
          : `Dividimos entre $${k}$, que es ${k > 0 ? "positivo, así que el signo se queda igual" : "negativo, así que el signo se voltea"}: $x ${opTex[finalOp]} ${s}$.`,
        `Solución: $${unionTex(ans)}$.`,
      ],
    };
  },
};

const absBasico: ExerciseGen = {
  id: "valor-absoluto-basico",
  title: "Valor absoluto como distancia",
  level: 1,
  generate: (r) => {
    const op = r.pick(OPS);
    const a = r.int(-5, 5);
    const h = r.int(1, 5);
    const ans = absSol(a - h, a + h, op);
    const inside = op === "<" || op === "<=";
    return {
      statement: `Resuelve $|${minus("x", a)}| ${opTex[op]} ${h}$.`,
      parts: [
        {
          kind: "interval",
          answer: ans,
          mistakes: keep(ans, [
            { answer: absSol(a - h, a + h, flipOp[op]), feedback: inside ? "Eso son los puntos lejos del centro. \"Menor que\" pide los que están cerca." : "Eso son los puntos cerca del centro. \"Mayor que\" pide los que están lejos, a los dos lados." },
            ...(a !== 0 ? [{ answer: absSol(-a - h, -a + h, op), feedback: `El centro está mal. $|${minus("x", a)}|$ es la distancia de $x$ a $${a}$, no a $${-a}$.` }] : []),
          ]),
        },
      ],
      hints: [
        `$|${minus("x", a)}|$ es la distancia entre $x$ y $${a}$.`,
        inside ? `Busca los números que están a menos de $${h}$ unidades de $${a}$.` : `Busca los números que están a más de $${h}$ unidades de $${a}$, a la izquierda y a la derecha.`,
      ],
      solution: [
        `$|${minus("x", a)}|$ mide la distancia de $x$ a $${a}$.`,
        inside
          ? `La condición equivale a $${a - h} ${opTex[op]} x ${opTex[op]} ${a + h}$.`
          : `La condición equivale a $x ${opTex[flipOp[op]]} ${a - h}$ o $x ${opTex[op]} ${a + h}$.`,
        `Solución: $${unionTex(ans)}$.`,
      ],
    };
  },
};

const doble: ExerciseGen = {
  id: "doble",
  title: "Inecuación doble",
  level: 2,
  generate: (r) => {
    const L = r.int(-6, 3);
    const U = L + r.int(2, 6);
    const a = r.pick([2, 3, 4, -2, -3, -1]);
    const b = r.int(-6, 6);
    const c1 = r.bool();
    const c2 = r.bool();
    const op1 = c1 ? "\\le" : "<";
    const op2 = c2 ? "\\le" : "<";
    const m = a > 0 ? a * L + b : a * U + b;
    const n = a > 0 ? a * U + b : a * L + b;
    const ans = [a > 0 ? iv(L, U, c1, c2) : iv(L, U, c2, c1)];
    const mid = lin(a, b);
    const g1 = c1 ? "\\ge" : ">";
    const g2 = c2 ? "\\ge" : ">";
    return {
      statement: `Resuelve $${m} ${op1} ${mid} ${op2} ${n}$.`,
      parts: [
        {
          kind: "interval",
          answer: ans,
          mistakes: keep(ans, [
            ...(a < 0 ? [{ answer: [iv(L, U, c1, c2)], feedback: "Al voltear, cada extremo se lleva su símbolo. El que tenía $\\le$ sigue siendo cerrado, pero ahora está del otro lado." }] : []),
            { answer: [iv(L, U, !c1, !c2)], feedback: "Revisa qué extremos llevan el signo igual." },
          ]),
        },
      ],
      hints: [
        b !== 0 ? `${b > 0 ? "Resta" : "Suma"} $${Math.abs(b)}$ en las tres partes a la vez.` : "No hay número que pasar, ve directo a dividir.",
        a < 0 ? `Divide las tres partes entre $${a}$. Al ser negativo, las dos desigualdades se voltean.` : `Divide las tres partes entre $${a}$.`,
      ],
      solution: [
        b !== 0
          ? `${b > 0 ? "Restamos" : "Sumamos"} $${Math.abs(b)}$ en las tres partes: $${m - b} ${op1} ${coef(a, "x")} ${op2} ${n - b}$.`
          : `Partimos de $${m} ${op1} ${coef(a, "x")} ${op2} ${n}$.`,
        a === -1
          ? `Multiplicamos por $-1$ y las dos desigualdades se voltean: $${U} ${g1} x ${g2} ${L}$.`
          : a > 0
            ? `Dividimos entre $${a}$: $${L} ${op1} x ${op2} ${U}$.`
            : `Dividimos entre $${a}$, que es negativo, y las dos desigualdades se voltean: $${U} ${g1} x ${g2} ${L}$.`,
        a < 0 ? `Leído de menor a mayor: $${L} ${op2} x ${op1} ${U}$.` : "Ya está en orden de menor a mayor.",
        `Solución: $${unionTex(ans)}$.`,
      ],
    };
  },
};

const cuadratica: ExerciseGen = {
  id: "cuadratica",
  title: "Inecuación cuadrática",
  level: 2,
  generate: (r) => {
    const op = r.pick(OPS);
    const square = r.bool(0.25);
    let p: number, q: number, L: number;
    if (square) {
      const k = r.int(1, 6);
      [p, q, L] = [-k, k, 1];
    } else {
      p = r.int(-6, 4);
      q = p + r.int(1, 6);
      L = r.pick([1, 1, 1, -1]);
    }
    const coefs = [L, -L * (p + q), L * p * q];
    const factors: SignFactor[] = [{ root: p }, { root: q }];
    const ans = signSolve(factors, L, op);
    const statement = square ? `x^{2} ${opTex[op]} ${q * q}` : `${poly(coefs)} ${opTex[op]} 0`;
    const op2 = L < 0 ? flipOp[op] : op;
    const ms = [{ answer: signSolve(factors, L, flipOp[op]), feedback: "Tomaste los tramos con el signo contrario. Revisa qué signo pide la desigualdad." }];
    if (square) ms.unshift({ answer: ray(op, q), feedback: `Sacar raíz en ambos lados no funciona. $x^2 ${opTex[op]} ${q * q}$ también lo cumplen (o lo dejan de cumplir) los negativos. Factoriza $(x - ${q})(x + ${q})$ y usa la tabla de signos.` });
    return {
      statement: `Resuelve $${statement}$.`,
      parts: [{ kind: "interval", answer: ans, mistakes: keep(ans, ms) }],
      hints: [
        square ? `Pasa el $${q * q}$ restando y factoriza la diferencia de cuadrados.` : L < 0 ? "Multiplica por $-1$ para que la $x^2$ quede positiva, y voltea la desigualdad." : "Factoriza el trinomio: busca dos números que multiplicados den el término independiente.",
        "Ubica las dos raíces en la recta. El producto es positivo afuera de ellas y negativo entre ellas.",
      ],
      solution: [
        square ? `Pasamos todo a la izquierda: $x^2 - ${q * q} ${opTex[op]} 0$.` : L < 0 ? `Multiplicamos por $-1$ y volteamos: $${poly(coefs.map((c) => -c))} ${opTex[op2]} 0$.` : `Ya está comparada con cero.`,
        `Factorizamos: $${prod2(p, q)} ${opTex[op2]} 0$. Las raíces son $x = ${p}$ y $x = ${q}$.`,
        `Tabla de signos del producto: ${signSummary(factors, 1)}.`,
        pickRule(op2),
        `Solución: $${unionTex(ans)}$.`,
      ],
    };
  },
};

const polinomica: ExerciseGen = {
  id: "polinomica",
  title: "Inecuación polinómica factorizada",
  level: 2,
  generate: (r) => {
    const op = r.pick(OPS);
    const squared = r.bool(0.3);
    const roots = r.sample([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5], squared ? 2 : 3);
    const factors: SignFactor[] = roots.map((x) => ({ root: x }));
    if (squared) factors[0].mult = 2;
    // A veces el último factor viene como (r - x), que es -(x - r)
    const reversed = !squared && roots[2] !== 0 && r.bool(0.45);
    const lead = reversed ? -1 : 1;
    const texF = factors.map((f, i) => {
      if (reversed && i === 2) return `(${f.root} - x)`;
      if (f.mult === 2) return f.root === 0 ? "x^{2}" : `(${minus("x", f.root)})^{2}`;
      return fac(f.root);
    });
    // Que la x suelta vaya adelante
    const order = texF.map((t, i) => [t, i] as const).sort((A, B) => (A[0] === "x" ? -1 : B[0] === "x" ? 1 : A[1] - B[1]));
    const statement = order.map((o) => o[0]).join("");
    const ans = signSolve(factors, lead, op);
    const ms = [{ answer: signSolve(factors, lead, flipOp[op]), feedback: "Tomaste los tramos con el signo contrario." }];
    if (reversed) ms.unshift({ answer: signSolve(factors, -lead, op), feedback: `El factor $(${roots[2]} - x)$ es negativo a la derecha de $${roots[2]}$, al revés que $(${minus("x", roots[2])})$. Revisa su signo en la tabla.` });
    if (squared) ms.push({ answer: signSolve(factors.map((f) => ({ root: f.root })), lead, op), feedback: "Un factor al cuadrado nunca es negativo, así que no cambia el signo al pasar por su raíz." });
    const sorted = [...roots].sort((a, b) => a - b);
    return {
      statement: `Resuelve $${statement} ${opTex[op]} 0$.`,
      parts: [{ kind: "interval", answer: ans, mistakes: keep(ans, ms) }],
      hints: [
        "Iguala cada factor a cero para hallar los puntos donde puede cambiar el signo.",
        squared ? "El factor al cuadrado es positivo o cero siempre." : reversed ? `Ojo con $(${roots[2]} - x)$: es positivo a la izquierda de $${roots[2]}$.` : "Prueba un número en cada tramo y cuenta cuántos factores salen negativos.",
      ],
      solution: [
        `Los puntos críticos son $${sorted.join(", ")}$.`,
        reversed ? `Escribimos $(${roots[2]} - x) = -(${minus("x", roots[2])})$, así que el producto lleva un signo menos delante.` : squared ? `El factor $${texF[0]}$ es positivo salvo en $x = ${roots[0]}$, donde vale cero.` : "Cada factor lineal cambia de signo en su raíz.",
        `Tabla de signos: ${signSummary(factors, lead)}.`,
        pickRule(op),
        `Solución: $${unionTex(ans)}$.`,
      ],
    };
  },
};

const racionalSimple: ExerciseGen = {
  id: "racional-simple",
  title: "Inecuación racional",
  level: 2,
  generate: (r) => {
    const op = r.pick(OPS);
    let p: number, q: number;
    do {
      p = r.int(-6, 6);
      q = r.int(-6, 6);
    } while (p === q);
    const reversed = p !== 0 && r.bool(0.35);
    const lead = reversed ? -1 : 1;
    const num = reversed ? `${p} - x` : minus("x", p);
    const den = minus("x", q);
    const factors: SignFactor[] = [{ root: p }, { root: q, den: true }];
    const ans = signSolve(factors, lead, op);
    const ms = [
      { answer: signSolve([{ root: p }, { root: q }], lead, op), feedback: `Incluiste el $${q}$, pero ahí el denominador vale cero y la fracción no existe. Las raíces del denominador nunca entran.` },
      { answer: ray(reversed ? flipOp[op] : op, p), feedback: "Parece que multiplicaste por el denominador como si fuera positivo. Su signo cambia, por eso hace falta la tabla de signos." },
      { answer: signSolve(factors, lead, flipOp[op]), feedback: "Tomaste los tramos con el signo contrario." },
    ];
    return {
      statement: `Resuelve $\\dfrac{${num}}{${den}} ${opTex[op]} 0$.`,
      parts: [{ kind: "interval", answer: ans, mistakes: keep(ans, ms) }],
      hints: [
        "No multipliques por el denominador. La fracción ya está comparada con cero, así que haz una tabla de signos.",
        `Los puntos críticos son la raíz del numerador ($${p}$) y la del denominador ($${q}$).`,
      ],
      solution: [
        `Puntos críticos: $x = ${p}$ anula el numerador y $x = ${q}$ anula el denominador.`,
        `Tabla de signos de la fracción: ${signSummary(factors, lead)}.`,
        pickRule(op, true),
        `Solución: $${unionTex(ans)}$.`,
      ],
    };
  },
};

const absLineal: ExerciseGen = {
  id: "valor-absoluto-lineal",
  title: "Valor absoluto con coeficiente",
  level: 2,
  generate: (r) => {
    const op = r.pick(OPS);
    const a = r.pick([2, 3, 4]);
    const m = r.int(-4, 4);
    const h = r.int(1, 3);
    const rr = a * h;
    const b = -a * m;
    const inner = b !== 0 && r.bool(0.4) ? terms([[-b, ""], [-a, "x"]]) : lin(a, b);
    const ans = absSol(m - h, m + h, op);
    const inside = op === "<" || op === "<=";
    return {
      statement: `Resuelve $|${inner}| ${opTex[op]} ${rr}$.`,
      parts: [
        {
          kind: "interval",
          answer: ans,
          mistakes: keep(ans, [
            { answer: absSol(-rr - b, rr - b, op), feedback: `Te faltó dividir entre $${a}$ al final.` },
            { answer: absSol(m - h, m + h, flipOp[op]), feedback: inside ? "Con $<$ la solución es un solo tramo, el de adentro." : "Con $>$ la solución son los dos tramos de afuera." },
          ]),
        },
      ],
      hints: [
        `Recuerda que $|${inner}| = |${lin(a, b)}|$, porque el valor absoluto no ve el signo.`,
        inside ? `Escribe $-${rr} ${opTex[op]} ${lin(a, b)} ${opTex[op]} ${rr}$ y despeja.` : `Separa en dos casos: $${lin(a, b)} ${opTex[flipOp[op]]} -${rr}$ o $${lin(a, b)} ${opTex[op]} ${rr}$.`,
      ],
      solution: [
        inner !== lin(a, b) ? `Como $|-u| = |u|$, la inecuación es la misma que $|${lin(a, b)}| ${opTex[op]} ${rr}$.` : `Usamos la regla del valor absoluto.`,
        inside
          ? `$-${rr} ${opTex[op]} ${lin(a, b)} ${opTex[op]} ${rr}$. ${b !== 0 ? `${b > 0 ? "Restamos" : "Sumamos"} $${Math.abs(b)}$` : "No hay número que mover"} y dividimos entre $${a}$: $${m - h} ${opTex[op]} x ${opTex[op]} ${m + h}$.`
          : `$${lin(a, b)} ${opTex[flipOp[op]]} -${rr}$ da $x ${opTex[flipOp[op]]} ${m - h}$, y $${lin(a, b)} ${opTex[op]} ${rr}$ da $x ${opTex[op]} ${m + h}$.`,
        `Solución: $${unionTex(ans)}$.`,
      ],
    };
  },
};

const racionalK: ExerciseGen = {
  id: "racional-constante",
  title: "Racional comparada con un número (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const b = r.int(-4, 5);
    const k = r.pick([2, 3, -1, -2]);
    const op = r.pick(OPS);
    let root: number;
    do root = r.int(-6, 6); while (root === b);
    const a = -root * (1 - k) - k * b;
    const xa = a === 0 ? "x" : minus("x", -a);
    const xb = minus("x", b);
    const numTex = terms([[1 - k, "x"], [a + k * b, ""]]);
    const factors: SignFactor[] = [{ root }, { root: b, den: true }];
    const ans = signSolve(factors, 1 - k, op);
    const kx = k > 0 ? `- ${k}(${xb})` : k === -1 ? `+ (${xb})` : `+ ${-k}(${xb})`;
    const numMistakes = b !== 0 ? [{ answer: terms([[1 - k, "x"], [a - k * b, ""]]), feedback: `Revisa el signo al distribuir $${k}(${xb})$. El signo de afuera multiplica a los dos términos del paréntesis.` }] : [];
    return {
      statement: `Resuelve $\\dfrac{${xa}}{${xb}} ${opTex[op]} ${k}$.`,
      sequential: true,
      parts: [
        {
          kind: "expr",
          prompt: `Pasa el $${k}$ a la izquierda y saca común denominador. Queda $\\dfrac{N(x)}{${xb}} ${opTex[op]} 0$. ¿Cuál es el numerador $N(x)$?`,
          before: "N(x) =",
          answer: numTex,
          vars: ["x"],
          mistakes: numMistakes,
        },
        {
          kind: "interval",
          prompt: "Resuelve la inecuación con una tabla de signos.",
          answer: ans,
          mistakes: keep(ans, [
            { answer: signSolve([{ root }], 1 - k, op), feedback: `Eso sale de multiplicar por $${xb}$ como si fuera positivo. El denominador cambia de signo en $x = ${b}$, por eso se usa la tabla.` },
            { answer: signSolve([{ root }, { root: b }], 1 - k, op), feedback: `El $${b}$ anula el denominador y nunca puede estar en la solución.` },
            { answer: signSolve(factors, 1 - k, flipOp[op]), feedback: "Tomaste los tramos con el signo contrario." },
          ]),
        },
      ],
      hints: [
        `No multipliques por $${xb}$: no sabes si es positivo o negativo.`,
        `Escribe $${k}$ como $\\dfrac{${k}(${xb})}{${xb}}$ para restar las fracciones.`,
        "Con una sola fracción comparada con cero, los puntos críticos son la raíz del numerador y la del denominador.",
      ],
      solution: [
        `${k > 0 ? `Restamos $${k}$` : `Sumamos $${-k}$`} en ambos lados: $\\dfrac{${xa}}{${xb}} ${k > 0 ? "-" : "+"} ${Math.abs(k)} ${opTex[op]} 0$.`,
        `Común denominador: $\\dfrac{${xa} ${kx}}{${xb}} ${opTex[op]} 0$, que simplifica a $\\dfrac{${numTex}}{${xb}} ${opTex[op]} 0$.`,
        `Puntos críticos: $x = ${root}$ (numerador) y $x = ${b}$ (denominador, nunca entra).`,
        `Tabla de signos: ${signSummary(factors, 1 - k)}.`,
        pickRule(op, true),
        `Solución: $${unionTex(ans)}$.`,
      ],
    };
  },
};

const dominio: ExerciseGen = {
  id: "dominio",
  title: "Dominio de una función (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const kind = r.pick(["raizCuad", "raizParabola", "raizRacional", "inversaRaiz", "lnRacional", "lnCuad"] as const);
    let fx: string, cond: string, factors: SignFactor[], lead: number, op: Op, why: string;
    let extra = "";
    let p = r.int(-5, 2);
    let q = p + r.int(1, 5);
    const k = r.int(1, 5);
    switch (kind) {
      case "raizCuad":
        fx = `\\sqrt{x^{2} - ${k * k}}`;
        cond = `x^2 - ${k * k} \\ge 0`;
        factors = [{ root: -k }, { root: k }]; lead = 1; op = ">=";
        why = "Lo de adentro de una raíz cuadrada debe ser mayor o igual que cero.";
        break;
      case "raizParabola":
        fx = `\\sqrt{${poly([-1, p + q, -p * q])}}`;
        cond = `${poly([-1, p + q, -p * q])} \\ge 0`;
        factors = [{ root: p }, { root: q }]; lead = -1; op = ">=";
        why = "Lo de adentro de una raíz cuadrada debe ser mayor o igual que cero.";
        extra = ` Multiplicando por $-1$ queda $${poly([1, -(p + q), p * q])} \\le 0$, que se factoriza como $${prod2(p, q)} \\le 0$.`;
        break;
      case "raizRacional":
        if (r.bool()) [p, q] = [q, p];
        fx = `\\sqrt{\\dfrac{${minus("x", p)}}{${minus("x", q)}}}`;
        cond = `\\dfrac{${minus("x", p)}}{${minus("x", q)}} \\ge 0`;
        factors = [{ root: p }, { root: q, den: true }]; lead = 1; op = ">=";
        why = `La raíz pide radicando mayor o igual que cero, y además $x \\ne ${q}$ por el denominador.`;
        break;
      case "inversaRaiz":
        fx = `\\dfrac{1}{\\sqrt{${k * k} - x^{2}}}`;
        cond = `${k * k} - x^2 > 0`;
        factors = [{ root: -k }, { root: k }]; lead = -1; op = ">";
        why = "La raíz pide radicando mayor o igual que cero, pero como está en el denominador tampoco puede valer cero. Queda una desigualdad estricta.";
        break;
      case "lnRacional":
        if (r.bool()) [p, q] = [q, p];
        fx = `\\ln\\left(\\dfrac{${minus("x", p)}}{${minus("x", q)}}\\right)`;
        cond = `\\dfrac{${minus("x", p)}}{${minus("x", q)}} > 0`;
        factors = [{ root: p }, { root: q, den: true }]; lead = 1; op = ">";
        why = "El logaritmo solo acepta números estrictamente positivos.";
        break;
      default:
        fx = `\\ln(${poly([1, -(p + q), p * q])})`;
        cond = `${poly([1, -(p + q), p * q])} > 0`;
        factors = [{ root: p }, { root: q }]; lead = 1; op = ">";
        why = "El logaritmo solo acepta números estrictamente positivos.";
    }
    const ans = signSolve(factors, lead, op);
    const strictVersion = signSolve(factors, lead, op === ">=" ? ">" : ">=");
    return {
      statement: `Halla el dominio de $f(x) = ${fx}$.`,
      parts: [
        {
          kind: "interval",
          before: "\\operatorname{Dom} f =",
          answer: ans,
          mistakes: keep(ans, [
            { answer: signSolve(factors, lead, "<"), feedback: "Tomaste los tramos donde lo de adentro es negativo. Ahí la función no existe." },
            { answer: strictVersion, feedback: op === ">=" ? "Revisa los extremos. Una raíz de cero sí existe: $\\sqrt{0} = 0$, salvo que el cero esté en un denominador." : "Revisa los extremos. Ni $\\ln 0$ ni una división entre cero existen, así que los extremos van abiertos." },
          ]),
        },
      ],
      hints: [why, "Factoriza y haz una tabla de signos."],
      solution: [
        `${why} La condición es $${cond}$.${extra}`,
        `Tabla de signos: ${signSummary(factors, lead)}.`,
        `Buscamos donde la expresión es ${op === ">=" ? "positiva o cero" : "estrictamente positiva"}${factors.some((f) => f.den) ? ", sin la raíz del denominador" : ""}.`,
        `$\\operatorname{Dom} f = ${unionTex(ans)}$.`,
      ],
    };
  },
};

const dominioAbs: ExerciseGen = {
  id: "dominio-valor-absoluto",
  title: "Dominio con valor absoluto (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    let a: number, c: number, d: number, pts: number[], base: Interval[];
    do {
      a = r.int(2, 5);
      c = r.pick([-5, -3, -1, 1, 3, 5]);
      d = r.pick([5, 7, 9, 11, 13]);
      pts = [(-d - c) / 2, (d - c) / 2];
      base = [iv(-Infinity, -a, false, true), iv(a, Infinity, true, false)];
    } while (!pts.some((x) => contains(base, x) && Math.abs(x) !== a));
    const dom = minusPoints(base, pts);
    const den = `|${lin(2, c)}| - ${d}`;
    return {
      statement: `Halla el dominio de $f(x) = \\dfrac{\\sqrt{|x| - ${a}}}{${den}}$.`,
      sequential: true,
      parts: [
        {
          kind: "interval",
          prompt: "¿Dónde es $|x| - " + a + " \\ge 0$?",
          answer: base,
          mistakes: [{ answer: [iv(-a, a, true, true)], feedback: `Eso es $|x| \\le ${a}$. Necesitas los $x$ que están a ${a} o más del cero.` }],
        },
        {
          kind: "set",
          prompt: `¿Para qué valores de $x$ se anula el denominador $${den}$?`,
          answer: pts,
          mistakes: [{ answer: [(d - c) / 2], feedback: `$|u| = ${d}$ tiene dos soluciones: $u = ${d}$ y $u = -${d}$.` }],
        },
        {
          kind: "interval",
          prompt: "Escribe el dominio de $f$.",
          before: "\\operatorname{Dom} f =",
          answer: dom,
          mistakes: [{ answer: base, feedback: "Te faltó quitar los puntos donde el denominador vale cero." }],
        },
      ],
      hints: [
        `$|x| \\ge ${a}$ significa estar a ${a} o más del cero: $x \\le -${a}$ o $x \\ge ${a}$.`,
        `$|${lin(2, c)}| = ${d}$ se parte en $${lin(2, c)} = ${d}$ y $${lin(2, c)} = -${d}$.`,
        "Al dominio de la raíz le quitas los puntos que anulan el denominador. Si un punto ya estaba fuera, no hay nada que quitar.",
      ],
      solution: [
        `Raíz: $|x| - ${a} \\ge 0$, es decir $|x| \\ge ${a}$. Eso da $${unionTex(base)}$.`,
        `Denominador: $|${lin(2, c)}| = ${d}$ cuando $${lin(2, c)} = ${d}$, o sea $x = ${pts[1]}$, o cuando $${lin(2, c)} = -${d}$, o sea $x = ${pts[0]}$.`,
        `${pts.filter((x) => contains(base, x)).map((x) => `$${x}$`).join(" y ")} ${pts.filter((x) => contains(base, x)).length > 1 ? "están" : "está"} dentro del dominio de la raíz y hay que quitar${pts.filter((x) => contains(base, x)).length > 1 ? "los" : "lo"}.`,
        `$\\operatorname{Dom} f = ${unionTex(dom)}$.`,
      ],
    };
  },
};

const vf: ExerciseGen = {
  id: "verdadero-falso",
  title: "Verdadero o falso sobre desigualdades (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const k = r.int(2, 6);
    const c = r.int(2, 5);
    const a = r.int(-4, 4);
    const claims: { text: string; ok: boolean; why: string }[] = [
      {
        text: `Si $x < ${k}$, entonces $x^2 < ${k * k}$.`,
        ok: false,
        why: `Con $x = -${k + 1}$ se cumple $x < ${k}$, pero $x^2 = ${(k + 1) * (k + 1)}$, que no es menor que $${k * k}$. Elevar al cuadrado no respeta el orden con negativos.`,
      },
      {
        text: `La inecuación $x^2 < ${k * k}$ equivale a $x < ${k}$.`,
        ok: false,
        why: `$x^2 < ${k * k}$ equivale a $-${k} < x < ${k}$. Por ejemplo, $x = -${k + 2}$ cumple $x < ${k}$ pero no $x^2 < ${k * k}$.`,
      },
      {
        text: `La inecuación $|${minus("x", a)}| < -${c}$ no tiene solución.`,
        ok: true,
        why: "Un valor absoluto nunca es negativo, así que no puede ser menor que un número negativo.",
      },
      {
        text: `La inecuación $|${minus("x", a)}| > -${c}$ se cumple para todo número real.`,
        ok: true,
        why: "Un valor absoluto es mayor o igual que cero, y cero ya es mayor que cualquier negativo.",
      },
      {
        text: `La inecuación $\\dfrac{1}{x} < \\dfrac{1}{${k}}$ equivale a $x > ${k}$.`,
        ok: false,
        why: `Cualquier $x$ negativo la cumple, porque $\\frac{1}{x}$ es negativo. La solución es $(-\\infty, 0) \\cup (${k}, +\\infty)$.`,
      },
      {
        text: `Si $-${c}x > ${c * k}$, entonces $x < -${k}$.`,
        ok: true,
        why: `Al dividir entre $-${c}$ la desigualdad se voltea: $x < \\frac{${c * k}}{-${c}} = -${k}$.`,
      },
      {
        text: `$x^2 + ${c} > 0$ para todo $x$ real.`,
        ok: true,
        why: `$x^2 \\ge 0$ siempre, así que $x^2 + ${c} \\ge ${c} > 0$.`,
      },
      {
        text: `El conjunto solución de $(x - ${k})^2 > 0$ es $\\mathbb{R}$.`,
        ok: false,
        why: `En $x = ${k}$ el cuadrado vale $0$, que no es mayor que $0$. La solución es $\\mathbb{R} - \\{${k}\\}$.`,
      },
    ];
    const cl = r.pick(claims);
    return {
      statement: `${cl.text} ¿Verdadero o falso?`,
      parts: [trueFalse(cl.ok, cl.why)],
      hints: ["Antes de razonar en general, prueba con un número negativo y con el cero. Muchas afirmaciones falsas fallan ahí."],
      solution: [cl.why, `La afirmación es ${cl.ok ? "verdadera" : "falsa"}.`],
    };
  },
};

/* ------------------------- tablas de signos interactivas ------------------------- */

const toggleEq: Record<Op, Op> = { "<": "<=", "<=": "<", ">": ">=", ">=": ">" };

/** Signo de f en cada tramo que dejan los puntos críticos (ordenados). */
function rowSigns(pts: number[], f: (x: number) => number): (1 | -1)[] {
  const cuts = [-Infinity, ...pts, Infinity];
  const out: (1 | -1)[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i];
    const b = cuts[i + 1];
    const mid = !Number.isFinite(a) ? b - 1 : !Number.isFinite(b) ? a + 1 : (a + b) / 2;
    out.push(f(mid) > 0 ? 1 : -1);
  }
  return out;
}

const tablaProducto: ExerciseGen = {
  id: "tabla-signos-producto",
  title: "Llena la tabla de signos de un producto",
  level: 1,
  generate: (r) => {
    const op = r.pick(OPS);
    const p = r.int(-5, 3);
    const q = p + r.int(1, 5);
    const pts = [p, q];
    const factors: SignFactor[] = [{ root: p }, { root: q }];
    const ans = signSolve(factors, 1, op);
    const prod = prod2(p, q);
    return {
      statement: `Resuelve $${prod} ${opTex[op]} 0$ con una tabla de signos.`,
      sequential: true,
      parts: [
        {
          kind: "signs",
          prompt: "Las filas de los dos factores ya vienen llenas. Multiplica los signos de cada columna y llena la última fila.",
          points: pts.map(String),
          rows: [
            { label: minus("x", p), signs: rowSigns(pts, (x) => x - p) },
            { label: minus("x", q), signs: rowSigns(pts, (x) => x - q) },
            { label: prod, signs: rowSigns(pts, (x) => (x - p) * (x - q)) },
          ],
          given: [0, 1],
        },
        {
          kind: "interval",
          prompt: `Ahora lee la última fila. ¿Dónde se cumple $${prod} ${opTex[op]} 0$?`,
          answer: ans,
          mistakes: keep(ans, [
            { answer: signSolve(factors, 1, flipOp[op]), feedback: `Tomaste los tramos con el signo contrario. La desigualdad pide ${wantsPos(op) ? "positivo" : "negativo"}.` },
            { answer: signSolve(factors, 1, toggleEq[op]), feedback: isStrict(op) ? "Con $<$ o $>$ las raíces no entran, porque ahí el producto vale cero." : "Con $\\le$ o $\\ge$ las raíces sí entran, porque ahí el producto vale cero." },
          ]),
        },
      ],
      hints: [
        "En cada columna mira los dos signos de arriba: menos por menos da más, menos por más da menos.",
        `La desigualdad pide ${wantsPos(op) ? "los tramos con $+$" : "los tramos con $-$"}.`,
        isStrict(op) ? "Como es estricta, las raíces quedan afuera: paréntesis." : "Como lleva el signo igual, las raíces entran: corchete.",
      ],
      solution: [
        `Los puntos críticos son $${p}$ y $${q}$, donde se anula cada factor.`,
        `Multiplicando columna por columna: ${signSummary(factors, 1)}.`,
        pickRule(op),
        `Solución: $${unionTex(ans)}$.`,
      ],
    };
  },
};

const tablaTrinomio: ExerciseGen = {
  id: "tabla-signos-trinomio",
  title: "Tabla de signos de una cuadrática",
  level: 2,
  generate: (r) => {
    const op = r.pick(OPS);
    const p = r.int(-5, 3);
    const q = p + r.int(1, 5);
    const L = r.pick([1, 1, -1]);
    const pts = [p, q];
    const coefs = [L, -L * (p + q), L * p * q];
    const factors: SignFactor[] = [{ root: p }, { root: q }];
    const ans = signSolve(factors, L, op);
    const fact = `${L < 0 ? "-" : ""}${prod2(p, q)}`;
    const rows: { label: string; signs: (1 | -1)[] }[] = [];
    if (L < 0) rows.push({ label: "-1", signs: [-1, -1, -1] });
    rows.push(
      { label: minus("x", p), signs: rowSigns(pts, (x) => x - p) },
      { label: minus("x", q), signs: rowSigns(pts, (x) => x - q) },
      { label: fact, signs: rowSigns(pts, (x) => L * (x - p) * (x - q)) },
    );
    const ms = [{ answer: signSolve(factors, L, flipOp[op]), feedback: "Tomaste los tramos con el signo contrario." }];
    if (L < 0) ms.unshift({ answer: signSolve(factors, 1, op), feedback: "Te olvidaste del signo menos de adelante. Ese $-1$ voltea todos los signos de la última fila." });
    return {
      statement: `Resuelve $${poly(coefs)} ${opTex[op]} 0$.`,
      sequential: true,
      parts: [
        {
          kind: "signs",
          prompt: `Factorizado queda $${poly(coefs)} = ${fact}$. Completa la tabla de signos.`,
          points: pts.map(String),
          rows,
          given: [0],
        },
        { kind: "interval", prompt: "Escribe la solución como intervalo.", answer: ans, mistakes: keep(ans, ms) },
      ],
      hints: [
        `Un factor $x - a$ es negativo a la izquierda de $a$ y positivo a la derecha. Si te ayuda, prueba $x = ${p - 1}$, un número entre $${p}$ y $${q}$ y $x = ${q + 1}$.`,
        L < 0 ? "La fila del $-1$ es negativa siempre y voltea el signo del producto." : "La última fila es el producto de las filas de arriba.",
        `Quédate con los tramos ${wantsPos(op) ? "positivos" : "negativos"}.`,
      ],
      solution: [
        `Factorizamos: $${poly(coefs)} = ${fact}$. Los puntos críticos son $${p}$ y $${q}$.`,
        `Tabla de signos: ${signSummary(factors, L)}.`,
        pickRule(op),
        `Solución: $${unionTex(ans)}$.`,
      ],
    };
  },
};

const tablaRacional: ExerciseGen = {
  id: "tabla-signos-racional",
  title: "Tabla de signos de una fracción",
  level: 2,
  generate: (r) => {
    const op = r.pick(OPS);
    let p: number, q: number;
    do {
      p = r.int(-5, 5);
      q = r.int(-5, 5);
    } while (p === q);
    const reversed = p !== 0 && r.bool(0.35);
    const lead = reversed ? -1 : 1;
    const pts = [Math.min(p, q), Math.max(p, q)];
    const numTex = reversed ? `${p} - x` : minus("x", p);
    const denTex = minus("x", q);
    const fracTex = `\\dfrac{${numTex}}{${denTex}}`;
    const numF = (x: number) => (reversed ? p - x : x - p);
    const factors: SignFactor[] = [{ root: p }, { root: q, den: true }];
    const ans = signSolve(factors, lead, op);
    return {
      statement: `Resuelve $${fracTex} ${opTex[op]} 0$.`,
      sequential: true,
      parts: [
        {
          kind: "signs",
          prompt: "La fila del numerador ya viene llena. Completa la del denominador y la de la fracción.",
          points: pts.map(String),
          rows: [
            { label: numTex, signs: rowSigns(pts, numF) },
            { label: denTex, signs: rowSigns(pts, (x) => x - q) },
            { label: fracTex, signs: rowSigns(pts, (x) => numF(x) / (x - q)) },
          ],
          given: [0],
        },
        {
          kind: "interval",
          prompt: "Escribe la solución como intervalo.",
          answer: ans,
          mistakes: keep(ans, [
            { answer: signSolve([{ root: p }, { root: q }], lead, op), feedback: `El $${q}$ anula el denominador. Ahí la fracción no existe y nunca entra en la solución.` },
            { answer: signSolve(factors, lead, flipOp[op]), feedback: "Tomaste los tramos con el signo contrario." },
          ]),
        },
      ],
      hints: [
        "Para dividir se usa la misma ley de signos que para multiplicar.",
        reversed ? `Fíjate en el numerador $${numTex}$: es positivo a la izquierda de $${p}$ y negativo a la derecha.` : `El denominador $${denTex}$ es negativo a la izquierda de $${q}$ y positivo a la derecha.`,
        `El $${q}$ anula el denominador y nunca entra, aunque haya signo igual.`,
      ],
      solution: [
        `Puntos críticos: $x = ${p}$ anula el numerador y $x = ${q}$ anula el denominador.`,
        `Tabla de signos de la fracción: ${signSummary(factors, lead)}.`,
        pickRule(op, true),
        `Solución: $${unionTex(ans)}$.`,
      ],
    };
  },
};

const tablaRacionalParcial: ExerciseGen = {
  id: "tabla-signos-racional-completa",
  title: "Tabla de signos completa sin ayuda (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const op = r.pick(OPS);
    const [a, b, s] = r.sample([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5], 3);
    const [p, q] = [Math.min(a, b), Math.max(a, b)];
    const quadDen = r.bool(0.35);
    const reversed = !quadDen && s !== 0 && r.bool(0.35);
    const lead = reversed ? -1 : 1;
    const pts = [p, q, s].sort((x, y) => x - y);
    const quadTex = poly([1, -(p + q), p * q]);
    const linTex = reversed ? `${s} - x` : minus("x", s);
    const linF = (x: number) => (reversed ? s - x : x - s);
    const statement = quadDen ? `\\dfrac{${linTex}}{${quadTex}}` : `\\dfrac{${quadTex}}{${linTex}}`;
    const factored = quadDen ? `\\dfrac{${linTex}}{${prod2(p, q)}}` : `\\dfrac{${prod2(p, q)}}{${linTex}}`;
    const factors: SignFactor[] = quadDen
      ? [{ root: s }, { root: p, den: true }, { root: q, den: true }]
      : [{ root: p }, { root: q }, { root: s, den: true }];
    const ans = signSolve(factors, lead, op);
    const denRoots = quadDen ? [p, q] : [s];
    return {
      statement: `Resuelve $${statement} ${opTex[op]} 0$.`,
      sequential: true,
      parts: [
        {
          kind: "set",
          prompt: "Factoriza y halla los puntos críticos: las raíces del numerador y las del denominador.",
          before: "x \\in",
          answer: pts,
          mistakes: [{ answer: quadDen ? [s] : [p, q], feedback: "Faltan las raíces del denominador. También son puntos críticos, porque ahí la fracción puede cambiar de signo." }],
        },
        {
          kind: "signs",
          prompt: `Como la fracción es $${factored}$, completa la tabla.`,
          points: pts.map(String),
          rows: [
            { label: minus("x", p), signs: rowSigns(pts, (x) => x - p) },
            { label: minus("x", q), signs: rowSigns(pts, (x) => x - q) },
            { label: linTex, signs: rowSigns(pts, linF) },
            { label: factored, signs: rowSigns(pts, (x) => (quadDen ? linF(x) / ((x - p) * (x - q)) : ((x - p) * (x - q)) / linF(x))) },
          ],
        },
        {
          kind: "interval",
          prompt: "Escribe la solución como intervalo.",
          answer: ans,
          mistakes: keep(ans, [
            { answer: signSolve(factors.map((f) => ({ root: f.root })), lead, op), feedback: `Incluiste ${denRoots.length > 1 ? `$${denRoots[0]}$ y $${denRoots[1]}$` : `$${denRoots[0]}$`}, que anula${denRoots.length > 1 ? "n" : ""} el denominador. Esos puntos nunca entran.` },
            { answer: signSolve(factors, -lead, op), feedback: reversed ? `Revisa la fila de $${linTex}$: es positiva a la izquierda de $${s}$ y negativa a la derecha.` : "Los signos de la última fila quedaron al revés. Revisa la multiplicación columna por columna." },
            { answer: signSolve(factors, lead, flipOp[op]), feedback: "Tomaste los tramos con el signo contrario." },
          ]),
        },
      ],
      hints: [
        `Factoriza el trinomio $${quadTex}$: busca dos números que multiplicados den $${p * q}$ y sumados den $${-(p + q)}$.`,
        "Hay tres puntos críticos y cuatro tramos. En cada tramo prueba un número y cuenta cuántos factores salen negativos.",
        `Las raíces del denominador (${denRoots.map((x) => `$${x}$`).join(" y ")}) nunca entran en la solución.`,
      ],
      solution: [
        `Factorizamos: $${quadTex} = ${prod2(p, q)}$. La fracción queda $${factored}$.`,
        `Puntos críticos: $${pts.join(", ")}$. ${denRoots.length > 1 ? `$${denRoots[0]}$ y $${denRoots[1]}$ anulan` : `$${denRoots[0]}$ anula`} el denominador.`,
        reversed ? `Ojo: $${linTex}$ es positivo a la izquierda de $${s}$ y negativo a la derecha.` : "Cada factor lineal es negativo a la izquierda de su raíz y positivo a la derecha.",
        `Tabla de signos: ${signSummary(factors, lead)}.`,
        pickRule(op, true),
        `Solución: $${unionTex(ans)}$.`,
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("inecuaciones"),
  objectives: [
    "Usar las propiedades de las desigualdades, en especial voltear el signo al multiplicar o dividir por un negativo.",
    "Resolver inecuaciones lineales, dobles, cuadráticas, polinómicas y racionales con tabla de signos.",
    "Resolver desigualdades con valor absoluto leyéndolas como distancias.",
    "Escribir la solución como intervalo y usarla para hallar el dominio de una función.",
  ],
  sections: [
    {
      id: "propiedades",
      title: "Qué es una desigualdad",
      blocks: [
        {
          type: "text",
          md: "Una ecuación pregunta para qué valores dos cosas son iguales. Una inecuación pregunta para qué valores una es mayor o menor que la otra. Por eso la respuesta casi nunca es un número suelto. Es un tramo entero de la recta, un intervalo.\n\nHay cuatro símbolos: $<$ (menor que), $>$ (mayor que), $\\le$ (menor o igual) y $\\ge$ (mayor o igual). En la recta numérica el menor es siempre el que está más a la izquierda. Así $-5 < -2$, aunque 5 parezca más grande que 2.",
        },
        {
          type: "definition",
          title: "Propiedades de las desigualdades",
          md: "Si $a < b$ y $c$ es un número real:\n\n- $a + c < b + c$. Sumar o restar lo mismo en ambos lados no cambia nada.\n- Si $c > 0$, entonces $ac < bc$. Multiplicar o dividir por un positivo tampoco cambia nada.\n- Si $c < 0$, entonces $ac > bc$. **Multiplicar o dividir por un negativo voltea el sentido de la desigualdad.**\n\nLo mismo vale para $>$, $\\le$ y $\\ge$.",
        },
        {
          type: "text",
          md: "La tercera regla se entiende con un ejemplo. Sabemos que $2 < 5$. Si multiplicamos los dos por $-1$ quedan $-2$ y $-5$, y en la recta el $-2$ está a la derecha del $-5$. Es decir, $-2 > -5$. Multiplicar por un negativo refleja la recta como un espejo, y el orden se invierte.",
        },
        {
          type: "table",
          headers: ["En ambos lados", "¿Se voltea?", "Desde $x < 3$"],
          rows: [
            ["Sumar o restar", "No", "$x + 2 < 5$"],
            ["Multiplicar o dividir por un positivo", "No", "$4x < 12$"],
            ["Multiplicar o dividir por un negativo", "Sí", "$-2x > -6$"],
          ],
        },
        {
          type: "example",
          title: "Despejar con un coeficiente negativo",
          problem: "Resuelve $-3x < 12$.",
          steps: [
            "Para dejar sola a la $x$ hay que dividir entre $-3$.",
            "Como $-3$ es negativo, el $<$ se convierte en $>$: $x > \\dfrac{12}{-3}$.",
            "Queda $x > -4$. Comprobamos con $x = 0$, que está en la solución: $-3 \\cdot 0 = 0 < 12$. Se cumple.",
          ],
          answer: "$x > -4$, es decir, $(-4, +\\infty)$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "El error que más puntos cuesta",
          md: "Olvidar voltear la desigualdad al multiplicar o dividir por un negativo. Si tienes dudas, toma un número de tu resultado y pruébalo en la desigualdad original. Si no la cumple, algo se volteó mal.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Si $-2x < 6$, entonces $x < -3$. ¿Verdadero o falso?",
            parts: [trueFalse(false, "Al dividir entre $-2$ la desigualdad se voltea. Lo correcto es $x > -3$.")],
            solution: ["Dividimos entre $-2$, que es negativo, y el signo se voltea: $x > -3$."],
          },
        },
      ],
    },
    {
      id: "lineales",
      title: "Inecuaciones lineales",
      blocks: [
        {
          type: "text",
          md: "Una inecuación es lineal cuando la $x$ aparece solo elevada a la uno, como en $2x - 3 > 7$. Se resuelve igual que una ecuación lineal, con un solo cuidado extra: si en algún paso multiplicas o divides por un negativo, volteas el signo.\n\nAl final la solución se escribe como intervalo. Paréntesis si el extremo no entra, corchete si entra, y el infinito siempre con paréntesis.",
        },
        {
          type: "example",
          title: "Con la x en ambos lados",
          problem: "Resuelve $4x - 7 \\le 2x + 5$.",
          steps: [
            "Restamos $2x$ en ambos lados para juntar las $x$: $2x - 7 \\le 5$.",
            "Sumamos $7$: $2x \\le 12$.",
            "Dividimos entre $2$, que es positivo, así que el signo no cambia: $x \\le 6$.",
          ],
          answer: "$(-\\infty, 6]$",
        },
        { type: "widget", widget: { kind: "numberline", set: [iv(-Infinity, 6, false, true)], range: [-2, 10], label: "(-∞, 6]" }, caption: "Todos los números menores o iguales que 6. El 6 entra, por eso el punto va relleno." },
        {
          type: "example",
          title: "Cuando toca voltear",
          problem: "Resuelve $5 - 3x > 11$.",
          steps: [
            "Restamos $5$ en ambos lados: $-3x > 6$.",
            "Dividimos entre $-3$. Es negativo, así que el $>$ pasa a ser $<$: $x < -2$.",
            "Comprobamos con $x = -3$: $5 - 3(-3) = 14 > 11$. Se cumple.",
          ],
          answer: "$(-\\infty, -2)$",
        },
        {
          type: "note",
          tone: "econ",
          title: "¿Cuántas unidades hay que vender para ganar?",
          md: "Una empresa vende cada unidad a 25 dólares, cada unidad le cuesta 15 y tiene un costo fijo de 2000 (números de ejemplo). Gana dinero cuando el ingreso supera al costo:\n\n$$25q > 2000 + 15q$$\n\nRestando $15q$ queda $10q > 2000$, es decir, $q > 200$. Con más de 200 unidades vendidas la utilidad es positiva.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Resuelve $5 - 3x \\ge 11$.",
            parts: [{ kind: "interval", answer: [iv(-Infinity, -2, false, true)], mistakes: [{ answer: [iv(-2, Infinity, true, false)], feedback: "Al dividir entre $-3$ hay que voltear la desigualdad." }] }],
            solution: ["$-3x \\ge 6$. Al dividir entre $-3$ se voltea: $x \\le -2$. Solución: $(-\\infty, -2]$."],
          },
        },
      ],
    },
    {
      id: "dobles",
      title: "Inecuaciones dobles",
      blocks: [
        {
          type: "text",
          md: "A veces la expresión está atrapada entre dos números, como en $-3 \\le 2x + 1 < 7$. Son dos desigualdades a la vez y se resuelven juntas. Lo que hagas en el centro lo haces también en los dos extremos.",
        },
        {
          type: "example",
          title: "Doble desigualdad",
          problem: "Resuelve $-3 \\le 2x + 1 < 7$.",
          steps: [
            "Restamos $1$ en las tres partes: $-4 \\le 2x < 6$.",
            "Dividimos las tres partes entre $2$: $-2 \\le x < 3$.",
          ],
          answer: "$[-2, 3)$",
        },
        {
          type: "example",
          title: "Doble desigualdad con un negativo",
          problem: "Resuelve $-1 < 3 - 2x \\le 5$.",
          steps: [
            "Restamos $3$ en las tres partes: $-4 < -2x \\le 2$.",
            "Dividimos entre $-2$ y se voltean **las dos** desigualdades: $2 > x \\ge -1$.",
            "Lo leemos de menor a mayor: $-1 \\le x < 2$.",
          ],
          answer: "$[-1, 2)$",
        },
        {
          type: "note",
          tone: "warning",
          title: "Escribe siempre de menor a mayor",
          md: "Después de voltear queda algo como $2 > x \\ge -1$. Es correcto, pero para pasarlo a intervalo léelo desde el número menor: $-1 \\le x < 2$. Cada extremo conserva su símbolo. Una escritura como $5 < x < 2$ no tiene sentido, porque ningún número es mayor que 5 y menor que 2 a la vez.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Resuelve $-4 < 2x - 2 \\le 6$.",
            parts: [{ kind: "interval", answer: [iv(-1, 4, false, true)] }],
            solution: ["Sumamos 2: $-2 < 2x \\le 8$. Dividimos entre 2: $-1 < x \\le 4$. Solución: $(-1, 4]$."],
          },
        },
      ],
    },
    {
      id: "cuadraticas",
      title: "Cuadráticas y polinómicas: la tabla de signos",
      blocks: [
        {
          type: "text",
          md: "Con $x^2$ ya no se puede despejar como antes. La idea nueva es comparar con cero y estudiar el signo.\n\nUn producto es positivo cuando tiene una cantidad par de factores negativos y negativo cuando la cantidad es impar. Además, un factor como $x - 3$ solo cambia de signo en su raíz, $x = 3$. Entonces basta ubicar las raíces de los factores para saber el signo del producto en cada tramo de la recta.",
        },
        {
          type: "definition",
          title: "Método de la tabla de signos",
          md: "- Pasa todo a un lado para comparar con cero.\n- Factoriza.\n- Marca en la recta las raíces de cada factor. Esos puntos dividen la recta en tramos.\n- En cada tramo, decide el signo de cada factor probando un número cualquiera del tramo, y multiplica los signos.\n- Quédate con los tramos que pide la desigualdad. Con $\\le$ o $\\ge$ las raíces también entran.",
        },
        {
          type: "example",
          title: "Una cuadrática",
          problem: "Resuelve $x^2 - x - 6 > 0$.",
          steps: [
            "Factorizamos: dos números que multiplicados den $-6$ y sumados $-1$ son $-3$ y $2$. Queda $(x - 3)(x + 2) > 0$.",
            "Las raíces son $x = -2$ y $x = 3$. Dividen la recta en tres tramos.",
            "La tabla de abajo muestra el signo en cada tramo. Queremos el producto positivo.",
            "Las raíces no entran porque la desigualdad es estricta.",
          ],
          answer: "$(-\\infty, -2) \\cup (3, +\\infty)$",
        },
        {
          type: "table",
          headers: ["", "$(-\\infty, -2)$", "$(-2, 3)$", "$(3, +\\infty)$"],
          rows: [
            ["$x + 2$", "$-$", "$+$", "$+$"],
            ["$x - 3$", "$-$", "$-$", "$+$"],
            ["$(x - 3)(x + 2)$", "$+$", "$-$", "$+$"],
          ],
          caption: "Para llenar cada columna basta probar un número del tramo, por ejemplo $-5$, $0$ y $5$.",
        },
        {
          type: "graph",
          spec: {
            x: [-5, 6],
            y: [-8, 8],
            height: 280,
            curves: [{ fn: "x^2-x-6", color: "accent" }],
            points: [{ x: -2, y: 0, open: true }, { x: 3, y: 0, open: true, label: "3" }],
          },
          caption: "La parábola $y = x^2 - x - 6$ está por encima del eje $x$ a la izquierda de $-2$ y a la derecha de $3$. La tabla de signos dice lo mismo sin dibujar.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Resuelve $(x + 1)(x - 2) \\ge 0$ llenando tú la tabla.",
            sequential: true,
            parts: [
              {
                kind: "signs",
                prompt: "La fila de $x + 1$ ya está llena. Toca las casillas que faltan.",
                points: ["-1", "2"],
                rows: [
                  { label: "x + 1", signs: [-1, 1, 1] },
                  { label: "x - 2", signs: [-1, -1, 1] },
                  { label: "(x + 1)(x - 2)", signs: [1, -1, 1] },
                ],
                given: [0],
              },
              {
                kind: "interval",
                prompt: "¿Dónde es $(x + 1)(x - 2) \\ge 0$?",
                answer: [iv(-Infinity, -1, false, true), iv(2, Infinity, true, false)],
                mistakes: [
                  { answer: [iv(-1, 2, true, true)], feedback: "Ese es el tramo negativo. Se pide positivo o cero." },
                  { answer: [iv(-Infinity, -1), iv(2, Infinity)], feedback: "Con $\\ge$ las raíces entran, porque ahí el producto vale cero." },
                ],
              },
            ],
            hints: ["$x - 2$ es negativo a la izquierda de $2$ y positivo a la derecha."],
            solution: [
              "$x - 2$ es negativo en los dos primeros tramos y positivo en el último.",
              "El producto es $+$, $-$, $+$. Tomamos los tramos positivos y las raíces: $(-\\infty, -1] \\cup [2, +\\infty)$.",
            ],
          },
        },
        {
          type: "note",
          tone: "warning",
          title: "$x^2 < 9$ no es $x < \\pm 3$",
          md: "Sacar raíz en ambos lados es una trampa. Escribe $x^2 - 9 < 0$, factoriza $(x - 3)(x + 3) < 0$ y usa la tabla: la solución es $-3 < x < 3$. En cambio $x^2 > 9$ da $x < -3$ o $x > 3$.",
        },
        {
          type: "note",
          tone: "tip",
          title: "Cuando no hay raíces reales",
          md: "Si el discriminante $b^2 - 4ac$ es negativo, la parábola no corta el eje $x$ y tiene siempre el mismo signo. Por ejemplo, $x^2 + 2x + 5 > 0$ se cumple para todo $x$ real, y $x^2 + 2x + 5 < 0$ no tiene solución.",
        },
        {
          type: "example",
          title: "Un polinomio ya factorizado",
          problem: "Resuelve $x(x - 2)(x + 3) \\le 0$.",
          steps: [
            "Las raíces son $-3$, $0$ y $2$. Hay cuatro tramos.",
            "En $(-\\infty, -3)$ los tres factores son negativos: producto negativo. En $(-3, 0)$ hay dos negativos: positivo. En $(0, 2)$ hay uno negativo: negativo. En $(2, +\\infty)$ todos positivos: positivo.",
            "Queremos negativo o cero, así que tomamos los tramos negativos y agregamos las raíces.",
          ],
          answer: "$(-\\infty, -3] \\cup [0, 2]$",
        },
        {
          type: "note",
          tone: "idea",
          title: "Factores al cuadrado",
          md: "Un factor como $(x - 1)^2$ nunca es negativo. No cambia el signo al pasar por $x = 1$, solo se anula ahí. Por eso en $(x - 1)^2(x + 2) > 0$ la solución es $(-2, 1) \\cup (1, +\\infty)$. El $1$ se excluye porque ahí el producto vale cero.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Resuelve $x^2 - 4x < 0$.",
            parts: [{ kind: "interval", answer: [iv(0, 4)], mistakes: [{ answer: [iv(-Infinity, 0), iv(4, Infinity)], feedback: "Esos son los tramos donde el producto es positivo. Se pide negativo." }] }],
            solution: ["Factorizamos: $x(x - 4) < 0$. Raíces $0$ y $4$. El producto es negativo entre las raíces. Solución: $(0, 4)$."],
          },
        },
      ],
    },
    {
      id: "racionales",
      title: "Inecuaciones racionales",
      blocks: [
        {
          type: "text",
          md: "Cuando la $x$ aparece en un denominador, la tentación es multiplicar todo por ese denominador para quitarlo. No lo hagas. El denominador puede ser positivo para unos $x$ y negativo para otros, y no sabes si toca voltear la desigualdad o no.",
        },
        {
          type: "definition",
          title: "Método para inecuaciones racionales",
          md: "- Pasa todo a un lado y compara con cero.\n- Saca común denominador para que quede una sola fracción.\n- Factoriza numerador y denominador.\n- Haz la tabla de signos con las raíces de los dos. La división sigue la misma ley de signos que la multiplicación.\n- Las raíces del denominador **nunca** entran en la solución, aunque la desigualdad sea $\\le$ o $\\ge$, porque ahí la fracción no existe.",
        },
        {
          type: "example",
          title: "Fracción comparada con cero",
          problem: "Resuelve $\\dfrac{x - 1}{x + 3} \\ge 0$.",
          steps: [
            "Puntos críticos: $x = 1$ anula el numerador y $x = -3$ anula el denominador.",
            "En $(-\\infty, -3)$: negativo entre negativo, positivo. En $(-3, 1)$: negativo entre positivo, negativo. En $(1, +\\infty)$: positivo.",
            "Queremos positivo o cero. El $1$ entra porque hace cero la fracción. El $-3$ no entra porque anula el denominador.",
          ],
          answer: "$(-\\infty, -3) \\cup [1, +\\infty)$",
        },
        {
          type: "example",
          title: "Fracción comparada con un número",
          problem: "Resuelve $\\dfrac{2x + 1}{x - 1} < 1$.",
          steps: [
            "Restamos $1$: $\\dfrac{2x + 1}{x - 1} - 1 < 0$.",
            "Común denominador: $\\dfrac{2x + 1 - (x - 1)}{x - 1} < 0$, que queda $\\dfrac{x + 2}{x - 1} < 0$.",
            "Puntos críticos $-2$ y $1$. La fracción es negativa entre ellos.",
          ],
          answer: "$(-2, 1)$",
        },
        {
          type: "note",
          tone: "warning",
          title: "Por qué no se multiplica por el denominador",
          md: "Si en $\\dfrac{2x + 1}{x - 1} < 1$ multiplicas por $x - 1$ sin pensar, llegas a $2x + 1 < x - 1$, o sea $x < -2$. Pero $x = 0$ cumple la inecuación original, porque da $-1 < 1$, y no está en $x < -2$. Se perdió la solución entera porque para $x < 1$ el denominador es negativo y había que voltear.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Resuelve $\\dfrac{x + 1}{x - 2} \\le 0$.",
            parts: [{ kind: "interval", answer: [iv(-1, 2, true, false)], mistakes: [{ answer: [iv(-1, 2, true, true)], feedback: "El $2$ anula el denominador y no puede entrar." }] }],
            solution: ["Puntos críticos $-1$ (numerador) y $2$ (denominador). La fracción es negativa entre ellos. El $-1$ entra y el $2$ no. Solución: $[-1, 2)$."],
          },
        },
      ],
    },
    {
      id: "valor-absoluto",
      title: "Desigualdades con valor absoluto",
      blocks: [
        {
          type: "text",
          md: "El valor absoluto $|x|$ es la distancia de $x$ al cero, así que nunca es negativo: $|5| = 5$ y $|-5| = 5$. Más en general, $|x - a|$ es la distancia entre $x$ y $a$ sobre la recta. Con esa lectura estas inecuaciones se resuelven casi sin cuentas.",
        },
        {
          type: "definition",
          title: "Las dos reglas",
          md: "Si $r > 0$:\n\n$$|x - a| < r \\Leftrightarrow a - r < x < a + r$$\n\n$$|x - a| > r \\Leftrightarrow x < a - r \\text{ o } x > a + r$$\n\nLa primera dice \"a menos de $r$ de $a$\" y da un intervalo centrado en $a$. La segunda dice \"a más de $r$ de $a$\" y da los dos lados de afuera. Con $\\le$ y $\\ge$ los extremos entran.",
        },
        {
          type: "example",
          title: "Menor que: un solo tramo",
          problem: "Resuelve $|x - 3| < 2$.",
          steps: [
            "Buscamos los números que están a menos de 2 unidades del 3.",
            "Eso es $3 - 2 < x < 3 + 2$, es decir, $1 < x < 5$.",
          ],
          answer: "$(1, 5)$",
        },
        {
          type: "example",
          title: "Mayor que: dos tramos",
          problem: "Resuelve $|2x + 1| \\ge 5$.",
          steps: [
            "Se parte en dos casos: $2x + 1 \\le -5$ o $2x + 1 \\ge 5$.",
            "El primero da $2x \\le -6$, o sea $x \\le -3$. El segundo da $2x \\ge 4$, o sea $x \\ge 2$.",
          ],
          answer: "$(-\\infty, -3] \\cup [2, +\\infty)$",
        },
        { type: "widget", widget: { kind: "numberline", set: [iv(-Infinity, -3, false, true), iv(2, Infinity, true, false)], range: [-7, 6], label: "|2x + 1| ≥ 5" }, caption: "La solución son los dos lados de afuera, con los extremos incluidos." },
        {
          type: "note",
          tone: "warning",
          title: "Ojo con el signo de adentro y con los negativos",
          md: "$|x + 4|$ es $|x - (-4)|$, la distancia a $-4$, no a $4$.\n\nSi el lado derecho es negativo, piensa antes de calcular. $|x - 1| < -2$ no tiene solución, porque una distancia no es negativa. Y $|x - 1| > -2$ se cumple para todo $x$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Resuelve $|x + 1| \\ge 3$.",
            parts: [{ kind: "interval", answer: [iv(-Infinity, -4, false, true), iv(2, Infinity, true, false)], mistakes: [{ answer: [iv(-4, 2, true, true)], feedback: "Eso es $|x + 1| \\le 3$. \"Mayor o igual\" pide los dos lados de afuera." }] }],
            solution: ["$|x + 1|$ es la distancia a $-1$. Queremos distancia 3 o más: $x \\le -4$ o $x \\ge 2$."],
          },
        },
      ],
    },
    {
      id: "dominios",
      title: "Para qué sirven: hallar dominios",
      blocks: [
        {
          type: "text",
          md: "En Matemática I vas a usar las inecuaciones sobre todo para encontrar el dominio de una función, es decir, los valores de $x$ donde la fórmula tiene sentido. Tres reglas cubren casi todos los casos:\n\n- Una raíz cuadrada (o de índice par) necesita que lo de adentro sea mayor o igual que cero.\n- Un denominador no puede valer cero.\n- Un logaritmo necesita que lo de adentro sea estrictamente positivo.\n\nCada regla se convierte en una inecuación. El dominio es su solución, o la intersección de las soluciones si hay varias condiciones.",
        },
        {
          type: "example",
          title: "Raíz de una cuadrática",
          problem: "Halla el dominio de $f(x) = \\sqrt{x^2 - 4}$.",
          steps: [
            "La raíz pide $x^2 - 4 \\ge 0$.",
            "Factorizamos: $(x - 2)(x + 2) \\ge 0$. Raíces $-2$ y $2$.",
            "El producto es positivo afuera de las raíces, y las raíces entran por el signo igual.",
          ],
          answer: "$\\operatorname{Dom} f = (-\\infty, -2] \\cup [2, +\\infty)$",
        },
        {
          type: "example",
          title: "Raíz y denominador a la vez",
          problem: "Halla el dominio de $g(x) = \\dfrac{\\sqrt{x + 1}}{x - 3}$.",
          steps: [
            "La raíz pide $x + 1 \\ge 0$, es decir, $x \\ge -1$.",
            "El denominador pide $x \\ne 3$.",
            "Las dos condiciones a la vez: desde $-1$ en adelante, sin el $3$.",
          ],
          answer: "$\\operatorname{Dom} g = [-1, 3) \\cup (3, +\\infty)$",
        },
        {
          type: "note",
          tone: "tip",
          title: "Así viene en los parciales",
          md: "En los parciales de la cátedra aparecen dominios como el de $\\dfrac{\\sqrt{|x| - 5}}{|2x + 1| - 11}$. Se arma por partes. La raíz pide $|x| \\ge 5$, o sea $x \\le -5$ o $x \\ge 5$. El denominador se anula cuando $|2x + 1| = 11$, es decir, en $x = 5$ y en $x = -6$. Quitando esos dos puntos:\n\n$$(-\\infty, -6) \\cup (-6, -5] \\cup (5, +\\infty)$$",
        },
        {
          type: "quick",
          exercise: {
            statement: "Halla el dominio de $f(x) = \\sqrt{6 - 2x}$.",
            parts: [{ kind: "interval", before: "\\operatorname{Dom} f =", answer: [iv(-Infinity, 3, false, true)], mistakes: [{ answer: [iv(3, Infinity, true, false)], feedback: "Al dividir entre $-2$ la desigualdad se voltea." }] }],
            solution: ["La raíz pide $6 - 2x \\ge 0$, o sea $-2x \\ge -6$. Al dividir entre $-2$ se voltea: $x \\le 3$. Dominio: $(-\\infty, 3]$."],
          },
        },
      ],
    },
  ],
  exercises: [
    propiedades,
    lineal,
    linealNegativo,
    linealAmbos,
    absBasico,
    doble,
    tablaProducto,
    cuadratica,
    tablaTrinomio,
    polinomica,
    racionalSimple,
    tablaRacional,
    absLineal,
    racionalK,
    tablaRacionalParcial,
    dominio,
    dominioAbs,
    vf,
  ],
};

export default topic;
