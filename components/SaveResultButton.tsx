"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { saveSnapshot } from "@/lib/calculator-history";

interface Props {
  inputs: Record<string, string | number>;
  resultSummary: string;    // e.g. "Re = 45,230 — Turbulent flow"
  disabled?: boolean;
  className?: string;
}

/**
 * Drop this into any calculator's results section.
 * It saves the current inputs + a one-line result summary to history.
 *
 * Usage:
 *   <SaveResultButton
 *     inputs={{ density: 998, velocity: 2.5, diameter: 0.1, viscosity: 0.001 }}
 *     resultSummary={`Re = ${result.reynoldsNumber.toFixed(0)} — ${result.regime}`}
 *     disabled={!result}
 *   />
 */
export function SaveResultButton({ inputs, resultSummary, disabled = false, className = "" }: Props) {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");

  function handleSave() {
    if (disabled || state === "saved") return;
    try {
      saveSnapshot(pathname, inputs, resultSummary);
      setState("saved");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2500);
    }
  }

  const base = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200";

  if (state === "saved") {
    return (
      <span className={`${base} bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 ${className}`}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        Saved to history
      </span>
    );
  }

  if (state === "error") {
    return (
      <span className={`${base} bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 ${className}`}>
        Storage full
      </span>
    );
  }

  return (
    <button
      onClick={handleSave}
      disabled={disabled}
      className={`${base} border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
      </svg>
      Save result
    </button>
  );
}
