"use client";

import { useState, memo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faClipboard, faTrash } from "@fortawesome/free-solid-svg-icons";
import { validateCustomText, getCustomPresets, saveCustomPreset, deleteCustomPreset, SUGGESTED_PRESETS, type CustomTextPreset } from "@/lib/custom-text";
import GlowBorder from "./GlowBorder";

interface CustomTextInputProps {
  onStart: (text: string) => void;
}

export default memo(function CustomTextInput({ onStart }: CustomTextInputProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [presets, setPresets] = useState(() => getCustomPresets());
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);

  const validation = validateCustomText(input);

  const handleStart = () => {
    if (!validation.valid) {
      setError(validation.error || "Invalid text");
      return;
    }
    setError(null);
    onStart(validation.cleaned);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
      setError(null);
    } catch {
      setError("Clipboard access denied");
    }
  };

  const handleSave = () => {
    if (!saveName.trim() || !validation.valid) return;
    saveCustomPreset(saveName.trim(), validation.cleaned);
    setPresets(getCustomPresets());
    setSaveName("");
    setShowSave(false);
  };

  const handleDelete = (id: string) => {
    deleteCustomPreset(id);
    setPresets(getCustomPresets());
  };

  const handleLoadPreset = (text: string) => {
    setInput(text);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(null); }}
          placeholder="Paste or type your custom text here (20-5000 characters)..."
          className="w-full h-40 p-4 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-200 text-sm resize-none outline-none focus:border-[#00ff88]/50 focus:ring-1 focus:ring-[#00ff88]/30 placeholder:text-neutral-600 font-[family-name:var(--font-typing)]"
          spellCheck={false}
        />
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={handlePaste}
            className="p-2 text-neutral-400 hover:text-[#00ff88] transition-colors"
            title="Paste from clipboard"
            aria-label="Paste from clipboard"
          >
            <FontAwesomeIcon icon={faClipboard} className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-xs ${validation.valid ? "text-[#00ff88]" : input.length > 0 ? "text-red-400" : "text-neutral-500"}`}>
            {input.length > 0 ? `${validation.cleaned.length} chars` : "0 chars"}
          </span>
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
        <div className="flex items-center gap-2">
          {validation.valid && (
            <button
              onClick={() => setShowSave(!showSave)}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              {showSave ? "Cancel" : "Save as preset"}
            </button>
          )}
          <GlowBorder radius="0.5rem" intensity="subtle">
            <button
              onClick={handleStart}
              disabled={!validation.valid}
              className="px-5 py-2 text-sm font-medium text-black bg-[#00ff88] rounded-lg hover:bg-[#00cc6a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faPlay} className="w-3 h-3" />
              Start
            </button>
          </GlowBorder>
        </div>
      </div>

      {showSave && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Preset name..."
            className="flex-1 px-3 py-1.5 text-sm bg-neutral-800/50 border border-neutral-700/50 rounded-lg text-neutral-200 outline-none focus:border-[#00ff88]/50"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <button onClick={handleSave} className="px-3 py-1.5 text-xs text-[#00ff88] hover:text-white transition-colors">Save</button>
        </div>
      )}

      {(presets.length > 0 || SUGGESTED_PRESETS.length > 0) && (
        <div className="space-y-2">
          <p className="text-xs text-neutral-500">Presets</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => handleLoadPreset(p.text)}
                className="px-3 py-1.5 text-xs rounded-lg bg-neutral-800/50 border border-neutral-700/30 text-neutral-300 hover:text-[#00ff88] hover:border-[#00ff88]/30 transition-colors"
              >
                {p.name}
              </button>
            ))}
            {presets.map((p) => (
              <div key={p.id} className="flex items-center gap-1">
                <button
                  onClick={() => handleLoadPreset(p.text)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-cyan-900/20 border border-cyan-700/30 text-cyan-300 hover:text-white transition-colors"
                >
                  {p.name}
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="p-1 text-neutral-600 hover:text-red-400 transition-colors"
                  aria-label={`Delete preset: ${p.name}`}
                >
                  <FontAwesomeIcon icon={faTrash} className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
