"use client";

import React, { useState, useMemo } from "react";
import { References } from "@/components/References";
import { REFS_MINE_VENTILATION } from "@/lib/references";

// ─── Physics ───────────────────────────────────────────────────────────────────
//
// AIRWAY RESISTANCE — ATKINSON EQUATION (McPherson, 2009)
//   R_std = k × L × Per / A³              [N·s²/m⁸ at ρ₀ = 1.2 kg/m³]
//   R_ρ   = R_std × (ρ / ρ₀)             [actual density correction]
//   ΔP    = R_ρ × Q²                      [Pa, Q in m³/s]
//
// EQUIVALENT CIRCUIT RESISTANCE
//   Series:   R_total = Σ Rᵢ
//   Parallel: 1/√R_eq = Σ (1/√Rᵢ)
//
// AIR CONDITIONS AT DEPTH
//   Auto-compression: T_depth ≈ T_surface + depth/100  [°C per 100 m, dry air]
//   Pressure:         P_depth ≈ P_surface + ρ_avg·g·depth / 1000  [kPa]
//   Density:          ρ = P / (287 × T)                [ideal gas, T in K]
//
// FAN OPERATING POINT
//   Find Q where H_fan(Q) = R_total × Q²  (bisection)
//   Fan power: P_shaft = ΔP_op × Q_op / η_fan          [W → kW]
//
// MHSA DIESEL DILUTION (Reg. 5.15.1)
//   Q_min = 0.06 m³/s per kW installed diesel power

const RHO0  = 1.2;    // standard air density [kg/m³]
const G     = 9.81;
const R_AIR = 287;    // specific gas constant, dry air [J/(kg·K)]

// ── Cross-section geometry ────────────────────────────────────────────────────
type Shape = "rectangular" | "arched" | "circular" | "square";

function xSection(
  shape: Shape, W: number, Hwall: number, D: number, S: number, Hleg: number
): { A: number; Per: number } {
  switch (shape) {
    case "rectangular":
      return { A: W * Hwall, Per: 2 * (W + Hwall) };
    case "arched": {
      // Semi-circular arch (radius = W/2) on rectangular legs of height Hleg
      const r = W / 2;
      return { A: W * Hleg + Math.PI * r * r / 2, Per: 2 * Hleg + Math.PI * r };
    }
    case "circular":
      return { A: Math.PI * D * D / 4, Per: Math.PI * D };
    case "square":
      return { A: S * S, Per: 4 * S };
  }
}

// ── Air dynamic viscosity — Sutherland's formula ──────────────────────────────
function airViscosity(T_C: number): number {
  const T = T_C + 273.15;
  return 1.458e-6 * Math.pow(T, 1.5) / (T + 110.4);  // [Pa·s]
}

// ── Series / parallel equivalent ─────────────────────────────────────────────
function seriesR(Rs: number[]): number {
  return Rs.reduce((s, r) => s + r, 0);
}
function parallelR(Rs: number[]): number {
  const s = Rs.reduce((sum, r) => sum + 1 / Math.sqrt(r), 0);
  return s > 0 ? 1 / (s * s) : Infinity;
}

// ── Air conditions at depth ───────────────────────────────────────────────────
function airAtDepth(
  depth_m: number, T_surf: number, P_surf_kPa: number
): { rho: number; T_C: number; P_kPa: number } {
  const T_C  = T_surf + depth_m / 100;               // ~1 °C / 100 m auto-compression
  const T_K  = T_C + 273.15;
  const rho_avg = (P_surf_kPa * 1000) / (R_AIR * (T_surf + 273.15 + depth_m / 200));
  const P_kPa   = P_surf_kPa + rho_avg * G * depth_m / 1000;
  const rho     = (P_kPa * 1000) / (R_AIR * T_K);
  return { rho, T_C, P_kPa };
}

// ── Fan curve helpers ─────────────────────────────────────────────────────────
type FanPts = [number, number][];   // [Q m³/s, H Pa]

function sortPts(pts: FanPts): FanPts {
  return [...pts].sort((a, b) => a[0] - b[0]);
}
function interpFan(Q: number, pts: FanPts): number {
  if (pts.length < 2) return 0;
  if (Q <= pts[0][0])                    return pts[0][1];
  if (Q >= pts[pts.length - 1][0])       return 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [q0, h0] = pts[i], [q1, h1] = pts[i + 1];
    if (Q >= q0 && Q <= q1) return h0 + (h1 - h0) * (Q - q0) / (q1 - q0);
  }
  return 0;
}
function parallelFanPts(pts: FanPts): FanPts { return pts.map(([q, h]) => [2 * q, h]); }
function seriesFanPts(pts:  FanPts): FanPts  { return pts.map(([q, h]) => [q, 2 * h]); }

// ── Operating point by bisection ──────────────────────────────────────────────
function findOpPoint(
  pts: FanPts, R: number
): { Q: number; H: number; found: boolean } {
  if (pts.length < 2 || !isFinite(R) || R <= 0) return { Q: 0, H: 0, found: false };
  const Q_max = pts[pts.length - 1][0];
  const f = (Q: number) => interpFan(Q, pts) - R * Q * Q;
  if (f(1e-9) <= 0) return { Q: 0, H: 0, found: false };
  let lo = 0, hi = Q_max * 0.9999;
  while (f(hi) > 0 && hi > 1e-6) hi = hi * 0.99;
  if (hi < 1e-6) return { Q: 0, H: 0, found: false };
  for (let i = 0; i < 200; i++) {
    if (hi - lo < 1e-9) break;
    const mid = (lo + hi) / 2;
    f(mid) > 0 ? (lo = mid) : (hi = mid);
  }
  const Q_op = (lo + hi) / 2;
  return { Q: Q_op, H: R * Q_op * Q_op, found: true };
}

// ── Detect fan hump (rising portion = potential instability) ──────────────────
function detectHump(pts: FanPts): boolean {
  for (let i = 1; i < pts.length; i++) if (pts[i][1] > pts[i - 1][1]) return true;
  return false;
}

// ─── Presets ──────────────────────────────────────────────────────────────────
const K_PRESETS = [
  { label: "Smooth concrete / shotcrete",         k: 0.0030 },
  { label: "Concrete block / brick",              k: 0.0055 },
  { label: "Steel arch sets — smooth lagging",    k: 0.0050 },
  { label: "Steel arch sets — no lagging",        k: 0.0085 },
  { label: "Timber sets — good condition",        k: 0.0100 },
  { label: "Timber sets — poor condition",        k: 0.0150 },
  { label: "Unlined rock — smooth blast",         k: 0.0160 },
  { label: "Unlined rock — rough / irregular",    k: 0.0200 },
  { label: "Custom k (N·s²/m⁴)",                 k: NaN    },
];

// ─── Styles ───────────────────────────────────────────────────────────────────
const SEL = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500";
const INP = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-500";
const INPS= "px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-yellow-500 w-full";

function fmt(n: number, dp = 2): string { return isFinite(n) && !isNaN(n) ? n.toFixed(dp) : "—"; }
function sig(n: number, s = 4): string  { return isFinite(n) ? parseFloat(n.toPrecision(s)).toString() : "—"; }

// ─── Airway data type ─────────────────────────────────────────────────────────
type AirwayRow = {
  label: string;
  shape: Shape;
  W: string; Hwall: string; D: string; S: string; Hleg: string;
  L: string;
  kIdx: number;
  kCustom: string;
};

function defaultAirway(n: number): AirwayRow {
  return {
    label: `Airway ${n}`, shape: "rectangular",
    W: "4", Hwall: "3", D: "4", S: "3", Hleg: "2",
    L: "500", kIdx: 6, kCustom: "0.016",
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MineVentilationPage() {

  // ── Air conditions ─────────────────────────────────────────────────────────
  const [condMode, setCondMode] = useState<"depth" | "manual">("depth");
  const [depthVal, setDepthVal] = useState("500");
  const [T_surf,   setT_surf]   = useState("25");
  const [P_surf,   setP_surf]   = useState("101.325");
  const [manRho,   setManRho]   = useState("1.200");

  // ── Airways ────────────────────────────────────────────────────────────────
  const [airways, setAirways] = useState<AirwayRow[]>([defaultAirway(1)]);
  const [circuit, setCircuit] = useState<"series" | "parallel">("series");

  function updateAw(idx: number, patch: Partial<AirwayRow>) {
    setAirways(p => p.map((a, i) => i === idx ? { ...a, ...patch } : a));
  }
  function addAw() {
    if (airways.length >= 4) return;
    setAirways(p => [...p, defaultAirway(p.length + 1)]);
  }
  function removeAw(idx: number) {
    setAirways(p => p.filter((_, i) => i !== idx));
  }

  // ── Fan data ───────────────────────────────────────────────────────────────
  const [fanRows, setFanRows] = useState([
    { Q: "0",  H: "2000" }, { Q: "10", H: "1900" }, { Q: "20", H: "1750" },
    { Q: "30", H: "1500" }, { Q: "40", H: "1150" }, { Q: "50", H: "650"  },
    { Q: "58", H: "0"    },
  ]);
  const [arrangement, setArrangement] = useState<"1" | "2p" | "2s">("1");
  const [fanEta,     setFanEta]     = useState("70");
  const [fanHUnit,   setFanHUnit]   = useState<"Pa" | "mmWg" | "kPa">("Pa");
  const [dieselKw,   setDieselKw]   = useState("");
  const [minVel,     setMinVel]     = useState("0.5");
  const [targetQ,    setTargetQ]    = useState("");
  const [copied,     setCopied]     = useState(false);

  function updateFan(i: number, f: "Q" | "H", v: string) {
    setFanRows(p => p.map((r, j) => j === i ? { ...r, [f]: v } : r));
  }
  function addFanRow()   { if (fanRows.length < 10) setFanRows(p => [...p, { Q: "", H: "" }]); }
  function remFanRow(i: number) { setFanRows(p => p.filter((_, j) => j !== i)); }

  // ── Computed: air conditions ───────────────────────────────────────────────
  const airCond = useMemo(() => {
    if (condMode === "depth") {
      const d = parseFloat(depthVal), Ts = parseFloat(T_surf), Ps = parseFloat(P_surf);
      if (!isFinite(d) || !isFinite(Ts) || !isFinite(Ps)) return null;
      return airAtDepth(Math.max(0, d), Ts, Ps);
    }
    const rho = parseFloat(manRho);
    return isFinite(rho) && rho > 0 ? { rho, T_C: NaN, P_kPa: NaN } : null;
  }, [condMode, depthVal, T_surf, P_surf, manRho]);

  const rho = airCond?.rho ?? 1.2;

  // ── Computed: per-airway results ───────────────────────────────────────────
  const awResults = useMemo(() => airways.map(aw => {
    const k   = isNaN(K_PRESETS[aw.kIdx].k) ? parseFloat(aw.kCustom) : K_PRESETS[aw.kIdx].k;
    const L   = parseFloat(aw.L);
    const { A, Per } = xSection(
      aw.shape,
      parseFloat(aw.W), parseFloat(aw.Hwall),
      parseFloat(aw.D), parseFloat(aw.S), parseFloat(aw.Hleg)
    );
    if ([k, L, A, Per].some(v => !isFinite(v) || v <= 0)) return null;
    const R_std = k * L * Per / Math.pow(A, 3);
    const R_rho = R_std * (rho / RHO0);
    const Dh    = 4 * A / Per;
    return { A, Per, Dh, R_std, R_rho, k, L };
  }), [airways, rho]);

  // ── Computed: total system resistance ─────────────────────────────────────
  const validRs  = awResults.filter(Boolean).map(r => r!.R_rho);
  const R_total  = useMemo(() => {
    if (validRs.length === 0) return NaN;
    return circuit === "series" ? seriesR(validRs) : parallelR(validRs);
  }, [validRs.join(","), circuit]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Computed: fan curves ───────────────────────────────────────────────────
  const hMult = fanHUnit === "mmWg" ? 9.81 : fanHUnit === "kPa" ? 1000 : 1; // → Pa
  const fanPtsBase: FanPts = useMemo(() => sortPts(
    fanRows
      .map(r => [parseFloat(r.Q), parseFloat(r.H) * hMult] as [number, number])
      .filter(([q, h]) => isFinite(q) && isFinite(h) && q >= 0 && h >= 0)
  ), [fanRows, hMult]);

  const fanPtsEff: FanPts = useMemo(() => {
    if (fanPtsBase.length < 2) return fanPtsBase;
    if (arrangement === "2p") return parallelFanPts(fanPtsBase);
    if (arrangement === "2s") return seriesFanPts(fanPtsBase);
    return fanPtsBase;
  }, [fanPtsBase, arrangement]);

  // ── Computed: operating point ──────────────────────────────────────────────
  const opPt = useMemo(() => {
    if (!isFinite(R_total) || fanPtsEff.length < 2) return null;
    return findOpPoint(fanPtsEff, R_total);
  }, [fanPtsEff, R_total]);

  const fanPower_kW = useMemo(() => {
    if (!opPt?.found) return null;
    const eta = parseFloat(fanEta) / 100;
    if (!isFinite(eta) || eta <= 0) return null;
    return (opPt.H * opPt.Q) / (eta * 1000);
  }, [opPt, fanEta]);

  const Q_mhsa = useMemo(() => {
    const kw = parseFloat(dieselKw);
    return isFinite(kw) && kw > 0 ? 0.06 * kw : null;
  }, [dieselKw]);

  // ── Specific Fan Power SFP = P_shaft / Q  [W/(m³/s)] ────────────────────────
  const sfp = useMemo(() => {
    if (!opPt?.found || !fanPower_kW || opPt.Q <= 0) return null;
    return (fanPower_kW * 1000) / opPt.Q;
  }, [opPt, fanPower_kW]);

  // ── Reverse solve: required ΔP for target Q ──────────────────────────────────
  const reverseResult = useMemo(() => {
    const Qt = parseFloat(targetQ);
    if (!isFinite(R_total) || !isFinite(Qt) || Qt <= 0) return null;
    const DP_Pa = R_total * Qt * Qt;
    return { Qt, DP_Pa, DP_mmWg: DP_Pa / 9.81, DP_kPa: DP_Pa / 1000 };
  }, [targetQ, R_total]);

  // ── Air temperature for viscosity (best estimate) ────────────────────────────
  const T_air = airCond?.T_C !== undefined && isFinite(airCond.T_C) ? airCond.T_C : 30;
  const mu_air = airViscosity(T_air);

  // ── Velocity per airway at operating point ─────────────────────────────────
  function velAtOp(idx: number): number | null {
    if (!opPt?.found) return null;
    const aw = awResults[idx];
    if (!aw) return null;
    if (circuit === "series") return opPt.Q / aw.A;
    const DP = opPt.H;
    return Math.sqrt(DP / aw.R_rho) / aw.A;
  }

  // ── Reynolds number per airway at operating point ─────────────────────────
  function reAtOp(idx: number): number | null {
    const v = velAtOp(idx);
    const aw = awResults[idx];
    if (v === null || !aw) return null;
    return rho * v * aw.Dh / mu_air;
  }

  // ── SVG chart ──────────────────────────────────────────────────────────────
  const chart = useMemo(() => {
    if (!isFinite(R_total) || fanPtsEff.length < 2) return null;
    const Q_max = (fanPtsEff[fanPtsEff.length - 1][0]) * 1.08;
    const H_max = (Math.max(...fanPtsEff.map(p => p[1]))) * 1.15;
    const W = 520, H = 300, ml = 68, mr = 20, mt = 20, mb = 48;
    const pw = W - ml - mr, ph = H - mt - mb;
    const tx = (q: number) => ml + Math.min(1, q / Q_max) * pw;
    const ty = (h: number) => mt + ph - Math.min(1, h / H_max) * ph;

    // System curve (50 points)
    const sysPts = Array.from({ length: 51 }, (_, i) => {
      const q = (i / 50) * Q_max;
      const h = R_total * q * q;
      return [q, Math.min(h, H_max * 1.3)] as [number, number];
    });
    const sysPath = sysPts.map(([q, h], i) =>
      `${i === 0 ? "M" : "L"}${tx(q).toFixed(1)},${ty(h).toFixed(1)}`
    ).join(" ");

    // Fan curve (effective)
    const fanPath = fanPtsEff.map(([q, h], i) =>
      `${i === 0 ? "M" : "L"}${tx(q).toFixed(1)},${ty(Math.min(h, H_max * 1.3)).toFixed(1)}`
    ).join(" ");

    // Single-fan reference (shown faint when parallel/series)
    const fanRefPath = arrangement !== "1" && fanPtsBase.length >= 2
      ? fanPtsBase.map(([q, h], i) =>
          `${i === 0 ? "M" : "L"}${tx(q).toFixed(1)},${ty(Math.min(h, H_max * 1.3)).toFixed(1)}`
        ).join(" ")
      : null;

    const xTicks = Array.from({ length: 7 }, (_, i) => ({ q: Q_max * i / 6, label: (Q_max * i / 6).toFixed(0) }));
    const yTicks = Array.from({ length: 6 }, (_, i) => ({ h: H_max * i / 5, label: (H_max * i / 5).toFixed(0) }));

    const opSvg = opPt?.found ? { x: tx(opPt.Q), y: ty(opPt.H) } : null;

    return { W, H, ml, mr, mt, mb, Q_max, H_max, sysPath, fanPath, fanRefPath, xTicks, yTicks, opSvg };
  }, [R_total, fanPtsEff, fanPtsBase, opPt, arrangement]);

  // ── Copy / CSV ─────────────────────────────────────────────────────────────
  function copyResults() {
    if (!opPt) return;
    const lines = [
      "Mine Ventilation — Airway Resistance & Fan Selection",
      `Depth = ${condMode === "depth" ? depthVal + " m" : "manual"} · ρ = ${fmt(rho, 3)} kg/m³`,
      `R_total = ${sig(R_total, 4)} N·s²/m⁸ · ${circuit} circuit · ${airways.length} airway(s)`,
      `Fan: ${arrangement === "1" ? "1 fan" : arrangement === "2p" ? "2 fans parallel" : "2 fans series"} · η = ${fanEta}%`,
      `Operating point: Q = ${fmt(opPt.Q, 2)} m³/s · ΔP = ${fmt(opPt.H, 0)} Pa${fanPower_kW ? " · P = " + fmt(fanPower_kW, 1) + " kW" : ""}`,
      Q_mhsa ? `MHSA diesel: Q_req = ${fmt(Q_mhsa, 2)} m³/s · Q_op = ${fmt(opPt.Q, 2)} m³/s · ${opPt.Q >= Q_mhsa ? "✓ Compliant" : "⚠ NON-COMPLIANT"}` : "",
    ].filter(Boolean);
    navigator.clipboard.writeText(lines.join("\n")).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  }

  function csvDownload() {
    if (!opPt) return;
    const rows: string[][] = [
      ["Parameter", "Value", "Unit"],
      ["Mine depth", condMode === "depth" ? depthVal : "—", "m"],
      ["Surface temperature", condMode === "depth" ? T_surf : "—", "°C"],
      ["Air density ρ", fmt(rho, 4), "kg/m³"],
      airCond?.T_C !== undefined && isFinite(airCond.T_C) ? ["Air temperature at depth", fmt(airCond.T_C, 1), "°C"] : [],
      airCond?.P_kPa !== undefined && isFinite(airCond.P_kPa) ? ["Barometric pressure at depth", fmt(airCond.P_kPa, 2), "kPa"] : [],
      ["Circuit mode", circuit, ""],
      ["Number of airways", String(airways.length), ""],
      ...awResults.flatMap((r, i) => r ? [
        [`Airway ${i + 1} — ${airways[i].label}`, "", ""],
        [`  Cross-section area A`, fmt(r.A, 4), "m²"],
        [`  Perimeter Per`, fmt(r.Per, 3), "m"],
        [`  Hydraulic diameter D_h`, fmt(r.Dh, 3), "m"],
        [`  Length L`, fmt(r.L, 0), "m"],
        [`  k-factor`, fmt(r.k, 5), "N·s²/m⁴"],
        [`  R (at standard ρ=1.2)`, sig(r.R_std, 4), "N·s²/m⁸"],
        [`  R (at actual ρ)`, sig(r.R_rho, 4), "N·s²/m⁸"],
        [`  Velocity at op. point`, opPt?.found ? fmt(velAtOp(i) ?? 0, 2) : "—", "m/s"],
      ] : []),
      ["Total system resistance R_total", sig(R_total, 4), "N·s²/m⁸"],
      ["Fan arrangement", arrangement === "1" ? "Single fan" : arrangement === "2p" ? "2 fans parallel" : "2 fans series", ""],
      ["Fan efficiency η", fanEta, "%"],
      ["Operating point — Q", fmt(opPt.Q, 3), "m³/s"],
      ["Operating point — ΔP", fmt(opPt.H, 1), "Pa"],
      ["Fan shaft power", fanPower_kW ? fmt(fanPower_kW, 2) : "—", "kW"],
      Q_mhsa ? ["MHSA diesel Q_required", fmt(Q_mhsa, 2), "m³/s"] : [],
      Q_mhsa ? ["MHSA compliance", (opPt.Q >= Q_mhsa ? "Compliant" : "NON-COMPLIANT"), ""] : [],
    ].filter(r => r.length === 3) as string[][];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "mine-ventilation.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const hasResult = opPt !== null;
  const hump = detectHump(fanPtsEff);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Mine Ventilation — Airway Resistance &amp; Fan Selection
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Atkinson equation (IDs 56–57) · Series &amp; parallel circuits · MHSA Reg. 5.15.1 compliance · SA deep-level mining
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={csvDownload} disabled={!hasResult}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>CSV
          </button>
          <button onClick={copyResults} disabled={!hasResult}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {copied
              ? <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Copied!</>
              : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</>
            }
          </button>
        </div>
      </div>

      <div className="flex gap-5 items-start">

        {/* ══ SIDEBAR ══════════════════════════════════════════════════════════ */}
        <aside className="w-80 flex-shrink-0 space-y-4 sticky top-20 max-h-[calc(100vh-7rem)] overflow-y-auto pb-4">

          {/* Air Conditions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Air Conditions</p>
            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 mb-3 text-xs">
              <button onClick={() => setCondMode("depth")} className={`flex-1 py-1.5 font-semibold ${condMode === "depth" ? "bg-yellow-500 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                From depth
              </button>
              <button onClick={() => setCondMode("manual")} className={`flex-1 py-1.5 font-semibold ${condMode === "manual" ? "bg-yellow-500 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                Manual ρ
              </button>
            </div>
            {condMode === "depth" ? (
              <div className="space-y-2">
                <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Mine depth (m)</p>
                  <input type="number" value={depthVal} onChange={e => setDepthVal(e.target.value)} placeholder="e.g. 1000" className={INP}/></div>
                <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Surface temperature (°C)</p>
                  <input type="number" value={T_surf} onChange={e => setT_surf(e.target.value)} placeholder="e.g. 25" className={INP}/></div>
                <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Surface pressure (kPa)</p>
                  <input type="number" value={P_surf} onChange={e => setP_surf(e.target.value)} placeholder="101.325" className={INP}/></div>
                {airCond && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 text-xs space-y-0.5 text-blue-700 dark:text-blue-300">
                    <div className="flex justify-between"><span>ρ at depth</span><span className="font-bold">{fmt(airCond.rho, 4)} kg/m³</span></div>
                    <div className="flex justify-between"><span>T at depth</span><span className="font-bold">{fmt(airCond.T_C, 1)} °C</span></div>
                    <div className="flex justify-between"><span>P at depth</span><span className="font-bold">{fmt(airCond.P_kPa, 2)} kPa</span></div>
                  </div>
                )}
              </div>
            ) : (
              <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Air density ρ (kg/m³)</p>
                <input type="number" value={manRho} onChange={e => setManRho(e.target.value)} step="0.001" className={INP}/></div>
            )}
          </div>

          {/* Airways */}
          {airways.map((aw, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{aw.label}</p>
                {airways.length > 1 && (
                  <button onClick={() => removeAw(idx)} className="text-xs text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20">Remove</button>
                )}
              </div>
              <div className="space-y-2">
                {/* Label */}
                <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Label</p>
                  <input type="text" value={aw.label} onChange={e => updateAw(idx, { label: e.target.value })} className={INP}/></div>
                {/* Shape */}
                <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cross-section shape</p>
                  <select value={aw.shape} onChange={e => updateAw(idx, { shape: e.target.value as Shape })} className={SEL}>
                    <option value="rectangular">Rectangular</option>
                    <option value="arched">Arched horseshoe (semi-circular top)</option>
                    <option value="circular">Circular (shaft / raise)</option>
                    <option value="square">Square</option>
                  </select>
                </div>
                {/* Dimensions */}
                {aw.shape === "rectangular" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Width W (m)</p>
                      <input type="number" value={aw.W} onChange={e => updateAw(idx, { W: e.target.value })} step="0.1" className={INP}/></div>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Height H (m)</p>
                      <input type="number" value={aw.Hwall} onChange={e => updateAw(idx, { Hwall: e.target.value })} step="0.1" className={INP}/></div>
                  </div>
                )}
                {aw.shape === "arched" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Width W (m)</p>
                      <input type="number" value={aw.W} onChange={e => updateAw(idx, { W: e.target.value })} step="0.1" className={INP}/></div>
                    <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Leg height H_leg (m)</p>
                      <input type="number" value={aw.Hleg} onChange={e => updateAw(idx, { Hleg: e.target.value })} step="0.1" className={INP}/></div>
                  </div>
                )}
                {aw.shape === "circular" && (
                  <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Diameter D (m)</p>
                    <input type="number" value={aw.D} onChange={e => updateAw(idx, { D: e.target.value })} step="0.1" className={INP}/></div>
                )}
                {aw.shape === "square" && (
                  <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Side S (m)</p>
                    <input type="number" value={aw.S} onChange={e => updateAw(idx, { S: e.target.value })} step="0.1" className={INP}/></div>
                )}
                {/* Airway geometry summary */}
                {awResults[idx] && (
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded px-2 py-1">
                    A = {fmt(awResults[idx]!.A, 3)} m² · Per = {fmt(awResults[idx]!.Per, 2)} m · D_h = {fmt(awResults[idx]!.Dh, 2)} m
                  </p>
                )}
                {/* Length */}
                <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Length L (m)</p>
                  <input type="number" value={aw.L} onChange={e => updateAw(idx, { L: e.target.value })} placeholder="e.g. 500" className={INP}/></div>
                {/* k-factor */}
                <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Lining / k-factor</p>
                  <select value={aw.kIdx} onChange={e => updateAw(idx, { kIdx: Number(e.target.value) })} className={SEL}>
                    {K_PRESETS.map((p, i) => <option key={i} value={i}>{p.label}{isFinite(p.k) ? ` (k=${p.k})` : ""}</option>)}
                  </select>
                </div>
                {isNaN(K_PRESETS[aw.kIdx].k) && (
                  <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">k (N·s²/m⁴)</p>
                    <input type="number" value={aw.kCustom} onChange={e => updateAw(idx, { kCustom: e.target.value })} step="0.001" className={INP}/></div>
                )}
                {/* R result */}
                {awResults[idx] && (
                  <p className="text-[10px] text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded px-2 py-1">
                    R = {sig(awResults[idx]!.R_rho, 4)} N·s²/m⁸
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Add airway / circuit mode */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Circuit Configuration</p>
            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 mb-3 text-xs">
              <button onClick={() => setCircuit("series")} className={`flex-1 py-1.5 font-semibold ${circuit === "series" ? "bg-yellow-500 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                Series
              </button>
              <button onClick={() => setCircuit("parallel")} className={`flex-1 py-1.5 font-semibold ${circuit === "parallel" ? "bg-yellow-500 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                Parallel
              </button>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3">
              {circuit === "series" ? "All airways in chain — R_total = ΣR_i. Same Q flows through each." : "Airways share same total pressure — 1/√R_eq = Σ(1/√R_i). Each branch carries different Q."}
            </p>
            {airways.length < 4 && (
              <button onClick={addAw} className="w-full py-2 text-xs font-medium text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors">
                + Add airway (max 4)
              </button>
            )}
          </div>

          {/* Fan H-Q data */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Fan H-Q Curve Data</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2">Enter from fan datasheet. H must decrease with Q. Min 2 points.</p>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">H unit:</p>
              <div className="flex rounded overflow-hidden border border-gray-300 dark:border-gray-600 text-xs flex-1">
                {(["Pa", "mmWg", "kPa"] as const).map(u => (
                  <button key={u} onClick={() => setFanHUnit(u)} className={`flex-1 py-1 font-semibold ${fanHUnit === u ? "bg-yellow-500 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>{u}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Q (m³/s)</p>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">H ({fanHUnit})</p>
              {fanRows.map((r, i) => (
                <React.Fragment key={i}>
                  <input type="number" value={r.Q} onChange={e => updateFan(i, "Q", e.target.value)} className={INPS} placeholder="0"/>
                  <div className="flex gap-1">
                    <input type="number" value={r.H} onChange={e => updateFan(i, "H", e.target.value)} className={INPS} placeholder="0"/>
                    {fanRows.length > 2 && (
                      <button onClick={() => remFanRow(i)} className="text-red-400 hover:text-red-600 text-xs px-0.5">×</button>
                    )}
                  </div>
                </React.Fragment>
              ))}
            </div>
            {fanRows.length < 10 && (
              <button onClick={addFanRow} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">+ Add row</button>
            )}
            {hump && <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2">⚠ Fan curve has a rising portion — instability risk if operating left of the peak.</p>}
          </div>

          {/* Fan arrangement + efficiency */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Fan Arrangement</p>
            <select value={arrangement} onChange={e => setArrangement(e.target.value as typeof arrangement)} className={SEL}>
              <option value="1">Single fan</option>
              <option value="2p">2 identical fans — parallel (same H, 2× Q)</option>
              <option value="2s">2 identical fans — series (same Q, 2× H)</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 mb-1">Fan efficiency η (%)</p>
            <input type="number" value={fanEta} onChange={e => setFanEta(e.target.value)} placeholder="e.g. 70" className={INP}/>
          </div>

          {/* MHSA checks */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">MHSA Compliance (optional)</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3">
              Reg. 5.15.1 — min. airflow for diesel = 0.06 m³/s per kW. Reg. 5.15.2 — min. velocity per area type.
            </p>
            <div className="space-y-2">
              <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total diesel kW installed underground</p>
                <input type="number" value={dieselKw} onChange={e => setDieselKw(e.target.value)} placeholder="e.g. 500" className={INP}/></div>
              <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Min. velocity threshold (m/s)</p>
                <input type="number" value={minVel} onChange={e => setMinVel(e.target.value)} placeholder="0.5" step="0.05" className={INP}/>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Dev. headings 0.5 · Haulages 0.25 · Working places 0.5</p>
              </div>
              <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Target Q for fan sizing (m³/s)</p>
                <input type="number" value={targetQ} onChange={e => setTargetQ(e.target.value)} placeholder="e.g. 45" className={INP}/>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Shows required fan ΔP = R × Q² below.</p>
              </div>
            </div>
          </div>

        </aside>

        {/* ══ RESULTS ══════════════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Empty state */}
          {!isFinite(R_total) && (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
              </svg>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Enter airway dimensions and fan H-Q data</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Atkinson equation · Mine fan operating point · MHSA Reg. 5.15.1</p>
            </div>
          )}

          {isFinite(R_total) && (
            <>
              {/* Operating point alert */}
              {opPt?.found ? (
                <div className="flex items-start gap-3 px-5 py-4 rounded-2xl border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <span className="text-xl flex-shrink-0">✓</span>
                  <div>
                    <p className="text-sm font-bold text-green-700 dark:text-green-300">
                      Q = {fmt(opPt.Q, 2)} m³/s · ΔP = {fmt(opPt.H, 0)} Pa ({fmt(opPt.H / 9.81, 1)} mmWg)
                      {fanPower_kW && ` · P_shaft = ${fmt(fanPower_kW, 1)} kW`}
                      {sfp && ` · SFP = ${fmt(sfp, 0)} W/(m³/s)`}
                    </p>
                    <p className="text-xs mt-0.5 text-green-600/80 dark:text-green-400/80">
                      System R = {sig(R_total, 4)} N·s²/m⁸ · {circuit} circuit ·{" "}
                      {arrangement === "1" ? "Single fan" : arrangement === "2p" ? "2 fans parallel" : "2 fans series"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 px-5 py-4 rounded-2xl border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                  <span className="text-xl flex-shrink-0">⛔</span>
                  <div>
                    <p className="text-sm font-bold text-red-700 dark:text-red-300">Fan cannot overcome system resistance</p>
                    <p className="text-xs mt-0.5 text-red-600/80 dark:text-red-400/80">
                      System R = {sig(R_total, 4)} N·s²/m⁸. Check fan curve, consider 2-fan series arrangement, or reduce airway resistance.
                    </p>
                  </div>
                </div>
              )}

              {/* MHSA compliance alert (if diesel kW entered) */}
              {Q_mhsa !== null && opPt?.found && (
                <div className={`flex items-start gap-3 px-5 py-3 rounded-2xl border text-sm ${
                  opPt.Q >= Q_mhsa
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                }`}>
                  <span className="flex-shrink-0">{opPt.Q >= Q_mhsa ? "✓" : "⛔"}</span>
                  <p className={opPt.Q >= Q_mhsa ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
                    <strong>MHSA Reg. 5.15.1 (Diesel Dilution):</strong>{" "}
                    Q_required = {fmt(Q_mhsa, 2)} m³/s · Q_operating = {fmt(opPt.Q, 2)} m³/s ·{" "}
                    {opPt.Q >= Q_mhsa ? "✓ Compliant" : `⛔ Deficit = ${fmt(Q_mhsa - opPt.Q, 2)} m³/s`}
                  </p>
                </div>
              )}

              {/* Primary metric cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 p-4">
                  <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-1">System resistance R</p>
                  <p className="text-xl font-black text-yellow-700 dark:text-yellow-300">{sig(R_total, 4)}</p>
                  <p className="text-xs text-yellow-600/70 dark:text-yellow-400/70 mt-0.5">N·s²/m⁸ · {circuit}</p>
                </div>
                <div className={`rounded-xl border p-4 ${opPt?.found ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"}`}>
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Operating airflow Q</p>
                  <p className="text-xl font-black text-blue-700 dark:text-blue-300">{opPt?.found ? fmt(opPt.Q, 2) : "—"} <span className="text-sm">m³/s</span></p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">{opPt?.found ? `${fmt(opPt.Q * 3600, 0)} m³/h` : "No intersection"}</p>
                </div>
                <div className={`rounded-xl border p-4 ${opPt?.found ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800" : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"}`}>
                  <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">Fan total pressure ΔP</p>
                  <p className="text-xl font-black text-purple-700 dark:text-purple-300">{opPt?.found ? fmt(opPt.H, 0) : "—"} <span className="text-sm">Pa</span></p>
                  <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-0.5">{opPt?.found ? `${fmt(opPt.H / 9.81, 1)} mmWg · ${fmt(opPt.H / 1000, 3)} kPa` : ""}</p>
                </div>
                <div className={`rounded-xl border p-4 ${fanPower_kW !== null ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800" : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"}`}>
                  <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1">Fan shaft power</p>
                  <p className="text-xl font-black text-orange-700 dark:text-orange-300">{fanPower_kW !== null ? fmt(fanPower_kW, 1) : "—"} <span className="text-sm">kW</span></p>
                  <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-0.5">η = {fanEta}% · SFP = {sfp ? fmt(sfp, 0) : "—"} W/(m³/s)</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                  <p className="text-xs font-semibold text-gray-400 mb-1">Air density ρ</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white">{fmt(rho, 4)} <span className="text-sm">kg/m³</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">μ = {fmt(mu_air * 1e5, 3)} × 10⁻⁵ Pa·s · T = {fmt(T_air, 1)} °C</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                  <p className="text-xs font-semibold text-gray-400 mb-1">Fan arrangement</p>
                  <p className="text-base font-black text-gray-900 dark:text-white leading-tight mt-1">
                    {arrangement === "1" ? "Single fan" : arrangement === "2p" ? "2× Parallel" : "2× Series"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{airways.length} airway(s) · {circuit} · η = {fanEta}%</p>
                </div>
              </div>

              {/* SVG Chart */}
              {chart && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-1 self-stretch min-h-[2rem] rounded-full bg-yellow-500 flex-shrink-0"/>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">System Curve &amp; Fan Characteristic</h3>
                      <div className="flex gap-4 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><span className="w-5 h-0.5 bg-blue-500 inline-block rounded"/>System H = R·Q²</span>
                        <span className="flex items-center gap-1"><span className="w-5 h-0.5 bg-red-500 inline-block rounded"/>Fan H-Q</span>
                        {chart.fanRefPath && <span className="flex items-center gap-1"><span className="w-5 h-0.5 bg-red-300 border-dashed inline-block rounded"/>Single fan</span>}
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"/>Op. point</span>
                      </div>
                    </div>
                  </div>
                  <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full" style={{ maxHeight: 320 }}>
                    {/* Grid lines — use index-based positions matching tick labels */}
                    {chart.xTicks.map((t, i) => {
                      const x = chart.ml + (i / (chart.xTicks.length - 1)) * (chart.W - chart.ml - chart.mr);
                      return <line key={t.q} x1={x} y1={chart.mt} x2={x} y2={chart.mt + chart.H - chart.mt - chart.mb} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} className="text-gray-500"/>;
                    })}
                    {chart.yTicks.map((t, i) => {
                      const y = chart.mt + chart.H - chart.mt - chart.mb - (i / (chart.yTicks.length - 1)) * (chart.H - chart.mt - chart.mb);
                      return <line key={t.h} x1={chart.ml} y1={y} x2={chart.W - chart.mr} y2={y} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} className="text-gray-500"/>;
                    })}
                    {/* Axes */}
                    <line x1={chart.ml} y1={chart.mt} x2={chart.ml} y2={chart.mt + chart.H - chart.mt - chart.mb} stroke="currentColor" strokeWidth={1.5} className="text-gray-400"/>
                    <line x1={chart.ml} y1={chart.mt + chart.H - chart.mt - chart.mb} x2={chart.W - chart.mr} y2={chart.mt + chart.H - chart.mt - chart.mb} stroke="currentColor" strokeWidth={1.5} className="text-gray-400"/>
                    {/* Axis labels */}
                    <text x={chart.W / 2} y={chart.H - 4} textAnchor="middle" className="fill-gray-500 dark:fill-gray-400" fontSize={11}>Airflow Q (m³/s)</text>
                    <text x={12} y={chart.mt + (chart.H - chart.mt - chart.mb) / 2} textAnchor="middle" className="fill-gray-500 dark:fill-gray-400" fontSize={11} transform={`rotate(-90,12,${chart.mt + (chart.H - chart.mt - chart.mb) / 2})`}>Pressure ΔP (Pa)</text>
                    {/* X tick labels */}
                    {chart.xTicks.map((t, i) => {
                      const x = chart.ml + (i / (chart.xTicks.length - 1)) * (chart.W - chart.ml - chart.mr);
                      return <text key={i} x={x} y={chart.mt + chart.H - chart.mt - chart.mb + 16} textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" fontSize={10}>{t.label}</text>;
                    })}
                    {/* Y tick labels */}
                    {chart.yTicks.map((t, i) => {
                      const y = chart.mt + chart.H - chart.mt - chart.mb - (i / (chart.yTicks.length - 1)) * (chart.H - chart.mt - chart.mb);
                      return <text key={i} x={chart.ml - 5} y={y + 4} textAnchor="end" className="fill-gray-400 dark:fill-gray-500" fontSize={10}>{t.label}</text>;
                    })}
                    {/* System curve */}
                    <path d={chart.sysPath} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinejoin="round"/>
                    {/* Single-fan reference (dashed) */}
                    {chart.fanRefPath && <path d={chart.fanRefPath} fill="none" stroke="#fca5a5" strokeWidth={1.5} strokeDasharray="5,3"/>}
                    {/* Fan curve */}
                    <path d={chart.fanPath} fill="none" stroke="#ef4444" strokeWidth={2.5} strokeLinejoin="round"/>
                    {/* Operating point */}
                    {chart.opSvg && (
                      <>
                        <line x1={chart.opSvg.x} y1={chart.mt} x2={chart.opSvg.x} y2={chart.opSvg.y} stroke="#22c55e" strokeWidth={1} strokeDasharray="4,3"/>
                        <line x1={chart.ml} y1={chart.opSvg.y} x2={chart.opSvg.x} y2={chart.opSvg.y} stroke="#22c55e" strokeWidth={1} strokeDasharray="4,3"/>
                        <circle cx={chart.opSvg.x} cy={chart.opSvg.y} r={7} fill="#22c55e" stroke="white" strokeWidth={2}/>
                      </>
                    )}
                  </svg>
                </div>
              )}

              {/* Per-airway detail table */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-1 self-stretch min-h-[2rem] rounded-full bg-blue-500 flex-shrink-0"/>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Airway Calculation Detail</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-600">
                        <th className="text-left pb-2 pr-3 text-gray-500 dark:text-gray-400 font-semibold">Parameter</th>
                        {airways.map((aw, i) => (
                          <th key={i} className="text-right pb-2 px-2 text-gray-700 dark:text-gray-200 font-bold">{aw.label}</th>
                        ))}
                        {airways.length > 1 && <th className="text-right pb-2 pl-2 text-yellow-600 dark:text-yellow-400 font-bold">System</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {([
                        { label: "Shape",             vals: airways.map(a => a.shape) },
                        { label: "Area A (m²)",        vals: awResults.map(r => r ? fmt(r.A, 3) : "—") },
                        { label: "Perimeter (m)",      vals: awResults.map(r => r ? fmt(r.Per, 2) : "—") },
                        { label: "D_h (m)",            vals: awResults.map(r => r ? fmt(r.Dh, 3) : "—") },
                        { label: "Length L (m)",       vals: airways.map(a => a.L) },
                        { label: "k (N·s²/m⁴)",       vals: awResults.map(r => r ? fmt(r.k, 5) : "—") },
                        { label: "R_std (N·s²/m⁸)",   vals: awResults.map(r => r ? sig(r.R_std, 4) : "—") },
                        { label: "R_ρ (N·s²/m⁸)",    vals: awResults.map(r => r ? sig(r.R_rho, 4) : "—") },
                        { label: "V at op. point (m/s)", vals: airways.map((_, i) => { const v = velAtOp(i); return v !== null ? fmt(v, 2) : "—"; }) },
                        { label: `V ≥ ${minVel || "0.5"} m/s? (MHSA)`, vals: airways.map((_, i) => { const v = velAtOp(i); const mv = parseFloat(minVel) || 0.5; return v !== null ? (v >= mv ? "✓" : "⚠ LOW") : "—"; }) },
                        { label: "Reynolds number Re",   vals: airways.map((_, i) => { const re = reAtOp(i); return re !== null ? sig(re, 3) : "—"; }) },
                        { label: "Flow regime",          vals: airways.map((_, i) => { const re = reAtOp(i); return re !== null ? (re > 4000 ? "Turbulent ✓" : re > 2300 ? "Transitional" : "Laminar ⚠") : "—"; }) },
                      ] as { label: string; vals: string[] }[]).map(row => (
                        <tr key={row.label}>
                          <td className="py-1.5 pr-3 text-gray-500 dark:text-gray-400">{row.label}</td>
                          {row.vals.map((v, i) => (
                            <td key={i} className={`py-1.5 px-2 text-right font-mono font-bold ${v.startsWith("⚠") ? "text-amber-600 dark:text-amber-400" : v === "✓" ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-white"}`}>{v}</td>
                          ))}
                          {airways.length > 1 && (
                            <td className="py-1.5 pl-2 text-right font-mono font-bold text-yellow-700 dark:text-yellow-300">
                              {row.label === "R_ρ (N·s²/m⁸)" ? sig(R_total, 4) : ""}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Reverse solve panel */}
              {reverseResult && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-1 self-stretch min-h-[2rem] rounded-full bg-purple-500 flex-shrink-0"/>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Fan Sizing — Required ΔP at Target Q</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 px-4 py-3">
                      <p className="text-xs font-semibold text-purple-500 dark:text-purple-400 mb-1">Target airflow Q</p>
                      <p className="text-xl font-black text-purple-700 dark:text-purple-300">{fmt(reverseResult.Qt, 2)} <span className="text-sm">m³/s</span></p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 px-4 py-3">
                      <p className="text-xs font-semibold text-blue-500 dark:text-blue-400 mb-1">Required ΔP</p>
                      <p className="text-xl font-black text-blue-700 dark:text-blue-300">{fmt(reverseResult.DP_Pa, 0)} <span className="text-sm">Pa</span></p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-3">
                      <p className="text-xs font-semibold text-gray-400 mb-1">Required ΔP</p>
                      <p className="text-xl font-black text-gray-900 dark:text-white">{fmt(reverseResult.DP_mmWg, 1)} <span className="text-sm">mmWg</span></p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-3">
                      <p className="text-xs font-semibold text-gray-400 mb-1">Required ΔP</p>
                      <p className="text-xl font-black text-gray-900 dark:text-white">{fmt(reverseResult.DP_kPa, 3)} <span className="text-sm">kPa</span></p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3">
                    Required fan total pressure = R_total × Q² = {sig(R_total, 4)} × {fmt(reverseResult.Qt, 2)}² Pa. Use this to select a fan from the manufacturer&apos;s catalogue at the site air density.
                  </p>
                </div>
              )}

              {/* Full calculation summary */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-1 self-stretch min-h-[2rem] rounded-full bg-yellow-500 flex-shrink-0"/>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Full Calculation Summary</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {([
                    { label: "Air density ρ (kg/m³)",          value: fmt(rho, 4) },
                    { label: "Air temp. at depth (°C)",        value: airCond?.T_C !== undefined && isFinite(airCond.T_C) ? fmt(airCond.T_C, 1) : "—" },
                    { label: "Barometric P at depth (kPa)",    value: airCond?.P_kPa !== undefined && isFinite(airCond.P_kPa) ? fmt(airCond.P_kPa, 2) : "—" },
                    { label: "Air dynamic viscosity μ (Pa·s)", value: `${fmt(mu_air * 1e5, 3)} × 10⁻⁵` },
                    { label: "Total system R (N·s²/m⁸)",       value: sig(R_total, 4) },
                    { label: "Circuit mode",                   value: circuit },
                    { label: "Fan arrangement",                value: arrangement === "1" ? "Single" : arrangement === "2p" ? "2× parallel" : "2× series" },
                    { label: "Fan efficiency η",               value: fanEta + " %" },
                    { label: "Operating Q (m³/s)",             value: opPt?.found ? fmt(opPt.Q, 3) : "—" },
                    { label: "Operating Q (m³/h)",             value: opPt?.found ? fmt(opPt.Q * 3600, 0) : "—" },
                    { label: "Fan ΔP at duty (Pa)",            value: opPt?.found ? fmt(opPt.H, 1) : "—" },
                    { label: "Fan ΔP at duty (mmWg)",          value: opPt?.found ? fmt(opPt.H / 9.81, 1) : "—" },
                    { label: "Fan ΔP at duty (kPa)",           value: opPt?.found ? fmt(opPt.H / 1000, 4) : "—" },
                    { label: "Fan shaft power (kW)",           value: fanPower_kW !== null ? fmt(fanPower_kW, 2) : "—" },
                    { label: "Specific fan power SFP (W/(m³/s))", value: sfp !== null ? fmt(sfp, 0) : "—" },
                    { label: "MHSA diesel Q_req (m³/s)",       value: Q_mhsa !== null ? fmt(Q_mhsa, 2) : "N/A" },
                    { label: "MHSA compliance",                value: Q_mhsa !== null && opPt?.found ? (opPt.Q >= Q_mhsa ? "✓ Compliant" : "⚠ Non-compliant") : "N/A" },
                    { label: "Target Q (m³/s)",                value: reverseResult ? fmt(reverseResult.Qt, 2) : "N/A" },
                    { label: "Required fan ΔP at target Q (Pa)",   value: reverseResult ? fmt(reverseResult.DP_Pa, 0) : "N/A" },
                    { label: "Required fan ΔP at target Q (mmWg)", value: reverseResult ? fmt(reverseResult.DP_mmWg, 1) : "N/A" },
                  ] as { label: string; value: string }[]).map(item => (
                    <div key={item.label} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{item.label}</p>
                      <p className={`text-sm font-mono font-bold ${item.value.startsWith("✓") ? "text-green-600 dark:text-green-400" : item.value.startsWith("⚠") ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-white"}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Validity notes */}
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-5">
                <h3 className="text-sm font-bold text-amber-700 dark:text-amber-300 mb-2">Validity &amp; Limitations</h3>
                <ul className="space-y-1 text-xs text-amber-700/80 dark:text-amber-300/80 list-disc list-inside">
                  <li>Atkinson's equation assumes steady, fully turbulent flow — valid for Re &gt; 4000 in most mine airways.</li>
                  <li>k-factors are from McPherson (2009) &amp; MHSA literature; actual values depend on surface finish, obstructions, and services in the airway.</li>
                  <li>Auto-compression temperature rise (~1 °C/100 m) is for dry air. Wet airways (spray cooling, evaporation) rise at ~0.5 °C/100 m.</li>
                  <li>Parallel circuit formula (1/√R_eq = Σ1/√Rᵢ) assumes each branch shares the same total pressure — correct for independent airways from common junctions.</li>
                  <li>Fan curve entered by the user — always verify against the manufacturer's certified test curve at the actual site density.</li>
                  <li>Fan hump (rising portion of H-Q curve) indicates potential operating instability if the system resistance curve intersects the rising portion.</li>
                  <li>MHSA Reg. 5.15.1 diesel dilution: 0.06 m³/s per kW diesel is the minimum — check actual CO and NO_x levels for compliance.</li>
                  <li>For leakage, shock losses at junctions, and multi-district networks use dedicated ventilation software (VentSim, VUMA, 3D-Canvent).</li>
                </ul>
              </div>
            </>
          )}

          <References refs={REFS_MINE_VENTILATION} />
        </div>
      </div>
    </div>
  );
}
