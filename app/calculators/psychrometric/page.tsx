"use client";
import { useState, useMemo } from "react";
import { References } from "@/components/References";
import { REFS_PSYCHROMETRIC } from "@/lib/references";

// ---- Psychrometric core (SI, moist air at 1 atm or arbitrary P) ----

const R_DA  = 287.058; // J/(kg·K) dry air
const R_W   = 461.522; // J/(kg·K) water vapour
const CP_DA = 1006.0;  // J/(kg·K)
const CP_WV = 1860.0;  // J/(kg·K) vapour
const CP_LW = 4186.0;  // J/(kg·K) liquid water
const H_FG0 = 2501000; // J/kg  enthalpy of vaporisation at 0°C

// Antoine / Buck equation: saturation pressure [Pa] at T [°C]
function pSat(T_C: number): number {
  // Buck equation (improved Antoine), valid -40…80°C
  const T = T_C;
  if (T >= 0) return 611.21 * Math.exp((18.678 - T / 234.5) * (T / (257.14 + T)));
  // Ice surface (sub-zero)
  return 611.15 * Math.exp((23.036 - T / 333.7) * (T / (279.82 + T)));
}

// Dew-point from partial vapour pressure [Pa] — invert Buck (above 0°C branch)
function dewPoint(pW_Pa: number): number {
  if (pW_Pa <= 0) return -273.15;
  // Newton inversion of Buck
  let Td = 10;
  for (let i = 0; i < 50; i++) {
    const f  = pSat(Td) - pW_Pa;
    const df = pSat(Td + 0.001) - pSat(Td - 0.001); // numerical deriv (Δ=0.001°C)
    const dT = f / (df / 0.002);
    Td -= dT;
    if (Math.abs(dT) < 1e-7) break;
  }
  return Td;
}

// Humidity ratio W [kg_w/kg_da] from partial pressure pW [Pa] at total pressure P [Pa]
function humidityRatio(pW_Pa: number, P_Pa: number): number {
  return 0.62198 * pW_Pa / (P_Pa - pW_Pa);
}

// Partial vapour pressure from W and P
function vapourPressure(W: number, P_Pa: number): number {
  return W * P_Pa / (0.62198 + W);
}

// Enthalpy of moist air [J/kg_da]
function enthalpy(T_C: number, W: number): number {
  return CP_DA * T_C + W * (H_FG0 + CP_WV * T_C);
}

// Specific volume [m³/kg_da] at dry-bulb T and humidity ratio W
function specificVolume(T_C: number, W: number, P_Pa: number): number {
  return (R_DA * (T_C + 273.15) / P_Pa) * (1 + W / 0.62198);
}

// Wet-bulb temperature via psychrometric equation (Sprung/ASHRAE)
// Given dry-bulb T_DB [°C], W_DB at dry-bulb, returns W_WB at wet-bulb
function wFromWetBulb(T_DB: number, T_WB: number, P_Pa: number): number {
  const pSatWB = pSat(T_WB);
  const W_WB   = humidityRatio(pSatWB, P_Pa);
  // ASHRAE psychrometric constant A = 6.6e-4 for aspirated psychrometer
  const A = T_DB >= 0 ? 6.6e-4 : 5.94e-4; // above/below freezing
  return W_WB - A * (T_DB - T_WB);
}

type InputMode = "rh" | "wetbulb" | "dewpoint" | "W";

function fmt(v: number, d = 2): string {
  if (!isFinite(v) || isNaN(v)) return "—";
  return v.toFixed(d);
}

function Field({ label, value, onChange, unit }: {
  label: string; value: string; onChange: (s: string) => void; unit?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <div className="flex">
        <input
          type="number" step="any" value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 rounded-l border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {unit && (
          <span className="inline-flex items-center px-3 rounded-r border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-sm whitespace-nowrap">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function PropRow({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {value}{unit ? <span className="font-normal text-gray-500 dark:text-gray-400 ml-1">{unit}</span> : null}
      </span>
    </div>
  );
}

function ResultCard({ label, value, unit, highlight }: {
  label: string; value: string; unit?: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800" : "bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className={`text-lg font-semibold ${highlight ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-gray-100"}`}>
        {value}
        {unit && <span className="text-sm font-normal ml-1 text-gray-500 dark:text-gray-400">{unit}</span>}
      </p>
    </div>
  );
}

const INPUT_MODES: { id: InputMode; label: string }[] = [
  { id: "rh",       label: "Relative Humidity %" },
  { id: "wetbulb",  label: "Wet-bulb Temp" },
  { id: "dewpoint", label: "Dew-point Temp" },
  { id: "W",        label: "Humidity Ratio" },
];

export default function PsychrometricPage() {
  const [inputMode, setInputMode] = useState<InputMode>("rh");
  const [TdbStr, setTdbStr] = useState("25");   // dry-bulb °C
  const [rhStr,  setRhStr]  = useState("60");   // %
  const [TwbStr, setTwbStr] = useState("19.5"); // wet-bulb °C
  const [TdpStr, setTdpStr] = useState("16.7"); // dew-point °C
  const [WStr,   setWStr]   = useState("12.0"); // g/kg
  const [PStr,   setPStr]   = useState("101325"); // Pa

  const res = useMemo(() => {
    const Tdb = parseFloat(TdbStr);
    const P   = parseFloat(PStr);
    if (!isFinite(Tdb) || !isFinite(P) || P <= 0) return null;

    const pSatDB = pSat(Tdb);
    let pW = 0;

    if (inputMode === "rh") {
      const rh = parseFloat(rhStr);
      if (!isFinite(rh) || rh < 0 || rh > 100) return null;
      pW = (rh / 100) * pSatDB;
    } else if (inputMode === "wetbulb") {
      const Twb = parseFloat(TwbStr);
      if (!isFinite(Twb) || Twb > Tdb) return null;
      const W = wFromWetBulb(Tdb, Twb, P);
      if (W < 0) return null;
      pW = vapourPressure(W, P);
    } else if (inputMode === "dewpoint") {
      const Tdp = parseFloat(TdpStr);
      if (!isFinite(Tdp) || Tdp > Tdb) return null;
      pW = pSat(Tdp);
    } else {
      const Wg = parseFloat(WStr); // g/kg → kg/kg
      if (!isFinite(Wg) || Wg < 0) return null;
      pW = vapourPressure(Wg / 1000, P);
    }

    if (pW > pSatDB) return null; // supersaturated

    const W    = humidityRatio(pW, P);            // kg/kg_da
    const phi  = pW / pSatDB * 100;               // RH %
    const Tdp  = dewPoint(pW);                    // °C
    const h    = enthalpy(Tdb, W);                // J/kg_da
    const v    = specificVolume(Tdb, W, P);       // m³/kg_da
    const rho  = (1 + W) / v;                     // kg_ma/m³

    // Wet-bulb by iteration (Newton on psychrometric equation)
    let Twb = Tdb - 5;
    for (let i = 0; i < 100; i++) {
      const W_calc = wFromWetBulb(Tdb, Twb, P);
      const diff   = W_calc - W;
      const diff2  = wFromWetBulb(Tdb, Twb + 0.01, P) - W;
      const ddTwb  = (diff2 - diff) / 0.01;
      if (Math.abs(ddTwb) < 1e-12) break;
      const step = diff / ddTwb;
      Twb -= step;
      if (Math.abs(step) < 1e-7) break;
    }

    // Degree of saturation
    const W_sat = humidityRatio(pSatDB, P);
    const mu    = W / W_sat;   // saturation ratio

    return { W, W_gkg: W * 1000, phi, Tdp, Twb, h_kJ: h / 1000, v, rho, pW, pSatDB, mu };
  }, [inputMode, TdbStr, rhStr, TwbStr, TdpStr, WStr, PStr]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Psychrometric Calculator</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Moist-air properties at any pressure — enthalpy, humidity ratio, dew point, wet-bulb, specific volume, and density.
        </p>
      </div>

      {/* Input card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">State Point</h3>
            <Field label="Dry-bulb Temperature" value={TdbStr} onChange={setTdbStr} unit="°C" />
            <Field label="Total Pressure" value={PStr} onChange={setPStr} unit="Pa" />

            <div className="pt-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Common altitudes: Sea level 101 325 Pa · 500 m 95 460 Pa · 1000 m 89 870 Pa · 2000 m 79 500 Pa
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Second Property</h3>
            <div className="grid grid-cols-2 gap-2">
              {INPUT_MODES.map((m) => (
                <button
                  key={m.id} onClick={() => setInputMode(m.id)}
                  className={`px-3 py-2 rounded text-xs font-medium transition-colors ${inputMode === m.id ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="mt-2">
              {inputMode === "rh"       && <Field label="Relative Humidity" value={rhStr}  onChange={setRhStr}  unit="%" />}
              {inputMode === "wetbulb"  && <Field label="Wet-bulb Temp"     value={TwbStr} onChange={setTwbStr} unit="°C" />}
              {inputMode === "dewpoint" && <Field label="Dew-point Temp"    value={TdpStr} onChange={setTdpStr} unit="°C" />}
              {inputMode === "W"        && <Field label="Humidity Ratio"    value={WStr}   onChange={setWStr}   unit="g/kg" />}
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {!res && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Invalid inputs — check that moisture content does not exceed saturation and second property is consistent with dry-bulb temperature.
        </div>
      )}

      {/* Results */}
      {res && (
        <>
          {/* Primary results */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Psychrometric Properties</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <ResultCard label="Enthalpy (h)" value={fmt(res.h_kJ, 2)} unit="kJ/kg_da" highlight />
              <ResultCard label="Humidity Ratio (W)" value={fmt(res.W_gkg, 2)} unit="g/kg_da" highlight />
              <ResultCard label="Relative Humidity (φ)" value={`${fmt(res.phi, 1)}%`} highlight />
              <ResultCard label="Dew Point" value={fmt(res.Tdp, 1)} unit="°C" highlight />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <ResultCard label="Wet-bulb Temp" value={fmt(res.Twb, 1)} unit="°C" />
              <ResultCard label="Specific Volume" value={fmt(res.v, 4)} unit="m³/kg_da" />
              <ResultCard label="Moist Air Density" value={fmt(res.rho, 4)} unit="kg/m³" />
              <ResultCard label="Degree of Saturation" value={fmt(res.mu * 100, 2)} unit="%" />
            </div>
          </div>

          {/* Detail table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Full Property Table</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <PropRow label="Dry-bulb temperature T_db" value={fmt(parseFloat(TdbStr), 1)} unit="°C" />
                <PropRow label="Wet-bulb temperature T_wb" value={fmt(res.Twb, 2)} unit="°C" />
                <PropRow label="Dew-point temperature T_dp" value={fmt(res.Tdp, 2)} unit="°C" />
                <PropRow label="Relative humidity φ" value={fmt(res.phi, 2)} unit="%" />
                <PropRow label="Humidity ratio W" value={fmt(res.W_gkg, 4)} unit="g/kg_da" />
                <PropRow label="Humidity ratio W" value={fmt(res.W, 6)} unit="kg/kg_da" />
              </div>
              <div>
                <PropRow label="Partial vapour pressure p_w" value={fmt(res.pW, 1)} unit="Pa" />
                <PropRow label="Saturation pressure p_sat(T_db)" value={fmt(res.pSatDB, 1)} unit="Pa" />
                <PropRow label="Enthalpy h" value={fmt(res.h_kJ, 3)} unit="kJ/kg_da" />
                <PropRow label="Specific volume v" value={fmt(res.v, 5)} unit="m³/kg_da" />
                <PropRow label="Moist air density ρ" value={fmt(res.rho, 4)} unit="kg/m³" />
                <PropRow label="Degree of saturation μ" value={fmt(res.mu * 100, 3)} unit="%" />
              </div>
            </div>
          </div>

          {/* Comfort zone indicator */}
          {(() => {
            const Tdb = parseFloat(TdbStr);
            const comfort = Tdb >= 20 && Tdb <= 26 && res.phi >= 30 && res.phi <= 60;
            const humid   = res.phi > 70;
            const dry     = res.phi < 25;
            return (
              <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${comfort ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300" : humid ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300" : dry ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"}`}>
                {comfort ? "✓ Within ASHRAE 55 thermal comfort zone (20–26°C, 30–60% RH)"
                  : humid  ? "High humidity — condensation / mold risk if RH > 70%"
                  : dry    ? "Low humidity — consider humidification"
                  : `Outside typical comfort range (20–26°C, 30–60% RH) — T_db = ${fmt(Tdb, 1)}°C, RH = ${fmt(res.phi, 1)}%`}
              </div>
            );
          })()}
        </>
      )}

      {/* Reference */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Reference Equations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-2">
            <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
              W = 0.622 · p_w / (P − p_w)
            </div>
            <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
              h = 1.006·T + W·(2501 + 1.86·T)  [kJ/kg_da]
            </div>
            <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
              v = R_da·T/(P) · (1 + W/0.622)  [m³/kg_da]
            </div>
          </div>
          <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
            <p>Saturation pressure uses the <strong>Buck equation</strong> (valid −40 to 80°C).</p>
            <p>Wet-bulb from <strong>ASHRAE psychrometric equation</strong>: W = W_wb − A·(T_db − T_wb) where A ≈ 6.6×10⁻⁴ (sling psychrometer).</p>
            <p>Dew-point found by Newton inversion of the Buck equation.</p>
          </div>
        </div>
      </div>
      <References refs={REFS_PSYCHROMETRIC} />
    </div>
  );
}