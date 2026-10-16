"use client";

import { useProgress } from "@/lib/progress";

export function BestScore({ id }: { id: string }) {
  const p = useProgress();
  const list = p.exams[id];
  if (!list?.length) return null;
  const best = Math.max(...list.map((r) => r.score));
  return (
    <span className="shrink-0 rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold tabular-nums text-accent-strong">
      Mejor: {best.toFixed(1).replace(".", ",")}/20
    </span>
  );
}
