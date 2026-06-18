"use client";

import React, { useState, useMemo } from "react";
import { References } from "@/components/References";
import { REFS_FLANGE_RATING } from "@/lib/references";

// ─── ASME B16.5 P-T Rating Data ───────────────────────────────────────────────
// Representative values from ASME B16.5-2017 published engineering references.
// All pressures in MPa gauge. Temperatures in °C.
// Engineers must verify against the current edition of ASME B16.5 before use.

interface MaterialGroup {
  id:        string;
  name:      string;
  desc:      string;
  materials: string;    // Example materials
  minT:      number;    // Minimum rated temperature °C
  maxT:      number;    // Maximum rated temperature °C
  temps:     number[];  // Temperature breakpoints °C
  // P-T ratings [MPa gauge] per class index: 0=150#, 1=300#, 2=600#, 3=900#, 4=1500#, 5=2500#
  ratings:   number[][];
}

const GROUPS: MaterialGroup[] = [
  {
    id: "1.1", name: "Group 1.1", desc: "Carbon Steel",
    materials: "A105, A181 Gr.60, A216 WCB/WCC, A350 LF1, A352 LCB/LCC",
    minT: -29, maxT: 538,
    temps: [-29, 38, 100, 150, 200, 250, 300, 350, 400, 425, 450, 475, 500, 538],
    ratings: [
      [1.96, 1.96, 1.79, 1.64, 1.53, 1.43, 1.38, 1.38, 1.31, 1.27, 1.24, 1.21, 1.13, 0.95],  // 150#
      [5.11, 5.11, 5.11, 5.11, 5.03, 4.80, 4.57, 4.33, 4.04, 3.88, 3.73, 3.58, 3.36, 2.71],  // 300#
      [10.21,10.21,10.21,10.21,10.05, 9.61, 9.13, 8.65, 8.09, 7.76, 7.46, 7.17, 6.73, 5.42], // 600#
      [15.32,15.32,15.32,15.32,15.08,14.41,13.70,12.98,12.13,11.64,11.19,10.75,10.09, 8.13], // 900#
      [25.54,25.54,25.54,25.54,25.14,24.01,22.83,21.63,20.22,19.40,18.65,17.92,16.82,13.55], // 1500#
      [42.57,42.57,42.57,42.57,41.89,40.02,38.05,36.04,33.70,32.33,31.08,29.87,28.04,22.58], // 2500#
    ],
  },
  {
    id: "1.2", name: "Group 1.2", desc: "High-Silicon Carbon Steel",
    materials: "A216 WCB (high silicon), A515, A516",
    minT: -29, maxT: 538,
    temps: [-29, 38, 100, 150, 200, 250, 300, 350, 400, 425, 450, 475, 500, 538],
    ratings: [
      [1.96, 1.96, 1.79, 1.64, 1.53, 1.43, 1.38, 1.38, 1.31, 1.27, 1.24, 1.21, 1.13, 0.95],
      [5.11, 5.11, 5.11, 5.11, 5.03, 4.80, 4.57, 4.33, 4.04, 3.88, 3.73, 3.58, 3.36, 2.71],
      [10.21,10.21,10.21,10.21,10.05, 9.61, 9.13, 8.65, 8.09, 7.76, 7.46, 7.17, 6.73, 5.42],
      [15.32,15.32,15.32,15.32,15.08,14.41,13.70,12.98,12.13,11.64,11.19,10.75,10.09, 8.13],
      [25.54,25.54,25.54,25.54,25.14,24.01,22.83,21.63,20.22,19.40,18.65,17.92,16.82,13.55],
      [42.57,42.57,42.57,42.57,41.89,40.02,38.05,36.04,33.70,32.33,31.08,29.87,28.04,22.58],
    ],
  },
  {
    id: "1.3", name: "Group 1.3", desc: "1.25Cr–0.5Mo Alloy Steel",
    materials: "A182 F11 Cl.2, A217 WC6, A387 Gr.11",
    minT: -29, maxT: 593,
    temps: [-29, 38, 100, 150, 200, 250, 300, 350, 400, 450, 500, 538, 593],
    ratings: [
      [1.96, 1.96, 1.96, 1.96, 1.96, 1.95, 1.93, 1.91, 1.91, 1.88, 1.79, 1.74, 1.49],
      [5.11, 5.11, 5.11, 5.11, 5.11, 5.09, 5.03, 4.98, 4.98, 4.90, 4.66, 4.54, 3.88],
      [10.21,10.21,10.21,10.21,10.21,10.18,10.05, 9.95, 9.95, 9.80, 9.31, 9.08, 7.76],
      [15.32,15.32,15.32,15.32,15.32,15.27,15.08,14.93,14.93,14.70,13.97,13.62,11.64],
      [25.54,25.54,25.54,25.54,25.54,25.45,25.14,24.88,24.88,24.50,23.28,22.70,19.40],
      [42.57,42.57,42.57,42.57,42.57,42.41,41.89,41.47,41.47,40.83,38.80,37.83,32.33],
    ],
  },
  {
    id: "1.4", name: "Group 1.4", desc: "2.25Cr–1Mo Alloy Steel",
    materials: "A182 F22 Cl.3, A217 WC9, A387 Gr.22",
    minT: -29, maxT: 649,
    temps: [-29, 38, 100, 150, 200, 250, 300, 350, 400, 450, 500, 538, 593, 649],
    ratings: [
      [1.96, 1.96, 1.96, 1.96, 1.96, 1.96, 1.95, 1.94, 1.94, 1.91, 1.87, 1.87, 1.87, 1.76],
      [5.11, 5.11, 5.11, 5.11, 5.11, 5.11, 5.09, 5.06, 5.06, 4.98, 4.87, 4.87, 4.87, 4.59],
      [10.21,10.21,10.21,10.21,10.21,10.21,10.18,10.12,10.12, 9.95, 9.75, 9.75, 9.75, 9.18],
      [15.32,15.32,15.32,15.32,15.32,15.32,15.27,15.18,15.18,14.93,14.62,14.62,14.62,13.77],
      [25.54,25.54,25.54,25.54,25.54,25.54,25.45,25.30,25.30,24.88,24.37,24.37,24.37,22.95],
      [42.57,42.57,42.57,42.57,42.57,42.57,42.41,42.16,42.16,41.47,40.62,40.62,40.62,38.25],
    ],
  },
  {
    id: "1.10", name: "Group 1.10", desc: "Low-Temperature Carbon Steel",
    materials: "A350 LF2 Cl.1, A352 LC1/LC2/LC3, A420 WPL6",
    minT: -46, maxT: 454,
    temps: [-46, -29, 38, 100, 150, 200, 250, 300, 350, 400, 425, 454],
    ratings: [
      [1.96, 1.96, 1.96, 1.79, 1.64, 1.53, 1.43, 1.38, 1.38, 1.31, 1.27, 1.24],
      [5.11, 5.11, 5.11, 5.11, 5.11, 5.03, 4.80, 4.57, 4.33, 4.04, 3.88, 3.73],
      [10.21,10.21,10.21,10.21,10.21,10.05, 9.61, 9.13, 8.65, 8.09, 7.76, 7.46],
      [15.32,15.32,15.32,15.32,15.32,15.08,14.41,13.70,12.98,12.13,11.64,11.19],
      [25.54,25.54,25.54,25.54,25.54,25.14,24.01,22.83,21.63,20.22,19.40,18.65],
      [42.57,42.57,42.57,42.57,42.57,41.89,40.02,38.05,36.04,33.70,32.33,31.08],
    ],
  },
  {
    id: "2.1", name: "Group 2.1", desc: "Austenitic SS 304",
    materials: "A182 F304/304H, A351 CF8, A403 WP304",
    minT: -196, maxT: 538,
    // ASME B16.5: austenitic SS rated to −196 °C with same P-T as at −29 °C
    temps: [-196, -29, 38, 100, 150, 200, 250, 300, 350, 400, 450, 500, 538],
    ratings: [
      [1.96, 1.96, 1.96, 1.76, 1.63, 1.54, 1.46, 1.40, 1.37, 1.37, 1.37, 1.37, 1.37],
      [5.11, 5.11, 5.11, 4.59, 4.25, 4.01, 3.80, 3.64, 3.57, 3.57, 3.57, 3.57, 3.57],
      [10.21,10.21,10.21, 9.19, 8.49, 8.03, 7.61, 7.28, 7.15, 7.15, 7.15, 7.15, 7.15],
      [15.32,15.32,15.32,13.78,12.74,12.04,11.41,10.92,10.72,10.72,10.72,10.72,10.72],
      [25.54,25.54,25.54,22.97,21.23,20.07,19.02,18.21,17.87,17.87,17.87,17.87,17.87],
      [42.57,42.57,42.57,38.28,35.38,33.45,31.70,30.35,29.78,29.78,29.78,29.78,29.78],
    ],
  },
  {
    id: "2.2", name: "Group 2.2", desc: "Austenitic SS 316 / 316H",
    materials: "A182 F316/316H, A351 CF8M, A403 WP316",
    minT: -196, maxT: 538,
    temps: [-196, -29, 38, 100, 150, 200, 250, 300, 350, 400, 450, 500, 538],
    ratings: [
      [1.96, 1.96, 1.96, 1.82, 1.69, 1.60, 1.52, 1.46, 1.44, 1.44, 1.44, 1.44, 1.44],
      [5.11, 5.11, 5.11, 4.75, 4.40, 4.17, 3.96, 3.80, 3.74, 3.74, 3.74, 3.74, 3.74],
      [10.21,10.21,10.21, 9.49, 8.80, 8.34, 7.92, 7.60, 7.49, 7.49, 7.49, 7.49, 7.49],
      [15.32,15.32,15.32,14.24,13.20,12.51,11.88,11.40,11.23,11.23,11.23,11.23,11.23],
      [25.54,25.54,25.54,23.73,22.00,20.85,19.80,19.00,18.72,18.72,18.72,18.72,18.72],
      [42.57,42.57,42.57,39.55,36.67,34.75,33.00,31.67,31.19,31.19,31.19,31.19,31.19],
    ],
  },
  {
    id: "2.3", name: "Group 2.3", desc: "Austenitic SS 316L",
    materials: "A182 F316L, A351 CF3M, A403 WP316L",
    minT: -196, maxT: 454,
    temps: [-196, -29, 38, 100, 150, 200, 250, 300, 350, 400, 454],
    ratings: [
      [1.96, 1.96, 1.96, 1.63, 1.50, 1.40, 1.32, 1.26, 1.23, 1.22, 1.20],
      [5.11, 5.11, 5.11, 4.25, 3.91, 3.65, 3.44, 3.28, 3.20, 3.18, 3.13],
      [10.21,10.21,10.21, 8.50, 7.82, 7.30, 6.88, 6.57, 6.40, 6.36, 6.26],
      [15.32,15.32,15.32,12.75,11.73,10.95,10.32, 9.85, 9.60, 9.54, 9.39],
      [25.54,25.54,25.54,21.25,19.55,18.25,17.20,16.42,16.00,15.90,15.65],
      [42.57,42.57,42.57,35.41,32.58,30.42,28.67,27.37,26.67,26.50,26.08],
    ],
  },
  {
    id: "2.4", name: "Group 2.4", desc: "Austenitic SS 304L",
    materials: "A182 F304L, A351 CF3, A403 WP304L",
    minT: -196, maxT: 454,
    temps: [-196, -29, 38, 100, 150, 200, 250, 300, 350, 400, 454],
    ratings: [
      [1.96, 1.96, 1.96, 1.65, 1.53, 1.44, 1.36, 1.30, 1.27, 1.25, 1.24],
      [5.11, 5.11, 5.11, 4.30, 3.99, 3.75, 3.54, 3.39, 3.31, 3.26, 3.23],
      [10.21,10.21,10.21, 8.60, 7.98, 7.50, 7.08, 6.78, 6.62, 6.52, 6.46],
      [15.32,15.32,15.32,12.90,11.97,11.25,10.62,10.17, 9.93, 9.78, 9.69],
      [25.54,25.54,25.54,21.50,19.95,18.75,17.70,16.95,16.55,16.30,16.15],
      [42.57,42.57,42.57,35.83,33.25,31.25,29.50,28.25,27.58,27.17,26.92],
    ],
  },
];

const CLASSES  = [150, 300, 600, 900, 1500, 2500];
const CLASS_COLORS = [
  "text-green-600 dark:text-green-400",
  "text-blue-600 dark:text-blue-400",
  "text-indigo-600 dark:text-indigo-400",
  "text-violet-600 dark:text-violet-400",
  "text-orange-600 dark:text-orange-400",
  "text-red-600 dark:text-red-400",
];
const CLASS_BG = [
  "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800",
  "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800",
  "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
  "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
];

// ─── Interpolation ────────────────────────────────────────────────────────────
function interpolate(T: number, temps: number[], vals: number[]): number | null {
  if (T < temps[0] || T > temps[temps.length - 1]) return null;
  if (T <= temps[0]) return vals[0];
  for (let i = 0; i < temps.length - 1; i++) {
    if (T >= temps[i] && T <= temps[i + 1]) {
      const f = (T - temps[i]) / (temps[i + 1] - temps[i]);
      return vals[i] + f * (vals[i + 1] - vals[i]);
    }
  }
  return vals[vals.length - 1];
}

// ─── P-T Chart ────────────────────────────────────────────────────────────────
const CLASS_LINE_COLORS = ["#16a34a","#2563eb","#6366f1","#7c3aed","#ea580c","#dc2626"];

function PTChart({
  group, designT, designP, pressScale, pressLabel,
}: {
  group: MaterialGroup;
  designT: number;
  designP: number | null;
  pressScale: number;      // MPa → display unit
  pressLabel: string;
}) {
  const W = 660, H_SVG = 320, ML = 52, MR = 16, MT = 12, MB = 44;
  const PW = W - ML - MR, PH = H_SVG - MT - MB;

  // Build curve data for each class at each temperature breakpoint
  const Tmin = group.temps[0];
  const Tmax = group.temps[group.temps.length - 1];
  const Pmax = (group.ratings[5][0] ?? 0) * pressScale * 1.08; // top of 2500# at coldest

  const sx = (t: number) => ML + ((t - Tmin) / (Tmax - Tmin)) * PW;
  const sy = (p: number) => H_SVG - MB - (p / Pmax) * PH;

  const tTicks = Array.from({ length: 6 }, (_, i) => Math.round(Tmin + (i / 5) * (Tmax - Tmin)));
  const pTicks = Array.from({ length: 5 }, (_, i) => +((Pmax * (i + 1) / 5)).toPrecision(3));

  return (
    <svg viewBox={`0 0 ${W} ${H_SVG}`} className="w-full" style={{ maxHeight: 320 }}>
      {/* Grid */}
      {tTicks.map(t => <line key={t} x1={sx(t)} y1={MT} x2={sx(t)} y2={H_SVG-MB} stroke="#e5e7eb" strokeWidth={1}/>)}
      {pTicks.map(p => <line key={p} x1={ML} y1={sy(p)} x2={W-MR} y2={sy(p)} stroke="#e5e7eb" strokeWidth={1}/>)}
      {/* Axes */}
      <line x1={ML} y1={MT} x2={ML} y2={H_SVG-MB} stroke="#9ca3af" strokeWidth={1.5}/>
      <line x1={ML} y1={H_SVG-MB} x2={W-MR} y2={H_SVG-MB} stroke="#9ca3af" strokeWidth={1.5}/>
      {/* Tick labels */}
      {tTicks.map(t => <text key={t} x={sx(t)} y={H_SVG-MB+14} textAnchor="middle" fontSize={9} fill="#6b7280">{t}°C</text>)}
      {pTicks.map(p => <text key={p} x={ML-4} y={sy(p)+3} textAnchor="end" fontSize={9} fill="#6b7280">{p.toFixed(p<10?2:1)}</text>)}
      <text x={ML+PW/2} y={H_SVG-2} textAnchor="middle" fontSize={10} fill="#6b7280">Temperature (°C)</text>
      <text x={10} y={MT+PH/2} textAnchor="middle" fontSize={10} fill="#6b7280" transform={`rotate(-90 10 ${MT+PH/2})`}>Pressure ({pressLabel})</text>
      {/* Curves */}
      {group.ratings.map((vals, ci) => {
        const pts = group.temps.map((T, ti) => ({x:sx(T), y:sy(vals[ti]*pressScale)}));
        const d = pts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
        return (
          <g key={ci}>
            <path d={d} fill="none" stroke={CLASS_LINE_COLORS[ci]} strokeWidth={1.8} opacity={0.9}/>
            {/* Class label at right end */}
            <text x={sx(group.temps[group.temps.length-1])+4} y={sy(vals[vals.length-1]*pressScale)+4}
              fontSize={9} fill={CLASS_LINE_COLORS[ci]} fontWeight="bold">
              {CLASSES[ci]}#
            </text>
          </g>
        );
      })}
      {/* Design temperature line */}
      {isFinite(designT) && designT >= Tmin && designT <= Tmax && (
        <line x1={sx(designT)} y1={MT} x2={sx(designT)} y2={H_SVG-MB}
          stroke="#1d4ed8" strokeWidth={1.5} strokeDasharray="5 3" opacity={0.8}/>
      )}
      {/* Design pressure line */}
      {designP !== null && designP > 0 && designP < Pmax && (
        <line x1={ML} y1={sy(designP)} x2={W-MR} y2={sy(designP)}
          stroke="#1d4ed8" strokeWidth={1.2} strokeDasharray="4 3" opacity={0.7}/>
      )}
      {/* Design point intersection dot */}
      {isFinite(designT) && designT >= Tmin && designT <= Tmax && designP !== null && designP > 0 && designP < Pmax && (
        <circle cx={sx(designT)} cy={sy(designP)} r={4.5} fill="#1d4ed8" stroke="white" strokeWidth={1.5}/>
      )}
    </svg>
  );
}

// ─── Unit conversions ─────────────────────────────────────────────────────────
const PRESS_TO_MPA: Record<string, number> = { MPa: 1, bar: 0.1, kPa: 0.001, psi: 0.006895 };
const MPA_TO: Record<string, number>       = { MPa: 1, bar: 10,  kPa: 1000,  psi: 145.038 };
const TEMP_TO_C: Record<string, (v: number) => number> = {
  "°C": v => v,
  "°F": v => (v - 32) * 5 / 9,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number, dp = 2): string { return isFinite(n) ? n.toFixed(dp) : "—"; }

const SEL = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const INP = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500";

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FlangeRatingPage() {
  const [groupIdx,  setGroupIdx]  = useState(0);
  const [tempVal,   setTempVal]   = useState("200");
  const [tempUnit,  setTempUnit]  = useState("°C");
  const [pressVal,  setPressVal]  = useState("5");
  const [pressUnit, setPressUnit] = useState("MPa");
  const [mode,      setMode]      = useState<"findClass" | "findMaxP">("findClass");
  const [classIdx,  setClassIdx]  = useState(1); // 300# default for reverse mode
  const [copied,    setCopied]    = useState(false);

  const group = GROUPS[groupIdx];

  const T_C   = TEMP_TO_C[tempUnit]?.(parseFloat(tempVal)) ?? NaN;
  const P_MPa = parseFloat(pressVal) * (PRESS_TO_MPA[pressUnit] ?? 1);

  const result = useMemo(() => {
    if (!isFinite(T_C)) return null;
    if (T_C < group.minT)
      return { error: `Temperature ${fmt(T_C, 0)} °C is below the minimum rated temperature (${group.minT} °C) for ${group.name}.` };
    if (T_C > group.maxT)
      return { error: `Temperature ${fmt(T_C, 0)} °C exceeds the maximum rated temperature (${group.maxT} °C) for ${group.name}.` };

    // Interpolate P_max for each class at T_C
    const maxP = group.ratings.map((vals) => interpolate(T_C, group.temps, vals));

    if (mode === "findMaxP") {
      const P = maxP[classIdx];
      return { mode: "findMaxP" as const, maxP, selectedClass: CLASSES[classIdx], P_max: P };
    }

    // findClass mode
    if (!isFinite(P_MPa) || P_MPa <= 0) return null;
    const minClassIdx = maxP.findIndex(p => p !== null && p >= P_MPa);

    return {
      mode: "findClass" as const,
      P_MPa, maxP, minClassIdx,
      requiredClass: minClassIdx >= 0 ? CLASSES[minClassIdx] : null,
      tooHigh: minClassIdx < 0,
    };
  }, [T_C, P_MPa, group, mode, classIdx]);

  const hasError = result !== null && "error" in result;
  type Good = Exclude<typeof result, null | { error: string }>;
  const res: Good | null = result && !hasError ? result as Good : null;

  // Copy result to clipboard
  function copyResult() {
    if (!res) return;
    let txt = `ASME B16.5 Flange Rating — ${group.name} (${group.desc})\nTemperature: ${tempVal} ${tempUnit} = ${fmt(T_C, 1)} °C\n`;
    if (res.mode === "findClass" && res.requiredClass) {
      txt += `Design pressure: ${pressVal} ${pressUnit} = ${fmt(P_MPa, 3)} MPa\nRequired class: ${res.requiredClass}#\n`;
      txt += `Max pressure at ${res.requiredClass}#: ${fmt((res.maxP[res.minClassIdx] ?? 0) * MPA_TO[pressUnit], 2)} ${pressUnit}`;
    } else if (res.mode === "findMaxP" && res.P_max !== null) {
      txt += `Class ${res.selectedClass}# max allowable pressure: ${fmt(res.P_max * MPA_TO[pressUnit], 2)} ${pressUnit}\n(${fmt(res.P_max, 3)} MPa · ${fmt(res.P_max * 10, 2)} bar · ${fmt(res.P_max * 145.038, 1)} psi)`;
    }
    navigator.clipboard.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  }

  // CSV export — full P-T table for selected group
  function downloadCSV() {
    const rows: (string | number)[][] = [];
    rows.push([`ASME B16.5 P-T Ratings — ${group.name} — ${group.desc}`]);
    rows.push([`Materials: ${group.materials}`]);
    rows.push([`Units: MPa gauge`]);
    rows.push([]);
    rows.push(["Temp (°C)", ...CLASSES.map(c => `Class ${c}# (MPa)`)]);
    for (let ti = 0; ti < group.temps.length; ti++) {
      rows.push([group.temps[ti], ...group.ratings.map(r => r[ti])]);
    }
    rows.push([]);
    rows.push(["Note: Representative values based on published ASME B16.5-2017 data. Verify against current edition before use."]);
    const csv = rows.map(r => r.map(c => `"${String(c)}"`).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `flange-rating-${group.id.replace(".", "_")}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flange Pressure Class Rating</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ASME B16.5 — find minimum class for design P &amp; T, or find max allowable pressure for a given class.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={copyResult} disabled={!res}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {copied
              ? <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Copied!</>
              : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</>}
          </button>
          <button onClick={downloadCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            CSV (full P-T table)
          </button>
        </div>
      </div>

      <div className="flex gap-5 items-start">

        {/* ══ SIDEBAR ══════════════════════════════════════════════════════ */}
        <aside className="w-72 flex-shrink-0 space-y-4 sticky top-20 max-h-[calc(100vh-7rem)] overflow-y-auto pb-4">

          {/* Material group */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Material Group</p>
            <select value={groupIdx} onChange={e => setGroupIdx(Number(e.target.value))} className={SEL}>
              {GROUPS.map((g, i) => <option key={i} value={i}>{g.name} — {g.desc}</option>)}
            </select>
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl">
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-0.5">Example materials</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{group.materials}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                Rated {group.minT} to {group.maxT} °C
              </p>
            </div>
          </div>

          {/* Mode */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">Mode</p>
            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 text-xs mb-4">
              <button onClick={() => setMode("findClass")}
                className={`flex-1 py-1.5 font-semibold ${mode === "findClass" ? "bg-blue-500 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                Find class
              </button>
              <button onClick={() => setMode("findMaxP")}
                className={`flex-1 py-1.5 font-semibold ${mode === "findMaxP" ? "bg-blue-500 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                Find max P
              </button>
            </div>

            {/* Temperature */}
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Design temperature</p>
                <div className="flex gap-2">
                  <input type="number" value={tempVal} onChange={e => setTempVal(e.target.value)}
                    placeholder="e.g. 200" className={`flex-1 ${INP}`} />
                  <select value={tempUnit} onChange={e => setTempUnit(e.target.value)}
                    className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>°C</option><option>°F</option>
                  </select>
                </div>
                {isFinite(T_C) && tempUnit === "°F" && (
                  <p className="text-[10px] text-gray-400 mt-0.5">= {fmt(T_C, 1)} °C</p>
                )}
              </div>

              {mode === "findClass" ? (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Design pressure (gauge)</p>
                  <div className="flex gap-2">
                    <input type="number" value={pressVal} onChange={e => setPressVal(e.target.value)}
                      placeholder="e.g. 5" className={`flex-1 ${INP}`} />
                    <select value={pressUnit} onChange={e => setPressUnit(e.target.value)}
                      className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {Object.keys(PRESS_TO_MPA).map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  {isFinite(P_MPa) && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      = {fmt(P_MPa, 3)} MPa = {fmt(P_MPa * 10, 2)} bar = {fmt(P_MPa * 145.038, 0)} psi
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pressure class</p>
                    <select value={classIdx} onChange={e => setClassIdx(Number(e.target.value))} className={SEL}>
                      {CLASSES.map((c, i) => <option key={i} value={i}>Class {c}# (ANSI {c})</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Display pressure unit</p>
                    <select value={pressUnit} onChange={e => setPressUnit(e.target.value)} className={SEL}>
                      {Object.keys(PRESS_TO_MPA).map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick reference */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-4">
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">Quick reference</p>
            <div className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
              <div className="flex justify-between"><span>Class 150#</span><span>≈ 275 psi base</span></div>
              <div className="flex justify-between"><span>Class 300#</span><span>≈ 720 psi base</span></div>
              <div className="flex justify-between"><span>Class 600#</span><span>≈ 1440 psi base</span></div>
              <div className="flex justify-between"><span>Class 900#</span><span>≈ 2160 psi base</span></div>
              <div className="flex justify-between"><span>Class 1500#</span><span>≈ 3600 psi base</span></div>
              <div className="flex justify-between"><span>Class 2500#</span><span>≈ 6000 psi base</span></div>
            </div>
            <p className="text-[10px] text-blue-500/70 dark:text-blue-400/70 mt-2">At −29 to 38 °C for Group 1.1 CS</p>
          </div>

        </aside>

        {/* ══ RESULTS ══════════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Error */}
          {hasError && (
            <div className="flex items-start gap-3 px-5 py-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
              <span className="text-red-500 text-xl">⚠</span>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{(result as {error:string}).error}</p>
            </div>
          )}

          {/* Empty state */}
          {!result && !hasError && (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Enter temperature to see ratings</p>
            </div>
          )}

          {/* findClass result */}
          {res?.mode === "findClass" && (
            <>
              {res.tooHigh ? (
                <div className="flex items-start gap-3 px-5 py-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                  <span className="text-red-500 text-xl">⚠</span>
                  <div>
                    <p className="text-sm font-bold text-red-700 dark:text-red-300">
                      Design pressure {fmt(P_MPa * MPA_TO[pressUnit], 2)} {pressUnit} exceeds Class 2500# limit
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                      No standard ASME B16.5 class can accommodate this pressure at {fmt(T_C, 1)} °C for {group.name}. Consider ASME B16.47 large-diameter flanges or pressure vessel flanges.
                    </p>
                  </div>
                </div>
              ) : (
                <div className={`rounded-2xl border p-6 ${CLASS_BG[res.minClassIdx]}`}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{color: "inherit"}}>
                    Minimum required pressure class
                  </p>
                  <p className={`text-4xl font-black mb-2 ${CLASS_COLORS[res.minClassIdx]}`}>
                    Class {res.requiredClass}#
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className={CLASS_COLORS[res.minClassIdx]}>
                      Max P at {fmt(T_C, 1)} °C = <strong>{fmt((res.maxP[res.minClassIdx] ?? 0) * MPA_TO[pressUnit], 2)} {pressUnit}</strong>
                    </span>
                    <span className={CLASS_COLORS[res.minClassIdx]}>
                      Design P = {fmt(P_MPa * MPA_TO[pressUnit], 2)} {pressUnit}
                    </span>
                    <span className={CLASS_COLORS[res.minClassIdx]}>
                      Margin = {fmt(((res.maxP[res.minClassIdx] ?? 0) / P_MPa - 1) * 100, 0)}%
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* findMaxP result */}
          {res?.mode === "findMaxP" && res.P_max !== null && (
            <div className={`rounded-2xl border p-6 ${CLASS_BG[classIdx]}`}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1">Max allowable pressure</p>
              <p className={`text-4xl font-black mb-2 ${CLASS_COLORS[classIdx]}`}>
                {fmt(res.P_max * MPA_TO[pressUnit], 2)} {pressUnit}
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className={CLASS_COLORS[classIdx]}>Class {CLASSES[classIdx]}# at {fmt(T_C, 1)} °C</span>
                <span className={CLASS_COLORS[classIdx]}>{fmt(res.P_max, 3)} MPa = {fmt(res.P_max * 10, 2)} bar = {fmt(res.P_max * 145.038, 1)} psi</span>
              </div>
            </div>
          )}

          {/* Full class table */}
          {res && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    All Classes — {group.name} at {fmt(T_C, 1)} °C
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{group.desc} · {group.materials}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b-2 border-gray-200 dark:border-gray-700">
                      <th className="text-left pb-2 pr-3">Class</th>
                      <th className="text-right pb-2 pr-3">Max P (MPa)</th>
                      <th className="text-right pb-2 pr-3">Max P (bar)</th>
                      <th className="text-right pb-2 pr-3">Max P (psi)</th>
                      <th className="text-right pb-2 pr-3">Max P ({pressUnit})</th>
                      <th className="text-right pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CLASSES.map((cls, ci) => {
                      const maxP = res.maxP[ci];
                      const isSelected = res.mode === "findMaxP" && ci === classIdx;
                      const isMin      = res.mode === "findClass" && ci === res.minClassIdx;
                      const passes     = res.mode === "findClass" && maxP !== null && maxP >= P_MPa;
                      return (
                        <tr key={cls}
                          className={`border-b border-gray-100 dark:border-gray-700/50 last:border-0 ${
                            isMin || isSelected ? CLASS_BG[ci] : "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                          }`}>
                          <td className={`py-3 pr-3 font-bold text-base ${CLASS_COLORS[ci]}`}>
                            {cls}#
                            {isMin && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full bg-current text-white font-black uppercase opacity-90">Required</span>}
                            {isSelected && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full bg-current text-white font-black uppercase opacity-90">Selected</span>}
                          </td>
                          <td className="py-3 pr-3 text-right font-mono text-gray-700 dark:text-gray-300">
                            {maxP !== null ? fmt(maxP, 2) : "—"}
                          </td>
                          <td className="py-3 pr-3 text-right font-mono text-gray-500 dark:text-gray-400">
                            {maxP !== null ? fmt(maxP * 10, 1) : "—"}
                          </td>
                          <td className="py-3 pr-3 text-right font-mono text-gray-500 dark:text-gray-400">
                            {maxP !== null ? fmt(maxP * 145.038, 0) : "—"}
                          </td>
                          <td className={`py-3 pr-3 text-right font-mono font-semibold ${isMin || isSelected ? CLASS_COLORS[ci] : "text-gray-700 dark:text-gray-300"}`}>
                            {maxP !== null ? fmt(maxP * MPA_TO[pressUnit], 2) : "—"}
                          </td>
                          <td className="py-3 text-right">
                            {res.mode === "findClass" && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                passes
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                  : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                              }`}>
                                {maxP !== null ? (passes ? "OK" : "FAIL") : "—"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* P-T chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">P-T Rating Chart</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {group.name} — {group.desc} · {pressUnit} gauge · Dashed blue lines = design point
                </p>
              </div>
              {/* Chart legend */}
              <div className="flex flex-wrap gap-2">
                {CLASSES.map((c, ci) => (
                  <div key={c} className="flex items-center gap-1">
                    <div className="w-5 h-1 rounded" style={{ background: CLASS_LINE_COLORS[ci] }} />
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">{c}#</span>
                  </div>
                ))}
              </div>
            </div>
            <PTChart
              group={group}
              designT={isFinite(T_C) ? T_C : NaN}
              designP={mode === "findClass" && isFinite(P_MPa) ? P_MPa * MPA_TO[pressUnit] : null}
              pressScale={MPA_TO[pressUnit]}
              pressLabel={pressUnit}
            />
          </div>

          {/* Engineering notes */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">Applicable size range</p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                ASME B16.5 covers <strong>NPS ½ to NPS 24</strong> (DN 15 to DN 600). For larger flanges (NPS 26 and above), refer to <strong>ASME B16.47</strong> Series A (MSS SP-44) or Series B (API 605). Ratings differ significantly between series and flange class.
              </p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">Flange rating ≠ pipe schedule rating</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                These P-T ratings apply to the <strong>flange</strong>. The connected pipe wall thickness must be separately verified per ASME B31.3 or B31.1. A Class 600# flange does not mean the connected schedule 40 pipe is rated to Class 600# pressure at that temperature.
              </p>
            </div>
          </div>

          {/* P-T curve viewer — show ratings at all temperature breakpoints */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              Full P-T Table — {group.name} ({group.desc})
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Pressures in {pressUnit} gauge. Design temperature column highlighted.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b-2 border-gray-200 dark:border-gray-700">
                    <th className="text-left pb-2 pr-3">T (°C)</th>
                    {CLASSES.map((c, ci) => (
                      <th key={c} className={`text-right pb-2 px-2 ${CLASS_COLORS[ci]}`}>{c}#</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.temps.map((T, ti) => {
                    const isNearDesign = isFinite(T_C) && Math.abs(T - T_C) < 1;
                    return (
                      <tr key={T}
                        className={`border-b border-gray-100 dark:border-gray-700/50 last:border-0 ${isNearDesign ? "bg-blue-50 dark:bg-blue-900/10" : ""}`}>
                        <td className={`py-1.5 pr-3 font-mono font-semibold ${isNearDesign ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}>
                          {T}
                        </td>
                        {group.ratings.map((vals, ci) => (
                          <td key={ci} className={`py-1.5 px-2 text-right font-mono ${
                            res && res.mode === "findClass" && ci === res.minClassIdx && isNearDesign
                              ? CLASS_COLORS[ci] + " font-bold"
                              : "text-gray-700 dark:text-gray-300"
                          }`}>
                            {fmt(vals[ti] * MPA_TO[pressUnit], 2)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3">
              Representative values based on published ASME B16.5-2017 data. Values for intermediate temperatures are linearly interpolated.
              All pressures are gauge pressures. Verify against current ASME B16.5 edition before use in design documentation.
              Minimum temperature for {group.name}: {group.minT} °C · Maximum: {group.maxT} °C.
            </p>
          </div>

        </div>
      </div>
      <References refs={REFS_FLANGE_RATING} />
    </div>
  );
}