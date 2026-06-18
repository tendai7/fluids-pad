"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { References } from "@/components/References";
import { REFS_REYNOLDS_EXTERNAL } from "@/lib/references";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateReynoldsExternal,
  generateReynoldsExternalSteps,
  commonAssumptions,
  commonMistakes,
  type ReynoldsExternalInput,
  type ExternalGeometry,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

// ── Types ─────────────────────────────────────────────────────────────────────
type DensityUnit   = "kg/m³" | "g/cm³";
type VelocityUnit  = "m/s" | "cm/s" | "ft/s" | "km/h" | "mph";
type LengthUnit    = "m" | "mm" | "cm" | "inch" | "ft";
type ViscosityUnit = "Pa·s" | "mPa·s" | "μPa·s" | "cP" | "kg/(m·s)";
type KinViscUnit   = "m²/s" | "cSt" | "ft²/s";

// ── Unit conversions to SI ────────────────────────────────────────────────────
const toDensitySI   = (v: number, u: DensityUnit):   number => u === "g/cm³"  ? v * 1000      : v;
const toVelocitySI  = (v: number, u: VelocityUnit):  number => {
  if (u === "cm/s")  return v / 100;
  if (u === "ft/s")  return v * 0.3048;
  if (u === "km/h")  return v / 3.6;
  if (u === "mph")   return v * 0.44704;
  return v;
};
const toLengthSI    = (v: number, u: LengthUnit):    number => {
  if (u === "mm")   return v / 1000;
  if (u === "cm")   return v / 100;
  if (u === "inch") return v * 0.0254;
  if (u === "ft")   return v * 0.3048;
  return v;
};
const toViscositySI = (v: number, u: ViscosityUnit): number => {
  if (u === "mPa·s") return v / 1000;
  if (u === "μPa·s") return v / 1e6;
  if (u === "cP")    return v / 1000;
  return v;
};
const toKinViscSI   = (v: number, u: KinViscUnit):   number => {
  if (u === "cSt")   return v * 1e-6;
  if (u === "ft²/s") return v * 0.092903;
  return v;
};

// ── Fluid presets ─────────────────────────────────────────────────────────────
const FLUID_PRESETS = [
  { label: "Air at 20°C",           density: "1.204",  viscosity: "0.00001825" },
  { label: "Air at 60°C",           density: "1.060",  viscosity: "0.00001968" },
  { label: "Water at 20°C",         density: "998",    viscosity: "0.001002"   },
  { label: "Water at 60°C",         density: "983",    viscosity: "0.000467"   },
  { label: "Ethanol at 20°C",       density: "789",    viscosity: "0.001074"   },
  { label: "Glycerin at 25°C",      density: "1261",   viscosity: "0.95"       },
  { label: "Engine oil SAE 30 (25°C)", density: "880",  viscosity: "0.30"       },
] as const;

// ── Geometry config ───────────────────────────────────────────────────────────
const GEOMETRY_OPTIONS: { value: ExternalGeometry; label: string; lengthLabel: string; lengthDesc: string }[] = [
  { value: "flatPlate", label: "Flat Plate",    lengthLabel: "Plate length",      lengthDesc: "Distance from leading edge" },
  { value: "aerofoil",  label: "Aerofoil/Wing", lengthLabel: "Chord length",      lengthDesc: "Stream-wise chord, leading to trailing edge" },
  { value: "cylinder",  label: "Cylinder",      lengthLabel: "Cylinder diameter", lengthDesc: "Outer diameter" },
  { value: "sphere",    label: "Sphere",        lengthLabel: "Sphere diameter",   lengthDesc: "Outer diameter" },
];

function fmt(n: number, sig = 5): string {
  return parseFloat(n.toPrecision(sig)).toString();
}

function fromSILength(m: number, u: LengthUnit): number {
  if (u === "mm")   return m * 1000;
  if (u === "cm")   return m * 100;
  if (u === "inch") return m / 0.0254;
  if (u === "ft")   return m / 0.3048;
  return m;
}

// ── Toggle button ─────────────────────────────────────────────────────────────
function Btn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-sm rounded ${
        active
          ? "bg-blue-500 text-white"
          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
      }`}
    >
      {label}
    </button>
  );
}

// ── Regime colours ────────────────────────────────────────────────────────────
function regimeBg(regime: string): string {
  if (regime === "laminar")      return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
  if (regime === "creeping")     return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
  if (regime === "transitional") return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
  return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
}

function regimeLabel(regime: string, geometry: ExternalGeometry): string {
  if (geometry === "flatPlate") {
    if (regime === "transitional") return "Mixed BL (lam + turb)";
    if (regime === "supercritical") return "Turbulent BL";
  }
  if (regime === "supercritical" && geometry === "aerofoil") return "Turbulent BL";
  return regime.charAt(0).toUpperCase() + regime.slice(1);
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ReynoldsExternalCalculator() {
  const [geometry,     setGeometry]     = useState<ExternalGeometry>("flatPlate");

  const [density,      setDensity]      = useState("1.204");
  const [densityUnit,  setDensityUnit]  = useState<DensityUnit>("kg/m³");

  const [velocity,     setVelocity]     = useState("10");
  const [velocityUnit, setVelocityUnit] = useState<VelocityUnit>("m/s");

  const [length,       setLength]       = useState("1");
  const [lengthUnit,   setLengthUnit]   = useState<LengthUnit>("m");

  const [viscMode,     setViscMode]     = useState<"dynamic" | "kinematic">("dynamic");
  const [viscosity,    setViscosity]    = useState("0.00001825");
  const [viscosityUnit,setViscosityUnit]= useState<ViscosityUnit>("Pa·s");
  const [kinVisc,      setKinVisc]      = useState("15.11");
  const [kinViscUnit,  setKinViscUnit]  = useState<KinViscUnit>("cSt");

  const [xcrUnit,  setXcrUnit]  = useState<LengthUnit>("m");

  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [result,  setResult]  = useState<ReturnType<typeof calculateReynoldsExternal> | null>(null);
  const [steps,   setSteps]   = useState<ReturnType<typeof generateReynoldsExternalSteps> | null>(null);

  const geomConfig = GEOMETRY_OPTIONS.find(g => g.value === geometry)!;

  const applyPreset = (preset: { density: string; viscosity: string }) => {
    const rhoSI = parseFloat(preset.density);
    const muSI  = parseFloat(preset.viscosity);
    setDensityUnit("kg/m³");
    setDensity(preset.density);
    // Convert muSI (Pa·s) to whatever unit is currently selected — don't reset the unit
    const muInUnit = viscosityUnit === "cP" ? muSI * 1000 : muSI;
    setViscosity(parseFloat(muInUnit.toPrecision(4)).toString());
    setKinViscUnit("cSt");
    setKinVisc(parseFloat(((muSI / rhoSI) * 1e6).toPrecision(4)).toString());
  };

  const handleClear = () => {
    setDensity("");       setDensityUnit("kg/m³");
    setVelocity("");      setVelocityUnit("m/s");
    setLength("");        setLengthUnit("m");
    setViscMode("dynamic");
    setViscosity("");     setViscosityUnit("cP");
    setKinVisc("");       setKinViscUnit("cSt");
    setResult(null);      setSteps(null);      setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};

    const rhoVal = parseFloat(density);
    if (isNaN(rhoVal) || rhoVal <= 0) newErrors.density = "Must be a positive number";

    const vVal = parseFloat(velocity);
    if (isNaN(vVal) || vVal < 0) newErrors.velocity = "Must be non-negative";

    const lVal = parseFloat(length);
    if (isNaN(lVal) || lVal <= 0) newErrors.length = "Must be a positive number";

    if (viscMode === "dynamic") {
      const mu = parseFloat(viscosity);
      if (isNaN(mu) || mu <= 0) newErrors.viscosity = "Must be a positive number";
    } else {
      const nu = parseFloat(kinVisc);
      if (isNaN(nu) || nu <= 0) newErrors.kinViscosity = "Must be a positive number";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) { setResult(null); setSteps(null); return; }

    try {
      const rhoSI = toDensitySI(rhoVal, densityUnit);
      const vSI   = toVelocitySI(vVal, velocityUnit);
      const lSI   = toLengthSI(lVal, lengthUnit);

      let muSI: number;
      if (viscMode === "dynamic") {
        muSI = toViscositySI(parseFloat(viscosity), viscosityUnit);
      } else {
        const nuSI = toKinViscSI(parseFloat(kinVisc), kinViscUnit);
        muSI = nuSI * rhoSI;
      }

      const input: ReynoldsExternalInput = {
        density: rhoSI, velocity: vSI, length: lSI, viscosity: muSI, geometry,
      };
      const calcResult = calculateReynoldsExternal(input);
      const calcSteps  = generateReynoldsExternalSteps(input, calcResult);
      setResult(calcResult);
      setSteps(calcSteps);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "An error occurred" });
      setResult(null);
      setSteps(null);
    }
  };

  const lengthPlaceholder =
    lengthUnit === "m"    ? "1"    :
    lengthUnit === "mm"   ? "1000" :
    lengthUnit === "cm"   ? "100"  :
    lengthUnit === "ft"   ? "3.28" : "39.4";

  // length symbol depends on geometry
  const lengthSymbol = geometry === "flatPlate" ? "L" : geometry === "aerofoil" ? "c" : "D";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Reynolds Number — External Flow
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Re = ρVL/μ for flow over{" "}
          <strong className="text-gray-800 dark:text-gray-200">
            flat plates, aerofoils, cylinders, and spheres
          </strong>.
          Determines boundary-layer regime, drag behaviour, and flow separation.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Properties &amp; Statics
        </span>
      </div>

      {/* Geometry selector */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">Geometry</h2>
        <div className="flex flex-wrap gap-2">
          {GEOMETRY_OPTIONS.map(g => (
            <button key={g.value} onClick={() => setGeometry(g.value)}
              className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                geometry === g.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}>
              {g.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {geometry === "flatPlate" && "Characteristic length = plate length L measured from the leading edge."}
          {geometry === "aerofoil"  && <>Characteristic length = chord c. Re<sub>c</sub> determines boundary-layer character, separation bubble formation, and stall type. For lift and drag forces use the Lift Force calculator.</>}
          {geometry === "cylinder"  && "Characteristic length = cylinder outer diameter D (cross-flow orientation)."}
          {geometry === "sphere"    && "Characteristic length = sphere outer diameter D."}
        </p>
      </Card>

      {/* Common fluids */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Common fluids — click to auto-fill density and viscosity
        </h2>
        <div className="flex flex-wrap gap-2">
          {FLUID_PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p)}
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
            <div className="flex gap-2 mb-3" aria-hidden="true">
              <span className="px-3 py-1 text-sm rounded opacity-0 select-none">x</span>
            </div>
            <InputField label="Density" symbol="ρ" unit={densityUnit}
              value={density} onChange={setDensity}
              placeholder={densityUnit === "g/cm³" ? "0.001204" : "1.204"}
              error={errors.density} />
            <div className="flex gap-2 -mt-2">
              {(["kg/m³", "g/cm³"] as DensityUnit[]).map(u => (
                <Btn key={u} label={u} active={densityUnit === u} onClick={() => setDensityUnit(u)} />
              ))}
            </div>
          </div>

          {/* Free-stream velocity */}
          <div>
            <div className="flex gap-2 mb-3" aria-hidden="true">
              <span className="px-3 py-1 text-sm rounded opacity-0 select-none">x</span>
            </div>
            <InputField label="Free-stream velocity" symbol="V∞" unit={velocityUnit}
              value={velocity} onChange={setVelocity} placeholder="10" error={errors.velocity} />
            <div className="flex gap-2 -mt-2">
              {(["m/s", "cm/s", "ft/s", "km/h", "mph"] as VelocityUnit[]).map(u => (
                <Btn key={u} label={u} active={velocityUnit === u} onClick={() => setVelocityUnit(u)} />
              ))}
            </div>
          </div>

          {/* Characteristic length */}
          <div>
            <div className="flex gap-2 mb-3" aria-hidden="true">
              <span className="px-3 py-1 text-sm rounded opacity-0 select-none">x</span>
            </div>
            <InputField
              label={geomConfig.lengthLabel}
              symbol={lengthSymbol}
              unit={lengthUnit}
              value={length}
              onChange={setLength}
              placeholder={lengthPlaceholder}
              error={errors.length}
            />
            <div className="flex flex-wrap gap-2">
              {(["m", "mm", "cm", "inch", "ft"] as LengthUnit[]).map(u => (
                <Btn key={u} label={u} active={lengthUnit === u} onClick={() => setLengthUnit(u)} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{geomConfig.lengthDesc}</p>
          </div>

          {/* Viscosity */}
          <div>
            <div className="flex gap-2 mb-3">
              <Btn label="Dynamic μ"   active={viscMode === "dynamic"}   onClick={() => setViscMode("dynamic")}   />
              <Btn label="Kinematic ν" active={viscMode === "kinematic"} onClick={() => setViscMode("kinematic")} />
            </div>
            {viscMode === "dynamic" ? (
              <>
                <InputField label="Dynamic viscosity" symbol="μ" unit={viscosityUnit}
                  value={viscosity} onChange={setViscosity} error={errors.viscosity} />
                <div className="flex flex-wrap gap-2 -mt-2">
                  {(["Pa·s", "mPa·s", "μPa·s", "cP", "kg/(m·s)"] as ViscosityUnit[]).map(u => (
                    <Btn key={u} label={u} active={viscosityUnit === u} onClick={() => setViscosityUnit(u)} />
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  1 cP = 1 mPa·s = 0.001 Pa·s
                </p>
              </>
            ) : (
              <>
                <InputField label="Kinematic viscosity" symbol="ν" unit={kinViscUnit}
                  value={kinVisc} onChange={setKinVisc} error={errors.kinViscosity} />
                <div className="flex flex-wrap gap-2 -mt-2">
                  {(["m²/s", "cSt", "ft²/s"] as KinViscUnit[]).map(u => (
                    <Btn key={u} label={u} active={kinViscUnit === u} onClick={() => setKinViscUnit(u)} />
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  μ = ν × ρ · 1 cSt = 1 mm²/s = 10⁻⁶ m²/s
                </p>
              </>
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
      {result && steps && (
        <ResultsCard>
          <div className="space-y-4">

            {/* Primary value */}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Reynolds Number</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                Re = {result.reynoldsNumber < 1000
                  ? fmt(result.reynoldsNumber, 4)
                  : Math.round(result.reynoldsNumber).toLocaleString()}
              </p>
            </div>

            {/* Regime badge */}
            <div className={`p-4 rounded-lg border ${regimeBg(result.regime)}`}>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">
                Flow Regime: {regimeLabel(result.regime, geometry)}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: result.interpretation }} />
            </div>

            {/* Transition panel — flat plate and aerofoil */}
            {(geometry === "flatPlate" || geometry === "aerofoil") && result.criticalLength !== undefined && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  {geometry === "aerofoil" ? "BL transition on chord" : "Flat-plate transition"}
                </p>
                <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      {geometry === "aerofoil" ? <>x<sub>tr</sub></> : <>x<sub>cr</sub></>}
                    </p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(fromSILength(result.criticalLength, xcrUnit), 4)} {xcrUnit}
                    </p>
                    <div className="flex flex-wrap justify-center gap-1 mt-1.5">
                      {(["m", "mm", "cm", "inch", "ft"] as LengthUnit[]).map(u => (
                        <button key={u}
                          onClick={() => setXcrUnit(u)}
                          className={`px-1.5 py-0.5 text-xs rounded ${
                            xcrUnit === u
                              ? "bg-blue-500 text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                          }`}>
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      Re<sub>cr</sub>
                    </p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">5 × 10⁵</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 px-3 pb-2 pt-1">
                  {geometry === "aerofoil"
                    ? <>Boundary layer transitions at x<sub>tr</sub> = {fmt(result.criticalLength, 4)} m from the leading edge ({fmt((result.criticalLength / parseFloat(length)) * 100, 3)} % of chord).</>
                    : <>Boundary layer transitions from laminar to turbulent at x = x<sub>cr</sub> from the leading edge.</>
                  }
                </p>
              </div>
            )}

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.reynoldsExternal} />
            <CommonMistakes mistakes={commonMistakes.reynoldsExternal} />
          </div>
        </ResultsCard>
      )}

      {/* Test Cases */}
      <Card>
        <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Test Cases</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          {/* Flat plate */}
          <div>
            <p className="font-semibold mb-2">Flat Plate — Air at 20°C, V = 10 m/s, L = 1 m</p>
            <table className="w-full border-collapse text-sm">
              <tbody>
                {[
                  ["Density ρ",           "1.204 kg/m³"],
                  ["Dynamic viscosity μ", "1.825×10⁻⁵ Pa·s"],
                  ["Plate length L",      "1 m"],
                  ["Free-stream V∞",      "10 m/s"],
                ].map(([k, v]) => (
                  <tr key={k} className="border-b border-gray-200 dark:border-gray-600">
                    <td className="py-1.5 pr-4 font-medium w-44">{k}</td>
                    <td className="py-1.5">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono text-xs mt-2">
              Re = (1.204 × 10 × 1) / 1.825×10⁻⁵ = 659,726 → Transitional<br />
              x<sub>cr</sub> = (5×10⁵ × 15.11×10⁻⁶) / 10 = 0.756 m
            </div>
          </div>

          {/* Aerofoil */}
          <div>
            <p className="font-semibold mb-2">Aerofoil — Air at 20°C, V = 30 m/s, chord c = 0.5 m</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono text-xs space-y-1">
              <div>Re = (1.204 × 30 × 0.5) / 1.825×10⁻⁵ = 990,411 → High Re (turbulent BL)</div>
              <div>x<sub>tr</sub> = (5×10⁵ × 15.11×10⁻⁶) / 30 = 0.252 m = 50.3% of chord</div>
            </div>
          </div>

          {/* Cylinder */}
          <div>
            <p className="font-semibold mb-2">Cylinder — Water at 20°C, V = 0.5 m/s, D = 50 mm</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono text-xs">
              Re = (998 × 0.5 × 0.05) / 0.001002 = 24,950 → Laminar (wake + separated BL)
            </div>
          </div>
        </div>
      </Card>

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Formula (same as internal flow, different characteristic length):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Re = (ρ × V∞ × L) / μ = V∞ × L / ν</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                L = plate length &nbsp;|&nbsp; c = chord &nbsp;|&nbsp; D = cylinder or sphere diameter
              </div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Regime thresholds by geometry:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white w-28">Geometry</th>
                  <th className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">Regime</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Re range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {([
                  ["Flat plate",      "Laminar BL",               <>Re<sub>L</sub> &lt; 5×10⁵</>],
                  ["Flat plate",      "Mixed BL (lam + turb)",    <>5×10⁵ ≤ Re<sub>L</sub> &lt; 10⁷</>],
                  ["Flat plate",      "Turbulent BL (approx.)",   <>Re<sub>L</sub> ≥ 10⁷</>],
                  ["Aerofoil",        "Ultra-low Re (insect/MAV)", <>Re<sub>c</sub> &lt; 10⁴</>],
                  ["Aerofoil",        "Low Re — separation bubble",<>10⁴ ≤ Re<sub>c</sub> &lt; 10⁵</>],
                  ["Aerofoil",        "Transitional (glider/UAV)", <>10⁵ ≤ Re<sub>c</sub> &lt; 5×10⁵</>],
                  ["Aerofoil",        "High Re (classical aero)",  <>Re<sub>c</sub> ≥ 5×10⁵</>],
                  ["Cylinder/Sphere", "Creeping",                  <>Re &lt; 1</>],
                  ["Cylinder/Sphere", "Subcritical (laminar BL)",   <>1 ≤ Re &lt; 2×10⁵</>],
                  ["Cylinder/Sphere", "Critical (drag crisis)",    <>2×10⁵ ≤ Re &lt; 5×10⁵</>],
                  ["Cylinder/Sphere", "Supercritical",             <>Re ≥ 5×10⁵</>],
                ] as [string, string, React.ReactNode][]).map(([geo, regime, range]) => (
                  <tr key={geo + regime}>
                    <td className="py-1.5 pr-3 font-medium">{geo}</td>
                    <td className="py-1.5 pr-3">{regime}</td>
                    <td className="py-1.5 font-mono text-xs">{range}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Flat plate / aerofoil — transition position:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              x<sub>cr</sub> = (Re<sub>cr</sub> × ν) / V∞ = (5×10⁵ × ν) / V∞
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              The boundary layer is laminar for x &lt; x<sub>cr</sub> and turbulent for x &gt; x<sub>cr</sub>.
              Re<sub>cr</sub> ≈ 5×10⁵ is the standard engineering value for a smooth surface with low free-stream turbulence.
              For aerofoils, x<sub>cr</sub> is expressed as a percentage of chord c.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">
              Aerofoil — why Re<sub>c</sub> matters:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-xs text-gray-600 dark:text-gray-300">
              <li><strong>Re<sub>c</sub> &lt; 10⁴</strong> — insects and micro-vehicles; viscosity so dominant that conventional aerofoil sections perform poorly</li>
              <li><strong>10⁴ – 10⁵</strong> — laminar separation bubble forms on suction surface; thin, highly-cambered sections (e.g. Eppler, Selig) needed</li>
              <li><strong>10⁵ – 5×10⁵</strong> — glider and UAV range; bubble may burst → sudden stall; turbulators sometimes added to fix transition</li>
              <li><strong>&gt; 5×10⁵</strong> — BL transitions early; classical NACA sections work well; thin-aerofoil theory reliable</li>
            </ul>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              The transition position x<sub>tr</sub> is estimated using the flat-plate criterion Re<sub>x</sub> = 5×10⁵ —
              a useful approximation for zero-pressure-gradient sections. Actual x<sub>tr</sub> shifts forward with
              increasing angle of attack or adverse pressure gradient.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Cylinder drag crisis:</p>
            <p>
              Around Re ≈ 2–5×10⁵ the laminar boundary layer trips to turbulent before separating, moving the
              separation point from ~80° to ~140° from the stagnation point. This dramatically narrows the
              turbulent wake and causes C<sub>D</sub> to drop from ~1.2 to ~0.3 — the so-called{" "}
              <em>drag crisis</em>. Golf ball dimples intentionally trigger this transition at lower Re to
              reduce drag in flight.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>ρ = fluid density [kg/m³]</li>
              <li>V∞ = free-stream velocity [m/s]</li>
              <li>L = plate length from leading edge [m]</li>
              <li>c = aerofoil chord length [m]</li>
              <li>D = cylinder or sphere outer diameter [m]</li>
              <li>μ = dynamic viscosity [Pa·s]</li>
              <li>ν = kinematic viscosity [m²/s] = μ / ρ</li>
              <li>x<sub>cr</sub> / x<sub>tr</sub> = transition position [m]</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Related calculators */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">Where to go next</h2>
        <div className="space-y-2">
          {[
            {
              href: "/calculators/viscosity-conversion",
              name: "Viscosity Conversion",
              desc: "Fluid not in the presets? Convert μ and ν across all unit systems and cross-convert between the two using density.",
            },
            {
              href: "/calculators/reynolds",
              name: "Reynolds Number — Internal (Pipe) Flow",
              desc: "Same dimensionless number applied to flow inside circular pipes — different regime thresholds (Re < 2,300 laminar).",
            },
            {
              href: "/calculators/boundary-layer",
              name: "Boundary Layer Thickness",
              desc: "For flat plates and aerofoils: compute boundary layer thickness and skin-friction coefficient from local Re.",
            },
            {
              href: "/calculators/drag-sphere",
              name: "Drag on Sphere",
              desc: "For cylinders and spheres: calculate drag force from Re and the appropriate drag coefficient correlation.",
            },
            {
              href: "/calculators/lift-force",
              name: "Lift Force",
              desc: "For aerofoils: calculate lift force from lift coefficient, wing area, and dynamic pressure.",
            },
          ].map(({ href, name, desc }) => (
            <a key={href} href={href}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
              <span className="mt-0.5 text-blue-500 group-hover:translate-x-0.5 transition-transform text-sm">→</span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
              </div>
            </a>
          ))}
        </div>
      </Card>
      <References refs={REFS_REYNOLDS_EXTERNAL} />
    </div>
  );
}