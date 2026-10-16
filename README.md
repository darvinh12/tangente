# Tangente

Recurso libre para estudiar Matemática I desde cero, con el temario de la cátedra de Matemática I de la Escuela de Economía de la UCV. Cada tema trae una lección corta con ejemplos que se revelan paso a paso, gráficas interactivas y ejercicios que se generan con números nuevos en cada intento y se corrigen al instante.

Hecho por Darvin Hernández, estudiante de Computación de la Universidad Central de Venezuela.

## Qué incluye

- Nivelación completa: números, fracciones, potencias, álgebra, factorización, ecuaciones, inecuaciones, la recta, exponenciales y logaritmos.
- Conjuntos y funciones, límites y continuidad, derivadas y sus aplicaciones, organizados por tema y de menor a mayor dificultad.
- Corrección por equivalencia: la app acepta `2(x+1)` y `2x+2` como la misma respuesta, reconoce errores típicos y explica qué falló.
- Respuestas con editor matemático y teclado virtual, intervalos con recta numérica, conjuntos, puntos en el plano y opción múltiple.
- Simulacros de parcial cronometrados con nota sobre 20.
- El progreso se guarda en el navegador, sin cuentas.

## Desarrollo

```bash
npm install
npm run dev          # genera el índice de temas y abre http://localhost:3000
npm run validate     # valida todos los temas: LaTeX, respuestas y generadores
npm run test:math    # pruebas del parser y del comparador de respuestas
npm run build
```

El contenido vive en `src/content/topics/`, un archivo por tema. La guía para escribir o corregir un tema está en `docs/guia-contenido.md`.

## Stack

Next.js, React, Tailwind CSS, KaTeX para mostrar fórmulas, MathLive para escribirlas y Mafs para las gráficas. El parser y el comparador de expresiones están hechos a la medida en `src/lib/math/`.
