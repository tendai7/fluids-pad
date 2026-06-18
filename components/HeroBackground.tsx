"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

const VIEW_W = 1600;
const VIEW_H = 500;
const MAX_BOOST = 18;
const FALLOFF_RADIUS = 110;

// Fewer, bolder lines than before — calmer hero, clearer flow pulse.
const STREAMLINES = [
  { y: 90,  amp: 14, speed: 7.5, opacity: 0.16, width: 1.1, delay: 0,    dash: "10 26" },
  { y: 165, amp: 24, speed: 6.5, opacity: 0.24, width: 1.4, delay: -2.5, dash: "12 24" },
  { y: 235, amp: 34, speed: 5.5, opacity: 0.36, width: 1.8, delay: -4.0, dash: "14 22" },
  { y: 265, amp: 34, speed: 5.5, opacity: 0.36, width: 1.8, delay: -1.2, dash: "14 22" },
  { y: 335, amp: 24, speed: 6.5, opacity: 0.24, width: 1.4, delay: -3.6, dash: "12 24" },
  { y: 410, amp: 14, speed: 7.5, opacity: 0.16, width: 1.1, delay: -5.8, dash: "10 26" },
];

const GLOW_INDICES = [2, 3];

const PARTICLES = [
  { idx: 1, r: 3.0, dur: "13s", begin: "0s",  filter: "url(#pg-med)" },
  { idx: 2, r: 3.6, dur: "10s", begin: "-3s", filter: "url(#pg-med)" },
  { idx: 3, r: 3.6, dur: "10s", begin: "-7s", filter: "url(#pg-med)" },
  { idx: 4, r: 3.0, dur: "13s", begin: "-9s", filter: "url(#pg-med)" },
];

const LABELS = [
  { text: "Re", x: 150,  y: 70,  size: 14, delay: "0s"  },
  { text: "∇p", x: 420,  y: 440, size: 12, delay: "-2s" },
  { text: "ρ",  x: 1230, y: 100, size: 16, delay: "-4s" },
  { text: "μ",  x: 1420, y: 410, size: 14, delay: "-6s" },
];

function makePath(y: number, a: number) {
  return `M -200,${y} C 0,${y - a} 200,${y + a} 400,${y} C 600,${y - a} 800,${y + a} 1000,${y} C 1200,${y - a} 1400,${y + a} 1600,${y} C 1800,${y - a} 2000,${y + a} 2200,${y}`;
}

export function HeroBackground({ children }: { children?: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);
  const [pointerY, setPointerY] = useState<number | null>(null);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const handleMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (reducedMotionRef.current || frameRef.current !== null) return;
    const clientY = e.clientY;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPointerY(((clientY - rect.top) / rect.height) * VIEW_H);
    });
  }, []);

  const handleLeave = useCallback(() => setPointerY(null), []);

  const boostFor = (lineY: number) => {
    if (pointerY === null) return 0;
    const dist = Math.abs(lineY - pointerY);
    return Math.max(0, 1 - dist / FALLOFF_RADIUS) * MAX_BOOST;
  };

  return (
    <>
      <style>{`
        @keyframes sl  { to { stroke-dashoffset: -40; } }
        @keyframes lbl { 0%,100%{opacity:.12;transform:translateY(0px)} 50%{opacity:.32;transform:translateY(-9px)} }
        @keyframes glo { 0%,100%{opacity:.32} 50%{opacity:.7} }
        .sl, .glo-line { transition: d 0.25s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .sl, .sl-lbl, .glo-line { animation: none !important; transition: none !important; }
        }
      `}</style>

      {/* Wraps the whole hero (svg + the text/CTA content passed as children) so
          mousemove bubbles up here even when the cursor is over the headline or
          buttons — those stay clickable since this wrapper has no background. */}
      <div
        ref={trackRef}
        className="absolute inset-0"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <filter id="pg-med" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="line-glow" x="-20%" y="-200%" width="140%" height="500%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>

          {/* Hidden paths for animateMotion to follow — amplitude reacts to the cursor too */}
          {STREAMLINES.map((l, i) => (
            <path key={i} id={`sp${i}`} d={makePath(l.y, l.amp + boostFor(l.y))} fill="none" stroke="none"/>
          ))}
        </defs>

        {/* Base streamlines */}
        {STREAMLINES.map((l, i) => (
          <path
            key={i}
            className="sl"
            d={makePath(l.y, l.amp + boostFor(l.y))}
            fill="none"
            stroke="rgb(147,210,252)"
            strokeWidth={l.width}
            strokeOpacity={l.opacity}
            strokeDasharray={l.dash}
            style={{ animation: `sl ${l.speed}s linear infinite`, animationDelay: `${l.delay}s` }}
          />
        ))}

        {/* Glowing accent overlay on the two central streamlines */}
        {GLOW_INDICES.map((idx) => (
          <path
            key={`g${idx}`}
            className="glo-line"
            d={makePath(STREAMLINES[idx].y, STREAMLINES[idx].amp + boostFor(STREAMLINES[idx].y))}
            fill="none"
            stroke="rgb(125,211,252)"
            strokeWidth={1}
            filter="url(#line-glow)"
            style={{
              animation: `glo ${5 + idx * 0.5}s ease-in-out infinite`,
              animationDelay: `${idx * 1.5}s`,
            }}
          />
        ))}

        {/* Traveling particles */}
        {PARTICLES.map((p, i) => (
          <circle key={i} r={p.r} fill="rgb(186,230,253)" filter={p.filter}>
            <animateMotion dur={p.dur} repeatCount="indefinite" begin={p.begin}>
              <mpath href={`#sp${p.idx}`} />
            </animateMotion>
          </circle>
        ))}

        {/* Floating physics labels */}
        {LABELS.map((l, i) => (
          <text
            key={i}
            className="sl-lbl"
            x={l.x}
            y={l.y}
            fontSize={l.size}
            fontFamily="ui-monospace, 'Courier New', monospace"
            fill="rgb(186,230,253)"
            textAnchor="middle"
            style={{ animation: `lbl ${7 + i * 1.3}s ease-in-out infinite`, animationDelay: l.delay }}
          >
            {l.text}
          </text>
        ))}
      </svg>

      {children}
      </div>
    </>
  );
}
