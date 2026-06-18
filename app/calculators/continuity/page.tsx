"use client";

import React, { useState, useMemo } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_CONTINUITY } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateContinuity,
  generateContinuitySteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

// ── Types ─────────────────────────────────────────────────────────────────────
type FlowRateUnit = "m³/s" | "L/s" | "L/min" | "m³/h" | "ft³/s" | "gal/min";
type VelocityUnit = "m/s" | "cm/s" | "ft/s" | "km/h" | "mph";
type DiameterUnit = "m" | "mm" | "cm" | "inch" | "ft";
type AreaUnit     = "m²" | "cm²" | "mm²" | "ft²" | "in²";

// ── Conversions to SI ─────────────────────────────────────────────────────────
const toFlowRateSI = (v: number, u: FlowRateUnit): number => {
  if (u === "L/s")     return v * 1e-3;
  if (u === "L/min")   return v / 60000;
  if (u === "m³/h")    return v / 3600;
  if (u === "ft³/s")   return v * 0.0283168;
  if (u === "gal/min") return v * 6.30902e-5;
  return v;
};
const toVelocitySI = (v: number, u: VelocityUnit): number => {
  if (u === "cm/s")  return v / 100;
  if (u === "ft/s")  return v * 0.3048;
  if (u === "km/h")  return v / 3.6;
  if (u === "mph")   return v * 0.44704;
  return v;
};
const toDiameterSI = (v: number, u: DiameterUnit): number => {
  if (u === "mm")   return v / 1000;
  if (u === "cm")   return v / 100;
  if (u === "inch") return v * 0.0254;
  if (u === "ft")   return v * 0.3048;
  return v;
};
const toAreaSI = (v: number, u: AreaUnit): number => {
  if (u === "cm²") return v * 1e-4;
  if (u === "mm²") return v * 1e-6;
  if (u === "ft²") return v * 0.092903;
  if (u === "in²") return v * 6.4516e-4;
  return v;
};

// ── Conversions from SI ───────────────────────────────────────────────────────
const fromFlowRateSI = (v: number, u: FlowRateUnit): number => {
  if (u === "L/s")     return v * 1000;
  if (u === "L/min")   return v * 60000;
  if (u === "m³/h")    return v * 3600;
  if (u === "ft³/s")   return v / 0.0283168;
  if (u === "gal/min") return v / 6.30902e-5;
  return v;
};
const fromVelocitySI = (v: number, u: VelocityUnit): number => {
  if (u === "cm/s")  return v * 100;
  if (u === "ft/s")  return v / 0.3048;
  if (u === "km/h")  return v * 3.6;
  if (u === "mph")   return v / 0.44704;
  return v;
};
const fromAreaSI = (v: number, u: AreaUnit): number => {
  if (u === "cm²") return v * 1e4;
  if (u === "mm²") return v * 1e6;
  if (u === "ft²") return v / 0.092903;
  if (u === "in²") return v / 6.4516e-4;
  return v;
};

function fmt(n: number): string {
  return parseFloat(n.toPrecision(6)).toString();
}

function Btn({ label, active, onClick, disabled }: {
  label: string; active: boolean; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1 text-sm rounded ${
        active
          ? "bg-blue-500 text-white"
          : disabled
          ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
      }`}
    >
      {label}
    </button>
  );
}

export default function ContinuityCalculator() {
  const [flowRate,     setFlowRate]     = useState("");
  const [flowRateUnit, setFlowRateUnit] = useState<FlowRateUnit>("m³/s");
  const [velocity,     setVelocity]     = useState("");
  const [velocityUnit, setVelocityUnit] = useState<VelocityUnit>("m/s");
  const [diameter,     setDiameter]     = useState("");
  const [diameterUnit, setDiameterUnit] = useState<DiameterUnit>("m");
  const [area,         setArea]         = useState("");
  const [areaUnit,     setAreaUnit]     = useState<AreaUnit>("m²");
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [result,       setResult]       = useState<ReturnType<typeof calculateContinuity> | null>(null);
  const [steps,        setSteps]        = useState<ReturnType<typeof generateContinuitySteps> | null>(null);
  const [computed,     setComputed]     = useState<Set<string>>(new Set());

  // ── Cross-section mutual exclusion ─────────────────────────────────────────
  const areaLocked     = diameter.trim() !== "";
  const diameterLocked = !areaLocked && area.trim() !== "";

  // Real-time area preview while typing diameter (shown in selected areaUnit)
  const previewArea = useMemo(() => {
    if (!areaLocked) return "";
    const d = parseFloat(diameter);
    if (isNaN(d) || d <= 0) return "";
    const dSI = toDiameterSI(d, diameterUnit);
    return fmt(fromAreaSI(Math.PI * (dSI / 2) ** 2, areaUnit));
  }, [diameter, diameterUnit, areaUnit, areaLocked]);

  // ── Clears stale computed values when units change ─────────────────────────
  const onUnitChange = (callback: () => void) => {
    callback();
    if (computed.size > 0) {
      if (computed.has("flowRate")) setFlowRate("");
      if (computed.has("velocity")) setVelocity("");
      if (computed.has("area"))     setArea("");
      setComputed(new Set());
    }
    setResult(null);
    setSteps(null);
  };

  // ── Field touch: clears other computed fields when user edits ──────────────
  const touch = (setter: (v: string) => void, field: string) => (val: string) => {
    setter(val);
    setResult(null);
    setSteps(null);
    setErrors({});
    if (computed.size > 0) {
      if (computed.has("flowRate") && field !== "flowRate") setFlowRate("");
      if (computed.has("velocity") && field !== "velocity") setVelocity("");
      if (computed.has("area")     && field !== "area")     setArea("");
      setComputed(new Set());
    }
  };

  const touchDiameter = (val: string) => {
    setDiameter(val);
    if (val.trim() !== "") setArea("");
    setResult(null);
    setSteps(null);
    setErrors({});
    if (computed.size > 0) {
      if (computed.has("flowRate")) setFlowRate("");
      if (computed.has("velocity")) setVelocity("");
      setComputed(new Set());
    }
  };

  // ── Clear ──────────────────────────────────────────────────────────────────
  const handleClear = () => {
    setFlowRate(""); setFlowRateUnit("m³/s");
    setVelocity(""); setVelocityUnit("m/s");
    setDiameter(""); setDiameterUnit("m");
    setArea("");     setAreaUnit("m²");
    setResult(null); setSteps(null);
    setErrors({});   setComputed(new Set());
  };

  // ── Calculate ──────────────────────────────────────────────────────────────
  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};

    const qStr = computed.has("flowRate") ? "" : flowRate.trim();
    const vStr = computed.has("velocity") ? "" : velocity.trim();
    const dStr = diameter.trim();
    const aStr = (areaLocked || computed.has("area")) ? "" : area.trim();

    let qVal: number | undefined;
    let vVal: number | undefined;
    let dValSI: number | undefined;
    let aVal: number | undefined;

    if (qStr !== "") {
      const n = parseFloat(qStr);
      if (isNaN(n))   newErrors.flowRate = "Must be a number";
      else if (n < 0) newErrors.flowRate = "Flow rate cannot be negative";
      else qVal = toFlowRateSI(n, flowRateUnit);
    }

    if (vStr !== "") {
      const n = parseFloat(vStr);
      if (isNaN(n))   newErrors.velocity = "Must be a number";
      else if (n < 0) newErrors.velocity = "Velocity cannot be negative";
      else vVal = toVelocitySI(n, velocityUnit);
    }

    if (dStr !== "") {
      const n = parseFloat(dStr);
      if (isNaN(n) || n <= 0) newErrors.diameter = "Must be a positive number";
      else dValSI = toDiameterSI(n, diameterUnit);
    }

    if (aStr !== "") {
      const n = parseFloat(aStr);
      if (isNaN(n) || n <= 0) newErrors.area = "Must be a positive number";
      else aVal = toAreaSI(n, areaUnit);
    }

    if (Object.keys(newErrors).length === 0) {
      const sectionKnown = dValSI !== undefined || aVal !== undefined;
      const nProvided = (qVal !== undefined ? 1 : 0) + (vVal !== undefined ? 1 : 0) + (sectionKnown ? 1 : 0);
      if (nProvided < 2) {
        newErrors.general = "Enter at least two values — flow rate, velocity, and / or area (diameter)";
      } else if (nProvided > 2) {
        newErrors.general = "All three values are specified — clear one field to solve for it";
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) { setResult(null); setSteps(null); return; }

    try {
      const input = { flowRate: qVal, velocity: vVal, diameter: dValSI, area: aVal };
      const calc  = calculateContinuity(input);
      const stp   = generateContinuitySteps(input, calc);

      const newComputed = new Set<string>();
      if (qVal === undefined) {
        setFlowRate(fmt(fromFlowRateSI(calc.flowRate, flowRateUnit)));
        newComputed.add("flowRate");
      }
      if (vVal === undefined) {
        setVelocity(fmt(fromVelocitySI(calc.velocity, velocityUnit)));
        newComputed.add("velocity");
      }
      if (!areaLocked && aVal === undefined) {
        setArea(fmt(fromAreaSI(calc.area, areaUnit)));
        newComputed.add("area");
      }

      setComputed(newComputed);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null);
      setSteps(null);
    }
  };

  const diamPlaceholder =
    diameterUnit === "mm"   ? "100"   :
    diameterUnit === "cm"   ? "10"    :
    diameterUnit === "inch" ? "3.94"  :
    diameterUnit === "ft"   ? "0.328" : "0.1";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Continuity Equation Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Solve for flow rate, velocity, or cross-sectional area using Q = A × V for incompressible flow.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Mechanics I
        </span>
      </div>

      <Card>
        <h2 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">Inputs</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Enter any two of the three quantities — the third will be calculated.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Flow Rate */}
          <div>
            <InputField
              label="Flow rate"
              symbol="Q"
              unit={flowRateUnit}
              value={flowRate}
              onChange={touch(setFlowRate, "flowRate")}
              error={errors.flowRate}
              hint={computed.has("flowRate") ? "← calculated result" : undefined}
            />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m³/s", "L/s", "L/min", "m³/h", "ft³/s", "gal/min"] as FlowRateUnit[]).map(u => (
                <Btn key={u} label={u} active={flowRateUnit === u}
                  onClick={() => onUnitChange(() => setFlowRateUnit(u))} />
              ))}
            </div>
          </div>

          {/* Velocity */}
          <div>
            <InputField
              label="Mean velocity"
              symbol="V"
              unit={velocityUnit}
              value={velocity}
              onChange={touch(setVelocity, "velocity")}
              error={errors.velocity}
              hint={computed.has("velocity") ? "← calculated result" : undefined}
            />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m/s", "cm/s", "ft/s", "km/h", "mph"] as VelocityUnit[]).map(u => (
                <Btn key={u} label={u} active={velocityUnit === u}
                  onClick={() => onUnitChange(() => setVelocityUnit(u))} />
              ))}
            </div>
          </div>

          {/* Diameter */}
          <div>
            <InputField
              label="Pipe diameter"
              symbol="D"
              unit={diameterUnit}
              value={diameter}
              onChange={touchDiameter}
              placeholder={diamPlaceholder}
              error={errors.diameter}
              readOnly={diameterLocked}
              hint={diameterLocked ? "Clear area to use diameter instead" : undefined}
            />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m", "mm", "cm", "inch", "ft"] as DiameterUnit[]).map(u => (
                <Btn key={u} label={u} active={diameterUnit === u} disabled={diameterLocked}
                  onClick={() => onUnitChange(() => setDiameterUnit(u))} />
              ))}
            </div>
          </div>

          {/* Area */}
          <div>
            <InputField
              label="Cross-sectional area"
              symbol="A"
              unit={areaUnit}
              value={areaLocked ? previewArea : area}
              onChange={touch(setArea, "area")}
              error={errors.area}
              readOnly={areaLocked}
              hint={
                areaLocked
                  ? "Computed from diameter — clear D to enter area directly"
                  : computed.has("area")
                  ? "← calculated result"
                  : undefined
              }
            />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m²", "cm²", "mm²", "ft²", "in²"] as AreaUnit[]).map(u => (
                <Btn key={u} label={u} active={areaUnit === u}
                  onClick={() => onUnitChange(() => setAreaUnit(u))} />
              ))}
            </div>
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Flow Rate</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  Q = {fmt(fromFlowRateSI(result.flowRate, flowRateUnit))} {flowRateUnit}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Velocity</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  V = {fmt(fromVelocitySI(result.velocity, velocityUnit))} {velocityUnit}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Area</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  A = {fmt(fromAreaSI(result.area, areaUnit))} {areaUnit}
                </p>
              </div>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
            </div>
            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.continuity} />
            <CommonMistakes mistakes={commonMistakes.continuity} />
          </div>
        </ResultsCard>
      )}

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Main Equation:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              Q = A × V
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Q = volumetric flow rate [m³/s]</li>
              <li>A = cross-sectional area [m²] = π D² / 4 for a circular pipe</li>
              <li>V = mean flow velocity [m/s]</li>
            </ul>
          </div>
          <p>
            For incompressible flow, mass is conserved — ρAV = constant along any streamtube.
            Since ρ is constant, AV = constant: a smaller cross-section forces higher velocity.
          </p>
        </div>
      </Card>

      <References refs={REFS_CONTINUITY} />
    </div>
  );
}
