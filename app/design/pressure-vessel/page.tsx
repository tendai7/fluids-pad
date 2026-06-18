"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { References } from "@/components/References";
import { REFS_PRESSURE_VESSEL } from "@/lib/references";

// jsPDF-autotable does not export its extended type, so we use this alias.
type JsPDFWithAutoTable = { lastAutoTable: { finalY: number } };

// ─── Physics — ASME VIII Division 1 ──────────────────────────────────────────
// UG-27 Cylindrical shell under internal pressure
// t = P·R / (S·E − 0.6·P)   →   MAWP = S·E·t / (R + 0.6·t)
function shellThickness(P: number, R: number, S: number, E: number): number {
  const d = S * E - 0.6 * P;
  return d > 0 ? (P * R) / d : Infinity;
}
function shellMAWP(t: number, R: number, S: number, E: number): number {
  return (S * E * t) / (R + 0.6 * t);
}

// UG-32(d) 2:1 Semi-ellipsoidal head
// t = P·D / (2·S·E − 0.2·P)
function ellipHead(P: number, D: number, S: number, E: number): number {
  const d = 2 * S * E - 0.2 * P;
  return d > 0 ? (P * D) / d : Infinity;
}
function ellipMAWP(t: number, D: number, S: number, E: number): number {
  return (2 * S * E * t) / (D + 0.2 * t);
}

// UG-32(f) Hemispherical head
// t = P·R / (2·S·E − 0.2·P)
function hemiHead(P: number, R: number, S: number, E: number): number {
  const d = 2 * S * E - 0.2 * P;
  return d > 0 ? (P * R) / d : Infinity;
}
function hemiMAWP(t: number, R: number, S: number, E: number): number {
  return (2 * S * E * t) / (R + 0.2 * t);
}

// UG-32(e) ASME Flanged & Dished (torispherical) head
// t = 0.885·P·L / (S·E − 0.1·P)   where L = crown radius (= OD for std head)
function toriHead(P: number, L: number, S: number, E: number): number {
  const d = S * E - 0.1 * P;
  return d > 0 ? (0.885 * P * L) / d : Infinity;
}
function toriMAWP(t: number, L: number, S: number, E: number): number {
  return (S * E * t) / (0.885 * L + 0.1 * t);
}

// UG-34 Flat head  t = d · √(C·P/(S·E))  — C = 0.13 (welded full pen)
function flatHead(P: number, d: number, S: number, E: number, C = 0.13): number {
  return d * Math.sqrt((C * P) / (S * E));
}
function flatMAWP(t: number, d: number, S: number, E: number, C = 0.13): number {
  return (t / d) ** 2 * (S * E) / C;
}

// Volume helpers (m³) — internal volume including dome
function shellVolume(ID_m: number, L_m: number): number {
  return Math.PI * (ID_m / 2) ** 2 * L_m;
}
function ellipHeadVolume(ID_m: number): number {
  // 2:1 semi-ellipsoidal: V = π·D³/24
  return (Math.PI / 24) * ID_m ** 3;
}
function toriHeadVolume(ID_m: number): number {
  // Standard ASME F&D (L=D, r=0.06D): V ≈ 0.0847·D³
  return 0.0847 * ID_m ** 3;
}
function hemiHeadVolume(ID_m: number): number {
  // Hemisphere: V = π·D³/12
  return (Math.PI / 12) * ID_m ** 3;
}
// flatHeadVolume ≈ 0 (flat head adds no dome volume)

// Head depth (straight-face to crown, inside dimension)
function headDepth(ID_m: number, type: string): number {
  switch (type) {
    case "ellip": return ID_m / 4;               // D/4 for 2:1 ellipsoidal
    case "hemi":  return ID_m / 2;               // D/2 hemisphere
    case "tori":  return 0.1936 * ID_m;          // standard ASME F&D
    default:      return 0;                       // flat head — negligible
  }
}

// Weight helpers (kg)  — density × volume of metal
function shellWeight(ID_m: number, t_m: number, L_m: number, rho: number): number {
  const OD = ID_m + 2 * t_m;
  return (Math.PI / 4) * (OD ** 2 - ID_m ** 2) * L_m * rho;
}
function headWeight(ID_m: number, t_m: number, headType: string, rho: number): number {
  // Approximation: ellipsoidal head ≈ 1.09 × flat circular disc of same ID
  const r   = ID_m / 2;
  const area_flat = Math.PI * r * r;
  const factor = headType === "ellip" ? 1.09 : headType === "hemi" ? 1.57 : headType === "tori" ? 1.05 : 1.00;
  return area_flat * t_m * factor * rho;
}

// ─── Material data (representative ASME Section II Part D values, MPa) ─────────
interface PVMaterial {
  id: string; spec: string; grade: string; desc: string;
  density: number;   // kg/m³
  table: [number, number][];  // [T °C, S MPa]
  maxT: number;
}

const PV_MATERIALS: PVMaterial[] = [
  {
    id: "sa516_70", spec: "SA-516", grade: "Grade 70",
    desc: "CS pressure vessel plate — most common general service",
    density: 7850,
    table: [[20,137.9],[150,137.9],[200,137.9],[250,130.3],[300,123.4],[350,116.0],[400,102.7],[425,82.7]],
    maxT: 425,
  },
  {
    id: "sa516_60", spec: "SA-516", grade: "Grade 60",
    desc: "CS pressure vessel plate — lower strength",
    density: 7850,
    table: [[20,118.6],[150,118.6],[200,118.6],[250,112.4],[300,106.2],[350,100.0],[400,89.6]],
    maxT: 400,
  },
  {
    id: "sa240_304", spec: "SA-240", grade: "Type 304",
    desc: "Austenitic SS 304 plate — general corrosive service",
    density: 7930,
    table: [[20,138.0],[150,126.2],[200,120.0],[250,115.1],[300,112.4],[350,109.6],[400,108.2],[450,107.6],[500,107.6]],
    maxT: 815,
  },
  {
    id: "sa240_316l", spec: "SA-240", grade: "Type 316L",
    desc: "Austenitic SS 316L plate — low carbon, excellent corrosion resistance",
    density: 7930,
    table: [[20,115.1],[150,103.4],[200,98.6],[250,95.1],[300,92.4],[350,90.3],[400,89.6],[450,89.6],[500,89.6]],
    maxT: 815,
  },
  {
    id: "sa387_gr11", spec: "SA-387", grade: "Grade 11 Cl 2",
    desc: "1.25Cr-0.5Mo alloy plate — elevated temperature service",
    density: 7870,
    table: [[20,137.9],[150,137.9],[200,137.9],[250,137.9],[300,137.9],[350,137.9],[400,133.8],[450,122.7],[500,105.5],[550,82.7]],
    maxT: 593,
  },
  {
    id: "sa387_gr22", spec: "SA-387", grade: "Grade 22 Cl 2",
    desc: "2.25Cr-1Mo alloy plate — high temperature service",
    density: 7870,
    table: [[20,137.9],[150,137.9],[200,137.9],[250,137.9],[300,137.9],[350,137.9],[400,137.9],[450,137.9],[500,137.9],[550,131.0],[593,115.1]],
    maxT: 649,
  },
];

// ─── Weld joint efficiency (ASME VIII Div.1 Table UW-12) ─────────────────────
const JOINT_EFFICIENCIES = [
  { id: "rt1", label: "Full radiography (RT-1)",   E: 1.00, note: "Highest quality. Required for lethal service." },
  { id: "rt2", label: "Spot radiography (RT-2)",   E: 0.85, note: "Typical for most process vessels." },
  { id: "rt3", label: "No radiography (RT-3)",     E: 0.70, note: "Spot-checked welds or Category C/D joints only." },
];

// ─── Head types ───────────────────────────────────────────────────────────────
const HEAD_TYPES = [
  { id: "ellip",  label: "2:1 Semi-ellipsoidal",       note: "Standard for most pressure vessels. Best strength-to-weight." },
  { id: "hemi",   label: "Hemispherical",               note: "Thinnest wall of any head type. Used on high-pressure vessels." },
  { id: "tori",   label: "ASME Flanged & Dished (F&D)", note: "Slightly heavier than ellipsoidal. Easier to form for large diameters." },
  { id: "flat",   label: "Flat head",                   note: "Heaviest option. Only for low pressure or small diameter." },
];

// ─── Flat head C-factor (UG-34 Table UG-34 / Fig UG-34.1) ────────────────────
const FLAT_C_OPTIONS = [
  { label: "0.13 — Welded, full penetration butt joint",      C: 0.13  },
  { label: "0.162 — Bolted, full-face gasket, circular",      C: 0.162 },
  { label: "0.20 — Welded, partial penetration",              C: 0.20  },
  { label: "0.25 — Screwed-in cover or plug",                 C: 0.25  },
  { label: "0.30 — Screwed-in cover, threaded engagement",    C: 0.30  },
];

// ─── Standard plate thicknesses (mm, per ASME/commercial availability) ────────
const PLATE_THICKNESSES_MM = [
  6, 8, 10, 12, 14, 16, 18, 19, 20, 22, 25, 28, 30, 32, 36, 38, 40, 44, 50, 55, 60, 65, 70, 75, 80, 90, 100,
];

// ─── Indicative vessel cost (ZAR, CS material, shop-fabricated) ───────────────
// Rough estimate: cost per kg of vessel weight × material factor
const COST_PER_KG_ZAR = 120;    // CS shop-fabricated including overhead
const MAT_COST_FACTOR: Record<string, number> = {
  sa516_70: 1.00, sa516_60: 0.95,
  sa240_304: 3.20, sa240_316l: 3.80,
  sa387_gr11: 1.90, sa387_gr22: 2.40,
};

// ─── Unit helpers ─────────────────────────────────────────────────────────────
function interpolateStress(mat: PVMaterial, T_C: number): number | null {
  const table = mat.table;
  if (T_C > mat.maxT) return null;
  if (T_C <= table[0][0]) return table[0][1];
  if (T_C >= table[table.length - 1][0]) return table[table.length - 1][1];
  for (let i = 0; i < table.length - 1; i++) {
    const [t0, s0] = table[i], [t1, s1] = table[i + 1];
    if (T_C >= t0 && T_C <= t1) {
      return s0 + ((T_C - t0) / (t1 - t0)) * (s1 - s0);
    }
  }
  return null;
}

function nextPlate(t_req_mm: number): number | null {
  return PLATE_THICKNESSES_MM.find(t => t >= t_req_mm) ?? null;
}

const TO_MPA: Record<string, number> = { MPa: 1, bar: 0.1, kPa: 0.001, psi: 0.006895 };
const TO_MM:  Record<string, number> = { mm: 1, m: 1000, in: 25.4, ft: 304.8 };

function fmt(n: number, dp = 2): string { return isFinite(n) ? n.toFixed(dp) : "—"; }

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

// ─── Shared UI ─────────────────────────────────────────────────────────────────
const SEL = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";
const INP = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 ${className}`}>{children}</div>;
}
function SideLabel({ n, children }: { n: number | string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-5 h-5 rounded-md bg-violet-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">{n}</span>
      <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{children}</span>
    </div>
  );
}
function SecHead({ title, sub, accent = "violet" }: { title: string; sub?: string; accent?: string }) {
  const bars: Record<string, string> = {
    violet: "bg-violet-500", blue: "bg-blue-500", green: "bg-green-500",
    amber: "bg-amber-500", gray: "bg-gray-400 dark:bg-gray-500", red: "bg-red-500",
  };
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className={`w-1 self-stretch min-h-[2rem] rounded-full flex-shrink-0 ${bars[accent] ?? bars.violet}`} />
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
        {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PressureVesselPage() {
  // ── Design conditions ─────────────────────────────────────────────────────
  const [pressVal,   setPressVal]   = useState("");
  const [pressUnit,  setPressUnit]  = useState("MPa");
  const [tempVal,    setTempVal]    = useState("");
  const [corrMm,     setCorrMm]     = useState("1.5");

  // ── Geometry ──────────────────────────────────────────────────────────────
  const [IDval,      setIDval]      = useState("");
  const [IDunit,     setIDunit]     = useState("mm");
  const [LvalStr,    setLvalStr]    = useState("");  // seam-to-seam (mm)
  const [orientation,setOrientation]= useState<"vertical"|"horizontal">("vertical");
  const [headType,   setHeadType]   = useState("ellip");

  // ── Material & weld ───────────────────────────────────────────────────────
  const [matIdx,     setMatIdx]     = useState(0);
  const [jeIdx,      setJeIdx]      = useState(1);   // spot RT default
  const [flatCIdx,   setFlatCIdx]   = useState(0);   // flat head C factor

  // ── Nozzles (summary only — no code calc) ─────────────────────────────────
  const [nozzleCount, setNozzleCount] = useState("0");

  // ── Project ───────────────────────────────────────────────────────────────
  const [projName,   setProjName]   = useState("");
  const [tagNo,      setTagNo]      = useState("");
  const [copied,     setCopied]     = useState(false);

  // ── Derived: material and conditions ──────────────────────────────────────
  const mat = PV_MATERIALS[matIdx];
  const jf  = JOINT_EFFICIENCIES[jeIdx];
  const hd  = HEAD_TYPES.find(h => h.id === headType) ?? HEAD_TYPES[0];

  const flatC = FLAT_C_OPTIONS[flatCIdx].C;

  const result = useMemo(() => {
    const P   = parseFloat(pressVal) * (TO_MPA[pressUnit] ?? 1);
    const ID  = parseFloat(IDval)    * (TO_MM[IDunit] ?? 1); // mm
    const L   = parseFloat(LvalStr);   // mm seam-to-seam
    const T_C = parseFloat(tempVal);
    const c   = parseFloat(corrMm) || 0;
    const E   = jf.E;

    if (!isFinite(P) || P <= 0) return null;
    if (!isFinite(ID) || ID <= 0) return null;
    if (!isFinite(T_C)) return null;

    if (T_C > mat.maxT)
      return { error: `Temperature ${T_C} °C exceeds material limit of ${mat.maxT} °C for ${mat.spec} ${mat.grade}.` };

    const S = interpolateStress(mat, T_C);
    if (!S || S <= 0)
      return { error: "Cannot determine allowable stress — check temperature." };

    const R = ID / 2;        // mm — inside radius (corroded)
    const D = ID;            // mm — inside diameter (corroded)

    // ── Minimum required thicknesses (mm) ─────────────────────────────────
    // Shell (UG-27): P in MPa, R in mm → t in mm
    const t_shell_req = shellThickness(P, R, S, E) + c;

    // Head required thickness (varies by type)
    let t_head_req: number;
    let headLabel: string;
    let mawpHead: (t: number) => number;

    if (headType === "ellip") {
      t_head_req = ellipHead(P, D, S, E) + c;
      headLabel  = "2:1 Ellipsoidal";
      mawpHead   = (t) => ellipMAWP(t - c, D, S, E);
    } else if (headType === "hemi") {
      t_head_req = hemiHead(P, R, S, E) + c;
      headLabel  = "Hemispherical";
      mawpHead   = (t) => hemiMAWP(t - c, R, S, E);
    } else if (headType === "tori") {
      // Crown radius for standard ASME F&D = shell OD ≈ ID + 2·t_shell_req_pressure
      const t_shell_pr  = shellThickness(P, R, S, E); // pressure term only
      const L_crown = D + 2 * t_shell_pr;             // shell OD (corroded basis)
      t_head_req = toriHead(P, L_crown, S, E) + c;
      headLabel  = "ASME F&D (Torispherical)";
      mawpHead   = (t) => toriMAWP(t - c, L_crown, S, E);
    } else {
      t_head_req = flatHead(P, D, S, E, flatC) + c;
      headLabel  = "Flat head";
      mawpHead   = (t) => flatMAWP(t - c, D, S, E, flatC);
    }

    // ── Select standard plates ─────────────────────────────────────────────
    const t_shell_plate = nextPlate(t_shell_req);
    const t_head_plate  = nextPlate(t_head_req);

    if (!t_shell_plate || !t_head_plate)
      return { error: "Required thickness exceeds available plate sizes (>100 mm). Reduce pressure or increase diameter." };

    // ── MAWP at selected plates ────────────────────────────────────────────
    const mawp_shell = shellMAWP(t_shell_plate - c, R, S, E);
    const mawp_head  = mawpHead(t_head_plate);
    const mawp       = Math.min(mawp_shell, mawp_head);  // governing

    // ── Hydrostatic test pressure ──────────────────────────────────────────
    const P_test = 1.3 * mawp;

    // ── Geometry ───────────────────────────────────────────────────────────
    const ID_m  = ID / 1000;
    const L_m   = isFinite(L) && L > 0 ? L / 1000 : 0;
    const OD_mm = ID + 2 * t_shell_plate;   // vessel outside diameter

    // Head depth (mm, inside) — used for total tangent-to-tangent length
    const h_depth_m = headDepth(ID_m, headType);
    const L_tt_m    = L_m > 0 ? L_m + 2 * h_depth_m : 0; // t-t (seam-to-seam + 2 heads)
    const LD_ratio  = ID_m > 0 && L_tt_m > 0 ? L_tt_m / ID_m : null;

    // D/t thin-wall validity (UG-27 applies when R/t > 5, i.e. D/t > 10)
    const DtoT_shell = ID / t_shell_plate;
    const thinWall   = DtoT_shell > 10;

    // UG-16 minimum thickness: 1.6 mm (1/16") regardless of calculation
    const UG16_MIN = 1.6; // mm
    const ug16_shell_ok = t_shell_plate >= UG16_MIN;
    const ug16_head_ok  = t_head_plate  >= UG16_MIN;

    // ── Volume (m³) ────────────────────────────────────────────────────────
    const V_shell = shellVolume(ID_m, L_m);
    const V_head  = headType === "hemi"  ? hemiHeadVolume(ID_m) :
                    headType === "tori"  ? toriHeadVolume(ID_m) :
                    headType === "flat"  ? 0 :
                                          ellipHeadVolume(ID_m);
    const V_total = V_shell + 2 * V_head;

    // ── Weight (kg) ────────────────────────────────────────────────────────
    const rho = mat.density;
    const W_shell = L_m > 0 ? shellWeight(ID_m, t_shell_plate / 1000, L_m, rho) : 0;
    const W_head  = 2 * headWeight(ID_m, t_head_plate / 1000, headType, rho);
    const W_total = W_shell + W_head;

    // ── Indicative cost ────────────────────────────────────────────────────
    const costFactor = MAT_COST_FACTOR[mat.id] ?? 1.0;
    const costZAR    = W_total > 0 ? W_total * COST_PER_KG_ZAR * costFactor : null;

    return {
      P, ID, R, D, L: isFinite(L) ? L : null, T_C, S, E, c,
      t_shell_req, t_shell_plate,
      t_head_req, t_head_plate,
      headLabel,
      mawp_shell, mawp_head, mawp,
      P_test,
      OD_mm, DtoT_shell, thinWall,
      ug16_shell_ok, ug16_head_ok,
      h_depth_m, L_tt_m: L_m > 0 ? L_tt_m : null, LD_ratio,
      V_shell, V_head, V_total,
      W_shell, W_head, W_total,
      costZAR,
    };
  }, [pressVal, pressUnit, IDval, IDunit, LvalStr, tempVal, corrMm, mat, jf, headType, flatC]);

  const hasError = result !== null && "error" in result;
  type Good = Exclude<typeof result, null | { error: string }>;
  const res: Good | null = result && !hasError ? result as Good : null;

  function downloadCSV() {
    if (!res) return;
    type Cell = string | number;
    const rows: Cell[][] = [];
    const push = (...c: Cell[]) => rows.push(c);
    const blank = () => rows.push([]);
    push("Fluids Pad — Pressure Vessel Design (ASME VIII Div.1)");
    push("Project", projName || "Untitled"); push("Tag", tagNo || "—");
    push("Date", new Date().toLocaleDateString("en-GB", { day:"numeric",month:"long",year:"numeric" }));
    blank();
    push("DESIGN BASIS"); push("Parameter","Value","Unit");
    push("Design pressure P", fmt(res.P,3),"MPa");
    push("Design temperature T", fmt(res.T_C,0),"°C");
    push("Inside diameter ID", fmt(res.ID,0),"mm");
    push("Outside diameter OD", fmt(res.OD_mm,0),"mm");
    push("Shell length (seam-to-seam)", res.L!==null?fmt(res.L,0):"Not entered","mm");
    push("Head type", res.headLabel);
    push("Orientation", orientation);
    push("Material", `${mat.spec} ${mat.grade}`);
    push("Allowable stress S", fmt(res.S,1),"MPa");
    push("Joint efficiency E", String(res.E));
    push("Corrosion allowance c", fmt(res.c,1),"mm");
    blank();
    push("THICKNESS CALCULATIONS"); push("Parameter","Value","Unit");
    push("Shell t_req (UG-27)", fmt(res.t_shell_req,2),"mm");
    push("Shell t_selected plate", String(res.t_shell_plate),"mm");
    push("Shell MAWP", fmt(res.mawp_shell,3),"MPa");
    push("Head t_req", fmt(res.t_head_req,2),"mm");
    push("Head t_selected plate", String(res.t_head_plate),"mm");
    push("Head MAWP", fmt(res.mawp_head,3),"MPa");
    push("Governing MAWP", fmt(res.mawp,3),"MPa");
    push("Hydrostatic test P (UG-99)", fmt(res.P_test,3),"MPa (= 1.3 × MAWP)");
    push("D/t ratio (shell)", fmt(res.DtoT_shell,1),"");
    push("Thin-wall valid (D/t > 10)", res.thinWall?"Yes":"No — verify with thick-wall eq.","");
    blank();
    push("GEOMETRY & SIZE"); push("Parameter","Value","Unit");
    push("OD (selected plates)", fmt(res.OD_mm,0),"mm");
    push("Head depth (inside)", fmt(res.h_depth_m*1000,1),"mm");
    if(res.L_tt_m!==null){push("Tangent-to-tangent length", fmt(res.L_tt_m*1000,0),"mm");}
    if(res.LD_ratio!==null){push("L/D ratio (t-t/ID)", fmt(res.LD_ratio,2),"(target 3–6)");}
    blank();
    push("VOLUME & WEIGHT"); push("Parameter","Value","Unit");
    push("Shell volume", fmt(res.V_shell,4),"m³");
    push("Head volume (each)", fmt(res.V_head,4),"m³");
    push("Total internal volume", fmt(res.V_total,4),"m³");
    if(res.W_total>0){
      push("Shell weight", fmt(res.W_shell,0),"kg");
      push("Heads weight (2 off)", fmt(res.W_head,0),"kg");
      push("Total bare weight", fmt(res.W_total,0),"kg");
    }
    if(res.costZAR!==null&&res.W_total>0){
      push("Indicative supply cost", res.costZAR.toLocaleString("en-ZA",{maximumFractionDigits:0}),"ZAR (Q2 2025 ±30%)");
    }
    blank();
    push("Generated by Fluids Pad");
    push("Representative allowable stresses — verify against current ASME Section II Part D before use.");
    const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8;"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href=url; a.download=`${(projName||"pressure-vessel").replace(/[^a-z0-9]/gi,"_").toLowerCase()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function copySpec() {
    if (!res) return;
    const tag = tagNo ? `${tagNo} — ` : "";
    const pn  = projName ? `${projName} · ` : "";
    const txt = `${tag}${pn}ASME VIII Div.1 · ${orientation.charAt(0).toUpperCase() + orientation.slice(1)} vessel · ID ${IDval}${IDunit} × ${LvalStr || "?"}mm S/S · ${mat.spec} ${mat.grade} · ${jf.label} · Shell ${res.t_shell_plate}mm / Head ${res.t_head_plate}mm (${res.headLabel}) · MAWP ${fmt(res.mawp, 2)} MPa · Test ${fmt(res.P_test, 2)} MPa`;
    navigator.clipboard.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  }

  async function downloadPDF() {
    if (!res) return;
    const { jsPDF }  = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc  = new jsPDF({ unit: "mm", format: "a4" });
    const PW = 210, PH = 297, M = 14, CW = PW - 2 * M;
    type C = [number, number, number];
    const VIOL: C = [109, 40, 217];
    const DARK: C = [17, 24, 39];
    const MID:  C = [75, 85, 99];
    const LGRAY:C = [248, 250, 252];
    const WHITE:C = [255, 255, 255];
    const fc = (c: C) => doc.setFillColor(c[0], c[1], c[2]);
    const tc = (c: C) => doc.setTextColor(c[0], c[1], c[2]);

    fc(VIOL); doc.rect(0, 0, PW, 36, "F");
    tc(WHITE); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.text(projName || "Pressure Vessel Design", M, 14);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text("ASME Section VIII Division 1 — Fluids Pad", M, 22);
    const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    doc.text(dateStr, PW - M, 22, { align: "right" });
    if (tagNo) doc.text(`Tag: ${tagNo}`, M, 29);

    let y = 42;
    function section(title: string, rows: [string, string, string][]) {
      autoTable(doc, {
        head: [[{ content: title, colSpan: 3 }]],
        body: rows.filter(r => r[1] !== "—"),
        startY: y,
        margin: { left: M, right: M, top: 16, bottom: 16 },
        tableWidth: CW,
        styles: { font: "helvetica" },
        headStyles: { fillColor: VIOL, textColor: WHITE, fontStyle: "bold", fontSize: 9.5, halign: "left", cellPadding: { top: 3.5, bottom: 3.5, left: 4.5, right: 4 } },
        bodyStyles: { fontSize: 8.5, textColor: DARK, cellPadding: { top: 2.8, bottom: 2.8, left: 4.5, right: 4 } },
        alternateRowStyles: { fillColor: LGRAY },
        columnStyles: { 0: { cellWidth: CW * 0.48, textColor: MID }, 1: { cellWidth: CW * 0.32, fontStyle: "bold", halign: "right" }, 2: { cellWidth: CW * 0.20, fontSize: 7.5, textColor: MID } },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            fc(VIOL); doc.rect(0, 0, PW, 10, "F");
            tc(WHITE); doc.setFont("helvetica", "bold"); doc.setFontSize(7);
            doc.text(projName || "Pressure Vessel Design", M, 7);
            doc.setFont("helvetica", "normal");
            doc.text("Fluids Pad", PW - M, 7, { align: "right" });
          }
        },
      });
      y = (doc as unknown as JsPDFWithAutoTable).lastAutoTable.finalY + 5;
    }

    section("DESIGN BASIS — ASME VIII DIV.1", [
      ["Code",                 "ASME Section VIII Division 1",                   ""],
      ["Orientation",          orientation.charAt(0).toUpperCase() + orientation.slice(1), ""],
      ["Design pressure P",    fmt(res.P, 3),                                    "MPa"],
      ["Design temperature T", fmt(res.T_C, 0),                                  "°C"],
      ["Inside diameter ID",   fmt(res.ID, 0),                                   "mm"],
      ["Shell length (S/S)",   res.L !== null ? fmt(res.L, 0) : "Not entered",   "mm"],
      ["Material",             `${mat.spec} ${mat.grade}`,                        ""],
      ["Allowable stress S",   fmt(res.S, 1),                                    "MPa"],
      ["Weld joint efficiency E", String(res.E),                                 ""],
      ["Corrosion allowance c", fmt(res.c, 1),                                   "mm"],
      ["Head type",            res.headLabel,                                     ""],
    ]);

    section("WALL THICKNESS CALCULATIONS", [
      ["Shell: t_req (UG-27)",  fmt(res.t_shell_req, 2),                         "mm"],
      ["Shell: selected plate",  `${res.t_shell_plate}`,                          "mm"],
      ["Shell: MAWP",            fmt(res.mawp_shell, 3),                          "MPa"],
      ["Head: t_req",            fmt(res.t_head_req, 2),                          "mm"],
      ["Head: selected plate",   `${res.t_head_plate}`,                           "mm"],
      ["Head: MAWP",             fmt(res.mawp_head, 3),                           "MPa"],
      ["Governing MAWP",         fmt(res.mawp, 3),                                "MPa  ◄"],
      ["Hydrostatic test P",     fmt(res.P_test, 3),                              "MPa (= 1.3 × MAWP)"],
    ]);

    section("VESSEL SIZE & WEIGHT", [
      ["Shell volume",           fmt(res.V_shell, 4),                             "m³"],
      ["Head volume (each)",     fmt(res.V_head, 4),                              "m³"],
      ["Total vessel volume",    fmt(res.V_total, 4),                             "m³"],
      ["Shell weight",           res.W_shell > 0 ? fmt(res.W_shell, 0) : "—",    "kg"],
      ["Heads weight (2 off)",   fmt(res.W_head, 0),                             "kg"],
      ["Total bare weight",      res.W_total > 0 ? fmt(res.W_total, 0) : "—",   "kg"],
      ...(res.costZAR !== null && res.W_total > 0 ? [
        ["Indicative cost (supply)", `R ${res.costZAR.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`, "ZAR Q2 2025 ±30%"],
      ] as [string, string, string][] : []),
    ]);

    const totalPg = doc.getNumberOfPages();
    for (let p = 1; p <= totalPg; p++) {
      doc.setPage(p);
      doc.setDrawColor(200, 200, 220); doc.setLineWidth(0.3); doc.line(M, PH - 12, PW - M, PH - 12);
      tc(MID); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      doc.text("Fluids Pad", M, PH - 7);
      doc.text(`Page ${p} of ${totalPg}`, PW / 2, PH - 7, { align: "center" });
      doc.text("Allowable stresses are representative. Verify against current ASME code edition.", PW - M, PH - 7, { align: "right" });
    }

    doc.save(`${(projName || "pressure-vessel").replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`);
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="mb-1">
            <Link href="/design" className="text-xs text-gray-400 dark:text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">← Design</Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pressure Vessel Design</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ASME Section VIII Division 1 · Shell · Heads · MAWP · Weight · Cost estimate
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          <input type="text" value={projName} onChange={e => setProjName(e.target.value)}
            placeholder="Project name (optional)"
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          <button onClick={downloadCSV} disabled={!res}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-400 dark:hover:border-violet-600 hover:text-violet-700 dark:hover:text-violet-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV
          </button>
          <button onClick={downloadPDF} disabled={!res}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
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

          {/* 1. Design conditions */}
          <Card>
            <SideLabel n={1}>Design Conditions</SideLabel>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Design pressure P (gauge)</p>
                <div className="flex gap-2">
                  <input type="number" value={pressVal} onChange={e => setPressVal(e.target.value)}
                    placeholder="e.g. 2.5" className={`flex-1 ${INP}`} />
                  <select value={pressUnit} onChange={e => setPressUnit(e.target.value)}
                    className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {Object.keys(TO_MPA).map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Design temperature (°C)</p>
                <input type="number" value={tempVal} onChange={e => setTempVal(e.target.value)}
                  placeholder="e.g. 250" className={INP} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Corrosion allowance c (mm)</p>
                <input type="number" value={corrMm} onChange={e => setCorrMm(e.target.value)}
                  placeholder="1.5" step="0.5" className={INP} />
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Typical: 1.5 mm general · 3 mm moderate · 6 mm severe</p>
              </div>
            </div>
          </Card>

          {/* 2. Geometry */}
          <Card>
            <SideLabel n={2}>Vessel Geometry</SideLabel>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Orientation</p>
                <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                  {(["vertical", "horizontal"] as const).map(o => (
                    <button key={o} onClick={() => setOrientation(o)}
                      className={`flex-1 py-1.5 text-xs font-semibold capitalize transition-colors ${orientation === o ? "bg-violet-500 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Inside diameter ID (corroded)</p>
                <div className="flex gap-2">
                  <input type="number" value={IDval} onChange={e => setIDval(e.target.value)}
                    placeholder="e.g. 1200" className={`flex-1 ${INP}`} />
                  <select value={IDunit} onChange={e => setIDunit(e.target.value)}
                    className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {Object.keys(TO_MM).map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Shell length — seam to seam (mm)</p>
                <input type="number" value={LvalStr} onChange={e => setLvalStr(e.target.value)}
                  placeholder="e.g. 3000 (optional — for volume/weight)" className={INP} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Head type</p>
                <select value={headType} onChange={e => setHeadType(e.target.value)} className={SEL}>
                  {HEAD_TYPES.map(h => <option key={h.id} value={h.id}>{h.label}</option>)}
                </select>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{hd.note}</p>
              </div>

              {/* Flat head C factor — only when flat selected */}
              {headType === "flat" && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Flat head coefficient C (UG-34)</p>
                  <select value={flatCIdx} onChange={e => setFlatCIdx(Number(e.target.value))} className={SEL}>
                    {FLAT_C_OPTIONS.map((o, i) => <option key={i} value={i}>{o.label}</option>)}
                  </select>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Number of nozzles (info only)</p>
                <input type="number" value={nozzleCount} onChange={e => setNozzleCount(e.target.value)}
                  min="0" placeholder="0" className={INP} />
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Nozzle reinforcement check (UG-36/UG-37) is scoped out — verify in PVElite.</p>
              </div>
            </div>
          </Card>

          {/* 3. Material & weld */}
          <Card>
            <SideLabel n={3}>Material &amp; Weld</SideLabel>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Material</p>
                <select value={matIdx} onChange={e => setMatIdx(Number(e.target.value))} className={SEL}>
                  {PV_MATERIALS.map((m, i) => <option key={i} value={i}>{m.spec} {m.grade}</option>)}
                </select>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{mat.desc}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Weld joint efficiency E</p>
                <select value={jeIdx} onChange={e => setJeIdx(Number(e.target.value))} className={SEL}>
                  {JOINT_EFFICIENCIES.map((j, i) => <option key={i} value={i}>{j.label} (E = {j.E})</option>)}
                </select>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{jf.note}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tag number (optional)</p>
                <input type="text" value={tagNo} onChange={e => setTagNo(e.target.value)}
                  placeholder="e.g. V-101" className={SEL} />
              </div>
            </div>
          </Card>

          {/* Disclaimer */}
          <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
              <strong>Indicative only.</strong> Allowable stresses are representative of ASME Section II Part D.
              Verify against the current code edition. Nozzle reinforcement, support saddles, and lifting lug loads are not included.
              Use certified software (PVElite, DesignCalcs) for final design and Code stamping.
            </p>
          </div>
        </aside>

        {/* ══ RESULTS ══════════════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Empty state */}
          {!result && (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-500 dark:text-gray-400">Enter design pressure, temperature, and vessel geometry</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Results update live · ASME VIII Div.1</p>
            </div>
          )}

          {/* Error */}
          {hasError && (
            <div className="flex items-start gap-3 px-5 py-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
              <span className="text-red-500 text-xl">⚠</span>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{(result as { error: string }).error}</p>
            </div>
          )}

          {res && (
            <>
              {/* ── Key metrics ──────────────────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800 p-4">
                  <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-1">Shell plate</p>
                  <p className="text-2xl font-black text-violet-700 dark:text-violet-300">{res.t_shell_plate} <span className="text-sm">mm</span></p>
                  <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-0.5">req. {fmt(res.t_shell_req, 2)} mm</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Head plate</p>
                  <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{res.t_head_plate} <span className="text-sm">mm</span></p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">{res.headLabel}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4">
                  <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">MAWP</p>
                  <p className="text-2xl font-black text-green-700 dark:text-green-300">{fmt(res.mawp, 2)} <span className="text-sm">MPa</span></p>
                  <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-0.5">{fmt(res.mawp * 10, 1)} bar · {fmt((res.mawp / res.P - 1) * 100, 0)}% margin</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Test pressure (UG-99)</p>
                  <p className="text-2xl font-black text-amber-700 dark:text-amber-300">{fmt(res.P_test, 2)} <span className="text-sm">MPa</span></p>
                  <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">{fmt(res.P_test * 10, 1)} bar</p>
                </div>
              </div>

              {/* ── Design pressure utilisation + quick geometry row ─────── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">P utilisation</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white">{fmt((res.P / res.mawp) * 100, 0)} %</p>
                  <p className="text-xs text-gray-400 mt-0.5">of MAWP used at design P</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">Outside diameter OD</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white">{fmt(res.OD_mm, 0)} <span className="text-sm">mm</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">ID + 2 × shell plate</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">D/t shell ratio</p>
                  <p className={`text-xl font-black ${res.thinWall ? "text-gray-900 dark:text-white" : "text-amber-600 dark:text-amber-400"}`}>
                    {fmt(res.DtoT_shell, 1)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{res.thinWall ? "Thin-wall — UG-27 valid" : "⚠ D/t < 10 — verify"}</p>
                </div>
                {res.LD_ratio !== null ? (
                  <div className={`rounded-xl border p-4 ${res.LD_ratio >= 3 && res.LD_ratio <= 6 ? "bg-gray-50 dark:bg-gray-700/60 border-gray-200 dark:border-gray-600" : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"}`}>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">L/D ratio (t-t / ID)</p>
                    <p className={`text-xl font-black ${res.LD_ratio >= 3 && res.LD_ratio <= 6 ? "text-gray-900 dark:text-white" : "text-amber-700 dark:text-amber-300"}`}>
                      {fmt(res.LD_ratio, 2)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{res.LD_ratio >= 3 && res.LD_ratio <= 6 ? "✓ Within 3–6" : "⚠ Outside typical 3–6"}</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4 flex items-center justify-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Enter shell length for L/D</p>
                  </div>
                )}
              </div>

              {/* ── UG-16 and D/t alerts ─────────────────────────────────── */}
              {(!res.ug16_shell_ok || !res.ug16_head_ok) && (
                <div className="flex items-start gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
                  <span className="text-lg">⚠</span>
                  <span><strong>UG-16 minimum thickness</strong> — ASME minimum is 1.6 mm (1/16 in.) regardless of calculation.
                    {!res.ug16_shell_ok && ` Shell plate ${res.t_shell_plate} mm is below this — not permitted.`}
                    {!res.ug16_head_ok  && ` Head plate ${res.t_head_plate} mm is below this — not permitted.`}
                  </span>
                </div>
              )}
              {!res.thinWall && (
                <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300">
                  <span className="text-lg">⚠</span>
                  <span><strong>D/t = {fmt(res.DtoT_shell, 1)} — thick-wall regime.</strong> UG-27 thin-shell formula becomes inaccurate when D/t &lt; 10. Consider the Lamé thick-wall equation or consult a registered engineer.</span>
                </div>
              )}

              {/* ── Allowable stress note ────────────────────────────────── */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 px-4 py-2.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-700">
                <span className="font-semibold">{mat.spec} {mat.grade}</span>
                <span>·</span>
                <span>S = {fmt(res.S, 1)} MPa at {fmt(res.T_C, 0)} °C</span>
                <span>·</span>
                <span>E = {res.E} ({jf.label.split(" (")[0]})</span>
                <span>·</span>
                <span>c = {fmt(res.c, 1)} mm</span>
                {headType === "flat" && <><span>·</span><span>C = {flatC} (flat head)</span></>}
              </div>

              {/* ── Thickness calculations ───────────────────────────────── */}
              <Card>
                <SecHead title="Wall Thickness — UG-27 &amp; UG-32"
                  sub={`P = ${fmt(res.P, 3)} MPa · ID = ${fmt(res.ID, 0)} mm · S = ${fmt(res.S, 1)} MPa · E = ${res.E}`} />

                <div className="grid sm:grid-cols-2 gap-5">
                  {/* Shell */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Shell (UG-27)</p>
                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-4 py-3 mb-3 font-mono text-sm">
                      <p className="text-xs text-gray-500 font-sans mb-1">t = P·R / (S·E − 0.6·P)</p>
                      <p className="text-gray-800 dark:text-gray-200">
                        t = {fmt(res.P,3)} × {fmt(res.R,1)} / ({fmt(res.S,1)} × {res.E} − 0.6 × {fmt(res.P,3)})
                        = <strong className="text-violet-600 dark:text-violet-400">{fmt(res.t_shell_req - res.c, 2)}</strong> mm
                      </p>
                      <p className="text-gray-800 dark:text-gray-200 mt-1">
                        + c = {fmt(res.c,1)} mm → t<sub>m</sub> = {fmt(res.t_shell_req, 2)} mm
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { label: "Required t_req", value: `${fmt(res.t_shell_req, 2)} mm` },
                        { label: "Selected plate", value: `${res.t_shell_plate} mm`, highlight: true },
                        { label: "Shell MAWP",     value: `${fmt(res.mawp_shell, 3)} MPa` },
                      ].map(item => (
                        <div key={item.label} className={`flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0 ${item.highlight ? "font-bold" : ""}`}>
                          <span className="text-sm text-gray-600 dark:text-gray-400"><Lbl>{item.label}</Lbl></span>
                          <span className={`text-sm font-mono ${item.highlight ? "text-violet-600 dark:text-violet-400 text-base font-black" : "text-gray-900 dark:text-white"}`}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Head */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Head — {res.headLabel}</p>
                    <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-4 py-3 mb-3 font-mono text-sm">
                      <p className="text-xs text-gray-500 font-sans mb-1">
                        {headType === "ellip" ? "t = P·D / (2·S·E − 0.2·P)  [UG-32(d)]" :
                         headType === "hemi"  ? "t = P·R / (2·S·E − 0.2·P)  [UG-32(f)]" :
                         headType === "tori"  ? "t = 0.885·P·L / (S·E − 0.1·P)  [UG-32(e)]" :
                                               "t = d·√(C·P/(S·E))  [UG-34, C=0.13]"}
                      </p>
                      <p className="text-gray-800 dark:text-gray-200">
                        t<sub>m</sub> = <strong className="text-blue-600 dark:text-blue-400">{fmt(res.t_head_req, 2)}</strong> mm (incl. c)
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { label: "Required t_req", value: `${fmt(res.t_head_req, 2)} mm` },
                        { label: "Selected plate", value: `${res.t_head_plate} mm`, highlight: true },
                        { label: "Head MAWP",      value: `${fmt(res.mawp_head, 3)} MPa` },
                      ].map(item => (
                        <div key={item.label} className={`flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0 ${item.highlight ? "font-bold" : ""}`}>
                          <span className="text-sm text-gray-600 dark:text-gray-400"><Lbl>{item.label}</Lbl></span>
                          <span className={`text-sm font-mono ${item.highlight ? "text-blue-600 dark:text-blue-400 text-base font-black" : "text-gray-900 dark:text-white"}`}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* MAWP and test */}
                <div className="grid sm:grid-cols-2 gap-3 mt-4">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4">
                    <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">Governing MAWP ({res.mawp === res.mawp_shell ? "shell" : "head"} controls)</p>
                    <p className="text-2xl font-black text-green-700 dark:text-green-300">{fmt(res.mawp, 3)} MPa</p>
                    <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-0.5">{fmt(res.mawp * 10, 2)} bar · margin = {fmt((res.mawp / res.P - 1) * 100, 0)}% above design P</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Hydrostatic test (UG-99)</p>
                    <p className="text-2xl font-black text-amber-700 dark:text-amber-300">{fmt(res.P_test, 3)} MPa</p>
                    <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">= 1.3 × MAWP = {fmt(res.P_test * 10, 2)} bar</p>
                  </div>
                </div>
              </Card>

              {/* ── Volume and weight ────────────────────────────────────── */}
              {(res.L !== null || res.V_head > 0) && (
                <Card>
                  <SecHead title="Geometry, Volume &amp; Weight" accent="gray"
                    sub={`${mat.spec} ${mat.grade} · ρ = ${mat.density.toLocaleString()} kg/m³`} />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "Head depth (inside)",             value: `${fmt(res.h_depth_m * 1000, 1)} mm` },
                      { label: "T-T length (seam + 2 heads)",     value: res.L_tt_m !== null ? `${fmt(res.L_tt_m * 1000, 0)} mm` : "—" },
                      { label: "Head volume (each)",              value: headType !== "flat" ? `${fmt(res.V_head, 4)} m³` : "0 m³" },
                      { label: "Total internal volume",           value: res.L !== null ? `${fmt(res.V_total, 4)} m³` : "—" },
                      { label: "Shell weight",                    value: res.W_shell > 0 ? `${fmt(res.W_shell, 0)} kg` : "—" },
                      { label: "Heads weight (2 off)",            value: `${fmt(res.W_head, 0)} kg` },
                      { label: "Total bare weight",               value: res.W_total > 0 ? `${fmt(res.W_total, 0)} kg` : "—" },
                      { label: "OD (shell)",                      value: `${fmt(res.OD_mm, 0)} mm` },
                    ].map(item => (
                      <div key={item.label} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">{item.label}</p>
                        <p className="text-lg font-black text-gray-900 dark:text-white">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Cost */}
                  {res.costZAR !== null && res.W_total > 0 && (
                    <div className="mt-2 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
                        Indicative supply cost — {mat.spec} {mat.grade} shop-fabricated (ZAR Q2 2025 ±30%)
                      </p>
                      <p className="text-2xl font-black text-amber-700 dark:text-amber-300">
                        R {res.costZAR.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">
                        Supply only. Excludes internals, insulation, piping connections, instrumentation, and installation.
                        Basis: R {COST_PER_KG_ZAR}/kg × material factor {MAT_COST_FACTOR[mat.id]} × {fmt(res.W_total, 0)} kg bare weight.
                      </p>
                    </div>
                  )}
                </Card>
              )}

              {/* ── Vessel specification card ────────────────────────────── */}
              <div className="bg-gradient-to-br from-violet-600 to-violet-700 dark:from-violet-700 dark:to-violet-800 rounded-2xl p-6 text-white">
                <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                  <div>
                    {tagNo && <p className="text-violet-100 text-xs font-mono mb-1">{tagNo}</p>}
                    {projName && <p className="text-violet-100 text-xs mb-1">{projName}</p>}
                    <p className="text-violet-100 text-xs font-bold uppercase tracking-widest mb-1">Vessel Specification — ASME VIII Div.1</p>
                    <p className="text-2xl font-black capitalize">{orientation} pressure vessel</p>
                    <p className="text-violet-100 text-sm mt-0.5">{mat.spec} {mat.grade} · ID {fmt(res.ID, 0)} mm{res.L !== null ? ` × ${fmt(res.L, 0)} mm S/S` : ""}</p>
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
                    { label: "Shell plate",  value: `${res.t_shell_plate} mm` },
                    { label: "Head plate",   value: `${res.t_head_plate} mm (${res.headLabel.split(" ")[0]})` },
                    { label: "MAWP",         value: `${fmt(res.mawp, 2)} MPa` },
                    { label: "Hydro test P", value: `${fmt(res.P_test, 2)} MPa` },
                  ].map(item => (
                    <div key={item.label} className="bg-white/15 rounded-xl px-3 py-2.5">
                      <p className="text-violet-100 text-[10px] mb-0.5">{item.label}</p>
                      <p className="text-white font-bold text-sm">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="bg-white/10 rounded-xl px-4 py-3">
                    <p className="text-violet-100 text-[10px] font-bold uppercase tracking-wider mb-1">Material</p>
                    <p className="text-white text-sm font-semibold">{mat.spec} {mat.grade}</p>
                    <p className="text-violet-200 text-[10px] mt-0.5">S = {fmt(res.S,1)} MPa at {fmt(res.T_C,0)} °C</p>
                  </div>
                  <div className="bg-white/10 rounded-xl px-4 py-3">
                    <p className="text-violet-100 text-[10px] font-bold uppercase tracking-wider mb-1">Weld quality</p>
                    <p className="text-white text-sm font-semibold">{jf.label}</p>
                    <p className="text-violet-200 text-[10px] mt-0.5">E = {jf.E}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl px-4 py-3">
                    <p className="text-violet-100 text-[10px] font-bold uppercase tracking-wider mb-1">Design margin</p>
                    <p className="text-white text-sm font-semibold">{fmt((res.mawp / res.P - 1) * 100, 0)}% above P</p>
                    <p className="text-violet-200 text-[10px] mt-0.5">c = {fmt(res.c, 1)} mm corrosion</p>
                  </div>
                </div>
              </div>

              {/* ── Allowable stress table ───────────────────────────────── */}
              <Card>
                <SecHead title={`${mat.spec} ${mat.grade} — Allowable Stress S vs Temperature`} accent="gray"
                  sub={`${mat.desc} · Max service temperature ${mat.maxT} °C`} />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left pb-2 pr-3">T (°C)</th>
                        {mat.table.map(([T]) => (
                          <th key={T} className={`text-right pb-2 px-2 ${res && Math.abs(T - res.T_C) < 1 ? "text-violet-600 dark:text-violet-400" : ""}`}>
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
                            res && Math.abs(T - res.T_C) < 1 ? "text-violet-600 dark:text-violet-400" : "text-gray-700 dark:text-gray-300"
                          }`}>
                            {S}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                  Representative values from ASME Section II Part D. Verify against current code edition before use in design.
                </p>
              </Card>
            </>
          )}

          <References refs={REFS_PRESSURE_VESSEL} />
        </div>
      </div>
    </div>
  );
}
