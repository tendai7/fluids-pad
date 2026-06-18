"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_THERMAL_RESISTANCE } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateThermalResistance,
  generateThermalResistanceSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit  = "m" | "mm" | "cm";
const toLm: Record<LenUnit, number> = { m: 1, mm: 1e-3, cm: 1e-2 };

// Material conductivity presets  W/(m·K)
const MATERIAL_PRESETS = [
  { label: "Concrete",              k: "1.0"   },
  { label: "Brick",                 k: "0.72"  },
  { label: "Glass wool insulation", k: "0.038" },
  { label: "Mineral wool",          k: "0.040" },
  { label: "EPS (polystyrene foam)",k: "0.036" },
  { label: "XPS (extruded PS)",     k: "0.030" },
  { label: "Plasterboard / drywall",k: "0.25"  },
  { label: "Timber / wood",         k: "0.14"  },
  { label: "Carbon steel",          k: "50"    },
  { label: "Stainless 304",         k: "16"    },
  { label: "Copper",                k: "401"   },
  { label: "Aluminium",             k: "237"   },
  { label: "Glass (soda-lime)",     k: "1.05"  },
] as const;

// HTC presets  W/(m²·K)
const H_PRESETS = [
  { label: "Natural convection — air",         h: "5"    },
  { label: "Forced convection — air (light)",  h: "25"   },
  { label: "Forced convection — air (strong)", h: "100"  },
  { label: "Light organic liquids",            h: "300"  },
  { label: "Water (moderate flow)",            h: "500"  },
  { label: "Water (turbulent)",                h: "3000" },
  { label: "Condensing steam",                 h: "8000" },
] as const;

let nextId = 4;
type LayerType = "convection" | "conduction";
interface LayerRow {
  id: string;
  type: LayerType;
  label: string;
  h: string;
  k: string;
  t: string;
  tUnit: LenUnit;
}

const LAYER_COLORS = [
  "bg-blue-500", "bg-gray-400", "bg-orange-400", "bg-green-500",
  "bg-purple-500", "bg-red-400", "bg-yellow-500", "bg-teal-500",
];

function fmt(n: number, sig = 4) { return parseFloat(n.toPrecision(sig)).toString(); }

function Btn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-2.5 py-1 text-xs rounded ${active
        ? "bg-blue-500 text-white"
        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"}`}>
      {label}
    </button>
  );
}

export default function ThermalResistanceCalculator() {
  const [layers, setLayers] = useState<LayerRow[]>([
    { id: "1", type: "convection", label: "Inner convection", h: "500",  k: "1.0", t: "10", tUnit: "mm" },
    { id: "2", type: "conduction", label: "Wall",             h: "500",  k: "1.0", t: "10", tUnit: "mm" },
    { id: "3", type: "convection", label: "Outer convection", h: "25",   k: "1.0", t: "10", tUnit: "mm" },
  ]);
  const [area,   setArea]   = useState("1.0");
  const [showDT, setShowDT] = useState(false);
  const [dT,     setDT]     = useState("40");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateThermalResistance> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateThermalResistanceSteps> | null>(null);

  const updateLayer = (id: string, field: keyof LayerRow, value: string) =>
    setLayers(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));

  const toggleType = (id: string) =>
    setLayers(prev => prev.map(l => l.id === id
      ? { ...l, type: l.type === "convection" ? "conduction" : "convection" } : l));

  const addLayer = () => {
    const id = String(nextId++);
    setLayers(prev => [...prev, { id, type: "conduction", label: "New layer", h: "500", k: "1.0", t: "10", tUnit: "mm" }]);
  };

  const removeLayer = (id: string) =>
    setLayers(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);

  const handleClear = () => {
    setArea("");
    setDT("");
    setShowDT(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const areaVal = parseFloat(area);
    if (isNaN(areaVal) || areaVal <= 0) newErrors.area = "Must be a positive number";
    if (showDT && (isNaN(parseFloat(dT)))) newErrors.dT = "Required";

    layers.forEach(l => {
      if (l.type === "convection") {
        if (isNaN(parseFloat(l.h)) || parseFloat(l.h) <= 0)
          newErrors[`h_${l.id}`] = "Must be positive";
      } else {
        if (isNaN(parseFloat(l.k)) || parseFloat(l.k) <= 0)
          newErrors[`k_${l.id}`] = "Must be positive";
        if (isNaN(parseFloat(l.t)) || parseFloat(l.t) <= 0)
          newErrors[`t_${l.id}`] = "Must be positive";
      }
    });

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        area: areaVal,
        deltaT: showDT ? parseFloat(dT) : undefined,
        layers: layers.map(l => ({
          type: l.type === "convection" ? "convection" as const : "conduction_planar" as const,
          value: l.type === "convection" ? parseFloat(l.h) : parseFloat(l.k),
          thickness: l.type === "conduction" ? parseFloat(l.t) * toLm[l.tUnit] : undefined,
          label: l.label,
        })),
      };
      const calc = calculateThermalResistance(input);
      const stp  = generateThermalResistanceSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Thermal Resistance Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          R<sub>total</sub> = ΣR<sub>i</sub> — series thermal resistance network for flat walls.
          Build any number of convection and conduction layers, see the resistance breakdown,
          and optionally compute heat flow Q = ΔT / R<sub>total</sub>.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">
          Heat Transfer · Conduction
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Reference area */}
        <div className="max-w-xs mb-5">
          <InputField label="Reference surface area" symbol="A" unit="m²"
            value={area} onChange={setArea} error={errors.area} />
        </div>

        {/* Layer builder */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Layers (left → right = inner → outer):
          </p>
          <div className="space-y-3">
            {layers.map((layer, idx) => (
              <div key={layer.id}
                className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/40">
                <div className="flex items-center gap-3 mb-3">
                  {/* Layer colour dot */}
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${LAYER_COLORS[idx % LAYER_COLORS.length]}`} />

                  {/* Label */}
                  <input
                    type="text"
                    value={layer.label}
                    onChange={(e) => updateLayer(layer.id, "label", e.target.value)}
                    className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {/* Type toggle */}
                  <div className="flex gap-1 flex-shrink-0">
                    <Btn label="Convection" active={layer.type === "convection"} onClick={() => updateLayer(layer.id, "type", "convection")} />
                    <Btn label="Conduction" active={layer.type === "conduction"} onClick={() => updateLayer(layer.id, "type", "conduction")} />
                  </div>

                  {/* Remove */}
                  {layers.length > 1 && (
                    <button onClick={() => removeLayer(layer.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium flex-shrink-0">
                      ✕
                    </button>
                  )}
                </div>

                {/* Layer inputs */}
                {layer.type === "convection" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <InputField label="Convection coefficient" symbol="h" unit="W/(m²·K)"
                        value={layer.h}
                        onChange={(v) => updateLayer(layer.id, "h", v)}
                        error={errors[`h_${layer.id}`]} />
                    </div>
                    <div className="flex items-end pb-1">
                      <select
                        onChange={(e) => {
                          const p = H_PRESETS.find(x => x.label === e.target.value);
                          if (p) updateLayer(layer.id, "h", p.h);
                        }}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">h preset…</option>
                        {H_PRESETS.map(p => (
                          <option key={p.label} value={p.label}>{p.label} — {p.h} W/(m²·K)</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <InputField label="Thickness" symbol="t" unit={layer.tUnit}
                        value={layer.t}
                        onChange={(v) => updateLayer(layer.id, "t", v)}
                        placeholder={layer.tUnit === "mm" ? "10" : "0.01"}
                        error={errors[`t_${layer.id}`]} />
                      <div className="flex gap-1 -mt-2">
                        {(["m", "mm", "cm"] as LenUnit[]).map(u => (
                          <Btn key={u} label={u} active={layer.tUnit === u}
                            onClick={() => setLayers(prev => prev.map(l => {
                              if (l.id !== layer.id) return l;
                              const raw = parseFloat(l.t);
                              const converted = isNaN(raw) ? l.t : parseFloat((raw * toLm[l.tUnit] / toLm[u]).toPrecision(6)).toString();
                              return { ...l, t: converted, tUnit: u };
                            }))} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <InputField label="Thermal conductivity" symbol="k" unit="W/(m·K)"
                        value={layer.k}
                        onChange={(v) => updateLayer(layer.id, "k", v)}
                        error={errors[`k_${layer.id}`]} />
                    </div>
                    <div className="flex items-end pb-1">
                      <select
                        onChange={(e) => {
                          const p = MATERIAL_PRESETS.find(x => x.label === e.target.value);
                          if (p) updateLayer(layer.id, "k", p.k);
                        }}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Material preset…</option>
                        {MATERIAL_PRESETS.map(p => (
                          <option key={p.label} value={p.label}>{p.label} — {p.k} W/(m·K)</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button onClick={addLayer}
            className="mt-3 px-4 py-1.5 text-sm border-2 border-dashed border-gray-300 dark:border-gray-600 rounded text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors">
            + Add layer
          </button>
        </div>

        {/* Optional ΔT */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="showDT" checked={showDT}
              onChange={(e) => setShowDT(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="showDT" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Also compute heat flow Q = ΔT / R<sub>total</sub>
            </label>
          </div>
          {showDT && (
            <div className="max-w-xs">
              <InputField label="Temperature difference" symbol="ΔT" unit="K"
                value={dT} onChange={setDT} error={errors.dT} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                |T<sub>hot</sub> − T<sub>cold</sub>| across the entire wall
              </p>
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
        const dom = result.dominantLayerIndex;
        const domName = layers[dom]?.label ?? `Layer ${dom + 1}`;
        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Total thermal resistance  R<sub>total</sub> = ΣR<sub>i</sub>
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  R<sub>total</sub> = {fmt(result.totalResistance, 5)} K/W
                </p>
                {result.heatFlux !== undefined && (
                  <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                    Q = ΔT / R<sub>total</sub> = {fmt(result.heatFlux, 5)} W
                  </p>
                )}
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Resistance summary
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: <span>R<sub>total</sub> [K/W]</span>,    value: fmt(result.totalResistance, 5) },
                    { label: <span>U = 1/(R<sub>total</sub>·A) [W/(m²·K)]</span>, value: fmt(1 / (result.totalResistance * parseFloat(area)), 5) },
                    { label: result.heatFlux !== undefined ? "Q [W]" : "Layers",
                      value: result.heatFlux !== undefined ? fmt(result.heatFlux, 5) : String(layers.length) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resistance breakdown bars */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
                  Resistance breakdown (% of R<sub>total</sub>)
                </p>
                <div className="space-y-2">
                  {layers.map((layer, idx) => {
                    const pct = result.percentages[idx] ?? 0;
                    const R   = result.layerResistances[idx] ?? 0;
                    const color = LAYER_COLORS[idx % LAYER_COLORS.length];
                    return (
                      <div key={layer.id} className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                          <span>
                            {layer.label}
                            {idx === dom && (
                              <span className="ml-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                                ← dominant
                              </span>
                            )}
                          </span>
                          <span className="font-mono">{pct.toFixed(1)}% &nbsp; {fmt(R, 4)} K/W</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full`}
                            style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Improving the dominant layer has the largest effect on R<sub>total</sub> and U.
                </p>
              </div>

              {/* Interpretation banner */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  Dominant resistance: {domName} ({fmt(result.percentages[dom] ?? 0, 4)}% of total)
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.thermalResistance} />
              <CommonMistakes mistakes={commonMistakes.thermalResistance} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Resistance formulas:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>R<sub>conv</sub> = 1 / (h × A)&nbsp;&nbsp;&nbsp;&nbsp;[K/W]  — convection layer</div>
              <div>R<sub>cond</sub> = t / (k × A)&nbsp;&nbsp;&nbsp;&nbsp;[K/W]  — planar conduction layer</div>
              <div>R<sub>total</sub> = R<sub>1</sub> + R<sub>2</sub> + … + R<sub>n</sub>&nbsp;&nbsp;&nbsp;&nbsp;[K/W]  — series network</div>
              <div>Q = ΔT / R<sub>total</sub>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[W]&nbsp;&nbsp;&nbsp;&nbsp;— heat flow rate</div>
              <div>U = 1 / (R<sub>total</sub> × A)&nbsp;&nbsp;&nbsp;[W/(m²·K)]  — overall HTC</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Cylindrical wall (tube / pipe):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>R<sub>cyl</sub> = ln(r<sub>o</sub>/r<sub>i</sub>) / (2π × k × L)&nbsp;&nbsp;&nbsp;&nbsp;[K/W]</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                Use this form (not the planar formula) when r<sub>o</sub>/r<sub>i</sub> &gt; 1.2
              </div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Typical thermal conductivity values:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Material</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">k [W/(m·K)]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { m: "Copper",              k: "401"   },
                  { m: "Carbon steel",        k: "50"    },
                  { m: "Concrete",            k: "1.0"   },
                  { m: "Brick",               k: "0.72"  },
                  { m: "Timber",              k: "0.14"  },
                  { m: "Glass wool",          k: "0.038" },
                  { m: "EPS foam",            k: "0.036" },
                  { m: "Air (still)",         k: "0.026" },
                ].map(({ m, k }) => (
                  <tr key={m}>
                    <td className="py-1.5 pr-4">{m}</td>
                    <td className="py-1.5 font-mono">{k}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Design principle — dominant resistance:</p>
            <p>
              In a series network, the largest R<sub>i</sub> controls Q.
              Reducing a small resistance (e.g., from 5% to 0%) changes R<sub>total</sub> by only 5%.
              Focus design effort on the dominant layer — often the insulation layer in buildings
              or the gas-side film in process heat exchangers.
            </p>
          </div>
        </div>
      </Card>
      <References refs={REFS_THERMAL_RESISTANCE} />
    </div>
  );
}