"use client";

import React, { useState, useEffect } from "react";

export const CONSENT_KEY   = "fm-cookie-consent";
export const CONSENT_EVENT = "fm-cookie-consent-changed";

export type ConsentValue = "accepted" | "declined" | null;

export function getStoredConsent(): ConsentValue {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(CONSENT_KEY);
  if (v === "accepted" || v === "declined") return v;
  return null;
}

function setStoredConsent(v: ConsentValue) {
  if (typeof window === "undefined" || !v) return;
  localStorage.setItem(CONSENT_KEY, v);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: v }));
}

export function CookieConsent() {
  const [visible,  setVisible]  = useState(false);
  const [leaving,  setLeaving]  = useState(false);

  useEffect(() => {
    // Only show if no decision has been made yet
    if (!getStoredConsent()) {
      // Small delay so the page content renders first
      const id = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(id);
    }
  }, []);

  function dismiss(value: "accepted" | "declined") {
    setLeaving(true);
    setStoredConsent(value);
    setTimeout(() => setVisible(false), 300);
  }

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${
        leaving ? "translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="bg-gray-900 dark:bg-gray-950 border-t border-gray-700 dark:border-gray-800 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Message */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-300 leading-relaxed">
              We use{" "}
              <strong className="text-white">Google Analytics</strong> to understand which
              calculators engineers find most useful — anonymous usage data only, no personal
              tracking. Your calculation inputs stay on your device.{" "}
              <a
                href="/privacy"
                className="text-yellow-400 hover:text-yellow-300 underline underline-offset-2 transition-colors"
              >
                Privacy Policy
              </a>
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => dismiss("declined")}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400 rounded-lg transition-colors"
            >
              Decline analytics
            </button>
            <button
              onClick={() => dismiss("accepted")}
              className="px-4 py-2 text-sm font-semibold bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-lg transition-colors"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
