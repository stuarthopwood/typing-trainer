"use client";

import { useRef, useEffect, useState, useCallback, useMemo, memo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import type { KeyStroke } from "@/lib/types";
import { extractWords, checkSpelling, type SpellCheckResult } from "@/lib/zen";

interface ZenTypingAreaProps {
  topic: string;
  onProgress: (wordCount: number, keyStrokes: KeyStroke[], text: string, spellResults: Map<number, SpellCheckResult>) => void;
  onComplete: (keyStrokes: KeyStroke[], text: string, spellResults: Map<number, SpellCheckResult>) => void;
}

export default memo(function ZenTypingArea({ topic, onProgress, onComplete }: ZenTypingAreaProps) {
  const [text, setText] = useState("");
  const [spellVersion, setSpellVersion] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const keyStrokesRef = useRef<KeyStroke[]>([]);
  const spellResultsRef = useRef<Map<number, SpellCheckResult>>(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout>(undefined);
  const pendingCheckRef = useRef(false);
  const checkedIndicesRef = useRef<Set<number>>(new Set());
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  const wordCount = useMemo(() => extractWords(text).length, [text]);

  const fireSpellCheck = useCallback(async (currentText: string) => {
    if (pendingCheckRef.current) return;

    const allWords = extractWords(currentText);
    const unchecked = allWords.filter((w) => !checkedIndicesRef.current.has(w.startIndex));
    if (unchecked.length === 0) return;

    pendingCheckRef.current = true;
    const batch = unchecked.slice(0, 5);
    const words = batch.map((w) => w.word);
    const contextStart = Math.max(0, batch[0].startIndex - 30);
    const contextEnd = Math.min(currentText.length, batch[batch.length - 1].endIndex + 30);
    const context = currentText.slice(contextStart, contextEnd);

    const results = await checkSpelling(words, context);
    pendingCheckRef.current = false;

    for (let i = 0; i < batch.length; i++) {
      checkedIndicesRef.current.add(batch[i].startIndex);
      if (results[i]) {
        spellResultsRef.current.set(batch[i].startIndex, results[i]);
      }
    }

    setSpellVersion((n) => n + 1);
  }, []);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);

    clearTimeout(debounceTimerRef.current);

    const allWords = extractWords(newText);
    const uncheckedCount = allWords.filter((w) => !checkedIndicesRef.current.has(w.startIndex)).length;

    if (uncheckedCount >= 5) {
      fireSpellCheck(newText);
    } else if (uncheckedCount > 0) {
      debounceTimerRef.current = setTimeout(() => {
        fireSpellCheck(newText);
      }, 1500);
    }
  }, [fireSpellCheck]);

  // Throttled progress reporting — every 500ms, not every keystroke
  const progressIntervalRef = useRef<NodeJS.Timeout>(undefined);
  useEffect(() => {
    if (text.length === 0) return;
    clearTimeout(progressIntervalRef.current);
    progressIntervalRef.current = setTimeout(() => {
      onProgressRef.current(wordCount, keyStrokesRef.current, text, new Map(spellResultsRef.current));
    }, 500);
    return () => clearTimeout(progressIntervalRef.current);
  }, [text, wordCount, spellVersion]);

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
    clearTimeout(progressIntervalRef.current);

    const currentText = textareaRef.current?.value || "";
    const allWords = extractWords(currentText);
    const unchecked = allWords.filter((w) => !checkedIndicesRef.current.has(w.startIndex));

    if (unchecked.length > 0) {
      const words = unchecked.map((w) => w.word);
      const context = currentText.slice(0, 500);
      const results = await checkSpelling(words, context);
      for (let i = 0; i < unchecked.length; i++) {
        checkedIndicesRef.current.add(unchecked[i].startIndex);
        if (results[i]) {
          spellResultsRef.current.set(unchecked[i].startIndex, results[i]);
        }
      }
    }

    onComplete(keyStrokesRef.current, currentText, new Map(spellResultsRef.current));
  }, [onComplete]);

  useEffect(() => {
    setText("");
    keyStrokesRef.current = [];
    spellResultsRef.current = new Map();
    checkedIndicesRef.current = new Set();
    setSpellVersion(0);
    textareaRef.current?.focus();
  }, [topic]);

  const overlayContent = useMemo(() => {
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
          className={isMisspelled ? "underline decoration-wavy decoration-red-500 decoration-2 underline-offset-4" : ""}
          title={isMisspelled && result.suggestion ? `Did you mean: ${result.suggestion}` : undefined}
        >
          {text.slice(w.startIndex, w.endIndex)}
          {isMisspelled && <span className="text-red-400 text-sm align-super ml-0.5" aria-hidden="true">*</span>}
        </span>
      );
      lastEnd = w.endIndex;
    }
    if (lastEnd < text.length) {
      parts.push(<span key={`ws-${lastEnd}`}>{text.slice(lastEnd)}</span>);
    }
    return parts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, spellVersion]);

  return (
    <div className="space-y-4">
      <div className="relative min-h-[12rem]">
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
          className="p-8 sm:p-12 text-3xl sm:text-4xl md:text-5xl leading-[1.8] tracking-wide whitespace-pre-wrap break-words select-none font-[family-name:var(--font-inter)] text-[#00ff88]/90 pointer-events-none"
          aria-hidden="true"
          style={{ minHeight: "calc(1.8em * 3)" }}
        >
          {overlayContent}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <span className="text-xs text-neutral-400">
          {wordCount} word{wordCount !== 1 ? "s" : ""}{wordCount < 20 ? ` — ${20 - wordCount} more to finish` : ""}
        </span>
        <button
          onClick={handleDone}
          disabled={wordCount < 20}
          className="px-8 py-3 text-base font-semibold text-black bg-[#00ff88] rounded-xl hover:bg-[#00cc6a] active:bg-[#009e54] transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(0,255,136,0.3)] hover:shadow-[0_0_20px_rgba(0,255,136,0.5)] flex items-center gap-2"
          aria-label={wordCount < 20 ? `Finish typing (${20 - wordCount} more words needed)` : "Finish typing and submit"}
        >
          <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
          Done
        </button>
      </div>
    </div>
  );
});
