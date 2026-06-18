export interface HistoryEntry {
  id:             string;
  timestamp:      string;   // ISO-8601
  calculatorName: string;
  href:           string;
  category:       string;
  level?:         string;
  inputs?:        Record<string, string | number>;
  resultSummary?: string;
}

export const HISTORY_KEY = "fmc_calc_history";
export const MAX_HISTORY = 300;

// ── Storage diagnostics ───────────────────────────────────────────────────────

export function getStorageInfo(): { usedKB: number; pct: number } {
  if (typeof window === "undefined") return { usedKB: 0, pct: 0 };
  try {
    let bytes = 0;
    for (const k in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, k)) {
        bytes += (localStorage[k].length + k.length) * 2; // UTF-16
      }
    }
    const quota = 5 * 1024 * 1024; // conservative 5 MB estimate
    return { usedKB: Math.round(bytes / 1024), pct: Math.min(100, Math.round((bytes / quota) * 100)) };
  } catch { return { usedKB: 0, pct: 0 }; }
}

// ── Safe write — catches QuotaExceededError explicitly ────────────────────────

type WriteResult = "ok" | "quota" | "error";

function tryWrite(data: string): WriteResult {
  try {
    localStorage.setItem(HISTORY_KEY, data);
    return "ok";
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" ||
       err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
       err.code === 22)
    ) return "quota";
    return "error";
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch { return []; }
}

export function logVisit(
  entry: Pick<HistoryEntry, "calculatorName" | "href" | "category" | "level">
): void {
  if (typeof window === "undefined") return;
  try {
    const history = getHistory();

    // Deduplicate consecutive visits — just refresh the timestamp
    if (history.length > 0 && history[0].href === entry.href) {
      history[0].timestamp = new Date().toISOString();
      tryWrite(JSON.stringify(history));
      return;
    }

    const newEntry: HistoryEntry = {
      id:        Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    let updated = [newEntry, ...history].slice(0, MAX_HISTORY);
    let result  = tryWrite(JSON.stringify(updated));

    if (result === "quota") {
      // Trim to half and retry
      updated = updated.slice(0, Math.floor(updated.length / 2));
      result  = tryWrite(JSON.stringify(updated));
    }

    if (result !== "ok") {
      // Still failing — warn the UI via a custom event
      window.dispatchEvent(new CustomEvent("fmc_storage_quota"));
    }
  } catch { /* never crash the page */ }
}

// ── Snapshot — attach inputs + result summary to the most-recent entry ────────

export function saveSnapshot(
  href: string,
  inputs: Record<string, string | number>,
  resultSummary: string
): void {
  if (typeof window === "undefined") return;
  try {
    const history = getHistory();
    const idx = history.findIndex((e) => e.href === href);
    if (idx === -1) return; // calculator must have been visited first
    history[idx] = { ...history[idx], inputs, resultSummary };
    if (tryWrite(JSON.stringify(history)) === "ok") {
      // Notify history page in other tabs
      window.dispatchEvent(new StorageEvent("storage", { key: HISTORY_KEY }));
    }
  } catch { /* ignore */ }
}

// ── Delete / clear ────────────────────────────────────────────────────────────

export function removeEntry(id: string): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const updated = getHistory().filter((e) => e.id !== id);
    tryWrite(JSON.stringify(updated));
    return updated;
  } catch { return []; }
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
}
