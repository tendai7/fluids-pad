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
  calculateDittusBoelter,
  generateDittusBoelterSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit = "m" | "mm" | "cm" | "inch";
const toLm: Record<LenUnit, number> = { m: 1, mm: 1e-3, cm: 1e-2, inch: 0.0254 };

// Fluid presets: [label, Re, Pr, k W/(m·K)]
const FLUID_PRESETS = [
  { label: "Water at 20 °C  (turbulent pipe, Re=50k)",    Re: "50000",  Pr: "7.0",   k: "0.598"  },
  { label: "Water at 60 °C  (Re=30k)",                    Re: "30000",  Pr: "3.0",   k: "0.651"  },
  { label: "Air at 20 °C    (Re=50k)",                    Re: "50000",  Pr: "0.71",  k: "0.0257" },
  { label: "Air at 100 °C   (Re=50k)",                    Re: "50000",  Pr: "0.70",  k: "0.0314" },
  { label: "Engine oil at 20 °C  (Re=12k)",               Re: "12000",  Pr: "10400", k: "0.145"  },
  { label: "Ethylene glycol at 40 °C  (Re=15k)",          Re: "15000",  Pr: "51",    k: "0.263"  },
] as const;

// k presets
const K_PRESETS = [
  { label: "Air at 20 °C",    k: "0.0257" },
  { label: "Air at 100 °C",   k: "0.0314" },
  { label: "Water at 20 °C",  k: "0.598"  },
  { label: "Water at 60 °C",  k: "0.651"  },
  { label: "Engine oil 20 °C",k: "0.145"  },
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

function ModeBtn({ label, active, onClick }: { label: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${active
        ? "bg-blue-600 text-white"
        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
      {label}
    </button>
  );
}

export default function DittusBoelterCalculator() {
  const [mode,    setMode]    = useState<"heating" | "cooling">("heating");
  const [Re,      setRe]      = useState("50000");
  const [Pr,      setPr]      = useState("7.0");
  const [showH,   setShowH]   = useState(false);
  const [D,       setD]       = useState("25");
  const [Dunit,   setDunit]   = useState<LenUnit>("mm");
  const [k,       setK]       = useState("0.598");
  const [selFluid,setSelFluid]= useState("Water at 20 °C  (turbulent pipe, Re=50k)");
  const [selK,    setSelK]    = useState("Water at 20 °C");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateDittusBoelter> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateDittusBoelterSteps> | null>(null);

  const applyPreset = (label: string) => {
    setSelFluid(label);
    const p = FLUID_PRESETS.find(x => x.label === label);
    if (!p) return;
    setRe(p.Re);
    setPr(p.Pr);
    setK(p.k);
  };

  const handleClear = () => {
    setMode("heating");
    setRe("");
    setPr("");
    setD("");
    setDunit("mm");
    setK("");
    setSelFluid("");
    setSelK("");
    setShowH(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const ReVal = parseFloat(Re);
    const PrVal = parseFloat(Pr);
    const DSI   = parseFloat(D) * toLm[Dunit];
    const kVal  = parseFloat(k);

    if (isNaN(ReVal) || ReVal <= 0) newErrors.Re = "Must be a positive number";
    if (isNaN(PrVal) || PrVal <= 0) newErrors.Pr = "Must be a positive number";
    if (showH) {
      if (isNaN(DSI) || DSI <= 0) newErrors.D = "Must be a positive number";
      if (isNaN(kVal) || kVal <= 0) newErrors.k = "Must be a positive number";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        reynoldsNumber: ReVal,
        prandtlNumber: PrVal,
        mode,
        diameter:             showH ? DSI  : undefined,
        thermalConductivity:  showH ? kVal : undefined,
      };
      const calc = calculateDittusBoelter(input);
      const stp  = generateDittusBoelterSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const validBg = result?.validRange
    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
    : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Dittus-Boelter Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Nu = 0.023 Re⁰·⁸ Prⁿ — standard correlation for turbulent forced convection in smooth pipes.
          Results are shown alongside the more accurate Gnielinski correlation for comparison.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">
          Heat Transfer · Pipe Convection
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Heating / Cooling toggle */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Heat transfer direction (sets Pr exponent n):
          </p>
          <div className="flex gap-2 max-w-sm">
            <ModeBtn
              label={<>Heating &nbsp; n = 0.4 &nbsp; (T<sub>wall</sub> &gt; T<sub>fluid</sub>)</>}
              active={mode === "heating"} onClick={() => setMode("heating")} />
            <ModeBtn
              label={<>Cooling &nbsp; n = 0.3 &nbsp; (T<sub>wall</sub> &lt; T<sub>fluid</sub>)</>}
              active={mode === "cooling"} onClick={() => setMode("cooling")} />
          </div>
        </div>

        {/* Fluid presets */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Fluid preset (fills Re, Pr, k):
          </p>
          <select
            value={selFluid}
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

          {/* Re */}
          <div>
            <InputField label="Reynolds number" symbol="Re" unit="dimensionless"
              value={Re} onChange={setRe} error={errors.Re} />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
              Valid range: Re &gt; 10 000  (turbulent, fully developed)
            </p>
          </div>

          {/* Pr */}
          <div>
            <InputField label="Prandtl number" symbol="Pr" unit="dimensionless"
              value={Pr} onChange={setPr} error={errors.Pr} />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
              Valid range: 0.6 ≤ Pr ≤ 160  ·  Air ≈ 0.71  ·  Water ≈ 7
            </p>
          </div>
        </div>

        {/* Optional h computation */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="showH" checked={showH}
              onChange={(e) => setShowH(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="showH" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Also compute h = Nu × k / D — enter pipe diameter and fluid thermal conductivity
            </label>
          </div>
          {showH && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <InputField label="Pipe inner diameter" symbol="D" unit={Dunit}
                  value={D} onChange={setD}
                  placeholder={Dunit === "mm" ? "25" : Dunit === "m" ? "0.025" : Dunit === "cm" ? "2.5" : "0.984"}
                  error={errors.D} />
                <div className="flex flex-wrap gap-2 -mt-2">
                  {(["m", "mm", "cm", "inch"] as LenUnit[]).map(u => (
                    <Btn key={u} label={u} active={Dunit === u} onClick={() => {
                      const raw = parseFloat(D);
                      if (!isNaN(raw)) {
                        const converted = raw * toLm[Dunit] / toLm[u];
                        setD(parseFloat(converted.toPrecision(6)).toString());
                      }
                      setDunit(u);
                    }} />
                  ))}
                </div>
              </div>
              <div>
                <InputField label="Fluid thermal conductivity" symbol="k" unit="W/(m·K)"
                  value={k} onChange={setK} error={errors.k} />
                <div className="flex items-center gap-2 -mt-2">
                  <select
                    value={selK}
                    onChange={(e) => {
                      setSelK(e.target.value);
                      const p = K_PRESETS.find(x => x.label === e.target.value);
                      if (p) setK(p.k);
                    }}
                    className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">k preset…</option>
                    {K_PRESETS.map(p => (
                      <option key={p.label} value={p.label}>{p.label} — {p.k} W/(m·K)</option>
                    ))}
                  </select>
                </div>
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
        const n = mode === "heating" ? 0.4 : 0.3;
        const diff = Math.abs(((result.nusseltNumber - result.gnielinskiNu) / result.gnielinskiNu) * 100);
        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Nusselt number  Nu = 0.023 Re⁰·⁸ Pr{n === 0.4 ? "⁰·⁴" : "⁰·³"}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  Nu = {fmt(result.nusseltNumber, 5)}
                </p>
                {result.heatTransferCoeff !== undefined && (
                  <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                    h = {fmt(result.heatTransferCoeff, 5)} W/(m²·K)
                  </p>
                )}
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Dittus-Boelter vs Gnielinski
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "Nu  (Dittus-Boelter)",   value: fmt(result.nusseltNumber,  5) },
                    { label: "Nu  (Gnielinski)",        value: fmt(result.gnielinskiNu,   5) },
                    { label: "Difference",              value: `${diff.toFixed(1)}%`          },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                {result.heatTransferCoeff !== undefined && (
                  <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">h  DB  [W/(m²·K)]</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {fmt(result.heatTransferCoeff, 5)}
                      </p>
                    </div>
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">h  Gnielinski  [W/(m²·K)]</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {result.gnielinskiH !== undefined ? fmt(result.gnielinskiH, 5) : "—"}
                      </p>
                    </div>
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">n exponent</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{n}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Validity banner */}
              <div className={`p-4 rounded-lg border ${validBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {result.validRange
                    ? "Within valid range — Re > 10 000 and 0.6 ≤ Pr ≤ 160"
                    : "Outside valid range — results may be unreliable"}
                </p>
                {result.warnings.length > 0 ? (
                  <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside space-y-0.5">
                    {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
                )}
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.dittusBoelter} />
              <CommonMistakes mistakes={commonMistakes.dittusBoelter} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Dittus-Boelter correlation:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Nu = 0.023 × Re⁰·⁸ × Prⁿ</div>
              <div>n = 0.4  (heating: T<sub>wall</sub> &gt; T<sub>fluid</sub>)</div>
              <div>n = 0.3  (cooling: T<sub>wall</sub> &lt; T<sub>fluid</sub>)</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                Valid: Re &gt; 10 000,  0.6 ≤ Pr ≤ 160,  L/D &gt; 10,  smooth pipe
              </div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Gnielinski correlation (more accurate):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Nu = (f/8)(Re − 1000)Pr / [1 + 12.7(f/8)^½ (Pr^(2/3) − 1)]</div>
              <div>f = (0.790 ln Re − 1.64)^(−2)&nbsp;&nbsp;&nbsp;[Petukhov friction factor]</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                Valid: 3 000 &lt; Re &lt; 5×10⁶,  0.5 &lt; Pr &lt; 2 000
              </div>
            </div>
            <p className="mt-1">
              Gnielinski is preferred for design work — it covers the transitional regime and gives
              ±10% accuracy vs ±25% for Dittus-Boelter, particularly at moderate Re.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Correlation comparison:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Correlation</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Re range</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Pr range</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { corr: "Dittus-Boelter",  re: "> 10 000",          pr: "0.6 – 160",    acc: "±25%" },
                  { corr: "Gnielinski",       re: "3 000 – 5×10⁶",    pr: "0.5 – 2 000",  acc: "±10%" },
                  { corr: "Sieder-Tate",      re: "> 10 000",          pr: "0.7 – 16 700", acc: "±20%  (high ΔT)" },
                  { corr: "Petukhov",         re: "10⁴ – 5×10⁶",      pr: "0.5 – 2 000",  acc: "±6%"  },
                ].map(({ corr, re, pr, acc }) => (
                  <tr key={corr}>
                    <td className="py-1.5 pr-4 font-medium">{corr}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{re}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{pr}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{acc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">From Nu to heat transfer coefficient h:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>h = Nu × k / D&nbsp;&nbsp;&nbsp;&nbsp;[W/(m²·K)]</div>
              <div>Q = h × A × (T<sub>wall</sub> − T<sub>bulk</sub>)&nbsp;&nbsp;&nbsp;&nbsp;[W]</div>
            </div>
          </div>
        </div>
      </Card>
      <References refs={REFS_HEAT_TRANSFER_NUMBERS} />
    </div>
  );
}