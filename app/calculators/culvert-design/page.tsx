"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_CULVERT_DESIGN } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateCulvertDesign,
  generateCulvertDesignSteps,
  commonAssumptions,
  CULVERT_INLET_PRESETS,
  type CulvertMode,
  type CulvertShape,
  type CulvertInletType,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit  = "m" | "mm" | "cm" | "ft";
type FlowUnit = "m³/s" | "L/s" | "ft³/s";

const toLm:  Record<LenUnit,  number> = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048 };
const toQSI: Record<FlowUnit, number> = { "m³/s": 1, "L/s": 1e-3, "ft³/s": 0.02832 };

const N_PRESETS = [
  { label: "Concrete pipe, smooth",       n: "0.012" },
  { label: "Concrete pipe, corrugated",   n: "0.015" },
  { label: "Corrugated metal pipe (CMP)", n: "0.024" },
  { label: "Plastic pipe (HDPE smooth)",  n: "0.011" },
  { label: "Concrete box culvert",        n: "0.013" },
  { label: "Cast-iron pipe",              n: "0.013" },
];

// Standard culvert diameters (mm)
const STD_DIAMETERS_MM = [300, 375, 450, 525, 600, 675, 750, 900, 1050, 1200, 1350, 1500, 1800, 2100];

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

const MODE_LABELS: Record<CulvertMode, string> = {
  findQ: "Find Q  (given H, D)",
  findH: "Find HW  (given Q, D)",
  findD: "Size D  (given Q, H)",
};

const SHAPE_LABELS: Record<CulvertShape, string> = {
  circular: "Circular pipe",
  box:      "Box culvert",
};

const CULVERT_MISTAKES: React.ReactNode[] = [
  <>Using the headwater above the <em>channel bed</em> as the driving head — H is measured from the <em>inlet invert</em> (pipe soffit / invert elevation), not the upstream channel bed</>,
  <>Ignoring the friction loss coefficient K<sub>f</sub> = 19.63 n² L / R<sub>h</sub><sup>4/3</sup> for long culverts — for L/D &gt; 10, friction dominates and inlet-control assumptions give unsafe overestimates</>,
  <>Assuming inlet control always governs — for long or rough culverts (large K<sub>f</sub>), outlet control gives a lower Q and is the binding constraint</>,
  <>Reading standard pipe sizes in nominal (outside) diameter — culvert sizing must use the internal (barrel) diameter for area and R<sub>h</sub> calculations</>,
];

export default function CulvertDesignCalculator() {
  const [mode,      setMode]      = useState<CulvertMode>("findQ");
  const [shape,     setShape]     = useState<CulvertShape>("circular");
  const [inletType, setInletType] = useState<CulvertInletType>("squareHeadwall");

  // geometry
  const [D,        setD]        = useState("0.9");
  const [bw,       setBw]       = useState("1.2");
  const [bh,       setBh]       = useState("0.9");
  const [L,        setL]        = useState("20.0");
  const [geomUnit, setGeomUnit] = useState<LenUnit>("m");

  // Manning's n
  const [n, setN] = useState("0.013");

  // Cd / Ke overrides
  const [overrideCdKe, setOverrideCdKe] = useState(false);
  const [cd, setCd] = useState(CULVERT_INLET_PRESETS.squareHeadwall.cd.toString());
  const [ke, setKe] = useState(CULVERT_INLET_PRESETS.squareHeadwall.ke.toString());

  // mode inputs
  const [H,        setH]        = useState("1.5");
  const [hUnit,    setHUnit]    = useState<LenUnit>("m");
  const [Q,        setQ]        = useState("1.5");
  const [flowUnit, setFlowUnit] = useState<FlowUnit>("m³/s");
  const [TW,       setTW]       = useState("0.0");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateCulvertDesign> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateCulvertDesignSteps> | null>(null);

  const handleInletChange = (t: CulvertInletType) => {
    setInletType(t);
    if (!overrideCdKe) {
      setCd(CULVERT_INLET_PRESETS[t].cd.toString());
      setKe(CULVERT_INLET_PRESETS[t].ke.toString());
    }
  };

  const handleClear = () => {
    setMode("findQ");
    setShape("circular");
    setInletType("squareHeadwall");
    setD("");
    setBw("");
    setBh("");
    setL("");
    setGeomUnit("m");
    setN("");
    setH("");
    setHUnit("m");
    setQ("");
    setFlowUnit("m³/s");
    setTW("");
    setOverrideCdKe(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const DSI  = parseFloat(D)  * toLm[geomUnit];
    const bwSI = parseFloat(bw) * toLm[geomUnit];
    const bhSI = parseFloat(bh) * toLm[geomUnit];
    const LSI  = parseFloat(L)  * toLm[geomUnit];
    const nVal = parseFloat(n);
    const cdVal = parseFloat(cd);
    const keVal = parseFloat(ke);
    const HSI  = parseFloat(H)  * toLm[hUnit];
    const QSI  = parseFloat(Q)  * toQSI[flowUnit];
    const TWSI = parseFloat(TW) * toLm[hUnit];

    if (shape === "circular" && mode !== "findD" && (isNaN(DSI) || DSI <= 0)) newErrors.D = "Must be positive";
    if (shape === "box") {
      if (isNaN(bwSI) || bwSI <= 0) newErrors.bw = "Must be positive";
      if (isNaN(bhSI) || bhSI <= 0) newErrors.bh = "Must be positive";
    }
    if (isNaN(LSI) || LSI <= 0) newErrors.L = "Must be positive";
    if (isNaN(nVal) || nVal <= 0) newErrors.n = "Must be positive";
    if (isNaN(cdVal) || cdVal <= 0 || cdVal > 1) newErrors.cd = "Must be 0 – 1";
    if (isNaN(keVal) || keVal < 0) newErrors.ke = "Must be ≥ 0";

    if ((mode === "findQ" || mode === "findD") && (isNaN(HSI) || HSI <= 0)) newErrors.H = "Must be positive";
    if ((mode === "findH" || mode === "findD") && (isNaN(QSI) || QSI <= 0)) newErrors.Q = "Must be positive";
    if (isNaN(TWSI) || TWSI < 0) newErrors.TW = "Must be ≥ 0";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        mode, shape, inletType, length: LSI, manningN: nVal,
        cdOverride: overrideCdKe ? cdVal : undefined,
        keOverride: overrideCdKe ? keVal : undefined,
        diameter:   shape === "circular" && mode !== "findD" ? DSI  : undefined,
        boxWidth:   shape === "box" ? bwSI : undefined,
        boxHeight:  shape === "box" ? bhSI : undefined,
        head:       (mode === "findQ" || mode === "findD") ? HSI : undefined,
        flowRate:   (mode === "findH" || mode === "findD") ? QSI : undefined,
        tailwater:  TWSI > 0 ? TWSI : undefined,
      };
      const calc = calculateCulvertDesign(input);
      const stp  = generateCulvertDesignSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const controlBg = result
    ? result.controlMode === "inlet"
      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
      : result.controlMode === "outlet"
      ? "bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700"
      : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
    : "";

  const controlLabel = result
    ? result.controlMode === "inlet" ? "Inlet control"
    : result.controlMode === "outlet" ? "Outlet control"
    : "Balanced"
    : "";

  const controlColor = result
    ? result.controlMode === "inlet"
      ? "text-blue-700 dark:text-blue-300"
      : result.controlMode === "outlet"
      ? "text-orange-700 dark:text-orange-300"
      : "text-yellow-700 dark:text-yellow-300"
    : "";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Culvert Design Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Circular and box culverts under full-flow pressure conditions. Computes both inlet control
          and outlet control capacity — the governing (lower) flow rate is the design value.
          Supports sizing (Find D), headwater estimation (Find HW), and capacity check (Find Q).
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 rounded">
          Open Channel Flow · Hydraulic Structures
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Mode */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Solve for:</p>
          <div className="flex gap-2">
            {(Object.keys(MODE_LABELS) as CulvertMode[]).map(m => (
              <ModeBtn key={m} label={MODE_LABELS[m]} active={mode === m} onClick={() => setMode(m)} />
            ))}
          </div>
        </div>

        {/* Shape */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Culvert shape:</p>
          <div className="flex gap-2 max-w-xs">
            {(Object.keys(SHAPE_LABELS) as CulvertShape[]).map(s => (
              <ModeBtn key={s} label={SHAPE_LABELS[s]} active={shape === s}
                onClick={() => { setShape(s); if (s === "box" && mode === "findD") setMode("findQ"); }} />
            ))}
          </div>
          {shape === "box" && mode === "findD" && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Size (Find D) is only available for circular culverts. Switching to Find Q.
            </p>
          )}
        </div>

        {/* Inlet type */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Inlet type:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {(Object.keys(CULVERT_INLET_PRESETS) as CulvertInletType[]).map(t => (
              <button key={t} onClick={() => handleInletChange(t)}
                className={`px-2 py-1.5 text-xs rounded text-left transition-colors ${inletType === t
                  ? "bg-teal-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
                {CULVERT_INLET_PRESETS[t].label}
                <span className="block opacity-70">
                  C<sub>d</sub> = {CULVERT_INLET_PRESETS[t].cd} · K<sub>e</sub> = {CULVERT_INLET_PRESETS[t].ke}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Geometry — circular */}
          {shape === "circular" && mode !== "findD" && (
            <div>
              <InputField label="Internal diameter" symbol="D" unit={geomUnit}
                value={D} onChange={setD}
                placeholder={geomUnit === "m" ? "0.9" : geomUnit === "mm" ? "900" : "90"}
                error={errors.D} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                  <Btn key={u} label={u} active={geomUnit === u} onClick={() => setGeomUnit(u)} />
                ))}
              </div>
              {geomUnit === "mm" && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {STD_DIAMETERS_MM.map(d => (
                    <Btn key={d} label={`${d}`} active={D === d.toString()}
                      onClick={() => setD(d.toString())} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Geometry — box */}
          {shape === "box" && (
            <>
              <div>
                <InputField label="Box width" symbol="B" unit={geomUnit}
                  value={bw} onChange={setBw}
                  placeholder={geomUnit === "m" ? "1.2" : "1200"}
                  error={errors.bw} />
                <div className="flex flex-wrap gap-2 -mt-2">
                  {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                    <Btn key={u} label={u} active={geomUnit === u} onClick={() => setGeomUnit(u)} />
                  ))}
                </div>
              </div>
              <div>
                <InputField label="Box height" symbol="H_c" unit={geomUnit}
                  value={bh} onChange={setBh}
                  placeholder={geomUnit === "m" ? "0.9" : "900"}
                  error={errors.bh} />
                <div className="flex flex-wrap gap-2 -mt-2">
                  {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                    <Btn key={u} label={u} active={geomUnit === u} onClick={() => setGeomUnit(u)} />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Length */}
          <div>
            <InputField label="Culvert length" symbol="L" unit={geomUnit}
              value={L} onChange={setL} error={errors.L} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                <Btn key={u} label={u} active={geomUnit === u} onClick={() => setGeomUnit(u)} />
              ))}
            </div>
          </div>

          {/* Manning's n */}
          <div>
            <InputField label="Manning's n" symbol="n" unit="dimensionless"
              value={n} onChange={setN} error={errors.n} />
            <div className="mt-1">
              <select onChange={(e) => { if (e.target.value) setN(e.target.value); }}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">n preset…</option>
                {N_PRESETS.map(p => (
                  <option key={p.label} value={p.n}>{p.label} — n = {p.n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* HW — for findQ and findD */}
          {(mode === "findQ" || mode === "findD") && (
            <div>
              <InputField label="Headwater depth" symbol="HW" unit={hUnit}
                value={H} onChange={setH}
                placeholder={hUnit === "m" ? "1.5" : "1500"}
                error={errors.H} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                HW measured from inlet invert (pipe invert elevation = 0)
              </p>
              <div className="flex flex-wrap gap-2 mt-1">
                {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                  <Btn key={u} label={u} active={hUnit === u} onClick={() => setHUnit(u)} />
                ))}
              </div>
            </div>
          )}

          {/* Q — for findH and findD */}
          {(mode === "findH" || mode === "findD") && (
            <div>
              <InputField label="Design flow rate" symbol="Q" unit={flowUnit}
                value={Q} onChange={setQ}
                placeholder={flowUnit === "m³/s" ? "1.5" : "1500"}
                error={errors.Q} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m³/s","L/s","ft³/s"] as FlowUnit[]).map(u => (
                  <Btn key={u} label={u} active={flowUnit === u} onClick={() => setFlowUnit(u)} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tailwater */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Tailwater depth TW above outlet invert (0 = free outfall):
          </p>
          <div className="max-w-xs">
            <InputField label="Tailwater depth" symbol="TW" unit={hUnit}
              value={TW} onChange={setTW} error={errors.TW} />
          </div>
        </div>

        {/* Cd / Ke override */}
        <div className="mt-4 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="overrideCdKe" checked={overrideCdKe}
              onChange={(e) => setOverrideCdKe(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="overrideCdKe" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Override C<sub>d</sub> and K<sub>e</sub> manually
            </label>
          </div>
          {overrideCdKe && (
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <InputField label="Discharge coeff." symbol="Cd" unit="dimensionless"
                value={cd} onChange={setCd} error={errors.cd} />
              <InputField label="Entrance loss coeff." symbol="Ke" unit="dimensionless"
                value={ke} onChange={setKe} error={errors.ke} />
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

              {/* Primary result */}
              <div>
                {mode === "findQ" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Culvert capacity (governing)
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      Q = {fmt(result.flowRate, 5)} m³/s
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      = {fmt(result.flowRate * 1000, 5)} L/s &nbsp;·&nbsp; V = {fmt(result.velocity, 5)} m/s
                    </p>
                  </>
                )}
                {mode === "findH" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Required headwater depth
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      HW = {fmt(result.head!, 5)} m
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      V = {fmt(result.velocity, 5)} m/s
                      {result.hwdRatio !== undefined && ` · HW/D = ${fmt(result.hwdRatio, 4)}`}
                    </p>
                  </>
                )}
                {mode === "findD" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Required internal diameter
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      D = {fmt(result.diameter!, 5)} m
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      = {fmt(result.diameter! * 1000, 5)} mm &nbsp;·&nbsp; V = {fmt(result.velocity, 5)} m/s
                    </p>
                    {/* Nearest standard size */}
                    {(() => {
                      const Dmm = result.diameter! * 1000;
                      const nextStd = STD_DIAMETERS_MM.find(d => d >= Dmm);
                      return nextStd ? (
                        <p className="text-sm text-teal-700 dark:text-teal-300 mt-1">
                          Nearest standard size ≥ required: {nextStd} mm
                        </p>
                      ) : null;
                    })()}
                  </>
                )}
              </div>

              {/* Control mode banner */}
              <div className={`p-4 rounded-lg border ${controlBg}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-gray-900 dark:text-white">{controlLabel}</p>
                  <span className={`text-sm font-bold uppercase tracking-wide ${controlColor}`}>
                    {controlLabel}
                  </span>
                </div>
                {mode === "findQ" && (
                  <div className="flex flex-wrap gap-6 text-sm text-gray-700 dark:text-gray-300 mt-1">
                    <span>Q<sub>inlet</sub> = {fmt(result.qInletControl!, 5)} m³/s</span>
                    <span>Q<sub>outlet</sub> = {fmt(result.qOutletControl!, 5)} m³/s</span>
                  </div>
                )}
                {mode === "findH" && (
                  <div className="flex flex-wrap gap-6 text-sm text-gray-700 dark:text-gray-300 mt-1">
                    <span>HW<sub>inlet</sub> = {fmt(result.headInletControl!, 5)} m</span>
                    <span>HW<sub>outlet</sub> = {fmt(result.headOutletControl!, 5)} m</span>
                  </div>
                )}
                {mode === "findD" && (
                  <div className="flex flex-wrap gap-6 text-sm text-gray-700 dark:text-gray-300 mt-1">
                    <span>D<sub>inlet</sub> = {fmt(result.diamInletControl!, 5)} m</span>
                    <span>D<sub>outlet</sub> = {fmt(result.diamOutletControl!, 5)} m</span>
                  </div>
                )}
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">{result.interpretation}</p>
              </div>

              {/* Quantities grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Culvert quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "A [m²]",                                 value: fmt(result.area, 5) },
                    { label: <span>R<sub>h</sub> [m]</span>,           value: fmt(result.hydraulicRadius, 5) },
                    { label: "V [m/s]",                                value: fmt(result.velocity, 5) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: <span>C<sub>d</sub></span>,  value: fmt(result.cd,  3) },
                    { label: <span>K<sub>e</sub></span>,  value: fmt(result.ke,  3) },
                    { label: <span>K<sub>f</sub></span>,  value: fmt(result.kf,  4) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                {result.hwdRatio !== undefined && (
                  <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                    <div className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">HW/D</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {fmt(result.hwdRatio, 4)}
                      </p>
                    </div>
                    <div className="px-3 py-2.5 text-center col-span-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">HW/D guidance</p>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">
                        {result.hwdRatio < 1.0 ? "< 1.0 — partial flow, pressure eqs. may overestimate"
                         : result.hwdRatio <= 1.5 ? "1.0–1.5 — acceptable full-flow range"
                         : result.hwdRatio <= 2.0 ? "1.5–2.0 — high head, check road overtopping"
                         : "> 2.0 — excessive — consider larger culvert"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.culvertDesign} />
              <CommonMistakes mistakes={CULVERT_MISTAKES} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Inlet control — orifice equation:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Q<sub>i</sub> = C<sub>d</sub> × A × √(2g × HW)</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                Capacity limited by the inlet. Barrel runs partially full; friction is secondary.
              </div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Outlet control — full-flow pressure equation:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Q<sub>o</sub> = A × √(2g × ΔH / (1 + K<sub>e</sub> + K<sub>f</sub>))</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                ΔH = HW − TW &nbsp;·&nbsp; K<sub>f</sub> = 19.63 n² L / R<sub>h</sub><sup>4/3</sup> &nbsp;(Manning-based friction)
              </div>
            </div>
            <p className="mt-2">
              Barrel runs full (pressure flow). Capacity limited by friction and tailwater.
              Entrance loss K<sub>e</sub> accounts for flow contraction at the inlet.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Design flow:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              Q = min(Q<sub>i</sub>, Q<sub>o</sub>) &nbsp;·&nbsp; the binding constraint limits actual flow
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Inlet type and loss coefficients:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Inlet type</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">C<sub>d</sub></th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">K<sub>e</sub></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {(Object.entries(CULVERT_INLET_PRESETS) as [CulvertInletType, typeof CULVERT_INLET_PRESETS[CulvertInletType]][]).map(([, p]) => (
                  <tr key={p.label}>
                    <td className="py-1.5 pr-4">{p.label}</td>
                    <td className="py-1.5 pr-4 font-mono">{p.cd}</td>
                    <td className="py-1.5 font-mono">{p.ke}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">HW/D ratio guidance:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">HW/D</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Implication</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { r: "< 1.0",   i: "Culvert not flowing full — pressure-flow equations may overestimate Q" },
                  { r: "1.0–1.5", i: "Normal full-flow range for most culvert design standards" },
                  { r: "1.5–2.0", i: "High head — check road overtopping and downstream scour" },
                  { r: "> 2.0",   i: "Excessive — upsize culvert or provide parallel barrel" },
                ].map(({ r, i }) => (
                  <tr key={r}>
                    <td className="py-1.5 pr-4 font-mono text-xs">{r}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{i}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </Card>

      <References refs={REFS_CULVERT_DESIGN} />
    </div>
  );
}
