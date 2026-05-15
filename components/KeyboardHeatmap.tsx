"use client";

import { memo, useMemo } from "react";
import { KEYCHRON_K2_LAYOUT, type KeyDef } from "@/lib/keyboard-layout";

interface KeyboardHeatmapProps {
  errorHeatmap: Record<string, number>;
}

const CHAR_TO_CODE: Record<string, string> = {
  "`": "Backquote", "~": "Backquote",
  "1": "Digit1", "!": "Digit1",
  "2": "Digit2", "@": "Digit2",
  "3": "Digit3", "#": "Digit3",
  "4": "Digit4", "$": "Digit4",
  "5": "Digit5", "%": "Digit5",
  "6": "Digit6", "^": "Digit6",
  "7": "Digit7", "&": "Digit7",
  "8": "Digit8", "*": "Digit8",
  "9": "Digit9", "(": "Digit9",
  "0": "Digit0", ")": "Digit0",
  "-": "Minus", "_": "Minus",
  "=": "Equal", "+": "Equal",
  "[": "BracketLeft", "{": "BracketLeft",
  "]": "BracketRight", "}": "BracketRight",
  "\\": "Backslash", "|": "Backslash",
  ";": "Semicolon", ":": "Semicolon",
  "'": "Quote", "\"": "Quote",
  ",": "Comma", "<": "Comma",
  ".": "Period", ">": "Period",
  "/": "Slash", "?": "Slash",
  " ": "Space", "\n": "Enter",
};

for (let i = 65; i <= 90; i++) {
  const letter = String.fromCharCode(i);
  CHAR_TO_CODE[letter.toLowerCase()] = `Key${letter}`;
  CHAR_TO_CODE[letter] = `Key${letter}`;
}

function buildCodeErrorMap(errorHeatmap: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [char, count] of Object.entries(errorHeatmap)) {
    const code = CHAR_TO_CODE[char];
    if (code) {
      result[code] = (result[code] || 0) + count;
    }
  }
  return result;
}

export default memo(function KeyboardHeatmap({ errorHeatmap }: KeyboardHeatmapProps) {
  const codeErrors = useMemo(() => buildCodeErrorMap(errorHeatmap), [errorHeatmap]);
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
}: {
  keyDef: KeyDef;
  errors: number;
  maxErrors: number;
}) {
  const width = keyDef.width ?? 1;
  const intensity = errors / maxErrors;

  let bgColor: string;
  let textColor: string;
  if (errors === 0) {
    bgColor = "bg-[#1a1a1a]";
    textColor = "text-neutral-600";
  } else if (intensity < 0.33) {
    bgColor = "bg-amber-900/40";
    textColor = "text-amber-400";
  } else if (intensity < 0.66) {
    bgColor = "bg-orange-900/50";
    textColor = "text-orange-400";
  } else {
    bgColor = "bg-red-900/60";
    textColor = "text-red-400";
  }

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-md border border-neutral-700/50 font-[family-name:var(--font-jetbrains)] text-[0.6rem] leading-none select-none ${bgColor} ${textColor}`}
      style={{
        width: `calc(var(--key-unit) * ${width})`,
        height: "var(--key-unit)",
      }}
      title={errors > 0 ? `${keyDef.label}: ${errors} error${errors !== 1 ? "s" : ""}` : keyDef.label}
    >
      <span>{keyDef.label}</span>
      {errors > 0 && <span className="text-[0.45rem] mt-0.5 opacity-75">{errors}</span>}
    </div>
  );
});
