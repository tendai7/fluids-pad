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
  calculateSwameeJain,
  generateSwameeJainSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type InputMode = "direct" | "pipe";
type DiamUnit  = "mm" | "m" | "in";

const toM: Record<DiamUnit, number> = { "mm": 0.001, "m": 1, "in": 0.0254 };

function fmt(n: number, sig = 4) { return parseFloat(n.toPrecision(sig)).toString(); }

const RE_PRESETS = [5000, 10000, 50000, 100000, 500000, 1000000];

const EOD_SHORTCUTS = [
  { label: "0 (smooth)", value: "0.000001" },
  { label: "PVC",        value: "0.00003"  },
  { label: "Steel",      value: "0.00046"  },
  { label: "Galv.",      value: "0.0015"   },
  { label: "C.iron",     value: "0.0026"   },
];

const ROUGHNESS_MATERIALS = [
  { label: "PVC / glass",      eps: "0.0000015", note: "Drawn tubing, smooth" },
  { label: "Commercial steel", eps: "0.000046",  note: "New steel pipe" },
  { label: "Galvanized steel", eps: "0.00015",   note: "Galvanized iron" },
  { label: "Cast iron",        eps: "0.00026",   note: "Uncoated cast iron" },
  { label: "Concrete",         eps: "0.001",     note: "Smooth to rough" },
];

const FLUID_PRESETS = [
  { label: "Water 20°C",  density: "998",   viscosity: "0.001002" },
  { label: "Water 60°C",  density: "983",   viscosity: "0.000467" },
  { label: "Light oil",   density: "870",   viscosity: "0.01"     },
  { label: "Air 20°C",    density: "1.204", viscosity: "0.0000181"},
];

const UnitBtn = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
  <button onClick={onClick}
    className={`px-2 py-0.5 text-xs rounded ${active ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}
  >{label}</button>
);

export default function SwameeJainCalculator() {
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
  const [result, setResult] = useState<ReturnType<typeof calculateSwameeJain> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateSwameeJainSteps> | null>(null);

  // Derived values for pipe mode
  const D_m       = parseFloat(diameter) * toM[diamUnit];
  const derivedRe = !isNaN(parseFloat(density) * parseFloat(velocity) * D_m / parseFloat(viscosity))
    ? parseFloat(density) * parseFloat(velocity) * D_m / parseFloat(viscosity)
    : NaN;
  const derivedEoD = D_m > 0 && !isNaN(parseFloat(roughness))
    ? parseFloat(roughness) / D_m
    : NaN;

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
      const r = calculateSwameeJain(input);
      setResult(r);
      setSteps(generateSwameeJainSteps(input, r));
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "An error occurred" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Swamee-Jain Friction Factor Calculator</h1>
        <p className="text-gray-600 dark:text-gray-400">Explicit approximation to the Colebrook-White equation — no iteration required. Includes comparison with the exact CW result.</p>
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
                {EOD_SHORTCUTS.map(({ label, value }) => (
                  <UnitBtn key={label} active={eod === value} onClick={() => setEod(value)} label={label} />
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

            {!isNaN(derivedRe) && !isNaN(derivedEoD) && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                <p>Re = ρVD/μ = {Math.round(derivedRe).toLocaleString()}</p>
                <p>ε/D = {derivedEoD.toExponential(3)}</p>
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
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Darcy Friction Factor (Swamee-Jain)</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">f = {result.frictionFactor.toFixed(5)}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${result.isLaminar ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200" : result.regime === "Transitional" ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200" : "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"}`}>
                  {result.regime}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${result.inRange ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200" : "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200"}`}>
                  {result.inRange ? "Within validity range" : "Outside validity range"}
                </span>
              </div>
              {!result.inRange && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{result.rangeNote}</p>
              )}
            </div>

            {/* Comparison grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">f Darcy (SJ)</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.frictionFactor.toFixed(5)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">explicit</p>
              </div>
              <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">f Fanning</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.fanningFactor.toFixed(5)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">= f / 4</p>
              </div>
              <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">f Colebrook-White</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.colebrookWhiteF.toFixed(5)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">exact (iterated)</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Error vs CW</p>
                <p className={`text-lg font-bold ${result.cwError < 1 ? "text-green-600 dark:text-green-400" : result.cwError < 3 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                  {result.cwError.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">relative</p>
              </div>
            </div>

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.swameeJain} />
            <CommonMistakes mistakes={commonMistakes.swameeJain} />
          </div>
        </ResultsCard>
      )}

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Swamee-Jain Formula (explicit, single evaluation)</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>f = 0.25 / [log₁₀(ε/(3.7D) + 5.74/Re⁰·⁹)]²</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Valid: 3×10³ &lt; Re &lt; 3×10⁸  and  10⁻⁶ &lt; ε/D &lt; 10⁻²</div>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Colebrook-White Reference (implicit, iterated)</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              1/√f = −2 log₁₀( ε/(3.7D) + 2.51/(Re√f) )
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Darcy vs Fanning Friction Factor</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>f_Darcy  = 4 × f_Fanning</div>
              <div>h_f = f_Darcy  × (L/D) × V²/(2g)   ← use this form</div>
              <div>h_f = f_Fanning × 4(L/D) × V²/(2g)  ← equivalent</div>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Typical Pipe Roughness</p>
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
          <p>Swamee-Jain gives explicit results without iteration, making it ideal for hand calculations and initial estimates. When computational cost is not a concern, Colebrook-White gives the more accurate reference answer.</p>
        </div>
      </Card>

      <References refs={REFS_FRICTION_FACTOR} />
    </div>
  );
}
