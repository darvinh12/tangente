// Parser de un subconjunto de LaTeX (el que produce MathLive) y de notación
// plana tipo calculadora ("sqrt(2)/3", "-inf"). Produce un AST evaluable.

export type Ast =
  | { t: "num"; v: number }
  | { t: "var"; name: string }
  | { t: "const"; name: "pi" | "e" | "inf" }
  | { t: "neg"; a: Ast }
  | { t: "bin"; op: "+" | "-" | "*" | "/" | "^"; a: Ast; b: Ast }
  | { t: "fn"; name: string; a: Ast; base?: Ast }
  | { t: "root"; a: Ast; n: Ast }
  | { t: "abs"; a: Ast }
  | { t: "fact"; a: Ast };

export class ParseError extends Error {}

type Tok =
  | { k: "num"; v: number }
  | { k: "id"; v: string } // letra suelta o nombre de variable con subíndice
  | { k: "cmd"; v: string } // \frac, \sqrt, \ln, ...
  | { k: "op"; v: string } // + - * / ^ _ ! ( ) [ ] { } | ,
  | { k: "word"; v: string }; // palabras planas: sqrt, ln, pi, inf

const WORDS = ["infinito", "infinity", "infty", "sqrt", "raiz", "exp", "log", "ln", "pi", "inf", "oo", "abs"];
const SKIP_CMDS = new Set([
  "left", "right", "mleft", "mright", "bigl", "bigr", "Bigl", "Bigr", "big", "Big",
  "displaystyle", "textstyle", "limits", "nolimits", "quad", "qquad",
]);
const FUNCS = new Set(["ln", "log", "exp", "sin", "cos", "tan", "abs"]);

function tokenize(src: string): Tok[] {
  let s = src
    .replace(/\\placeholder\{[^}]*\}/g, "☐")
    .replace(/\\(?:text|mathrm|operatorname|mathit|textrm)\{([^}]*)\}/g, (_, w) => {
      const word = String(w).trim();
      if (word === "e") return "\\exponentialE ";
      return word.length > 1 ? `\\${word} ` : word;
    })
    .replace(/\{,\}/g, ",")
    .replace(/\\(?:,|;|:|!| )/g, " ")
    .replace(/~/g, " ")
    .replace(/−/g, "-")
    .replace(/·|⋅|×/g, "*")
    .replace(/÷/g, "/")
    .replace(/∞/g, "\\infty ")
    .replace(/π/g, "\\pi ")
    .replace(/√/g, "\\sqrt ");
  if (s.includes("☐")) throw new ParseError("Hay un espacio vacío sin completar.");
  s = s.trim();

  const toks: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c) || (c === "," && /[0-9]/.test(s[i + 1] ?? "") && /[0-9]/.test(s[i - 1] ?? ""))) {
      let j = i;
      let str = "";
      while (j < s.length) {
        const d = s[j];
        if (/[0-9]/.test(d)) { str += d; j++; continue; }
        if ((d === "." || d === ",") && /[0-9]/.test(s[j + 1] ?? "") && !str.includes(".")) {
          str += "."; j++; continue;
        }
        break;
      }
      if (str === "" || str === ".") throw new ParseError("Número mal escrito.");
      toks.push({ k: "num", v: parseFloat(str) });
      i = j;
      continue;
    }
    if (c === "\\") {
      let j = i + 1;
      if (/[a-zA-Z]/.test(s[j] ?? "")) {
        while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
      } else {
        j++;
      }
      const name = s.slice(i + 1, j);
      i = j;
      if (SKIP_CMDS.has(name)) continue;
      if (name === "{" || name === "lbrace") { toks.push({ k: "op", v: "(" }); continue; }
      if (name === "}" || name === "rbrace") { toks.push({ k: "op", v: ")" }); continue; }
      if (name === "lbrack") { toks.push({ k: "op", v: "(" }); continue; }
      if (name === "rbrack") { toks.push({ k: "op", v: ")" }); continue; }
      if (name === "vert" || name === "lvert" || name === "rvert" || name === "mid" || name === "|") {
        toks.push({ k: "op", v: "|" }); continue;
      }
      if (name === "cdot" || name === "times" || name === "ast") { toks.push({ k: "op", v: "*" }); continue; }
      if (name === "div") { toks.push({ k: "op", v: "/" }); continue; }
      toks.push({ k: "cmd", v: name });
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      const rest = s.slice(i).toLowerCase();
      const w = WORDS.find((w) => rest.startsWith(w) && !/[a-z]/i.test(s[i + w.length] ?? ""));
      const wPrefix = WORDS.find((w) => rest.startsWith(w) && (s[i + w.length] === "(" || s[i + w.length] === " "));
      const word = w ?? wPrefix;
      if (word) {
        toks.push({ k: "word", v: word });
        i += word.length;
        continue;
      }
      toks.push({ k: "id", v: c });
      i++;
      continue;
    }
    if ("+-*/^_!()[]{}|,".includes(c)) {
      toks.push({ k: "op", v: c });
      i++;
      continue;
    }
    if (c === "'" ) throw new ParseError("No uses comillas en la respuesta.");
    throw new ParseError(`No reconozco el símbolo "${c}".`);
  }
  return toks;
}

class Parser {
  private p = 0;
  private absDepth = 0;
  constructor(private toks: Tok[], private constE: boolean) {}

  private peek(o = 0): Tok | undefined { return this.toks[this.p + o]; }
  private isOp(v: string, o = 0) { const t = this.peek(o); return !!t && t.k === "op" && t.v === v; }
  private eat(v: string) {
    if (!this.isOp(v)) throw new ParseError(`Falta "${v === "}" || v === ")" ? ")" : v}".`);
    this.p++;
  }

  parse(): Ast {
    if (this.toks.length === 0) throw new ParseError("La respuesta está vacía.");
    const e = this.sum();
    if (this.p < this.toks.length) throw new ParseError("Hay algo de más al final de la expresión.");
    return e;
  }

  private sum(): Ast {
    let a = this.product();
    while (this.isOp("+") || this.isOp("-")) {
      const op = (this.peek() as { v: string }).v as "+" | "-";
      this.p++;
      const b = this.product();
      a = { t: "bin", op, a, b };
    }
    return a;
  }

  private startsAtom(): boolean {
    const t = this.peek();
    if (!t) return false;
    if (t.k === "num" || t.k === "id" || t.k === "word") return true;
    if (t.k === "cmd") return !["right", "end"].includes(t.v);
    if (t.k === "op") {
      if (t.v === "(" || t.v === "[" || t.v === "{") return true;
      if (t.v === "|") return this.absDepth === 0;
    }
    return false;
  }

  private product(): Ast {
    let a = this.unary();
    for (;;) {
      if (this.isOp("*") || this.isOp("/")) {
        const op = (this.peek() as { v: string }).v as "*" | "/";
        this.p++;
        const b = this.unary();
        a = { t: "bin", op, a, b };
      } else if (this.startsAtom()) {
        const b = this.power();
        a = { t: "bin", op: "*", a, b };
      } else break;
    }
    return a;
  }

  private unary(): Ast {
    if (this.isOp("-")) { this.p++; return { t: "neg", a: this.unary() }; }
    if (this.isOp("+")) { this.p++; return this.unary(); }
    return this.power();
  }

  private power(): Ast {
    let base = this.postfix();
    if (this.isOp("^")) {
      this.p++;
      const exp = this.isOp("-") ? (this.p++, { t: "neg", a: this.power() } as Ast) : this.exponent();
      base = { t: "bin", op: "^", a: base, b: exp };
    }
    return base;
  }

  private exponent(): Ast {
    // Exponente: grupo {..}, o un solo átomo (x^2, e^x)
    if (this.isOp("{")) return this.group();
    return this.power();
  }

  private postfix(): Ast {
    let a = this.atom();
    while (this.isOp("!")) { this.p++; a = { t: "fact", a }; }
    return a;
  }

  private group(): Ast {
    this.eat("{");
    if (this.isOp("}")) throw new ParseError("Hay un espacio vacío sin completar.");
    const saved = this.absDepth;
    this.absDepth = 0;
    const e = this.sum();
    this.absDepth = saved;
    this.eat("}");
    return e;
  }

  private arg(): Ast {
    // Argumento de función sin paréntesis: \ln x, \ln 2x se toma como ln(2)*x
    if (this.isOp("(") || this.isOp("[") || this.isOp("{")) return this.paren();
    return this.power();
  }

  private paren(): Ast {
    const t = this.peek() as { k: "op"; v: string };
    const close = t.v === "(" ? ")" : t.v === "[" ? "]" : "}";
    this.p++;
    const saved = this.absDepth;
    this.absDepth = 0;
    const e = this.sum();
    this.absDepth = saved;
    if (close === "}" && this.isOp(")")) { this.p++; return e; }
    if (!this.isOp(close)) {
      if (close === "]" && this.isOp(")")) { this.p++; return e; }
      throw new ParseError("Falta cerrar un paréntesis.");
    }
    this.p++;
    return e;
  }

  private fnApply(name: string): Ast {
    let base: Ast | undefined;
    if (name === "log" && this.isOp("_")) {
      this.p++;
      base = this.isOp("{") ? this.group() : this.atom();
    }
    let powerOfFn: Ast | undefined;
    if (this.isOp("^")) {
      this.p++;
      powerOfFn = this.isOp("{") ? this.group() : this.atom();
    }
    const a = this.arg();
    let r: Ast = name === "abs" ? { t: "abs", a } : { t: "fn", name, a, base };
    if (powerOfFn) r = { t: "bin", op: "^", a: r, b: powerOfFn };
    return r;
  }

  private atom(): Ast {
    const t = this.peek();
    if (!t) throw new ParseError("La expresión está incompleta.");
    if (t.k === "num") { this.p++; return { t: "num", v: t.v }; }
    if (t.k === "op") {
      if (t.v === "(" || t.v === "[" || t.v === "{") return this.paren();
      if (t.v === "|" && this.absDepth === 0) {
        this.p++;
        this.absDepth++;
        const e = this.sum();
        this.absDepth--;
        this.eat("|");
        return { t: "abs", a: e };
      }
      throw new ParseError("La expresión está incompleta o tiene un operador de más.");
    }
    if (t.k === "word") {
      this.p++;
      const w = t.v;
      if (w === "pi") return { t: "const", name: "pi" };
      if (["inf", "oo", "infty", "infinity", "infinito"].includes(w)) return { t: "const", name: "inf" };
      if (w === "sqrt" || w === "raiz") return { t: "root", a: this.arg(), n: { t: "num", v: 2 } };
      return this.fnApply(w);
    }
    if (t.k === "id") {
      this.p++;
      let name = t.v;
      if (this.isOp("_")) {
        this.p++;
        const sub = this.peek();
        if (this.isOp("{")) {
          this.p++;
          let s = "";
          while (this.peek() && !this.isOp("}")) {
            const q = this.peek() as Tok;
            s += String((q as { v: string | number }).v);
            this.p++;
          }
          this.eat("}");
          name += "_" + s;
        } else if (sub) {
          name += "_" + String((sub as { v: string | number }).v);
          this.p++;
        }
      }
      if (name === "e" && this.constE) return { t: "const", name: "e" };
      return { t: "var", name };
    }
    // comandos
    this.p++;
    switch (t.v) {
      case "frac": case "dfrac": case "tfrac": case "cfrac": {
        const a = this.group();
        const b = this.group();
        return { t: "bin", op: "/", a, b };
      }
      case "sqrt": {
        let n: Ast = { t: "num", v: 2 };
        if (this.isOp("[")) {
          this.p++;
          n = this.sum();
          this.eat("]");
        }
        const a = this.isOp("{") ? this.group() : this.arg();
        return { t: "root", a, n };
      }
      case "pi": return { t: "const", name: "pi" };
      case "infty": case "infin": return { t: "const", name: "inf" };
      case "exponentialE": return { t: "const", name: "e" };
      case "exp": case "ln": case "log": case "sin": case "cos": case "tan":
        return this.fnApply(t.v);
      case "abs":
        return this.fnApply("abs");
      default:
        if (FUNCS.has(t.v)) return this.fnApply(t.v);
        throw new ParseError(`No reconozco "\\${t.v}".`);
    }
  }
}

export interface ParseOptions {
  /** Variables permitidas. Si "e" está aquí, se trata como variable y no como el número e. */
  vars?: string[];
}

export function parse(src: string, opts: ParseOptions = {}): Ast {
  const constE = !(opts.vars ?? []).includes("e");
  const ast = new Parser(tokenize(src), constE).parse();
  if (opts.vars) {
    const used = freeVars(ast);
    const bad = used.filter((v) => !opts.vars!.includes(v));
    if (bad.length) {
      throw new ParseError(
        `La respuesta usa ${bad.map((b) => `"${b}"`).join(", ")}, que no aparece en el ejercicio.`,
      );
    }
  }
  return ast;
}

export function freeVars(a: Ast, acc: Set<string> = new Set()): string[] {
  switch (a.t) {
    case "var": acc.add(a.name); break;
    case "neg": case "abs": case "fact": freeVars(a.a, acc); break;
    case "bin": freeVars(a.a, acc); freeVars(a.b, acc); break;
    case "fn": freeVars(a.a, acc); if (a.base) freeVars(a.base, acc); break;
    case "root": freeVars(a.a, acc); freeVars(a.n, acc); break;
  }
  return [...acc];
}

function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export function evaluate(a: Ast, scope: Record<string, number> = {}): number {
  switch (a.t) {
    case "num": return a.v;
    case "var": {
      const v = scope[a.name];
      if (v === undefined) return NaN;
      return v;
    }
    case "const": return a.name === "pi" ? Math.PI : a.name === "e" ? Math.E : Infinity;
    case "neg": return -evaluate(a.a, scope);
    case "abs": return Math.abs(evaluate(a.a, scope));
    case "fact": return factorial(evaluate(a.a, scope));
    case "root": {
      const x = evaluate(a.a, scope);
      const n = evaluate(a.n, scope);
      if (n === 2) return Math.sqrt(x);
      if (x < 0 && Number.isInteger(n) && n % 2 === 1) return -Math.pow(-x, 1 / n);
      return Math.pow(x, 1 / n);
    }
    case "fn": {
      const x = evaluate(a.a, scope);
      switch (a.name) {
        case "ln": return x > 0 ? Math.log(x) : NaN;
        case "log": {
          if (x <= 0) return NaN;
          const b = a.base ? evaluate(a.base, scope) : 10;
          return Math.log(x) / Math.log(b);
        }
        case "exp": return Math.exp(x);
        case "sin": return Math.sin(x);
        case "cos": return Math.cos(x);
        case "tan": return Math.tan(x);
        case "abs": return Math.abs(x);
      }
      return NaN;
    }
    case "bin": {
      const x = evaluate(a.a, scope);
      const y = evaluate(a.b, scope);
      switch (a.op) {
        case "+": return x + y;
        case "-": return x - y;
        case "*": return x * y;
        case "/": return x / y;
        case "^": {
          if (x < 0 && !Number.isInteger(y)) {
            // raíz impar de negativo: (-8)^(1/3)
            const inv = 1 / y;
            const k = Math.round(inv);
            if (Math.abs(inv - k) < 1e-9 && k % 2 !== 0) return -Math.pow(-x, y);
            return NaN;
          }
          return Math.pow(x, y);
        }
      }
    }
  }
}

/** Compila una expresión LaTeX a función de una variable (para graficar). */
export function compile(src: string, v = "x", extra: Record<string, number> = {}): (x: number) => number {
  const vars = [v, ...Object.keys(extra)];
  let ast: Ast;
  try {
    ast = parse(src, { vars });
  } catch {
    return () => NaN;
  }
  return (x: number) => evaluate(ast, { ...extra, [v]: x });
}

/** Cantidad de operaciones binarias, útil para exigir una forma simplificada. */
export function opCount(a: Ast): number {
  switch (a.t) {
    case "bin": return 1 + opCount(a.a) + opCount(a.b);
    case "neg": case "abs": case "fact": return opCount(a.a);
    case "fn": return 1 + opCount(a.a);
    case "root": return 1 + opCount(a.a);
    default: return 0;
  }
}
