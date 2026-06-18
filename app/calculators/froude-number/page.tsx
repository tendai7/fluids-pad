"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_FROUDE_NUMBER } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateFroudeNumber,
  generateFroudeNumberSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type VelUnit = "m/s" | "ft/s" | "km/h";
type LenUnit = "m" | "mm" | "cm" | "ft";

const toMS: Record<VelUnit, number> = { "m/s": 1, "ft/s": 0.3048, "km/h": 1/3.6 };
const toLm: Record<LenUnit, number> = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048 };

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

export default function FroudeNumberCalculator() {
  const [velocity, setVelocity] = useState("2");
  const [velUnit,  setVelUnit]  = useState<VelUnit>("m/s");
  const [length,   setLength]   = useState("1");
  const [lenUnit,  setLenUnit]  = useState<LenUnit>("m");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateFroudeNumber> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateFroudeNumberSteps> | null>(null);
  const [inputVSI, setInputVSI] = useState<number | null>(null);

  const handleClear = () => {
    setVelocity("");
    setVelUnit("m/s");
    setLength("");
    setLenUnit("m");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const vRaw = parseFloat(velocity);
    const lRaw = parseFloat(length);

    if (isNaN(vRaw) || vRaw < 0)  newErrors.velocity = "Must be non-negative";
    if (isNaN(lRaw) || lRaw <= 0) newErrors.length   = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const vSI = vRaw * toMS[velUnit];
    const lSI = lRaw * toLm[lenUnit];
    setInputVSI(vSI);

    try {
      const input = { velocity: vSI, length: lSI };
      const calc  = calculateFroudeNumber(input);
      const stp   = generateFroudeNumberSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const regimeBg = result?.regime === "subcritical"
    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
    : result?.regime === "critical"
    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Froude Number Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Fr = V / √(gL) — ratio of flow velocity to shallow-water wave celerity.
          Determines whether open-channel flow is subcritical, critical, or supercritical.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Mechanics II
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Velocity */}
          <div>
            <InputField label="Flow velocity" symbol="V" unit={velUnit}
              value={velocity} onChange={setVelocity}
              placeholder={velUnit === "m/s" ? "2" : velUnit === "ft/s" ? "6.56" : "7.2"}
              error={errors.velocity} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m/s", "ft/s", "km/h"] as VelUnit[]).map(u => (
                <Btn key={u} label={u} active={velUnit === u} onClick={() => {
                  const raw = parseFloat(velocity);
                  if (!isNaN(raw)) setVelocity(parseFloat((raw * toMS[velUnit] / toMS[u]).toPrecision(6)).toString());
                  setVelUnit(u);
                }} />
              ))}
            </div>
          </div>

          {/* Characteristic length / depth */}
          <div>
            <InputField label="Characteristic depth" symbol="L" unit={lenUnit}
              value={length} onChange={setLength}
              placeholder={lenUnit === "m" ? "1" : lenUnit === "mm" ? "1000" : lenUnit === "cm" ? "100" : "3.28"}
              error={errors.length} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m", "mm", "cm", "ft"] as LenUnit[]).map(u => (
                <Btn key={u} label={u} active={lenUnit === u} onClick={() => {
                  const raw = parseFloat(length);
                  if (!isNaN(raw)) setLength(parseFloat((raw * toLm[lenUnit] / toLm[u]).toPrecision(6)).toString());
                  setLenUnit(u);
                }} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Use hydraulic depth y = A/T for non-rectangular channels, or flow depth for rectangular.
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
      {result && steps && inputVSI !== null && (() => {
        const regime = result.regime.charAt(0).toUpperCase() + result.regime.slice(1);
        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Froude number  Fr = V / √(gL)
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  Fr = {fmt(result.froudeNumber, 5)}
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  Wave celerity c = √(gL) = {fmt(result.waveCelerity, 5)} m/s
                </p>
              </div>

              {/* Related quantities */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Related quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "V (m/s)",          value: fmt(inputVSI, 5)               },
                    { label: "c = √(gL) (m/s)",  value: fmt(result.waveCelerity, 5)    },
                    { label: "Fr = V/c",          value: fmt(result.froudeNumber, 5)    },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Regime banner */}
              <div className={`p-4 rounded-lg border ${regimeBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  Flow Regime: {regime}  (Fr = {fmt(result.froudeNumber, 4)})
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.froudeNumber} />
              <CommonMistakes mistakes={commonMistakes.froudeNumber} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Froude number and wave celerity:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Fr = V / c = V / √(gL)&nbsp;&nbsp;&nbsp;&nbsp;[dimensionless]</div>
              <div>c = √(gL)&nbsp;&nbsp;&nbsp;&nbsp;[m/s]&nbsp;&nbsp;(shallow-water wave speed)</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              L is the hydraulic depth = A/T for any cross-section (A = flow area, T = top width).
              For rectangular channels, hydraulic depth = flow depth y.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Flow regime classification:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Regime</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Fr</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Characteristics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ["Subcritical",   "Fr < 1",  "Slow / tranquil. Waves travel upstream & downstream. Downstream controls."],
                  ["Critical",      "Fr = 1",  "Maximum discharge for given specific energy. Boundary condition for transitions."],
                  ["Supercritical", "Fr > 1",  "Fast / rapid. Waves only travel downstream. Upstream conditions control."],
                ].map(([r, fr, desc]) => (
                  <tr key={r}>
                    <td className="py-1.5 pr-4 font-medium">{r}</td>
                    <td className="py-1.5 pr-4 font-mono">{fr}</td>
                    <td className="py-1.5 text-xs">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Common applications:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Open-channel flow: rivers, canals, spillways</li>
              <li>Hydraulic jump: transition from supercritical to subcritical (Fr₁ → Fr₂)</li>
              <li>Ship hull resistance: Fr based on hull length L</li>
              <li>Critical depth calculation: y<sub>c</sub> where Fr = 1</li>
              <li>Weir and sluice gate analysis</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Fr = Froude number (dimensionless)</li>
              <li>V = mean flow velocity [m/s]</li>
              <li>c = wave celerity = √(gL) [m/s]</li>
              <li>g = gravitational acceleration = 9.81 m/s²</li>
              <li>L = characteristic length (hydraulic depth or flow depth) [m]</li>
            </ul>
          </div>
        </div>
      </Card>

      <References refs={REFS_FROUDE_NUMBER} />
    </div>
  );
}
