"use client";

import { useId, useState } from "react";
import { RichInline } from "@/components/math/rich";

function classify(nA: number, nB: number, arrows: [number, number][]) {
  const out = Array.from({ length: nA }, (_, i) => arrows.filter(([a]) => a === i).length);
  const inc = Array.from({ length: nB }, (_, j) => arrows.filter(([, b]) => b === j).length);
  const sinImagen = out.map((c, i) => (c === 0 ? i : -1)).filter((i) => i >= 0);
  const variasImagenes = out.map((c, i) => (c > 1 ? i : -1)).filter((i) => i >= 0);
  const esFuncion = sinImagen.length === 0 && variasImagenes.length === 0;
  const inyectiva = esFuncion && inc.every((c) => c <= 1);
  const sobre = esFuncion && inc.every((c) => c >= 1);
  return { esFuncion, inyectiva, sobre, sinImagen, variasImagenes, inc };
}

export function Mapping({
  domain,
  codomain,
  arrows: initial,
  editable,
}: {
  domain: string[];
  codomain: string[];
  arrows: [number, number][];
  editable?: boolean;
}) {
  const [arrows, setArrows] = useState<[number, number][]>(initial);
  const [pick, setPick] = useState<number | null>(null);
  const uid = useId().replace(/:/g, "");
  const n = Math.max(domain.length, codomain.length);
  const rowH = 46;
  const H = n * rowH + 60;
  const W = 420;
  const xA = 110;
  const xB = 310;
  const yOf = (i: number, len: number) => 40 + (i + 0.5) * ((H - 60) / len);
  const c = classify(domain.length, codomain.length, arrows);

  const toggle = (a: number, b: number) => {
    setArrows((prev) => (prev.some(([x, y]) => x === a && y === b) ? prev.filter(([x, y]) => !(x === a && y === b)) : [...prev, [a, b]]));
  };

  const verdicts: { ok: boolean; text: string }[] = [
    {
      ok: c.esFuncion,
      text: c.esFuncion
        ? "Es función: cada elemento de $A$ tiene exactamente una imagen."
        : c.sinImagen.length
          ? `No es función: ${c.sinImagen.map((i) => `$${domain[i]}$`).join(", ")} ${c.sinImagen.length > 1 ? "no tienen" : "no tiene"} imagen.`
          : `No es función: ${c.variasImagenes.map((i) => `$${domain[i]}$`).join(", ")} ${c.variasImagenes.length > 1 ? "tienen" : "tiene"} más de una imagen.`,
    },
  ];
  if (c.esFuncion) {
    verdicts.push({
      ok: c.inyectiva,
      text: c.inyectiva ? "Inyectiva: ningún elemento de $B$ recibe dos flechas." : "No es inyectiva: algún elemento de $B$ recibe dos o más flechas.",
    });
    verdicts.push({
      ok: c.sobre,
      text: c.sobre ? "Sobreyectiva: todo elemento de $B$ recibe al menos una flecha." : "No es sobreyectiva: algún elemento de $B$ no recibe flechas.",
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      {editable ? (
        <p className="mb-3 text-sm text-ink-2">
          Toca un elemento de <em>A</em> y después uno de <em>B</em> para poner o quitar una flecha.
        </p>
      ) : null}
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-[440px] select-none" role="img" aria-label="Diagrama sagital">
        <defs>
          <marker id={`${uid}arr`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 10 5 0 10z" fill="#1d6b66" />
          </marker>
        </defs>
        <ellipse cx={xA} cy={H / 2 + 10} rx={58} ry={(H - 40) / 2} fill="#efebe2" stroke="#d3ccbd" />
        <ellipse cx={xB} cy={H / 2 + 10} rx={58} ry={(H - 40) / 2} fill="#efebe2" stroke="#d3ccbd" />
        <text x={xA} y={22} textAnchor="middle" fontSize={18} fontStyle="italic" fontWeight={700} fill="#1e1c19">A</text>
        <text x={xB} y={22} textAnchor="middle" fontSize={18} fontStyle="italic" fontWeight={700} fill="#1e1c19">B</text>
        {arrows.map(([a, b], k) => (
          <line
            key={k}
            x1={xA + 16}
            y1={yOf(a, domain.length) + 10}
            x2={xB - 18}
            y2={yOf(b, codomain.length) + 10}
            stroke="#1d6b66"
            strokeWidth={2}
            markerEnd={`url(#${uid}arr)`}
          />
        ))}
        {domain.map((d, i) => (
          <g
            key={`a${i}`}
            onClick={editable ? () => setPick(pick === i ? null : i) : undefined}
            className={editable ? "cursor-pointer" : undefined}
          >
            <circle cx={xA} cy={yOf(i, domain.length) + 10} r={15} fill={pick === i ? "#1d6b66" : "#fffdf8"} stroke="#1d6b66" strokeWidth={1.5} />
            <text x={xA} y={yOf(i, domain.length) + 15} textAnchor="middle" fontSize={15} fontWeight={600} fill={pick === i ? "#fffdf8" : "#1e1c19"}>{d}</text>
          </g>
        ))}
        {codomain.map((d, j) => (
          <g
            key={`b${j}`}
            onClick={editable && pick !== null ? () => { toggle(pick, j); setPick(null); } : undefined}
            className={editable && pick !== null ? "cursor-pointer" : undefined}
          >
            <circle cx={xB} cy={yOf(j, codomain.length) + 10} r={15} fill="#fffdf8" stroke={editable && pick !== null ? "#1d6b66" : "#9a9387"} strokeWidth={1.5} />
            <text x={xB} y={yOf(j, codomain.length) + 15} textAnchor="middle" fontSize={15} fontWeight={600} fill="#1e1c19">{d}</text>
          </g>
        ))}
      </svg>
      <ul className="mt-3 flex flex-col gap-1.5">
        {verdicts.map((v, i) => (
          <li key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-[0.95rem] ${v.ok ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
            <span className="mt-[3px] inline-block h-2 w-2 shrink-0 rounded-full bg-current" />
            <span className="text-ink"><RichInline md={v.text} /></span>
          </li>
        ))}
      </ul>
      {editable && JSON.stringify(arrows) !== JSON.stringify(initial) ? (
        <button type="button" onClick={() => { setArrows(initial); setPick(null); }} className="mt-3 text-sm text-accent underline underline-offset-4">
          Volver al diagrama original
        </button>
      ) : null}
    </div>
  );
}
