"use client";

import { CaretDown, CheckCircle, Circle, Shuffle, Target } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import type { ExerciseGen, Topic } from "@/content/types";
import { loaders } from "@/content/generated";
import { ExercisePlayer } from "@/components/exercise/player";
import { mastery, recordAttempt, useProgress } from "@/lib/progress";
import { makeRng, randomSeed } from "@/lib/math/rng";

const LEVEL = {
  1: { name: "Nivel 1", hint: "Lo básico", cls: "bg-good-soft text-good" },
  2: { name: "Nivel 2", hint: "Intermedio", cls: "bg-warn-soft text-warn" },
  3: { name: "Nivel 3", hint: "Tipo parcial", cls: "bg-bad-soft text-bad" },
} as const;

export function LevelBadge({ level }: { level: 1 | 2 | 3 }) {
  return <span className={`rounded-full px-2 py-0.5 text-[0.72rem] font-semibold ${LEVEL[level].cls}`}>{LEVEL[level].name}</span>;
}

export function Practice({ slug }: { slug: string }) {
  const [topic, setTopic] = useState<Topic | null>(null);
  const progress = useProgress();
  const [genId, setGenId] = useState<string | null>(null);
  const [seed, setSeed] = useState(0);
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    loaders[slug]?.().then((m) => {
      if (alive) setTopic(m.default);
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  const gens = useMemo(() => (topic ? [...topic.exercises].sort((a, b) => a.level - b.level) : []), [topic]);
  const solved = progress.topics[slug]?.solved ?? {};

  const nextUnsolved = (after?: string): ExerciseGen | undefined => {
    const start = after ? gens.findIndex((g) => g.id === after) + 1 : 0;
    return [...gens.slice(start), ...gens.slice(0, start)].find((g) => !(solved[g.id] > 0)) ?? gens[start % gens.length];
  };

  useEffect(() => {
    if (topic && genId === null) {
      const first = gens.find((g) => !(solved[g.id] > 0)) ?? gens[0];
      if (first) {
        setGenId(first.id);
        setSeed(randomSeed());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  const gen = gens.find((g) => g.id === genId);
  const exercise = useMemo(() => {
    if (!gen) return null;
    try {
      return gen.generate(makeRng(seed));
    } catch {
      return gen.generate(makeRng(seed + 1));
    }
  }, [gen, seed]);

  if (!topic) {
    return (
      <div className="grid gap-6 lg:grid-cols-[290px_1fr]">
        <div className="hidden h-96 animate-pulse rounded-2xl bg-sunk lg:block" />
        <div className="h-96 animate-pulse rounded-2xl bg-sunk" />
      </div>
    );
  }

  const m = mastery(progress, slug, gens.map((g) => g.id));
  const pick = (id: string) => {
    setGenId(id);
    setSeed(randomSeed());
    setListOpen(false);
  };

  const list = (
    <div className="flex flex-col gap-5">
      {([1, 2, 3] as const).map((lv) => {
        const items = gens.filter((g) => g.level === lv);
        if (!items.length) return null;
        return (
          <div key={lv}>
            <p className="mb-2 flex items-baseline gap-2 text-sm">
              <span className="font-semibold text-ink">{LEVEL[lv].name}</span>
              <span className="text-muted">{LEVEL[lv].hint}</span>
            </p>
            <ul className="flex flex-col gap-0.5">
              {items.map((g) => {
                const ok = (solved[g.id] ?? 0) > 0;
                const active = g.id === genId;
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => pick(g.id)}
                      className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-[0.95rem] transition-colors ${
                        active ? "bg-accent-soft text-accent-strong" : "text-ink-2 hover:bg-sunk"
                      }`}
                    >
                      {ok ? (
                        <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-good" />
                      ) : (
                        <Circle size={18} className="mt-0.5 shrink-0 text-line-2" />
                      )}
                      <span className="min-w-0 flex-1 leading-snug">{g.title}</span>
                      {g.exam ? <span className="mt-0.5 shrink-0 rounded bg-sunk px-1.5 text-[0.68rem] font-semibold uppercase text-muted">parcial</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[290px_1fr]">
      <aside className="lg:sticky lg:top-24">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Tu dominio del tema</p>
            <p className="font-display text-xl font-semibold tabular-nums text-accent">{Math.round(m * 100)}%</p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunk">
            <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${m * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">
            {gens.filter((g) => solved[g.id] > 0).length} de {gens.length} tipos de ejercicio resueltos sin ver la solución.
          </p>
          <button
            type="button"
            onClick={() => setListOpen((o) => !o)}
            className="mt-4 flex w-full items-center justify-between rounded-lg border border-line px-3 py-2 text-sm text-ink-2 lg:hidden"
          >
            Elegir tipo de ejercicio <CaretDown size={14} className={listOpen ? "rotate-180" : ""} />
          </button>
          <div className={`${listOpen ? "block" : "hidden"} mt-4 lg:block`}>{list}</div>
        </div>
      </aside>

      <div className="min-w-0">
        {gen && exercise ? (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <LevelBadge level={gen.level} />
              <h3 className="text-[1.05rem] font-semibold text-ink">{gen.title}</h3>
              <button
                type="button"
                onClick={() => setSeed(randomSeed())}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:bg-sunk hover:text-ink-2"
              >
                <Shuffle size={15} /> Cambiar números
              </button>
            </div>
            <ExercisePlayer
              key={`${gen.id}-${seed}`}
              exercise={exercise}
              onSolved={(clean) => recordAttempt(slug, gen.id, clean)}
              onNext={() => {
                const n = nextUnsolved(gen.id);
                if (n && n.id !== gen.id) setGenId(n.id);
                setSeed(randomSeed());
              }}
              nextLabel={nextUnsolved(gen.id)?.id !== gen.id ? "Siguiente ejercicio" : "Otro parecido"}
            />
            <p className="mt-4 flex items-center gap-2 text-sm text-muted">
              <Target size={16} /> Los números cambian cada vez, así que puedes practicar el mismo tipo las veces que quieras.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
