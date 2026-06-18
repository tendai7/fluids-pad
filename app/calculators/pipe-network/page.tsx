"use client";
import { useState, useMemo, useCallback } from "react";
import { References } from "@/components/References";
import { REFS_PIPE_NETWORK } from "@/lib/references";

const G  = 9.80665;
const NU = 1.004e-6; // water at 20°C

// ---- types ----
interface HNode {
  id: string; label: string;
  elevation: number;
  isReservoir: boolean;
  fixedHead: number;   // piezometric HGL at reservoir (m above datum); HGL = fixedHead + elevation
  extQ_Ls: number;     // L/s:  +supply / −demand  (ignored for reservoirs)
  x: number; y: number; // SVG position
}
interface HPipe {
  id: string; from: string; to: string;
  L: number; D_mm: number; eps_mm: number;
}
interface NodeResult { head: number; pressure_kPa: number; }
interface PipeResult  { Q_Ls: number; vel: number; Re: number; f: number; hL: number; }
interface SolveOut {
  nodes: Record<string, NodeResult>;
  pipes: Record<string, PipeResult>;
  iter: number; converged: boolean; error?: string;
}

// ---- math ----
function swameeJain(Re: number, epsD: number): number {
  if (Re < 2300) return 64 / Math.max(Re, 1);
  return 0.25 / (Math.log10(Math.max(epsD, 1e-8) / 3.7 + 5.74 / Re ** 0.9)) ** 2;
}

function gaussElim(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let best = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[best][c])) best = r;
    [M[c], M[best]] = [M[best], M[c]];
    if (Math.abs(M[c][c]) < 1e-14) return null;
    for (let r = c + 1; r < n; r++) {
      const k = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j];
    }
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n];
    for (let j = i + 1; j < n; j++) x[i] -= M[i][j] * x[j];
    x[i] /= M[i][i];
  }
  return x;
}

// Nodal Newton-Raphson:
// Free-node heads H are unknowns. Residual: F_i = extQ_i + Σ_pipes Q_into_i = 0
// Pipe flow Q_p = sign(ΔH) · √(|ΔH| / r)  where r = f·L / (D·A²·2g)
function solveNetwork(nodes: HNode[], pipes: HPipe[]): SolveOut {
  const free = nodes.filter(n => !n.isReservoir);
  const nF   = free.length;

  if (nF === 0)
    return { nodes: {}, pipes: {}, iter: 0, converged: false, error: "No free nodes — network fully specified." };
  if (!nodes.some(n => n.isReservoir))
    return { nodes: {}, pipes: {}, iter: 0, converged: false, error: "Add at least one reservoir (fixed-head) node." };

  const nodeMap  = new Map(nodes.map(n => [n.id, n]));
  const freeIdx  = new Map(free.map((n, i) => [n.id, i]));

  for (const p of pipes) {
    if (!nodeMap.has(p.from) || !nodeMap.has(p.to))
      return { nodes: {}, pipes: {}, iter: 0, converged: false, error: `Pipe ${p.id} references unknown node.` };
    if (p.from === p.to)
      return { nodes: {}, pipes: {}, iter: 0, converged: false, error: `Pipe ${p.id} has same start and end node.` };
  }

  const getHfixed = (id: string) => { const n = nodeMap.get(id)!; return n.fixedHead + n.elevation; };
  const avgRes    = nodes.filter(n => n.isReservoir).reduce((s, n) => s + getHfixed(n.id), 0)
                  / nodes.filter(n => n.isReservoir).length;

  const H  = new Float64Array(nF).fill(avgRes - 5);
  let fs   = pipes.map(p => swameeJain(1e5, p.eps_mm / p.D_mm));

  let totalIter = 0, converged = false;

  for (let outer = 0; outer < 10 && !converged; outer++) {
    for (let inner = 0; inner < 60; inner++) {
      totalIter++;
      const getH = (id: string) => {
        const n = nodeMap.get(id)!;
        return n.isReservoir ? getHfixed(id) : H[freeIdx.get(id)!];
      };

      const F = Array(nF).fill(0);
      const J: number[][] = Array.from({ length: nF }, () => Array(nF).fill(0));
      free.forEach((n, i) => { F[i] += n.extQ_Ls / 1000; }); // m³/s

      for (let pi = 0; pi < pipes.length; pi++) {
        const p = pipes[pi];
        const D = p.D_mm / 1000;
        const A = Math.PI / 4 * D * D;
        const r = fs[pi] * p.L / (D * A * A * 2 * G);
        const dH   = getH(p.from) - getH(p.to);
        const absH = Math.abs(dH);
        const Q    = absH < 1e-14 ? 0 : Math.sign(dH) * Math.sqrt(absH / r);
        const dQdH = absH < 1e-10 ? 1e-6 : 1 / (2 * Math.sqrt(absH * r));

        const fromRes = nodeMap.get(p.from)!.isReservoir;
        const toRes   = nodeMap.get(p.to)!.isReservoir;
        const ui = fromRes ? -1 : freeIdx.get(p.from)!;
        const vi = toRes   ? -1 : freeIdx.get(p.to)!;

        // F[from] -= Q  (Q leaves from-node)
        // F[to]   += Q  (Q enters to-node)
        if (ui >= 0) { F[ui] -= Q; J[ui][ui] -= dQdH; if (vi >= 0) J[ui][vi] += dQdH; }
        if (vi >= 0) { F[vi] += Q; J[vi][vi] -= dQdH; if (ui >= 0) J[vi][ui] += dQdH; }
      }

      const dHv = gaussElim(J, F.map(f => -f));
      if (!dHv) break;
      for (let i = 0; i < nF; i++) H[i] += dHv[i];
      if (Math.max(...F.map(Math.abs)) < 1e-10) { converged = true; break; }
    }
    if (converged) break;

    // Update friction factors
    const getH2 = (id: string) => {
      const n = nodeMap.get(id)!;
      return n.isReservoir ? getHfixed(id) : H[freeIdx.get(id)!];
    };
    fs = pipes.map((p, pi) => {
      const D = p.D_mm / 1000;
      const A = Math.PI / 4 * D * D;
      const r = fs[pi] * p.L / (D * A * A * 2 * G);
      const dH = getH2(p.from) - getH2(p.to);
      const Q  = Math.abs(dH) < 1e-14 ? 0 : Math.sign(dH) * Math.sqrt(Math.abs(dH) / r);
      const Re = Math.max(Math.abs(Q) / A * D / NU, 10);
      return swameeJain(Re, p.eps_mm / p.D_mm);
    });
  }

  // Build output
  const Hf = (id: string) => {
    const n = nodeMap.get(id)!;
    return n.isReservoir ? getHfixed(id) : H[freeIdx.get(id)!];
  };

  const nodeRes: Record<string, NodeResult> = {};
  nodes.forEach(n => {
    const head = Hf(n.id);
    nodeRes[n.id] = { head, pressure_kPa: (head - n.elevation) * 9.810 };
  });

  const pipeRes: Record<string, PipeResult> = {};
  pipes.forEach((p, pi) => {
    const D = p.D_mm / 1000;
    const A = Math.PI / 4 * D * D;
    const r = fs[pi] * p.L / (D * A * A * 2 * G);
    const dH = Hf(p.from) - Hf(p.to);
    const Q  = Math.abs(dH) < 1e-14 ? 0 : Math.sign(dH) * Math.sqrt(Math.abs(dH) / r);
    const vel = Math.abs(Q) / A;
    const Re  = Math.max(vel * D / NU, 10);
    pipeRes[p.id] = { Q_Ls: Q * 1000, vel, Re, f: swameeJain(Re, p.eps_mm / p.D_mm), hL: Math.abs(dH) };
  });

  return { nodes: nodeRes, pipes: pipeRes, iter: totalIter, converged };
}

// ---- default 2-loop network ----
const DEFAULT_NODES: HNode[] = [
  { id: "R1", label: "Reservoir",  elevation: 0, isReservoir: true,  fixedHead: 50, extQ_Ls:  0, x:  80, y: 175 },
  { id: "B",  label: "Junction B", elevation: 0, isReservoir: false, fixedHead:  0, extQ_Ls:  0, x: 250, y:  75 },
  { id: "C",  label: "Junction C", elevation: 0, isReservoir: false, fixedHead:  0, extQ_Ls:  0, x: 250, y: 275 },
  { id: "D",  label: "Junction D", elevation: 0, isReservoir: false, fixedHead:  0, extQ_Ls:  0, x: 430, y:  75 },
  { id: "E",  label: "Demand E",   elevation: 0, isReservoir: false, fixedHead:  0, extQ_Ls: -8, x: 430, y: 275 },
];
const DEFAULT_PIPES: HPipe[] = [
  { id: "P1", from: "R1", to: "B",  L:  800, D_mm: 200, eps_mm: 0.046 },
  { id: "P2", from: "R1", to: "C",  L: 1000, D_mm: 200, eps_mm: 0.046 },
  { id: "P3", from: "B",  to: "C",  L:  600, D_mm: 100, eps_mm: 0.046 },
  { id: "P4", from: "B",  to: "D",  L:  800, D_mm: 150, eps_mm: 0.046 },
  { id: "P5", from: "C",  to: "E",  L:  800, D_mm: 150, eps_mm: 0.046 },
  { id: "P6", from: "D",  to: "E",  L:  600, D_mm: 100, eps_mm: 0.046 },
];

// ---- component ----
export default function PipeNetworkPage() {
  const [nodes, setNodes]     = useState<HNode[]>(DEFAULT_NODES);
  const [pipes, setPipes]     = useState<HPipe[]>(DEFAULT_PIPES);
  const [results, setResults] = useState<SolveOut | null>(null);
  const [tab, setTab]         = useState<"nodes" | "pipes">("nodes");

  const handleSolve = useCallback(() => setResults(solveNetwork(nodes, pipes)), [nodes, pipes]);

  const updateNode = useCallback((oldId: string, field: keyof HNode, raw: string | number | boolean) => {
    setResults(null);
    if (field === "id" && typeof raw === "string") {
      const newId = raw;
      setNodes(prev => prev.map(n => n.id === oldId ? { ...n, id: newId } : n));
      setPipes(prev => prev.map(p => ({
        ...p, from: p.from === oldId ? newId : p.from, to: p.to === oldId ? newId : p.to,
      })));
    } else {
      setNodes(prev => prev.map(n => n.id === oldId ? { ...n, [field]: raw } : n));
    }
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setPipes(prev => prev.filter(p => p.from !== id && p.to !== id));
    setResults(null);
  }, []);

  const addNode = useCallback(() => {
    const n = nodes.length;
    const col = n % 5, row = Math.floor(n / 5);
    setNodes(prev => [...prev, {
      id: `N${n + 1}`, label: `Node ${n + 1}`,
      elevation: 0, isReservoir: false, fixedHead: 0, extQ_Ls: 0,
      x: 80 + col * 110, y: 80 + row * 130,
    }]);
    setResults(null);
  }, [nodes.length]);

  const updatePipe = useCallback((id: string, field: keyof HPipe, val: string | number) => {
    setPipes(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p));
    setResults(null);
  }, []);

  const deletePipe = useCallback((id: string) => {
    setPipes(prev => prev.filter(p => p.id !== id));
    setResults(null);
  }, []);

  const addPipe = useCallback(() => {
    const n = pipes.length;
    setPipes(prev => [...prev, {
      id: `P${n + 1}`,
      from: nodes[0]?.id ?? "", to: nodes[1]?.id ?? "",
      L: 500, D_mm: 100, eps_mm: 0.046,
    }]);
    setResults(null);
  }, [nodes, pipes.length]);

  // SVG diagram
  const diagram = useMemo(() => {
    const nMap = new Map(nodes.map(n => [n.id, n]));
    return (
      <svg viewBox="0 0 530 350" className="w-full rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700">
        {/* Pipe lines */}
        {pipes.map(p => {
          const u = nMap.get(p.from), v = nMap.get(p.to);
          if (!u || !v) return null;
          const pr = results?.pipes[p.id];
          const stroke = !pr ? "#9CA3AF" : pr.Q_Ls >= 0 ? "#3B82F6" : "#F59E0B";
          const mx = (u.x + v.x) / 2, my = (u.y + v.y) / 2;
          // Arrow direction midpoint
          const dx = v.x - u.x, dy = v.y - u.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const ax = mx + (pr && pr.Q_Ls < 0 ? -1 : 1) * dx / len * 10;
          const ay = my + (pr && pr.Q_Ls < 0 ? -1 : 1) * dy / len * 10;
          return (
            <g key={p.id}>
              <line x1={u.x} y1={u.y} x2={v.x} y2={v.y} stroke={stroke} strokeWidth={pr ? 3 : 2} opacity={0.75} />
              <text x={mx - dy / len * 10} y={my + dx / len * 10} textAnchor="middle" fontSize={9} fill={stroke} className="select-none">
                {p.id}{pr ? ` ${Math.abs(pr.Q_Ls).toFixed(1)} L/s` : ""}
              </text>
              {pr && (
                <polygon
                  points={`${ax},${ay} ${ax - (pr.Q_Ls<0?-1:1)*dy/len*5 - (pr.Q_Ls<0?-1:1)*dx/len*8},${ay + (pr.Q_Ls<0?-1:1)*dx/len*5 - (pr.Q_Ls<0?-1:1)*dy/len*8} ${ax + (pr.Q_Ls<0?-1:1)*dy/len*5 - (pr.Q_Ls<0?-1:1)*dx/len*8},${ay - (pr.Q_Ls<0?-1:1)*dx/len*5 - (pr.Q_Ls<0?-1:1)*dy/len*8}`}
                  fill={stroke} opacity={0.8}
                />
              )}
            </g>
          );
        })}
        {/* Nodes */}
        {nodes.map(n => {
          const nr  = results?.nodes[n.id];
          const col = n.isReservoir ? "#3B82F6" : n.extQ_Ls < 0 ? "#EF4444" : "#10B981";
          return (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={20} fill={col} fillOpacity={0.15} stroke={col} strokeWidth={2} />
              <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={11} fontWeight="700" fill={col} className="select-none">
                {n.id}
              </text>
              {nr && (
                <text x={n.x} y={n.y + 33} textAnchor="middle" fontSize={9} fill="#6B7280" className="select-none">
                  {nr.head.toFixed(1)} m
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  }, [nodes, pipes, results]);

  // Inline input used throughout the tables
  function TI({ value, onChange, type = "text", w = "w-14" }: {
    value: string | number; onChange: (v: string) => void; type?: string; w?: string;
  }) {
    return (
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        className={`${w} text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500`}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Pipe Network Solver</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Nodal Newton-Raphson analysis for looped pipe networks — flow distribution, pressure heads, and friction factors via Darcy-Weisbach / Colebrook-White. Equivalent to Hardy-Cross but handles arbitrary topologies.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── LEFT: editor + diagram ── */}
        <div className="space-y-4">
          {/* Diagram */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Network Diagram</h2>
            {diagram}
            <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 mr-1 align-middle" />Reservoir</span>
              <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1 align-middle" />Junction</span>
              <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 mr-1 align-middle" />Demand</span>
              {results && <><span><span className="inline-block w-6 h-1 bg-blue-500 mr-1 align-middle" />Fwd flow</span><span><span className="inline-block w-6 h-1 bg-amber-400 mr-1 align-middle" />Rev flow</span></>}
            </div>
          </div>

          {/* Node / Pipe editor */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex gap-2 mb-4">
              {(["nodes", "pipes"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${tab === t ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
                  {t === "nodes" ? `Nodes (${nodes.length})` : `Pipes (${pipes.length})`}
                </button>
              ))}
            </div>

            {tab === "nodes" && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                        <th className="text-left pb-1 pr-2">ID</th>
                        <th className="text-left pb-1 pr-2">Label</th>
                        <th className="text-right pb-1 pr-2">Elev (m)</th>
                        <th className="text-left pb-1 pr-2">Type</th>
                        <th className="text-right pb-1">Head/Flow</th>
                        <th className="pb-1" />
                      </tr>
                    </thead>
                    <tbody>
                      {nodes.map(n => (
                        <tr key={n.id} className="border-b border-gray-100 dark:border-gray-800 align-middle">
                          <td className="py-1 pr-2">
                            <TI value={n.id} onChange={v => updateNode(n.id, "id", v)} w="w-10" />
                          </td>
                          <td className="py-1 pr-2">
                            <TI value={n.label} onChange={v => updateNode(n.id, "label", v)} w="w-24" />
                          </td>
                          <td className="py-1 pr-2 text-right">
                            <TI type="number" value={n.elevation}
                              onChange={v => updateNode(n.id, "elevation", parseFloat(v) || 0)} w="w-12" />
                          </td>
                          <td className="py-1 pr-2">
                            <select value={n.isReservoir ? "res" : "free"}
                              onChange={e => updateNode(n.id, "isReservoir", e.target.value === "res")}
                              className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                              <option value="free">Free</option>
                              <option value="res">Reservoir</option>
                            </select>
                          </td>
                          <td className="py-1 text-right">
                            <div className="flex items-center gap-1 justify-end">
                              {n.isReservoir ? (
                                <>
                                  <TI type="number" value={n.fixedHead}
                                    onChange={v => updateNode(n.id, "fixedHead", parseFloat(v) || 0)} w="w-14" />
                                  <span className="text-gray-400">m HGL</span>
                                </>
                              ) : (
                                <>
                                  <TI type="number" value={n.extQ_Ls}
                                    onChange={v => updateNode(n.id, "extQ_Ls", parseFloat(v) || 0)} w="w-14" />
                                  <span className="text-gray-400">L/s</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-1 pl-2">
                            <button onClick={() => deleteNode(n.id)}
                              className="text-red-400 hover:text-red-600 px-1 text-base leading-none">×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={addNode}
                  className="mt-3 px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300 transition-colors">
                  + Add Node
                </button>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Reservoir: HGL = fixedHead + elevation. Free: extQ L/s (negative = demand, 0 = junction).
                </p>
              </>
            )}

            {tab === "pipes" && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                        <th className="text-left pb-1 pr-1">ID</th>
                        <th className="text-left pb-1 pr-1">From</th>
                        <th className="text-left pb-1 pr-1">To</th>
                        <th className="text-right pb-1 pr-1">L (m)</th>
                        <th className="text-right pb-1 pr-1">D (mm)</th>
                        <th className="text-right pb-1">ε (mm)</th>
                        <th className="pb-1" />
                      </tr>
                    </thead>
                    <tbody>
                      {pipes.map(p => (
                        <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800 align-middle">
                          <td className="py-1 pr-1">
                            <TI value={p.id} onChange={v => updatePipe(p.id, "id", v)} w="w-10" />
                          </td>
                          <td className="py-1 pr-1">
                            <select value={p.from} onChange={e => updatePipe(p.id, "from", e.target.value)}
                              className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                              {nodes.map(n => <option key={n.id} value={n.id}>{n.id}</option>)}
                            </select>
                          </td>
                          <td className="py-1 pr-1">
                            <select value={p.to} onChange={e => updatePipe(p.id, "to", e.target.value)}
                              className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                              {nodes.map(n => <option key={n.id} value={n.id}>{n.id}</option>)}
                            </select>
                          </td>
                          <td className="py-1 pr-1 text-right">
                            <TI type="number" value={p.L}
                              onChange={v => updatePipe(p.id, "L", parseFloat(v) || 0)} w="w-16" />
                          </td>
                          <td className="py-1 pr-1 text-right">
                            <TI type="number" value={p.D_mm}
                              onChange={v => updatePipe(p.id, "D_mm", parseFloat(v) || 0)} w="w-14" />
                          </td>
                          <td className="py-1 text-right">
                            <TI type="number" value={p.eps_mm}
                              onChange={v => updatePipe(p.id, "eps_mm", parseFloat(v) || 0)} w="w-14" />
                          </td>
                          <td className="py-1 pl-2">
                            <button onClick={() => deletePipe(p.id)}
                              className="text-red-400 hover:text-red-600 px-1 text-base leading-none">×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={addPipe}
                  className="mt-3 px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300 transition-colors">
                  + Add Pipe
                </button>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  ε = absolute roughness (carbon steel ≈ 0.046 mm · PVC ≈ 0.002 mm · cast iron ≈ 0.26 mm).
                </p>
              </>
            )}
          </div>

          {/* Solve */}
          <button onClick={handleSolve}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl transition-colors shadow-sm text-sm">
            Solve Network
          </button>
        </div>

        {/* ── RIGHT: results ── */}
        <div className="space-y-4">
          {!results && (
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-10 text-center text-gray-500 dark:text-gray-400">
              <div className="text-5xl mb-4 opacity-40">⬡</div>
              <p className="font-medium text-gray-700 dark:text-gray-300">Define the network and click <strong>Solve Network</strong></p>
              <p className="text-sm mt-1">Default: 2-loop, 5-node, 6-pipe example with 8 L/s demand at node E.</p>
            </div>
          )}

          {results?.error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 text-sm text-red-800 dark:text-red-300">
              <strong>Error:</strong> {results.error}
            </div>
          )}

          {results && !results.error && (
            <>
              <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${results.converged ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300" : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300"}`}>
                {results.converged
                  ? `✓ Converged in ${results.iter} iterations`
                  : `⚠ Did not fully converge (${results.iter} iterations) — results may be approximate`}
              </div>

              {/* Node results */}
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Node Hydraulic Grade Lines &amp; Pressures</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                        <th className="text-left py-1">Node</th>
                        <th className="text-right py-1">HGL (m)</th>
                        <th className="text-right py-1">Elev (m)</th>
                        <th className="text-right py-1">Pressure head (m)</th>
                        <th className="text-right py-1">Pressure (kPa)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nodes.map(n => {
                        const r = results.nodes[n.id];
                        if (!r) return null;
                        const col = n.isReservoir ? "bg-blue-500" : n.extQ_Ls < 0 ? "bg-red-500" : "bg-emerald-500";
                        return (
                          <tr key={n.id} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-1.5 font-medium text-gray-900 dark:text-gray-100 text-sm">
                              <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${col}`} />
                              {n.label} <span className="text-gray-400 font-normal">({n.id})</span>
                            </td>
                            <td className="py-1.5 text-right font-mono text-gray-900 dark:text-gray-100">{r.head.toFixed(2)}</td>
                            <td className="py-1.5 text-right font-mono text-gray-500">{n.elevation.toFixed(1)}</td>
                            <td className="py-1.5 text-right font-mono text-gray-700 dark:text-gray-300">{(r.head - n.elevation).toFixed(2)}</td>
                            <td className="py-1.5 text-right font-mono font-semibold text-blue-700 dark:text-blue-300">{r.pressure_kPa.toFixed(1)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pipe results */}
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Pipe Flow Distribution</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                        <th className="text-left py-1">Pipe</th>
                        <th className="text-left py-1">Flow direction</th>
                        <th className="text-right py-1">|Q| L/s</th>
                        <th className="text-right py-1">V m/s</th>
                        <th className="text-right py-1">Re</th>
                        <th className="text-right py-1">f</th>
                        <th className="text-right py-1">h_L m</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pipes.map(p => {
                        const r = results.pipes[p.id];
                        if (!r) return null;
                        const dir    = r.Q_Ls >= 0 ? `${p.from} → ${p.to}` : `${p.to} → ${p.from}`;
                        const velCol = r.vel > 5 ? "text-red-600 dark:text-red-400" : r.vel > 3 ? "text-amber-600 dark:text-amber-400" : "text-gray-800 dark:text-gray-200";
                        return (
                          <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-1.5 font-medium text-gray-900 dark:text-gray-100">{p.id}</td>
                            <td className="py-1.5 text-xs text-gray-500 dark:text-gray-400">{dir}</td>
                            <td className="py-1.5 text-right font-mono font-semibold text-blue-700 dark:text-blue-300">{Math.abs(r.Q_Ls).toFixed(2)}</td>
                            <td className={`py-1.5 text-right font-mono ${velCol}`}>{r.vel.toFixed(2)}</td>
                            <td className="py-1.5 text-right font-mono text-gray-600 dark:text-gray-400">{r.Re.toExponential(2)}</td>
                            <td className="py-1.5 text-right font-mono text-gray-600 dark:text-gray-400">{r.f.toFixed(4)}</td>
                            <td className="py-1.5 text-right font-mono text-gray-700 dark:text-gray-300">{r.hL.toFixed(3)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Velocity colour: amber &gt;3 m/s (check), red &gt;5 m/s (erosion risk).
                </p>
              </div>

              {/* Continuity check */}
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Continuity Check</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                        <th className="text-left py-1">Node</th>
                        <th className="text-right py-1">∑ Q_in (L/s)</th>
                        <th className="text-right py-1">∑ Q_out (L/s)</th>
                        <th className="text-right py-1">Ext (L/s)</th>
                        <th className="text-right py-1">Imbalance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nodes.map(n => {
                        let inflow = 0, outflow = 0;
                        pipes.forEach(p => {
                          const r = results.pipes[p.id];
                          if (!r) return;
                          if (p.to === n.id)   inflow  += Math.max( r.Q_Ls, 0);
                          if (p.from === n.id) inflow  += Math.max(-r.Q_Ls, 0);
                          if (p.from === n.id) outflow += Math.max( r.Q_Ls, 0);
                          if (p.to === n.id)   outflow += Math.max(-r.Q_Ls, 0);
                        });
                        const imb = Math.abs(inflow - outflow - Math.abs(n.extQ_Ls));
                        return (
                          <tr key={n.id} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-1 font-medium text-gray-900 dark:text-gray-100">{n.id}</td>
                            <td className="py-1 text-right font-mono">{inflow.toFixed(3)}</td>
                            <td className="py-1 text-right font-mono">{outflow.toFixed(3)}</td>
                            <td className="py-1 text-right font-mono">{n.extQ_Ls.toFixed(3)}</td>
                            <td className={`py-1 text-right font-mono text-xs ${imb > 0.01 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                              {imb < 1e-6 ? "< 1e-6" : imb.toFixed(4)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Method reference */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Method &amp; Assumptions</h2>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5">
              <p><strong className="text-gray-700 dark:text-gray-300">Pipe flow:</strong> Q = sign(ΔH) · √(|ΔH| / r), where r = fL / (D A² · 2g) — Darcy-Weisbach head-loss formula.</p>
              <p><strong className="text-gray-700 dark:text-gray-300">Friction factor:</strong> Swamee-Jain approximation to Colebrook-White (±1%), updated after each Newton convergence.</p>

      <References refs={REFS_PIPE_NETWORK} />
              <p><strong className="text-gray-700 dark:text-gray-300">Nodal NR:</strong> Residual F_i = extQ_i + Σ Q_into_i; Jacobian ∂F_i/∂H_j = ±1/(2√|ΔH|·r). Converges quadratically.</p>
              <p><strong className="text-gray-700 dark:text-gray-300">Fluid:</strong> Water at 20°C (ν = 1.004 × 10⁻⁶ m²/s). Change ν in code for other fluids.</p>
              <p><strong className="text-gray-700 dark:text-gray-300">Reservoir:</strong> Fixed piezometric HGL = fixedHead + elevation. Minor losses not included (add as equivalent length if needed).</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
