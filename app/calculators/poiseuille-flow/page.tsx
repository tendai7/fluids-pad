"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_POISEUILLE } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculatePoiseuilleFlow,
  generatePoiseuilleFlowSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type DiamUnit  = "m" | "mm" | "cm" | "inch";
type LenUnit   = "m" | "ft";
type PresUnit  = "Pa" | "kPa" | "bar" | "psi" | "atm";
type ViscUnit  = "Pa·s" | "cP" | "mPa·s";
type DensUnit  = "kg/m³" | "g/cm³";

const toDm:   Record<DiamUnit,  number> = { m: 1, mm: 1e-3, cm: 1e-2, inch: 0.0254 };
const toLm:   Record<LenUnit,   number> = { m: 1, ft: 0.3048 };
const toPa:   Record<PresUnit,  number> = { Pa: 1, kPa: 1e3, bar: 1e5, psi: 6894.76, atm: 101325 };
const toPas:  Record<ViscUnit,  number> = { "Pa·s": 1, cP: 1e-3, "mPa·s": 1e-3 };
const toKgM3: Record<DensUnit,  number> = { "kg/m³": 1, "g/cm³": 1000 };

const FLUID_PRESETS = [
  { label: "Water at 20°C",  density: "998",  viscosity: "1.002",    viscUnit: "cP"   as ViscUnit },
  { label: "Water at 60°C",  density: "983",  viscosity: "0.467",    viscUnit: "cP"   as ViscUnit },
  { label: "Ethanol at 20°C",density: "789",  viscosity: "1.2",      viscUnit: "cP"   as ViscUnit },
  { label: "Blood (37°C)",   density: "1060", viscosity: "3.5",      viscUnit: "cP"   as ViscUnit },
  { label: "Glycerin 25°C",  density: "1261", viscosity: "950",      viscUnit: "cP"   as ViscUnit },
  { label: "Engine oil",     density: "880",  viscosity: "300",      viscUnit: "cP"   as ViscUnit },
  { label: "Air at 20°C",    density: "1.204",viscosity: "0.0183",   viscUnit: "cP"   as ViscUnit },
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

export default function PoiseuilleFlowCalculator() {
  const [diameter,   setDiameter]   = useState("10");
  const [diamUnit,   setDiamUnit]   = useState<DiamUnit>("mm");
  const [length,     setLength]     = useState("1");
  const [lenUnit,    setLenUnit]    = useState<LenUnit>("m");
  const [deltaP,     setDeltaP]     = useState("10");
  const [presUnit,   setPresUnit]   = useState<PresUnit>("Pa");
  const [viscosity,  setViscosity]  = useState("1.002");
  const [viscUnit,   setViscUnit]   = useState<ViscUnit>("cP");
  const [density,    setDensity]    = useState("998");
  const [densUnit,   setDensUnit]   = useState<DensUnit>("kg/m³");

  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [result,  setResult]  = useState<ReturnType<typeof calculatePoiseuilleFlow> | null>(null);
  const [steps,   setSteps]   = useState<ReturnType<typeof generatePoiseuilleFlowSteps> | null>(null);

  const handleClear = () => {
    setDiameter("");
    setDiamUnit("mm");
    setLength("");
    setLenUnit("m");
    setDeltaP("");
    setPresUnit("Pa");
    setViscosity("");
    setViscUnit("cP");
    setDensity("");
    setDensUnit("kg/m³");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const dRaw  = parseFloat(diameter);
    const lRaw  = parseFloat(length);
    const dpRaw = parseFloat(deltaP);
    const muRaw = parseFloat(viscosity);
    const rhoRaw = parseFloat(density);

    if (isNaN(dRaw)   || dRaw   <= 0) newErrors.diameter   = "Must be a positive number";
    if (isNaN(lRaw)   || lRaw   <= 0) newErrors.length      = "Must be a positive number";
    if (isNaN(dpRaw)  || dpRaw  <= 0) newErrors.deltaP      = "Must be a positive number";
    if (isNaN(muRaw)  || muRaw  <= 0) newErrors.viscosity   = "Must be a positive number";
    if (isNaN(rhoRaw) || rhoRaw <= 0) newErrors.density     = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const dSI   = dRaw  * toDm[diamUnit];
    const lSI   = lRaw  * toLm[lenUnit];
    const dpSI  = dpRaw * toPa[presUnit];
    const muSI  = muRaw * toPas[viscUnit];
    const rhoSI = rhoRaw * toKgM3[densUnit];

    try {
      const input = { diameter: dSI, length: lSI, pressureDifference: dpSI, viscosity: muSI, density: rhoSI };
      const calc  = calculatePoiseuilleFlow(input);
      const stp   = generatePoiseuilleFlowSteps(input, calc);
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
          Poiseuille Flow Calculator (Hagen-Poiseuille)
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Flow rate, velocity profile, and Re check for fully developed laminar flow in a circular pipe.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Mechanics II
        </span>
      </div>

      {/* Fluid presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Common fluids — click to auto-fill density and viscosity
        </h2>
        <div className="flex flex-wrap gap-2">
          {FLUID_PRESETS.map((p) => (
            <button key={p.label}
              onClick={() => {
                setDensity(p.density);   setDensUnit("kg/m³");
                setViscosity(p.viscosity); setViscUnit(p.viscUnit);
              }}
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
            <InputField label="Pipe diameter" symbol="D" unit={diamUnit}
              value={diameter} onChange={setDiameter}
              placeholder={diamUnit === "m" ? "0.01" : diamUnit === "cm" ? "1" : diamUnit === "inch" ? "0.394" : "10"}
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

          {/* Length */}
          <div>
            <InputField label="Pipe length" symbol="L" unit={lenUnit}
              value={length} onChange={setLength}
              placeholder={lenUnit === "m" ? "1" : "3.28"}
              error={errors.length} />
            <div className="flex gap-2 -mt-2">
              {(["m", "ft"] as LenUnit[]).map(u => (
                <Btn key={u} label={u} active={lenUnit === u} onClick={() => {
                  const si = parseFloat(length) * toLm[lenUnit];
                  setLenUnit(u);
                  if (!isNaN(si)) setLength(fmt(si / toLm[u]));
                }} />
              ))}
            </div>
          </div>

          {/* Pressure difference */}
          <div>
            <InputField label="Pressure difference" symbol="ΔP" unit={presUnit}
              value={deltaP} onChange={setDeltaP}
              placeholder={presUnit === "Pa" ? "10" : presUnit === "kPa" ? "0.01" : presUnit === "bar" ? "0.0001" : "0.00145"}
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

          {/* Viscosity */}
          <div>
            <InputField label="Dynamic viscosity" symbol="μ" unit={viscUnit}
              value={viscosity} onChange={setViscosity}
              placeholder={viscUnit === "Pa·s" ? "0.001002" : "1.002"}
              error={errors.viscosity} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["Pa·s", "cP", "mPa·s"] as ViscUnit[]).map(u => (
                <Btn key={u} label={u} active={viscUnit === u} onClick={() => {
                  const si = parseFloat(viscosity) * toPas[viscUnit];
                  setViscUnit(u);
                  if (!isNaN(si)) setViscosity(fmt(si / toPas[u]));
                }} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              1 cP = 1 mPa·s = 0.001 Pa·s
            </p>
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
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Used only to verify Re &lt; 2 300 (laminar condition).
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
        const Q = result.flowRate;
        const qUnits: [string, number][] = [
          ["m³/s",  Q],
          ["L/s",   Q * 1000],
          ["L/min", Q * 60000],
          ["m³/h",  Q * 3600],
        ];
        const regimeBg = result.isLaminar
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Volume flow rate  Q = πr⁴ΔP / (8μL)
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
                  Velocity profile
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {([
                    { label: <>Mean  V<sub>mean</sub></>,  value: `${fmt(result.meanVelocity, 4)} m/s` },
                    { label: <>Max  V<sub>max</sub></>,    value: `${fmt(result.maxVelocity,  4)} m/s` },
                    { label: <>Re</>,                      value: fmt(result.reynoldsNumber, 4)         },
                  ] as { label: React.ReactNode; value: string }[]).map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Laminar check banner */}
              <div className={`p-4 rounded-lg border ${regimeBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  Laminar check — Re = {fmt(result.reynoldsNumber, 4)}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.poiseuilleFlow} />
              <CommonMistakes mistakes={commonMistakes.poiseuilleFlow} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Hagen-Poiseuille equation:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              Q = (π × r⁴ × ΔP) / (8 × μ × L)&nbsp;&nbsp;&nbsp;&nbsp;[m³/s]
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Parabolic velocity profile:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>v(r) = (ΔP / 4μL) × (R² - r²)</div>
              <div>V<sub>max</sub> = ΔP × R² / (4μL)&nbsp;&nbsp;[at centreline, r = 0]</div>
              <div>V<sub>mean</sub> = V<sub>max</sub> / 2 = Q / (πR²)</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Validity condition:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              Re = ρ × V<sub>mean</sub> × D / μ &lt; 2 300
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Above Re ≈ 2 300 the flow transitions to turbulent and the parabolic profile breaks down.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Q = volume flow rate [m³/s]</li>
              <li>r = pipe radius = D/2 [m]</li>
              <li>R = pipe radius (used in profile equation) [m]</li>
              <li>ΔP = pressure difference along length L [Pa]</li>
              <li>μ = dynamic viscosity [Pa·s]</li>
              <li>L = pipe length [m]</li>
              <li>ρ = fluid density [kg/m³]</li>
            </ul>
          </div>

          <p>
            Flow rate scales with the <strong>fourth power of radius</strong> — halving the pipe diameter
            reduces Q by a factor of 16. This makes diameter the most sensitive parameter in Poiseuille flow.
          </p>
        </div>
      </Card>

      <References refs={REFS_POISEUILLE} />
    </div>
  );
}
