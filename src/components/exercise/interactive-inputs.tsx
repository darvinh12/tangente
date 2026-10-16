"use client";

import { Line, MovablePoint, Text } from "mafs";
import type { Part } from "@/content/types";
import { CurvePlot, GraphCanvas } from "@/components/math/graph";
import { Tex } from "@/components/math/rich";
import type { PartValue } from "@/lib/grade";

/* ------------------------------ Tabla de signos ------------------------------ */

export function SignsInput({
  part,
  value,
  onChange,
  disabled,
  reveal,
}: {
  part: Extract<Part, { kind: "signs" }>;
  value: Extract<PartValue, { kind: "signs" }>;
  onChange: (v: PartValue) => void;
  disabled?: boolean;
  reveal?: boolean;
}) {
  const nCols = part.points.length + 1;
  const cycle = (c: 0 | 1 | -1): 0 | 1 | -1 => (c === 0 ? 1 : c === 1 ? -1 : 0);
  const set = (i: number, j: number) => {
    if (disabled || part.given?.includes(i)) return;
    const cells = value.cells.map((row, a) => (a === i ? row.map((c, b) => (b === j ? cycle(c) : c)) : row));
    onChange({ kind: "signs", cells });
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full border-collapse text-center">
          <thead>
            <tr className="bg-sunk/60">
              <th className="px-2 py-2 text-left text-sm font-medium text-muted" />
              {Array.from({ length: nCols }, (_, j) => (
                <th key={j} className="relative px-0.5 py-2 text-[0.82rem] font-normal sm:px-1 sm:text-[0.95rem]">
                  <span className="text-muted">
                    <Tex tex={`(${j === 0 ? "-\\infty" : part.points[j - 1]},\\,${j === nCols - 1 ? "\\infty" : part.points[j]})`} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {part.rows.map((r, i) => {
              const given = part.given?.includes(i);
              const isResult = i === part.rows.length - 1 && part.rows.length > 1;
              return (
                <tr key={i} className={`border-t border-line ${isResult ? "bg-accent-soft/40" : ""}`}>
                  <td className="whitespace-nowrap px-2 py-2 text-left text-[0.9rem] sm:text-base">
                    <Tex tex={r.label} />
                  </td>
                  {Array.from({ length: nCols }, (_, j) => {
                    const c = value.cells[i][j];
                    const truth = r.signs[j];
                    const bad = reveal && !given && c !== truth;
                    const shown = reveal && bad ? truth : c;
                    return (
                      <td key={j} className="px-0.5 py-1.5 sm:px-1">
                        <button
                          type="button"
                          onClick={() => set(i, j)}
                          disabled={disabled || given}
                          aria-label={`Fila ${i + 1}, intervalo ${j + 1}: ${c === 0 ? "vacía" : c > 0 ? "positivo" : "negativo"}`}
                          className={`mx-auto flex h-10 w-10 items-center sm:h-11 sm:w-11 justify-center rounded-xl border-[1.5px] font-display text-2xl font-semibold transition-all active:scale-90 ${
                            bad
                              ? "border-bad bg-bad-soft text-bad"
                              : given
                                ? "border-transparent bg-sunk text-ink-2"
                                : shown === 0
                                  ? "border-dashed border-line-2 bg-surface text-line-2 hover:border-accent"
                                  : shown > 0
                                    ? "border-good/50 bg-good-soft text-good"
                                    : "border-bad/40 bg-bad-soft text-bad"
                          }`}
                        >
                          {shown === 0 ? "?" : shown > 0 ? "+" : "−"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted">Toca cada casilla: la primera vez pone +, la segunda −, la tercera la vacía.</p>
    </div>
  );
}

/* ------------------------- Ubicar asíntotas y puntos ------------------------- */

export function PlaceInput({
  part,
  value,
  onChange,
  disabled,
  solved,
}: {
  part: Extract<Part, { kind: "place" }>;
  value: Extract<PartValue, { kind: "place" }>;
  onChange: (v: PartValue) => void;
  disabled?: boolean;
  solved?: boolean;
}) {
  const g = part.graph;
  const snap = part.snap ?? 1;
  const r = (n: number) => Math.round(n / snap) * snap;
  const clampX = (n: number) => Math.min(g.x[1], Math.max(g.x[0], r(n)));
  const clampY = (n: number) => Math.min(g.y[1], Math.max(g.y[0], r(n)));
  const setPos = (k: number, p: number | [number, number]) => {
    if (disabled) return;
    onChange({ kind: "place", pos: value.pos.map((x, i) => (i === k ? p : x)) });
  };
  const midY = (g.y[0] + g.y[1]) / 2;
  const midX = (g.x[0] + g.x[1]) / 2;
  const fmt = (n: number) => String(Math.round(n * 1000) / 1000).replace(".", ",").replace("-", "−");
  return (
    <div className="flex flex-col gap-2">
      <GraphCanvas spec={g}>
        {solved ? part.reveal?.map((c, i) => <CurvePlot key={i} curve={c} spec={g} />) : null}
        {part.items.map((it, k) => {
          const p = value.pos[k];
          if (it.type === "vline" && typeof p === "number") {
            return (
              <g key={k}>
                <Line.ThroughPoints point1={[p, 0]} point2={[p, 1]} color="#b23f37" style="dashed" weight={2} />
                <Text x={p} y={g.y[1] - (g.y[1] - g.y[0]) * 0.06} attach="e" attachDistance={8} color="#b23f37" size={14}>
                  {`x = ${fmt(p)}`}
                </Text>
                {!disabled ? (
                  <MovablePoint point={[p, midY]} color="#b23f37" constrain={(q) => [clampX(q[0]), midY]} onMove={(q) => setPos(k, clampX(q[0]))} />
                ) : null}
              </g>
            );
          }
          if (it.type === "hline" && typeof p === "number") {
            return (
              <g key={k}>
                <Line.ThroughPoints point1={[0, p]} point2={[1, p]} color="#2c5689" style="dashed" weight={2} />
                <Text x={g.x[0] + (g.x[1] - g.x[0]) * 0.03} y={p} attach="ne" attachDistance={6} color="#2c5689" size={14}>
                  {`y = ${fmt(p)}`}
                </Text>
                {!disabled ? (
                  <MovablePoint point={[midX, p]} color="#2c5689" constrain={(q) => [midX, clampY(q[1])]} onMove={(q) => setPos(k, clampY(q[1]))} />
                ) : null}
              </g>
            );
          }
          if (it.type === "point" && Array.isArray(p)) {
            return (
              <g key={k}>
                {disabled ? null : (
                  <MovablePoint point={p} color="#1d6b66" constrain={(q) => [clampX(q[0]), clampY(q[1])]} onMove={(q) => setPos(k, [clampX(q[0]), clampY(q[1])])} />
                )}
                <Text x={p[0]} y={p[1]} attach="ne" attachDistance={12} color="#1d6b66" size={14}>
                  {`(${fmt(p[0])}, ${fmt(p[1])})`}
                </Text>
              </g>
            );
          }
          return null;
        })}
      </GraphCanvas>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {part.items.map((it, k) => (
          <span key={k}>
            <Tex tex={it.label} />: {it.type === "vline" ? "arrastra el punto rojo de lado a lado" : it.type === "hline" ? "arrastra el punto azul hacia arriba o abajo" : "arrastra el punto verde"}
          </span>
        ))}
      </div>
    </div>
  );
}
