"use client";

import React, { useState, useEffect, useRef } from "react";

// ── Config ────────────────────────────────────────────────────────────────────
// Set NEXT_PUBLIC_FORMSPREE_ID in .env.local to activate submissions.
// Get a free form ID at formspree.io (takes 2 minutes, free up to 50/month).
const FORMSPREE_ID = process.env.NEXT_PUBLIC_FORMSPREE_ID;

// ── Types ─────────────────────────────────────────────────────────────────────
type Category = "bug" | "wrong-result" | "suggestion" | "other";

const CATS: { value: Category; label: string; icon: string }[] = [
  { value: "bug",          label: "Bug",          icon: "🐛" },
  { value: "wrong-result", label: "Wrong result", icon: "⚠️" },
  { value: "suggestion",   label: "Suggestion",   icon: "💡" },
  { value: "other",        label: "Other",        icon: "💬" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// ── Component ─────────────────────────────────────────────────────────────────
export function FeedbackWidget() {
  const [open,       setOpen]       = useState(false);
  const [category,   setCategory]   = useState<Category>("suggestion");
  const [message,    setMessage]    = useState("");
  const [email,      setEmail]      = useState("");
  const [consent,    setConsent]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState("");
  const [page,       setPage]       = useState("");
  const panelRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Capture page path on open
  useEffect(() => {
    if (open) {
      setPage(window.location.pathname);
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    // small delay so the open-button click doesn't immediately close
    const id = setTimeout(() => document.addEventListener("mousedown", handler), 100);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", handler); };
  }, [open]);

  function reset() {
    setMessage(""); setEmail(""); setConsent(false);
    setError(""); setSubmitted(false); setCategory("suggestion");
  }

  function handleClose() { setOpen(false); if (submitted) reset(); }

  const emailRequired = email.trim().length > 0;
  const canSubmit =
    message.trim().length >= 10 &&
    (!emailRequired || isValidEmail(email)) &&
    (!emailRequired || consent);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError("");

    const payload = {
      category,
      message: message.trim(),
      email: email.trim() || "not provided",
      page,
      _subject: `[Fluids Pad] ${CATS.find(c => c.value === category)?.label} — ${page}`,
    };

    try {
      if (!FORMSPREE_ID) throw new Error("FORMSPREE_NOT_CONFIGURED");

      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Submission failed");
      }

      setSubmitted(true);
      setTimeout(() => { setOpen(false); reset(); }, 3500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg === "FORMSPREE_NOT_CONFIGURED") {
        setError(
          "Feedback form not yet configured. Please email your feedback to info@fluidspad.com"
        );
      } else {
        setError("Something went wrong. Please try again or email info@fluidspad.com");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* ── Floating trigger button ──────────────────────────────────────── */}
      <button
        onClick={() => { setOpen(o => !o); if (submitted) reset(); }}
        aria-label="Give feedback"
        aria-expanded={open}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-semibold transition-all duration-200 ${
          open
            ? "bg-gray-700 dark:bg-gray-600 text-white"
            : "bg-yellow-500 hover:bg-yellow-400 text-gray-900"
        }`}
      >
        {open ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        )}
        Feedback
      </button>

      {/* ── Panel ────────────────────────────────────────────────────────── */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Feedback form"
          className="fixed bottom-20 right-6 z-50 w-80 max-w-[calc(100vw-3rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
          style={{ maxHeight: "calc(100vh - 6rem)" }}
        >
          {/* Header */}
          <div className="px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Share feedback</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Found a bug? Wrong result? Have a suggestion?
            </p>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {submitted ? (
              /* Success state */
              <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-base font-bold text-gray-900 dark:text-white">Thank you!</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Your feedback has been received. We read every submission.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">

                {/* Category */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Category</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CATS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCategory(c.value)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          category === c.value
                            ? "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-300"
                            : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        <span>{c.icon}</span>{c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Page (read-only) */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Page</p>
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/60 rounded-lg px-3 py-1.5 truncate">
                    {page || "…"}
                  </p>
                </div>

                {/* Message */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Describe the issue or suggestion…"
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                  <p className={`text-[10px] mt-0.5 text-right ${message.trim().length < 10 && message.length > 0 ? "text-red-400" : "text-gray-400"}`}>
                    {message.trim().length}/10 min
                  </p>
                </div>

                {/* Email (optional) */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">
                    Email <span className="text-gray-400 font-normal">(optional — for follow-up)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>

                {/* Consent — only shown when email is entered */}
                {emailRequired && (
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={e => setConsent(e.target.checked)}
                      className="mt-0.5 flex-shrink-0 accent-yellow-500"
                    />
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                      I agree to the{" "}
                      <a href="/privacy" target="_blank" className="underline text-blue-600 dark:text-blue-400">
                        Privacy Policy
                      </a>{" "}
                      and consent to being contacted about my feedback.
                    </span>
                  </label>
                )}

                {/* Error */}
                {error && (
                  <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!canSubmit || submitting}
                  className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-semibold rounded-lg text-sm transition-colors"
                >
                  {submitting ? "Sending…" : "Send feedback"}
                </button>

                <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
                  Feedback is read by the developer. We read every message.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
