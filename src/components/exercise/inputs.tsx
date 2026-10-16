"use client";

import { MovablePoint } from "mafs";
import { Plus, X } from "@phosphor-icons/react";
import type { GraphSpec, Part } from "@/content/types";
import { GraphCanvas } from "@/components/math/graph";
import { RichInline, Tex } from "@/components/math/rich";
import { NumberLine } from "@/components/widgets/number-line";
import type { IntervalRow, PartValue } from "@/lib/grade";
import { rowsToIntervals } from "@/lib/grade";
import { parseFiniteSet } from "@/lib/math/check";

const LETTERS = "ABCDEFGH";

export function ChoiceInput({
  part,
  order,
  value,
  onChange,
  disabled,
  reveal,
}: {
  part: Extract<Part, { kind: "choice" }>;
  order: number[];
  value: Extract<PartValue, { kind: "choice" }>;
  onChange: (v: PartValue) => void;
  disabled?: boolean;
  /** Muestra cuál era la correcta. */
  reveal?: boolean;
}) {
  const hasGraphs = part.options.some((o) => o.graph);
  const toggle = (i: number) => {
    if (disabled) return;
    if (part.multiple) {
      const s = new Set(value.selected);
      if (s.has(i)) s.delete(i);
      else s.add(i);
      onChange({ kind: "choice", selected: [...s] });
    } else {
      onChange({ kind: "choice", selected: [i] });
    }
  };
  return (
    <div className={hasGraphs ? "grid gap-3 sm:grid-cols-2" : "flex flex-col gap-2"} role={part.multiple ? "group" : "radiogroup"}>
      {part.multiple ? <p className="text-sm text-muted sm:col-span-2">Puede haber más de una correcta. Marca todas las que apliquen.</p> : null}
      {order.map((i, k) => {
        const o = part.options[i];
        const selected = value.selected.includes(i);
        const showRight = reveal && o.correct;
        const showWrong = reveal && selected && !o.correct;
        return (
          <button
            key={i}
            type="button"
            role={part.multiple ? "checkbox" : "radio"}
            aria-checked={selected}
            disabled={disabled}
            onClick={() => toggle(i)}
            className={`group flex w-full items-start gap-3 rounded-xl border-[1.5px] px-3.5 py-3 text-left transition-all duration-200 active:scale-[0.99] ${
              showRight
                ? "border-good bg-good-soft"
                : showWrong
                  ? "border-bad bg-bad-soft"
                  : selected
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-surface hover:border-line-2 hover:bg-paper"
            } ${disabled ? "cursor-default" : "cursor-pointer"}`}
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-[0.8rem] font-semibold ${
                part.multiple ? "rounded-md" : "rounded-full"
              } ${selected ? "bg-accent text-surface" : "bg-sunk text-ink-2"}`}
            >
              {LETTERS[k]}
            </span>
            <span className="min-w-0 flex-1 text-[1.02rem] leading-relaxed">
              <RichInline md={o.label} />
              {o.graph ? (
                <span className="mt-2 block">
                  <GraphCanvas spec={{ ...o.graph, height: o.graph.height ?? 190 }} />
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function BracketToggle({
  closed,
  side,
  onToggle,
  disabled,
}: {
  closed: boolean;
  side: "lo" | "hi";
  onToggle: () => void;
  disabled?: boolean;
}) {
  const ch = side === "lo" ? (closed ? "[" : "(") : closed ? "]" : ")";
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={`Extremo ${side === "lo" ? "izquierdo" : "derecho"} ${closed ? "cerrado" : "abierto"}. Toca para cambiar.`}
      className="flex h-12 w-10 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-line-2 bg-surface font-display text-2xl text-accent transition-colors hover:border-accent active:scale-95"
    >
      {ch}
    </button>
  );
}

function EndInput({
  value,
  onChange,
  side,
  disabled,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  side: "lo" | "hi";
  disabled?: boolean;
  onSubmit?: () => void;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <input
        value={value}
        disabled={disabled}
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit?.();
        }}
        placeholder={side === "lo" ? "-inf" : "inf"}
        aria-label={side === "lo" ? "Extremo izquierdo" : "Extremo derecho"}
        className="h-12 w-full rounded-lg border-[1.5px] border-line-2 bg-surface px-3 pr-9 text-[1.1rem] outline-none transition-[border-color,box-shadow] placeholder:text-muted/60 focus:border-accent focus:shadow-[0_0_0_3px_rgb(29_107_102/0.14)]"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(side === "lo" ? "-inf" : "inf")}
        title={side === "lo" ? "Menos infinito" : "Más infinito"}
        className="absolute right-1.5 top-1/2 flex h-8 w-7 -translate-y-1/2 items-center justify-center rounded-md text-lg text-muted hover:bg-sunk hover:text-accent"
      >
        ∞
      </button>
    </div>
  );
}

export function IntervalInput({
  value,
  onChange,
  disabled,
  before,
  onSubmit,
}: {
  value: Extract<PartValue, { kind: "interval" }>;
  onChange: (v: PartValue) => void;
  disabled?: boolean;
  before?: string;
  onSubmit?: () => void;
}) {
  const setRow = (i: number, patch: Partial<IntervalRow>) => {
    const rows = value.rows.map((r, k) => (k === i ? { ...r, ...patch } : r));
    onChange({ ...value, rows, empty: false });
  };
  const parsed = rowsToIntervals(value.rows);
  const preview = value.empty ? [] : parsed.ok ? parsed.set : null;
  const lo = preview?.flatMap((I) => [I.lo, I.hi]).filter(Number.isFinite) ?? [];
  const range: [number, number] = lo.length ? [Math.min(...lo) - 2, Math.max(...lo) + 2] : [-5, 5];
  return (
    <div className="flex flex-col gap-3">
      {before ? <Tex tex={before} className="text-[1.15rem]" /> : null}
      {!value.empty ? (
        <div className="flex flex-col gap-2">
          {value.rows.map((r, i) => (
            <div key={i} className="flex items-center gap-1.5">
              {i > 0 ? <span className="w-6 shrink-0 text-center text-xl text-muted">∪</span> : null}
              <BracketToggle side="lo" closed={r.loClosed} disabled={disabled} onToggle={() => setRow(i, { loClosed: !r.loClosed })} />
              <EndInput side="lo" value={r.lo} disabled={disabled} onSubmit={onSubmit} onChange={(v) => setRow(i, { lo: v })} />
              <span className="text-xl text-muted">,</span>
              <EndInput side="hi" value={r.hi} disabled={disabled} onSubmit={onSubmit} onChange={(v) => setRow(i, { hi: v })} />
              <BracketToggle side="hi" closed={r.hiClosed} disabled={disabled} onToggle={() => setRow(i, { hiClosed: !r.hiClosed })} />
              {value.rows.length > 1 ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ ...value, rows: value.rows.filter((_, k) => k !== i) })}
                  aria-label="Quitar este tramo"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-bad-soft hover:text-bad"
                >
                  <X size={16} weight="bold" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border-[1.5px] border-accent bg-accent-soft px-4 py-3 text-accent-strong">
          Respuesta: conjunto vacío <Tex tex="\varnothing" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {!value.empty ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange({ ...value, rows: [...value.rows, { lo: "", hi: "", loClosed: false, hiClosed: false }] })}
            className="inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-surface px-3 py-1.5 text-ink-2 hover:border-accent hover:text-accent"
          >
            <Plus size={14} weight="bold" /> Unir otro intervalo
          </button>
        ) : null}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({ ...value, empty: !value.empty })}
          className={`rounded-full border px-3 py-1.5 ${value.empty ? "border-accent bg-accent text-surface" : "border-line-2 bg-surface text-ink-2 hover:border-accent hover:text-accent"}`}
        >
          {value.empty ? "Quitar vacío" : "Es vacío"}
        </button>
        <span className="text-muted">Toca ( ) para cambiar a [ ]. Fracciones como 1/2. Infinito: inf.</span>
      </div>
      {preview && preview.length ? <NumberLine set={preview} range={range} compact /> : null}
    </div>
  );
}

export function SetInput({
  value,
  onChange,
  disabled,
  before,
  onSubmit,
}: {
  value: Extract<PartValue, { kind: "set" }>;
  onChange: (v: PartValue) => void;
  disabled?: boolean;
  before?: string;
  onSubmit?: () => void;
}) {
  const parsed = parseFiniteSet(value.text);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        {before ? <Tex tex={before} className="shrink-0 text-[1.15rem]" /> : null}
        <span className="font-display text-2xl text-muted">{"{"}</span>
        <input
          value={value.text}
          disabled={disabled}
          onChange={(e) => onChange({ kind: "set", text: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit?.();
          }}
          placeholder="Ej: -2, 0, 3"
          aria-label="Elementos del conjunto separados por comas"
          className="h-12 min-w-0 flex-1 rounded-lg border-[1.5px] border-line-2 bg-surface px-3 text-[1.1rem] outline-none transition-[border-color,box-shadow] placeholder:text-muted/60 focus:border-accent focus:shadow-[0_0_0_3px_rgb(29_107_102/0.14)]"
        />
        <span className="font-display text-2xl text-muted">{"}"}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({ kind: "set", text: "∅" })}
          className="rounded-full border border-line-2 bg-surface px-3 py-1 text-ink-2 hover:border-accent hover:text-accent"
        >
          Vacío ∅
        </button>
        <span>Separa con comas. Usa punto para decimales.</span>
        {parsed && parsed.length ? (
          <span className="ml-auto text-ink-2">
            <Tex tex={`\\{${parsed.join(", ")}\\}`} />
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function PointInput({
  graph,
  snap = 1,
  value,
  onChange,
  disabled,
}: {
  graph: GraphSpec;
  snap?: number;
  value: Extract<PartValue, { kind: "point" }>;
  onChange: (v: PartValue) => void;
  disabled?: boolean;
}) {
  const round = (n: number) => Math.round(n / snap) * snap;
  const clamp = (p: [number, number]): [number, number] => [
    Math.min(graph.x[1], Math.max(graph.x[0], round(p[0]))),
    Math.min(graph.y[1], Math.max(graph.y[0], round(p[1]))),
  ];
  const fmt = (n: number) => String(Math.round(n * 1000) / 1000).replace(".", ",");
  return (
    <div className="flex flex-col gap-2">
      <GraphCanvas spec={graph} onClick={disabled || value.at ? undefined : (p) => onChange({ kind: "point", at: clamp(p) })}>
        {value.at ? (
          <MovablePoint
            point={value.at}
            color="#1d6b66"
            constrain={(p) => clamp([p[0], p[1]])}
            onMove={(p) => {
              if (!disabled) onChange({ kind: "point", at: clamp([p[0], p[1]]) });
            }}
          />
        ) : null}
      </GraphCanvas>
      <p className="text-sm text-muted">
        {value.at ? (
          <>
            Tu punto: <span className="font-medium text-ink">({fmt(value.at[0])}, {fmt(value.at[1])})</span>. Arrástralo para moverlo.
          </>
        ) : (
          "Toca el plano para colocar el punto."
        )}
      </p>
    </div>
  );
}
