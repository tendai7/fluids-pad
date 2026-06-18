"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_LMTD } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateLmtd,
  generateLmtdSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type TempUnit = "°C" | "°F" | "K";

function toC(v: number, u: TempUnit): number {
  if (u === "°F") return (v - 32) * 5 / 9;
  if (u === "K")  return v - 273.15;
  return v;
}

function fromC(c: number, u: TempUnit): number {
  if (u === "°F") return c * 9 / 5 + 32;
  if (u === "K")  return c + 273.15;
  return c;
}

// Convert a temperature DIFFERENCE (always comes back from lib in °C) to the display unit.
// K and °C differences are numerically identical; °F differences are ×9/5.
function diffToUnit(degC: number, u: TempUnit): number {
  return u === "°F" ? degC * 9 / 5 : degC;
}

function fmt(n: number, sig = 4) { return parseFloat(n.toPrecision(sig)).toString(); }

function ModeBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${active
        ? "bg-blue-600 text-white"
        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
      {label}
    </button>
  );
}

function TempBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1 text-sm rounded ${active
        ? "bg-blue-500 text-white"
        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"}`}>
      {label}
    </button>
  );
}

export default function LmtdCalculator() {
  const [flowConfig, setFlowConfig] = useState<"counterflow" | "parallel">("counterflow");
  const [tempUnit,   setTempUnit]   = useState<TempUnit>("°C");
  const [Thi, setThi] = useState("90");
  const [Tho, setTho] = useState("60");
  const [Tci, setTci] = useState("20");
  const [Tco, setTco] = useState("50");

  // Optional F-factor + Q calculation
  const [showF,     setShowF]     = useState(false);
  const [fFactor,   setFFactor]   = useState("0.95");
  const [showQ,     setShowQ]     = useState(false);
  const [uValue,    setUValue]    = useState("500");
  const [area,      setArea]      = useState("2.0");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateLmtd> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateLmtdSteps> | null>(null);

  const handleClear = () => {
    setFlowConfig("counterflow");
    setTempUnit("°C");
    setThi("");
    setTho("");
    setTci("");
    setTco("");
    setFFactor("");
    setUValue("");
    setArea("");
    setShowF(false);
    setShowQ(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const ThiC = toC(parseFloat(Thi), tempUnit);
    const ThoC = toC(parseFloat(Tho), tempUnit);
    const TciC = toC(parseFloat(Tci), tempUnit);
    const TcoC = toC(parseFloat(Tco), tempUnit);
    const FVal = parseFloat(fFactor);
    const UVal = parseFloat(uValue);
    const AVal = parseFloat(area);

    if (isNaN(ThiC)) newErrors.Thi = "Required";
    if (isNaN(ThoC)) newErrors.Tho = "Required";
    if (isNaN(TciC)) newErrors.Tci = "Required";
    if (isNaN(TcoC)) newErrors.Tco = "Required";
    if (!isNaN(ThiC) && !isNaN(ThoC) && ThoC >= ThiC)
      newErrors.Tho = "Must be less than hot inlet";
    if (!isNaN(TciC) && !isNaN(TcoC) && TcoC <= TciC)
      newErrors.Tco = "Must be greater than cold inlet";
    if (showF && (isNaN(FVal) || FVal <= 0 || FVal > 1))
      newErrors.fFactor = "F must be between 0 and 1";
    if (showQ) {
      if (isNaN(UVal) || UVal <= 0) newErrors.uValue = "Must be a positive number";
      if (isNaN(AVal) || AVal <= 0) newErrors.area   = "Must be a positive number";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        T_hot_in:  ThiC, T_hot_out: ThoC,
        T_cold_in: TciC, T_cold_out: TcoC,
        flowConfig,
        fFactor:  showF ? FVal : undefined,
        uValue:   showQ ? UVal : undefined,
        area:     showQ ? AVal : undefined,
      };
      const calc = calculateLmtd(input);
      const stp  = generateLmtdSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const lmtdVal = result?.lmtd ?? 0;
  const efficiency = result
    ? Math.min(100, ((result.correctedLmtd / Math.max(result.deltaT1, result.deltaT2)) * 100))
    : 0;
  const bannerBg =
    flowConfig === "counterflow"
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";

  const placeholder = (base: string) => {
    if (tempUnit === "°F") return String(Math.round(parseFloat(base) * 9 / 5 + 32));
    if (tempUnit === "K")  return String(parseFloat(base) + 273.15);
    return base;
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          LMTD Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Log Mean Temperature Difference — the effective driving force for heat transfer in a
          heat exchanger. Used in Q = U × A × F × LMTD to size or rate heat exchangers.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">
          Heat Transfer · HX Design
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Flow configuration */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Flow configuration:</p>
          <div className="flex gap-2">
            <ModeBtn label="Counterflow"  active={flowConfig === "counterflow"} onClick={() => setFlowConfig("counterflow")} />
            <ModeBtn label="Parallel flow" active={flowConfig === "parallel"}   onClick={() => setFlowConfig("parallel")}   />
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {flowConfig === "counterflow"
              ? "Counterflow: hot and cold fluids flow in opposite directions — highest possible LMTD for given terminal temperatures."
              : "Parallel flow: hot and cold fluids flow in the same direction — lower LMTD, limited by cold outlet ≤ hot outlet."}
          </p>
        </div>

        {/* Temperature unit toggle */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Temperature units:</p>
          <div className="flex gap-2">
            {(["°C", "°F", "K"] as TempUnit[]).map(u => (
              <TempBtn key={u} label={u} active={tempUnit === u} onClick={() => {
                const conv = (v: string) => {
                  const raw = parseFloat(v);
                  return isNaN(raw) ? v : parseFloat(fromC(toC(raw, tempUnit), u).toPrecision(6)).toString();
                };
                setThi(conv(Thi)); setTho(conv(Tho));
                setTci(conv(Tci)); setTco(conv(Tco));
                setTempUnit(u);
              }} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <InputField
              label="Hot-side inlet temperature"
              symbol="Th,in"
              unit={tempUnit}
              value={Thi} onChange={setThi}
              placeholder={placeholder("90")}
              error={errors.Thi} />
          </div>
          <div>
            <InputField
              label="Hot-side outlet temperature"
              symbol="Th,out"
              unit={tempUnit}
              value={Tho} onChange={setTho}
              placeholder={placeholder("60")}
              error={errors.Tho} />
          </div>
          <div>
            <InputField
              label="Cold-side inlet temperature"
              symbol="Tc,in"
              unit={tempUnit}
              value={Tci} onChange={setTci}
              placeholder={placeholder("20")}
              error={errors.Tci} />
          </div>
          <div>
            <InputField
              label="Cold-side outlet temperature"
              symbol="Tc,out"
              unit={tempUnit}
              value={Tco} onChange={setTco}
              placeholder={placeholder("50")}
              error={errors.Tco} />
          </div>
        </div>

        {/* Optional F-factor */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="showF" checked={showF}
              onChange={(e) => setShowF(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="showF" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Apply F-factor correction (multi-pass shell-and-tube or crossflow HX)
            </label>
          </div>
          {showF && (
            <div className="max-w-xs">
              <InputField label="F-factor correction" symbol="F" unit="dimensionless"
                value={fFactor} onChange={setFFactor}
                error={errors.fFactor} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                F = 1.0 for pure counterflow · 1-2 S&amp;T ≈ 0.80–0.97 · crossflow ≈ 0.90–0.97
              </p>
            </div>
          )}
        </div>

        {/* Optional Q calculation */}
        <div className="mt-4 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="showQ" checked={showQ}
              onChange={(e) => setShowQ(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="showQ" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Also compute heat duty Q = U × A × F × LMTD
            </label>
          </div>
          {showQ && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
              <div>
                <InputField label="Overall heat transfer coefficient" symbol="U" unit="W/(m²·K)"
                  value={uValue} onChange={setUValue}
                  error={errors.uValue} />
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                  Typical: gas-gas 10–50 · liquid-liquid 200–2000 · condensing steam 1000–6000
                </p>
              </div>
              <div>
                <InputField label="Heat exchanger area" symbol="A" unit="m²"
                  value={area} onChange={setArea}
                  error={errors.area} />
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
        const F = result.correctedLmtd / result.lmtd;
        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  {F !== 1 ? "Corrected LMTD  F × LMTD" : "Log Mean Temperature Difference  LMTD"}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {fmt(diffToUnit(result.correctedLmtd, tempUnit), 5)} {tempUnit}
                </p>
                {F !== 1 && (
                  <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                    LMTD (before F) = {fmt(diffToUnit(result.lmtd, tempUnit), 5)} {tempUnit} · F = {fmt(F, 4)}
                  </p>
                )}
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Temperature differences
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: `ΔT₁ [${tempUnit}]`,  value: fmt(diffToUnit(result.deltaT1, tempUnit), 4) },
                    { label: `ΔT₂ [${tempUnit}]`,  value: fmt(diffToUnit(result.deltaT2, tempUnit), 4) },
                    { label: `LMTD [${tempUnit}]`, value: fmt(diffToUnit(result.lmtd,    tempUnit), 5) },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">R = ΔT_hot / ΔT_cold</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(result.capacityRatioR, 4)}
                    </p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">P = effectiveness</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(result.effectivenessP, 4)}
                    </p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      {result.heatDuty !== undefined ? "Q [W]" : `F × LMTD [${tempUnit}]`}
                    </p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {result.heatDuty !== undefined
                        ? fmt(result.heatDuty, 5)
                        : fmt(diffToUnit(result.correctedLmtd, tempUnit), 5)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Regime banner */}
              <div className={`p-4 rounded-lg border ${bannerBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {flowConfig === "counterflow"
                    ? `Counterflow — LMTD = ${fmt(diffToUnit(lmtdVal, tempUnit), 4)} ${tempUnit} (maximum for these terminal temperatures)`
                    : `Parallel flow — LMTD = ${fmt(diffToUnit(lmtdVal, tempUnit), 4)} ${tempUnit}`}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.lmtd} />
              <CommonMistakes mistakes={commonMistakes.lmtd} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Formula and end-temperature definitions:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>LMTD = (ΔT₁ − ΔT₂) / ln(ΔT₁ / ΔT₂)</div>
              <div className="pt-1 text-xs text-gray-500 dark:text-gray-400">Counterflow:</div>
              <div>ΔT₁ = T<sub>h,in</sub> − T<sub>c,out</sub>&nbsp;&nbsp;&nbsp;ΔT₂ = T<sub>h,out</sub> − T<sub>c,in</sub></div>
              <div className="pt-1 text-xs text-gray-500 dark:text-gray-400">Parallel flow:</div>
              <div>ΔT₁ = T<sub>h,in</sub> − T<sub>c,in</sub>&nbsp;&nbsp;&nbsp;&nbsp;ΔT₂ = T<sub>h,out</sub> − T<sub>c,out</sub></div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Design equation:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Q = U × A × F × LMTD</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                F = 1.0 for pure counterflow · F &lt; 1 for multi-pass or crossflow
              </div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">F-factor correction (non-counterflow configurations):</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">HX type</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Typical F</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { type: "Double-pipe counterflow",      F: "1.00",      note: "Reference — no correction needed" },
                  { type: "Double-pipe parallel flow",    F: "< 1.00",    note: "Calculated from LMTD ratio" },
                  { type: "1-2 shell-and-tube",           F: "0.80–0.97", note: "Read from TEMA chart vs R, P" },
                  { type: "2-4 shell-and-tube",           F: "0.90–0.99", note: "Higher F than 1-2 for same R, P" },
                  { type: "Crossflow (both unmixed)",     F: "0.90–0.97", note: "Plate-fin type" },
                  { type: "Crossflow (one fluid mixed)",  F: "0.85–0.95", note: "Shell-and-tube crossflow" },
                ].map(({ type, F, note }) => (
                  <tr key={type}>
                    <td className="py-1.5 pr-4">{type}</td>
                    <td className="py-1.5 pr-4 font-mono">{F}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Temperature parameters R and P:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>R = (T<sub>h,in</sub> − T<sub>h,out</sub>) / (T<sub>c,out</sub> − T<sub>c,in</sub>)&nbsp;&nbsp;&nbsp;[heat capacity ratio]</div>
              <div>P = (T<sub>c,out</sub> − T<sub>c,in</sub>) / (T<sub>h,in</sub> − T<sub>c,in</sub>)&nbsp;&nbsp;&nbsp;[cold-side effectiveness]</div>
            </div>
            <p className="mt-1">
              R and P are used to read the F-factor from TEMA charts. F is only defined for P &lt; 1
              (cold outlet cannot exceed hot inlet). When RP = 1 the LMTD method breaks down and
              the NTU-effectiveness method should be used.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">When ΔT₁ = ΔT₂ (uniform temperature difference):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              <div>LMTD → ΔT&nbsp;&nbsp;&nbsp;(L'Hôpital's rule: 0/0 limit)</div>
            </div>
            <p className="mt-1">
              This occurs in a counterflow HX where R = 1 (equal heat capacity rates). The LMTD is
              simply the constant temperature difference along the exchanger.
            </p>
          </div>
        </div>
      </Card>
      <References refs={REFS_LMTD} />
    </div>
  );
}