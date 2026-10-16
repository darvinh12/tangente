"use client";

import Link from "next/link";
import { ArrowClockwise, ArrowRight, CheckCircle, SkipForward } from "@phosphor-icons/react";
import { useMemo, useRef, useState } from "react";
import { TOPICS } from "@/content/catalog";
import { loaders, topicIndex } from "@/content/generated";
import type { Exercise } from "@/content/types";
import { ExercisePlayer } from "@/components/exercise/player";
import { makeRng, randomSeed } from "@/lib/math/rng";
import { type ReviewItem, recordAttempt, reviewItems, reviewResult, useProgress } from "@/lib/progress";

const topicTitle = (slug: string) => TOPICS.find((t) => t.slug === slug)?.title ?? slug;
const genTitle = (slug: string, gen: string) => topicIndex[slug]?.exercises.find((e) => e.id === gen)?.title ?? gen;

function when(due: number, now: number): string {
  const d = due - now;
  if (d <= 0) return "Para hoy";
  const h = Math.round(d / 3600_000);
  if (h < 24) return `En ${Math.max(1, h)} h`;
  const days = Math.round(d / 86_400_000);
  return days === 1 ? "Mañana" : `En ${days} días`;
}

interface Current {
  item: ReviewItem;
  exercise: Exercise;
}

export function ReviewSession() {
  const progress = useProgress();
  const [now] = useState(() => Date.now());
  const items = useMemo(() => reviewItems(progress).filter((r) => loaders[r.slug]), [progress]);
  const due = items.filter((r) => r.due <= now);
  const later = items.filter((r) => r.due > now);

  const [queue, setQueue] = useState<ReviewItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [current, setCurrent] = useState<Current | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const struggled = useRef(false);
  const [loading, setLoading] = useState(false);

  const loadAt = async (q: ReviewItem[], i: number) => {
    if (i >= q.length) {
      setCurrent(null);
      setIndex(i);
      return;
    }
    setLoading(true);
    const item = q[i];
    const topic = (await loaders[item.slug]()).default;
    const gen = topic.exercises.find((g) => g.id === item.gen);
    setLoading(false);
    if (!gen) return loadAt(q, i + 1);
    struggled.current = false;
    setIndex(i);
    setCurrent({ item, exercise: gen.generate(makeRng(randomSeed())) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const start = (list: ReviewItem[]) => {
    const q = list.slice(0, 12);
    setQueue(q);
    setResults([]);
    loadAt(q, 0);
  };

  const finish = (ok: boolean) => {
    if (!current || !queue) return;
    reviewResult(current.item.slug, current.item.gen, ok);
    setResults((r) => [...r, ok]);
    loadAt(queue, index + 1);
  };

  /* --- Sesión en curso --- */
  if (queue) {
    if (index >= queue.length && !loading) {
      const ok = results.filter(Boolean).length;
      return (
        <div className="pop rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <CheckCircle size={40} weight="fill" className="text-good" />
          <h2 className="mt-3 font-display text-[1.8rem] font-semibold leading-tight text-ink">Repaso terminado</h2>
          <p className="mt-2 text-[1.05rem] text-ink-2">
            Te salieron bien {ok} de {results.length}. Los que acertaste vuelven más adelante para afianzarlos, y los que fallaste vuelven pronto.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => setQueue(null)} className="rounded-full bg-accent px-5 py-2.5 font-medium text-surface hover:bg-accent-strong">
              Volver al repaso
            </button>
            <Link href="/#temario" className="rounded-full border border-line-2 px-5 py-2.5 font-medium text-ink hover:bg-paper">
              Ir al temario
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div>
        <div className="mb-5 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-sunk">
            <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${(index / queue.length) * 100}%` }} />
          </div>
          <span className="text-sm tabular-nums text-muted">
            {Math.min(index + 1, queue.length)} de {queue.length}
          </span>
        </div>
        {current && !loading ? (
          <>
            <p className="mb-3 text-sm text-muted">
              <Link href={`/temas/${current.item.slug}`} className="hover:text-accent">{topicTitle(current.item.slug)}</Link>
              {" · "}
              <span className="font-medium text-ink">{genTitle(current.item.slug, current.item.gen)}</span>
            </p>
            <ExercisePlayer
              key={`${current.item.slug}-${current.item.gen}-${index}`}
              exercise={current.exercise}
              onMistake={() => {
                struggled.current = true;
              }}
              onSolved={(clean) => recordAttempt(current.item.slug, current.item.gen, clean)}
              onNext={() => finish(!struggled.current)}
              nextLabel={index + 1 < queue.length ? "Siguiente" : "Terminar"}
            />
            <button
              type="button"
              onClick={() => finish(false)}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink-2"
            >
              <SkipForward size={16} /> Saltar este (vuelve pronto)
            </button>
          </>
        ) : (
          <div className="h-80 animate-pulse rounded-2xl bg-sunk" />
        )}
      </div>
    );
  }

  /* --- Resumen --- */
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line-2 bg-surface px-6 py-12 text-center">
        <ArrowClockwise size={36} className="mx-auto text-line-2" />
        <h2 className="mt-4 font-display text-2xl font-semibold text-ink">Nada que repasar todavía</h2>
        <p className="mx-auto mt-2 max-w-[46ch] text-ink-2">
          Cuando te equivoques en un ejercicio o pidas la solución, ese tipo de ejercicio aparece aquí para que lo vuelvas a intentar con números nuevos, unas horas o unos días después.
        </p>
        <Link href="/#temario" className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-medium text-surface hover:bg-accent-strong">
          Ir a practicar <ArrowRight size={17} />
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm text-muted">Para hoy</p>
          <p className="font-display text-[2.6rem] font-semibold leading-none tabular-nums text-accent">{due.length}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm text-muted">Más adelante</p>
          <p className="font-display text-[2.6rem] font-semibold leading-none tabular-nums text-ink-2">{later.length}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => start(due.length ? due : items)}
        className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 font-medium text-surface transition-all hover:bg-accent-strong active:scale-[0.98]"
      >
        {due.length ? `Empezar repaso (${Math.min(due.length, 12)})` : "Repasar ahora de todas formas"} <ArrowRight size={18} weight="bold" />
      </button>
      {!due.length ? <p className="mt-2 text-sm text-muted">No tienes nada pendiente para hoy. Repasar antes de tiempo también ayuda.</p> : null}

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-[0.14em] text-muted">En tu cola</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {items.map((r) => (
          <li key={`${r.slug}/${r.gen}`} className="flex items-center gap-4 px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{genTitle(r.slug, r.gen)}</p>
              <p className="truncate text-sm text-muted">{topicTitle(r.slug)}</p>
            </div>
            <div className="flex shrink-0 gap-1" aria-label={`Etapa ${r.box + 1} de 3`}>
              {[0, 1, 2].map((b) => (
                <span key={b} className={`h-2 w-5 rounded-full ${b < r.box ? "bg-good" : b === r.box ? "bg-accent/40" : "bg-sunk"}`} />
              ))}
            </div>
            <span className={`w-20 shrink-0 text-right text-sm ${r.due <= now ? "font-medium text-accent" : "text-muted"}`}>{when(r.due, now)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted">
        Cada ejercicio necesita salirte bien tres veces, en días distintos, para salir de la cola.
      </p>
    </div>
  );
}
