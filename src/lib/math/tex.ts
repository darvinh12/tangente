// Utilidades para escribir LaTeX limpio desde los generadores de ejercicios.
// Todas devuelven LaTeX sin delimitadores $...$.

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

/** Número con coma decimal al estilo venezolano: 2.5 -> 2{,}5 */
export function num(n: number, decimals = 4): string {
  if (!Number.isFinite(n)) return n > 0 ? "\\infty" : n < 0 ? "-\\infty" : "\\text{indef.}";
  const r = Math.round(n * 10 ** decimals) / 10 ** decimals;
  const s = String(r);
  return s.replace(".", "{,}");
}

/** Fracción reducida p/q como LaTeX. frac(6, -4) -> -\frac{3}{2} */
export function frac(p: number, q = 1): string {
  if (q === 0) throw new Error("denominador cero");
  if (!Number.isInteger(p) || !Number.isInteger(q)) return num(p / q);
  const g = gcd(p, q);
  let a = p / g;
  let b = q / g;
  if (b < 0) {
    a = -a;
    b = -b;
  }
  if (b === 1) return String(a);
  return `${a < 0 ? "-" : ""}\\frac{${Math.abs(a)}}{${b}}`;
}

/** Aproxima un real por una fracción de denominador pequeño y la escribe. */
export function rat(x: number, maxDen = 1000): string {
  if (!Number.isFinite(x)) return num(x);
  if (Number.isInteger(x)) return String(x);
  let best: [number, number] = [Math.round(x), 1];
  for (let d = 1; d <= maxDen; d++) {
    const n = Math.round(x * d);
    if (Math.abs(n / d - x) < 1e-9) {
      best = [n, d];
      break;
    }
  }
  return frac(best[0], best[1]);
}

/** Coeficiente delante de una variable: 1 -> "", -1 -> "-", 3 -> "3" */
function coefPrefix(c: string): string {
  if (c === "1") return "";
  if (c === "-1") return "-";
  return c;
}

/**
 * Polinomio a partir de coeficientes de mayor a menor grado.
 * poly([1, -3, 2]) -> "x^{2} - 3x + 2"
 */
export function poly(coefs: number[], v = "x"): string {
  const deg = coefs.length - 1;
  const terms: string[] = [];
  coefs.forEach((c, i) => {
    const p = deg - i;
    if (c === 0) return;
    const abs = Math.abs(c);
    const cs = Number.isInteger(abs) ? String(abs) : rat(abs);
    let body: string;
    if (p === 0) body = cs;
    else {
      const pre = abs === 1 ? "" : cs;
      body = `${pre}${v}${p === 1 ? "" : `^{${p}}`}`;
    }
    if (terms.length === 0) terms.push(c < 0 ? `-${body}` : body);
    else terms.push(c < 0 ? `- ${body}` : `+ ${body}`);
  });
  return terms.length ? terms.join(" ") : "0";
}

/**
 * Suma de términos con signos limpios. Cada término es [coeficiente, parte literal].
 * terms([[2, "x"], [-1, "\\sqrt{x}"], [5, ""]]) -> "2x - \sqrt{x} + 5"
 */
export function terms(list: [number, string][]): string {
  const out: string[] = [];
  for (const [c, lit] of list) {
    if (c === 0) continue;
    const abs = Math.abs(c);
    const cs = Number.isInteger(abs) ? String(abs) : rat(abs);
    const body = lit === "" ? cs : `${abs === 1 ? "" : cs}${lit}`;
    if (out.length === 0) out.push(c < 0 ? `-${body}` : body);
    else out.push(c < 0 ? `- ${body}` : `+ ${body}`);
  }
  return out.length ? out.join(" ") : "0";
}

/** "x - 3", "x + 2", "x" para (x - a) */
export function minus(v: string, a: number): string {
  if (a === 0) return v;
  return a > 0 ? `${v} - ${fmt(a)}` : `${v} + ${fmt(-a)}`;
}

/** Escribe un número como entero o fracción. */
export function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : rat(n);
}

/** Número con signo explícito: 3 -> "+ 3", -3 -> "- 3" */
export function signed(n: number): string {
  return n < 0 ? `- ${fmt(-n)}` : `+ ${fmt(n)}`;
}

/** Envuelve en paréntesis si es negativo: -3 -> "(-3)" */
export function paren(n: number): string {
  return n < 0 ? `(${fmt(n)})` : fmt(n);
}

/** Coeficiente pegado a algo: coef(1,"x")="x", coef(-1,"x")="-x", coef(3,"x")="3x" */
export function coef(c: number, lit: string): string {
  return `${coefPrefix(fmt(c))}${lit}`;
}

/** Intervalo como LaTeX. */
export function interval(lo: number, hi: number, loClosed: boolean, hiClosed: boolean): string {
  const l = Number.isFinite(lo) ? fmt(lo) : "-\\infty";
  const h = Number.isFinite(hi) ? fmt(hi) : "+\\infty";
  return `${loClosed && Number.isFinite(lo) ? "[" : "("}${l}, ${h}${hiClosed && Number.isFinite(hi) ? "]" : ")"}`;
}

/** Función a trozos. cases([["x^2", "x < 0"], ["2x", "x \\ge 0"]]) */
export function cases(rows: [string, string][]): string {
  return `\\begin{cases} ${rows.map(([e, c]) => `${e} & \\text{si } ${c}`).join(" \\\\ ")} \\end{cases}`;
}
