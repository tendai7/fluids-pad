import Link from "next/link";
import { calculatorCategories } from "@/lib/calculator-data";
import { HeroBackground } from "@/components/HeroBackground";

// ── Discipline accent colours ──────────────────────────────────────────────────
const CAT_COLOR: Record<string, string> = {
  "fluid-mechanics-i":  "text-blue-600   dark:text-blue-400",
  "fluid-mechanics-ii": "text-emerald-600 dark:text-emerald-400",
  "heat-mass-transfer": "text-orange-500  dark:text-orange-400",
  "open-channel":       "text-teal-600   dark:text-teal-400",
  "compressible-flow":  "text-rose-600   dark:text-rose-400",
  "turbomachinery":     "text-indigo-600 dark:text-indigo-400",
  "pipe-networks":      "text-cyan-600   dark:text-cyan-400",
};

// ── Three entry points ─────────────────────────────────────────────────────────
const ENTRY = [
  {
    label:   "Calculators",
    href:    "/calculators",
    summary: "Pick a calculation, get a result that shows every step — not just the answer.",
    border:  "border-sky-400 dark:border-sky-500",
    accent:  "text-sky-600 dark:text-sky-400",
    glow:    "entry-card-sky",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
      </svg>
    ),
  },
  {
    label:   "Design Tools",
    href:    "/design",
    summary: "Guided workflows from fluid selection to design document — with cost estimates built in.",
    border:  "border-violet-400 dark:border-violet-500",
    accent:  "text-violet-600 dark:text-violet-400",
    glow:    "entry-card-violet",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/>
      </svg>
    ),
  },
  {
    label:   "Learn",
    href:    "/practice",
    summary: "Practice problems set in real engineering contexts — not the sanitised textbook version.",
    border:  "border-emerald-400 dark:border-emerald-500",
    accent:  "text-emerald-600 dark:text-emerald-400",
    glow:    "entry-card-emerald",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
      </svg>
    ),
  },
];

// ── Spotlight tools ────────────────────────────────────────────────────────────
const SPOTLIGHT = [
  {
    name:    "Slurry Pipeline",
    note:    "Durand-Condolios · Wilson-GIW",
    href:    "/calculators/slurry-pipeline",
    summary: "Critical deposition velocity, heterogeneous head loss, and pump de-rating for SA mining conditions. Every formula referenced to primary literature.",
    bar:     "from-amber-400 to-orange-500",
  },
  {
    name:    "Mine Ventilation",
    note:    "Atkinson equation · MHSA Reg. 5.15.1",
    href:    "/calculators/mine-ventilation",
    summary: "Airway resistance, fan H-Q operating point, diesel dilution compliance, and per-airway velocity checks — built around South African underground mining practice.",
    bar:     "from-teal-400 to-emerald-500",
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    // -mx cancels main's horizontal padding; -mt/-mb cancel the py-8 top/bottom
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-8 -mb-8">

      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[44vh] flex items-center justify-center overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0c4a6e 35%, #075985 65%, #1e40af 100%)" }}>

        <HeroBackground>
          {/* Animated radial glow behind the hero text */}
          <div className="absolute inset-0 hero-radial-glow pointer-events-none" />

          <div className="relative z-10 text-center px-6 py-10 max-w-3xl mx-auto">
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-sky-400/70 mb-5">
              Fluids Pad
            </p>

            <h1 className="hero-text-shadow text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight mb-4">
              Fluid mechanics
              <br />
              <span className="text-sky-300">before the site visit.</span>
            </h1>

            <p className="hero-text-shadow text-sm text-sky-100/90 max-w-md mx-auto mb-7 leading-relaxed">
              Pipe flow to slurry transport. Shock waves to mine ventilation.
              Every result cited, every step shown.
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/calculators"
                className="hero-cta-primary px-6 py-2.5 bg-white hover:bg-sky-50 text-sky-900 font-bold rounded-xl shadow-lg text-sm">
                Open the calculators
              </Link>
              <Link href="/design"
                className="px-6 py-2.5 border border-sky-400/40 hover:border-sky-300 text-sky-200 hover:text-white font-semibold rounded-xl transition-colors text-sm">
                See design tools
              </Link>
            </div>
          </div>
        </HeroBackground>

        {/* Fade into next section */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none" />
      </section>

      {/* ─── Three entry points ───────────────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-900 px-4 sm:px-8 lg:px-16 py-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {ENTRY.map((e) => (
            <Link key={e.label} href={e.href}
              className={`group block rounded-2xl border-2 ${e.border} bg-white dark:bg-gray-800 p-7 entry-card ${e.glow}`}>
              <div className={`mb-4 ${e.accent} transition-transform duration-300 group-hover:scale-110`}>{e.icon}</div>
              <h2 className={`text-base font-bold mb-2.5 ${e.accent}`}>{e.label}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{e.summary}</p>
              <p className={`mt-6 text-[10px] font-bold uppercase tracking-widest ${e.accent} flex items-center gap-1 group-hover:gap-2 transition-all duration-200`}>
                Go
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
                </svg>
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── By discipline ────────────────────────────────────────────────── */}
      <section className="bg-sky-50 dark:bg-gray-800/30 px-4 sm:px-8 lg:px-16 py-14 border-t border-b border-sky-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-400 dark:text-sky-600 mb-8">
            By discipline
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-7">
            {calculatorCategories.map((cat) => {
              const color = CAT_COLOR[cat.id] ?? "text-gray-600 dark:text-gray-400";
              return (
                <Link key={cat.id} href={`/categories/${cat.id}`} className="group">
                  <p className={`text-sm font-bold mb-1.5 ${color} group-hover:underline underline-offset-2`}>
                    {cat.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {cat.description}
                  </p>
                </Link>
              );
            })}
          </div>

          <div className="mt-10">
            <Link href="/calculators"
              className="text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline underline-offset-4">
              Browse all calculators →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Spotlight ────────────────────────────────────────────────────── */}
      <section
        className="relative px-4 sm:px-8 lg:px-16 py-16 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0c2340 0%, #0c4a6e 100%)" }}>

        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-500/70 mb-2">
            Worth exploring
          </p>
          <p className="text-white text-lg font-semibold mb-10 max-w-sm leading-snug">
            Built specifically for South African engineering practice.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {SPOTLIGHT.map((tool) => (
              <Link key={tool.name} href={tool.href}
                className="group block rounded-2xl overflow-hidden bg-white/5 ring-1 ring-white/10 hover:bg-white/10 hover:ring-white/20 hover:-translate-y-0.5 transition-all duration-300">
                <div className={`h-1 w-full bg-gradient-to-r ${tool.bar}`} />
                <div className="p-7">
                  <p className="text-[10px] font-mono font-bold tracking-widest text-sky-400/70 uppercase mb-3">
                    {tool.note}
                  </p>
                  <h3 className="text-lg font-bold text-white mb-2.5">{tool.name}</h3>
                  <p className="text-sm text-sky-100/60 leading-relaxed">{tool.summary}</p>
                  <p className="mt-7 text-[10px] font-bold uppercase tracking-widest text-sky-400/50 group-hover:text-sky-300 flex items-center gap-1 group-hover:gap-2 transition-all duration-200">
                    Open
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
                    </svg>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
