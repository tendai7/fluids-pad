"use client";

import React, { useState, useMemo } from "react";
import { References } from "@/components/References";
import { REFS_ORIFICE_PLATE_SIZING } from "@/lib/references";

// ─── ISO 5167-2: Reader-Harris / Gallagher discharge coefficient ──────────────
//
// Cd = 0.5961 + 0.0261β² − 0.216β⁸ + 0.000521(10⁶β/Re_D)^0.7
//    + (0.0188 + 0.0063A)·β^3.5·(10⁶/Re_D)^0.3
//    + (0.043 + 0.080·e^{−10L₁} − 0.123·e^{−7L₁})·(1−0.11A)·β⁴/(1−β⁴)
//    − 0.031·(M₂'−0.8·M₂'^1.1)·β^1.3
//    [+ 0.011(0.75−β)(2.8−D/25.4) when D < 71.12 mm]
//
// Tapping geometry parameters:
//   Corner tappings:   L₁ = 0,          L₂' = 0
//   D & D/2 tappings:  L₁ = 1,          L₂' = 0.47
//   Flange tappings:   L₁ = 25.4/D_mm,  L₂' = 25.4/D_mm

function rhgCd(beta: number, Re_D: number, L1: number, L2p: number, D_mm: number): number {
  const b  = beta;
  const b2 = b * b, b4 = b2 * b2, b8 = b4 * b4;
  const A  = Math.pow(19000 * b / Re_D, 0.8);
  const M2p = 2 * L2p / (1 - b);

  let Cd =
    0.5961 + 0.0261 * b2 - 0.216 * b8
    + 0.000521 * Math.pow(1e6 * b / Re_D, 0.7)
    + (0.0188 + 0.0063 * A) * Math.pow(b, 3.5) * Math.pow(1e6 / Re_D, 0.3)
    + (0.043 + 0.080 * Math.exp(-10 * L1) - 0.123 * Math.exp(-7 * L1))
      * (1 - 0.11 * A) * b4 / (1 - b4)
    - 0.031 * (M2p - 0.8 * Math.pow(M2p, 1.1)) * Math.pow(b, 1.3);

  // Small-pipe correction (D < 71.12 mm)
  if (D_mm < 71.12) {
    Cd += 0.011 * (0.75 - b) * (2.8 - D_mm / 25.4);
  }

  return Cd;
}

// Expansion factor ε for compressible gas (ISO 5167-2)
// ε = 1 − (0.351 + 0.256β⁴ + 0.93β⁸)·[1 − (P2/P1)^(1/κ)]
function expansionFactor(beta: number, P1_Pa: number, dP_Pa: number, kappa: number): number {
  const P2_P1 = (P1_Pa - dP_Pa) / P1_Pa;
  if (P2_P1 <= 0) return 0.667; // choked
  const b4 = beta ** 4, b8 = beta ** 8;
  return 1 - (0.351 + 0.256 * b4 + 0.93 * b8) * (1 - Math.pow(P2_P1, 1 / kappa));
}

// Permanent pressure loss ratio: ΔP_perm / ΔP_total
// ISO 5167-2 Annex B: ΔP_perm/ΔP = √(1 − β⁴(1−Cd²)) − Cd·β²
function permLossRatio(beta: number, Cd: number): number {
  const b2 = beta * beta, b4 = b2 * b2;
  return Math.sqrt(1 - b4 * (1 - Cd * Cd)) - Cd * b2;
}

// ─── Iterative sizing ─────────────────────────────────────────────────────────
// Given qv [m³/s], D_m [m], dP [Pa], rho [kg/m³], mu [Pa·s],
// and optional gas parameters (P1_Pa, kappa)
// Returns: { beta, d_mm, Cd, eps, Re_D, perm_ratio, iterations } or null
interface SizeResult {
  beta: number; d_mm: number; Cd: number; eps: number;
  Re_D: number; perm_ratio: number; iters: number;
}

function sizeOrifice(
  qv_m3s: number, D_m: number, dP_Pa: number,
  rho: number, mu: number,
  L1: number, L2p: number,
  isGas: boolean, P1_Pa: number, kappa: number,
): SizeResult | null {
  if (qv_m3s <= 0 || D_m <= 0 || dP_Pa <= 0 || rho <= 0 || mu <= 0) return null;
  const D_mm = D_m * 1000;
  const qm   = qv_m3s * rho;               // mass flow [kg/s]

  let beta = 0.6;   // initial guess
  let Cd = 0.61, eps = 1.0;

  for (let i = 0; i < 60; i++) {
    const Re_D = 4 * qm / (Math.PI * mu * D_m);  // pipe Re (independent of beta)
    if (isGas) eps = expansionFactor(beta, P1_Pa, dP_Pa, kappa);
    Cd = rhgCd(beta, Re_D, L1, L2p, D_mm);

    // Solve flow equation for beta:
    // qm = Cd·ε·(π/4)·(β·D)²·√(2·ΔP·ρ/(1−β⁴))
    // → β² / √(1−β⁴) = qm / (Cd·ε·(π/4)·D²·√(2·ΔP·ρ))
    // Let K = [qm / (Cd·ε·(π/4)·D²·√(2·ΔP·ρ))]
    // β² / √(1−β⁴) = K  → β⁴ / (1−β⁴) = K² → β⁴(1+K²) = K² → β=(K²/(1+K²))^0.25

    const K = qm / (Cd * eps * (Math.PI / 4) * D_m * D_m * Math.sqrt(2 * dP_Pa * rho));
    if (!isFinite(K) || K <= 0) return null;

    const beta_new = Math.pow(K * K / (1 + K * K), 0.25);
    if (!isFinite(beta_new) || beta_new <= 0) return null;

    if (Math.abs(beta_new - beta) < 1e-6) {
      const Re_D_final = 4 * qm / (Math.PI * mu * D_m);
      const perm = permLossRatio(beta_new, Cd);
      return {
        beta: beta_new,
        d_mm: beta_new * D_mm,
        Cd,
        eps: isGas ? expansionFactor(beta_new, P1_Pa, dP_Pa, kappa) : 1.0,
        Re_D: Re_D_final,
        perm_ratio: perm,
        iters: i + 1,
      };
    }
    beta = beta_new;
  }
  return null; // did not converge
}

// ─── Validation against ISO 5167-2 Table 1 ───────────────────────────────────
function validateISO(beta: number, Re_D: number, D_mm: number, tapType: string): string[] {
  const warns: string[] = [];
  if (beta < 0.1 || beta > 0.75)
    warns.push(`β = ${beta.toFixed(4)} is outside ISO 5167-2 range 0.1–0.75.`);
  if (D_mm < 50 || D_mm > 1000)
    warns.push(`Pipe D = ${D_mm.toFixed(1)} mm is outside ISO 5167-2 range 50–1000 mm.`);

  // Minimum Re_D depends on β and tapping type
  const minRe = beta < 0.45 ? 5000 :
                beta < 0.5  ? 10000 :
                beta < 0.55 ? 20000 :
                              50000;
  if (Re_D < minRe)
    warns.push(`Re_D = ${Re_D.toExponential(2)} is below the minimum (${minRe.toLocaleString()}) for β = ${beta.toFixed(3)} per ISO 5167-2.`);
  if (beta > 0.65 && tapType === "corner")
    warns.push("β > 0.65 with corner tappings — consider D&D/2 or flange tappings for better accuracy.");
  if (beta > 0.7)
    warns.push("β > 0.70 — high beta ratio may cause significant permanent pressure loss and poor rangeability.");
  return warns;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const LIQUID_PRESETS = [
  { label: "Water 20 °C",        rho: 998.2,  mu: 1.002e-3 },
  { label: "Water 60 °C",        rho: 983.2,  mu: 0.467e-3 },
  { label: "Water 80 °C",        rho: 971.8,  mu: 0.355e-3 },
  { label: "Diesel",             rho: 840,    mu: 3.0e-3   },
  { label: "Light crude oil",    rho: 870,    mu: 15e-3    },
  { label: "Seawater 20 °C",    rho: 1025,   mu: 1.07e-3  },
  { label: "EG 50% antifreeze", rho: 1049,   mu: 2.23e-3  },
  { label: "Custom",             rho: NaN,    mu: NaN      },
];

const GAS_PRESETS = [
  { label: "Air 20 °C",          rho: 1.204,  mu: 1.813e-5, kappa: 1.40 },
  { label: "Natural gas (typical)",rho: 0.76,  mu: 1.1e-5,  kappa: 1.31 },
  { label: "Nitrogen",           rho: 1.165,  mu: 1.76e-5, kappa: 1.40 },
  { label: "Steam (sat. 150 °C)",rho: 2.547,  mu: 1.44e-5, kappa: 1.32 },
  { label: "CO₂",                rho: 1.842,  mu: 1.49e-5, kappa: 1.30 },
  { label: "Custom",             rho: NaN,    mu: NaN,     kappa: NaN   },
];

const TAP_TYPES = [
  { id: "corner",  label: "Corner tappings",    L1: 0,    L2p: 0,    note: "Most common for gas service. Taps immediately adjacent to plate." },
  { id: "dD2",     label: "D & D/2 tappings",   L1: 1,    L2p: 0.47, note: "Standard for liquid service in the UK/EU." },
  { id: "flange",  label: "Flange tappings",    L1: NaN,  L2p: NaN,  note: "Taps fixed at 25.4 mm from each plate face. Common in North America." },
];

const TO_M3S: Record<string, number> = {
  "m³/h": 1/3600, "m³/s": 1, "L/s": 1e-3, "L/min": 1/60000, "GPM": 6.309e-5,
};
const TO_PA: Record<string, number> = {
  Pa: 1, kPa: 1e3, bar: 1e5, mbar: 100, psi: 6894.76,
};
const TO_BARG: Record<string, (v: number) => number> = {
  "bar_g": v => v + 1.01325, "MPa_g": v => v * 10 + 1.01325,
  "kPa_g": v => v / 100 + 1.01325, "psi_g": v => v * 0.06895 + 1.01325,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number, dp = 3): string { return isFinite(n) ? n.toFixed(dp) : "—"; }
function sig(n: number, s = 4): string  { return isFinite(n) ? parseFloat(n.toPrecision(s)).toString() : "—"; }

const SEL  = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";
const INP  = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500";

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OrificePlateSizingPage() {
  // Service type
  const [service,   setService]   = useState<"liquid"|"gas">("liquid");

  // Liquid fluid
  const [liqIdx,    setLiqIdx]    = useState(0);
  const [cRho,      setCRho]      = useState("998.2");
  const [cMu,       setCMu]       = useState("0.001002");

  // Gas fluid
  const [gasIdx,    setGasIdx]    = useState(0);
  const [cGRho,     setCGRho]     = useState("1.204");
  const [cGMu,      setCGMu]      = useState("0.0000181");
  const [cKappa,    setCKappa]    = useState("1.40");
  const [P1val,     setP1val]     = useState("10");
  const [P1unit,    setP1unit]    = useState("bar_g");

  // Flow and geometry
  const [qVal,      setQVal]      = useState("");
  const [qUnit,     setQUnit]     = useState("m³/h");
  const [D_val,     setD_val]     = useState("");
  const [D_unit,    setD_unit]    = useState("mm");
  const [dP_val,    setDP_val]    = useState("");
  const [dP_unit,   setDP_unit]   = useState("kPa");

  // Tapping
  const [tapIdx,    setTapIdx]    = useState(0);

  // Derived shortcuts
  const liqP = LIQUID_PRESETS[liqIdx];
  const gasP = GAS_PRESETS[gasIdx];
  const tap  = TAP_TYPES[tapIdx];

  const rho = service === "liquid"
    ? (isNaN(liqP.rho) ? parseFloat(cRho) : liqP.rho)
    : (isNaN(gasP.rho) ? parseFloat(cGRho) : gasP.rho);
  const mu  = service === "liquid"
    ? (isNaN(liqP.mu)  ? parseFloat(cMu)  : liqP.mu)
    : (isNaN(gasP.mu)  ? parseFloat(cGMu) : gasP.mu);
  const kappa = isNaN(gasP.kappa) ? parseFloat(cKappa) : gasP.kappa;
  const P1_bara = TO_BARG[P1unit]?.(parseFloat(P1val)) ?? NaN;

  // Tapping parameters
  const D_mm_val = parseFloat(D_val) * (D_unit === "m" ? 1000 : D_unit === "in" ? 25.4 : 1);
  const L1  = tap.id === "flange" ? 25.4 / D_mm_val : tap.L1;
  const L2p = tap.id === "flange" ? 25.4 / D_mm_val : tap.L2p;

  const result = useMemo(() => {
    const qv   = parseFloat(qVal)  * (TO_M3S[qUnit]  ?? 1);
    const D_m  = D_mm_val / 1000;
    const dP   = parseFloat(dP_val) * (TO_PA[dP_unit] ?? 1);

    if (!isFinite(qv) || qv <= 0) return null;
    if (!isFinite(D_m) || D_m <= 0) return null;
    if (!isFinite(dP) || dP <= 0) return null;
    if (!isFinite(rho) || rho <= 0) return null;
    if (!isFinite(mu)  || mu  <= 0) return null;
    if (service === "gas" && (!isFinite(P1_bara) || P1_bara <= 0)) return null;
    if (tap.id === "flange" && !isFinite(D_mm_val)) return null;

    const P1_Pa = (P1_bara) * 1e5;   // bar_a → Pa

    const res = sizeOrifice(
      qv, D_m, dP, rho, mu,
      L1, L2p,
      service === "gas", P1_Pa, kappa,
    );
    if (!res) return { error: "Iteration did not converge. Check inputs — flow may be outside the achievable range for this pipe and ΔP." };

    const warnings = validateISO(res.beta, res.Re_D, D_mm_val, tap.id);
    const qm_kgh   = qv * rho * 3600;                                   // mass flow kg/h
    const V_pipe   = qv / (Math.PI / 4 * D_m * D_m);                   // m/s
    const V_ori    = qv / (Math.PI / 4 * (res.d_mm / 1000) ** 2);      // m/s
    const Ev       = 1 / Math.sqrt(1 - res.beta ** 4);                  // velocity of approach factor
    const dP_perm  = dP * res.perm_ratio;
    const dP_perm_display = dP_perm / (TO_PA[dP_unit] ?? 1);            // in user's ΔP unit

    // Q at various ΔP fractions (square-root law: Q ∝ √ΔP)
    const qAtDP = [25, 50, 75, 100].map(pct => ({
      pct,
      q: qv * Math.sqrt(pct / 100),
      dP_actual: dP * (pct / 100),
    }));

    // Warn if gas density looks like standard conditions for pressurised service
    if (service === "gas" && P1_bara > 1.5 && rho < 5) {
      warnings.push("Gas density appears to be at near-atmospheric conditions. For pressurised gas service, enter ρ₁ at the actual upstream pressure and temperature, not at standard/normal conditions.");
    }

    return {
      ...res,
      warnings,
      V_pipe, V_ori, Ev, dP_perm, dP_perm_display, qv, D_m, dP,
      qm_kgh,
      dP_perm_pct: res.perm_ratio * 100,
      beta_pct: res.beta * 100,
      P1_bara,
      qAtDP,
    };
  }, [qVal, qUnit, D_mm_val, dP_val, dP_unit, rho, mu, kappa, P1_bara, service, tap.id, L1, L2p, rho]);

  const hasError = result !== null && "error" in result;
  type Good = Exclude<typeof result, null | { error: string }>;
  const res: Good | null = result && !hasError ? result as Good : null;

  const [copied, setCopied] = useState(false);

  function copyResults() {
    if (!res) return;
    const lines = [
      `ISO 5167-2 Orifice Plate Sizing`,
      `Flow: ${qVal} ${qUnit} · D = ${fmt(D_mm_val,1)} mm · ΔP = ${dP_val} ${dP_unit} · ${tap.label}`,
      `β = ${fmt(res.beta,5)} · d = ${fmt(res.d_mm,3)} mm · Cd = ${fmt(res.Cd,5)}`,
      ...(service === "gas" ? [`ε = ${fmt(res.eps,5)}`] : []),
      `Re_D = ${sig(res.Re_D,4)} · Ev = ${fmt(res.Ev,4)}`,
      `Permanent ΔP = ${fmt(res.dP_perm_pct,1)}% of design ΔP`,
      `Mass flow = ${fmt(res.qm_kgh,1)} kg/h`,
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  }

  function downloadCSV() {
    if (!res) return;
    type Cell = string | number;
    const rows: Cell[][] = [];
    const p = (...c: Cell[]) => rows.push(c);
    p("ISO 5167-2 Orifice Plate Sizing — Fluids Pad");
    p("Service", service); p("Tapping", tap.label);
    p("Fluid", service === "liquid" ? LIQUID_PRESETS[liqIdx].label : GAS_PRESETS[gasIdx].label);
    p("Density ρ", rho, "kg/m³"); p("Viscosity μ", mu, "Pa·s");
    if (service === "gas") { p("Isentropic exp κ", kappa); p("Upstream P1", P1_bara, "bar_a"); }
    p();
    p("INPUT","Value","Unit");
    p("Flow rate Q", qVal, qUnit);
    p("Pipe ID D", fmt(D_mm_val,2), "mm");
    p("Design ΔP", dP_val, dP_unit);
    p();
    p("RESULT","Value","Unit");
    p("Beta ratio β", fmt(res.beta,5),"");
    p("Bore d", fmt(res.d_mm,4),"mm");
    p("Bore d", fmt(res.d_mm/25.4,5),"inch");
    p("Discharge coefficient Cd", fmt(res.Cd,5),"");
    if (service === "gas") p("Expansion factor ε", fmt(res.eps,5),"");
    p("Velocity of approach Ev", fmt(res.Ev,5),"");
    p("Pipe Reynolds number Re_D", sig(res.Re_D,5),"");
    p("Pipe velocity Vp", fmt(res.V_pipe,4),"m/s");
    p("Orifice velocity", fmt(res.V_ori,3),"m/s");
    p("Mass flow rate qm", fmt(res.qm_kgh,2),"kg/h");
    p("Permanent ΔP ratio", fmt(res.dP_perm_pct,2),"%");
    p("Permanent ΔP", fmt(res.dP_perm,2),"Pa");
    p("Permanent ΔP (display unit)", fmt(res.dP_perm_display,3),dP_unit);
    p("Iterations to converge", res.iters,"");
    p();
    p("RANGEABILITY (Q ∝ √ΔP)","","");
    p("ΔP fraction (%)","ΔP ("+dP_unit+")","Q ("+qUnit+")");
    res.qAtDP.forEach(row => {
      p(row.pct+"%", fmt(row.dP_actual/(TO_PA[dP_unit]??1),3), fmt(row.q*(1/(TO_M3S[qUnit]??1)),3));
    });
    p();
    p("Disclaimer","ISO 5167-2:2022 RHG method. Verify with transmitter vendor sizing software before procurement.");
    const csv = rows.map(r=>r.map(c=>`"${String(c)}"`).join(",")).join("\r\n");
    const blob = new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="orifice-sizing.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orifice Plate Sizing</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ISO 5167-2 Reader-Harris/Gallagher — iterative β and bore calculation for liquids and gases
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {/* Export buttons */}
          <button onClick={copyResults} disabled={!res}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {copied
              ? <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Copied!</>
              : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</>}
          </button>
          <button onClick={downloadCSV} disabled={!res}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            CSV
          </button>
          {/* Service toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-300 dark:border-gray-600">
            {(["liquid","gas"] as const).map(s => (
              <button key={s} onClick={() => setService(s)}
                className={`px-4 py-2 text-sm font-bold capitalize transition-colors ${service===s?"bg-teal-600 text-white":"bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-5 items-start">

        {/* ══ SIDEBAR ══════════════════════════════════════════════════════ */}
        <aside className="w-80 flex-shrink-0 space-y-4 sticky top-20 max-h-[calc(100vh-7rem)] overflow-y-auto pb-4">

          {/* Fluid */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Fluid Properties</p>
            {service === "liquid" ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fluid preset</p>
                  <select value={liqIdx} onChange={e=>setLiqIdx(Number(e.target.value))} className={SEL}>
                    {LIQUID_PRESETS.map((p,i)=><option key={i} value={i}>{p.label}</option>)}
                  </select>
                </div>
                {isNaN(liqP.rho) ? (
                  <>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Density ρ (kg/m³)</p><input type="number" value={cRho} onChange={e=>setCRho(e.target.value)} className={INP}/></div>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Dynamic viscosity μ (Pa·s)</p><input type="number" value={cMu} onChange={e=>setCMu(e.target.value)} step="any" className={INP}/></div>
                  </>
                ) : (
                  <div className="flex gap-3 text-xs text-gray-400 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2">
                    <span>ρ = {liqP.rho} kg/m³</span><span>·</span><span>μ = {liqP.mu.toExponential(3)} Pa·s</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gas preset</p>
                  <select value={gasIdx} onChange={e=>setGasIdx(Number(e.target.value))} className={SEL}>
                    {GAS_PRESETS.map((p,i)=><option key={i} value={i}>{p.label}</option>)}
                  </select>
                </div>
                {isNaN(gasP.rho) ? (
                  <>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Density ρ₁ at actual upstream P &amp; T (kg/m³)</p>
                      <input type="number" value={cGRho} onChange={e=>setCGRho(e.target.value)} step="any" className={INP}/>
                      <p className="text-[10px] text-amber-500 dark:text-amber-400 mt-0.5">⚠ Must be at operating P and T, not standard conditions</p>
                    </div>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Dynamic viscosity μ (Pa·s)</p><input type="number" value={cGMu} onChange={e=>setCGMu(e.target.value)} step="any" className={INP}/></div>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Isentropic exponent κ (C<sub>p</sub>/C<sub>v</sub>)</p><input type="number" value={cKappa} onChange={e=>setCKappa(e.target.value)} step="any" className={INP}/></div>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2">
                    <span>ρ = {gasP.rho} kg/m³</span><span>·</span><span>μ = {gasP.mu.toExponential(2)} Pa·s</span><span>·</span><span>κ = {gasP.kappa}</span>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Upstream pressure P₁ (absolute, for ε)</p>
                  <div className="flex gap-1.5">
                    <input type="number" value={P1val} onChange={e=>setP1val(e.target.value)} placeholder="e.g. 10" className={`flex-1 ${INP}`}/>
                    <select value={P1unit} onChange={e=>setP1unit(e.target.value)} className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500">
                      {Object.keys(TO_BARG).map(u=><option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Flow and pipe */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Flow &amp; Pipe</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Design {service === "liquid" ? "volumetric" : "normal volumetric"} flow rate
                </p>
                <div className="flex gap-1.5">
                  <input type="number" value={qVal} onChange={e=>setQVal(e.target.value)} placeholder="e.g. 120" className={`flex-1 ${INP}`}/>
                  <select value={qUnit} onChange={e=>setQUnit(e.target.value)} className="w-24 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {Object.keys(TO_M3S).map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pipe inside diameter D</p>
                <div className="flex gap-1.5">
                  <input type="number" value={D_val} onChange={e=>setD_val(e.target.value)} placeholder="e.g. 150" className={`flex-1 ${INP}`}/>
                  <select value={D_unit} onChange={e=>setD_unit(e.target.value)} className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {["mm","m","in"].map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
                {isFinite(D_mm_val) && D_mm_val > 0 && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">= {fmt(D_mm_val,1)} mm</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Design differential pressure ΔP</p>
                <div className="flex gap-1.5">
                  <input type="number" value={dP_val} onChange={e=>setDP_val(e.target.value)} placeholder="e.g. 50" className={`flex-1 ${INP}`}/>
                  <select value={dP_unit} onChange={e=>setDP_unit(e.target.value)} className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {Object.keys(TO_PA).map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Tapping type */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Tapping Type</p>
            <select value={tapIdx} onChange={e=>setTapIdx(Number(e.target.value))} className={SEL}>
              {TAP_TYPES.map((t,i)=><option key={i} value={i}>{t.label}</option>)}
            </select>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">{tap.note}</p>
            {tap.id === "flange" && isFinite(D_mm_val) && D_mm_val > 0 && (
              <p className="text-[10px] text-teal-500 dark:text-teal-400 mt-1">
                L₁ = L₂' = 25.4 / {fmt(D_mm_val,1)} = {fmt(25.4/D_mm_val,4)}
              </p>
            )}
          </div>

          {/* ISO validity ranges */}
          <div className="bg-teal-50 dark:bg-teal-900/20 rounded-2xl border border-teal-200 dark:border-teal-800 p-4">
            <p className="text-xs font-bold text-teal-600 dark:text-teal-400 mb-2">ISO 5167-2 valid range</p>
            <div className="space-y-0.5 text-xs text-teal-700 dark:text-teal-300">
              <div className="flex justify-between"><span>Beta ratio β</span><span>0.1 – 0.75</span></div>
              <div className="flex justify-between"><span>Pipe diameter D</span><span>50 – 1000 mm</span></div>
              <div className="flex justify-between"><span>Re_D (β = 0.5)</span><span>≥ 20 000</span></div>
              <div className="flex justify-between"><span>Re_D (β = 0.6+)</span><span>≥ 50 000</span></div>
            </div>
          </div>
        </aside>

        {/* ══ RESULTS ══════════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Empty state */}
          {!result && (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
              </svg>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Enter flow rate, pipe diameter, and ΔP</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Results update live · ISO 5167-2 RHG method</p>
            </div>
          )}

          {/* Error */}
          {hasError && (
            <div className="flex items-start gap-3 px-5 py-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
              <span className="text-red-500 text-xl">⚠</span>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{(result as {error:string}).error}</p>
            </div>
          )}

          {res && (
            <>
              {/* Warnings */}
              {res.warnings.map((w,i)=>(
                <div key={i} className="flex items-start gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300">
                  <span className="text-base flex-shrink-0">⚠</span><span>{w}</span>
                </div>
              ))}

              {/* Primary outputs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-200 dark:border-teal-800 p-4">
                  <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 mb-1">Beta ratio β</p>
                  <p className="text-2xl font-black text-teal-700 dark:text-teal-300">{fmt(res.beta, 4)}</p>
                  <p className="text-xs text-teal-600/70 dark:text-teal-400/70 mt-0.5">{fmt(res.beta_pct, 2)} %</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Bore diameter d</p>
                  <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{fmt(res.d_mm, 2)} <span className="text-sm">mm</span></p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">{fmt(res.d_mm / 25.4, 4)} inch</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                  <p className="text-xs font-semibold text-gray-400 mb-1">Discharge coeff C<sub>d</sub></p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{fmt(res.Cd, 4)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">ISO 5167-2 RHG</p>
                </div>
                {service === "gas" && (
                  <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                    <p className="text-xs font-semibold text-gray-400 mb-1">Expansion factor ε</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{fmt(res.eps, 4)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Gas compressibility correction</p>
                  </div>
                )}
              </div>

              {/* Full calculation summary */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-1 self-stretch min-h-[2rem] rounded-full bg-teal-500 flex-shrink-0"/>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">ISO 5167-2 Sizing Results</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {tap.label} · {service === "liquid" ? LIQUID_PRESETS[liqIdx].label : GAS_PRESETS[gasIdx].label}
                      · D = {fmt(D_mm_val,1)} mm · Q = {qVal} {qUnit} · ΔP = {dP_val} {dP_unit}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {([
                    { label: "Beta ratio β",            value: fmt(res.beta, 5) },
                    { label: "Bore d (mm)",              value: fmt(res.d_mm, 3) },
                    { label: "Bore d (inch)",            value: fmt(res.d_mm / 25.4, 4) },
                    { label: "Discharge coeff Cd",       value: fmt(res.Cd, 5) },
                    ...(service === "gas" ? [{ label: "Expansion factor ε", value: fmt(res.eps, 5) }] : []),
                    { label: "Velocity of approach Ev",  value: fmt(res.Ev, 4) },
                    { label: "Pipe Re_D",                value: sig(res.Re_D, 4) },
                    { label: "Mass flow qm (kg/h)",      value: fmt(res.qm_kgh, 2) },
                    { label: "Pipe velocity Vp (m/s)",   value: fmt(res.V_pipe, 3) },
                    { label: "Orifice velocity (m/s)",   value: fmt(res.V_ori,  2) },
                    { label: "Perm. loss (% of ΔP)",     value: `${fmt(res.dP_perm_pct, 1)} %` },
                    { label: `Perm. ΔP (${dP_unit})`,    value: fmt(res.dP_perm_display, 3) },
                    { label: "Perm. ΔP (Pa)",            value: sig(res.dP_perm, 3) },
                    { label: "Iterations to converge",   value: String(res.iters) },
                  ] as {label:string;value:string}[]).map(item => (
                    <div key={item.label} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{item.label}</p>
                      <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rangeability */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-1 self-stretch min-h-[2rem] rounded-full bg-blue-500 flex-shrink-0"/>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Rangeability &amp; Turndown</h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Orifice plates follow a square-root relationship: Q ∝ √ΔP. The turndown ratio is limited by the rangeability of the differential pressure transmitter.
                </p>
                {/* Q at various ΔP fractions for this specific design */}
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Flow at each ΔP fraction — this design (Q ∝ √ΔP)
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {res.qAtDP.map(row => {
                      const qDisplay = row.q / (TO_M3S[qUnit] ?? 1);
                      const dpDisplay = row.dP_actual / (TO_PA[dP_unit] ?? 1);
                      return (
                        <div key={row.pct} className={`rounded-lg p-2.5 text-center ${row.pct === 100 ? "bg-teal-100 dark:bg-teal-900/40" : "bg-white dark:bg-gray-700"}`}>
                          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{row.pct}% ΔP</p>
                          <p className="text-xs font-mono font-bold text-gray-900 dark:text-white mt-0.5">{fmt(qDisplay, 2)}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">{qUnit}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">{fmt(dpDisplay, 2)} {dP_unit}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left pb-2 pr-3">ΔP transmitter range</th>
                        <th className="text-right pb-2 pr-3">Min ΔP (% of design)</th>
                        <th className="text-right pb-2 pr-3">Min flow (% of design)</th>
                        <th className="text-right pb-2">Turndown ratio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "High-accuracy (100:1 ΔP)", minDP_pct: 1.0,  turndown: 10 },
                        { label: "Standard (25:1 ΔP)",        minDP_pct: 4.0,  turndown: 5  },
                        { label: "Conservative (10:1 ΔP)",    minDP_pct: 10.0, turndown: 3.16 },
                      ].map(row => {
                        const minQ_pct = Math.sqrt(row.minDP_pct / 100) * 100;
                        const minQ_display = res.qAtDP[0].q * Math.sqrt(row.minDP_pct / 100) / (TO_M3S[qUnit] ?? 1);
                        return (
                          <tr key={row.label} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                            <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{row.label}</td>
                            <td className="py-2 pr-3 text-right font-mono text-gray-500">{row.minDP_pct}%</td>
                            <td className="py-2 pr-3 text-right font-mono text-gray-700 dark:text-gray-300">
                              {minQ_pct.toFixed(1)}% ({fmt(minQ_display, 2)} {qUnit})
                            </td>
                            <td className="py-2 text-right font-mono font-bold text-teal-600 dark:text-teal-400">{row.turndown}:1</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3">
                  Typical orifice plate rangeability is 3:1 to 10:1 depending on DP transmitter quality. For higher turndown, consider a flow nozzle or venturi (lower permanent pressure loss, better rangeability).
                </p>
              </div>

              {/* Permanent loss note */}
              <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl border ${
                res.perm_ratio > 0.5 ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              }`}>
                <span className="text-lg">{res.perm_ratio > 0.5 ? "⚠" : "ℹ"}</span>
                <div>
                  <p className={`text-sm font-bold ${res.perm_ratio > 0.5 ? "text-amber-700 dark:text-amber-300" : "text-green-700 dark:text-green-300"}`}>
                    Permanent pressure loss: {fmt(res.dP_perm_pct, 1)} % of ΔP = {fmt(res.dP_perm/1000, 2)} kPa
                  </p>
                  <p className={`text-xs mt-0.5 ${res.perm_ratio > 0.5 ? "text-amber-600/80 dark:text-amber-400/80" : "text-green-600/80 dark:text-green-400/80"}`}>
                    {res.perm_ratio > 0.6
                      ? "High permanent loss — consider a flow nozzle (≈ 30–40% loss) or venturi (≈ 5–15%) if energy cost is significant."
                      : res.perm_ratio > 0.4
                      ? "Moderate permanent loss — typical for orifice plates. Acceptable for most process applications."
                      : "Low permanent loss for an orifice plate — beta ratio is well chosen."}
                  </p>
                </div>
              </div>

              {/* Specification line */}
              <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 text-white">
                <p className="text-teal-100 text-xs font-bold uppercase tracking-widest mb-2">Orifice Plate Specification</p>
                <p className="text-xl font-black mb-1">
                  d = {fmt(res.d_mm, 2)} mm &nbsp;·&nbsp; β = {fmt(res.beta, 4)} &nbsp;·&nbsp; C<sub>d</sub> = {fmt(res.Cd, 4)}
                </p>
                <p className="text-teal-100 text-sm">
                  {tap.label} · D = {fmt(D_mm_val,1)} mm · Q<sub>design</sub> = {qVal} {qUnit} · ΔP = {dP_val} {dP_unit}
                </p>
                <p className="text-teal-100 text-xs mt-2">
                  ISO 5167-2:2022 · RHG equation · Perm. loss = {fmt(res.dP_perm_pct,1)} % of ΔP · Re_D = {sig(res.Re_D,4)}
                  {service === "gas" ? ` · ε = ${fmt(res.eps,4)}` : ""}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      <References refs={REFS_ORIFICE_PLATE_SIZING} />
    </div>
  );
}