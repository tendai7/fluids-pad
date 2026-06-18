"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_BOUNDARY_LAYER } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateBoundaryLayer,
  generateBoundaryLayerSteps,
  commonAssumptions,
  commonMistakes,
  type BoundaryLayerMode,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit  = "m" | "mm" | "cm" | "ft";
type VelUnit  = "m/s" | "ft/s" | "km/h";
type DensUnit = "kg/m³" | "g/cm³";
type ViscUnit = "Pa·s" | "cP" | "mPa·s";

const toLm:   Record<LenUnit,  number> = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048 };
const toMS:   Record<VelUnit,  number> = { "m/s": 1, "ft/s": 0.3048, "km/h": 1/3.6 };
const toKgM3: Record<DensUnit, number> = { "kg/m³": 1, "g/cm³": 1000 };
const toPas:  Record<ViscUnit, number> = { "Pa·s": 1, "cP": 1e-3, "mPa·s": 1e-3 };

const FLUID_PRESETS = [
  { label: "Air at 20°C",    density: "1.204", viscosity: "0.0183",  viscUnit: "cP"   as ViscUnit },
  { label: "Air — sea level",density: "1.225", viscosity: "0.01789", viscUnit: "cP"   as ViscUnit },
  { label: "Water at 20°C",  density: "998",   viscosity: "1.002",   viscUnit: "cP"   as ViscUnit },
  { label: "Water at 60°C",  density: "983",   viscosity: "0.467",   viscUnit: "cP"   as ViscUnit },
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

export default function BoundaryLayerCalculator() {
  const [x,          setX]          = useState("500");
  const [xUnit,      setXUnit]      = useState<LenUnit>("mm");
  const [velocity,   setVelocity]   = useState("10");
  const [velUnit,    setVelUnit]    = useState<VelUnit>("m/s");
  const [density,    setDensity]    = useState("1.204");
  const [densUnit,   setDensUnit]   = useState<DensUnit>("kg/m³");
  const [viscosity,  setViscosity]  = useState("0.0183");
  const [viscUnit,   setViscUnit]   = useState<ViscUnit>("cP");
  const [blMode,     setBlMode]     = useState<BoundaryLayerMode>("auto");

  // Optional plate drag
  const [showPlate,  setShowPlate]  = useState(false);
  const [plateLen,   setPlateLen]   = useState("1");
  const [plateLenUnit, setPlateLenUnit] = useState<LenUnit>("m");
  const [plateWidth, setPlateWidth] = useState("0.5");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateBoundaryLayer> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateBoundaryLayerSteps> | null>(null);

  const handleClear = () => {
    setX("");
    setXUnit("mm");
    setVelocity("");
    setVelUnit("m/s");
    setDensity("");
    setDensUnit("kg/m³");
    setViscosity("");
    setViscUnit("cP");
    setBlMode("auto");
    setPlateLen("");
    setPlateLenUnit("m");
    setPlateWidth("");
    setShowPlate(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const xRaw   = parseFloat(x);
    const vRaw   = parseFloat(velocity);
    const rhoRaw = parseFloat(density);
    const muRaw  = parseFloat(viscosity);

    if (isNaN(xRaw)   || xRaw   <= 0) newErrors.x         = "Must be a positive number";
    if (isNaN(vRaw)   || vRaw   <= 0) newErrors.velocity  = "Must be a positive number";
    if (isNaN(rhoRaw) || rhoRaw <= 0) newErrors.density   = "Must be a positive number";
    if (isNaN(muRaw)  || muRaw  <= 0) newErrors.viscosity = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const xSI   = xRaw   * toLm[xUnit];
    const vSI   = vRaw   * toMS[velUnit];
    const rhoSI = rhoRaw * toKgM3[densUnit];
    const muSI  = muRaw  * toPas[viscUnit];

    const pLenRaw = parseFloat(plateLen);
    const pWidRaw = parseFloat(plateWidth);
    const pLenSI  = (!isNaN(pLenRaw) && pLenRaw > 0 && showPlate) ? pLenRaw * toLm[plateLenUnit] : undefined;
    const pWidSI  = (!isNaN(pWidRaw) && pWidRaw > 0 && showPlate) ? pWidRaw : undefined;

    try {
      const input = { x: xSI, velocity: vSI, density: rhoSI, viscosity: muSI, mode: blMode,
        plateLength: pLenSI, plateWidth: pWidSI };
      const calc  = calculateBoundaryLayer(input);
      const stp   = generateBoundaryLayerSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const regimeBg = result?.regime === "laminar"
    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Boundary Layer Thickness Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          δ, δ*, θ, C<sub>f</sub>, and τ<sub>w</sub> for flow over a flat plate.
          Blasius solution (laminar) and 1/7-power-law (turbulent).
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
          Fluid Mechanics II · Specialized
        </span>
      </div>

      {/* Fluid presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Common fluids — click to auto-fill density and viscosity
        </h2>
        <div className="flex flex-wrap gap-2">
          {FLUID_PRESETS.map((p) => (
            <button key={p.label}
              onClick={() => {
                setDensity(p.density);  setDensUnit("kg/m³");
                setViscosity(p.viscosity); setViscUnit(p.viscUnit);
              }}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Regime mode */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Boundary layer regime:</p>
          <div className="flex gap-2">
            {(["auto", "laminar", "turbulent"] as BoundaryLayerMode[]).map(m => (
              <button key={m} onClick={() => setBlMode(m)}
                className={`px-4 py-2 text-sm rounded-md border transition-colors capitalize ${blMode === m
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
                {m === "auto" ? "Auto-detect" : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Auto: laminar for Re<sub>x</sub> &lt; 5×10⁵, turbulent above.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Distance x from leading edge */}
          <div>
            <InputField label="Distance from leading edge" symbol="x" unit={xUnit}
              value={x} onChange={setX}
              placeholder={xUnit === "m" ? "0.5" : xUnit === "cm" ? "50" : xUnit === "ft" ? "1.64" : "500"}
              error={errors.x} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m", "mm", "cm", "ft"] as LenUnit[]).map(u => (
                <Btn key={u} label={u} active={xUnit === u} onClick={() => {
                  const si = parseFloat(x) * toLm[xUnit];
                  setXUnit(u);
                  if (!isNaN(si)) setX(fmt(si / toLm[u]));
                }} />
              ))}
            </div>
          </div>

          {/* Free-stream velocity */}
          <div>
            <InputField label="Free-stream velocity" symbol="V" unit={velUnit}
              value={velocity} onChange={setVelocity}
              placeholder={velUnit === "m/s" ? "10" : velUnit === "ft/s" ? "32.8" : "36"}
              error={errors.velocity} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m/s", "ft/s", "km/h"] as VelUnit[]).map(u => (
                <Btn key={u} label={u} active={velUnit === u} onClick={() => {
                  const si = parseFloat(velocity) * toMS[velUnit];
                  setVelUnit(u);
                  if (!isNaN(si)) setVelocity(fmt(si / toMS[u]));
                }} />
              ))}
            </div>
          </div>

          {/* Density */}
          <div>
            <InputField label="Fluid density" symbol="ρ" unit={densUnit}
              value={density} onChange={setDensity}
              placeholder={densUnit === "kg/m³" ? "1.204" : "0.001204"}
              error={errors.density} />
            <div className="flex gap-2 -mt-2">
              {(["kg/m³", "g/cm³"] as DensUnit[]).map(u => (
                <Btn key={u} label={u} active={densUnit === u} onClick={() => {
                  const si = parseFloat(density) * toKgM3[densUnit];
                  setDensUnit(u);
                  if (!isNaN(si)) setDensity(fmt(si / toKgM3[u]));
                }} />
              ))}
            </div>
          </div>

          {/* Viscosity */}
          <div>
            <InputField label="Dynamic viscosity" symbol="μ" unit={viscUnit}
              value={viscosity} onChange={setViscosity}
              placeholder={viscUnit === "Pa·s" ? "0.0000183" : "0.0183"}
              error={errors.viscosity} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["Pa·s", "cP", "mPa·s"] as ViscUnit[]).map(u => (
                <Btn key={u} label={u} active={viscUnit === u} onClick={() => {
                  const si = parseFloat(viscosity) * toPas[viscUnit];
                  setViscUnit(u);
                  if (!isNaN(si)) setViscosity(fmt(si / toPas[u]));
                }} />
              ))}
            </div>
          </div>
        </div>

        {/* Optional plate drag section */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="showPlate" checked={showPlate}
              onChange={(e) => setShowPlate(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="showPlate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Compute average drag over full plate — enter plate length and width
            </label>
          </div>
          {showPlate && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <InputField label="Plate length" symbol="L" unit={plateLenUnit}
                  value={plateLen} onChange={setPlateLen}
                  placeholder={plateLenUnit === "m" ? "1" : plateLenUnit === "mm" ? "1000" : plateLenUnit === "ft" ? "3.28" : "100"} />
                <div className="flex flex-wrap gap-2 -mt-2">
                  {(["m", "mm", "cm", "ft"] as LenUnit[]).map(u => (
                    <Btn key={u} label={u} active={plateLenUnit === u} onClick={() => {
                      const si = parseFloat(plateLen) * toLm[plateLenUnit];
                      setPlateLenUnit(u);
                      if (!isNaN(si)) setPlateLen(fmt(si / toLm[u]));
                    }} />
                  ))}
                </div>
              </div>
              <InputField label="Plate width" symbol="W" unit="m"
                value={plateWidth} onChange={setPlateWidth} />
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
        const dMm  = result.delta     * 1000;
        const dsMm = result.deltaStar * 1000;
        const thMm = result.theta     * 1000;
        const thUnits: [string, number][] = [
          ["mm",  dMm],
          ["μm",  dMm * 1000],
          ["m",   result.delta],
          ["inch",result.delta / 0.0254],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  BL thickness δ at x = {fmt(parseFloat(x), 4)} {xUnit}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  δ = {fmt(dMm, 5)} mm
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  Re<sub>x</sub> = {fmt(result.rex, 5)}
                </p>
              </div>

              {/* δ unit grid */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  δ in other units
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {thUnits.map(([unit, value]) => (
                    <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                      <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Thickness comparison */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Boundary layer thicknesses
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "δ (mm)",   value: fmt(dMm,  5) },
                    { label: "δ* (mm)",  value: fmt(dsMm, 5) },
                    { label: "θ (mm)",   value: fmt(thMm, 5) },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Friction and shear */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Friction quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {([
                    { label: <>H = δ*/θ</>,                 value: fmt(result.shapeFactor, 4)  },
                    { label: <>C<sub>f</sub> (local)</>,    value: fmt(result.localCf, 4)       },
                    { label: <>τ<sub>w</sub> (Pa)</>,       value: fmt(result.wallShear, 4)     },
                  ] as { label: React.ReactNode; value: string }[]).map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Plate drag (if computed) */}
              {result.averageCd !== undefined && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Average drag over full plate
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    C<sub>D</sub> = {fmt(result.averageCd, 5)}
                    {result.dragForce !== undefined && <>&nbsp;&nbsp;|&nbsp;&nbsp;F<sub>D</sub> = {fmt(result.dragForce, 4)} N</>}
                  </p>
                </div>
              )}

              {/* Regime banner */}
              <div className={`p-4 rounded-lg border ${regimeBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {result.regime.charAt(0).toUpperCase() + result.regime.slice(1)} boundary layer
                  &nbsp;— Re<sub>x</sub> = {fmt(result.rex, 5)}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.boundaryLayer} />
              <CommonMistakes mistakes={commonMistakes.boundaryLayer} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Local Reynolds number:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              Re<sub>x</sub> = ρVx / μ = Vx / ν
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Transition typically occurs at Re<sub>x</sub> ≈ 5×10⁵.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Laminar — Blasius solution:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>δ = 5.0 x / √Re<sub>x</sub></div>
              <div>δ* = 1.72 x / √Re<sub>x</sub></div>
              <div>θ = 0.664 x / √Re<sub>x</sub></div>
              <div>C<sub>f</sub> = 0.664 / √Re<sub>x</sub>&nbsp;&nbsp;&nbsp;H = 2.59</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Turbulent — 1/7 power-law (Prandtl):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>δ = 0.37 x / Re<sub>x</sub><sup>0.2</sup></div>
              <div>δ* = δ/8&nbsp;&nbsp;&nbsp;θ = 7δ/72</div>
              <div>C<sub>f</sub> = 0.0592 / Re<sub>x</sub><sup>0.2</sup>&nbsp;&nbsp;&nbsp;H = 9/7 ≈ 1.29</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Average drag coefficient over plate length L:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Laminar:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;C<sub>D</sub> = 1.328 / √Re<sub>L</sub></div>
              <div>Turbulent:&nbsp;&nbsp;&nbsp;C<sub>D</sub> = 0.074 / Re<sub>L</sub><sup>0.2</sup></div>
              <div>Mixed:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;C<sub>D</sub> = 0.074/Re<sub>L</sub><sup>0.2</sup> − 1742/Re<sub>L</sub></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Mixed formula uses Re<sub>x,crit</sub> = 5×10⁵ for the transition location.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Wall shear stress:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              τ<sub>w</sub> = C<sub>f</sub> × ½ρV²
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>δ = 99% boundary layer thickness [m]</li>
              <li>δ* = displacement thickness — effective streamline displacement [m]</li>
              <li>θ = momentum thickness — related to skin friction drag [m]</li>
              <li>H = shape factor = δ*/θ (2.59 laminar; 1.29 turbulent)</li>
              <li>C<sub>f</sub> = local skin friction coefficient</li>
              <li>τ<sub>w</sub> = wall shear stress [Pa]</li>
              <li>x = distance from leading edge [m]</li>
            </ul>
          </div>
        </div>
      </Card>

      <References refs={REFS_BOUNDARY_LAYER} />
    </div>
  );
}
