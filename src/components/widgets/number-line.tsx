import type { Interval } from "@/lib/math/check";
import { normalizeUnion } from "@/lib/math/check";

function fmt(n: number) {
  if (Number.isInteger(n)) return String(n).replace("-", "−");
  for (let d = 2; d <= 12; d++) {
    const k = Math.round(n * d);
    if (Math.abs(k / d - n) < 1e-9) return `${k < 0 ? "−" : ""}${Math.abs(k)}/${d}`;
  }
  return String(Math.round(n * 100) / 100).replace(".", ",").replace("-", "−");
}

/** Recta numérica que pinta una unión de intervalos. */
export function NumberLine({
  set,
  range,
  label,
  compact,
}: {
  set: Interval[];
  range?: [number, number];
  label?: string;
  compact?: boolean;
}) {
  const S = normalizeUnion(set);
  const ends = S.flatMap((I) => [I.lo, I.hi]).filter(Number.isFinite);
  const [a, b] = range ?? (ends.length ? [Math.floor(Math.min(...ends)) - 2, Math.ceil(Math.max(...ends)) + 2] : [-5, 5]);
  const W = 640;
  const H = compact ? 64 : 84;
  const pad = 26;
  const y = compact ? 30 : 40;
  const X = (v: number) => pad + ((Math.max(a, Math.min(b, v)) - a) / (b - a)) * (W - 2 * pad);
  const span = b - a;
  const tickStep = span <= 14 ? 1 : span <= 30 ? 2 : span <= 70 ? 5 : 10;
  const ticks: number[] = [];
  for (let t = Math.ceil(a / tickStep) * tickStep; t <= b; t += tickStep) ticks.push(t);
  const keyPoints = new Set(ends.map((e) => Math.round(e * 1e6) / 1e6));
  return (
    <figure className="w-full">
      {label ? <figcaption className="mb-1 text-sm font-medium text-ink-2">{label}</figcaption> : null}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label ?? "Recta numérica"}>
        <defs>
          <marker id="nl-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10z" fill="#847e73" />
          </marker>
        </defs>
        <line x1={8} y1={y} x2={W - 8} y2={y} stroke="#847e73" strokeWidth={1.5} markerStart="url(#nl-arrow)" markerEnd="url(#nl-arrow)" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={X(t)} x2={X(t)} y1={y - 5} y2={y + 5} stroke="#b9b2a4" strokeWidth={1} />
            {!keyPoints.has(t) ? (
              <text x={X(t)} y={y + 22} textAnchor="middle" fontSize={13} fill="#847e73">
                {fmt(t)}
              </text>
            ) : null}
          </g>
        ))}
        {S.map((I, i) => {
          const x1 = Number.isFinite(I.lo) ? X(I.lo) : 8;
          const x2 = Number.isFinite(I.hi) ? X(I.hi) : W - 8;
          return (
            <g key={i}>
              {I.lo !== I.hi ? (
                <line x1={x1} x2={x2} y1={y} y2={y} stroke="#1d6b66" strokeWidth={6} strokeLinecap={Number.isFinite(I.lo) && Number.isFinite(I.hi) ? "butt" : "round"} />
              ) : null}
              {[
                { v: I.lo, closed: I.loClosed },
                { v: I.hi, closed: I.hiClosed },
              ]
                .filter((e) => Number.isFinite(e.v))
                .map((e, k) => (
                  <g key={k}>
                    <circle cx={X(e.v)} cy={y} r={7} fill={e.closed ? "#1d6b66" : "#fffdf8"} stroke="#1d6b66" strokeWidth={2.5} />
                    <text x={X(e.v)} y={y + 24} textAnchor="middle" fontSize={14} fontWeight={600} fill="#1e1c19">
                      {fmt(e.v)}
                    </text>
                  </g>
                ))}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
