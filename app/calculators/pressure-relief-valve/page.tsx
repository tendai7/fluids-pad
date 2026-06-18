"use client";

import React, { useState } from "react";
import { References } from "@/components/References";
import { REFS_PRESSURE_RELIEF_VALVE } from "@/lib/references";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt  = (n: number, sig = 4) => parseFloat(n.toPrecision(sig)).toString();
const fmtE = (n: number)          => n.toExponential(3);

// ── API 520 standard orifice designations ─────────────────────────────────────
const API_ORIFICE = [
  { id: "D", area_in2: 0.110 },
  { id: "E", area_in2: 0.196 },
  { id: "F", area_in2: 0.307 },
  { id: "G", area_in2: 0.503 },
  { id: "H", area_in2: 0.785 },
  { id: "J", area_in2: 1.287 },
  { id: "K", area_in2: 1.838 },
  { id: "L", area_in2: 2.853 },
  { id: "M", area_in2: 3.600 },
  { id: "N", area_in2: 4.340 },
  { id: "P", area_in2: 6.380 },
  { id: "Q", area_in2: 11.05 },
  { id: "R", area_in2: 16.00 },
  { id: "T", area_in2: 26.00 },
];
const IN2_TO_MM2 = 645.16;

// ── Gas constant ───────────────────────────────────────────────────────────────
// C = 520 constant for API 520 gas sizing (function of gamma)
function apiC(gamma: number): number {
  // C = 520 √(γ (2/(γ+1))^((γ+1)/(γ-1)))
  const exponent = (gamma + 1) / (gamma - 1);
  return 520 * Math.sqrt(gamma * Math.pow(2 / (gamma + 1), exponent));
}

// ── Service types ─────────────────────────────────────────────────────────────
type Service = "gas" | "steam" | "liquid";
type PresUnit = "kPa" | "bar" | "MPa" | "psi" | "barg" | "psig";
type FlowUnit_gas  = "kg/h" | "kg/s" | "lb/h";
type FlowUnit_liq  = "m³/h" | "L/min" | "GPM";
type FlowUnit_stm  = "kg/h" | "lb/h";

const TO_PA: Record<PresUnit, { mult: number; gauge: boolean }> = {
  kPa:  { mult: 1e3,      gauge: false },
  bar:  { mult: 1e5,      gauge: false },
  MPa:  { mult: 1e6,      gauge: false },
  psi:  { mult: 6894.76,  gauge: false },
  barg: { mult: 1e5,      gauge: true  },
  psig: { mult: 6894.76,  gauge: true  },
};
const P_ATM_PA = 101325;

function toAbsPa(val: number, unit: PresUnit): number {
  const c = TO_PA[unit];
  return val * c.mult + (c.gauge ? P_ATM_PA : 0);
}

interface Result {
  service: Service;
  A_req_mm2: number;
  A_req_in2: number;
  nextOrifice: { id: string; area_in2: number } | null;
  // intermediate
  P1_kPa: number;
  W?: number;    // mass flow kg/h (gas/steam)
  Q_m3h?: number; // vol flow (liquid)
}

export default function PRVPage() {
  const [service, setService] = useState<Service>("gas");

  // Gas inputs
  const [wStr,    setW]      = useState("5000");   // kg/h
  const [flowUnitGas, setFlowUnitGas] = useState<FlowUnit_gas>("kg/h");
  const [mStr,    setM]      = useState("28.96");  // molar mass g/mol (air default)
  const [tStr,    setT]      = useState("60");     // °C
  const [gammaStr,setGamma]  = useState("1.4");    // Cp/Cv
  const [zStr,    setZ]      = useState("1.0");    // compressibility factor

  // Steam inputs
  const [wSteamStr, setWSteam] = useState("5000");
  const [flowUnitStm, setFlowUnitStm] = useState<FlowUnit_stm>("kg/h");
  const [kdSteamStr, setKdSteam] = useState("0.975");  // typically 0.975 for steam

  // Liquid inputs
  const [qStr,    setQ]      = useState("50");     // m³/h
  const [flowUnitLiq, setFlowUnitLiq] = useState<FlowUnit_liq>("m³/h");
  const [rhoStr,  setRho]    = useState("998");    // kg/m³
  const [kdLiqStr,setKdLiq]  = useState("0.65");   // discharge coeff for liquid API

  // Common
  const [p1Str,   setP1]     = useState("1100");   // kPa abs set pressure + 10% accumulation
  const [p1Unit,  setP1Unit] = useState<PresUnit>("kPa");
  const [pBStr,   setPB]     = useState("101.325");  // kPa abs backpressure
  const [pBUnit,  setPBUnit] = useState<PresUnit>("kPa");
  const [kdStr,   setKd]     = useState("0.975");  // discharge coefficient gas
  const [kbStr,   setKb]     = useState("1.0");    // back-pressure correction

  const [result, setResult] = useState<Result | null>(null);
  const [error,  setError]  = useState("");

  function calculate() {
    setError("");

    const P1_Pa = toAbsPa(parseFloat(p1Str), p1Unit);
    const PB_Pa = toAbsPa(parseFloat(pBStr), pBUnit);
    if (isNaN(P1_Pa) || P1_Pa <= 0) { setError("Enter a valid relieving pressure."); return; }

    // API 520 uses P1 in psia internally; we work in SI throughout
    const P1_kPa = P1_Pa / 1000;
    const PB_kPa = PB_Pa / 1000;

    let A_req_mm2 = NaN;

    if (service === "gas") {
      // API 520 Part I §4.3.3 — vapour/gas sizing (SI):
      // A [cm²] = W / (C · Kd · P1 · Kb) × √(T·Z/M)
      // where W kg/h, P1 kPa, T K, M g/mol
      const W_kgh = flowUnitGas === "kg/s" ? parseFloat(wStr) * 3600 : flowUnitGas === "lb/h" ? parseFloat(wStr) * 0.453592 : parseFloat(wStr);
      const M     = parseFloat(mStr);
      const T_K   = parseFloat(tStr) + 273.15;
      const gamma = parseFloat(gammaStr);
      const Z     = parseFloat(zStr);
      const Kd    = parseFloat(kdStr);
      const Kb    = parseFloat(kbStr);
      const C     = apiC(gamma);

      if ([W_kgh, M, T_K, gamma, Z, Kd, Kb].some(isNaN) || M <= 0 || Kd <= 0 || Kb <= 0 || gamma <= 1) {
        setError("Check gas inputs — all must be valid positive numbers, γ > 1."); return;
      }

      const A_cm2 = (W_kgh / (C * Kd * P1_kPa * Kb)) * Math.sqrt(T_K * Z / M);
      A_req_mm2 = A_cm2 * 100;  // cm² → mm²

      const nextOrifice = API_ORIFICE.find((o) => o.area_in2 * IN2_TO_MM2 >= A_req_mm2) ?? null;
      setResult({ service, A_req_mm2, A_req_in2: A_req_mm2 / IN2_TO_MM2, nextOrifice, P1_kPa, W: W_kgh });

    } else if (service === "steam") {
      // API 520 steam (saturated): A [cm²] = W / (51.45 · Kd · P1 · Kb)
      const W_kgh = flowUnitStm === "lb/h" ? parseFloat(wSteamStr) * 0.453592 : parseFloat(wSteamStr);
      const Kd    = parseFloat(kdSteamStr);
      const Kb    = parseFloat(kbStr);
      if ([W_kgh, Kd, Kb].some(isNaN) || Kd <= 0 || Kb <= 0) {
        setError("Check steam inputs."); return;
      }
      const A_cm2 = W_kgh / (51.45 * Kd * P1_kPa * Kb);
      A_req_mm2 = A_cm2 * 100;
      const nextOrifice = API_ORIFICE.find((o) => o.area_in2 * IN2_TO_MM2 >= A_req_mm2) ?? null;
      setResult({ service, A_req_mm2, A_req_in2: A_req_mm2 / IN2_TO_MM2, nextOrifice, P1_kPa, W: W_kgh });

    } else {
      // Liquid — API 520 Part I §4.4:
      // A [cm²] = Q / (11.78 · Kd · Kw · Kc) × √(ρ / (P1 - Pb))
      // where Q m³/h, ρ kg/m³, P1, Pb in kPa
      const Q_m3h = flowUnitLiq === "L/min" ? parseFloat(qStr) * 0.06 : flowUnitLiq === "GPM" ? parseFloat(qStr) * 0.22712 : parseFloat(qStr);
      const rho   = parseFloat(rhoStr);
      const Kd    = parseFloat(kdLiqStr);
      const dP_kPa = P1_kPa - PB_kPa;
      if ([Q_m3h, rho, Kd].some(isNaN) || rho <= 0 || Kd <= 0 || dP_kPa <= 0) {
        setError("Check liquid inputs. Ensure P₁ > backpressure."); return;
      }
      const A_cm2 = (Q_m3h / (11.78 * Kd)) * Math.sqrt(rho / dP_kPa);
      A_req_mm2 = A_cm2 * 100;
      const nextOrifice = API_ORIFICE.find((o) => o.area_in2 * IN2_TO_MM2 >= A_req_mm2) ?? null;
      setResult({ service, A_req_mm2, A_req_in2: A_req_mm2 / IN2_TO_MM2, nextOrifice, P1_kPa, Q_m3h });
    }
  }

  const r = result;

  function InputRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div>
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{label}</label>
        {children}
      </div>
    );
  }

  function NumInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
    );
  }

  function PresInput({ val, onVal, unit, onUnit }: { val: string; onVal: (v: string) => void; unit: PresUnit; onUnit: (u: PresUnit) => void }) {
    return (
      <div className="flex gap-2">
        <input type="number" value={val} onChange={(e) => onVal(e.target.value)}
          className="flex-1 px-3 py-2 text-sm rounded-l-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={unit} onChange={(e) => onUnit(e.target.value as PresUnit)}
          className="px-2 py-2 text-sm rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
          {(Object.keys(TO_PA) as PresUnit[]).map((u) => <option key={u}>{u}</option>)}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Pressure Relief Valve Sizing
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          API 520 Part I orifice area calculation for gas/vapour, steam, and liquid service. Suggests the next standard API orifice designation.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-6">

        {/* Service selector */}
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Service</p>
          <div className="flex gap-2">
            {([["gas", "Gas / Vapour"], ["steam", "Steam (saturated)"], ["liquid", "Liquid"]] as const).map(([id, label]) => (
              <button key={id} onClick={() => { setService(id); setResult(null); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${service === id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Common pressures */}
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Pressures</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputRow label="Relieving pressure P₁ (set + accumulation, absolute)">
              <PresInput val={p1Str} onVal={setP1} unit={p1Unit} onUnit={setP1Unit} />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Typically set pressure × 1.10 for process vessels</p>
            </InputRow>
            <InputRow label="Backpressure Pb (absolute)">
              <PresInput val={pBStr} onVal={setPB} unit={pBUnit} onUnit={setPBUnit} />
            </InputRow>
          </div>
        </section>

        {/* Service-specific inputs */}
        {service === "gas" && (
          <section>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Gas / vapour properties</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InputRow label={`Relief flow (${flowUnitGas})`}>
                <div className="flex gap-1">
                  <NumInput value={wStr} onChange={setW} />
                  <select value={flowUnitGas} onChange={(e) => setFlowUnitGas(e.target.value as FlowUnit_gas)}
                    className="px-2 py-2 text-sm rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none">
                    <option>kg/h</option><option>kg/s</option><option>lb/h</option>
                  </select>
                </div>
              </InputRow>
              <InputRow label="Molar mass M (g/mol)">
                <NumInput value={mStr} onChange={setM} placeholder="28.96 for air" />
              </InputRow>
              <InputRow label="Inlet temperature (°C)">
                <NumInput value={tStr} onChange={setT} />
              </InputRow>
              <InputRow label="Ratio Cp/Cv  γ">
                <NumInput value={gammaStr} onChange={setGamma} placeholder="1.4 for air/diatomic" />
              </InputRow>
              <InputRow label="Compressibility Z">
                <NumInput value={zStr} onChange={setZ} placeholder="1.0 for ideal gas" />
              </InputRow>
              <InputRow label="Discharge coeff. Kd">
                <NumInput value={kdStr} onChange={setKd} placeholder="0.975 typical" />
              </InputRow>
              <InputRow label="Back-pressure factor Kb">
                <NumInput value={kbStr} onChange={setKb} placeholder="1.0 (conv. type)" />
              </InputRow>
            </div>
            <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              Common gases: Air M=28.96 γ=1.40 · N₂ M=28 γ=1.40 · CO₂ M=44 γ=1.30 · CH₄ M=16 γ=1.31 · Steam M=18 (use Steam tab)
            </div>
          </section>
        )}

        {service === "steam" && (
          <section>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Steam properties</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InputRow label={`Relief flow (${flowUnitStm})`}>
                <div className="flex gap-1">
                  <NumInput value={wSteamStr} onChange={setWSteam} />
                  <select value={flowUnitStm} onChange={(e) => setFlowUnitStm(e.target.value as FlowUnit_stm)}
                    className="px-2 py-2 text-sm rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none">
                    <option>kg/h</option><option>lb/h</option>
                  </select>
                </div>
              </InputRow>
              <InputRow label="Discharge coeff. Kd">
                <NumInput value={kdSteamStr} onChange={setKdSteam} placeholder="0.975" />
              </InputRow>
              <InputRow label="Back-pressure factor Kb">
                <NumInput value={kbStr} onChange={setKb} placeholder="1.0" />
              </InputRow>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Uses API 520 steam constant 51.45. For superheated steam apply correction factor Ksh from API 520 Table 7.
            </p>
          </section>
        )}

        {service === "liquid" && (
          <section>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Liquid properties</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InputRow label={`Relief flow (${flowUnitLiq})`}>
                <div className="flex gap-1">
                  <NumInput value={qStr} onChange={setQ} />
                  <select value={flowUnitLiq} onChange={(e) => setFlowUnitLiq(e.target.value as FlowUnit_liq)}
                    className="px-2 py-2 text-sm rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none">
                    <option>m³/h</option><option>L/min</option><option>GPM</option>
                  </select>
                </div>
              </InputRow>
              <InputRow label="Fluid density ρ (kg/m³)">
                <NumInput value={rhoStr} onChange={setRho} placeholder="998 for water" />
              </InputRow>
              <InputRow label="Discharge coeff. Kd">
                <NumInput value={kdLiqStr} onChange={setKdLiq} placeholder="0.65 typical" />
              </InputRow>
            </div>
          </section>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button onClick={calculate}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
          Size Valve
        </button>
      </div>

      {/* Results */}
      {r && (
        <div className="space-y-4">
          {/* Required area */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-5">
              <p className="text-xs font-semibold text-blue-500 dark:text-blue-400 mb-1">Required orifice area</p>
              <p className="text-2xl font-bold font-mono text-blue-700 dark:text-blue-300">{fmt(r.A_req_mm2, 4)} mm²</p>
              <p className="text-sm font-mono text-blue-600 dark:text-blue-400 mt-1">{fmt(r.A_req_in2, 4)} in²</p>
            </div>
            <div className={`rounded-xl border p-5 ${r.nextOrifice
              ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
              : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"}`}>
              <p className={`text-xs font-semibold mb-1 ${r.nextOrifice ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                Next standard API orifice
              </p>
              {r.nextOrifice ? (
                <>
                  <p className="text-4xl font-black font-mono text-green-700 dark:text-green-300">{r.nextOrifice.id}</p>
                  <p className="text-sm font-mono text-green-600 dark:text-green-400 mt-1">
                    {fmt(r.nextOrifice.area_in2 * IN2_TO_MM2, 4)} mm² ({r.nextOrifice.area_in2} in²)
                  </p>
                </>
              ) : (
                <p className="text-sm text-red-700 dark:text-red-300">Exceeds largest standard API orifice (T = 26 in²). Multiple valves or custom orifice required.</p>
              )}
            </div>
          </div>

          {/* API orifice table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <p className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
              API 526 standard orifice designations
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-center">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs font-bold text-gray-500 dark:text-gray-400">
                    <th className="px-3 py-2">Letter</th>
                    <th className="px-3 py-2">Area (in²)</th>
                    <th className="px-3 py-2">Area (mm²)</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {API_ORIFICE.map((o) => {
                    const a_mm2 = o.area_in2 * IN2_TO_MM2;
                    const isNext = r.nextOrifice?.id === o.id;
                    const isBelow = a_mm2 < r.A_req_mm2;
                    return (
                      <tr key={o.id} className={isNext ? "bg-green-50 dark:bg-green-900/30 font-semibold" : ""}>
                        <td className="px-3 py-1.5 font-bold font-mono">{o.id}</td>
                        <td className="px-3 py-1.5 font-mono">{o.area_in2}</td>
                        <td className="px-3 py-1.5 font-mono">{fmt(a_mm2, 4)}</td>
                        <td className="px-3 py-1.5">
                          {isNext
                            ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">✓ Select</span>
                            : isBelow
                            ? <span className="text-xs text-red-400 dark:text-red-500">Too small</span>
                            : <span className="text-xs text-gray-400 dark:text-gray-500">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Formula used */}
          <details className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <summary className="px-5 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
              API 520 formula used
            </summary>
            <div className="px-5 pb-5 text-sm text-gray-600 dark:text-gray-400 space-y-2">
              {service === "gas" && (
                <>
                  <p className="font-mono bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-xs leading-relaxed">
                    A [cm²] = W / (C · Kd · P₁ · Kb) × √(T·Z/M)<br/>
                    C = 520 √(γ (2/(γ+1))^((γ+1)/(γ-1)))<br/>
                    W [kg/h], P₁ [kPa abs], T [K], M [g/mol]
                  </p>
                  <p>C factor computed: {fmt(apiC(parseFloat(gammaStr) || 1.4), 4)}</p>
                </>
              )}
              {service === "steam" && (
                <p className="font-mono bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-xs leading-relaxed">
                  A [cm²] = W / (51.45 · Kd · P₁ · Kb)<br/>
                  W [kg/h], P₁ [kPa abs]
                </p>
              )}
              {service === "liquid" && (
                <p className="font-mono bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-xs leading-relaxed">
                  A [cm²] = Q / (11.78 · Kd) × √(ρ / (P₁ − Pb))<br/>
                  Q [m³/h], ρ [kg/m³], pressures [kPa abs]
                </p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500">Reference: API Standard 520, Part I — Sizing, Selection, and Installation of Pressure-Relieving Devices (9th ed.).</p>
            </div>
          </details>
        </div>
      )}

      <div className="mt-8 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-4 space-y-1">
        <p>This calculator implements the SI form of the API 520 sizing equations. It does not replace a full relief-load study or code-compliance review.</p>
        <p>For balanced-bellows or pilot-operated valves, Kb may differ from 1.0 — consult manufacturer data or API 520 Appendix C.</p>
        <p>Relieving pressure P₁ = set pressure × 1.10 for fire/emergency cases (10 % accumulation on ASME vessels).</p>
      </div>

      <References refs={REFS_PRESSURE_RELIEF_VALVE} />
    </div>
  );
}
