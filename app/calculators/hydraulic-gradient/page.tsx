"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_HYDRAULIC_GRADIENT } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateHydraulicGradient,
  generateHydraulicGradientSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

// ── Solve modes ───────────────────────────────────────────────────────────────
type SolveFor = "S" | "hf" | "L";

// ── Input units ───────────────────────────────────────────────────────────────
type HeadUnit   = "m" | "ft";
type LengthUnit = "m" | "km" | "ft";
type SlopeUnit  = "m/m" | "%" | "m/km";

const toM:  Record<HeadUnit,   number> = { "m": 1, "ft": 0.3048 };
const toLm: Record<LengthUnit, number> = { "m": 1, "km": 1000, "ft": 0.3048 };
const toMm: Record<SlopeUnit,  number> = { "m/m": 1, "%": 0.01, "m/km": 0.001 };

function fmt(n: number, sig = 5) { return parseFloat(n.toPrecision(sig)).toString(); }

// ── Output units ──────────────────────────────────────────────────────────────
type PresUnit = "Pa" | "kPa" | "bar" | "psi";
const fromPa: Record<PresUnit, number> = { "Pa": 1, "kPa": 0.001, "bar": 1e-5, "psi": 1 / 6894.76 };

// ── Scenario presets ──────────────────────────────────────────────────────────
const PRESETS = [
  { label: "Distribution main",   hf: "5",  L: "1000", note: "S = 0.005 — typical gravity water supply" },
  { label: "Sewer gravity main",  hf: "3",  L: "300",  note: "S = 0.01 — self-cleansing minimum" },
  { label: "Long transmission",   hf: "50", L: "10000",note: "S = 0.005 — bulk water transfer pipeline" },
  { label: "Steep terrain",       hf: "20", L: "200",  note: "S = 0.10 — mountain supply line" },
];

// ── Classification badge colours ──────────────────────────────────────────────
const CLASS_COLORS: Record<string, string> = {
  "Flat":        "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
  "Mild":        "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
  "Moderate":    "bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200",
  "Steep":       "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200",
  "Very steep":  "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
};

const UnitBtn = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
  <button onClick={onClick}
    className={`px-2 py-0.5 text-xs rounded ${active ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}
  >{label}</button>
);

export default function HydraulicGradientCalculator() {
  const [solveFor, setSolveFor] = useState<SolveFor>("S");

  // Inputs
  const [hfVal,  setHfVal]  = useState("5");
  const [headUnit, setHeadUnit] = useState<HeadUnit>("m");

  const [lVal,   setLVal]   = useState("1000");
  const [lenUnit, setLenUnit] = useState<LengthUnit>("m");

  const [sVal,   setSVal]   = useState("0.005");
  const [slopeUnit, setSlopeUnit] = useState<SlopeUnit>("m/m");

  // Optional density for pressure drop
  const [density, setDensity] = useState("998");

  // Output units
  const [presUnit, setPresUnit] = useState<PresUnit>("kPa");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateHydraulicGradient> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateHydraulicGradientSteps> | null>(null);
  const [solved, setSolved] = useState<{ hf: number; L: number; S: number } | null>(null);

  // Convert to SI for display
  const hfM = parseFloat(hfVal) * toM[headUnit];
  const lM  = parseFloat(lVal)  * toLm[lenUnit];
  const sMm = parseFloat(sVal)  * toMm[slopeUnit];

  const fmtPres = (pa: number) => (pa * fromPa[presUnit]).toFixed(3);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (solveFor !== "hf" && (isNaN(parseFloat(hfVal)) || parseFloat(hfVal) < 0))
      e.hfVal = `Head loss must be ≥ 0 (${headUnit})`;
    if (solveFor !== "L"  && (isNaN(parseFloat(lVal))  || parseFloat(lVal)  <= 0))
      e.lVal  = `Length must be positive (${lenUnit})`;
    if (solveFor !== "S"  && (isNaN(parseFloat(sVal))  || parseFloat(sVal)  <= 0))
      e.sVal  = `Gradient must be positive (${slopeUnit})`;
    if (isNaN(parseFloat(density)) || parseFloat(density) <= 0)
      e.density = "Density must be positive (kg/m³)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleHeadUnitChange = (newUnit: HeadUnit) => {
    const h = parseFloat(hfVal);
    if (!isNaN(h)) setHfVal(fmt(h * toM[headUnit] / toM[newUnit], 6));
    setHeadUnit(newUnit);
  };
  const handleLenUnitChange = (newUnit: LengthUnit) => {
    const l = parseFloat(lVal);
    if (!isNaN(l)) setLVal(fmt(l * toLm[lenUnit] / toLm[newUnit]));
    setLenUnit(newUnit);
  };
  const handleSlopeUnitChange = (newUnit: SlopeUnit) => {
    const s = parseFloat(sVal);
    if (!isNaN(s)) setSVal(fmt(s * toMm[slopeUnit] / toMm[newUnit]));
    setSlopeUnit(newUnit);
  };

  const handleClear = () => {
    setSolveFor("S");
    setHfVal("");
    setHeadUnit("m");
    setLVal("");
    setLenUnit("m");
    setSVal("");
    setSlopeUnit("m/m");
    setDensity("");
    setPresUnit("kPa");
    setResult(null);
    setSteps(null);
    setErrors({});
    setSolved(null);
  };

  const handleCalculate = () => {
    if (!validate()) { setResult(null); setSteps(null); return; }

    let hf: number, L: number;
    if (solveFor === "S")  { hf = hfM;  L = lM; }
    else if (solveFor === "hf") { L = lM;  hf = sMm * lM; }
    else                   { hf = hfM; L = hfM / sMm; }

    try {
      const input = { headLoss: hf, pipeLength: L, density: parseFloat(density) };
      const r = calculateHydraulicGradient(input);
      setResult(r);
      setSteps(generateHydraulicGradientSteps(input, r));
      setSolved({ hf, L, S: r.slope });
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "An error occurred" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Hydraulic Gradient Calculator</h1>
        <p className="text-gray-600 dark:text-gray-400">Compute the hydraulic gradient S = hf / L and derived pressure quantities. Solve for S, head loss, or pipe length.</p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 rounded">Pipe Networks · Gradient</span>
      </div>

      {/* Scenario presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">Scenario Presets</h2>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.label} title={p.note}
              onClick={() => { setHfVal(p.hf); setLVal(p.L); setHeadUnit("m"); setLenUnit("m"); setSolveFor("S"); }}
              className="px-3 py-1.5 text-xs rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
            >{p.label}</button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Solve-for mode */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Solve for:</p>
          <div className="flex gap-2">
            {([
              { key: "S",  label: "Gradient S" },
              { key: "hf", label: "Head loss hf" },
              { key: "L",  label: "Pipe length L" },
            ] as { key: SolveFor; label: string }[]).map(({ key, label }) => (
              <button key={key} onClick={() => setSolveFor(key)}
                className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${solveFor === key ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}
              >{label}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Head loss hf — hidden when solving for hf */}
          {solveFor !== "hf" && (
            <div className="space-y-1">
              <InputField label="Head loss" symbol="hf" unit={headUnit} value={hfVal} onChange={setHfVal}
                placeholder={headUnit === "m" ? "5" : "16.4"} error={errors.hfVal} />
              <div className="flex gap-1 ml-1">
                {(["m","ft"] as HeadUnit[]).map((u) => (
                  <UnitBtn key={u} active={headUnit === u} onClick={() => handleHeadUnitChange(u)} label={u} />
                ))}
              </div>
            </div>
          )}

          {/* Pipe length L — hidden when solving for L */}
          {solveFor !== "L" && (
            <div className="space-y-1">
              <InputField label="Pipe length" symbol="L" unit={lenUnit} value={lVal} onChange={setLVal}
                placeholder={lenUnit === "km" ? "1" : lenUnit === "ft" ? "3280" : "1000"} error={errors.lVal} />
              <div className="flex gap-1 ml-1">
                {(["m","km","ft"] as LengthUnit[]).map((u) => (
                  <UnitBtn key={u} active={lenUnit === u} onClick={() => handleLenUnitChange(u)} label={u} />
                ))}
              </div>
            </div>
          )}

          {/* Gradient S — hidden when solving for S */}
          {solveFor !== "S" && (
            <div className="space-y-1">
              <InputField label="Hydraulic gradient" symbol="S" unit={slopeUnit} value={sVal} onChange={setSVal}
                placeholder={slopeUnit === "%" ? "0.5" : slopeUnit === "m/km" ? "5" : "0.005"} error={errors.sVal} />
              <div className="flex gap-1 ml-1">
                {(["m/m","%","m/km"] as SlopeUnit[]).map((u) => (
                  <UnitBtn key={u} active={slopeUnit === u} onClick={() => handleSlopeUnitChange(u)} label={u} />
                ))}
              </div>
            </div>
          )}

          {/* Density (optional, for pressure drop) */}
          <InputField label="Fluid density" symbol="ρ" unit="kg/m³" value={density} onChange={setDensity} error={errors.density} />
        </div>

        {/* SI previews */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
          {solveFor !== "hf" && headUnit !== "m" && !isNaN(hfM) && <p>hf = {hfVal} {headUnit} = {hfM.toFixed(3)} m</p>}
          {solveFor !== "L"  && lenUnit  !== "m" && !isNaN(lM)  && <p>L  = {lVal}  {lenUnit}  = {lM.toFixed(1)} m</p>}
          {solveFor !== "S"  && slopeUnit !== "m/m" && !isNaN(sMm) && <p>S  = {sVal}  {slopeUnit} = {sMm.toFixed(6)} m/m</p>}
        </div>

        {errors.general && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.general}</p>}
        <button onClick={handleCalculate} className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors">
          Calculate
        </button>
        <ClearButton onClear={handleClear} />
      </Card>

      {result && steps && solved && (
        <ResultsCard>
          <div className="space-y-4">
            {/* Output pressure unit toggle */}
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <span className="mr-1">Pressure:</span>
              {(["Pa","kPa","bar","psi"] as PresUnit[]).map((u) => (
                <UnitBtn key={u} active={presUnit === u} onClick={() => setPresUnit(u)} label={u} />
              ))}
            </div>

            {/* Primary result — show the solved quantity */}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {solveFor === "S"  ? "Hydraulic Gradient" : solveFor === "hf" ? "Head Loss" : "Pipe Length"}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {solveFor === "S"  && `S = ${result.slope.toFixed(5)} m/m`}
                {solveFor === "hf" && `hf = ${solved.hf.toFixed(3)} m`}
                {solveFor === "L"  && `L = ${solved.L.toFixed(1)} m`}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${CLASS_COLORS[result.classification]}`}>
                  {result.classification}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{result.classificationNote}</span>
              </div>
            </div>

            {/* Results grid — gradient in multiple formats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">Gradient S</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.slope.toFixed(5)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">m/m</p>
              </div>
              <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">Gradient S</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.slopePercent.toFixed(3)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">%</p>
              </div>
              <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">hf per 100 m</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.slopePer100m.toFixed(3)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">m</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">hf per km</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.slopePerKm.toFixed(3)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">m/km</p>
              </div>
            </div>

            {/* Pressure grid */}
            <div className="grid grid-cols-2 gap-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">ΔP per metre</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtPres(result.pressureDropPerM)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{presUnit}/m</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total ΔP (over L = {solved.L.toFixed(0)} m)</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtPres(result.pressureDropTotal)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{presUnit}</p>
              </div>
            </div>

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.hydraulicGradient} />
            <CommonMistakes mistakes={commonMistakes.hydraulicGradient} />
          </div>
        </ResultsCard>
      )}

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Definition</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>S = hf / L          [m/m — dimensionless]</div>
              <div>S% = S × 100        [%]</div>
              <div>ΔP/L = ρ g S        [Pa/m]</div>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Rearrangements</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>hf = S × L          (head loss from gradient and length)</div>
              <div>L  = hf / S         (length from head loss and gradient)</div>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Gradient Classification</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-600">
                    <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-left">Class</th>
                    <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-right">S (m/m)</th>
                    <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-right">S (%)</th>
                    <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-left">Typical use</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Flat",       "< 0.001", "< 0.1",   "Long transmission mains, flat terrain"],
                    ["Mild",       "0.001–0.005","0.1–0.5","Standard gravity water distribution"],
                    ["Moderate",   "0.005–0.01","0.5–1",  "Efficient gravity sewers, hilly terrain"],
                    ["Steep",      "0.01–0.05","1–5",     "Mountain supply, high-head segments"],
                    ["Very steep", "> 0.05",  "> 5",     "Pressure breaks / energy dissipators needed"],
                  ].map(([cls, smm, sp, note]) => (
                    <tr key={cls}>
                      <td className="border border-gray-300 dark:border-gray-500 px-3 py-1 font-medium">{cls}</td>
                      <td className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-right font-mono">{smm}</td>
                      <td className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-right font-mono">{sp}</td>
                      <td className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-gray-500 dark:text-gray-400">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p>The hydraulic gradient S is the slope of the hydraulic grade line (HGL). For uniform pipe flow it equals the friction slope Sf = hf/L. In pressurised pipes S drives the flow; in open channels S must exceed the minimum self-cleansing gradient to prevent sediment deposition.</p>
        </div>
      </Card>

      <References refs={REFS_HYDRAULIC_GRADIENT} />
    </div>
  );
}
