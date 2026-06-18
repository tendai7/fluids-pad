"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_TRAPEZOIDAL_CHANNEL } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateTrapezoidalChannel,
  generateTrapezoidalChannelSteps,
  commonAssumptions,
  type TrapezoidalChannelMode,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

const TRAPEZOIDAL_MISTAKES: React.ReactNode[] = [
  <>Entering side slope <em>z</em> as V:H instead of H:V — z = 1.5 means 1.5 horizontal per 1 vertical, NOT the angle</>,
  <>Using the total channel top width as bottom width <em>b</em> — <em>b</em> is only the flat base; T = b + 2z·y is the top width</>,
  <>Substituting slope as a percentage (e.g., 0.1 for 0.1&nbsp;%) into Manning's equation — S must be the dimensionless rise/run (0.001, not 0.1&nbsp;%)</>,
  <>Confusing hydraulic radius R<sub>h</sub> = A/P with hydraulic depth D<sub>h</sub> = A/T — Manning's uses R<sub>h</sub>; the Froude number uses D<sub>h</sub> = A/T</>,
];

type LenUnit   = "m" | "mm" | "cm" | "ft";
type SlopeUnit = "m/m" | "%" | "ft/ft";
type FlowUnit  = "m³/s" | "L/s" | "ft³/s";

const toLm:    Record<LenUnit,   number> = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048 };
const toSlope: Record<SlopeUnit, number> = { "m/m": 1, "%": 0.01, "ft/ft": 1 };
const toQSI:   Record<FlowUnit,  number> = { "m³/s": 1, "L/s": 1e-3, "ft³/s": 0.02832 };

const N_PRESETS = [
  { group: "Lined channels",
    items: [
      { label: "Concrete, trowel finish",   n: "0.012" },
      { label: "Concrete, float finish",    n: "0.015" },
      { label: "Brick in cement mortar",    n: "0.015" },
      { label: "Asphalt, smooth",           n: "0.013" },
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
  { group: "Irrigation canals",
    items: [
      { label: "Earthen, straight",         n: "0.020" },
      { label: "Earthen, winding",          n: "0.025" },
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

const MODE_LABELS: Record<TrapezoidalChannelMode, React.ReactNode> = {
  findQ: "Find Q",
  findS: "Find S₀",
  findN: "Find n",
};

export default function TrapezoidalChannelCalculator() {
  const [mode,      setMode]      = useState<TrapezoidalChannelMode>("findQ");

  // geometry
  const [b,         setB]         = useState("2.0");
  const [z,         setZ]         = useState("1.5");
  const [y,         setY]         = useState("1.0");
  const [geomUnit,  setGeomUnit]  = useState<LenUnit>("m");

  // Manning's n
  const [n,         setN]         = useState("0.022");

  // bed slope
  const [S,         setS]         = useState("0.001");
  const [slopeUnit, setSlopeUnit] = useState<SlopeUnit>("m/m");

  // flow rate (needed for findS / findN)
  const [Q,         setQ]         = useState("5.0");
  const [flowUnit,  setFlowUnit]  = useState<FlowUnit>("m³/s");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateTrapezoidalChannel> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateTrapezoidalChannelSteps> | null>(null);

  const handleClear = () => {
    setMode("findQ");
    setB("");
    setZ("");
    setY("");
    setGeomUnit("m");
    setN("");
    setS("");
    setSlopeUnit("m/m");
    setQ("");
    setFlowUnit("m³/s");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const bSI  = parseFloat(b) * toLm[geomUnit];
    const zVal = parseFloat(z);
    const ySI  = parseFloat(y) * toLm[geomUnit];
    const nVal = parseFloat(n);
    const SSI  = parseFloat(S) * toSlope[slopeUnit];
    const QSI  = parseFloat(Q) * toQSI[flowUnit];

    if (isNaN(bSI) || bSI < 0)   newErrors.b = "Must be ≥ 0";
    if (isNaN(zVal) || zVal < 0) newErrors.z = "Must be ≥ 0";
    if (isNaN(ySI)  || ySI <= 0) newErrors.y = "Must be positive";
    if (mode !== "findN" && (isNaN(nVal) || nVal <= 0)) newErrors.n = "Must be positive";
    if (mode !== "findS" && (isNaN(SSI)  || SSI <= 0))  newErrors.S = "Must be positive";
    if (mode !== "findQ" && (isNaN(QSI)  || QSI <= 0))  newErrors.Q = "Must be positive";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        mode,
        bottomWidth: bSI,
        sideSlope:   zVal,
        depth:       ySI,
        manningN:    mode !== "findN" ? nVal : undefined,
        bedSlope:    mode !== "findS" ? SSI  : undefined,
        flowRate:    mode !== "findQ" ? QSI  : undefined,
      };
      const calc = calculateTrapezoidalChannel(input);
      const stp  = generateTrapezoidalChannelSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const slopeBg = result
    ? result.slopeType.includes("mild")
      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      : result.slopeType.includes("steep")
      ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
      : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
    : "";

  const slopeTextColor = result
    ? result.slopeType.includes("mild")
      ? "text-blue-700 dark:text-blue-300"
      : result.slopeType.includes("steep")
      ? "text-orange-700 dark:text-orange-300"
      : "text-yellow-700 dark:text-yellow-300"
    : "";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Trapezoidal Channel Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Flow properties in a prismatic trapezoidal open channel using Manning's equation.
          Solve for flow rate Q, bed slope S₀, or Manning's n. Includes Froude number,
          critical depth, specific energy, and slope classification.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 rounded">
          Open Channel Flow · Hydraulics
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Mode */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Solve for:</p>
          <div className="flex gap-2">
            {(Object.keys(MODE_LABELS) as TrapezoidalChannelMode[]).map(m => (
              <ModeBtn key={m} label={MODE_LABELS[m]} active={mode === m} onClick={() => setMode(m)} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Bottom width */}
          <div>
            <InputField label="Bottom width" symbol="b" unit={geomUnit}
              value={b} onChange={setB}
              placeholder={geomUnit === "m" ? "2.0" : geomUnit === "mm" ? "2000" : geomUnit === "cm" ? "200" : "6.56"}
              error={errors.b} />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 mb-1">
              Set b = 0 for a triangular channel
            </p>
            <div className="flex flex-wrap gap-2">
              {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                <Btn key={u} label={u} active={geomUnit === u} onClick={() => setGeomUnit(u)} />
              ))}
            </div>
          </div>

          {/* Side slope */}
          <div>
            <InputField label="Side slope H:V" symbol="z" unit="dimensionless"
              value={z} onChange={setZ} error={errors.z} />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
              z = 0 vertical walls · z = 1/√3 ≈ 0.577 most efficient · z = 1.5 common earthen
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              {[{ label: "0 (rect)", val: "0" }, { label: "0.577 (opt)", val: "0.577" },
                { label: "1.0",     val: "1.0" }, { label: "1.5",       val: "1.5" },
                { label: "2.0",     val: "2.0" }].map(p => (
                <Btn key={p.val} label={p.label} active={z === p.val} onClick={() => setZ(p.val)} />
              ))}
            </div>
          </div>

          {/* Flow depth */}
          <div>
            <InputField label="Flow depth (normal depth)" symbol="y" unit={geomUnit}
              value={y} onChange={setY}
              placeholder={geomUnit === "m" ? "1.0" : geomUnit === "mm" ? "1000" : "100"}
              error={errors.y} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                <Btn key={u} label={u} active={geomUnit === u} onClick={() => setGeomUnit(u)} />
              ))}
            </div>
          </div>

          {/* Manning's n — shown unless solving for n */}
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

          {/* Bed slope — shown unless solving for S */}
          {mode !== "findS" && (
            <div>
              <InputField label="Bed slope" symbol="S₀" unit={slopeUnit}
                value={S} onChange={setS}
                placeholder={slopeUnit === "%" ? "0.1" : "0.001"}
                error={errors.S} />
              <div className="flex gap-2 -mt-2">
                {(["m/m","%","ft/ft"] as SlopeUnit[]).map(u => (
                  <Btn key={u} label={u} active={slopeUnit === u} onClick={() => setSlopeUnit(u)} />
                ))}
              </div>
            </div>
          )}

          {/* Flow rate — shown for findS and findN */}
          {mode !== "findQ" && (
            <div>
              <InputField label="Flow rate" symbol="Q" unit={flowUnit}
                value={Q} onChange={setQ}
                placeholder={flowUnit === "m³/s" ? "5.0" : flowUnit === "L/s" ? "5000" : "177"}
                error={errors.Q} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m³/s","L/s","ft³/s"] as FlowUnit[]).map(u => (
                  <Btn key={u} label={u} active={flowUnit === u} onClick={() => setFlowUnit(u)} />
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
        const Fr = result.froudeNumber;
        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary result */}
              <div>
                {mode === "findQ" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Flow rate (uniform flow)
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      Q = {fmt(result.flowRate, 5)} m³/s
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      = {fmt(result.flowRate * 1000, 5)} L/s &nbsp;·&nbsp; V = {fmt(result.velocity, 5)} m/s
                    </p>
                  </>
                )}
                {mode === "findS" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Required bed slope
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      S₀ = {fmt(result.bedSlope, 4)}
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      = {fmt(result.bedSlope * 100, 4)} % &nbsp;·&nbsp; 1 : {fmt(1 / result.bedSlope, 4)}
                    </p>
                  </>
                )}
                {mode === "findN" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Manning's roughness coefficient
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      n = {fmt(result.manningN, 5)}
                    </p>
                  </>
                )}
              </div>

              {/* Cross-section quantities grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Cross-section quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "T [m]",  value: fmt(result.topWidth,       5) },
                    { label: "A [m²]", value: fmt(result.area,           5) },
                    { label: "P [m]",  value: fmt(result.wettedPerimeter, 5) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: <span>R<sub>h</sub> [m]</span>, value: fmt(result.hydraulicRadius, 5) },
                    { label: <span>D<sub>h</sub> [m]</span>, value: fmt(result.hydraulicDepth,  5) },
                    { label: "V [m/s]",                      value: fmt(result.velocity,         5) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "Fr",                            value: fmt(result.froudeNumber,    5) },
                    { label: <span>y<sub>c</sub> [m]</span>, value: fmt(result.criticalDepth,   5) },
                    { label: "E [m]",                        value: fmt(result.specificEnergy,   5) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slope / Froude classification banner */}
              <div className={`p-4 rounded-lg border ${slopeBg}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {result.slopeType.charAt(0).toUpperCase() + result.slopeType.slice(1)}
                    {" — Fr = "}{fmt(Fr, 4)}
                    {Fr < 0.99 ? " (subcritical)" : Fr > 1.01 ? " (supercritical)" : " (critical)"}
                  </p>
                  <span className={`text-sm font-bold uppercase tracking-wide ${slopeTextColor}`}>
                    {Fr < 0.99 ? "subcritical" : Fr > 1.01 ? "supercritical" : "critical"}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400">
                  <span>τ₀ = {fmt(result.bedShearStress, 4)} Pa</span>
                  <span>q = Q/T = {fmt(result.unitDischarge, 4)} m²/s</span>
                  <span>S<sub>c</sub> = {result.criticalSlope.toExponential(3)}</span>
                </div>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.trapezoidalChannel} />
              <CommonMistakes mistakes={TRAPEZOIDAL_MISTAKES} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Trapezoidal geometry:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1 text-xs">
              <div>T = b + 2z·y &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(top width)</div>
              <div>A = (b + z·y)·y &nbsp;&nbsp;(flow area)</div>
              <div>P = b + 2y·√(1+z²) (wetted perimeter)</div>
              <div>R<sub>h</sub> = A / P &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(hydraulic radius — used in Manning's)</div>
              <div>D<sub>h</sub> = A / T &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(hydraulic depth — used in Froude number)</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Manning's equation (uniform / normal flow):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>V = (1/n) × R<sub>h</sub><sup>2/3</sup> × S₀<sup>1/2</sup></div>
              <div>Q = V × A</div>
            </div>
            <p className="mt-2">
              Manning's equation applies only to uniform (normal) flow — depth, velocity, and
              cross-section are constant along the channel. The depth entered is therefore
              the <em>normal depth y_n</em>.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Solve for different unknowns:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1 text-xs">
              <div>Find Q: Q = (A/n) × R<sub>h</sub><sup>2/3</sup> × S₀<sup>1/2</sup></div>
              <div>Find S₀: S₀ = (V·n / R<sub>h</sub><sup>2/3</sup>)² &nbsp;&nbsp; where V = Q/A</div>
              <div>Find n: n = A·R<sub>h</sub><sup>2/3</sup>·S₀<sup>1/2</sup> / Q</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Slope and Froude classification:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Slope type</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Condition</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Normal flow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { s: "Mild",     c: <>y<sub>n</sub> &gt; y<sub>c</sub>, S &lt; S<sub>c</sub></>, f: "Subcritical (Fr < 1)" },
                  { s: "Critical", c: <>y<sub>n</sub> = y<sub>c</sub>, S = S<sub>c</sub></>,       f: "Critical (Fr = 1)" },
                  { s: "Steep",    c: <>y<sub>n</sub> &lt; y<sub>c</sub>, S &gt; S<sub>c</sub></>, f: "Supercritical (Fr > 1)" },
                ].map(({ s, c, f }) => (
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
            <p className="font-semibold mb-2">Most efficient (best hydraulic) trapezoidal section:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1 text-xs">
              <div>z = 1/√3 ≈ 0.577 &nbsp;(60° side slopes)</div>
              <div>b = 2y / √3 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(half of a regular hexagon)</div>
              <div>R<sub>h</sub> = y / 2 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(maximum discharge per unit area)</div>
            </div>
            <p className="mt-2">
              This geometry maximises flow for a given cross-sectional area and slope, minimising
              excavation cost. It is the standard for lined irrigation canals.
            </p>
          </div>

        </div>
      </Card>

      <References refs={REFS_TRAPEZOIDAL_CHANNEL} />
    </div>
  );
}
