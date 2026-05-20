"use client";

import { memo, useMemo } from "react";
import { KEYCHRON_K2_LAYOUT, type KeyDef } from "@/lib/keyboard-layout";

export type HeatmapCase = "lower" | "upper";

interface KeyboardHeatmapProps {
  errorHeatmap: Record<string, number>;
  caseMode?: HeatmapCase;
}

const UNSHIFTED_TO_CODE: Record<string, string> = {
  "`": "Backquote",
  "1": "Digit1",
  "2": "Digit2",
  "3": "Digit3",
  "4": "Digit4",
  "5": "Digit5",
  "6": "Digit6",
  "7": "Digit7",
  "8": "Digit8",
  "9": "Digit9",
  "0": "Digit0",
  "-": "Minus",
  "=": "Equal",
  "[": "BracketLeft",
  "]": "BracketRight",
  "\\": "Backslash",
  ";": "Semicolon",
  "'": "Quote",
  ",": "Comma",
  ".": "Period",
  "/": "Slash",
  " ": "Space", "\n": "Enter",
};

const SHIFTED_TO_CODE: Record<string, string> = {
  "~": "Backquote",
  "!": "Digit1",
  "@": "Digit2",
  "#": "Digit3",
  "$": "Digit4",
  "%": "Digit5",
  "^": "Digit6",
  "&": "Digit7",
  "*": "Digit8",
  "(": "Digit9",
  ")": "Digit0",
  "_": "Minus",
  "+": "Equal",
  "{": "BracketLeft",
  "}": "BracketRight",
  "|": "Backslash",
  ":": "Semicolon",
  "\"": "Quote",
  "<": "Comma",
  ">": "Period",
  "?": "Slash",
};

for (let i = 97; i <= 122; i++) {
  const lower = String.fromCharCode(i);
  UNSHIFTED_TO_CODE[lower] = `Key${lower.toUpperCase()}`;
  SHIFTED_TO_CODE[lower.toUpperCase()] = `Key${lower.toUpperCase()}`;
}

function buildCodeErrorMap(errorHeatmap: Record<string, number>, caseMode: HeatmapCase): Record<string, number> {
  const lookup = caseMode === "upper" ? SHIFTED_TO_CODE : UNSHIFTED_TO_CODE;
  const result: Record<string, number> = {};
  for (const [char, count] of Object.entries(errorHeatmap)) {
    const code = lookup[char];
    if (code) {
      result[code] = count;
    }
  }
  return result;
}

export default memo(function KeyboardHeatmap({ errorHeatmap, caseMode = "lower" }: KeyboardHeatmapProps) {
  const codeErrors = useMemo(() => buildCodeErrorMap(errorHeatmap, caseMode), [errorHeatmap, caseMode]);
  const maxErrors = useMemo(() => Math.max(1, ...Object.values(codeErrors)), [codeErrors]);

  return (
    <div className="w-full mx-auto" style={{ ["--key-unit" as string]: "clamp(34px, 3.84vw, 53px)" }}>
      {KEYCHRON_K2_LAYOUT.map((row, rowIdx) => (
        <div key={rowIdx} className="flex gap-[3px] mb-[3px] last:mb-0 justify-center">
          {row.map((keyDef) => (
            <HeatmapKey
              key={keyDef.code}
              keyDef={keyDef}
              errors={codeErrors[keyDef.code] || 0}
              maxErrors={maxErrors}
              caseMode={caseMode}
            />
          ))}
        </div>
      ))}
    </div>
  );
});

const HeatmapKey = memo(function HeatmapKey({
  keyDef,
  errors,
  maxErrors,
  caseMode,
}: {
  keyDef: KeyDef;
  errors: number;
  maxErrors: number;
  caseMode: HeatmapCase;
}) {
  const width = keyDef.width ?? 1;
  const intensity = errors / maxErrors;

  let bgColor: string;
  let textColor: string;
  let borderColor: string;
  if (errors === 0) {
    bgColor = "bg-[#1a1a1a]";
    textColor = "text-neutral-500";
    borderColor = "border-neutral-700/50";
  } else if (intensity < 0.15) {
    bgColor = "bg-blue-500/35";
    textColor = "text-blue-100";
    borderColor = "border-blue-400/60";
  } else if (intensity < 0.3) {
    bgColor = "bg-yellow-500/40";
    textColor = "text-yellow-100";
    borderColor = "border-yellow-400/60";
  } else if (intensity < 0.5) {
    bgColor = "bg-amber-500/55";
    textColor = "text-amber-50";
    borderColor = "border-amber-400/70";
  } else if (intensity < 0.7) {
    bgColor = "bg-orange-500/65";
    textColor = "text-orange-50";
    borderColor = "border-orange-400/80";
  } else if (intensity < 0.9) {
    bgColor = "bg-red-500/80";
    textColor = "text-red-50";
    borderColor = "border-red-400";
  } else {
    bgColor = "bg-white/90";
    textColor = "text-red-700 font-bold";
    borderColor = "border-white";
  }

  const displayLabel = caseMode === "upper" && keyDef.labelShifted ? keyDef.labelShifted : keyDef.label;

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-md border font-[family-name:var(--font-jetbrains)] text-[0.6rem] leading-none select-none ${bgColor} ${textColor} ${borderColor}`}
      style={{
        width: `calc(var(--key-unit) * ${width})`,
        height: "var(--key-unit)",
      }}
      title={errors > 0 ? `${displayLabel}: ${errors} error${errors !== 1 ? "s" : ""}` : displayLabel}
    >
      <span>{displayLabel}</span>
      {errors > 0 && <span className="text-[0.45rem] mt-0.5 opacity-90">{errors}</span>}
    </div>
  );
});
