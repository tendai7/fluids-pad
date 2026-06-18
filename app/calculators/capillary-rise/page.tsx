"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_CAPILLARY_RISE } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateCapillaryRise,
  generateCapillaryRiseSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type DiamUnit = "m" | "mm" | "μm" | "cm" | "inch";
type DensUnit = "kg/m³" | "g/cm³";
type SigUnit  = "N/m" | "mN/m" | "dyn/cm";

const toDm:    Record<DiamUnit, number> = { m: 1, mm: 1e-3, "μm": 1e-6, cm: 1e-2, inch: 0.0254 };
const toKgM3:  Record<DensUnit, number> = { "kg/m³": 1, "g/cm³": 1000 };
const toSigSI: Record<SigUnit,  number> = { "N/m": 1, "mN/m": 1e-3, "dyn/cm": 1e-3 };

const FLUID_PRESETS = [
  { label: "Water at 20°C",   density: "998",   sigma: "0.0728" },
  { label: "Water at 60°C",   density: "983",   sigma: "0.0663" },
  { label: "Ethanol at 20°C", density: "789",   sigma: "0.0223" },
  { label: "Mercury at 20°C", density: "13600", sigma: "0.487"  },
  { label: "Glycerin",        density: "1261",  sigma: "0.0634" },
] as const;

const SIGMA_EXTRA = [
  { label: "Soap film (approx.)", sigma: "0.035" },
  { label: "Liquid steel",        sigma: "1.8"   },
] as const;

const CONTACT_ANGLE_PRESETS = [
  { label: "Water on clean glass (θ = 0°)",       angle: "0"   },
  { label: "Water on stainless steel (θ = 60°)",  angle: "60"  },
  { label: "Water on wax (θ = 105°)",             angle: "105" },
  { label: "Mercury on glass (θ = 140°)",         angle: "140" },
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

export default function CapillaryRiseCalculator() {
  const [sigma,         setSigma]         = useState("0.0728");
  const [sigUnit,       setSigUnit]       = useState<SigUnit>("N/m");
  const [selectedSigma, setSelectedSigma] = useState("Water at 20°C");
  const [diameter,      setDiameter]      = useState("1");
  const [diamUnit,      setDiamUnit]      = useState<DiamUnit>("mm");
  const [density,       setDensity]       = useState("998");
  const [densUnit,      setDensUnit]      = useState<DensUnit>("kg/m³");
  const [contactAngle,  setContactAngle]  = useState("0");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateCapillaryRise> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateCapillaryRiseSteps> | null>(null);

  const handleClear = () => {
    setSigma("");
    setSigUnit("N/m");
    setSelectedSigma("");
    setDiameter("");
    setDiamUnit("mm");
    setDensity("");
    setDensUnit("kg/m³");
    setContactAngle("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const sigRaw  = parseFloat(sigma) * toSigSI[sigUnit];
    const dRaw    = parseFloat(diameter);
    const rhoRaw  = parseFloat(density);
    const angRaw  = parseFloat(contactAngle);

    if (isNaN(sigRaw)  || sigRaw  <= 0)            newErrors.sigma        = "Must be a positive number";
    if (isNaN(dRaw)    || dRaw    <= 0)            newErrors.diameter     = "Must be a positive number";
    if (isNaN(rhoRaw)  || rhoRaw  <= 0)            newErrors.density      = "Must be a positive number";
    if (isNaN(angRaw)  || angRaw  < 0 || angRaw > 180) newErrors.contactAngle = "Must be 0–180°";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const dSI   = dRaw   * toDm[diamUnit];
    const rhoSI = rhoRaw * toKgM3[densUnit];
    const angleRad = angRaw * Math.PI / 180;

    try {
      const input = { surfaceTension: sigRaw, diameter: dSI, density: rhoSI, contactAngle: angleRad };
      const calc  = calculateCapillaryRise(input);
      const stp   = generateCapillaryRiseSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const resultBg = result?.isDepression
    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
    : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Capillary Rise Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          h = 4σcosθ / (ρgd) — height of capillary rise (or depression if θ &gt; 90°)
          in a circular tube driven by surface tension.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Mechanics II
        </span>
      </div>

      {/* Fluid presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Common fluids — click to auto-fill σ and density
        </h2>
        <div className="flex flex-wrap gap-2">
          {FLUID_PRESETS.map((p) => (
            <button key={p.label}
              onClick={() => {
                setSigma(fmt(parseFloat(p.sigma) / toSigSI[sigUnit], 5));
                setSelectedSigma(p.label);
                setDensity(fmt(parseFloat(p.density) / toKgM3[densUnit], 5));
              }}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                selectedSigma === p.label
                  ? "bg-blue-100 dark:bg-blue-900/40 border-blue-400 text-blue-800 dark:text-blue-200"
                  : "bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-blue-50"
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

          {/* Surface tension */}
          <div>
            <InputField label="Surface tension" symbol="σ" unit={sigUnit}
              value={sigma} onChange={setSigma} error={errors.sigma} />
            <div className="flex flex-wrap gap-2 -mt-2 mb-2">
              {(["N/m", "mN/m", "dyn/cm"] as SigUnit[]).map(u => (
                <Btn key={u} label={u} active={sigUnit === u} onClick={() => {
                  const currentSI = parseFloat(sigma) * toSigSI[sigUnit];
                  setSigUnit(u);
                  if (!isNaN(currentSI)) setSigma(fmt(currentSI / toSigSI[u], 5));
                }} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => {
                  const lbl = e.target.value;
                  const all = [...FLUID_PRESETS, ...SIGMA_EXTRA];
                  const p = all.find(x => x.label === lbl);
                  if (p) { setSigma(fmt(parseFloat(p.sigma) / toSigSI[sigUnit], 5)); setSelectedSigma(lbl); }
                }}
                className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">σ preset…</option>
                {[...FLUID_PRESETS, ...SIGMA_EXTRA].map(p => (
                  <option key={p.label} value={p.label}>{p.label} — σ = {p.sigma} N/m</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tube diameter */}
          <div>
            <InputField label="Tube inner diameter" symbol="d" unit={diamUnit}
              value={diameter} onChange={setDiameter}
              placeholder={diamUnit === "m" ? "0.001" : diamUnit === "mm" ? "1" : diamUnit === "μm" ? "1000" : diamUnit === "cm" ? "0.1" : "0.039"}
              error={errors.diameter} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m", "mm", "μm", "cm", "inch"] as DiamUnit[]).map(u => (
                <Btn key={u} label={u} active={diamUnit === u} onClick={() => setDiamUnit(u)} />
              ))}
            </div>
          </div>

          {/* Density */}
          <div>
            <InputField label="Liquid density" symbol="ρ" unit={densUnit}
              value={density} onChange={setDensity}
              placeholder={densUnit === "kg/m³" ? "998" : "0.998"}
              error={errors.density} />
            <div className="flex gap-2 -mt-2">
              {(["kg/m³", "g/cm³"] as DensUnit[]).map(u => (
                <Btn key={u} label={u} active={densUnit === u} onClick={() => {
                  const currentSI = parseFloat(density) * toKgM3[densUnit];
                  setDensUnit(u);
                  if (!isNaN(currentSI)) setDensity(fmt(currentSI / toKgM3[u], 5));
                }} />
              ))}
            </div>
          </div>

          {/* Contact angle */}
          <div>
            <InputField label="Contact angle" symbol="θ" unit="degrees"
              value={contactAngle} onChange={setContactAngle} error={errors.contactAngle} />
            <div className="flex items-center gap-2 -mt-2">
              <select
                onChange={(e) => {
                  const p = CONTACT_ANGLE_PRESETS.find(x => x.label === e.target.value);
                  if (p) setContactAngle(p.angle);
                }}
                className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Contact angle preset…</option>
                {CONTACT_ANGLE_PRESETS.map(p => (
                  <option key={p.label} value={p.label}>{p.label}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              θ &gt; 90° → capillary <em>depression</em> (e.g. mercury in glass).
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
      {result && steps && (() => {
        const h   = result.height;
        const hMm = h * 1000;
        const hUnits: [string, number][] = [
          ["m",    h],
          ["mm",   hMm],
          ["μm",   h * 1e6],
          ["cm",   h * 100],
          ["ft",   h * 3.28084],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Capillary {result.isDepression ? "depression" : "rise"}  h = 4σcosθ / (ρgd)
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {fmt(Math.abs(hMm), 5)} mm {result.isDepression ? "↓" : "↑"}
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  {fmt(h, 4)} m&nbsp;&nbsp;|&nbsp;&nbsp;
                  Capillary length λ = {fmt(result.capillaryLength * 1000, 4)} mm
                </p>
              </div>

              {/* Unit grid */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Height in other units
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {hUnits.map(([unit, value]) => (
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
                  Related quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "cosθ",                       value: fmt(result.cosTheta, 4)                         },
                    { label: "Capillary press. 4σcosθ/d (Pa)", value: fmt(result.capillaryPressure, 4)           },
                    { label: "λ = √(σ/ρg) (mm)",          value: fmt(result.capillaryLength * 1000, 4)           },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rise / depression banner */}
              <div className={`p-4 rounded-lg border ${resultBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {result.isDepression ? "Capillary Depression (θ > 90°)" : "Capillary Rise (θ < 90°)"}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.capillaryRise} />
              <CommonMistakes mistakes={commonMistakes.capillaryRise} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Jurin's law (capillary rise):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>h = 4σcosθ / (ρgd)&nbsp;&nbsp;&nbsp;&nbsp;[m]</div>
              <div>h = 2σcosθ / (ρgr)&nbsp;&nbsp;&nbsp;&nbsp;(r = radius = d/2)</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              h &gt; 0 (rise) when θ &lt; 90°.&nbsp;
              h &lt; 0 (depression) when θ &gt; 90° (e.g. mercury in glass).
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Capillary length λ:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              λ = √(σ / (ρg))&nbsp;&nbsp;&nbsp;&nbsp;[m]
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              λ is the length scale at which surface tension and gravity are comparable.
              Tubes with d &lt;&lt; λ show strong capillarity.
              For water: λ ≈ 2.7 mm (so a 1 mm tube gives ~29 mm rise).
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Typical capillary rise for water at 20°C (θ = 0°):</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Tube d</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Rise h</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ["0.1 mm",  "~295 mm"],
                  ["0.5 mm",  "~59 mm"],
                  ["1 mm",    "~29 mm"],
                  ["2 mm",    "~15 mm"],
                  ["5 mm",    "~6 mm"],
                  ["10 mm",   "~3 mm"],
                ].map(([d, h]) => (
                  <tr key={d}>
                    <td className="py-1.5 pr-4 font-mono">{d}</td>
                    <td className="py-1.5 font-mono">{h}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>h = capillary rise height [m] (negative = depression)</li>
              <li>σ = surface tension [N/m]</li>
              <li>θ = contact angle [°]</li>
              <li>ρ = liquid density [kg/m³]</li>
              <li>g = gravitational acceleration = 9.81 m/s²</li>
              <li>d = tube inner diameter [m]</li>
              <li>λ = capillary length = √(σ/ρg) [m]</li>
            </ul>
          </div>
        </div>
      </Card>

      <References refs={REFS_CAPILLARY_RISE} />
    </div>
  );
}
