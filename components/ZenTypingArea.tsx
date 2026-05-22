"use client";

import { useRef, useEffect, useState, useCallback, memo } from "react";
import type { KeyStroke } from "@/lib/types";
import { extractWords, checkSpelling, type SpellCheckResult } from "@/lib/zen";

interface ZenTypingAreaProps {
  topic: string;
  onProgress: (wordCount: number, keyStrokes: KeyStroke[], text: string, spellResults: Map<number, SpellCheckResult>) => void;
  onComplete: (keyStrokes: KeyStroke[], text: string, spellResults: Map<number, SpellCheckResult>) => void;
}

export default memo(function ZenTypingArea({ topic, onProgress, onComplete }: ZenTypingAreaProps) {
  const [text, setText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const keyStrokesRef = useRef<KeyStroke[]>([]);
  const spellResultsRef = useRef<Map<number, SpellCheckResult>>(new Map());
  const uncheckedStartRef = useRef(0);
  const debounceTimerRef = useRef<NodeJS.Timeout>(undefined);
  const pendingCheckRef = useRef(false);
  const [, forceRender] = useState(0);

  const fireSpellCheck = useCallback(async (currentText: string) => {
    if (pendingCheckRef.current) return;

    const allWords = extractWords(currentText);
    const checked = spellResultsRef.current;
    const unchecked = allWords.filter((w) => !checked.has(w.startIndex));
    if (unchecked.length === 0) return;

    pendingCheckRef.current = true;
    const batch = unchecked.slice(0, 5);
    const words = batch.map((w) => w.word);
    const contextStart = Math.max(0, batch[0].startIndex - 30);
    const contextEnd = Math.min(currentText.length, batch[batch.length - 1].endIndex + 30);
    const context = currentText.slice(contextStart, contextEnd);

    const results = await checkSpelling(words, context);
    pendingCheckRef.current = false;

    if (results.length > 0) {
      results.forEach((r, i) => {
        if (batch[i]) spellResultsRef.current.set(batch[i].startIndex, r);
      });
      forceRender((n) => n + 1);
    }

    const remainingUnchecked = extractWords(currentText).filter((w) => !spellResultsRef.current.has(w.startIndex));
    if (remainingUnchecked.length >= 5) {
      fireSpellCheck(currentText);
    }
  }, []);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);

    const wc = extractWords(newText).length;
    setWordCount(wc);

    clearTimeout(debounceTimerRef.current);

    const unchecked = extractWords(newText).filter((w) => !spellResultsRef.current.has(w.startIndex));
    if (unchecked.length >= 5) {
      fireSpellCheck(newText);
    } else {
      debounceTimerRef.current = setTimeout(() => {
        fireSpellCheck(newText);
      }, 1500);
    }

    onProgress(wc, keyStrokesRef.current, newText, spellResultsRef.current);
  }, [fireSpellCheck, onProgress]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta" || e.key === "CapsLock") return;

    const now = performance.now();
    const prevStroke = keyStrokesRef.current[keyStrokesRef.current.length - 1];
    const interKeyDelay = prevStroke?.keyUpTimestamp ? now - prevStroke.keyUpTimestamp : undefined;

    keyStrokesRef.current.push({
      expected: e.key,
      actual: e.key,
      timestamp: now,
      correct: true,
      interKeyDelay,
    });
  }, []);

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const now = performance.now();
    for (let i = keyStrokesRef.current.length - 1; i >= 0; i--) {
      const s = keyStrokesRef.current[i];
      if (s.expected === e.key && !s.keyUpTimestamp) {
        s.keyUpTimestamp = now;
        s.holdDuration = now - s.timestamp;
        break;
      }
    }
  }, []);

  const handleDone = useCallback(async () => {
    clearTimeout(debounceTimerRef.current);

    const currentText = textareaRef.current?.value || text;
    const unchecked = extractWords(currentText).filter((w) => !spellResultsRef.current.has(w.startIndex));

    if (unchecked.length > 0) {
      const words = unchecked.map((w) => w.word);
      const context = currentText;
      const results = await checkSpelling(words, context.slice(0, 500));
      if (results.length > 0) {
        results.forEach((r, i) => {
          if (unchecked[i]) spellResultsRef.current.set(unchecked[i].startIndex, r);
        });
      }
    }

    onComplete(keyStrokesRef.current, currentText, spellResultsRef.current);
  }, [text, onComplete]);

  useEffect(() => {
    setText("");
    setWordCount(0);
    keyStrokesRef.current = [];
    spellResultsRef.current = new Map();
    uncheckedStartRef.current = 0;
    textareaRef.current?.focus();
  }, [topic]);

  const renderOverlay = () => {
    if (!text) return <span className="text-neutral-500 italic">Start typing...</span>;

    const words = extractWords(text);
    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    for (const w of words) {
      if (w.startIndex > lastEnd) {
        parts.push(<span key={`ws-${lastEnd}`}>{text.slice(lastEnd, w.startIndex)}</span>);
      }
      const result = spellResultsRef.current.get(w.startIndex);
      const isMisspelled = result && !result.correct;
      parts.push(
        <span
          key={`w-${w.startIndex}`}
          className={isMisspelled ? "underline decoration-red-500 decoration-2 underline-offset-4" : ""}
          title={isMisspelled && result.suggestion ? `Did you mean: ${result.suggestion}` : undefined}
        >
          {text.slice(w.startIndex, w.endIndex)}
        </span>
      );
      lastEnd = w.endIndex;
    }
    if (lastEnd < text.length) {
      parts.push(<span key={`ws-${lastEnd}`}>{text.slice(lastEnd)}</span>);
    }
    return parts;
  };

  return (
    <div className="space-y-4">
      <div className="relative min-h-[12rem] rounded-xl">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          className="absolute inset-0 w-full h-full p-8 sm:p-12 text-transparent caret-[#00ff88] bg-transparent resize-none outline-none text-3xl sm:text-4xl md:text-5xl leading-[1.8] tracking-wide font-[family-name:var(--font-inter)] z-10"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
          aria-label="Type your response"
          aria-describedby="zen-topic-prompt"
        />
        <div
          className="p-8 sm:p-12 text-3xl sm:text-4xl md:text-5xl leading-[1.8] tracking-wide whitespace-pre-wrap break-words select-none text-center font-[family-name:var(--font-inter)] text-neutral-100 pointer-events-none"
          aria-hidden="true"
          style={{ minHeight: "calc(1.8em * 3)" }}
        >
          {renderOverlay()}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">
          {wordCount} word{wordCount !== 1 ? "s" : ""}{wordCount < 20 ? ` (${20 - wordCount} more to finish)` : ""}
        </span>
        <button
          onClick={handleDone}
          disabled={wordCount < 20}
          className="px-6 py-2.5 text-sm font-semibold text-black bg-[#00ff88] rounded-lg hover:bg-[#00cc6a] active:bg-[#009e54] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Done
        </button>
      </div>
    </div>
  );
});
