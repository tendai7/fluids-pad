"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_TORRICELLI } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateTorricelli,
  generateTorricelliSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type HeightUnit = "m" | "mm" | "cm" | "ft" | "inch";
type DiamUnit   = "m" | "mm" | "cm" | "inch" | "ft";

const toHeightSI: Record<HeightUnit, number> = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048, inch: 0.0254 };
const toDiamSI:   Record<DiamUnit,   number> = { m: 1, mm: 1e-3, cm: 1e-2, inch: 0.0254, ft: 0.3048 };

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

export default function TorricelliCalculator() {
  const [height,       setHeight]       = useState("2");
  const [heightUnit,   setHeightUnit]   = useState<HeightUnit>("m");
  const [useCd,        setUseCd]        = useState(false);
  const [cd,           setCd]           = useState("0.611");
  const [orifDiam,     setOrifDiam]     = useState("");
  const [orifDiamUnit, setOrifDiamUnit] = useState<DiamUnit>("mm");
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [result,  setResult]  = useState<ReturnType<typeof calculateTorricelli> | null>(null);
  const [steps,   setSteps]   = useState<ReturnType<typeof generateTorricelliSteps> | null>(null);
  const [calcd,   setCalcd]   = useState<{ Cd: number; diam?: number } | null>(null);

  const handleClear = () => {
    setHeight(""); setHeightUnit("m");
    setCd(""); setOrifDiam(""); setOrifDiamUnit("mm");
    setUseCd(false);
    setResult(null); setSteps(null); setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const h  = parseFloat(height);
    const Cd = useCd ? parseFloat(cd) : 1;
    const d  = orifDiam.trim() !== "" ? parseFloat(orifDiam) : undefined;

    if (isNaN(h) || h <= 0)          newErrors.height = "Must be a positive number";
    if (useCd && (isNaN(Cd) || Cd <= 0 || Cd > 1)) newErrors.cd = "Must be between 0 and 1";
    if (d !== undefined && (isNaN(d) || d <= 0))    newErrors.orifDiam = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    try {
      const hSI  = h * toHeightSI[heightUnit];
      const input = { height: hSI };
      const calc  = calculateTorricelli(input);
      const stp   = generateTorricelliSteps(input, calc);
      setResult(calc);
      setSteps(stp);
      setCalcd({ Cd, diam: d !== undefined ? d * toDiamSI[orifDiamUnit] : undefined });
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Torricelli's Theorem Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Exit velocity and flow rate from a tank orifice. Derived from Bernoulli's equation
          assuming the tank surface is large relative to the orifice.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Mechanics I
        </span>
      </div>

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Height */}
          <div>
            <InputField
              label="Fluid height above orifice" symbol="h" unit={heightUnit}
              value={height} onChange={setHeight} error={errors.height}
            />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m","mm","cm","ft","inch"] as HeightUnit[]).map(u => (
                <Btn key={u} label={u} active={heightUnit === u} onClick={() => setHeightUnit(u)} />
              ))}
            </div>
          </div>

          {/* Orifice diameter (optional) */}
          <div>
            <InputField
              label="Orifice diameter (optional — for flow rate)" symbol="d" unit={orifDiamUnit}
              value={orifDiam} onChange={setOrifDiam} error={errors.orifDiam}
            />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m","mm","cm","inch","ft"] as DiamUnit[]).map(u => (
                <Btn key={u} label={u} active={orifDiamUnit === u} onClick={() => setOrifDiamUnit(u)} />
              ))}
            </div>
          </div>

          {/* Discharge coefficient toggle */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={useCd} onChange={e => setUseCd(e.target.checked)}
                  className="rounded" />
                Apply discharge coefficient C<sub>d</sub>
                <span className="text-xs text-gray-400">(accounts for real-world losses)</span>
              </label>
            </div>
            {useCd && (
              <div className="max-w-xs">
                <InputField
                  label="Discharge coefficient" symbol="Cd" unit="—"
                  value={cd} onChange={setCd} error={errors.cd}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
                  Sharp-edged orifice ≈ 0.61 · Well-rounded ≈ 0.98 · Short tube ≈ 0.82
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          Ideal case (no losses). Real exit velocity is lower — use C<sub>d</sub> to correct.
        </p>

        {errors.general && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.general}</p>
        )}
        <button onClick={handleCalculate}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors">
          Calculate
        </button>
        <ClearButton onClear={handleClear} />
      </Card>

      {result && steps && calcd && (() => {
        const V_ideal  = result.velocity;
        const Cd       = calcd.Cd;
        const V_actual = Cd * V_ideal;
        const A        = calcd.diam ? Math.PI * (calcd.diam / 2) ** 2 : null;
        const Q        = A !== null ? Cd * A * V_ideal : null;

        const velUnits: [string, number][] = [
          ["m/s",  V_actual],
          ["cm/s", V_actual * 100],
          ["ft/s", V_actual * 3.28084],
          ["km/h", V_actual * 3.6],
          ["mph",  V_actual * 2.23694],
        ];

        const flowUnits: [string, number][] = Q !== null ? [
          ["m³/s",    Q],
          ["L/s",     Q * 1000],
          ["L/min",   Q * 60000],
          ["m³/h",    Q * 3600],
          ["ft³/s",   Q / 0.028317],
          ["ft³/min", Q / 0.028317 * 60],
          ["gal/min", Q * 264.172],
          ["Imp gal/min", Q * 219.969],
        ] : [];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Ideal velocity */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  {Cd < 1 ? "Ideal exit velocity  V = √(2gh)" : "Exit velocity  V = √(2gh)"}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {fmt(V_ideal, 6)} m/s
                </p>
              </div>

              {/* Corrected velocity when Cd is applied */}
              {Cd < 1 && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                    Corrected exit velocity  V<sub>actual</sub> = C<sub>d</sub> × V<sub>ideal</sub>
                  </p>
                  <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                    {[
                      ["Cd", fmt(Cd, 3)],
                      ["V ideal", `${fmt(V_ideal, 5)} m/s`],
                      ["V actual", `${fmt(V_actual, 5)} m/s`],
                    ].map(([label, value]) => (
                      <div key={label} className="px-3 py-2.5 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                        <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Velocity in other units */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  {Cd < 1 ? "Actual velocity in other units" : "Velocity in other units"}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {velUnits.map(([unit, value]) => (
                    <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                      <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flow rate (if orifice diameter given) */}
              {Q !== null && A !== null && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Flow rate  Q = C<sub>d</sub> × A × V
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {fmt(Q, 5)} m³/s
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Orifice area A = {fmt(A * 1e6, 4)} mm²
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {flowUnits.map(([unit, value]) => (
                      <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                        <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.torricelli} />
              <CommonMistakes mistakes={commonMistakes.torricelli} />
            </div>
          </ResultsCard>
        );
      })()}

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Ideal exit velocity:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              V = √(2gh)
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">With discharge coefficient and orifice area:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              Q = C<sub>d</sub> × A × √(2gh)
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>h = height of fluid surface above orifice centre [m]</li>
              <li>g = 9.81 m/s²</li>
              <li>A = orifice cross-sectional area [m²]</li>
              <li>C<sub>d</sub> = discharge coefficient (0 to 1) — accounts for vena contracta and friction</li>
            </ul>
          </div>
          <p>
            Derived by applying Bernoulli's equation between the free surface (P = P<sub>atm</sub>, V ≈ 0)
            and the orifice exit (P = P<sub>atm</sub>). The result is identical to the velocity of
            a free-falling body dropped from height h.
          </p>
        </div>
      </Card>

      <References refs={REFS_TORRICELLI} />
    </div>
  );
}
