"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_FRICTION_FACTOR } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateFrictionFactor,
  generateFrictionFactorSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

// ── Pipe material roughness presets (absolute roughness in mm) ────────────────
const MATERIAL_PRESETS = [
  { label: "Drawn tubing / PVC / Glass",  eps_mm: 0.0015 },
  { label: "Commercial steel",            eps_mm: 0.046  },
  { label: "Welded steel",                eps_mm: 0.046  },
  { label: "Galvanized iron",             eps_mm: 0.15   },
  { label: "Cast iron",                   eps_mm: 0.26   },
  { label: "Concrete (smooth)",           eps_mm: 0.3    },
  { label: "Riveted steel",               eps_mm: 2.0    },
] as const;

function fmt(n: number, sig = 5) { return parseFloat(n.toPrecision(sig)).toString(); }

type HelperUnit = "mm" | "m" | "in";
const HELPER_TO_M: Record<HelperUnit, number> = { mm: 0.001, m: 1, in: 0.0254 };

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

export default function FrictionFactorCalculator() {
  const [reynoldsNumber,    setReynoldsNumber]    = useState("50000");
  const [relativeRoughness, setRelativeRoughness] = useState("0.0002");

  // Roughness helper state
  const [helperEps,        setHelperEps]        = useState("");
  const [helperDiam,       setHelperDiam]       = useState("");
  const [helperUnit,       setHelperUnit]       = useState<HelperUnit>("mm");
  const [selectedMaterial, setSelectedMaterial] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateFrictionFactor> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateFrictionFactorSteps> | null>(null);

  // Auto-compute ε/D from helper inputs
  const applyHelperEpsD = (epsStr: string, diamStr: string) => {
    const eps  = parseFloat(epsStr);
    const diam = parseFloat(diamStr);
    if (!isNaN(eps) && !isNaN(diam) && diam > 0 && eps >= 0) {
      const epsMeter  = eps  * HELPER_TO_M[helperUnit];
      const diamMeter = diam * HELPER_TO_M[helperUnit];
      setRelativeRoughness((epsMeter / diamMeter).toExponential(4));
    }
  };

  const handleEpsChange = (val: string) => {
    setHelperEps(val);
    applyHelperEpsD(val, helperDiam);
  };

  const handleDiamChange = (val: string) => {
    setHelperDiam(val);
    applyHelperEpsD(helperEps, val);
  };

  const applyMaterial = (eps_mm: number) => {
    const epsInUnit = (eps_mm * 0.001) / HELPER_TO_M[helperUnit];
    const epsStr = helperUnit === "mm" ? eps_mm.toString() : fmt(epsInUnit, 4);
    setHelperEps(epsStr);
    applyHelperEpsD(epsStr, helperDiam);
  };

  const handleHelperUnitChange = (newUnit: HelperUnit) => {
    const eps  = parseFloat(helperEps);
    const diam = parseFloat(helperDiam);
    if (!isNaN(eps))  setHelperEps(fmt(eps  * HELPER_TO_M[helperUnit] / HELPER_TO_M[newUnit]));
    if (!isNaN(diam)) setHelperDiam(fmt(diam * HELPER_TO_M[helperUnit] / HELPER_TO_M[newUnit]));
    setHelperUnit(newUnit);
  };

  const handleClear = () => {
    setReynoldsNumber("");
    setRelativeRoughness("");
    setHelperEps("");
    setHelperDiam("");
    setHelperUnit("mm");
    setSelectedMaterial("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const re = parseFloat(reynoldsNumber);
    const eD = parseFloat(relativeRoughness);

    if (isNaN(re) || re <= 0)   newErrors.reynoldsNumber   = "Must be a positive number";
    if (isNaN(eD) || eD < 0)    newErrors.relativeRoughness = "Must be ≥ 0";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = { reynoldsNumber: re, relativeRoughness: eD };
      const calc  = calculateFrictionFactor(input);
      const stp   = generateFrictionFactorSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const regimeBg = result?.regime === "laminar"
    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
    : result?.regime === "transitional"
    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Friction Factor Calculator (Moody)
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Darcy-Weisbach friction factor via Moody chart correlations.
          Laminar: f = 64/Re · Turbulent: Swamee-Jain approximation of Colebrook-White.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Mechanics II
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <InputField label="Reynolds number" symbol="Re" unit="dimensionless"
            value={reynoldsNumber} onChange={setReynoldsNumber} error={errors.reynoldsNumber} />

          <InputField label="Relative roughness" symbol="ε/D" unit="dimensionless"
            value={relativeRoughness} onChange={setRelativeRoughness} error={errors.relativeRoughness} />
        </div>

        {/* ε/D helper */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
            Optional — compute ε/D from pipe material &amp; diameter (auto-fills Relative roughness above)
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ε input with material dropdown below */}
            <div>
              <InputField
                label="Absolute roughness" symbol="ε" unit={helperUnit}
                value={helperEps} onChange={handleEpsChange}
                placeholder={helperUnit === "mm" ? "0.046" : helperUnit === "in" ? "0.0018" : "0.000046"}
              />
              <div className="flex flex-wrap items-center gap-2 -mt-2">
                <select
                  value={selectedMaterial}
                  onChange={(e) => {
                    const lbl = e.target.value;
                    setSelectedMaterial(lbl);
                    const mat = MATERIAL_PRESETS.find((p) => p.label === lbl);
                    if (mat) applyMaterial(mat.eps_mm);
                  }}
                  className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Material preset…</option>
                  {MATERIAL_PRESETS.map((p) => {
                    const epsVal = fmt((p.eps_mm * 0.001) / HELPER_TO_M[helperUnit], 3);
                    return (
                      <option key={p.label} value={p.label}>
                        {p.label} — ε = {epsVal} {helperUnit}
                      </option>
                    );
                  })}
                </select>
                {(["mm", "in", "m"] as HelperUnit[]).map((u) => (
                  <Btn key={u} label={u} active={helperUnit === u} onClick={() => handleHelperUnitChange(u)} />
                ))}
              </div>
            </div>

            {/* D input */}
            <InputField
              label="Pipe diameter" symbol="D" unit={helperUnit}
              value={helperDiam} onChange={handleDiamChange}
              placeholder={helperUnit === "mm" ? "100" : helperUnit === "in" ? "4" : "0.1"}
            />
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
        const f        = result.frictionFactor;
        const fFanning = result.fanningFactor;
        const invSqrtF = 1 / Math.sqrt(f);
        const regime   = result.regime.charAt(0).toUpperCase() + result.regime.slice(1);

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Darcy friction factor  f
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {fmt(f, 6)}
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  Fanning: {fmt(fFanning, 5)}
                </p>
              </div>

              {/* Regime badge */}
              <div className={`p-4 rounded-lg border ${regimeBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  Flow Regime: {regime}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Method: {result.method}</p>
              </div>

              {/* Related quantities */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Related quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "Darcy  f",          value: fmt(f, 6)        },
                    { label: "Fanning  f/4",       value: fmt(fFanning, 5) },
                    { label: "1/√f",               value: fmt(invSqrtF, 5) },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.frictionFactor} />
              <CommonMistakes mistakes={commonMistakes.frictionFactor} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Laminar flow (Re &lt; 2 300):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              f = 64 / Re
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Turbulent flow — Swamee-Jain approximation:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              f = 0.25 / [log₁₀(ε/D / 3.7 + 5.74 / Re^0.9)]²
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Valid for 10⁻⁶ ≤ ε/D ≤ 10⁻², 5 000 ≤ Re ≤ 10⁸. Error within ±3% of Colebrook-White.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Exact implicit form (Colebrook-White):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              1/√f = -2 log₁₀(ε/D / 3.7 + 2.51 / (Re × √f))
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Requires iteration (3–10 passes from a Swamee-Jain starting guess).
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Flow regime classification:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Regime</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Re range</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Formula</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                <tr><td className="py-1.5 pr-4">Laminar</td>     <td className="py-1.5 pr-4">&lt; 2 300</td>       <td className="py-1.5 font-mono">f = 64/Re</td></tr>
                <tr><td className="py-1.5 pr-4">Transitional</td><td className="py-1.5 pr-4">2 300 – 4 000</td>    <td className="py-1.5">Uncertain — avoid if possible</td></tr>
                <tr><td className="py-1.5 pr-4">Turbulent</td>   <td className="py-1.5 pr-4">&gt; 4 000</td>       <td className="py-1.5 font-mono">Colebrook-White / Swamee-Jain</td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Common pipe roughness ε:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Material</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">ε (mm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {MATERIAL_PRESETS.map(({ label, eps_mm }) => (
                  <tr key={label}>
                    <td className="py-1.5 pr-4">{label}</td>
                    <td className="py-1.5 font-mono">{eps_mm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>f = Darcy-Weisbach friction factor (= 4 × Fanning friction factor)</li>
              <li>Re = ρVD/μ — Reynolds number</li>
              <li>ε/D = relative roughness (absolute roughness ÷ pipe diameter)</li>
            </ul>
          </div>
        </div>
      </Card>

      <References refs={REFS_FRICTION_FACTOR} />
    </div>
  );
}
