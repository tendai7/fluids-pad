"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { DarkModeToggle } from "./DarkModeToggle";
import { GlobalSearch, useGlobalSearch } from "./GlobalSearch";

// ── Types ─────────────────────────────────────────────────────────────────────
interface NavLink    { label: string; href: string; desc: string; comingSoon?: boolean; }
interface NavSection { title: string; links: NavLink[]; }
interface MegaItem   {
  label: string;
  sections: NavSection[];
  footer?: { label: string; href: string };
  comingSoon?: boolean;
  dropdownAlign: "left" | "center" | "right";
}
interface SimpleLink { label: string; href: string; }

// ── Mega-dropdown menu data ───────────────────────────────────────────────────
const MEGA: MegaItem[] = [
  {
    label: "Calculators",
    dropdownAlign: "left",
    footer: { label: "All calculators →", href: "/calculators" },
    sections: [
      {
        title: "Pipe & Flow Systems",
        links: [
          { label: "Pipe & Duct Systems",       href: "/categories/pipe-networks",      desc: "Friction factors, pipe sizing, water hammer" },
          { label: "Open Channel Flow",          href: "/categories/open-channel",       desc: "Manning's, hydraulic jump, culverts" },
        ],
      },
      {
        title: "Machines & Heat",
        links: [
          { label: "Turbomachinery",             href: "/categories/turbomachinery",     desc: "Pumps, fans, turbines, NPSH, affinity laws" },
          { label: "Heat & Mass Transfer",       href: "/categories/heat-mass-transfer", desc: "Convection, heat exchangers, LMTD" },
        ],
      },
      {
        title: "Fundamentals",
        links: [
          { label: "Fluid Properties & Statics", href: "/categories/fluid-mechanics-i",  desc: "Bernoulli, buoyancy, hydrostatics, ideal gas" },
          { label: "Flow Essentials",            href: "/categories/fluid-mechanics-ii", desc: "Head loss, orifice, venturi, drag, lift" },
          { label: "Compressible Flow",          href: "/categories/compressible-flow",  desc: "Mach, isentropic relations, shocks" },
        ],
      },
    ],
  },
  {
    label: "Design Tools",
    dropdownAlign: "center",
    footer: { label: "Open design workspace →", href: "/design" },
    sections: [
      {
        title: "Process & Infrastructure",
        links: [
          { label: "Pipe System Design",     href: "/design",                             desc: "Fluid → pipe → pump → cost → RFQ in one workflow" },
          { label: "Pipe Wall Thickness",    href: "/design/pipe-wall",                  desc: "ASME B31.3 / B31.1 — minimum wall and schedule selection" },
          { label: "Control Valve Sizing",   href: "/design/control-valve",              desc: "IEC 60534 Kv/Cv — liquid, gas, steam · cavitation · choking" },
          { label: "Pressure Vessel Design", href: "/design/pressure-vessel",            desc: "ASME VIII Div.1 — shell, heads, MAWP, weight, cost" },
          { label: "Orifice Plate Sizing",   href: "/calculators/orifice-plate-sizing",  desc: "ISO 5167-2 iterative bore sizing · liquids and gases · ZAR cost" },
        ],
      },
      {
        title: "Mining & Civil",
        links: [
          { label: "Slurry Pipeline",     href: "/calculators/slurry-pipeline",   desc: "Durand-Condolios critical velocity · Wilson-GIW pump de-rating" },
          { label: "Mine Ventilation",    href: "/calculators/mine-ventilation",  desc: "Atkinson airway resistance · fan selection · MHSA Reg. 5.15.1" },
          { label: "Stormwater Drainage", href: "/design/stormwater",             desc: "SANRAL Rational Method with SA IDF data · Manning's pipe sizing" },
        ],
      },
    ],
  },
  {
    label: "Learn",
    dropdownAlign: "right",
    sections: [
      {
        title: "Practice",
        links: [
          { label: "Practice Problems",   href: "/practice", desc: "Adaptive AI-generated problems with hints and feedback" },
          { label: "Calculation History", href: "/history",  desc: "Every calculator you've opened, searchable" },
        ],
      },
      {
        title: "Reference",
        links: [
          { label: "Formula Sheet",        href: "/formulas",     desc: "Build and print a custom exam sheet" },
        ],
      },
    ],
  },
];

// ── Direct-link nav items (no dropdown) ───────────────────────────────────────
const SIMPLE: SimpleLink[] = [
  { label: "Converter", href: "/converter" },
  { label: "Tables",    href: "/tables"    },
];

// ── Shared icon ───────────────────────────────────────────────────────────────
function ChevronDown() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ── Dropdown panel ────────────────────────────────────────────────────────────
function MegaDropdown({ item, onClose }: { item: MegaItem; onClose: () => void }) {
  const cols  = item.sections.length;
  const width = cols >= 3 ? "w-[660px]" : cols === 2 ? "w-[430px]" : "w-[280px]";
  const grid  = cols >= 3 ? "grid-cols-3" : cols === 2 ? "grid-cols-2" : "grid-cols-1";
  const pos   =
    item.dropdownAlign === "left"  ? "left-0" :
    item.dropdownAlign === "right" ? "right-0" :
    "left-1/2 -translate-x-1/2";

  return (
    <div className={`absolute top-full mt-1.5 ${pos} ${width} bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl shadow-black/10 overflow-hidden z-50`}>
      <div className={`grid ${grid} gap-0 p-5`}>
        {item.sections.map((section) => (
          <div key={section.title} className="px-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2.5 px-2">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.links.map((link) =>
                link.comingSoon ? (
                  <div key={link.label} className="p-2 rounded-lg opacity-50 cursor-not-allowed select-none">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">{link.label}</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded font-bold uppercase leading-none">
                        Soon
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{link.desc}</p>
                  </div>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={onClose}
                    className="block p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 group transition-colors"
                  >
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {link.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{link.desc}</p>
                  </Link>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {item.footer && (
        <div className="border-t border-gray-100 dark:border-gray-700/60 px-6 py-3 bg-gray-50/60 dark:bg-gray-800/60">
          <Link
            href={item.footer.href}
            onClick={onClose}
            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            {item.footer.label}
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Single mega-nav item (with dropdown) ──────────────────────────────────────
function MegaNavItem({ item }: { item: MegaItem }) {
  const [open, setOpen] = useState(false);
  const closeTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname        = usePathname();

  const isActive = item.sections.some((s) =>
    s.links.some((l) => l.href !== "#" && (pathname === l.href || pathname.startsWith(l.href + "/")))
  );

  const enter = () => { if (closeTimer.current) clearTimeout(closeTimer.current); setOpen(true); };
  const leave = () => { closeTimer.current = setTimeout(() => setOpen(false), 120); };

  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isActive || open
            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
            : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
        }`}
      >
        {item.label}
        {item.comingSoon && (
          <span className="text-[9px] px-1 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded font-bold uppercase leading-none">
            Soon
          </span>
        )}
        <span className={`transition-transform duration-150 text-gray-400 ${open ? "rotate-180" : ""}`}>
          <ChevronDown />
        </span>
      </button>

      {open && <MegaDropdown item={item} onClose={() => setOpen(false)} />}
    </div>
  );
}

// ── Simple nav link (no dropdown) ─────────────────────────────────────────────
function SimpleNavLink({ label, href }: SimpleLink) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
          : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
      }`}
    >
      {label}
    </Link>
  );
}

// ── NavBar ────────────────────────────────────────────────────────────────────
export function NavBar() {
  const [mobileOpen,     setMobileOpen]     = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const { open: searchOpen, setOpen: setSearchOpen } = useGlobalSearch();
  const pathname = usePathname();

  return (
    <>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* Brand */}
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center flex-shrink-0 opacity-90 hover:opacity-100 transition-opacity"
            >
              <Image src="/logo.png" alt="Fluidspad" width={600} height={146} className="h-7 w-auto dark:hidden" priority />
              <Image src="/logo-dark.png" alt="Fluidspad" width={600} height={145} className="hidden h-7 w-auto dark:block" priority />
            </Link>

            {/* Desktop nav — mega items then simple links */}
            <nav className="hidden md:flex items-center gap-1">
              {MEGA.map((item) => (
                <MegaNavItem key={item.label} item={item} />
              ))}
              {SIMPLE.map((link) => (
                <SimpleNavLink key={link.label} {...link} />
              ))}
            </nav>

            {/* Right: search + dark mode + hamburger */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Search (⌘K)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="hidden lg:block text-xs">Search</span>
                <kbd className="hidden lg:block text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
              </button>

              <DarkModeToggle />

              {/* Hamburger — mobile only */}
              <button
                onClick={() => setMobileOpen((v) => !v)}
                className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Menu"
              >
                {mobileOpen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2">

            {/* Mega items with expandable sections */}
            {MEGA.map((item) => (
              <div key={item.label}>
                <button
                  onClick={() => setMobileExpanded((v) => (v === item.label ? null : item.label))}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {item.label}
                    {item.comingSoon && (
                      <span className="text-[9px] px-1 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded font-bold uppercase">
                        Soon
                      </span>
                    )}
                  </span>
                  <span className={`transition-transform text-gray-400 ${mobileExpanded === item.label ? "rotate-180" : ""}`}>
                    <ChevronDown />
                  </span>
                </button>

                {mobileExpanded === item.label && (
                  <div className="pb-2 bg-gray-50/40 dark:bg-gray-700/20">
                    {item.sections.map((section) => (
                      <div key={section.title} className="px-6 pb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1 mt-3">
                          {section.title}
                        </p>
                        {section.links.map((link) =>
                          link.comingSoon ? (
                            <div key={link.label} className="py-1.5 px-2 flex items-center gap-2 opacity-50">
                              <span className="text-sm text-gray-500 dark:text-gray-400">{link.label}</span>
                              <span className="text-[9px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded font-bold uppercase">Soon</span>
                            </div>
                          ) : (
                            <Link
                              key={link.label}
                              href={link.href}
                              onClick={() => setMobileOpen(false)}
                              className="block py-2 px-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-gray-700 transition-colors"
                            >
                              {link.label}
                            </Link>
                          )
                        )}
                      </div>
                    ))}
                    {item.footer && (
                      <div className="px-8 pt-2">
                        <Link
                          href={item.footer.href}
                          onClick={() => setMobileOpen(false)}
                          className="text-sm font-semibold text-blue-600 dark:text-blue-400"
                        >
                          {item.footer.label}
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Simple links — flat in mobile menu */}
            <div className="border-t border-gray-100 dark:border-gray-700/60 mt-1 pt-1">
              {SIMPLE.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-2.5 text-sm font-semibold transition-colors ${
                    pathname === link.href
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

          </div>
        )}
      </header>
    </>
  );
}
