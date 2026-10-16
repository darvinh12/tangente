// Interpreta el formato de texto enriquecido de las lecciones (ver content/types.ts).

export type Inline =
  | { t: "text"; v: string }
  | { t: "math"; v: string }
  | { t: "bold"; v: Inline[] }
  | { t: "italic"; v: Inline[] };

export type RichBlock =
  | { t: "p"; v: Inline[] }
  | { t: "display"; v: string }
  | { t: "list"; items: Inline[][] };

function parseEmphasis(text: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*(.+?)\*\*|(?<![\w\\])_(.+?)_(?!\w)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: "text", v: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ t: "bold", v: [{ t: "text", v: m[1] }] });
    else out.push({ t: "italic", v: [{ t: "text", v: m[2] }] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ t: "text", v: text.slice(last) });
  return out;
}

/** Inline: separa $...$ del texto y aplica negrita/cursiva fuera de la matemática. */
export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  // Negrita que envuelve matemática: **texto $x$ texto**
  const boldRe = /\*\*([\s\S]+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const pushPlain = (s: string) => {
    const parts = s.split(/(\$[^$]+\$)/g);
    for (const p of parts) {
      if (!p) continue;
      if (p.startsWith("$") && p.endsWith("$") && p.length > 1) out.push({ t: "math", v: p.slice(1, -1) });
      else out.push(...parseEmphasis(p));
    }
  };
  while ((m = boldRe.exec(src))) {
    if (m.index > last) pushPlain(src.slice(last, m.index));
    const inner = parseInline(m[1]);
    out.push({ t: "bold", v: inner });
    last = m.index + m[0].length;
  }
  if (last < src.length) pushPlain(src.slice(last));
  return out;
}

export function parseRich(src: string): RichBlock[] {
  const blocks: RichBlock[] = [];
  // Primero aislar $$...$$
  const chunks = src.split(/(\$\$[\s\S]+?\$\$)/g);
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    if (chunk.startsWith("$$") && chunk.endsWith("$$")) {
      blocks.push({ t: "display", v: chunk.slice(2, -2).trim() });
      continue;
    }
    const paras = chunk.split(/\n\s*\n/);
    for (const para of paras) {
      const lines = para.split("\n").map((l) => l.trim()).filter(Boolean);
      if (!lines.length) continue;
      if (lines.every((l) => l.startsWith("- "))) {
        blocks.push({ t: "list", items: lines.map((l) => parseInline(l.slice(2))) });
      } else if (lines.some((l) => l.startsWith("- "))) {
        let buf: string[] = [];
        let items: Inline[][] = [];
        const flushP = () => {
          if (buf.length) blocks.push({ t: "p", v: parseInline(buf.join(" ")) });
          buf = [];
        };
        const flushL = () => {
          if (items.length) blocks.push({ t: "list", items });
          items = [];
        };
        for (const l of lines) {
          if (l.startsWith("- ")) {
            flushP();
            items.push(parseInline(l.slice(2)));
          } else {
            flushL();
            buf.push(l);
          }
        }
        flushP();
        flushL();
      } else {
        blocks.push({ t: "p", v: parseInline(lines.join(" ")) });
      }
    }
  }
  return blocks;
}

/** Todas las fórmulas de un texto, para validarlas con KaTeX. */
export function mathOf(src: string): { tex: string; display: boolean }[] {
  const out: { tex: string; display: boolean }[] = [];
  const walk = (xs: Inline[]) => {
    for (const x of xs) {
      if (x.t === "math") out.push({ tex: x.v, display: false });
      else if (x.t === "bold" || x.t === "italic") walk(x.v);
    }
  };
  for (const b of parseRich(src)) {
    if (b.t === "display") out.push({ tex: b.v, display: true });
    else if (b.t === "p") walk(b.v);
    else b.items.forEach(walk);
  }
  return out;
}
