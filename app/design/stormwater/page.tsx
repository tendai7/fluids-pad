"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { References } from "@/components/References";
import { REFS_STORMWATER } from "@/lib/references";

// jsPDF-autotable does not export its extended type, so we use this alias.
type JsPDFWithAutoTable = { lastAutoTable: { finalY: number } };

// ─── Physics ───────────────────────────────────────────────────────────────────
// Rational Method (SANRAL Drainage Manual, 5th Ed.)
// Q = C · i · A / 360   [Q m³/s, i mm/h, A ha]
function rationalQ(C: number, i_mmh: number, A_ha: number): number {
  return (C * i_mmh * A_ha) / 360;
}

// Kirpich formula — time of concentration (minutes)
// tc = 0.0195 × L^0.77 × S^(-0.385)
// L = flow-path length (m), S = slope (m/m)
function kirpich(L_m: number, S_mm: number): number {
  if (L_m <= 0 || S_mm <= 0) return NaN;
  return 0.0195 * Math.pow(L_m, 0.77) * Math.pow(S_mm, -0.385);
}

// Manning's equation — full-pipe capacity (m³/s)
// Q = (1/n) · A · R^(2/3) · S^(1/2)
// Circular pipe full: A = πD²/4, R = D/4
function manningsFullQ(D_m: number, S_mm: number, n: number): number {
  if (D_m <= 0 || S_mm <= 0 || n <= 0) return 0;
  const A = Math.PI * D_m * D_m / 4;
  const R = D_m / 4;
  return (1 / n) * A * Math.pow(R, 2 / 3) * Math.pow(S_mm, 0.5);
}

// Required minimum diameter from Q and S (m)
// D = (4·n·Q / (π · (1/4)^(2/3) · S^(1/2)))^(3/8)
// Simplified: D = (4.637 · n · Q / S^(1/2))^(3/8)
function requiredDiameter(Q_m3s: number, S_mm: number, n: number): number {
  if (Q_m3s <= 0 || S_mm <= 0 || n <= 0) return 0;
  const C = 4 * n * Math.pow(4, 2 / 3) / Math.PI; // ≈ 3.208
  return Math.pow((C * Q_m3s) / Math.pow(S_mm, 0.5), 3 / 8);
}

// Full-pipe velocity (m/s)
function fullPipeVelocity(D_m: number, S_mm: number, n: number): number {
  const A = Math.PI * D_m * D_m / 4;
  return A > 0 ? manningsFullQ(D_m, S_mm, n) / A : 0;
}

// d/D ratio at partial flow Q using bisection
function flowDepthRatio(Q_design: number, Q_full: number): number {
  if (Q_full <= 0) return NaN;
  const ratio = Q_design / Q_full;
  if (ratio >= 1) return 1;
  if (ratio <= 0) return 0;
  // Q/Q_full = f(d/D) via partial-flow Manning's — numerical solve
  // phi = 2·arccos(1 - 2·(d/D)), Q/Q_full = (phi - sin(phi))^(5/3) / (2π · phi^(2/3))
  // Bisect on d/D ∈ [0, 1]
  let lo = 0, hi = 1;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    const phi = 2 * Math.acos(1 - 2 * mid);
    const q  = Math.pow(phi - Math.sin(phi), 5 / 3) / (Math.pow(2 * Math.PI, 2 / 3) * Math.pow(phi, 2 / 3));
    if (q < ratio) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// IDF interpolation — linear on duration, log-linear on return period
function idfIntensity(
  table: Record<number, number[]>,   // {T_yr: [i_10, i_20, i_30, i_60, i_120]}
  T_yr: number,
  tc_min: number,
): number {
  const durations = [10, 20, 30, 60, 120];
  const Ts = Object.keys(table).map(Number).sort((a, b) => a - b);

  // Interpolate over return period (log-linear)
  function intensityAtT(T: number): number[] {
    if (T <= Ts[0]) return table[Ts[0]];
    if (T >= Ts[Ts.length - 1]) return table[Ts[Ts.length - 1]];
    for (let i = 0; i < Ts.length - 1; i++) {
      if (T >= Ts[i] && T <= Ts[i + 1]) {
        const f = Math.log(T / Ts[i]) / Math.log(Ts[i + 1] / Ts[i]);
        return durations.map((_, j) => table[Ts[i]][j] + f * (table[Ts[i + 1]][j] - table[Ts[i]][j]));
      }
    }
    return table[Ts[Ts.length - 1]];
  }

  const row = intensityAtT(T_yr);
  // Interpolate over duration (linear in log-log of duration)
  const tc = Math.max(durations[0], Math.min(durations[durations.length - 1], tc_min));
  for (let j = 0; j < durations.length - 1; j++) {
    if (tc >= durations[j] && tc <= durations[j + 1]) {
      const f = (tc - durations[j]) / (durations[j + 1] - durations[j]);
      return row[j] + f * (row[j + 1] - row[j]);
    }
  }
  return row[0]; // tc < 10 min → use 10-min value (conservative)
}

// ─── SA IDF Data (SANRAL Drainage Manual 5th Ed. / WRC representative values) ─
// Format: { return_period_yr: [i_10min, i_20min, i_30min, i_60min, i_120min] } (mm/h)
const IDF_DATA: Record<string, { name: string; region: string; idf: Record<number, number[]> }> = {
  JHB: {
    name: "Johannesburg / Pretoria",
    region: "Highveld",
    idf: {
       2: [72, 51, 40, 26, 17],
       5: [87, 63, 49, 33, 21],
      10: [98, 72, 56, 37, 24],
      20: [109, 80, 63, 42, 27],
      25: [113, 83, 65, 43, 28],
      50: [124, 92, 72, 48, 31],
     100: [136,101, 79, 53, 34],
    },
  },
  CPT: {
    name: "Cape Town",
    region: "Western Cape",
    idf: {
       2: [45, 32, 26, 17, 11],
       5: [60, 43, 35, 23, 15],
      10: [71, 51, 42, 28, 18],
      20: [82, 59, 48, 32, 21],
      25: [85, 62, 50, 33, 22],
      50: [95, 69, 56, 38, 25],
     100: [105, 76, 62, 42, 27],
    },
  },
  DBN: {
    name: "Durban / eThekwini",
    region: "KZN Coast",
    idf: {
       2: [88, 63, 50, 34, 22],
       5: [110, 79, 63, 43, 28],
      10: [126, 91, 73, 49, 32],
      20: [141,102, 81, 55, 36],
      25: [146, 105, 84, 57, 37],
      50: [161,116, 93, 63, 41],
     100: [177,128,102, 69, 45],
    },
  },
  PLZ: {
    name: "Gqeberha / Port Elizabeth",
    region: "Eastern Cape",
    idf: {
       2: [50, 36, 29, 19, 12],
       5: [65, 47, 38, 25, 16],
      10: [76, 55, 44, 29, 19],
      20: [87, 63, 51, 34, 22],
      25: [90, 65, 53, 35, 23],
      50: [101, 73, 59, 39, 25],
     100: [112, 81, 65, 43, 28],
    },
  },
  BFN: {
    name: "Bloemfontein",
    region: "Free State / Karoo",
    idf: {
       2: [60, 43, 34, 23, 15],
       5: [76, 55, 44, 29, 19],
      10: [88, 64, 51, 34, 22],
      20: [99, 72, 57, 38, 25],
      25: [103, 75, 59, 39, 26],
      50: [114, 83, 66, 44, 29],
     100: [125, 91, 73, 49, 32],
    },
  },
  ELS: {
    name: "East London",
    region: "Eastern Cape Coast",
    idf: {
       2: [75, 54, 43, 29, 19],
       5: [94, 68, 54, 36, 23],
      10: [109, 79, 63, 42, 27],
      20: [122, 88, 70, 47, 31],
      25: [126, 91, 73, 49, 32],
      50: [139,101, 81, 54, 35],
     100: [153,111, 89, 60, 39],
    },
  },
  PMB: {
    name: "Pietermaritzburg",
    region: "KZN Midlands",
    idf: {
       2: [78, 57, 45, 31, 20],
       5: [98, 71, 57, 38, 25],
      10: [113, 82, 66, 44, 29],
      20: [127, 92, 74, 50, 32],
      25: [131, 95, 77, 52, 33],
      50: [145,105, 84, 57, 37],
     100: [159,116, 93, 63, 41],
    },
  },
  NLS: {
    name: "Nelspruit / Mbombela",
    region: "Lowveld",
    idf: {
       2: [80, 58, 46, 31, 20],
       5: [100, 73, 58, 39, 25],
      10: [115, 84, 67, 45, 29],
      20: [129, 94, 75, 50, 33],
      25: [134, 97, 78, 52, 34],
      50: [148,108, 86, 58, 38],
     100: [163,119, 95, 64, 42],
    },
  },
  CUSTOM: {
    name: "Manual entry",
    region: "Custom",
    idf: {},
  },
};

// ─── Runoff coefficient presets (SANRAL / ASCE) ───────────────────────────────
const C_PRESETS = [
  { label: "Commercial / CBD (70–90 % impervious)", C: 0.80 },
  { label: "Industrial estate",                     C: 0.70 },
  { label: "Residential — high density (< 20 % open)", C: 0.70 },
  { label: "Residential — medium density (50 % open)", C: 0.50 },
  { label: "Residential — low density (80 % open)",    C: 0.35 },
  { label: "Rooftops / hardstanding / paving",    C: 0.90 },
  { label: "Tarred roads and carparks",            C: 0.80 },
  { label: "Gravel roads",                         C: 0.50 },
  { label: "Parks, sports fields, lawns",          C: 0.20 },
  { label: "Agricultural — cultivated",            C: 0.30 },
  { label: "Natural veld / bush",                  C: 0.12 },
  { label: "Mixed catchment (typical suburban)",   C: 0.55 },
  { label: "Custom (enter C below)",               C: NaN  },
];

// ─── Standard SA concrete pipe sizes (SANS 677 / SABS 677) ───────────────────
const PIPE_SIZES_MM = [300, 375, 450, 525, 600, 675, 750, 825, 900, 975, 1050, 1125, 1200, 1350, 1500, 1800];

// ─── Manning's n by pipe material ─────────────────────────────────────────────
const PIPE_MATERIALS = [
  { label: "Precast concrete (smooth)",   n: 0.013 },
  { label: "Precast concrete (typical)",  n: 0.015 },
  { label: "Vitrified clay pipe (VCP)",   n: 0.013 },
  { label: "HDPE smooth bore",            n: 0.010 },
  { label: "uPVC smooth",                 n: 0.011 },
  { label: "Corrugated HDPE / steel",     n: 0.024 },
  { label: "Brick / masonry channel",     n: 0.017 },
];

// ─── Return periods ───────────────────────────────────────────────────────────
const RETURN_PERIODS = [2, 5, 10, 20, 25, 50, 100];

// ─── Indicative concrete pipe cost (ZAR/m, supply only, Class 50D, Q2 2025) ──
const PIPE_COST_ZAR: Partial<Record<number, number>> = {
  300:  280,  375:  350,  450:  450,  525:  570,  600:  720,
  675:  900,  750: 1100,  825: 1320,  900: 1580,  975: 1900,
  1050: 2250, 1125: 2680, 1200: 3100, 1350: 4200, 1500: 5600, 1800: 9000,
};

// ─── Shared UI ─────────────────────────────────────────────────────────────────
const SEL = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";
const INP = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500";

function fmt(n: number, dp = 2): string { return isFinite(n) ? n.toFixed(dp) : "—"; }
function sig(n: number, s = 4): string  { return isFinite(n) ? parseFloat(n.toPrecision(s)).toString() : "—"; }

// Subscript helper
function Lbl({ children }: { children: string }): React.ReactElement {
  const parts = children.split(/(_[^_\s()]+)/g);
  return (
    <>{parts.map((p, i) =>
      p.startsWith("_")
        ? <sub key={i} className="text-[0.72em]">{p.slice(1)}</sub>
        : <React.Fragment key={i}>{p}</React.Fragment>
    )}</>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 ${className}`}>{children}</div>;
}
function SideLabel({ n, children }: { n: number | string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-5 h-5 rounded-md bg-sky-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">{n}</span>
      <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{children}</span>
    </div>
  );
}
function SecHead({ title, sub, accent = "sky" }: { title: string; sub?: string; accent?: string }) {
  const bars: Record<string, string> = {
    sky: "bg-sky-500", blue: "bg-blue-500", green: "bg-green-500",
    amber: "bg-amber-500", gray: "bg-gray-400 dark:bg-gray-500", red: "bg-red-500",
  };
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className={`w-1 self-stretch min-h-[2rem] rounded-full flex-shrink-0 ${bars[accent] ?? bars.sky}`} />
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
        {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function StormwaterPage() {
  // ── Catchment ──────────────────────────────────────────────────────────────
  const [areaHa,     setAreaHa]     = useState("");
  const [cPresetIdx, setCPresetIdx] = useState(3);  // residential medium
  const [customC,    setCustomC]    = useState("0.55");
  const [projectName,setProjectName]= useState("");
  const [tagNo,      setTagNo]      = useState("");

  // ── Time of concentration ──────────────────────────────────────────────────
  const [tcMode,     setTcMode]     = useState<"kirpich" | "manual">("kirpich");
  const [flowLen,    setFlowLen]    = useState("");  // m (Kirpich)
  const [slopeKirp, setSlopeKirp]  = useState("");  // m/m (Kirpich)
  const [tcManual,   setTcManual]   = useState("");  // minutes (manual)

  // ── Rainfall ───────────────────────────────────────────────────────────────
  const [cityKey,    setCityKey]    = useState("JHB");
  const [returnPer,  setReturnPer]  = useState(10);  // years
  const [manualI,    setManualI]    = useState("");   // mm/h (custom city)

  // ── Weighted C (mixed catchments) ──────────────────────────────────────────
  const [useWeighted, setUseWeighted] = useState(false);
  const [subCatch, setSubCatch]       = useState([{ A: "", C: "" }, { A: "", C: "" }]);

  // ── Pipe design ────────────────────────────────────────────────────────────
  const [slopePipe,  setSlopePipe]  = useState("");  // m/m
  const [matIdx,     setMatIdx]     = useState(0);
  const [pipeLen,    setPipeLen]    = useState("");   // m — for cost
  const [minVel,     setMinVel]     = useState("0.6");
  const [maxVel,     setMaxVel]     = useState("3.0");
  const [copied,     setCopied]     = useState(false);

  // ── Derived ────────────────────────────────────────────────────────────────
  // Weighted average C and total area from sub-catchments (when useWeighted)
  const { weightedC, totalAreaHa } = useMemo(() => {
    if (!useWeighted) {
      return {
        weightedC: isNaN(C_PRESETS[cPresetIdx].C) ? parseFloat(customC) : C_PRESETS[cPresetIdx].C,
        totalAreaHa: parseFloat(areaHa),
      };
    }
    let sumAC = 0, sumA = 0;
    subCatch.forEach(sc => {
      const a = parseFloat(sc.A) || 0;
      const c = parseFloat(sc.C) || 0;
      if (a > 0 && c > 0) { sumAC += a * c; sumA += a; }
    });
    return { weightedC: sumA > 0 ? sumAC / sumA : NaN, totalAreaHa: sumA };
  }, [useWeighted, subCatch, cPresetIdx, customC, areaHa]);

  const effC = weightedC;
  const effA = totalAreaHa;

  const tc_raw = useMemo(() => {
    if (tcMode === "manual") return parseFloat(tcManual);
    const L = parseFloat(flowLen);
    const S = parseFloat(slopeKirp);
    return kirpich(L, S);
  }, [tcMode, flowLen, slopeKirp, tcManual]);

  // Enforce 5-minute urban minimum (SANRAL standard)
  const TC_MIN_URBAN = 5;
  const tc_min = isFinite(tc_raw) ? Math.max(TC_MIN_URBAN, tc_raw) : tc_raw;
  const tc_capped = isFinite(tc_raw) && tc_raw < TC_MIN_URBAN;

  const city = IDF_DATA[cityKey];
  const i_mmh = useMemo(() => {
    if (cityKey === "CUSTOM") return parseFloat(manualI);
    if (!isFinite(tc_min) || tc_min <= 0) return NaN;
    return idfIntensity(city.idf, returnPer, tc_min);
  }, [cityKey, city, returnPer, tc_min, manualI]);

  const result = useMemo(() => {
    const A  = effA;
    const i  = i_mmh;
    const n  = PIPE_MATERIALS[matIdx].n;
    const Sp = parseFloat(slopePipe);
    const vMin = parseFloat(minVel) || 0.6;
    const vMax = parseFloat(maxVel) || 3.0;
    const L   = parseFloat(pipeLen) || 0;

    if (!isFinite(A) || A <= 0 || !isFinite(effC) || !isFinite(i) || i <= 0) return null;

    const Q = rationalQ(effC, i, A); // m³/s
    if (!isFinite(Q) || Q <= 0) return null;

    if (!isFinite(Sp) || Sp <= 0) {
      return { Q, Qls: Q * 1000, tc: tc_min, i, pipeRows: null };
    }

    // Required minimum diameter
    const Dreq = requiredDiameter(Q, Sp, n); // m

    // Standard pipe rows
    const pipeRows = PIPE_SIZES_MM.map(dMm => {
      const D      = dMm / 1000;
      const Qfull  = manningsFullQ(D, Sp, n);
      const Vfull  = fullPipeVelocity(D, Sp, n);
      const dD     = flowDepthRatio(Q, Qfull);
      const pass   = Qfull >= Q && Vfull >= vMin && Vfull <= vMax;
      const velOk  = Vfull >= vMin && Vfull <= vMax;
      return { dMm, D, Qfull, Vfull, dD, pass, velOk };
    });

    const recommended = pipeRows.find(r => r.pass) ?? null;

    // Pipe cost
    const unitCost = recommended ? (PIPE_COST_ZAR[recommended.dMm] ?? null) : null;
    const totalCost = unitCost !== null && L > 0 ? unitCost * L : null;

    return { Q, Qls: Q * 1000, tc: tc_min, i, A, Dreq: Dreq * 1000, pipeRows, recommended, unitCost, totalCost, L };
  }, [effA, effC, i_mmh, tc_min, slopePipe, matIdx, minVel, maxVel, pipeLen]);

  // ── PDF export ─────────────────────────────────────────────────────────────
  async function downloadPDF() {
    if (!result) return;
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const PW = 210, PH = 297, M = 14, CW = PW - 2 * M;
    type C = [number, number, number];
    const SKY:  C = [14, 116, 144];
    const DARK: C = [17, 24, 39];
    const MID:  C = [75, 85, 99];
    const LGRAY:C = [248, 250, 252];
    const WHITE:C = [255, 255, 255];
    const fc = (c: C) => doc.setFillColor(c[0], c[1], c[2]);
    const tc2 = (c: C) => doc.setTextColor(c[0], c[1], c[2]);

    fc(SKY); doc.rect(0, 0, PW, 36, "F");
    tc2(WHITE); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.text(projectName || "Stormwater Drainage Design", M, 14);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text("Rational Method — SANRAL Drainage Manual · Fluids Pad", M, 22);
    const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    doc.text(dateStr, PW - M, 22, { align: "right" });
    if (tagNo) doc.text(`Ref: ${tagNo}`, M, 29);

    let y = 42;
    function section(title: string, rows: [string, string, string][]) {
      autoTable(doc, {
        head: [[{ content: title, colSpan: 3 }]],
        body: rows.filter(r => r[1] !== "—" && r[1] !== ""),
        startY: y,
        margin: { left: M, right: M, top: 16, bottom: 16 },
        tableWidth: CW,
        styles: { font: "helvetica", overflow: "linebreak" },
        headStyles: { fillColor: SKY, textColor: WHITE, fontStyle: "bold", fontSize: 9.5, halign: "left", cellPadding: { top: 3.5, bottom: 3.5, left: 4.5, right: 4 } },
        bodyStyles: { fontSize: 8.5, textColor: DARK, cellPadding: { top: 2.8, bottom: 2.8, left: 4.5, right: 4 } },
        alternateRowStyles: { fillColor: LGRAY },
        columnStyles: { 0: { cellWidth: CW * 0.48, textColor: MID }, 1: { cellWidth: CW * 0.32, fontStyle: "bold", halign: "right" }, 2: { cellWidth: CW * 0.20, fontSize: 7.5, textColor: MID } },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            fc(SKY); doc.rect(0, 0, PW, 10, "F");
            tc2(WHITE); doc.setFont("helvetica", "bold"); doc.setFontSize(7);
            doc.text(projectName || "Stormwater Design", M, 7);
            doc.setFont("helvetica", "normal");
            doc.text("Fluids Pad", PW - M, 7, { align: "right" });
          }
        },
      });
      y = (doc as unknown as JsPDFWithAutoTable).lastAutoTable.finalY + 5;
    }

    section("CATCHMENT & RAINFALL", [
      ["Catchment area A",       `${fmt(result.A ?? 0, 2)}`,    "ha"],
      ["Runoff coefficient C",   fmt(effC, 2),              ""],
      ["Land use",               C_PRESETS[cPresetIdx].label.split("(")[0].trim(), ""],
      ["Time of concentration", fmt(result.tc, 1),          "min"],
      ["Rainfall city / region", city.name,                 city.region],
      ["Return period T",        `${returnPer}`,            "years"],
      ["Design intensity i",     fmt(result.i, 1),          "mm/h"],
    ]);

    section("PEAK RUNOFF — RATIONAL METHOD  (Q = C·i·A / 360)", [
      ["Formula",  `Q = ${fmt(effC,2)} × ${fmt(result.i,1)} × ${fmt(result.A ?? 0,2)} / 360`, ""],
      ["Peak flow Q",           fmt(result.Q, 4),           "m³/s"],
      ["Peak flow Q",           fmt(result.Qls, 1),         "L/s"],
    ]);

    if (result.recommended) {
      section("PIPE DESIGN — MANNING'S EQUATION", [
        ["Pipe material",        PIPE_MATERIALS[matIdx].label, ""],
        ["Manning's n",          String(PIPE_MATERIALS[matIdx].n), ""],
        ["Pipe invert slope S",  slopePipe,                  "m/m"],
        ["Min required diameter", fmt(result.Dreq ?? 0, 0), "mm"],
        ["Selected pipe DN",     String(result.recommended.dMm), "mm (SANS 677)"],
        ["Full-pipe capacity",   fmt(result.recommended.Qfull, 4), "m³/s"],
        ["Full-pipe velocity",   fmt(result.recommended.Vfull, 2), "m/s"],
        ["Flow depth ratio d/D", fmt(result.recommended.dD, 3), "at design Q"],
        ["Capacity margin",      fmt((result.recommended.Qfull / result.Q - 1) * 100, 0), "% above design Q"],
        ...(result.L > 0 && (result.unitCost ?? null) !== null ? [
          ["Pipe length",        fmt(result.L, 0),                           "m"],
          ["Indicative unit cost", `R ${(result.unitCost ?? 0).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`, "/m (supply, ZAR Q2 2025)"],
          ["Indicative total",   `R ${(result.totalCost ?? 0)?.toLocaleString("en-ZA", { maximumFractionDigits: 0 }) ?? "—"}`, "(supply only)"],
        ] as [string, string, string][] : []),
      ]);
    }

    const totalPg = doc.getNumberOfPages();
    for (let p = 1; p <= totalPg; p++) {
      doc.setPage(p);
      doc.setDrawColor(200, 214, 218); doc.setLineWidth(0.3); doc.line(M, PH - 12, PW - M, PH - 12);
      tc2(MID); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      doc.text("Fluids Pad", M, PH - 7);
      doc.text(`Page ${p} of ${totalPg}`, PW / 2, PH - 7, { align: "center" });
      doc.text("IDF data: representative SANRAL values — verify before construction.", PW - M, PH - 7, { align: "right" });
    }

    doc.save(`${(projectName || "stormwater-design").replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`);
  }

  function copySpec() {
    if (!result?.recommended) return;
    const tag = tagNo ? `${tagNo} — ` : "";
    const pn  = projectName ? `${projectName} · ` : "";
    const txt = `${tag}${pn}DN${result.recommended.dMm} ${PIPE_MATERIALS[matIdx].label} · S = ${slopePipe} m/m · Q = ${fmt(result.Q,3)} m³/s · V_full = ${fmt(result.recommended.Vfull,2)} m/s · T = ${returnPer} yr · ${city.name} IDF`;
    navigator.clipboard.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="mb-1">
            <Link href="/design" className="text-xs text-gray-400 dark:text-gray-500 hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
              ← Design
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stormwater Drainage Design</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Rational Method · SA IDF rainfall data (SANRAL) · Manning's pipe sizing · SANS 677 standard sizes
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <input
            type="text"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="Project name (optional)"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            onClick={downloadPDF}
            disabled={!result}
            title={!result ? "Enter catchment data first" : "Download PDF report"}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-sm shadow-sky-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            PDF
          </button>
        </div>
      </div>


      <div className="flex gap-5 items-start">

        {/* ══ SIDEBAR ══════════════════════════════════════════════════════════ */}
        <aside className="w-80 flex-shrink-0 space-y-4 sticky top-20 max-h-[calc(100vh-7rem)] overflow-y-auto pb-4">

          {/* 1. Catchment */}
          <Card>
            <SideLabel n={1}>Catchment Parameters</SideLabel>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Catchment area A (ha)</p>
                <input type="number" value={areaHa} onChange={e => setAreaHa(e.target.value)}
                  placeholder="e.g. 2.5" className={INP} />
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Rational Method: A ≤ 15 ha for urban drainage.</p>
                {parseFloat(areaHa) > 15 && !useWeighted && (
                  <p className="text-[10px] text-amber-500 mt-0.5">⚠ A &gt; 15 ha — consider Modified Rational Method or TR-55.</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Land use / runoff coefficient C</p>
                <select value={cPresetIdx} onChange={e => setCPresetIdx(Number(e.target.value))} className={SEL}>
                  {C_PRESETS.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
                </select>
                {isNaN(C_PRESETS[cPresetIdx].C) ? (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Custom C value (0.05–0.95)</p>
                    <input type="number" value={customC} onChange={e => setCustomC(e.target.value)}
                      min="0.05" max="0.95" step="0.05" className={INP} />
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    C = {C_PRESETS[cPresetIdx].C.toFixed(2)}
                  </p>
                )}
              </div>
              {/* Weighted C toggle */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  <input type="checkbox" checked={useWeighted} onChange={e => setUseWeighted(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-sky-500" />
                  Mixed catchment — weighted C
                </label>
                {useWeighted && (
                  <div className="space-y-2 pl-1">
                    {subCatch.map((sc, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-1.5 items-center">
                        <div>
                          {i === 0 && <p className="text-[10px] text-gray-400 mb-0.5">Area (ha)</p>}
                          <input type="number" value={sc.A} placeholder="ha"
                            onChange={e => setSubCatch(prev => prev.map((s, j) => j === i ? { ...s, A: e.target.value } : s))}
                            className={INP} />
                        </div>
                        <div>
                          {i === 0 && <p className="text-[10px] text-gray-400 mb-0.5">C value</p>}
                          <input type="number" value={sc.C} placeholder="0–1" step="0.05"
                            onChange={e => setSubCatch(prev => prev.map((s, j) => j === i ? { ...s, C: e.target.value } : s))}
                            className={INP} />
                        </div>
                        <button onClick={() => setSubCatch(prev => prev.filter((_, j) => j !== i))}
                          className="text-red-400 hover:text-red-600 dark:hover:text-red-300 text-lg leading-none mt-3.5">×</button>
                      </div>
                    ))}
                    <button onClick={() => setSubCatch(prev => [...prev, { A: "", C: "" }])}
                      className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline">
                      + Add sub-catchment
                    </button>
                    {isFinite(weightedC) && totalAreaHa > 0 && (
                      <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg px-3 py-2 border border-sky-200 dark:border-sky-800 text-xs">
                        <span className="text-sky-600 dark:text-sky-400 font-bold">
                          Total A = {fmt(totalAreaHa, 2)} ha · C<sub>weighted</sub> = {fmt(weightedC, 3)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tag / drain reference (optional)</p>
                <input type="text" value={tagNo} onChange={e => setTagNo(e.target.value)}
                  placeholder="e.g. SD-01" className={SEL} />
              </div>
            </div>
          </Card>

          {/* 2. Time of concentration */}
          <Card>
            <SideLabel n={2}>Time of Concentration t<sub>c</sub></SideLabel>
            <div className="space-y-3">
              <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 text-xs mb-2">
                <button onClick={() => setTcMode("kirpich")}
                  className={`flex-1 py-1.5 font-semibold text-center ${tcMode === "kirpich" ? "bg-sky-500 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                  Kirpich formula
                </button>
                <button onClick={() => setTcMode("manual")}
                  className={`flex-1 py-1.5 font-semibold text-center ${tcMode === "manual" ? "bg-sky-500 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                  Manual entry
                </button>
              </div>

              {tcMode === "kirpich" ? (
                <>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Flow-path length L (m)</p>
                    <input type="number" value={flowLen} onChange={e => setFlowLen(e.target.value)}
                      placeholder="e.g. 350" className={INP} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Average catchment slope S (m/m)</p>
                    <input type="number" value={slopeKirp} onChange={e => setSlopeKirp(e.target.value)}
                      placeholder="e.g. 0.02" step="any" className={INP} />
                  </div>
                  <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-200 dark:border-sky-800 px-3 py-2">
                    <p className="text-xs text-sky-600 dark:text-sky-400 font-mono">
                      t<sub>c</sub> = 0.0195 × L<sup>0.77</sup> × S<sup>−0.385</sup>
                    </p>
                    {isFinite(tc_raw) && tc_raw > 0 && (
                      <p className="text-sm font-bold text-sky-700 dark:text-sky-300 mt-1">
                        t<sub>c</sub> = {fmt(tc_min, 1)} min
                        {tc_capped && <span className="text-xs font-normal text-amber-600 dark:text-amber-400 ml-1">(capped at 5 min min.)</span>}
                      </p>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Kirpich (1940) — common for overland flow. Minimum t<sub>c</sub> = 5 min for urban drainage.</p>
                </>
              ) : (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">t<sub>c</sub> (minutes)</p>
                  <input type="number" value={tcManual} onChange={e => setTcManual(e.target.value)}
                    placeholder="e.g. 20" className={INP} />
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Minimum 5 min for urban drainage. Typical: 10–30 min for small catchments.</p>
                </div>
              )}
            </div>
          </Card>

          {/* 3. Rainfall (IDF) */}
          <Card>
            <SideLabel n={3}>Design Rainfall (IDF)</SideLabel>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">City / region</p>
                <select value={cityKey} onChange={e => setCityKey(e.target.value)} className={SEL}>
                  {Object.entries(IDF_DATA).map(([k, v]) => (
                    <option key={k} value={k}>{v.name} — {v.region}</option>
                  ))}
                </select>
              </div>

              {cityKey === "CUSTOM" ? (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Design intensity i (mm/h)</p>
                  <input type="number" value={manualI} onChange={e => setManualI(e.target.value)}
                    placeholder="e.g. 45" className={INP} />
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    Obtain from local authority or SANRAL regional IDF curves for your location.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Return period T (years)</p>
                  <select value={returnPer} onChange={e => setReturnPer(Number(e.target.value))} className={SEL}>
                    {RETURN_PERIODS.map(T => (
                      <option key={T} value={T}>{T}-year storm</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    Typical: 5yr local drainage · 10yr streets · 25yr major roads · 100yr critical infrastructure
                  </p>
                </div>
              )}

              {isFinite(i_mmh) && isFinite(tc_min) && tc_min > 0 && cityKey !== "CUSTOM" && (
                <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-200 dark:border-sky-800 px-3 py-2.5">
                  <p className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                    i = {fmt(i_mmh, 1)} mm/h at t<sub>c</sub> = {fmt(tc_min, 1)} min, T = {returnPer} yr
                  </p>
                  <p className="text-[10px] text-sky-500/70 dark:text-sky-400/70 mt-0.5">
                    Source: {city.name} representative IDF — SANRAL Drainage Manual
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* 4. Pipe design */}
          <Card>
            <SideLabel n={4}>Pipe Design Parameters</SideLabel>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pipe invert slope S (m/m)</p>
                <input type="number" value={slopePipe} onChange={e => setSlopePipe(e.target.value)}
                  placeholder="e.g. 0.005" step="any" className={INP} />
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                  Min 0.003 m/m for self-cleansing. Match ground level where possible.
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pipe material</p>
                <select value={matIdx} onChange={e => setMatIdx(Number(e.target.value))} className={SEL}>
                  {PIPE_MATERIALS.map((m, i) => <option key={i} value={i}>{m.label} (n = {m.n})</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pipe length (m) — for cost estimate</p>
                <input type="number" value={pipeLen} onChange={e => setPipeLen(e.target.value)}
                  placeholder="optional" className={INP} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Min velocity (m/s)</p>
                  <input type="number" value={minVel} onChange={e => setMinVel(e.target.value)}
                    placeholder="0.6" step="0.1" className={INP} />
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Self-cleansing (sediment)</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Max velocity (m/s)</p>
                  <input type="number" value={maxVel} onChange={e => setMaxVel(e.target.value)}
                    placeholder="3.0" step="0.5" className={INP} />
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Erosion limit</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Disclaimer */}
          <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
              <strong>Guidance only.</strong> IDF values are representative of published SANRAL data. Local authority IDF data and the SANRAL Drainage Manual (5th Ed.) must be verified before use in construction drawings or formal design reports.
            </p>
          </div>
        </aside>

        {/* ══ RESULTS ══════════════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Empty state */}
          {!result && (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 00-1 1v14a1 1 0 001 1h18a1 1 0 001-1V5a1 1 0 00-1-1H3zM3 4l9 9m0 0l9-9M12 13v6"/>
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-500 dark:text-gray-400">Enter catchment area, t<sub>c</sub>, and rainfall data</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Results update live — SA IDF embedded for 8 cities</p>
            </div>
          )}

          {result && (
            <>
              {/* ── Validation alerts ────────────────────────────────────── */}
              {tc_capped && (
                <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300">
                  <span className="text-lg">ℹ</span>
                  <span><strong>t<sub>c</sub> capped at 5 min</strong> — Kirpich gave {fmt(tc_raw, 1)} min but the urban minimum per SANRAL is 5 min. Design uses 5 min.</span>
                </div>
              )}
              {(result.A ?? 0) > 15 && (
                <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300">
                  <span className="text-lg">⚠</span>
                  <span><strong>Catchment area {fmt(result.A ?? 0, 1)} ha exceeds 15 ha</strong> — Rational Method accuracy diminishes for larger catchments. Consider Modified Rational Method or TR-55 for this application.</span>
                </div>
              )}

              {/* ── Peak flow summary ─────────────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-200 dark:border-sky-800 p-4">
                  <p className="text-xs font-semibold text-sky-600 dark:text-sky-400 mb-1">Peak runoff Q</p>
                  <p className="text-2xl font-black text-sky-700 dark:text-sky-300">{fmt(result.Q, 3)} <span className="text-sm">m³/s</span></p>
                  <p className="text-xs text-sky-600/70 dark:text-sky-400/70 mt-0.5">{fmt(result.Qls, 1)} L/s</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Design intensity i</p>
                  <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{fmt(result.i, 1)} <span className="text-sm">mm/h</span></p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">T = {returnPer} yr · t<sub>c</sub> = {fmt(result.tc, 1)} min</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">Runoff coeff C</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{fmt(effC, 2)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{C_PRESETS[cPresetIdx].label.split("(")[0].trim()}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">Catchment area</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{areaHa} <span className="text-sm">ha</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmt(parseFloat(areaHa) * 10000, 0)} m²</p>
                </div>
              </div>

              {/* ── Rational Method formula ────────────────────────────────── */}
              <Card>
                <SecHead title="Rational Method" sub="Q = C · i · A / 360  [Q m³/s, i mm/h, A ha]" />
                <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-4 py-3 mb-4 font-mono text-sm">
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-sans mb-1">Substituted:</p>
                  <p className="text-gray-800 dark:text-gray-200">
                    Q = {fmt(effC, 2)} × {fmt(result.i, 1)} × {areaHa} / 360
                    = <strong className="text-sky-600 dark:text-sky-400">{fmt(result.Q, 4)} m³/s</strong>
                    = <strong className="text-sky-600 dark:text-sky-400">{fmt(result.Qls, 1)} L/s</strong>
                  </p>
                </div>

                {/* IDF table for selected city */}
                {cityKey !== "CUSTOM" && (
                  <>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                      IDF table — {city.name} ({city.region})
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left pb-2 pr-3">T (yr)</th>
                            {[10, 20, 30, 60, 120].map(d => (
                              <th key={d} className={`text-right pb-2 pr-2 ${Math.abs(d - result.tc) === Math.min(...[10,20,30,60,120].map(x => Math.abs(x - result.tc))) ? "text-sky-600 dark:text-sky-400" : ""}`}>
                                {d} min
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {RETURN_PERIODS.map(T => (
                            <tr key={T} className={`border-b border-gray-100 dark:border-gray-700/50 last:border-0 ${T === returnPer ? "bg-sky-50 dark:bg-sky-900/20" : ""}`}>
                              <td className={`py-1.5 pr-3 font-semibold ${T === returnPer ? "text-sky-700 dark:text-sky-300" : "text-gray-700 dark:text-gray-300"}`}>
                                {T} yr {T === returnPer && <span className="text-[9px] ml-1 px-1.5 py-0.5 bg-sky-500 text-white rounded-full">Design</span>}
                              </td>
                              {city.idf[T]?.map((v, j) => (
                                <td key={j} className={`py-1.5 pr-2 text-right font-mono text-sm ${T === returnPer ? "font-bold text-sky-700 dark:text-sky-300" : "text-gray-600 dark:text-gray-400"}`}>
                                  {v}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                      Values in mm/h for standard durations. Design intensity interpolated at t<sub>c</sub> = {fmt(result.tc, 1)} min → i = {fmt(result.i, 1)} mm/h.
                      Source: representative SANRAL Drainage Manual 5th Ed. values — verify with local authority IDF curves.
                    </p>
                  </>
                )}
              </Card>

              {/* ── Pipe size selection table ──────────────────────────────── */}
              {result.pipeRows && (
                <Card>
                  <SecHead title="Manning's Pipe Sizing"
                    sub={`${PIPE_MATERIALS[matIdx].label} · n = ${PIPE_MATERIALS[matIdx].n} · S = ${slopePipe} m/m`}
                    accent="blue"
                  />

                  {result.Dreq && (
                    <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                      <span className="text-blue-500 text-lg">📐</span>
                      <span className="text-sm text-blue-700 dark:text-blue-300">
                        Computed minimum diameter = <strong>{fmt(result.Dreq, 0)} mm</strong> — select next standard size ≥ this.
                      </span>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b-2 border-gray-200 dark:border-gray-700">
                          <th className="text-left pb-2 pr-3">DN (mm)</th>
                          <th className="text-right pb-2 pr-3">Q<sub>full</sub> (m³/s)</th>
                          <th className="text-right pb-2 pr-3">Q<sub>full</sub> (L/s)</th>
                          <th className="text-right pb-2 pr-3">V<sub>full</sub> (m/s)</th>
                          <th className="text-right pb-2 pr-3">d/D</th>
                          <th className="text-right pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.pipeRows.map(row => {
                          const isRec = result.recommended?.dMm === row.dMm;
                          const velFlag = !row.velOk;
                          return (
                            <tr key={row.dMm}
                              className={`border-b border-gray-100 dark:border-gray-700/50 last:border-0 ${isRec ? "bg-green-50 dark:bg-green-900/20" : row.Qfull < result.Q ? "opacity-40" : "hover:bg-gray-50 dark:hover:bg-gray-700/30"}`}>
                              <td className={`py-2.5 pr-3 font-bold ${isRec ? "text-green-700 dark:text-green-300" : "text-gray-800 dark:text-gray-200"}`}>
                                {row.dMm}
                                {isRec && <span className="ml-2 text-[9px] px-1.5 py-0.5 bg-green-500 text-white rounded-full">✓</span>}
                              </td>
                              <td className="py-2.5 pr-3 text-right font-mono text-gray-700 dark:text-gray-300">{fmt(row.Qfull, 4)}</td>
                              <td className="py-2.5 pr-3 text-right font-mono text-gray-500 dark:text-gray-400">{fmt(row.Qfull * 1000, 1)}</td>
                              <td className={`py-2.5 pr-3 text-right font-mono font-semibold ${velFlag ? "text-amber-600 dark:text-amber-400" : "text-gray-700 dark:text-gray-300"}`}>
                                {fmt(row.Vfull, 2)}
                              </td>
                              <td className={`py-2.5 pr-3 text-right font-mono ${row.dD > 0.85 ? "text-amber-600 dark:text-amber-400" : "text-gray-600 dark:text-gray-400"}`}>
                                {isFinite(row.dD) && row.Qfull >= result.Q ? fmt(row.dD, 2) : "—"}
                              </td>
                              <td className="py-2.5 text-right">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                  row.pass ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" :
                                  row.Qfull < result.Q ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" :
                                  "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                                }`}>
                                  {row.pass ? "OK" : row.Qfull < result.Q ? "SMALL" : "VEL"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3">
                    Status: OK = capacity and velocity within limits. SMALL = insufficient capacity. VEL = velocity outside {minVel}–{maxVel} m/s range.
                    d/D = flow depth ratio at design Q; target 0.50–0.85 for good hydraulic performance.
                    Pipe sizes per SANS 677 (precast concrete) or equivalent.
                  </p>
                </Card>
              )}

              {/* ── Velocity / depth checks ────────────────────────────────── */}
              {result.recommended && (
                <>
                  {result.recommended.Vfull < parseFloat(minVel) && (
                    <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300">
                      <span className="text-lg">⚠</span>
                      <span><strong>Low velocity</strong> — V<sub>full</sub> = {fmt(result.recommended.Vfull, 2)} m/s is below the self-cleansing minimum of {minVel} m/s. Sediment deposition will occur. Consider steeper slope or smaller pipe diameter if capacity permits.</span>
                    </div>
                  )}
                  {result.recommended.dD > 0.85 && (
                    <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300">
                      <span className="text-lg">⚠</span>
                      <span><strong>High d/D ratio</strong> — pipe running at {fmt(result.recommended.dD * 100, 0)}% depth at design flow. Consider the next size up to provide a freeboard buffer for surges and blockage risk.</span>
                    </div>
                  )}
                </>
              )}

              {result.pipeRows && !result.recommended && (
                <div className="flex items-start gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
                  <span className="text-lg">⚠</span>
                  <span>No standard SANS 677 pipe size passes all criteria. Review slope, material, or velocity limits. Consider a twin-pipe arrangement or a box culvert for very large flows.</span>
                </div>
              )}

              {/* ── Pipe cost estimate ───────────────────────────────────────── */}
              {(result.unitCost ?? null) !== null && (
                <Card>
                  <SecHead title="Indicative Pipe Cost" accent="amber"
                    sub={`DN${result.recommended?.dMm} ${PIPE_MATERIALS[matIdx].label} · Class 50D precast concrete · Q2 2025 ZAR ±25%`} />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Unit rate</p>
                      <p className="text-xl font-black text-amber-700 dark:text-amber-300">
                        R {(result.unitCost ?? 0).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">per metre (supply)</p>
                    </div>
                    {(result.totalCost ?? null) !== null ? (
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Total supply cost</p>
                        <p className="text-xl font-black text-amber-700 dark:text-amber-300">
                          R {(result.totalCost ?? 0).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">for {fmt(result.L ?? 0, 0)} m</p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4 flex items-center justify-center">
                        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Enter pipe length for total cost</p>
                      </div>
                    )}
                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">Installation est.</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        +100–200%
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">excavation, bedding, backfill</p>
                    </div>
                    {result.totalCost !== null && (
                      <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">Installed est. (×2.5)</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          R {((result.totalCost ?? 0) * 2.5).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">rough order of magnitude</p>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    Supply prices for Class 50D precast concrete pipe (SANS 677). Excludes manholes, connections, road reinstatement, and VAT.
                    Installation multiplier of 2–3× supply cost is typical for urban open-cut installations. Obtain contractor quotations before budgeting.
                  </p>
                </Card>
              )}

              {/* ── Design specification card ──────────────────────────────── */}
              {result.recommended && (
                <div className="bg-gradient-to-br from-sky-600 to-sky-700 dark:from-sky-700 dark:to-sky-800 rounded-2xl p-6 text-white">
                  <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                    <div>
                      {tagNo && <p className="text-sky-100 text-xs font-mono mb-1">{tagNo}</p>}
                      {projectName && <p className="text-sky-100 text-xs mb-1">{projectName}</p>}
                      <p className="text-sky-100 text-xs font-bold uppercase tracking-widest mb-1">Drain Specification</p>
                      <p className="text-2xl font-black">DN{result.recommended.dMm} pipe</p>
                      <p className="text-sky-100 text-sm mt-0.5">
                        {PIPE_MATERIALS[matIdx].label} · S = {slopePipe} m/m
                      </p>
                    </div>
                    <button onClick={copySpec}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-colors">
                      {copied
                        ? <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Copied!</>
                        : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy spec</>
                      }
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    {[
                      { label: "Q design",    value: `${fmt(result.Q, 3)} m³/s` },
                      { label: "Q_full",      value: `${fmt(result.recommended.Qfull, 3)} m³/s` },
                      { label: "V_full",      value: `${fmt(result.recommended.Vfull, 2)} m/s` },
                      { label: "d/D at Q",    value: fmt(result.recommended.dD, 2) },
                    ].map(item => (
                      <div key={item.label} className="bg-white/15 rounded-xl px-3 py-2.5">
                        <p className="text-sky-100 text-[10px] mb-0.5">{item.label}</p>
                        <p className="text-white font-bold text-sm">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="bg-white/10 rounded-xl px-4 py-3">
                      <p className="text-sky-100 text-[10px] font-bold uppercase tracking-wider mb-1">Rainfall standard</p>
                      <p className="text-white text-sm font-semibold">{returnPer}-year return period</p>
                      <p className="text-sky-200 text-[10px] mt-0.5">i = {fmt(result.i, 1)} mm/h at t<sub>c</sub> = {fmt(result.tc, 1)} min</p>
                    </div>
                    <div className="bg-white/10 rounded-xl px-4 py-3">
                      <p className="text-sky-100 text-[10px] font-bold uppercase tracking-wider mb-1">Catchment</p>
                      <p className="text-white text-sm font-semibold">A = {areaHa} ha · C = {fmt(effC, 2)}</p>
                      <p className="text-sky-200 text-[10px] mt-0.5">{city.name}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl px-4 py-3">
                      <p className="text-sky-100 text-[10px] font-bold uppercase tracking-wider mb-1">Capacity margin</p>
                      <p className="text-white text-sm font-semibold">
                        {fmt((result.recommended.Qfull / result.Q - 1) * 100, 0)} % above design Q
                      </p>
                      <p className="text-sky-200 text-[10px] mt-0.5">Manning's n = {PIPE_MATERIALS[matIdx].n}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Calculation summary ────────────────────────────────────── */}
              <Card>
                <SecHead title="Calculation Summary" accent="gray"
                  sub="Rational Method (SANRAL) · Manning's (full-pipe)" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {([
                    { label: "C (runoff coeff)",    value: fmt(effC, 2)              },
                    { label: "i (mm/h)",             value: fmt(result.i, 1)          },
                    { label: "A (ha)",               value: areaHa                    },
                    { label: "t_c (min)",            value: fmt(result.tc, 1)         },
                    { label: "T (return period, yr)",value: String(returnPer)         },
                    { label: "Q (m³/s)",             value: fmt(result.Q, 4)         },
                    { label: "Q (L/s)",              value: fmt(result.Qls, 1)       },
                    ...(result.Dreq ? [{label:"D_min (mm)", value: fmt(result.Dreq, 0)}] : []),
                    ...(result.recommended ? [
                      { label: "D_recommended (mm)",  value: String(result.recommended.dMm) },
                      { label: "V_full (m/s)",        value: fmt(result.recommended.Vfull, 2) },
                      { label: "d/D",                  value: fmt(result.recommended.dD, 3) },
                      { label: "Q_full (m³/s)",        value: fmt(result.recommended.Qfull, 4) },
                    ] : []),
                  ] as { label: string; value: string }[]).map(item => (
                    <div key={item.label} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5"><Lbl>{item.label}</Lbl></p>
                      <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3">
                  Rational Method: Q = C·i·A/360 (Q m³/s, i mm/h, A ha). Applicable for A ≤ 15 ha, urban impervious catchments.
                  Manning's full-pipe capacity. Pipe sizes per SANS 677 precast concrete. IDF from representative SANRAL regional data — verify against local authority design standards and current SANRAL Drainage Manual before use in construction documentation.
                </p>
              </Card>
            </>
          )}

          <References refs={REFS_STORMWATER} />
        </div>
      </div>
    </div>
  );
}
