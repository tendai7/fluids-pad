"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_HYDRAULIC_JUMP } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateHydraulicJump,
  generateHydraulicJumpSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit  = "m" | "mm" | "cm" | "ft";
type VelUnit  = "m/s" | "ft/s";
type InputMode = "velocity" | "froude";

const toLm:  Record<LenUnit, number>  = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048 };
const toVSI: Record<VelUnit, number>  = { "m/s": 1, "ft/s": 0.3048 };

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

export default function HydraulicJumpCalculator() {
  const [inputMode, setInputMode] = useState<InputMode>("velocity");
  const [y1,        setY1]        = useState("0.5");
  const [V1,        setV1]        = useState("5.0");
  const [Fr1,       setFr1]       = useState("3.0");
  const [width,     setWidth]     = useState("2.0");
  const [lenUnit,   setLenUnit]   = useState<LenUnit>("m");
  const [velUnit,   setVelUnit]   = useState<VelUnit>("m/s");
  const [showWidth, setShowWidth] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateHydraulicJump> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateHydraulicJumpSteps> | null>(null);

  const handleClear = () => {
    setInputMode("velocity");
    setY1("");
    setV1("");
    setFr1("");
    setWidth("");
    setLenUnit("m");
    setVelUnit("m/s");
    setShowWidth(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const y1SI   = parseFloat(y1) * toLm[lenUnit];
    const Fr1Val = parseFloat(Fr1);
    const V1SI   = inputMode === "velocity"
      ? parseFloat(V1) * toVSI[velUnit]
      : Fr1Val * Math.sqrt(9.81 * y1SI);  // derive V₁ from Fr₁
    const wSI    = parseFloat(width) * toLm[lenUnit];

    if (isNaN(y1SI) || y1SI <= 0) newErrors.y1 = "Must be a positive number";
    if (inputMode === "velocity") {
      if (isNaN(V1SI) || V1SI <= 0) newErrors.V1 = "Must be a positive number";
    } else {
      if (isNaN(Fr1Val) || Fr1Val <= 0) newErrors.Fr1 = "Must be a positive number";
    }
    if (showWidth && (isNaN(wSI) || wSI <= 0)) newErrors.width = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        upstreamDepth:    y1SI,
        upstreamVelocity: V1SI,
        width: showWidth ? wSI : undefined,
      };
      const calc = calculateHydraulicJump(input);
      const stp  = generateHydraulicJumpSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const fr1Val = result?.upstreamFroude ?? 0;
  const jumpBg =
    !result?.isValidJump
      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
      : fr1Val < 1.7
      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      : fr1Val < 2.5
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      : fr1Val < 4.5
      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
      : fr1Val < 9.0
      ? "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800"
      : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Hydraulic Jump Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Sudden transition from supercritical (Fr &gt; 1) to subcritical flow in a rectangular channel.
          Computes sequent depth y<sub>2</sub>, downstream Fr<sub>2</sub>, energy loss ΔE,
          and classifies the jump type.
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
            Specify upstream conditions by:
          </p>
          <div className="flex gap-2 max-w-sm">
            <ModeBtn
              label={<>Velocity V<sub>1</sub></>}
              active={inputMode === "velocity"} onClick={() => setInputMode("velocity")} />
            <ModeBtn
              label={<>Froude number Fr<sub>1</sub></>}
              active={inputMode === "froude"} onClick={() => setInputMode("froude")} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Upstream depth y₁ */}
          <div>
            <InputField
              label="Upstream depth"
              symbol="y1"
              unit={lenUnit}
              value={y1} onChange={setY1}
              placeholder={lenUnit === "m" ? "0.5" : lenUnit === "mm" ? "500" : lenUnit === "cm" ? "50" : "1.64"}
              error={errors.y1} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                <Btn key={u} label={u} active={lenUnit === u} onClick={() => {
                  const conv = (v: string) => { const r = parseFloat(v); return isNaN(r) ? v : parseFloat((r * toLm[lenUnit] / toLm[u]).toPrecision(6)).toString(); };
                  setY1(conv(y1)); setWidth(conv(width)); setLenUnit(u);
                }} />
              ))}
            </div>
          </div>

          {/* V₁ or Fr₁ */}
          {inputMode === "velocity" ? (
            <div>
              <InputField
                label="Upstream velocity"
                symbol="V1"
                unit={velUnit}
                value={V1} onChange={setV1}
                placeholder={velUnit === "m/s" ? "5.0" : "16.4"}
                error={errors.V1} />
              <div className="flex gap-2 -mt-2">
                {(["m/s","ft/s"] as VelUnit[]).map(u => (
                  <Btn key={u} label={u} active={velUnit === u} onClick={() => {
                    const raw = parseFloat(V1);
                    if (!isNaN(raw)) setV1(parseFloat((raw * toVSI[velUnit] / toVSI[u]).toPrecision(6)).toString());
                    setVelUnit(u);
                  }} />
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Must give Fr<sub>1</sub> = V<sub>1</sub>/√(gy<sub>1</sub>) &gt; 1 for a valid jump
              </p>
            </div>
          ) : (
            <div>
              <InputField
                label="Upstream Froude number"
                symbol="Fr1"
                unit="dimensionless"
                value={Fr1} onChange={setFr1}
                error={errors.Fr1} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                Fr<sub>1</sub> &gt; 1 required · V<sub>1</sub> = Fr<sub>1</sub> × √(g × y<sub>1</sub>)
              </p>
            </div>
          )}
        </div>

        {/* Optional channel width */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="showWidth" checked={showWidth}
              onChange={(e) => setShowWidth(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="showWidth" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enter channel width b — enables Q and power dissipated
            </label>
          </div>
          {showWidth && (
            <div className="max-w-xs">
              <InputField label="Channel width" symbol="b" unit={lenUnit}
                value={width} onChange={setWidth}
                placeholder={lenUnit === "m" ? "2.0" : lenUnit === "mm" ? "2000" : "200"}
                error={errors.width} />
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
        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Sequent depth  y<sub>2</sub> (Belanger equation)
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  y<sub>2</sub> = {fmt(result.downstreamDepth, 5)} m
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  y<sub>2</sub>/y<sub>1</sub> = {fmt(result.depthRatio, 4)} &nbsp;·&nbsp;
                  V<sub>2</sub> = {fmt(result.downstreamVelocity, 5)} m/s &nbsp;·&nbsp;
                  Fr<sub>2</sub> = {fmt(result.downstreamFroude, 4)}
                </p>
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Hydraulic jump quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: <span>Fr<sub>1</sub></span>,    value: fmt(result.upstreamFroude,     5) },
                    { label: <span>y<sub>2</sub> [m]</span>, value: fmt(result.downstreamDepth,    5) },
                    { label: <span>Fr<sub>2</sub></span>,    value: fmt(result.downstreamFroude,   5) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">ΔE [m]</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(result.energyLoss, 5)}
                    </p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Energy dissipated</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(100 - result.energyEfficiency, 4)}%
                    </p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Jump length L<sub>j</sub> [m]</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(result.jumpLength, 4)}
                    </p>
                  </div>
                </div>
                {(result.flowRate !== undefined || result.powerDissipated !== undefined) && (
                  <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Q [m³/s]</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {result.flowRate !== undefined ? fmt(result.flowRate, 5) : "—"}
                      </p>
                    </div>
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Power dissipated [W/m]</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {result.powerDissipated !== undefined ? fmt(result.powerDissipated, 5) : "—"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Jump type banner */}
              <div className={`p-4 rounded-lg border ${jumpBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {result.isValidJump
                    ? result.jumpType.split(":")[0]
                    : "No hydraulic jump — Fr₁ < 1 (subcritical upstream)"}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.hydraulicJump} />
              <CommonMistakes mistakes={commonMistakes.hydraulicJump} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Belanger equation (rectangular channel):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>y<sub>2</sub> = (y<sub>1</sub>/2) × (√(1 + 8 Fr<sub>1</sub>²) − 1)</div>
              <div>V<sub>2</sub> = y<sub>1</sub> × V<sub>1</sub> / y<sub>2</sub>&nbsp;&nbsp;&nbsp;&nbsp;[continuity]</div>
              <div>ΔE = E<sub>1</sub> − E<sub>2</sub> = (y<sub>2</sub> − y<sub>1</sub>)³ / (4 y<sub>1</sub> y<sub>2</sub>)&nbsp;&nbsp;&nbsp;&nbsp;[energy loss]</div>
              <div>L<sub>j</sub> ≈ 6 × y<sub>2</sub>&nbsp;&nbsp;&nbsp;&nbsp;[jump length estimate, Peterka]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Jump type classification (Peterka):</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Fr<sub>1</sub></th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Jump type</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Energy loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { fr: "1.0–1.7", type: "Undular",    loss: "~0%",    note: "Surface ripples, poor dissipation" },
                  { fr: "1.7–2.5", type: "Weak",       loss: "5–15%",  note: "Smooth, low dissipation" },
                  { fr: "2.5–4.5", type: "Oscillating",loss: "15–45%", note: "Unsteady — avoid in design" },
                  { fr: "4.5–9.0", type: "Steady",     loss: "45–70%", note: "Best for stilling basins" },
                  { fr: "> 9.0",   type: "Strong",     loss: "> 70%",  note: "Very rough, churn" },
                ].map(({ fr, type, loss, note }) => (
                  <tr key={type}>
                    <td className="py-1.5 pr-4 font-mono">{fr}</td>
                    <td className="py-1.5 pr-4 font-semibold">{type}</td>
                    <td className="py-1.5">
                      <span className="font-mono mr-2">{loss}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{note}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Tailwater control:</p>
            <p>
              A hydraulic jump forms at the location where the sequent depth y<sub>2</sub> equals
              the actual tailwater depth. If tailwater &lt; y<sub>2</sub>, the jump sweeps
              downstream (swept-out jump). If tailwater &gt; y<sub>2</sub>, the jump is submerged
              and energy dissipation is reduced.
            </p>
          </div>
        </div>
      </Card>

      <References refs={REFS_HYDRAULIC_JUMP} />
    </div>
  );
}
