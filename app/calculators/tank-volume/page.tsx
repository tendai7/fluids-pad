"use client";

import React, { useState, useMemo } from "react";
import { References } from "@/components/References";
import { REFS_TANK_VOLUME } from "@/lib/references";

// ─── Physics ───────────────────────────────────────────────────────────────────

// ── Vertical tank — volume of bottom head at depth h from head vertex ──────────
function bottomConeVol(R: number, Hc: number, h: number)   { return (Math.PI / 3) * R * R * (h / Hc) ** 2 * h; }
function bottomHemiVol(R: number, h: number)               { return Math.PI * h * h * (R - h / 3); }  // spherical cap
function bottomEllipVol(R: number, He: number, h: number)  {
  // 2:1 or custom ellipsoidal: V = π·R²·(h²/He - h³/(3·He²))
  return Math.PI * R * R * (h * h / He - h * h * h / (3 * He * He));
}

// ── Vertical tank — total head volume ────────────────────────────────────────
function coneVol(R: number, Hc: number)   { return (Math.PI / 3) * R * R * Hc; }
function hemiVol(R: number)               { return (2 / 3) * Math.PI * R * R * R; }
// Half-ellipsoid with semi-axes a=b=R, c=He: V = (2/3)·π·R²·He
function ellipVol(R: number, He: number)  { return (2 / 3) * Math.PI * R * R * He; }

// ── Vertical tank — volume at liquid level h_total from the very bottom ─────
function verticalVolAt(
  h_total: number,
  R: number,
  botType: string, Hbot: number,   // bottom head type and height
  shellH: number,                  // cylindrical shell height
  topType: string, Htop: number,   // top head type and height
): number {
  let V = 0;
  let h = h_total;

  // 1. Bottom head region
  if (h > 0 && botType !== "flat") {
    const Hb = Hbot;
    const hb = Math.min(h, Hb);
    if (botType === "cone") V += bottomConeVol(R, Hb, hb);
    else if (botType === "hemi") V += bottomHemiVol(R, Math.min(hb, R));
    else if (botType === "ellip") V += bottomEllipVol(R, Hb, Math.min(hb, Hb));
    h -= Hb;
  }

  // 2. Cylindrical shell region
  if (h > 0) {
    const hs = Math.min(h, shellH);
    V += Math.PI * R * R * hs;
    h -= shellH;
  }

  // 3. Top head region (if any liquid)
  if (h > 0 && topType !== "open" && topType !== "flat") {
    const Ht = Htop;
    const ht = Math.min(h, Ht);
    if (topType === "hemi") {
      // Volume of liquid in top hemi-head = total head - the unfilled spherical cap from the crown
      V += hemiVol(R) - bottomHemiVol(R, R - Math.min(ht, R));
    } else if (topType === "ellip") {
      V += ellipVol(R, Ht) - bottomEllipVol(R, Ht, Ht - Math.min(ht, Ht));
    }
  }

  return Math.max(0, V);
}

// ── Horizontal tank — circular segment cross-sectional area ──────────────────
function horizSegArea(R: number, h: number): number {
  // Area of circular segment at depth h from bottom (radius R)
  if (h <= 0) return 0;
  if (h >= 2 * R) return Math.PI * R * R;
  const theta = Math.acos((R - h) / R);
  return R * R * theta - (R - h) * Math.sqrt(Math.max(0, 2 * R * h - h * h));
}

// ── Horizontal tank — partial fill volume including heads ─────────────────────
function horizontalVolAt(R: number, L: number, h: number, headType: string): number {
  // Cylinder body
  let V = horizSegArea(R, h) * L;

  // Two end heads (same type, same partial fill fraction)
  if (headType === "hemi") {
    // Each hemi head: V_hemi_partial = π/6 · h² · (3R − h)
    V += 2 * (Math.PI / 6) * h * h * (3 * R - h);
  } else if (headType === "ellip") {
    // 2:1 ellipsoidal: depth He = R/2; approx = 0.5 × hemi partial
    V += 2 * 0.5 * (Math.PI / 6) * h * h * (3 * R - h);
  }
  // flat heads: no additional volume

  return Math.max(0, V);
}

// ── Rectangular tank ─────────────────────────────────────────────────────────
function rectVolAt(L: number, W: number, h: number): number { return L * W * h; }

// ─── Surface area helpers (for insulation design) ────────────────────────────
function cylSurface(R: number, H: number)  { return 2 * Math.PI * R * H; }          // lateral only
function hemiSurface(R: number)            { return 2 * Math.PI * R * R; }          // curved surface only
function ellipSurface(R: number, He: number) {
  // Approximate for oblate spheroid: S ≈ 2π·R² · (1 + (He/R)² · atanh(e)/e) where e=eccentricity
  // Simpler approximation used in practice: S ≈ 1.15 × π·R² for standard 2:1 head
  const ratio = He / R;
  if (Math.abs(ratio - 0.5) < 0.05) return 1.15 * Math.PI * R * R;
  return 2 * Math.PI * R * R * ratio * 1.15;
}
function coneSurface(R: number, Hc: number) { return Math.PI * R * Math.sqrt(R * R + Hc * Hc); }

// ─── Unit conversions ─────────────────────────────────────────────────────────
const DIM_TO_M: Record<string, number> = { mm: 0.001, cm: 0.01, m: 1, ft: 0.3048, "in": 0.0254 };
const VOL_LABEL: Record<string, { factor: number; label: string }> = {
  "m³":      { factor: 1,        label: "m³" },
  "L":       { factor: 1000,     label: "L" },
  "US gal":  { factor: 264.172,  label: "US gal" },
  "UK gal":  { factor: 219.969,  label: "UK gal" },
  "bbl":     { factor: 6.28981,  label: "bbl (oil)" },
};

// ─── Fluid density presets ───────────────────────────────────────────────────
const FLUID_PRESETS = [
  { label: "Water (20 °C)",          rho: 998.2  },
  { label: "Seawater",               rho: 1025   },
  { label: "Diesel",                 rho: 840    },
  { label: "Petrol / Gasoline",      rho: 720    },
  { label: "Crude oil (light)",       rho: 870    },
  { label: "Ethanol",                rho: 789    },
  { label: "Sulphuric acid (98%)",   rho: 1840   },
  { label: "EG 50% antifreeze",      rho: 1049   },
  { label: "Custom (enter ρ below)", rho: NaN    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number, dp = 3): string { return isFinite(n) && !isNaN(n) ? n.toFixed(dp) : "—"; }
function fmtV(m3: number, unit: string, dp = 3): string {
  const { factor } = VOL_LABEL[unit] ?? { factor: 1 };
  return fmt(m3 * factor, dp);
}

// ─── Shared UI ─────────────────────────────────────────────────────────────────
const SEL = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const INP = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500";

type TankType   = "vertical" | "horizontal" | "rectangular";
type BotHead    = "flat" | "cone" | "hemi" | "ellip";
type TopHead    = "open" | "flat" | "hemi" | "ellip";
type HorizHead  = "flat" | "hemi" | "ellip";

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TankVolumePage() {
  // ── Type & units ──────────────────────────────────────────────────────────
  const [tankType,   setTankType]   = useState<TankType>("vertical");
  const [dimUnit,    setDimUnit]    = useState("mm");
  const [volUnit,    setVolUnit]    = useState("m³");

  // ── Vertical tank ─────────────────────────────────────────────────────────
  const [vDiam,      setVDiam]      = useState("");
  const [vShell,     setVShell]     = useState("");
  const [vBotHead,   setVBotHead]   = useState<BotHead>("flat");
  const [vBotHt,     setVBotHt]     = useState("");    // cone height or head depth
  const [vTopHead,   setVTopHead]   = useState<TopHead>("flat");
  const [vTopHt,     setVTopHt]     = useState("");

  // ── Horizontal tank ───────────────────────────────────────────────────────
  const [hDiam,      setHDiam]      = useState("");
  const [hLen,       setHLen]       = useState("");
  const [hHead,      setHHead]      = useState<HorizHead>("flat");

  // ── Rectangular tank ──────────────────────────────────────────────────────
  const [rLen,       setRLen]       = useState("");
  const [rWid,       setRWid]       = useState("");
  const [rHt,        setRHt]        = useState("");

  // ── Operating conditions ──────────────────────────────────────────────────
  const [levelStr,   setLevelStr]   = useState("");
  const [fluidIdx,   setFluidIdx]   = useState(0);
  const [customRho,  setCustomRho]  = useState("1000");
  const [fillRateStr,setFillRateStr]= useState("");
  const [fillUnit,   setFillUnit]   = useState("m³/h");
  const [strapStep,  setStrapStep]  = useState(5);     // strapping table % step
  const [copied,     setCopied]     = useState(false);

  // ── Derived ────────────────────────────────────────────────────────────────
  const k     = DIM_TO_M[dimUnit] ?? 0.001;   // dimension unit → m
  const fluidRho = isNaN(FLUID_PRESETS[fluidIdx].rho) ? parseFloat(customRho) : FLUID_PRESETS[fluidIdx].rho;

  // Convert fill rate to m³/h regardless of input unit
  const RATE_TO_M3H: Record<string, number> = {
    "m³/h": 1, "m³/d": 1/24, "L/h": 0.001, "L/min": 0.06, "L/s": 3.6, "GPM": 0.22712,
  };

  const result = useMemo(() => {
    const level    = parseFloat(levelStr) * k;
    const fillRate = parseFloat(fillRateStr) * (RATE_TO_M3H[fillUnit] ?? 1); // m³/h

    if (tankType === "vertical") {
      const R       = (parseFloat(vDiam) * k) / 2;
      const shellH  = parseFloat(vShell) * k;
      if (!isFinite(R) || R <= 0 || !isFinite(shellH) || shellH <= 0) return null;

      // Bottom head geometry
      const Hbot_raw = parseFloat(vBotHt) * k;
      const Hbot = vBotHead === "hemi"  ? R :
                   vBotHead === "ellip" ? (isFinite(Hbot_raw) && Hbot_raw > 0 ? Hbot_raw : R / 2) :
                   vBotHead === "cone"  ? (isFinite(Hbot_raw) && Hbot_raw > 0 ? Hbot_raw : R * 0.75) :
                   0;

      // Top head geometry
      const Htop_raw = parseFloat(vTopHt) * k;
      const Htop = vTopHead === "hemi"  ? R :
                   vTopHead === "ellip" ? (isFinite(Htop_raw) && Htop_raw > 0 ? Htop_raw : R / 2) :
                   0;

      // Total height of tank
      const totalH = Hbot + shellH + Htop;

      // Total capacity
      const Vbot   = vBotHead === "cone"  ? coneVol(R, Hbot) :
                     vBotHead === "hemi"  ? hemiVol(R) :
                     vBotHead === "ellip" ? ellipVol(R, Hbot) : 0;
      const Vshell = Math.PI * R * R * shellH;
      const Vtop   = vTopHead === "hemi"  ? hemiVol(R) :
                     vTopHead === "ellip" ? ellipVol(R, Htop) : 0;
      const Vtotal = Vbot + Vshell + Vtop;

      // Volume at operating level
      const h_clamped = Math.max(0, Math.min(level, totalH));
      const Vlevel = verticalVolAt(h_clamped, R, vBotHead, Hbot, shellH, vTopHead, Htop);

      // Surface area
      const SA_bot  = vBotHead === "hemi" ? hemiSurface(R) :
                      vBotHead === "ellip"? ellipSurface(R, Hbot) :
                      vBotHead === "cone" ? coneSurface(R, Hbot) :
                      Math.PI * R * R;
      const SA_top  = vTopHead === "hemi" ? hemiSurface(R) :
                      vTopHead === "ellip"? ellipSurface(R, Htop) :
                      Math.PI * R * R;
      const SA_shell = cylSurface(R, shellH);
      const SA_total = SA_bot + SA_shell + SA_top;

      // Strapping table
      const steps = Math.round(100 / strapStep); const LEVELS = Array.from({length: steps + 1}, (_, i) => Math.round(i * strapStep));
      const strap = LEVELS.map(pct => ({
        pct,
        h: (pct / 100) * totalH,
        V: verticalVolAt((pct / 100) * totalH, R, vBotHead, Hbot, shellH, vTopHead, Htop),
      }));

      return {
        Vtotal, Vlevel, totalH, fillRate,
        fillPct: Vtotal > 0 ? (Vlevel / Vtotal) * 100 : 0,
        ullage: Vtotal - Vlevel,
        contentsMass: isFinite(fluidRho) ? Vlevel * fluidRho : null,
        fillTime: isFinite(fillRate) && fillRate > 0 ? Vlevel / fillRate * 60 : null,
        SA_total,
        strap,
        geometry: { R, Hbot, shellH, Htop, D: R * 2 },
        levelM: h_clamped,
      };
    }

    if (tankType === "horizontal") {
      const R = (parseFloat(hDiam) * k) / 2;
      const L = parseFloat(hLen) * k;
      if (!isFinite(R) || R <= 0 || !isFinite(L) || L <= 0) return null;

      const Vtotal = horizontalVolAt(R, L, 2 * R, hHead);
      const h_clamped = Math.max(0, Math.min(level, 2 * R));
      const Vlevel = horizontalVolAt(R, L, h_clamped, hHead);

      // Total length including heads
      const headLen = hHead === "hemi" ? R : hHead === "ellip" ? R / 2 : 0;
      const totalLen = L + 2 * headLen;

      // Surface area (approx)
      const SA_cyl = cylSurface(R, L);
      const SA_heads = hHead === "hemi" ? 2 * hemiSurface(R) :
                       hHead === "ellip"? 2 * ellipSurface(R, R / 2) :
                       2 * Math.PI * R * R;
      const SA_total = SA_cyl + SA_heads;

      const steps = Math.round(100 / strapStep); const LEVELS = Array.from({length: steps + 1}, (_, i) => Math.round(i * strapStep));
      const strap = LEVELS.map(pct => ({
        pct,
        h: (pct / 100) * 2 * R,
        V: horizontalVolAt(R, L, (pct / 100) * 2 * R, hHead),
      }));

      return {
        Vtotal, Vlevel, totalH: 2 * R, fillRate,
        fillPct: Vtotal > 0 ? (Vlevel / Vtotal) * 100 : 0,
        ullage: Vtotal - Vlevel,
        contentsMass: isFinite(fluidRho) ? Vlevel * fluidRho : null,
        fillTime: isFinite(fillRate) && fillRate > 0 ? Vlevel / fillRate * 60 : null,
        SA_total,
        strap,
        geometry: { R, L, totalLen, D: R * 2 },
        levelM: h_clamped,
      };
    }

    if (tankType === "rectangular") {
      const Lm = parseFloat(rLen) * k;
      const Wm = parseFloat(rWid) * k;
      const Hm = parseFloat(rHt)  * k;
      if (!isFinite(Lm) || Lm <= 0 || !isFinite(Wm) || Wm <= 0 || !isFinite(Hm) || Hm <= 0) return null;

      const Vtotal = rectVolAt(Lm, Wm, Hm);
      const h_c = Math.max(0, Math.min(level, Hm));
      const Vlevel = rectVolAt(Lm, Wm, h_c);
      const SA_total = 2 * (Lm * Wm + Lm * Hm + Wm * Hm);

      const steps = Math.round(100 / strapStep); const LEVELS = Array.from({length: steps + 1}, (_, i) => Math.round(i * strapStep));
      const strap = LEVELS.map(pct => ({ pct, h: (pct / 100) * Hm, V: rectVolAt(Lm, Wm, (pct / 100) * Hm) }));

      return {
        Vtotal, Vlevel, totalH: Hm, fillRate,
        fillPct: Vtotal > 0 ? (Vlevel / Vtotal) * 100 : 0,
        ullage: Vtotal - Vlevel,
        contentsMass: isFinite(fluidRho) ? Vlevel * fluidRho : null,
        fillTime: isFinite(fillRate) && fillRate > 0 ? Vlevel / fillRate * 60 : null,
        SA_total,
        strap,
        geometry: { L: Lm, W: Wm, H: Hm },
        levelM: h_c,
      };
    }

    return null;
  }, [tankType, dimUnit, vDiam, vShell, vBotHead, vBotHt, vTopHead, vTopHt,
      hDiam, hLen, hHead, rLen, rWid, rHt, levelStr, fluidRho, fillRateStr, fillUnit, strapStep, k]);

  const vf = (m3: number, dp = 3) => fmtV(m3, volUnit, dp);
  const { label: volLabel } = VOL_LABEL[volUnit] ?? { label: "m³" };
  const factor = VOL_LABEL[volUnit]?.factor ?? 1;

  // ── Tank type description for display ─────────────────────────────────────
  const tankDesc = tankType === "vertical"
    ? `Vertical cylindrical · D=${vDiam}${dimUnit} · Shell H=${vShell}${dimUnit} · Bottom: ${vBotHead} · Top: ${vTopHead}`
    : tankType === "horizontal"
    ? `Horizontal cylindrical · D=${hDiam}${dimUnit} · L=${hLen}${dimUnit} · Heads: ${hHead}`
    : `Rectangular · ${rLen}×${rWid}×${rHt} ${dimUnit}`;

  // ── CSV export ────────────────────────────────────────────────────────────
  function downloadCSV() {
    if (!result) return;
    type Cell = string | number;
    const rows: Cell[][] = [];
    const p = (...c: Cell[]) => rows.push(c);
    p("Fluids Pad — Tank Volume Calculator");
    p("Tank type", tankDesc);
    p("Fluid", FLUID_PRESETS[fluidIdx].label + (isNaN(FLUID_PRESETS[fluidIdx].rho) ? ` (ρ = ${customRho} kg/m³)` : ""));
    p("Date", new Date().toLocaleDateString("en-GB", { day:"numeric",month:"long",year:"numeric" }));
    p();
    p("Parameter","Value","Unit");
    p("Total capacity", fmt(result.Vtotal,6), "m³");
    p("Total capacity", fmt(result.Vtotal*1000,3), "L");
    p("Total capacity", fmt(result.Vtotal*264.172,2), "US gal");
    p("Total capacity", fmt(result.Vtotal*219.969,2), "UK gal");
    p("Total capacity", fmt(result.Vtotal*6.28981,3), "bbl (oil)");
    p("Total height/depth", fmt(result.totalH/k,1), dimUnit);
    p("Surface area", fmt(result.SA_total,3), "m²");
    if (parseFloat(levelStr)>0) {
      p(); p("AT OPERATING LEVEL","","");
      p("Liquid level", levelStr, dimUnit);
      p("Volume at level", fmt(result.Vlevel,6), "m³");
      p("Volume at level", fmt(result.Vlevel*1000,2), "L");
      p("Fill percentage", fmt(result.fillPct,2), "%");
      p("Ullage", fmt(result.ullage,6), "m³");
      if (result.contentsMass!==null) {
        p("Contents mass", fmt(result.contentsMass,1), "kg");
        p("Contents mass", fmt(result.contentsMass/1000,3), "t");
      }
      if (result.fillTime!==null) {
        const t=result.fillTime;
        p("Fill time to level", t>=60?fmt(t/60,2):fmt(t,2), t>=60?"h":"min");
      }
    }
    p(); p("STRAPPING TABLE","","");
    p("Fill %", `Level (${dimUnit})`, "Volume (m³)", "Volume (L)", "Volume (US gal)", isFinite(fluidRho)?"Mass (kg)":"");
    result.strap.forEach(row => {
      p(row.pct+"%", fmt(row.h/k,0), fmt(row.V,4), fmt(row.V*1000,1), fmt(row.V*264.172,1),
        isFinite(fluidRho)?fmt(row.V*fluidRho,0):"");
    });
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const blob=new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download="tank-volume.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // ── Copy key results ──────────────────────────────────────────────────────
  function copyResults() {
    if (!result) return;
    const lines = [
      `Tank: ${tankDesc}`,
      `Total capacity: ${fmt(result.Vtotal*1000,1)} L (${fmt(result.Vtotal,4)} m³)`,
      ...(parseFloat(levelStr)>0 ? [
        `At level ${levelStr}${dimUnit}: ${fmt(result.Vlevel*1000,1)} L — ${fmt(result.fillPct,1)}% full`,
        `Ullage: ${fmt(result.ullage*1000,1)} L`,
        ...(result.contentsMass!==null?[`Contents: ${fmt(result.contentsMass/1000,2)} t`]:[]),
      ] : []),
      `Surface area: ${fmt(result.SA_total,2)} m²`,
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tank Volume Calculator</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Vertical · Horizontal · Rectangular — flat, cone, hemispherical &amp; ellipsoidal heads · Strapping table · Fill time
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={copyResults} disabled={!result}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {copied
              ? <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Copied!</>
              : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</>}
          </button>
          <button onClick={downloadCSV} disabled={!result}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV
          </button>
        </div>
      </div>

      {/* ── Type + unit bar ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {/* Tank type */}
        <div className="flex rounded-xl overflow-hidden border border-gray-300 dark:border-gray-600">
          {(["vertical","horizontal","rectangular"] as TankType[]).map(t => (
            <button key={t} onClick={() => setTankType(t)}
              className={`px-4 py-2 text-sm font-semibold capitalize transition-colors ${tankType === t ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">Dimensions:</span>
            <select value={dimUnit} onChange={e => setDimUnit(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {Object.keys(DIM_TO_M).map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">Volume:</span>
            <select value={volUnit} onChange={e => setVolUnit(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {Object.keys(VOL_LABEL).map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-5 items-start">

        {/* ══ SIDEBAR ══════════════════════════════════════════════════════════ */}
        <aside className="w-72 flex-shrink-0 space-y-4 sticky top-20 max-h-[calc(100vh-7rem)] overflow-y-auto pb-4">

          {/* Vertical tank inputs */}
          {tankType === "vertical" && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
              <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Vertical Cylindrical Tank</p>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Inside diameter ({dimUnit})</p>
                <input type="number" value={vDiam} onChange={e => setVDiam(e.target.value)} placeholder="e.g. 2000" className={INP}/>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Shell height ({dimUnit})</p>
                <input type="number" value={vShell} onChange={e => setVShell(e.target.value)} placeholder="e.g. 4000" className={INP}/>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Bottom head type</p>
                <select value={vBotHead} onChange={e => setVBotHead(e.target.value as BotHead)} className={SEL}>
                  <option value="flat">Flat (no sump)</option>
                  <option value="cone">Conical</option>
                  <option value="hemi">Hemispherical</option>
                  <option value="ellip">2:1 Ellipsoidal</option>
                </select>
              </div>
              {(vBotHead === "cone") && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cone height ({dimUnit})</p>
                  <input type="number" value={vBotHt} onChange={e => setVBotHt(e.target.value)} placeholder="e.g. 500" className={INP}/>
                </div>
              )}
              {vBotHead === "ellip" && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Head depth ({dimUnit}) — blank = D/4</p>
                  <input type="number" value={vBotHt} onChange={e => setVBotHt(e.target.value)} placeholder={`${dimUnit === "mm" ? "= D/4" : "= D/4"}`} className={INP}/>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Top head type</p>
                <select value={vTopHead} onChange={e => setVTopHead(e.target.value as TopHead)} className={SEL}>
                  <option value="open">Open top / flat cover</option>
                  <option value="flat">Flat closed</option>
                  <option value="hemi">Hemispherical</option>
                  <option value="ellip">2:1 Ellipsoidal</option>
                </select>
              </div>
              {vTopHead === "ellip" && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Top head depth ({dimUnit}) — blank = D/4</p>
                  <input type="number" value={vTopHt} onChange={e => setVTopHt(e.target.value)} placeholder="= D/4" className={INP}/>
                </div>
              )}
            </div>
          )}

          {/* Horizontal tank inputs */}
          {tankType === "horizontal" && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
              <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Horizontal Cylindrical Tank</p>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Inside diameter ({dimUnit})</p>
                <input type="number" value={hDiam} onChange={e => setHDiam(e.target.value)} placeholder="e.g. 1800" className={INP}/>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Shell length — tangent to tangent ({dimUnit})</p>
                <input type="number" value={hLen} onChange={e => setHLen(e.target.value)} placeholder="e.g. 6000" className={INP}/>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Head type (both ends)</p>
                <select value={hHead} onChange={e => setHHead(e.target.value as HorizHead)} className={SEL}>
                  <option value="flat">Flat</option>
                  <option value="hemi">Hemispherical</option>
                  <option value="ellip">2:1 Ellipsoidal</option>
                </select>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                Shell length is the straight-shell section only (tangent to tangent). Heads add to overall length.
              </p>
            </div>
          )}

          {/* Rectangular tank inputs */}
          {tankType === "rectangular" && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
              <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Rectangular Tank</p>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Length ({dimUnit})</p>
                <input type="number" value={rLen} onChange={e => setRLen(e.target.value)} placeholder="e.g. 3000" className={INP}/>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Width ({dimUnit})</p>
                <input type="number" value={rWid} onChange={e => setRWid(e.target.value)} placeholder="e.g. 2000" className={INP}/>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Height ({dimUnit})</p>
                <input type="number" value={rHt} onChange={e => setRHt(e.target.value)} placeholder="e.g. 1500" className={INP}/>
              </div>
            </div>
          )}

          {/* Operating conditions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Operating Conditions</p>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Liquid level ({dimUnit}) — from very bottom</p>
              <input type="number" value={levelStr} onChange={e => setLevelStr(e.target.value)}
                placeholder="e.g. 3500" className={INP}/>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fluid</p>
              <select value={fluidIdx} onChange={e => setFluidIdx(Number(e.target.value))} className={SEL}>
                {FLUID_PRESETS.map((f, i) => <option key={i} value={i}>{f.label}</option>)}
              </select>
            </div>
            {isNaN(FLUID_PRESETS[fluidIdx].rho) && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fluid density (kg/m³)</p>
                <input type="number" value={customRho} onChange={e => setCustomRho(e.target.value)} className={INP}/>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fill / drain rate — optional</p>
              <div className="flex gap-1.5">
                <input type="number" value={fillRateStr} onChange={e => setFillRateStr(e.target.value)}
                  placeholder="e.g. 50" className={`flex-1 ${INP}`}/>
                <select value={fillUnit} onChange={e => setFillUnit(e.target.value)}
                  className="w-24 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {["m³/h","m³/d","L/h","L/min","L/s","GPM"].map(u=><option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Strapping table step</p>
              <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                {[1, 5, 10].map(s => (
                  <button key={s} onClick={() => setStrapStep(s)}
                    className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${strapStep === s ? "bg-blue-500 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                    {s}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ══ RESULTS ══════════════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Empty state */}
          {!result && (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Enter tank dimensions to calculate</p>
            </div>
          )}

          {result && (
            <>
              {/* ── Tank geometry summary ─────────────────────────────────── */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 px-5 py-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    {tankType.charAt(0).toUpperCase() + tankType.slice(1)} Tank
                  </span>
                  <span className="text-xs text-blue-500/60 dark:text-blue-400/60">·</span>
                  <span className="text-xs text-blue-700 dark:text-blue-300 font-mono">{tankDesc.split(" · ").slice(1).join(" · ")}</span>
                  <span className="ml-auto text-xs text-blue-500/60 dark:text-blue-400/60">
                    Total height: <strong className="text-blue-700 dark:text-blue-300">{fmt(result.totalH / k, 1)} {dimUnit}</strong>
                    &nbsp;·&nbsp; Surface area: <strong className="text-blue-700 dark:text-blue-300">{fmt(result.SA_total, 2)} m²</strong>
                  </span>
                </div>
              </div>

              {/* ── Primary results chips ──────────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Total capacity</p>
                  <p className="text-xl font-black text-blue-700 dark:text-blue-300">{vf(result.Vtotal, 3)}</p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">{volLabel}</p>
                </div>

                {parseFloat(levelStr) > 0 && (
                  <>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4">
                      <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">Volume at level</p>
                      <p className="text-xl font-black text-green-700 dark:text-green-300">{vf(result.Vlevel, 3)}</p>
                      <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-0.5">{volLabel} · {fmt(result.fillPct, 1)} % full</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">Ullage (freeboard)</p>
                      <p className="text-xl font-black text-gray-900 dark:text-white">{vf(result.ullage, 3)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{volLabel}</p>
                    </div>
                    {result.contentsMass !== null && (
                      <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">Contents mass</p>
                        <p className="text-xl font-black text-gray-900 dark:text-white">{fmt(result.contentsMass / 1000, 2)} t</p>
                        <p className="text-xs text-gray-400 mt-0.5">{fmt(result.contentsMass, 0)} kg</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ── Secondary metrics ─────────────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Surface area</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{fmt(result.SA_total, 2)} m²</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total capacity</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                    {fmt(result.Vtotal * 1000, 1)} L · {fmt(result.Vtotal * 264.172, 1)} US gal
                  </p>
                </div>
                {result.fillTime !== null && parseFloat(levelStr) > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Fill time to level</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                      {result.fillTime >= 60 ? `${fmt(result.fillTime / 60, 1)} h` : `${fmt(result.fillTime, 1)} min`}
                    </p>
                  </div>
                )}
                {result.fillTime !== null && (
                  <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Fill to 100% (full tank)</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                      {(() => { const t = result.Vtotal / parseFloat(fillRateStr) * 60; return t >= 60 ? `${fmt(t/60,1)} h` : `${fmt(t,1)} min`; })()}
                    </p>
                  </div>
                )}
              </div>

              {/* ── Fill level bar ────────────────────────────────────────── */}
              {parseFloat(levelStr) > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Fill level</p>
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{fmt(result.fillPct, 1)} %</p>
                  </div>
                  <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-6 rounded-full transition-all duration-500 ${
                        result.fillPct > 90 ? "bg-red-500" :
                        result.fillPct > 75 ? "bg-amber-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${Math.min(100, result.fillPct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    <span>Empty</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>Full</span>
                  </div>
                </div>
              )}

              {/* ── Strapping table ───────────────────────────────────────── */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Strapping Table</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Volume at each fill level — for gauge calibration and alarm setpoints</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b-2 border-gray-200 dark:border-gray-700">
                        <th className="text-right pb-2 pr-3">Fill %</th>
                        <th className="text-right pb-2 pr-3">Level ({dimUnit})</th>
                        <th className="text-right pb-2 pr-3">Volume ({volLabel})</th>
                        <th className="text-right pb-2 pr-3">Volume (m³)</th>
                        {isFinite(fluidRho) && <th className="text-right pb-2">Mass (kg)</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {result.strap.map(row => {
                        const isLevel = parseFloat(levelStr) > 0 &&
                          Math.abs(row.h - result.levelM) < result.totalH * 0.03;
                        return (
                          <tr key={row.pct}
                            className={`border-b border-gray-100 dark:border-gray-700/50 last:border-0 ${isLevel ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700/30"}`}>
                            <td className={`py-1.5 pr-3 text-right font-bold ${isLevel ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}>
                              {row.pct}%
                            </td>
                            <td className="py-1.5 pr-3 text-right font-mono text-gray-600 dark:text-gray-400">
                              {fmt(row.h / k, 0)}
                            </td>
                            <td className={`py-1.5 pr-3 text-right font-mono font-semibold ${isLevel ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}>
                              {fmtV(row.V, volUnit, 3)}
                            </td>
                            <td className="py-1.5 pr-3 text-right font-mono text-gray-500 dark:text-gray-400">
                              {fmt(row.V, 4)}
                            </td>
                            {isFinite(fluidRho) && (
                              <td className="py-1.5 text-right font-mono text-gray-500 dark:text-gray-400">
                                {fmt(row.V * fluidRho, 0)}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── All volume units ──────────────────────────────────────── */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">Total Capacity — All Units</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(VOL_LABEL).map(([unit, { factor: f, label }]) => (
                    <div key={unit} className={`rounded-xl border px-4 py-3 ${unit === volUnit ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" : "bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-600"}`}>
                      <p className={`text-xs font-semibold mb-0.5 ${unit === volUnit ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`}>
                        {label}
                      </p>
                      <p className={`text-lg font-black ${unit === volUnit ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-white"}`}>
                        {fmt(result.Vtotal * f, unit === "m³" ? 4 : unit === "L" ? 1 : 2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <References refs={REFS_TANK_VOLUME} />
    </div>
  );
}