"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_HEAT_TRANSFER_NUMBERS } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateNusseltNumber,
  generateNusseltNumberSteps,
  commonAssumptions,
  commonMistakes,
  type NusseltMode,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit = "m" | "mm" | "cm" | "inch" | "ft";

const toLm: Record<LenUnit, number> = { m: 1, mm: 1e-3, cm: 1e-2, inch: 0.0254, ft: 0.3048 };

const K_PRESETS = [
  { label: "Air at 20 °C",             k: "0.0257" },
  { label: "Air at 100 °C",            k: "0.0314" },
  { label: "Water at 20 °C",           k: "0.5980" },
  { label: "Water at 60 °C",           k: "0.6510" },
  { label: "Engine oil at 20 °C",      k: "0.1450" },
  { label: "Hydrogen at 20 °C",        k: "0.1800" },
  { label: "Nitrogen at 20 °C",        k: "0.0260" },
  { label: "Ethylene glycol at 20 °C", k: "0.2520" },
] as const;

const NU_PRESETS = [
  { label: "Laminar pipe, constant-T  (Nu = 3.66)",  Nu: "3.66" },
  { label: "Laminar pipe, constant-q  (Nu = 4.36)",  Nu: "4.36" },
  { label: "Pure conduction sphere    (Nu = 2.0)",   Nu: "2.0"  },
  { label: "Cylinder crossflow, Re=1000",            Nu: "15.2" },
  { label: "Turbulent pipe, Re=10000  (Nu ≈ 36)",    Nu: "36.0" },
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

function ModeBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${active
        ? "bg-blue-600 text-white"
        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
      {label}
    </button>
  );
}

export default function NusseltNumberCalculator() {
  const [mode,       setMode]       = useState<NusseltMode>("findNu");
  const [h,          setH]          = useState("50");
  const [k,          setK]          = useState("0.0257");
  const [Nu,         setNu]         = useState("3.66");
  const [length,     setLength]     = useState("0.05");
  const [lenUnit,    setLenUnit]    = useState<LenUnit>("m");
  const [selectedK,  setSelectedK]  = useState("Air at 20 °C");
  const [selectedNu, setSelectedNu] = useState("Laminar pipe, constant-T  (Nu = 3.66)");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateNusseltNumber> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateNusseltNumberSteps> | null>(null);

  const handleClear = () => {
    setMode("findNu");
    setH("");
    setK("");
    setNu("");
    setLength("");
    setLenUnit("m");
    setSelectedK("");
    setSelectedNu("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const hVal  = parseFloat(h);
    const kVal  = parseFloat(k);
    const NuVal = parseFloat(Nu);
    const lRaw  = parseFloat(length);

    if (isNaN(lRaw) || lRaw <= 0) newErrors.length = "Must be a positive number";

    if (mode === "findNu") {
      if (isNaN(hVal) || hVal <= 0) newErrors.h  = "Must be a positive number";
      if (isNaN(kVal) || kVal <= 0) newErrors.k  = "Must be a positive number";
    } else if (mode === "findH") {
      if (isNaN(NuVal) || NuVal <= 0) newErrors.Nu = "Must be a positive number";
      if (isNaN(kVal)  || kVal  <= 0) newErrors.k  = "Must be a positive number";
    } else {
      if (isNaN(NuVal) || NuVal <= 0) newErrors.Nu = "Must be a positive number";
      if (isNaN(hVal)  || hVal  <= 0) newErrors.h  = "Must be a positive number";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const lSI = lRaw * toLm[lenUnit];

    try {
      const input = {
        mode,
        characteristicLength: lSI,
        heatTransferCoeff:    (mode !== "findH")  ? hVal  : undefined,
        thermalConductivity:  (mode !== "findK")  ? kVal  : undefined,
        nusseltNumber:        (mode !== "findNu") ? NuVal : undefined,
      };
      const calc = calculateNusseltNumber(input as Parameters<typeof calculateNusseltNumber>[0]);
      const stp  = generateNusseltNumberSteps(input as Parameters<typeof calculateNusseltNumber>[0], calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const nuVal = result?.nusseltNumber ?? 0;
  const regimeBg =
    nuVal < 1.5
      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      : nuVal < 10
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      : nuVal < 100
      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
      : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Nusselt Number Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Nu = hL/k — dimensionless convective heat transfer. Relates the convective heat transfer
          coefficient to fluid thermal conductivity over a characteristic length.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">
          Heat Transfer · Dimensionless Number
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Mode selector */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Solve for:</p>
          <div className="flex gap-2">
            <ModeBtn label="Find Nu" active={mode === "findNu"} onClick={() => setMode("findNu")} />
            <ModeBtn label="Find h"  active={mode === "findH"}  onClick={() => setMode("findH")}  />
            <ModeBtn label="Find k"  active={mode === "findK"}  onClick={() => setMode("findK")}  />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Characteristic length — always shown */}
          <div>
            <InputField label="Characteristic length" symbol="L" unit={lenUnit}
              value={length} onChange={setLength}
              placeholder={lenUnit === "m" ? "0.05" : lenUnit === "mm" ? "50" : lenUnit === "cm" ? "5" : lenUnit === "inch" ? "1.97" : "0.164"}
              error={errors.length} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m", "mm", "cm", "inch", "ft"] as LenUnit[]).map(u => (
                <Btn key={u} label={u} active={lenUnit === u} onClick={() => {
                  const raw = parseFloat(length);
                  if (!isNaN(raw)) {
                    const converted = raw * toLm[lenUnit] / toLm[u];
                    setLength(parseFloat(converted.toPrecision(6)).toString());
                  }
                  setLenUnit(u);
                }} />
              ))}
            </div>
          </div>

          {/* h — shown for findNu and findK */}
          {mode !== "findH" && (
            <div>
              <InputField label="Heat transfer coefficient" symbol="h" unit="W/(m²·K)"
                value={h} onChange={setH}
                error={errors.h} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                Typical: forced air 25–250, water 500–10 000, boiling 2 500–100 000
              </p>
            </div>
          )}

          {/* k — shown for findNu and findH */}
          {mode !== "findK" && (
            <div>
              <InputField label="Fluid thermal conductivity" symbol="k" unit="W/(m·K)"
                value={k} onChange={setK}
                error={errors.k} />
              <div className="flex items-center gap-2 -mt-2">
                <select
                  value={selectedK}
                  onChange={(e) => {
                    const lbl = e.target.value;
                    setSelectedK(lbl);
                    const p = K_PRESETS.find(x => x.label === lbl);
                    if (p) setK(p.k);
                  }}
                  className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Fluid preset…</option>
                  {K_PRESETS.map(p => (
                    <option key={p.label} value={p.label}>{p.label} — k = {p.k} W/(m·K)</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Nu — shown for findH and findK */}
          {mode !== "findNu" && (
            <div>
              <InputField label="Nusselt number" symbol="Nu" unit="dimensionless"
                value={Nu} onChange={setNu}
                error={errors.Nu} />
              <div className="flex items-center gap-2 -mt-2">
                <select
                  value={selectedNu}
                  onChange={(e) => {
                    const lbl = e.target.value;
                    setSelectedNu(lbl);
                    const p = NU_PRESETS.find(x => x.label === lbl);
                    if (p) setNu(p.Nu);
                  }}
                  className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Geometry preset…</option>
                  {NU_PRESETS.map(p => (
                    <option key={p.label} value={p.label}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
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

              {/* Primary value */}
              <div>
                {mode === "findNu" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Nusselt number  Nu = hL / k
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      Nu = {fmt(result.nusseltNumber, 5)}
                    </p>
                  </>
                )}
                {mode === "findH" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Heat transfer coefficient  h = Nu × k / L
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {fmt(result.heatTransferCoeff, 5)} W/(m²·K)
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      Nu = {fmt(result.nusseltNumber, 5)}
                    </p>
                  </>
                )}
                {mode === "findK" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Fluid thermal conductivity  k = hL / Nu
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {fmt(result.thermalConductivity, 5)} W/(m·K)
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      Nu = {fmt(result.nusseltNumber, 5)}
                    </p>
                  </>
                )}
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Heat transfer quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "Nu",           value: fmt(result.nusseltNumber,     5) },
                    { label: "h [W/(m²·K)]", value: fmt(result.heatTransferCoeff, 5) },
                    { label: "k [W/(m·K)]",  value: fmt(result.thermalConductivity, 5) },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 dark:border-gray-600">
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      k/L — pure conduction reference [W/(m²·K)]
                    </p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(result.conductionCoeff, 5)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Regime banner */}
              <div className={`p-4 rounded-lg border ${regimeBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {nuVal < 1.5
                    ? "Near-conduction regime (Nu ≈ 1)"
                    : nuVal < 10
                    ? "Weak convection (Nu < 10)"
                    : nuVal < 100
                    ? "Moderate convection"
                    : "Strong convection (Nu > 100)"}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.nusseltNumber} />
              <CommonMistakes mistakes={commonMistakes.nusseltNumber} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Definition:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Nu = h × L / k&nbsp;&nbsp;&nbsp;&nbsp;[dimensionless]</div>
              <div>h  = Nu × k / L&nbsp;&nbsp;&nbsp;&nbsp;[W/(m²·K)]</div>
              <div>k  = h × L / Nu&nbsp;&nbsp;&nbsp;&nbsp;[W/(m·K)]</div>
            </div>
            <p className="mt-2">
              Nu compares convective to conductive heat transfer across the same thickness.
              Nu = 1 means convection provides no enhancement over pure conduction;
              Nu = 100 means convection is 100× more effective than conduction alone.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Physical interpretation of Nu values:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Nu = 1 — pure conduction (stagnant fluid layer, no bulk motion)</li>
              <li>Nu = 2 — theoretical minimum for a sphere in an infinite medium</li>
              <li>Nu = 3.66 — fully developed laminar pipe flow, constant wall temperature</li>
              <li>Nu = 4.36 — fully developed laminar pipe flow, constant heat flux</li>
              <li>Nu ~ 10–100 — typical forced convection in liquids or gases</li>
              <li>Nu ~ 100–10 000 — boiling and condensation</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Common Nu correlations:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Geometry / regime</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Correlation</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Validity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { geo: "Laminar pipe, const-T",     corr: "Nu = 3.66",                               valid: "Fully developed, Re < 2300" },
                  { geo: "Laminar pipe, const-q",     corr: "Nu = 4.36",                               valid: "Fully developed, Re < 2300" },
                  { geo: "Turbulent pipe (Dittus-Boelter)", corr: "Nu = 0.023 Re⁰·⁸ Prⁿ",           valid: "Re > 10 000, 0.6 < Pr < 160" },
                  { geo: "Flat plate, laminar avg",   corr: "Nu = 0.664 Re^½ Pr^⅓",                  valid: "Re < 5×10⁵, Pr > 0.6" },
                  { geo: "Sphere (Ranz-Marshall)",    corr: "Nu = 2 + 0.6 Re^½ Pr^⅓",                valid: "1 < Re < 2×10⁵" },
                  { geo: "Cylinder crossflow",        corr: "Nu = C Re^m Pr^⅓  (Hilpert)",             valid: "Re > 0.4" },
                ].map(({ geo, corr, valid }) => (
                  <tr key={geo}>
                    <td className="py-1.5 pr-4">{geo}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{corr}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{valid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Nu vs Biot number — a common source of confusion:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Nu = h × L / k<sub>fluid</sub>&nbsp;&nbsp;&nbsp;&nbsp;(uses fluid thermal conductivity)</div>
              <div>Bi = h × L / k<sub>solid</sub>&nbsp;&nbsp;&nbsp;&nbsp;(uses solid thermal conductivity)</div>
            </div>
            <p className="mt-1">
              Both share the same algebraic form but describe different physics. Nu is a convective
              parameter; Bi describes conductive resistance inside a solid relative to its surface
              convective resistance.
            </p>
          </div>
        </div>
      </Card>

      <References refs={REFS_HEAT_TRANSFER_NUMBERS} />
    </div>
  );
}
