"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { References } from "@/components/References";
import { REFS_MOODY } from "@/lib/references";

// ── Physics ───────────────────────────────────────────────────────────────────
function colebrook(Re: number, eD: number, iter = 50): number {
  if (Re < 2300) return 64 / Re;  // laminar
  let f = 0.02;
  for (let i = 0; i < iter; i++) {
    const rhs = -2 * Math.log10(eD / 3.7 + 2.51 / (Re * Math.sqrt(f)));
    const fNew = 1 / (rhs * rhs);
    if (Math.abs(fNew - f) < 1e-10) { f = fNew; break; }
    f = fNew;
  }
  return f;
}

// ── Chart layout constants ─────────────────────────────────────────────────────
const W = 820, H = 560;
const ML = 64, MR = 20, MT = 20, MB = 50;
const PW = W - ML - MR, PH = H - MT - MB;

const RE_MIN = 600,  RE_MAX = 1e8;
const F_MIN  = 0.006, F_MAX  = 0.1;

function reToX(Re: number)  { return ML + (Math.log10(Re) - Math.log10(RE_MIN)) / (Math.log10(RE_MAX) - Math.log10(RE_MIN)) * PW; }
function fToY(f: number)    { return MT + (1 - (Math.log10(f) - Math.log10(F_MIN)) / (Math.log10(F_MAX) - Math.log10(F_MIN))) * PH; }
function xToRe(x: number)   { return Math.pow(10, (x - ML) / PW * (Math.log10(RE_MAX) - Math.log10(RE_MIN)) + Math.log10(RE_MIN)); }
function yToF(y: number)    { return Math.pow(10, (1 - (y - MT) / PH) * (Math.log10(F_MAX) - Math.log10(F_MIN)) + Math.log10(F_MIN)); }

// ── Relative roughness lines ──────────────────────────────────────────────────
const ED_LINES = [0, 1e-6, 5e-6, 1e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 0.01, 0.02, 0.05];

// Generate SVG polyline points for a Colebrook curve
function moodyPath(eD: number): string {
  const pts: string[] = [];
  const steps = 300;
  for (let i = 0; i <= steps; i++) {
    const Re = Math.pow(10, Math.log10(RE_MIN) + i / steps * (Math.log10(RE_MAX) - Math.log10(RE_MIN)));
    if (eD === 0 && Re < 2300) continue;     // smooth turbulent only above laminar
    if (eD > 0 && Re < 4000) continue;       // rough, skip laminar region
    const f = colebrook(Re, eD);
    if (f < F_MIN * 0.9 || f > F_MAX * 1.1) continue;
    pts.push(`${reToX(Re).toFixed(1)},${fToY(f).toFixed(1)}`);
  }
  return pts.join(" ");
}

// Laminar line
function laminarPath(): string {
  const pts: string[] = [];
  const Res = [600, 800, 1000, 1500, 2000, 2300];
  for (const Re of Res) {
    const f = 64 / Re;
    if (f > F_MAX) continue;
    pts.push(`${reToX(Re).toFixed(1)},${fToY(f).toFixed(1)}`);
  }
  return pts.join(" ");
}

// ── Axis ticks ─────────────────────────────────────────────────────────────────
const RE_TICKS = [1e3, 2e3, 4e3, 1e4, 2e4, 4e4, 1e5, 2e5, 4e5, 1e6, 2e6, 4e6, 1e7, 2e7, 4e7, 1e8];
const F_TICKS  = [0.008, 0.01, 0.015, 0.02, 0.025, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1];

function fmtRe(v: number) {
  const e = Math.round(Math.log10(v));
  const m = v / Math.pow(10, e);
  return m === 1 ? `10⁻¹${e}` : `${m}×10⁻¹${e}`;
}
const SUP: Record<string,string> = {"0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸"};
function toSup(n: number) { return String(n).split("").map(c => SUP[c] ?? c).join(""); }
function fmtReLabel(v: number) {
  const e = Math.log10(v);
  const m = v / Math.pow(10, Math.floor(e));
  if (Math.abs(m - 1) < 0.01) return `10${toSup(Math.floor(e))}`;
  return `${m.toFixed(0)}×10${toSup(Math.floor(e))}`;
}

// ── Rough-pipe label positions (right edge) ────────────────────────────────────
const ED_LABELS: { eD: number; label: string }[] = [
  { eD: 0.05,   label: "ε/D = 0.05" },
  { eD: 0.02,   label: "0.02" },
  { eD: 0.01,   label: "0.01" },
  { eD: 5e-3,   label: "5×10⁻³" },
  { eD: 2e-3,   label: "2×10⁻³" },
  { eD: 1e-3,   label: "10⁻³" },
  { eD: 5e-4,   label: "5×10⁻⁴" },
  { eD: 2e-4,   label: "2×10⁻⁴" },
  { eD: 1e-4,   label: "10⁻⁴" },
  { eD: 1e-5,   label: "10⁻⁵" },
  { eD: 0,      label: "Smooth" },
];

// ── Main component ─────────────────────────────────────────────────────────────
export default function MoodyChartPage() {
  // Input fields
  const [reStr,  setRe]  = useState("100000");
  const [eDStr,  setED]  = useState("0.001");
  const [point,  setPoint] = useState<{ Re: number; f: number; eD: number } | null>(null);
  const [error,  setError] = useState("");

  // Hover tooltip
  const [hover, setHover] = useState<{ x: number; y: number; Re: number; f: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Memoised paths (expensive — only recompute once)
  const paths = useMemo(() => ED_LINES.map((eD) => ({ eD, d: moodyPath(eD) })), []);
  const lamPath = useMemo(() => laminarPath(), []);

  function calculate() {
    setError("");
    const Re = parseFloat(reStr);
    const eD = parseFloat(eDStr);
    if (isNaN(Re) || Re <= 0) { setError("Enter a valid Reynolds number."); return; }
    if (isNaN(eD) || eD < 0) { setError("ε/D must be ≥ 0."); return; }
    if (eD > 0.05)            { setError("ε/D > 0.05 is outside the Moody chart range."); return; }
    const f = colebrook(Re, eD);
    setPoint({ Re, f, eD });
  }

  const handleSvgMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top)  * scaleY;
    if (x < ML || x > W - MR || y < MT || y > H - MB) { setHover(null); return; }
    const Re = xToRe(x);
    const f  = yToF(y);
    setHover({ x, y, Re, f });
  }, []);

  const regime = point
    ? point.Re < 2300 ? "Laminar"
    : point.Re < 4000 ? "Transitional"
    : "Turbulent"
    : "";

  const fmt = (n: number, sig = 4) => parseFloat(n.toPrecision(sig)).toString();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Interactive Moody Chart</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Enter Re and ε/D to plot your operating point. Friction factor from Colebrook-White equation. Hover over the chart to read values.
        </p>
      </div>

      {/* Input row */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Reynolds number Re</label>
            <input type="number" value={reStr} onChange={(e) => setRe(e.target.value)}
              onKeyDown={(ev) => ev.key === "Enter" && calculate()}
              className="w-40 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Relative roughness ε/D</label>
            <input type="number" value={eDStr} onChange={(e) => setED(e.target.value)}
              onKeyDown={(ev) => ev.key === "Enter" && calculate()}
              step="0.0001" min="0" max="0.05"
              className="w-36 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={calculate}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
            Plot Point
          </button>
          {point && (
            <div className="flex gap-4 items-center text-sm">
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl px-4 py-2">
                <span className="text-blue-500 dark:text-blue-400 font-semibold text-xs">Darcy f =&nbsp;</span>
                <span className="text-blue-700 dark:text-blue-200 font-bold font-mono text-lg">{fmt(point.f, 4)}</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2">
                <span className="text-gray-500 dark:text-gray-400 text-xs font-semibold">Regime: </span>
                <span className={`font-bold text-sm ${regime === "Laminar" ? "text-green-600 dark:text-green-400" : regime === "Turbulent" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>{regime}</span>
              </div>
            </div>
          )}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        {/* Quick roughness presets */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500 self-center">Quick ε/D:</span>
          {[
            ["Smooth pipe",        "0"],
            ["Drawn copper/PVC",   "0.000002"],
            ["Commercial steel",   "0.000046"],
            ["Galvanised iron",    "0.00015"],
            ["Cast iron",          "0.00026"],
            ["Concrete (smooth)",  "0.0003"],
            ["Riveted steel",      "0.002"],
          ].map(([label, val]) => (
            <button key={val} onClick={() => setED(val)}
              className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Moody chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ fontFamily: "sans-serif" }}
          onMouseMove={handleSvgMove}
          onMouseLeave={() => setHover(null)}
        >
          {/* Background */}
          <rect x={ML} y={MT} width={PW} height={PH} fill="white" stroke="#e5e7eb" />

          {/* Grid lines — Re */}
          {RE_TICKS.map((Re) => {
            const x = reToX(Re);
            return (
              <line key={Re} x1={x} y1={MT} x2={x} y2={MT + PH}
                stroke="#f0f0f0" strokeWidth={0.5} />
            );
          })}
          {/* Grid lines — f */}
          {F_TICKS.map((f) => {
            const y = fToY(f);
            return (
              <line key={f} x1={ML} y1={y} x2={ML + PW} y2={y}
                stroke="#f0f0f0" strokeWidth={0.5} />
            );
          })}

          {/* Flow-regime shading */}
          {/* Laminar region */}
          <rect x={ML} y={MT}
            width={Math.max(0, reToX(2300) - ML)}
            height={PH}
            fill="#f0fdf4" fillOpacity={0.5} />
          {/* Transitional */}
          <rect x={reToX(2300)} y={MT}
            width={Math.max(0, reToX(4000) - reToX(2300))}
            height={PH}
            fill="#fffbeb" fillOpacity={0.5} />

          {/* Moody curves */}
          {paths.map(({ eD, d }) => (
            <polyline key={eD} points={d}
              fill="none"
              stroke={eD === 0 ? "#3b82f6" : "#6b7280"}
              strokeWidth={eD === 0 ? 1.5 : 0.9}
              strokeOpacity={0.75}
            />
          ))}

          {/* Laminar line */}
          <polyline points={lamPath} fill="none" stroke="#10b981" strokeWidth={2} />

          {/* Regime labels */}
          <text x={ML + 5} y={MT + 15} fontSize={9} fill="#15803d" fontWeight="bold">Laminar</text>
          <text x={reToX(3100)} y={MT + 15} fontSize={8} fill="#b45309" textAnchor="middle">Trans.</text>
          <text x={reToX(3e6)} y={MT + 15} fontSize={9} fill="#6b7280">Turbulent</text>

          {/* ε/D labels at right edge */}
          {ED_LABELS.map(({ eD, label }) => {
            const f = colebrook(RE_MAX * 0.95, eD);
            if (f < F_MIN || f > F_MAX) return null;
            const y = fToY(f);
            return (
              <text key={label} x={ML + PW + 2} y={y + 3} fontSize={7} fill="#374151">
                {label}
              </text>
            );
          })}

          {/* Axes */}
          <rect x={ML} y={MT} width={PW} height={PH} fill="none" stroke="#d1d5db" strokeWidth={1} />

          {/* X-axis ticks + labels */}
          {RE_TICKS.map((Re) => {
            const x = reToX(Re);
            return (
              <g key={Re}>
                <line x1={x} y1={MT + PH} x2={x} y2={MT + PH + 5} stroke="#6b7280" strokeWidth={1} />
                <text x={x} y={MT + PH + 16} fontSize={8} textAnchor="middle" fill="#374151">
                  {fmtReLabel(Re)}
                </text>
              </g>
            );
          })}
          <text x={ML + PW / 2} y={H - 4} fontSize={10} textAnchor="middle" fill="#374151" fontWeight="bold">
            Reynolds Number Re
          </text>

          {/* Y-axis ticks + labels */}
          {F_TICKS.map((f) => {
            const y = fToY(f);
            return (
              <g key={f}>
                <line x1={ML - 5} y1={y} x2={ML} y2={y} stroke="#6b7280" strokeWidth={1} />
                <text x={ML - 7} y={y + 3} fontSize={8} textAnchor="end" fill="#374151">
                  {f < 0.01 ? f.toFixed(4) : f.toFixed(3)}
                </text>
              </g>
            );
          })}
          <text
            transform={`translate(14, ${MT + PH / 2}) rotate(-90)`}
            fontSize={10} textAnchor="middle" fill="#374151" fontWeight="bold">
            Darcy Friction Factor  f
          </text>

          {/* Hover crosshair */}
          {hover && (
            <g>
              <line x1={hover.x} y1={MT} x2={hover.x} y2={MT + PH} stroke="#ef4444" strokeWidth={0.8} strokeDasharray="4,3" />
              <line x1={ML} y1={hover.y} x2={ML + PW} y2={hover.y} stroke="#ef4444" strokeWidth={0.8} strokeDasharray="4,3" />
              {/* Tooltip box */}
              {(() => {
                const tx = hover.x + 8;
                const ty = hover.y - 28;
                const label = `Re=${hover.Re.toExponential(2)}  f=${hover.f.toFixed(4)}`;
                return (
                  <g>
                    <rect x={tx - 2} y={ty - 10} width={170} height={16} rx={3}
                      fill="white" stroke="#d1d5db" strokeWidth={0.8} />
                    <text x={tx + 2} y={ty + 2} fontSize={8} fill="#111827">{label}</text>
                  </g>
                );
              })()}
            </g>
          )}

          {/* Plotted point */}
          {point && (() => {
            const px = reToX(point.Re);
            const py = fToY(point.f);
            const inBounds = px >= ML && px <= ML + PW && py >= MT && py <= MT + PH;
            if (!inBounds) return null;
            return (
              <g>
                <circle cx={px} cy={py} r={7} fill="#ef4444" stroke="white" strokeWidth={2} />
                <circle cx={px} cy={py} r={12} fill="none" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3,2" opacity={0.6} />
                <text x={px + 14} y={py - 6} fontSize={9} fill="#dc2626" fontWeight="bold">
                  f = {point.f.toFixed(4)}
                </text>
                <text x={px + 14} y={py + 6} fontSize={9} fill="#dc2626">
                  Re = {point.Re.toExponential(3)}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Result detail card */}
      {point && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Re",              val: point.Re.toExponential(4) },
            { label: "ε/D",             val: fmt(point.eD, 3) },
            { label: "Darcy f",         val: fmt(point.f, 5) },
            { label: "Fanning f (= f/4)",val: fmt(point.f / 4, 5) },
          ].map(({ label, val }) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
              <p className="text-base font-bold font-mono text-gray-900 dark:text-gray-100">{val}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-4 space-y-1">
        <p>Turbulent friction factors computed by Colebrook-White equation (iterative, converges in &lt;10 iterations). Laminar: f = 64/Re.</p>
        <p>Darcy–Weisbach: h_L = f × (L/D) × V²/(2g). Some texts use Fanning f = f_Darcy/4 — always confirm which convention is used.</p>
      </div>

      <References refs={REFS_MOODY} />
    </div>
  );
}
