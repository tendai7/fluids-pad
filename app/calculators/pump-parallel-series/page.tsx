"use client";

import React, { useState, useMemo } from "react";
import { References } from "@/components/References";
import { REFS_PUMP_PARALLEL_SERIES } from "@/lib/references";

// ─── Maths ────────────────────────────────────────────────────────────────────

function solve3x3(A: number[][], b: number[]): [number, number, number] | null {
  const m = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 3; col++) {
    let maxRow = col;
    for (let r = col + 1; r < 3; r++) if (Math.abs(m[r][col]) > Math.abs(m[maxRow][col])) maxRow = r;
    [m[col], m[maxRow]] = [m[maxRow], m[col]];
    if (Math.abs(m[col][col]) < 1e-12) return null;
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const f = m[r][col] / m[col][col];
      for (let j = col; j <= 3; j++) m[r][j] -= f * m[col][j];
    }
  }
  return [m[0][3] / m[0][0], m[1][3] / m[1][1], m[2][3] / m[2][2]];
}

/** Least-squares quadratic fit H = a + b·Q + c·Q² */
function quadFit(pts: { Q: number; H: number }[]): [number, number, number] | null {
  if (pts.length < 2) return null;
  const M = [[0,0,0],[0,0,0],[0,0,0]], rhs = [0,0,0];
  for (const { Q, H } of pts) {
    const basis = [1, Q, Q*Q];
    for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) M[i][j] += basis[i]*basis[j]; rhs[i] += basis[i]*H; }
  }
  if (pts.length === 2) M[2][2] += 1e-6;
  return solve3x3(M, rhs);
}

function evalH(c: [number,number,number], Q: number): number { return c[0] + c[1]*Q + c[2]*Q*Q; }

/** Invert H = a+bQ+cQ² — returns Q for a given H, or null if H above shutoff */
function invertQ(c: [number,number,number], H: number): number | null {
  const [a, b, cc] = c;
  if (Math.abs(cc) < 1e-12) {
    if (Math.abs(b) < 1e-12) return null;
    const Q = (H-a)/b;
    return Q >= -1e-6 ? Math.max(0,Q) : null;
  }
  const disc = b*b - 4*cc*(a-H);
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  const q1 = (-b+sq)/(2*cc), q2 = (-b-sq)/(2*cc);
  const cands = [q1,q2].filter(q => q >= -1e-6).map(q => Math.max(0,q));
  if (!cands.length) return null;
  return cc < 0 ? Math.max(...cands) : Math.min(...cands);
}

/** Shutoff flow: Q where H = 0 */
function shutoffFlow(c: [number,number,number]): number {
  return invertQ(c, 0) ?? 0;
}

/** R² goodness of fit */
function rSquared(pts: {Q:number;H:number}[], c: [number,number,number]): number {
  if (pts.length < 2) return 1;
  const meanH = pts.reduce((s,p)=>s+p.H,0)/pts.length;
  const ss_tot = pts.reduce((s,p)=>s+(p.H-meanH)**2,0);
  const ss_res = pts.reduce((s,p)=>s+(p.H-evalH(c,p.Q))**2,0);
  return ss_tot > 0 ? 1-ss_res/ss_tot : 1;
}

/** Detect rising characteristic (hump): H increases from shutoff before descending */
function hasHump(c: [number,number,number]): boolean {
  const [,b,cc] = c;
  if (Math.abs(cc) < 1e-12) return false;
  const Qpeak = -b/(2*cc);          // vertex of parabola
  return cc < 0 && Qpeak > 0 && b > 0; // parabola opens down, peak at positive Q, curve rises from Q=0
}

// ─── Curve builders ───────────────────────────────────────────────────────────

function buildSingleCurve(c: [number,number,number], Qend: number, n=300): {Q:number;H:number}[] {
  const pts: {Q:number;H:number}[] = [];
  for (let i=0; i<=n; i++) { const Q=Qend*i/n, H=evalH(c,Q); if(H>=0) pts.push({Q,H}); }
  return pts;
}

/** Parallel: Q_combined(H) = Q1(H) + Q2(H).
 *  Pump contributes 0 flow when H > its shutoff head.
 */
function buildParallelCurve(c1:[number,number,number], c2:[number,number,number], n=400): {Q:number;H:number}[] {
  const Hmax = Math.max(evalH(c1,0), evalH(c2,0));
  const pts: {Q:number;H:number}[] = [];
  for (let i=0; i<=n; i++) {
    const H = Hmax*(n-i)/n;
    const Q1 = invertQ(c1,H) ?? 0;
    const Q2 = invertQ(c2,H) ?? 0;
    if (Q1+Q2 > 0) pts.push({Q:Q1+Q2, H});
  }
  return pts;
}

/** Series: H_combined(Q) = H1(Q) + H2(Q).
 *  Only valid up to the minimum shutoff flow of either pump.
 */
function buildSeriesCurve(c1:[number,number,number], c2:[number,number,number], n=400): {Q:number;H:number}[] {
  // Maximum Q where BOTH pumps still have positive head
  const Qmax = Math.min(shutoffFlow(c1), shutoffFlow(c2));
  if (Qmax <= 0) return [];
  const pts: {Q:number;H:number}[] = [];
  for (let i=0; i<=n; i++) {
    const Q = Qmax*i/n;
    const H1 = evalH(c1,Q), H2 = evalH(c2,Q);
    if (H1 > 0 && H2 > 0) pts.push({Q, H:H1+H2});
  }
  return pts;
}

function buildSystemCurve(Hs:number, R:number, Qmax:number, n=300) {
  return Array.from({length:n+1},(_,i)=>{ const Q=Qmax*i/n; return {Q, H:Hs+R*Q*Q}; });
}

/** Find operating point by piecewise-linear intersection */
function findOpPoint(curve:{Q:number;H:number}[], Hs:number, R:number): {Q:number;H:number}|null {
  const diffs = curve.map(p=>({Q:p.Q, d:p.H-(Hs+R*p.Q*p.Q)}));
  for (let i=0; i<diffs.length-1; i++) {
    if (diffs[i].d * diffs[i+1].d <= 0) {
      const t = diffs[i].d / (diffs[i].d - diffs[i+1].d);
      const Q = diffs[i].Q + t*(diffs[i+1].Q-diffs[i].Q);
      return {Q, H:Hs+R*Q*Q};
    }
  }
  return null;
}

// ─── Units ───────────────────────────────────────────────────────────────────
const FLOW_UNITS = { "m³/h": 1, "L/s": 3.6, "GPM": 0.2271 } as const;
type FlowUnit = keyof typeof FLOW_UNITS;

// ─── SVG chart ────────────────────────────────────────────────────────────────
interface ChartCurve { pts:{Q:number;H:number}[]; color:string; dash?:boolean; thick?:boolean }
interface ChartPoint { Q:number; H:number; color:string; label:string }
interface ChartRaw   { pts:{Q:number;H:number}[]; color:string }

function PumpChart({ curves, opPts, rawPts }: { curves:ChartCurve[]; opPts:ChartPoint[]; rawPts:ChartRaw[] }) {
  const W=700, H_SVG=360, ML=56, MR=20, MT=16, MB=48;
  const PW=W-ML-MR, PH=H_SVG-MT-MB;

  const allQ = curves.flatMap(c=>c.pts.map(p=>p.Q)).concat(opPts.map(p=>p.Q)).concat(rawPts.flatMap(r=>r.pts.map(p=>p.Q)));
  const allH = curves.flatMap(c=>c.pts.map(p=>p.H)).concat(opPts.map(p=>p.H)).concat(rawPts.flatMap(r=>r.pts.map(p=>p.H)));
  if (!allQ.length) return null;

  const Qmax = Math.max(...allQ)*1.08, Hmax = Math.max(...allH)*1.12;
  const sx = (q:number)=> ML+(q/Qmax)*PW;
  const sy = (h:number)=> H_SVG-MB-(h/Hmax)*PH;
  const qTicks = Array.from({length:6},(_,i)=>+(Qmax*i/5).toPrecision(3));
  const hTicks = Array.from({length:6},(_,i)=>+(Hmax*i/5).toPrecision(3));

  return (
    <svg viewBox={`0 0 ${W} ${H_SVG}`} className="w-full" style={{maxHeight:380}}>
      {/* Grid */}
      {qTicks.map(q=><line key={q} x1={sx(q)} y1={MT} x2={sx(q)} y2={H_SVG-MB} stroke="#e5e7eb" strokeWidth={1}/>)}
      {hTicks.map(h=><line key={h} x1={ML} y1={sy(h)} x2={W-MR} y2={sy(h)} stroke="#e5e7eb" strokeWidth={1}/>)}
      {/* Axes */}
      <line x1={ML} y1={MT} x2={ML} y2={H_SVG-MB} stroke="#9ca3af" strokeWidth={1.5}/>
      <line x1={ML} y1={H_SVG-MB} x2={W-MR} y2={H_SVG-MB} stroke="#9ca3af" strokeWidth={1.5}/>
      {/* Tick labels */}
      {qTicks.map(q=><text key={q} x={sx(q)} y={H_SVG-MB+16} textAnchor="middle" fontSize={10} fill="#6b7280">{q}</text>)}
      {hTicks.map(h=><text key={h} x={ML-6} y={sy(h)+4} textAnchor="end" fontSize={10} fill="#6b7280">{h}</text>)}
      <text x={ML+PW/2} y={H_SVG-4} textAnchor="middle" fontSize={11} fill="#6b7280">Flow Q</text>
      <text x={12} y={MT+PH/2} textAnchor="middle" fontSize={11} fill="#6b7280" transform={`rotate(-90 12 ${MT+PH/2})`}>Head H (m)</text>
      {/* Curves */}
      {curves.map((cv,ci)=>{
        if(!cv.pts.length) return null;
        const d=cv.pts.map((p,i)=>`${i===0?"M":"L"}${sx(p.Q).toFixed(1)},${sy(p.H).toFixed(1)}`).join(" ");
        return <path key={ci} d={d} fill="none" stroke={cv.color} strokeWidth={cv.thick?2.8:1.5} strokeDasharray={cv.dash?"7 4":undefined} opacity={0.9}/>;
      })}
      {/* Raw data points */}
      {rawPts.map((rp,ri)=>rp.pts.map((p,pi)=>(
        <circle key={`${ri}-${pi}`} cx={sx(p.Q)} cy={sy(p.H)} r={4} fill={rp.color} stroke="white" strokeWidth={1.2} opacity={0.9}/>
      )))}
      {/* Operating points */}
      {opPts.map((pt,i)=>(
        <g key={i}>
          <circle cx={sx(pt.Q)} cy={sy(pt.H)} r={7} fill={pt.color} stroke="white" strokeWidth={2}/>
          <text x={sx(pt.Q)+11} y={sy(pt.H)-7} fontSize={10} fill={pt.color} fontWeight="bold">{pt.label}</text>
          <text x={sx(pt.Q)+11} y={sy(pt.H)+5} fontSize={9} fill={pt.color} opacity={0.8}>
            {pt.Q.toFixed(1)} · {pt.H.toFixed(1)}m
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_P1 = [
  {Q:"0",H:"42"},{Q:"20",H:"40"},{Q:"40",H:"37"},
  {Q:"60",H:"32"},{Q:"80",H:"24"},{Q:"100",H:"12"},
];
const G = 9.81, RHO = 1000;

function fmt(n:number,dp=2):string { return isFinite(n)?n.toFixed(dp):"—"; }
const INP  = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500";
const INPSM= "px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PumpParallelSeriesPage() {
  // Pump data
  const [p1name, setP1name]   = useState("Pump A");
  const [p1pts,  setP1pts]    = useState(DEFAULT_P1);
  const [p1eta,  setP1eta]    = useState("75");   // % efficiency

  const [sameP2, setSameP2]   = useState(true);
  const [p2name, setP2name]   = useState("Pump B");
  const [p2pts,  setP2pts]    = useState(DEFAULT_P1.map(p=>({...p})));
  const [p2eta,  setP2eta]    = useState("75");

  // Units
  const [flowUnit, setFlowUnit] = useState<FlowUnit>("m³/h");

  // System curve
  const [sysMode, setSysMode] = useState<"direct"|"twopoint">("direct");
  const [Hstatic, setHstatic] = useState("10");
  const [Rcoef,   setRcoef]   = useState("0.003");
  const [Q1sys,   setQ1sys]   = useState("0");
  const [H1sys,   setH1sys]   = useState("10");
  const [Q2sys,   setQ2sys]   = useState("80");
  const [H2sys,   setH2sys]   = useState("30");

  // Display
  const [showMode, setShowMode] = useState<"both"|"parallel"|"series">("both");
  const [copied,   setCopied]   = useState(false);

  // Unit factor: display→m³/h
  const uf = FLOW_UNITS[flowUnit];   // multiply displayed flow by this to get m³/h
  const toDisplay = (q_m3h: number) => q_m3h / uf;

  // Parsed pump 1 points (in m³/h internally)
  const pts1 = useMemo(()=>
    p1pts.map(r=>({Q:parseFloat(r.Q)*uf, H:parseFloat(r.H)})).filter(p=>isFinite(p.Q)&&isFinite(p.H)),
  [p1pts, uf]);
  const pts2 = useMemo(()=>
    sameP2 ? pts1 : p2pts.map(r=>({Q:parseFloat(r.Q)*uf, H:parseFloat(r.H)})).filter(p=>isFinite(p.Q)&&isFinite(p.H)),
  [sameP2, p2pts, pts1, uf]);

  const coef1 = useMemo(()=> pts1.length>=2 ? quadFit(pts1) : null, [pts1]);
  const coef2 = useMemo(()=> sameP2 ? coef1 : (pts2.length>=2 ? quadFit(pts2) : null), [sameP2, pts2, coef1]);

  const r2_1 = useMemo(()=> coef1 ? rSquared(pts1, coef1) : null, [pts1, coef1]);
  const r2_2 = useMemo(()=> coef2 && !sameP2 ? rSquared(pts2, coef2) : null, [pts2, coef2, sameP2]);

  const hump1 = useMemo(()=> coef1 ? hasHump(coef1) : false, [coef1]);
  const hump2 = useMemo(()=> coef2 && !sameP2 ? hasHump(coef2) : false, [coef2, sameP2]);

  const sysCurve = useMemo(()=>{
    if (sysMode==="direct") {
      const Hs=parseFloat(Hstatic), R=parseFloat(Rcoef);
      return isFinite(Hs)&&isFinite(R)&&R>=0 ? {Hs,R} : null;
    }
    const q1=parseFloat(Q1sys)*uf, h1=parseFloat(H1sys);
    const q2=parseFloat(Q2sys)*uf, h2=parseFloat(H2sys);
    if (!isFinite(q1)||!isFinite(h1)||!isFinite(q2)||!isFinite(h2)) return null;
    const dq2 = q2*q2-q1*q1;
    if (Math.abs(dq2)<1e-9) return null;
    const R=(h2-h1)/dq2;
    return R>=0 ? {Hs:h1-R*q1*q1, R} : null;
  },[sysMode,Hstatic,Rcoef,Q1sys,H1sys,Q2sys,H2sys,uf]);

  // Qmax for chart (in m³/h)
  const Qmax_m3h = useMemo(()=>{
    if (!coef1) return 150;
    return Math.max(shutoffFlow(coef1)*2.2, 50);
  },[coef1]);

  const result = useMemo(()=>{
    if (!coef1||!coef2) return null;

    const curve1 = buildSingleCurve(coef1, Qmax_m3h);
    const curve2 = sameP2 ? curve1 : buildSingleCurve(coef2, Qmax_m3h);
    const parCurve = buildParallelCurve(coef1, coef2);
    const serCurve = buildSeriesCurve(coef1, coef2);

    let opSingle:  {Q:number;H:number}|null = null;
    let opParallel:{Q:number;H:number}|null = null;
    let opSeries:  {Q:number;H:number}|null = null;

    if (sysCurve) {
      opSingle   = findOpPoint(curve1,    sysCurve.Hs, sysCurve.R);
      opParallel = findOpPoint(parCurve,  sysCurve.Hs, sysCurve.R);
      opSeries   = findOpPoint(serCurve,  sysCurve.Hs, sysCurve.R);
    }

    // Individual duties at parallel OP
    const p1DutyPar = opParallel ? {Q: invertQ(coef1,opParallel.H)??0, H:opParallel.H} : null;
    const p2DutyPar = opParallel ? {Q: invertQ(coef2,opParallel.H)??0, H:opParallel.H} : null;
    // Individual duties at series OP
    const p1DutySer = opSeries ? {Q:opSeries.Q, H:evalH(coef1,opSeries.Q)} : null;
    const p2DutySer = opSeries ? {Q:opSeries.Q, H:evalH(coef2,opSeries.Q)} : null;

    // Shaft power: P_kW = ρ·g·Q[m³/s]·H / η
    const power = (Q_m3h:number, H:number, eta_pct:number) =>
      (RHO*G*(Q_m3h/3600)*H) / (eta_pct/100) / 1000; // kW

    const e1=parseFloat(p1eta)||75, e2=parseFloat(p2eta)||75;
    const pwrSingle   = opSingle   ? power(opSingle.Q,   opSingle.H,   e1) : null;
    const pwrPar1     = p1DutyPar  ? power(p1DutyPar.Q,  opParallel!.H, e1) : null;
    const pwrPar2     = p2DutyPar  ? power(p2DutyPar.Q,  opParallel!.H, e2) : null;
    const pwrSer1     = p1DutySer  ? power(p1DutySer.Q,  p1DutySer.H,  e1) : null;
    const pwrSer2     = p2DutySer  ? power(p2DutySer.Q,  p2DutySer.H,  e2) : null;

    // Warnings
    const warnings: string[] = [];
    if (hump1) warnings.push(`${p1name} has a rising H-Q characteristic (hump). This can cause instability and hunting in parallel operation.`);
    if (hump2) warnings.push(`${p2name} has a rising H-Q characteristic (hump). This can cause instability and hunting in parallel operation.`);
    if (!opSingle  && sysCurve) warnings.push("Single pump has no stable operating point on this system curve.");
    if (!opParallel && sysCurve) warnings.push("Combined parallel curve does not intersect the system curve.");
    if (!opSeries  && sysCurve) warnings.push("Combined series curve does not intersect the system curve — check if series operation reaches the required head.");
    if (p1DutyPar && p1DutyPar.Q < 0.1 && opParallel) warnings.push(`${p1name} is contributing near-zero flow in parallel — its shutoff head (${fmt(evalH(coef1,0),1)} m) may be below the operating head. It could be cut out.`);
    if (p2DutyPar && p2DutyPar.Q < 0.1 && opParallel) warnings.push(`${p2name} is contributing near-zero flow in parallel — it may be cut out.`);
    if (opParallel && opSingle && opParallel.Q < opSingle.Q*1.08) warnings.push("Minimal flow gain in parallel — the system curve is very steep. Most flow increase occurs only on flat (low-friction) system curves.");

    return {
      curve1, curve2, parCurve, serCurve,
      opSingle, opParallel, opSeries,
      p1DutyPar, p2DutyPar, p1DutySer, p2DutySer,
      pwrSingle, pwrPar1, pwrPar2, pwrSer1, pwrSer2,
      warnings,
    };
  },[coef1, coef2, sameP2, Qmax_m3h, sysCurve, p1name, p2name, p1eta, p2eta, hump1, hump2]);

  // Chart data
  const chartCurves = useMemo(():ChartCurve[]=>{
    if (!result) return [];
    const sys = sysCurve ? buildSystemCurve(sysCurve.Hs, sysCurve.R, Qmax_m3h*2) : [];
    return [
      {pts:result.curve1, color:"#6b7280",  dash:false, thick:false},
      ...(!sameP2 ? [{pts:result.curve2, color:"#9333ea", dash:true, thick:false}] : []),
      ...(showMode!=="series"   ? [{pts:result.parCurve, color:"#2563eb", thick:true}] : []),
      ...(showMode!=="parallel" ? [{pts:result.serCurve, color:"#7c3aed", thick:true}] : []),
      ...(sys.length            ? [{pts:sys, color:"#dc2626", dash:true}] : []),
    ];
  },[result, sysCurve, Qmax_m3h, showMode, sameP2]);

  const chartRaw = useMemo(():ChartRaw[]=>{
    if (!coef1) return [];
    return [
      {pts:pts1, color:"#374151"},
      ...(!sameP2 && coef2 ? [{pts:pts2, color:"#7e22ce"}] : []),
    ];
  },[pts1, pts2, coef1, coef2, sameP2]);

  const chartOps = useMemo(():ChartPoint[]=>{
    if (!result) return [];
    return [
      ...(result.opSingle   ? [{...result.opSingle,   color:"#6b7280", label:"Single"}] : []),
      ...(result.opParallel && showMode!=="series"   ? [{...result.opParallel, color:"#2563eb", label:"Parallel"}] : []),
      ...(result.opSeries   && showMode!=="parallel" ? [{...result.opSeries,   color:"#7c3aed", label:"Series"}]   : []),
    ];
  },[result,showMode]);

  // CSV export
  function downloadCSV() {
    if (!result) return;
    type Cell=string|number;
    const rows:Cell[][]=[];
    const p=(...c:Cell[])=>rows.push(c);
    p("Fluids Pad — Pump Parallel & Series Operation");
    p("Date", new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}));
    p("Flow units", flowUnit);
    p();
    if (result.opSingle) {
      p("SINGLE PUMP OPERATING POINT");
      p("Flow Q", fmt(toDisplay(result.opSingle.Q),2), flowUnit);
      p("Head H", fmt(result.opSingle.H,2), "m");
      if (result.pwrSingle!==null) p("Shaft power", fmt(result.pwrSingle,2), "kW");
    }
    if (result.opParallel) {
      p();p("PARALLEL OPERATING POINT");
      p("System flow Q", fmt(toDisplay(result.opParallel.Q),2), flowUnit);
      p("System head H", fmt(result.opParallel.H,2), "m");
      if (result.p1DutyPar) p(`${p1name} flow`, fmt(toDisplay(result.p1DutyPar.Q),2), flowUnit);
      if (result.p2DutyPar) p(`${p2name} flow`, fmt(toDisplay(result.p2DutyPar.Q),2), flowUnit);
      if (result.pwrPar1!==null) p(`${p1name} power`, fmt(result.pwrPar1,2), "kW");
      if (result.pwrPar2!==null) p(`${p2name} power`, fmt(result.pwrPar2,2), "kW");
    }
    if (result.opSeries) {
      p();p("SERIES OPERATING POINT");
      p("System flow Q", fmt(toDisplay(result.opSeries.Q),2), flowUnit);
      p("System head H", fmt(result.opSeries.H,2), "m");
      if (result.p1DutySer) p(`${p1name} head`, fmt(result.p1DutySer.H,2), "m");
      if (result.p2DutySer) p(`${p2name} head`, fmt(result.p2DutySer.H,2), "m");
      if (result.pwrSer1!==null) p(`${p1name} power`, fmt(result.pwrSer1,2), "kW");
      if (result.pwrSer2!==null) p(`${p2name} power`, fmt(result.pwrSer2,2), "kW");
    }
    p();p(`${p1name} H-Q DATA`);p(`Q (${flowUnit})`,"H (m)","H fit (m)");
    pts1.forEach(pt=>{ const Hfit=coef1?fmt(evalH(coef1,pt.Q),2):"—"; p(fmt(toDisplay(pt.Q),2),fmt(pt.H,2),Hfit); });
    if (!sameP2 && pts2.length) {
      p();p(`${p2name} H-Q DATA`);p(`Q (${flowUnit})`,"H (m)","H fit (m)");
      pts2.forEach(pt=>{ const Hfit=coef2?fmt(evalH(coef2,pt.Q),2):"—"; p(fmt(toDisplay(pt.Q),2),fmt(pt.H,2),Hfit); });
    }
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const blob=new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download="pump-parallel-series.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function copyResults() {
    if (!result) return;
    const lines=[`Pump Parallel & Series Analysis — ${new Date().toLocaleDateString("en-GB")}`];
    if (result.opSingle) lines.push(`Single: Q = ${fmt(toDisplay(result.opSingle.Q),1)} ${flowUnit}, H = ${fmt(result.opSingle.H,1)} m${result.pwrSingle!==null?`, P = ${fmt(result.pwrSingle,1)} kW`:""}`);
    if (result.opParallel) lines.push(`Parallel: Q = ${fmt(toDisplay(result.opParallel.Q),1)} ${flowUnit}, H = ${fmt(result.opParallel.H,1)} m`);
    if (result.opSeries)   lines.push(`Series: Q = ${fmt(toDisplay(result.opSeries.Q),1)} ${flowUnit}, H = ${fmt(result.opSeries.H,1)} m`);
    navigator.clipboard.writeText(lines.join("\n")).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);});
  }

  // Row helpers
  const updateRow=(setter:React.Dispatch<React.SetStateAction<{Q:string;H:string}[]>>,i:number,f:"Q"|"H",v:string)=>
    setter(prev=>prev.map((r,idx)=>idx===i?{...r,[f]:v}:r));
  const addRow=(setter:React.Dispatch<React.SetStateAction<{Q:string;H:string}[]>>)=>
    setter(prev=>[...prev,{Q:"",H:""}]);
  const delRow=(setter:React.Dispatch<React.SetStateAction<{Q:string;H:string}[]>>,i:number)=>
    setter(prev=>prev.filter((_,idx)=>idx!==i));

  function CurveTable({pts,setter,r2,hump}:{pts:{Q:string;H:string}[];setter:React.Dispatch<React.SetStateAction<{Q:string;H:string}[]>>;r2:number|null;hump:boolean}) {
    return (
      <div>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5 mb-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Q ({flowUnit})</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">H (m)</p>
          <span className="w-6"/>
        </div>
        {pts.map((row,i)=>(
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-1.5 items-center mb-1">
            <input type="number" value={row.Q} onChange={e=>updateRow(setter,i,"Q",e.target.value)} placeholder="0" className={INPSM}/>
            <input type="number" value={row.H} onChange={e=>updateRow(setter,i,"H",e.target.value)} placeholder="0" className={INPSM}/>
            <button onClick={()=>delRow(setter,i)} disabled={pts.length<=2}
              className="w-6 h-6 rounded text-gray-400 hover:text-red-500 disabled:opacity-30 text-lg font-bold flex items-center justify-center">×</button>
          </div>
        ))}
        <button onClick={()=>addRow(setter)} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-1">+ Add point</button>
        {r2!==null && (
          <p className={`text-[10px] mt-1.5 ${r2>0.999?"text-green-500":r2>0.97?"text-amber-500":"text-red-500"}`}>
            Fit R² = {r2.toFixed(4)} {r2<0.97?"— add more points for a better fit":"✓"}
          </p>
        )}
        {hump && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">⚠ Rising characteristic detected — may be unstable in parallel</p>
        )}
      </div>
    );
  }

  const LEGEND=[
    {color:"#374151",label:"Data points (raw)",dot:true},
    {color:"#6b7280",label:`${p1name} (fit)`,dash:false},
    ...(!sameP2?[{color:"#9333ea",label:`${p2name} (fit)`,dash:true}]:[]),
    ...(showMode!=="series"  ?[{color:"#2563eb",label:"Combined — parallel",dash:false}]:[]),
    ...(showMode!=="parallel"?[{color:"#7c3aed",label:"Combined — series",  dash:false}]:[]),
    {color:"#dc2626",label:"System curve",dash:true},
  ] as {color:string;label:string;dash?:boolean;dot?:boolean}[];

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pump Parallel &amp; Series Operation</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Combined H-Q curves, operating points, individual duties, shaft power, and stability check.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={copyResults} disabled={!result}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {copied
              ?<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Copied!</>
              :<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</>}
          </button>
          <button onClick={downloadCSV} disabled={!result}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            CSV
          </button>
          {/* Flow unit */}
          <select value={flowUnit} onChange={e=>setFlowUnit(e.target.value as FlowUnit)}
            className="px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {Object.keys(FLOW_UNITS).map(u=><option key={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-5 items-start">

        {/* ══ SIDEBAR ══════════════════════════════════════════════════════ */}
        <aside className="w-72 flex-shrink-0 space-y-4 sticky top-20 max-h-[calc(100vh-7rem)] overflow-y-auto pb-4">

          {/* Pump 1 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-gray-500 flex-shrink-0"/>
              <input type="text" value={p1name} onChange={e=>setP1name(e.target.value)}
                className="flex-1 text-sm font-bold bg-transparent border-none outline-none text-gray-700 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600"
                placeholder="Pump A" />
            </div>
            <CurveTable pts={p1pts} setter={setP1pts} r2={r2_1} hump={hump1}/>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pump efficiency η (%)</p>
              <input type="number" value={p1eta} onChange={e=>setP1eta(e.target.value)} min="1" max="100" className={INP}/>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">For shaft power calculation</p>
            </div>
          </div>

          {/* Pump 2 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={sameP2} onChange={e=>setSameP2(e.target.checked)} className="w-4 h-4 rounded accent-blue-500"/>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Identical to {p1name}</span>
            </label>
            {!sameP2 && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-purple-500 flex-shrink-0"/>
                  <input type="text" value={p2name} onChange={e=>setP2name(e.target.value)}
                    className="flex-1 text-sm font-bold bg-transparent border-none outline-none text-gray-700 dark:text-gray-200 placeholder-gray-300"
                    placeholder="Pump B"/>
                </div>
                <CurveTable pts={p2pts} setter={setP2pts} r2={r2_2} hump={hump2}/>
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">η (%)</p>
                  <input type="number" value={p2eta} onChange={e=>setP2eta(e.target.value)} min="1" max="100" className={INP}/>
                </div>
              </>
            )}
          </div>

          {/* System curve */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">System Curve</p>
            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 mb-3 text-xs">
              <button onClick={()=>setSysMode("direct")}
                className={`flex-1 py-1.5 font-semibold ${sysMode==="direct"?"bg-blue-500 text-white":"bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                H<sub>s</sub> + R
              </button>
              <button onClick={()=>setSysMode("twopoint")}
                className={`flex-1 py-1.5 font-semibold ${sysMode==="twopoint"?"bg-blue-500 text-white":"bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                Two-point
              </button>
            </div>
            {sysMode==="direct"?(
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Static head H<sub>s</sub> (m)</p>
                  <input type="number" value={Hstatic} onChange={e=>setHstatic(e.target.value)} className={INP}/>
                  <p className="text-[10px] text-gray-400 mt-0.5">Elevation + delivery pressure head</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Resistance R (m per ({flowUnit})²)</p>
                  <input type="number" value={Rcoef} onChange={e=>setRcoef(e.target.value)} step="any" className={INP}/>
                  <p className="text-[10px] text-gray-400 mt-0.5">H<sub>sys</sub> = H<sub>s</sub> + R·Q² — from pipe network</p>
                </div>
              </div>
            ):(
              <div className="space-y-2">
                <p className="text-[10px] text-gray-400">Two known system operating points</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-xs text-gray-400 mb-0.5">Q₁ ({flowUnit})</p><input type="number" value={Q1sys} onChange={e=>setQ1sys(e.target.value)} className={INP}/></div>
                  <div><p className="text-xs text-gray-400 mb-0.5">H₁ (m)</p><input type="number" value={H1sys} onChange={e=>setH1sys(e.target.value)} className={INP}/></div>
                  <div><p className="text-xs text-gray-400 mb-0.5">Q₂ ({flowUnit})</p><input type="number" value={Q2sys} onChange={e=>setQ2sys(e.target.value)} className={INP}/></div>
                  <div><p className="text-xs text-gray-400 mb-0.5">H₂ (m)</p><input type="number" value={H2sys} onChange={e=>setH2sys(e.target.value)} className={INP}/></div>
                </div>
                {sysCurve&&<p className="text-[10px] text-blue-500">H<sub>s</sub> = {fmt(sysCurve.Hs,2)} m · R = {sysCurve.R.toExponential(3)}</p>}
              </div>
            )}
          </div>

          {/* Display mode */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Show curves</p>
            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 text-xs">
              {(["both","parallel","series"] as const).map(m=>(
                <button key={m} onClick={()=>setShowMode(m)}
                  className={`flex-1 py-1.5 font-semibold capitalize ${showMode===m?"bg-blue-500 text-white":"bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

        </aside>

        {/* ══ RESULTS ══════════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Warnings */}
          {result?.warnings.map((w,i)=>(
            <div key={i} className="flex items-start gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300">
              <span className="text-base flex-shrink-0">⚠</span><span>{w}</span>
            </div>
          ))}

          {/* Operating point chips */}
          {result?.opSingle !== undefined && sysCurve && (
            <div className="grid grid-cols-3 gap-3">
              {/* Single */}
              <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400"/>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Single pump</p>
                </div>
                {result.opSingle?(
                  <>
                    <p className="text-xl font-black text-gray-900 dark:text-white">{fmt(toDisplay(result.opSingle.Q),1)} <span className="text-sm font-semibold">{flowUnit}</span></p>
                    <p className="text-xs text-gray-500 mt-0.5">{fmt(result.opSingle.H,1)} m head</p>
                    {result.pwrSingle!==null&&<p className="text-xs text-gray-400 mt-0.5">{fmt(result.pwrSingle,1)} kW</p>}
                  </>
                ):<p className="text-sm text-gray-400 italic">No intersection</p>}
              </div>

              {/* Parallel */}
              {showMode!=="series"&&(
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"/>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Parallel</p>
                  </div>
                  {result.opParallel?(
                    <>
                      <p className="text-xl font-black text-blue-700 dark:text-blue-300">{fmt(toDisplay(result.opParallel.Q),1)} <span className="text-sm font-semibold">{flowUnit}</span></p>
                      <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">{fmt(result.opParallel.H,1)} m head</p>
                      {result.opSingle&&<p className="text-xs text-blue-500 dark:text-blue-400 mt-1 font-bold">+{fmt((result.opParallel.Q/result.opSingle.Q-1)*100,0)}% flow vs single</p>}
                    </>
                  ):<p className="text-sm text-gray-400 italic">No intersection</p>}
                </div>
              )}

              {/* Series */}
              {showMode!=="parallel"&&(
                <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800 p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-3 h-3 rounded-full bg-violet-500"/>
                    <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Series</p>
                  </div>
                  {result.opSeries?(
                    <>
                      <p className="text-xl font-black text-violet-700 dark:text-violet-300">{fmt(result.opSeries.H,1)} <span className="text-sm font-semibold">m</span></p>
                      <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-0.5">{fmt(toDisplay(result.opSeries.Q),1)} {flowUnit} flow</p>
                      {result.opSingle&&<p className="text-xs text-violet-500 dark:text-violet-400 mt-1 font-bold">+{fmt((result.opSeries.H/result.opSingle.H-1)*100,0)}% head vs single</p>}
                    </>
                  ):<p className="text-sm text-gray-400 italic">No intersection</p>}
                </div>
              )}
            </div>
          )}

          {/* Chart */}
          {coef1&&(
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">H-Q Curves</h3>
                <div className="flex flex-wrap gap-3">
                  {LEGEND.map(l=>(
                    <div key={l.label} className="flex items-center gap-1.5">
                      {l.dot?(
                        <svg width="14" height="10"><circle cx="7" cy="5" r="4" fill={l.color}/></svg>
                      ):(
                        <svg width="24" height="10">
                          <line x1="0" y1="5" x2="24" y2="5" stroke={l.color} strokeWidth={l.label.includes("Combined")?"2.5":"1.5"} strokeDasharray={l.dash?"6 3":undefined}/>
                        </svg>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <PumpChart curves={chartCurves} opPts={chartOps} rawPts={chartRaw}/>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                Filled circles = raw data points entered. Smooth curves = quadratic least-squares fit H = a + b·Q + c·Q².
                Series curve truncated at the shutoff flow of the pump with the lower Q<sub>shutoff</sub>.
              </p>
            </div>
          )}

          {/* Individual duty table */}
          {result&&sysCurve&&(result.opParallel||result.opSeries)&&(
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Individual Pump Duty</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b-2 border-gray-200 dark:border-gray-700">
                      <th className="text-left pb-2 pr-3">Config.</th>
                      <th className="text-right pb-2 pr-3">System Q ({flowUnit})</th>
                      <th className="text-right pb-2 pr-3">System H (m)</th>
                      <th className="text-right pb-2 pr-3">{p1name} Q ({flowUnit})</th>
                      <th className="text-right pb-2 pr-3">{sameP2?p1name:p2name} Q ({flowUnit})</th>
                      <th className="text-right pb-2 pr-3">Total P (kW)</th>
                      <th className="text-right pb-2">vs Single</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.opSingle&&(
                      <tr className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-2.5 pr-3 font-semibold text-gray-500">Single</td>
                        <td className="py-2.5 pr-3 text-right font-mono">{fmt(toDisplay(result.opSingle.Q),1)}</td>
                        <td className="py-2.5 pr-3 text-right font-mono">{fmt(result.opSingle.H,1)}</td>
                        <td className="py-2.5 pr-3 text-right font-mono text-gray-400">{fmt(toDisplay(result.opSingle.Q),1)}</td>
                        <td className="py-2.5 pr-3 text-right font-mono text-gray-400">—</td>
                        <td className="py-2.5 pr-3 text-right font-mono text-gray-400">{result.pwrSingle!==null?fmt(result.pwrSingle,1):"—"}</td>
                        <td className="py-2.5 text-right text-gray-400 text-xs">baseline</td>
                      </tr>
                    )}
                    {result.opParallel&&showMode!=="series"&&(
                      <tr className="border-b border-gray-100 dark:border-gray-700/50 bg-blue-50/40 dark:bg-blue-900/10">
                        <td className="py-2.5 pr-3 font-bold text-blue-600 dark:text-blue-400">Parallel</td>
                        <td className="py-2.5 pr-3 text-right font-mono font-bold">{fmt(toDisplay(result.opParallel.Q),1)}</td>
                        <td className="py-2.5 pr-3 text-right font-mono">{fmt(result.opParallel.H,1)}</td>
                        <td className="py-2.5 pr-3 text-right font-mono text-blue-500">{result.p1DutyPar?fmt(toDisplay(result.p1DutyPar.Q),1):"—"}</td>
                        <td className="py-2.5 pr-3 text-right font-mono text-blue-500">{result.p2DutyPar?fmt(toDisplay(result.p2DutyPar.Q),1):"—"}</td>
                        <td className="py-2.5 pr-3 text-right font-mono">
                          {result.pwrPar1!==null&&result.pwrPar2!==null?fmt(result.pwrPar1+result.pwrPar2,1):"—"}
                        </td>
                        <td className="py-2.5 text-right font-bold text-blue-600 dark:text-blue-400 text-xs">
                          {result.opSingle?`+${fmt((result.opParallel.Q/result.opSingle.Q-1)*100,0)}% Q`:"—"}
                        </td>
                      </tr>
                    )}
                    {result.opSeries&&showMode!=="parallel"&&(
                      <tr className="bg-violet-50/40 dark:bg-violet-900/10">
                        <td className="py-2.5 pr-3 font-bold text-violet-600 dark:text-violet-400">Series</td>
                        <td className="py-2.5 pr-3 text-right font-mono font-bold">{fmt(toDisplay(result.opSeries.Q),1)}</td>
                        <td className="py-2.5 pr-3 text-right font-mono font-bold">{fmt(result.opSeries.H,1)}</td>
                        <td className="py-2.5 pr-3 text-right font-mono text-violet-500">{result.p1DutySer?fmt(toDisplay(result.p1DutySer.Q),1):"—"}</td>
                        <td className="py-2.5 pr-3 text-right font-mono text-violet-500">{result.p2DutySer?fmt(toDisplay(result.p2DutySer.Q),1):"—"}</td>
                        <td className="py-2.5 pr-3 text-right font-mono">
                          {result.pwrSer1!==null&&result.pwrSer2!==null?fmt(result.pwrSer1+result.pwrSer2,1):"—"}
                        </td>
                        <td className="py-2.5 text-right font-bold text-violet-600 dark:text-violet-400 text-xs">
                          {result.opSingle?`+${fmt((result.opSeries.H/result.opSingle.H-1)*100,0)}% H`:"—"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3">
                Parallel: both pumps see the same discharge head — they split the total flow.
                Series: both pumps handle the same flow — they each contribute part of the total head.
                Shaft power P = ρgQH/η. Uses entered pump efficiencies.
              </p>
            </div>
          )}

          {/* Guidance */}
          <div className="bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">When to use parallel vs series</h3>
            <div className="grid sm:grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-400">
              <div>
                <p className="font-bold text-blue-600 dark:text-blue-400 mb-1">Parallel — more flow</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Flat system curve (low friction losses)</li>
                  <li>Variable demand — run one or two pumps</li>
                  <li>Standby capacity for reliability</li>
                  <li>Flow gain diminishes on steep system curves</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-violet-600 dark:text-violet-400 mb-1">Series — more head</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>High static head (deep wells, tall buildings)</li>
                  <li>High friction system (steep curve)</li>
                  <li>Booster pump in a long pipeline</li>
                  <li>Multi-stage pump equivalent</li>
                </ul>
              </div>
            </div>
          </div>

          <References refs={REFS_PUMP_PARALLEL_SERIES} />

        </div>
      </div>
    </div>
  );
}
