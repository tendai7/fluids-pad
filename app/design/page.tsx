"use client";

import React, { useState, useMemo, useEffect } from "react";
import { References } from "@/components/References";
import { REFS_PIPE_SYSTEM_DESIGN } from "@/lib/references";

// ─── Types ─────────────────────────────────────────────────────────────────────
// jsPDF-autotable does not export its extended type, so we cast via this alias.
type JsPDFWithAutoTable = { lastAutoTable: { finalY: number } };

// ─── Constants ─────────────────────────────────────────────────────────────────
const G = 9.81;
const PA_ATM = 101325;

// ─── Physics ───────────────────────────────────────────────────────────────────
function colebrook(Re: number, eD: number): number {
  if (Re < 2300) return 64 / Re;
  let f = 0.02;
  for (let i = 0; i < 50; i++) {
    const fn = 1 / Math.pow(-2 * Math.log10(eD / 3.7 + 2.51 / (Re * Math.sqrt(f))), 2);
    if (Math.abs(fn - f) < 1e-10) { f = fn; break; }
    f = fn;
  }
  return f;
}

function fmt(x: number, dp = 2): string {
  if (!isFinite(x) || isNaN(x)) return "—";
  return x.toFixed(dp);
}
function sig(x: number, s = 4): string {
  if (!isFinite(x) || isNaN(x)) return "—";
  return parseFloat(x.toPrecision(s)).toString();
}

// ─── Data ──────────────────────────────────────────────────────────────────────
const FLUIDS = [
  { label: "Water 20°C",        rho: 998.2,  mu: 1.002e-3, Pv: 2338  },
  { label: "Water 40°C",        rho: 992.2,  mu: 0.653e-3, Pv: 7375  },
  { label: "Water 60°C",        rho: 983.2,  mu: 0.467e-3, Pv: 19940 },
  { label: "Water 80°C",        rho: 971.8,  mu: 0.355e-3, Pv: 47390 },
  { label: "Diesel",            rho: 840,    mu: 3.0e-3,   Pv: 500   },
  { label: "Light crude oil",   rho: 870,    mu: 15e-3,    Pv: 300   },
  { label: "EG 50% antifreeze", rho: 1049,   mu: 2.23e-3,  Pv: 800   },
  { label: "Seawater 20°C",     rho: 1023,   mu: 1.07e-3,  Pv: 2500  },
  { label: "Custom",            rho: NaN,    mu: NaN,      Pv: NaN   },
];

const PIPE_MATS = [
  { label: "Commercial / wrought steel", eps: 0.046  },
  { label: "Galvanised steel",           eps: 0.15   },
  { label: "Cast iron (unlined)",        eps: 0.26   },
  { label: "Stainless steel",            eps: 0.015  },
  { label: "Copper / brass",             eps: 0.0015 },
  { label: "PVC / HDPE",               eps: 0.0015 },
  { label: "Concrete (smooth)",          eps: 0.30   },
  { label: "Custom ε (mm)",            eps: NaN    },
];

// Schedule 40 internal diameters (mm) — most common reference standard
const DN_SIZES = [
  { dn: 15,  id: 15.8  }, { dn: 20,  id: 21.3  }, { dn: 25,  id: 26.6  },
  { dn: 32,  id: 35.1  }, { dn: 40,  id: 40.9  }, { dn: 50,  id: 52.5  },
  { dn: 65,  id: 62.7  }, { dn: 80,  id: 77.9  }, { dn: 100, id: 102.3 },
  { dn: 125, id: 128.2 }, { dn: 150, id: 154.1 }, { dn: 200, id: 202.7 },
  { dn: 250, id: 254.5 }, { dn: 300, id: 303.2 }, { dn: 350, id: 336.5 },
  { dn: 400, id: 387.4 },
];

const FITTINGS = [
  { g: "Elbows",        label: "90° elbow — standard",    K: 0.9  },
  { g: "Elbows",        label: "90° elbow — long radius", K: 0.4  },
  { g: "Elbows",        label: "45° elbow",               K: 0.4  },
  { g: "Elbows",        label: "180° return bend",        K: 1.5  },
  { g: "Tees",          label: "Tee — through run",       K: 0.6  },
  { g: "Tees",          label: "Tee — through branch",    K: 1.8  },
  { g: "Valves",        label: "Gate valve (full open)",  K: 0.2  },
  { g: "Valves",        label: "Globe valve (full open)", K: 10.0 },
  { g: "Valves",        label: "Ball valve (full open)",  K: 0.1  },
  { g: "Valves",        label: "Butterfly valve",         K: 0.6  },
  { g: "Valves",        label: "Check valve — swing",     K: 2.5  },
  { g: "Valves",        label: "Foot valve / strainer",   K: 15.0 },
  { g: "Entries/Exits", label: "Sharp-edged entry",       K: 0.5  },
  { g: "Entries/Exits", label: "Well-rounded entry",      K: 0.04 },
  { g: "Entries/Exits", label: "Sharp exit",              K: 1.0  },
  { g: "Other",         label: "Strainer / Y-filter",     K: 2.0  },
  { g: "Other",         label: "Orifice plate (β=0.7)",   K: 1.8  },
];

type FlowUnit = "m³/h" | "L/s" | "L/min" | "m³/s" | "GPM";
const TO_M3S: Record<FlowUnit, number> = {
  "m³/h": 1/3600, "L/s": 1e-3, "L/min": 1/60000, "m³/s": 1, GPM: 6.309e-5,
};
const FLOW_UNITS: FlowUnit[] = ["m³/h", "L/s", "L/min", "m³/s", "GPM"];

// ─── Cost data (ZAR — South African Rand, indicative Q2 2025 ±25%) ────────────
// Keys are DN nominal sizes; values are ZAR per metre or ZAR per unit.
type PriceTable = Partial<Record<number, number>>;

const PIPE_PRICE_ZAR: Record<string, PriceTable> = {
  "Commercial / wrought steel": { 15:58, 20:72, 25:88, 32:118, 40:148, 50:192, 65:258, 80:328, 100:445, 125:612, 150:805, 200:1220, 250:1750, 300:2330, 350:2980, 400:3650 },
  "Galvanised steel":           { 15:78, 20:97, 25:118, 32:158, 40:195, 50:253, 65:338, 80:428, 100:582, 125:800, 150:1052, 200:1590, 250:2280, 300:3030, 350:3880, 400:4750 },
  "Cast iron (unlined)":        { 80:410, 100:555, 150:1005, 200:1520, 250:2180, 300:2900 },
  "Stainless steel":            { 15:185, 20:228, 25:278, 32:365, 40:468, 50:593, 65:785, 80:995, 100:1340, 125:1845, 150:2430, 200:3665, 250:5240, 300:6985, 350:8935, 400:10950 },
  "Copper / brass":             { 15:245, 20:310, 25:375, 32:495, 40:635, 50:825, 80:1340, 100:1800 },
  "PVC / HDPE":                 { 15:14, 20:19, 25:26, 32:37, 40:48, 50:65, 65:88, 80:112, 100:155, 125:218, 150:286, 200:435, 250:625, 300:832 },
  "Concrete (smooth)":          { 200:1850, 250:2650, 300:3520 },
};

const FITTING_PRICE_ZAR: Record<string, PriceTable> = {
  "90° elbow — standard":    { 25:72,  50:128,  80:265,  100:398,  150:845,  200:1570 },
  "90° elbow — long radius": { 25:87,  50:155,  80:320,  100:482,  150:1025, 200:1900 },
  "45° elbow":               { 25:62,  50:108,  80:225,  100:338,  150:718,  200:1335 },
  "180° return bend":        { 25:91,  50:160,  80:330,  100:498,  150:1058, 200:1965 },
  "Tee — through run":       { 25:105, 50:190,  80:390,  100:590,  150:1253, 200:2325 },
  "Tee — through branch":    { 25:115, 50:210,  80:430,  100:650,  150:1380, 200:2565 },
  "Gate valve (full open)":  { 25:186, 50:402,  80:785,  100:1152, 150:2304, 200:4310 },
  "Globe valve (full open)": { 25:306, 50:651,  80:1267, 100:1859, 150:3718, 200:6931 },
  "Ball valve (full open)":  { 25:139, 50:283,  80:556,  100:816,  150:1631, 200:3023 },
  "Butterfly valve":         { 25:172, 50:345,  80:671,  100:987,  150:1972, 200:3644 },
  "Check valve — swing":     { 25:230, 50:489,  80:950,  100:1393, 150:2786, 200:5187 },
  "Foot valve / strainer":   { 25:268, 50:571,  80:1108, 100:1626, 150:3251, 200:6050 },
  "Sharp-edged entry":       { 25:0,   50:0,    80:0,    100:0                        },
  "Well-rounded entry":      { 25:82,  50:168,  80:326,  100:479,  150:958,  200:1780 },
  "Sharp exit":              { 25:0,   50:0,    80:0,    100:0                        },
  "Strainer / Y-filter":     { 25:345, 50:729,  80:1417, 100:2079, 150:4158, 200:7735 },
  "Orifice plate (β=0.7)":   {         50:815,  80:1589, 100:2331, 150:4661, 200:8671 },
};

// Centrifugal pump indicative supply-only price range (ZAR)
const PUMP_RANGES_ZAR = [
  { maxKW: 0.75, lo: 6500,   hi: 12000  },
  { maxKW: 2.2,  lo: 9500,   hi: 18000  },
  { maxKW: 5.5,  lo: 15000,  hi: 30000  },
  { maxKW: 11,   lo: 26000,  hi: 52000  },
  { maxKW: 18.5, lo: 44000,  hi: 88000  },
  { maxKW: 30,   lo: 72000,  hi: 144000 },
  { maxKW: 55,   lo: 128000, hi: 256000 },
  { maxKW: 75,   lo: 176000, hi: 352000 },
  { maxKW: 110,  lo: 256000, hi: 512000 },
  { maxKW: 1e9,  lo: 360000, hi: 720000 },
];

const SA_SUPPLIERS = [
  { name: "Stewarts & Lloyds", url: "https://www.stewartsandlloyds.co.za", desc: "Pipe, fittings & flanges" },
  { name: "Macsteel",          url: "https://www.macsteel.co.za",           desc: "Steel pipe & structural" },
  { name: "RS Components SA",  url: "https://za.rs-online.com",             desc: "Valves, instruments & controls" },
  { name: "BMG",               url: "https://www.bmgworld.net",             desc: "Pumps, bearings & drives" },
  { name: "Hydrasales",        url: "https://www.hydrasales.co.za",         desc: "Hydraulic & industrial systems" },
];

// ─── Price helpers ─────────────────────────────────────────────────────────────
function interpolatePrice(table: PriceTable, dn: number): number | null {
  const entries = (Object.entries(table) as [string, number][])
    .map(([k, v]) => [Number(k), v] as [number, number])
    .sort(([a], [b]) => a - b);
  if (entries.length === 0) return null;
  if (dn <= entries[0][0]) return entries[0][1];
  if (dn >= entries[entries.length - 1][0]) return entries[entries.length - 1][1];
  for (let i = 0; i < entries.length - 1; i++) {
    const [d0, p0] = entries[i], [d1, p1] = entries[i + 1];
    if (dn >= d0 && dn <= d1) return p0 + ((dn - d0) / (d1 - d0)) * (p1 - p0);
  }
  return null;
}

function nearestDn(idMm: number): number {
  return DN_SIZES.reduce((best, sz) =>
    Math.abs(sz.id - idMm) < Math.abs(best.id - idMm) ? sz : best
  ).dn;
}

function pumpRange(kW: number): { lo: number; hi: number } {
  return PUMP_RANGES_ZAR.find((r) => kW <= r.maxKW) ?? PUMP_RANGES_ZAR[PUMP_RANGES_ZAR.length - 1];
}

const CURRENCIES = {
  ZAR: { sym: "R",  rate: 1,       label: "ZAR — South African Rand" },
  USD: { sym: "$",  rate: 0.053,   label: "USD — US Dollar" },
  GBP: { sym: "£",  rate: 0.042,   label: "GBP — British Pound" },
  EUR: { sym: "€",  rate: 0.049,   label: "EUR — Euro" },
} as const;
type CurrencyKey = keyof typeof CURRENCIES;

// ─── Supplier tiers ────────────────────────────────────────────────────────────
const TIERS = {
  budget:   { label: "Budget",   desc: "Local / discount distributor", factor: 0.90, color: "green",  adj: "−10% vs base" },
  standard: { label: "Standard", desc: "Standard market rate",         factor: 1.00, color: "gray",   adj: "Base estimate" },
  premium:  { label: "Premium",  desc: "Premium / specialist supplier", factor: 1.15, color: "indigo", adj: "+15% vs base" },
} as const;
type TierKey = keyof typeof TIERS;

// ─── Saved design types ────────────────────────────────────────────────────────
interface DesignState {
  projectName: string; fluidIdx: number;
  customRho: string; customMu: string; customPv: string;
  flowVal: string; flowUnit: FlowUnit;
  diamMm: string; useDn: boolean; dnIdx: number;
  matIdx: number; customEps: string;
  lengthM: string; elevM: string;
  counts: number[];
  etaPct: string; addStaticM: string;
  runHours: string; energyCost: string;
  checkNpsh: boolean; suctionHM: string; suctionLossM: string; npshRM: string;
  currency: CurrencyKey;
  tier: TierKey;
  showCost: boolean; showLabour: boolean; laborPct: string;
  showMotor: boolean; motorAllowPct: string;
  showCommiss: boolean; commisePct: string;
  contingPct: string; includeVat: boolean;
  customItems: { id: string; desc: string; qty: string; up: string }[];
}

interface SavedDesign {
  id: string;
  name: string;
  savedAt: string;
  summary: string;
  state: DesignState;
}

const STORAGE_KEY = "fmc_designs";
const MAX_SAVES   = 50;

function conv(zarAmount: number, rate: number, sym: string, dp = 0): string {
  if (!isFinite(zarAmount)) return "—";
  const v = zarAmount * rate;
  return `${sym} ${v.toLocaleString("en-ZA", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}

// ─── Shared UI primitives ──────────────────────────────────────────────────────
const SEL = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";
const INP = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500";

// Prominent section header for the main results area
function SectionTitle({
  title, subtitle, badge, accent = "teal",
}: {
  title: string; subtitle?: string; badge?: string;
  accent?: "teal" | "indigo" | "amber" | "green" | "red";
}) {
  const bar: Record<string, string> = {
    teal:   "bg-teal-500",
    indigo: "bg-indigo-500",
    amber:  "bg-amber-500",
    green:  "bg-green-500",
    red:    "bg-red-500",
  };
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className={`w-1 self-stretch min-h-[2rem] rounded-full flex-shrink-0 ${bar[accent]}`} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
          {badge && (
            <span className="text-xs px-2 py-0.5 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-full font-semibold">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// Compact numbered label for sidebar input sections
function SidebarLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-5 h-5 rounded-md bg-teal-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
        {n}
      </span>
      <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{children}</span>
    </div>
  );
}

function Row({ label, value, unit, bold }: { label: string; value: string; unit?: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0 ${bold ? "font-semibold" : ""}`}>
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className={`text-sm font-mono ${bold ? "text-gray-900 dark:text-white" : "text-gray-800 dark:text-gray-200"}`}>
        {value}{unit && <span className="text-xs text-gray-400 dark:text-gray-500 font-sans ml-1">{unit}</span>}
      </span>
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

function StatChip({
  label, value, unit, color = "gray", size = "md"
}: {
  label: string; value: string; unit?: string;
  color?: "gray" | "teal" | "indigo" | "green" | "amber" | "red";
  size?: "sm" | "md" | "lg";
}) {
  const colors = {
    gray:   "bg-gray-50   dark:bg-gray-700/60  text-gray-900   dark:text-white    border-gray-200  dark:border-gray-600",
    teal:   "bg-teal-50   dark:bg-teal-900/20  text-teal-700   dark:text-teal-300  border-teal-200  dark:border-teal-800",
    indigo: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    green:  "bg-green-50  dark:bg-green-900/20 text-green-700  dark:text-green-300 border-green-200  dark:border-green-800",
    amber:  "bg-amber-50  dark:bg-amber-900/20 text-amber-700  dark:text-amber-300 border-amber-200  dark:border-amber-800",
    red:    "bg-red-50    dark:bg-red-900/20   text-red-700    dark:text-red-300   border-red-200    dark:border-red-800",
  };
  const sz = { sm: "p-3", md: "p-4", lg: "p-5" }[size];
  const valSz = { sm: "text-lg", md: "text-2xl", lg: "text-3xl" }[size];
  return (
    <div className={`rounded-xl border ${sz} ${colors[color]}`}>
      <p className="text-xs font-semibold opacity-70 mb-1">{label}</p>
      <p className={`font-black leading-none ${valSz}`}>
        {value}{unit && <span className="text-sm font-semibold ml-1 opacity-80">{unit}</span>}
      </p>
    </div>
  );
}

// Horizontal stacked bar for head budget
function HeadBudgetBar({ hf, hm, dz }: { hf: number; hm: number; dz: number }) {
  const total = hf + hm + Math.abs(dz);
  if (total <= 0) return null;
  const pct = (v: number) => Math.max(0, (Math.abs(v) / total) * 100);

  const bars = [
    { label: "Friction hf",      val: hf,          pct: pct(hf),          color: "bg-teal-500" },
    { label: "Minor losses hm",  val: hm,          pct: pct(hm),          color: "bg-indigo-400" },
    { label: "Elevation Δz",     val: dz,          pct: pct(dz),          color: dz >= 0 ? "bg-amber-400" : "bg-green-400" },
  ].filter((b) => b.pct > 0.5);

  return (
    <div className="space-y-2">
      {bars.map((b) => (
        <div key={b.label} className="flex items-center gap-3">
          <div className="w-36 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{b.label}</div>
          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${b.color}`}
              style={{ width: `${b.pct}%` }}
            />
          </div>
          <div className="w-24 text-right text-xs font-mono text-gray-700 dark:text-gray-300">
            {fmt(b.val, 2)} m <span className="text-gray-400">({b.pct.toFixed(0)}%)</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DesignPage() {
  // ── Project / Fluid / Flow ────────────────────────────────────────────────
  const [projectName, setProjectName] = useState("");
  const [fluidIdx,    setFluidIdx]    = useState(0);
  const [customRho,   setCustomRho]   = useState("1000");
  const [customMu,    setCustomMu]    = useState("0.001002");
  const [customPv,    setCustomPv]    = useState("2338");
  const [flowVal,     setFlowVal]     = useState("");
  const [flowUnit,    setFlowUnit]    = useState<FlowUnit>("m³/h");

  // ── Pipe ──────────────────────────────────────────────────────────────────
  const [diamMm,     setDiamMm]     = useState("");
  const [useDn,      setUseDn]      = useState(false);
  const [dnIdx,      setDnIdx]      = useState(8);          // DN100 default
  const [matIdx,     setMatIdx]     = useState(0);
  const [customEps,  setCustomEps]  = useState("0.046");
  const [lengthM,    setLengthM]    = useState("");
  const [elevM,      setElevM]      = useState("0");
  const [counts,     setCounts]     = useState<number[]>(new Array(FITTINGS.length).fill(0));
  const [showAll,    setShowAll]    = useState(false);

  // ── Pump ──────────────────────────────────────────────────────────────────
  const [etaPct,      setEtaPct]      = useState("75");
  const [addStaticM,  setAddStaticM]  = useState("0");
  const [runHours,    setRunHours]    = useState("");
  const [energyCost,  setEnergyCost]  = useState("");

  // ── NPSH ──────────────────────────────────────────────────────────────────
  const [checkNpsh,    setCheckNpsh]    = useState(false);
  const [suctionHM,    setSuctionHM]    = useState("3");
  const [suctionLossM, setSuctionLossM] = useState("0.5");
  const [npshRM,       setNpshRM]       = useState("");

  // ── Cost estimator ────────────────────────────────────────────────────────
  const [currency,      setCurrency]      = useState<CurrencyKey>("ZAR");
  const [tier,          setTier]          = useState<TierKey>("standard");

  // ── RFQ Quote packager ────────────────────────────────────────────────────
  const [showRfq,       setShowRfq]       = useState(false);
  const [rfqName,       setRfqName]       = useState("");
  const [rfqCompany,    setRfqCompany]    = useState("");
  const [rfqEmail,      setRfqEmail]      = useState("");
  const [rfqPhone,      setRfqPhone]      = useState("");
  const [rfqLocation,   setRfqLocation]   = useState("");
  const [rfqDate,       setRfqDate]       = useState("");
  const [rfqShowPrices, setRfqShowPrices] = useState(false);
  const [showLabour,    setShowLabour]    = useState(false);
  const [laborPct,      setLaborPct]      = useState("25");
  const [motorAllowPct, setMotorAllowPct] = useState("20");
  const [showMotor,     setShowMotor]     = useState(false);
  const [showCommiss,   setShowCommiss]   = useState(false);
  const [commisePct,    setCommisePct]    = useState("5");
  const [contingPct,    setContingPct]    = useState("10");
  const [includeVat,    setIncludeVat]    = useState(true);
  const [customItems,   setCustomItems]   = useState<{id:string;desc:string;qty:string;up:string}[]>([]);

  // ── Saved designs ─────────────────────────────────────────────────────────
  const [savedDesigns,  setSavedDesigns]  = useState<SavedDesign[]>([]);
  const [showSavedPanel,setShowSavedPanel]= useState(false);
  const [saveFlash,     setSaveFlash]     = useState(false);

  // Load from localStorage on first render
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedDesigns(JSON.parse(raw) as SavedDesign[]);
    } catch {}
  }, []);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showSizer,    setShowSizer]    = useState(false);
  const [showSummary,  setShowSummary]  = useState(false);
  const [showCost,     setShowCost]     = useState(false);
  const [sidebarOpen,  setSidebarOpen]  = useState(true);

  // ─── Derived: fluid ────────────────────────────────────────────────────────
  const fluid = useMemo(() => {
    const f = FLUIDS[fluidIdx];
    return {
      label: f.label,
      rho: isFinite(f.rho) ? f.rho : parseFloat(customRho),
      mu:  isFinite(f.mu)  ? f.mu  : parseFloat(customMu),
      Pv:  isFinite(f.Pv)  ? f.Pv  : parseFloat(customPv),
    };
  }, [fluidIdx, customRho, customMu, customPv]);

  // ─── Derived: effective diameter in mm ────────────────────────────────────
  const effectiveDiamMm = useMemo(() => {
    if (useDn) return DN_SIZES[dnIdx].id.toString();
    return diamMm;
  }, [useDn, dnIdx, diamMm]);

  // ─── Derived: pipe results ─────────────────────────────────────────────────
  const pipe = useMemo(() => {
    const Q   = parseFloat(flowVal) * TO_M3S[flowUnit];
    const D   = parseFloat(effectiveDiamMm) / 1000;
    const L   = parseFloat(lengthM);
    const dz  = parseFloat(elevM) || 0;
    const { rho, mu } = fluid;
    if (![Q, D, L, rho, mu].every((v) => isFinite(v) && v > 0)) return null;

    const A    = Math.PI * D * D / 4;
    const V    = Q / A;
    const Re   = rho * V * D / mu;
    const eps  = isFinite(PIPE_MATS[matIdx].eps) ? PIPE_MATS[matIdx].eps : parseFloat(customEps);
    if (!isFinite(eps) || eps <= 0) return null;
    const eD   = (eps * 1e-3) / D;
    const f    = colebrook(Re, eD);
    const hf   = f * (L / D) * V * V / (2 * G);
    const sumK = counts.reduce((acc, qty, i) => acc + qty * FITTINGS[i].K, 0);
    const hm   = sumK * V * V / (2 * G);
    const Hsys = hf + hm + dz;

    // Pressure equivalents
    const dPfric_kPa = rho * G * hf / 1000;
    const dPtotal_kPa = rho * G * Hsys / 1000;
    const gradPa_m   = rho * G * hf / L;   // hydraulic gradient Pa/m

    const regime = Re < 2300 ? "Laminar" : Re < 4000 ? "Transitional" : "Turbulent";
    const rColor = Re < 2300 ? "text-green-600 dark:text-green-400" :
                   Re < 4000 ? "text-amber-600 dark:text-amber-400" :
                               "text-red-600 dark:text-red-400";
    const velOk  = V >= 0.5 && V <= 3.0;
    const velNote = V < 0.3  ? "⚠ very low — sediment risk" :
                    V < 0.5  ? "⚠ low velocity" :
                    V > 5.0  ? "⚠ very high — erosion risk" :
                    V > 3.0  ? "⚠ high velocity" : "✓ good";
    return {
      Q, D, A, V, Re, f, eD, hf, sumK, hm, dz, Hsys,
      dPfric_kPa, dPtotal_kPa, gradPa_m,
      regime, rColor, velOk, velNote, L, rho, eps,
    };
  }, [flowVal, flowUnit, effectiveDiamMm, lengthM, elevM, fluid, matIdx, customEps, counts]);

  // ─── Derived: pump ─────────────────────────────────────────────────────────
  const pump = useMemo(() => {
    if (!pipe) return null;
    const eta  = parseFloat(etaPct) / 100;
    const addH = parseFloat(addStaticM) || 0;
    if (!isFinite(eta) || eta <= 0 || eta > 1) return null;
    const Htotal  = pipe.Hsys + addH;
    const powerKW = (pipe.rho * G * pipe.Q * Htotal) / eta / 1000;
    const hrs     = parseFloat(runHours);
    const cost    = parseFloat(energyCost);
    const annualKwh  = isFinite(hrs) && hrs > 0 ? powerKW * hrs : null;
    const annualCost = annualKwh && isFinite(cost) && cost > 0 ? annualKwh * cost : null;
    return { Htotal, powerKW, eta, addH, annualKwh, annualCost };
  }, [pipe, etaPct, addStaticM, runHours, energyCost]);

  // ─── Derived: NPSH ─────────────────────────────────────────────────────────
  const npsh = useMemo(() => {
    if (!checkNpsh || !pipe) return null;
    const hs    = parseFloat(suctionHM);
    const hls   = parseFloat(suctionLossM);
    const NPSHr = parseFloat(npshRM);
    if (!isFinite(hs) || !isFinite(hls)) return null;
    const { rho, Pv } = fluid;
    const NPSHa  = PA_ATM / (rho * G) + hs - hls - Pv / (rho * G);
    const margin = isFinite(NPSHr) ? NPSHa - NPSHr : null;
    const status = margin === null ? "No NPSHr entered" :
                   margin > 1    ? "Safe"         :
                   margin > 0    ? "Marginal"     : "Insufficient";
    const sColor = status === "Safe"         ? "green" :
                   status === "Marginal"     ? "amber" :
                   status === "Insufficient" ? "red"   : "gray";
    return { NPSHa, NPSHr, margin, status, sColor } as const;
  }, [checkNpsh, pipe, suctionHM, suctionLossM, npshRM, fluid]);

  // ─── Derived: cost BOM ─────────────────────────────────────────────────────
  const bom = useMemo(() => {
    if (!pipe) return null;
    const matLabel = PIPE_MATS[matIdx].label;
    const dn = useDn ? DN_SIZES[dnIdx].dn : nearestDn(parseFloat(effectiveDiamMm));
    const L  = parseFloat(lengthM) || 0;

    // Pipe
    const pipeUP  = interpolatePrice(PIPE_PRICE_ZAR[matLabel] ?? {}, dn);
    const pipeCost = pipeUP !== null ? pipeUP * L : null;

    // Fittings
    const fittingLines = FITTINGS
      .map((f, i) => {
        const qty = counts[i];
        if (qty === 0) return null;
        const table = FITTING_PRICE_ZAR[f.label];
        const up    = table ? interpolatePrice(table, dn) : null;
        return { label: f.label, qty, up, total: up !== null ? up * qty : null };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const fittingTotal = fittingLines.reduce((s, l) => s + (l.total ?? 0), 0);

    // Pump
    const pumpR    = pump ? pumpRange(pump.powerKW) : null;
    const pumpMid  = pumpR ? (pumpR.lo + pumpR.hi) / 2 : null;

    // Materials subtotal
    const matSub = (pipeCost ?? 0) + fittingTotal + (pumpMid ?? 0);

    return { dn, pipeUP, pipeCost, L, matLabel, fittingLines, fittingTotal, pumpR, pumpMid, matSub };
  }, [pipe, matIdx, useDn, dnIdx, effectiveDiamMm, lengthM, counts, pump]);

  // derived currency helper (used in render + costTotals)
  const curr = CURRENCIES[currency];

  const costTotals = useMemo(() => {
    if (!bom) return null;
    const rate       = CURRENCIES[currency].rate;
    const tierFactor = TIERS[tier].factor;

    // Tier factor adjusts materials (supplier market level)
    const matAdj   = bom.matSub * tierFactor;

    // Optional: labour (on tier-adjusted materials)
    const labor    = showLabour ? matAdj * ((parseFloat(laborPct) || 0) / 100) : 0;

    // Optional: motor & electrical (tier-adjusted pump cost base)
    const motorZAR = (showMotor && bom.pumpMid !== null)
      ? bom.pumpMid * tierFactor * ((parseFloat(motorAllowPct) || 0) / 100) : 0;

    // Custom items entered in selected currency, summed in ZAR
    const customLines = customItems.map((item) => {
      const qty   = parseFloat(item.qty) || 0;
      const upZar = (parseFloat(item.up) || 0) / rate;
      return { ...item, qty, upZar, totalZar: qty * upZar };
    });
    const customZar = customLines.reduce((s, l) => s + l.totalZar, 0);

    const base    = matAdj + labor + motorZAR + customZar;
    const conting = base * ((parseFloat(contingPct) || 0) / 100);
    const preComm = base + conting;
    const commiss = showCommiss ? preComm * ((parseFloat(commisePct) || 0) / 100) : 0;
    const preVat  = preComm + commiss;
    const vat     = includeVat ? preVat * 0.15 : 0;
    const grand   = preVat + vat;

    return { matAdj, tierFactor, labor, motorZAR, customLines, customZar, base, conting, commiss, preComm, preVat, vat, grand };
  }, [bom, currency, tier, showLabour, laborPct, showMotor, motorAllowPct, customItems, contingPct, showCommiss, commisePct, includeVat]);

  // ─── Derived: pipe sizer table ──────────────────────────────────────────────
  const sizerRows = useMemo(() => {
    const Q   = parseFloat(flowVal) * TO_M3S[flowUnit];
    const L   = parseFloat(lengthM);
    const { rho, mu } = fluid;
    if (!isFinite(Q) || Q <= 0 || !isFinite(rho) || !isFinite(mu)) return [];
    const eps = isFinite(PIPE_MATS[matIdx].eps) ? PIPE_MATS[matIdx].eps : parseFloat(customEps);
    if (!isFinite(eps) || eps <= 0) return [];

    return DN_SIZES.map((sz) => {
      const D  = sz.id / 1000;
      const A  = Math.PI * D * D / 4;
      const V  = Q / A;
      const Re = rho * V * D / mu;
      const eD = (eps * 1e-3) / D;
      const f  = colebrook(Re, eD);
      const hf = isFinite(L) && L > 0 ? f * (L / D) * V * V / (2 * G) : null;
      const regime = Re < 2300 ? "Lam" : Re < 4000 ? "Trans" : "Turb";
      const ok = V >= 0.5 && V <= 3.0;
      const flag = V < 0.3 ? "⚠⚠" : V < 0.5 ? "⚠" : V > 5.0 ? "⚠⚠" : V > 3.0 ? "⚠" : "✓";
      const current = useDn ? DN_SIZES[dnIdx].dn === sz.dn : Math.abs(parseFloat(effectiveDiamMm) - sz.id) < 1;
      return { ...sz, V, Re, f, hf, regime, ok, flag, current };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowVal, flowUnit, lengthM, fluid, matIdx, customEps, effectiveDiamMm, useDn, dnIdx]);

  function setCount(i: number, delta: number) {
    setCounts((prev) => {
      const next = [...prev];
      next[i] = Math.max(0, (next[i] ?? 0) + delta);
      return next;
    });
  }

  function downloadCSV() {
    if (!pipe) return;
    type Cell = string | number;
    const rows: Cell[][] = [];
    const push = (...cells: Cell[]) => rows.push(cells);
    const blank = () => rows.push([]);
    const head  = (title: string) => { blank(); push(title); push("Parameter", "Value", "Unit"); };

    push("Fluids Pad — Pipe System Design");
    push("Project", projectName || "Untitled");
    push("Date", new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));
    blank();

    head("OPERATING CONDITIONS");
    push("Fluid",                  fluid.label);
    push("Density ρ",              fluid.rho,                  "kg/m³");
    push("Dynamic viscosity μ",    fluid.mu.toExponential(3),  "Pa·s");
    push("Vapour pressure Pv",     fluid.Pv,                   "Pa");
    push("Flow rate Q",            `${flowVal} ${flowUnit}`);
    push("Flow rate Q",            (pipe.Q * 1e3).toPrecision(4), "L/s");
    push("Flow rate Q",            pipe.Q.toPrecision(4),      "m³/s");

    head("PIPE RUN");
    push("Material",               PIPE_MATS[matIdx].label);
    push("Internal diameter",      parseFloat(effectiveDiamMm), "mm");
    if (useDn) push("Nominal size", `DN${DN_SIZES[dnIdx].dn}`, "Schedule 40");
    push("Total length",           parseFloat(lengthM),         "m");
    push("Elevation change Δz",    parseFloat(elevM) || 0,      "m");
    push("Roughness ε",            isFinite(PIPE_MATS[matIdx].eps) ? PIPE_MATS[matIdx].eps : parseFloat(customEps) || 0, "mm");

    head("FLOW ANALYSIS");
    push("Flow velocity V",        pipe.V.toFixed(3),           "m/s");
    push("Reynolds number Re",     sig(pipe.Re, 4));
    push("Flow regime",            pipe.regime);
    push("Darcy friction factor f",pipe.f.toFixed(5));
    push("Relative roughness ε/D", pipe.eD.toExponential(3));
    push("Hydraulic gradient",     pipe.gradPa_m.toFixed(1),    "Pa/m");

    head("HEAD BUDGET");
    push("Friction loss hf",       pipe.hf.toFixed(3),          "m");
    push("Friction ΔP",            pipe.dPfric_kPa.toFixed(2),  "kPa");
    push("Minor losses hm",        pipe.hm.toFixed(3),          "m");
    push("Fittings ΣK",            pipe.sumK.toFixed(2));
    push("Elevation head Δz",      pipe.dz.toFixed(2),          "m");
    push("System head H_sys",      pipe.Hsys.toFixed(3),        "m");
    push("Total ΔP",               pipe.dPtotal_kPa.toFixed(2), "kPa");
    push("Total ΔP",               (pipe.dPtotal_kPa / 100).toFixed(4), "bar");

    if (pump) {
      head("PUMP REQUIREMENTS");
      push("System head (pipe run)", pipe.Hsys.toFixed(3),      "m");
      push("Additional static head", pump.addH.toFixed(2),      "m");
      push("Total duty head H",      pump.Htotal.toFixed(3),    "m");
      push("Flow rate Q",            `${flowVal} ${flowUnit}`);
      push("Pump efficiency η",      parseFloat(etaPct),        "%");
      push("Min. shaft power",       pump.powerKW.toFixed(3),   "kW");
      push("Hydraulic power",        (pump.powerKW * pump.eta).toFixed(3), "kW");
      push("Total pressure rise",    (pump.Htotal * pipe.rho * G / 1000).toFixed(2), "kPa");

      if (pump.annualKwh !== null) {
        head("ANNUAL ENERGY");
        push("Run hours / year",     parseFloat(runHours),      "h/yr");
        push("Annual energy",        pump.annualKwh.toFixed(0), "kWh/yr");
        push("Annual energy",        (pump.annualKwh / 1000).toFixed(2), "MWh/yr");
        if (pump.annualCost !== null) {
          push("Electricity tariff", parseFloat(energyCost),    "$/kWh");
          push("Annual energy cost", pump.annualCost.toFixed(0),"$");
        }
      }
    }

    if (npsh) {
      head("NPSH — CAVITATION CHECK");
      push("Patm/(ρg)",             (PA_ATM / (fluid.rho * G)).toFixed(2), "m");
      push("Suction head hs",       parseFloat(suctionHM),     "m");
      push("Suction line losses",   parseFloat(suctionLossM) || 0, "m");
      push("Pv/(ρg)",               (fluid.Pv / (fluid.rho * G)).toFixed(3), "m");
      push("NPSHa (available)",     npsh.NPSHa.toFixed(3),     "m");
      if (isFinite(npsh.NPSHr) && npsh.margin !== null) {
        push("NPSHr (required)",    npsh.NPSHr.toFixed(2),     "m");
        push("Safety margin",       npsh.margin.toFixed(3),    "m");
        push("Status",              npsh.status ?? "");
      }
    }

    if (counts.some((c) => c > 0)) {
      blank();
      push("FITTINGS & VALVES");
      push("Fitting", "K", "Qty", "K contribution");
      FITTINGS.forEach((fit, i) => {
        if (counts[i] > 0) push(fit.label, fit.K, counts[i], (fit.K * counts[i]).toFixed(2));
      });
      push("TOTAL ΣK", "", "", pipe.sumK.toFixed(2));
    }

    // ── Cost estimate (only if enabled and computed) ──────────────────────
    if (showCost && bom && costTotals) {
      const tf = costTotals.tierFactor;
      const cr = curr.rate;

      head(`COST ESTIMATE — ${TIERS[tier].label.toUpperCase()} TIER (${currency})`);
      push("Supplier tier",     `${TIERS[tier].label} × ${tf}`,  TIERS[tier].adj);
      push("Currency",          currency,                          `Base prices in ZAR, Q2 2025`);
      blank();
      // BOM header row
      push("Item", "Specification", "Qty", "Unit", `Unit Price (${currency})`, `Line Total (${currency})`);

      if (bom.L > 0) {
        push(
          `Pipe — ${bom.matLabel} DN${bom.dn}`,
          `DN${bom.dn} Sch.40`,
          bom.L.toFixed(1), "m",
          bom.pipeUP !== null ? (bom.pipeUP * tf * cr).toFixed(2) : "N/A",
          bom.pipeCost !== null ? (bom.pipeCost * tf * cr).toFixed(2) : "N/A",
        );
      }
      bom.fittingLines.forEach((line) => {
        push(
          line.label, `DN${bom.dn} CS flanged`,
          line.qty, "ea",
          line.up !== null ? (line.up * tf * cr).toFixed(2) : "N/A",
          line.total !== null ? (line.total * tf * cr).toFixed(2) : "N/A",
        );
      });
      if (bom.pumpR && pump) {
        push(
          `Centrifugal pump ~${fmt(pump.powerKW, 1)} kW`,
          "Supply only", 1, "ea",
          `${(bom.pumpR.lo * tf * cr).toFixed(0)} – ${(bom.pumpR.hi * tf * cr).toFixed(0)}`,
          `~${(bom.pumpMid! * tf * cr).toFixed(0)}`,
        );
      }
      if (showMotor && costTotals.motorZAR > 0) {
        push(`Motor & electrical (${motorAllowPct}% of pump)`, "", 1, "lsum", "", (costTotals.motorZAR * cr).toFixed(0));
      }
      costTotals.customLines.filter((l) => l.desc).forEach((l) => {
        push(l.desc, "", l.qty, "ea", (parseFloat(l.up || "0") || 0).toFixed(2), (l.totalZar * cr).toFixed(2));
      });

      blank();
      push("Materials subtotal", "", "", "", "", (costTotals.matAdj * cr).toFixed(0));
      if (showLabour) push(`Labour (${laborPct}% of materials)`, "", "", "", "", (costTotals.labor * cr).toFixed(0));
      if (showMotor && costTotals.motorZAR > 0) push("Motor & electrical", "", "", "", "", (costTotals.motorZAR * cr).toFixed(0));
      push(`Contingency (${contingPct}%)`, "", "", "", "", (costTotals.conting * cr).toFixed(0));
      if (showCommiss) push(`Commissioning (${commisePct}%)`, "", "", "", "", (costTotals.commiss * cr).toFixed(0));
      if (includeVat) push("VAT / GST (15%)", "", "", "", "", (costTotals.vat * cr).toFixed(0));
      push(`GRAND TOTAL (${includeVat ? "incl. VAT" : "excl. VAT"})`, "", "", "", "", (costTotals.grand * cr).toFixed(0));

      blank();
      push("DISCLAIMER", `Indicative ZAR Q2 2025 base prices ±25%. ${TIERS[tier].label} tier (×${tf}). ${currency !== "ZAR" ? `Converted at approx 1 ZAR = ${cr.toFixed(4)} ${currency}. ` : ""}Always obtain formal supplier quotations before committing to a budget.`);
    }

    blank();
    push("Generated by Fluids Pad — fluidspad.com");
    push("Results based on Darcy-Weisbach / Colebrook-White. Verify with detailed design software before use.");

    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }); // BOM for Excel
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${(projectName || "pipe-system-design").replace(/[^a-z0-9]/gi, "_").toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function downloadPDF() {
    if (!pipe) return;

    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const PW   = 210, PH = 297, M = 14, CW = PW - 2 * M;

    // ─── Color palette ─────────────────────────────────────────────────────
    type C = [number, number, number];
    const TEAL:  C = [13, 148, 136];
    const TEAL2: C = [10, 118, 108];   // darker teal for accent
    const IND:   C = [79, 70, 229];
    const GRN:   C = [22, 163, 74];
    const AMB:   C = [217, 119, 6];
    const RED:   C = [220, 38, 38];
    const DARK:  C = [17, 24, 39];
    const MID:   C = [75, 85, 99];
    const LGRAY: C = [248, 250, 252];
    const WHITE: C = [255, 255, 255];

    const fc = (c: C) => doc.setFillColor(c[0], c[1], c[2]);
    const tc = (c: C) => doc.setTextColor(c[0], c[1], c[2]);
    const dc = (c: C) => doc.setDrawColor(c[0], c[1], c[2]);

    // ─── Page 1 header banner ──────────────────────────────────────────────
    fc(TEAL); doc.rect(0, 0, PW, 38, "F");

    // Right accent block
    fc(TEAL2);
    doc.rect(PW - 55, 0, 55, 38, "F");

    // Divider line at banner bottom
    fc([0, 200, 180]); doc.rect(0, 37, PW, 1.5, "F");

    // Project name
    tc(WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.text(projectName || "Pipe System Design", M, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Design Summary  —  Fluids Pad", M, 22.5);

    const dateStr = new Date().toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });
    doc.text(dateStr, PW - M, 22.5, { align: "right" });

    const dnLabel = useDn ? `DN${DN_SIZES[dnIdx].dn} (${DN_SIZES[dnIdx].id}mm ID)` : `${effectiveDiamMm}mm ID`;
    const runLine = `${fluid.label}  ·  Q = ${flowVal} ${flowUnit}  ·  ${dnLabel} × ${lengthM || "—"}m  ·  ${PIPE_MATS[matIdx].label}`;
    doc.setFontSize(7.5);
    doc.text(runLine, M, 30, { maxWidth: PW - 2 * M - 20 });

    let y = 44;

    // ─── At-a-glance boxes ─────────────────────────────────────────────────
    const glance: { label: string; value: string; sub: string; col: C }[] = [
      {
        label: "System Head",
        value: `${fmt(pipe.Hsys, 2)} m`,
        sub:   `${fmt(pipe.dPtotal_kPa, 1)} kPa`,
        col:   TEAL,
      },
      {
        label: "Flow Velocity",
        value: `${fmt(pipe.V, 2)} m/s`,
        sub:   pipe.velOk ? "✓ In range" : "⚠ Check size",
        col:   pipe.velOk ? GRN : AMB,
      },
      {
        label: "Flow Regime",
        value: pipe.regime,
        sub:   `Re = ${sig(pipe.Re, 3)}`,
        col:   pipe.regime === "Laminar" ? GRN : pipe.regime === "Transitional" ? AMB : RED,
      },
      {
        label: showCost && costTotals ? "Est. Total Cost" : pump ? "Shaft Power" : "Friction f",
        value: showCost && costTotals
          ? conv(costTotals.grand, curr.rate, curr.sym, 0)
          : pump ? `${fmt(pump.powerKW, 2)} kW` : `f = ${fmt(pipe.f, 4)}`,
        sub: showCost && costTotals
          ? `${TIERS[tier].label} tier · ${includeVat ? "incl. VAT" : "excl. VAT"}`
          : pump ? `η = ${etaPct}%` : `ε/D = ${pipe.eD.toExponential(2)}`,
        col: showCost && costTotals ? AMB : IND,
      },
    ];

    const bW = (CW - 9) / 4;
    glance.forEach((b, i) => {
      const bx = M + i * (bW + 3);
      fc(LGRAY);
      doc.roundedRect(bx, y, bW, 21, 1.5, 1.5, "F");
      // Left accent bar
      fc(b.col);
      doc.roundedRect(bx, y, 3, 21, 1, 1, "F");
      // Label
      tc(MID);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text(b.label.toUpperCase(), bx + 5.5, y + 6.5);
      // Value
      tc(DARK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      doc.text(b.value, bx + 5.5, y + 14);
      // Sub
      tc(MID);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text(b.sub, bx + 5.5, y + 19.5);
    });

    y += 26;

    // ─── Section table helper ──────────────────────────────────────────────
    function section(
      title: string,
      rows: [string, string, string][],
      col: C = TEAL,
    ) {
      // Filter empty rows
      const body = rows.filter((r) => r[1] !== "" && r[1] !== "—" && r[1] !== "NaN");

      autoTable(doc, {
        head: [[{ content: title, colSpan: 3 }]],
        body,
        startY: y,
        margin: { left: M, right: M, top: 16, bottom: 16 },
        tableWidth: CW,
        styles: { font: "helvetica", overflow: "linebreak" },
        headStyles: {
          fillColor: col,
          textColor: WHITE,
          fontStyle:  "bold",
          fontSize:   9.5,
          halign:     "left",
          cellPadding: { top: 3.5, bottom: 3.5, left: 4.5, right: 4 },
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: DARK,
          cellPadding: { top: 2.8, bottom: 2.8, left: 4.5, right: 4 },
        },
        alternateRowStyles: { fillColor: LGRAY },
        columnStyles: {
          0: { cellWidth: CW * 0.48, textColor: MID },
          1: { cellWidth: CW * 0.32, fontStyle: "bold", halign: "right" },
          2: { cellWidth: CW * 0.20, fontSize: 7.5, textColor: MID },
        },
        // Small header on continuation pages
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            fc(TEAL); doc.rect(0, 0, PW, 10, "F");
            tc(WHITE);
            doc.setFont("helvetica", "bold"); doc.setFontSize(7);
            doc.text(projectName || "Pipe System Design", M, 7);
            doc.setFont("helvetica", "normal");
            doc.text("Fluids Pad", PW - M, 7, { align: "right" });
          }
        },
      });
      y = (doc as unknown as JsPDFWithAutoTable).lastAutoTable.finalY + 5;
    }

    // ─── Content sections ──────────────────────────────────────────────────
    section("OPERATING CONDITIONS", [
      ["Fluid",                 fluid.label,                      ""],
      ["Density ρ",             sig(fluid.rho, 5),                "kg/m³"],
      ["Dynamic viscosity μ",   fluid.mu.toExponential(3),        "Pa·s"],
      ["Vapour pressure Pv",    sig(fluid.Pv, 4),                 "Pa"],
      ["Flow rate Q",           `${flowVal}`,                     flowUnit],
      ["Flow rate Q",           sig(pipe.Q * 1e3, 4),             "L/s"],
    ]);

    section("PIPE RUN", [
      ["Material",              PIPE_MATS[matIdx].label,          ""],
      ["Internal diameter",     effectiveDiamMm,                  "mm (ID)"],
      ...(useDn ? [["Nominal size", `DN${DN_SIZES[dnIdx].dn}`, "Sch. 40"]] as [string,string,string][] : []),
      ["Total length L",        fmt(parseFloat(lengthM), 1),      "m"],
      ["Elevation change Δz",   fmt(parseFloat(elevM) || 0, 1),   "m"],
      ["Roughness ε",           String(isFinite(PIPE_MATS[matIdx].eps) ? PIPE_MATS[matIdx].eps : parseFloat(customEps) || 0), "mm"],
    ]);

    section("FLOW ANALYSIS", [
      ["Flow velocity V",       fmt(pipe.V, 3),                   "m/s"],
      ["Velocity note",         pipe.velNote,                     ""],
      ["Reynolds number Re",    sig(pipe.Re, 4),                  ""],
      ["Flow regime",           pipe.regime,                      ""],
      ["Darcy friction factor f", fmt(pipe.f, 5),                 ""],
      ["Relative roughness ε/D", pipe.eD.toExponential(3),        ""],
      ["Hydraulic gradient",    fmt(pipe.gradPa_m, 1),            "Pa/m"],
    ]);

    section("HEAD BUDGET", [
      ["Friction loss hf",      fmt(pipe.hf, 3),                  "m"],
      ["Friction pressure drop", fmt(pipe.dPfric_kPa, 2),         "kPa"],
      ["Minor losses hm",       fmt(pipe.hm, 3),                  "m"],
      ["Fittings ΣK",           fmt(pipe.sumK, 2),                ""],
      ["Elevation Δz",          fmt(pipe.dz, 2),                  "m"],
      ["System head H_sys",     fmt(pipe.Hsys, 3),                "m  ◄"],
      ["Total ΔP",              fmt(pipe.dPtotal_kPa, 2),         "kPa"],
      ["Total ΔP",              fmt(pipe.dPtotal_kPa / 100, 4),   "bar"],
    ]);

    if (pump) {
      section("PUMP REQUIREMENTS", [
        ["System head (pipe run)",  fmt(pipe.Hsys, 3),             "m"],
        ["Additional static head",  fmt(pump.addH, 2),             "m"],
        ["Total duty head H",       fmt(pump.Htotal, 3),           "m  ◄"],
        ["Flow rate Q",             `${flowVal}`,                  flowUnit],
        ["Pump efficiency η",       fmt(parseFloat(etaPct), 0),    "%"],
        ["Min. shaft power",        fmt(pump.powerKW, 3),          "kW  ◄"],
        ["Hydraulic power",         fmt(pump.powerKW * pump.eta, 3), "kW"],
        ["Total pressure rise",     fmt(pump.Htotal * pipe.rho * G / 1000, 2), "kPa"],
      ], IND);

      if (pump.annualKwh !== null) {
        section("ANNUAL ENERGY", [
          ["Run hours / year",      runHours,                      "h/yr"],
          ["Annual energy",         pump.annualKwh.toFixed(0),     "kWh/yr"],
          ["Annual energy",         (pump.annualKwh / 1000).toFixed(2), "MWh/yr"],
          ...(pump.annualCost !== null ? [
            ["Electricity tariff",  energyCost,                    "$/kWh"],
            ["Annual energy cost",  `$${pump.annualCost.toFixed(0)}`, ""],
          ] as [string,string,string][] : []),
        ], GRN);
      }
    }

    if (npsh) {
      const npshCol: C = npsh.sColor === "red" ? RED : npsh.sColor === "amber" ? AMB : GRN;
      section("NPSH — CAVITATION CHECK", [
        ["Patm/(ρg)",             fmt(PA_ATM / (fluid.rho * G), 2),  "m"],
        ["Suction head hs",       fmt(parseFloat(suctionHM), 2),      "m"],
        ["Suction line losses",   fmt(parseFloat(suctionLossM) || 0, 2), "m"],
        ["Pv/(ρg)",               fmt(fluid.Pv / (fluid.rho * G), 3), "m"],
        ["NPSHa (available)",     fmt(npsh.NPSHa, 3),                 "m  ◄"],
        ...(isFinite(npsh.NPSHr) && npsh.margin !== null ? [
          ["NPSHr (required)",    fmt(npsh.NPSHr, 2),                 "m"],
          ["Safety margin",       fmt(npsh.margin, 3),                "m"],
          ["Status",              npsh.status ?? "",                   ""],
        ] as [string,string,string][] : []),
      ], npshCol);
    }

    if (counts.some((c) => c > 0)) {
      autoTable(doc, {
        head: [
          [{ content: "FITTINGS & VALVES", colSpan: 4 }],
          ["Fitting", "K", "Qty", "K Total"],
        ],
        body: [
          ...(FITTINGS
            .map((f, i) => counts[i] > 0
              ? [f.label, String(f.K), String(counts[i]), (f.K * counts[i]).toFixed(2)]
              : null)
            .filter(Boolean) as string[][]),
          ["TOTAL ΣK", "", "", pipe.sumK.toFixed(2)],
        ],
        startY: y,
        margin: { left: M, right: M, top: 16, bottom: 16 },
        tableWidth: CW,
        styles: { font: "helvetica" },
        headStyles: {
          fillColor: TEAL,
          textColor: WHITE,
          fontStyle: "bold",
          fontSize: 9.5,
          halign: "left",
          cellPadding: { top: 3.5, bottom: 3.5, left: 4.5, right: 4 },
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: DARK,
          cellPadding: { top: 2.8, bottom: 2.8, left: 4.5, right: 4 },
        },
        alternateRowStyles: { fillColor: LGRAY },
        columnStyles: {
          0: { cellWidth: CW * 0.52, textColor: MID },
          1: { cellWidth: CW * 0.14, halign: "right" },
          2: { cellWidth: CW * 0.14, halign: "center" },
          3: { cellWidth: CW * 0.20, halign: "right", fontStyle: "bold" },
        },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            fc(TEAL); doc.rect(0, 0, PW, 10, "F");
            tc(WHITE);
            doc.setFont("helvetica", "bold"); doc.setFontSize(7);
            doc.text(projectName || "Pipe System Design", M, 7);
            doc.setFont("helvetica", "normal");
            doc.text("Fluids Pad", PW - M, 7, { align: "right" });
          }
        },
      });
    }

    // ─── Cost estimate section ─────────────────────────────────────────────
    if (showCost && bom && costTotals) {
      const tf = costTotals.tierFactor;
      const tierColors: Record<string, C> = {
        budget: GRN, standard: [13, 148, 136] as C, premium: IND,
      };
      const tierCol: C = tierColors[tier] ?? (TEAL as C);

      // BOM items table
      const bomRows: string[][] = [];
      if (bom.L > 0) {
        bomRows.push([
          `Pipe — ${bom.matLabel} DN${bom.dn}`,
          `${bom.L.toFixed(1)} m`,
          bom.pipeUP !== null ? conv(bom.pipeUP * tf, curr.rate, curr.sym) : "N/A",
          bom.pipeCost !== null ? conv(bom.pipeCost * tf, curr.rate, curr.sym) : "N/A",
        ]);
      }
      bom.fittingLines.forEach((line) => {
        bomRows.push([
          line.label,
          `${line.qty} ea`,
          line.up !== null ? conv(line.up * tf, curr.rate, curr.sym) : "N/A",
          line.total !== null ? conv(line.total * tf, curr.rate, curr.sym) : "N/A",
        ]);
      });
      if (bom.pumpR && pump) {
        bomRows.push([
          `Centrifugal pump ~${fmt(pump.powerKW, 1)} kW`,
          "1 ea (supply only)",
          `${conv(bom.pumpR.lo * tf, curr.rate, curr.sym)} – ${conv(bom.pumpR.hi * tf, curr.rate, curr.sym)}`,
          `~${conv(bom.pumpMid! * tf, curr.rate, curr.sym)}`,
        ]);
      }
      if (showMotor && costTotals.motorZAR > 0) {
        bomRows.push([
          `Motor & electrical (${motorAllowPct}% of pump)`,
          "1 lsum",
          "",
          conv(costTotals.motorZAR, curr.rate, curr.sym),
        ]);
      }
      costTotals.customLines.filter((l) => l.desc).forEach((l) => {
        bomRows.push([l.desc, `${l.qty} ea`, "", conv(l.totalZar, curr.rate, curr.sym)]);
      });

      autoTable(doc, {
        head: [[
          { content: `COST ESTIMATE — ${TIERS[tier].label.toUpperCase()} TIER  ·  ${currency}  ·  Q2 2025 Base Prices ±25%`, colSpan: 4 },
        ], ["Item", "Qty / Unit", `Unit Price (${curr.sym})`, `Line Total (${curr.sym})`]],
        body: bomRows,
        startY: y,
        margin: { left: M, right: M, top: 16, bottom: 16 },
        tableWidth: CW,
        styles: { font: "helvetica", overflow: "linebreak" },
        headStyles: {
          fillColor: tierCol,
          textColor: WHITE,
          fontStyle: "bold",
          fontSize: 9,
          halign: "left",
          cellPadding: { top: 3, bottom: 3, left: 4.5, right: 4 },
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: DARK,
          cellPadding: { top: 2.8, bottom: 2.8, left: 4.5, right: 4 },
        },
        alternateRowStyles: { fillColor: LGRAY },
        columnStyles: {
          0: { cellWidth: CW * 0.42, textColor: MID },
          1: { cellWidth: CW * 0.17, halign: "center", textColor: MID },
          2: { cellWidth: CW * 0.20, halign: "right" },
          3: { cellWidth: CW * 0.21, halign: "right", fontStyle: "bold" },
        },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            fc(TEAL); doc.rect(0, 0, PW, 10, "F");
            tc(WHITE); doc.setFont("helvetica", "bold"); doc.setFontSize(7);
            doc.text(projectName || "Pipe System Design", M, 7);
            doc.setFont("helvetica", "normal");
            doc.text("Fluids Pad", PW - M, 7, { align: "right" });
          }
        },
      });
      y = (doc as unknown as JsPDFWithAutoTable).lastAutoTable.finalY + 3;

      // Totals summary (right-aligned mini table)
      const totRows: [string, string][] = [
        ["Materials subtotal",    conv(costTotals.matAdj, curr.rate, curr.sym)],
        ...(showLabour   ? [[`Labour (${laborPct}%)`,           conv(costTotals.labor,   curr.rate, curr.sym)] as [string,string]] : []),
        ...(showMotor && costTotals.motorZAR > 0 ? [["Motor & electrical",    conv(costTotals.motorZAR, curr.rate, curr.sym)] as [string,string]] : []),
        [`Contingency (${contingPct}%)`,                         conv(costTotals.conting, curr.rate, curr.sym)],
        ...(showCommiss  ? [[`Commissioning (${commisePct}%)`,  conv(costTotals.commiss, curr.rate, curr.sym)] as [string,string]] : []),
        ...(includeVat   ? [["VAT / GST (15%)",                  conv(costTotals.vat,     curr.rate, curr.sym)] as [string,string]] : []),
        [`GRAND TOTAL (${includeVat ? "incl. VAT" : "excl. VAT"})`, conv(costTotals.grand, curr.rate, curr.sym)],
      ];

      autoTable(doc, {
        head: [],
        body: totRows,
        startY: y,
        margin: { left: PW - M - 95, right: M },
        tableWidth: 95,
        styles: { font: "helvetica" },
        bodyStyles: { fontSize: 8.5, textColor: DARK, cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 } },
        columnStyles: {
          0: { cellWidth: 58, textColor: MID },
          1: { cellWidth: 37, halign: "right", fontStyle: "bold" },
        },
        willDrawCell: (data) => {
          if (data.section === "body" && data.row.index === totRows.length - 1) {
            fc(tierCol); doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, "F");
          }
        },
        didDrawCell: (data) => {
          if (data.section === "body" && data.row.index === totRows.length - 1) {
            tc(WHITE);
            doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
            const val = String(data.cell.raw ?? "");
            const xPos = data.column.index === 0
              ? data.cell.x + 4
              : data.cell.x + data.cell.width - 4;
            const align = data.column.index === 0 ? "left" : "right";
            doc.text(val, xPos, data.cell.y + data.cell.height / 2 + 1.5, { align });
          }
        },
      });
      y = (doc as unknown as JsPDFWithAutoTable).lastAutoTable.finalY + 4;

      // Disclaimer
      tc(MID); doc.setFont("helvetica", "italic"); doc.setFontSize(7);
      const disclaimerText = `Cost estimate: indicative ZAR Q2 2025 base prices ±25%, ${TIERS[tier].label} tier (×${tf}).${currency !== "ZAR" ? ` Converted at approx 1 ZAR = ${curr.rate.toFixed(4)} ${currency}.` : ""} Always obtain formal supplier quotations before committing to a budget.`;
      doc.text(disclaimerText, M, y, { maxWidth: CW });
      y += 7;
    }

    // ─── Footer on every page (two-pass so page X of Y is correct) ─────────
    const totalPg = doc.getNumberOfPages();
    for (let p = 1; p <= totalPg; p++) {
      doc.setPage(p);
      dc([210, 214, 218]); doc.line(M, PH - 12, PW - M, PH - 12);
      tc(MID);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      doc.text("Fluids Pad", M, PH - 7);
      doc.text(`Page ${p} of ${totalPg}`, PW / 2, PH - 7, { align: "center" });
      doc.text("Verify results before use in design or construction.", PW - M, PH - 7, { align: "right" });
    }

    const slug = (projectName || "pipe-system-design").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    doc.save(`${slug}.pdf`);
  }

  // ─── RFQ PDF generator ─────────────────────────────────────────────────────
  async function generateRfqPDF() {
    if (!bom) return;
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const PW = 210, PH = 297, M = 14, CW = PW - 2 * M;

    type C = [number, number, number];
    const NAVY:  C = [15, 23, 42];
    const TEAL:  C = [13, 148, 136];
    const DARK:  C = [17, 24, 39];
    const MID:   C = [75, 85, 99];
    const LGRAY: C = [248, 250, 252];
    const WHITE: C = [255, 255, 255];
    const GRAY:  C = [229, 231, 235];

    const fc = (c: C) => doc.setFillColor(c[0], c[1], c[2]);
    const tc = (c: C) => doc.setTextColor(c[0], c[1], c[2]);
    const dc = (c: C) => doc.setDrawColor(c[0], c[1], c[2]);

    const today  = new Date();
    const rfqRef = `RFQ-${(projectName || "PROJECT").replace(/[^A-Z0-9]/gi, "-").toUpperCase()}-${today.getFullYear()}${String(today.getMonth()+1).padStart(2,"0")}${String(today.getDate()).padStart(2,"0")}`;
    const dateStr = today.toLocaleDateString("en-ZA", { day:"numeric", month:"long", year:"numeric" });

    // ── Header banner ──────────────────────────────────────────────────────
    fc(NAVY); doc.rect(0, 0, PW, 10, "F");
    tc(WHITE); doc.setFont("helvetica", "bold"); doc.setFontSize(7);
    doc.text("FLUID MECHANICS COMPANION", M, 6.5);
    doc.setFont("helvetica", "normal");
    doc.text("fluidspad.com", PW - M, 6.5, { align: "right" });

    // ── Title ──────────────────────────────────────────────────────────────
    tc(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
    doc.text("REQUEST FOR QUOTATION", M, 25);

    dc(TEAL); doc.setLineWidth(0.8); doc.line(M, 28, PW - M, 28);

    // ── Info grid ─────────────────────────────────────────────────────────
    const INFO: [string, string][] = [
      ["RFQ Reference:", rfqRef],
      ["Date:",          dateStr],
      ["Project:",       projectName || "Pipe System Design"],
      ["Fluid system:",  `${fluid.label} · Q = ${flowVal} ${flowUnit} · DN${bom.dn} ${bom.matLabel}`],
    ];

    let y = 34;
    doc.setLineWidth(0.2);
    INFO.forEach(([label, val]) => {
      tc(MID); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      doc.text(label, M, y);
      tc(DARK); doc.setFont("helvetica", "bold");
      doc.text(val, M + 38, y);
      y += 5.5;
    });

    // ── From / contact ─────────────────────────────────────────────────────
    y += 3;
    if (rfqName || rfqCompany || rfqEmail) {
      fc(LGRAY); dc(GRAY); doc.setLineWidth(0.2);
      doc.roundedRect(M, y, CW, 22, 1.5, 1.5, "FD");
      tc(MID); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
      doc.text("FROM", M + 3, y + 5);
      tc(DARK); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
      const from = [rfqName, rfqCompany].filter(Boolean).join(" · ");
      doc.text(from, M + 3, y + 10.5);
      const contact = [rfqEmail, rfqPhone].filter(Boolean).join("   |   ");
      if (contact) { tc(MID); doc.setFontSize(8); doc.text(contact, M + 3, y + 16); }
      y += 27;
    }

    // ── Delivery & validity ───────────────────────────────────────────────
    if (rfqLocation || rfqDate) {
      fc(LGRAY); dc(GRAY);
      doc.roundedRect(M, y, CW, 14, 1.5, 1.5, "FD");
      tc(MID); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
      doc.text("DELIVERY REQUIREMENTS", M + 3, y + 5);
      tc(DARK); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      const delivery = [
        rfqLocation ? `Location: ${rfqLocation}` : null,
        rfqDate     ? `Required by: ${rfqDate}` : null,
      ].filter(Boolean).join("     ");
      doc.text(delivery || "", M + 3, y + 10.5);
      y += 19;
    }

    y += 3;
    tc(DARK); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    doc.text("Please provide unit pricing for the following items. All prices in South African Rand (ZAR).", M, y);
    y += 7;

    // ── BOM table ─────────────────────────────────────────────────────────
    const tierF = TIERS[tier].factor;
    const rows: string[][] = [];
    let no = 1;

    // Pipe
    if (bom.L > 0) {
      rows.push([
        String(no++),
        `Pipe — ${bom.matLabel}`,
        `DN${bom.dn}, Schedule 40, ID ${bom.dn} mm`,
        "m",
        String(Math.ceil(bom.L)),
        rfqShowPrices && bom.pipeUP !== null ? conv(bom.pipeUP * tierF, curr.rate, curr.sym) : "",
        "",
      ]);
    }

    // Fittings
    bom.fittingLines.forEach((line) => {
      rows.push([
        String(no++),
        line.label,
        `DN${bom.dn}, CS flanged`,
        "ea",
        String(line.qty),
        rfqShowPrices && line.up !== null ? conv(line.up * tierF, curr.rate, curr.sym) : "",
        "",
      ]);
    });

    // Pump
    if (bom.pumpR && pump) {
      rows.push([
        String(no++),
        `Centrifugal pump`,
        `~${fmt(pump.powerKW, 1)} kW shaft power, complete unit`,
        "ea",
        "1",
        rfqShowPrices ? `${conv(bom.pumpR.lo * tierF, curr.rate, curr.sym)} – ${conv(bom.pumpR.hi * tierF, curr.rate, curr.sym)}` : "",
        "",
      ]);
    }

    // Custom items
    customItems.forEach((item) => {
      if (!item.desc) return;
      rows.push([
        String(no++),
        item.desc,
        "",
        "ea",
        item.qty,
        rfqShowPrices ? `${curr.sym} ${item.up}` : "",
        "",
      ]);
    });

    autoTable(doc, {
      head: [[
        { content: "No.",         styles: { halign: "center",  cellWidth: 10 } },
        { content: "Description", styles: { halign: "left",    cellWidth: 45 } },
        { content: "Specification",styles: { halign: "left",   cellWidth: 45 } },
        { content: "Unit",        styles: { halign: "center",  cellWidth: 13 } },
        { content: "Qty",         styles: { halign: "center",  cellWidth: 13 } },
        { content: rfqShowPrices ? `Est. Unit Price (${curr.sym})` : `Unit Price (${curr.sym})`, styles: { halign: "right", cellWidth: 30 } },
        { content: `Total (${curr.sym})`, styles: { halign: "right", cellWidth: 26 } },
      ]],
      body: rows,
      startY: y,
      margin: { left: M, right: M, top: 16, bottom: 28 },
      tableWidth: CW,
      styles: { font: "helvetica", overflow: "linebreak" },
      headStyles: {
        fillColor: NAVY, textColor: WHITE, fontStyle: "bold",
        fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      },
      bodyStyles: {
        fontSize: 8, textColor: DARK,
        cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
      },
      alternateRowStyles: { fillColor: LGRAY },
      columnStyles: {
        0: { halign: "center" },
        3: { halign: "center" },
        4: { halign: "center" },
        5: { halign: "right", fontStyle: rfqShowPrices ? "normal" : "normal",
             textColor: rfqShowPrices ? TEAL : GRAY },
        6: { halign: "right" },
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          fc(NAVY); doc.rect(0, 0, PW, 10, "F");
          tc(WHITE); doc.setFont("helvetica", "bold"); doc.setFontSize(7);
          doc.text(rfqRef, M, 6.5);
          doc.setFont("helvetica", "normal");
          doc.text(dateStr, PW - M, 6.5, { align: "right" });
        }
      },
    });

    const tableBottom = (doc as unknown as JsPDFWithAutoTable).lastAutoTable.finalY;
    y = tableBottom + 6;

    // ── Subtotal box (blank for supplier to fill) ──────────────────────────
    autoTable(doc, {
      head: [],
      body: [
        ["Subtotal (excl. VAT)", ""],
        ["VAT (15%)",            ""],
        ["TOTAL (incl. VAT)",    ""],
      ],
      startY: y,
      margin: { left: PW - M - 80, right: M },
      tableWidth: 80,
      styles: { font: "helvetica", fontSize: 8.5 },
      bodyStyles: { textColor: DARK, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
      columnStyles: {
        0: { cellWidth: 50, textColor: MID },
        1: { cellWidth: 30, halign: "right", fontStyle: "bold" },
      },
    });

    y = (doc as unknown as JsPDFWithAutoTable).lastAutoTable.finalY + 6;

    // ── Terms box ──────────────────────────────────────────────────────────
    if (y < PH - 55) {
      fc(LGRAY); dc(GRAY); doc.setLineWidth(0.2);
      doc.roundedRect(M, y, CW, 26, 1.5, 1.5, "FD");
      tc(MID); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
      doc.text("TERMS & CONDITIONS", M + 3, y + 5);
      const terms = [
        "• All prices to be quoted in South African Rand (ZAR) inclusive of all charges",
        "• Quote validity: minimum 30 days from date of submission",
        "• Please include lead times, delivery costs, and BBBEE certificate",
        rfqEmail ? `• Submit quotation to: ${rfqEmail}` : "• Please respond to the contact details above",
      ];
      tc(DARK); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      terms.forEach((line, i) => doc.text(line, M + 3, y + 10 + i * 4.5));
    }

    // ── Footers ────────────────────────────────────────────────────────────
    const totalPg = doc.getNumberOfPages();
    for (let p = 1; p <= totalPg; p++) {
      doc.setPage(p);
      dc([210, 214, 218]); doc.setLineWidth(0.3); doc.line(M, PH - 12, PW - M, PH - 12);
      tc(MID); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      doc.text(`${rfqRef} — Confidential`, M, PH - 7);
      doc.text(`Page ${p} of ${totalPg}`, PW / 2, PH - 7, { align: "center" });
      doc.text("Generated by Fluids Pad", PW - M, PH - 7, { align: "right" });
    }

    const slug = (projectName || "rfq").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    doc.save(`${slug}-rfq.pdf`);
  }

  // ─── localStorage save / load / delete ────────────────────────────────────
  function saveDesign() {
    const name    = projectName.trim() || "Untitled Design";
    const summary = pipe
      ? `${fluid.label} · Q = ${flowVal} ${flowUnit} · DN${useDn ? DN_SIZES[dnIdx].dn : nearestDn(parseFloat(diamMm) || 0)} · H = ${fmt(pipe.Hsys, 1)} m`
      : `${fluid.label}${flowVal ? ` · Q = ${flowVal} ${flowUnit}` : ""}`;

    const entry: SavedDesign = {
      id:      Date.now().toString(),
      name,
      savedAt: new Date().toISOString(),
      summary,
      state: {
        projectName, fluidIdx, customRho, customMu, customPv,
        flowVal, flowUnit, diamMm, useDn, dnIdx,
        matIdx, customEps, lengthM, elevM, counts,
        etaPct, addStaticM, runHours, energyCost,
        checkNpsh, suctionHM, suctionLossM, npshRM,
        currency, tier, showCost, showLabour, laborPct,
        showMotor, motorAllowPct,
        showCommiss, commisePct, contingPct, includeVat,
        customItems,
      },
    };

    const updated = [entry, ...savedDesigns].slice(0, MAX_SAVES);
    setSavedDesigns(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Trim and retry if storage is full
      const trimmed = [entry, ...savedDesigns].slice(0, 10);
      setSavedDesigns(trimmed);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)); } catch {}
    }
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2500);
  }

  function loadDesign(id: string) {
    const d = savedDesigns.find((x) => x.id === id);
    if (!d) return;
    const s = d.state;
    setProjectName(s.projectName ?? "");
    setFluidIdx(s.fluidIdx ?? 0);
    setCustomRho(s.customRho ?? "1000");
    setCustomMu(s.customMu ?? "0.001002");
    setCustomPv(s.customPv ?? "2338");
    setFlowVal(s.flowVal ?? "");
    setFlowUnit(s.flowUnit ?? "m³/h");
    setDiamMm(s.diamMm ?? "");
    setUseDn(s.useDn ?? false);
    setDnIdx(s.dnIdx ?? 8);
    setMatIdx(s.matIdx ?? 0);
    setCustomEps(s.customEps ?? "0.046");
    setLengthM(s.lengthM ?? "");
    setElevM(s.elevM ?? "0");
    setCounts(s.counts ?? new Array(FITTINGS.length).fill(0));
    setEtaPct(s.etaPct ?? "75");
    setAddStaticM(s.addStaticM ?? "0");
    setRunHours(s.runHours ?? "");
    setEnergyCost(s.energyCost ?? "");
    setCheckNpsh(s.checkNpsh ?? false);
    setSuctionHM(s.suctionHM ?? "3");
    setSuctionLossM(s.suctionLossM ?? "0.5");
    setNpshRM(s.npshRM ?? "");
    setCurrency(s.currency ?? "ZAR");
    setTier((s.tier as TierKey) ?? "standard");
    setShowCost(s.showCost ?? false);
    setShowLabour(s.showLabour ?? false);
    setLaborPct(s.laborPct ?? "25");
    setShowMotor(s.showMotor ?? false);
    setMotorAllowPct(s.motorAllowPct ?? "20");
    setShowCommiss(s.showCommiss ?? false);
    setCommisePct(s.commisePct ?? "5");
    setContingPct(s.contingPct ?? "10");
    setIncludeVat(s.includeVat ?? true);
    setCustomItems(s.customItems ?? []);
    setShowSavedPanel(false);
  }

  function deleteDesign(id: string) {
    const updated = savedDesigns.filter((x) => x.id !== id);
    setSavedDesigns(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  }

  function reset() {
    setProjectName(""); setFlowVal(""); setDiamMm(""); setLengthM("");
    setElevM("0"); setCounts(new Array(FITTINGS.length).fill(0));
    setEtaPct("75"); setAddStaticM("0"); setRunHours(""); setEnergyCost("");
    setCheckNpsh(false); setSuctionHM("3"); setSuctionLossM("0.5"); setNpshRM("");
    setShowCost(false); setCustomItems([]);
    setCurrency("ZAR"); setShowLabour(false); setShowMotor(false);
    setShowCommiss(false); setContingPct("10"); setIncludeVat(true);
  }

  const fitGroups = Array.from(new Set(FITTINGS.map((f) => f.g)));
  const activeFittings = counts.filter((c) => c > 0).length;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-0">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-6 print:hidden">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          {sidebarOpen ? "Hide inputs" : "Show inputs"}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-0.5">Design Workspace</p>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Project name (e.g. Cooling water circuit)"
            className="text-xl font-bold bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 w-full"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* ── Save ── */}
          <button
            onClick={saveDesign}
            title="Save design to browser"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              saveFlash
                ? "bg-green-500 border-green-500 text-white"
                : "bg-teal-600 hover:bg-teal-700 border-transparent text-white shadow-sm shadow-teal-600/20"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {saveFlash ? "Saved!" : "Save"}
          </button>

          {/* ── My Designs ── */}
          <button
            onClick={() => setShowSavedPanel(true)}
            title="Open saved designs"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8m-9 4v4m4-4v4" />
            </svg>
            My Designs
            {savedDesigns.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-full">
                {savedDesigns.length}
              </span>
            )}
          </button>

          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />

          {/* ── Exports ── */}
          <button
            onClick={downloadCSV}
            disabled={!pipe}
            title={!pipe ? "Enter inputs to enable export" : "Download results as CSV"}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV
          </button>
          <button
            onClick={downloadPDF}
            disabled={!pipe}
            title={!pipe ? "Enter inputs to enable PDF export" : "Download formatted PDF report"}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            PDF
          </button>

          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />

          {/* ── Reset ── */}
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── Main layout: sidebar + results ──────────────────────────────────── */}
      <div className="flex gap-5 items-start">

        {/* ══════════════ SIDEBAR (inputs) ══════════════════════════════════ */}
        <aside className={`w-80 xl:w-[340px] flex-shrink-0 space-y-3 sticky top-20 max-h-[calc(100vh-7rem)] overflow-y-auto pb-4 print:hidden ${sidebarOpen ? "block" : "hidden lg:block"}`}>

          {/* ── 1. Fluid & Flow ───────────────────────────────────────────── */}
          <Card>
            <SidebarLabel n={1}>Fluid &amp; Flow</SidebarLabel>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fluid</p>
                <select value={fluidIdx} onChange={(e) => setFluidIdx(Number(e.target.value))} className={SEL}>
                  {FLUIDS.map((f, i) => <option key={i} value={i}>{f.label}</option>)}
                </select>
              </div>

              {fluidIdx === FLUIDS.length - 1 && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ρ (kg/m³)</p>
                    <input type="number" value={customRho} onChange={(e) => setCustomRho(e.target.value)} className={INP} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">μ (Pa·s)</p>
                    <input type="number" value={customMu} onChange={(e) => setCustomMu(e.target.value)} step="any" className={INP} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pv (Pa)</p>
                    <input type="number" value={customPv} onChange={(e) => setCustomPv(e.target.value)} className={INP} />
                  </div>
                </div>
              )}

              {fluidIdx < FLUIDS.length - 1 && (
                <div className="flex gap-3 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2">
                  <span>ρ = {sig(fluid.rho, 5)} kg/m³</span>
                  <span>·</span>
                  <span>μ = {fluid.mu.toExponential(2)} Pa·s</span>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Flow rate Q</p>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={flowVal}
                    onChange={(e) => setFlowVal(e.target.value)}
                    placeholder="e.g. 50"
                    className={`flex-1 ${INP}`}
                  />
                  <select value={flowUnit} onChange={(e) => setFlowUnit(e.target.value as FlowUnit)}
                    className="w-24 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {FLOW_UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {/* ── 2. Pipe Geometry ──────────────────────────────────────────── */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <SidebarLabel n={2}>Pipe Run</SidebarLabel>
              <button
                onClick={() => setShowSizer((v) => !v)}
                className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
              >
                {showSizer ? "Hide" : "DN sizer ↗"}
              </button>
            </div>
            <div className="space-y-3">
              {/* Diameter mode toggle */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex-1">Pipe diameter</p>
                  <div className="flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600 text-xs">
                    <button onClick={() => setUseDn(false)}
                      className={`px-2 py-0.5 ${!useDn ? "bg-teal-500 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                      Custom
                    </button>
                    <button onClick={() => setUseDn(true)}
                      className={`px-2 py-0.5 ${useDn ? "bg-teal-500 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                      DN / Schedule
                    </button>
                  </div>
                </div>
                {useDn ? (
                  <div className="flex gap-2">
                    <select value={dnIdx} onChange={(e) => setDnIdx(Number(e.target.value))} className={`flex-1 ${SEL}`}>
                      {DN_SIZES.map((sz, i) => (
                        <option key={i} value={i}>DN{sz.dn} — ID {sz.id} mm (Sch 40)</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <input type="number" value={diamMm} onChange={(e) => setDiamMm(e.target.value)}
                      placeholder="e.g. 102.3" className={`flex-1 ${INP}`} />
                    <span className="text-xs text-gray-400 flex-shrink-0">mm (ID)</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total length (m)</p>
                  <input type="number" value={lengthM} onChange={(e) => setLengthM(e.target.value)} placeholder="150" className={INP} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Elevation Δz (m)</p>
                  <input type="number" value={elevM} onChange={(e) => setElevM(e.target.value)} placeholder="0" step="any" className={INP} />
                  <p className="text-[10px] text-gray-400 mt-0.5">+ uphill · − downhill</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Material</p>
                <select value={matIdx} onChange={(e) => setMatIdx(Number(e.target.value))} className={SEL}>
                  {PIPE_MATS.map((m, i) => <option key={i} value={i}>{m.label}</option>)}
                </select>
              </div>
              {!isFinite(PIPE_MATS[matIdx].eps) && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Roughness ε (mm)</p>
                  <input type="number" value={customEps} onChange={(e) => setCustomEps(e.target.value)} step="any" className={INP} />
                </div>
              )}
            </div>
          </Card>

          {/* ── 3. Fittings ───────────────────────────────────────────────── */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <SidebarLabel n={3}>Fittings &amp; Valves</SidebarLabel>
              <div className="flex items-center gap-2">
                {activeFittings > 0 && pipe && (
                  <span className="text-xs px-2 py-0.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full font-bold">
                    ΣK={fmt(pipe.sumK, 1)}
                  </span>
                )}
                <button onClick={() => setShowAll((v) => !v)}
                  className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline">
                  {showAll ? "Less" : "All"}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {fitGroups.map((group) => {
                const groupFits = FITTINGS.map((f, i) => ({ ...f, i })).filter((f) => f.g === group);
                const visible = showAll ? groupFits : groupFits.filter((f) => f.K >= 0.5 || counts[f.i] > 0);
                if (visible.length === 0) return null;
                return (
                  <div key={group}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">{group}</p>
                    <div className="space-y-0.5">
                      {visible.map(({ label, K, i }) => (
                        <div key={i} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 leading-tight">{label}</span>
                          <span className="text-[10px] text-gray-400 w-8 text-right">K={K}</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => setCount(i, -1)} disabled={counts[i] === 0}
                              className="w-5 h-5 rounded text-sm font-bold bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center justify-center leading-none">−</button>
                            <span className="w-4 text-center text-xs font-mono font-bold text-gray-900 dark:text-white">{counts[i]}</span>
                            <button onClick={() => setCount(i, 1)}
                              className="w-5 h-5 rounded text-sm font-bold bg-teal-500 hover:bg-teal-600 text-white flex items-center justify-center leading-none">+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* ── 4. Pump & Energy ──────────────────────────────────────────── */}
          <Card>
            <SidebarLabel n={4}>Pump &amp; Energy</SidebarLabel>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Efficiency η (%)</p>
                  <input type="number" value={etaPct} onChange={(e) => setEtaPct(e.target.value)}
                    min="1" max="100" placeholder="75" className={INP} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Add. static head (m)</p>
                  <input type="number" value={addStaticM} onChange={(e) => setAddStaticM(e.target.value)}
                    placeholder="0" step="any" className={INP} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Run hours / yr</p>
                  <input type="number" value={runHours} onChange={(e) => setRunHours(e.target.value)}
                    placeholder="e.g. 8760" className={INP} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Energy cost ({curr.sym}/kWh)</p>
                  <input type="number" value={energyCost} onChange={(e) => setEnergyCost(e.target.value)}
                    placeholder="0.15" step="any" className={INP} />
                </div>
              </div>
            </div>
          </Card>

          {/* ── 5. NPSH check ─────────────────────────────────────────────── */}
          <Card>
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={checkNpsh} onChange={(e) => setCheckNpsh(e.target.checked)}
                className="w-4 h-4 rounded accent-teal-500" />
              <SidebarLabel n={5}>NPSH / Cavitation check</SidebarLabel>
            </label>

            {checkNpsh && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Suction head hs (m)</p>
                    <input type="number" value={suctionHM} onChange={(e) => setSuctionHM(e.target.value)}
                      placeholder="3" step="any" className={INP} />
                    <p className="text-[10px] text-gray-400 mt-0.5">+ above pump · − flooded</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Suction losses (m)</p>
                    <input type="number" value={suctionLossM} onChange={(e) => setSuctionLossM(e.target.value)}
                      placeholder="0.5" step="any" className={INP} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">NPSHr from datasheet (m)</p>
                  <input type="number" value={npshRM} onChange={(e) => setNpshRM(e.target.value)}
                    placeholder="optional" step="any" className={INP} />
                </div>
              </div>
            )}
          </Card>

          {/* ── 6. Cost Estimator ─────────────────────────────────────── */}
          <Card>
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={showCost} onChange={(e) => setShowCost(e.target.checked)}
                className="w-4 h-4 rounded accent-teal-500" />
              <SidebarLabel n={6}>Cost Estimator</SidebarLabel>
            </label>

            {showCost && (
              <div className="space-y-3">

                {/* Currency */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Display currency</p>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyKey)} className={SEL}>
                    {(Object.entries(CURRENCIES) as [CurrencyKey, typeof CURRENCIES[CurrencyKey]][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  {currency !== "ZAR" && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                      Source prices are ZAR. Approx rate: 1 ZAR = {CURRENCIES[currency].rate.toFixed(4)} {currency}
                    </p>
                  )}
                </div>

                {/* Supplier tier */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Supplier / market tier</p>
                  <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                    {(Object.entries(TIERS) as [TierKey, typeof TIERS[TierKey]][]).map(([key, t]) => (
                      <button
                        key={key}
                        onClick={() => setTier(key)}
                        className={`flex-1 py-2 text-[11px] font-bold text-center transition-colors leading-tight ${
                          tier === key
                            ? "bg-teal-500 text-white"
                            : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                        }`}
                      >
                        {t.label}
                        <span className={`block text-[9px] font-normal mt-0.5 ${tier === key ? "text-teal-100" : "opacity-60"}`}>
                          {t.adj}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{TIERS[tier].desc}</p>
                </div>

                {/* Labour — optional */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={showLabour} onChange={(e) => setShowLabour(e.target.checked)}
                      className="w-4 h-4 rounded accent-teal-500" />
                    Include installation labour
                  </label>
                  {showLabour && (
                    <div className="pl-6">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Labour (% of materials)</p>
                      <input type="number" value={laborPct} onChange={(e) => setLaborPct(e.target.value)}
                        placeholder="25" min="0" max="200" className={INP} />
                    </div>
                  )}
                </div>

                {/* Motor & controls — optional */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={showMotor} onChange={(e) => setShowMotor(e.target.checked)}
                      className="w-4 h-4 rounded accent-teal-500" />
                    Motor &amp; electrical allowance
                  </label>
                  {showMotor && (
                    <div className="pl-6">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">% of pump cost</p>
                      <input type="number" value={motorAllowPct} onChange={(e) => setMotorAllowPct(e.target.value)}
                        placeholder="20" min="0" className={INP} />
                    </div>
                  )}
                </div>

                {/* Contingency */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Contingency (%)</p>
                  <input type="number" value={contingPct} onChange={(e) => setContingPct(e.target.value)}
                    placeholder="10" min="0" max="100" className={INP} />
                </div>

                {/* Commissioning — optional */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={showCommiss} onChange={(e) => setShowCommiss(e.target.checked)}
                      className="w-4 h-4 rounded accent-teal-500" />
                    Commissioning &amp; start-up
                  </label>
                  {showCommiss && (
                    <div className="pl-6">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">% of subtotal</p>
                      <input type="number" value={commisePct} onChange={(e) => setCommisePct(e.target.value)}
                        placeholder="5" min="0" className={INP} />
                    </div>
                  )}
                </div>

                {/* VAT */}
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={includeVat} onChange={(e) => setIncludeVat(e.target.checked)}
                    className="w-4 h-4 rounded accent-teal-500" />
                  Include VAT / GST (15%)
                </label>

                <div className="text-xs text-gray-400 dark:text-gray-500 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-800">
                  ⚠ Indicative prices only. Q2 2025 ZAR reference. ±25% typical variation.
                </div>
              </div>
            )}
          </Card>

        </aside>

        {/* ══════════════ RESULTS (main area) ══════════════════════════════ */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* ── Empty state ─────────────────────────────────────────────── */}
          {!pipe && (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-500 dark:text-gray-400 mb-1">Enter fluid, flow rate, and pipe dimensions</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Results update live as you type</p>
            </div>
          )}

          {pipe && (
            <>
              {/* ── Quick status bar ──────────────────────────────────── */}
              <div className="flex flex-wrap gap-2 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                  pipe.velOk
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                    : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                }`}>
                  {pipe.velOk ? "✓" : "⚠"} Velocity {fmt(pipe.V, 2)} m/s
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                  pipe.regime === "Turbulent"
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                    : pipe.regime === "Transitional"
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                    : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                }`}>
                  {pipe.regime} · Re = {sig(pipe.Re, 3)}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300">
                  System head {fmt(pipe.Hsys, 2)} m
                </span>
                {pump && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
                    Shaft power {fmt(pump.powerKW, 2)} kW
                  </span>
                )}
                {npsh && npsh.status !== "No NPSHr entered" && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                    npsh.status === "Safe"
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                      : npsh.status === "Marginal"
                      ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                      : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                  }`}>
                    NPSH: {npsh.status}
                  </span>
                )}
              </div>

              {/* ── Flow metrics row ──────────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatChip
                  label="Flow velocity"
                  value={fmt(pipe.V, 2)}
                  unit="m/s"
                  color={pipe.velOk ? "green" : "amber"}
                />
                <StatChip label="Reynolds number" value={sig(pipe.Re, 4)} color="gray" />
                <div className={`rounded-xl border p-4 ${
                  pipe.regime === "Laminar"      ? "bg-green-50  dark:bg-green-900/20  border-green-200  dark:border-green-800" :
                  pipe.regime === "Transitional" ? "bg-amber-50  dark:bg-amber-900/20  border-amber-200  dark:border-amber-800" :
                                                   "bg-red-50    dark:bg-red-900/20    border-red-200    dark:border-red-800"
                }`}>
                  <p className="text-xs font-semibold opacity-70 mb-1">Flow regime</p>
                  <p className={`text-xl font-black leading-none ${pipe.rColor}`}>{pipe.regime}</p>
                </div>
                <StatChip label="Friction factor f" value={fmt(pipe.f, 4)} color="gray" />
                <StatChip label="ε/D" value={pipe.eD.toExponential(2)} color="gray" />
              </div>

              {/* ── Velocity note ─────────────────────────────────────── */}
              {!pipe.velOk && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-sm text-amber-700 dark:text-amber-300">
                  <span className="text-base">⚠</span>
                  <span className="font-medium">{pipe.velNote}</span>
                  {flowVal && parseFloat(flowVal) > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 ml-1">
                      — at Q = {flowVal} {flowUnit}, try {pipe.V < 0.5 ? "a smaller" : "a larger"} pipe diameter
                    </span>
                  )}
                </div>
              )}

              {/* ── Head budget ───────────────────────────────────────── */}
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <SectionTitle
                    title="Head Budget"
                    subtitle="Darcy-Weisbach · Colebrook-White · K-factor minor losses"
                  />
                  <div className="text-right flex-shrink-0 pt-1">
                    <p className="text-xs text-gray-400 dark:text-gray-500">Hydraulic gradient</p>
                    <p className="text-sm font-mono font-bold text-gray-700 dark:text-gray-300">
                      {fmt(pipe.gradPa_m, 0)} Pa/m
                    </p>
                  </div>
                </div>

                <HeadBudgetBar hf={pipe.hf} hm={pipe.hm} dz={pipe.dz} />

                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-3 border border-teal-200 dark:border-teal-800">
                    <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 mb-0.5">Friction loss hf</p>
                    <p className="text-lg font-black text-teal-700 dark:text-teal-300">{fmt(pipe.hf, 2)} <span className="text-sm">m</span></p>
                    <p className="text-xs text-teal-600/70 dark:text-teal-400/70">{fmt(pipe.dPfric_kPa, 1)} kPa</p>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 border border-indigo-200 dark:border-indigo-800">
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5">Minor losses hm</p>
                    <p className="text-lg font-black text-indigo-700 dark:text-indigo-300">{fmt(pipe.hm, 2)} <span className="text-sm">m</span></p>
                    <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">ΣK = {fmt(pipe.sumK, 2)}</p>
                  </div>
                  <div className={`rounded-xl p-3 border ${pipe.dz >= 0
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                    : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"}`}>
                    <p className={`text-xs font-semibold mb-0.5 ${pipe.dz >= 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>
                      Elevation Δz
                    </p>
                    <p className={`text-lg font-black ${pipe.dz >= 0 ? "text-amber-700 dark:text-amber-300" : "text-green-700 dark:text-green-300"}`}>
                      {pipe.dz >= 0 ? "+" : ""}{fmt(pipe.dz, 1)} <span className="text-sm">m</span>
                    </p>
                    <p className={`text-xs opacity-70 ${pipe.dz >= 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>
                      {pipe.dz >= 0 ? "pumping uphill" : "gravity assist"}
                    </p>
                  </div>
                  <div className="bg-gray-900 dark:bg-gray-100 rounded-xl p-3 border border-gray-700 dark:border-gray-300">
                    <p className="text-xs font-semibold text-gray-300 dark:text-gray-600 mb-0.5">System head</p>
                    <p className="text-xl font-black text-white dark:text-gray-900">{fmt(pipe.Hsys, 2)} <span className="text-sm">m</span></p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{fmt(pipe.dPtotal_kPa, 1)} kPa · {fmt(pipe.dPtotal_kPa / 100, 3)} bar</p>
                  </div>
                </div>
              </Card>

              {/* ── DN Sizer table ────────────────────────────────────── */}
              {showSizer && sizerRows.length > 0 && (
                <Card>
                  <SectionTitle
                    title="Pipe Size Comparison"
                    subtitle={`Schedule 40 bore IDs at Q = ${flowVal} ${flowUnit} — click any row to apply`}
                    accent="indigo"
                  />
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left pb-2 pr-3">DN</th>
                          <th className="text-right pb-2 pr-3">ID (mm)</th>
                          <th className="text-right pb-2 pr-3">V (m/s)</th>
                          <th className="text-right pb-2 pr-3">Re</th>
                          <th className="text-right pb-2 pr-3">Regime</th>
                          <th className="text-right pb-2 pr-3">f</th>
                          {sizerRows[0].hf !== null && <th className="text-right pb-2">hf (m)</th>}
                          <th className="text-right pb-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sizerRows.map((row) => (
                          <tr
                            key={row.dn}
                            onClick={() => {
                              setUseDn(true);
                              setDnIdx(DN_SIZES.findIndex((s) => s.dn === row.dn));
                            }}
                            className={`cursor-pointer border-b border-gray-100 dark:border-gray-700/50 last:border-0 transition-colors ${
                              row.current
                                ? "bg-teal-50 dark:bg-teal-900/20"
                                : "hover:bg-gray-50 dark:hover:bg-gray-700/40"
                            }`}
                          >
                            <td className={`py-2 pr-3 font-bold ${row.current ? "text-teal-600 dark:text-teal-400" : "text-gray-900 dark:text-white"}`}>
                              DN{row.dn}
                            </td>
                            <td className="py-2 pr-3 text-right font-mono text-gray-700 dark:text-gray-300">{row.id}</td>
                            <td className={`py-2 pr-3 text-right font-mono font-bold ${
                              row.V < 0.5 || row.V > 3 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"
                            }`}>{fmt(row.V, 2)}</td>
                            <td className="py-2 pr-3 text-right font-mono text-gray-600 dark:text-gray-400">{sig(row.Re, 3)}</td>
                            <td className="py-2 pr-3 text-right text-gray-600 dark:text-gray-400">{row.regime}</td>
                            <td className="py-2 pr-3 text-right font-mono text-gray-600 dark:text-gray-400">{fmt(row.f, 4)}</td>
                            {row.hf !== null && (
                              <td className="py-2 text-right font-mono text-gray-700 dark:text-gray-300">{fmt(row.hf, 2)}</td>
                            )}
                            <td className="py-2 pl-3 text-right">
                              <span className={`text-sm ${row.ok ? "text-green-500" : "text-amber-500"}`}>{row.flag}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    ✓ 0.5–3.0 m/s recommended &nbsp;·&nbsp; ⚠ outside range &nbsp;·&nbsp; ⚠⚠ outside safe limits
                  </p>
                </Card>
              )}

              {/* ── Pump duty ─────────────────────────────────────────── */}
              {pump && (
                <Card>
                  <SectionTitle
                    title="Pump Duty Point"
                    subtitle={`Required at Q = ${flowVal} ${flowUnit}`}
                    accent="indigo"
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <StatChip label="Flow rate Q" value={`${flowVal}`} unit={flowUnit} color="gray" />
                    <StatChip label="Total duty head H" value={fmt(pump.Htotal, 2)} unit="m" color="teal" size="md" />
                    <StatChip label="Min. shaft power" value={fmt(pump.powerKW, 2)} unit="kW" color="indigo" size="md" />
                    <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                      <p className="text-xs font-semibold opacity-70 mb-1">Hydraulic power</p>
                      <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">
                        {fmt(pump.powerKW * (parseFloat(etaPct) / 100), 2)}
                        <span className="text-sm font-semibold ml-1">kW</span>
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">η = {etaPct}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <Row label="System head (pipe run)" value={fmt(pipe.Hsys, 2)} unit="m" />
                    <Row label="Additional static head" value={fmt(pump.addH, 2)} unit="m" />
                    <Row label="Total pressure rise" value={fmt(pump.Htotal * pipe.rho * G / 1000, 1)} unit="kPa" />
                  </div>

                  {/* Energy cost section */}
                  {pump.annualKwh !== null && (
                    <div className="mt-4 pt-5 border-t border-gray-100 dark:border-gray-700">
                      <SectionTitle title="Annual Energy &amp; Cost" subtitle={`At η = ${etaPct}%, ${runHours} h/yr`} accent="green" />
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatChip label="Run hours / year" value={runHours} unit="h" color="gray" size="sm" />
                        <StatChip label="Annual energy" value={sig(pump.annualKwh, 4)} unit="kWh" color="gray" size="sm" />
                        <StatChip label="Annual energy" value={fmt(pump.annualKwh / 1000, 2)} unit="MWh" color="gray" size="sm" />
                        {pump.annualCost !== null ? (
                          <StatChip label="Annual cost" value={sig(pump.annualCost, 4)} unit="$" color="indigo" size="sm" />
                        ) : (
                          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-3 flex items-center justify-center">
                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Enter energy cost for $ estimate</p>
                          </div>
                        )}
                      </div>
                      {pump.annualCost !== null && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                          At {energyCost} $/kWh · {runHours} h/yr · {fmt(pump.powerKW, 2)} kW shaft power
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              )}

              {/* ── NPSH ──────────────────────────────────────────────── */}
              {checkNpsh && npsh && (
                <Card>
                  <SectionTitle
                    title="NPSH — Cavitation Check"
                    subtitle="Net Positive Suction Head available vs. required"
                    accent={npsh.sColor === "red" ? "red" : npsh.sColor === "amber" ? "amber" : "green"}
                  />

                  {/* Formula */}
                  <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl px-4 py-3 mb-4 font-mono text-sm">
                    <p className="text-gray-500 dark:text-gray-400 mb-1 font-sans text-xs font-semibold">NPSHa = Patm/(ρg) + hs − hf_s − Pv/(ρg)</p>
                    <p className="text-gray-800 dark:text-gray-200">
                      = {fmt(PA_ATM / (fluid.rho * G), 2)}
                      {" "}{parseFloat(suctionHM) >= 0 ? "+" : "−"}{" "}{fmt(Math.abs(parseFloat(suctionHM)), 2)}
                      {" "}− {fmt(parseFloat(suctionLossM) || 0, 2)}
                      {" "}− {fmt(fluid.Pv / (fluid.rho * G), 2)}
                      {" "}= <strong className="text-teal-600 dark:text-teal-400">{fmt(npsh.NPSHa, 2)} m</strong>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatChip label="Patm/(ρg)" value={fmt(PA_ATM / (fluid.rho * G), 2)} unit="m" color="gray" size="sm" />
                    <StatChip label="Suction head hs" value={fmt(parseFloat(suctionHM), 2)} unit="m" color="gray" size="sm" />
                    <StatChip label="Pv/(ρg)" value={fmt(fluid.Pv / (fluid.rho * G), 3)} unit="m" color="gray" size="sm" />
                    <StatChip label="NPSHa" value={fmt(npsh.NPSHa, 2)} unit="m" color="teal" size="sm" />
                  </div>

                  {isFinite(npsh.NPSHr) && npsh.margin !== null && (
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <StatChip label="NPSHr (datasheet)" value={fmt(npsh.NPSHr, 2)} unit="m" color="gray" size="sm" />
                      <StatChip
                        label="Margin"
                        value={fmt(npsh.margin, 2)}
                        unit="m"
                        color={npsh.margin > 1 ? "green" : npsh.margin > 0 ? "amber" : "red"}
                        size="sm"
                      />
                      <StatChip
                        label="Status"
                        value={npsh.status}
                        color={npsh.sColor as "green" | "amber" | "red" | "gray"}
                        size="sm"
                      />
                    </div>
                  )}

                  {npsh.margin !== null && npsh.margin <= 0 && (
                    <div className="mt-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300 font-medium">
                      ⚠ NPSHa &lt; NPSHr — cavitation is likely. Raise suction tank, reduce suction line losses, or select a pump with lower NPSHr.
                    </div>
                  )}
                  {npsh.margin !== null && npsh.margin > 0 && npsh.margin <= 1 && (
                    <div className="mt-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300 font-medium">
                      ⚠ Margin &lt; 1 m — recommend increasing NPSHa or selecting pump with lower NPSHr.
                    </div>
                  )}
                </Card>
              )}

              {/* ── Cost Estimator ────────────────────────────────────── */}
              {showCost && bom && costTotals && (
                <Card>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                    <SectionTitle
                      title="Cost Estimator"
                      subtitle={`DN${bom.dn} · ${bom.matLabel} · Q2 2025 ZAR base prices ±25%`}
                      accent="amber"
                    />
                    <div className="flex items-center gap-2 flex-shrink-0 mt-1 flex-wrap">
                      {/* Tier badge */}
                      {tier !== "standard" && (
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                          tier === "budget"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                        }`}>
                          {TIERS[tier].label} · {TIERS[tier].adj}
                        </span>
                      )}
                      <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                        {curr.sym} {currency}
                      </span>
                      {/* RFQ button */}
                      <button
                        onClick={() => setShowRfq(true)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Request Quotes
                      </button>
                    </div>
                  </div>

                  {/* BOM table */}
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b-2 border-gray-200 dark:border-gray-700">
                          <th className="text-left pb-2 pr-3">Item</th>
                          <th className="text-right pb-2 pr-3">Qty</th>
                          <th className="text-right pb-2 pr-2">Unit</th>
                          <th className="text-right pb-2 pr-3">Unit price</th>
                          <th className="text-right pb-2">Line total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">

                        {/* ── Materials ─────────────────── */}
                        <tr>
                          <td colSpan={5} className="pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            Materials — supply only
                          </td>
                        </tr>

                        {/* Pipe */}
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="py-2 pr-3 text-gray-800 dark:text-gray-200 font-medium">
                            Pipe — {bom.matLabel} DN{bom.dn}
                          </td>
                          <td className="py-2 pr-3 text-right font-mono text-gray-700 dark:text-gray-300">{fmt(bom.L, 1)}</td>
                          <td className="py-2 pr-2 text-right text-xs text-gray-400">m</td>
                          <td className="py-2 pr-3 text-right font-mono text-gray-500 dark:text-gray-400">
                            {bom.pipeUP !== null ? conv(bom.pipeUP * TIERS[tier].factor, curr.rate, curr.sym) : <span className="italic text-gray-400">N/A</span>}
                          </td>
                          <td className="py-2 text-right font-mono font-semibold text-gray-900 dark:text-white">
                            {bom.pipeCost !== null ? conv(bom.pipeCost * TIERS[tier].factor, curr.rate, curr.sym) : <span className="italic text-gray-400">N/A</span>}
                          </td>
                        </tr>

                        {/* Fittings */}
                        {bom.fittingLines.map((line) => (
                          <tr key={line.label} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                            <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">{line.label}</td>
                            <td className="py-2 pr-3 text-right font-mono text-gray-700 dark:text-gray-300">{line.qty}</td>
                            <td className="py-2 pr-2 text-right text-xs text-gray-400">ea</td>
                            <td className="py-2 pr-3 text-right font-mono text-gray-500 dark:text-gray-400">
                              {line.up !== null ? conv(line.up * TIERS[tier].factor, curr.rate, curr.sym) : <span className="italic text-gray-400">N/A</span>}
                            </td>
                            <td className="py-2 text-right font-mono font-semibold text-gray-900 dark:text-white">
                              {line.total !== null ? conv(line.total * TIERS[tier].factor, curr.rate, curr.sym) : <span className="italic text-gray-400">N/A</span>}
                            </td>
                          </tr>
                        ))}

                        {/* Pump */}
                        {bom.pumpR && pump && (
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                            <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">
                              Centrifugal pump ~{fmt(pump.powerKW, 1)} kW
                              <span className="ml-1 text-[10px] text-gray-400">(supply only)</span>
                            </td>
                            <td className="py-2 pr-3 text-right font-mono text-gray-700 dark:text-gray-300">1</td>
                            <td className="py-2 pr-2 text-right text-xs text-gray-400">ea</td>
                            <td className="py-2 pr-3 text-right font-mono text-gray-500 dark:text-gray-400 text-xs">
                              {conv(bom.pumpR.lo, curr.rate, curr.sym)}
                              <span className="text-gray-400"> – </span>
                              {conv(bom.pumpR.hi, curr.rate, curr.sym)}
                            </td>
                            <td className="py-2 text-right font-mono font-semibold text-gray-900 dark:text-white">
                              ~{conv(bom.pumpMid! * TIERS[tier].factor, curr.rate, curr.sym)}
                            </td>
                          </tr>
                        )}

                        {/* Motor & electrical */}
                        {showMotor && costTotals.motorZAR > 0 && (
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                            <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">
                              Motor, starter &amp; electrical ({motorAllowPct}% of pump)
                            </td>
                            <td className="py-2 pr-3 text-right font-mono text-gray-700 dark:text-gray-300">1</td>
                            <td className="py-2 pr-2 text-right text-xs text-gray-400">lsum</td>
                            <td className="py-2 pr-3" />
                            <td className="py-2 text-right font-mono font-semibold text-gray-900 dark:text-white">
                              {conv(costTotals.motorZAR, curr.rate, curr.sym)}
                            </td>
                          </tr>
                        )}

                        {/* Materials subtotal */}
                        <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30">
                          <td colSpan={4} className="py-2 pr-3 text-sm font-bold text-gray-700 dark:text-gray-300">
                            Materials subtotal
                          </td>
                          <td className="py-2 text-right font-bold font-mono text-gray-900 dark:text-white">
                            {conv(costTotals.matAdj + costTotals.motorZAR, curr.rate, curr.sym)}
                          </td>
                        </tr>

                        {/* ── Custom line items ──────────── */}
                        {(customItems.length > 0 || true) && (
                          <tr>
                            <td colSpan={5} className="pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                              Additional items
                              <button
                                onClick={() => setCustomItems(prev => [...prev, { id: Date.now().toString(), desc: "", qty: "1", up: "0" }])}
                                className="ml-2 text-teal-600 dark:text-teal-400 hover:underline font-bold normal-case text-[10px]"
                              >
                                + Add item
                              </button>
                            </td>
                          </tr>
                        )}

                        {customItems.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                            <td className="py-1.5 pr-2">
                              <input
                                type="text"
                                value={item.desc}
                                onChange={(e) => setCustomItems(prev => prev.map(x => x.id === item.id ? { ...x, desc: e.target.value } : x))}
                                placeholder="Description (e.g. Civil works)"
                                className="w-full text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                              />
                            </td>
                            <td className="py-1.5 pr-2">
                              <input
                                type="number"
                                value={item.qty}
                                onChange={(e) => setCustomItems(prev => prev.map(x => x.id === item.id ? { ...x, qty: e.target.value } : x))}
                                className="w-16 text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-right focus:outline-none focus:ring-1 focus:ring-teal-500"
                              />
                            </td>
                            <td className="py-1.5 pr-2 text-xs text-gray-400 text-right">ea</td>
                            <td className="py-1.5 pr-2">
                              <div className="flex items-center gap-1 justify-end">
                                <span className="text-xs text-gray-400">{curr.sym}</span>
                                <input
                                  type="number"
                                  value={item.up}
                                  onChange={(e) => setCustomItems(prev => prev.map(x => x.id === item.id ? { ...x, up: e.target.value } : x))}
                                  className="w-24 text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-right focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                              </div>
                            </td>
                            <td className="py-1.5 pl-2">
                              <div className="flex items-center justify-end gap-2">
                                <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                                  {curr.sym} {((parseFloat(item.qty)||0)*(parseFloat(item.up)||0)).toLocaleString("en-ZA",{maximumFractionDigits:0})}
                                </span>
                                <button
                                  onClick={() => setCustomItems(prev => prev.filter(x => x.id !== item.id))}
                                  className="text-red-400 hover:text-red-600 dark:hover:text-red-300 text-base leading-none ml-1"
                                  title="Remove"
                                >×</button>
                              </div>
                            </td>
                          </tr>
                        ))}

                        {customItems.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-2 text-xs text-gray-400 dark:text-gray-500 italic">
                              No additional items. Click "+ Add item" above to include civil, electrical, instrumentation, etc.
                            </td>
                          </tr>
                        )}

                        {/* ── Adjustments ───────────────── */}
                        <tr>
                          <td colSpan={5} className="pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            Adjustments
                          </td>
                        </tr>

                        {/* Labour */}
                        {showLabour && (
                          <tr>
                            <td colSpan={4} className="py-2 pr-3 text-gray-600 dark:text-gray-400">
                              Installation labour ({laborPct}% of materials)
                            </td>
                            <td className="py-2 text-right font-mono text-gray-800 dark:text-gray-200">
                              {conv(costTotals.labor, curr.rate, curr.sym)}
                            </td>
                          </tr>
                        )}

                        {/* Contingency */}
                        {parseFloat(contingPct) > 0 && (
                          <tr>
                            <td colSpan={4} className="py-2 pr-3 text-gray-600 dark:text-gray-400">
                              Contingency ({contingPct}%)
                            </td>
                            <td className="py-2 text-right font-mono text-gray-800 dark:text-gray-200">
                              {conv(costTotals.conting, curr.rate, curr.sym)}
                            </td>
                          </tr>
                        )}

                        {/* Commissioning */}
                        {showCommiss && costTotals.commiss > 0 && (
                          <tr>
                            <td colSpan={4} className="py-2 pr-3 text-gray-600 dark:text-gray-400">
                              Commissioning &amp; start-up ({commisePct}%)
                            </td>
                            <td className="py-2 text-right font-mono text-gray-800 dark:text-gray-200">
                              {conv(costTotals.commiss, curr.rate, curr.sym)}
                            </td>
                          </tr>
                        )}

                        {/* VAT */}
                        {includeVat && (
                          <tr>
                            <td colSpan={4} className="py-2 pr-3 text-gray-600 dark:text-gray-400">VAT / GST (15%)</td>
                            <td className="py-2 text-right font-mono text-gray-800 dark:text-gray-200">
                              {conv(costTotals.vat, curr.rate, curr.sym)}
                            </td>
                          </tr>
                        )}

                      </tbody>
                    </table>
                  </div>

                  {/* Grand total */}
                  <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                    <div>
                      <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                        Estimated project total {includeVat ? `(incl. 15% VAT)` : `(excl. VAT)`}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                        {[
                          "Materials",
                          showLabour ? "labour" : null,
                          showMotor ? "motor/electrical" : null,
                          "contingency",
                          showCommiss ? "commissioning" : null,
                        ].filter(Boolean).join(" + ")}
                      </p>
                    </div>
                    <p className="text-3xl font-black text-amber-700 dark:text-amber-300 ml-4">
                      {conv(costTotals.grand, curr.rate, curr.sym)}
                    </p>
                  </div>

                  {/* Supplier links */}
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                      South African Suppliers — get formal quotations
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SA_SUPPLIERS.map((s) => (
                        <a
                          key={s.name}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={s.desc}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:border-teal-400 dark:hover:border-teal-600 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
                        >
                          {s.name}
                          <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <div className="mt-3 px-3 py-2 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
                      <strong>Indicative prices only</strong> — ZAR source, Q2 2025 reference, ±25% typical market variation.
                      {currency !== "ZAR" && ` Converted at approx 1 ZAR = ${CURRENCIES[currency].rate.toFixed(4)} ${currency}.`}
                      {" "}Pump prices are supply-only estimates for standard centrifugal pumps. Excludes delivery, civil structures, and site-specific costs. Always obtain formal supplier quotations before committing to a budget.
                    </p>
                  </div>
                </Card>
              )}
              {/* ── Full summary (expandable) ─────────────────────────── */}
              <div>
                <button
                  onClick={() => setShowSummary((v) => !v)}
                  className="w-full flex items-center justify-between px-5 py-3 bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors text-sm font-semibold text-gray-700 dark:text-gray-300 print:hidden"
                >
                  <span>{showSummary ? "▼" : "▶"} Printable design summary</span>
                  <span className="text-xs font-normal text-gray-400 dark:text-gray-500">All results in one view</span>
                </button>

                {showSummary && (
                  <div className="mt-3 space-y-4 summary-print-area">
                    {/* Summary header */}
                    <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-6 text-white flex items-start justify-between gap-4">
                      <div>
                        <p className="text-teal-100 text-xs font-bold uppercase tracking-widest mb-1">Full Design Summary</p>
                        <h2 className="text-2xl font-black">{projectName || "Pipe System Design"}</h2>
                        <p className="text-teal-100 text-sm mt-1">
                          {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                      <button
                        onClick={downloadPDF}
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Download PDF
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Operating conditions */}
                      <Card>
                        <SectionTitle title="Operating Conditions" />
                        <Row label="Fluid" value={fluid.label} />
                        <Row label="Density ρ" value={sig(fluid.rho, 5)} unit="kg/m³" />
                        <Row label="Dynamic viscosity μ" value={fluid.mu.toExponential(3)} unit="Pa·s" />
                        <Row label="Vapour pressure Pv" value={sig(fluid.Pv, 4)} unit="Pa" />
                        <Row label="Flow rate Q" value={`${flowVal} ${flowUnit}`} />
                        <Row label="Flow rate Q" value={sig(pipe.Q * 1e3, 4)} unit="L/s" />
                      </Card>

                      {/* Pipe run */}
                      <Card>
                        <SectionTitle title="Pipe Run" />
                        <Row label="Material" value={PIPE_MATS[matIdx].label} />
                        <Row label="Internal diameter" value={effectiveDiamMm} unit="mm" />
                        {useDn && <Row label="Nominal size" value={`DN${DN_SIZES[dnIdx].dn}`} />}
                        <Row label="Total length" value={fmt(parseFloat(lengthM), 1)} unit="m" />
                        <Row label="Elevation change" value={fmt(parseFloat(elevM) || 0, 1)} unit="m" />
                        <Row label="Roughness ε" value={(isFinite(PIPE_MATS[matIdx].eps) ? PIPE_MATS[matIdx].eps : parseFloat(customEps) || 0).toString()} unit="mm" />
                      </Card>

                      {/* Flow analysis */}
                      <Card>
                        <SectionTitle title="Flow Analysis" />
                        <Row label="Velocity" value={fmt(pipe.V, 2)} unit="m/s" />
                        <Row label="Reynolds number Re" value={sig(pipe.Re, 4)} />
                        <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Flow regime</span>
                          <span className={`text-sm font-bold ${pipe.rColor}`}>{pipe.regime}</span>
                        </div>
                        <Row label="Darcy friction factor f" value={fmt(pipe.f, 5)} />
                        <Row label="Relative roughness ε/D" value={pipe.eD.toExponential(3)} />
                        <Row label="Hydraulic gradient" value={fmt(pipe.gradPa_m, 1)} unit="Pa/m" />
                        <Row label="Friction loss hf" value={fmt(pipe.hf, 2)} unit="m" bold />
                        <Row label="Minor losses hm" value={fmt(pipe.hm, 2)} unit={`m (ΣK=${fmt(pipe.sumK, 2)})`} bold />
                        <Row label="Elevation Δz" value={fmt(pipe.dz, 2)} unit="m" bold />
                        <Row label="Friction ΔP" value={fmt(pipe.dPfric_kPa, 2)} unit="kPa" />
                        <Row label="System head" value={fmt(pipe.Hsys, 2)} unit="m" bold />
                        <Row label="Total ΔP" value={fmt(pipe.dPtotal_kPa, 2)} unit={`kPa (${fmt(pipe.dPtotal_kPa / 100, 3)} bar)`} bold />
                      </Card>

                      {/* Pump requirements */}
                      <Card>
                        <SectionTitle title="Pump Requirements" accent="indigo" />
                        {pump ? (
                          <>
                            <Row label="System head (pipe run)" value={fmt(pipe.Hsys, 2)} unit="m" />
                            <Row label="Additional static head" value={fmt(pump.addH, 2)} unit="m" />
                            <Row label="Total duty head H" value={fmt(pump.Htotal, 2)} unit="m" bold />
                            <Row label="Flow rate Q" value={`${flowVal} ${flowUnit}`} />
                            <Row label="Pump efficiency η" value={fmt(parseFloat(etaPct), 0)} unit="%" />
                            <Row label="Min. shaft power" value={fmt(pump.powerKW, 2)} unit="kW" bold />
                            <Row label="Total pressure rise" value={fmt(pump.Htotal * pipe.rho * G / 1000, 2)} unit="kPa" />
                            {pump.annualKwh !== null && (
                              <>
                                <Row label="Run hours / year" value={runHours} unit="h/yr" />
                                <Row label="Annual energy" value={sig(pump.annualKwh, 4)} unit="kWh/yr" bold />
                                {pump.annualCost !== null && (
                                  <Row label="Annual energy cost" value={`$${sig(pump.annualCost, 4)}`} unit="/yr" bold />
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-400 dark:text-gray-500">Enter pump efficiency to see requirements</p>
                        )}

                        {/* NPSH in summary */}
                        {checkNpsh && npsh && (
                          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <SectionTitle title="NPSH" accent="green" />
                            <Row label="NPSHa (available)" value={fmt(npsh.NPSHa, 2)} unit="m" bold />
                            {isFinite(npsh.NPSHr) && npsh.margin !== null && (
                              <>
                                <Row label="NPSHr (required)" value={fmt(npsh.NPSHr, 2)} unit="m" />
                                <Row label="Safety margin" value={fmt(npsh.margin, 2)} unit="m" bold />
                                <Row label="Status" value={npsh.status ?? ""} />
                              </>
                            )}
                          </div>
                        )}
                      </Card>
                    </div>

                    {/* Fittings list */}
                    {activeFittings > 0 && (
                      <Card>
                        <SectionTitle
                          title="Fittings &amp; Valves"
                          subtitle={`ΣK = ${fmt(pipe.sumK, 2)} · Minor loss hm = ${fmt(pipe.hm, 2)} m`}
                          badge={`${activeFittings} type${activeFittings !== 1 ? "s" : ""}`}
                        />
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {FITTINGS.map((f, i) => counts[i] > 0 ? (
                            <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
                              <span className="text-sm text-gray-700 dark:text-gray-300">{f.label}</span>
                              <span className="text-sm font-bold text-gray-900 dark:text-white ml-2">× {counts[i]}</span>
                            </div>
                          ) : null)}
                        </div>
                      </Card>
                    )}

                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center pb-2">
                      Results based on Darcy-Weisbach, Colebrook-White, and K-factor minor losses. Verify with detailed design software before procurement.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          <References refs={REFS_PIPE_SYSTEM_DESIGN} />
        </div>
      </div>

      {/* ══════════════ RFQ MODAL ═══════════════════════════════════════════ */}
      {showRfq && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowRfq(false); }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Request Supplier Quotations</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Generates a formal RFQ PDF — attach it to an email and send to your preferred suppliers.
                </p>
              </div>
              <button onClick={() => setShowRfq(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-xl font-light transition-colors">
                ×
              </button>
            </div>

            {/* Form */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* Contact */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                  Your contact details <span className="font-normal normal-case">(optional — appears in the PDF)</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Name</p>
                    <input type="text" value={rfqName} onChange={(e) => setRfqName(e.target.value)}
                      placeholder="Your name" className={SEL} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Company</p>
                    <input type="text" value={rfqCompany} onChange={(e) => setRfqCompany(e.target.value)}
                      placeholder="Company name" className={SEL} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email</p>
                    <input type="email" value={rfqEmail} onChange={(e) => setRfqEmail(e.target.value)}
                      placeholder="email@company.co.za" className={SEL} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Phone</p>
                    <input type="tel" value={rfqPhone} onChange={(e) => setRfqPhone(e.target.value)}
                      placeholder="+27 …" className={SEL} />
                  </div>
                </div>
              </div>

              {/* Delivery */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Delivery requirements</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Delivery location / site</p>
                    <input type="text" value={rfqLocation} onChange={(e) => setRfqLocation(e.target.value)}
                      placeholder="e.g. Johannesburg, Gauteng" className={SEL} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Required by date</p>
                    <input type="text" value={rfqDate} onChange={(e) => setRfqDate(e.target.value)}
                      placeholder="e.g. 30 July 2025" className={SEL} />
                  </div>
                </div>
              </div>

              {/* Prices option */}
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={rfqShowPrices} onChange={(e) => setRfqShowPrices(e.target.checked)}
                    className="w-4 h-4 rounded accent-teal-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      Include our indicative prices as reference
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                      Shows your budget estimate ({TIERS[tier].label} tier) in the RFQ. Useful for anchoring negotiations.
                      Leave unchecked to let suppliers quote independently.
                    </p>
                  </div>
                </label>
              </div>

              {/* BOM preview */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                  Items in this RFQ ({bom ? bom.fittingLines.length + (bom.L > 0 ? 1 : 0) + (bom.pumpR ? 1 : 0) + customItems.filter(x => x.desc).length : 0} line items)
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {bom && bom.L > 0 && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 px-2 py-1 bg-gray-50 dark:bg-gray-700/40 rounded">
                      <span className="w-4 h-4 flex-shrink-0 rounded-full bg-teal-500 flex items-center justify-center text-white text-[9px] font-bold">1</span>
                      Pipe — {bom.matLabel} DN{bom.dn} × {fmt(bom.L, 1)} m
                    </div>
                  )}
                  {bom && bom.fittingLines.map((line, i) => (
                    <div key={line.label} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 px-2 py-1 bg-gray-50 dark:bg-gray-700/40 rounded">
                      <span className="w-4 h-4 flex-shrink-0 rounded-full bg-teal-500 flex items-center justify-center text-white text-[9px] font-bold">{i + 2}</span>
                      {line.label} × {line.qty}
                    </div>
                  ))}
                  {bom && bom.pumpR && pump && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 px-2 py-1 bg-gray-50 dark:bg-gray-700/40 rounded">
                      <span className="w-4 h-4 flex-shrink-0 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[9px] font-bold">P</span>
                      Pump ~{fmt(pump.powerKW, 1)} kW
                    </div>
                  )}
                  {customItems.filter(x => x.desc).map((item, i) => (
                    <div key={item.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 px-2 py-1 bg-gray-50 dark:bg-gray-700/40 rounded">
                      <span className="w-4 h-4 flex-shrink-0 rounded-full bg-gray-400 flex items-center justify-center text-white text-[9px] font-bold">{i + 1}</span>
                      {item.desc} × {item.qty}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-b-2xl flex-shrink-0 flex items-center gap-3">
              <button onClick={() => setShowRfq(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => { generateRfqPDF(); setShowRfq(false); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-600/20 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Generate RFQ PDF
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ══════════════ MY DESIGNS MODAL ════════════════════════════════════ */}
      {showSavedPanel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSavedPanel(false); }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">My Designs</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {savedDesigns.length} saved · stored in this browser
                </p>
              </div>
              <button
                onClick={() => setShowSavedPanel(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-xl font-light transition-colors"
              >
                ×
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {savedDesigns.length === 0 ? (
                <div className="text-center py-14">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8m-9 4v4m4-4v4" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No saved designs yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Close this panel and click <strong>Save</strong> to save your current design.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedDesigns.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-teal-300 dark:hover:border-teal-700 transition-colors"
                    >
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{d.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{d.summary}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
                          {new Date(d.savedAt).toLocaleString("en-ZA", {
                            day: "numeric", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {/* Actions */}
                      <div className="flex flex-col gap-1.5 flex-shrink-0 pt-0.5">
                        <button
                          onClick={() => loadDesign(d.id)}
                          className="px-3 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => deleteDesign(d.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-b-2xl flex-shrink-0">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Designs are saved to this browser only. Clearing browser data will erase them.
                </p>
                {savedDesigns.length > 0 && (
                  <button
                    onClick={() => { setSavedDesigns([]); localStorage.removeItem(STORAGE_KEY); }}
                    className="text-xs font-semibold text-red-400 hover:text-red-600 dark:hover:text-red-300 whitespace-nowrap transition-colors flex-shrink-0"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
