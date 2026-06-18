"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_MINOR_LOSSES } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateMinorLosses,
  generateMinorLossesSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type VelocityUnit = "m/s" | "ft/s" | "km/h";
const toMS: Record<VelocityUnit, number> = { "m/s": 1, "ft/s": 0.3048, "km/h": 1 / 3.6 };

// ── Common fitting loss coefficients ─────────────────────────────────────────
const FITTING_PRESETS = [
  { label: "Sharp pipe entrance",              K: 0.5  },
  { label: "Reentrant (projecting) entrance",  K: 0.8  },
  { label: "Exit — any fitting",               K: 1.0  },
  { label: "90° standard elbow",               K: 0.9  },
  { label: "90° long-radius elbow",            K: 0.4  },
  { label: "45° elbow",                        K: 0.4  },
  { label: "Gate valve — fully open",          K: 0.2  },
  { label: "Gate valve — half open",           K: 5.6  },
  { label: "Globe valve — fully open",         K: 10.0 },
  { label: "Ball valve — fully open",          K: 0.05 },
  { label: "Check valve (swing type)",         K: 2.0  },
  { label: "Butterfly valve — fully open",     K: 0.6  },
  { label: "Standard tee — branch flow",       K: 1.8  },
  { label: "Standard tee — line flow",         K: 0.9  },
  { label: "180° return bend",                 K: 2.2  },
  { label: "Sudden contraction (approx.)",     K: 0.5  },
  { label: "Sudden expansion (approx.)",       K: 1.0  },
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

export default function MinorLossesCalculator() {
  const [velocity,         setVelocity]         = useState("2");
  const [velocityUnit,     setVelocityUnit]     = useState<VelocityUnit>("m/s");
  const [lossCoefficient,  setLossCoefficient]  = useState("0.9");
  const [selectedFitting,  setSelectedFitting]  = useState("");
  const [errors,           setErrors]           = useState<Record<string, string>>({});
  const [result,           setResult]           = useState<ReturnType<typeof calculateMinorLosses> | null>(null);
  const [steps,            setSteps]            = useState<ReturnType<typeof generateMinorLossesSteps> | null>(null);
  const [computedVSI,      setComputedVSI]      = useState<number | null>(null);

  const handleClear = () => {
    setVelocity("");
    setVelocityUnit("m/s");
    setLossCoefficient("");
    setSelectedFitting("");
    setResult(null);
    setSteps(null);
    setComputedVSI(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const vRaw = parseFloat(velocity);
    const K    = parseFloat(lossCoefficient);

    if (isNaN(vRaw) || vRaw < 0) newErrors.velocity        = "Must be non-negative";
    if (isNaN(K)    || K    < 0) newErrors.lossCoefficient = "Must be non-negative";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const vSI = vRaw * toMS[velocityUnit];

    try {
      const input = { velocity: vSI, lossCoefficient: K };
      const calc  = calculateMinorLosses(input);
      const stp   = generateMinorLossesSteps(input, calc);
      setResult(calc);
      setSteps(stp);
      setComputedVSI(vSI);
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
          Minor Losses Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Head loss due to fittings, bends, valves, and other pipe components using the K-coefficient method.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Mechanics II
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Velocity + unit toggle */}
          <div>
            <InputField label="Flow velocity" symbol="V" unit={velocityUnit}
              value={velocity} onChange={setVelocity} error={errors.velocity} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m/s", "ft/s", "km/h"] as VelocityUnit[]).map(u => (
                <Btn key={u} label={u} active={velocityUnit === u} onClick={() => {
                  const si = parseFloat(velocity) * toMS[velocityUnit];
                  setVelocityUnit(u);
                  if (!isNaN(si)) setVelocity(fmt(si / toMS[u]));
                }} />
              ))}
            </div>
          </div>

          {/* Loss coefficient + fitting dropdown */}
          <div>
            <InputField label="Loss coefficient" symbol="K" unit="dimensionless"
              value={lossCoefficient} onChange={setLossCoefficient} error={errors.lossCoefficient} />
            <div className="flex items-center gap-2 -mt-2">
              <select
                value={selectedFitting}
                onChange={(e) => {
                  const lbl = e.target.value;
                  setSelectedFitting(lbl);
                  const preset = FITTING_PRESETS.find(p => p.label === lbl);
                  if (preset) setLossCoefficient(preset.K.toString());
                }}
                className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Fitting preset…</option>
                {FITTING_PRESETS.map(p => (
                  <option key={p.label} value={p.label}>
                    {p.label} — K = {p.K}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              For multiple fittings in series, enter the sum of all K values.
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
      {result && steps && computedVSI !== null && (() => {
        const hL   = result.headLoss;
        const hLFt = hL * 3.28084;

        const hLUnits: [string, number][] = [
          ["m",  hL],
          ["ft", hLFt],
          ["mm", hL * 1000],
          ["cm", hL * 100],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Minor head loss  hL = K × V²/(2g)
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {fmt(hL, 6)} m
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  {fmt(hLFt, 5)} ft
                </p>
              </div>

              {/* Unit grid */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Head loss in other units
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {hLUnits.map(([unit, value]) => (
                    <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                      <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related quantities */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Related quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "Velocity  V",        value: `${fmt(computedVSI, 5)} m/s`   },
                    { label: "Vel. head  V²/(2g)", value: `${fmt(result.velocityHead, 5)} m` },
                    { label: "hL / hv = K",        value: fmt(parseFloat(lossCoefficient), 4) },
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
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.minorLosses} />
              <CommonMistakes mistakes={commonMistakes.minorLosses} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Minor loss equation:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              hL = K × V²/(2g)&nbsp;&nbsp;&nbsp;&nbsp;[m]
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Multiple fittings in series:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              hL,total = (K₁ + K₂ + … + Kn) × V²/(2g)
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>hL = minor head loss [m]</li>
              <li>K = loss coefficient (depends on fitting geometry)</li>
              <li>V = mean flow velocity at the fitting [m/s]</li>
              <li>g = gravitational acceleration = 9.81 m/s²</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Common loss coefficients K:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Fitting</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">K</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {FITTING_PRESETS.map(({ label, K }) => (
                  <tr key={label}>
                    <td className="py-1.5 pr-4">{label}</td>
                    <td className="py-1.5 font-mono">{K}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            Minor losses are often small compared to major (friction) losses in long pipes, but
            dominate in short pipe systems with many fittings. Always check whether major or minor
            losses govern before simplifying.
          </p>
        </div>
      </Card>

      <References refs={REFS_MINOR_LOSSES} />
    </div>
  );
}
