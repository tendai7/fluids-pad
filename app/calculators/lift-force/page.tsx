"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_LIFT_FORCE } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateLiftForce,
  generateLiftForceSteps,
  commonAssumptions,
  commonMistakes,
  type LiftMode,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type VelUnit  = "m/s" | "km/h" | "knots" | "ft/s";
type AreaUnit = "m²" | "ft²";
type DensUnit = "kg/m³" | "g/cm³";
type ForceUnit = "N" | "kN" | "lbf" | "kgf";

const toMS:   Record<VelUnit,  number> = { "m/s": 1, "km/h": 1/3.6, "knots": 0.514444, "ft/s": 0.3048 };
const toM2:   Record<AreaUnit, number> = { "m²": 1, "ft²": 0.092903 };
const toKgM3: Record<DensUnit, number> = { "kg/m³": 1, "g/cm³": 1000 };

// ISA standard atmosphere presets
const FLUID_PRESETS = [
  { label: "Air — sea level",  density: "1.225" },
  { label: "Air — 1 000 m",   density: "1.112" },
  { label: "Air — 3 000 m",   density: "0.909" },
  { label: "Air — 5 000 m",   density: "0.736" },
  { label: "Air — 10 000 m",  density: "0.414" },
  { label: "Water (hydrofoil)",density: "998"   },
] as const;

// CL and CD presets for common airfoils / conditions
const AERODYNAMIC_PRESETS = [
  { label: "Thin airfoil α = 2°",           CL: "0.220", CD: "0.005" },
  { label: "Thin airfoil α = 4°",           CL: "0.439", CD: "0.008" },
  { label: "Thin airfoil α = 6°",           CL: "0.657", CD: "0.013" },
  { label: "NACA 2412, cruise (α = 4°)",    CL: "0.650", CD: "0.009" },
  { label: "NACA 2412, climb (α = 8°)",     CL: "1.050", CD: "0.018" },
  { label: "Clark Y, cruise",               CL: "0.700", CD: "0.014" },
  { label: "Flat plate α = 5°",             CL: "0.550", CD: "0.080" },
  { label: "Near stall (CL_max ≈ 1.5)",     CL: "1.500", CD: "0.070" },
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

export default function LiftForceCalculator() {
  const [mode,         setMode]         = useState<LiftMode>("findL");
  const [CL,           setCL]           = useState("0.65");
  const [CD,           setCD]           = useState("0.009");
  const [showCD,       setShowCD]       = useState(true);
  const [selectedPreset, setSelectedPreset] = useState("NACA 2412, cruise (α = 4°)");

  // AoA helper
  const [useAoA,       setUseAoA]       = useState(false);
  const [aoa,          setAoa]          = useState("4");

  // Wing area: direct or span×chord
  const [useSpanChord, setUseSpanChord] = useState(false);
  const [wingArea,     setWingArea]     = useState("20");
  const [areaUnit,     setAreaUnit]     = useState<AreaUnit>("m²");
  const [span,         setSpan]         = useState("10");
  const [chord,        setChord]        = useState("2");

  const [velocity,     setVelocity]     = useState("70");
  const [velUnit,      setVelUnit]      = useState<VelUnit>("m/s");
  const [density,      setDensity]      = useState("1.225");
  const [densUnit,     setDensUnit]     = useState<DensUnit>("kg/m³");
  const [targetLift,   setTargetLift]   = useState("50000");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateLiftForce> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateLiftForceSteps> | null>(null);

  // Auto-compute CL from AoA using thin airfoil theory
  const handleAoaChange = (val: string) => {
    setAoa(val);
    const alpha = parseFloat(val);
    if (!isNaN(alpha)) {
      const clVal = 2 * Math.PI * Math.sin(alpha * Math.PI / 180);
      setCL(clVal.toFixed(4));
    }
  };

  const handleClear = () => {
    setMode("findL");
    setCL("");
    setCD("");
    setSelectedPreset("");
    setAoa("");
    setWingArea("");
    setAreaUnit("m²");
    setSpan("");
    setChord("");
    setVelocity("");
    setVelUnit("m/s");
    setDensity("");
    setDensUnit("kg/m³");
    setTargetLift("");
    setShowCD(true);
    setUseAoA(false);
    setUseSpanChord(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const clVal   = parseFloat(CL);
    const cdVal   = parseFloat(CD);
    const vRaw    = parseFloat(velocity);
    const rhoRaw  = parseFloat(density);
    const liftRaw = parseFloat(targetLift);

    if (isNaN(rhoRaw) || rhoRaw <= 0) newErrors.density = "Must be a positive number";

    // Wing area
    let areaSI: number;
    if (useSpanChord) {
      const s = parseFloat(span), c = parseFloat(chord);
      if (isNaN(s) || s <= 0) newErrors.span = "Must be a positive number";
      if (isNaN(c) || c <= 0) newErrors.chord = "Must be a positive number";
      areaSI = (!isNaN(s) && !isNaN(c)) ? s * c : 0;
    } else {
      const a = parseFloat(wingArea);
      if (isNaN(a) || a <= 0) newErrors.wingArea = "Must be a positive number";
      areaSI = isNaN(a) ? 0 : a * toM2[areaUnit];
    }

    if (mode === "findL") {
      if (isNaN(clVal) || clVal <= 0)  newErrors.CL       = "Must be a positive number";
      if (isNaN(vRaw)  || vRaw  <= 0)  newErrors.velocity = "Must be a positive number";
    } else if (mode === "findCL") {
      if (isNaN(liftRaw) || liftRaw <= 0) newErrors.targetLift = "Must be a positive number";
      if (isNaN(vRaw)    || vRaw  <= 0)   newErrors.velocity   = "Must be a positive number";
    } else {
      if (isNaN(clVal)   || clVal   <= 0) newErrors.CL         = "Must be a positive number";
      if (isNaN(liftRaw) || liftRaw <= 0) newErrors.targetLift = "Must be a positive number";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const rhoSI = rhoRaw * toKgM3[densUnit];
    const vSI   = vRaw   * toMS[velUnit];

    try {
      const input = {
        mode, density: rhoSI, wingArea: areaSI,
        liftCoefficient: (mode !== "findCL")  ? clVal   : undefined,
        velocity:        (mode !== "findVstall") ? vSI  : undefined,
        targetLift:      (mode !== "findL")    ? liftRaw : undefined,
        dragCoefficient: (showCD && !isNaN(cdVal) && cdVal > 0) ? cdVal : undefined,
      };
      const calc = calculateLiftForce(input);
      const stp  = generateLiftForceSteps(input, calc);
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
          Lift Force Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Lift on a wing or airfoil: L = C<sub>L</sub> × ½ρV² × S.
          Find lift, lift coefficient, or stall speed.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
          Fluid Mechanics II
        </span>
      </div>

      {/* Altitude / fluid presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Altitude / fluid presets — click to auto-fill density
        </h2>
        <div className="flex flex-wrap gap-2">
          {FLUID_PRESETS.map((p) => (
            <button key={p.label}
              onClick={() => { setDensity(p.density); setDensUnit("kg/m³"); }}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Mode selector */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Solve for:</p>
          <div className="flex gap-2">
            <ModeBtn label="Find lift force L"     active={mode === "findL"}      onClick={() => setMode("findL")} />
            <ModeBtn label="Find lift coeff. CL"   active={mode === "findCL"}     onClick={() => setMode("findCL")} />
            <ModeBtn label="Find stall speed"      active={mode === "findVstall"} onClick={() => setMode("findVstall")} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* CL + AoA helper + presets — shown for findL and findVstall */}
          {mode !== "findCL" && (
            <div>
              <InputField
                label={mode === "findVstall" ? "Max lift coefficient" : "Lift coefficient"}
                symbol="CL" unit="dimensionless"
                value={CL} onChange={setCL} error={errors.CL} />
              <div className="flex items-center gap-2 -mt-2">
                <select
                  value={selectedPreset}
                  onChange={(e) => {
                    const lbl = e.target.value;
                    setSelectedPreset(lbl);
                    const p = AERODYNAMIC_PRESETS.find(x => x.label === lbl);
                    if (p) { setCL(p.CL); setCD(p.CD); }
                  }}
                  className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Airfoil preset…</option>
                  {AERODYNAMIC_PRESETS.map(p => (
                    <option key={p.label} value={p.label}>{p.label} — CL = {p.CL}</option>
                  ))}
                </select>
              </div>
              {/* AoA helper */}
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="useAoA" checked={useAoA}
                  onChange={(e) => setUseAoA(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded" />
                <label htmlFor="useAoA" className="text-xs text-gray-600 dark:text-gray-400">
                  Compute C<sub>L</sub> from angle of attack α (thin airfoil: C<sub>L</sub> = 2π sin α)
                </label>
              </div>
              {useAoA && (
                <div className="mt-2">
                  <InputField label="Angle of attack" symbol="α" unit="degrees"
                    value={aoa} onChange={handleAoaChange} />
                </div>
              )}
            </div>
          )}

          {/* Velocity — shown for findL and findCL */}
          {mode !== "findVstall" && (
            <div>
              <InputField label="Free-stream velocity" symbol="V" unit={velUnit}
                value={velocity} onChange={setVelocity}
                placeholder={velUnit === "m/s" ? "70" : velUnit === "km/h" ? "252" : velUnit === "knots" ? "136" : "230"}
                error={errors.velocity} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m/s", "km/h", "knots", "ft/s"] as VelUnit[]).map(u => (
                  <Btn key={u} label={u} active={velUnit === u} onClick={() => {
                    const si = parseFloat(velocity) * toMS[velUnit];
                    setVelUnit(u);
                    if (!isNaN(si)) setVelocity(fmt(si / toMS[u]));
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Density */}
          <div>
            <InputField label="Air / fluid density" symbol="ρ" unit={densUnit}
              value={density} onChange={setDensity}
              placeholder={densUnit === "kg/m³" ? "1.225" : "0.001225"}
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

          {/* Target lift — shown for findCL and findVstall */}
          {mode !== "findL" && (
            <div>
              <InputField
                label={mode === "findVstall" ? "Aircraft weight (= lift in level flight)" : "Known lift force"}
                symbol="L" unit="N"
                value={targetLift} onChange={setTargetLift} error={errors.targetLift} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
                In level flight, lift = weight.
              </p>
            </div>
          )}

          {/* Wing area: direct or span×chord */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <input type="checkbox" id="spanChord" checked={useSpanChord}
                onChange={(e) => setUseSpanChord(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded" />
              <label htmlFor="spanChord" className="text-sm text-gray-700 dark:text-gray-300">
                Enter span × chord instead of area
              </label>
            </div>
            {useSpanChord ? (
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Wing span" symbol="b" unit="m"
                  value={span} onChange={setSpan} error={errors.span} />
                <InputField label="Mean chord" symbol="c" unit="m"
                  value={chord} onChange={setChord} error={errors.chord} />
              </div>
            ) : (
              <>
                <InputField label="Wing planform area" symbol="S" unit={areaUnit}
                  value={wingArea} onChange={setWingArea}
                  placeholder={areaUnit === "m²" ? "20" : "215"}
                  error={errors.wingArea} />
                <div className="flex gap-2 -mt-2">
                  {(["m²", "ft²"] as AreaUnit[]).map(u => (
                    <Btn key={u} label={u} active={areaUnit === u} onClick={() => {
                      const si = parseFloat(wingArea) * toM2[areaUnit];
                      setAreaUnit(u);
                      if (!isNaN(si)) setWingArea(fmt(si / toM2[u]));
                    }} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Drag coefficient — optional */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <input type="checkbox" id="showCD" checked={showCD}
                onChange={(e) => setShowCD(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded" />
              <label htmlFor="showCD" className="text-sm text-gray-700 dark:text-gray-300">
                Include drag coefficient C<sub>D</sub> (for L/D ratio)
              </label>
            </div>
            {showCD && (
              <InputField label="Drag coefficient" symbol="CD" unit="dimensionless"
                value={CD} onChange={setCD} />
            )}
          </div>
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
        const L = result.liftForce;
        const fUnits: [string, number][] = [
          ["N",   L],
          ["kN",  L / 1000],
          ["lbf", L / 4.44822],
          ["kgf", L / 9.80665],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              {mode === "findL" && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Lift force  L = C<sub>L</sub> × ½ρV² × S
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {fmt(L, 5)} N
                  </p>
                  <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                    {fmt(L / 4.44822, 4)} lbf
                  </p>
                </div>
              )}
              {mode === "findCL" && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Lift coefficient  C<sub>L</sub> = L / (½ρV² × S)
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    C<sub>L</sub> = {fmt(result.liftCoefficient, 5)}
                  </p>
                </div>
              )}
              {mode === "findVstall" && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Stall speed  V<sub>s</sub> = √(2L / (ρ × S × C<sub>L_max</sub>))
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {fmt(result.velocity * 3.6, 5)} km/h
                  </p>
                  <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                    {fmt(result.velocity, 4)} m/s&nbsp;&nbsp;|&nbsp;&nbsp;
                    {fmt(result.velocity / 0.514444, 4)} knots
                  </p>
                </div>
              )}

              {/* Unit grid */}
              {mode === "findL" && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Lift force in other units
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {fUnits.map(([unit, value]) => (
                      <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                        <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related quantities */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Related quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {([
                    { label: <>C<sub>L</sub></>,             value: fmt(result.liftCoefficient, 4)                      },
                    { label: <>½ρV² (Pa)</>,                value: fmt(result.dynamicPressure, 4)                       },
                    { label: <>L/D</>,                      value: result.liftToDragRatio !== undefined ? fmt(result.liftToDragRatio, 4) : "— (enter CD)" },
                  ] as { label: React.ReactNode; value: string }[]).map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interpretation */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.liftForce} />
              <CommonMistakes mistakes={commonMistakes.liftForce} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Lift and drag equations:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>L = C<sub>L</sub> × ½ρV² × S&nbsp;&nbsp;&nbsp;&nbsp;[N]</div>
              <div>D = C<sub>D</sub> × ½ρV² × S&nbsp;&nbsp;&nbsp;&nbsp;[N]</div>
              <div>L/D = C<sub>L</sub> / C<sub>D</sub></div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Stall speed (level flight, L = Weight W):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              V<sub>s</sub> = √(2W / (ρ × S × C<sub>L,max</sub>))&nbsp;&nbsp;&nbsp;&nbsp;[m/s]
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Thin airfoil theory (CL from angle of attack):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              C<sub>L</sub> = 2π sin(α) ≈ 2πα&nbsp;&nbsp;&nbsp;&nbsp;(α small, in radians)
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Valid for thin, uncambered airfoils at small angles. Real airfoils deviate, especially near stall.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Typical C<sub>L</sub> and C<sub>D</sub> values:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Airfoil / condition</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">C<sub>L</sub></th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">C<sub>D</sub></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {AERODYNAMIC_PRESETS.map(({ label, CL, CD }) => (
                  <tr key={label}>
                    <td className="py-1.5 pr-4">{label}</td>
                    <td className="py-1.5 pr-4 font-mono">{CL}</td>
                    <td className="py-1.5 font-mono">{CD}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">ISA standard atmosphere densities:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Altitude</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">ρ (kg/m³)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {FLUID_PRESETS.filter(p => p.label.includes("Air")).map(({ label, density }) => (
                  <tr key={label}>
                    <td className="py-1.5 pr-4">{label}</td>
                    <td className="py-1.5 font-mono">{density}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>L = lift force [N]</li>
              <li>C<sub>L</sub> = lift coefficient (dimensionless, function of α and airfoil shape)</li>
              <li>ρ = fluid density [kg/m³]</li>
              <li>V = free-stream velocity [m/s]</li>
              <li>S = wing planform reference area = span × mean chord [m²]</li>
              <li>α = angle of attack [°]</li>
            </ul>
          </div>
        </div>
      </Card>

      <References refs={REFS_LIFT_FORCE} />
    </div>
  );
}
