"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { formulas, categories, CAT_COLOR, DEFAULT_STYLE, type Formula } from "@/lib/formula-data";
import { fluidTables, tableCategories, type FluidTable } from "@/lib/table-data";
import { MathEquation } from "@/components/MathEquation";
import { SheetContent } from "@/components/SheetPreview";

// ── Category dot colours ─────────────────────────────────────────────────────
const CAT_DOT: Record<string, string> = {
  "Fluid Statics":         "bg-blue-500",
  "Conservation":          "bg-green-500",
  "Pipe Flow":             "bg-cyan-500",
  "External Flow":         "bg-purple-500",
  "Dimensionless Numbers": "bg-orange-500",
  "Compressible Flow":     "bg-red-500",
  "Turbomachinery":        "bg-indigo-500",
  "Open Channel Flow":     "bg-teal-500",
  "Heat & Mass Transfer":  "bg-amber-500",
};

const TABLE_DOT: Record<string, string> = {
  "Fluid Properties":     "bg-sky-500",
  "Pipe & Duct Systems":  "bg-cyan-500",
  "Open Channel Flow":    "bg-teal-500",
  "Compressible Flow":    "bg-red-500",
};

// ── A4 live-preview scale constants ──────────────────────────────────────────
const A4_W = 794;
const A4_H = 1123;
const PREVIEW_W = 696; // inner width of the preview panel (720px - 2×12px p-3)
const PREVIEW_SCALE = PREVIEW_W / A4_W;
const SCALED_A4_H = Math.round(A4_H * PREVIEW_SCALE);

// ── Starter packs ─────────────────────────────────────────────────────────────
const STARTER_PACKS = [
  { name: "Bernoulli Essentials",  equations: ["Continuity (Incompressible)", "Bernoulli's Equation", "Extended Energy Equation", "Dynamic Pressure", "Total Head"] },
  { name: "Pipe Flow Core",        equations: ["Reynolds Number", "Darcy-Weisbach", "Friction Factor — Laminar", "Colebrook-White", "Minor Losses"] },
  { name: "Open Channel",          equations: ["Manning's Equation", "Froude Number", "Critical Depth (Rectangular)", "Hydraulic Jump", "Specific Energy"] },
  { name: "Compressible Flow",     equations: ["Speed of Sound", "Mach Number", "Stagnation Temperature", "Isentropic Pressure Ratio", "Normal Shock — Downstream Mach"] },
  { name: "Heat Transfer Basics",  equations: ["Newton's Law of Cooling", "Fourier's Law of Conduction", "LMTD", "Nusselt Number", "Dittus-Boelter Correlation"] },
  { name: "Turbomachinery",        equations: ["Euler Turbomachine Equation", "Pump / Turbine Power", "Pump Affinity Laws", "Specific Speed", "NPSH Available"] },
];

// ── Saved set type ────────────────────────────────────────────────────────────
interface SavedSet {
  id: string;
  name: string;
  indices: number[];
  tableIds: string[];
}

const SETS_KEY = "fm-saved-sets";

// ── Compact list row ─────────────────────────────────────────────────────────
function FormulaRow({
  f, selected, onToggle,
}: { f: Formula; selected: boolean; onToggle: () => void }) {
  const dot = CAT_DOT[f.category] ?? "bg-gray-400";
  return (
    <div className="relative group/row">
      <div
        onClick={onToggle}
        className={`flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors select-none
          ${selected
            ? "bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-400/40"
            : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
          }`}
      >
        <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors
          ${selected ? "bg-blue-500 border-blue-500" : "border-gray-300 dark:border-gray-600 group-hover/row:border-blue-400"}`}>
          {selected && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <div className={`w-0.5 self-stretch rounded-full flex-shrink-0 ${dot} opacity-60`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">{f.name}</span>
            {f.calc && (
              <Link
                href={f.calc}
                onClick={(e) => e.stopPropagation()}
                className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 font-medium transition-colors flex-shrink-0"
              >
                Open calculator →
              </Link>
            )}
          </div>
          <div className="eq-scroll mt-0.5 text-sm text-gray-800 dark:text-gray-200">
            <MathEquation eq={f.equation} />
          </div>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{f.description}</p>

          {/* Variable definitions — shown inline when selected */}
          {selected && f.where.length > 0 && (
            <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800/50 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
              {f.where.map(([sym, def]) => (
                <div key={sym} className="flex gap-2 items-baseline text-xs">
                  <span className="font-mono text-blue-600 dark:text-blue-400 flex-shrink-0 min-w-[2.5rem]">{sym}</span>
                  <span className="text-gray-500 dark:text-gray-400 leading-tight">{def}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Variable tooltip — shown on hover only when not selected (selected shows inline) */}
      {!selected && f.where.length > 0 && (
        <div className="absolute left-8 top-full mt-1 z-50 hidden group-hover/row:block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl px-3 py-2.5 min-w-52 max-w-xs pointer-events-none">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">Variables</p>
          <div className="space-y-1">
            {f.where.map(([sym, def]) => (
              <div key={sym} className="flex gap-2 items-baseline">
                <span className="font-mono text-xs text-blue-600 dark:text-blue-400 flex-shrink-0 min-w-[2rem]">{sym}</span>
                <span className="text-xs text-gray-600 dark:text-gray-300 leading-tight">{def}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Table row ────────────────────────────────────────────────────────────────
function TableRow({ t, selected, onToggle }: { t: FluidTable; selected: boolean; onToggle: () => void }) {
  const dot = TABLE_DOT[t.category] ?? "bg-gray-400";
  return (
    <div
      onClick={onToggle}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors select-none
        ${selected
          ? "bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-400/40"
          : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
        }`}
    >
      <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors
        ${selected ? "bg-blue-500 border-blue-500" : "border-gray-300 dark:border-gray-600 hover:border-blue-400"}`}>
        {selected && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <div className={`w-0.5 self-stretch rounded-full flex-shrink-0 ${dot} opacity-60`} />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</span>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{t.description}</p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function FormulasPage() {
  const [query,          setQuery]          = useState("");
  const [activeCategory,      setActiveCategory]      = useState("All");
  const [activeTableCategory, setActiveTableCategory] = useState("All");
  const [selected,       setSelected]       = useState<Set<number>>(new Set());
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [mainTab,        setMainTab]        = useState<"formulas" | "tables">("formulas");

  // Sheet details
  const [sheetTitle,    setSheetTitle]    = useState("Relevant Equations & Tables");
  // Modal preview & print
  const [showModal,     setShowModal]     = useState(false);
  const [modalColumns,  setModalColumns]  = useState<1 | 2 | 3>(2);
  const [modalShowDefinitions, setModalShowDefinitions] = useState(true);
  const [modalGroupCats,setModalGroupCats]= useState(true);

  // Saved sets
  const [savedSets,   setSavedSets]   = useState<SavedSet[]>([]);
  const [newSetName,  setNewSetName]  = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETS_KEY);
      if (raw) setSavedSets(JSON.parse(raw));
    } catch {}
  }, []);

  const persistSets = (sets: SavedSet[]) => {
    setSavedSets(sets);
    localStorage.setItem(SETS_KEY, JSON.stringify(sets));
  };

  const saveSet = () => {
    const name = newSetName.trim() || `Set ${savedSets.length + 1}`;
    const set: SavedSet = {
      id: String(Date.now()),
      name,
      indices: Array.from(selected),
      tableIds: Array.from(selectedTables),
    };
    persistSets([...savedSets, set]);
    setNewSetName("");
  };

  const loadSet = (s: SavedSet) => {
    setSelected(new Set(s.indices));
    setSelectedTables(new Set(s.tableIds));
  };

  const loadPack = (pack: typeof STARTER_PACKS[0]) => {
    const indices = pack.equations
      .map((name) => formulas.findIndex((f) => f.name === name))
      .filter((i) => i >= 0);
    setSelected(new Set(indices));
    setSelectedTables(new Set());
  };

  const deleteSet = (id: string) => persistSets(savedSets.filter((s) => s.id !== id));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return formulas.map((f, idx) => ({ f, idx })).filter(({ f }) => {
      if (activeCategory !== "All" && f.category !== activeCategory) return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        f.equation.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, activeCategory]);

  const grouped = useMemo(() => {
    const map: Record<string, { f: Formula; idx: number }[]> = {};
    for (const item of filtered) (map[item.f.category] ??= []).push(item);
    return map;
  }, [filtered]);

  const toggle = (idx: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });

  const toggleTable = (id: string) =>
    setSelectedTables((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const clearAll = () => { setSelected(new Set()); setSelectedTables(new Set()); };

  const selectVisible = () => {
    const ids = filtered.map(({ idx }) => idx);
    const allOn = ids.every((i) => selected.has(i));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((i) => (allOn ? next.delete(i) : next.add(i)));
      return next;
    });
  };

  const selectedFormulas = Array.from(selected).map((i) => formulas[i]).filter(Boolean);
  const selectedTableObjects = Array.from(selectedTables)
    .map((id) => fluidTables.find((t) => t.id === id))
    .filter((t): t is FluidTable => !!t);

  const removeFromModal = (idx: number) => {
    const globalIdx = Array.from(selected)[idx];
    if (globalIdx !== undefined) toggle(globalIdx);
  };
  const totalSelected = selected.size + selectedTables.size;
  const visibleAllSelected = filtered.length > 0 && filtered.every(({ idx }) => selected.has(idx));

  // Table filtering — by query AND category
  const filteredTables = useMemo(() => {
    const q = query.trim().toLowerCase();
    return fluidTables.filter((t) => {
      if (activeTableCategory !== "All" && t.category !== activeTableCategory) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.note?.toLowerCase().includes(q)
      );
    });
  }, [query, activeTableCategory]);

  const tablesAllSelected = filteredTables.length > 0 && filteredTables.every((t) => selectedTables.has(t.id));

  const selectVisibleTables = () => {
    setSelectedTables((prev) => {
      const next = new Set(prev);
      filteredTables.forEach((t) => (tablesAllSelected ? next.delete(t.id) : next.add(t.id)));
      return next;
    });
  };

  return (
    <>
      <style>{`
        @media print {
          .fm-no-print { display: none !important; }
          .fm-print-only { display: block !important; }
          body { margin: 0; background: white; }
          header, footer, nav { display: none !important; }
          @page { size: A4; margin: 10mm 12mm; }
        }
        .fm-print-only { display: none; }
      `}</style>
      <div className="fm-no-print">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-5">
        <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 inline-flex items-center gap-1 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-1">Equation Sheet Builder</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Tick equations and tables, save named sets for reuse, then print.
        </p>
      </div>

      {/* ── Search bar — shared across both tabs ───────────────────── */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={mainTab === "formulas" ? "Search equations…" : "Search tables…"}
            className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white" />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          )}
        </div>
        {/* Category dropdown — switches by tab */}
        {mainTab === "formulas" ? (
          <div className="relative">
            <select value={activeCategory} onChange={(e) => setActiveCategory(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
              <option value="All">All topics</option>
              {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        ) : (
          <div className="relative">
            <select value={activeTableCategory} onChange={(e) => setActiveTableCategory(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
              <option value="All">All topics</option>
              {tableCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
        {/* Select all visible — works for both tabs */}
        {mainTab === "formulas" && filtered.length > 0 && (
          <button onClick={selectVisible} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-400 transition-colors whitespace-nowrap">
            {visibleAllSelected ? "Deselect all" : "Select all visible"}
          </button>
        )}
        {mainTab === "tables" && filteredTables.length > 0 && (
          <button onClick={selectVisibleTables} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-400 transition-colors whitespace-nowrap">
            {tablesAllSelected ? "Deselect all" : "Select all visible"}
          </button>
        )}
      </div>

      {/* ── Two-column layout ───────────────────────────────────────── */}
      <div className="flex gap-6 items-start">

        {/* LEFT — tabbed: Equations | Tables */}
        <div className="flex-1 min-w-0">

          {/* Tab bar */}
          <div className="flex gap-1 mb-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
            <button
              onClick={() => setMainTab("formulas")}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                mainTab === "formulas"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              Equations
              {selected.size > 0 && (
                <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full font-semibold">
                  {selected.size}
                </span>
              )}
            </button>
            <button
              onClick={() => setMainTab("tables")}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                mainTab === "tables"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              Tables
              {selectedTables.size > 0 && (
                <span className="ml-2 text-xs px-1.5 py-0.5 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 rounded-full font-semibold">
                  {selectedTables.size}
                </span>
              )}
            </button>
          </div>

          {/* ── FORMULAS TAB ─────────────────────────────────────────── */}
          {mainTab === "formulas" && <div className="space-y-8">

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 py-12 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">No equations match &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            <div className="space-y-6">
              {(activeCategory === "All" ? categories : [activeCategory]).map((cat) => {
                const items = grouped[cat];
                if (!items?.length) return null;
                const s = CAT_COLOR[cat] ?? DEFAULT_STYLE;
                const catSelectedCount = items.filter(({ idx }) => selected.has(idx)).length;
                const catAllSelected   = catSelectedCount === items.length;
                return (
                  <section key={cat}>
                    <div className="flex items-center gap-2 mb-1 pb-1.5 border-b border-gray-200 dark:border-gray-700">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.badge}`}>{cat}</span>
                      {catSelectedCount > 0 && (
                        <span className="text-xs text-blue-500 dark:text-blue-400 font-medium">{catSelectedCount} selected</span>
                      )}
                      <button onClick={() => {
                        const ids = items.map(({ idx }) => idx);
                        setSelected((prev) => {
                          const next = new Set(prev);
                          ids.forEach((i) => (catAllSelected ? next.delete(i) : next.add(i)));
                          return next;
                        });
                      }} className="ml-auto text-xs text-gray-400 hover:text-blue-600 transition-colors">
                        {catAllSelected ? "Deselect section" : "Select section"}
                      </button>
                    </div>
                    <div className="space-y-0.5">
                      {items.map(({ f, idx }) => (
                        <FormulaRow key={idx} f={f} selected={selected.has(idx)} onToggle={() => toggle(idx)} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          </div>}

          {/* ── TABLES TAB ───────────────────────────────────────────── */}
          {mainTab === "tables" && <div className="space-y-6">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {query && filteredTables.length > 0
                  ? `${filteredTables.length} table${filteredTables.length !== 1 ? "s" : ""} match "${query}"`
                  : "Click a table to add it to your sheet — tables print below the equations."}
              </p>
              {selectedTables.size > 0 && (
                <button onClick={() => setSelectedTables(new Set())} className="text-xs text-gray-400 hover:text-red-500 transition-colors whitespace-nowrap ml-4">
                  Clear tables
                </button>
              )}
            </div>

            {filteredTables.length === 0 ? (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 py-12 text-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">No tables match &ldquo;{query}&rdquo;</p>
              </div>
            ) : (
              // Group filtered tables by category
              tableCategories.map((cat) => {
                const tables = filteredTables.filter((t) => t.category === cat);
                if (!tables.length) return null;
                return (
                  <div key={cat}>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide pb-1 border-b border-gray-200 dark:border-gray-700">{cat}</p>
                    <div className="space-y-0.5">
                      {tables.map((t) => (
                        <TableRow key={t.id} t={t} selected={selectedTables.has(t.id)} onToggle={() => toggleTable(t.id)} />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>}

        </div>

        {/* RIGHT — live sheet preview */}
        <aside className="hidden lg:flex flex-col w-[720px] flex-shrink-0 sticky top-20 gap-4 max-h-[calc(100vh-5.5rem)] overflow-y-auto">

          {/* Sheet preview card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">

            {/* Controls header */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-2.5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900 dark:text-white">Sheet Preview</p>
                {totalSelected > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 dark:text-gray-500">{selected.size} eq · {selectedTables.size} tbl</span>
                    <button onClick={clearAll} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Clear</button>
                  </div>
                )}
              </div>
              <input
                value={sheetTitle}
                onChange={(e) => setSheetTitle(e.target.value)}
                placeholder="Sheet title"
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2 flex-wrap">
                {/* Column buttons */}
                <div className="flex gap-1">
                  {([1, 2, 3] as const).map((n) => (
                    <button
                      key={n}
                      onClick={() => setModalColumns(n)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold border transition-colors ${
                        modalColumns === n
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {/* Variables checkbox */}
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <div
                    onClick={() => setModalShowDefinitions((v) => !v)}
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      modalShowDefinitions ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-600 hover:border-blue-400"
                    }`}
                  >
                    {modalShowDefinitions && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-300">Definitions</span>
                </label>
                {/* Group by topic checkbox */}
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <div
                    onClick={() => setModalGroupCats((v) => !v)}
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      modalGroupCats ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-600 hover:border-blue-400"
                    }`}
                  >
                    {modalGroupCats && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-300">Group</span>
                </label>
              </div>
            </div>

            {/* Scaled A4 preview — flex-1 so it fills card height and scrolls */}
            <div className="flex-1 min-h-0 bg-gray-100 dark:bg-gray-900/50 p-3 overflow-y-auto">
              {totalSelected === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Select equations to preview your sheet</p>
                </div>
              ) : (
                <>
                  {/* Scaled A4 paper */}
                  <div style={{
                    width: PREVIEW_W,
                    margin: "0 auto",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                    overflowX: "hidden",
                  }}>
                    <div style={{
                      zoom: PREVIEW_SCALE,
                      width: A4_W,
                      background: "white",
                      padding: "10mm 12mm",
                      pointerEvents: "none",
                    } as React.CSSProperties}>
                      <SheetContent
                        formulas={selectedFormulas}
                        tables={selectedTableObjects}
                        title={sheetTitle}
                        showDefinitions={modalShowDefinitions}
                        groupCats={modalGroupCats}
                        columns={modalColumns}
                      />
                    </div>
                  </div>
                  {/* Full screen button */}
                  <button
                    onClick={() => setShowModal(true)}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 py-1 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    Full screen
                  </button>
                </>
              )}
            </div>

            {/* Download button */}
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
              <button
                onClick={() => window.print()}
                disabled={totalSelected === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {totalSelected === 0 ? "Select items first" : "Download PDF"}
              </button>
            </div>
          </div>

          {/* Quick Start — starter packs + saved sets */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Quick Start</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Load a preset or save your own</p>
            </div>

            {/* Starter packs */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Starter packs</p>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-0.5">
                {STARTER_PACKS.map((pack) => (
                  <button
                    key={pack.name}
                    onClick={() => loadPack(pack)}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 transition-all text-left"
                  >
                    <span className="font-medium truncate">{pack.name}</span>
                    <span className="text-gray-400 flex-shrink-0">{pack.equations.length} eq</span>
                  </button>
                ))}
              </div>
            </div>

            {/* User saved sets */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">My saved sets</p>
                {savedSets.length > 0 ? (
                  <ul className="space-y-1 max-h-32 overflow-y-auto mb-2">
                    {savedSets.map((s) => (
                      <li key={s.id} className="flex items-center gap-2">
                        <span className="flex-1 text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{s.name}</span>
                        <span className="text-xs text-gray-400">{s.indices.length}eq</span>
                        <button onClick={() => loadSet(s)} className="text-xs text-blue-500 hover:underline flex-shrink-0">Load</button>
                        <button onClick={() => deleteSet(s.id)} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 text-sm leading-none">×</button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">No saved sets yet</p>
                )}
                <div className="flex gap-2">
                  <input
                    value={newSetName}
                    onChange={(e) => setNewSetName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && totalSelected > 0 && saveSet()}
                    placeholder="Name your set…"
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={saveSet}
                    disabled={totalSelected === 0}
                    className="px-2.5 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors flex-shrink-0"
                  >
                    Save
                  </button>
                </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile bottom bar */}
      {totalSelected > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t-2 border-blue-500 px-4 py-3 flex items-center justify-between gap-4 shadow-2xl">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{totalSelected} item{totalSelected !== 1 ? "s" : ""}</p>
            <button onClick={clearAll} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Clear all</button>
          </div>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF
          </button>
        </div>
      )}

      {/* ── Full-screen preview / print modal ─────────────────────── */}
      {showModal && (
        <>
          <div className="fixed inset-0 z-[100] flex flex-col bg-gray-100 dark:bg-gray-950">

            {/* ── Top toolbar ── */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm flex-wrap">

              {/* Close */}
              <button
                onClick={() => setShowModal(false)}
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 flex-shrink-0" />

              {/* Sheet title */}
              <input
                value={sheetTitle}
                onChange={(e) => setSheetTitle(e.target.value)}
                placeholder="Sheet title"
                className="flex-1 min-w-32 max-w-xs px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 flex-shrink-0 hidden sm:block" />

              {/* Column selector */}
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">Cols:</span>
                {([1, 2, 3] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setModalColumns(n)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold border transition-colors ${
                      modalColumns === n
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              {/* Variables toggle */}
              <label className="hidden sm:flex items-center gap-1.5 cursor-pointer select-none">
                <div
                  onClick={() => setModalShowDefinitions((v) => !v)}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    modalShowDefinitions ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-600 hover:border-blue-400"
                  }`}
                >
                  {modalShowDefinitions && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">Variables</span>
              </label>

              {/* Group by topic toggle */}
              <label className="hidden sm:flex items-center gap-1.5 cursor-pointer select-none">
                <div
                  onClick={() => setModalGroupCats((v) => !v)}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    modalGroupCats ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-600 hover:border-blue-400"
                  }`}
                >
                  {modalGroupCats && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">Group by topic</span>
              </label>

              <div className="flex-1" />

              {/* Item count */}
              <span className="text-xs text-gray-400 dark:text-gray-500 hidden md:block whitespace-nowrap">
                {selectedFormulas.length} eq{selectedFormulas.length !== 1 ? "s" : ""}
                {selectedTableObjects.length > 0 && ` · ${selectedTableObjects.length} table${selectedTableObjects.length !== 1 ? "s" : ""}`}
              </span>

              {/* Print button */}
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Download PDF
              </button>
            </div>

            {/* ── Scrollable A4 preview ── */}
            <div className="flex-1 overflow-y-auto py-8 px-4">
              <div
                className="mx-auto bg-white shadow-2xl"
                style={{ width: "794px", maxWidth: "100%", padding: "16mm 18mm", minHeight: "1123px" }}
              >
                <SheetContent
                  formulas={selectedFormulas}
                  tables={selectedTableObjects}
                  title={sheetTitle}
                  showDefinitions={modalShowDefinitions}
                  groupCats={modalGroupCats}
                  columns={modalColumns}
                  onRemoveFormula={removeFromModal}
                  onRemoveTable={toggleTable}
                />
              </div>
            </div>
          </div>
        </>
      )}
      </div>

      {/* Print-only output */}
      <div className="fm-print-only">
        <SheetContent
          formulas={selectedFormulas}
          tables={selectedTableObjects}
          title={sheetTitle}
          showDefinitions={modalShowDefinitions}
          groupCats={modalGroupCats}
          columns={modalColumns}
        />
      </div>
    </>
  );
}
