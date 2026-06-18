"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_FRICTION_FACTOR } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateColebrookWhite,
  generateColebrookWhiteSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type InputMode = "direct" | "pipe";
type DiamUnit  = "mm" | "m" | "in";

const toM: Record<DiamUnit, number> = { "mm": 0.001, "m": 1, "in": 0.0254 };

function fmt(n: number, sig = 4) { return parseFloat(n.toPrecision(sig)).toString(); }

const RE_PRESETS = [1000, 5000, 10000, 50000, 100000, 500000, 1000000];

const ROUGHNESS_MATERIALS = [
  { label: "PVC / glass",      eps: "0.0000015", note: "Drawn tubing, smooth" },
  { label: "Commercial steel", eps: "0.000046",  note: "New steel pipe" },
  { label: "Galvanized steel", eps: "0.00015",   note: "Galvanized iron" },
  { label: "Cast iron",        eps: "0.00026",   note: "Uncoated cast iron" },
  { label: "Concrete",         eps: "0.001",     note: "Smooth to rough concrete" },
];

const FLUID_PRESETS = [
  { label: "Water 20°C",  density: "998",  viscosity: "0.001002" },
  { label: "Water 60°C",  density: "983",  viscosity: "0.000467" },
  { label: "Light oil",   density: "870",  viscosity: "0.01"     },
  { label: "Air 20°C",    density: "1.204",viscosity: "0.0000181"},
];

const UnitBtn = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
  <button onClick={onClick}
    className={`px-2 py-0.5 text-xs rounded ${active ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}
  >{label}</button>
);

const REGIME_COLORS: Record<string, string> = {
  "Laminar":                       "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
  "Transitional":                   "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200",
  "Smooth turbulent":               "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
  "Transitionally rough turbulent": "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200",
  "Fully rough turbulent":          "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
};

export default function ColebrookWhiteCalculator() {
  const [mode, setMode] = useState<InputMode>("direct");

  // Direct mode
  const [re,  setRe]  = useState("100000");
  const [eod, setEod] = useState("0.0002");

  // Pipe-property mode
  const [diameter,  setDiameter]  = useState("100");
  const [diamUnit,  setDiamUnit]  = useState<DiamUnit>("mm");
  const [velocity,  setVelocity]  = useState("1.5");
  const [roughness, setRoughness] = useState("0.000046");
  const [density,   setDensity]   = useState("998");
  const [viscosity, setViscosity] = useState("0.001002");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateColebrookWhite> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateColebrookWhiteSteps> | null>(null);

  // Derived values for pipe mode
  const D_m  = parseFloat(diameter) * toM[diamUnit];
  const rhoV = parseFloat(density) * parseFloat(velocity) * D_m;
  const muV  = parseFloat(viscosity);
  const derivedRe  = !isNaN(rhoV) && !isNaN(muV) && muV > 0 ? rhoV / muV : NaN;
  const derivedEoD = !isNaN(parseFloat(roughness)) && D_m > 0 ? parseFloat(roughness) / D_m : NaN;

  const handleDiamUnitChange = (newUnit: DiamUnit) => {
    const d = parseFloat(diameter);
    if (!isNaN(d)) setDiameter(fmt(d * toM[diamUnit] / toM[newUnit]));
    setDiamUnit(newUnit);
  };

  const handleClear = () => {
    setMode("direct");
    setRe("");
    setEod("");
    setDiameter("");
    setDiamUnit("mm");
    setVelocity("");
    setRoughness("");
    setDensity("");
    setViscosity("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    let finalRe: number, finalEoD: number;

    if (mode === "direct") {
      finalRe  = parseFloat(re);
      finalEoD = parseFloat(eod);
      if (isNaN(finalRe)  || finalRe  <= 0) newErrors.re  = "Reynolds number must be positive";
      if (isNaN(finalEoD) || finalEoD < 0)  newErrors.eod = "Relative roughness must be ≥ 0";
    } else {
      finalRe  = derivedRe;
      finalEoD = derivedEoD;
      if (isNaN(parseFloat(diameter))  || parseFloat(diameter)  <= 0) newErrors.diameter  = `Diameter must be positive (${diamUnit})`;
      if (isNaN(parseFloat(velocity))  || parseFloat(velocity)  <= 0) newErrors.velocity  = "Velocity must be positive (m/s)";
      if (isNaN(parseFloat(roughness)) || parseFloat(roughness) < 0)  newErrors.roughness = "Roughness must be ≥ 0 (m)";
      if (isNaN(parseFloat(density))   || parseFloat(density)   <= 0) newErrors.density   = "Density must be positive (kg/m³)";
      if (isNaN(parseFloat(viscosity)) || parseFloat(viscosity) <= 0) newErrors.viscosity = "Viscosity must be positive (Pa·s)";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) { setResult(null); setSteps(null); return; }

    try {
      const input = { reynoldsNumber: finalRe!, relativeRoughness: finalEoD! };
      const r = calculateColebrookWhite(input);
      setResult(r);
      setSteps(generateColebrookWhiteSteps(input, r));
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "An error occurred" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Colebrook-White Friction Factor Calculator</h1>
        <p className="text-gray-600 dark:text-gray-400">Solve the implicit Colebrook-White equation for the Darcy-Weisbach friction factor f, with Swamee-Jain comparison and regime classification.</p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 rounded">Pipe Networks · Friction</span>
      </div>

      {/* Input mode toggle */}
      <div className="flex gap-2">
        <button onClick={() => setMode("direct")}
          className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${mode === "direct" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}
        >Direct (Re &amp; ε/D)</button>
        <button onClick={() => setMode("pipe")}
          className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${mode === "pipe" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}
        >Pipe Properties (D, V, ε, fluid)</button>
      </div>

      {/* ── Direct mode ───────────────────────────────────────────────────── */}
      {mode === "direct" && (
        <Card>
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <InputField label="Reynolds number" symbol="Re" unit="—" value={re} onChange={setRe} error={errors.re} />
              <div className="flex flex-wrap gap-1 ml-1">
                {RE_PRESETS.map((v) => (
                  <UnitBtn key={v} active={re === String(v)} onClick={() => setRe(String(v))} label={v.toLocaleString()} />
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <InputField label="Relative roughness" symbol="ε/D" unit="—" value={eod} onChange={setEod} error={errors.eod} />
              <div className="flex flex-wrap gap-1 ml-1">
                {[["0 (smooth)", "0"], ["PVC", "0.00003"], ["Steel", "0.00046"], ["Galv.", "0.0015"], ["C.iron", "0.0026"]].map(([lbl, val]) => (
                  <UnitBtn key={lbl} active={eod === val} onClick={() => setEod(val)} label={lbl} />
                ))}
              </div>
            </div>
          </div>
          {errors.general && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.general}</p>}
          <button onClick={handleCalculate} className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors">Calculate</button>
        <ClearButton onClear={handleClear} />
        </Card>
      )}

      {/* ── Pipe properties mode ──────────────────────────────────────────── */}
      {mode === "pipe" && (
        <>
          <Card>
            <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">Fluid Presets</h2>
            <div className="flex flex-wrap gap-2">
              {FLUID_PRESETS.map((f) => (
                <button key={f.label}
                  onClick={() => { setDensity(f.density); setViscosity(f.viscosity); }}
                  className="px-3 py-1.5 text-xs rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                >{f.label}</button>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Pipe &amp; Flow Properties</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Diameter */}
              <div className="space-y-1">
                <InputField label="Internal diameter" symbol="D" unit={diamUnit} value={diameter} onChange={setDiameter}
                  placeholder={diamUnit === "mm" ? "100" : diamUnit === "in" ? "4" : "0.1"} error={errors.diameter} />
                <div className="flex gap-1 ml-1">
                  {(["mm", "m", "in"] as DiamUnit[]).map((u) => (
                    <UnitBtn key={u} active={diamUnit === u} onClick={() => handleDiamUnitChange(u)} label={u} />
                  ))}
                </div>
              </div>

              <InputField label="Mean flow velocity" symbol="V" unit="m/s" value={velocity} onChange={setVelocity} error={errors.velocity} />

              {/* Roughness with material presets */}
              <div className="space-y-1">
                <InputField label="Absolute roughness" symbol="ε" unit="m" value={roughness} onChange={setRoughness} error={errors.roughness} />
                <div className="flex flex-wrap gap-1 ml-1">
                  {ROUGHNESS_MATERIALS.map((m) => (
                    <UnitBtn key={m.label} active={roughness === m.eps} onClick={() => setRoughness(m.eps)} label={m.label} />
                  ))}
                </div>
              </div>

              <InputField label="Fluid density" symbol="ρ" unit="kg/m³" value={density} onChange={setDensity} error={errors.density} />
              <InputField label="Dynamic viscosity" symbol="μ" unit="Pa·s" value={viscosity} onChange={setViscosity} error={errors.viscosity} />
            </div>

            {/* Derived Re and ε/D preview */}
            {!isNaN(derivedRe) && !isNaN(derivedEoD) && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                <p>Re = ρVD/μ = {Math.round(derivedRe).toLocaleString()}</p>
                <p>ε/D = {derivedEoD.toExponential(3)} {D_m > 0 ? `(D = ${D_m.toFixed(4)} m, ε = ${roughness} m)` : ""}</p>
              </div>
            )}

            {errors.general && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.general}</p>}
            <button onClick={handleCalculate} className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors">Calculate</button>
            <ClearButton onClear={handleClear} />
          </Card>
        </>
      )}

      {result && steps && (
        <ResultsCard>
          <div className="space-y-4">
            {/* Primary result */}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Darcy Friction Factor</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">f = {result.frictionFactor.toFixed(5)}</p>
              <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded font-medium ${REGIME_COLORS[result.regime] ?? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}>
                {result.regime}
              </span>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{result.regimeNote}</p>
            </div>

            {/* Comparison grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">f Darcy (CW)</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.frictionFactor.toFixed(5)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">exact (iterated)</p>
              </div>
              <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">f Fanning</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.fanningFactor.toFixed(5)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">= f / 4</p>
              </div>
              <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">f Swamee-Jain</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.swameeJainF.toFixed(5)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">explicit approx.</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">SJ error</p>
                <p className={`text-lg font-bold ${result.swameeJainError < 1 ? "text-green-600 dark:text-green-400" : result.swameeJainError < 3 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                  {result.swameeJainError.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">vs CW</p>
              </div>
            </div>

            {/* Iteration count */}
            {!result.isLaminar && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Converged in {result.iterations} iteration{result.iterations !== 1 ? "s" : ""} (tolerance |Δf| &lt; 10⁻¹⁰)
              </p>
            )}

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.colebrookWhite} />
            <CommonMistakes mistakes={commonMistakes.colebrookWhite} />
          </div>
        </ResultsCard>
      )}

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Colebrook-White Equation (implicit)</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              1/√f = −2 log₁₀( ε/(3.7D) + 2.51/(Re√f) )
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Implicit in f — solved by fixed-point iteration starting from the Swamee-Jain explicit guess.</p>
          </div>
          <div>
            <p className="font-semibold mb-2">Special Cases</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Laminar (Re &lt; 2300):        f = 64 / Re</div>
              <div>Smooth turbulent (ε/D → 0):   1/√f = −2 log₁₀(2.51 / (Re√f))</div>
              <div>Fully rough (Re → ∞):          1/√f = −2 log₁₀(ε / (3.7D))</div>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Swamee-Jain Explicit Approximation</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              f = 0.25 / [log₁₀(ε/(3.7D) + 5.74/Re⁰·⁹)]²
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Valid for 3×10³ &lt; Re &lt; 3×10⁸ and 10⁻⁶ &lt; ε/D &lt; 10⁻². Error typically &lt; 3% vs Colebrook-White.</p>
          </div>
          <div>
            <p className="font-semibold mb-2">Flow Regime Classification</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-600">
                    <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-left">Regime</th>
                    <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-left">Re range</th>
                    <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-left">f formula</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Laminar",                       "< 2 300",       "f = 64/Re"],
                    ["Transitional",                   "2 300–4 000",   "Unstable — CW result uncertain"],
                    ["Smooth turbulent",               "> 4 000, ε/D≈0","1/√f = −2log(2.51/(Re√f))"],
                    ["Transitionally rough turbulent", "> 4 000",       "Colebrook-White (full form)"],
                    ["Fully rough turbulent",          "> 4 000, Re→∞", "1/√f = −2log(ε/3.7D)"],
                  ].map(([regime, re, formula]) => (
                    <tr key={regime}>
                      <td className="border border-gray-300 dark:border-gray-500 px-3 py-1 font-medium">{regime}</td>
                      <td className="border border-gray-300 dark:border-gray-500 px-3 py-1 font-mono">{re}</td>
                      <td className="border border-gray-300 dark:border-gray-500 px-3 py-1 font-mono">{formula}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Typical Pipe Roughness ε</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-600">
                    <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-left">Material</th>
                    <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-right">ε (m)</th>
                    <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-right">ε (mm)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["PVC / glass / drawn tubing", "1.5×10⁻⁶", "0.0015"],
                    ["Commercial steel",           "4.6×10⁻⁵", "0.046"],
                    ["Galvanized steel",            "1.5×10⁻⁴", "0.15"],
                    ["Cast iron",                  "2.6×10⁻⁴", "0.26"],
                    ["Concrete",                   "1×10⁻³",   "1.0"],
                  ].map(([mat, em, emm]) => (
                    <tr key={mat}>
                      <td className="border border-gray-300 dark:border-gray-500 px-3 py-1">{mat}</td>
                      <td className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-right font-mono">{em}</td>
                      <td className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-right font-mono">{emm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>

      <References refs={REFS_FRICTION_FACTOR} />
    </div>
  );
}
