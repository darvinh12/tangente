"use client";

import { BookOpen, CaretDown, CheckCircle, PencilSimpleLine } from "@phosphor-icons/react";
import { type ReactNode, useEffect, useState } from "react";
import { Practice } from "@/components/practice/practice";
import { useProgress } from "@/lib/progress";

type Tab = "aprende" | "practica";

export function TopicTabs({
  slug,
  sections,
  lesson,
}: {
  slug: string;
  sections: { id: string; title: string }[];
  lesson: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("aprende");
  const [practiceMounted, setPracticeMounted] = useState(false);
  const [secOpen, setSecOpen] = useState(false);
  const progress = useProgress();
  const read = new Set(progress.topics[slug]?.read ?? []);

  useEffect(() => {
    const fromHash = () => {
      if (window.location.hash === "#practica") {
        setTab("practica");
        setPracticeMounted(true);
      }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const go = (t: Tab) => {
    setTab(t);
    if (t === "practica") setPracticeMounted(true);
    history.replaceState(null, "", t === "practica" ? "#practica" : window.location.pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 mb-10 border-b border-line bg-paper/90 px-4 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex items-center">
        <div role="tablist" className="flex gap-1">
          {(
            [
              { id: "aprende", label: "Aprende", Icon: BookOpen },
              { id: "practica", label: "Practica", Icon: PencilSimpleLine },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              type="button"
              onClick={() => go(t.id)}
              className={`relative flex items-center gap-2 px-4 py-3.5 text-[0.98rem] font-medium transition-colors ${
                tab === t.id ? "text-ink" : "text-muted hover:text-ink-2"
              }`}
            >
              <t.Icon size={18} weight={tab === t.id ? "fill" : "regular"} />
              {t.label}
              <span
                className={`absolute inset-x-3 -bottom-px h-[2.5px] rounded-full bg-accent transition-transform duration-300 ${
                  tab === t.id ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </button>
          ))}
        </div>
        {tab === "aprende" ? (
          <div className="relative ml-auto lg:hidden">
            <button
              type="button"
              onClick={() => setSecOpen((o) => !o)}
              aria-expanded={secOpen}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-ink-2 hover:bg-sunk"
            >
              Secciones <CaretDown size={14} className={`transition-transform ${secOpen ? "rotate-180" : ""}`} />
            </button>
            {secOpen ? (
              <div className="pop absolute right-0 top-11 w-[min(78vw,300px)] rounded-2xl border border-line bg-surface p-2 shadow-[0_18px_40px_-20px_rgb(60_50_30/0.4)]">
                {sections.map((s, i) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={() => setSecOpen(false)}
                    className="flex items-start gap-2.5 rounded-xl px-2.5 py-2 text-[0.95rem] text-ink-2 hover:bg-sunk"
                  >
                    <span className="w-5 shrink-0 text-sm tabular-nums text-muted">{i + 1}</span>
                    <span className="min-w-0 flex-1 leading-snug">{s.title}</span>
                    {read.has(s.id) ? <CheckCircle size={15} weight="fill" className="mt-0.5 shrink-0 text-good" /> : null}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        </div>
      </div>

      <div className={tab === "aprende" ? "grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]" : "hidden"}>
        <nav aria-label="Secciones" className="hidden lg:block">
          <div className="sticky top-36">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">En este tema</p>
            <ol className="flex flex-col gap-1 border-l border-line">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="-ml-px flex items-start gap-2 border-l-2 border-transparent py-1 pl-3 text-[0.92rem] leading-snug text-ink-2 hover:border-accent hover:text-ink">
                    <span className="min-w-0 flex-1">{s.title}</span>
                    {read.has(s.id) ? <CheckCircle size={15} weight="fill" className="mt-0.5 shrink-0 text-good" /> : null}
                  </a>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => go("practica")}
              className="mt-6 w-full rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-accent-strong"
            >
              Ir a practicar
            </button>
          </div>
        </nav>
        <div className="min-w-0 max-w-[72ch]">
          {lesson}
          <div className="mt-16 rounded-2xl bg-ink px-6 py-7 text-surface sm:px-8">
            <p className="font-display text-2xl font-semibold tracking-tight">¿Listo para practicar?</p>
            <p className="mt-2 max-w-[52ch] text-surface/75">
              Los ejercicios van de lo básico a preguntas tipo parcial. Cada respuesta se corrige al instante y, si te equivocas, te decimos por qué.
            </p>
            <button
              type="button"
              onClick={() => go("practica")}
              className="mt-5 rounded-full bg-surface px-5 py-2.5 font-medium text-ink transition-transform active:scale-[0.98]"
            >
              Empezar a practicar
            </button>
          </div>
        </div>
      </div>

      <div className={tab === "practica" ? "" : "hidden"}>{practiceMounted ? <Practice slug={slug} /> : null}</div>
    </div>
  );
}
