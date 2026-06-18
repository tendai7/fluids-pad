"use client";

import React, { useState, useId } from "react";
import { References } from "@/components/References";
import { REFS_PIPE_RUN } from "@/lib/references";

// ── Physics ───────────────────────────────────────────────────────────────────
function colebrook(Re: number, eD: number): number {
  if (Re < 2300) return 64 / Re;
  let f = 0.02;
  for (let i = 0; i < 50; i++) {
    const r = -2 * Math.log10(eD / 3.7 + 2.51 / (Re * Math.sqrt(f)));
    const fn = 1 / (r * r);
    if (Math.abs(fn - f) < 1e-10) { f = fn; break; }
    f = fn;
  }
  return f;
}

function flowRegime(Re: number) {
  if (Re < 2300) return { label: "Laminar",       color: "text-green-600 dark:text-green-400",  bg: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" };
  if (Re < 4000) return { label: "Transitional",  color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" };
  return              { label: "Turbulent",       color: "text-red-600 dark:text-red-400",      bg: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" };
}

// ── Data ──────────────────────────────────────────────────────────────────────
const FLUID_PRESETS = [
  { label: "Water 20°C",         rho: 998.2, mu: 1.002e-3 },
  { label: "Water 60°C",         rho: 983.2, mu: 0.467e-3 },
  { label: "Water 80°C",         rho: 971.8, mu: 0.355e-3 },
  { label: "Air 20°C",           rho: 1.204, mu: 1.813e-5 },
  { label: "Diesel",             rho: 840,   mu: 3.0e-3   },
  { label: "Light crude oil",    rho: 870,   mu: 15e-3    },
  { label: "EG 50% antifreeze",  rho: 1049,  mu: 2.23e-3  },
  { label: "Seawater 20°C",      rho: 1023,  mu: 1.07e-3  },
];

const PIPE_MATERIALS = [
  { label: "Commercial / wrought steel",  eps: 0.046 },
  { label: "Galvanised steel",            eps: 0.15  },
  { label: "Cast iron (unlined)",         eps: 0.26  },
  { label: "Stainless steel",             eps: 0.015 },
  { label: "Drawn copper / brass",        eps: 0.0015},
  { label: "PVC / HDPE (smooth)",         eps: 0.0015},
  { label: "Concrete (smooth float)",     eps: 0.30  },
  { label: "Concrete (rough)",            eps: 3.0   },
  { label: "Custom (enter ε below)",      eps: NaN   },
];

const FITTINGS = [
  // Elbows
  { g: "Elbows",         label: "90° elbow — standard (screwed)",        K: 2.0  },
  { g: "Elbows",         label: "90° elbow — standard (flanged)",         K: 0.9  },
  { g: "Elbows",         label: "90° elbow — long-radius R/D = 1.5",     K: 0.4  },
  { g: "Elbows",         label: "45° elbow",                              K: 0.4  },
  { g: "Elbows",         label: "180° return bend",                       K: 1.5  },
  // Tees
  { g: "Tees",           label: "Tee — flow through run (flanged)",       K: 0.6  },
  { g: "Tees",           label: "Tee — flow through branch (flanged)",    K: 1.8  },
  { g: "Tees",           label: "Tee — flow through run (screwed)",       K: 0.9  },
  { g: "Tees",           label: "Tee — flow through branch (screwed)",    K: 2.4  },
  // Valves
  { g: "Valves",         label: "Gate valve (fully open)",                K: 0.2  },
  { g: "Valves",         label: "Globe valve (fully open)",               K: 10.0 },
  { g: "Valves",         label: "Ball valve (fully open)",                K: 0.1  },
  { g: "Valves",         label: "Butterfly valve (fully open)",           K: 0.6  },
  { g: "Valves",         label: "Check valve — swing",                    K: 2.5  },
  { g: "Valves",         label: "Check valve — lift",                     K: 12.0 },
  { g: "Valves",         label: "Foot valve with strainer",               K: 15.0 },
  { g: "Valves",         label: "Angle valve (fully open)",               K: 5.0  },
  // Entries / exits
  { g: "Entries/Exits",  label: "Sharp-edged entry (Borda)",              K: 0.5  },
  { g: "Entries/Exits",  label: "Well-rounded entry",                     K: 0.04 },
  { g: "Entries/Exits",  label: "Re-entrant (flush) entry",               K: 0.8  },
  { g: "Entries/Exits",  label: "Sharp exit (all geometries)",            K: 1.0  },
  // Other
  { g: "Other",          label: "Sudden contraction (A₂/A₁ ≈ 0.5)",     K: 0.25 },
  { g: "Other",          label: "Sudden expansion (A₂/A₁ ≈ 2)",         K: 0.56 },
  { g: "Other",          label: "Strainer / Y-filter",                   K: 2.0  },
  { g: "Other",          label: "Orifice plate (β = 0.7)",               K: 1.8  },
  { g: "Other",          label: "Custom (enter K below)",                K: NaN  },
];

// ── Units ─────────────────────────────────────────────────────────────────────
type FlowUnit = "m³/s" | "m³/h" | "L/s" | "L/min" | "GPM";
type DiamUnit = "mm" | "in";
type LenUnit  = "m"   | "ft";
type PresUnit = "Pa" | "kPa" | "bar" | "psi" | "mH₂O";

const FLOW_M3S: Record<FlowUnit, number> = { "m³/s": 1, "m³/h": 1/3600, "L/s": 1e-3, "L/min": 1/60000, GPM: 6.30902e-5 };
const DIAM_M:  Record<DiamUnit, number>  = { mm: 1e-3, in: 0.0254 };
const LEN_M:   Record<LenUnit, number>   = { m: 1, ft: 0.3048 };
const PA_DISP: Record<PresUnit, number>  = { Pa: 1, kPa: 1e-3, bar: 1e-5, psi: 1/6894.76, "mH₂O": 1/9806.65 };

// ── Types ─────────────────────────────────────────────────────────────────────
interface Fitting { fitIdx: number; qty: string; customK: string; }
interface Segment {
  id: string; name: string;
  diam: string; diamUnit: DiamUnit;
  len: string;  lenUnit: LenUnit;
  matIdx: number; customEps: string;
  elev: string;   // elevation rise over segment (m), + = uphill
  fittings: Fitting[];
}

interface SegResult {
  name: string;
  D_m: number; A_m2: number;
  vel: number; Re: number; regime: string;
  f: number; eD: number;
  dP_fric: number; dP_minor: number; dP_elev: number; dP_seg: number;
  cumP: number;
  warnings: string[];
}

interface RunResult {
  segs: SegResult[];
  totalDP: number;
  rho: number; Q: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt  = (n: number, d = 4) => parseFloat(n.toPrecision(d)).toString();
const G = 9.81;

// ── Bar chart ─────────────────────────────────────────────────────────────────
function BarChart({ segs, presUnit }: { segs: SegResult[]; presUnit: PresUnit }) {
  const scale = PA_DISP[presUnit];
  const maxDP = Math.max(...segs.map((s) => s.dP_seg), 1);
  const BAR_W = 480, BAR_H = Math.max(segs.length * 36 + 50, 100);
  const ML = 110, MR = 80, MT = 20, MB = 30;
  const PW = BAR_W - ML - MR;
  const barH = 18, gap = 18;

  return (
    <svg viewBox={`0 0 ${BAR_W} ${BAR_H}`} className="w-full" style={{ fontFamily: "sans-serif" }}>
      {segs.map((s, i) => {
        const y = MT + i * (barH + gap);
        const wFric  = (s.dP_fric  / maxDP) * PW;
        const wMinor = (s.dP_minor / maxDP) * PW;
        const wElev  = Math.max(0, s.dP_elev / maxDP) * PW;
        const total  = wFric + wMinor + wElev;
        return (
          <g key={s.name}>
            <text x={ML - 4} y={y + barH / 2 + 4} fontSize={9} textAnchor="end" fill="#374151">{s.name}</text>
            <rect x={ML}           y={y} width={wFric}  height={barH} fill="#3b82f6" rx={2} />
            <rect x={ML + wFric}   y={y} width={wMinor} height={barH} fill="#f59e0b" rx={2} />
            <rect x={ML + wFric + wMinor} y={y} width={wElev} height={barH} fill="#a78bfa" rx={2} />
            <text x={ML + total + 4} y={y + barH / 2 + 4} fontSize={9} fill="#6b7280">
              {fmt(s.dP_seg * scale, 3)} {presUnit}
            </text>
          </g>
        );
      })}
      {/* Legend */}
      {[["#3b82f6","Friction"],["#f59e0b","Fittings"],["#a78bfa","Elevation"]].map(([c, lbl], i) => (
        <g key={lbl}>
          <rect x={ML + i * 100} y={BAR_H - MB + 6} width={10} height={10} fill={c} rx={2} />
          <text x={ML + i * 100 + 13} y={BAR_H - MB + 15} fontSize={9} fill="#374151">{lbl}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PipeRunPage() {
  const uid = useId();

  // Fluid
  const [rhoStr, setRho]   = useState("998.2");
  const [muStr,  setMu]    = useState("0.001002");

  // Flow
  const [qStr,   setQ]     = useState("5");
  const [qUnit,  setQUnit] = useState<FlowUnit>("m³/h");

  // Display
  const [presUnit, setPresUnit] = useState<PresUnit>("Pa");

  // Segments
  const [segments, setSegs] = useState<Segment[]>([
    { id: uid+"0", name: "Suction line", diam:"100", diamUnit:"mm", len:"15", lenUnit:"m", matIdx:0, customEps:"0.046", elev:"0", fittings:[{fitIdx:0,qty:"2",customK:""}] },
    { id: uid+"1", name: "Discharge header", diam:"80", diamUnit:"mm", len:"30", lenUnit:"m", matIdx:0, customEps:"0.046", elev:"5", fittings:[{fitIdx:0,qty:"3",customK:""},{fitIdx:10,qty:"1",customK:""}] },
  ]);

  const [result, setResult] = useState<RunResult | null>(null);
  const [error,  setError]  = useState("");

  // Segment helpers
  function addSeg() {
    setSegs((s) => [...s, { id: uid + Date.now(), name: `Segment ${s.length + 1}`, diam:"100", diamUnit:"mm", len:"10", lenUnit:"m", matIdx:0, customEps:"0.046", elev:"0", fittings:[] }]);
  }
  function removeSeg(id: string) { setSegs((s) => s.filter((x) => x.id !== id)); }
  function patchSeg(id: string, p: Partial<Segment>) { setSegs((s) => s.map((x) => x.id === id ? { ...x, ...p } : x)); }
  function addFit(id: string) { setSegs((s) => s.map((x) => x.id === id ? { ...x, fittings: [...x.fittings, { fitIdx:0, qty:"1", customK:"" }] } : x)); }
  function removeFit(id: string, fi: number) { setSegs((s) => s.map((x) => x.id === id ? { ...x, fittings: x.fittings.filter((_, i) => i !== fi) } : x)); }
  function patchFit(id: string, fi: number, p: Partial<Fitting>) { setSegs((s) => s.map((x) => x.id === id ? { ...x, fittings: x.fittings.map((f, i) => i === fi ? { ...f, ...p } : f) } : x)); }

  function calculate() {
    setError("");
    const rho = parseFloat(rhoStr);
    const mu  = parseFloat(muStr);
    const Q   = parseFloat(qStr) * FLOW_M3S[qUnit];

    if ([rho, mu, Q].some((v) => isNaN(v) || v <= 0)) { setError("Check fluid and flow inputs."); return; }

    let cumP = 0;
    const segResults: SegResult[] = [];

    for (const seg of segments) {
      const D    = parseFloat(seg.diam) * DIAM_M[seg.diamUnit];
      const L    = parseFloat(seg.len)  * LEN_M[seg.lenUnit];
      const elev = parseFloat(seg.elev) || 0;
      const mat  = PIPE_MATERIALS[seg.matIdx];
      const eps  = (isNaN(mat.eps) ? parseFloat(seg.customEps) : mat.eps) / 1000; // m

      if ([D, L].some((v) => isNaN(v) || v <= 0)) {
        setError(`Invalid dimensions in "${seg.name}".`); return;
      }

      const A    = Math.PI / 4 * D ** 2;
      const vel  = Q / A;
      const Re   = rho * vel * D / mu;
      const eD   = eps / D;
      const f    = colebrook(Re, eD);

      const dP_fric  = f * (L / D) * rho * vel ** 2 / 2;
      const dP_elev  = rho * G * elev;   // positive = pressure loss going uphill

      let dP_minor = 0;
      for (const fit of seg.fittings) {
        const qty = parseFloat(fit.qty) || 0;
        const fitDef = FITTINGS[fit.fitIdx];
        const K = isNaN(fitDef.K) ? (parseFloat(fit.customK) || 0) : fitDef.K;
        dP_minor += qty * K * rho * vel ** 2 / 2;
      }

      const dP_seg = dP_fric + dP_minor + dP_elev;
      cumP += dP_seg;

      const warnings: string[] = [];
      if (vel > 5)    warnings.push(`Velocity ${fmt(vel, 3)} m/s may cause erosion`);
      else if (vel > 3) warnings.push(`Velocity ${fmt(vel, 3)} m/s is high — check erosion allowance`);
      if (Re > 2300 && Re < 4000) warnings.push("Transitional flow — friction factor is uncertain");

      segResults.push({ name: seg.name, D_m: D, A_m2: A, vel, Re, regime: flowRegime(Re).label, f, eD, dP_fric, dP_minor, dP_elev, dP_seg, cumP, warnings });
    }

    setResult({ segs: segResults, totalDP: cumP, rho, Q });
  }

  const r = result;

  // ── Input sub-components ────────────────────────────────────────────────────
  function NumInput({ val, onChange, w = "w-full", placeholder }: { val: string; onChange: (v: string) => void; w?: string; placeholder?: string }) {
    return (
      <input type="number" value={val} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`${w} px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500`} />
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Pipe Run Designer</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Chain pipe segments with fittings and elevation changes. Outputs velocity, Reynolds number, flow regime, and cumulative pressure drop for each segment.
        </p>
      </div>

      {/* Fluid & flow */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Fluid & flow</h2>

        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {FLUID_PRESETS.map((p) => (
            <button key={p.label} onClick={() => { setRho(String(p.rho)); setMu(String(p.mu)); }}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Density ρ (kg/m³)</label>
            <NumInput val={rhoStr} onChange={setRho} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Dynamic viscosity μ (Pa·s)</label>
            <NumInput val={muStr} onChange={setMu} placeholder="e.g. 0.001002" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Flow rate Q</label>
            <div className="flex gap-1">
              <NumInput val={qStr} onChange={setQ} w="flex-1 min-w-0" />
              <select value={qUnit} onChange={(e) => setQUnit(e.target.value as FlowUnit)}
                className="px-2 py-2 text-sm rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none">
                {(Object.keys(FLOW_M3S) as FlowUnit[]).map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Display pressure in</label>
            <select value={presUnit} onChange={(e) => setPresUnit(e.target.value as PresUnit)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {(Object.keys(PA_DISP) as PresUnit[]).map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Pipe segments */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Pipe segments</h2>
          <button onClick={addSeg}
            className="px-3 py-1.5 text-sm rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
            + Add segment
          </button>
        </div>

        <div className="space-y-5">
          {segments.map((seg, si) => {
            const mat = PIPE_MATERIALS[seg.matIdx];
            return (
              <div key={seg.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
                {/* Segment header */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">#{si + 1}</span>
                  <input value={seg.name} onChange={(e) => patchSeg(seg.id, { name: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-sm font-semibold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Segment name" />
                  {segments.length > 1 && (
                    <button onClick={() => removeSeg(seg.id)}
                      className="text-xs text-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors px-2 py-1 rounded">
                      Remove
                    </button>
                  )}
                </div>

                {/* Geometry */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Pipe diameter</label>
                    <div className="flex gap-1">
                      <NumInput val={seg.diam} onChange={(v) => patchSeg(seg.id, { diam: v })} w="flex-1 min-w-0" />
                      <select value={seg.diamUnit} onChange={(e) => patchSeg(seg.id, { diamUnit: e.target.value as DiamUnit })}
                        className="px-2 py-2 text-sm rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none">
                        <option>mm</option><option>in</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Length</label>
                    <div className="flex gap-1">
                      <NumInput val={seg.len} onChange={(v) => patchSeg(seg.id, { len: v })} w="flex-1 min-w-0" />
                      <select value={seg.lenUnit} onChange={(e) => patchSeg(seg.id, { lenUnit: e.target.value as LenUnit })}
                        className="px-2 py-2 text-sm rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none">
                        <option>m</option><option>ft</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Elevation rise (m)</label>
                    <NumInput val={seg.elev} onChange={(v) => patchSeg(seg.id, { elev: v })} placeholder="0" />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">+ uphill, − downhill</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Pipe material</label>
                    <select value={seg.matIdx} onChange={(e) => patchSeg(seg.id, { matIdx: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {PIPE_MATERIALS.map((m, i) => <option key={i} value={i}>{m.label}{isNaN(m.eps) ? "" : ` (ε=${m.eps} mm)`}</option>)}
                    </select>
                    {isNaN(mat.eps) && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">ε (mm)</span>
                        <NumInput val={seg.customEps} onChange={(v) => patchSeg(seg.id, { customEps: v })} w="w-24" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Fittings */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fittings</span>
                    <button onClick={() => addFit(seg.id)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                      + add fitting
                    </button>
                  </div>
                  {seg.fittings.length === 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic">No fittings — pipe friction only</p>
                  )}
                  <div className="space-y-1.5">
                    {seg.fittings.map((fit, fi) => {
                      const fitDef = FITTINGS[fit.fitIdx];
                      return (
                        <div key={fi} className="flex gap-2 items-center">
                          <select value={fit.fitIdx}
                            onChange={(e) => patchFit(seg.id, fi, { fitIdx: Number(e.target.value) })}
                            className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none">
                            {Object.entries(
                              FITTINGS.reduce<Record<string, typeof FITTINGS>>((acc, f, i) => {
                                (acc[f.g] = acc[f.g] ?? []).push({ ...f, _idx: i } as typeof FITTINGS[0] & { _idx: number });
                                return acc;
                              }, {})
                            ).map(([grp, items]) => (
                              <optgroup key={grp} label={grp}>
                                {items.map((f) => (
                                  <option key={(f as typeof FITTINGS[0] & {_idx:number})._idx} value={(f as typeof FITTINGS[0] & {_idx:number})._idx}>
                                    {f.label}{isNaN(f.K) ? "" : ` (K=${f.K})`}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          {isNaN(fitDef.K) && (
                            <NumInput val={fit.customK} onChange={(v) => patchFit(seg.id, fi, { customK: v })} w="w-20" placeholder="K" />
                          )}
                          <NumInput val={fit.qty} onChange={(v) => patchFit(seg.id, fi, { qty: v })} w="w-14" />
                          <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">qty</span>
                          <button onClick={() => removeFit(seg.id, fi)} className="text-xs text-red-400 hover:text-red-600 px-1">✕</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Calculate */}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button onClick={calculate}
        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm">
        Calculate Pipe Run
      </button>

      {/* Results */}
      {r && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2 md:col-span-1 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
              <p className="text-xs font-semibold text-blue-500 dark:text-blue-400 mb-1">Total ΔP</p>
              <p className="text-2xl font-bold font-mono text-blue-700 dark:text-blue-300">
                {fmt(r.totalDP * PA_DISP[presUnit], 4)} {presUnit}
              </p>
              <p className="text-xs text-blue-500 dark:text-blue-400 font-mono mt-0.5">
                {fmt(r.totalDP, 5)} Pa
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Flow rate</p>
              <p className="text-lg font-bold font-mono text-gray-900 dark:text-gray-100">{fmt(r.Q * 3600, 4)} m³/h</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{fmt(r.Q * 1000, 4)} L/s</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Segments</p>
              <p className="text-lg font-bold font-mono text-gray-900 dark:text-gray-100">{r.segs.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Fluid density</p>
              <p className="text-lg font-bold font-mono text-gray-900 dark:text-gray-100">{fmt(r.rho, 4)} kg/m³</p>
            </div>
          </div>

          {/* Warnings */}
          {r.segs.some((s) => s.warnings.length > 0) && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">Warnings</p>
              {r.segs.flatMap((s) => s.warnings.map((w) => (
                <p key={s.name + w} className="text-sm text-amber-800 dark:text-amber-300">⚠ <strong>{s.name}:</strong> {w}</p>
              )))}
            </div>
          )}

          {/* Results table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Pressure traverse</p>
              <span className="text-xs text-gray-400 dark:text-gray-500">Pressures in {presUnit}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs font-bold text-gray-500 dark:text-gray-400">
                    {["Segment","D (mm)","Velocity (m/s)","Re","Regime","f","ΔP friction","ΔP fittings","ΔP elevation","ΔP segment","Cumulative ΔP"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {r.segs.map((s) => {
                    const reg = flowRegime(s.Re);
                    const sc  = PA_DISP[presUnit];
                    return (
                      <tr key={s.name} className="text-gray-800 dark:text-gray-200">
                        <td className="px-3 py-2 font-medium whitespace-nowrap">{s.name}</td>
                        <td className="px-3 py-2 font-mono">{fmt(s.D_m * 1000, 4)}</td>
                        <td className="px-3 py-2 font-mono">{fmt(s.vel, 4)}</td>
                        <td className="px-3 py-2 font-mono">{s.Re.toExponential(3)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${reg.bg}`}>
                            {s.regime}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono">{fmt(s.f, 4)}</td>
                        <td className="px-3 py-2 font-mono">{fmt(s.dP_fric * sc, 4)}</td>
                        <td className="px-3 py-2 font-mono">{fmt(s.dP_minor * sc, 4)}</td>
                        <td className={`px-3 py-2 font-mono ${s.dP_elev < 0 ? "text-green-600 dark:text-green-400" : ""}`}>
                          {fmt(s.dP_elev * sc, 4)}
                        </td>
                        <td className="px-3 py-2 font-mono font-semibold">{fmt(s.dP_seg * sc, 4)}</td>
                        <td className="px-3 py-2 font-mono font-bold text-blue-700 dark:text-blue-300">{fmt(s.cumP * sc, 4)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 font-bold text-gray-900 dark:text-gray-100">
                    <td className="px-3 py-2" colSpan={9}>Total</td>
                    <td className="px-3 py-2 font-mono">{fmt(r.totalDP * PA_DISP[presUnit], 4)}</td>
                    <td className="px-3 py-2 font-mono text-blue-700 dark:text-blue-300">{fmt(r.totalDP * PA_DISP[presUnit], 4)} {presUnit}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Breakdown chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
              Pressure drop per segment
            </p>
            <BarChart segs={r.segs} presUnit={presUnit} />
          </div>

          {/* Segment details (collapsible) */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <p className="px-5 py-3 text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
              Segment details
            </p>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {r.segs.map((s) => {
                const sc  = PA_DISP[presUnit];
                const fricPct  = s.dP_seg > 0 ? (s.dP_fric  / s.dP_seg * 100) : 0;
                const minorPct = s.dP_seg > 0 ? (s.dP_minor / s.dP_seg * 100) : 0;
                const elevPct  = s.dP_seg > 0 ? (Math.abs(s.dP_elev) / s.dP_seg * 100) : 0;
                return (
                  <div key={s.name} className="px-5 py-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{s.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                          D = {fmt(s.D_m * 1000, 4)} mm · A = {fmt(s.A_m2 * 1e4, 4)} cm² · ε/D = {fmt(s.eD, 3)}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${flowRegime(s.Re).bg}`}>
                        {s.regime}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      {[
                        { label: "Friction", val: s.dP_fric * sc, pct: fricPct,  color: "bg-blue-500" },
                        { label: "Fittings", val: s.dP_minor * sc, pct: minorPct, color: "bg-amber-500" },
                        { label: "Elevation", val: s.dP_elev * sc, pct: elevPct, color: "bg-violet-500" },
                      ].map(({ label, val, pct, color }) => (
                        <div key={label}>
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-600 dark:text-gray-400">{label}</span>
                            <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">{fmt(val, 3)} {presUnit}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                            <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-gray-400 dark:text-gray-500">{fmt(pct, 3)} %</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-4 space-y-1">
        <p>Friction factor: Colebrook-White equation (laminar: f = 64/Re). Minor losses: K·V²/2 referred to segment velocity.</p>
        <p>Elevation term: ΔP_elev = ρgΔz — positive for uphill flow (pressure loss), negative for downhill (pressure recovery).</p>
        <p>All segments use the same flow rate Q (series pipe run). For parallel branches, use the Parallel Pipe calculator.</p>
      </div>

      <References refs={REFS_PIPE_RUN} />
    </div>
  );
}
