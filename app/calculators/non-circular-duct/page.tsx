"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_NON_CIRCULAR_DUCT } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateNonCircularDuct,
  generateNonCircularDuctSteps,
  commonAssumptions,
  commonMistakes,
  type DuctShape,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type DimUnit  = "m" | "mm" | "cm" | "inch";
type VelUnit  = "m/s" | "ft/s" | "km/h";
type DensUnit = "kg/m³" | "g/cm³";
type ViscUnit = "Pa·s" | "cP" | "mPa·s";
type LenUnit  = "m" | "mm" | "cm" | "ft";

const toDm:   Record<DimUnit,  number> = { m: 1, mm: 1e-3, cm: 1e-2, inch: 0.0254 };
const toMS:   Record<VelUnit,  number> = { "m/s": 1, "ft/s": 0.3048, "km/h": 1/3.6 };
const toKgM3: Record<DensUnit, number> = { "kg/m³": 1, "g/cm³": 1000 };
const toPas:  Record<ViscUnit, number> = { "Pa·s": 1, "cP": 1e-3, "mPa·s": 1e-3 };
const toLm:   Record<LenUnit,  number> = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048 };

const FLUID_PRESETS = [
  { label: "Air at 20°C",    density: "1.204", viscosity: "0.0183", viscUnit: "cP"   as ViscUnit },
  { label: "Water at 20°C",  density: "998",   viscosity: "1.002",  viscUnit: "cP"   as ViscUnit },
  { label: "Water at 60°C",  density: "983",   viscosity: "0.467",  viscUnit: "cP"   as ViscUnit },
  { label: "Engine oil",     density: "880",   viscosity: "300",    viscUnit: "cP"   as ViscUnit },
] as const;

// Absolute roughness presets (m → shown in mm)
const ROUGHNESS_PRESETS = [
  { label: "Smooth (PVC / glass)",  eps_mm: 0.0015 },
  { label: "Commercial steel",      eps_mm: 0.046  },
  { label: "Galvanised steel",      eps_mm: 0.15   },
  { label: "Concrete (smooth)",     eps_mm: 0.3    },
] as const;

type ShapeConfig = { label: string; symbol: string; dims: string[] };
const SHAPES: Record<DuctShape, ShapeConfig> = {
  rectangular:   { label: "Rectangular",       symbol: "□",  dims: ["Width a", "Height b"] },
  square:        { label: "Square",             symbol: "■",  dims: ["Side a"] },
  circular:      { label: "Circular",           symbol: "○",  dims: ["Diameter D"] },
  annular:       { label: "Annular (ring)",     symbol: "⊙",  dims: ["Outer diam D₁", "Inner diam D₂"] },
  parallelPlates:{ label: "Parallel plates",   symbol: "═",  dims: ["Gap H", "Width W"] },
};

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

export default function NonCircularDuctCalculator() {
  const [shape,      setShape]      = useState<DuctShape>("rectangular");
  const [dim1,       setDim1]       = useState("200");
  const [dim2,       setDim2]       = useState("100");
  const [dimUnit,    setDimUnit]    = useState<DimUnit>("mm");
  const [velocity,   setVelocity]   = useState("3");
  const [velUnit,    setVelUnit]    = useState<VelUnit>("m/s");
  const [density,    setDensity]    = useState("1.204");
  const [densUnit,   setDensUnit]   = useState<DensUnit>("kg/m³");
  const [viscosity,  setViscosity]  = useState("0.0183");
  const [viscUnit,   setViscUnit]   = useState<ViscUnit>("cP");
  const [length,     setLength]     = useState("10");
  const [lenUnit,    setLenUnit]    = useState<LenUnit>("m");
  const [roughness,  setRoughness]  = useState("0.046");
  const [selectedRoughness, setSelectedRoughness] = useState("");

  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [result,  setResult]  = useState<ReturnType<typeof calculateNonCircularDuct> | null>(null);
  const [steps,   setSteps]   = useState<ReturnType<typeof generateNonCircularDuctSteps> | null>(null);

  const needsDim2 = shape === "rectangular" || shape === "annular" || shape === "parallelPlates";
  const cfg = SHAPES[shape];

  const handleClear = () => {
    setShape("rectangular");
    setDim1("");
    setDim2("");
    setDimUnit("mm");
    setVelocity("");
    setVelUnit("m/s");
    setDensity("");
    setDensUnit("kg/m³");
    setViscosity("");
    setViscUnit("cP");
    setLength("");
    setLenUnit("m");
    setRoughness("");
    setSelectedRoughness("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const d1Raw  = parseFloat(dim1);
    const d2Raw  = parseFloat(dim2);
    const vRaw   = parseFloat(velocity);
    const rhoRaw = parseFloat(density);
    const muRaw  = parseFloat(viscosity);
    const lRaw   = parseFloat(length);
    const epsRaw = parseFloat(roughness);

    if (isNaN(d1Raw) || d1Raw <= 0) newErrors.dim1      = "Must be a positive number";
    if (needsDim2 && (isNaN(d2Raw) || d2Raw <= 0)) newErrors.dim2 = "Must be a positive number";
    if (shape === "annular" && !isNaN(d1Raw) && !isNaN(d2Raw) && d2Raw >= d1Raw * toDm[dimUnit] / toDm[dimUnit])
      newErrors.dim2 = "Inner diameter must be smaller than outer";
    if (isNaN(vRaw)   || vRaw   <  0) newErrors.velocity  = "Must be non-negative";
    if (isNaN(rhoRaw) || rhoRaw <= 0) newErrors.density   = "Must be a positive number";
    if (isNaN(muRaw)  || muRaw  <= 0) newErrors.viscosity = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const d1SI  = d1Raw * toDm[dimUnit];
    const d2SI  = d2Raw * toDm[dimUnit];
    const vSI   = vRaw  * toMS[velUnit];
    const rhoSI = rhoRaw * toKgM3[densUnit];
    const muSI  = muRaw  * toPas[viscUnit];
    const lSI   = !isNaN(lRaw) && lRaw > 0 ? lRaw * toLm[lenUnit] : undefined;
    const epsSI = !isNaN(epsRaw) && epsRaw >= 0 ? epsRaw / 1000 : 0; // input in mm → m

    const shapeInput: Parameters<typeof calculateNonCircularDuct>[0] = {
      shape, velocity: vSI, density: rhoSI, viscosity: muSI,
      length: lSI, roughness: epsSI,
      ...(shape === "rectangular"    ? { width: d1SI, height: d2SI }  : {}),
      ...(shape === "square"         ? { side: d1SI }                  : {}),
      ...(shape === "circular"       ? { diameter: d1SI }              : {}),
      ...(shape === "annular"        ? { outerDiam: d1SI, innerDiam: d2SI } : {}),
      ...(shape === "parallelPlates" ? { width: d1SI, height: d2SI }   : {}),
    };

    try {
      const calc = calculateNonCircularDuct(shapeInput);
      const stp  = generateNonCircularDuctSteps(shapeInput, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const regimeBg = result?.regime === "laminar"
    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
    : result?.regime === "transitional"
    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Non-Circular Duct Flow Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Flow in rectangular, square, annular, and parallel-plate ducts using the hydraulic
          diameter D<sub>h</sub> = 4A/P to apply Darcy-Weisbach and Reynolds number correlations.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
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
                setDensity(p.density);  setDensUnit("kg/m³");
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

        {/* Shape selector */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Duct cross-section:</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SHAPES) as DuctShape[]).map(s => (
              <button key={s} onClick={() => setShape(s)}
                className={`px-4 py-2 text-sm rounded-md border transition-colors ${shape === s
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
                {SHAPES[s].symbol} {SHAPES[s].label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Dimension 1 */}
          <div>
            <InputField label={cfg.dims[0]} symbol="—" unit={dimUnit}
              value={dim1} onChange={setDim1}
              placeholder={dimUnit === "m" ? "0.2" : dimUnit === "cm" ? "20" : dimUnit === "inch" ? "7.87" : "200"}
              error={errors.dim1} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m", "mm", "cm", "inch"] as DimUnit[]).map(u => (
                <Btn key={u} label={u} active={dimUnit === u} onClick={() => {
                  const si1 = parseFloat(dim1) * toDm[dimUnit];
                  const si2 = parseFloat(dim2) * toDm[dimUnit];
                  setDimUnit(u);
                  if (!isNaN(si1)) setDim1(fmt(si1 / toDm[u]));
                  if (!isNaN(si2)) setDim2(fmt(si2 / toDm[u]));
                }} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Unit applies to all dimensions</p>
          </div>

          {/* Dimension 2 (if needed) */}
          {needsDim2 && (
            <div>
              <InputField label={cfg.dims[1]} symbol="—" unit={dimUnit}
                value={dim2} onChange={setDim2}
                placeholder={dimUnit === "m" ? "0.1" : dimUnit === "cm" ? "10" : dimUnit === "inch" ? "3.94" : "100"}
                error={errors.dim2} />
            </div>
          )}

          {/* Velocity */}
          <div>
            <InputField label="Mean velocity" symbol="V" unit={velUnit}
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

          {/* Density */}
          <div>
            <InputField label="Fluid density" symbol="ρ" unit={densUnit}
              value={density} onChange={setDensity}
              placeholder={densUnit === "kg/m³" ? "1.204" : "0.001204"}
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

          {/* Viscosity */}
          <div>
            <InputField label="Dynamic viscosity" symbol="μ" unit={viscUnit}
              value={viscosity} onChange={setViscosity}
              placeholder={viscUnit === "Pa·s" ? "0.0000183" : "0.0183"}
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
          </div>

          {/* Roughness */}
          <div>
            <InputField label="Wall roughness ε" symbol="ε" unit="mm"
              value={roughness} onChange={setRoughness} />
            <div className="flex items-center gap-2 -mt-2">
              <select
                value={selectedRoughness}
                onChange={(e) => {
                  const lbl = e.target.value;
                  setSelectedRoughness(lbl);
                  const p = ROUGHNESS_PRESETS.find(x => x.label === lbl);
                  if (p) setRoughness(p.eps_mm.toString());
                }}
                className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Material preset…</option>
                {ROUGHNESS_PRESETS.map(p => (
                  <option key={p.label} value={p.label}>{p.label} — ε = {p.eps_mm} mm</option>
                ))}
              </select>
            </div>
          </div>

          {/* Length for head loss */}
          <div>
            <InputField label="Duct length (for head loss)" symbol="L" unit={lenUnit}
              value={length} onChange={setLength}
              placeholder={lenUnit === "m" ? "10" : lenUnit === "mm" ? "10000" : lenUnit === "ft" ? "32.8" : "1000"} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m", "mm", "cm", "ft"] as LenUnit[]).map(u => (
                <Btn key={u} label={u} active={lenUnit === u} onClick={() => {
                  const si = parseFloat(length) * toLm[lenUnit];
                  setLenUnit(u);
                  if (!isNaN(si)) setLength(fmt(si / toLm[u]));
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
        const dhMm = result.hydraulicDiameter * 1000;
        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Hydraulic diameter  D<sub>h</sub> = 4A / P
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  D<sub>h</sub> = {fmt(dhMm, 5)} mm
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  {fmt(result.hydraulicDiameter, 4)} m
                </p>
              </div>

              {/* Geometry grid */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Geometry</p>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    ["A (m²)",    fmt(result.area, 4)],
                    ["P (m)",     fmt(result.wettedPerimeter, 4)],
                    ["Dh (mm)",   fmt(dhMm, 4)],
                    ["Rh (mm)",   fmt(result.hydraulicRadius * 1000, 4)],
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                      <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related quantities */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Flow quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "Re",          value: fmt(result.reynoldsNumber, 5) },
                    { label: "f (Darcy)",   value: fmt(result.frictionFactor, 5) },
                    { label: "Q (m³/s)",    value: fmt(result.flowRate, 4)       },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Head loss (if L provided) */}
              {result.headLoss !== undefined && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Head loss over {length} {lenUnit}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    hL = {fmt(result.headLoss, 5)} m
                  </p>
                </div>
              )}

              {/* Regime banner */}
              <div className={`p-4 rounded-lg border ${regimeBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  Flow Regime: {result.regime.charAt(0).toUpperCase() + result.regime.slice(1)}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.nonCircularDuct} />
              <CommonMistakes mistakes={commonMistakes.nonCircularDuct} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Hydraulic diameter and radius:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>D<sub>h</sub> = 4A / P&nbsp;&nbsp;&nbsp;&nbsp;[m]</div>
              <div>R<sub>h</sub> = A / P = D<sub>h</sub> / 4&nbsp;&nbsp;&nbsp;&nbsp;[m]</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              D<sub>h</sub> replaces D in Re = ρVD<sub>h</sub>/μ and Darcy-Weisbach hL = f(L/D<sub>h</sub>)V²/2g.
              For a circular pipe, D<sub>h</sub> = D exactly.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Shape formulas:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Shape</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Area A</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Perimeter P</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">D<sub>h</sub></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 font-mono text-xs">
                <tr><td className="py-1.5 pr-4 font-sans">Rectangular a×b</td><td className="py-1.5 pr-4">ab</td><td className="py-1.5 pr-4">2(a+b)</td><td className="py-1.5">2ab/(a+b)</td></tr>
                <tr><td className="py-1.5 pr-4 font-sans">Square a×a</td><td className="py-1.5 pr-4">a²</td><td className="py-1.5 pr-4">4a</td><td className="py-1.5">a</td></tr>
                <tr><td className="py-1.5 pr-4 font-sans">Circular D</td><td className="py-1.5 pr-4">πD²/4</td><td className="py-1.5 pr-4">πD</td><td className="py-1.5">D</td></tr>
                <tr><td className="py-1.5 pr-4 font-sans">Annular D₁,D₂</td><td className="py-1.5 pr-4">π(D₁²−D₂²)/4</td><td className="py-1.5 pr-4">π(D₁+D₂)</td><td className="py-1.5">D₁−D₂</td></tr>
                <tr><td className="py-1.5 pr-4 font-sans">Parallel plates H×W</td><td className="py-1.5 pr-4">HW</td><td className="py-1.5 pr-4">2(H+W)</td><td className="py-1.5">2HW/(H+W)</td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Laminar f×Re for common shapes:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Shape</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">f × Re</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ["Circular",                   "64.0"],
                  ["Square",                     "56.9"],
                  ["Rectangular a:b = 2",        "62.2"],
                  ["Rectangular a:b = 4",        "73.0"],
                  ["Rectangular a:b = 8",        "82.3"],
                  ["Parallel plates (infinite)", "96.0"],
                ].map(([shape, val]) => (
                  <tr key={shape}>
                    <td className="py-1.5 pr-4">{shape}</td>
                    <td className="py-1.5 font-mono">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This calculator uses f = 64/Re (circular pipe approximation) for all laminar flows.
              For non-circular shapes use the exact f×Re value from the table above.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Darcy-Weisbach with D<sub>h</sub>:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              hL = f × (L / D<sub>h</sub>) × V² / (2g)&nbsp;&nbsp;&nbsp;&nbsp;[m]
            </div>
          </div>
        </div>
      </Card>

      <References refs={REFS_NON_CIRCULAR_DUCT} />
    </div>
  );
}
