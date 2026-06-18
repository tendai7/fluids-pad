"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_FAN_LAWS } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateFanLaws,
  generateFanLawsSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type FlowUnit = "m³/s" | "L/s"  | "m³/h";
type PresUnit = "Pa"   | "mmH₂O"| "in.WG"| "kPa";
type PowerUnit= "W"    | "kW";

const toQSI: Record<FlowUnit,  number> = { "m³/s": 1, "L/s": 1e-3, "m³/h": 1/3600 };
const toPa:  Record<PresUnit,  number> = { "Pa": 1, "mmH₂O": 9.8067, "in.WG": 249.09, "kPa": 1000 };
const toW:   Record<PowerUnit, number> = { "W": 1, "kW": 1000 };

const fromQSI: Record<FlowUnit,  number> = { "m³/s": 1, "L/s": 1000, "m³/h": 3600 };
const fromPa:  Record<PresUnit,  number> = { "Pa": 1, "mmH₂O": 1/9.8067, "in.WG": 1/249.09, "kPa": 1e-3 };
const fromW:   Record<PowerUnit, number> = { "W": 1, "kW": 1e-3 };

// Standard air density at different conditions [kg/m³]
const AIR_PRESETS = [
  { label: "20°C sea level",  density: "1.204", note: "Standard HVAC design" },
  { label: "0°C sea level",   density: "1.293", note: "Winter air" },
  { label: "50°C sea level",  density: "1.093", note: "Hot supply air" },
  { label: "1000 m altitude", density: "1.112", note: "" },
  { label: "2000 m altitude", density: "1.007", note: "" },
] as const;

const SPEED_PRESETS = ["600", "750", "1000", "1200", "1450", "1500", "3000"];

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

export default function FanLawsCalculator() {
  const [speed1,    setSpeed1]    = useState("1000");
  const [speed2,    setSpeed2]    = useState("1200");
  const [flowRate1, setFlowRate1] = useState("2");
  const [flowUnit,  setFlowUnit]  = useState<FlowUnit>("m³/s");
  const [pressure1, setPressure1] = useState("500");
  const [presUnit,  setPresUnit]  = useState<PresUnit>("Pa");
  const [power1,    setPower1]    = useState("1.2");
  const [powerUnit, setPowerUnit] = useState<PowerUnit>("kW");
  const [density1,  setDensity1]  = useState("1.204");
  const [density2,  setDensity2]  = useState("1.204");
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [result,    setResult]    = useState<ReturnType<typeof calculateFanLaws> | null>(null);
  const [steps,     setSteps]     = useState<ReturnType<typeof generateFanLawsSteps> | null>(null);

  const handleFlowUnitChange = (newUnit: FlowUnit) => {
    const q = parseFloat(flowRate1);
    if (!isNaN(q)) setFlowRate1(fmt(q * toQSI[flowUnit] / toQSI[newUnit], 5));
    setFlowUnit(newUnit);
  };
  const handlePresUnitChange = (newUnit: PresUnit) => {
    const dp = parseFloat(pressure1);
    if (!isNaN(dp)) setPressure1(fmt(dp * toPa[presUnit] / toPa[newUnit], 5));
    setPresUnit(newUnit);
  };
  const handlePowerUnitChange = (newUnit: PowerUnit) => {
    const pw = parseFloat(power1);
    if (!isNaN(pw)) setPower1(fmt(pw * toW[powerUnit] / toW[newUnit], 5));
    setPowerUnit(newUnit);
  };

  const handleClear = () => {
    setSpeed1("");
    setSpeed2("");
    setFlowRate1("");
    setFlowUnit("m³/s");
    setPressure1("");
    setPresUnit("Pa");
    setPower1("");
    setPowerUnit("kW");
    setDensity1("");
    setDensity2("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const N1  = parseFloat(speed1);
    const N2  = parseFloat(speed2);
    const QR  = parseFloat(flowRate1);
    const dPR = parseFloat(pressure1);
    const PR  = parseFloat(power1);
    const r1  = parseFloat(density1);
    const r2  = parseFloat(density2);

    if (isNaN(N1)  || N1  <= 0) newErrors.speed1    = "Must be positive";
    if (isNaN(N2)  || N2  <= 0) newErrors.speed2    = "Must be positive";
    if (isNaN(QR)  || QR  <= 0) newErrors.flowRate1 = "Must be positive";
    if (isNaN(dPR) || dPR <= 0) newErrors.pressure1 = "Must be positive";
    if (isNaN(PR)  || PR  <= 0) newErrors.power1    = "Must be positive";
    if (isNaN(r1)  || r1  <= 0) newErrors.density1  = "Must be positive";
    if (isNaN(r2)  || r2  <= 0) newErrors.density2  = "Must be positive";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        speed1: N1, speed2: N2,
        flowRate1: QR  * toQSI[flowUnit],
        pressure1: dPR * toPa[presUnit],
        power1:    PR  * toW[powerUnit],
        density1:  r1,
        density2:  r2,
      };
      const calc = calculateFanLaws(input);
      const stp  = generateFanLawsSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : "An error occurred" });
      setResult(null); setSteps(null);
    }
  };

  const dispQ  = (v: number) => fmt(v * fromQSI[flowUnit]);
  const dispP  = (v: number) => fmt(v * fromPa[presUnit]);
  const dispW  = (v: number) => fmt(v * fromW[powerUnit]);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Fan Laws Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Scale fan performance to a new speed or air density. Fan laws extend the affinity
          laws with a density correction — pressure and power scale with ρ₂/ρ₁.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded">
          Turbomachinery · Fan Scaling
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* N₁ */}
          <div>
            <InputField label="Initial speed" symbol="N₁" unit="rpm"
              value={speed1} onChange={setSpeed1} error={errors.speed1} />
            <div className="flex flex-wrap gap-1 -mt-2">
              {SPEED_PRESETS.map(v => (
                <Btn key={v} label={v} active={speed1 === v} onClick={() => setSpeed1(v)} />
              ))}
            </div>
          </div>

          {/* N₂ */}
          <div>
            <InputField label="Scaled speed" symbol="N₂" unit="rpm"
              value={speed2} onChange={setSpeed2} error={errors.speed2} />
            <div className="flex flex-wrap gap-1 -mt-2">
              {SPEED_PRESETS.map(v => (
                <Btn key={v} label={v} active={speed2 === v} onClick={() => setSpeed2(v)} />
              ))}
            </div>
          </div>

          {/* Q₁ */}
          <div>
            <InputField label="Flow rate at N₁" symbol="Q₁" unit={flowUnit}
              value={flowRate1} onChange={setFlowRate1}
              placeholder={flowUnit === "m³/s" ? "2" : flowUnit === "L/s" ? "2000" : "7200"}
              error={errors.flowRate1} />
            <div className="flex gap-2 -mt-2">
              {(["m³/s", "L/s", "m³/h"] as FlowUnit[]).map(u => (
                <Btn key={u} label={u} active={flowUnit === u} onClick={() => handleFlowUnitChange(u)} />
              ))}
            </div>
          </div>

          {/* ΔP₁ */}
          <div>
            <InputField label="Pressure rise at N₁" symbol="ΔP₁" unit={presUnit}
              value={pressure1} onChange={setPressure1}
              placeholder={presUnit === "Pa" ? "500" : presUnit === "mmH₂O" ? "51" : presUnit === "in.WG" ? "2.0" : "0.5"}
              error={errors.pressure1} />
            <div className="flex gap-2 -mt-2">
              {(["Pa", "mmH₂O", "in.WG", "kPa"] as PresUnit[]).map(u => (
                <Btn key={u} label={u} active={presUnit === u} onClick={() => handlePresUnitChange(u)} />
              ))}
            </div>
          </div>

          {/* P₁ */}
          <div>
            <InputField label="Shaft power at N₁" symbol="P₁" unit={powerUnit}
              value={power1} onChange={setPower1}
              placeholder={powerUnit === "W" ? "1200" : "1.2"}
              error={errors.power1} />
            <div className="flex gap-2 -mt-2">
              {(["kW", "W"] as PowerUnit[]).map(u => (
                <Btn key={u} label={u} active={powerUnit === u} onClick={() => handlePowerUnitChange(u)} />
              ))}
            </div>
          </div>
        </div>

        {/* Density — shared section */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
            Air density — click preset to fill both ρ₁ and ρ₂ (or set individually)
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {AIR_PRESETS.map(p => (
              <button key={p.label}
                onClick={() => { setDensity1(p.density); setDensity2(p.density); }}
                className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
                {p.label} ({p.density} kg/m³){p.note ? ` — ${p.note}` : ""}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <InputField label="Air density at N₁" symbol="ρ₁" unit="kg/m³"
                value={density1} onChange={setDensity1} error={errors.density1} />
            </div>
            <div>
              <InputField label="Air density at N₂" symbol="ρ₂" unit="kg/m³"
                value={density2} onChange={setDensity2} error={errors.density2} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                Change ρ₂ for altitude/temperature correction — if same as ρ₁, no density correction
              </p>
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
                Speed Ratio  N₂/N₁
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                N₂/N₁ = {fmt(result.speedRatio)}
              </p>
              <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                {parseFloat(speed1)} → {parseFloat(speed2)} rpm
                {" · "}
                ρ₂/ρ₁ = {fmt(result.densityRatio)}
                {Math.abs(result.densityRatio - 1) > 0.001
                  ? ` (${((result.densityRatio - 1) * 100).toFixed(1)}% density change)`
                  : " (same density)"}
              </p>
            </div>

            {/* Density correction banner — only if ρ changes */}
            {Math.abs(result.densityRatio - 1) > 0.005 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  Density correction active — ρ₂/ρ₁ = {fmt(result.densityRatio)}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Pressure scales ×{fmt(result.pressureRatio, 4)} (speed² × density ratio).
                  Power scales ×{fmt(result.powerRatio, 4)} (speed³ × density ratio).
                  Flow is unaffected by density.
                </p>
              </div>
            )}

            {/* Before/after comparison table */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <div className="grid grid-cols-4 bg-gray-50 dark:bg-gray-800 divide-x divide-gray-200 dark:divide-gray-600 border-b border-gray-200 dark:border-gray-600">
                {["Quantity", `At N₁ = ${speed1} rpm`, `At N₂ = ${speed2} rpm`, "Ratio"].map((h, i) => (
                  <div key={i} className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">{h}</div>
                ))}
              </div>
              {[
                {
                  label: `Q [${flowUnit}]`,
                  v1: dispQ(result.flowRate2 / result.flowRatio),
                  v2: dispQ(result.flowRate2),
                  ratio: fmt(result.flowRatio, 4),
                },
                {
                  label: `ΔP [${presUnit}]`,
                  v1: dispP(result.pressure2 / result.pressureRatio),
                  v2: dispP(result.pressure2),
                  ratio: fmt(result.pressureRatio, 4),
                },
                {
                  label: `P [${powerUnit}]`,
                  v1: dispW(result.power2 / result.powerRatio),
                  v2: dispW(result.power2),
                  ratio: fmt(result.powerRatio, 4),
                },
              ].map(({ label, v1, v2, ratio }, i) => (
                <div key={i} className="grid grid-cols-4 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  <div className="px-3 py-2.5 text-xs font-medium text-gray-600 dark:text-gray-400">{label}</div>
                  <div className="px-3 py-2.5 font-mono text-sm font-semibold text-gray-900 dark:text-white">{v1}</div>
                  <div className="px-3 py-2.5 font-mono text-sm font-bold text-indigo-700 dark:text-indigo-300">{v2}</div>
                  <div className="px-3 py-2.5 font-mono text-sm text-gray-500 dark:text-gray-400">×{ratio}</div>
                </div>
              ))}
            </div>

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.fanLaws} />
            <CommonMistakes mistakes={commonMistakes.fanLaws} />
          </div>
        </ResultsCard>
      )}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Fan laws with density correction:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Q₂/Q₁ = N₂/N₁&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[flow — speed only]</div>
              <div>ΔP₂/ΔP₁ = (N₂/N₁)² × (ρ₂/ρ₁)&nbsp;&nbsp;[pressure — speed² × density]</div>
              <div>P₂/P₁  = (N₂/N₁)³ × (ρ₂/ρ₁)&nbsp;&nbsp;[power — speed³ × density]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Pressure unit equivalences (1 Pa = ...):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>1 Pa     = 0.1020 mmH₂O = 0.004015 in.WG = 0.001 kPa</div>
              <div>1 mmH₂O = 9.807 Pa</div>
              <div>1 in.WG = 249.1 Pa  (standard for HVAC in US units)</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Standard air density at sea level:</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  {["Condition", "T [°C]", "ρ [kg/m³]", "vs 20°C"].map(h => (
                    <th key={h} className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { c: "Cold winter air",    t: "0",   r: "1.293", d: "+7.4%" },
                  { c: "Standard HVAC",      t: "20",  r: "1.204", d: "—"    },
                  { c: "Warm supply",        t: "40",  r: "1.127", d: "−6.4%"},
                  { c: "Hot supply",         t: "60",  r: "1.060", d: "−12%" },
                  { c: "1 000 m altitude",   t: "8.5", r: "1.112", d: "−7.6%"},
                  { c: "2 000 m altitude",   t: "2.0", r: "1.007", d: "−16%" },
                ].map(({ c, t, r, d }) => (
                  <tr key={c}>
                    <td className="py-1.5 pr-3">{c}</td>
                    <td className="py-1.5 pr-3 font-mono">{t}</td>
                    <td className="py-1.5 pr-3 font-mono">{r}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            Fan laws are the extension of affinity laws to include gas density changes. When
            ρ₂ = ρ₁ (same gas, same conditions), the fan laws reduce to the pump affinity
            laws. The density correction is critical in HVAC: a fan designed for winter air
            (0°C, 1.293 kg/m³) running in summer (35°C, 1.146 kg/m³) delivers ~11% less
            pressure at the same speed.
          </p>
        </div>
      </Card>

      <References refs={REFS_FAN_LAWS} />
    </div>
  );
}
