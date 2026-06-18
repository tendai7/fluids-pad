"use client";

import React, { useState } from "react";
import { Card } from "@/components/Card";
import { References } from "@/components/References";
import { REFS_HEAT_TRANSFER_NUMBERS } from "@/lib/references";
import { InputField } from "@/components/InputField";
import { ResultsCard } from "@/components/ResultsCard";
import { StepByStep } from "@/components/StepByStep";
import { AssumptionsList } from "@/components/AssumptionsList";
import { CommonMistakes } from "@/components/CommonMistakes";
import {
  calculateNaturalConvectionPlate,
  generateNaturalConvectionPlateSteps,
  commonAssumptions,
  commonMistakes,
} from "@/lib/fluids";
import { ClearButton } from "@/components/ClearButton";

type TempUnit = "°C" | "°F" | "K";
type LenUnit  = "m" | "mm" | "cm" | "ft";

function toC(v: number, u: TempUnit): number {
  if (u === "°F") return (v - 32) * 5 / 9;
  if (u === "K")  return v - 273.15;
  return v;
}

function fromC(c: number, u: TempUnit): number {
  if (u === "°F") return c * 9 / 5 + 32;
  if (u === "K")  return c + 273.15;
  return c;
}
const toLm: Record<LenUnit, number> = { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048 };

// Fluid presets at film temperature: [label, β 1/K, ν m²/s, α m²/s, k W/(m·K)]
const FLUID_PRESETS = [
  { label: "Air at T_film = 40 °C  (β=1/313 K)",  beta: "3.19e-3", nu: "1.696e-5", alpha: "2.39e-5", k: "0.0272" },
  { label: "Air at T_film = 60 °C  (β=1/333 K)",  beta: "3.00e-3", nu: "1.896e-5", alpha: "2.69e-5", k: "0.0290" },
  { label: "Air at T_film = 100 °C (β=1/373 K)",  beta: "2.68e-3", nu: "2.306e-5", alpha: "3.28e-5", k: "0.0314" },
  { label: "Water at T_film = 40 °C",             beta: "3.85e-4", nu: "6.31e-7",  alpha: "1.52e-7", k: "0.631"  },
  { label: "Water at T_film = 60 °C",             beta: "5.23e-4", nu: "4.75e-7",  alpha: "1.59e-7", k: "0.651"  },
  { label: "Engine oil at T_film = 40 °C",        beta: "7.0e-4",  nu: "1.05e-4",  alpha: "8.7e-8",  k: "0.144"  },
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

export default function NaturalConvectionPlateCalculator() {
  const [tempUnit,  setTempUnit]  = useState<TempUnit>("°C");
  const [lenUnit,   setLenUnit]   = useState<LenUnit>("m");
  const [Tw,        setTw]        = useState("60");
  const [Tinf,      setTinf]      = useState("20");
  const [L,         setL]         = useState("0.5");
  const [beta,      setBeta]      = useState("3.19e-3");
  const [nu,        setNu]        = useState("1.696e-5");
  const [alpha,     setAlpha]     = useState("2.39e-5");
  const [k,         setK]         = useState("0.0272");
  const [showK,     setShowK]     = useState(false);
  const [autoBeta,  setAutoBeta]  = useState(false);
  const [selected,  setSelected]  = useState("Air at T_film = 40 °C  (β=1/313 K)");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof calculateNaturalConvectionPlate> | null>(null);
  const [steps,  setSteps]  = useState<ReturnType<typeof generateNaturalConvectionPlateSteps> | null>(null);

  const applyPreset = (label: string) => {
    setSelected(label);
    const p = FLUID_PRESETS.find(x => x.label === label);
    if (!p) return;
    setBeta(p.beta);
    setNu(p.nu);
    setAlpha(p.alpha);
    setK(p.k);
  };

  const handleClear = () => {
    setTempUnit("°C");
    setLenUnit("m");
    setTw("");
    setTinf("");
    setL("");
    setBeta("");
    setNu("");
    setAlpha("");
    setK("");
    setSelected("");
    setShowK(false);
    setAutoBeta(false);
    setResult(null);
    setSteps(null);
    setErrors({});
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    const TwC   = toC(parseFloat(Tw),   tempUnit);
    const TinfC = toC(parseFloat(Tinf), tempUnit);
    const LSI   = parseFloat(L)     * toLm[lenUnit];
    const nuVal = parseFloat(nu);
    const alpVal= parseFloat(alpha);
    const kVal  = parseFloat(k);

    // β: either manual or auto-computed from film temperature
    const TfilmC = (TwC + TinfC) / 2;
    const betaVal = autoBeta
      ? 1 / (TfilmC + 273.15)
      : parseFloat(beta);

    if (isNaN(TwC))            newErrors.Tw   = "Required";
    if (isNaN(TinfC))          newErrors.Tinf = "Required";
    if (!isNaN(TwC) && !isNaN(TinfC) && Math.abs(TwC - TinfC) < 0.01)
      newErrors.Tw = "Wall and ambient temperatures must differ";
    if (isNaN(LSI)   || LSI   <= 0) newErrors.L    = "Must be a positive number";
    if (!autoBeta && (isNaN(betaVal) || betaVal <= 0)) newErrors.beta = "Must be a positive number";
    if (isNaN(nuVal) || nuVal  <= 0) newErrors.nu   = "Must be a positive number";
    if (isNaN(alpVal)|| alpVal <= 0) newErrors.alpha= "Must be a positive number";
    if (showK && (isNaN(kVal) || kVal <= 0)) newErrors.k = "Must be a positive number";

    setErrors(newErrors);
    if (Object.keys(newErrors).length) { setResult(null); setSteps(null); return; }

    try {
      const input = {
        length:             LSI,
        wallTemperature:    TwC,
        ambientTemperature: TinfC,
        thermalExpansion:   betaVal,
        kinematicViscosity: nuVal,
        thermalDiffusivity: alpVal,
        thermalConductivity: showK ? kVal : undefined,
      };
      const calc = calculateNaturalConvectionPlate(input);
      const stp  = generateNaturalConvectionPlateSteps(input, calc);
      setResult(calc);
      setSteps(stp);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Calculation error" });
      setResult(null); setSteps(null);
    }
  };

  const raVal = result?.rayleighNumber ?? 0;
  const regimeBg =
    raVal < 1e4
      ? "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-600"
      : raVal < 1e9
      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";

  const autoBetaDisplay = (() => {
    const TwC   = toC(parseFloat(Tw),   tempUnit);
    const TinfC = toC(parseFloat(Tinf), tempUnit);
    if (isNaN(TwC) || isNaN(TinfC)) return null;
    const Tf = (TwC + TinfC) / 2;
    return (1 / (Tf + 273.15)).toExponential(4);
  })();

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Natural Convection — Vertical Plate
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Churchill-Chu correlation for free convection on an isothermal vertical surface.
          Computes Gr, Ra, Pr, Nu, and optionally h = Nu × k / L across laminar and turbulent regimes.
        </p>
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">
          Heat Transfer · Natural Convection
        </span>
      </div>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Inputs</h2>

        {/* Fluid presets */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Fluid preset at film temperature (fills β, ν, α, k):
          </p>
          <select
            value={selected}
            onChange={(e) => applyPreset(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a fluid…</option>
            {FLUID_PRESETS.map(p => (
              <option key={p.label} value={p.label}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Temperature unit toggle */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Temperature units:</p>
          <div className="flex gap-2">
            {(["°C", "°F", "K"] as TempUnit[]).map(u => (
              <Btn key={u} label={u} active={tempUnit === u} onClick={() => {
                const conv = (v: string) => {
                  const raw = parseFloat(v);
                  return isNaN(raw) ? v : parseFloat(fromC(toC(raw, tempUnit), u).toPrecision(6)).toString();
                };
                setTw(conv(Tw)); setTinf(conv(Tinf));
                setTempUnit(u);
              }} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Temperatures */}
          <div>
            <InputField label="Wall temperature" symbol="Tw" unit={tempUnit}
              value={Tw} onChange={setTw} error={errors.Tw} />
          </div>
          <div>
            <InputField label="Ambient temperature" symbol="T∞" unit={tempUnit}
              value={Tinf} onChange={setTinf} error={errors.Tinf} />
          </div>

          {/* Plate height */}
          <div>
            <InputField label="Plate height" symbol="L" unit={lenUnit}
              value={L} onChange={setL}
              placeholder={lenUnit === "m" ? "0.5" : lenUnit === "mm" ? "500" : lenUnit === "cm" ? "50" : "1.64"}
              error={errors.L} />
            <div className="flex flex-wrap gap-2 -mt-2">
              {(["m", "mm", "cm", "ft"] as LenUnit[]).map(u => (
                <Btn key={u} label={u} active={lenUnit === u} onClick={() => {
                  const raw = parseFloat(L);
                  if (!isNaN(raw)) {
                    const converted = raw * toLm[lenUnit] / toLm[u];
                    setL(parseFloat(converted.toPrecision(6)).toString());
                  }
                  setLenUnit(u);
                }} />
              ))}
            </div>
          </div>

          {/* β */}
          <div>
            <InputField label="Thermal expansion coefficient" symbol="β" unit="1/K"
              value={autoBeta ? (autoBetaDisplay ?? beta) : beta}
              onChange={autoBeta ? () => {} : setBeta}
              error={errors.beta} />
            <div className="flex items-center gap-2 mt-1">
              <input type="checkbox" id="autoBeta" checked={autoBeta}
                onChange={(e) => setAutoBeta(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded" />
              <label htmlFor="autoBeta" className="text-xs text-gray-600 dark:text-gray-400">
                Auto-compute β = 1/T<sub>film</sub> (ideal gas)
                {autoBeta && autoBetaDisplay && (
                  <span className="ml-1 font-mono text-blue-600 dark:text-blue-400">→ {autoBetaDisplay} 1/K</span>
                )}
              </label>
            </div>
          </div>

          {/* ν */}
          <div>
            <InputField label="Kinematic viscosity" symbol="ν" unit="m²/s"
              value={nu} onChange={setNu} error={errors.nu} />
          </div>

          {/* α */}
          <div>
            <InputField label="Thermal diffusivity" symbol="α" unit="m²/s"
              value={alpha} onChange={setAlpha} error={errors.alpha} />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Pr = ν/α is computed automatically
            </p>
          </div>
        </div>

        {/* Optional k for h */}
        <div className="mt-5 border-t border-gray-200 dark:border-gray-600 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="showK" checked={showK}
              onChange={(e) => setShowK(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="showK" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Also compute h = Nu × k / L — enter fluid thermal conductivity k
            </label>
          </div>
          {showK && (
            <div className="max-w-xs">
              <InputField label="Fluid thermal conductivity" symbol="k" unit="W/(m·K)"
                value={k} onChange={setK} error={errors.k} />
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
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                  Nusselt number  Nu (Churchill-Chu)
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  Nu = {fmt(result.nusseltNumber, 5)}
                </p>
                {result.heatTransferCoeff !== undefined && (
                  <p className="text-base text-gray-500 dark:text-gray-400 mt-0.5">
                    h = {fmt(result.heatTransferCoeff, 5)} W/(m²·K)
                  </p>
                )}
              </div>

              {/* Unit grid */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 pt-2 pb-1">
                  Natural convection quantities
                </p>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {[
                    { label: "Ra",   value: fmt(result.rayleighNumber, 5) },
                    { label: "Gr",   value: fmt(result.grashofNumber,  5) },
                    { label: "Pr",   value: fmt(result.prandtlNumber,  5) },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-600 border-t border-gray-200 dark:border-gray-600">
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Nu</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(result.nusseltNumber, 5)}
                    </p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">ΔT [K]</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {fmt(result.deltaT, 4)}
                    </p>
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                      {result.heatTransferCoeff !== undefined ? "h [W/(m²·K)]" : <>T<sub>film</sub> [°C]</>}
                    </p>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {result.heatTransferCoeff !== undefined
                        ? fmt(result.heatTransferCoeff, 5)
                        : fmt(result.filmTemperature, 4)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Regime banner */}
              <div className={`p-4 rounded-lg border ${regimeBg}`}>
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {raVal < 1e4
                    ? "Negligible natural convection (Ra < 10⁴)"
                    : raVal < 1e9
                    ? "Laminar natural convection (Ra < 10⁹) — Churchill-Chu laminar form"
                    : "Turbulent natural convection (Ra > 10⁹) — Churchill-Chu all-range form"}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.interpretation}</p>
              </div>

              <StepByStep steps={steps} />
              <AssumptionsList assumptions={commonAssumptions.naturalConvectionPlate} />
              <CommonMistakes mistakes={commonMistakes.naturalConvectionPlate} />
            </div>
          </ResultsCard>
        );
      })()}

      {/* Theory */}
      <Card>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Theory</h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">

          <div>
            <p className="font-semibold mb-2">Dimensionless groups:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Gr = g × β × ΔT × L³ / ν²&nbsp;&nbsp;&nbsp;&nbsp;[Grashof — buoyancy vs viscous]</div>
              <div>Ra = Gr × Pr = g × β × ΔT × L³ / (ν × α)&nbsp;&nbsp;&nbsp;[Rayleigh]</div>
              <div>Pr = ν / α&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Prandtl — from inputs]</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Churchill-Chu correlation:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">Laminar  (Ra &lt; 10⁹):</div>
              <div>Nu = 0.68 + 0.670 Ra^(1/4) / [1 + (0.492/Pr)^(9/16)]^(4/9)</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-1">All-range  (Ra ≥ 10⁹, or preferred form for all Ra):</div>
              <div>Nu = &#123;0.825 + 0.387 Ra^(1/6) / [1 + (0.492/Pr)^(9/16)]^(8/27)&#125;²</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Thermal expansion coefficient β:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Ideal gas:  β = 1 / T<sub>film</sub>  (T<sub>film</sub> in Kelvin)</div>
              <div>T<sub>film</sub> = (T<sub>wall</sub> + T<sub>ambient</sub>) / 2</div>
              <div>Liquids: use tabulated β — do NOT use ideal-gas formula</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Regime thresholds:</p>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono space-y-1">
              <div>Ra &lt; 10⁴&nbsp;&nbsp;&nbsp;negligible natural convection</div>
              <div>10⁴ – 10⁹&nbsp;laminar boundary layer on plate</div>
              <div>Ra &gt; 10⁹&nbsp;&nbsp;&nbsp;turbulent natural convection</div>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Orientation matters — characteristic length L:</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">Geometry</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-gray-900 dark:text-white">L</th>
                  <th className="text-left py-1.5 font-semibold text-gray-900 dark:text-white">Correlation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { geo: "Vertical plate / wall",    L: "height H",        corr: "Churchill-Chu (this calculator)" },
                  { geo: "Vertical cylinder",        L: "height H",        corr: "Churchill-Chu (if D/H ≥ 35/Gr^0.25)" },
                  { geo: "Horizontal cylinder",      L: "diameter D",      corr: "Churchill-Bernstein" },
                  { geo: "Sphere",                   L: "diameter D",      corr: "Churchill" },
                  { geo: "Horizontal plate (hot up)",L: "area/perimeter A/P", corr: "McAdams: Nu = 0.54 Ra^(1/4) laminar" },
                ].map(({ geo, L, corr }) => (
                  <tr key={geo}>
                    <td className="py-1.5 pr-4">{geo}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{L}</td>
                    <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{corr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
      <References refs={REFS_HEAT_TRANSFER_NUMBERS} />
    </div>
  );
}