import type { ModuleId, Rich } from "./types";

/** Una fórmula o regla del formulario. */
export interface FormulaItem {
  /** Nombre corto: "Regla del producto". */
  name: string;
  /** La fórmula en LaTeX, sin $...$. */
  tex: string;
  /** Aclaración breve opcional (cuándo se usa, condición). */
  note?: Rich;
}

export interface FormulaGroup {
  id: string;
  title: string;
  module: ModuleId;
  /** Tema donde se explica, para enlazar. */
  topic: string;
  items: FormulaItem[];
}

export interface GlossaryEntry {
  term: string;
  /** Definición en una o dos oraciones, con $...$ si hace falta. */
  def: Rich;
  /** Tema donde se explica. */
  topic: string;
}
