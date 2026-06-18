"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_ORIFICE_FLOW_RATE } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateOrificeFlow,
  generateOrificeFlowSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type DiamUnit = "m" | "mm" | "cm" | "inch";
type PresUnit = "Pa" | "kPa" | "bar" | "psi" | "atm";
type DensUnit = "kg/m³" | "g/cm³";

const toDm:   Record<DiamUnit, number> = { m: 1, mm: 1e-3, cm: 1e-2, inch: 0.0254 };
const toPa:   Record<PresUnit, number> = { Pa: 1, kPa: 1e3, bar: 1e5, psi: 6894.76, atm: 101325 };
const toKgM3: Record<DensUnit, number> = { "kg/m³": 1, "g/cm³": 1000 };

const FLUID_PRESETS = [
  { label: "Water at 20°C",  density: "998"   },
  { label: "Water at 60°C",  density: "983"   },
  { label: "Seawater",       density: "1025"  },
  { label: "Engine oil",     density: "880"   },
  { label: "Air at 20°C",    density: "1.204" },
] as const;

// Discharge coefficient presets
const CD_PRESETS = [
  { label: "Sharp-edged orifice (standard)",   Cd: 0.61  },
  { label: "Square-edged orifice",             Cd: 0.63  },
  { label: "Well-rounded entrance / nozzle",   Cd: 0.98  },
  { label: "ISA 1932 nozzle",                  Cd: 0.96  },
  { label: "Long-radius nozzle",               Cd: 0.98  },
  { label: "Short tube orifice",               Cd: 0.82  },
  { label: "Borda re-entrant tube",            Cd: 0.52  },
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

export default function OrificeFlowCalculator() {
  const [diameter,   setDiameter]   = useState("50");
  const [diamUnit,   setDiamUnit]   = useState<DiamUnit>("mm");
  const [deltaP,     setDeltaP]     = useState("10");
  const [presUnit,   setPresUnit]   = useState<PresUnit>("kPa");
  const [density,    setDensity]    = useState("998");
  const [densUnit,   setDensUnit]   = useState<DensUnit>("kg/m³");
  const [Cd,         setCd]         = useState("0.61");
  const [selectedCd, setSelectedCd] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateOrificeFlow> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateOrificeFlowSteps> | null>(null);

  const handleClear = () => {
    setDiameter("");
    setDiamUnit("mm");
    setDeltaP("");
    setPresUnit("kPa");
    setDensity("");
    setDensUnit("kg/m³");
    setCd("");
    setSelectedCd("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const dRaw   = parseFloat(diameter);
    const dpRaw  = parseFloat(deltaP);
    const rhoRaw = parseFloat(density);
    const cdVal  = parseFloat(Cd);

    if (isNaN(dRaw)   || dRaw   <= 0)          newErrors.diameter   = "Must be a positive number";
    if (isNaN(dpRaw)  || dpRaw  <= 0)          newErrors.deltaP     = "Must be a positive number";
    if (isNaN(rhoRaw) || rhoRaw <= 0)          newErrors.density    = "Must be a positive number";
    if (isNaN(cdVal)  || cdVal  <= 0 || cdVal > 1) newErrors.Cd    = "Must be between 0 and 1";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const dSI   = dRaw   * toDm[diamUnit];
    const dpSI  = dpRaw  * toPa[presUnit];
    const rhoSI = rhoRaw * toKgM3[densUnit];

    try {
      const input = { diameter: dSI, pressureDifference: dpSI, density: rhoSI, dischargeCoefficient: cdVal };
      const calc  = calculateOrificeFlow(input);
      const stp   = generateOrificeFlowSteps(input, calc);
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
          Orifice Flow Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Flow rate through an orifice from pressure difference and discharge coefficient C<sub>d</sub>.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Diameter */}
          <div>
            <InputField label="Orifice diameter" symbol="D" unit={diamUnit}
              value={diameter} onChange={setDiameter}
              placeholder={diamUnit === "m" ? "0.05" : diamUnit === "cm" ? "5" : diamUnit === "inch" ? "1.97" : "50"}
              error={errors.diameter} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m", "mm", "cm", "inch"] as DiamUnit[]).map(u => (
                <Btn key={u} label={u} active={diamUnit === u} onClick={() => {
                  const si = parseFloat(diameter) * toDm[diamUnit];
                  setDiamUnit(u);
                  if (!isNaN(si)) setDiameter(fmt(si / toDm[u]));
                }} />
              ))}
            </div>
          </div>

          {/* Pressure difference */}
          <div>
            <InputField label="Pressure difference" symbol="ΔP" unit={presUnit}
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

          {/* Cd + presets dropdown */}
          <div>
            <InputField label="Discharge coefficient" symbol="Cd" unit="dimensionless"
              value={Cd} onChange={setCd} error={errors.Cd} />
            <div className="flex items-center gap-2 -mt-2">
              <select
                value={selectedCd}
                onChange={(e) => {
                  const lbl = e.target.value;
                  setSelectedCd(lbl);
                  const preset = CD_PRESETS.find(p => p.label === lbl);
                  if (preset) setCd(preset.Cd.toString());
                }}
                className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Orifice type preset…</option>
                {CD_PRESETS.map(p => (
                  <option key={p.label} value={p.label}>
                    {p.label} — C<sub>d</sub> = {p.Cd}
                  </option>
                ))}
              </select>
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
        const Q = result.flowRate;
        const qUnits: [string, number][] = [
          ["m³/s",  Q],
          ["L/s",   Q * 1000],
          ["L/min", Q * 60000],
          ["m³/h",  Q * 3600],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Volume flow rate  Q = C<sub>d</sub> × A × √(2ΔP/ρ)
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {fmt(Q * 1000, 5)} L/s
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  {fmt(Q, 4)} m³/s
                </p>
              </div>

              {/* Unit grid */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Flow rate in other units
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {qUnits.map(([unit, value]) => (
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
                  {([
                    { label: <>Orifice area  A</>,                      value: `${fmt(result.orificeArea, 4)} m²`            },
                    { label: <>Theoretical vel.  v<sub>th</sub></>,     value: `${fmt(result.theoreticalVelocity, 4)} m/s`    },
                    { label: <>Actual vel.  C<sub>d</sub>×v<sub>th</sub></>, value: `${fmt(result.velocity, 4)} m/s`         },
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
              <AssumptionsList assumptions={commonAssumptions.orificeFlow} />
              <CommonMistakes mistakes={commonMistakes.orificeFlow} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Orifice flow equation:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              Q = C<sub>d</sub> × A × √(2ΔP / ρ)&nbsp;&nbsp;&nbsp;&nbsp;[m³/s]
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Torricelli (theoretical) velocity:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>v<sub>th</sub> = √(2ΔP / ρ)&nbsp;&nbsp;&nbsp;&nbsp;[m/s]</div>
              <div>v<sub>actual</sub> = C<sub>d</sub> × v<sub>th</sub></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              C<sub>d</sub> accounts for both the vena contracta (contraction coefficient C<sub>c</sub>) and
              friction losses (velocity coefficient C<sub>v</sub>): C<sub>d</sub> = C<sub>c</sub> × C<sub>v</sub>.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Q = volume flow rate [m³/s]</li>
              <li>C<sub>d</sub> = discharge coefficient (0–1, dimensionless)</li>
              <li>A = orifice cross-sectional area = π(D/2)² [m²]</li>
              <li>ΔP = pressure difference across orifice [Pa]</li>
              <li>ρ = fluid density [kg/m³]</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Typical discharge coefficients C<sub>d</sub>:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Orifice type</th>
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

          <p>
            The orifice equation is derived from Bernoulli's equation between the upstream section
            and the vena contracta (the narrowest point of the jet just downstream of the orifice).
            C<sub>d</sub> corrects for real-fluid effects not captured by the ideal Bernoulli equation.
          </p>
        </div>
      </Card>

      <References refs={REFS_ORIFICE_FLOW_RATE} />
    </div>
  );
}
