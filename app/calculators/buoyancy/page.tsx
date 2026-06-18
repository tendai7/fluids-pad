"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_BUOYANCY } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateBuoyancy,
  generateBuoyancySteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

// ── Unit types ────────────────────────────────────────────────────────────────
type VolumeUnit  = "m³" | "L" | "cm³" | "mm³" | "ft³" | "in³";
type DensityUnit = "kg/m³" | "g/cm³" | "kg/L" | "lb/ft³" | "slug/ft³";

// ── Conversions to SI ─────────────────────────────────────────────────────────
const toVolumeSI: Record<VolumeUnit, number> = {
  "m³":  1,
  "L":   1e-3,
  "cm³": 1e-6,
  "mm³": 1e-9,
  "ft³": 0.0283168,
  "in³": 1.6387e-5,
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

// ── Fluid presets (densities stored in kg/m³) ─────────────────────────────────
const FLUID_PRESETS = [
  { label: "Fresh water",  rhoSI: 1000   },
  { label: "Seawater",     rhoSI: 1025   },
  { label: "Oil (generic)",rhoSI: 850    },
  { label: "Mercury",      rhoSI: 13600  },
  { label: "Air (20°C)",   rhoSI: 1.204  },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
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

const volPh: Record<VolumeUnit, string> = {
  "m³": "0.001", "L": "1", "cm³": "1000", "mm³": "1e6", "ft³": "0.035", "in³": "61",
};

// ── Main component ────────────────────────────────────────────────────────────
export default function BuoyancyCalculator() {
  const [volume,         setVolume]         = useState("1");
  const [volumeUnit,     setVolumeUnit]     = useState<VolumeUnit>("L");

  const [fluidDensity,   setFluidDensity]   = useState("1000");
  const [fluidDensUnit,  setFluidDensUnit]  = useState<DensityUnit>("kg/m³");

  const [objDensity,     setObjDensity]     = useState("");
  const [objDensUnit,    setObjDensUnit]    = useState<DensityUnit>("kg/m³");

  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [result,  setResult]  = useState<ReturnType<typeof calculateBuoyancy> | null>(null);
  const [steps,   setSteps]   = useState<ReturnType<typeof generateBuoyancySteps> | null>(null);
  const [inputs,  setInputs]  = useState<{ volM3: number; rhoF: number; rhoObj?: number } | null>(null);

  const handleClear = () => {
    setVolume(""); setFluidDensity(""); setObjDensity("");
    setResult(null); setSteps(null); setErrors({});
  };

  const handleCalculate = () => {
    const errs: Record<string, string> = {};
    const volRaw = parseFloat(volume);
    const rhoFRaw = parseFloat(fluidDensity);
    const rhoObjRaw = objDensity.trim() !== "" ? parseFloat(objDensity) : undefined;

    if (isNaN(volRaw)  || volRaw  <= 0) errs.volume       = "Must be a positive number";
    if (isNaN(rhoFRaw) || rhoFRaw <= 0) errs.fluidDensity = "Must be a positive number";
    if (rhoObjRaw !== undefined && (isNaN(rhoObjRaw) || rhoObjRaw <= 0))
      errs.objDensity = "Must be a positive number";

    setErrors(errs);
    if (Object.keys(errs).length) { setResult(null); setSteps(null); return; }

    const volM3  = volRaw * toVolumeSI[volumeUnit];
    const rhoF   = toDensitySI(rhoFRaw, fluidDensUnit);
    const rhoObj = rhoObjRaw !== undefined ? toDensitySI(rhoObjRaw, objDensUnit) : undefined;

    try {
      const input = { volume: volM3, fluidDensity: rhoF };
      const calc  = calculateBuoyancy(input);
      const stp   = generateBuoyancySteps(input, calc);
      setResult(calc);
      setSteps(stp);
      setInputs({ volM3, rhoF, rhoObj });
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
          Buoyancy Calculator — Archimedes' Principle
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Calculate the buoyant force on a submerged object and determine whether it floats or sinks.
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
              onClick={() => setFluidDensity(
                parseFloat(fromDensitySI(p.rhoSI, fluidDensUnit).toPrecision(5)).toString()
              )}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
              {p.label} ({p.rhoSI} kg/m³)
            </button>
          ))}
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Volume */}
          <div>
            <InputField
              label="Submerged volume" symbol="V" unit={volumeUnit}
              value={volume} onChange={setVolume}
              placeholder={volPh[volumeUnit]} error={errors.volume}
            />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m³","L","cm³","mm³","ft³","in³"] as VolumeUnit[]).map(u => (
                <Btn key={u} label={u} active={volumeUnit === u} onClick={() => setVolumeUnit(u)} />
              ))}
            </div>
          </div>

          {/* Fluid density */}
          <div>
            <InputField
              label="Fluid density" symbol="ρ" unit={fluidDensUnit}
              value={fluidDensity} onChange={setFluidDensity}
              placeholder="1000" error={errors.fluidDensity}
            />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["kg/m³","g/cm³","kg/L","lb/ft³","slug/ft³"] as DensityUnit[]).map(u => (
                <Btn key={u} label={u} active={fluidDensUnit === u} onClick={() => setFluidDensUnit(u)} />
              ))}
            </div>
          </div>

          {/* Object density (optional) */}
          <div className="md:col-span-2">
            <InputField
              label="Object density (optional — for float/sink analysis)" symbol="ρ" unit={objDensUnit}
              value={objDensity} onChange={setObjDensity}
              error={errors.objDensity}
            />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["kg/m³","g/cm³","kg/L","lb/ft³","slug/ft³"] as DensityUnit[]).map(u => (
                <Btn key={u} label={u} active={objDensUnit === u} onClick={() => setObjDensUnit(u)} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              If provided, the calculator will determine whether the object floats, sinks, or is neutrally buoyant.
            </p>
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
      {result && steps && inputs && (() => {
        const Fb    = result.buoyantForce;
        const g     = 9.81;
        const mDisp = Fb / g;
        const { rhoF, rhoObj, volM3 } = inputs;

        let floatSink: null | { floats: boolean; neutral: boolean; fraction?: number; excessN?: number; netN?: number } = null;
        if (rhoObj !== undefined) {
          const W    = rhoObj * volM3 * g;
          const netN = Fb - W;
          const neutral = Math.abs(rhoObj - rhoF) / rhoF < 0.001;
          const floats  = rhoObj < rhoF && !neutral;
          floatSink = {
            floats, neutral,
            fraction: floats ? rhoObj / rhoF : undefined,
            excessN:  !floats && !neutral ? Math.abs(netN) : undefined,
            netN,
          };
        }

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary result */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Buoyant force — F = ρ × V × g
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {fmt(Fb, 6)} N
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  {fmt(Fb / 1000, 6)} kN &nbsp;·&nbsp; {fmt(Fb / 4.44822, 6)} lbf
                </p>
              </div>

              {/* Secondary metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Displaced fluid mass</p>
                  <p className="font-mono font-semibold text-gray-900 dark:text-white">{fmt(mDisp, 5)} kg</p>
                  <p className="text-xs text-gray-400 mt-0.5">= weight of fluid displaced</p>
                </div>
                <div className="px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Equivalent weight support</p>
                  <p className="font-mono font-semibold text-gray-900 dark:text-white">{fmt(mDisp, 5)} kgf</p>
                  <p className="text-xs text-gray-400 mt-0.5">force offset by buoyancy</p>
                </div>
              </div>

              {/* Float/sink analysis */}
              {floatSink && rhoObj !== undefined && (() => {
                const { floats, neutral, fraction, excessN, netN } = floatSink;
                const W = rhoObj * volM3 * g;
                const bgClass = neutral
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
                  : floats
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700";
                const label = neutral ? "Neutrally buoyant" : floats ? "Floats" : "Sinks";

                return (
                  <div className={`rounded-lg border p-4 space-y-2 ${bgClass}`}>
                    <p className="font-semibold text-gray-900 dark:text-white text-lg">{label}</p>
                    <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                      <div className="flex justify-between">
                        <span>Object weight  W = ρ × V × g</span>
                        <span className="font-mono">{fmt(W, 5)} N</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Buoyant force</span>
                        <span className="font-mono">{fmt(Fb, 5)} N</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1 mt-1 font-medium">
                        <span>Net force (upward positive)</span>
                        <span className={`font-mono ${(netN ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {(netN ?? 0) >= 0 ? "+" : ""}{fmt(netN ?? 0, 4)} N
                        </span>
                      </div>
                      {floats && fraction !== undefined && (
                        <p className="pt-1 text-xs text-gray-500 dark:text-gray-400">
                          Floats with {fmt(fraction * 100, 3)}% submerged
                          ({fmt((1 - fraction) * 100, 3)}% above the surface)
                        </p>
                      )}
                      {!floats && !neutral && excessN !== undefined && (
                        <p className="pt-1 text-xs text-gray-500 dark:text-gray-400">
                          Net downward force of {fmt(excessN, 4)} N — object sinks unless supported
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.buoyancy} />
              <CommonMistakes mistakes={commonMistakes.buoyancy} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Archimedes' Principle:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              F = ρ × V × g
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Float / Sink condition:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Object density &lt; fluid density → floats (submerged fraction = ρ<sub>obj</sub> / ρ<sub>fluid</sub>)</li>
              <li>Object density = fluid density → neutrally buoyant</li>
              <li>Object density &gt; fluid density → sinks</li>
            </ul>
          </div>
          <p>
            The buoyant force equals the weight of the fluid displaced. It acts upward through
            the centre of buoyancy (centroid of the submerged volume) and opposes gravity.
          </p>
        </div>
      </Card>

      <References refs={REFS_BUOYANCY} />
    </div>
  );
}
