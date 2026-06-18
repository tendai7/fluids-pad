"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_HYDRAULIC_EFFICIENCY } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateHydraulicEfficiency,
  generateHydraulicEfficiencySteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type HeadUnit  = "m"    | "ft";
type FlowUnit  = "m³/s" | "L/s" | "m³/h";
type PowerUnit = "W"    | "kW"  | "hp";
type DensUnit  = "kg/m³"| "g/cm³";

const toHM:  Record<HeadUnit,  number> = { "m": 1, "ft": 0.3048 };
const toQSI: Record<FlowUnit,  number> = { "m³/s": 1, "L/s": 1e-3, "m³/h": 1/3600 };
const toW:   Record<PowerUnit, number> = { "W": 1, "kW": 1000, "hp": 745.7 };
const toKg:  Record<DensUnit,  number> = { "kg/m³": 1, "g/cm³": 1000 };

const FLUID_PRESETS = [
  { label: "Water 20°C",  density: "998"  },
  { label: "Water 60°C",  density: "983"  },
  { label: "Seawater",    density: "1025" },
  { label: "Light oil",   density: "850"  },
] as const;

function fmt(n: number, sig = 4) { return parseFloat(n.toPrecision(sig)).toString(); }

function pct(n: number, dec = 1) { return (n * 100).toFixed(dec) + "%"; }

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

function EffBar({ value, label, color }: { value: number; label: string; color: string }) {
  const pctVal = Math.min(100, Math.max(0, value * 100));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-semibold text-gray-900 dark:text-white">{pct(value)}</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pctVal}%` }} />
      </div>
    </div>
  );
}

export default function HydraulicEfficiencyCalculator() {
  const [actualHead,       setActualHead]       = useState("18");
  const [theoreticalHead,  setTheoreticalHead]  = useState("22");
  const [headUnit,         setHeadUnit]         = useState<HeadUnit>("m");
  const [flowRate,         setFlowRate]         = useState("50");
  const [flowUnit,         setFlowUnit]         = useState<FlowUnit>("L/s");
  const [shaftPower,       setShaftPower]       = useState("15");
  const [powerUnit,        setPowerUnit]        = useState<PowerUnit>("kW");
  const [density,          setDensity]          = useState("998");
  const [densUnit,         setDensUnit]         = useState<DensUnit>("kg/m³");
  const [errors,           setErrors]           = useState<Record<string, string>>({});
  const [result,           setResult]           = useState<ReturnType<typeof calculateHydraulicEfficiency> | null>(null);
  const [steps,            setSteps]            = useState<ReturnType<typeof generateHydraulicEfficiencySteps> | null>(null);

  const handleHeadUnitChange = (newUnit: HeadUnit) => {
    const ha = parseFloat(actualHead);
    if (!isNaN(ha)) setActualHead(fmt(ha * toHM[headUnit] / toHM[newUnit], 5));
    const he = parseFloat(theoreticalHead);
    if (!isNaN(he)) setTheoreticalHead(fmt(he * toHM[headUnit] / toHM[newUnit], 5));
    setHeadUnit(newUnit);
  };
  const handleFlowUnitChange = (newUnit: FlowUnit) => {
    const q = parseFloat(flowRate);
    if (!isNaN(q)) setFlowRate(fmt(q * toQSI[flowUnit] / toQSI[newUnit], 5));
    setFlowUnit(newUnit);
  };
  const handlePowerUnitChange = (newUnit: PowerUnit) => {
    const pw = parseFloat(shaftPower);
    if (!isNaN(pw)) setShaftPower(fmt(pw * toW[powerUnit] / toW[newUnit], 5));
    setPowerUnit(newUnit);
  };
  const handleDensUnitChange = (newUnit: DensUnit) => {
    const r = parseFloat(density);
    if (!isNaN(r)) setDensity(fmt(r * toKg[densUnit] / toKg[newUnit], 5));
    setDensUnit(newUnit);
  };

  const handleClear = () => {
    setActualHead("");
    setTheoreticalHead("");
    setHeadUnit("m");
    setFlowRate("");
    setFlowUnit("L/s");
    setShaftPower("");
    setPowerUnit("kW");
    setDensity("");
    setDensUnit("kg/m³");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const HaR  = parseFloat(actualHead);
    const HeR  = parseFloat(theoreticalHead);
    const QR   = parseFloat(flowRate);
    const PR   = parseFloat(shaftPower);
    const rhoR = parseFloat(density);

    if (isNaN(HaR) || HaR <= 0) newErrors.actualHead       = "Must be positive";
    if (isNaN(HeR) || HeR <= 0) newErrors.theoreticalHead  = "Must be positive";
    if (!isNaN(HaR) && !isNaN(HeR) && HaR >= HeR)
      newErrors.actualHead = "Actual head must be less than Euler head";
    if (isNaN(QR)   || QR  <= 0) newErrors.flowRate        = "Must be positive";
    if (isNaN(PR)   || PR  <= 0) newErrors.shaftPower      = "Must be positive";
    if (isNaN(rhoR) || rhoR<= 0) newErrors.density         = "Must be positive";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        actualHead:       HaR  * toHM[headUnit],
        theoreticalHead:  HeR  * toHM[headUnit],
        flowRate:         QR   * toQSI[flowUnit],
        shaftPower:       PR   * toW[powerUnit],
        density:          rhoR * toKg[densUnit],
      };
      const calc = calculateHydraulicEfficiency(input);
      const stp  = generateHydraulicEfficiencySteps(input, calc);
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
          Hydraulic Efficiency Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Hydraulic and overall pump efficiency from measured head, flow, and shaft power.
          Hydraulic efficiency compares actual to Euler head; overall efficiency compares
          hydraulic power to shaft input.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded">
          Turbomachinery · Efficiency
        </span>
      </div>

      {/* Fluid presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Fluid presets — click to fill ρ
        </h2>
        <div className="flex flex-wrap gap-2">
          {FLUID_PRESETS.map(p => (
            <button key={p.label}
              onClick={() => { setDensity(p.density); setDensUnit("kg/m³"); }}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Ha */}
          <div>
            <InputField label="Actual pump head" symbol="Ha" unit={headUnit}
              value={actualHead} onChange={setActualHead}
              placeholder={headUnit === "m" ? "18" : "59"}
              error={errors.actualHead} />
            <div className="flex gap-2 -mt-2">
              {(["m", "ft"] as HeadUnit[]).map(u => (
                <Btn key={u} label={u} active={headUnit === u} onClick={() => handleHeadUnitChange(u)} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Measured head across the pump (outlet − inlet)
            </p>
          </div>

          {/* He */}
          <div>
            <InputField label="Euler (theoretical) head" symbol="He" unit={headUnit}
              value={theoreticalHead} onChange={setTheoreticalHead}
              placeholder={headUnit === "m" ? "22" : "72"}
              error={errors.theoreticalHead} />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
              From velocity triangle calculation (Euler equation) — must be &gt; H<sub>a</sub>
            </p>
          </div>

          {/* Q */}
          <div>
            <InputField label="Volume flow rate" symbol="Q" unit={flowUnit}
              value={flowRate} onChange={setFlowRate}
              placeholder={flowUnit === "m³/s" ? "0.05" : flowUnit === "L/s" ? "50" : "180"}
              error={errors.flowRate} />
            <div className="flex gap-2 -mt-2">
              {(["L/s", "m³/s", "m³/h"] as FlowUnit[]).map(u => (
                <Btn key={u} label={u} active={flowUnit === u} onClick={() => handleFlowUnitChange(u)} />
              ))}
            </div>
          </div>

          {/* Ps */}
          <div>
            <InputField label="Shaft (input) power" symbol="Ps" unit={powerUnit}
              value={shaftPower} onChange={setShaftPower}
              placeholder={powerUnit === "W" ? "15000" : powerUnit === "kW" ? "15" : "20"}
              error={errors.shaftPower} />
            <div className="flex gap-2 -mt-2">
              {(["kW", "W", "hp"] as PowerUnit[]).map(u => (
                <Btn key={u} label={u} active={powerUnit === u} onClick={() => handlePowerUnitChange(u)} />
              ))}
            </div>
          </div>

          {/* ρ */}
          <div>
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
                Hydraulic Efficiency  η<sub>h</sub> = H<sub>a</sub>/H<sub>E</sub>
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                η<sub>h</sub> = {pct(result.hydraulicEfficiency)}
              </p>
              <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                Overall η = {pct(result.overallEfficiency)}
                {" · "}
                Head loss ΔH = {fmt(result.headLoss)} m
                {" · "}
                P<sub>h</sub> = {fmt(result.hydraulicPower / 1000)} kW
              </p>
            </div>

            {/* Efficiency bars */}
            <div className="space-y-3">
              <EffBar value={result.hydraulicEfficiency}
                label="Hydraulic efficiency  ηₕ = Hₐ / Hₑ"
                color="bg-indigo-500" />
              <EffBar value={result.overallEfficiency}
                label="Overall efficiency  η = ρgQHₐ / Pₛ"
                color="bg-blue-500" />
            </div>

            {/* Metrics grid */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Efficiency breakdown
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: <span>η<sub>h</sub> [%]</span>,  value: pct(result.hydraulicEfficiency) },
                  { label: <span>η [%]</span>,              value: pct(result.overallEfficiency)   },
                  { label: "ΔH [m]",                        value: fmt(result.headLoss)             },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: <span>P<sub>h</sub> [kW]</span>,    value: fmt(result.hydraulicPower / 1000) },
                  { label: <span>H<sub>a</sub> [m]</span>,     value: fmt(parseFloat(actualHead) * toHM[headUnit]) },
                  { label: <span>H<sub>E</sub> [m]</span>,     value: fmt(parseFloat(theoreticalHead) * toHM[headUnit]) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.hydraulicEfficiency} />
            <CommonMistakes mistakes={commonMistakes.hydraulicEfficiency} />
          </div>
        </ResultsCard>
      )}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Efficiency definitions:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>η<sub>h</sub> = H<sub>a</sub> / H<sub>E</sub>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[hydraulic efficiency]</div>
              <div>η    = ρgQH<sub>a</sub> / P<sub>shaft</sub>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[overall efficiency]</div>
              <div>η    = η<sub>h</sub> × η<sub>v</sub> × η<sub>m</sub>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[efficiency components]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Efficiency components:</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  {["Component", "Symbol", "Formula", "Typical range"].map(h => (
                    <th key={h} className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { c: "Hydraulic",   s: <span>η<sub>h</sub></span>,  f: "Hₐ / Hₑ",          r: "0.85–0.95" },
                  { c: "Volumetric",  s: <span>η<sub>v</sub></span>,  f: "Q(net) / Q(total)", r: "0.95–0.99" },
                  { c: "Mechanical",  s: <span>η<sub>m</sub></span>,  f: "Pₕ / Pₛ",          r: "0.95–0.99" },
                  { c: "Overall",     s: <span>η</span>,               f: "ρgQHₐ / Pₛ",       r: "0.70–0.90" },
                ].map(({ c, s, f, r }) => (
                  <tr key={c}>
                    <td className="py-1.5 pr-3">{c}</td>
                    <td className="py-1.5 pr-3">{s}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs">{f}</td>
                    <td className="py-1.5 text-gray-500 dark:text-gray-400">{r}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>H<sub>a</sub> = measured pump head (outlet − inlet pressure head) [m]</li>
              <li>H<sub>E</sub> = Euler head from blade kinematics — U₂Vu₂/g [m]</li>
              <li>ΔH = H<sub>E</sub> − H<sub>a</sub> = hydraulic head loss inside the impeller [m]</li>
              <li>P<sub>h</sub> = ρgQH<sub>a</sub> = useful hydraulic power delivered to fluid [W]</li>
              <li>η<sub>v</sub> accounts for internal recirculation (leakage back through wear rings)</li>
              <li>η<sub>m</sub> accounts for bearing friction, seal drag, disk friction</li>
            </ul>
          </div>

          <p>
            The product η<sub>h</sub> × η<sub>v</sub> × η<sub>m</sub> = η defines the overall
            pump efficiency. A typical centrifugal pump has η = 0.75–0.88 at the BEP.
            Hydraulic losses dominate at off-BEP conditions (recirculation, shock losses).
          </p>
        </div>
      </Card>

      <References refs={REFS_HYDRAULIC_EFFICIENCY} />
    </div>
  );
}
