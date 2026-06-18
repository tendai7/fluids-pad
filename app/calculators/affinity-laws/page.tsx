"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_AFFINITY_LAWS } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateAffinityLaws,
  generateAffinityLawsSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type FlowUnit  = "m³/s" | "L/s"  | "m³/h";
type HeadUnit  = "m"    | "ft";
type PowerUnit = "W"    | "kW"   | "hp";

const toQSI: Record<FlowUnit,  number> = { "m³/s": 1, "L/s": 1e-3, "m³/h": 1/3600 };
const toHM:  Record<HeadUnit,  number> = { "m": 1, "ft": 0.3048 };
const toW:   Record<PowerUnit, number> = { "W": 1, "kW": 1000, "hp": 745.7 };

const fromQSI: Record<FlowUnit,  number> = { "m³/s": 1, "L/s": 1000, "m³/h": 3600 };
const fromHM:  Record<HeadUnit,  number> = { "m": 1, "ft": 3.28084 };
const fromW:   Record<PowerUnit, number> = { "W": 1, "kW": 1e-3, "hp": 1/745.7 };

const SPEED_PRESETS = ["750", "960", "1000", "1450", "1500", "2900", "3000"];

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

export default function AffinityLawsCalculator() {
  const [speed1,    setSpeed1]    = useState("1450");
  const [speed2,    setSpeed2]    = useState("1750");
  const [flowRate1, setFlowRate1] = useState("100");
  const [flowUnit,  setFlowUnit]  = useState<FlowUnit>("L/s");
  const [head1,     setHead1]     = useState("20");
  const [headUnit,  setHeadUnit]  = useState<HeadUnit>("m");
  const [power1,    setPower1]    = useState("5");
  const [powerUnit, setPowerUnit] = useState<PowerUnit>("kW");
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [result,    setResult]    = useState<ReturnType<typeof calculateAffinityLaws> | null>(null);
  const [steps,     setSteps]     = useState<ReturnType<typeof generateAffinityLawsSteps> | null>(null);

  const handleFlowUnitChange = (newUnit: FlowUnit) => {
    const q = parseFloat(flowRate1);
    if (!isNaN(q)) setFlowRate1(fmt(q * toQSI[flowUnit] / toQSI[newUnit], 5));
    setFlowUnit(newUnit);
  };
  const handleHeadUnitChange = (newUnit: HeadUnit) => {
    const h = parseFloat(head1);
    if (!isNaN(h)) setHead1(fmt(h * toHM[headUnit] / toHM[newUnit], 5));
    setHeadUnit(newUnit);
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
    setFlowUnit("L/s");
    setHead1("");
    setHeadUnit("m");
    setPower1("");
    setPowerUnit("kW");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const N1 = parseFloat(speed1);
    const N2 = parseFloat(speed2);
    const QR = parseFloat(flowRate1);
    const HR = parseFloat(head1);
    const PR = parseFloat(power1);

    if (isNaN(N1) || N1 <= 0) newErrors.speed1    = "Must be positive";
    if (isNaN(N2) || N2 <= 0) newErrors.speed2    = "Must be positive";
    if (isNaN(QR) || QR <= 0) newErrors.flowRate1 = "Must be positive";
    if (isNaN(HR) || HR <= 0) newErrors.head1     = "Must be positive";
    if (isNaN(PR) || PR <= 0) newErrors.power1    = "Must be positive";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        speed1:    N1,
        speed2:    N2,
        flowRate1: QR * toQSI[flowUnit],
        head1:     HR * toHM[headUnit],
        power1:    PR * toW[powerUnit],
      };
      const calc = calculateAffinityLaws(input);
      const stp  = generateAffinityLawsSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : "An error occurred" });
      setResult(null); setSteps(null);
    }
  };

  // Display helpers that convert SI results back to selected units
  const dispQ = (v: number) => fmt(v * fromQSI[flowUnit]);
  const dispH = (v: number) => fmt(v * fromHM[headUnit]);
  const dispP = (v: number) => fmt(v * fromW[powerUnit]);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Affinity Laws Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Scale centrifugal pump or fan performance to a new speed. Q scales linearly,
          H as speed squared, P as speed cubed — the key principle behind VFD energy savings.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded">
          Turbomachinery · Scaling
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
              placeholder={flowUnit === "m³/s" ? "0.1" : flowUnit === "L/s" ? "100" : "360"}
              error={errors.flowRate1} />
            <div className="flex gap-2 -mt-2">
              {(["L/s", "m³/s", "m³/h"] as FlowUnit[]).map(u => (
                <Btn key={u} label={u} active={flowUnit === u} onClick={() => handleFlowUnitChange(u)} />
              ))}
            </div>
          </div>

          {/* H₁ */}
          <div>
            <InputField label="Head at N₁" symbol="H₁" unit={headUnit}
              value={head1} onChange={setHead1}
              placeholder={headUnit === "m" ? "20" : "65.6"}
              error={errors.head1} />
            <div className="flex gap-2 -mt-2">
              {(["m", "ft"] as HeadUnit[]).map(u => (
                <Btn key={u} label={u} active={headUnit === u} onClick={() => handleHeadUnitChange(u)} />
              ))}
            </div>
          </div>

          {/* P₁ */}
          <div>
            <InputField label="Shaft power at N₁" symbol="P₁" unit={powerUnit}
              value={power1} onChange={setPower1}
              placeholder={powerUnit === "W" ? "5000" : powerUnit === "kW" ? "5" : "6.7"}
              error={errors.power1} />
            <div className="flex gap-2 -mt-2">
              {(["kW", "W", "hp"] as PowerUnit[]).map(u => (
                <Btn key={u} label={u} active={powerUnit === u} onClick={() => handlePowerUnitChange(u)} />
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
                Speed Ratio  N₂/N₁
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                N₂/N₁ = {fmt(result.speedRatio)}
              </p>
              <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                {parseFloat(speed1)} → {parseFloat(speed2)} rpm
                {" · "}
                power change: ×{fmt(result.powerRatio)} ({((result.powerRatio - 1) * 100).toFixed(1)}%)
              </p>
            </div>

            {/* Scaling law banner */}
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <p className="font-semibold text-gray-900 dark:text-white mb-1">
                Scaling ratios at N₂/N₁ = {fmt(result.speedRatio)}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Q × {fmt(result.flowRatio, 4)}
                {" · "}
                H × {fmt(result.headRatio, 4)}
                {" · "}
                P × {fmt(result.powerRatio, 4)}
                {" — "}
                power increases as the cube of speed ratio
              </p>
            </div>

            {/* Before/after comparison grid */}
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
                  label: `H [${headUnit}]`,
                  v1: dispH(result.head2 / result.headRatio),
                  v2: dispH(result.head2),
                  ratio: fmt(result.headRatio, 4),
                },
                {
                  label: `P [${powerUnit}]`,
                  v1: dispP(result.power2 / result.powerRatio),
                  v2: dispP(result.power2),
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
            <AssumptionsList assumptions={commonAssumptions.affinityLaws} />
            <CommonMistakes mistakes={commonMistakes.affinityLaws} />
          </div>
        </ResultsCard>
      )}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Speed-scaling affinity laws (constant diameter):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Q₂/Q₁ = N₂/N₁&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[flow scales linearly]</div>
              <div>H₂/H₁ = (N₂/N₁)²&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[head scales as square]</div>
              <div>P₂/P₁ = (N₂/N₁)³&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[power scales as cube]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Diameter-scaling laws (constant speed, geometric similarity):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Q₂/Q₁ = (D₂/D₁)³</div>
              <div>H₂/H₁ = (D₂/D₁)²</div>
              <div>P₂/P₁ = (D₂/D₁)⁵</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Combined scaling (speed and diameter):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Q₂/Q₁ = (D₂/D₁)³ × (N₂/N₁)</div>
              <div>H₂/H₁ = (D₂/D₁)² × (N₂/N₁)²</div>
              <div>P₂/P₁ = (D₂/D₁)⁵ × (N₂/N₁)³</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">VFD (variable frequency drive) energy savings:</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  {["N₂/N₁", "Q ratio", "H ratio", "P ratio", "Power saving"].map(h => (
                    <th key={h} className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { r: "1.00", q: "1.00", h: "1.00", p: "1.000", s: "0%"  },
                  { r: "0.90", q: "0.90", h: "0.81", p: "0.729", s: "27%" },
                  { r: "0.80", q: "0.80", h: "0.64", p: "0.512", s: "49%" },
                  { r: "0.70", q: "0.70", h: "0.49", p: "0.343", s: "66%" },
                  { r: "0.60", q: "0.60", h: "0.36", p: "0.216", s: "78%" },
                  { r: "0.50", q: "0.50", h: "0.25", p: "0.125", s: "88%" },
                ].map(({ r, q, h, p, s }) => (
                  <tr key={r}>
                    <td className="py-1.5 pr-3 font-mono">{r}</td>
                    <td className="py-1.5 pr-3 font-mono">{q}</td>
                    <td className="py-1.5 pr-3 font-mono">{h}</td>
                    <td className="py-1.5 pr-3 font-mono">{p}</td>
                    <td className="py-1.5 font-semibold text-green-700 dark:text-green-400">{s}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            The cube law for power is why VFDs are so effective in HVAC and pumping systems.
            Reducing speed by just 20% saves nearly half the power. The affinity laws assume
            geometric similarity and constant efficiency — they are accurate near the design
            point but degrade at very different operating conditions.
          </p>
        </div>
      </Card>

      <References refs={REFS_AFFINITY_LAWS} />
    </div>
  );
}
