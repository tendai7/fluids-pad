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
  calculateGrashofNumber,
  generateGrashofNumberSteps,
  commonAssumptions,
  commonMistakes,
  type GrashofMode,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit  = "m" | "mm" | "cm" | "ft";
type ViscUnit = "m²/s" | "mm²/s" | "cSt";

const toLm:   Record<LenUnit,  number> = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048 };
const toNuSI: Record<ViscUnit, number> = { "m²/s": 1, "mm²/s": 1e-6, "cSt": 1e-6 };

// β presets in 1/K
const BETA_PRESETS = [
  { label: "Air (ideal gas approx) at 20 °C  (T = 293 K)",  beta: "3.41e-3" },
  { label: "Air (ideal gas approx) at 50 °C  (T = 323 K)",  beta: "3.10e-3" },
  { label: "Air (ideal gas approx) at 100 °C (T = 373 K)",  beta: "2.68e-3" },
  { label: "Water at 20 °C",                                 beta: "2.07e-4" },
  { label: "Water at 60 °C",                                 beta: "5.23e-4" },
  { label: "Water at 80 °C",                                 beta: "6.43e-4" },
  { label: "Engine oil at 20 °C",                            beta: "7.0e-4"  },
  { label: "Ethylene glycol at 20 °C",                       beta: "5.7e-4"  },
] as const;

// ν presets in m²/s
const NU_PRESETS = [
  { label: "Air at 20 °C",              nu: "1.516e-5" },
  { label: "Air at 100 °C",             nu: "2.306e-5" },
  { label: "Water at 20 °C",            nu: "1.004e-6" },
  { label: "Water at 60 °C",            nu: "4.75e-7"  },
  { label: "Engine oil at 20 °C",       nu: "2.36e-4"  },
  { label: "Ethylene glycol at 20 °C",  nu: "1.44e-5"  },
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

export default function GrashofNumberCalculator() {
  const [mode,       setMode]       = useState<GrashofMode>("findGr");
  const [Gr,         setGr]         = useState("1e8");
  const [beta,       setBeta]       = useState("3.41e-3");
  const [dT,         setDt]         = useState("20");
  const [length,     setLength]     = useState("0.3");
  const [lenUnit,    setLenUnit]    = useState<LenUnit>("m");
  const [nu,         setNu]         = useState("1.516e-5");
  const [nuUnit,     setNuUnit]     = useState<ViscUnit>("m²/s");
  const [Pr,         setPr]         = useState("0.71");
  const [showPr,     setShowPr]     = useState(false);
  const [selBeta,    setSelBeta]    = useState("Air (ideal gas approx) at 20 °C  (T = 293 K)");
  const [selNu,      setSelNu]      = useState("Air at 20 °C");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateGrashofNumber> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateGrashofNumberSteps> | null>(null);

  const handleClear = () => {
    setMode("findGr");
    setGr("");
    setBeta("");
    setDt("");
    setLength("");
    setLenUnit("m");
    setNu("");
    setNuUnit("m²/s");
    setPr("");
    setSelBeta("");
    setSelNu("");
    setShowPr(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const betaVal = parseFloat(beta);
    const nuSI    = parseFloat(nu) * toNuSI[nuUnit];
    const lSI     = parseFloat(length) * toLm[lenUnit];
    const dTVal   = parseFloat(dT);
    const GrVal   = parseFloat(Gr);
    const PrVal   = parseFloat(Pr);

    if (isNaN(betaVal) || betaVal <= 0) newErrors.beta = "Must be a positive number";
    if (isNaN(nuSI)    || nuSI    <= 0) newErrors.nu   = "Must be a positive number";

    if (mode === "findGr") {
      if (isNaN(dTVal) || dTVal <= 0) newErrors.dT     = "Must be a positive number";
      if (isNaN(lSI)   || lSI   <= 0) newErrors.length = "Must be a positive number";
    } else if (mode === "findDT") {
      if (isNaN(GrVal) || GrVal <= 0) newErrors.Gr     = "Must be a positive number";
      if (isNaN(lSI)   || lSI   <= 0) newErrors.length = "Must be a positive number";
    } else {
      if (isNaN(GrVal) || GrVal <= 0) newErrors.Gr     = "Must be a positive number";
      if (isNaN(dTVal) || dTVal <= 0) newErrors.dT     = "Must be a positive number";
    }
    if (showPr && (isNaN(PrVal) || PrVal <= 0)) newErrors.Pr = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        mode,
        thermalExpansion:   betaVal,
        kinematicViscosity: nuSI,
        length:             lSI,
        deltaT:             (mode !== "findDT") ? dTVal : undefined,
        grashofNumber:      (mode !== "findGr") ? GrVal : undefined,
        prandtlNumber:      showPr ? PrVal : undefined,
      };
      const calc = calculateGrashofNumber(input as Parameters<typeof calculateGrashofNumber>[0]);
      const stp  = generateGrashofNumberSteps(input as Parameters<typeof calculateGrashofNumber>[0], calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const grVal = result?.grashofNumber ?? 0;
  const regimeBg =
    grVal < 1e4
      ? "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-600"
      : grVal < 1e8
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      : grVal < 1e9
      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
      : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Grashof Number Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Gr = gβΔTL³/ν² — ratio of buoyancy to viscous forces in natural convection.
          Determines whether free convection is laminar or turbulent and is the natural-convection analogue of Re².
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
            <ModeBtn label="Find Gr"  active={mode === "findGr"}  onClick={() => setMode("findGr")}  />
            <ModeBtn label="Find ΔT"  active={mode === "findDT"}  onClick={() => setMode("findDT")}  />
            <ModeBtn label="Find L"   active={mode === "findL"}   onClick={() => setMode("findL")}   />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Gr — shown for findDT and findL */}
          {(mode === "findDT" || mode === "findL") && (
            <div>
              <InputField label="Grashof number" symbol="Gr" unit="dimensionless"
                value={Gr} onChange={setGr}
                error={errors.Gr} />
            </div>
          )}

          {/* β — always shown */}
          <div>
            <InputField label="Thermal expansion coefficient" symbol="β" unit="1/K"
              value={beta} onChange={setBeta}
              error={errors.beta} />
            <div className="flex items-center gap-2 -mt-2">
              <select
                value={selBeta}
                onChange={(e) => {
                  const lbl = e.target.value;
                  setSelBeta(lbl);
                  const p = BETA_PRESETS.find(x => x.label === lbl);
                  if (p) setBeta(p.beta);
                }}
                className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Fluid β preset…</option>
                {BETA_PRESETS.map(p => (
                  <option key={p.label} value={p.label}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ΔT — shown for findGr and findL */}
          {(mode === "findGr" || mode === "findL") && (
            <div>
              <InputField label="Temperature difference" symbol="ΔT" unit="K"
                value={dT} onChange={setDt}
                error={errors.dT} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                |T<sub>wall</sub> − T<sub>∞</sub>|  (magnitude, always positive)
              </p>
            </div>
          )}

          {/* L — shown for findGr and findDT */}
          {(mode === "findGr" || mode === "findDT") && (
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
            <div className="mt-1">
              <select
                value={selNu}
                onChange={(e) => {
                  const lbl = e.target.value;
                  setSelNu(lbl);
                  const p = NU_PRESETS.find(x => x.label === lbl);
                  if (p) setNu(p.nu);
                }}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Fluid ν preset…</option>
                {NU_PRESETS.map(p => (
                  <option key={p.label} value={p.label}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Optional Pr for Ra */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="showPr" checked={showPr}
              onChange={(e) => setShowPr(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="showPr" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Also compute Rayleigh number Ra = Gr × Pr — enter Prandtl number
            </label>
          </div>
          {showPr && (
            <div className="max-w-xs">
              <InputField label="Prandtl number" symbol="Pr" unit="dimensionless"
                value={Pr} onChange={setPr}
                error={errors.Pr} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                Air ≈ 0.71 · Water at 20 °C ≈ 7.0 · Engine oil ≈ 2500
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
                {mode === "findGr" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Grashof number  Gr = gβΔTL³ / ν²
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      Gr = {fmt(result.grashofNumber, 5)}
                    </p>
                  </>
                )}
                {mode === "findDT" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Temperature difference  ΔT = Gr × ν² / (gβL³)
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      ΔT = {fmt(result.deltaT, 5)} K
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      Gr = {fmt(result.grashofNumber, 5)}
                    </p>
                  </>
                )}
                {mode === "findL" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Characteristic length  L = (Gr × ν² / (gβΔT))^(1/3)
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      L = {fmt(result.length, 5)} m
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      Gr = {fmt(result.grashofNumber, 5)}
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
                    { label: "Gr",       value: fmt(result.grashofNumber, 5) },
                    { label: "ΔT [K]",   value: fmt(result.deltaT,        5) },
                    { label: "L [m]",    value: fmt(result.length,         5) },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                {result.rayleighNumber !== undefined && (
                  <div className="border-t border-gray-200 dark:border-gray-600">
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Ra = Gr × Pr</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {fmt(result.rayleighNumber, 5)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Regime banner */}
              <div className={`p-4 rounded-lg border ${regimeBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {grVal < 1e4
                    ? "Negligible natural convection (Gr < 10⁴)"
                    : grVal < 1e8
                    ? "Laminar natural convection (Gr < 10⁸)"
                    : grVal < 1e9
                    ? "Transitional natural convection (10⁸ < Gr < 10⁹)"
                    : "Turbulent natural convection (Gr > 10⁹)"}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.grashofNumber} />
              <CommonMistakes mistakes={commonMistakes.grashofNumber} />
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
              <div>Gr = g × β × ΔT × L³ / ν²&nbsp;&nbsp;&nbsp;&nbsp;[dimensionless]</div>
              <div>Ra = Gr × Pr&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Rayleigh number]</div>
            </div>
            <p className="mt-2">
              Gr is the ratio of buoyancy forces to viscous forces. It plays the same role in natural
              convection that Re² plays in forced convection — it governs whether the flow is laminar or turbulent.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Thermal expansion coefficient β:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Ideal gas:  β = 1 / T<sub>film</sub>&nbsp;&nbsp;&nbsp;&nbsp;(T<sub>film</sub> in Kelvin)</div>
              <div>T<sub>film</sub> = (T<sub>wall</sub> + T<sub>∞</sub>) / 2</div>
              <div>Liquids: use tabulated values — do NOT use ideal-gas approximation</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Characteristic length L by geometry:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Geometry</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">L</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Regime boundary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { geo: "Vertical plate / wall",  L: "plate height H",           bound: "Gr < 10⁸ laminar, > 10⁹ turbulent" },
                  { geo: "Horizontal cylinder",    L: "outer diameter D",          bound: "Ra = Gr × Pr used in correlations"  },
                  { geo: "Sphere",                 L: "diameter D",                bound: "Ra = Gr × Pr used in correlations"  },
                  { geo: "Horizontal plate (hot)", L: "area / perimeter  (A/P)",   bound: "Ra < 7×10⁴ laminar"               },
                  { geo: "Enclosed cavity",        L: "gap width",                 bound: "Gr based on gap"                   },
                ].map(({ geo, L, bound }) => (
                  <tr key={geo}>
                    <td className="py-1.5 pr-4">{geo}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{L}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{bound}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Regime thresholds (vertical plate):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Gr &lt; 10⁴&nbsp;&nbsp;&nbsp;negligible natural convection</div>
              <div>10⁴ – 10⁸&nbsp;laminar natural convection boundary layer</div>
              <div>10⁸ – 10⁹&nbsp;transitional</div>
              <div>Gr &gt; 10⁹&nbsp;&nbsp;&nbsp;turbulent natural convection</div>
            </div>
            <p className="mt-1">
              Most Nu correlations for natural convection use Ra = Gr × Pr rather than Gr alone,
              so always compute Ra when using a heat transfer correlation.
            </p>
          </div>
        </div>
      </Card>

      <References refs={REFS_HEAT_TRANSFER_NUMBERS} />
    </div>
  );
}
