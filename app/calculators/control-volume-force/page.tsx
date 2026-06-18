"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_CONTROL_VOLUME_FORCE } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateControlVolumeForce,
  generateControlVolumeForceSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type DiamUnit = "m" | "mm" | "cm" | "inch";
type PresUnit = "Pa" | "kPa" | "bar" | "psi";
type FlowUnit = "m³/s" | "L/s" | "L/min" | "m³/h";
type DensUnit = "kg/m³" | "g/cm³";

const toDm:   Record<DiamUnit, number> = { m: 1, mm: 1e-3, cm: 1e-2, inch: 0.0254 };
const toPa:   Record<PresUnit, number> = { Pa: 1, kPa: 1e3, bar: 1e5, psi: 6894.76 };
const toM3S:  Record<FlowUnit, number> = { "m³/s": 1, "L/s": 1e-3, "L/min": 1/60000, "m³/h": 1/3600 };
const toKgM3: Record<DensUnit, number> = { "kg/m³": 1, "g/cm³": 1000 };

const FLUID_PRESETS = [
  { label: "Water at 20°C",  density: "998"   },
  { label: "Water at 60°C",  density: "983"   },
  { label: "Seawater",       density: "1025"  },
  { label: "Air at 20°C",    density: "1.204" },
] as const;

// Common scenario presets
const SCENARIOS = [
  { label: "Straight reducer / nozzle",   angle: "0",   desc: "Flow stays in +x; outlet diameter smaller" },
  { label: "45° elbow",                   angle: "45",  desc: "Flow turns 45° in the x-y plane" },
  { label: "90° elbow (standard)",        angle: "90",  desc: "Flow turns 90°; most common case" },
  { label: "135° bend",                   angle: "135", desc: "Obtuse bend" },
  { label: "180° U-bend",                 angle: "180", desc: "Flow reverses direction" },
  { label: "Custom angle",                angle: "",    desc: "Enter any angle below" },
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

export default function ControlVolumeForceCalculator() {
  const [selectedScenario, setSelectedScenario] = useState("90° elbow (standard)");
  const [bendAngle,   setBendAngle]   = useState("90");

  const [diam1,       setDiam1]       = useState("100");
  const [diam2,       setDiam2]       = useState("100");
  const [diamUnit,    setDiamUnit]    = useState<DiamUnit>("mm");
  const [pres1,       setPres1]       = useState("200");
  const [pres2,       setPres2]       = useState("0");
  const [presUnit,    setPresUnit]    = useState<PresUnit>("kPa");
  const [flowRate,    setFlowRate]    = useState("10");
  const [flowUnit,    setFlowUnit]    = useState<FlowUnit>("L/s");
  const [density,     setDensity]     = useState("998");
  const [densUnit,    setDensUnit]    = useState<DensUnit>("kg/m³");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateControlVolumeForce> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateControlVolumeForceSteps> | null>(null);

  const isCustomAngle = selectedScenario === "Custom angle";

  const handleClear = () => {
    setSelectedScenario("");
    setBendAngle("");
    setDiam1("");
    setDiam2("");
    setDiamUnit("mm");
    setPres1("");
    setPres2("");
    setPresUnit("kPa");
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
    const d1Raw  = parseFloat(diam1);
    const d2Raw  = parseFloat(diam2);
    const p1Raw  = parseFloat(pres1);
    const p2Raw  = parseFloat(pres2);
    const qRaw   = parseFloat(flowRate);
    const rhoRaw = parseFloat(density);
    const angRaw = parseFloat(bendAngle);

    if (isNaN(d1Raw)  || d1Raw  <= 0)  newErrors.diam1    = "Must be a positive number";
    if (isNaN(d2Raw)  || d2Raw  <= 0)  newErrors.diam2    = "Must be a positive number";
    if (isNaN(p1Raw))                  newErrors.pres1    = "Must be a number";
    if (isNaN(p2Raw))                  newErrors.pres2    = "Must be a number";
    if (isNaN(qRaw)   || qRaw   <= 0)  newErrors.flowRate = "Must be a positive number";
    if (isNaN(rhoRaw) || rhoRaw <= 0)  newErrors.density  = "Must be a positive number";
    if (isNaN(angRaw) || angRaw < 0 || angRaw > 360) newErrors.bendAngle = "Must be 0–360°";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const d1SI  = d1Raw  * toDm[diamUnit];
    const d2SI  = d2Raw  * toDm[diamUnit];
    const p1SI  = p1Raw  * toPa[presUnit];
    const p2SI  = p2Raw  * toPa[presUnit];
    const qSI   = qRaw   * toM3S[flowUnit];
    const rhoSI = rhoRaw * toKgM3[densUnit];

    try {
      const input = { diameter1: d1SI, diameter2: d2SI, pressure1: p1SI, pressure2: p2SI,
        bendAngle: angRaw, flowRate: qSI, density: rhoSI };
      const calc  = calculateControlVolumeForce(input);
      const stp   = generateControlVolumeForceSteps(input, calc);
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
          Control Volume Force Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Force on a pipe fitting or support from the steady-state linear momentum equation.
          Handles bends, elbows, reducers, and nozzles.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
          Fluid Mechanics II · Specialized
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

        {/* Scenario selector */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Fitting type / bend angle:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {SCENARIOS.map((s) => (
              <button key={s.label}
                onClick={() => {
                  setSelectedScenario(s.label);
                  if (s.angle !== "") setBendAngle(s.angle);
                }}
                className={`px-3 py-2 text-sm rounded-md border text-left transition-colors ${selectedScenario === s.label
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
                <div className="font-medium">{s.label}</div>
                <div className={`text-xs mt-0.5 ${selectedScenario === s.label ? "text-blue-200" : "text-gray-500 dark:text-gray-400"}`}>{s.desc}</div>
              </button>
            ))}
          </div>
          {isCustomAngle && (
            <div className="mt-3 max-w-xs">
              <InputField label="Bend angle (outlet from +x axis, CCW)" symbol="θ" unit="degrees"
                value={bendAngle} onChange={setBendAngle} error={errors.bendAngle} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Inlet diameter */}
          <div>
            <InputField label="Inlet diameter" symbol="D₁" unit={diamUnit}
              value={diam1} onChange={setDiam1}
              placeholder={diamUnit === "m" ? "0.1" : diamUnit === "cm" ? "10" : diamUnit === "inch" ? "3.94" : "100"}
              error={errors.diam1} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m", "mm", "cm", "inch"] as DiamUnit[]).map(u => (
                <Btn key={u} label={u} active={diamUnit === u} onClick={() => {
                  const si1 = parseFloat(diam1) * toDm[diamUnit];
                  const si2 = parseFloat(diam2) * toDm[diamUnit];
                  setDiamUnit(u);
                  if (!isNaN(si1)) setDiam1(fmt(si1 / toDm[u]));
                  if (!isNaN(si2)) setDiam2(fmt(si2 / toDm[u]));
                }} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Unit applies to both D₁ and D₂.</p>
          </div>

          {/* Outlet diameter */}
          <div>
            <InputField label="Outlet diameter" symbol="D₂" unit={diamUnit}
              value={diam2} onChange={setDiam2}
              placeholder={diamUnit === "m" ? "0.1" : diamUnit === "cm" ? "10" : diamUnit === "inch" ? "3.94" : "100"}
              error={errors.diam2} />
          </div>

          {/* Inlet gauge pressure */}
          <div>
            <InputField label="Inlet gauge pressure" symbol="P₁" unit={presUnit}
              value={pres1} onChange={setPres1}
              placeholder={presUnit === "Pa" ? "200000" : presUnit === "kPa" ? "200" : presUnit === "bar" ? "2" : "29"}
              error={errors.pres1} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["Pa", "kPa", "bar", "psi"] as PresUnit[]).map(u => (
                <Btn key={u} label={u} active={presUnit === u} onClick={() => {
                  const si1 = parseFloat(pres1) * toPa[presUnit];
                  const si2 = parseFloat(pres2) * toPa[presUnit];
                  setPresUnit(u);
                  if (!isNaN(si1)) setPres1(fmt(si1 / toPa[u]));
                  if (!isNaN(si2)) setPres2(fmt(si2 / toPa[u]));
                }} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Unit applies to both P₁ and P₂. Use gauge pressures.</p>
          </div>

          {/* Outlet gauge pressure */}
          <div>
            <InputField label="Outlet gauge pressure" symbol="P₂" unit={presUnit}
              value={pres2} onChange={setPres2}
              error={errors.pres2} />
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
        const angle = parseFloat(bendAngle);
        const fUnits: [string, number][] = [
          ["N",   result.totalForce],
          ["kN",  result.totalForce / 1000],
          ["lbf", result.totalForce / 4.44822],
          ["kgf", result.totalForce / 9.80665],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Force on fitting (fluid → pipe)
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  |F| = {fmt(result.totalForce, 5)} N
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  at {fmt(result.forceAngle, 4)}° from +x axis
                </p>
              </div>

              {/* Force components */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Force on fitting — components (F<sub>x</sub>, F<sub>y</sub>)
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {([
                    { label: <>F<sub>x</sub> (N)</>, value: fmt(result.Fx, 5) },
                    { label: <>F<sub>y</sub> (N)</>, value: fmt(result.Fy, 5) },
                    { label: <>|F| (N)</>,           value: fmt(result.totalForce, 5) },
                  ] as { label: React.ReactNode; value: string }[]).map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Unit grid */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Total force magnitude in other units
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {fUnits.map(([unit, value]) => (
                    <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                      <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terms breakdown */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Equation terms
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "ṁ (kg/s)",  value: fmt(result.massFlowRate, 4)  },
                    { label: "ṁV₁ (N)",   value: fmt(result.momentumFlux1, 4) },
                    { label: "ṁV₂ (N)",   value: fmt(result.momentumFlux2, 4) },
                    { label: "P₁A₁ (N)",  value: fmt(result.pressureForce1, 4)},
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interpretation */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {angle === 90 ? "90° Elbow" : angle === 0 ? "Straight reducer" : angle === 180 ? "U-bend" : `${angle}° bend`} — θ = {bendAngle}°
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.controlVolumeForce} />
              <CommonMistakes mistakes={commonMistakes.controlVolumeForce} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Steady-state linear momentum equation:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>ΣF<sub>ext</sub> = ṁV<sub>2</sub> − ṁV<sub>1</sub>&nbsp;&nbsp;(vectors)</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Inlet in +x direction, outlet at angle θ from +x axis (CCW positive).
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Component equations (force of pipe ON fluid):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Rx = ṁ(V₂cosθ − V₁) − P₁A₁ + P₂A₂cosθ</div>
              <div>Ry = ṁV₂sinθ + P₂A₂sinθ</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Force on the fitting (reaction):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Fx = −Rx&nbsp;&nbsp;&nbsp;&nbsp;Fy = −Ry</div>
              <div>|F| = √(Fx² + Fy²)</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Quick results for equal-diameter pipes (V₁ = V₂ = V):</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Case</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">F<sub>x</sub></th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">F<sub>y</sub></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 font-mono text-xs">
                <tr>
                  <td className="py-1.5 pr-4 font-sans">θ = 0° (straight, P₂ = 0)</td>
                  <td className="py-1.5 pr-4">P₁A₁</td>
                  <td className="py-1.5">0</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-4 font-sans">θ = 90° (elbow, P₂ = 0)</td>
                  <td className="py-1.5 pr-4">ṁV + P₁A₁</td>
                  <td className="py-1.5">−ṁV</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-4 font-sans">θ = 180° (U-bend, P₂ = 0)</td>
                  <td className="py-1.5 pr-4">2ṁV + P₁A₁</td>
                  <td className="py-1.5">0</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Rx, Ry = force that pipe/wall exerts ON the fluid [N]</li>
              <li>Fx = −Rx, Fy = −Ry = force that fluid exerts ON the pipe/support [N]</li>
              <li>ṁ = mass flow rate = ρQ [kg/s]</li>
              <li>V₁, V₂ = mean velocities at inlet and outlet [m/s]</li>
              <li>P₁, P₂ = gauge pressures at inlet and outlet [Pa]</li>
              <li>A₁, A₂ = cross-sectional areas [m²]</li>
              <li>θ = bend angle — angle of outlet from +x direction [°]</li>
            </ul>
          </div>
        </div>
      </Card>

      <References refs={REFS_CONTROL_VOLUME_FORCE} />
    </div>
  );
}
