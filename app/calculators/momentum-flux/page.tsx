"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_MOMENTUM_FLUX } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateMomentumFlux,
  generateMomentumFluxSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type InputMode = "velocity" | "flowRate";
type DiamUnit  = "m" | "mm" | "cm" | "inch";
type VelUnit   = "m/s" | "ft/s" | "km/h";
type FlowUnit  = "m³/s" | "L/s" | "L/min" | "m³/h";
type DensUnit  = "kg/m³" | "g/cm³";

const toDm:   Record<DiamUnit, number> = { m: 1, mm: 1e-3, cm: 1e-2, inch: 0.0254 };
const toMS:   Record<VelUnit,  number> = { "m/s": 1, "ft/s": 0.3048, "km/h": 1/3.6 };
const toM3S:  Record<FlowUnit, number> = { "m³/s": 1, "L/s": 1e-3, "L/min": 1/60000, "m³/h": 1/3600 };
const toKgM3: Record<DensUnit, number> = { "kg/m³": 1, "g/cm³": 1000 };

const FLUID_PRESETS = [
  { label: "Water at 20°C",  density: "998"   },
  { label: "Water at 60°C",  density: "983"   },
  { label: "Air at 20°C",    density: "1.204" },
  { label: "Air — sea level",density: "1.225" },
  { label: "Seawater",       density: "1025"  },
] as const;

// Profile type presets — sets β and α
const PROFILE_PRESETS = [
  { label: "Uniform (slug) flow",          beta: 1.000, alpha: 1.000, description: "Ideal/inviscid, or well-mixed flow" },
  { label: "Laminar — parabolic profile",  beta: 1.333, alpha: 2.000, description: "Re < 2 300, fully developed pipe flow" },
  { label: "Turbulent — 1/7 power law",   beta: 1.020, alpha: 1.058, description: "Re > 10 000, fully developed pipe flow" },
  { label: "Custom",                       beta: 1.000, alpha: 1.000, description: "Enter β and α manually below" },
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

export default function MomentumFluxCalculator() {
  const [inputMode,   setInputMode]   = useState<InputMode>("velocity");
  const [diameter,    setDiameter]    = useState("100");
  const [diamUnit,    setDiamUnit]    = useState<DiamUnit>("mm");
  const [velocity,    setVelocity]    = useState("3");
  const [velUnit,     setVelUnit]     = useState<VelUnit>("m/s");
  const [flowRate,    setFlowRate]    = useState("23.6");
  const [flowUnit,    setFlowUnit]    = useState<FlowUnit>("L/s");
  const [density,     setDensity]     = useState("998");
  const [densUnit,    setDensUnit]    = useState<DensUnit>("kg/m³");
  const [selectedProfile, setSelectedProfile] = useState("Uniform (slug) flow");
  const [beta,        setBeta]        = useState("1.0");
  const [alpha,       setAlpha]       = useState("1.0");
  const isCustom = selectedProfile === "Custom";

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateMomentumFlux> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateMomentumFluxSteps> | null>(null);
  const [computedV, setComputedV] = useState<number | null>(null);

  const handleClear = () => {
    setInputMode("velocity");
    setDiameter("");
    setDiamUnit("mm");
    setVelocity("");
    setVelUnit("m/s");
    setFlowRate("");
    setFlowUnit("L/s");
    setDensity("");
    setDensUnit("kg/m³");
    setSelectedProfile("");
    setBeta("");
    setAlpha("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const dRaw   = parseFloat(diameter);
    const vRaw   = parseFloat(velocity);
    const qRaw   = parseFloat(flowRate);
    const rhoRaw = parseFloat(density);
    const betaVal= parseFloat(beta);
    const alphaVal=parseFloat(alpha);

    if (isNaN(dRaw)   || dRaw   <= 0) newErrors.diameter = "Must be a positive number";
    if (isNaN(rhoRaw) || rhoRaw <= 0) newErrors.density  = "Must be a positive number";
    if (inputMode === "velocity" && (isNaN(vRaw) || vRaw < 0))  newErrors.velocity  = "Must be non-negative";
    if (inputMode === "flowRate" && (isNaN(qRaw) || qRaw <= 0)) newErrors.flowRate  = "Must be a positive number";
    if (isCustom) {
      if (isNaN(betaVal) || betaVal < 1)  newErrors.beta  = "β must be ≥ 1";
      if (isNaN(alphaVal)|| alphaVal < 1) newErrors.alpha = "α must be ≥ 1";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const dSI   = dRaw   * toDm[diamUnit];
    const areaSI = Math.PI * (dSI / 2) * (dSI / 2);
    const rhoSI = rhoRaw * toKgM3[densUnit];

    let vSI: number;
    if (inputMode === "velocity") {
      vSI = vRaw * toMS[velUnit];
    } else {
      const qSI = qRaw * toM3S[flowUnit];
      vSI = qSI / areaSI;
    }
    setComputedV(vSI);

    const bVal = isCustom ? betaVal : PROFILE_PRESETS.find(p => p.label === selectedProfile)!.beta;
    const aVal = isCustom ? alphaVal : PROFILE_PRESETS.find(p => p.label === selectedProfile)!.alpha;

    try {
      const input = { velocity: vSI, area: areaSI, density: rhoSI,
        momentumCorrFactor: bVal, energyCorrFactor: aVal };
      const calc  = calculateMomentumFlux(input);
      const stp   = generateMomentumFluxSteps(input, calc);
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
          Momentum Flux Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          J = β × ρAV² = β × ṁV — momentum per unit time through a cross-section.
          Used in control-volume force analysis, jet impingement, and thrust calculations.
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Diameter */}
          <div>
            <InputField label="Pipe / duct diameter" symbol="D" unit={diamUnit}
              value={diameter} onChange={setDiameter}
              placeholder={diamUnit === "m" ? "0.1" : diamUnit === "cm" ? "10" : diamUnit === "inch" ? "3.94" : "100"}
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

          {/* Velocity or Flow Rate — toggled */}
          <div>
            <div className="flex gap-2 mb-3">
              <Btn label="Mean velocity V" active={inputMode === "velocity"} onClick={() => setInputMode("velocity")} />
              <Btn label="Flow rate Q"     active={inputMode === "flowRate"} onClick={() => setInputMode("flowRate")} />
            </div>
            {inputMode === "velocity" ? (
              <>
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
              </>
            ) : (
              <>
                <InputField label="Volumetric flow rate" symbol="Q" unit={flowUnit}
                  value={flowRate} onChange={setFlowRate}
                  placeholder={flowUnit === "m³/s" ? "0.0236" : flowUnit === "L/s" ? "23.6" : flowUnit === "L/min" ? "1416" : "85"}
                  error={errors.flowRate} />
                <div className="flex flex-wrap gap-2 -mt-2">
                  {(["m³/s", "L/s", "L/min", "m³/h"] as FlowUnit[]).map(u => (
                    <Btn key={u} label={u} active={flowUnit === u} onClick={() => {
                      const si = parseFloat(flowRate) * toM3S[flowUnit];
                      setFlowUnit(u);
                      if (!isNaN(si)) setFlowRate(fmt(si / toM3S[u]));
                    }} />
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">V = Q / A is computed automatically.</p>
              </>
            )}
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

          {/* Profile / β α selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Velocity profile (momentum correction factor β)
            </label>
            <div className="space-y-1.5">
              {PROFILE_PRESETS.map((p) => (
                <label key={p.label} className="flex items-start gap-2.5 cursor-pointer">
                  <input type="radio" name="profile"
                    checked={selectedProfile === p.label}
                    onChange={() => {
                      setSelectedProfile(p.label);
                      if (p.label !== "Custom") { setBeta(p.beta.toString()); setAlpha(p.alpha.toString()); }
                    }}
                    className="mt-0.5 text-blue-600" />
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {p.label}
                    </span>
                    {p.label !== "Custom" && (
                      <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                        (β = {p.beta}, α = {p.alpha})
                      </span>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">{p.description}</p>
                  </div>
                </label>
              ))}
            </div>
            {isCustom && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <InputField label="Momentum corr." symbol="β" unit="≥ 1"
                  value={beta} onChange={setBeta} error={errors.beta} />
                <InputField label="Energy corr." symbol="α" unit="≥ 1"
                  value={alpha} onChange={setAlpha} error={errors.alpha} />
              </div>
            )}
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
      {result && steps && computedV !== null && (() => {
        const J  = result.momentumFlux;
        const jUnits: [string, number][] = [
          ["N",   J],
          ["kN",  J / 1000],
          ["lbf", J / 4.44822],
          ["kgf", J / 9.80665],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Momentum flux  J = β × ρAV²
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {fmt(J, 5)} N
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  β = {fmt(result.beta, 4)}&nbsp;&nbsp;|&nbsp;&nbsp;V = {fmt(computedV, 4)} m/s
                </p>
              </div>

              {/* Unit grid */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Momentum flux in other units
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {jUnits.map(([unit, value]) => (
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
                    { label: "ṁ (kg/s)",  value: fmt(result.massFlowRate, 5)               },
                    { label: "Q (L/s)",   value: fmt(result.volumeFlowRate * 1000, 5)       },
                    { label: "Ek (W)",    value: fmt(result.kineticEnergyFlux, 4)           },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Jet impingement note */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">
                  Jet impingement force (stationary flat plate ⊥ to jet)
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  F = J = {fmt(result.jetForce, 5)} N &nbsp;({fmt(result.jetForce / 4.44822, 4)} lbf)
                  &nbsp;— full momentum reversal.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.momentumFlux} />
              <CommonMistakes mistakes={commonMistakes.momentumFlux} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Momentum flux (rate of momentum transport):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>J = β × ṁ × V = β × ρ × A × V²&nbsp;&nbsp;&nbsp;&nbsp;[N]</div>
              <div>ṁ = ρ × A × V&nbsp;&nbsp;&nbsp;&nbsp;[kg/s]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Kinetic energy flux:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              Ek = α × ½ρAV³ = α × ½ṁV²&nbsp;&nbsp;&nbsp;&nbsp;[W]
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Momentum and energy correction factors:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Profile</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">β (momentum)</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">α (energy)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ["Uniform (slug) flow",   "1.000",  "1.000"],
                  ["Laminar — parabolic",   "4/3 = 1.333", "2.000"],
                  ["Turbulent — 1/7 law",  "1.020",  "1.058"],
                ].map(([profile, b, a]) => (
                  <tr key={profile}>
                    <td className="py-1.5 pr-4">{profile}</td>
                    <td className="py-1.5 pr-4 font-mono">{b}</td>
                    <td className="py-1.5 font-mono">{a}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Control-volume momentum equation (x-direction):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              ΣF<sub>x</sub> = J<sub>out</sub> − J<sub>in</sub> = β₂ṁV₂ − β₁ṁV₁
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Includes pressure forces ΣP·A and body forces. For a straight reducing pipe at
              steady state: F<sub>x</sub> + P₁A₁ − P₂A₂ = ṁ(V₂ − V₁).
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>J = momentum flux [N = kg·m/s²]</li>
              <li>β = momentum correction factor (accounts for non-uniform velocity)</li>
              <li>α = kinetic energy correction factor</li>
              <li>ṁ = mass flow rate = ρAV [kg/s]</li>
              <li>V = cross-sectionally averaged (mean) velocity [m/s]</li>
              <li>A = cross-sectional area [m²]</li>
              <li>ρ = fluid density [kg/m³]</li>
            </ul>
          </div>
        </div>
      </Card>

      <References refs={REFS_MOMENTUM_FLUX} />
    </div>
  );
}
