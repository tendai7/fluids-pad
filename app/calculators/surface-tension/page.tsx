"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { InputField } from "@/components/InputField";
import { References } from "@/components/References";
import { REFS_SURFACE_TENSION } from "@/lib/references";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateSurfaceTension,
  generateSurfaceTensionSteps,
  commonAssumptions,
  commonMistakes,
  type SurfaceTensionMode,
  type SurfacePressureShape,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type LenUnit = "m" | "mm" | "μm" | "cm" | "inch" | "ft";
const toLm: Record<LenUnit, number> = { m: 1, mm: 1e-3, "μm": 1e-6, cm: 1e-2, inch: 0.0254, ft: 0.3048 };

type SigUnit = "N/m" | "mN/m" | "dyn/cm";
const toSigSI: Record<SigUnit, number> = { "N/m": 1, "mN/m": 1e-3, "dyn/cm": 1e-3 };

const SIGMA_PRESETS = [
  { label: "Water / air at 20°C",   sigma: "0.0728" },
  { label: "Water / air at 60°C",   sigma: "0.0663" },
  { label: "Ethanol / air",         sigma: "0.0223" },
  { label: "Mercury / air",         sigma: "0.487"  },
  { label: "Glycerin / air",        sigma: "0.0634" },
  { label: "Soap film (approx.)",   sigma: "0.035"  },
  { label: "Liquid steel",          sigma: "1.8"    },
] as const;

const CONTACT_ANGLE_PRESETS = [
  { label: "Water on clean glass (θ = 0°)",      angle: "0"   },
  { label: "Water on stainless steel (θ = 60°)", angle: "60"  },
  { label: "Water on wax (θ = 105°)",            angle: "105" },
  { label: "Mercury on glass (θ = 140°)",        angle: "140" },
] as const;

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

function ModeBtn({ label, desc, active, onClick }: { label: string; desc: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-2.5 px-3 text-sm rounded-md border text-left transition-colors ${active
        ? "bg-blue-600 text-white border-blue-600"
        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
      <div className="font-medium">{label}</div>
      <div className={`text-xs mt-0.5 ${active ? "text-blue-200" : "text-gray-400 dark:text-gray-500"}`}>{desc}</div>
    </button>
  );
}

export default function SurfaceTensionCalculator() {
  const [mode,          setMode]          = useState<SurfaceTensionMode>("contactLine");
  const [sigma,         setSigma]         = useState("0.0728");
  const [sigUnit,       setSigUnit]       = useState<SigUnit>("N/m");
  const [selectedSigma, setSelectedSigma] = useState("Water / air at 20°C");

  // Contact line / wire inputs
  const [length,        setLength]        = useState("10");
  const [lenUnit,       setLenUnit]       = useState<LenUnit>("mm");
  const [contactAngle,  setContactAngle]  = useState("0");

  // Pressure mode inputs
  const [radius,        setRadius]        = useState("1");
  const [radUnit,       setRadUnit]       = useState<LenUnit>("mm");
  const [pressShape,    setPressShape]    = useState<SurfacePressureShape>("droplet");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateSurfaceTension> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateSurfaceTensionSteps> | null>(null);

  const handleClear = () => {
    setMode("contactLine");
    setSigma("");
    setSigUnit("N/m");
    setSelectedSigma("");
    setLength("");
    setLenUnit("mm");
    setContactAngle("");
    setRadius("");
    setRadUnit("mm");
    setPressShape("droplet");
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const sigRaw = parseFloat(sigma) * toSigSI[sigUnit];
    const lRaw   = parseFloat(length);
    const rRaw   = parseFloat(radius);
    const aRaw   = parseFloat(contactAngle);

    if (isNaN(sigRaw) || sigRaw <= 0) newErrors.sigma = "Must be a positive number";
    if (mode !== "pressure") {
      if (isNaN(lRaw) || lRaw <= 0) newErrors.length = "Must be a positive number";
      if (isNaN(aRaw) || aRaw < 0 || aRaw > 180) newErrors.contactAngle = "Must be 0–180°";
    } else {
      if (isNaN(rRaw) || rRaw <= 0) newErrors.radius = "Must be a positive number";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    const lSI = lRaw * toLm[lenUnit];
    const rSI = rRaw * toLm[radUnit];

    try {
      const input = {
        mode, surfaceTension: sigRaw,
        ...(mode !== "pressure" ? { length: lSI, contactAngle: aRaw } : {}),
        ...(mode === "pressure"  ? { radius: rSI, pressureShape: pressShape } : {}),
      };
      const calc = calculateSurfaceTension(input as Parameters<typeof calculateSurfaceTension>[0]);
      const stp  = generateSurfaceTensionSteps(input as Parameters<typeof calculateSurfaceTension>[0], calc);
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
          Surface Tension Force Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Force along a contact line, wire/film pull force, or excess pressure inside a
          bubble/droplet from the Young-Laplace equation.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
          Fluid Mechanics II
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Mode selector */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Calculation type:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <ModeBtn label="Contact line"       desc="F = σL cosθ — single surface"  active={mode === "contactLine"} onClick={() => setMode("contactLine")} />
            <ModeBtn label="Wire / thin film"   desc="F = 2σL cosθ — two surfaces"   active={mode === "wire"}        onClick={() => setMode("wire")} />
            <ModeBtn label="Bubble / droplet"   desc="ΔP = nσ/R — Young-Laplace"     active={mode === "pressure"}   onClick={() => setMode("pressure")} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Surface tension — always shown */}
          <div>
            <InputField label="Surface tension" symbol="σ" unit={sigUnit}
              value={sigma} onChange={setSigma} error={errors.sigma} />
            <div className="flex flex-wrap gap-2 -mt-2 mb-2">
              {(["N/m", "mN/m", "dyn/cm"] as SigUnit[]).map(u => (
                <Btn key={u} label={u} active={sigUnit === u} onClick={() => {
                  const currentSI = parseFloat(sigma) * toSigSI[sigUnit];
                  setSigUnit(u);
                  if (!isNaN(currentSI)) setSigma(fmt(currentSI / toSigSI[u], 5));
                }} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedSigma}
                onChange={(e) => {
                  const lbl = e.target.value;
                  setSelectedSigma(lbl);
                  const p = SIGMA_PRESETS.find(x => x.label === lbl);
                  if (p) setSigma(fmt(parseFloat(p.sigma) / toSigSI[sigUnit], 5));
                }}
                className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Fluid pair preset…</option>
                {SIGMA_PRESETS.map(p => (
                  <option key={p.label} value={p.label}>{p.label} — σ = {p.sigma} N/m</option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact line / wire inputs */}
          {mode !== "pressure" && (
            <>
              <div>
                <InputField label="Contact line length" symbol="L" unit={lenUnit}
                  value={length} onChange={setLength}
                  placeholder={lenUnit === "m" ? "0.01" : lenUnit === "mm" ? "10" : lenUnit === "μm" ? "10000" : lenUnit === "cm" ? "1" : lenUnit === "ft" ? "0.033" : "0.394"}
                  error={errors.length} />
                <div className="flex flex-wrap gap-2 -mt-2">
                  {(["m", "mm", "μm", "cm", "inch", "ft"] as LenUnit[]).map(u => (
                    <Btn key={u} label={u} active={lenUnit === u} onClick={() => setLenUnit(u)} />
                  ))}
                </div>
                {mode === "wire" && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">L = wire/plate length. Factor 2 is applied automatically.</p>
                )}
              </div>
              <div>
                <InputField label="Contact angle" symbol="θ" unit="degrees"
                  value={contactAngle} onChange={setContactAngle} error={errors.contactAngle} />
                <div className="flex items-center gap-2 -mt-2">
                  <select
                    onChange={(e) => {
                      const p = CONTACT_ANGLE_PRESETS.find(x => x.label === e.target.value);
                      if (p) setContactAngle(p.angle);
                    }}
                    className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Contact angle preset…</option>
                    {CONTACT_ANGLE_PRESETS.map(p => (
                      <option key={p.label} value={p.label}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  0° = complete wetting. 90° = zero vertical force. 180° = complete non-wetting.
                </p>
              </div>
            </>
          )}

          {/* Pressure mode inputs */}
          {mode === "pressure" && (
            <>
              <div>
                <InputField label="Sphere / cylinder radius" symbol="R" unit={radUnit}
                  value={radius} onChange={setRadius}
                  placeholder={radUnit === "m" ? "0.001" : radUnit === "mm" ? "1" : radUnit === "cm" ? "0.1" : "1000"}
                  error={errors.radius} />
                <div className="flex flex-wrap gap-2 -mt-2">
                  {(["m", "mm", "μm", "cm"] as LenUnit[]).map(u => (
                    <Btn key={u} label={u} active={radUnit === u} onClick={() => setRadUnit(u)} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Geometry (sets factor n):</p>
                <div className="space-y-2">
                  {([
                    { val: "bubble",   label: "Spherical bubble — ΔP = 4σ/R (gas in liquid, 2 interfaces)" },
                    { val: "droplet",  label: "Spherical droplet — ΔP = 2σ/R (liquid in gas, 1 interface)" },
                    { val: "cylinder", label: "Cylindrical jet — ΔP = σ/R (1 curved surface)" },
                  ] as { val: SurfacePressureShape; label: string }[]).map(({ val, label }) => (
                    <label key={val} className="flex items-start gap-2.5 cursor-pointer">
                      <input type="radio" name="shape" checked={pressShape === val}
                        onChange={() => setPressShape(val)} className="mt-0.5 text-blue-600" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                    </label>
                  ))}
                </div>
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
        const isForce = result.force !== undefined;
        const F  = result.force ?? 0;
        const DP = result.pressureDiff ?? 0;

        const fUnits: [string, number][] = [
          ["N",   F],
          ["mN",  F * 1000],
          ["μN",  F * 1e6],
          ["lbf", F / 4.44822],
        ];
        const pUnits: [string, number][] = [
          ["Pa",  DP],
          ["kPa", DP / 1000],
          ["bar", DP / 1e5],
          ["psi", DP / 6894.76],
        ];

        return (
          <ResultsCard>
            <div className="space-y-5">

              {/* Primary */}
              <div>
                {isForce ? (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Surface tension force  {mode === "wire" ? "F = 2σL cosθ" : "F = σL cosθ"}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {fmt(F, 5)} N
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      {fmt(F * 1000, 4)} mN&nbsp;&nbsp;|&nbsp;&nbsp;cosθ = {result.cosTheta !== undefined ? fmt(result.cosTheta, 4) : "—"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                      Excess pressure  ΔP = {pressShape === "bubble" ? "4σ/R" : pressShape === "droplet" ? "2σ/R" : "σ/R"}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {fmt(DP, 5)} Pa
                    </p>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                      {fmt(DP / 1000, 4)} kPa
                    </p>
                  </>
                )}
              </div>

              {/* Unit grid */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  {isForce ? "Force in other units" : "Pressure in other units"}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {(isForce ? fUnits : pUnits).map(([unit, value]) => (
                    <div key={unit} className="px-2 py-2 bg-gray-50 dark:bg-gray-700/40 rounded border border-gray-200 dark:border-gray-600 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{unit}</p>
                      <p className="font-mono font-semibold text-sm text-gray-900 dark:text-white">{fmt(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interpretation */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.surfaceTension} />
              <CommonMistakes mistakes={commonMistakes.surfaceTension} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Surface tension force along a contact line:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>F = σ × L × cosθ&nbsp;&nbsp;&nbsp;&nbsp;[N]&nbsp;&nbsp;single surface</div>
              <div>F = 2σ × L × cosθ&nbsp;&nbsp;&nbsp;[N]&nbsp;&nbsp;wire / thin film (both sides)</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Young-Laplace pressure (excess pressure inside):</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>ΔP = 4σ / R&nbsp;&nbsp;&nbsp;[Pa]&nbsp;&nbsp;spherical bubble (2 interfaces)</div>
              <div>ΔP = 2σ / R&nbsp;&nbsp;&nbsp;[Pa]&nbsp;&nbsp;spherical droplet (1 interface)</div>
              <div>ΔP = σ / R&nbsp;&nbsp;&nbsp;&nbsp;[Pa]&nbsp;&nbsp;cylindrical jet (1 curved surface)</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Contact angle interpretation:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">θ range</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Wetting behaviour</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ["θ = 0°",          "Complete wetting — surface fully wetted (water on clean glass)"],
                  ["0° < θ < 90°",    "Partial wetting — hydrophilic surface, capillary rise"],
                  ["θ = 90°",         "Neutral — no net vertical force, flat meniscus"],
                  ["90° < θ < 180°",  "Partial non-wetting — hydrophobic surface, capillary depression"],
                  ["θ = 180°",        "Complete non-wetting — superhydrophobic surface"],
                ].map(([t, b]) => (
                  <tr key={t}>
                    <td className="py-1.5 pr-4 font-mono">{t}</td>
                    <td className="py-1.5 text-xs">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Common surface tension values σ (N/m) at 20°C:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Fluid pair</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">σ (N/m)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {SIGMA_PRESETS.map(({ label, sigma }) => (
                  <tr key={label}>
                    <td className="py-1.5 pr-4">{label}</td>
                    <td className="py-1.5 font-mono">{sigma}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-2">Where:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>σ = surface tension coefficient [N/m]</li>
              <li>L = length of contact line (perimeter) [m]</li>
              <li>θ = contact angle [°]</li>
              <li>R = sphere/cylinder radius [m]</li>
              <li>ΔP = excess pressure inside the bubble/droplet [Pa]</li>
            </ul>
          </div>
        </div>
      </Card>

      <References refs={REFS_SURFACE_TENSION} />
    </div>
  );
}
