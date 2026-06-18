"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_PRESSURE_TYPES } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateVelocityHead,
  generateVelocityHeadSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type VelUnit     = "m/s" | "cm/s" | "ft/s" | "km/h" | "mph";
type DensityUnit = "kg/m³" | "g/cm³" | "kg/L" | "lb/ft³" | "slug/ft³";

const toVelSI: Record<VelUnit, number> = {
  "m/s": 1, "cm/s": 0.01, "ft/s": 0.3048, "km/h": 1 / 3.6, "mph": 0.44704,
};

const toDensitySI = (v: number, u: DensityUnit): number => {
  if (u === "g/cm³" || u === "kg/L") return v * 1000;
  if (u === "lb/ft³")   return v * 16.01846;
  if (u === "slug/ft³") return v * 515.379;
  return v;
};

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

export default function VelocityHeadCalculator() {
  const [velocity,     setVelocity]     = useState("5");
  const [velUnit,      setVelUnit]      = useState<VelUnit>("m/s");
  const [density,      setDensity]      = useState("");
  const [densityUnit,  setDensityUnit]  = useState<DensityUnit>("kg/m³");
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [result,       setResult]       = useState<ReturnType<typeof calculateVelocityHead> | null>(null);
  const [steps,        setSteps]        = useState<ReturnType<typeof generateVelocityHeadSteps> | null>(null);
  const [vSI,          setVSI]          = useState<number | null>(null);
  const [rhoSI,        setRhoSI]        = useState<number | null>(null);

  const handleClear = () => {
    setVelocity(""); setVelUnit("m/s");
    setDensity(""); setDensityUnit("kg/m³");
    setResult(null); setSteps(null); setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const vRaw   = parseFloat(velocity);
    const rhoRaw = density.trim() !== "" ? parseFloat(density) : undefined;

    if (isNaN(vRaw) || vRaw < 0)                         newErrors.velocity = "Must be non-negative";
    if (rhoRaw !== undefined && (isNaN(rhoRaw) || rhoRaw <= 0)) newErrors.density = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    const vMs      = vRaw * toVelSI[velUnit];
    const rhoSIval = rhoRaw !== undefined ? toDensitySI(rhoRaw, densityUnit) : undefined;

    try {
      const input = { velocity: vMs };
      const calc  = calculateVelocityHead(input);
      const stp   = generateVelocityHeadSteps(input, calc);
      setResult(calc);
      setSteps(stp);
      setVSI(vMs);
      setRhoSI(rhoSIval ?? null);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Velocity Head Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Kinetic energy per unit weight of flow — one of the three head terms in Bernoulli's equation.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Mechanics I
        </span>
      </div>

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Velocity + unit */}
          <div>
            <InputField
              label="Flow velocity" symbol="V" unit={velUnit}
              value={velocity} onChange={setVelocity} error={errors.velocity}
            />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m/s","cm/s","ft/s","km/h","mph"] as VelUnit[]).map(u => (
                <Btn key={u} label={u} active={velUnit === u} onClick={() => setVelUnit(u)} />
              ))}
            </div>
          </div>

          {/* Optional density */}
          <div>
            <InputField
              label="Fluid density (optional — for dynamic pressure)" symbol="ρ" unit={densityUnit}
              value={density} onChange={setDensity} error={errors.density}
            />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["kg/m³","g/cm³","kg/L","lb/ft³","slug/ft³"] as DensityUnit[]).map(u => (
                <Btn key={u} label={u} active={densityUnit === u} onClick={() => setDensityUnit(u)} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              If provided, dynamic pressure q = ½ρV² is also shown.
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

      {result && steps && vSI !== null && (() => {
        const hv = result.velocityHead;
        const g  = 9.81;
        const q  = rhoSI !== null ? 0.5 * rhoSI * vSI ** 2 : null;

        const headUnits: [string, number][] = [
          ["m",   hv],
          ["mm",  hv * 1000],
          ["cm",  hv * 100],
          ["ft",  hv * 3.28084],
          ["in",  hv * 39.3701],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Velocity head  hv = V² / (2g)
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {fmt(hv, 6)} m
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  {fmt(hv * 1000, 5)} mm · {fmt(hv * 3.28084, 5)} ft
                </p>
              </div>

              {/* Head unit grid */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Velocity head in other units
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {headUnits.map(([unit, value]) => (
                    <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                      <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bernoulli context */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Bernoulli energy terms (velocity head component)
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "Velocity  V",    value: `${fmt(vSI, 5)} m/s`  },
                    { label: "hv = V²/(2g)",   value: `${fmt(hv, 5)} m`     },
                    { label: "Check  √(2g·hv)",value: `${fmt(Math.sqrt(2 * g * hv), 5)} m/s` },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic pressure — only when density given */}
              {q !== null && rhoSI !== null && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Dynamic pressure  q = ½ρV²  (= ρg·hv)
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {([["Pa", q], ["kPa", q / 1000], ["mbar", q / 100], ["bar", q / 1e5], ["psi", q / 6894.76]] as [string, number][]).map(([unit, value]) => (
                      <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                        <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.velocityHead} />
              <CommonMistakes mistakes={commonMistakes.velocityHead} />
            </div>
          </ResultsCard>
        );
      })()}

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Velocity head:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              hv = V² / (2g)
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Bernoulli's equation (head form):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              P/(ρg) + V²/(2g) + z = constant
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Pressure head + velocity head + elevation head = total head [m]
            </p>
          </div>
          <div>
            <p className="font-semibold mb-2">Relationship to dynamic pressure:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              q = ½ρV² = ρg × hv
            </div>
          </div>
          <p>
            Velocity head is used extensively in pipe flow for minor loss calculations
            (ΔhL = K × hv, where K is the loss coefficient), and appears directly in
            Bernoulli's equation as the kinetic energy head.
          </p>
        </div>
      </Card>

      <References refs={REFS_PRESSURE_TYPES} />
    </div>
  );
}
