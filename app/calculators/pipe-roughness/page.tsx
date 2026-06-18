"use client";
import { useState, useMemo } from "react";
import { References } from "@/components/References";
import { REFS_PIPE_ROUGHNESS } from "@/lib/references";

interface RoughnessEntry {
  material: string;
  condition: string;
  epsMin_mm: number;
  epsMax_mm: number;
  category: string;
}

const DATA: RoughnessEntry[] = [
  // --- Metal pipes ---
  { material: "Drawn copper / brass",    condition: "New, commercially smooth",   epsMin_mm: 0.0015, epsMax_mm: 0.003,  category: "Metal" },
  { material: "Stainless steel",         condition: "New, electropolished",        epsMin_mm: 0.0005, epsMax_mm: 0.002,  category: "Metal" },
  { material: "Stainless steel",         condition: "New, standard finish",        epsMin_mm: 0.002,  epsMax_mm: 0.010,  category: "Metal" },
  { material: "Carbon steel",            condition: "New, commercial",             epsMin_mm: 0.040,  epsMax_mm: 0.060,  category: "Metal" },
  { material: "Carbon steel",            condition: "Light rust",                  epsMin_mm: 0.10,   epsMax_mm: 0.20,   category: "Metal" },
  { material: "Carbon steel",            condition: "General rust",                epsMin_mm: 0.20,   epsMax_mm: 0.50,   category: "Metal" },
  { material: "Carbon steel",            condition: "Heavy rust / encrusted",      epsMin_mm: 0.50,   epsMax_mm: 3.0,    category: "Metal" },
  { material: "Cast iron",               condition: "New, uncoated",               epsMin_mm: 0.25,   epsMax_mm: 0.80,   category: "Metal" },
  { material: "Cast iron",               condition: "Bitumen-coated",              epsMin_mm: 0.10,   epsMax_mm: 0.30,   category: "Metal" },
  { material: "Cast iron",               condition: "Tuberculated",                epsMin_mm: 1.0,    epsMax_mm: 3.0,    category: "Metal" },
  { material: "Galvanised steel",        condition: "New",                         epsMin_mm: 0.10,   epsMax_mm: 0.20,   category: "Metal" },
  { material: "Galvanised steel",        condition: "Used / aged",                 epsMin_mm: 0.20,   epsMax_mm: 0.40,   category: "Metal" },
  { material: "Wrought iron",            condition: "New",                         epsMin_mm: 0.045,  epsMax_mm: 0.090,  category: "Metal" },
  { material: "Aluminium (drawn)",       condition: "New",                         epsMin_mm: 0.001,  epsMax_mm: 0.002,  category: "Metal" },
  // --- Plastic / lined ---
  { material: "PVC / CPVC",             condition: "New",                          epsMin_mm: 0.0015, epsMax_mm: 0.007,  category: "Plastic" },
  { material: "Polyethylene (PE/HDPE)", condition: "New",                          epsMin_mm: 0.0015, epsMax_mm: 0.007,  category: "Plastic" },
  { material: "GRP / FRP",             condition: "New, filament wound",           epsMin_mm: 0.010,  epsMax_mm: 0.050,  category: "Plastic" },
  { material: "Cement-lined steel",    condition: "New",                           epsMin_mm: 0.25,   epsMax_mm: 1.25,   category: "Concrete/Lined" },
  // --- Concrete ---
  { material: "Concrete (smooth)",     condition: "Cast in steel forms",           epsMin_mm: 0.025,  epsMax_mm: 0.20,   category: "Concrete/Lined" },
  { material: "Concrete (rough)",      condition: "Rough wood form",               epsMin_mm: 0.50,   epsMax_mm: 1.80,   category: "Concrete/Lined" },
  { material: "Prestressed concrete",  condition: "New",                           epsMin_mm: 0.10,   epsMax_mm: 0.60,   category: "Concrete/Lined" },
  // --- Ductwork ---
  { material: "Galvanised ductwork",   condition: "Spiral / seamed",               epsMin_mm: 0.09,   epsMax_mm: 0.15,   category: "Ductwork" },
  { material: "Flexible duct",         condition: "Fully extended",                epsMin_mm: 0.90,   epsMax_mm: 2.4,    category: "Ductwork" },
  { material: "Flexible duct",         condition: "Compressed 10%",                epsMin_mm: 3.0,    epsMax_mm: 9.0,    category: "Ductwork" },
  { material: "Stainless steel duct",  condition: "New",                           epsMin_mm: 0.002,  epsMax_mm: 0.010,  category: "Ductwork" },
  // --- Fire hydrant / water mains ---
  { material: "Ductile iron (DI)",     condition: "New",                           epsMin_mm: 0.025,  epsMax_mm: 0.050,  category: "Water Mains" },
  { material: "Ductile iron (DI)",     condition: "Cement mortar lined",           epsMin_mm: 0.025,  epsMax_mm: 0.100,  category: "Water Mains" },
  { material: "AC (asbestos cement)",  condition: "New",                           epsMin_mm: 0.025,  epsMax_mm: 0.030,  category: "Water Mains" },
  { material: "HDPE water main",       condition: "New",                           epsMin_mm: 0.007,  epsMax_mm: 0.015,  category: "Water Mains" },
];

const CATEGORIES = ["All", ...Array.from(new Set(DATA.map((d) => d.category)))];

function colebrook(Re: number, epsD: number): number {
  if (Re <= 0 || epsD < 0) return NaN;
  if (Re < 2300) return 64 / Re;
  // Swamee-Jain approximation (good to ±1%)
  return 0.25 / (Math.log10(epsD / 3.7 + 5.74 / Re ** 0.9)) ** 2;
}

export default function PipeRoughnessPage() {
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("All");
  const [diamMm,   setDiamMm]   = useState("100");
  const [reStr,    setReStr]    = useState("100000");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return DATA.filter((row) => {
      const matchCat  = category === "All" || row.category === category;
      const matchText = !q || row.material.toLowerCase().includes(q) || row.condition.toLowerCase().includes(q) || row.category.toLowerCase().includes(q);
      return matchCat && matchText;
    });
  }, [search, category]);

  const D  = (parseFloat(diamMm) || 0) / 1000;
  const Re = parseFloat(reStr) || 0;

  function epsRow(row: RoughnessEntry) {
    const epsMid = (row.epsMin_mm + row.epsMax_mm) / 2;
    const edMin  = D > 0 ? row.epsMin_mm / (D * 1000) : NaN;
    const edMax  = D > 0 ? row.epsMax_mm / (D * 1000) : NaN;
    const edMid  = D > 0 ? epsMid / (D * 1000) : NaN;
    const fMid   = Re > 0 && D > 0 ? colebrook(Re, edMid) : NaN;
    return { epsMid, edMin, edMax, edMid, fMid };
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Pipe Roughness Database</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Absolute roughness ε for common pipe and duct materials. Enter diameter and Re to compute ε/D and friction factor.
        </p>
      </div>

      {/* Diameter + Re helper */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Friction Factor Calculator</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Inside Diameter</label>
            <div className="flex">
              <input type="number" min="1" step="any" value={diamMm} onChange={(e) => setDiamMm(e.target.value)}
                className="flex-1 min-w-0 rounded-l border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="inline-flex items-center px-3 rounded-r border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 text-sm">mm</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reynolds Number</label>
            <input type="number" min="0" step="any" value={reStr} onChange={(e) => setReStr(e.target.value)}
              className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-end">
            <div className="w-full rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-2 text-sm text-blue-800 dark:text-blue-300">
              Hover a table row to see its friction factor. Values shown in the <em>f</em> column use the midpoint roughness.
            </div>
          </div>
        </div>
      </div>

      {/* Search + filter */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            type="text" placeholder="Search material or condition…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c} onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${category === c ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Material</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Condition</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">ε min (mm)</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">ε max (mm)</th>
                {D > 0 && (
                  <>
                    <th className="text-right py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">ε/D min</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">ε/D max</th>
                  </>
                )}
                {D > 0 && Re > 0 && (
                  <th className="text-right py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">f (Darcy)</th>
                )}
                <th className="text-left py-2 px-3 font-semibold text-gray-700 dark:text-gray-300">Category</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const { edMin, edMax, fMid } = epsRow(row);
                return (
                  <tr
                    key={i}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                  >
                    <td className="py-2 px-3 font-medium text-gray-900 dark:text-gray-100">{row.material}</td>
                    <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{row.condition}</td>
                    <td className="py-2 px-3 text-right font-mono text-gray-800 dark:text-gray-200">{row.epsMin_mm.toFixed(4)}</td>
                    <td className="py-2 px-3 text-right font-mono text-gray-800 dark:text-gray-200">{row.epsMax_mm.toFixed(4)}</td>
                    {D > 0 && (
                      <>
                        <td className="py-2 px-3 text-right font-mono text-gray-700 dark:text-gray-300">{isFinite(edMin) ? edMin.toExponential(2) : "—"}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-700 dark:text-gray-300">{isFinite(edMax) ? edMax.toExponential(2) : "—"}</td>
                      </>
                    )}
                    {D > 0 && Re > 0 && (
                      <td className="py-2 px-3 text-right font-mono text-blue-700 dark:text-blue-300 font-semibold">
                        {isFinite(fMid) ? fMid.toFixed(4) : "—"}
                      </td>
                    )}
                    <td className="py-2 px-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {row.category}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500 dark:text-gray-400">No matching entries.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{filtered.length} of {DATA.length} entries shown.</p>
      </div>

      {/* Notes */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Notes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600 dark:text-gray-400">
          <div className="space-y-2">
            <p><strong className="text-gray-800 dark:text-gray-200">Absolute roughness ε</strong> is the mean height of surface irregularities. It is a property of the pipe surface, not the fluid.</p>
            <p><strong className="text-gray-800 dark:text-gray-200">Relative roughness ε/D</strong> is dimensionless and enters the Colebrook-White equation. It decreases as pipe diameter increases.</p>
            <p><strong className="text-gray-800 dark:text-gray-200">Friction factor f</strong> shown is the Darcy-Weisbach friction factor, calculated via the Swamee-Jain approximation at the midpoint roughness. For Re &lt; 2 300 laminar: f = 64/Re.</p>
          </div>
          <div className="space-y-2">
            <p><strong className="text-gray-800 dark:text-gray-200">Effect of aging:</strong> Biological growth, corrosion, and scale deposition can increase effective roughness by one to two orders of magnitude over the service life.</p>

      <References refs={REFS_PIPE_ROUGHNESS} />
            <p><strong className="text-gray-800 dark:text-gray-200">References:</strong> Moody (1944), Colebrook & White (1937), ASHRAE Handbook of Fundamentals, Crane TP-410, White — Fluid Mechanics.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
