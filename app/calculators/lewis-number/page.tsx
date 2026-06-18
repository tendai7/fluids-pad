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
  calculateLewisNumber,
  generateLewisNumberSteps,
  commonAssumptions,
  commonMistakes,
  type LewisMode,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type DiffUnit = "m²/s" | "mm²/s";
const toDiff: Record<DiffUnit, number> = { "m²/s": 1, "mm²/s": 1e-6 };

// Fluid-pair presets: [label, α m²/s, D_AB m²/s, ν m²/s]
const PAIR_PRESETS = [
  { label: "O₂ in air at 20 °C",           alpha: "2.13e-5", D: "1.81e-5",  nu: "1.516e-5" },
  { label: "CO₂ in air at 20 °C",          alpha: "2.13e-5", D: "1.60e-5",  nu: "1.516e-5" },
  { label: "H₂O vapour in air at 20 °C",   alpha: "2.13e-5", D: "2.60e-5",  nu: "1.516e-5" },
  { label: "H₂ in air at 20 °C",           alpha: "2.13e-5", D: "7.20e-5",  nu: "1.516e-5" },
  { label: "CO in air at 20 °C",           alpha: "2.13e-5", D: "2.03e-5",  nu: "1.516e-5" },
  { label: "Air at 100 °C",                alpha: "3.28e-5", D: "2.82e-5",  nu: "2.306e-5" },
  { label: "O₂ in water at 25 °C",         alpha: "1.43e-7", D: "2.10e-9",  nu: "8.93e-7"  },
  { label: "NaCl in water at 25 °C",       alpha: "1.43e-7", D: "1.61e-9",  nu: "8.93e-7"  },
  { label: "CO₂ in water at 25 °C",        alpha: "1.43e-7", D: "1.77e-9",  nu: "8.93e-7"  },
  { label: "Sucrose in water at 25 °C",    alpha: "1.43e-7", D: "5.23e-10", nu: "8.93e-7"  },
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

export default function LewisNumberCalculator() {
  const [mode,      setMode]      = useState<LewisMode>("findLe");
  const [Le,        setLe]        = useState("1.18");
  const [alpha,     setAlpha]     = useState("2.13e-5");
  const [alphaUnit, setAlphaUnit] = useState<DiffUnit>("m²/s");
  const [D,         setD]         = useState("1.81e-5");
  const [DUnit,     setDUnit]     = useState<DiffUnit>("m²/s");
  const [nu,        setNu]        = useState("1.516e-5");
  const [showNu,    setShowNu]    = useState(false);
  const [selected,  setSelected]  = useState("O₂ in air at 20 °C");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateLewisNumber> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateLewisNumberSteps> | null>(null);

  const applyPreset = (label: string) => {
    setSelected(label);
    const p = PAIR_PRESETS.find(x => x.label === label);
    if (!p) return;
    setAlpha(p.alpha);
    setD(p.D);
    setNu(p.nu);
    const aVal = parseFloat(p.alpha);
    const dVal = parseFloat(p.D);
    if (aVal > 0 && dVal > 0) setLe((aVal / dVal).toPrecision(4));
  };

  const handleClear = () => {
    setMode("findLe");
    setLe("");
    setAlpha("");
    setAlphaUnit("m²/s");
    setD("");
    setDUnit("m²/s");
    setNu("");
    setSelected("");
    setShowNu(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const alphaSI = parseFloat(alpha) * toDiff[alphaUnit];
    const dSI     = parseFloat(D)     * toDiff[DUnit];
    const LeVal   = parseFloat(Le);
    const nuVal   = parseFloat(nu);

    if (mode === "findLe") {
      if (isNaN(alphaSI) || alphaSI <= 0) newErrors.alpha = "Must be a positive number";
      if (isNaN(dSI)     || dSI     <= 0) newErrors.D     = "Must be a positive number";
    } else if (mode === "findAlpha") {
      if (isNaN(LeVal) || LeVal <= 0) newErrors.Le = "Must be a positive number";
      if (isNaN(dSI)   || dSI   <= 0) newErrors.D  = "Must be a positive number";
    } else {
      if (isNaN(LeVal)   || LeVal   <= 0) newErrors.Le    = "Must be a positive number";
      if (isNaN(alphaSI) || alphaSI <= 0) newErrors.alpha = "Must be a positive number";
    }
    if (showNu && (isNaN(nuVal) || nuVal <= 0)) newErrors.nu = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        mode,
        thermalDiffusivity: (mode !== "findAlpha") ? alphaSI : undefined,
        massDiffusivity:    (mode !== "findD")     ? dSI     : undefined,
        lewisNumber:        (mode !== "findLe")    ? LeVal   : undefined,
        kinematicViscosity: showNu ? nuVal : undefined,
      };
      const calc = calculateLewisNumber(input as Parameters<typeof calculateLewisNumber>[0]);
      const stp  = generateLewisNumberSteps(input as Parameters<typeof calculateLewisNumber>[0], calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const leVal = result?.lewisNumber ?? 0;
  const regimeBg =
    leVal < 0.5
      ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
      : leVal <= 1.5
      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      : leVal <= 10
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Lewis Number Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Le = α/D<sub>AB</sub> = Sc/Pr — ratio of thermal to mass diffusivity.
          Governs the coupling between heat and mass transfer; Le = 1 is the foundation of
          the Lewis analogy used in evaporation, drying, and combustion problems.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">
          Heat &amp; Mass Transfer · Dimensionless Number
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Mode selector */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Solve for:</p>
          <div className="flex gap-2">
            <ModeBtn label="Find Le"  active={mode === "findLe"}    onClick={() => setMode("findLe")}    />
            <ModeBtn label="Find α"   active={mode === "findAlpha"} onClick={() => setMode("findAlpha")} />
            <ModeBtn label="Find D"   active={mode === "findD"}     onClick={() => setMode("findD")}     />
          </div>
        </div>

        {/* Fluid-pair presets */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Fluid pair preset (fills α, D<sub>AB</sub>, ν):
          </p>
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

          {/* Le — shown for findAlpha and findD */}
          {mode !== "findLe" && (
            <div>
              <InputField label="Lewis number" symbol="Le" unit="dimensionless"
                value={Le} onChange={setLe}
                error={errors.Le} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                Gases ≈ 0.2–2.5 · Liquids (solute in water) ≈ 50–1000
              </p>
            </div>
          )}

          {/* α — shown for findLe and findD */}
          {mode !== "findAlpha" && (
            <div>
              <InputField label="Thermal diffusivity" symbol="α" unit={alphaUnit}
                value={alpha} onChange={setAlpha}
                placeholder={alphaUnit === "m²/s" ? "2.13e-5" : "21.3"}
                error={errors.alpha} />
              <div className="flex gap-2 -mt-2">
                {(["m²/s", "mm²/s"] as DiffUnit[]).map(u => (
                  <Btn key={u} label={u} active={alphaUnit === u} onClick={() => {
                    const raw = parseFloat(alpha);
                    if (!isNaN(raw)) {
                      const converted = raw * toDiff[alphaUnit] / toDiff[u];
                      setAlpha(parseFloat(converted.toPrecision(6)).toString());
                    }
                    setAlphaUnit(u);
                  }} />
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                α = k / (ρ c<sub>p</sub>) · Air ≈ 2×10⁻⁵ · Water ≈ 1.4×10⁻⁷ m²/s
              </p>
            </div>
          )}

          {/* D_AB — shown for findLe and findAlpha */}
          {mode !== "findD" && (
            <div>
              <InputField label="Mass diffusivity" symbol="D" unit={DUnit}
                value={D} onChange={setD}
                placeholder={DUnit === "m²/s" ? "1.81e-5" : "18.1"}
                error={errors.D} />
              <div className="flex gap-2 -mt-2">
                {(["m²/s", "mm²/s"] as DiffUnit[]).map(u => (
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
                Gas pairs ≈ 10⁻⁵ · Solutes in water ≈ 10⁻⁹ m²/s
              </p>
            </div>
          )}
        </div>

        {/* Optional ν for Pr, Sc, and Le = Sc/Pr check */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="showNu" checked={showNu}
              onChange={(e) => setShowNu(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="showNu" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Also compute Pr, Sc, and verify Le = Sc/Pr — enter kinematic viscosity ν
            </label>
          </div>
          {showNu && (
            <div className="max-w-xs">
              <InputField label="Kinematic viscosity" symbol="ν" unit="m²/s"
                value={nu} onChange={setNu}
                error={errors.nu} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                Air ≈ 1.5×10⁻⁵ · Water ≈ 8.9×10⁻⁷ m²/s
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
        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                {mode === "findLe" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Lewis number  Le = α / D
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      Le = {fmt(result.lewisNumber, 5)}
                    </p>
                  </>
                )}
                {mode === "findAlpha" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Thermal diffusivity  α = Le × D
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {fmt(result.thermalDiffusivity, 5)} m²/s
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      Le = {fmt(result.lewisNumber, 5)}
                    </p>
                  </>
                )}
                {mode === "findD" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Mass diffusivity  D = α / Le
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {fmt(result.massDiffusivity, 5)} m²/s
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      Le = {fmt(result.lewisNumber, 5)}
                    </p>
                  </>
                )}
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Diffusivity quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "Le",           value: fmt(result.lewisNumber,        5) },
                    { label: "α [m²/s]",     value: fmt(result.thermalDiffusivity, 4) },
                    { label: "D [m²/s]",     value: fmt(result.massDiffusivity,    4) },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                {(result.prandtlNumber !== undefined || result.schmidtNumber !== undefined) && (
                  <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Pr = ν/α</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {result.prandtlNumber !== undefined ? fmt(result.prandtlNumber, 5) : "—"}
                      </p>
                    </div>
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Sc = ν/D</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {result.schmidtNumber !== undefined ? fmt(result.schmidtNumber, 5) : "—"}
                      </p>
                    </div>
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Le = Sc/Pr</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {(result.prandtlNumber !== undefined && result.schmidtNumber !== undefined)
                          ? fmt(result.schmidtNumber / result.prandtlNumber, 5)
                          : "—"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Regime banner */}
              <div className={`p-4 rounded-lg border ${regimeBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {leVal < 0.5
                    ? "Le < 1 — concentration BL thicker than thermal BL"
                    : leVal <= 1.5
                    ? "Le ≈ 1 — thermal and concentration BL similar thickness (gases)"
                    : leVal <= 10
                    ? "Le > 1 — thermal BL thicker than concentration BL"
                    : "Le >> 1 — strongly decoupled heat and mass transfer (liquids)"}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.lewisNumber} />
              <CommonMistakes mistakes={commonMistakes.lewisNumber} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Definition — three equivalent forms:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Le = α / D<sub>AB</sub>&nbsp;&nbsp;&nbsp;&nbsp;[from diffusivities]</div>
              <div>Le = Sc / Pr&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[from dimensionless numbers]</div>
              <div>Le = k / (ρ c<sub>p</sub> D<sub>AB</sub>)&nbsp;&nbsp;&nbsp;&nbsp;[expanded form]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Boundary layer thickness ratio:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>δ<sub>T</sub> / δ<sub>c</sub> ≈ Le^(1/3)&nbsp;&nbsp;&nbsp;&nbsp;(for Le &gt;&gt; 1 or Le &lt;&lt; 1)</div>
              <div>δ<sub>T</sub> ≈ δ<sub>c</sub>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(for Le = 1)</div>
            </div>
            <p className="mt-1">
              When Le = 1 (most gases), the thermal and concentration boundary layers are identical — this is the
              basis of the Lewis analogy that simplifies combined heat-mass transfer analysis.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Relationship between Pr, Sc, and Le:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Pr = ν / α&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(momentum / thermal)</div>
              <div>Sc = ν / D<sub>AB</sub>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(momentum / mass)</div>
              <div>Le = α / D<sub>AB</sub> = Sc / Pr&nbsp;&nbsp;&nbsp;(thermal / mass)</div>
            </div>
            <p className="mt-1">
              Any one of Pr, Sc, Le can be derived from the other two plus ν, making this a
              self-consistent set of three diffusivity ratios.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Typical Le values:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">System</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Le</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Regime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { sys: "H₂ in air at 20 °C",         le: "0.30",     regime: "Le < 1 — mass diffuses fast" },
                  { sys: "H₂O vapour in air at 20 °C", le: "0.82",     regime: "Le ≈ 1 (gas)" },
                  { sys: "O₂ in air at 20 °C",         le: "1.18",     regime: "Le ≈ 1 (gas)" },
                  { sys: "CO₂ in air at 20 °C",        le: "1.33",     regime: "Le ≈ 1 (gas)" },
                  { sys: "O₂ in water at 25 °C",       le: "≈ 68",     regime: "Le >> 1 (liquid)" },
                  { sys: "NaCl in water at 25 °C",     le: "≈ 89",     regime: "Le >> 1 (liquid)" },
                  { sys: "Sucrose in water at 25 °C",  le: "≈ 274",    regime: "Le >> 1 (liquid)" },
                ].map(({ sys, le, regime }) => (
                  <tr key={sys}>
                    <td className="py-1.5 pr-4">{sys}</td>
                    <td className="py-1.5 pr-4 font-mono">{le}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{regime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Lewis analogy in engineering:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Evaporative cooling:</strong> Le ≈ 1 for humid air allows wet-bulb temperature to be predicted from enthalpy difference alone</li>
              <li><strong>Drying:</strong> Le governs whether the drying rate is heat-transfer or mass-transfer limited</li>
              <li><strong>Combustion:</strong> Le &lt; 1 fuels (H₂) have thicker flame fronts and are more susceptible to cellular instabilities</li>
              <li><strong>Absorption towers:</strong> Le of the liquid phase (≫ 1) controls whether design is heat or mass transfer limited</li>
            </ul>
          </div>
        </div>
      </Card>
      <References refs={REFS_MASS_TRANSFER_NUMBERS} />
    </div>
  );
}