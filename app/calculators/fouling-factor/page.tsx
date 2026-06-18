"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_FOULING_FACTOR } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateFoulingFactor,
  generateFoulingFactorSteps,
  commonAssumptions,
  commonMistakes,
  type FoulingMode,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

// TEMA fouling resistance presets  m²·K/W
const TEMA_PRESETS = [
  { label: "Steam (clean / non-oil-bearing)",        Rf: "0.0001"  },
  { label: "Seawater below 52 °C",                   Rf: "0.0001"  },
  { label: "Seawater above 52 °C",                   Rf: "0.0002"  },
  { label: "Treated cooling-tower water",            Rf: "0.0002"  },
  { label: "City or well water",                     Rf: "0.0002"  },
  { label: "Boiler feed water (treated)",            Rf: "0.0001"  },
  { label: "River water (minimum)",                  Rf: "0.0003"  },
  { label: "Hard water above 52 °C",                 Rf: "0.0006"  },
  { label: "Light organic liquids",                  Rf: "0.0002"  },
  { label: "Crude oil (mild service)",               Rf: "0.0003"  },
  { label: "Crude oil (heavy / above 120 °C)",       Rf: "0.0005"  },
  { label: "Fuel oil / residuals",                   Rf: "0.0009"  },
  { label: "Refrigerating liquids",                  Rf: "0.0002"  },
  { label: "Air and industrial gases",               Rf: "0.0002"  },
] as const;

function fmt(n: number, sig = 4) { return parseFloat(n.toPrecision(sig)).toString(); }

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

export default function FoulingFactorCalculator() {
  const [mode,      setMode]      = useState<FoulingMode>("findRf");
  const [Uc,        setUc]        = useState("5000");
  const [Uf,        setUf]        = useState("3500");
  const [Rf,        setRf]        = useState("0.0001");
  const [selTema,   setSelTema]   = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateFoulingFactor> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateFoulingFactorSteps> | null>(null);

  const handleClear = () => {
    setMode("findRf");
    setUc("");
    setUf("");
    setRf("");
    setSelTema("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const UcVal = parseFloat(Uc);
    const UfVal = parseFloat(Uf);
    const RfVal = parseFloat(Rf);

    if (mode === "findRf") {
      if (isNaN(UcVal) || UcVal <= 0) newErrors.Uc = "Must be a positive number";
      if (isNaN(UfVal) || UfVal <= 0) newErrors.Uf = "Must be a positive number";
      if (!isNaN(UcVal) && !isNaN(UfVal) && UfVal >= UcVal)
        newErrors.Uf = "U_fouled must be less than U_clean";
    } else if (mode === "findUfouled") {
      if (isNaN(UcVal) || UcVal <= 0) newErrors.Uc = "Must be a positive number";
      if (isNaN(RfVal) || RfVal < 0)  newErrors.Rf = "Must be ≥ 0";
    } else {
      if (isNaN(UfVal) || UfVal <= 0) newErrors.Uf = "Must be a positive number";
      if (isNaN(RfVal) || RfVal < 0)  newErrors.Rf = "Must be ≥ 0";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        mode,
        cleanHtc:     (mode !== "findUclean") ? UcVal : undefined,
        fouledHtc:    (mode !== "findUfouled") ? UfVal : undefined,
        foulingFactor: (mode !== "findRf") ? RfVal : undefined,
      };
      const calc = calculateFoulingFactor(input as Parameters<typeof calculateFoulingFactor>[0]);
      const stp  = generateFoulingFactorSteps(input as Parameters<typeof calculateFoulingFactor>[0], calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const penalty = result?.uPenalty ?? 0;
  const penaltyBg =
    penalty < 10
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      : penalty < 25
      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
      : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";

  // TEMA comparison for findRf mode
  const rfVal = result?.foulingFactor;
  const temaCompare = rfVal !== undefined && selTema
    ? TEMA_PRESETS.find(p => p.label === selTema)
    : undefined;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Fouling Factor Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          R<sub>f</sub> = 1/U<sub>fouled</sub> − 1/U<sub>clean</sub> — thermal resistance added by
          fouling deposits. Calculates fouling factor from measured U values, or predicts fouled U
          from a known R<sub>f</sub> and clean U.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">
          Heat Transfer · HX Design · Fouling
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Mode selector */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Solve for:</p>
          <div className="flex gap-2">
            <ModeBtn
              label={<>Find R<sub>f</sub> &nbsp;— &nbsp;from U<sub>clean</sub> and U<sub>fouled</sub></>}
              active={mode === "findRf"} onClick={() => setMode("findRf")} />
            <ModeBtn
              label={<>Find U<sub>fouled</sub> &nbsp;— &nbsp;from U<sub>clean</sub> and R<sub>f</sub></>}
              active={mode === "findUfouled"} onClick={() => setMode("findUfouled")} />
            <ModeBtn
              label={<>Find U<sub>clean</sub> &nbsp;— &nbsp;from U<sub>fouled</sub> and R<sub>f</sub></>}
              active={mode === "findUclean"} onClick={() => setMode("findUclean")} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* U_clean — shown for findRf and findUfouled */}
          {mode !== "findUclean" && (
            <div>
              <InputField
                label="Clean overall heat transfer coefficient"
                symbol="Uclean"
                unit="W/(m²·K)"
                value={Uc} onChange={setUc}
                error={errors.Uc} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                U<sub>clean</sub> — measured before fouling develops
              </p>
            </div>
          )}

          {/* U_fouled — shown for findRf and findUclean */}
          {mode !== "findUfouled" && (
            <div>
              <InputField
                label="Fouled overall heat transfer coefficient"
                symbol="Ufouled"
                unit="W/(m²·K)"
                value={Uf} onChange={setUf}
                error={errors.Uf} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                U<sub>fouled</sub> — measured after deposit formation
              </p>
            </div>
          )}

          {/* R_f — shown for findUfouled and findUclean */}
          {mode !== "findRf" && (
            <div>
              <InputField
                label="Fouling resistance factor"
                symbol="Rf"
                unit="m²·K/W"
                value={Rf} onChange={setRf}
                error={errors.Rf} />
              <div className="flex items-center gap-2 -mt-2">
                <select
                  value={selTema}
                  onChange={(e) => {
                    const lbl = e.target.value;
                    setSelTema(lbl);
                    const p = TEMA_PRESETS.find(x => x.label === lbl);
                    if (p) setRf(p.Rf);
                  }}
                  className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">TEMA standard preset…</option>
                  {TEMA_PRESETS.map(p => (
                    <option key={p.label} value={p.label}>{p.label} — {p.Rf} m²·K/W</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* TEMA reference comparison — findRf mode only */}
        {mode === "findRf" && (
          <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Compare measured R<sub>f</sub> against TEMA standard (optional):
            </p>
            <select
              value={selTema}
              onChange={(e) => setSelTema(e.target.value)}
              className="w-full max-w-lg px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select TEMA service for comparison…</option>
              {TEMA_PRESETS.map(p => (
                <option key={p.label} value={p.label}>{p.label} — {p.Rf} m²·K/W</option>
              ))}
            </select>
          </div>
        )}

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
                {mode === "findRf" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Fouling resistance  R<sub>f</sub> = 1/U<sub>fouled</sub> − 1/U<sub>clean</sub>
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      R<sub>f</sub> = {fmt(result.foulingFactor, 4)} m²·K/W
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      Fouling coefficient h<sub>f</sub> = 1/R<sub>f</sub> = {fmt(1 / result.foulingFactor, 4)} W/(m²·K)
                    </p>
                  </>
                )}
                {mode === "findUfouled" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Fouled heat transfer coefficient  U<sub>fouled</sub> = 1/(1/U<sub>clean</sub> + R<sub>f</sub>)
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      U<sub>fouled</sub> = {fmt(result.fouledHtc, 5)} W/(m²·K)
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      R<sub>f</sub> = {fmt(result.foulingFactor, 4)} m²·K/W
                    </p>
                  </>
                )}
                {mode === "findUclean" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Clean heat transfer coefficient  U<sub>clean</sub> = 1/(1/U<sub>fouled</sub> − R<sub>f</sub>)
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      U<sub>clean</sub> = {fmt(result.cleanHtc, 5)} W/(m²·K)
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      R<sub>f</sub> = {fmt(result.foulingFactor, 4)} m²·K/W
                    </p>
                  </>
                )}
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Resistance breakdown
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: <span>U<sub>clean</sub> [W/(m²·K)]</span>,  value: fmt(result.cleanHtc,        5) },
                    { label: <span>U<sub>fouled</sub> [W/(m²·K)]</span>, value: fmt(result.fouledHtc,       5) },
                    { label: <span>R<sub>f</sub> [m²·K/W]</span>,         value: fmt(result.foulingFactor,   4) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: <span>1/U<sub>clean</sub> [m²·K/W]</span>,  value: fmt(result.cleanResistance,  5) },
                    { label: <span>1/U<sub>fouled</sub> [m²·K/W]</span>, value: fmt(result.fouledResistance, 5) },
                    { label: "U penalty [%]",                              value: fmt(result.uPenalty,         4) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* TEMA comparison (findRf mode with preset selected) */}
              {temaCompare && result && (
                (() => {
                  const temaRf = parseFloat(temaCompare.Rf);
                  const ratio  = result.foulingFactor / temaRf;
                  const compBg = ratio <= 1
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    : ratio <= 2
                    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
                  return (
                    <div className={`p-4 rounded-lg border ${compBg}`}>
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">
                        TEMA comparison: {temaCompare.label}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Measured R<sub>f</sub> = {fmt(result.foulingFactor, 4)} m²·K/W &nbsp;vs&nbsp;
                        TEMA standard = {temaCompare.Rf} m²·K/W.
                        {" "}
                        {ratio <= 1
                          ? `Measured fouling is ${(ratio * 100).toFixed(0)}% of TEMA standard — within acceptable limits.`
                          : `Measured fouling is ${ratio.toFixed(2)}× the TEMA standard — cleaning is recommended.`}
                      </p>
                    </div>
                  );
                })()
              )}

              {/* U penalty banner */}
              <div className={`p-4 rounded-lg border ${penaltyBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {penalty < 10
                    ? `Fouling penalty: ${fmt(penalty, 3)}% — minor impact`
                    : penalty < 25
                    ? `Fouling penalty: ${fmt(penalty, 3)}% — moderate impact, schedule cleaning`
                    : `Fouling penalty: ${fmt(penalty, 3)}% — severe impact, cleaning required`}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.foulingFactor} />
              <CommonMistakes mistakes={commonMistakes.foulingFactor} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Fouling resistance definition:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>R<sub>f</sub> = 1/U<sub>fouled</sub> − 1/U<sub>clean</sub>&nbsp;&nbsp;&nbsp;&nbsp;[m²·K/W]</div>
              <div>U<sub>fouled</sub> = 1 / (1/U<sub>clean</sub> + R<sub>f</sub>)&nbsp;&nbsp;&nbsp;&nbsp;[W/(m²·K)]</div>
              <div>h<sub>f</sub> = 1/R<sub>f</sub>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[W/(m²·K)]  fouling coefficient</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Where fouling fits in the overall U formula:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>1/U = 1/h<sub>i</sub> + R<sub>f,i</sub> + t/k + R<sub>f,o</sub> + 1/h<sub>o</sub></div>
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                R<sub>f,i</sub>, R<sub>f,o</sub> = inner and outer fouling resistances (independent)
              </div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">TEMA standard fouling factors (m²·K/W):</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Service</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">R<sub>f</sub> [m²·K/W]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { s: "Steam / treated cooling water",      r: "0.0001"  },
                  { s: "Seawater (below 52 °C)",             r: "0.0001"  },
                  { s: "City / treated water",               r: "0.0002"  },
                  { s: "River water",                        r: "0.0003"  },
                  { s: "Hard water",                         r: "0.0006"  },
                  { s: "Crude oil (mild)",                   r: "0.0003 – 0.0005" },
                  { s: "Fuel oil / residuals",               r: "0.0009"  },
                ].map(({ s, r }) => (
                  <tr key={s}>
                    <td className="py-1.5 pr-4">{s}</td>
                    <td className="py-1.5 font-mono">{r}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              TEMA factors are conservative design margins for clean fluid at normal operating temperatures.
              Actual fouling at a given service time may differ significantly.
            </p>
          </div>
        </div>
      </Card>
      <References refs={REFS_FOULING_FACTOR} />
    </div>
  );
}