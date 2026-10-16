# Guía para escribir temas

Cada tema vive en un solo archivo, `src/content/topics/<slug>.ts`, y exporta por defecto un objeto `Topic` (ver `src/content/types.ts`). El tema `conjuntos.ts` es el modelo de referencia: imita su estructura, su tono y su nivel de detalle.

## Público

Personas que no saben matemática o que la olvidaron, estudiantes de la Escuela de Economía de la UCV que cursan Matemática I. El texto tiene que poder leerse sin profesor al lado. Cada tema empieza por la intuición, sigue con la definición, muestra ejemplos resueltos paso a paso y termina en ejercicios del nivel de los parciales.

## Estructura de un tema

- `...meta("<slug>")` toma título, módulo y resumen del catálogo. No los repitas.
- `objectives`: 3 a 5 objetivos concretos.
- `sections`: 4 a 7 secciones. Cada una con texto breve, una definición si aplica, al menos un ejemplo resuelto (`example`) y, cuando haya un error típico, una nota `warning`. Cierra la mayoría de las secciones con un `quick` (ejercicio corto embebido).
- Notas `econ` cuando el concepto tenga una lectura económica natural: costo, ingreso, demanda, oferta, utilidad, interés, elasticidad.
- Al menos una gráfica o un widget por tema cuando lo visual ayude. Los widgets disponibles están en `types.ts`: `sliders`, `venn`, `mapping`, `numberline`, `limit`, `secant`, `tangent`, `machine`.
- `exercises`: de 8 a 14 generadores. Más o menos 40 % nivel 1, 35 % nivel 2 y 25 % nivel 3. El nivel 3 imita preguntas de parcial y lleva `exam: true`. En los temas del programa (no los de nivelación) al menos tres generadores llevan `exam: true`.

## Formato de texto (Rich)

- `$...$` en línea y `$$...$$` en bloque. Todo LaTeX debe compilar en KaTeX.
- `**negrita**`, `_cursiva_`, línea en blanco para separar párrafos, `- ` al inicio de línea para listas.
- Decimales con coma: `2{,}5`.
- Dentro de strings de TypeScript las barras van dobles: `"\\frac{1}{2}"`.

## Reglas de redacción

- Español de Venezuela, tuteo, registro claro y cercano. Frases directas, sin relleno.
- Prohibido el guion largo (—). El validador lo marca como error.
- Solo comillas normales " ". Nada de comillas angulares.
- Punto y coma casi nulo. Dos puntos solo cuando de verdad introducen algo.
- Nada de muletillas de IA: "es importante destacar", "cabe destacar", "en conclusión", "robusto", "potente", "clave", "fundamental" repetido.
- No abras con fórmula de diccionario ("X se define como"). Entra por la idea.
- Títulos con mayúscula solo al inicio. Sin emojis.
- No inventes datos. Los ejemplos económicos pueden usar números inventados, pero presentados como ejemplo.

## Ejercicios

Cada generador recibe un `Rng` (`r.int`, `r.nz`, `r.pick`, `r.bool`, `r.shuffle`, `r.sample`, `r.sign`) y devuelve un `Exercise`:

- `statement`, `parts`, `hints` (1 a 3, de menos a más), `solution` (pasos que muestran el trabajo, no solo el resultado).
- Elige los números al revés: primero el resultado limpio y después el enunciado que lo produce. Evita resultados con decimales feos.
- Varía de verdad. El validador avisa si un generador produce menos de 3 variantes.

### Tipos de respuesta

| Tipo | Cuándo | Notas |
|---|---|---|
| `expr` | Números y expresiones | Se corrige por equivalencia numérica. Declara en `vars` todas las variables. Usa `domain` si la expresión solo existe en un rango (por ejemplo `[0.5, 4]` con `\ln x` o `\sqrt{x}`). |
| `interval` | Dominios, rangos, soluciones de inecuaciones | Unión de intervalos. Usa `iv`, `union`, `intersect`, `difference`, `complement`, `signSolve` de `@/lib/math/intervals`. |
| `set` | Conjuntos finitos | Números o letras. |
| `choice` | Conceptos, V/F, elegir una gráfica | Usa `trueFalse` y `choice` de `../helpers`. Cada distractor lleva retroalimentación que explique el error. Las opciones pueden llevar `graph`. |
| `point` | Ubicar un punto en el plano | Respuesta sobre la cuadrícula de `snap`. |

`sequential: true` muestra las partes una por una. Úsalo en problemas largos tipo parcial.

### Respuestas `expr`

- El parser (`src/lib/math/parse.ts`) entiende: números, variables de una letra (con subíndice `x_1`), `+ - \cdot \times /`, multiplicación implícita, `^{}`, `\frac{}{}`, `\sqrt{}`, `\sqrt[n]{}`, `\ln`, `\log`, `\log_{b}`, `e`, `\pi`, `\infty`, `|x|` y `\left| \right|`, `\exp`, paréntesis. No entiende `\begin{cases}`, `\lim`, igualdades ni desigualdades.
- Si `e` es una variable del ejercicio (por ejemplo parámetros d, e, f), inclúyela en `vars` y deja de valer 2.718.
- Exige la forma pedida cuando la expresión sin simplificar también pasaría por equivalente. Usa `maxOps` (cantidad máxima de operaciones) o `validate(ast, latex)`, que devuelve un mensaje si la forma no sirve. Ejemplo: en "calcula $\frac{1}{2} + \frac{1}{4}$" pon `maxOps: 1` para que no acepte la misma suma copiada, y si además pides fracción irreducible, revisa con `validate` que numerador y denominador no tengan factores comunes.
- Para factorizar, pide los números de cada factor en casillas separadas con `before` y `after`, por ejemplo `before: "(x - "`, `after: ")"`, o valida que el AST sea un producto.
- `mistakes`: respuestas erróneas típicas con su explicación. Se comparan por equivalencia, así que no pueden ser equivalentes a la correcta (el validador lo revisa).
- Límites: usa `special: ["inf", "-inf", "dne"]` en todos los ejercicios de límites, aunque la respuesta sea un número, para no regalar la pista. `"dne"` como respuesta significa "no existe".
- `before` y `after` son LaTeX que rodea la casilla: `before: "f'(x) ="`.

## Gráficas

`GraphSpec` usa funciones en LaTeX con variable `x`. Una función a trozos se dibuja como varias `curves`, cada una con su `domain`, y `points` con `open: true` para los extremos excluidos. Usa `breaks` para que la curva no una los dos lados de una asíntota vertical, y `vlines` o `hlines` con `dashed: true` para dibujar asíntotas.

## Verificación obligatoria

1. `npx tsx scripts/validate-content.ts <slug>` debe terminar con 0 errores.
2. `npx tsx scripts/sample.ts <slug> all 2` imprime ejemplos generados. Revisa a mano que la matemática esté bien. Cuando haya derivadas, límites o raíces, compruébalo numéricamente con un script temporal en `scripts/tmp-<slug>.ts` (bórralo al final).
3. `npx tsc --noEmit` sin errores en tu archivo.
