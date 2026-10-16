"use client";

import type { Part } from "@/content/types";
import type { PartValue } from "@/lib/grade";
import { ChoiceInput, IntervalInput, PointInput, SetInput } from "./inputs";
import { PlaceInput, SignsInput } from "./interactive-inputs";
import { MathInput } from "./math-input";

export function PartInput({
  part,
  value,
  onChange,
  onSubmit,
  disabled,
  order,
  reveal,
  solved,
}: {
  part: Part;
  value: PartValue;
  onChange: (v: PartValue) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  order: number[];
  reveal?: boolean;
  /** La parte ya está bien respondida. */
  solved?: boolean;
}) {
  switch (part.kind) {
    case "choice":
      return (
        <ChoiceInput
          part={part}
          order={order}
          value={value as Extract<PartValue, { kind: "choice" }>}
          onChange={onChange}
          disabled={disabled}
          reveal={reveal}
        />
      );
    case "expr":
      return (
        <MathInput
          value={(value as Extract<PartValue, { kind: "expr" }>).latex}
          onChange={(latex) => onChange({ kind: "expr", latex })}
          onSubmit={onSubmit}
          before={part.before}
          after={part.after}
          disabled={disabled}
          special={part.special}
        />
      );
    case "interval":
      return (
        <IntervalInput
          value={value as Extract<PartValue, { kind: "interval" }>}
          onChange={onChange}
          disabled={disabled}
          before={part.before}
          onSubmit={onSubmit}
        />
      );
    case "set":
      return (
        <SetInput
          value={value as Extract<PartValue, { kind: "set" }>}
          onChange={onChange}
          disabled={disabled}
          before={part.before}
          onSubmit={onSubmit}
        />
      );
    case "point":
      return (
        <PointInput
          graph={part.graph}
          snap={part.snap}
          value={value as Extract<PartValue, { kind: "point" }>}
          onChange={onChange}
          disabled={disabled}
        />
      );
    case "signs":
      return (
        <SignsInput
          part={part}
          value={value as Extract<PartValue, { kind: "signs" }>}
          onChange={onChange}
          disabled={disabled}
          reveal={reveal}
        />
      );
    case "place":
      return (
        <PlaceInput
          part={part}
          value={value as Extract<PartValue, { kind: "place" }>}
          onChange={onChange}
          disabled={disabled}
          solved={solved || reveal}
        />
      );
  }
}
