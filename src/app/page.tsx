import Link from "next/link";
import { ArrowRight, Exam } from "@phosphor-icons/react/dist/ssr";
import { MODULES, TOPICS, topicsOf } from "@/content/catalog";
import { loaders, topicIndex } from "@/content/generated";
import { DemoExercise, HeroGraph } from "@/components/home/hero-demo";
import { ContinueCard, ModuleProgress, ReviewNudge, TopicList } from "@/components/home/topic-list";

const STEPS = [
  {
    title: "Lee la idea, no la fórmula",
    text: "Cada tema arranca por la intuición, con ejemplos resueltos que se revelan paso a paso y gráficas que puedes mover.",
  },
  {
    title: "Practica con números nuevos cada vez",
    text: "Los ejercicios se generan al momento. Si fallas, pides otro igual con números distintos hasta que salga solo.",
  },
  {
    title: "Recibe la corrección al instante",
    text: "La app entiende expresiones equivalentes y reconoce los errores típicos, así que te dice qué se te pasó y no solo que está mal.",
  },
  {
    title: "Mídete con simulacros",
    text: "Parciales cronometrados, armados con preguntas del mismo estilo que los exámenes reales de la cátedra, con nota sobre 20.",
  },
];

export default function Home() {
  const available = Object.keys(loaders);
  const genIds = Object.fromEntries(Object.entries(topicIndex).map(([s, t]) => [s, t.exercises.map((e) => e.id)]));
  const totalGens = Object.values(topicIndex).reduce((n, t) => n + t.exercises.length, 0);
  const titles = Object.fromEntries(TOPICS.map((t) => [t.slug, t.title]));
  let offset = 0;

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-12 sm:px-6 md:pt-20 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="rise text-sm font-semibold uppercase tracking-[0.16em] text-accent">Matemática I · Escuela de Economía · UCV</p>
          <h1 className="rise mt-5 font-display text-[2.7rem] font-semibold leading-[0.98] tracking-[-0.025em] text-ink sm:text-[4rem]" style={{ animationDelay: "60ms" }}>
            La matemática del primer semestre, explicada desde cero.
          </h1>
          <p className="rise mt-6 max-w-[54ch] text-[1.15rem] leading-relaxed text-ink-2" style={{ animationDelay: "120ms" }}>
            Desde las fracciones hasta las derivadas. Lecciones cortas, gráficas que se mueven y ejercicios que te corrigen al momento y te explican en qué te equivocaste.
          </p>
          <div className="rise mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "180ms" }}>
            <Link
              href={available.includes("numeros") ? "/temas/numeros" : "#nivelacion"}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 font-medium text-surface transition-all hover:bg-accent-strong active:scale-[0.98]"
            >
              Empezar desde cero <ArrowRight size={18} weight="bold" />
            </Link>
            <Link href="#temario" className="inline-flex h-12 items-center rounded-full border border-line-2 px-6 font-medium text-ink transition-colors hover:bg-surface">
              Ver el temario
            </Link>
          </div>
          <p className="rise mt-6 text-sm text-muted" style={{ animationDelay: "240ms" }}>
            {TOPICS.length} temas · {totalGens} tipos de ejercicio · sin registro, tu avance se guarda en este navegador
          </p>
          <ContinueCard titles={titles} />
          <ReviewNudge />
        </div>
        <div className="rise relative" style={{ animationDelay: "200ms" }}>
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-[radial-gradient(ellipse_at_30%_20%,#e1eeec,transparent_60%)]" />
          <p className="mb-3 text-sm text-ink-2">
            <span className="font-semibold text-ink">Prueba:</span> la recta naranja es la tangente. Su pendiente es la derivada.
          </p>
          <HeroGraph />
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className="max-w-[16ch] font-display text-[2.2rem] font-semibold leading-[1.05] tracking-tight text-ink sm:text-[2.8rem]">
              Aprender haciendo, con alguien que te corrige.
            </h2>
            <ol className="mt-10 flex flex-col gap-7">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line-2 font-display font-semibold text-accent">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-ink">{s.title}</p>
                    <p className="mt-1 max-w-[48ch] leading-relaxed text-ink-2">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="lg:pt-16">
            <p className="mb-3 text-sm text-ink-2">
              <span className="font-semibold text-ink">Haz la prueba.</span> Equivócate a propósito y mira qué pasa.
            </p>
            <DemoExercise />
          </div>
        </div>
      </section>

      {/* Módulos */}
      {MODULES.map((m, mi) => {
        const ts = topicsOf(m.id);
        const start = offset;
        offset += ts.length;
        return (
          <section
            key={m.id}
            id={m.id === "nivelacion" ? "nivelacion" : mi === 1 ? "temario" : m.id}
            className="mx-auto grid max-w-6xl scroll-mt-20 gap-8 px-4 pt-20 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)]"
          >
            <div className="lg:sticky lg:top-24 lg:self-start">
              <p className="font-display text-[4.5rem] font-semibold leading-none text-line-2">{mi}</p>
              <h2 className="mt-2 font-display text-[2rem] font-semibold leading-tight tracking-tight text-ink">{m.title}</h2>
              <p className="mt-3 max-w-[40ch] leading-relaxed text-ink-2">{m.description}</p>
              <ModuleProgress slugs={ts.map((t) => t.slug)} genIds={genIds} />
            </div>
            <TopicList topics={ts} genIds={genIds} available={available} offset={start} />
          </section>
        );
      })}

      {/* Simulacros */}
      <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
        <div className="grid items-center gap-8 overflow-hidden rounded-[2rem] bg-ink px-6 py-12 text-surface sm:px-12 md:grid-cols-[1.4fr_1fr]">
          <div>
            <Exam size={36} className="text-[#f3c98b]" />
            <h2 className="mt-4 font-display text-[2.2rem] font-semibold leading-tight tracking-tight">Simulacros de parcial</h2>
            <p className="mt-3 max-w-[50ch] leading-relaxed text-surface/75">
              Cuando sientas que dominas un bloque, ponte a prueba con un examen cronometrado. Al final ves tu nota sobre 20 y la resolución de cada pregunta.
            </p>
          </div>
          <div className="md:text-right">
            <Link
              href="/simulacros"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-surface px-6 font-medium text-ink transition-transform active:scale-[0.98]"
            >
              Ver simulacros <ArrowRight size={18} weight="bold" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
