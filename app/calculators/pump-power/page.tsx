"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_PUMP_POWER } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculatePumpPower,
  generatePumpPowerSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type FlowUnit = "m³/s" | "L/s" | "L/min" | "m³/h" | "GPM" | "CFS";
type HeadUnit = "m" | "ft";
type DensUnit = "kg/m³" | "g/cm³";

const toQSI:  Record<FlowUnit, number> = { "m³/s": 1, "L/s": 1e-3, "L/min": 1/60000, "m³/h": 1/3600, "GPM": 6.30902e-5, "CFS": 0.0283168 };
const toHm:   Record<HeadUnit, number> = { m: 1, ft: 0.3048 };
const toKgM3: Record<DensUnit, number> = { "kg/m³": 1, "g/cm³": 1000 };

const FLUID_PRESETS = [
  { label: "Water at 4°C",     density: "1000" },
  { label: "Water at 20°C",    density: "998"  },
  { label: "Water at 60°C",    density: "983"  },
  { label: "Water at 80°C",    density: "972"  },
  { label: "Water at 100°C",   density: "958"  },
  { label: "Seawater",         density: "1025" },
  { label: "Engine oil (SAE 30)", density: "880" },
  { label: "Hydraulic oil (ISO 46)", density: "870" },
  { label: "Diesel fuel",      density: "850"  },
  { label: "Gasoline",         density: "740"  },
  { label: "Ethanol",          density: "789"  },
] as const;

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

export default function PumpPowerCalculator() {
  const [flowRate,     setFlowRate]     = useState("10");
  const [flowUnit,     setFlowUnit]     = useState<FlowUnit>("L/s");
  const [head,         setHead]         = useState("20");
  const [headUnit,     setHeadUnit]     = useState<HeadUnit>("m");
  const [density,      setDensity]      = useState("998");
  const [densUnit,     setDensUnit]     = useState<DensUnit>("kg/m³");
  const [efficiency,   setEfficiency]   = useState("75");
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [result,       setResult]       = useState<ReturnType<typeof calculatePumpPower> | null>(null);
  const [steps,        setSteps]        = useState<ReturnType<typeof generatePumpPowerSteps> | null>(null);

  const handleClear = () => {
    setFlowRate("");
    setFlowUnit("L/s");
    setHead("");
    setHeadUnit("m");
    setDensity("");
    setDensUnit("kg/m³");
    setEfficiency("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const qRaw  = parseFloat(flowRate);
    const hRaw  = parseFloat(head);
    const rho   = parseFloat(density);
    const effPc = parseFloat(efficiency);

    if (isNaN(qRaw)  || qRaw  <= 0)             newErrors.flowRate   = "Must be a positive number";
    if (isNaN(hRaw)  || hRaw  <= 0)             newErrors.head       = "Must be a positive number";
    if (isNaN(rho)   || rho   <= 0)             newErrors.density    = "Must be a positive number";
    if (isNaN(effPc) || effPc <= 0 || effPc > 100) newErrors.efficiency = "Must be between 0 and 100 %";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const qSI  = qRaw  * toQSI[flowUnit];
    const hSI  = hRaw  * toHm[headUnit];
    const rhoSI = rho  * toKgM3[densUnit];
    const eta  = effPc / 100;

    try {
      const input = { flowRate: qSI, head: hSI, density: rhoSI, efficiency: eta };
      const calc  = calculatePumpPower(input);
      const stp   = generatePumpPowerSteps(input, calc);
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
          Pump Power Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Calculate hydraulic and shaft power required by a pump to deliver a specified flow rate and head.
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
            <button key={p.label} onClick={() => { setDensity(p.density); setDensUnit("kg/m³"); }}
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

          {/* Flow rate */}
          <div>
            <InputField label="Flow rate" symbol="Q" unit={flowUnit}
              value={flowRate} onChange={setFlowRate}
              placeholder={flowUnit === "m³/s" ? "0.01" : flowUnit === "L/s" ? "10" : flowUnit === "L/min" ? "600" : flowUnit === "m³/h" ? "36" : flowUnit === "GPM" ? "158.5" : "0.353"}
              error={errors.flowRate} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m³/s", "L/s", "L/min", "m³/h", "GPM", "CFS"] as FlowUnit[]).map(u => (
                <Btn key={u} label={u} active={flowUnit === u} onClick={() => {
                  const si = parseFloat(flowRate) * toQSI[flowUnit];
                  setFlowUnit(u);
                  if (!isNaN(si)) setFlowRate(fmt(si / toQSI[u]));
                }} />
              ))}
            </div>
          </div>

          {/* Head */}
          <div>
            <InputField label="Total head" symbol="H" unit={headUnit}
              value={head} onChange={setHead}
              placeholder={headUnit === "m" ? "20" : "65.6"}
              error={errors.head} />
            <div className="flex gap-2 -mt-2">
              {(["m", "ft"] as HeadUnit[]).map(u => (
                <Btn key={u} label={u} active={headUnit === u} onClick={() => {
                  const si = parseFloat(head) * toHm[headUnit];
                  setHeadUnit(u);
                  if (!isNaN(si)) setHead(fmt(si / toHm[u]));
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

          {/* Efficiency */}
          <div>
            <InputField label="Pump efficiency" symbol="η" unit="%"
              value={efficiency} onChange={setEfficiency} error={errors.efficiency} />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
              Centrifugal: 60–92 % · Axial: 80–90 % · PD: 70–90 %. Enter 100 for ideal.
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
      {result && steps && (() => {
        const P    = result.power;
        const Ph   = result.hydraulicPower;
        const pUnits: [string, number][] = [
          ["W",      P],
          ["kW",     P / 1000],
          ["hp",     P / 745.7],
          ["BTU/h",  P * 3.41214],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary — shaft power */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Shaft power  P = P<sub>h</sub> / η
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
                  Shaft power in other units
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
                  Power breakdown
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {([
                    { label: <>Hydraulic  P<sub>h</sub></>,  value: `${fmt(Ph / 1000, 5)} kW` },
                    { label: <>Shaft  P</>,                  value: `${fmt(P  / 1000, 5)} kW` },
                    { label: <>Efficiency  η</>,             value: `${efficiency} %`          },
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
              <AssumptionsList assumptions={commonAssumptions.pumpPower} />
              <CommonMistakes mistakes={commonMistakes.pumpPower} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Hydraulic (water) power — ideal, no losses:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              P<sub>h</sub> = ρ × g × Q × H&nbsp;&nbsp;&nbsp;&nbsp;[W]
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Shaft power — accounting for pump efficiency:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              P = P<sub>h</sub> / η = (ρ × g × Q × H) / η&nbsp;&nbsp;&nbsp;&nbsp;[W]
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Full efficiency chain:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              P<sub>motor</sub> = P<sub>h</sub> / (η<sub>pump</sub> × η<sub>motor</sub>)
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This calculator covers pump shaft power only. Multiply by a motor efficiency η<sub>motor</sub> (typically 0.90–0.97) for total electrical input.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>P<sub>h</sub> = hydraulic power [W] — energy transferred to the fluid</li>
              <li>P = shaft (brake) power [W] — power input to the pump shaft</li>
              <li>ρ = fluid density [kg/m³]</li>
              <li>g = gravitational acceleration = 9.81 m/s²</li>
              <li>Q = volumetric flow rate [m³/s]</li>
              <li>H = total pump head [m] — includes pressure, velocity, and elevation terms</li>
              <li>η = pump efficiency (0–1) — ratio of hydraulic to shaft power</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Typical pump efficiencies:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Pump type</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">η range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ["Large centrifugal pump",    "80–92 %"],
                  ["Small centrifugal pump",    "60–80 %"],
                  ["Axial-flow pump",           "80–90 %"],
                  ["Positive displacement",     "70–90 %"],
                  ["Gear / vane pump",          "60–80 %"],
                ].map(([type, range]) => (
                  <tr key={type}>
                    <td className="py-1.5 pr-4">{type}</td>
                    <td className="py-1.5 font-mono">{range}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            Pump power scales linearly with flow rate, head, and density. Doubling the flow rate
            doubles the power; doubling the head also doubles the power — but in centrifugal pumps
            operating on a system curve both Q and H change together (affinity laws apply).
          </p>
        </div>
      </Card>

      <References refs={REFS_PUMP_POWER} />
    </div>
  );
}
