import type { Ast } from "@/lib/math/parse";
import type { Interval } from "@/lib/math/check";
import type { Rng } from "@/lib/math/rng";

/*
  TEXTO ENRIQUECIDO ("Rich")
  Cadena con:
    $...$        matemática en línea (LaTeX)
    $$...$$      matemática en bloque
    **negrita**  y  _cursiva_
    líneas que empiezan con "- " forman una lista
    una línea en blanco separa párrafos
*/
export type Rich = string;

/* ------------------------------ Gráficas ------------------------------ */

export type Tone = "accent" | "blue" | "red" | "green" | "orange" | "ink" | "muted";

export interface Curve {
  /** Expresión LaTeX en x, por ejemplo "\\frac{1}{x-2}" o "x^2-1". */
  fn: string;
  /** Tramo donde se dibuja. Por defecto, todo el ancho visible. */
  domain?: [number, number];
  /** Puntos donde la curva se corta (asíntotas verticales, saltos). */
  breaks?: number[];
  color?: Tone;
  dashed?: boolean;
  label?: string;
}

export interface GraphPoint {
  x: number;
  y: number;
  /** Punto hueco (valor excluido). */
  open?: boolean;
  label?: string;
  color?: Tone;
}

export interface GraphSpec {
  x: [number, number];
  y: [number, number];
  /** Alto en px. Por defecto 320. */
  height?: number;
  curves?: Curve[];
  points?: GraphPoint[];
  /** Rectas verticales x = a (asíntotas). */
  vlines?: { x: number; label?: string; color?: Tone; dashed?: boolean }[];
  /** Rectas horizontales y = b. */
  hlines?: { y: number; label?: string; color?: Tone; dashed?: boolean }[];
  /** Segmentos entre dos puntos. */
  segments?: { from: [number, number]; to: [number, number]; color?: Tone; dashed?: boolean }[];
  /** Textos sueltos. */
  labels?: { x: number; y: number; text: string; color?: Tone }[];
  /** Paso de la cuadrícula. Por defecto 1. */
  step?: number;
}

/* ------------------------------ Widgets ------------------------------ */

export type Widget =
  /** Gráfica con deslizadores para parámetros. fn usa los nombres de parámetro como variables. */
  | {
      kind: "sliders";
      fn: string;
      params: { name: string; min: number; max: number; step: number; value: number; label?: string }[];
      x: [number, number];
      y: [number, number];
      /** LaTeX con {nombre} donde va cada valor, por ejemplo "f(x) = {a}x + {b}". */
      formula?: string;
      /** Curvas fijas de referencia (sin parámetros). */
      reference?: Curve[];
    }
  /** Diagrama de Venn interactivo con dos conjuntos. */
  | { kind: "venn"; a?: string[]; b?: string[]; universe?: string[] }
  /** Diagrama sagital. Si editable, el estudiante dibuja flechas y la app clasifica la relación. */
  | { kind: "mapping"; domain: string[]; codomain: string[]; arrows: [number, number][]; editable?: boolean }
  /** Recta numérica que dibuja una unión de intervalos. */
  | { kind: "numberline"; set: Interval[]; range?: [number, number]; label?: string }
  /** Acercarse a x = a por izquierda y derecha, con tabla de valores. */
  | { kind: "limit"; fn: string; a: number; x: [number, number]; y: [number, number]; breaks?: number[] }
  /** Recta secante que se convierte en tangente cuando h tiende a 0. */
  | { kind: "secant"; fn: string; a: number; x: [number, number]; y: [number, number] }
  /** Punto móvil sobre la curva con su recta tangente y el signo de la pendiente. */
  | {
      kind: "tangent";
      fn: string;
      x: [number, number];
      y: [number, number];
      /** Muestra si la función crece o decrece y su concavidad. */
      showAnalysis?: boolean;
      /** Derivada en LaTeX para mostrarla abajo (opcional). */
      derivative?: string;
    }
  /** Máquina de funciones: entra x, pasa por cada función en orden. */
  | { kind: "machine"; fns: { name: string; tex: string }[]; input?: number; min?: number; max?: number };

/* ------------------------------ Lecciones ------------------------------ */

export type Block =
  | { type: "text"; md: Rich }
  | { type: "heading"; text: string }
  | { type: "definition"; title: string; md: Rich }
  | { type: "note"; tone: "tip" | "warning" | "econ" | "idea"; title?: string; md: Rich }
  | { type: "example"; title: string; problem: Rich; steps: Rich[]; answer?: Rich }
  | { type: "graph"; spec: GraphSpec; caption?: Rich }
  | { type: "widget"; widget: Widget; caption?: Rich }
  | { type: "table"; headers: Rich[]; rows: Rich[][]; caption?: Rich }
  | { type: "quick"; exercise: Exercise };

export interface Section {
  id: string;
  title: string;
  blocks: Block[];
}

/* ------------------------------ Ejercicios ------------------------------ */

export interface Mistake {
  /** Respuesta equivocada típica en LaTeX (se compara por equivalencia). */
  answer: string;
  feedback: Rich;
}

export type Part =
  | {
      kind: "choice";
      prompt?: Rich;
      options: { label: Rich; correct?: boolean; feedback?: Rich; graph?: GraphSpec }[];
      /** Por defecto se barajan. Poner false para V/F u opciones ordenadas. */
      shuffle?: boolean;
      /** Varias opciones correctas: el estudiante marca todas las que apliquen. */
      multiple?: boolean;
    }
  | {
      kind: "expr";
      prompt?: Rich;
      /** Respuesta en LaTeX. */
      answer: string;
      /** Otras respuestas aceptadas (por ejemplo, "\\infty" y "+\\infty"). */
      accept?: string[];
      /** Variables permitidas en la respuesta. */
      vars?: string[];
      /** Rango para los puntos de prueba. */
      domain?: [number, number];
      tol?: number;
      /** LaTeX que se muestra antes y después de la casilla. */
      before?: string;
      after?: string;
      /** Botones rápidos para respuestas especiales. */
      special?: ("inf" | "-inf" | "dne")[];
      mistakes?: Mistake[];
      /** Máximo de operaciones permitidas (para exigir resultado simplificado). */
      maxOps?: number;
      /** Validación propia. Devuelve un mensaje si la forma no es aceptable. */
      validate?: (ast: Ast, latex: string) => string | null;
    }
  | {
      kind: "interval";
      prompt?: Rich;
      /** Unión de intervalos. Lista vacía = conjunto vacío. */
      answer: Interval[];
      before?: string;
      mistakes?: { answer: Interval[]; feedback: Rich }[];
    }
  | {
      kind: "set";
      prompt?: Rich;
      /** Elementos del conjunto finito (números o letras). */
      answer: (string | number)[];
      before?: string;
      mistakes?: { answer: (string | number)[]; feedback: Rich }[];
    }
  | {
      kind: "point";
      prompt?: Rich;
      graph: GraphSpec;
      answer: [number, number];
      /** Paso del imán al mover el punto. Por defecto 1. */
      snap?: number;
      start?: [number, number];
    };

export interface Exercise {
  statement: Rich;
  graph?: GraphSpec;
  parts: Part[];
  /** Si es true, cada parte aparece cuando la anterior está bien (modo paso a paso). */
  sequential?: boolean;
  hints?: Rich[];
  /** Resolución paso a paso. */
  solution: Rich[];
}

export interface ExerciseGen {
  /** Identificador único dentro del tema. */
  id: string;
  title: string;
  level: 1 | 2 | 3;
  generate: (r: Rng) => Exercise;
  /** Sirve para simulacros de examen. */
  exam?: boolean;
}

export type ModuleId = "nivelacion" | "funciones" | "limites" | "derivadas";

export interface TopicMeta {
  slug: string;
  title: string;
  module: ModuleId;
  /** Una oración que dice qué se aprende. */
  summary: string;
}

export interface Topic extends TopicMeta {
  objectives: string[];
  sections: Section[];
  exercises: ExerciseGen[];
}
