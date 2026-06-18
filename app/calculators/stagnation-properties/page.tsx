"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_STAGNATION_PROPS } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateStagnationProperties,
  generateStagnationPropertiesSteps,
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
const fromK: Record<TempUnit, (t: number) => number> = {
  "K":  (t) => t,
  "°C": (t) => t - 273.15,
  "°F": (t) => (t - 273.15) * 9 / 5 + 32,
};
const toPa: Record<PresUnit, number> = {
  "Pa": 1, "kPa": 1e3, "bar": 1e5, "atm": 101325, "psi": 6894.76,
};
const fromPa: Record<PresUnit, number> = {
  "Pa": 1, "kPa": 1e-3, "bar": 1e-5, "atm": 1 / 101325, "psi": 1 / 6894.76,
};

const GAS_PRESETS = [
  { label: "Air",      gamma: "1.400" },
  { label: "Nitrogen", gamma: "1.400" },
  { label: "Oxygen",   gamma: "1.395" },
  { label: "Helium",   gamma: "1.667" },
  { label: "Argon",    gamma: "1.667" },
  { label: "CO₂",      gamma: "1.289" },
] as const;

const REGIME_COLORS: Record<string, string> = {
  "at rest":    "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
  "subsonic":   "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
  "transonic":  "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200",
  "supersonic": "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200",
  "hypersonic": "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
};

const REGIME_BG: Record<string, string> = {
  "at rest":    "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-600",
  "subsonic":   "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  "transonic":  "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
  "supersonic": "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
  "hypersonic": "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
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

export default function StagnationPropertiesCalculator() {
  const [mach,        setMach]        = useState("0.8");
  const [gamma,       setGamma]       = useState("1.4");
  const [staticTemp,  setStaticTemp]  = useState("250");
  const [tempUnit,    setTempUnit]    = useState<TempUnit>("K");
  const [staticPres,  setStaticPres]  = useState("80");
  const [presUnit,    setPresUnit]    = useState<PresUnit>("kPa");
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [result,      setResult]      = useState<ReturnType<typeof calculateStagnationProperties> | null>(null);
  const [steps,       setSteps]       = useState<ReturnType<typeof generateStagnationPropertiesSteps> | null>(null);

  const handleTempUnitChange = (newUnit: TempUnit) => {
    const t = parseFloat(staticTemp);
    if (!isNaN(t)) setStaticTemp(fmt(fromK[newUnit](toK[tempUnit](t)), 5));
    setTempUnit(newUnit);
  };

  const handlePresUnitChange = (newUnit: PresUnit) => {
    const p = parseFloat(staticPres);
    if (!isNaN(p)) setStaticPres(fmt(p * toPa[presUnit] / toPa[newUnit], 5));
    setPresUnit(newUnit);
  };

  const handleClear = () => {
    setMach("");
    setGamma("");
    setStaticTemp("");
    setTempUnit("K");
    setStaticPres("");
    setPresUnit("kPa");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const M    = parseFloat(mach);
    const gVal = parseFloat(gamma);
    const tRaw = parseFloat(staticTemp);
    const pRaw = parseFloat(staticPres);
    const TK   = toK[tempUnit](tRaw);
    const PPa  = pRaw * toPa[presUnit];

    if (isNaN(M)    || M    < 0)  newErrors.mach       = "Must be ≥ 0";
    if (isNaN(gVal) || gVal <= 1) newErrors.gamma      = "Must be > 1";
    if (isNaN(tRaw))               newErrors.staticTemp = "Required";
    if (!isNaN(tRaw) && TK <= 0)  newErrors.staticTemp = "Absolute temperature must be > 0 K";
    if (isNaN(pRaw) || pRaw <= 0) newErrors.staticPres  = "Must be positive";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = { mach: M, gamma: gVal, staticTemperature: TK, staticPressure: PPa };
      const calc  = calculateStagnationProperties(input);
      const stp   = generateStagnationPropertiesSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : "An error occurred" });
      setResult(null); setSteps(null);
    }
  };

  const TK = toK[tempUnit](parseFloat(staticTemp));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Stagnation Properties Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Compute total (stagnation) temperature T₀ and pressure P₀ from static conditions
          and Mach number via isentropic deceleration to rest.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
          Compressible Flow · Stagnation
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
              {["0", "0.3", "0.5", "0.8", "1.0", "1.5", "2.0"].map(v => (
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

          {/* Static temperature */}
          <div>
            <InputField label="Static temperature" symbol="T" unit={tempUnit}
              value={staticTemp} onChange={setStaticTemp}
              placeholder={tempUnit === "K" ? "250" : tempUnit === "°C" ? "-23.15" : "-9.67"}
              error={errors.staticTemp} />
            <div className="flex gap-2 -mt-2">
              {(["K", "°C", "°F"] as TempUnit[]).map(u => (
                <Btn key={u} label={u} active={tempUnit === u} onClick={() => handleTempUnitChange(u)} />
              ))}
            </div>
            {!isNaN(parseFloat(staticTemp)) && TK > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
                T = {TK.toFixed(2)} K
              </p>
            )}
          </div>

          {/* Static pressure */}
          <div>
            <InputField label="Static pressure" symbol="P" unit={presUnit}
              value={staticPres} onChange={setStaticPres}
              placeholder={presUnit === "Pa" ? "80000" : presUnit === "kPa" ? "80" : presUnit === "bar" ? "0.8" : presUnit === "atm" ? "0.79" : "11.6"}
              error={errors.staticPres} />
            <div className="flex gap-2 -mt-2">
              {(["Pa", "kPa", "bar", "atm", "psi"] as PresUnit[]).map(u => (
                <Btn key={u} label={u} active={presUnit === u} onClick={() => handlePresUnitChange(u)} />
              ))}
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
                  Stagnation Temperature T₀
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  T₀ = {fmt(result.totalTemperature)} K
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  = {fmt(result.totalTemperature - 273.15, 4)} °C
                  {" · "}
                  T₀/T = {fmt(result.temperatureRatio)}
                </p>
              </div>
              <span className={`mt-1 px-3 py-1 rounded text-sm font-semibold capitalize ${REGIME_COLORS[result.regime]}`}>
                {result.regime}
              </span>
            </div>

            {/* Dynamic heating banner */}
            <div className={`p-4 rounded-lg border ${REGIME_BG[result.regime]}`}>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">
                M = {mach} — Dynamic temperature rise ΔT = {fmt(result.dynamicTempRise, 4)} K
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                T₀/T = {fmt(result.temperatureRatio)}
                {" · "}
                P₀/P = {fmt(result.pressureRatio)}
                {" · "}
                {result.regime === "at rest"
                  ? "No kinetic energy — stagnation equals static"
                  : `${((result.temperatureRatio - 1) * 100).toFixed(1)}% temperature rise from kinetic energy`}
              </p>
            </div>

            {/* Temperature grid */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Stagnation temperature
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "T₀ [K]",  value: fmt(result.totalTemperature, 5) },
                  { label: "T₀ [°C]", value: fmt(result.totalTemperature - 273.15, 4) },
                  { label: "T₀/T",    value: fmt(result.temperatureRatio) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "T₀ [°F]",  value: fmt(fromK["°F"](result.totalTemperature), 4) },
                  { label: "ΔT [K]",   value: fmt(result.dynamicTempRise, 4) },
                  { label: "T [K]",    value: fmt(toK[tempUnit](parseFloat(staticTemp)), 5) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pressure grid */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Stagnation pressure
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "P₀ [kPa]", value: fmt(result.totalPressure * 1e-3, 5) },
                  { label: "P₀ [bar]", value: fmt(result.totalPressure * 1e-5, 4) },
                  { label: "P₀/P",     value: fmt(result.pressureRatio) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "P₀ [Pa]",  value: fmt(result.totalPressure, 5) },
                  { label: "P₀ [atm]", value: fmt(result.totalPressure * fromPa["atm"], 4) },
                  { label: "P₀ [psi]", value: fmt(result.totalPressure * fromPa["psi"], 4) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.stagnationProperties} />
            <CommonMistakes mistakes={commonMistakes.stagnationProperties} />
          </div>
        </ResultsCard>
      )}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Stagnation (total) property relations:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>T₀ = T × [1 + (γ−1)/2 × M²]&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[stagnation temperature]</div>
              <div>P₀ = P × [1 + (γ−1)/2 × M²]<sup>γ/(γ−1)</sup>&nbsp;&nbsp;&nbsp;[stagnation pressure]</div>
              <div>ρ₀ = ρ × [1 + (γ−1)/2 × M²]<sup>1/(γ−1)</sup>&nbsp;&nbsp;&nbsp;[stagnation density]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>T, P, ρ = static (local) properties of the flowing gas</li>
              <li>T₀, P₀, ρ₀ = stagnation (total) properties — state if isentropically decelerated to rest</li>
              <li>M = Mach number = V/c where c = √(γRT)</li>
              <li>ΔT = T₀ − T = (γ−1)/2 × M² × T — dynamic temperature rise from kinetic energy</li>
              <li>T₀ is conserved in any adiabatic flow (with or without friction)</li>
              <li>P₀ is conserved only in isentropic (reversible adiabatic) flow — drops across shocks and in viscous ducts</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Stagnation ratios for air (γ = 1.4) at common Mach numbers:</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  {["M", "T₀/T", "P₀/P", "ΔT/T", "Regime"].map(h => (
                    <th key={h} className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { M: "0.0",  T0T: "1.000",  P0P: "1.000",  dT: "0.000",  regime: "at rest"   },
                  { M: "0.3",  T0T: "1.018",  P0P: "1.064",  dT: "0.018",  regime: "subsonic"  },
                  { M: "0.5",  T0T: "1.050",  P0P: "1.186",  dT: "0.050",  regime: "subsonic"  },
                  { M: "0.8",  T0T: "1.128",  P0P: "1.524",  dT: "0.128",  regime: "subsonic"  },
                  { M: "1.0",  T0T: "1.200",  P0P: "1.893",  dT: "0.200",  regime: "transonic" },
                  { M: "1.5",  T0T: "1.450",  P0P: "3.671",  dT: "0.450",  regime: "supersonic"},
                  { M: "2.0",  T0T: "1.800",  P0P: "7.824",  dT: "0.800",  regime: "supersonic"},
                  { M: "3.0",  T0T: "2.800",  P0P: "36.73",  dT: "1.800",  regime: "supersonic"},
                ].map(({ M, T0T, P0P, dT, regime }) => (
                  <tr key={M}>
                    <td className="py-1.5 pr-3 font-mono">{M}</td>
                    <td className="py-1.5 pr-3 font-mono">{T0T}</td>
                    <td className="py-1.5 pr-3 font-mono">{P0P}</td>
                    <td className="py-1.5 pr-3 font-mono">{dT}</td>
                    <td className="py-1.5 text-gray-500 dark:text-gray-400 capitalize">{regime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            Stagnation temperature T₀ is the key quantity in propulsion — it represents the total
            energy content per unit mass of the gas stream. T₀ = T + V²/(2c<sub>p</sub>), showing
            it is the static temperature plus the kinetic energy contribution. P₀ is used to
            quantify losses: any irreversibility (shock, friction) reduces P₀ even if T₀ stays constant.
          </p>
        </div>
      </Card>

      <References refs={REFS_STAGNATION_PROPS} />
    </div>
  );
}
