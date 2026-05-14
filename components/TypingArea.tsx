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
  const [shakeError, setShakeError] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const keyStrokesRef = useRef<KeyStroke[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      setCapsLockOn(e.getModifierState("CapsLock"));

      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta" || e.key === "CapsLock" || e.key === "Tab" || e.key === "Escape") return;

      e.preventDefault();

      if (e.key === "Backspace") {
        if (position > 0) {
          const newPos = position - 1;
          setPosition(newPos);
          setErrors((prev) => {
            const next = new Set(prev);
            next.delete(newPos);
            return next;
          });
          keyStrokesRef.current.pop();
          onProgress(newPos, keyStrokesRef.current);
        }
        return;
      }

      if (position >= text.length) return;

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
        setShakeError(true);
        setTimeout(() => setShakeError(false), 300);
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
      {capsLockOn && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-900/80 rounded-2xl backdrop-blur-sm">
          <div className="text-center p-8">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-2">Caps Lock is ON</h2>
            <p className="text-red-200">Turn it off to continue typing</p>
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />
      <div
        className={`p-8 sm:p-10 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 transition-all duration-300 ${getGlowClass(celebration)} ${shakeError ? "animate-[shake_0.3s_ease-in-out] border-red-400 dark:border-red-500" : ""}`}
      >
        <p className="text-2xl sm:text-3xl md:text-4xl leading-relaxed tracking-wide whitespace-pre-wrap select-none font-[family-name:var(--font-jetbrains)]">
          {text.split("").map((char, i) => {
            let className = "text-slate-300 dark:text-slate-600";
            if (i < position) {
              className = errors.has(i)
                ? "text-red-500 bg-red-200 dark:bg-red-900/50 rounded px-0.5 line-through decoration-2"
                : "text-emerald-600 dark:text-emerald-400";
            } else if (i === position) {
              className =
                "text-slate-900 dark:text-white bg-indigo-200 dark:bg-indigo-700/60 rounded px-0.5 border-b-3 border-indigo-500";
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
        <p className="text-center text-base text-slate-400 dark:text-slate-500 mt-4">
          Start typing to begin...
        </p>
      )}
    </div>
  );
}
