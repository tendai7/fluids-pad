"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_TIDAL_PRISM } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateTidalPrism,
  generateTidalPrismSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type AreaUnit  = "m²" | "km²" | "ha";
type LevelUnit = "m" | "ft" | "cm";

const toM2:  Record<AreaUnit,  number> = { "m²": 1, "km²": 1e6, "ha": 1e4 };
const toMSL: Record<LevelUnit, number> = { "m": 1, "ft": 0.3048, "cm": 0.01 };

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

export default function TidalPrismCalculator() {
  const [basinArea,      setBasinArea]      = useState("50");
  const [areaUnit,       setAreaUnit]       = useState<AreaUnit>("ha");
  const [highWaterLevel, setHighWaterLevel] = useState("1.5");
  const [lowWaterLevel,  setLowWaterLevel]  = useState("-1.5");
  const [levelUnit,      setLevelUnit]      = useState<LevelUnit>("m");
  const [showPeriod,     setShowPeriod]     = useState(false);
  const [tidalPeriod,    setTidalPeriod]    = useState("12.4");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateTidalPrism> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateTidalPrismSteps> | null>(null);

  const handleClear = () => {
    setBasinArea("");
    setAreaUnit("ha");
    setHighWaterLevel("");
    setLowWaterLevel("");
    setLevelUnit("m");
    setTidalPeriod("");
    setShowPeriod(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const aRaw  = parseFloat(basinArea);
    const hwRaw = parseFloat(highWaterLevel);
    const lwRaw = parseFloat(lowWaterLevel);
    const tRaw  = parseFloat(tidalPeriod);

    if (isNaN(aRaw)  || aRaw <= 0)  newErrors.basinArea      = "Must be a positive number";
    if (isNaN(hwRaw))                newErrors.highWaterLevel = "Required (m MSL reference)";
    if (isNaN(lwRaw))                newErrors.lowWaterLevel  = "Required (m MSL reference)";
    if (!isNaN(hwRaw) && !isNaN(lwRaw) && hwRaw <= lwRaw)
      newErrors.highWaterLevel = "High water level must be greater than low water level";
    if (showPeriod && (isNaN(tRaw) || tRaw <= 0))
      newErrors.tidalPeriod = "Must be a positive number (hours)";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        basinArea:      aRaw  * toM2[areaUnit],
        highWaterLevel: hwRaw * toMSL[levelUnit],
        lowWaterLevel:  lwRaw * toMSL[levelUnit],
        tidalPeriod:    showPeriod ? tRaw : undefined,
      };
      const calc = calculateTidalPrism(input);
      const stp  = generateTidalPrismSteps(input, calc);
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
          Tidal Prism Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Calculate tidal prism — the volume of water exchanged between a tidal basin and the
          sea each tidal cycle. Includes O&apos;Brien inlet area estimate and optional
          average ebb/flood flow rate.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 rounded">
          Open Channel Flow · Coastal
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Basin area */}
          <div>
            <InputField label="Basin surface area" symbol="Ab" unit={areaUnit}
              value={basinArea} onChange={setBasinArea}
              placeholder={areaUnit === "m²" ? "500000" : areaUnit === "km²" ? "0.5" : "50"}
              error={errors.basinArea} />
            <div className="flex gap-2 -mt-2">
              {(["m²", "km²", "ha"] as AreaUnit[]).map(u => (
                <Btn key={u} label={u} active={areaUnit === u} onClick={() => setAreaUnit(u)} />
              ))}
            </div>
          </div>

          {/* High water level */}
          <div>
            <InputField label="High water level (MSL)" symbol="HWL" unit={levelUnit}
              value={highWaterLevel} onChange={setHighWaterLevel}
              placeholder={levelUnit === "m" ? "1.5" : levelUnit === "ft" ? "4.9" : "150"}
              error={errors.highWaterLevel} />
            <div className="flex gap-2 -mt-2">
              {(["m", "ft", "cm"] as LevelUnit[]).map(u => (
                <Btn key={u} label={u} active={levelUnit === u} onClick={() => setLevelUnit(u)} />
              ))}
            </div>
          </div>

          {/* Low water level */}
          <div>
            <InputField label="Low water level (MSL)" symbol="LWL" unit={levelUnit}
              value={lowWaterLevel} onChange={setLowWaterLevel}
              placeholder={levelUnit === "m" ? "-1.5" : levelUnit === "ft" ? "-4.9" : "-150"}
              error={errors.lowWaterLevel} />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
              Negative if below MSL datum
            </p>
          </div>
        </div>

        {/* Optional tidal period */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="showPeriod" checked={showPeriod}
              onChange={(e) => setShowPeriod(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="showPeriod" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Also compute average ebb/flood flow — enter tidal period
            </label>
          </div>
          {showPeriod && (
            <div className="max-w-xs">
              <InputField label="Tidal period" symbol="T" unit="hours"
                value={tidalPeriod} onChange={setTidalPeriod} error={errors.tidalPeriod} />
              <div className="flex gap-2 -mt-2">
                {[{ label: "Semi-diurnal (12.4 h)", val: "12.4" }, { label: "Diurnal (24.8 h)", val: "24.8" }].map(p => (
                  <Btn key={p.val} label={p.label} active={tidalPeriod === p.val}
                    onClick={() => setTidalPeriod(p.val)} />
                ))}
              </div>
            </div>
          )}
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
                Tidal Prism  P = A<sub>b</sub> × R
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                P = {fmt(result.tidalPrism, 5)} m³
              </p>
              <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                = {fmt(result.tidalPrism / 1e6, 4)} million m³
                {" · "}
                tidal range R = {fmt(result.tidalRange, 4)} m
              </p>
            </div>

            {/* Unit grid */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Tidal prism quantities
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "R [m]",                                              value: fmt(result.tidalRange,       4) },
                  { label: <span>P [m³]</span>,                                  value: result.tidalPrism.toExponential(4) },
                  { label: <span>P [10⁶ m³]</span>,                             value: fmt(result.tidalPrism / 1e6, 4) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: <span>A<sub>b</sub> [m²]</span>,                     value: fmt(result.tidalPrism / result.tidalRange, 5) },
                  { label: <span>A<sub>c</sub> O'Brien [m²]</span>,             value: fmt(result.obriensInletArea, 4) },
                  { label: result.averageFlowRate !== undefined
                      ? <span>Q̄ ebb/flood [m³/s]</span>
                      : <span className="text-gray-400">Q̄ (enable period)</span>,
                    value: result.averageFlowRate !== undefined
                      ? fmt(result.averageFlowRate, 4)
                      : "—",
                  },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* O'Brien banner */}
            <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
              <p className="font-semibold text-gray-900 dark:text-white mb-1">
                O&apos;Brien inlet stability — A<sub>c</sub> ≈ {fmt(result.obriensInletArea, 4)} m²
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Simplified O&apos;Brien relationship (A<sub>c</sub> = 6.25×10⁻⁴ × P) gives the minimum
                throat cross-section for inlet stability. Real coefficients vary by coast type —
                use as a first estimate only.
              </p>
            </div>

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.tidalPrism} />
            <CommonMistakes mistakes={commonMistakes.tidalPrism} />
          </div>
        </ResultsCard>
      )}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Tidal prism:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>R  = HWL − LWL&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[tidal range, m]</div>
              <div>P  = A<sub>b</sub> × R&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[tidal prism, m³]</div>
              <div>Q̄ = P / (T/2)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[average ebb/flood flow, m³/s]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">O&apos;Brien inlet stability relationship:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>A<sub>c</sub> = C × P<sup>n</sup>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[O&apos;Brien, 1969]</div>
              <div>A<sub>c</sub> ≈ 6.25×10⁻⁴ × P&nbsp;&nbsp;&nbsp;&nbsp;[simplified, n = 1, SI]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>A<sub>b</sub> = basin surface area at mean water level [m²]</li>
              <li>HWL = high water level above MSL datum [m]</li>
              <li>LWL = low water level [m] (negative if below MSL)</li>
              <li>P = tidal prism [m³] — volume exchanged per tidal cycle</li>
              <li>T = tidal period [hours] — 12.4 h semi-diurnal, 24.8 h diurnal</li>
              <li>A<sub>c</sub> = minimum inlet throat cross-sectional area for stability [m²]</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">O&apos;Brien coefficient C by coast (SI units):</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Location</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">C</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">n</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { loc: "Pacific coast (Jarrett 1976)",    c: "7.49×10⁻⁴", n: "0.86" },
                  { loc: "Atlantic coast (Jarrett 1976)",   c: "5.77×10⁻⁴", n: "0.86" },
                  { loc: "Gulf of Mexico (Jarrett 1976)",   c: "3.79×10⁻⁴", n: "0.86" },
                  { loc: "Simplified (this calculator)",    c: "6.25×10⁻⁴", n: "1.0" },
                ].map(({ loc, c, n }) => (
                  <tr key={loc}>
                    <td className="py-1.5 pr-4">{loc}</td>
                    <td className="py-1.5 pr-4 font-mono">{c}</td>
                    <td className="py-1.5 font-mono">{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            The tidal prism governs inlet stability, flushing of estuaries, and sediment
            transport. Larger prisms maintain deeper, more stable inlets. The O&apos;Brien
            relationship is empirical — actual inlet dimensions depend on sediment supply,
            wave energy, and coastal engineering structures.
          </p>
        </div>
      </Card>

      <References refs={REFS_TIDAL_PRISM} />
    </div>
  );
}
