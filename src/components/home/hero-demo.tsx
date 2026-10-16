"use client";

import { TangentWidget } from "@/components/widgets/explorers";
import { ExercisePlayer } from "@/components/exercise/player";
import type { Exercise } from "@/content/types";

export function HeroGraph() {
  return <TangentWidget fn="\frac{x^3}{6} - x + 1" x={[-4, 4]} y={[-2.5, 4.5]} showAnalysis />;
}

const demo: Exercise = {
  statement: "Si $f(x) = x^2 + 3x$, ¿cuánto vale $f(2)$?",
  parts: [
    {
      kind: "expr",
      answer: "10",
      before: "f(2) =",
      mistakes: [
        { answer: "7", feedback: "Parece que hiciste $2 + 2 + 3$. Ojo: $x^2$ con $x = 2$ es $2 \\cdot 2 = 4$, y $3x$ es $3 \\cdot 2 = 6$." },
        { answer: "8", feedback: "Revisa el primer término. $2^2$ es $4$, no $2$." },
      ],
    },
  ],
  hints: ["Cambia cada $x$ por $2$: $f(2) = 2^2 + 3 \\cdot 2$."],
  solution: ["Sustituimos $x = 2$: $f(2) = 2^2 + 3 \\cdot 2$.", "$2^2 = 4$ y $3 \\cdot 2 = 6$.", "$f(2) = 4 + 6 = 10$."],
};

export function DemoExercise() {
  return <ExercisePlayer exercise={demo} />;
}
