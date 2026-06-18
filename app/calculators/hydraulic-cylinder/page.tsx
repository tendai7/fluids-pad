"use client";

import React, { useState } from "react";
import { References } from "@/components/References";
import { REFS_HYDRAULIC_CYLINDER } from "@/lib/references";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number, sig = 4) => parseFloat(n.toPrecision(sig)).toString();

type PresUnit = "Pa" | "kPa" | "bar" | "MPa" | "psi";
type DiamUnit = "mm" | "in";
type ForceUnit = "N" | "kN" | "lbf" | "tonf";
type FlowUnit  = "L/min" | "m³/min" | "GPM";
type VelUnit   = "m/s" | "mm/s" | "in/s" | "ft/min";
type PowerUnit = "W" | "kW" | "hp";

const TO_PA:   Record<PresUnit, number>  = { Pa: 1, kPa: 1e3, bar: 1e5, MPa: 1e6, psi: 6894.76 };
const TO_M:    Record<DiamUnit, number>  = { mm: 1e-3, in: 0.0254 };
const N_TO:    Record<ForceUnit, number> = { N: 1, kN: 1e-3, lbf: 0.22481, tonf: 1 / 9964.02 };
const M3S_TO:  Record<FlowUnit, number>  = { "L/min": 6e4, "m³/min": 60, GPM: 15850.3 };
const MS_TO:   Record<VelUnit, number>   = { "m/s": 1, "mm/s": 1e3, "in/s": 39.3701, "ft/min": 196.85 };
const W_TO:    Record<PowerUnit, number> = { W: 1, kW: 1e-3, hp: 1 / 745.7 };

// ── Solve modes ───────────────────────────────────────────────────────────────
type SolveFor = "force" | "pressure" | "flow" | "power";

interface Result {
  // Geometry
  bore_m: number;
  rod_m:  number;
  A_full: number;   // m²
  A_ann:  number;   // m²
  // Extend
  F_ext:  number;   // N
  Q_ext:  number;   // m³/s
  P_ext:  number;   // Pa
  v_ext:  number;   // m/s
  pow_ext: number;  // W
  // Retract
  F_ret:  number;
  Q_ret:  number;
  P_ret:  number;
  v_ret:  number;
  pow_ret: number;
  // Line velocity (at given line diameter)
  v_line?: number;  // m/s
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HydraulicCylinderPage() {
  // Cylinder geometry
  const [bore,    setBore]    = useState("100");  // mm bore diameter
  const [rod,     setRod]     = useState("50");   // mm rod diameter
  const [diamUnit, setDiamUnit] = useState<DiamUnit>("mm");

  // Operating inputs — only two of the three (pressure / velocity / flow) needed;
  // we ask for pressure + either speed or flow, then derive everything else.
  const [preStr,  setPreStr]  = useState("200");  // supply pressure
  const [preUnit, setPreUnit] = useState<PresUnit>("bar");
  const [velStr,  setVelStr]  = useState("0.1");  // piston speed m/s
  const [velUnit, setVelUnit] = useState<VelUnit>("m/s");

  // Output units
  const [forceUnit, setForceUnit] = useState<ForceUnit>("kN");
  const [flowUnit,  setFlowUnit]  = useState<FlowUnit>("L/min");
  const [powerUnit, setPowerUnit] = useState<PowerUnit>("kW");

  // Optional: hydraulic line diameter for line velocity
  const [lineStr,  setLineStr]  = useState("25");
  const [showLine, setShowLine] = useState(false);

  const [result, setResult] = useState<Result | null>(null);
  const [error,  setError]  = useState("");

  function calculate() {
    setError("");
    const bore_m = parseFloat(bore) * TO_M[diamUnit];
    const rod_m  = parseFloat(rod)  * TO_M[diamUnit];
    const P_Pa   = parseFloat(preStr)  * TO_PA[preUnit];
    const v_ms   = parseFloat(velStr)  * (1 / MS_TO[velUnit]);  // convert to m/s

    if ([bore_m, rod_m, P_Pa, v_ms].some(isNaN) ||
        bore_m <= 0 || P_Pa <= 0 || v_ms <= 0) {
      setError("All inputs must be positive numbers.");
      return;
    }
    if (rod_m >= bore_m / 2) {
      setError("Rod diameter must be less than bore diameter.");
      return;
    }

    const A_full = Math.PI / 4 * bore_m ** 2;  // full bore area
    const A_ann  = A_full - Math.PI / 4 * rod_m ** 2; // annulus area (retract side)

    // Extend: full bore area drives the piston
    const F_ext   = P_Pa * A_full;
    const Q_ext   = A_full * v_ms;           // m³/s
    const pow_ext = P_Pa * Q_ext;            // W (= F × v)
    const v_ext   = v_ms;

    // Retract: annulus area (rod side pressurised)
    // Same pressure on annulus → different force, same rod speed if same flow
    // OR: if same pressure supplied, speed on retract = Q_ext / A_ann (ratio extends it)
    const v_ret   = Q_ext / A_ann;           // faster stroke (same flow)
    const F_ret   = P_Pa * A_ann;
    const Q_ret   = Q_ext;                   // same pump flow
    const pow_ret = P_Pa * Q_ret;

    let v_line: number | undefined;
    if (showLine) {
      const d_line = parseFloat(lineStr) * TO_M[diamUnit];
      if (!isNaN(d_line) && d_line > 0) {
        const A_line = Math.PI / 4 * d_line ** 2;
        v_line = Q_ext / A_line;
      }
    }

    setResult({ bore_m, rod_m, A_full, A_ann, F_ext, Q_ext, P_ext: P_Pa, v_ext, pow_ext, F_ret, Q_ret, P_ret: P_Pa, v_ret, pow_ret, v_line });
  }

  const r = result;

  function fF(N: number)  { return `${fmt(N * N_TO[forceUnit], 4)} ${forceUnit}`; }
  function fQ(m3s: number){ return `${fmt(m3s * M3S_TO[flowUnit], 4)} ${flowUnit}`; }
  function fP(Pa: number) { return `${fmt(Pa / TO_PA[preUnit], 4)} ${preUnit}`; }
  function fV(ms: number) { return `${fmt(ms * MS_TO[velUnit], 4)} ${velUnit}`; }
  function fW(W: number)  { return `${fmt(W * W_TO[powerUnit], 4)} ${powerUnit}`; }

  const LINE_WARN = r?.v_line !== undefined && r.v_line > 4;
  const LINE_HIGH = r?.v_line !== undefined && r.v_line > 6;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Hydraulic Cylinder & Power
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Force, speed, flow rate, and power for extend and retract strokes. Includes line velocity check.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-6">

        {/* Geometry */}
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Cylinder geometry</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Bore diameter</label>
              <input type="number" value={bore} onChange={(e) => setBore(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Rod diameter</label>
              <input type="number" value={rod} onChange={(e) => setRod(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex flex-col justify-end">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Unit</label>
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-sm">
                {(["mm", "in"] as const).map((u) => (
                  <button key={u} onClick={() => setDiamUnit(u)}
                    className={`flex-1 py-2 font-medium transition-colors ${diamUnit === u
                      ? "bg-blue-500 text-white"
                      : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"}`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Operating conditions */}
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Operating conditions</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Supply pressure</label>
              <div className="flex gap-2">
                <input type="number" value={preStr} onChange={(e) => setPreStr(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-l-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={preUnit} onChange={(e) => setPreUnit(e.target.value as PresUnit)}
                  className="px-2 py-2 text-sm rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {(Object.keys(TO_PA) as PresUnit[]).map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Piston speed (extend)</label>
              <div className="flex gap-2">
                <input type="number" value={velStr} onChange={(e) => setVelStr(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-l-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={velUnit} onChange={(e) => setVelUnit(e.target.value as VelUnit)}
                  className="px-2 py-2 text-sm rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {(Object.keys(MS_TO) as VelUnit[]).map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Output units */}
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Output units</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400 text-xs font-semibold">Force</span>
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                {(["N", "kN", "lbf", "tonf"] as const).map((u) => (
                  <button key={u} onClick={() => setForceUnit(u)}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors ${forceUnit === u
                      ? "bg-blue-500 text-white"
                      : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"}`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400 text-xs font-semibold">Flow</span>
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                {(["L/min", "m³/min", "GPM"] as const).map((u) => (
                  <button key={u} onClick={() => setFlowUnit(u)}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors ${flowUnit === u
                      ? "bg-blue-500 text-white"
                      : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"}`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400 text-xs font-semibold">Power</span>
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                {(["W", "kW", "hp"] as const).map((u) => (
                  <button key={u} onClick={() => setPowerUnit(u)}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors ${powerUnit === u
                      ? "bg-blue-500 text-white"
                      : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"}`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Optional line check */}
        <section>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={showLine} onChange={(e) => setShowLine(e.target.checked)}
              className="rounded" />
            Check hydraulic line velocity
          </label>
          {showLine && (
            <div className="mt-2 flex gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Line internal diameter ({diamUnit})</label>
                <input type="number" value={lineStr} onChange={(e) => setLineStr(e.target.value)}
                  className="w-32 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          )}
        </section>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button onClick={calculate}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
          Calculate
        </button>
      </div>

      {/* Results */}
      {r && (
        <div className="space-y-4">
          {/* Line velocity warning */}
          {LINE_WARN && r.v_line !== undefined && (
            <div className={`rounded-xl px-4 py-3 text-sm ${LINE_HIGH
              ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
              : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"}`}>
              {LINE_HIGH ? "⛔" : "⚠"} Line velocity {fmt(r.v_line, 3)} m/s exceeds the recommended maximum
              ({LINE_HIGH ? "6 m/s for pressure lines — erosion risk" : "4 m/s for return lines"}).
              Increase line diameter.
            </div>
          )}

          {/* Comparison table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="grid grid-cols-3 text-center text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="p-3">Parameter</div>
              <div className="p-3 border-l border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400">Extend (push)</div>
              <div className="p-3 border-l border-gray-200 dark:border-gray-700 text-indigo-600 dark:text-indigo-400">Retract (pull)</div>
            </div>
            {[
              { label: "Effective area", ext: `${fmt(r.A_full * 1e4, 4)} cm²`, ret: `${fmt(r.A_ann * 1e4, 4)} cm²` },
              { label: "Force",          ext: fF(r.F_ext),   ret: fF(r.F_ret) },
              { label: "Piston speed",   ext: fV(r.v_ext),   ret: fV(r.v_ret) },
              { label: "Flow required",  ext: fQ(r.Q_ext),   ret: fQ(r.Q_ret) },
              { label: "Hydraulic power",ext: fW(r.pow_ext), ret: fW(r.pow_ret) },
            ].map(({ label, ext, ret }, i) => (
              <div key={i} className={`grid grid-cols-3 text-sm ${i < 4 ? "border-b border-gray-100 dark:border-gray-700" : ""}`}>
                <div className="p-3 font-medium text-gray-700 dark:text-gray-300">{label}</div>
                <div className="p-3 border-l border-gray-200 dark:border-gray-700 font-mono text-gray-800 dark:text-gray-200 text-center">{ext}</div>
                <div className="p-3 border-l border-gray-200 dark:border-gray-700 font-mono text-gray-800 dark:text-gray-200 text-center">{ret}</div>
              </div>
            ))}
          </div>

          {/* Line velocity result */}
          {r.v_line !== undefined && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${
              r.v_line > 6
                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
                : r.v_line > 4
                ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300"
            }`}>
              <span className="font-semibold">Line velocity:</span> <span className="font-mono">{fmt(r.v_line, 3)} m/s</span>
              {r.v_line <= 4 ? " ✓ Within limit (≤ 4 m/s for return lines, ≤ 6 m/s for pressure lines)" : ""}
            </div>
          )}

          {/* Formula note */}
          <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p><strong>Extend:</strong> F = P × A_bore,  Q = A_bore × v,  Power = P × Q</p>
            <p><strong>Retract:</strong> F = P × A_ann,  v_ret = Q / A_ann  (same pump flow, faster stroke due to smaller area)</p>
            <p>Area ratio A_bore / A_ann = {fmt(r.A_full / r.A_ann, 3)} — retract stroke is {fmt(r.A_full / r.A_ann, 3)}× faster.</p>
          </div>
        </div>
      )}

      <div className="mt-8 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-4">
        Results assume ideal (lossless) cylinder with 100 % volumetric efficiency. Deduct ~15–20 % for mechanical and volumetric losses in real systems.
        Recommended line velocities: suction ≤ 1.5 m/s, return ≤ 4 m/s, pressure ≤ 6 m/s.
      </div>
      <References refs={REFS_HYDRAULIC_CYLINDER} />
    </div>
  );
}