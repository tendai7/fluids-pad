"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_STOKES_LAW } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateStokesLaw,
  generateStokesLawSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type ViscUnit  = "Pa·s" | "cP" | "mPa·s";
type VelUnit   = "m/s" | "mm/s" | "cm/s";
type DiamUnit  = "m" | "mm" | "cm" | "μm";
type DensUnit  = "kg/m³" | "g/cm³";

const toPas:  Record<ViscUnit,  number> = { "Pa·s": 1, "cP": 1e-3, "mPa·s": 1e-3 };
const toMS:   Record<VelUnit,   number> = { "m/s": 1, "mm/s": 1e-3, "cm/s": 1e-2 };
const toDm:   Record<DiamUnit,  number> = { m: 1, mm: 1e-3, cm: 1e-2, "μm": 1e-6 };
const toKgM3: Record<DensUnit,  number> = { "kg/m³": 1, "g/cm³": 1000 };

// Fluid presets — fills viscosity + fluid density
const FLUID_PRESETS = [
  { label: "Water at 20°C",  viscosity: "1.002",   viscUnit: "cP"   as ViscUnit, density: "998"   },
  { label: "Water at 60°C",  viscosity: "0.467",   viscUnit: "cP"   as ViscUnit, density: "983"   },
  { label: "Air at 20°C",    viscosity: "0.0183",  viscUnit: "cP"   as ViscUnit, density: "1.204" },
  { label: "Glycerin 25°C",  viscosity: "950",     viscUnit: "cP"   as ViscUnit, density: "1261"  },
  { label: "Engine oil",     viscosity: "300",     viscUnit: "cP"   as ViscUnit, density: "880"   },
] as const;

// Particle material density presets
const PARTICLE_PRESETS = [
  { label: "Quartz / sand",    density: "2650" },
  { label: "Calcite",          density: "2710" },
  { label: "Water droplet",    density: "998"  },
  { label: "Iron / steel",     density: "7870" },
  { label: "Alumina",          density: "3970" },
  { label: "Coal dust",        density: "1350" },
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

export default function StokesLawCalculator() {
  // Core inputs
  const [viscosity,    setViscosity]    = useState("1.002");
  const [viscUnit,     setViscUnit]     = useState<ViscUnit>("cP");
  const [velocity,     setVelocity]     = useState("9");
  const [velUnit,      setVelUnit]      = useState<VelUnit>("mm/s");
  const [diameter,     setDiameter]     = useState("100");
  const [diamUnit,     setDiamUnit]     = useState<DiamUnit>("μm");

  // Optional density inputs
  const [fluidDensity,    setFluidDensity]    = useState("998");
  const [fluidDensUnit,   setFluidDensUnit]   = useState<DensUnit>("kg/m³");
  const [particleDensity, setParticleDensity] = useState("2650");
  const [partDensUnit,    setPartDensUnit]    = useState<DensUnit>("kg/m³");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateStokesLaw> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateStokesLawSteps> | null>(null);

  const handleClear = () => {
    setViscosity("");
    setViscUnit("cP");
    setVelocity("");
    setVelUnit("mm/s");
    setDiameter("");
    setDiamUnit("μm");
    setFluidDensity("");
    setFluidDensUnit("kg/m³");
    setParticleDensity("");
    setPartDensUnit("kg/m³");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const muRaw  = parseFloat(viscosity);
    const vRaw   = parseFloat(velocity);
    const dRaw   = parseFloat(diameter);
    const rfRaw  = parseFloat(fluidDensity);
    const rpRaw  = parseFloat(particleDensity);

    if (isNaN(muRaw) || muRaw <= 0) newErrors.viscosity = "Must be a positive number";
    if (isNaN(vRaw)  || vRaw  <  0) newErrors.velocity  = "Must be non-negative";
    if (isNaN(dRaw)  || dRaw  <= 0) newErrors.diameter  = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const muSI  = muRaw * toPas[viscUnit];
    const vSI   = vRaw  * toMS[velUnit];
    const dSI   = dRaw  * toDm[diamUnit];
    const rfSI  = (!isNaN(rfRaw) && rfRaw > 0) ? rfRaw * toKgM3[fluidDensUnit] : undefined;
    const rpSI  = (!isNaN(rpRaw) && rpRaw > 0) ? rpRaw * toKgM3[partDensUnit]  : undefined;

    try {
      const input = { viscosity: muSI, velocity: vSI, diameter: dSI, fluidDensity: rfSI, particleDensity: rpSI };
      const calc  = calculateStokesLaw(input);
      const stp   = generateStokesLawSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const regimeBg = result?.isValidRegime === true
    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
    : result?.isValidRegime === false
    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
    : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Stokes' Law Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Drag force on a sphere in creeping flow (Re &lt; 1). Optionally compute Reynolds number
          and terminal settling velocity from particle and fluid densities.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Mechanics II
        </span>
      </div>

      {/* Fluid presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Common fluids — click to auto-fill viscosity and fluid density
        </h2>
        <div className="flex flex-wrap gap-2">
          {FLUID_PRESETS.map((p) => (
            <button key={p.label}
              onClick={() => {
                setViscosity(p.viscosity); setViscUnit(p.viscUnit);
                setFluidDensity(p.density); setFluidDensUnit("kg/m³");
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
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">1 cP = 1 mPa·s = 0.001 Pa·s</p>
          </div>

          {/* Velocity */}
          <div>
            <InputField label="Particle velocity" symbol="V" unit={velUnit}
              value={velocity} onChange={setVelocity}
              placeholder={velUnit === "m/s" ? "0.009" : velUnit === "cm/s" ? "0.9" : "9"}
              error={errors.velocity} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m/s", "mm/s", "cm/s"] as VelUnit[]).map(u => (
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
            <InputField label="Particle diameter" symbol="D" unit={diamUnit}
              value={diameter} onChange={setDiameter}
              placeholder={diamUnit === "m" ? "0.0001" : diamUnit === "mm" ? "0.1" : diamUnit === "cm" ? "0.01" : "100"}
              error={errors.diameter} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m", "mm", "cm", "μm"] as DiamUnit[]).map(u => (
                <Btn key={u} label={u} active={diamUnit === u} onClick={() => {
                  const si = parseFloat(diameter) * toDm[diamUnit];
                  setDiamUnit(u);
                  if (!isNaN(si)) setDiameter(fmt(si / toDm[u]));
                }} />
              ))}
            </div>
          </div>
        </div>

        {/* Optional density inputs */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
            Optional — fluid and particle densities for Re check and terminal velocity
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Fluid density */}
            <div>
              <InputField label="Fluid density" symbol="ρf" unit={fluidDensUnit}
                value={fluidDensity} onChange={setFluidDensity}
                placeholder={fluidDensUnit === "kg/m³" ? "998" : "0.998"} />
              <div className="flex gap-2 -mt-2">
                {(["kg/m³", "g/cm³"] as DensUnit[]).map(u => (
                  <Btn key={u} label={u} active={fluidDensUnit === u} onClick={() => {
                    const si = parseFloat(fluidDensity) * toKgM3[fluidDensUnit];
                    setFluidDensUnit(u);
                    if (!isNaN(si)) setFluidDensity(fmt(si / toKgM3[u]));
                  }} />
                ))}
              </div>
            </div>

            {/* Particle density */}
            <div>
              <InputField label="Particle density" symbol="ρp" unit={partDensUnit}
                value={particleDensity} onChange={setParticleDensity}
                placeholder={partDensUnit === "kg/m³" ? "2650" : "2.65"} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["kg/m³", "g/cm³"] as DensUnit[]).map(u => (
                  <Btn key={u} label={u} active={partDensUnit === u} onClick={() => {
                    const si = parseFloat(particleDensity) * toKgM3[partDensUnit];
                    setPartDensUnit(u);
                    if (!isNaN(si)) setParticleDensity(fmt(si / toKgM3[u]));
                  }} />
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {PARTICLE_PRESETS.map(p => (
                  <button key={p.label}
                    onClick={() => { setParticleDensity(p.density); setPartDensUnit("kg/m³"); }}
                    className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-600 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-600 transition-colors">
                    {p.label}
                  </button>
                ))}
              </div>
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
          ["mN",  FD * 1000],
          ["μN",  FD * 1e6],
          ["lbf", FD / 4.44822],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Stokes drag force  F<sub>D</sub> = 3πμVD
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {fmt(FD, 5)} N
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  {fmt(FD * 1e6, 4)} μN
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
                    { label: <>Stokes C<sub>D</sub> = 24/Re</>,  value: result.stokesCD !== undefined ? fmt(result.stokesCD, 4) : "— (enter ρf)" },
                    { label: <>Reynolds number  Re</>,            value: result.reynoldsNumber !== undefined ? fmt(result.reynoldsNumber, 4) : "— (enter ρf)" },
                    { label: <>Terminal vel.  V<sub>t</sub></>,   value: result.terminalVelocity !== undefined ? `${fmt(result.terminalVelocity * 1000, 4)} mm/s` : "— (enter ρp)" },
                  ] as { label: React.ReactNode; value: string }[]).map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Regime / validity banner */}
              <div className={`p-4 rounded-lg border ${regimeBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {result.reynoldsNumber !== undefined
                    ? <>Re = {fmt(result.reynoldsNumber, 4)} — {result.isValidRegime ? "Stokes regime valid" : "Outside Stokes regime"}</>
                    : "Validity check"}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.stokesLaw} />
              <CommonMistakes mistakes={commonMistakes.stokesLaw} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Stokes drag force (creeping flow):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              F<sub>D</sub> = 3 × π × μ × V × D&nbsp;&nbsp;&nbsp;&nbsp;[N]
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Equivalent to F<sub>D</sub> = C<sub>D</sub> × ½ρV² × A with C<sub>D</sub> = 24/Re.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Terminal settling velocity:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>V<sub>t</sub> = (ρ<sub>p</sub> − ρ<sub>f</sub>) × g × D² / (18μ)&nbsp;&nbsp;&nbsp;&nbsp;[m/s]</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Obtained by balancing drag, buoyancy, and gravity. Only valid when Re &lt; 1 (verify after computing V<sub>t</sub>).
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Validity condition:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              Re = ρ<sub>f</sub> × V × D / μ &lt; 1
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              For Re between 1 and 1 000, use intermediate drag correlations (e.g. Schiller-Naumann).
              For Re &gt; 1 000, use the drag-sphere calculator with C<sub>D</sub> ≈ 0.47.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>F<sub>D</sub> = Stokes drag force [N]</li>
              <li>μ = dynamic viscosity of fluid [Pa·s]</li>
              <li>V = particle velocity relative to fluid [m/s]</li>
              <li>D = particle (sphere) diameter [m]</li>
              <li>ρ<sub>p</sub>, ρ<sub>f</sub> = particle and fluid density [kg/m³]</li>
              <li>g = gravitational acceleration = 9.81 m/s²</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Common particle densities:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Material</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">ρ (kg/m³)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {PARTICLE_PRESETS.map(({ label, density }) => (
                  <tr key={label}>
                    <td className="py-1.5 pr-4">{label}</td>
                    <td className="py-1.5 font-mono">{density}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            Stokes' law is used in sedimentation analysis, particle sizing (Andreasen pipette),
            centrifugal separation, and aerosol dynamics. Drag force grows linearly with velocity
            (unlike high-Re flow where it grows with V²).
          </p>
        </div>
      </Card>

      <References refs={REFS_STOKES_LAW} />
    </div>
  );
}
