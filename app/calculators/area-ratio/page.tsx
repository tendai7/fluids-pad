"use client";

import React, { useState, useMemo } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_AREA_RATIO } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateAreaRatio,
  generateAreaRatioSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type DiamUnit = "m" | "mm" | "cm" | "inch";
const toM: Record<DiamUnit, number> = { m: 1, mm: 1e-3, cm: 1e-2, inch: 0.0254 };

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

// For each section: enter diameter OR area (mutually locked)
function SectionInput({
  label, diam, setDiam, diamUnit, setDiamUnit, area, setArea, errors,
}: {
  label: string;
  diam: string; setDiam: (v: string) => void;
  diamUnit: DiamUnit; setDiamUnit: (u: DiamUnit) => void;
  area: string; setArea: (v: string) => void;
  errors: Record<string, string>;
}) {
  const areaLocked = diam.trim() !== "";
  const diamLocked = !areaLocked && area.trim() !== "";

  const previewArea = useMemo(() => {
    if (!areaLocked) return "";
    const d = parseFloat(diam);
    if (isNaN(d) || d <= 0) return "";
    return fmt(Math.PI * ((d * toM[diamUnit]) / 2) ** 2);
  }, [diam, diamUnit, areaLocked]);

  return (
    <div className="space-y-1">
      <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">{label}</h3>

      <div>
        <InputField label="Diameter" symbol="D" unit={diamUnit}
          value={diam}
          onChange={(v) => { setDiam(v); if (v.trim() !== "") setArea(""); }}
          placeholder={diamUnit === "m" ? "0.2" : diamUnit === "mm" ? "200" : diamUnit === "cm" ? "20" : "7.87"}
          error={errors.diam}
          readOnly={diamLocked}
          hint={diamLocked ? "Clear area to use diameter" : undefined}
        />
        <div className="flex flex-wrap gap-2 -mt-2 mb-3">
          {(["m","mm","cm","inch"] as DiamUnit[]).map(u => (
            <Btn key={u} label={u} active={diamUnit === u} onClick={() => {
              const si = parseFloat(diam) * toM[diamUnit];
              setDiamUnit(u);
              if (!isNaN(si) && diam.trim() !== "") setDiam(fmt(si / toM[u]));
            }} />
          ))}
        </div>
      </div>

      <InputField label="Cross-sectional area" symbol="A" unit="m²"
        value={areaLocked ? previewArea : area}
        onChange={setArea}
        error={errors.area}
        readOnly={areaLocked}
        hint={areaLocked ? "Computed from diameter" : undefined}
      />
    </div>
  );
}

export default function AreaRatioCalculator() {
  const [d1, setD1] = useState("200"); const [du1, setDu1] = useState<DiamUnit>("mm");
  const [a1, setA1] = useState("");
  const [d2, setD2] = useState("100"); const [du2, setDu2] = useState<DiamUnit>("mm");
  const [a2, setA2] = useState("");

  const [v1,    setV1]    = useState("");   // optional velocity at section 1
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateAreaRatio> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateAreaRatioSteps> | null>(null);
  const [calcd,  setCalcd]  = useState<{ A1: number; A2: number; v1?: number } | null>(null);

  const getSI = (diam: string, du: DiamUnit, area: string) => {
    if (diam.trim() !== "") {
      const d = parseFloat(diam);
      return d > 0 ? Math.PI * ((d * toM[du]) / 2) ** 2 : undefined;
    }
    const a = parseFloat(area);
    return a > 0 ? a : undefined;
  };

  const handleClear = () => {
    setD1("");
    setDu1("mm");
    setA1("");
    setD2("");
    setDu2("mm");
    setA2("");
    setV1("");
    setResult(null);
    setSteps(null);
    setCalcd(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const A1si = getSI(d1, du1, a1);
    const A2si = getSI(d2, du2, a2);
    const v1n  = v1.trim() !== "" ? parseFloat(v1) : undefined;

    if (!A1si) newErrors.sec1 = "Enter a diameter or area for section 1";
    if (!A2si) newErrors.sec2 = "Enter a diameter or area for section 2";
    if (v1n !== undefined && (isNaN(v1n) || v1n < 0)) newErrors.v1 = "Must be non-negative";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        diameter1: d1.trim() !== "" ? parseFloat(d1) * toM[du1] : undefined,
        diameter2: d2.trim() !== "" ? parseFloat(d2) * toM[du2] : undefined,
        area1: d1.trim() === "" && a1.trim() !== "" ? parseFloat(a1) : undefined,
        area2: d2.trim() === "" && a2.trim() !== "" ? parseFloat(a2) : undefined,
      };
      const calc = calculateAreaRatio(input);
      const stp  = generateAreaRatioSteps(input, calc);
      setResult(calc);
      setSteps(stp);
      setCalcd({ A1: A1si!, A2: A2si!, v1: v1n });
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Area Ratio Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Compute β = A₁/A₂ for pipe contractions, expansions, Venturi meters, and nozzles —
          and derive the velocity ratio from continuity.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Mechanics I
        </span>
      </div>

      <Card>
        <h2 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">Inputs</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          For each section enter either the diameter or the cross-sectional area.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <SectionInput label="Section 1 (upstream)"
            diam={d1} setDiam={setD1} diamUnit={du1} setDiamUnit={setDu1}
            area={a1} setArea={setA1}
            errors={{ diam: errors.sec1 ?? "", area: errors.sec1 ?? "" }} />
          <SectionInput label="Section 2 (downstream)"
            diam={d2} setDiam={setD2} diamUnit={du2} setDiamUnit={setDu2}
            area={a2} setArea={setA2}
            errors={{ diam: errors.sec2 ?? "", area: errors.sec2 ?? "" }} />
        </div>

        {/* Optional velocity */}
        <div className="mt-4 max-w-xs">
          <InputField label="Velocity at section 1 (optional)" symbol="V₁" unit="m/s"
            value={v1} onChange={setV1} error={errors.v1} />
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
            If provided, V₂ = V₁ × β is calculated.
          </p>
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

      {result && steps && calcd && (() => {
        const β  = result.areaRatio;
        const A1 = calcd.A1;
        const A2 = calcd.A2;
        const v1n = calcd.v1;
        const v2n = v1n !== undefined ? v1n * β : undefined;
        const dRatio = Math.sqrt(A1 / A2); // D1/D2

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Area ratio  β = A₁ / A₂
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  β = {fmt(β, 5)}
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  A₁ is {β > 1 ? "larger" : β < 1 ? "smaller" : "equal to"} than A₂
                  {β > 1 ? " — flow accelerates (contraction)" : β < 1 ? " — flow decelerates (expansion)" : ""}
                </p>
              </div>

              {/* Geometry panel */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Cross-sectional areas
                </p>
                <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[["Section 1  A₁", A1], ["Section 2  A₂", A2]].map(([label, val]) => (
                    <div key={label as string} className="px-4 py-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{fmt(val as number, 5)} m²</p>
                      <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{fmt((val as number) * 1e4)} cm² · {fmt((val as number) * 1e6)} mm²</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ratios panel */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Derived ratios (from continuity A₁V₁ = A₂V₂)
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "Area ratio  β",      value: fmt(β, 5)       },
                    { label: "Diam. ratio D₁/D₂",  value: fmt(dRatio, 5)  },
                    { label: "Vel. ratio  V₂/V₁",  value: fmt(β, 5)       },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Velocity at section 2 */}
              {v2n !== undefined && v1n !== undefined && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                    Velocity from continuity  V₂ = V₁ × β
                  </p>
                  <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                    {[
                      { label: "V₁ (given)",  value: `${fmt(v1n, 5)} m/s` },
                      { label: "β",           value: fmt(β, 5)             },
                      { label: "V₂ = V₁ × β", value: `${fmt(v2n, 5)} m/s` },
                    ].map(({ label, value }) => (
                      <div key={label} className="px-3 py-2.5 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                        <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.areaRatio} />
              <CommonMistakes mistakes={commonMistakes.areaRatio} />
            </div>
          </ResultsCard>
        );
      })()}

      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Area ratio:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              β = A₁ / A₂ = (D₁/D₂)²
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Velocity ratio from continuity:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              V₂ / V₁ = A₁ / A₂ = β
            </div>
          </div>
          <div>
            <p className="font-semibold mb-2">Common applications:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Venturi meter — β = (D₂/D₁)² is the throat-to-pipe area ratio</li>
              <li>Pipe contraction / expansion — velocity changes by factor β</li>
              <li>Nozzle design — area ratio controls Mach number in compressible flow</li>
              <li>Minor loss coefficients — many depend on the area ratio</li>
            </ul>
          </div>
          <p>
            For incompressible flow, the continuity equation A₁V₁ = A₂V₂ means velocity is
            inversely proportional to area. A smaller section 2 (β &gt; 1) accelerates the flow;
            a larger section 2 (β &lt; 1) decelerates it. The Venturi meter exploits this
            velocity change to infer flow rate from a pressure difference.
          </p>
        </div>
      </Card>
      <References refs={REFS_AREA_RATIO} />
    </div>
  );
}