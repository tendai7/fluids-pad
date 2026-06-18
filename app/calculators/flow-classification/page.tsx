"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_FLOW_CLASSIFICATION_OC } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateFlowClassification,
  generateFlowClassificationSteps,
  commonAssumptions,
  type FlowClassificationShape,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

const FLOW_CLASSIFICATION_MISTAKES: React.ReactNode[] = [
  <>Using geometric depth <em>y</em> as hydraulic depth D<sub>h</sub> for non-rectangular channels — D<sub>h</sub> = A/T uses top width T, not depth y directly</>,
  <>Confusing hydraulic radius R<sub>h</sub> = A/P (used in Reynolds number) with hydraulic depth D<sub>h</sub> = A/T (used in Froude number)</>,
  <>Applying open-channel Reynolds number thresholds (500 / 12 500) to pipe flow — pipe flow transitions at Re ≈ 2 300</>,
  <>Treating the Froude number boundary as a sharp Fr = 1 threshold — in practice, flow near Fr = 0.9–1.1 is transitional and unstable</>,
];

type LenUnit  = "m" | "mm" | "cm" | "ft";
type FlowUnit = "m³/s" | "L/s" | "ft³/s";
type VelUnit  = "m/s" | "ft/s" | "cm/s";

const toLm:   Record<LenUnit,  number> = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048 };
const toQSI:  Record<FlowUnit, number> = { "m³/s": 1, "L/s": 1e-3, "ft³/s": 0.02832 };
const toVSI:  Record<VelUnit,  number> = { "m/s": 1, "ft/s": 0.3048, "cm/s": 0.01 };

// Water kinematic viscosity presets (m²/s)
const NU_PRESETS = [
  { label: "Water  5 °C",  nu: 1.519e-6 },
  { label: "Water 10 °C",  nu: 1.307e-6 },
  { label: "Water 15 °C",  nu: 1.139e-6 },
  { label: "Water 20 °C",  nu: 1.004e-6 },
  { label: "Water 25 °C",  nu: 0.893e-6 },
  { label: "Water 30 °C",  nu: 0.801e-6 },
  { label: "Water 40 °C",  nu: 0.658e-6 },
  { label: "Water 50 °C",  nu: 0.553e-6 },
];

type FlowInput = "velocity" | "flowRate";

function fmt(n: number, sig = 4) { return parseFloat(n.toPrecision(sig)).toString(); }

function Btn({ label, active, onClick }: { label: React.ReactNode; active: boolean; onClick: () => void }) {
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

const SHAPE_LABELS: Record<FlowClassificationShape, string> = {
  rectangular: "Rectangular",
  trapezoidal: "Trapezoidal",
  circular:    "Circular",
  wide:        "Wide (2D)",
};

export default function FlowClassificationCalculator() {
  const [shape,     setShape]     = useState<FlowClassificationShape>("rectangular");
  const [flowInput, setFlowInput] = useState<FlowInput>("velocity");

  // geometry
  const [b,        setB]        = useState("3.0");
  const [z,        setZ]        = useState("1.5");
  const [D,        setD]        = useState("1.2");
  const [y,        setY]        = useState("0.8");
  const [geomUnit, setGeomUnit] = useState<LenUnit>("m");

  // flow
  const [V,        setV]        = useState("1.5");
  const [velUnit,  setVelUnit]  = useState<VelUnit>("m/s");
  const [Q,        setQ]        = useState("3.0");
  const [flowUnit, setFlowUnit] = useState<FlowUnit>("m³/s");

  // viscosity
  const [nu,    setNu]    = useState("1.004e-6");
  const [selNu, setSelNu] = useState("Water 20 °C");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateFlowClassification> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateFlowClassificationSteps> | null>(null);

  const handleClear = () => {
    setShape("rectangular");
    setFlowInput("velocity");
    setB("");
    setZ("");
    setD("");
    setY("");
    setGeomUnit("m");
    setV("");
    setVelUnit("m/s");
    setQ("");
    setFlowUnit("m³/s");
    setNu("");
    setSelNu("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const bSI  = parseFloat(b)  * toLm[geomUnit];
    const zVal = parseFloat(z);
    const DSI  = parseFloat(D)  * toLm[geomUnit];
    const ySI  = parseFloat(y)  * toLm[geomUnit];
    const VSI  = parseFloat(V)  * toVSI[velUnit];
    const QSI  = parseFloat(Q)  * toQSI[flowUnit];
    const nuVal= parseFloat(nu);

    if (shape !== "circular" && shape !== "wide" && (isNaN(bSI) || bSI <= 0)) newErrors.b = "Must be positive";
    if (shape === "trapezoidal" && (isNaN(zVal) || zVal < 0)) newErrors.z = "Must be ≥ 0";
    if (shape === "circular"   && (isNaN(DSI)  || DSI  <= 0)) newErrors.D = "Must be positive";
    if (isNaN(ySI) || ySI <= 0) newErrors.y = "Must be positive";

    // circular: depth cannot exceed diameter
    if (shape === "circular" && !isNaN(DSI) && !isNaN(ySI) && ySI >= DSI)
      newErrors.y = "Depth must be less than diameter";

    if (flowInput === "velocity") {
      if (isNaN(VSI) || VSI <= 0) newErrors.V = "Must be positive";
    } else {
      if (isNaN(QSI) || QSI <= 0) newErrors.Q = "Must be positive";
    }
    if (isNaN(nuVal) || nuVal <= 0) newErrors.nu = "Must be positive";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        channelShape: shape,
        bottomWidth:  (shape === "rectangular" || shape === "trapezoidal" || shape === "wide") ? bSI : undefined,
        sideSlope:    shape === "trapezoidal" ? zVal : undefined,
        diameter:     shape === "circular"    ? DSI  : undefined,
        depth: ySI,
        velocity:     flowInput === "velocity" ? VSI : undefined,
        flowRate:     flowInput === "flowRate" ? QSI : undefined,
        kinematicViscosity: nuVal,
      };
      const calc = calculateFlowClassification(input);
      const stp  = generateFlowClassificationSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  // Derived colors for results
  const frBg = result
    ? result.froudeRegime === "subcritical"
      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
      : result.froudeRegime === "supercritical"
      ? "bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700"
      : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
    : "";

  const frTextColor = result
    ? result.froudeRegime === "subcritical"
      ? "text-blue-700 dark:text-blue-300"
      : result.froudeRegime === "supercritical"
      ? "text-orange-700 dark:text-orange-300"
      : "text-yellow-700 dark:text-yellow-300"
    : "";

  const reBg = result
    ? result.reynoldsRegime === "turbulent"
      ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
      : result.reynoldsRegime === "transitional"
      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
      : "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
    : "";

  const reTextColor = result
    ? result.reynoldsRegime === "turbulent"
      ? "text-red-700 dark:text-red-300"
      : result.reynoldsRegime === "transitional"
      ? "text-yellow-700 dark:text-yellow-300"
      : "text-green-700 dark:text-green-300"
    : "";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Flow Classification Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Classify open channel flow by Froude number (subcritical / critical / supercritical) and
          Reynolds number (laminar / transitional / turbulent). Supports rectangular, trapezoidal,
          circular, and wide (2-D) channel cross-sections.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 rounded">
          Open Channel Flow · Hydraulics
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Channel shape */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Channel cross-section:</p>
          <div className="flex gap-2">
            {(Object.keys(SHAPE_LABELS) as FlowClassificationShape[]).map(s => (
              <ModeBtn key={s} label={SHAPE_LABELS[s]} active={shape === s} onClick={() => setShape(s)} />
            ))}
          </div>
        </div>

        {/* Flow input mode */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Specify flow as:</p>
          <div className="flex gap-2 max-w-xs">
            <ModeBtn label="Velocity  V" active={flowInput === "velocity"} onClick={() => setFlowInput("velocity")} />
            <ModeBtn label="Flow rate  Q" active={flowInput === "flowRate"} onClick={() => setFlowInput("flowRate")} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Geometry — width/diameter */}
          {shape !== "circular" && shape !== "wide" && (
            <div>
              <InputField label="Bottom width" symbol="b" unit={geomUnit}
                value={b} onChange={setB}
                placeholder={geomUnit === "m" ? "3.0" : geomUnit === "mm" ? "3000" : geomUnit === "cm" ? "300" : "10"}
                error={errors.b} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                  <Btn key={u} label={u} active={geomUnit === u} onClick={() => {
                    const conv = (v: string) => { const r = parseFloat(v); return isNaN(r) ? v : parseFloat((r * toLm[geomUnit] / toLm[u]).toPrecision(6)).toString(); };
                    setB(conv(b)); setY(conv(y)); setD(conv(D)); setGeomUnit(u);
                  }} />
                ))}
              </div>
            </div>
          )}

          {shape === "wide" && (
            <div className="flex items-start pt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Wide channel — side walls neglected; hydraulic depth D<sub>h</sub> ≈ y.
              </p>
            </div>
          )}

          {shape === "circular" && (
            <div>
              <InputField label="Pipe diameter" symbol="D" unit={geomUnit}
                value={D} onChange={setD}
                placeholder={geomUnit === "m" ? "1.2" : geomUnit === "mm" ? "1200" : "120"}
                error={errors.D} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                  <Btn key={u} label={u} active={geomUnit === u} onClick={() => {
                    const conv = (v: string) => { const r = parseFloat(v); return isNaN(r) ? v : parseFloat((r * toLm[geomUnit] / toLm[u]).toPrecision(6)).toString(); };
                    setB(conv(b)); setY(conv(y)); setD(conv(D)); setGeomUnit(u);
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Side slope — trapezoidal only */}
          {shape === "trapezoidal" && (
            <div>
              <InputField label="Side slope H:V" symbol="z" unit="dimensionless"
                value={z} onChange={setZ} error={errors.z} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                z = 0 for vertical walls
              </p>
            </div>
          )}

          {/* Flow depth */}
          <div>
            <InputField label="Flow depth" symbol="y" unit={geomUnit}
              value={y} onChange={setY}
              placeholder={geomUnit === "m" ? "0.8" : geomUnit === "mm" ? "800" : "80"}
              error={errors.y} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                <Btn key={u} label={u} active={geomUnit === u} onClick={() => {
                  const conv = (v: string) => { const r = parseFloat(v); return isNaN(r) ? v : parseFloat((r * toLm[geomUnit] / toLm[u]).toPrecision(6)).toString(); };
                  setB(conv(b)); setY(conv(y)); setD(conv(D)); setGeomUnit(u);
                }} />
              ))}
            </div>
          </div>

          {/* Velocity or flow rate */}
          {flowInput === "velocity" ? (
            <div>
              <InputField label="Mean velocity" symbol="V" unit={velUnit}
                value={V} onChange={setV}
                placeholder={velUnit === "m/s" ? "1.5" : velUnit === "ft/s" ? "5" : "150"}
                error={errors.V} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m/s","ft/s","cm/s"] as VelUnit[]).map(u => (
                  <Btn key={u} label={u} active={velUnit === u} onClick={() => {
                    const raw = parseFloat(V);
                    if (!isNaN(raw)) setV(parseFloat((raw * toVSI[velUnit] / toVSI[u]).toPrecision(6)).toString());
                    setVelUnit(u);
                  }} />
                ))}
              </div>
            </div>
          ) : (
            <div>
              <InputField label="Flow rate" symbol="Q" unit={flowUnit}
                value={Q} onChange={setQ}
                placeholder={flowUnit === "m³/s" ? "3.0" : flowUnit === "L/s" ? "3000" : "106"}
                error={errors.Q} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m³/s","L/s","ft³/s"] as FlowUnit[]).map(u => (
                  <Btn key={u} label={u} active={flowUnit === u} onClick={() => {
                    const raw = parseFloat(Q);
                    if (!isNaN(raw)) setQ(parseFloat((raw * toQSI[flowUnit] / toQSI[u]).toPrecision(6)).toString());
                    setFlowUnit(u);
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Kinematic viscosity */}
          <div>
            <InputField label="Kinematic viscosity" symbol="ν" unit="m²/s"
              value={nu} onChange={setNu} error={errors.nu} />
            <div className="mt-1">
              <select
                value={selNu}
                onChange={(e) => {
                  const preset = NU_PRESETS.find(p => p.label === e.target.value);
                  if (preset) { setNu(preset.nu.toExponential(3)); setSelNu(preset.label); }
                }}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">ν preset…</option>
                {NU_PRESETS.map(p => (
                  <option key={p.label} value={p.label}>{p.label} — ν = {p.nu.toExponential(3)} m²/s</option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {errors.general && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.general}</p>
        )}
        <button onClick={handleCalculate}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors">
          Classify
        </button>
        <ClearButton onClear={handleClear} />
      </Card>

      {/* Results */}
      {result && steps && (() => {
        const Fr = result.froudeNumber;
        const Re = result.reynoldsNumber;
        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Froude classification banner */}
              <div className={`p-4 rounded-lg border ${frBg}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold text-gray-900 dark:text-white text-lg">
                    Froude number — Fr = {fmt(Fr, 5)}
                  </p>
                  <span className={`text-sm font-bold uppercase tracking-wide ${frTextColor}`}>
                    {result.froudeRegime}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {result.froudeRegime === "subcritical"
                    ? <>Fr &lt; 1 — tranquil (streaming) flow. Gravity dominates inertia. Downstream controls depth; small disturbances travel upstream.</>
                    : result.froudeRegime === "critical"
                    ? <>Fr ≈ 1 — critical flow. Maximum discharge per unit specific energy. Flow is sensitive and difficult to sustain in practice.</>
                    : <>Fr &gt; 1 — rapid (shooting) flow. Inertia dominates gravity. Upstream controls depth; disturbances cannot propagate upstream.</>}
                </p>
              </div>

              {/* Reynolds classification banner */}
              <div className={`p-4 rounded-lg border ${reBg}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold text-gray-900 dark:text-white text-lg">
                    Reynolds number — Re = {Re < 1e4 ? fmt(Re, 5) : Re.toExponential(3)}
                  </p>
                  <span className={`text-sm font-bold uppercase tracking-wide ${reTextColor}`}>
                    {result.reynoldsRegime}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {result.reynoldsRegime === "laminar"
                    ? "Re < 500 — laminar flow. Streamlines parallel and smooth. Rarely seen in practice except for very shallow, slow flows (e.g., thin-film overland flow)."
                    : result.reynoldsRegime === "transitional"
                    ? "500 ≤ Re < 12 500 — transitional flow. Intermittent turbulent bursts; regime is unstable. Uncommon in natural channels."
                    : "Re ≥ 12 500 — turbulent flow. Velocity fluctuations throughout the cross-section. The normal regime for rivers, canals, and storm drains."}
                </p>
              </div>

              {/* Hydraulic quantities grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Cross-section and flow quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "A [m²]",  value: fmt(result.flowArea,        5) },
                    { label: "P [m]",   value: fmt(result.wettedPerimeter,  5) },
                    { label: <span>R<sub>h</sub> [m]</span>, value: fmt(result.hydraulicRadius, 5) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "T [m]",    value: fmt(result.topWidth,       5) },
                    { label: <span>D<sub>h</sub> [m]</span>, value: fmt(result.hydraulicDepth, 5) },
                    { label: "V [m/s]",  value: fmt(result.velocity,       5) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "Q [m³/s]", value: fmt(result.flowRate,     5) },
                    { label: "Fr",       value: fmt(result.froudeNumber,  5) },
                    { label: "Re",       value: result.reynoldsNumber < 1e4 ? fmt(result.reynoldsNumber, 5) : result.reynoldsNumber.toExponential(3) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.flowClassification} />
              <CommonMistakes mistakes={FLOW_CLASSIFICATION_MISTAKES} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Froude number — gravitational classification:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Fr = V / √(g × D<sub>h</sub>)</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                D<sub>h</sub> = A / T &nbsp;·&nbsp; hydraulic depth using top width T (free-surface width)
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                For rectangular / wide channels: D<sub>h</sub> = y
              </div>
            </div>
            <table className="w-full text-sm border-collapse mt-3">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Regime</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Condition</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Character</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { r: "Subcritical",   c: "Fr < 1",  d: "Tranquil / streaming — downstream controls" },
                  { r: "Critical",      c: "Fr = 1",  d: "Maximum discharge for given specific energy" },
                  { r: "Supercritical", c: "Fr > 1",  d: "Rapid / shooting — upstream controls" },
                ].map(({ r, c, d }) => (
                  <tr key={r}>
                    <td className="py-1.5 pr-4 font-semibold">{r}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{c}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Reynolds number — viscous classification:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Re = V × R<sub>h</sub> / ν</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                R<sub>h</sub> = A / P &nbsp;·&nbsp; hydraulic radius; &nbsp;ν = μ/ρ — kinematic viscosity
              </div>
            </div>
            <table className="w-full text-sm border-collapse mt-3">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Regime</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Re (open channel)</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { r: "Laminar",      re: "< 500",          n: "Sheet flow, overland flow; viscous forces dominant" },
                  { r: "Transitional", re: "500 – 12 500",   n: "Intermittent turbulence; design should avoid this range" },
                  { r: "Turbulent",    re: "> 12 500",        n: "Normal for rivers, canals, drains; velocity well mixed" },
                ].map(({ r, re, n }) => (
                  <tr key={r}>
                    <td className="py-1.5 pr-4 font-semibold">{r}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{re}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Note: open-channel Re thresholds differ from pipe flow (laminar below Re ≈ 2 300)
              because the hydraulic radius is used instead of diameter.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Channel geometry summary:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-2 text-xs">
              <div className="text-gray-500 dark:text-gray-400">Rectangular (b = bottom width):</div>
              <div>A = b·y &nbsp;·&nbsp; P = b + 2y &nbsp;·&nbsp; T = b &nbsp;·&nbsp; D<sub>h</sub> = y</div>
              <div className="text-gray-500 dark:text-gray-400 pt-1">Trapezoidal (z = H:V side slope):</div>
              <div>A = (b + z·y)·y &nbsp;·&nbsp; P = b + 2y√(1+z²) &nbsp;·&nbsp; T = b + 2z·y</div>
              <div className="text-gray-500 dark:text-gray-400 pt-1">Circular (D = diameter, θ = 2·arccos(1 − 2y/D)):</div>
              <div>A = (D²/8)(θ − sin θ) &nbsp;·&nbsp; P = Dθ/2 &nbsp;·&nbsp; T = D·sin(θ/2)</div>
              <div className="text-gray-500 dark:text-gray-400 pt-1">Wide (2D) — side walls negligible:</div>
              <div>D<sub>h</sub> = y &nbsp;·&nbsp; R<sub>h</sub> ≈ y &nbsp;·&nbsp; Use when b ≫ y</div>
            </div>
          </div>

        </div>
      </Card>

      <References refs={REFS_FLOW_CLASSIFICATION_OC} />
    </div>
  );
}
