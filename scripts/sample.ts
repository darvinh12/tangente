// Uso: npx tsx scripts/sample.ts <slug> <genId> [n]
import path from "node:path";
import { pathToFileURL } from "node:url";
import { makeRng } from "../src/lib/math/rng";
import { unionTex } from "../src/lib/math/intervals";
const [slug, id, n = "3"] = process.argv.slice(2);
(async () => {
const mod = await import(pathToFileURL(path.join(process.cwd(), "src/content/topics", slug + ".ts")).href);
const topic = mod.default?.default ?? mod.default;
const gens = id && id !== "all" ? topic.exercises.filter((g: any) => g.id === id) : topic.exercises;
for (const g of gens) for (let s = 1; s <= Number(n); s++) {
  const ex = g.generate(makeRng(s * 104729));
  console.log(`\n[${g.id} #${s}] ${ex.statement}`);
  for (const p of ex.parts) {
    const ans = p.kind === "interval" ? unionTex(p.answer) : p.kind === "choice" ? p.options.filter((o: any) => o.correct).map((o: any) => o.label).join(" | ") : JSON.stringify(p.answer);
    console.log(`   -> ${p.kind}: ${p.prompt ?? ""} ${ans}`);
  }
  console.log("   sol: " + ex.solution.join(" / "));
}
})();
