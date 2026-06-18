"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_SUCTION_SPECIFIC_SPEED } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateSuctionSpecificSpeed,
  generateSuctionSpecificSpeedSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type FlowUnit = "m³/s" | "L/s" | "m³/h";
type NpshUnit = "m" | "ft";

const toM3s:  Record<FlowUnit, number> = { "m³/s": 1, "L/s": 0.001, "m³/h": 1 / 3600 };
const toNpshM: Record<NpshUnit, number> = { "m": 1, "ft": 0.3048 };

const SPEED_PRESETS = [750, 1000, 1450, 1500, 2900, 3000, 3600];

const PUMP_PRESETS = [
  { label: "Small centrifugal pump", speed: "1450", flow: "0.01",  npsh: "3",  note: "Q=10 L/s, H=20 m" },
  { label: "Medium process pump",    speed: "1450", flow: "0.05",  npsh: "5",  note: "Q=50 L/s" },
  { label: "Large water pump",       speed: "960",  flow: "0.2",   npsh: "6",  note: "Q=200 L/s" },
  { label: "High-speed condensate",  speed: "3000", flow: "0.005", npsh: "2",  note: "High Ωss risk" },
];

function fmt(n: number, sig = 4) { return parseFloat(n.toPrecision(sig)).toString(); }

const RISK_COLORS: Record<string, string> = {
  low:      "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
  moderate: "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200",
  high:     "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
};

export default function SuctionSpecificSpeedCalculator() {
  const [rotationalSpeed, setRotationalSpeed] = useState("1450");
  const [flowRate, setFlowRate]               = useState("0.05");
  const [flowUnit, setFlowUnit]               = useState<FlowUnit>("m³/s");
  const [npsh, setNpsh]                       = useState("5");
  const [npshUnit, setNpshUnit]               = useState<NpshUnit>("m");
  const [errors, setErrors]                   = useState<Record<string, string>>({});
  const [result, setResult]                   = useState<ReturnType<typeof calculateSuctionSpecificSpeed> | null>(null);
  const [steps, setSteps]                     = useState<ReturnType<typeof generateSuctionSpecificSpeedSteps> | null>(null);

  const flowM3s = parseFloat(flowRate) * toM3s[flowUnit];

  const validateInputs = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (isNaN(parseFloat(rotationalSpeed)) || parseFloat(rotationalSpeed) <= 0)
      newErrors.rotationalSpeed = "Speed must be positive (rpm)";
    if (isNaN(parseFloat(flowRate)) || parseFloat(flowRate) <= 0)
      newErrors.flowRate = `Flow rate must be positive (${flowUnit})`;
    if (isNaN(parseFloat(npsh)) || parseFloat(npsh) <= 0)
      newErrors.npsh = `NPSHᵣ must be positive (${npshUnit})`;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFlowUnitChange = (newUnit: FlowUnit) => {
    const q = parseFloat(flowRate);
    if (!isNaN(q)) setFlowRate(fmt(q * toM3s[flowUnit] / toM3s[newUnit], 5));
    setFlowUnit(newUnit);
  };
  const handleNpshUnitChange = (newUnit: NpshUnit) => {
    const v = parseFloat(npsh);
    if (!isNaN(v)) setNpsh(fmt(v * toNpshM[npshUnit] / toNpshM[newUnit], 6));
    setNpshUnit(newUnit);
  };

  const handleClear = () => {
    setRotationalSpeed("");
    setFlowRate("");
    setFlowUnit("m³/s");
    setNpsh("");
    setNpshUnit("m");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    if (!validateInputs()) { setResult(null); setSteps(null); return; }
    try {
      const input = {
        rotationalSpeed: parseFloat(rotationalSpeed),
        flowRate: flowM3s,
        npsh: parseFloat(npsh) * toNpshM[npshUnit],
      };
      const r = calculateSuctionSpecificSpeed(input);
      setResult(r);
      setSteps(generateSuctionSpecificSpeedSteps(input, r));
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "An error occurred" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Suction Specific Speed Calculator</h1>
        <p className="text-gray-600 dark:text-gray-400">Calculate dimensionless suction specific speed Ωss to assess cavitation susceptibility of a centrifugal pump.</p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded">Turbomachinery · Cavitation</span>
      </div>

      {/* Pump presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">Pump Presets</h2>
        <div className="flex flex-wrap gap-2">
          {PUMP_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                setRotationalSpeed(p.speed);
                setFlowRate(p.flow);
                setFlowUnit("m³/s");
                setNpsh(p.npsh);
              }}
              className="px-3 py-1.5 text-xs rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
              title={p.note}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Flow rate with unit toggle */}
          <div className="space-y-1">
            <InputField
              label="Volume flow rate"
              symbol="Q"
              unit={flowUnit}
              value={flowRate}
              onChange={setFlowRate}
              placeholder={flowUnit === "L/s" ? "50" : flowUnit === "m³/h" ? "180" : "0.05"}
              error={errors.flowRate}
            />
            <div className="flex gap-1 ml-1">
              {(["m³/s","L/s","m³/h"] as FlowUnit[]).map((u) => (
                <button key={u} onClick={() => handleFlowUnitChange(u)}
                  className={`px-2 py-0.5 text-xs rounded ${flowUnit === u ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}
                >{u}</button>
              ))}
            </div>
            {flowUnit !== "m³/s" && !isNaN(flowM3s) && (
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                = {flowM3s.toFixed(5)} m³/s
              </p>
            )}
          </div>

          {/* NPSH required */}
          <div className="space-y-1">
            <InputField
              label="Required"
              symbol="NPSHᵣ"
              unit={npshUnit}
              value={npsh}
              onChange={setNpsh}
              placeholder={npshUnit === "ft" ? "16" : "5"}
              error={errors.npsh}
            />
            <div className="flex gap-1 ml-1">
              {(["m", "ft"] as NpshUnit[]).map((u) => (
                <button key={u} onClick={() => handleNpshUnitChange(u)}
                  className={`px-2 py-0.5 text-xs rounded ${npshUnit === u ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}
                >{u}</button>
              ))}
            </div>
          </div>
        </div>

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
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Suction Specific Speed</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">Ωss = {result.sss.toFixed(4)}</p>
              <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded font-medium ${RISK_COLORS[result.riskLevel]}`}>
                {result.riskCategory}
              </span>
            </div>

            {/* Results grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">Ωss</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.sss.toFixed(4)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">dimensionless</p>
              </div>
              <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">Angular velocity ω</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.omega.toFixed(2)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">rad/s</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Risk level</p>
                <p className={`text-sm font-bold px-1 ${result.riskLevel === "low" ? "text-green-600" : result.riskLevel === "moderate" ? "text-yellow-600" : "text-red-600"}`}>
                  {result.riskLevel.charAt(0).toUpperCase() + result.riskLevel.slice(1)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">—</p>
              </div>
            </div>

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.suctionSpecificSpeed} />
            <CommonMistakes mistakes={commonMistakes.suctionSpecificSpeed} />
          </div>
        </ResultsCard>
      )}

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Formula</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>ω   = N × 2π / 60               [rad/s]</div>
              <div>Ωss = ω × √Q / (g × NPSHᵣ)^0.75  [dimensionless]</div>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Variables</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>N — rotational speed [rpm]</li>
              <li>ω — angular velocity [rad/s]</li>
              <li>Q — volume flow rate at BEP [m³/s]</li>
              <li>NPSHᵣ — required net positive suction head [m]</li>
              <li>g = 9.81 m/s²</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Cavitation Risk Thresholds (SI, dimensionless)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-600">
                    <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-left">Ωss range</th>
                    <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-left">Risk</th>
                    <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-left">Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["< 0.3",     "Low",     "Safe — standard NPSH margin adequate"],
                    ["0.3 – 0.5", "Moderate","Increase NPSHₐ or reduce speed"],
                    ["> 0.5",     "High",    "Redesign inlet geometry or reduce N"],
                  ].map(([r, risk, rec]) => (
                    <tr key={r}>
                      <td className="border border-gray-300 dark:border-gray-500 px-3 py-1 font-mono">{r}</td>
                      <td className="border border-gray-300 dark:border-gray-500 px-3 py-1">{risk}</td>
                      <td className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-gray-500 dark:text-gray-400">{rec}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">US customary (N in rpm, Q in US gpm, H in ft) gives Ωss values ~13× larger — thresholds differ accordingly (safe typically S &lt; 4).</p>
          </div>
          <p>Suction specific speed is analogous to specific speed but uses NPSHᵣ instead of head. It indicates the pump&apos;s suction performance independent of size. Lower Ωss values reflect a more cavitation-resistant design.</p>
        </div>
      </Card>

      <References refs={REFS_SUCTION_SPECIFIC_SPEED} />
    </div>
  );
}
