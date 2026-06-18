"use client";

import React, { useState, useMemo, useId } from "react";
import { References } from "@/components/References";
import { REFS_FAN_SYSTEM_CURVE } from "@/lib/references";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt  = (n: number, sig = 4) => parseFloat(n.toPrecision(sig)).toString();
const G    = 9.81;

// ── Colebrook-White ───────────────────────────────────────────────────────────
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

// Hydraulic diameter for rectangular duct
function dh(W_m: number, H_m: number) { return 4 * W_m * H_m / (2 * (W_m + H_m)); }

// ── Units ─────────────────────────────────────────────────────────────────────
type FlowUnit = "m³/s" | "m³/h" | "L/s" | "CFM";
type DiamUnit = "mm" | "m" | "in";
type PresUnit = "Pa" | "mmH₂O" | "inH₂O" | "mbar";
type LenUnit  = "m" | "ft";
type TempUnit = "C" | "F";

const FLOW_TO_M3S: Record<FlowUnit, number> = { "m³/s": 1, "m³/h": 1/3600, "L/s": 1e-3, "CFM": 1/2118.88 };
const DIAM_TO_M:  Record<DiamUnit, number>  = { mm: 1e-3, m: 1, in: 0.0254 };
const PA_FROM:    Record<PresUnit, number>  = { Pa: 1, "mmH₂O": 9.80638, "inH₂O": 249.088, mbar: 100 };
const LEN_TO_M:   Record<LenUnit, number>   = { m: 1, ft: 0.3048 };

// ── Fitting K-table ───────────────────────────────────────────────────────────
const FITTINGS = [
  { label: "90° elbow (standard)",        K: 0.9  },
  { label: "90° elbow (long-radius R/D=2)",K: 0.4  },
  { label: "45° elbow",                   K: 0.4  },
  { label: "Tee (flow through run)",       K: 0.6  },
  { label: "Tee (flow through branch)",    K: 1.8  },
  { label: "Gate valve (fully open)",      K: 0.2  },
  { label: "Butterfly valve (fully open)", K: 0.3  },
  { label: "Damper (full open)",           K: 0.5  },
  { label: "Inlet grille/louvre",         K: 1.5  },
  { label: "Abrupt entry",                K: 0.5  },
  { label: "Abrupt exit",                 K: 1.0  },
  { label: "Sudden contraction (A₂/A₁=0.5)", K: 0.25 },
  { label: "Sudden expansion (A₂/A₁=2)",  K: 0.56 },
];

interface DuctSegment {
  id: string;
  len:  string; lenUnit: LenUnit;
  diam: string; diamUnit: DiamUnit;   // for round duct
  isDuct: boolean;                     // true=round, false=rectangular
  dW: string; dH: string;              // rectangular W × H in mm
  fittings: { fitIdx: number; qty: string }[];
}

interface FanPoint { Q: string; dP: string; }

interface SystemResult {
  Qs: number[];      // m³/s
  dPs: number[];     // Pa (system curve)
  fanQs: number[];   // m³/s (fan curve interpolated)
  fanPs: number[];   // Pa
  dutyQ: number | null;
  dutyP: number | null;
  staticP: number;   // Pa external static pressure
  segments: { name: string; dP_Pa: number; dP_minor: number; vel: number; Re: number; f: number }[];
  rho: number;
  Q_design: number;  // m³/s entered
}

// ── Chart ─────────────────────────────────────────────────────────────────────
const CW = 580, CH = 340;
const cML = 55, cMR = 20, cMT = 20, cMB = 45;
const cPW = CW - cML - cMR, cPH = CH - cMT - cMB;

function Chart({ res }: { res: SystemResult }) {
  const allPs = [...res.dPs, ...res.fanPs].filter(isFinite);
  const allQs = [...res.Qs, ...res.fanQs].filter(isFinite);
  if (allPs.length === 0) return null;

  const Qmax = Math.max(...allQs) * 1.1;
  const Pmax = Math.max(...allPs) * 1.15;

  function qX(Q: number) { return cML + (Q / Qmax) * cPW; }
  function pY(P: number) { return cMT + (1 - P / Pmax) * cPH; }

  const sysPath = res.Qs.map((Q, i) => `${qX(Q).toFixed(1)},${pY(res.dPs[i]).toFixed(1)}`).join(" ");
  const fanPath = res.fanQs.map((Q, i) => `${qX(Q).toFixed(1)},${pY(res.fanPs[i]).toFixed(1)}`).join(" ");

  const QTicks = 5;
  const PTicks = 5;

  const QstepRaw = Qmax / QTicks;
  const PstepRaw = Pmax / PTicks;

  const qFmt = (q: number) => q < 0.01 ? (q * 1000).toFixed(1) + " L/s" : q.toFixed(3) + " m³/s";
  const pFmt = (p: number) => p < 10 ? p.toFixed(1) : p.toFixed(0);

  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full" style={{ fontFamily: "sans-serif" }}>
      <rect x={cML} y={cMT} width={cPW} height={cPH} fill="white" stroke="#e5e7eb" />

      {/* Grid */}
      {Array.from({ length: QTicks + 1 }, (_, i) => {
        const x = qX(i * QstepRaw);
        return <line key={i} x1={x} y1={cMT} x2={x} y2={cMT + cPH} stroke="#f3f4f6" strokeWidth={0.8} />;
      })}
      {Array.from({ length: PTicks + 1 }, (_, i) => {
        const y = pY(i * PstepRaw);
        return <line key={i} x1={cML} y1={y} x2={cML + cPW} y2={y} stroke="#f3f4f6" strokeWidth={0.8} />;
      })}

      {/* System curve */}
      {sysPath && <polyline points={sysPath} fill="none" stroke="#3b82f6" strokeWidth={2.5} />}

      {/* Fan curve */}
      {fanPath && res.fanQs.length > 1 && (
        <polyline points={fanPath} fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="6,3" />
      )}

      {/* Duty point */}
      {res.dutyQ != null && res.dutyP != null && (() => {
        const dx = qX(res.dutyQ), dy = pY(res.dutyP);
        return (
          <g>
            <line x1={dx} y1={cMT} x2={dx} y2={cMT + cPH} stroke="#ef4444" strokeWidth={1} strokeDasharray="3,3" />
            <line x1={cML} y1={dy} x2={cML + cPW} y2={dy} stroke="#ef4444" strokeWidth={1} strokeDasharray="3,3" />
            <circle cx={dx} cy={dy} r={6} fill="#ef4444" stroke="white" strokeWidth={2} />
            <text x={dx + 9} y={dy - 4} fontSize={9} fill="#dc2626" fontWeight="bold">
              Q={fmt(res.dutyQ, 3)} m³/s
            </text>
            <text x={dx + 9} y={dy + 8} fontSize={9} fill="#dc2626">
              ΔP={fmt(res.dutyP, 4)} Pa
            </text>
          </g>
        );
      })()}

      {/* Axes */}
      <rect x={cML} y={cMT} width={cPW} height={cPH} fill="none" stroke="#d1d5db" />
      {Array.from({ length: QTicks + 1 }, (_, i) => {
        const q = i * QstepRaw;
        const x = qX(q);
        return (
          <g key={i}>
            <line x1={x} y1={cMT + cPH} x2={x} y2={cMT + cPH + 4} stroke="#6b7280" strokeWidth={1} />
            <text x={x} y={cMT + cPH + 14} fontSize={8} textAnchor="middle" fill="#374151">
              {qFmt(q)}
            </text>
          </g>
        );
      })}
      {Array.from({ length: PTicks + 1 }, (_, i) => {
        const p = i * PstepRaw;
        const y = pY(p);
        return (
          <g key={i}>
            <line x1={cML - 4} y1={y} x2={cML} y2={y} stroke="#6b7280" strokeWidth={1} />
            <text x={cML - 6} y={y + 3} fontSize={8} textAnchor="end" fill="#374151">
              {pFmt(p)}
            </text>
          </g>
        );
      })}
      <text x={cML + cPW / 2} y={CH - 5} fontSize={10} textAnchor="middle" fill="#374151" fontWeight="bold">Flow Q (m³/s)</text>
      <text transform={`translate(12,${cMT + cPH / 2}) rotate(-90)`} fontSize={10} textAnchor="middle" fill="#374151" fontWeight="bold">Pressure ΔP (Pa)</text>

      {/* Legend */}
      <g>
        <line x1={cML + 10} y1={cMT + 12} x2={cML + 30} y2={cMT + 12} stroke="#3b82f6" strokeWidth={2.5} />
        <text x={cML + 34} y={cMT + 16} fontSize={9} fill="#374151">System curve</text>
        {res.fanQs.length > 1 && (
          <>
            <line x1={cML + 130} y1={cMT + 12} x2={cML + 150} y2={cMT + 12} stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="6,3" />
            <text x={cML + 154} y={cMT + 16} fontSize={9} fill="#374151">Fan curve</text>
          </>
        )}
      </g>
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FanSystemCurvePage() {
  const uid = useId();

  // Design flow
  const [qStr,    setQ]    = useState("2.5");
  const [qUnit,   setQUnit]= useState<FlowUnit>("m³/s");

  // Air conditions
  const [tempStr, setTemp] = useState("20");
  const [tempUnit,setTempUnit] = useState<TempUnit>("C");
  const [pAtmStr, setPAtm] = useState("101325");
  const [altStr,  setAlt]  = useState("");  // altitude in m (optional, overrides pAtm)

  // External static pressure (e.g. terminal units, filters)
  const [spStr,   setSp]   = useState("0");
  const [spUnit,  setSpUnit]= useState<PresUnit>("Pa");

  // Duct segments
  const [segments, setSegments] = useState<DuctSegment[]>([
    { id: uid + "0", len: "20", lenUnit: "m", diam: "400", diamUnit: "mm", isDuct: true, dW: "400", dH: "300", fittings: [{ fitIdx: 0, qty: "3" }] },
  ]);

  // Fan curve data points
  const [fanPoints, setFanPoints] = useState<FanPoint[]>([
    { Q: "0",   dP: "900" },
    { Q: "1",   dP: "850" },
    { Q: "2",   dP: "750" },
    { Q: "3",   dP: "550" },
    { Q: "4",   dP: "200" },
  ]);
  const [fanQUnit,  setFanQUnit]  = useState<FlowUnit>("m³/s");
  const [fanPUnit,  setFanPUnit]  = useState<PresUnit>("Pa");

  const [result, setResult] = useState<SystemResult | null>(null);
  const [error,  setError]  = useState("");

  // Air density from temperature + pressure
  function airDensity(T_C: number, P_Pa: number): number {
    return P_Pa / (287.05 * (T_C + 273.15));
  }

  function addSegment() {
    setSegments((s) => [...s, { id: uid + Date.now(), len: "10", lenUnit: "m", diam: "300", diamUnit: "mm", isDuct: true, dW: "300", dH: "200", fittings: [] }]);
  }
  function removeSegment(id: string) { setSegments((s) => s.filter((x) => x.id !== id)); }
  function updateSeg(id: string, patch: Partial<DuctSegment>) {
    setSegments((s) => s.map((x) => x.id === id ? { ...x, ...patch } : x));
  }
  function addFitting(segId: string) {
    setSegments((s) => s.map((x) => x.id === segId ? { ...x, fittings: [...x.fittings, { fitIdx: 0, qty: "1" }] } : x));
  }
  function removeFitting(segId: string, idx: number) {
    setSegments((s) => s.map((x) => x.id === segId ? { ...x, fittings: x.fittings.filter((_, i) => i !== idx) } : x));
  }
  function updateFitting(segId: string, fitIdx: number, patch: { fitIdx?: number; qty?: string }) {
    setSegments((s) => s.map((x) => x.id === segId ? { ...x, fittings: x.fittings.map((f, i) => i === fitIdx ? { ...f, ...patch } : f) } : x));
  }

  function calculate() {
    setError("");
    const T_C  = tempUnit === "F" ? (parseFloat(tempStr) - 32) / 1.8 : parseFloat(tempStr);
    const P_Pa = altStr.trim()
      ? 101325 * Math.pow(1 - 2.2558e-5 * parseFloat(altStr), 5.2559)
      : parseFloat(pAtmStr);
    const rho  = airDensity(T_C, P_Pa);

    const Q_design = parseFloat(qStr) * FLOW_TO_M3S[qUnit];
    const staticP  = parseFloat(spStr) * PA_FROM[spUnit];

    if (isNaN(Q_design) || Q_design <= 0) { setError("Enter a valid design flow."); return; }
    if (isNaN(staticP)  || staticP < 0)   { setError("Enter a valid external static pressure."); return; }
    if (isNaN(rho)      || rho <= 0)       { setError("Enter valid air conditions."); return; }

    // R = dP / Q² system resistance (total)
    let totalR = 0;
    const segResults: SystemResult["segments"] = [];

    for (const seg of segments) {
      const L   = parseFloat(seg.len) * LEN_TO_M[seg.lenUnit];
      let   Dh: number;
      let   A:  number;

      if (seg.isDuct) {
        Dh = parseFloat(seg.diam) * DIAM_TO_M[seg.diamUnit];
        A  = Math.PI / 4 * Dh ** 2;
      } else {
        const dw = parseFloat(seg.dW) * 1e-3;
        const dh_= parseFloat(seg.dH) * 1e-3;
        Dh = dh(dw, dh_);
        A  = dw * dh_;
      }

      if ([L, Dh, A].some((v) => isNaN(v) || v <= 0)) {
        setError(`Check segment ${segments.indexOf(seg) + 1} dimensions.`); return;
      }

      const V  = Q_design / A;
      const nu = 1.5e-5;  // air kinematic viscosity ≈ 20°C (close enough for system curve shape)
      const Re = V * Dh / nu;
      const eD = 9e-5 / Dh;  // galvanised steel ε=0.09mm typical
      const f  = colebrook(Re, eD);
      const dP_fric = f * (L / Dh) * rho * V ** 2 / 2;

      let dP_minor = 0;
      for (const fit of seg.fittings) {
        const qty = parseFloat(fit.qty) || 0;
        const K   = FITTINGS[fit.fitIdx]?.K ?? 0;
        dP_minor += qty * K * rho * V ** 2 / 2;
      }

      const R_seg = (dP_fric + dP_minor) / (Q_design ** 2);
      totalR += R_seg;
      segResults.push({ name: `Segment ${segments.indexOf(seg) + 1}`, dP_Pa: dP_fric + dP_minor, dP_minor, vel: V, Re, f });
    }

    // Total R including external static pressure equivalent
    // dP = R * Q² + staticP  (static pressure is independent of flow in first approximation)

    // Build system curve over 0 → 1.5× design flow
    const Qs = Array.from({ length: 60 }, (_, i) => (i / 59) * 1.5 * Q_design);
    const dPs = Qs.map((Q) => totalR * Q ** 2 + staticP);

    // Fan curve interpolation
    const fanQsSI = fanPoints.map((p) => parseFloat(p.Q) * FLOW_TO_M3S[fanQUnit]).filter(isFinite);
    const fanPsSI = fanPoints.map((p) => parseFloat(p.dP) * PA_FROM[fanPUnit]).filter(isFinite);

    // Find duty point: intersection of system curve and fan curve
    // Interpolate fan curve at system curve Q values and find crossing
    let dutyQ: number | null = null;
    let dutyP: number | null = null;

    if (fanQsSI.length >= 2) {
      for (let i = 0; i < Qs.length - 1; i++) {
        const Q = Qs[i];
        const sysP = dPs[i];
        // Interpolate fan curve at Q
        let fanP: number | null = null;
        for (let j = 0; j < fanQsSI.length - 1; j++) {
          if (Q >= fanQsSI[j] && Q <= fanQsSI[j + 1]) {
            const f = (Q - fanQsSI[j]) / (fanQsSI[j + 1] - fanQsSI[j]);
            fanP = fanPsSI[j] + f * (fanPsSI[j + 1] - fanPsSI[j]);
            break;
          }
        }
        if (fanP == null) continue;
        const diff = fanP - sysP;

        const Q2   = Qs[i + 1];
        const sysP2= dPs[i + 1];
        let fanP2: number | null = null;
        for (let j = 0; j < fanQsSI.length - 1; j++) {
          if (Q2 >= fanQsSI[j] && Q2 <= fanQsSI[j + 1]) {
            const f = (Q2 - fanQsSI[j]) / (fanQsSI[j + 1] - fanQsSI[j]);
            fanP2 = fanPsSI[j] + f * (fanPsSI[j + 1] - fanPsSI[j]);
            break;
          }
        }
        if (fanP2 == null) continue;
        const diff2 = fanP2 - sysP2;

        if (diff * diff2 < 0) {
          // crossing — linear interpolation
          const t = diff / (diff - diff2);
          dutyQ = Q + t * (Q2 - Q);
          dutyP = sysP + t * (sysP2 - sysP);
          break;
        }
      }
    }

    setResult({ Qs, dPs, fanQs: fanQsSI, fanPs: fanPsSI, dutyQ, dutyP, staticP, segments: segResults, rho, Q_design });
  }

  const r = result;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Fan & Blower System Curve</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Build a duct system resistance curve (H vs Q), overlay a fan curve, and find the operating point. Includes density correction for altitude and temperature.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-6">

        {/* Air conditions */}
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Air conditions</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Temperature</label>
              <div className="flex gap-1">
                <input type="number" value={tempStr} onChange={(e) => setTemp(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 text-sm rounded-l-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={tempUnit} onChange={(e) => setTempUnit(e.target.value as TempUnit)}
                  className="px-2 py-2 text-sm rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none">
                  <option>C</option><option>F</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Altitude (m, optional)</label>
              <input type="number" value={altStr} onChange={(e) => setAlt(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Ext. static pressure</label>
              <div className="flex gap-1">
                <input type="number" value={spStr} onChange={(e) => setSp(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 text-sm rounded-l-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={spUnit} onChange={(e) => setSpUnit(e.target.value as PresUnit)}
                  className="px-2 py-2 text-sm rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none">
                  {(Object.keys(PA_FROM) as PresUnit[]).map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Design flow Q</label>
              <div className="flex gap-1">
                <input type="number" value={qStr} onChange={(e) => setQ(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 text-sm rounded-l-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={qUnit} onChange={(e) => setQUnit(e.target.value as FlowUnit)}
                  className="px-2 py-2 text-sm rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none">
                  {(Object.keys(FLOW_TO_M3S) as FlowUnit[]).map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Duct segments */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Duct segments</p>
            <button onClick={addSegment}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
              + Add segment
            </button>
          </div>

          <div className="space-y-4">
            {segments.map((seg, si) => (
              <div key={seg.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Segment {si + 1}</span>
                  {segments.length > 1 && (
                    <button onClick={() => removeSegment(seg.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Shape selector */}
                  <div className="sm:col-span-4 flex gap-2">
                    {[["Round duct", true], ["Rectangular duct", false]].map(([label, val]) => (
                      <button key={String(val)} onClick={() => updateSeg(seg.id, { isDuct: val as boolean })}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${seg.isDuct === val
                          ? "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
                        {label as string}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Length</label>
                    <div className="flex gap-1">
                      <input type="number" value={seg.len} onChange={(e) => updateSeg(seg.id, { len: e.target.value })}
                        className="flex-1 min-w-0 px-3 py-2 text-sm rounded-l-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none" />
                      <select value={seg.lenUnit} onChange={(e) => updateSeg(seg.id, { lenUnit: e.target.value as LenUnit })}
                        className="px-2 py-2 text-xs rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none">
                        <option>m</option><option>ft</option>
                      </select>
                    </div>
                  </div>

                  {seg.isDuct ? (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Diameter</label>
                      <div className="flex gap-1">
                        <input type="number" value={seg.diam} onChange={(e) => updateSeg(seg.id, { diam: e.target.value })}
                          className="flex-1 min-w-0 px-3 py-2 text-sm rounded-l-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none" />
                        <select value={seg.diamUnit} onChange={(e) => updateSeg(seg.id, { diamUnit: e.target.value as DiamUnit })}
                          className="px-2 py-2 text-xs rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none">
                          <option>mm</option><option>m</option><option>in</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Width (mm)</label>
                        <input type="number" value={seg.dW} onChange={(e) => updateSeg(seg.id, { dW: e.target.value })}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Height (mm)</label>
                        <input type="number" value={seg.dH} onChange={(e) => updateSeg(seg.id, { dH: e.target.value })}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none" />
                      </div>
                    </>
                  )}
                </div>

                {/* Fittings */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Fittings</span>
                    <button onClick={() => addFitting(seg.id)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline">+ add fitting</button>
                  </div>
                  {seg.fittings.map((fit, fi) => (
                    <div key={fi} className="flex gap-2 items-center mb-1">
                      <select value={fit.fitIdx} onChange={(e) => updateFitting(seg.id, fi, { fitIdx: Number(e.target.value) })}
                        className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none">
                        {FITTINGS.map((f, i) => <option key={i} value={i}>{f.label} (K={f.K})</option>)}
                      </select>
                      <input type="number" value={fit.qty} onChange={(e) => updateFitting(seg.id, fi, { qty: e.target.value })}
                        className="w-14 px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none text-center" />
                      <span className="text-xs text-gray-400 dark:text-gray-500">qty</span>
                      <button onClick={() => removeFitting(seg.id, fi)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Fan curve */}
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Fan curve (optional — enter H-Q points)</p>
          <div className="flex gap-3 mb-2 items-center text-xs text-gray-500 dark:text-gray-400">
            <span>Flow unit:</span>
            <select value={fanQUnit} onChange={(e) => setFanQUnit(e.target.value as FlowUnit)}
              className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              {(Object.keys(FLOW_TO_M3S) as FlowUnit[]).map((u) => <option key={u}>{u}</option>)}
            </select>
            <span>Pressure unit:</span>
            <select value={fanPUnit} onChange={(e) => setFanPUnit(e.target.value as PresUnit)}
              className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              {(Object.keys(PA_FROM) as PresUnit[]).map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            {fanPoints.map((pt, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input type="number" value={pt.Q} onChange={(e) => setFanPoints((fp) => fp.map((p, j) => j === i ? { ...p, Q: e.target.value } : p))}
                  placeholder={`Q (${fanQUnit})`}
                  className="w-28 px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none" />
                <input type="number" value={pt.dP} onChange={(e) => setFanPoints((fp) => fp.map((p, j) => j === i ? { ...p, dP: e.target.value } : p))}
                  placeholder={`ΔP (${fanPUnit})`}
                  className="w-28 px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none" />
                <button onClick={() => setFanPoints((fp) => fp.filter((_, j) => j !== i))}
                  className="text-xs text-red-400 hover:text-red-600">✕</button>
              </div>
            ))}
            <button onClick={() => setFanPoints((fp) => [...fp, { Q: "", dP: "" }])}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1">+ add point</button>
          </div>
        </section>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button onClick={calculate}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
          Generate System Curve
        </button>
      </div>

      {/* Results */}
      {r && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
              <p className="text-xs font-semibold text-blue-500 dark:text-blue-400 mb-1">Design flow</p>
              <p className="text-lg font-bold font-mono text-blue-700 dark:text-blue-300">{fmt(r.Q_design, 3)} m³/s</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">System ΔP at design Q</p>
              <p className="text-lg font-bold font-mono text-gray-900 dark:text-gray-100">{fmt(r.dPs[Math.round(r.Qs.length * (2 / 3))], 4)} Pa</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Air density</p>
              <p className="text-lg font-bold font-mono text-gray-900 dark:text-gray-100">{fmt(r.rho, 4)} kg/m³</p>
            </div>
            {r.dutyQ != null && (
              <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
                <p className="text-xs font-semibold text-green-500 dark:text-green-400 mb-1">Duty point</p>
                <p className="text-sm font-bold font-mono text-green-700 dark:text-green-300">{fmt(r.dutyQ, 3)} m³/s</p>
                <p className="text-xs font-mono text-green-600 dark:text-green-400">{fmt(r.dutyP!, 4)} Pa</p>
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-3">
            <Chart res={r} />
          </div>

          {/* Segment breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <p className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
              Pressure drop breakdown at design Q
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs font-bold text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-2">Segment</th>
                    <th className="px-4 py-2">Velocity (m/s)</th>
                    <th className="px-4 py-2">Re</th>
                    <th className="px-4 py-2">f</th>
                    <th className="px-4 py-2">Friction ΔP (Pa)</th>
                    <th className="px-4 py-2">Minor ΔP (Pa)</th>
                    <th className="px-4 py-2">Total ΔP (Pa)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
                  {r.segments.map((s) => (
                    <tr key={s.name}>
                      <td className="px-4 py-2 font-medium">{s.name}</td>
                      <td className="px-4 py-2 font-mono">{fmt(s.vel, 3)}</td>
                      <td className="px-4 py-2 font-mono">{s.Re.toExponential(2)}</td>
                      <td className="px-4 py-2 font-mono">{fmt(s.f, 4)}</td>
                      <td className="px-4 py-2 font-mono">{fmt(s.dP_Pa - s.dP_minor, 4)}</td>
                      <td className="px-4 py-2 font-mono">{fmt(s.dP_minor, 4)}</td>
                      <td className="px-4 py-2 font-mono font-bold">{fmt(s.dP_Pa, 4)}</td>
                    </tr>
                  ))}
                  {r.staticP > 0 && (
                    <tr className="bg-gray-50 dark:bg-gray-700/30">
                      <td className="px-4 py-2 font-medium" colSpan={6}>External static pressure</td>
                      <td className="px-4 py-2 font-mono font-bold">{fmt(r.staticP, 4)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-4 space-y-1">
        <p>System curve: ΔP_sys = R·Q² + ΔP_static. R is the sum of segment resistances (friction + minor losses) referred to flow rate.</p>
        <p>Duct roughness assumed ε = 0.09 mm (galvanised steel). Air kinematic viscosity ν ≈ 1.5×10⁻⁵ m²/s used for all segments.</p>
        <p>Duty point found by interpolated intersection of system and fan curves. Supply manufacturer fan data for accurate selection.</p>
      </div>

      <References refs={REFS_FAN_SYSTEM_CURVE} />
    </div>
  );
}
