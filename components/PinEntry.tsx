"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";

interface PinEntryProps {
  onSubmit: (pin: string) => void;
}

export default function PinEntry({ onSubmit }: PinEntryProps) {
  const [pin, setPin] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) {
      onSubmit(pin);
    }
  };

  return (
    <main className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
      <form onSubmit={handleSubmit} className="text-center space-y-6">
        <div className="space-y-2">
          <FontAwesomeIcon icon={faLock} className="w-8 h-8 text-[#00ff88]/60" />
          <h1 className="text-2xl font-bold text-neutral-200">NeuralKeys</h1>
          <p className="text-sm text-neutral-500">Enter your PIN to continue</p>
        </div>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="••••••"
          aria-label="PIN code"
          className="w-56 px-4 py-3 text-center text-2xl tracking-[0.5em] bg-[#141414] border border-neutral-700 rounded-xl text-neutral-200 placeholder:tracking-[0.3em] placeholder:text-neutral-600 focus:border-[#00ff88]/50 focus:outline-none"
          autoFocus
        />
        <p className="text-xs text-neutral-600">4–6 digits</p>
        <div>
          <button
            type="submit"
            disabled={pin.length < 4}
            className="px-8 py-3 text-base font-semibold text-black bg-[#00ff88] rounded-xl hover:bg-[#00cc6a] active:bg-[#009e54] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Enter
          </button>
        </div>
        <p className="text-xs text-neutral-600">Same PIN = same progress, any device</p>
      </form>
    </main>
  );
}
