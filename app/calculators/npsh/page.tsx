"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_NPSH } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateNpsh,
  generateNpshSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type PresUnit = "Pa" | "kPa" | "bar" | "atm" | "psi";
type DensUnit = "kg/m³" | "g/cm³";
type Mode     = "pressure" | "geometry";

const toPa:   Record<PresUnit, number> = { Pa: 1, kPa: 1e3, bar: 1e5, atm: 101325, psi: 6894.76 };
const toKgM3: Record<DensUnit, number> = { "kg/m³": 1, "g/cm³": 1000 };
const G = 9.81;

const WATER_PRESETS = [
  { label: "Water 10°C", Pv: "1228",  rho: "999.7" },
  { label: "Water 20°C", Pv: "2338",  rho: "998.2" },
  { label: "Water 30°C", Pv: "4243",  rho: "995.7" },
  { label: "Water 40°C", Pv: "7375",  rho: "992.2" },
  { label: "Water 60°C", Pv: "19940", rho: "983.2" },
  { label: "Water 80°C", Pv: "47390", rho: "971.8" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  "safe":       "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
  "marginal":   "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200",
  "high risk":  "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200",
  "cavitating": "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
};

const STATUS_BG: Record<string, string> = {
  "safe":       "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  "marginal":   "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
  "high risk":  "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
  "cavitating": "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
};

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

interface GeoBreakdown {
  pressureHeadTerm: number;
  zs: number;
  hf: number;
  npsha: number;
  psEquiv: number;
}

export default function NpshCalculator() {
  // ── shared ──────────────────────────────────────────────────────────────────
  const [mode,          setMode]          = useState<Mode>("pressure");
  const [vaporPressure, setVaporPressure] = useState("2338");
  const [vaporUnit,     setVaporUnit]     = useState<PresUnit>("Pa");
  const [fluidDensity,  setFluidDensity]  = useState("998");
  const [densUnit,      setDensUnit]      = useState<DensUnit>("kg/m³");
  const [showNpshr,     setShowNpshr]     = useState(false);
  const [npshr,         setNpshr]         = useState("3.0");
  const [errors,        setErrors]        = useState<Record<string, string>>({});

  // ── pressure mode ────────────────────────────────────────────────────────────
  const [suctionPressure, setSuctionPressure] = useState("80");
  const [presUnit,        setPresUnit]        = useState<PresUnit>("kPa");

  // ── geometry mode ────────────────────────────────────────────────────────────
  const [tankPressure,  setTankPressure]  = useState("101.325");
  const [tankPresUnit,  setTankPresUnit]  = useState<PresUnit>("kPa");
  const [staticHead,    setStaticHead]    = useState("3.0");
  const [frictionHead,  setFrictionHead]  = useState("1.5");

  // ── results ──────────────────────────────────────────────────────────────────
  const [result,       setResult]       = useState<ReturnType<typeof calculateNpsh> | null>(null);
  const [steps,        setSteps]        = useState<ReturnType<typeof generateNpshSteps> | null>(null);
  const [geoBreakdown, setGeoBreakdown] = useState<GeoBreakdown | null>(null);

  // ── unit converters ──────────────────────────────────────────────────────────
  const handlePresUnitChange = (newUnit: PresUnit) => {
    const v = parseFloat(suctionPressure);
    if (!isNaN(v)) setSuctionPressure(fmt(v * toPa[presUnit] / toPa[newUnit], 5));
    setPresUnit(newUnit);
  };
  const handleTankPresUnitChange = (newUnit: PresUnit) => {
    const v = parseFloat(tankPressure);
    if (!isNaN(v)) setTankPressure(fmt(v * toPa[tankPresUnit] / toPa[newUnit], 5));
    setTankPresUnit(newUnit);
  };
  const handleVaporUnitChange = (newUnit: PresUnit) => {
    const v = parseFloat(vaporPressure);
    if (!isNaN(v)) setVaporPressure(fmt(v * toPa[vaporUnit] / toPa[newUnit], 5));
    setVaporUnit(newUnit);
  };
  const handleDensUnitChange = (newUnit: DensUnit) => {
    const v = parseFloat(fluidDensity);
    if (!isNaN(v)) setFluidDensity(fmt(v * toKgM3[densUnit] / toKgM3[newUnit], 5));
    setDensUnit(newUnit);
  };

  const handleClear = () => {
    setSuctionPressure(""); setPresUnit("kPa");
    setTankPressure(""); setTankPresUnit("kPa");
    setVaporPressure(""); setVaporUnit("Pa");
    setFluidDensity(""); setDensUnit("kg/m³");
    setStaticHead(""); setFrictionHead("");
    setNpshr(""); setShowNpshr(false);
    setResult(null); setSteps(null); setGeoBreakdown(null);
    setErrors({});
  };

  const handleModeSwitch = (next: Mode) => {
    setMode(next);
    setResult(null); setSteps(null); setGeoBreakdown(null); setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const PvPa  = parseFloat(vaporPressure) * toPa[vaporUnit];
    const rhoSI = parseFloat(fluidDensity)  * toKgM3[densUnit];
    const nRaw  = parseFloat(npshr);

    if (isNaN(PvPa)  || PvPa  < 0)  newErrors.vaporPressure = "Must be ≥ 0";
    if (isNaN(rhoSI) || rhoSI <= 0) newErrors.fluidDensity  = "Must be positive";
    if (showNpshr && (isNaN(nRaw) || nRaw <= 0)) newErrors.npshr = "Must be positive";

    let PsSI: number;

    if (mode === "pressure") {
      const psRaw = parseFloat(suctionPressure);
      PsSI = psRaw * toPa[presUnit];
      if (isNaN(psRaw) || psRaw <= 0) newErrors.suctionPressure = "Must be positive (absolute)";
      if (!isNaN(PsSI) && !isNaN(PvPa) && PsSI <= PvPa)
        newErrors.suctionPressure = "Suction pressure must be greater than vapor pressure";
      setGeoBreakdown(null);
    } else {
      const P0Pa = parseFloat(tankPressure) * toPa[tankPresUnit];
      const zs   = parseFloat(staticHead);
      const hf   = parseFloat(frictionHead);

      if (isNaN(P0Pa) || P0Pa <= 0) newErrors.tankPressure  = "Must be positive absolute pressure";
      if (isNaN(zs))                newErrors.staticHead    = "Enter a value — use negative for suction lift";
      if (isNaN(hf) || hf < 0)     newErrors.frictionHead  = "Must be ≥ 0";

      PsSI = P0Pa + rhoSI * G * zs - rhoSI * G * hf;

      if (Object.keys(newErrors).length === 0) {
        const pressureHeadTerm = (P0Pa - PvPa) / (rhoSI * G);
        setGeoBreakdown({
          pressureHeadTerm,
          zs,
          hf,
          npsha: pressureHeadTerm + zs - hf,
          psEquiv: PsSI,
        });
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        suctionPressure: PsSI,
        vaporPressure:   PvPa,
        fluidDensity:    rhoSI,
        npshr:           showNpshr ? nRaw : undefined,
      };
      setResult(calculateNpsh(input));
      setSteps(generateNpshSteps(input, calculateNpsh(input)));
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : "An error occurred" });
      setResult(null); setSteps(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">NPSH Calculator</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Net Positive Suction Head Available — computes NPSH<sub>A</sub> and compares against
          NPSH<sub>R</sub> for cavitation risk assessment. Enter inlet pressure directly, or
          describe the installation geometry and let the calculator derive it.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded">
          Turbomachinery · Cavitation
        </span>
      </div>

      {/* Water presets */}
      <Card>
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
          Water presets — click to fill P<sub>v</sub> and ρ
        </h2>
        <div className="flex flex-wrap gap-2">
          {WATER_PRESETS.map((p) => (
            <button key={p.label}
              onClick={() => {
                setVaporPressure(p.Pv); setVaporUnit("Pa");
                setFluidDensity(p.rho); setDensUnit("kg/m³");
              }}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        {/* Mode toggle */}
        <div className="flex items-center gap-1 mb-6 p-1 bg-gray-100 dark:bg-gray-700/60 rounded-xl w-fit">
          {(["pressure", "geometry"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleModeSwitch(m)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                mode === m
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {m === "pressure" ? "Inlet pressure" : "Installation geometry"}
            </button>
          ))}
        </div>

        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── Pressure mode ─────────────────────────────────────────────── */}
          {mode === "pressure" && (
            <div>
              <InputField label="Suction pressure (absolute)" symbol="Ps" unit={presUnit}
                value={suctionPressure} onChange={setSuctionPressure}
                placeholder={presUnit === "kPa" ? "80" : presUnit === "Pa" ? "80000" : presUnit === "bar" ? "0.8" : presUnit === "atm" ? "0.79" : "11.6"}
                error={errors.suctionPressure} />
              <div className="flex gap-2 -mt-2">
                {(["Pa","kPa","bar","atm","psi"] as PresUnit[]).map(u => (
                  <Btn key={u} label={u} active={presUnit === u} onClick={() => handlePresUnitChange(u)} />
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Absolute pressure at the pump inlet flange
              </p>
            </div>
          )}

          {/* ── Geometry mode ─────────────────────────────────────────────── */}
          {mode === "geometry" && (<>
            <div>
              <InputField label="Reservoir / tank surface pressure" symbol="P₀" unit={tankPresUnit}
                value={tankPressure} onChange={setTankPressure}
                placeholder={tankPresUnit === "kPa" ? "101.325" : tankPresUnit === "Pa" ? "101325" : tankPresUnit === "bar" ? "1.01325" : tankPresUnit === "atm" ? "1.0" : "14.7"}
                error={errors.tankPressure} />
              <div className="flex gap-2 -mt-2">
                {(["Pa","kPa","bar","atm","psi"] as PresUnit[]).map(u => (
                  <Btn key={u} label={u} active={tankPresUnit === u} onClick={() => handleTankPresUnitChange(u)} />
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Absolute — use 101.325 kPa for open tank at sea level
              </p>
            </div>

            <div>
              <InputField label="Suction static head" symbol="zs" unit="m"
                value={staticHead} onChange={setStaticHead}
                placeholder="3.0"
                error={errors.staticHead} />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span className="font-semibold text-green-600 dark:text-green-400">Positive</span> if pump is <span className="font-semibold">below</span> the tank (flooded suction) ·{" "}
                <span className="font-semibold text-red-600 dark:text-red-400">Negative</span> if pump is <span className="font-semibold">above</span> (suction lift)
              </p>
            </div>

            <div>
              <InputField label="Suction pipe friction + minor losses" symbol="hf" unit="m"
                value={frictionHead} onChange={setFrictionHead}
                placeholder="1.5"
                error={errors.frictionHead} />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Total head loss in suction line — always positive, always reduces NPSH<sub>A</sub>
              </p>
            </div>
          </>)}

          {/* ── Shared: vapor pressure ────────────────────────────────────── */}
          <div>
            <InputField label="Vapor pressure of fluid" symbol="Pv" unit={vaporUnit}
              value={vaporPressure} onChange={setVaporPressure}
              placeholder={vaporUnit === "Pa" ? "2338" : vaporUnit === "kPa" ? "2.338" : "0.023"}
              error={errors.vaporPressure} />
            <div className="flex gap-2 -mt-2">
              {(["Pa","kPa","bar","psi"] as PresUnit[]).map(u => (
                <Btn key={u} label={u} active={vaporUnit === u} onClick={() => handleVaporUnitChange(u)} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              At operating temperature — use water presets above
            </p>
          </div>

          {/* ── Shared: density ──────────────────────────────────────────── */}
          <div>
            <InputField label="Fluid density" symbol="ρ" unit={densUnit}
              value={fluidDensity} onChange={setFluidDensity}
              placeholder={densUnit === "kg/m³" ? "998" : "0.998"}
              error={errors.fluidDensity} />
            <div className="flex gap-2 -mt-2">
              {(["kg/m³","g/cm³"] as DensUnit[]).map(u => (
                <Btn key={u} label={u} active={densUnit === u} onClick={() => handleDensUnitChange(u)} />
              ))}
            </div>
          </div>
        </div>

        {/* Optional NPSH_R */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-start gap-3">
            <input type="checkbox" id="showNpshr" checked={showNpshr}
              onChange={(e) => setShowNpshr(e.target.checked)}
              className="mt-3 w-4 h-4 text-blue-600 rounded" />
            <div className="flex-1">
              <label htmlFor="showNpshr" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Supply NPSH<sub>R</sub> (required) — computes margin and cavitation status
              </label>
              {showNpshr && (
                <div className="max-w-xs">
                  <InputField label="Required NPSH" symbol="NPSHr" unit="m"
                    value={npshr} onChange={setNpshr} error={errors.npshr} />
                  <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                    From pump manufacturer's curve — recommend margin of ≥ 0.5–1.0 m
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {errors.general && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.general}</p>}
        <div className="mt-4 flex gap-3">
          <button onClick={handleCalculate}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors">
            Calculate
          </button>
          <ClearButton onClear={handleClear} />
        </div>
      </Card>

      {/* Results */}
      {result && steps && (
        <ResultsCard>
          <div className="space-y-5">

            {/* Geometry breakdown (geometry mode only) */}
            {geoBreakdown && (
              <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
                  Installation geometry breakdown
                </p>
                <div className="font-mono text-sm text-gray-800 dark:text-gray-200 space-y-1">
                  <div>
                    NPSH<sub>A</sub> = (P₀ − P<sub>v</sub>) / ρg &nbsp;+&nbsp; z<sub>s</sub> &nbsp;−&nbsp; h<sub>f</sub>
                  </div>
                  <div className="pl-10 text-gray-600 dark:text-gray-400">
                    = {fmt(geoBreakdown.pressureHeadTerm)} m
                    &nbsp;{geoBreakdown.zs >= 0 ? "+" : "−"}&nbsp; {fmt(Math.abs(geoBreakdown.zs))} m
                    &nbsp;−&nbsp; {fmt(geoBreakdown.hf)} m
                  </div>
                  <div className="pl-10 font-bold text-indigo-700 dark:text-indigo-300">
                    = {fmt(geoBreakdown.npsha)} m
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Equivalent suction flange pressure: {fmt(geoBreakdown.psEquiv / 1000, 4)} kPa (abs)
                </p>
              </div>
            )}

            {/* Primary result */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  NPSH Available
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  NPSH<sub>A</sub> = {fmt(result.npsha)} m
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                  = {fmt(result.npsha * 3.28084)} ft
                  {result.margin != null && ` · margin = ${fmt(result.margin)} m`}
                </p>
              </div>
              {result.cavitationStatus && (
                <span className={`mt-1 px-3 py-1 rounded text-sm font-semibold capitalize ${STATUS_COLORS[result.cavitationStatus]}`}>
                  {result.cavitationStatus}
                </span>
              )}
            </div>

            {/* Cavitation status banner */}
            {result.cavitationStatus && result.margin != null && (
              <div className={`p-4 rounded-lg border ${STATUS_BG[result.cavitationStatus]}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  NPSH<sub>A</sub> = {fmt(result.npsha)} m &nbsp;vs&nbsp; NPSH<sub>R</sub> = {fmt(result.npshr!)} m
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {result.cavitationStatus === "cavitating"
                    ? `Margin = ${fmt(result.margin)} m — NPSH_A < NPSH_R: cavitation will occur. Increase suction head, reduce friction losses, or lower operating temperature.`
                    : result.cavitationStatus === "high risk"
                    ? `Margin = ${fmt(result.margin)} m — dangerously close to cavitation. Recommend at least 0.5 m additional margin.`
                    : result.cavitationStatus === "marginal"
                    ? `Margin = ${fmt(result.margin)} m — acceptable but consider a safety factor of NPSH_A / NPSH_R ≥ 1.1–1.3.`
                    : `Margin = ${fmt(result.margin)} m — safe operating condition.`}
                </p>
              </div>
            )}

            {/* Unit grid */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">NPSH quantities</p>
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                {[
                  { label: <span>NPSH<sub>A</sub> [m]</span>,  value: fmt(result.npsha) },
                  { label: <span>NPSH<sub>A</sub> [ft]</span>, value: fmt(result.npsha * 3.28084) },
                  { label: "Ps − Pv [kPa]",                    value: fmt(result.pressureDifference / 1000) },
                ].map(({ label, value }, i) => (
                  <div key={i} className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              {result.npshr != null && result.margin != null && (
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: <span>NPSH<sub>R</sub> [m]</span>,                                   value: fmt(result.npshr) },
                    { label: "Margin [m]",                                                          value: fmt(result.margin) },
                    { label: <span>NPSH<sub>A</sub>/NPSH<sub>R</sub></span>, value: fmt(result.npsha / result.npshr, 3) },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <StepByStep steps={steps} />
            <AssumptionsList assumptions={commonAssumptions.npsh} />
            <CommonMistakes mistakes={commonMistakes.npsh} />
          </div>
        </ResultsCard>
      )}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">From inlet pressure (direct):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono">
              NPSH<sub>A</sub> = (P<sub>s</sub> − P<sub>v</sub>) / (ρg)
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">From installation geometry:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>NPSH<sub>A</sub> = (P₀ − P<sub>v</sub>) / (ρg) + z<sub>s</sub> − h<sub>f</sub></div>
            </div>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>P₀ = pressure at reservoir surface [Pa, absolute]</li>
              <li>P<sub>v</sub> = vapor pressure at operating temperature [Pa]</li>
              <li>z<sub>s</sub> = suction static head [m] — <strong>positive</strong> if pump is below reservoir (flooded suction), <strong>negative</strong> if above (suction lift)</li>
              <li>h<sub>f</sub> = friction + minor losses in suction pipe [m] — always positive, always subtracted</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Cavitation criterion and safety margin:</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  {["Margin (NPSH_A − NPSH_R)", "NPSH_A / NPSH_R", "Status"].map(h => (
                    <th key={h} className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { m: "< 0 m",        r: "< 1.0",     s: "Cavitating — immediate damage risk" },
                  { m: "0 to 0.5 m",   r: "≈ 1.0",     s: "High risk — increase margin urgently" },
                  { m: "0.5 to 1.0 m", r: "1.05–1.1",  s: "Marginal — monitor closely" },
                  { m: "> 1.0 m",      r: "> 1.1",     s: "Safe — recommended operating zone" },
                ].map(({ m, r, s }) => (
                  <tr key={m}>
                    <td className="py-1.5 pr-3 font-mono">{m}</td>
                    <td className="py-1.5 pr-3 font-mono">{r}</td>
                    <td className="py-1.5">{s}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Water vapor pressure at key temperatures:</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  {["T [°C]", "Pv [kPa]", "ρ [kg/m³]", "Pv head [m]"].map(h => (
                    <th key={h} className="text-left py-1.5 pr-3 font-semibold text-gray-900 dark:text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { T: "20",  Pv: "2.34",  rho: "998",  h: "0.24" },
                  { T: "40",  Pv: "7.38",  rho: "992",  h: "0.76" },
                  { T: "60",  Pv: "19.9",  rho: "983",  h: "2.07" },
                  { T: "80",  Pv: "47.4",  rho: "972",  h: "4.97" },
                  { T: "100", Pv: "101.3", rho: "958",  h: "10.8" },
                ].map(({ T, Pv, rho, h }) => (
                  <tr key={T}>
                    <td className="py-1.5 pr-3 font-mono">{T}</td>
                    <td className="py-1.5 pr-3 font-mono">{Pv}</td>
                    <td className="py-1.5 pr-3 font-mono">{rho}</td>
                    <td className="py-1.5 font-mono">{h}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            Cavitation occurs when local pressure drops below P<sub>v</sub>, forming vapor bubbles
            that implode as pressure recovers — causing noise, vibration, impeller pitting, and
            head loss. Always design for NPSH<sub>A</sub> &gt; NPSH<sub>R</sub> with an adequate
            safety margin, especially for hot liquids where P<sub>v</sub> is high.
          </p>
        </div>
      </Card>

      <References refs={REFS_NPSH} />
    </div>
  );
}
