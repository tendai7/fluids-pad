"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_CAVITATION_NUMBER } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateCavitationNumber,
  generateCavitationNumberSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type PresUnit = "Pa" | "kPa" | "bar" | "psi" | "atm";
type VapUnit  = "Pa" | "kPa" | "bar" | "psi" | "atm";
type VelUnit  = "m/s" | "ft/s" | "km/h";
type DensUnit = "kg/m³" | "g/cm³";

const toPa:   Record<PresUnit, number> = { Pa: 1, kPa: 1e3, bar: 1e5, psi: 6894.76, atm: 101325 };
const toVapPa: Record<VapUnit, number> = { Pa: 1, kPa: 1e3, bar: 1e5, psi: 6894.76, atm: 101325 };
const toMS:   Record<VelUnit,  number> = { "m/s": 1, "ft/s": 0.3048, "km/h": 1/3.6 };
const toKgM3: Record<DensUnit, number> = { "kg/m³": 1, "g/cm³": 1000 };

// Water vapor pressure at common temperatures [Pa]
const VAPOR_PRESETS = [
  { label: "Water at  5°C",   Pv: "872",    density: "999.9" },
  { label: "Water at 10°C",   Pv: "1228",   density: "999.7" },
  { label: "Water at 20°C",   Pv: "2338",   density: "998.2" },
  { label: "Water at 30°C",   Pv: "4243",   density: "995.7" },
  { label: "Water at 40°C",   Pv: "7384",   density: "992.2" },
  { label: "Water at 60°C",   Pv: "19940",  density: "983.2" },
  { label: "Water at 80°C",   Pv: "47390",  density: "971.8" },
  { label: "Water at 100°C",  Pv: "101325", density: "958.4" },
] as const;

// Reference pressure presets (absolute)
const P_PRESETS = [
  { label: "Standard atmosphere",   P_kPa: "101.325" },
  { label: "2 atm (pressurised)",   P_kPa: "202.65"  },
  { label: "5 m water column",      P_kPa: "150.3"   },
  { label: "10 m water column",     P_kPa: "199.3"   },
] as const;

// Critical σ reference values for common devices
const SIGMA_CRITICAL = [
  { device: "Sharp-edged orifice",   sigmaC: "0.5 – 2.0"  },
  { device: "Globe valve (full open)", sigmaC: "0.5 – 1.5" },
  { device: "Butterfly valve",       sigmaC: "1.0 – 3.0"  },
  { device: "Centrifugal pump",      sigmaC: "per NPSH curve" },
  { device: "Venturi meter",         sigmaC: "0.1 – 0.3"  },
  { device: "Hydrofoil / propeller", sigmaC: "0.2 – 0.5"  },
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

export default function CavitationNumberCalculator() {
  const [pressure,     setPressure]     = useState("101.325");
  const [presUnit,     setPresUnit]     = useState<PresUnit>("kPa");
  const [vaporPres,    setVaporPres]    = useState("2338");
  const [vapUnit,      setVapUnit]      = useState<VapUnit>("Pa");
  const [velocity,     setVelocity]     = useState("5");
  const [velUnit,      setVelUnit]      = useState<VelUnit>("m/s");
  const [density,      setDensity]      = useState("998.2");
  const [densUnit,     setDensUnit]     = useState<DensUnit>("kg/m³");
  const [selectedVapor, setSelectedVapor] = useState("Water at 20°C");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateCavitationNumber> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateCavitationNumberSteps> | null>(null);

  const handleClear = () => {
    setPressure("");
    setPresUnit("kPa");
    setVaporPres("");
    setVapUnit("Pa");
    setVelocity("");
    setVelUnit("m/s");
    setDensity("");
    setDensUnit("kg/m³");
    setSelectedVapor("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const pRaw   = parseFloat(pressure);
    const pvRaw  = parseFloat(vaporPres);
    const vRaw   = parseFloat(velocity);
    const rhoRaw = parseFloat(density);

    if (isNaN(pRaw)   || pRaw   <= 0)  newErrors.pressure   = "Must be a positive number (absolute)";
    if (isNaN(pvRaw)  || pvRaw  < 0)   newErrors.vaporPres  = "Must be ≥ 0";
    if (isNaN(vRaw)   || vRaw   < 0)   newErrors.velocity   = "Must be non-negative";
    if (isNaN(rhoRaw) || rhoRaw <= 0)  newErrors.density    = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const pSI   = pRaw   * toPa[presUnit];
    const pvSI  = pvRaw  * toVapPa[vapUnit];
    const vSI   = vRaw   * toMS[velUnit];
    const rhoSI = rhoRaw * toKgM3[densUnit];

    try {
      const input = { pressure: pSI, vaporPressure: pvSI, density: rhoSI, velocity: vSI };
      const calc  = calculateCavitationNumber(input);
      const stp   = generateCavitationNumberSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const riskBg = (level?: string) => {
    switch (level) {
      case "safe":       return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      case "caution":    return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
      case "critical":   return "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
      case "cavitating": return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      default:           return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
    }
  };

  const riskLabel = (level?: string): React.ReactNode => {
    switch (level) {
      case "safe":       return <>Safe — no cavitation expected</>;
      case "caution":    return <>Caution — verify against device σ<sub>c</sub></>;
      case "critical":   return <>Critical — cavitation likely incipient</>;
      case "cavitating": return <>Cavitating — P ≤ P<sub>v</sub></>;
      default:           return <></>;
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Cavitation Number Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Dimensionless ratio of pressure margin to dynamic pressure.
          σ = (P − P<sub>v</sub>) / (½ρV²). Predicts cavitation risk in pumps, valves, and hydraulic devices.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
          Fluid Mechanics II · Specialized
        </span>
      </div>

      {/* Vapor pressure presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Water vapor pressure by temperature — click to auto-fill P<sub>v</sub> and ρ
        </h2>
        <div className="flex flex-wrap gap-2">
          {VAPOR_PRESETS.map((p) => (
            <button key={p.label}
              onClick={() => {
                setVaporPres(p.Pv);
                setVapUnit("Pa");
                setDensity(p.density); setDensUnit("kg/m³");
                setSelectedVapor(p.label);
              }}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                selectedVapor === p.label
                  ? "bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-800 dark:text-blue-200"
                  : "bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Absolute pressure P */}
          <div>
            <InputField label="Local absolute pressure" symbol="P" unit={presUnit}
              value={pressure} onChange={setPressure}
              placeholder={presUnit === "Pa" ? "101325" : presUnit === "kPa" ? "101.3" : presUnit === "bar" ? "1.013" : presUnit === "psi" ? "14.7" : "1"}
              error={errors.pressure} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["Pa", "kPa", "bar", "psi", "atm"] as PresUnit[]).map(u => (
                <Btn key={u} label={u} active={presUnit === u} onClick={() => {
                  const si = parseFloat(pressure) * toPa[presUnit];
                  setPresUnit(u);
                  if (!isNaN(si)) setPressure(fmt(si / toPa[u]));
                }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {P_PRESETS.map(p => (
                <button key={p.label}
                  onClick={() => { setPressure(p.P_kPa); setPresUnit("kPa"); }}
                  className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-600 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-600 transition-colors">
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Always use <strong>absolute</strong> pressure — cavitation occurs when P reaches P<sub>v</sub>.
            </p>
          </div>

          {/* Vapor pressure Pv */}
          <div>
            <InputField label="Vapor pressure" symbol="Pv" unit={vapUnit}
              value={vaporPres} onChange={setVaporPres}
              placeholder={vapUnit === "Pa" ? "2338" : vapUnit === "kPa" ? "2.338" : vapUnit === "bar" ? "0.02338" : vapUnit === "psi" ? "0.339" : "0.023"}
              error={errors.vaporPres} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["Pa", "kPa", "bar", "psi", "atm"] as VapUnit[]).map(u => (
                <Btn key={u} label={u} active={vapUnit === u} onClick={() => {
                  const si = parseFloat(vaporPres) * toVapPa[vapUnit];
                  setVapUnit(u);
                  if (!isNaN(si)) setVaporPres(fmt(si / toVapPa[u]));
                }} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Use the preset buttons above to auto-fill P<sub>v</sub> for water at common temperatures.
            </p>
          </div>

          {/* Velocity */}
          <div>
            <InputField label="Reference velocity" symbol="V" unit={velUnit}
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
        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Cavitation number  σ = (P − P<sub>v</sub>) / (½ρV²)
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  σ = {fmt(result.sigma, 5)}
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  NPSH = {fmt(result.npsh, 5)} m&nbsp;&nbsp;({fmt(result.npshFt, 4)} ft)
                </p>
              </div>

              {/* Related quantities */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Related quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {([
                    { label: <>P − P<sub>v</sub> (Pa)</>,   value: fmt(result.pressureMargin, 5)   },
                    { label: <>½ρV² (Pa)</>,                value: fmt(result.dynamicPressure, 5)  },
                    { label: <>NPSH (m)</>,                 value: fmt(result.npsh, 5)             },
                  ] as { label: React.ReactNode; value: string }[]).map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk banner */}
              <div className={`p-4 rounded-lg border ${riskBg(result.riskLevel)}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  σ = {fmt(result.sigma, 5)} — {riskLabel(result.riskLevel)}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.cavitationNumber} />
              <CommonMistakes mistakes={commonMistakes.cavitationNumber} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Cavitation number σ (also called cavitation index):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>σ = (P − P<sub>v</sub>) / (½ρV²)</div>
              <div>NPSH = (P − P<sub>v</sub>) / (ρg)&nbsp;&nbsp;&nbsp;&nbsp;[m]</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Cavitation occurs when local pressure drops to P<sub>v</sub>, i.e. when σ → 0.
              P must be absolute pressure.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Risk classification:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">σ range</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ["σ ≥ 2",         "Safe — no cavitation expected for most geometries"],
                  ["0.5 ≤ σ < 2",   "Caution — verify against device-specific critical σ"],
                  ["0 < σ < 0.5",   "Critical — cavitation inception likely"],
                  ["σ ≤ 0",         "Cavitating — P ≤ Pv, bubbles forming"],
                ].map(([range, risk]) => (
                  <tr key={range}>
                    <td className="py-1.5 pr-4 font-mono">{range}</td>
                    <td className="py-1.5">{risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Critical σ for common devices:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Device</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">σ<sub>c</sub></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {SIGMA_CRITICAL.map(({ device, sigmaC }) => (
                  <tr key={device}>
                    <td className="py-1.5 pr-4">{device}</td>
                    <td className="py-1.5 font-mono">{sigmaC}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Cavitation occurs when σ &lt; σ<sub>c</sub>. These are indicative ranges — always consult manufacturer data.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Water vapor pressure P<sub>v</sub>:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Temperature</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">P<sub>v</sub> (Pa)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {VAPOR_PRESETS.map(({ label, Pv }) => (
                  <tr key={label}>
                    <td className="py-1.5 pr-4">{label}</td>
                    <td className="py-1.5 font-mono">{Pv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>σ = cavitation number (dimensionless)</li>
              <li>P = local absolute pressure [Pa]</li>
              <li>P<sub>v</sub> = fluid vapor pressure at operating temperature [Pa]</li>
              <li>ρ = fluid density [kg/m³]</li>
              <li>V = reference velocity [m/s]</li>
              <li>NPSH = net positive suction head [m]</li>
            </ul>
          </div>
        </div>
      </Card>
      <References refs={REFS_CAVITATION_NUMBER} />
    </div>
  );
}