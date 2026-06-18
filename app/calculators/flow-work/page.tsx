"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_FLOW_WORK } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateFlowWork,
  generateFlowWorkSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type PressUnit = "Pa" | "kPa" | "bar" | "psi" | "atm";
type DensUnit  = "kg/m³" | "g/cm³";
const toPa:   Record<PressUnit, number> = { Pa: 1, kPa: 1000, bar: 1e5, psi: 6894.76, atm: 101325 };
const toKgM3: Record<DensUnit,  number> = { "kg/m³": 1, "g/cm³": 1000 };

const FLUID_PRESETS = [
  { label: "Water at 20°C",  density: "998"   },
  { label: "Seawater",       density: "1025"  },
  { label: "Air at 20°C",    density: "1.204" },
  { label: "Steam (1 atm)",  density: "0.597" },
  { label: "Oil (SAE 30)",   density: "880"   },
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

export default function FlowWorkCalculator() {
  const [pressure,     setPressure]     = useState("101325");
  const [pressUnit,    setPressUnit]    = useState<PressUnit>("Pa");
  const [density,      setDensity]      = useState("998");
  const [densUnit,     setDensUnit]     = useState<DensUnit>("kg/m³");
  const [massFlowRate, setMassFlowRate] = useState("");
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [result,       setResult]       = useState<ReturnType<typeof calculateFlowWork> | null>(null);
  const [steps,        setSteps]        = useState<ReturnType<typeof generateFlowWorkSteps> | null>(null);

  const handleClear = () => {
    setPressure("");
    setPressUnit("Pa");
    setDensity("");
    setDensUnit("kg/m³");
    setMassFlowRate("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const pRaw   = parseFloat(pressure);
    const rho    = parseFloat(density);
    const mdot   = massFlowRate.trim() !== "" ? parseFloat(massFlowRate) : undefined;

    if (isNaN(pRaw)  || pRaw  < 0)  newErrors.pressure     = "Must be non-negative";
    if (isNaN(rho)   || rho   <= 0) newErrors.density       = "Must be a positive number";
    if (mdot !== undefined && (isNaN(mdot) || mdot < 0)) newErrors.massFlowRate = "Must be non-negative";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const pSI   = pRaw * toPa[pressUnit];
      const rhoSI = rho  * toKgM3[densUnit];
      const input = { pressure: pSI, density: rhoSI, massFlowRate: mdot };
      const calc  = calculateFlowWork(input);
      const stp   = generateFlowWorkSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Flow Work Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Calculate the specific flow work (P/ρ) — the energy per unit mass required to push
          fluid across a control volume boundary.
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
            <button key={p.label} onClick={() => setDensity(p.density)}
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

          {/* Pressure */}
          <div>
            <InputField label="Pressure (absolute)" symbol="P" unit={pressUnit}
              value={pressure} onChange={setPressure} error={errors.pressure} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["Pa","kPa","bar","psi","atm"] as PressUnit[]).map(u => (
                <Btn key={u} label={u} active={pressUnit === u} onClick={() => {
                  const si = parseFloat(pressure) * toPa[pressUnit];
                  setPressUnit(u);
                  if (!isNaN(si)) setPressure(fmt(si / toPa[u]));
                }} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Use absolute pressure in energy equations.
            </p>
          </div>

          {/* Density */}
          <div>
            <InputField label="Fluid density" symbol="ρ" unit={densUnit}
              value={density} onChange={setDensity} error={errors.density} />
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

          {/* Optional mass flow rate */}
          <div className="md:col-span-2 max-w-sm">
            <InputField label="Mass flow rate (optional — for flow work rate)" symbol="ṁ" unit="kg/s"
              value={massFlowRate} onChange={setMassFlowRate} error={errors.massFlowRate} />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
              If provided, flow work rate  Ẇ = ṁ × P/ρ  [W] is also shown.
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

      {result && steps && (() => {
        const w   = result.specificFlowWork;
        const v   = result.specificVolume;
        const W   = result.flowWorkRate;

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Specific flow work  w = P / ρ
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {fmt(w, 6)} J/kg
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  {fmt(w / 1000, 5)} kJ/kg
                </p>
              </div>

              {/* Breakdown panel */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Components
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "Pressure P",       value: `${fmt(parseFloat(pressure) * toPa[pressUnit])} Pa` },
                    { label: "Specific vol. v",  value: `${fmt(v, 5)} m³/kg`  },
                    { label: "w = P × v",        value: `${fmt(w, 5)} J/kg`   },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Unit grid */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Specific flow work in other units
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    ["J/kg",   w],
                    ["kJ/kg",  w / 1000],
                    ["J/g",    w / 1000],
                    ["BTU/lb", w / 2326],
                  ] as [string, number][]).map(([unit, value]) => (
                    <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                      <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flow work rate */}
              {W !== undefined && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Flow work rate  Ẇ = ṁ × P/ρ
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {fmt(W, 6)} W
                  </p>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {([["W", W], ["kW", W / 1000], ["MW", W / 1e6]] as [string, number][]).map(([unit, value]) => (
                      <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                        <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.flowWork} />
              <CommonMistakes mistakes={commonMistakes.flowWork} />
            </div>
          </ResultsCard>
        );
      })()}

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Specific flow work:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              w = P × v = P / ρ &nbsp;&nbsp;[J/kg]
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Flow work rate:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              Ẇ = ṁ × P/ρ = Q × P &nbsp;&nbsp;[W]
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Role in enthalpy:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              h = u + P/ρ &nbsp;&nbsp;(specific enthalpy = internal energy + flow work)
            </div>
          </div>
          <p>
            Flow work is the work done by the fluid behind a parcel to push it through a
            control volume boundary against the pressure P. It is not a form of stored energy
            but a transfer term. In the steady-flow energy equation, flow work + internal energy
            combine into specific enthalpy h, which is why enthalpy appears naturally in
            open-system thermodynamics.
          </p>
        </div>
      </Card>
      <References refs={REFS_FLOW_WORK} />
    </div>
  );
}