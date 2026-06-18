"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_HEAT_TRANSFER_NUMBERS } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateEffectivenessNtu,
  generateEffectivenessNtuSteps,
  commonAssumptions,
  commonMistakes,
  type EffectivenessNtuMode,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

function fmt(n: number, sig = 4) { return parseFloat(n.toPrecision(sig)).toString(); }

function ModeBtn({ label, active, onClick }: { label: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${active
        ? "bg-blue-600 text-white"
        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
      {label}
    </button>
  );
}

function ConfigBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-1.5 text-sm font-medium rounded transition-colors ${active
        ? "bg-orange-500 text-white"
        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
      {label}
    </button>
  );
}

type FlowConfig = "counterflow" | "parallel" | "crossflow";

export default function EffectivenessNtuCalculator() {
  const [mode,       setMode]       = useState<EffectivenessNtuMode>("findEps");
  const [flowConfig, setFlowConfig] = useState<FlowConfig>("counterflow");
  const [ntu,        setNtu]        = useState("2.0");
  const [eps,        setEps]        = useState("75");    // % for display
  const [cStar,      setCstar]      = useState("0.5");

  // Optional Q output
  const [showQ,      setShowQ]      = useState(false);
  const [cMin,       setCmin]       = useState("1000");
  const [Thi,        setThi]        = useState("90");
  const [Tci,        setTci]        = useState("20");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateEffectivenessNtu> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateEffectivenessNtuSteps> | null>(null);

  const handleClear = () => {
    setMode("findEps");
    setFlowConfig("counterflow");
    setNtu("");
    setEps("");
    setCstar("");
    setCmin("");
    setThi("");
    setTci("");
    setShowQ(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const ntuVal  = parseFloat(ntu);
    const epsVal  = parseFloat(eps) / 100;
    const cStarVal= parseFloat(cStar);
    const cMinVal = parseFloat(cMin);
    const ThiVal  = parseFloat(Thi);
    const TciVal  = parseFloat(Tci);

    if (mode === "findEps") {
      if (isNaN(ntuVal) || ntuVal <= 0) newErrors.ntu = "Must be a positive number";
    } else {
      if (isNaN(epsVal) || epsVal <= 0 || epsVal >= 1)
        newErrors.eps = "Effectiveness must be between 0 and 100 %";
    }
    if (isNaN(cStarVal) || cStarVal < 0 || cStarVal > 1)
      newErrors.cStar = "Must be between 0 and 1";
    if (showQ) {
      if (isNaN(cMinVal) || cMinVal <= 0) newErrors.cMin = "Must be a positive number";
      if (isNaN(ThiVal))  newErrors.Thi = "Required";
      if (isNaN(TciVal))  newErrors.Tci = "Required";
      if (!isNaN(ThiVal) && !isNaN(TciVal) && ThiVal <= TciVal)
        newErrors.Thi = "Hot inlet must be greater than cold inlet";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        mode,
        flowConfig,
        capacityRatio: cStarVal,
        ntu:           mode === "findEps" ? ntuVal  : undefined,
        effectiveness: mode === "findNtu" ? epsVal  : undefined,
        cMin:          showQ ? cMinVal : undefined,
        hotInletTemp:  showQ ? ThiVal  : undefined,
        coldInletTemp: showQ ? TciVal  : undefined,
      };
      const calc = calculateEffectivenessNtu(input as Parameters<typeof calculateEffectivenessNtu>[0]);
      const stp  = generateEffectivenessNtuSteps(input as Parameters<typeof calculateEffectivenessNtu>[0], calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const epsVal = result ? result.effectiveness * 100 : 0;
  const epsBg =
    epsVal >= 80
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      : epsVal >= 50
      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
      : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";

  const configDescriptions: Record<FlowConfig, string> = {
    counterflow: "Hot and cold streams flow in opposite directions — highest possible ε for given NTU and C*.",
    parallel:    "Hot and cold streams flow in the same direction — limited to ε ≤ 1/(1+C*).",
    crossflow:   "Streams flow perpendicular (both unmixed approximation — plate-fin type).",
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Effectiveness-NTU Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          ε-NTU method for heat exchanger rating and sizing — useful when outlet temperatures are
          unknown. Supports counterflow, parallel, and crossflow configurations with forward
          (NTU → ε) and inverse (ε → NTU) calculation.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">
          Heat Transfer · HX Design
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Mode */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Solve for:</p>
          <div className="flex gap-2">
            <ModeBtn
              label={<>Find ε &nbsp;&mdash;&nbsp; given NTU and C*</>}
              active={mode === "findEps"} onClick={() => setMode("findEps")} />
            <ModeBtn
              label={<>Find NTU &nbsp;&mdash;&nbsp; given ε and C*</>}
              active={mode === "findNtu"} onClick={() => setMode("findNtu")} />
          </div>
        </div>

        {/* Flow configuration */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Flow configuration:</p>
          <div className="flex gap-2">
            <ConfigBtn label="Counterflow" active={flowConfig === "counterflow"} onClick={() => setFlowConfig("counterflow")} />
            <ConfigBtn label="Parallel"    active={flowConfig === "parallel"}    onClick={() => setFlowConfig("parallel")}    />
            <ConfigBtn label="Crossflow"   active={flowConfig === "crossflow"}   onClick={() => setFlowConfig("crossflow")}   />
          </div>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            {configDescriptions[flowConfig]}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* NTU — shown for findEps */}
          {mode === "findEps" && (
            <div>
              <InputField label="Number of Transfer Units" symbol="NTU" unit="dimensionless"
                value={ntu} onChange={setNtu} error={errors.ntu} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                NTU = U × A / C<sub>min</sub>
              </p>
            </div>
          )}

          {/* ε — shown for findNtu */}
          {mode === "findNtu" && (
            <div>
              <InputField label="Effectiveness" symbol="ε" unit="%"
                value={eps} onChange={setEps} error={errors.eps} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                ε = Q<sub>actual</sub> / Q<sub>max</sub> &nbsp;(enter as percentage, e.g. 75 for 75%)
              </p>
            </div>
          )}

          {/* C* — always */}
          <div>
            <InputField label="Capacity ratio" symbol="C*" unit="0 – 1"
              value={cStar} onChange={setCstar} error={errors.cStar} />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
              C* = C<sub>min</sub> / C<sub>max</sub> &nbsp;·&nbsp; C* = 0 for condenser / evaporator
            </p>
          </div>
        </div>

        {/* Optional Q */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="showQ" checked={showQ}
              onChange={(e) => setShowQ(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="showQ" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Also compute Q = ε × C<sub>min</sub> × (T<sub>h,in</sub> − T<sub>c,in</sub>)
            </label>
          </div>
          {showQ && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <InputField label="Minimum capacity rate" symbol="Cmin" unit="W/K"
                  value={cMin} onChange={setCmin} error={errors.cMin} />
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                  C<sub>min</sub> = (ṁ c<sub>p</sub>)<sub>min</sub>
                </p>
              </div>
              <div>
                <InputField label="Hot-side inlet temp" symbol="Th,in" unit="°C"
                  value={Thi} onChange={setThi} error={errors.Thi} />
              </div>
              <div>
                <InputField label="Cold-side inlet temp" symbol="Tc,in" unit="°C"
                  value={Tci} onChange={setTci} error={errors.Tci} />
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
                {mode === "findEps" ? (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Heat exchanger effectiveness  ε = Q<sub>actual</sub> / Q<sub>max</sub>
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      ε = {fmt(result.effectiveness * 100, 5)} %
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      NTU = {fmt(result.ntu, 5)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Number of Transfer Units  NTU = U × A / C<sub>min</sub>
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      NTU = {fmt(result.ntu, 5)}
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      ε = {fmt(result.effectiveness * 100, 5)} %
                    </p>
                  </>
                )}
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  ε-NTU quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "ε (%)",   value: fmt(result.effectiveness * 100, 5) },
                    { label: "NTU",     value: fmt(result.ntu,                 5) },
                    { label: "C*",      value: fmt(parseFloat(cStar),          4) },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                {result.qMax !== undefined && result.qActual !== undefined && (
                  <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                        Q<sub>max</sub> = C<sub>min</sub> × ΔT<sub>max</sub> [W]
                      </p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {fmt(result.qMax, 5)}
                      </p>
                    </div>
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                        Q<sub>actual</sub> = ε × Q<sub>max</sub> [W]
                      </p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {fmt(result.qActual, 5)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Effectiveness banner */}
              <div className={`p-4 rounded-lg border ${epsBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {epsVal >= 80
                    ? `High effectiveness — ε = ${fmt(epsVal, 4)}% (HX is well designed for these conditions)`
                    : epsVal >= 50
                    ? `Moderate effectiveness — ε = ${fmt(epsVal, 4)}%`
                    : `Low effectiveness — ε = ${fmt(epsVal, 4)}% (consider increasing NTU or using counterflow)`}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.effectivenessNtu} />
              <CommonMistakes mistakes={commonMistakes.effectivenessNtu} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Definitions:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>NTU = U × A / C<sub>min</sub>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Number of Transfer Units]</div>
              <div>C* = C<sub>min</sub> / C<sub>max</sub>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Capacity ratio, 0 ≤ C* ≤ 1]</div>
              <div>C = ṁ × c<sub>p</sub>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Heat capacity rate, W/K]</div>
              <div>ε = Q<sub>actual</sub> / Q<sub>max</sub>&nbsp;&nbsp;&nbsp;&nbsp;[Effectiveness, 0 to 1]</div>
              <div>Q<sub>max</sub> = C<sub>min</sub> × (T<sub>h,in</sub> − T<sub>c,in</sub>)</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">ε-NTU correlations by configuration:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Configuration</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Formula (C* &lt; 1)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { cfg: "Counterflow",
                    f: "ε = (1 − exp(−NTU(1−C*))) / (1 − C* exp(−NTU(1−C*)))" },
                  { cfg: "Counterflow (C* = 1)",
                    f: "ε = NTU / (1 + NTU)" },
                  { cfg: "Parallel flow",
                    f: "ε = (1 − exp(−NTU(1+C*))) / (1+C*)" },
                  { cfg: "Crossflow (both unmixed)",
                    f: "ε = 1 − exp((1/C*)(exp(−C*·NTU) − 1))" },
                  { cfg: "All configs, C* = 0  (condenser/evaporator)",
                    f: "ε = 1 − exp(−NTU)" },
                ].map(({ cfg, f }) => (
                  <tr key={cfg}>
                    <td className="py-1.5 pr-4 font-medium">{cfg}</td>
                    <td className="py-1.5 font-mono text-xs">{f}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">NTU from ε (inverse formulas):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1 text-xs">
              <div>Counterflow (C* &lt; 1):&nbsp;&nbsp;NTU = ln((1 − C*ε) / (1 − ε)) / (1 − C*)</div>
              <div>Counterflow (C* = 1):&nbsp;&nbsp;&nbsp;NTU = ε / (1 − ε)</div>
              <div>Parallel flow:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;NTU = −ln(1 − ε(1+C*)) / (1+C*)</div>
              <div>Crossflow:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Numerical inversion (bisection)</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">ε-NTU vs LMTD — when to use each:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Method</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Use when…</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Knowns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { m: "LMTD",   use: "All four temperatures known",         k: "Th,in  Th,out  Tc,in  Tc,out" },
                  { m: "ε-NTU",  use: "Outlet temperatures unknown (rating)",k: "NTU (= UA/Cmin),  C*,  inlet temps" },
                  { m: "ε-NTU",  use: "Sizing — find UA from duty",          k: "ε (or Q),  C*,  inlet temps" },
                ].map(({ m, use, k }) => (
                  <tr key={`${m}-${use}`}>
                    <td className="py-1.5 pr-4 font-semibold">{m}</td>
                    <td className="py-1.5 pr-4">{use}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400 font-mono">{k}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
      <References refs={REFS_HEAT_TRANSFER_NUMBERS} />
    </div>
  );
}