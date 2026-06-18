"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY  = "fm-email-captured";
const SKIP_DAYS    = 7; // days before showing the modal again

export interface EmailCaptureState {
  isOpen:       boolean;
  trigger:      (downloadFn: () => void) => void;
  handleSubmit: (email: string) => Promise<void>;
  handleSkip:   () => void;
  close:        () => void;
}

export function useEmailCapture(): EmailCaptureState {
  const [isOpen,     setIsOpen]     = useState(false);
  const [pendingFn,  setPendingFn]  = useState<(() => void) | null>(null);

  function alreadyCaptured(): boolean {
    if (typeof window === "undefined") return false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const { date } = JSON.parse(raw) as { date: string };
      const age = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
      return age < SKIP_DAYS;
    } catch { return false; }
  }

  const trigger = useCallback((downloadFn: () => void) => {
    if (alreadyCaptured()) {
      // Email already given recently — skip modal and download directly
      downloadFn();
      return;
    }
    setPendingFn(() => downloadFn);
    setIsOpen(true);
  }, []);

  const handleSubmit = useCallback(async (email: string) => {
    // Persist locally so modal doesn't reappear for 7 days
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ email, date: new Date().toISOString().slice(0, 10) })
      );
    } catch {}

    // Send to backend — fire and forget, never block the download
    fetch("/api/capture-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "pdf-download", tags: ["pdf-download"] }),
    }).catch(() => {});

    // Trigger the actual download
    pendingFn?.();
    setIsOpen(false);
    setPendingFn(null);
  }, [pendingFn]);

  const handleSkip = useCallback(() => {
    pendingFn?.();
    setIsOpen(false);
    setPendingFn(null);
  }, [pendingFn]);

  const close = useCallback(() => {
    setIsOpen(false);
    setPendingFn(null);
  }, []);

  return { isOpen, trigger, handleSubmit, handleSkip, close };
}
