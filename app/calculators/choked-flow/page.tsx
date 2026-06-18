"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_CHOKED_FLOW } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateChokedFlow,
  generateChokedFlowSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type TempUnit = "K" | "°C" | "°F";
type PresUnit = "Pa" | "kPa" | "bar" | "atm" | "psi";
type AreaUnit = "m²" | "cm²" | "mm²" | "in²";

const toK:  Record<TempUnit, (t: number) => number> = {
  "K":  (t) => t,
  "°C": (t) => t + 273.15,
  "°F": (t) => (t - 32) * 5 / 9 + 273.15,
};
const fromK: Record<TempUnit, (k: number) => number> = {
  "K":  (k) => k,
  "°C": (k) => k - 273.15,
  "°F": (k) => (k - 273.15) * 9 / 5 + 32,
};
const toPa: Record<PresUnit, number> = {
  "Pa": 1, "kPa": 1e3, "bar": 1e5, "atm": 101325, "psi": 6894.76,
};
const toM2: Record<AreaUnit, number> = {
  "m²": 1, "cm²": 1e-4, "mm²": 1e-6, "in²": 6.4516e-4,
};

const GAS_PRESETS = [
  { label: "Air (dry)",    gamma: "1.400", R: "287.05",  note: "Standard" },
  { label: "Nitrogen N₂", gamma: "1.400", R: "296.80",  note: "" },
  { label: "Oxygen O₂",   gamma: "1.395", R: "259.83",  note: "" },
  { label: "Helium",      gamma: "1.667", R: "2077.1",  note: "Monatomic" },
  { label: "Hydrogen H₂", gamma: "1.405", R: "4124.2",  note: "" },
  { label: "Argon",       gamma: "1.667", R: "208.13",  note: "Monatomic" },
  { label: "CO₂",         gamma: "1.289", R: "188.92",  note: "" },
  { label: "Methane CH₄", gamma: "1.303", R: "518.28",  note: "" },
] as const;

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

export default function ChokedFlowCalculator() {
  const [totalPressure,    setTotalPressure]    = useState("200");
  const [presUnit,         setPresUnit]         = useState<PresUnit>("kPa");
  const [totalTemperature, setTotalTemperature] = useState("300");
  const [tempUnit,         setTempUnit]         = useState<TempUnit>("K");
  const [throatArea,       setThroatArea]       = useState("1.0");
  const [areaUnit,         setAreaUnit]         = useState<AreaUnit>("cm²");
  const [gamma,            setGamma]            = useState("1.4");
  const [R,                setR]                = useState("287.05");
  const [errors,           setErrors]           = useState<Record<string, string>>({});
  const [result,           setResult]           = useState<ReturnType<typeof calculateChokedFlow> | null>(null);
  const [steps,            setSteps]            = useState<ReturnType<typeof generateChokedFlowSteps> | null>(null);

  const handleTempUnitChange = (newUnit: TempUnit) => {
    const t = parseFloat(totalTemperature);
    if (!isNaN(t)) setTotalTemperature(fmt(fromK[newUnit](toK[tempUnit](t)), 5));
    setTempUnit(newUnit);
  };

  const handlePresUnitChange = (newUnit: PresUnit) => {
    const p = parseFloat(totalPressure);
    if (!isNaN(p)) setTotalPressure(fmt(p * toPa[presUnit] / toPa[newUnit], 5));
    setPresUnit(newUnit);
  };

  const handleAreaUnitChange = (newUnit: AreaUnit) => {
    const a = parseFloat(throatArea);
    if (!isNaN(a)) setThroatArea(fmt(a * toM2[areaUnit] / toM2[newUnit], 5));
    setAreaUnit(newUnit);
  };

  const handleClear = () => {
    setTotalPressure("");
    setPresUnit("kPa");
    setTotalTemperature("");
    setTempUnit("K");
    setThroatArea("");
    setAreaUnit("cm²");
    setGamma("");
    setR("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const pRaw = parseFloat(totalPressure);
    const tRaw = parseFloat(totalTemperature);
    const aRaw = parseFloat(throatArea);
    const gVal = parseFloat(gamma);
    const RVal = parseFloat(R);
    const P0Pa = pRaw * toPa[presUnit];
    const T0K  = toK[tempUnit](tRaw);
    const AM2  = aRaw * toM2[areaUnit];

    if (isNaN(pRaw) || pRaw <= 0)  newErrors.totalPressure    = "Must be positive";
    if (isNaN(tRaw))                newErrors.totalTemperature = "Required";
    if (!isNaN(tRaw) && T0K <= 0)  newErrors.totalTemperature = "Absolute temperature must be > 0 K";
    if (isNaN(aRaw) || aRaw <= 0)  newErrors.throatArea       = "Must be positive";
    if (isNaN(gVal) || gVal <= 1)  newErrors.gamma            = "Must be > 1";
    if (isNaN(RVal) || RVal <= 0)  newErrors.R                = "Must be positive";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        totalPressure: P0Pa, totalTemperature: T0K,
        throatArea: AM2, gamma: gVal, R: RVal,
      };
      const calc = calculateChokedFlow(input);
      const stp  = generateChokedFlowSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : "An error occurred" });
      setResult(null); setSteps(null);
    }
  };

  const T0K = toK[tempUnit](parseFloat(totalTemperature));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Choked Flow Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Maximum mass flow rate through a sonic (M = 1) throat. Computes ṁ, critical
          throat conditions T*, P*, ρ*, and throat velocity V*.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
          Compressible Flow · Choked Flow
        </span>
      </div>

      {/* Gas presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Gas presets — click to fill γ and R
        </h2>
        <div className="flex flex-wrap gap-2">
          {GAS_PRESETS.map((p) => (
            <button key={p.label}
              onClick={() => { setGamma(p.gamma); setR(p.R); }}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* P₀ */}
          <div>
            <InputField label="Total (stagnation) pressure" symbol="P₀" unit={presUnit}
              value={totalPressure} onChange={setTotalPressure}
              placeholder={presUnit === "Pa" ? "200000" : presUnit === "kPa" ? "200" : presUnit === "bar" ? "2" : presUnit === "atm" ? "1.974" : "29.0"}
              error={errors.totalPressure} />
            <div className="flex gap-2 -mt-2">
              {(["Pa", "kPa", "bar", "atm", "psi"] as PresUnit[]).map(u => (
                <Btn key={u} label={u} active={presUnit === u} onClick={() => handlePresUnitChange(u)} />
              ))}
            </div>
          </div>

          {/* T₀ */}
          <div>
            <InputField label="Total (stagnation) temperature" symbol="T₀" unit={tempUnit}
              value={totalTemperature} onChange={setTotalTemperature}
              placeholder={tempUnit === "K" ? "300" : tempUnit === "°C" ? "26.85" : "80.3"}
              error={errors.totalTemperature} />
            <div className="flex gap-2 -mt-2">
              {(["K", "°C", "°F"] as TempUnit[]).map(u => (
                <Btn key={u} label={u} active={tempUnit === u} onClick={() => handleTempUnitChange(u)} />
              ))}
            </div>
            {!isNaN(parseFloat(totalTemperature)) && T0K > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
                T₀ = {T0K.toFixed(2)} K
              </p>
            )}
          </div>

          {/* A* */}
          <div>
            <InputField label="Throat area" symbol="A*" unit={areaUnit}
              value={throatArea} onChange={setThroatArea}
              placeholder={areaUnit === "m²" ? "0.0001" : areaUnit === "cm²" ? "1.0" : areaUnit === "mm²" ? "100" : "0.155"}
              error={errors.throatArea} />
            <div className="flex gap-2 -mt-2">
              {(["m²", "cm²", "mm²", "in²"] as AreaUnit[]).map(u => (
                <Btn key={u} label={u} active={areaUnit === u} onClick={() => handleAreaUnitChange(u)} />
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

          {/* R */}
          <div>
            <InputField label="Specific gas constant" symbol="R" unit="J/(kg·K)"
              value={R} onChange={setR} error={errors.R} />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
              R = Rᵤ/M — 287.05 for air, 2077 for helium
            </p>
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
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Choked Mass Flow Rate  ṁ*
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                ṁ* = {fmt(result.massFlowRate)} kg/s
              </p>
              <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                = {fmt(result.massFlowRate * 1000, 4)} g/s
                {" · "}
                mass flux ṁ/A* = {fmt(result.massFlux, 4)} kg/(m²·s)
              </p>
            </div>

            {/* Info banner */}
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="font-semibold text-gray-900 dark:text-white mb-1">
                Flow coefficient Γ = {fmt(result.flowCoefficient, 5)}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                ṁ* = P₀ × A* × Γ / √(R·T₀) — ṁ* scales with P₀ and inversely with √T₀.
                Doubling P₀ doubles ṁ*; increasing T₀ by 4× halves ṁ*.
              </p>
            </div>

            {/* Mass flow grid */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Mass flow rate
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "ṁ* [kg/s]",        value: fmt(result.massFlowRate,        5) },
                  { label: "ṁ* [g/s]",         value: fmt(result.massFlowRate * 1000, 5) },
                  { label: "ṁ* [lbm/s]",       value: fmt(result.massFlowRate * 2.20462, 4) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: <span>ṁ/A* [kg/(m²·s)]</span>, value: fmt(result.massFlux,          4) },
                  { label: <span>Γ (flow coeff.)</span>,   value: fmt(result.flowCoefficient,   5) },
                  { label: <span>P*/P₀</span>,             value: fmt(result.criticalPresRatio,  5) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Critical throat conditions */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Critical throat conditions (M* = 1)
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "T* [K]",       value: fmt(result.throatTemperature,          5) },
                  { label: "T* [°C]",      value: fmt(result.throatTemperature - 273.15, 4) },
                  { label: <span>T*/T₀</span>, value: fmt(result.criticalTempRatio,      5) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "P* [kPa]",     value: fmt(result.throatPressure / 1000,     5) },
                  { label: "ρ* [kg/m³]",   value: fmt(result.throatDensity,             4) },
                  { label: "V* [m/s]",     value: fmt(result.throatVelocity,            5) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.chokedFlow} />
            <CommonMistakes mistakes={commonMistakes.chokedFlow} />
          </div>
        </ResultsCard>
      )}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Choked mass flow rate:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>ṁ* = A* × P₀ × Γ / √(R·T₀)</div>
              <div>Γ  = √γ × (2/(γ+1))<sup>(γ+1)/(2(γ−1))</sup>&nbsp;&nbsp;&nbsp;[flow coefficient, for air: Γ ≈ 0.6847]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Critical throat conditions at M = 1:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>T* = T₀ × 2/(γ+1)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[for air: T* = 0.833 T₀]</div>
              <div>P* = P₀ × (2/(γ+1))<sup>γ/(γ−1)</sup>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[for air: P* = 0.528 P₀]</div>
              <div>ρ* = P* / (R·T*)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[for air: ρ* = 0.634 ρ₀]</div>
              <div>V* = √(γ·R·T*)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[speed of sound at throat]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>P₀ = stagnation pressure [Pa] — upstream total pressure</li>
              <li>T₀ = stagnation temperature [K] — upstream total temperature</li>
              <li>A* = throat area where M = 1 [m²]</li>
              <li>γ = c<sub>p</sub>/c<sub>v</sub> — specific heat ratio</li>
              <li>R = R<sub>u</sub>/M — specific gas constant [J/(kg·K)]</li>
              <li>ṁ* scales with P₀ and 1/√T₀ — doubling P₀ doubles ṁ*</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Critical pressure ratio for choking:</p>
            <p>
              For a converging nozzle, choking occurs when P<sub>back</sub>/P₀ ≤ P*/P₀
              = (2/(γ+1))<sup>γ/(γ−1)</sup>. For air this is 0.528 — once back pressure
              drops below 52.8% of upstream total pressure, the nozzle is choked and further
              reduction cannot increase ṁ.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Flow coefficient Γ for common gases:</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  {["Gas", "γ", "R [J/(kg·K)]", "Γ", "P*/P₀", "T*/T₀"].map(h => (
                    <th key={h} className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { gas: "Air",      g: "1.400", R: "287.05", G: "0.6847", Pp: "0.5283", Tp: "0.8333" },
                  { gas: "Helium",   g: "1.667", R: "2077.1", G: "0.7262", Pp: "0.4870", Tp: "0.7500" },
                  { gas: "Hydrogen", g: "1.405", R: "4124.2", G: "0.6862", Pp: "0.5267", Tp: "0.8296" },
                  { gas: "CO₂",      g: "1.289", R: "188.92", G: "0.6517", Pp: "0.5457", Tp: "0.8429" },
                  { gas: "Argon",    g: "1.667", R: "208.13", G: "0.7262", Pp: "0.4870", Tp: "0.7500" },
                ].map(({ gas, g, R: Rv, G, Pp, Tp }) => (
                  <tr key={gas}>
                    <td className="py-1.5 pr-3">{gas}</td>
                    <td className="py-1.5 pr-3 font-mono">{g}</td>
                    <td className="py-1.5 pr-3 font-mono">{Rv}</td>
                    <td className="py-1.5 pr-3 font-mono">{G}</td>
                    <td className="py-1.5 pr-3 font-mono">{Pp}</td>
                    <td className="py-1.5 font-mono">{Tp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <References refs={REFS_CHOKED_FLOW} />
    </div>
  );
}
