import Link from "next/link";
import { LogoMark } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-7 w-7" />
            <span className="font-display text-xl font-semibold tracking-tight">Tangente</span>
          </div>
          <p className="mt-4 max-w-[52ch] text-[0.95rem] leading-relaxed text-ink-2">
            Recurso libre para estudiar Matemática I desde cero. El temario sigue el programa de la cátedra de
            Matemática I de la Escuela de Economía de la UCV.
          </p>
        </div>
        <div className="md:text-right">
          <p className="text-sm uppercase tracking-[0.14em] text-muted">Hecho por</p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">Darvin Hernández</p>
          <p className="mt-1 text-ink-2">Estudiante de Computación</p>
          <p className="text-ink-2">Universidad Central de Venezuela</p>
          <Link
            href="https://github.com/darvinh12/tangente"
            className="mt-4 inline-block text-sm text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
          >
            Código fuente en GitHub
          </Link>
        </div>
      </div>
    </footer>
  );
}
