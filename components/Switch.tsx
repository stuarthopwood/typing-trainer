"use client";

import { memo } from "react";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  labelLeft: string;
  labelRight: string;
  ariaLabel: string;
}

export default memo(function Switch({ checked, onChange, labelLeft, labelRight, ariaLabel }: SwitchProps) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
      <span className={`text-xs ${!checked ? "text-neutral-100 font-medium" : "text-neutral-400"}`}>
        {labelLeft}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-5 w-10 items-center rounded-full bg-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00ff88]/60 focus:ring-offset-2 focus:ring-offset-[#0d0d0d] data-[checked=true]:bg-[#00ff88]/40"
        data-checked={checked}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-neutral-100 shadow-md transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className={`text-xs ${checked ? "text-neutral-100 font-medium" : "text-neutral-400"}`}>
        {labelRight}
      </span>
    </label>
  );
});
