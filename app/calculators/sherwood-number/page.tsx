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
  calculateSherwoodNumber,
  generateSherwoodNumberSteps,
  commonAssumptions,
  commonMistakes,
  type SherwoodMode,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit = "m" | "mm" | "cm" | "ft";

const toLm: Record<LenUnit, number> = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048 };

// D_AB presets (m²/s)
const DAB_PRESETS = [
  { label: "O₂ in air at 20 °C",          D: "1.81e-5"  },
  { label: "CO₂ in air at 20 °C",         D: "1.60e-5"  },
  { label: "H₂O vapour in air at 20 °C",  D: "2.60e-5"  },
  { label: "H₂ in air at 20 °C",          D: "7.20e-5"  },
  { label: "CO in air at 20 °C",          D: "2.03e-5"  },
  { label: "O₂ in water at 25 °C",        D: "2.10e-9"  },
  { label: "NaCl in water at 25 °C",      D: "1.61e-9"  },
  { label: "CO₂ in water at 25 °C",       D: "1.77e-9"  },
  { label: "Sucrose in water at 25 °C",   D: "5.23e-10" },
] as const;

// Sh presets for findKc / findD modes
const SH_PRESETS = [
  { label: "Laminar pipe flow, const-concentration  (Sh = 3.66)",   Sh: "3.66"  },
  { label: "Laminar pipe flow, const-flux           (Sh = 4.36)",   Sh: "4.36"  },
  { label: "Pure diffusion in/around sphere         (Sh = 2.0)",    Sh: "2.0"   },
  { label: "Sphere, Re=100, Sc=1  (Ranz-Marshall)",                 Sh: "8.0"   },
  { label: "Turbulent pipe, Re=10 000, Sc=1",                       Sh: "36.0"  },
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

export default function SherwoodNumberCalculator() {
  const [mode,      setMode]      = useState<SherwoodMode>("findSh");
  const [Sh,        setSh]        = useState("3.66");
  const [kc,        setKc]        = useState("1.0e-4");
  const [D,         setD]         = useState("1.81e-5");
  const [length,    setLength]    = useState("0.05");
  const [lenUnit,   setLenUnit]   = useState<LenUnit>("m");
  const [selD,      setSelD]      = useState("O₂ in air at 20 °C");
  const [selSh,     setSelSh]     = useState("Laminar pipe flow, const-concentration  (Sh = 3.66)");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateSherwoodNumber> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateSherwoodNumberSteps> | null>(null);

  const handleClear = () => {
    setMode("findSh");
    setSh("");
    setKc("");
    setD("");
    setLength("");
    setLenUnit("m");
    setSelD("");
    setSelSh("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const lSI  = parseFloat(length) * toLm[lenUnit];
    const kcVal = parseFloat(kc);
    const dVal  = parseFloat(D);
    const ShVal = parseFloat(Sh);

    if (isNaN(lSI) || lSI <= 0) newErrors.length = "Must be a positive number";

    if (mode === "findSh") {
      if (isNaN(kcVal) || kcVal <= 0) newErrors.kc = "Must be a positive number";
      if (isNaN(dVal)  || dVal  <= 0) newErrors.D  = "Must be a positive number";
    } else if (mode === "findKc") {
      if (isNaN(ShVal) || ShVal <= 0) newErrors.Sh = "Must be a positive number";
      if (isNaN(dVal)  || dVal  <= 0) newErrors.D  = "Must be a positive number";
    } else {
      if (isNaN(ShVal) || ShVal <= 0) newErrors.Sh = "Must be a positive number";
      if (isNaN(kcVal) || kcVal <= 0) newErrors.kc = "Must be a positive number";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        mode,
        characteristicLength: lSI,
        massTransferCoeff:    (mode !== "findKc") ? kcVal : undefined,
        massDiffusivity:      (mode !== "findD")  ? dVal  : undefined,
        sherwoodNumber:       (mode !== "findSh") ? ShVal : undefined,
      };
      const calc = calculateSherwoodNumber(input as Parameters<typeof calculateSherwoodNumber>[0]);
      const stp  = generateSherwoodNumberSteps(input as Parameters<typeof calculateSherwoodNumber>[0], calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const shVal = result?.sherwoodNumber ?? 0;
  const regimeBg =
    shVal < 1.5
      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      : shVal < 10
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      : shVal < 100
      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
      : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Sherwood Number Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Sh = k<sub>c</sub>L/D<sub>AB</sub> — dimensionless convective mass transfer.
          The mass-transfer analogue of the Nusselt number; relates convective mass transfer
          coefficient to molecular diffusivity over a characteristic length.
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
            <ModeBtn label="Find Sh"               active={mode === "findSh"}  onClick={() => setMode("findSh")}  />
            <ModeBtn label="Find kc"               active={mode === "findKc"}  onClick={() => setMode("findKc")}  />
            <ModeBtn label="Find D"                active={mode === "findD"}   onClick={() => setMode("findD")}   />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* L — always shown */}
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

          {/* k_c — shown for findSh and findD */}
          {mode !== "findKc" && (
            <div>
              <InputField label="Mass transfer coefficient" symbol="kc" unit="m/s"
                value={kc} onChange={setKc}
                error={errors.kc} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                Typical: gas-phase 10⁻³–10⁻¹ m/s · liquid-phase 10⁻⁶–10⁻⁴ m/s
              </p>
            </div>
          )}

          {/* D_AB — shown for findSh and findKc */}
          {mode !== "findD" && (
            <div>
              <InputField label="Mass diffusivity" symbol="D" unit="m²/s"
                value={D} onChange={setD}
                error={errors.D} />
              <div className="flex items-center gap-2 -mt-2">
                <select
                  value={selD}
                  onChange={(e) => {
                    const lbl = e.target.value;
                    setSelD(lbl);
                    const p = DAB_PRESETS.find(x => x.label === lbl);
                    if (p) setD(p.D);
                  }}
                  className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">D preset…</option>
                  {DAB_PRESETS.map(p => (
                    <option key={p.label} value={p.label}>{p.label} — {p.D} m²/s</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Sh — shown for findKc and findD */}
          {mode !== "findSh" && (
            <div>
              <InputField label="Sherwood number" symbol="Sh" unit="dimensionless"
                value={Sh} onChange={setSh}
                error={errors.Sh} />
              <div className="flex items-center gap-2 -mt-2">
                <select
                  value={selSh}
                  onChange={(e) => {
                    const lbl = e.target.value;
                    setSelSh(lbl);
                    const p = SH_PRESETS.find(x => x.label === lbl);
                    if (p) setSh(p.Sh);
                  }}
                  className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Geometry preset…</option>
                  {SH_PRESETS.map(p => (
                    <option key={p.label} value={p.label}>{p.label}</option>
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
                {mode === "findSh" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Sherwood number  Sh = k<sub>c</sub> × L / D
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      Sh = {fmt(result.sherwoodNumber, 5)}
                    </p>
                  </>
                )}
                {mode === "findKc" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Mass transfer coefficient  k<sub>c</sub> = Sh × D / L
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {fmt(result.massTransferCoeff, 5)} m/s
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      Sh = {fmt(result.sherwoodNumber, 5)}
                    </p>
                  </>
                )}
                {mode === "findD" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Mass diffusivity  D = k<sub>c</sub> × L / Sh
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {fmt(result.massDiffusivity, 5)} m²/s
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      Sh = {fmt(result.sherwoodNumber, 5)}
                    </p>
                  </>
                )}
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Mass transfer quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {([
                    { label: <>Sh</>,                                      value: fmt(result.sherwoodNumber,   5) },
                    { label: <>k<sub>c</sub> [m/s]</>,                    value: fmt(result.massTransferCoeff, 5) },
                    { label: <>D [m²/s]</>,                               value: fmt(result.massDiffusivity,   5) },
                  ] as { label: React.ReactNode; value: string }[]).map(({ label, value }) => (
                    <div key={value} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 dark:border-gray-600">
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      D/L — pure diffusion reference [m/s]
                    </p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(result.diffusionCoeff, 5)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Regime banner */}
              <div className={`p-4 rounded-lg border ${regimeBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {shVal < 1.5
                    ? "Near-diffusion regime (Sh ≈ 1)"
                    : shVal < 10
                    ? "Weak convective mass transfer (Sh < 10)"
                    : shVal < 100
                    ? "Moderate convective mass transfer"
                    : "Strong convective mass transfer (Sh > 100)"}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.sherwoodNumber} />
              <CommonMistakes mistakes={commonMistakes.sherwoodNumber} />
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
              <div>Sh = k<sub>c</sub> × L / D<sub>AB</sub>&nbsp;&nbsp;&nbsp;&nbsp;[dimensionless]</div>
              <div>k<sub>c</sub> = Sh × D<sub>AB</sub> / L&nbsp;&nbsp;&nbsp;&nbsp;[m/s]</div>
              <div>D<sub>AB</sub> = k<sub>c</sub> × L / Sh&nbsp;&nbsp;&nbsp;&nbsp;[m²/s]</div>
            </div>
            <p className="mt-2">
              Sh = 1 means convection provides no enhancement over pure molecular diffusion.
              Higher Sh means the convective mass transfer coefficient is that many times larger
              than the pure-diffusion reference D<sub>AB</sub>/L.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Heat–mass transfer analogy (Nu → Sh, Pr → Sc):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Nu = h × L / k<sub>f</sub>&nbsp;&nbsp;&nbsp;&nbsp;↔&nbsp;&nbsp;&nbsp;&nbsp;Sh = k<sub>c</sub> × L / D<sub>AB</sub></div>
              <div>h  = Nu × k<sub>f</sub> / L&nbsp;&nbsp;&nbsp;&nbsp;↔&nbsp;&nbsp;&nbsp;&nbsp;k<sub>c</sub> = Sh × D<sub>AB</sub> / L</div>
              <div>Pr = ν / α&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↔&nbsp;&nbsp;&nbsp;&nbsp;Sc = ν / D<sub>AB</sub></div>
            </div>
            <p className="mt-1">
              Replace Pr with Sc and h with k<sub>c</sub> in any forced-convection Nu correlation to get the
              corresponding Sh correlation.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Common Sh correlations:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Geometry / regime</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Correlation</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Validity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { geo: "Laminar pipe, const-c",         corr: "Sh = 3.66",                             valid: "Fully developed, Re < 2300" },
                  { geo: "Laminar pipe, const-flux",      corr: "Sh = 4.36",                             valid: "Fully developed, Re < 2300" },
                  { geo: "Turbulent pipe",                corr: "Sh = 0.023 Re⁰·⁸ Sc⅓",               valid: "Re > 10 000, 0.6 < Sc < 3000" },
                  { geo: "Flat plate, laminar avg",       corr: "Sh = 0.664 Re^½ Sc^⅓",                valid: "Re < 5×10⁵, Sc > 0.6" },
                  { geo: "Sphere (Ranz-Marshall)",        corr: "Sh = 2 + 0.6 Re^½ Sc^⅓",              valid: "2 < Re < 200, 0.6 < Sc < 250" },
                  { geo: "Pure diffusion (stagnant)",     corr: "Sh = 2",                                valid: "Re → 0 (sphere), or stagnant film" },
                ].map(({ geo, corr, valid }) => (
                  <tr key={geo}>
                    <td className="py-1.5 pr-4">{geo}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{corr}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{valid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Sh vs Nu vs Bi:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Sh = k<sub>c</sub> L / D<sub>AB</sub>&nbsp;&nbsp;&nbsp;&nbsp;convective mass transfer — uses fluid diffusivity</div>
              <div>Nu = h L / k<sub>f</sub>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;convective heat transfer — uses fluid conductivity</div>
              <div>Bi = h L / k<sub>s</sub>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;solid resistance — uses solid conductivity</div>
            </div>
          </div>
        </div>
      </Card>
      <References refs={REFS_MASS_TRANSFER_NUMBERS} />
    </div>
  );
}