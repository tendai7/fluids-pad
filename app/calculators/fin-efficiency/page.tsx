"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_FIN_EFFICIENCY } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateFinEfficiency,
  generateFinEfficiencySteps,
  commonAssumptions,
  commonMistakes,
  type FinTipCondition,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit  = "m" | "mm" | "cm" | "inch";
type AreaUnit = "m²" | "mm²" | "cm²";
type GeomMode = "rectangular" | "custom";

const toLm:  Record<LenUnit,  number> = { m: 1, mm: 1e-3, cm: 1e-2, inch: 0.0254 };
const toAm:  Record<AreaUnit, number> = { "m²": 1, "mm²": 1e-6, "cm²": 1e-4 };

// Fin material presets  k W/(m·K)
const MATERIAL_PRESETS = [
  { label: "Aluminium 6061",   k: "167"  },
  { label: "Aluminium 1100",   k: "222"  },
  { label: "Copper (pure)",    k: "401"  },
  { label: "Carbon steel",     k: "50"   },
  { label: "Stainless 304",    k: "16"   },
  { label: "Brass",            k: "109"  },
  { label: "Titanium",         k: "22"   },
  { label: "Graphite composite", k: "300"},
] as const;

// h presets  W/(m²·K)
const H_PRESETS = [
  { label: "Natural convection — air",    h: "10"    },
  { label: "Forced convection — air",     h: "50"    },
  { label: "Forced convection — air (high velocity)", h: "200" },
  { label: "Liquid (water) forced conv.", h: "2000"  },
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

export default function FinEfficiencyCalculator() {
  // Geometry mode
  const [geomMode,  setGeomMode]  = useState<GeomMode>("rectangular");
  const [tipCond,   setTipCond]   = useState<FinTipCondition>("adiabatic");

  // Rectangular geometry inputs
  const [width,     setWidth]     = useState("20");
  const [thickness, setThickness] = useState("2");
  const [dimUnit,   setDimUnit]   = useState<LenUnit>("mm");

  // General geometry inputs
  const [P,         setP]         = useState("0.044");
  const [Ac,        setAc]        = useState("4e-5");
  const [areaUnit,  setAreaUnit]  = useState<AreaUnit>("m²");

  // Common inputs
  const [L,         setL]         = useState("50");
  const [lenUnit,   setLenUnit]   = useState<LenUnit>("mm");
  const [h,         setH]         = useState("50");
  const [k,         setK]         = useState("167");
  const [selMat,    setSelMat]    = useState("Aluminium 6061");
  const [selH,      setSelH]      = useState("");

  // Overall surface efficiency (optional)
  const [showOverall, setShowOverall] = useState(false);
  const [nFins,       setNFins]       = useState("20");
  const [totalArea,   setTotalArea]   = useState("0.1");
  const [totAreaUnit, setTotAreaUnit] = useState<AreaUnit>("m²");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateFinEfficiency> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateFinEfficiencySteps> | null>(null);

  // Derived P and Ac for rectangular mode
  const rectP  = () => {
    const w = parseFloat(width) * toLm[dimUnit];
    const t = parseFloat(thickness) * toLm[dimUnit];
    return 2 * (w + t);
  };
  const rectAc = () => {
    const w = parseFloat(width) * toLm[dimUnit];
    const t = parseFloat(thickness) * toLm[dimUnit];
    return w * t;
  };

  const handleClear = () => {
    setGeomMode("rectangular");
    setTipCond("adiabatic");
    setWidth("");
    setThickness("");
    setDimUnit("mm");
    setP("");
    setAc("");
    setAreaUnit("m²");
    setL("");
    setLenUnit("mm");
    setH("");
    setK("");
    setSelMat("");
    setSelH("");
    setNFins("");
    setTotalArea("");
    setTotAreaUnit("m²");
    setShowOverall(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const LSI   = parseFloat(L) * toLm[lenUnit];
    const hVal  = parseFloat(h);
    const kVal  = parseFloat(k);
    const nVal  = parseFloat(nFins);
    const AtSI  = parseFloat(totalArea) * toAm[totAreaUnit];

    let PSI: number, AcSI: number;
    if (geomMode === "rectangular") {
      const wVal = parseFloat(width);
      const tVal = parseFloat(thickness);
      if (isNaN(wVal) || wVal <= 0) newErrors.width = "Must be a positive number";
      if (isNaN(tVal) || tVal <= 0) newErrors.thickness = "Must be a positive number";
      PSI  = rectP();
      AcSI = rectAc();
    } else {
      const PVal  = parseFloat(P);
      const AcVal = parseFloat(Ac) * toAm[areaUnit];
      if (isNaN(PVal)  || PVal  <= 0) newErrors.P  = "Must be a positive number";
      if (isNaN(AcVal) || AcVal <= 0) newErrors.Ac = "Must be a positive number";
      PSI  = PVal;
      AcSI = parseFloat(Ac) * toAm[areaUnit];
    }

    if (isNaN(LSI) || LSI <= 0) newErrors.L = "Must be a positive number";
    if (isNaN(hVal)|| hVal <= 0) newErrors.h = "Must be a positive number";
    if (isNaN(kVal)|| kVal <= 0) newErrors.k = "Must be a positive number";

    if (showOverall) {
      if (isNaN(nVal)  || nVal  <= 0) newErrors.nFins     = "Must be a positive number";
      if (isNaN(AtSI)  || AtSI  <= 0) newErrors.totalArea = "Must be a positive number";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        finLength:          LSI,
        heatTransferCoeff:  hVal,
        perimeter:          PSI,
        crossSectionalArea: AcSI,
        thermalConductivity:kVal,
        tipCondition:       tipCond,
        nFins:              showOverall ? nVal  : undefined,
        totalArea:          showOverall ? AtSI  : undefined,
      };
      const calc = calculateFinEfficiency(input);
      const stp  = generateFinEfficiencySteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const eta = (result?.efficiency ?? 0) * 100;
  const effBg =
    eta >= 90
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      : eta >= 70
      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
      : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Fin Efficiency Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          η<sub>f</sub> = tanh(mL) / (mL) — uniform straight fin with adiabatic or corrected tip.
          Computes fin parameter m, dimensionless mL, efficiency η<sub>f</sub>, and optionally
          overall surface efficiency η<sub>o</sub> for an array of fins.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">
          Heat Transfer · Extended Surfaces
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Geometry mode */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Fin cross-section geometry:</p>
          <div className="flex gap-2 max-w-md">
            <ModeBtn label="Rectangular fin (enter w, t)"
              active={geomMode === "rectangular"} onClick={() => setGeomMode("rectangular")} />
            <ModeBtn label={<>Custom (enter P, A<sub>c</sub>)</>}
              active={geomMode === "custom"} onClick={() => setGeomMode("custom")} />
          </div>
        </div>

        {/* Tip condition */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Tip boundary condition:</p>
          <div className="flex gap-2 max-w-md">
            <ModeBtn
              label={<>Adiabatic tip — L<sub>eff</sub> = L</>}
              active={tipCond === "adiabatic"} onClick={() => setTipCond("adiabatic")} />
            <ModeBtn
              label={<>Corrected length — L<sub>c</sub> = L + A<sub>c</sub>/P</>}
              active={tipCond === "corrected"} onClick={() => setTipCond("corrected")} />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {tipCond === "adiabatic"
              ? "Assumes no heat loss from the fin tip — slightly over-predicts efficiency."
              : "Corrected length accounts for tip convection — more accurate for thin fins."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Rectangular geometry */}
          {geomMode === "rectangular" && (
            <>
              <div>
                <InputField label="Fin width" symbol="w" unit={dimUnit}
                  value={width} onChange={setWidth}
                  placeholder={dimUnit === "mm" ? "20" : "0.02"}
                  error={errors.width} />
                <div className="flex flex-wrap gap-2 -mt-2">
                  {(["m","mm","cm","inch"] as LenUnit[]).map(u => (
                    <Btn key={u} label={u} active={dimUnit === u} onClick={() => {
                      const conv = (v: string) => { const r = parseFloat(v); return isNaN(r) ? v : parseFloat((r * toLm[dimUnit] / toLm[u]).toPrecision(6)).toString(); };
                      setWidth(conv(width)); setThickness(conv(thickness)); setDimUnit(u);
                    }} />
                  ))}
                </div>
              </div>
              <div>
                <InputField label="Fin thickness" symbol="t" unit={dimUnit}
                  value={thickness} onChange={setThickness}
                  placeholder={dimUnit === "mm" ? "2" : "0.002"}
                  error={errors.thickness} />
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                  P = 2(w + t) · A<sub>c</sub> = w × t  (computed automatically)
                </p>
              </div>
            </>
          )}

          {/* Custom geometry */}
          {geomMode === "custom" && (
            <>
              <div>
                <InputField label="Fin cross-section perimeter" symbol="P" unit="m"
                  value={P} onChange={setP} error={errors.P} />
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                  Rectangular: P = 2(w + t) · Annular: P ≈ 2π(r<sub>o</sub> − r<sub>i</sub>)
                </p>
              </div>
              <div>
                <InputField label="Fin cross-section area" symbol="Ac" unit={areaUnit}
                  value={Ac} onChange={setAc} error={errors.Ac} />
                <div className="flex gap-2 -mt-2">
                  {(["m²","mm²","cm²"] as AreaUnit[]).map(u => (
                    <Btn key={u} label={u} active={areaUnit === u} onClick={() => {
                      const raw = parseFloat(Ac);
                      if (!isNaN(raw)) setAc(parseFloat((raw * toAm[areaUnit] / toAm[u]).toPrecision(6)).toString());
                      setAreaUnit(u);
                    }} />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Fin length */}
          <div>
            <InputField label="Fin length" symbol="L" unit={lenUnit}
              value={L} onChange={setL}
              placeholder={lenUnit === "mm" ? "50" : "0.05"}
              error={errors.L} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m","mm","cm","inch"] as LenUnit[]).map(u => (
                <Btn key={u} label={u} active={lenUnit === u} onClick={() => {
                  const raw = parseFloat(L);
                  if (!isNaN(raw)) setL(parseFloat((raw * toLm[lenUnit] / toLm[u]).toPrecision(6)).toString());
                  setLenUnit(u);
                }} />
              ))}
            </div>
          </div>

          {/* h */}
          <div>
            <InputField label="Convection coefficient" symbol="h" unit="W/(m²·K)"
              value={h} onChange={setH} error={errors.h} />
            <div className="flex items-center gap-2 -mt-2">
              <select value={selH}
                onChange={(e) => { setSelH(e.target.value); const p = H_PRESETS.find(x => x.label === e.target.value); if (p) setH(p.h); }}
                className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">h preset…</option>
                {H_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label} — {p.h} W/(m²·K)</option>)}
              </select>
            </div>
          </div>

          {/* k */}
          <div>
            <InputField label="Fin thermal conductivity" symbol="k" unit="W/(m·K)"
              value={k} onChange={setK} error={errors.k} />
            <div className="flex items-center gap-2 -mt-2">
              <select value={selMat}
                onChange={(e) => { setSelMat(e.target.value); const p = MATERIAL_PRESETS.find(x => x.label === e.target.value); if (p) setK(p.k); }}
                className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Material preset…</option>
                {MATERIAL_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label} — {p.k} W/(m·K)</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Overall surface efficiency */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="showOverall" checked={showOverall}
              onChange={(e) => setShowOverall(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="showOverall" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Also compute overall surface efficiency η<sub>o</sub> = 1 − (N·A<sub>f</sub>/A<sub>t</sub>)·(1−η<sub>f</sub>)
            </label>
          </div>
          {showOverall && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <InputField label="Number of fins" symbol="N" unit="dimensionless"
                  value={nFins} onChange={setNFins} error={errors.nFins} />
              </div>
              <div>
                <InputField label="Total surface area (fins + base)" symbol="At" unit={totAreaUnit}
                  value={totalArea} onChange={setTotalArea} error={errors.totalArea} />
                <div className="flex gap-2 -mt-2">
                  {(["m²","mm²","cm²"] as AreaUnit[]).map(u => (
                    <Btn key={u} label={u} active={totAreaUnit === u} onClick={() => {
                      const raw = parseFloat(totalArea);
                      if (!isNaN(raw)) setTotalArea(parseFloat((raw * toAm[totAreaUnit] / toAm[u]).toPrecision(6)).toString());
                      setTotAreaUnit(u);
                    }} />
                  ))}
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
        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Fin efficiency  η<sub>f</sub> = tanh(mL) / (mL)
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  η<sub>f</sub> = {fmt(result.efficiency * 100, 5)} %
                </p>
                {result.overallEfficiency !== undefined && (
                  <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                    η<sub>o</sub> = {fmt(result.overallEfficiency * 100, 5)} %
                  </p>
                )}
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Fin parameters
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: <span>η<sub>f</sub> [%]</span>,   value: fmt(result.efficiency * 100, 5) },
                    { label: "m [m⁻¹]",                        value: fmt(result.mParameter,        5) },
                    { label: "mL",                              value: fmt(result.mL,                5) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                {(result.correctedLength !== undefined || result.overallEfficiency !== undefined) && (
                  <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                        {result.correctedLength !== undefined ? <span>L<sub>c</sub> [m]</span> : "L [m]"}
                      </p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {fmt(result.correctedLength ?? parseFloat(L) * toLm[lenUnit], 5)}
                      </p>
                    </div>
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                        {result.finHeatRatio !== undefined ? <span>N·A<sub>f</sub>/A<sub>t</sub></span> : "—"}
                      </p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {result.finHeatRatio !== undefined ? fmt(result.finHeatRatio, 4) : "—"}
                      </p>
                    </div>
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                        {result.overallEfficiency !== undefined ? <span>η<sub>o</sub> [%]</span> : "—"}
                      </p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {result.overallEfficiency !== undefined ? fmt(result.overallEfficiency * 100, 5) : "—"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Efficiency banner */}
              <div className={`p-4 rounded-lg border ${effBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {eta >= 90
                    ? `High efficiency — ηf = ${fmt(eta, 4)}% (mL = ${fmt(result.mL, 3)} < 0.5 ≈ optimal zone)`
                    : eta >= 70
                    ? `Moderate efficiency — ηf = ${fmt(eta, 4)}% (consider shorter or thicker fins)`
                    : `Low efficiency — ηf = ${fmt(eta, 4)}% (fin is too long or h too high relative to k)`}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.finEfficiency} />
              <CommonMistakes mistakes={commonMistakes.finEfficiency} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Fin parameter and efficiency:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>m = √(h × P / (k × A<sub>c</sub>))&nbsp;&nbsp;&nbsp;&nbsp;[m⁻¹]</div>
              <div>η<sub>f</sub> = tanh(mL) / (mL)&nbsp;&nbsp;&nbsp;&nbsp;[adiabatic/corrected tip]</div>
              <div>L<sub>c</sub> = L + A<sub>c</sub> / P&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[corrected length — accounts for tip convection]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Rectangular fin shortcuts:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>P  = 2(w + t)&nbsp;&nbsp;&nbsp;&nbsp;[m]  — cross-section perimeter</div>
              <div>A<sub>c</sub> = w × t&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[m²] — cross-section area</div>
              <div>L<sub>c</sub> = L + t/2&nbsp;&nbsp;&nbsp;&nbsp;[m]  — corrected length for rectangular fin</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Overall surface efficiency for a finned array:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>η<sub>o</sub> = 1 − (N × A<sub>f</sub> / A<sub>t</sub>) × (1 − η<sub>f</sub>)</div>
              <div>A<sub>f</sub> = P × L<sub>c</sub>&nbsp;&nbsp;&nbsp;&nbsp;[m²]  fin surface area (one fin)</div>
              <div>A<sub>t</sub> = total area including fins and unfinned base</div>
            </div>
            <p className="mt-1">
              η<sub>o</sub> is used in Q = η<sub>o</sub> × h × A<sub>t</sub> × (T<sub>base</sub> − T<sub>∞</sub>)
              to find the total heat transfer rate from a finned surface.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Design guidelines:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">mL</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">η<sub>f</sub></th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Assessment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { mL: "0.2",  eta: "99%",   note: "Essentially ideal — fin surface at base temperature" },
                  { mL: "0.5",  eta: "92%",   note: "Excellent — practical design target" },
                  { mL: "1.0",  eta: "76%",   note: "Good — common in practice" },
                  { mL: "1.5",  eta: "60%",   note: "Moderate — consider shortening fin" },
                  { mL: "2.0",  eta: "48%",   note: "Poor — fin length exceeds optimum" },
                  { mL: "3.0",  eta: "33%",   note: "Very poor — additional length adds little heat transfer" },
                ].map(({ mL, eta, note }) => (
                  <tr key={mL}>
                    <td className="py-1.5 pr-4 font-mono">{mL}</td>
                    <td className="py-1.5 pr-4 font-mono">{eta}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
      <References refs={REFS_FIN_EFFICIENCY} />
    </div>
  );
}