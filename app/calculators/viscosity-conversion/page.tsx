"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_VISCOSITY_CONVERSION } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { ClearButton } from "@/components/ClearButton";

// ── Dynamic viscosity units — 1 unit = X Pa·s ─────────────────────────────────
const DYN_UNITS = [
  { key: "Pa·s",       label: "Pa·s",       factor: 1,         note: "SI base unit" },
  { key: "kg/(m·s)",   label: "kg/(m·s)",   factor: 1,         note: "≡ Pa·s" },
  { key: "mPa·s",      label: "mPa·s",      factor: 1e-3,      note: "≡ cP" },
  { key: "cP",         label: "cP",         factor: 1e-3,      note: "≡ mPa·s" },
  { key: "μPa·s",      label: "μPa·s",      factor: 1e-6,      note: "common for gases" },
  { key: "P",          label: "P (poise)",  factor: 0.1,       note: "CGS" },
  { key: "lb/(ft·s)",  label: "lb/(ft·s)",  factor: 1.488164,  note: "lbm-based, Imperial" },
  { key: "lbf·s/ft²",  label: "lbf·s/ft²",  factor: 47.8803,   note: "slug/(ft·s), Imperial" },
  { key: "kgf·s/m²",  label: "kgf·s/m²",  factor: 9.80665,   note: "Technical metric" },
] as const;

type DynUnit = typeof DYN_UNITS[number]["key"];

// ── Kinematic viscosity units — 1 unit = X m²/s ───────────────────────────────
const KIN_UNITS = [
  { key: "m²/s",  label: "m²/s",        factor: 1,                 note: "SI base unit" },
  { key: "cSt",   label: "cSt",          factor: 1e-6,              note: "≡ mm²/s" },
  { key: "mm²/s", label: "mm²/s",        factor: 1e-6,              note: "≡ cSt" },
  { key: "St",    label: "St (stoke)",   factor: 1e-4,              note: "CGS" },
  { key: "cm²/s", label: "cm²/s",        factor: 1e-4,              note: "≡ St" },
  { key: "ft²/s", label: "ft²/s",        factor: 0.092903,          note: "Imperial" },
  { key: "ft²/h", label: "ft²/h",        factor: 0.092903 / 3600,   note: "Imperial" },
  { key: "in²/s", label: "in²/s",        factor: 6.4516e-4,         note: "Imperial" },
] as const;

type KinUnit = typeof KIN_UNITS[number]["key"];

// ── Density units ─────────────────────────────────────────────────────────────
type DensUnit = "kg/m³" | "g/cm³" | "kg/L" | "lb/ft³" | "slug/ft³";
const toDensSI = (v: number, u: DensUnit): number => {
  if (u === "g/cm³" || u === "kg/L") return v * 1000;
  if (u === "lb/ft³")   return v * 16.01846;
  if (u === "slug/ft³") return v * 515.379;
  return v;
};

// ── Fluid presets ─────────────────────────────────────────────────────────────
const PRESETS = [
  { label: "Water 20°C",          mu: 0.001002,    rho: 998   },
  { label: "Water 40°C",          mu: 0.000653,    rho: 992   },
  { label: "Water 60°C",          mu: 0.000467,    rho: 983   },
  { label: "Water 80°C",          mu: 0.000355,    rho: 972   },
  { label: "Air 20°C",            mu: 0.00001825,  rho: 1.204 },
  { label: "Air 60°C",            mu: 0.00002008,  rho: 1.060 },
  { label: "Ethanol 20°C",        mu: 0.00120,     rho: 789   },
  { label: "Glycerin 25°C",       mu: 0.934,       rho: 1260  },
  { label: "Engine oil SAE30 (20°C)", mu: 0.29,    rho: 891   },
  { label: "Mercury 20°C",        mu: 0.00156,     rho: 13600 },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtVal(n: number): string {
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 0.001 && abs < 10000) return parseFloat(n.toPrecision(6)).toString();
  return n.toExponential(4);
}

function Btn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-sm rounded ${
        active
          ? "bg-blue-500 text-white"
          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
      }`}
    >
      {label}
    </button>
  );
}

// ── Conversion tile ───────────────────────────────────────────────────────────
function ConvTile({
  label, value, note, highlight,
}: {
  label: string; value: string; note: string; highlight?: boolean;
}) {
  return (
    <div className={`relative rounded-lg border px-3 py-2.5 ${
      highlight
        ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/25"
        : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
    }`}>
      {highlight && (
        <span className="absolute top-1.5 right-2 text-[9px] font-bold uppercase tracking-wide text-blue-500 dark:text-blue-400">
          input
        </span>
      )}
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`font-mono text-sm font-bold leading-tight ${
        highlight ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-white"
      }`}>
        {value}
      </p>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{note}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ViscosityConversionCalculator() {
  const [inputMode, setInputMode] = useState<"dynamic" | "kinematic">("dynamic");

  const [dynValue, setDynValue] = useState("1.002");
  const [dynUnit,  setDynUnit]  = useState<DynUnit>("cP");

  const [kinValue, setKinValue] = useState("");
  const [kinUnit,  setKinUnit]  = useState<KinUnit>("cSt");

  const [density,     setDensity]     = useState("998");
  const [densityUnit, setDensityUnit] = useState<DensUnit>("kg/m³");

  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [dynSI,   setDynSI]   = useState<number | null>(null);
  const [kinSI,   setKinSI]   = useState<number | null>(null);
  const [rhoSI,   setRhoSI]   = useState<number | null>(null);

  const applyPreset = (p: { mu: number; rho: number }) => {
    const nu = p.mu / p.rho;
    setInputMode("dynamic");
    setDynValue(p.mu.toString());
    setDynUnit("Pa·s");
    setKinValue((nu * 1e6).toPrecision(5));
    setKinUnit("cSt");
    setDensity(p.rho.toString());
    setDensityUnit("kg/m³");
    setDynSI(null); setKinSI(null); setRhoSI(null); setErrors({});
  };

  const handleClear = () => {
    setDynValue(""); setKinValue(""); setDensity("");
    setDynSI(null); setKinSI(null); setRhoSI(null); setErrors({});
  };

  const handleCalculate = () => {
    const errs: Record<string, string> = {};
    let muSI: number | null = null;
    let nuSI: number | null = null;
    let rho:  number | null = null;

    if (inputMode === "dynamic") {
      const v = parseFloat(dynValue);
      if (isNaN(v) || v <= 0) errs.dyn = "Must be a positive number";
      else {
        const unit = DYN_UNITS.find(u => u.key === dynUnit)!;
        muSI = v * unit.factor;
      }
    } else {
      const v = parseFloat(kinValue);
      if (isNaN(v) || v <= 0) errs.kin = "Must be a positive number";
      else {
        const unit = KIN_UNITS.find(u => u.key === kinUnit)!;
        nuSI = v * unit.factor;
      }
    }

    const densVal = parseFloat(density);
    if (density !== "" && (isNaN(densVal) || densVal <= 0)) {
      errs.density = "Must be a positive number";
    } else if (!isNaN(densVal) && densVal > 0) {
      rho = toDensSI(densVal, densityUnit);
    }

    setErrors(errs);
    if (Object.keys(errs).length) { setDynSI(null); setKinSI(null); setRhoSI(null); return; }

    // Cross-convert if density available
    if (muSI !== null && rho !== null) nuSI = muSI / rho;
    if (nuSI !== null && rho !== null) muSI = nuSI * rho;

    setDynSI(muSI);
    setKinSI(nuSI);
    setRhoSI(rho);
  };

  const hasDyn = dynSI !== null;
  const hasKin = kinSI !== null;
  const hasRho = rhoSI !== null;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Viscosity Conversion Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Convert between{" "}
          <strong className="text-gray-800 dark:text-gray-200">dynamic viscosity μ</strong> and{" "}
          <strong className="text-gray-800 dark:text-gray-200">kinematic viscosity ν</strong>{" "}
          across all common unit systems. Provide density to cross-convert between the two.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Properties &amp; Statics
        </span>
      </div>

      {/* Fluid presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Common fluids — click to auto-fill
        </h2>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          <Btn label="I have Dynamic μ"   active={inputMode === "dynamic"}   onClick={() => setInputMode("dynamic")}   />
          <Btn label="I have Kinematic ν" active={inputMode === "kinematic"} onClick={() => setInputMode("kinematic")} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Dynamic viscosity */}
          {inputMode === "dynamic" && (
            <div>
              <InputField
                label="Dynamic viscosity"
                symbol="μ"
                unit={dynUnit}
                value={dynValue}
                onChange={setDynValue}
                placeholder="1.002"
                error={errors.dyn}
              />
              <div className="flex flex-wrap gap-2 -mt-2">
                {DYN_UNITS.map(u => (
                  <Btn key={u.key} label={u.label} active={dynUnit === u.key} onClick={() => setDynUnit(u.key)} />
                ))}
              </div>
            </div>
          )}

          {/* Kinematic viscosity */}
          {inputMode === "kinematic" && (
            <div>
              <InputField
                label="Kinematic viscosity"
                symbol="ν"
                unit={kinUnit}
                value={kinValue}
                onChange={setKinValue}
                placeholder="1.004"
                error={errors.kin}
              />
              <div className="flex flex-wrap gap-2 -mt-2">
                {KIN_UNITS.map(u => (
                  <Btn key={u.key} label={u.label} active={kinUnit === u.key} onClick={() => setKinUnit(u.key)} />
                ))}
              </div>
            </div>
          )}

          {/* Density — optional, enables cross-conversion */}
          <div>
            <InputField
              label="Fluid density (optional)"
              symbol="ρ"
              unit={densityUnit}
              value={density}
              onChange={setDensity}
              placeholder="998"
              error={errors.density}
            />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["kg/m³", "g/cm³", "kg/L", "lb/ft³", "slug/ft³"] as DensUnit[]).map(u => (
                <Btn key={u} label={u} active={densityUnit === u} onClick={() => setDensityUnit(u)} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Required to convert between μ and ν via ν = μ / ρ.
            </p>
          </div>
        </div>

        {errors.general && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.general}</p>
        )}
        <button
          onClick={handleCalculate}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors"
        >
          Convert
        </button>
        <ClearButton onClear={handleClear} />
      </Card>

      {/* Results */}
      {(hasDyn || hasKin) && (
        <ResultsCard>
          <div className="space-y-6">

            {/* Cross-conversion summary */}
            {hasDyn && hasKin && hasRho && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 px-4 pt-3 pb-2">
                  Cross-conversion — ν = μ / ρ
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { sym: "ν", val: `${fmtVal(kinSI!)} m²/s`,   color: "text-blue-600 dark:text-blue-400" },
                    { sym: "μ", val: `${fmtVal(dynSI!)} Pa·s`,    color: "text-gray-800 dark:text-gray-200" },
                    { sym: "ρ", val: `${fmtVal(rhoSI!)} kg/m³`,   color: "text-gray-800 dark:text-gray-200" },
                  ].map(({ sym, val, color }) => (
                    <div key={sym} className="px-4 py-3 text-center">
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{sym}</p>
                      <p className={`font-mono text-sm font-semibold ${color}`}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic viscosity grid */}
            {hasDyn && (
              <div>
                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Dynamic viscosity μ</p>
                  <span className="font-mono text-xs text-gray-500 dark:text-gray-400">= {fmtVal(dynSI!)} Pa·s (SI)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {DYN_UNITS.map(u => (
                    <ConvTile
                      key={u.key}
                      label={u.label}
                      value={fmtVal(dynSI! / u.factor)}
                      note={u.note}
                      highlight={inputMode === "dynamic" && u.key === dynUnit}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Kinematic viscosity grid */}
            {hasKin && (
              <div>
                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Kinematic viscosity ν</p>
                  <span className="font-mono text-xs text-gray-500 dark:text-gray-400">= {fmtVal(kinSI!)} m²/s (SI)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {KIN_UNITS.map(u => (
                    <ConvTile
                      key={u.key}
                      label={u.label}
                      value={fmtVal(kinSI! / u.factor)}
                      note={u.note}
                      highlight={inputMode === "kinematic" && u.key === kinUnit}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Density-only note */}
            {((hasDyn && !hasKin) || (hasKin && !hasDyn)) && (
              <p className="text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded px-3 py-2">
                Enter fluid density to also convert between μ and ν.
              </p>
            )}

          </div>
        </ResultsCard>
      )}

      {/* Reference table */}
      <Card>
        <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
          Reference — Common Fluid Viscosities
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600">
                <th className="text-left py-2 pr-4 font-semibold text-gray-900 dark:text-white">Fluid</th>
                <th className="text-left py-2 pr-4 font-semibold text-gray-900 dark:text-white">ρ (kg/m³)</th>
                <th className="text-left py-2 pr-4 font-semibold text-gray-900 dark:text-white">μ (mPa·s)</th>
                <th className="text-left py-2 font-semibold text-gray-900 dark:text-white">ν (cSt)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
              {PRESETS.map(p => (
                <tr key={p.label}>
                  <td className="py-1.5 pr-4">{p.label}</td>
                  <td className="py-1.5 pr-4 font-mono">{p.rho}</td>
                  <td className="py-1.5 pr-4 font-mono">{fmtVal(p.mu * 1000)}</td>
                  <td className="py-1.5 font-mono">{fmtVal((p.mu / p.rho) * 1e6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Relationship between μ and ν:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>ν = μ / ρ</div>
              <div>μ = ν × ρ</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Kinematic viscosity is dynamic viscosity normalised by density.
              It represents the ratio of viscous force to inertial force per unit volume.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Dynamic viscosity μ unit equivalences:</p>
            <table className="w-full text-sm border-collapse">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ["1 Pa·s", "= 1 N·s/m² = 1 kg/(m·s)"],
                  ["1 cP",   "= 1 mPa·s = 0.001 Pa·s"],
                  ["1 P",    "= 100 cP = 0.1 Pa·s  (CGS)"],
                  ["1 lb/(ft·s)", "= 1.4882 Pa·s  (Imperial)"],
                ].map(([lhs, rhs]) => (
                  <tr key={lhs}>
                    <td className="py-1.5 pr-4 font-mono w-36">{lhs}</td>
                    <td className="py-1.5 text-gray-500 dark:text-gray-400">{rhs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Kinematic viscosity ν unit equivalences:</p>
            <table className="w-full text-sm border-collapse">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ["1 m²/s",  "= 10⁶ cSt = 10⁴ St"],
                  ["1 cSt",   "= 1 mm²/s = 10⁻⁶ m²/s"],
                  ["1 St",    "= 1 cm²/s = 100 cSt  (CGS)"],
                  ["1 ft²/s", "= 0.092903 m²/s  (Imperial)"],
                ].map(([lhs, rhs]) => (
                  <tr key={lhs}>
                    <td className="py-1.5 pr-4 font-mono w-36">{lhs}</td>
                    <td className="py-1.5 text-gray-500 dark:text-gray-400">{rhs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">When to use each:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>μ (dynamic)</strong> — appears in force/momentum equations: τ = μ (du/dy), pipe pressure drop, drag</li>
              <li><strong>ν (kinematic)</strong> — appears in dimensionless numbers: Re = VL/ν, and diffusion-type equations</li>
              <li>For gases, μ increases with temperature; for liquids, μ decreases with temperature</li>
              <li>ν for gases is larger than for liquids despite lower μ, because gas density is much lower</li>
            </ul>
          </div>

        </div>
      </Card>

      <References refs={REFS_VISCOSITY_CONVERSION} />
    </div>
  );
}
