// Run with: node scripts/generate-checklist.mjs
import { writeFileSync } from "fs";

const CATEGORIES = {
  "fluid-mechanics-i":  "Fluid Properties & Statics",
  "fluid-mechanics-ii": "Flow Essentials",
  "heat-mass-transfer": "Heat & Mass Transfer",
  "open-channel":       "Open Channel Flow",
  "compressible-flow":  "Compressible Flow",
  "turbomachinery":     "Turbomachinery",
  "pipe-networks":      "Pipe & Duct Systems",
};

const CALCULATORS = [
  // ── Fluid Properties & Statics ──────────────────────────────────────────────
  { cat: "fluid-mechanics-i",  name: "Reynolds Number — Internal (Pipe) Flow",  url: "/calculators/reynolds",             level: "Fundamental", isNew: false },
  { cat: "fluid-mechanics-i",  name: "Reynolds Number — External Flow",          url: "/calculators/reynolds-external",    level: "Fundamental", isNew: true  },
  { cat: "fluid-mechanics-i",  name: "Continuity Equation",                      url: "/calculators/continuity",           level: "Fundamental", isNew: false },
  { cat: "fluid-mechanics-i",  name: "Bernoulli Equation",                       url: "/calculators/bernoulli",            level: "Fundamental", isNew: false },
  { cat: "fluid-mechanics-i",  name: "Hydrostatic Pressure",                     url: "/calculators/hydrostatic",          level: "Fundamental", isNew: false },
  { cat: "fluid-mechanics-i",  name: "Hydrostatic Force on Plane Surface",       url: "/calculators/hydrostatic-force",    level: "Applied",     isNew: true  },
  { cat: "fluid-mechanics-i",  name: "Viscosity Conversion",                     url: "/calculators/viscosity-conversion", level: "Fundamental", isNew: true  },
  { cat: "fluid-mechanics-i",  name: "Ideal Gas Density",                        url: "/calculators/ideal-gas-density",    level: "Fundamental", isNew: true  },
  { cat: "fluid-mechanics-i",  name: "Specific Gravity / Relative Density",      url: "/calculators/specific-gravity",     level: "Fundamental", isNew: true  },
  { cat: "fluid-mechanics-i",  name: "Bulk Modulus & Compressibility",           url: "/calculators/bulk-modulus",         level: "Applied",     isNew: true  },
  { cat: "fluid-mechanics-i",  name: "Vapor Pressure & Cavitation Number",       url: "/calculators/cavitation-number",    level: "Applied",     isNew: true  },
  { cat: "fluid-mechanics-i",  name: "Metacentric Height",                       url: "/calculators/metacentric-height",   level: "Applied",     isNew: true  },
  { cat: "fluid-mechanics-i",  name: "Pipe Flow Rate",                           url: "/calculators/pipe-flow-rate",       level: "Fundamental", isNew: false },
  { cat: "fluid-mechanics-i",  name: "Manometer",                                url: "/calculators/manometer",            level: "Fundamental", isNew: false },
  { cat: "fluid-mechanics-i",  name: "Buoyancy",                                 url: "/calculators/buoyancy",             level: "Fundamental", isNew: false },
  { cat: "fluid-mechanics-i",  name: "Torricelli's Theorem",                     url: "/calculators/torricelli",           level: "Applied",     isNew: false },
  { cat: "fluid-mechanics-i",  name: "Pitot Tube",                               url: "/calculators/pitot-tube",           level: "Applied",     isNew: false },
  { cat: "fluid-mechanics-i",  name: "Velocity Head",                            url: "/calculators/velocity-head",        level: "Fundamental", isNew: false },
  { cat: "fluid-mechanics-i",  name: "Mass Flow Rate",                           url: "/calculators/mass-flow-rate",       level: "Fundamental", isNew: false },
  { cat: "fluid-mechanics-i",  name: "Surface Tension",                          url: "/calculators/surface-tension",      level: "Applied",     isNew: false },
  { cat: "fluid-mechanics-i",  name: "Capillary Rise",                           url: "/calculators/capillary-rise",       level: "Applied",     isNew: false },
  { cat: "fluid-mechanics-i",  name: "Dynamic Pressure",                         url: "/calculators/dynamic-pressure",     level: "Fundamental", isNew: false },
  { cat: "fluid-mechanics-i",  name: "Flow Work",                                url: "/calculators/flow-work",            level: "Applied",     isNew: false },
  { cat: "fluid-mechanics-i",  name: "Area Ratio",                               url: "/calculators/area-ratio",           level: "Fundamental", isNew: false },

  // ── Flow Essentials ─────────────────────────────────────────────────────────
  { cat: "fluid-mechanics-ii", name: "Pipe Head Loss",                           url: "/calculators/pipe-head-loss",       level: "Applied",     isNew: false },
  { cat: "fluid-mechanics-ii", name: "Minor Losses",                             url: "/calculators/minor-losses",         level: "Applied",     isNew: false },
  { cat: "fluid-mechanics-ii", name: "Pump Power",                               url: "/calculators/pump-power",           level: "Applied",     isNew: false },
  { cat: "fluid-mechanics-ii", name: "Poiseuille Flow",                          url: "/calculators/poiseuille-flow",      level: "Applied",     isNew: false },
  { cat: "fluid-mechanics-ii", name: "Orifice Flow",                             url: "/calculators/orifice-flow",         level: "Applied",     isNew: false },
  { cat: "fluid-mechanics-ii", name: "Venturi Flow",                             url: "/calculators/venturi-flow",         level: "Applied",     isNew: false },
  { cat: "fluid-mechanics-ii", name: "Drag on Sphere",                           url: "/calculators/drag-sphere",          level: "Applied",     isNew: false },
  { cat: "fluid-mechanics-ii", name: "Stokes Law",                               url: "/calculators/stokes-law",           level: "Specialized", isNew: false },
  { cat: "fluid-mechanics-ii", name: "Weber Number",                             url: "/calculators/weber-number",         level: "Applied",     isNew: false },
  { cat: "fluid-mechanics-ii", name: "Euler Number",                             url: "/calculators/euler-number",         level: "Applied",     isNew: false },
  { cat: "fluid-mechanics-ii", name: "Strouhal Number",                          url: "/calculators/strouhal-number",      level: "Specialized", isNew: false },
  { cat: "fluid-mechanics-ii", name: "Flow Coefficient",                         url: "/calculators/flow-coefficient",     level: "Applied",     isNew: false },
  { cat: "fluid-mechanics-ii", name: "Discharge Coefficient",                    url: "/calculators/discharge-coefficient",level: "Applied",     isNew: false },
  { cat: "fluid-mechanics-ii", name: "Pressure Recovery",                        url: "/calculators/pressure-recovery",    level: "Applied",     isNew: false },
  { cat: "fluid-mechanics-ii", name: "Non-Circular Duct Flow",                   url: "/calculators/non-circular-duct",    level: "Applied",     isNew: false },
  { cat: "fluid-mechanics-ii", name: "Lift Force",                               url: "/calculators/lift-force",           level: "Applied",     isNew: false },
  { cat: "fluid-mechanics-ii", name: "Boundary Layer Thickness",                 url: "/calculators/boundary-layer",       level: "Specialized", isNew: false },
  { cat: "fluid-mechanics-ii", name: "Momentum Flux",                            url: "/calculators/momentum-flux",        level: "Applied",     isNew: false },
  { cat: "fluid-mechanics-ii", name: "Control Volume Force",                     url: "/calculators/control-volume-force", level: "Specialized", isNew: false },
  { cat: "fluid-mechanics-ii", name: "Vortex Flow",                              url: "/calculators/vortex-flow",          level: "Specialized", isNew: false },
  { cat: "fluid-mechanics-ii", name: "Swirl Number",                             url: "/calculators/swirl-number",         level: "Specialized", isNew: false },
  { cat: "fluid-mechanics-ii", name: "Energy Loss",                              url: "/calculators/energy-loss",          level: "Applied",     isNew: false },

  // ── Heat & Mass Transfer ────────────────────────────────────────────────────
  { cat: "heat-mass-transfer", name: "Nusselt Number",                           url: "/calculators/nusselt-number",               level: "Applied",     isNew: false },
  { cat: "heat-mass-transfer", name: "Prandtl Number",                           url: "/calculators/prandtl-number",               level: "Applied",     isNew: false },
  { cat: "heat-mass-transfer", name: "Grashof Number",                           url: "/calculators/grashof-number",               level: "Specialized", isNew: false },
  { cat: "heat-mass-transfer", name: "Rayleigh Number",                          url: "/calculators/rayleigh-number",              level: "Specialized", isNew: false },
  { cat: "heat-mass-transfer", name: "Peclet Number",                            url: "/calculators/peclet-number",                level: "Applied",     isNew: false },
  { cat: "heat-mass-transfer", name: "Schmidt Number",                           url: "/calculators/schmidt-number",               level: "Applied",     isNew: false },
  { cat: "heat-mass-transfer", name: "Sherwood Number",                          url: "/calculators/sherwood-number",              level: "Applied",     isNew: false },
  { cat: "heat-mass-transfer", name: "Lewis Number",                             url: "/calculators/lewis-number",                 level: "Specialized", isNew: false },
  { cat: "heat-mass-transfer", name: "LMTD",                                     url: "/calculators/lmtd",                         level: "Applied",     isNew: false },
  { cat: "heat-mass-transfer", name: "Overall Heat Transfer Coefficient",        url: "/calculators/overall-htc",                  level: "Applied",     isNew: false },
  { cat: "heat-mass-transfer", name: "Dittus-Boelter Correlation",              url: "/calculators/dittus-boelter",               level: "Applied",     isNew: false },
  { cat: "heat-mass-transfer", name: "Natural Convection (Vertical Plate)",      url: "/calculators/natural-convection-plate",     level: "Applied",     isNew: false },
  { cat: "heat-mass-transfer", name: "Effectiveness-NTU Method",                url: "/calculators/effectiveness-ntu",            level: "Specialized", isNew: false },
  { cat: "heat-mass-transfer", name: "Fouling Factor",                           url: "/calculators/fouling-factor",               level: "Applied",     isNew: false },
  { cat: "heat-mass-transfer", name: "Fin Efficiency",                           url: "/calculators/fin-efficiency",               level: "Specialized", isNew: false },
  { cat: "heat-mass-transfer", name: "Thermal Resistance Network",               url: "/calculators/thermal-resistance",           level: "Applied",     isNew: false },

  // ── Open Channel Flow ───────────────────────────────────────────────────────
  { cat: "open-channel",       name: "Froude Number",                            url: "/calculators/froude-number",        level: "Fundamental", isNew: false },
  { cat: "open-channel",       name: "Manning's Equation",                       url: "/calculators/mannings-equation",    level: "Fundamental", isNew: false },
  { cat: "open-channel",       name: "Critical Depth",                           url: "/calculators/critical-depth",       level: "Applied",     isNew: false },
  { cat: "open-channel",       name: "Hydraulic Jump",                           url: "/calculators/hydraulic-jump",       level: "Applied",     isNew: false },
  { cat: "open-channel",       name: "Weir Flow",                                url: "/calculators/weir-flow",            level: "Applied",     isNew: false },
  { cat: "open-channel",       name: "Specific Energy",                          url: "/calculators/specific-energy",      level: "Applied",     isNew: false },
  { cat: "open-channel",       name: "Normal Depth",                             url: "/calculators/normal-depth",         level: "Applied",     isNew: false },
  { cat: "open-channel",       name: "Chezy Equation",                           url: "/calculators/chezy-equation",       level: "Applied",     isNew: false },
  { cat: "open-channel",       name: "Hydraulic Radius",                         url: "/calculators/hydraulic-radius",     level: "Fundamental", isNew: false },
  { cat: "open-channel",       name: "Wetted Perimeter",                         url: "/calculators/wetted-perimeter",     level: "Fundamental", isNew: false },
  { cat: "open-channel",       name: "Flow Classification",                      url: "/calculators/flow-classification",  level: "Fundamental", isNew: false },
  { cat: "open-channel",       name: "Trapezoidal Channel",                      url: "/calculators/trapezoidal-channel",  level: "Applied",     isNew: false },
  { cat: "open-channel",       name: "Culvert Design",                           url: "/calculators/culvert-design",       level: "Applied",     isNew: false },
  { cat: "open-channel",       name: "Sediment Transport (Shields)",             url: "/calculators/sediment-transport",   level: "Specialized", isNew: false },
  { cat: "open-channel",       name: "Gradually Varied Flow",                    url: "/calculators/gradually-varied-flow",level: "Specialized", isNew: false },
  { cat: "open-channel",       name: "Tidal Prism",                              url: "/calculators/tidal-prism",          level: "Specialized", isNew: false },

  // ── Compressible Flow ───────────────────────────────────────────────────────
  { cat: "compressible-flow",  name: "Mach Number",                              url: "/calculators/mach-number",              level: "Fundamental", isNew: false },
  { cat: "compressible-flow",  name: "Speed of Sound",                           url: "/calculators/speed-of-sound",           level: "Fundamental", isNew: false },
  { cat: "compressible-flow",  name: "Isentropic Flow Relations",                url: "/calculators/isentropic-relations",     level: "Fundamental", isNew: false },
  { cat: "compressible-flow",  name: "Normal Shock Relations",                   url: "/calculators/normal-shock",             level: "Applied",     isNew: false },
  { cat: "compressible-flow",  name: "Stagnation Properties",                    url: "/calculators/stagnation-properties",    level: "Fundamental", isNew: false },
  { cat: "compressible-flow",  name: "Choked Flow Rate",                         url: "/calculators/choked-flow",              level: "Applied",     isNew: false },
  { cat: "compressible-flow",  name: "Area-Mach Number Relation",                url: "/calculators/area-mach-relation",       level: "Applied",     isNew: false },
  { cat: "compressible-flow",  name: "Fanno Flow",                               url: "/calculators/fanno-flow",               level: "Specialized", isNew: false },
  { cat: "compressible-flow",  name: "Rayleigh Flow",                            url: "/calculators/rayleigh-flow",            level: "Specialized", isNew: false },
  { cat: "compressible-flow",  name: "Oblique Shock Relations",                  url: "/calculators/oblique-shock",            level: "Specialized", isNew: false },
  { cat: "compressible-flow",  name: "Prandtl-Meyer Expansion",                  url: "/calculators/prandtl-meyer-expansion",  level: "Specialized", isNew: false },

  // ── Turbomachinery ──────────────────────────────────────────────────────────
  { cat: "turbomachinery",     name: "Pump Head (Euler)",                        url: "/calculators/pump-head",            level: "Applied",     isNew: false },
  { cat: "turbomachinery",     name: "NPSH",                                     url: "/calculators/npsh",                 level: "Applied",     isNew: false },
  { cat: "turbomachinery",     name: "Specific Speed",                           url: "/calculators/specific-speed",       level: "Applied",     isNew: false },
  { cat: "turbomachinery",     name: "Pump Affinity Laws",                       url: "/calculators/affinity-laws",        level: "Applied",     isNew: false },
  { cat: "turbomachinery",     name: "Hydraulic Efficiency",                     url: "/calculators/hydraulic-efficiency", level: "Applied",     isNew: false },
  { cat: "turbomachinery",     name: "Turbine Power",                            url: "/calculators/turbine-power",        level: "Applied",     isNew: false },
  { cat: "turbomachinery",     name: "Fan Laws",                                 url: "/calculators/fan-laws",             level: "Applied",     isNew: false },
  { cat: "turbomachinery",     name: "Impeller Tip Speed",                       url: "/calculators/impeller-tip-speed",   level: "Fundamental", isNew: false },
  { cat: "turbomachinery",     name: "Suction Specific Speed",                   url: "/calculators/suction-specific-speed",level:"Specialized", isNew: false },

  // ── Pipe & Duct Systems ─────────────────────────────────────────────────────
  { cat: "pipe-networks",      name: "Friction Factor",                          url: "/calculators/friction-factor",      level: "Applied",     isNew: false },
  { cat: "pipe-networks",      name: "Series Pipe System",                       url: "/calculators/series-pipe",          level: "Applied",     isNew: false },
  { cat: "pipe-networks",      name: "Parallel Pipe System",                     url: "/calculators/parallel-pipe",        level: "Applied",     isNew: false },
  { cat: "pipe-networks",      name: "Water Hammer",                             url: "/calculators/water-hammer",         level: "Applied",     isNew: false },
  { cat: "pipe-networks",      name: "Colebrook-White Equation",                 url: "/calculators/colebrook-white",      level: "Applied",     isNew: false },
  { cat: "pipe-networks",      name: "Swamee-Jain Equation",                     url: "/calculators/swamee-jain",          level: "Applied",     isNew: false },
  { cat: "pipe-networks",      name: "Hazen-Williams Flow",                      url: "/calculators/hazen-williams",       level: "Applied",     isNew: false },
  { cat: "pipe-networks",      name: "Pipe Sizing",                              url: "/calculators/pipe-sizing",          level: "Applied",     isNew: false },
  { cat: "pipe-networks",      name: "Hydraulic Gradient",                       url: "/calculators/hydraulic-gradient",   level: "Fundamental", isNew: false },
];

// ── Build CSV ────────────────────────────────────────────────────────────────
function esc(s) { return `"${String(s).replace(/"/g, '""')}"`; }

const rows = [];
rows.push(["#", "Category", "Calculator", "URL", "Level", "New?", "Tested?", "Notes"].map(esc).join(","));

let n = 0;
let currentCat = null;

for (const calc of CALCULATORS) {
  if (calc.cat !== currentCat) {
    currentCat = calc.cat;
    // blank separator row then category header
    rows.push(["", "", "", "", "", "", "", ""].map(esc).join(","));
    rows.push([
      esc(""),
      esc(CATEGORIES[calc.cat]),
      esc(""), esc(""), esc(""), esc(""), esc(""), esc(""),
    ].join(","));
  }
  n++;
  rows.push([
    esc(n),
    esc(CATEGORIES[calc.cat]),
    esc(calc.name),
    esc("localhost:3000" + calc.url),
    esc(calc.level),
    esc(calc.isNew ? "NEW" : ""),
    esc(""),   // Tested? — user fills in ✓
    esc(""),   // Notes
  ].join(","));
}

// summary row
rows.push(["", "", "", "", "", "", "", ""].map(esc).join(","));
rows.push([esc(""), esc(`TOTAL: ${n} calculators`), esc(""), esc(""), esc(""), esc(""), esc(""), esc("")].join(","));

const csv = rows.join("\r\n");
const outPath = process.cwd() + "/Calculator Testing Checklist.csv";
writeFileSync(outPath, "﻿" + csv, "utf8");   // BOM for Excel UTF-8
console.log(`✓  Created: ${outPath}`);
console.log(`   ${n} calculators across ${Object.keys(CATEGORIES).length} categories`);
