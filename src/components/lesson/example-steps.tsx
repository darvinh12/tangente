"use client";

import { useState } from "react";
import { Rich, RichInline } from "@/components/math/rich";

/** Ejemplo resuelto que se revela paso a paso para que el estudiante piense antes de leer. */
export function ExampleSteps({ title, problem, steps, answer }: { title: string; problem: string; steps: string[]; answer?: string }) {
  const [shown, setShown] = useState(1);
  const all = shown >= steps.length;
  return (
    <div className="rounded-2xl border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Ejemplo</p>
        <p className="font-display text-[1.15rem] font-semibold text-ink">
          <RichInline md={title} />
        </p>
        <Rich md={problem} className="mt-2 text-[1.04rem] leading-relaxed text-ink" />
      </div>
      <ol className="flex flex-col gap-3 px-5 py-4">
        {steps.slice(0, shown).map((s, i) => (
          <li key={i} className="rise flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sunk text-[0.8rem] font-semibold text-ink-2">
              {i + 1}
            </span>
            <Rich md={s} className="min-w-0 flex-1 text-[1.02rem] leading-relaxed text-ink-2" />
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3 px-5 pb-4">
        {!all ? (
          <>
            <button
              type="button"
              onClick={() => setShown((n) => n + 1)}
              className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-surface transition-transform active:scale-[0.97]"
            >
              Siguiente paso
            </button>
            <button type="button" onClick={() => setShown(steps.length)} className="text-sm text-muted hover:text-ink-2">
              Ver todo
            </button>
            <span className="ml-auto text-xs tabular-nums text-muted">
              {shown} de {steps.length}
            </span>
          </>
        ) : answer ? (
          <div className="pop w-full rounded-xl bg-accent-soft px-4 py-2.5 text-accent-strong">
            <span className="text-sm font-semibold">Resultado: </span>
            <RichInline md={answer} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
