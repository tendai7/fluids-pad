"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_WETTED_PERIMETER } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateWettedPerimeter,
  generateWettedPerimeterSteps,
  commonAssumptions,
  commonMistakes,
  type WettedPerimeterShape,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit = "m" | "mm" | "cm" | "ft";
const toLm: Record<LenUnit, number> = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048 };

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

function ShapeBtn({ label, active, onClick }: { label: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-2 text-sm font-medium rounded transition-colors ${active
        ? "bg-teal-600 text-white"
        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
      {label}
    </button>
  );
}

const SHAPE_LABELS: Record<WettedPerimeterShape, string> = {
  rectangular:      "Rectangular",
  trapezoidal:      "Trapezoidal",
  triangular:       "Triangular (V)",
  circular_full:    "Circular (full)",
  circular_partial: "Circular (partial)",
  semicircular:     "Semi-circular",
};

// Circular fill table rows (y/D → P/πD, A/A_full, R_h/(D/4))
function circFillRow(ratio: number) {
  const D = 1, y = ratio * D;
  if (y <= 0) return null;
  const theta = 2 * Math.acos(1 - 2 * y / D);
  const P  = D * theta / 2;
  const A  = (D * D / 8) * (theta - Math.sin(theta));
  const T  = D * Math.sin(theta / 2);
  const Rh = A / P;
  return { ratio, P, A, T, Rh };
}

export default function WettedPerimeterCalculator() {
  const [shape,    setShape]   = useState<WettedPerimeterShape>("rectangular");
  const [lenUnit,  setLenUnit] = useState<LenUnit>("m");

  // Rectangular / Trapezoidal
  const [b,   setB]  = useState("3.0");
  const [y,   setY]  = useState("1.0");
  const [z,   setZ]  = useState("1.5");
  // Triangular
  const [yt,  setYt] = useState("1.5");
  const [zt,  setZt] = useState("1.0");
  // Circular
  const [D,   setD]  = useState("1.2");
  const [yc,  setYc] = useState("0.9");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateWettedPerimeter> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateWettedPerimeterSteps> | null>(null);

  const handleClear = () => {
    setShape("rectangular");
    setLenUnit("m");
    setB("");
    setY("");
    setZ("");
    setYt("");
    setZt("");
    setD("");
    setYc("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const lU = toLm[lenUnit];

    let input: Parameters<typeof calculateWettedPerimeter>[0];

    if (shape === "rectangular") {
      const bSI = parseFloat(b) * lU, ySI = parseFloat(y) * lU;
      if (isNaN(bSI) || bSI <= 0) newErrors.b = "Must be positive";
      if (isNaN(ySI) || ySI <= 0) newErrors.y = "Must be positive";
      input = { shape, bottomWidth: bSI, depth: ySI };

    } else if (shape === "trapezoidal") {
      const bSI = parseFloat(b) * lU, ySI = parseFloat(y) * lU, zV = parseFloat(z);
      if (isNaN(bSI) || bSI <= 0) newErrors.b = "Must be positive";
      if (isNaN(ySI) || ySI <= 0) newErrors.y = "Must be positive";
      if (isNaN(zV)  || zV < 0)   newErrors.z = "Must be ≥ 0";
      input = { shape, bottomWidth: bSI, depth: ySI, sideSlope: zV };

    } else if (shape === "triangular") {
      const ySI = parseFloat(yt) * lU, zV = parseFloat(zt);
      if (isNaN(ySI) || ySI <= 0) newErrors.yt = "Must be positive";
      if (isNaN(zV)  || zV <= 0)  newErrors.zt = "Must be positive";
      input = { shape, depth: ySI, sideSlope: zV };

    } else if (shape === "circular_full") {
      const DSI = parseFloat(D) * lU;
      if (isNaN(DSI) || DSI <= 0) newErrors.D = "Must be positive";
      input = { shape, diameter: DSI };

    } else if (shape === "circular_partial") {
      const DSI = parseFloat(D) * lU, ySI = parseFloat(yc) * lU;
      if (isNaN(DSI) || DSI <= 0) newErrors.D = "Must be positive";
      if (isNaN(ySI) || ySI <= 0) newErrors.yc = "Must be positive";
      if (!isNaN(DSI) && !isNaN(ySI) && ySI > DSI) newErrors.yc = "Must be ≤ diameter";
      input = { shape, diameter: DSI, fillDepth: ySI };

    } else { // semicircular
      const DSI = parseFloat(D) * lU;
      if (isNaN(DSI) || DSI <= 0) newErrors.D = "Must be positive";
      input = { shape, diameter: DSI };
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const calc = calculateWettedPerimeter(input);
      const stp  = generateWettedPerimeterSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const showFillTable = shape === "circular_full" || shape === "circular_partial" || shape === "semicircular";
  const fillTableD = parseFloat(D) * toLm[lenUnit];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Wetted Perimeter Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          P — length of channel boundary in contact with the flowing fluid (free surface not included).
          Supports rectangular, trapezoidal, triangular, full/partial circular, and semi-circular sections.
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
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Channel / pipe cross-section:</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SHAPE_LABELS) as WettedPerimeterShape[]).map(s => (
              <ShapeBtn key={s} label={SHAPE_LABELS[s]} active={shape === s} onClick={() => setShape(s)} />
            ))}
          </div>
        </div>

        {/* Unit toggle */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Dimension units:</p>
          <div className="flex gap-2">
            {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
              <Btn key={u} label={u} active={lenUnit === u} onClick={() => {
                const conv = (v: string) => { const r = parseFloat(v); return isNaN(r) ? v : parseFloat((r * toLm[lenUnit] / toLm[u]).toPrecision(6)).toString(); };
                setB(conv(b)); setY(conv(y)); setYt(conv(yt)); setD(conv(D)); setYc(conv(yc)); setLenUnit(u);
              }} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── Rectangular ── */}
          {shape === "rectangular" && (
            <>
              <InputField label="Bottom width" symbol="b" unit={lenUnit}
                value={b} onChange={setB}
                placeholder={lenUnit === "m" ? "3.0" : "3000"} error={errors.b} />
              <InputField label="Flow depth" symbol="y" unit={lenUnit}
                value={y} onChange={setY}
                placeholder={lenUnit === "m" ? "1.0" : "1000"} error={errors.y} />
            </>
          )}

          {/* ── Trapezoidal ── */}
          {shape === "trapezoidal" && (
            <>
              <InputField label="Bottom width" symbol="b" unit={lenUnit}
                value={b} onChange={setB}
                placeholder={lenUnit === "m" ? "3.0" : "3000"} error={errors.b} />
              <InputField label="Flow depth" symbol="y" unit={lenUnit}
                value={y} onChange={setY}
                placeholder={lenUnit === "m" ? "1.0" : "1000"} error={errors.y} />
              <div>
                <InputField label="Side slope H:V" symbol="z" unit="dimensionless"
                  value={z} onChange={setZ} error={errors.z} />
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                  z = 0 for vertical walls · z = 1.5 typical earth
                </p>
              </div>
            </>
          )}

          {/* ── Triangular ── */}
          {shape === "triangular" && (
            <>
              <InputField label="Flow depth" symbol="y" unit={lenUnit}
                value={yt} onChange={setYt}
                placeholder={lenUnit === "m" ? "1.5" : "1500"} error={errors.yt} />
              <div>
                <InputField label="Side slope H:V" symbol="z" unit="dimensionless"
                  value={zt} onChange={setZt} error={errors.zt} />
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                  V-shaped channel — no bottom width · P = 2y√(1+z²)
                </p>
              </div>
            </>
          )}

          {/* ── Circular (full or semi) ── */}
          {(shape === "circular_full" || shape === "semicircular") && (
            <InputField label={shape === "semicircular" ? "Semicircle diameter" : "Pipe diameter"} symbol="D" unit={lenUnit}
              value={D} onChange={setD}
              placeholder={lenUnit === "m" ? "1.2" : "1200"} error={errors.D} />
          )}

          {/* ── Circular partial ── */}
          {shape === "circular_partial" && (
            <>
              <InputField label="Pipe diameter" symbol="D" unit={lenUnit}
                value={D} onChange={setD}
                placeholder={lenUnit === "m" ? "1.2" : "1200"} error={errors.D} />
              <div>
                <InputField label="Water depth in pipe" symbol="y" unit={lenUnit}
                  value={yc} onChange={setYc}
                  placeholder={lenUnit === "m" ? "0.9" : "900"} error={errors.yc} />
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                  y ≤ D · P = D × arccos(1 − 2y/D)
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
        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Wetted perimeter  P  (solid boundary in contact with fluid)
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  P = {fmt(result.wettedPerimeter, 5)} m
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  A = {fmt(result.area, 5)} m² &nbsp;·&nbsp;
                  R<sub>h</sub> = {fmt(result.hydraulicRadius, 5)} m
                </p>
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Cross-section geometry
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "P [m]",                         value: fmt(result.wettedPerimeter, 6) },
                    { label: "A [m²]",                        value: fmt(result.area,            5) },
                    { label: <span>R<sub>h</sub> [m]</span>,  value: fmt(result.hydraulicRadius, 6) },
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
                      <span>D<sub>h</sub> = 4R<sub>h</sub> [m]</span>
                    </p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(result.hydraulicDiameter, 6)}
                    </p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">T (top width) [m]</p>
                    <p className={`font-mono text-sm font-semibold ${hasT ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
                      {hasT ? fmt(result.topWidth, 5) : "—"}
                    </p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Fill ratio y/D</p>
                    <p className={`font-mono text-sm font-semibold ${result.fillRatio !== undefined ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
                      {result.fillRatio !== undefined ? `${fmt(result.fillRatio * 100, 3)}%` : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Banner */}
              <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {SHAPE_LABELS[shape]} cross-section
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.wettedPerimeter} />
              <CommonMistakes mistakes={commonMistakes.wettedPerimeter} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Circular fill table */}
      {showFillTable && !isNaN(fillTableD) && fillTableD > 0 && (
        <Card>
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            Circular pipe fill table (D = {fmt(fillTableD, 4)} m)
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            How P, A, and R<sub>h</sub> vary with fill depth for the entered diameter.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">y/D</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">y [m]</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">P [m]</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">A [m²]</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">
                    R<sub>h</sub> [m]
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0].map(ratio => {
                  const row = circFillRow(ratio);
                  if (!row) return null;
                  return (
                    <tr key={ratio} className={ratio === 1.0 ? "bg-gray-50 dark:bg-gray-800/50 font-semibold" : ""}>
                      <td className="py-1.5 pr-4 font-mono">{(ratio * 100).toFixed(0)}%</td>
                      <td className="py-1.5 pr-4 font-mono">{fmt(ratio * fillTableD, 4)}</td>
                      <td className="py-1.5 pr-4 font-mono">{fmt(row.P * fillTableD, 5)}</td>
                      <td className="py-1.5 pr-4 font-mono">{fmt(row.A * fillTableD * fillTableD, 5)}</td>
                      <td className="py-1.5 font-mono">{fmt(row.Rh * fillTableD, 5)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            R<sub>h</sub> is maximum at y/D ≈ 81% (not at full pipe). Maximum discharge occurs near y/D ≈ 94%.
          </p>
        </Card>
      )}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Wetted perimeter formulas by shape:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Shape</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">P</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { s: "Rectangular",         p: "b + 2y",                     n: "3 sides; top free surface excluded" },
                  { s: "Trapezoidal",          p: "b + 2y√(1+z²)",              n: "Bottom + 2 sloped sides" },
                  { s: "Triangular (V-notch)", p: "2y√(1+z²)",                  n: "b = 0; 2 sloped sides only" },
                  { s: "Circular (full)",      p: "πD",                         n: "Full circumference, no free surface" },
                  { s: "Circular (partial)",   p: "D × arccos(1−2y/D)",        n: "Arc length only" },
                  { s: "Semi-circular",        p: "πD/2",                       n: "Half circumference; flat top is free surface" },
                ].map(({ s, p, n }) => (
                  <tr key={s}>
                    <td className="py-1.5 pr-4">{s}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{p}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Best hydraulic section (minimum P for given A):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Rectangle:&nbsp;&nbsp;b = 2y  (half-square — width equals twice depth)</div>
              <div>Trapezoid:&nbsp;&nbsp;z = 1/√3 ≈ 0.577  (60° side angle — half-hexagon)</div>
              <div>Circle:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;full pipe is hydraulically most efficient</div>
            </div>
            <p className="mt-1">
              The best hydraulic section minimises wetted perimeter for a given area, which
              maximises R<sub>h</sub> and therefore maximises discharge for given slope and roughness.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Circular pipe partial fill — key points:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Maximum R<sub>h</sub> at y/D ≈ 0.81&nbsp;&nbsp;&nbsp;(not at full pipe)</div>
              <div>Maximum Q at y/D ≈ 0.94&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(with Manning's equation)</div>
              <div>Full pipe: R<sub>h</sub> = D/4, P = πD</div>
            </div>
          </div>
        </div>
      </Card>

      <References refs={REFS_WETTED_PERIMETER} />
    </div>
  );
}
