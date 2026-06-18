"use client";

import React, { useState, useMemo } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_MASS_FLOW_RATE } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateMassFlowRate,
  generateMassFlowRateSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type DiamUnit    = "m" | "mm" | "cm" | "inch" | "ft";
type QUnit       = "m³/s" | "L/s" | "L/min" | "m³/h" | "ft³/s" | "ft³/min" | "gal/min" | "Imp gal/min";
type VelUnit     = "m/s" | "cm/s" | "ft/s" | "km/h" | "mph";
type DensityUnit = "kg/m³" | "g/cm³" | "kg/L" | "lb/ft³" | "slug/ft³";

const diamToM: Record<DiamUnit, number> = { m: 1, mm: 1e-3, cm: 1e-2, inch: 0.0254, ft: 0.3048 };
const qToM3s:  Record<QUnit,   number>  = {
  "m³/s": 1, "L/s": 1e-3, "L/min": 1/60000, "m³/h": 1/3600,
  "ft³/s": 0.028317, "ft³/min": 0.028317/60,
  "gal/min": 6.30902e-5, "Imp gal/min": 7.57682e-5,
};
const toVelSI: Record<VelUnit, number> = {
  "m/s": 1, "cm/s": 0.01, "ft/s": 0.3048, "km/h": 1/3.6, "mph": 0.44704,
};
const toDensitySI = (v: number, u: DensityUnit): number => {
  if (u === "g/cm³" || u === "kg/L") return v * 1000;
  if (u === "lb/ft³")   return v * 16.01846;
  if (u === "slug/ft³") return v * 515.379;
  return v;
};
const fromDensitySI = (v: number, u: DensityUnit): number => {
  if (u === "g/cm³" || u === "kg/L") return v / 1000;
  if (u === "lb/ft³")   return v / 16.01846;
  if (u === "slug/ft³") return v / 515.379;
  return v;
};

// ── Fluid presets (densities in kg/m³) ───────────────────────────────────────
const FLUID_PRESETS = [
  { label: "Water at 20°C",        rhoSI: 998   },
  { label: "Water at 100°C",       rhoSI: 958   },
  { label: "Seawater",             rhoSI: 1025  },
  { label: "Air at 20°C",          rhoSI: 1.204 },
  { label: "Oil SAE 30 (20°C)",    rhoSI: 891   },
  { label: "Glycerin (25°C)",      rhoSI: 1260  },
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

export default function MassFlowRateCalculator() {
  const [density,     setDensity]     = useState("1000");
  const [densityUnit, setDensityUnit] = useState<DensityUnit>("kg/m³");
  const [inputMode,   setInputMode]   = useState<"Q" | "VA">("Q");
  const [flowRate,    setFlowRate]    = useState("0.01");
  const [qUnit,       setQUnit]       = useState<QUnit>("m³/s");
  const [velocity,    setVelocity]    = useState("");
  const [velUnit,     setVelUnit]     = useState<VelUnit>("m/s");
  const [diameter,    setDiameter]    = useState("");
  const [diamUnit,    setDiamUnit]    = useState<DiamUnit>("mm");
  const [area,        setArea]        = useState("");
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [result,      setResult]      = useState<ReturnType<typeof calculateMassFlowRate> | null>(null);
  const [steps,       setSteps]       = useState<ReturnType<typeof generateMassFlowRateSteps> | null>(null);
  const [usedQ,       setUsedQ]       = useState<number | null>(null);

  // Diameter locks area (auto-compute preview)
  const areaLocked = diameter.trim() !== "";
  const diamLocked  = !areaLocked && area.trim() !== "";

  const areaDisplayUnit: Record<DiamUnit, string> = {
    m: "m²", mm: "mm²", cm: "cm²", inch: "in²", ft: "ft²",
  };
  const areaFromM2: Record<DiamUnit, number> = {
    m: 1, mm: 1e6, cm: 1e4, inch: 1550.0031, ft: 10.7639,
  };

  const previewArea = useMemo(() => {
    if (!areaLocked) return "";
    const d = parseFloat(diameter);
    if (isNaN(d) || d <= 0) return "";
    const dSI = d * diamToM[diamUnit];
    const aSI = Math.PI * (dSI / 2) ** 2;
    return fmt(aSI * areaFromM2[diamUnit]);
  }, [diameter, diamUnit, areaLocked]);

  const handleClear = () => {
    setDensity("");
    setDensityUnit("kg/m³");
    setInputMode("Q");
    setFlowRate("");
    setQUnit("m³/s");
    setVelocity("");
    setVelUnit("m/s");
    setDiameter("");
    setDiamUnit("mm");
    setArea("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const rhoRaw = parseFloat(density);
    if (isNaN(rhoRaw) || rhoRaw <= 0) newErrors.density = "Must be a positive number";
    const rhoSI = toDensitySI(rhoRaw, densityUnit);

    let qSI: number | undefined;
    let vSI: number | undefined;
    let dSI: number | undefined;
    let aSI: number | undefined;

    if (inputMode === "Q") {
      const q = parseFloat(flowRate);
      if (isNaN(q) || q < 0) newErrors.flowRate = "Must be non-negative";
      else qSI = q * qToM3s[qUnit];
    } else {
      const v = parseFloat(velocity);
      if (velocity.trim() !== "" && (isNaN(v) || v < 0)) newErrors.velocity = "Must be non-negative";
      else if (velocity.trim() !== "") vSI = v * toVelSI[velUnit];

      const d = parseFloat(diameter);
      if (diameter.trim() !== "" && !isNaN(d) && d > 0) dSI = d * diamToM[diamUnit];
      else if (diameter.trim() !== "") newErrors.diameter = "Must be a positive number";

      if (!areaLocked && area.trim() !== "") {
        const a = parseFloat(area);
        if (isNaN(a) || a <= 0) newErrors.area = "Must be a positive number";
        else aSI = a;
      }

      if (vSI === undefined && !newErrors.velocity) newErrors.velocity = "Velocity is required";
      if (dSI === undefined && aSI === undefined && !newErrors.diameter && !newErrors.area)
        newErrors.general = "Provide diameter or area";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        density: rhoSI,
        flowRate: qSI,
        velocity: vSI,
        diameter: dSI,
        area: aSI,
      };
      const calc = calculateMassFlowRate(input);
      const stp  = generateMassFlowRateSteps(input, calc);
      setResult(calc);
      setSteps(stp);
      if (qSI !== undefined) {
        setUsedQ(qSI);
      } else if (vSI !== undefined) {
        const A = aSI ?? (dSI !== undefined ? Math.PI * (dSI / 2) ** 2 : 0);
        setUsedQ(vSI * A);
      }
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Mass Flow Rate Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Calculate ṁ = ρQ from density and volumetric flow rate, or from density, velocity, and pipe geometry.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Mechanics I
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
              onClick={() => setDensity(
                parseFloat(fromDensitySI(p.rhoSI, densityUnit).toPrecision(5)).toString()
              )}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">Inputs</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Density is always required. Then provide either the volumetric flow rate Q, or velocity V with pipe geometry.
        </p>

        {/* Density */}
        <div className="mb-4 max-w-sm">
          <InputField label="Fluid density" symbol="ρ" unit={densityUnit}
            value={density} onChange={setDensity} error={errors.density} />
          <div className="flex flex-wrap gap-2 -mt-2">
            {(["kg/m³","g/cm³","kg/L","lb/ft³","slug/ft³"] as DensityUnit[]).map(u => (
              <Btn key={u} label={u} active={densityUnit === u} onClick={() => setDensityUnit(u)} />
            ))}
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-4">
          <Btn label="Flow rate Q" active={inputMode === "Q"} onClick={() => setInputMode("Q")} />
          <Btn label="Velocity + geometry" active={inputMode === "VA"} onClick={() => setInputMode("VA")} />
        </div>

        {inputMode === "Q" ? (
          <div className="max-w-sm">
            <InputField label="Volumetric flow rate" symbol="Q" unit={qUnit}
              value={flowRate} onChange={setFlowRate} error={errors.flowRate} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m³/s","L/s","L/min","m³/h","ft³/s","ft³/min","gal/min","Imp gal/min"] as QUnit[]).map(u => (
                <Btn key={u} label={u} active={qUnit === u} onClick={() => setQUnit(u)} />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <InputField label="Mean velocity" symbol="V" unit={velUnit}
                value={velocity} onChange={setVelocity} error={errors.velocity} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m/s","cm/s","ft/s","km/h","mph"] as VelUnit[]).map(u => (
                  <Btn key={u} label={u} active={velUnit === u} onClick={() => setVelUnit(u)} />
                ))}
              </div>
            </div>

            <div>
              <InputField label="Internal diameter" symbol="D" unit={diamUnit}
                value={diameter}
                onChange={(v) => { setDiameter(v); if (v.trim() !== "") setArea(""); }}
                placeholder={diamUnit === "m" ? "0.1" : diamUnit === "mm" ? "100" : diamUnit === "cm" ? "10" : diamUnit === "ft" ? "0.33" : "3.94"}
                error={errors.diameter}
                readOnly={diamLocked}
                hint={diamLocked ? "Clear area to use diameter" : undefined}
              />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m","mm","cm","inch","ft"] as DiamUnit[]).map(u => (
                  <Btn key={u} label={u} active={diamUnit === u} onClick={() => setDiamUnit(u)} />
                ))}
              </div>
            </div>

            <InputField label="Cross-sectional area" symbol="A"
              unit={areaLocked ? areaDisplayUnit[diamUnit] : "m²"}
              value={areaLocked ? previewArea : area}
              onChange={setArea}
              error={errors.area}
              readOnly={areaLocked}
              hint={areaLocked ? "Computed from diameter" : "Enter in m²"}
            />
          </div>
        )}

        {errors.general && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{errors.general}</p>
        )}
        <button onClick={handleCalculate}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors">
          Calculate
        </button>
        <ClearButton onClear={handleClear} />
      </Card>

      {result && steps && (() => {
        const mdot = result.massFlowRate;
        const Q    = usedQ;

        const massUnits: [string, number][] = [
          ["kg/s",   mdot],
          ["kg/min", mdot * 60],
          ["kg/h",   mdot * 3600],
          ["t/h",    mdot * 3.6],
          ["lb/s",   mdot * 2.20462],
          ["lb/min", mdot * 132.277],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Mass flow rate  ṁ = ρ × Q
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {fmt(mdot, 6)} kg/s
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  {fmt(mdot * 3600, 6)} kg/h · {fmt(mdot * 3.6, 5)} t/h
                </p>
              </div>

              {/* Mass flow unit grid */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Mass flow rate in other units
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {massUnits.map(([unit, value]) => (
                    <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                      <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Q summary */}
              {Q !== null && Q !== undefined && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                    Volumetric flow rate used
                  </p>
                  <div className="grid grid-cols-4 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                    {([["m³/s", Q], ["L/s", Q * 1000], ["L/min", Q * 60000], ["m³/h", Q * 3600]] as [string, number][]).map(([unit, value]) => (
                      <div key={unit} className="px-3 py-2.5 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{unit}</p>
                        <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{fmt(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.massFlowRate} />
              <CommonMistakes mistakes={commonMistakes.massFlowRate} />
            </div>
          </ResultsCard>
        );
      })()}

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Main equation:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              ṁ = ρ × Q = ρ × A × V
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>ṁ = mass flow rate [kg/s]</li>
              <li>ρ = fluid density [kg/m³]</li>
              <li>Q = volumetric flow rate [m³/s]</li>
              <li>A = cross-sectional area [m²] = π D² / 4</li>
              <li>V = mean flow velocity [m/s]</li>
            </ul>
          </div>
          <p>
            For steady incompressible flow, mass flow rate is constant along a pipe
            (continuity equation: ρ₁A₁V₁ = ρ₂A₂V₂, and since ρ is constant, A₁V₁ = A₂V₂).
          </p>
        </div>
      </Card>
      <References refs={REFS_MASS_FLOW_RATE} />
    </div>
  );
}