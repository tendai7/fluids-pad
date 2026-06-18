"use client";

import React, { useState, useMemo } from "react";
import { References } from "@/components/References";
import { REFS_PIPE_THERMAL_EXPANSION } from "@/lib/references";

// ─── Physics ───────────────────────────────────────────────────────────────────
//
// LINEAR THERMAL EXPANSION
// ΔL = α · L · ΔT    [mm]
//   α  = coefficient of linear thermal expansion [mm/m/°C = 10⁻³ m/m/°C]
//   L  = pipe run length between anchors [m]
//   ΔT = T_operating − T_installation [°C]
//
// U-LOOP LEG LENGTH (guided-cantilever beam model)
// Each arm of the U-loop acts as a guided cantilever absorbing δ = ΔL/2
// Bending stress at root: σ = 3·E·D_o·ΔL / (4·H²)
// Setting σ = S_a → H = √(3·E·D_o·ΔL / (4·S_a))
//
// (Conservative model uses ΔL not ΔL/2, giving H = √(3·E·D_o·ΔL / (2·S_a)))
// The calculator uses the conservative form.
//
// ANCHOR FORCE (fully restrained pipe — no expansion allowed)
// F = E · A_wall · α · ΔT
//   A_wall = π/4 · (D_o² − D_i²)   [m²]
//
// GUIDE SPACING (maximum distance between intermediate guides on each loop arm)
// L_guide = H / 4  (rule of thumb per B31.1 Commentary)

function calcThermalExpansion(
  alpha_mm_m_C: number,  // coefficient of linear thermal expansion
  L_m:          number,  // anchor-to-anchor pipe length [m]
  dT_C:         number,  // ΔT = T_op - T_install [°C]
  E_GPa:        number,  // Young's modulus [GPa]
  S_a_MPa:      number,  // allowable stress range [MPa]
  D_o_mm:       number,  // outside diameter [mm]
  D_i_mm:       number,  // inside diameter [mm]
  H_given_mm:   number | null, // optional user-provided loop leg [mm]
): {
  dL_mm: number;    // linear expansion
  H_req_mm: number; // required U-loop leg
  H_eff_mm: number; // effective H used (given or required)
  sigma_bend_MPa: number; // bending stress at H_eff
  sigma_margin: number;   // (S_a - sigma) / S_a
  F_anchor_kN: number;    // anchor force if fully restrained
  A_wall_m2: number;      // pipe wall cross-section
  guide_spacing_mm: number; // max guide spacing on loop arm
  ok: boolean;
} | null {
  if (!isFinite(alpha_mm_m_C) || !isFinite(L_m) || !isFinite(dT_C)) return null;
  if (!isFinite(E_GPa) || !isFinite(S_a_MPa) || !isFinite(D_o_mm) || !isFinite(D_i_mm)) return null;
  if (D_o_mm <= D_i_mm || D_o_mm <= 0 || L_m <= 0) return null;

  const alpha = alpha_mm_m_C * 1e-3;           // mm/m/°C → m/m/°C = 1/°C
  const dL_mm = alpha * 1000 * L_m * dT_C;     // mm
  const E_Pa  = E_GPa * 1e9;
  const S_Pa  = S_a_MPa * 1e6;
  const D_o   = D_o_mm / 1000;                  // m
  const D_i   = D_i_mm / 1000;

  if (dL_mm === 0) return null;

  const absDL = Math.abs(dL_mm) / 1000;         // m

  // ── U-loop leg (conservative guided-cantilever) ─────────────────────────────
  const H_req_m = Math.sqrt(3 * E_Pa * D_o * absDL / (2 * S_Pa));
  const H_req_mm = H_req_m * 1000;

  const H_eff_mm = H_given_mm !== null && H_given_mm > 0 ? H_given_mm : H_req_mm;
  const H_eff_m  = H_eff_mm / 1000;

  // Bending stress at effective H
  const sigma_Pa  = 3 * E_Pa * D_o * absDL / (2 * H_eff_m * H_eff_m);
  const sigma_MPa = sigma_Pa / 1e6;

  // ── Anchor force (fully restrained) ─────────────────────────────────────────
  const A_wall_m2 = Math.PI / 4 * (D_o * D_o - D_i * D_i);
  const F_anchor_N = E_Pa * A_wall_m2 * alpha * Math.abs(dT_C);
  const F_anchor_kN = F_anchor_N / 1000;

  // ── Guide spacing ────────────────────────────────────────────────────────────
  const guide_spacing_mm = H_eff_mm / 4;

  return {
    dL_mm,
    H_req_mm,
    H_eff_mm,
    sigma_bend_MPa: sigma_MPa,
    sigma_margin: (S_a_MPa - sigma_MPa) / S_a_MPa,
    F_anchor_kN,
    A_wall_m2,
    guide_spacing_mm,
    ok: sigma_MPa <= S_a_MPa,
  };
}

// ─── Material presets ─────────────────────────────────────────────────────────
const PIPE_MATERIALS = [
  { label: "Carbon steel (CS, A106B)",           alpha: 12.0, E: 200, Sa: 138,  note: "General process piping" },
  { label: "Low alloy steel (1.25Cr, A335 P11)", alpha: 12.5, E: 195, Sa: 138,  note: "Elevated temperature" },
  { label: "Alloy steel (2.25Cr, A335 P22)",     alpha: 12.5, E: 192, Sa: 138,  note: "High temperature" },
  { label: "Stainless steel 304/304L",           alpha: 17.2, E: 195, Sa: 172,  note: "Austenitic SS" },
  { label: "Stainless steel 316/316L",           alpha: 16.5, E: 193, Sa: 138,  note: "Austenitic SS, low-carbon" },
  { label: "Duplex SS (22Cr)",                   alpha: 13.5, E: 200, Sa: 207,  note: "Higher strength" },
  { label: "Copper (soft-annealed)",             alpha: 16.8, E: 120, Sa: 48,   note: "Plumbing / HVAC" },
  { label: "Aluminum alloy (6061-T6)",           alpha: 23.6, E: 70,  Sa: 55,   note: "Lightweight systems" },
  { label: "HDPE (PE100)",                       alpha: 200,  E: 0.9, Sa: 7.5,  note: "PE pipes — very high expansion!" },
  { label: "uPVC",                               alpha: 60,   E: 3.0, Sa: 14,   note: "Cold water/drainage" },
  { label: "CPVC",                               alpha: 65,   E: 2.7, Sa: 12,   note: "Hot water / chemical" },
  { label: "GRP / FRP (glass-reinforced)",       alpha: 20,   E: 28,  Sa: 55,   note: "Corrosive services" },
  { label: "Custom",                             alpha: NaN,  E: NaN, Sa: NaN,  note: "" },
];

// Standard pipe OD/ID (mm) from PIPE_SIZES in other calculators
const PIPE_DN_SIZES = [
  {dn:15, od:21.3, sch40t:2.77}, {dn:20, od:26.7, sch40t:2.87}, {dn:25, od:33.4, sch40t:3.38},
  {dn:32, od:42.2, sch40t:3.56}, {dn:40, od:48.3, sch40t:3.68}, {dn:50, od:60.3, sch40t:3.91},
  {dn:65, od:73.0, sch40t:5.16}, {dn:80, od:88.9, sch40t:5.49}, {dn:100, od:114.3, sch40t:6.02},
  {dn:125, od:141.3, sch40t:6.55}, {dn:150, od:168.3, sch40t:7.11}, {dn:200, od:219.1, sch40t:8.18},
  {dn:250, od:273.1, sch40t:9.27}, {dn:300, od:323.9, sch40t:9.53}, {dn:350, od:355.6, sch40t:9.53},
  {dn:400, od:406.4, sch40t:9.53}, {dn:450, od:457.2, sch40t:9.53}, {dn:500, od:508.0, sch40t:9.53},
  {dn:600, od:609.6, sch40t:9.53},
];

// ─── SVG Loop Schematic ───────────────────────────────────────────────────────
function LoopSchematic({ dL_mm, H_mm, loopType }: { dL_mm: number; H_mm: number; loopType: "U"|"L"|"Z" }) {
  const W = 500, H_SVG = 200;
  const cx = W / 2, cy = H_SVG - 40;

  if (loopType === "U") {
    const pipeLen = 80, loopH = 100, loopW = 60;
    const x1 = cx - 110, x2 = cx + 110;
    return (
      <svg viewBox={`0 0 ${W} ${H_SVG}`} className="w-full" style={{maxHeight:200}}>
        {/* Anchors */}
        <text x={x1} y={cy+15} textAnchor="middle" fontSize={9} fill="#6b7280">▲ Anchor</text>
        <text x={x2} y={cy+15} textAnchor="middle" fontSize={9} fill="#6b7280">▲ Anchor</text>
        {/* Pipe run left */}
        <line x1={x1} y1={cy} x2={x1+pipeLen} y2={cy} stroke="#374151" strokeWidth={5} strokeLinecap="round"/>
        {/* U-loop */}
        <path d={`M${x1+pipeLen},${cy} L${x1+pipeLen},${cy-loopH} L${x1+pipeLen+loopW},${cy-loopH} L${x1+pipeLen+loopW},${cy}`}
          fill="none" stroke="#2563eb" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"/>
        {/* Pipe run right */}
        <line x1={x1+pipeLen+loopW} y1={cy} x2={x2} y2={cy} stroke="#374151" strokeWidth={5} strokeLinecap="round"/>
        {/* Arrows for H */}
        <line x1={x1+pipeLen-18} y1={cy} x2={x1+pipeLen-18} y2={cy-loopH} stroke="#2563eb" strokeWidth={1} strokeDasharray="3 2"/>
        <text x={x1+pipeLen-24} y={cy-loopH/2} textAnchor="middle" fontSize={10} fill="#2563eb" transform={`rotate(-90,${x1+pipeLen-24},${cy-loopH/2})`}>H = {H_mm >= 1000 ? (H_mm/1000).toFixed(2)+"m" : H_mm.toFixed(0)+"mm"}</text>
        {/* Arrow for ΔL */}
        {dL_mm > 0 && (
          <g>
            <line x1={x1} y1={cy-25} x2={x1+20} y2={cy-25} stroke="#dc2626" strokeWidth={1.5} markerEnd="url(#arr)"/>
            <text x={x1+12} y={cy-30} fontSize={9} fill="#dc2626">ΔL={Math.abs(dL_mm).toFixed(1)}mm</text>
          </g>
        )}
        {dL_mm < 0 && (
          <g>
            <line x1={x2} y1={cy-25} x2={x2-20} y2={cy-25} stroke="#dc2626" strokeWidth={1.5}/>
            <text x={x2-35} y={cy-30} fontSize={9} fill="#dc2626">ΔL={Math.abs(dL_mm).toFixed(1)}mm</text>
          </g>
        )}
        {/* Width label */}
        <text x={x1+pipeLen+loopW/2} y={cy-loopH-12} textAnchor="middle" fontSize={9} fill="#6b7280">W ≈ H/2</text>
        <defs><marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><polygon points="0,0 6,3 0,6" fill="#dc2626"/></marker></defs>
      </svg>
    );
  }

  // L-loop schematic
  if (loopType === "L") {
    return (
      <svg viewBox={`0 0 ${W} ${H_SVG}`} className="w-full" style={{maxHeight:200}}>
        <text x={60} y={cy+15} textAnchor="middle" fontSize={9} fill="#6b7280">▲ Anchor</text>
        <text x={W-60} y={cy+15} textAnchor="middle" fontSize={9} fill="#6b7280">▲ Anchor</text>
        {/* Horizontal run */}
        <line x1={60} y1={cy} x2={220} y2={cy} stroke="#374151" strokeWidth={5} strokeLinecap="round"/>
        {/* L-bend leg down */}
        <line x1={220} y1={cy} x2={220} y2={cy-110} stroke="#2563eb" strokeWidth={5} strokeLinecap="round"/>
        {/* Horizontal return */}
        <line x1={220} y1={cy-110} x2={W-60} y2={cy-110} stroke="#2563eb" strokeWidth={5} strokeLinecap="round"/>
        {/* H dimension */}
        <text x={235} y={cy-55} fontSize={10} fill="#2563eb">H={H_mm >= 1000?(H_mm/1000).toFixed(2)+"m":H_mm.toFixed(0)+"mm"}</text>
        {/* ΔL arrow */}
        <text x={100} y={cy-18} fontSize={9} fill="#dc2626">→ ΔL={Math.abs(dL_mm).toFixed(1)}mm</text>
      </svg>
    );
  }

  // Z-loop
  return (
    <svg viewBox={`0 0 ${W} ${H_SVG}`} className="w-full" style={{maxHeight:200}}>
      <text x={60} y={cy+15} textAnchor="middle" fontSize={9} fill="#6b7280">▲ Anchor</text>
      <text x={W-60} y={cy+15} textAnchor="middle" fontSize={9} fill="#6b7280">▲ Anchor</text>
      <line x1={60} y1={cy} x2={180} y2={cy} stroke="#374151" strokeWidth={5} strokeLinecap="round"/>
      <line x1={180} y1={cy} x2={180} y2={cy-90} stroke="#2563eb" strokeWidth={5} strokeLinecap="round"/>
      <line x1={180} y1={cy-90} x2={W-60} y2={cy-90} stroke="#374151" strokeWidth={5} strokeLinecap="round"/>
      <text x={195} y={cy-45} fontSize={10} fill="#2563eb">H</text>
      <text x={100} y={cy-18} fontSize={9} fill="#dc2626">ΔL={Math.abs(dL_mm).toFixed(1)}mm</text>
    </svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number, dp = 2): string { return isFinite(n) && !isNaN(n) ? n.toFixed(dp) : "—"; }

const SEL = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";
const INP = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500";

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PipeThermalExpansionPage() {
  // Material
  const [matIdx,   setMatIdx]   = useState(0);
  const [cAlpha,   setCAlpha]   = useState("12.0");
  const [cE,       setCE]       = useState("200");
  const [cSa,      setCSa]      = useState("138");

  // Pipe dimensions
  const [dimMode,  setDimMode]  = useState<"dn"|"custom">("dn");
  const [dnIdx,    setDnIdx]    = useState(8);             // DN100 default
  const [cOD,      setCOD]      = useState("114.3");
  const [cWT,      setCWT]      = useState("6.02");

  // Temperature
  const [T_install, setTInstall] = useState("20");
  const [T_op,      setTOp]      = useState("200");
  const [tempUnit,  setTempUnit] = useState("°C");

  // Pipe run
  const [L_val,    setLVal]     = useState("");
  const [L_unit,   setLUnit]    = useState("m");

  // Loop geometry
  const [loopType, setLoopType] = useState<"U"|"L"|"Z">("U");
  const [H_given,  setHGiven]   = useState("");   // optional user H

  // Calculation mode: size loop or check stress for given H
  const [mode,     setMode]     = useState<"size"|"check">("size");

  // Direct ΔL input (alternative to pipe length + temperature)
  const [dLMode,   setDLMode]   = useState<"calc"|"direct">("calc");
  const [dLDirect, setDLDirect] = useState("");     // mm
  const [dLUnit,   setDLUnit]   = useState("mm");   // mm or in

  // Cold spring
  const [csEnabled,setCSEnabled]= useState(false);
  const [csPct,    setCsPct]    = useState("50");   // cold spring percentage

  const [copied, setCopied] = useState(false);

  // Derived material properties
  const mat   = PIPE_MATERIALS[matIdx];
  const alpha = isNaN(mat.alpha) ? parseFloat(cAlpha) : mat.alpha;
  const E     = isNaN(mat.E)     ? parseFloat(cE)     : mat.E;
  const Sa    = isNaN(mat.Sa)    ? parseFloat(cSa)    : mat.Sa;

  // Derived pipe dimensions
  const pipe   = PIPE_DN_SIZES[dnIdx];
  const D_o_mm = dimMode === "dn" ? pipe.od : parseFloat(cOD);
  const t_mm   = dimMode === "dn" ? pipe.sch40t : parseFloat(cWT);
  const D_i_mm = D_o_mm - 2 * t_mm;

  // Temperature difference
  const toC = (v: string) => tempUnit === "°F" ? (parseFloat(v)-32)*5/9 : parseFloat(v);
  const T1_C = toC(T_install), T2_C = toC(T_op);
  const dT_C = T2_C - T1_C;

  // Pipe length in metres
  const L_m = parseFloat(L_val) * (L_unit === "mm" ? 0.001 : L_unit === "ft" ? 0.3048 : 1);

  // H given (for check mode)
  const H_given_mm = mode === "check" && H_given ? parseFloat(H_given) : null;

  // Direct ΔL input converted to mm
  const dL_direct_mm = dLMode === "direct" ? parseFloat(dLDirect) * (dLUnit === "in" ? 25.4 : 1) : NaN;

  // Cold spring factor
  const csF = csEnabled ? (parseFloat(csPct) || 0) / 100 : 0;

  const result = useMemo(() => {
    if (!isFinite(alpha) || !isFinite(E) || !isFinite(Sa)) return null;
    if (!isFinite(D_o_mm) || D_o_mm <= 0 || !isFinite(t_mm) || t_mm <= 0) return null;

    if (dLMode === "direct") {
      // Use the directly entered ΔL — override L and ΔT
      if (!isFinite(dL_direct_mm) || dL_direct_mm === 0) return null;
      // Back-calculate a pseudo L and ΔT (set ΔT=1, L=ΔL/α to get the right ΔL)
      // Actually: just call calcThermalExpansion with L=1 and dT=ΔL_m/α
      const fakeL = 1;
      const fakeT = (dL_direct_mm / 1000) / (alpha * 1e-3 * fakeL);
      return calcThermalExpansion(alpha, fakeL, fakeT, E, Sa, D_o_mm, D_i_mm, H_given_mm);
    }

    if (!isFinite(L_m) || L_m <= 0) return null;
    if (!isFinite(dT_C) || dT_C === 0) return null;
    return calcThermalExpansion(alpha, L_m, dT_C, E, Sa, D_o_mm, D_i_mm, H_given_mm);
  }, [alpha, E, Sa, D_o_mm, D_i_mm, t_mm, L_m, dT_C, H_given_mm, dLMode, dL_direct_mm]);

  // Cold spring anchor force reduction
  const F_hot_kN  = result ? result.F_anchor_kN * (1 - csF) : 0;   // force at operating temp
  const F_cold_kN = result ? result.F_anchor_kN * csF : 0;          // pre-load at installation

  function copyResults() {
    if (!result) return;
    const pipeDesc = dimMode==="dn" ? `DN${pipe.dn} (OD ${pipe.od}mm)` : `${D_o_mm}mm OD`;
    const lines = [
      `Pipe Thermal Expansion — ${mat.label}`,
      dLMode === "direct"
        ? `Pipe: ${pipeDesc} · ΔL = ${fmt(Math.abs(result.dL_mm),1)} mm (direct input)`
        : `Pipe: ${pipeDesc} · ΔT = ${fmt(dT_C,1)} °C · L = ${L_val} ${L_unit}`,
      `ΔL = ${fmt(Math.abs(result.dL_mm),1)} mm (${fmt(Math.abs(result.dL_mm)/25.4,3)} inch)`,
      `${loopType}-loop leg H = ${fmt(result.H_req_mm,0)} mm = ${fmt(result.H_req_mm/1000,3)} m = ${fmt(result.H_req_mm/25.4,2)} inch`,
      `Bending stress σ = ${fmt(result.sigma_bend_MPa,1)} MPa · S_a = ${Sa} MPa · Margin = ${fmt(result.sigma_margin*100,1)}%`,
      `Anchor force (restrained): ${fmt(result.F_anchor_kN,1)} kN`,
      ...(csEnabled ? [`Cold spring ${csPct}%: hot force = ${fmt(F_hot_kN,1)} kN · cold pre-load = ${fmt(F_cold_kN,1)} kN`] : []),
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  }

  function downloadCSV() {
    if (!result) return;
    const pipeDesc = dimMode==="dn" ? `DN${pipe.dn} Sch.40` : "Custom";
    type Cell = string|number;
    const rows: Cell[][] = [];
    const p = (...c: Cell[]) => rows.push(c);
    p("Pipe Thermal Expansion — Fluids Pad");
    p("Material", mat.label); p("α (mm/m/°C)", alpha); p("E (GPa)", E); p("Sa (MPa)", Sa);
    p("Pipe", pipeDesc); p("OD (mm)", D_o_mm); p("Wall t (mm)", t_mm); p("ID (mm)", fmt(D_i_mm,1));
    p();
    p("INPUT","Value","Unit");
    if (dLMode === "direct") {
      p("ΔL (direct input)", dLDirect, dLUnit);
    } else {
      p("Installation temperature T₁", T_install, tempUnit);
      p("Operating temperature T₂", T_op, tempUnit);
      p("ΔT", fmt(dT_C,1), "°C");
      p("Pipe run length L", L_val, L_unit);
    }
    p();
    p("RESULT","Value","Unit");
    p("Thermal expansion ΔL", fmt(result.dL_mm,2), "mm");
    p("Thermal expansion ΔL", fmt(result.dL_mm/25.4,4), "inch");
    p("ΔL per metre of pipe", fmt(alpha*Math.abs(dLMode==="direct"?1:dT_C),3), "mm/m");
    p("Required loop leg H", fmt(result.H_req_mm,1), "mm");
    p("Required loop leg H", fmt(result.H_req_mm/1000,4), "m");
    p("Required loop leg H", fmt(result.H_req_mm/25.4,3), "inch");
    p("Loop width W ≈ H/2", fmt(result.H_eff_mm/2,0), "mm");
    p("Bending stress σ", fmt(result.sigma_bend_MPa,2), "MPa");
    p("Allowable stress Sa", Sa, "MPa");
    p("Stress margin", fmt(result.sigma_margin*100,1), "%");
    p("Guide spacing (max)", fmt(result.guide_spacing_mm,0), "mm");
    p("Pipe wall area A_wall", fmt(result.A_wall_m2*1e6,2), "mm²");
    p("Anchor force (fully restrained)", fmt(result.F_anchor_kN,2), "kN");
    if (csEnabled) {
      p("Cold spring", csPct, "%");
      p("Anchor force at operating temp (with CS)", fmt(F_hot_kN,2), "kN");
      p("Cold pre-load at installation", fmt(F_cold_kN,2), "kN");
    }
    p();
    p("Note","Loop leg H from conservative guided-cantilever beam: H = √(3·E·Do·ΔL / 2·Sa)");
    const csv = rows.map(r=>r.map(c=>`"${String(c)}"`).join(",")).join("\r\n");
    const blob = new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="pipe-thermal-expansion.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pipe Thermal Expansion</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ΔL = α·L·ΔT · U-loop / L-loop leg sizing · anchor force · guide spacing · bending stress check
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          <button onClick={copyResults} disabled={!result}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {copied ? <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Copied!</> : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</>}
          </button>
          <button onClick={downloadCSV} disabled={!result}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            CSV
          </button>
          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-300 dark:border-gray-600">
            <button onClick={()=>setMode("size")}
              className={`px-3 py-2 text-sm font-semibold transition-colors ${mode==="size"?"bg-orange-500 text-white":"bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
              Size loop
            </button>
            <button onClick={()=>setMode("check")}
              className={`px-3 py-2 text-sm font-semibold transition-colors ${mode==="check"?"bg-orange-500 text-white":"bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
              Check stress
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-5 items-start">

        {/* ══ SIDEBAR ══════════════════════════════════════════════════════ */}
        <aside className="w-80 flex-shrink-0 space-y-4 sticky top-20 max-h-[calc(100vh-7rem)] overflow-y-auto pb-4">

          {/* Material */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Pipe Material</p>
            <div className="space-y-3">
              <select value={matIdx} onChange={e=>setMatIdx(Number(e.target.value))} className={SEL}>
                {PIPE_MATERIALS.map((m,i)=><option key={i} value={i}>{m.label}</option>)}
              </select>
              {isNaN(mat.alpha) ? (
                <>
                  <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">α (mm/m/°C = ×10⁻³/°C)</p><input type="number" value={cAlpha} onChange={e=>setCAlpha(e.target.value)} step="any" className={INP}/></div>
                  <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">E — Young's modulus (GPa)</p><input type="number" value={cE} onChange={e=>setCE(e.target.value)} step="any" className={INP}/></div>
                  <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">S<sub>a</sub> — allowable stress range (MPa)</p><input type="number" value={cSa} onChange={e=>setCSa(e.target.value)} step="any" className={INP}/></div>
                </>
              ) : (
                <div className="grid grid-cols-3 gap-2 text-xs bg-gray-50 dark:bg-gray-700/40 rounded-xl px-3 py-2">
                  <div><p className="text-gray-400 dark:text-gray-500">α (mm/m/°C)</p><p className="font-bold text-gray-700 dark:text-gray-300">{mat.alpha}</p></div>
                  <div><p className="text-gray-400 dark:text-gray-500">E (GPa)</p><p className="font-bold text-gray-700 dark:text-gray-300">{mat.E}</p></div>
                  <div><p className="text-gray-400 dark:text-gray-500">S<sub>a</sub> (MPa)</p><p className="font-bold text-gray-700 dark:text-gray-300">{mat.Sa}</p></div>
                </div>
              )}
              {mat.note && <p className="text-[10px] text-gray-400 dark:text-gray-500">{mat.note}</p>}
            </div>
          </div>

          {/* Pipe dimensions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Pipe Dimensions</p>
            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 mb-3 text-xs">
              <button onClick={()=>setDimMode("dn")} className={`flex-1 py-1.5 font-semibold ${dimMode==="dn"?"bg-orange-500 text-white":"bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>DN / NPS</button>
              <button onClick={()=>setDimMode("custom")} className={`flex-1 py-1.5 font-semibold ${dimMode==="custom"?"bg-orange-500 text-white":"bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>Custom OD/WT</button>
            </div>
            {dimMode === "dn" ? (
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Nominal size (Schedule 40)</p>
                  <select value={dnIdx} onChange={e=>setDnIdx(Number(e.target.value))} className={SEL}>
                    {PIPE_DN_SIZES.map((p,i)=><option key={i} value={i}>DN{p.dn} — OD {p.od} mm, t {p.sch40t} mm</option>)}
                  </select>
                </div>
                <div className="flex gap-3 text-xs text-gray-400 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2">
                  <span>OD = {pipe.od} mm</span><span>·</span>
                  <span>ID = {(pipe.od - 2*pipe.sch40t).toFixed(1)} mm</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Outside diameter OD (mm)</p><input type="number" value={cOD} onChange={e=>setCOD(e.target.value)} className={INP}/></div>
                <div><p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Wall thickness WT (mm)</p><input type="number" value={cWT} onChange={e=>setCWT(e.target.value)} step="any" className={INP}/></div>
              </div>
            )}
          </div>

          {/* ΔL input mode */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Expansion Input</p>
            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 mb-3 text-xs">
              <button onClick={()=>setDLMode("calc")} className={`flex-1 py-1.5 font-semibold ${dLMode==="calc"?"bg-orange-500 text-white":"bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                From L &amp; ΔT
              </button>
              <button onClick={()=>setDLMode("direct")} className={`flex-1 py-1.5 font-semibold ${dLMode==="direct"?"bg-orange-500 text-white":"bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                Enter ΔL directly
              </button>
            </div>
            {dLMode === "direct" && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Expansion to absorb ΔL</p>
                <div className="flex gap-1.5">
                  <input type="number" value={dLDirect} onChange={e=>setDLDirect(e.target.value)}
                    placeholder="e.g. 45" className={`flex-1 ${INP}`}/>
                  <select value={dLUnit} onChange={e=>setDLUnit(e.target.value)}
                    className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option>mm</option><option>in</option>
                  </select>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">Enter the total expansion you need to accommodate. Pipe length and temperature inputs are not used.</p>
              </div>
            )}
          </div>

          {/* Temperature */}
          <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 ${dLMode==="direct"?"opacity-50 pointer-events-none":""}`}>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Temperature Conditions</p>
            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 mb-3 text-xs">
              <button onClick={()=>setTempUnit("°C")} className={`flex-1 py-1.5 font-semibold ${tempUnit==="°C"?"bg-orange-500 text-white":"bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>°C</button>
              <button onClick={()=>setTempUnit("°F")} className={`flex-1 py-1.5 font-semibold ${tempUnit==="°F"?"bg-orange-500 text-white":"bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>°F</button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Installation temperature ({tempUnit})</p>
                <input type="number" value={T_install} onChange={e=>setTInstall(e.target.value)} placeholder="20" className={INP}/>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Ambient temperature when pipe is installed / stress-free</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Operating temperature ({tempUnit})</p>
                <input type="number" value={T_op} onChange={e=>setTOp(e.target.value)} placeholder="200" className={INP}/>
              </div>
              {isFinite(dT_C) && (
                <div className={`px-3 py-2 rounded-xl text-xs font-semibold ${dT_C > 0 ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"}`}>
                  ΔT = {fmt(dT_C,1)} °C ({dT_C > 0 ? "heating — pipe expands" : "cooling — pipe contracts"})
                </div>
              )}
            </div>
          </div>

          {/* Pipe run */}
          <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 ${dLMode==="direct"?"opacity-50 pointer-events-none":""}`}>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Pipe Run</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Anchor-to-anchor length L</p>
                <div className="flex gap-1.5">
                  <input type="number" value={L_val} onChange={e=>setLVal(e.target.value)} placeholder="e.g. 50" className={`flex-1 ${INP}`}/>
                  <select value={L_unit} onChange={e=>setLUnit(e.target.value)} className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                    {["m","mm","ft"].map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Loop type</p>
                <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 text-xs">
                  {(["U","L","Z"] as const).map(t=>(
                    <button key={t} onClick={()=>setLoopType(t)}
                      className={`flex-1 py-1.5 font-bold ${loopType===t?"bg-orange-500 text-white":"bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                      {t}-loop
                    </button>
                  ))}
                </div>
              </div>
              {mode === "check" && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Actual loop leg H (mm) — to check stress</p>
                  <input type="number" value={H_given} onChange={e=>setHGiven(e.target.value)} placeholder="e.g. 2500" className={INP}/>
                </div>
              )}
            </div>
          </div>

          {/* Cold spring */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={csEnabled} onChange={e=>setCSEnabled(e.target.checked)} className="w-4 h-4 rounded accent-orange-500"/>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Cold spring (pre-stress)</p>
            </label>
            {csEnabled && (
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cold spring factor (%)</p>
                  <input type="number" value={csPct} onChange={e=>setCsPct(e.target.value)} min="0" max="100" placeholder="50" className={INP}/>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                  Loop fabricated short by CS% of ΔL. Reduces anchor force at operating temperature by CS%. Typical: 50%.
                </p>
                {result && (
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg px-3 py-2">
                      <p className="text-orange-500 dark:text-orange-400 text-[10px]">Hot anchor force (reduced)</p>
                      <p className="font-bold text-orange-700 dark:text-orange-300">{fmt(F_hot_kN,1)} kN</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                      <p className="text-blue-500 dark:text-blue-400 text-[10px]">Cold pre-load at install</p>
                      <p className="font-bold text-blue-700 dark:text-blue-300">{fmt(F_cold_kN,1)} kN</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </aside>

        {/* ══ RESULTS ══════════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Empty state */}
          {!result && (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7h16M4 7a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2M4 7V5a2 2 0 012-2h12a2 2 0 012 2v2"/>
              </svg>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Enter pipe material, dimensions, temperatures, and length</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Results update live</p>
            </div>
          )}

          {result && (
            <>
              {/* Stress check alert */}
              {mode === "check" && (
                <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl border ${result.ok ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"}`}>
                  <span className="text-xl">{result.ok ? "✓" : "⚠"}</span>
                  <div>
                    <p className={`text-sm font-bold ${result.ok ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                      {result.ok ? "Loop stress is within allowable limits" : "Loop stress EXCEEDS allowable — increase loop leg H"}
                    </p>
                    <p className={`text-xs mt-0.5 ${result.ok ? "text-green-600/80 dark:text-green-400/80" : "text-red-600/80 dark:text-red-400/80"}`}>
                      σ = {fmt(result.sigma_bend_MPa, 1)} MPa vs S_a = {fmt(Sa, 0)} MPa · Margin = {fmt(result.sigma_margin * 100, 1)}%
                    </p>
                  </div>
                </div>
              )}

              {/* Plastic material warning */}
              {mat.alpha > 50 && (
                <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300">
                  <span className="text-base">⚠</span>
                  <span>Plastic pipe (α = {mat.alpha} mm/m/°C) expands significantly. Expansion joints or frequent loops are typically required. Guide spacing should be kept very close. Consult manufacturer's guidelines.</span>
                </div>
              )}

              {/* Primary results */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800 p-4 sm:col-span-2">
                  <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1">Thermal expansion ΔL</p>
                  <p className="text-3xl font-black text-orange-700 dark:text-orange-300">
                    {fmt(Math.abs(result.dL_mm), 1)} <span className="text-base">mm</span>
                  </p>
                  <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-0.5">
                    {fmt(Math.abs(result.dL_mm)/1000, 4)} m · {fmt(Math.abs(result.dL_mm)/25.4, 3)} inch · {dT_C > 0 ? "expansion" : "contraction"}
                    {dLMode === "calc" && <> · {fmt(alpha * Math.abs(dT_C), 2)} mm/m</>}
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">{mode==="size" ? "Required loop leg H" : "Loop leg H (given)"}</p>
                  <p className="text-2xl font-black text-blue-700 dark:text-blue-300">
                    {fmt(result.H_eff_mm, 0)} <span className="text-sm">mm</span>
                  </p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">{fmt(result.H_eff_mm/1000, 3)} m · {fmt(result.H_eff_mm/25.4, 2)} inch</p>
                </div>
                <div className={`rounded-xl border p-4 ${result.ok ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"}`}>
                  <p className={`text-xs font-semibold mb-1 ${result.ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>Bending stress σ</p>
                  <p className={`text-2xl font-black ${result.ok ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                    {fmt(result.sigma_bend_MPa, 1)} <span className="text-sm">MPa</span>
                  </p>
                  <p className={`text-xs mt-0.5 ${result.ok ? "text-green-600/70 dark:text-green-400/70" : "text-red-600/70 dark:text-red-400/70"}`}>
                    {result.ok ? "✓" : "⚠"} S_a = {fmt(Sa,0)} MPa
                  </p>
                </div>
              </div>

              {/* Detail grid */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-1 self-stretch min-h-[2rem] rounded-full bg-orange-500 flex-shrink-0"/>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {loopType}-Loop Sizing — {mat.label.split("(")[0].trim()}
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {([
                    { label:"ΔL",                            value:`${fmt(Math.abs(result.dL_mm),2)} mm · ${fmt(Math.abs(result.dL_mm)/25.4,3)} in` },
                    { label:"α (mm/m/°C)",                   value:fmt(alpha, 4)               },
                    { label:"ΔT (°C)",                       value:fmt(dT_C, 1)                },
                    { label:"ΔL per metre",                  value:`${fmt(alpha*Math.abs(dT_C),2)} mm/m` },
                    ...(dLMode==="calc" ? [{ label:"L anchor-to-anchor (m)", value:fmt(L_m,2) }] : []),
                    { label:"OD (mm)",                       value:fmt(D_o_mm, 1)              },
                    { label:"ID (mm)",                       value:fmt(D_i_mm, 1)              },
                    { label:"Wall t (mm)",                   value:fmt(t_mm, 2)                },
                    { label:"Required loop leg H",           value:`${fmt(result.H_req_mm,0)} mm · ${fmt(result.H_req_mm/25.4,2)} in` },
                    { label:"Loop leg H (m)",                value:fmt(result.H_req_mm/1000,3) },
                    { label:"Bending stress σ (MPa)",        value:fmt(result.sigma_bend_MPa,2)},
                    { label:"Allowable S_a (MPa)",           value:fmt(Sa, 0)                  },
                    { label:"Stress margin",                 value:`${fmt(result.sigma_margin*100,1)} %` },
                    { label:"Loop width W ≈ H/2",            value:`${fmt(result.H_eff_mm/2,0)} mm · ${fmt(result.H_eff_mm/2/25.4,2)} in` },
                    { label:"Max guide spacing",             value:`${fmt(result.guide_spacing_mm,0)} mm · ${fmt(result.guide_spacing_mm/25.4,2)} in` },
                    { label:"Pipe wall area A_wall (mm²)",   value:fmt(result.A_wall_m2*1e6,1) },
                    { label:"Anchor force (restrained kN)",  value:fmt(result.F_anchor_kN,1)   },
                    { label:"E (GPa)",                       value:fmt(E, 0)                   },
                  ] as {label:string;value:string}[]).map(item=>(
                    <div key={item.label} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{item.label}</p>
                      <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Loop schematic */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">
                  {loopType}-Loop Schematic
                </h3>
                <LoopSchematic dL_mm={result.dL_mm} H_mm={result.H_eff_mm} loopType={loopType}/>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                  Schematic not to scale. Required leg H = {fmt(result.H_eff_mm,0)} mm · Loop width W ≈ {fmt(result.H_eff_mm/2,0)} mm.
                  Place intermediate guides at ≤ {fmt(result.guide_spacing_mm,0)} mm spacing on each loop arm.
                </p>
              </div>

              {/* Anchor force note */}
              <div className="bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Anchor Force — If Fully Restrained</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  If no expansion loop or joint is provided and the pipe is fully anchored at both ends, the thermal force generated in the pipe wall is:
                </p>
                <div className="flex items-center gap-4">
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 px-5 py-3">
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-0.5">Anchor force F</p>
                    <p className="text-2xl font-black text-red-700 dark:text-red-300">{fmt(result.F_anchor_kN, 1)} kN</p>
                    <p className="text-xs text-red-600/70 dark:text-red-400/70">{fmt(result.F_anchor_kN/1000, 3)} MN</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex-1">
                    F = E·A<sub>wall</sub>·α·ΔT = {fmt(E,0)}GPa × {fmt(result.A_wall_m2*1e6,1)}mm² × {fmt(alpha,1)}×10⁻³ × {fmt(Math.abs(dT_C),1)}°C.
                    This force acts on anchors, structural supports, and connected equipment. Provide an expansion loop to eliminate or reduce this force.
                  </p>
                </div>
              </div>

              {/* Cold spring results */}
              {csEnabled && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-800 p-5">
                  <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-3">Cold Spring — {csPct}%</h3>
                  <div className="grid sm:grid-cols-3 gap-3 mb-3">
                    <div className="bg-white/60 dark:bg-white/10 rounded-xl px-4 py-3">
                      <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mb-0.5">Install loop short by</p>
                      <p className="text-lg font-black text-indigo-700 dark:text-indigo-300">{fmt(Math.abs(result.dL_mm) * (parseFloat(csPct)||0)/100, 1)} mm</p>
                      <p className="text-[10px] text-indigo-500/70 dark:text-indigo-400/70">{fmt(Math.abs(result.dL_mm)*(parseFloat(csPct)||0)/100/25.4,3)} inch</p>
                    </div>
                    <div className="bg-white/60 dark:bg-white/10 rounded-xl px-4 py-3">
                      <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mb-0.5">Anchor force at operating temp</p>
                      <p className="text-lg font-black text-indigo-700 dark:text-indigo-300">{fmt(F_hot_kN, 1)} kN</p>
                      <p className="text-[10px] text-indigo-500/70 dark:text-indigo-400/70">vs {fmt(result.F_anchor_kN,1)} kN without CS</p>
                    </div>
                    <div className="bg-white/60 dark:bg-white/10 rounded-xl px-4 py-3">
                      <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mb-0.5">Cold pre-load at installation</p>
                      <p className="text-lg font-black text-indigo-700 dark:text-indigo-300">{fmt(F_cold_kN, 1)} kN</p>
                      <p className="text-[10px] text-indigo-500/70 dark:text-indigo-400/70">opposite direction to hot force</p>
                    </div>
                  </div>
                  <p className="text-xs text-indigo-700/70 dark:text-indigo-300/70">
                    Cold spring does NOT reduce the required loop leg H. The loop must still accommodate the full ΔL = {fmt(Math.abs(result.dL_mm),1)} mm.
                    It only reduces the anchor force at the design operating temperature. The loop must be fabricated {fmt(Math.abs(result.dL_mm)*(parseFloat(csPct)||0)/100,1)} mm shorter and stress-relieved into position during installation.
                  </p>
                </div>
              )}
            </>
          )}

          <References refs={REFS_PIPE_THERMAL_EXPANSION} />
        </div>
      </div>
    </div>
  );
}
