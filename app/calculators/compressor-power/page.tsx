"use client";

import React, { useState, useMemo } from "react";
import { References } from "@/components/References";
import { REFS_COMPRESSOR_POWER } from "@/lib/references";

// ─── Physics ───────────────────────────────────────────────────────────────────
//
// ISENTROPIC (ADIABATIC) COMPRESSION
// ------------------------------------
// Isentropic head:
//   H_is  = Z_avg·R·T₁/MW · κ/(κ-1) · [(P₂/P₁)^((κ-1)/κ) − 1]   [J/kg]
// Isentropic discharge temperature:
//   T₂_is = T₁ · (P₂/P₁)^((κ-1)/κ)                                [K]
// Actual discharge temperature (after accounting for efficiency):
//   T₂    = T₁ + (T₂_is − T₁) / η_is                              [K]
// Shaft power:
//   P     = qm · H_is / η_is                                        [W]
//
// POLYTROPIC COMPRESSION
// -----------------------
// Polytropic exponent (for a compressor, API 617 convention):
//   n/(n-1) = κ/(κ-1) / η_p
// Polytropic head:
//   H_p   = Z_avg·R·T₁/MW · n/(n-1) · [(P₂/P₁)^((n-1)/n) − 1]   [J/kg]
// Polytropic discharge temperature:
//   T₂    = T₁ · (P₂/P₁)^((n-1)/n)                                [K]
// Shaft power:
//   P     = qm · H_p  (polytropic head already equals actual fluid work)  [W]
//
// RELATIONSHIP BETWEEN EFFICIENCIES:
//   η_is and η_p converge as r→1; for large r, η_is < η_p.
//
// Universal gas constant R = 8314.46 J/(kmol·K)

const R_UNIV = 8314.46; // J/(kmol·K)

interface CompResult {
  r: number;            // compression ratio P₂/P₁
  // Isentropic
  H_is: number;         // kJ/kg
  T2_is: number;        // K — isentropic discharge
  T2_actual_is: number; // K — actual (from isentropic path + η_is)
  P_shaft_is: number;   // kW — shaft power via isentropic
  eta_is: number;       // isentropic efficiency (computed or input)
  // Polytropic
  n: number;            // polytropic exponent
  n_over_nm1: number;   // n/(n-1)
  H_p: number;          // kJ/kg
  T2_poly: number;      // K — actual via polytropic
  P_shaft_p: number;    // kW — shaft power via polytropic
  eta_p: number;        // polytropic efficiency (computed or input)
  // Common outputs
  qm_kgs: number;       // kg/s
  qm_kgh: number;       // kg/h
  Q1_m3h: number;       // m³/h at suction (actual)
  Q2_m3h: number;       // m³/h at discharge (actual)
  P_shaft_kW: number;   // kW — governing shaft power (from input efficiency type)
  P_motor_kW: number;   // kW at motor shaft (after mechanical losses)
}

function calcCompressor(
  T1_K: number, P1_Pa: number, P2_Pa: number,
  MW: number, kappa: number, Z_avg: number,
  qm_kgs: number,
  effType: "is" | "poly",
  eff: number,
  eta_m: number,
): CompResult | null {
  if (T1_K <= 0 || P1_Pa <= 0 || P2_Pa <= P1_Pa) return null;
  if (MW <= 0 || kappa <= 1 || Z_avg <= 0) return null;
  if (qm_kgs <= 0 || eff <= 0 || eff > 1 || eta_m <= 0 || eta_m > 1) return null;

  const r   = P2_Pa / P1_Pa;
  const k1  = (kappa - 1) / kappa;
  const Rsp = Z_avg * R_UNIV / MW;          // specific gas constant × Z [J/(kg·K)]

  // ── Isentropic values ───────────────────────────────────────────────────────
  const H_is_Jkg = Rsp * T1_K * (kappa / (kappa - 1)) * (Math.pow(r, k1) - 1);
  const T2_is    = T1_K * Math.pow(r, k1);

  // ── Compute actual discharge temperature and efficiencies ───────────────────
  let T2_actual: number, eta_is: number, eta_p: number, nm1_n: number;

  if (effType === "is") {
    eta_is    = eff;
    T2_actual = T1_K + (T2_is - T1_K) / eta_is;        // T₂ = T₁ + ΔT_is / η_is
    nm1_n     = Math.log(T2_actual / T1_K) / Math.log(r); // (n-1)/n from actual T₂
    eta_p     = k1 / nm1_n;                              // η_p = (κ-1)/κ / ((n-1)/n)
  } else {
    eta_p     = eff;
    nm1_n     = k1 / eta_p;                              // (n-1)/n = (κ-1)/κ / η_p
    T2_actual = T1_K * Math.pow(r, nm1_n);              // polytropic discharge T
    // Temperature-based isentropic efficiency (correct for adiabatic machine)
    eta_is    = (T2_is - T1_K) / (T2_actual - T1_K);   // = (r^k1 - 1)/(r^nm1_n - 1)
  }

  const n_n1 = 1 / nm1_n;                               // n/(n-1)
  const n    = 1 / (1 - nm1_n);                         // polytropic exponent

  // ── Polytropic head (characterisation only — NOT the shaft power) ───────────
  const H_p_Jkg = Rsp * T1_K * n_n1 * (Math.pow(r, nm1_n) - 1);

  // ── Actual shaft power (CORRECT: first law for adiabatic machine → w = ΔH) ─
  // w_actual = Cₚ × (T₂ - T₁) = Z·κ/(κ-1)·R/MW · (T₂ - T₁)
  // Equivalently: H_is / η_is(temp-based) = H_is × (r^nm1n-1)/(r^k1-1)
  const w_Jkg    = Rsp * T1_K * (kappa / (kappa - 1)) * (Math.pow(r, nm1_n) - 1);
  const P_shaft_kW = qm_kgs * w_Jkg / 1000;
  const P_motor_kW = P_shaft_kW / eta_m;

  // ── Volumetric flows ────────────────────────────────────────────────────────
  const rho1   = P1_Pa * MW / (Z_avg * R_UNIV * T1_K);
  const rho2   = P2_Pa * MW / (Z_avg * R_UNIV * T2_actual);
  const rho_n  = 101325 * MW / (R_UNIV * 273.15);       // density at 0°C, 1 atm [kg/Nm³]
  const Q1_m3h = qm_kgs / rho1 * 3600;
  const Q2_m3h = qm_kgs / rho2 * 3600;
  const Qn_m3h = qm_kgs / rho_n * 3600;                 // normal volumetric flow (Nm³/h)

  return {
    r,
    H_is: H_is_Jkg / 1000, T2_is,
    T2_actual_is: T2_actual,            // same T₂ regardless of method
    P_shaft_is: P_shaft_kW,             // same shaft power regardless of method
    eta_is: Math.max(0.01, Math.min(1, eta_is)),
    n: Math.abs(n), n_over_nm1: Math.abs(n_n1),
    H_p: H_p_Jkg / 1000, T2_poly: T2_actual,
    P_shaft_p: P_shaft_kW,             // same shaft power — polytropic head ≠ shaft work
    eta_p: Math.max(0.01, Math.min(1, eta_p)),
    qm_kgs, qm_kgh: qm_kgs * 3600,
    Q1_m3h, Q2_m3h,
    P_shaft_kW, P_motor_kW,
    // Extra for display
    rho1, rho2, Qn_m3h, w_Jkg,
  } as CompResult & { rho1: number; rho2: number; Qn_m3h: number; w_Jkg: number };
}

// ─── Gas presets ──────────────────────────────────────────────────────────────
const GAS_PRESETS = [
  { label: "Air",                    MW: 28.97, kappa: 1.400, note: "Dry air" },
  { label: "Natural gas (typical)",  MW: 16.50, kappa: 1.310, note: "~95% CH₄, higher heating gas" },
  { label: "Methane CH₄",           MW: 16.04, kappa: 1.310, note: "" },
  { label: "Propane C₃H₈",          MW: 44.10, kappa: 1.130, note: "LPG" },
  { label: "Nitrogen N₂",           MW: 28.01, kappa: 1.400, note: "" },
  { label: "Carbon dioxide CO₂",    MW: 44.01, kappa: 1.290, note: "" },
  { label: "Hydrogen H₂",           MW: 2.016, kappa: 1.405, note: "" },
  { label: "Helium He",             MW: 4.003, kappa: 1.667, note: "" },
  { label: "Steam (superheated)",   MW: 18.02, kappa: 1.300, note: "Approx. value" },
  { label: "Custom",                MW: NaN,   kappa: NaN,   note: "" },
];

// ─── Unit conversions ─────────────────────────────────────────────────────────
const TO_PA_ABS: Record<string, (v: number) => number> = {
  "bar_a": v => v * 1e5, "MPa_a": v => v * 1e6,
  "kPa_a": v => v * 1e3, "psi_a": v => v * 6894.76,
  "bar_g": v => (v + 1.01325) * 1e5, "MPa_g": v => (v * 10 + 1.01325) * 1e5,
  "kPa_g": v => (v / 100 + 1.01325) * 1e5, "psi_g": v => (v * 0.06895 + 1.01325) * 1e5,
};
const TO_K: Record<string, (v: number) => number> = {
  "°C": v => v + 273.15, "K": v => v, "°F": v => (v - 32) * 5/9 + 273.15,
};
// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number, dp = 2): string { return isFinite(n) && !isNaN(n) ? n.toFixed(dp) : "—"; }
function sig(n: number, s = 4): string  { return isFinite(n) && !isNaN(n) ? parseFloat(n.toPrecision(s)).toString() : "—"; }

const SEL = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500";
const INP = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500";

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CompressorPowerPage() {
  // Gas
  const [gasIdx, setGasIdx]   = useState(0);
  const [cMW,    setCMW]      = useState("28.97");
  const [cKappa, setCKappa]   = useState("1.40");
  const [Z_val,  setZ_val]    = useState("1.0");

  // Suction
  const [P1val,  setP1val]    = useState("");
  const [P1unit, setP1unit]   = useState("bar_a");
  const [T1val,  setT1val]    = useState("");
  const [T1unit, setT1unit]   = useState("°C");

  // Discharge
  const [P2mode, setP2mode]   = useState<"abs"|"ratio">("abs");
  const [P2val,  setP2val]    = useState("");
  const [P2unit, setP2unit]   = useState("bar_a");
  const [rVal,   setRVal]     = useState("");   // compression ratio

  // Flow
  const [qVal,   setQVal]     = useState("");
  const [qUnit,  setQUnit]    = useState("Nm³/h");

  // Efficiency
  const [effType,  setEffType]  = useState<"is"|"poly">("poly");
  const [effVal,   setEffVal]   = useState("80");
  const [etaMVal,  setEtaMVal]  = useState("98");   // mechanical %

  const gasP = GAS_PRESETS[gasIdx];
  const MW    = isNaN(gasP.MW)    ? parseFloat(cMW)    : gasP.MW;
  const kappa = isNaN(gasP.kappa) ? parseFloat(cKappa) : gasP.kappa;
  const Z     = parseFloat(Z_val) || 1.0;
  const eff   = parseFloat(effVal) / 100;
  const eta_m = parseFloat(etaMVal) / 100;

  const result = useMemo(() => {
    const T1_K  = TO_K[T1unit]?.(parseFloat(T1val)) ?? NaN;
    const P1_Pa = TO_PA_ABS[P1unit]?.(parseFloat(P1val)) ?? NaN;

    let P2_Pa: number;
    if (P2mode === "abs") {
      P2_Pa = TO_PA_ABS[P2unit]?.(parseFloat(P2val)) ?? NaN;
    } else {
      P2_Pa = P1_Pa * (parseFloat(rVal) || NaN);
    }

    if (!isFinite(T1_K) || !isFinite(P1_Pa) || !isFinite(P2_Pa)) return null;
    if (!isFinite(MW) || !isFinite(kappa) || !isFinite(Z)) return null;
    if (!isFinite(eff) || eff <= 0 || eff > 1) return null;
    if (!isFinite(eta_m) || eta_m <= 0 || eta_m > 1) return null;

    // Compute rho at suction (for actual flow conversion)
    const rho1 = P1_Pa * MW / (Z * R_UNIV * T1_K);  // kg/m³
    // Normal (standard) density at 0°C, 1.01325 bar
    const rho_n = 101325 * MW / (R_UNIV * 273.15);   // kg/Nm³

    const qv = parseFloat(qVal);
    if (!isFinite(qv) || qv <= 0) return null;

    let qm_kgs: number;
    if (qUnit === "kg/h") qm_kgs = qv / 3600;
    else if (qUnit === "kg/s") qm_kgs = qv;
    else if (qUnit === "Nm³/h") qm_kgs = qv * rho_n / 3600;
    else qm_kgs = qv * rho1 / 3600; // actual m³/h

    if (!isFinite(qm_kgs) || qm_kgs <= 0) return null;

    return calcCompressor(T1_K, P1_Pa, P2_Pa, MW, kappa, Z, qm_kgs, effType, eff, eta_m);
  }, [P1val, P1unit, T1val, T1unit, P2mode, P2val, P2unit, rVal, qVal, qUnit, MW, kappa, Z, eff, eta_m, effType]);

  type FullResult = CompResult & { rho1: number; rho2: number; Qn_m3h: number; w_Jkg: number };
  const res = result as FullResult | null;

  const [copied, setCopied] = useState(false);

  function copyResults() {
    if (!res) return;
    const lines = [
      `Compressor Power — ${GAS_PRESETS[gasIdx].label}`,
      `r = ${fmt(res.r, 3)} · P₁ = ${P1val} ${P1unit} · T₁ = ${T1val} ${T1unit}`,
      `Shaft power: ${fmt(res.P_shaft_kW, 1)} kW (${fmt(res.P_shaft_kW/1000,3)} MW · ${fmt(res.P_shaft_kW*1.341,0)} hp)`,
      `Motor power: ${fmt(res.P_motor_kW, 1)} kW`,
      `T₂ actual: ${fmt(res.T2_actual_is-273.15, 1)} °C`,
      `H_is: ${fmt(res.H_is, 2)} kJ/kg · H_p: ${fmt(res.H_p, 2)} kJ/kg`,
      `η_is: ${fmt(res.eta_is*100, 2)}% · η_p: ${fmt(res.eta_p*100, 2)}% · n: ${fmt(res.n, 4)}`,
      `qm: ${fmt(res.qm_kgh, 1)} kg/h · Q₁: ${fmt(res.Q1_m3h, 1)} m³/h · Qn: ${fmt(res.Qn_m3h, 1)} Nm³/h`,
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  }

  function downloadCSV() {
    if (!res) return;
    type Cell = string | number;
    const rows: Cell[][] = [];
    const p = (...c: Cell[]) => rows.push(c);
    p("Compressor Power Calculator — Fluids Pad");
    p("Gas", GAS_PRESETS[gasIdx].label); p("MW", MW, "kg/kmol"); p("κ", kappa); p("Z_avg", Z);
    p("Efficiency type", effType === "is" ? "Isentropic" : "Polytropic");
    p("Efficiency", parseFloat(effVal), "%"); p("Mechanical efficiency", parseFloat(etaMVal), "%");
    p();
    p("INPUT","Value","Unit");
    p("Inlet pressure P₁", P1val, P1unit);
    p("Inlet temperature T₁", T1val, T1unit);
    p("Discharge pressure / ratio", P2mode === "abs" ? P2val : rVal, P2mode === "abs" ? P2unit : "ratio");
    p("Compression ratio r", fmt(res.r, 4), "");
    p("Flow rate", qVal, qUnit);
    p();
    p("RESULT","Value","Unit");
    p("Shaft power", fmt(res.P_shaft_kW, 2), "kW");
    p("Shaft power", fmt(res.P_shaft_kW/1000, 4), "MW");
    p("Shaft power", fmt(res.P_shaft_kW*1.341, 1), "hp");
    p("Motor power (incl. mech. losses)", fmt(res.P_motor_kW, 2), "kW");
    p("Discharge temperature T₂", fmt(res.T2_actual_is-273.15, 2), "°C");
    p("Discharge temperature T₂", fmt(res.T2_actual_is, 2), "K");
    p("Isentropic T₂ (ideal)", fmt(res.T2_is-273.15, 2), "°C");
    p("Isentropic head H_is", fmt(res.H_is, 4), "kJ/kg");
    p("Polytropic head H_p", fmt(res.H_p, 4), "kJ/kg");
    p("Polytropic exponent n", fmt(res.n, 5), "");
    p("n/(n-1)", fmt(res.n_over_nm1, 5), "");
    p("Isentropic efficiency η_is", fmt(res.eta_is*100, 3), "%");
    p("Polytropic efficiency η_p", fmt(res.eta_p*100, 3), "%");
    p("Mass flow qm", fmt(res.qm_kgh, 2), "kg/h");
    p("Mass flow qm", fmt(res.qm_kgs, 5), "kg/s");
    p("Actual suction flow Q₁", fmt(res.Q1_m3h, 2), "m³/h (actual)");
    p("Actual discharge flow Q₂", fmt(res.Q2_m3h, 2), "m³/h (actual)");
    p("Normal flow Qn", fmt(res.Qn_m3h, 2), "Nm³/h (0°C, 1.01325 bar)");
    p("Suction gas density ρ₁", fmt(res.rho1, 4), "kg/m³");
    p("Discharge gas density ρ₂", fmt(res.rho2, 4), "kg/m³");
    p();
    p("Note","Shaft power = qm × Cₚ × ΔT = qm × Z·κ/(κ-1)·R/MW × (T₂-T₁). First law for adiabatic compressor.");
    const csv = rows.map(r=>r.map(c=>`"${String(c)}"`).join(",")).join("\r\n");
    const blob = new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="compressor-power.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // High-temp warning
  const T2_warn = res && res.T2_actual_is > 473.15; // > 200°C

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Compressor Power</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Isentropic &amp; polytropic head · shaft power · discharge temperature · actual and normal flow
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={copyResults} disabled={!res}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {copied ? <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Copied!</> : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</>}
          </button>
          <button onClick={downloadCSV} disabled={!res}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            CSV
          </button>
        </div>
      </div>

      <div className="flex gap-5 items-start">

        {/* ══ SIDEBAR ══════════════════════════════════════════════════════ */}
        <aside className="w-80 flex-shrink-0 space-y-4 sticky top-20 max-h-[calc(100vh-7rem)] overflow-y-auto pb-4">

          {/* Gas */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Gas Properties</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gas preset</p>
                <select value={gasIdx} onChange={e=>setGasIdx(Number(e.target.value))} className={SEL}>
                  {GAS_PRESETS.map((g,i)=><option key={i} value={i}>{g.label}{g.note?` — ${g.note}`:""}</option>)}
                </select>
              </div>
              {isNaN(gasP.MW) ? (
                <>
                  <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Molecular weight MW (kg/kmol)</p><input type="number" value={cMW} onChange={e=>setCMW(e.target.value)} className={INP}/></div>
                  <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Isentropic exponent κ (C<sub>p</sub>/C<sub>v</sub>)</p><input type="number" value={cKappa} onChange={e=>setCKappa(e.target.value)} step="any" className={INP}/></div>
                </>
              ) : (
                <div className="flex gap-3 text-xs text-gray-400 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2">
                  <span>MW = {gasP.MW}</span><span>·</span><span>κ = {gasP.kappa}</span>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Average compressibility Z<sub>avg</sub></p>
                <input type="number" value={Z_val} onChange={e=>setZ_val(e.target.value)} placeholder="1.0" step="any" className={INP}/>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">1.0 for ideal gas. Use (Z₁+Z₂)/2 for real gas.</p>
              </div>
            </div>
          </div>

          {/* Suction */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Suction Conditions</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Inlet pressure P₁</p>
                <div className="flex gap-1.5">
                  <input type="number" value={P1val} onChange={e=>setP1val(e.target.value)} placeholder="e.g. 1.013" className={`flex-1 ${INP}`}/>
                  <select value={P1unit} onChange={e=>setP1unit(e.target.value)} className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500">
                    {Object.keys(TO_PA_ABS).map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Inlet temperature T₁</p>
                <div className="flex gap-1.5">
                  <input type="number" value={T1val} onChange={e=>setT1val(e.target.value)} placeholder="e.g. 20" className={`flex-1 ${INP}`}/>
                  <select value={T1unit} onChange={e=>setT1unit(e.target.value)} className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500">
                    {Object.keys(TO_K).map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Flow rate</p>
                <div className="flex gap-1.5">
                  <input type="number" value={qVal} onChange={e=>setQVal(e.target.value)} placeholder="e.g. 5000" className={`flex-1 ${INP}`}/>
                  <select value={qUnit} onChange={e=>setQUnit(e.target.value)} className="w-28 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500">
                    {["kg/h","kg/s","Nm³/h","m³/h (actual)"].map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
                {qUnit === "Nm³/h" && <p className="text-[10px] text-gray-400 mt-0.5">Reference: 0 °C, 1.01325 bar</p>}
                {qUnit === "m³/h (actual)" && <p className="text-[10px] text-gray-400 mt-0.5">Actual volumetric flow at suction P and T</p>}
              </div>
            </div>
          </div>

          {/* Discharge */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Discharge Conditions</p>
            <div className="space-y-3">
              <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 text-xs">
                <button onClick={()=>setP2mode("abs")}
                  className={`flex-1 py-1.5 font-semibold ${P2mode==="abs"?"bg-purple-500 text-white":"bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                  Discharge P
                </button>
                <button onClick={()=>setP2mode("ratio")}
                  className={`flex-1 py-1.5 font-semibold ${P2mode==="ratio"?"bg-purple-500 text-white":"bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                  Ratio r = P₂/P₁
                </button>
              </div>
              {P2mode === "abs" ? (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Discharge pressure P₂</p>
                  <div className="flex gap-1.5">
                    <input type="number" value={P2val} onChange={e=>setP2val(e.target.value)} placeholder="e.g. 4.0" className={`flex-1 ${INP}`}/>
                    <select value={P2unit} onChange={e=>setP2unit(e.target.value)} className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500">
                      {Object.keys(TO_PA_ABS).map(u=><option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Compression ratio r = P₂/P₁</p>
                  <input type="number" value={rVal} onChange={e=>setRVal(e.target.value)} placeholder="e.g. 4.0" className={INP}/>
                </div>
              )}
              {res && <p className="text-[10px] text-purple-500 dark:text-purple-400">r = {fmt(res.r, 3)}</p>}
            </div>
          </div>

          {/* Efficiency */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Efficiency</p>
            <div className="space-y-3">
              <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 text-xs">
                <button onClick={()=>setEffType("poly")}
                  className={`flex-1 py-1.5 font-semibold ${effType==="poly"?"bg-purple-500 text-white":"bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                  Polytropic η<sub>p</sub>
                </button>
                <button onClick={()=>setEffType("is")}
                  className={`flex-1 py-1.5 font-semibold ${effType==="is"?"bg-purple-500 text-white":"bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                  Isentropic η<sub>is</sub>
                </button>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {effType === "poly" ? "Polytropic efficiency η_p (%)" : "Isentropic efficiency η_is (%)"}
                </p>
                <input type="number" value={effVal} onChange={e=>setEffVal(e.target.value)}
                  min="1" max="100" placeholder="80" className={INP}/>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {effType === "poly"
                    ? "Centrifugal: 75–85%. Reciprocating: 80–90%."
                    : "Centrifugal: 70–80%. Axial: 80–90%."}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Mechanical efficiency η<sub>m</sub> (%)</p>
                <input type="number" value={etaMVal} onChange={e=>setEtaMVal(e.target.value)}
                  min="80" max="100" placeholder="98" className={INP}/>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Bearing &amp; seal losses. Typically 96–99%.</p>
              </div>
            </div>
          </div>

        </aside>

        {/* ══ RESULTS ══════════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Empty state */}
          {!res && (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
              </svg>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Enter gas, suction conditions, discharge pressure, and flow</p>
            </div>
          )}

          {res && (
            <>
              {/* High-temp warning */}
              {T2_warn && (
                <div className="flex items-start gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
                  <span className="text-lg flex-shrink-0">⚠</span>
                  <span><strong>High discharge temperature: {fmt(res.T2_actual_is-273.15, 0)} °C</strong> — exceeds 200 °C. Check material limits for cylinder/casing, seals, and lubrication. Consider interstage cooling for multi-stage compression.</span>
                </div>
              )}

              {/* ── Primary outputs ──────────────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-4 sm:col-span-2">
                  <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">Shaft power</p>
                  <p className="text-3xl font-black text-purple-700 dark:text-purple-300">
                    {fmt(res.P_shaft_kW, 1)} <span className="text-base">kW</span>
                  </p>
                  <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-0.5">
                    {fmt(res.P_shaft_kW / 1000, 3)} MW · {fmt(res.P_shaft_kW * 1.341, 0)} hp
                  </p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800 p-4">
                  <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1">Motor power</p>
                  <p className="text-2xl font-black text-orange-700 dark:text-orange-300">{fmt(res.P_motor_kW, 1)} <span className="text-sm">kW</span></p>
                  <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-0.5">η<sub>m</sub> = {etaMVal}%</p>
                </div>
                <div className={`rounded-xl border p-4 ${T2_warn ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"}`}>
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Discharge T₂</p>
                  <p className="text-2xl font-black text-red-700 dark:text-red-300">
                    {fmt(res.T2_actual_is - 273.15, 1)} <span className="text-sm">°C</span>
                  </p>
                  <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">T₂_is = {fmt(res.T2_is - 273.15, 1)} °C</p>
                </div>
              </div>

              {/* ── Two-column: isentropic vs polytropic ─────────────────── */}
              <div className="grid sm:grid-cols-2 gap-4">

                {/* Isentropic */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-1 self-stretch min-h-[2rem] rounded-full bg-blue-500 flex-shrink-0"/>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">Isentropic (adiabatic)</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        η<sub>is</sub> = {effType==="is" ? effVal+"%" : fmt(res.eta_is*100,1)+"%"}
                        {effType==="poly" ? " (from polytropic input)" : ""}
                      </p>
                    </div>
                  </div>
                  {[
                    { label:"Isentropic head H_is",     value:`${fmt(res.H_is, 2)} kJ/kg` },
                    { label:"T₂ isentropic",            value:`${fmt(res.T2_is-273.15, 1)} °C` },
                    { label:"T₂ actual (adiabatic path)",value:`${fmt(res.T2_actual_is-273.15, 1)} °C` },
                    { label:"Shaft power (isentropic)",  value:`${fmt(res.P_shaft_is, 1)} kW` },
                    { label:"η_is",                      value:`${fmt(res.eta_is*100, 2)} %` },
                  ].map(item=>(
                    <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{item.label}</span>
                      <span className="text-sm font-mono font-semibold text-gray-900 dark:text-white">{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Polytropic */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-1 self-stretch min-h-[2rem] rounded-full bg-purple-500 flex-shrink-0"/>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">Polytropic</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        η<sub>p</sub> = {effType==="poly" ? effVal+"%" : fmt(res.eta_p*100,1)+"%"}
                        {effType==="is" ? " (from isentropic input)" : ""}
                      </p>
                    </div>
                  </div>
                  {[
                    { label:"Polytropic exponent n",    value:fmt(res.n, 4) },
                    { label:"n/(n−1)",                  value:fmt(res.n_over_nm1, 4) },
                    { label:"Polytropic head H_p",      value:`${fmt(res.H_p, 2)} kJ/kg` },
                    { label:"T₂ actual (polytropic)",   value:`${fmt(res.T2_poly-273.15, 1)} °C` },
                    { label:"Shaft power (polytropic)", value:`${fmt(res.P_shaft_p, 1)} kW` },
                    { label:"η_p",                      value:`${fmt(res.eta_p*100, 2)} %` },
                  ].map(item=>(
                    <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{item.label}</span>
                      <span className="text-sm font-mono font-semibold text-gray-900 dark:text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Flow and conditions ──────────────────────────────────── */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-1 self-stretch min-h-[2rem] rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0"/>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Gas State Summary</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {([
                    { label:"Compression ratio r",       value:fmt(res.r, 4) },
                    { label:"Mass flow qm",              value:`${fmt(res.qm_kgh, 1)} kg/h` },
                    { label:"Mass flow qm",              value:`${sig(res.qm_kgs, 4)} kg/s` },
                    { label:"Suction flow Q₁ (actual)",  value:`${fmt(res.Q1_m3h, 2)} m³/h` },
                    { label:"Discharge flow Q₂ (actual)",value:`${fmt(res.Q2_m3h, 2)} m³/h` },
                    { label:"Normal flow Qn",            value:`${fmt((res as FullResult).Qn_m3h ?? 0, 2)} Nm³/h` },
                    { label:"Suction density ρ₁",        value:`${fmt((res as FullResult).rho1 ?? 0, 4)} kg/m³` },
                    { label:"Discharge density ρ₂",      value:`${fmt((res as FullResult).rho2 ?? 0, 4)} kg/m³` },
                    { label:"Gas MW",                    value:`${fmt(MW, 3)} kg/kmol` },
                    { label:"κ (isentropic exp.)",       value:fmt(kappa, 3) },
                    { label:"Z average",                 value:fmt(Z, 3) },
                    { label:"Shaft power",               value:`${fmt(res.P_shaft_kW, 2)} kW` },
                    { label:"Motor power",               value:`${fmt(res.P_motor_kW, 2)} kW` },
                    { label:"Power (hp)",                value:`${fmt(res.P_shaft_kW*1.341, 1)} hp` },
                  ] as {label:string;value:string}[]).map(item=>(
                    <div key={item.label+item.value} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{item.label}</p>
                      <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Efficiency note ───────────────────────────────────────── */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-200 dark:border-purple-800 p-5">
                <h3 className="text-sm font-bold text-purple-700 dark:text-purple-300 mb-2">Isentropic vs Polytropic efficiency — when each is used</h3>
                <div className="grid sm:grid-cols-2 gap-4 text-xs text-purple-700 dark:text-purple-300">
                  <div>
                    <p className="font-bold mb-1">Isentropic (adiabatic) η<sub>is</sub></p>
                    <ul className="space-y-0.5 list-disc list-inside opacity-80">
                      <li>Standard for reciprocating compressors</li>
                      <li>Lower value than η<sub>p</sub> for same machine</li>
                      <li>Used in API 618 (reciprocating)</li>
                      <li>Easier to measure directly</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-bold mb-1">Polytropic η<sub>p</sub></p>
                    <ul className="space-y-0.5 list-disc list-inside opacity-80">
                      <li>Standard for centrifugal &amp; axial compressors</li>
                      <li>Higher value than η<sub>is</sub> for same machine</li>
                      <li>Used in API 617 (centrifugal)</li>
                      <li>Stage-independent — fairer comparison</li>
                    </ul>
                  </div>
                </div>
                <p className="text-[10px] text-purple-600/70 dark:text-purple-400/70 mt-3">
                  Both efficiencies converge as r → 1; difference grows with r. For an adiabatic machine (first law):
                  shaft work = Cₚ × (T₂ − T₁) = H<sub>is</sub> / η<sub>is</sub>.
                  The polytropic head H<sub>p</sub> is a characterisation parameter — NOT the shaft work.
                  At r = {fmt(res.r,3)}: η<sub>is</sub> = {fmt(res.eta_is*100,2)}% · η<sub>p</sub> = {fmt(res.eta_p*100,2)}% · n = {fmt(res.n,4)}.
                </p>
              </div>
            </>
          )}

          <References refs={REFS_COMPRESSOR_POWER} />
        </div>
      </div>
    </div>
  );
}
