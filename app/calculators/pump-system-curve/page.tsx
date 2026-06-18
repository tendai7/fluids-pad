"use client";

import React, { useState, useId } from "react";
import { References } from "@/components/References";
import { REFS_PUMP_SYSTEM_CURVE } from "@/lib/references";

// ── Physics ───────────────────────────────────────────────────────────────────
function colebrook(Re: number, eD: number): number {
  if (Re < 2300) return 64 / Re;
  let f = 0.02;
  for (let i = 0; i < 50; i++) {
    const r = -2 * Math.log10(eD / 3.7 + 2.51 / (Re * Math.sqrt(f)));
    const fn = 1 / (r * r);
    if (Math.abs(fn - f) < 1e-10) { f = fn; break; }
    f = fn;
  }
  return f;
}

const G = 9.81;
const fmt = (n: number, sig = 4) => parseFloat(n.toPrecision(sig)).toString();

function lerp(x: number, xs: number[], ys: number[]): number | null {
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  for (let i = 0; i < xs.length - 1; i++) {
    if (x <= xs[i + 1]) {
      const t = (x - xs[i]) / (xs[i + 1] - xs[i]);
      return ys[i] + t * (ys[i + 1] - ys[i]);
    }
  }
  return null;
}

// ── Data ──────────────────────────────────────────────────────────────────────
const FLUID_PRESETS = [
  { label: "Water 20°C",  rho: 998.2, mu: 1.002e-3 },
  { label: "Water 60°C",  rho: 983.2, mu: 0.467e-3 },
  { label: "Water 80°C",  rho: 971.8, mu: 0.355e-3 },
  { label: "Diesel",      rho: 840,   mu: 3.0e-3   },
  { label: "Light crude", rho: 870,   mu: 15e-3    },
  { label: "EG 50%",      rho: 1049,  mu: 2.23e-3  },
  { label: "Seawater",    rho: 1023,  mu: 1.07e-3  },
];

const PIPE_MATERIALS = [
  { label: "Commercial / wrought steel",  eps: 0.046  },
  { label: "Galvanised steel",            eps: 0.15   },
  { label: "Cast iron (unlined)",         eps: 0.26   },
  { label: "Stainless steel",             eps: 0.015  },
  { label: "Drawn copper / brass",        eps: 0.0015 },
  { label: "PVC / HDPE",                  eps: 0.0015 },
  { label: "Custom (enter ε below)",      eps: NaN    },
];

const FITTINGS = [
  { g:"Elbows",        label:"90° elbow — standard (flanged)",       K: 0.9  },
  { g:"Elbows",        label:"90° elbow — long-radius R/D=1.5",      K: 0.4  },
  { g:"Elbows",        label:"45° elbow",                            K: 0.4  },
  { g:"Elbows",        label:"180° return bend",                     K: 1.5  },
  { g:"Tees",          label:"Tee — flow through run",                K: 0.6  },
  { g:"Tees",          label:"Tee — flow through branch",             K: 1.8  },
  { g:"Valves",        label:"Gate valve (fully open)",               K: 0.2  },
  { g:"Valves",        label:"Globe valve (fully open)",              K: 10.0 },
  { g:"Valves",        label:"Ball valve (fully open)",               K: 0.1  },
  { g:"Valves",        label:"Butterfly valve (fully open)",          K: 0.6  },
  { g:"Valves",        label:"Check valve — swing",                   K: 2.5  },
  { g:"Valves",        label:"Check valve — lift",                    K: 12.0 },
  { g:"Entries/Exits", label:"Sharp-edged entry",                    K: 0.5  },
  { g:"Entries/Exits", label:"Well-rounded entry",                   K: 0.04 },
  { g:"Entries/Exits", label:"Sharp exit",                           K: 1.0  },
  { g:"Other",         label:"Strainer / Y-filter",                  K: 2.0  },
  { g:"Other",         label:"Foot valve with strainer",             K: 15.0 },
  { g:"Other",         label:"Custom (enter K below)",               K: NaN  },
];

// ── Units ─────────────────────────────────────────────────────────────────────
type FlowUnit = "m³/s" | "m³/h" | "L/s" | "L/min" | "GPM";
type DiamUnit = "mm" | "in";
type LenUnit  = "m" | "ft";
type HeadUnit = "m" | "ft";

const FLOW_M3S: Record<FlowUnit, number> = { "m³/s":1, "m³/h":1/3600, "L/s":1e-3, "L/min":1/60000, GPM:6.309e-5 };
const DIAM_M:  Record<DiamUnit, number>  = { mm:1e-3, in:0.0254 };
const LEN_M:   Record<LenUnit,  number>  = { m:1, ft:0.3048 };
const HEAD_M:  Record<HeadUnit, number>  = { m:1, ft:0.3048 };

// ── Types ─────────────────────────────────────────────────────────────────────
type InputMode = "quick" | "segments";

interface Fitting  { fitIdx: number; qty: string; customK: string; }
interface Segment  {
  id: string; name: string;
  diam: string; diamUnit: DiamUnit;
  len: string;  lenUnit: LenUnit;
  matIdx: number; customEps: string;
  fittings: Fitting[];
}

interface Result {
  sysQs: number[];  sysHs: number[];
  pmpQs: number[];  pmpHs: number[];
  effQs: number[];  effEtas: number[];
  dutyQ: number | null;
  dutyH: number | null;
  dutyEta: number | null;
  dutyPower: number | null;   // kW
  Hstatic: number;
  rho: number;
  // Affinity
  speedRatio: number;
  altQs: number[]; altHs: number[];
  altDutyQ: number | null; altDutyH: number | null;
}

// ── Chart component ───────────────────────────────────────────────────────────
function Chart({ r, qUnit, headUnit }: { r: Result; qUnit: FlowUnit; headUnit: HeadUnit }) {
  const qScale = 1 / FLOW_M3S[qUnit];  // m³/s → display unit
  const hScale = 1 / HEAD_M[headUnit];

  const allQ = [...r.sysQs, ...r.pmpQs, ...r.altQs].map((q) => q * qScale);
  const allH = [...r.sysHs, ...r.pmpHs, ...r.altHs].map((h) => h * hScale);
  if (!allQ.length) return null;

  const W = 720, H = 380;
  const ML = 60, MR = 130, MT = 20, MB = 50;
  const PW = W - ML - MR, PH = H - MT - MB;

  const Qmax = Math.max(...allQ, 0.001) * 1.1;
  const Hmax = Math.max(...allH, 0.001) * 1.15;

  function qX(q: number) { return ML + (q * qScale / Qmax) * PW; }
  function hY(h: number) { return MT + (1 - h * hScale / Hmax) * PH; }

  // Efficiency axis (right side, 0–100%)
  function etaY(eta: number) { return MT + (1 - eta / 100) * PH; }

  const sysPath = r.sysQs.map((q, i) => `${qX(q).toFixed(1)},${hY(r.sysHs[i]).toFixed(1)}`).join(" ");
  const pmpPath = r.pmpQs.map((q, i) => `${qX(q).toFixed(1)},${hY(r.pmpHs[i]).toFixed(1)}`).join(" ");
  const altPath = r.altQs.length > 1 ? r.altQs.map((q, i) => `${qX(q).toFixed(1)},${hY(r.altHs[i]).toFixed(1)}`).join(" ") : "";
  const effPath = r.effQs.length > 1 ? r.effQs.map((q, i) => `${qX(q).toFixed(1)},${etaY(r.effEtas[i]).toFixed(1)}`).join(" ") : "";

  const QTICKS = 6, HTICKS = 5;
  const qStep = Qmax / QTICKS, hStep = Hmax / HTICKS;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ fontFamily: "sans-serif" }}>
      <rect x={ML} y={MT} width={PW} height={PH} fill="white" stroke="#e5e7eb" />

      {/* Grid */}
      {Array.from({ length: QTICKS + 1 }, (_, i) => (
        <line key={i} x1={qX(i * qStep / qScale)} y1={MT} x2={qX(i * qStep / qScale)} y2={MT + PH} stroke="#f3f4f6" strokeWidth={0.8} />
      ))}
      {Array.from({ length: HTICKS + 1 }, (_, i) => (
        <line key={i} x1={ML} y1={hY(i * hStep / hScale)} x2={ML + PW} y2={hY(i * hStep / hScale)} stroke="#f3f4f6" strokeWidth={0.8} />
      ))}

      {/* Efficiency curve (dashed, right-axis) */}
      {effPath && <polyline points={effPath} fill="none" stroke="#10b981" strokeWidth={1.8} strokeDasharray="5,3" opacity={0.8} />}

      {/* Alternate speed pump curve */}
      {altPath && <polyline points={altPath} fill="none" stroke="#818cf8" strokeWidth={1.8} strokeDasharray="8,4" />}

      {/* System curve */}
      {sysPath && <polyline points={sysPath} fill="none" stroke="#3b82f6" strokeWidth={2.5} />}

      {/* Pump curve */}
      {pmpPath && r.pmpQs.length > 1 && <polyline points={pmpPath} fill="none" stroke="#f59e0b" strokeWidth={2.5} />}

      {/* Duty point — main */}
      {r.dutyQ != null && r.dutyH != null && (() => {
        const dx = qX(r.dutyQ), dy = hY(r.dutyH);
        return (
          <g>
            <line x1={dx} y1={MT} x2={dx} y2={MT + PH} stroke="#ef4444" strokeWidth={1} strokeDasharray="4,3" />
            <line x1={ML} y1={dy} x2={ML + PW} y2={dy} stroke="#ef4444" strokeWidth={1} strokeDasharray="4,3" />
            <circle cx={dx} cy={dy} r={7} fill="#ef4444" stroke="white" strokeWidth={2} />
            <text x={dx + 10} y={dy - 5} fontSize={9} fill="#dc2626" fontWeight="bold">
              Q={fmt(r.dutyQ * qScale, 3)} {qUnit}
            </text>
            <text x={dx + 10} y={dy + 7} fontSize={9} fill="#dc2626">
              H={fmt(r.dutyH * hScale, 4)} {headUnit}
            </text>
          </g>
        );
      })()}

      {/* Alt duty point */}
      {r.altDutyQ != null && r.altDutyH != null && (() => {
        const dx = qX(r.altDutyQ), dy = hY(r.altDutyH);
        return (
          <circle cx={dx} cy={dy} r={5} fill="#818cf8" stroke="white" strokeWidth={2} />
        );
      })()}

      {/* Axes */}
      <rect x={ML} y={MT} width={PW} height={PH} fill="none" stroke="#d1d5db" />

      {/* X ticks */}
      {Array.from({ length: QTICKS + 1 }, (_, i) => {
        const q = i * qStep;
        const x = qX(q / qScale);
        return (
          <g key={i}>
            <line x1={x} y1={MT + PH} x2={x} y2={MT + PH + 4} stroke="#6b7280" strokeWidth={1} />
            <text x={x} y={MT + PH + 14} fontSize={8} textAnchor="middle" fill="#374151">
              {parseFloat(q.toPrecision(3))}
            </text>
          </g>
        );
      })}
      <text x={ML + PW / 2} y={H - 5} fontSize={10} textAnchor="middle" fill="#374151" fontWeight="bold">
        Flow Q ({qUnit})
      </text>

      {/* Y ticks (head) */}
      {Array.from({ length: HTICKS + 1 }, (_, i) => {
        const hVal = i * hStep;
        const y = hY(hVal / hScale);
        return (
          <g key={i}>
            <line x1={ML - 4} y1={y} x2={ML} y2={y} stroke="#6b7280" strokeWidth={1} />
            <text x={ML - 6} y={y + 3} fontSize={8} textAnchor="end" fill="#374151">
              {parseFloat(hVal.toPrecision(3))}
            </text>
          </g>
        );
      })}
      <text transform={`translate(14,${MT + PH / 2}) rotate(-90)`} fontSize={10} textAnchor="middle" fill="#374151" fontWeight="bold">
        Head H ({headUnit})
      </text>

      {/* Efficiency Y-axis (right) */}
      {effPath && (
        <>
          {[0, 25, 50, 75, 100].map((eta) => (
            <g key={eta}>
              <line x1={ML + PW} y1={etaY(eta)} x2={ML + PW + 4} y2={etaY(eta)} stroke="#6b7280" strokeWidth={1} />
              <text x={ML + PW + 7} y={etaY(eta) + 3} fontSize={8} fill="#374151">{eta}%</text>
            </g>
          ))}
          <text transform={`translate(${W - 15},${MT + PH / 2}) rotate(90)`} fontSize={9} textAnchor="middle" fill="#10b981">η (%)</text>
        </>
      )}

      {/* Legend */}
      <g>
        {[
          { color: "#3b82f6",  dash: "",      label: "System curve" },
          { color: "#f59e0b",  dash: "",      label: "Pump curve" },
          { color: "#818cf8",  dash: "8,4",   label: "Pump @ alt. speed" },
          { color: "#10b981",  dash: "5,3",   label: "Efficiency η" },
        ].map(({ color, dash, label }, i) => (
          <g key={label} transform={`translate(${ML + i * 130}, ${MT + 10})`}>
            <line x1={0} y1={0} x2={20} y2={0} stroke={color} strokeWidth={2} strokeDasharray={dash} />
            <text x={24} y={4} fontSize={9} fill="#374151">{label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PumpSystemCurvePage() {
  const uid = useId();

  // Fluid
  const [rhoStr, setRho] = useState("998.2");
  const [muStr,  setMu]  = useState("0.001002");

  // System curve mode
  const [mode, setMode] = useState<InputMode>("quick");

  // Quick mode
  const [hStaticStr, setHStatic]   = useState("20");
  const [qDesignStr, setQDesign]   = useState("30");
  const [qDesignUnit,setQDesignUnit]= useState<FlowUnit>("m³/h");
  const [hFricStr,   setHFric]     = useState("15");   // friction + minor head loss at design Q

  // Segments mode
  const [hStaticSegStr, setHStaticSeg] = useState("20");
  const [segments, setSegs] = useState<Segment[]>([
    { id: uid+"0", name:"Suction pipe",    diam:"150",diamUnit:"mm",len:"5", lenUnit:"m",matIdx:0,customEps:"0.046",fittings:[{fitIdx:0,qty:"1",customK:""}] },
    { id: uid+"1", name:"Discharge pipe",  diam:"125",diamUnit:"mm",len:"40",lenUnit:"m",matIdx:0,customEps:"0.046",fittings:[{fitIdx:0,qty:"3",customK:""},{fitIdx:6,qty:"1",customK:""}] },
  ]);

  // Pump curve
  const [pumpPoints, setPump] = useState([
    { Q:"0",  H:"65" }, { Q:"10", H:"63" }, { Q:"20", H:"58" },
    { Q:"30", H:"50" }, { Q:"40", H:"38" }, { Q:"50", H:"22" }, { Q:"55", H:"10" },
  ]);
  const [pumpQUnit, setPumpQUnit] = useState<FlowUnit>("m³/h");

  // Efficiency curve (optional)
  const [showEff, setShowEff] = useState(false);
  const [effPoints, setEff] = useState([
    { Q:"10",eta:"52" }, { Q:"20",eta:"67" }, { Q:"30",eta:"74" },
    { Q:"40",eta:"72" }, { Q:"50",eta:"60" }, { Q:"55",eta:"48" },
  ]);

  // Affinity laws
  const [showAffinity, setShowAffinity] = useState(false);
  const [speedRatioStr, setSpeedRatio] = useState("0.85");

  // Display
  const [qUnit,    setQUnit]    = useState<FlowUnit>("m³/h");
  const [headUnit, setHeadUnit] = useState<HeadUnit>("m");

  const [result, setResult] = useState<Result | null>(null);
  const [error,  setError]  = useState("");

  // Segment helpers
  function addSeg() { setSegs((s) => [...s, { id:uid+Date.now(), name:`Segment ${s.length+1}`, diam:"100",diamUnit:"mm",len:"10",lenUnit:"m",matIdx:0,customEps:"0.046",fittings:[] }]); }
  function removeSeg(id: string) { setSegs((s) => s.filter((x) => x.id !== id)); }
  function patchSeg(id: string, p: Partial<Segment>) { setSegs((s) => s.map((x) => x.id === id ? { ...x, ...p } : x)); }
  function addFit(id: string) { setSegs((s) => s.map((x) => x.id === id ? { ...x, fittings:[...x.fittings,{fitIdx:0,qty:"1",customK:""}] } : x)); }
  function removeFit(id: string, fi: number) { setSegs((s) => s.map((x) => x.id === id ? { ...x, fittings:x.fittings.filter((_,i)=>i!==fi) } : x)); }
  function patchFit(id: string, fi: number, p: Partial<Fitting>) { setSegs((s) => s.map((x) => x.id === id ? { ...x, fittings:x.fittings.map((f,i)=>i===fi?{...f,...p}:f) } : x)); }

  function calculate() {
    setError("");
    const rho = parseFloat(rhoStr);
    const mu  = parseFloat(muStr);
    if (isNaN(rho) || rho <= 0 || isNaN(mu) || mu <= 0) { setError("Enter valid fluid properties."); return; }

    // ── Build system curve ────────────────────────────────────────────────────
    let Hstatic = 0;
    let sysQs: number[], sysHs: number[];

    if (mode === "quick") {
      Hstatic = parseFloat(hStaticStr);
      const Qd  = parseFloat(qDesignStr) * FLOW_M3S[qDesignUnit];
      const Hfd = parseFloat(hFricStr);
      if ([Hstatic, Qd, Hfd].some(isNaN) || Qd <= 0 || Hfd < 0) { setError("Check quick-mode inputs."); return; }
      const R = Hfd / (Qd ** 2);  // m/(m³/s)²
      sysQs = Array.from({ length: 80 }, (_, i) => (i / 79) * 1.5 * Qd);
      sysHs = sysQs.map((Q) => Hstatic + R * Q ** 2);
    } else {
      Hstatic = parseFloat(hStaticSegStr) || 0;
      // Compute R from segments at each Q
      // First compute resistance coefficient per segment
      type SegCoeff = { A: number; eps: number };
      const segCoeffs: SegCoeff[] = [];
      const Qref = 0.01; // small reference flow to estimate velocities

      for (const seg of segments) {
        const D = parseFloat(seg.diam) * DIAM_M[seg.diamUnit];
        const L = parseFloat(seg.len)  * LEN_M[seg.lenUnit];
        const mat = PIPE_MATERIALS[seg.matIdx];
        const eps = (isNaN(mat.eps) ? parseFloat(seg.customEps) : mat.eps) / 1000;
        if ([D, L].some((v) => isNaN(v) || v <= 0)) { setError(`Invalid dimensions in "${seg.name}".`); return; }
        const A = Math.PI / 4 * D ** 2;
        segCoeffs.push({ A, eps: eps / D });
      }

      // For each Q build H_friction
      const Q_max_est = 0.1; // 360 m³/h max, adjust if needed
      sysQs = Array.from({ length: 80 }, (_, i) => (i + 1) / 79 * Q_max_est);
      sysHs = sysQs.map((Q) => {
        let H_fric = 0;
        for (let si = 0; si < segments.length; si++) {
          const seg = segments[si];
          const D = parseFloat(seg.diam) * DIAM_M[seg.diamUnit];
          const L = parseFloat(seg.len)  * LEN_M[seg.lenUnit];
          const A = segCoeffs[si].A;
          const eD = segCoeffs[si].eps;
          const vel = Q / A;
          const Re  = rho * vel * D / mu;
          const f   = colebrook(Re, eD);
          const hf  = f * (L / D) * vel ** 2 / (2 * G);
          let hm = 0;
          for (const fit of seg.fittings) {
            const qty = parseFloat(fit.qty) || 0;
            const fd = FITTINGS[fit.fitIdx];
            const K = isNaN(fd.K) ? (parseFloat(fit.customK) || 0) : fd.K;
            hm += qty * K * vel ** 2 / (2 * G);
          }
          H_fric += hf + hm;
        }
        return Hstatic + H_fric;
      });
      sysQs = [0, ...sysQs];
      sysHs = [Hstatic, ...sysHs];
    }

    // ── Pump curve ────────────────────────────────────────────────────────────
    const pmpQsSI = pumpPoints.map((p) => parseFloat(p.Q) * FLOW_M3S[pumpQUnit]).filter(isFinite);
    const pmpHsSI = pumpPoints.map((p) => parseFloat(p.H)).filter(isFinite);
    if (pmpQsSI.length < 2) { setError("Enter at least 2 pump curve points."); return; }

    // Smooth pump curve by interpolating over range
    const pmpRange = Math.max(...pmpQsSI);
    const pmpQs = Array.from({ length: 60 }, (_, i) => (i / 59) * pmpRange);
    const pmpHs = pmpQs.map((Q) => lerp(Q, pmpQsSI, pmpHsSI) ?? 0).filter((h) => h >= 0);
    const pmpQsFilt = pmpQs.slice(0, pmpHs.length);

    // ── Efficiency curve ──────────────────────────────────────────────────────
    let effQsSI: number[] = [], effEtas: number[] = [];
    if (showEff) {
      effQsSI = effPoints.map((p) => parseFloat(p.Q) * FLOW_M3S[pumpQUnit]).filter(isFinite);
      effEtas = effPoints.map((p) => parseFloat(p.eta)).filter(isFinite);
    }

    // ── Duty point (intersection) ─────────────────────────────────────────────
    let dutyQ: number | null = null, dutyH: number | null = null;
    const sysRange = Math.max(...sysQs);
    const checkQs = Array.from({ length: 400 }, (_, i) => (i / 399) * Math.min(sysRange, pmpRange));

    for (let i = 0; i < checkQs.length - 1; i++) {
      const Q1 = checkQs[i], Q2 = checkQs[i + 1];
      const sH1 = lerp(Q1, sysQs, sysHs), sH2 = lerp(Q2, sysQs, sysHs);
      const pH1 = lerp(Q1, pmpQsSI, pmpHsSI), pH2 = lerp(Q2, pmpQsSI, pmpHsSI);
      if (sH1 == null || sH2 == null || pH1 == null || pH2 == null) continue;
      if ((pH1 - sH1) * (pH2 - sH2) < 0) {
        const t = (pH1 - sH1) / ((pH1 - sH1) - (pH2 - sH2));
        dutyQ = Q1 + t * (Q2 - Q1);
        dutyH = sH1 + t * (sH2 - sH1);
        break;
      }
    }

    // Efficiency + power at duty
    let dutyEta: number | null = null, dutyPower: number | null = null;
    if (dutyQ != null && dutyH != null && showEff && effQsSI.length >= 2) {
      dutyEta = lerp(dutyQ, effQsSI, effEtas);
      if (dutyEta != null && dutyEta > 0) {
        dutyPower = (rho * G * dutyQ * dutyH) / (dutyEta / 100) / 1000; // kW
      }
    } else if (dutyQ != null && dutyH != null) {
      dutyPower = (rho * G * dutyQ * dutyH) / 1000; // hydraulic power kW (no efficiency)
    }

    // ── Affinity laws (alternate speed) ──────────────────────────────────────
    const speedRatio = parseFloat(speedRatioStr) || 1;
    const altQsSI = pmpQsSI.map((Q) => Q * speedRatio);
    const altHsSI = pmpHsSI.map((H) => H * speedRatio ** 2);

    // Duty at alt speed
    let altDutyQ: number | null = null, altDutyH: number | null = null;
    if (showAffinity && altQsSI.length >= 2) {
      const altRange = Math.max(...altQsSI);
      const altCheck = Array.from({ length: 400 }, (_, i) => (i / 399) * Math.min(sysRange, altRange));
      for (let i = 0; i < altCheck.length - 1; i++) {
        const Q1 = altCheck[i], Q2 = altCheck[i + 1];
        const sH1 = lerp(Q1, sysQs, sysHs), sH2 = lerp(Q2, sysQs, sysHs);
        const pH1 = lerp(Q1, altQsSI, altHsSI), pH2 = lerp(Q2, altQsSI, altHsSI);
        if (sH1 == null || sH2 == null || pH1 == null || pH2 == null) continue;
        if ((pH1 - sH1) * (pH2 - sH2) < 0) {
          const t = (pH1 - sH1) / ((pH1 - sH1) - (pH2 - sH2));
          altDutyQ = Q1 + t * (Q2 - Q1);
          altDutyH = sH1 + t * (sH2 - sH1);
          break;
        }
      }
    }

    setResult({ sysQs, sysHs, pmpQs: pmpQsFilt, pmpHs, effQs: effQsSI, effEtas, dutyQ, dutyH, dutyEta, dutyPower, Hstatic, rho, speedRatio, altQs: showAffinity ? altQsSI : [], altHs: showAffinity ? altHsSI : [], altDutyQ: showAffinity ? altDutyQ : null, altDutyH: showAffinity ? altDutyH : null });
  }

  const r = result;
  const qScale = 1 / FLOW_M3S[qUnit];
  const hScale = 1 / HEAD_M[headUnit];

  function NumInput({ val, onChange, w = "w-full", placeholder }: { val: string; onChange: (v: string) => void; w?: string; placeholder?: string }) {
    return (
      <input type="number" value={val} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`${w} px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500`} />
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Pump System Curve Builder</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Generate the pipe system H–Q curve, overlay a pump curve to find the operating point. Includes efficiency, hydraulic power, and affinity-law speed scaling.
        </p>
      </div>

      {/* Fluid */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Fluid</h2>
        <div className="flex flex-wrap gap-2">
          {FLUID_PRESETS.map((p) => (
            <button key={p.label} onClick={() => { setRho(String(p.rho)); setMu(String(p.mu)); }}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-600 transition-colors">
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Density ρ (kg/m³)</label>
            <NumInput val={rhoStr} onChange={setRho} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Dynamic viscosity μ (Pa·s)</label>
            <NumInput val={muStr} onChange={setMu} />
          </div>
        </div>
      </div>

      {/* System curve */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">System curve</h2>
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-sm">
            {(["quick", "segments"] as InputMode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-4 py-1.5 font-medium transition-colors capitalize ${mode === m ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"}`}>
                {m === "quick" ? "Quick" : "Pipe segments"}
              </button>
            ))}
          </div>
        </div>

        {mode === "quick" ? (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Enter the total friction + minor head loss at one known flow rate. The tool fits a parabola H_sys = H_static + R·Q².</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Static head H_s (m)</label>
                <NumInput val={hStaticStr} onChange={setHStatic} placeholder="elevation + pressure diff" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Design flow Q</label>
                <div className="flex gap-1">
                  <NumInput val={qDesignStr} onChange={setQDesign} w="flex-1 min-w-0" />
                  <select value={qDesignUnit} onChange={(e) => setQDesignUnit(e.target.value as FlowUnit)}
                    className="px-2 py-2 text-xs rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none">
                    {(Object.keys(FLOW_M3S) as FlowUnit[]).map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Friction + minor losses at design Q (m)</label>
                <NumInput val={hFricStr} onChange={setHFric} placeholder="from Pipe Run designer" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Static head H_s (m)</label>
                <NumInput val={hStaticSegStr} onChange={setHStaticSeg} w="w-32" />
              </div>
              <button onClick={addSeg}
                className="self-end px-3 py-2 text-sm rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                + Add segment
              </button>
            </div>

            <div className="space-y-4">
              {segments.map((seg, si) => {
                const mat = PIPE_MATERIALS[seg.matIdx];
                return (
                  <div key={seg.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">#{si + 1}</span>
                      <input value={seg.name} onChange={(e) => patchSeg(seg.id, { name: e.target.value })}
                        className="flex-1 px-3 py-1.5 text-sm font-semibold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      {segments.length > 1 && (
                        <button onClick={() => removeSeg(seg.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded">Remove</button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Diameter</label>
                        <div className="flex gap-1">
                          <NumInput val={seg.diam} onChange={(v) => patchSeg(seg.id, { diam: v })} w="flex-1 min-w-0" />
                          <select value={seg.diamUnit} onChange={(e) => patchSeg(seg.id, { diamUnit: e.target.value as DiamUnit })}
                            className="px-2 py-2 text-xs rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none">
                            <option>mm</option><option>in</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Length</label>
                        <div className="flex gap-1">
                          <NumInput val={seg.len} onChange={(v) => patchSeg(seg.id, { len: v })} w="flex-1 min-w-0" />
                          <select value={seg.lenUnit} onChange={(e) => patchSeg(seg.id, { lenUnit: e.target.value as LenUnit })}
                            className="px-2 py-2 text-xs rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none">
                            <option>m</option><option>ft</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Material</label>
                        <select value={seg.matIdx} onChange={(e) => patchSeg(seg.id, { matIdx: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none">
                          {PIPE_MATERIALS.map((m, i) => <option key={i} value={i}>{m.label}{isNaN(m.eps) ? "" : ` (ε=${m.eps})`}</option>)}
                        </select>
                        {isNaN(mat.eps) && (
                          <div className="mt-1 flex gap-2 items-center">
                            <span className="text-xs text-gray-500 dark:text-gray-400">ε (mm)</span>
                            <NumInput val={seg.customEps} onChange={(v) => patchSeg(seg.id, { customEps: v })} w="w-24" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fittings</span>
                        <button onClick={() => addFit(seg.id)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">+ add</button>
                      </div>
                      {seg.fittings.length === 0 && <p className="text-xs text-gray-400 italic">No fittings</p>}
                      <div className="space-y-1">
                        {seg.fittings.map((fit, fi) => {
                          const fd = FITTINGS[fit.fitIdx];
                          return (
                            <div key={fi} className="flex gap-2 items-center">
                              <select value={fit.fitIdx} onChange={(e) => patchFit(seg.id, fi, { fitIdx: Number(e.target.value) })}
                                className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none">
                                {Object.entries(FITTINGS.reduce<Record<string,{label:string;K:number;_i:number}[]>>((a,f,i)=>{ (a[f.g]=a[f.g]??[]).push({...f,_i:i}); return a; },{})).map(([grp,items])=>(
                                  <optgroup key={grp} label={grp}>
                                    {items.map((f)=><option key={f._i} value={f._i}>{f.label}{isNaN(f.K)?"":" (K="+f.K+")"}</option>)}
                                  </optgroup>
                                ))}
                              </select>
                              {isNaN(fd.K) && <NumInput val={fit.customK} onChange={(v)=>patchFit(seg.id,fi,{customK:v})} w="w-20" placeholder="K" />}
                              <NumInput val={fit.qty} onChange={(v)=>patchFit(seg.id,fi,{qty:v})} w="w-12" />
                              <span className="text-xs text-gray-400 whitespace-nowrap">qty</span>
                              <button onClick={()=>removeFit(seg.id,fi)} className="text-xs text-red-400 hover:text-red-600 px-1">✕</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Pump curve */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Pump H–Q curve</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Enter data from the pump datasheet (at rated speed). Add more points for a more accurate curve.</p>

        <div className="flex gap-4 items-center text-xs text-gray-500 dark:text-gray-400 flex-wrap">
          <span>Flow unit:</span>
          <select value={pumpQUnit} onChange={(e) => setPumpQUnit(e.target.value as FlowUnit)}
            className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
            {(Object.keys(FLOW_M3S) as FlowUnit[]).map((u) => <option key={u}>{u}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">H–Q points (head in metres)</p>
            <div className="space-y-1.5">
              {pumpPoints.map((pt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input type="number" value={pt.Q} onChange={(e) => setPump((p) => p.map((x, j) => j === i ? { ...x, Q: e.target.value } : x))}
                    placeholder={`Q (${pumpQUnit})`}
                    className="w-28 px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none" />
                  <input type="number" value={pt.H} onChange={(e) => setPump((p) => p.map((x, j) => j === i ? { ...x, H: e.target.value } : x))}
                    placeholder="H (m)"
                    className="w-28 px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none" />
                  <button onClick={() => setPump((p) => p.filter((_, j) => j !== i))} className="text-xs text-red-400 hover:text-red-600">✕</button>
                </div>
              ))}
              <button onClick={() => setPump((p) => [...p, { Q: "", H: "" }])}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1">+ add point</button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={showEff} onChange={(e) => setShowEff(e.target.checked)} className="rounded" />
                Efficiency curve η–Q (optional)
              </label>
            </div>
            {showEff && (
              <div className="space-y-1.5">
                {effPoints.map((pt, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input type="number" value={pt.Q} onChange={(e) => setEff((p) => p.map((x, j) => j === i ? { ...x, Q: e.target.value } : x))}
                      placeholder={`Q (${pumpQUnit})`}
                      className="w-24 px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none" />
                    <input type="number" value={pt.eta} onChange={(e) => setEff((p) => p.map((x, j) => j === i ? { ...x, eta: e.target.value } : x))}
                      placeholder="η (%)"
                      className="w-24 px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none" />
                    <button onClick={() => setEff((p) => p.filter((_, j) => j !== i))} className="text-xs text-red-400 hover:text-red-600">✕</button>
                  </div>
                ))}
                <button onClick={() => setEff((p) => [...p, { Q: "", eta: "" }])}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1">+ add point</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Affinity laws */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer mb-3">
          <input type="checkbox" checked={showAffinity} onChange={(e) => setShowAffinity(e.target.checked)} className="rounded" />
          Affinity laws — alternate speed
        </label>
        {showAffinity && (
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Speed ratio N₂/N₁</label>
              <NumInput val={speedRatioStr} onChange={setSpeedRatio} w="w-28" placeholder="0.85" />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">e.g. 0.85 = 85% of rated speed</p>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 pb-2 space-y-0.5">
              <p>Q₂ = Q₁ × (N₂/N₁)</p>
              <p>H₂ = H₁ × (N₂/N₁)²</p>
              <p>P₂ = P₁ × (N₂/N₁)³</p>
            </div>
          </div>
        )}
      </div>

      {/* Display units + calculate */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400 font-semibold">Chart Q unit</span>
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            {(Object.keys(FLOW_M3S) as FlowUnit[]).map((u) => (
              <button key={u} onClick={() => setQUnit(u)}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${qUnit === u ? "bg-blue-500 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"}`}>
                {u}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400 font-semibold">Head unit</span>
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            {(["m", "ft"] as HeadUnit[]).map((u) => (
              <button key={u} onClick={() => setHeadUnit(u)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${headUnit === u ? "bg-blue-500 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"}`}>
                {u}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button onClick={calculate}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-sm">
          Build Curves
        </button>
      </div>

      {/* Results */}
      {r && (
        <>
          {/* Duty point cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {r.dutyQ != null ? (
              <>
                <div className="col-span-2 md:col-span-1 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
                  <p className="text-xs font-semibold text-blue-500 dark:text-blue-400 mb-1">Duty flow Q</p>
                  <p className="text-2xl font-bold font-mono text-blue-700 dark:text-blue-300">
                    {fmt(r.dutyQ * qScale, 4)} {qUnit}
                  </p>
                  <p className="text-xs text-blue-400 font-mono">{fmt(r.dutyQ * 3600, 4)} m³/h</p>
                </div>
                <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
                  <p className="text-xs font-semibold text-blue-500 dark:text-blue-400 mb-1">Duty head H</p>
                  <p className="text-2xl font-bold font-mono text-blue-700 dark:text-blue-300">
                    {fmt(r.dutyH! * hScale, 4)} {headUnit}
                  </p>
                  <p className="text-xs text-blue-400 font-mono">{fmt(r.dutyH! * r.rho * G / 1000, 4)} kPa</p>
                </div>
                {r.dutyPower != null && (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      {r.dutyEta != null ? "Shaft power" : "Hydraulic power"}
                    </p>
                    <p className="text-2xl font-bold font-mono text-gray-900 dark:text-gray-100">{fmt(r.dutyPower, 4)} kW</p>
                    {r.dutyEta != null && <p className="text-xs text-gray-500 dark:text-gray-400">η = {fmt(r.dutyEta, 3)} %</p>}
                  </div>
                )}
                {r.dutyEta == null && (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Hydraulic power</p>
                    <p className="text-2xl font-bold font-mono text-gray-900 dark:text-gray-100">{fmt(r.rho * G * r.dutyQ! * r.dutyH! / 1000, 4)} kW</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Enter η curve for shaft power</p>
                  </div>
                )}
              </>
            ) : (
              <div className="col-span-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                <p className="text-sm text-amber-800 dark:text-amber-300">⚠ No intersection found — the pump curve does not cross the system curve over the computed range. Check that the pump head at low flow exceeds H_static = {fmt(r.Hstatic, 4)} m.</p>
              </div>
            )}
          </div>

          {/* Affinity duty cards */}
          {showAffinity && r.altDutyQ != null && r.altDutyH != null && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-4">
                <p className="text-xs font-semibold text-violet-500 dark:text-violet-400 mb-1">Alt duty Q @ {fmt(r.speedRatio * 100, 3)} % speed</p>
                <p className="text-xl font-bold font-mono text-violet-700 dark:text-violet-300">{fmt(r.altDutyQ * qScale, 4)} {qUnit}</p>
              </div>
              <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-4">
                <p className="text-xs font-semibold text-violet-500 dark:text-violet-400 mb-1">Alt duty H</p>
                <p className="text-xl font-bold font-mono text-violet-700 dark:text-violet-300">{fmt(r.altDutyH * hScale, 4)} {headUnit}</p>
              </div>
              <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-4">
                <p className="text-xs font-semibold text-violet-500 dark:text-violet-400 mb-1">Power ratio (affinity)</p>
                <p className="text-xl font-bold font-mono text-violet-700 dark:text-violet-300">{fmt(r.speedRatio ** 3 * 100, 3)} %</p>
                <p className="text-xs text-violet-400 dark:text-violet-500">of rated power</p>
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
            <Chart r={r} qUnit={qUnit} headUnit={headUnit} />
          </div>

          {/* Static head annotation */}
          <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p><strong>Static head H_s:</strong> {fmt(r.Hstatic, 4)} m &nbsp;·&nbsp; This is the minimum head the pump must deliver at Q = 0 to overcome the fixed system pressure (elevation + discharge pressure).</p>
            <p><strong>System curve:</strong> H_sys = H_s + R·Q² &nbsp;·&nbsp; R is the total hydraulic resistance of the piping system.</p>
            {showEff && r.dutyEta != null && <p><strong>Shaft power:</strong> P = ρgQH / η = {fmt(r.rho * G * r.dutyQ! * r.dutyH! / (r.dutyEta / 100) / 1000, 4)} kW at duty point.</p>}
          </div>
        </>
      )}

      <div className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-4 space-y-1">
        <p>System curve fitted as H_sys = H_static + R·Q² (Quick mode) or computed segment-by-segment with Colebrook-White (Pipe segments mode).</p>
        <p>Duty point found by linear interpolation of the intersection between system and pump curves.</p>
        <p>Affinity laws are exact for geometrically similar operating points — actual performance may deviate due to viscosity effects and impeller trim.</p>
      </div>

      <References refs={REFS_PUMP_SYSTEM_CURVE} />
    </div>
  );
}
