"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { References } from "@/components/References";
import { REFS_PIPE_WALL } from "@/lib/references";

// ─── Physics ───────────────────────────────────────────────────────────────────
// ASME B31.3 Eq. 304.1.2(a)  /  B31.1 Eq. 104.1.2(A)
// t  = P·D / [2·(S·E + P·Y)]         pressure term (mm)
// t_m = t + c                          minimum required wall
// t_ord = t_m / (1 − mill tolerance)  minimum ordered wall

function calcThickness(
  P: number, D: number, S: number, E: number, Y: number, c: number
): { t: number; tm: number } | null {
  if (P <= 0 || D <= 0 || S <= 0 || E <= 0) return null;
  const denom = 2 * (S * E + P * Y);
  if (denom <= 0) return null;
  const t  = (P * D) / denom;
  const tm = t + c;
  return { t, tm };
}

function calcMAWP(
  tSch: number, D: number, S: number, E: number, Y: number, c: number
): number | null {
  // Rearranged B31.3 eq. — max allowable working pressure for a given schedule wall
  const tAvail = tSch - c;
  if (tAvail <= 0) return 0;
  const num   = 2 * tAvail * S * E;
  const denom = D - 2 * tAvail * Y;
  if (denom <= 0) return null;
  return num / denom;
}

function interpolate(T: number, table: [number, number][]): number | null {
  if (!table.length) return null;
  if (T <= table[0][0])                  return table[0][1];
  if (T >= table[table.length - 1][0])  return table[table.length - 1][1];
  for (let i = 0; i < table.length - 1; i++) {
    const [t0, s0] = table[i], [t1, s1] = table[i + 1];
    if (T >= t0 && T <= t1) return s0 + ((T - t0) / (t1 - t0)) * (s1 - s0);
  }
  return null;
}

function yCoeff(T_C: number, ferritic: boolean): number {
  if (ferritic) {
    if (T_C <= 482) return 0.4;
    if (T_C <= 510) return 0.5;
    return 0.7;
  }
  return 0.4;
}

// ─── Unit conversions ─────────────────────────────────────────────────────────
const TO_MPA: Record<string, number> = { MPa: 1, kPa: 1e-3, bar: 0.1, psi: 0.006895 };
const TO_C:   Record<string, (v: number) => number> = {
  "°C": (v) => v, "°F": (v) => (v - 32) * 5 / 9,
};

// ─── Material data (representative B31.3 Appendix A values, MPa) ───────────────
interface Material {
  id: string; spec: string; grade: string; desc: string;
  ferritic: boolean; defaultE: number;
  table: [number, number][];
  minT: number; maxT: number;
  density: number;   // kg/m³ for weight calculation
  priceTier: number; // multiplier vs CS base price
}

const MATERIALS: Material[] = [
  {
    id: "a106b", spec: "ASTM A106", grade: "Grade B",
    desc: "CS seamless — general process service",
    ferritic: true, defaultE: 1.00, density: 7850, priceTier: 1.0,
    table: [[20,117.9],[100,117.9],[150,117.9],[200,110.3],[250,103.4],
            [300,96.5],[350,89.6],[400,82.7],[425,68.9],[454,51.7]],
    minT: -29, maxT: 454,
  },
  {
    id: "a106a", spec: "ASTM A106", grade: "Grade A",
    desc: "CS seamless — lower strength",
    ferritic: true, defaultE: 1.00, density: 7850, priceTier: 0.9,
    table: [[20,96.5],[100,96.5],[150,96.5],[200,93.1],[250,86.2],
            [300,82.7],[350,75.8],[400,68.9],[454,44.8]],
    minT: -29, maxT: 454,
  },
  {
    id: "a53b", spec: "ASTM A53", grade: "Grade B",
    desc: "CS ERW or seamless — general service",
    ferritic: true, defaultE: 0.85, density: 7850, priceTier: 1.0,
    table: [[20,117.9],[100,117.9],[150,117.9],[200,110.3],[250,103.4],
            [300,96.5],[350,89.6],[400,82.7],[425,68.9],[454,51.7]],
    minT: -29, maxT: 454,
  },
  {
    id: "a333g6", spec: "ASTM A333", grade: "Grade 6",
    desc: "CS seamless — low-temperature service (min −46 °C)",
    ferritic: true, defaultE: 1.00, density: 7850, priceTier: 1.15,
    table: [[20,117.9],[100,117.9],[150,117.9],[200,110.3],
            [250,103.4],[300,96.5],[343,89.6]],
    minT: -46, maxT: 343,
  },
  {
    id: "a312tp304", spec: "ASTM A312", grade: "TP304",
    desc: "Austenitic SS 304 seamless",
    ferritic: false, defaultE: 1.00, density: 7930, priceTier: 3.0,
    table: [[20,137.9],[100,125.5],[150,117.2],[200,113.1],[250,110.3],
            [300,108.2],[350,106.2],[400,104.8],[450,103.4],[500,100.7],
            [550,96.5],[600,88.3]],
    minT: -196, maxT: 816,
  },
  {
    id: "a312tp316", spec: "ASTM A312", grade: "TP316",
    desc: "Austenitic SS 316 seamless — Mo-enhanced corrosion resistance",
    ferritic: false, defaultE: 1.00, density: 7930, priceTier: 3.5,
    table: [[20,137.9],[100,125.5],[150,120.7],[200,117.2],[250,115.1],
            [300,113.8],[350,113.1],[400,112.4],[450,111.7],[500,111.0],
            [550,110.3],[600,104.8]],
    minT: -196, maxT: 816,
  },
  {
    id: "a312tp316l", spec: "ASTM A312", grade: "TP316L",
    desc: "Austenitic SS 316L seamless — low carbon",
    ferritic: false, defaultE: 1.00, density: 7930, priceTier: 3.2,
    table: [[20,115.1],[100,105.5],[150,100.0],[200,96.5],[250,93.8],
            [300,91.7],[350,90.3],[400,89.6],[450,89.6],[500,89.6]],
    minT: -196, maxT: 816,
  },
  {
    id: "a335p11", spec: "ASTM A335", grade: "P11",
    desc: "1.25Cr-0.5Mo alloy SMLS — elevated temperature service",
    ferritic: true, defaultE: 1.00, density: 7870, priceTier: 2.0,
    table: [[20,103.4],[100,103.4],[150,103.4],[200,103.4],[250,103.4],
            [300,103.4],[350,103.4],[400,101.3],[450,93.1],[500,79.3],
            [550,62.1],[593,48.3]],
    minT: -29, maxT: 593,
  },
  {
    id: "a335p22", spec: "ASTM A335", grade: "P22",
    desc: "2.25Cr-1Mo alloy SMLS — high temperature service",
    ferritic: true, defaultE: 1.00, density: 7870, priceTier: 2.5,
    table: [[20,103.4],[100,103.4],[150,103.4],[200,103.4],[250,103.4],
            [300,103.4],[350,103.4],[400,103.4],[450,103.4],[500,103.4],
            [550,103.4],[593,96.5],[649,72.4]],
    minT: -29, maxT: 649,
  },
];

// ─── Joint quality / weld factors (B31.3 Table 302.3.4) ──────────────────────
const JOINT_FACTORS = [
  { id: "smls",   label: "Seamless (SMLS)",          E: 1.00, note: "No weld — full quality" },
  { id: "erw",    label: "ERW — no radiography",      E: 0.85, note: "Electric resistance weld" },
  { id: "erw_rt", label: "ERW — 100 % radiography",   E: 1.00, note: "Upgraded by full RT" },
  { id: "efw",    label: "EFW — spot radiography",    E: 0.90, note: "Electric fusion weld + spot RT" },
  { id: "efw_rt", label: "EFW — 100 % radiography",   E: 1.00, note: "Full RT upgrade" },
  { id: "fbw",    label: "Furnace butt weld (FBW)",   E: 0.60, note: "Low quality — limited use" },
];

// ─── Pipe schedule data (ASME B36.10M / B36.19M, wall thickness in mm) ────────
interface PipeSize {
  dn: number; od: number;
  schs: { id: string; label: string; t: number }[];
}

const PIPE_SIZES: PipeSize[] = [
  { dn:15,  od:21.3,  schs:[{id:"s5",label:"Sch 5S",t:1.65},{id:"s10",label:"Sch 10",t:2.11},{id:"s40",label:"Sch 40 / STD",t:2.77},{id:"s80",label:"Sch 80 / XS",t:3.73},{id:"s160",label:"Sch 160",t:4.78},{id:"xxs",label:"XXS",t:7.47}]},
  { dn:20,  od:26.7,  schs:[{id:"s5",label:"Sch 5S",t:1.65},{id:"s10",label:"Sch 10",t:2.11},{id:"s40",label:"Sch 40 / STD",t:2.87},{id:"s80",label:"Sch 80 / XS",t:3.91},{id:"s160",label:"Sch 160",t:5.56},{id:"xxs",label:"XXS",t:7.82}]},
  { dn:25,  od:33.4,  schs:[{id:"s5",label:"Sch 5S",t:1.65},{id:"s10",label:"Sch 10",t:2.77},{id:"s40",label:"Sch 40 / STD",t:3.38},{id:"s80",label:"Sch 80 / XS",t:4.55},{id:"s160",label:"Sch 160",t:6.35},{id:"xxs",label:"XXS",t:9.09}]},
  { dn:32,  od:42.2,  schs:[{id:"s5",label:"Sch 5S",t:1.65},{id:"s10",label:"Sch 10",t:2.77},{id:"s40",label:"Sch 40 / STD",t:3.56},{id:"s80",label:"Sch 80 / XS",t:4.85},{id:"s160",label:"Sch 160",t:6.35},{id:"xxs",label:"XXS",t:9.70}]},
  { dn:40,  od:48.3,  schs:[{id:"s5",label:"Sch 5S",t:1.65},{id:"s10",label:"Sch 10",t:2.77},{id:"s40",label:"Sch 40 / STD",t:3.68},{id:"s80",label:"Sch 80 / XS",t:5.08},{id:"s160",label:"Sch 160",t:7.14},{id:"xxs",label:"XXS",t:10.16}]},
  { dn:50,  od:60.3,  schs:[{id:"s5",label:"Sch 5S",t:1.65},{id:"s10",label:"Sch 10",t:2.77},{id:"s40",label:"Sch 40 / STD",t:3.91},{id:"s80",label:"Sch 80 / XS",t:5.54},{id:"s160",label:"Sch 160",t:8.74},{id:"xxs",label:"XXS",t:11.07}]},
  { dn:65,  od:73.0,  schs:[{id:"s5",label:"Sch 5S",t:2.11},{id:"s10",label:"Sch 10",t:3.05},{id:"s40",label:"Sch 40 / STD",t:5.16},{id:"s80",label:"Sch 80 / XS",t:7.01},{id:"s160",label:"Sch 160",t:9.53},{id:"xxs",label:"XXS",t:14.02}]},
  { dn:80,  od:88.9,  schs:[{id:"s5",label:"Sch 5S",t:2.11},{id:"s10",label:"Sch 10",t:3.05},{id:"s40",label:"Sch 40 / STD",t:5.49},{id:"s80",label:"Sch 80 / XS",t:7.62},{id:"s160",label:"Sch 160",t:11.13},{id:"xxs",label:"XXS",t:15.24}]},
  { dn:100, od:114.3, schs:[{id:"s5",label:"Sch 5S",t:2.11},{id:"s10",label:"Sch 10",t:3.05},{id:"s40",label:"Sch 40 / STD",t:6.02},{id:"s80",label:"Sch 80 / XS",t:8.56},{id:"s120",label:"Sch 120",t:11.13},{id:"s160",label:"Sch 160",t:13.49},{id:"xxs",label:"XXS",t:17.12}]},
  { dn:125, od:141.3, schs:[{id:"s5",label:"Sch 5S",t:2.77},{id:"s10",label:"Sch 10",t:3.40},{id:"s40",label:"Sch 40 / STD",t:6.55},{id:"s80",label:"Sch 80 / XS",t:9.53},{id:"s120",label:"Sch 120",t:12.70},{id:"s160",label:"Sch 160",t:15.88},{id:"xxs",label:"XXS",t:19.05}]},
  { dn:150, od:168.3, schs:[{id:"s5",label:"Sch 5S",t:2.77},{id:"s10",label:"Sch 10",t:3.40},{id:"s40",label:"Sch 40 / STD",t:7.11},{id:"s80",label:"Sch 80 / XS",t:10.97},{id:"s120",label:"Sch 120",t:14.27},{id:"s160",label:"Sch 160",t:18.26},{id:"xxs",label:"XXS",t:21.95}]},
  { dn:200, od:219.1, schs:[{id:"s5",label:"Sch 5S",t:2.77},{id:"s10",label:"Sch 10",t:3.76},{id:"s20",label:"Sch 20",t:6.35},{id:"std",label:"STD",t:8.18},{id:"s40",label:"Sch 40",t:8.18},{id:"s60",label:"Sch 60",t:10.31},{id:"s80",label:"Sch 80 / XS",t:12.70},{id:"s100",label:"Sch 100",t:15.09},{id:"s120",label:"Sch 120",t:18.26},{id:"s140",label:"Sch 140",t:20.62},{id:"s160",label:"Sch 160",t:23.01},{id:"xxs",label:"XXS",t:22.23}]},
  { dn:250, od:273.1, schs:[{id:"s5",label:"Sch 5S",t:3.40},{id:"s10",label:"Sch 10",t:4.19},{id:"s20",label:"Sch 20",t:6.35},{id:"std",label:"STD",t:9.27},{id:"xs",label:"XS",t:12.70},{id:"s60",label:"Sch 60",t:12.70},{id:"s80",label:"Sch 80",t:15.09},{id:"s100",label:"Sch 100",t:18.26},{id:"s120",label:"Sch 120",t:21.44},{id:"s140",label:"Sch 140",t:25.40},{id:"s160",label:"Sch 160",t:28.58},{id:"xxs",label:"XXS",t:25.40}]},
  { dn:300, od:323.9, schs:[{id:"s5",label:"Sch 5S",t:4.57},{id:"s10",label:"Sch 10",t:4.57},{id:"s20",label:"Sch 20",t:6.35},{id:"std",label:"STD",t:9.53},{id:"s40",label:"Sch 40",t:10.31},{id:"xs",label:"XS",t:12.70},{id:"s60",label:"Sch 60",t:14.27},{id:"s80",label:"Sch 80",t:17.48},{id:"s100",label:"Sch 100",t:20.62},{id:"s120",label:"Sch 120",t:25.40},{id:"s140",label:"Sch 140",t:28.58},{id:"s160",label:"Sch 160",t:33.32},{id:"xxs",label:"XXS",t:25.40}]},
  { dn:350, od:355.6, schs:[{id:"s5",label:"Sch 5S",t:4.78},{id:"s10",label:"Sch 10",t:6.35},{id:"s20",label:"Sch 20",t:9.53},{id:"std",label:"STD",t:9.53},{id:"xs",label:"XS",t:12.70},{id:"s60",label:"Sch 60",t:15.09},{id:"s80",label:"Sch 80",t:19.05},{id:"s100",label:"Sch 100",t:23.83},{id:"s120",label:"Sch 120",t:27.79},{id:"s140",label:"Sch 140",t:31.75},{id:"s160",label:"Sch 160",t:35.71},{id:"xxs",label:"XXS",t:25.40}]},
  { dn:400, od:406.4, schs:[{id:"s5",label:"Sch 5S",t:4.78},{id:"s10",label:"Sch 10",t:6.35},{id:"s20",label:"Sch 20",t:9.53},{id:"std",label:"STD",t:9.53},{id:"xs",label:"XS",t:12.70},{id:"s40",label:"Sch 40",t:12.70},{id:"s60",label:"Sch 60",t:16.66},{id:"s80",label:"Sch 80",t:21.44},{id:"s100",label:"Sch 100",t:26.19},{id:"s120",label:"Sch 120",t:30.96},{id:"s140",label:"Sch 140",t:36.53},{id:"s160",label:"Sch 160",t:40.49},{id:"xxs",label:"XXS",t:25.40}]},
  { dn:450, od:457.2, schs:[{id:"s5",label:"Sch 5S",t:4.78},{id:"s10",label:"Sch 10",t:6.35},{id:"s20",label:"Sch 20",t:11.13},{id:"std",label:"STD",t:9.53},{id:"xs",label:"XS",t:12.70},{id:"s40",label:"Sch 40",t:14.27},{id:"s60",label:"Sch 60",t:19.05},{id:"s80",label:"Sch 80",t:23.83},{id:"s100",label:"Sch 100",t:29.36},{id:"s120",label:"Sch 120",t:34.93},{id:"s140",label:"Sch 140",t:39.67},{id:"s160",label:"Sch 160",t:45.24}]},
  { dn:500, od:508.0, schs:[{id:"s5",label:"Sch 5S",t:4.78},{id:"s10",label:"Sch 10",t:6.35},{id:"s20",label:"Sch 20",t:12.70},{id:"std",label:"STD",t:9.53},{id:"xs",label:"XS",t:12.70},{id:"s40",label:"Sch 40",t:15.09},{id:"s60",label:"Sch 60",t:20.62},{id:"s80",label:"Sch 80",t:26.19},{id:"s100",label:"Sch 100",t:32.54},{id:"s120",label:"Sch 120",t:38.10},{id:"s140",label:"Sch 140",t:44.45},{id:"s160",label:"Sch 160",t:50.01}]},
  { dn:600, od:609.6, schs:[{id:"s5",label:"Sch 5S",t:5.54},{id:"s10",label:"Sch 10",t:6.35},{id:"s20",label:"Sch 20",t:14.27},{id:"std",label:"STD",t:9.53},{id:"xs",label:"XS",t:12.70},{id:"s40",label:"Sch 40",t:17.48},{id:"s60",label:"Sch 60",t:24.61},{id:"s80",label:"Sch 80",t:30.96},{id:"s100",label:"Sch 100",t:38.89},{id:"s120",label:"Sch 120",t:46.02},{id:"s140",label:"Sch 140",t:52.37},{id:"s160",label:"Sch 160",t:59.54}]},
];

// ─── Indicative CS pipe base prices (ZAR/m, Q2 2025, STD wall) ───────────────
const CS_BASE_PRICE_ZAR: Partial<Record<number, number>> = {
  15:58, 20:72, 25:88, 32:118, 40:148, 50:192, 65:258, 80:328,
  100:445, 125:612, 150:805, 200:1220, 250:1750, 300:2330,
  350:2980, 400:3650, 450:4400, 500:5200, 600:7100,
};

function interpPrice(dn: number): number | null {
  const keys = Object.keys(CS_BASE_PRICE_ZAR).map(Number).sort((a, b) => a - b);
  if (CS_BASE_PRICE_ZAR[dn]) return CS_BASE_PRICE_ZAR[dn]!;
  if (dn < keys[0]) return CS_BASE_PRICE_ZAR[keys[0]]!;
  if (dn > keys[keys.length - 1]) return CS_BASE_PRICE_ZAR[keys[keys.length - 1]]!;
  for (let i = 0; i < keys.length - 1; i++) {
    if (dn >= keys[i] && dn <= keys[i + 1]) {
      const t = (dn - keys[i]) / (keys[i + 1] - keys[i]);
      return (CS_BASE_PRICE_ZAR[keys[i]]! + t * (CS_BASE_PRICE_ZAR[keys[i + 1]]! - CS_BASE_PRICE_ZAR[keys[i]]!));
    }
  }
  return null;
}

function pipeUnitPrice(dn: number, mat: Material, tSch: number, tStd: number): number | null {
  const base = interpPrice(dn);
  if (base === null) return null;
  const wtFactor = tStd > 0 ? Math.max(0.8, Math.min(3.0, tSch / tStd)) : 1.0;
  return base * mat.priceTier * wtFactor;
}

function pipeWeightPerM(od_mm: number, t_mm: number, rho: number): number {
  const id = od_mm - 2 * t_mm;
  return (Math.PI / 4) * ((od_mm / 1000) ** 2 - (id / 1000) ** 2) * rho;
}

// ─── Shared UI helpers ─────────────────────────────────────────────────────────
const SEL = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const INP = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500";

function fmt(n: number, dp = 2): string {
  return isFinite(n) ? n.toFixed(dp) : "—";
}

// Proper HTML subscript — avoids underscores in rendered text
function Tsub({ label }: { label: string }) {
  const parts = label.split("_");
  if (parts.length === 1) return <span className="font-mono">{label}</span>;
  return (
    <span className="font-mono">
      {parts[0]}<sub className="text-[0.7em]">{parts.slice(1).join("_")}</sub>
    </span>
  );
}

function SideLabel({ n, children }: { n: number | string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">{n}</span>
      <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{children}</span>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionHead({ title, sub, accent = "blue" }: { title: string; sub?: string; accent?: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500", green: "bg-green-500", gray: "bg-gray-400 dark:bg-gray-500",
    amber: "bg-amber-500", indigo: "bg-indigo-500",
  };
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className={`w-1 self-stretch min-h-[2rem] rounded-full flex-shrink-0 ${colors[accent] ?? colors.blue}`} />
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
        {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PipeWallPage() {
  // ── Inputs ─────────────────────────────────────────────────────────────────
  const [code,       setCode]       = useState<"B31.3" | "B31.1">("B31.3");
  const [dnIdx,      setDnIdx]      = useState(8);          // DN100 default
  const [customOD,   setCustomOD]   = useState("");
  const [useCustom,  setUseCustom]  = useState(false);
  const [matIdx,     setMatIdx]     = useState(0);
  const [jfIdx,      setJfIdx]      = useState(0);
  const [pressVal,   setPressVal]   = useState("");
  const [pressUnit,  setPressUnit]  = useState("MPa");
  const [tempVal,    setTempVal]    = useState("");
  const [tempUnit,   setTempUnit]   = useState("°C");
  const [corrMm,     setCorrMm]     = useState("1.5");
  const [mechMm,     setMechMm]     = useState("0");
  const [millTol,    setMillTol]    = useState("12.5");
  const [pipeLen,    setPipeLen]    = useState("");          // optional length for weight/cost
  const [copied,     setCopied]     = useState(false);

  // ── Shortcuts ──────────────────────────────────────────────────────────────
  const pipe = PIPE_SIZES[dnIdx];
  const mat  = MATERIALS[matIdx];
  const jf   = JOINT_FACTORS[jfIdx];

  // ── Standard (STD) wall for this DN — used as weight/price reference ────────
  const tStd = useMemo(() => {
    const s = pipe.schs.find(s => s.id === "s40" || s.id === "std") ?? pipe.schs[0];
    return s?.t ?? 1;
  }, [pipe]);

  // ── Main computation ────────────────────────────────────────────────────────
  const result = useMemo(() => {
    const P  = parseFloat(pressVal) * (TO_MPA[pressUnit] ?? 1);
    const T  = TO_C[tempUnit]?.(parseFloat(tempVal)) ?? parseFloat(tempVal);
    const D  = useCustom ? parseFloat(customOD) : pipe.od;
    const c  = (parseFloat(corrMm) || 0) + (parseFloat(mechMm) || 0);
    const E  = jf.E;
    const mt = parseFloat(millTol) / 100;

    if (!isFinite(P) || P <= 0) return null;
    if (!isFinite(T))            return null;
    if (!isFinite(D) || D <= 0)  return null;

    if (T < mat.minT || T > mat.maxT)
      return { error: `Temperature ${T.toFixed(0)} °C is outside material range (${mat.minT} to ${mat.maxT} °C)` };

    const S = interpolate(T, mat.table);
    if (S === null || S <= 0)
      return { error: "Cannot determine allowable stress — check temperature." };

    const Y    = yCoeff(T, mat.ferritic);
    const calc = calcThickness(P, D, S, E, Y, c);
    if (!calc)
      return { error: "Invalid inputs — check pressure and material values." };

    const { t, tm } = calc;
    const tOrd = tm / (1 - mt);

    const sorted = !useCustom ? [...pipe.schs].sort((a, b) => a.t - b.t) : [];

    const tableRows = sorted.map(s => {
      const id_mm  = D - 2 * s.t;
      const pass   = s.t >= tOrd;
      const margin = ((s.t - tOrd) / tOrd) * 100;
      const mawp   = calcMAWP(s.t, D, S, E, Y, c);
      const wPerM  = pipeWeightPerM(D, s.t, mat.density);
      return { label: s.label, t: s.t, id_mm, pass, margin, mawp, wPerM };
    });

    const recommended = tableRows.find(r => r.pass) ?? null;

    // Weight & cost for recommended schedule
    const L     = parseFloat(pipeLen) || 0;
    const wPerM = recommended ? pipeWeightPerM(D, recommended.t, mat.density) : null;
    const wTot  = wPerM !== null && L > 0 ? wPerM * L : null;
    const uPrice = !useCustom && recommended
      ? pipeUnitPrice(pipe.dn, mat, recommended.t, tStd)
      : null;
    const totalCost = uPrice !== null && L > 0 ? uPrice * L : null;

    return { P, T, D, S, E, Y, c, t, tm, tOrd, mt, recommended, tableRows,
             hasCustom: useCustom, wPerM, wTot, uPrice, totalCost, L };
  }, [pressVal, pressUnit, tempVal, tempUnit, dnIdx, useCustom, customOD,
      matIdx, jfIdx, corrMm, mechMm, millTol, pipeLen, pipe, mat, jf, tStd]);

  const hasError = result !== null && "error" in result;
  type GoodResult = Exclude<typeof result, null | { error: string }>;
  const res: GoodResult | null = result && !hasError ? result as GoodResult : null;

  function copySpec() {
    if (!res?.recommended) return;
    const text = `DN${pipe.dn} × ${res.recommended.label} · ${mat.spec} ${mat.grade} · ${jf.label.split("—")[0].trim()}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="mb-1">
            <Link href="/design" className="text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              ← Design
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pipe Wall Thickness</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ASME {code} minimum required wall · schedule selection · MAWP · pipe weight · indicative cost
          </p>
        </div>
        <div className="flex rounded-xl overflow-hidden border border-gray-300 dark:border-gray-600 flex-shrink-0">
          {(["B31.3", "B31.1"] as const).map(c => (
            <button key={c} onClick={() => setCode(c)}
              className={`px-4 py-2 text-sm font-bold transition-colors ${
                code === c ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-5 items-start">

        {/* ══ SIDEBAR ══════════════════════════════════════════════════════════ */}
        <aside className="w-80 flex-shrink-0 space-y-4 sticky top-20 max-h-[calc(100vh-7rem)] overflow-y-auto pb-4">

          {/* 1. Pipe specification */}
          <Card>
            <SideLabel n={1}>Pipe Specification</SideLabel>
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 flex-1">Nominal size / OD</p>
                <div className="flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600 text-xs">
                  <button onClick={() => setUseCustom(false)}
                    className={`px-2 py-0.5 ${!useCustom ? "bg-blue-500 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                    DN
                  </button>
                  <button onClick={() => setUseCustom(true)}
                    className={`px-2 py-0.5 ${useCustom ? "bg-blue-500 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                    Custom OD
                  </button>
                </div>
              </div>

              {useCustom ? (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Outside diameter (mm)</p>
                  <input type="number" value={customOD} onChange={e => setCustomOD(e.target.value)}
                    placeholder="e.g. 219.1" className={INP} />
                </div>
              ) : (
                <div>
                  <select value={dnIdx} onChange={e => setDnIdx(Number(e.target.value))} className={SEL}>
                    {PIPE_SIZES.map((p, i) => (
                      <option key={i} value={i}>DN{p.dn} — OD {p.od} mm</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pipe material</p>
                <select value={matIdx} onChange={e => setMatIdx(Number(e.target.value))} className={SEL}>
                  {MATERIALS.map((m, i) => (
                    <option key={i} value={i}>{m.spec} {m.grade}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{mat.desc}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Weld / joint type</p>
                <select value={jfIdx} onChange={e => setJfIdx(Number(e.target.value))} className={SEL}>
                  {JOINT_FACTORS.map((j, i) => (
                    <option key={i} value={i}>{j.label} (E = {j.E})</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{jf.note}</p>
              </div>
            </div>
          </Card>

          {/* 2. Design conditions */}
          <Card>
            <SideLabel n={2}>Design Conditions</SideLabel>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Design pressure (gauge)</p>
                <div className="flex gap-2">
                  <input type="number" value={pressVal} onChange={e => setPressVal(e.target.value)}
                    placeholder="e.g. 10" className={`flex-1 ${INP}`} />
                  <select value={pressUnit} onChange={e => setPressUnit(e.target.value)}
                    className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {["MPa","bar","kPa","psi"].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Design temperature</p>
                <div className="flex gap-2">
                  <input type="number" value={tempVal} onChange={e => setTempVal(e.target.value)}
                    placeholder="e.g. 200" className={`flex-1 ${INP}`} />
                  <select value={tempUnit} onChange={e => setTempUnit(e.target.value)}
                    className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {["°C","°F"].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                {res && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    S = {fmt(res.S, 1)} MPa at {fmt(res.T, 0)} °C · Y = {res.Y} · E = {res.E}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* 3. Allowances */}
          <Card>
            <SideLabel n={3}>Allowances &amp; Tolerances</SideLabel>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Corrosion / erosion allowance (mm)</p>
                <input type="number" value={corrMm} onChange={e => setCorrMm(e.target.value)}
                  placeholder="1.5" step="0.5" className={INP} />
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Typical: 1.5 mm mild service, 3 mm moderate</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Mechanical allowance (mm)</p>
                <input type="number" value={mechMm} onChange={e => setMechMm(e.target.value)}
                  placeholder="0" step="0.5" className={INP} />
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Threading, grooving, bending. 0 for plain-end.</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Mill tolerance (%)</p>
                <input type="number" value={millTol} onChange={e => setMillTol(e.target.value)}
                  placeholder="12.5" className={INP} />
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">ASME B36.10: 12.5 %</p>
              </div>
            </div>
          </Card>

          {/* 4. Quantity (optional) */}
          <Card>
            <SideLabel n={4}>Quantity (optional)</SideLabel>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pipe length (m)</p>
              <input type="number" value={pipeLen} onChange={e => setPipeLen(e.target.value)}
                placeholder="e.g. 50" className={INP} />
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                Used to calculate total weight and indicative cost.
              </p>
            </div>
          </Card>

          {/* Disclaimer */}
          <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
              <strong>Indicative only.</strong> Allowable stresses are representative of ASME {code} Appendix A.
              Verify against the current code edition before use in design or procurement.
            </p>
          </div>
        </aside>

        {/* ══ RESULTS ══════════════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Empty state */}
          {!result && (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-500 dark:text-gray-400">Enter design pressure and temperature</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Results update live as you type</p>
            </div>
          )}

          {/* Error state */}
          {hasError && (
            <div className="flex items-start gap-3 px-5 py-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
              <span className="text-red-500 text-xl flex-shrink-0">⚠</span>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                {(result as { error: string }).error}
              </p>
            </div>
          )}

          {res && (
            <>
              {/* ── Formula & substituted values ─────────────────────────── */}
              <Card>
                <SectionHead
                  title={`${code} Eq. ${code === "B31.3" ? "304.1.2(a)" : "104.1.2(A)"}`}
                  sub="Minimum wall thickness for internal pressure"
                />

                {/* Formula lines */}
                <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-4 py-3 mb-4 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 font-sans">
                    Formula (pressure term + allowances):
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-mono">t = P·D / [2·(S·E + P·Y)]</span>
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-mono">t<sub>m</sub> = t + c</span>
                    <span className="text-xs text-gray-400 ml-2">(add corrosion + mechanical allowances)</span>
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-mono">t<sub>ord</sub> = t<sub>m</sub> / (1 − mill tolerance)</span>
                    <span className="text-xs text-gray-400 ml-2">(minimum ordered wall)</span>
                  </p>
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                    <p className="text-sm text-gray-800 dark:text-gray-200 font-mono">
                      t<sub>m</sub> = ({fmt(res.P,3)} × {fmt(res.D,1)}) / [2 × ({fmt(res.S,1)} × {res.E} + {fmt(res.P,3)} × {res.Y})]
                      + {fmt(res.c,1)} = <strong className="text-blue-600 dark:text-blue-400">{fmt(res.tm, 3)} mm</strong>
                    </p>
                    <p className="text-sm text-gray-800 dark:text-gray-200 font-mono mt-1">
                      t<sub>ord</sub> = {fmt(res.tm, 3)} / (1 − {(res.mt * 100).toFixed(1)}%) = <strong className="text-indigo-600 dark:text-indigo-400">{fmt(res.tOrd, 3)} mm</strong>
                    </p>
                  </div>
                </div>

                {/* Key parameter chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "P (MPa)",   value: fmt(res.P, 3)  },
                    { label: "D (mm)",    value: fmt(res.D, 1)  },
                    { label: "S (MPa)",   value: fmt(res.S, 1)  },
                    { label: "E",         value: String(res.E)  },
                    { label: "Y",         value: String(res.Y)  },
                    { label: "c (mm)",    value: fmt(res.c, 1)  },
                    { label: "Mill tol", value: `${(res.mt*100).toFixed(1)}%` },
                    { label: "T (°C)",    value: fmt(res.T, 0)  },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{item.label}</p>
                      <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* ── Thickness summary boxes ───────────────────────────────── */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">Pressure term t</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{fmt(res.t, 2)} <span className="text-sm">mm</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">Before allowances</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
                  <p className="text-xs font-semibold text-blue-500 dark:text-blue-400 mb-1">
                    Min required t<sub>m</sub>
                  </p>
                  <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{fmt(res.tm, 2)} <span className="text-sm">mm</span></p>
                  <p className="text-xs text-blue-500/70 dark:text-blue-400/70 mt-0.5">After allowances c = {fmt(res.c,1)} mm</p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 p-4">
                  <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 mb-1">
                    Min ordered t<sub>ord</sub>
                  </p>
                  <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{fmt(res.tOrd, 2)} <span className="text-sm">mm</span></p>
                  <p className="text-xs text-indigo-500/70 dark:text-indigo-400/70 mt-0.5">{(res.mt*100).toFixed(1)}% mill tolerance applied</p>
                </div>
              </div>

              {/* ── Schedule selection table (with MAWP) ─────────────────── */}
              {!res.hasCustom && res.tableRows.length > 0 && (
                <Card>
                  <SectionHead
                    title="Schedule Selection"
                    sub={`DN${pipe.dn} (OD ${fmt(pipe.od,1)} mm) · ${mat.spec} ${mat.grade} · ${jf.label.split("—")[0].trim()}`}
                  />

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b-2 border-gray-200 dark:border-gray-700">
                          <th className="text-left pb-2 pr-2">Schedule</th>
                          <th className="text-right pb-2 pr-2">t (mm)</th>
                          <th className="text-right pb-2 pr-2">ID (mm)</th>
                          <th className="text-right pb-2 pr-2">
                            vs t<sub>ord</sub>
                          </th>
                          <th className="text-right pb-2 pr-2">MAWP (MPa)</th>
                          <th className="text-right pb-2 pr-2">kg/m</th>
                          <th className="text-right pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {res.tableRows.map((row) => {
                          const isRec = res.recommended?.label === row.label;
                          return (
                            <tr key={row.label}
                              className={`border-b border-gray-100 dark:border-gray-700/50 last:border-0 ${
                                isRec ? "bg-green-50 dark:bg-green-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                              }`}>
                              <td className={`py-2.5 pr-2 font-semibold ${isRec ? "text-green-700 dark:text-green-300" : "text-gray-800 dark:text-gray-200"}`}>
                                {row.label}
                                {isRec && (
                                  <span className="ml-2 text-[9px] px-1.5 py-0.5 bg-green-500 text-white rounded-full font-bold uppercase tracking-wide">
                                    ✓
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 pr-2 text-right font-mono text-gray-700 dark:text-gray-300">{fmt(row.t, 2)}</td>
                              <td className="py-2.5 pr-2 text-right font-mono text-gray-500 dark:text-gray-400">{fmt(row.id_mm, 1)}</td>
                              <td className={`py-2.5 pr-2 text-right font-mono text-sm ${
                                row.pass ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"
                              }`}>
                                {row.pass ? `+${fmt(row.margin, 0)}%` : `${fmt(row.margin, 0)}%`}
                              </td>
                              <td className="py-2.5 pr-2 text-right font-mono text-gray-700 dark:text-gray-300">
                                {row.mawp !== null ? fmt(row.mawp, 2) : "—"}
                              </td>
                              <td className="py-2.5 pr-2 text-right font-mono text-gray-500 dark:text-gray-400">
                                {fmt(row.wPerM, 2)}
                              </td>
                              <td className="py-2.5 text-right">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                  row.pass
                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                    : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                }`}>
                                  {row.pass ? "PASS" : "FAIL"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3">
                    MAWP = maximum allowable working pressure for each schedule at current S, E, Y, and allowances.
                    t<sub>ord</sub> = {fmt(res.tOrd, 2)} mm minimum ordered wall (t<sub>m</sub> grossed up for {(res.mt*100).toFixed(1)}% mill tolerance).
                  </p>

                  {!res.recommended && (
                    <div className="mt-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300 font-medium">
                      ⚠ No standard schedule adequate. A custom fabricated wall or higher pressure class is required.
                    </div>
                  )}
                </Card>
              )}

              {/* ── Recommended specification output card ─────────────────── */}
              {res.recommended && !res.hasCustom && (
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 rounded-2xl p-6 text-white">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">
                        {code} Recommended Pipe Specification
                      </p>
                      <p className="text-2xl font-black">
                        DN{pipe.dn} × {res.recommended.label}
                      </p>
                      <p className="text-blue-100 text-sm mt-0.5">
                        {mat.spec} {mat.grade} · {jf.label.split("—")[0].trim()}
                      </p>
                    </div>
                    <button onClick={copySpec}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-colors">
                      {copied ? (
                        <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copied!</>
                      ) : (
                        <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy spec</>
                      )}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "OD",                  value: `${fmt(pipe.od,1)} mm` },
                      { label: "Wall t",              value: `${fmt(res.recommended.t,2)} mm` },
                      { label: "tₘ required",    value: `${fmt(res.tm,2)} mm` },
                      { label: "MAWP",                value: res.recommended ? `${fmt(res.tableRows.find(r=>r.label===res.recommended?.label)?.mawp ?? NaN, 2)} MPa` : "—" },
                    ].map(item => (
                      <div key={item.label} className="bg-white/15 rounded-xl px-3 py-2.5">
                        <p className="text-blue-100 text-[10px] mb-0.5">{item.label}</p>
                        <p className="text-white font-bold text-sm">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom OD result */}
              {res.hasCustom && (
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
                  <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-2">{code} Required Wall Thickness</p>
                  <p className="text-2xl font-black mb-1">
                    t<sub>m</sub> = {fmt(res.tm, 2)} mm
                  </p>
                  <p className="text-blue-100 text-sm">
                    Min ordered: {fmt(res.tOrd, 2)} mm (after {(res.mt*100).toFixed(1)}% mill tolerance)
                  </p>
                  <p className="text-blue-200 text-xs mt-2">
                    Select a schedule with t ≥ {fmt(res.tOrd, 2)} mm for OD {fmt(res.D, 1)} mm.
                  </p>
                </div>
              )}

              {/* ── Weight & cost ─────────────────────────────────────────── */}
              {res.wPerM !== null && res.recommended && (
                <Card>
                  <SectionHead title="Pipe Weight &amp; Indicative Cost" accent="green"
                    sub={`${mat.spec} ${mat.grade} · DN${pipe.dn} × ${res.recommended.label} · ρ = ${mat.density.toLocaleString()} kg/m³`} />

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4">
                      <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">Unit weight</p>
                      <p className="text-xl font-black text-green-700 dark:text-green-300">{fmt(res.wPerM,2)} <span className="text-sm">kg/m</span></p>
                    </div>
                    {res.wTot !== null ? (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4">
                        <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">Total weight</p>
                        <p className="text-xl font-black text-green-700 dark:text-green-300">{fmt(res.wTot,0)} <span className="text-sm">kg</span></p>
                        <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-0.5">for {fmt(res.L,0)} m</p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4 flex items-center justify-center">
                        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Enter length for total weight</p>
                      </div>
                    )}
                    {res.uPrice !== null ? (
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Unit cost</p>
                        <p className="text-xl font-black text-amber-700 dark:text-amber-300">
                          R {res.uPrice.toLocaleString("en-ZA", {maximumFractionDigits:0})} <span className="text-sm">/m</span>
                        </p>
                        <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">ZAR, indicative</p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4 flex items-center justify-center">
                        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Cost N/A for custom OD</p>
                      </div>
                    )}
                    {res.totalCost !== null ? (
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Total cost</p>
                        <p className="text-xl font-black text-amber-700 dark:text-amber-300">
                          R {res.totalCost.toLocaleString("en-ZA", {maximumFractionDigits:0})}
                        </p>
                        <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">for {fmt(res.L,0)} m</p>
                      </div>
                    ) : res.uPrice !== null ? (
                      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4 flex items-center justify-center">
                        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Enter length for total cost</p>
                      </div>
                    ) : null}
                  </div>

                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    Weight calculated from OD–ID geometry at {mat.density.toLocaleString()} kg/m³.
                    {res.uPrice !== null && " Cost is indicative ZAR Q2 2025 · schedule premium based on wall-to-STD ratio · ±25% typical variation. Obtain supplier quotations before procurement."}
                  </p>
                </Card>
              )}

              {/* ── Material stress table ─────────────────────────────────── */}
              <Card>
                <SectionHead title={`${mat.spec} ${mat.grade} — Allowable Stress S vs Temperature`} accent="gray"
                  sub={`${mat.desc} · Min ${mat.minT} °C · Max ${mat.maxT} °C`} />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left pb-2 pr-3">T (°C)</th>
                        {mat.table.map(([T]) => (
                          <th key={T} className={`text-right pb-2 px-2 ${res && Math.abs(T - res.T) < 1 ? "text-blue-600 dark:text-blue-400" : ""}`}>
                            {T}°
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-2 pr-3 text-gray-500 dark:text-gray-400 text-xs">S (MPa)</td>
                        {mat.table.map(([T, S]) => (
                          <td key={T} className={`py-2 px-2 text-right font-mono text-sm font-semibold ${
                            res && Math.abs(T - res.T) < 1
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-gray-700 dark:text-gray-300"
                          }`}>
                            {S}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                  Representative values from ASME {code} Appendix A, Table A-1. Verify against current code edition.
                </p>
              </Card>
            </>
          )}

          <References refs={REFS_PIPE_WALL} />
        </div>
      </div>
    </div>
  );
}
