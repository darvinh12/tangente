"use client";

import Link from "next/link";
import { MagnifyingGlass, Printer } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { MODULES, TOPICS } from "@/content/catalog";
import { FORMULAS, GLOSSARY } from "@/content/reference";
import { RichInline, Tex } from "@/components/math/rich";

type Tab = "formulas" | "glosario";

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const topicTitle = (slug: string) => TOPICS.find((t) => t.slug === slug)?.title ?? slug;

export function ReferenceView() {
  const [tab, setTab] = useState<Tab>("formulas");
  const [q, setQ] = useState("");
  const nq = norm(q.trim());

  const groups = useMemo(
    () =>
      FORMULAS.map((g) => ({
        ...g,
        items: g.items.filter((it) => !nq || norm(`${g.title} ${it.name} ${it.note ?? ""}`).includes(nq)),
      })).filter((g) => g.items.length),
    [nq],
  );
  const terms = useMemo(() => GLOSSARY.filter((t) => !nq || norm(`${t.term} ${t.def}`).includes(nq)), [nq]);
  const letters = useMemo(() => [...new Set(terms.map((t) => norm(t.term)[0].toUpperCase()))], [terms]);

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 mb-8 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" className="flex rounded-full bg-sunk p-1">
            {(
              [
                { id: "formulas", label: "Formulario" },
                { id: "glosario", label: "Glosario" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-full px-4 py-1.5 text-[0.95rem] font-medium transition-colors ${tab === t.id ? "bg-surface text-ink shadow-sm" : "text-ink-2"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-full border border-line-2 bg-surface px-3.5 focus-within:border-accent">
            <MagnifyingGlass size={17} className="text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tab === "formulas" ? "Buscar fórmula: cadena, logaritmo…" : "Buscar término: asíntota, dominio…"}
              className="h-10 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted/70"
            />
          </label>
          {tab === "formulas" ? (
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden items-center gap-1.5 rounded-full border border-line-2 px-3.5 py-2 text-sm text-ink-2 hover:bg-surface sm:inline-flex"
            >
              <Printer size={16} /> Imprimir
            </button>
          ) : null}
        </div>
      </div>

      {tab === "formulas" ? (
        <div className="flex flex-col gap-12 print:gap-6">
          {MODULES.map((m) => {
            const gs = groups.filter((g) => g.module === m.id);
            if (!gs.length) return null;
            return (
              <section key={m.id}>
                <h2 className="mb-5 font-display text-[1.7rem] font-semibold tracking-tight text-ink print:text-xl">{m.title}</h2>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 print:grid-cols-2 print:gap-3">
                  {gs.map((g) => (
                    <article key={g.id} className="min-w-0 break-inside-avoid rounded-2xl border border-line bg-surface p-5 print:rounded-none print:p-3">
                      <div className="mb-3 flex items-baseline justify-between gap-3">
                        <h3 className="font-semibold text-ink">{g.title}</h3>
                        <Link href={`/temas/${g.topic}`} className="shrink-0 text-xs text-accent hover:underline print:hidden">
                          Ver tema
                        </Link>
                      </div>
                      <dl className="flex flex-col divide-y divide-line">
                        {g.items.map((it, i) => (
                          <div key={i} className="py-2.5 first:pt-0 last:pb-0">
                            <dt className="text-sm text-muted">{it.name}</dt>
                            <dd className="mt-1 min-w-0 overflow-x-auto text-ink">
                              <Tex tex={it.tex} display />
                              {it.note ? (
                                <p className="mt-1 text-[0.88rem] leading-snug text-ink-2">
                                  <RichInline md={it.note} />
                                </p>
                              ) : null}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
          {!groups.length ? <p className="py-10 text-center text-ink-2">No hay fórmulas con "{q}".</p> : null}
        </div>
      ) : (
        <div>
          {letters.length > 4 && !nq ? (
            <nav className="mb-6 flex flex-wrap gap-1">
              {letters.map((l) => (
                <a key={l} href={`#letra-${l}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold text-ink-2 hover:bg-sunk">
                  {l}
                </a>
              ))}
            </nav>
          ) : null}
          <dl className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {terms.map((t, i) => {
              const l = norm(t.term)[0].toUpperCase();
              const first = i === 0 || norm(terms[i - 1].term)[0].toUpperCase() !== l;
              return (
                <div key={t.term} id={first ? `letra-${l}` : undefined} className="scroll-mt-40 px-5 py-4">
                  <dt className="font-display text-[1.15rem] font-semibold text-ink">{t.term}</dt>
                  <dd className="mt-1 leading-relaxed text-ink-2">
                    <RichInline md={t.def} />{" "}
                    <Link href={`/temas/${t.topic}`} className="whitespace-nowrap text-sm text-accent hover:underline">
                      {topicTitle(t.topic)} →
                    </Link>
                  </dd>
                </div>
              );
            })}
          </dl>
          {!terms.length ? <p className="py-10 text-center text-ink-2">No hay términos con "{q}".</p> : null}
        </div>
      )}
    </div>
  );
}
