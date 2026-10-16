import type { ModuleId, TopicMeta } from "./types";

export interface ModuleMeta {
  id: ModuleId;
  title: string;
  short: string;
  description: string;
}

export const MODULES: ModuleMeta[] = [
  {
    id: "nivelacion",
    title: "Nivelación",
    short: "Bases",
    description:
      "Todo lo que el curso da por sabido. Si hace tiempo que no ves matemática, o nunca te quedó clara, empieza aquí.",
  },
  {
    id: "funciones",
    title: "Conjuntos y funciones",
    short: "Funciones",
    description:
      "El lenguaje del curso. Conjuntos, intervalos y funciones con su dominio, rango, gráfica, composición e inversa.",
  },
  {
    id: "limites",
    title: "Límites y continuidad",
    short: "Límites",
    description:
      "Qué le pasa a una función cerca de un punto o cuando x crece sin parar. Asíntotas y continuidad.",
  },
  {
    id: "derivadas",
    title: "Derivadas y aplicaciones",
    short: "Derivadas",
    description:
      "La tasa de cambio. Reglas de derivación, recta tangente, elasticidad, extremos, concavidad y estudio completo de funciones.",
  },
];

export const TOPICS: TopicMeta[] = [
  // Nivelación
  { slug: "numeros", module: "nivelacion", title: "Los números y sus operaciones", summary: "Naturales, enteros, racionales y reales, la ley de los signos y el orden en que se resuelven las operaciones." },
  { slug: "fracciones", module: "nivelacion", title: "Fracciones y decimales", summary: "Simplificar, sumar, multiplicar y dividir fracciones, y pasar de fracción a decimal y de vuelta." },
  { slug: "potencias-raices", module: "nivelacion", title: "Potencias y raíces", summary: "Las leyes de los exponentes, exponentes negativos y fraccionarios, y cómo simplificar radicales." },
  { slug: "expresiones-algebraicas", module: "nivelacion", title: "Expresiones algebraicas", summary: "Letras que representan números, términos semejantes, valor numérico, polinomios y productos notables." },
  { slug: "factorizacion", module: "nivelacion", title: "Factorización", summary: "Factor común, diferencia de cuadrados, trinomios y Ruffini para escribir un polinomio como producto." },
  { slug: "fracciones-algebraicas", module: "nivelacion", title: "Fracciones algebraicas", summary: "Simplificar y operar cocientes de polinomios, y racionalizar expresiones con raíces." },
  { slug: "ecuaciones", module: "nivelacion", title: "Ecuaciones", summary: "Ecuaciones lineales, cuadráticas, con fracciones y con raíces, y sistemas de dos ecuaciones." },
  { slug: "inecuaciones", module: "nivelacion", title: "Desigualdades e inecuaciones", summary: "Resolver desigualdades lineales, cuadráticas, racionales y con valor absoluto, y escribir la solución como intervalo." },
  { slug: "recta", module: "nivelacion", title: "El plano cartesiano y la recta", summary: "Puntos, distancia, pendiente, ecuación de la recta, rectas paralelas y perpendiculares." },
  { slug: "exponenciales-logaritmos", module: "nivelacion", title: "Exponenciales y logaritmos", summary: "Qué es un logaritmo, sus propiedades y cómo resolver ecuaciones exponenciales y logarítmicas." },

  // Conjuntos y funciones
  { slug: "conjuntos", module: "funciones", title: "Conjuntos e intervalos", summary: "Unión, intersección, diferencia y complemento, intervalos y conjuntos definidos por una inecuación." },
  { slug: "relaciones-funciones", module: "funciones", title: "Relaciones y funciones", summary: "Producto cartesiano, relaciones, qué hace que una relación sea función, imagen y preimagen." },
  { slug: "dominio-rango", module: "funciones", title: "Dominio y rango", summary: "Encontrar dónde existe una función, qué valores toma y qué restricciones la convierten en función." },
  { slug: "clasificacion-funciones", module: "funciones", title: "Inyectiva, sobreyectiva y biyectiva", summary: "Clasificar funciones y restringirlas para que sean biyectivas sin cambiar su regla." },
  { slug: "funciones-elementales", module: "funciones", title: "Funciones de uso frecuente", summary: "Lineal, cuadrática, cúbica, valor absoluto, 1/x, raíces, exponencial y logarítmica con sus gráficas." },
  { slug: "graficas-transformaciones", module: "funciones", title: "Gráficas, transformaciones y funciones a trozos", summary: "Trasladar, reflejar y estirar gráficas, y graficar funciones definidas por partes para hallar su rango." },
  { slug: "propiedades-funciones", module: "funciones", title: "Paridad, monotonía y extremos", summary: "Funciones pares e impares, crecientes y decrecientes, acotadas, y sus máximos y mínimos." },
  { slug: "composicion", module: "funciones", title: "Operaciones y composición", summary: "Sumar, multiplicar y dividir funciones, y componerlas cuidando el dominio de la compuesta." },
  { slug: "funcion-inversa", module: "funciones", title: "Función inversa", summary: "Cuándo existe la inversa, cómo despejarla y cómo se relacionan su dominio, rango y gráfica." },
  { slug: "funciones-economia", module: "funciones", title: "Funciones en economía", summary: "Oferta, demanda, equilibrio de mercado, costo, ingreso y utilidad como funciones." },

  // Límites y continuidad
  { slug: "idea-limite", module: "limites", title: "La idea de límite", summary: "Qué significa acercarse a un punto, límites laterales, leer límites en una gráfica y la definición formal." },
  { slug: "calculo-limites", module: "limites", title: "Cálculo de límites", summary: "Propiedades, sustitución directa y las indeterminaciones 0/0 resueltas por factorización y racionalización." },
  { slug: "limites-infinito", module: "limites", title: "Límites infinitos y al infinito", summary: "Cuando la función crece sin control o x se va al infinito. Indeterminaciones ∞/∞ y ∞ − ∞." },
  { slug: "numero-e", module: "limites", title: "El número e y los límites de la forma 1 elevado a ∞", summary: "De dónde sale e, el interés compuesto continuo y cómo resolver límites de la forma 1 elevado a infinito." },
  { slug: "asintotas", module: "limites", title: "Asíntotas", summary: "Asíntotas verticales, horizontales y oblicuas, y cómo bosquejar una gráfica a partir de sus límites." },
  { slug: "continuidad", module: "limites", title: "Continuidad", summary: "Continuidad en un punto, tipos de discontinuidad, funciones a trozos con parámetros y el teorema de Bolzano." },

  // Derivadas y aplicaciones
  { slug: "derivada-definicion", module: "derivadas", title: "La derivada y su definición", summary: "La tasa de cambio, la pendiente de la tangente y cómo calcular una derivada con el límite." },
  { slug: "derivabilidad", module: "derivadas", title: "Derivabilidad", summary: "Derivadas laterales, puntos angulosos y cuspidales, y la relación entre derivabilidad y continuidad." },
  { slug: "reglas-derivacion", module: "derivadas", title: "Reglas de derivación", summary: "Potencia, producto, cociente, cadena, exponenciales y logaritmos para derivar sin usar el límite." },
  { slug: "recta-tangente", module: "derivadas", title: "Recta tangente y diferencial", summary: "Tangentes en un punto, con pendiente dada o paralelas a una recta, y aproximaciones con el diferencial." },
  { slug: "elasticidad-marginal", module: "derivadas", title: "Análisis marginal y elasticidad", summary: "Costo e ingreso marginal y la elasticidad de una función, con su lectura económica." },
  { slug: "tecnicas-derivacion", module: "derivadas", title: "Derivadas sucesivas, logarítmica e implícita", summary: "Derivar varias veces, derivar con logaritmos y derivar curvas donde y no está despejada." },
  { slug: "lhopital", module: "derivadas", title: "Regla de L'Hôpital", summary: "Resolver indeterminaciones 0/0 e ∞/∞ con derivadas, y llevar otras formas a esas dos." },
  { slug: "extremos-tvm", module: "derivadas", title: "Crecimiento, extremos y valor medio", summary: "Puntos críticos, intervalos de crecimiento, máximos y mínimos, y los teoremas de Rolle y del valor medio." },
  { slug: "concavidad", module: "derivadas", title: "Concavidad e inflexión", summary: "La segunda derivada, convexidad, puntos de inflexión y el criterio de la segunda derivada." },
  { slug: "estudio-funciones", module: "derivadas", title: "Estudio completo de una función", summary: "Juntar dominio, cortes, asíntotas, crecimiento y concavidad para dibujar cualquier gráfica." },
];

export function meta(slug: string): TopicMeta {
  const m = TOPICS.find((t) => t.slug === slug);
  if (!m) throw new Error(`Tema desconocido: ${slug}`);
  return m;
}

export function topicsOf(module: ModuleId): TopicMeta[] {
  return TOPICS.filter((t) => t.module === module);
}

export function moduleOf(id: ModuleId): ModuleMeta {
  return MODULES.find((m) => m.id === id)!;
}

export function neighbors(slug: string): { prev?: TopicMeta; next?: TopicMeta } {
  const i = TOPICS.findIndex((t) => t.slug === slug);
  return { prev: TOPICS[i - 1], next: TOPICS[i + 1] };
}
