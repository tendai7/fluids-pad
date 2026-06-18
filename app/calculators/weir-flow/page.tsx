"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_WEIR_FLOW } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateWeirFlow,
  generateWeirFlowSteps,
  commonAssumptions,
  commonMistakes,
  type WeirType,
  type WeirMode,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit  = "m" | "mm" | "cm" | "ft";
type FlowUnit = "m³/s" | "L/s" | "ft³/s";

const toLm:  Record<LenUnit,  number> = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048 };
const toQSI: Record<FlowUnit, number> = { "m³/s": 1, "L/s": 1e-3, "ft³/s": 0.02832 };

// Cd presets per weir type
const CD_PRESETS: Record<WeirType, Array<{ label: string; cd: string }>> = {
  rectangular: [
    { label: "Sharp-crested (standard)",          cd: "0.62"  },
    { label: "Sharp-crested (Francis formula)",   cd: "0.611" },
    { label: "Sharp-crested (high precision)",    cd: "0.623" },
    { label: "Suppressed (no end contractions)",  cd: "0.65"  },
  ],
  vnotch: [
    { label: "Sharp V-notch (standard)",          cd: "0.61"  },
    { label: "Sharp V-notch (Kindsvater-Shen)",   cd: "0.607" },
    { label: "Slightly rounded edges",            cd: "0.59"  },
  ],
  broad_crested: [
    { label: "Theoretical (critical flow)",       cd: "0.848" },
    { label: "Smooth rounded entry",              cd: "0.90"  },
    { label: "Sharp-edged entry",                 cd: "0.80"  },
    { label: "Rough crest",                       cd: "0.75"  },
  ],
};

function fmt(n: number, sig = 4) { return parseFloat(n.toPrecision(sig)).toString(); }

function Btn({ label, active, onClick }: { label: React.ReactNode; active: boolean; onClick: () => void }) {
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
        ? "bg-teal-600 text-white"
        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
      {label}
    </button>
  );
}

const WEIR_DEFAULTS: Record<WeirType, { cd: string; label: string }> = {
  rectangular:   { cd: "0.62",  label: "Sharp-crested (standard)" },
  vnotch:        { cd: "0.61",  label: "Sharp V-notch (standard)" },
  broad_crested: { cd: "0.848", label: "Theoretical (critical flow)" },
};

export default function WeirFlowCalculator() {
  const [weirType, setWeirType]   = useState<WeirType>("rectangular");
  const [weirMode, setWeirMode]   = useState<WeirMode>("findQ");
  const [L,        setL]          = useState("2.0");
  const [H,        setH]          = useState("0.5");
  const [Q,        setQ]          = useState("1.0");
  const [cd,       setCd]         = useState("0.62");
  const [selCd,    setSelCd]      = useState("Sharp-crested (standard)");
  const [angle,    setAngle]      = useState("90");
  const [lenUnit,  setLenUnit]    = useState<LenUnit>("m");
  const [flowUnit, setFlowUnit]   = useState<FlowUnit>("m³/s");
  const [showVa,   setShowVa]     = useState(false);
  const [Va,       setVa]         = useState("0.3");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateWeirFlow> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateWeirFlowSteps> | null>(null);

  const handleTypeChange = (t: WeirType) => {
    setWeirType(t);
    const def = WEIR_DEFAULTS[t];
    setCd(def.cd);
    setSelCd(def.label);
  };

  const handleClear = () => {
    setWeirType("rectangular");
    setWeirMode("findQ");
    setL("");
    setH("");
    setQ("");
    setCd("");
    setSelCd("");
    setAngle("");
    setLenUnit("m");
    setFlowUnit("m³/s");
    setVa("");
    setShowVa(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const LSI   = parseFloat(L) * toLm[lenUnit];
    const HSI   = parseFloat(H) * toLm[lenUnit];
    const QSI   = parseFloat(Q) * toQSI[flowUnit];
    const cdVal = parseFloat(cd);
    const angVal= parseFloat(angle);
    const VaVal = parseFloat(Va);

    if (weirType !== "vnotch" && (isNaN(LSI) || LSI <= 0)) newErrors.L = "Must be a positive number";
    if (weirMode === "findQ" && (isNaN(HSI) || HSI <= 0)) newErrors.H = "Must be a positive number";
    if (weirMode === "findH" && (isNaN(QSI) || QSI <= 0)) newErrors.Q = "Must be a positive number";
    if (isNaN(cdVal) || cdVal <= 0 || cdVal > 1.1) newErrors.cd = "Must be between 0 and 1.1";
    if (weirType === "vnotch" && (isNaN(angVal) || angVal <= 0 || angVal >= 180))
      newErrors.angle = "Must be between 0 and 180°";
    if (showVa && (isNaN(VaVal) || VaVal < 0)) newErrors.Va = "Must be ≥ 0";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        weirType,
        mode: weirMode,
        weirLength:       weirType !== "vnotch" ? LSI : undefined,
        head:             weirMode === "findQ"  ? HSI : undefined,
        flowRate:         weirMode === "findH"  ? QSI : undefined,
        cd:               cdVal,
        notchAngle:       weirType === "vnotch" ? angVal : undefined,
        approachVelocity: showVa ? VaVal : undefined,
      };
      const calc = calculateWeirFlow(input);
      const stp  = generateWeirFlowSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const weirTypeLabels: Record<WeirType, string> = {
    rectangular:   "Rectangular",
    vnotch:        "V-notch",
    broad_crested: "Broad-crested",
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Weir Flow Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Flow rate over weirs — rectangular sharp-crested, V-notch (triangular), and broad-crested.
          Solve for Q (from head H) or find the required head H for a target flow rate.
          Includes approach velocity correction.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 rounded">
          Open Channel Flow · Hydraulics
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Weir type */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Weir type:</p>
          <div className="flex gap-2">
            {(Object.keys(weirTypeLabels) as WeirType[]).map(t => (
              <ModeBtn key={t} label={weirTypeLabels[t]}
                active={weirType === t} onClick={() => handleTypeChange(t)} />
            ))}
          </div>
        </div>

        {/* Mode */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Solve for:</p>
          <div className="flex gap-2 max-w-xs">
            <ModeBtn label="Find Q  (given H)" active={weirMode === "findQ"} onClick={() => setWeirMode("findQ")} />
            <ModeBtn label="Find H  (given Q)" active={weirMode === "findH"} onClick={() => setWeirMode("findH")} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Weir length — not shown for V-notch */}
          {weirType !== "vnotch" && (
            <div>
              <InputField label="Weir crest length" symbol="L" unit={lenUnit}
                value={L} onChange={setL}
                placeholder={lenUnit === "m" ? "2.0" : lenUnit === "mm" ? "2000" : lenUnit === "cm" ? "200" : "6.56"}
                error={errors.L} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                  <Btn key={u} label={u} active={lenUnit === u} onClick={() => {
                    const conv = (v: string) => { const r = parseFloat(v); return isNaN(r) ? v : parseFloat((r * toLm[lenUnit] / toLm[u]).toPrecision(6)).toString(); };
                    setL(conv(L)); setH(conv(H)); setLenUnit(u);
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Notch angle — V-notch only */}
          {weirType === "vnotch" && (
            <div>
              <InputField label="Notch angle" symbol="θ" unit="degrees"
                value={angle} onChange={setAngle} error={errors.angle} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {["90", "60", "45", "30"].map(a => (
                  <Btn key={a} label={`${a}°`} active={angle === a} onClick={() => setAngle(a)} />
                ))}
              </div>
            </div>
          )}

          {/* H or Q depending on mode */}
          {weirMode === "findQ" ? (
            <div>
              <InputField label="Head over weir crest" symbol="H" unit={lenUnit}
                value={H} onChange={setH}
                placeholder={lenUnit === "m" ? "0.5" : lenUnit === "mm" ? "500" : "50"}
                error={errors.H} />
              {weirType === "vnotch" && (
                <div className="flex flex-wrap gap-2 -mt-2">
                  {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                    <Btn key={u} label={u} active={lenUnit === u} onClick={() => {
                      const raw = parseFloat(H);
                      if (!isNaN(raw)) setH(parseFloat((raw * toLm[lenUnit] / toLm[u]).toPrecision(6)).toString());
                      setLenUnit(u);
                    }} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <InputField label="Flow rate" symbol="Q" unit={flowUnit}
                value={Q} onChange={setQ}
                placeholder={flowUnit === "m³/s" ? "1.0" : flowUnit === "L/s" ? "1000" : "35.3"}
                error={errors.Q} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m³/s","L/s","ft³/s"] as FlowUnit[]).map(u => (
                  <Btn key={u} label={u} active={flowUnit === u} onClick={() => {
                    const raw = parseFloat(Q);
                    if (!isNaN(raw)) setQ(parseFloat((raw * toQSI[flowUnit] / toQSI[u]).toPrecision(6)).toString());
                    setFlowUnit(u);
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Cd */}
          <div>
            <InputField label="Discharge coefficient" symbol="Cd" unit="dimensionless"
              value={cd} onChange={setCd} placeholder={WEIR_DEFAULTS[weirType].cd} error={errors.cd} />
            <div className="flex items-center gap-2 -mt-2">
              <select
                value={selCd}
                onChange={(e) => {
                  setSelCd(e.target.value);
                  const p = CD_PRESETS[weirType].find(x => x.label === e.target.value);
                  if (p) setCd(p.cd);
                }}
                className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">C<sub>d</sub> preset…</option>
                {CD_PRESETS[weirType].map(p => (
                  <option key={p.label} value={p.label}>{p.label} — C_d = {p.cd}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Approach velocity correction */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="showVa" checked={showVa}
              onChange={(e) => setShowVa(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="showVa" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Apply approach velocity correction — H<sub>eff</sub> = H + V<sub>a</sub>²/(2g)
            </label>
          </div>
          {showVa && (
            <div className="max-w-xs">
              <InputField label="Approach velocity" symbol="Va" unit="m/s"
                value={Va} onChange={setVa} error={errors.Va} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                Upstream channel velocity — significant when V<sub>a</sub> &gt; 0.3 m/s
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
                {weirMode === "findQ" ? (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Flow rate over weir
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      Q = {fmt(result.flowRate, 5)} m³/s
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      = {fmt(result.flowRate * 1000, 5)} L/s
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Required head over weir crest
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      H = {fmt(result.head, 5)} m
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      Q = {fmt(result.flowRate, 5)} m³/s
                    </p>
                  </>
                )}
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Weir flow quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "Q [m³/s]",  value: fmt(result.flowRate,     5) },
                    { label: "H [m]",      value: fmt(result.head,         5) },
                    { label: <span>C<sub>d</sub></span>, value: fmt(parseFloat(cd), 4) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      H<sub>eff</sub> [m]
                    </p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(result.effectiveHead, 5)}
                    </p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      V<sub>a</sub>²/(2g) [m]
                    </p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(result.velocityHead, 4)}
                    </p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      {result.unitDischarge !== undefined ? "q = Q/L [m²/s]" : "Q [L/s]"}
                    </p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {result.unitDischarge !== undefined
                        ? fmt(result.unitDischarge, 5)
                        : fmt(result.flowRate * 1000, 5)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Banner */}
              <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {weirTypeLabels[weirType]} weir — {weirMode === "findQ" ? "Q from H" : "H from Q"}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.weirFlow} />
              <CommonMistakes mistakes={commonMistakes.weirFlow} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Weir discharge equations:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">Rectangular sharp-crested:</div>
              <div>Q = (2/3) × C<sub>d</sub> × L × √(2g) × H<sup>3/2</sup></div>
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">V-notch (triangular):</div>
              <div>Q = (8/15) × C<sub>d</sub> × tan(θ/2) × √(2g) × H<sup>5/2</sup></div>
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">Broad-crested (critical-flow theory):</div>
              <div>Q = C<sub>d</sub> × √g × L × (2H/3)<sup>3/2</sup> = 1.705 × C<sub>d</sub> × L × H<sup>3/2</sup></div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Approach velocity correction:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>H<sub>eff</sub> = H + V<sub>a</sub>² / (2g)</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                Replace H with H<sub>eff</sub> in the discharge formula when V<sub>a</sub> &gt; 0.3 m/s
              </div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Typical discharge coefficient C<sub>d</sub> values:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Weir type</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">C<sub>d</sub></th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { t: "Rectangular sharp-crested",    cd: "0.61–0.65", n: "0.62 standard, varies with H/P" },
                  { t: "V-notch 90°",                  cd: "0.59–0.62", n: "0.61 standard (Kindsvater-Shen)" },
                  { t: "V-notch 60°",                  cd: "0.60–0.62", n: "Slightly higher than 90°" },
                  { t: "Broad-crested (smooth entry)",  cd: "0.85–0.90", n: "Approaches 0.848 theoretical" },
                  { t: "Broad-crested (sharp entry)",   cd: "0.75–0.82", n: "Entry losses reduce coefficient" },
                ].map(({ t, cd, n }) => (
                  <tr key={t}>
                    <td className="py-1.5 pr-4">{t}</td>
                    <td className="py-1.5 pr-4 font-mono">{cd}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Head measurement:</p>
            <p>
              H is always measured from the weir crest (top edge), not the channel bed.
              The gauge should be placed upstream at a distance of 3–4 times the maximum
              expected head to avoid drawdown effects near the weir face.
            </p>
          </div>
        </div>
      </Card>

      <References refs={REFS_WEIR_FLOW} />
    </div>
  );
}
