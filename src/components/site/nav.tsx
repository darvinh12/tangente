"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowClockwise, BookOpenText, Exam, House, MagnifyingGlass, Notebook, X,
} from "@phosphor-icons/react";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { MODULES, TOPICS } from "@/content/catalog";
import { loaders, topicIndex } from "@/content/generated";
import { dueCount, mastery, useProgress } from "@/lib/progress";
import { LogoMark } from "./logo";

const Ctx = createContext<{ open: () => void }>({ open: () => {} });
export const useTopicsMenu = () => useContext(Ctx);

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function DueBadge({ className = "" }: { className?: string }) {
  const p = useProgress();
  const n = dueCount(p);
  if (!n) return null;
  return (
    <span className={`inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[0.7rem] font-semibold leading-5 text-surface ${className}`}>
      {n > 99 ? "99+" : n}
    </span>
  );
}

function TopicsSheet({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const pathname = usePathname();
  const progress = useProgress();
  const inputRef = useRef<HTMLInputElement>(null);
  const currentSlug = pathname.startsWith("/temas/") ? pathname.split("/")[2] : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (window.matchMedia("(min-width: 768px)").matches) inputRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const nq = normalize(q.trim());
  const match = (title: string, summary: string) => !nq || normalize(title).includes(nq) || normalize(summary).includes(nq);
  let n = 0;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Todos los temas">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
      <div className="absolute inset-x-0 bottom-0 top-10 flex flex-col rounded-t-3xl bg-paper shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:top-0 md:w-[440px] md:rounded-none md:rounded-l-3xl">
        <div className="flex items-center gap-3 border-b border-line px-5 pb-3 pt-5">
          <h2 className="flex-1 font-display text-2xl font-semibold tracking-tight text-ink">Temas</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-sunk">
            <X size={20} />
          </button>
        </div>
        <div className="px-5 pt-3">
          <label className="flex items-center gap-2 rounded-xl border border-line-2 bg-surface px-3 focus-within:border-accent">
            <MagnifyingGlass size={18} className="text-muted" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar: límites, dominio, derivada…"
              className="h-11 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted/70"
            />
          </label>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-8 pt-2">
          {MODULES.map((m, mi) => {
            const ts = TOPICS.filter((t) => t.module === m.id);
            const shown = ts.filter((t) => match(t.title, t.summary));
            const start = n;
            n += ts.length;
            if (!shown.length) return null;
            return (
              <div key={m.id} className="mt-4">
                <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {mi}. {m.title}
                </p>
                <ul>
                  {shown.map((t) => {
                    const idx = start + ts.indexOf(t) + 1;
                    const ok = !!loaders[t.slug];
                    const pct = mastery(progress, t.slug, topicIndex[t.slug]?.exercises.map((e) => e.id) ?? []);
                    const active = t.slug === currentSlug;
                    return (
                      <li key={t.slug}>
                        <Link
                          href={ok ? `/temas/${t.slug}` : "#"}
                          onClick={onClose}
                          className={`flex items-center gap-3 rounded-xl px-2 py-2.5 ${active ? "bg-accent-soft" : "hover:bg-sunk"}`}
                        >
                          <span className="w-6 shrink-0 text-right text-sm tabular-nums text-muted">{idx}</span>
                          <span className={`min-w-0 flex-1 text-[0.98rem] leading-snug ${active ? "font-semibold text-accent-strong" : "text-ink"}`}>{t.title}</span>
                          {pct > 0 ? (
                            <span className={`shrink-0 text-xs tabular-nums ${pct >= 1 ? "font-semibold text-good" : "text-muted"}`}>{Math.round(pct * 100)}%</span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {nq && !TOPICS.some((t) => match(t.title, t.summary)) ? (
            <p className="px-2 pt-6 text-center text-ink-2">
              No hay temas con "{q}". Prueba en la <Link href="/consulta" onClick={onClose} className="text-accent underline">consulta rápida</Link>.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const ITEMS = [
  { href: "/", label: "Inicio", Icon: House, match: (p: string) => p === "/" },
  { href: "#temas", label: "Temas", Icon: BookOpenText, match: (p: string) => p.startsWith("/temas") },
  { href: "/repaso", label: "Repaso", Icon: ArrowClockwise, match: (p: string) => p.startsWith("/repaso") },
  { href: "/consulta", label: "Consulta", Icon: Notebook, match: (p: string) => p.startsWith("/consulta") },
  { href: "/simulacros", label: "Simulacros", Icon: Exam, match: (p: string) => p.startsWith("/simulacros") },
] as const;

export function SiteChrome({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ctx = useMemo(() => ({ open: () => setOpen(true) }), []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Ctx.Provider value={ctx}>
      <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/85 backdrop-blur-md print:hidden">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="group flex items-center gap-2.5" aria-label="Tangente, inicio">
            <LogoMark className="h-8 w-8 transition-transform duration-300 group-hover:-rotate-6" />
            <span className="font-display text-[1.35rem] font-semibold tracking-tight text-ink">Tangente</span>
          </Link>
          <nav className="hidden items-center gap-1 text-[0.95rem] md:flex">
            {ITEMS.slice(1).map((it) => {
              const active = it.match(pathname);
              const cls = `relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-colors ${
                active ? "bg-sunk text-ink" : "text-ink-2 hover:bg-sunk hover:text-ink"
              }`;
              return it.href === "#temas" ? (
                <button key={it.href} type="button" onClick={() => setOpen(true)} className={cls}>
                  {it.label}
                </button>
              ) : (
                <Link key={it.href} href={it.href} className={cls}>
                  {it.label}
                  {it.href === "/repaso" ? <DueBadge /> : null}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-surface px-3.5 py-1.5 text-[0.95rem] text-ink md:hidden"
          >
            <BookOpenText size={18} /> Temas
          </button>
        </div>
      </header>

      <main className="flex-1">{children}</main>
      <div className="pb-20 md:pb-0">{footer}</div>

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden print:hidden"
      >
        <ul className="grid grid-cols-5">
          {ITEMS.map((it) => {
            const active = it.href === "#temas" ? open || it.match(pathname) : it.match(pathname);
            const inner = (
              <>
                <span className="relative">
                  <it.Icon size={23} weight={active ? "fill" : "regular"} />
                  {it.href === "/repaso" ? <DueBadge className="absolute -right-3 -top-1.5" /> : null}
                </span>
                <span className="text-[0.68rem] font-medium">{it.label}</span>
              </>
            );
            const cls = `flex h-16 flex-col items-center justify-center gap-1 ${active ? "text-accent" : "text-muted"}`;
            return (
              <li key={it.href}>
                {it.href === "#temas" ? (
                  <button type="button" onClick={() => setOpen(true)} className={`w-full ${cls}`}>
                    {inner}
                  </button>
                ) : (
                  <Link href={it.href} className={cls}>
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {open ? <TopicsSheet onClose={() => setOpen(false)} /> : null}
    </Ctx.Provider>
  );
}

/** Botón que abre el menú de temas desde cualquier parte. */
export function OpenTopicsButton({ children, className }: { children: ReactNode; className?: string }) {
  const { open } = useTopicsMenu();
  return (
    <button type="button" onClick={open} className={className}>
      {children}
    </button>
  );
}
