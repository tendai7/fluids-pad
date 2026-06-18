"use client";

import React, { useState } from "react";
import Link from "next/link";
import { References } from "@/components/References";
import { REFS_FLUID_PROPERTIES } from "@/lib/references";

// ── Interpolation ────────────────────────────────────────────────────────────
function lerp(T: number, Ts: number[], Vs: number[]): number {
  if (T <= Ts[0]) return Vs[0];
  if (T >= Ts[Ts.length - 1]) return Vs[Vs.length - 1];
  for (let i = 0; i < Ts.length - 1; i++) {
    if (T <= Ts[i + 1]) {
      const f = (T - Ts[i]) / (Ts[i + 1] - Ts[i]);
      return Vs[i] + f * (Vs[i + 1] - Vs[i]);
    }
  }
  return Vs[Vs.length - 1];
}

function fmt(n: number, sig = 4) { return parseFloat(n.toPrecision(sig)).toString(); }
function fmtE(n: number)         { return n.toExponential(3); }

// ── Fluid data tables ────────────────────────────────────────────────────────
// Water (0–100 °C, 1 atm) — NIST / Incropera Table A.6
const W_T   = [0,     10,    20,    30,    40,    50,    60,    70,    80,    90,    100  ];
const W_RHO = [999.8, 999.7, 998.2, 995.6, 992.2, 988.1, 983.2, 977.7, 971.8, 965.3, 958.4];
const W_MU  = [1.792, 1.307, 1.002, 0.798, 0.653, 0.547, 0.467, 0.404, 0.355, 0.315, 0.282]; // mPa·s
const W_K   = [0.561, 0.580, 0.598, 0.615, 0.631, 0.644, 0.654, 0.663, 0.670, 0.675, 0.679];
const W_CP  = [4218,  4192,  4182,  4179,  4179,  4181,  4184,  4190,  4196,  4205,  4216 ];
const W_PR  = [13.47, 9.46,  7.01,  5.42,  4.32,  3.55,  2.99,  2.55,  2.22,  1.96,  1.75 ];
const W_PV  = [0.611, 1.228, 2.338, 4.243, 7.375, 12.35, 19.94, 31.18, 47.39, 70.10, 101.3]; // kPa abs
const W_SIG = [75.7,  74.2,  72.8,  71.2,  69.6,  67.9,  66.2,  64.4,  62.6,  60.8,  58.9 ]; // mN/m

// Air (−50–300 °C, 1 atm) — Incropera Table A.4
const A_T   = [-50,    0,      20,     40,     60,     80,     100,    150,    200,    300   ];
const A_RHO = [1.582,  1.293,  1.204,  1.127,  1.060,  0.999,  0.946,  0.834,  0.746,  0.616 ]; // at 101.325 kPa
const A_MU  = [1.462,  1.716,  1.813,  1.906,  1.997,  2.087,  2.174,  2.377,  2.570,  2.934 ]; // ×10⁻⁵ Pa·s
const A_K   = [0.02035,0.02416,0.02551,0.02756,0.02856,0.02991,0.03095,0.03374,0.03653,0.04153];
const A_CP  = [1005,   1005,   1005,   1005,   1005,   1009,   1009,   1017,   1025,   1044  ];
const A_PR  = [0.725,  0.715,  0.713,  0.711,  0.709,  0.708,  0.703,  0.699,  0.694,  0.700 ];
const R_AIR = 287.05; // J/(kg·K)

// Ethylene Glycol 50 % w/w (−20–80 °C) — ASHRAE Fundamentals
const EG_T   = [-20,   0,    20,   40,   60,   80  ];
const EG_RHO = [1078,  1064, 1049, 1034, 1018, 1001];
const EG_MU  = [10.8,  4.48, 2.23, 1.26, 0.800,0.545]; // mPa·s
const EG_K   = [0.390, 0.399,0.407,0.414,0.420,0.424];
const EG_CP  = [3350,  3410, 3480, 3550, 3620, 3690];
const EG_PR  = [92.7,  38.3, 19.1, 10.8, 6.90, 4.75];

// Engine Oil — SAE 10W-40 (0–160 °C) — Incropera Table A.5 (unused engine oil)
const OIL_T   = [0,    20,   40,   60,   80,   100,  120,  140,  160 ];
const OIL_RHO = [899,  888,  876,  864,  852,  840,  829,  817,  805 ];
const OIL_MU  = [3850, 900,  240,  83.4, 37.5, 17.2, 9.0,  5.4,  3.2 ]; // mPa·s
const OIL_K   = [0.147,0.145,0.144,0.140,0.138,0.137,0.135,0.133,0.132];
const OIL_CP  = [1796, 1880, 1964, 2047, 2131, 2219, 2307, 2395, 2483];
const OIL_PR  = OIL_T.map((_, i) => (OIL_MU[i] * 1e-3 * OIL_CP[i]) / OIL_K[i]);

// Seawater 35 g/kg salinity (0–40 °C) — Sharqawy et al. (2010)
const SW_T   = [0,    10,   20,   30,   40  ];
const SW_RHO = [1028, 1026, 1023, 1019, 1015];
const SW_MU  = [1.88, 1.35, 1.07, 0.86, 0.71]; // mPa·s
const SW_K   = [0.565,0.578,0.590,0.601,0.611];
const SW_CP  = [3985, 3995, 3993, 3989, 3981];
const SW_PR  = SW_T.map((_, i) => (SW_MU[i] * 1e-3 * SW_CP[i]) / SW_K[i]);

// ── Fluid config ─────────────────────────────────────────────────────────────
type FluidId = "water" | "air" | "eg50" | "oil" | "seawater";

interface FluidCfg {
  label: string;
  tMin: number; tMax: number;
  T: number[]; rho: number[]; mu: number[];
  k: number[]; Cp: number[]; Pr: number[];
  note: string;
}

const FLUIDS: Record<FluidId, FluidCfg> = {
  water:    { label:"Water",                  tMin:0,   tMax:100, T:W_T,   rho:W_RHO, mu:W_MU,   k:W_K,   Cp:W_CP,  Pr:W_PR,  note:"Liquid water at 1 atm. Boils at 100 °C." },
  air:      { label:"Air (dry)",              tMin:-50, tMax:300, T:A_T,   rho:A_RHO, mu:A_MU,   k:A_K,   Cp:A_CP,  Pr:A_PR,  note:"Dry air. Enter absolute pressure to adjust density via ideal gas law." },
  eg50:     { label:"Ethylene Glycol 50 %",   tMin:-20, tMax:80,  T:EG_T,  rho:EG_RHO,mu:EG_MU,  k:EG_K,  Cp:EG_CP, Pr:EG_PR, note:"50 % w/w ethylene glycol in water. Common HVAC/automotive antifreeze." },
  oil:      { label:"Engine Oil (SAE 10W-40)",tMin:0,   tMax:160, T:OIL_T, rho:OIL_RHO,mu:OIL_MU,k:OIL_K, Cp:OIL_CP,Pr:OIL_PR,note:"Unused engine oil. μ varies over 3 orders of magnitude with temperature." },
  seawater: { label:"Seawater (35 g/kg)",     tMin:0,   tMax:40,  T:SW_T,  rho:SW_RHO,mu:SW_MU,  k:SW_K,  Cp:SW_CP, Pr:SW_PR, note:"Standard ocean salinity 35 g/kg. Properties after Sharqawy et al. (2010)." },
};

// ── Pressure units ────────────────────────────────────────────────────────────
type PresUnit = "Pa" | "kPa" | "bar" | "atm" | "psi";
const TO_PA: Record<PresUnit, number> = { Pa: 1, kPa: 1e3, bar: 1e5, atm: 101325, psi: 6894.76 };

// ── Result interface ──────────────────────────────────────────────────────────
interface Result {
  fluid: string;
  T_C: number;
  rho: number;   // kg/m³
  mu: number;    // Pa·s
  nu: number;    // m²/s
  k: number;     // W/m·K
  Cp: number;    // J/kg·K
  Pr: number;
  Pv?: number;   // kPa (water only)
  sig?: number;  // mN/m (water only)
  rhoAtP?: number; // kg/m³ at custom pressure (air only)
  P_kPa?: number;
  extrapolated: boolean;
}

// ── Property card ─────────────────────────────────────────────────────────────
function PropCard({ label, main, sub, accent = false }: {
  label: string; main: string; sub?: string; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${accent
      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700"}`}>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${accent ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-gray-100"}`}>
        {main}
      </p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">{sub}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FluidPropertiesPage() {
  const [fluid, setFluid]     = useState<FluidId>("water");
  const [tempStr, setTempStr] = useState("20");
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");
  const [presStr, setPresStr] = useState("101.325");
  const [presUnit, setPresUnit] = useState<PresUnit>("kPa");
  const [result, setResult]   = useState<Result | null>(null);
  const [error, setError]     = useState("");

  function calculate() {
    setError("");
    const tempRaw = parseFloat(tempStr);
    if (isNaN(tempRaw)) { setError("Enter a valid temperature."); return; }
    const T_C = tempUnit === "F" ? (tempRaw - 32) / 1.8 : tempRaw;

    const cfg = FLUIDS[fluid];
    const extrapolated = T_C < cfg.tMin || T_C > cfg.tMax;

    const rho_1atm = lerp(T_C, cfg.T, cfg.rho);
    const muRaw    = lerp(T_C, cfg.T, cfg.mu);
    const k        = lerp(T_C, cfg.T, cfg.k);
    const Cp       = lerp(T_C, cfg.T, cfg.Cp);
    const Pr       = lerp(T_C, cfg.T, cfg.Pr);

    // mu is stored in mPa·s for liquids, ×10⁻⁵ Pa·s for air
    const mu = fluid === "air" ? muRaw * 1e-5 : muRaw * 1e-3;

    let rho = rho_1atm;
    let rhoAtP: number | undefined;
    let P_kPa: number | undefined;
    if (fluid === "air") {
      const presRaw = parseFloat(presStr);
      if (!isNaN(presRaw) && presRaw > 0) {
        const P_Pa = presRaw * TO_PA[presUnit];
        P_kPa = P_Pa / 1000;
        rhoAtP = P_Pa / (R_AIR * (T_C + 273.15));
        rho = rhoAtP;
      }
    }

    const nu = mu / rho;

    const res: Result = { fluid: cfg.label, T_C, rho, mu, nu, k, Cp, Pr, extrapolated, rhoAtP, P_kPa };

    if (fluid === "water") {
      res.Pv  = lerp(T_C, W_T, W_PV);
      res.sig = lerp(T_C, W_T, W_SIG);
    }

    setResult(res);
  }

  const cfg = FLUIDS[fluid];
  const r = result;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Fluid Properties at Temperature
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Density, viscosity, conductivity, specific heat, and Prandtl number — interpolated from standard data tables.
        </p>
      </div>

      {/* Inputs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        {/* Fluid selector */}
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Fluid</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {(Object.keys(FLUIDS) as FluidId[]).map((id) => (
            <button key={id} onClick={() => { setFluid(id); setResult(null); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                fluid === id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}>
              {FLUIDS[id].label}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 italic">{cfg.note}</p>

        {/* Temperature input */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Temperature</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={tempStr}
                onChange={(e) => setTempStr(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && calculate()}
                placeholder={`${cfg.tMin}–${cfg.tMax} °C`}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-sm">
                {(["C", "F"] as const).map((u) => (
                  <button key={u} onClick={() => setTempUnit(u)}
                    className={`px-3 py-2 font-medium transition-colors ${tempUnit === u
                      ? "bg-blue-500 text-white"
                      : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"}`}>
                    °{u}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Valid range: {cfg.tMin}–{cfg.tMax} °C
            </p>
          </div>

          {/* Pressure input (air only) */}
          {fluid === "air" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Absolute pressure</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={presStr}
                  onChange={(e) => setPresStr(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={presUnit}
                  onChange={(e) => setPresUnit(e.target.value as PresUnit)}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {(Object.keys(TO_PA) as PresUnit[]).map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">μ, k, Cp, Pr are pressure-independent. Only ρ changes.</p>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}

        <button onClick={calculate}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
          Get Properties
        </button>
      </div>

      {/* Results */}
      {r && (
        <div className="space-y-4">
          {/* Extrapolation warning */}
          {r.extrapolated && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              ⚠ Temperature {fmt(r.T_C, 4)} °C is outside the tabulated range ({cfg.tMin}–{cfg.tMax} °C). Results are extrapolated and less reliable.
            </div>
          )}

          {/* Condition badge */}
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-semibold">
              {r.fluid}
            </div>
            <div className="text-gray-600 dark:text-gray-400 text-sm font-medium">
              at {fmt(r.T_C, 4)} °C ({fmt(r.T_C * 1.8 + 32, 4)} °F)
              {r.P_kPa && ` · ${fmt(r.P_kPa, 4)} kPa`}
            </div>
          </div>

          {/* Core properties grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <PropCard
              label="Density  ρ"
              main={`${fmt(r.rho, 5)} kg/m³`}
              sub={`${fmt(r.rho * 0.062428, 4)} lbm/ft³`}
              accent
            />
            <PropCard
              label="Dynamic viscosity  μ"
              main={`${fmt(r.mu * 1e3, 4)} mPa·s`}
              sub={`${fmt(r.mu * 1e3, 4)} cP  ·  ${fmtE(r.mu)} Pa·s`}
              accent
            />
            <PropCard
              label="Kinematic viscosity  ν"
              main={`${fmt(r.nu * 1e6, 4)} mm²/s`}
              sub={`${fmt(r.nu * 1e6, 4)} cSt  ·  ${fmtE(r.nu)} m²/s`}
              accent
            />
            <PropCard
              label="Thermal conductivity  k"
              main={`${fmt(r.k, 4)} W/m·K`}
              sub={`${fmt(r.k * 0.5779, 4)} BTU/hr·ft·°F`}
            />
            <PropCard
              label="Specific heat  Cₚ"
              main={`${fmt(r.Cp, 5)} J/kg·K`}
              sub={`${fmt(r.Cp / 4186.8, 4)} BTU/lbm·°F`}
            />
            <PropCard
              label="Prandtl number  Pr"
              main={fmt(r.Pr, 4)}
              sub="dimensionless"
            />
          </div>

          {/* Water extras */}
          {r.Pv !== undefined && r.sig !== undefined && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <PropCard
                label="Vapour pressure  Pᵥ"
                main={`${fmt(r.Pv, 4)} kPa`}
                sub={`${fmt(r.Pv * 0.145038, 4)} psi  ·  ${fmt(r.Pv / 100, 4)} bar`}
              />
              <PropCard
                label="Surface tension  σ"
                main={`${fmt(r.sig, 4)} mN/m`}
                sub={`${fmtE(r.sig * 1e-3)} N/m`}
              />
              <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-900/10 p-4 flex flex-col justify-center">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">Use in other calculators</p>
                <Link href="/calculators/npsh"
                  className="text-sm text-blue-700 dark:text-blue-300 hover:underline">
                  → NPSH &amp; Cavitation Risk
                </Link>
                <Link href="/calculators/reynolds"
                  className="text-sm text-blue-700 dark:text-blue-300 hover:underline mt-1">
                  → Reynolds Number
                </Link>
              </div>
            </div>
          )}

          {/* Air pressure correction note */}
          {fluid === "air" && r.rhoAtP !== undefined && r.P_kPa !== undefined && (
            <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl px-4 py-3 text-sm text-sky-800 dark:text-sky-300">
              Density at {fmt(r.P_kPa, 4)} kPa: <strong>{fmt(r.rhoAtP, 4)} kg/m³</strong> (ideal gas: ρ = P / R·T).
              μ, k, Cp, Pr are not significantly affected by pressure below ~10 MPa.
            </div>
          )}

          {/* Summary table for copy-paste */}
          <details className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <summary className="px-5 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
              All values — copy-friendly table
            </summary>
            <div className="overflow-x-auto px-5 pb-4">
              <table className="w-full text-sm text-left mt-2">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400">
                    <th className="py-2 pr-6">Property</th>
                    <th className="py-2 pr-6">Symbol</th>
                    <th className="py-2 pr-6">Value</th>
                    <th className="py-2">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-800 dark:text-gray-200 font-mono">
                  <tr><td className="py-1.5 pr-6 font-sans font-medium">Density</td><td className="pr-6">ρ</td><td className="pr-6">{fmt(r.rho, 5)}</td><td>kg/m³</td></tr>
                  <tr><td className="py-1.5 pr-6 font-sans font-medium">Dynamic viscosity</td><td className="pr-6">μ</td><td className="pr-6">{fmtE(r.mu)}</td><td>Pa·s</td></tr>
                  <tr><td className="py-1.5 pr-6 font-sans font-medium">Kinematic viscosity</td><td className="pr-6">ν</td><td className="pr-6">{fmtE(r.nu)}</td><td>m²/s</td></tr>
                  <tr><td className="py-1.5 pr-6 font-sans font-medium">Thermal conductivity</td><td className="pr-6">k</td><td className="pr-6">{fmt(r.k, 4)}</td><td>W/m·K</td></tr>
                  <tr><td className="py-1.5 pr-6 font-sans font-medium">Specific heat</td><td className="pr-6">Cₚ</td><td className="pr-6">{fmt(r.Cp, 5)}</td><td>J/kg·K</td></tr>
                  <tr><td className="py-1.5 pr-6 font-sans font-medium">Prandtl number</td><td className="pr-6">Pr</td><td className="pr-6">{fmt(r.Pr, 4)}</td><td>—</td></tr>
                  {r.Pv !== undefined && <tr><td className="py-1.5 pr-6 font-sans font-medium">Vapour pressure</td><td className="pr-6">Pᵥ</td><td className="pr-6">{fmt(r.Pv, 4)}</td><td>kPa</td></tr>}
                  {r.sig !== undefined && <tr><td className="py-1.5 pr-6 font-sans font-medium">Surface tension</td><td className="pr-6">σ</td><td className="pr-6">{fmtE(r.sig * 1e-3)}</td><td>N/m</td></tr>}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      <References refs={REFS_FLUID_PROPERTIES} />
    </div>
  );
}
