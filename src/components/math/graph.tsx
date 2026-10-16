"use client";

import { Coordinates, LaTeX, Line, Mafs, Point, Polyline, Text } from "mafs";
import { type ReactNode, useMemo } from "react";
import type { Curve, GraphSpec, Tone } from "@/content/types";
import { compile } from "@/lib/math/parse";

export const TONES: Record<Tone, string> = {
  accent: "#1d6b66",
  blue: "#2c5689",
  red: "#b23f37",
  green: "#2c7a4b",
  orange: "#c26a1b",
  ink: "#1e1c19",
  muted: "#9a9387",
};

export function niceStep(span: number): number {
  const raw = span / 10;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  const k = m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10;
  return k * p;
}

/** Muestrea f y la parte en tramos continuos, cortando en asíntotas y saltos. */
export function sampleRuns(
  f: (x: number) => number,
  domain: [number, number],
  yRange: [number, number],
  breaks: number[] = [],
  n = 480,
): [number, number][][] {
  const [a, b] = domain;
  const span = yRange[1] - yRange[0];
  const lo = yRange[0] - span * 2;
  const hi = yRange[1] + span * 2;
  const eps = (b - a) * 1e-6;
  const cuts = [a, ...breaks.filter((c) => c > a && c < b).sort((x, y) => x - y), b];
  const runs: [number, number][][] = [];
  for (let s = 0; s < cuts.length - 1; s++) {
    const from = cuts[s] + (s > 0 ? eps : 0);
    const to = cuts[s + 1] - (s < cuts.length - 2 ? eps : 0);
    const steps = Math.max(24, Math.round((n * (to - from)) / (b - a)));
    let run: [number, number][] = [];
    let prev: number | null = null;
    for (let i = 0; i <= steps; i++) {
      const x = from + ((to - from) * i) / steps;
      const y = f(x);
      if (!Number.isFinite(y)) {
        if (run.length > 1) runs.push(run);
        run = [];
        prev = null;
        continue;
      }
      const yc = Math.max(lo, Math.min(hi, y));
      if (prev !== null && ((prev >= hi && yc <= lo) || (prev <= lo && yc >= hi))) {
        if (run.length > 1) runs.push(run);
        run = [];
      }
      run.push([x, yc]);
      prev = yc;
    }
    if (run.length > 1) runs.push(run);
  }
  return runs;
}

export function CurvePlot({ curve, spec }: { curve: Curve; spec: GraphSpec }) {
  const runs = useMemo(() => {
    const f = compile(curve.fn);
    return sampleRuns(f, curve.domain ?? spec.x, spec.y, curve.breaks);
  }, [curve.fn, curve.domain, curve.breaks, spec.x, spec.y]);
  const color = TONES[curve.color ?? "accent"];
  return (
    <>
      {runs.map((pts, i) => (
        <Polyline
          key={i}
          points={pts}
          color={color}
          weight={2.6}
          fillOpacity={0}
          strokeStyle={curve.dashed ? "dashed" : "solid"}
          svgPolylineProps={{ fill: "none", strokeLinejoin: "round", strokeLinecap: "round" }}
        />
      ))}
    </>
  );
}

function Label({ x, y, text, color }: { x: number; y: number; text: string; color: string }) {
  if (text.includes("$")) {
    return <LaTeX at={[x, y]} tex={text.replace(/\$/g, "")} color={color} />;
  }
  return (
    <Text x={x} y={y} color={color} size={15} attach="ne" attachDistance={6}>
      {text}
    </Text>
  );
}

export function GraphCanvas({
  spec,
  children,
  onClick,
}: {
  spec: GraphSpec;
  children?: ReactNode;
  onClick?: (p: [number, number]) => void;
}) {
  const stepX = spec.step ?? niceStep(spec.x[1] - spec.x[0]);
  const stepY = spec.step ?? niceStep(spec.y[1] - spec.y[0]);
  const fmtTick = (n: number) => {
    const r = Math.round(n * 1000) / 1000;
    return String(r).replace(".", ",").replace("-", "−");
  };
  return (
    <div className="mafs-wrap overflow-hidden rounded-[14px] border border-line bg-surface">
      <Mafs
        height={spec.height ?? 320}
        viewBox={{ x: spec.x, y: spec.y, padding: 0 }}
        preserveAspectRatio={false}
        pan={false}
        zoom={false}
        onClick={onClick ? (p) => onClick([p[0], p[1]]) : undefined}
      >
        <Coordinates.Cartesian
          subdivisions={false}
          xAxis={{ lines: stepX, labels: (n) => (Math.abs(n) < 1e-9 ? "" : fmtTick(n)) }}
          yAxis={{ lines: stepY, labels: (n) => (Math.abs(n) < 1e-9 ? "" : fmtTick(n)) }}
        />
        {spec.vlines?.map((l, i) => (
          <Line.ThroughPoints
            key={`v${i}`}
            point1={[l.x, 0]}
            point2={[l.x, 1]}
            color={TONES[l.color ?? "red"]}
            style={l.dashed === false ? "solid" : "dashed"}
            weight={1.6}
          />
        ))}
        {spec.hlines?.map((l, i) => (
          <Line.ThroughPoints
            key={`h${i}`}
            point1={[0, l.y]}
            point2={[1, l.y]}
            color={TONES[l.color ?? "red"]}
            style={l.dashed === false ? "solid" : "dashed"}
            weight={1.6}
          />
        ))}
        {spec.segments?.map((s, i) => (
          <Line.Segment
            key={`s${i}`}
            point1={s.from}
            point2={s.to}
            color={TONES[s.color ?? "accent"]}
            style={s.dashed ? "dashed" : "solid"}
            weight={2.4}
          />
        ))}
        {spec.curves?.map((c, i) => <CurvePlot key={`c${i}-${c.fn}`} curve={c} spec={spec} />)}
        {spec.vlines?.map((l, i) =>
          l.label ? <Label key={`vl${i}`} x={l.x} y={spec.y[1] - (spec.y[1] - spec.y[0]) * 0.08} text={l.label} color={TONES[l.color ?? "red"]} /> : null,
        )}
        {spec.hlines?.map((l, i) =>
          l.label ? <Label key={`hl${i}`} x={spec.x[1] - (spec.x[1] - spec.x[0]) * 0.14} y={l.y} text={l.label} color={TONES[l.color ?? "red"]} /> : null,
        )}
        {spec.curves?.map((c, i) => {
          if (!c.label) return null;
          const f = compile(c.fn);
          const [a, b] = c.domain ?? spec.x;
          let x = a + (b - a) * 0.82;
          let y = f(x);
          for (let k = 0; k < 12 && !(Number.isFinite(y) && y > spec.y[0] && y < spec.y[1]); k++) {
            x = a + (b - a) * (0.95 - k * 0.07);
            y = f(x);
          }
          if (!Number.isFinite(y)) return null;
          return <Label key={`cl${i}`} x={x} y={y} text={c.label} color={TONES[c.color ?? "accent"]} />;
        })}
        {spec.points?.map((p, i) => {
          const color = TONES[p.color ?? "accent"];
          return (
            <Point
              key={`p${i}`}
              x={p.x}
              y={p.y}
              color={color}
              svgCircleProps={p.open ? { fill: "#fffdf8", stroke: color, strokeWidth: 2.2, r: 5 } : { r: 5 }}
            />
          );
        })}
        {spec.points?.map((p, i) =>
          p.label ? <Label key={`pl${i}`} x={p.x} y={p.y} text={p.label} color={TONES[p.color ?? "ink"]} /> : null,
        )}
        {spec.labels?.map((l, i) => <Label key={`l${i}`} x={l.x} y={l.y} text={l.text} color={TONES[l.color ?? "ink"]} />)}
        {children}
      </Mafs>
    </div>
  );
}

export function Graph({ spec }: { spec: GraphSpec }) {
  return <GraphCanvas spec={spec} />;
}
