import type { Metadata } from "next";
import { ReferenceView } from "@/components/reference/reference-view";

export const metadata: Metadata = {
  title: "Consulta rápida",
  description: "Formulario imprimible y glosario de Matemática I: derivadas, límites, logaritmos, factorización y más.",
};

export default function ReferencePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent print:hidden">Consulta rápida</p>
      <h1 className="mt-3 font-display text-[2.4rem] font-semibold leading-[1.02] tracking-tight text-ink sm:text-[3rem] print:text-3xl">
        Formulario y glosario
      </h1>
      <p className="mb-8 mt-4 max-w-[60ch] text-[1.08rem] leading-relaxed text-ink-2 print:hidden">
        Todas las fórmulas del curso en un solo lugar, ordenadas por módulo, y un glosario con los términos que usa la cátedra. Cada entrada te lleva al tema donde se explica.
      </p>
      <ReferenceView />
    </div>
  );
}
