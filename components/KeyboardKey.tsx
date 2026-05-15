"use client";

import { memo } from "react";
import type { KeyDef } from "@/lib/keyboard-layout";

interface KeyboardKeyProps {
  keyDef: KeyDef;
  isActive: boolean;
  isCorrect: boolean | null;
  isExpected: boolean;
}

const UTILITY_KEYS = new Set([
  "Escape", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
  "Delete", "Insert", "Backspace", "Tab", "CapsLock", "Enter", "ShiftLeft", "ShiftRight",
  "ControlLeft", "ControlRight", "MetaLeft", "AltLeft", "AltRight", "Fn",
  "PageUp", "PageDown", "Home", "End",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
]);

export default memo(function KeyboardKey({ keyDef, isActive, isCorrect, isExpected }: KeyboardKeyProps) {
  const width = keyDef.width ?? 1;
  const isUtility = UTILITY_KEYS.has(keyDef.code);

  let stateClasses: string;
  if (isActive) {
    if (isCorrect === null) {
      stateClasses = "bg-[#00ff88]/10 border-[#00ff88]/40 text-[#00ff88]/70 scale-95";
    } else if (isCorrect) {
      stateClasses = "bg-[#00ff88]/20 border-[#00ff88]/60 text-[#00ff88] shadow-[0_0_8px_rgba(0,255,136,0.4)] scale-95";
    } else {
      stateClasses = "bg-red-500/20 border-red-500/60 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.4)] scale-95";
    }
  } else if (isExpected) {
    stateClasses = "bg-[#00ff88]/8 border-[#00ff88]/30 text-neutral-400 animate-[pulse_2s_ease-in-out_infinite]";
  } else if (isUtility) {
    stateClasses = "bg-[#141414] border-neutral-600/50 text-neutral-500 shadow-[inset_0_-1px_0_#0d0d0d]";
  } else {
    stateClasses = "bg-[#1a1a1a] border-neutral-700/50 text-neutral-400 shadow-[inset_0_-1px_0_#111]";
  }

  return (
    <div
      className={`flex items-center justify-center rounded-md border font-[family-name:var(--font-jetbrains)] text-[0.6rem] leading-none select-none transition-all duration-100 ${stateClasses}`}
      style={{
        width: `calc(var(--key-unit) * ${width})`,
        height: "var(--key-unit)",
      }}
    >
      {keyDef.labelShifted ? (
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[0.5rem] opacity-60">{keyDef.labelShifted}</span>
          <span>{keyDef.label}</span>
        </div>
      ) : (
        <span>{keyDef.label}</span>
      )}
    </div>
  );
});
