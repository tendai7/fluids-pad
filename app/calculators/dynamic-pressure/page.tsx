"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_PRESSURE_TYPES } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateDynamicPressure,
  generateDynamicPressureSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type VelUnit   = "m/s" | "ft/s" | "km/h" | "knots";
type PressUnit = "Pa" | "kPa" | "bar" | "psi" | "atm";
type DensUnit  = "kg/m³" | "g/cm³";

const toMS:   Record<VelUnit,   number> = { "m/s": 1, "ft/s": 0.3048, "km/h": 1/3.6, "knots": 0.514444 };
const toPa:   Record<PressUnit, number> = { Pa: 1, kPa: 1000, bar: 1e5, psi: 6894.76, atm: 101325 };
const toKgM3: Record<DensUnit,  number> = { "kg/m³": 1, "g/cm³": 1000 };

const FLUID_PRESETS = [
  { label: "Air — sea level",  density: "1.225" },
  { label: "Air — 3 000 m",   density: "0.909" },
  { label: "Air — 10 000 m",  density: "0.414" },
  { label: "Water at 20°C",   density: "998"   },
  { label: "Seawater",        density: "1025"  },
] as const;

const g = 9.81;
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

export default function DynamicPressureCalculator() {
  const [density,      setDensity]      = useState("1.225");
  const [densUnit,     setDensUnit]     = useState<DensUnit>("kg/m³");
  const [velocity,     setVelocity]     = useState("10");
  const [velUnit,      setVelUnit]      = useState<VelUnit>("m/s");
  const [staticP,      setStaticP]      = useState("");
  const [staticPUnit,  setStaticPUnit]  = useState<PressUnit>("Pa");
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [result,       setResult]       = useState<ReturnType<typeof calculateDynamicPressure> | null>(null);
  const [steps,        setSteps]        = useState<ReturnType<typeof generateDynamicPressureSteps> | null>(null);
  const [computed,     setComputed]     = useState<{ vSI: number; rho: number; Ps?: number } | null>(null);

  const handleClear = () => {
    setDensity("");
    setDensUnit("kg/m³");
    setVelocity("");
    setVelUnit("m/s");
    setStaticP("");
    setStaticPUnit("Pa");
    setResult(null);
    setSteps(null);
    setComputed(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const rho  = parseFloat(density);
    const vRaw = parseFloat(velocity);
    const Ps   = staticP.trim() !== "" ? parseFloat(staticP) * toPa[staticPUnit] : undefined;

    if (isNaN(rho)  || rho  <= 0) newErrors.density  = "Must be a positive number";
    if (isNaN(vRaw) || vRaw <  0) newErrors.velocity  = "Must be non-negative";
    if (Ps !== undefined && (isNaN(Ps) || Ps < 0)) newErrors.staticP = "Must be non-negative";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const vSI   = vRaw * toMS[velUnit];
    const rhoSI = rho  * toKgM3[densUnit];

    try {
      const input = { density: rhoSI, velocity: vSI };
      const calc  = calculateDynamicPressure(input);
      const stp   = generateDynamicPressureSteps(input, calc);
      setResult(calc);
      setSteps(stp);
      setComputed({ vSI, rho: rhoSI, Ps });
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Dynamic Pressure Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Calculate dynamic pressure q = ½ρV² — the kinetic energy per unit volume of flow.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Mechanics I
        </span>
      </div>

      {/* Fluid presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Common fluids — click to auto-fill density
        </h2>
        <div className="flex flex-wrap gap-2">
          {FLUID_PRESETS.map((p) => (
            <button key={p.label} onClick={() => setDensity(p.density)}
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

          {/* Density */}
          <div>
            <InputField label="Fluid density" symbol="ρ" unit={densUnit}
              value={density} onChange={setDensity} error={errors.density} />
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

          {/* Velocity + unit */}
          <div>
            <InputField label="Flow velocity" symbol="V" unit={velUnit}
              value={velocity} onChange={setVelocity} error={errors.velocity} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m/s","ft/s","km/h","knots"] as VelUnit[]).map(u => (
                <Btn key={u} label={u} active={velUnit === u} onClick={() => {
                  const si = parseFloat(velocity) * toMS[velUnit];
                  setVelUnit(u);
                  if (!isNaN(si)) setVelocity(fmt(si / toMS[u]));
                }} />
              ))}
            </div>
          </div>

          {/* Optional static pressure */}
          <div className="md:col-span-2">
            <div className="max-w-sm">
              <InputField label="Static pressure (optional — to compute total pressure)" symbol="Ps" unit={staticPUnit}
                value={staticP} onChange={setStaticP} error={errors.staticP} />
              <div className="flex gap-2 -mt-2">
                {(["Pa","kPa","bar","psi","atm"] as PressUnit[]).map(u => (
                  <Btn key={u} label={u} active={staticPUnit === u} onClick={() => {
                    const si = parseFloat(staticP) * toPa[staticPUnit];
                    setStaticPUnit(u);
                    if (!isNaN(si) && staticP.trim() !== "") setStaticP(fmt(si / toPa[u]));
                  }} />
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                If provided, total pressure P<sub>t</sub> = P<sub>s</sub> + q is shown.
              </p>
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

      {result && steps && computed && (() => {
        const q   = result.dynamicPressure;
        const hv  = q / (computed.rho * g);   // velocity head [m]
        const Ps  = computed.Ps;
        const Pt  = Ps !== undefined ? Ps + q : undefined;

        const qUnits: [string, number][] = [
          ["Pa",    q],
          ["kPa",   q / 1000],
          ["bar",   q / 1e5],
          ["psi",   q / 6894.76],
          ["mmHg",  q / 133.322],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Dynamic pressure  q = ½ρV²
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {fmt(q, 6)} Pa
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  {fmt(q / 1000, 5)} kPa
                </p>
              </div>

              {/* Unit grid */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Dynamic pressure in other units
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {qUnits.map(([unit, value]) => (
                    <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                      <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Velocity head */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Related quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "Velocity  V",      value: `${fmt(computed.vSI, 5)} m/s` },
                    { label: "Vel. head  hv",    value: `${fmt(hv, 5)} m`             },
                    { label: "q / (ρg)  check",  value: `${fmt(q / (computed.rho * g), 5)} m` },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total pressure decomposition (only when static P is given) */}
              {Pt !== undefined && Ps !== undefined && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                    Total pressure  P<sub>t</sub> = P<sub>s</sub> + q
                  </p>
                  <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                    {[
                      { label: "Static  Ps",  value: `${fmt(Ps, 5)} Pa` },
                      { label: "Dynamic  q",  value: `${fmt(q,  5)} Pa` },
                      { label: "Total  Pt",   value: `${fmt(Pt, 6)} Pa` },
                    ].map(({ label, value }) => (
                      <div key={label} className="px-3 py-2.5 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                        <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700/40 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {fmt(Ps / 1000, 4)} + {fmt(q / 1000, 4)} = {fmt(Pt / 1000, 5)} kPa
                    </p>
                  </div>
                </div>
              )}

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.dynamicPressure} />
              <CommonMistakes mistakes={commonMistakes.dynamicPressure} />
            </div>
          </ResultsCard>
        );
      })()}

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Dynamic pressure:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              q = ½ρV²&nbsp;&nbsp;[Pa = J/m³]
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Bernoulli decomposition:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              P<sub>t</sub> = P<sub>s</sub> + q = P<sub>s</sub> + ½ρV²
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Equivalent velocity head:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              hv = q / (ρg) = V² / (2g)&nbsp;&nbsp;[m]
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>ρ = fluid density [kg/m³]</li>
              <li>V = flow velocity [m/s]</li>
              <li>q = dynamic pressure [Pa] — kinetic energy per unit volume</li>
              <li>hv = velocity head [m] — kinetic energy per unit weight</li>
            </ul>
          </div>
          <p>
            Dynamic pressure is measured by the difference between the stagnation port and the static port
            of a Pitot-static tube. It scales with V² — doubling velocity quadruples dynamic pressure.
          </p>
        </div>
      </Card>

      <References refs={REFS_PRESSURE_TYPES} />
    </div>
  );
}
