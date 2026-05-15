"use client";

import { memo, useMemo } from "react";
import { KEYCHRON_K2_LAYOUT, getExpectedCodes } from "@/lib/keyboard-layout";
import KeyboardKey from "./KeyboardKey";
import type { ActiveKeyState } from "@/lib/types";

interface VisualKeyboardProps {
  activeKey: ActiveKeyState | null;
  nextExpectedKey: string | null;
}

export default memo(function VisualKeyboard({ activeKey, nextExpectedKey }: VisualKeyboardProps) {
  const expectedCodes = useMemo(
    () => (nextExpectedKey ? new Set(getExpectedCodes(nextExpectedKey)) : new Set<string>()),
    [nextExpectedKey]
  );

  return (
    <div className="hidden md:block w-full mx-auto" aria-hidden="true" style={{ ["--key-unit" as string]: "clamp(34px, 3.84vw, 53px)" }}>
      {KEYCHRON_K2_LAYOUT.map((row, rowIdx) => (
        <div key={rowIdx} className="flex gap-[3px] mb-[3px] last:mb-0 justify-center">
          {row.map((keyDef) => (
            <KeyboardKey
              key={keyDef.code}
              keyDef={keyDef}
              isActive={activeKey?.code === keyDef.code}
              isCorrect={activeKey?.code === keyDef.code ? activeKey.correct : null}
              isExpected={!activeKey && expectedCodes.has(keyDef.code)}
            />
          ))}
        </div>
      ))}
    </div>
  );
});
