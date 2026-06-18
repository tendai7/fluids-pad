"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_EULER_NUMBER } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateEulerNumber,
  generateEulerNumberSteps,
  commonAssumptions,
  commonMistakes,
  type EulerMode,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type PresUnit = "Pa" | "kPa" | "bar" | "psi";
type VelUnit  = "m/s" | "ft/s" | "km/h";
type DensUnit = "kg/m³" | "g/cm³";

const toPa:   Record<PresUnit, number> = { Pa: 1, kPa: 1e3, bar: 1e5, psi: 6894.76 };
const toMS:   Record<VelUnit,  number> = { "m/s": 1, "ft/s": 0.3048, "km/h": 1/3.6 };
const toKgM3: Record<DensUnit, number> = { "kg/m³": 1, "g/cm³": 1000 };

const FLUID_PRESETS = [
  { label: "Water at 20°C",  density: "998"   },
  { label: "Water at 60°C",  density: "983"   },
  { label: "Air at 20°C",    density: "1.204" },
  { label: "Seawater",       density: "1025"  },
  { label: "Engine oil",     density: "880"   },
] as const;

// Typical Eu / K values for common devices
const EU_PRESETS = [
  { label: "Fully open gate valve",          Eu: "0.2"  },
  { label: "Fully open ball valve",          Eu: "0.05" },
  { label: "Fully open globe valve",         Eu: "10.0" },
  { label: "90° standard elbow",             Eu: "0.9"  },
  { label: "Sharp pipe entrance",            Eu: "0.5"  },
  { label: "Sudden expansion (AR = 2)",      Eu: "0.56" },
  { label: "Sharp-edged orifice (Cd = 0.61)",Eu: "2.69" },
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

export default function EulerNumberCalculator() {
  const [mode,        setMode]        = useState<EulerMode>("findEu");
  const [deltaP,      setDeltaP]      = useState("5");
  const [presUnit,    setPresUnit]    = useState<PresUnit>("kPa");
  const [velocity,    setVelocity]    = useState("3");
  const [velUnit,     setVelUnit]     = useState<VelUnit>("m/s");
  const [density,     setDensity]     = useState("998");
  const [densUnit,    setDensUnit]    = useState<DensUnit>("kg/m³");
  const [euInput,     setEuInput]     = useState("0.9");
  const [selectedEu,  setSelectedEu]  = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateEulerNumber> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateEulerNumberSteps> | null>(null);

  const handleClear = () => {
    setMode("findEu");
    setDeltaP("");
    setPresUnit("kPa");
    setVelocity("");
    setVelUnit("m/s");
    setDensity("");
    setDensUnit("kg/m³");
    setEuInput("");
    setSelectedEu("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const rhoRaw = parseFloat(density);
    const dpRaw  = parseFloat(deltaP);
    const vRaw   = parseFloat(velocity);
    const euVal  = parseFloat(euInput);

    if (isNaN(rhoRaw) || rhoRaw <= 0) newErrors.density  = "Must be a positive number";

    if (mode === "findEu") {
      if (isNaN(dpRaw) || dpRaw <= 0)  newErrors.deltaP   = "Must be a positive number";
      if (isNaN(vRaw)  || vRaw  <= 0)  newErrors.velocity = "Must be a positive number";
    } else if (mode === "findDP") {
      if (isNaN(euVal) || euVal <= 0)  newErrors.euInput  = "Must be a positive number";
      if (isNaN(vRaw)  || vRaw  <= 0)  newErrors.velocity = "Must be a positive number";
    } else {
      if (isNaN(euVal) || euVal <= 0)  newErrors.euInput  = "Must be a positive number";
      if (isNaN(dpRaw) || dpRaw <= 0)  newErrors.deltaP   = "Must be a positive number";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const rhoSI = rhoRaw * toKgM3[densUnit];
    const dpSI  = dpRaw  * toPa[presUnit];
    const vSI   = vRaw   * toMS[velUnit];

    try {
      const input = {
        mode, density: rhoSI,
        pressureDrop: (mode !== "findDP") ? dpSI   : undefined,
        velocity:     (mode !== "findV")  ? vSI    : undefined,
        eulerNumber:  (mode !== "findEu") ? euVal  : undefined,
      };
      const calc = calculateEulerNumber(input as Parameters<typeof calculateEulerNumber>[0]);
      const stp  = generateEulerNumberSteps(input as Parameters<typeof calculateEulerNumber>[0], calc);
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
          Euler Number Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Eu = ΔP / (½ρV²) — ratio of pressure forces to inertial forces.
          Equal to the pressure coefficient C<sub>p</sub> and the K loss coefficient for pipe fittings.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
          Dimensional Analysis
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
            <ModeBtn label="Find Eu"          active={mode === "findEu"} onClick={() => setMode("findEu")} />
            <ModeBtn label="Find ΔP"          active={mode === "findDP"} onClick={() => setMode("findDP")} />
            <ModeBtn label="Find velocity V"  active={mode === "findV"}  onClick={() => setMode("findV")}  />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ΔP — shown for findEu and findV */}
          {mode !== "findDP" && (
            <div>
              <InputField label="Pressure drop" symbol="ΔP" unit={presUnit}
                value={deltaP} onChange={setDeltaP}
                placeholder={presUnit === "Pa" ? "5000" : presUnit === "kPa" ? "5" : presUnit === "bar" ? "0.05" : "0.725"}
                error={errors.deltaP} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["Pa", "kPa", "bar", "psi"] as PresUnit[]).map(u => (
                  <Btn key={u} label={u} active={presUnit === u} onClick={() => {
                    const si = parseFloat(deltaP) * toPa[presUnit];
                    setPresUnit(u);
                    if (!isNaN(si)) setDeltaP(fmt(si / toPa[u]));
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Velocity — shown for findEu and findDP */}
          {mode !== "findV" && (
            <div>
              <InputField label="Flow velocity" symbol="V" unit={velUnit}
                value={velocity} onChange={setVelocity}
                placeholder={velUnit === "m/s" ? "3" : velUnit === "ft/s" ? "9.84" : "10.8"}
                error={errors.velocity} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m/s", "ft/s", "km/h"] as VelUnit[]).map(u => (
                  <Btn key={u} label={u} active={velUnit === u} onClick={() => {
                    const si = parseFloat(velocity) * toMS[velUnit];
                    setVelUnit(u);
                    if (!isNaN(si)) setVelocity(fmt(si / toMS[u]));
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Eu input — shown for findDP and findV */}
          {mode !== "findEu" && (
            <div>
              <InputField label="Euler number" symbol="Eu" unit="dimensionless"
                value={euInput} onChange={setEuInput} error={errors.euInput} />
              <div className="flex items-center gap-2 -mt-2">
                <select
                  value={selectedEu}
                  onChange={(e) => {
                    const lbl = e.target.value;
                    setSelectedEu(lbl);
                    const p = EU_PRESETS.find(x => x.label === lbl);
                    if (p) setEuInput(p.Eu);
                  }}
                  className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Device / fitting preset…</option>
                  {EU_PRESETS.map(p => (
                    <option key={p.label} value={p.label}>{p.label} — Eu = K = {p.Eu}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Eu = K (loss coefficient) for pipe fittings and valves.
              </p>
            </div>
          )}

          {/* Density — always shown */}
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
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Euler number  Eu = ΔP / (½ρV²)
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  Eu = {fmt(result.eulerNumber, 5)}
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  q = ½ρV² = {fmt(result.dynamicPressure, 5)} Pa
                </p>
              </div>

              {/* ΔP unit grid */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Pressure drop ΔP in other units
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {dpUnits.map(([unit, value]) => (
                    <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                      <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related quantities */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Related quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "Eu = Cp = K",     value: fmt(result.eulerNumber, 5)     },
                    { label: "q = ½ρV² (Pa)",   value: fmt(result.dynamicPressure, 5) },
                    { label: "V (m/s)",          value: fmt(result.velocity, 5)        },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
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
              <AssumptionsList assumptions={commonAssumptions.eulerNumber} />
              <CommonMistakes mistakes={commonMistakes.eulerNumber} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Euler number definition:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Eu = ΔP / (½ρV²) = ΔP / q&nbsp;&nbsp;&nbsp;&nbsp;[dimensionless]</div>
              <div>Eu = C<sub>p</sub> = K&nbsp;&nbsp;&nbsp;&nbsp;(pressure coefficient = loss coefficient)</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Note: some textbooks use Eu = ΔP/(ρV²) without the ½. This calculator uses the ΔP/q form.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Three equivalent forms:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Eu = ΔP / (½ρV²)&nbsp;&nbsp;&nbsp;&nbsp;[find Eu from ΔP and V]</div>
              <div>ΔP = Eu × ½ρV²&nbsp;&nbsp;&nbsp;&nbsp;[find pressure drop from Eu]</div>
              <div>V = √(2ΔP / (Eu × ρ))&nbsp;&nbsp;&nbsp;&nbsp;[find velocity from Eu and ΔP]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Typical Eu / K values for common devices:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Device / fitting</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Eu = K</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {EU_PRESETS.map(({ label, Eu }) => (
                  <tr key={label}>
                    <td className="py-1.5 pr-4">{label}</td>
                    <td className="py-1.5 font-mono">{Eu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Where Eu appears in fluid mechanics:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Minor losses: ΔP = K × ½ρV² → K = Eu</li>
              <li>Pressure coefficient: C<sub>p</sub> = (P − P<sub>∞</sub>) / (½ρV<sub>∞</sub>²) = Eu</li>
              <li>Cavitation number: σ = (P − P<sub>v</sub>) / (½ρV²) = Eu when P<sub>ref</sub> = P<sub>v</sub></li>
              <li>Orifice / nozzle: Eu = 1/C<sub>d</sub>² − 1 (for incompressible orifice flow)</li>
              <li>Drag: C<sub>D</sub> ≡ drag force / (q × A) — pressure drag term</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Eu = Euler number (dimensionless)</li>
              <li>ΔP = pressure difference [Pa]</li>
              <li>ρ = fluid density [kg/m³]</li>
              <li>V = characteristic velocity [m/s]</li>
              <li>q = dynamic pressure = ½ρV² [Pa]</li>
            </ul>
          </div>
        </div>
      </Card>

      <References refs={REFS_EULER_NUMBER} />
    </div>
  );
}
