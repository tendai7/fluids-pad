"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_AREA_MACH } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateAreaMachRelation,
  generateAreaMachRelationSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type AreaUnit = "m²" | "cm²" | "mm²" | "in²";

const toM2:   Record<AreaUnit, number> = { "m²": 1, "cm²": 1e-4, "mm²": 1e-6, "in²": 6.4516e-4 };
const fromM2: Record<AreaUnit, number> = { "m²": 1, "cm²": 1e4,  "mm²": 1e6,  "in²": 1 / 6.4516e-4 };

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

export default function AreaMachRelationCalculator() {
  const [mach,       setMach]       = useState("2.0");
  const [gamma,      setGamma]      = useState("1.4");
  const [showArea,   setShowArea]   = useState(false);
  const [throatArea, setThroatArea] = useState("1.0");
  const [areaUnit,   setAreaUnit]   = useState<AreaUnit>("cm²");
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const [result,     setResult]     = useState<ReturnType<typeof calculateAreaMachRelation> | null>(null);
  const [steps,      setSteps]      = useState<ReturnType<typeof generateAreaMachRelationSteps> | null>(null);

  const handleAreaUnitChange = (newUnit: AreaUnit) => {
    const a = parseFloat(throatArea);
    if (!isNaN(a)) setThroatArea(fmt(a * toM2[areaUnit] / toM2[newUnit], 5));
    setAreaUnit(newUnit);
  };

  const handleClear = () => {
    setMach("");
    setGamma("");
    setThroatArea("");
    setAreaUnit("cm²");
    setShowArea(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const M    = parseFloat(mach);
    const gVal = parseFloat(gamma);
    const aRaw = parseFloat(throatArea);

    if (isNaN(M) || M <= 0)        newErrors.mach      = "Must be > 0";
    if (isNaN(gVal) || gVal <= 1)  newErrors.gamma     = "Must be > 1";
    if (showArea && (isNaN(aRaw) || aRaw <= 0)) newErrors.throatArea = "Must be positive";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        mach:       M,
        gamma:      gVal,
        throatArea: showArea ? aRaw * toM2[areaUnit] : undefined,
      };
      const calc = calculateAreaMachRelation(input);
      const stp  = generateAreaMachRelationSteps(input, calc);
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
          Area-Mach Relation Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Compute A/A* for isentropic nozzle flow and the alternate Mach number — every
          area ratio A/A* &gt; 1 has one subsonic and one supersonic solution.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
          Compressible Flow · Nozzle
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

          {/* Mach */}
          <div>
            <InputField label="Mach number" symbol="M" unit="dimensionless"
              value={mach} onChange={setMach} error={errors.mach} />
            <div className="flex gap-2 -mt-2">
              {["0.3", "0.5", "0.8", "1.0", "1.5", "2.0", "3.0"].map(v => (
                <Btn key={v} label={v} active={mach === v} onClick={() => setMach(v)} />
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
        </div>

        {/* Optional throat area */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-start gap-3">
            <input type="checkbox" id="showArea" checked={showArea}
              onChange={(e) => setShowArea(e.target.checked)}
              className="mt-3 w-4 h-4 text-blue-600 rounded" />
            <div className="flex-1">
              <label htmlFor="showArea" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Supply throat area A* — computes the local cross-section area A = A* × (A/A*)
              </label>
              {showArea && (
                <>
                  <InputField label="Throat area" symbol="A*" unit={areaUnit}
                    value={throatArea} onChange={setThroatArea}
                    placeholder={areaUnit === "m²" ? "0.0001" : areaUnit === "cm²" ? "1.0" : areaUnit === "mm²" ? "100" : "0.155"}
                    error={errors.throatArea} />
                  <div className="flex gap-2 -mt-2">
                    {(["m²", "cm²", "mm²", "in²"] as AreaUnit[]).map(u => (
                      <Btn key={u} label={u} active={areaUnit === u} onClick={() => handleAreaUnitChange(u)} />
                    ))}
                  </div>
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
                  Area Ratio  A/A*
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  A/A* = {fmt(result.areaRatio)}
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  {result.regime === "sonic"
                    ? "Throat — unique solution at M = 1"
                    : `Alternate M = ${fmt(result.alternateMach)} (${result.regime === "subsonic" ? "supersonic" : "subsonic"} branch)`}
                </p>
              </div>
              <span className={`mt-1 px-3 py-1 rounded text-sm font-semibold capitalize ${REGIME_COLORS[result.regime]}`}>
                {result.regime}
              </span>
            </div>

            {/* Dual-solution banner */}
            <div className={`p-4 rounded-lg border ${REGIME_BG[result.regime]}`}>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">
                Dual solution — A/A* = {fmt(result.areaRatio)} is shared by two Mach numbers
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">Subsonic branch: </span>
                M = {result.regime === "subsonic"
                  ? <strong>{fmt(parseFloat(mach))}</strong>
                  : fmt(result.alternateMach)}
                {" · "}
                <span className="font-medium">Supersonic branch: </span>
                M = {result.regime === "supersonic"
                  ? <strong>{fmt(parseFloat(mach))}</strong>
                  : fmt(result.alternateMach)}
                {" · "}
                Back pressure determines which branch is realised.
              </p>
            </div>

            {/* Area and Mach grid */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Area ratio and Mach solutions
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "A/A*",             value: fmt(result.areaRatio) },
                  { label: `M (${result.regime})`,  value: fmt(parseFloat(mach)) },
                  { label: `M (${result.regime === "subsonic" ? "supersonic" : result.regime === "supersonic" ? "subsonic" : "sonic"})`, value: fmt(result.alternateMach) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Isentropic ratios at input M */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Isentropic ratios at M = {mach}
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "T/T₀", value: fmt(result.temperatureRatio) },
                  { label: "P/P₀", value: fmt(result.pressureRatio)    },
                  { label: "ρ/ρ₀", value: fmt(result.densityRatio)     },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Local area — only if A* given */}
            {result.localArea != null && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Local cross-section area  A = A* × (A/A*)
                </p>
                <div className="grid grid-cols-4 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {(["m²", "cm²", "mm²", "in²"] as AreaUnit[]).map((u) => (
                    <div key={u} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">A [{u}]</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {fmt(result.localArea! * fromM2[u], 4)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.areaMachRelation} />
            <CommonMistakes mistakes={commonMistakes.areaMachRelation} />
          </div>
        </ResultsCard>
      )}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Area-Mach number relation (isentropic, quasi-1D):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>A/A* = (1/M) × [(2/(γ+1)) × (1 + (γ−1)/2 × M²)]<sup>(γ+1)/(2(γ−1))</sup></div>
              <div>T/T₀ = [1 + (γ−1)/2 × M²]<sup>−1</sup></div>
              <div>P/P₀ = (T/T₀)<sup>γ/(γ−1)</sup></div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>A = local cross-sectional area of the duct [m²]</li>
              <li>A* = throat area where M = 1 — minimum area in the nozzle [m²]</li>
              <li>M = local Mach number</li>
              <li>T₀, P₀ = stagnation (total) temperature and pressure — constant throughout isentropic flow</li>
              <li>A/A* has a minimum value of 1.0 at M = 1; it increases for both M &lt; 1 and M &gt; 1</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">
              Area-Mach table — air (γ = 1.4):
            </p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  {["M", "A/A*", "T/T₀", "P/P₀", "ρ/ρ₀"].map(h => (
                    <th key={h} className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { M: "0.2",  A: "2.964",  T: "0.9921", P: "0.9725", r: "0.9803" },
                  { M: "0.4",  A: "1.590",  T: "0.9690", P: "0.8956", r: "0.9243" },
                  { M: "0.6",  A: "1.188",  T: "0.9328", P: "0.7840", r: "0.8405" },
                  { M: "0.8",  A: "1.038",  T: "0.8865", P: "0.6560", r: "0.7400" },
                  { M: "1.0",  A: "1.000",  T: "0.8333", P: "0.5283", r: "0.6339" },
                  { M: "1.5",  A: "1.176",  T: "0.6897", P: "0.2724", r: "0.3950" },
                  { M: "2.0",  A: "1.688",  T: "0.5556", P: "0.1278", r: "0.2300" },
                  { M: "2.5",  A: "2.637",  T: "0.4444", P: "0.0585", r: "0.1317" },
                  { M: "3.0",  A: "4.235",  T: "0.3571", P: "0.0272", r: "0.0762" },
                  { M: "4.0",  A: "10.72",  T: "0.2381", P: "0.0066", r: "0.0277" },
                  { M: "5.0",  A: "25.00",  T: "0.1667", P: "0.0019", r: "0.0113" },
                ].map(({ M, A, T, P, r }) => (
                  <tr key={M}>
                    <td className="py-1.5 pr-3 font-mono">{M}</td>
                    <td className="py-1.5 pr-3 font-mono">{A}</td>
                    <td className="py-1.5 pr-3 font-mono">{T}</td>
                    <td className="py-1.5 pr-3 font-mono">{P}</td>
                    <td className="py-1.5 font-mono">{r}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            A converging-diverging (Laval) nozzle accelerates subsonic flow through the
            throat (M = 1) to supersonic exit. The diverging section must match A/A* at
            the design Mach number. If back pressure is too high, a normal shock stands
            inside the diverging section and the exit is subsonic.
          </p>
        </div>
      </Card>

      <References refs={REFS_AREA_MACH} />
    </div>
  );
}
