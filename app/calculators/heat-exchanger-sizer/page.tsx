"use client";
import { useState, useMemo } from "react";
import { References } from "@/components/References";
import { REFS_LMTD } from "@/lib/references";

// ---- types ----
type FlowConfig = "counterflow" | "parallelflow" | "crossflow_unmixed" | "shelltube_1_2";
type Solve      = "area" | "U" | "duty";

// ---- F-correction factor (LMTD) ----
// Shell-and-tube 1-2 pass: F = R!=1 branch of Bowman-Mueller-Nagle chart
function fCorrection(P: number, R: number): number {
  if (!isFinite(P) || !isFinite(R) || P <= 0 || P >= 1) return 1;
  if (Math.abs(R - 1) < 1e-6) {
    // R = 1 special case
    const denom = (1 - P) * Math.log(1 / (1 - P) / P);
    return isFinite(denom) && denom > 0 ? Math.sqrt(2) * P / denom : 1;
  }
  const W = Math.pow((1 - P) / (1 - R * P), 1 / (R - 1));
  const num = Math.sqrt(R * R + 1) * Math.log(W);
  const den = (R - 1) * Math.log((2 / P - 1 - R + Math.sqrt(R * R + 1)) / (2 / P - 1 - R - Math.sqrt(R * R + 1)));
  const F = num / den;
  return isFinite(F) && F > 0 && F <= 1 ? F : 1;
}

// LMTD for counter-flow or parallel-flow
function lmtd(dT1: number, dT2: number): number {
  if (dT1 <= 0 || dT2 <= 0) return 0;
  if (Math.abs(dT1 - dT2) < 1e-9) return dT1;
  return (dT1 - dT2) / Math.log(dT1 / dT2);
}

// Effectiveness for given NTU, Cmin/Cmax and flow config
function effectiveness(NTU: number, Cr: number, config: FlowConfig): number {
  if (NTU <= 0) return 0;
  switch (config) {
    case "counterflow":
      if (Math.abs(Cr - 1) < 1e-6) return NTU / (NTU + 1);
      return (1 - Math.exp(-NTU * (1 - Cr))) / (1 - Cr * Math.exp(-NTU * (1 - Cr)));
    case "parallelflow":
      return (1 - Math.exp(-NTU * (1 + Cr))) / (1 + Cr);
    case "crossflow_unmixed":
      // Kays & London approximation for both fluids unmixed
      return 1 - Math.exp((NTU ** 0.22 / Cr) * (Math.exp(-Cr * NTU ** 0.78) - 1));
    case "shelltube_1_2": {
      // 1-2 S&T — closed-form effectiveness
      const E = Math.exp(-NTU * Math.sqrt(1 + Cr * Cr));
      const sqrt = Math.sqrt(1 + Cr * Cr);
      return 2 / (1 + Cr + sqrt * (1 + E) / (1 - E));
    }
  }
}

function fmt(v: number, d = 2): string {
  if (!isFinite(v) || isNaN(v)) return "—";
  const av = Math.abs(v);
  if (av >= 1e5 || (av < 0.001 && av > 0)) return v.toExponential(d);
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

function ResultCard({ label, value, unit, highlight, sub }: {
  label: string; value: string; unit?: string; highlight?: boolean; sub?: string;
}) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800" : "bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className={`text-lg font-semibold ${highlight ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-gray-100"}`}>
        {value}
        {unit && <span className="text-sm font-normal ml-1 text-gray-500 dark:text-gray-400">{unit}</span>}
      </p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

const CONFIGS: { id: FlowConfig; label: string }[] = [
  { id: "counterflow",       label: "Counter-flow" },
  { id: "parallelflow",      label: "Parallel-flow" },
  { id: "crossflow_unmixed", label: "Cross-flow (both unmixed)" },
  { id: "shelltube_1_2",     label: "Shell & Tube 1-2 pass" },
];

export default function HeatExchangerSizerPage() {
  const [config, setConfig]   = useState<FlowConfig>("counterflow");
  const [solve, setSolve]     = useState<Solve>("area");

  // Hot stream
  const [TH1, setTH1] = useState("90");   // inlet °C
  const [TH2, setTH2] = useState("55");   // outlet °C
  const [mH,  setMH]  = useState("2.0");  // kg/s
  const [CpH, setCpH] = useState("4180"); // J/(kg·K)

  // Cold stream
  const [TC1, setTC1] = useState("15");
  const [TC2, setTC2] = useState("50");
  const [mC,  setMC]  = useState("3.5");
  const [CpC, setCpC] = useState("4180");

  // Design
  const [UStr,    setUStr]    = useState("500");   // W/(m²·K)
  const [AreaStr, setAreaStr] = useState("5.0");   // m²
  const [QStr,    setQStr]    = useState("292600"); // W

  const results = useMemo(() => {
    const tH1 = parseFloat(TH1);
    const tH2 = parseFloat(TH2);
    const tC1 = parseFloat(TC1);
    const tC2 = parseFloat(TC2);
    const mh  = parseFloat(mH);
    const mc  = parseFloat(mC);
    const cph = parseFloat(CpH);
    const cpc = parseFloat(CpC);
    const U   = parseFloat(UStr);

    if ([tH1, tH2, tC1, tC2, mh, mc, cph, cpc, U].some((v) => !isFinite(v) || v <= 0)) return null;
    if (tH1 <= tH2 || tC1 >= tC2) return null;

    const CH = mh * cph;
    const CC = mc * cpc;
    const Cmin = Math.min(CH, CC);
    const Cmax = Math.max(CH, CC);
    const Cr   = Cmin / Cmax;

    // Heat duties from each stream
    const QH = CH * (tH1 - tH2);
    const QC = CC * (tC2 - tC1);
    const Qavg = (QH + QC) / 2;
    const Qimbalance = Math.abs(QH - QC) / Qavg * 100;

    // LMTD (counter-flow arrangement is baseline for F-factor calcs)
    let dT1_cf: number, dT2_cf: number;
    if (config === "parallelflow") {
      dT1_cf = tH1 - tC1;
      dT2_cf = tH2 - tC2;
    } else {
      dT1_cf = tH1 - tC2;
      dT2_cf = tH2 - tC1;
    }
    const LMTD_base = lmtd(dT1_cf, dT2_cf);

    // F-correction for S&T 1-2
    let F = 1;
    if (config === "shelltube_1_2") {
      const R = (tH1 - tH2) / (tC2 - tC1);
      const P = (tC2 - tC1) / (tH1 - tC1);
      F = fCorrection(P, R);
    }
    const LMTD_eff = LMTD_base * F;

    let A_m2 = 0, NTU = 0, eps = 0, Qdesign = Qavg;

    if (solve === "area") {
      A_m2    = Qavg / (U * LMTD_eff);
      NTU     = U * A_m2 / Cmin;
      eps     = effectiveness(NTU, Cr, config);
    } else if (solve === "U") {
      A_m2    = parseFloat(AreaStr);
      const Ucalc = Qavg / (A_m2 * LMTD_eff);
      NTU     = Ucalc * A_m2 / Cmin;
      eps     = effectiveness(NTU, Cr, config);
      return { QH, QC, Qavg, Qimbalance, CH, CC, Cmin, Cmax, Cr, LMTD_base, F, LMTD_eff, A_m2, U: Ucalc, NTU, eps };
    } else {
      // solve = duty: given area + U, find achievable duty
      A_m2    = parseFloat(AreaStr);
      NTU     = U * A_m2 / Cmin;
      eps     = effectiveness(NTU, Cr, config);
      Qdesign = eps * Cmin * (tH1 - tC1);
      return { QH, QC, Qavg, Qimbalance, CH, CC, Cmin, Cmax, Cr, LMTD_base, F, LMTD_eff, A_m2, U, NTU, eps, Qdesign };
    }

    return { QH, QC, Qavg, Qimbalance, CH, CC, Cmin, Cmax, Cr, LMTD_base, F, LMTD_eff, A_m2, U, NTU, eps, Qdesign };
  }, [config, solve, TH1, TH2, TC1, TC2, mH, mC, CpH, CpC, UStr, AreaStr, QStr]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Heat Exchanger Quick-Sizer</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          LMTD method with F-correction and effectiveness-NTU for counter-flow, parallel-flow, cross-flow, and shell-and-tube exchangers.
        </p>
      </div>

      {/* Config + Solve */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exchanger Configuration</label>
            <select
              value={config} onChange={(e) => setConfig(e.target.value as FlowConfig)}
              className="w-full rounded border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {CONFIGS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Solve for</label>
            <div className="flex gap-2">
              {(["area", "U", "duty"] as Solve[]).map((s) => (
                <button
                  key={s} onClick={() => setSolve(s)}
                  className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${solve === s ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                >
                  {s === "area" ? "Area A" : s === "U" ? "U-value" : "Duty Q"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Hot stream */}
          <div className="space-y-3">
            <h3 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              Hot Stream
            </h3>
            <Field label="Inlet Temp (T_H1)" value={TH1} onChange={setTH1} unit="°C" />
            <Field label="Outlet Temp (T_H2)" value={TH2} onChange={setTH2} unit="°C" />
            <Field label="Mass Flow Rate" value={mH} onChange={setMH} unit="kg/s" />
            <Field label="Specific Heat (Cₚ)" value={CpH} onChange={setCpH} unit="J/(kg·K)" />
          </div>

          {/* Cold stream */}
          <div className="space-y-3">
            <h3 className="font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
              Cold Stream
            </h3>
            <Field label="Inlet Temp (T_C1)" value={TC1} onChange={setTC1} unit="°C" />
            <Field label="Outlet Temp (T_C2)" value={TC2} onChange={setTC2} unit="°C" />
            <Field label="Mass Flow Rate" value={mC} onChange={setMC} unit="kg/s" />
            <Field label="Specific Heat (Cₚ)" value={CpC} onChange={setCpC} unit="J/(kg·K)" />
          </div>

          {/* Design */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Design Parameters</h3>
            <Field
              label="Overall U [W/(m²·K)]"
              value={UStr} onChange={setUStr} unit="W/(m²·K)"
            />
            {(solve === "U" || solve === "duty") && (
              <Field label="Exchange Area (A)" value={AreaStr} onChange={setAreaStr} unit="m²" />
            )}
          </div>
        </div>
      </div>

      {/* Validation error */}
      {!results && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Check inputs: hot inlet &gt; hot outlet, cold outlet &gt; cold inlet, all values positive.
        </div>
      )}

      {/* Results */}
      {results && (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Results — LMTD Method</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {solve === "area" && (
                <ResultCard label="Required Area" value={fmt(results.A_m2, 2)} unit="m²" highlight />
              )}
              {solve === "U" && (
                <ResultCard label="Required U" value={fmt(results.U, 1)} unit="W/(m²·K)" highlight />
              )}
              {solve === "duty" && (
                <ResultCard label="Achievable Duty" value={fmt((results.Qdesign ?? 0) / 1000, 2)} unit="kW" highlight />
              )}
              <ResultCard label="LMTD (effective)" value={fmt(results.LMTD_eff, 2)} unit="°C"
                sub={config === "shelltube_1_2" ? `F = ${fmt(results.F, 3)}` : undefined} />
              <ResultCard label="NTU" value={fmt(results.NTU, 3)} />
              <ResultCard label="Effectiveness ε" value={`${fmt(results.eps * 100, 1)}%`} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <ResultCard label="Hot duty (Q_H)" value={fmt(results.QH / 1000, 2)} unit="kW"
                sub={results.Qimbalance > 2 ? `⚠ ${fmt(results.Qimbalance, 1)}% imbalance` : undefined} />
              <ResultCard label="Cold duty (Q_C)" value={fmt(results.QC / 1000, 2)} unit="kW" />
              <ResultCard label="C_H" value={fmt(results.CH, 0)} unit="W/K" />
              <ResultCard label="C_C" value={fmt(results.CC, 0)} unit="W/K" />
            </div>

            {results.Qimbalance > 2 && (
              <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                ⚠ Hot and cold duties differ by {fmt(results.Qimbalance, 1)}%. Check that outlet temperatures are consistent with the specified flow rates.
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Effectiveness-NTU Summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <ResultCard label="C_min" value={fmt(results.Cmin, 0)} unit="W/K" />
              <ResultCard label="C_max" value={fmt(results.Cmax, 0)} unit="W/K" />
              <ResultCard label="C_r = C_min/C_max" value={fmt(results.Cr, 3)} />
              <ResultCard label="Q_max (theoretical)" value={fmt(results.Cmin * (parseFloat(TH1) - parseFloat(TC1)) / 1000, 2)} unit="kW" />
            </div>
          </div>
        </>
      )}

      {/* Reference */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Reference</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">LMTD Method</p>
            <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded mb-1">Q = U · A · F · LMTD</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">F = 1 for counter-flow and parallel-flow. F &lt; 1 corrects multi-pass arrangements (Bowman-Mueller-Nagle).</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">NTU Method</p>
            <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded mb-1">NTU = U·A/C_min · ε = f(NTU, C_r)</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Effectiveness ε = Q_actual / Q_max. C_r = C_min/C_max. Achievable duty = ε · C_min · (T_H1 − T_C1).</p>

      <References refs={REFS_LMTD} />
          </div>
        </div>
        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
          <strong>Typical U values [W/(m²·K)]:</strong> Water-water 1000–2500 · Gas-gas 20–300 · Steam-water 1500–4000 · Oil-water 300–900 · Air cooler 30–60
        </div>
      </div>
    </div>
  );
}
