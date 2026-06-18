"use client";
import { useState, useMemo } from "react";
import { References } from "@/components/References";
import { REFS_FLOW_POROUS_MEDIA } from "@/lib/references";

const DARCY_TO_M2 = 9.869233e-13;
const MD_TO_M2    = DARCY_TO_M2 * 1e-3;

type PermUnit   = "mD" | "D" | "m2";
type AreaInput  = "diameter" | "area";
type CalcMode   = "darcy" | "ergun";
type DarcySolve = "flowrate" | "pressure";

function permToM2(val: number, unit: PermUnit): number {
  if (unit === "mD") return val * MD_TO_M2;
  if (unit === "D")  return val * DARCY_TO_M2;
  return val;
}

function ergunDpPerL(u: number, dp: number, eps: number, rho: number, mu: number): number {
  const viscousTerm  = 150 * mu  * (1 - eps) ** 2 / (dp ** 2 * eps ** 3);
  const inertiaTerm  = 1.75 * rho * (1 - eps)     / (dp     * eps ** 3);
  return viscousTerm * u + inertiaTerm * u ** 2;
}

function ergunReMod(u: number, dp: number, eps: number, rho: number, mu: number): number {
  return rho * u * dp / (mu * (1 - eps));
}

function fmt(v: number, d = 3): string {
  if (!isFinite(v) || isNaN(v)) return "—";
  const av = Math.abs(v);
  if (av >= 1e6 || (av < 1e-4 && av > 0)) return v.toExponential(d);
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
          type="number" min="0" step="any" value={value}
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

export default function FlowPorousMediaPage() {
  const [mode, setMode]           = useState<CalcMode>("ergun");
  const [areaType, setAreaType]   = useState<AreaInput>("diameter");
  const [diamStr, setDiamStr]     = useState("0.15");
  const [areaStr, setAreaStr]     = useState("0.01767");
  const [lenStr, setLenStr]       = useState("0.5");
  const [rhoStr, setRhoStr]       = useState("1000");
  const [muStr, setMuStr]         = useState("0.001");
  // Darcy
  const [permStr, setPermStr]     = useState("200");
  const [permUnit, setPermUnit]   = useState<PermUnit>("mD");
  const [darcySolve, setDarcySolve] = useState<DarcySolve>("flowrate");
  const [dPStr, setDPStr]         = useState("50000");
  const [qStr, setQStr]           = useState("0.0005");
  // Ergun
  const [dpStr, setDpStr]         = useState("0.003");
  const [epsStr, setEpsStr]       = useState("0.40");
  const [uStr, setUStr]           = useState("0.02");

  const A_m2 = useMemo(() => {
    if (areaType === "diameter") {
      const d = parseFloat(diamStr) || 0;
      return Math.PI / 4 * d * d;
    }
    return parseFloat(areaStr) || 0;
  }, [areaType, diamStr, areaStr]);

  const L   = parseFloat(lenStr)  || 0;
  const rho = parseFloat(rhoStr)  || 0;
  const mu  = parseFloat(muStr)   || 0;

  const results = useMemo(() => {
    if (A_m2 <= 0 || L <= 0 || mu <= 0) return null;

    if (mode === "darcy") {
      const k = permToM2(parseFloat(permStr) || 0, permUnit);
      if (k <= 0) return null;
      let Q = 0, dP = 0;
      if (darcySolve === "flowrate") {
        dP = parseFloat(dPStr) || 0;
        if (dP <= 0) return null;
        Q = k * A_m2 * dP / (mu * L);
      } else {
        Q = parseFloat(qStr) || 0;
        if (Q <= 0) return null;
        dP = mu * L * Q / (k * A_m2);
      }
      const u    = Q / A_m2;
      const Re_p = rho > 0 ? rho * u * Math.sqrt(k) / mu : 0;
      const valid = Re_p < 1;
      return { type: "darcy" as const, Q, u, dP, k_m2: k, Re_p, valid };
    }

    // Ergun
    const dp  = parseFloat(dpStr)  || 0;
    const eps = parseFloat(epsStr) || 0;
    const u   = parseFloat(uStr)   || 0;
    if (dp <= 0 || eps <= 0 || eps >= 1 || u <= 0 || rho <= 0) return null;

    const dPL   = ergunDpPerL(u, dp, eps, rho, mu);
    const dP    = dPL * L;
    const Re    = ergunReMod(u, dp, eps, rho, mu);
    const Q     = u * A_m2;
    const viscP = 150 * mu  * (1 - eps) ** 2 / (dp ** 2 * eps ** 3) * u * L;
    const inertP= 1.75 * rho * (1 - eps)     / (dp     * eps ** 3) * u ** 2 * L;
    const regime = Re < 10 ? "Laminar — Blake-Kozeny dominates" : Re > 1000 ? "Turbulent — Burke-Plummer dominates" : "Transitional — Ergun equation applies";

    return { type: "ergun" as const, Q, u, dP, dPL, Re, viscP, inertP, regime };
  }, [mode, A_m2, L, rho, mu, permStr, permUnit, darcySolve, dPStr, qStr, dpStr, epsStr, uStr]);

  const regimeBg = (re: number) =>
    re < 10 ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-300"
    : re > 1000 ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-300"
    : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Flow Through Porous Media</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Darcy&rsquo;s law for permeable media and the Ergun equation for packed beds and granular filters.
        </p>
      </div>

      {/* Inputs */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          {(["ergun", "darcy"] as CalcMode[]).map((m) => (
            <button
              key={m} onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === m ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
            >
              {m === "ergun" ? "Packed Bed (Ergun)" : "Porous Medium (Darcy)"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Geometry + Fluid */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Geometry &amp; Fluid</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cross-section input</label>
              <select
                value={areaType} onChange={(e) => setAreaType(e.target.value as AreaInput)}
                className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mb-2"
              >
                <option value="diameter">Diameter (circular)</option>
                <option value="area">Area</option>
              </select>
              {areaType === "diameter"
                ? <Field label="Diameter" value={diamStr} onChange={setDiamStr} unit="m" />
                : <Field label="Area" value={areaStr} onChange={setAreaStr} unit="m²" />
              }
            </div>

            <Field label="Bed / Medium Length (L)" value={lenStr} onChange={setLenStr} unit="m" />

            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
              <Field label="Fluid Density (ρ)" value={rhoStr} onChange={setRhoStr} unit="kg/m³" />
            </div>
            <Field label="Dynamic Viscosity (μ)" value={muStr} onChange={setMuStr} unit="Pa·s" />

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Computed area: {fmt(A_m2 * 1e4, 3)} cm²
            </p>
          </div>

          {/* Mode-specific */}
          <div className="space-y-4">
            {mode === "darcy" ? (
              <>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Permeability</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Permeability (k)</label>
                  <div className="flex gap-2">
                    <input
                      type="number" min="0" step="any" value={permStr}
                      onChange={(e) => setPermStr(e.target.value)}
                      className="flex-1 min-w-0 rounded-l border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={permUnit} onChange={(e) => setPermUnit(e.target.value as PermUnit)}
                      className="rounded-r border border-l-0 border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="mD">mD (millidarcy)</option>
                      <option value="D">D (darcy)</option>
                      <option value="m2">m²</option>
                    </select>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    = {fmt(permToM2(parseFloat(permStr) || 0, permUnit) / 9.869233e-13, 2)} D
                    &nbsp;= {fmt(permToM2(parseFloat(permStr) || 0, permUnit), 3)} m²
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Solve for</label>
                  <select
                    value={darcySolve} onChange={(e) => setDarcySolve(e.target.value as DarcySolve)}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mb-3"
                  >
                    <option value="flowrate">Flow rate (given ΔP)</option>
                    <option value="pressure">Pressure drop (given Q)</option>
                  </select>
                  {darcySolve === "flowrate"
                    ? <Field label="Pressure Drop (ΔP)" value={dPStr} onChange={setDPStr} unit="Pa" />
                    : <Field label="Volumetric Flow Rate (Q)" value={qStr} onChange={setQStr} unit="m³/s" />
                  }
                </div>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Packed Bed Parameters</h3>
                <Field label="Particle Diameter (dₚ)" value={dpStr} onChange={setDpStr} unit="m" />
                <Field label="Void Fraction (ε)" value={epsStr} onChange={setEpsStr} />
                <Field label="Superficial Velocity (u₀)" value={uStr} onChange={setUStr} unit="m/s" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  ε = 0.35–0.45 for random sphere packing. Superficial velocity = Q/A (not interstitial).
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Results</h2>

          {results.type === "darcy" ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <ResultCard label="Pressure Drop" value={fmt(results.dP, 1)} unit="Pa" highlight />
                <ResultCard label="Pressure Drop" value={fmt(results.dP / 1000, 3)} unit="kPa" highlight />
                <ResultCard label="Flow Rate" value={fmt(results.Q * 1000, 4)} unit="L/s" />
                <ResultCard label="Superficial Velocity" value={fmt(results.u, 4)} unit="m/s" />
              </div>
              <div className={`rounded-lg px-4 py-3 text-sm font-medium ${results.valid ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-300" : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300"}`}>
                {results.valid
                  ? `Darcy regime confirmed — Re_pore = ${fmt(results.Re_p, 3)} (< 1, linear flow)`
                  : `Darcy regime questionable — Re_pore = ${fmt(results.Re_p, 3)} (≥ 1, inertial effects present)`
                }
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <ResultCard label="Total Pressure Drop" value={fmt(results.dP, 1)} unit="Pa" highlight />
                <ResultCard label="ΔP per Metre" value={fmt(results.dPL, 1)} unit="Pa/m" highlight />
                <ResultCard label="Flow Rate" value={fmt(results.Q * 1000, 4)} unit="L/s" />
                <ResultCard label="Modified Re" value={fmt(results.Re, 2)} />
              </div>

              {/* Contribution breakdown */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pressure drop breakdown</p>
                <div className="grid grid-cols-2 gap-3">
                  <ResultCard label="Viscous (Blake-Kozeny)" value={fmt(results.viscP, 1)} unit="Pa" />
                  <ResultCard label="Inertial (Burke-Plummer)" value={fmt(results.inertP, 1)} unit="Pa" />
                </div>
                {results.dP > 0 && (
                  <div className="mt-2 h-4 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${(results.viscP / results.dP) * 100}%` }}
                    />
                    <div className="h-full bg-amber-500 flex-1" />
                  </div>
                )}
                <div className="flex gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />Viscous {((results.viscP / results.dP) * 100).toFixed(1)}%</span>
                  <span><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1" />Inertial {((results.inertP / results.dP) * 100).toFixed(1)}%</span>
                </div>
              </div>

              <div className={`rounded-lg px-4 py-3 text-sm font-medium ${regimeBg(results.Re)}`}>
                {results.regime}
              </div>
            </>
          )}
        </div>
      )}

      {/* Reference */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Reference Equations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Darcy&rsquo;s Law</p>
            <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 mb-2">
              Q = k · A · ΔP / (μ · L)
            </div>
            <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <li><strong>k</strong> = permeability [m²]</li>
              <li>1 Darcy = 9.869 × 10⁻¹³ m²</li>
              <li>Valid when Re<sub>pore</sub> = ρ u √k / μ &lt; 1</li>
              <li>For Re &gt; 1 use Forchheimer extension</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Ergun Equation</p>
            <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 mb-2">
              ΔP/L = 150μ(1−ε)²u/(d²ₚε³)<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ 1.75ρ(1−ε)u²/(dₚε³)
            </div>
            <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <li><strong>ε</strong> = void fraction (0.35–0.45 typical)</li>
              <li><strong>dₚ</strong> = equivalent sphere diameter</li>
              <li>Re<sub>mod</sub> = ρ u dₚ / (μ(1−ε))</li>
              <li>Re &lt; 10: laminar · Re &gt; 1000: turbulent</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
          <strong>Common permeabilities:</strong> Gravel 10⁵–10⁷ mD · Sand 1–10⁴ mD · Sandstone 0.1–500 mD · Limestone 0.01–10 mD
        </div>
      </div>

      <References refs={REFS_FLOW_POROUS_MEDIA} />
    </div>
  );
}
