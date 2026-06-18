"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_SEDIMENT_TRANSPORT } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateSedimentTransport,
  generateSedimentTransportSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type DiamUnit = "m" | "mm";
type DensUnit = "kg/m³" | "g/cm³";

const toDm:   Record<DiamUnit, number> = { m: 1, mm: 1e-3 };
const toKgM3: Record<DensUnit, number> = { "kg/m³": 1, "g/cm³": 1000 };

const SEDIMENT_PRESETS = [
  { label: "Quartz sand",    density: "2650" },
  { label: "Limestone",      density: "2710" },
  { label: "Feldspar",       density: "2600" },
  { label: "Coal",           density: "1350" },
  { label: "Heavy minerals", density: "4200" },
] as const;

const FLUID_PRESETS = [
  { label: "Fresh water 20°C", density: "998"  },
  { label: "Fresh water 10°C", density: "1000" },
  { label: "Seawater",         density: "1025" },
] as const;

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

export default function SedimentTransportCalculator() {
  const [particleDiameter, setParticleDiameter] = useState("0.2");
  const [diamUnit,         setDiamUnit]          = useState<DiamUnit>("mm");
  const [sedimentDensity,  setSedimentDensity]   = useState("2650");
  const [sedDensUnit,      setSedDensUnit]        = useState<DensUnit>("kg/m³");
  const [fluidDensity,     setFluidDensity]       = useState("1000");
  const [fluidDensUnit,    setFluidDensUnit]      = useState<DensUnit>("kg/m³");
  const [shearStress,      setShearStress]        = useState("1.5");
  const [errors,           setErrors]             = useState<Record<string, string>>({});
  const [result,           setResult]             = useState<ReturnType<typeof calculateSedimentTransport> | null>(null);
  const [steps,            setSteps]              = useState<ReturnType<typeof generateSedimentTransportSteps> | null>(null);

  const handleClear = () => {
    setParticleDiameter("");
    setDiamUnit("mm");
    setSedimentDensity("");
    setSedDensUnit("kg/m³");
    setFluidDensity("");
    setFluidDensUnit("kg/m³");
    setShearStress("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const dRaw   = parseFloat(particleDiameter);
    const rsRaw  = parseFloat(sedimentDensity);
    const rfRaw  = parseFloat(fluidDensity);
    const tauRaw = parseFloat(shearStress);

    if (isNaN(dRaw)   || dRaw   <= 0) newErrors.particleDiameter = "Must be a positive number";
    if (isNaN(rsRaw)  || rsRaw  <= 0) newErrors.sedimentDensity  = "Must be a positive number";
    if (isNaN(rfRaw)  || rfRaw  <= 0) newErrors.fluidDensity     = "Must be a positive number";
    if (isNaN(tauRaw) || tauRaw <= 0) newErrors.shearStress      = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        particleDiameter: dRaw  * toDm[diamUnit],
        sedimentDensity:  rsRaw * toKgM3[sedDensUnit],
        fluidDensity:     rfRaw * toKgM3[fluidDensUnit],
        shearStress:      tauRaw,
      };
      const calculatedResult = calculateSedimentTransport(input);
      const calculatedSteps  = generateSedimentTransportSteps(input, calculatedResult);
      setResult(calculatedResult);
      setSteps(calculatedSteps);
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : "An error occurred" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Sediment Transport Calculator</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Determine whether bed sediment moves using the Shields criterion for incipient motion.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 rounded">
          Open Channel Flow · Sediment
        </span>
      </div>

      {/* Material / fluid presets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
            Sediment material — sets ρ<sub>s</sub>
          </h2>
          <div className="flex flex-wrap gap-2">
            {SEDIMENT_PRESETS.map((p) => (
              <button key={p.label}
                onClick={() => { setSedimentDensity(p.density); setSedDensUnit("kg/m³"); }}
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
                {p.label}
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
            Fluid — sets ρ
          </h2>
          <div className="flex flex-wrap gap-2">
            {FLUID_PRESETS.map((p) => (
              <button key={p.label}
                onClick={() => { setFluidDensity(p.density); setFluidDensUnit("kg/m³"); }}
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
                {p.label}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Particle diameter */}
          <div>
            <InputField label="Particle diameter" symbol="d" unit={diamUnit}
              value={particleDiameter} onChange={setParticleDiameter}
              placeholder={diamUnit === "mm" ? "0.2" : "0.0002"}
              error={errors.particleDiameter} />
            <div className="flex gap-2 -mt-2">
              {(["m", "mm"] as DiamUnit[]).map(u => (
                <Btn key={u} label={u} active={diamUnit === u} onClick={() => setDiamUnit(u)} />
              ))}
            </div>
          </div>

          {/* Sediment density */}
          <div>
            <InputField label="Sediment density" symbol="ρs" unit={sedDensUnit}
              value={sedimentDensity} onChange={setSedimentDensity}
              placeholder={sedDensUnit === "kg/m³" ? "2650" : "2.65"}
              error={errors.sedimentDensity} />
            <div className="flex gap-2 -mt-2">
              {(["kg/m³", "g/cm³"] as DensUnit[]).map(u => (
                <Btn key={u} label={u} active={sedDensUnit === u} onClick={() => setSedDensUnit(u)} />
              ))}
            </div>
          </div>

          {/* Fluid density */}
          <div>
            <InputField label="Fluid density" symbol="ρ" unit={fluidDensUnit}
              value={fluidDensity} onChange={setFluidDensity}
              placeholder={fluidDensUnit === "kg/m³" ? "1000" : "1.0"}
              error={errors.fluidDensity} />
            <div className="flex gap-2 -mt-2">
              {(["kg/m³", "g/cm³"] as DensUnit[]).map(u => (
                <Btn key={u} label={u} active={fluidDensUnit === u} onClick={() => setFluidDensUnit(u)} />
              ))}
            </div>
          </div>

          {/* Bed shear stress */}
          <div>
            <InputField label="Bed shear stress" symbol="τ" unit="Pa"
              value={shearStress} onChange={setShearStress} error={errors.shearStress} />
          </div>
        </div>
        {errors.general && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.general}</p>}
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
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Shields Parameter</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                τ<sup>*</sup> = {result.shieldsCriterion.toFixed(4)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Critical Shields θ<sub>cr</sub></p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{result.shieldsThreshold.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Critical shear stress τ<sub>cr</sub></p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{result.criticalShearStress.toFixed(4)} Pa</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Mobility ratio τ<sup>*</sup>/θ<sub>cr</sub></p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{result.mobilityRatio.toFixed(3)}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Sediment motion</p>
                <span className={`inline-block mt-1 px-3 py-1 rounded text-sm font-semibold ${
                  result.isMoving
                    ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                    : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                }`}>
                  {result.isMoving ? "Moving" : "Stable"}
                </span>
              </div>
            </div>
            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.sedimentTransport} />
            <CommonMistakes mistakes={commonMistakes.sedimentTransport} />
          </div>
        </ResultsCard>
      )}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Shields Parameter:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>τ<sup>*</sup> = τ / [(ρ<sub>s</sub> − ρ) × g × d]</div>
              <div>τ<sub>cr</sub> = θ<sub>cr</sub> × (ρ<sub>s</sub> − ρ) × g × d</div>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>τ = bed shear stress [Pa]</li>
              <li>ρ<sub>s</sub> = sediment density [kg/m³]</li>
              <li>ρ = fluid density [kg/m³]</li>
              <li>d = particle diameter [m]</li>
              <li>θ<sub>cr</sub> ≈ 0.047 for quartz sand in water (Shields 1936)</li>
              <li>τ<sub>cr</sub> = critical bed shear stress for incipient motion [Pa]</li>
              <li>Mobility ratio τ<sup>*</sup>/θ<sub>cr</sub> &gt; 1 → sediment moves; &lt; 1 → bed stable</li>
            </ul>
          </div>
          <p>
            Sediment begins to move when τ<sup>*</sup> &gt; θ<sub>cr</sub>. The critical Shields
            parameter depends on the particle Reynolds number Re<sub>*</sub> = u<sub>*</sub>d/ν
            and ranges from about 0.03 to 0.06 for typical sands.
          </p>
        </div>
      </Card>

      <References refs={REFS_SEDIMENT_TRANSPORT} />
    </div>
  );
}
