"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_ENERGY_LOSS } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateEnergyLoss,
  generateEnergyLossSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type HeadUnit = "m" | "ft";
type FlowUnit = "m³/s" | "L/s" | "L/min" | "m³/h";
type DensUnit = "kg/m³" | "g/cm³";

const toHm:   Record<HeadUnit, number> = { m: 1, ft: 0.3048 };
const toM3S:  Record<FlowUnit, number> = { "m³/s": 1, "L/s": 1e-3, "L/min": 1/60000, "m³/h": 1/3600 };
const toKgM3: Record<DensUnit, number> = { "kg/m³": 1, "g/cm³": 1000 };

const FLUID_PRESETS = [
  { label: "Water at 20°C",  density: "998"   },
  { label: "Water at 60°C",  density: "983"   },
  { label: "Seawater",       density: "1025"  },
  { label: "Engine oil",     density: "880"   },
  { label: "Air at 20°C",    density: "1.204" },
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

export default function EnergyLossCalculator() {
  const [headLoss,  setHeadLoss]  = useState("5");
  const [headUnit,  setHeadUnit]  = useState<HeadUnit>("m");
  const [flowRate,  setFlowRate]  = useState("10");
  const [flowUnit,  setFlowUnit]  = useState<FlowUnit>("L/s");
  const [density,   setDensity]   = useState("998");
  const [densUnit,  setDensUnit]  = useState<DensUnit>("kg/m³");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateEnergyLoss> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateEnergyLossSteps> | null>(null);

  const handleClear = () => {
    setHeadLoss("");
    setHeadUnit("m");
    setFlowRate("");
    setFlowUnit("L/s");
    setDensity("");
    setDensUnit("kg/m³");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const hRaw   = parseFloat(headLoss);
    const qRaw   = parseFloat(flowRate);
    const rhoRaw = parseFloat(density);

    if (isNaN(hRaw)   || hRaw   <= 0) newErrors.headLoss = "Must be a positive number";
    if (isNaN(qRaw)   || qRaw   <= 0) newErrors.flowRate = "Must be a positive number";
    if (isNaN(rhoRaw) || rhoRaw <= 0) newErrors.density  = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const hSI   = hRaw   * toHm[headUnit];
    const qSI   = qRaw   * toM3S[flowUnit];
    const rhoSI = rhoRaw * toKgM3[densUnit];

    try {
      const input = { headLoss: hSI, flowRate: qSI, density: rhoSI };
      const calc  = calculateEnergyLoss(input);
      const stp   = generateEnergyLossSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Energy Loss Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Hydraulic power dissipated by head loss: P<sub>loss</sub> = ρgQh<sub>f</sub>.
          Also computes specific energy loss and pressure equivalent.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Mechanics II
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
              onClick={() => { setDensity(p.density); setDensUnit("kg/m³"); }}
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

          {/* Head loss */}
          <div>
            <InputField label="Head loss" symbol="hf" unit={headUnit}
              value={headLoss} onChange={setHeadLoss}
              placeholder={headUnit === "m" ? "5" : "16.4"}
              error={errors.headLoss} />
            <div className="flex gap-2 -mt-2">
              {(["m", "ft"] as HeadUnit[]).map(u => (
                <Btn key={u} label={u} active={headUnit === u} onClick={() => {
                  const si = parseFloat(headLoss) * toHm[headUnit];
                  setHeadUnit(u);
                  if (!isNaN(si)) setHeadLoss(fmt(si / toHm[u]));
                }} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Total head loss — include both major (friction) and minor losses.
            </p>
          </div>

          {/* Flow rate */}
          <div>
            <InputField label="Volumetric flow rate" symbol="Q" unit={flowUnit}
              value={flowRate} onChange={setFlowRate}
              placeholder={flowUnit === "m³/s" ? "0.01" : flowUnit === "L/s" ? "10" : flowUnit === "L/min" ? "600" : "36"}
              error={errors.flowRate} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m³/s", "L/s", "L/min", "m³/h"] as FlowUnit[]).map(u => (
                <Btn key={u} label={u} active={flowUnit === u} onClick={() => {
                  const si = parseFloat(flowRate) * toM3S[flowUnit];
                  setFlowUnit(u);
                  if (!isNaN(si)) setFlowRate(fmt(si / toM3S[u]));
                }} />
              ))}
            </div>
          </div>

          {/* Density */}
          <div>
            <InputField label="Fluid density" symbol="ρ" unit={densUnit}
              value={density} onChange={setDensity}
              placeholder={densUnit === "kg/m³" ? "998" : "0.998"}
              error={errors.density} />
            <div className="flex gap-2 -mt-2">
              {(["kg/m³", "g/cm³"] as DensUnit[]).map(u => (
                <Btn key={u} label={u} active={densUnit === u} onClick={() => {
                  const si = parseFloat(density) * toKgM3[densUnit];
                  setDensUnit(u);
                  if (!isNaN(si)) setDensity(fmt(si / toKgM3[u]));
                }} />
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

      {/* Results */}
      {result && steps && (() => {
        const P = result.powerLoss;
        const pUnits: [string, number][] = [
          ["W",     P],
          ["kW",    P / 1000],
          ["hp",    P / 745.7],
          ["BTU/h", P * 3.41214],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary — power loss */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Hydraulic power loss  P<sub>loss</sub> = ρgQh<sub>f</sub>
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {fmt(P / 1000, 5)} kW
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  {fmt(P / 745.7, 4)} hp
                </p>
              </div>

              {/* Unit grid */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Power loss in other units
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {pUnits.map(([unit, value]) => (
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
                  Energy forms
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {([
                    { label: <>Specific energy e = gh<sub>f</sub> (J/kg)</>,    value: fmt(result.specificEnergyLoss, 5) },
                    { label: <>Pressure equiv. ΔP = ρgh<sub>f</sub> (kPa)</>,  value: fmt(result.pressureEquiv / 1000, 4) },
                    { label: <>Mass flow ṁ (kg/s)</>,                           value: fmt(result.massFlowRate, 4) },
                  ] as { label: React.ReactNode; value: string }[]).map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interpretation */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.energyLoss} />
              <CommonMistakes mistakes={commonMistakes.energyLoss} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Hydraulic power loss (rate of energy dissipation):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>P<sub>loss</sub> = ρ × g × Q × h<sub>f</sub>&nbsp;&nbsp;&nbsp;&nbsp;[W]</div>
              <div>P<sub>loss</sub> = ṁ × g × h<sub>f</sub> = ṁ × e</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Four equivalent forms of the same loss:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Form</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Symbol</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Formula</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Units</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 font-mono text-xs">
                <tr>
                  <td className="py-1.5 pr-4 font-sans">Head</td>
                  <td className="py-1.5 pr-4">h<sub className="font-sans">f</sub></td>
                  <td className="py-1.5 pr-4">given</td>
                  <td className="py-1.5">m</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-4 font-sans">Specific energy</td>
                  <td className="py-1.5 pr-4">e</td>
                  <td className="py-1.5 pr-4">g × h<sub className="font-sans">f</sub></td>
                  <td className="py-1.5">J/kg</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-4 font-sans">Pressure</td>
                  <td className="py-1.5 pr-4">ΔP</td>
                  <td className="py-1.5 pr-4">ρg × h<sub className="font-sans">f</sub></td>
                  <td className="py-1.5">Pa</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-4 font-sans">Power</td>
                  <td className="py-1.5 pr-4">P<sub className="font-sans">loss</sub></td>
                  <td className="py-1.5 pr-4">ρgQ × h<sub className="font-sans">f</sub></td>
                  <td className="py-1.5">W</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>P<sub>loss</sub> = hydraulic power loss (rate of energy dissipation) [W]</li>
              <li>ρ = fluid density [kg/m³]</li>
              <li>g = gravitational acceleration = 9.81 m/s²</li>
              <li>Q = volumetric flow rate [m³/s]</li>
              <li>h<sub>f</sub> = total head loss (friction + minor losses) [m]</li>
              <li>ṁ = mass flow rate = ρQ [kg/s]</li>
              <li>e = specific energy loss = g × h<sub>f</sub> [J/kg]</li>
            </ul>
          </div>

          <p>
            P<sub>loss</sub> represents the mechanical energy dissipated as heat per second.
            It equals the pump power required to sustain a flow against that head loss at 100% efficiency.
            Doubling flow rate doubles the loss; doubling head loss also doubles it.
          </p>
        </div>
      </Card>

      <References refs={REFS_ENERGY_LOSS} />
    </div>
  );
}
