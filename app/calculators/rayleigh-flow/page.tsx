"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_RAYLEIGH_FLOW } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateRayleighFlow,
  generateRayleighFlowSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type TempUnit = "K" | "°C" | "°F";

const toK: Record<TempUnit, (t: number) => number> = {
  "K":  (t) => t,
  "°C": (t) => t + 273.15,
  "°F": (t) => (t - 32) * 5 / 9 + 273.15,
};

const fromK: Record<TempUnit, (k: number) => number> = {
  "K":  (k) => k,
  "°C": (k) => k - 273.15,
  "°F": (k) => (k - 273.15) * 9 / 5 + 32,
};

const GAS_PRESETS = [
  { label: "Air",      gamma: "1.400" },
  { label: "Nitrogen", gamma: "1.400" },
  { label: "Oxygen",   gamma: "1.395" },
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

export default function RayleighFlowCalculator() {
  const [mach1,           setMach1]           = useState("0.5");
  const [gamma,           setGamma]           = useState("1.4");
  const [totalTemp1,      setTotalTemp1]      = useState("300");
  const [tempUnit,        setTempUnit]        = useState<TempUnit>("K");
  const [showM2,          setShowM2]          = useState(false);
  const [mach2,           setMach2]           = useState("0.8");
  const [errors,          setErrors]          = useState<Record<string, string>>({});
  const [result,          setResult]          = useState<ReturnType<typeof calculateRayleighFlow> | null>(null);
  const [steps,           setSteps]           = useState<ReturnType<typeof generateRayleighFlowSteps> | null>(null);

  const handleTempUnitChange = (newUnit: TempUnit) => {
    const t = parseFloat(totalTemp1);
    if (!isNaN(t)) setTotalTemp1(fmt(fromK[newUnit](toK[tempUnit](t)), 5));
    setTempUnit(newUnit);
  };

  const handleClear = () => {
    setMach1("");
    setGamma("");
    setTotalTemp1("");
    setTempUnit("K");
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
    const tRaw = parseFloat(totalTemp1);
    const M2   = parseFloat(mach2);
    const T01K = toK[tempUnit](tRaw);

    if (isNaN(M1)   || M1   <= 0) newErrors.mach1      = "Must be > 0";
    if (isNaN(gVal) || gVal <= 1) newErrors.gamma       = "Must be > 1";
    if (isNaN(tRaw))               newErrors.totalTemp1 = "Required";
    if (!isNaN(tRaw) && T01K <= 0) newErrors.totalTemp1 = "Absolute temperature must be > 0 K";
    if (showM2) {
      if (isNaN(M2) || M2 <= 0) newErrors.mach2 = "Must be > 0";
      else if (!isNaN(M1)) {
        const isSubsonic = M1 < 1;
        if (isSubsonic  && (M2 <= M1 || M2 >= 1)) newErrors.mach2 = "Subsonic inlet: M₁ < M₂ < 1";
        if (!isSubsonic && (M2 >= M1 || M2 <= 1)) newErrors.mach2 = "Supersonic inlet: 1 < M₂ < M₁";
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        mach1: M1, gamma: gVal,
        totalTemperature1: T01K,
        mach2: showM2 ? M2 : undefined,
      };
      const calc = calculateRayleighFlow(input);
      const stp  = generateRayleighFlowSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : "An error occurred" });
      setResult(null); setSteps(null);
    }
  };

  const T01K = toK[tempUnit](parseFloat(totalTemp1));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Rayleigh Flow Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Frictionless compressible duct flow with heat addition. Computes all Rayleigh
          property ratios, maximum stagnation temperature T₀*, and heat capacity before
          thermal choking.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
          Compressible Flow · Rayleigh
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

          {/* T₀₁ */}
          <div>
            <InputField label="Inlet total temperature" symbol="T₀₁" unit={tempUnit}
              value={totalTemp1} onChange={setTotalTemp1}
              placeholder={tempUnit === "K" ? "300" : tempUnit === "°C" ? "26.85" : "80.3"}
              error={errors.totalTemp1} />
            <div className="flex gap-2 -mt-2">
              {(["K", "°C", "°F"] as TempUnit[]).map(u => (
                <Btn key={u} label={u} active={tempUnit === u} onClick={() => handleTempUnitChange(u)} />
              ))}
            </div>
            {!isNaN(parseFloat(totalTemp1)) && T01K > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
                T₀₁ = {T01K.toFixed(2)} K
              </p>
            )}
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
                Specify exit Mach M₂ — computes T₀₂ and heat added q/c<sub>p</sub>
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
                  Total Temperature Ratio  T₀/T₀*
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  T₀/T₀* = {fmt(result.totalTemperatureRatio1)}
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  T₀* = {fmt(result.totalTempStar)} K
                  {" · "}
                  heat to choke = {fmt(result.heatToChoke)} K
                  {result.heatAdded != null && ` · heat added = ${fmt(result.heatAdded)} K`}
                </p>
              </div>
              <span className={`mt-1 px-3 py-1 rounded text-sm font-semibold capitalize ${REGIME_COLORS[result.regime]}`}>
                {result.regime}
              </span>
            </div>

            {/* Direction banner */}
            <div className={`p-4 rounded-lg border ${REGIME_BG[result.regime]}`}>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">
                M₁ = {mach1} ({result.regime}) — heat addition drives M toward 1
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {result.regime === "subsonic"
                  ? `Subsonic Rayleigh: heat accelerates flow (M increases). T₀* = ${fmt(result.totalTempStar)} K is the thermal choke limit — adding ${fmt(result.heatToChoke)} K (×cₚ) beyond inlet chokes the duct.`
                  : result.regime === "supersonic"
                  ? `Supersonic Rayleigh: heat decelerates flow (M decreases). T₀* = ${fmt(result.totalTempStar)} K is the thermal choke limit — adding ${fmt(result.heatToChoke)} K (×cₚ) chokes the duct.`
                  : "Flow is already at the thermal choke point (M = 1, T₀ = T₀*). No further heat can be added without changing upstream conditions."}
              </p>
            </div>

            {/* Total-property ratios */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Rayleigh total-property ratios at M₁ = {mach1}
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: <span>T₀/T₀*</span>,  value: fmt(result.totalTemperatureRatio1) },
                  { label: <span>P₀/P₀*</span>,  value: fmt(result.totalPressureRatio1)    },
                  { label: "T₀* [K]",             value: fmt(result.totalTempStar)          },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "Heat to choke [K]",   value: fmt(result.heatToChoke) },
                  { label: "T₀₁ [K]",             value: fmt(toK[tempUnit](parseFloat(totalTemp1))) },
                  { label: "T₀₁/T₀*",             value: fmt(result.totalTemperatureRatio1) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Static property ratios at M₁ */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Rayleigh static property ratios at M₁ = {mach1}
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "T/T*",  value: fmt(result.temperatureRatio1) },
                  { label: "P/P*",  value: fmt(result.pressureRatio1)    },
                  { label: "ρ/ρ*",  value: fmt(result.densityRatio1)     },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "V/V*", value: fmt(result.velocityRatio1) },
                  { label: <span>P₀/P₀*</span>, value: fmt(result.totalPressureRatio1) },
                  { label: <span>T₀/T₀*</span>, value: fmt(result.totalTemperatureRatio1) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Exit state — only if M₂ given */}
            {result.totalTemperature2 != null && result.heatAdded != null && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Exit state at M₂ = {mach2}
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "T₀₂ [K]",            value: fmt(result.totalTemperature2) },
                    { label: <span>T₀₂/T₀*</span>, value: fmt(result.totalTemperatureRatio2!) },
                    { label: "q/cₚ [K]",            value: fmt(result.heatAdded) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "T₂/T*",              value: fmt(result.temperatureRatio2!)      },
                    { label: "P₂/P*",              value: fmt(result.pressureRatio2!)         },
                    { label: <span>P₀₂/P₀*</span>, value: fmt(result.totalPressureRatio2!)   },
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
            <AssumptionsList assumptions={commonAssumptions.rayleighFlow} />
            <CommonMistakes mistakes={commonMistakes.rayleighFlow} />
          </div>
        </ResultsCard>
      )}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Rayleigh flow relations (frictionless, constant-area, with heat):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>T/T*   = M²(γ+1)² / (1+γM²)²</div>
              <div>P/P*   = (γ+1) / (1+γM²)</div>
              <div>ρ/ρ*   = (1+γM²) / ((γ+1)M²)&nbsp;&nbsp;&nbsp;[= V*/V by continuity]</div>
              <div>V/V*   = (γ+1)M² / (1+γM²)&nbsp;&nbsp;&nbsp;[= ρ*/ρ]</div>
              <div>T₀/T₀* = 2(γ+1)M²(1+(γ−1)/2·M²) / (1+γM²)²</div>
              <div>P₀/P₀* = (P/P*) × [(2/(γ+1))·(1+(γ−1)/2·M²)]<sup>γ/(γ−1)</sup></div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Heat added and thermal choking:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>T₀* = T₀₁ / (T₀/T₀*)|₁&nbsp;&nbsp;&nbsp;[maximum T₀ at M = 1]</div>
              <div>q/c<sub>p</sub> = T₀₂ − T₀₁ = T₀* × (T₀/T₀*|₂ − T₀/T₀*|₁)</div>
              <div>q<sub>max</sub>/c<sub>p</sub> = T₀* − T₀₁&nbsp;&nbsp;&nbsp;[heat to reach choking]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Rayleigh flow table — air (γ = 1.4):</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  {["M", "T₀/T₀*", "P₀/P₀*", "T/T*", "P/P*", "ρ/ρ*", "V/V*"].map(h => (
                    <th key={h} className="text-left py-1.5 pr-2 font-semibold text-gray-900 dark:text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { M: "0.2", t0: "0.1736", p0: "1.2346", t: "0.2066", p: "2.273", r: "11.00", v: "0.0909" },
                  { M: "0.4", t0: "0.5290", p0: "1.1566", t: "0.6151", p: "1.961", r: "3.188", v: "0.3137" },
                  { M: "0.5", t0: "0.6914", p0: "1.1141", t: "0.7901", p: "1.778", r: "2.250", v: "0.4444" },
                  { M: "0.8", t0: "0.9639", p0: "1.0193", t: "1.025",  p: "1.266", r: "1.234", v: "0.8101" },
                  { M: "1.0", t0: "1.0000", p0: "1.0000", t: "1.000",  p: "1.000", r: "1.000", v: "1.000"  },
                  { M: "1.5", t0: "0.9093", p0: "1.1215", t: "0.7525", p: "0.5783",r: "0.7685",v: "1.301"  },
                  { M: "2.0", t0: "0.7934", p0: "1.5031", t: "0.5289", p: "0.3636",r: "0.6875",v: "1.455"  },
                  { M: "3.0", t0: "0.6540", p0: "3.4245", t: "0.2803", p: "0.1765",r: "0.630", v: "1.588"  },
                ].map(({ M, t0, p0, t, p, r, v }) => (
                  <tr key={M}>
                    <td className="py-1.5 pr-2 font-mono">{M}</td>
                    <td className="py-1.5 pr-2 font-mono">{t0}</td>
                    <td className="py-1.5 pr-2 font-mono">{p0}</td>
                    <td className="py-1.5 pr-2 font-mono">{t}</td>
                    <td className="py-1.5 pr-2 font-mono">{p}</td>
                    <td className="py-1.5 pr-2 font-mono">{r}</td>
                    <td className="py-1.5 font-mono">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            Rayleigh flow models heat addition (combustion, resistive heating) in a constant-area
            frictionless duct. Heat drives both subsonic and supersonic flow toward M = 1 (thermal
            choke). T₀* is the maximum stagnation temperature the duct can sustain — adding more
            heat forces a new lower-Mach upstream state. P₀ decreases with heat addition (entropy
            increase), even for subsonic flow. Heat removal (cooling) moves M away from 1.
          </p>
        </div>
      </Card>

      <References refs={REFS_RAYLEIGH_FLOW} />
    </div>
  );
}
