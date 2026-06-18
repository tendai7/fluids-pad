"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_PUMP_HEAD } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculatePumpHead,
  generatePumpHeadSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type SpeedUnit = "RPM" | "rad/s";
type DiamUnit  = "mm"  | "m"    | "cm"   | "in";
type FlowUnit  = "L/s" | "m³/s" | "m³/h";
type WidthUnit = "mm"  | "m"    | "cm";
type DensUnit  = "kg/m³" | "g/cm³";

const toRps: Record<SpeedUnit, number> = { "RPM": Math.PI / 30, "rad/s": 1 };
const toDm:  Record<DiamUnit,  number> = { mm: 1e-3, m: 1, cm: 1e-2, in: 0.0254 };
const toQSI: Record<FlowUnit,  number> = { "L/s": 1e-3, "m³/s": 1, "m³/h": 1/3600 };
const toBm:  Record<WidthUnit, number> = { mm: 1e-3, m: 1, cm: 1e-2 };
const toKg:  Record<DensUnit,  number> = { "kg/m³": 1, "g/cm³": 1000 };

const FLUID_PRESETS = [
  { label: "Water 20°C",  density: "998"  },
  { label: "Water 80°C",  density: "972"  },
  { label: "Seawater",    density: "1025" },
  { label: "Light oil",   density: "850"  },
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

export default function PumpHeadCalculator() {
  const [impellerSpeed,    setImpellerSpeed]    = useState("3000");
  const [speedUnit,        setSpeedUnit]        = useState<SpeedUnit>("RPM");
  const [impellerDiameter, setImpellerDiameter] = useState("300");
  const [diamUnit,         setDiamUnit]         = useState<DiamUnit>("mm");
  const [flowRate,         setFlowRate]         = useState("50");
  const [flowUnit,         setFlowUnit]         = useState<FlowUnit>("L/s");
  const [bladeAngle,       setBladeAngle]       = useState("30");
  const [impellerWidth,    setImpellerWidth]    = useState("15");
  const [widthUnit,        setWidthUnit]        = useState<WidthUnit>("mm");
  const [showDensity,      setShowDensity]      = useState(false);
  const [density,          setDensity]          = useState("998");
  const [densUnit,         setDensUnit]         = useState<DensUnit>("kg/m³");
  const [errors,           setErrors]           = useState<Record<string, string>>({});
  const [result,           setResult]           = useState<ReturnType<typeof calculatePumpHead> | null>(null);
  const [steps,            setSteps]            = useState<ReturnType<typeof generatePumpHeadSteps> | null>(null);

  const handleSpeedUnitChange = (newUnit: SpeedUnit) => {
    const n = parseFloat(impellerSpeed);
    if (!isNaN(n)) setImpellerSpeed(fmt(n * toRps[speedUnit] / toRps[newUnit], 5));
    setSpeedUnit(newUnit);
  };
  const handleDiamUnitChange = (newUnit: DiamUnit) => {
    const d = parseFloat(impellerDiameter);
    if (!isNaN(d)) setImpellerDiameter(fmt(d * toDm[diamUnit] / toDm[newUnit], 5));
    setDiamUnit(newUnit);
  };
  const handleFlowUnitChange = (newUnit: FlowUnit) => {
    const q = parseFloat(flowRate);
    if (!isNaN(q)) setFlowRate(fmt(q * toQSI[flowUnit] / toQSI[newUnit], 5));
    setFlowUnit(newUnit);
  };
  const handleWidthUnitChange = (newUnit: WidthUnit) => {
    const b = parseFloat(impellerWidth);
    if (!isNaN(b)) setImpellerWidth(fmt(b * toBm[widthUnit] / toBm[newUnit], 5));
    setWidthUnit(newUnit);
  };
  const handleDensUnitChange = (newUnit: DensUnit) => {
    const r = parseFloat(density);
    if (!isNaN(r)) setDensity(fmt(r * toKg[densUnit] / toKg[newUnit], 5));
    setDensUnit(newUnit);
  };

  const handleClear = () => {
    setImpellerSpeed("");
    setSpeedUnit("RPM");
    setImpellerDiameter("");
    setDiamUnit("mm");
    setFlowRate("");
    setFlowUnit("L/s");
    setBladeAngle("");
    setImpellerWidth("");
    setWidthUnit("mm");
    setDensity("");
    setDensUnit("kg/m³");
    setShowDensity(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const nRaw  = parseFloat(impellerSpeed);
    const D2Raw = parseFloat(impellerDiameter);
    const QRaw  = parseFloat(flowRate);
    const beta  = parseFloat(bladeAngle);
    const b2Raw = parseFloat(impellerWidth);
    const rhoRaw= parseFloat(density);

    if (isNaN(nRaw)  || nRaw  <= 0) newErrors.impellerSpeed    = "Must be positive";
    if (isNaN(D2Raw) || D2Raw <= 0) newErrors.impellerDiameter = "Must be positive";
    if (isNaN(QRaw)  || QRaw  <= 0) newErrors.flowRate         = "Must be positive";
    if (isNaN(beta)  || beta  <= 0 || beta >= 90) newErrors.bladeAngle = "Must be between 0° and 90°";
    if (isNaN(b2Raw) || b2Raw <= 0) newErrors.impellerWidth    = "Must be positive";
    if (showDensity && (isNaN(rhoRaw) || rhoRaw <= 0)) newErrors.density = "Must be positive";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        impellerSpeed:    nRaw  * toRps[speedUnit],
        impellerDiameter: D2Raw * toDm[diamUnit],
        flowRate:         QRaw  * toQSI[flowUnit],
        bladeAngle:       beta,
        impellerWidth:    b2Raw * toBm[widthUnit],
        fluidDensity:     showDensity ? rhoRaw * toKg[densUnit] : undefined,
      };
      const calc = calculatePumpHead(input);
      const stp  = generatePumpHeadSteps(input, calc);
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
          Pump Head Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Euler head for a centrifugal pump impeller from blade geometry and kinematics.
          Computes tip speed U₂, radial velocity Vr₂, whirl velocity Vu₂, and theoretical head.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded">
          Turbomachinery · Pump
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ω / n */}
          <div>
            <InputField label="Rotational speed" symbol="ω" unit={speedUnit}
              value={impellerSpeed} onChange={setImpellerSpeed}
              placeholder={speedUnit === "RPM" ? "3000" : "314"}
              error={errors.impellerSpeed} />
            <div className="flex gap-2 -mt-2">
              {(["RPM", "rad/s"] as SpeedUnit[]).map(u => (
                <Btn key={u} label={u} active={speedUnit === u} onClick={() => handleSpeedUnitChange(u)} />
              ))}
            </div>
          </div>

          {/* D₂ */}
          <div>
            <InputField label="Impeller outlet diameter" symbol="D₂" unit={diamUnit}
              value={impellerDiameter} onChange={setImpellerDiameter}
              placeholder={diamUnit === "mm" ? "300" : diamUnit === "m" ? "0.3" : diamUnit === "cm" ? "30" : "11.8"}
              error={errors.impellerDiameter} />
            <div className="flex gap-2 -mt-2">
              {(["mm", "cm", "m", "in"] as DiamUnit[]).map(u => (
                <Btn key={u} label={u} active={diamUnit === u} onClick={() => handleDiamUnitChange(u)} />
              ))}
            </div>
          </div>

          {/* Q */}
          <div>
            <InputField label="Volume flow rate" symbol="Q" unit={flowUnit}
              value={flowRate} onChange={setFlowRate}
              placeholder={flowUnit === "L/s" ? "50" : flowUnit === "m³/s" ? "0.05" : "180"}
              error={errors.flowRate} />
            <div className="flex gap-2 -mt-2">
              {(["L/s", "m³/s", "m³/h"] as FlowUnit[]).map(u => (
                <Btn key={u} label={u} active={flowUnit === u} onClick={() => handleFlowUnitChange(u)} />
              ))}
            </div>
          </div>

          {/* β₂ */}
          <div>
            <InputField label="Outlet blade angle" symbol="β₂" unit="degrees"
              value={bladeAngle} onChange={setBladeAngle} error={errors.bladeAngle} />
            <div className="flex gap-2 -mt-2">
              {["15", "20", "25", "30", "35", "40"].map(v => (
                <Btn key={v} label={`${v}°`} active={bladeAngle === v} onClick={() => setBladeAngle(v)} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Angle from tangential — backward-curved blades 15°–35° are most common
            </p>
          </div>

          {/* b₂ */}
          <div>
            <InputField label="Outlet width" symbol="b₂" unit={widthUnit}
              value={impellerWidth} onChange={setImpellerWidth}
              placeholder={widthUnit === "mm" ? "15" : widthUnit === "cm" ? "1.5" : "0.015"}
              error={errors.impellerWidth} />
            <div className="flex gap-2 -mt-2">
              {(["mm", "cm", "m"] as WidthUnit[]).map(u => (
                <Btn key={u} label={u} active={widthUnit === u} onClick={() => handleWidthUnitChange(u)} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Typical b₂/D₂ ratio: 0.03–0.10 — e.g. 15 mm for a 300 mm impeller
            </p>
          </div>
        </div>

        {/* Optional fluid density */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-start gap-3">
            <input type="checkbox" id="showDensity" checked={showDensity}
              onChange={(e) => setShowDensity(e.target.checked)}
              className="mt-3 w-4 h-4 text-blue-600 rounded" />
            <div className="flex-1">
              <label htmlFor="showDensity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Supply fluid density ρ — computes Euler power P = ρgQH
              </label>
              {showDensity && (
                <>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {FLUID_PRESETS.map(p => (
                      <button key={p.label}
                        onClick={() => { setDensity(p.density); setDensUnit("kg/m³"); }}
                        className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="max-w-xs">
                    <InputField label="Fluid density" symbol="ρ" unit={densUnit}
                      value={density} onChange={setDensity}
                      placeholder={densUnit === "kg/m³" ? "998" : "0.998"}
                      error={errors.density} />
                    <div className="flex gap-2 -mt-2">
                      {(["kg/m³", "g/cm³"] as DensUnit[]).map(u => (
                        <Btn key={u} label={u} active={densUnit === u} onClick={() => handleDensUnitChange(u)} />
                      ))}
                    </div>
                  </div>
                </>
              )}
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
                Euler Head  H = U₂ × Vu₂ / g
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                H = {fmt(result.eulerHead)} m
              </p>
              <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                = {fmt(result.eulerHead * 3.28084, 4)} ft
                {" · "}
                n = {fmt(result.speedRpm, 4)} RPM
                {result.eulerPower != null && ` · P = ${fmt(result.eulerPower / 1000, 4)} kW`}
              </p>
            </div>

            {/* Velocity triangle grid */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Outlet velocity triangle
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "U₂ [m/s]",  value: fmt(result.tipSpeed)          },
                  { label: "Vr₂ [m/s]", value: fmt(result.radialVelocity)    },
                  { label: "Vu₂ [m/s]", value: fmt(result.whirlVelocity)     },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "V₂ [m/s]",   value: fmt(result.absoluteVelocity) },
                  { label: <span>A₂ [m²]</span>, value: fmt(result.outletArea, 4)  },
                  { label: "H [m]",       value: fmt(result.eulerHead)        },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Power grid — only if density given */}
            {result.eulerPower != null && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Euler power  P = ρgQH
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "P [W]",   value: fmt(result.eulerPower)         },
                    { label: "P [kW]",  value: fmt(result.eulerPower / 1000, 4) },
                    { label: "H [ft]",  value: fmt(result.eulerHead * 3.28084, 4) },
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
            <AssumptionsList assumptions={commonAssumptions.pumpHead} />
            <CommonMistakes mistakes={commonMistakes.pumpHead} />
          </div>
        </ResultsCard>
      )}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Euler turbomachinery equation (zero inlet swirl):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>U₂ = ω × D₂/2&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[tip speed, m/s]</div>
              <div>A₂ = π × D₂ × b₂&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[outlet annular area, m²]</div>
              <div>Vr₂ = Q / A₂&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[radial velocity, m/s]</div>
              <div>Vu₂ = U₂ − Vr₂ / tan(β₂)&nbsp;&nbsp;&nbsp;[whirl velocity, m/s]</div>
              <div>H = U₂ × Vu₂ / g&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Euler head, m]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>ω = angular velocity [rad/s] = 2π × n/60 where n is in RPM</li>
              <li>D₂ = impeller outlet diameter [m]</li>
              <li>b₂ = impeller outlet width (axial) [m]</li>
              <li>β₂ = outlet blade angle from the tangential direction [degrees]</li>
              <li>Vu₂ = tangential (whirl) component of absolute outlet velocity [m/s]</li>
              <li>H = theoretical (Euler) head — actual head = H × η<sub>h</sub> where η<sub>h</sub> is hydraulic efficiency</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Blade angle effect on head:</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  {["Blade type", "β₂", "Head characteristic", "Stability"].map(h => (
                    <th key={h} className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { type: "Backward-curved",  b: "< 90°", char: "H decreases with Q", stab: "Stable (most common)" },
                  { type: "Radial (straight)", b: "= 90°", char: "H constant with Q",  stab: "Moderately stable" },
                  { type: "Forward-curved",   b: "> 90°", char: "H increases with Q",  stab: "Unstable (not recommended)" },
                ].map(({ type, b, char, stab }) => (
                  <tr key={type}>
                    <td className="py-1.5 pr-3">{type}</td>
                    <td className="py-1.5 pr-3 font-mono">{b}</td>
                    <td className="py-1.5 pr-3">{char}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{stab}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            The Euler head is the theoretical maximum. Actual pump head is reduced by slip
            (σ ≈ 0.85–0.95), hydraulic friction, and recirculation losses. The shaft power
            P = ρgQH/η where η is the overall pump efficiency including mechanical and
            volumetric losses.
          </p>
        </div>
      </Card>

      <References refs={REFS_PUMP_HEAD} />
    </div>
  );
}
