"use client";

import { memo, useEffect, useRef, useState } from "react";

interface UndoToastProps {
  message: string;
  duration?: number;
  onUndo: () => void;
  onExpire: () => void;
}

export default memo(function UndoToast({ message, duration = 5000, onUndo, onExpire }: UndoToastProps) {
  const [remaining, setRemaining] = useState(duration);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;
  const startRef = useRef(Date.now());

  useEffect(() => {
    const timer = setTimeout(() => expireRef.current(), duration);
    const interval = setInterval(() => {
      setRemaining(Math.max(0, duration - (Date.now() - startRef.current)));
    }, 200);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [duration]);

  const seconds = Math.ceil(remaining / 1000);

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="text-sm text-neutral-200 flex-1">{message}</span>
      <span className="text-xs text-neutral-400 tabular-nums w-6 text-center">{seconds}s</span>
      <button
        onClick={onUndo}
        className="px-3 py-1.5 text-sm font-medium text-[#00ff88] bg-[#00ff88]/10 rounded-md hover:bg-[#00ff88]/20 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00ff88]/60 focus:ring-offset-2 focus:ring-offset-neutral-800"
      >
        Undo
      </button>
    </div>
  );
});
