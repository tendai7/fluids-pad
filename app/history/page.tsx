"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { calculatorCategories } from "@/lib/calculator-data";
import {
  HistoryEntry,
  getHistory,
  removeEntry,
  clearHistory,
  getStorageInfo,
  HISTORY_KEY,
} from "@/lib/calculator-history";

// ─── Category colours ─────────────────────────────────────────────────────────
const CAT: Record<string, { bar: string; badge: string; text: string; dot: string }> = {
  "fluid-mechanics-i":  { bar: "bg-blue-500",   badge: "bg-blue-50 dark:bg-blue-900/30",   text: "text-blue-700 dark:text-blue-300",   dot: "bg-blue-500"   },
  "fluid-mechanics-ii": { bar: "bg-emerald-500", badge: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  "heat-mass-transfer": { bar: "bg-orange-500", badge: "bg-orange-50 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  "open-channel":       { bar: "bg-teal-500",   badge: "bg-teal-50 dark:bg-teal-900/30",   text: "text-teal-700 dark:text-teal-300",   dot: "bg-teal-500"   },
  "compressible-flow":  { bar: "bg-rose-500",   badge: "bg-rose-50 dark:bg-rose-900/30",   text: "text-rose-700 dark:text-rose-300",   dot: "bg-rose-500"   },
  "turbomachinery":     { bar: "bg-indigo-500", badge: "bg-indigo-50 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500" },
  "pipe-networks":      { bar: "bg-cyan-500",   badge: "bg-cyan-50 dark:bg-cyan-900/30",   text: "text-cyan-700 dark:text-cyan-300",   dot: "bg-cyan-500"   },
};
const DEFAULT_CAT = { bar: "bg-gray-400", badge: "bg-gray-100 dark:bg-gray-700", text: "text-gray-600 dark:text-gray-400", dot: "bg-gray-400" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function catName(id: string) {
  return calculatorCategories.find((c) => c.id === id)?.name ?? id;
}

function formatTime(iso: string) {
  const d    = new Date(iso);
  const now  = new Date();
  const diffH = (now.getTime() - d.getTime()) / 3_600_000;
  if (diffH < 1)   return `${Math.max(1, Math.round(diffH * 60))} min ago`;
  if (diffH < 2)   return "1 hour ago";
  if (diffH < 24)  return d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
  if (diffH < 48)  return `Yesterday ${d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}`;
  if (diffH < 168) return `${d.toLocaleDateString("en-ZA", { weekday: "short" })} ${d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

interface Group { label: string; entries: HistoryEntry[] }

function groupByDate(entries: HistoryEntry[]): Group[] {
  const now       = new Date();
  const startOf   = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today     = startOf(now);
  const yesterday = new Date(today.getTime() - 86_400_000);
  const weekAgo   = new Date(today.getTime() - 7  * 86_400_000);
  const monthAgo  = new Date(today.getTime() - 30 * 86_400_000);
  const buckets: Record<string, HistoryEntry[]> = {
    "Today": [], "Yesterday": [], "This week": [], "This month": [], "Earlier": [],
  };
  for (const e of entries) {
    const day = startOf(new Date(e.timestamp));
    if      (day >= today)     buckets["Today"].push(e);
    else if (day >= yesterday) buckets["Yesterday"].push(e);
    else if (day >= weekAgo)   buckets["This week"].push(e);
    else if (day >= monthAgo)  buckets["This month"].push(e);
    else                       buckets["Earlier"].push(e);
  }
  return Object.entries(buckets).filter(([, v]) => v.length > 0).map(([label, entries]) => ({ label, entries }));
}

// ─── Entry card ───────────────────────────────────────────────────────────────
function EntryCard({ entry, onDelete }: { entry: HistoryEntry; onDelete: () => void }) {
  const c = CAT[entry.category] ?? DEFAULT_CAT;
  const inputCount = entry.inputs ? Object.keys(entry.inputs).length : 0;

  return (
    <div className="group flex items-stretch bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200">
      {/* Colour bar */}
      <div className={`w-1 flex-shrink-0 ${c.bar}`} />

      <div className="flex-1 min-w-0 px-4 py-3">
        <div className="flex items-start gap-3">
          {/* Category badge */}
          <span className={`hidden sm:inline-flex mt-0.5 flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${c.badge} ${c.text}`}>
            {catName(entry.category).split(" ").slice(0, 2).join(" ")}
          </span>

          {/* Name + result */}
          <div className="flex-1 min-w-0">
            <Link
              href={entry.href}
              className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors block truncate"
            >
              {entry.calculatorName}
            </Link>
            {entry.resultSummary && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                <span className="text-amber-600 dark:text-amber-400 font-medium">→ </span>
                {entry.resultSummary}
              </p>
            )}
            {!entry.resultSummary && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {catName(entry.category)}{entry.level && ` · ${entry.level}`}
              </p>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
            {inputCount > 0 && (
              <span className="hidden lg:inline text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                {inputCount} inputs saved
              </span>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500 hidden md:block whitespace-nowrap">
              {formatTime(entry.timestamp)}
            </span>
            <Link
              href={entry.href}
              className="flex items-center gap-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
            >
              Open
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <button
              onClick={(e) => { e.preventDefault(); onDelete(); }}
              className="w-6 h-6 flex items-center justify-center rounded text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all text-lg leading-none"
              title="Remove"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Storage bar ─────────────────────────────────────────────────────────────
function StorageBar({ pct, usedKB }: { pct: number; usedKB: number }) {
  const color = pct >= 80 ? "bg-red-500" : pct >= 60 ? "bg-amber-400" : "bg-sky-400";
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-sky-300/60">Storage used</span>
        <span className="text-[11px] text-sky-300/60">{pct}%</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      {pct >= 80 && (
        <p className="text-[10px] text-amber-400 mt-1">Storage nearly full — older entries may be trimmed automatically.</p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const [history,      setHistory]      = useState<HistoryEntry[]>([]);
  const [search,       setSearch]       = useState("");
  const [catFilter,    setCatFilter]    = useState("all");
  const [cleared,      setCleared]      = useState(false);
  const [quotaWarning, setQuotaWarning] = useState(false);
  const [storage,      setStorage]      = useState({ usedKB: 0, pct: 0 });

  useEffect(() => {
    setHistory(getHistory());
    setStorage(getStorageInfo());

    const syncHistory = () => { setHistory(getHistory()); setStorage(getStorageInfo()); };
    const warnQuota   = () => setQuotaWarning(true);

    window.addEventListener("storage",           syncHistory);
    window.addEventListener("fmc_storage_quota", warnQuota);
    return () => {
      window.removeEventListener("storage",           syncHistory);
      window.removeEventListener("fmc_storage_quota", warnQuota);
    };
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const uniqueCount = useMemo(() => new Set(history.map((e) => e.href)).size, [history]);
  const todayCount  = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return history.filter((e) => new Date(e.timestamp) >= today).length;
  }, [history]);
  const savedCount = useMemo(() => history.filter((e) => e.resultSummary).length, [history]);

  const topCalcs = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {};
    for (const e of history) {
      if (!counts[e.href]) counts[e.href] = { name: e.calculatorName, count: 0 };
      counts[e.href].count++;
    }
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [history]);

  const usedCategories = useMemo(() => [...new Set(history.map((e) => e.category))], [history]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return history.filter(
      (e) => (catFilter === "all" || e.category === catFilter) &&
             (!q || e.calculatorName.toLowerCase().includes(q) || catName(e.category).toLowerCase().includes(q))
    );
  }, [history, search, catFilter]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  // ── Actions ───────────────────────────────────────────────────────────────
  function handleDelete(id: string) { setHistory(removeEntry(id)); setStorage(getStorageInfo()); }

  function handleClear() {
    clearHistory(); setHistory([]); setStorage(getStorageInfo());
    setCleared(true); setTimeout(() => setCleared(false), 3000);
  }

  function handleExportCSV() {
    const rows = [
      ["Calculator", "Category", "Level", "Result", "Timestamp", "URL"],
      ...history.map((e) => [
        e.calculatorName,
        catName(e.category),
        e.level ?? "",
        e.resultSummary ?? "",
        new Date(e.timestamp).toLocaleString("en-ZA"),
        `https://fluidspad.com${e.href}`,
      ]),
    ];
    const csv  = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), { href: url, download: "calculation-history.csv" });
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-8 -mb-8 flex flex-col min-h-screen">

      {/* ── Dark header ───────────────────────────────────────────────────── */}
      <div style={{ background: "linear-gradient(135deg, #0c2340 0%, #0c4a6e 60%, #1e40af 100%)" }}>
        <div className="px-6 sm:px-10 lg:px-14 py-8">

          {/* Title row */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">Calculation History</h1>
              <p className="text-sm text-sky-200/50 mt-1">Every calculator you open is logged here automatically.</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleExportCSV}
                disabled={history.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-sky-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-white/10"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </button>
              <button
                onClick={handleClear}
                disabled={history.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-red-400/20"
              >
                {cleared ? "Cleared!" : "Clear all"}
              </button>
            </div>
          </div>

          {/* Quota warning */}
          {quotaWarning && (
            <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              Browser storage is full — oldest history entries were automatically trimmed. Consider exporting your history and clearing it.
              <button onClick={() => setQuotaWarning(false)} className="ml-auto text-amber-400 hover:text-amber-200">✕</button>
            </div>
          )}

          {/* Stats row */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total visits",       value: history.length },
              { label: "Unique calculators", value: uniqueCount    },
              { label: "Today",              value: todayCount      },
              { label: "Results saved",      value: savedCount      },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-400/60 mb-1">{label}</p>
                <p className="text-2xl font-black text-white leading-none">{value}</p>
              </div>
            ))}
          </div>

          {/* Storage bar */}
          <StorageBar pct={storage.pct} usedKB={storage.usedKB} />
        </div>
      </div>

      {/* ── Body: sidebar + main ──────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row flex-1 bg-gray-50 dark:bg-gray-950">

        {/* Left sidebar */}
        <aside className="lg:w-56 xl:w-64 flex-shrink-0 bg-white dark:bg-gray-900 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-800 p-5 lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto">

          {/* Category filters */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Filter by discipline</p>
          <div className="space-y-1">
            <button
              onClick={() => setCatFilter("all")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                catFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${catFilter === "all" ? "bg-white" : "bg-gray-300 dark:bg-gray-600"}`} />
              All disciplines
              <span className="ml-auto text-[10px] opacity-60">{history.length}</span>
            </button>

            {usedCategories.map((id) => {
              const c      = CAT[id] ?? DEFAULT_CAT;
              const active = catFilter === id;
              const count  = history.filter((e) => e.category === id).length;
              return (
                <button
                  key={id}
                  onClick={() => setCatFilter(active ? "all" : id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                    active
                      ? `${c.badge} ${c.text}`
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                  {catName(id).split(" ").slice(0, 3).join(" ")}
                  <span className="ml-auto text-[10px] opacity-60">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Most visited */}
          {topCalcs.length > 1 && (
            <div className="mt-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Most visited</p>
              <div className="space-y-2">
                {topCalcs.map((tc, i) => {
                  const pct = Math.round((tc.count / (topCalcs[0]?.count ?? 1)) * 100);
                  return (
                    <div key={tc.name}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] text-gray-600 dark:text-gray-400 truncate max-w-[140px]">
                          {i + 1}. {tc.name}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 flex-shrink-0 ml-1">{tc.count}</span>
                      </div>
                      <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Storage note */}
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[10px] text-gray-400 dark:text-gray-600 leading-relaxed">
              Use Export CSV to save a permanent copy of your history.
            </p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-6 lg:p-8">

          {/* Search */}
          {history.length > 0 && (
            <div className="relative mb-6">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search calculators…"
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
              {search && (
                <button onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none">
                  ×
                </button>
              )}
            </div>
          )}

          {/* Empty state */}
          {history.length === 0 && (
            <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-500 dark:text-gray-400">No history yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-6">Open any calculator and it appears here automatically.</p>
              <Link
                href="/calculators"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-blue-600/20"
              >
                Browse calculators →
              </Link>
            </div>
          )}

          {/* No search results */}
          {history.length > 0 && filtered.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">No results for &ldquo;{search}&rdquo;</p>
              <button onClick={() => { setSearch(""); setCatFilter("all"); }}
                className="mt-3 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                Clear filters
              </button>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.label}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {group.label}
                  </h2>
                  <span className="text-xs text-gray-300 dark:text-gray-600">
                    {group.entries.length} {group.entries.length === 1 ? "visit" : "visits"}
                  </span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                </div>
                <div className="space-y-2">
                  {group.entries.map((entry) => (
                    <EntryCard key={entry.id} entry={entry} onDelete={() => handleDelete(entry.id)} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Footer note */}
          {history.length > 0 && (
            <p className="text-xs text-center text-gray-300 dark:text-gray-700 mt-10">
              {history.length} of 300 entries saved
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
