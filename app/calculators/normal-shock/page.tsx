"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_NORMAL_SHOCK } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateNormalShock,
  generateNormalShockSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type TempUnit = "K" | "°C" | "°F";
type PresUnit = "Pa" | "kPa" | "bar" | "atm" | "psi";

const toK:  Record<TempUnit, (t: number) => number> = {
  "K":  (t) => t,
  "°C": (t) => t + 273.15,
  "°F": (t) => (t - 32) * 5 / 9 + 273.15,
};
const fromK: Record<TempUnit, (k: number) => number> = {
  "K":  (k) => k,
  "°C": (k) => k - 273.15,
  "°F": (k) => (k - 273.15) * 9 / 5 + 32,
};
const toPa: Record<PresUnit, number> = {
  "Pa": 1, "kPa": 1e3, "bar": 1e5, "atm": 101325, "psi": 6894.76,
};

const GAS_PRESETS = [
  { label: "Air",      gamma: "1.400" },
  { label: "Nitrogen", gamma: "1.400" },
  { label: "Oxygen",   gamma: "1.395" },
  { label: "Helium",   gamma: "1.667" },
  { label: "Argon",    gamma: "1.667" },
  { label: "CO₂",      gamma: "1.289" },
] as const;

const STRENGTH_COLORS: Record<string, string> = {
  "very weak": "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
  "weak":      "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
  "moderate":  "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200",
  "strong":    "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200",
  "very strong":"bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
};

const STRENGTH_BG: Record<string, string> = {
  "very weak": "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  "weak":      "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  "moderate":  "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
  "strong":    "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
  "very strong":"bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
};

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

export default function NormalShockCalculator() {
  const [mach1,          setMach1]          = useState("2.0");
  const [gamma,          setGamma]          = useState("1.4");
  const [showP1,         setShowP1]         = useState(false);
  const [staticPressure1, setStaticPressure1] = useState("101.325");
  const [presUnit,       setPresUnit]       = useState<PresUnit>("kPa");
  const [showT1,         setShowT1]         = useState(false);
  const [staticTemp1,    setStaticTemp1]    = useState("288.15");
  const [tempUnit,       setTempUnit]       = useState<TempUnit>("K");
  const [errors,         setErrors]         = useState<Record<string, string>>({});
  const [result,         setResult]         = useState<ReturnType<typeof calculateNormalShock> | null>(null);
  const [steps,          setSteps]          = useState<ReturnType<typeof generateNormalShockSteps> | null>(null);

  const handleTempUnitChange = (newUnit: TempUnit) => {
    const t = parseFloat(staticTemp1);
    if (!isNaN(t)) setStaticTemp1(fmt(fromK[newUnit](toK[tempUnit](t)), 5));
    setTempUnit(newUnit);
  };

  const handlePresUnitChange = (newUnit: PresUnit) => {
    const p = parseFloat(staticPressure1);
    if (!isNaN(p)) setStaticPressure1(fmt(p * toPa[presUnit] / toPa[newUnit], 5));
    setPresUnit(newUnit);
  };

  const handleClear = () => {
    setMach1("");
    setGamma("");
    setStaticPressure1("");
    setPresUnit("kPa");
    setStaticTemp1("");
    setTempUnit("K");
    setShowP1(false);
    setShowT1(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const M1   = parseFloat(mach1);
    const gVal = parseFloat(gamma);
    const pRaw = parseFloat(staticPressure1);
    const tRaw = parseFloat(staticTemp1);
    const T1K  = toK[tempUnit](tRaw);
    const P1Pa = pRaw * toPa[presUnit];

    if (isNaN(M1)   || M1   <= 1) newErrors.mach1  = "Must be > 1 for a normal shock";
    if (isNaN(gVal) || gVal <= 1) newErrors.gamma   = "Must be > 1";
    if (showP1 && (isNaN(pRaw) || pRaw <= 0)) newErrors.staticPressure1 = "Must be positive";
    if (showT1 && isNaN(tRaw))               newErrors.staticTemp1     = "Required";
    if (showT1 && !isNaN(tRaw) && T1K <= 0) newErrors.staticTemp1     = "Absolute temperature must be > 0 K";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        mach1:             M1,
        gamma:             gVal,
        staticPressure1:   showP1 ? P1Pa : undefined,
        staticTemperature1: showT1 ? T1K : undefined,
      };
      const calc = calculateNormalShock(input);
      const stp  = generateNormalShockSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : "An error occurred" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Normal Shock Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Post-shock properties via Rankine-Hugoniot relations. Computes M₂, pressure,
          temperature, density, velocity, total pressure loss, and Pitot pressure ratio.
          Optionally supply upstream P₁ and T₁ to get absolute downstream values.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
          Compressible Flow · Normal Shock
        </span>
      </div>

      {/* Gas presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Gas presets — click to fill γ
        </h2>
        <div className="flex flex-wrap gap-2">
          {GAS_PRESETS.map((p) => (
            <button key={p.label}
              onClick={() => setGamma(p.gamma)}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
              {p.label} (γ = {p.gamma})
            </button>
          ))}
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* M₁ */}
          <div>
            <InputField label="Upstream Mach number" symbol="M₁" unit="dimensionless"
              value={mach1} onChange={setMach1} error={errors.mach1} />
            <div className="flex gap-2 -mt-2">
              {["1.5", "2.0", "2.5", "3.0", "4.0", "5.0"].map(v => (
                <Btn key={v} label={v} active={mach1 === v} onClick={() => setMach1(v)} />
              ))}
            </div>
          </div>

          {/* γ */}
          <div>
            <InputField label="Specific heat ratio" symbol="γ" unit="dimensionless"
              value={gamma} onChange={setGamma} error={errors.gamma} />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
              c<sub>p</sub>/c<sub>v</sub> — use gas presets above
            </p>
          </div>
        </div>

        {/* Optional upstream conditions */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4 space-y-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Upstream static conditions — optional, needed to compute absolute downstream values
          </p>

          {/* P₁ */}
          <div className="flex items-start gap-3">
            <input type="checkbox" id="showP1" checked={showP1}
              onChange={(e) => setShowP1(e.target.checked)}
              className="mt-3 w-4 h-4 text-blue-600 rounded" />
            <div className="flex-1">
              <label htmlFor="showP1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Upstream static pressure P₁
              </label>
              {showP1 && (
                <>
                  <InputField label="Static pressure" symbol="P₁" unit={presUnit}
                    value={staticPressure1} onChange={setStaticPressure1}
                    placeholder={presUnit === "Pa" ? "101325" : presUnit === "kPa" ? "101.325" : presUnit === "bar" ? "1.01325" : presUnit === "atm" ? "1" : "14.696"}
                    error={errors.staticPressure1} />
                  <div className="flex gap-2 -mt-2">
                    {(["Pa", "kPa", "bar", "atm", "psi"] as PresUnit[]).map(u => (
                      <Btn key={u} label={u} active={presUnit === u} onClick={() => handlePresUnitChange(u)} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* T₁ */}
          <div className="flex items-start gap-3">
            <input type="checkbox" id="showT1" checked={showT1}
              onChange={(e) => setShowT1(e.target.checked)}
              className="mt-3 w-4 h-4 text-blue-600 rounded" />
            <div className="flex-1">
              <label htmlFor="showT1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Upstream static temperature T₁
              </label>
              {showT1 && (
                <>
                  <InputField label="Static temperature" symbol="T₁" unit={tempUnit}
                    value={staticTemp1} onChange={setStaticTemp1}
                    placeholder={tempUnit === "K" ? "288.15" : tempUnit === "°C" ? "15" : "59"}
                    error={errors.staticTemp1} />
                  <div className="flex gap-2 -mt-2">
                    {(["K", "°C", "°F"] as TempUnit[]).map(u => (
                      <Btn key={u} label={u} active={tempUnit === u} onClick={() => handleTempUnitChange(u)} />
                    ))}
                  </div>
                </>
              )}
            </div>
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
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Downstream Mach Number M₂
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  M₂ = {fmt(result.mach2)}
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  P₂/P₁ = {fmt(result.pressureRatio)}
                  {" · "}
                  T₂/T₁ = {fmt(result.temperatureRatio)}
                </p>
              </div>
              <span className={`mt-1 px-3 py-1 rounded text-sm font-semibold capitalize ${STRENGTH_COLORS[result.shockStrength]}`}>
                {result.shockStrength}
              </span>
            </div>

            {/* Shock banner */}
            <div className={`p-4 rounded-lg border ${STRENGTH_BG[result.shockStrength]}`}>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">
                M₁ = {mach1} → M₂ = {fmt(result.mach2)} — {result.shockStrength} normal shock
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Total pressure recovery P₀₂/P₀₁ = {fmt(result.totalPressureRatio)}
                {" · "}
                Entropy rise Δs/R = {fmt(result.normalizedEntropyChange, 4)}
                {" · "}
                Downstream flow is always subsonic
              </p>
            </div>

            {/* Ratio grid */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Rankine-Hugoniot ratios
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "M₂",      value: fmt(result.mach2) },
                  { label: "P₂/P₁",   value: fmt(result.pressureRatio) },
                  { label: "T₂/T₁",   value: fmt(result.temperatureRatio) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "ρ₂/ρ₁",         value: fmt(result.densityRatio) },
                  { label: "V₂/V₁",          value: fmt(result.velocityRatio) },
                  { label: <span>P₀₂/P₀₁</span>, value: fmt(result.totalPressureRatio) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: <span>P₀₂/P₁ (Pitot)</span>, value: fmt(result.pitotPressureRatio) },
                  { label: "Δs/R",                        value: fmt(result.normalizedEntropyChange, 4) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Absolute downstream values — only if P₁ or T₁ given */}
            {(result.staticPressure2 != null || result.staticTemperature2 != null) && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Downstream static conditions
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    result.staticPressure2 != null
                      ? { label: "P₂ [kPa]", value: fmt(result.staticPressure2 / 1000, 5) }
                      : { label: "P₂ [kPa]", value: "—" },
                    result.staticPressure2 != null
                      ? { label: "P₂ [Pa]", value: fmt(result.staticPressure2, 5) }
                      : { label: "P₂ [Pa]", value: "—" },
                    result.staticTemperature2 != null
                      ? { label: "T₂ [K]", value: fmt(result.staticTemperature2, 5) }
                      : { label: "T₂ [K]", value: "—" },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.normalShock} />
            <CommonMistakes mistakes={commonMistakes.normalShock} />
          </div>
        </ResultsCard>
      )}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Rankine-Hugoniot relations:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>M₂² = (M₁² + 2/(γ−1)) / (2γM₁²/(γ−1) − 1)</div>
              <div>P₂/P₁ = (2γM₁² − (γ−1)) / (γ+1)</div>
              <div>T₂/T₁ = (P₂/P₁) × (2 + (γ−1)M₁²) / ((γ+1)M₁²)</div>
              <div>ρ₂/ρ₁ = (γ+1)M₁² / (2 + (γ−1)M₁²)</div>
              <div>P₀₂/P₀₁ = (ρ₂/ρ₁)<sup>γ/(γ−1)</sup> × ((γ+1)/(2γM₁²−(γ−1)))<sup>1/(γ−1)</sup></div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Rayleigh Pitot tube formula (supersonic Pitot measurement):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              <div>P₀₂/P₁ = (P₀₂/P₀₁) × (1 + (γ−1)/2 × M₁²)<sup>γ/(γ−1)</sup></div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Normal shock table — air (γ = 1.4):</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  {["M₁", "M₂", "P₂/P₁", "T₂/T₁", "ρ₂/ρ₁", "P₀₂/P₀₁"].map(h => (
                    <th key={h} className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { M1: "1.0", M2: "1.0000", P: "1.000",  T: "1.000",  r: "1.000",  P0: "1.0000" },
                  { M1: "1.5", M2: "0.7011", P: "2.458",  T: "1.320",  r: "1.862",  P0: "0.9298" },
                  { M1: "2.0", M2: "0.5774", P: "4.500",  T: "1.688",  r: "2.667",  P0: "0.7209" },
                  { M1: "2.5", M2: "0.5130", P: "7.125",  T: "2.138",  r: "3.333",  P0: "0.4990" },
                  { M1: "3.0", M2: "0.4752", P: "10.333", T: "2.679",  r: "3.857",  P0: "0.3283" },
                  { M1: "4.0", M2: "0.4350", P: "18.500", T: "4.047",  r: "4.571",  P0: "0.1388" },
                  { M1: "5.0", M2: "0.4152", P: "29.000", T: "5.800",  r: "5.000",  P0: "0.0617" },
                ].map(({ M1, M2, P, T, r, P0 }) => (
                  <tr key={M1}>
                    <td className="py-1.5 pr-3 font-mono">{M1}</td>
                    <td className="py-1.5 pr-3 font-mono">{M2}</td>
                    <td className="py-1.5 pr-3 font-mono">{P}</td>
                    <td className="py-1.5 pr-3 font-mono">{T}</td>
                    <td className="py-1.5 pr-3 font-mono">{r}</td>
                    <td className="py-1.5 font-mono">{P0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            Normal shocks are perpendicular to the flow, always produce subsonic downstream
            flow (M₂ &lt; 1), and are irreversible (P₀₂/P₀₁ &lt; 1). The total pressure
            loss Δs/R = −ln(P₀₂/P₀₁) is a direct measure of the entropy generation.
            In inlets and diffusers, minimising this loss is the key design objective.
          </p>
        </div>
      </Card>

      <References refs={REFS_NORMAL_SHOCK} />
    </div>
  );
}
