import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EXAMS } from "@/content/exams";
import { ExamRunner } from "@/components/exam/exam-runner";

export function generateStaticParams() {
  return EXAMS.map((e) => ({ id: e.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/simulacros/[id]">): Promise<Metadata> {
  const { id } = await params;
  const e = EXAMS.find((x) => x.id === id);
  return e ? { title: e.title, description: e.description } : {};
}

export default async function ExamPage({ params }: PageProps<"/simulacros/[id]">) {
  const { id } = await params;
  const exam = EXAMS.find((e) => e.id === id);
  if (!exam) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <nav className="text-sm text-muted">
        <Link href="/simulacros" className="hover:text-ink-2">Simulacros</Link>
      </nav>
      <h1 className="mt-4 font-display text-[2.3rem] font-semibold leading-[1.05] tracking-tight text-ink sm:text-[3rem]">{exam.title}</h1>
      <p className="mb-8 mt-3 max-w-[60ch] text-[1.05rem] leading-relaxed text-ink-2">{exam.description}</p>
      <ExamRunner exam={exam} />
    </div>
  );
}
