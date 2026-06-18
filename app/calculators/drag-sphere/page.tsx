"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_DRAG_SPHERE } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateDragSphere,
  generateDragSphereSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type VelUnit  = "m/s" | "ft/s" | "km/h";
type DiamUnit = "m" | "mm" | "cm" | "inch";
type DensUnit = "kg/m³" | "g/cm³";
type ViscUnit = "Pa·s" | "cP";

const toMS:   Record<VelUnit,  number> = { "m/s": 1, "ft/s": 0.3048, "km/h": 1/3.6 };
const toDm:   Record<DiamUnit, number> = { m: 1, mm: 1e-3, cm: 1e-2, inch: 0.0254 };
const toKgM3: Record<DensUnit, number> = { "kg/m³": 1, "g/cm³": 1000 };
const toPas:  Record<ViscUnit, number> = { "Pa·s": 1, "cP": 1e-3 };

const FLUID_PRESETS = [
  { label: "Air at 20°C",   density: "1.204", viscosity: "0.0183", viscUnit: "cP"   as ViscUnit },
  { label: "Air at 100°C",  density: "0.946", viscosity: "0.0218", viscUnit: "cP"   as ViscUnit },
  { label: "Water at 20°C", density: "998",   viscosity: "1.002",  viscUnit: "cP"   as ViscUnit },
  { label: "Seawater",      density: "1025",  viscosity: "1.07",   viscUnit: "cP"   as ViscUnit },
  { label: "Engine oil",    density: "880",   viscosity: "300",    viscUnit: "cP"   as ViscUnit },
] as const;

const CD_PRESETS = [
  { label: "Smooth sphere — Newton regime (Re 10³ – 2×10⁵)",  CD: "0.47" },
  { label: "Smooth sphere — post-critical (Re > 5×10⁵)",      CD: "0.10" },
  { label: "Rough sphere",                                     CD: "0.40" },
  { label: "Stokes creeping flow (Re < 1) — use 24/Re",       CD: "24"   },
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

export default function DragSphereCalculator() {
  const [density,    setDensity]    = useState("1.204");
  const [densUnit,   setDensUnit]   = useState<DensUnit>("kg/m³");
  const [velocity,   setVelocity]   = useState("10");
  const [velUnit,    setVelUnit]    = useState<VelUnit>("m/s");
  const [diameter,   setDiameter]   = useState("50");
  const [diamUnit,   setDiamUnit]   = useState<DiamUnit>("mm");
  const [CD,         setCD]         = useState("0.47");
  const [selectedCD, setSelectedCD] = useState("");
  const [viscosity,  setViscosity]  = useState("0.0183");
  const [viscUnit,   setViscUnit]   = useState<ViscUnit>("cP");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateDragSphere> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateDragSphereSteps> | null>(null);

  const handleClear = () => {
    setDensity("");
    setDensUnit("kg/m³");
    setVelocity("");
    setVelUnit("m/s");
    setDiameter("");
    setDiamUnit("mm");
    setCD("");
    setSelectedCD("");
    setViscosity("");
    setViscUnit("cP");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const rhoRaw = parseFloat(density);
    const vRaw   = parseFloat(velocity);
    const dRaw   = parseFloat(diameter);
    const cdVal  = parseFloat(CD);
    const muRaw  = parseFloat(viscosity);

    if (isNaN(rhoRaw) || rhoRaw <= 0) newErrors.density  = "Must be a positive number";
    if (isNaN(vRaw)   || vRaw   <  0) newErrors.velocity = "Must be non-negative";
    if (isNaN(dRaw)   || dRaw   <= 0) newErrors.diameter = "Must be a positive number";
    if (isNaN(cdVal)  || cdVal  <= 0) newErrors.CD       = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const rhoSI = rhoRaw * toKgM3[densUnit];
    const vSI   = vRaw   * toMS[velUnit];
    const dSI   = dRaw   * toDm[diamUnit];
    const muSI  = (!isNaN(muRaw) && muRaw > 0) ? muRaw * toPas[viscUnit] : undefined;

    try {
      const input = { density: rhoSI, velocity: vSI, diameter: dSI, dragCoefficient: cdVal, viscosity: muSI };
      const calc  = calculateDragSphere(input);
      const stp   = generateDragSphereSteps(input, calc);
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
          Drag on Sphere Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Drag force on a sphere using F<sub>D</sub> = C<sub>D</sub> × ½ρV² × A.
          Viscosity is optional — used only to compute Re for C<sub>D</sub> regime verification.
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Fluid density */}
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

          {/* Velocity */}
          <div>
            <InputField label="Flow velocity" symbol="V" unit={velUnit}
              value={velocity} onChange={setVelocity} error={errors.velocity} />
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

          {/* Diameter */}
          <div>
            <InputField label="Sphere diameter" symbol="D" unit={diamUnit}
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

          {/* CD + preset dropdown */}
          <div>
            <InputField label="Drag coefficient" symbol="CD" unit="dimensionless"
              value={CD} onChange={setCD} error={errors.CD} />
            <div className="flex items-center gap-2 -mt-2">
              <select
                value={selectedCD}
                onChange={(e) => {
                  const lbl = e.target.value;
                  setSelectedCD(lbl);
                  const p = CD_PRESETS.find(x => x.label === lbl);
                  if (p) setCD(p.CD);
                }}
                className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sphere C<sub>D</sub> preset…</option>
                {CD_PRESETS.map(p => (
                  <option key={p.label} value={p.label}>
                    {p.label} — C<sub>D</sub> = {p.CD}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Viscosity — optional */}
          <div className="md:col-span-2">
            <div className="max-w-sm">
              <InputField label="Dynamic viscosity (optional — for Re check)" symbol="μ" unit={viscUnit}
                value={viscosity} onChange={setViscosity}
                placeholder={viscUnit === "Pa·s" ? "0.0000183" : "0.0183"} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["Pa·s", "cP"] as ViscUnit[]).map(u => (
                  <Btn key={u} label={u} active={viscUnit === u} onClick={() => {
                    const si = parseFloat(viscosity) * toPas[viscUnit];
                    setViscUnit(u);
                    if (!isNaN(si)) setViscosity(fmt(si / toPas[u]));
                  }} />
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                If provided, Re is computed and shown to verify whether the entered C<sub>D</sub> is appropriate.
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

      {/* Results */}
      {result && steps && (() => {
        const FD = result.dragForce;
        const fUnits: [string, number][] = [
          ["N",   FD],
          ["kN",  FD / 1000],
          ["lbf", FD / 4.44822],
          ["kgf", FD / 9.80665],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Drag force  F<sub>D</sub> = C<sub>D</sub> × ½ρV² × A
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {fmt(FD, 5)} N
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  {fmt(FD / 4.44822, 4)} lbf
                </p>
              </div>

              {/* Unit grid */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Drag force in other units
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {fUnits.map(([unit, value]) => (
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
                    { label: <>Projected area  A</>,         value: `${fmt(result.projectedArea, 4)} m²`      },
                    { label: <>Dynamic pressure  ½ρV²</>,    value: `${fmt(result.dynamicPressure, 4)} Pa`    },
                    { label: <>Reynolds number  Re</>,       value: result.reynoldsNumber !== undefined ? fmt(result.reynoldsNumber, 4) : "—  (enter μ)" },
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
              <AssumptionsList assumptions={commonAssumptions.dragSphere} />
              <CommonMistakes mistakes={commonMistakes.dragSphere} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Drag force equation:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>F<sub>D</sub> = C<sub>D</sub> × ½ρV² × A&nbsp;&nbsp;&nbsp;&nbsp;[N]</div>
              <div>A = π(D/2)²&nbsp;&nbsp;&nbsp;&nbsp;(projected frontal area)</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">C<sub>D</sub> for a sphere — flow regime dependence:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Regime</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Re range</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">C<sub>D</sub></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ["Stokes (creeping flow)",      "Re < 0.5",           "24 / Re"],
                  ["Intermediate",                "0.5 – 1 000",        "≈ 24/Re + 6/(1+√Re) + 0.4"],
                  ["Newton (turbulent wake)",     "1 000 – 2×10⁵",     "≈ 0.44 – 0.47"],
                  ["Post-critical (turbulent b.l.)", "Re > 5×10⁵",     "≈ 0.10 – 0.20"],
                ].map(([regime, re, cd]) => (
                  <tr key={regime}>
                    <td className="py-1.5 pr-4">{regime}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{re}</td>
                    <td className="py-1.5 font-mono text-xs">{cd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              The sharp drop in C<sub>D</sub> at Re ≈ 5×10⁵ is the drag crisis — the boundary layer
              transitions to turbulent, delaying separation and reducing the wake.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Reynolds number:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              Re = ρ × V × D / μ
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Enter viscosity μ to compute Re and verify that the selected C<sub>D</sub> is appropriate
              for the flow regime.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>F<sub>D</sub> = drag force [N]</li>
              <li>C<sub>D</sub> = drag coefficient (depends on Re and surface roughness)</li>
              <li>ρ = fluid density [kg/m³]</li>
              <li>V = free-stream velocity [m/s]</li>
              <li>A = projected frontal area = π(D/2)² [m²]</li>
              <li>μ = dynamic viscosity [Pa·s] (optional, for Re check)</li>
            </ul>
          </div>

          <p>
            Drag force scales with V² — doubling velocity quadruples drag. The projected area for a
            sphere is always the circle π(D/2)², regardless of orientation.
          </p>
        </div>
      </Card>

      <References refs={REFS_DRAG_SPHERE} />
    </div>
  );
}
