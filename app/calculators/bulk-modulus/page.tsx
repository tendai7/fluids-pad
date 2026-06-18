"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_BULK_MODULUS } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateBulkModulus,
  generateBulkModulusSteps,
  commonAssumptions,
  commonMistakes,
  type BulkModulusInput,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

// ── Pressure units — 1 unit = X Pa ───────────────────────────────────────────
const PRES_UNITS = [
  { key: "Pa",  factor: 1       },
  { key: "kPa", factor: 1e3     },
  { key: "MPa", factor: 1e6     },
  { key: "GPa", factor: 1e9     },
  { key: "bar", factor: 1e5     },
  { key: "psi", factor: 6894.76 },
] as const;
type PresUnit = typeof PRES_UNITS[number]["key"];

type DensUnit = "kg/m³" | "g/cm³";

// ── Fluid presets ─────────────────────────────────────────────────────────────
// K values: isothermal bulk modulus at ~20°C unless noted
const PRESETS = [
  { label: "Water 20°C",       K_GPa: 2.18,  rho: 998,   c: 1481 },
  { label: "Water 4°C",        K_GPa: 2.06,  rho: 1000,  c: 1435 },
  { label: "Seawater",         K_GPa: 2.34,  rho: 1025,  c: 1510 },
  { label: "Mercury 20°C",     K_GPa: 28.5,  rho: 13600, c: 1450 },
  { label: "Engine oil SAE30", K_GPa: 1.50,  rho: 880,   c: 1306 },
  { label: "Ethanol 20°C",     K_GPa: 0.90,  rho: 789,   c: 1068 },
  { label: "Glycerin 25°C",    K_GPa: 4.35,  rho: 1261,  c: 1857 },
  { label: "Air 20°C (isoth.)", K_GPa: 0.000101325, rho: 1.204, c: 294 },
  { label: "Air 20°C (isen.)", K_GPa: 0.000141855,  rho: 1.204, c: 343 },
] as const;

function fmtK(K: number): string {
  if (K >= 1e9)  return `${parseFloat((K / 1e9).toPrecision(5))} GPa`;
  if (K >= 1e6)  return `${parseFloat((K / 1e6).toPrecision(5))} MPa`;
  if (K >= 1e3)  return `${parseFloat((K / 1e3).toPrecision(5))} kPa`;
  return `${parseFloat(K.toPrecision(5))} Pa`;
}
function fmtV(n: number, sig = 5): string {
  return parseFloat(n.toPrecision(sig)).toString();
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

// ── K unit conversion table ───────────────────────────────────────────────────
const K_DISPLAY_UNITS = [
  { label: "Pa",    factor: 1       },
  { label: "kPa",   factor: 1e3     },
  { label: "MPa",   factor: 1e6     },
  { label: "GPa",   factor: 1e9     },
  { label: "bar",   factor: 1e5     },
  { label: "psi",   factor: 6894.76 },
  { label: "atm",   factor: 101325  },
];

// ── β unit conversion table ───────────────────────────────────────────────────
const BETA_DISPLAY_UNITS = [
  { label: "Pa⁻¹",   factor: 1       },
  { label: "kPa⁻¹",  factor: 1e-3    },
  { label: "MPa⁻¹",  factor: 1e-6    },
  { label: "GPa⁻¹",  factor: 1e-9    },
  { label: "bar⁻¹",  factor: 1e-5    },
  { label: "psi⁻¹",  factor: 1/6894.76 },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function BulkModulusCalculator() {
  const [mode, setMode] = useState<"fromDeltaP" | "direct">("direct");

  // Direct K mode
  const [kValue,   setKValue]   = useState("2.18");
  const [kUnit,    setKUnit]    = useState<PresUnit>("GPa");

  // ΔP / volume strain mode
  const [deltaP,      setDeltaP]      = useState("10");
  const [deltaPUnit,  setDeltaPUnit]  = useState<PresUnit>("MPa");
  const [volStrain,   setVolStrain]   = useState("0.4587");

  // Optional: density for speed of sound
  const [density,     setDensity]     = useState("998");
  const [densUnit,    setDensUnit]    = useState<DensUnit>("kg/m³");

  // Optional: ΔP for volume change (direct mode only)
  const [testDP,      setTestDP]      = useState("");
  const [testDPUnit,  setTestDPUnit]  = useState<PresUnit>("MPa");

  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [result,  setResult]  = useState<ReturnType<typeof calculateBulkModulus> | null>(null);
  const [steps,   setSteps]   = useState<ReturnType<typeof generateBulkModulusSteps> | null>(null);

  const applyPreset = (p: { K_GPa: number; rho: number }) => {
    setMode("direct");
    setKValue(p.K_GPa.toString());
    setKUnit("GPa");
    setDensity(p.rho.toString());
    setDensUnit("kg/m³");
    setResult(null); setSteps(null); setErrors({});
  };

  const handleClear = () => {
    setKValue(""); setDeltaP(""); setVolStrain(""); setDensity(""); setTestDP("");
    setResult(null); setSteps(null); setErrors({});
  };

  const handleCalculate = () => {
    const errs: Record<string, string> = {};

    let KSI: number | undefined;
    let dP:  number | undefined;
    let vs:  number | undefined;

    if (mode === "direct") {
      const v = parseFloat(kValue);
      if (isNaN(v) || v <= 0) errs.kValue = "Must be a positive number";
      else {
        const unit = PRES_UNITS.find(u => u.key === kUnit)!;
        KSI = v * unit.factor;
      }
      if (testDP !== "") {
        const tv = parseFloat(testDP);
        if (isNaN(tv) || tv < 0) errs.testDP = "Must be non-negative";
        else dP = tv * PRES_UNITS.find(u => u.key === testDPUnit)!.factor;
      }
    } else {
      const dv = parseFloat(deltaP);
      const sv = parseFloat(volStrain);
      if (isNaN(dv) || dv <= 0) errs.deltaP   = "Must be a positive number";
      else dP = dv * PRES_UNITS.find(u => u.key === deltaPUnit)!.factor;
      if (isNaN(sv) || sv <= 0) errs.volStrain = "Must be a positive number";
      else vs = sv / 100;
    }

    const rhoVal = parseFloat(density);
    const rhoSI  = density !== "" && !isNaN(rhoVal) && rhoVal > 0
      ? densUnit === "g/cm³" ? rhoVal * 1000 : rhoVal
      : undefined;
    if (density !== "" && rhoSI === undefined) errs.density = "Must be a positive number";

    setErrors(errs);
    if (Object.keys(errs).length) { setResult(null); setSteps(null); return; }

    try {
      const input: BulkModulusInput = { mode, K: KSI, deltaP: dP, volumeStrain: vs, density: rhoSI };
      const r = calculateBulkModulus(input);
      const s = generateBulkModulusSteps(input, r);
      setResult(r); setSteps(s);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Bulk Modulus &amp; Compressibility
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Calculate bulk modulus{" "}
          <strong className="text-gray-800 dark:text-gray-200">K = ΔP / |ΔV/V₀|</strong>,{" "}
          compressibility{" "}
          <strong className="text-gray-800 dark:text-gray-200">β = 1/K</strong>, and speed of
          sound{" "}
          <strong className="text-gray-800 dark:text-gray-200">c = √(K/ρ)</strong> in a fluid.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Properties &amp; Statics
        </span>
      </div>

      {/* Presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Common fluids — click to auto-fill K and ρ
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
          <Btn label="Enter K directly"         active={mode === "direct"}     onClick={() => setMode("direct")}     />
          <Btn label="From ΔP and volume strain" active={mode === "fromDeltaP"} onClick={() => setMode("fromDeltaP")} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Direct K */}
          {mode === "direct" && (
            <div>
              <div className="flex gap-2 mb-3" aria-hidden="true">
                <span className="px-3 py-1 text-sm opacity-0 select-none">x</span>
              </div>
              <InputField
                label="Bulk modulus"
                symbol="K"
                unit={kUnit}
                value={kValue}
                onChange={setKValue}
                placeholder="2.18"
                error={errors.kValue}
              />
              <div className="flex flex-wrap gap-2 -mt-2">
                {PRES_UNITS.map(u => (
                  <Btn key={u.key} label={u.key} active={kUnit === u.key} onClick={() => {
                    const si = parseFloat(kValue) * PRES_UNITS.find(x => x.key === kUnit)!.factor;
                    setKUnit(u.key);
                    if (!isNaN(si)) setKValue(fmtV(si / u.factor));
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* ΔP / volume strain */}
          {mode === "fromDeltaP" && (
            <>
              <div>
                <div className="flex gap-2 mb-3" aria-hidden="true">
                  <span className="px-3 py-1 text-sm opacity-0 select-none">x</span>
                </div>
                <InputField
                  label="Pressure increase"
                  symbol="ΔP"
                  unit={deltaPUnit}
                  value={deltaP}
                  onChange={setDeltaP}
                  placeholder="10"
                  error={errors.deltaP}
                />
                <div className="flex flex-wrap gap-2 -mt-2">
                  {PRES_UNITS.map(u => (
                    <Btn key={u.key} label={u.key} active={deltaPUnit === u.key} onClick={() => {
                      const si = parseFloat(deltaP) * PRES_UNITS.find(x => x.key === deltaPUnit)!.factor;
                      setDeltaPUnit(u.key);
                      if (!isNaN(si)) setDeltaP(fmtV(si / u.factor));
                    }} />
                  ))}
                </div>
              </div>
              <div>
                <div className="flex gap-2 mb-3" aria-hidden="true">
                  <span className="px-3 py-1 text-sm opacity-0 select-none">x</span>
                </div>
                <InputField
                  label="Volume strain (compression)"
                  symbol="|ΔV/V₀|"
                  unit="%"
                  value={volStrain}
                  onChange={setVolStrain}
                  placeholder="0.46"
                  error={errors.volStrain}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter as percentage, e.g. 0.46 means |ΔV/V₀| = 0.0046. Positive = compression (volume decreases).
                </p>
              </div>
            </>
          )}

          {/* Density — for speed of sound */}
          <div>
            <div className="flex gap-2 mb-3" aria-hidden="true">
              <span className="px-3 py-1 text-sm opacity-0 select-none">x</span>
            </div>
            <InputField
              label="Fluid density (optional)"
              symbol="ρ"
              unit={densUnit}
              value={density}
              onChange={setDensity}
              placeholder="998"
              error={errors.density}
            />
            <div className="flex gap-2 -mt-2">
              {(["kg/m³", "g/cm³"] as DensUnit[]).map(u => (
                <Btn key={u} label={u} active={densUnit === u} onClick={() => {
                  const factor = (d: DensUnit) => d === "g/cm³" ? 1000 : 1;
                  const si = parseFloat(density) * factor(densUnit);
                  setDensUnit(u);
                  if (!isNaN(si)) setDensity(fmtV(si / factor(u)));
                }} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Required for speed of sound c = √(K/ρ).
            </p>
          </div>

          {/* Optional test ΔP (direct mode) */}
          {mode === "direct" && (
            <div>
              <div className="flex gap-2 mb-3" aria-hidden="true">
                <span className="px-3 py-1 text-sm opacity-0 select-none">x</span>
              </div>
              <InputField
                label="Test pressure (optional)"
                symbol="ΔP"
                unit={testDPUnit}
                value={testDP}
                onChange={setTestDP}
                placeholder="10"
                error={errors.testDP}
              />
              <div className="flex flex-wrap gap-2 -mt-2">
                {PRES_UNITS.map(u => (
                  <Btn key={u.key} label={u.key} active={testDPUnit === u.key} onClick={() => {
                    const si = parseFloat(testDP) * PRES_UNITS.find(x => x.key === testDPUnit)!.factor;
                    setTestDPUnit(u.key);
                    if (!isNaN(si) && testDP !== "") setTestDP(fmtV(si / u.factor));
                  }} />
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enter a ΔP to compute the resulting volume strain |ΔV/V₀| = ΔP/K.
              </p>
            </div>
          )}
        </div>

        {errors.general && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.general}</p>
        )}
        <button
          onClick={handleCalculate}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors"
        >
          Calculate
        </button>
        <ClearButton onClear={handleClear} />
      </Card>

      {/* Results */}
      {result && steps && (
        <ResultsCard>
          <div className="space-y-5">

            {/* Primary */}
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Bulk Modulus
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                K = {fmtK(result.K)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                β = {result.beta.toExponential(4)} Pa⁻¹
                {result.speedOfSound !== null && (
                  <span> &nbsp;·&nbsp; c = {fmtV(result.speedOfSound)} m/s</span>
                )}
              </p>
            </div>

            {/* Volume strain result */}
            {result.volumeStrain > 0 && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Volume change
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "ΔP (Pa)",       value: fmtV(result.deltaP)            },
                    { label: "|ΔV/V₀|",        value: fmtV(result.volumeStrain, 4)  },
                    { label: "|ΔV/V₀| (%)",    value: fmtV(result.volumeStrain * 100, 4) },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* K conversion grid */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Bulk modulus in other units
              </p>
              <div className="grid grid-cols-4 gap-2">
                {K_DISPLAY_UNITS.map(u => (
                  <div key={u.label} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{u.label}</p>
                    <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmtV(result.K / u.factor)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* β conversion grid */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Compressibility β = 1/K in other units
              </p>
              <div className="grid grid-cols-3 gap-2">
                {BETA_DISPLAY_UNITS.map(u => (
                  <div key={u.label} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{u.label}</p>
                    <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmtV(result.beta / u.factor)}</p>
                  </div>
                ))}
              </div>
            </div>

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.bulkModulus} />
            <CommonMistakes mistakes={commonMistakes.bulkModulus} />
          </div>
        </ResultsCard>
      )}

      {/* Reference table */}
      <Card>
        <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
          Reference — Bulk Modulus of Common Fluids
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600">
                <th className="text-left py-2 pr-4 font-semibold text-gray-900 dark:text-white">Fluid</th>
                <th className="text-left py-2 pr-4 font-semibold text-gray-900 dark:text-white">K (GPa)</th>
                <th className="text-left py-2 pr-4 font-semibold text-gray-900 dark:text-white">ρ (kg/m³)</th>
                <th className="text-left py-2 font-semibold text-gray-900 dark:text-white">c (m/s)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
              {PRESETS.map(p => (
                <tr key={p.label}>
                  <td className="py-1.5 pr-4">{p.label}</td>
                  <td className="py-1.5 pr-4 font-mono">{p.K_GPa < 0.001 ? p.K_GPa.toExponential(4) : p.K_GPa}</td>
                  <td className="py-1.5 pr-4 font-mono">{p.rho}</td>
                  <td className="py-1.5 font-mono">{p.c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Air values: isothermal K<sub>T</sub> = P ≈ 101.3 kPa; isentropic K<sub>s</sub> = γP ≈ 141.9 kPa (γ = 1.4).
          Speed of sound in air uses c = √(γRT) = 343 m/s at 20°C.
        </p>
      </Card>

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Bulk modulus K:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>K = −V (dP/dV) = ΔP / |ΔV/V₀|      [Pa]</div>
              <div>β = 1/K                               [Pa⁻¹]  (compressibility)</div>
              <div>c = √(K/ρ)                            [m/s]   (speed of sound)</div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              K measures how much pressure is needed to produce a given fractional volume decrease.
              A higher K means a stiffer, less compressible fluid.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Isothermal vs isentropic bulk modulus:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white w-32">Type</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Formula</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Use when</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {([
                  { key: "KT", type: <>K<sub>T</sub> (isothermal)</>, formula: <>K<sub>T</sub> = −V (∂P/∂V)<sub>T</sub></>, use: "Slow compression, heat can escape" },
                  { key: "Ks", type: <>K<sub>s</sub> (isentropic)</>, formula: <>K<sub>s</sub> = γ K<sub>T</sub>  (ideal gas)</>, use: "Fast / acoustic processes, no heat transfer" },
                ] as { key: string; type: React.ReactNode; formula: React.ReactNode; use: string }[]).map(({ key, type, formula, use }) => (
                  <tr key={key}>
                    <td className="py-1.5 pr-4 font-medium">{type}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{formula}</td>
                    <td className="py-1.5 text-xs">{use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              For liquids K<sub>T</sub> ≈ K<sub>s</sub> (small difference). For ideal gases K<sub>T</sub> = P and K<sub>s</sub> = γP.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Speed of sound:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Liquids:   c = √(K<sub>s</sub> / ρ)</div>
              <div>Ideal gas: c = √(γ R T)  =  √(γ P / ρ)</div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Use K<sub>s</sub> (isentropic) for the speed of sound, not K<sub>T</sub>.
              For water at 20°C: c = √(2.18×10⁹ / 998) ≈ 1477 m/s.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>K = bulk modulus [Pa]</li>
              <li>β = compressibility = 1/K [Pa⁻¹]</li>
              <li>ΔP = applied pressure increase [Pa]</li>
              <li>|ΔV/V₀| = magnitude of relative volume decrease (dimensionless)</li>
              <li>ρ = fluid density [kg/m³]</li>
              <li>c = speed of sound [m/s]</li>
              <li>γ = ratio of specific heats (≈ 1.4 for air)</li>
            </ul>
          </div>
        </div>
      </Card>

      <References refs={REFS_BULK_MODULUS} />
    </div>
  );
}
