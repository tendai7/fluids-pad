"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_ISENTROPIC } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateIsentropicRelations,
  generateIsentropicRelationsSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type TempUnit = "K" | "°C" | "°F";
type PresUnit = "Pa" | "kPa" | "bar" | "atm" | "psi";

const toK:   Record<TempUnit, (t: number) => number> = {
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
  { label: "Air",         gamma: "1.400" },
  { label: "Nitrogen",    gamma: "1.400" },
  { label: "Oxygen",      gamma: "1.395" },
  { label: "Helium",      gamma: "1.667" },
  { label: "Argon",       gamma: "1.667" },
  { label: "Hydrogen",    gamma: "1.405" },
  { label: "CO₂",         gamma: "1.289" },
  { label: "Methane",     gamma: "1.303" },
] as const;

const REGIME_COLORS: Record<string, string> = {
  "at rest":      "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
  "subsonic":     "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
  "high subsonic":"bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
  "sonic":        "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200",
  "supersonic":   "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200",
  "hypersonic":   "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
};

const REGIME_BG: Record<string, string> = {
  "at rest":      "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-600",
  "subsonic":     "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  "high subsonic":"bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  "sonic":        "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
  "supersonic":   "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
  "hypersonic":   "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
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

export default function IsentropicRelationsCalculator() {
  const [mach,             setMach]             = useState("0.5");
  const [gamma,            setGamma]            = useState("1.4");
  const [totalTemperature, setTotalTemperature] = useState("300");
  const [tempUnit,         setTempUnit]         = useState<TempUnit>("K");
  const [showT0,           setShowT0]           = useState(true);
  const [totalPressure,    setTotalPressure]    = useState("101.325");
  const [presUnit,         setPresUnit]         = useState<PresUnit>("kPa");
  const [showP0,           setShowP0]           = useState(true);
  const [errors,           setErrors]           = useState<Record<string, string>>({});
  const [result,           setResult]           = useState<ReturnType<typeof calculateIsentropicRelations> | null>(null);
  const [steps,            setSteps]            = useState<ReturnType<typeof generateIsentropicRelationsSteps> | null>(null);

  const handleTempUnitChange = (newUnit: TempUnit) => {
    const t = parseFloat(totalTemperature);
    if (!isNaN(t)) setTotalTemperature(fmt(fromK[newUnit](toK[tempUnit](t)), 5));
    setTempUnit(newUnit);
  };

  const handlePresUnitChange = (newUnit: PresUnit) => {
    const p = parseFloat(totalPressure);
    if (!isNaN(p)) setTotalPressure(fmt(p * toPa[presUnit] / toPa[newUnit], 5));
    setPresUnit(newUnit);
  };

  const handleClear = () => {
    setMach("");
    setGamma("");
    setTotalTemperature("");
    setTempUnit("K");
    setTotalPressure("");
    setPresUnit("kPa");
    setShowT0(true);
    setShowP0(true);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const M      = parseFloat(mach);
    const gVal   = parseFloat(gamma);
    const tRaw   = parseFloat(totalTemperature);
    const pRaw   = parseFloat(totalPressure);
    const T0K    = toK[tempUnit](tRaw);
    const P0Pa   = pRaw * toPa[presUnit];

    if (isNaN(M)    || M    <  0) newErrors.mach             = "Must be ≥ 0";
    if (isNaN(gVal) || gVal <= 1) newErrors.gamma            = "Must be > 1";
    if (showT0 && isNaN(tRaw))    newErrors.totalTemperature = "Required";
    if (showT0 && !isNaN(tRaw) && T0K <= 0) newErrors.totalTemperature = "Absolute temperature must be > 0 K";
    if (showP0 && (isNaN(pRaw) || pRaw <= 0)) newErrors.totalPressure  = "Must be positive";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        mach:             M,
        gamma:            gVal,
        totalTemperature: showT0 ? T0K    : undefined,
        totalPressure:    showP0 ? P0Pa   : undefined,
      };
      const calc = calculateIsentropicRelations(input);
      const stp  = generateIsentropicRelationsSteps(input, calc);
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
          Isentropic Relations Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Temperature, pressure, density ratios and area ratio A/A* for isentropic
          compressible flow. Enter Mach number and γ; optionally supply T₀ and P₀
          to get static values.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
          Compressible Flow · Isentropic
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

          {/* Mach number */}
          <div>
            <InputField label="Mach number" symbol="M" unit="dimensionless"
              value={mach} onChange={setMach} error={errors.mach} />
            <div className="flex gap-2 -mt-2">
              {["0", "0.5", "0.8", "1.0", "1.5", "2.0", "3.0"].map(v => (
                <Btn key={v} label={v} active={mach === v} onClick={() => setMach(v)} />
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

        {/* Optional stagnation properties */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4 space-y-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Stagnation conditions — optional, needed to compute static T and P
          </p>

          {/* T₀ */}
          <div className="flex items-start gap-3">
            <input type="checkbox" id="showT0" checked={showT0}
              onChange={(e) => setShowT0(e.target.checked)}
              className="mt-3 w-4 h-4 text-blue-600 rounded" />
            <div className="flex-1">
              <label htmlFor="showT0" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total (stagnation) temperature T₀
              </label>
              {showT0 && (
                <>
                  <InputField label="Total temperature" symbol="T₀" unit={tempUnit}
                    value={totalTemperature} onChange={setTotalTemperature}
                    placeholder={tempUnit === "K" ? "300" : tempUnit === "°C" ? "26.85" : "80.3"}
                    error={errors.totalTemperature} />
                  <div className="flex gap-2 -mt-2">
                    {(["K", "°C", "°F"] as TempUnit[]).map(u => (
                      <Btn key={u} label={u} active={tempUnit === u} onClick={() => handleTempUnitChange(u)} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* P₀ */}
          <div className="flex items-start gap-3">
            <input type="checkbox" id="showP0" checked={showP0}
              onChange={(e) => setShowP0(e.target.checked)}
              className="mt-3 w-4 h-4 text-blue-600 rounded" />
            <div className="flex-1">
              <label htmlFor="showP0" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total (stagnation) pressure P₀
              </label>
              {showP0 && (
                <>
                  <InputField label="Total pressure" symbol="P₀" unit={presUnit}
                    value={totalPressure} onChange={setTotalPressure}
                    placeholder={presUnit === "Pa" ? "101325" : presUnit === "kPa" ? "101.325" : presUnit === "bar" ? "1.01325" : presUnit === "atm" ? "1" : "14.696"}
                    error={errors.totalPressure} />
                  <div className="flex gap-2 -mt-2">
                    {(["Pa", "kPa", "bar", "atm", "psi"] as PresUnit[]).map(u => (
                      <Btn key={u} label={u} active={presUnit === u} onClick={() => handlePresUnitChange(u)} />
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
                  Temperature Ratio  T/T₀
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  T/T₀ = {fmt(result.temperatureRatio)}
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  P/P₀ = {fmt(result.pressureRatio)}
                  {" · "}
                  ρ/ρ₀ = {fmt(result.densityRatio)}
                </p>
              </div>
              <span className={`mt-1 px-3 py-1 rounded text-sm font-semibold capitalize ${REGIME_COLORS[result.regime]}`}>
                {result.regime}
              </span>
            </div>

            {/* Regime banner */}
            <div className={`p-4 rounded-lg border ${REGIME_BG[result.regime]}`}>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">
                M = {mach} — {result.regime.charAt(0).toUpperCase() + result.regime.slice(1)} flow
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                A/A* = {isFinite(result.areaRatio) ? fmt(result.areaRatio) : "∞ (at rest)"}
                {" · "}
                Critical P*/P₀ = {fmt(result.criticalPresRatio)}
                {" · "}
                Critical T*/T₀ = {fmt(result.criticalTempRatio)}
              </p>
            </div>

            {/* Unit grid — ratios */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Isentropic ratios
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "T/T₀",  value: fmt(result.temperatureRatio) },
                  { label: "P/P₀",  value: fmt(result.pressureRatio)    },
                  { label: "ρ/ρ₀",  value: fmt(result.densityRatio)     },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "A/A*",           value: isFinite(result.areaRatio) ? fmt(result.areaRatio) : "∞" },
                  { label: <span>T*/T₀</span>, value: fmt(result.criticalTempRatio) },
                  { label: <span>P*/P₀</span>, value: fmt(result.criticalPresRatio) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Static values grid — only if T₀ or P₀ given */}
            {(result.staticTemperature != null || result.staticPressure != null) && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Static conditions
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    result.staticTemperature != null
                      ? { label: "T [K]",  value: fmt(result.staticTemperature, 5) }
                      : { label: "T [K]",  value: "—" },
                    result.staticTemperature != null
                      ? { label: "T [°C]", value: fmt(result.staticTemperature - 273.15, 4) }
                      : { label: "T [°C]", value: "—" },
                    result.staticPressure != null
                      ? { label: "P [kPa]", value: fmt(result.staticPressure / 1000, 5) }
                      : { label: "P [kPa]", value: "—" },
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
            <AssumptionsList assumptions={commonAssumptions.isentropicRelations} />
            <CommonMistakes mistakes={commonMistakes.isentropicRelations} />
          </div>
        </ResultsCard>
      )}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Isentropic flow relations:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>T/T₀ = [1 + (γ−1)/2 × M²]<sup>−1</sup></div>
              <div>P/P₀ = (T/T₀)<sup>γ/(γ−1)</sup></div>
              <div>ρ/ρ₀ = (T/T₀)<sup>1/(γ−1)</sup></div>
              <div>A/A* = (1/M) × [(2/(γ+1)) × (1 + (γ−1)/2 × M²)]<sup>(γ+1)/(2(γ−1))</sup></div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Critical conditions at M = 1 (throat):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>T*/T₀ = 2/(γ+1)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[= 0.8333 for air]</div>
              <div>P*/P₀ = (2/(γ+1))<sup>γ/(γ−1)</sup>&nbsp;&nbsp;&nbsp;[= 0.5283 for air]</div>
              <div>ρ*/ρ₀ = (2/(γ+1))<sup>1/(γ−1)</sup>&nbsp;&nbsp;&nbsp;[= 0.6339 for air]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Key values for air (γ = 1.4) at common Mach numbers:</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  {["M", "T/T₀", "P/P₀", "ρ/ρ₀", "A/A*"].map(h => (
                    <th key={h} className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { M: "0.0",  T: "1.0000", P: "1.0000", r: "1.0000", A: "∞"      },
                  { M: "0.5",  T: "0.9524", P: "0.8430", r: "0.8852", A: "1.3398" },
                  { M: "0.8",  T: "0.8865", P: "0.6560", r: "0.7400", A: "1.0382" },
                  { M: "1.0",  T: "0.8333", P: "0.5283", r: "0.6339", A: "1.0000" },
                  { M: "1.5",  T: "0.6897", P: "0.2724", r: "0.3950", A: "1.1762" },
                  { M: "2.0",  T: "0.5556", P: "0.1278", r: "0.2300", A: "1.6875" },
                  { M: "3.0",  T: "0.3571", P: "0.0272", r: "0.0762", A: "4.2346" },
                  { M: "5.0",  T: "0.1667", P: "0.0019", r: "0.0113", A: "25.000" },
                ].map(({ M, T, P, r, A }) => (
                  <tr key={M}>
                    <td className="py-1.5 pr-3 font-mono">{M}</td>
                    <td className="py-1.5 pr-3 font-mono">{T}</td>
                    <td className="py-1.5 pr-3 font-mono">{P}</td>
                    <td className="py-1.5 pr-3 font-mono">{r}</td>
                    <td className="py-1.5 font-mono">{A}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            Isentropic relations apply to adiabatic, reversible (frictionless) flows — convergent
            nozzles, divergent diffusers, and shock-free streamtubes. The area ratio A/A*
            determines the required throat-to-exit area ratio for a nozzle operating at a given
            design Mach number; each A/A* &gt; 1 has one subsonic and one supersonic solution.
          </p>
        </div>
      </Card>

      <References refs={REFS_ISENTROPIC} />
    </div>
  );
}
