"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_STROUHAL_NUMBER } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateStrouhalNumber,
  generateStrouhalNumberSteps,
  commonAssumptions,
  commonMistakes,
  type StrouhalMode,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit = "m" | "mm" | "cm" | "inch" | "ft";
type VelUnit = "m/s" | "ft/s" | "km/h";
type FreqUnit= "Hz" | "rpm";

const toLm:  Record<LenUnit, number> = { m: 1, mm: 1e-3, cm: 1e-2, inch: 0.0254, ft: 0.3048 };
const toMS:  Record<VelUnit, number> = { "m/s": 1, "ft/s": 0.3048, "km/h": 1/3.6 };
const toHz:  Record<FreqUnit,number> = { Hz: 1, rpm: 1/60 };

// Typical St for common bluff bodies
const ST_PRESETS = [
  { label: "Circular cylinder (Re 300 – 2×10⁵)",  St: "0.20"  },
  { label: "Square cylinder",                       St: "0.14"  },
  { label: "D-section cylinder",                    St: "0.19"  },
  { label: "Flat plate (normal to flow)",           St: "0.13"  },
  { label: "Equilateral triangle (apex upstream)",  St: "0.17"  },
  { label: "Two-dimensional airfoil at stall",      St: "0.12"  },
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

export default function StrouhalNumberCalculator() {
  const [mode,       setMode]       = useState<StrouhalMode>("findF");
  const [length,     setLength]     = useState("50");
  const [lenUnit,    setLenUnit]    = useState<LenUnit>("mm");
  const [velocity,   setVelocity]   = useState("10");
  const [velUnit,    setVelUnit]    = useState<VelUnit>("m/s");
  const [frequency,  setFrequency]  = useState("40");
  const [freqUnit,   setFreqUnit]   = useState<FreqUnit>("Hz");
  const [St,         setSt]         = useState("0.20");
  const [selectedSt, setSelectedSt] = useState("Circular cylinder (Re 300 – 2×10⁵)");

  // Resonance check
  const [showResonance, setShowResonance] = useState(false);
  const [natFreq,       setNatFreq]       = useState("40");
  const [natFreqUnit,   setNatFreqUnit]   = useState<FreqUnit>("Hz");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateStrouhalNumber> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateStrouhalNumberSteps> | null>(null);

  const handleClear = () => {
    setMode("findF");
    setLength("");
    setLenUnit("mm");
    setVelocity("");
    setVelUnit("m/s");
    setFrequency("");
    setFreqUnit("Hz");
    setSt("");
    setSelectedSt("");
    setNatFreq("");
    setNatFreqUnit("Hz");
    setShowResonance(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const lRaw  = parseFloat(length);
    const vRaw  = parseFloat(velocity);
    const fRaw  = parseFloat(frequency);
    const stVal = parseFloat(St);
    const fnRaw = parseFloat(natFreq);

    if (isNaN(lRaw) || lRaw <= 0) newErrors.length = "Must be a positive number";

    if (mode === "findSt") {
      if (isNaN(fRaw) || fRaw <= 0) newErrors.frequency = "Must be a positive number";
      if (isNaN(vRaw) || vRaw <= 0) newErrors.velocity  = "Must be a positive number";
    } else if (mode === "findF") {
      if (isNaN(stVal)|| stVal<= 0) newErrors.St        = "Must be a positive number";
      if (isNaN(vRaw) || vRaw <= 0) newErrors.velocity  = "Must be a positive number";
    } else {
      if (isNaN(stVal)|| stVal<= 0) newErrors.St        = "Must be a positive number";
      if (isNaN(fRaw) || fRaw <= 0) newErrors.frequency = "Must be a positive number";
    }

    if (showResonance && (isNaN(fnRaw) || fnRaw <= 0)) newErrors.natFreq = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const lSI  = lRaw  * toLm[lenUnit];
    const vSI  = vRaw  * toMS[velUnit];
    const fSI  = fRaw  * toHz[freqUnit];
    const fnSI = (showResonance && !isNaN(fnRaw)) ? fnRaw * toHz[natFreqUnit] : undefined;

    try {
      const input = {
        mode, length: lSI,
        frequency:     (mode !== "findF")  ? fSI   : undefined,
        velocity:      (mode !== "findV")  ? vSI   : undefined,
        strouhalNumber:(mode !== "findSt") ? stVal : undefined,
        naturalFrequency: fnSI,
      };
      const calc = calculateStrouhalNumber(input as Parameters<typeof calculateStrouhalNumber>[0]);
      const stp  = generateStrouhalNumberSteps(input as Parameters<typeof calculateStrouhalNumber>[0], calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const resonanceBg = result?.isResonanceRisk
    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
    : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Strouhal Number Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          St = fL/V — dimensionless vortex-shedding frequency. Predict shedding frequency,
          critical wind speed, or diagnose vortex-induced vibration (VIV) resonance risk.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
          Dimensional Analysis · Specialized
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Mode selector */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Solve for:</p>
          <div className="flex gap-2">
            <ModeBtn label="Find St"              active={mode === "findSt"} onClick={() => setMode("findSt")} />
            <ModeBtn label="Find shedding freq f" active={mode === "findF"}  onClick={() => setMode("findF")}  />
            <ModeBtn label="Find velocity V"      active={mode === "findV"}  onClick={() => setMode("findV")}  />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Length — always shown */}
          <div>
            <InputField label="Characteristic length (diameter)" symbol="L" unit={lenUnit}
              value={length} onChange={setLength}
              placeholder={lenUnit === "m" ? "0.05" : lenUnit === "mm" ? "50" : lenUnit === "cm" ? "5" : lenUnit === "ft" ? "0.164" : "1.97"}
              error={errors.length} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m", "mm", "cm", "inch", "ft"] as LenUnit[]).map(u => (
                <Btn key={u} label={u} active={lenUnit === u} onClick={() => {
                  const si = parseFloat(length) * toLm[lenUnit];
                  setLenUnit(u);
                  if (!isNaN(si)) setLength(fmt(si / toLm[u]));
                }} />
              ))}
            </div>
          </div>

          {/* Velocity — shown for findSt and findF */}
          {mode !== "findV" && (
            <div>
              <InputField label="Free-stream velocity" symbol="V" unit={velUnit}
                value={velocity} onChange={setVelocity}
                placeholder={velUnit === "m/s" ? "10" : velUnit === "ft/s" ? "32.8" : "36"}
                error={errors.velocity} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m/s", "ft/s", "km/h"] as VelUnit[]).map(u => (
                  <Btn key={u} label={u} active={velUnit === u} onClick={() => {
                    const si = parseFloat(velocity) * toMS[velUnit];
                    setVelUnit(u);
                    if (!isNaN(si)) setVelocity(fmt(si / toMS[u]));
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Frequency — shown for findSt and findV */}
          {mode !== "findF" && (
            <div>
              <InputField label="Shedding frequency" symbol="f" unit={freqUnit}
                value={frequency} onChange={setFrequency}
                placeholder={freqUnit === "Hz" ? "40" : "2400"}
                error={errors.frequency} />
              <div className="flex gap-2 -mt-2">
                {(["Hz", "rpm"] as FreqUnit[]).map(u => (
                  <Btn key={u} label={u} active={freqUnit === u} onClick={() => {
                    const si = parseFloat(frequency) * toHz[freqUnit];
                    setFreqUnit(u);
                    if (!isNaN(si)) setFrequency(fmt(si / toHz[u]));
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* St — shown for findF and findV */}
          {mode !== "findSt" && (
            <div>
              <InputField label="Strouhal number" symbol="St" unit="dimensionless"
                value={St} onChange={setSt} error={errors.St} />
              <div className="flex items-center gap-2 -mt-2">
                <select
                  value={selectedSt}
                  onChange={(e) => {
                    const lbl = e.target.value;
                    setSelectedSt(lbl);
                    const p = ST_PRESETS.find(x => x.label === lbl);
                    if (p) setSt(p.St);
                  }}
                  className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Geometry preset…</option>
                  {ST_PRESETS.map(p => (
                    <option key={p.label} value={p.label}>{p.label} — St = {p.St}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Resonance check section */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="showResonance" checked={showResonance}
              onChange={(e) => setShowResonance(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="showResonance" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Check for VIV resonance — enter structural natural frequency f<sub>n</sub>
            </label>
          </div>
          {showResonance && (
            <div className="max-w-xs">
              <InputField label="Structural natural frequency" symbol="fn" unit={natFreqUnit}
                value={natFreq} onChange={setNatFreq}
                placeholder={natFreqUnit === "Hz" ? "40" : "2400"}
                error={errors.natFreq} />
              <div className="flex gap-2 -mt-2">
                {(["Hz", "rpm"] as FreqUnit[]).map(u => (
                  <Btn key={u} label={u} active={natFreqUnit === u} onClick={() => {
                    const si = parseFloat(natFreq) * toHz[natFreqUnit];
                    setNatFreqUnit(u);
                    if (!isNaN(si)) setNatFreq(fmt(si / toHz[u]));
                  }} />
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Resonance risk when f<sub>shedding</sub> ≈ f<sub>n</sub> (within ±20%).
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
                {mode === "findSt" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Strouhal number  St = fL / V
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      St = {fmt(result.strouhalNumber, 5)}
                    </p>
                  </>
                )}
                {mode === "findF" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Shedding frequency  f = St × V / L
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {fmt(result.frequency, 5)} Hz
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      T = {fmt(result.sheddingPeriod, 4)} s
                    </p>
                  </>
                )}
                {mode === "findV" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Critical velocity  V = f × L / St
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {fmt(result.velocity, 5)} m/s
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      {fmt(result.velocity * 3.6, 4)} km/h
                    </p>
                  </>
                )}
              </div>

              {/* Related quantities */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Shedding quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "St",                value: fmt(result.strouhalNumber, 5)     },
                    { label: "f (Hz)",            value: fmt(result.frequency, 5)           },
                    { label: "T = 1/f (s)",       value: fmt(result.sheddingPeriod, 4)      },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resonance check (if fn provided) */}
              {result.criticalVelocity !== undefined && result.resonanceRatio !== undefined && (
                <div className={`p-4 rounded-lg border ${resonanceBg}`}>
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">
                    {result.isResonanceRisk
                      ? "⚠ VIV Resonance Risk — f/fn = " + fmt(result.resonanceRatio, 3)
                      : "No Resonance Risk — f/fn = " + fmt(result.resonanceRatio, 3)}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Critical velocity for resonance: V<sub>crit</sub> = {fmt(result.criticalVelocity, 4)} m/s ({fmt(result.criticalVelocity * 3.6, 4)} km/h).
                    {result.isResonanceRisk
                      ? " Shedding frequency is within ±20% of natural frequency — vortex-induced vibration is likely!"
                      : " Operating conditions are safe from VIV."}
                  </p>
                </div>
              )}

              {/* Interpretation */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.strouhalNumber} />
              <CommonMistakes mistakes={commonMistakes.strouhalNumber} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Strouhal number and vortex shedding:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>St = f × L / V&nbsp;&nbsp;&nbsp;&nbsp;[dimensionless]</div>
              <div>f = St × V / L&nbsp;&nbsp;&nbsp;&nbsp;[Hz]  — predict shedding frequency</div>
              <div>V<sub>crit</sub> = f<sub>n</sub> × L / St&nbsp;&nbsp;&nbsp;&nbsp;[m/s]  — critical resonance velocity</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Typical St values for bluff bodies:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Body</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">St</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Valid Re range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ...ST_PRESETS.map(({ label, St }) => ({ label, St, re: "see notes" })),
                ].map(({ label, St }) => (
                  <tr key={label}>
                    <td className="py-1.5 pr-4">{label}</td>
                    <td className="py-1.5 pr-4 font-mono">{St}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">Re 300 – 2×10⁵</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              St ≈ 0.2 for a circular cylinder is approximately constant over a wide Re range,
              but varies at very low Re (creeping flow) and above Re ≈ 5×10⁵ (turbulent boundary layer).
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Vortex-induced vibration (VIV) and lock-in:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Resonance when: f<sub>shedding</sub> ≈ f<sub>n</sub> (structural natural frequency)</div>
              <div>Lock-in range: 0.8 ≤ f/f<sub>n</sub> ≤ 1.2</div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              In the lock-in range, shedding frequency couples with structural vibration and can
              cause large-amplitude oscillations. Classic examples: Tacoma Narrows bridge, power-line
              galloping, offshore riser vibration.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>St = Strouhal number (dimensionless)</li>
              <li>f = vortex shedding frequency [Hz]</li>
              <li>L = characteristic length (body diameter or width) [m]</li>
              <li>V = free-stream velocity [m/s]</li>
              <li>f<sub>n</sub> = structural natural frequency [Hz]</li>
              <li>V<sub>crit</sub> = critical velocity at which shedding matches f<sub>n</sub> [m/s]</li>
            </ul>
          </div>
        </div>
      </Card>

      <References refs={REFS_STROUHAL_NUMBER} />
    </div>
  );
}
