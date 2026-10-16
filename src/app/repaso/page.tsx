import type { Metadata } from "next";
import { ReviewSession } from "@/components/review/review-session";

export const metadata: Metadata = {
  title: "Repasa tus errores",
  description: "Vuelve a practicar, con números nuevos, los ejercicios en los que te equivocaste.",
};

export default function ReviewPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6 sm:pt-14">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Repaso espaciado</p>
      <h1 className="mt-3 font-display text-[2.4rem] font-semibold leading-[1.02] tracking-tight text-ink sm:text-[3rem]">Repasa tus errores</h1>
      <p className="mb-10 mt-4 max-w-[58ch] text-[1.08rem] leading-relaxed text-ink-2">
        Aquí vuelven los ejercicios que te costaron, con números distintos. Si te salen bien, regresan cada vez más espaciados hasta que los dominas. Si fallas, vuelven pronto.
      </p>
      <ReviewSession />
    </div>
  );
}
