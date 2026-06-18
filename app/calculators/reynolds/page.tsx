"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateReynoldsNumber,
  generateReynoldsSteps,
  commonAssumptions,
  commonMistakes,
  type ReynoldsInput,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";
import { References } from "@/components/References";
import { REFS_REYNOLDS } from "@/lib/references";

// ── Types ─────────────────────────────────────────────────────────────────────
type DensityUnit = "kg/m³" | "g/cm³";
type VelocityUnit = "m/s" | "ft/s";
type DiameterUnit = "m" | "mm" | "cm" | "inch";
type ViscosityUnit = "Pa·s" | "cP" | "kg/(m·s)";
type FlowRateUnit = "m³/s" | "L/s" | "L/min" | "gal/min";
type KinViscUnit = "m²/s" | "cSt" | "ft²/s";

// ── Unit conversions to SI ────────────────────────────────────────────────────
const toDensitySI   = (v: number, u: DensityUnit):   number => u === "g/cm³"   ? v * 1000      : v;
const toVelocitySI  = (v: number, u: VelocityUnit):  number => u === "ft/s"    ? v * 0.3048    : v;
const toFlowRateSI  = (v: number, u: FlowRateUnit):  number => {
  if (u === "L/s")    return v / 1000;
  if (u === "L/min")  return v / 60000;
  if (u === "gal/min") return v * 6.30902e-5;
  return v;
};
const toDiameterSI  = (v: number, u: DiameterUnit):  number => {
  if (u === "mm")   return v / 1000;
  if (u === "cm")   return v / 100;
  if (u === "inch") return v * 0.0254;
  return v;
};
const toViscositySI = (v: number, u: ViscosityUnit): number => u === "cP" ? v / 1000 : v;
const toKinViscSI   = (v: number, u: KinViscUnit):   number => {
  if (u === "cSt")   return v * 1e-6;
  if (u === "ft²/s") return v * 0.092903;
  return v;
};

// ── Fluid presets ─────────────────────────────────────────────────────────────
const FLUID_PRESETS = [
  { label: "Water at 20°C",         density: "998",   viscosity: "0.001002" },
  { label: "Water at 60°C",         density: "983",   viscosity: "0.000467" },
  { label: "Water at 100°C",        density: "958",   viscosity: "0.000282" },
  { label: "Air at 20°C",           density: "1.204", viscosity: "0.00001825" },
  { label: "Air at 60°C",           density: "1.060", viscosity: "0.00001968" },
  { label: "Ethanol at 20°C",       density: "789",   viscosity: "0.00120" },
  { label: "Glycerin at 25°C",      density: "1261",  viscosity: "0.95" },
  { label: "Engine oil SAE 30 (25°C)", density: "880", viscosity: "0.30" },
] as const;

// ── Small toggle button ───────────────────────────────────────────────────────
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

// ── Main component ────────────────────────────────────────────────────────────
export default function ReynoldsCalculator() {
  const [density,      setDensity]      = useState("998");
  const [densityUnit,  setDensityUnit]  = useState<DensityUnit>("kg/m³");

  const [inputMode,    setInputMode]    = useState<"velocity" | "flowRate">("velocity");
  const [velocity,     setVelocity]     = useState("1");
  const [velocityUnit, setVelocityUnit] = useState<VelocityUnit>("m/s");
  const [flowRate,     setFlowRate]     = useState("0.00196");
  const [flowRateUnit, setFlowRateUnit] = useState<FlowRateUnit>("m³/s");

  const [diameter,     setDiameter]     = useState("50");
  const [diameterUnit, setDiameterUnit] = useState<DiameterUnit>("mm");

  const [viscMode,     setViscMode]     = useState<"dynamic" | "kinematic">("dynamic");
  const [viscosity,    setViscosity]    = useState("1.002");
  const [viscosityUnit,setViscosityUnit]= useState<ViscosityUnit>("cP");
  const [kinVisc,      setKinVisc]      = useState("1.004");
  const [kinViscUnit,  setKinViscUnit]  = useState<KinViscUnit>("cSt");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateReynoldsNumber> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateReynoldsSteps>  | null>(null);

  const applyPreset = (preset: { density: string; viscosity: string }) => {
    const rhoSI = parseFloat(preset.density);
    const muSI  = parseFloat(preset.viscosity);
    setDensityUnit("kg/m³");
    setDensity(preset.density);
    setViscosityUnit("Pa·s");
    setViscosity(preset.viscosity);
    // kinematic ν = μ / ρ, stored as cSt (1 cSt = 1e-6 m²/s)
    setKinViscUnit("cSt");
    setKinVisc(parseFloat(((muSI / rhoSI) * 1e6).toPrecision(4)).toString());
  };

  const handleClear = () => {
    setDensity("");
    setDensityUnit("kg/m³");
    setInputMode("velocity");
    setVelocity("");
    setVelocityUnit("m/s");
    setFlowRate("");
    setFlowRateUnit("m³/s");
    setDiameter("");
    setDiameterUnit("mm");
    setViscMode("dynamic");
    setViscosity("");
    setViscosityUnit("cP");
    setKinVisc("");
    setKinViscUnit("cSt");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};

    const rhoVal = parseFloat(density);
    if (isNaN(rhoVal) || rhoVal <= 0) newErrors.density = "Must be a positive number";

    const dVal = parseFloat(diameter);
    if (isNaN(dVal) || dVal <= 0) newErrors.diameter = "Must be a positive number";

    if (inputMode === "velocity") {
      const v = parseFloat(velocity);
      if (isNaN(v) || v < 0) newErrors.velocity = "Must be non-negative";
    } else {
      const q = parseFloat(flowRate);
      if (isNaN(q) || q < 0) newErrors.flowRate = "Must be non-negative";
    }

    if (viscMode === "dynamic") {
      const mu = parseFloat(viscosity);
      if (isNaN(mu) || mu <= 0) newErrors.viscosity = "Must be a positive number";
    } else {
      const nu = parseFloat(kinVisc);
      if (isNaN(nu) || nu <= 0) newErrors.kinViscosity = "Must be a positive number";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setResult(null);
      setSteps(null);
      return;
    }

    try {
      const rhoSI = toDensitySI(rhoVal, densityUnit);
      const dSI   = toDiameterSI(dVal, diameterUnit);

      let velSI: number;
      if (inputMode === "velocity") {
        velSI = toVelocitySI(parseFloat(velocity), velocityUnit);
      } else {
        const qSI  = toFlowRateSI(parseFloat(flowRate), flowRateUnit);
        const area = Math.PI * dSI * dSI / 4;
        velSI = qSI / area;
      }

      let muSI: number;
      if (viscMode === "dynamic") {
        muSI = toViscositySI(parseFloat(viscosity), viscosityUnit);
      } else {
        const nuSI = toKinViscSI(parseFloat(kinVisc), kinViscUnit);
        muSI = nuSI * rhoSI;
      }

      const input: ReynoldsInput = { density: rhoSI, velocity: velSI, diameter: dSI, viscosity: muSI };
      const calcResult = calculateReynoldsNumber(input);
      const calcSteps  = generateReynoldsSteps(input, calcResult);
      setResult(calcResult);
      setSteps(calcSteps);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "An error occurred" });
      setResult(null);
      setSteps(null);
    }
  };

  const regimeBg = result?.regime === "laminar"
    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
    : result?.regime === "transitional"
    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";

  const diamPlaceholder =
    diameterUnit === "m" ? "0.05" : diameterUnit === "mm" ? "50" : diameterUnit === "cm" ? "5" : "1.97";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Reynolds Number — Internal (Pipe) Flow
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Dimensionless ratio of inertial to viscous forces in{" "}
          <strong className="text-gray-800 dark:text-gray-200">internal pipe flow</strong>.
          Determines whether flow is laminar, transitional, or turbulent.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Mechanics I core concept
        </span>
      </div>

      {/* Common Fluids */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Common fluids — click to auto-fill density and viscosity
        </h2>
        <div className="flex flex-wrap gap-2">
          {FLUID_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors"
            >
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
            {/* spacer matches the height of the mode-toggle row in the adjacent cell */}
            <div className="flex gap-2 mb-3" aria-hidden="true">
              <span className="px-3 py-1 text-sm rounded opacity-0 select-none">x</span>
            </div>
            <InputField
              label="Density"
              symbol="ρ"
              unit={densityUnit}
              value={density}
              onChange={setDensity}
              placeholder={densityUnit === "g/cm³" ? "0.998" : "998"}
              error={errors.density}
            />
            <div className="flex gap-2 -mt-2">
              {(["kg/m³", "g/cm³"] as DensityUnit[]).map((u) => (
                <Btn key={u} label={u} active={densityUnit === u} onClick={() => setDensityUnit(u)} />
              ))}
            </div>
          </div>

          {/* Velocity / Flow Rate */}
          <div>
            <div className="flex gap-2 mb-3">
              <Btn label="Mean velocity V" active={inputMode === "velocity"} onClick={() => setInputMode("velocity")} />
              <Btn label="Volumetric flow Q" active={inputMode === "flowRate"} onClick={() => setInputMode("flowRate")} />
            </div>
            {inputMode === "velocity" ? (
              <>
                <InputField
                  label="Mean velocity"
                  symbol="V"
                  unit={velocityUnit}
                  value={velocity}
                  onChange={setVelocity}
                  error={errors.velocity}
                />
                <div className="flex gap-2 -mt-2">
                  {(["m/s", "ft/s"] as VelocityUnit[]).map((u) => (
                    <Btn key={u} label={u} active={velocityUnit === u} onClick={() => setVelocityUnit(u)} />
                  ))}
                </div>
              </>
            ) : (
              <>
                <InputField
                  label="Volumetric flow rate"
                  symbol="Q"
                  unit={flowRateUnit}
                  value={flowRate}
                  onChange={setFlowRate}
                  error={errors.flowRate}
                />
                <div className="flex flex-wrap gap-2 -mt-2">
                  {(["m³/s", "L/s", "L/min", "gal/min"] as FlowRateUnit[]).map((u) => (
                    <Btn key={u} label={u} active={flowRateUnit === u} onClick={() => setFlowRateUnit(u)} />
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  V = Q / (π D² / 4)
                </p>
              </>
            )}
          </div>

          {/* Diameter */}
          <div>
            <div className="flex gap-2 mb-3" aria-hidden="true">
              <span className="px-3 py-1 text-sm rounded opacity-0 select-none">x</span>
            </div>
            <InputField
              label="Internal pipe diameter"
              symbol="D"
              unit={diameterUnit}
              value={diameter}
              onChange={setDiameter}
              placeholder={diamPlaceholder}
              error={errors.diameter}
            />
            <div className="flex flex-wrap gap-2">
              {(["m", "mm", "cm", "inch"] as DiameterUnit[]).map((u) => (
                <Btn key={u} label={u} active={diameterUnit === u} onClick={() => setDiameterUnit(u)} />
              ))}
            </div>
          </div>

          {/* Viscosity */}
          <div>
            <div className="flex gap-2 mb-3">
              <Btn label="Dynamic μ" active={viscMode === "dynamic"} onClick={() => setViscMode("dynamic")} />
              <Btn label="Kinematic ν" active={viscMode === "kinematic"} onClick={() => setViscMode("kinematic")} />
            </div>
            {viscMode === "dynamic" ? (
              <>
                <InputField
                  label="Dynamic viscosity"
                  symbol="μ"
                  unit={viscosityUnit}
                  value={viscosity}
                  onChange={setViscosity}
                  error={errors.viscosity}
                />
                <div className="flex flex-wrap gap-2 -mt-2">
                  {(["Pa·s", "cP", "kg/(m·s)"] as ViscosityUnit[]).map((u) => (
                    <Btn key={u} label={u} active={viscosityUnit === u} onClick={() => setViscosityUnit(u)} />
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  1 cP = 1 mPa·s = 0.001 Pa·s
                </p>
              </>
            ) : (
              <>
                <InputField
                  label="Kinematic viscosity"
                  symbol="ν"
                  unit={kinViscUnit}
                  value={kinVisc}
                  onChange={setKinVisc}
                  error={errors.kinViscosity}
                />
                <div className="flex flex-wrap gap-2 -mt-2">
                  {(["m²/s", "cSt", "ft²/s"] as KinViscUnit[]).map((u) => (
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
        <button
          onClick={handleCalculate}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors"
        >
          Calculate
        </button>
        <ClearButton onClear={handleClear} />
      </Card>

      {/* Results */}
      {result && steps && (
        <ResultsCard>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Reynolds Number</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                Re = {result.reynoldsNumber.toFixed(0)}
              </p>
            </div>

            <div className={`p-4 rounded-lg border ${regimeBg}`}>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">
                Flow Regime: {result.regime.charAt(0).toUpperCase() + result.regime.slice(1)}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
            </div>

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.reynolds} />
            <CommonMistakes mistakes={commonMistakes.reynolds} />
          </div>
        </ResultsCard>
      )}

      {/* Test Case */}
      <Card>
        <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">
          Test Case — Water at 20°C in a 50 mm pipe
        </h2>
        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {[
                ["Fluid", "Water at 20°C"],
                ["Density ρ", "998 kg/m³"],
                ["Dynamic viscosity μ", "0.001002 Pa·s (1.002 cP)"],
                ["Internal diameter D", "50 mm = 0.05 m"],
                ["Mean velocity V", "1 m/s"],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-gray-200 dark:border-gray-600">
                  <td className="py-1.5 pr-4 font-medium w-40">{k}</td>
                  <td className="py-1.5">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono text-xs">
            Re = (998 × 1 × 0.05) / 0.001002 = 49,800 → Turbulent
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            To verify: click <span className="font-semibold">Water at 20°C</span> in the Common fluids panel, set D = 50 mm and V = 1 m/s, then click Calculate.
          </p>
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
              desc: "Fluid not in the presets? Convert μ and ν across all unit systems (Pa·s, cP, cSt …) and cross-convert using density.",
            },
            {
              href: "/calculators/reynolds-external",
              name: "Reynolds Number — External Flow",
              desc: "Flow over flat plates, cylinders, and spheres — same formula, different characteristic length and regime thresholds.",
            },
            {
              href: "/calculators/pipe-head-loss",
              name: "Pipe Head Loss",
              desc: "Once you know the flow regime, calculate friction head loss using the Darcy-Weisbach equation.",
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

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Main Equation:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              Re = (ρ × V × D) / μ = V × D / ν
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>ρ (rho) = fluid density [kg/m³]</li>
              <li>V = mean flow velocity [m/s]</li>
              <li>D = <strong>internal</strong> pipe diameter [m]</li>
              <li>μ (mu) = dynamic viscosity [Pa·s]</li>
              <li>ν (nu) = kinematic viscosity [m²/s] = μ / ρ</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">
              Flow Regime Classification{" "}
              <span className="text-gray-500 font-normal">(approximate — smooth, straight pipe)</span>:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Re &lt; 2,300 — Laminar (viscous forces dominate)</li>
              <li>2,300 ≤ Re &lt; 4,000 — Transitional (unstable)</li>
              <li>Re ≥ 4,000 — Turbulent (inertial forces dominate)</li>
            </ul>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              These thresholds are approximations for smooth, straight circular pipes with fully-developed, low-disturbance flow. In practice, transition can start near Re ≈ 2,000 with rough walls or high-disturbance inlets, and laminar flow can persist to Re ~ 10,000 under carefully controlled lab conditions.
            </p>
          </div>
        </div>
      </Card>

      {/* References — after Theory */}
      <References refs={REFS_REYNOLDS} />

    </div>
  );
}
