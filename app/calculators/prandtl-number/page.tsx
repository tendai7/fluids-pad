"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_HEAT_TRANSFER_NUMBERS } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculatePrandtlNumber,
  generatePrandtlNumberSteps,
  commonAssumptions,
  commonMistakes,
  type PrandtlMode,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

// Fluid presets: [label, μ Pa·s, cp J/(kg·K), k W/(m·K), ρ kg/m³]
const FLUID_PRESETS = [
  { label: "Air at 20 °C",              mu: "1.81e-5",  cp: "1005",  k: "0.0257",  rho: "1.204"  },
  { label: "Air at 100 °C",             mu: "2.17e-5",  cp: "1012",  k: "0.0314",  rho: "0.946"  },
  { label: "Water at 20 °C",            mu: "1.002e-3", cp: "4182",  k: "0.5980",  rho: "998.2"  },
  { label: "Water at 60 °C",            mu: "4.67e-4",  cp: "4184",  k: "0.6510",  rho: "983.2"  },
  { label: "Water at 100 °C",           mu: "2.82e-4",  cp: "4216",  k: "0.6790",  rho: "958.4"  },
  { label: "Engine oil at 20 °C",       mu: "0.210",    cp: "1880",  k: "0.1450",  rho: "888"    },
  { label: "Engine oil at 60 °C",       mu: "0.0384",   cp: "1964",  k: "0.1430",  rho: "871"    },
  { label: "Ethylene glycol at 20 °C",  mu: "1.61e-2",  cp: "2382",  k: "0.2520",  rho: "1116"   },
  { label: "Mercury at 20 °C",          mu: "1.526e-3", cp: "139.4", k: "8.540",   rho: "13 546" },
  { label: "Hydrogen at 20 °C",         mu: "8.8e-6",   cp: "14 300",k: "0.1800",  rho: "0.0838" },
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

// Viscosity unit helpers
type ViscUnit = "Pa·s" | "mPa·s" | "cP";
const toViscPa: Record<ViscUnit, number> = { "Pa·s": 1, "mPa·s": 1e-3, "cP": 1e-3 };

export default function PrandtlNumberCalculator() {
  const [mode,      setMode]      = useState<PrandtlMode>("findPr");
  const [mu,        setMu]        = useState("1.81e-5");
  const [muUnit,    setMuUnit]    = useState<ViscUnit>("Pa·s");
  const [cp,        setCp]        = useState("1005");
  const [k,         setK]         = useState("0.0257");
  const [Pr,        setPr]        = useState("0.71");
  const [rho,       setRho]       = useState("");
  const [showRho,   setShowRho]   = useState(false);
  const [selected,  setSelected]  = useState("Air at 20 °C");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculatePrandtlNumber> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generatePrandtlNumberSteps> | null>(null);

  const applyPreset = (label: string) => {
    setSelected(label);
    const p = FLUID_PRESETS.find(x => x.label === label);
    if (!p) return;
    const muClean  = p.mu.replace(/\s/g, "");
    const cpClean  = p.cp.replace(/\s/g, "");
    const rhoClean = p.rho.replace(/\s/g, "");
    setMu(muClean);
    setCp(cpClean);
    setK(p.k);
    setRho(rhoClean);
    // auto-compute Pr for the findH / findK modes
    const muVal = parseFloat(muClean);
    const cpVal = parseFloat(cpClean);
    const kVal  = parseFloat(p.k);
    if (muVal > 0 && cpVal > 0 && kVal > 0) {
      setPr(((muVal * cpVal) / kVal).toPrecision(4));
    }
  };

  const handleClear = () => {
    setMode("findPr");
    setMu("");
    setMuUnit("Pa·s");
    setCp("");
    setK("");
    setPr("");
    setRho("");
    setSelected("");
    setShowRho(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const muVal = parseFloat(mu) * toViscPa[muUnit];
    const cpVal = parseFloat(cp);
    const kVal  = parseFloat(k);
    const PrVal = parseFloat(Pr);
    const rhoVal = showRho ? parseFloat(rho) : undefined;

    if (mode === "findPr") {
      if (isNaN(muVal) || muVal <= 0) newErrors.mu = "Must be a positive number";
      if (isNaN(cpVal) || cpVal <= 0) newErrors.cp = "Must be a positive number";
      if (isNaN(kVal)  || kVal  <= 0) newErrors.k  = "Must be a positive number";
    } else if (mode === "findK") {
      if (isNaN(PrVal) || PrVal <= 0) newErrors.Pr = "Must be a positive number";
      if (isNaN(muVal) || muVal <= 0) newErrors.mu = "Must be a positive number";
      if (isNaN(cpVal) || cpVal <= 0) newErrors.cp = "Must be a positive number";
    } else {
      if (isNaN(PrVal) || PrVal <= 0) newErrors.Pr = "Must be a positive number";
      if (isNaN(kVal)  || kVal  <= 0) newErrors.k  = "Must be a positive number";
      if (isNaN(cpVal) || cpVal <= 0) newErrors.cp = "Must be a positive number";
    }
    if (showRho && (rhoVal === undefined || isNaN(rhoVal) || rhoVal <= 0))
      newErrors.rho = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        mode,
        dynamicViscosity:   (mode !== "findMu") ? muVal  : undefined,
        specificHeat:       cpVal,
        thermalConductivity:(mode !== "findK")  ? kVal   : undefined,
        prandtlNumber:      (mode !== "findPr") ? PrVal  : undefined,
        density:            (showRho && rhoVal !== undefined && !isNaN(rhoVal)) ? rhoVal : undefined,
      };
      const calc = calculatePrandtlNumber(input as Parameters<typeof calculatePrandtlNumber>[0]);
      const stp  = generatePrandtlNumberSteps(input as Parameters<typeof calculatePrandtlNumber>[0], calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const prVal = result?.prandtlNumber ?? 0;
  const regimeBg =
    prVal < 0.1
      ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
      : prVal <= 1
      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      : prVal <= 10
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      : prVal <= 1000
      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
      : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Prandtl Number Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Pr = μc<sub>p</sub>/k — ratio of momentum diffusivity to thermal diffusivity.
          A pure fluid property that governs the relative thickness of velocity and thermal boundary layers.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">
          Heat Transfer · Dimensionless Number
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Mode selector */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Solve for:</p>
          <div className="flex gap-2">
            <ModeBtn label="Find Pr" active={mode === "findPr"} onClick={() => setMode("findPr")} />
            <ModeBtn label="Find k"  active={mode === "findK"}  onClick={() => setMode("findK")}  />
            <ModeBtn label="Find μ"  active={mode === "findMu"} onClick={() => setMode("findMu")} />
          </div>
        </div>

        {/* Fluid presets */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Fluid preset (fills all properties):</p>
          <select
            value={selected}
            onChange={(e) => applyPreset(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a fluid…</option>
            {FLUID_PRESETS.map(p => (
              <option key={p.label} value={p.label}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Pr — shown for findK and findMu */}
          {mode !== "findPr" && (
            <div>
              <InputField label="Prandtl number" symbol="Pr" unit="dimensionless"
                value={Pr} onChange={setPr}
                error={errors.Pr} />
            </div>
          )}

          {/* μ — shown for findPr and findK */}
          {mode !== "findMu" && (
            <div>
              <InputField label="Dynamic viscosity" symbol="μ" unit={muUnit}
                value={mu} onChange={setMu}
                placeholder={muUnit === "Pa·s" ? "1.81e-5" : muUnit === "mPa·s" ? "0.0181" : "0.0181"}
                error={errors.mu} />
              <div className="flex gap-2 -mt-2">
                {(["Pa·s", "mPa·s", "cP"] as ViscUnit[]).map(u => (
                  <Btn key={u} label={u} active={muUnit === u} onClick={() => {
                    const raw = parseFloat(mu);
                    if (!isNaN(raw)) {
                      const converted = raw * toViscPa[muUnit] / toViscPa[u];
                      setMu(parseFloat(converted.toPrecision(6)).toString());
                    }
                    setMuUnit(u);
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* cₚ — always shown */}
          <div>
            <InputField label="Specific heat capacity" symbol="cp" unit="J/(kg·K)"
              value={cp} onChange={setCp}
              error={errors.cp} />
          </div>

          {/* k — shown for findPr and findMu */}
          {mode !== "findK" && (
            <div>
              <InputField label="Thermal conductivity" symbol="k" unit="W/(m·K)"
                value={k} onChange={setK}
                error={errors.k} />
            </div>
          )}
        </div>

        {/* Optional density for ν and α */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="showRho" checked={showRho}
              onChange={(e) => setShowRho(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="showRho" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Also compute ν (kinematic viscosity) and α (thermal diffusivity) — enter density ρ
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

              {/* Primary value */}
              <div>
                {mode === "findPr" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Prandtl number  Pr = μc<sub>p</sub> / k
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      Pr = {fmt(result.prandtlNumber, 5)}
                    </p>
                  </>
                )}
                {mode === "findK" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Thermal conductivity  k = μc<sub>p</sub> / Pr
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {fmt(result.thermalConductivity, 5)} W/(m·K)
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      Pr = {fmt(result.prandtlNumber, 5)}
                    </p>
                  </>
                )}
                {mode === "findMu" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Dynamic viscosity  μ = Pr × k / c<sub>p</sub>
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {fmt(result.dynamicViscosity, 5)} Pa·s
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      Pr = {fmt(result.prandtlNumber, 5)}
                    </p>
                  </>
                )}
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Fluid transport properties
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "Pr",               value: fmt(result.prandtlNumber,    5) },
                    { label: "μ [Pa·s]",          value: fmt(result.dynamicViscosity, 4) },
                    { label: "k [W/(m·K)]",       value: fmt(result.thermalConductivity, 5) },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">c<sub>p</sub> [J/(kg·K)]</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(result.specificHeat, 5)}
                    </p>
                  </div>
                  {result.kinematicViscosity !== undefined ? (
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">ν [m²/s]</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {fmt(result.kinematicViscosity, 4)}
                      </p>
                    </div>
                  ) : (
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">ν [m²/s]</p>
                      <p className="font-mono text-sm font-semibold text-gray-400 dark:text-gray-500">—</p>
                    </div>
                  )}
                  {result.thermalDiffusivity !== undefined ? (
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">α [m²/s]</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {fmt(result.thermalDiffusivity, 4)}
                      </p>
                    </div>
                  ) : (
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">α [m²/s]</p>
                      <p className="font-mono text-sm font-semibold text-gray-400 dark:text-gray-500">—</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Regime banner */}
              <div className={`p-4 rounded-lg border ${regimeBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {prVal < 0.01
                    ? "Liquid metals (Pr << 1)"
                    : prVal < 0.1
                    ? "Mercury / liquid-metal range"
                    : prVal <= 1
                    ? "Gases (Pr ≈ 0.7 – 1)"
                    : prVal <= 10
                    ? "Light liquids / organic fluids"
                    : prVal <= 1000
                    ? "Oils (Pr >> 1)"
                    : "Very viscous liquids (Pr >> 1)"}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.prandtlNumber} />
              <CommonMistakes mistakes={commonMistakes.prandtlNumber} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Definition (three equivalent forms):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Pr = μ × c<sub>p</sub> / k&nbsp;&nbsp;&nbsp;&nbsp;[from measurable fluid properties]</div>
              <div>Pr = ν / α&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[kinematic viscosity / thermal diffusivity]</div>
              <div>Pr = δ<sub>v</sub> / δ<sub>T</sub>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[velocity BL thickness / thermal BL thickness]  (Pr^(1/3) scaling)</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Physical meaning:</p>
            <p>
              Pr tells you which boundary layer is thicker. For Pr = 1, velocity and thermal boundary layers grow
              at the same rate. For Pr &gt; 1 (oils), the velocity boundary layer is thicker — momentum diffuses
              faster than heat. For Pr &lt; 1 (liquid metals), heat conducts faster than momentum diffuses.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Typical Pr values:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Fluid</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Pr</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Regime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { fluid: "Liquid metals (Na, Hg)", pr: "0.003 – 0.03",  regime: "Thermal diffusion dominates"   },
                  { fluid: "Air (20 °C)",            pr: "0.71",           regime: "Gases — Pr ≈ 0.7"             },
                  { fluid: "Water (20 °C)",          pr: "7.0",            regime: "Moderate convection"          },
                  { fluid: "Water (60 °C)",          pr: "3.0",            regime: "Moderate convection"          },
                  { fluid: "Ethylene glycol",        pr: "~ 150",          regime: "Viscous liquid"               },
                  { fluid: "Engine oil (20 °C)",     pr: "~ 2500",         regime: "Momentum diffusion dominates" },
                ].map(({ fluid, pr, regime }) => (
                  <tr key={fluid}>
                    <td className="py-1.5 pr-4">{fluid}</td>
                    <td className="py-1.5 pr-4 font-mono">{pr}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{regime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Prandtl number in heat transfer correlations:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Dittus-Boelter (turbulent pipe): Nu = 0.023 Re⁰·⁸ Prⁿ — valid 0.6 &lt; Pr &lt; 160</li>
              <li>Flat plate laminar: Nu = 0.664 Re^½ Pr^⅓ — valid Pr &gt; 0.6</li>
              <li>Churchill-Chu (natural convection): Nu depends on Ra = Gr × Pr</li>
              <li>At Pr → 0 (liquid metals): separate correlations needed (e.g. Seban-Shimazaki)</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Pr vs Biot (Bi) vs Nusselt (Nu):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Pr = μ c<sub>p</sub> / k&nbsp;&nbsp;&nbsp;&nbsp;pure fluid property — no geometry, no flow</div>
              <div>Nu = h L / k<sub>f</sub>&nbsp;&nbsp;&nbsp;&nbsp;convection intensity — depends on flow and geometry</div>
              <div>Bi = h L / k<sub>s</sub>&nbsp;&nbsp;&nbsp;&nbsp;solid internal resistance — uses solid conductivity</div>
            </div>
          </div>
        </div>
      </Card>

      <References refs={REFS_HEAT_TRANSFER_NUMBERS} />
    </div>
  );
}
