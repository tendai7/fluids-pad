"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_PRANDTL_MEYER } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculatePrandtlMeyerExpansion,
  generatePrandtlMeyerExpansionSteps,
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

export default function PrandtlMeyerExpansionCalculator() {
  const [mach1,           setMach1]           = useState("2.0");
  const [gamma,           setGamma]           = useState("1.4");
  const [deflectionAngle, setDeflectionAngle] = useState("10");
  const [errors,          setErrors]          = useState<Record<string, string>>({});
  const [result,          setResult]          = useState<ReturnType<typeof calculatePrandtlMeyerExpansion> | null>(null);
  const [steps,           setSteps]           = useState<ReturnType<typeof generatePrandtlMeyerExpansionSteps> | null>(null);

  const handleClear = () => {
    setMach1("");
    setGamma("");
    setDeflectionAngle("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const M1  = parseFloat(mach1);
    const g   = parseFloat(gamma);
    const th  = parseFloat(deflectionAngle);

    if (isNaN(M1)  || M1  <= 1) newErrors.mach1           = "Must be > 1 (supersonic)";
    if (isNaN(g)   || g   <= 1) newErrors.gamma            = "Must be > 1";
    if (isNaN(th)  || th  <= 0) newErrors.deflectionAngle  = "Must be > 0°";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = { mach1: M1, gamma: g, deflectionAngle: th };
      const calc  = calculatePrandtlMeyerExpansion(input);
      const stp   = generatePrandtlMeyerExpansionSteps(input, calc);
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
          Prandtl-Meyer Expansion Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Isentropic supersonic expansion around a convex corner. Computes M₂ via the
          Prandtl-Meyer function, isentropic property ratios, and Mach angles.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
          Compressible Flow · Expansion
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

          {/* γ */}
          <div>
            <InputField label="Specific heat ratio" symbol="γ" unit="dimensionless"
              value={gamma} onChange={setGamma} error={errors.gamma} />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
              c<sub>p</sub>/c<sub>v</sub> — use gas presets above
            </p>
          </div>

          {/* θ */}
          <div>
            <InputField label="Flow deflection (turning) angle" symbol="θ" unit="degrees"
              value={deflectionAngle} onChange={setDeflectionAngle} error={errors.deflectionAngle} />
            <div className="flex gap-2 -mt-2">
              {["5", "10", "15", "20", "25", "30"].map(v => (
                <Btn key={v} label={`${v}°`} active={deflectionAngle === v} onClick={() => setDeflectionAngle(v)} />
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
                Downstream Mach Number  M₂
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {result.isVacuumLimit ? "M₂ → ∞  (vacuum limit)" : `M₂ = ${fmt(result.mach2)}`}
              </p>
              <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                M₁ = {mach1} → M₂ = {result.isVacuumLimit ? "∞" : fmt(result.mach2)}
                {" · "}
                ν<sub>max</sub> = {fmt(result.nuMax)}°
                {" · "}
                remaining = {result.isVacuumLimit ? "none" : `${fmt(result.remainingExpansion)}°`}
              </p>
            </div>

            {/* Vacuum-limit warning */}
            {result.isVacuumLimit && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="font-semibold text-red-800 dark:text-red-300 mb-1">
                  Past vacuum limit — θ would require P = 0
                </p>
                <p className="text-sm text-red-700 dark:text-red-400">
                  ν₂ = {fmt(result.nu2)}° exceeds ν<sub>max</sub> = {fmt(result.nuMax)}°.
                  This deflection angle is physically impossible for this γ — the static pressure
                  would need to go negative. Maximum expansion gives M₂ → ∞ with P₂ → 0.
                </p>
              </div>
            )}

            {/* Expansion banner */}
            {!result.isVacuumLimit && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  Isentropic expansion — total pressure conserved
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  M₁ = {mach1} → M₂ = {fmt(result.mach2)} after θ = {deflectionAngle}° turning.
                  Fan bounded by μ₁ = {fmt(result.machAngle1)}° and μ₂ = {fmt(result.machAngle2)}° Mach lines.
                  {" "}ν<sub>max</sub> = {fmt(result.nuMax)}° — {fmt(result.remainingExpansion)}° of expansion capacity remaining.
                </p>
              </div>
            )}

            {/* P-M function + Mach angle grid */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Prandtl-Meyer function and Mach angles
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: <span>ν₁ [deg]</span>,                value: fmt(result.nu1)          },
                  { label: <span>ν₂ [deg]</span>,                value: fmt(result.nu2)          },
                  { label: <span>ν<sub>max</sub> [deg]</span>,   value: fmt(result.nuMax)        },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "μ₁ [deg]",          value: fmt(result.machAngle1)         },
                  { label: "μ₂ [deg]",          value: result.isVacuumLimit ? "0" : fmt(result.machAngle2) },
                  { label: <span>ν<sub>max</sub> − ν₂ [deg]</span>, value: fmt(result.remainingExpansion) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Isentropic property ratios */}
            {!result.isVacuumLimit && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Isentropic property ratios  (P₀ and T₀ conserved)
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "P₂/P₁", value: fmt(result.pressureRatio)    },
                    { label: "T₂/T₁", value: fmt(result.temperatureRatio) },
                    { label: "ρ₂/ρ₁", value: fmt(result.densityRatio)     },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.prandtlMeyerExpansion} />
            <CommonMistakes mistakes={commonMistakes.prandtlMeyerExpansion} />
          </div>
        </ResultsCard>
      )}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Prandtl-Meyer function ν(M):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>ν(M) = √((γ+1)/(γ−1)) × arctan(√((γ−1)/(γ+1)×(M²−1))) − arctan(√(M²−1))</div>
              <div>ν₂ = ν₁ + θ&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[expansion relation]</div>
              <div>ν<sub>max</sub> = 90°×(√((γ+1)/(γ−1)) − 1)&nbsp;&nbsp;&nbsp;[vacuum limit]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Isentropic property ratios (P₀, T₀ conserved):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>T₂/T₁ = (1+(γ−1)/2·M₁²) / (1+(γ−1)/2·M₂²)</div>
              <div>P₂/P₁ = (T₂/T₁)<sup>γ/(γ−1)</sup></div>
              <div>ρ₂/ρ₁ = (T₂/T₁)<sup>1/(γ−1)</sup></div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>ν(M) = Prandtl-Meyer function [degrees] — angle through which a flow at M = 1 must expand to reach M</li>
              <li>θ = flow turning (deflection) angle at the convex corner [degrees]</li>
              <li>μ = arcsin(1/M) — Mach angle [degrees]; the expansion fan spans from μ₁ to μ₂</li>
              <li>ν<sub>max</sub> = 90°×(√((γ+1)/(γ−1))−1) — for air ≈ 130.45°; represents expansion to vacuum (P → 0)</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Prandtl-Meyer table — air (γ = 1.4):</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  {["M", "ν [deg]", "μ [deg]", "P/P₀", "T/T₀"].map(h => (
                    <th key={h} className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { M: "1.0",  nu: "0.000",   mu: "90.00", P: "0.5283", T: "0.8333" },
                  { M: "1.5",  nu: "11.91",   mu: "41.81", P: "0.2724", T: "0.6897" },
                  { M: "2.0",  nu: "26.38",   mu: "30.00", P: "0.1278", T: "0.5556" },
                  { M: "2.5",  nu: "39.12",   mu: "23.58", P: "0.0585", T: "0.4444" },
                  { M: "3.0",  nu: "49.76",   mu: "19.47", P: "0.0272", T: "0.3571" },
                  { M: "4.0",  nu: "65.78",   mu: "14.48", P: "0.0066", T: "0.2381" },
                  { M: "5.0",  nu: "76.92",   mu: "11.54", P: "0.0019", T: "0.1667" },
                  { M: "∞",    nu: "130.45",  mu: "0.00",  P: "0",     T: "0"      },
                ].map(({ M, nu, mu, P, T }) => (
                  <tr key={M}>
                    <td className="py-1.5 pr-3 font-mono">{M}</td>
                    <td className="py-1.5 pr-3 font-mono">{nu}</td>
                    <td className="py-1.5 pr-3 font-mono">{mu}</td>
                    <td className="py-1.5 pr-3 font-mono">{P}</td>
                    <td className="py-1.5 font-mono">{T}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            Prandtl-Meyer expansion fans occur at convex corners in supersonic flow where
            the flow turns away from itself. The process is isentropic — total pressure and
            total temperature are conserved, so no entropy is generated. This contrasts with
            oblique shocks (concave corners) which are non-isentropic. The expansion always
            increases both M and the Mach angle span of the fan.
          </p>
        </div>
      </Card>

      <References refs={REFS_PRANDTL_MEYER} />
    </div>
  );
}
