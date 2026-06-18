"use client";

import React, { useState } from "react";
import { References } from "@/components/References";
import { REFS_PIPE_INSULATION } from "@/lib/references";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number, sig = 4) => parseFloat(n.toPrecision(sig)).toString();

function ClearBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors ml-2">
      Clear
    </button>
  );
}

// ── Insulation materials ──────────────────────────────────────────────────────
const INSUL_MATERIALS = [
  { label: "Mineral wool / rock wool",        k: 0.040 },
  { label: "Glass wool (fibreglass)",          k: 0.038 },
  { label: "Calcium silicate",                k: 0.060 },
  { label: "Polyurethane foam (PUR)",         k: 0.026 },
  { label: "Expanded polystyrene (EPS)",      k: 0.036 },
  { label: "Extruded polystyrene (XPS)",      k: 0.030 },
  { label: "Elastomeric foam (Armaflex)",     k: 0.036 },
  { label: "Cellular glass (Foamglas)",       k: 0.040 },
  { label: "Aerogel blanket",                 k: 0.015 },
  { label: "Custom",                          k: NaN   },
];

// ── Pipe materials ─────────────────────────────────────────────────────────────
const PIPE_MATERIALS = [
  { label: "Carbon steel",    k: 50  },
  { label: "Stainless steel", k: 16  },
  { label: "Copper",          k: 386 },
  { label: "PVC",             k: 0.16},
  { label: "PE (HDPE)",       k: 0.38},
];

// ── Types ─────────────────────────────────────────────────────────────────────
type LenUnit  = "m" | "ft";
type TempUnit = "C" | "F";
type ThickUnit= "mm" | "in";
type HeatUnit = "W/m" | "BTU/hr·ft";

interface Result {
  Q_Wm: number;       // heat loss per metre [W/m]
  Q_total_W: number;  // total heat loss [W]
  R_pipe: number;     // cylindrical resistance of pipe wall [m·K/W]
  R_insul: number;    // cylindrical resistance of insulation [m·K/W]
  R_conv: number;     // convective resistance on outer surface [m·K/W]
  R_total: number;    // total [m·K/W]
  T_inner_C: number;
  T_amb_C: number;
  dT: number;
  OD_m: number;
  insul_OD_m: number;
  condensation: boolean;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PipeInsulationPage() {
  // Geometry
  const [od, setOd]           = useState("114.3");   // mm (DN100 Sch 40)
  const [wall, setWall]       = useState("6.02");    // mm
  const [thickStr, setThick]  = useState("50");      // insulation thickness mm
  const [lenStr, setLen]      = useState("10");      // pipe length
  const [lenUnit, setLenUnit] = useState<LenUnit>("m");
  const [thickUnit, setThickUnit] = useState<ThickUnit>("mm");

  // Temperatures
  const [tInner, setTInner]   = useState("80");
  const [tAmb, setTAmb]       = useState("20");
  const [tUnit, setTUnit]     = useState<TempUnit>("C");

  // Materials
  const [insulIdx, setInsulIdx]   = useState(0);
  const [customK, setCustomK]     = useState("0.040");
  const [pipeIdx, setPipeIdx]     = useState(0);

  // Convection
  const [hStr, setHStr]       = useState("10");     // W/m²·K outer surface (still air ≈ 10)

  // Output unit
  const [heatUnit, setHeatUnit] = useState<HeatUnit>("W/m");

  const [result, setResult]   = useState<Result | null>(null);
  const [error, setError]     = useState("");

  function toC(v: number) { return tUnit === "F" ? (v - 32) / 1.8 : v; }

  function calculate() {
    setError("");

    const OD_mm   = parseFloat(od);
    const wall_mm = parseFloat(wall);
    const len_m   = parseFloat(lenStr) * (lenUnit === "ft" ? 0.3048 : 1);
    const thick_mm= parseFloat(thickStr) * (thickUnit === "in" ? 25.4 : 1);
    const T_i     = toC(parseFloat(tInner));
    const T_a     = toC(parseFloat(tAmb));
    const h       = parseFloat(hStr);
    const k_pipe  = PIPE_MATERIALS[pipeIdx].k;
    const insul   = INSUL_MATERIALS[insulIdx];
    const k_ins   = insul.label === "Custom" ? parseFloat(customK) : insul.k;

    if ([OD_mm, wall_mm, len_m, thick_mm, T_i, T_a, h, k_ins].some(isNaN) ||
        OD_mm <= 0 || wall_mm <= 0 || len_m <= 0 || thick_mm <= 0 || h <= 0 || k_ins <= 0) {
      setError("All inputs must be positive numbers.");
      return;
    }
    if (wall_mm * 2 >= OD_mm) {
      setError("Wall thickness must be less than pipe radius.");
      return;
    }

    const r1 = (OD_mm / 2 - wall_mm) / 1000; // inner radius of pipe [m]
    const r2 = OD_mm / 2 / 1000;               // outer radius of pipe [m]
    const r3 = r2 + thick_mm / 1000;           // outer radius of insulation [m]

    // Cylindrical thermal resistances per unit length [m·K/W]
    const R_pipe  = Math.log(r2 / r1) / (2 * Math.PI * k_pipe);
    const R_insul = Math.log(r3 / r2) / (2 * Math.PI * k_ins);
    const R_conv  = 1 / (2 * Math.PI * r3 * h);
    const R_total = R_pipe + R_insul + R_conv;

    const dT     = T_i - T_a;
    const Q_Wm   = dT / R_total;           // W/m
    const Q_total= Q_Wm * len_m;           // W

    // Condensation risk: outer surface temperature < dew point estimate
    // Simple check: T_outer < T_amb when pipe is cold (chilled water, refrigerant)
    const T_outer = T_a + Q_Wm * R_conv;
    const condensation = T_i < T_a && T_outer < T_a;

    setResult({
      Q_Wm, Q_total_W: Q_total,
      R_pipe, R_insul, R_conv, R_total,
      T_inner_C: T_i, T_amb_C: T_a, dT,
      OD_m: OD_mm / 1000, insul_OD_m: r3 * 2,
      condensation,
    });
  }

  const r = result;

  function fmtQ(Wm: number) {
    if (heatUnit === "W/m") return `${fmt(Wm, 4)} W/m`;
    return `${fmt(Wm * 1.0416, 4)} BTU/hr·ft`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Pipe Insulation Heat Loss
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Heat loss per metre and total loss for bare or insulated pipes using the cylindrical resistance model.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-6">

        {/* Pipe geometry */}
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Pipe geometry</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">OD (mm)</label>
              <input type="number" value={od} onChange={(e) => setOd(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Wall (mm)</label>
              <input type="number" value={wall} onChange={(e) => setWall(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Insul. thickness
              </label>
              <div className="flex gap-1">
                <input type="number" value={thickStr} onChange={(e) => setThick(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 text-sm rounded-l-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={thickUnit} onChange={(e) => setThickUnit(e.target.value as ThickUnit)}
                  className="px-2 py-2 text-sm rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>mm</option><option>in</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Pipe length
              </label>
              <div className="flex gap-1">
                <input type="number" value={lenStr} onChange={(e) => setLen(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 text-sm rounded-l-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={lenUnit} onChange={(e) => setLenUnit(e.target.value as LenUnit)}
                  className="px-2 py-2 text-sm rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>m</option><option>ft</option>
                </select>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Set insulation thickness to 0 for a bare pipe (no insulation layer).
          </p>
        </section>

        {/* Temperatures */}
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Temperatures</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Inner pipe surface</label>
              <input type="number" value={tInner} onChange={(e) => setTInner(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Ambient</label>
              <input type="number" value={tAmb} onChange={(e) => setTAmb(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex flex-col justify-end">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Unit</label>
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-sm">
                {(["C", "F"] as const).map((u) => (
                  <button key={u} onClick={() => setTUnit(u)}
                    className={`flex-1 py-2 font-medium transition-colors ${tUnit === u
                      ? "bg-blue-500 text-white"
                      : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"}`}>
                    °{u}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Materials */}
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Materials</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Pipe material</label>
              <select value={pipeIdx} onChange={(e) => setPipeIdx(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {PIPE_MATERIALS.map((m, i) => <option key={i} value={i}>{m.label} (k = {m.k} W/m·K)</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Insulation type</label>
              <select value={insulIdx} onChange={(e) => setInsulIdx(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {INSUL_MATERIALS.map((m, i) => (
                  <option key={i} value={i}>
                    {m.label}{!isNaN(m.k) ? ` (k = ${m.k} W/m·K)` : ""}
                  </option>
                ))}
              </select>
            </div>
            {INSUL_MATERIALS[insulIdx].label === "Custom" && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Custom k (W/m·K)</label>
                <input type="number" value={customK} onChange={(e) => setCustomK(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
          </div>
        </section>

        {/* Outer convection */}
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Outer surface convection</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">h (W/m²·K)</label>
              <input type="number" value={hStr} onChange={(e) => setHStr(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {[["Still air", "10"], ["Light air movement", "20"], ["Outdoor wind ~3 m/s", "35"], ["Outdoor wind ~7 m/s", "60"]].map(([label, val]) => (
              <button key={val} onClick={() => setHStr(val)}
                className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                {label} ({val})
              </button>
            ))}
          </div>
        </section>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex items-center gap-3">
          <button onClick={calculate}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
            Calculate
          </button>
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-sm">
            {(["W/m", "BTU/hr·ft"] as const).map((u) => (
              <button key={u} onClick={() => setHeatUnit(u)}
                className={`px-3 py-1.5 font-medium transition-colors ${heatUnit === u
                  ? "bg-blue-500 text-white"
                  : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"}`}>
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {r && (
        <div className="space-y-4">
          {/* Condensation warning */}
          {r.condensation && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              ⚠ Cold pipe below ambient: check that insulation thickness is sufficient to keep the outer surface above the local dew point to prevent condensation.
            </div>
          )}

          {/* Key results */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-1 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
              <p className="text-xs font-semibold text-blue-500 dark:text-blue-400 mb-1">Heat loss per metre</p>
              <p className="text-2xl font-bold font-mono text-blue-700 dark:text-blue-300">{fmtQ(r.Q_Wm)}</p>
              {heatUnit === "W/m" && <p className="text-xs text-blue-500 dark:text-blue-400 font-mono mt-0.5">{fmt(r.Q_Wm * 1.0416, 4)} BTU/hr·ft</p>}
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Total heat loss</p>
              <p className="text-xl font-bold font-mono text-gray-900 dark:text-gray-100">{fmt(r.Q_total_W, 4)} W</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{fmt(r.Q_total_W / 1000, 3)} kW</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">ΔT</p>
              <p className="text-xl font-bold font-mono text-gray-900 dark:text-gray-100">{fmt(r.dT, 4)} K</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {r.T_inner_C > r.T_amb_C ? "Heat loss (pipe → ambient)" : "Heat gain (ambient → pipe)"}
              </p>
            </div>
          </div>

          {/* Resistance breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">Thermal resistance breakdown (per metre)</p>
            <div className="space-y-3">
              {[
                { label: "Pipe wall", R: r.R_pipe,  pct: r.R_pipe / r.R_total * 100 },
                { label: "Insulation", R: r.R_insul, pct: r.R_insul / r.R_total * 100 },
                { label: "Outer convection (h)", R: r.R_conv, pct: r.R_conv / r.R_total * 100 },
              ].map(({ label, R, pct }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{label}</span>
                    <span className="font-mono text-gray-600 dark:text-gray-400">{fmt(R, 3)} m·K/W ({fmt(pct, 3)} %)</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              ))}
              <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-700 pt-2 mt-1">
                <span className="font-semibold text-gray-800 dark:text-gray-200">Total</span>
                <span className="font-mono font-bold text-gray-900 dark:text-gray-100">{fmt(r.R_total, 3)} m·K/W</span>
              </div>
            </div>
          </div>

          {/* Formula */}
          <details className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <summary className="px-5 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">Formula — cylindrical resistance model</summary>
            <div className="px-5 pb-5 text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p className="font-mono bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-xs leading-relaxed">
                Q/L = ΔT / R_total<br/>
                R_total = ln(r₂/r₁)/(2πk_pipe) + ln(r₃/r₂)/(2πk_ins) + 1/(2πr₃·h)
              </p>
              <p>where r₁ = inner bore radius, r₂ = pipe outer radius, r₃ = insulation outer radius.</p>
              <p>Computed values: r₂ = {fmt(r.OD_m * 500, 3)} mm → {fmt(r.OD_m / 2, 4)} m, r₃ = {fmt(r.insul_OD_m * 500, 3)} mm → {fmt(r.insul_OD_m / 2, 4)} m</p>
            </div>
          </details>
        </div>
      )}

      <div className="mt-8 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-4">
        Thermal conductivity values at typical service temperatures. Insulation k increases with temperature — use manufacturer data for precise designs.
        The model assumes steady-state, no moisture ingress, and uniform insulation. Pipe wall resistance is negligible for metal pipes but included for completeness.
      </div>

      <References refs={REFS_PIPE_INSULATION} />
    </div>
  );
}
