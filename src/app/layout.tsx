import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import "katex/dist/katex.min.css";
import "mafs/core.css";
import "./globals.css";
import { SiteChrome } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Tangente · Matemática I desde cero",
    template: "%s · Tangente",
  },
  description:
    "Lecciones interactivas y ejercicios con corrección inmediata para Matemática I de la Escuela de Economía de la UCV. Desde la nivelación hasta las derivadas.",
  authors: [{ name: "Darvin Hernández" }],
};

export const viewport: Viewport = {
  themeColor: "#f6f3ec",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${figtree.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteChrome footer={<SiteFooter />}>{children}</SiteChrome>
      </body>
    </html>
  );
}
