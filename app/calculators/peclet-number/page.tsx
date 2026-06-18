"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_MASS_TRANSFER_NUMBERS } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculatePecletNumber,
  generatePecletNumberSteps,
  commonAssumptions,
  commonMistakes,
  type PecletType,
  type PecletMode,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit  = "m" | "mm" | "cm" | "ft";
type VelUnit  = "m/s" | "ft/s" | "mm/s" | "cm/s";
type ViscUnit = "m²/s" | "mm²/s" | "cSt";

const toLm:   Record<LenUnit,  number> = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048 };
const toMS:   Record<VelUnit,  number> = { "m/s": 1, "ft/s": 0.3048, "mm/s": 1e-3, "cm/s": 1e-2 };
const toDiff: Record<ViscUnit, number> = { "m²/s": 1, "mm²/s": 1e-6, "cSt": 1e-6 };

// Thermal diffusivity presets (α, m²/s)
const ALPHA_PRESETS = [
  { label: "Air at 20 °C",             v: "2.13e-5"  },
  { label: "Air at 100 °C",            v: "3.28e-5"  },
  { label: "Water at 20 °C",           v: "1.43e-7"  },
  { label: "Water at 60 °C",           v: "1.59e-7"  },
  { label: "Engine oil at 20 °C",      v: "8.70e-8"  },
  { label: "Ethylene glycol at 20 °C", v: "9.45e-8"  },
  { label: "Copper",                   v: "1.17e-4"  },
  { label: "Aluminium",                v: "8.42e-5"  },
] as const;

// Mass diffusivity presets (D_AB, m²/s)
const DAB_PRESETS = [
  { label: "O₂ in air at 20 °C",       v: "1.81e-5"  },
  { label: "CO₂ in air at 20 °C",      v: "1.60e-5"  },
  { label: "H₂O vapour in air 20 °C",  v: "2.60e-5"  },
  { label: "H₂ in air at 20 °C",       v: "7.20e-5"  },
  { label: "CO in air at 20 °C",       v: "2.03e-5"  },
  { label: "O₂ in water at 25 °C",     v: "2.10e-9"  },
  { label: "NaCl in water at 25 °C",   v: "1.61e-9"  },
  { label: "CO₂ in water at 25 °C",    v: "1.77e-9"  },
] as const;

// ν presets (m²/s) for optional Re output
const NU_PRESETS = [
  { label: "Air at 20 °C",    v: "1.516e-5" },
  { label: "Water at 20 °C",  v: "1.004e-6" },
  { label: "Oil at 20 °C",    v: "2.36e-4"  },
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

function TypeBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-1.5 text-sm font-medium rounded transition-colors ${active
        ? "bg-orange-500 text-white"
        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
      {label}
    </button>
  );
}

export default function PecletNumberCalculator() {
  const [peType,     setPeType]     = useState<PecletType>("thermal");
  const [mode,       setMode]       = useState<PecletMode>("findPe");
  const [Pe,         setPe]         = useState("100");
  const [velocity,   setVelocity]   = useState("1.0");
  const [velUnit,    setVelUnit]    = useState<VelUnit>("m/s");
  const [length,     setLength]     = useState("0.05");
  const [lenUnit,    setLenUnit]    = useState<LenUnit>("m");
  const [diff,       setDiff]       = useState("2.13e-5");
  const [diffUnit,   setDiffUnit]   = useState<ViscUnit>("m²/s");
  const [nu,         setNu]         = useState("1.516e-5");
  const [showNu,     setShowNu]     = useState(false);
  const [selDiff,    setSelDiff]    = useState("Air at 20 °C");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculatePecletNumber> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generatePecletNumberSteps> | null>(null);

  // When type changes, swap to a sensible default diffusivity preset
  const handleTypeChange = (t: PecletType) => {
    setPeType(t);
    if (t === "thermal") {
      setDiff("2.13e-5");
      setSelDiff("Air at 20 °C");
    } else {
      setDiff("1.81e-5");
      setSelDiff("O₂ in air at 20 °C");
    }
  };

  const handleClear = () => {
    setPeType("thermal");
    setMode("findPe");
    setPe("");
    setVelocity("");
    setVelUnit("m/s");
    setLength("");
    setLenUnit("m");
    setDiff("");
    setDiffUnit("m²/s");
    setNu("");
    setSelDiff("");
    setShowNu(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const vSI  = parseFloat(velocity) * toMS[velUnit];
    const lSI  = parseFloat(length)   * toLm[lenUnit];
    const dSI  = parseFloat(diff)     * toDiff[diffUnit];
    const PeVal = parseFloat(Pe);
    const nuSI = parseFloat(nu) * toDiff["m²/s"];

    if (isNaN(dSI)  || dSI  <= 0) newErrors.diff = "Must be a positive number";

    if (mode === "findPe") {
      if (isNaN(vSI) || vSI <= 0)   newErrors.velocity = "Must be a positive number";
      if (isNaN(lSI) || lSI <= 0)   newErrors.length   = "Must be a positive number";
    } else if (mode === "findV") {
      if (isNaN(PeVal) || PeVal <= 0) newErrors.Pe     = "Must be a positive number";
      if (isNaN(lSI)   || lSI   <= 0) newErrors.length = "Must be a positive number";
    } else {
      if (isNaN(PeVal) || PeVal <= 0) newErrors.Pe       = "Must be a positive number";
      if (isNaN(vSI)   || vSI   <= 0) newErrors.velocity = "Must be a positive number";
    }
    if (showNu && (isNaN(nuSI) || nuSI <= 0)) newErrors.nu = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        peType,
        mode,
        velocity:      (mode !== "findV")  ? vSI   : undefined,
        length:        (mode !== "findL")  ? lSI   : (PeVal * dSI) / vSI,  // placeholder; fn computes it
        diffusivity:   dSI,
        pecletNumber:  (mode !== "findPe") ? PeVal : undefined,
        kinematicViscosity: showNu ? nuSI : undefined,
      };
      // For findL mode, length field is unused by the function so pass 1 (Pe·D/V is computed internally)
      const safeInput = {
        ...input,
        length: mode === "findL" ? 1 : lSI,
      };
      const calc = calculatePecletNumber(safeInput as Parameters<typeof calculatePecletNumber>[0]);
      const stp  = generatePecletNumberSteps(safeInput as Parameters<typeof calculatePecletNumber>[0], calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const peVal = result?.pecletNumber ?? 0;
  const regimeBg =
    peVal < 0.1
      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      : peVal <= 10
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      : peVal <= 100
      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
      : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";

  const diffLabel = peType === "thermal" ? "Thermal diffusivity α" : "Mass diffusivity D";
  const diffSymbol = peType === "thermal" ? "α" : "D";
  const diffUnit2 = peType === "thermal" ? "m²/s" : "m²/s";
  const presets = peType === "thermal" ? ALPHA_PRESETS : DAB_PRESETS;
  const secLabel = peType === "thermal" ? "Pr" : "Sc";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Péclet Number Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Pe = VL/D — ratio of convective to diffusive transport.
          Works for both thermal Pe (D = α, thermal diffusivity) and mass-transfer Pe (D = D<sub>AB</sub>, mass diffusivity).
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">
          Heat & Mass Transfer · Dimensionless Number
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Type selector */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Péclet number type:</p>
          <div className="flex gap-2 max-w-sm">
            <TypeBtn label="Thermal  Pe = VL/α"    active={peType === "thermal"} onClick={() => handleTypeChange("thermal")} />
            <TypeBtn label="Mass transfer  Pe = VL/D" active={peType === "mass"}    onClick={() => handleTypeChange("mass")}    />
          </div>
        </div>

        {/* Mode selector */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Solve for:</p>
          <div className="flex gap-2">
            <ModeBtn label="Find Pe"  active={mode === "findPe"} onClick={() => setMode("findPe")} />
            <ModeBtn label="Find V"   active={mode === "findV"}  onClick={() => setMode("findV")}  />
            <ModeBtn label="Find L"   active={mode === "findL"}  onClick={() => setMode("findL")}  />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Pe — shown for findV and findL */}
          {mode !== "findPe" && (
            <div>
              <InputField label="Péclet number" symbol="Pe" unit="dimensionless"
                value={Pe} onChange={setPe}
                error={errors.Pe} />
            </div>
          )}

          {/* Velocity — shown for findPe and findL */}
          {mode !== "findV" && (
            <div>
              <InputField label="Flow velocity" symbol="V" unit={velUnit}
                value={velocity} onChange={setVelocity}
                placeholder={velUnit === "m/s" ? "1.0" : velUnit === "mm/s" ? "1000" : velUnit === "cm/s" ? "100" : "3.28"}
                error={errors.velocity} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m/s", "mm/s", "cm/s", "ft/s"] as VelUnit[]).map(u => (
                  <Btn key={u} label={u} active={velUnit === u} onClick={() => {
                    const raw = parseFloat(velocity);
                    if (!isNaN(raw)) {
                      const converted = raw * toMS[velUnit] / toMS[u];
                      setVelocity(parseFloat(converted.toPrecision(6)).toString());
                    }
                    setVelUnit(u);
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Length — shown for findPe and findV */}
          {mode !== "findL" && (
            <div>
              <InputField label="Characteristic length" symbol="L" unit={lenUnit}
                value={length} onChange={setLength}
                placeholder={lenUnit === "m" ? "0.05" : lenUnit === "mm" ? "50" : lenUnit === "cm" ? "5" : "0.164"}
                error={errors.length} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m", "mm", "cm", "ft"] as LenUnit[]).map(u => (
                  <Btn key={u} label={u} active={lenUnit === u} onClick={() => {
                    const raw = parseFloat(length);
                    if (!isNaN(raw)) {
                      const converted = raw * toLm[lenUnit] / toLm[u];
                      setLength(parseFloat(converted.toPrecision(6)).toString());
                    }
                    setLenUnit(u);
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Diffusivity — always shown */}
          <div>
            <InputField label={diffLabel} symbol={diffSymbol} unit={diffUnit2}
              value={diff} onChange={setDiff}
              placeholder={peType === "thermal" ? "2.13e-5" : "1.81e-5"}
              error={errors.diff} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m²/s", "mm²/s", "cSt"] as ViscUnit[]).map(u => (
                <Btn key={u} label={u} active={diffUnit === u} onClick={() => {
                  const raw = parseFloat(diff);
                  if (!isNaN(raw)) {
                    const converted = raw * toDiff[diffUnit] / toDiff[u];
                    setDiff(parseFloat(converted.toPrecision(6)).toString());
                  }
                  setDiffUnit(u);
                }} />
              ))}
            </div>
            <div className="mt-1">
              <select
                value={selDiff}
                onChange={(e) => {
                  const lbl = e.target.value;
                  setSelDiff(lbl);
                  const p = presets.find(x => x.label === lbl);
                  if (p) setDiff(p.v);
                }}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Preset…</option>
                {presets.map(p => (
                  <option key={p.label} value={p.label}>{p.label} — {p.v} m²/s</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Optional ν for Re and Pr/Sc */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="showNu" checked={showNu}
              onChange={(e) => setShowNu(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="showNu" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Also compute Re and {secLabel} = Pe/Re — enter kinematic viscosity ν
            </label>
          </div>
          {showNu && (
            <div className="max-w-sm">
              <InputField label="Kinematic viscosity" symbol="ν" unit="m²/s"
                value={nu} onChange={setNu}
                error={errors.nu} />
              <div className="mt-1">
                <select
                  onChange={(e) => {
                    const p = NU_PRESETS.find(x => x.label === e.target.value);
                    if (p) setNu(p.v);
                  }}
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">ν preset…</option>
                  {NU_PRESETS.map(p => (
                    <option key={p.label} value={p.label}>{p.label} — {p.v} m²/s</option>
                  ))}
                </select>
              </div>
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
        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                {mode === "findPe" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Péclet number  Pe = V × L / {diffSymbol}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      Pe = {fmt(result.pecletNumber, 5)}
                    </p>
                  </>
                )}
                {mode === "findV" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Flow velocity  V = Pe × {diffSymbol} / L
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {fmt(result.velocity, 5)} m/s
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      Pe = {fmt(result.pecletNumber, 5)}
                    </p>
                  </>
                )}
                {mode === "findL" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Characteristic length  L = Pe × {diffSymbol} / V
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      L = {fmt(result.length, 5)} m
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      Pe = {fmt(result.pecletNumber, 5)}
                    </p>
                  </>
                )}
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Transport quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "Pe",                             value: fmt(result.pecletNumber, 5) },
                    { label: "V [m/s]",                        value: fmt(result.velocity,     5) },
                    { label: "L [m]",                          value: fmt(result.length,        5) },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                {(result.reynoldsNumber !== undefined || result.secondaryNumber !== undefined) && (
                  <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{diffSymbol} [m²/s]</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {fmt(result.diffusivity, 4)}
                      </p>
                    </div>
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Re = VL/ν</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {result.reynoldsNumber !== undefined ? fmt(result.reynoldsNumber, 5) : "—"}
                      </p>
                    </div>
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{secLabel} = Pe/Re</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {result.secondaryNumber !== undefined ? fmt(result.secondaryNumber, 5) : "—"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Regime banner */}
              <div className={`p-4 rounded-lg border ${regimeBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {peVal < 0.1
                    ? "Diffusion dominated (Pe < 0.1)"
                    : peVal <= 10
                    ? "Mixed convection-diffusion (Pe ≈ 0.1 – 10)"
                    : peVal <= 100
                    ? "Convection dominated (Pe > 10)"
                    : "Strongly convection dominated (Pe > 100)"}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.pecletNumber} />
              <CommonMistakes mistakes={commonMistakes.pecletNumber} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Definition — two variants:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Pe<sub>T</sub> = V × L / α = Re × Pr&nbsp;&nbsp;&nbsp;&nbsp;[thermal Péclet number]</div>
              <div>Pe<sub>m</sub> = V × L / D<sub>AB</sub> = Re × Sc&nbsp;&nbsp;&nbsp;&nbsp;[mass-transfer Péclet number]</div>
              <div>α   = k / (ρ c<sub>p</sub>)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[thermal diffusivity, m²/s]</div>
              <div>D<sub>AB</sub> = binary mass diffusivity&nbsp;&nbsp;&nbsp;&nbsp;[m²/s]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Physical meaning:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Pe &lt;&lt; 1 — diffusion dominates; concentration/temperature profiles are nearly uniform</li>
              <li>Pe ≈ 1 — convection and diffusion are equally important</li>
              <li>Pe &gt;&gt; 1 — convection dominates; gradients are confined to thin boundary layers</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Relationship to other dimensionless numbers:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Pe<sub>T</sub> = Re × Pr&nbsp;&nbsp;&nbsp;&nbsp;Pr = ν / α  (momentum / thermal diffusivity)</div>
              <div>Pe<sub>m</sub> = Re × Sc&nbsp;&nbsp;&nbsp;&nbsp;Sc = ν / D<sub>AB</sub>  (momentum / mass diffusivity)</div>
              <div>Re  = V L / ν&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(inertia / viscous forces)</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Typical diffusivity values:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Fluid / pair</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Type</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">D or α [m²/s]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {([
                  { fluid: "Air at 20 °C",            type: <>α (thermal)</>,               d: "2.13 × 10⁻⁵" },
                  { fluid: "Water at 20 °C",          type: <>α (thermal)</>,               d: "1.43 × 10⁻⁷" },
                  { fluid: "O₂ in air at 20 °C",      type: <>D<sub>AB</sub> (mass)</>,     d: "1.81 × 10⁻⁵" },
                  { fluid: "H₂O vapour in air 20 °C", type: <>D<sub>AB</sub> (mass)</>,     d: "2.60 × 10⁻⁵" },
                  { fluid: "O₂ in water at 25 °C",    type: <>D<sub>AB</sub> (mass)</>,     d: "2.10 × 10⁻⁹" },
                  { fluid: "NaCl in water at 25 °C",  type: <>D<sub>AB</sub> (mass)</>,     d: "1.61 × 10⁻⁹" },
                ] as { fluid: string; type: React.ReactNode; d: string }[]).map(({ fluid, type, d }) => (
                  <tr key={fluid}>
                    <td className="py-1.5 pr-4">{fluid}</td>
                    <td className="py-1.5 pr-4 text-xs text-gray-500 dark:text-gray-400">{type}</td>
                    <td className="py-1.5 font-mono">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Pe in numerical methods — mesh Péclet number:</p>
            <p>
              In computational fluid dynamics, the cell Péclet number Pe<sub>cell</sub> = V Δx / D governs
              numerical stability. When Pe<sub>cell</sub> &gt; 2, central-difference schemes produce spurious
              oscillations; upwind schemes or finer meshes are required.
            </p>
          </div>
        </div>
      </Card>
      <References refs={REFS_MASS_TRANSFER_NUMBERS} />
    </div>
  );
}