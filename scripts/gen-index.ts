// Genera src/content/generated.ts con los cargadores de cada tema y un índice
// liviano (secciones y ejercicios) que la portada usa sin cargar los temas.
// Se ejecuta antes de dev y build.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { TOPICS } from "../src/content/catalog";
import type { Topic } from "../src/content/types";

async function main() {
  const dir = path.join(process.cwd(), "src", "content", "topics");
  const present = new Set(fs.readdirSync(dir).filter((f) => f.endsWith(".ts")).map((f) => f.replace(/\.ts$/, "")));
  const slugs = TOPICS.map((t) => t.slug).filter((s) => present.has(s));
  const index: Record<string, unknown> = {};
  for (const slug of slugs) {
    const mod = await import(pathToFileURL(path.join(dir, `${slug}.ts`)).href);
    const t: Topic = mod.default?.default ?? mod.default;
    index[slug] = {
      sections: t.sections.map((s) => ({ id: s.id, title: s.title })),
      exercises: t.exercises.map((e) => ({ id: e.id, title: e.title, level: e.level, exam: !!e.exam })),
    };
  }
  const out = `// Archivo generado por scripts/gen-index.ts. No editar a mano.
import type { Topic } from "./types";

export interface TopicIndex {
  sections: { id: string; title: string }[];
  exercises: { id: string; title: string; level: 1 | 2 | 3; exam: boolean }[];
}

export const loaders: Record<string, () => Promise<{ default: Topic }>> = {
${slugs.map((s) => `  ${JSON.stringify(s)}: () => import("./topics/${s}"),`).join("\n")}
};

export const topicIndex: Record<string, TopicIndex> = ${JSON.stringify(index, null, 2)};
`;
  fs.writeFileSync(path.join(process.cwd(), "src", "content", "generated.ts"), out);
  console.log(`Índice generado: ${slugs.length} de ${TOPICS.length} temas.`);
  const missing = TOPICS.filter((t) => !present.has(t.slug)).map((t) => t.slug);
  if (missing.length) console.log(`Faltan: ${missing.join(", ")}`);
}

main();
