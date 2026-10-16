"use client";

import { Line, MovablePoint, Point, Polyline } from "mafs";
import { useMemo, useState } from "react";
import type { Curve, GraphSpec } from "@/content/types";
import { CurvePlot, GraphCanvas, sampleRuns, TONES } from "@/components/math/graph";
import { Tex } from "@/components/math/rich";
import { compile } from "@/lib/math/parse";

function n2(v: number, d = 3): string {
  if (!Number.isFinite(v)) return Number.isNaN(v) ? "\\text{no definida}" : v > 0 ? "\\infty" : "-\\infty";
  const r = Math.round(v * 10 ** d) / 10 ** d;
  return String(Object.is(r, -0) ? 0 : r).replace(".", "{,}");
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display?: string;
}) {
  return (
    <label className="flex items-center gap-3">
      <span className="min-w-14 shrink-0 text-right text-[0.95rem] text-ink-2">
        {/^[a-zA-Z]$/.test(label) || label.includes("\\") ? <Tex tex={label} /> : label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 min-w-0 flex-1 cursor-pointer accent-[#1d6b66]"
      />
      <span className="w-20 shrink-0 tabular-nums text-ink-2">
        <Tex tex={display ?? n2(value, 2)} />
      </span>
    </label>
  );
}

/* ------------------------------- Deslizadores ------------------------------- */

function cleanFormula(s: string): string {
  return s
    .replace(/\+\s*-/g, "- ")
    .replace(/-\s*-/g, "+ ")
    .replace(/(^|[^0-9.])1\s*([a-z(\\])/g, "$1$2")
    .replace(/\s+/g, " ");
}

export function SlidersWidget({
  fn,
  params,
  x,
  y,
  formula,
  reference,
}: {
  fn: string;
  params: { name: string; min: number; max: number; step: number; value: number; label?: string }[];
  x: [number, number];
  y: [number, number];
  formula?: string;
  reference?: Curve[];
}) {
  const [vals, setVals] = useState<Record<string, number>>(() => Object.fromEntries(params.map((p) => [p.name, p.value])));
  const spec: GraphSpec = { x, y, curves: [...(reference ?? []).map((c) => ({ color: "muted" as const, dashed: true, ...c }))] };
  const f = useMemo(() => compile(fn, "x", vals), [fn, vals]);
  let shown = formula ?? "";
  for (const p of params) shown = shown.split(`{${p.name}}`).join(n2(vals[p.name], 2));
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      {formula ? (
        <div className="mb-3 text-center text-[1.2rem]">
          <Tex tex={cleanFormula(shown)} />
        </div>
      ) : null}
      <GraphCanvas spec={spec}>
        <FnPlot f={f} spec={spec} />
      </GraphCanvas>
      <div className="mt-4 flex flex-col gap-3">
        {params.map((p) => (
          <Slider
            key={p.name}
            label={p.label ?? p.name}
            value={vals[p.name]}
            min={p.min}
            max={p.max}
            step={p.step}
            onChange={(v) => setVals((s) => ({ ...s, [p.name]: v }))}
          />
        ))}
      </div>
    </div>
  );
}

/** Dibuja una función ya compilada (con parámetros sustituidos). */
function FnPlot({ f, spec, color = "accent" }: { f: (x: number) => number; spec: GraphSpec; color?: "accent" | "blue" | "muted" }) {
  return <SampledPlot f={f} spec={spec} color={TONES[color]} />;
}

function SampledPlot({ f, spec, color, dashed }: { f: (x: number) => number; spec: GraphSpec; color: string; dashed?: boolean }) {
  const runs = sampleRuns(f, spec.x, spec.y);
  return (
    <>
      {runs.map((pts, i) => (
        <Polyline key={i} points={pts} color={color} weight={2.6} fillOpacity={0} strokeStyle={dashed ? "dashed" : "solid"} svgPolylineProps={{ fill: "none" }} />
      ))}
    </>
  );
}

/* --------------------------------- Límite --------------------------------- */

export function LimitWidget({ fn, a, x, y, breaks }: { fn: string; a: number; x: [number, number]; y: [number, number]; breaks?: number[] }) {
  const [k, setK] = useState(0); // d = 10^(-k/10)... usamos una escala logarítmica
  const d = Math.pow(10, -k / 25);
  const f = useMemo(() => compile(fn), [fn]);
  const spec: GraphSpec = { x, y, curves: [{ fn, breaks: breaks ?? [a] }], vlines: [{ x: a, color: "muted", dashed: true }] };
  // Si los dos lados se acercan al mismo valor y f(a) no existe, se marca el hueco.
  const yl = f(a - 1e-7);
  const yr = f(a + 1e-7);
  const hole = Number.isFinite(yl) && Number.isFinite(yr) && Math.abs(yl - yr) < 1e-4 && !Number.isFinite(f(a)) ? (yl + yr) / 2 : null;
  const xl = a - d;
  const xr = a + d;
  const rows = [1, 0.1, 0.01, 0.001];
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <GraphCanvas spec={spec}>
        {hole !== null ? <Point x={a} y={hole} color="#1d6b66" svgCircleProps={{ r: 5, style: { fill: "#fffdf8", stroke: "#1d6b66", strokeWidth: 2.2 } }} /> : null}
        {Number.isFinite(f(xl)) ? <Point x={xl} y={f(xl)} color="#2c5689" /> : null}
        {Number.isFinite(f(xr)) ? <Point x={xr} y={f(xr)} color="#c26a1b" /> : null}
      </GraphCanvas>
      <div className="mt-4">
        <Slider label="\text{cerca}" value={k} min={0} max={75} step={1} onChange={setK} display={`d = ${n2(d, 4)}`} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-[0.95rem]">
        <div className="rounded-xl bg-econ-soft px-3 py-2">
          <p className="text-sm text-ink-2">Por la izquierda</p>
          <Tex tex={`f(${n2(xl, 4)}) = ${n2(f(xl), 4)}`} />
        </div>
        <div className="rounded-xl bg-warn-soft px-3 py-2">
          <p className="text-sm text-ink-2">Por la derecha</p>
          <Tex tex={`f(${n2(xr, 4)}) = ${n2(f(xr), 4)}`} />
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] text-center text-[0.92rem] tabular-nums">
          <thead>
            <tr className="text-ink-2">
              <th className="py-1 font-medium"><Tex tex="x" /></th>
              <th className="py-1 font-medium"><Tex tex="f(x)" /></th>
              <th className="py-1 font-medium"><Tex tex="x" /></th>
              <th className="py-1 font-medium"><Tex tex="f(x)" /></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r} className="border-t border-line">
                <td className="py-1"><Tex tex={n2(a - r, 4)} /></td>
                <td className="py-1 text-econ"><Tex tex={n2(f(a - r), 4)} /></td>
                <td className="py-1"><Tex tex={n2(a + r, 4)} /></td>
                <td className="py-1 text-warn"><Tex tex={n2(f(a + r), 4)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------ Secante → tangente ------------------------------ */

export function SecantWidget({ fn, a, x, y }: { fn: string; a: number; x: [number, number]; y: [number, number] }) {
  const [h, setH] = useState(2);
  const f = useMemo(() => compile(fn), [fn]);
  const fa = f(a);
  const fb = f(a + h);
  const m = (fb - fa) / h;
  const mt = (f(a + 1e-5) - f(a - 1e-5)) / 2e-5;
  const spec: GraphSpec = { x, y, curves: [{ fn }] };
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <GraphCanvas spec={spec}>
        {Math.abs(h) > 1e-9 && Number.isFinite(m) ? (
          <Line.ThroughPoints point1={[a, fa]} point2={[a + h, fb]} color="#c26a1b" weight={2} />
        ) : null}
        {Math.abs(h) < 0.3 && Number.isFinite(mt) ? (
          <Line.PointSlope point={[a, fa]} slope={mt} color="#2c5689" style="dashed" weight={1.6} />
        ) : null}
        <Point x={a} y={fa} color="#1e1c19" />
        {Number.isFinite(fb) ? <Point x={a + h} y={fb} color="#c26a1b" /> : null}
      </GraphCanvas>
      <div className="mt-4">
        <Slider label="h" value={h} min={-2} max={2} step={0.01} onChange={(v) => setH(Math.abs(v) < 0.005 ? 0.01 : v)} />
      </div>
      <p className="mt-3 text-center text-[1.05rem]">
        <Tex tex={`m_{\\text{sec}} = \\dfrac{f(${n2(a, 2)} + h) - f(${n2(a, 2)})}{h} = ${n2(m, 4)}`} />
      </p>
      <p className="mt-1 text-center text-sm text-ink-2">
        Mientras más pequeño es <Tex tex="h" />, más se parece la secante a la tangente, cuya pendiente es{" "}
        <Tex tex={`f'(${n2(a, 2)}) \\approx ${n2(mt, 3)}`} />.
      </p>
    </div>
  );
}

/* --------------------------------- Tangente --------------------------------- */

export function TangentWidget({
  fn,
  x,
  y,
  showAnalysis,
  derivative,
}: {
  fn: string;
  x: [number, number];
  y: [number, number];
  showAnalysis?: boolean;
  derivative?: string;
}) {
  const f = useMemo(() => compile(fn), [fn]);
  const [x0, setX0] = useState(() => {
    const mid = x[0] + (x[1] - x[0]) * 0.3;
    return Number.isFinite(f(mid)) ? mid : (x[0] + x[1]) / 2;
  });
  const hh = 1e-4;
  const y0 = f(x0);
  const m = (f(x0 + hh) - f(x0 - hh)) / (2 * hh);
  const m2 = (f(x0 + 1e-3) - 2 * y0 + f(x0 - 1e-3)) / 1e-6;
  const spec: GraphSpec = { x, y, curves: [{ fn }, ...(derivative ? [{ fn: derivative, color: "muted" as const, dashed: true, label: "$f'$" }] : [])] };
  const tone = Math.abs(m) < 0.02 ? "text-warn" : m > 0 ? "text-good" : "text-bad";
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <GraphCanvas spec={spec}>
        {Number.isFinite(m) ? <Line.PointSlope point={[x0, y0]} slope={m} color="#c26a1b" weight={2} /> : null}
        {Number.isFinite(y0) ? (
          <MovablePoint
            point={[x0, y0]}
            color="#1d6b66"
            constrain={(p) => {
              const nx = Math.min(x[1], Math.max(x[0], p[0]));
              const ny = f(nx);
              return Number.isFinite(ny) ? [nx, ny] : [x0, y0];
            }}
            onMove={(p) => setX0(p[0])}
          />
        ) : null}
      </GraphCanvas>
      <p className="mt-3 text-sm text-ink-2">Arrastra el punto sobre la curva.</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-[1.02rem]">
        <Tex tex={`x_0 = ${n2(x0, 2)}`} />
        <span className={tone}>
          <Tex tex={`f'(x_0) \\approx ${n2(m, 3)}`} />
        </span>
      </div>
      {showAnalysis ? (
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className={`rounded-full px-3 py-1 ${Math.abs(m) < 0.02 ? "bg-warn-soft text-warn" : m > 0 ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
            {Math.abs(m) < 0.02 ? "Tangente horizontal: posible extremo" : m > 0 ? "La función crece aquí" : "La función decrece aquí"}
          </span>
          {Number.isFinite(m2) && Math.abs(m2) > 0.02 ? (
            <span className="rounded-full bg-sunk px-3 py-1 text-ink-2">
              {m2 > 0 ? "Abre hacia arriba: f'' > 0" : "Abre hacia abajo: f'' < 0"}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------- Máquina de funciones --------------------------- */

export function MachineWidget({
  fns,
  input = 2,
  min = -5,
  max = 5,
}: {
  fns: { name: string; tex: string }[];
  input?: number;
  min?: number;
  max?: number;
}) {
  const [x0, setX0] = useState(input);
  const compiled = useMemo(() => fns.map((g) => compile(g.tex)), [fns]);
  const steps: number[] = [x0];
  for (const g of compiled) steps.push(g(steps[steps.length - 1]));
  const failAt = steps.findIndex((v) => !Number.isFinite(v));
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <Slider label="x" value={x0} min={min} max={max} step={0.5} onChange={setX0} />
      <div className="mt-5 flex flex-wrap items-stretch gap-2">
        <div className="flex min-w-[84px] flex-col items-center justify-center rounded-xl bg-sunk px-3 py-2">
          <span className="text-xs uppercase tracking-wider text-muted">Entra</span>
          <Tex tex={n2(x0, 2)} className="text-lg" />
        </div>
        {fns.map((g, i) => {
          const broken = failAt !== -1 && failAt <= i + 1;
          return (
            <div key={i} className="flex items-stretch gap-2">
              <span className="self-center text-muted">→</span>
              <div className={`flex min-w-[120px] flex-col items-center justify-center rounded-xl border-[1.5px] px-3 py-2 ${broken ? "border-bad bg-bad-soft" : "border-accent bg-accent-soft"}`}>
                <span className="text-xs font-medium text-accent-strong">
                  <Tex tex={`${g.name}(x) = ${g.tex}`} />
                </span>
                <Tex tex={broken ? "\\text{no definida}" : n2(steps[i + 1], 3)} className="text-lg" />
              </div>
            </div>
          );
        })}
      </div>
      {failAt !== -1 ? (
        <p className="mt-3 text-sm text-bad">
          Con <Tex tex={`x = ${n2(x0, 2)}`} /> la cadena se rompe en <Tex tex={fns[failAt - 1]?.name ?? ""} />: ese valor no está en su dominio.
        </p>
      ) : (
        <p className="mt-3 text-sm text-ink-2">
          El resultado final es <Tex tex={`${fns.map((g) => g.name).reverse().join("(")}(${n2(x0, 2)}${")".repeat(fns.length - 1)} = ${n2(steps[steps.length - 1], 3)}`} />.
        </p>
      )}
    </div>
  );
}

export { CurvePlot };
