"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { References } from "@/components/References";
import { REFS_PIPE_FLOW_RATE } from "@/lib/references";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculatePipeFlowRate,
  generatePipeFlowRateSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

// ── Unit types ────────────────────────────────────────────────────────────────
type VelocityUnit = "m/s" | "cm/s" | "ft/s" | "km/h" | "mph";
type DiameterUnit = "m" | "mm" | "cm" | "inch" | "ft";

// ── Conversions to SI ─────────────────────────────────────────────────────────
const toVelocitySI = (v: number, u: VelocityUnit): number => {
  if (u === "cm/s")  return v / 100;
  if (u === "ft/s")  return v * 0.3048;
  if (u === "km/h")  return v / 3.6;
  if (u === "mph")   return v * 0.44704;
  return v;
};

const toDiameterSI = (v: number, u: DiameterUnit): number => {
  if (u === "mm")   return v / 1000;
  if (u === "cm")   return v / 100;
  if (u === "inch") return v * 0.0254;
  if (u === "ft")   return v * 0.3048;
  return v;
};

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
export default function PipeFlowRateCalculator() {
  const [velocity,     setVelocity]     = useState("1");
  const [velocityUnit, setVelocityUnit] = useState<VelocityUnit>("m/s");

  const [diameter,     setDiameter]     = useState("0.1");
  const [diameterUnit, setDiameterUnit] = useState<DiameterUnit>("m");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculatePipeFlowRate> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generatePipeFlowRateSteps> | null>(null);

  const handleClear = () => {
    setVelocity(""); setDiameter("");
    setResult(null); setSteps(null); setErrors({});
  };

  const handleCalculate = () => {
    const errs: Record<string, string> = {};
    const vNum = parseFloat(velocity);
    const dNum = parseFloat(diameter);

    if (isNaN(vNum) || vNum < 0)  errs.velocity = "Velocity must be non-negative";
    if (isNaN(dNum) || dNum <= 0) errs.diameter = "Diameter must be positive";

    setErrors(errs);
    if (Object.keys(errs).length) { setResult(null); setSteps(null); return; }

    try {
      const vSI = toVelocitySI(vNum, velocityUnit);
      const dSI = toDiameterSI(dNum, diameterUnit);

      const calcResult = calculatePipeFlowRate({ velocity: vSI, diameter: dSI });
      const calcSteps  = generatePipeFlowRateSteps({ velocity: vSI, diameter: dSI }, calcResult);
      setResult(calcResult);
      setSteps(calcSteps);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const velPh = (u: VelocityUnit) =>
    u === "m/s" ? "1" : u === "cm/s" ? "100" : u === "ft/s" ? "3.28" : u === "km/h" ? "3.6" : "2.24";
  const dPh = (u: DiameterUnit) =>
    u === "m" ? "0.1" : u === "mm" ? "100" : u === "cm" ? "10" : u === "inch" ? "4" : "0.33";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Pipe Flow Rate Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Calculate volumetric flow rate in a pipe given velocity and cross-sectional area.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Mechanics I
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Velocity */}
          <div>
            <InputField
              label="Velocity" symbol="V" unit={velocityUnit}
              value={velocity} onChange={setVelocity}
              placeholder={velPh(velocityUnit)} error={errors.velocity}
            />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m/s", "cm/s", "ft/s", "km/h", "mph"] as VelocityUnit[]).map(u => (
                <Btn key={u} label={u} active={velocityUnit === u} onClick={() => setVelocityUnit(u)} />
              ))}
            </div>
          </div>

          {/* Diameter */}
          <div>
            <InputField
              label="Diameter" symbol="D" unit={diameterUnit}
              value={diameter} onChange={setDiameter}
              placeholder={dPh(diameterUnit)} error={errors.diameter}
            />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m", "mm", "cm", "inch", "ft"] as DiameterUnit[]).map(u => (
                <Btn key={u} label={u} active={diameterUnit === u} onClick={() => setDiameterUnit(u)} />
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
        const Q = result.flowRate;
        const A = result.area;

        const flowUnits: [string, number][] = [
          ["m³/s",    Q],
          ["L/s",     Q * 1000],
          ["L/min",   Q * 60000],
          ["m³/h",    Q * 3600],
          ["ft³/s",   Q / 0.028317],
          ["ft³/min", Q / 0.028317 * 60],
          ["gal/min", Q * 264.172],
          ["Imp gal/min", Q * 219.969],
        ];

        const areaUnits: [string, number][] = [
          ["m²",   A],
          ["cm²",  A * 1e4],
          ["mm²",  A * 1e6],
          ["ft²",  A / 0.092903],
          ["in²",  A / 6.4516e-4],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary result */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Volumetric flow rate
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {fmt(Q, 6)} m³/s
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  {fmt(Q * 1000, 6)} L/s &nbsp;·&nbsp; {fmt(Q * 60000, 6)} L/min
                </p>
              </div>

              {/* Flow rate conversions */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Flow rate in other units
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {flowUnits.map(([unit, value]) => (
                    <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                      <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cross-sectional area */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Cross-sectional area
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {areaUnits.map(([unit, value]) => (
                    <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                      <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.pipeFlowRate} />
              <CommonMistakes mistakes={commonMistakes.pipeFlowRate} />
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
              Q = A × V
            </div>
          </div>
          <p>
            The volumetric flow rate is the product of cross-sectional area and average velocity.
            For a circular pipe, A = π(D/2)².
          </p>
        </div>
      </Card>
      <References refs={REFS_PIPE_FLOW_RATE} />
    </div>
  );
}