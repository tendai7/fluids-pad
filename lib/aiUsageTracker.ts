// Daily AI usage tracker — localStorage only, resets at midnight.
// No auth, no database. Stops casual over-use; server handles scripted abuse.

const DATE_KEY      = "fm-ai-date";
const PRACTICE_KEY  = "fm-ai-practice-count";
const ASSISTANT_KEY = "fm-ai-assistant-count";

export const DAILY_LIMITS = {
  practice:  20,
  assistant: 25,
} as const;

export type AiFeature = keyof typeof DAILY_LIMITS;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function ensureToday(): void {
  const stored = localStorage.getItem(DATE_KEY);
  if (stored !== todayStr()) {
    localStorage.setItem(DATE_KEY, todayStr());
    localStorage.setItem(PRACTICE_KEY, "0");
    localStorage.setItem(ASSISTANT_KEY, "0");
  }
}

function rawCount(key: string): number {
  return Math.max(0, parseInt(localStorage.getItem(key) || "0", 10));
}

export interface UsageInfo {
  used: number;
  limit: number;
  remaining: number;
  canUse: boolean;
  pct: number; // 0–100 for progress bar
}

export function getUsage(feature: AiFeature): UsageInfo {
  if (typeof window === "undefined") {
    const limit = DAILY_LIMITS[feature];
    return { used: 0, limit, remaining: limit, canUse: true, pct: 0 };
  }
  ensureToday();
  const key     = feature === "practice" ? PRACTICE_KEY : ASSISTANT_KEY;
  const used    = rawCount(key);
  const limit   = DAILY_LIMITS[feature];
  const remaining = Math.max(0, limit - used);
  return {
    used,
    limit,
    remaining,
    canUse: used < limit,
    pct: Math.min(100, Math.round((used / limit) * 100)),
  };
}

export function recordUsage(feature: AiFeature): void {
  if (typeof window === "undefined") return;
  ensureToday();
  const key   = feature === "practice" ? PRACTICE_KEY : ASSISTANT_KEY;
  const count = rawCount(key);
  localStorage.setItem(key, String(count + 1));
}
