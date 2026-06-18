"use client";

import React, { useState } from "react";

type State = "idle" | "submitting" | "success" | "error";

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function FooterEmailSignup({ dark = false }: { dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");

  const emailOk = isValidEmail(email.trim());
  const canSubmit = emailOk && state !== "submitting";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setState("submitting");
    try {
      const res = await fetch("/api/capture-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "newsletter-footer", tags: ["newsletter"] }),
      });
      setState(res.ok ? "success" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <p className={`text-[11px] flex items-center gap-1.5 ${dark ? "text-sky-300" : "text-green-600 dark:text-green-400"}`}>
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
        </svg>
        You&apos;re on the list.
      </p>
    );
  }

  const inputCls = dark
    ? "flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded bg-white/10 border border-white/20 text-white placeholder-sky-300/40 focus:outline-none focus:ring-1 focus:ring-sky-400"
    : "flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-500";

  const btnCls = dark
    ? "px-2.5 py-1 text-[11px] font-semibold bg-sky-400 hover:bg-sky-300 disabled:opacity-50 disabled:cursor-not-allowed text-sky-900 rounded transition-colors whitespace-nowrap"
    : "px-2.5 py-1 text-[11px] font-semibold bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 rounded transition-colors whitespace-nowrap";

  const noteCls = dark ? "text-[9px] text-sky-300/40" : "text-[9px] text-gray-400 dark:text-gray-500";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex gap-1">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          autoComplete="email"
          className={inputCls}
        />
        <button type="submit" disabled={!canSubmit} className={btnCls}>
          {state === "submitting" ? "…" : "Join"}
        </button>
      </div>
      <p className={noteCls}>
        New tools regularly.{" "}
        <a href="/privacy" className={dark ? "underline hover:text-sky-300" : "underline hover:text-blue-500"}>
          Privacy policy
        </a>.
      </p>
      {state === "error" && (
        <p className={`text-[9px] ${dark ? "text-rose-400" : "text-red-500"}`}>
          Something went wrong — email info@fluidspad.com.
        </p>
      )}
    </form>
  );
}
