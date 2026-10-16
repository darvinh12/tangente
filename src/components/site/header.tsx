import Link from "next/link";
import { LogoMark } from "./logo";

const links = [
  { href: "/#nivelacion", label: "Nivelación" },
  { href: "/#temario", label: "Temario" },
  { href: "/simulacros", label: "Simulacros" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="Tangente, inicio">
          <LogoMark className="h-8 w-8 transition-transform duration-300 group-hover:-rotate-6" />
          <span className="font-display text-[1.35rem] font-semibold tracking-tight text-ink">Tangente</span>
        </Link>
        <nav className="flex items-center gap-1 text-[0.95rem]">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-3 py-1.5 text-ink-2 transition-colors hover:bg-sunk hover:text-ink ${
                l.href === "/#nivelacion" ? "hidden sm:inline-flex" : ""
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
