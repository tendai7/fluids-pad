"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_SPECIFIC_GRAVITY } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { ClearButton } from "@/components/ClearButton";

// ── Density units — 1 unit = X kg/m³ ─────────────────────────────────────────
const DENS_UNITS = [
  { key: "kg/m³",  factor: 1           },
  { key: "g/cm³",  factor: 1000        },
  { key: "g/mL",   factor: 1000        },
  { key: "kg/L",   factor: 1000        },
  { key: "lb/ft³", factor: 16.0185     },
  { key: "lb/gal", factor: 119.826     },
] as const;
type DensUnit = typeof DENS_UNITS[number]["key"];

// ── Reference fluids ──────────────────────────────────────────────────────────
const REFERENCES = [
  { key: "water4",  label: "Water at 4°C",     rho: 999.97, note: "Standard for liquids" },
  { key: "water15", label: "Water at 15°C",    rho: 999.10, note: "Petroleum standard"   },
  { key: "water20", label: "Water at 20°C",    rho: 998.20, note: "Common lab temp"      },
  { key: "air",     label: "Air at 20°C, 1 atm", rho: 1.204, note: "Standard for gases"  },
] as const;
type RefKey = typeof REFERENCES[number]["key"];

// ── Substance presets ─────────────────────────────────────────────────────────
const SUBSTANCES = [
  { label: "Water (20°C)",    rho: 998,   type: "liquid" },
  { label: "Seawater",        rho: 1025,  type: "liquid" },
  { label: "Glycerin",        rho: 1261,  type: "liquid" },
  { label: "Milk",            rho: 1030,  type: "liquid" },
  { label: "Gasoline",        rho: 720,   type: "liquid" },
  { label: "Diesel",          rho: 850,   type: "liquid" },
  { label: "Crude oil",       rho: 900,   type: "liquid" },
  { label: "Ethanol",         rho: 789,   type: "liquid" },
  { label: "Mercury",         rho: 13600, type: "liquid" },
  { label: "Honey",           rho: 1400,  type: "liquid" },
  { label: "Ice (0°C)",       rho: 917,   type: "solid"  },
  { label: "Aluminum",        rho: 2700,  type: "solid"  },
  { label: "Steel",           rho: 7850,  type: "solid"  },
  { label: "Lead",            rho: 11340, type: "solid"  },
  { label: "Oak wood",        rho: 720,   type: "solid"  },
  { label: "Pine wood",       rho: 500,   type: "solid"  },
  { label: "Concrete",        rho: 2300,  type: "solid"  },
  { label: "Air (20°C)",      rho: 1.204, type: "gas"    },
  { label: "CO₂ (20°C)",      rho: 1.842, type: "gas"    },
] as const;

function fmt(n: number, sig = 5): string { return parseFloat(n.toPrecision(sig)).toString(); }

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

export default function SpecificGravityCalculator() {
  const [density,   setDensity]   = useState("998");
  const [densUnit,  setDensUnit]  = useState<DensUnit>("kg/m³");
  const [refKey,    setRefKey]    = useState<RefKey>("water4");
  const [errors,    setErrors]    = useState<Record<string, string>>({});

  const [sg,        setSg]        = useState<number | null>(null);
  const [apiGrav,   setApiGrav]   = useState<number | null>(null);
  const [refRho,    setRefRho]    = useState<number | null>(null);
  const [substRho,  setSubstRho]  = useState<number | null>(null);

  const refObj = REFERENCES.find(r => r.key === refKey)!;

  const applySubstance = (rho: number) => {
    setDensity(rho.toString());
    setDensUnit("kg/m³");
    setSg(null); setApiGrav(null); setErrors({});
  };

  const handleClear = () => {
    setDensity(""); setSg(null); setApiGrav(null); setRefRho(null); setSubstRho(null); setErrors({});
  };

  const handleCalculate = () => {
    const errs: Record<string, string> = {};
    const v = parseFloat(density);
    if (isNaN(v) || v <= 0) errs.density = "Must be a positive number";
    setErrors(errs);
    if (Object.keys(errs).length) { setSg(null); return; }

    const unit  = DENS_UNITS.find(u => u.key === densUnit)!;
    const rhoSI = v * unit.factor;
    const rhoRef = refObj.rho;
    const sgVal  = rhoSI / rhoRef;

    setSg(sgVal);
    setRefRho(rhoRef);
    setSubstRho(rhoSI);
    // API gravity: valid for petroleum vs water at 15°C (60°F)
    if (rhoSI < 1100 && rhoSI > 100) {
      const sgAt15 = rhoSI / 999.1;
      setApiGrav(141.5 / sgAt15 - 131.5);
    } else {
      setApiGrav(null);
    }
  };

  const floatStatus = sg !== null && refObj.key !== "air" ? (
    sg < 1   ? { label: "Floats in reference fluid", bg: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" } :
    sg === 1 ? { label: "Neutral buoyancy (same density as reference)", bg: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800" } :
               { label: "Sinks in reference fluid", bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" }
  ) : null;

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Specific Gravity / Relative Density
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          SG = ρ<sub>substance</sub> / ρ<sub>reference</sub> — dimensionless ratio comparing a substance's density
          to a reference fluid (water for liquids, air for gases).
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Properties &amp; Statics
        </span>
      </div>

      {/* Substance presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">Common substances — click to auto-fill</h2>
        <div className="space-y-2">
          {(["liquid","solid","gas"] as const).map(type => (
            <div key={type}>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 capitalize">{type}s</p>
              <div className="flex flex-wrap gap-2">
                {SUBSTANCES.filter(s => s.type === type).map(s => (
                  <button key={s.label} onClick={() => applySubstance(s.rho)}
                    className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div>
            <div className="flex gap-2 mb-3" aria-hidden="true"><span className="px-3 py-1 text-sm opacity-0 select-none">x</span></div>
            <InputField label="Substance density" symbol="ρ" unit={densUnit}
              value={density} onChange={setDensity} placeholder="998" error={errors.density} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {DENS_UNITS.map(u => (
                <Btn key={u.key} label={u.key} active={densUnit === u.key} onClick={() => {
                  const currentFactor = DENS_UNITS.find(u2 => u2.key === densUnit)!.factor;
                  const currentSI = parseFloat(density) * currentFactor;
                  setDensUnit(u.key);
                  if (!isNaN(currentSI)) setDensity(fmt(currentSI / u.factor, 5));
                }} />
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reference fluid</p>
            <div className="space-y-2">
              {REFERENCES.map(r => (
                <label key={r.key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  refKey === r.key
                    ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}>
                  <input type="radio" name="ref" value={r.key} checked={refKey === r.key}
                    onChange={() => setRefKey(r.key)} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{r.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{r.rho} kg/m³ — {r.note}</p>
                  </div>
                </label>
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

      {/* Results */}
      {sg !== null && substRho !== null && refRho !== null && (
        <ResultsCard>
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Specific Gravity  SG = ρ / ρ<sub>ref</sub>
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">SG = {fmt(sg)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {fmt(substRho)} kg/m³ ÷ {fmt(refRho)} kg/m³
              </p>
            </div>

            {floatStatus && (
              <div className={`p-3 rounded-lg border ${floatStatus.bg}`}>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{floatStatus.label}</p>
                {sg < 1 && <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">SG = {fmt(sg, 4)} &lt; 1</p>}
                {sg > 1 && <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">SG = {fmt(sg, 4)} &gt; 1</p>}
              </div>
            )}

            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600">
                {([
                  { id: "sg",     label: <>SG</>,                                   value: fmt(sg, 5)       },
                  { id: "rho",    label: <>ρ (kg/m³)</>,                            value: fmt(substRho, 5) },
                  { id: "rhoref", label: <>ρ<sub>ref</sub> (kg/m³)</>,              value: fmt(refRho, 5)   },
                ] as { id: string; label: React.ReactNode; value: string }[]).map(({ id, label, value }) => (
                  <div key={id} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* API gravity */}
            {apiGrav !== null && (
              <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 p-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
                  API Gravity = {fmt(apiGrav, 4)} °API
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  API = 141.5 / SG₁₅ − 131.5 &nbsp;·&nbsp; SG at 15°C = {fmt(substRho / 999.1, 4)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {apiGrav > 45 ? "Light crude / condensate" :
                   apiGrav > 31.1 ? "Light crude oil" :
                   apiGrav > 22.3 ? "Medium crude oil" :
                   apiGrav > 10   ? "Heavy crude oil" : "Extra heavy / bitumen"}
                </p>
              </div>
            )}
          </div>
        </ResultsCard>
      )}

      {/* Reference table */}
      <Card>
        <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Specific Gravity Reference</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600">
                {["Substance","ρ (kg/m³)","SG (water 4°C)","Floats in water?"].map(h => (
                  <th key={h} className="text-left py-2 pr-4 font-semibold text-gray-900 dark:text-white">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
              {SUBSTANCES.filter(s => s.type !== "gas").map(s => {
                const sgRef = s.rho / 999.97;
                return (
                  <tr key={s.label}>
                    <td className="py-1.5 pr-4">{s.label}</td>
                    <td className="py-1.5 pr-4 font-mono">{s.rho}</td>
                    <td className="py-1.5 pr-4 font-mono">{fmt(sgRef, 4)}</td>
                    <td className="py-1.5 text-xs">{sgRef < 1 ? "Yes" : "No"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-1">Definition:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              SG = ρ<sub>substance</sub> / ρ<sub>reference</sub>  (dimensionless)
            </div>
          </div>
          <div>
            <p className="font-semibold mb-1">API Gravity (petroleum):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              °API = 141.5 / SG₁₅ − 131.5  (SG at 15°C / 60°F)
            </div>
          </div>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>SG &lt; 1 relative to water → substance floats (less dense than water)</li>
            <li>SG &gt; 1 relative to water → substance sinks (denser than water)</li>
            <li>Gases are compared to air (SG<sub>gas</sub> = M<sub>gas</sub> / 28.97)</li>
            <li>SG is numerically equal to density in g/cm³ when using water at 4°C as reference</li>
          </ul>
        </div>
      </Card>

      <References refs={REFS_SPECIFIC_GRAVITY} />
    </div>
  );
}
