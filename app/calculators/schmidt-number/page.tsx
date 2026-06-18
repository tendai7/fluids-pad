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
  calculateSchmidtNumber,
  generateSchmidtNumberSteps,
  commonAssumptions,
  commonMistakes,
  type SchmidtMode,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type DiffUnit = "m²/s" | "mm²/s" | "cSt";

const toDiff: Record<DiffUnit, number> = { "m²/s": 1, "mm²/s": 1e-6, "cSt": 1e-6 };

// Fluid-pair presets: [label, ν m²/s, D_AB m²/s, ρ kg/m³]
const PAIR_PRESETS = [
  { label: "O₂ in air at 20 °C",           nu: "1.516e-5", D: "1.81e-5",  rho: "1.204"  },
  { label: "CO₂ in air at 20 °C",          nu: "1.516e-5", D: "1.60e-5",  rho: "1.204"  },
  { label: "H₂O vapour in air at 20 °C",   nu: "1.516e-5", D: "2.60e-5",  rho: "1.204"  },
  { label: "H₂ in air at 20 °C",           nu: "1.516e-5", D: "7.20e-5",  rho: "1.204"  },
  { label: "CO in air at 20 °C",           nu: "1.516e-5", D: "2.03e-5",  rho: "1.204"  },
  { label: "O₂ in water at 25 °C",         nu: "8.93e-7",  D: "2.10e-9",  rho: "997"    },
  { label: "NaCl in water at 25 °C",       nu: "8.93e-7",  D: "1.61e-9",  rho: "997"    },
  { label: "CO₂ in water at 25 °C",        nu: "8.93e-7",  D: "1.77e-9",  rho: "997"    },
  { label: "Sucrose in water at 25 °C",    nu: "8.93e-7",  D: "5.23e-10", rho: "997"    },
  { label: "Ethanol in water at 25 °C",    nu: "8.93e-7",  D: "1.28e-9",  rho: "997"    },
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

export default function SchmidtNumberCalculator() {
  const [mode,     setMode]     = useState<SchmidtMode>("findSc");
  const [Sc,       setSc]       = useState("0.838");
  const [nu,       setNu]       = useState("1.516e-5");
  const [nuUnit,   setNuUnit]   = useState<DiffUnit>("m²/s");
  const [D,        setD]        = useState("1.81e-5");
  const [DUnit,    setDUnit]    = useState<DiffUnit>("m²/s");
  const [rho,      setRho]      = useState("1.204");
  const [showRho,  setShowRho]  = useState(false);
  const [selected, setSelected] = useState("O₂ in air at 20 °C");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateSchmidtNumber> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateSchmidtNumberSteps> | null>(null);

  const applyPreset = (label: string) => {
    setSelected(label);
    const p = PAIR_PRESETS.find(x => x.label === label);
    if (!p) return;
    setNu(p.nu);
    setD(p.D);
    setRho(p.rho);
    // auto-update Sc display for findD/findNu modes
    const nuVal = parseFloat(p.nu);
    const dVal  = parseFloat(p.D);
    if (nuVal > 0 && dVal > 0) setSc((nuVal / dVal).toPrecision(4));
  };

  const handleClear = () => {
    setMode("findSc");
    setSc("");
    setNu("");
    setNuUnit("m²/s");
    setD("");
    setDUnit("m²/s");
    setRho("");
    setSelected("");
    setShowRho(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const nuSI  = parseFloat(nu) * toDiff[nuUnit];
    const dSI   = parseFloat(D)  * toDiff[DUnit];
    const ScVal = parseFloat(Sc);
    const rhoVal = parseFloat(rho);

    if (mode === "findSc") {
      if (isNaN(nuSI)  || nuSI  <= 0) newErrors.nu = "Must be a positive number";
      if (isNaN(dSI)   || dSI   <= 0) newErrors.D  = "Must be a positive number";
    } else if (mode === "findD") {
      if (isNaN(ScVal) || ScVal <= 0) newErrors.Sc = "Must be a positive number";
      if (isNaN(nuSI)  || nuSI  <= 0) newErrors.nu = "Must be a positive number";
    } else {
      if (isNaN(ScVal) || ScVal <= 0) newErrors.Sc = "Must be a positive number";
      if (isNaN(dSI)   || dSI   <= 0) newErrors.D  = "Must be a positive number";
    }
    if (showRho && (isNaN(rhoVal) || rhoVal <= 0)) newErrors.rho = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        mode,
        kinematicViscosity: (mode !== "findNu") ? nuSI  : undefined,
        massDiffusivity:    (mode !== "findD")  ? dSI   : undefined,
        schmidtNumber:      (mode !== "findSc") ? ScVal : undefined,
        density:            showRho ? rhoVal : undefined,
      };
      const calc = calculateSchmidtNumber(input as Parameters<typeof calculateSchmidtNumber>[0]);
      const stp  = generateSchmidtNumberSteps(input as Parameters<typeof calculateSchmidtNumber>[0], calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const scVal = result?.schmidtNumber ?? 0;
  const regimeBg =
    scVal < 0.5
      ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
      : scVal <= 3
      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      : scVal <= 100
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      : scVal <= 1000
      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
      : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Schmidt Number Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Sc = ν/D<sub>AB</sub> — ratio of momentum diffusivity to mass diffusivity.
          The mass-transfer analogue of the Prandtl number; governs the relative thickness of velocity
          and concentration boundary layers.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">
          Mass Transfer · Dimensionless Number
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Mode selector */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Solve for:</p>
          <div className="flex gap-2">
            <ModeBtn label="Find Sc"  active={mode === "findSc"} onClick={() => setMode("findSc")} />
            <ModeBtn label="Find D"   active={mode === "findD"}  onClick={() => setMode("findD")}  />
            <ModeBtn label="Find ν"   active={mode === "findNu"} onClick={() => setMode("findNu")} />
          </div>
        </div>

        {/* Fluid-pair presets */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Fluid pair preset (fills ν, D<sub>AB</sub>, ρ):</p>
          <select
            value={selected}
            onChange={(e) => applyPreset(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a fluid pair…</option>
            {PAIR_PRESETS.map(p => (
              <option key={p.label} value={p.label}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Sc — shown for findD and findNu */}
          {mode !== "findSc" && (
            <div>
              <InputField label="Schmidt number" symbol="Sc" unit="dimensionless"
                value={Sc} onChange={setSc}
                error={errors.Sc} />
            </div>
          )}

          {/* ν — shown for findSc and findD */}
          {mode !== "findNu" && (
            <div>
              <InputField label="Kinematic viscosity" symbol="ν" unit={nuUnit}
                value={nu} onChange={setNu}
                placeholder={nuUnit === "m²/s" ? "1.516e-5" : "15.16"}
                error={errors.nu} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m²/s", "mm²/s", "cSt"] as DiffUnit[]).map(u => (
                  <Btn key={u} label={u} active={nuUnit === u} onClick={() => {
                    const raw = parseFloat(nu);
                    if (!isNaN(raw)) {
                      const converted = raw * toDiff[nuUnit] / toDiff[u];
                      setNu(parseFloat(converted.toPrecision(6)).toString());
                    }
                    setNuUnit(u);
                  }} />
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Air ≈ 1.5×10⁻⁵ · Water ≈ 1×10⁻⁶ · Oil ≈ 10⁻⁴–10⁻³ m²/s
              </p>
            </div>
          )}

          {/* D_AB — shown for findSc and findNu */}
          {mode !== "findD" && (
            <div>
              <InputField label="Mass diffusivity" symbol="D" unit={DUnit}
                value={D} onChange={setD}
                placeholder={DUnit === "m²/s" ? "1.81e-5" : "18.1"}
                error={errors.D} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m²/s", "mm²/s", "cSt"] as DiffUnit[]).map(u => (
                  <Btn key={u} label={u} active={DUnit === u} onClick={() => {
                    const raw = parseFloat(D);
                    if (!isNaN(raw)) {
                      const converted = raw * toDiff[DUnit] / toDiff[u];
                      setD(parseFloat(converted.toPrecision(6)).toString());
                    }
                    setDUnit(u);
                  }} />
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Gas pairs ≈ 10⁻⁵ · Solute in water ≈ 10⁻⁹ m²/s
              </p>
            </div>
          )}
        </div>

        {/* Optional density */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="showRho" checked={showRho}
              onChange={(e) => setShowRho(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="showRho" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Also compute dynamic viscosity μ = ρν — enter density ρ
            </label>
          </div>
          {showRho && (
            <div className="max-w-xs">
              <InputField label="Density" symbol="ρ" unit="kg/m³"
                value={rho} onChange={setRho}
                error={errors.rho} />
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
                {mode === "findSc" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Schmidt number  Sc = ν / D
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      Sc = {fmt(result.schmidtNumber, 5)}
                    </p>
                  </>
                )}
                {mode === "findD" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Mass diffusivity  D = ν / Sc
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {fmt(result.massDiffusivity, 5)} m²/s
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      Sc = {fmt(result.schmidtNumber, 5)}
                    </p>
                  </>
                )}
                {mode === "findNu" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Kinematic viscosity  ν = Sc × D
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {fmt(result.kinematicViscosity, 5)} m²/s
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      Sc = {fmt(result.schmidtNumber, 5)}
                    </p>
                  </>
                )}
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Mass-transfer properties
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "Sc",          value: fmt(result.schmidtNumber,     5) },
                    { label: "ν [m²/s]",    value: fmt(result.kinematicViscosity, 4) },
                    { label: "D [m²/s]",    value: fmt(result.massDiffusivity,    4) },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                {result.dynamicViscosity !== undefined && (
                  <div className="border-t border-gray-200 dark:border-gray-600">
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                        μ = ρν  [Pa·s]
                      </p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {fmt(result.dynamicViscosity, 4)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Regime banner */}
              <div className={`p-4 rounded-lg border ${regimeBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {scVal < 0.5
                    ? "Low Sc (Sc < 0.5) — mass diffusion faster than momentum"
                    : scVal <= 3
                    ? "Sc ≈ 1 — gases, similar velocity and concentration BL thickness"
                    : scVal <= 100
                    ? "Moderate Sc (3 – 100) — momentum diffusion dominates"
                    : scVal <= 1000
                    ? "High Sc (100 – 1000) — liquids, thin concentration BL"
                    : "Very high Sc (> 1000) — heavy solutes in viscous liquids"}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.schmidtNumber} />
              <CommonMistakes mistakes={commonMistakes.schmidtNumber} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Definition:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Sc = ν / D<sub>AB</sub>&nbsp;&nbsp;&nbsp;&nbsp;[dimensionless]</div>
              <div>Sc = μ / (ρ × D<sub>AB</sub>)&nbsp;&nbsp;&nbsp;&nbsp;[equivalent form using μ and ρ]</div>
              <div>ν  = μ / ρ&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[kinematic viscosity, m²/s]</div>
              <div>D<sub>AB</sub> = binary mass diffusivity&nbsp;&nbsp;&nbsp;&nbsp;[m²/s]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Physical meaning — boundary layer thickness ratio:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>δ<sub>c</sub> / δ<sub>v</sub> ≈ Sc^(−1/3)&nbsp;&nbsp;&nbsp;&nbsp;(for Sc &gt;&gt; 1)</div>
              <div>δ<sub>c</sub> ≈ δ<sub>v</sub>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(for Sc ≈ 1, gases)</div>
            </div>
            <p className="mt-1">
              For water (Sc ≈ 500), the concentration boundary layer is about 8× thinner than the
              velocity boundary layer.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Sc vs Pr — heat/mass transfer analogy:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Pr = ν / α&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(thermal: momentum vs heat diffusion)</div>
              <div>Sc = ν / D<sub>AB</sub>&nbsp;&nbsp;&nbsp;(mass: momentum vs species diffusion)</div>
              <div>Le = α / D<sub>AB</sub> = Sc / Pr&nbsp;&nbsp;&nbsp;(Lewis number: heat vs mass diffusion)</div>
            </div>
            <p className="mt-1">
              The heat-mass transfer analogy lets you replace Pr with Sc (and Nu with Sh) in most
              forced-convection correlations.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Typical Sc values:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">System</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Sc</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Regime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { sys: "H₂ in air",             sc: "0.21",        regime: "fast diffusion" },
                  { sys: "O₂ in air",             sc: "0.84",        regime: "Sc ≈ 1 (gas)" },
                  { sys: "CO₂ in air",            sc: "0.95",        regime: "Sc ≈ 1 (gas)" },
                  { sys: "O₂ in water at 25 °C",  sc: "≈ 425",       regime: "liquid" },
                  { sys: "NaCl in water at 25 °C",sc: "≈ 555",       regime: "liquid" },
                  { sys: "Sucrose in water 25 °C", sc: "≈ 1 700",     regime: "heavy solute" },
                ].map(({ sys, sc, regime }) => (
                  <tr key={sys}>
                    <td className="py-1.5 pr-4">{sys}</td>
                    <td className="py-1.5 pr-4 font-mono">{sc}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{regime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
      <References refs={REFS_MASS_TRANSFER_NUMBERS} />
    </div>
  );
}