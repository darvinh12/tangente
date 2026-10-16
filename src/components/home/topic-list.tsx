"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react";
import type { TopicMeta } from "@/content/types";
import { mastery, useProgress } from "@/lib/progress";

function Ring({ value }: { value: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  if (value >= 1) return <CheckCircle size={36} weight="fill" className="text-good" />;
  return (
    <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90" aria-label={`${Math.round(value * 100)}% dominado`}>
      <circle cx="18" cy="18" r={r} fill="none" stroke="#e3ddd1" strokeWidth="3" />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="#1d6b66"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${c * value} ${c}`}
        className="transition-[stroke-dasharray] duration-700"
      />
    </svg>
  );
}

export function TopicList({
  topics,
  genIds,
  available,
  offset = 0,
}: {
  topics: TopicMeta[];
  genIds: Record<string, string[]>;
  available: string[];
  offset?: number;
}) {
  const progress = useProgress();
  return (
    <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {topics.map((t, i) => {
        const ok = available.includes(t.slug);
        const m = mastery(progress, t.slug, genIds[t.slug] ?? []);
        const read = progress.topics[t.slug]?.read.length ?? 0;
        const inner = (
          <>
            <span className="w-8 shrink-0 font-display text-lg font-semibold tabular-nums text-muted">
              {String(offset + i + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[1.06rem] font-semibold leading-snug text-ink group-hover:text-accent">{t.title}</span>
              <span className="mt-1 block text-[0.93rem] leading-snug text-muted">{t.summary}</span>
            </span>
            <span className="hidden shrink-0 sm:block">
              {ok ? (m > 0 || read > 0 ? <Ring value={m} /> : <ArrowRight size={20} className="text-line-2 transition-transform group-hover:translate-x-1 group-hover:text-accent" />) : (
                <span className="rounded-full bg-sunk px-2.5 py-1 text-xs text-muted">Pronto</span>
              )}
            </span>
          </>
        );
        return (
          <li key={t.slug}>
            {ok ? (
              <Link href={`/temas/${t.slug}`} className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-paper sm:px-6">
                {inner}
              </Link>
            ) : (
              <div className="flex items-center gap-4 px-4 py-4 opacity-60 sm:px-6">{inner}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function ModuleProgress({ slugs, genIds }: { slugs: string[]; genIds: Record<string, string[]> }) {
  const progress = useProgress();
  const total = slugs.reduce((n, s) => n + (genIds[s]?.length ?? 0), 0);
  const done = slugs.reduce((n, s) => n + Math.round(mastery(progress, s, genIds[s] ?? []) * (genIds[s]?.length ?? 0)), 0);
  if (!total) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="mt-5">
      <div className="h-1.5 overflow-hidden rounded-full bg-sunk">
        <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-sm tabular-nums text-muted">{pct}% del módulo dominado</p>
    </div>
  );
}

export function ContinueCard({ titles }: { titles: Record<string, string> }) {
  const progress = useProgress();
  const last = Object.entries(progress.topics)
    .filter(([s, t]) => t.lastVisit && titles[s])
    .sort((a, b) => (b[1].lastVisit ?? 0) - (a[1].lastVisit ?? 0))[0];
  if (!last) return null;
  return (
    <Link
      href={`/temas/${last[0]}`}
      className="rise group mt-8 flex max-w-md items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-4 transition-colors hover:border-accent/40"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Continúa donde quedaste</span>
        <span className="mt-0.5 block truncate font-semibold text-ink group-hover:text-accent">{titles[last[0]]}</span>
      </span>
      <ArrowRight size={20} className="text-accent transition-transform group-hover:translate-x-1" />
    </Link>
  );
}
