"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_HAZEN_WILLIAMS } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateHazenWilliams,
  generateHazenWilliamsSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

// ── Input units ──────────────────────────────────────────────────────────────
type RhMode  = "radius" | "diameter";
type DiamUnit = "mm" | "m" | "in";
type VelUnit  = "m/s" | "ft/s";
type FlowUnit = "m³/s" | "L/s" | "m³/h";

const toM: Record<DiamUnit, number> = { "mm": 0.001, "m": 1, "in": 0.0254 };

function fmt(n: number, sig = 4) { return parseFloat(n.toPrecision(sig)).toString(); }
const fromMs: Record<VelUnit, number>  = { "m/s": 1, "ft/s": 3.28084 };
const fromM3s: Record<FlowUnit, number> = { "m³/s": 1, "L/s": 1000, "m³/h": 3600 };

// ── C coefficient presets ─────────────────────────────────────────────────────
const C_PRESETS = [
  { label: "PVC / PE new",     C: "150", note: "Smooth plastic, new" },
  { label: "Fiberglass",       C: "140", note: "New fiberglass pipe" },
  { label: "Steel new",        C: "130", note: "New smooth steel" },
  { label: "Cast iron new",    C: "120", note: "New unlined cast iron" },
  { label: "Cast iron old",    C: "100", note: "Older cast iron, light scale" },
  { label: "Concrete",         C: "110", note: "Smooth concrete" },
  { label: "Galvanized",       C: "100", note: "Galvanized steel" },
  { label: "Corroded",         C: "80",  note: "Heavily corroded / scaled" },
];

// ── Slope presets ─────────────────────────────────────────────────────────────
const SLOPE_PRESETS = [
  { label: "0.001", value: "0.001" },
  { label: "0.002", value: "0.002" },
  { label: "0.005", value: "0.005" },
  { label: "0.01",  value: "0.01"  },
  { label: "0.02",  value: "0.02"  },
];

const UnitBtn = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
  <button onClick={onClick}
    className={`px-2 py-0.5 text-xs rounded ${active ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}
  >{label}</button>
);

export default function HazenWilliamsCalculator() {
  // ── Input state ─────────────────────────────────────────────────────────
  const [rhMode, setRhMode]   = useState<RhMode>("diameter");
  const [diamUnit, setDiamUnit] = useState<DiamUnit>("mm");

  const [C, setC]               = useState("120");
  const [diameter, setDiameter] = useState("100");   // for diameter mode
  const [rh, setRh]             = useState("0.025");  // for direct Rₕ mode
  const [slope, setSlope]       = useState("0.005");

  // ── Output unit state ────────────────────────────────────────────────────
  const [velUnit,  setVelUnit]  = useState<VelUnit>("m/s");
  const [flowUnit, setFlowUnit] = useState<FlowUnit>("L/s");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateHazenWilliams> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateHazenWilliamsSteps> | null>(null);

  // Derived Rₕ preview when in diameter mode
  const D_m       = parseFloat(diameter) * toM[diamUnit];
  const derivedRh = rhMode === "diameter" && D_m > 0 ? D_m / 4 : NaN;

  const fmtVel  = (ms: number)   => (ms * fromMs[velUnit]).toFixed(3);
  const fmtFlow = (m3s: number)  => (m3s * fromM3s[flowUnit]).toFixed(flowUnit === "m³/s" ? 5 : 2);

  const validateInputs = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (isNaN(parseFloat(C)) || parseFloat(C) <= 0) newErrors.C = "C must be positive";
    if (rhMode === "diameter") {
      if (isNaN(parseFloat(diameter)) || parseFloat(diameter) <= 0) newErrors.diameter = `Diameter must be positive (${diamUnit})`;
    } else {
      if (isNaN(parseFloat(rh)) || parseFloat(rh) <= 0) newErrors.rh = "Hydraulic radius must be positive (m)";
    }
    if (isNaN(parseFloat(slope)) || parseFloat(slope) <= 0) newErrors.slope = "Slope must be positive (m/m)";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDiamUnitChange = (newUnit: DiamUnit) => {
    const d = parseFloat(diameter);
    if (!isNaN(d)) setDiameter(fmt(d * toM[diamUnit] / toM[newUnit]));
    setDiamUnit(newUnit);
  };

  const handleClear = () => {
    setRhMode("diameter");
    setDiamUnit("mm");
    setC("");
    setDiameter("");
    setRh("");
    setSlope("");
    setVelUnit("m/s");
    setFlowUnit("L/s");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    if (!validateInputs()) { setResult(null); setSteps(null); return; }
    try {
      const hydraulicRadius = rhMode === "diameter" ? D_m / 4 : parseFloat(rh);
      const diam = rhMode === "diameter" ? D_m : undefined;
      const input = { C: parseFloat(C), hydraulicRadius, slope: parseFloat(slope), diameter: diam };
      const r = calculateHazenWilliams(input);
      setResult(r);
      setSteps(generateHazenWilliamsSteps(input, r));
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "An error occurred" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Hazen-Williams Calculator</h1>
        <p className="text-gray-600 dark:text-gray-400">Calculate pipe flow velocity and head loss using the empirical Hazen-Williams formula for water distribution systems.</p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 rounded">Pipe Networks · Empirical</span>
      </div>

      {/* C coefficient presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">C Coefficient Presets</h2>
        <div className="flex flex-wrap gap-2">
          {C_PRESETS.map((p) => (
            <button key={p.label} title={p.note}
              onClick={() => setC(p.C)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${C === p.C ? "border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200" : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"}`}
            >
              {p.label} <span className="text-gray-400 dark:text-gray-500">C={p.C}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">C decreases with pipe age and scale buildup. Always verify against site measurements for older systems.</p>
      </Card>

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Rₕ input mode toggle */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setRhMode("diameter")}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${rhMode === "diameter" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}
          >Pipe diameter → Rₕ = D/4</button>
          <button onClick={() => setRhMode("radius")}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${rhMode === "radius" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}
          >Direct Rₕ input</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* C coefficient */}
          <InputField label="H-W C coefficient" symbol="C" unit="—" value={C} onChange={setC} error={errors.C} />

          {/* Diameter or Rₕ */}
          {rhMode === "diameter" ? (
            <div className="space-y-1">
              <InputField label="Internal diameter" symbol="D" unit={diamUnit} value={diameter} onChange={setDiameter}
                placeholder={diamUnit === "mm" ? "100" : diamUnit === "in" ? "4" : "0.1"} error={errors.diameter} />
              <div className="flex gap-1 ml-1">
                {(["mm", "m", "in"] as DiamUnit[]).map((u) => (
                  <UnitBtn key={u} active={diamUnit === u} onClick={() => handleDiamUnitChange(u)} label={u} />
                ))}
              </div>
              {!isNaN(derivedRh) && (
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-1">Rₕ = D/4 = {derivedRh.toFixed(5)} m</p>
              )}
            </div>
          ) : (
            <InputField label="Hydraulic radius" symbol="Rₕ" unit="m" value={rh} onChange={setRh} error={errors.rh} />
          )}

          {/* Slope */}
          <div className="space-y-1">
            <InputField label="Hydraulic slope" symbol="S" unit="m/m" value={slope} onChange={setSlope} error={errors.slope} />
            <div className="flex flex-wrap gap-1 ml-1">
              {SLOPE_PRESETS.map((s) => (
                <UnitBtn key={s.label} active={slope === s.value} onClick={() => setSlope(s.value)} label={s.label} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-1">S = hf / L (head loss per unit length)</p>
          </div>
        </div>

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
                <span className="mr-1">Velocity:</span>
                {(["m/s", "ft/s"] as VelUnit[]).map((u) => (
                  <UnitBtn key={u} active={velUnit === u} onClick={() => setVelUnit(u)} label={u} />
                ))}
              </div>
              {result.flowRate !== null && (
                <div className="flex items-center gap-1">
                  <span className="mr-1">Flow rate:</span>
                  {(["m³/s", "L/s", "m³/h"] as FlowUnit[]).map((u) => (
                    <UnitBtn key={u} active={flowUnit === u} onClick={() => setFlowUnit(u)} label={u} />
                  ))}
                </div>
              )}
            </div>

            {/* Primary result */}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Flow Velocity</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                V = {fmtVel(result.velocity)} {velUnit}
              </p>
            </div>

            {/* Results grid */}
            <div className={`grid ${result.flowRate !== null ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3"} gap-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3`}>
              <div className="text-center border-r border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">Velocity V</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtVel(result.velocity)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{velUnit}</p>
              </div>
              {result.flowRate !== null && (
                <div className="text-center border-r border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Flow rate Q</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtFlow(result.flowRate)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{flowUnit}</p>
                </div>
              )}
              <div className={`text-center ${result.flowRate !== null ? "border-r border-gray-200 dark:border-gray-700" : ""}`}>
                <p className="text-xs text-gray-500 dark:text-gray-400">hf per 100 m</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.headLossPer100m.toFixed(3)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">m/100 m</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">ΔP/L (water)</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{result.pressureDropPerM.toFixed(1)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pa/m</p>
              </div>
            </div>

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.hazenWilliams} />
            <CommonMistakes mistakes={commonMistakes.hazenWilliams} />
          </div>
        </ResultsCard>
      )}

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Hazen-Williams Formula (SI)</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>V = 0.8492 × C × Rₕ^0.63 × S^0.54</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Rₕ in m, V in m/s, S dimensionless (m/m)</div>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">US Customary Form (different constant)</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>V = 1.318 × C × Rₕ^0.63 × S^0.54</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Rₕ in ft, V in ft/s — do NOT mix with SI inputs</div>
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Hydraulic Radius — Circular Pipe</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              Rₕ = A / P = (πD²/4) / (πD) = D/4   (full-flow circular pipe)
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Variables</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>C — Hazen-Williams roughness coefficient (dimensionless)</li>
              <li>Rₕ — hydraulic radius = A/P [m]</li>
              <li>S — hydraulic slope = hf / L [m/m]</li>
              <li>V — mean flow velocity [m/s]</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Typical C Values</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-600">
                    <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-left">Pipe material / condition</th>
                    <th className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-right">C (typical)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["PVC / polyethylene (new)",   "140–150"],
                    ["Fiberglass (new)",           "140–150"],
                    ["Steel (new, smooth)",        "130–140"],
                    ["Cast iron (new, unlined)",   "120–130"],
                    ["Concrete (smooth)",          "110–140"],
                    ["Galvanized steel",           "100–120"],
                    ["Cast iron (old, some scale)","80–100"],
                    ["Heavily corroded / tuberculated", "60–80"],
                  ].map(([mat, c]) => (
                    <tr key={mat}>
                      <td className="border border-gray-300 dark:border-gray-500 px-3 py-1">{mat}</td>
                      <td className="border border-gray-300 dark:border-gray-500 px-3 py-1 text-right font-mono">{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p>The Hazen-Williams formula is empirical and valid only for water near ambient temperature. For other fluids or precise engineering calculations use the Darcy-Weisbach equation with the Colebrook-White or Swamee-Jain friction factor.</p>
        </div>
      </Card>

      <References refs={REFS_HAZEN_WILLIAMS} />
    </div>
  );
}
