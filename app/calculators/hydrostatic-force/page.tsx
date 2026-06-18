"use client";

import React from "react";
import { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_HYDROSTATIC_FORCE } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateHydrostaticForce,
  generateHydrostaticForceSteps,
  commonAssumptions,
  commonMistakes,
  type HydrostaticForceInput,
  type PlaneShape,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

// ── Unit types ────────────────────────────────────────────────────────────────
type DensityUnit = "kg/m³" | "g/cm³" | "kg/L";
type LengthUnit  = "m" | "mm" | "cm" | "ft" | "inch";

// ── Conversions to SI ─────────────────────────────────────────────────────────
const toDensitySI = (v: number, u: DensityUnit): number => {
  if (u === "g/cm³") return v * 1000;
  if (u === "kg/L")  return v * 1000;
  return v;
};
const toLengthSI = (v: number, u: LengthUnit): number => {
  if (u === "mm")   return v / 1000;
  if (u === "cm")   return v / 100;
  if (u === "ft")   return v * 0.3048;
  if (u === "inch") return v * 0.0254;
  return v;
};
const fromLengthSI = (v: number, u: LengthUnit): number => {
  if (u === "mm")   return v * 1000;
  if (u === "cm")   return v * 100;
  if (u === "ft")   return v / 0.3048;
  if (u === "inch") return v / 0.0254;
  return v;
};

// ── Fluid presets ─────────────────────────────────────────────────────────────
const FLUID_PRESETS = [
  { label: "Water (20°C)",   density: "998"   },
  { label: "Seawater",       density: "1025"  },
  { label: "Mercury",        density: "13600" },
  { label: "Ethanol (20°C)", density: "789"   },
  { label: "Oil (SAE 30)",   density: "880"   },
] as const;

// ── Shape config ──────────────────────────────────────────────────────────────
const SHAPES: {
  value:     PlaneShape;
  label:     string;
  dim1Label: string;
  dim2Label: string | null;
  areaFmt:   React.ReactNode;
  IGFmt:     React.ReactNode;
}[] = [
  {
    value:     "rectangle",
    label:     "Rectangle",
    dim1Label: "Width",
    dim2Label: "Height",
    areaFmt:   "A = b × H",
    IGFmt:     <>I<sub>G</sub> = b H³ / 12</>,
  },
  {
    value:     "circle",
    label:     "Circle",
    dim1Label: "Diameter",
    dim2Label: null,
    areaFmt:   "A = π D² / 4",
    IGFmt:     <>I<sub>G</sub> = π D⁴ / 64</>,
  },
  {
    value:     "triangle",
    label:     "Triangle",
    dim1Label: "Base",
    dim2Label: "Height",
    areaFmt:   "A = ½ b H",
    IGFmt:     <>I<sub>G</sub> = b H³ / 36</>,
  },
];

function fmt(n: number, sig = 5): string {
  return parseFloat(n.toPrecision(sig)).toString();
}
function fmtForce(n: number): string {
  if (n >= 1e6)  return `${fmt(n / 1e6, 5)} MN`;
  if (n >= 1000) return `${fmt(n / 1000, 5)} kN`;
  return `${fmt(n, 5)} N`;
}

function Btn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-sm rounded ${
        active
          ? "bg-blue-500 text-white"
          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
      }`}
    >
      {label}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HydrostaticForceCalculator() {
  const [shape,       setShape]       = useState<PlaneShape>("rectangle");

  const [density,     setDensity]     = useState("998");
  const [densityUnit, setDensityUnit] = useState<DensityUnit>("kg/m³");

  const [depth,       setDepth]       = useState("2");
  const [depthUnit,   setDepthUnit]   = useState<LengthUnit>("m");

  const [angle,       setAngle]       = useState("90");

  const [dim1,        setDim1]        = useState("1.5");
  const [dim1Unit,    setDim1Unit]    = useState<LengthUnit>("m");
  const [dim2,        setDim2]        = useState("2");
  const [dim2Unit,    setDim2Unit]    = useState<LengthUnit>("m");

  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [result,  setResult]  = useState<ReturnType<typeof calculateHydrostaticForce> | null>(null);
  const [steps,   setSteps]   = useState<ReturnType<typeof generateHydrostaticForceSteps> | null>(null);

  const shapeConfig = SHAPES.find(s => s.value === shape)!;

  const handleClear = () => {
    setDensity(""); setDepth(""); setAngle(""); setDim1(""); setDim2("");
    setResult(null); setSteps(null); setErrors({});
  };

  const handleCalculate = () => {
    const errs: Record<string, string> = {};
    const rhoVal   = parseFloat(density);
    const depthVal = parseFloat(depth);
    const angleVal = parseFloat(angle);
    const d1Val    = parseFloat(dim1);
    const d2Val    = dim2 ? parseFloat(dim2) : NaN;

    if (isNaN(rhoVal)   || rhoVal   <= 0) errs.density = "Must be a positive number";
    if (isNaN(depthVal) || depthVal <  0) errs.depth   = "Must be non-negative";
    if (isNaN(angleVal) || angleVal <  0 || angleVal > 90) errs.angle = "Must be between 0° and 90°";
    if (isNaN(d1Val)    || d1Val    <= 0) errs.dim1    = "Must be a positive number";
    if (shapeConfig.dim2Label && (isNaN(d2Val) || d2Val <= 0)) errs.dim2 = "Must be a positive number";

    setErrors(errs);
    if (Object.keys(errs).length) { setResult(null); setSteps(null); return; }

    try {
      const rhoSI   = toDensitySI(rhoVal, densityUnit);
      const depthSI = toLengthSI(depthVal, depthUnit);
      const d1SI    = toLengthSI(d1Val, dim1Unit);
      const d2SI    = shapeConfig.dim2Label ? toLengthSI(d2Val, dim2Unit) : undefined;

      const input: HydrostaticForceInput = {
        density: rhoSI,
        depthCentroid: depthSI,
        angleDeg: angleVal,
        shape,
        dim1: d1SI,
        dim2: d2SI,
      };
      const calcResult = calculateHydrostaticForce(input);
      const calcSteps  = generateHydrostaticForceSteps(input, calcResult);
      setResult(calcResult);
      setSteps(calcSteps);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const lengthPh = (u: LengthUnit) =>
    u === "m" ? "1" : u === "mm" ? "1000" : u === "cm" ? "100" : u === "ft" ? "3.28" : "39.4";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Hydrostatic Force &amp; Center of Pressure
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Calculate the resultant force on a{" "}
          <strong className="text-gray-800 dark:text-gray-200">submerged plane surface</strong>{" "}
          and locate the <strong className="text-gray-800 dark:text-gray-200">center of pressure</strong>{" "}
          — for vertical, inclined, and horizontal surfaces.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Properties &amp; Statics
        </span>
      </div>

      {/* Shape selector */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">Surface Shape</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {SHAPES.map(s => (
            <button
              key={s.value}
              onClick={() => setShape(s.value)}
              className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                shape === s.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 font-mono">
          <span>{shapeConfig.areaFmt}</span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span>{shapeConfig.IGFmt}</span>
        </div>
      </Card>

      {/* Fluid presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Common fluids — click to auto-fill density
        </h2>
        <div className="flex flex-wrap gap-2">
          {FLUID_PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => { setDensity(p.density); setDensityUnit("kg/m³"); }}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Density */}
          <div>
            <div className="flex gap-2 mb-3" aria-hidden="true">
              <span className="px-3 py-1 text-sm opacity-0 select-none">x</span>
            </div>
            <InputField
              label="Fluid density" symbol="ρ" unit={densityUnit}
              value={density} onChange={setDensity} placeholder="998" error={errors.density}
            />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["kg/m³", "g/cm³", "kg/L"] as DensityUnit[]).map(u => (
                <Btn key={u} label={u} active={densityUnit === u} onClick={() => setDensityUnit(u)} />
              ))}
            </div>
          </div>

          {/* Depth to centroid */}
          <div>
            <div className="flex gap-2 mb-3" aria-hidden="true">
              <span className="px-3 py-1 text-sm opacity-0 select-none">x</span>
            </div>
            <InputField
              label="Depth of centroid below free surface" symbol="h̄" unit={depthUnit}
              value={depth} onChange={setDepth} placeholder={lengthPh(depthUnit)} error={errors.depth}
            />
            <div className="flex flex-wrap gap-2">
              {(["m", "mm", "cm", "ft", "inch"] as LengthUnit[]).map(u => (
                <Btn key={u} label={u} active={depthUnit === u} onClick={() => setDepthUnit(u)} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Vertical distance from the free surface to the centroid of the surface.
            </p>
          </div>

          {/* Angle */}
          <div>
            <div className="flex gap-2 mb-3" aria-hidden="true">
              <span className="px-3 py-1 text-sm opacity-0 select-none">x</span>
            </div>
            <InputField
              label="Surface inclination angle" symbol="θ" unit="degrees"
              value={angle} onChange={setAngle} placeholder="90" error={errors.angle}
            />
            <div className="flex flex-wrap gap-2 -mt-2">
              {["0", "30", "45", "60", "90"].map(a => (
                <Btn key={a} label={`${a}°`} active={angle === a} onClick={() => setAngle(a)} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Measured from the horizontal. 90° = vertical surface, 0° = horizontal surface.
            </p>
          </div>

          {/* dim1 */}
          <div>
            <div className="flex gap-2 mb-3" aria-hidden="true">
              <span className="px-3 py-1 text-sm opacity-0 select-none">x</span>
            </div>
            <InputField
              label={shapeConfig.dim1Label}
              symbol={shape === "circle" ? "D" : "b"}
              unit={dim1Unit}
              value={dim1} onChange={setDim1} placeholder={lengthPh(dim1Unit)} error={errors.dim1}
            />
            <div className="flex flex-wrap gap-2">
              {(["m", "mm", "cm", "ft", "inch"] as LengthUnit[]).map(u => (
                <Btn key={u} label={u} active={dim1Unit === u} onClick={() => setDim1Unit(u)} />
              ))}
            </div>
          </div>

          {/* dim2 — rectangle and triangle only */}
          {shapeConfig.dim2Label && (
            <div>
              <div className="flex gap-2 mb-3" aria-hidden="true">
                <span className="px-3 py-1 text-sm opacity-0 select-none">x</span>
              </div>
              <InputField
                label={shapeConfig.dim2Label} symbol="H" unit={dim2Unit}
                value={dim2} onChange={setDim2} placeholder={lengthPh(dim2Unit)} error={errors.dim2}
              />
              <div className="flex flex-wrap gap-2">
                {(["m", "mm", "cm", "ft", "inch"] as LengthUnit[]).map(u => (
                  <Btn key={u} label={u} active={dim2Unit === u} onClick={() => setDim2Unit(u)} />
                ))}
              </div>
              {shape === "triangle" && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Height measured in the plane of the surface. Centroid is at H/3 from the base.
                </p>
              )}
            </div>
          )}
        </div>

        {errors.general && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.general}</p>
        )}
        <button
          onClick={handleCalculate}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors"
        >
          Calculate
        </button>
        <ClearButton onClear={handleClear} />
      </Card>

      {/* Results */}
      {result && steps && (
        <ResultsCard>
          <div className="space-y-5">

            {/* Primary — force */}
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Resultant Hydrostatic Force  F = ρ g h̄ A
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                F = {fmtForce(result.force)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {fmt(result.force, 6)} N
              </p>
            </div>

            {/* Key results grid */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Geometry &amp; pressure
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {([
                  { key: "area",  label: <>Area A (m²)</>,          value: fmt(result.area, 5)                      },
                  { key: "ig",    label: <>I<sub>G</sub> (m⁴)</>,   value: result.secondMoment.toExponential(4)     },
                  { key: "pbar",  label: <>p at centroid (Pa)</>,    value: fmt(result.pressureCentroid, 5)          },
                  { key: "pcp",   label: <>p at C.P. (Pa)</>,        value: fmt(result.pressureCP, 5)               },
                ] as { key: string; label: React.ReactNode; value: string }[]).map(({ key, label, value }) => (
                  <div key={key} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Center of pressure */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Center of pressure
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {([
                  {
                    key:   "hcp",
                    label: <>Depth to C.P. &nbsp; h<sub>cp</sub> ({depthUnit})</>,
                    value: fmt(fromLengthSI(result.depthCP, depthUnit), 5),
                  },
                  {
                    key:   "ecc",
                    label: <>Eccentricity &nbsp; e = h<sub>cp</sub> − h̄ ({depthUnit})</>,
                    value: fmt(fromLengthSI(result.eccentricity, depthUnit), 4),
                  },
                  {
                    key:   "ycp",
                    label: result.slantCP === Infinity
                      ? <>y<sub>cp</sub> (horizontal)</>
                      : <>Slant to C.P. &nbsp; y<sub>cp</sub> ({depthUnit})</>,
                    value: result.slantCP === Infinity ? "= centroid" : fmt(fromLengthSI(result.slantCP, depthUnit), 5),
                  },
                ] as { key: string; label: React.ReactNode; value: string }[]).map(({ key, label, value }) => (
                  <div key={key} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              {result.eccentricity < 1e-9 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 px-3 pb-2 pt-1">
                  Horizontal surface — pressure is uniform; center of pressure equals the centroid (e = 0).
                </p>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400 px-3 pb-2 pt-1">
                  Center of pressure is {fmt(fromLengthSI(result.eccentricity, depthUnit), 3)} {depthUnit} below the centroid.
                  The resultant force acts at h<sub>cp</sub> = {fmt(fromLengthSI(result.depthCP, depthUnit), 4)} {depthUnit} depth.
                </p>
              )}
            </div>

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.hydrostaticForce} />
            <CommonMistakes mistakes={commonMistakes.hydrostaticForce} />
          </div>
        </ResultsCard>
      )}

      {/* Test case */}
      <Card>
        <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Test Case — Vertical Rectangular Gate</h2>
        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {([
                ["Fluid",             "Water at 20°C, ρ = 998 kg/m³"],
                ["Gate shape",        "Rectangle, b = 1.5 m, H = 2 m"],
                ["Inclination",       "90° (vertical)"],
                ["Depth to centroid", "h̄ = 3 m  (top edge at 2 m depth)"],
              ] as [string, string][]).map(([k, v]) => (
                <tr key={k} className="border-b border-gray-200 dark:border-gray-600">
                  <td className="py-1.5 pr-4 font-medium w-44">{k}</td>
                  <td className="py-1.5">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono text-xs space-y-1">
            <div>A = 1.5 × 2 = 3 m²</div>
            <div>I<sub>G</sub> = 1.5 × 2³ / 12 = 1.0 m⁴</div>
            <div>F = 998 × 9.81 × 3 × 3 = 88,074 N  ≈ 88.1 kN</div>
            <div>ȳ = 3 / sin(90°) = 3 m</div>
            <div>y<sub>cp</sub> = 3 + 1.0 / (3 × 3) = 3.111 m</div>
            <div>h<sub>cp</sub> = 3.111 m  →  e = 0.111 m below centroid</div>
          </div>
        </div>
      </Card>

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Resultant hydrostatic force:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>F = ρ g h̄ A</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                h̄ = vertical depth to centroid  ·  A = surface area
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              The magnitude equals the pressure at the centroid multiplied by the area.
              This is equivalent to integrating the pressure distribution over the surface.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Center of pressure (inclined surface, angle θ with horizontal):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>ȳ = h̄ / sin θ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(slant distance to centroid)</div>
              <div>y<sub>cp</sub> = ȳ + I<sub>G</sub> / (ȳ A) &nbsp;&nbsp;(slant distance to C.P.)</div>
              <div>h<sub>cp</sub> = y<sub>cp</sub> × sin θ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(vertical depth to C.P.)</div>
              <div>e = h<sub>cp</sub> − h̄ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(eccentricity, always ≥ 0)</div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              The center of pressure is always below the centroid (h<sub>cp</sub> ≥ h̄) because pressure
              increases with depth. As depth increases (h̄ → ∞), e → 0 and C.P. approaches the centroid.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Second moments of area (centroidal, I<sub>G</sub>):</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white w-28">Shape</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Area A</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">I<sub>G</sub></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {([
                  ["Rectangle", "b × H",    <>b H³ / 12</>],
                  ["Circle",    "π D² / 4", <>π D⁴ / 64</>],
                  ["Triangle",  "½ b H",    <>b H³ / 36</>],
                ] as [string, string, React.ReactNode][]).map(([sh, area, ig]) => (
                  <tr key={sh}>
                    <td className="py-1.5 pr-4 font-medium">{sh}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{area}</td>
                    <td className="py-1.5 font-mono text-xs">{ig}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              I<sub>G</sub> is always about the centroidal axis <em>parallel to the free surface</em>
              (horizontal axis through the centroid). The parallel-axis theorem gives the
              second moment about the free-surface axis: I<sub>x</sub> = I<sub>G</sub> + A ȳ².
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>ρ = fluid density [kg/m³]</li>
              <li>g = 9.81 m/s²</li>
              <li>h̄ = vertical depth to centroid of surface [m]</li>
              <li>A = surface area [m²]</li>
              <li>I<sub>G</sub> = second moment of area about centroidal axis [m⁴]</li>
              <li>θ = angle of surface with the horizontal [deg]</li>
              <li>ȳ = slant distance from free-surface intersection to centroid [m]</li>
              <li>y<sub>cp</sub> = slant distance to center of pressure [m]</li>
              <li>h<sub>cp</sub> = vertical depth to center of pressure [m]</li>
              <li>e = eccentricity = h<sub>cp</sub> − h̄ [m]</li>
            </ul>
          </div>
        </div>
      </Card>

      <References refs={REFS_HYDROSTATIC_FORCE} />
    </div>
  );
}
