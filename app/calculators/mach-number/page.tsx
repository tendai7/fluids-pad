"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_MACH_NUMBER } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateMachNumber,
  generateMachNumberSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type VelUnit  = "m/s" | "km/h" | "knots" | "ft/s";
type TempUnit = "K" | "°C" | "°F";

const toMS:  Record<VelUnit,  number> = { "m/s": 1, "km/h": 1/3.6, "knots": 0.514444, "ft/s": 0.3048 };
const toK = (v: number, u: TempUnit): number =>
  u === "K" ? v : u === "°C" ? v + 273.15 : (v - 32) * 5/9 + 273.15;
const fromK = (k: number, u: TempUnit): number =>
  u === "K" ? k : u === "°C" ? k - 273.15 : (k - 273.15) * 9/5 + 32;

const GAS_PRESETS = [
  { label: "Air",       gamma: "1.400", R: "287"  },
  { label: "Helium",    gamma: "1.667", R: "2077" },
  { label: "Argon",     gamma: "1.667", R: "208"  },
  { label: "Hydrogen",  gamma: "1.405", R: "4124" },
  { label: "CO₂",       gamma: "1.289", R: "189"  },
  { label: "Methane",   gamma: "1.320", R: "518"  },
] as const;

function fmt(n: number, sig = 4) { return parseFloat(n.toPrecision(sig)).toString(); }

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

export default function MachNumberCalculator() {
  const [velocity,    setVelocity]    = useState("900");
  const [velUnit,     setVelUnit]     = useState<VelUnit>("km/h");
  const [temperature, setTemperature] = useState("15");
  const [tempUnit,    setTempUnit]    = useState<TempUnit>("°C");
  const [gamma,       setGamma]       = useState("1.4");
  const [gasConstant, setGasConstant] = useState("287");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateMachNumber> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateMachNumberSteps> | null>(null);
  const [inputVSI, setInputVSI] = useState<number | null>(null);

  const handleVelUnitChange = (newUnit: VelUnit) => {
    const v = parseFloat(velocity);
    if (!isNaN(v)) setVelocity(fmt(v * toMS[velUnit] / toMS[newUnit], 5));
    setVelUnit(newUnit);
  };

  const handleTempUnitChange = (newUnit: TempUnit) => {
    const t = parseFloat(temperature);
    if (!isNaN(t)) setTemperature(fmt(fromK(toK(t, tempUnit), newUnit), 5));
    setTempUnit(newUnit);
  };

  const handleClear = () => {
    setVelocity("");
    setVelUnit("km/h");
    setTemperature("");
    setTempUnit("°C");
    setGamma("");
    setGasConstant("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const vRaw   = parseFloat(velocity);
    const tRaw   = parseFloat(temperature);
    const gVal   = parseFloat(gamma);
    const rVal   = parseFloat(gasConstant);

    if (isNaN(vRaw) || vRaw < 0)   newErrors.velocity    = "Must be non-negative";
    if (isNaN(tRaw))                newErrors.temperature = "Must be a number";
    if (isNaN(gVal) || gVal <= 1)   newErrors.gamma       = "Must be > 1";
    if (isNaN(rVal) || rVal <= 0)   newErrors.gasConstant = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const vSI = vRaw * toMS[velUnit];
    const tSI = toK(tRaw, tempUnit);

    if (tSI <= 0) { setErrors({ temperature: "Temperature must be above absolute zero" }); return; }

    try {
      const input = { velocity: vSI, temperature: tSI, gamma: gVal, gasConstant: rVal };
      const calc  = calculateMachNumber(input);
      const stp   = generateMachNumberSteps(input, calc);
      setResult(calc);
      setSteps(stp);
      setInputVSI(vSI);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const regimeBg = (regime?: string) => {
    switch (regime) {
      case "incompressible": return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      case "subsonic":       return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
      case "transonic":      return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
      case "supersonic":     return "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
      case "hypersonic":     return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      default:               return "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600";
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Mach Number Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Ratio of flow velocity to local speed of sound. Determines compressibility regime
          from incompressible to hypersonic.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Compressible Flow
        </span>
      </div>

      {/* Gas presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Gas presets — click to auto-fill γ and R
        </h2>
        <div className="flex flex-wrap gap-2">
          {GAS_PRESETS.map((p) => (
            <button key={p.label}
              onClick={() => { setGamma(p.gamma); setGasConstant(p.R); }}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
              {p.label} (γ = {p.gamma}, R = {p.R})
            </button>
          ))}
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Velocity */}
          <div>
            <InputField label="Flow velocity" symbol="V" unit={velUnit}
              value={velocity} onChange={setVelocity}
              placeholder={velUnit === "m/s" ? "250" : velUnit === "km/h" ? "900" : velUnit === "knots" ? "486" : "820"}
              error={errors.velocity} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m/s", "km/h", "knots", "ft/s"] as VelUnit[]).map(u => (
                <Btn key={u} label={u} active={velUnit === u} onClick={() => handleVelUnitChange(u)} />
              ))}
            </div>
          </div>

          {/* Temperature */}
          <div>
            <InputField label="Static temperature" symbol="T" unit={tempUnit}
              value={temperature} onChange={setTemperature}
              placeholder={tempUnit === "K" ? "288" : tempUnit === "°C" ? "15" : "59"}
              error={errors.temperature} />
            <div className="flex gap-2 -mt-2">
              {(["K", "°C", "°F"] as TempUnit[]).map(u => (
                <Btn key={u} label={u} active={tempUnit === u} onClick={() => handleTempUnitChange(u)} />
              ))}
            </div>
          </div>

          {/* γ */}
          <div>
            <InputField label="Specific heat ratio" symbol="γ" unit="dimensionless"
              value={gamma} onChange={setGamma} error={errors.gamma} />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
              Air at moderate T: γ = 1.4 · High-T air: γ → 1.3
            </p>
          </div>

          {/* R */}
          <div>
            <InputField label="Specific gas constant" symbol="R" unit="J/(kg·K)"
              value={gasConstant} onChange={setGasConstant} error={errors.gasConstant} />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
              R = R<sub>u</sub> / M<sub>mol</sub> · Air: 287 J/(kg·K)
            </p>
          </div>
        </div>

        {errors.general && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.general}</p>
        )}
        <button onClick={handleCalculate}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors">
          Calculate
        </button>
        <ClearButton onClear={handleClear} />
      </Card>

      {/* Results */}
      {result && steps && inputVSI !== null && (() => {
        const regime = result.regime.charAt(0).toUpperCase() + result.regime.slice(1);
        const cUnits: [string, number][] = [
          ["m/s",   result.speedOfSound],
          ["km/h",  result.speedOfSound * 3.6],
          ["knots", result.speedOfSound / 0.514444],
          ["ft/s",  result.speedOfSound / 0.3048],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Mach number  M = V / c
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  M = {fmt(result.machNumber, 5)}
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  c = {fmt(result.speedOfSound, 5)} m/s
                </p>
              </div>

              {/* Speed of sound unit grid */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Speed of sound in other units
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {cUnits.map(([unit, value]) => (
                    <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                      <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related quantities */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Related quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {([
                    { label: <>Velocity  V</>,                   value: `${fmt(inputVSI * 3.6, 5)} km/h`            },
                    { label: <>Stag. temp ratio  T₀/T</>,        value: fmt(result.stagnationTempRatio, 5)           },
                    { label: <>Stag. temperature  T₀</>,         value: `${fmt(result.stagnationTemp, 5)} K`         },
                  ] as { label: React.ReactNode; value: string }[]).map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Regime banner */}
              <div className={`p-4 rounded-lg border ${regimeBg(result.regime)}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  Flow Regime: {regime}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.machNumber} />
              <CommonMistakes mistakes={commonMistakes.machNumber} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Speed of sound and Mach number:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>c = √(γ × R × T)&nbsp;&nbsp;&nbsp;&nbsp;[m/s]</div>
              <div>M = V / c&nbsp;&nbsp;&nbsp;&nbsp;[dimensionless]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Stagnation (total) temperature:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>T₀/T = 1 + (γ − 1)/2 × M²</div>
              <div>T₀ = T × [1 + (γ − 1)/2 × M²]&nbsp;&nbsp;&nbsp;&nbsp;[K]</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              T₀ is the temperature a fluid parcel would reach if brought isentropically to rest.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Flow regime classification:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Regime</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Mach range</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ["Incompressible", "M < 0.3",       "ρ change < 5%, incompressible eqs. valid"],
                  ["Subsonic",       "0.3 – 0.8",     "Compressibility significant, no shocks"],
                  ["Transonic",      "0.8 – 1.2",     "Mixed sub/supersonic regions, shocks form"],
                  ["Supersonic",     "1.2 – 5",       "Oblique shocks, Mach cone"],
                  ["Hypersonic",     "M > 5",         "Aero-heating, real-gas effects"],
                ].map(([r, m, n]) => (
                  <tr key={r}>
                    <td className="py-1.5 pr-4 font-medium">{r}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{m}</td>
                    <td className="py-1.5 text-xs">{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Common gas properties (at moderate temperature):</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Gas</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">γ</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">R (J/kg·K)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {GAS_PRESETS.map(({ label, gamma, R }) => (
                  <tr key={label}>
                    <td className="py-1.5 pr-4">{label}</td>
                    <td className="py-1.5 pr-4 font-mono">{gamma}</td>
                    <td className="py-1.5 font-mono">{R}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>M = Mach number (dimensionless)</li>
              <li>V = flow velocity [m/s]</li>
              <li>c = local speed of sound [m/s]</li>
              <li>γ = ratio of specific heats (C<sub>p</sub>/C<sub>v</sub>)</li>
              <li>R = specific gas constant [J/(kg·K)]</li>
              <li>T = static (local) temperature [K]</li>
              <li>T₀ = stagnation (total) temperature [K]</li>
            </ul>
          </div>
        </div>
      </Card>

      <References refs={REFS_MACH_NUMBER} />
    </div>
  );
}
