"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { allCalculators, calculatorCategories, type CalculatorInfo } from "@/lib/calculator-data";

const SCROLL_KEY = "calculators-scroll";
const VIEW_KEY   = "calculators-view";

// ─── Color system ──────────────────────────────────────────────────────────────
// glowClass maps to real CSS in globals.css (.calc-card + .calc-glow-[colour])
// Real CSS rules are guaranteed to compile — Tailwind JIT can't scan dynamic strings.
const CAT_STYLE: Record<string, { accent: string; bar: string; badge: string; text: string; header: string; glow: string; glowClass: string }> = {
  "fluid-mechanics-i":  { accent: "border-l-blue-500",   bar: "bg-blue-500",   badge: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",     text: "text-blue-600 dark:text-blue-400",    header: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",     glow: "", glowClass: "calc-glow-blue"   },
  "fluid-mechanics-ii": { accent: "border-l-green-500",  bar: "bg-green-500",  badge: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",   text: "text-green-600 dark:text-green-400",  header: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",   glow: "", glowClass: "calc-glow-green"  },
  "heat-mass-transfer": { accent: "border-l-orange-500", bar: "bg-orange-500", badge: "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300", text: "text-orange-600 dark:text-orange-400", header: "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800", glow: "", glowClass: "calc-glow-orange" },
  "open-channel":       { accent: "border-l-teal-500",   bar: "bg-teal-500",   badge: "bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300",       text: "text-teal-600 dark:text-teal-400",    header: "bg-teal-50 dark:bg-teal-950 border-teal-200 dark:border-teal-800",     glow: "", glowClass: "calc-glow-teal"   },
  "compressible-flow":  { accent: "border-l-red-500",    bar: "bg-red-500",    badge: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300",           text: "text-red-600 dark:text-red-400",      header: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",         glow: "", glowClass: "calc-glow-red"    },
  "turbomachinery":     { accent: "border-l-indigo-500", bar: "bg-indigo-500", badge: "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300", text: "text-indigo-600 dark:text-indigo-400", header: "bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800", glow: "", glowClass: "calc-glow-indigo" },
  "pipe-networks":      { accent: "border-l-cyan-500",   bar: "bg-cyan-500",   badge: "bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300",       text: "text-cyan-600 dark:text-cyan-400",    header: "bg-cyan-50 dark:bg-cyan-950 border-cyan-200 dark:border-cyan-800",     glow: "", glowClass: "calc-glow-cyan"   },
};

const LEVEL_STYLE: Record<string, string> = {
  Fundamental: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
  Applied:     "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
  Specialized: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300",
};

const DEFAULT_STYLE = { accent: "border-l-gray-400", bar: "bg-gray-400", badge: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300", text: "text-gray-500", header: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700", glow: "", glowClass: "calc-glow-gray" };

function saveScroll() {
  if (typeof window !== "undefined")
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
}

// ─── Calculator card ──────────────────────────────────────────────────────────
function CalcCard({ calc, showCategory = false, compact = false }: { calc: CalculatorInfo; showCategory?: boolean; compact?: boolean }) {
  const s = CAT_STYLE[calc.category] ?? DEFAULT_STYLE;
  const catName = calculatorCategories.find((c) => c.id === calc.category)?.name;

  if (compact) {
    return (
      <Link href={calc.href} onClick={saveScroll} className={`calc-card ${s.glowClass} group flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 ${s.accent} bg-white dark:bg-gray-800`}>
        <div className={`w-1 self-stretch rounded-full ${s.bar}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">{calc.name}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{calc.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {showCategory && catName && <span className={`hidden sm:inline text-xs px-2 py-0.5 rounded-full font-medium ${s.badge}`}>{catName}</span>}
          {calc.level && <span className={`hidden sm:inline text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_STYLE[calc.level] ?? ""}`}>{calc.level}</span>}
          <svg className={`w-4 h-4 ${s.text} group-hover:translate-x-0.5 transition-transform`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    );
  }

  return (
    <Link href={calc.href} onClick={saveScroll} className={`calc-card ${s.glowClass} group block rounded-xl`}>
      <div className={`h-full min-h-[160px] rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 ${s.accent} bg-white dark:bg-gray-800 p-4 flex flex-col gap-2`}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{calc.name}</h3>
          {calc.isDesignTool && (
            <span className="text-xs px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 rounded font-medium flex-shrink-0">Design Tool</span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed flex-1 line-clamp-2">{calc.description}</p>
        <div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
          {calc.level && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_STYLE[calc.level] ?? ""}`}>{calc.level}</span>
          )}
          {showCategory && catName && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.badge}`}>{catName}</span>
          )}
          <span className={`ml-auto text-xs font-medium ${s.text} flex items-center gap-0.5 group-hover:gap-1 transition-all`}>
            Open
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Dropdown helper ──────────────────────────────────────────────────────────
function FilterSelect({ id, label, value, onChange, options }: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <label htmlFor={id} className="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap hidden sm:block">{label}</label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

// ─── Page (URL-aware filter state) ───────────────────────────────────────────
function CalculatorsContent() {
  const searchParams   = useSearchParams();
  const router         = useRouter();
  const pathname       = usePathname();

  // Read filter state from URL; fall back to localStorage then defaults
  const activeCategory = searchParams.get("cat") ?? "all";
  const activeLevel    = searchParams.get("lvl") ?? "all";
  const view = (
    searchParams.get("view") ??
    (typeof window !== "undefined" ? localStorage.getItem(VIEW_KEY) : null) ??
    "grid"
  ) as "grid" | "list";

  // Search query lives in useState for instant input response; URL is synced alongside
  const [query, setQueryState] = useState(() => searchParams.get("q") ?? "");

  // Animate grid ↔ list: fade out → swap layout → fade in
  const [animView, setAnimView] = useState<"grid" | "list">(view);
  const [fading,   setFading]   = useState(false);

  // ── Restore scroll position when returning from a calculator ──────────────
  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved) {
      const y = parseInt(saved, 10);
      sessionStorage.removeItem(SCROLL_KEY);
      // requestAnimationFrame lets the layout finish before scrolling
      requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" }));
    }
  }, []);

  // ── Fade out → swap layout → fade in when view changes ────────────────────
  useEffect(() => {
    if (animView === view) return;
    setFading(true);
    const t = setTimeout(() => { setAnimView(view); setFading(false); }, 150);
    return () => clearTimeout(t);
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build and push a new URL preserving all current params except those being updated
  const pushUrl = (updates: Record<string, string>) => {
    const params = new URLSearchParams();
    const q   = updates.q   !== undefined ? updates.q   : query;
    const cat = updates.cat !== undefined ? updates.cat : activeCategory;
    const lvl = updates.lvl !== undefined ? updates.lvl : activeLevel;
    const v   = updates.view !== undefined ? updates.view : view;
    if (q)          params.set("q",    q);
    if (cat !== "all") params.set("cat", cat);
    if (lvl !== "all") params.set("lvl", lvl);
    if (v   !== "grid") params.set("view", v);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const setQuery          = (q: string)          => { setQueryState(q); pushUrl({ q }); };
  const setActiveCategory = (cat: string)        => pushUrl({ cat });
  const setActiveLevel    = (lvl: string)        => pushUrl({ lvl });
  const setView           = (v: "grid" | "list") => {
    localStorage.setItem(VIEW_KEY, v);
    pushUrl({ view: v });
  };
  const clearAll = () => { setQueryState(""); router.replace(pathname, { scroll: false }); };

  const isFiltered = query.trim() !== "" || activeCategory !== "all" || activeLevel !== "all";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allCalculators.filter((c) => {
      // When not searching: hide design tools (they live under Design Tools nav)
      // When searching: include design tools so users can find them — shown with a Design badge
      if (!q && c.isDesignTool) return false;
      if (activeCategory !== "all" && c.category !== activeCategory) return false;
      if (activeLevel !== "all" && c.level !== activeLevel) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tags?.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, activeCategory, activeLevel]);

  const grouped = useMemo(() => {
    const map: Record<string, CalculatorInfo[]> = {};
    for (const calc of filtered) {
      (map[calc.category] ??= []).push(calc);
    }
    return map;
  }, [filtered]);

  const categoryOptions = [
    { value: "all", label: "All topics" },
    ...calculatorCategories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const levelOptions = [
    { value: "all", label: "All levels" },
    { value: "Fundamental", label: "Fundamental" },
    { value: "Applied", label: "Applied" },
    { value: "Specialized", label: "Specialized" },
  ];

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Home
        </Link>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Calculators</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Browse tools across {calculatorCategories.length} topic areas — for students and practising engineers.
            </p>
          </div>
          {/* Level filter pills */}
          <div className="flex gap-2 flex-wrap">
            {(["Fundamental", "Applied", "Specialized"] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setActiveLevel(activeLevel === lvl ? "all" : lvl)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all border ${
                  activeLevel === lvl
                    ? LEVEL_STYLE[lvl] + " border-transparent ring-2 ring-offset-1 ring-current"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Filter bar — sticky below the NavBar (h-14 = 56 px) ──────── */}
      <div className="sticky top-14 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 mb-1 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200/70 dark:border-gray-700/70">
      <div className="flex gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search calculators…"
            className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none">×</button>
          )}
        </div>

        {/* Category dropdown */}
        <FilterSelect
          id="cat-filter"
          label="Category"
          value={activeCategory}
          onChange={setActiveCategory}
          options={categoryOptions}
        />

        {/* Level dropdown */}
        <FilterSelect
          id="lvl-filter"
          label="Level"
          value={activeLevel}
          onChange={setActiveLevel}
          options={levelOptions}
        />

        {/* View toggle */}
        <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
          <button
            onClick={() => setView("grid")}
            title="Grid view"
            className={`p-2 transition-colors ${view === "grid" ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button
            onClick={() => setView("list")}
            title="List view"
            className={`p-2 transition-colors ${view === "list" ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
      </div>{/* end sticky filter bar */}

      {/* ── Active filter chips ─────────────────────────────────────────── */}
      {isFiltered && (
        <div className="flex items-center gap-2 mt-4 mb-5 flex-wrap">
          <span className="text-xs text-gray-400 dark:text-gray-500">Filters:</span>
          {activeCategory !== "all" && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700">
              {calculatorCategories.find((c) => c.id === activeCategory)?.name}
              <button onClick={() => setActiveCategory("all")} className="hover:text-red-500 leading-none ml-0.5">×</button>
            </span>
          )}
          {activeLevel !== "all" && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700">
              {activeLevel}
              <button onClick={() => setActiveLevel("all")} className="hover:text-red-500 leading-none ml-0.5">×</button>
            </span>
          )}
          {query && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700">
              &ldquo;{query}&rdquo;
              <button onClick={() => setQuery("")} className="hover:text-red-500 leading-none ml-0.5">×</button>
            </span>
          )}
          <button onClick={clearAll} className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline">Clear all</button>
        </div>
      )}

      {/* ── Content ────────────────────────────────────────────────────── */}
      {!isFiltered && <div className="mt-4" />}
      <div className={`transition-opacity duration-150 ${fading ? "opacity-0" : "opacity-100"}`}>
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-16 text-center">
          <p className="text-gray-400 dark:text-gray-500 mb-2">No calculators match your filters.</p>
          <button onClick={clearAll} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Clear filters</button>
        </div>
      ) : isFiltered ? (
        // ── Filtered: flat grid / list ──────────────────────────────────
        <div className={animView === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "flex flex-col gap-2"}>
          {filtered.map((calc) => (
            <CalcCard key={calc.href} calc={calc} showCategory compact={animView === "list"} />
          ))}
        </div>
      ) : (
        // ── Default: grouped by category ────────────────────────────────
        <div className="space-y-10">
          {calculatorCategories.map((cat) => {
            const items = grouped[cat.id];
            if (!items?.length) return null;
            const s = CAT_STYLE[cat.id] ?? DEFAULT_STYLE;
            return (
              <section key={cat.id}>
                {/* Section header */}
                <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border mb-4 ${s.header}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-1 h-6 rounded-full ${s.bar}`} />
                    <div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-white">{cat.name}</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{cat.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveCategory(cat.id)}
                    className={`text-xs font-medium flex-shrink-0 ${s.text} hover:underline`}
                  >
                    Filter only →
                  </button>
                </div>
                {/* Cards */}
                <div className={animView === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" : "flex flex-col gap-2"}>
                  {items.map((calc) => (
                    <CalcCard key={calc.href} calc={calc} compact={animView === "list"} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}

// Suspense boundary required by Next.js App Router when using useSearchParams()
import CalculatorsLoading from "./loading";
export default function CalculatorsPage() {
  return (
    <Suspense fallback={<CalculatorsLoading />}>
      <CalculatorsContent />
    </Suspense>
  );
}
