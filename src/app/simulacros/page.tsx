import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, ListNumbers } from "@phosphor-icons/react/dist/ssr";
import { EXAMS } from "@/content/exams";
import { loaders } from "@/content/generated";
import { BestScore } from "@/components/exam/best-score";

export const metadata: Metadata = {
  title: "Simulacros",
  description: "Parciales cronometrados de Matemática I con nota sobre 20 y resolución de cada pregunta.",
};

export default function ExamsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Ponte a prueba</p>
      <h1 className="mt-3 max-w-[18ch] font-display text-[2.6rem] font-semibold leading-[1.02] tracking-tight text-ink sm:text-[3.4rem]">
        Simulacros de parcial
      </h1>
      <p className="mt-5 max-w-[60ch] text-[1.1rem] leading-relaxed text-ink-2">
        Cada simulacro arma un examen nuevo con preguntas del estilo de los parciales reales. No hay corrección mientras respondes. Al entregar ves tu nota sobre 20, qué tuviste bien y la resolución completa de cada pregunta.
      </p>
      <ul className="mt-12 grid gap-4 md:grid-cols-2">
        {EXAMS.map((e, i) => {
          const ready = e.topics.filter((t) => loaders[t]).length;
          return (
            <li key={e.id} className={i === 0 ? "md:col-span-2" : ""}>
              <Link
                href={`/simulacros/${e.id}`}
                className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-accent/40"
              >
                <div className="flex items-start justify-between gap-4">
                  <h2 className="font-display text-[1.5rem] font-semibold leading-tight tracking-tight text-ink group-hover:text-accent">{e.title}</h2>
                  <BestScore id={e.id} />
                </div>
                <p className="mt-2 max-w-[56ch] leading-relaxed text-ink-2">{e.description}</p>
                <div className="mt-auto flex flex-wrap items-center gap-4 pt-6 text-sm text-muted">
                  <span className="flex items-center gap-1.5"><Clock size={16} /> {e.minutes} min</span>
                  <span className="flex items-center gap-1.5"><ListNumbers size={16} /> {e.questions} preguntas</span>
                  {ready < e.topics.length ? <span>{ready} de {e.topics.length} temas listos</span> : null}
                  <ArrowRight size={18} className="ml-auto text-accent transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
