"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_PITOT_TUBE } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculatePitotTube,
  generatePitotTubeSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type PressUnit   = "Pa" | "kPa" | "mbar" | "bar" | "psi" | "mmHg" | "inHg" | "inH₂O";
type DensityUnit = "kg/m³" | "g/cm³" | "kg/L" | "lb/ft³" | "slug/ft³";

const toPa: Record<PressUnit, number> = {
  Pa: 1, kPa: 1000, mbar: 100, bar: 1e5, psi: 6894.76,
  mmHg: 133.322, inHg: 3386.39, "inH₂O": 249.089,
};

const toDensitySI = (v: number, u: DensityUnit): number => {
  if (u === "g/cm³" || u === "kg/L") return v * 1000;
  if (u === "lb/ft³")   return v * 16.01846;
  if (u === "slug/ft³") return v * 515.379;
  return v;
};
const fromDensitySI = (v: number, u: DensityUnit): number => {
  if (u === "g/cm³" || u === "kg/L") return v / 1000;
  if (u === "lb/ft³")   return v / 16.01846;
  if (u === "slug/ft³") return v / 515.379;
  return v;
};

// ── Fluid presets (densities in kg/m³) ───────────────────────────────────────
const FLUID_PRESETS = [
  { label: "Air — sea level (ISA)", rhoSI: 1.225 },
  { label: "Air — 1 000 m",        rhoSI: 1.112 },
  { label: "Air — 3 000 m",        rhoSI: 0.909 },
  { label: "Air — 10 000 m",       rhoSI: 0.414 },
  { label: "Water at 20°C",        rhoSI: 998   },
  { label: "Seawater",             rhoSI: 1025  },
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

export default function PitotTubeCalculator() {
  const [dP,          setDP]          = useState("100");
  const [dPUnit,      setDPUnit]      = useState<PressUnit>("Pa");
  const [density,     setDensity]     = useState("1.225");
  const [densityUnit, setDensityUnit] = useState<DensityUnit>("kg/m³");
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [result,   setResult]   = useState<ReturnType<typeof calculatePitotTube> | null>(null);
  const [steps,    setSteps]    = useState<ReturnType<typeof generatePitotTubeSteps> | null>(null);
  const [dPSI,     setDPSI]     = useState<number | null>(null);

  const handleClear = () => {
    setDP("");
    setDPUnit("Pa");
    setDensity("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const dPval  = parseFloat(dP);
    const rhoVal = parseFloat(density);

    if (isNaN(dPval)  || dPval  <= 0) newErrors.dP      = "Must be a positive number";
    if (isNaN(rhoVal) || rhoVal <= 0) newErrors.density  = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    const dPPa  = dPval * toPa[dPUnit];
    const rhoSI = toDensitySI(rhoVal, densityUnit);

    try {
      const input = { pressureDifference: dPPa, density: rhoSI };
      const calc  = calculatePitotTube(input);
      const stp   = generatePitotTubeSteps(input, calc);
      setResult(calc);
      setSteps(stp);
      setDPSI(dPPa);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Pitot Tube Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Calculate flow velocity from the stagnation–static pressure difference measured by a Pitot-static tube.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Mechanics I
        </span>
      </div>

      {/* Fluid presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Common fluids — click to auto-fill density
        </h2>
        <div className="flex flex-wrap gap-2">
          {FLUID_PRESETS.map((p) => (
            <button key={p.label}
              onClick={() => setDensity(
                parseFloat(fromDensitySI(p.rhoSI, densityUnit).toPrecision(5)).toString()
              )}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ΔP with unit selector */}
          <div>
            <InputField
              label="Stagnation minus static pressure" symbol="ΔP" unit={dPUnit}
              value={dP} onChange={setDP} error={errors.dP}
            />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["Pa","kPa","mbar","bar","psi","mmHg","inHg","inH₂O"] as PressUnit[]).map(u => (
                <Btn key={u} label={u} active={dPUnit === u} onClick={() => setDPUnit(u)} />
              ))}
            </div>
          </div>

          {/* Fluid density */}
          <div>
            <InputField
              label="Fluid density" symbol="ρ" unit={densityUnit}
              value={density} onChange={setDensity} error={errors.density}
            />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["kg/m³","g/cm³","kg/L","lb/ft³","slug/ft³"] as DensityUnit[]).map(u => (
                <Btn key={u} label={u} active={densityUnit === u} onClick={() => setDensityUnit(u)} />
              ))}
            </div>
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

      {result && steps && dPSI !== null && (() => {
        const V = result.velocity;
        const q = dPSI; // dynamic pressure = ΔP (Pa)

        const velUnits: [string, number][] = [
          ["m/s",   V],
          ["ft/s",  V * 3.28084],
          ["km/h",  V * 3.6],
          ["knots", V * 1.94384],
          ["mph",   V * 2.23694],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Flow velocity  V = √(2ΔP / ρ)
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {fmt(V, 6)} m/s
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  {fmt(V * 1.94384, 5)} knots · {fmt(V * 3.6, 5)} km/h
                </p>
              </div>

              {/* Velocity unit grid */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Velocity in other units
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {velUnits.map(([unit, value]) => (
                    <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                      <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic pressure breakdown */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Pressure components
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "Dynamic q = ΔP", value: `${fmt(q)} Pa` },
                    { label: "= ½ρV²",          value: `${fmt(0.5 * toDensitySI(parseFloat(density), densityUnit) * V ** 2, 5)} Pa` },
                    { label: "q in kPa",         value: `${fmt(q / 1000, 4)} kPa` },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.pitotTube} />
              <CommonMistakes mistakes={commonMistakes.pitotTube} />
            </div>
          </ResultsCard>
        );
      })()}

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Main equation:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              V = √(2ΔP / ρ)
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>ΔP = P<sub>stagnation</sub> − P<sub>static</sub> = dynamic pressure q [Pa]</li>
              <li>ρ = fluid density [kg/m³]</li>
              <li>q = ½ρV² → dynamic pressure from Bernoulli</li>
            </ul>
          </div>
          <p>
            A Pitot-static tube measures stagnation pressure at the forward-facing port and static
            pressure at the side ports. Their difference is the dynamic pressure q = ½ρV², from
            which velocity is recovered. Valid for incompressible flow (Ma &lt; 0.3). At higher
            Mach numbers a compressibility correction is needed.
          </p>
        </div>
      </Card>

      <References refs={REFS_PITOT_TUBE} />
    </div>
  );
}
