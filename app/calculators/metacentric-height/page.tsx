"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_METACENTRIC_HEIGHT } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateMetacentricHeight,
  generateMetacentricHeightSteps,
  commonAssumptions,
  commonMistakes,
  type MetacentricHeightInput,
  type FloatingShape,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit = "m" | "mm" | "cm" | "ft";
const toLm: Record<LenUnit, number> = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048 };

type DensUnit = "kg/m³" | "g/cm³";

const SHAPE_OPTIONS: { value: FloatingShape; label: string; desc: string }[] = [
  { value: "rectangle", label: "Rectangular barge / ship",
    desc: "Flat-bottomed hull with uniform rectangular cross-section. BM = B² / (12D)." },
  { value: "circle",    label: "Circular cylinder",
    desc: "Cylindrical hull (pontoon, SPAR buoy). BM = D² / (16T) where D = diameter, T = draft." },
];

// Vessel presets
const PRESETS = [
  { label: "Small pontoon",      shape: "rectangle" as FloatingShape, B: 3,   L: 10,  D: 0.8, KG: 1.0,  rho: 1025 },
  { label: "River barge",        shape: "rectangle" as FloatingShape, B: 10,  L: 50,  D: 2.5, KG: 3.0,  rho: 1025 },
  { label: "Stability test",     shape: "rectangle" as FloatingShape, B: 6,   L: 20,  D: 1.5, KG: 2.5,  rho: 1025 },
  { label: "Circular pontoon",   shape: "circle"    as FloatingShape, B: 4,   L: 8,   D: 1.0, KG: 1.2,  rho: 1025 },
] as const;

function fmt(n: number, sig = 4): string { return parseFloat(n.toPrecision(sig)).toString(); }
function fmtForce(n: number): string {
  if (n >= 1e6) return `${fmt(n / 1e6, 4)} MN`;
  if (n >= 1e3) return `${fmt(n / 1e3, 4)} kN`;
  return `${fmt(n, 4)} N`;
}

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

export default function MetacentricHeightCalculator() {
  const [shape,    setShape]    = useState<FloatingShape>("rectangle");
  const [beamB,    setBeamB]    = useState("10");
  const [beamUnit, setBeamUnit] = useState<LenUnit>("m");
  const [lengthL,  setLengthL]  = useState("50");
  const [lenUnit,  setLenUnit]  = useState<LenUnit>("m");
  const [draft,    setDraft]    = useState("2.5");
  const [draftUnit,setDraftUnit]= useState<LenUnit>("m");
  const [KG,       setKG]       = useState("3.0");
  const [KGunit,   setKGunit]   = useState<LenUnit>("m");
  const [density,  setDensity]  = useState("1025");
  const [densUnit, setDensUnit] = useState<DensUnit>("kg/m³");

  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [result,  setResult]  = useState<ReturnType<typeof calculateMetacentricHeight> | null>(null);
  const [steps,   setSteps]   = useState<ReturnType<typeof generateMetacentricHeightSteps> | null>(null);

  const applyPreset = (p: typeof PRESETS[number]) => {
    setShape(p.shape);
    setBeamB(p.B.toString());  setBeamUnit("m");
    setLengthL(p.L.toString()); setLenUnit("m");
    setDraft(p.D.toString());  setDraftUnit("m");
    setKG(p.KG.toString());    setKGunit("m");
    setDensity(p.rho.toString()); setDensUnit("kg/m³");
    setResult(null); setSteps(null); setErrors({});
  };

  const handleClear = () => {
    setBeamB(""); setLengthL(""); setDraft(""); setKG(""); setDensity("");
    setResult(null); setSteps(null); setErrors({});
  };

  const handleCalculate = () => {
    const errs: Record<string, string> = {};
    const bVal = parseFloat(beamB);
    const lVal = parseFloat(lengthL);
    const dVal = parseFloat(draft);
    const kgVal = parseFloat(KG);
    const rhoVal = parseFloat(density);

    if (isNaN(bVal) || bVal <= 0) errs.beamB  = "Must be a positive number";
    if (shape === "rectangle" && (isNaN(lVal) || lVal <= 0)) errs.lengthL = "Must be a positive number";
    if (isNaN(dVal) || dVal <= 0) errs.draft  = "Must be a positive number";
    if (isNaN(kgVal) || kgVal < 0) errs.KG   = "Must be non-negative";
    if (density !== "" && (isNaN(rhoVal) || rhoVal <= 0)) errs.density = "Must be a positive number";

    setErrors(errs);
    if (Object.keys(errs).length) { setResult(null); setSteps(null); return; }

    try {
      const bSI   = bVal  * toLm[beamUnit];
      const lSI   = lVal  * toLm[lenUnit];
      const dSI   = dVal  * toLm[draftUnit];
      const kgSI  = kgVal * toLm[KGunit];
      const rhoSI = density !== "" ? (densUnit === "g/cm³" ? rhoVal * 1000 : rhoVal) : undefined;

      const input: MetacentricHeightInput = {
        shape, beamB: bSI,
        lengthL: shape === "rectangle" ? lSI : undefined,
        draft: dSI, KG: kgSI, density: rhoSI,
      };
      const r = calculateMetacentricHeight(input);
      const s = generateMetacentricHeightSteps(input, r);
      setResult(r); setSteps(s);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const lenPh = (u: LenUnit) => u === "m" ? "10" : u === "mm" ? "10000" : u === "cm" ? "1000" : "32.8";
  const stabBg = (s?: string) =>
    s === "stable"   ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" :
    s === "neutral"  ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800" :
                       "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Metacentric Height
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Calculate{" "}
          <strong className="text-gray-800 dark:text-gray-200">GM = KB + BM − KG</strong> to
          assess the small-angle stability of a floating vessel. Positive GM means the vessel is
          stable and will self-right after a small heel.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Properties &amp; Statics
        </span>
      </div>

      {/* Shape selector */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">Hull Cross-Section</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          {SHAPE_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setShape(opt.value)}
              className={`flex-1 text-left px-4 py-3 rounded-lg border transition-colors ${
                shape === opt.value
                  ? "bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}>
              <p className="font-medium text-sm text-gray-900 dark:text-white">{opt.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">Vessel presets</h2>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p)}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Beam B */}
          <div>
            <div className="flex gap-2 mb-3" aria-hidden="true"><span className="px-3 py-1 text-sm opacity-0 select-none">x</span></div>
            <InputField label={shape === "rectangle" ? "Beam (breadth)" : "Diameter"}
              symbol="B" unit={beamUnit} value={beamB} onChange={setBeamB}
              placeholder={lenPh(beamUnit)} error={errors.beamB} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                <Btn key={u} label={u} active={beamUnit === u} onClick={() => {
                  const si = parseFloat(beamB) * toLm[beamUnit];
                  setBeamUnit(u);
                  if (!isNaN(si)) setBeamB(fmt(si / toLm[u]));
                }} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {shape === "rectangle" ? "Transverse width of waterplane." : "Outer diameter of circular section."}
            </p>
          </div>

          {/* Length L (rectangle only) */}
          {shape === "rectangle" && (
            <div>
              <div className="flex gap-2 mb-3" aria-hidden="true"><span className="px-3 py-1 text-sm opacity-0 select-none">x</span></div>
              <InputField label="Length" symbol="L" unit={lenUnit} value={lengthL}
                onChange={setLengthL} placeholder={lenPh(lenUnit)} error={errors.lengthL} />
              <div className="flex flex-wrap gap-2 -mt-2">
                {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                  <Btn key={u} label={u} active={lenUnit === u} onClick={() => {
                    const si = parseFloat(lengthL) * toLm[lenUnit];
                    setLenUnit(u);
                    if (!isNaN(si)) setLengthL(fmt(si / toLm[u]));
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Draft D */}
          <div>
            <div className="flex gap-2 mb-3" aria-hidden="true"><span className="px-3 py-1 text-sm opacity-0 select-none">x</span></div>
            <InputField label="Draft" symbol="D" unit={draftUnit} value={draft}
              onChange={setDraft} placeholder={lenPh(draftUnit)} error={errors.draft} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                <Btn key={u} label={u} active={draftUnit === u} onClick={() => {
                  const si = parseFloat(draft) * toLm[draftUnit];
                  setDraftUnit(u);
                  if (!isNaN(si)) setDraft(fmt(si / toLm[u]));
                }} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Depth of submersion below waterline.</p>
          </div>

          {/* KG */}
          <div>
            <div className="flex gap-2 mb-3" aria-hidden="true"><span className="px-3 py-1 text-sm opacity-0 select-none">x</span></div>
            <InputField label="Centre of gravity above keel" symbol="KG" unit={KGunit}
              value={KG} onChange={setKG} placeholder={lenPh(KGunit)} error={errors.KG} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m","mm","cm","ft"] as LenUnit[]).map(u => (
                <Btn key={u} label={u} active={KGunit === u} onClick={() => {
                  const si = parseFloat(KG) * toLm[KGunit];
                  setKGunit(u);
                  if (!isNaN(si)) setKG(fmt(si / toLm[u]));
                }} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Measured from keel (bottom of hull) to overall centre of gravity.
            </p>
          </div>

          {/* Water density */}
          <div>
            <div className="flex gap-2 mb-3" aria-hidden="true"><span className="px-3 py-1 text-sm opacity-0 select-none">x</span></div>
            <InputField label="Water density (optional)" symbol="ρ" unit={densUnit}
              value={density} onChange={setDensity} placeholder="1025" error={errors.density} />
            <div className="flex gap-2 -mt-2">
              {(["kg/m³","g/cm³"] as DensUnit[]).map(u => (
                <Btn key={u} label={u} active={densUnit === u} onClick={() => {
                  const factor = (d: DensUnit) => d === "g/cm³" ? 1000 : 1;
                  const si = parseFloat(density) * factor(densUnit);
                  setDensUnit(u);
                  if (!isNaN(si)) setDensity(fmt(si / factor(u)));
                }} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Used to compute displacement force.</p>
          </div>
        </div>

        {errors.general && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.general}</p>}
        <button onClick={handleCalculate}
          className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors">
          Calculate
        </button>
        <ClearButton onClear={handleClear} />
      </Card>

      {/* Results */}
      {result && steps && (
        <ResultsCard>
          <div className="space-y-5">

            {/* GM primary */}
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Metacentric Height  GM = KB + BM − KG
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                GM = {fmt(result.GM)} m
              </p>
            </div>

            {/* Stability banner */}
            <div className={`p-4 rounded-lg border ${stabBg(result.stability)}`}>
              <p className="font-semibold text-gray-900 dark:text-white mb-1 capitalize">
                {result.stability} — GM = {fmt(result.GM)} m
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
            </div>

            {/* Key heights grid */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Heights above keel
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "KB (m)",  value: fmt(result.KB)  },
                  { label: "BM (m)",  value: fmt(result.BM)  },
                  { label: "KM (m)",  value: fmt(result.KM)  },
                  { label: "KG (m)",  value: fmt(parseFloat(KG) * toLm[KGunit]) },
                ].map(({ label, value }) => (
                  <div key={label} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Geometry and displacement */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                Geometry &amp; displacement
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: "I (m⁴)",      value: fmt(result.waterplaneI) },
                  { label: "V (m³)",      value: fmt(result.displacedV)  },
                  { label: "BG (m)",      value: fmt(result.BG)          },
                  { label: "Displacement", value: result.displacement ? fmtForce(result.displacement) : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.metacentricHeight} />
            <CommonMistakes mistakes={commonMistakes.metacentricHeight} />
          </div>
        </ResultsCard>
      )}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Key points and formula:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>KB  = D / 2            (centroid of submerged rect. section)</div>
              <div>BM  = I / V            (metacentric radius)</div>
              <div>KM  = KB + BM          (metacentre above keel)</div>
              <div>GM  = KM − KG          (metacentric height)</div>
              <div>GM  = KB + BM − KG</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">BM for common cross-sections:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white w-32">Section</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">I (waterplane)</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">BM formula</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ["Rectangle (B×L)", "L B³ / 12", "BM = B² / (12D)"],
                  ["Circle (dia. B)", "π B⁴ / 64",  "BM = B² / (16D)"],
                ].map(([sec, I, bm]) => (
                  <tr key={sec}>
                    <td className="py-1.5 pr-4 font-medium">{sec}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{I}</td>
                    <td className="py-1.5 font-mono text-xs">{bm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Stability classification:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Condition</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">GM</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Behaviour</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ["Stable",   "GM > 0", "Restoring moment; returns to upright after small heel"],
                  ["Neutral",  "GM = 0", "Indifferent — stays at any heel angle"],
                  ["Unstable", "GM < 0", "Overturning moment; capsizes under small disturbance"],
                ].map(([cond, gm, beh]) => (
                  <tr key={cond}>
                    <td className="py-1.5 pr-4 font-medium">{cond}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{gm}</td>
                    <td className="py-1.5 text-xs">{beh}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Practical GM guidelines:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Cargo ships: GM ≈ 0.15–1.0 m (too large → stiff, uncomfortable roll)</li>
              <li>Passenger ferries: GM ≈ 0.3–1.5 m</li>
              <li>Stability can be increased by lowering KG (move cargo down, add ballast) or widening the beam</li>
              <li>Free-surface effect: liquid in partially filled tanks reduces effective GM — add solid GM correction</li>
            </ul>
          </div>
        </div>
      </Card>

      <References refs={REFS_METACENTRIC_HEIGHT} />
    </div>
  );
}
