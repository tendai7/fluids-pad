"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_SPECIFIC_ENERGY } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateSpecificEnergy,
  generateSpecificEnergySteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit  = "m" | "mm" | "cm" | "ft";
type VelUnit  = "m/s" | "ft/s";
type FlowUnit = "m²/s" | "ft²/s";
type InputMode = "velocity" | "discharge";

const toLm:  Record<LenUnit,  number> = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048 };
const toVSI: Record<VelUnit,  number> = { "m/s": 1, "ft/s": 0.3048 };
const toQSI: Record<FlowUnit, number> = { "m²/s": 1, "ft²/s": 0.0929 };

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

function ModeBtn({ label, active, onClick }: { label: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${active
        ? "bg-teal-600 text-white"
        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
      {label}
    </button>
  );
}

export default function SpecificEnergyCalculator() {
  const [inputMode, setInputMode] = useState<InputMode>("velocity");
  const [y,         setY]         = useState("1.0");
  const [V,         setV]         = useState("2.0");
  const [q,         setQ]         = useState("2.0");
  const [lenUnit,   setLenUnit]   = useState<LenUnit>("m");
  const [velUnit,   setVelUnit]   = useState<VelUnit>("m/s");
  const [flowUnit,  setFlowUnit]  = useState<FlowUnit>("m²/s");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateSpecificEnergy> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateSpecificEnergySteps> | null>(null);

  const handleClear = () => {
    setInputMode("velocity");
    setY("");
    setV("");
    setQ("");
    setLenUnit("m");
    setVelUnit("m/s");
    setFlowUnit("m²/s");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const ySI = parseFloat(y) * toLm[lenUnit];
    const VSI = parseFloat(V) * toVSI[velUnit];
    const qSI = parseFloat(q) * toQSI[flowUnit];

    if (isNaN(ySI) || ySI <= 0) newErrors.y = "Must be a positive number";
    if (inputMode === "velocity" && (isNaN(VSI) || VSI < 0)) newErrors.V = "Must be ≥ 0";
    if (inputMode === "discharge" && (isNaN(qSI) || qSI < 0)) newErrors.q = "Must be ≥ 0";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        depth: ySI,
        velocity:      inputMode === "velocity"  ? VSI : undefined,
        unitDischarge: inputMode === "discharge" ? qSI : undefined,
      };
      const calc = calculateSpecificEnergy(input);
      const stp  = generateSpecificEnergySteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const Fr  = result?.froudeNumber ?? 0;
  const froudeBg =
    Fr < 0.99
      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      : Fr > 1.01
      ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
      : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Specific Energy Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          E = y + V²/(2g) — energy per unit weight measured from the channel bed.
          Computes specific energy, Froude number, critical depth, minimum energy,
          and the alternate depth on the other branch of the E-y diagram.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 rounded">
          Open Channel Flow · Hydraulics
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Input mode */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Specify flow by:
          </p>
          <div className="flex gap-2 max-w-sm">
            <ModeBtn
              label={<>Velocity V</>}
              active={inputMode === "velocity"} onClick={() => setInputMode("velocity")} />
            <ModeBtn
              label={<>Unit discharge q = Q/b</>}
              active={inputMode === "discharge"} onClick={() => setInputMode("discharge")} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Depth */}
          <div>
            <InputField label="Flow depth" symbol="y" unit={lenUnit}
              value={y} onChange={setY}
              placeholder={lenUnit === "m" ? "1.0" : lenUnit === "mm" ? "1000" : lenUnit === "cm" ? "100" : "3.28"}
              error={errors.y} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                <Btn key={u} label={u} active={lenUnit === u} onClick={() => {
                  const raw = parseFloat(y);
                  if (!isNaN(raw)) setY(parseFloat((raw * toLm[lenUnit] / toLm[u]).toPrecision(6)).toString());
                  setLenUnit(u);
                }} />
              ))}
            </div>
          </div>

          {/* V or q */}
          {inputMode === "velocity" ? (
            <div>
              <InputField label="Flow velocity" symbol="V" unit={velUnit}
                value={V} onChange={setV}
                placeholder={velUnit === "m/s" ? "2.0" : "6.56"}
                error={errors.V} />
              <div className="flex gap-2 -mt-2">
                {(["m/s","ft/s"] as VelUnit[]).map(u => (
                  <Btn key={u} label={u} active={velUnit === u} onClick={() => {
                    const raw = parseFloat(V);
                    if (!isNaN(raw)) setV(parseFloat((raw * toVSI[velUnit] / toVSI[u]).toPrecision(6)).toString());
                    setVelUnit(u);
                  }} />
                ))}
              </div>
            </div>
          ) : (
            <div>
              <InputField label="Unit discharge" symbol="q" unit={flowUnit}
                value={q} onChange={setQ}
                placeholder={flowUnit === "m²/s" ? "2.0" : "21.5"}
                error={errors.q} />
              <div className="flex gap-2 -mt-2">
                {(["m²/s","ft²/s"] as FlowUnit[]).map(u => (
                  <Btn key={u} label={u} active={flowUnit === u} onClick={() => {
                    const raw = parseFloat(q);
                    if (!isNaN(raw)) setQ(parseFloat((raw * toQSI[flowUnit] / toQSI[u]).toPrecision(6)).toString());
                    setFlowUnit(u);
                  }} />
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                q = Q / b  (flow rate per unit channel width)
              </p>
            </div>
          )}
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
        const hasAlt = !isNaN(result.alternateDepth);
        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Specific energy  E = y + V²/(2g)
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  E = {fmt(result.specificEnergy, 5)} m
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  depth y = {fmt(parseFloat(y) * toLm[lenUnit], 5)} m &nbsp;·&nbsp;
                  velocity head = {fmt(result.velocityHead, 5)} m
                </p>
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Specific energy quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "E [m]",            value: fmt(result.specificEnergy,  5) },
                    { label: "V²/(2g) [m]",      value: fmt(result.velocityHead,    5) },
                    { label: "Fr",               value: fmt(result.froudeNumber,    5) },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      y<sub>c</sub> [m]
                    </p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(result.criticalDepth, 5)}
                    </p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      E<sub>c</sub> [m]
                    </p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(result.criticalEnergy, 5)}
                    </p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      y' alternate [m]
                    </p>
                    <p className={`font-mono text-sm font-semibold ${hasAlt ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
                      {hasAlt ? fmt(result.alternateDepth, 5) : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* E-y diagram text summary */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">E-y diagram position:</p>
                <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex justify-between">
                    <span>Current state:</span>
                    <span className="font-mono">y = {fmt(parseFloat(y) * toLm[lenUnit], 4)} m, E = {fmt(result.specificEnergy, 5)} m</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Critical point (minimum E):</span>
                    <span className="font-mono">y<sub>c</sub> = {fmt(result.criticalDepth, 4)} m, E<sub>c</sub> = {fmt(result.criticalEnergy, 5)} m</span>
                  </div>
                  {hasAlt && (
                    <div className="flex justify-between">
                      <span>Alternate depth (same E):</span>
                      <span className="font-mono">y' = {fmt(result.alternateDepth, 5)} m</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Energy above minimum:</span>
                    <span className="font-mono">E − E<sub>c</sub> = {fmt(result.specificEnergy - result.criticalEnergy, 4)} m</span>
                  </div>
                </div>
              </div>

              {/* Flow regime banner */}
              <div className={`p-4 rounded-lg border ${froudeBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {Fr < 0.99
                    ? <>Subcritical — Fr = {fmt(Fr, 4)} &lt; 1 (y &gt; y<sub>c</sub>, upper branch of E-y curve)</>
                    : Fr > 1.01
                    ? <>Supercritical — Fr = {fmt(Fr, 4)} &gt; 1 (y &lt; y<sub>c</sub>, lower branch of E-y curve)</>
                    : <>Critical — Fr = {fmt(Fr, 4)} ≈ 1 (minimum energy point)</>}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.specificEnergy} />
              <CommonMistakes mistakes={commonMistakes.specificEnergy} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Specific energy definition:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>E = y + V²/(2g) = y + q²/(2g × y²)&nbsp;&nbsp;&nbsp;&nbsp;[m]</div>
              <div>V = q / y&nbsp;&nbsp;&nbsp;&nbsp;q = unit discharge [m²/s]</div>
              <div>Fr = V / √(g × y)&nbsp;&nbsp;&nbsp;&nbsp;[dimensionless]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Critical conditions (rectangular channel):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>y<sub>c</sub> = (q²/g)<sup>1/3</sup>&nbsp;&nbsp;&nbsp;&nbsp;critical depth</div>
              <div>E<sub>c</sub> = (3/2) × y<sub>c</sub>&nbsp;&nbsp;&nbsp;minimum specific energy</div>
              <div>Fr<sub>c</sub> = 1&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;critical Froude number</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Alternate depth:</p>
            <p>
              For a given specific energy E &gt; E<sub>c</sub> and flow rate q, two depths satisfy
              E = y + q²/(2gy²) — one subcritical (y &gt; y<sub>c</sub>) and one supercritical
              (y &lt; y<sub>c</sub>). These are called alternate depths. A hydraulic jump connects
              the supercritical depth to its sequent (conjugate) depth, not its alternate depth.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">E-y diagram key points:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Branch</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Depth</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Flow type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {([
                  { b: "Upper branch", d: <>y &gt; y<sub>c</sub></>,  f: "Subcritical (Fr < 1) — controlled from downstream" },
                  { b: "Vertex",       d: <>y = y<sub>c</sub></>,    f: "Critical (Fr = 1) — minimum energy" },
                  { b: "Lower branch", d: <>y &lt; y<sub>c</sub></>,  f: "Supercritical (Fr > 1) — controlled from upstream" },
                ] as { b: string; d: React.ReactNode; f: string }[]).map(({ b, d, f }) => (
                  <tr key={b}>
                    <td className="py-1.5 pr-4 font-semibold">{b}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{d}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{f}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <References refs={REFS_SPECIFIC_ENERGY} />
    </div>
  );
}
