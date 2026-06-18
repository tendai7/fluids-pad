"use client";

import React, { useState, useMemo } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_MANNINGS } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateManningsEquation,
  generateManningsEquationSteps,
  commonAssumptions,
  commonMistakes,
  type ManningsMode,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit  = "m" | "mm" | "cm" | "ft";
type SlopeUnit = "m/m" | "%" | "ft/ft";
type AreaUnit  = "m²" | "ft²";
type GeomType  = "manual" | "rectangular" | "trapezoidal" | "circular";

const toLm: Record<LenUnit, number> = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048 };
const toSlope: Record<SlopeUnit, number> = { "m/m": 1, "%": 0.01, "ft/ft": 1 };

// Manning's n presets grouped by category
const N_PRESETS = [
  { group: "Natural channels — minor streams",
    items: [
      { label: "Clean, straight, full stage",                   n: "0.030" },
      { label: "Clean, winding, some weeds",                    n: "0.035" },
      { label: "Sluggish, weedy, deep pools",                   n: "0.070" },
      { label: "Very weedy, slow, deep pools",                  n: "0.100" },
    ]},
  { group: "Natural channels — floodplains",
    items: [
      { label: "Pasture, no brush",                             n: "0.035" },
      { label: "Heavy stand of timber, few down trees",         n: "0.120" },
      { label: "Dense willows, straight",                       n: "0.150" },
    ]},
  { group: "Excavated / dredged channels",
    items: [
      { label: "Earth, straight and uniform",                   n: "0.022" },
      { label: "Earth, winding and sluggish",                   n: "0.030" },
      { label: "Rock cuts, smooth",                             n: "0.025" },
      { label: "Rock cuts, jagged and irregular",               n: "0.040" },
      { label: "Channels with gravel bottom",                   n: "0.025" },
    ]},
  { group: "Lined channels",
    items: [
      { label: "Concrete, trowel finish",                       n: "0.012" },
      { label: "Concrete, float finish",                        n: "0.015" },
      { label: "Concrete, unfinished",                          n: "0.017" },
      { label: "Asphalt, smooth",                               n: "0.013" },
      { label: "Brick, in cement mortar",                       n: "0.015" },
      { label: "Rubble masonry",                                n: "0.025" },
      { label: "Corrugated metal",                              n: "0.022" },
    ]},
  { group: "Closed conduits (pipe-flow, partly full)",
    items: [
      { label: "Concrete pipe, straight",                       n: "0.013" },
      { label: "Cast-iron pipe, uncoated",                      n: "0.014" },
      { label: "Steel pipe, spiral weld",                       n: "0.013" },
      { label: "Plastic pipe (smooth)",                         n: "0.011" },
      { label: "Corrugated metal pipe",                         n: "0.024" },
    ]},
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
        ? "bg-blue-600 text-white"
        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
      {label}
    </button>
  );
}

// ── channel geometry helpers ────────────────────────────────────────────────
function rectGeom(b: number, y: number) {
  const A = b * y; const P = b + 2 * y;
  return { A, P, R: A / P };
}
function trapGeom(b: number, y: number, z: number) {
  const A = (b + z * y) * y; const P = b + 2 * y * Math.sqrt(1 + z * z);
  return { A, P, R: A / P };
}
function circGeom(D: number) {
  const A = Math.PI * D * D / 4; const P = Math.PI * D;
  return { A, P, R: D / 4 };
}

export default function ManningsEquationCalculator() {
  const [mode,      setMode]      = useState<ManningsMode>("findV");
  const [geomType,  setGeomType]  = useState<GeomType>("rectangular");

  // Channel geometry inputs
  const [b,         setB]         = useState("3.0");     // base width / diameter
  const [y,         setY]         = useState("1.2");     // depth
  const [z,         setZ]         = useState("1.5");     // side slope
  const [geomUnit,  setGeomUnit]  = useState<LenUnit>("m");

  // Manual R / A inputs
  const [Rh,        setRh]        = useState("0.80");
  const [A,         setA]         = useState("3.60");
  const [areaUnit,  setAreaUnit]  = useState<AreaUnit>("m²");

  // Common inputs
  const [n,         setN]         = useState("0.022");
  const [V,         setV]         = useState("1.5");
  const [S,         setS]         = useState("0.001");
  const [slopeUnit, setSlopeUnit] = useState<SlopeUnit>("m/m");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateManningsEquation> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateManningsEquationSteps> | null>(null);

  // Derived R_h and A from geometry
  const derived = useMemo(() => {
    const gU = toLm[geomUnit];
    const bSI = parseFloat(b) * gU;
    const ySI = parseFloat(y) * gU;
    const zVal= parseFloat(z);
    const DSI = parseFloat(b) * gU;  // diameter = b for circular
    if (isNaN(bSI) || bSI <= 0) return null;
    if (geomType === "rectangular") {
      if (isNaN(ySI) || ySI <= 0) return null;
      return rectGeom(bSI, ySI);
    }
    if (geomType === "trapezoidal") {
      if (isNaN(ySI) || ySI <= 0 || isNaN(zVal) || zVal < 0) return null;
      return trapGeom(bSI, ySI, zVal);
    }
    if (geomType === "circular") {
      return circGeom(DSI);
    }
    return null;
  }, [geomType, b, y, z, geomUnit]);

  const handleClear = () => {
    setMode("findV");
    setGeomType("rectangular");
    setB("");
    setY("");
    setZ("");
    setGeomUnit("m");
    setRh("");
    setA("");
    setAreaUnit("m²");
    setN("");
    setV("");
    setS("");
    setSlopeUnit("m/m");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const nVal = parseFloat(n);
    const VVal = parseFloat(V);
    const SSI  = parseFloat(S) * toSlope[slopeUnit];

    if (mode !== "findN" && (isNaN(nVal) || nVal <= 0)) newErrors.n = "Must be a positive number";
    if (mode !== "findV" && (isNaN(VVal) || VVal <= 0)) newErrors.V = "Must be a positive number";
    if (mode !== "findS" && (isNaN(SSI)  || SSI  <= 0)) newErrors.S = "Must be a positive number";

    let RhSI: number, ASI: number, ySI: number | undefined;
    if (geomType === "manual") {
      RhSI = parseFloat(Rh);
      ASI  = parseFloat(A) * (areaUnit === "m²" ? 1 : 0.0929);
      if (mode !== "findRh" && (isNaN(RhSI) || RhSI <= 0)) newErrors.Rh = "Must be a positive number";
      if (isNaN(ASI)  || ASI  <= 0) newErrors.A = "Required for Q";
      ySI = undefined;
    } else {
      if (!derived) { newErrors.geom = "Check geometry inputs"; }
      RhSI = derived?.R ?? 0;
      ASI  = derived?.A ?? 0;
      ySI  = geomType !== "circular" ? parseFloat(y) * toLm[geomUnit] : parseFloat(b) * toLm[geomUnit] / 2;
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        mode,
        manningN:       (mode !== "findN")  ? nVal  : undefined,
        velocity:       (mode !== "findV")  ? VVal  : undefined,
        slope:          (mode !== "findS")  ? SSI   : undefined,
        hydraulicRadius:(mode !== "findRh") ? RhSI  : undefined,
        area:           ASI > 0 ? ASI : undefined,
        depth:          ySI && ySI > 0 ? ySI : undefined,
      };
      const calc = calculateManningsEquation(input as Parameters<typeof calculateManningsEquation>[0]);
      const stp  = generateManningsEquationSteps(input as Parameters<typeof calculateManningsEquation>[0], calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const Fr = result?.froudeNumber;
  const froudeBg =
    !Fr ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
    : Fr < 0.95 ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
    : Fr > 1.05 ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
    : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Manning's Equation Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          V = (1/n) × R<sub>h</sub><sup>2/3</sup> × S<sup>1/2</sup> — uniform open-channel flow.
          Solve for velocity, slope, roughness, or hydraulic radius with built-in channel geometry
          presets and Manning's n tables.
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
            <ModeBtn label="Find V"   active={mode === "findV"}  onClick={() => setMode("findV")}  />
            <ModeBtn label={<>Find S</>}  active={mode === "findS"}  onClick={() => setMode("findS")}  />
            <ModeBtn label="Find n"   active={mode === "findN"}  onClick={() => setMode("findN")}  />
            <ModeBtn label={<>Find R<sub>h</sub></>} active={mode === "findRh"} onClick={() => setMode("findRh")} />
          </div>
        </div>

        {/* Channel geometry */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Channel cross-section:</p>
          <div className="flex gap-2 flex-wrap">
            {(["manual","rectangular","trapezoidal","circular"] as GeomType[]).map(g => (
              <Btn key={g} label={g.charAt(0).toUpperCase() + g.slice(1)}
                active={geomType === g} onClick={() => setGeomType(g)} />
            ))}
          </div>
          {geomType !== "manual" && (
            <div className="mt-2 flex flex-wrap gap-2">
              {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                <Btn key={u} label={u} active={geomUnit === u} onClick={() => {
                  const conv = (v: string) => { const r = parseFloat(v); return isNaN(r) ? v : parseFloat((r * toLm[geomUnit] / toLm[u]).toPrecision(6)).toString(); };
                  setB(conv(b)); setY(conv(y)); setGeomUnit(u);
                }} />
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Geometry inputs */}
          {geomType === "manual" ? (
            <>
              {mode !== "findRh" && (
                <div>
                  <InputField label="Hydraulic radius" symbol="Rh" unit="m"
                    value={Rh} onChange={setRh} error={errors.Rh} />
                  <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                    R<sub>h</sub> = A / P  (cross-section area / wetted perimeter)
                  </p>
                </div>
              )}
              <div>
                <InputField label="Cross-section area" symbol="A" unit={areaUnit}
                  value={A} onChange={setA} error={errors.A} />
                <div className="flex gap-2 -mt-2">
                  {(["m²","ft²"] as AreaUnit[]).map(u => (
                    <Btn key={u} label={u} active={areaUnit === u} onClick={() => {
                      const toM2: Record<AreaUnit, number> = { "m²": 1, "ft²": 0.0929 };
                      const raw = parseFloat(A);
                      if (!isNaN(raw)) setA(parseFloat((raw * toM2[areaUnit] / toM2[u]).toPrecision(6)).toString());
                      setAreaUnit(u);
                    }} />
                  ))}
                </div>
              </div>
            </>
          ) : geomType === "rectangular" ? (
            <>
              <div>
                <InputField label="Bottom width" symbol="b" unit={geomUnit}
                  value={b} onChange={setB} error={errors.geom} />
              </div>
              <div>
                <InputField label="Flow depth" symbol="y" unit={geomUnit}
                  value={y} onChange={setY} />
              </div>
            </>
          ) : geomType === "trapezoidal" ? (
            <>
              <div>
                <InputField label="Bottom width" symbol="b" unit={geomUnit}
                  value={b} onChange={setB} error={errors.geom} />
              </div>
              <div>
                <InputField label="Flow depth" symbol="y" unit={geomUnit}
                  value={y} onChange={setY} />
              </div>
              <div>
                <InputField label="Side slope (H:V)" symbol="z" unit="dimensionless"
                  value={z} onChange={setZ} />
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                  z = horizontal / vertical · z = 0 for vertical walls
                </p>
              </div>
            </>
          ) : (
            <div>
              <InputField label="Pipe / channel diameter" symbol="D" unit={geomUnit}
                value={b} onChange={setB} error={errors.geom} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                Full-pipe flow: A = πD²/4, P = πD, R = D/4
              </p>
            </div>
          )}

          {/* Derived geometry display */}
          {geomType !== "manual" && derived && (
            <div className="md:col-span-1 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Computed geometry:</p>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                {[
                  { l: <span>A [m²]</span>,  v: fmt(derived.A, 4) },
                  { l: <span>P [m]</span>,   v: fmt(derived.P, 4) },
                  { l: <span>R<sub>h</sub> [m]</span>, v: fmt(derived.R, 4) },
                ].map(({ l, v }, i) => (
                  <div key={i}>
                    <p className="text-gray-500 dark:text-gray-400">{l}</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manning's n — shown when not finding n */}
          {mode !== "findN" && (
            <div>
              <InputField label="Manning's roughness coefficient" symbol="n" unit="dimensionless"
                value={n} onChange={setN} error={errors.n} />
              <div className="mt-1">
                <select
                  onChange={(e) => {
                    if (e.target.value) setN(e.target.value);
                  }}
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Manning's n preset…</option>
                  {N_PRESETS.map(g => (
                    <optgroup key={g.group} label={g.group}>
                      {g.items.map(p => (
                        <option key={p.label} value={p.n}>{p.label} — n = {p.n}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Velocity — shown when not finding V */}
          {mode !== "findV" && (
            <div>
              <InputField label="Flow velocity" symbol="V" unit="m/s"
                value={V} onChange={setV} error={errors.V} />
            </div>
          )}

          {/* Slope — shown when not finding S */}
          {mode !== "findS" && (
            <div>
              <InputField label="Channel slope" symbol="S" unit={slopeUnit}
                value={S} onChange={setS}
                placeholder={slopeUnit === "%" ? "0.1" : "0.001"}
                error={errors.S} />
              <div className="flex gap-2 -mt-2">
                {(["m/m", "%", "ft/ft"] as SlopeUnit[]).map(u => (
                  <Btn key={u} label={u} active={slopeUnit === u} onClick={() => {
                    const raw = parseFloat(S);
                    if (!isNaN(raw)) setS(parseFloat((raw * toSlope[slopeUnit] / toSlope[u]).toPrecision(6)).toString());
                    setSlopeUnit(u);
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
                      Flow velocity  V = (1/n) × R<sub>h</sub><sup>2/3</sup> × S<sup>1/2</sup>
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      V = {fmt(result.velocity, 5)} m/s
                    </p>
                  </>
                )}
                {mode === "findS" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Required slope  S = (nV / R<sub>h</sub><sup>2/3</sup>)<sup>2</sup>
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      S = {fmt(result.slope, 5)}
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      = {fmt(result.slope * 100, 4)} %  = 1 : {fmt(1 / result.slope, 4)}
                    </p>
                  </>
                )}
                {mode === "findN" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Manning's roughness  n = R<sub>h</sub><sup>2/3</sup> × S<sup>1/2</sup> / V
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      n = {fmt(result.manningN, 5)}
                    </p>
                  </>
                )}
                {mode === "findRh" && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Hydraulic radius  R<sub>h</sub> = (nV / S<sup>1/2</sup>)<sup>3/2</sup>
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      R<sub>h</sub> = {fmt(result.hydraulicRadius, 5)} m
                    </p>
                  </>
                )}
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Flow quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "V [m/s]",                value: fmt(result.velocity,       5) },
                    { label: <span>R<sub>h</sub> [m]</span>, value: fmt(result.hydraulicRadius, 5) },
                    { label: "S [m/m]",                value: fmt(result.slope,          5) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">n</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(result.manningN, 4)}
                    </p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Q [m³/s]</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {result.flowRate !== undefined ? fmt(result.flowRate, 5) : "—"}
                    </p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Fr</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {result.froudeNumber !== undefined ? fmt(result.froudeNumber, 4) : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Flow regime banner */}
              <div className={`p-4 rounded-lg border ${froudeBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {result.flowRegime
                    ? (Fr! < 0.95 ? `Subcritical flow — Fr = ${fmt(Fr!, 4)} < 1`
                      : Fr! > 1.05 ? `Supercritical flow — Fr = ${fmt(Fr!, 4)} > 1`
                      : `Critical flow — Fr = ${fmt(Fr!, 4)} ≈ 1`)
                    : "Froude number not computed (depth not provided by geometry)"}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.manningsEquation} />
              <CommonMistakes mistakes={commonMistakes.manningsEquation} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Manning's equation and derived forms:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>V = (1/n) × R<sub>h</sub><sup>2/3</sup> × S<sup>1/2</sup>&nbsp;&nbsp;&nbsp;&nbsp;[m/s]</div>
              <div>Q = V × A = (A/n) × R<sub>h</sub><sup>2/3</sup> × S<sup>1/2</sup>&nbsp;&nbsp;[m³/s]</div>
              <div>S = (n × V / R<sub>h</sub><sup>2/3</sup>)<sup>2</sup>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[m/m]</div>
              <div>n = R<sub>h</sub><sup>2/3</sup> × S<sup>1/2</sup> / V&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[dimensionless]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Hydraulic radius for common cross-sections:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Shape</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Area A</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">R<sub>h</sub> = A/P</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { s: "Rectangular",    A: "b × y",              R: "by / (b + 2y)" },
                  { s: "Trapezoidal",    A: "(b + zy) × y",       R: "(b+zy)y / (b + 2y√(1+z²))" },
                  { s: "Circular (full)",A: "πD²/4",              R: "D/4" },
                  { s: "Wide channel",   A: "b × y  (b >> y)",    R: "≈ y  (depth)" },
                ].map(({ s, A, R }) => (
                  <tr key={s}>
                    <td className="py-1.5 pr-4">{s}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{A}</td>
                    <td className="py-1.5 font-mono text-xs">{R}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Froude number and flow regime:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Fr = V / √(g × y)&nbsp;&nbsp;&nbsp;&nbsp;[dimensionless, y = flow depth]</div>
              <div>Fr &lt; 1&nbsp;&nbsp;subcritical — tranquil, controlled from downstream</div>
              <div>Fr = 1&nbsp;&nbsp;critical — maximum discharge for given energy</div>
              <div>Fr &gt; 1&nbsp;&nbsp;supercritical — rapid, controlled from upstream</div>
            </div>
          </div>
        </div>
      </Card>

      <References refs={REFS_MANNINGS} />
    </div>
  );
}
