// Simulacros. Cada pregunta sale de un generador marcado con `exam: true`
// en uno de los temas listados, así que cada intento es un examen distinto.

export interface ExamSpec {
  id: string;
  title: string;
  description: string;
  minutes: number;
  /** Temas de donde salen las preguntas, en el orden del examen. */
  topics: string[];
  /** Cantidad de preguntas. Si hay menos temas, se repiten. */
  questions: number;
}

export const EXAMS: ExamSpec[] = [
  {
    id: "prueba-corta",
    title: "Prueba corta: conjuntos y funciones",
    description: "Conjuntos definidos por inecuaciones, qué hace que una relación sea función, dominio e imagen.",
    minutes: 45,
    topics: ["conjuntos", "relaciones-funciones", "dominio-rango", "clasificacion-funciones"],
    questions: 4,
  },
  {
    id: "primer-parcial",
    title: "Primer parcial",
    description: "Conjuntos, funciones y su dominio, clasificación, gráficas a trozos, composición e inversa.",
    minutes: 120,
    topics: ["conjuntos", "dominio-rango", "clasificacion-funciones", "graficas-transformaciones", "composicion", "funcion-inversa"],
    questions: 6,
  },
  {
    id: "segundo-parcial",
    title: "Segundo parcial",
    description: "Límites, asíntotas, continuidad, derivada por definición, derivabilidad, reglas de derivación y recta tangente.",
    minutes: 120,
    topics: ["calculo-limites", "limites-infinito", "numero-e", "asintotas", "continuidad", "derivada-definicion", "derivabilidad", "reglas-derivacion", "recta-tangente"],
    questions: 8,
  },
  {
    id: "tercer-parcial",
    title: "Tercer parcial",
    description: "Derivación implícita y logarítmica, L'Hôpital, extremos, concavidad, estudio de funciones y elasticidad.",
    minutes: 120,
    topics: ["tecnicas-derivacion", "lhopital", "extremos-tvm", "concavidad", "estudio-funciones", "elasticidad-marginal"],
    questions: 6,
  },
  {
    id: "final",
    title: "Examen integral",
    description: "Un recorrido por todo el programa, de conjuntos a estudio de funciones.",
    minutes: 150,
    topics: ["conjuntos", "dominio-rango", "funcion-inversa", "calculo-limites", "asintotas", "continuidad", "reglas-derivacion", "recta-tangente", "extremos-tvm", "concavidad"],
    questions: 10,
  },
];
