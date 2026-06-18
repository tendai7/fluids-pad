"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_WEBER_NUMBER } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateWeberNumber,
  generateWeberNumberSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type VelUnit  = "m/s" | "ft/s" | "km/h";
type LenUnit  = "m" | "mm" | "cm" | "μm" | "inch";
type DensUnit = "kg/m³" | "g/cm³";

const toMS:   Record<VelUnit,  number> = { "m/s": 1, "ft/s": 0.3048, "km/h": 1/3.6 };
const toLm:   Record<LenUnit,  number> = { m: 1, mm: 1e-3, cm: 1e-2, "μm": 1e-6, inch: 0.0254 };
const toKgM3: Record<DensUnit, number> = { "kg/m³": 1, "g/cm³": 1000 };

// Fluid presets — fills density
const FLUID_PRESETS = [
  { label: "Water at 20°C",  density: "998"   },
  { label: "Water at 60°C",  density: "983"   },
  { label: "Mercury",        density: "13600" },
  { label: "Ethanol",        density: "789"   },
  { label: "Glycerin",       density: "1261"  },
  { label: "Air at 20°C",    density: "1.204" },
] as const;

// Surface tension presets at 20°C (N/m)
const SIGMA_PRESETS = [
  { label: "Water / air at 20°C",   sigma: "0.0728" },
  { label: "Water / air at 60°C",   sigma: "0.0663" },
  { label: "Ethanol / air",         sigma: "0.0223" },
  { label: "Mercury / air",         sigma: "0.487"  },
  { label: "Glycerin / air",        sigma: "0.0634" },
  { label: "Benzene / air",         sigma: "0.0289" },
  { label: "Liquid steel",          sigma: "1.8"    },
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

export default function WeberNumberCalculator() {
  const [density,       setDensity]       = useState("998");
  const [densUnit,      setDensUnit]       = useState<DensUnit>("kg/m³");
  const [velocity,      setVelocity]       = useState("5");
  const [velUnit,       setVelUnit]        = useState<VelUnit>("m/s");
  const [length,        setLength]         = useState("1");
  const [lenUnit,       setLenUnit]        = useState<LenUnit>("mm");
  const [surfaceTension,setSurfaceTension] = useState("0.0728");
  const [selectedSigma, setSelectedSigma] = useState("Water / air at 20°C");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateWeberNumber> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateWeberNumberSteps> | null>(null);

  const handleClear = () => {
    setDensity("");
    setDensUnit("kg/m³");
    setVelocity("");
    setVelUnit("m/s");
    setLength("");
    setLenUnit("mm");
    setSurfaceTension("");
    setSelectedSigma("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const rhoRaw = parseFloat(density);
    const vRaw   = parseFloat(velocity);
    const lRaw   = parseFloat(length);
    const sigRaw = parseFloat(surfaceTension);

    if (isNaN(rhoRaw) || rhoRaw <= 0) newErrors.density       = "Must be a positive number";
    if (isNaN(vRaw)   || vRaw   <  0) newErrors.velocity      = "Must be non-negative";
    if (isNaN(lRaw)   || lRaw   <= 0) newErrors.length        = "Must be a positive number";
    if (isNaN(sigRaw) || sigRaw <= 0) newErrors.surfaceTension = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const rhoSI = rhoRaw * toKgM3[densUnit];
    const vSI   = vRaw   * toMS[velUnit];
    const lSI   = lRaw   * toLm[lenUnit];

    try {
      const input = { density: rhoSI, velocity: vSI, length: lSI, surfaceTension: sigRaw };
      const calc  = calculateWeberNumber(input);
      const stp   = generateWeberNumberSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const regimeBg = (r?: string) => {
    switch (r) {
      case "surfaceTensionDominated": return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      case "competing":               return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
      case "deformation":             return "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
      case "breakup":                 return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      default:                        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
    }
  };

  const regimeLabel = (r?: string) => {
    switch (r) {
      case "surfaceTensionDominated": return "Surface tension dominated";
      case "competing":               return "Competing forces";
      case "deformation":             return "Droplet deformation / breakup";
      case "breakup":                 return "Catastrophic breakup";
      default: return "";
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Weber Number Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          We = ρV²L / σ — ratio of inertial to surface tension forces.
          Determines whether droplets, bubbles, or free surfaces remain stable or break up.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Mechanics II
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Density */}
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

          {/* Velocity */}
          <div>
            <InputField label="Relative velocity" symbol="V" unit={velUnit}
              value={velocity} onChange={setVelocity}
              placeholder={velUnit === "m/s" ? "5" : velUnit === "ft/s" ? "16.4" : "18"}
              error={errors.velocity} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m/s", "ft/s", "km/h"] as VelUnit[]).map(u => (
                <Btn key={u} label={u} active={velUnit === u} onClick={() => {
                  const si = parseFloat(velocity) * toMS[velUnit];
                  setVelUnit(u);
                  if (!isNaN(si)) setVelocity(fmt(si / toMS[u]));
                }} />
              ))}
            </div>
          </div>

          {/* Length */}
          <div>
            <InputField label="Characteristic length" symbol="L" unit={lenUnit}
              value={length} onChange={setLength}
              placeholder={lenUnit === "m" ? "0.001" : lenUnit === "mm" ? "1" : lenUnit === "cm" ? "0.1" : lenUnit === "μm" ? "1000" : "0.039"}
              error={errors.length} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m", "mm", "cm", "μm", "inch"] as LenUnit[]).map(u => (
                <Btn key={u} label={u} active={lenUnit === u} onClick={() => {
                  const si = parseFloat(length) * toLm[lenUnit];
                  setLenUnit(u);
                  if (!isNaN(si)) setLength(fmt(si / toLm[u]));
                }} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Typically droplet or bubble diameter, film thickness, or jet diameter.
            </p>
          </div>

          {/* Surface tension + presets */}
          <div>
            <InputField label="Surface tension" symbol="σ" unit="N/m"
              value={surfaceTension} onChange={setSurfaceTension} error={errors.surfaceTension} />
            <div className="flex items-center gap-2 -mt-2">
              <select
                value={selectedSigma}
                onChange={(e) => {
                  const lbl = e.target.value;
                  setSelectedSigma(lbl);
                  const p = SIGMA_PRESETS.find(x => x.label === lbl);
                  if (p) setSurfaceTension(p.sigma);
                }}
                className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Fluid pair preset…</option>
                {SIGMA_PRESETS.map(p => (
                  <option key={p.label} value={p.label}>{p.label} — σ = {p.sigma} N/m</option>
                ))}
              </select>
            </div>
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
      {result && steps && (() => {
        const We = result.weberNumber;
        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Weber number  We = ρV²L / σ
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  We = {fmt(We, 5)}
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  ρV² = {fmt(result.dynamicPressure, 4)} Pa&nbsp;&nbsp;|&nbsp;&nbsp;
                  σ/L = {fmt(result.capillaryPressure, 4)} Pa
                </p>
              </div>

              {/* Related quantities */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Pressure scales
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {([
                    { label: <>Dynamic  ρV² (Pa)</>,          value: fmt(result.dynamicPressure, 5)  },
                    { label: <>Capillary  σ/L (Pa)</>,        value: fmt(result.capillaryPressure, 5) },
                    { label: <>We = ρV²L/σ</>,               value: fmt(We, 5)                       },
                  ] as { label: React.ReactNode; value: string }[]).map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Regime banner */}
              <div className={`p-4 rounded-lg border ${regimeBg(result.regime)}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {regimeLabel(result.regime)}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.weberNumber} />
              <CommonMistakes mistakes={commonMistakes.weberNumber} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Weber number:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>We = ρV²L / σ&nbsp;&nbsp;&nbsp;&nbsp;[dimensionless]</div>
              <div>We = (dynamic pressure ρV²) / (capillary pressure σ/L)</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Regime classification (liquid drops in gas):</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">We range</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Behaviour</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ["We < 1",      "Surface tension dominates — droplets spherical, interface stable"],
                  ["1 – 12",      "Competing forces — droplet deforms but may remain intact"],
                  ["12 – 100",    "Inertia dominates — bag breakup or stripping (critical We ≈ 12)"],
                  ["We > 100",    "Catastrophic atomisation — fine droplets, spray formation"],
                ].map(([range, beh]) => (
                  <tr key={range}>
                    <td className="py-1.5 pr-4 font-mono">{range}</td>
                    <td className="py-1.5 text-xs">{beh}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Thresholds are indicative for liquid drops in air. Critical We varies with Ohnesorge number (Oh) and geometry.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Common surface tension values σ (N/m) at 20°C:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Fluid pair</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">σ (N/m)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {SIGMA_PRESETS.map(({ label, sigma }) => (
                  <tr key={label}>
                    <td className="py-1.5 pr-4">{label}</td>
                    <td className="py-1.5 font-mono">{sigma}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Applications:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Droplet breakup in sprays, fuel injection, inkjet printing</li>
              <li>Bubble dynamics in boiling and cavitation</li>
              <li>Thin film stability in coating processes</li>
              <li>Rain impact on surfaces</li>
              <li>Two-phase flow regime determination</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>We = Weber number (dimensionless)</li>
              <li>ρ = fluid density [kg/m³]</li>
              <li>V = characteristic velocity (relative velocity between phases) [m/s]</li>
              <li>L = characteristic length (droplet/bubble diameter, jet diameter) [m]</li>
              <li>σ = surface tension [N/m]</li>
            </ul>
          </div>
        </div>
      </Card>

      <References refs={REFS_WEBER_NUMBER} />
    </div>
  );
}
