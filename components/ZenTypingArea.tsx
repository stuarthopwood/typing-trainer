"use client";

import { useRef, useEffect, useState, useCallback, memo } from "react";
import type { KeyStroke } from "@/lib/types";
import { extractWords, checkSpelling, type SpellCheckResult } from "@/lib/zen";

interface ZenTypingAreaProps {
  topic: string;
  onProgress: (wordCount: number, keyStrokes: KeyStroke[]) => void;
  onComplete: (keyStrokes: KeyStroke[], text: string, spellResults: Map<number, SpellCheckResult>) => void;
}

export default memo(function ZenTypingArea({ topic, onProgress, onComplete }: ZenTypingAreaProps) {
  const [text, setText] = useState("");
  const [spellResults, setSpellResults] = useState<Map<number, SpellCheckResult>>(new Map());
  const [wordCount, setWordCount] = useState(0);
  const keyStrokesRef = useRef<KeyStroke[]>([]);
  const uncheckedWordsRef = useRef<{ word: string; startIndex: number; endIndex: number }[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pendingCheckRef = useRef(false);

  const fireSpellCheck = useCallback(async () => {
    if (pendingCheckRef.current || uncheckedWordsRef.current.length === 0) return;
    pendingCheckRef.current = true;

    const batch = uncheckedWordsRef.current.splice(0, 5);
    const words = batch.map((w) => w.word);
    const context = textareaRef.current?.value.slice(
      Math.max(0, batch[0].startIndex - 30),
      batch[batch.length - 1].endIndex + 30
    ) || words.join(" ");

    const results = await checkSpelling(words, context);
    pendingCheckRef.current = false;

    if (results.length > 0) {
      setSpellResults((prev) => {
        const next = new Map(prev);
        results.forEach((r, i) => {
          if (batch[i]) next.set(batch[i].startIndex, r);
        });
        return next;
      });
    }

    if (uncheckedWordsRef.current.length >= 5) {
      fireSpellCheck();
    }
  }, []);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);

    const words = extractWords(newText);
    const wc = words.length;
    setWordCount(wc);

    const allWords = extractWords(newText);
    const checked = new Set([...spellResults.keys()]);
    uncheckedWordsRef.current = allWords.filter((w) => !checked.has(w.startIndex));

    if (uncheckedWordsRef.current.length >= 5) {
      clearTimeout(debounceTimerRef.current);
      fireSpellCheck();
    } else {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        if (uncheckedWordsRef.current.length > 0) fireSpellCheck();
      }, 1500);
    }

    onProgress(wc, keyStrokesRef.current);
  }, [fireSpellCheck, onProgress, spellResults]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta" || e.key === "CapsLock") return;

    const now = performance.now();
    const prevStroke = keyStrokesRef.current[keyStrokesRef.current.length - 1];
    const interKeyDelay = prevStroke?.keyUpTimestamp ? now - prevStroke.keyUpTimestamp : undefined;

    const stroke: KeyStroke = {
      expected: e.key,
      actual: e.key,
      timestamp: now,
      correct: true,
      interKeyDelay,
    };
    keyStrokesRef.current.push(stroke);
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

    if (uncheckedWordsRef.current.length > 0) {
      const batch = uncheckedWordsRef.current.splice(0);
      const words = batch.map((w) => w.word);
      const context = textareaRef.current?.value || words.join(" ");
      const results = await checkSpelling(words, context);
      if (results.length > 0) {
        const next = new Map(spellResults);
        results.forEach((r, i) => {
          if (batch[i]) next.set(batch[i].startIndex, r);
        });
        setSpellResults(next);
        onComplete(keyStrokesRef.current, text, next);
        return;
      }
    }

    onComplete(keyStrokesRef.current, text, spellResults);
  }, [text, spellResults, onComplete]);

  useEffect(() => {
    setText("");
    setSpellResults(new Map());
    setWordCount(0);
    keyStrokesRef.current = [];
    uncheckedWordsRef.current = [];
    textareaRef.current?.focus();
  }, [topic]);

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.scrollTop = overlayRef.current.scrollHeight;
    }
  }, [text]);

  const renderOverlay = () => {
    if (!text) return <span className="text-neutral-500 italic">Start typing...</span>;

    const words = extractWords(text);
    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    for (const w of words) {
      if (w.startIndex > lastEnd) {
        parts.push(<span key={`ws-${lastEnd}`}>{text.slice(lastEnd, w.startIndex)}</span>);
      }
      const result = spellResults.get(w.startIndex);
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
      <div className="relative h-48 overflow-hidden rounded-xl bg-[#1a1a1a] border border-neutral-800/50">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          className="absolute inset-0 w-full h-full p-6 text-transparent caret-[#00ff88] bg-transparent resize-none outline-none text-2xl sm:text-3xl leading-relaxed font-[family-name:var(--font-inter)] z-10"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
          aria-label={`Free-type your response to: ${topic}`}
        />
        <div
          ref={overlayRef}
          className="absolute inset-0 w-full h-full p-6 text-2xl sm:text-3xl leading-relaxed font-[family-name:var(--font-inter)] text-neutral-100 whitespace-pre-wrap break-words overflow-hidden pointer-events-none"
          aria-hidden="true"
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
          className="px-6 py-2.5 text-sm font-semibold text-black bg-[#00ff88] rounded-lg hover:bg-[#00cc6a] active:bg-[#009e54] transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#00ff88]/60 focus:ring-offset-2 focus:ring-offset-[#0d0d0d]"
        >
          Done
        </button>
      </div>
    </div>
  );
});
