"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { KeyStroke, CelebrationTier } from "@/lib/types";
import { getCelebrationTier } from "@/lib/engine";
import { createConfetti, getGlowClass } from "@/lib/celebrations";

interface TypingAreaProps {
  text: string;
  onComplete: (keyStrokes: KeyStroke[]) => void;
  onProgress: (position: number, keyStrokes: KeyStroke[]) => void;
}

export default function TypingArea({ text, onComplete, onProgress }: TypingAreaProps) {
  const [position, setPosition] = useState(0);
  const [errors, setErrors] = useState<Set<number>>(new Set());
  const [celebration, setCelebration] = useState<CelebrationTier>("none");
  const keyStrokesRef = useRef<KeyStroke[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta" || e.key === "CapsLock" || e.key === "Tab") return;
      if (position >= text.length) return;

      e.preventDefault();

      const expected = text[position];
      const actual = e.key === "Enter" ? "\n" : e.key;
      const correct = actual === expected;

      const stroke: KeyStroke = {
        expected,
        actual,
        timestamp: performance.now(),
        correct,
      };

      keyStrokesRef.current.push(stroke);

      if (!correct) {
        setErrors((prev) => new Set(prev).add(position));
      }

      const newPosition = position + 1;
      setPosition(newPosition);
      onProgress(newPosition, keyStrokesRef.current);

      if (newPosition >= text.length) {
        const accuracy = Math.round(
          (keyStrokesRef.current.filter((k) => k.correct).length / keyStrokesRef.current.length) * 100
        );
        const tier = getCelebrationTier(accuracy);
        setCelebration(tier);

        if (canvasRef.current && tier !== "none") {
          createConfetti(canvasRef.current, tier, () => setCelebration("none"));
        }

        onComplete(keyStrokesRef.current);
      }
    },
    [position, text, onComplete, onProgress]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setPosition(0);
    setErrors(new Set());
    keyStrokesRef.current = [];
    setCelebration("none");
  }, [text]);

  return (
    <div ref={containerRef} className="relative">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />
      <div
        className={`p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-shadow duration-300 ${getGlowClass(celebration)}`}
      >
        <p className="text-lg sm:text-xl md:text-2xl leading-relaxed font-mono tracking-wide whitespace-pre-wrap select-none">
          {text.split("").map((char, i) => {
            let className = "text-slate-400 dark:text-slate-500";
            if (i < position) {
              className = errors.has(i)
                ? "text-red-500 bg-red-100 dark:bg-red-900/30"
                : "text-green-600 dark:text-green-400";
            } else if (i === position) {
              className =
                "text-slate-900 dark:text-white bg-indigo-100 dark:bg-indigo-900/50 border-b-2 border-indigo-500 animate-pulse";
            }
            return (
              <span key={i} className={className}>
                {char === "\n" ? "↵\n" : char === " " && i === position ? "·" : char}
              </span>
            );
          })}
        </p>
      </div>
      {position === 0 && (
        <p className="text-center text-sm text-slate-400 dark:text-slate-500 mt-3">
          Start typing to begin...
        </p>
      )}
    </div>
  );
}
