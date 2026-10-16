"use client";

import type { Widget } from "@/content/types";
import { LimitWidget, MachineWidget, SecantWidget, SlidersWidget, TangentWidget } from "./explorers";
import { Mapping } from "./mapping";
import { NumberLine } from "./number-line";
import { Venn } from "./venn";

export function WidgetView({ widget }: { widget: Widget }) {
  switch (widget.kind) {
    case "sliders":
      return <SlidersWidget {...widget} />;
    case "venn":
      return <Venn a={widget.a} b={widget.b} universe={widget.universe} />;
    case "mapping":
      return <Mapping domain={widget.domain} codomain={widget.codomain} arrows={widget.arrows} editable={widget.editable} />;
    case "numberline":
      return (
        <div className="rounded-2xl border border-line bg-surface px-4 py-3">
          <NumberLine set={widget.set} range={widget.range} label={widget.label} />
        </div>
      );
    case "limit":
      return <LimitWidget fn={widget.fn} a={widget.a} x={widget.x} y={widget.y} breaks={widget.breaks} />;
    case "secant":
      return <SecantWidget fn={widget.fn} a={widget.a} x={widget.x} y={widget.y} />;
    case "tangent":
      return <TangentWidget fn={widget.fn} x={widget.x} y={widget.y} showAnalysis={widget.showAnalysis} derivative={widget.derivative} />;
    case "machine":
      return <MachineWidget fns={widget.fns} input={widget.input} min={widget.min} max={widget.max} />;
  }
}
