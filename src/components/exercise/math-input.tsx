"use client";

import { useEffect, useRef, useState } from "react";
import { Tex } from "@/components/math/rich";

type MathliveModule = typeof import("mathlive");
let setup: Promise<MathliveModule> | null = null;

function loadMathlive(): Promise<MathliveModule> {
  if (!setup) {
    setup = import("mathlive").then((m) => {
      m.MathfieldElement.fontsDirectory = "/mathlive/fonts";
      m.MathfieldElement.soundsDirectory = null;
      m.MathfieldElement.keypressSound = null;
      m.MathfieldElement.plonkSound = null;
      const kb = window.mathVirtualKeyboard;
      kb.layouts = [
        {
          label: "Mate I",
          tooltip: "Teclado de Matemática I",
          rows: [
            ["[7]", "[8]", "[9]", "[/]", { latex: "\\frac{#@}{#?}", tooltip: "Fracción" }, { latex: "#@^{#?}", tooltip: "Potencia" }, { latex: "\\sqrt{#0}", tooltip: "Raíz cuadrada" }, { latex: "\\sqrt[#?]{#0}", tooltip: "Raíz n-ésima" }],
            ["[4]", "[5]", "[6]", "[*]", "x", "y", { latex: "e^{#?}", tooltip: "e elevado a" }, { latex: "\\ln(#0)", label: "ln", tooltip: "Logaritmo natural" }],
            ["[1]", "[2]", "[3]", "[-]", "[(]", "[)]", { latex: "\\left|#0\\right|", tooltip: "Valor absoluto" }, { latex: "\\log_{#?}(#0)", label: "log", tooltip: "Logaritmo en base b" }],
            ["[0]", "[.]", "[+]", "\\pi", "e", "\\infty", "[left]", "[right]", "[backspace]"],
          ],
        },
        "alphabetic",
      ];
      return m;
    });
  }
  return setup;
}

type MathfieldLike = HTMLElement & {
  value: string;
  smartFence: boolean;
  mathVirtualKeyboardPolicy: string;
  menuItems: readonly unknown[];
  focus: () => void;
};

export function MathInput({
  value,
  onChange,
  onSubmit,
  before,
  after,
  disabled,
  special,
  label = "Respuesta",
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  before?: string;
  after?: string;
  disabled?: boolean;
  special?: ("inf" | "-inf" | "dne")[];
  label?: string;
}) {
  const ref = useRef<MathfieldLike | null>(null);
  const [ready, setReady] = useState(false);
  const onChangeRef = useRef(onChange);
  const onSubmitRef = useRef(onSubmit);
  useEffect(() => {
    onChangeRef.current = onChange;
    onSubmitRef.current = onSubmit;
  });

  useEffect(() => {
    let alive = true;
    loadMathlive().then(() => {
      if (!alive) return;
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const mf = ref.current;
    if (!ready || !mf) return;
    mf.smartFence = true;
    mf.mathVirtualKeyboardPolicy = "auto";
    try {
      mf.menuItems = [];
    } catch {
      // versiones sin menú
    }
    const onInput = () => onChangeRef.current(mf.value);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onSubmitRef.current?.();
      }
    };
    mf.addEventListener("input", onInput);
    mf.addEventListener("keydown", onKey, { capture: true });
    return () => {
      mf.removeEventListener("input", onInput);
      mf.removeEventListener("keydown", onKey, { capture: true });
    };
  }, [ready]);

  useEffect(() => {
    const mf = ref.current;
    if (!ready || !mf) return;
    const shown = value === "dne" || value === "\\infty" || value === "-\\infty" ? "" : value;
    if (mf.value !== shown) mf.value = shown;
  }, [value, ready]);

  const specialValue = value === "dne" ? "dne" : value === "\\infty" ? "inf" : value === "-\\infty" ? "-inf" : null;
  const specials: { id: "inf" | "-inf" | "dne"; label: string; latex: string }[] = [
    { id: "inf", label: "+∞", latex: "\\infty" },
    { id: "-inf", label: "−∞", latex: "-\\infty" },
    { id: "dne", label: "No existe", latex: "dne" },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        {before ? <Tex tex={before} className="shrink-0 text-[1.15rem]" /> : null}
        <div className="relative min-w-0 flex-1">
          {specialValue ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange("")}
              className="flex min-h-12 w-full items-center justify-between rounded-xl border-[1.5px] border-accent bg-accent-soft px-3 text-left text-[1.05rem] font-medium text-accent-strong"
            >
              <span>{specials.find((s) => s.id === specialValue)?.label}</span>
              <span className="text-sm font-normal text-ink-2">Cambiar</span>
            </button>
          ) : null}
          {ready ? (
            <math-field
              ref={ref as never}
              aria-label={label}
              math-virtual-keyboard-policy="auto"
              style={{
                ...(disabled ? { pointerEvents: "none", opacity: 0.75 } : {}),
                ...(specialValue ? { display: "none" } : {}),
              }}
            />
          ) : (
            <div className="min-h-12 w-full animate-pulse rounded-xl border-[1.5px] border-line-2 bg-sunk" />
          )}
        </div>
        {after ? <Tex tex={after} className="shrink-0 text-[1.15rem]" /> : null}
      </div>
      {special?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {specials
            .filter((s) => special.includes(s.id))
            .map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(s.latex)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  specialValue === s.id
                    ? "border-accent bg-accent text-surface"
                    : "border-line-2 bg-surface text-ink-2 hover:border-accent hover:text-accent"
                }`}
              >
                {s.label}
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}
