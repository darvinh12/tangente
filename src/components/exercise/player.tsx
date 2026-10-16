"use client";

import { ArrowRight, CheckCircle, Lightbulb, XCircle, Eye } from "@phosphor-icons/react";
import { useMemo, useRef, useState } from "react";
import type { Exercise, Part } from "@/content/types";
import { Graph } from "@/components/math/graph";
import { Rich, RichInline } from "@/components/math/rich";
import { answerText, emptyValue, gradePart, type PartValue, type Verdict } from "@/lib/grade";
import { makeRng } from "@/lib/math/rng";
import { PartInput } from "./part-input";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Orden de las opciones, estable para un mismo enunciado. */
export function choiceOrders(ex: Exercise): number[][] {
  const rng = makeRng(hash(ex.statement));
  return ex.parts.map((p: Part) => {
    if (p.kind !== "choice") return [];
    const idx = p.options.map((_, i) => i);
    return p.shuffle === false ? idx : rng.shuffle(idx);
  });
}

function VerdictBox({ v }: { v: Verdict }) {
  if (v.status === "correct") {
    return (
      <div className="pop mt-3 flex items-start gap-2.5 rounded-xl bg-good-soft px-3.5 py-2.5 text-good">
        <CheckCircle size={22} weight="fill" className="mt-px shrink-0" />
        <div className="text-ink">
          <p className="font-semibold text-good">¡Correcto!</p>
          {v.message ? <Rich md={v.message} className="mt-1 text-[0.95rem]" /> : null}
        </div>
      </div>
    );
  }
  if (v.status === "invalid") {
    return (
      <div className="pop mt-3 rounded-xl bg-warn-soft px-3.5 py-2.5 text-[0.95rem] text-ink">
        <Rich md={v.message} />
      </div>
    );
  }
  return (
    <div className="shake mt-3 flex items-start gap-2.5 rounded-xl bg-bad-soft px-3.5 py-2.5">
      <XCircle size={22} weight="fill" className="mt-px shrink-0 text-bad" />
      <div className="text-ink">
        <p className="font-semibold text-bad">Todavía no</p>
        <Rich md={v.message} className="mt-1 text-[0.95rem]" />
      </div>
    </div>
  );
}

export function ExercisePlayer({
  exercise,
  onSolved,
  onMistake,
  onNext,
  nextLabel = "Otro ejercicio",
  compact,
}: {
  exercise: Exercise;
  /** Se llama una vez cuando todas las partes quedan bien. `clean` = sin ver la solución. */
  onSolved?: (clean: boolean) => void;
  /** Se llama una sola vez, al primer error o al pedir la solución antes de resolver. */
  onMistake?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  compact?: boolean;
}) {
  const parts = exercise.parts;
  const orders = useMemo(() => choiceOrders(exercise), [exercise]);
  const [values, setValues] = useState<PartValue[]>(() => parts.map(emptyValue));
  const [verdicts, setVerdicts] = useState<(Verdict | null)[]>(() => parts.map(() => null));
  const [hints, setHints] = useState(0);
  const [solution, setSolution] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const reported = useRef(false);
  const struggled = useRef(false);
  const flagMistake = () => {
    if (struggled.current) return;
    struggled.current = true;
    onMistake?.();
  };

  const done = verdicts.every((v) => v?.status === "correct");
  const firstPending = verdicts.findIndex((v) => v?.status !== "correct");
  const visibleCount = exercise.sequential ? (done ? parts.length : firstPending + 1) : parts.length;

  const check = () => {
    if (done) return;
    const targets = exercise.sequential ? [firstPending] : parts.map((_, i) => i).filter((i) => verdicts[i]?.status !== "correct");
    const next = [...verdicts];
    let wrong = false;
    for (const i of targets) {
      const v = gradePart(parts[i], values[i]);
      next[i] = v;
      if (v.status === "wrong") wrong = true;
    }
    setVerdicts(next);
    if (wrong) {
      setShakeKey((k) => k + 1);
      flagMistake();
    }
    if (next.every((v) => v?.status === "correct") && !reported.current) {
      reported.current = true;
      onSolved?.(!solution);
    }
  };

  const showSolution = () => {
    if (!done) flagMistake();
    setSolution(true);
  };

  const anyAttempt = verdicts.some((v) => v && v.status !== "invalid");

  return (
    <div className={compact ? "" : "rounded-2xl border border-line bg-surface p-5 shadow-[0_18px_40px_-28px_rgb(60_50_30/0.35)] sm:p-7"}>
      <Rich md={exercise.statement} className="text-[1.08rem] leading-relaxed" />
      {exercise.graph ? (
        <div className="mt-4">
          <Graph spec={exercise.graph} />
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-6">
        {parts.slice(0, visibleCount).map((p, i) => {
          const v = verdicts[i];
          const locked = v?.status === "correct" || (solution && done);
          return (
            <div key={i} className="rise">
              {parts.length > 1 ? (
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Parte {i + 1} de {parts.length}
                </p>
              ) : null}
              {p.prompt ? <Rich md={p.prompt} className="mb-3 text-[1.02rem]" /> : null}
              <PartInput
                part={p}
                value={values[i]}
                order={orders[i]}
                disabled={locked}
                reveal={solution}
                solved={v?.status === "correct"}
                onSubmit={check}
                onChange={(nv) => {
                  setValues((s) => s.map((x, k) => (k === i ? nv : x)));
                  if (v && v.status !== "correct") setVerdicts((s) => s.map((x, k) => (k === i ? null : x)));
                }}
              />
              {v ? <VerdictBox key={`${shakeKey}-${i}`} v={v} /> : null}
            </div>
          );
        })}
      </div>

      {hints > 0 && exercise.hints?.length ? (
        <div className="mt-5 rounded-xl border border-warn/25 bg-warn-soft/70 px-4 py-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-warn">
            <Lightbulb size={16} weight="fill" /> Pista{hints > 1 ? "s" : ""}
          </p>
          <ol className="flex flex-col gap-2">
            {exercise.hints.slice(0, hints).map((h, i) => (
              <li key={i} className="rise flex gap-2 text-[0.97rem]">
                <span className="text-warn">{i + 1}.</span>
                <Rich md={h} />
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {solution ? (
        <div className="rise mt-5 rounded-xl border border-line bg-paper px-4 py-4">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-accent">Solución paso a paso</p>
          <ol className="flex flex-col gap-3">
            {exercise.solution.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[0.8rem] font-semibold text-accent-strong">
                  {i + 1}
                </span>
                <Rich md={s} className="min-w-0 flex-1" />
              </li>
            ))}
          </ol>
          <div className="mt-4 border-t border-line pt-3 text-[0.97rem]">
            <span className="text-ink-2">Respuesta{parts.length > 1 ? "s" : ""}: </span>
            {parts.map((p, i) => (
              <span key={i} className="mr-3 inline-block">
                {parts.length > 1 ? <span className="text-muted">({i + 1}) </span> : null}
                <RichInline md={answerText(p)} />
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {!done ? (
          <button
            type="button"
            onClick={check}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 font-medium text-surface transition-all hover:bg-accent-strong active:scale-[0.98]"
          >
            Comprobar
          </button>
        ) : onNext ? (
          <button
            type="button"
            onClick={onNext}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 font-medium text-surface transition-all hover:bg-accent-strong active:scale-[0.98]"
          >
            {nextLabel} <ArrowRight size={18} weight="bold" />
          </button>
        ) : null}
        {!done && exercise.hints && hints < exercise.hints.length ? (
          <button
            type="button"
            onClick={() => setHints((h) => h + 1)}
            className="inline-flex h-11 items-center gap-1.5 rounded-full border border-line-2 bg-surface px-4 text-ink-2 transition-colors hover:border-warn hover:text-warn"
          >
            <Lightbulb size={17} /> {hints === 0 ? "Pista" : "Otra pista"}
          </button>
        ) : null}
        {!solution ? (
          <button
            type="button"
            onClick={showSolution}
            className={`inline-flex h-11 items-center gap-1.5 rounded-full px-4 transition-colors ${
              done ? "border border-line-2 bg-surface text-ink-2 hover:text-ink" : anyAttempt ? "text-ink-2 hover:text-ink" : "text-muted hover:text-ink-2"
            }`}
          >
            <Eye size={17} /> {done ? "Ver la resolución" : "Ver solución"}
          </button>
        ) : null}
        {solution && !done ? (
          <span className="text-sm text-muted">Ahora intenta escribir la respuesta tú. Este no cuenta para tu avance.</span>
        ) : null}
      </div>
    </div>
  );
}
