"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_WATER_HAMMER } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateWaterHammer,
  generateWaterHammerSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type VelUnit  = "m/s" | "ft/s";
type DensUnit = "kg/m³" | "lb/ft³";
type PresUnit = "Pa" | "kPa" | "bar" | "MPa" | "psi";

const toMs:   Record<VelUnit,  number> = { "m/s": 1, "ft/s": 0.3048 };
const toKgm3: Record<DensUnit, number> = { "kg/m³": 1, "lb/ft³": 16.0185 };
const fromPa: Record<PresUnit, number> = { "Pa": 1, "kPa": 1e-3, "bar": 1e-5, "MPa": 1e-6, "psi": 1 / 6894.76 };

const FLUID_PRESETS = [
  { label: "Water 20°C", density: "998",  note: "Standard cold water" },
  { label: "Seawater",   density: "1025", note: "Ocean water" },
  { label: "Light oil",  density: "870",  note: "Hydraulic oil ~40°C" },
] as const;

const WAVESPEED_PRESETS = [
  { label: "Steel",     value: "1200", note: "Steel pipe, D/t ≈ 100, water" },
  { label: "Cast iron", value: "1100", note: "Typical water main" },
  { label: "Concrete",  value: "1200", note: "Prestressed concrete pipe" },
  { label: "PVC",       value: "400",  note: "Thin-wall PVC, water" },
  { label: "HDPE",      value: "350",  note: "Plastic pipe, water" },
] as const;

function fmt(n: number, sig = 4) { return parseFloat(n.toPrecision(sig)).toString(); }

function Btn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-2 py-0.5 text-xs rounded ${active
        ? "bg-blue-600 text-white"
        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
      {label}
    </button>
  );
}

export default function WaterHammerCalculator() {
  const [velocity,  setVelocity]  = useState("2");
  const [velUnit,   setVelUnit]   = useState<VelUnit>("m/s");
  const [wavespeed, setWavespeed] = useState("1200");
  const [waveUnit,  setWaveUnit]  = useState<VelUnit>("m/s");
  const [density,   setDensity]   = useState("998");
  const [densUnit,  setDensUnit]  = useState<DensUnit>("kg/m³");
  const [presUnit,  setPresUnit]  = useState<PresUnit>("kPa");
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [result,    setResult]    = useState<ReturnType<typeof calculateWaterHammer> | null>(null);
  const [steps,     setSteps]     = useState<ReturnType<typeof generateWaterHammerSteps> | null>(null);

  const handleVelUnitChange = (newUnit: VelUnit) => {
    const v = parseFloat(velocity);
    if (!isNaN(v)) setVelocity(fmt(v * toMs[velUnit] / toMs[newUnit]));
    setVelUnit(newUnit);
  };
  const handleWaveUnitChange = (newUnit: VelUnit) => {
    const w = parseFloat(wavespeed);
    if (!isNaN(w)) setWavespeed(fmt(w * toMs[waveUnit] / toMs[newUnit]));
    setWaveUnit(newUnit);
  };
  const handleDensUnitChange = (newUnit: DensUnit) => {
    const d = parseFloat(density);
    if (!isNaN(d)) setDensity(fmt(d * toKgm3[densUnit] / toKgm3[newUnit]));
    setDensUnit(newUnit);
  };

  const handleClear = () => {
    setVelocity(""); setVelUnit("m/s");
    setWavespeed(""); setWaveUnit("m/s");
    setDensity(""); setDensUnit("kg/m³");
    setPresUnit("kPa");
    setResult(null); setSteps(null); setErrors({});
  };

  const validateInputs = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (isNaN(parseFloat(velocity))  || parseFloat(velocity)  < 0)
      newErrors.velocity  = `Velocity must be ≥ 0 (${velUnit})`;
    if (isNaN(parseFloat(wavespeed)) || parseFloat(wavespeed) <= 0)
      newErrors.wavespeed = `Wave speed must be positive (${waveUnit})`;
    if (isNaN(parseFloat(density))   || parseFloat(density)   <= 0)
      newErrors.density   = `Density must be positive (${densUnit})`;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCalculate = () => {
    if (!validateInputs()) { setResult(null); setSteps(null); return; }
    try {
      const input = {
        velocity:  parseFloat(velocity)  * toMs[velUnit],
        wavespeed: parseFloat(wavespeed) * toMs[waveUnit],
        density:   parseFloat(density)   * toKgm3[densUnit],
      };
      const r = calculateWaterHammer(input);
      setResult(r);
      setSteps(generateWaterHammerSteps(input, r));
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : "An error occurred" });
      setResult(null); setSteps(null);
    }
  };

  const fmtPres = (pa: number) => {
    const val = pa * fromPa[presUnit];
    const dp  = presUnit === "Pa" ? 0 : presUnit === "MPa" ? 4 : 3;
    return val.toFixed(dp);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Water Hammer Calculator</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Calculate pressure surge from instantaneous valve closure using the Joukowsky equation.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 rounded">
          Pipe Networks · Transient
        </span>
      </div>

      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">Fluid Presets</h2>
        <div className="flex flex-wrap gap-2">
          {FLUID_PRESETS.map(p => (
            <button key={p.label} title={p.note}
              onClick={() => setDensity(fmt(parseFloat(p.density) / toKgm3[densUnit]))}
              className="px-3 py-1.5 text-xs rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Velocity */}
          <div className="space-y-1">
            <InputField label="Initial flow velocity" symbol="V" unit={velUnit}
              value={velocity} onChange={setVelocity}
              placeholder={velUnit === "m/s" ? "2" : "6.6"}
              error={errors.velocity} />
            <div className="flex gap-1 ml-1">
              {(["m/s", "ft/s"] as VelUnit[]).map(u => (
                <Btn key={u} label={u} active={velUnit === u} onClick={() => handleVelUnitChange(u)} />
              ))}
            </div>
          </div>

          {/* Wavespeed */}
          <div className="space-y-1">
            <InputField label="Acoustic wavespeed" symbol="a" unit={waveUnit}
              value={wavespeed} onChange={setWavespeed}
              placeholder={waveUnit === "m/s" ? "1200" : "3937"}
              error={errors.wavespeed} />
            <div className="flex gap-1 ml-1">
              {(["m/s", "ft/s"] as VelUnit[]).map(u => (
                <Btn key={u} label={u} active={waveUnit === u} onClick={() => handleWaveUnitChange(u)} />
              ))}
            </div>
            <div className="flex flex-wrap gap-1 ml-1 mt-1">
              {WAVESPEED_PRESETS.map(p => (
                <button key={p.label} title={p.note}
                  onClick={() => setWavespeed(fmt(parseFloat(p.value) / toMs[waveUnit]))}
                  className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600">
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Density */}
          <div className="space-y-1">
            <InputField label="Fluid density" symbol="ρ" unit={densUnit}
              value={density} onChange={setDensity}
              placeholder={densUnit === "kg/m³" ? "998" : "62.3"}
              error={errors.density} />
            <div className="flex gap-1 ml-1">
              {(["kg/m³", "lb/ft³"] as DensUnit[]).map(u => (
                <Btn key={u} label={u} active={densUnit === u} onClick={() => handleDensUnitChange(u)} />
              ))}
            </div>
          </div>
        </div>

        {errors.general && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.general}</p>}
        <button onClick={handleCalculate}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors">
          Calculate
        </button>
        <ClearButton onClear={handleClear} />
      </Card>

      {result && steps && (
        <ResultsCard>
          <div className="space-y-4">

            {/* Output unit toggle */}
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <span>Pressure:</span>
              {(["Pa", "kPa", "bar", "MPa", "psi"] as PresUnit[]).map(u => (
                <Btn key={u} label={u} active={presUnit === u} onClick={() => setPresUnit(u)} />
              ))}
            </div>

            {/* Primary result */}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pressure Surge</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                ΔP = {fmtPres(result.pressureSurge)} {presUnit}
              </p>
            </div>

            {/* Quick-reference grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              {([
                { unit: "kPa", val: (result.pressureSurge * 1e-3).toFixed(2) },
                { unit: "bar", val: (result.pressureSurge * 1e-5).toFixed(4) },
                { unit: "MPa", val: (result.pressureSurge * 1e-6).toFixed(4) },
                { unit: "psi", val: (result.pressureSurge / 6894.76).toFixed(2) },
              ] as const).map(({ unit, val }, i, arr) => (
                <div key={unit} className={`text-center ${i < arr.length - 1 ? "border-r border-gray-200 dark:border-gray-700" : ""}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400">ΔP ({unit})</p>
                  <p className="text-sm font-bold font-mono text-gray-900 dark:text-white">{val}</p>
                </div>
              ))}
            </div>

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.waterHammer} />
            <CommonMistakes mistakes={commonMistakes.waterHammer} />
          </div>
        </ResultsCard>
      )}

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Joukowsky Equation:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">ΔP = ρ × a × ΔV</div>
          </div>
          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>ρ = fluid density [kg/m³]</li>
              <li>a = acoustic (pressure wave) speed in the pipe [m/s]</li>
              <li>ΔV = change in flow velocity (= V for full instantaneous closure) [m/s]</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Typical wavespeed values (water-filled pipes):</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-200 dark:bg-gray-600">
                  <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-left">Pipe material</th>
                  <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-right">a (m/s)</th>
                  <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-right">a (ft/s)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Steel",     "1000–1400", "3280–4590"],
                  ["Cast iron", "900–1300",  "2950–4260"],
                  ["Concrete",  "1000–1300", "3280–4260"],
                  ["PVC",       "300–500",   "980–1640" ],
                  ["HDPE",      "200–400",   "660–1310" ],
                ].map(([mat, ms, fts]) => (
                  <tr key={mat}>
                    <td className="border border-gray-300 dark:border-gray-500 px-3 py-1">{mat}</td>
                    <td className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-right font-mono">{ms}</td>
                    <td className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-right font-mono">{fts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Water hammer is a transient pressure surge caused by rapid valve closure. The Joukowsky
            equation gives the maximum surge for instantaneous closure. Slow closure over more than
            2L/a seconds (the pipe period) reduces the surge proportionally.
          </p>
        </div>
      </Card>

      <References refs={REFS_WATER_HAMMER} />
    </div>
  );
}
