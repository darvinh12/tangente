import { meta } from "../catalog";
import { trueFalse } from "../helpers";
import type { ExerciseGen, Mistake, Topic } from "../types";
import { coef, fmt, frac, poly, terms } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

function dpoly(c: number[]): number[] {
  const deg = c.length - 1;
  return c.slice(0, -1).map((k, i) => k * (deg - i));
}

function evalPoly(c: number[], x: number): number {
  return c.reduce((acc, k) => acc * x + k, 0);
}

function fact(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/** Notación de la derivada de orden n: f'', f''', f^{(4)}. */
function dName(n: number, f = "f"): string {
  if (n <= 3) return `${f}${"'".repeat(n)}`;
  return `${f}^{(${n})}`;
}

/** Número con paréntesis si es negativo. */
function p(n: number): string {
  return n < 0 ? `(${n})` : String(n);
}

/** "x + c" con signo limpio. */
function xPlus(c: number, v = "x"): string {
  return c === 0 ? v : c > 0 ? `${v} + ${c}` : `${v} - ${-c}`;
}

/** Recta y = mx + b con texto limpio. */
function lineTex(m: string, b: string): string {
  const mPart = m === "0" ? "" : m === "1" ? "x" : m === "-1" ? "-x" : `${m}x`;
  if (!mPart) return b;
  if (b === "0") return mPart;
  return b.startsWith("-") ? `${mPart} - ${b.slice(1)}` : `${mPart} + ${b}`;
}

/* ----------------------------------- ejercicios ----------------------------------- */

const segundaPolinomio: ExerciseGen = {
  id: "segunda-polinomio",
  title: "Segunda derivada de un polinomio",
  level: 1,
  generate: (r) => {
    let c: number[];
    do c = [r.nz(-3, 3), r.int(-5, 5), r.int(-6, 6), r.int(-6, 6), r.int(-9, 9)];
    while (c.filter((x) => x !== 0).length < 4);
    const d1 = dpoly(c);
    const d2 = dpoly(d1);
    return {
      statement: `Calcula la segunda derivada de $f(x) = ${poly(c)}$.`,
      parts: [
        {
          kind: "expr",
          before: "f''(x) =",
          answer: poly(d2),
          vars: ["x"],
          mistakes: [{ answer: poly(d1), feedback: "Esa es la primera derivada. La segunda se obtiene derivando otra vez." }],
        },
      ],
      hints: ["Deriva una vez para obtener $f'(x)$.", "Deriva $f'(x)$ otra vez, término a término."],
      solution: [`$f'(x) = ${poly(d1)}$.`, `$f''(x) = ${poly(d2)}$.`],
    };
  },
};

const segundaEnPunto: ExerciseGen = {
  id: "segunda-en-punto",
  title: "Segunda derivada en un punto",
  level: 1,
  generate: (r) => {
    const kind = r.pick(["exp", "pot", "ln", "inv", "sqrt"] as const);
    let fTex: string, a: number, d1: string, d2: string, val: string, fp: string;
    if (kind === "exp") {
      const k = r.nz(-3, 3, [1]);
      fTex = `e^{${coef(k, "x")}}`;
      a = 0;
      d1 = coef(k, fTex);
      d2 = `${k * k}${fTex}`;
      val = String(k * k);
      fp = String(k);
    } else if (kind === "pot") {
      const n = r.int(3, 5);
      a = r.nz(-2, 2);
      fTex = `x^{${n}}`;
      d1 = `${n}x^{${n - 1}}`;
      d2 = `${n * (n - 1)}${n - 2 === 1 ? "x" : `x^{${n - 2}}`}`;
      val = String(n * (n - 1) * a ** (n - 2));
      fp = String(n * a ** (n - 1));
    } else if (kind === "ln") {
      a = r.int(1, 5);
      fTex = "\\ln x";
      d1 = "\\frac{1}{x}";
      d2 = "-\\frac{1}{x^{2}}";
      val = frac(-1, a * a);
      fp = frac(1, a);
    } else if (kind === "inv") {
      a = r.nz(-3, 3);
      fTex = "\\frac{1}{x}";
      d1 = "-\\frac{1}{x^{2}}";
      d2 = "\\frac{2}{x^{3}}";
      val = frac(2, a ** 3);
      fp = frac(-1, a * a);
    } else {
      const k = r.int(1, 3);
      a = k * k;
      fTex = "\\sqrt{x}";
      d1 = "\\frac{1}{2}x^{-\\frac{1}{2}}";
      d2 = "-\\frac{1}{4}x^{-\\frac{3}{2}}";
      val = frac(-1, 4 * k ** 3);
      fp = frac(1, 2 * k);
    }
    const mistakes: Mistake[] = fp !== val ? [{ answer: fp, feedback: "Ese es $f'(" + a + ")$. Te faltó derivar una vez más." }] : [];
    return {
      statement: `Sea $f(x) = ${fTex}$. Calcula $f''(${a})$.`,
      parts: [{ kind: "expr", before: `f''(${a}) =`, answer: val, mistakes }],
      hints: ["Deriva dos veces y después sustituye.", "No sustituyas el número antes de terminar de derivar: la derivada de una constante es cero."],
      solution: [`$f'(x) = ${d1}$.`, `$f''(x) = ${d2}$.`, `$f''(${a}) = ${val}$.`],
    };
  },
};

const PITAG: [number, number][] = [[3, 4], [4, 3], [6, 8], [8, 6], [5, 12], [12, 5], [0, 5], [1, 2]];

const implicitaCirculo: ExerciseGen = {
  id: "implicita-circulo",
  title: "Derivada implícita en una circunferencia",
  level: 1,
  generate: (r) => {
    let [a, b] = r.pick(PITAG.slice(0, 6));
    a *= r.sign();
    b *= r.sign();
    const R2 = a * a + b * b;
    return {
      statement: `La circunferencia $x^{2} + y^{2} = ${R2}$ pasa por el punto $(${a}, ${b})$. Calcula $y'$ en ese punto.`,
      parts: [
        {
          kind: "expr",
          before: "y' =",
          answer: frac(-a, b),
          mistakes: [
            { answer: frac(a, b), feedback: "Revisa el signo al despejar: $2x + 2yy' = 0$ da $y' = -\\frac{x}{y}$." },
            ...(Math.abs(a) !== Math.abs(b) ? [{ answer: frac(-b, a), feedback: "Invertiste la fracción. Es $-\\frac{x}{y}$, no $-\\frac{y}{x}$." }] : []),
          ],
        },
      ],
      hints: ["Deriva los dos lados respecto a $x$. Como $y$ depende de $x$, $(y^{2})' = 2y\\,y'$.", "Despeja $y'$ y sustituye las coordenadas del punto."],
      solution: [
        `Derivando: $2x + 2y\\,y' = 0$.`,
        "Despejando: $y' = -\\dfrac{x}{y}$.",
        `En $(${a}, ${b})$: $y' = -\\dfrac{${a}}{${b}} = ${frac(-a, b)}$.`,
      ],
    };
  },
};

const vfTecnicas: ExerciseGen = {
  id: "vf-tecnicas",
  title: "Conceptos de derivadas sucesivas, logarítmica e implícita",
  level: 1,
  generate: (r) => {
    const n = r.int(3, 6);
    const k = r.int(2, 5);
    const items: [string, boolean, string][] = [
      ["$(x^{x})' = x\\cdot x^{x-1}$", false, "La regla de la potencia necesita exponente constante. Con derivación logarítmica sale $(x^{x})' = x^{x}(\\ln x + 1)$."],
      ["Si $y$ depende de $x$, entonces $(y^{2})' = 2y'$", false, "Falta la cadena completa: $(y^{2})' = 2y\\,y'$."],
      [`La derivada de orden ${n} de $e^{x}$ es $e^{x}$`, true, "Cada vez que derivas $e^{x}$ obtienes $e^{x}$ otra vez."],
      [`La derivada de orden ${k + 1} de un polinomio de grado ${k} es $0$`, true, `Cada derivada baja el grado en uno. Después de ${k} derivadas queda una constante, y la siguiente es $0$.`],
      ["Si $y$ depende de $x$, entonces $(\\ln y)' = \\dfrac{y'}{y}$", true, "Es la regla de la cadena aplicada al logaritmo."],
      ["$(x^{x})' = x^{x}\\ln x$", false, "Esa sería la regla exponencial, que necesita base constante. Lo correcto es $x^{x}(\\ln x + 1)$."],
      ["Si $y$ depende de $x$, entonces $(xy)' = y + x\\,y'$", true, "Es la regla del producto con $u = x$ y $v = y$."],
      [`$\\left(e^{${k}x}\\right)^{(${n})} = ${k}^{${n}}e^{${k}x}$`, true, `Cada derivada saca un factor $${k}$. Tras ${n} derivadas son $${k}^{${n}}$.`],
    ];
    const [claim, isTrue, why] = r.pick(items);
    return {
      statement: `¿Verdadero o falso? ${claim}.`,
      parts: [trueFalse(isTrue, why)],
      hints: ["Haz la cuenta tú mismo con la regla correspondiente y compara."],
      solution: [`${isTrue ? "Verdadero" : "Falso"}. ${why}`],
    };
  },
};

const nEsima: ExerciseGen = {
  id: "n-esima",
  title: "Derivadas de orden superior",
  level: 2,
  generate: (r) => {
    const n = r.int(3, 5);
    const kind = r.pick(["exp", "inv", "ln", "invc", "pot"] as const);
    let fTex: string, ans: string, wrong: string | null, steps: string[], dom: [number, number] = [0.5, 3];
    const sgn = n % 2 === 0 ? 1 : -1;
    if (kind === "exp") {
      const k = r.pick([2, 3, -1, -2]);
      fTex = `e^{${coef(k, "x")}}`;
      ans = `${k ** n}e^{${coef(k, "x")}}`;
      wrong = k < 0 ? `${-(k ** n)}e^{${coef(k, "x")}}` : `${k * n}e^{${coef(k, "x")}}`;
      steps = [
        `$f'(x) = ${coef(k, fTex)}$, $f''(x) = ${k * k}${fTex}$. Cada derivada multiplica por $${k}$.`,
        `Tras ${n} derivadas: $f^{(${n})}(x) = (${k})^{${n}}${fTex} = ${ans}$.`,
      ];
      dom = [-1, 1];
    } else if (kind === "inv") {
      fTex = "\\frac{1}{x}";
      ans = `${sgn < 0 ? "-" : ""}\\frac{${fact(n)}}{x^{${n + 1}}}`;
      wrong = `${sgn < 0 ? "" : "-"}\\frac{${fact(n)}}{x^{${n + 1}}}`;
      steps = [
        "$f'(x) = -\\dfrac{1}{x^{2}}$, $f''(x) = \\dfrac{2}{x^{3}}$, $f'''(x) = -\\dfrac{6}{x^{4}}$.",
        "El patrón es $f^{(n)}(x) = \\dfrac{(-1)^{n}\\,n!}{x^{n+1}}$: el signo alterna y aparece el factorial.",
        `Con $n = ${n}$: $f^{(${n})}(x) = ${ans}$.`,
      ];
    } else if (kind === "ln") {
      fTex = "\\ln x";
      const s = (n - 1) % 2 === 0 ? 1 : -1;
      ans = `${s < 0 ? "-" : ""}\\frac{${fact(n - 1)}}{x^{${n}}}`;
      wrong = `${s < 0 ? "" : "-"}\\frac{${fact(n - 1)}}{x^{${n}}}`;
      steps = [
        "$f'(x) = \\dfrac{1}{x}$. A partir de aquí es el patrón de $\\frac{1}{x}$ corrido un lugar.",
        "$f^{(n)}(x) = \\dfrac{(-1)^{n-1}(n-1)!}{x^{n}}$.",
        `Con $n = ${n}$: $f^{(${n})}(x) = ${ans}$.`,
      ];
    } else if (kind === "invc") {
      const c = r.int(1, 4);
      fTex = `\\frac{1}{x + ${c}}`;
      ans = `${sgn < 0 ? "-" : ""}\\frac{${fact(n)}}{(x + ${c})^{${n + 1}}}`;
      wrong = `${sgn < 0 ? "" : "-"}\\frac{${fact(n)}}{(x + ${c})^{${n + 1}}}`;
      steps = [
        `Es el mismo patrón de $\\frac{1}{x}$ con $x + ${c}$ en lugar de $x$, porque la derivada de $x + ${c}$ es $1$.`,
        `$f^{(n)}(x) = \\dfrac{(-1)^{n}\\,n!}{(x + ${c})^{n+1}}$, así que $f^{(${n})}(x) = ${ans}$.`,
      ];
    } else {
      const m = n + r.int(1, 3);
      const coefN = fact(m) / fact(m - n);
      fTex = `x^{${m}}`;
      ans = `${coefN}${m - n === 1 ? "x" : `x^{${m - n}}`}`;
      wrong = `${m * n}${m - n === 1 ? "x" : `x^{${m - n}}`}`;
      if (wrong === ans) wrong = null;
      const chain = Array.from({ length: n }, (_, i) => m - i).join("\\cdot ");
      steps = [
        "Cada derivada baja el exponente y lo multiplica.",
        `$f^{(${n})}(x) = ${chain}\\,${m - n === 1 ? "x" : `x^{${m - n}}`} = ${ans}$.`,
      ];
      dom = [-2, 2];
    }
    const name = dName(n);
    return {
      statement: `Sea $f(x) = ${fTex}$. Calcula $${name}(x)$.`,
      parts: [
        {
          kind: "expr",
          before: `${name}(x) =`,
          answer: ans,
          vars: ["x"],
          domain: dom,
          mistakes: wrong ? [{ answer: wrong, feedback: "Revisa el signo o el coeficiente. Calcula las primeras derivadas y busca el patrón con calma." }] : [],
        },
      ],
      hints: ["Calcula $f'$, $f''$ y $f'''$ y observa qué se repite.", "Fíjate en el signo, que puede alternar, y en el coeficiente, que puede ser un factorial o una potencia."],
      solution: steps,
    };
  },
};

const logaritmicaXX: ExerciseGen = {
  id: "logaritmica-xx",
  title: "Funciones de la forma f(x) elevado a g(x)",
  level: 2,
  generate: (r) => {
    const kind = r.pick(["xx", "xkx", "xx2", "xlnx", "xsqrt", "x1x"] as const);
    let fTex: string, lnTex: string, dln: string, ans: string, mistakes: Mistake[] = [];
    if (kind === "xx") {
      fTex = "x^{x}";
      lnTex = "x\\ln x";
      dln = "\\ln x + 1";
      ans = "x^{x}(\\ln x + 1)";
      mistakes = [
        { answer: "x\\cdot x^{x-1}", feedback: "Usaste la regla de la potencia, que necesita exponente constante." },
        { answer: "x^{x}\\ln x", feedback: "Usaste la regla exponencial, que necesita base constante. Aquí las dos cosas varían." },
      ];
    } else if (kind === "xkx") {
      const k = r.int(2, 3);
      fTex = `x^{${k}x}`;
      lnTex = `${k}x\\ln x`;
      dln = `${k}(\\ln x + 1)`;
      ans = `${k}x^{${k}x}(\\ln x + 1)`;
      mistakes = [
        { answer: `${k}x\\cdot x^{${k}x-1}`, feedback: "Usaste la regla de la potencia, que necesita exponente constante." },
        { answer: `${k}x^{${k}x}\\ln x`, feedback: "Usaste la regla exponencial, que necesita base constante." },
      ];
    } else if (kind === "xx2") {
      fTex = "x^{x^{2}}";
      lnTex = "x^{2}\\ln x";
      dln = "2x\\ln x + x";
      ans = "x^{x^{2}}(2x\\ln x + x)";
      mistakes = [{ answer: "x^{2}\\cdot x^{x^{2}-1}", feedback: "Usaste la regla de la potencia, que necesita exponente constante." }];
    } else if (kind === "xlnx") {
      fTex = "x^{\\ln x}";
      lnTex = "(\\ln x)^{2}";
      dln = "\\frac{2\\ln x}{x}";
      ans = "\\frac{2\\ln x}{x}x^{\\ln x}";
      mistakes = [{ answer: "\\ln x\\cdot x^{\\ln x - 1}", feedback: "Usaste la regla de la potencia, que necesita exponente constante." }];
    } else if (kind === "xsqrt") {
      fTex = "x^{\\sqrt{x}}";
      lnTex = "\\sqrt{x}\\ln x";
      dln = "\\frac{\\ln x + 2}{2\\sqrt{x}}";
      ans = "x^{\\sqrt{x}}\\cdot\\frac{\\ln x + 2}{2\\sqrt{x}}";
      mistakes = [{ answer: "\\sqrt{x}\\cdot x^{\\sqrt{x}-1}", feedback: "Usaste la regla de la potencia, que necesita exponente constante." }];
    } else {
      fTex = "x^{\\frac{1}{x}}";
      lnTex = "\\frac{\\ln x}{x}";
      dln = "\\frac{1 - \\ln x}{x^{2}}";
      ans = "x^{\\frac{1}{x}}\\cdot\\frac{1 - \\ln x}{x^{2}}";
      mistakes = [{ answer: "\\frac{1}{x}x^{\\frac{1}{x}-1}", feedback: "Usaste la regla de la potencia, que necesita exponente constante." }];
    }
    return {
      statement: `Usa derivación logarítmica para derivar $f(x) = ${fTex}$, con $x > 0$.`,
      parts: [{ kind: "expr", before: "f'(x) =", answer: ans, vars: ["x"], domain: [0.5, 2.5], mistakes }],
      hints: [
        `Toma logaritmo: $\\ln f(x) = ${lnTex}$. Así el exponente baja a multiplicar.`,
        "Deriva los dos lados. A la izquierda queda $\\dfrac{f'(x)}{f(x)}$. Al final multiplica por $f(x)$.",
      ],
      solution: [
        `$\\ln f(x) = \\ln ${fTex} = ${lnTex}$.`,
        `Derivando los dos lados: $\\dfrac{f'(x)}{f(x)} = ${dln}$.`,
        `Multiplicando por $f(x)$: $f'(x) = ${ans}$.`,
      ],
    };
  },
};

const logaritmicaProducto: ExerciseGen = {
  id: "logaritmica-producto",
  title: "Productos y cocientes largos",
  level: 2,
  generate: (r) => {
    const a = r.int(1, 3);
    const c = r.int(2, 4);
    const e = r.int(1, 3);
    const b = r.int(1, 5);
    let d: number;
    do d = r.int(1, 5); while (d === b);
    const xa = a === 1 ? "x" : `x^{${a}}`;
    const fTex = `\\frac{${xa}(x + ${b})^{${c}}}{(x + ${d})${e === 1 ? "" : `^{${e}}`}}`;
    const t1 = a === 1 ? "\\frac{1}{x}" : `\\frac{${a}}{x}`;
    const t2 = `\\frac{${c}}{x + ${b}}`;
    const t3 = e === 1 ? `\\frac{1}{x + ${d}}` : `\\frac{${e}}{x + ${d}}`;
    const ans = `${t1} + ${t2} - ${t3}`;
    return {
      statement: `Sea $f(x) = ${fTex}$, con $x > 0$. Usa derivación logarítmica para hallar $\\dfrac{f'(x)}{f(x)}$.`,
      parts: [
        {
          kind: "expr",
          before: "\\frac{f'(x)}{f(x)} =",
          answer: ans,
          vars: ["x"],
          domain: [0.5, 3],
          mistakes: [
            { answer: `${t1} + ${t2} + ${t3}`, feedback: "El denominador resta: $\\ln\\frac{A}{B} = \\ln A - \\ln B$." },
            ...(a !== 1 || c !== 1 || e !== 1 ? [{ answer: `\\frac{1}{x} + \\frac{1}{x + ${b}} - \\frac{1}{x + ${d}}`, feedback: "Te faltó bajar los exponentes: $\\ln u^{n} = n\\ln u$." }] : []),
          ],
        },
      ],
      hints: [
        `Toma logaritmo y separa con propiedades: $\\ln f(x) = ${a === 1 ? "" : a}\\ln x + ${c}\\ln(x + ${b}) - ${e === 1 ? "" : e}\\ln(x + ${d})$.`,
        "Deriva término a término. El lado izquierdo es $\\dfrac{f'(x)}{f(x)}$.",
      ],
      solution: [
        `$\\ln f(x) = ${a === 1 ? "" : a}\\ln x + ${c}\\ln(x + ${b}) - ${e === 1 ? "" : e}\\ln(x + ${d})$.`,
        `Derivando: $\\dfrac{f'(x)}{f(x)} = ${ans}$.`,
        `Si te piden $f'(x)$, multiplicas por $f(x)$: $f'(x) = ${fTex}\\left(${ans}\\right)$. Sin derivación logarítmica habrías tenido que usar producto y cociente juntos.`,
      ],
    };
  },
};

interface Curve {
  eq: string;
  yp: string;
  steps: string[];
  wrong?: string;
  wrongWhy?: string;
}

const implicitaExpresion: ExerciseGen = {
  id: "implicita-expresion",
  title: "Derivación implícita",
  level: 2,
  generate: (r) => {
    const kind = r.pick(["cuad", "folium", "x2y", "guia", "exp"] as const);
    let C: Curve;
    if (kind === "cuad") {
      const a = r.pick([1, 3, 4]);
      const c = r.int(5, 20);
      C = {
        eq: `x^{2} + ${a === 1 ? "" : a}xy + y^{2} = ${c}`,
        yp: `-\\frac{2x + ${a === 1 ? "" : a}y}{${a === 1 ? "" : a}x + 2y}`,
        steps: [
          `Derivando cada término: $2x + ${a === 1 ? "" : a}(y + x\\,y') + 2y\\,y' = 0$. El término $xy$ pide regla del producto.`,
          `Agrupando lo que tiene $y'$: $y'(${a === 1 ? "" : a}x + 2y) = -(2x + ${a === 1 ? "" : a}y)$.`,
        ],
        wrong: `-\\frac{2x}{${a === 1 ? "" : a}x + 2y}`,
        wrongWhy: "Al derivar $xy$ olvidaste un término. Por la regla del producto, $(xy)' = y + x\\,y'$.",
      };
    } else if (kind === "folium") {
      const c = r.int(2, 6);
      C = {
        eq: `x^{3} + y^{3} = ${c}xy`,
        yp: `\\frac{${c}y - 3x^{2}}{3y^{2} - ${c}x}`,
        steps: [
          `Derivando: $3x^{2} + 3y^{2}y' = ${c}(y + x\\,y')$.`,
          `Pasando los términos con $y'$ a un lado: $y'(3y^{2} - ${c}x) = ${c}y - 3x^{2}$.`,
        ],
        wrong: `\\frac{${c}y - 3x^{2}}{3y^{2}}`,
        wrongWhy: "Al derivar $xy$ olvidaste el término $x\\,y'$ de la regla del producto.",
      };
    } else if (kind === "x2y") {
      const c = r.int(2, 12);
      C = {
        eq: `x^{2}y + y^{3} = ${c}`,
        yp: "-\\frac{2xy}{x^{2} + 3y^{2}}",
        steps: [
          "Derivando: $(2xy + x^{2}y') + 3y^{2}y' = 0$. El término $x^{2}y$ pide regla del producto.",
          "Agrupando: $y'(x^{2} + 3y^{2}) = -2xy$.",
        ],
        wrong: "-\\frac{2xy}{3y^{2}}",
        wrongWhy: "Al derivar $x^{2}y$ olvidaste el término $x^{2}y'$ de la regla del producto.",
      };
    } else if (kind === "guia") {
      const k = r.int(1, 3);
      const c = r.int(1, 5);
      C = {
        eq: `y^{4} + y^{3} + ${k === 1 ? "" : k}xy = ${c}`,
        yp: `-\\frac{${k === 1 ? "" : k}y}{4y^{3} + 3y^{2} + ${k === 1 ? "" : k}x}`,
        steps: [
          `Derivando: $4y^{3}y' + 3y^{2}y' + ${k === 1 ? "" : k}(y + x\\,y') = 0$.`,
          `Agrupando: $y'(4y^{3} + 3y^{2} + ${k === 1 ? "" : k}x) = -${k === 1 ? "" : k}y$.`,
        ],
        wrong: `-\\frac{${k === 1 ? "" : k}y}{4y^{3} + 3y^{2}}`,
        wrongWhy: "Al derivar $xy$ olvidaste el término con $y'$ de la regla del producto.",
      };
    } else {
      const c = r.int(2, 9);
      C = {
        eq: `e^{y} + xy = ${c}`,
        yp: "-\\frac{y}{e^{y} + x}",
        steps: ["Derivando: $e^{y}y' + y + x\\,y' = 0$. Ojo, $(e^{y})' = e^{y}y'$ por la cadena.", "Agrupando: $y'(e^{y} + x) = -y$."],
        wrong: "-\\frac{y}{e^{y}}",
        wrongWhy: "Al derivar $xy$ olvidaste el término $x\\,y'$ de la regla del producto.",
      };
    }
    return {
      statement: `La ecuación $${C.eq}$ define a $y$ como función de $x$. Halla $y'$ en términos de $x$ e $y$.`,
      parts: [
        {
          kind: "expr",
          before: "y' =",
          answer: C.yp,
          vars: ["x", "y"],
          domain: [0.5, 2],
          mistakes: C.wrong ? [{ answer: C.wrong, feedback: C.wrongWhy! }] : [],
        },
      ],
      hints: [
        "Deriva los dos lados respecto a $x$. Cada vez que derives algo con $y$, multiplica por $y'$.",
        "Pasa todos los términos con $y'$ a un lado, saca $y'$ factor común y despeja.",
      ],
      solution: [...C.steps, `Despejando: $y' = ${C.yp}$.`],
    };
  },
};

const implicitaPunto: ExerciseGen = {
  id: "implicita-punto",
  title: "Derivada implícita en un punto",
  level: 2,
  generate: (r) => {
    const kind = r.pick(["x2y", "cubos", "y3xy", "raices"] as const);
    let eq: string, a: number, b: number, num: number, den: number, steps: string[];
    if (kind === "x2y") {
      a = r.nz(-3, 3);
      b = r.nz(-3, 3);
      while (a * a + 2 * a * b === 0 || a + b === 0) b = r.nz(-3, 3);
      const c = a * a * b + a * b * b;
      eq = `x^{2}y + xy^{2} = ${c}`;
      num = -(2 * a * b + b * b);
      den = a * a + 2 * a * b;
      steps = [
        "Derivando con la regla del producto: $2xy + x^{2}y' + y^{2} + 2xy\\,y' = 0$.",
        "Despejando: $y' = -\\dfrac{2xy + y^{2}}{x^{2} + 2xy}$.",
      ];
    } else if (kind === "cubos") {
      a = r.nz(-3, 3);
      b = r.nz(-3, 3);
      eq = `x^{3} + y^{3} = ${a ** 3 + b ** 3}`;
      num = -(a * a);
      den = b * b;
      steps = ["Derivando: $3x^{2} + 3y^{2}y' = 0$.", "Despejando: $y' = -\\dfrac{x^{2}}{y^{2}}$."];
    } else if (kind === "y3xy") {
      a = r.int(-3, 3);
      b = r.nz(-2, 2);
      while (3 * b * b + a === 0) a = r.int(-3, 3);
      eq = `y^{3} + xy = ${b ** 3 + a * b}`;
      num = -b;
      den = 3 * b * b + a;
      steps = ["Derivando: $3y^{2}y' + y + x\\,y' = 0$.", "Despejando: $y' = -\\dfrac{y}{3y^{2} + x}$."];
    } else {
      const s = r.int(1, 4);
      const t = r.int(1, 4);
      a = s * s;
      b = t * t;
      eq = `\\sqrt{x} + \\sqrt{y} = ${s + t}`;
      num = -t;
      den = s;
      steps = [
        "Derivando: $\\dfrac{1}{2\\sqrt{x}} + \\dfrac{y'}{2\\sqrt{y}} = 0$.",
        "Despejando: $y' = -\\dfrac{\\sqrt{y}}{\\sqrt{x}}$.",
      ];
    }
    const ans = frac(num, den);
    return {
      statement: `La curva $${eq}$ pasa por el punto $(${a}, ${b})$. Calcula $y'$ en ese punto.`,
      parts: [{ kind: "expr", before: "y' =", answer: ans, mistakes: frac(-num, den) !== ans ? [{ answer: frac(-num, den), feedback: "Revisa el signo al despejar $y'$." }] : [] }],
      hints: ["Deriva implícitamente: cada término con $y$ lleva un factor $y'$.", `Despeja $y'$ y sustituye $x = ${a}$, $y = ${b}$.`],
      solution: [...steps, `En $(${a}, ${b})$: $y' = ${ans}$.`],
    };
  },
};

const implicitaTangente: ExerciseGen = {
  id: "implicita-tangente",
  title: "Tangente a una curva implícita (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const kind = r.pick(["cuad", "cuad", "x2y", "mix", "parcial"] as const);
    let eq: string, a: number, b: number, mNum: number, mDen: number, steps: string[];
    if (kind === "cuad") {
      const k = r.pick([1, 3]);
      do {
        a = r.nz(-3, 3);
        b = r.nz(-3, 3);
      } while (k * a + 2 * b === 0 || 2 * a + k * b === 0);
      eq = `x^{2} + ${k === 1 ? "" : k}xy + y^{2} = ${a * a + k * a * b + b * b}`;
      mNum = -(2 * a + k * b);
      mDen = k * a + 2 * b;
      steps = [
        `Derivando: $2x + ${k === 1 ? "" : k}(y + x\\,y') + 2y\\,y' = 0$, así que $y' = -\\dfrac{2x + ${k === 1 ? "" : k}y}{${k === 1 ? "" : k}x + 2y}$.`,
        `En $(${a}, ${b})$: $y' = -\\dfrac{${2 * a + k * b}}{${k * a + 2 * b}} = ${frac(mNum, mDen)}$.`,
      ];
    } else if (kind === "x2y") {
      a = r.nz(-3, 3);
      b = r.nz(-2, 2);
      eq = `x^{2}y + y^{3} = ${a * a * b + b ** 3}`;
      mNum = -2 * a * b;
      mDen = a * a + 3 * b * b;
      steps = [
        "Derivando: $2xy + x^{2}y' + 3y^{2}y' = 0$, así que $y' = -\\dfrac{2xy}{x^{2} + 3y^{2}}$.",
        `En $(${a}, ${b})$: $y' = -\\dfrac{${2 * a * b}}{${a * a + 3 * b * b}} = ${frac(mNum, mDen)}$.`,
      ];
    } else if (kind === "mix") {
      do {
        a = r.nz(-3, 3);
        b = r.nz(-2, 2);
      } while (3 * b * b - a === 0);
      eq = `x^{2} - xy + y^{3} = ${a * a - a * b + b ** 3}`;
      mNum = -(2 * a - b);
      mDen = 3 * b * b - a;
      steps = [
        "Derivando: $2x - (y + x\\,y') + 3y^{2}y' = 0$, así que $y'(3y^{2} - x) = y - 2x$ e $y' = \\dfrac{y - 2x}{3y^{2} - x}$.",
        `En $(${a}, ${b})$: $y' = \\dfrac{${b - 2 * a}}{${3 * b * b - a}} = ${frac(mNum, mDen)}$.`,
      ];
    } else {
      a = 1;
      b = 1;
      eq = "e^{2(1 - xy)}x^{2}y^{2} = xy";
      mNum = -1;
      mDen = 1;
      steps = [
        "Cerca de $(1, 1)$ el producto $xy$ no es cero, así que se puede dividir entre $xy$: $e^{2(1-xy)}xy = 1$.",
        "Logaritmo: $2(1 - xy) + \\ln x + \\ln y = 0$. Derivando: $-2(y + x\\,y') + \\dfrac{1}{x} + \\dfrac{y'}{y} = 0$.",
        "Despejando: $y'\\left(\\dfrac{1}{y} - 2x\\right) = 2y - \\dfrac{1}{x}$, que simplifica a $y' = -\\dfrac{y}{x}$.",
        "En $(1, 1)$: $y' = -1$.",
      ];
    }
    const m = frac(mNum, mDen);
    const bb = frac(b * mDen - mNum * a, mDen);
    return {
      statement: `La ecuación $${eq}$ define implícitamente a $y$ como función de $x$. Escribe la ecuación de la recta tangente a la curva en el punto $(${a}, ${b})$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Pendiente de la tangente, es decir, $y'$ en el punto.", before: "m =", answer: m },
        { kind: "expr", prompt: "Término independiente de la tangente $y = mx + b$.", before: "b =", answer: bb, mistakes: String(b) !== bb ? [{ answer: String(b), feedback: "Esa es la ordenada del punto. Despeja $y$ en $y - y_0 = m(x - x_0)$." }] : [] },
      ],
      hints: [
        "Deriva implícitamente los dos lados y despeja $y'$.",
        `Sustituye $x = ${a}$, $y = ${b}$ para obtener la pendiente.`,
        "Usa $y - y_0 = m(x - x_0)$ y despeja $y$.",
      ],
      solution: [
        ...steps,
        `Tangente: $y - ${p(b)} = ${m}(${xPlus(-a)})$, es decir, $y = ${lineTex(m, bb)}$.`,
      ],
    };
  },
};

const implicitaExponencial: ExerciseGen = {
  id: "implicita-exponencial",
  title: "Implícitas con exponenciales y logaritmos (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const kind = r.pick(["exy", "exax", "xyyx", "xlny", "e1xy"] as const);
    let eq: string, x0: number, y0: number, m: string, b: string, steps: string[];
    if (kind === "exy") {
      const k = r.int(1, 4);
      eq = `y\\,e^{${k === 1 ? "x" : `${k}x`}/y} = 1`;
      x0 = 0;
      y0 = 1;
      m = String(-k);
      b = "1";
      steps = [
        `Tomamos logaritmo: $\\ln y + \\dfrac{${k === 1 ? "" : k}x}{y} = 0$.`,
        `Derivamos: $\\dfrac{y'}{y} + ${k === 1 ? "" : k}\\cdot\\dfrac{y - x\\,y'}{y^{2}} = 0$. Multiplicando por $y^{2}$: $y\\,y' + ${k === 1 ? "" : k}y - ${k === 1 ? "" : k}x\\,y' = 0$.`,
        `$y' = \\dfrac{${k === 1 ? "" : k}y}{${k === 1 ? "" : k}x - y}$. En $(0, 1)$: $y' = \\dfrac{${k}}{-1} = ${-k}$.`,
      ];
    } else if (kind === "exax") {
      const a = r.int(2, 5);
      eq = `e^{xy} = ${a}x + y`;
      x0 = 0;
      y0 = 1;
      m = String(1 - a);
      b = "1";
      steps = [
        `Derivamos: $e^{xy}(y + x\\,y') = ${a} + y'$.`,
        `En $(0, 1)$: $e^{0}(1 + 0) = ${a} + y'$, así que $y' = 1 - ${a} = ${1 - a}$.`,
      ];
    } else if (kind === "xyyx") {
      const first = r.bool();
      x0 = first ? 2 : 4;
      y0 = first ? 4 : 2;
      eq = "x^{y} = y^{x}";
      m = first ? "\\frac{4\\ln 2 - 4}{2\\ln 2 - 1}" : "\\frac{2\\ln 2 - 1}{4\\ln 2 - 4}";
      b = `${y0} - ${x0}\\cdot${m}`;
      steps = [
        "Tomamos logaritmo: $y\\ln x = x\\ln y$.",
        "Derivamos los dos productos: $y'\\ln x + \\dfrac{y}{x} = \\ln y + \\dfrac{x\\,y'}{y}$.",
        "Despejamos: $y' = \\dfrac{\\ln y - \\frac{y}{x}}{\\ln x - \\frac{x}{y}}$.",
        first
          ? "En $(2, 4)$: $y' = \\dfrac{\\ln 4 - 2}{\\ln 2 - \\frac{1}{2}} = \\dfrac{4\\ln 2 - 4}{2\\ln 2 - 1} \\approx -3{,}18$."
          : "En $(4, 2)$: $y' = \\dfrac{\\ln 2 - \\frac{1}{2}}{\\ln 4 - 2} = \\dfrac{2\\ln 2 - 1}{4\\ln 2 - 4} \\approx -0{,}31$.",
      ];
    } else if (kind === "xlny") {
      const a = r.int(1, 5);
      eq = `xy^{2} + \\ln y = ${a}`;
      x0 = a;
      y0 = 1;
      m = frac(-1, 2 * a + 1);
      b = frac(3 * a + 1, 2 * a + 1);
      steps = [
        "Derivamos: $y^{2} + 2xy\\,y' + \\dfrac{y'}{y} = 0$.",
        `En $(${a}, 1)$: $1 + ${2 * a}y' + y' = 0$, así que $y' = ${m}$.`,
      ];
    } else {
      const k = r.pick([2, 3]);
      eq = `e^{${k}(1 - xy)}\\,xy = 1`;
      x0 = 1;
      y0 = 1;
      m = "-1";
      b = "2";
      steps = [
        `Tomamos logaritmo: $${k}(1 - xy) + \\ln x + \\ln y = 0$.`,
        `Derivamos: $-${k}(y + x\\,y') + \\dfrac{1}{x} + \\dfrac{y'}{y} = 0$.`,
        `En $(1, 1)$: $-${k}(1 + y') + 1 + y' = 0$, es decir, $(1 + y')(1 - ${k}) = 0$, así que $y' = -1$.`,
      ];
    }
    return {
      statement: `La ecuación $${eq}$ define implícitamente a $y$ como función de $x$. Calcula $\\dfrac{dy}{dx}$ en el punto $(${x0}, ${y0})$ y la recta tangente ahí.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Valor de $y'$ en el punto.", before: "m =", answer: m },
        { kind: "expr", prompt: "Término independiente de la tangente $y = mx + b$.", before: "b =", answer: b },
      ],
      hints: [
        "Si hay exponenciales o potencias con $x$ e $y$, conviene tomar logaritmo antes de derivar.",
        "Cada término con $y$ lleva un $y'$ al derivar. Puedes sustituir el punto antes de despejar, eso ahorra álgebra.",
        "La tangente es $y - y_0 = m(x - x_0)$.",
      ],
      solution: [
        ...steps,
        kind === "xyyx"
          ? `Tangente: $y - ${y0} = m(x - ${x0})$, así que $b = ${y0} - ${x0}m$.`
          : `Tangente: $y - ${y0} = ${m}(${xPlus(-x0)})$, es decir, $y = ${lineTex(m, b)}$.`,
      ],
    };
  },
};

const logaritmicaParcial: ExerciseGen = {
  id: "logaritmica-parcial",
  title: "Derivación logarítmica (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const kind = r.pick(["xxlnx", "cociente", "lnx", "x2mas1"] as const);
    let fTex: string, ans: string, dom: [number, number], steps: string[];
    if (kind === "xxlnx") {
      fTex = "x^{x\\ln x}";
      ans = "x^{x\\ln x}\\ln x(\\ln x + 2)";
      dom = [0.5, 3];
      steps = [
        "$\\ln f(x) = x\\ln x\\cdot\\ln x = x(\\ln x)^{2}$.",
        "Derivando con producto y cadena: $\\dfrac{f'(x)}{f(x)} = (\\ln x)^{2} + x\\cdot 2\\ln x\\cdot\\dfrac{1}{x} = (\\ln x)^{2} + 2\\ln x$.",
        `$f'(x) = ${ans}$.`,
      ];
    } else if (kind === "cociente") {
      const a = r.int(1, 3);
      const b = r.int(1, 3);
      const c = r.int(1, 5);
      const base = `\\frac{x - ${a}}{x + ${b}}`;
      fTex = `\\left(${base}\\right)^{x^{2} - ${c}}`;
      ans = `${fTex}\\left(2x\\ln\\left(${base}\\right) + \\frac{${a + b}(x^{2} - ${c})}{(x - ${a})(x + ${b})}\\right)`;
      dom = [a + 0.5, a + 3];
      steps = [
        `$\\ln f(x) = (x^{2} - ${c})\\left[\\ln(x - ${a}) - \\ln(x + ${b})\\right]$.`,
        `Derivando el producto: $\\dfrac{f'(x)}{f(x)} = 2x\\ln\\left(${base}\\right) + (x^{2} - ${c})\\left(\\dfrac{1}{x - ${a}} - \\dfrac{1}{x + ${b}}\\right)$.`,
        `Como $\\dfrac{1}{x - ${a}} - \\dfrac{1}{x + ${b}} = \\dfrac{${a + b}}{(x - ${a})(x + ${b})}$, queda $f'(x) = ${ans}$.`,
      ];
    } else if (kind === "lnx") {
      fTex = "(\\ln x)^{x}";
      ans = "(\\ln x)^{x}\\left(\\ln(\\ln x) + \\frac{1}{\\ln x}\\right)";
      dom = [1.5, 4];
      steps = [
        "Para $x > 1$: $\\ln f(x) = x\\ln(\\ln x)$.",
        "$\\dfrac{f'(x)}{f(x)} = \\ln(\\ln x) + x\\cdot\\dfrac{1}{\\ln x}\\cdot\\dfrac{1}{x} = \\ln(\\ln x) + \\dfrac{1}{\\ln x}$.",
        `$f'(x) = ${ans}$.`,
      ];
    } else {
      const c = r.int(1, 4);
      fTex = `(x^{2} + ${c})^{x}`;
      ans = `(x^{2} + ${c})^{x}\\left(\\ln(x^{2} + ${c}) + \\frac{2x^{2}}{x^{2} + ${c}}\\right)`;
      dom = [0.5, 2];
      steps = [
        `$\\ln f(x) = x\\ln(x^{2} + ${c})$.`,
        `$\\dfrac{f'(x)}{f(x)} = \\ln(x^{2} + ${c}) + x\\cdot\\dfrac{2x}{x^{2} + ${c}}$.`,
        `$f'(x) = ${ans}$.`,
      ];
    }
    return {
      statement: `Usa derivación logarítmica para calcular la derivada de $f(x) = ${fTex}$.`,
      parts: [{ kind: "expr", before: "f'(x) =", answer: ans, vars: ["x"], domain: dom }],
      hints: [
        "Toma logaritmo natural en los dos lados para que el exponente baje a multiplicar.",
        "El lado derecho queda como producto: deriva con la regla del producto. El izquierdo es $\\dfrac{f'(x)}{f(x)}$.",
        "Al final multiplica por $f(x)$ y escribe $f$ completa, no la dejes como $f(x)$.",
      ],
      solution: steps,
    };
  },
};

const verificarEcuacion: ExerciseGen = {
  id: "verificar-ecuacion",
  title: "Verificar una ecuación con derivadas (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const kind = r.pick(["parab", "exp", "xexp", "ln", "inv"] as const);
    let fTex: string, d1: string, d2: string, eqTex: string, isTrue: boolean, why: string, dom: [number, number] = [-2, 2];
    if (kind === "parab") {
      const pp = r.int(-3, 3);
      const q = r.pick([1, 1, 2, 3]);
      const c1 = 2 * pp;
      const c0 = pp * pp + q;
      fTex = `\\dfrac{${poly([1, c1, c0])}}{2}`;
      d1 = xPlus(pp);
      d2 = "1";
      eqTex = "1 + (y')^{2} = 2y\\,y''";
      isTrue = q === 1;
      why = `$1 + (${xPlus(pp)})^{2} = ${poly([1, c1, pp * pp + 1])}$ y $2y\\,y'' = ${poly([1, c1, c0])}$. ${isTrue ? "Son iguales." : `Difieren en $${q - 1}$, así que no se cumple.`}`;
    } else if (kind === "exp") {
      const k = r.pick([2, 3, -2]);
      fTex = `e^{${k}x}`;
      d1 = `${k}e^{${k}x}`;
      d2 = `${k * k}e^{${k}x}`;
      isTrue = r.bool();
      eqTex = isTrue ? `y'' - ${k * k}y = 0` : `y'' - ${Math.abs(k)}y = 0`;
      why = isTrue
        ? `$y'' - ${k * k}y = ${k * k}e^{${k}x} - ${k * k}e^{${k}x} = 0$.`
        : `$y'' - ${Math.abs(k)}y = ${k * k}e^{${k}x} - ${Math.abs(k)}e^{${k}x} = ${k * k - Math.abs(k)}e^{${k}x} \\ne 0$.`;
    } else if (kind === "xexp") {
      const k = r.pick([1, 2, 3]);
      const ek = k === 1 ? "e^{x}" : `e^{${k}x}`;
      fTex = `x${ek}`;
      d1 = `${ek}(1 + ${k === 1 ? "" : k}x)`;
      d2 = `${ek}(${2 * k} + ${k * k === 1 ? "" : k * k}x)`;
      isTrue = r.bool();
      eqTex = isTrue ? `y'' - ${2 * k === 1 ? "" : 2 * k}y' + ${k * k === 1 ? "" : k * k}y = 0` : `y'' + ${2 * k}y' + ${k * k === 1 ? "" : k * k}y = 0`;
      why = isTrue
        ? `$${eqTex.replace(" = 0", "")} = ${ek}\\left[(${2 * k} + ${coef(k * k, "x")}) - ${2 * k}(1 + ${coef(k, "x")}) + ${coef(k * k, "x")}\\right] = 0$.`
        : `$${eqTex.replace(" = 0", "")} = ${ek}\\left[(${2 * k} + ${coef(k * k, "x")}) + ${2 * k}(1 + ${coef(k, "x")}) + ${coef(k * k, "x")}\\right] = ${ek}(${4 * k} + ${4 * k * k}x)$, que no es cero.`;
    } else if (kind === "ln") {
      fTex = "\\ln x";
      d1 = "\\frac{1}{x}";
      d2 = "-\\frac{1}{x^{2}}";
      isTrue = r.bool();
      eqTex = isTrue ? "x\\,y'' + y' = 0" : "x\\,y'' - y' = 0";
      why = isTrue ? "$x\\left(-\\frac{1}{x^{2}}\\right) + \\frac{1}{x} = -\\frac{1}{x} + \\frac{1}{x} = 0$." : "$x\\left(-\\frac{1}{x^{2}}\\right) - \\frac{1}{x} = -\\frac{2}{x} \\ne 0$.";
      dom = [0.5, 3];
    } else {
      fTex = "\\frac{1}{x}";
      d1 = "-\\frac{1}{x^{2}}";
      d2 = "\\frac{2}{x^{3}}";
      isTrue = r.bool();
      eqTex = isTrue ? "x\\,y'' + 2y' = 0" : "x\\,y'' + y' = 0";
      why = isTrue ? "$x\\cdot\\frac{2}{x^{3}} + 2\\left(-\\frac{1}{x^{2}}\\right) = \\frac{2}{x^{2}} - \\frac{2}{x^{2}} = 0$." : "$x\\cdot\\frac{2}{x^{3}} - \\frac{1}{x^{2}} = \\frac{1}{x^{2}} \\ne 0$.";
      dom = [0.5, 3];
    }
    return {
      statement: `Sea $f(x) = ${fTex}$ y llamemos $y = f(x)$. Calcula $y'$ e $y''$ y verifica si se cumple $${eqTex}$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Primera derivada.", before: "f'(x) =", answer: d1, vars: ["x"], domain: dom },
        { kind: "expr", prompt: "Segunda derivada.", before: "f''(x) =", answer: d2, vars: ["x"], domain: dom },
        trueFalse(isTrue, why, `¿Se cumple $${eqTex}$ para todo $x$ del dominio?`),
      ],
      hints: [
        "Calcula $y'$ y luego deriva otra vez para $y''$.",
        "Sustituye $y$, $y'$ e $y''$ en el lado izquierdo y simplifica. Si da lo mismo que el derecho para todo $x$, se cumple.",
      ],
      solution: [`$y' = ${d1}$ e $y'' = ${d2}$.`, `Sustituyendo: ${why}`, isTrue ? "La función satisface la ecuación." : "La función no satisface la ecuación."],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("tecnicas-derivacion"),
  objectives: [
    "Calcular derivadas segunda, tercera y de orden $n$, y reconocer patrones.",
    "Derivar con logaritmos productos largos y funciones de la forma $f(x)^{g(x)}$.",
    "Derivar curvas definidas implícitamente y evaluar $\\frac{dy}{dx}$ en un punto.",
    "Hallar la recta tangente a una curva implícita, como en el tercer parcial.",
  ],
  sections: [
    {
      id: "sucesivas",
      title: "Derivadas sucesivas",
      blocks: [
        {
          type: "text",
          md: "La derivada $f'$ es una función nueva, así que se puede derivar otra vez. El resultado es la segunda derivada $f''$, que mide cómo cambia la pendiente. Si $f'$ dice qué tan rápido sube la función, $f''$ dice si ese ritmo se acelera o se frena.",
        },
        {
          type: "definition",
          title: "Derivadas de orden superior",
          md: "$$f''(x) = \\big(f'(x)\\big)' \\qquad f'''(x) = \\big(f''(x)\\big)' \\qquad f^{(n)}(x) = \\big(f^{(n-1)}(x)\\big)'$$\n\nDesde la cuarta se escribe el orden entre paréntesis: $f^{(4)}$, $f^{(5)}$. Otra notación es $\\dfrac{d^{2}y}{dx^{2}}$ para la segunda.",
        },
        {
          type: "example",
          title: "Derivar hasta que se acabe",
          problem: "Calcula todas las derivadas de $f(x) = x^{4} - 2x^{3} + x$.",
          steps: [
            "$f'(x) = 4x^{3} - 6x^{2} + 1$.",
            "$f''(x) = 12x^{2} - 12x$.",
            "$f'''(x) = 24x - 12$.",
            "$f^{(4)}(x) = 24$ y $f^{(5)}(x) = 0$. Desde ahí todas valen cero.",
          ],
        },
        {
          type: "widget",
          widget: { kind: "tangent", fn: "x^{3} - 3x^{2} + 1", x: [-2, 4], y: [-5, 5], showAnalysis: true, derivative: "3x^{2} - 6x" },
          caption: "Mueve el punto. Donde $f''(x) = 6x - 6$ es negativa, la pendiente va disminuyendo y la curva se dobla hacia abajo. Donde es positiva, se dobla hacia arriba.",
        },
        {
          type: "note",
          tone: "econ",
          title: "La segunda derivada en economía",
          md: "Si $C(q)$ es un costo total, $C''(q)$ dice cómo cambia el costo marginal. Si $C''(q) > 0$, cada unidad adicional cuesta más que la anterior. Es lo que se conoce como rendimientos decrecientes.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Sea $f(x) = x^{3} + 5x^{2}$. Calcula $f''(1)$.",
            parts: [{ kind: "expr", before: "f''(1) =", answer: "16", mistakes: [{ answer: "13", feedback: "Ese es $f'(1)$. Deriva otra vez." }] }],
            solution: ["$f'(x) = 3x^{2} + 10x$ y $f''(x) = 6x + 10$. Entonces $f''(1) = 16$."],
          },
        },
      ],
    },
    {
      id: "patrones",
      title: "La derivada de orden n",
      blocks: [
        {
          type: "text",
          md: "Con algunas funciones, al derivar varias veces aparece un patrón. Si lo descubres, puedes escribir la derivada de cualquier orden sin calcular las anteriores.",
        },
        {
          type: "table",
          headers: ["Función", "Derivada de orden $n$"],
          rows: [
            ["$e^{ax}$", "$a^{n}e^{ax}$"],
            ["$\\dfrac{1}{x}$", "$\\dfrac{(-1)^{n}\\,n!}{x^{n+1}}$"],
            ["$\\ln x$", "$\\dfrac{(-1)^{n-1}(n-1)!}{x^{n}}$"],
            ["$x^{m}$ con $n \\le m$", "$\\dfrac{m!}{(m-n)!}x^{m-n}$"],
          ],
          caption: "$n! = 1\\cdot 2\\cdot 3 \\cdots n$ se lee \"$n$ factorial\". Por ejemplo, $4! = 24$.",
        },
        {
          type: "example",
          title: "Descubrir el patrón de 1/x",
          problem: "Halla una fórmula para la derivada de orden $n$ de $f(x) = \\dfrac{1}{x}$.",
          steps: [
            "$f(x) = x^{-1}$, $f'(x) = -x^{-2}$, $f''(x) = 2x^{-3}$, $f'''(x) = -6x^{-4}$, $f^{(4)}(x) = 24x^{-5}$.",
            "Los coeficientes $1, 2, 6, 24$ son $1!, 2!, 3!, 4!$. El signo alterna y empieza en negativo.",
            "El exponente siempre es uno más que el orden, con signo menos.",
          ],
          answer: "$f^{(n)}(x) = \\dfrac{(-1)^{n}\\,n!}{x^{n+1}}$",
        },
        {
          type: "example",
          title: "Verificar una ecuación, como en un parcial",
          problem: "Verifica que $y = \\dfrac{x^{2} + 2x + 2}{2}$ satisface $1 + (y')^{2} = 2y\\,y''$.",
          steps: [
            "$y' = \\dfrac{2x + 2}{2} = x + 1$ e $y'' = 1$.",
            "Lado izquierdo: $1 + (x + 1)^{2} = x^{2} + 2x + 2$.",
            "Lado derecho: $2y\\cdot 1 = x^{2} + 2x + 2$.",
            "Son iguales para todo $x$, así que la función satisface la ecuación.",
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "Cuidado con el signo que alterna",
          md: "En $\\frac{1}{x}$ y en $\\ln x$ el signo cambia en cada derivada. Antes de dar la fórmula, compruébala con $n = 1$ y $n = 2$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Sea $f(x) = e^{2x}$. Calcula $f^{(5)}(0)$.",
            parts: [{ kind: "expr", before: "f^{(5)}(0) =", answer: "32", mistakes: [{ answer: "10", feedback: "Cada derivada multiplica por $2$, no suma. Son $2^{5}$." }] }],
            solution: ["$f^{(5)}(x) = 2^{5}e^{2x} = 32e^{2x}$, así que $f^{(5)}(0) = 32$."],
          },
        },
      ],
    },
    {
      id: "logaritmica",
      title: "Derivación logarítmica",
      blocks: [
        {
          type: "text",
          md: "Derivar un producto de muchos factores, o un cociente con raíces, se vuelve largo. La idea de la derivación logarítmica es tomar logaritmo primero, porque el logaritmo convierte productos en sumas, cocientes en restas y potencias en multiplicaciones. Derivar sumas es mucho más fácil.",
        },
        {
          type: "definition",
          title: "El procedimiento",
          md: "- Toma logaritmo natural en los dos lados: $\\ln y = \\ln f(x)$.\n- Usa las propiedades del logaritmo para separar todo lo posible.\n- Deriva los dos lados. A la izquierda, por la cadena, queda $\\dfrac{y'}{y}$.\n- Despeja: $y' = y\\cdot(\\text{lo que salió a la derecha})$.",
        },
        {
          type: "example",
          title: "Una raíz de un cociente",
          problem: "Deriva $y = \\sqrt[3]{\\dfrac{x+1}{x-1}}$.",
          steps: [
            "$\\ln y = \\dfrac{1}{3}\\left[\\ln(x+1) - \\ln(x-1)\\right]$.",
            "Derivando: $\\dfrac{y'}{y} = \\dfrac{1}{3}\\left[\\dfrac{1}{x+1} - \\dfrac{1}{x-1}\\right] = \\dfrac{1}{3}\\cdot\\dfrac{-2}{x^{2}-1}$.",
            "Multiplicando por $y$: $y' = -\\dfrac{2}{3(x^{2}-1)}\\sqrt[3]{\\dfrac{x+1}{x-1}}$.",
          ],
        },
        {
          type: "example",
          title: "Un producto de tres factores",
          problem: "Deriva $y = \\dfrac{x^{2}(x+1)^{3}}{(x-2)^{4}}$.",
          steps: [
            "$\\ln y = 2\\ln x + 3\\ln(x+1) - 4\\ln(x-2)$.",
            "$\\dfrac{y'}{y} = \\dfrac{2}{x} + \\dfrac{3}{x+1} - \\dfrac{4}{x-2}$.",
            "$y' = \\dfrac{x^{2}(x+1)^{3}}{(x-2)^{4}}\\left(\\dfrac{2}{x} + \\dfrac{3}{x+1} - \\dfrac{4}{x-2}\\right)$.",
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "El lado izquierdo también se deriva con la cadena",
          md: "$y$ depende de $x$, así que la derivada de $\\ln y$ es $\\dfrac{y'}{y}$ y no $\\dfrac{1}{y}$. Y al final no olvides multiplicar por $y$ escrita completa.",
        },
        {
          type: "note",
          tone: "tip",
          title: "¿Y si la función es negativa?",
          md: "El logaritmo solo existe para positivos. Si $y$ puede ser negativa se trabaja con $\\ln|y|$, cuya derivada también es $\\frac{y'}{y}$. El resultado final es el mismo.",
        },
      ],
    },
    {
      id: "potencia-variable",
      title: "Base y exponente variables",
      blocks: [
        {
          type: "text",
          md: "En $x^{x}$ la base y el exponente dependen de $x$. No sirve la regla de la potencia, que pide exponente fijo, ni la exponencial, que pide base fija. La derivación logarítmica resuelve el problema porque baja el exponente a multiplicar.",
        },
        {
          type: "example",
          title: "La función x elevado a x",
          problem: "Deriva $y = x^{x}$ para $x > 0$.",
          steps: [
            "$\\ln y = x\\ln x$.",
            "$\\dfrac{y'}{y} = 1\\cdot\\ln x + x\\cdot\\dfrac{1}{x} = \\ln x + 1$.",
            "$y' = x^{x}(\\ln x + 1)$.",
          ],
        },
        {
          type: "example",
          title: "Ejercicio de parcial",
          problem: "Deriva $f(x) = x^{x\\ln x}$ para $x > 0$.",
          steps: [
            "$\\ln f(x) = x\\ln x\\cdot\\ln x = x(\\ln x)^{2}$.",
            "$\\dfrac{f'(x)}{f(x)} = (\\ln x)^{2} + x\\cdot 2\\ln x\\cdot\\dfrac{1}{x} = (\\ln x)^{2} + 2\\ln x$.",
            "$f'(x) = x^{x\\ln x}\\,\\ln x\\,(\\ln x + 2)$.",
          ],
        },
        {
          type: "example",
          title: "Otro de parcial",
          problem: "Deriva $g(x) = \\left(\\dfrac{x-2}{x+1}\\right)^{x^{2}-3}$ para $x > 2$.",
          steps: [
            "$\\ln g(x) = (x^{2}-3)\\left[\\ln(x-2) - \\ln(x+1)\\right]$.",
            "Producto: $\\dfrac{g'(x)}{g(x)} = 2x\\ln\\dfrac{x-2}{x+1} + (x^{2}-3)\\left(\\dfrac{1}{x-2} - \\dfrac{1}{x+1}\\right)$.",
            "La resta de fracciones da $\\dfrac{3}{(x-2)(x+1)}$.",
            "$g'(x) = \\left(\\dfrac{x-2}{x+1}\\right)^{x^{2}-3}\\left[2x\\ln\\dfrac{x-2}{x+1} + \\dfrac{3(x^{2}-3)}{(x-2)(x+1)}\\right]$.",
          ],
        },
        {
          type: "note",
          tone: "tip",
          title: "Fórmula directa",
          md: "Haciendo el procedimiento con letras se obtiene, para $f(x) > 0$:\n\n$$\\left(f^{g}\\right)' = f^{g}\\left(g'\\ln f + g\\,\\frac{f'}{f}\\right)$$\n\nEs la suma de lo que darían la regla exponencial y la regla de la potencia por separado.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Sea $f(x) = x^{x}$. Calcula $f'(1)$.",
            parts: [{ kind: "expr", before: "f'(1) =", answer: "1" }],
            solution: ["$f'(x) = x^{x}(\\ln x + 1)$, así que $f'(1) = 1\\cdot(0 + 1) = 1$."],
          },
        },
      ],
    },
    {
      id: "implicita",
      title: "Derivación implícita",
      blocks: [
        {
          type: "text",
          md: "Algunas curvas vienen dadas por una ecuación donde $y$ no está despejada, como la circunferencia $x^{2} + y^{2} = 25$. A veces despejar es imposible, como en $y^{4} + y^{3} + xy = 1$. No hace falta despejar: se deriva la ecuación tal como está, recordando que $y$ es una función de $x$.",
        },
        {
          type: "definition",
          title: "El procedimiento",
          md: "- Deriva los dos lados de la ecuación respecto a $x$.\n- Cada término con $y$ se deriva con la cadena y lleva un factor $y'$. Por ejemplo, $(y^{3})' = 3y^{2}y'$ y $(e^{y})' = e^{y}y'$.\n- Los productos de $x$ con $y$ piden regla del producto: $(xy)' = y + x\\,y'$.\n- Junta los términos con $y'$ en un lado, saca factor común y despeja.",
        },
        {
          type: "example",
          title: "La circunferencia",
          problem: "Halla $y'$ en $x^{2} + y^{2} = 25$ y su valor en el punto $(3, 4)$.",
          steps: [
            "Derivando: $2x + 2y\\,y' = 0$.",
            "Despejando: $y' = -\\dfrac{x}{y}$.",
            "En $(3, 4)$: $y' = -\\dfrac{3}{4}$. La tangente es $y - 4 = -\\frac{3}{4}(x - 3)$, es decir, $y = -\\frac{3}{4}x + \\frac{25}{4}$.",
          ],
        },
        {
          type: "graph",
          spec: {
            x: [-7, 9],
            y: [-6, 8],
            curves: [
              { fn: "\\sqrt{25 - x^{2}}", domain: [-5, 5], color: "accent" },
              { fn: "-\\sqrt{25 - x^{2}}", domain: [-5, 5], color: "accent" },
              { fn: "-\\frac{3}{4}x + \\frac{25}{4}", color: "orange", dashed: true, label: "tangente" },
            ],
            points: [{ x: 3, y: 4, label: "(3, 4)" }],
          },
          caption: "La circunferencia no es la gráfica de una función, pero cerca de $(3, 4)$ sí lo es, y ahí tiene tangente.",
        },
        {
          type: "example",
          title: "Una curva que no se puede despejar",
          problem: "Halla $y'$ en $y^{4} + y^{3} + xy = 1$ y evalúala en $(-1, 1)$.",
          steps: [
            "Derivando: $4y^{3}y' + 3y^{2}y' + y + x\\,y' = 0$.",
            "Agrupando: $y'(4y^{3} + 3y^{2} + x) = -y$, así que $y' = -\\dfrac{y}{4y^{3} + 3y^{2} + x}$.",
            "El punto $(-1, 1)$ está en la curva: $1 + 1 - 1 = 1$. Ahí $y' = -\\dfrac{1}{4 + 3 - 1} = -\\dfrac{1}{6}$.",
          ],
        },
        {
          type: "note",
          tone: "warning",
          title: "Los dos olvidos típicos",
          md: "Derivar $y^{2}$ como $2y$, sin el $y'$. Y derivar $xy$ como $x\\,y'$ o como $y$ solamente, sin la regla del producto. Cualquiera de los dos cambia el resultado.",
        },
        {
          type: "quick",
          exercise: {
            statement: "La curva $x^{2} + y^{2} = 10$ pasa por $(1, 3)$. Calcula $y'$ en ese punto.",
            parts: [{ kind: "expr", before: "y' =", answer: "-\\frac{1}{3}", mistakes: [{ answer: "-3", feedback: "Invertiste la fracción: es $-\\frac{x}{y}$." }] }],
            solution: ["$2x + 2yy' = 0$ da $y' = -\\frac{x}{y} = -\\frac{1}{3}$."],
          },
        },
      ],
    },
    {
      id: "implicita-parcial",
      title: "Implícitas de parcial",
      blocks: [
        {
          type: "text",
          md: "En el tercer parcial las curvas implícitas suelen traer exponenciales o potencias con $x$ e $y$ mezcladas. La estrategia es combinar las dos técnicas del tema: tomar logaritmo para simplificar y después derivar implícitamente. Un truco que ahorra mucho álgebra: si piden $y'$ en un punto, sustituye el punto justo después de derivar y antes de despejar.",
        },
        {
          type: "example",
          title: "Exponencial con cociente",
          problem: "Sea $y = f(x)$ definida por $e^{x/y}\\,y = 1$. Calcula $\\dfrac{dy}{dx}$ en $(0, 1)$.",
          steps: [
            "Comprobamos el punto: $e^{0}\\cdot 1 = 1$.",
            "Logaritmo: $\\dfrac{x}{y} + \\ln y = 0$.",
            "Derivando: $\\dfrac{y - x\\,y'}{y^{2}} + \\dfrac{y'}{y} = 0$. Multiplicando por $y^{2}$: $y - x\\,y' + y\\,y' = 0$.",
            "$y' = \\dfrac{y}{x - y}$. En $(0, 1)$: $y' = \\dfrac{1}{-1} = -1$.",
          ],
        },
        {
          type: "example",
          title: "Base y exponente variables",
          problem: "Halla $y'$ si $x^{y} = y^{x}$.",
          steps: [
            "Logaritmo: $y\\ln x = x\\ln y$.",
            "Derivando cada producto: $y'\\ln x + \\dfrac{y}{x} = \\ln y + \\dfrac{x\\,y'}{y}$.",
            "Agrupando: $y'\\left(\\ln x - \\dfrac{x}{y}\\right) = \\ln y - \\dfrac{y}{x}$.",
            "Multiplicando arriba y abajo por $xy$: $y' = \\dfrac{xy\\ln y - y^{2}}{xy\\ln x - x^{2}}$.",
          ],
        },
        {
          type: "example",
          title: "Tangente a una curva implícita",
          problem: "Dada $e^{2(1-xy)}x^{2}y^{2} = xy$, halla $y'$ con derivación logarítmica y la tangente en $(1, 1)$.",
          steps: [
            "Cerca de $(1, 1)$ se puede dividir entre $xy$: $e^{2(1-xy)}xy = 1$.",
            "Logaritmo: $2(1 - xy) + \\ln x + \\ln y = 0$.",
            "Derivando: $-2(y + x\\,y') + \\dfrac{1}{x} + \\dfrac{y'}{y} = 0$, de donde $y'\\left(\\dfrac{1}{y} - 2x\\right) = 2y - \\dfrac{1}{x}$.",
            "Multiplicando por $xy$: $y'(x - 2x^{2}y) = 2xy^{2} - y$, es decir, $y'\\,x(1 - 2xy) = -y(1 - 2xy)$, así que $y' = -\\dfrac{y}{x}$.",
            "En $(1, 1)$: $y' = -1$. Tangente: $y - 1 = -(x - 1)$, es decir, $y = -x + 2$.",
          ],
        },
        {
          type: "quick",
          exercise: {
            statement: "La curva $xy + y^{2} = 2$ pasa por $(1, 1)$. Calcula $y'$ en ese punto.",
            parts: [{ kind: "expr", before: "y' =", answer: "-\\frac{1}{3}", mistakes: [{ answer: "-\\frac{1}{2}", feedback: "Revisa la derivada de $xy$: es $y + x\\,y'$." }] }],
            solution: ["Derivando: $y + x\\,y' + 2y\\,y' = 0$. En $(1, 1)$: $1 + y' + 2y' = 0$, así que $y' = -\\frac{1}{3}$."],
          },
        },
      ],
    },
  ],
  exercises: [
    segundaPolinomio,
    segundaEnPunto,
    implicitaCirculo,
    vfTecnicas,
    nEsima,
    logaritmicaXX,
    logaritmicaProducto,
    implicitaExpresion,
    implicitaPunto,
    implicitaTangente,
    implicitaExponencial,
    logaritmicaParcial,
    verificarEcuacion,
  ],
};

export default topic;
