"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_IDEAL_GAS_DENSITY } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateIdealGasDensity,
  generateIdealGasSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

// ── Unit types ────────────────────────────────────────────────────────────────
type PresUnit = "Pa" | "kPa" | "MPa" | "bar" | "psi" | "atm";
type TempUnit = "K" | "°C" | "°F";

const toPA: Record<PresUnit, number> = { Pa: 1, kPa: 1e3, MPa: 1e6, bar: 1e5, psi: 6894.76, atm: 101325 };
const toKelvin = (v: number, u: TempUnit): number => {
  if (u === "°C") return v + 273.15;
  if (u === "°F") return (v - 32) * 5 / 9 + 273.15;
  return v;
};

// ── Gas presets — R in J/(kg·K) ──────────────────────────────────────────────
const GAS_PRESETS = [
  { label: "Air",           R: 287.05,  M: 28.97, formula: "N₂+O₂+Ar" },
  { label: "Nitrogen N₂",  R: 296.80,  M: 28.01, formula: "N₂"        },
  { label: "Oxygen O₂",    R: 259.84,  M: 32.00, formula: "O₂"        },
  { label: "CO₂",          R: 188.92,  M: 44.01, formula: "CO₂"       },
  { label: "Hydrogen H₂",  R: 4124.2,  M: 2.016, formula: "H₂"        },
  { label: "Helium",        R: 2077.1,  M: 4.003, formula: "He"        },
  { label: "Methane CH₄",  R: 518.28,  M: 16.04, formula: "CH₄"       },
  { label: "Steam H₂O",    R: 461.52,  M: 18.02, formula: "H₂O"       },
] as const;

function fmt(n: number, sig = 5): string { return parseFloat(n.toPrecision(sig)).toString(); }

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

export default function IdealGasDensityCalculator() {
  const [pressure,  setPressure]  = useState("101.325");
  const [presUnit,  setPresUnit]  = useState<PresUnit>("kPa");
  const [temp,      setTemp]      = useState("20");
  const [tempUnit,  setTempUnit]  = useState<TempUnit>("°C");
  const [Rval,      setRval]      = useState("287.05");
  const [selGas,    setSelGas]    = useState("Air");

  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [result,  setResult]  = useState<ReturnType<typeof calculateIdealGasDensity> | null>(null);
  const [steps,   setSteps]   = useState<ReturnType<typeof generateIdealGasSteps> | null>(null);

  const applyGas = (gas: typeof GAS_PRESETS[number]) => {
    setRval(gas.R.toString());
    setSelGas(gas.label);
    setResult(null); setSteps(null); setErrors({});
  };

  const handleClear = () => {
    setPressure(""); setTemp(""); setRval("");
    setResult(null); setSteps(null); setErrors({});
  };

  const handleCalculate = () => {
    const errs: Record<string, string> = {};
    const pRaw = parseFloat(pressure);
    const tRaw = parseFloat(temp);
    const rRaw = parseFloat(Rval);

    if (isNaN(pRaw) || pRaw <= 0) errs.pressure = "Must be a positive number (absolute)";
    if (isNaN(tRaw))              errs.temp     = "Must be a number";
    if (isNaN(rRaw) || rRaw <= 0) errs.R        = "Must be a positive number";

    const T_K = toKelvin(tRaw, tempUnit);
    if (!isNaN(tRaw) && T_K <= 0) errs.temp = "Must be above absolute zero (0 K)";

    setErrors(errs);
    if (Object.keys(errs).length) { setResult(null); setSteps(null); return; }

    try {
      const pSI = pRaw * toPA[presUnit];
      const input = { pressure: pSI, temperature: T_K, R: rRaw };
      const r = calculateIdealGasDensity(input);
      const s = generateIdealGasSteps(input, r);
      setResult(r); setSteps(s);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const T_K_display = (() => {
    const v = parseFloat(temp);
    if (isNaN(v)) return null;
    return parseFloat(toKelvin(v, tempUnit).toPrecision(6));
  })();

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Ideal Gas Density
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Calculate gas density from pressure and temperature using{" "}
          <strong className="text-gray-800 dark:text-gray-200">ρ = P / (R T)</strong>.
          Select a gas preset or enter a custom specific gas constant R.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Properties &amp; Statics
        </span>
      </div>

      {/* Gas presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Gas — click to set R
        </h2>
        <div className="flex flex-wrap gap-2">
          {GAS_PRESETS.map(g => (
            <button key={g.label} onClick={() => applyGas(g)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                selGas === g.label
                  ? "bg-blue-100 dark:bg-blue-900/40 border-blue-400 text-blue-800 dark:text-blue-200"
                  : "bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              }`}>
              {g.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Pressure */}
          <div>
            <div className="flex gap-2 mb-3" aria-hidden="true"><span className="px-3 py-1 text-sm opacity-0 select-none">x</span></div>
            <InputField label="Absolute pressure" symbol="P" unit={presUnit}
              value={pressure} onChange={setPressure} placeholder="101.325" error={errors.pressure} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["Pa","kPa","MPa","bar","psi","atm"] as PresUnit[]).map(u => (
                <Btn key={u} label={u} active={presUnit === u} onClick={() => setPresUnit(u)} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Always use <strong>absolute</strong> pressure.</p>
          </div>

          {/* Temperature */}
          <div>
            <div className="flex gap-2 mb-3" aria-hidden="true"><span className="px-3 py-1 text-sm opacity-0 select-none">x</span></div>
            <InputField label="Temperature" symbol="T" unit={tempUnit}
              value={temp} onChange={setTemp} placeholder="20" error={errors.temp} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["K","°C","°F"] as TempUnit[]).map(u => (
                <Btn key={u} label={u} active={tempUnit === u} onClick={() => setTempUnit(u)} />
              ))}
            </div>
            {T_K_display !== null && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">= {T_K_display} K</p>
            )}
          </div>

          {/* Specific gas constant R */}
          <div>
            <div className="flex gap-2 mb-3" aria-hidden="true"><span className="px-3 py-1 text-sm opacity-0 select-none">x</span></div>
            <InputField label="Specific gas constant" symbol="R" unit="J/(kg·K)"
              value={Rval} onChange={(v) => { setRval(v); setSelGas("Custom"); }}
              placeholder="287.05" error={errors.R} />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              R = R<sub>u</sub> / M, where R<sub>u</sub> = 8.314 J/(mol·K) and M is molar mass in kg/mol.
            </p>
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
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Density  ρ = P / (R T)</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">ρ = {fmt(result.density)} kg/m³</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600">
                {[
                  { label: "ρ (kg/m³)",      value: fmt(result.density)          },
                  { label: "v = 1/ρ (m³/kg)", value: fmt(result.specificVolume)  },
                  { label: "Vₘ (m³/mol)",    value: fmt(result.molarVolume) },
                ].map(({ label, value }) => (
                  <div key={label} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.idealGasDensity} />
            <CommonMistakes mistakes={commonMistakes.idealGasDensity} />
          </div>
        </ResultsCard>
      )}

      {/* Reference */}
      <Card>
        <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Gas Properties Reference</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600">
                {["Gas","Formula","M (g/mol)","R (J/kg·K)","ρ at 20°C, 1 atm (kg/m³)"].map(h => (
                  <th key={h} className="text-left py-2 pr-4 font-semibold text-gray-900 dark:text-white">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
              {GAS_PRESETS.map(g => {
                const rho = 101325 / (g.R * 293.15);
                return (
                  <tr key={g.label}>
                    <td className="py-1.5 pr-4">{g.label}</td>
                    <td className="py-1.5 pr-4 font-mono">{g.formula}</td>
                    <td className="py-1.5 pr-4 font-mono">{g.M}</td>
                    <td className="py-1.5 pr-4 font-mono">{g.R}</td>
                    <td className="py-1.5 font-mono">{fmt(rho, 4)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Ideal gas law forms:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>PV = nR<sub>u</sub>T   →   ρ = PM / (R<sub>u</sub> T)   →   ρ = P / (R T)</div>
              <div>R = R<sub>u</sub> / M   where R<sub>u</sub> = 8.314 J/(mol·K), M = molar mass [kg/mol]</div>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">When ideal gas law breaks down:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Near the critical point (high pressure, low temperature)</li>
              <li>At very high pressures (P &gt; ~10 MPa for most gases)</li>
              <li>For polar molecules at moderate conditions (use van der Waals or Peng-Robinson)</li>
              <li>Compressibility factor Z = PV/(nR<sub>u</sub>T) ≈ 1 for ideal gas; use ρ = P/(ZRT) for real gas</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>P = absolute pressure [Pa]</li>
              <li>T = absolute temperature [K]</li>
              <li>R = specific gas constant = R<sub>u</sub> / M [J/(kg·K)]</li>
              <li>R<sub>u</sub> = 8.314 J/(mol·K) — universal gas constant</li>
              <li>M = molar mass [kg/mol]</li>
              <li>ρ = density [kg/m³]</li>
              <li>v = specific volume = 1/ρ [m³/kg]</li>
            </ul>
          </div>
        </div>
      </Card>

      <References refs={REFS_IDEAL_GAS_DENSITY} />
    </div>
  );
}
