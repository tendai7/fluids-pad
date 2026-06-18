"use client";

import React, { useState, useMemo } from "react";
import { References } from "@/components/References";
import { REFS_SLURRY_PIPELINE } from "@/lib/references";

// ─── Physics ───────────────────────────────────────────────────────────────────
//
// SETTLING VELOCITY (iterative drag coefficient method)
// C_D = 24/Re_p + 6/(1+√Re_p) + 0.4   (Schiller-Naumann modified)
// w_s = √(4/3 · g · (ρ_s-ρ_l) · d₅₀ / (C_D · ρ_l))
//
// CRITICAL DEPOSITION VELOCITY (Durand, 1953)
// V_c = F_L · √(2 · g · D · (S_s - 1))
// F_L from particle size (Durand-Condolios chart — interpolated table)
//
// HEAD LOSS — DURAND-CONDOLIOS (modified)
// Ψ_D = V² / (g · D · (S_s - 1)) · √(C_D)
// (i_m - i_w) / (C_v · i_w) = 82 / Ψ_D^(3/2)
// i_m = i_w · (1 + 82 · C_v / Ψ_D^(3/2))
//
// CLEAR-WATER HEAD LOSS — DARCY-WEISBACH + COLEBROOK-WHITE
// f from Colebrook-White, then i_w = f · V² / (2 · g · D)
//
// PUMP DE-RATING — WILSON-ADDIE (simplified preliminary design)
// HR = H_m/H_w = 1 − 0.019 · (C_v/0.15)^0.36 · (d₈₅/10mm)^0.22
// ER ≈ HR   (efficiency ratio approximation)
// Required pump head: H_pump = H_m / HR

const G = 9.81;

// ── Iterative settling velocity and drag coefficient ─────────────────────────
function settlingVelocity(d50_m: number, rho_s: number, rho_l: number, mu_l: number): { ws: number; Cd: number } {
  let ws = G * (rho_s - rho_l) * d50_m * d50_m / (18 * mu_l); // Stokes initial
  let Cd = 24;
  for (let i = 0; i < 100; i++) {
    const Re_p = Math.max(1e-9, rho_l * ws * d50_m / mu_l);
    if (Re_p < 0.4) {
      Cd = 24 / Re_p;
    } else if (Re_p < 500) {
      Cd = 24 / Re_p + 6 / (1 + Math.sqrt(Re_p)) + 0.4;
    } else {
      Cd = 0.44;
    }
    const ws_new = Math.sqrt(4 / 3 * G * (rho_s - rho_l) * d50_m / (Cd * rho_l));
    if (Math.abs(ws_new - ws) < 1e-9) { ws = ws_new; break; }
    ws = ws * 0.5 + ws_new * 0.5; // damped iteration
  }
  return { ws, Cd };
}

// ── Durand F_L factor (from particle size d50 in mm) ─────────────────────────
// Source: Durand-Condolios (1952) chart digitised for d50 range 0.1–50 mm
const FL_TABLE: [number, number][] = [
  [0.10, 0.90], [0.15, 0.95], [0.20, 1.00], [0.30, 1.05],
  [0.40, 1.10], [0.60, 1.20], [0.80, 1.30], [1.00, 1.35],
  [1.50, 1.42], [2.00, 1.48], [3.00, 1.55], [5.00, 1.62],
  [10.0, 1.68], [20.0, 1.72], [50.0, 1.75],
];
function flFactor(d50_mm: number): number {
  if (d50_mm <= FL_TABLE[0][0]) return FL_TABLE[0][1];
  if (d50_mm >= FL_TABLE[FL_TABLE.length - 1][0]) return FL_TABLE[FL_TABLE.length - 1][1];
  for (let i = 0; i < FL_TABLE.length - 1; i++) {
    const [d0, fl0] = FL_TABLE[i], [d1, fl1] = FL_TABLE[i + 1];
    if (d50_mm >= d0 && d50_mm <= d1) {
      return fl0 + (fl1 - fl0) * (d50_mm - d0) / (d1 - d0);
    }
  }
  return 1.35;
}

// ── Colebrook-White friction factor ──────────────────────────────────────────
function colebrook(Re: number, eps_D: number): number {
  if (Re < 2300) return 64 / Re;
  let f = 0.02;
  for (let i = 0; i < 50; i++) {
    const fn = 1 / Math.pow(-2 * Math.log10(eps_D / 3.7 + 2.51 / (Re * Math.sqrt(f))), 2);
    if (Math.abs(fn - f) < 1e-10) { f = fn; break; }
    f = fn;
  }
  return f;
}

// ── Main slurry pipeline calculation ─────────────────────────────────────────
function calcSlurry(
  D_mm: number, eps_mm: number, L_m: number,
  rho_l: number, mu_l: number,
  SG_s: number, d50_mm: number, d85_mm: number,
  Cv: number,           // volumetric concentration (fraction)
  V_ms: number,         // flow velocity (m/s)
  H_pump_w: number | null, // rated pump head in clear water (m), or null
) {
  const D = D_mm / 1000;
  const eps_D = (eps_mm / 1000) / D;
  // SG_s is always relative to water (1000 kg/m³), not relative to the carrier
  const rho_s = SG_s * 1000;                    // absolute solid density [kg/m³]
  const S_s   = rho_s / rho_l;                  // solids SG relative to carrier
  const rho_m = rho_l + Cv * (rho_s - rho_l);  // mixture density
  const S_m   = rho_m / rho_l;                  // mixture SG relative to carrier
  const Cw    = Cv * rho_s / rho_m;             // mass concentration

  // Settling velocity and drag coefficient (d50)
  const d50_m = d50_mm / 1000;
  const { ws, Cd } = settlingVelocity(d50_m, rho_s, rho_l, mu_l);

  // FL factor and critical deposition velocity
  const FL    = flFactor(d50_mm);
  const V_c   = FL * Math.sqrt(2 * G * D * (S_s - 1));
  const velRatio = V_ms / V_c;

  // Clear water head loss (Darcy-Weisbach, carrier fluid properties)
  const Re_w  = rho_l * V_ms * D / mu_l;
  const f_w   = colebrook(Re_w, eps_D);
  const i_w   = f_w * V_ms * V_ms / (2 * G * D);   // m/m hydraulic gradient

  // Durand-Condolios excess head loss
  const psi_D = (V_ms * V_ms / (G * D * (S_s - 1))) * Math.sqrt(Cd);
  const phi_D = psi_D > 0 ? 82 / Math.pow(psi_D, 1.5) : 0;

  // Mixture hydraulic gradient
  const i_m   = i_w * (1 + phi_D * Cv);
  const i_excess = i_m - i_w;                      // excess due to solids

  // Total head loss over pipe length
  const HL_w  = i_w * L_m;                          // water head loss [m]
  const HL_m  = i_m * L_m;                          // mixture head loss [m]

  // Pump de-rating (Wilson-Addie simplified)
  const HR = Math.max(0.5, 1 - 0.019 * Math.pow(Math.max(Cv, 0.01) / 0.15, 0.36) * Math.pow(Math.max(d85_mm, 0.1) / 10, 0.22));
  const ER = HR; // approximation
  const H_pump_required = H_pump_w !== null ? HL_m : null;
  const H_pump_derated  = H_pump_w !== null ? H_pump_w * HR : null;

  // Pipe cross-section and flow rate
  const A     = Math.PI * D * D / 4;
  const Q_m3h = V_ms * A * 3600;

  // Solid and mixture mass flow rates
  const qm_solids = V_ms * A * rho_s * Cv * 3600; // kg/h
  const qm_mix    = V_ms * A * rho_m * 3600;       // kg/h

  // Recommended operating velocity (1.3 × V_c — 30% safety margin above deposition)
  const V_rec = 1.3 * V_c;

  // Pressure drops in kPa and bar (using mixture density)
  const DP_m_kPa = rho_m * G * HL_m / 1000;
  const DP_m_bar = DP_m_kPa / 100;
  const DP_w_kPa = rho_l  * G * HL_w / 1000;  // water-equivalent ΔP

  return {
    rho_m, S_m, Cw, Cv,
    ws, Cd, FL, V_c, V_rec, velRatio,
    Re_w, f_w, i_w, i_m, i_excess, phi_D, psi_D,
    HL_w, HL_m,
    DP_m_kPa, DP_m_bar, DP_w_kPa,
    HR, ER, H_pump_derated, H_pump_required,
    Q_m3h, qm_solids, qm_mix, A,
    ok_vel: velRatio >= 1.0,
    safe_vel: velRatio >= 1.2,
  };
}

// ─── Carrier and solid presets ────────────────────────────────────────────────
const CARRIER_PRESETS = [
  { label: "Fresh water 20 °C",  rho: 998.2, mu: 1.002e-3 },
  { label: "Fresh water 30 °C",  rho: 995.7, mu: 0.797e-3 },
  { label: "Seawater 20 °C",    rho: 1025,  mu: 1.07e-3  },
  { label: "Process water 40 °C",rho: 992.2, mu: 0.653e-3 },
  { label: "Custom",             rho: NaN,   mu: NaN      },
];
const SOLID_PRESETS = [
  { label: "Quartz / silica sand (SG 2.65)",  SG: 2.65 },
  { label: "Gold ore tailings (SG 2.80)",     SG: 2.80 },
  { label: "Platinum tailings (SG 3.20)",     SG: 3.20 },
  { label: "Coal (SG 1.45)",                  SG: 1.45 },
  { label: "Iron ore (SG 4.50)",              SG: 4.50 },
  { label: "Chrome ore (SG 4.20)",            SG: 4.20 },
  { label: "Manganese ore (SG 3.80)",         SG: 3.80 },
  { label: "Copper concentrate (SG 4.20)",    SG: 4.20 },
  { label: "Limestone (SG 2.70)",             SG: 2.70 },
  { label: "Custom",                          SG: NaN  },
];
const PIPE_MATERIALS = [
  { label: "Steel (new)",          eps: 0.046 },
  { label: "Steel (used/pitted)",  eps: 0.30  },
  { label: "Rubber-lined steel",   eps: 0.015 },
  { label: "HDPE smooth",          eps: 0.003 },
  { label: "Cast iron",            eps: 0.26  },
  { label: "Custom ε (mm)",        eps: NaN   },
];

// ─── Unit helpers ─────────────────────────────────────────────────────────────
const TO_MS: Record<string, number> = { "m/s": 1, "ft/s": 0.3048 };
const TO_M3H: Record<string, number> = { "m³/h": 1, "L/s": 3.6, "GPM": 0.22712 };

function fmt(n: number, dp = 2): string { return isFinite(n) && !isNaN(n) ? n.toFixed(dp) : "—"; }
function sig(n: number, s = 4): string  { return isFinite(n) ? parseFloat(n.toPrecision(s)).toString() : "—"; }

const SEL = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500";
const INP = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-500";

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SlurryPipelinePage() {
  // Carrier
  const [carrIdx,   setCarrIdx]   = useState(0);
  const [cRhoL,     setCRhoL]     = useState("998.2");
  const [cMuL,      setCMuL]      = useState("0.001002");

  // Solid
  const [solidIdx,  setSolidIdx]  = useState(0);
  const [cSG,       setCSG]       = useState("2.65");
  const [d50val,    setD50val]    = useState("");
  const [d85val,    setD85val]    = useState("");

  // Concentration
  const [concMode,  setConcMode]  = useState<"Cv"|"Cw">("Cv");
  const [concVal,   setConcVal]   = useState("");

  // Pipe
  const [D_mm,      setD_mm]      = useState("");
  const [matIdx,    setMatIdx]    = useState(0);
  const [cEps,      setCEps]      = useState("0.046");
  const [L_m,       setL_m]       = useState("");

  // Flow
  const [flowMode,  setFlowMode]  = useState<"vel"|"Q">("vel");
  const [V_val,     setV_val]     = useState("");
  const [V_unit,    setV_unit]    = useState("m/s");
  const [Q_val,     setQ_val]     = useState("");
  const [Q_unit,    setQ_unit]    = useState("m³/h");

  // Pump
  const [H_pump,    setH_pump]    = useState("");  // rated head in clear water [m]

  const [copied,    setCopied]    = useState(false);

  // Derived
  const carrP = CARRIER_PRESETS[carrIdx];
  const rho_l = isNaN(carrP.rho) ? parseFloat(cRhoL) : carrP.rho;
  const mu_l  = isNaN(carrP.mu)  ? parseFloat(cMuL)  : carrP.mu;
  const solidP = SOLID_PRESETS[solidIdx];
  const SG_s  = isNaN(solidP.SG) ? parseFloat(cSG) : solidP.SG;
  const eps_mm = isFinite(PIPE_MATERIALS[matIdx].eps) ? PIPE_MATERIALS[matIdx].eps : parseFloat(cEps);

  // Concentration to Cv
  const concPct = parseFloat(concVal);
  const CvDerived = useMemo(() => {
    if (!isFinite(concPct) || !isFinite(SG_s) || !isFinite(rho_l)) return NaN;
    const rho_s = SG_s * 1000; // SG always relative to water
    if (concMode === "Cv") return concPct / 100;
    // Cw given: Cv = Cw × rho_m / rho_s → iterative since rho_m depends on Cv
    // rho_m = rho_l / (1 - Cw×(1 - rho_l/rho_s))
    const Cw = concPct / 100;
    const rho_m = rho_l / (1 - Cw * (1 - rho_l / rho_s));
    return Cw * rho_m / rho_s;
  }, [concPct, concMode, SG_s, rho_l]);

  // Velocity
  const V_ms = useMemo(() => {
    if (flowMode === "vel") return parseFloat(V_val) * (TO_MS[V_unit] ?? 1);
    const Q = parseFloat(Q_val) * (TO_M3H[Q_unit] ?? 1) / 3600; // m³/s
    const D = parseFloat(D_mm) / 1000;
    if (!isFinite(D) || D <= 0) return NaN;
    return Q / (Math.PI / 4 * D * D);
  }, [flowMode, V_val, V_unit, Q_val, Q_unit, D_mm]);

  const result = useMemo(() => {
    const D = parseFloat(D_mm);
    const L = parseFloat(L_m);
    const d50 = parseFloat(d50val);
    const d85 = parseFloat(d85val) || d50 * 1.8; // default d85 ≈ 1.8 × d50
    const H_w = parseFloat(H_pump) || null;

    if (!isFinite(D) || D <= 0) return null;
    if (!isFinite(rho_l) || !isFinite(mu_l)) return null;
    if (!isFinite(SG_s) || SG_s <= 1) return null;
    if (!isFinite(d50) || d50 <= 0) return null;
    if (!isFinite(CvDerived) || CvDerived <= 0 || CvDerived >= 1) return null;
    if (!isFinite(V_ms) || V_ms <= 0) return null;
    if (!isFinite(eps_mm)) return null;

    return calcSlurry(D, eps_mm, isFinite(L) ? L : 1000, rho_l, mu_l, SG_s, d50, d85, CvDerived, V_ms, H_w);
  }, [D_mm, L_m, d50val, d85val, rho_l, mu_l, SG_s, CvDerived, V_ms, eps_mm, H_pump]);

  function copyResults() {
    if (!result) return;
    const lines = [
      `Slurry Pipeline — ${solidP.label}`,
      `D = ${D_mm} mm · L = ${L_m} m · V = ${fmt(V_ms,3)} m/s (${fmt(V_ms/0.3048,3)} ft/s) · Q = ${fmt(result.Q_m3h,1)} m³/h`,
      `Cv = ${fmt(result.Cv*100,2)}% · Cw = ${fmt(result.Cw*100,2)}% · ρ_m = ${fmt(result.rho_m,1)} kg/m³`,
      `V_c = ${fmt(result.V_c,2)} m/s · V_rec = ${fmt(result.V_rec,2)} m/s · V/V_c = ${fmt(result.velRatio,3)} ${result.ok_vel?"✓":"⚠ BELOW CRITICAL"}`,
      `i_w = ${sig(result.i_w,4)} m/m · i_m = ${sig(result.i_m,4)} m/m`,
      `HL_w = ${fmt(result.HL_w,1)} m · HL_m = ${fmt(result.HL_m,1)} m · ΔP = ${fmt(result.DP_m_kPa,1)} kPa (${fmt(result.DP_m_bar,3)} bar)`,
      `Solid flow = ${fmt(result.qm_solids,0)} kg/h · Mix flow = ${fmt(result.qm_mix,0)} kg/h`,
      `HR = ${fmt(result.HR,3)} · ER = ${fmt(result.ER,3)}`,
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  }

  function csvDownload() {
    if (!result) return;
    const rows = [
      ["Parameter","Value","Unit"],
      ["Solid material", solidP.label, ""],
      ["Carrier fluid", CARRIER_PRESETS[carrIdx].label, ""],
      ["Pipe ID", D_mm, "mm"],
      ["Pipe length", L_m, "m"],
      ["Roughness ε", eps_mm, "mm"],
      ["d50", d50val, "mm"],
      ["d85", d85val || String((parseFloat(d50val)*1.8).toFixed(2)), "mm"],
      ["Velocity V", fmt(V_ms,3), "m/s"],
      ["Velocity V", fmt(V_ms/0.3048,3), "ft/s"],
      ["Flow rate Q", fmt(result.Q_m3h,3), "m³/h"],
      ["Cv (volumetric)", fmt(result.Cv*100,3), "%"],
      ["Cw (mass)", fmt(result.Cw*100,3), "%"],
      ["Mixture density ρ_m", fmt(result.rho_m,1), "kg/m³"],
      ["Mixture SG", fmt(result.S_m,4), ""],
      ["Settling velocity w_s", fmt(result.ws,4), "m/s"],
      ["Drag coefficient C_D", fmt(result.Cd,3), ""],
      ["Durand F_L factor", fmt(result.FL,3), ""],
      ["Critical deposition velocity V_c", fmt(result.V_c,3), "m/s"],
      ["Recommended operating velocity V_rec (1.3×V_c)", fmt(result.V_rec,3), "m/s"],
      ["V/V_c ratio", fmt(result.velRatio,4), ""],
      ["Status", result.safe_vel?"Safe":result.ok_vel?"Marginal":"BELOW CRITICAL", ""],
      ["Pipe Re (carrier)", sig(result.Re_w,4), ""],
      ["Darcy friction factor f", fmt(result.f_w,5), ""],
      ["Clear-water hydraulic gradient i_w", sig(result.i_w,5), "m/m"],
      ["Durand parameter Ψ_D", sig(result.psi_D,4), ""],
      ["Excess head ratio Φ_D", fmt(result.phi_D,3), ""],
      ["Mixture hydraulic gradient i_m", sig(result.i_m,5), "m/m"],
      ["Excess gradient i_excess", sig(result.i_excess,5), "m/m"],
      ["Clear-water head loss HL_w", fmt(result.HL_w,2), "m"],
      ["Mixture head loss HL_m", fmt(result.HL_m,2), "m"],
      ["Mixture pressure drop ΔP", fmt(result.DP_m_kPa,2), "kPa"],
      ["Mixture pressure drop ΔP", fmt(result.DP_m_bar,4), "bar"],
      ["Solid mass flow rate", fmt(result.qm_solids,1), "kg/h"],
      ["Mixture mass flow rate", fmt(result.qm_mix,1), "kg/h"],
      ["Head ratio HR (Wilson-Addie)", fmt(result.HR,4), ""],
      ["Efficiency ratio ER", fmt(result.ER,4), ""],
      ...(result.H_pump_derated !== null ? [
        ["Pump rated head (clear water)", H_pump, "m"],
        ["Pump de-rated head (slurry)", fmt(result.H_pump_derated,2), "m"],
      ] : []),
    ];
    const csv = rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="slurry-pipeline.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Slurry Pipeline Calculator</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Durand-Condolios critical velocity &amp; head loss · Wilson-GIW pump de-rating · Mining / mineral processing
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={csvDownload} disabled={!result}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            CSV
          </button>
          <button onClick={copyResults} disabled={!result}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {copied ? <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Copied!</> : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</>}
          </button>
        </div>
      </div>

      <div className="flex gap-5 items-start">

        {/* ══ SIDEBAR ══════════════════════════════════════════════════════ */}
        <aside className="w-80 flex-shrink-0 space-y-4 sticky top-20 max-h-[calc(100vh-7rem)] overflow-y-auto pb-4">

          {/* Carrier fluid */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Carrier Fluid</p>
            <div className="space-y-3">
              <select value={carrIdx} onChange={e=>setCarrIdx(Number(e.target.value))} className={SEL}>
                {CARRIER_PRESETS.map((c,i)=><option key={i} value={i}>{c.label}</option>)}
              </select>
              {isNaN(carrP.rho) ? (
                <>
                  <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Density ρ_l (kg/m³)</p><input type="number" value={cRhoL} onChange={e=>setCRhoL(e.target.value)} className={INP}/></div>
                  <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Viscosity μ_l (Pa·s)</p><input type="number" value={cMuL} onChange={e=>setCMuL(e.target.value)} step="any" className={INP}/></div>
                </>
              ) : (
                <div className="flex gap-3 text-xs text-gray-400 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2">
                  <span>ρ = {carrP.rho} kg/m³</span><span>·</span><span>μ = {carrP.mu.toExponential(3)} Pa·s</span>
                </div>
              )}
            </div>
          </div>

          {/* Solid properties */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Solid Properties</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Material preset</p>
                <select value={solidIdx} onChange={e=>setSolidIdx(Number(e.target.value))} className={SEL}>
                  {SOLID_PRESETS.map((s,i)=><option key={i} value={i}>{s.label}</option>)}
                </select>
              </div>
              {isNaN(solidP.SG) && (
                <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Specific gravity SG_s</p><input type="number" value={cSG} onChange={e=>setCSG(e.target.value)} step="0.05" className={INP}/></div>
              )}
              {!isNaN(solidP.SG) && (
                <p className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2">SG_s = {solidP.SG}</p>
              )}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">d₅₀ — median particle size (mm)</p>
                <input type="number" value={d50val} onChange={e=>setD50val(e.target.value)} placeholder="e.g. 0.3" step="any" className={INP}/>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">d₈₅ — 85th percentile size (mm)</p>
                <input type="number" value={d85val} onChange={e=>setD85val(e.target.value)} placeholder={d50val ? `default = ${(parseFloat(d50val)*1.8).toFixed(2)}` : "e.g. 0.54"} step="any" className={INP}/>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Used for pump de-rating. If blank, defaults to 1.8 × d₅₀.</p>
              </div>
            </div>
          </div>

          {/* Concentration */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Concentration</p>
            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 mb-3 text-xs">
              <button onClick={()=>setConcMode("Cv")} className={`flex-1 py-1.5 font-semibold ${concMode==="Cv"?"bg-yellow-500 text-white":"bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>C_v (vol %)</button>
              <button onClick={()=>setConcMode("Cw")} className={`flex-1 py-1.5 font-semibold ${concMode==="Cw"?"bg-yellow-500 text-white":"bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>C_w (mass %)</button>
            </div>
            <input type="number" value={concVal} onChange={e=>setConcVal(e.target.value)}
              placeholder={concMode==="Cv"?"e.g. 20":"e.g. 35"} className={INP}/>
            {result && (
              <div className="mt-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2 space-y-0.5">
                <div className="flex justify-between"><span>C_v</span><span className="font-bold text-gray-700 dark:text-gray-300">{fmt(result.Cv*100,2)} %</span></div>
                <div className="flex justify-between"><span>C_w</span><span className="font-bold text-gray-700 dark:text-gray-300">{fmt(result.Cw*100,2)} %</span></div>
                <div className="flex justify-between"><span>ρ_m</span><span className="font-bold text-gray-700 dark:text-gray-300">{fmt(result.rho_m,1)} kg/m³</span></div>
              </div>
            )}
          </div>

          {/* Pipe */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Pipe</p>
            <div className="space-y-3">
              <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Inside diameter D (mm)</p><input type="number" value={D_mm} onChange={e=>setD_mm(e.target.value)} placeholder="e.g. 200" className={INP}/></div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pipe material</p>
                <select value={matIdx} onChange={e=>setMatIdx(Number(e.target.value))} className={SEL}>
                  {PIPE_MATERIALS.map((m,i)=><option key={i} value={i}>{m.label} {isFinite(m.eps)?`(ε=${m.eps}mm)`:""}</option>)}
                </select>
              </div>
              {!isFinite(PIPE_MATERIALS[matIdx].eps) && (
                <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Roughness ε (mm)</p><input type="number" value={cEps} onChange={e=>setCEps(e.target.value)} step="any" className={INP}/></div>
              )}
              <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pipe length L (m)</p><input type="number" value={L_m} onChange={e=>setL_m(e.target.value)} placeholder="e.g. 5000" className={INP}/></div>
            </div>
          </div>

          {/* Flow velocity */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Flow</p>
            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 mb-3 text-xs">
              <button onClick={()=>setFlowMode("vel")} className={`flex-1 py-1.5 font-semibold ${flowMode==="vel"?"bg-yellow-500 text-white":"bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>Velocity</button>
              <button onClick={()=>setFlowMode("Q")} className={`flex-1 py-1.5 font-semibold ${flowMode==="Q"?"bg-yellow-500 text-white":"bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>Flow rate</button>
            </div>
            {flowMode==="vel" ? (
              <div className="flex gap-1.5">
                <input type="number" value={V_val} onChange={e=>setV_val(e.target.value)} placeholder="e.g. 2.5" className={`flex-1 ${INP}`}/>
                <select value={V_unit} onChange={e=>setV_unit(e.target.value)} className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500">
                  {Object.keys(TO_MS).map(u=><option key={u}>{u}</option>)}
                </select>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <input type="number" value={Q_val} onChange={e=>setQ_val(e.target.value)} placeholder="e.g. 500" className={`flex-1 ${INP}`}/>
                <select value={Q_unit} onChange={e=>setQ_unit(e.target.value)} className="w-24 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500">
                  {Object.keys(TO_M3H).map(u=><option key={u}>{u}</option>)}
                </select>
              </div>
            )}
            {result && <p className="text-[10px] text-yellow-600 dark:text-yellow-400 mt-1">V = {fmt(V_ms,3)} m/s · Q = {fmt(result.Q_m3h,1)} m³/h</p>}
          </div>

          {/* Pump de-rating */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Pump De-rating (optional)</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3">Enter the clear-water rated head to see the de-rated slurry head.</p>
            <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pump rated head H_w (m, in clear water)</p>
              <input type="number" value={H_pump} onChange={e=>setH_pump(e.target.value)} placeholder="e.g. 60" className={INP}/>
            </div>
          </div>

        </aside>

        {/* ══ RESULTS ══════════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Empty state */}
          {!result && (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
              </svg>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Enter carrier, solids, pipe, and flow conditions</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Durand-Condolios · Wilson-GIW · SA mining service</p>
            </div>
          )}

          {result && (
            <>
              {/* Critical velocity alert — most important check */}
              <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl border ${
                result.safe_vel ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" :
                result.ok_vel   ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" :
                                  "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              }`}>
                <span className="text-xl flex-shrink-0">{result.safe_vel ? "✓" : result.ok_vel ? "⚠" : "⛔"}</span>
                <div>
                  <p className={`text-sm font-bold ${result.safe_vel?"text-green-700 dark:text-green-300":result.ok_vel?"text-amber-700 dark:text-amber-300":"text-red-700 dark:text-red-300"}`}>
                    V = {fmt(V_ms,2)} m/s ({fmt(V_ms/0.3048,2)} ft/s) · V_c = {fmt(result.V_c,2)} m/s · V/V_c = {fmt(result.velRatio,3)}
                    {result.safe_vel ? " ✓ Safe (≥ 1.2)" : result.ok_vel ? " ⚠ Marginal (1.0–1.2)" : " ⛔ BELOW CRITICAL — SETTLING WILL OCCUR"}
                  </p>
                  <p className={`text-xs mt-0.5 ${result.safe_vel?"text-green-600/80 dark:text-green-400/80":result.ok_vel?"text-amber-600/80 dark:text-amber-400/80":"text-red-600/80 dark:text-red-400/80"}`}>
                    Recommended operating velocity: <strong>{fmt(result.V_rec,2)} m/s</strong> (1.3 × V_c) ·{" "}
                    {result.safe_vel
                      ? "Velocity is safely above critical deposition velocity. Design is acceptable."
                      : result.ok_vel
                      ? "Velocity is above critical but below the recommended safety factor of 1.2. Risk of intermittent settling."
                      : "Solids will settle and form a stationary bed. Increase velocity or reduce pipe diameter."}
                  </p>
                </div>
              </div>

              {/* Primary metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 p-4">
                  <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-1">Critical velocity V_c</p>
                  <p className="text-2xl font-black text-yellow-700 dark:text-yellow-300">{fmt(result.V_c,2)} <span className="text-sm">m/s</span></p>
                  <p className="text-xs text-yellow-600/70 dark:text-yellow-400/70 mt-0.5">F_L = {fmt(result.FL,3)}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800 p-4">
                  <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1">Recommended velocity V_rec</p>
                  <p className="text-2xl font-black text-orange-700 dark:text-orange-300">{fmt(result.V_rec,2)} <span className="text-sm">m/s</span></p>
                  <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-0.5">= 1.3 × V_c (30% margin)</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Mixture gradient i_m</p>
                  <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{sig(result.i_m,4)} <span className="text-sm">m/m</span></p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">i_w = {sig(result.i_w,4)} m/m</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-4">
                  <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">Pipeline pressure drop ΔP</p>
                  <p className="text-2xl font-black text-purple-700 dark:text-purple-300">{fmt(result.DP_m_kPa,1)} <span className="text-sm">kPa</span></p>
                  <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-0.5">{fmt(result.DP_m_bar,3)} bar · HL_m = {fmt(result.HL_m,1)} m</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                  <p className="text-xs font-semibold text-gray-400 mb-1">Mixture density ρ_m</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{fmt(result.rho_m,1)} <span className="text-sm">kg/m³</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">SG_m = {fmt(result.S_m,3)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                  <p className="text-xs font-semibold text-gray-400 mb-1">Solid throughput</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{fmt(result.qm_solids/1000,2)} <span className="text-sm">t/h</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">Mix flow = {fmt(result.qm_mix/1000,2)} t/h</p>
                </div>
              </div>

              {/* Detail results */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-1 self-stretch min-h-[2rem] rounded-full bg-yellow-500 flex-shrink-0"/>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Full Calculation Summary</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {([
                    { label:"C_v (vol %)",                      value:fmt(result.Cv*100,3)            },
                    { label:"C_w (mass %)",                     value:fmt(result.Cw*100,3)            },
                    { label:"ρ_m (kg/m³)",                      value:fmt(result.rho_m,1)             },
                    { label:"SG_m (rel. to carrier)",           value:fmt(result.S_m,4)               },
                    { label:"w_s — settling velocity (m/s)",    value:fmt(result.ws,4)                },
                    { label:"C_D — drag coeff (d50)",           value:fmt(result.Cd,3)                },
                    { label:"F_L (Durand factor)",              value:fmt(result.FL,3)                },
                    { label:"V_c — critical velocity (m/s)",    value:fmt(result.V_c,3)               },
                    { label:"V_rec — recommended vel (m/s)",    value:fmt(result.V_rec,3)             },
                    { label:"V (m/s)",                          value:fmt(V_ms,3)                     },
                    { label:"V (ft/s)",                         value:fmt(V_ms/0.3048,3)              },
                    { label:"V/V_c",                            value:fmt(result.velRatio,4)          },
                    { label:"Re_w (pipe, carrier)",             value:sig(result.Re_w,4)              },
                    { label:"Darcy f (carrier)",                value:fmt(result.f_w,5)               },
                    { label:"i_w — water gradient (m/m)",       value:sig(result.i_w,4)               },
                    { label:"Ψ_D (Durand param.)",              value:sig(result.psi_D,4)             },
                    { label:"Φ_D (excess head ratio)",          value:fmt(result.phi_D,3)             },
                    { label:"i_m — mix gradient (m/m)",         value:sig(result.i_m,4)               },
                    { label:"i_excess (m/m)",                   value:sig(result.i_excess,4)          },
                    { label:"HL_w (m, in clear water)",         value:fmt(result.HL_w,2)              },
                    { label:"HL_m (m, mixture)",                value:fmt(result.HL_m,2)              },
                    { label:"ΔP mixture (kPa)",                 value:fmt(result.DP_m_kPa,2)          },
                    { label:"ΔP mixture (bar)",                 value:fmt(result.DP_m_bar,4)          },
                    { label:"ΔP carrier (kPa)",                 value:fmt(result.DP_w_kPa,2)          },
                    { label:"Q (m³/h)",                         value:fmt(result.Q_m3h,2)             },
                    { label:"Solid mass flow (t/h)",            value:fmt(result.qm_solids/1000,3)    },
                    { label:"Mixture mass flow (t/h)",          value:fmt(result.qm_mix/1000,3)       },
                    { label:"HR — head ratio (Wilson-Addie)",   value:fmt(result.HR,4)                },
                    { label:"ER — efficiency ratio",            value:fmt(result.ER,4)                },
                  ] as {label:string;value:string}[]).map(item=>(
                    <div key={item.label} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{item.label}</p>
                      <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pump de-rating results */}
              {parseFloat(H_pump) > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-1 self-stretch min-h-[2rem] rounded-full bg-blue-500 flex-shrink-0"/>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Pump De-rating — Wilson-Addie</h3>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 px-4 py-3">
                      <p className="text-xs font-semibold text-blue-500 dark:text-blue-400 mb-1">Rated head (clear water)</p>
                      <p className="text-xl font-black text-blue-700 dark:text-blue-300">{H_pump} m</p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 px-4 py-3">
                      <p className="text-xs font-semibold text-yellow-500 dark:text-yellow-400 mb-1">De-rated head (slurry)</p>
                      <p className="text-xl font-black text-yellow-700 dark:text-yellow-300">{fmt(result.H_pump_derated??0,1)} m</p>
                      <p className="text-xs text-yellow-500/70 mt-0.5">HR = {fmt(result.HR,3)}</p>
                    </div>
                    <div className={`rounded-xl border px-4 py-3 ${(result.H_pump_derated??0) >= result.HL_m ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"}`}>
                      <p className={`text-xs font-semibold mb-1 ${(result.H_pump_derated??0) >= result.HL_m ? "text-green-500 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>Required pipe head loss</p>
                      <p className={`text-xl font-black ${(result.H_pump_derated??0) >= result.HL_m ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>{fmt(result.HL_m,1)} m</p>
                      <p className="text-xs mt-0.5 text-gray-400">{(result.H_pump_derated??0) >= result.HL_m ? "✓ Pump adequate" : "⚠ Pump insufficient"}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3">
                    Wilson-Addie simplified preliminary formula: HR = 1 − 0.019 × (C_v/0.15)^0.36 × (d₈₅/10mm)^0.22.
                    For final pump selection use the full Wilson-Addie-Sellgren model with actual pump geometry (impeller diameter, tip speed).
                    Verify with pump manufacturer sizing software (Warman, GEHO, KSB SuPro).
                  </p>
                </div>
              )}

              {/* High Cv warning */}
              {result.Cv > 0.30 && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 px-5 py-3 flex items-start gap-3">
                  <span className="text-red-500 text-lg flex-shrink-0">⚠</span>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    <strong>C_v = {fmt(result.Cv*100,1)}% exceeds the 30% Durand-Condolios validity limit.</strong>{" "}
                    At high concentrations, particle–particle interactions and non-Newtonian behaviour dominate. Results are indicative only — use Wilson-GIW or Slurry Expert software for high-density design.
                  </p>
                </div>
              )}

              {/* Notes */}
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-5">
                <h3 className="text-sm font-bold text-amber-700 dark:text-amber-300 mb-2">Validity &amp; Limitations</h3>
                <ul className="space-y-1 text-xs text-amber-700/80 dark:text-amber-300/80 list-disc list-inside">
                  <li>Durand-Condolios: valid for <strong>heterogeneous flow</strong> — coarse particles (d50 &gt; 0.1mm) suspended by turbulence. Not for homogeneous (very fine) or two-layer (very coarse) regimes.</li>
                  <li>Typically valid for C_v up to ~30% and V/V_c between 1.0 and 3.0.</li>
                  <li>Solid SG is referenced to water (1 000 kg/m³); carrier fluid density is used correctly for all density-ratio terms.</li>
                  <li>F_L factor from Durand-Condolios (1952) chart; varies with particle size distribution and shape.</li>
                  <li>Wilson-GIW de-rating is a simplified preliminary estimate. Actual HR depends on pump geometry, impeller tip speed, and particle hardness.</li>
                  <li>For final design, use specialised software (Warman SIM, GEHO PIPELINE) and verify with pump manufacturer.</li>
                  <li>Pipe wear from abrasive slurry is not calculated here — critical for rubber-lined and HDPE pipes in mining service.</li>
                </ul>
              </div>
            </>
          )}

          <References refs={REFS_SLURRY_PIPELINE} />
        </div>
      </div>
    </div>
  );
}
