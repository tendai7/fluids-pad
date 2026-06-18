"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { formulas } from "@/lib/formula-data";
import { fluidTables, type FluidTable } from "@/lib/table-data";
import { SheetContent } from "@/components/SheetPreview";

// ─── Checkbox toggle ──────────────────────────────────────────────────────────
function CheckOption({
  checked, onChange, label,
}: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={onChange}
        className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          checked ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-600 hover:border-blue-400"
        }`}
      >
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SheetPage() {
  const [sheetFormulas, setSheetFormulas] = useState<typeof formulas>([]);
  const [sheetTables,   setSheetTables]   = useState<FluidTable[]>([]);
  const [title,      setTitle]      = useState("Relevant Equations & Tables");
  const [showDefinitions,   setShowVars]   = useState(true);
  const [groupCats,  setGroupCats]  = useState(true);
  const [columns,    setColumns]    = useState<1 | 2 | 3>(2);
  const [ready,      setReady]      = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("fm-sheet-indices");
      if (raw) {
        const indices: number[] = JSON.parse(raw);
        setSheetFormulas(indices.map((i) => formulas[i]).filter(Boolean));
      }
      const rawT = localStorage.getItem("fm-sheet-tables");
      if (rawT) {
        const ids: string[] = JSON.parse(rawT);
        setSheetTables(ids.map((id) => fluidTables.find((t) => t.id === id)).filter((t): t is FluidTable => !!t));
      }
      const t = localStorage.getItem("fm-sheet-title");
      if (t) setTitle(t);
    } catch {}
    setReady(true);
  }, []);

  const removeFormula = (idx: number) => setSheetFormulas((prev) => prev.filter((_, i) => i !== idx));
  const removeTable   = (id: string)  => setSheetTables((prev) => prev.filter((t) => t.id !== id));

  if (!ready) return null;

  const totalItems = sheetFormulas.length + sheetTables.length;

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; background: white; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          header, footer, nav { display: none !important; }
          @page { size: A4; margin: 10mm 12mm; }
        }
        .print-only { display: none; }
      `}</style>

      {/* ── Screen UI ─────────────────────────────────────────────────── */}
      <div className="no-print min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="w-full px-4 py-6">

          {/* Top bar */}
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Link
                href="/formulas"
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Change selection
              </Link>
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-white">{sheetFormulas.length}</span> eq
                {sheetTables.length > 0 && <> · <span className="font-semibold text-gray-900 dark:text-white">{sheetTables.length}</span> table{sheetTables.length !== 1 ? "s" : ""}</>}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              disabled={totalItems === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save as PDF
            </button>
          </div>

          {totalItems === 0 ? (
            <div className="text-center py-20 text-gray-500 dark:text-gray-400">
              <p className="mb-4">No equations or tables on this sheet.</p>
              <Link href="/formulas" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 transition-colors">
                Select items
              </Link>
            </div>
          ) : (
            <div className="flex gap-5 items-start">

              {/* Options sidebar */}
              <aside className="w-52 flex-shrink-0 space-y-4">

                {/* Sheet details */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sheet details</p>
                  <input value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder="Sheet title"
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                {/* Layout options */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Layout</p>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Columns</p>
                    <div className="flex gap-1.5">
                      {([1, 2, 3] as const).map((n) => (
                        <button key={n} onClick={() => setColumns(n)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                            columns === n
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                              : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400"
                          }`}>
                          {n} col
                        </button>
                      ))}
                    </div>
                  </div>
                  <CheckOption checked={showDefinitions}  onChange={() => setShowVars(v => !v)}  label="Variable definitions" />
                  <CheckOption checked={groupCats} onChange={() => setGroupCats(v => !v)} label="Group by topic" />
                </div>

                {/* Selected list */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Content ({sheetFormulas.length} eq · {sheetTables.length} table{sheetTables.length !== 1 ? "s" : ""})
                  </p>
                  <ul className="space-y-1 max-h-52 overflow-y-auto">
                    {sheetFormulas.map((f, i) => (
                      <li key={i} className="flex items-center justify-between gap-1 text-xs text-gray-600 dark:text-gray-400">
                        <span className="truncate">{f.name}</span>
                        <button onClick={() => removeFormula(i)} className="text-gray-300 hover:text-red-500 flex-shrink-0 transition-colors">×</button>
                      </li>
                    ))}
                    {sheetTables.map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-1 text-xs text-teal-600 dark:text-teal-400">
                        <span className="truncate">▤ {t.name}</span>
                        <button onClick={() => removeTable(t.id)} className="text-gray-300 hover:text-red-500 flex-shrink-0 transition-colors">×</button>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>

              {/* Preview */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  Preview matches your printed PDF
                </p>
                <div className="bg-white shadow-lg border border-gray-200 p-6">
                  <SheetContent
                    formulas={sheetFormulas}
                    tables={sheetTables}
                    title={title}
                    showDefinitions={showDefinitions}
                    groupCats={groupCats}
                    columns={columns}
                    onRemoveFormula={removeFormula}
                    onRemoveTable={removeTable}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Print-only area ───────────────────────────────────────────── */}
      <div className="print-only">
        <SheetContent
          formulas={sheetFormulas}
          tables={sheetTables}
          title={title}
          showDefinitions={showDefinitions}
          groupCats={groupCats}
          columns={columns}
        />
      </div>
    </>
  );
}
