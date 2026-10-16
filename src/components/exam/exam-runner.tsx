"use client";

import { ArrowCounterClockwise, CheckCircle, Clock, XCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ExamSpec } from "@/content/exams";
import { TOPICS } from "@/content/catalog";
import { loaders } from "@/content/generated";
import type { Exercise, Topic } from "@/content/types";
import { Graph } from "@/components/math/graph";
import { Rich, RichInline } from "@/components/math/rich";
import { PartInput } from "@/components/exercise/part-input";
import { choiceOrders } from "@/components/exercise/player";
import { answerText, emptyValue, gradePart, isBlank, type PartValue, type Verdict } from "@/lib/grade";
import { makeRng, randomSeed } from "@/lib/math/rng";
import { recordExam } from "@/lib/progress";

interface Question {
  slug: string;
  title: string;
  exercise: Exercise;
  orders: number[][];
}

type Phase = "intro" | "loading" | "running" | "done";

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function fmtScore(n: number) {
  return (Math.round(n * 10) / 10).toFixed(1).replace(".", ",");
}

export function ExamRunner({ exam }: { exam: ExamSpec }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [values, setValues] = useState<PartValue[][]>([]);
  const [verdicts, setVerdicts] = useState<Verdict[][]>([]);
  const [left, setLeft] = useState(exam.minutes * 60);
  const [error, setError] = useState<string | null>(null);
  const points = 20 / exam.questions;

  const start = async () => {
    setPhase("loading");
    setError(null);
    const slugs = exam.topics.filter((s) => loaders[s]);
    if (!slugs.length) {
      setError("Los temas de este simulacro todavía no están disponibles.");
      setPhase("intro");
      return;
    }
    const mods: Topic[] = await Promise.all(slugs.map((s) => loaders[s]().then((m) => m.default)));
    const rng = makeRng(randomSeed());
    const qs: Question[] = [];
    for (let i = 0; i < exam.questions; i++) {
      const t = mods[i % mods.length];
      const pool = t.exercises.filter((g) => g.exam);
      const usable = pool.length ? pool : t.exercises.filter((g) => g.level === 3).concat(pool.length ? [] : t.exercises.filter((g) => g.level === 2));
      const used = new Set(qs.filter((q) => q.slug === t.slug).map((q) => q.title));
      const fresh = usable.filter((g) => !used.has(g.title));
      const g = rng.pick(fresh.length ? fresh : usable);
      const exercise = g.generate(makeRng(randomSeed()));
      qs.push({ slug: t.slug, title: g.title, exercise, orders: choiceOrders(exercise) });
    }
    setQuestions(qs);
    setValues(qs.map((q) => q.exercise.parts.map(emptyValue)));
    setVerdicts([]);
    setLeft(exam.minutes * 60);
    setPhase("running");
    window.scrollTo({ top: 0 });
  };

  const submit = useCallback(() => {
    const vs = questions.map((q, i) =>
      q.exercise.parts.map((p, j) => {
        const v = gradePart(p, values[i][j]);
        return v.status === "invalid" ? ({ status: "wrong", message: isBlank(values[i][j]) ? "Sin responder." : v.message } as Verdict) : v;
      }),
    );
    setVerdicts(vs);
    const score = vs.reduce((acc, parts) => acc + (points * parts.filter((v) => v.status === "correct").length) / parts.length, 0);
    recordExam(exam.id, Math.round(score * 10) / 10);
    setPhase("done");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [questions, values, points, exam.id]);

  useEffect(() => {
    if (phase !== "running") return;
    const id = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("beforeunload", warn);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === "running" && left === 0) submit();
  }, [left, phase, submit]);

  const answered = useMemo(
    () => values.filter((qv) => qv.some((v) => !isBlank(v))).length,
    [values],
  );

  const score = useMemo(
    () => verdicts.reduce((acc, parts) => acc + (parts.length ? (points * parts.filter((v) => v.status === "correct").length) / parts.length : 0), 0),
    [verdicts, points],
  );

  const topicTitle = (slug: string) => TOPICS.find((t) => t.slug === slug)?.title ?? slug;

  if (phase === "intro" || phase === "loading") {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <h2 className="font-display text-2xl font-semibold text-ink">Antes de empezar</h2>
        <ul className="mt-4 flex flex-col gap-2.5 text-ink-2">
          <li>Tienes <strong className="text-ink">{exam.minutes} minutos</strong> para {exam.questions} preguntas. Cada una vale {fmtScore(points)} puntos.</li>
          <li>Las preguntas con varias partes se puntúan por partes.</li>
          <li>No verás si vas bien hasta entregar. Ten a mano lápiz y papel, como en el examen real.</li>
          <li>Si se acaba el tiempo, el examen se entrega solo.</li>
        </ul>
        {error ? <p className="mt-4 rounded-lg bg-bad-soft px-3 py-2 text-bad">{error}</p> : null}
        <button
          type="button"
          onClick={start}
          disabled={phase === "loading"}
          className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 font-medium text-surface transition-all hover:bg-accent-strong active:scale-[0.98] disabled:opacity-60"
        >
          {phase === "loading" ? "Preparando el examen…" : "Comenzar simulacro"}
        </button>
      </div>
    );
  }

  return (
    <div>
      {phase === "running" ? (
        <div className="sticky top-16 z-20 -mx-4 mb-8 flex items-center gap-4 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
          <span className={`flex items-center gap-1.5 font-semibold tabular-nums ${left < 300 ? "text-bad" : "text-ink"}`}>
            <Clock size={18} /> {fmtTime(left)}
          </span>
          <span className="text-sm text-muted">
            {answered} de {questions.length} con respuesta
          </span>
          <button
            type="button"
            onClick={() => {
              if (answered < questions.length && !window.confirm("Hay preguntas sin responder. ¿Entregar de todas formas?")) return;
              submit();
            }}
            className="ml-auto rounded-full bg-ink px-5 py-2 text-sm font-medium text-surface transition-transform active:scale-[0.98]"
          >
            Entregar
          </button>
        </div>
      ) : (
        <div className="pop mb-10 grid gap-6 rounded-2xl border border-line bg-surface p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:p-8">
          <div className="text-center sm:text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">Tu nota</p>
            <p className={`font-display text-[4.5rem] font-semibold leading-none tabular-nums ${score >= 10 ? "text-good" : "text-bad"}`}>
              {fmtScore(score)}
              <span className="text-[2rem] text-muted">/20</span>
            </p>
          </div>
          <div>
            <p className="text-[1.05rem] leading-relaxed text-ink-2">
              {score >= 16
                ? "Excelente. Dominas este bloque. Revisa igual las preguntas falladas, porque ahí está lo que te puede costar puntos en el examen real."
                : score >= 10
                  ? "Aprobado. Mira abajo la resolución de lo que fallaste y repasa esos temas antes del parcial."
                  : "Todavía no. Abajo tienes la resolución de cada pregunta y el tema de donde salió. Practica esos temas y vuelve a intentarlo."}
            </p>
            <button
              type="button"
              onClick={start}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-line-2 px-5 py-2 font-medium text-ink hover:bg-paper"
            >
              <ArrowCounterClockwise size={17} /> Otro simulacro
            </button>
          </div>
        </div>
      )}

      <ol className="flex flex-col gap-8">
        {questions.map((q, i) => {
          const qv = verdicts[i];
          const got = qv ? (points * qv.filter((v) => v.status === "correct").length) / qv.length : 0;
          return (
            <li key={i} className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
              <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-xl font-semibold text-ink">Pregunta {i + 1}</span>
                <span className="text-sm text-muted">{fmtScore(points)} puntos</span>
                {phase === "done" ? (
                  <span className={`ml-auto rounded-full px-3 py-0.5 text-sm font-semibold tabular-nums ${got >= points - 1e-9 ? "bg-good-soft text-good" : got > 0 ? "bg-warn-soft text-warn" : "bg-bad-soft text-bad"}`}>
                    {fmtScore(got)} / {fmtScore(points)}
                  </span>
                ) : null}
              </div>
              <Rich md={q.exercise.statement} className="text-[1.06rem] leading-relaxed" />
              {q.exercise.graph ? (
                <div className="mt-4">
                  <Graph spec={q.exercise.graph} />
                </div>
              ) : null}
              <div className="mt-5 flex flex-col gap-6">
                {q.exercise.parts.map((p, j) => {
                  const v = qv?.[j];
                  return (
                    <div key={j}>
                      {q.exercise.parts.length > 1 ? (
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Parte {j + 1}</p>
                      ) : null}
                      {p.prompt ? <Rich md={p.prompt} className="mb-3" /> : null}
                      <PartInput
                        part={p}
                        value={values[i][j]}
                        order={q.orders[j]}
                        disabled={phase === "done"}
                        reveal={phase === "done"}
                        onChange={(nv) => setValues((s) => s.map((row, a) => (a === i ? row.map((x, b) => (b === j ? nv : x)) : row)))}
                      />
                      {v ? (
                        <div className={`mt-3 flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[0.95rem] ${v.status === "correct" ? "bg-good-soft" : "bg-bad-soft"}`}>
                          {v.status === "correct" ? <CheckCircle size={20} weight="fill" className="mt-px shrink-0 text-good" /> : <XCircle size={20} weight="fill" className="mt-px shrink-0 text-bad" />}
                          <div className="text-ink">
                            {v.status === "correct" ? <p className="font-semibold text-good">Correcto</p> : (
                              <>
                                <Rich md={v.message ?? ""} />
                                <p className="mt-1 text-ink-2">Respuesta correcta: <RichInline md={answerText(p)} /></p>
                              </>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {phase === "done" ? (
                <details className="mt-5 rounded-xl border border-line bg-paper px-4 py-3">
                  <summary className="cursor-pointer text-sm font-semibold text-accent">Ver la resolución</summary>
                  <ol className="mt-3 flex flex-col gap-2.5">
                    {q.exercise.solution.map((s, k) => (
                      <li key={k} className="flex gap-3">
                        <span className="text-sm font-semibold text-muted">{k + 1}.</span>
                        <Rich md={s} className="min-w-0 flex-1" />
                      </li>
                    ))}
                  </ol>
                  <Link href={`/temas/${q.slug}#practica`} className="mt-3 inline-block text-sm text-accent underline underline-offset-4">
                    Practicar {topicTitle(q.slug)}
                  </Link>
                </details>
              ) : null}
            </li>
          );
        })}
      </ol>

      {phase === "running" ? (
        <div className="mt-10 flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (answered < questions.length && !window.confirm("Hay preguntas sin responder. ¿Entregar de todas formas?")) return;
              submit();
            }}
            className="inline-flex h-12 items-center rounded-full bg-accent px-6 font-medium text-surface hover:bg-accent-strong"
          >
            Entregar examen
          </button>
        </div>
      ) : null}
    </div>
  );
}
