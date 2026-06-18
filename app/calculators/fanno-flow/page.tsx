"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_FANNO_FLOW } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateFannoFlow,
  generateFannoFlowSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type DiamUnit = "m" | "mm" | "cm" | "in";

const toDm: Record<DiamUnit, number> = { m: 1, mm: 1e-3, cm: 1e-2, in: 0.0254 };

const GAS_PRESETS = [
  { label: "Air",      gamma: "1.400" },
  { label: "Nitrogen", gamma: "1.400" },
  { label: "Helium",   gamma: "1.667" },
  { label: "Argon",    gamma: "1.667" },
  { label: "CO₂",      gamma: "1.289" },
] as const;

const REGIME_COLORS: Record<string, string> = {
  "subsonic":   "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
  "sonic":      "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200",
  "supersonic": "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200",
};

const REGIME_BG: Record<string, string> = {
  "subsonic":   "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  "sonic":      "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
  "supersonic": "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
};

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

export default function FannoFlowCalculator() {
  const [mach1,          setMach1]          = useState("0.5");
  const [gamma,          setGamma]          = useState("1.4");
  const [diameter,       setDiameter]       = useState("50");
  const [diamUnit,       setDiamUnit]       = useState<DiamUnit>("mm");
  const [frictionFactor, setFrictionFactor] = useState("0.02");
  const [showM2,         setShowM2]         = useState(false);
  const [mach2,          setMach2]          = useState("0.8");
  const [errors,         setErrors]         = useState<Record<string, string>>({});
  const [result,         setResult]         = useState<ReturnType<typeof calculateFannoFlow> | null>(null);
  const [steps,          setSteps]          = useState<ReturnType<typeof generateFannoFlowSteps> | null>(null);

  const handleDiamUnitChange = (newUnit: DiamUnit) => {
    const d = parseFloat(diameter);
    if (!isNaN(d)) setDiameter(fmt(d * toDm[diamUnit] / toDm[newUnit], 5));
    setDiamUnit(newUnit);
  };

  const handleClear = () => {
    setMach1("");
    setGamma("");
    setDiameter("");
    setDiamUnit("mm");
    setFrictionFactor("");
    setMach2("");
    setShowM2(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const M1   = parseFloat(mach1);
    const gVal = parseFloat(gamma);
    const dRaw = parseFloat(diameter);
    const fVal = parseFloat(frictionFactor);
    const M2   = parseFloat(mach2);
    const D    = dRaw * toDm[diamUnit];

    if (isNaN(M1)   || M1   <= 0) newErrors.mach1          = "Must be > 0";
    if (isNaN(gVal) || gVal <= 1) newErrors.gamma           = "Must be > 1";
    if (isNaN(dRaw) || dRaw <= 0) newErrors.diameter        = "Must be positive";
    if (isNaN(fVal) || fVal <= 0) newErrors.frictionFactor  = "Must be positive";
    if (showM2) {
      if (isNaN(M2) || M2 <= 0)  newErrors.mach2 = "Must be > 0";
      else if (!isNaN(M1)) {
        const isSubsonic = M1 < 1;
        if (isSubsonic && (M2 <= M1 || M2 >= 1))
          newErrors.mach2 = "For subsonic inlet, M₂ must be between M₁ and 1";
        if (!isSubsonic && (M2 >= M1 || M2 <= 1))
          newErrors.mach2 = "For supersonic inlet, M₂ must be between 1 and M₁";
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        mach1: M1, gamma: gVal, diameter: D, frictionFactor: fVal,
        mach2: showM2 ? M2 : undefined,
      };
      const calc = calculateFannoFlow(input);
      const stp  = generateFannoFlowSteps(input, calc);
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
          Fanno Flow Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Adiabatic compressible duct flow with wall friction. Computes the Fanno
          parameter fL*/D, maximum duct length to choking, and all property ratios
          relative to the sonic reference state.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
          Compressible Flow · Fanno
        </span>
      </div>

      {/* Gas presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Gas presets — click to fill γ
        </h2>
        <div className="flex flex-wrap gap-2">
          {GAS_PRESETS.map((p) => (
            <button key={p.label}
              onClick={() => setGamma(p.gamma)}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
              {p.label} (γ = {p.gamma})
            </button>
          ))}
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* M₁ */}
          <div>
            <InputField label="Inlet Mach number" symbol="M₁" unit="dimensionless"
              value={mach1} onChange={setMach1} error={errors.mach1} />
            <div className="flex gap-2 -mt-2">
              {["0.3", "0.5", "0.8", "1.5", "2.0", "3.0"].map(v => (
                <Btn key={v} label={v} active={mach1 === v} onClick={() => setMach1(v)} />
              ))}
            </div>
          </div>

          {/* γ */}
          <div>
            <InputField label="Specific heat ratio" symbol="γ" unit="dimensionless"
              value={gamma} onChange={setGamma} error={errors.gamma} />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
              c<sub>p</sub>/c<sub>v</sub> — use gas presets above
            </p>
          </div>

          {/* Diameter */}
          <div>
            <InputField label="Duct hydraulic diameter" symbol="D" unit={diamUnit}
              value={diameter} onChange={setDiameter}
              placeholder={diamUnit === "m" ? "0.05" : diamUnit === "mm" ? "50" : diamUnit === "cm" ? "5" : "2"}
              error={errors.diameter} />
            <div className="flex gap-2 -mt-2">
              {(["m", "mm", "cm", "in"] as DiamUnit[]).map(u => (
                <Btn key={u} label={u} active={diamUnit === u} onClick={() => handleDiamUnitChange(u)} />
              ))}
            </div>
          </div>

          {/* Friction factor */}
          <div>
            <InputField label="Darcy friction factor" symbol="f" unit="dimensionless"
              value={frictionFactor} onChange={setFrictionFactor} error={errors.frictionFactor} />
            <div className="flex gap-2 -mt-2">
              {[
                { label: "Smooth (0.01)", val: "0.01" },
                { label: "Typical (0.02)", val: "0.02" },
                { label: "Rough (0.04)", val: "0.04" },
              ].map(p => (
                <Btn key={p.val} label={p.label} active={frictionFactor === p.val}
                  onClick={() => setFrictionFactor(p.val)} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Darcy f = 4 × Fanning f — use Moody chart value
            </p>
          </div>
        </div>

        {/* Optional M₂ */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-start gap-3">
            <input type="checkbox" id="showM2" checked={showM2}
              onChange={(e) => setShowM2(e.target.checked)}
              className="mt-3 w-4 h-4 text-blue-600 rounded" />
            <div className="flex-1">
              <label htmlFor="showM2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Specify exit Mach M₂ — computes actual duct length from M₁ to M₂
              </label>
              {showM2 && (
                <>
                  <div className="max-w-xs">
                    <InputField label="Exit Mach number" symbol="M₂" unit="dimensionless"
                      value={mach2} onChange={setMach2} error={errors.mach2} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                    Subsonic inlet: M₁ &lt; M₂ &lt; 1 · Supersonic inlet: 1 &lt; M₂ &lt; M₁
                  </p>
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
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Maximum Length to Choking  L*
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  L* = {fmt(result.maxLength)} m
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  fL*/D = {fmt(result.fLstarD1)}
                  {result.ductLength != null &&
                    ` · Duct length M₁→M₂ = ${fmt(result.ductLength)} m`}
                </p>
              </div>
              <span className={`mt-1 px-3 py-1 rounded text-sm font-semibold capitalize ${REGIME_COLORS[result.regime]}`}>
                {result.regime}
              </span>
            </div>

            {/* Direction banner */}
            <div className={`p-4 rounded-lg border ${REGIME_BG[result.regime]}`}>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">
                M₁ = {mach1} ({result.regime}) — friction drives M toward 1
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {result.regime === "subsonic"
                  ? "Subsonic Fanno: friction accelerates flow (M increases). Adding duct beyond L* chokes the inlet."
                  : result.regime === "supersonic"
                  ? "Supersonic Fanno: friction decelerates flow (M decreases). Adding duct beyond L* causes a normal shock upstream."
                  : "Flow is already at the sonic (choked) state — no further duct can be added."}
              </p>
            </div>

            {/* Fanno parameter + length grid */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Fanno parameters at M₁
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "fL*/D",    value: fmt(result.fLstarD1) },
                  { label: "L* [m]",   value: fmt(result.maxLength) },
                  { label: result.ductLength != null ? "L (M₁→M₂) [m]" : "f × D",
                    value: result.ductLength != null
                      ? fmt(result.ductLength)
                      : fmt(parseFloat(frictionFactor) * parseFloat(diameter) * toDm[diamUnit]) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Property ratios at M₁ */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Fanno property ratios at M₁ = {mach1}  (relative to sonic state *)
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "T/T*",    value: fmt(result.temperatureRatio1) },
                  { label: "P/P*",    value: fmt(result.pressureRatio1)    },
                  { label: "ρ/ρ*",    value: fmt(result.densityRatio1)     },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: <span>P₀/P₀*</span>, value: fmt(result.totalPressureRatio1) },
                  { label: "V/V*",               value: fmt(result.velocityRatio1)      },
                  { label: <span>T₀/T₀*</span>,  value: "1.000 (adiabatic)"            },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Exit conditions — only if M₂ given */}
            {result.ductLength != null && result.temperatureRatio2 != null && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Exit ratios at M₂ = {mach2}
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "T₂/T*",  value: fmt(result.temperatureRatio2)  },
                    { label: "P₂/P*",  value: fmt(result.pressureRatio2!)    },
                    { label: <span>P₀₂/P₀*</span>, value: fmt(result.totalPressureRatio2!) },
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
            <AssumptionsList assumptions={commonAssumptions.fannoFlow} />
            <CommonMistakes mistakes={commonMistakes.fannoFlow} />
          </div>
        </ResultsCard>
      )}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Fanno flow relations (adiabatic, constant-area, with friction):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>fL*/D = (1−M²)/(γM²) + (γ+1)/(2γ) × ln((γ+1)M²/(2+(γ−1)M²))</div>
              <div>T/T*  = (γ+1) / (2 + (γ−1)M²)</div>
              <div>P/P*  = (1/M) × √(T/T*)</div>
              <div>ρ/ρ*  = (1/M) × √(T*/T)&nbsp;&nbsp;[= V*/V by continuity]</div>
              <div>P₀/P₀* = (1/M) × [(2/(γ+1)) × (1 + (γ−1)/2 M²)]<sup>(γ+1)/(2(γ−1))</sup></div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>f = Darcy-Weisbach friction factor (= 4 × Fanning f)</li>
              <li>L* = maximum duct length from given M to M = 1 (choking) [m]</li>
              <li>D = hydraulic diameter [m]</li>
              <li>T*, P*, ρ* = sonic (M = 1) reference conditions</li>
              <li>T₀/T₀* = 1 always — Fanno is adiabatic, so T₀ is constant</li>
              <li>P₀/P₀* ≥ 1 — total pressure always decreases toward the sonic point</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Duct length between two Mach numbers:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              <div>fL/D = fL*/D|<sub>M₁</sub> − fL*/D|<sub>M₂</sub></div>
            </div>
            <p className="mt-1">
              This is always positive since fL*/D decreases as M approaches 1 from either side.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Fanno flow table — air (γ = 1.4):</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  {["M", "fL*/D", "T/T*", "P/P*", "ρ/ρ*", "P₀/P₀*"].map(h => (
                    <th key={h} className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { M: "0.2",  fLD: "14.533", T: "1.190",  P: "5.455",  r: "4.583", P0: "2.964" },
                  { M: "0.4",  fLD: "2.308",  T: "1.163",  P: "2.696",  r: "2.318", P0: "1.590" },
                  { M: "0.6",  fLD: "0.491",  T: "1.119",  P: "1.763",  r: "1.576", P0: "1.188" },
                  { M: "0.8",  fLD: "0.072",  T: "1.065",  P: "1.289",  r: "1.211", P0: "1.038" },
                  { M: "1.0",  fLD: "0.000",  T: "1.000",  P: "1.000",  r: "1.000", P0: "1.000" },
                  { M: "1.5",  fLD: "0.136",  T: "0.828",  P: "0.606",  r: "0.732", P0: "1.176" },
                  { M: "2.0",  fLD: "0.305",  T: "0.667",  P: "0.408",  r: "0.612", P0: "1.688" },
                  { M: "3.0",  fLD: "0.522",  T: "0.429",  P: "0.218",  r: "0.509", P0: "4.235" },
                ].map(({ M, fLD, T, P, r, P0 }) => (
                  <tr key={M}>
                    <td className="py-1.5 pr-3 font-mono">{M}</td>
                    <td className="py-1.5 pr-3 font-mono">{fLD}</td>
                    <td className="py-1.5 pr-3 font-mono">{T}</td>
                    <td className="py-1.5 pr-3 font-mono">{P}</td>
                    <td className="py-1.5 pr-3 font-mono">{r}</td>
                    <td className="py-1.5 font-mono">{P0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            Fanno flow is driven solely by wall friction in an adiabatic constant-area duct.
            Both subsonic and supersonic flows are driven toward M = 1 by friction — subsonic
            accelerates (static P drops), supersonic decelerates (static P rises), but total
            pressure P₀ always decreases. Exceeding L* causes choking (subsonic) or a normal
            shock (supersonic).
          </p>
        </div>
      </Card>

      <References refs={REFS_FANNO_FLOW} />
    </div>
  );
}
