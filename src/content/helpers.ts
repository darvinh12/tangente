import type { Part, Rich } from "./types";

/** Pregunta de verdadero o falso. `why` explica la respuesta correcta. */
export function trueFalse(isTrue: boolean, why: Rich, prompt?: Rich): Part {
  return {
    kind: "choice",
    prompt,
    shuffle: false,
    options: [
      { label: "Verdadero", correct: isTrue, feedback: isTrue ? undefined : why },
      { label: "Falso", correct: !isTrue, feedback: isTrue ? why : undefined },
    ],
  };
}

/**
 * Opción múltiple de una sola respuesta. Cada distractor puede llevar su
 * retroalimentación: ["texto de la opción", "por qué está mal"].
 */
export function choice(correct: Rich, wrong: (Rich | [Rich, Rich])[], prompt?: Rich): Part {
  return {
    kind: "choice",
    prompt,
    options: [
      { label: correct, correct: true },
      ...wrong.map((w) => (Array.isArray(w) ? { label: w[0], feedback: w[1] } : { label: w })),
    ],
  };
}

/** Elimina duplicados de una lista de distractores, y los que coinciden con la correcta. */
export function uniqueWrong<T extends Rich | [Rich, Rich]>(correct: Rich, wrong: T[]): T[] {
  const seen = new Set<string>([correct]);
  const out: T[] = [];
  for (const w of wrong) {
    const label = Array.isArray(w) ? w[0] : (w as string);
    if (seen.has(label)) continue;
    seen.add(label);
    out.push(w);
  }
  return out;
}
