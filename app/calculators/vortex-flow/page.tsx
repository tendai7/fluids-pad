"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_VORTEX_FLOW } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateVortexFlow,
  generateVortexFlowSteps,
  commonAssumptions,
  commonMistakes,
  type VortexType,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit  = "m" | "mm" | "cm" | "ft";
type VelUnit  = "m/s" | "ft/s" | "km/h";
type DensUnit = "kg/m³" | "g/cm³";
type PresUnit = "Pa" | "kPa" | "bar" | "psi";

const toLm:   Record<LenUnit,  number> = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048 };
const toMS:   Record<VelUnit,  number> = { "m/s": 1, "ft/s": 0.3048, "km/h": 1/3.6 };
const toKgM3: Record<DensUnit, number> = { "kg/m³": 1, "g/cm³": 1000 };

const FLUID_PRESETS = [
  { label: "Water at 20°C",  density: "998"   },
  { label: "Air at 20°C",    density: "1.204" },
  { label: "Seawater",       density: "1025"  },
] as const;

const VORTEX_TYPES: { type: VortexType; label: string; desc: string; examples: string }[] = [
  {
    type: "free",
    label: "Free (Irrotational)",
    desc: "Vθ = Γ / (2πr) — decreases with r",
    examples: "Bathtub drain, tornado outer region, aircraft wake",
  },
  {
    type: "forced",
    label: "Forced (Rigid Body)",
    desc: "Vθ = ωr — increases with r",
    examples: "Rotating cup, centrifuge, tornado inner core",
  },
  {
    type: "rankine",
    label: "Rankine (Combined)",
    desc: "Forced core + free outer — realistic model",
    examples: "Tropical cyclone, realistic vortex tubes, dust devils",
  },
];

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

export default function VortexFlowCalculator() {
  const [vortexType,  setVortexType]  = useState<VortexType>("free");

  // Shared
  const [radius,     setRadius]     = useState("1");
  const [radUnit,    setRadUnit]    = useState<LenUnit>("m");
  const [density,    setDensity]    = useState("998");
  const [densUnit,   setDensUnit]   = useState<DensUnit>("kg/m³");

  // Free vortex
  const [freeInputMode, setFreeInputMode] = useState<"gamma" | "refVel">("refVel");
  const [gamma,      setGamma]      = useState("6.283"); // Γ [m²/s]
  const [refRadius,  setRefRadius]  = useState("0.5");
  const [refVel,     setRefVel]     = useState("2");
  const [refVelUnit, setRefVelUnit] = useState<VelUnit>("m/s");
  const [refRadUnit, setRefRadUnit] = useState<LenUnit>("m");

  // Forced vortex
  const [omegaMode,  setOmegaMode]  = useState<"rads" | "rpm">("rpm");
  const [omega,      setOmega]      = useState("60");   // rad/s or rpm

  // Rankine vortex
  const [coreRadius, setCoreRadius] = useState("0.5");
  const [coreRadUnit,setCoreRadUnit]= useState<LenUnit>("m");
  const [maxVel,     setMaxVel]     = useState("5");
  const [maxVelUnit, setMaxVelUnit] = useState<VelUnit>("m/s");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateVortexFlow> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateVortexFlowSteps> | null>(null);

  const handleClear = () => {
    setVortexType("free");
    setRadius("");
    setRadUnit("m");
    setDensity("");
    setDensUnit("kg/m³");
    setFreeInputMode("refVel");
    setGamma("");
    setRefRadius("");
    setRefVel("");
    setRefVelUnit("m/s");
    setRefRadUnit("m");
    setOmegaMode("rpm");
    setOmega("");
    setCoreRadius("");
    setCoreRadUnit("m");
    setMaxVel("");
    setMaxVelUnit("m/s");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const rRaw   = parseFloat(radius);
    const rhoRaw = parseFloat(density);

    if (isNaN(rRaw)   || rRaw   <= 0) newErrors.radius  = "Must be a positive number";
    if (isNaN(rhoRaw) || rhoRaw <= 0) newErrors.density = "Must be a positive number";

    const rSI   = rRaw   * toLm[radUnit];
    const rhoSI = rhoRaw * toKgM3[densUnit];

    let extraInput: Partial<Parameters<typeof calculateVortexFlow>[0]> = {};

    if (vortexType === "free") {
      if (freeInputMode === "gamma") {
        const gRaw = parseFloat(gamma);
        if (isNaN(gRaw) || gRaw <= 0) newErrors.gamma = "Must be a positive number";
        else extraInput = { circulation: gRaw, refRadius: 1 };
      } else {
        const r0Raw = parseFloat(refRadius);
        const v0Raw = parseFloat(refVel);
        if (isNaN(r0Raw) || r0Raw <= 0) newErrors.refRadius = "Must be a positive number";
        if (isNaN(v0Raw) || v0Raw <= 0) newErrors.refVel    = "Must be a positive number";
        else extraInput = { refRadius: r0Raw * toLm[refRadUnit], refVelocity: v0Raw * toMS[refVelUnit] };
      }
    } else if (vortexType === "forced") {
      const wRaw = parseFloat(omega);
      if (isNaN(wRaw) || wRaw <= 0) newErrors.omega = "Must be a positive number";
      else {
        const wSI = omegaMode === "rpm" ? wRaw * 2 * Math.PI / 60 : wRaw;
        extraInput = { angularVelocity: wSI };
      }
    } else {
      const rcRaw = parseFloat(coreRadius);
      const vmRaw = parseFloat(maxVel);
      if (isNaN(rcRaw) || rcRaw <= 0) newErrors.coreRadius = "Must be a positive number";
      if (isNaN(vmRaw) || vmRaw <= 0) newErrors.maxVel     = "Must be a positive number";
      else extraInput = { coreRadius: rcRaw * toLm[coreRadUnit], maxVelocity: vmRaw * toMS[maxVelUnit] };
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = { vortexType, radius: rSI, density: rhoSI, ...extraInput };
      const calc  = calculateVortexFlow(input as Parameters<typeof calculateVortexFlow>[0]);
      const stp   = generateVortexFlowSteps(input as Parameters<typeof calculateVortexFlow>[0], calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const regionBg = result?.region === "core"
    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
    : result?.region === "outer"
    ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Vortex Flow Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Tangential velocity, pressure, and surface profile for free, forced, and Rankine
          combined vortex flows at a specified radius.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
          Fluid Mechanics II · Specialized
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

        {/* Vortex type selector */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Vortex type:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {VORTEX_TYPES.map(({ type, label, desc, examples }) => (
              <button key={type} onClick={() => setVortexType(type)}
                className={`p-3 rounded-lg border text-left transition-colors ${vortexType === type
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
                <div className="font-medium text-sm">{label}</div>
                <div className={`text-xs mt-0.5 ${vortexType === type ? "text-blue-200" : "text-gray-500 dark:text-gray-400"}`}>{desc}</div>
                <div className={`text-xs mt-1 italic ${vortexType === type ? "text-blue-100" : "text-gray-400 dark:text-gray-500"}`}>{examples}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Query radius — always shown */}
          <div>
            <InputField label="Query radius" symbol="r" unit={radUnit}
              value={radius} onChange={setRadius}
              placeholder={radUnit === "m" ? "1" : radUnit === "mm" ? "1000" : radUnit === "ft" ? "3.28" : "100"}
              error={errors.radius} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m", "mm", "cm", "ft"] as LenUnit[]).map(u => (
                <Btn key={u} label={u} active={radUnit === u} onClick={() => {
                  const si = parseFloat(radius) * toLm[radUnit];
                  setRadUnit(u);
                  if (!isNaN(si)) setRadius(fmt(si / toLm[u]));
                }} />
              ))}
            </div>
          </div>

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

          {/* Free vortex inputs */}
          {vortexType === "free" && (
            <>
              <div className="md:col-span-2">
                <div className="flex gap-2 mb-3">
                  <Btn label="Enter Γ (circulation)"     active={freeInputMode === "gamma"}  onClick={() => setFreeInputMode("gamma")} />
                  <Btn label="Enter Vθ at reference r₀" active={freeInputMode === "refVel"} onClick={() => setFreeInputMode("refVel")} />
                </div>
                {freeInputMode === "gamma" ? (
                  <div className="max-w-xs">
                    <InputField label="Circulation" symbol="Γ" unit="m²/s"
                      value={gamma} onChange={setGamma} error={errors.gamma} />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <InputField label="Reference radius" symbol="r₀" unit={refRadUnit}
                        value={refRadius} onChange={setRefRadius}
                        placeholder={refRadUnit === "m" ? "0.5" : "500"}
                        error={errors.refRadius} />
                      <div className="flex flex-wrap gap-2 -mt-2">
                        {(["m", "mm", "cm", "ft"] as LenUnit[]).map(u => (
                          <Btn key={u} label={u} active={refRadUnit === u} onClick={() => {
                            const si = parseFloat(refRadius) * toLm[refRadUnit];
                            setRefRadUnit(u);
                            if (!isNaN(si)) setRefRadius(fmt(si / toLm[u]));
                          }} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <InputField label="Vθ at r₀" symbol="Vθ₀" unit={refVelUnit}
                        value={refVel} onChange={setRefVel} error={errors.refVel} />
                      <div className="flex flex-wrap gap-2 -mt-2">
                        {(["m/s", "ft/s", "km/h"] as VelUnit[]).map(u => (
                          <Btn key={u} label={u} active={refVelUnit === u} onClick={() => {
                            const si = parseFloat(refVel) * toMS[refVelUnit];
                            setRefVelUnit(u);
                            if (!isNaN(si)) setRefVel(fmt(si / toMS[u]));
                          }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Pressure is referenced to the entry radius r₀. Free vortex: Γ = 2πr₀V<sub>θ₀</sub> = constant.
                </p>
              </div>
            </>
          )}

          {/* Forced vortex inputs */}
          {vortexType === "forced" && (
            <div>
              <div className="flex gap-2 mb-3">
                <Btn label="rad/s" active={omegaMode === "rads"} onClick={() => {
                  if (omegaMode === "rpm") {
                    const si = parseFloat(omega) * 2 * Math.PI / 60;
                    setOmegaMode("rads");
                    if (!isNaN(si)) setOmega(fmt(si));
                  }
                }} />
                <Btn label="rpm" active={omegaMode === "rpm"} onClick={() => {
                  if (omegaMode === "rads") {
                    const si = parseFloat(omega) * 60 / (2 * Math.PI);
                    setOmegaMode("rpm");
                    if (!isNaN(si)) setOmega(fmt(si));
                  }
                }} />
              </div>
              <InputField
                label="Angular velocity"
                symbol="ω"
                unit={omegaMode === "rpm" ? "rpm" : "rad/s"}
                value={omega} onChange={setOmega}
                placeholder={omegaMode === "rpm" ? "60" : "6.28"}
                error={errors.omega} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
                Pressure referenced to r = 0 (axis). Free surface: parabolic z = ω²r²/(2g).
              </p>
            </div>
          )}

          {/* Rankine vortex inputs */}
          {vortexType === "rankine" && (
            <>
              <div>
                <InputField label="Core radius" symbol="rc" unit={coreRadUnit}
                  value={coreRadius} onChange={setCoreRadius}
                  placeholder={coreRadUnit === "m" ? "0.5" : "500"}
                  error={errors.coreRadius} />
                <div className="flex flex-wrap gap-2 -mt-2">
                  {(["m", "mm", "cm", "ft"] as LenUnit[]).map(u => (
                    <Btn key={u} label={u} active={coreRadUnit === u} onClick={() => {
                      const si = parseFloat(coreRadius) * toLm[coreRadUnit];
                      setCoreRadUnit(u);
                      if (!isNaN(si)) setCoreRadius(fmt(si / toLm[u]));
                    }} />
                  ))}
                </div>
              </div>
              <div>
                <InputField label="Max tangential velocity (at rc)" symbol="Vθ_max" unit={maxVelUnit}
                  value={maxVel} onChange={setMaxVel} error={errors.maxVel} />
                <div className="flex flex-wrap gap-2 -mt-2">
                  {(["m/s", "ft/s", "km/h"] as VelUnit[]).map(u => (
                    <Btn key={u} label={u} active={maxVelUnit === u} onClick={() => {
                      const si = parseFloat(maxVel) * toMS[maxVelUnit];
                      setMaxVelUnit(u);
                      if (!isNaN(si)) setMaxVel(fmt(si / toMS[u]));
                    }} />
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  V<sub>θ,max</sub> occurs at the core boundary r = rc.
                  Pressure referenced to centre (r = 0).
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
        const pUnits: [string, number][] = [
          ["Pa",  result.pressureRise],
          ["kPa", result.pressureRise / 1000],
          ["bar", result.pressureRise / 1e5],
          ["psi", result.pressureRise / 6894.76],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary — tangential velocity */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Tangential velocity at r
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  V<sub>θ</sub> = {fmt(result.tangentialVelocity, 5)} m/s
                </p>
                {result.circulation && (
                  <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                    Γ = {fmt(result.circulation, 4)} m²/s
                  </p>
                )}
              </div>

              {/* Pressure unit grid */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Pressure rise ΔP from reference
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {pUnits.map(([unit, value]) => (
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
                    { label: <>ω<sub>local</sub> (rad/s)</>,  value: fmt(result.angularVelocityLocal, 4) },
                    { label: <>Centripetal acc. (m/s²)</>,     value: fmt(result.centripetalAccel, 4)    },
                    { label: <>Surface z (m)</>,               value: result.surfaceElevation !== undefined ? fmt(result.surfaceElevation, 4) : "—" },
                  ] as { label: React.ReactNode; value: string }[]).map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Region / interpretation banner */}
              <div className={`p-4 rounded-lg border ${regionBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {result.region === "core" ? "Core region (forced vortex behaviour)" :
                   result.region === "outer" ? "Outer region (free vortex behaviour)" :
                   VORTEX_TYPES.find(v => v.type === vortexType)?.label + " vortex"}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.vortexFlow} />
              <CommonMistakes mistakes={commonMistakes.vortexFlow} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Free (irrotational) vortex:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>V<sub>θ</sub> = Γ / (2πr)&nbsp;&nbsp;&nbsp;&nbsp;(velocity decreases outward)</div>
              <div>Γ = 2π × r × V<sub>θ</sub> = constant</div>
              <div>ΔP = ½ρ(V<sub>θ₀</sub>² − V<sub>θ</sub>²)&nbsp;&nbsp;(relative to r₀)</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Irrotational (zero vorticity) everywhere except r = 0. Pressure is lowest at the centre.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Forced (rigid-body) vortex:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>V<sub>θ</sub> = ω × r&nbsp;&nbsp;&nbsp;&nbsp;(velocity increases linearly)</div>
              <div>ΔP = ½ρω²r²&nbsp;&nbsp;&nbsp;&nbsp;(relative to r = 0)</div>
              <div>Surface: z = ω²r² / (2g)&nbsp;&nbsp;&nbsp;&nbsp;(paraboloid)</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Rotational — vorticity = 2ω. Free surface forms a paraboloid of revolution.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Rankine combined vortex:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>r ≤ rc:&nbsp;&nbsp;V<sub>θ</sub> = V<sub>θ,max</sub> × r / rc&nbsp;&nbsp;&nbsp;&nbsp;(core — forced)</div>
              <div>r &gt; rc:&nbsp;&nbsp;V<sub>θ</sub> = V<sub>θ,max</sub> × rc / r&nbsp;&nbsp;&nbsp;&nbsp;(outer — free)</div>
              <div>ΔP(r ≤ rc) = ½ρV<sub>θ,max</sub>² (r/rc)²</div>
              <div>ΔP(r &gt; rc) = ½ρV<sub>θ,max</sub>² (2 − rc²/r²)</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              V<sub>θ</sub> is maximum at r = rc. The Rankine model avoids the singularity at r = 0 of the pure free vortex.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Comparison:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Property</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Free</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Forced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {([
                  { prop: <>V<sub>θ</sub> vs r</>,          free: "∝ 1/r (decreases)",              forced: "∝ r (increases)"             },
                  { prop: "Vorticity",                       free: "0 (irrotational)",                forced: "2ω (rotational)"             },
                  { prop: <>Γ = 2πr·V<sub>θ</sub></>,       free: "Constant",                        forced: "∝ r² (varies)"               },
                  { prop: "Pressure min",                    free: "At centre (lowest)",              forced: "At centre (lowest)"          },
                  { prop: "Singularity",                     free: "At r = 0",                        forced: "None"                        },
                  { prop: "Energy",                          free: "Conserved along streamlines",     forced: "External input required"     },
                ] as { prop: React.ReactNode; free: string; forced: string }[]).map(({ prop, free, forced }, i) => (
                  <tr key={i}>
                    <td className="py-1.5 pr-4 font-medium">{prop}</td>
                    <td className="py-1.5 pr-4 text-xs">{free}</td>
                    <td className="py-1.5 text-xs">{forced}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <References refs={REFS_VORTEX_FLOW} />
    </div>
  );
}
