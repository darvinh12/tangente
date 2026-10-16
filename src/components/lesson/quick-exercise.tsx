"use client";

import { useEffect, useState } from "react";
import type { Exercise } from "@/content/types";
import { loaders } from "@/content/generated";
import { ExercisePlayer } from "@/components/exercise/player";

/** Ejercicio corto embebido en la lección. Se carga en el cliente porque puede traer funciones. */
export function QuickExercise({ slug, si, bi }: { slug: string; si: number; bi: number }) {
  const [ex, setEx] = useState<Exercise | null>(null);
  useEffect(() => {
    let alive = true;
    loaders[slug]?.().then((m) => {
      const b = m.default.sections[si]?.blocks[bi];
      if (alive && b?.type === "quick") setEx(b.exercise);
    });
    return () => {
      alive = false;
    };
  }, [slug, si, bi]);
  return (
    <div className="rounded-2xl border-[1.5px] border-dashed border-accent/40 bg-accent-soft/30 p-5 sm:p-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-accent">Compruébalo tú</p>
      {ex ? (
        <ExercisePlayer exercise={ex} compact />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="h-5 w-3/4 animate-pulse rounded bg-sunk" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-sunk" />
        </div>
      )}
    </div>
  );
}
