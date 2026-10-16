import type { Part, Rich } from "@/content/types";
import {
  diagnoseUnion, equivalentAst, type Interval, parseEndpoint, parseFiniteSet, sameFiniteSet, sameUnion, tryParse,
} from "@/lib/math/check";
import { evaluate, opCount } from "@/lib/math/parse";

/* Valor que guarda cada tipo de casilla */
export interface IntervalRow {
  lo: string;
  hi: string;
  loClosed: boolean;
  hiClosed: boolean;
}

export type PartValue =
  | { kind: "choice"; selected: number[] }
  | { kind: "expr"; latex: string }
  | { kind: "interval"; rows: IntervalRow[]; empty: boolean }
  | { kind: "set"; text: string }
  | { kind: "point"; at: [number, number] | null };

export type Verdict =
  /** Bien. */
  | { status: "correct"; message?: Rich }
  /** Mal, con explicación. */
  | { status: "wrong"; message: Rich }
  /** No se pudo leer: no cuenta como intento. */
  | { status: "invalid"; message: Rich };

export function emptyValue(p: Part): PartValue {
  switch (p.kind) {
    case "choice": return { kind: "choice", selected: [] };
    case "expr": return { kind: "expr", latex: "" };
    case "interval": return { kind: "interval", rows: [{ lo: "", hi: "", loClosed: false, hiClosed: false }], empty: false };
    case "set": return { kind: "set", text: "" };
    case "point": return { kind: "point", at: p.start ?? null };
  }
}

export function isBlank(v: PartValue): boolean {
  switch (v.kind) {
    case "choice": return v.selected.length === 0;
    case "expr": return v.latex.trim() === "";
    case "interval": return !v.empty && v.rows.every((r) => !r.lo.trim() && !r.hi.trim());
    case "set": return v.text.trim() === "";
    case "point": return v.at === null;
  }
}

export function rowsToIntervals(rows: IntervalRow[]): { ok: true; set: Interval[] } | { ok: false; message: string } {
  const out: Interval[] = [];
  for (const [i, r] of rows.entries()) {
    if (!r.lo.trim() && !r.hi.trim()) continue;
    const lo = parseEndpoint(r.lo);
    const hi = parseEndpoint(r.hi);
    const n = rows.length > 1 ? ` del tramo ${i + 1}` : "";
    if (lo === null) return { ok: false, message: `No entiendo el extremo izquierdo${n}. Escribe un número, una fracción como 1/2, o -inf.` };
    if (hi === null) return { ok: false, message: `No entiendo el extremo derecho${n}. Escribe un número, una fracción como 1/2, o inf.` };
    if (lo > hi) return { ok: false, message: `En el tramo${n} el extremo izquierdo es mayor que el derecho. El número pequeño va primero.` };
    if (lo === Infinity || hi === -Infinity) return { ok: false, message: "Revisa el infinito: a la izquierda va -inf y a la derecha inf." };
    if ((r.loClosed && !Number.isFinite(lo)) || (r.hiClosed && !Number.isFinite(hi))) {
      return { ok: false, message: "Junto al infinito siempre va paréntesis, nunca corchete. El infinito no se alcanza." };
    }
    if (lo === hi && !(r.loClosed && r.hiClosed)) {
      return { ok: false, message: "Un intervalo con los dos extremos iguales solo tiene sentido cerrado, como [3, 3] = {3}." };
    }
    out.push({ lo, hi, loClosed: r.loClosed, hiClosed: r.hiClosed });
  }
  return { ok: true, set: out };
}

function numericHint(user: number, answer: number): string | null {
  if (!Number.isFinite(user) || !Number.isFinite(answer)) return null;
  if (answer !== 0 && Math.abs(user + answer) < 1e-9 * Math.max(1, Math.abs(answer))) {
    return "Tienes el número correcto pero con el signo cambiado. Revisa los signos.";
  }
  if (answer !== 0 && Math.abs(user - answer) / Math.abs(answer) < 0.02) {
    return "Estás muy cerca. Revisa si redondeaste antes de tiempo o si faltó un detalle. Puedes escribir el valor exacto como fracción.";
  }
  if (answer !== 0 && user !== 0 && Math.abs(user * answer - 1) < 1e-9) {
    return "Te dio el inverso de la respuesta. Revisa si volteaste una fracción.";
  }
  return null;
}

export function gradePart(p: Part, v: PartValue): Verdict {
  switch (p.kind) {
    case "choice": {
      if (v.kind !== "choice" || v.selected.length === 0) return { status: "invalid", message: "Elige una opción." };
      if (p.multiple) {
        const correct = p.options.map((o, i) => (o.correct ? i : -1)).filter((i) => i >= 0);
        const sel = new Set(v.selected);
        const missing = correct.filter((i) => !sel.has(i));
        const extra = v.selected.filter((i) => !p.options[i].correct);
        if (!missing.length && !extra.length) return { status: "correct" };
        const fb = extra.map((i) => p.options[i].feedback).find(Boolean);
        if (fb) return { status: "wrong", message: fb };
        return {
          status: "wrong",
          message: missing.length && !extra.length
            ? "Lo que marcaste está bien, pero falta al menos una opción correcta."
            : "Marcaste al menos una opción que no es correcta.",
        };
      }
      const o = p.options[v.selected[0]];
      if (o?.correct) return { status: "correct", message: o.feedback };
      return { status: "wrong", message: o?.feedback ?? "Esa no es. Vuelve a leer el enunciado y descarta opciones." };
    }

    case "expr": {
      if (v.kind !== "expr") return { status: "invalid", message: "Escribe tu respuesta." };
      const raw = v.latex.trim();
      if (!raw) return { status: "invalid", message: "Escribe tu respuesta." };
      if (raw === "dne") {
        return p.answer === "dne"
          ? { status: "correct" }
          : { status: "wrong", message: "El límite sí existe. Revisa con calma: calcula los límites laterales." };
      }
      if (p.answer === "dne") {
        return { status: "wrong", message: "Ese valor no es. Fíjate si los dos límites laterales coinciden: si no coinciden, el límite no existe." };
      }
      const userP = tryParse(raw, p.vars);
      if (userP.error || !userP.ast) return { status: "invalid", message: userP.error ?? "No pude leer la respuesta." };
      const answers = [p.answer, ...(p.accept ?? [])];
      const opts = { vars: p.vars, domain: p.domain, tol: p.tol };
      const ok = answers.some((a) => {
        const ap = tryParse(a, p.vars);
        return ap.ast ? equivalentAst(userP.ast!, ap.ast, opts) : false;
      });
      if (ok) {
        if (p.maxOps !== undefined && opCount(userP.ast) > p.maxOps) {
          return { status: "wrong", message: "El valor es correcto, pero falta terminar de simplificar. Escribe el resultado lo más reducido posible." };
        }
        if (p.validate) {
          const msg = p.validate(userP.ast, raw);
          if (msg) return { status: "wrong", message: msg };
        }
        return { status: "correct" };
      }
      for (const m of p.mistakes ?? []) {
        const mp = tryParse(m.answer, p.vars);
        if (mp.ast && equivalentAst(userP.ast, mp.ast, opts)) return { status: "wrong", message: m.feedback };
      }
      if (!(p.vars ?? []).length) {
        const ans = tryParse(p.answer, p.vars).ast;
        if (ans) {
          const hint = numericHint(evaluate(userP.ast), evaluate(ans));
          if (hint) return { status: "wrong", message: hint };
          if (!Number.isFinite(evaluate(ans)) && Number.isFinite(evaluate(userP.ast))) {
            return { status: "wrong", message: "No da un número finito. Analiza el signo de lo que pasa cerca del punto." };
          }
        }
      }
      return { status: "wrong", message: "No es correcto todavía. Revisa tu procedimiento o pide una pista." };
    }

    case "interval": {
      if (v.kind !== "interval") return { status: "invalid", message: "Completa el intervalo." };
      let user: Interval[];
      if (v.empty) user = [];
      else {
        const r = rowsToIntervals(v.rows);
        if (!r.ok) return { status: "invalid", message: r.message };
        user = r.set;
        if (!user.length) return { status: "invalid", message: "Completa al menos un intervalo, o marca conjunto vacío." };
      }
      if (sameUnion(user, p.answer)) return { status: "correct" };
      for (const m of p.mistakes ?? []) if (sameUnion(user, m.answer)) return { status: "wrong", message: m.feedback };
      if (p.answer.length === 0) return { status: "wrong", message: "Revisa bien. ¿Hay algún número que cumpla la condición?" };
      if (user.length === 0) return { status: "wrong", message: "El conjunto no es vacío. Sí hay números que cumplen." };
      return { status: "wrong", message: diagnoseUnion(user, p.answer) ?? "Los extremos no son los correctos. Revisa tu procedimiento." };
    }

    case "set": {
      if (v.kind !== "set") return { status: "invalid", message: "Escribe los elementos." };
      const user = parseFiniteSet(v.text);
      if (user === null) return { status: "invalid", message: "Escribe los elementos separados por comas, por ejemplo 1, 2, 3." };
      const answer = p.answer.map(String);
      if (sameFiniteSet(user, answer)) return { status: "correct" };
      for (const m of p.mistakes ?? []) if (sameFiniteSet(user, m.answer.map(String))) return { status: "wrong", message: m.feedback };
      const A = new Set(parseFiniteSet(answer.join(","))!);
      const extra = user.filter((x) => !A.has(x));
      const missing = [...A].filter((x) => !user.includes(x));
      if (!extra.length && missing.length) return { status: "wrong", message: `Lo que pusiste está bien, pero ${missing.length === 1 ? "falta un elemento" : `faltan ${missing.length} elementos`}.` };
      if (extra.length && !missing.length) return { status: "wrong", message: `Sobra${extra.length === 1 ? " un elemento" : `n ${extra.length} elementos`}. Revisa cuál no cumple la condición.` };
      return { status: "wrong", message: "Hay elementos que sobran y otros que faltan. Revisa la condición elemento por elemento." };
    }

    case "point": {
      if (v.kind !== "point" || !v.at) return { status: "invalid", message: "Coloca el punto en el plano." };
      const [x, y] = v.at;
      const [ax, ay] = p.answer;
      if (Math.abs(x - ax) < 1e-6 && Math.abs(y - ay) < 1e-6) return { status: "correct" };
      if (Math.abs(x - ay) < 1e-6 && Math.abs(y - ax) < 1e-6) {
        return { status: "wrong", message: "Intercambiaste las coordenadas. Primero va x (horizontal) y después y (vertical)." };
      }
      if (Math.abs(x - ax) < 1e-6) return { status: "wrong", message: "La coordenada x está bien, revisa la y." };
      if (Math.abs(y - ay) < 1e-6) return { status: "wrong", message: "La coordenada y está bien, revisa la x." };
      return { status: "wrong", message: "Ese no es el punto. Revisa las dos coordenadas." };
    }
  }
}

/** Texto legible de la respuesta correcta, para mostrar al rendirse o en el simulacro. */
export function answerText(p: Part): Rich {
  switch (p.kind) {
    case "choice": return p.options.filter((o) => o.correct).map((o) => o.label).join(" · ");
    case "expr": {
      if (p.answer === "dne") return "No existe";
      return `$${p.before ? p.before + " " : ""}${p.answer}${p.after ? " " + p.after : ""}$`;
    }
    case "interval": {
      if (!p.answer.length) return "$\\varnothing$";
      const s = p.answer
        .map((I) => {
          if (I.lo === I.hi) return `\\{${fmtNum(I.lo)}\\}`;
          const l = Number.isFinite(I.lo) ? fmtNum(I.lo) : "-\\infty";
          const h = Number.isFinite(I.hi) ? fmtNum(I.hi) : "+\\infty";
          return `${I.loClosed ? "[" : "("}${l}, ${h}${I.hiClosed ? "]" : ")"}`;
        })
        .join(" \\cup ");
      return `$${p.before ? p.before + " " : ""}${s}$`;
    }
    case "set": return `$${p.before ? p.before + " " : ""}${p.answer.length ? `\\{${p.answer.join(", ")}\\}` : "\\varnothing"}$`;
    case "point": return `$(${fmtNum(p.answer[0])}, ${fmtNum(p.answer[1])})$`;
  }
}

function fmtNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  for (let d = 2; d <= 64; d++) {
    const k = Math.round(n * d);
    if (Math.abs(k / d - n) < 1e-9) return `${k < 0 ? "-" : ""}\\frac{${Math.abs(k)}}{${d}}`;
  }
  return String(Math.round(n * 1000) / 1000).replace(".", "{,}");
}
