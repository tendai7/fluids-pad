"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_OVERALL_HTC } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateOverallHtc,
  generateOverallHtcSteps,
  commonAssumptions,
  commonMistakes,
  type HtcGeometry,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type ThickUnit = "m" | "mm";
type RadiusUnit = "m" | "mm";
const toM: Record<ThickUnit, number> = { m: 1, mm: 1e-3 };

// Wall material conductivity presets (W/(m·K))
const WALL_PRESETS = [
  { label: "Carbon steel",       k: "50"   },
  { label: "Stainless steel 304",k: "16"   },
  { label: "Stainless steel 316",k: "16"   },
  { label: "Copper",             k: "401"  },
  { label: "Aluminium",          k: "237"  },
  { label: "Titanium",           k: "22"   },
  { label: "Brass",              k: "109"  },
  { label: "Cast iron",          k: "52"   },
  { label: "Monel",              k: "26"   },
  { label: "Inconel 625",        k: "14"   },
] as const;

// HTC presets W/(m²·K)
const HTC_PRESETS = [
  { label: "Gases (natural convection)",      h: "5"    },
  { label: "Gases (forced convection)",       h: "100"  },
  { label: "Light organics (liquid)",         h: "500"  },
  { label: "Water (turbulent pipe flow)",     h: "3000" },
  { label: "Water (boiling)",                h: "10000" },
  { label: "Steam (condensing)",             h: "8000"  },
  { label: "Oils (viscous liquid)",          h: "300"   },
] as const;

// TEMA fouling resistance presets m²·K/W
const FOULING_PRESETS = [
  { label: "Steam (clean)",                   R: "0.0001"  },
  { label: "Seawater (< 52 °C)",             R: "0.0001"  },
  { label: "City/treated water",             R: "0.0002"  },
  { label: "River water",                    R: "0.0002"  },
  { label: "Boiler feed water (treated)",    R: "0.0001"  },
  { label: "Hard water",                     R: "0.0006"  },
  { label: "Light organics / petroleum",     R: "0.0002"  },
  { label: "Crude oil (mild)",               R: "0.0003"  },
  { label: "Crude oil (heavy)",              R: "0.0005"  },
  { label: "Fuel oil / residuals",           R: "0.0009"  },
] as const;

function fmt(n: number, sig = 4) { return parseFloat(n.toPrecision(sig)).toString(); }

function ModeBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${active
        ? "bg-blue-600 text-white"
        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
      {label}
    </button>
  );
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

function ResBar({ label, value, total, color }: { label: React.ReactNode; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>{label}</span>
        <span className="font-mono">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

export default function OverallHtcCalculator() {
  const [geometry,  setGeometry]  = useState<HtcGeometry>("flat");
  const [hi,        setHi]        = useState("3000");
  const [ho,        setHo]        = useState("1500");
  const [k,         setK]         = useState("50");
  const [thickness, setThickness] = useState("3");
  const [thickUnit, setThickUnit] = useState<ThickUnit>("mm");
  const [ri,        setRi]        = useState("25");
  const [ro,        setRo]        = useState("28");
  const [radUnit,   setRadUnit]   = useState<RadiusUnit>("mm");
  const [Rfi,       setRfi]       = useState("0.0001");
  const [Rfo,       setRfo]       = useState("0.0002");
  const [selWall,   setSelWall]   = useState("Carbon steel");
  const [selHi,     setSelHi]     = useState("");
  const [selHo,     setSelHo]     = useState("");
  const [selRfi,    setSelRfi]    = useState("");
  const [selRfo,    setSelRfo]    = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateOverallHtc> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateOverallHtcSteps> | null>(null);

  const handleClear = () => {
    setGeometry("flat");
    setHi("");
    setHo("");
    setK("");
    setThickness("");
    setThickUnit("mm");
    setRi("");
    setRo("");
    setRadUnit("mm");
    setRfi("");
    setRfo("");
    setSelWall("");
    setSelHi("");
    setSelHo("");
    setSelRfi("");
    setSelRfo("");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const hiVal  = parseFloat(hi);
    const hoVal  = parseFloat(ho);
    const kVal   = parseFloat(k);
    const RfiVal = parseFloat(Rfi);
    const RfoVal = parseFloat(Rfo);
    const tSI    = parseFloat(thickness) * toM[thickUnit];
    const riSI   = parseFloat(ri) * toM[radUnit as ThickUnit];
    const roSI   = parseFloat(ro) * toM[radUnit as ThickUnit];

    if (isNaN(hiVal) || hiVal <= 0) newErrors.hi = "Must be positive";
    if (isNaN(hoVal) || hoVal <= 0) newErrors.ho = "Must be positive";
    if (isNaN(kVal)  || kVal  <= 0) newErrors.k  = "Must be positive";
    if (isNaN(RfiVal) || RfiVal < 0) newErrors.Rfi = "Must be ≥ 0";
    if (isNaN(RfoVal) || RfoVal < 0) newErrors.Rfo = "Must be ≥ 0";

    if (geometry === "flat") {
      if (isNaN(tSI) || tSI <= 0) newErrors.thickness = "Must be positive";
    } else {
      if (isNaN(riSI) || riSI <= 0) newErrors.ri = "Must be positive";
      if (isNaN(roSI) || roSI <= 0) newErrors.ro = "Must be positive";
      if (!isNaN(riSI) && !isNaN(roSI) && roSI <= riSI) newErrors.ro = "Must be greater than inner radius";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        geometry,
        innerConvection: hiVal,
        outerConvection: hoVal,
        wallConductivity: kVal,
        innerFouling: RfiVal,
        outerFouling: RfoVal,
        ...(geometry === "flat"
          ? { wallThickness: tSI }
          : { innerRadius: riSI, outerRadius: roSI }),
      };
      const calc = calculateOverallHtc(input);
      const stp  = generateOverallHtcSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const foulingBg =
    !result ? ""
    : result.foulingPenalty < 5
    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
    : result.foulingPenalty < 20
    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Overall Heat Transfer Coefficient Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          1/U = 1/h<sub>i</sub> + R<sub>f,i</sub> + R<sub>wall</sub> + R<sub>f,o</sub> + 1/h<sub>o</sub> —
          combines convection, conduction, and fouling resistances in series for flat walls or cylindrical tubes.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">
          Heat Transfer · HX Design
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Geometry selector */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Wall geometry:</p>
          <div className="flex gap-2 max-w-sm">
            <ModeBtn label="Flat wall / plate"    active={geometry === "flat"}     onClick={() => setGeometry("flat")}     />
            <ModeBtn label="Cylindrical tube"     active={geometry === "cylinder"} onClick={() => setGeometry("cylinder")} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* h_i */}
          <div>
            <InputField label="Inner convection coefficient" symbol="hi" unit="W/(m²·K)"
              value={hi} onChange={setHi} error={errors.hi} />
            <div className="flex items-center gap-2 -mt-2">
              <select value={selHi} onChange={(e) => { setSelHi(e.target.value); const p = HTC_PRESETS.find(x => x.label === e.target.value); if (p) setHi(p.h); }}
                className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">hi preset…</option>
                {HTC_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label} — {p.h} W/(m²·K)</option>)}
              </select>
            </div>
          </div>

          {/* h_o */}
          <div>
            <InputField label="Outer convection coefficient" symbol="ho" unit="W/(m²·K)"
              value={ho} onChange={setHo} error={errors.ho} />
            <div className="flex items-center gap-2 -mt-2">
              <select value={selHo} onChange={(e) => { setSelHo(e.target.value); const p = HTC_PRESETS.find(x => x.label === e.target.value); if (p) setHo(p.h); }}
                className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">ho preset…</option>
                {HTC_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label} — {p.h} W/(m²·K)</option>)}
              </select>
            </div>
          </div>

          {/* Wall conductivity */}
          <div>
            <InputField label="Wall thermal conductivity" symbol="k" unit="W/(m·K)"
              value={k} onChange={setK} error={errors.k} />
            <div className="flex items-center gap-2 -mt-2">
              <select value={selWall} onChange={(e) => { setSelWall(e.target.value); const p = WALL_PRESETS.find(x => x.label === e.target.value); if (p) setK(p.k); }}
                className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Material preset…</option>
                {WALL_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label} — {p.k} W/(m·K)</option>)}
              </select>
            </div>
          </div>

          {/* Thickness (flat) or radii (cylinder) */}
          {geometry === "flat" ? (
            <div>
              <InputField label="Wall thickness" symbol="t" unit={thickUnit}
                value={thickness} onChange={setThickness}
                placeholder={thickUnit === "mm" ? "3" : "0.003"}
                error={errors.thickness} />
              <div className="flex gap-2 -mt-2">
                {(["m", "mm"] as ThickUnit[]).map(u => (
                  <Btn key={u} label={u} active={thickUnit === u} onClick={() => {
                    const raw = parseFloat(thickness);
                    if (!isNaN(raw)) {
                      const converted = raw * toM[thickUnit] / toM[u];
                      setThickness(parseFloat(converted.toPrecision(6)).toString());
                    }
                    setThickUnit(u);
                  }} />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div>
                <InputField label="Inner tube radius" symbol="ri" unit={radUnit}
                  value={ri} onChange={setRi}
                  placeholder={radUnit === "mm" ? "25" : "0.025"}
                  error={errors.ri} />
                <div className="flex gap-2 -mt-2">
                  {(["m", "mm"] as RadiusUnit[]).map(u => (
                    <Btn key={u} label={u} active={radUnit === u} onClick={() => {
                      const conv = (v: string) => {
                        const raw = parseFloat(v);
                        return isNaN(raw) ? v : parseFloat((raw * toM[radUnit as ThickUnit] / toM[u as ThickUnit]).toPrecision(6)).toString();
                      };
                      setRi(conv(ri));
                      setRo(conv(ro));
                      setRadUnit(u as ThickUnit);
                    }} />
                  ))}
                </div>
              </div>
              <div>
                <InputField label="Outer tube radius" symbol="ro" unit={radUnit}
                  value={ro} onChange={setRo}
                  placeholder={radUnit === "mm" ? "28" : "0.028"}
                  error={errors.ro} />
              </div>
            </>
          )}

          {/* R_f,i */}
          <div>
            <InputField label="Inner fouling resistance" symbol="Rf,i" unit="m²·K/W"
              value={Rfi} onChange={setRfi} error={errors.Rfi} />
            <div className="flex items-center gap-2 -mt-2">
              <select value={selRfi} onChange={(e) => { setSelRfi(e.target.value); const p = FOULING_PRESETS.find(x => x.label === e.target.value); if (p) setRfi(p.R); }}
                className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">TEMA fouling preset…</option>
                {FOULING_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label} — {p.R} m²·K/W</option>)}
              </select>
            </div>
          </div>

          {/* R_f,o */}
          <div>
            <InputField label="Outer fouling resistance" symbol="Rf,o" unit="m²·K/W"
              value={Rfo} onChange={setRfo} error={errors.Rfo} />
            <div className="flex items-center gap-2 -mt-2">
              <select value={selRfo} onChange={(e) => { setSelRfo(e.target.value); const p = FOULING_PRESETS.find(x => x.label === e.target.value); if (p) setRfo(p.R); }}
                className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">TEMA fouling preset…</option>
                {FOULING_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label} — {p.R} m²·K/W</option>)}
              </select>
            </div>
          </div>
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
        const R = result.resistances;
        const total = result.totalResistance;
        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Overall heat transfer coefficient  U = 1/ΣR
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  U = {fmt(result.overallU, 5)} W/(m²·K)
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  Clean U (no fouling) = {fmt(result.cleanU, 5)} W/(m²·K)
                </p>
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Thermal resistances
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "U [W/(m²·K)]",    value: fmt(result.overallU,       4) },
                    { label: "Clean U [W/(m²·K)]",value: fmt(result.cleanU,        4) },
                    { label: "ΣR [m²·K/W]",     value: fmt(result.totalResistance, 4) },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resistance breakdown bars */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
                  Resistance breakdown (% of total)
                </p>
                <div className="space-y-2">
                  <ResBar label={<>Inner convection 1/h<sub>i</sub> = {fmt(R.innerConvection, 4)} m²·K/W</>}
                    value={R.innerConvection} total={total} color="bg-blue-500" />
                  <ResBar label={<>Inner fouling R<sub>f,i</sub> = {fmt(R.innerFouling, 4)} m²·K/W</>}
                    value={R.innerFouling} total={total} color="bg-orange-400" />
                  <ResBar label={<>Wall conduction t/k = {fmt(R.wallConduction, 4)} m²·K/W</>}
                    value={R.wallConduction} total={total} color="bg-gray-500" />
                  <ResBar label={<>Outer fouling R<sub>f,o</sub> = {fmt(R.outerFouling, 4)} m²·K/W</>}
                    value={R.outerFouling} total={total} color="bg-orange-400" />
                  <ResBar label={<>Outer convection 1/h<sub>o</sub> = {fmt(R.outerConvection, 4)} m²·K/W</>}
                    value={R.outerConvection} total={total} color="bg-green-500" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  The dominant resistance controls U — improving other resistances will have little effect.
                </p>
              </div>

              {/* Fouling penalty banner */}
              <div className={`p-4 rounded-lg border ${foulingBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {result.foulingPenalty < 5
                    ? `Fouling penalty: ${result.foulingPenalty.toFixed(1)}% — minor impact`
                    : result.foulingPenalty < 20
                    ? `Fouling penalty: ${result.foulingPenalty.toFixed(1)}% — moderate impact, periodic cleaning recommended`
                    : `Fouling penalty: ${result.foulingPenalty.toFixed(1)}% — significant impact, cleaning required`}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.overallHtc} />
              <CommonMistakes mistakes={commonMistakes.overallHtc} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Flat wall — resistances in series:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>1/U = 1/h<sub>i</sub> + R<sub>f,i</sub> + t/k + R<sub>f,o</sub> + 1/h<sub>o</sub></div>
              <div>U = 1 / ΣR&nbsp;&nbsp;&nbsp;&nbsp;[W/(m²·K)]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Cylindrical tube — based on outer area:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>1/U<sub>o</sub> = 1/h<sub>o</sub> + R<sub>f,o</sub> + (r<sub>o</sub>/k)·ln(r<sub>o</sub>/r<sub>i</sub>) + (r<sub>o</sub>/r<sub>i</sub>)·R<sub>f,i</sub> + (r<sub>o</sub>/r<sub>i</sub>)/h<sub>i</sub></div>
            </div>
            <p className="mt-1">
              For thin-walled tubes (r<sub>o</sub>/r<sub>i</sub> ≈ 1), the cylindrical formula reduces to the flat-wall equation.
              The radius-ratio corrections become important for thick-walled tubes.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Typical U values for common HX types:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Service</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">U [W/(m²·K)]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { s: "Gas-to-gas",                     u: "10 – 50"    },
                  { s: "Gas-to-liquid",                  u: "15 – 250"   },
                  { s: "Liquid-to-liquid (light)",       u: "200 – 1000" },
                  { s: "Water-to-water",                 u: "800 – 2500" },
                  { s: "Steam condenser (water-cooled)", u: "1000 – 6000"},
                  { s: "Boiling water (reboiler)",       u: "500 – 2500" },
                  { s: "Oil cooler (water-cooled)",      u: "150 – 500"  },
                ].map(({ s, u }) => (
                  <tr key={s}>
                    <td className="py-1.5 pr-4">{s}</td>
                    <td className="py-1.5 font-mono">{u}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">TEMA fouling resistance guidelines (m²·K/W):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1 text-xs">
              <div>Steam, treated water, light organics:  0.0001 – 0.0002</div>
              <div>River water, hard water:               0.0002 – 0.0006</div>
              <div>Crude oil (mild):                      0.0003 – 0.0005</div>
              <div>Fuel oil / heavy residuals:            0.0005 – 0.0009</div>
            </div>
          </div>
        </div>
      </Card>
      <References refs={REFS_OVERALL_HTC} />
    </div>
  );
}