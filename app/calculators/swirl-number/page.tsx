"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_SWIRL_NUMBER } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateSwirlNumber,
  generateSwirlNumberSteps,
  commonAssumptions,
  commonMistakes,
  type SwirlMode,
  type SwirlProfile,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit = "m" | "mm" | "cm" | "inch";
type VelUnit = "m/s" | "ft/s" | "km/h";

const toLm:  Record<LenUnit, number> = { m: 1, mm: 1e-3, cm: 1e-2, inch: 0.0254 };
const toMS:  Record<VelUnit, number> = { "m/s": 1, "ft/s": 0.3048, "km/h": 1/3.6 };

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

export default function SwirlNumberCalculator() {
  const [mode,       setMode]       = useState<SwirlMode>("velocity");

  // Shared
  const [radius,     setRadius]     = useState("50");
  const [radUnit,    setRadUnit]    = useState<LenUnit>("mm");

  // Direct mode
  const [Gtheta,     setGtheta]     = useState("0.5");
  const [Gx,         setGx]         = useState("100");

  // Velocity mode
  const [Vx,         setVx]         = useState("10");
  const [Vth,        setVth]        = useState("5");
  const [velUnit,    setVelUnit]    = useState<VelUnit>("m/s");
  const [profile,    setProfile]    = useState<SwirlProfile>("solidBody");

  // Vane mode
  const [vaneAngle,  setVaneAngle]  = useState("30");
  const [innerRad,   setInnerRad]   = useState("15");
  const [innerUnit,  setInnerUnit]  = useState<LenUnit>("mm");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateSwirlNumber> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateSwirlNumberSteps> | null>(null);

  const handleClear = () => {
    setMode("velocity");
    setRadius("");
    setRadUnit("mm");
    setGtheta("");
    setGx("");
    setVx("");
    setVth("");
    setVelUnit("m/s");
    setProfile("solidBody");
    setVaneAngle("");
    setInnerRad("");
    setInnerUnit("mm");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const rRaw = parseFloat(radius);
    if (isNaN(rRaw) || rRaw <= 0) newErrors.radius = "Must be a positive number";

    if (mode === "direct") {
      const gth = parseFloat(Gtheta), gx = parseFloat(Gx);
      if (isNaN(gth))          newErrors.Gtheta = "Must be a number";
      if (isNaN(gx) || gx===0) newErrors.Gx     = "Must be a non-zero number";
    } else if (mode === "velocity") {
      const vxV = parseFloat(Vx), vthV = parseFloat(Vth);
      if (isNaN(vxV) || vxV <= 0) newErrors.Vx  = "Must be positive";
      if (isNaN(vthV)|| vthV < 0) newErrors.Vth = "Must be non-negative";
    } else {
      const ang = parseFloat(vaneAngle), ri = parseFloat(innerRad);
      if (isNaN(ang) || ang <= 0 || ang >= 90) newErrors.vaneAngle = "Must be between 0 and 90°";
      if (isNaN(ri)  || ri  < 0)               newErrors.innerRad  = "Must be ≥ 0";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const rSI = rRaw * toLm[radUnit];

    let extra: Partial<Parameters<typeof calculateSwirlNumber>[0]> = {};
    if (mode === "direct") {
      extra = { angularMomentumFlux: parseFloat(Gtheta), axialMomentumFlux: parseFloat(Gx) };
    } else if (mode === "velocity") {
      extra = {
        axialVelocity:      parseFloat(Vx)  * toMS[velUnit],
        tangentialVelocity: parseFloat(Vth) * toMS[velUnit],
        velocityProfile:    profile,
      };
    } else {
      extra = {
        vaneAngle:   parseFloat(vaneAngle),
        innerRadius: parseFloat(innerRad) * toLm[innerUnit],
      };
    }

    try {
      const input = { mode, radius: rSI, ...extra } as Parameters<typeof calculateSwirlNumber>[0];
      const calc  = calculateSwirlNumber(input);
      const stp   = generateSwirlNumberSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const classBg = (c?: string) => {
    switch (c) {
      case "weak":     return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      case "moderate": return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
      case "strong":   return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      default:         return "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700";
    }
  };

  const profileLabels: Record<SwirlProfile, string> = {
    solidBody:  "Solid-body core (forced vortex) — k = 1/2",
    freeVortex: "Free-vortex profile — k = 1",
    uniform:    "Uniform tangential profile — k = 2/3",
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Swirl Number Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          S = G<sub>θ</sub> / (G<sub>x</sub> × R) — characterises the degree of swirl in
          pipes, burners, and combustors. S &gt; 0.6 indicates a central recirculation zone.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
          Fluid Mechanics II · Specialized
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Mode selector */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Calculation method:</p>
          <div className="flex gap-2">
            <ModeBtn label="Momentum fluxes"    active={mode === "direct"}   onClick={() => setMode("direct")} />
            <ModeBtn label="Velocity profiles"  active={mode === "velocity"} onClick={() => setMode("velocity")} />
            <ModeBtn label="Swirl vane (Beer)"  active={mode === "vane"}     onClick={() => setMode("vane")} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Outer radius — always shown */}
          <div>
            <InputField label="Pipe / duct outer radius" symbol="R" unit={radUnit}
              value={radius} onChange={setRadius}
              placeholder={radUnit === "m" ? "0.05" : radUnit === "cm" ? "5" : radUnit === "inch" ? "1.97" : "50"}
              error={errors.radius} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m", "mm", "cm", "inch"] as LenUnit[]).map(u => (
                <Btn key={u} label={u} active={radUnit === u} onClick={() => {
                  const si = parseFloat(radius) * toLm[radUnit];
                  setRadUnit(u);
                  if (!isNaN(si)) setRadius(fmt(si / toLm[u]));
                }} />
              ))}
            </div>
          </div>

          {/* Direct mode */}
          {mode === "direct" && (
            <>
              <div>
                <InputField label="Angular momentum flux" symbol="Gθ" unit="N·m"
                  value={Gtheta} onChange={setGtheta} error={errors.Gtheta} />
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
                  G<sub>θ</sub> = ∫ ρ u<sub>x</sub> u<sub>θ</sub> r dA
                </p>
              </div>
              <div>
                <InputField label="Axial momentum flux" symbol="Gx" unit="N"
                  value={Gx} onChange={setGx} error={errors.Gx} />
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
                  G<sub>x</sub> = ∫ ρ u<sub>x</sub>² dA
                </p>
              </div>
            </>
          )}

          {/* Velocity mode */}
          {mode === "velocity" && (
            <>
              <div>
                <InputField label="Mean axial velocity" symbol="Vx" unit={velUnit}
                  value={Vx} onChange={setVx}
                  placeholder={velUnit === "m/s" ? "10" : velUnit === "ft/s" ? "32.8" : "36"}
                  error={errors.Vx} />
                <div className="flex flex-wrap gap-2 -mt-2">
                  {(["m/s", "ft/s", "km/h"] as VelUnit[]).map(u => (
                    <Btn key={u} label={u} active={velUnit === u} onClick={() => {
                      const siVx  = parseFloat(Vx)  * toMS[velUnit];
                      const siVth = parseFloat(Vth) * toMS[velUnit];
                      setVelUnit(u);
                      if (!isNaN(siVx))  setVx(fmt(siVx  / toMS[u]));
                      if (!isNaN(siVth)) setVth(fmt(siVth / toMS[u]));
                    }} />
                  ))}
                </div>
              </div>
              <div>
                <InputField label="Tangential velocity at R" symbol="Vθ" unit={velUnit}
                  value={Vth} onChange={setVth} error={errors.Vth} />
              </div>
              <div className="md:col-span-2">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tangential velocity profile (determines shape factor k):
                </p>
                <div className="space-y-2">
                  {(["solidBody", "freeVortex", "uniform"] as SwirlProfile[]).map(p => (
                    <label key={p} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="radio" name="profile" checked={profile === p}
                        onChange={() => setProfile(p)} className="text-blue-600" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {profileLabels[p]}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  S = k × V<sub>θ</sub>(R) / V<sub>x</sub>
                </p>
              </div>
            </>
          )}

          {/* Vane mode */}
          {mode === "vane" && (
            <>
              <div>
                <InputField label="Vane angle from axial" symbol="φ" unit="degrees"
                  value={vaneAngle} onChange={setVaneAngle} error={errors.vaneAngle} />
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
                  Angle of swirl vanes relative to the duct axis. Common range: 20–60°.
                </p>
              </div>
              <div>
                <InputField label="Inner (hub) radius" symbol="ri" unit={innerUnit}
                  value={innerRad} onChange={setInnerRad}
                  placeholder={innerUnit === "m" ? "0.015" : innerUnit === "cm" ? "1.5" : "15"}
                  error={errors.innerRad} />
                <div className="flex flex-wrap gap-2 -mt-2">
                  {(["m", "mm", "cm", "inch"] as LenUnit[]).map(u => (
                    <Btn key={u} label={u} active={innerUnit === u} onClick={() => {
                      const si = parseFloat(innerRad) * toLm[innerUnit];
                      setInnerUnit(u);
                      if (!isNaN(si)) setInnerRad(fmt(si / toLm[u]));
                    }} />
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Set to 0 for solid shaft or open annular swirler.
                </p>
              </div>
            </>
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
        const S = result.swirlNumber;
        const label = result.classification.charAt(0).toUpperCase() + result.classification.slice(1);

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Swirl number  S = G<sub>θ</sub> / (G<sub>x</sub> × R)
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  S = {fmt(S, 5)}
                </p>
                {result.profileFactor !== undefined && (
                  <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                    Profile factor k = {fmt(result.profileFactor, 4)}
                  </p>
                )}
              </div>

              {/* Related quantities */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Related quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {([
                    { label: <>S</>,                                 value: fmt(S, 5) },
                    { label: <>G<sub>θ</sub>/G<sub>x</sub> (m)</>,  value: result.angularMomentumFlux && result.axialMomentumFlux
                        ? fmt(result.angularMomentumFlux / result.axialMomentumFlux, 4)
                        : "—" },
                    { label: <>CRZ</>,                               value: result.hasCRZ ? "Yes (S > 0.6)" : "No (S ≤ 0.6)" },
                  ] as { label: React.ReactNode; value: string }[]).map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Classification banner */}
              <div className={`p-4 rounded-lg border ${classBg(result.classification)}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {label} Swirl (S = {fmt(S, 4)})
                  {result.hasCRZ ? " — Central Recirculation Zone expected" : ""}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.swirlNumber} />
              <CommonMistakes mistakes={commonMistakes.swirlNumber} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Definition:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>S = G<sub>θ</sub> / (G<sub>x</sub> × R)</div>
              <div>G<sub>θ</sub> = ∫ ρ u<sub>x</sub> u<sub>θ</sub> r dA&nbsp;&nbsp;[N·m]</div>
              <div>G<sub>x</sub> = ∫ ρ u<sub>x</sub>² dA&nbsp;&nbsp;[N]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Simplified forms (uniform axial velocity V<sub>x</sub>):</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Profile</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">k</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Formula</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ["Solid-body (ωr)",      "1/2", "S = V_θ(R) / (2V_x)"],
                  ["Free vortex (Γ/2πr)", "1",   "S = V_θ(R) / V_x"],
                  ["Uniform (plug)",       "2/3", "S = 2V_θ / (3V_x)"],
                ].map(([p, k, f]) => (
                  <tr key={p}>
                    <td className="py-1.5 pr-4">{p}</td>
                    <td className="py-1.5 pr-4 font-mono">{k}</td>
                    <td className="py-1.5 font-mono text-xs">{f}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Beer-Chigier swirl vane formula:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>S = (2/3) × tan(φ) × (1 − (r<sub>i</sub>/R)³) / (1 − (r<sub>i</sub>/R)²)</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Valid for axial swirlers with straight flat vanes. φ is the vane angle from the duct axis.
              r<sub>i</sub> = inner hub radius, R = outer radius.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Swirl classification and CRZ:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">S range</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Class</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Behaviour</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ["S < 0.4",       "Weak",     "No recirculation zone, low mixing"],
                  ["0.4 ≤ S ≤ 0.6", "Moderate", "CRZ possible; geometry-dependent"],
                  ["S > 0.6",       "Strong",   "Central recirculation zone (CRZ) forms"],
                ].map(([range, cls, beh]) => (
                  <tr key={range}>
                    <td className="py-1.5 pr-4 font-mono">{range}</td>
                    <td className="py-1.5 pr-4">{cls}</td>
                    <td className="py-1.5 text-xs">{beh}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>S = swirl number (dimensionless)</li>
              <li>G<sub>θ</sub> = angular momentum flux [N·m]</li>
              <li>G<sub>x</sub> = axial momentum flux [N]</li>
              <li>R = outer pipe / duct radius [m]</li>
              <li>u<sub>x</sub>, u<sub>θ</sub> = axial and tangential velocity components [m/s]</li>
              <li>φ = swirl vane angle from duct axis [°]</li>
              <li>r<sub>i</sub> = hub (inner) radius [m]</li>
            </ul>
          </div>
        </div>
      </Card>

      <References refs={REFS_SWIRL_NUMBER} />
    </div>
  );
}
