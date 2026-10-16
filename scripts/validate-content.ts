// Valida los temas de src/content/topics.
// Uso: npx tsx scripts/validate-content.ts [slug ...]
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import katex from "katex";
import type { Block, Exercise, GraphSpec, Part, Topic, Widget } from "../src/content/types";
import { TOPICS } from "../src/content/catalog";
import { mathOf } from "../src/lib/rich";
import { parse, evaluate, opCount, type Ast } from "../src/lib/math/parse";
import { equivalentAst } from "../src/lib/math/check";
import { makeRng } from "../src/lib/math/rng";

const SEEDS = 60;
const dir = path.join(process.cwd(), "src", "content", "topics");
const args = process.argv.slice(2);
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ts"));
const slugs = args.length ? args : files.map((f) => f.replace(/\.ts$/, ""));

let errors = 0;
let warnings = 0;
const seen = new Set<string>();
function err(where: string, msg: string) {
  const key = where.replace(/seed \d+/, "") + msg;
  if (seen.has(key)) return;
  seen.add(key);
  errors++;
  console.log(`  ERROR  ${where}: ${msg}`);
}
function warn(where: string, msg: string) {
  const key = where.replace(/seed \d+/, "") + msg;
  if (seen.has(key)) return;
  seen.add(key);
  warnings++;
  console.log(`  aviso  ${where}: ${msg}`);
}

function checkTex(where: string, tex: string, display = false) {
  try {
    katex.renderToString(tex, { throwOnError: true, displayMode: display, strict: "ignore", trust: false });
  } catch (e) {
    err(where, `LaTeX inválido "${tex}": ${(e as Error).message.split("\n")[0]}`);
  }
}

function checkRich(where: string, s: string | undefined) {
  if (s === undefined) return;
  if (typeof s !== "string") return err(where, "se esperaba texto");
  if (/—/.test(s)) err(where, `usa guion largo (—): "${s.slice(0, 60)}"`);
  if (/[«»]/.test(s)) err(where, "usa comillas angulares");
  const dollars = (s.match(/(?<!\\)\$/g) ?? []).length;
  if (dollars % 2 !== 0) err(where, `cantidad impar de $ en "${s.slice(0, 80)}"`);
  for (const m of mathOf(s)) checkTex(where, m.tex, m.display);
}

function checkFn(where: string, fn: string, vars: string[], range: [number, number]) {
  let ast: Ast;
  try {
    ast = parse(fn, { vars });
  } catch (e) {
    return err(where, `la función "${fn}" no se puede interpretar: ${(e as Error).message}`);
  }
  checkTex(where, fn);
  if (vars.length === 1) {
    let finite = 0;
    for (let i = 0; i <= 40; i++) {
      const x = range[0] + ((range[1] - range[0]) * i) / 40 + 1e-7;
      if (Number.isFinite(evaluate(ast, { [vars[0]]: x }))) finite++;
    }
    if (finite === 0) err(where, `la función "${fn}" no toma valores en el rango visible`);
  }
}

function checkGraph(where: string, g: GraphSpec | undefined) {
  if (!g) return;
  if (!(g.x[0] < g.x[1]) || !(g.y[0] < g.y[1])) err(where, "rango de gráfica inválido");
  for (const c of g.curves ?? []) checkFn(`${where} curva`, c.fn, ["x"], c.domain ?? g.x);
  for (const l of g.labels ?? []) checkRich(`${where} etiqueta`, l.text);
}

function checkWidget(where: string, w: Widget) {
  switch (w.kind) {
    case "sliders": {
      const scope = Object.fromEntries(w.params.map((p) => [p.name, p.value]));
      try {
        const ast = parse(w.fn, { vars: ["x", ...w.params.map((p) => p.name)] });
        let ok = false;
        for (let i = 0; i <= 40; i++) {
          const x = w.x[0] + ((w.x[1] - w.x[0]) * i) / 40;
          if (Number.isFinite(evaluate(ast, { ...scope, x }))) ok = true;
        }
        if (!ok) err(where, `sliders: "${w.fn}" no toma valores`);
      } catch (e) {
        err(where, `sliders: "${w.fn}" no se puede interpretar: ${(e as Error).message}`);
      }
      for (const p of w.params) if (p.value < p.min || p.value > p.max) err(where, `parámetro ${p.name} fuera de rango`);
      if (w.formula) {
        let f = w.formula;
        for (const p of w.params) f = f.split(`{${p.name}}`).join(String(p.value));
        checkTex(where, f);
      }
      for (const c of w.reference ?? []) checkFn(where, c.fn, ["x"], w.x);
      break;
    }
    case "limit": case "secant": case "tangent":
      checkFn(where, w.fn, ["x"], w.x);
      if (w.kind === "tangent" && w.derivative) checkFn(where, w.derivative, ["x"], w.x);
      break;
    case "machine":
      for (const f of w.fns) checkFn(where, f.tex, ["x"], [-5, 5]);
      break;
    case "mapping":
      for (const [i, j] of w.arrows) if (!w.domain[i] || !w.codomain[j]) err(where, "flecha fuera de rango");
      break;
    case "numberline": case "venn":
      break;
    default:
      err(where, `widget desconocido ${(w as { kind: string }).kind}`);
  }
}

function checkBlock(where: string, b: Block) {
  switch (b.type) {
    case "text": return checkRich(where, b.md);
    case "heading": return checkRich(where, b.text);
    case "definition": checkRich(where, b.title); return checkRich(where, b.md);
    case "note": checkRich(where, b.title); return checkRich(where, b.md);
    case "example":
      checkRich(where, b.title); checkRich(where, b.problem); b.steps.forEach((s) => checkRich(where, s)); checkRich(where, b.answer);
      if (!b.steps.length) err(where, "ejemplo sin pasos");
      return;
    case "graph": checkGraph(where, b.spec); return checkRich(where, b.caption);
    case "widget": checkWidget(where, b.widget); return checkRich(where, b.caption);
    case "table":
      b.headers.forEach((h) => checkRich(where, h));
      b.rows.forEach((r) => { r.forEach((c) => checkRich(where, c)); if (r.length !== b.headers.length) err(where, "fila de tabla con columnas de más o de menos"); });
      return checkRich(where, b.caption);
    case "quick": return checkExercise(`${where} quick`, b.exercise);
    default: err(where, `bloque desconocido ${(b as { type: string }).type}`);
  }
}

function checkPart(where: string, p: Part) {
  checkRich(where, p.prompt);
  switch (p.kind) {
    case "choice": {
      if (p.options.length < 2) err(where, "choice con menos de 2 opciones");
      const correct = p.options.filter((o) => o.correct).length;
      if (correct === 0) err(where, "choice sin opción correcta");
      if (!p.multiple && correct > 1) err(where, "choice con varias correctas sin multiple: true");
      const labels = p.options.map((o) => o.label);
      if (new Set(labels).size !== labels.length) err(where, `opciones repetidas: ${labels.join(" | ")}`);
      p.options.forEach((o) => { checkRich(where, o.label); checkRich(where, o.feedback); checkGraph(where, o.graph); });
      break;
    }
    case "expr": {
      if (p.before) checkTex(where, p.before);
      if (p.after) checkTex(where, p.after);
      if (p.answer === "dne") {
        if (!p.special?.includes("dne")) err(where, 'respuesta "dne" sin special: ["dne"]');
        break;
      }
      let ans: Ast;
      try {
        ans = parse(p.answer, { vars: p.vars });
      } catch (e) {
        err(where, `respuesta "${p.answer}" no se puede interpretar: ${(e as Error).message}`);
        break;
      }
      checkTex(where, p.answer);
      const v = evaluate(ans, Object.fromEntries((p.vars ?? []).map((x) => [x, 1.37])));
      if (!(p.vars ?? []).length && Number.isNaN(v)) err(where, `respuesta "${p.answer}" no da un número`);
      if (!(p.vars ?? []).length && !Number.isFinite(v) && !(p.special ?? []).some((s) => s === "inf" || s === "-inf")) {
        err(where, `respuesta infinita "${p.answer}" sin special inf/-inf`);
      }
      if (p.maxOps !== undefined && opCount(ans) > p.maxOps) err(where, `la propia respuesta "${p.answer}" supera maxOps=${p.maxOps}`);
      if (p.validate) {
        const msg = p.validate(ans, p.answer);
        if (msg) err(where, `validate rechaza la respuesta correcta: ${msg}`);
      }
      for (const m of p.mistakes ?? []) {
        checkRich(where, m.feedback);
        try {
          const mast = parse(m.answer, { vars: p.vars });
          if (equivalentAst(mast, ans, { vars: p.vars, domain: p.domain, tol: p.tol })) {
            err(where, `el error típico "${m.answer}" es equivalente a la respuesta "${p.answer}"`);
          }
        } catch (e) {
          err(where, `error típico "${m.answer}" no se puede interpretar: ${(e as Error).message}`);
        }
      }
      for (const a of p.accept ?? []) {
        try { parse(a, { vars: p.vars }); } catch { err(where, `accept "${a}" no se puede interpretar`); }
      }
      break;
    }
    case "interval": {
      if (p.before) checkTex(where, p.before);
      for (const I of p.answer) {
        if (Number.isNaN(I.lo) || Number.isNaN(I.hi) || I.lo > I.hi) err(where, `intervalo inválido ${JSON.stringify(I)}`);
      }
      p.mistakes?.forEach((m) => checkRich(where, m.feedback));
      break;
    }
    case "set": {
      if (p.before) checkTex(where, p.before);
      p.mistakes?.forEach((m) => checkRich(where, m.feedback));
      break;
    }
    case "point": {
      checkGraph(where, p.graph);
      const [x, y] = p.answer;
      if (x < p.graph.x[0] || x > p.graph.x[1] || y < p.graph.y[0] || y > p.graph.y[1]) err(where, "el punto respuesta queda fuera de la gráfica");
      const s = p.snap ?? 1;
      if (Math.abs(x / s - Math.round(x / s)) > 1e-9 || Math.abs(y / s - Math.round(y / s)) > 1e-9) err(where, "el punto respuesta no cae en la cuadrícula del imán");
      break;
    }
    case "signs": {
      if (!p.rows.length) err(where, "tabla de signos sin filas");
      p.points.forEach((pt) => checkTex(where, pt));
      for (const r of p.rows) {
        checkTex(where, r.label);
        if (r.signs.length !== p.points.length + 1) err(where, `la fila "${r.label}" debe tener ${p.points.length + 1} signos`);
        if (r.signs.some((s) => s !== 1 && s !== -1)) err(where, `la fila "${r.label}" tiene signos que no son 1 o -1`);
      }
      if ((p.given ?? []).length >= p.rows.length) err(where, "todas las filas vienen dadas, no hay nada que llenar");
      break;
    }
    case "place": {
      checkGraph(where, p.graph);
      const s = p.snap ?? 1;
      const onGrid = (n: number) => Math.abs(n / s - Math.round(n / s)) < 1e-9;
      if (!p.items.length) err(where, "place sin elementos");
      for (const it of p.items) {
        checkTex(where, it.label);
        if (it.type === "point") {
          const [x, y] = it.answer;
          if (x < p.graph.x[0] || x > p.graph.x[1] || y < p.graph.y[0] || y > p.graph.y[1] || !onGrid(x) || !onGrid(y)) err(where, `el punto ${it.label} queda fuera de la gráfica o de la cuadrícula`);
        } else {
          const [a, b] = it.type === "vline" ? p.graph.x : p.graph.y;
          if (it.answer <= a || it.answer >= b || !onGrid(it.answer)) err(where, `${it.label} queda fuera de la gráfica o de la cuadrícula`);
        }
      }
      for (const c of p.reveal ?? []) checkFn(`${where} reveal`, c.fn, ["x"], c.domain ?? p.graph.x);
      break;
    }
    default: err(where, `parte desconocida ${(p as { kind: string }).kind}`);
  }
}

function checkExercise(where: string, e: Exercise) {
  checkRich(where, e.statement);
  checkGraph(where, e.graph);
  if (!e.parts?.length) err(where, "ejercicio sin partes");
  e.parts.forEach((p, i) => checkPart(`${where} parte ${i + 1}`, p));
  e.hints?.forEach((h) => checkRich(`${where} pista`, h));
  if (!e.solution?.length) err(where, "ejercicio sin solución");
  e.solution.forEach((s) => checkRich(`${where} solución`, s));
}

async function main() {
  for (const slug of slugs) {
    const file = path.join(dir, `${slug}.ts`);
    if (!fs.existsSync(file)) {
      console.log(`\n${slug}: NO EXISTE el archivo`);
      errors++;
      continue;
    }
    const mod = await import(pathToFileURL(file).href);
    const topic: Topic = mod.default?.default ?? mod.default;
    console.log(`\n${slug}`);
    if (!TOPICS.find((t) => t.slug === slug)) err(slug, "no está en el catálogo");
    if (topic.slug !== slug) err(slug, `slug interno "${topic.slug}" no coincide con el archivo`);
    if (!topic.objectives?.length) err(slug, "sin objetivos");
    topic.objectives?.forEach((o) => checkRich(`${slug} objetivo`, o));
    const ids = new Set<string>();
    topic.sections.forEach((s, si) => {
      if (ids.has(s.id)) err(slug, `sección repetida ${s.id}`);
      ids.add(s.id);
      s.blocks.forEach((b, bi) => checkBlock(`${slug} §${si + 1}.${bi + 1} (${b.type})`, b));
    });
    const genIds = new Set<string>();
    const levels = { 1: 0, 2: 0, 3: 0 };
    for (const g of topic.exercises) {
      if (genIds.has(g.id)) err(slug, `ejercicio repetido ${g.id}`);
      genIds.add(g.id);
      levels[g.level]++;
      const statements = new Set<string>();
      for (let seed = 1; seed <= SEEDS; seed++) {
        let ex: Exercise;
        try {
          ex = g.generate(makeRng(seed * 7919));
        } catch (e) {
          err(`${slug}/${g.id} seed ${seed}`, `el generador lanzó: ${(e as Error).message}`);
          continue;
        }
        statements.add(JSON.stringify(ex.statement) + JSON.stringify(ex.parts.map((p) => ("answer" in p ? p.answer : p.kind === "choice" ? p.options.map((o) => o.label) : ""))));
        checkExercise(`${slug}/${g.id} seed ${seed}`, ex);
      }
      if (statements.size < 3) warn(`${slug}/${g.id}`, `solo produce ${statements.size} variante(s) distinta(s)`);
    }
    const blocks = topic.sections.reduce((n, s) => n + s.blocks.length, 0);
    console.log(`  ${topic.sections.length} secciones, ${blocks} bloques, ejercicios por nivel: 1→${levels[1]} 2→${levels[2]} 3→${levels[3]}`);
  }
  console.log(`\n${errors} errores, ${warnings} avisos`);
  process.exit(errors ? 1 : 0);
}

main();
