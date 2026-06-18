"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { References } from "@/components/References";
import { REFS_SERIES_PIPE } from "@/lib/references";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateSeriesPipe,
  generateSeriesPipeSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

// ── Input units ──────────────────────────────────────────────────────────────
type FlowUnit = "m³/s" | "L/s" | "m³/h";
type DiamUnit = "m" | "mm" | "cm" | "in";

const toM3s: Record<FlowUnit, number> = { "m³/s": 1, "L/s": 0.001, "m³/h": 1 / 3600 };
const toM:   Record<DiamUnit, number>  = { "m": 1, "mm": 0.001, "cm": 0.01, "in": 0.0254 };

function fmt(n: number, sig = 5) { return parseFloat(n.toPrecision(sig)).toString(); }

// ── Output units ─────────────────────────────────────────────────────────────
type HeadUnit = "m" | "ft";
type PresUnit = "Pa" | "kPa" | "bar" | "psi";
type VelUnit  = "m/s" | "ft/s";

const fromM:   Record<HeadUnit, number> = { "m": 1, "ft": 3.28084 };
const fromPa:  Record<PresUnit, number> = { "Pa": 1, "kPa": 0.001, "bar": 1e-5, "psi": 1 / 6894.76 };
const fromMs:  Record<VelUnit,  number> = { "m/s": 1, "ft/s": 3.28084 };

// ── Presets ──────────────────────────────────────────────────────────────────
const FLUID_PRESETS = [
  { label: "Water 20°C",  density: "998",  viscosity: "0.001002", note: "Standard cold water" },
  { label: "Water 60°C",  density: "983",  viscosity: "0.000467", note: "Hot water system" },
  { label: "Light oil",   density: "870",  viscosity: "0.01",     note: "Lubricating oil at 40°C" },
  { label: "Glycol 50%",  density: "1058", viscosity: "0.006",    note: "50% ethylene glycol" },
];

const ROUGHNESS_PRESETS = [
  { label: "PVC",          value: "0.0000015" },
  { label: "Com. steel",   value: "0.000046"  },
  { label: "Galvanized",   value: "0.00015"   },
  { label: "Cast iron",    value: "0.00026"   },
  { label: "Concrete",     value: "0.001"     },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const UnitBtn = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
  <button onClick={onClick}
    className={`px-2 py-0.5 text-xs rounded ${active ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}
  >{label}</button>
);

export default function SeriesPipeCalculator() {
  // ── Input state ─────────────────────────────────────────────────────────
  const [p1L, setP1L] = useState("100");
  const [p1D, setP1D] = useState("100");
  const [p1e, setP1e] = useState("0.00015");
  const [p2L, setP2L] = useState("50");
  const [p2D, setP2D] = useState("80");
  const [p2e, setP2e] = useState("0.00015");

  const [flowRate, setFlowRate] = useState("10");
  const [flowUnit, setFlowUnit] = useState<FlowUnit>("L/s");
  const [diamUnit, setDiamUnit] = useState<DiamUnit>("mm");
  const [density, setDensity]   = useState("998");
  const [viscosity, setViscosity] = useState("0.001002");

  // ── Output unit state ───────────────────────────────────────────────────
  const [headUnit, setHeadUnit] = useState<HeadUnit>("m");
  const [presUnit, setPresUnit] = useState<PresUnit>("kPa");
  const [velUnit,  setVelUnit]  = useState<VelUnit>("m/s");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateSeriesPipe> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateSeriesPipeSteps> | null>(null);

  const qM3s   = parseFloat(flowRate) * toM3s[flowUnit];
  const dScale = toM[diamUnit];

  // ── Unit converters ─────────────────────────────────────────────────────
  const fmtHead = (m: number)  => (m  * fromM[headUnit]).toFixed(3);
  const fmtPres = (pa: number) => (pa * fromPa[presUnit]).toFixed(3);
  const fmtVel  = (ms: number) => (ms * fromMs[velUnit]).toFixed(3);

  const validateInputs = (): boolean => {
    const newErrors: Record<string, string> = {};
    const checks: [string, string, string][] = [
      ["p1L", p1L, "Pipe 1 length (m)"],
      ["p1D", p1D, `Pipe 1 diameter (${diamUnit})`],
      ["p2L", p2L, "Pipe 2 length (m)"],
      ["p2D", p2D, `Pipe 2 diameter (${diamUnit})`],
      ["flowRate", flowRate, `Flow rate (${flowUnit})`],
      ["density", density, "Density (kg/m³)"],
      ["viscosity", viscosity, "Viscosity (Pa·s)"],
    ];
    for (const [key, val, label] of checks) {
      if (isNaN(parseFloat(val)) || parseFloat(val) <= 0)
        newErrors[key] = `${label} must be positive`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDiamUnitChange = (newUnit: DiamUnit) => {
    const d1 = parseFloat(p1D);
    const d2 = parseFloat(p2D);
    if (!isNaN(d1)) setP1D(fmt(d1 * toM[diamUnit] / toM[newUnit]));
    if (!isNaN(d2)) setP2D(fmt(d2 * toM[diamUnit] / toM[newUnit]));
    setDiamUnit(newUnit);
  };
  const handleFlowUnitChange = (newUnit: FlowUnit) => {
    const q = parseFloat(flowRate);
    if (!isNaN(q)) setFlowRate(fmt(q * toM3s[flowUnit] / toM3s[newUnit]));
    setFlowUnit(newUnit);
  };

  const handleClear = () => {
    setP1L("");
    setP1D("");
    setP1e("");
    setP2L("");
    setP2D("");
    setP2e("");
    setFlowRate("");
    setFlowUnit("L/s");
    setDiamUnit("mm");
    setDensity("");
    setViscosity("");
    setHeadUnit("m");
    setPresUnit("kPa");
    setVelUnit("m/s");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    if (!validateInputs()) { setResult(null); setSteps(null); return; }
    try {
      const input = {
        pipes: [
          { length: parseFloat(p1L), diameter: parseFloat(p1D) * dScale, roughness: parseFloat(p1e) },
          { length: parseFloat(p2L), diameter: parseFloat(p2D) * dScale, roughness: parseFloat(p2e) },
        ],
        flowRate: qM3s,
        density: parseFloat(density),
        viscosity: parseFloat(viscosity),
      };
      const r = calculateSeriesPipe(input);
      setResult(r);
      setSteps(generateSeriesPipeSteps(input, r));
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "An error occurred" });
      setResult(null); setSteps(null);
    }
  };

  const regimeColor = (r: string) =>
    r === "Laminar"
      ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
      : "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Series Pipe Network Calculator</h1>
        <p className="text-gray-600 dark:text-gray-400">Calculate head losses and velocities in two pipes connected in series using the Darcy-Weisbach equation.</p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 rounded">Pipe Networks · Series</span>
      </div>

      {/* Fluid presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">Fluid Presets</h2>
        <div className="flex flex-wrap gap-2">
          {FLUID_PRESETS.map((f) => (
            <button key={f.label} title={f.note}
              onClick={() => { setDensity(f.density); setViscosity(f.viscosity); }}
              className="px-3 py-1.5 text-xs rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
            >{f.label}</button>
          ))}
        </div>
      </Card>

      {/* Diameter unit toggle */}
      <div className="flex items-center gap-3 px-1">
        <span className="text-sm text-gray-600 dark:text-gray-400">Diameter unit:</span>
        {(["mm", "cm", "in", "m"] as DiamUnit[]).map((u) => (
          <UnitBtn key={u} active={diamUnit === u} onClick={() => handleDiamUnitChange(u)} label={u} />
        ))}
      </div>

      {/* Pipe 1 */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Pipe 1</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField label="Length" symbol="L₁" unit="m" value={p1L} onChange={setP1L} error={errors.p1L} />
          <InputField label="Diameter" symbol="D₁" unit={diamUnit} value={p1D} onChange={setP1D}
            placeholder={diamUnit === "mm" ? "100" : diamUnit === "cm" ? "10" : diamUnit === "in" ? "4" : "0.1"} error={errors.p1D} />
          <div>
            <InputField label="Roughness" symbol="ε₁" unit="m" value={p1e} onChange={setP1e} />
            <div className="flex flex-wrap gap-1 mt-1">
              {ROUGHNESS_PRESETS.map((r) => (
                <UnitBtn key={r.label} active={p1e === r.value} onClick={() => setP1e(r.value)} label={r.label} />
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Pipe 2 */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Pipe 2</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField label="Length" symbol="L₂" unit="m" value={p2L} onChange={setP2L} error={errors.p2L} />
          <InputField label="Diameter" symbol="D₂" unit={diamUnit} value={p2D} onChange={setP2D}
            placeholder={diamUnit === "mm" ? "80" : diamUnit === "cm" ? "8" : diamUnit === "in" ? "3" : "0.08"} error={errors.p2D} />
          <div>
            <InputField label="Roughness" symbol="ε₂" unit="m" value={p2e} onChange={setP2e} />
            <div className="flex flex-wrap gap-1 mt-1">
              {ROUGHNESS_PRESETS.map((r) => (
                <UnitBtn key={r.label} active={p2e === r.value} onClick={() => setP2e(r.value)} label={r.label} />
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Flow conditions */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Flow Conditions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <InputField label="Flow rate" symbol="Q" unit={flowUnit} value={flowRate} onChange={setFlowRate}
              placeholder={flowUnit === "L/s" ? "10" : flowUnit === "m³/h" ? "36" : "0.01"}
              error={errors.flowRate} />
            <div className="flex gap-1 ml-1">
              {(["m³/s", "L/s", "m³/h"] as FlowUnit[]).map((u) => (
                <UnitBtn key={u} active={flowUnit === u} onClick={() => handleFlowUnitChange(u)} label={u} />
              ))}
            </div>
          </div>
          <InputField label="Fluid density" symbol="ρ" unit="kg/m³" value={density} onChange={setDensity} error={errors.density} />
          <InputField label="Dynamic viscosity" symbol="μ" unit="Pa·s" value={viscosity} onChange={setViscosity} error={errors.viscosity} />
        </div>
        {flowUnit !== "m³/s" && !isNaN(qM3s) && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Q = {flowRate} {flowUnit} = {qM3s.toFixed(6)} m³/s</p>
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
                <span className="mr-1">Head:</span>
                {(["m", "ft"] as HeadUnit[]).map((u) => (
                  <UnitBtn key={u} active={headUnit === u} onClick={() => setHeadUnit(u)} label={u} />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <span className="mr-1">Pressure:</span>
                {(["Pa", "kPa", "bar", "psi"] as PresUnit[]).map((u) => (
                  <UnitBtn key={u} active={presUnit === u} onClick={() => setPresUnit(u)} label={u} />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <span className="mr-1">Velocity:</span>
                {(["m/s", "ft/s"] as VelUnit[]).map((u) => (
                  <UnitBtn key={u} active={velUnit === u} onClick={() => setVelUnit(u)} label={u} />
                ))}
              </div>
            </div>

            {/* Primary result */}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Head Loss</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                hf = {fmtHead(result.totalHeadLoss)} {headUnit}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                ΔP = {fmtPres(result.pressureDrop)} {presUnit}
              </p>
            </div>

            {/* Per-pipe breakdown table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-600">
                    <th className="border border-gray-300 dark:border-gray-500 px-2 py-1.5 text-left">Pipe</th>
                    <th className="border border-gray-300 dark:border-gray-500 px-2 py-1.5 text-right">V ({velUnit})</th>
                    <th className="border border-gray-300 dark:border-gray-500 px-2 py-1.5 text-right">Re</th>
                    <th className="border border-gray-300 dark:border-gray-500 px-2 py-1.5 text-center">Regime</th>
                    <th className="border border-gray-300 dark:border-gray-500 px-2 py-1.5 text-right">f (Darcy)</th>
                    <th className="border border-gray-300 dark:border-gray-500 px-2 py-1.5 text-right">hf ({headUnit})</th>
                  </tr>
                </thead>
                <tbody>
                  {result.velocities.map((V, i) => (
                    <tr key={i} className="odd:bg-gray-50 dark:odd:bg-gray-800 even:bg-gray-100 dark:even:bg-gray-700">
                      <td className="border border-gray-300 dark:border-gray-500 px-2 py-1.5 font-medium">Pipe {i + 1}</td>
                      <td className="border border-gray-300 dark:border-gray-500 px-2 py-1.5 text-right font-mono">{fmtVel(V)}</td>
                      <td className="border border-gray-300 dark:border-gray-500 px-2 py-1.5 text-right font-mono">{Math.round(result.reynoldsNumbers[i]).toLocaleString()}</td>
                      <td className="border border-gray-300 dark:border-gray-500 px-2 py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${regimeColor(result.regimes[i])}`}>{result.regimes[i]}</span>
                      </td>
                      <td className="border border-gray-300 dark:border-gray-500 px-2 py-1.5 text-right font-mono">{result.frictionFactors[i].toFixed(4)}</td>
                      <td className="border border-gray-300 dark:border-gray-500 px-2 py-1.5 text-right font-mono">{fmtHead(result.headLosses[i])}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-200 dark:bg-gray-600 font-semibold">
                    <td colSpan={5} className="border border-gray-300 dark:border-gray-500 px-2 py-1.5 text-right">Total hf</td>
                    <td className="border border-gray-300 dark:border-gray-500 px-2 py-1.5 text-right font-mono">{fmtHead(result.totalHeadLoss)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Summary grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total head loss</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtHead(result.totalHeadLoss)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{headUnit}</p>
              </div>
              <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">Pressure drop</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtPres(result.pressureDrop)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{presUnit}</p>
              </div>
              <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">hf pipe 1</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtHead(result.headLosses[0])}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{headUnit}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">hf pipe 2</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtHead(result.headLosses[1])}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{headUnit}</p>
              </div>
            </div>

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.seriesPipe} />
            <CommonMistakes mistakes={commonMistakes.seriesPipe} />
          </div>
        </ResultsCard>
      )}

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Series Network Principles</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Q₁ = Q₂ = Q          (continuity — same flow everywhere)</div>
              <div>hf,total = hf₁ + hf₂  (head losses add in series)</div>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Darcy-Weisbach Equation</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>hf = f × (L/D) × V²/(2g)</div>
              <div>V  = Q / A = Q / (π D²/4)</div>
              <div>Re = ρ V D / μ</div>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Friction Factor</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Laminar (Re &lt; 2300):    f = 64/Re</div>
              <div>Turbulent (Re ≥ 2300):   Swamee-Jain approximation to Colebrook-White</div>
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
                    ["PVC / drawn tubing", "1.5×10⁻⁶", "0.0015"],
                    ["Commercial steel",   "4.6×10⁻⁵", "0.046"],
                    ["Galvanized steel",   "1.5×10⁻⁴", "0.15"],
                    ["Cast iron",          "2.6×10⁻⁴", "0.26"],
                    ["Concrete",           "1×10⁻³",   "1.0"],
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
          <p>Because head loss scales with V² and V = Q/A ∝ 1/D², a small reduction in pipe diameter causes a dramatic increase in head loss. Replacing the narrower pipe is usually the most effective upgrade in a series system.</p>
        </div>
      </Card>

      <References refs={REFS_SERIES_PIPE} />
    </div>
  );
}
