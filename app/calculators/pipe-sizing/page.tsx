"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_PIPE_SIZING } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculatePipeSizing,
  generatePipeSizingSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

// ── Input units ──────────────────────────────────────────────────────────────
type FlowUnit = "m³/s" | "L/s" | "m³/h";
type HeadUnit = "m" | "ft";

const toM3s: Record<FlowUnit, number> = { "m³/s": 1, "L/s": 0.001, "m³/h": 1 / 3600 };
const toHm:  Record<HeadUnit, number>  = { "m": 1, "ft": 0.3048 };

// ── Output units ─────────────────────────────────────────────────────────────
type DiamOutUnit = "mm" | "m" | "in";
type VelUnit     = "m/s" | "ft/s";
type PresUnit    = "Pa" | "kPa" | "bar" | "psi";

const fromM:   Record<DiamOutUnit, number> = { "mm": 1000, "m": 1, "in": 39.3701 };
const fromMs:  Record<VelUnit,     number> = { "m/s": 1, "ft/s": 3.28084 };
const fromPa:  Record<PresUnit,    number> = { "Pa": 1, "kPa": 0.001, "bar": 1e-5, "psi": 1 / 6894.76 };

function fmt(n: number, sig = 5) { return parseFloat(n.toPrecision(sig)).toString(); }

// ── Presets ──────────────────────────────────────────────────────────────────
const FLUID_PRESETS = [
  { label: "Water 20°C",  density: "998",  viscosity: "0.001002" },
  { label: "Water 60°C",  density: "983",  viscosity: "0.000467" },
  { label: "Light oil",   density: "870",  viscosity: "0.01"     },
  { label: "Glycol 50%",  density: "1058", viscosity: "0.006"    },
];

const ROUGHNESS_PRESETS = [
  { label: "PVC",        value: "0.0000015" },
  { label: "Com. steel", value: "0.000046"  },
  { label: "Galvanized", value: "0.00015"   },
  { label: "Cast iron",  value: "0.00026"   },
  { label: "Concrete",   value: "0.001"     },
];

const UnitBtn = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
  <button onClick={onClick}
    className={`px-2 py-0.5 text-xs rounded ${active ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}
  >{label}</button>
);

const REGIME_COLOR: Record<string, string> = {
  "Laminar":   "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
  "Turbulent": "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200",
};

// Typical velocity guidance
const velClass = (v: number) =>
  v < 0.3 ? { label: "Too slow — sedimentation risk", cls: "text-yellow-600 dark:text-yellow-400" }
  : v < 3.0 ? { label: "Good design range", cls: "text-green-600 dark:text-green-400" }
  : { label: "High — erosion risk", cls: "text-red-600 dark:text-red-400" };

export default function PipeSizingCalculator() {
  // ── Input state ─────────────────────────────────────────────────────────
  const [flowRate,  setFlowRate]  = useState("50");
  const [flowUnit,  setFlowUnit]  = useState<FlowUnit>("L/s");
  const [headLoss,  setHeadLoss]  = useState("10");
  const [headUnit,  setHeadUnit]  = useState<HeadUnit>("m");
  const [length,    setLength]    = useState("500");
  const [roughness, setRoughness] = useState("0.000046");
  const [density,   setDensity]   = useState("998");
  const [viscosity, setViscosity] = useState("0.001002");

  // ── Output unit state ────────────────────────────────────────────────────
  const [diamUnit, setDiamUnit] = useState<DiamOutUnit>("mm");
  const [velUnit,  setVelUnit]  = useState<VelUnit>("m/s");
  const [presUnit, setPresUnit] = useState<PresUnit>("kPa");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculatePipeSizing> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generatePipeSizingSteps> | null>(null);

  const qM3s = parseFloat(flowRate) * toM3s[flowUnit];
  const hfM  = parseFloat(headLoss) * toHm[headUnit];

  const fmtDiam = (m: number)  => (m * fromM[diamUnit]).toFixed(diamUnit === "m" ? 4 : 1);
  const fmtVel  = (ms: number) => (ms * fromMs[velUnit]).toFixed(3);
  const fmtPres = (pa: number) => (pa * fromPa[presUnit]).toFixed(3);

  const validateInputs = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (isNaN(parseFloat(flowRate)) || parseFloat(flowRate) <= 0) newErrors.flowRate = `Flow rate must be positive (${flowUnit})`;
    if (isNaN(parseFloat(headLoss)) || parseFloat(headLoss) <= 0) newErrors.headLoss = `Head loss must be positive (${headUnit})`;
    if (isNaN(parseFloat(length))   || parseFloat(length)   <= 0) newErrors.length   = "Length must be positive (m)";
    if (isNaN(parseFloat(roughness))|| parseFloat(roughness) < 0) newErrors.roughness = "Roughness must be ≥ 0 (m)";
    if (isNaN(parseFloat(density))  || parseFloat(density)  <= 0) newErrors.density   = "Density must be positive (kg/m³)";
    if (isNaN(parseFloat(viscosity))|| parseFloat(viscosity) <= 0) newErrors.viscosity = "Viscosity must be positive (Pa·s)";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFlowUnitChange = (newUnit: FlowUnit) => {
    const q = parseFloat(flowRate);
    if (!isNaN(q)) setFlowRate(fmt(q * toM3s[flowUnit] / toM3s[newUnit]));
    setFlowUnit(newUnit);
  };
  const handleHeadUnitChange = (newUnit: HeadUnit) => {
    const h = parseFloat(headLoss);
    if (!isNaN(h)) setHeadLoss(fmt(h * toHm[headUnit] / toHm[newUnit], 6));
    setHeadUnit(newUnit);
  };

  const handleClear = () => {
    setFlowRate("");
    setFlowUnit("L/s");
    setHeadLoss("");
    setHeadUnit("m");
    setLength("");
    setRoughness("");
    setDensity("");
    setViscosity("");
    setDiamUnit("mm");
    setVelUnit("m/s");
    setPresUnit("kPa");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    if (!validateInputs()) { setResult(null); setSteps(null); return; }
    try {
      const input = {
        flowRate: qM3s,
        headLoss: hfM,
        length: parseFloat(length),
        roughness: parseFloat(roughness),
        density: parseFloat(density),
        viscosity: parseFloat(viscosity),
      };
      const r = calculatePipeSizing(input);
      setResult(r);
      setSteps(generatePipeSizingSteps(input, r));
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "An error occurred" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Pipe Sizing Calculator</h1>
        <p className="text-gray-600 dark:text-gray-400">Find the required pipe diameter for a given flow rate and allowable head loss using Darcy-Weisbach with iterative friction factor.</p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 rounded">Pipe Networks · Design</span>
      </div>

      {/* Fluid presets */}
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
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Flow rate */}
          <div className="space-y-1">
            <InputField label="Volume flow rate" symbol="Q" unit={flowUnit} value={flowRate} onChange={setFlowRate}
              placeholder={flowUnit === "L/s" ? "50" : flowUnit === "m³/h" ? "180" : "0.05"} error={errors.flowRate} />
            <div className="flex gap-1 ml-1">
              {(["m³/s","L/s","m³/h"] as FlowUnit[]).map((u) => (
                <UnitBtn key={u} active={flowUnit === u} onClick={() => handleFlowUnitChange(u)} label={u} />
              ))}
            </div>
          </div>

          {/* Allowable head loss */}
          <div className="space-y-1">
            <InputField label="Allowable head loss" symbol="hf" unit={headUnit} value={headLoss} onChange={setHeadLoss}
              placeholder={headUnit === "m" ? "10" : "33"} error={errors.headLoss} />
            <div className="flex gap-1 ml-1">
              {(["m","ft"] as HeadUnit[]).map((u) => (
                <UnitBtn key={u} active={headUnit === u} onClick={() => handleHeadUnitChange(u)} label={u} />
              ))}
            </div>
          </div>

          {/* Pipe length */}
          <InputField label="Pipe length" symbol="L" unit="m" value={length} onChange={setLength} error={errors.length} />

          {/* Roughness with material presets */}
          <div className="space-y-1">
            <InputField label="Absolute roughness" symbol="ε" unit="m" value={roughness} onChange={setRoughness} error={errors.roughness} />
            <div className="flex flex-wrap gap-1 ml-1">
              {ROUGHNESS_PRESETS.map((r) => (
                <UnitBtn key={r.label} active={roughness === r.value} onClick={() => setRoughness(r.value)} label={r.label} />
              ))}
            </div>
          </div>

          <InputField label="Fluid density" symbol="ρ" unit="kg/m³" value={density} onChange={setDensity} error={errors.density} />
          <InputField label="Dynamic viscosity" symbol="μ" unit="Pa·s" value={viscosity} onChange={setViscosity} error={errors.viscosity} />
        </div>

        {(flowUnit !== "m³/s" || headUnit !== "m") && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
            {flowUnit !== "m³/s" && <p>Q = {flowRate} {flowUnit} = {qM3s.toFixed(6)} m³/s</p>}
            {headUnit !== "m"   && <p>hf = {headLoss} {headUnit} = {hfM.toFixed(3)} m</p>}
          </div>
        )}

        {errors.general && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.general}</p>}
        <button onClick={handleCalculate} className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors">
          Calculate
        </button>
        <ClearButton onClear={handleClear} />
      </Card>

      {result && steps && (
        <ResultsCard>
          <div className="space-y-4">
            {/* Output unit toggles */}
            <div className="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <span className="mr-1">Diameter:</span>
                {(["mm","m","in"] as DiamOutUnit[]).map((u) => (
                  <UnitBtn key={u} active={diamUnit === u} onClick={() => setDiamUnit(u)} label={u} />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <span className="mr-1">Velocity:</span>
                {(["m/s","ft/s"] as VelUnit[]).map((u) => (
                  <UnitBtn key={u} active={velUnit === u} onClick={() => setVelUnit(u)} label={u} />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <span className="mr-1">Pressure:</span>
                {(["Pa","kPa","bar","psi"] as PresUnit[]).map((u) => (
                  <UnitBtn key={u} active={presUnit === u} onClick={() => setPresUnit(u)} label={u} />
                ))}
              </div>
            </div>

            {/* Primary result */}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Required Pipe Diameter</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                D = {fmtDiam(result.diameter)} {diamUnit}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${REGIME_COLOR[result.regime]}`}>{result.regime}</span>
                <span className={`text-xs font-medium ${velClass(result.velocity).cls}`}>{velClass(result.velocity).label}</span>
              </div>
            </div>

            {/* Results grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">Diameter D</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtDiam(result.diameter)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{diamUnit}</p>
              </div>
              <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">Velocity V</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtVel(result.velocity)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{velUnit}</p>
              </div>
              <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">Reynolds Re</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{Math.round(result.reynoldsNumber).toLocaleString()}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">—</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Friction f</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.frictionFactor.toFixed(5)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Darcy</p>
              </div>
            </div>

            {/* Secondary grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">ε/D</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.relativeRoughness.toExponential(2)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">rel. roughness</p>
              </div>
              <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">hf (verified)</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.verifiedHeadLoss.toFixed(3)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">m</p>
              </div>
              <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">Pressure drop</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtPres(result.pressureDrop)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{presUnit}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Iterations</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.iterations}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">to converge</p>
              </div>
            </div>

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.pipeSizing} />
            <CommonMistakes mistakes={commonMistakes.pipeSizing} />
          </div>
        </ResultsCard>
      )}

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Darcy-Weisbach Rearranged for Diameter</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>hf = f × (L/D) × V²/(2g)   and   V = Q/A = 4Q/(πD²)</div>
              <div>→  D = (8fLQ² / (π²g hf))^(1/5)</div>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Iterative Solution</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Initial guess: D₀ from assumed velocity V₀ ≈ 1.5 m/s</li>
              <li>Compute Re = ρVD/μ and ε/D</li>
              <li>Update f (Swamee-Jain explicit)</li>
              <li>Solve for new D = (8fLQ²/(π²g hf))^(1/5)</li>
              <li>Repeat until |ΔD/D| &lt; 10⁻⁸</li>
            </ol>
          </div>
          <div>
            <p className="font-semibold mb-2">Velocity Design Guidelines (water)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-600">
                    <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-left">Application</th>
                    <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-right">V (m/s)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Minimum — sediment avoidance",      "0.3–0.6"],
                    ["Distribution mains",                 "0.6–1.5"],
                    ["Pumped water supply",                "1.0–2.5"],
                    ["Short high-flow connections",        "2.0–3.0"],
                    ["Maximum — erosion / noise limit",   "< 3.0"],
                  ].map(([app, v]) => (
                    <tr key={app}>
                      <td className="border border-gray-300 dark:border-gray-500 px-3 py-1">{app}</td>
                      <td className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-right font-mono">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p>The calculated D is the minimum hydraulic requirement. Always select the next larger standard nominal bore (DN). A larger pipe reduces velocity, head loss, and long-term pumping energy costs.</p>
        </div>
      </Card>

      <References refs={REFS_PIPE_SIZING} />
    </div>
  );
}
