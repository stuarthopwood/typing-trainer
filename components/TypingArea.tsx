"use client";

import { useRef, useEffect, useCallback, useState, memo } from "react";
import type { KeyStroke, CelebrationTier } from "@/lib/types";
import { getCelebrationTier } from "@/lib/engine";
import { createConfetti, getGlowClass } from "@/lib/celebrations";

interface TypingAreaProps {
  text: string;
  onComplete: (keyStrokes: KeyStroke[]) => void;
  onProgress: (position: number, keyStrokes: KeyStroke[]) => void;
  onKeyPress?: (key: string, code: string, correct: boolean | null) => void;
}

export default memo(function TypingArea({ text, onComplete, onProgress, onKeyPress }: TypingAreaProps) {
  const [position, setPosition] = useState(0);
  const [errors, setErrors] = useState<Set<number>>(new Set());
  const [celebration, setCelebration] = useState<CelebrationTier>("none");
  const [shakeError, setShakeError] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const keyStrokesRef = useRef<KeyStroke[]>([]);
  const pendingKeysRef = useRef<Map<string, { timestamp: number; strokeIndex: number }>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      setCapsLockOn(e.getModifierState("CapsLock"));

      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta" || e.key === "CapsLock" || e.key === "Tab" || e.key === "Escape") {
        onKeyPress?.(e.key, e.code, null);
        return;
      }

      e.preventDefault();

      if (e.key === "Backspace") {
        onKeyPress?.(e.key, e.code, null);
        if (position > 0) {
          const newPos = position - 1;
          setPosition(newPos);
          setErrors((prev) => {
            const next = new Set(prev);
            next.delete(newPos);
            return next;
          });
        }
        return;
      }

      if (position >= text.length) return;

      const expected = text[position];
      const actual = e.key === "Enter" ? "\n" : e.key;
      const correct = actual === expected;
      const now = performance.now();

      const prevStroke = keyStrokesRef.current[keyStrokesRef.current.length - 1];
      const interKeyDelay = prevStroke?.keyUpTimestamp
        ? now - prevStroke.keyUpTimestamp
        : undefined;

      const stroke: KeyStroke = {
        expected,
        actual,
        timestamp: now,
        correct,
        interKeyDelay,
      };

      const strokeIndex = keyStrokesRef.current.length;
      keyStrokesRef.current.push(stroke);
      pendingKeysRef.current.set(e.code, { timestamp: now, strokeIndex });
      onKeyPress?.(e.key, e.code, correct);

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
    [position, text, onComplete, onProgress, onKeyPress]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      const pending = pendingKeysRef.current.get(e.code);
      if (pending) {
        const now = performance.now();
        const stroke = keyStrokesRef.current[pending.strokeIndex];
        if (stroke) {
          stroke.keyUpTimestamp = now;
          stroke.holdDuration = now - pending.timestamp;
        }
        pendingKeysRef.current.delete(e.code);
      }
    };
    window.addEventListener("keyup", handleKeyUp);
    return () => window.removeEventListener("keyup", handleKeyUp);
  }, []);

  useEffect(() => {
    setPosition(0);
    setErrors(new Set());
    keyStrokesRef.current = [];
    pendingKeysRef.current.clear();
    setCelebration("none");
  }, [text]);

  return (
    <div ref={containerRef} className="relative" tabIndex={0} role="application" aria-label="Typing area — type the displayed text">
      {capsLockOn && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-900/80 rounded-2xl backdrop-blur-sm" role="alert" aria-live="assertive">
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
        className={`p-8 sm:p-12 transition-all duration-300 ${getGlowClass(celebration)} ${shakeError ? "animate-[shake_0.3s_ease-in-out]" : ""}`}
      >
        <p className="text-3xl sm:text-4xl md:text-5xl leading-[1.8] tracking-wide whitespace-pre-wrap select-none text-center font-[family-name:var(--font-inter)]">
          {text.split("").map((char, i) => (
            <Char
              key={i}
              char={char}
              state={i < position ? (errors.has(i) ? "error" : "correct") : i === position ? "active" : "pending"}
            />
          ))}
        </p>
      </div>
    </div>
  );
});

const Char = memo(function Char({ char, state }: { char: string; state: "pending" | "active" | "correct" | "error" }) {
  const className =
    state === "error"
      ? "text-red-400 line-through decoration-2 decoration-red-500/80"
      : state === "correct"
        ? "text-[#00ff88]/80"
        : state === "active"
          ? "text-white bg-[#00ff88]/15 rounded-sm border-b-2 border-[#00ff88] shadow-[0_0_8px_rgba(0,255,136,0.3)] animate-[pulse_2s_ease-in-out_infinite]"
          : "text-neutral-300";

  const display = char === "\n" ? "↵\n" : state === "active" && char === " " ? "·" : char;

  return <span className={className}>{display}</span>;
});
