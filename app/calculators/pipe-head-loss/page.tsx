"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_PIPE_HEAD_LOSS } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculatePipeHeadLoss,
  generatePipeHeadLossSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LengthUnit   = "m" | "km" | "ft";
type DiameterUnit = "m" | "mm" | "cm" | "inch";
type VelocityUnit = "m/s" | "ft/s" | "km/h";

const toM:  Record<LengthUnit,   number> = { m: 1, km: 1000, ft: 0.3048 };
const toDm: Record<DiameterUnit, number> = { m: 1, mm: 0.001, cm: 0.01, inch: 0.0254 };
const toMS: Record<VelocityUnit, number> = { "m/s": 1, "ft/s": 0.3048, "km/h": 1 / 3.6 };

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

export default function PipeHeadLossCalculator() {
  const [length,        setLength]        = useState("100");
  const [lengthUnit,    setLengthUnit]    = useState<LengthUnit>("m");
  const [diameter,      setDiameter]      = useState("100");
  const [diameterUnit,  setDiameterUnit]  = useState<DiameterUnit>("mm");
  const [velocity,      setVelocity]      = useState("1");
  const [velocityUnit,  setVelocityUnit]  = useState<VelocityUnit>("m/s");
  const [frictionFactor, setFrictionFactor] = useState("0.02");
  const [errors,        setErrors]        = useState<Record<string, string>>({});
  const [result,        setResult]        = useState<ReturnType<typeof calculatePipeHeadLoss> | null>(null);
  const [steps,         setSteps]         = useState<ReturnType<typeof generatePipeHeadLossSteps> | null>(null);
  const [computed,      setComputed]      = useState<{ lSI: number; dSI: number; vSI: number } | null>(null);

  const handleClear = () => {
    setLength("");
    setLengthUnit("m");
    setDiameter("");
    setDiameterUnit("mm");
    setVelocity("");
    setVelocityUnit("m/s");
    setFrictionFactor("");
    setResult(null);
    setSteps(null);
    setComputed(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const lRaw = parseFloat(length);
    const dRaw = parseFloat(diameter);
    const vRaw = parseFloat(velocity);
    const f    = parseFloat(frictionFactor);

    if (isNaN(lRaw) || lRaw <= 0) newErrors.length        = "Must be a positive number";
    if (isNaN(dRaw) || dRaw <= 0) newErrors.diameter      = "Must be a positive number";
    if (isNaN(vRaw) || vRaw <  0) newErrors.velocity      = "Must be non-negative";
    if (isNaN(f)    || f    <= 0) newErrors.frictionFactor = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const lSI = lRaw * toM[lengthUnit];
    const dSI = dRaw * toDm[diameterUnit];
    const vSI = vRaw * toMS[velocityUnit];

    try {
      const calc = calculatePipeHeadLoss({ length: lSI, diameter: dSI, velocity: vSI, frictionFactor: f });
      const stp  = generatePipeHeadLossSteps({ length: lSI, diameter: dSI, velocity: vSI, frictionFactor: f }, calc);
      setResult(calc);
      setSteps(stp);
      setComputed({ lSI, dSI, vSI });
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Pipe Head Loss Calculator (Darcy-Weisbach)
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Calculate major head loss in pipes due to friction using the Darcy-Weisbach equation.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Mechanics II
        </span>
      </div>

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Pipe length */}
          <div>
            <InputField label="Pipe length" symbol="L" unit={lengthUnit}
              value={length} onChange={setLength}
              placeholder={lengthUnit === "km" ? "0.1" : lengthUnit === "ft" ? "328" : "100"}
              error={errors.length} />
            <div className="flex gap-2 -mt-2">
              {(["m", "km", "ft"] as LengthUnit[]).map(u => (
                <Btn key={u} label={u} active={lengthUnit === u} onClick={() => {
                  const si = parseFloat(length) * toM[lengthUnit];
                  setLengthUnit(u);
                  if (!isNaN(si)) setLength(fmt(si / toM[u]));
                }} />
              ))}
            </div>
          </div>

          {/* Diameter */}
          <div>
            <InputField label="Internal diameter" symbol="D" unit={diameterUnit}
              value={diameter} onChange={setDiameter}
              placeholder={diameterUnit === "m" ? "0.1" : diameterUnit === "cm" ? "10" : diameterUnit === "inch" ? "3.94" : "100"}
              error={errors.diameter} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m", "mm", "cm", "inch"] as DiameterUnit[]).map(u => (
                <Btn key={u} label={u} active={diameterUnit === u} onClick={() => {
                  const si = parseFloat(diameter) * toDm[diameterUnit];
                  setDiameterUnit(u);
                  if (!isNaN(si)) setDiameter(fmt(si / toDm[u]));
                }} />
              ))}
            </div>
          </div>

          {/* Velocity */}
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

          {/* Friction factor */}
          <div>
            <InputField label="Darcy friction factor" symbol="f" unit="dimensionless"
              value={frictionFactor} onChange={setFrictionFactor} error={errors.frictionFactor} />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Laminar (Re &lt; 2 300): f = 64/Re · Turbulent: use Moody chart
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

      {result && steps && computed && (() => {
        const hf  = result.headLoss;
        const hfFt  = hf * 3.28084;
        const hfMm  = hf * 1000;

        const hfUnits: [string, number][] = [
          ["m",    hf],
          ["ft",   hfFt],
          ["mm",   hfMm],
          ["cm",   hf * 100],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Head loss  hf = f × (L/D) × V²/(2g)
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {fmt(hf, 6)} m
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  {fmt(hfFt, 5)} ft
                </p>
              </div>

              {/* Unit grid */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Head loss in other units
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {hfUnits.map(([unit, value]) => (
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
                    { label: "Velocity  V",       value: `${fmt(computed.vSI, 5)} m/s` },
                    { label: "Vel. head  V²/(2g)", value: `${fmt(result.velocityHead, 5)} m` },
                    { label: "L/D ratio",          value: fmt(result.ldRatio, 5) },
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
              <AssumptionsList assumptions={commonAssumptions.pipeHeadLoss} />
              <CommonMistakes mistakes={commonMistakes.pipeHeadLoss} />
            </div>
          </ResultsCard>
        );
      })()}

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Darcy-Weisbach equation:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              hf = f × (L/D) × (V² / (2g))&nbsp;&nbsp;[m]
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Velocity head:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              hv = V² / (2g)&nbsp;&nbsp;[m]&nbsp;&nbsp;→&nbsp;&nbsp;hf = f × (L/D) × hv
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>hf = major head loss due to pipe friction [m]</li>
              <li>f = Darcy friction factor (dimensionless)</li>
              <li>L = pipe length [m]</li>
              <li>D = internal pipe diameter [m]</li>
              <li>V = mean flow velocity [m/s]</li>
              <li>g = gravitational acceleration = 9.81 m/s²</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Friction factor:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Laminar (Re &lt; 2 300):&nbsp;&nbsp;f = 64 / Re</li>
              <li>Turbulent: Moody chart or Colebrook-White equation</li>
              <li>This is the <strong>Darcy</strong> friction factor — 4× the Fanning friction factor</li>
            </ul>
          </div>
          <p>
            Head loss represents energy dissipated by friction per unit weight of fluid.
            It grows linearly with pipe length and friction factor, and quadratically with velocity — doubling V quadruples hf.
          </p>
        </div>
      </Card>

      <References refs={REFS_PIPE_HEAD_LOSS} />
    </div>
  );
}
