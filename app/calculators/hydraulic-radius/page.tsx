"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_HYDRAULIC_RADIUS } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateHydraulicRadius,
  generateHydraulicRadiusSteps,
  commonAssumptions,
  commonMistakes,
  type HydraulicRadiusShape,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit  = "m" | "mm" | "cm" | "ft";
type AreaUnit = "m²" | "mm²" | "ft²";

const toLm:  Record<LenUnit,  number> = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048 };
const toAm:  Record<AreaUnit, number> = { "m²": 1, "mm²": 1e-6, "ft²": 0.0929 };

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

const SHAPE_LABELS: Record<HydraulicRadiusShape, string> = {
  manual:           "Manual",
  rectangular:      "Rectangular",
  trapezoidal:      "Trapezoidal",
  circular_full:    "Circular (full)",
  circular_partial: "Circular (partial)",
};

export default function HydraulicRadiusCalculator() {
  const [shape,     setShape]    = useState<HydraulicRadiusShape>("rectangular");
  const [lenUnit,   setLenUnit]  = useState<LenUnit>("m");

  // Manual inputs
  const [A,         setA]        = useState("5.0");
  const [P,         setP]        = useState("8.0");
  const [T,         setT]        = useState("");
  const [areaUnit,  setAreaUnit] = useState<AreaUnit>("m²");

  // Rectangular / Trapezoidal inputs
  const [b,         setB]        = useState("3.0");
  const [y,         setY]        = useState("1.0");
  const [z,         setZ]        = useState("1.5");

  // Circular inputs
  const [D,         setD]        = useState("1.2");
  const [yFill,     setYFill]    = useState("0.9");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateHydraulicRadius> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateHydraulicRadiusSteps> | null>(null);

  const handleClear = () => {
    setShape("rectangular");
    setLenUnit("m");
    setA("");
    setP("");
    setT("");
    setAreaUnit("m²");
    setB("");
    setY("");
    setZ("");
    setD("");
    setYFill("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const lU = toLm[lenUnit];

    let input: Parameters<typeof calculateHydraulicRadius>[0];

    if (shape === "manual") {
      const ASI = parseFloat(A) * toAm[areaUnit];
      const PSI = parseFloat(P) * lU;
      const TSI = T ? parseFloat(T) * lU : undefined;
      if (isNaN(ASI) || ASI <= 0) newErrors.A = "Must be a positive number";
      if (isNaN(PSI) || PSI <= 0) newErrors.P = "Must be a positive number";
      if (T && (isNaN(TSI!) || TSI! <= 0)) newErrors.T = "Must be a positive number";
      input = { shape, area: ASI, wettedPerimeter: PSI, topWidth: TSI };

    } else if (shape === "rectangular") {
      const bSI = parseFloat(b) * lU;
      const ySI = parseFloat(y) * lU;
      if (isNaN(bSI) || bSI <= 0) newErrors.b = "Must be a positive number";
      if (isNaN(ySI) || ySI <= 0) newErrors.y = "Must be a positive number";
      input = { shape, bottomWidth: bSI, depth: ySI };

    } else if (shape === "trapezoidal") {
      const bSI = parseFloat(b) * lU;
      const ySI = parseFloat(y) * lU;
      const zV  = parseFloat(z);
      if (isNaN(bSI) || bSI <= 0) newErrors.b = "Must be a positive number";
      if (isNaN(ySI) || ySI <= 0) newErrors.y = "Must be a positive number";
      if (isNaN(zV)  || zV  <  0) newErrors.z = "Must be ≥ 0";
      input = { shape, bottomWidth: bSI, depth: ySI, sideSlope: zV };

    } else if (shape === "circular_full") {
      const DSI = parseFloat(D) * lU;
      if (isNaN(DSI) || DSI <= 0) newErrors.D = "Must be a positive number";
      input = { shape, diameter: DSI };

    } else {
      const DSI    = parseFloat(D)     * lU;
      const yFillSI= parseFloat(yFill) * lU;
      if (isNaN(DSI)     || DSI     <= 0) newErrors.D     = "Must be a positive number";
      if (isNaN(yFillSI) || yFillSI <= 0) newErrors.yFill = "Must be a positive number";
      if (!isNaN(DSI) && !isNaN(yFillSI) && yFillSI > DSI)
        newErrors.yFill = "Fill depth must be ≤ diameter";
      input = { shape, diameter: DSI, fillDepth: yFillSI };
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const calc = calculateHydraulicRadius(input);
      const stp  = generateHydraulicRadiusSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Hydraulic Radius Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          R<sub>h</sub> = A/P — cross-section area divided by wetted perimeter.
          Computes R<sub>h</sub>, hydraulic diameter D<sub>h</sub> = 4R<sub>h</sub>, and hydraulic
          depth D = A/T for rectangular, trapezoidal, full-pipe, and partially-filled circular sections.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 rounded">
          Open Channel Flow · Pipe Flow
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Shape selector */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Cross-section shape:</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SHAPE_LABELS) as HydraulicRadiusShape[]).map(s => (
              <ModeBtn key={s} label={SHAPE_LABELS[s]} active={shape === s} onClick={() => setShape(s)} />
            ))}
          </div>
        </div>

        {/* Length unit toggle */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Length units:</p>
          <div className="flex gap-2">
            {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
              <Btn key={u} label={u} active={lenUnit === u} onClick={() => {
                const conv = (v: string) => { const r = parseFloat(v); return isNaN(r) ? v : parseFloat((r * toLm[lenUnit] / toLm[u]).toPrecision(6)).toString(); };
                setB(conv(b)); setY(conv(y)); setD(conv(D)); setYFill(conv(yFill));
                setP(conv(P)); setT(conv(T));
                setLenUnit(u);
              }} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── Manual ── */}
          {shape === "manual" && (
            <>
              <div>
                <InputField label="Cross-section area" symbol="A" unit={areaUnit}
                  value={A} onChange={setA} error={errors.A} />
                <div className="flex gap-2 -mt-2">
                  {(["m²","mm²","ft²"] as AreaUnit[]).map(u => (
                    <Btn key={u} label={u} active={areaUnit === u} onClick={() => {
                      const raw = parseFloat(A);
                      if (!isNaN(raw)) setA(parseFloat((raw * toAm[areaUnit] / toAm[u]).toPrecision(6)).toString());
                      setAreaUnit(u);
                    }} />
                  ))}
                </div>
              </div>
              <div>
                <InputField label="Wetted perimeter" symbol="P" unit={lenUnit}
                  value={P} onChange={setP} error={errors.P} />
              </div>
              <div>
                <InputField label="Top width (optional)" symbol="T" unit={lenUnit}
                  value={T} onChange={setT} error={errors.T} />
              </div>
            </>
          )}

          {/* ── Rectangular ── */}
          {shape === "rectangular" && (
            <>
              <div>
                <InputField label="Bottom width" symbol="b" unit={lenUnit}
                  value={b} onChange={setB}
                  placeholder={lenUnit === "m" ? "3.0" : lenUnit === "mm" ? "3000" : "300"}
                  error={errors.b} />
              </div>
              <div>
                <InputField label="Flow depth" symbol="y" unit={lenUnit}
                  value={y} onChange={setY}
                  placeholder={lenUnit === "m" ? "1.0" : "1000"}
                  error={errors.y} />
              </div>
            </>
          )}

          {/* ── Trapezoidal ── */}
          {shape === "trapezoidal" && (
            <>
              <div>
                <InputField label="Bottom width" symbol="b" unit={lenUnit}
                  value={b} onChange={setB}
                  placeholder={lenUnit === "m" ? "3.0" : "3000"}
                  error={errors.b} />
              </div>
              <div>
                <InputField label="Flow depth" symbol="y" unit={lenUnit}
                  value={y} onChange={setY}
                  placeholder={lenUnit === "m" ? "1.0" : "1000"}
                  error={errors.y} />
              </div>
              <div>
                <InputField label="Side slope H:V" symbol="z" unit="dimensionless"
                  value={z} onChange={setZ} error={errors.z} />
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                  z = horizontal / vertical · z = 0 for vertical walls
                </p>
              </div>
            </>
          )}

          {/* ── Circular full ── */}
          {shape === "circular_full" && (
            <div>
              <InputField label="Pipe diameter" symbol="D" unit={lenUnit}
                value={D} onChange={setD}
                placeholder={lenUnit === "m" ? "1.2" : "1200"}
                error={errors.D} />
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                Full pipe: R<sub>h</sub> = D/4 exactly
              </p>
            </div>
          )}

          {/* ── Circular partial ── */}
          {shape === "circular_partial" && (
            <>
              <div>
                <InputField label="Pipe diameter" symbol="D" unit={lenUnit}
                  value={D} onChange={setD}
                  placeholder={lenUnit === "m" ? "1.2" : "1200"}
                  error={errors.D} />
              </div>
              <div>
                <InputField label="Fill depth (water depth)" symbol="y" unit={lenUnit}
                  value={yFill} onChange={setYFill}
                  placeholder={lenUnit === "m" ? "0.9" : "900"}
                  error={errors.yFill} />
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                  y must be ≤ D · at y = D gives full-pipe values
                </p>
              </div>
            </>
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
        const hasT = !isNaN(result.topWidth) && result.topWidth > 0;
        const hasD = !isNaN(result.hydraulicDepth);
        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Hydraulic radius  R<sub>h</sub> = A / P
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  R<sub>h</sub> = {fmt(result.hydraulicRadius, 5)} m
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  D<sub>h</sub> = 4R<sub>h</sub> = {fmt(result.hydraulicDiameter, 5)} m
                  {hasD && <> &nbsp;·&nbsp; D = A/T = {fmt(result.hydraulicDepth, 5)} m</>}
                </p>
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Cross-section geometry
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: <span>R<sub>h</sub> [m]</span>,  value: fmt(result.hydraulicRadius,   6) },
                    { label: <span>D<sub>h</sub> [m]</span>,  value: fmt(result.hydraulicDiameter, 6) },
                    { label: "A [m²]",                        value: fmt(result.area,               5) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">P [m]</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(result.wettedPerimeter, 5)}
                    </p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">T [m]</p>
                    <p className={`font-mono text-sm font-semibold ${hasT ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
                      {hasT ? fmt(result.topWidth, 5) : "—"}
                    </p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      D = A/T [m]
                    </p>
                    <p className={`font-mono text-sm font-semibold ${hasD ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
                      {hasD ? fmt(result.hydraulicDepth, 5) : "—"}
                    </p>
                  </div>
                </div>
                {result.fillRatio !== undefined && (
                  <div className="border-t border-gray-200 dark:border-gray-600 px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Fill ratio y/D</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(result.fillRatio, 4)} ({fmt(result.fillRatio * 100, 3)}%)
                    </p>
                  </div>
                )}
              </div>

              {/* Interpretation */}
              <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {SHAPE_LABELS[shape]} cross-section
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.hydraulicRadius} />
              <CommonMistakes mistakes={commonMistakes.hydraulicRadius} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Definitions:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>R<sub>h</sub> = A / P&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[m]&nbsp; hydraulic radius (Manning, Chézy)</div>
              <div>D<sub>h</sub> = 4A / P = 4R<sub>h</sub>&nbsp;&nbsp;[m]&nbsp; hydraulic diameter (pipe-flow Re)</div>
              <div>D&nbsp;&nbsp; = A / T&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[m]&nbsp; hydraulic depth (Froude number)</div>
              <div>T&nbsp;&nbsp; = dA/dy&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[m]&nbsp; top width (free surface width)</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Channel geometry formulas:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">Shape</th>
                  <th className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">A</th>
                  <th className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">P</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">T</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { s: "Rectangular", A: "b × y", P: "b + 2y", T: "b" },
                  { s: "Trapezoidal", A: "(b + zy)y", P: "b + 2y√(1+z²)", T: "b + 2zy" },
                  { s: "Circular (full)", A: "πD²/4", P: "πD", T: "0 (closed)" },
                  { s: "Circular (partial)", A: "(D²/8)(θ−sinθ)", P: "Dθ/2", T: "D sin(θ/2)" },
                  { s: "Wide/shallow (b >> y)", A: "≈ b × y", P: "≈ b", T: "b" },
                ].map(({ s, A, P, T }) => (
                  <tr key={s}>
                    <td className="py-1.5 pr-3">{s}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs">{A}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs">{P}</td>
                    <td className="py-1.5 font-mono text-xs">{T}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              θ = 2 × arccos(1 − 2y/D) for circular partial fill.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Where R<sub>h</sub> and D<sub>h</sub> appear:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Manning:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;V = (1/n) × R<sub>h</sub><sup>2/3</sup> × S<sup>1/2</sup></div>
              <div>Chézy:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;V = C × √(R<sub>h</sub> × S)</div>
              <div>Pipe Re:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Re = ρ V D<sub>h</sub> / μ&nbsp;&nbsp;&nbsp;&nbsp;(uses D<sub>h</sub> not R<sub>h</sub>)</div>
              <div>Froude:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Fr = V / √(g × D)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(uses hydraulic depth D)</div>
            </div>
          </div>
        </div>
      </Card>

      <References refs={REFS_HYDRAULIC_RADIUS} />
    </div>
  );
}
