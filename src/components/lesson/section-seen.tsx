"use client";

import { useEffect, useRef } from "react";
import { markRead } from "@/lib/progress";

/** Marca la sección como leída cuando su final entra en pantalla. */
export function SectionSeen({ slug, sectionId }: { slug: string; sectionId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          markRead(slug, sectionId);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -20% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [slug, sectionId]);
  return <div ref={ref} aria-hidden className="h-px" />;
}
