"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_SPEED_OF_SOUND } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateSpeedOfSound,
  generateSpeedOfSoundSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type TempUnit = "K" | "°C" | "°F";

const toK: Record<TempUnit, (t: number) => number> = {
  "K":  (t) => t,
  "°C": (t) => t + 273.15,
  "°F": (t) => (t - 32) * 5 / 9 + 273.15,
};
const fromK: Record<TempUnit, (k: number) => number> = {
  "K":  (k) => k,
  "°C": (k) => k - 273.15,
  "°F": (k) => (k - 273.15) * 9 / 5 + 32,
};

const GAS_PRESETS = [
  { label: "Air (dry)",    gamma: "1.400", R: "287.05",  note: "Standard atmosphere" },
  { label: "Nitrogen N₂", gamma: "1.400", R: "296.80",  note: "Diatomic" },
  { label: "Oxygen O₂",   gamma: "1.395", R: "259.83",  note: "Diatomic" },
  { label: "Helium",      gamma: "1.667", R: "2077.1",  note: "Monatomic" },
  { label: "Hydrogen H₂", gamma: "1.405", R: "4124.2",  note: "Diatomic" },
  { label: "Argon",       gamma: "1.667", R: "208.13",  note: "Monatomic" },
  { label: "CO₂",         gamma: "1.289", R: "188.92",  note: "Triatomic" },
  { label: "Methane CH₄", gamma: "1.303", R: "518.28",  note: "Polyatomic" },
] as const;

function fmt(n: number, sig = 5) { return parseFloat(n.toPrecision(sig)).toString(); }

function Btn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1 text-sm rounded ${active
        ? "bg-blue-500 text-white"
        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"}`}>
      {label}
    </button>
  );
}

export default function SpeedOfSoundCalculator() {
  const [gamma,       setGamma]       = useState("1.4");
  const [R,           setR]           = useState("287.05");
  const [temperature, setTemperature] = useState("20");
  const [tempUnit,    setTempUnit]    = useState<TempUnit>("°C");
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [result,      setResult]      = useState<ReturnType<typeof calculateSpeedOfSound> | null>(null);
  const [steps,       setSteps]       = useState<ReturnType<typeof generateSpeedOfSoundSteps> | null>(null);

  const handleTempUnitChange = (newUnit: TempUnit) => {
    const t = parseFloat(temperature);
    if (!isNaN(t)) setTemperature(fmt(fromK[newUnit](toK[tempUnit](t)), 5));
    setTempUnit(newUnit);
  };

  const handleClear = () => {
    setGamma("");
    setR("");
    setTemperature("");
    setTempUnit("°C");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const gammaVal = parseFloat(gamma);
    const RVal     = parseFloat(R);
    const tRaw     = parseFloat(temperature);
    const TK       = toK[tempUnit](tRaw);

    if (isNaN(gammaVal) || gammaVal <= 1) newErrors.gamma       = "Must be > 1";
    if (isNaN(RVal)     || RVal     <= 0) newErrors.R           = "Must be positive";
    if (isNaN(tRaw))                      newErrors.temperature = "Required";
    if (!isNaN(tRaw) && TK <= 0)          newErrors.temperature = "Absolute temperature must be > 0 K";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = { gamma: gammaVal, R: RVal, temperature: TK };
      const calc  = calculateSpeedOfSound(input);
      const stp   = generateSpeedOfSoundSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : "An error occurred" });
      setResult(null); setSteps(null);
    }
  };

  const TK = toK[tempUnit](parseFloat(temperature));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Speed of Sound Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Speed of sound in an ideal gas: c = √(γRT).
          Covers all common gases with presets for γ and R.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
          Compressible Flow · Fundamental
        </span>
      </div>

      {/* Gas presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Gas presets — click to fill γ and R
        </h2>
        <div className="flex flex-wrap gap-2">
          {GAS_PRESETS.map((p) => (
            <button key={p.label}
              onClick={() => { setGamma(p.gamma); setR(p.R); }}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* γ */}
          <div>
            <InputField label="Specific heat ratio" symbol="γ" unit="dimensionless"
              value={gamma} onChange={setGamma} error={errors.gamma} />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
              c<sub>p</sub>/c<sub>v</sub> — 1.4 for air, 1.667 for monatomic gases
            </p>
          </div>

          {/* R */}
          <div>
            <InputField label="Specific gas constant" symbol="R" unit="J/(kg·K)"
              value={R} onChange={setR} error={errors.R} />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
              R = R<sub>u</sub>/M — 287.05 for air, 2077 for helium
            </p>
          </div>

          {/* Temperature */}
          <div>
            <InputField label="Temperature" symbol="T" unit={tempUnit}
              value={temperature} onChange={setTemperature}
              placeholder={tempUnit === "K" ? "293.15" : tempUnit === "°C" ? "20" : "68"}
              error={errors.temperature} />
            <div className="flex gap-2 -mt-2">
              {(["K", "°C", "°F"] as TempUnit[]).map(u => (
                <Btn key={u} label={u} active={tempUnit === u} onClick={() => handleTempUnitChange(u)} />
              ))}
            </div>
            {!isNaN(parseFloat(temperature)) && TK > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
                T = {TK.toFixed(2)} K
              </p>
            )}
          </div>
        </div>

        {errors.general && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.general}</p>}
        <button onClick={handleCalculate}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors">
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
                Speed of Sound  c = √(γRT)
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                c = {fmt(result.speedOfSound)} m/s
              </p>
              <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                = {fmt(result.speedOfSoundKmh)} km/h
                {" · "}
                = {fmt(result.speedOfSoundFts)} ft/s
              </p>
            </div>

            {/* Unit grid */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Speed of sound in different units
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "m/s",   value: fmt(result.speedOfSound,      5) },
                  { label: "km/h",  value: fmt(result.speedOfSoundKmh,   5) },
                  { label: "ft/s",  value: fmt(result.speedOfSoundFts,   5) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "knots", value: fmt(result.speedOfSoundKnots, 5) },
                  { label: "mph",   value: fmt(result.speedOfSoundMph,   5) },
                  { label: "T [K]", value: fmt(toK[tempUnit](parseFloat(temperature)), 5) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.speedOfSound} />
            <CommonMistakes mistakes={commonMistakes.speedOfSound} />
          </div>
        </ResultsCard>
      )}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Speed of sound in an ideal gas:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>c = √(γ × R × T)&nbsp;&nbsp;&nbsp;&nbsp;[m/s]</div>
              <div>R = R<sub>u</sub> / M&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[specific gas constant, J/(kg·K)]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>γ = c<sub>p</sub>/c<sub>v</sub> — ratio of specific heats (dimensionless)</li>
              <li>R = specific gas constant [J/(kg·K)] = R<sub>u</sub>/M</li>
              <li>R<sub>u</sub> = 8.314 J/(mol·K) — universal gas constant</li>
              <li>M = molar mass of the gas [kg/mol]</li>
              <li>T = absolute temperature [K] — must be in Kelvin</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Gas properties and speed of sound at 20°C (293.15 K):</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">Gas</th>
                  <th className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">γ</th>
                  <th className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">R [J/(kg·K)]</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">c at 20°C [m/s]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { gas: "Air (dry)",    g: "1.400", R: "287.05",  c: "343" },
                  { gas: "Nitrogen N₂", g: "1.400", R: "296.80",  c: "349" },
                  { gas: "Oxygen O₂",   g: "1.395", R: "259.83",  c: "326" },
                  { gas: "Helium",      g: "1.667", R: "2077.1",  c: "1007" },
                  { gas: "Hydrogen H₂", g: "1.405", R: "4124.2",  c: "1270" },
                  { gas: "Argon",       g: "1.667", R: "208.13",  c: "323" },
                  { gas: "CO₂",         g: "1.289", R: "188.92",  c: "267" },
                  { gas: "Methane CH₄", g: "1.303", R: "518.28",  c: "446" },
                ].map(({ gas, g, R: Rval, c }) => (
                  <tr key={gas}>
                    <td className="py-1.5 pr-3">{gas}</td>
                    <td className="py-1.5 pr-3 font-mono">{g}</td>
                    <td className="py-1.5 pr-3 font-mono">{Rval}</td>
                    <td className="py-1.5 font-mono">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">ISA standard atmosphere (air):</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">Altitude [m]</th>
                  <th className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">T [K]</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">c [m/s]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { alt: "0 (sea level)", T: "288.15", c: "340.3" },
                  { alt: "1 000",         T: "281.65", c: "336.4" },
                  { alt: "5 000",         T: "255.65", c: "320.5" },
                  { alt: "10 000",        T: "223.25", c: "299.5" },
                  { alt: "20 000",        T: "216.65", c: "295.1" },
                ].map(({ alt, T, c }) => (
                  <tr key={alt}>
                    <td className="py-1.5 pr-3 font-mono">{alt}</td>
                    <td className="py-1.5 pr-3 font-mono">{T}</td>
                    <td className="py-1.5 font-mono">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            The speed of sound increases with temperature because higher T means faster molecular
            motion. In the ISA atmosphere, c decreases with altitude as temperature drops
            (lapse rate −6.5 K/km in the troposphere).
          </p>
        </div>
      </Card>

      <References refs={REFS_SPEED_OF_SOUND} />
    </div>
  );
}
