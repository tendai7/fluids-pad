"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_GRADUALLY_VARIED_FLOW } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateGraduallyVariedFlow,
  generateGraduallyVariedFlowSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type FlowUnit = "m³/s" | "L/s";

const toQSI: Record<FlowUnit, number> = { "m³/s": 1, "L/s": 1e-3 };

const N_PRESETS = [
  { label: "Concrete, trowel finish",  n: "0.012" },
  { label: "Concrete, float finish",   n: "0.015" },
  { label: "Earth, straight uniform",  n: "0.022" },
  { label: "Gravel bottom",            n: "0.025" },
  { label: "Natural channel, clean",   n: "0.030" },
  { label: "Natural, some weeds",      n: "0.035" },
] as const;

const SLOPE_TYPE_COLORS: Record<string, string> = {
  mild:     "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  steep:    "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
  critical: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
};

const SLOPE_BADGE_COLORS: Record<string, string> = {
  mild:     "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
  steep:    "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200",
  critical: "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200",
};

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

export default function GraduallyVariedFlowCalculator() {
  const [flowRate,     setFlowRate]     = useState("10");
  const [flowUnit,     setFlowUnit]     = useState<FlowUnit>("m³/s");
  const [channelWidth, setChannelWidth] = useState("5");
  const [bedSlope,     setBedSlope]     = useState("0.001");
  const [manningN,     setManningN]     = useState("0.013");
  const [selectedN,    setSelectedN]    = useState("");
  const [depth,        setDepth]        = useState("1.5");
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [result,       setResult]       = useState<ReturnType<typeof calculateGraduallyVariedFlow> | null>(null);
  const [steps,        setSteps]        = useState<ReturnType<typeof generateGraduallyVariedFlowSteps> | null>(null);

  const handleClear = () => {
    setFlowRate("");
    setFlowUnit("m³/s");
    setChannelWidth("");
    setBedSlope("");
    setManningN("");
    setSelectedN("");
    setDepth("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const QSI  = parseFloat(flowRate) * toQSI[flowUnit];
    const bVal = parseFloat(channelWidth);
    const S0   = parseFloat(bedSlope);
    const nVal = parseFloat(manningN);
    const yVal = parseFloat(depth);

    if (isNaN(QSI)  || QSI  <= 0) newErrors.flowRate    = "Must be a positive number";
    if (isNaN(bVal) || bVal <= 0) newErrors.channelWidth = "Must be a positive number";
    if (isNaN(S0)   || S0   <= 0) newErrors.bedSlope     = "Must be a positive number";
    if (isNaN(nVal) || nVal <= 0) newErrors.manningN     = "Must be a positive number";
    if (isNaN(yVal) || yVal <= 0) newErrors.depth        = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        flowRate:     QSI,
        channelWidth: bVal,
        bedSlope:     S0,
        manningN:     nVal,
        depth:        yVal,
      };
      const calc = calculateGraduallyVariedFlow(input);
      const stp  = generateGraduallyVariedFlowSteps(input, calc);
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
          Gradually Varied Flow Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Classify the water surface profile (M1–M3, S1–S3, C1/C3) and compute dy/dx
          for GVF in a rectangular channel using the standard GVF equation.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 rounded">
          Open Channel Flow · GVF
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Flow rate */}
          <div>
            <InputField label="Flow rate" symbol="Q" unit={flowUnit}
              value={flowRate} onChange={setFlowRate}
              placeholder={flowUnit === "m³/s" ? "10" : "10000"}
              error={errors.flowRate} />
            <div className="flex gap-2 -mt-2">
              {(["m³/s", "L/s"] as FlowUnit[]).map(u => (
                <Btn key={u} label={u} active={flowUnit === u} onClick={() => setFlowUnit(u)} />
              ))}
            </div>
          </div>

          {/* Channel width */}
          <div>
            <InputField label="Channel width (rectangular)" symbol="b" unit="m"
              value={channelWidth} onChange={setChannelWidth} error={errors.channelWidth} />
          </div>

          {/* Bed slope */}
          <div>
            <InputField label="Bed slope" symbol="S₀" unit="m/m"
              value={bedSlope} onChange={setBedSlope} error={errors.bedSlope} />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
              e.g. 0.001 = 1 m drop per 1000 m
            </p>
          </div>

          {/* Manning's n */}
          <div>
            <InputField label="Manning's roughness" symbol="n" unit="dimensionless"
              value={manningN} onChange={setManningN} error={errors.manningN} />
            <div className="flex items-center gap-2 -mt-2">
              <select
                value={selectedN}
                onChange={(e) => {
                  setSelectedN(e.target.value);
                  const p = N_PRESETS.find(x => x.label === e.target.value);
                  if (p) setManningN(p.n);
                }}
                className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">n preset…</option>
                {N_PRESETS.map(p => (
                  <option key={p.label} value={p.label}>{p.label} — n = {p.n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Current depth */}
          <div>
            <InputField label="Current flow depth" symbol="y" unit="m"
              value={depth} onChange={setDepth} error={errors.depth} />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
              Depth at the section of interest — determines profile zone
            </p>
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
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Water Surface Profile
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {result.profile}
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  dy/dx = {fmt(result.dydx, 4)} m/m
                  {" · "}
                  {result.dydx > 0 ? "depth rising" : "depth falling"} along channel
                </p>
              </div>
              <span className={`mt-1 px-3 py-1 rounded text-sm font-semibold capitalize ${SLOPE_BADGE_COLORS[result.slopeType]}`}>
                {result.slopeType} slope
              </span>
            </div>

            {/* Profile description banner */}
            <div className={`p-4 rounded-lg border ${SLOPE_TYPE_COLORS[result.slopeType]}`}>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">
                {result.profile} — {result.slopeType.charAt(0).toUpperCase() + result.slopeType.slice(1)} slope
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{result.profileDescription}</p>
            </div>

            {/* Unit grid */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                GVF flow quantities
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: <span>y<sub>n</sub> [m]</span>, value: fmt(result.normalDepth,   4) },
                  { label: <span>y<sub>c</sub> [m]</span>, value: fmt(result.criticalDepth,  4) },
                  { label: <span>Fr</span>,                value: fmt(result.froudeNumber,   4) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: <span>S<sub>f</sub> [m/m]</span>, value: result.frictionSlope.toExponential(3) },
                  { label: <span>S<sub>c</sub> [m/m]</span>, value: result.criticalSlope.toExponential(3) },
                  { label: "dy/dx [m/m]",                    value: result.dydx.toExponential(3) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Froude banner */}
            {(() => {
              const Fr = result.froudeNumber;
              const bg = Fr < 0.99
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                : Fr > 1.01
                ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
              return (
                <div className={`p-4 rounded-lg border ${bg}`}>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {Fr < 0.99
                      ? <>Subcritical flow — Fr = {fmt(Fr, 4)} &lt; 1</>
                      : Fr > 1.01
                      ? <>Supercritical flow — Fr = {fmt(Fr, 4)} &gt; 1</>
                      : <>Critical flow — Fr = {fmt(Fr, 4)} ≈ 1</>}
                  </p>
                </div>
              );
            })()}

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.graduallyVariedFlow} />
            <CommonMistakes mistakes={commonMistakes.graduallyVariedFlow} />
          </div>
        </ResultsCard>
      )}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">GVF equation:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>dy/dx = (S<sub>0</sub> − S<sub>f</sub>) / (1 − Fr²)</div>
              <div>S<sub>f</sub> = (nV / R<sup>2/3</sup>)²&nbsp;&nbsp;&nbsp;&nbsp;[Manning's friction slope]</div>
              <div>S<sub>c</sub> = (nV<sub>c</sub> / R<sub>c</sub><sup>2/3</sup>)²&nbsp;&nbsp;[critical slope at y = y<sub>c</sub>]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>S<sub>0</sub> = channel bed slope [m/m]</li>
              <li>S<sub>f</sub> = friction slope from Manning's equation at depth y [m/m]</li>
              <li>S<sub>c</sub> = critical slope — S<sub>0</sub> at which y<sub>n</sub> = y<sub>c</sub> [m/m]</li>
              <li>Fr = V/√(gy) — Froude number at depth y (rectangular channel)</li>
              <li>y<sub>n</sub> = normal depth — uniform flow depth from Manning's equation [m]</li>
              <li>y<sub>c</sub> = critical depth — depth at Fr = 1 [m]</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Profile classification:</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">Slope</th>
                  <th className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">Condition</th>
                  <th className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">Zone 1</th>
                  <th className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">Zone 2</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Zone 3</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                <tr>
                  <td className="py-1.5 pr-3 font-medium">Mild</td>
                  <td className="py-1.5 pr-3 text-gray-500 dark:text-gray-400">
                    S<sub>0</sub> &lt; S<sub>c</sub> (y<sub>n</sub> &gt; y<sub>c</sub>)
                  </td>
                  <td className="py-1.5 pr-3 font-mono">M1 — y &gt; y<sub>n</sub></td>
                  <td className="py-1.5 pr-3 font-mono">M2 — y<sub>c</sub> &lt; y &lt; y<sub>n</sub></td>
                  <td className="py-1.5 font-mono">M3 — y &lt; y<sub>c</sub></td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 font-medium">Steep</td>
                  <td className="py-1.5 pr-3 text-gray-500 dark:text-gray-400">
                    S<sub>0</sub> &gt; S<sub>c</sub> (y<sub>n</sub> &lt; y<sub>c</sub>)
                  </td>
                  <td className="py-1.5 pr-3 font-mono">S1 — y &gt; y<sub>c</sub></td>
                  <td className="py-1.5 pr-3 font-mono">S2 — y<sub>n</sub> &lt; y &lt; y<sub>c</sub></td>
                  <td className="py-1.5 font-mono">S3 — y &lt; y<sub>n</sub></td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 font-medium">Critical</td>
                  <td className="py-1.5 pr-3 text-gray-500 dark:text-gray-400">
                    S<sub>0</sub> = S<sub>c</sub> (y<sub>n</sub> = y<sub>c</sub>)
                  </td>
                  <td className="py-1.5 pr-3 font-mono">C1 — y &gt; y<sub>c</sub></td>
                  <td className="py-1.5 pr-3 font-mono">—</td>
                  <td className="py-1.5 font-mono">C3 — y &lt; y<sub>c</sub></td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            GVF occurs when depth changes gradually along the channel. The profile type depends
            on the relative position of y to y<sub>n</sub> and y<sub>c</sub>. M1 (backwater)
            and M2 (drawdown) are most common in practice. Near Fr = 1 the GVF equation has a
            singularity — a hydraulic jump or free overfall occurs instead of a smooth profile.
          </p>
        </div>
      </Card>

      <References refs={REFS_GRADUALLY_VARIED_FLOW} />
    </div>
  );
}
