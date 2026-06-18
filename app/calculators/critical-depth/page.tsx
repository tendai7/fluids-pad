"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_CRITICAL_DEPTH } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateCriticalDepth,
  generateCriticalDepthSteps,
  commonAssumptions,
  commonMistakes,
  type CriticalDepthChannel,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit = "m" | "mm" | "cm" | "ft";
type FlowUnit = "m³/s" | "L/s" | "ft³/s";

const toLm:  Record<LenUnit,  number> = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048 };
const toQSI: Record<FlowUnit, number> = { "m³/s": 1, "L/s": 1e-3, "ft³/s": 0.02832 };

// Manning's n presets for critical slope
const N_PRESETS = [
  { label: "Concrete, trowel finish",   n: "0.012" },
  { label: "Concrete, float finish",    n: "0.015" },
  { label: "Earth, straight uniform",   n: "0.022" },
  { label: "Gravel bottom",             n: "0.025" },
  { label: "Natural channel, clean",    n: "0.030" },
  { label: "Natural, some weeds",       n: "0.035" },
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

export default function CriticalDepthCalculator() {
  const [channelType, setChannelType] = useState<CriticalDepthChannel>("rectangular");
  const [Q,         setQ]         = useState("10");
  const [flowUnit,  setFlowUnit]  = useState<FlowUnit>("m³/s");
  const [b,         setB]         = useState("2.0");
  const [z,         setZ]         = useState("1.5");
  const [lenUnit,   setLenUnit]   = useState<LenUnit>("m");
  const [n,         setN]         = useState("");
  const [showN,     setShowN]     = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateCriticalDepth> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateCriticalDepthSteps> | null>(null);

  const handleClear = () => {
    setChannelType("rectangular");
    setQ("");
    setFlowUnit("m³/s");
    setB("");
    setZ("");
    setLenUnit("m");
    setN("");
    setShowN(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const QSI  = parseFloat(Q) * toQSI[flowUnit];
    const bSI  = parseFloat(b) * toLm[lenUnit];
    const zVal = parseFloat(z);
    const nVal = parseFloat(n);

    if (isNaN(QSI) || QSI <= 0) newErrors.Q = "Must be a positive number";
    if (isNaN(bSI) || bSI <= 0) newErrors.b = "Must be a positive number";
    if (channelType === "trapezoidal" && (isNaN(zVal) || zVal < 0))
      newErrors.z = "Must be ≥ 0";
    if (showN && (isNaN(nVal) || nVal <= 0)) newErrors.n = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        channelType,
        flowRate:  QSI,
        width:     bSI,
        sideSlope: channelType === "trapezoidal" ? zVal : undefined,
        manningN:  showN ? nVal : undefined,
      };
      const calc = calculateCriticalDepth(input);
      const stp  = generateCriticalDepthSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const geomLabel = channelType === "circular" ? "Diameter" : "Bottom width";
  const geomPlaceholder = channelType === "circular" ? "1.2" : "2.0";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Critical Depth Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Depth at which the Froude number equals 1 — minimum specific energy for a given discharge.
          Supports rectangular (closed form), trapezoidal, and circular channels (bisection method).
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 rounded">
          Open Channel Flow · Hydraulics
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Channel shape */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Channel cross-section:</p>
          <div className="flex gap-2">
            <ModeBtn label="Rectangular" active={channelType === "rectangular"} onClick={() => setChannelType("rectangular")} />
            <ModeBtn label="Trapezoidal" active={channelType === "trapezoidal"} onClick={() => setChannelType("trapezoidal")} />
            <ModeBtn label="Circular"    active={channelType === "circular"}    onClick={() => setChannelType("circular")}    />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Flow rate */}
          <div>
            <InputField label="Flow rate" symbol="Q" unit={flowUnit}
              value={Q} onChange={setQ} error={errors.Q} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m³/s", "L/s", "ft³/s"] as FlowUnit[]).map(u => (
                <Btn key={u} label={u} active={flowUnit === u} onClick={() => {
                  const raw = parseFloat(Q);
                  if (!isNaN(raw)) setQ(parseFloat((raw * toQSI[flowUnit] / toQSI[u]).toPrecision(6)).toString());
                  setFlowUnit(u);
                }} />
              ))}
            </div>
          </div>

          {/* Width / diameter */}
          <div>
            <InputField label={geomLabel} symbol={channelType === "circular" ? "D" : "b"} unit={lenUnit}
              value={b} onChange={setB}
              placeholder={lenUnit === "m" ? geomPlaceholder : lenUnit === "mm" ? "2000" : lenUnit === "cm" ? "200" : "6.56"}
              error={errors.b} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m", "mm", "cm", "ft"] as LenUnit[]).map(u => (
                <Btn key={u} label={u} active={lenUnit === u} onClick={() => {
                  const raw = parseFloat(b);
                  if (!isNaN(raw)) setB(parseFloat((raw * toLm[lenUnit] / toLm[u]).toPrecision(6)).toString());
                  setLenUnit(u);
                }} />
              ))}
            </div>
            {channelType === "circular" && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Full-pipe critical depth is computed at partial fill (y &lt; D)
              </p>
            )}
          </div>

          {/* Side slope — trapezoidal only */}
          {channelType === "trapezoidal" && (
            <div>
              <InputField label="Side slope H:V" symbol="z" unit="dimensionless"
                value={z} onChange={setZ} error={errors.z} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                z = horizontal / vertical · z = 0 for vertical walls · z = 1.5 typical earth
              </p>
            </div>
          )}
        </div>

        {/* Optional Manning's n for critical slope */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="showN" checked={showN}
              onChange={(e) => setShowN(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="showN" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Also compute critical slope S<sub>c</sub> — enter Manning's n
            </label>
          </div>
          {showN && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
              <div>
                <InputField label="Manning's roughness" symbol="n" unit="dimensionless"
                  value={n} onChange={setN} error={errors.n} />
              </div>
              <div className="flex items-end pb-1">
                <select
                  onChange={(e) => { if (e.target.value) setN(e.target.value); }}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">n preset…</option>
                  {N_PRESETS.map(p => (
                    <option key={p.label} value={p.n}>{p.label} — n = {p.n}</option>
                  ))}
                </select>
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
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Critical depth  y<sub>c</sub>  (Fr = 1)
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  y<sub>c</sub> = {fmt(result.criticalDepth, 5)} m
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  V<sub>c</sub> = {fmt(result.criticalVelocity, 5)} m/s &nbsp;·&nbsp;
                  E<sub>c</sub> = {fmt(result.specificEnergy, 5)} m
                </p>
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Critical flow quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: <span>y<sub>c</sub> [m]</span>,   value: fmt(result.criticalDepth,    5) },
                    { label: <span>V<sub>c</sub> [m/s]</span>, value: fmt(result.criticalVelocity,  5) },
                    { label: <span>E<sub>c</sub> [m]</span>,   value: fmt(result.specificEnergy,    5) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      {result.unitDischarge !== undefined ? <span>q = Q/b [m²/s]</span> : <span>A<sub>c</sub> [m²]</span>}
                    </p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {result.unitDischarge !== undefined ? fmt(result.unitDischarge, 5) : fmt(result.criticalArea, 5)}
                    </p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">T<sub>c</sub> [m]</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(result.criticalTopWidth, 5)}
                    </p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      {result.criticalSlope !== undefined ? <span>S<sub>c</sub> [m/m]</span> : <span>D<sub>h</sub> [m]</span>}
                    </p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {result.criticalSlope !== undefined
                        ? fmt(result.criticalSlope, 4)
                        : fmt(result.hydraulicDepth, 5)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Interpretation banner */}
              <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  Critical conditions (Fr = 1) — {channelType} channel
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
                {channelType === "rectangular" && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Check: E<sub>c</sub> = (3/2) y<sub>c</sub> = {fmt(1.5 * result.criticalDepth, 5)} m
                    &nbsp;(rectangular identity)
                  </p>
                )}
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.criticalDepth} />
              <CommonMistakes mistakes={commonMistakes.criticalDepth} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Critical depth condition (all shapes):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Fr = 1&nbsp;&nbsp;&nbsp;&nbsp;→&nbsp;&nbsp;&nbsp;&nbsp;V<sub>c</sub> = √(g × D<sub>h</sub>)</div>
              <div>Q²/g = A<sub>c</sub>³ / T<sub>c</sub>&nbsp;&nbsp;&nbsp;&nbsp;[general critical condition]</div>
              <div>D<sub>h</sub> = A<sub>c</sub> / T<sub>c</sub>&nbsp;&nbsp;&nbsp;&nbsp;[hydraulic depth]</div>
              <div>T<sub>c</sub> = dA/dy|<sub>y=yc</sub>&nbsp;&nbsp;&nbsp;&nbsp;[top width at critical depth]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Closed-form solutions:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Rectangular:&nbsp;&nbsp;y<sub>c</sub> = (q²/g)<sup>1/3</sup>&nbsp;&nbsp;&nbsp;&nbsp;q = Q/b</div>
              <div>Rectangular:&nbsp;&nbsp;E<sub>c</sub> = (3/2) × y<sub>c</sub></div>
              <div>Trapezoidal / Circular:&nbsp;&nbsp;bisection on Q²T/g = A³</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Critical slope:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>S<sub>c</sub> = (n × V<sub>c</sub> / R<sub>c</sub><sup>2/3</sup>)<sup>2</sup></div>
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                If actual slope S &gt; S<sub>c</sub> → steep (supercritical normal flow)
                &nbsp; S &lt; S<sub>c</sub> → mild (subcritical normal flow)
              </div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Specific energy diagram:</p>
            <p>
              Specific energy E = y + V²/(2g) = y + Q²/(2gA²). For a given Q,
              the E-y diagram has two branches meeting at y<sub>c</sub> (minimum energy).
              Depths greater than y<sub>c</sub> are subcritical; depths less than y<sub>c</sub>
              are supercritical. Hydraulic jumps transition from supercritical to subcritical
              with energy loss.
            </p>
          </div>
        </div>
      </Card>

      <References refs={REFS_CRITICAL_DEPTH} />
    </div>
  );
}
