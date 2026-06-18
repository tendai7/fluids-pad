"use client";

import React, { useState, useMemo } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_CHEZY_EQUATION } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateChezyEquation,
  generateChezyEquationSteps,
  commonAssumptions,
  commonMistakes,
  type ChezyMode,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit   = "m" | "mm" | "cm" | "ft";
type VelUnit   = "m/s" | "ft/s";
type FlowUnit  = "m³/s" | "L/s" | "ft³/s";
type SlopeUnit = "m/m" | "%" | "ft/ft";
type GeomType  = "manual" | "rectangular" | "trapezoidal" | "circular";

const toLm:    Record<LenUnit,   number> = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048 };
const toVSI:   Record<VelUnit,   number> = { "m/s": 1, "ft/s": 0.3048 };
const toQSI:   Record<FlowUnit,  number> = { "m³/s": 1, "L/s": 1e-3, "ft³/s": 0.02832 };
const toSlope: Record<SlopeUnit, number> = { "m/m": 1, "%": 0.01, "ft/ft": 1 };

// Typical C values for reference
const C_PRESETS = [
  { label: "Smooth concrete flume",          C: "70" },
  { label: "Unlined earth channel (good)",   C: "55" },
  { label: "Unlined earth channel (fair)",   C: "45" },
  { label: "Gravel bed, natural channel",    C: "38" },
  { label: "Corrugated metal / rough stone", C: "25" },
  { label: "Smooth glass/plastic lab flume", C: "90" },
] as const;

// Manning's n presets for C derivation
const N_PRESETS = [
  { label: "Concrete trowel (n=0.012)",  n: "0.012" },
  { label: "Concrete float (n=0.015)",   n: "0.015" },
  { label: "Earth uniform (n=0.022)",    n: "0.022" },
  { label: "Earth winding (n=0.030)",    n: "0.030" },
  { label: "Natural clean (n=0.030)",    n: "0.030" },
  { label: "Gravel bottom (n=0.025)",    n: "0.025" },
] as const;

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

function rectR(b: number, y: number)        { return (b * y) / (b + 2 * y); }
function trapR(b: number, y: number, z: number) { return ((b + z * y) * y) / (b + 2 * y * Math.sqrt(1 + z * z)); }
function circR(D: number)                   { return D / 4; }

export default function ChezyEquationCalculator() {
  const [mode,      setMode]      = useState<ChezyMode>("findV");
  const [geomType,  setGeomType]  = useState<GeomType>("manual");

  // Geometry
  const [Rh,        setRh]        = useState("0.80");
  const [A,         setA]         = useState("2.4");
  const [b,         setB]         = useState("3.0");
  const [y,         setY]         = useState("0.8");
  const [z,         setZ]         = useState("1.5");
  const [D,         setD]         = useState("1.2");
  const [geomUnit,  setGeomUnit]  = useState<LenUnit>("m");

  // Flow params
  const [C,         setC]         = useState("55");
  const [V,         setV]         = useState("1.5");
  const [S,         setS]         = useState("0.001");
  const [velUnit,   setVelUnit]   = useState<VelUnit>("m/s");
  const [slopeUnit, setSlopeUnit] = useState<SlopeUnit>("m/m");

  // C from Manning's n
  const [showManning, setShowManning] = useState(false);
  const [manN,        setManN]        = useState("0.022");

  // Optional area for Q
  const [showA,  setShowA]  = useState(false);
  const [areaStr,setAreaStr]= useState("2.4");
  const [areaUnit,setAreaUnit]= useState<"m²"|"ft²">("m²");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateChezyEquation> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateChezyEquationSteps> | null>(null);

  // Derived R_h from geometry
  const derivedR = useMemo(() => {
    const gU = toLm[geomUnit];
    const bSI = parseFloat(b) * gU;
    const ySI = parseFloat(y) * gU;
    const zV  = parseFloat(z);
    const DSI = parseFloat(D) * gU;
    if (geomType === "rectangular" && bSI > 0 && ySI > 0) return rectR(bSI, ySI);
    if (geomType === "trapezoidal" && bSI > 0 && ySI > 0 && zV >= 0) return trapR(bSI, ySI, zV);
    if (geomType === "circular"    && DSI > 0) return circR(DSI);
    return null;
  }, [geomType, b, y, z, D, geomUnit]);

  // Derived C from Manning's n
  const derivedC = useMemo(() => {
    if (!showManning) return null;
    const nV = parseFloat(manN);
    const RV = geomType === "manual" ? parseFloat(Rh) : (derivedR ?? NaN);
    if (isNaN(nV) || nV <= 0 || isNaN(RV) || RV <= 0) return null;
    return Math.pow(RV, 1 / 6) / nV;
  }, [showManning, manN, Rh, geomType, derivedR]);

  const handleClear = () => {
    setMode("findV");
    setGeomType("manual");
    setRh("");
    setA("");
    setB("");
    setY("");
    setZ("");
    setD("");
    setGeomUnit("m");
    setC("");
    setV("");
    setS("");
    setVelUnit("m/s");
    setSlopeUnit("m/m");
    setManN("");
    setAreaStr("");
    setAreaUnit("m²");
    setShowManning(false);
    setShowA(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const CSI  = derivedC ?? parseFloat(C);
    const VSI  = parseFloat(V) * toVSI[velUnit];
    const SSI  = parseFloat(S) * toSlope[slopeUnit];
    const ASI  = parseFloat(areaStr) * (areaUnit === "m²" ? 1 : 0.0929);
    const RhSI = geomType === "manual" ? parseFloat(Rh)
               : (derivedR ?? NaN);

    if (mode !== "findC" && (isNaN(CSI) || CSI <= 0)) newErrors.C = "C must be positive";
    if (mode !== "findV" && (isNaN(VSI) || VSI <= 0)) newErrors.V = "Must be positive";
    if (mode !== "findS" && (isNaN(SSI) || SSI <= 0)) newErrors.S = "Must be positive";
    if (mode !== "findR" && (isNaN(RhSI) || RhSI <= 0)) newErrors.Rh = "Must be positive";
    if (showA && (isNaN(ASI) || ASI <= 0)) newErrors.area = "Must be positive";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        mode,
        chezyC:         (mode !== "findC") ? CSI  : undefined,
        velocity:       (mode !== "findV") ? VSI  : undefined,
        slope:          (mode !== "findS") ? SSI  : undefined,
        hydraulicRadius:(mode !== "findR") ? RhSI : undefined,
        area:           showA ? ASI : undefined,
      };
      const calc = calculateChezyEquation(input as Parameters<typeof calculateChezyEquation>[0]);
      const stp  = generateChezyEquationSteps(input as Parameters<typeof calculateChezyEquation>[0], calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const modeLabels: Record<ChezyMode, React.ReactNode> = {
    findV: "Find V",
    findC: <>Find C</>,
    findS: "Find S",
    findR: <> Find R<sub>h</sub></>,
  };

  const Fr = result?.froudeNumber ?? 0;
  const froudeBg =
    Fr < 0.99 ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
    : Fr > 1.01 ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
    : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Chézy Equation Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          V = C√(R<sub>h</sub>S) — the original open-channel velocity formula.
          Solves for velocity, Chézy coefficient C, slope S, or hydraulic radius R<sub>h</sub>.
          Includes Manning and Darcy-Weisbach equivalents.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 rounded">
          Open Channel Flow · Hydraulics
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Mode */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Solve for:</p>
          <div className="flex gap-2">
            {(Object.keys(modeLabels) as ChezyMode[]).map(m => (
              <ModeBtn key={m} label={modeLabels[m]} active={mode === m} onClick={() => setMode(m)} />
            ))}
          </div>
        </div>

        {/* Hydraulic radius — geometry selector */}
        {mode !== "findR" && (
          <div className="mb-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              R<sub>h</sub> input method:
            </p>
            <div className="flex gap-2 flex-wrap mb-3">
              {(["manual","rectangular","trapezoidal","circular"] as GeomType[]).map(g => (
                <Btn key={g} label={g.charAt(0).toUpperCase() + g.slice(1)}
                  active={geomType === g} onClick={() => setGeomType(g)} />
              ))}
              {geomType !== "manual" && (
                <div className="flex gap-1">
                  {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                    <Btn key={u} label={u} active={geomUnit === u} onClick={() => {
                      const conv = (v: string) => { const r = parseFloat(v); return isNaN(r) ? v : parseFloat((r * toLm[geomUnit] / toLm[u]).toPrecision(6)).toString(); };
                      setB(conv(b)); setY(conv(y)); setD(conv(D)); setGeomUnit(u);
                    }} />
                  ))}
                </div>
              )}
            </div>

            {geomType === "manual" && (
              <div className="max-w-xs">
                <InputField label="Hydraulic radius" symbol="Rh" unit="m"
                  value={Rh} onChange={setRh} error={errors.Rh} />
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                  R<sub>h</sub> = A / P  (cross-section area / wetted perimeter)
                </p>
              </div>
            )}
            {(geomType === "rectangular" || geomType === "trapezoidal") && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputField label="Bottom width" symbol="b" unit={geomUnit}
                  value={b} onChange={setB} />
                <InputField label="Flow depth" symbol="y" unit={geomUnit}
                  value={y} onChange={setY} />
                {geomType === "trapezoidal" && (
                  <InputField label="Side slope (H:V)" symbol="z" unit="dimensionless"
                    value={z} onChange={setZ} />
                )}
              </div>
            )}
            {geomType === "circular" && (
              <div className="max-w-xs">
                <InputField label="Diameter (full pipe)" symbol="D" unit={geomUnit}
                  value={D} onChange={setD} />
              </div>
            )}
            {geomType !== "manual" && derivedR !== null && (
              <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-mono">
                R<sub>h</sub> = {fmt(derivedR, 5)} m
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Chezy C — shown unless finding C */}
          {mode !== "findC" && (
            <div>
              <InputField label="Chézy coefficient" symbol="C" unit="m^(1/2)/s"
                value={derivedC ? derivedC.toFixed(4) : C}
                onChange={derivedC ? () => {} : setC}
                error={errors.C} />
              {!showManning && (
                <div className="flex items-center gap-2 -mt-2">
                  <select onChange={(e) => { const p = C_PRESETS.find(x => x.label === e.target.value); if (p) setC(p.C); }}
                    className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">C preset…</option>
                    {C_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label} — C = {p.C}</option>)}
                  </select>
                </div>
              )}
              {derivedC && (
                <p className="text-xs text-blue-600 dark:text-blue-400 -mt-1 font-mono">
                  C = R<sub>h</sub><sup>1/6</sup>/n = {fmt(derivedC, 5)} m<sup>1/2</sup>/s
                </p>
              )}
            </div>
          )}

          {/* V — shown unless finding V */}
          {mode !== "findV" && (
            <div>
              <InputField label="Flow velocity" symbol="V" unit={velUnit}
                value={V} onChange={setV}
                placeholder={velUnit === "m/s" ? "1.5" : "4.9"}
                error={errors.V} />
              <div className="flex gap-2 -mt-2">
                {(["m/s","ft/s"] as VelUnit[]).map(u => (
                  <Btn key={u} label={u} active={velUnit === u} onClick={() => {
                    const raw = parseFloat(V);
                    if (!isNaN(raw)) setV(parseFloat((raw * toVSI[velUnit] / toVSI[u]).toPrecision(6)).toString());
                    setVelUnit(u);
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* S — shown unless finding S */}
          {mode !== "findS" && (
            <div>
              <InputField label="Channel slope" symbol="S" unit={slopeUnit}
                value={S} onChange={setS}
                placeholder={slopeUnit === "%" ? "0.1" : "0.001"}
                error={errors.S} />
              <div className="flex gap-2 -mt-2">
                {(["m/m","%","ft/ft"] as SlopeUnit[]).map(u => (
                  <Btn key={u} label={u} active={slopeUnit === u} onClick={() => {
                    const raw = parseFloat(S);
                    if (!isNaN(raw)) setS(parseFloat((raw * toSlope[slopeUnit] / toSlope[u]).toPrecision(6)).toString());
                    setSlopeUnit(u);
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* R_h — shown only for findR */}
          {mode === "findR" && (
            <div className="md:col-span-2 text-xs text-gray-500 dark:text-gray-400 italic">
              R<sub>h</sub> will be computed from V, C, and S.
            </div>
          )}
        </div>

        {/* C from Manning's n */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="showManning" checked={showManning}
              onChange={(e) => setShowManning(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="showManning" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Derive C from Manning's n — C = R<sub>h</sub><sup>1/6</sup> / n
            </label>
          </div>
          {showManning && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
              <div>
                <InputField label="Manning's roughness" symbol="n" unit="dimensionless"
                  value={manN} onChange={setManN} />
              </div>
              <div className="flex items-end pb-1">
                <select onChange={(e) => { if (e.target.value) setManN(e.target.value); }}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">n preset…</option>
                  {N_PRESETS.map(p => <option key={p.label} value={p.n}>{p.label}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Optional A for Q */}
        <div className="mt-4 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="showA" checked={showA}
              onChange={(e) => setShowA(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="showA" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Also compute Q = V × A — enter cross-section area
            </label>
          </div>
          {showA && (
            <div className="max-w-xs">
              <InputField label="Cross-section area" symbol="A" unit={areaUnit}
                value={areaStr} onChange={setAreaStr} error={errors.area} />
              <div className="flex gap-2 -mt-2">
                {(["m²","ft²"] as ("m²"|"ft²")[]).map(u => (
                  <Btn key={u} label={u} active={areaUnit === u} onClick={() => {
                    const toA: Record<"m²"|"ft²", number> = { "m²": 1, "ft²": 0.0929 };
                    const raw = parseFloat(areaStr);
                    if (!isNaN(raw)) setAreaStr(parseFloat((raw * toA[areaUnit] / toA[u]).toPrecision(6)).toString());
                    setAreaUnit(u);
                  }} />
                ))}
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
                {mode === "findV" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Flow velocity  V = C × √(R<sub>h</sub> × S)
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      V = {fmt(result.velocity, 5)} m/s
                    </p>
                  </>
                )}
                {mode === "findC" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Chézy coefficient  C = V / √(R<sub>h</sub> × S)
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      C = {fmt(result.chezyC, 5)} m<sup>1/2</sup>/s
                    </p>
                  </>
                )}
                {mode === "findS" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Channel slope  S = V² / (C² × R<sub>h</sub>)
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      S = {fmt(result.slope, 5)}
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      = {fmt(result.slope * 100, 4)} %
                    </p>
                  </>
                )}
                {mode === "findR" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Hydraulic radius  R<sub>h</sub> = V² / (C² × S)
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      R<sub>h</sub> = {fmt(result.hydraulicRadius, 5)} m
                    </p>
                  </>
                )}
                {result.flowRate !== undefined && (
                  <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                    Q = {fmt(result.flowRate, 5)} m³/s
                  </p>
                )}
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Chézy flow quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "V [m/s]",                    value: fmt(result.velocity,        5) },
                    { label: <span>C [m<sup>1/2</sup>/s]</span>, value: fmt(result.chezyC,   5) },
                    { label: <span>R<sub>h</sub> [m]</span>,     value: fmt(result.hydraulicRadius, 5) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "S [m/m]",        value: fmt(result.slope,         5) },
                    { label: "n (Manning equiv)", value: fmt(result.manningEquiv, 5) },
                    { label: "f (Darcy equiv)", value: fmt(result.darcyEquiv,    5) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Froude banner */}
              <div className={`p-4 rounded-lg border ${froudeBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {Fr < 0.99
                    ? <>Subcritical flow — Fr = {fmt(Fr, 4)} &lt; 1</>
                    : Fr > 1.01
                    ? <>Supercritical flow — Fr = {fmt(Fr, 4)} &gt; 1</>
                    : <>Critical flow — Fr = {fmt(Fr, 4)} ≈ 1</>}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.chezyEquation} />
              <CommonMistakes mistakes={commonMistakes.chezyEquation} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Chézy's equation and derived forms:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>V = C × √(R<sub>h</sub> × S)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[m/s]</div>
              <div>Q = C × A × √(R<sub>h</sub> × S)&nbsp;&nbsp;[m³/s]</div>
              <div>S = V² / (C² × R<sub>h</sub>)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[m/m]</div>
              <div>R<sub>h</sub> = V² / (C² × S)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[m]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Relationships to other friction representations:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Manning–Chézy:&nbsp;&nbsp;C = R<sub>h</sub><sup>1/6</sup> / n&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[SI, m<sup>1/2</sup>/s]</div>
              <div>Darcy–Chézy:&nbsp;&nbsp;&nbsp;&nbsp;C = √(8g / f)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[f = Darcy-Weisbach]</div>
              <div>Bazin (1865):&nbsp;&nbsp;&nbsp;&nbsp;C = 87 / (1 + γ/√R<sub>h</sub>)&nbsp;&nbsp;[γ = Bazin roughness]</div>
            </div>
            <p className="mt-1">
              Because C = R<sub>h</sub><sup>1/6</sup>/n depends on depth, the Manning form
              (with constant n) is more convenient than Chézy for variable-depth calculations.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Typical Chézy C values (SI, m<sup>1/2</sup>/s):</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Channel surface</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">C</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Manning n equiv</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { s: "Smooth concrete flume",          c: "60–90",  n: "0.011–0.015" },
                  { s: "Lined concrete channel",         c: "55–75",  n: "0.013–0.018" },
                  { s: "Unlined earth, good condition",  c: "45–65",  n: "0.018–0.025" },
                  { s: "Natural channel, clean",         c: "30–55",  n: "0.025–0.040" },
                  { s: "Rough/rocky channel",            c: "20–35",  n: "0.040–0.060" },
                ].map(({ s, c, n }) => (
                  <tr key={s}>
                    <td className="py-1.5 pr-4">{s}</td>
                    <td className="py-1.5 pr-4 font-mono">{c}</td>
                    <td className="py-1.5 font-mono">{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Historical note:</p>
            <p>
              Antoine de Chézy derived this formula in 1769 from measurements on the Seine and
              Canal de l'Yvette. It predates Manning's equation (1891) and Darcy-Weisbach (1845).
              All three are equivalent for fully turbulent flow; the preference today is Manning's
              n because n is more nearly constant across depth changes than C.
            </p>
          </div>
        </div>
      </Card>

      <References refs={REFS_CHEZY_EQUATION} />
    </div>
  );
}
