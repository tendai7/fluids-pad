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
  calculateRayleighNumber,
  generateRayleighNumberSteps,
  commonAssumptions,
  commonMistakes,
  type RayleighMode,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit  = "m" | "mm" | "cm" | "ft";
type ViscUnit = "m²/s" | "mm²/s" | "cSt";

const toLm:   Record<LenUnit,  number> = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048 };
const toNuSI: Record<ViscUnit, number> = { "m²/s": 1, "mm²/s": 1e-6, "cSt": 1e-6 };

// Fluid presets: [label, β 1/K, ν m²/s, α m²/s, k W/(m·K)]
const FLUID_PRESETS = [
  { label: "Air at 20 °C",             beta: "3.41e-3", nu: "1.516e-5", alpha: "2.13e-5",  k: "0.0257"  },
  { label: "Air at 50 °C",             beta: "3.10e-3", nu: "1.795e-5", alpha: "2.52e-5",  k: "0.0283"  },
  { label: "Air at 100 °C",            beta: "2.68e-3", nu: "2.306e-5", alpha: "3.28e-5",  k: "0.0314"  },
  { label: "Water at 20 °C",           beta: "2.07e-4", nu: "1.004e-6", alpha: "1.43e-7",  k: "0.5980"  },
  { label: "Water at 60 °C",           beta: "5.23e-4", nu: "4.75e-7",  alpha: "1.59e-7",  k: "0.6510"  },
  { label: "Water at 80 °C",           beta: "6.43e-4", nu: "3.65e-7",  alpha: "1.65e-7",  k: "0.6700"  },
  { label: "Engine oil at 20 °C",      beta: "7.0e-4",  nu: "2.36e-4",  alpha: "8.70e-8",  k: "0.1450"  },
  { label: "Ethylene glycol at 20 °C", beta: "5.7e-4",  nu: "1.44e-5",  alpha: "9.45e-8",  k: "0.2520"  },
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

export default function RayleighNumberCalculator() {
  const [mode,     setMode]     = useState<RayleighMode>("findRa");
  const [Ra,       setRa]       = useState("1e8");
  const [beta,     setBeta]     = useState("3.41e-3");
  const [dT,       setDt]       = useState("20");
  const [length,   setLength]   = useState("0.3");
  const [lenUnit,  setLenUnit]  = useState<LenUnit>("m");
  const [nu,       setNu]       = useState("1.516e-5");
  const [nuUnit,   setNuUnit]   = useState<ViscUnit>("m²/s");
  const [alpha,    setAlpha]    = useState("2.13e-5");
  const [alphaUnit,setAlphaUnit]= useState<ViscUnit>("m²/s");
  const [k,        setK]        = useState("0.0257");
  const [showK,    setShowK]    = useState(false);
  const [selected, setSelected] = useState("Air at 20 °C");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateRayleighNumber> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateRayleighNumberSteps> | null>(null);

  const applyPreset = (label: string) => {
    setSelected(label);
    const p = FLUID_PRESETS.find(x => x.label === label);
    if (!p) return;
    setBeta(p.beta);
    setNu(p.nu);
    setAlpha(p.alpha);
    setK(p.k);
  };

  const handleClear = () => {
    setMode("findRa");
    setRa("");
    setBeta("");
    setDt("");
    setLength("");
    setLenUnit("m");
    setNu("");
    setNuUnit("m²/s");
    setAlpha("");
    setAlphaUnit("m²/s");
    setK("");
    setSelected("");
    setShowK(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const betaVal  = parseFloat(beta);
    const nuSI     = parseFloat(nu)    * toNuSI[nuUnit];
    const alphaSI  = parseFloat(alpha) * toNuSI[alphaUnit];
    const lSI      = parseFloat(length) * toLm[lenUnit];
    const dTVal    = parseFloat(dT);
    const RaVal    = parseFloat(Ra);
    const kVal     = parseFloat(k);

    if (isNaN(betaVal)  || betaVal  <= 0) newErrors.beta  = "Must be a positive number";
    if (isNaN(nuSI)     || nuSI     <= 0) newErrors.nu    = "Must be a positive number";
    if (isNaN(alphaSI)  || alphaSI  <= 0) newErrors.alpha = "Must be a positive number";

    if (mode === "findRa") {
      if (isNaN(dTVal) || dTVal <= 0) newErrors.dT     = "Must be a positive number";
      if (isNaN(lSI)   || lSI   <= 0) newErrors.length = "Must be a positive number";
    } else if (mode === "findDT") {
      if (isNaN(RaVal) || RaVal <= 0) newErrors.Ra     = "Must be a positive number";
      if (isNaN(lSI)   || lSI   <= 0) newErrors.length = "Must be a positive number";
    } else {
      if (isNaN(RaVal) || RaVal <= 0) newErrors.Ra  = "Must be a positive number";
      if (isNaN(dTVal) || dTVal <= 0) newErrors.dT  = "Must be a positive number";
    }
    if (showK && (isNaN(kVal) || kVal <= 0)) newErrors.k = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        mode,
        thermalExpansion:   betaVal,
        kinematicViscosity: nuSI,
        thermalDiffusivity: alphaSI,
        length:             lSI,
        deltaT:             (mode !== "findDT") ? dTVal : undefined,
        rayleighNumber:     (mode !== "findRa") ? RaVal : undefined,
        thermalConductivity: showK ? kVal : undefined,
      };
      const calc = calculateRayleighNumber(input as Parameters<typeof calculateRayleighNumber>[0]);
      const stp  = generateRayleighNumberSteps(input as Parameters<typeof calculateRayleighNumber>[0], calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const raVal = result?.rayleighNumber ?? 0;
  const regimeBg =
    raVal < 1e4
      ? "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-600"
      : raVal < 1e9
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Rayleigh Number Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Ra = gβΔTL³/(να) = Gr × Pr — governs natural convection onset and intensity.
          Used directly in Nu correlations (Churchill-Chu, Morgan, etc.) for heat transfer coefficient prediction.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">
          Heat Transfer · Natural Convection
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Mode selector */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Solve for:</p>
          <div className="flex gap-2">
            <ModeBtn label="Find Ra"  active={mode === "findRa"}  onClick={() => setMode("findRa")}  />
            <ModeBtn label="Find ΔT"  active={mode === "findDT"}  onClick={() => setMode("findDT")}  />
            <ModeBtn label="Find L"   active={mode === "findL"}   onClick={() => setMode("findL")}   />
          </div>
        </div>

        {/* Fluid presets */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Fluid preset (fills β, ν, α, k):</p>
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

          {/* Ra — shown for findDT and findL */}
          {(mode === "findDT" || mode === "findL") && (
            <div>
              <InputField label="Rayleigh number" symbol="Ra" unit="dimensionless"
                value={Ra} onChange={setRa}
                error={errors.Ra} />
            </div>
          )}

          {/* β — always shown */}
          <div>
            <InputField label="Thermal expansion coefficient" symbol="β" unit="1/K"
              value={beta} onChange={setBeta}
              error={errors.beta} />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
              Ideal gas: β = 1/T<sub>film</sub> (K). Liquids: use tabulated values.
            </p>
          </div>

          {/* ΔT — shown for findRa and findL */}
          {(mode === "findRa" || mode === "findL") && (
            <div>
              <InputField label="Temperature difference" symbol="ΔT" unit="K"
                value={dT} onChange={setDt}
                error={errors.dT} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                |T<sub>wall</sub> − T<sub>∞</sub>|  (magnitude)
              </p>
            </div>
          )}

          {/* L — shown for findRa and findDT */}
          {(mode === "findRa" || mode === "findDT") && (
            <div>
              <InputField label="Characteristic length" symbol="L" unit={lenUnit}
                value={length} onChange={setLength}
                placeholder={lenUnit === "m" ? "0.3" : lenUnit === "mm" ? "300" : lenUnit === "cm" ? "30" : "1.0"}
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

          {/* ν — always shown */}
          <div>
            <InputField label="Kinematic viscosity" symbol="ν" unit={nuUnit}
              value={nu} onChange={setNu}
              placeholder={nuUnit === "m²/s" ? "1.516e-5" : "15.16"}
              error={errors.nu} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m²/s", "mm²/s", "cSt"] as ViscUnit[]).map(u => (
                <Btn key={u} label={u} active={nuUnit === u} onClick={() => {
                  const raw = parseFloat(nu);
                  if (!isNaN(raw)) {
                    const converted = raw * toNuSI[nuUnit] / toNuSI[u];
                    setNu(parseFloat(converted.toPrecision(6)).toString());
                  }
                  setNuUnit(u);
                }} />
              ))}
            </div>
          </div>

          {/* α — always shown */}
          <div>
            <InputField label="Thermal diffusivity" symbol="α" unit={alphaUnit}
              value={alpha} onChange={setAlpha}
              placeholder={alphaUnit === "m²/s" ? "2.13e-5" : "21.3"}
              error={errors.alpha} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m²/s", "mm²/s", "cSt"] as ViscUnit[]).map(u => (
                <Btn key={u} label={u} active={alphaUnit === u} onClick={() => {
                  const raw = parseFloat(alpha);
                  if (!isNaN(raw)) {
                    const converted = raw * toNuSI[alphaUnit] / toNuSI[u];
                    setAlpha(parseFloat(converted.toPrecision(6)).toString());
                  }
                  setAlphaUnit(u);
                }} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              α = k / (ρ c<sub>p</sub>)  — Pr = ν / α is computed automatically
            </p>
          </div>
        </div>

        {/* Optional k for h output */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="showK" checked={showK}
              onChange={(e) => setShowK(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="showK" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Also compute heat transfer coefficient h — enter thermal conductivity k
            </label>
          </div>
          {showK && (
            <div className="max-w-xs">
              <InputField label="Thermal conductivity" symbol="k" unit="W/(m·K)"
                value={k} onChange={setK}
                error={errors.k} />
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
                {mode === "findRa" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Rayleigh number  Ra = gβΔTL³ / (να)
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      Ra = {fmt(result.rayleighNumber, 5)}
                    </p>
                  </>
                )}
                {mode === "findDT" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Temperature difference  ΔT = Ra × ν × α / (gβL³)
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      ΔT = {fmt(result.deltaT, 5)} K
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      Ra = {fmt(result.rayleighNumber, 5)}
                    </p>
                  </>
                )}
                {mode === "findL" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Characteristic length  L = (Ra × ν × α / (gβΔT))^(1/3)
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      L = {fmt(result.length, 5)} m
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      Ra = {fmt(result.rayleighNumber, 5)}
                    </p>
                  </>
                )}
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Natural convection quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "Ra",      value: fmt(result.rayleighNumber, 5) },
                    { label: "Gr",      value: fmt(result.grashofNumber,  5) },
                    { label: "Pr",      value: fmt(result.prandtlNumber,  5) },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">ΔT [K]</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(result.deltaT, 5)}
                    </p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">L [m]</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(result.length, 5)}
                    </p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Nu (Churchill-Chu)</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {result.nusseltNumber !== undefined ? fmt(result.nusseltNumber, 5) : "—"}
                    </p>
                  </div>
                </div>
                {result.heatTransferCoeff !== undefined && (
                  <div className="border-t border-gray-200 dark:border-gray-600">
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">h = Nu × k / L  [W/(m²·K)]</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {fmt(result.heatTransferCoeff, 5)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Regime banner */}
              <div className={`p-4 rounded-lg border ${regimeBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {raVal < 1e4
                    ? "Negligible natural convection (Ra < 10⁴)"
                    : raVal < 1e9
                    ? "Laminar natural convection (Ra < 10⁹)"
                    : "Turbulent natural convection (Ra > 10⁹)"}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.rayleighNumber} />
              <CommonMistakes mistakes={commonMistakes.rayleighNumber} />
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
              <div>Ra = g × β × ΔT × L³ / (ν × α)&nbsp;&nbsp;&nbsp;[from diffusivities]</div>
              <div>Ra = Gr × Pr&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Grashof × Prandtl]</div>
              <div>α  = k / (ρ × c<sub>p</sub>)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[thermal diffusivity]</div>
              <div>Pr = ν / α&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[derived automatically]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Churchill-Chu correlation (vertical isothermal plate, all Ra):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono text-xs space-y-1">
              <div>Nu = &#123;0.825 + 0.387 Ra^(1/6) / [1 + (0.492/Pr)^(9/16)]^(8/27)&#125;²</div>
              <div>h  = Nu × k / L</div>
            </div>
            <p className="mt-1">
              Valid for all Ra from laminar to turbulent. For laminar only (Ra &lt; 10⁹) a slightly more
              accurate form exists: Nu = 0.68 + 0.670 Ra^(1/4) / [1 + (0.492/Pr)^(9/16)]^(4/9).
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Regime thresholds (vertical plate):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Ra &lt; 10⁴&nbsp;&nbsp;&nbsp;&nbsp;negligible natural convection — conduction dominates</div>
              <div>10⁴ – 10⁹&nbsp; laminar natural convection boundary layer</div>
              <div>Ra &gt; 10⁹&nbsp;&nbsp;&nbsp;&nbsp;turbulent natural convection</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Characteristic length L by geometry:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Geometry</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">L</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Correlation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { geo: "Vertical plate / wall",    L: "plate height H",        corr: "Churchill-Chu" },
                  { geo: "Horizontal cylinder",      L: "diameter D",            corr: "Morgan; Churchill-Bernstein" },
                  { geo: "Sphere",                   L: "diameter D",            corr: "Churchill" },
                  { geo: "Horizontal plate (hot up / cold down)", L: "A/P",      corr: "McAdams" },
                  { geo: "Horizontal plate (hot down)", L: "A/P",                corr: "McAdams (weaker convection)" },
                ].map(({ geo, L, corr }) => (
                  <tr key={geo}>
                    <td className="py-1.5 pr-4">{geo}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{L}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{corr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Ra vs Gr vs Pr:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Gr = g β ΔT L³ / ν²&nbsp;&nbsp;&nbsp;(buoyancy vs viscous — no thermal info)</div>
              <div>Pr = ν / α&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(momentum vs thermal diffusivity)</div>
              <div>Ra = Gr × Pr&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(full natural-convection parameter)</div>
            </div>
            <p className="mt-1">
              Nu correlations almost always require Ra, not Gr alone. Always multiply by Pr before
              applying a heat transfer correlation.
            </p>
          </div>
        </div>
      </Card>

      <References refs={REFS_HEAT_TRANSFER_NUMBERS} />
    </div>
  );
}
