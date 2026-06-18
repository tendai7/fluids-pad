"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_BERNOULLI } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateBernoulli,
  generateBernoulliSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

// ── Types ─────────────────────────────────────────────────────────────────────
type PressureUnit  = "Pa" | "kPa" | "MPa" | "bar" | "psi" | "atm" | "mmHg";
type VelocityUnit  = "m/s" | "cm/s" | "ft/s" | "km/h" | "mph";
type ElevationUnit = "m" | "mm" | "cm" | "ft" | "inch";
type DensityUnit   = "kg/m³" | "g/cm³" | "lb/ft³";

// ── Conversions to SI ─────────────────────────────────────────────────────────
const toPressureSI = (v: number, u: PressureUnit): number => {
  if (u === "kPa")  return v * 1e3;
  if (u === "MPa")  return v * 1e6;
  if (u === "bar")  return v * 1e5;
  if (u === "psi")  return v * 6894.757;
  if (u === "atm")  return v * 101325;
  if (u === "mmHg") return v * 133.322;
  return v;
};
const toVelocitySI = (v: number, u: VelocityUnit): number => {
  if (u === "cm/s") return v / 100;
  if (u === "ft/s") return v * 0.3048;
  if (u === "km/h") return v / 3.6;
  if (u === "mph")  return v * 0.44704;
  return v;
};
const toElevationSI = (v: number, u: ElevationUnit): number => {
  if (u === "mm")   return v / 1000;
  if (u === "cm")   return v / 100;
  if (u === "ft")   return v * 0.3048;
  if (u === "inch") return v * 0.0254;
  return v;
};
const toDensitySI = (v: number, u: DensityUnit): number => {
  if (u === "g/cm³")  return v * 1000;
  if (u === "lb/ft³") return v * 16.0185;
  return v;
};

// ── Conversions from SI ───────────────────────────────────────────────────────
const fromPressureSI = (v: number, u: PressureUnit): number => {
  if (u === "kPa")  return v / 1e3;
  if (u === "MPa")  return v / 1e6;
  if (u === "bar")  return v / 1e5;
  if (u === "psi")  return v / 6894.757;
  if (u === "atm")  return v / 101325;
  if (u === "mmHg") return v / 133.322;
  return v;
};
const fromVelocitySI = (v: number, u: VelocityUnit): number => {
  if (u === "cm/s") return v * 100;
  if (u === "ft/s") return v / 0.3048;
  if (u === "km/h") return v * 3.6;
  if (u === "mph")  return v / 0.44704;
  return v;
};
const fromElevationSI = (v: number, u: ElevationUnit): number => {
  if (u === "mm")   return v * 1000;
  if (u === "cm")   return v * 100;
  if (u === "ft")   return v / 0.3048;
  if (u === "inch") return v / 0.0254;
  return v;
};

function fmt(n: number): string {
  return parseFloat(n.toPrecision(6)).toString();
}

function parse(s: string): number | undefined {
  if (s.trim() === "") return undefined;
  const n = parseFloat(s);
  return isNaN(n) ? undefined : n;
}

type Field = "pressure1" | "velocity1" | "elevation1" | "pressure2" | "velocity2" | "elevation2";

function Btn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-xs rounded ${
        active
          ? "bg-blue-500 text-white"
          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
      }`}
    >
      {label}
    </button>
  );
}

export default function BernoulliCalculator() {
  // ── Field values ─────────────────────────────────────────────────────────────
  const [pressure1,  setPressure1]  = useState("");
  const [velocity1,  setVelocity1]  = useState("");
  const [elevation1, setElevation1] = useState("0");
  const [pressure2,  setPressure2]  = useState("");
  const [velocity2,  setVelocity2]  = useState("");
  const [elevation2, setElevation2] = useState("0");
  const [density,    setDensity]    = useState("1000");

  // ── Unit states ───────────────────────────────────────────────────────────────
  const [pressureUnit,  setPressureUnit]  = useState<PressureUnit>("Pa");
  const [velocityUnit,  setVelocityUnit]  = useState<VelocityUnit>("m/s");
  const [elevationUnit, setElevationUnit] = useState<ElevationUnit>("m");
  const [densityUnit,   setDensityUnit]   = useState<DensityUnit>("kg/m³");

  const [errors,        setErrors]        = useState<Record<string, string>>({});
  const [result,        setResult]        = useState<ReturnType<typeof calculateBernoulli> | null>(null);
  const [steps,         setSteps]         = useState<ReturnType<typeof generateBernoulliSteps> | null>(null);
  const [computedField, setComputedField] = useState<Field | null>(null);

  // ── Unit change: clears stale computed field ──────────────────────────────────
  const onUnitChange = (callback: () => void) => {
    callback();
    if (computedField) {
      if (computedField === "pressure1")  setPressure1("");
      if (computedField === "velocity1")  setVelocity1("");
      if (computedField === "elevation1") setElevation1("");
      if (computedField === "pressure2")  setPressure2("");
      if (computedField === "velocity2")  setVelocity2("");
      if (computedField === "elevation2") setElevation2("");
      setComputedField(null);
    }
    setResult(null);
    setSteps(null);
  };

  const touch = (setter: (v: string) => void) => (val: string) => {
    setter(val);
    setResult(null);
    setSteps(null);
    setErrors({});
    setComputedField(null);
  };

  const handleClear = () => {
    setPressure1(""); setVelocity1(""); setElevation1("0");
    setPressure2(""); setVelocity2(""); setElevation2("0");
    setDensity("1000");
    setPressureUnit("Pa"); setVelocityUnit("m/s");
    setElevationUnit("m"); setDensityUnit("kg/m³");
    setResult(null); setSteps(null); setErrors({}); setComputedField(null);
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};

    const rhoRaw = parseFloat(density);
    if (isNaN(rhoRaw) || rhoRaw <= 0) newErrors.density = "Must be a positive number";

    const checkNum = (val: string, key: string, allowNeg = true) => {
      if (val.trim() === "") return;
      const n = parseFloat(val);
      if (isNaN(n)) newErrors[key] = "Must be a number";
      else if (!allowNeg && n < 0) newErrors[key] = "Must be non-negative";
    };
    checkNum(pressure1,  "pressure1");
    checkNum(velocity1,  "velocity1",  false);
    checkNum(elevation1, "elevation1");
    checkNum(pressure2,  "pressure2");
    checkNum(velocity2,  "velocity2",  false);
    checkNum(elevation2, "elevation2");

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) { setResult(null); setSteps(null); return; }

    // Convert inputs to SI
    const toP  = (s: string) => { const n = parse(s); return n !== undefined ? toPressureSI(n, pressureUnit)   : undefined; };
    const toV  = (s: string) => { const n = parse(s); return n !== undefined ? toVelocitySI(n, velocityUnit)   : undefined; };
    const toZ  = (s: string) => { const n = parse(s); return n !== undefined ? toElevationSI(n, elevationUnit) : undefined; };

    try {
      const input = {
        pressure1:  toP(pressure1),
        velocity1:  toV(velocity1),
        elevation1: toZ(elevation1),
        pressure2:  toP(pressure2),
        velocity2:  toV(velocity2),
        elevation2: toZ(elevation2),
        density: toDensitySI(rhoRaw, densityUnit),
      };

      const calc = calculateBernoulli(input);
      const stp  = generateBernoulliSteps(input, calc);

      const unknown = (
        input.pressure1  === undefined ? "pressure1"  :
        input.velocity1  === undefined ? "velocity1"  :
        input.elevation1 === undefined ? "elevation1" :
        input.pressure2  === undefined ? "pressure2"  :
        input.velocity2  === undefined ? "velocity2"  :
        input.elevation2 === undefined ? "elevation2" : null
      ) as Field | null;

      // Write computed result back in the selected unit
      if (unknown === "pressure1")  setPressure1(fmt(fromPressureSI(calc.pressure1, pressureUnit)));
      if (unknown === "velocity1")  setVelocity1(fmt(fromVelocitySI(calc.velocity1, velocityUnit)));
      if (unknown === "elevation1") setElevation1(fmt(fromElevationSI(calc.elevation1, elevationUnit)));
      if (unknown === "pressure2")  setPressure2(fmt(fromPressureSI(calc.pressure2, pressureUnit)));
      if (unknown === "velocity2")  setVelocity2(fmt(fromVelocitySI(calc.velocity2, velocityUnit)));
      if (unknown === "elevation2") setElevation2(fmt(fromElevationSI(calc.elevation2, elevationUnit)));

      // Override the final result step to show the user's selected unit
      // (substitution steps stay in SI — the maths is done in SI)
      if (unknown && stp.length > 0) {
        const last = stp[stp.length - 1];
        const labels: Record<Field, string> = {
          pressure1: "P₁", velocity1: "V₁", elevation1: "z₁",
          pressure2: "P₂", velocity2: "V₂", elevation2: "z₂",
        };
        const sym = labels[unknown];
        if (unknown === "pressure1" || unknown === "pressure2") {
          const v = unknown === "pressure1" ? calc.pressure1 : calc.pressure2;
          last.result = `${sym} = ${fmt(fromPressureSI(v, pressureUnit))} \\text{ ${pressureUnit}}`;
        } else if (unknown === "velocity1" || unknown === "velocity2") {
          const v = unknown === "velocity1" ? calc.velocity1 : calc.velocity2;
          last.result = `${sym} = ${fmt(fromVelocitySI(v, velocityUnit))} \\text{ ${velocityUnit}}`;
        } else {
          const v = unknown === "elevation1" ? calc.elevation1 : calc.elevation2;
          last.result = `${sym} = ${fmt(fromElevationSI(v, elevationUnit))} \\text{ ${elevationUnit}}`;
        }
      }

      setComputedField(unknown);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null);
      setSteps(null);
    }
  };

  const hint       = (f: Field) => computedField === f ? "← calculated result" : undefined;
  const isComputed = (f: Field) => computedField === f;

  // Build the "Calculated value" banner in the user's selected units
  const computedValueDisplay = (): string => {
    if (!computedField || !result) return "";
    const labels: Record<Field, string> = {
      pressure1: "P₁", velocity1: "V₁", elevation1: "z₁",
      pressure2: "P₂", velocity2: "V₂", elevation2: "z₂",
    };
    const sym = labels[computedField];
    if (computedField === "pressure1" || computedField === "pressure2") {
      const v = computedField === "pressure1" ? result.pressure1 : result.pressure2;
      return `${sym} = ${fmt(fromPressureSI(v, pressureUnit))} ${pressureUnit}`;
    }
    if (computedField === "velocity1" || computedField === "velocity2") {
      const v = computedField === "velocity1" ? result.velocity1 : result.velocity2;
      return `${sym} = ${fmt(fromVelocitySI(v, velocityUnit))} ${velocityUnit}`;
    }
    const v = computedField === "elevation1" ? result.elevation1 : result.elevation2;
    return `${sym} = ${fmt(fromElevationSI(v, elevationUnit))} ${elevationUnit}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Bernoulli Equation Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Solve for pressure, velocity, or elevation along a streamline. Leave exactly one field
          empty — that is the unknown to be calculated.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Mechanics I
        </span>
      </div>

      <Card>
        <h2 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">Inputs</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Fill in 5 of the 6 fields and leave the unknown one empty. Elevation defaults to 0 (horizontal flow) — clear it to solve for elevation.
        </p>

        {/* Fluid density */}
        <div className="mb-2 max-w-xs">
          <InputField
            label="Fluid density"
            symbol="ρ"
            unit={densityUnit}
            value={density}
            onChange={touch(setDensity)}
            error={errors.density}
          />
          <div className="flex flex-wrap gap-2 -mt-2">
            {(["kg/m³", "g/cm³", "lb/ft³"] as DensityUnit[]).map(u => (
              <Btn key={u} label={u} active={densityUnit === u}
                onClick={() => onUnitChange(() => setDensityUnit(u))} />
            ))}
          </div>
        </div>

        {/* Shared unit selectors */}
        <div className="my-5 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Units</p>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pressure (P₁ and P₂)</p>
            <div className="flex flex-wrap gap-1.5">
              {(["Pa", "kPa", "MPa", "bar", "psi", "atm", "mmHg"] as PressureUnit[]).map(u => (
                <Btn key={u} label={u} active={pressureUnit === u}
                  onClick={() => onUnitChange(() => setPressureUnit(u))} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Velocity (V₁ and V₂)</p>
            <div className="flex flex-wrap gap-1.5">
              {(["m/s", "cm/s", "ft/s", "km/h", "mph"] as VelocityUnit[]).map(u => (
                <Btn key={u} label={u} active={velocityUnit === u}
                  onClick={() => onUnitChange(() => setVelocityUnit(u))} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Elevation (z₁ and z₂)</p>
            <div className="flex flex-wrap gap-1.5">
              {(["m", "mm", "cm", "ft", "inch"] as ElevationUnit[]).map(u => (
                <Btn key={u} label={u} active={elevationUnit === u}
                  onClick={() => onUnitChange(() => setElevationUnit(u))} />
              ))}
            </div>
          </div>
        </div>

        {/* Point inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Point 1</h3>
            <InputField
              label="Pressure" symbol="P₁" unit={pressureUnit}
              value={pressure1} onChange={touch(setPressure1)} error={errors.pressure1}
              hint={hint("pressure1")} readOnly={isComputed("pressure1")}
            />
            <InputField
              label="Velocity" symbol="V₁" unit={velocityUnit}
              value={velocity1} onChange={touch(setVelocity1)} error={errors.velocity1}
              hint={hint("velocity1")} readOnly={isComputed("velocity1")}
            />
            <InputField
              label="Elevation" symbol="z₁" unit={elevationUnit}
              value={elevation1} onChange={touch(setElevation1)} error={errors.elevation1}
              hint={hint("elevation1")} readOnly={isComputed("elevation1")}
            />
          </div>

          <div className="space-y-1">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Point 2</h3>
            <InputField
              label="Pressure" symbol="P₂" unit={pressureUnit}
              value={pressure2} onChange={touch(setPressure2)} error={errors.pressure2}
              hint={hint("pressure2")} readOnly={isComputed("pressure2")}
            />
            <InputField
              label="Velocity" symbol="V₂" unit={velocityUnit}
              value={velocity2} onChange={touch(setVelocity2)} error={errors.velocity2}
              hint={hint("velocity2")} readOnly={isComputed("velocity2")}
            />
            <InputField
              label="Elevation" symbol="z₂" unit={elevationUnit}
              value={elevation2} onChange={touch(setElevation2)} error={errors.elevation2}
              hint={hint("elevation2")} readOnly={isComputed("elevation2")}
            />
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

      {result && steps && (
        <ResultsCard>
          <div className="space-y-4">

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-0.5">Calculated value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{computedValueDisplay()}</p>
            </div>

            {/* All six values in selected units */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Point 1</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">P₁</span>
                    <span className="font-mono font-medium text-gray-900 dark:text-white">
                      {fmt(fromPressureSI(result.pressure1, pressureUnit))} {pressureUnit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">V₁</span>
                    <span className="font-mono font-medium text-gray-900 dark:text-white">
                      {fmt(fromVelocitySI(result.velocity1, velocityUnit))} {velocityUnit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">z₁</span>
                    <span className="font-mono font-medium text-gray-900 dark:text-white">
                      {fmt(fromElevationSI(result.elevation1, elevationUnit))} {elevationUnit}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Point 2</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">P₂</span>
                    <span className="font-mono font-medium text-gray-900 dark:text-white">
                      {fmt(fromPressureSI(result.pressure2, pressureUnit))} {pressureUnit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">V₂</span>
                    <span className="font-mono font-medium text-gray-900 dark:text-white">
                      {fmt(fromVelocitySI(result.velocity2, velocityUnit))} {velocityUnit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">z₂</span>
                    <span className="font-mono font-medium text-gray-900 dark:text-white">
                      {fmt(fromElevationSI(result.elevation2, elevationUnit))} {elevationUnit}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.bernoulli} />
            <CommonMistakes mistakes={commonMistakes.bernoulli} />
          </div>
        </ResultsCard>
      )}

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Main Equation (pressure form):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              P₁ + ½ρV₁² + ρgz₁ = P₂ + ½ρV₂² + ρgz₂
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>P = static pressure [Pa]</li>
              <li>ρ = fluid density [kg/m³]</li>
              <li>V = flow velocity [m/s]</li>
              <li>g = 9.81 m/s²</li>
              <li>z = elevation above datum [m]</li>
            </ul>
          </div>
          <p>
            Valid along a streamline for steady, incompressible, inviscid flow. Each term has units of Pa — representing static, dynamic, and hydrostatic pressure contributions respectively.
          </p>
        </div>
      </Card>

      <References refs={REFS_BERNOULLI} />
    </div>
  );
}
