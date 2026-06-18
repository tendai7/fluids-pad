"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_NORMAL_DEPTH } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateNormalDepth,
  generateNormalDepthSteps,
  commonAssumptions,
  commonMistakes,
  type NormalDepthMode,
  type NormalDepthShape,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit  = "m" | "mm" | "cm" | "ft";
type FlowUnit = "m³/s" | "L/s" | "ft³/s";
type SlopeUnit = "m/m" | "%" | "ft/ft";

const toLm:   Record<LenUnit,  number> = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048 };
const toQSI:  Record<FlowUnit, number> = { "m³/s": 1, "L/s": 1e-3, "ft³/s": 0.02832 };
const toSlope: Record<SlopeUnit, number> = { "m/m": 1, "%": 0.01, "ft/ft": 1 };

// Manning's n presets grouped
const N_PRESETS = [
  { group: "Lined channels",
    items: [
      { label: "Concrete, trowel finish",   n: "0.012" },
      { label: "Concrete, float finish",    n: "0.015" },
      { label: "Asphalt, smooth",           n: "0.013" },
      { label: "Brick in cement mortar",    n: "0.015" },
    ]},
  { group: "Excavated channels",
    items: [
      { label: "Earth, straight uniform",   n: "0.022" },
      { label: "Earth, winding sluggish",   n: "0.030" },
      { label: "Gravel bottom",             n: "0.025" },
      { label: "Rock cuts, smooth",         n: "0.025" },
    ]},
  { group: "Natural channels",
    items: [
      { label: "Clean, straight, full",     n: "0.030" },
      { label: "Clean, winding",            n: "0.035" },
      { label: "Weedy, slow, deep pools",   n: "0.070" },
    ]},
  { group: "Closed conduits",
    items: [
      { label: "Concrete pipe",             n: "0.013" },
      { label: "Corrugated metal pipe",     n: "0.024" },
      { label: "Plastic pipe (smooth)",     n: "0.011" },
    ]},
] as const;

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

export default function NormalDepthCalculator() {
  const [mode,       setMode]       = useState<NormalDepthMode>("findYn");
  const [shape,      setShape]      = useState<NormalDepthShape>("rectangular");
  // geometry
  const [b,          setB]          = useState("3.0");
  const [z,          setZ]          = useState("1.5");
  const [D,          setD]          = useState("1.2");
  const [geomUnit,   setGeomUnit]   = useState<LenUnit>("m");
  // flow
  const [Q,          setQ]          = useState("5.0");
  const [flowUnit,   setFlowUnit]   = useState<FlowUnit>("m³/s");
  const [yn,         setYn]         = useState("0.8");
  const [ynUnit,     setYnUnit]     = useState<LenUnit>("m");
  const [n,          setN]          = useState("0.022");
  const [S,          setS]          = useState("0.001");
  const [slopeUnit,  setSlopeUnit]  = useState<SlopeUnit>("m/m");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateNormalDepth> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateNormalDepthSteps> | null>(null);

  const handleClear = () => {
    setMode("findYn");
    setShape("rectangular");
    setB("");
    setZ("");
    setD("");
    setGeomUnit("m");
    setQ("");
    setFlowUnit("m³/s");
    setYn("");
    setYnUnit("m");
    setN("");
    setS("");
    setSlopeUnit("m/m");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const bSI  = parseFloat(b)  * toLm[geomUnit];
    const zVal = parseFloat(z);
    const DSI  = parseFloat(D)  * toLm[geomUnit];
    const QSI  = parseFloat(Q)  * toQSI[flowUnit];
    const ynSI = parseFloat(yn) * toLm[ynUnit];
    const SSI  = parseFloat(S)  * toSlope[slopeUnit];
    const nVal = parseFloat(n);

    if (shape !== "circular" && (isNaN(bSI) || bSI <= 0)) newErrors.b = "Must be positive";
    if (shape === "trapezoidal" && (isNaN(zVal) || zVal < 0)) newErrors.z = "Must be ≥ 0";
    if (shape === "circular"   && (isNaN(DSI)  || DSI <= 0)) newErrors.D = "Must be positive";

    if (mode === "findYn") {
      if (isNaN(QSI)  || QSI  <= 0) newErrors.Q = "Must be positive";
      if (isNaN(nVal) || nVal <= 0) newErrors.n = "Must be positive";
      if (isNaN(SSI)  || SSI  <= 0) newErrors.S = "Must be positive";
    } else if (mode === "findQ") {
      if (isNaN(ynSI) || ynSI <= 0) newErrors.yn = "Must be positive";
      if (isNaN(nVal) || nVal <= 0) newErrors.n  = "Must be positive";
      if (isNaN(SSI)  || SSI  <= 0) newErrors.S  = "Must be positive";
    } else if (mode === "findN") {
      if (isNaN(ynSI) || ynSI <= 0) newErrors.yn = "Must be positive";
      if (isNaN(QSI)  || QSI  <= 0) newErrors.Q  = "Must be positive";
      if (isNaN(SSI)  || SSI  <= 0) newErrors.S  = "Must be positive";
    } else {
      if (isNaN(ynSI) || ynSI <= 0) newErrors.yn = "Must be positive";
      if (isNaN(QSI)  || QSI  <= 0) newErrors.Q  = "Must be positive";
      if (isNaN(nVal) || nVal <= 0) newErrors.n  = "Must be positive";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        mode, channelShape: shape,
        bottomWidth:  shape !== "circular" ? bSI : undefined,
        sideSlope:    shape === "trapezoidal" ? zVal : undefined,
        diameter:     shape === "circular" ? DSI : undefined,
        flowRate:     (mode === "findYn" || mode === "findN" || mode === "findS") ? QSI  : undefined,
        normalDepth:  (mode === "findQ"  || mode === "findN" || mode === "findS") ? ynSI : undefined,
        manningN:     (mode === "findYn" || mode === "findQ" || mode === "findS") ? nVal : undefined,
        slope:        (mode === "findYn" || mode === "findQ" || mode === "findN") ? SSI  : undefined,
      };
      const calc = calculateNormalDepth(input as Parameters<typeof calculateNormalDepth>[0]);
      const stp  = generateNormalDepthSteps(input as Parameters<typeof calculateNormalDepth>[0], calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const Fr = result?.froudeNumber ?? 0;
  const slopeStr = result?.slopeType ?? "";
  const slopeBg =
    slopeStr.includes("mild")
      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      : slopeStr.includes("steep")
      ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
      : slopeStr.includes("critical")
      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
      : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-600";

  const modeLabels: Record<NormalDepthMode, React.ReactNode> = {
    findYn: <>Find y<sub>n</sub></>,
    findQ:  "Find Q",
    findN:  "Find n",
    findS:  "Find S",
  };

  const shapeLabels: Record<NormalDepthShape, string> = {
    rectangular:  "Rectangular",
    trapezoidal:  "Trapezoidal",
    circular:     "Circular",
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Normal Depth Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Depth of uniform flow in a prismatic channel — solved by bisection on Manning's equation
          Q = (1/n) × A × R<sub>h</sub><sup>2/3</sup> × S<sup>1/2</sup>.
          Supports rectangular, trapezoidal, and circular channels with mild / steep / critical slope classification.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 rounded">
          Open Channel Flow · Hydraulics
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Mode */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Solve for:</p>
          <div className="flex gap-2">
            {(Object.keys(modeLabels) as NormalDepthMode[]).map(m => (
              <ModeBtn key={m} label={modeLabels[m]} active={mode === m} onClick={() => setMode(m)} />
            ))}
          </div>
        </div>

        {/* Shape */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Channel cross-section:</p>
          <div className="flex gap-2">
            {(Object.keys(shapeLabels) as NormalDepthShape[]).map(s => (
              <ModeBtn key={s} label={shapeLabels[s]} active={shape === s} onClick={() => setShape(s)} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Geometry */}
          {shape !== "circular" ? (
            <div>
              <InputField label="Bottom width" symbol="b" unit={geomUnit}
                value={b} onChange={setB}
                placeholder={geomUnit === "m" ? "3.0" : "3000"}
                error={errors.b} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                  <Btn key={u} label={u} active={geomUnit === u} onClick={() => {
                    const conv = (v: string) => { const r = parseFloat(v); return isNaN(r) ? v : parseFloat((r * toLm[geomUnit] / toLm[u]).toPrecision(6)).toString(); };
                    setB(conv(b)); setD(conv(D)); setGeomUnit(u);
                  }} />
                ))}
              </div>
            </div>
          ) : (
            <div>
              <InputField label="Pipe / channel diameter" symbol="D" unit={geomUnit}
                value={D} onChange={setD}
                placeholder={geomUnit === "m" ? "1.2" : "1200"}
                error={errors.D} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                  <Btn key={u} label={u} active={geomUnit === u} onClick={() => {
                    const conv = (v: string) => { const r = parseFloat(v); return isNaN(r) ? v : parseFloat((r * toLm[geomUnit] / toLm[u]).toPrecision(6)).toString(); };
                    setB(conv(b)); setD(conv(D)); setGeomUnit(u);
                  }} />
                ))}
              </div>
            </div>
          )}

          {shape === "trapezoidal" && (
            <div>
              <InputField label="Side slope H:V" symbol="z" unit="dimensionless"
                value={z} onChange={setZ} error={errors.z} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                z = horizontal / vertical · z = 0 for vertical walls
              </p>
            </div>
          )}

          {/* Q — shown unless finding Q */}
          {mode !== "findQ" && (
            <div>
              <InputField label="Flow rate" symbol="Q" unit={flowUnit}
                value={Q} onChange={setQ}
                placeholder={flowUnit === "m³/s" ? "5.0" : "5000"}
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

          {/* y_n — shown for findQ / findN / findS */}
          {mode !== "findYn" && (
            <div>
              <InputField label="Normal depth" symbol="yn" unit={ynUnit}
                value={yn} onChange={setYn}
                placeholder={ynUnit === "m" ? "0.8" : "800"}
                error={errors.yn} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                  <Btn key={u} label={u} active={ynUnit === u} onClick={() => {
                    const raw = parseFloat(yn);
                    if (!isNaN(raw)) setYn(parseFloat((raw * toLm[ynUnit] / toLm[u]).toPrecision(6)).toString());
                    setYnUnit(u);
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* n — shown unless finding n */}
          {mode !== "findN" && (
            <div>
              <InputField label="Manning's roughness" symbol="n" unit="dimensionless"
                value={n} onChange={setN} error={errors.n} />
              <div className="mt-1">
                <select onChange={(e) => { if (e.target.value) setN(e.target.value); }}
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">n preset…</option>
                  {N_PRESETS.map(g => (
                    <optgroup key={g.group} label={g.group}>
                      {g.items.map(p => (
                        <option key={p.label} value={p.n}>{p.label} — n = {p.n}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* S — shown unless finding S */}
          {mode !== "findS" && (
            <div>
              <InputField label="Channel bed slope" symbol="S" unit={slopeUnit}
                value={S} onChange={setS}
                placeholder={slopeUnit === "%" ? "0.1" : "0.001"}
                error={errors.S} />
              <div className="flex gap-2 -mt-2">
                {(["m/m","%","ft/ft"] as SlopeUnit[]).map(u => (
                  <Btn key={u} label={u} active={slopeUnit === u} onClick={() => {
                    const raw = parseFloat(S);
                    if (!isNaN(raw)) setS(parseFloat((raw * toSlope[slopeUnit] / toSlope[u]).toPrecision(6)).toString());
                    setSlopeUnit(u);
                  }} />
                ))}
              </div>
            </div>
          )}
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
        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                {mode === "findYn" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Normal depth  y<sub>n</sub>  (uniform flow depth)
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      y<sub>n</sub> = {fmt(result.normalDepth, 5)} m
                    </p>
                  </>
                )}
                {mode === "findQ" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Flow rate at normal depth
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      Q = {fmt(result.flowRate, 5)} m³/s
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      y<sub>n</sub> = {fmt(result.normalDepth, 5)} m
                    </p>
                  </>
                )}
                {mode === "findN" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Manning's roughness coefficient n
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      n = {fmt(result.manningN, 5)}
                    </p>
                  </>
                )}
                {mode === "findS" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Required channel bed slope S
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      S = {fmt(result.slope, 5)}
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      = {fmt(result.slope * 100, 4)} % &nbsp;·&nbsp; 1 : {fmt(1 / result.slope, 4)}
                    </p>
                  </>
                )}
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Uniform flow quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: <span>y<sub>n</sub> [m]</span>,  value: fmt(result.normalDepth,     5) },
                    { label: "Q [m³/s]",                      value: fmt(result.flowRate,          5) },
                    { label: "V [m/s]",                       value: fmt(result.velocity,          5) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: <span>R<sub>h</sub> [m]</span>,  value: fmt(result.hydraulicRadius,  5) },
                    { label: "Fr",                            value: fmt(result.froudeNumber,      5) },
                    { label: <span>y<sub>c</sub> [m]</span>,  value: fmt(result.criticalDepth,     5) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slope classification banner */}
              <div className={`p-4 rounded-lg border ${slopeBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {slopeStr.includes("mild")
                    ? <>Mild slope — y<sub>n</sub> &gt; y<sub>c</sub>, normal flow is subcritical (Fr &lt; 1)</>
                    : slopeStr.includes("steep")
                    ? <>Steep slope — y<sub>n</sub> &lt; y<sub>c</sub>, normal flow is supercritical (Fr &gt; 1)</>
                    : slopeStr.includes("critical")
                    ? <>Critical slope — y<sub>n</sub> = y<sub>c</sub>, Fr = 1</>
                    : "Horizontal channel — no finite normal depth"}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.normalDepth} />
              <CommonMistakes mistakes={commonMistakes.normalDepth} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Normal depth definition:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Q = (1/n) × A(y<sub>n</sub>) × R<sub>h</sub>(y<sub>n</sub>)<sup>2/3</sup> × S<sup>1/2</sup></div>
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                y<sub>n</sub> is found by bisection — no closed form except for wide channels
              </div>
            </div>
            <p className="mt-2">
              Normal depth is the depth at which steady uniform flow occurs — the gravitational
              component along the slope exactly balances the friction force. It depends on Q, n,
              S, and channel geometry, but NOT on conditions upstream or downstream.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Slope classification:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Slope type</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Condition</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Normal flow regime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {([
                  { s: "Mild",       c: <>S &lt; S<sub>c</sub>, y<sub>n</sub> &gt; y<sub>c</sub></>,  f: "Subcritical (Fr < 1)" },
                  { s: "Critical",   c: <>S = S<sub>c</sub>, y<sub>n</sub> = y<sub>c</sub></>,       f: "Critical (Fr = 1)" },
                  { s: "Steep",      c: <>S &gt; S<sub>c</sub>, y<sub>n</sub> &lt; y<sub>c</sub></>, f: "Supercritical (Fr > 1)" },
                  { s: "Horizontal", c: "S = 0",                                                      f: "No normal depth exists" },
                  { s: "Adverse",    c: "S < 0 (uphill)",                                             f: "No normal depth exists" },
                ] as { s: string; c: React.ReactNode; f: string }[]).map(({ s, c, f }) => (
                  <tr key={s}>
                    <td className="py-1.5 pr-4 font-semibold">{s}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{c}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{f}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Channel geometry formulas:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">Rectangular (b = bottom width):</div>
              <div>A = b × y&nbsp;&nbsp;&nbsp;P = b + 2y&nbsp;&nbsp;&nbsp;R = by/(b + 2y)</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">Trapezoidal (z = H:V side slope):</div>
              <div>A = (b + zy)y&nbsp;&nbsp;&nbsp;P = b + 2y√(1+z²)&nbsp;&nbsp;&nbsp;R = A/P</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">Circular (D = diameter, θ = 2·arccos(1 − 2y/D)):</div>
              <div>A = (D²/8)(θ − sin θ)&nbsp;&nbsp;&nbsp;P = Dθ/2&nbsp;&nbsp;&nbsp;R = A/P</div>
            </div>
          </div>
        </div>
      </Card>

      <References refs={REFS_NORMAL_DEPTH} />
    </div>
  );
}
