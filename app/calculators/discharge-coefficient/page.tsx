"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_DISCHARGE_COEFF } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateDischargeCd,
  generateDischargeCdSteps,
  commonAssumptions,
  commonMistakes,
  type DischargeCdMode,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type DiamUnit = "m" | "mm" | "cm" | "inch";
type PresUnit = "Pa" | "kPa" | "bar" | "psi" | "atm";
type FlowUnit = "m³/s" | "m³/h" | "L/s" | "L/min";
type DensUnit = "kg/m³" | "g/cm³";

const toDm:   Record<DiamUnit, number> = { m: 1, mm: 1e-3, cm: 1e-2, inch: 0.0254 };
const toPa:   Record<PresUnit, number> = { Pa: 1, kPa: 1e3, bar: 1e5, psi: 6894.76, atm: 101325 };
const toM3S:  Record<FlowUnit, number> = { "m³/s": 1, "m³/h": 1/3600, "L/s": 1e-3, "L/min": 1/60000 };
const toKgM3: Record<DensUnit, number> = { "kg/m³": 1, "g/cm³": 1000 };

const FLUID_PRESETS = [
  { label: "Water at 20°C",  density: "998"   },
  { label: "Water at 60°C",  density: "983"   },
  { label: "Seawater",       density: "1025"  },
  { label: "Engine oil",     density: "880"   },
  { label: "Air at 20°C",    density: "1.204" },
] as const;

const CD_PRESETS = [
  { label: "Sharp-edged orifice (standard)",     Cd: "0.61"  },
  { label: "Square-edged orifice",               Cd: "0.63"  },
  { label: "Well-rounded nozzle / entrance",     Cd: "0.98"  },
  { label: "ISA 1932 nozzle",                    Cd: "0.96"  },
  { label: "Long-radius nozzle",                 Cd: "0.98"  },
  { label: "Short tube orifice",                 Cd: "0.82"  },
  { label: "Borda re-entrant tube",              Cd: "0.52"  },
  { label: "Classical venturi (machined)",       Cd: "0.995" },
] as const;

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

export default function DischargeCoefficientCalculator() {
  const [mode,       setMode]       = useState<DischargeCdMode>("findCd");

  const [diam2,      setDiam2]      = useState("50");
  const [diam2Unit,  setDiam2Unit]  = useState<DiamUnit>("mm");
  const [diam1,      setDiam1]      = useState("100");
  const [diam1Unit,  setDiam1Unit]  = useState<DiamUnit>("mm");
  const [useDiam1,   setUseDiam1]   = useState(false);

  const [deltaP,     setDeltaP]     = useState("10");
  const [presUnit,   setPresUnit]   = useState<PresUnit>("kPa");
  const [flowRate,   setFlowRate]   = useState("2");
  const [flowUnit,   setFlowUnit]   = useState<FlowUnit>("L/s");
  const [density,    setDensity]    = useState("998");
  const [densUnit,   setDensUnit]   = useState<DensUnit>("kg/m³");
  const [Cd,         setCd]         = useState("0.61");
  const [selectedCd, setSelectedCd] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateDischargeCd> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateDischargeCdSteps> | null>(null);

  const handleClear = () => {
    setMode("findCd");
    setDiam2("");
    setDiam2Unit("mm");
    setDiam1("");
    setDiam1Unit("mm");
    setDeltaP("");
    setPresUnit("kPa");
    setFlowRate("");
    setFlowUnit("L/s");
    setDensity("");
    setDensUnit("kg/m³");
    setCd("");
    setSelectedCd("");
    setUseDiam1(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const d2Raw  = parseFloat(diam2);
    const d1Raw  = parseFloat(diam1);
    const dpRaw  = parseFloat(deltaP);
    const qRaw   = parseFloat(flowRate);
    const rhoRaw = parseFloat(density);
    const cdVal  = parseFloat(Cd);

    if (isNaN(d2Raw)  || d2Raw  <= 0)           newErrors.diam2   = "Must be a positive number";
    if (useDiam1 && (!isNaN(d1Raw) && !isNaN(d2Raw) && d1Raw <= d2Raw * toDm[diam2Unit] / toDm[diam1Unit]))
                                                 newErrors.diam1   = "Pipe diameter must be larger than orifice";
    if (isNaN(rhoRaw) || rhoRaw <= 0)            newErrors.density = "Must be a positive number";

    if (mode === "findCd") {
      if (isNaN(qRaw)  || qRaw  <= 0)   newErrors.flowRate = "Must be a positive number";
      if (isNaN(dpRaw) || dpRaw <= 0)   newErrors.deltaP   = "Must be a positive number";
    } else if (mode === "findQ") {
      if (isNaN(cdVal) || cdVal <= 0 || cdVal > 1) newErrors.Cd   = "Must be between 0 and 1";
      if (isNaN(dpRaw) || dpRaw <= 0)   newErrors.deltaP   = "Must be a positive number";
    } else {
      if (isNaN(cdVal) || cdVal <= 0 || cdVal > 1) newErrors.Cd   = "Must be between 0 and 1";
      if (isNaN(qRaw)  || qRaw  <= 0)   newErrors.flowRate = "Must be a positive number";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const d2SI  = d2Raw  * toDm[diam2Unit];
    const d1SI  = useDiam1 && !isNaN(d1Raw) && d1Raw > 0 ? d1Raw * toDm[diam1Unit] : undefined;
    const dpSI  = dpRaw  * toPa[presUnit];
    const qSI   = qRaw   * toM3S[flowUnit];
    const rhoSI = rhoRaw * toKgM3[densUnit];

    try {
      const input = {
        mode, diameter2: d2SI, diameter1: d1SI, density: rhoSI,
        pressureDrop: (mode !== "findDP") ? dpSI   : undefined,
        flowRate:     (mode !== "findQ")  ? qSI    : undefined,
        Cd:           (mode !== "findCd") ? cdVal  : undefined,
      };
      const calc = calculateDischargeCd(input);
      const stp  = generateDischargeCdSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Discharge Coefficient Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Calibrate C<sub>d</sub> from measured flow data, or predict flow rate and
          pressure drop from a known C<sub>d</sub>. Supports the velocity-of-approach
          factor E when pipe diameter is provided.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
          Fluid Mechanics II
        </span>
      </div>

      {/* Fluid presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Common fluids — click to auto-fill density
        </h2>
        <div className="flex flex-wrap gap-2">
          {FLUID_PRESETS.map((p) => (
            <button key={p.label}
              onClick={() => { setDensity(p.density); setDensUnit("kg/m³"); }}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Mode selector */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Solve for:</p>
          <div className="flex gap-2">
            <ModeBtn label="Find Cd  (calibration)"  active={mode === "findCd"} onClick={() => setMode("findCd")} />
            <ModeBtn label="Find flow rate Q"         active={mode === "findQ"}  onClick={() => setMode("findQ")}  />
            <ModeBtn label="Find pressure drop ΔP"   active={mode === "findDP"} onClick={() => setMode("findDP")} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Orifice / throat diameter D₂ */}
          <div>
            <InputField label="Orifice / throat diameter" symbol="D₂" unit={diam2Unit}
              value={diam2} onChange={setDiam2}
              placeholder={diam2Unit === "m" ? "0.05" : diam2Unit === "cm" ? "5" : diam2Unit === "inch" ? "1.97" : "50"}
              error={errors.diam2} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m", "mm", "cm", "inch"] as DiamUnit[]).map(u => (
                <Btn key={u} label={u} active={diam2Unit === u} onClick={() => {
                  const si = parseFloat(diam2) * toDm[diam2Unit];
                  setDiam2Unit(u);
                  if (!isNaN(si)) setDiam2(fmt(si / toDm[u]));
                }} />
              ))}
            </div>
          </div>

          {/* Density */}
          <div>
            <InputField label="Fluid density" symbol="ρ" unit={densUnit}
              value={density} onChange={setDensity}
              placeholder={densUnit === "kg/m³" ? "998" : "0.998"}
              error={errors.density} />
            <div className="flex gap-2 -mt-2">
              {(["kg/m³", "g/cm³"] as DensUnit[]).map(u => (
                <Btn key={u} label={u} active={densUnit === u} onClick={() => {
                  const si = parseFloat(density) * toKgM3[densUnit];
                  setDensUnit(u);
                  if (!isNaN(si)) setDensity(fmt(si / toKgM3[u]));
                }} />
              ))}
            </div>
          </div>

          {/* Pressure drop — shown for findCd and findQ */}
          {mode !== "findDP" && (
            <div>
              <InputField label="Pressure drop" symbol="ΔP" unit={presUnit}
                value={deltaP} onChange={setDeltaP}
                placeholder={presUnit === "Pa" ? "10000" : presUnit === "kPa" ? "10" : presUnit === "bar" ? "0.1" : presUnit === "atm" ? "0.0987" : "1.45"}
                error={errors.deltaP} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["Pa", "kPa", "bar", "psi", "atm"] as PresUnit[]).map(u => (
                  <Btn key={u} label={u} active={presUnit === u} onClick={() => {
                    const si = parseFloat(deltaP) * toPa[presUnit];
                    setPresUnit(u);
                    if (!isNaN(si)) setDeltaP(fmt(si / toPa[u]));
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Flow rate — shown for findCd and findDP */}
          {mode !== "findQ" && (
            <div>
              <InputField label="Measured flow rate" symbol="Q" unit={flowUnit}
                value={flowRate} onChange={setFlowRate}
                placeholder={flowUnit === "m³/s" ? "0.002" : flowUnit === "m³/h" ? "7.2" : flowUnit === "L/min" ? "120" : "2"}
                error={errors.flowRate} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m³/s", "m³/h", "L/s", "L/min"] as FlowUnit[]).map(u => (
                  <Btn key={u} label={u} active={flowUnit === u} onClick={() => {
                    const si = parseFloat(flowRate) * toM3S[flowUnit];
                    setFlowUnit(u);
                    if (!isNaN(si)) setFlowRate(fmt(si / toM3S[u]));
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Cd — shown for findQ and findDP */}
          {mode !== "findCd" && (
            <div>
              <InputField label="Discharge coefficient" symbol="Cd" unit="dimensionless"
                value={Cd} onChange={setCd} error={errors.Cd} />
              <div className="flex items-center gap-2 -mt-2">
                <select
                  value={selectedCd}
                  onChange={(e) => {
                    const lbl = e.target.value;
                    setSelectedCd(lbl);
                    const p = CD_PRESETS.find(x => x.label === lbl);
                    if (p) setCd(p.Cd);
                  }}
                  className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Meter type preset…</option>
                  {CD_PRESETS.map(p => (
                    <option key={p.label} value={p.label}>{p.label} — Cd = {p.Cd}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Velocity-of-approach section */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="useD1" checked={useDiam1}
              onChange={(e) => setUseDiam1(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="useD1" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Include velocity-of-approach factor E = 1/√(1−β⁴) — enter pipe diameter D₁
            </label>
          </div>
          {useDiam1 && (
            <div className="max-w-xs">
              <InputField label="Pipe (upstream) diameter" symbol="D₁" unit={diam1Unit}
                value={diam1} onChange={setDiam1}
                placeholder={diam1Unit === "m" ? "0.1" : diam1Unit === "cm" ? "10" : diam1Unit === "inch" ? "3.94" : "100"}
                error={errors.diam1} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m", "mm", "cm", "inch"] as DiamUnit[]).map(u => (
                  <Btn key={u} label={u} active={diam1Unit === u} onClick={() => {
                    const si = parseFloat(diam1) * toDm[diam1Unit];
                    setDiam1Unit(u);
                    if (!isNaN(si)) setDiam1(fmt(si / toDm[u]));
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
        const qUnits: [string, number][] = [
          ["m³/s",  result.flowRate],
          ["m³/h",  result.flowRate * 3600],
          ["L/s",   result.flowRate * 1000],
          ["L/min", result.flowRate * 60000],
        ];
        const dpUnits: [string, number][] = [
          ["Pa",  result.pressureDrop],
          ["kPa", result.pressureDrop / 1000],
          ["bar", result.pressureDrop / 1e5],
          ["psi", result.pressureDrop / 6894.76],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                {mode === "findCd" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Discharge coefficient  C<sub>d</sub> = Q / (E × A₂ × √(2ΔP/ρ))
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      C<sub>d</sub> = {fmt(result.Cd, 5)}
                    </p>
                    {result.theoreticalFlow && (
                      <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                        Q<sub>actual</sub> / Q<sub>ideal</sub> = {fmt(result.flowRate / (result.theoreticalFlow * (result.approachFactor ?? 1)), 4)}
                      </p>
                    )}
                  </>
                )}
                {mode === "findQ" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Flow rate  Q = C<sub>d</sub> × E × A₂ × √(2ΔP/ρ)
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {fmt(result.flowRate * 1000, 5)} L/s
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      {fmt(result.flowRate, 4)} m³/s
                    </p>
                  </>
                )}
                {mode === "findDP" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Pressure drop  ΔP = ρ/2 × (Q / (C<sub>d</sub> × E × A₂))²
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {fmt(result.pressureDrop / 1000, 5)} kPa
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      {fmt(result.pressureDrop / 6894.76, 4)} psi
                    </p>
                  </>
                )}
              </div>

              {/* Unit grid */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  {mode === "findQ" ? "Flow rate in other units" : mode === "findDP" ? "Pressure drop in other units" : "Flow rates — actual vs ideal"}
                </p>
                {mode === "findCd" && result.theoreticalFlow ? (
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ["Actual Q (L/s)",  result.flowRate * 1000],
                      ["Ideal Q (L/s)",   result.theoreticalFlow * (result.approachFactor ?? 1) * 1000],
                    ] as [string, number][]).map(([label, value]) => (
                      <div key={label} className="px-3 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                        <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                      </div>
                    ))}
                  </div>
                ) : mode === "findQ" ? (
                  <div className="grid grid-cols-4 gap-2">
                    {qUnits.map(([unit, value]) => (
                      <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                        <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {dpUnits.map(([unit, value]) => (
                      <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                        <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Related quantities */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Related quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {([
                    { label: <>C<sub>d</sub></>,            value: fmt(result.Cd, 5)                                                              },
                    { label: <>β = D₂/D₁</>,               value: result.beta !== undefined ? fmt(result.beta, 4) : "— (enter D₁)"              },
                    { label: <>E = 1/√(1−β⁴)</>,           value: result.approachFactor !== undefined ? fmt(result.approachFactor, 5) : "1 (no approach)" },
                  ] as { label: React.ReactNode; value: string }[]).map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interpretation */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.dischargeCd} />
              <CommonMistakes mistakes={commonMistakes.dischargeCd} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Discharge coefficient definition:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>C<sub>d</sub> = Q<sub>actual</sub> / Q<sub>ideal</sub></div>
              <div>Q<sub>ideal</sub> = E × A₂ × √(2ΔP / ρ)</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              C<sub>d</sub> accounts for all real-fluid losses — it is determined experimentally by measuring Q, ΔP, and geometry.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Three rearrangements:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>C<sub>d</sub> = Q / (E × A₂ × √(2ΔP/ρ))&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[calibration]</div>
              <div>Q = C<sub>d</sub> × E × A₂ × √(2ΔP/ρ)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[predict Q]</div>
              <div>ΔP = ρ/2 × (Q / (C<sub>d</sub> × E × A₂))²&nbsp;&nbsp;&nbsp;[predict ΔP]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Velocity-of-approach factor E:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>β = D₂ / D₁&nbsp;&nbsp;&nbsp;&nbsp;(diameter ratio)</div>
              <div>E = 1 / √(1 − β⁴)&nbsp;&nbsp;&nbsp;&nbsp;[&gt; 1 always]</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              E corrects for the non-negligible upstream velocity. When D₁ ≫ D₂ (β → 0), E → 1 and can be omitted.
              For β = 0.5, E = 1.033; for β = 0.7, E = 1.099.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Typical C<sub>d</sub> values:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Meter / geometry</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">C<sub>d</sub></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {CD_PRESETS.map(({ label, Cd }) => (
                  <tr key={label}>
                    <td className="py-1.5 pr-4">{label}</td>
                    <td className="py-1.5 font-mono">{Cd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>C<sub>d</sub> = discharge coefficient (0–1, dimensionless)</li>
              <li>Q = actual volumetric flow rate [m³/s]</li>
              <li>A₂ = orifice/throat area = π(D₂/2)² [m²]</li>
              <li>ΔP = pressure drop across the meter [Pa]</li>
              <li>ρ = fluid density [kg/m³]</li>
              <li>β = D₂/D₁ — diameter ratio</li>
              <li>E = velocity-of-approach factor (1 if D₁ unknown)</li>
            </ul>
          </div>
        </div>
      </Card>

      <References refs={REFS_DISCHARGE_COEFF} />
    </div>
  );
}
