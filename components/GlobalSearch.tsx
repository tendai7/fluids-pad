"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { allCalculators } from "@/lib/calculator-data";
import { formulas } from "@/lib/formula-data";

// ── Result types ───────────────────────────────────────────────────────────────
type ResultType = "calculator" | "design-tool" | "formula" | "page";

type Result = {
  type:        ResultType;
  name:        string;
  description: string;
  href:        string;
  category:    string;
};

// ── Static pages included in search ───────────────────────────────────────────
const STATIC_PAGES = [
  { name: "Unit Converter",    description: "Convert pressure, flow rate, viscosity, temperature and 30+ engineering units", href: "/converter",  category: "tools" },
  { name: "Reference Tables",  description: "Water and air properties, pipe roughness, Manning's n, isentropic and shock tables", href: "/tables", category: "tools" },
  { name: "Practice Problems",  description: "AI-generated engineering practice problems with adaptive hints and feedback",  href: "/practice",   category: "learn" },
  { name: "Formula Sheet",      description: "Build and print a custom fluid mechanics formula reference sheet",             href: "/formulas",   category: "learn" },
  { name: "Calculation History", description: "Every calculator you've opened, searchable and filterable by date",          href: "/history",    category: "tools" },
];

// ── Relevance scoring ──────────────────────────────────────────────────────────
// Returns 0 if no match, higher = more relevant.
function score(name: string, description: string, tags: string[] | undefined, q: string): number {
  const lq    = q.toLowerCase();
  const lname = name.toLowerCase();
  const ldesc = description.toLowerCase();
  let   s     = 0;

  if (lname === lq)            s += 10;  // exact name match
  else if (lname.startsWith(lq)) s +=  7;  // name starts with query
  else if (lname.includes(lq))   s +=  5;  // name contains query

  if (tags?.some(t => t.toLowerCase() === lq))       s += 4;  // exact tag
  else if (tags?.some(t => t.toLowerCase().includes(lq))) s += 3;  // partial tag

  if (ldesc.includes(lq)) s += 1;  // description mention

  return s;
}

// ── Main search function ───────────────────────────────────────────────────────
function search(q: string): Result[] {
  if (!q || q.length < 2) return [];

  type Scored = { result: Result; s: number };
  const tools: Scored[] = [];
  const forms: Scored[] = [];

  // Calculators and design tools — both included
  for (const c of allCalculators) {
    const s = score(c.name, c.description, c.tags, q);
    if (s > 0) {
      tools.push({
        result: {
          type:        c.isDesignTool ? "design-tool" : "calculator",
          name:        c.name,
          description: c.description,
          href:        c.href,
          category:    c.category,
        },
        s,
      });
    }
  }

  // Static pages
  for (const p of STATIC_PAGES) {
    const s = score(p.name, p.description, [], q);
    if (s > 0) {
      tools.push({ result: { type: "page", name: p.name, description: p.description, href: p.href, category: p.category }, s });
    }
  }

  // Formulas
  for (const f of formulas) {
    const s = score(f.name, f.description, f.tags, q);
    if (s > 0) {
      forms.push({ result: { type: "formula", name: f.name, description: f.description, href: "/formulas", category: f.category }, s });
    }
  }

  // Sort each group by relevance score descending
  tools.sort((a, b) => b.s - a.s);
  forms.sort((a, b) => b.s - a.s);

  // Up to 10 tools/pages + up to 5 formulas = max 15
  return [
    ...tools.slice(0, 10).map(x => x.result),
    ...forms.slice(0,  5).map(x => x.result),
  ];
}

// ── Badge for each result type ─────────────────────────────────────────────────
const TYPE_BADGE: Record<ResultType, { label: string; classes: string }> = {
  "calculator":  { label: "Calc",    classes: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"     },
  "design-tool": { label: "Design",  classes: "bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300" },
  "formula":     { label: "Formula", classes: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"  },
  "page":        { label: "Page",    classes: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"      },
};

// ── SA-specific suggestions shown when the search is empty ─────────────────────
const SUGGESTIONS = [
  "slurry pipeline", "mine ventilation", "stormwater", "Reynolds number",
  "pump head", "Manning",
];

// ── Component ─────────────────────────────────────────────────────────────────
export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query,  setQuery]  = useState("");
  const [active, setActive] = useState(0);
  const inputRef            = useRef<HTMLInputElement>(null);
  const router              = useRouter();
  const results             = search(query);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQuery(""); setActive(0); }
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  const go = useCallback((href: string) => { router.push(href); onClose(); }, [router, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape")    { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
      if (e.key === "Enter" && results[active]) { go(results[active].href); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, results, active, go, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-200 dark:border-gray-700">
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search calculators, design tools, formulas…"
            className="flex-1 text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none">×</button>
          )}
          <kbd className="hidden sm:block text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono">Esc</kbd>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <ul className="max-h-[26rem] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {results.map((r, i) => {
              const badge = TYPE_BADGE[r.type];
              return (
                <li key={i}>
                  <button
                    onClick={() => go(r.href)}
                    onMouseEnter={() => setActive(i)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                      i === active ? "bg-blue-50 dark:bg-blue-900/30" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <span className={`flex-shrink-0 mt-0.5 text-xs px-2 py-0.5 rounded-full font-semibold ${badge.classes}`}>
                      {badge.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{r.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.description}</p>
                    </div>
                    <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 transition-colors ${i === active ? "text-blue-500" : "text-gray-300 dark:text-gray-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : query.length >= 2 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            No results for &ldquo;{query}&rdquo;
          </p>
        ) : (
          <div className="px-4 py-5">
            <span className="text-xs text-gray-400 dark:text-gray-500 block mb-2">Try searching for:</span>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 flex gap-4 text-xs text-gray-400">
          <span><kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">↵</kbd> open</span>
          <span><kbd className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">Esc</kbd> close</span>
          {results.length > 0 && (
            <span className="ml-auto">{results.length} result{results.length !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function useGlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen };
}
