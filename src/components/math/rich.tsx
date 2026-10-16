import katex from "katex";
import { Fragment } from "react";
import { type Inline, parseInline, parseRich } from "@/lib/rich";

const cache = new Map<string, string>();

function renderTex(tex: string, display: boolean): string {
  const key = (display ? "D" : "I") + tex;
  const hit = cache.get(key);
  if (hit) return hit;
  const html = katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    strict: "ignore",
    output: "html",
  });
  if (cache.size > 4000) cache.clear();
  cache.set(key, html);
  return html;
}

export function Tex({ tex, display = false, className }: { tex: string; display?: boolean; className?: string }) {
  if (display) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: renderTex(tex, true) }} />;
  }
  return <span className={className} dangerouslySetInnerHTML={{ __html: renderTex(tex, false) }} />;
}

function Inlines({ items }: { items: Inline[] }) {
  // Si después de una fórmula viene un signo de puntuación, se queda en el mismo renglón.
  const glued = new Map<number, string>();
  items.forEach((x, i) => {
    const next = items[i + 1];
    if (x.t === "math" && x.v.length <= 28 && next?.t === "text") {
      const m = next.v.match(/^[.,;:)?!]+/);
      if (m) glued.set(i, m[0]);
    }
  });
  return (
    <>
      {items.map((x, i) => {
        if (x.t === "text") {
          const cut = glued.get(i - 1)?.length ?? 0;
          return <Fragment key={i}>{cut ? x.v.slice(cut) : x.v}</Fragment>;
        }
        if (x.t === "math") {
          const p = glued.get(i);
          return p ? (
            <span key={i} className="whitespace-nowrap">
              <Tex tex={x.v} />
              {p}
            </span>
          ) : (
            <Tex key={i} tex={x.v} />
          );
        }
        if (x.t === "bold") return <strong key={i}><Inlines items={x.v} /></strong>;
        return <em key={i}><Inlines items={x.v} /></em>;
      })}
    </>
  );
}

/** Texto enriquecido de una línea (sin párrafos). */
export function RichInline({ md }: { md: string }) {
  return <Inlines items={parseInline(md)} />;
}

/** Texto enriquecido con párrafos, listas y fórmulas en bloque. */
export function Rich({ md, className = "" }: { md: string; className?: string }) {
  const blocks = parseRich(md);
  return (
    <div className={`prose-tg ${className}`}>
      {blocks.map((b, i) => {
        if (b.t === "display") return <Tex key={i} tex={b.v} display />;
        if (b.t === "list") {
          return (
            <ul key={i}>
              {b.items.map((it, j) => (
                <li key={j}><Inlines items={it} /></li>
              ))}
            </ul>
          );
        }
        return <p key={i}><Inlines items={b.v} /></p>;
      })}
    </div>
  );
}
