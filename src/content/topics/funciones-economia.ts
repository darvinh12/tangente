import { meta } from "../catalog";
import { choice } from "../helpers";
import type { ExerciseGen, Part, Rich, Topic } from "../types";
import { iv, unionTex, type Interval } from "@/lib/math/intervals";
import { frac, poly } from "@/lib/math/tex";

/* ----------------------------- utilidades locales ----------------------------- */

const ivTex = (I: Interval[]) => unionTex(I);
const plusK = (k: number) => (k === 0 ? "" : k > 0 ? ` + ${k}` : ` - ${-k}`);
/** Número con separador de miles al estilo venezolano: 12500 -> 12.500 */
const miles = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const P = (cs: number[]) => poly(cs, "q");

const PRODUCTOS = ["camisas", "tortas", "bolsos", "pares de zapatos", "mesas", "cuadernos", "lámparas"];

/* ----------------------------------- ejercicios ----------------------------------- */

const evaluarDemanda: ExerciseGen = {
  id: "evaluar-demanda",
  title: "Leer una función de demanda",
  level: 1,
  generate: (r) => {
    const b = r.pick([2, 3, 4, 5]);
    const Pmax = r.int(20, 60);
    const a = b * Pmax;
    const prod = r.pick(PRODUCTOS);
    const askQ = r.bool(0.6);
    const p0 = r.int(5, Pmax - 5);
    const q0 = a - b * p0;
    const dTex = `q = ${a} - ${b}p`;
    const parts: Part[] = askQ
      ? [{ kind: "expr", before: "q =", answer: String(q0), mistakes: [{ answer: String(a + b * p0), feedback: "La demanda baja cuando el precio sube. Revisa el signo: se resta $" + b + "p$." }] }]
      : [{ kind: "expr", before: "p =", answer: String(Pmax), mistakes: [{ answer: String(a), feedback: "Ese es el corte con el eje de cantidades: lo que se demandaría si fuera gratis. Te piden el precio que hace $q = 0$." }] }];
    return {
      statement: askQ
        ? `La demanda semanal de ${prod} en una tienda es $${dTex}$, donde $p$ es el precio. ¿Cuántas unidades se demandan si el precio es $${p0}$?`
        : `La demanda semanal de ${prod} en una tienda es $${dTex}$. ¿A partir de qué precio ya nadie compra?`,
      parts,
      hints: askQ ? ["Sustituye el precio en la fórmula."] : ["Nadie compra significa $q = 0$. Plantea $0 = " + a + " - " + b + "p$ y despeja."],
      solution: askQ
        ? [`$q = ${a} - ${b} \\cdot ${p0} = ${a} - ${b * p0} = ${q0}$ unidades.`]
        : [`$0 = ${a} - ${b}p$, así que $${b}p = ${a}$ y $p = ${Pmax}$.`, `Con un precio de $${Pmax}$ o más, la cantidad demandada es cero.`],
    };
  },
};

const costoTotal: ExerciseGen = {
  id: "costo-total",
  title: "Costo fijo, variable y total",
  level: 1,
  generate: (r) => {
    const CF = r.pick([500, 800, 1200, 1500, 2000, 3000]);
    const cv = r.int(4, 25);
    const prod = r.pick(PRODUCTOS);
    const askFormula = r.bool();
    const q0 = r.pick([10, 20, 25, 40, 50, 100]);
    const intro = `Un taller que fabrica ${prod} paga ${miles(CF)} bolívares al mes de alquiler y servicios, sin importar cuánto produzca. Cada unidad le cuesta ${cv} bolívares en materiales y mano de obra.`;
    return {
      statement: askFormula ? `${intro} Escribe el costo total mensual $C(q)$ de producir $q$ unidades.` : `${intro} ¿Cuánto cuesta producir ${q0} unidades en un mes?`,
      parts: askFormula
        ? [{
            kind: "expr", before: "C(q) =", answer: P([cv, CF]), vars: ["q"],
            mistakes: [
              { answer: P([CF, cv]), feedback: "Cambiaste los papeles. El costo fijo no se multiplica por $q$, y el costo por unidad sí." },
              { answer: P([cv, 0]), feedback: "Ese es solo el costo variable. Falta sumar el costo fijo." },
            ],
          }]
        : [{ kind: "expr", before: `C(${q0}) =`, answer: String(CF + cv * q0), mistakes: [{ answer: String(cv * q0), feedback: "Ese es solo el costo variable. El alquiler se paga igual." }] }],
      hints: ["Costo total = costo fijo + costo variable. El variable es el costo por unidad por la cantidad."],
      solution: askFormula
        ? [`Costo fijo: $${CF}$. Costo variable: $${cv}q$.`, `$C(q) = ${P([cv, CF])}$.`]
        : [`$C(q) = ${P([cv, CF])}$.`, `$C(${q0}) = ${CF} + ${cv} \\cdot ${q0} = ${CF + cv * q0}$ bolívares.`],
    };
  },
};

const costoPromedio: ExerciseGen = {
  id: "costo-promedio",
  title: "Costo promedio",
  level: 1,
  generate: (r) => {
    const q0 = r.pick([10, 20, 25, 40, 50, 100]);
    const CF = q0 * r.int(5, 40);
    const cv = r.int(3, 30);
    const C0 = CF + cv * q0;
    const avg = C0 / q0;
    return {
      statement: `El costo total de una fábrica es $C(q) = ${P([cv, CF])}$. Calcula el costo promedio por unidad cuando se producen $${q0}$ unidades.`,
      parts: [{
        kind: "expr", before: `\\overline{C}(${q0}) =`, answer: String(avg),
        mistakes: [
          { answer: String(C0), feedback: "Ese es el costo total. El promedio es el costo total dividido entre las unidades." },
          { answer: String(cv), feedback: "Ese es el costo variable por unidad. El promedio también reparte el costo fijo." },
        ],
      }],
      hints: ["$\\overline{C}(q) = \\dfrac{C(q)}{q}$."],
      solution: [
        `$C(${q0}) = ${CF} + ${cv} \\cdot ${q0} = ${C0}$.`,
        `$\\overline{C}(${q0}) = \\dfrac{${C0}}{${q0}} = ${avg}$ por unidad.`,
        `Fíjate que es mayor que ${cv}, porque cada unidad carga además con su parte del costo fijo: $\\frac{${CF}}{${q0}} = ${CF / q0}$.`,
      ],
    };
  },
};

const utilidadPrecioFijo: ExerciseGen = {
  id: "utilidad-precio-fijo",
  title: "Ingreso y utilidad con precio fijo",
  level: 1,
  generate: (r) => {
    const cv = r.int(5, 20);
    const p = cv + r.int(3, 15);
    const CF = r.pick([300, 600, 900, 1200]);
    const q0 = r.pick([20, 50, 80, 100, 150]);
    const I = p * q0;
    const C = CF + cv * q0;
    const U = I - C;
    return {
      statement: `Un emprendedor vende cada unidad a $${p}$ bolívares. Su costo es $C(q) = ${P([cv, CF])}$. Calcula su utilidad si vende $${q0}$ unidades.`,
      parts: [{
        kind: "expr", before: `U(${q0}) =`, answer: String(U),
        mistakes: [
          { answer: String(I), feedback: "Ese es el ingreso. A la utilidad hay que restarle el costo." },
          { answer: String(I - cv * q0), feedback: "Restaste solo el costo variable. El costo fijo también se paga." },
        ],
      }],
      hints: ["Ingreso: $I(q) = p \\cdot q$.", "Utilidad: $U(q) = I(q) - C(q)$."],
      solution: [
        `$I(${q0}) = ${p} \\cdot ${q0} = ${I}$.`,
        `$C(${q0}) = ${CF} + ${cv} \\cdot ${q0} = ${C}$.`,
        `$U(${q0}) = ${I} - ${C} = ${U}$ bolívares.${U < 0 ? " Es negativa: con esa cantidad hay pérdida." : ""}`,
      ],
    };
  },
};

const identificarDemanda: ExerciseGen = {
  id: "identificar-demanda",
  title: "¿Demanda u oferta?",
  level: 1,
  generate: (r) => {
    const askDemand = r.bool();
    const mk = (s: number) => {
      const a = r.int(20, 90);
      const b = r.int(2, 6);
      return s < 0 ? `$q = ${a} - ${b}p$` : `$q = ${b}p${plusK(r.int(-15, 10))}$`;
    };
    const good = mk(askDemand ? -1 : 1);
    const bad = new Set<string>();
    while (bad.size < 3) bad.add(mk(askDemand ? 1 : -1));
    const fb: Rich = askDemand
      ? "Aquí la cantidad aumenta cuando sube el precio. Ese es el comportamiento de la oferta."
      : "Aquí la cantidad baja cuando sube el precio. Ese es el comportamiento de la demanda.";
    return {
      statement: `¿Cuál de estas funciones puede representar la ${askDemand ? "demanda" : "oferta"} de un bien, con $q$ la cantidad y $p$ el precio?`,
      parts: [choice(good, [...bad].map((b) => [b, fb] as [Rich, Rich]))],
      hints: ["La ley de la demanda dice que a mayor precio se compra menos. La oferta va al revés: a mayor precio se quiere vender más."],
      solution: [
        askDemand ? "La demanda tiene que ser decreciente en $p$, así que el coeficiente de $p$ es negativo." : "La oferta tiene que ser creciente en $p$, así que el coeficiente de $p$ es positivo.",
        `La única que cumple es ${good}.`,
      ],
    };
  },
};

const equilibrioMercado: ExerciseGen = {
  id: "equilibrio-mercado",
  title: "Equilibrio de mercado",
  level: 2,
  generate: (r) => {
    const pe = r.int(5, 30);
    const qe = r.int(20, 120);
    const b = r.int(1, 5);
    const d = r.int(1, 5);
    const a = qe + b * pe;
    const c = qe - d * pe;
    const prod = r.pick(PRODUCTOS);
    return {
      statement: `En el mercado de ${prod}, la demanda es $q_d = ${a} - ${b === 1 ? "" : b}p$ y la oferta es $q_s = ${d === 1 ? "" : d}p${plusK(c)}$. Halla el equilibrio.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Precio de equilibrio", before: "p_e =", answer: String(pe) },
        { kind: "expr", prompt: "Cantidad de equilibrio", before: "q_e =", answer: String(qe), mistakes: [{ answer: String(pe), feedback: "Ese es el precio. La cantidad se obtiene sustituyendo el precio en la demanda o en la oferta." }] },
      ],
      hints: ["En el equilibrio la cantidad que se quiere comprar es igual a la que se quiere vender: $q_d = q_s$.", "Después sustituye el precio en cualquiera de las dos funciones. Las dos tienen que dar lo mismo."],
      solution: [
        `Igualamos: $${a} - ${b === 1 ? "" : b}p = ${d === 1 ? "" : d}p${plusK(c)}$.`,
        `Pasamos términos: $${a}${plusK(-c)} = ${b + d}p$, o sea $${a - c} = ${b + d}p$ y $p_e = ${pe}$.`,
        `Demanda: $q_d = ${a} - ${b} \\cdot ${pe} = ${qe}$. Oferta: $q_s = ${d} \\cdot ${pe}${plusK(c)} = ${qe}$. Coinciden.`,
        `Equilibrio: precio $${pe}$ y cantidad $${qe}$.`,
      ],
    };
  },
};

const puntoEquilibrio: ExerciseGen = {
  id: "punto-equilibrio",
  title: "Punto de equilibrio (sin pérdida ni ganancia)",
  level: 2,
  generate: (r) => {
    const cv = r.int(5, 40);
    const m = r.int(2, 20);
    const p = cv + m;
    const qe = r.pick([50, 80, 100, 120, 150, 200, 250]);
    const CF = m * qe;
    const q1 = qe + r.pick([-30, -20, 20, 50, 100]);
    const U1 = m * q1 - CF;
    return {
      statement: `Una empresa vende a $${p}$ bolívares la unidad. Tiene costos fijos de $${miles(CF)}$ y un costo variable de $${cv}$ por unidad.`,
      sequential: true,
      parts: [
        {
          kind: "expr", prompt: "¿Cuántas unidades debe vender para no ganar ni perder?", before: "q =", answer: String(qe),
          mistakes: [{ answer: frac(CF, p), feedback: "Dividiste el costo fijo entre el precio. Cada unidad aporta solo $p - c_v$ para cubrir el costo fijo, porque el resto se va en su propio costo variable." }],
        },
        {
          kind: "expr", prompt: `¿Cuál es la utilidad si vende $${q1}$ unidades?`, before: `U(${q1}) =`, answer: String(U1),
        },
      ],
      hints: [
        "Punto de equilibrio: ingreso igual a costo, $I(q) = C(q)$.",
        `$${p}q = ${CF} + ${cv}q$. Agrupa los términos con $q$.`,
      ],
      solution: [
        `$I(q) = ${p}q$ y $C(q) = ${CF} + ${cv}q$.`,
        `$${p}q = ${CF} + ${cv}q$ da $${m}q = ${CF}$, así que $q = ${qe}$ unidades.`,
        `$U(q) = I(q) - C(q) = ${m}q - ${CF}$. Con $q = ${q1}$: $U = ${m * q1} - ${CF} = ${U1}$.`,
        U1 > 0 ? "Es positiva porque se vende por encima del punto de equilibrio." : "Es negativa porque se vende por debajo del punto de equilibrio.",
      ],
    };
  },
};

const utilidadFormula: ExerciseGen = {
  id: "utilidad-formula",
  title: "Construir la función de utilidad",
  level: 2,
  generate: (r) => {
    const b = r.pick([1, 2, 3]);
    const a = r.int(30, 90);
    const c = r.int(5, Math.min(25, a - 10));
    const F = r.pick([50, 100, 150, 200, 300]);
    const U = P([-b, a - c, -F]);
    return {
      statement: `El precio al que se vende cada unidad depende de la cantidad según $p = ${a} - ${b === 1 ? "" : b}q$, y el costo total es $C(q) = ${P([c, F])}$. Escribe la utilidad $U(q)$ como un polinomio.`,
      parts: [{
        kind: "expr", before: "U(q) =", answer: U, vars: ["q"],
        mistakes: [
          { answer: P([-b, a + c, -F]), feedback: "Al restar $C(q)$ el signo menos afecta a todos sus términos, también al costo variable." },
          { answer: P([-b, a - c, F]), feedback: "Al restar $C(q)$ el costo fijo queda con signo negativo." },
          { answer: P([-b, a, 0]), feedback: "Ese es el ingreso $I(q)$. Falta restar el costo." },
        ],
      }],
      hints: ["Ingreso: $I(q) = p \\cdot q$, con el precio de la demanda.", "Utilidad: $U(q) = I(q) - C(q)$. Usa paréntesis al restar."],
      solution: [
        `$I(q) = (${a} - ${b === 1 ? "" : b}q)\\,q = ${P([-b, a, 0])}$.`,
        `$U(q) = ${P([-b, a, 0])} - (${P([c, F])})$.`,
        `$U(q) = ${U}$.`,
      ],
    };
  },
};

const dominioEconomico: ExerciseGen = {
  id: "dominio-economico",
  title: "Dominio con sentido económico",
  level: 2,
  generate: (r) => {
    const b = r.pick([2, 3, 4, 5]);
    if (r.bool()) {
      const Pmax = r.int(10, 50);
      const a = b * Pmax;
      return {
        statement: `La demanda de un bien es $q = ${a} - ${b}p$. Si el precio y la cantidad no pueden ser negativos, ¿qué precios tienen sentido?`,
        parts: [{ kind: "interval", before: "p \\in", answer: [iv(0, Pmax, true, true)], mistakes: [{ answer: [iv(0, Infinity, true)], feedback: `Con precios mayores que $${Pmax}$ la cantidad saldría negativa.` }] }],
        hints: ["Pide dos cosas a la vez: $p \\ge 0$ y $q \\ge 0$."],
        solution: [`$q \\ge 0$ significa $${a} - ${b}p \\ge 0$, o sea $p \\le ${Pmax}$.`, `Junto con $p \\ge 0$ queda $p \\in [0, ${Pmax}]$.`],
      };
    }
    const p0 = r.int(2, 15);
    const c = b * p0;
    return {
      statement: `La oferta de un bien es $q = ${b}p - ${c}$. Si la cantidad ofrecida no puede ser negativa, ¿para qué precios está definida?`,
      parts: [{ kind: "interval", before: "p \\in", answer: [iv(p0, Infinity, true)], mistakes: [{ answer: [iv(0, Infinity, true)], feedback: `Con precios entre 0 y $${p0}$ la oferta saldría negativa. Por debajo de $${p0}$ nadie quiere vender.` }] }],
      hints: ["Pide $q \\ge 0$ y despeja $p$."],
      solution: [`$${b}p - ${c} \\ge 0$ da $p \\ge ${p0}$.`, `Por debajo de ese precio los productores no ofrecen nada. Dominio $[${p0}, +\\infty)$.`],
    };
  },
};

const ingresoMaximo: ExerciseGen = {
  id: "ingreso-maximo",
  title: "Ingreso máximo (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const b = r.pick([1, 2, 3, 4]);
    const qm = r.pick([10, 15, 20, 25, 30, 40]);
    const a = 2 * b * qm;
    const Imax = b * qm * qm;
    const pm = a - b * qm;
    return {
      statement: `La demanda de un producto es $p = ${a} - ${b === 1 ? "" : b}q$, donde $p$ es el precio y $q$ la cantidad vendida.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Escribe el ingreso $I(q)$.", before: "I(q) =", answer: P([-b, a, 0]), vars: ["q"], mistakes: [{ answer: P([-b, a]), feedback: "Esa es la demanda. El ingreso es precio por cantidad: $p \\cdot q$." }] },
        { kind: "expr", prompt: "¿Qué cantidad maximiza el ingreso?", before: "q =", answer: String(qm) },
        { kind: "expr", prompt: "¿Cuál es el ingreso máximo?", before: "I_{\\max} =", answer: String(Imax) },
        { kind: "expr", prompt: "¿A qué precio se vende en ese punto?", before: "p =", answer: String(pm) },
      ],
      hints: [
        "$I(q) = p \\cdot q = (" + a + " - " + (b === 1 ? "" : b) + "q)q$.",
        "Es una parábola que abre hacia abajo. Su máximo está en el vértice, $q = -\\frac{b}{2a}$ con los coeficientes de $I$.",
      ],
      solution: [
        `$I(q) = (${a} - ${b === 1 ? "" : b}q)\\,q = ${P([-b, a, 0])}$.`,
        `Vértice: $q = -\\dfrac{${a}}{2(${-b})} = ${qm}$.`,
        `$I(${qm}) = ${a} \\cdot ${qm} - ${b} \\cdot ${qm}^2 = ${a * qm} - ${b * qm * qm} = ${Imax}$.`,
        `El precio en ese punto es $p = ${a} - ${b} \\cdot ${qm} = ${pm}$, justo la mitad del precio máximo $${a}$.`,
      ],
    };
  },
};

const utilidadMaxima: ExerciseGen = {
  id: "utilidad-maxima",
  title: "Utilidad cuadrática: equilibrio y máximo (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const b = r.pick([1, 2]);
    const q1 = r.int(2, 10);
    const q2 = q1 + 2 * r.int(3, 10);
    const c = r.int(5, 20);
    const a = c + b * (q1 + q2);
    const F = b * q1 * q2;
    const qm = (q1 + q2) / 2;
    const Um = b * ((q2 - q1) / 2) ** 2;
    return {
      statement: `Una empresa enfrenta la demanda $p = ${a} - ${b === 1 ? "" : b}q$ y tiene costo total $C(q) = ${P([c, F])}$.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Escribe la utilidad $U(q)$.", before: "U(q) =", answer: P([-b, a - c, -F]), vars: ["q"], mistakes: [{ answer: P([-b, a + c, -F]), feedback: "Revisa el signo del costo variable al restar $C(q)$." }] },
        { kind: "set", prompt: "¿Para qué cantidades no hay ganancia ni pérdida?", before: "q \\in", answer: [q1, q2] },
        { kind: "expr", prompt: "¿Qué cantidad maximiza la utilidad?", before: "q =", answer: String(qm) },
        { kind: "expr", prompt: "¿Cuál es la utilidad máxima?", before: "U_{\\max} =", answer: String(Um) },
      ],
      hints: [
        "$U(q) = p \\cdot q - C(q)$.",
        "El punto de equilibrio sale de $U(q) = 0$. Saca factor común el coeficiente principal y factoriza.",
        "La utilidad máxima está en el vértice, que queda justo en medio de los dos puntos de equilibrio.",
      ],
      solution: [
        `$I(q) = ${P([-b, a, 0])}$, así que $U(q) = ${P([-b, a, 0])} - (${P([c, F])}) = ${P([-b, a - c, -F])}$.`,
        `$U(q) = 0$: ${b === 1 ? "" : `dividiendo entre $-${b}$, `}$q^2 - ${q1 + q2}q + ${q1 * q2} = 0$, que factoriza como $(q - ${q1})(q - ${q2}) = 0$. Equilibrio en $q = ${q1}$ y $q = ${q2}$.`,
        `Vértice: $q = \\frac{${q1} + ${q2}}{2} = ${qm}$.`,
        `$U(${qm}) = ${Um}$. Entre ${q1} y ${q2} unidades hay ganancia, fuera de ese tramo hay pérdida.`,
      ],
    };
  },
};

const impuestoEquilibrio: ExerciseGen = {
  id: "impuesto-equilibrio",
  title: "Efecto de un impuesto sobre el equilibrio (tipo parcial)",
  level: 3,
  exam: true,
  generate: (r) => {
    const b = r.int(1, 3);
    const d = r.int(1, 2);
    const s = b + d;
    const k = r.int(1, 2);
    const t = s * k;
    const qt = r.int(4, 12);
    const qe = qt + k;
    const c = r.int(2, 10);
    const a = c + s * qe;
    const pe = a - b * qe;
    const pt = a - b * qt;
    const co = (n: number) => (n === 1 ? "" : String(n));
    return {
      statement: `En un mercado la demanda es $p = ${a} - ${co(b)}q$ y la oferta es $p = ${c} + ${co(d)}q$, con $q$ en miles de unidades. El gobierno cobra a los productores un impuesto de $${t}$ bolívares por unidad.`,
      sequential: true,
      parts: [
        { kind: "expr", prompt: "Cantidad de equilibrio antes del impuesto", before: "q_e =", answer: String(qe) },
        { kind: "expr", prompt: "Precio de equilibrio antes del impuesto", before: "p_e =", answer: String(pe) },
        { kind: "expr", prompt: "Cantidad de equilibrio con el impuesto", before: "q_t =", answer: String(qt) },
        { kind: "expr", prompt: "Precio que paga el consumidor con el impuesto", before: "p_t =", answer: String(pt), mistakes: [{ answer: String(pe + t), feedback: "El precio no sube el impuesto completo. Calcula el nuevo equilibrio y lee el precio en la demanda." }] },
      ],
      hints: [
        "Equilibrio: iguala los dos precios, demanda y oferta.",
        `El impuesto sube la oferta: el productor ahora pide $${t}$ más por cada unidad, $p = ${c + t} + ${co(d)}q$.`,
      ],
      solution: [
        `Sin impuesto: $${a} - ${co(b)}q = ${c} + ${co(d)}q$, así que $${a - c} = ${s}q$ y $q_e = ${qe}$. Precio: $p_e = ${a} - ${b} \\cdot ${qe} = ${pe}$.`,
        `Con impuesto la oferta pasa a ser $p = ${c + t} + ${co(d)}q$.`,
        `$${a} - ${co(b)}q = ${c + t} + ${co(d)}q$ da $${a - c - t} = ${s}q$, así que $q_t = ${qt}$.`,
        `El consumidor paga $p_t = ${a} - ${b} \\cdot ${qt} = ${pt}$. Subió $${pt - pe}$ de los $${t}$ del impuesto. El resto lo absorbe el productor, que recibe $${pt - t}$ por unidad.`,
      ],
    };
  },
};

/* ------------------------------------ lección ------------------------------------ */

const topic: Topic = {
  ...meta("funciones-economia"),
  objectives: [
    "Plantear funciones lineales de demanda y oferta y hallar el equilibrio de mercado.",
    "Separar el costo fijo del variable y calcular el costo total y el costo promedio.",
    "Construir el ingreso y la utilidad con operaciones entre funciones.",
    "Hallar el punto de equilibrio y la cantidad que maximiza un ingreso o una utilidad cuadráticos.",
  ],
  sections: [
    {
      id: "demanda-oferta",
      title: "Demanda y oferta",
      blocks: [
        {
          type: "text",
          md: "Cuando sube el precio de la harina, la gente compra menos harina. Esa observación tan cotidiana es la **ley de la demanda**, y se escribe como una función: la cantidad demandada $q$ depende del precio $p$.\n\nLa realidad tiene muchos más factores, como el ingreso de las familias o el precio de otros productos. El modelo los deja fijos y se concentra en el precio. Es una simplificación fuerte, pero muestra la tendencia.",
        },
        {
          type: "definition",
          title: "Demanda y oferta lineales",
          md: "- **Demanda**: $q_d = a - bp$, con $a, b > 0$. Es decreciente: a mayor precio, menos compras.\n- **Oferta**: $q_s = c + dp$, con $d > 0$. Es creciente: a mayor precio, los productores quieren vender más.\n\nEn la demanda, $a$ es lo que se pediría si el bien fuera gratis y $\\frac{a}{b}$ es el precio a partir del cual nadie compra.",
        },
        {
          type: "example",
          title: "Leer una demanda",
          problem: "La demanda de un café en una panadería es $q = 40 - 2p$ (tazas por hora, precio en miles de bolívares). Interpreta la función.",
          steps: [
            "Con $p = 10$: $q = 40 - 20 = 20$ tazas por hora.",
            "Si el café fuera gratis, $p = 0$ y $q = 40$.",
            "Nadie compra cuando $q = 0$: $40 - 2p = 0$, o sea $p = 20$.",
            "La pendiente $-2$ dice que cada aumento de 1 en el precio quita 2 tazas por hora.",
          ],
          answer: "Tiene sentido para precios entre 0 y 20.",
        },
        {
          type: "graph",
          spec: {
            x: [0, 45], y: [0, 25], step: 5,
            curves: [{ fn: "20-\\frac{x}{2}", domain: [0, 40], color: "accent", label: "demanda" }],
            points: [{ x: 20, y: 10, label: "(20, 10)" }, { x: 0, y: 20 }, { x: 40, y: 0 }],
            labels: [{ x: 43, y: 1.5, text: "$q$" }, { x: 1.5, y: 24, text: "$p$" }],
          },
          caption: "Los economistas dibujan la cantidad en el eje horizontal y el precio en el vertical. Es la convención de Marshall, aunque $q$ sea la variable que depende de $p$.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Los ejes de la economía",
          md: "En matemática la variable independiente va en el eje horizontal. En economía la demanda se dibuja con el precio en el eje vertical. Por eso a veces verás la demanda escrita al revés, $p = 20 - \\frac{q}{2}$, que es la misma relación despejada para $p$.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Con la demanda $q = 40 - 2p$, ¿cuántas tazas se piden si el precio es 15?",
            parts: [{ kind: "expr", before: "q =", answer: "10" }],
            solution: ["$q = 40 - 2 \\cdot 15 = 10$."],
          },
        },
      ],
    },
    {
      id: "equilibrio",
      title: "Equilibrio de mercado",
      blocks: [
        {
          type: "text",
          md: "Si el precio está muy alto, los productores quieren vender mucho pero la gente compra poco: sobra mercancía. Si está muy bajo, pasa lo contrario y falta. El **equilibrio de mercado** es el precio en el que la cantidad demandada es igual a la ofrecida, sin excedente ni escasez. En la gráfica es el punto donde se cruzan las dos rectas.",
        },
        {
          type: "example",
          title: "Hallar el equilibrio",
          problem: "Demanda $q_d = 40 - 2p$ y oferta $q_s = 3p - 10$. Halla el equilibrio.",
          steps: [
            "Igualamos: $40 - 2p = 3p - 10$.",
            "Agrupamos: $50 = 5p$, así que $p_e = 10$.",
            "Sustituimos en cualquiera: $q_d = 40 - 20 = 20$ y $q_s = 30 - 10 = 20$. Coinciden.",
          ],
          answer: "Precio de equilibrio 10 y cantidad de equilibrio 20.",
        },
        {
          type: "graph",
          spec: {
            x: [0, 45], y: [0, 25], step: 5,
            curves: [
              { fn: "20-\\frac{x}{2}", domain: [0, 40], color: "accent", label: "demanda" },
              { fn: "\\frac{x+10}{3}", domain: [0, 45], color: "blue", label: "oferta" },
            ],
            points: [{ x: 20, y: 10, label: "equilibrio (20, 10)" }],
            hlines: [{ y: 14, dashed: true, color: "red", label: "p = 14" }],
          },
          caption: "Con $p = 14$ se piden 12 tazas pero se ofrecen 32: hay un excedente de 20. Ese sobrante empuja el precio hacia abajo, hacia el equilibrio.",
        },
        {
          type: "widget",
          widget: {
            kind: "sliders",
            fn: "c+dx",
            params: [
              { name: "c", min: 0, max: 12, step: 1, value: 2, label: "precio mínimo de oferta" },
              { name: "d", min: 0.25, max: 3, step: 0.25, value: 0.5, label: "pendiente de la oferta" },
            ],
            x: [0, 25],
            y: [0, 25],
            formula: "\\text{oferta: } p = c + d\\,q \\qquad c = {c},\\; d = {d}",
            reference: [{ fn: "20-x", domain: [0, 20], color: "accent", label: "demanda" }],
          },
          caption: "La demanda fija es $p = 20 - q$. Sube $c$, como si aumentaran los costos de producir, y mira cómo el equilibrio se mueve hacia menos cantidad y más precio.",
        },
        {
          type: "note",
          tone: "econ",
          title: "Excedente y escasez",
          md: "Si $p > p_e$, $q_s > q_d$ y sobra producto (excedente). Si $p < p_e$, $q_d > q_s$ y falta producto (escasez). Un precio regulado por debajo del equilibrio produce escasez, que es justo lo que se observa cuando aparecen colas.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Demanda $q_d = 60 - p$ y oferta $q_s = 2p$. ¿Cuál es el precio de equilibrio?",
            parts: [{ kind: "expr", before: "p_e =", answer: "20", mistakes: [{ answer: "40", feedback: "Esa es la cantidad de equilibrio." }] }],
            solution: ["$60 - p = 2p$ da $60 = 3p$, así que $p_e = 20$ y $q_e = 40$."],
          },
        },
      ],
    },
    {
      id: "costos",
      title: "Costo fijo, variable, total y promedio",
      blocks: [
        {
          type: "text",
          md: "Una panadería paga alquiler aunque un día no hornee ni un pan. Ese es un **costo fijo**: no depende de cuánto se produce. La harina, en cambio, crece con cada pan: es un **costo variable**. El costo total junta los dos.",
        },
        {
          type: "definition",
          title: "Funciones de costo",
          md: "- Costo total: $C(q) = CF + CV(q)$.\n- En el modelo lineal, el costo variable es el costo por unidad por la cantidad: $CV(q) = c_v\\,q$, así que $C(q) = CF + c_v\\,q$.\n- Costo promedio: $\\overline{C}(q) = \\dfrac{C(q)}{q} = \\dfrac{CF}{q} + c_v$.\n\nEl dominio con sentido económico es $q \\ge 0$ para el costo total y $q > 0$ para el promedio.",
        },
        {
          type: "example",
          title: "Un taller de costura",
          problem: "Un taller tiene costos fijos de 2.000 bolívares al mes y cada prenda le cuesta 15. Halla $C(q)$, el costo de 100 prendas y el costo promedio en ese nivel.",
          steps: [
            "$C(q) = 2000 + 15q$. Es una recta con corte 2000 y pendiente 15.",
            "$C(100) = 2000 + 1500 = 3500$ bolívares.",
            "$\\overline{C}(100) = \\frac{3500}{100} = 35$ bolívares por prenda.",
            "Cada prenda cuesta 15 en materiales, pero además carga con $\\frac{2000}{100} = 20$ del costo fijo.",
          ],
        },
        {
          type: "graph",
          spec: {
            x: [0, 20], y: [0, 14],
            curves: [{ fn: "2+\\frac{20}{x}", domain: [1.5, 20], color: "accent", label: "costo promedio" }],
            hlines: [{ y: 2, dashed: true, color: "muted", label: "c_v = 2" }],
          },
          caption: "Costo promedio de $C(q) = 20 + 2q$. Mientras más se produce, más se reparte el costo fijo y el promedio se acerca al costo por unidad, sin llegar a él.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Producir cero no cuesta cero",
          md: "$C(0) = CF$. Aunque no se fabrique nada, el costo fijo se paga. Un error común es escribir $C(q) = c_v\\,q$ y olvidar el término fijo.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Si $C(q) = 600 + 8q$, ¿cuál es el costo promedio al producir 50 unidades?",
            parts: [{ kind: "expr", answer: "20", mistakes: [{ answer: "1000", feedback: "Ese es el costo total. Divide entre 50." }] }],
            solution: ["$C(50) = 600 + 400 = 1000$ y $\\overline{C}(50) = \\frac{1000}{50} = 20$."],
          },
        },
      ],
    },
    {
      id: "ingreso-utilidad",
      title: "Ingreso y utilidad",
      blocks: [
        {
          type: "text",
          md: "El **ingreso** es lo que entra por ventas: precio por cantidad, $I(q) = p \\cdot q$. La **utilidad** (o ganancia) es lo que queda después de pagar los costos: $U(q) = I(q) - C(q)$. Son operaciones entre funciones, las mismas del tema de composición.\n\nSi el precio es fijo, el ingreso es una recta. Si el precio depende de la cantidad por la demanda, el ingreso se vuelve una parábola.",
        },
        {
          type: "example",
          title: "Utilidad con precio variable",
          problem: "La demanda es $p = 10 - q$ y el costo es $C(q) = 7 + 2q$ (cantidades en cientos de unidades, dinero en miles de bolívares). Halla $I(q)$, $U(q)$ y la utilidad máxima.",
          steps: [
            "$I(q) = p \\cdot q = (10 - q)q = 10q - q^2$.",
            "$U(q) = 10q - q^2 - (7 + 2q) = -q^2 + 8q - 7$.",
            "Es una parábola que abre hacia abajo. Vértice: $q = -\\frac{8}{2(-1)} = 4$.",
            "$U(4) = -16 + 32 - 7 = 9$.",
          ],
          answer: "La utilidad máxima es 9 (miles de bolívares) y se logra vendiendo 400 unidades.",
        },
        {
          type: "graph",
          spec: {
            x: [0, 10], y: [-8, 28], step: 2,
            curves: [
              { fn: "10x-x^{2}", domain: [0, 10], color: "blue", label: "I(q)" },
              { fn: "7+2x", domain: [0, 10], color: "red", label: "C(q)" },
              { fn: "-x^{2}+8x-7", domain: [0, 10], color: "accent", label: "U(q)" },
            ],
            points: [{ x: 4, y: 9, label: "máximo (4, 9)" }, { x: 1, y: 0 }, { x: 7, y: 0 }],
          },
          caption: "La utilidad es la distancia vertical entre ingreso y costo. Es positiva entre $q = 1$ y $q = 7$, donde el ingreso queda por encima del costo.",
        },
        {
          type: "note",
          tone: "warning",
          title: "El paréntesis al restar",
          md: "$U(q) = I(q) - C(q)$ resta **todo** el costo. Con $C(q) = 7 + 2q$ hay que escribir $-(7 + 2q) = -7 - 2q$. Olvidar el paréntesis y poner $-7 + 2q$ es el error más frecuente.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Si $p = 30 - q$ y $C(q) = 50 + 6q$, escribe $U(q)$.",
            parts: [{ kind: "expr", before: "U(q) =", answer: "-q^{2} + 24q - 50", vars: ["q"], mistakes: [{ answer: "-q^{2} + 36q - 50", feedback: "Al restar $C(q)$ el $6q$ también cambia de signo." }] }],
            solution: ["$I(q) = 30q - q^2$. $U(q) = 30q - q^2 - 50 - 6q = -q^2 + 24q - 50$."],
          },
        },
      ],
    },
    {
      id: "punto-equilibrio",
      title: "El punto de equilibrio",
      blocks: [
        {
          type: "text",
          md: "Toda empresa quiere saber cuánto tiene que vender para dejar de perder. Ese nivel es el **punto de equilibrio**: el ingreso alcanza justo para cubrir el costo y la utilidad es cero. Por debajo hay pérdida y por encima hay ganancia.",
        },
        {
          type: "definition",
          title: "Punto de equilibrio",
          md: "Es la cantidad $q$ que cumple $I(q) = C(q)$, o lo que es igual, $U(q) = 0$.\n\nCon precio fijo $p$ y costo $C(q) = CF + c_v\\,q$:\n\n$$pq = CF + c_v\\,q \\quad\\Longrightarrow\\quad q = \\frac{CF}{p - c_v}$$\n\nEl número $p - c_v$ es lo que cada unidad aporta para cubrir el costo fijo. Se llama margen de contribución.",
        },
        {
          type: "graph",
          spec: {
            x: [0, 8], y: [0, 40], step: 2,
            curves: [
              { fn: "5x", domain: [0, 8], color: "blue", label: "I(q) = 5q" },
              { fn: "8+3x", domain: [0, 8], color: "red", label: "C(q) = 8 + 3q" },
            ],
            points: [{ x: 4, y: 20, label: "equilibrio (4, 20)" }],
          },
          caption: "A la izquierda del cruce el costo está por encima del ingreso y hay pérdida. A la derecha hay ganancia.",
        },
        {
          type: "example",
          title: "Cuántas unidades hay que vender",
          problem: "Un emprendimiento vende cada unidad a 25 bolívares, con costo variable de 15 por unidad y costos fijos de 2.000. Halla el punto de equilibrio.",
          steps: [
            "Cada unidad deja $25 - 15 = 10$ para cubrir el costo fijo.",
            "Hacen falta $\\frac{2000}{10} = 200$ unidades.",
            "Comprobación: $I(200) = 5000$ y $C(200) = 2000 + 3000 = 5000$.",
          ],
          answer: "200 unidades. Con menos hay pérdida y con más hay ganancia.",
        },
        {
          type: "note",
          tone: "warning",
          title: "Dos equilibrios distintos",
          md: "El **equilibrio de mercado** cruza demanda con oferta y da un precio y una cantidad. El **punto de equilibrio** de una empresa cruza ingreso con costo y da la cantidad mínima para no perder. Tienen nombres parecidos pero responden preguntas diferentes.",
        },
        {
          type: "quick",
          exercise: {
            statement: "Precio 12, costo variable 8 por unidad y costos fijos de 400. ¿Cuál es el punto de equilibrio?",
            parts: [{ kind: "expr", before: "q =", answer: "100", mistakes: [{ answer: "\\frac{100}{3}", feedback: "Dividiste entre el precio. Hay que dividir entre el margen $12 - 8 = 4$." }] }],
            solution: ["$q = \\frac{400}{12 - 8} = 100$ unidades."],
          },
        },
      ],
    },
    {
      id: "ingreso-precio",
      title: "Subir el precio no siempre sube el ingreso",
      blocks: [
        {
          type: "text",
          md: "Si un vendedor sube el precio, gana más por cada unidad pero vende menos unidades. El ingreso depende de cuál de los dos efectos pesa más. La guía de la cátedra lo plantea con el ingreso en función del precio: $I(p) = p \\cdot q(p)$. Con demanda lineal sale una parábola que abre hacia abajo, y su vértice es el precio que da el mayor ingreso.",
        },
        {
          type: "example",
          title: "El precio que maximiza el ingreso",
          problem: "La demanda es $q = 100 - 2p$. ¿Qué precio da el mayor ingreso?",
          steps: [
            "$I(p) = p(100 - 2p) = 100p - 2p^2$.",
            "Vértice: $p = -\\frac{100}{2(-2)} = 25$.",
            "$I(25) = 2500 - 1250 = 1250$, con $q = 50$ unidades vendidas.",
          ],
          answer: "El ingreso máximo es 1.250, con precio 25.",
        },
        {
          type: "table",
          headers: ["Precio $p$", "Cantidad $q = 100 - 2p$", "Ingreso $p \\cdot q$"],
          rows: [
            ["$10$", "$80$", "$800$"],
            ["$20$", "$60$", "$1200$"],
            ["$25$", "$50$", "$1250$"],
            ["$30$", "$40$", "$1200$"],
            ["$40$", "$20$", "$800$"],
          ],
          caption: "Hasta 25, subir el precio sube el ingreso. Después de 25, lo baja. La tabla es simétrica alrededor del vértice.",
        },
        {
          type: "note",
          tone: "idea",
          title: "Lo que viene",
          md: "Aquí todo se resolvió con el vértice porque las funciones eran cuadráticas. Cuando el costo o la demanda tengan otra forma, la herramienta será la derivada, y la sensibilidad de la demanda al precio se medirá con la elasticidad.",
        },
        {
          type: "quick",
          exercise: {
            statement: "La demanda es $p = 60 - 3q$. ¿Qué cantidad maximiza el ingreso?",
            parts: [{ kind: "expr", before: "q =", answer: "10" }],
            solution: ["$I(q) = 60q - 3q^2$. Vértice en $q = -\\frac{60}{2(-3)} = 10$."],
          },
        },
      ],
    },
  ],
  exercises: [
    evaluarDemanda,
    costoTotal,
    costoPromedio,
    utilidadPrecioFijo,
    identificarDemanda,
    equilibrioMercado,
    puntoEquilibrio,
    utilidadFormula,
    dominioEconomico,
    ingresoMaximo,
    utilidadMaxima,
    impuestoEquilibrio,
  ],
};

export default topic;
