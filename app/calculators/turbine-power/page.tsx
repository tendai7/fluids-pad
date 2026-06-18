"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_TURBINE_POWER } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateTurbinePower,
  generateTurbinePowerSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type FlowUnit = "m³/s" | "L/s"  | "m³/h";
type HeadUnit = "m"    | "ft";
type DensUnit = "kg/m³"| "g/cm³";
type EffUnit  = "%"    | "decimal";

const toQSI: Record<FlowUnit, number> = { "m³/s": 1, "L/s": 1e-3, "m³/h": 1/3600 };
const toHM:  Record<HeadUnit, number> = { "m": 1, "ft": 0.3048 };
const toKg:  Record<DensUnit, number> = { "kg/m³": 1, "g/cm³": 1000 };

const FLUID_PRESETS = [
  { label: "Water 20°C", density: "998"  },
  { label: "Seawater",   density: "1025" },
] as const;

const TURBINE_PRESETS = [
  { label: "Francis (large)",  eta: "91" },
  { label: "Pelton (large)",   eta: "90" },
  { label: "Kaplan (large)",   eta: "90" },
  { label: "Francis (small)",  eta: "83" },
  { label: "Run-of-river",     eta: "78" },
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

export default function TurbinePowerCalculator() {
  const [efficiency, setEfficiency] = useState("88");
  const [effUnit,    setEffUnit]    = useState<EffUnit>("%");
  const [flowRate,   setFlowRate]   = useState("5");
  const [flowUnit,   setFlowUnit]   = useState<FlowUnit>("m³/s");
  const [head,       setHead]       = useState("30");
  const [headUnit,   setHeadUnit]   = useState<HeadUnit>("m");
  const [density,    setDensity]    = useState("998");
  const [densUnit,   setDensUnit]   = useState<DensUnit>("kg/m³");
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const [result,     setResult]     = useState<ReturnType<typeof calculateTurbinePower> | null>(null);
  const [steps,      setSteps]      = useState<ReturnType<typeof generateTurbinePowerSteps> | null>(null);

  const etaFrac = effUnit === "%" ? parseFloat(efficiency) / 100 : parseFloat(efficiency);

  const handleEffUnitChange = (newUnit: EffUnit) => {
    const v = parseFloat(efficiency);
    if (!isNaN(v)) {
      if (effUnit === "%" && newUnit === "decimal") setEfficiency(fmt(v / 100, 5));
      if (effUnit === "decimal" && newUnit === "%") setEfficiency(fmt(v * 100, 5));
    }
    setEffUnit(newUnit);
  };
  const handleFlowUnitChange = (newUnit: FlowUnit) => {
    const q = parseFloat(flowRate);
    if (!isNaN(q)) setFlowRate(fmt(q * toQSI[flowUnit] / toQSI[newUnit], 5));
    setFlowUnit(newUnit);
  };
  const handleHeadUnitChange = (newUnit: HeadUnit) => {
    const h = parseFloat(head);
    if (!isNaN(h)) setHead(fmt(h * toHM[headUnit] / toHM[newUnit], 5));
    setHeadUnit(newUnit);
  };
  const handleDensUnitChange = (newUnit: DensUnit) => {
    const r = parseFloat(density);
    if (!isNaN(r)) setDensity(fmt(r * toKg[densUnit] / toKg[newUnit], 5));
    setDensUnit(newUnit);
  };

  const handleClear = () => {
    setEfficiency("");
    setEffUnit("%");
    setFlowRate("");
    setFlowUnit("m³/s");
    setHead("");
    setHeadUnit("m");
    setDensity("");
    setDensUnit("kg/m³");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const eta  = etaFrac;
    const QRaw = parseFloat(flowRate);
    const HRaw = parseFloat(head);
    const rho  = parseFloat(density);

    if (isNaN(eta)  || eta  <= 0 || eta > 1)  newErrors.efficiency = effUnit === "%" ? "Must be between 0 and 100" : "Must be between 0 and 1";
    if (isNaN(QRaw) || QRaw <= 0)             newErrors.flowRate   = "Must be positive";
    if (isNaN(HRaw) || HRaw <= 0)             newErrors.head       = "Must be positive";
    if (isNaN(rho)  || rho  <= 0)             newErrors.density    = "Must be positive";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        efficiency: eta,
        flowRate:   QRaw * toQSI[flowUnit],
        head:       HRaw * toHM[headUnit],
        density:    rho  * toKg[densUnit],
      };
      const calc = calculateTurbinePower(input);
      const stp  = generateTurbinePowerSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : "An error occurred" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Turbine Power Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Hydraulic and shaft output power for a hydraulic turbine. Computes available water
          power P<sub>h</sub> = ρgQH, shaft output P<sub>out</sub> = η × P<sub>h</sub>, and
          turbine power loss.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded">
          Turbomachinery · Turbine
        </span>
      </div>

      {/* Turbine efficiency presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Turbine efficiency presets — click to fill η
        </h2>
        <div className="flex flex-wrap gap-2">
          {TURBINE_PRESETS.map(p => (
            <button key={p.label}
              onClick={() => { setEfficiency(p.eta); setEffUnit("%"); }}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
              {p.label} ({p.eta}%)
            </button>
          ))}
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* η */}
          <div>
            <InputField label="Turbine overall efficiency" symbol="η" unit={effUnit}
              value={efficiency} onChange={setEfficiency}
              placeholder={effUnit === "%" ? "88" : "0.88"}
              error={errors.efficiency} />
            <div className="flex gap-2 -mt-2">
              {(["%" , "decimal"] as EffUnit[]).map(u => (
                <Btn key={u} label={u} active={effUnit === u} onClick={() => handleEffUnitChange(u)} />
              ))}
            </div>
            {!isNaN(etaFrac) && etaFrac > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
                η = {etaFrac.toFixed(4)} ({(etaFrac * 100).toFixed(1)}%)
              </p>
            )}
          </div>

          {/* Q */}
          <div>
            <InputField label="Volume flow rate" symbol="Q" unit={flowUnit}
              value={flowRate} onChange={setFlowRate}
              placeholder={flowUnit === "m³/s" ? "5" : flowUnit === "L/s" ? "5000" : "18000"}
              error={errors.flowRate} />
            <div className="flex gap-2 -mt-2">
              {(["m³/s", "L/s", "m³/h"] as FlowUnit[]).map(u => (
                <Btn key={u} label={u} active={flowUnit === u} onClick={() => handleFlowUnitChange(u)} />
              ))}
            </div>
          </div>

          {/* H */}
          <div>
            <InputField label="Net head" symbol="H" unit={headUnit}
              value={head} onChange={setHead}
              placeholder={headUnit === "m" ? "30" : "98.4"}
              error={errors.head} />
            <div className="flex gap-2 -mt-2">
              {(["m", "ft"] as HeadUnit[]).map(u => (
                <Btn key={u} label={u} active={headUnit === u} onClick={() => handleHeadUnitChange(u)} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Gross head minus penstock friction and other hydraulic losses
            </p>
          </div>

          {/* ρ */}
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {FLUID_PRESETS.map(p => (
                <button key={p.label}
                  onClick={() => { setDensity(p.density); setDensUnit("kg/m³"); }}
                  className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
                  {p.label}
                </button>
              ))}
            </div>
            <InputField label="Fluid density" symbol="ρ" unit={densUnit}
              value={density} onChange={setDensity}
              placeholder={densUnit === "kg/m³" ? "998" : "0.998"}
              error={errors.density} />
            <div className="flex gap-2 -mt-2">
              {(["kg/m³", "g/cm³"] as DensUnit[]).map(u => (
                <Btn key={u} label={u} active={densUnit === u} onClick={() => handleDensUnitChange(u)} />
              ))}
            </div>
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
          <div className="space-y-5">

            {/* Primary */}
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Shaft Output Power  P<sub>out</sub> = η × P<sub>h</sub>
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                P<sub>out</sub> = {fmt(result.outputPower / 1000)} kW
              </p>
              <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                = {fmt(result.outputPower / 1e6, 3)} MW
                {" · "}
                η = {fmt(etaFrac * 100, 3)}%
                {" · "}
                loss = {fmt(result.powerLoss / 1000)} kW
              </p>
            </div>

            {/* Power grid */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Power breakdown
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: <span>P<sub>h</sub> [kW]</span>,   value: fmt(result.hydraulicPower / 1000) },
                  { label: <span>P<sub>out</sub> [kW]</span>, value: fmt(result.outputPower / 1000)   },
                  { label: "Loss [kW]",                        value: fmt(result.powerLoss / 1000)     },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: <span>P<sub>h</sub> [MW]</span>,   value: fmt(result.hydraulicPower / 1e6, 3) },
                  { label: <span>P<sub>out</sub> [MW]</span>, value: fmt(result.outputPower / 1e6, 3)    },
                  { label: "η [%]",                            value: fmt(etaFrac * 100, 3)               },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.turbinePower} />
            <CommonMistakes mistakes={commonMistakes.turbinePower} />
          </div>
        </ResultsCard>
      )}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Power equations:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>P<sub>h</sub> = ρ × g × Q × H&nbsp;&nbsp;&nbsp;&nbsp;[available hydraulic power, W]</div>
              <div>P<sub>out</sub> = η × P<sub>h</sub>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[shaft output power, W]</div>
              <div>ΔP = P<sub>h</sub> − P<sub>out</sub>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[power loss to turbine inefficiencies, W]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>H = net head — gross head minus penstock friction, entrance, and tailrace losses [m]</li>
              <li>η = overall turbine efficiency = η<sub>h</sub> × η<sub>v</sub> × η<sub>m</sub></li>
              <li>P<sub>h</sub> = hydraulic power available at the turbine runner [W]</li>
              <li>P<sub>out</sub> = shaft output; multiply by η<sub>gen</sub> ≈ 0.97–0.99 for electrical output</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Turbine selection guide:</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  {["Type", "Head range", "Flow", "Typical η", "Application"].map(h => (
                    <th key={h} className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { t: "Pelton",  h: "> 200 m",    q: "Low",    e: "85–92%", a: "Mountain reservoirs, high-head" },
                  { t: "Francis", h: "20–700 m",   q: "Medium", e: "85–93%", a: "Most common, dams and reservoirs" },
                  { t: "Kaplan",  h: "2–40 m",     q: "High",   e: "80–93%", a: "Run-of-river, tidal barrages" },
                  { t: "Crossflow", h: "2–200 m",  q: "Low",    e: "70–86%", a: "Small hydro, micro hydro" },
                ].map(({ t, h, q, e, a }) => (
                  <tr key={t}>
                    <td className="py-1.5 pr-3 font-semibold">{t}</td>
                    <td className="py-1.5 pr-3 font-mono">{h}</td>
                    <td className="py-1.5 pr-3">{q}</td>
                    <td className="py-1.5 pr-3 font-mono">{e}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{a}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            Hydraulic turbines convert potential (head) or kinetic (velocity) energy of water
            into mechanical shaft work. Efficiency is the product of hydraulic (η<sub>h</sub>,
            flow-path losses), volumetric (η<sub>v</sub>, leakage), and mechanical (η<sub>m</sub>,
            bearing/seal) efficiencies. Large Francis and Pelton turbines can exceed 92% overall.
            Shaft power × η<sub>generator</sub> gives the electrical output.
          </p>
        </div>
      </Card>

      <References refs={REFS_TURBINE_POWER} />
    </div>
  );
}
