import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { meta, moduleOf, MODULES, neighbors, TOPICS } from "@/content/catalog";
import { loaders, topicIndex } from "@/content/generated";
import { Lesson } from "@/components/lesson/lesson";
import { TopicTabs } from "@/components/lesson/topic-tabs";

export function generateStaticParams() {
  return TOPICS.filter((t) => loaders[t.slug]).map((t) => ({ slug: t.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/temas/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const t = TOPICS.find((x) => x.slug === slug);
  if (!t) return {};
  return { title: t.title, description: t.summary };
}

export default async function TopicPage({ params }: PageProps<"/temas/[slug]">) {
  const { slug } = await params;
  const load = loaders[slug];
  if (!load) notFound();
  const topic = (await load()).default;
  const m = meta(slug);
  const mod = moduleOf(m.module);
  const modIndex = MODULES.findIndex((x) => x.id === m.module);
  const inModule = TOPICS.filter((t) => t.module === m.module);
  const pos = inModule.findIndex((t) => t.slug === slug) + 1;
  const { prev, next } = neighbors(slug);
  const prevOk = prev && loaders[prev.slug] ? prev : undefined;
  const nextOk = next && loaders[next.slug] ? next : undefined;
  const nEx = topicIndex[slug]?.exercises.length ?? topic.exercises.length;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <header className="pb-10 pt-10 sm:pt-14">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <Link href="/" className="hover:text-ink-2">Inicio</Link>
          <span>/</span>
          <Link href={`/#${m.module === "nivelacion" ? "nivelacion" : "temario"}`} className="hover:text-ink-2">
            {mod.title}
          </Link>
        </nav>
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <p className="text-sm font-semibold tabular-nums text-accent">
              Módulo {modIndex} · Tema {pos} de {inModule.length}
            </p>
            <h1 className="mt-3 max-w-[20ch] font-display text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.02em] text-ink sm:text-[3.4rem]">
              {topic.title}
            </h1>
            <p className="mt-5 max-w-[60ch] text-[1.12rem] leading-relaxed text-ink-2">{topic.summary}</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Al terminar podrás</p>
            <ul className="flex flex-col gap-2 text-[0.95rem] leading-snug text-ink-2">
              {topic.objectives.map((o, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-line pt-3 text-sm text-muted">
              {topic.sections.length} secciones · {nEx} tipos de ejercicio
            </p>
          </div>
        </div>
      </header>

      <TopicTabs slug={slug} sections={topic.sections.map((s) => ({ id: s.id, title: s.title }))} lesson={<Lesson topic={topic} />} />

      <nav className="mt-20 grid gap-3 border-t border-line pt-8 sm:grid-cols-2">
        {prevOk ? (
          <Link href={`/temas/${prevOk.slug}`} className="group rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-2">
            <span className="flex items-center gap-1.5 text-sm text-muted"><ArrowLeft size={14} /> Anterior</span>
            <span className="mt-1 block font-display text-lg font-semibold text-ink group-hover:text-accent">{prevOk.title}</span>
          </Link>
        ) : <span />}
        {nextOk ? (
          <Link href={`/temas/${nextOk.slug}`} className="group rounded-2xl border border-line bg-surface p-5 text-right transition-colors hover:border-line-2">
            <span className="flex items-center justify-end gap-1.5 text-sm text-muted">Siguiente <ArrowRight size={14} /></span>
            <span className="mt-1 block font-display text-lg font-semibold text-ink group-hover:text-accent">{nextOk.title}</span>
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
