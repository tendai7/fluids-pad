"use client";

import React, { useState, useMemo } from "react";
import { References } from "@/components/References";
import { REFS_PIPE_SCHEDULE } from "@/lib/references";

// ── Source data ───────────────────────────────────────────────────────────────
// ASME B36.10M (carbon steel / alloy steel) and ASME B36.19M (stainless steel)
// OD is identical for both standards at a given NPS.

const OD_MM: Record<number, number> = {
  0.125: 10.287, 0.25: 13.716,  0.375: 17.145,
  0.5:   21.336, 0.75: 26.670,  1.0:   33.401,
  1.25:  42.164, 1.5:  48.260,  2.0:   60.325,
  2.5:   73.025, 3.0:  88.900,  3.5:  101.600,
  4.0:  114.300, 5.0: 141.300,  6.0:  168.275,
  8.0:  219.075, 10.0:273.050,  12.0: 323.850,
};

const NPS_LABEL: Record<number, string> = {
  0.125:"⅛",  0.25:"¼",   0.375:"⅜",  0.5:"½",
  0.75: "¾",  1.0: "1",   1.25: "1¼", 1.5: "1½",
  2.0:  "2",  2.5: "2½",  3.0:  "3",  3.5: "3½",
  4.0:  "4",  5.0: "5",   6.0:  "6",  8.0: "8",
  10.0: "10", 12.0:"12",
};

// [nps_in, schedule_label, wall_mm] — ASME B36.10M
const CARBON: [number, string, number][] = [
  [0.125,"Sch 40 (Std)",1.727], [0.125,"Sch 80 (XS)",2.413],
  [0.25, "Sch 10",      1.651], [0.25, "Sch 40 (Std)",2.235], [0.25, "Sch 80 (XS)",3.023],
  [0.375,"Sch 10",      1.651], [0.375,"Sch 40 (Std)",2.311], [0.375,"Sch 80 (XS)",3.200],
  [0.5,  "Sch 10",      1.651], [0.5,  "Sch 40 (Std)",2.769], [0.5,  "Sch 80 (XS)",3.734], [0.5,  "Sch 160",4.775], [0.5,  "XXS",7.468],
  [0.75, "Sch 10",      1.651], [0.75, "Sch 40 (Std)",2.870], [0.75, "Sch 80 (XS)",3.912], [0.75, "Sch 160",5.563], [0.75, "XXS",7.823],
  [1.0,  "Sch 10",      1.651], [1.0,  "Sch 40 (Std)",3.378], [1.0,  "Sch 80 (XS)",4.547], [1.0,  "Sch 160",6.350], [1.0,  "XXS",9.093],
  [1.25, "Sch 10",      1.651], [1.25, "Sch 40 (Std)",3.556], [1.25, "Sch 80 (XS)",4.851], [1.25, "Sch 160",6.350], [1.25, "XXS",9.703],
  [1.5,  "Sch 10",      1.651], [1.5,  "Sch 40 (Std)",3.683], [1.5,  "Sch 80 (XS)",5.080], [1.5,  "Sch 160",7.137], [1.5,  "XXS",10.160],
  [2.0,  "Sch 10",      1.651], [2.0,  "Sch 40 (Std)",3.912], [2.0,  "Sch 80 (XS)",5.537], [2.0,  "Sch 160",8.738], [2.0,  "XXS",11.074],
  [2.5,  "Sch 10",      2.108], [2.5,  "Sch 40 (Std)",5.156], [2.5,  "Sch 80 (XS)",7.010], [2.5,  "Sch 160",9.525], [2.5,  "XXS",14.021],
  [3.0,  "Sch 10",      2.108], [3.0,  "Sch 40 (Std)",5.486], [3.0,  "Sch 80 (XS)",7.620], [3.0,  "Sch 160",11.125],[3.0,  "XXS",15.240],
  [3.5,  "Sch 10",      2.108], [3.5,  "Sch 40 (Std)",5.740], [3.5,  "Sch 80 (XS)",8.081],
  [4.0,  "Sch 10",      2.108], [4.0,  "Sch 40 (Std)",6.020], [4.0,  "Sch 80 (XS)",8.560], [4.0,  "Sch 160",13.487],[4.0,  "XXS",17.120],
  [5.0,  "Sch 10",      2.769], [5.0,  "Sch 40 (Std)",6.553], [5.0,  "Sch 80 (XS)",9.525], [5.0,  "Sch 160",15.875],[5.0,  "XXS",19.050],
  [6.0,  "Sch 10",      2.769], [6.0,  "Sch 40 (Std)",7.112], [6.0,  "Sch 80 (XS)",10.973],[6.0,  "Sch 160",18.263],[6.0,  "XXS",21.945],
  [8.0,  "Sch 10",      2.769], [8.0,  "Sch 40 (Std)",8.179], [8.0,  "Sch 80 (XS)",12.700],[8.0,  "Sch 160",23.012],[8.0,  "XXS",22.225],
  [10.0, "Sch 10",      3.404], [10.0, "Sch 40 (Std)",9.271], [10.0, "Sch 80 (XS)",15.088],[10.0, "Sch 160",28.575],
  [12.0, "Sch 10",      3.962], [12.0, "Sch 40 (Std)",9.525], [12.0, "Sch 80 (XS)",12.700],[12.0, "Sch 160",33.325],
];

// [nps_in, schedule_label, wall_mm] — ASME B36.19M
const STAINLESS: [number, string, number][] = [
  [0.5,  "Sch 10S",1.651],[0.5,  "Sch 40S",2.769],[0.5,  "Sch 80S",3.734],
  [0.75, "Sch 10S",1.651],[0.75, "Sch 40S",2.870],[0.75, "Sch 80S",3.912],
  [1.0,  "Sch 10S",1.651],[1.0,  "Sch 40S",3.378],[1.0,  "Sch 80S",4.547],
  [1.25, "Sch 10S",1.651],[1.25, "Sch 40S",3.556],[1.25, "Sch 80S",4.851],
  [1.5,  "Sch 10S",1.651],[1.5,  "Sch 40S",3.683],[1.5,  "Sch 80S",5.080],
  [2.0,  "Sch 10S",1.651],[2.0,  "Sch 40S",3.912],[2.0,  "Sch 80S",5.537],
  [2.5,  "Sch 10S",2.108],[2.5,  "Sch 40S",5.156],[2.5,  "Sch 80S",7.010],
  [3.0,  "Sch 10S",2.108],[3.0,  "Sch 40S",5.486],[3.0,  "Sch 80S",7.620],
  [4.0,  "Sch 10S",2.108],[4.0,  "Sch 40S",6.020],[4.0,  "Sch 80S",8.560],
  [6.0,  "Sch 10S",2.769],[6.0,  "Sch 40S",7.112],[6.0,  "Sch 80S",10.973],
  [8.0,  "Sch 10S",2.769],[8.0,  "Sch 40S",8.179],[8.0,  "Sch 80S",12.700],
  [10.0, "Sch 10S",3.404],[10.0, "Sch 40S",9.271],[10.0, "Sch 80S",15.088],
  [12.0, "Sch 10S",3.962],[12.0, "Sch 40S",9.525],[12.0, "Sch 80S",12.700],
];

const CARBON_SCHEDS  = ["All","Sch 10","Sch 40 (Std)","Sch 80 (XS)","Sch 160","XXS"] as const;
const SS_SCHEDS      = ["All","Sch 10S","Sch 40S","Sch 80S"]                          as const;

// ── Derived row type ──────────────────────────────────────────────────────────
interface PipeRow {
  npsLabel: string;
  npsIn:    number;
  odMm:     number;
  schedule: string;
  wallMm:   number;
  idMm:     number;
  areaMm2:  number;
  wtKgM:    number;
}

function buildRows(data: [number, string, number][], densityKgM3 = 7850): PipeRow[] {
  return data.map(([npsIn, schedule, wallMm]) => {
    const odMm   = OD_MM[npsIn];
    const idMm   = odMm - 2 * wallMm;
    const areaMm2 = (Math.PI / 4) * idMm ** 2;
    const wtKgM   = (Math.PI / 4) * (odMm ** 2 - idMm ** 2) * densityKgM3 * 1e-6;
    return { npsLabel: NPS_LABEL[npsIn], npsIn, odMm, schedule, wallMm, idMm, areaMm2, wtKgM };
  });
}

const ALL_CARBON    = buildRows(CARBON, 7850);
const ALL_STAINLESS = buildRows(STAINLESS, 7900);

// ── Formatting helpers ────────────────────────────────────────────────────────
const mmToIn   = (mm: number)  => mm / 25.4;
const mm2ToIn2 = (mm2: number) => mm2 / 645.16;
const kgmToLbft= (kgm: number) => kgm * 0.67197;

function fmm(v: number, dp = 2) { return v.toFixed(dp); }
function fin (v: number, dp = 4) { return mmToIn(v).toFixed(dp); }

// ── Schedule badge colour ─────────────────────────────────────────────────────
const SCHED_COLOR: Record<string, string> = {
  "Sch 10":       "bg-sky-100   dark:bg-sky-900/40   text-sky-700   dark:text-sky-300",
  "Sch 10S":      "bg-sky-100   dark:bg-sky-900/40   text-sky-700   dark:text-sky-300",
  "Sch 40 (Std)": "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  "Sch 40S":      "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  "Sch 80 (XS)":  "bg-orange-100dark:bg-orange-900/40text-orange-700dark:text-orange-300",
  "Sch 80S":      "bg-orange-100dark:bg-orange-900/40text-orange-700dark:text-orange-300",
  "Sch 160":      "bg-red-100   dark:bg-red-900/40   text-red-700   dark:text-red-300",
  "XXS":          "bg-red-200   dark:bg-red-900/60   text-red-800   dark:text-red-200",
};

function SchedBadge({ label }: { label: string }) {
  const cls = SCHED_COLOR[label] ?? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
  return <span className={`text-xs px-1.5 py-0.5 rounded font-semibold whitespace-nowrap ${cls}`}>{label}</span>;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PipeSchedulePage() {
  type MatTab = "carbon" | "stainless";
  type Unit   = "metric" | "imperial";

  const [material,  setMaterial]  = useState<MatTab>("carbon");
  const [schedFilt, setSchedFilt] = useState("All");
  const [npsSearch, setNpsSearch] = useState("");
  const [unit,      setUnit]      = useState<Unit>("metric");

  const schedOptions = material === "carbon" ? CARBON_SCHEDS : SS_SCHEDS;

  const rows = useMemo<PipeRow[]>(() => {
    const base = material === "carbon" ? ALL_CARBON : ALL_STAINLESS;
    return base.filter((r) => {
      const matchSched = schedFilt === "All" || r.schedule === schedFilt;
      const q          = npsSearch.trim().toLowerCase();
      const matchNps   = !q || r.npsLabel.toLowerCase().includes(q) || r.npsIn.toString().includes(q);
      return matchSched && matchNps;
    });
  }, [material, schedFilt, npsSearch]);

  const handleMaterial = (m: MatTab) => {
    setMaterial(m);
    setSchedFilt("All");
  };

  const th = "px-3 py-2.5 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700";
  const td = "px-3 py-2 text-sm font-mono text-gray-700 dark:text-gray-300 whitespace-nowrap";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Pipe Schedule Reference
        </h1>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          Nominal pipe sizes, outside diameters, wall thicknesses, bore (ID), flow area, and steel
          weight per metre. Filter by schedule and search by NPS. Tap any row to copy its values.
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-xs px-2 py-1 bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 rounded">Pipe & Duct Systems</span>
          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">ASME B36.10M · B36.19M</span>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">

        {/* Material tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700/60 rounded-xl w-fit">
          {(["carbon","stainless"] as MatTab[]).map((m) => (
            <button key={m} onClick={() => handleMaterial(m)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                material === m
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}>
              {m === "carbon" ? "Carbon Steel (B36.10M)" : "Stainless Steel (B36.19M)"}
            </button>
          ))}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3">

          {/* NPS search */}
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={npsSearch}
              onChange={(e) => setNpsSearch(e.target.value)}
              placeholder='NPS e.g. "2" or "½"'
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
            />
          </div>

          {/* Schedule chips */}
          <div className="flex flex-wrap gap-1.5">
            {schedOptions.map((s) => (
              <button key={s} onClick={() => setSchedFilt(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                  schedFilt === s
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400"
                }`}>
                {s}
              </button>
            ))}
          </div>

          {/* Unit toggle — pushed right */}
          <div className="ml-auto flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-gray-700/60 rounded-lg">
            {(["metric","imperial"] as Unit[]).map((u) => (
              <button key={u} onClick={() => setUnit(u)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  unit === u
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                }`}>
                {u === "metric" ? "mm" : "inches"}
              </button>
            ))}
          </div>
        </div>

        {/* Row count */}
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Showing {rows.length} row{rows.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[620px]">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className={th}>NPS (in)</th>
                <th className={th}>OD {unit === "metric" ? "[mm]" : "[in]"}</th>
                <th className={th}>Schedule</th>
                <th className={th}>Wall {unit === "metric" ? "[mm]" : "[in]"}</th>
                <th className={th}>ID {unit === "metric" ? "[mm]" : "[in]"}</th>
                <th className={th}>Flow Area {unit === "metric" ? "[mm²]" : "[in²]"}</th>
                <th className={th}>{material === "carbon" ? "Wt [kg/m]" : "Wt [kg/m]"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                    No rows match your filter. Try clearing the NPS search or selecting &quot;All&quot; schedules.
                  </td>
                </tr>
              ) : rows.map((r, i) => {
                const isEven = i % 2 === 0;
                return (
                  <tr key={`${r.npsIn}-${r.schedule}`}
                    className={`transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-default ${
                      isEven ? "bg-white dark:bg-gray-800" : "bg-gray-50/60 dark:bg-gray-800/40"
                    }`}>
                    <td className={`${td} font-semibold text-gray-900 dark:text-white`}>{r.npsLabel}</td>
                    <td className={td}>
                      {unit === "metric" ? fmm(r.odMm, 3) : fin(r.odMm, 4)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <SchedBadge label={r.schedule} />
                    </td>
                    <td className={td}>{unit === "metric" ? fmm(r.wallMm, 3) : fin(r.wallMm, 4)}</td>
                    <td className={`${td} font-semibold`}>{unit === "metric" ? fmm(r.idMm, 3) : fin(r.idMm, 4)}</td>
                    <td className={td}>
                      {unit === "metric"
                        ? fmm(r.areaMm2, 1)
                        : mm2ToIn2(r.areaMm2).toFixed(4)}
                    </td>
                    <td className={td}>
                      {unit === "metric"
                        ? r.wtKgM.toFixed(2)
                        : kgmToLbft(r.wtKgM).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-xs text-gray-500 dark:text-gray-400 space-y-1.5">
        <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm mb-2">Notes</p>
        <p>· <strong>ASME B36.10M</strong> covers welded and seamless wrought steel pipe (carbon, alloy, and austenitic stainless). OD and wall tolerances per the standard apply.</p>
        <p>· <strong>ASME B36.19M</strong> covers stainless steel pipe. Schedules carry the &quot;S&quot; suffix (10S, 40S, 80S) and share the same OD as B36.10M for NPS ≤ 12&quot;.</p>
        <p>· <strong>Std / XS / XXS</strong>: for NPS ≤ 8&quot;, Sch 40 = Standard (Std) and Sch 80 = Extra Strong (XS). For larger sizes they diverge. XXS (Double Extra Strong) is defined only up to NPS 8&quot; for most materials.</p>
        <p>· For NPS 8&quot;, XXS wall (22.225 mm) is thinner than Sch 160 (23.012 mm) — this is correct per B36.10M.</p>
        <p>· <strong>Weight</strong> calculated for steel density 7 850 kg/m³ (carbon) and 7 900 kg/m³ (stainless). Does not include fluid content or external coatings.</p>
        <p>· <strong>Flow area</strong> is the internal bore area (π/4 × ID²). Actual flow capacity depends on roughness, fittings, and system design.</p>
      </div>

      <References refs={REFS_PIPE_SCHEDULE} />
    </div>
  );
}
