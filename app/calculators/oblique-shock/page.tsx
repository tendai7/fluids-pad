"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_OBLIQUE_SHOCK } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateObliqueShock,
  generateObliqueShockSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

const GAS_PRESETS = [
  { label: "Air",      gamma: "1.400" },
  { label: "Nitrogen", gamma: "1.400" },
  { label: "Helium",   gamma: "1.667" },
  { label: "Argon",    gamma: "1.667" },
  { label: "CO₂",      gamma: "1.289" },
] as const;

type Mode = "beta" | "theta";

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

function ModeBtn({ label, active, onClick }: { label: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${active
        ? "bg-red-600 text-white"
        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
      {label}
    </button>
  );
}

function SolutionGrid({ sol, label }: { sol: NonNullable<ReturnType<typeof calculateObliqueShock>["primary"]>; label: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
          sol.type === "weak"
            ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
            : sol.type === "strong"
            ? "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200"
            : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
        } ${sol.isSupersonic ? "" : "italic"}`}>
          {sol.type} · M₂ {sol.isSupersonic ? "> 1 (supersonic)" : "< 1 (subsonic)"}
        </span>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
        {[
          { label: "β [deg]",  value: fmt(sol.beta)  },
          { label: "θ [deg]",  value: fmt(sol.theta) },
          { label: "M₂",       value: fmt(sol.mach2) },
        ].map(({ label: l, value }, i) => (
          <div key={i} className="px-3 py-2.5 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{l}</p>
            <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
        {[
          { label: "P₂/P₁",           value: fmt(sol.pressureRatio)      },
          { label: "T₂/T₁",           value: fmt(sol.temperatureRatio)   },
          { label: "ρ₂/ρ₁",           value: fmt(sol.densityRatio)       },
        ].map(({ label: l, value }, i) => (
          <div key={i} className="px-3 py-2.5 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{l}</p>
            <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
        {[
          { label: "M₁ₙ",             value: fmt(sol.normalMach1)        },
          { label: "M₂ₙ",             value: fmt(sol.normalMach2)        },
          { label: <span>P₀₂/P₀₁</span>, value: fmt(sol.totalPressureRatio) },
        ].map(({ label: l, value }, i) => (
          <div key={i} className="px-3 py-2.5 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{l}</p>
            <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ObliqueShockCalculator() {
  const [mode,       setMode]       = useState<Mode>("beta");
  const [mach1,      setMach1]      = useState("2.5");
  const [angle,      setAngle]      = useState("35");
  const [gamma,      setGamma]      = useState("1.4");
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const [result,     setResult]     = useState<ReturnType<typeof calculateObliqueShock> | null>(null);
  const [steps,      setSteps]      = useState<ReturnType<typeof generateObliqueShockSteps> | null>(null);

  const handleClear = () => {
    setMode("beta");
    setMach1("");
    setAngle("");
    setGamma("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const M1   = parseFloat(mach1);
    const gVal = parseFloat(gamma);
    const ang  = parseFloat(angle);

    if (isNaN(M1)   || M1   <= 1) newErrors.mach1 = "Must be > 1";
    if (isNaN(gVal) || gVal <= 1) newErrors.gamma  = "Must be > 1";
    if (isNaN(ang) || ang <= 0 || (mode === "beta" ? ang > 90 : ang >= 90))
      newErrors.angle = mode === "beta"
        ? "Wave angle β must be between 0° and 90°"
        : "Deflection angle θ must be between 0° and 90°";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = { mach1: M1, gamma: gVal, mode, angle: ang };
      const calc  = calculateObliqueShock(input);
      const stp   = generateObliqueShockSteps(input, calc);
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
          Oblique Shock Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Post-shock properties for an oblique shock. Solve given β (wave angle) or θ
          (deflection angle) — the θ mode returns both the weak and strong solutions.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
          Compressible Flow · Oblique Shock
        </span>
      </div>

      {/* Gas presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Gas presets — click to fill γ
        </h2>
        <div className="flex flex-wrap gap-2">
          {GAS_PRESETS.map((p) => (
            <button key={p.label}
              onClick={() => setGamma(p.gamma)}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
              {p.label} (γ = {p.gamma})
            </button>
          ))}
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Mode toggle */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Input angle type:</p>
          <div className="flex gap-2 max-w-sm">
            <ModeBtn label="Given β (wave angle)" active={mode === "beta"}
              onClick={() => { setMode("beta"); setAngle("35"); }} />
            <ModeBtn label="Given θ (deflection angle)" active={mode === "theta"}
              onClick={() => { setMode("theta"); setAngle("15"); }} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* M₁ */}
          <div>
            <InputField label="Upstream Mach number" symbol="M₁" unit="dimensionless"
              value={mach1} onChange={setMach1} error={errors.mach1} />
            <div className="flex gap-2 -mt-2">
              {["1.5", "2.0", "2.5", "3.0", "4.0", "5.0"].map(v => (
                <Btn key={v} label={v} active={mach1 === v} onClick={() => setMach1(v)} />
              ))}
            </div>
          </div>

          {/* Angle input */}
          <div>
            {mode === "beta" ? (
              <>
                <InputField label="Shock wave angle" symbol="β" unit="degrees"
                  value={angle} onChange={setAngle} error={errors.angle} />
                <div className="flex gap-2 -mt-2">
                  {["20", "30", "40", "50", "60", "90"].map(v => (
                    <Btn key={v} label={`${v}°`} active={angle === v} onClick={() => setAngle(v)} />
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  β from μ (Mach angle) to 90° — β = 90° gives normal shock
                </p>
              </>
            ) : (
              <>
                <InputField label="Flow deflection angle" symbol="θ" unit="degrees"
                  value={angle} onChange={setAngle} error={errors.angle} />
                <div className="flex gap-2 -mt-2">
                  {["5", "10", "15", "20", "25"].map(v => (
                    <Btn key={v} label={`${v}°`} active={angle === v} onClick={() => setAngle(v)} />
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Must be below θ<sub>max</sub> for attached shock — both weak and strong β are computed
                </p>
              </>
            )}
          </div>

          {/* γ */}
          <div>
            <InputField label="Specific heat ratio" symbol="γ" unit="dimensionless"
              value={gamma} onChange={setGamma} error={errors.gamma} />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
              c<sub>p</sub>/c<sub>v</sub> — use gas presets above
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

            {/* Primary header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  {mode === "beta" ? "Flow Deflection  θ" : "Shock Wave Angle  β (weak)"}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {mode === "beta"
                    ? `θ = ${fmt(result.primary.theta)}°`
                    : `β = ${fmt(result.primary.beta)}°`}
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  μ = {fmt(result.machAngle)}° (Mach angle)
                  {" · "}
                  θ<sub>max</sub> = {fmt(result.maxDeflectionAngle)}°
                  {result.isDetached && <span className="text-red-500 font-medium"> — DETACHED (bow shock)</span>}
                </p>
              </div>
            </div>

            {/* Detachment warning */}
            {result.isDetached && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="font-semibold text-red-800 dark:text-red-300 mb-1">
                  Shock detached — θ &gt; θ<sub>max</sub> = {fmt(result.maxDeflectionAngle)}°
                </p>
                <p className="text-sm text-red-700 dark:text-red-400">
                  The deflection angle exceeds the maximum for M₁ = {mach1}. A planar oblique shock
                  cannot exist — a detached bow shock forms. Results shown are at the detachment
                  condition (θ<sub>max</sub>).
                </p>
              </div>
            )}

            {/* Reference quantities */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Reference quantities for M₁ = {mach1}
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "Mach angle μ [deg]",                                        value: fmt(result.machAngle)          },
                  { label: <span>θ<sub>max</sub> [deg]</span>,                         value: fmt(result.maxDeflectionAngle) },
                  { label: <span>β at θ<sub>max</sub> [deg]</span>,                    value: fmt(result.betaAtThetaMax) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Weak solution */}
            <SolutionGrid
              sol={result.primary}
              label={mode === "theta" ? "Weak solution (low β, M₂ often supersonic)" : "Solution"} />

            {/* Strong solution — only in theta-mode */}
            {result.strong && (
              <SolutionGrid
                sol={result.strong}
                label="Strong solution (high β, M₂ always subsonic)" />
            )}

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.obliqueShock} />
            <CommonMistakes mistakes={commonMistakes.obliqueShock} />
          </div>
        </ResultsCard>
      )}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Key relations:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>M₁ₙ = M₁ sin(β)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[normal component]</div>
              <div>tan(θ) = 2cot(β)(M₁²sin²β−1) / (M₁²(γ+cos2β)+2)&nbsp;&nbsp;&nbsp;[θ-β-M relation]</div>
              <div>M₂ = M₂ₙ / sin(β − θ)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[downstream Mach]</div>
            </div>
            <p className="mt-1">
              P₂/P₁, T₂/T₁, ρ₂/ρ₁, P₀₂/P₀₁ are computed from normal shock
              Rankine-Hugoniot relations applied to M₁ₙ (not M₁).
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Weak and strong solutions:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>For each θ &lt; θ<sub>max</sub> there are <strong>two</strong> β: one below β<sub>max</sub> (weak) and one above (strong)</li>
              <li><strong>Weak shock</strong> — smaller β, downstream flow usually supersonic (M₂ &gt; 1)</li>
              <li><strong>Strong shock</strong> — larger β, downstream flow always subsonic (M₂ &lt; 1)</li>
              <li>Weak solution is the physically realised case on wedges in free-stream supersonic flow</li>
              <li>For θ &gt; θ<sub>max</sub> the shock detaches — a curved bow shock forms ahead of the body</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Detachment angles θ<sub>max</sub> — air (γ = 1.4):</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  {(["M₁", "μ [deg]"] as React.ReactNode[])
                    .concat([<span key="t">θ<sub>max</sub> [deg]</span>, <span key="b">β at θ<sub>max</sub> [deg]</span>, <span key="m">M₂ at θ<sub>max</sub></span>])
                    .map((h, i) => (
                    <th key={i} className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { M: "1.5", mu: "41.8", thMax: "12.1", beta: "66.6", M2: "0.921" },
                  { M: "2.0", mu: "30.0", thMax: "23.0", beta: "64.7", M2: "0.924" },
                  { M: "2.5", mu: "23.6", thMax: "29.8", beta: "64.8", M2: "0.940" },
                  { M: "3.0", mu: "19.5", thMax: "34.1", beta: "65.2", M2: "0.954" },
                  { M: "4.0", mu: "14.5", thMax: "38.8", beta: "66.1", M2: "0.972" },
                  { M: "5.0", mu: "11.5", thMax: "41.1", beta: "66.6", M2: "0.981" },
                ].map(({ M, mu, thMax, beta, M2 }) => (
                  <tr key={M}>
                    <td className="py-1.5 pr-3 font-mono">{M}</td>
                    <td className="py-1.5 pr-3 font-mono">{mu}</td>
                    <td className="py-1.5 pr-3 font-mono">{thMax}</td>
                    <td className="py-1.5 pr-3 font-mono">{beta}</td>
                    <td className="py-1.5 font-mono">{M2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            Oblique shocks occur on wedges, compression corners, and inlet ramps in supersonic
            flow. The shock angle β always lies between the Mach angle μ = arcsin(1/M₁) and 90°.
            Unlike normal shocks, the downstream flow can remain supersonic (weak solution).
            Total pressure loss P₀₂/P₀₁ is smaller than the equivalent normal shock — this is
            why supersonic inlets use ramps to process the flow through weaker oblique shocks
            rather than one strong normal shock.
          </p>
        </div>
      </Card>

      <References refs={REFS_OBLIQUE_SHOCK} />
    </div>
  );
}
