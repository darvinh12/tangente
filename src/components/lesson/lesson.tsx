import { Info, Lightbulb, TrendUp, Warning } from "@phosphor-icons/react/dist/ssr";
import type { Block, Topic } from "@/content/types";
import { Graph } from "@/components/math/graph";
import { Rich, RichInline } from "@/components/math/rich";
import { WidgetView } from "@/components/widgets/widget-view";
import { ExampleSteps } from "./example-steps";
import { QuickExercise } from "./quick-exercise";
import { SectionSeen } from "./section-seen";

const NOTE_STYLE = {
  tip: { box: "border-accent/25 bg-accent-soft/60", title: "text-accent-strong", Icon: Lightbulb, label: "Consejo" },
  warning: { box: "border-bad/20 bg-bad-soft/70", title: "text-bad", Icon: Warning, label: "Cuidado" },
  econ: { box: "border-econ/20 bg-econ-soft/80", title: "text-econ", Icon: TrendUp, label: "En economía" },
  idea: { box: "border-warn/25 bg-warn-soft/70", title: "text-warn", Icon: Info, label: "Para saber más" },
} as const;

function BlockView({ block, slug, si, bi }: { block: Block; slug: string; si: number; bi: number }) {
  switch (block.type) {
    case "text":
      return <Rich md={block.md} className="text-[1.06rem] leading-[1.75] text-ink-2" />;
    case "heading":
      return (
        <h3 className="pt-2 font-display text-[1.45rem] font-semibold leading-tight tracking-tight text-ink">
          <RichInline md={block.text} />
        </h3>
      );
    case "definition":
      return (
        <div className="relative rounded-2xl border border-line bg-surface px-5 py-4 pl-6 before:absolute before:inset-y-4 before:left-0 before:w-[3px] before:rounded-full before:bg-accent">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-accent">Definición</p>
          <p className="mb-2 font-display text-[1.2rem] font-semibold text-ink">
            <RichInline md={block.title} />
          </p>
          <Rich md={block.md} className="text-[1.04rem] leading-relaxed text-ink-2" />
        </div>
      );
    case "note": {
      const st = NOTE_STYLE[block.tone];
      return (
        <div className={`rounded-2xl border px-5 py-4 ${st.box}`}>
          <p className={`mb-1.5 flex items-center gap-1.5 text-sm font-semibold ${st.title}`}>
            <st.Icon size={17} weight="fill" />
            {block.title ? <RichInline md={block.title} /> : st.label}
          </p>
          <Rich md={block.md} className="text-[1.02rem] leading-relaxed text-ink-2" />
        </div>
      );
    }
    case "example":
      return <ExampleSteps title={block.title} problem={block.problem} steps={block.steps} answer={block.answer} />;
    case "graph":
      return (
        <figure>
          <Graph spec={block.spec} />
          {block.caption ? (
            <figcaption className="mt-2 text-center text-[0.93rem] text-muted">
              <RichInline md={block.caption} />
            </figcaption>
          ) : null}
        </figure>
      );
    case "widget":
      return (
        <figure>
          <WidgetView widget={block.widget} />
          {block.caption ? (
            <figcaption className="mt-2 text-center text-[0.93rem] text-muted">
              <RichInline md={block.caption} />
            </figcaption>
          ) : null}
        </figure>
      );
    case "table":
      return (
        <figure className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[480px] text-left text-[0.98rem]">
            <thead className="bg-sunk/70">
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-sm font-semibold text-ink-2">
                    <RichInline md={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i} className="border-t border-line">
                  {r.map((c, j) => (
                    <td key={j} className="px-4 py-2.5 align-top text-ink-2">
                      <RichInline md={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {block.caption ? (
            <figcaption className="border-t border-line px-4 py-2.5 text-[0.93rem] text-muted">
              <RichInline md={block.caption} />
            </figcaption>
          ) : null}
        </figure>
      );
    case "quick":
      return <QuickExercise slug={slug} si={si} bi={bi} />;
  }
}

export function Lesson({ topic }: { topic: Topic }) {
  return (
    <div className="flex flex-col gap-16">
      {topic.sections.map((s, si) => (
        <section key={s.id} id={s.id} className="scroll-mt-28">
          <p className="mb-2 text-sm font-semibold tabular-nums text-muted">{String(si + 1).padStart(2, "0")}</p>
          <h2 className="mb-6 font-display text-[1.9rem] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[2.2rem]">
            {s.title}
          </h2>
          <div className="flex flex-col gap-6">
            {s.blocks.map((b, bi) => (
              <BlockView key={bi} block={b} slug={topic.slug} si={si} bi={bi} />
            ))}
          </div>
          <SectionSeen slug={topic.slug} sectionId={s.id} />
        </section>
      ))}
    </div>
  );
}
