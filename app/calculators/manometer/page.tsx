"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_MANOMETER } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateManometer,
  generateManometerSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

// ── Unit types ────────────────────────────────────────────────────────────────
type HeightUnit  = "m" | "mm" | "cm" | "inch" | "ft";
type DensityUnit = "kg/m³" | "g/cm³" | "kg/L";

// ── Conversions to SI ─────────────────────────────────────────────────────────
const toHeightSI = (v: number, u: HeightUnit): number => {
  if (u === "mm")   return v / 1000;
  if (u === "cm")   return v / 100;
  if (u === "inch") return v * 0.0254;
  if (u === "ft")   return v * 0.3048;
  return v;
};

const toDensitySI = (v: number, u: DensityUnit): number => {
  if (u === "g/cm³" || u === "kg/L") return v * 1000;
  return v;
};
const fromDensitySI = (v: number, u: DensityUnit): number => {
  if (u === "g/cm³" || u === "kg/L") return v / 1000;
  return v;
};

// ── Fluid presets (densities stored in kg/m³) ─────────────────────────────────
const FLUID_PRESETS = [
  { label: "Mercury",  rhoSI: 13600 },
  { label: "Water",    rhoSI: 1000  },
  { label: "Oil",      rhoSI: 850   },
  { label: "Ethanol",  rhoSI: 789   },
  { label: "Glycerin", rhoSI: 1261  },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number, sig = 4): string {
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

// ── Main component ────────────────────────────────────────────────────────────
export default function ManometerCalculator() {
  const [height,      setHeight]      = useState("0.1");
  const [heightUnit,  setHeightUnit]  = useState<HeightUnit>("m");

  const [density,     setDensity]     = useState("13600");
  const [densityUnit, setDensityUnit] = useState<DensityUnit>("kg/m³");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateManometer> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateManometerSteps> | null>(null);

  const handleClear = () => {
    setHeight(""); setDensity("");
    setResult(null); setSteps(null); setErrors({});
  };

  const handleCalculate = () => {
    const errs: Record<string, string> = {};
    const hNum   = parseFloat(height);
    const rhoNum = parseFloat(density);

    if (isNaN(hNum)   || hNum   <= 0) errs.height  = "Must be a positive number";
    if (isNaN(rhoNum) || rhoNum <= 0) errs.density = "Must be a positive number";

    setErrors(errs);
    if (Object.keys(errs).length) { setResult(null); setSteps(null); return; }

    try {
      const hSI   = toHeightSI(hNum, heightUnit);
      const rhoSI = toDensitySI(rhoNum, densityUnit);
      const input = { height: hSI, manometerFluidDensity: rhoSI };
      const res   = calculateManometer(input);
      setResult(res);
      setSteps(generateManometerSteps(input, res));
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const heightPh = (u: HeightUnit) =>
    u === "m" ? "0.1" : u === "mm" ? "100" : u === "cm" ? "10" : u === "inch" ? "4" : "0.33";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Manometer Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Calculate pressure difference from the fluid column height using ΔP = ρgh.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Mechanics I
        </span>
      </div>

      {/* Fluid presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Common manometer fluids — click to auto-fill density
        </h2>
        <div className="flex flex-wrap gap-2">
          {FLUID_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setDensity(
                parseFloat(fromDensitySI(p.rhoSI, densityUnit).toPrecision(5)).toString()
              )}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors"
            >
              {p.label} ({p.rhoSI} kg/m³)
            </button>
          ))}
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Height */}
          <div>
            <InputField
              label="Height difference" symbol="h" unit={heightUnit}
              value={height} onChange={setHeight}
              placeholder={heightPh(heightUnit)} error={errors.height}
            />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m", "mm", "cm", "inch", "ft"] as HeightUnit[]).map(u => (
                <Btn key={u} label={u} active={heightUnit === u} onClick={() => setHeightUnit(u)} />
              ))}
            </div>
          </div>

          {/* Density */}
          <div>
            <InputField
              label="Manometer fluid density" symbol="ρ" unit={densityUnit}
              value={density} onChange={setDensity}
              placeholder="13600" error={errors.density}
            />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["kg/m³", "g/cm³", "kg/L"] as DensityUnit[]).map(u => (
                <Btn key={u} label={u} active={densityUnit === u} onClick={() => setDensityUnit(u)} />
              ))}
            </div>
          </div>
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
      {result && steps && (() => {
        const dP = result.pressureDifference;

        const units: [string, number][] = [
          ["Pa",    dP],
          ["kPa",   dP / 1000],
          ["MPa",   dP / 1e6],
          ["bar",   dP / 1e5],
          ["mbar",  dP / 100],
          ["psi",   dP / 6894.76],
          ["mmHg",  dP / 133.322],
          ["inHg",  dP / 3386.39],
          ["cmH₂O", dP / 98.0665],
          ["mH₂O",  dP / 9806.65],
          ["atm",   dP / 101325],
          ["inH₂O", dP / 249.089],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary result */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Pressure difference  ΔP = ρgh
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {fmt(dP, 6)} Pa
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  {fmt(dP / 1000, 6)} kPa &nbsp;·&nbsp; {fmt(dP / 6894.76, 6)} psi
                </p>
              </div>

              {/* Unit conversions */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  ΔP in other units
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {units.map(([unit, value]) => (
                    <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                      <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.manometer} />
              <CommonMistakes mistakes={commonMistakes.manometer} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Main Equation:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              ΔP = ρgh
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>ΔP = pressure difference [Pa]</li>
              <li>ρ = manometer fluid density [kg/m³]</li>
              <li>g = 9.81 m/s²</li>
              <li>h = height difference of fluid columns [m]</li>
            </ul>
          </div>
          <p>
            Common manometer fluids: mercury (13 600 kg/m³) for high pressures, water (1 000 kg/m³)
            for low pressures. A higher-density fluid gives a smaller column height for the same ΔP,
            making the reading more compact.
          </p>
        </div>
      </Card>

      <References refs={REFS_MANOMETER} />
    </div>
  );
}
