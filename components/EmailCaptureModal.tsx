"use client";

import React, { useState, useEffect, useRef } from "react";
import type { EmailCaptureState } from "@/hooks/useEmailCapture";

interface Props {
  capture:     EmailCaptureState;
  toolName?:   string; // e.g. "Pipe Wall Thickness design report"
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function EmailCaptureModal({ capture, toolName }: Props) {
  const [email,      setEmail]      = useState("");
  const [consent,    setConsent]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input and pre-fill saved email on open
  useEffect(() => {
    if (!capture.isOpen) return;
    setError("");
    try {
      const raw = localStorage.getItem("fm-email-captured");
      if (raw) {
        const { email: saved } = JSON.parse(raw) as { email: string };
        if (saved && saved !== "skip") setEmail(saved);
      }
    } catch {}
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [capture.isOpen]);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") capture.close(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [capture]);

  if (!capture.isOpen) return null;

  const hasEmail    = email.trim().length > 0;
  const emailValid  = isValidEmail(email.trim());
  const canSubmit   = !hasEmail || (emailValid && consent);

  async function handleDownload(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await capture.handleSubmit(email.trim());
    } catch {
      setError("Something went wrong. Your download will proceed.");
      capture.handleSkip();
    } finally {
      setSubmitting(false);
      setEmail("");
      setConsent(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) capture.close(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Download your report"
    >
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">📄</span>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Download your report
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {toolName
                ? `Your ${toolName} is ready.`
                : "Your calculation report is ready."}
            </p>
          </div>
          <button
            onClick={capture.close}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 mt-0.5"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Value proposition */}
        <div className="mx-6 mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl px-4 py-3">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Optional:</strong> Enter your email to get notified when we add new calculators
            and design tools — especially the mining and process engineering tools coming next.
          </p>
        </div>

        <form onSubmit={handleDownload} className="px-6 pb-6 space-y-4">

          {/* Email field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Work email{" "}
              <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              ref={inputRef}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@company.com"
              autoComplete="email"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
            {hasEmail && !emailValid && (
              <p className="text-xs text-red-500 mt-1">Please enter a valid email address.</p>
            )}
          </div>

          {/* Consent — only when email is entered */}
          {hasEmail && emailValid && (
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                className="mt-0.5 flex-shrink-0 accent-yellow-500"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                I agree to the{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  className="underline text-blue-600 dark:text-blue-400"
                >
                  Privacy Policy
                </a>{" "}
                and consent to receiving occasional emails about new tools from Fluids Pad.
                Unsubscribe any time.
              </span>
            </label>
          )}

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {submitting
                ? "Downloading…"
                : hasEmail && emailValid && consent
                  ? "Download & Subscribe"
                  : "Download PDF"}
            </button>

            <button
              type="button"
              onClick={capture.handleSkip}
              className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Skip — just download
            </button>
          </div>

          <p className="text-[11px] text-center text-gray-400 dark:text-gray-500">
            We never share your email. Governed by POPIA (South Africa).
          </p>
        </form>
      </div>
    </div>
  );
}
