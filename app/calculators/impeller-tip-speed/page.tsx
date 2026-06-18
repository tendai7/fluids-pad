"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_IMPELLER_TIP_SPEED } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateImpellerTipSpeed,
  generateImpellerTipSpeedSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type DiameterUnit = "m" | "cm" | "mm" | "in";

const DIAMETER_TO_M: Record<DiameterUnit, number> = { m: 1, cm: 0.01, mm: 0.001, in: 0.0254 };

const SPEED_PRESETS = [750, 960, 1000, 1450, 1500, 2900, 3000, 3600];

function fmt(n: number, sig = 4) { return parseFloat(n.toPrecision(sig)).toString(); }

const CATEGORY_COLORS: Record<string, string> = {
  "Very High (>150 m/s)":   "bg-red-100    dark:bg-red-900    text-red-800    dark:text-red-200",
  "High (80–150 m/s)":      "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200",
  "Medium (50–80 m/s)":     "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200",
  "Low-medium (30–50 m/s)": "bg-blue-100   dark:bg-blue-900   text-blue-800   dark:text-blue-200",
  "Low (<30 m/s)":          "bg-green-100  dark:bg-green-900  text-green-800  dark:text-green-200",
};

export default function ImpellerTipSpeedCalculator() {
  const [diameter, setDiameter]           = useState("0.3");
  const [diamUnit, setDiamUnit]           = useState<DiameterUnit>("m");
  const [rotationalSpeed, setRotationalSpeed] = useState("1450");
  const [errors, setErrors]               = useState<Record<string, string>>({});
  const [result, setResult]               = useState<ReturnType<typeof calculateImpellerTipSpeed> | null>(null);
  const [steps, setSteps]                 = useState<ReturnType<typeof generateImpellerTipSpeedSteps> | null>(null);

  const diamM = parseFloat(diameter) * DIAMETER_TO_M[diamUnit];

  const validateInputs = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (isNaN(parseFloat(diameter)) || parseFloat(diameter) <= 0)
      newErrors.diameter = `Diameter must be positive (${diamUnit})`;
    if (isNaN(parseFloat(rotationalSpeed)) || parseFloat(rotationalSpeed) <= 0)
      newErrors.rotationalSpeed = "Rotational speed must be positive (rpm)";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDiamUnitChange = (newUnit: DiameterUnit) => {
    const d = parseFloat(diameter);
    if (!isNaN(d)) setDiameter(fmt(d * DIAMETER_TO_M[diamUnit] / DIAMETER_TO_M[newUnit], 5));
    setDiamUnit(newUnit);
  };

  const handleClear = () => {
    setDiameter("");
    setDiamUnit("m");
    setRotationalSpeed("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    if (!validateInputs()) { setResult(null); setSteps(null); return; }
    try {
      const input = { diameter: diamM, rotationalSpeed: parseFloat(rotationalSpeed) };
      const r = calculateImpellerTipSpeed(input);
      setResult(r);
      setSteps(generateImpellerTipSpeedSteps(input, r));
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "An error occurred" });
      setResult(null); setSteps(null);
    }
  };

  const catColor = result ? (CATEGORY_COLORS[result.speedCategory] ?? "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200") : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Impeller Tip Speed Calculator</h1>
        <p className="text-gray-600 dark:text-gray-400">Calculate peripheral tip speed and angular velocity for a rotating impeller or fan blade.</p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded">Turbomachinery · Kinematics</span>
      </div>

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Diameter with unit toggle */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <InputField
                  label="Impeller diameter"
                  symbol="D"
                  unit={diamUnit}
                  value={diameter}
                  onChange={setDiameter}
                  placeholder={diamUnit === "mm" ? "300" : diamUnit === "cm" ? "30" : diamUnit === "in" ? "12" : "0.3"}
                  error={errors.diameter}
                />
              </div>
            </div>
            <div className="flex gap-1 ml-1">
              {(["m","cm","mm","in"] as DiameterUnit[]).map((u) => (
                <button key={u} onClick={() => handleDiamUnitChange(u)}
                  className={`px-2 py-0.5 text-xs rounded ${diamUnit === u ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}
                >{u}</button>
              ))}
            </div>
          </div>

          {/* Rotational speed */}
          <div className="space-y-1">
            <InputField
              label="Rotational speed"
              symbol="N"
              unit="rpm"
              value={rotationalSpeed}
              onChange={setRotationalSpeed}
              error={errors.rotationalSpeed}
            />
            <div className="flex flex-wrap gap-1 ml-1">
              {SPEED_PRESETS.map((s) => (
                <button key={s} onClick={() => setRotationalSpeed(String(s))}
                  className={`px-2 py-0.5 text-xs rounded ${rotationalSpeed === String(s) ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}
                >{s}</button>
              ))}
            </div>
          </div>
        </div>

        {diamUnit !== "m" && !isNaN(diamM) && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            D = {diameter} {diamUnit} = {diamM.toFixed(4)} m
          </p>
        )}

        {errors.general && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.general}</p>}
        <button onClick={handleCalculate} className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors">
          Calculate
        </button>
        <ClearButton onClear={handleClear} />
      </Card>

      {result && steps && (
        <ResultsCard>
          <div className="space-y-4">
            {/* Primary result */}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tip Speed</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">u₂ = {result.tipSpeed.toFixed(2)} m/s</p>
              <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded font-medium ${catColor}`}>
                {result.speedCategory}
              </span>
            </div>

            {/* Results grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">Tip speed u₂</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.tipSpeed.toFixed(2)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">m/s</p>
              </div>
              <div className="text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">Angular velocity ω</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.angularVelocity.toFixed(2)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">rad/s</p>
              </div>
              <div className="text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">Centrifugal head hc</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.centrifugalHead.toFixed(2)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">m</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Euler head Hₑ</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.eulerHead.toFixed(2)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">m</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">{result.interpretation}</p>

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.impellerTipSpeed} />
            <CommonMistakes mistakes={commonMistakes.impellerTipSpeed} />
          </div>
        </ResultsCard>
      )}

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Key Formulas</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>ω  = N × 2π / 60       [rad/s]</div>
              <div>u₂ = ω × D / 2         [m/s]</div>
              <div>hc = u₂² / (2g)        [m]  — centrifugal head</div>
              <div>Hₑ = u₂² / g           [m]  — theoretical Euler head</div>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Variables</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>N — rotational speed [rpm]</li>
              <li>ω — angular velocity [rad/s]</li>
              <li>D — impeller outer diameter [m]</li>
              <li>u₂ — peripheral velocity at impeller tip [m/s]</li>
              <li>hc — centrifugal pressure head equivalent [m]</li>
              <li>Hₑ — ideal Euler head (zero pre-whirl assumption) [m]</li>
              <li>g = 9.81 m/s²</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Material Speed Limits</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-600">
                    <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-left">Material</th>
                    <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-right">Max u₂ (m/s)</th>
                    <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Cast iron",        "~40",  "Low-cost; brittle at high speed"],
                    ["Bronze / brass",   "~50",  "Good corrosion resistance"],
                    ["Stainless steel",  "~80",  "Standard for water pumps"],
                    ["Carbon steel",     "~100", "High-head applications"],
                    ["Titanium alloy",   "~150", "Aerospace / high-performance"],
                  ].map(([mat, spd, note]) => (
                    <tr key={mat}>
                      <td className="border border-gray-300 dark:border-gray-500 px-3 py-1">{mat}</td>
                      <td className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-right font-mono">{spd}</td>
                      <td className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-gray-500 dark:text-gray-400">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p>Tip speed u₂ is the principal design variable for centrifugal pumps and fans. The achievable head scales with u₂² — doubling tip speed quadruples the theoretical maximum head. Noise and vibration increase sharply above ~50 m/s.</p>
        </div>
      </Card>

      <References refs={REFS_IMPELLER_TIP_SPEED} />
    </div>
  );
}
