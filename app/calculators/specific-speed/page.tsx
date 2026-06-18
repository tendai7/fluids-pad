"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_SPECIFIC_SPEED } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateSpecificSpeed,
  generateSpecificSpeedSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type FlowUnit = "m³/s" | "L/s" | "m³/h";
type HeadUnit = "m" | "ft";

const toQSI: Record<FlowUnit, number> = { "m³/s": 1, "L/s": 1e-3, "m³/h": 1 / 3600 };
const toHM:  Record<HeadUnit, number> = { "m": 1, "ft": 0.3048 };

type ClassKey = "very high head" | "radial" | "mixed" | "axial";

const CLASS_COLORS: Record<string, string> = {
  "Centrifugal — very high head": "bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200",
  "Centrifugal — radial flow":     "bg-blue-100  dark:bg-blue-900  text-blue-800  dark:text-blue-200",
  "Mixed flow":                    "bg-teal-100  dark:bg-teal-900  text-teal-800  dark:text-teal-200",
  "Axial flow":                    "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200",
};

const CLASS_BG: Record<string, string> = {
  "Centrifugal — very high head": "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800",
  "Centrifugal — radial flow":     "bg-blue-50  dark:bg-blue-900/20  border-blue-200  dark:border-blue-800",
  "Mixed flow":                    "bg-teal-50  dark:bg-teal-900/20  border-teal-200  dark:border-teal-800",
  "Axial flow":                    "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
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

export default function SpecificSpeedCalculator() {
  const [rotationalSpeed, setRotationalSpeed] = useState("1450");
  const [flowRate,         setFlowRate]        = useState("100");
  const [flowUnit,         setFlowUnit]        = useState<FlowUnit>("L/s");
  const [head,             setHead]            = useState("20");
  const [headUnit,         setHeadUnit]        = useState<HeadUnit>("m");
  const [errors,           setErrors]          = useState<Record<string, string>>({});
  const [result,           setResult]          = useState<ReturnType<typeof calculateSpecificSpeed> | null>(null);
  const [steps,            setSteps]           = useState<ReturnType<typeof generateSpecificSpeedSteps> | null>(null);

  const handleFlowUnitChange = (newUnit: FlowUnit) => {
    const q = parseFloat(flowRate);
    if (!isNaN(q)) setFlowRate(fmt(q * toQSI[flowUnit] / toQSI[newUnit], 5));
    setFlowUnit(newUnit);
  };
  const handleHeadUnitChange = (newUnit: HeadUnit) => {
    const h = parseFloat(head);
    if (!isNaN(h)) setHead(fmt(h * toHM[headUnit] / toHM[newUnit], 5));
    setHeadUnit(newUnit);
  };

  const handleClear = () => {
    setRotationalSpeed("");
    setFlowRate("");
    setFlowUnit("L/s");
    setHead("");
    setHeadUnit("m");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const N    = parseFloat(rotationalSpeed);
    const QRaw = parseFloat(flowRate);
    const HRaw = parseFloat(head);

    if (isNaN(N)    || N    <= 0) newErrors.rotationalSpeed = "Must be positive (rpm)";
    if (isNaN(QRaw) || QRaw <= 0) newErrors.flowRate        = "Must be positive";
    if (isNaN(HRaw) || HRaw <= 0) newErrors.head            = "Must be positive";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        rotationalSpeed: N,
        flowRate:        QRaw * toQSI[flowUnit],
        head:            HRaw * toHM[headUnit],
      };
      const calc = calculateSpecificSpeed(input);
      const stp  = generateSpecificSpeedSteps(input, calc);
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
          Specific Speed Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Dimensionless specific speed Ω<sub>s</sub> classifies pump type and impeller geometry.
          Also computes US dimensional N<sub>s</sub> and European N<sub>q</sub> forms.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded">
          Turbomachinery · Classification
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* N */}
          <div>
            <InputField label="Rotational speed" symbol="N" unit="rpm"
              value={rotationalSpeed} onChange={setRotationalSpeed} error={errors.rotationalSpeed} />
            <div className="flex gap-2 -mt-2">
              {["750", "960", "1450", "1500", "2900", "3000"].map(v => (
                <Btn key={v} label={v} active={rotationalSpeed === v} onClick={() => setRotationalSpeed(v)} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Common 50 Hz synchronous speeds: 750, 1000, 1500, 3000 rpm
            </p>
          </div>

          {/* Q */}
          <div>
            <InputField label="Volume flow rate" symbol="Q" unit={flowUnit}
              value={flowRate} onChange={setFlowRate}
              placeholder={flowUnit === "m³/s" ? "0.1" : flowUnit === "L/s" ? "100" : "360"}
              error={errors.flowRate} />
            <div className="flex gap-2 -mt-2">
              {(["L/s", "m³/s", "m³/h"] as FlowUnit[]).map(u => (
                <Btn key={u} label={u} active={flowUnit === u} onClick={() => handleFlowUnitChange(u)} />
              ))}
            </div>
          </div>

          {/* H */}
          <div>
            <InputField label="Total head at BEP" symbol="H" unit={headUnit}
              value={head} onChange={setHead}
              placeholder={headUnit === "m" ? "20" : "65.6"}
              error={errors.head} />
            <div className="flex gap-2 -mt-2">
              {(["m", "ft"] as HeadUnit[]).map(u => (
                <Btn key={u} label={u} active={headUnit === u} onClick={() => handleHeadUnitChange(u)} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Use BEP (best efficiency point) conditions for correct pump classification
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
                  Specific Speed  Ω<sub>s</sub>  (dimensionless SI)
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  Ω<sub>s</sub> = {fmt(result.specificSpeed)}
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  N<sub>s</sub> = {Math.round(result.nsUS)} (US)
                  {" · "}
                  N<sub>q</sub> = {fmt(result.nqEU)} (EU)
                </p>
              </div>
              <span className={`mt-1 px-3 py-1 rounded text-sm font-semibold ${CLASS_COLORS[result.classification] ?? "bg-gray-100 text-gray-800"}`}>
                {result.impellerShape}
              </span>
            </div>

            {/* Classification banner */}
            <div className={`p-4 rounded-lg border ${CLASS_BG[result.classification] ?? "bg-gray-50 border-gray-200"}`}>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">
                {result.classification}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {result.impellerShape}
                {" · "}
                Ω<sub>s</sub> = {fmt(result.specificSpeed)}
                {result.specificSpeed < 0.4
                  ? " — very narrow radial impeller, typically multi-stage; H/Q ratio is extremely high"
                  : result.specificSpeed < 1.5
                  ? " — standard centrifugal impeller; most common pump design for medium head and flow"
                  : result.specificSpeed < 4.0
                  ? " — mixed-flow impeller combines radial and axial components; medium head and higher flow"
                  : " — axial/propeller impeller; very low head, very high flow; sensitive to flow variation"}
              </p>
            </div>

            {/* Specific speed grid */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Specific speed in all three conventions
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: <span>Ω<sub>s</sub> (SI, dimensionless)</span>, value: fmt(result.specificSpeed, 4) },
                  { label: <span>N<sub>s</sub> (US rpm-gpm-ft)</span>,     value: Math.round(result.nsUS).toString() },
                  { label: <span>N<sub>q</sub> (EU rpm-m³/s-m)</span>,    value: fmt(result.nqEU, 4) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "ω [rad/s]",           value: fmt(result.omega) },
                  { label: "√Q [m^(3/2)/s^(1/2)]",value: fmt(result.sqrtQ, 4) },
                  { label: "(gH)^0.75",             value: fmt(result.ghPow, 4) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.specificSpeed} />
            <CommonMistakes mistakes={commonMistakes.specificSpeed} />
          </div>
        </ResultsCard>
      )}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Specific speed — three conventions:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Ω<sub>s</sub> = ω√Q / (gH)<sup>3/4</sup>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[dimensionless SI — preferred]</div>
              <div>N<sub>s</sub> = N√Q[gpm] / H[ft]<sup>3/4</sup>&nbsp;&nbsp;[US dimensional  ≈ 2733 × Ω<sub>s</sub>]</div>
              <div>N<sub>q</sub> = N√Q[m³/s] / H[m]<sup>3/4</sup>&nbsp;&nbsp;[European         ≈ 52.9 × Ω<sub>s</sub>]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Pump classification by specific speed:</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  {[<span key="o">Ω<sub>s</sub></span>, <span key="n">N<sub>s</sub> (US)</span>, <span key="q">N<sub>q</sub> (EU)</span>, "Type", "Impeller"].map((h, i) => (
                    <th key={i} className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { o: "< 0.4",    n: "< 1100",    q: "< 21",   t: "Centrifugal (very high head)", imp: "Narrow radial / multi-stage" },
                  { o: "0.4–1.5",  n: "1100–4100", q: "21–79",  t: "Centrifugal (radial)",         imp: "Radial impeller" },
                  { o: "1.5–4.0",  n: "4100–10900",q: "79–212", t: "Mixed flow",                   imp: "Mixed-flow impeller" },
                  { o: "> 4.0",    n: "> 10900",   q: "> 212",  t: "Axial flow",                   imp: "Propeller / axial" },
                ].map(({ o, n, q, t, imp }) => (
                  <tr key={o}>
                    <td className="py-1.5 pr-3 font-mono">{o}</td>
                    <td className="py-1.5 pr-3 font-mono">{n}</td>
                    <td className="py-1.5 pr-3 font-mono">{q}</td>
                    <td className="py-1.5 pr-3">{t}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{imp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>ω = angular velocity [rad/s] = N × 2π/60</li>
              <li>Q = volumetric flow rate at BEP [m³/s]</li>
              <li>H = total head at BEP [m]</li>
              <li>g = 9.81 m/s²</li>
              <li>Ω<sub>s</sub> is dimensionless and system-independent — use this for pump selection and similarity analysis</li>
            </ul>
          </div>

          <p>
            Specific speed is a shape number, not a dimensional speed. It determines the
            optimal impeller geometry at the best efficiency point. High Ω<sub>s</sub>
            pumps deliver high flow at low head (axial), while low Ω<sub>s</sub> pumps
            deliver high head at low flow (radial). The affinity laws and pump similarity
            both rely on Ω<sub>s</sub> being conserved.
          </p>
        </div>
      </Card>

      <References refs={REFS_SPECIFIC_SPEED} />
    </div>
  );
}
