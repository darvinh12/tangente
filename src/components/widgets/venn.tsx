"use client";

import { useId, useState } from "react";
import { Tex } from "@/components/math/rich";

type Op = "A" | "B" | "cup" | "cap" | "AmB" | "BmA" | "Ac" | "sym";

const OPS: { id: Op; tex: string; name: string }[] = [
  { id: "cup", tex: "A \\cup B", name: "Unión" },
  { id: "cap", tex: "A \\cap B", name: "Intersección" },
  { id: "AmB", tex: "A - B", name: "Diferencia" },
  { id: "BmA", tex: "B - A", name: "Diferencia" },
  { id: "Ac", tex: "A^c", name: "Complemento" },
  { id: "sym", tex: "A \\triangle B", name: "Simétrica" },
];

export function Venn({ a = [], b = [], universe = [] }: { a?: string[]; b?: string[]; universe?: string[] }) {
  const [op, setOp] = useState<Op>("cup");
  const uid = useId().replace(/:/g, "");
  const onlyA = a.filter((x) => !b.includes(x));
  const both = a.filter((x) => b.includes(x));
  const onlyB = b.filter((x) => !a.includes(x));
  const zones = {
    onlyA: ["A", "cup", "AmB", "sym"].includes(op),
    both: ["A", "B", "cup", "cap"].includes(op),
    onlyB: ["B", "cup", "BmA", "Ac", "sym"].includes(op),
    out: op === "Ac",
  };
  const result = [
    ...(zones.onlyA ? onlyA : []),
    ...(zones.both ? both : []),
    ...(zones.onlyB ? onlyB : []),
    ...(zones.out ? universe : []),
  ];
  const fill = "#1d6b66";
  const W = 420;
  const H = 250;
  const cA = { x: 160, y: 125 };
  const cB = { x: 260, y: 125 };
  const r = 92;
  const place = (items: string[], cx: number, cy: number) =>
    items.map((t, i) => {
      const cols = items.length > 3 ? 2 : 1;
      const row = Math.floor(i / cols);
      const col = i % cols;
      const rows = Math.ceil(items.length / cols);
      return (
        <text key={t} x={cx + (cols === 2 ? (col - 0.5) * 30 : 0)} y={cy + (row - (rows - 1) / 2) * 26 + 6} textAnchor="middle" fontSize={18} fontWeight={600} fill="#1e1c19">
          {t}
        </text>
      );
    });
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap gap-1.5">
        {OPS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setOp(o.id)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              op === o.id ? "border-accent bg-accent text-surface" : "border-line-2 bg-surface text-ink-2 hover:border-accent"
            }`}
          >
            <Tex tex={o.tex} />
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-[460px]" role="img" aria-label="Diagrama de Venn">
        <defs>
          <clipPath id={`${uid}a`}><circle cx={cA.x} cy={cA.y} r={r} /></clipPath>
          <clipPath id={`${uid}b`}><circle cx={cB.x} cy={cB.y} r={r} /></clipPath>
          <mask id={`${uid}nb`}><rect width={W} height={H} fill="white" /><circle cx={cB.x} cy={cB.y} r={r} fill="black" /></mask>
          <mask id={`${uid}na`}><rect width={W} height={H} fill="white" /><circle cx={cA.x} cy={cA.y} r={r} fill="black" /></mask>
        </defs>
        <rect x={4} y={4} width={W - 8} height={H - 8} rx={14} fill={zones.out ? fill : "#fffdf8"} fillOpacity={zones.out ? 0.22 : 1} stroke="#d3ccbd" />
        {zones.out ? <circle cx={cA.x} cy={cA.y} r={r} fill="#fffdf8" /> : null}
        {zones.out ? <circle cx={cB.x} cy={cB.y} r={r} fill="#fffdf8" /> : null}
        {zones.onlyA ? <circle cx={cA.x} cy={cA.y} r={r} fill={fill} fillOpacity={0.28} mask={`url(#${uid}nb)`} /> : null}
        {zones.onlyB ? <circle cx={cB.x} cy={cB.y} r={r} fill={fill} fillOpacity={0.28} mask={`url(#${uid}na)`} /> : null}
        {zones.both ? <circle cx={cB.x} cy={cB.y} r={r} fill={fill} fillOpacity={0.28} clipPath={`url(#${uid}a)`} /> : null}
        <circle cx={cA.x} cy={cA.y} r={r} fill="none" stroke="#1e1c19" strokeWidth={1.6} />
        <circle cx={cB.x} cy={cB.y} r={r} fill="none" stroke="#1e1c19" strokeWidth={1.6} />
        <text x={cA.x - 70} y={40} fontSize={20} fontWeight={700} fill="#1e1c19" fontStyle="italic">A</text>
        <text x={cB.x + 60} y={40} fontSize={20} fontWeight={700} fill="#1e1c19" fontStyle="italic">B</text>
        <text x={W - 26} y={30} fontSize={16} fill="#847e73" fontStyle="italic">U</text>
        {place(onlyA, cA.x - 42, cA.y)}
        {place(both, (cA.x + cB.x) / 2, cA.y)}
        {place(onlyB, cB.x + 42, cB.y)}
        {universe.map((t, i) => (
          <text key={t} x={30 + i * 26} y={H - 20} fontSize={17} fontWeight={600} fill="#1e1c19">{t}</text>
        ))}
      </svg>
      <p className="mt-3 text-center text-[1.05rem] text-ink-2">
        <span className="font-medium text-ink">{OPS.find((o) => o.id === op)?.name}: </span>
        <Tex tex={`${OPS.find((o) => o.id === op)?.tex} = ${result.length ? `\\{${result.join(", ")}\\}` : "\\varnothing"}`} />
      </p>
    </div>
  );
}
