"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_PRESSURE_RECOVERY } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculatePressureRecovery,
  generatePressureRecoverySteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type DiamUnit = "m" | "mm" | "cm" | "inch";
type VelUnit  = "m/s" | "ft/s" | "km/h";
type DensUnit = "kg/m³" | "g/cm³";
type PresUnit = "Pa" | "kPa" | "bar" | "psi";

const toDm:   Record<DiamUnit, number> = { m: 1, mm: 1e-3, cm: 1e-2, inch: 0.0254 };
const toMS:   Record<VelUnit,  number> = { "m/s": 1, "ft/s": 0.3048, "km/h": 1/3.6 };
const toKgM3: Record<DensUnit, number> = { "kg/m³": 1, "g/cm³": 1000 };

const FLUID_PRESETS = [
  { label: "Water at 20°C",  density: "998"   },
  { label: "Water at 60°C",  density: "983"   },
  { label: "Seawater",       density: "1025"  },
  { label: "Air at 20°C",    density: "1.204" },
  { label: "Engine oil",     density: "880"   },
] as const;

// Loss coefficient K presets (referenced to inlet ½ρV₁²)
const K_PRESETS = [
  { label: "Ideal diffuser (no losses)",          K: "0"    },
  { label: "Well-designed gradual diffuser",      K: "0.05" },
  { label: "Typical conical diffuser",            K: "0.15" },
  { label: "Poor-quality diffuser / separation",  K: "0.40" },
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

export default function PressureRecoveryCalculator() {
  const [diam1,      setDiam1]      = useState("50");
  const [diam1Unit,  setDiam1Unit]  = useState<DiamUnit>("mm");
  const [diam2,      setDiam2]      = useState("100");
  const [diam2Unit,  setDiam2Unit]  = useState<DiamUnit>("mm");
  const [velocity,   setVelocity]   = useState("5");
  const [velUnit,    setVelUnit]    = useState<VelUnit>("m/s");
  const [density,    setDensity]    = useState("998");
  const [densUnit,   setDensUnit]   = useState<DensUnit>("kg/m³");
  const [K,          setK]          = useState("0");
  const [selectedK,  setSelectedK]  = useState("");
  const [useBordaCarnot, setUseBordaCarnot] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculatePressureRecovery> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generatePressureRecoverySteps> | null>(null);

  const handleClear = () => {
    setDiam1("");
    setDiam1Unit("mm");
    setDiam2("");
    setDiam2Unit("mm");
    setVelocity("");
    setVelUnit("m/s");
    setDensity("");
    setDensUnit("kg/m³");
    setK("");
    setSelectedK("");
    setUseBordaCarnot(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const d1Raw  = parseFloat(diam1);
    const d2Raw  = parseFloat(diam2);
    const vRaw   = parseFloat(velocity);
    const rhoRaw = parseFloat(density);
    const kVal   = parseFloat(K);

    if (isNaN(d1Raw)  || d1Raw  <= 0)  newErrors.diam1    = "Must be a positive number";
    if (isNaN(d2Raw)  || d2Raw  <= 0)  newErrors.diam2    = "Must be a positive number";
    if (isNaN(vRaw)   || vRaw   <  0)  newErrors.velocity = "Must be non-negative";
    if (isNaN(rhoRaw) || rhoRaw <= 0)  newErrors.density  = "Must be a positive number";
    if (!useBordaCarnot && (isNaN(kVal) || kVal < 0)) newErrors.K = "Must be ≥ 0";

    // Cross-check: D₂ must be larger than D₁ in same-unit comparison
    const d1SI = d1Raw * toDm[diam1Unit];
    const d2SI = d2Raw * toDm[diam2Unit];
    if (!isNaN(d1Raw) && !isNaN(d2Raw) && d2SI <= d1SI)
      newErrors.diam2 = "Outlet must be larger than inlet for pressure recovery";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const vSI   = vRaw   * toMS[velUnit];
    const rhoSI = rhoRaw * toKgM3[densUnit];

    try {
      const input = {
        diameter1: d1SI, diameter2: d2SI,
        velocity1: vSI, density: rhoSI,
        lossCoefficient: useBordaCarnot ? undefined : kVal,
        useBordaCarnot,
      };
      const calc = calculatePressureRecovery(input);
      const stp  = generatePressureRecoverySteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const effBg = result
    ? result.efficiency >= 0.85 ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
    : result.efficiency >= 0.60 ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
    : "";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Pressure Recovery Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Pressure rise in a diffuser (expanding section) — ideal Bernoulli recovery vs
          actual recovery with losses. Borda-Carnot for sudden expansions.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
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

          {/* Inlet diameter D₁ */}
          <div>
            <InputField label="Inlet diameter" symbol="D₁" unit={diam1Unit}
              value={diam1} onChange={setDiam1}
              placeholder={diam1Unit === "m" ? "0.05" : diam1Unit === "cm" ? "5" : diam1Unit === "inch" ? "1.97" : "50"}
              error={errors.diam1} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m", "mm", "cm", "inch"] as DiamUnit[]).map(u => (
                <Btn key={u} label={u} active={diam1Unit === u} onClick={() => {
                  const si = parseFloat(diam1) * toDm[diam1Unit];
                  setDiam1Unit(u);
                  if (!isNaN(si)) setDiam1(fmt(si / toDm[u]));
                }} />
              ))}
            </div>
          </div>

          {/* Outlet diameter D₂ */}
          <div>
            <InputField label="Outlet diameter" symbol="D₂" unit={diam2Unit}
              value={diam2} onChange={setDiam2}
              placeholder={diam2Unit === "m" ? "0.1" : diam2Unit === "cm" ? "10" : diam2Unit === "inch" ? "3.94" : "100"}
              error={errors.diam2} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m", "mm", "cm", "inch"] as DiamUnit[]).map(u => (
                <Btn key={u} label={u} active={diam2Unit === u} onClick={() => {
                  const si = parseFloat(diam2) * toDm[diam2Unit];
                  setDiam2Unit(u);
                  if (!isNaN(si)) setDiam2(fmt(si / toDm[u]));
                }} />
              ))}
            </div>
          </div>

          {/* Inlet velocity */}
          <div>
            <InputField label="Inlet velocity" symbol="V₁" unit={velUnit}
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

          {/* Loss coefficient K */}
          <div className="md:col-span-2">
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Loss coefficient K (referenced to inlet dynamic pressure ½ρV₁²)
              </p>

              {/* Borda-Carnot toggle */}
              <div className="flex items-center gap-3 mb-3">
                <input type="checkbox" id="bordaCarnot" checked={useBordaCarnot}
                  onChange={(e) => setUseBordaCarnot(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded" />
                <label htmlFor="bordaCarnot" className="text-sm text-gray-700 dark:text-gray-300">
                  Use Borda-Carnot (sudden expansion): K = (1 − A₁/A₂)² — auto-computed from geometry
                </label>
              </div>

              {!useBordaCarnot && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <InputField label="Loss coefficient" symbol="K" unit="dimensionless"
                    value={K} onChange={setK} error={errors.K} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Diffuser type preset
                    </label>
                    <select
                      value={selectedK}
                      onChange={(e) => {
                        const lbl = e.target.value;
                        setSelectedK(lbl);
                        const p = K_PRESETS.find(x => x.label === lbl);
                        if (p) setK(p.K);
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select diffuser type…</option>
                      {K_PRESETS.map(p => (
                        <option key={p.label} value={p.label}>{p.label} — K = {p.K}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
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
        const dpUnits: [string, number][] = [
          ["Pa",  result.pressureRise],
          ["kPa", result.pressureRise / 1000],
          ["bar", result.pressureRise / 1e5],
          ["psi", result.pressureRise / 6894.76],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Actual pressure rise  ΔP = Cp × ½ρV₁²
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {fmt(result.pressureRise, 5)} Pa
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  Ideal: {fmt(result.pressureRiseIdeal, 5)} Pa
                </p>
              </div>

              {/* Unit grid */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Actual pressure rise in other units
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {dpUnits.map(([unit, value]) => (
                    <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                      <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related quantities */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Pressure recovery coefficients
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {([
                    { label: <>Cp actual</>,   value: fmt(result.Cp,       5) },
                    { label: <>Cp ideal</>,    value: fmt(result.CpIdeal,  5) },
                    { label: <>η = Cp/Cp<sub>ideal</sub></>, value: `${fmt(result.efficiency * 100, 4)} %` },
                  ] as { label: React.ReactNode; value: string }[]).map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Secondary quantities */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Velocities and geometry
                </p>
                <div className="grid grid-cols-4 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "V₁ (m/s)",  value: fmt(result.pressureRise / result.dynamicPressure1 > 0 ? parseFloat(velocity) * toMS[velUnit] : 0, 4) },
                    { label: "V₂ (m/s)",  value: fmt(result.velocity2, 4) },
                    { label: "AR = A₂/A₁", value: fmt(result.areaRatio, 4) },
                    { label: "K used",     value: fmt(result.lossCoefficient, 4) },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Efficiency banner */}
              <div className={`p-4 rounded-lg border ${effBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  Diffuser efficiency η = {(result.efficiency * 100).toFixed(1)} %
                  {result.efficiency >= 0.85 ? " — good" : result.efficiency >= 0.60 ? " — moderate" : " — poor"}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.pressureRecovery} />
              <CommonMistakes mistakes={commonMistakes.pressureRecovery} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Bernoulli — ideal pressure recovery:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>ΔP<sub>ideal</sub> = ½ρ(V₁² − V₂²) = q₁ × Cp<sub>ideal</sub></div>
              <div>Cp<sub>ideal</sub> = 1 − (A₁/A₂)² = 1 − (D₁/D₂)⁴</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Actual pressure recovery with losses:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>ΔP = q₁ × (Cp<sub>ideal</sub> − K)</div>
              <div>Cp = Cp<sub>ideal</sub> − K</div>
              <div>η = Cp / Cp<sub>ideal</sub></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              K is referenced to inlet dynamic pressure q₁ = ½ρV₁². K = 0 is the ideal case.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Borda-Carnot (sudden expansion):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>K<sub>BC</sub> = (1 − A₁/A₂)² = (1 − (D₁/D₂)²)²</div>
              <div>ΔP<sub>loss</sub> = K<sub>BC</sub> × q₁ = ρ(V₁ − V₂)² / 2</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Borda-Carnot is the upper bound on losses for abrupt expansion. A well-designed
              gradual diffuser achieves much lower K.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Continuity:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              V₂ = V₁ × A₁/A₂ = V₁ / AR&nbsp;&nbsp;&nbsp;&nbsp;AR = A₂/A₁ = (D₂/D₁)²
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Typical diffuser efficiencies:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Diffuser type</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">K (approx.)</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">η (approx.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ["Ideal (frictionless)",       "0",     "100 %"],
                  ["Well-designed conical (7°)",  "0.05",  "90–95 %"],
                  ["Typical conical diffuser",    "0.15",  "75–85 %"],
                  ["Sudden expansion (Borda)",    "auto",  "50–70 %"],
                  ["Poorly designed / separated", "0.4+",  "< 50 %"],
                ].map(([type, k, eff]) => (
                  <tr key={type}>
                    <td className="py-1.5 pr-4">{type}</td>
                    <td className="py-1.5 pr-4 font-mono">{k}</td>
                    <td className="py-1.5 font-mono">{eff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>ΔP = actual pressure rise [Pa] (P₂ − P₁)</li>
              <li>Cp = pressure recovery coefficient (0–1)</li>
              <li>q₁ = inlet dynamic pressure = ½ρV₁² [Pa]</li>
              <li>K = loss coefficient referenced to q₁</li>
              <li>AR = area ratio A₂/A₁ = (D₂/D₁)²</li>
              <li>η = diffuser efficiency = Cp / Cp<sub>ideal</sub></li>
            </ul>
          </div>
        </div>
      </Card>

      <References refs={REFS_PRESSURE_RECOVERY} />
    </div>
  );
}
