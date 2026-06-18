"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_FLOW_COEFFICIENT } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateFlowCoefficient,
  generateFlowCoefficientSteps,
  commonAssumptions,
  commonMistakes,
  type FlowCoefficientMode,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type FlowUnit = "m³/h" | "L/min" | "L/s" | "gal/min";
type PresUnit = "psi" | "bar" | "kPa" | "Pa";
type DensUnit = "kg/m³" | "g/cm³";
type CvMode  = "Cv" | "Kv";

const toM3S: Record<FlowUnit, number> = { "m³/h": 1/3600, "L/min": 1/60000, "L/s": 0.001, "gal/min": 6.309e-5 };
const toPa:  Record<PresUnit, number> = { psi: 6894.76, bar: 1e5, kPa: 1000, Pa: 1 };
const toKgM3:Record<DensUnit, number> = { "kg/m³": 1, "g/cm³": 1000 };

const FLUID_PRESETS = [
  { label: "Water at 15°C",  density: "999"  },
  { label: "Water at 80°C",  density: "972"  },
  { label: "Seawater",       density: "1025" },
  { label: "Diesel",         density: "850"  },
  { label: "Gasoline",       density: "730"  },
  { label: "Ethanol",        density: "789"  },
  { label: "Glycerin",       density: "1261" },
] as const;

// Common valve Cv reference values for guidance
const VALVE_REFS = [
  { label: "Ball valve ½″ full-open",   Cv: "14"   },
  { label: "Ball valve 1″ full-open",   Cv: "61"   },
  { label: "Ball valve 2″ full-open",   Cv: "250"  },
  { label: "Globe valve 1″",            Cv: "11"   },
  { label: "Globe valve 2″",            Cv: "45"   },
  { label: "Butterfly valve 2″",        Cv: "75"   },
  { label: "Butterfly valve 4″",        Cv: "600"  },
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

export default function FlowCoefficientCalculator() {
  const [mode,       setMode]       = useState<FlowCoefficientMode>("findCv");
  const [flowRate,   setFlowRate]   = useState("10");
  const [flowUnit,   setFlowUnit]   = useState<FlowUnit>("m³/h");
  const [deltaP,     setDeltaP]     = useState("1");
  const [presUnit,   setPresUnit]   = useState<PresUnit>("bar");
  const [density,    setDensity]    = useState("999");
  const [densUnit,   setDensUnit]   = useState<DensUnit>("kg/m³");
  const [cvInput,    setCvInput]    = useState("14");
  const [cvMode,     setCvMode]     = useState<CvMode>("Cv");
  const [selectedRef, setSelectedRef] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateFlowCoefficient> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateFlowCoefficientSteps> | null>(null);

  const handleClear = () => {
    setMode("findCv");
    setFlowRate("");
    setFlowUnit("m³/h");
    setDeltaP("");
    setPresUnit("bar");
    setDensity("");
    setDensUnit("kg/m³");
    setCvInput("");
    setCvMode("Cv");
    setSelectedRef("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const rhoRaw = parseFloat(density);
    const qRaw   = parseFloat(flowRate);
    const dpRaw  = parseFloat(deltaP);
    const cvRaw  = parseFloat(cvInput);

    if (isNaN(rhoRaw) || rhoRaw <= 0) newErrors.density = "Must be a positive number";

    if (mode === "findCv") {
      if (isNaN(qRaw)  || qRaw  <= 0) newErrors.flowRate = "Must be a positive number";
      if (isNaN(dpRaw) || dpRaw <= 0) newErrors.deltaP   = "Must be a positive number";
    } else if (mode === "findQ") {
      if (isNaN(cvRaw) || cvRaw <= 0) newErrors.cvInput  = "Must be a positive number";
      if (isNaN(dpRaw) || dpRaw <= 0) newErrors.deltaP   = "Must be a positive number";
    } else {
      if (isNaN(cvRaw) || cvRaw <= 0) newErrors.cvInput  = "Must be a positive number";
      if (isNaN(qRaw)  || qRaw  <= 0) newErrors.flowRate = "Must be a positive number";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const rhoSI = rhoRaw * toKgM3[densUnit];
    const qSI   = qRaw   * toM3S[flowUnit];
    const dpSI  = dpRaw  * toPa[presUnit];
    // Convert Kv → Cv if user entered Kv
    const cvVal = cvMode === "Kv" ? cvRaw * 1.1561 : cvRaw;

    try {
      const input = {
        mode,
        density: rhoSI,
        flowRate:     (mode !== "findQ")  ? qSI   : undefined,
        pressureDrop: (mode !== "findDP") ? dpSI  : undefined,
        Cv:           (mode !== "findCv") ? cvVal : undefined,
      };
      const calc = calculateFlowCoefficient(input);
      const stp  = generateFlowCoefficientSteps(input, calc);
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
          Flow Coefficient Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Valve sizing using the flow coefficient C<sub>v</sub> (US) and K<sub>v</sub> (metric)
          for incompressible liquid service.
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
            <ModeBtn label="Find Cv / Kv"      active={mode === "findCv"} onClick={() => setMode("findCv")} />
            <ModeBtn label="Find flow rate Q"  active={mode === "findQ"}  onClick={() => setMode("findQ")}  />
            <ModeBtn label="Find pressure drop ΔP" active={mode === "findDP"} onClick={() => setMode("findDP")} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Flow rate — shown for findCv and findDP */}
          {mode !== "findQ" && (
            <div>
              <InputField label="Flow rate" symbol="Q" unit={flowUnit}
                value={flowRate} onChange={setFlowRate}
                placeholder={flowUnit === "gal/min" ? "44" : flowUnit === "L/min" ? "167" : flowUnit === "L/s" ? "2.78" : "10"}
                error={errors.flowRate} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m³/h", "L/min", "L/s", "gal/min"] as FlowUnit[]).map(u => (
                  <Btn key={u} label={u} active={flowUnit === u} onClick={() => {
                    const si = parseFloat(flowRate) * toM3S[flowUnit];
                    setFlowUnit(u);
                    if (!isNaN(si)) setFlowRate(fmt(si / toM3S[u]));
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Pressure drop — shown for findCv and findQ */}
          {mode !== "findDP" && (
            <div>
              <InputField label="Pressure drop" symbol="ΔP" unit={presUnit}
                value={deltaP} onChange={setDeltaP}
                placeholder={presUnit === "psi" ? "14.5" : presUnit === "bar" ? "1" : presUnit === "kPa" ? "100" : "100000"}
                error={errors.deltaP} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["psi", "bar", "kPa", "Pa"] as PresUnit[]).map(u => (
                  <Btn key={u} label={u} active={presUnit === u} onClick={() => {
                    const si = parseFloat(deltaP) * toPa[presUnit];
                    setPresUnit(u);
                    if (!isNaN(si)) setDeltaP(fmt(si / toPa[u]));
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Cv / Kv input — shown for findQ and findDP */}
          {mode !== "findCv" && (
            <div>
              <InputField
                label={`Flow coefficient`}
                symbol={cvMode}
                unit="dimensionless"
                value={cvInput}
                onChange={setCvInput}
                error={errors.cvInput}
              />
              <div className="flex items-center gap-2 -mt-2">
                {(["Cv", "Kv"] as CvMode[]).map(u => (
                  <Btn key={u} label={u} active={cvMode === u} onClick={() => {
                    if (u === cvMode) return;
                    const val = parseFloat(cvInput);
                    setCvMode(u);
                    if (!isNaN(val) && val > 0)
                      setCvInput(fmt(u === "Kv" ? val / 1.1561 : val * 1.1561));
                  }} />
                ))}
                <select
                  value={selectedRef}
                  onChange={(e) => {
                    const lbl = e.target.value;
                    setSelectedRef(lbl);
                    const ref = VALVE_REFS.find(r => r.label === lbl);
                    if (ref) { setCvInput(ref.Cv); setCvMode("Cv"); }
                  }}
                  className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Valve reference…</option>
                  {VALVE_REFS.map(r => (
                    <option key={r.label} value={r.label}>{r.label} — Cv = {r.Cv}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                K<sub>v</sub> = C<sub>v</sub> / 1.1561
              </p>
            </div>
          )}

          {/* Density — always shown */}
          <div>
            <InputField label="Fluid density" symbol="ρ" unit={densUnit}
              value={density} onChange={setDensity}
              placeholder={densUnit === "kg/m³" ? "999" : "0.999"}
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
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              SG = ρ / 999.1 · C<sub>v</sub> reference: water at 15°C (SG = 1)
            </p>
          </div>
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
        const isPrimary = mode === "findCv";
        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary result */}
              <div>
                {mode === "findCv" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Flow coefficient  C<sub>v</sub> = Q[gal/min] / √(ΔP[psi] / SG)
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      C<sub>v</sub> = {fmt(result.Cv, 5)}
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      K<sub>v</sub> = {fmt(result.Kv, 5)}
                    </p>
                  </>
                )}
                {mode === "findQ" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Flow rate  Q = C<sub>v</sub> × √(ΔP[psi] / SG)
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {fmt(result.flowRateM3h, 5)} m³/h
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      {fmt(result.flowRateGpm, 4)} gal/min
                    </p>
                  </>
                )}
                {mode === "findDP" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Pressure drop  ΔP[psi] = SG × (Q[gal/min] / C<sub>v</sub>)²
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {fmt(result.pressureDropBar, 5)} bar
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      {fmt(result.pressureDropPsi, 4)} psi
                    </p>
                  </>
                )}
              </div>

              {/* Unit grid */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  {mode === "findCv" ? "Cv / Kv equivalence" : mode === "findQ" ? "Flow rate in other units" : "Pressure drop in other units"}
                </p>
                {mode === "findCv" && (
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ["Cv (US)", fmt(result.Cv, 5)],
                      ["Kv (metric)", fmt(result.Kv, 5)],
                    ] as [string, string][]).map(([unit, value]) => (
                      <div key={unit} className="px-3 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                        <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                )}
                {mode === "findQ" && (
                  <div className="grid grid-cols-4 gap-2">
                    {([
                      ["m³/h",   result.flowRateM3h],
                      ["L/min",  result.flowRateM3h * 1000/60],
                      ["L/s",    result.flowRate * 1000],
                      ["gal/min",result.flowRateGpm],
                    ] as [string, number][]).map(([unit, value]) => (
                      <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                        <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                      </div>
                    ))}
                  </div>
                )}
                {mode === "findDP" && (
                  <div className="grid grid-cols-4 gap-2">
                    {([
                      ["psi",  result.pressureDropPsi],
                      ["bar",  result.pressureDropBar],
                      ["kPa",  result.pressureDrop/1000],
                      ["Pa",   result.pressureDrop],
                    ] as [string, number][]).map(([unit, value]) => (
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
                    { label: <>C<sub>v</sub></>,       value: fmt(result.Cv, 5)               },
                    { label: <>K<sub>v</sub></>,       value: fmt(result.Kv, 5)               },
                    { label: <>SG</>,                  value: fmt(result.specificGravity, 4)  },
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
              <AssumptionsList assumptions={commonAssumptions.flowCoefficient} />
              <CommonMistakes mistakes={commonMistakes.flowCoefficient} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Liquid service — C<sub>v</sub> (US, ISA standard):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>C<sub>v</sub> = Q[gal/min] / √(ΔP[psi] / SG)</div>
              <div>Q[gal/min] = C<sub>v</sub> × √(ΔP[psi] / SG)</div>
              <div>ΔP[psi] = SG × (Q[gal/min] / C<sub>v</sub>)²</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Metric equivalent — K<sub>v</sub> (IEC standard):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>K<sub>v</sub> = Q[m³/h] / √(ΔP[bar] / SG)</div>
              <div>C<sub>v</sub> = 1.1561 × K<sub>v</sub>&nbsp;&nbsp;&nbsp;&nbsp;K<sub>v</sub> = C<sub>v</sub> / 1.1561</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>C<sub>v</sub> = US flow coefficient [US gal/min per √psi]</li>
              <li>K<sub>v</sub> = metric flow coefficient [m³/h per √bar]</li>
              <li>Q = volumetric flow rate</li>
              <li>ΔP = pressure drop across valve</li>
              <li>SG = specific gravity relative to water at 15°C (999 kg/m³)</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Typical valve C<sub>v</sub> values:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Valve</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">C<sub>v</sub> (approx.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {VALVE_REFS.map(({ label, Cv }) => (
                  <tr key={label}>
                    <td className="py-1.5 pr-4">{label}</td>
                    <td className="py-1.5 font-mono">{Cv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">Gas and steam service</p>
            <p>
              This calculator applies to <strong>incompressible liquid service only</strong>.
              Gas and steam Cv calculations require additional correction factors for
              compressibility, critical flow (choked flow), and specific heat ratio.
              Use the ISA 75.01 / IEC 60534-2-1 standard for those cases.
            </p>
          </div>
        </div>
      </Card>

      <References refs={REFS_FLOW_COEFFICIENT} />
    </div>
  );
}
