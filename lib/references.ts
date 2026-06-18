// ─── Centralized reference data for all calculators ──────────────────────────
//
// QUALITY STANDARD — every entry must satisfy ALL of the following:
//   ✓  Author names, year, title, and source verified against known literature
//   ✓  Specific enough to locate (chapter/section noted where helpful)
//   ✓  No invented DOIs or page numbers — omit if uncertain
//   ✓  Standard/code references include the full designation and title

export type RefType = "book" | "journal" | "standard" | "report" | "online";

export interface Reference {
  type:       RefType;
  authors:    string;         // "Last, F.M." or "Last1, F. & Last2, G."
  year:       string;         // "1883" or "2016"
  title:      string;
  source:     string;         // Journal name / Publisher / Institution / Standard body
  details?:   string;         // Edition, volume, issue, pages, chapter — only if certain
  note?:      string;         // How this reference applies to this calculator
}

// ─── Reynolds Number (Internal Pipe Flow) ────────────────────────────────────
export const REFS_REYNOLDS: Reference[] = [
  {
    type: "journal",
    authors: "Reynolds, O.",
    year: "1883",
    title: "An experimental investigation of the circumstances which determine whether the motion of water shall be direct or sinuous, and of the law of resistance in parallel channels",
    source: "Philosophical Transactions of the Royal Society of London",
    details: "Vol. 174, pp. 935–982",
    note: "The original paper that defined the dimensionless ratio now named the Reynolds number and established the critical value separating laminar and turbulent flow.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed., Chapter 6 — Viscous Flow in Ducts",
    note: "Derivation of Re, regime thresholds for internal pipe flow, and effect of inlet disturbances on transition.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed., Chapter 8 — Viscous Flow in Pipes",
    note: "Covers Re definition, laminar-to-turbulent transition, and fully-developed pipe flow profiles.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Cimbala, J.M.",
    year: "2014",
    title: "Fluid Mechanics: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "3rd ed., Chapter 8 — Internal Flow",
    note: "Regime classification table and practical guidance on transition Reynolds numbers.",
  },
  {
    type: "book",
    authors: "Schlichting, H. & Gersten, K.",
    year: "2017",
    title: "Boundary Layer Theory",
    source: "Springer",
    details: "13th ed., Chapter 17 — Onset of Turbulence (Stability Theory)",
    note: "Theoretical treatment of laminar-turbulent transition and the critical Reynolds number in pipe flow.",
  },
  {
    type: "book",
    authors: "Fox, R.W., McDonald, A.T. & Pritchard, P.J.",
    year: "2011",
    title: "Introduction to Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "8th ed., Chapter 8 — Internal Incompressible Viscous Flow",
    note: "Re definition, flow regime thresholds, and entrance length correlations for pipe flow.",
  },
  {
    type: "online",
    authors: "National Institute of Standards and Technology (NIST)",
    year: "2023",
    title: "NIST Chemistry WebBook — Thermophysical Properties of Fluid Systems",
    source: "U.S. Department of Commerce",
    details: "https://webbook.nist.gov/chemistry/fluid/",
    note: "Source of fluid property data (density and dynamic viscosity) for water and air presets used in this calculator.",
  },
];

// ─── Fluid Properties at Temperature ─────────────────────────────────────────
// Calculator uses tabulated data explicitly sourced from Incropera Table A.4 (Air)
// and Table A.6 (Water) as noted in the source code comments.
export const REFS_FLUID_PROPERTIES: Reference[] = [
  {
    type: "book",
    authors: "Incropera, F.P., Dewitt, D.P., Bergman, T.L. & Lavine, A.S.",
    year: "2011",
    title: "Fundamentals of Heat and Mass Transfer",
    source: "John Wiley & Sons",
    details: "7th ed. — Table A.4 (Air properties) and Table A.6 (Water properties)",
    note: "Primary source of the tabulated thermophysical property data (density, dynamic viscosity, specific heat, thermal conductivity, Prandtl number) used in this calculator for air and water across the temperature range.",
  },
  {
    type: "online",
    authors: "National Institute of Standards and Technology (NIST)",
    year: "2023",
    title: "NIST Chemistry WebBook — Thermophysical Properties of Fluid Systems",
    source: "U.S. Department of Commerce, National Institute of Standards and Technology",
    details: "https://webbook.nist.gov/chemistry/fluid/",
    note: "Authoritative source for thermophysical properties of water, air, and engineering fluids. Used to cross-check tabulated values.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Appendix A: Physical Properties of Fluids",
    note: "Supplementary fluid property tables for viscosity, density, and surface tension at standard conditions.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Cimbala, J.M.",
    year: "2014",
    title: "Fluid Mechanics: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "3rd ed. — Appendix 1: Property Tables and Charts",
    note: "Fluid property appendices covering water, air, and common engineering fluids.",
  },
];

// ─── Hydrostatic Pressure ─────────────────────────────────────────────────────
// P = P₀ + ρgh  (pressure at depth h in a static, incompressible fluid)
export const REFS_HYDROSTATIC: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 2: Pressure Distribution in a Fluid",
    note: "Derivation of the hydrostatic equation P = P₀ + ρgh from the equilibrium of a fluid element, including manometry and pressure variation in compressible fluids.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 2: Fluid Statics",
    note: "Hydrostatic pressure equation, gauge vs. absolute pressure, and variation with depth for liquids and gases.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Cimbala, J.M.",
    year: "2014",
    title: "Fluid Mechanics: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "3rd ed. — Chapter 3: Pressure and Fluid Statics",
    note: "Practical applications of hydrostatic pressure in tanks, hydraulic systems, and atmospheric pressure calculations.",
  },
  {
    type: "book",
    authors: "Fox, R.W., McDonald, A.T. & Pritchard, P.J.",
    year: "2011",
    title: "Introduction to Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "8th ed. — Chapter 3: Fluid Statics",
    note: "Hydrostatic pressure distribution and absolute/gauge pressure conventions.",
  },
];

// ─── Buoyancy — Archimedes' Principle ────────────────────────────────────────
// F_b = ρ_fluid × g × V_displaced
export const REFS_BUOYANCY: Reference[] = [
  {
    type: "book",
    authors: "Heath, T.L. (translator)",
    year: "1897",
    title: "The Works of Archimedes — On Floating Bodies",
    source: "Cambridge University Press",
    note: "English translation of Archimedes' original treatise (~250 BCE) establishing the principle of buoyancy: a body immersed in a fluid experiences an upward force equal to the weight of fluid displaced.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 2: Hydrostatic Forces on Curved Surfaces; Buoyancy",
    note: "Modern derivation of Archimedes' principle from the hydrostatic pressure distribution on a submerged body.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 2: Fluid Statics — Buoyancy and Floatation",
    note: "Buoyancy force calculation, stability of floating bodies, and metacentric height.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Cimbala, J.M.",
    year: "2014",
    title: "Fluid Mechanics: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "3rd ed. — Chapter 3: Fluid Statics",
    note: "Buoyancy and stability of immersed and floating bodies with worked examples.",
  },
];

// ─── Manometer Pressure ───────────────────────────────────────────────────────
export const REFS_MANOMETER: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 2: Pressure Measurement — Manometers",
    note: "U-tube, differential, and inclined manometer analysis using the hydrostatic equation applied sequentially through fluid columns.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 2: Pressure Measurement",
    note: "Simple, differential, and inclined manometer configurations with solved examples.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Cimbala, J.M.",
    year: "2014",
    title: "Fluid Mechanics: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "3rd ed. — Chapter 3: Pressure Measurement Devices",
    note: "Barometers, manometers, and pressure gauges — working principles and calculation procedure.",
  },
];

// ─── Hydrostatic Force & Centre of Pressure ───────────────────────────────────
// F = ρg·h_c·A     y_cp = y_c + I_c/(y_c·A)
export const REFS_HYDROSTATIC_FORCE: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 2: Hydrostatic Forces on Plane Surfaces",
    note: "Resultant hydrostatic force on a plane surface (F = ρg·h_c·A), location of the centre of pressure using the second moment of area, and inclined surface treatment.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 2: Hydrostatic Force on a Plane Surface",
    note: "Centre of pressure formula y_cp = y_c + I_c/(y_c·A) and second moment of area for common shapes.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Cimbala, J.M.",
    year: "2014",
    title: "Fluid Mechanics: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "3rd ed. — Chapter 3: Hydrostatic Forces on Submerged Plane Surfaces",
    note: "Pressure prism method and resultant force location on rectangular and circular gate surfaces.",
  },
  {
    type: "book",
    authors: "Fox, R.W., McDonald, A.T. & Pritchard, P.J.",
    year: "2011",
    title: "Introduction to Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "8th ed. — Chapter 3: Fluid Statics",
    note: "Hydrostatic force on inclined planes and curved surfaces.",
  },
];

// ─── Surface Tension & Young-Laplace Equation ────────────────────────────────
// ΔP = 2σ/R (spherical droplet/bubble interface)
export const REFS_SURFACE_TENSION: Reference[] = [
  {
    type: "journal",
    authors: "Young, T.",
    year: "1805",
    title: "An essay on the cohesion of fluids",
    source: "Philosophical Transactions of the Royal Society of London",
    details: "Vol. 95, pp. 65–87",
    note: "Original paper establishing the theory of surface tension and the contact angle concept. The Young-Laplace equation for pressure difference across a curved interface is named partly for this work.",
  },
  {
    type: "book",
    authors: "Adamson, A.W. & Gast, A.P.",
    year: "1997",
    title: "Physical Chemistry of Surfaces",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 1: Capillarity",
    note: "Young-Laplace equation derivation, surface tension of common liquids, contact angle, and wetting phenomena.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 1: Surface Tension and Capillarity",
    note: "Pressure inside bubbles and droplets (ΔP = 2σ/R and ΔP = 4σ/R), contact angle, and surface tension values for common fluids.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 1: Surface Tension",
    note: "Physical origin of surface tension, Young-Laplace equation, and tabulated values for engineering fluids.",
  },
];

// ─── Capillary Rise — Jurin's Law ─────────────────────────────────────────────
// h = 4σ·cos θ / (ρ·g·D)
export const REFS_CAPILLARY_RISE: Reference[] = [
  {
    type: "journal",
    authors: "Jurin, J.",
    year: "1718",
    title: "An account of some experiments shown before the Royal Society; with an enquiry into the cause of the ascent and suspension of water in capillary tubes",
    source: "Philosophical Transactions of the Royal Society of London",
    details: "Vol. 30, pp. 739–747",
    note: "Original experimental paper establishing the inverse relationship between capillary tube diameter and rise height — now known as Jurin's Law.",
  },
  {
    type: "book",
    authors: "Adamson, A.W. & Gast, A.P.",
    year: "1997",
    title: "Physical Chemistry of Surfaces",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 1: Capillarity",
    note: "Derivation of the capillary rise equation h = 4σ·cos θ/(ρgD) from the Young-Laplace equation and force balance.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 1: Surface Tension and Capillarity",
    note: "Capillary rise formula and worked examples for water and mercury in glass tubes.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 1: Capillary Action",
    note: "Contact angle dependence of capillary rise direction (rise vs. depression) for wetting and non-wetting fluids.",
  },
];

// ─── Specific Gravity ─────────────────────────────────────────────────────────
export const REFS_SPECIFIC_GRAVITY: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 1: Density, Specific Weight, and Specific Gravity",
    note: "Definition of specific gravity (SG = ρ/ρ_ref) relative to water at 4°C (999.9 kg/m³ = 1000 kg/m³ for engineering purposes) and tabulated values for common fluids.",
  },
  {
    type: "standard",
    authors: "ASTM International",
    year: "2020",
    title: "Standard Test Method for Density, Relative Density, and API Gravity of Liquids by Digital Density Meter",
    source: "ASTM D4052",
    note: "Standard measurement method for specific gravity (relative density) of liquids. Defines the reference temperature (15°C or 20°C) and calibration procedures.",
  },
  {
    type: "standard",
    authors: "ASTM International",
    year: "2019",
    title: "Standard Test Method for Density and Relative Density of Liquids by Digital Density Meter",
    source: "ASTM D1298",
    note: "Hydrometer method for measuring specific gravity of petroleum and liquid petroleum products at standard reference conditions.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 1: Fluid Properties",
    note: "Specific gravity definition, standard reference fluids, and tabulated SG values for common engineering fluids.",
  },
];

// ─── Bulk Modulus of Compressibility ─────────────────────────────────────────
// K = -V(dP/dV) = ρ(dP/dρ)
export const REFS_BULK_MODULUS: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 1: Compressibility of Fluids",
    note: "Definition of bulk modulus K = -V(dP/dV) = ρ(dP/dρ), isentropic vs. isothermal bulk modulus, and tabulated values for water, mercury, and common liquids.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 1: Compressibility of Fluids",
    note: "Bulk modulus definition and significance for pressure wave (water hammer) analysis.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Cimbala, J.M.",
    year: "2014",
    title: "Fluid Mechanics: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "3rd ed. — Chapter 2: Properties of Fluids",
    note: "Coefficient of compressibility, speed of sound derivation from K, and practical significance for hydraulic systems.",
  },
];

// ─── Viscosity Conversion ─────────────────────────────────────────────────────
export const REFS_VISCOSITY_CONVERSION: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 1: Viscosity and Other Secondary Properties",
    note: "Definitions of dynamic viscosity μ (Pa·s), kinematic viscosity ν = μ/ρ (m²/s), and unit conversion between SI and traditional systems (cP, cSt, Saybolt SSU).",
  },
  {
    type: "standard",
    authors: "ASTM International",
    year: "2020",
    title: "Standard Test Method for Kinematic Viscosity of Transparent and Opaque Liquids (and Calculation of Dynamic Viscosity)",
    source: "ASTM D445",
    note: "Defines kinematic viscosity measurement in mm²/s (cSt) and conversion to dynamic viscosity using density. The reference standard for viscosity measurement in petroleum and chemical industries.",
  },
  {
    type: "standard",
    authors: "International Organization for Standardization",
    year: "2020",
    title: "Petroleum products — Transparent and opaque liquids — Determination of kinematic viscosity and calculation of dynamic viscosity",
    source: "ISO 3104",
    note: "ISO equivalent of ASTM D445 — kinematic viscosity measurement and conversion. Defines the centistokes (cSt) unit in SI context.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 1: Viscosity",
    note: "Newtonian and non-Newtonian fluid behaviour, Newton's law of viscosity, and viscosity-temperature relationships for liquids and gases.",
  },
];

// ─── Ideal Gas Density ────────────────────────────────────────────────────────
// ρ = P / (R_specific × T)  where R_specific = R_universal / M
export const REFS_IDEAL_GAS_DENSITY: Reference[] = [
  {
    type: "book",
    authors: "Cengel, Y.A. & Boles, M.A.",
    year: "2015",
    title: "Thermodynamics: An Engineering Approach",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 3: Properties of Pure Substances; Ideal Gas Equation of State",
    note: "Ideal gas law PV = mRT, specific gas constants for common gases, and compressibility factor Z for deviation from ideal behaviour.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 1: Equation of State — Ideal and Perfect Gas",
    note: "Ideal gas density ρ = P/(RT), specific gas constants, and the range of validity of the ideal gas assumption for engineering fluids.",
  },
  {
    type: "book",
    authors: "Moran, M.J., Shapiro, H.N., Boettner, D.D. & Bailey, M.B.",
    year: "2011",
    title: "Fundamentals of Engineering Thermodynamics",
    source: "John Wiley & Sons",
    details: "7th ed. — Chapter 3: Evaluating Properties — Ideal Gas Model",
    note: "Derivation of the ideal gas model from the equation of state, conditions for validity, and tabulated gas constants.",
  },
  {
    type: "online",
    authors: "National Institute of Standards and Technology (NIST)",
    year: "2023",
    title: "NIST Chemistry WebBook — Gas Phase Thermochemistry Data",
    source: "U.S. Department of Commerce, National Institute of Standards and Technology",
    details: "https://webbook.nist.gov/",
    note: "Source of molecular weights and specific gas constants (R) for the gas presets used in this calculator.",
  },
];

// ─── Metacentric Height & Vessel Stability ────────────────────────────────────
// GM = KB + BM − KG    BM = I_WL / ∇
export const REFS_METACENTRIC_HEIGHT: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 2: Stability of Floating Bodies",
    note: "Metacentric height GM = KB + BM − KG, second moment of waterplane area (BM = I_WL/∇), and stability criteria (GM > 0 for stable equilibrium).",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 2: Rigid-Body Motion — Floatation and Stability",
    note: "Metacentric height calculation and the righting moment for small angles of heel.",
  },
  {
    type: "book",
    authors: "Newman, J.N.",
    year: "1977",
    title: "Marine Hydrodynamics",
    source: "MIT Press",
    details: "Chapter 3: Floating Bodies",
    note: "Metacentric height, transverse and longitudinal stability, and the derivation of BM for ships and floating structures. A standard naval architecture reference.",
  },
  {
    type: "book",
    authors: "Lewis, E.V. (Ed.)",
    year: "1988",
    title: "Principles of Naval Architecture — Volume I: Stability and Strength",
    source: "Society of Naval Architects and Marine Engineers (SNAME)",
    details: "2nd revision",
    note: "Authoritative SNAME reference for stability calculations including metacentric height, GZ curves, and intact stability criteria.",
  },
];

// ════════════════════════════════════════════════════════════════════════════════
// FLOW ESSENTIALS (fluid-mechanics-ii)
// ════════════════════════════════════════════════════════════════════════════════

// ─── Minor Losses (K-factors for fittings, valves, bends) ────────────────────
export const REFS_MINOR_LOSSES: Reference[] = [
  {
    type: "book",
    authors: "Idelchik, I.E.",
    year: "1994",
    title: "Handbook of Hydraulic Resistance",
    source: "Begell House, New York",
    details: "3rd ed.",
    note: "The authoritative reference for loss coefficients K for pipe fittings, bends, valves, expansions, contractions, and tee junctions — comprehensive tabulated data for hundreds of geometries.",
  },
  {
    type: "report",
    authors: "Crane Co.",
    year: "2011",
    title: "Flow of Fluids Through Valves, Fittings, and Pipe",
    source: "Technical Paper No. 410. Crane Co., Stamford, CT",
    note: "Industry-standard reference for equivalent length (L/D) and resistance coefficient K for common pipe fittings and valves. Used by piping engineers worldwide.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 6: Minor Losses in Pipe Systems",
    note: "Loss coefficient tables for bends, expansions, contractions, entrances, and exits. Derives K from energy equation.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 8: Losses in Pipe Systems",
    note: "Minor loss coefficients for common fittings, sudden expansion formula (Borda-Carnot), and combined system head loss calculation.",
  },
];

// ─── Pump Power (Hydraulic and Shaft Power) ───────────────────────────────────
// P_hydraulic = ρgQH     P_shaft = P_hydraulic / η
export const REFS_PUMP_POWER: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 11: Turbomachinery",
    note: "Hydraulic power P = ρgQH, shaft power, overall pump efficiency η = η_hydraulic × η_mechanical × η_volumetric.",
  },
  {
    type: "book",
    authors: "Gülich, J.F.",
    year: "2010",
    title: "Centrifugal Pumps",
    source: "Springer",
    details: "2nd ed. — Chapter 3: Pump Performance",
    note: "Detailed breakdown of pump power components and efficiency definitions used in centrifugal pump selection.",
  },
  {
    type: "standard",
    authors: "Hydraulic Institute",
    year: "2014",
    title: "ANSI/HI 1.1-1.5: Centrifugal Pumps — Nomenclature, Definitions, Application and Operation",
    source: "Hydraulic Institute, Parsippany, NJ",
    note: "Standard definitions of pump power, efficiency, and performance testing methods.",
  },
];

// ─── Hagen-Poiseuille Flow (Laminar Pipe Flow) ────────────────────────────────
// Q = πD⁴ΔP / (128μL)     u(r) = (ΔP/4μL)(R²-r²)
export const REFS_POISEUILLE: Reference[] = [
  {
    type: "journal",
    authors: "Hagen, G.H.L.",
    year: "1839",
    title: "Über die Bewegung des Wassers in engen cylindrischen Röhren",
    source: "Annalen der Physik und Chemie",
    details: "Vol. 46, pp. 423–442",
    note: "First experimental demonstration that laminar flow rate in a tube is proportional to the fourth power of the radius and the pressure gradient.",
  },
  {
    type: "journal",
    authors: "Poiseuille, J.L.M.",
    year: "1840",
    title: "Recherches expérimentales sur le mouvement des liquides dans les tubes de très-petits diamètres",
    source: "Comptes Rendus de l'Académie des Sciences",
    details: "Vol. 11, pp. 961–967",
    note: "Independent experimental derivation of the viscous flow law in narrow tubes — the parallel work for which the Hagen-Poiseuille equation is named.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 6: Laminar Fully Developed Pipe Flow",
    note: "Analytical derivation of the parabolic velocity profile, Poiseuille flow rate formula, and friction factor f = 64/Re.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 8: Fully Developed Laminar Flow",
    note: "Parabolic velocity profile, wall shear stress, and pressure drop in Hagen-Poiseuille flow.",
  },
];

// ─── Orifice Flow Rate ────────────────────────────────────────────────────────
// Q = Cd·A_o·√(2ΔP/ρ)
export const REFS_ORIFICE_FLOW_RATE: Reference[] = [
  {
    type: "standard",
    authors: "International Organization for Standardization",
    year: "2003",
    title: "Measurement of fluid flow by means of pressure differential devices — Part 2: Orifice plates",
    source: "ISO 5167-2",
    note: "Discharge coefficient equation, beta ratio limits, and flow rate calculation for sharp-edged orifice plates.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 3: Flow Measurement",
    note: "Orifice plate flow equation derived from Bernoulli and continuity, discharge coefficient values, and vena contracta.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 8: Flow Measurement — Orifice Meter",
    note: "Practical orifice meter design, pressure tap locations (flange, vena contracta, pipe taps), and Cd correction.",
  },
];

// ─── Venturi Flow Rate ────────────────────────────────────────────────────────
// Q = Cd·A_throat·√(2ΔP / (ρ(1-β⁴)))
export const REFS_VENTURI_FLOW: Reference[] = [
  {
    type: "standard",
    authors: "International Organization for Standardization",
    year: "2003",
    title: "Measurement of fluid flow by means of pressure differential devices — Part 4: Venturi tubes",
    source: "ISO 5167-4",
    note: "Discharge coefficient, geometry specifications, and flow rate equation for classical Venturi tubes and short-form Venturis.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 3: Venturi Meter",
    note: "Derivation of the Venturi flow equation from Bernoulli's principle and the continuity equation. Compares Venturi with orifice and flow nozzle.",
  },
  {
    type: "book",
    authors: "Miller, R.W.",
    year: "1996",
    title: "Flow Measurement Engineering Handbook",
    source: "McGraw-Hill",
    details: "3rd ed.",
    note: "Comprehensive Venturi meter data including discharge coefficients for classical, Dall, and insertion Venturis.",
  },
];

// ─── Drag Force on a Sphere ───────────────────────────────────────────────────
// F_D = C_D · ½ρV²A
export const REFS_DRAG_SPHERE: Reference[] = [
  {
    type: "book",
    authors: "Clift, R., Grace, J.R. & Weber, M.E.",
    year: "1978",
    title: "Bubbles, Drops and Particles",
    source: "Academic Press, New York",
    note: "The definitive reference for drag coefficient correlations on spheres across all flow regimes (Stokes, intermediate, Newton). Comprehensive C_D vs Re data.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 7: External Viscous Flow — Drag on Spheres",
    note: "Sphere drag coefficient curve C_D(Re) from creeping flow through Newton's regime (Re > 1000, C_D ≈ 0.44).",
  },
  {
    type: "book",
    authors: "Schlichting, H. & Gersten, K.",
    year: "2017",
    title: "Boundary Layer Theory",
    source: "Springer",
    details: "13th ed. — Chapter 1: Fluid Drag",
    note: "Theoretical treatment of flow around spheres and cylinders, drag coefficient, and wake formation.",
  },
];

// ─── Stokes' Law (Creeping Flow Drag) ────────────────────────────────────────
// F_D = 3πμVD    (valid for Re_p << 1)
export const REFS_STOKES_LAW: Reference[] = [
  {
    type: "journal",
    authors: "Stokes, G.G.",
    year: "1851",
    title: "On the effect of the internal friction of fluids on the motion of pendulums",
    source: "Transactions of the Cambridge Philosophical Society",
    details: "Vol. 9, pp. 8–106",
    note: "Original derivation of the creeping flow drag force F = 3πμVD (Stokes drag) for a sphere moving slowly through a viscous fluid — the basis of Stokes' settling velocity law.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 7: Stokes' Law — Creeping Flow",
    note: "Derivation of Stokes drag, C_D = 24/Re for Re << 1, and validity range for the creeping-flow approximation.",
  },
  {
    type: "book",
    authors: "Clift, R., Grace, J.R. & Weber, M.E.",
    year: "1978",
    title: "Bubbles, Drops and Particles",
    source: "Academic Press, New York",
    note: "Stokes settling velocity, corrections for particle shape and wall effects, and the transition from Stokes to intermediate drag regimes.",
  },
];

// ─── Weber Number ─────────────────────────────────────────────────────────────
// We = ρV²L / σ  (ratio of inertial to surface tension forces)
export const REFS_WEBER_NUMBER: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 5: Dimensional Analysis and Similarity",
    note: "Weber number definition, physical interpretation (inertia vs. surface tension), and applications in droplet breakup, atomisation, and thin-film flow.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 7: Dimensional Analysis, Similitude, and Modeling",
    note: "Weber number in the context of dimensional analysis — significance for free-surface flows and liquid jets.",
  },
  {
    type: "book",
    authors: "Bergman, T.L., Lavine, A.S., Incropera, F.P. & Dewitt, D.P.",
    year: "2011",
    title: "Fundamentals of Heat and Mass Transfer",
    source: "John Wiley & Sons",
    details: "7th ed. — Chapter 10: Boiling and Condensation",
    note: "Weber number in droplet dynamics and vapour bubble departure — surface tension effects at liquid-vapour interfaces.",
  },
];

// ─── Flow Coefficient Cv / Kv ─────────────────────────────────────────────────
export const REFS_FLOW_COEFFICIENT: Reference[] = [
  {
    type: "standard",
    authors: "International Electrotechnical Commission",
    year: "2011",
    title: "Industrial-process control valves — Part 2-1: Flow capacity — Sizing equations for fluid flow under installed conditions",
    source: "IEC 60534-2-1",
    note: "Defines Kv (m³/h at 1 bar drop) and Cv (US gal/min at 1 psi drop), conversion between them (Cv = 1.156·Kv), and flow equations for liquids, gases, and steam.",
  },
  {
    type: "standard",
    authors: "International Society of Automation",
    year: "2012",
    title: "Flow Equations for Sizing Control Valves",
    source: "ANSI/ISA-75.01.01",
    note: "ISA companion to IEC 60534-2-1. Defines Cv and flow equations for incompressible and compressible fluid service.",
  },
  {
    type: "book",
    authors: "Baumann, H.D.",
    year: "1998",
    title: "Control Valve Primer: A User's Guide",
    source: "ISA — The Instrumentation, Systems, and Automation Society",
    details: "3rd ed.",
    note: "Practical Cv/Kv application, conversion factors, cavitation, flashing, and choked flow in control valves.",
  },
];

// ─── Discharge Coefficient Cd ─────────────────────────────────────────────────
export const REFS_DISCHARGE_COEFF: Reference[] = [
  {
    type: "standard",
    authors: "International Organization for Standardization",
    year: "2003",
    title: "Measurement of fluid flow by means of pressure differential devices — Part 1: General principles and requirements",
    source: "ISO 5167-1",
    note: "Defines the discharge coefficient Cd for differential pressure devices and establishes calibration requirements and uncertainty analysis.",
  },
  {
    type: "book",
    authors: "Miller, R.W.",
    year: "1996",
    title: "Flow Measurement Engineering Handbook",
    source: "McGraw-Hill",
    details: "3rd ed.",
    note: "Discharge coefficient data for orifice plates, nozzles, venturis, and other differential pressure devices across a wide Reynolds number range.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 3",
    note: "Physical meaning of Cd (actual vs. theoretical flow), effect of Reynolds number, and vena contracta contraction coefficient Cc.",
  },
];

// ─── Pressure Recovery Coefficient ───────────────────────────────────────────
// Cp = (P₂ − P₁) / (½ρV₁²)
export const REFS_PRESSURE_RECOVERY: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 6: Diffusers and Pressure Recovery",
    note: "Pressure recovery coefficient Cp in diffusers, sudden expansions (Borda-Carnot), and converging-diverging ducts.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 8: Head Loss in Expansions",
    note: "Pressure recovery and head loss in sudden and gradual expansions.",
  },
  {
    type: "book",
    authors: "Çengel, Y.A. & Cimbala, J.M.",
    year: "2014",
    title: "Fluid Mechanics: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "3rd ed. — Chapter 8: Losses in Piping Systems",
    note: "Loss coefficients for expansions and the Borda-Carnot equation for sudden expansion head loss.",
  },
];

// ─── Euler Number ─────────────────────────────────────────────────────────────
// Eu = ΔP / (½ρV²)
export const REFS_EULER_NUMBER: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 5: Dimensional Analysis",
    note: "Euler number as a dimensionless pressure difference (= 2·Cp), its role in pressure-driven flow similarity, and relation to the drag/loss coefficient.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 7: Dimensional Analysis and Similitude",
    note: "Euler number in the Buckingham π theorem and its significance in model-prototype scaling for pressure-dominated flows.",
  },
];

// ─── Strouhal Number (Vortex Shedding) ───────────────────────────────────────
// St = f·L / V
export const REFS_STROUHAL_NUMBER: Reference[] = [
  {
    type: "journal",
    authors: "Strouhal, V.",
    year: "1878",
    title: "Über eine besondere Art der Tonerregung",
    source: "Annalen der Physik und Chemie, Neue Folge",
    details: "Vol. 5, pp. 216–251",
    note: "Original experimental paper establishing the relationship between vortex shedding frequency, flow velocity, and wire diameter — the basis of the Strouhal number.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 7: Bluff Body Drag and Vortex Shedding",
    note: "Strouhal number for cylinders (St ≈ 0.2 for 100 < Re < 2×10⁵), Kármán vortex street, and flow-induced vibration implications.",
  },
  {
    type: "book",
    authors: "Schlichting, H. & Gersten, K.",
    year: "2017",
    title: "Boundary Layer Theory",
    source: "Springer",
    details: "13th ed. — Chapter 4: General Properties of the Boundary Layer Equations",
    note: "Strouhal number in the context of unsteady flows and vortex shedding from bluff bodies.",
  },
];

// ─── Non-Circular Duct (Hydraulic Diameter) ───────────────────────────────────
// D_h = 4A / P_wet
export const REFS_NON_CIRCULAR_DUCT: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 6: Non-Circular Ducts",
    note: "Hydraulic diameter concept D_h = 4A/P, limitations for laminar flow (shape factor correction), and friction factor correlation accuracy for turbulent flow in rectangular, annular, and triangular ducts.",
  },
  {
    type: "book",
    authors: "Shah, R.K. & London, A.L.",
    year: "1978",
    title: "Laminar Flow Forced Convection in Ducts",
    source: "Academic Press, New York",
    details: "Supplement 1 to Advances in Heat Transfer",
    note: "The comprehensive reference for laminar flow friction factors and Nusselt numbers in non-circular ducts — covers rectangular, elliptical, triangular, and annular geometries with exact shape factors.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Cimbala, J.M.",
    year: "2014",
    title: "Fluid Mechanics: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "3rd ed. — Chapter 8: Internal Flow in Non-Circular Ducts",
    note: "Hydraulic diameter application, accuracy range for turbulent flow, and duct shape factor tables.",
  },
];

// ─── Lift Force ───────────────────────────────────────────────────────────────
// L = C_L · ½ρV²A
export const REFS_LIFT_FORCE: Reference[] = [
  {
    type: "book",
    authors: "Abbott, I.H. & von Doenhoff, A.E.",
    year: "1959",
    title: "Theory of Wing Sections: Including a Summary of Airfoil Data",
    source: "Dover Publications, New York",
    note: "The standard reference for NACA airfoil lift and drag coefficient data (C_L, C_D) across angle of attack. Tabulated data for over 50 standard NACA profiles.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 8: External Flows — Lift and Drag",
    note: "Lift coefficient definition, induced drag, thin airfoil theory (C_L ≈ 2π·α), and finite wing corrections.",
  },
  {
    type: "book",
    authors: "Anderson, J.D.",
    year: "2010",
    title: "Fundamentals of Aerodynamics",
    source: "McGraw-Hill Education",
    details: "5th ed. — Chapter 4: Incompressible Flow Over Airfoils",
    note: "Kutta-Joukowski theorem, lift coefficient derivation, and effect of camber and angle of attack on C_L.",
  },
];

// ─── Boundary Layer (Blasius Solution) ───────────────────────────────────────
// δ/x = 5.0/√Re_x   (laminar, flat plate, zero pressure gradient)
export const REFS_BOUNDARY_LAYER: Reference[] = [
  {
    type: "journal",
    authors: "Blasius, H.",
    year: "1908",
    title: "Grenzschichten in Flüssigkeiten mit kleiner Reibung",
    source: "Zeitschrift für Mathematik und Physik",
    details: "Vol. 56, pp. 1–37",
    note: "The foundational paper solving the laminar flat-plate boundary layer problem — derives the Blasius velocity profile, boundary layer thickness δ/x = 5.0/√Re_x, and wall shear stress.",
  },
  {
    type: "book",
    authors: "Schlichting, H. & Gersten, K.",
    year: "2017",
    title: "Boundary Layer Theory",
    source: "Springer",
    details: "13th ed. — Chapter 7: Boundary Layer Equations in Two-Dimensional Flow",
    note: "Complete treatment of the Blasius boundary layer, displacement and momentum thickness, and turbulent boundary layer correlations (1/7 power law, log-law).",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 7: External Viscous Flow — Flat Plate",
    note: "Blasius solution summary, turbulent boundary layer (δ/x = 0.16/Re_x^(1/7)), and transition from laminar to turbulent boundary layer.",
  },
  {
    type: "book",
    authors: "Anderson, J.D.",
    year: "2010",
    title: "Fundamentals of Aerodynamics",
    source: "McGraw-Hill Education",
    details: "5th ed. — Chapter 17: Viscous Flow",
    note: "Boundary layer displacement thickness, skin friction coefficient, and total drag from boundary layer theory.",
  },
];

// ─── Momentum Flux / Correction Factor ───────────────────────────────────────
// β = (1/A)∫(u/V_avg)²dA     β_laminar = 4/3,  β_turbulent ≈ 1.02–1.05
export const REFS_MOMENTUM_FLUX: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 3: Integral Relations — Momentum Equation",
    note: "Momentum correction factor β = (1/A)∫(u/V)² dA; values for parabolic laminar profile (β = 4/3), turbulent 1/7 power law profile, and uniform flow (β = 1).",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 5: Finite Control Volume Analysis — Momentum Equation",
    note: "Momentum and energy correction factors for non-uniform velocity profiles in pipe flow.",
  },
];

// ─── Control Volume Force (Momentum Equation) ────────────────────────────────
// ΣF = ṁ_out·V_out − ṁ_in·V_in  (steady, 1D flow, uniform profile)
export const REFS_CONTROL_VOLUME_FORCE: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 3: Integral Relations for a Control Volume",
    note: "Linear momentum equation applied to pipe bends, nozzles, pipe contractions, and thrust forces. Derivation from Reynolds Transport Theorem.",
  },
  {
    type: "book",
    authors: "Fox, R.W., McDonald, A.T. & Pritchard, P.J.",
    year: "2011",
    title: "Introduction to Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "8th ed. — Chapter 4: Basic Equations in Integral Form for a Control Volume",
    note: "Systematic control volume approach to force calculations for pipe elbows, nozzles, and reducing sections.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 5: Finite Control Volume Analysis",
    note: "Momentum equation examples including pipe bends, moving vanes, and rocket propulsion.",
  },
];

// ─── Vortex Flow (Free and Forced) ───────────────────────────────────────────
// Free vortex: V·r = Γ/(2π) = const   Forced vortex: V = ω·r
export const REFS_VORTEX_FLOW: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 4: Differential Relations for Fluid Flow — Irrotational Flow; Chapter 2: Free Vortex Surface Profile",
    note: "Free vortex (irrotational, Γ = V·r = const), forced vortex (solid-body rotation, ω = const), and combined Rankine vortex model.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 6: Differential Analysis of Fluid Flow — Rotation and Vorticity",
    note: "Vorticity definition, free and forced vortex pressure distribution, and the bathtub vortex example.",
  },
  {
    type: "book",
    authors: "Batchelor, G.K.",
    year: "1967",
    title: "An Introduction to Fluid Dynamics",
    source: "Cambridge University Press",
    details: "Chapter 7: Rotational Flow",
    note: "Rigorous treatment of vortex dynamics, vorticity transport, and Kelvin's circulation theorem — the theoretical foundation for vortex flow analysis.",
  },
];

// ─── Swirl Number ─────────────────────────────────────────────────────────────
// S = G_θ / (G_x · R)   (ratio of tangential to axial momentum flux, normalised by R)
export const REFS_SWIRL_NUMBER: Reference[] = [
  {
    type: "book",
    authors: "Gupta, A.K., Lilley, D.G. & Syred, N.",
    year: "1984",
    title: "Swirl Flows",
    source: "Abacus Press, Tunbridge Wells, UK",
    note: "The primary reference for swirl number definition, measurement, and effects on combustion, recirculation zones, and flame stability in swirl burners.",
  },
  {
    type: "book",
    authors: "Beer, J.M. & Chigier, N.A.",
    year: "1972",
    title: "Combustion Aerodynamics",
    source: "Applied Science Publishers, London",
    note: "Swirl number in reacting flows, central recirculation zone formation, and swirl burner design — foundational combustion engineering reference.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 3: Angular Momentum Equation",
    note: "Angular momentum flux analysis — the theoretical basis for computing the swirl number from velocity profiles.",
  },
];

// ─── Energy Loss (Bernoulli with Head Loss Term) ──────────────────────────────
// P₁/ρg + V₁²/2g + z₁ = P₂/ρg + V₂²/2g + z₂ + h_L
export const REFS_ENERGY_LOSS: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 6: Energy Equation with Head Loss",
    note: "Extended Bernoulli equation with head loss h_L, head added by pump h_p, and head extracted by turbine h_t. Derivation from first law of thermodynamics for steady flow.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 5: Energy Equation",
    note: "Energy equation including shaft work, heat transfer, and head losses. Relationship between the energy equation and Bernoulli's equation.",
  },
  {
    type: "book",
    authors: "Fox, R.W., McDonald, A.T. & Pritchard, P.J.",
    year: "2011",
    title: "Introduction to Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "8th ed. — Chapter 8: Internal Incompressible Viscous Flow",
    note: "Pipe system energy analysis, combination of major (friction) and minor losses in the energy equation.",
  },
];

// ─── Pipe Head Loss (Darcy-Weisbach) ─────────────────────────────────────────
export const REFS_PIPE_HEAD_LOSS: Reference[] = [
  {
    type: "book",
    authors: "Darcy, H.",
    year: "1857",
    title: "Recherches expérimentales relatives au mouvement de l'eau dans les tuyaux",
    source: "Mallet-Bachelier, Paris",
    note: "Original experimental work establishing the pipe friction head loss formula (Darcy-Weisbach equation).",
  },
  {
    type: "journal",
    authors: "Colebrook, C.F.",
    year: "1939",
    title: "Turbulent flow in pipes, with particular reference to the transition region between the smooth and rough pipe laws",
    source: "Journal of the Institution of Civil Engineers",
    details: "Vol. 11, No. 4, pp. 133–156",
    note: "Derivation of the Colebrook-White implicit equation for the Darcy friction factor.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed., Chapter 6 — Viscous Flow in Ducts",
    note: "Darcy-Weisbach equation, Colebrook-White friction factor, and Moody diagram.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Cimbala, J.M.",
    year: "2014",
    title: "Fluid Mechanics: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "3rd ed., Chapter 8 — Internal Flow",
    note: "Friction factors, major and minor losses, and head loss calculations.",
  },
  {
    type: "standard",
    authors: "American Society of Mechanical Engineers (ASME)",
    year: "2018",
    title: "Measurement of Fluid Flow in Pipes Using Orifice, Nozzle, and Venturi",
    source: "ASME MFC-3M",
    note: "Provides context for pressure drop measurement methods referenced by the Darcy-Weisbach equation.",
  },
];

// ─── Colebrook-White / Friction Factor ───────────────────────────────────────
export const REFS_FRICTION_FACTOR: Reference[] = [
  {
    type: "journal",
    authors: "Colebrook, C.F.",
    year: "1939",
    title: "Turbulent flow in pipes, with particular reference to the transition region between the smooth and rough pipe laws",
    source: "Journal of the Institution of Civil Engineers",
    details: "Vol. 11, No. 4, pp. 133–156",
    note: "Original derivation of the Colebrook-White equation for turbulent pipe friction.",
  },
  {
    type: "journal",
    authors: "Moody, L.F.",
    year: "1944",
    title: "Friction factors for pipe flow",
    source: "Transactions of the ASME",
    details: "Vol. 66, pp. 671–684",
    note: "The Moody diagram — graphical representation of the Colebrook-White equation used in all pipe flow calculations.",
  },
  {
    type: "journal",
    authors: "Swamee, P.K. & Jain, A.K.",
    year: "1976",
    title: "Explicit equations for pipe-flow problems",
    source: "Journal of the Hydraulics Division, ASCE",
    details: "Vol. 102, No. 5, pp. 657–664",
    note: "Explicit approximation to Colebrook-White (Swamee-Jain equation), accurate to within 3% across the full turbulent range.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed., Chapter 6",
    note: "Comprehensive treatment of friction factor correlations, roughness data, and the Moody diagram.",
  },
];

// ─── Moody Chart ─────────────────────────────────────────────────────────────
export const REFS_MOODY: Reference[] = [
  {
    type: "journal",
    authors: "Moody, L.F.",
    year: "1944",
    title: "Friction factors for pipe flow",
    source: "Transactions of the ASME",
    details: "Vol. 66, pp. 671–684",
    note: "Original publication of the Moody diagram — the definitive chart relating friction factor, Reynolds number, and relative roughness.",
  },
  {
    type: "journal",
    authors: "Colebrook, C.F.",
    year: "1939",
    title: "Turbulent flow in pipes, with particular reference to the transition region between the smooth and rough pipe laws",
    source: "Journal of the Institution of Civil Engineers",
    details: "Vol. 11, No. 4, pp. 133–156",
    note: "The implicit equation plotted by the Moody diagram.",
  },
  {
    type: "journal",
    authors: "Nikuradse, J.",
    year: "1933",
    title: "Strömungsgesetze in rauhen Rohren (Laws of flow in rough pipes)",
    source: "VDI-Forschungsheft",
    details: "No. 361; English translation: NACA TM 1292 (1950)",
    note: "Experimental data for rough-pipe friction factors that form the basis of the Moody diagram roughness curves.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed., Chapter 6",
  },
];

// ─── Pump Head / Euler Turbomachinery ─────────────────────────────────────────
export const REFS_PUMP_HEAD: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed., Chapter 11 — Turbomachinery",
    note: "Euler turbomachine equation, pump head, and specific speed.",
  },
  {
    type: "book",
    authors: "Kaplan, A., Streeter, V.L. & Wylie, E.B.",
    year: "1993",
    title: "Fluid Transients in Systems",
    source: "Prentice Hall",
    note: "Pump head-flow relationships and system curve analysis.",
  },
  {
    type: "book",
    authors: "Gülich, J.F.",
    year: "2010",
    title: "Centrifugal Pumps",
    source: "Springer",
    details: "2nd ed.",
    note: "Comprehensive treatment of pump hydraulics, head-flow curves, and cavitation — the primary reference for pump design and selection.",
  },
  {
    type: "standard",
    authors: "Hydraulic Institute",
    year: "2014",
    title: "Pump Standards — ANSI/HI 1.1-1.5: Centrifugal Pumps",
    source: "Hydraulic Institute, Parsippany, NJ",
    note: "Industry standards for pump nomenclature, definitions, and performance testing.",
  },
];

// ─── NPSH ─────────────────────────────────────────────────────────────────────
export const REFS_NPSH: Reference[] = [
  {
    type: "book",
    authors: "Gülich, J.F.",
    year: "2010",
    title: "Centrifugal Pumps",
    source: "Springer",
    details: "2nd ed., Chapter 6 — Suction Capability and Cavitation",
    note: "NPSH definition, NPSH₃ test method, and NPSH margin recommendations.",
  },
  {
    type: "standard",
    authors: "Hydraulic Institute",
    year: "2014",
    title: "ANSI/HI 1.1-1.5: Centrifugal Pumps — Nomenclature, Definitions, Application and Operation",
    source: "Hydraulic Institute, Parsippany, NJ",
    note: "Defines NPSH available (NPSHA) and NPSH required (NPSHR) with calculation procedures.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Cimbala, J.M.",
    year: "2014",
    title: "Fluid Mechanics: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "3rd ed., Chapter 14 — Turbomachinery",
    note: "Cavitation number, NPSH definition, and practical pump selection guidance.",
  },
];

// ─── Bernoulli / Energy Equation ─────────────────────────────────────────────
export const REFS_BERNOULLI: Reference[] = [
  {
    type: "book",
    authors: "Bernoulli, D.",
    year: "1738",
    title: "Hydrodynamica",
    source: "Johann Reinhold Dulsecker, Strasbourg",
    note: "Original work containing the energy conservation principle for fluid flow now known as Bernoulli's equation.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed., Chapter 3 — Integral Relations for a Control Volume",
    note: "Derivation of Bernoulli's equation from the energy equation with assumptions and limitations.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed., Chapter 3 — Elementary Fluid Dynamics — The Bernoulli Equation",
    note: "Applications of Bernoulli's equation including pitot tubes, orifices, and venturi meters.",
  },
];

// ─── Manning's Equation / Open Channel Flow ───────────────────────────────────
export const REFS_MANNINGS: Reference[] = [
  {
    type: "journal",
    authors: "Manning, R.",
    year: "1891",
    title: "On the flow of water in open channels and pipes",
    source: "Transactions of the Institution of Civil Engineers of Ireland",
    details: "Vol. 20, pp. 161–207",
    note: "Original paper presenting the Manning roughness formula for open channel flow.",
  },
  {
    type: "book",
    authors: "Chaudhry, M.H.",
    year: "2008",
    title: "Open-Channel Hydraulics",
    source: "Springer",
    details: "2nd ed., Chapter 2 — Energy and Momentum Principles",
    note: "Manning's equation, roughness coefficients, and normal depth calculation.",
  },
  {
    type: "book",
    authors: "Henderson, F.M.",
    year: "1966",
    title: "Open Channel Flow",
    source: "Macmillan, New York",
    note: "Classic reference for uniform and non-uniform open channel hydraulics.",
  },
  {
    type: "book",
    authors: "Chow, V.T.",
    year: "1959",
    title: "Open-Channel Hydraulics",
    source: "McGraw-Hill, New York",
    note: "Comprehensive tables of Manning's n values and design charts for open channels — widely used in South African engineering practice.",
  },
];

// ─── Hazen-Williams ───────────────────────────────────────────────────────────
export const REFS_HAZEN_WILLIAMS: Reference[] = [
  {
    type: "book",
    authors: "Williams, G.S. & Hazen, A.",
    year: "1905",
    title: "Hydraulic Tables",
    source: "John Wiley & Sons, New York",
    note: "Original publication of the Hazen-Williams empirical friction loss formula for water in pipes.",
  },
  {
    type: "book",
    authors: "Mays, L.W.",
    year: "2011",
    title: "Water Resources Engineering",
    source: "John Wiley & Sons",
    details: "2nd ed., Chapter 2",
    note: "Hazen-Williams coefficient tables and application to municipal water distribution systems.",
  },
];

// ─── Pump Affinity Laws ────────────────────────────────────────────────────────
export const REFS_AFFINITY_LAWS: Reference[] = [
  {
    type: "book",
    authors: "Gülich, J.F.",
    year: "2010",
    title: "Centrifugal Pumps",
    source: "Springer",
    details: "2nd ed., Chapter 3 — Pump Types and Performance Data",
    note: "Derivation of the affinity (similarity) laws from dimensional analysis and limitations due to Reynolds number effects.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed., Chapter 11 — Turbomachinery",
    note: "Affinity laws for pumps and fans, dimensional analysis of turbomachinery.",
  },
  {
    type: "standard",
    authors: "Hydraulic Institute",
    year: "2014",
    title: "ANSI/HI 1.1-1.5: Centrifugal Pumps",
    source: "Hydraulic Institute, Parsippany, NJ",
    note: "Defines pump similarity laws and specific speed in the context of pump selection and performance correction.",
  },
];

// ─── Orifice Flow / Venturi Flow ──────────────────────────────────────────────
export const REFS_ORIFICE_FLOW: Reference[] = [
  {
    type: "standard",
    authors: "International Organization for Standardization",
    year: "2003",
    title: "Measurement of fluid flow by means of pressure differential devices inserted in circular cross-section conduits running full — Part 1: General principles and requirements",
    source: "ISO 5167-1",
    note: "Fundamental standard governing orifice plates, venturi tubes, and flow nozzles for flow measurement.",
  },
  {
    type: "standard",
    authors: "International Organization for Standardization",
    year: "2003",
    title: "Measurement of fluid flow by means of pressure differential devices — Part 2: Orifice plates",
    source: "ISO 5167-2",
    note: "Discharge coefficient equations (Reader-Harris/Gallagher) and geometry specifications for orifice plates.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed., Chapter 3",
    note: "Flow measurement using pressure differential devices, discharge coefficients.",
  },
];

// ─── Water Hammer ─────────────────────────────────────────────────────────────
export const REFS_WATER_HAMMER: Reference[] = [
  {
    type: "book",
    authors: "Wylie, E.B. & Streeter, V.L.",
    year: "1993",
    title: "Fluid Transients in Systems",
    source: "Prentice Hall",
    note: "The principal reference text for water hammer — method of characteristics, wave speed calculation, and surge control.",
  },
  {
    type: "book",
    authors: "Chaudhry, M.H.",
    year: "2014",
    title: "Applied Hydraulic Transients",
    source: "Springer",
    details: "3rd ed.",
    note: "Joukowsky equation, pressure wave analysis, and protection measures for pressure transients in pipe systems.",
  },
];

// ─── Normal Shock Relations ───────────────────────────────────────────────────
export const REFS_NORMAL_SHOCK: Reference[] = [
  {
    type: "book",
    authors: "Anderson, J.D.",
    year: "2003",
    title: "Modern Compressible Flow: With Historical Perspective",
    source: "McGraw-Hill",
    details: "3rd ed., Chapter 3 — Normal Shock Wave Relations",
    note: "Complete derivation of normal shock relations from conservation equations.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed., Chapter 9 — Compressible Duct Flow",
  },
  {
    type: "book",
    authors: "Shapiro, A.H.",
    year: "1953",
    title: "The Dynamics and Thermodynamics of Compressible Fluid Flow",
    source: "Ronald Press, New York",
    details: "Vol. 1",
    note: "The classic compressible flow reference — derivation of all isentropic and shock relations.",
  },
];

// ─── Isentropic Relations ─────────────────────────────────────────────────────
export const REFS_ISENTROPIC: Reference[] = [
  {
    type: "book",
    authors: "Anderson, J.D.",
    year: "2003",
    title: "Modern Compressible Flow: With Historical Perspective",
    source: "McGraw-Hill",
    details: "3rd ed., Chapter 1 — Compressible Flow — Some History and Introductory Thoughts",
    note: "Derivation of isentropic flow relations for ideal gases.",
  },
  {
    type: "book",
    authors: "Shapiro, A.H.",
    year: "1953",
    title: "The Dynamics and Thermodynamics of Compressible Fluid Flow",
    source: "Ronald Press, New York",
    details: "Vol. 1",
    note: "Complete isentropic flow tables and theoretical derivations.",
  },
];

// ─── Hydraulic Jump ───────────────────────────────────────────────────────────
export const REFS_HYDRAULIC_JUMP: Reference[] = [
  {
    type: "book",
    authors: "Chaudhry, M.H.",
    year: "2008",
    title: "Open-Channel Hydraulics",
    source: "Springer",
    details: "2nd ed., Chapter 5 — Hydraulic Jump",
    note: "Sequent depth ratio, energy loss, and jump classification (undular to strong).",
  },
  {
    type: "book",
    authors: "Chow, V.T.",
    year: "1959",
    title: "Open-Channel Hydraulics",
    source: "McGraw-Hill, New York",
    details: "Chapter 15 — Hydraulic Jump and Its Control",
    note: "Comprehensive design charts for hydraulic jump in rectangular, trapezoidal, and circular channels.",
  },
];

// ─── LMTD / Heat Exchanger ────────────────────────────────────────────────────
export const REFS_LMTD: Reference[] = [
  {
    type: "book",
    authors: "Shah, R.K. & Sekulic, D.P.",
    year: "2003",
    title: "Fundamentals of Heat Exchanger Design",
    source: "John Wiley & Sons",
    note: "LMTD method, F-correction factors for multi-pass and cross-flow arrangements, and NTU-effectiveness method.",
  },
  {
    type: "book",
    authors: "Incropera, F.P., Dewitt, D.P., Bergman, T.L. & Lavine, A.S.",
    year: "2011",
    title: "Fundamentals of Heat and Mass Transfer",
    source: "John Wiley & Sons",
    details: "7th ed., Chapter 11 — Heat Exchangers",
    note: "LMTD and NTU-effectiveness methods with worked examples.",
  },
];

// ─── Slurry Pipeline ─────────────────────────────────────────────────────────
export const REFS_SLURRY_PIPELINE: Reference[] = [
  {
    type: "journal",
    authors: "Durand, R. & Condolios, E.",
    year: "1952",
    title: "Communication de la Deuxième Journée de l'Hydraulique — Transport hydraulique et floculation",
    source: "La Houille Blanche",
    note: "Original presentation of the Durand-Condolios correlation for critical deposition velocity (F_L factor) and heterogeneous slurry head loss.",
  },
  {
    type: "book",
    authors: "Wilson, K.C., Addie, G.R., Sellgren, A. & Clift, R.",
    year: "2006",
    title: "Slurry Transport Using Centrifugal Pumps",
    source: "Springer",
    details: "3rd ed.",
    note: "Wilson-GIW pump de-rating methodology (HR and ER), heterogeneous and stratified flow regimes, and settling velocity correlations.",
  },
  {
    type: "book",
    authors: "Abulnaga, B.E.",
    year: "2002",
    title: "Slurry Systems Handbook",
    source: "McGraw-Hill",
    note: "Practical slurry pipeline design covering Durand, Wilson, and Wasp methodologies with concentration conversions.",
  },
  {
    type: "book",
    authors: "Govier, G.W. & Aziz, K.",
    year: "1972",
    title: "The Flow of Complex Mixtures in Pipes",
    source: "Van Nostrand Reinhold, New York",
    note: "Flow regimes in slurry pipelines and settling velocity theory.",
  },
];

// ─── Mine Ventilation ─────────────────────────────────────────────────────────
export const REFS_MINE_VENTILATION: Reference[] = [
  {
    type: "book",
    authors: "McPherson, M.J.",
    year: "2009",
    title: "Subsurface Ventilation and Environmental Engineering",
    source: "Springer",
    details: "2nd ed.",
    note: "The definitive reference for Atkinson's equation, airway resistance, fan selection, auto-compression, and thermodynamics in underground mines.",
  },
  {
    type: "book",
    authors: "Hartman, H.L., Mutmansky, J.M., Ramani, R.V. & Wang, Y.J.",
    year: "1997",
    title: "Mine Ventilation and Air Conditioning",
    source: "John Wiley & Sons",
    details: "3rd ed.",
    note: "Mine ventilation networks, resistance measurement, and fan selection in the South African context.",
  },
  {
    type: "standard",
    authors: "Department of Mineral Resources and Energy, Republic of South Africa",
    year: "2022",
    title: "Mine Health and Safety Act 29 of 1996 — Regulations: Occupational Hygiene — Ventilation of Mines and Works (Regulation 5.15)",
    source: "Government Gazette, Republic of South Africa",
    note: "MHSA Regulation 5.15.1 — minimum airflow of 0.06 m³/s per kW installed diesel power; minimum velocity requirements for mine workings.",
  },
];

// ════════════════════════════════════════════════════════════════════════════════
// COMPRESSIBLE FLOW
// ════════════════════════════════════════════════════════════════════════════════

// ─── Mach Number ─────────────────────────────────────────────────────────────
// Ma = V / c    (ratio of flow speed to local speed of sound)
export const REFS_MACH_NUMBER: Reference[] = [
  {
    type: "book",
    authors: "Anderson, J.D.",
    year: "2003",
    title: "Modern Compressible Flow: With Historical Perspective",
    source: "McGraw-Hill",
    details: "3rd ed. — Chapter 1: Compressible Flow — Some History and Introductory Thoughts",
    note: "Mach number definition, physical regimes (subsonic, transonic, supersonic, hypersonic), and the role of Ma in compressibility effects on flow.",
  },
  {
    type: "book",
    authors: "Shapiro, A.H.",
    year: "1953",
    title: "The Dynamics and Thermodynamics of Compressible Fluid Flow",
    source: "Ronald Press, New York",
    details: "Vol. 1, Chapter 1",
    note: "The classical compressible flow reference. Mach number as the primary similarity parameter and its use in the non-dimensional equations of motion.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 9: Compressible Duct Flow",
    note: "Mach number in the context of internal gas dynamics — isentropic flow, normal shocks, and choked flow.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Boles, M.A.",
    year: "2015",
    title: "Thermodynamics: An Engineering Approach",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 17: Compressible Flow",
    note: "Mach number definition and flow regime classification for engineering gas dynamics applications.",
  },
];

// ─── Speed of Sound ───────────────────────────────────────────────────────────
// c = √(γRT)   for a calorically perfect ideal gas
export const REFS_SPEED_OF_SOUND: Reference[] = [
  {
    type: "journal",
    authors: "Laplace, P.S.",
    year: "1816",
    title: "Sur la vitesse du son dans l'air et dans l'eau",
    source: "Annales de Chimie et de Physique",
    details: "Vol. 3, pp. 238–241",
    note: "Laplace's correction to Newton's formula — introducing the adiabatic (isentropic) condition to give c = √(γP/ρ) = √(γRT). The modern speed-of-sound formula originates from this paper.",
  },
  {
    type: "book",
    authors: "Anderson, J.D.",
    year: "2003",
    title: "Modern Compressible Flow: With Historical Perspective",
    source: "McGraw-Hill",
    details: "3rd ed. — Chapter 1",
    note: "Derivation of c = √(γRT) from thermodynamic relations for a calorically perfect gas, and its variation with temperature for common gases.",
  },
  {
    type: "book",
    authors: "Shapiro, A.H.",
    year: "1953",
    title: "The Dynamics and Thermodynamics of Compressible Fluid Flow",
    source: "Ronald Press, New York",
    details: "Vol. 1, Chapter 2",
    note: "Speed of sound in perfect and imperfect gases, effect of humidity on c in air, and the acoustic propagation model.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 9",
    note: "Speed of sound formula, tabulated values for air and common gases at standard conditions.",
  },
];

// ─── Stagnation (Total) Properties ───────────────────────────────────────────
// T₀/T = 1 + (γ−1)/2·M²    P₀/P = (T₀/T)^(γ/(γ−1))
export const REFS_STAGNATION_PROPS: Reference[] = [
  {
    type: "book",
    authors: "Anderson, J.D.",
    year: "2003",
    title: "Modern Compressible Flow: With Historical Perspective",
    source: "McGraw-Hill",
    details: "3rd ed. — Chapter 3: One-Dimensional Flow",
    note: "Stagnation temperature, pressure, and density ratios derived from energy equation and isentropic relations. Pitot tube measurement of stagnation pressure.",
  },
  {
    type: "book",
    authors: "Shapiro, A.H.",
    year: "1953",
    title: "The Dynamics and Thermodynamics of Compressible Fluid Flow",
    source: "Ronald Press, New York",
    details: "Vol. 1, Chapters 4–5",
    note: "Stagnation enthalpy, total temperature in adiabatic flow, and isentropic stagnation pressure — the definitive analytical treatment.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 9: Stagnation Properties",
    note: "Stagnation properties with worked examples, pitot tube velocity measurement in compressible flow, and isentropic tables.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Boles, M.A.",
    year: "2015",
    title: "Thermodynamics: An Engineering Approach",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 17: Stagnation State",
    note: "Total enthalpy and stagnation properties from the steady-flow energy equation applied to compressible flow.",
  },
];

// ─── Choked Flow (Critical / Sonic Conditions) ────────────────────────────────
// At M=1: ṁ/A* = P₀·√(γ/(RT₀))·(2/(γ+1))^((γ+1)/(2(γ-1)))
export const REFS_CHOKED_FLOW: Reference[] = [
  {
    type: "book",
    authors: "Anderson, J.D.",
    year: "2003",
    title: "Modern Compressible Flow: With Historical Perspective",
    source: "McGraw-Hill",
    details: "3rd ed. — Chapter 5: Quasi-One-Dimensional Flow — Nozzle Flow and Choked Conditions",
    note: "Mass flow rate at choked conditions, critical pressure ratio, and the throat condition M=1. Derivation of the maximum mass flow function.",
  },
  {
    type: "book",
    authors: "Shapiro, A.H.",
    year: "1953",
    title: "The Dynamics and Thermodynamics of Compressible Fluid Flow",
    source: "Ronald Press, New York",
    details: "Vol. 1, Chapter 4",
    note: "Critical (sonic) conditions, the choked mass flow parameter, and the effect of back pressure on nozzle operation.",
  },
  {
    type: "standard",
    authors: "International Electrotechnical Commission",
    year: "2011",
    title: "Industrial-process control valves — Part 2-1: Flow capacity — Sizing equations for fluid flow under installed conditions",
    source: "IEC 60534-2-1",
    note: "Engineering application of choked flow — defines the choked pressure drop ratio xT and critical pressure ratio Fγ for gas flow through control valves.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 9: Choked Flow and Converging Nozzles",
    note: "Maximum mass flow through a nozzle, critical pressure ratio P*/P₀ = (2/(γ+1))^(γ/(γ-1)), and effect of back pressure.",
  },
];

// ─── Area-Mach Relation ───────────────────────────────────────────────────────
// A/A* = (1/M)·[(2/(γ+1))·(1+(γ−1)/2·M²)]^((γ+1)/(2(γ−1)))
export const REFS_AREA_MACH: Reference[] = [
  {
    type: "book",
    authors: "Anderson, J.D.",
    year: "2003",
    title: "Modern Compressible Flow: With Historical Perspective",
    source: "McGraw-Hill",
    details: "3rd ed. — Chapter 5: Quasi-One-Dimensional Flow",
    note: "Area-Mach relation for isentropic nozzle flow — derivation from continuity, energy, and isentropic equations. Dual solutions (subsonic and supersonic) for A/A* > 1.",
  },
  {
    type: "book",
    authors: "Shapiro, A.H.",
    year: "1953",
    title: "The Dynamics and Thermodynamics of Compressible Fluid Flow",
    source: "Ronald Press, New York",
    details: "Vol. 1, Chapters 4–5",
    note: "Area-velocity relationship dA/A = (M²-1)·dV/V — explains why subsonic flow decelerates in a nozzle while supersonic flow accelerates.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 9: Isentropic Flow with Area Change",
    note: "Area-Mach relation tables, converging-diverging nozzle operation, and design of supersonic wind tunnel nozzles.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Boles, M.A.",
    year: "2015",
    title: "Thermodynamics: An Engineering Approach",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 17: Isentropic Flow Through Nozzles",
    note: "Throat conditions, area ratio calculations, and operating modes of converging-diverging nozzles.",
  },
];

// ─── Fanno Flow (Adiabatic Duct Flow with Friction) ──────────────────────────
// 4fL*/D relates upstream Mach to sonic length
export const REFS_FANNO_FLOW: Reference[] = [
  {
    type: "book",
    authors: "Shapiro, A.H.",
    year: "1953",
    title: "The Dynamics and Thermodynamics of Compressible Fluid Flow",
    source: "Ronald Press, New York",
    details: "Vol. 1, Chapter 8: Adiabatic Flow with Friction — The Fanno Line",
    note: "The authoritative derivation of Fanno flow relations (T/T*, P/P*, ρ/ρ*, P₀/P₀*, 4fL*/D) for both subsonic and supersonic entry, and the Fanno line on the h-s diagram.",
  },
  {
    type: "book",
    authors: "Anderson, J.D.",
    year: "2003",
    title: "Modern Compressible Flow: With Historical Perspective",
    source: "McGraw-Hill",
    details: "3rd ed. — Chapter 3: Fanno Flow",
    note: "Fanno flow parameter derivations, choking condition, entropy increase due to friction, and difference from isentropic pipe flow.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 9: Adiabatic Pipe Flow with Friction",
    note: "Fanno line parameter tables and worked examples for subsonic duct flow with friction.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Boles, M.A.",
    year: "2015",
    title: "Thermodynamics: An Engineering Approach",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 17: Adiabatic Duct Flow with Friction",
    note: "Fanno flow entropy-Mach diagram and engineering application to gas pipeline design.",
  },
];

// ─── Rayleigh Flow (Frictionless Flow with Heat Transfer) ─────────────────────
// T₀/T₀* relates Mach to heat addition
export const REFS_RAYLEIGH_FLOW: Reference[] = [
  {
    type: "journal",
    authors: "Rayleigh, Lord (J.W. Strutt)",
    year: "1910",
    title: "Aerial plane waves of finite amplitude",
    source: "Proceedings of the Royal Society of London, Series A",
    details: "Vol. 84, pp. 247–284",
    note: "Lord Rayleigh's analysis of heat addition to a flowing gas — the theoretical foundation of what is now called Rayleigh flow.",
  },
  {
    type: "book",
    authors: "Shapiro, A.H.",
    year: "1953",
    title: "The Dynamics and Thermodynamics of Compressible Fluid Flow",
    source: "Ronald Press, New York",
    details: "Vol. 1, Chapter 7: Flow with Heat Transfer — The Rayleigh Line",
    note: "Complete derivation of Rayleigh flow relations (T/T*, P/P*, ρ/ρ*, P₀/P₀*, T₀/T₀*), the Rayleigh line on the T-s diagram, and thermal choking.",
  },
  {
    type: "book",
    authors: "Anderson, J.D.",
    year: "2003",
    title: "Modern Compressible Flow: With Historical Perspective",
    source: "McGraw-Hill",
    details: "3rd ed. — Chapter 3: Rayleigh Flow",
    note: "Rayleigh flow parameter derivations, maximum heat addition before choking, and comparison with Fanno flow on the h-s diagram.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 9: Flow with Heat Transfer — Rayleigh Line",
    note: "Rayleigh flow tables and application to combustion chamber analysis and thermal choking.",
  },
];

// ─── Oblique Shock Wave ───────────────────────────────────────────────────────
// θ–β–M relation: tan θ = 2 cot β · (M₁²sin²β − 1)/(M₁²(γ + cos 2β) + 2)
export const REFS_OBLIQUE_SHOCK: Reference[] = [
  {
    type: "book",
    authors: "Anderson, J.D.",
    year: "2003",
    title: "Modern Compressible Flow: With Historical Perspective",
    source: "McGraw-Hill",
    details: "3rd ed. — Chapter 4: Oblique Shocks and Expansion Waves",
    note: "θ–β–M relation derivation, shock polar diagram, weak vs. strong shock solutions, and detachment condition. Contains oblique shock tables.",
  },
  {
    type: "book",
    authors: "Shapiro, A.H.",
    year: "1953",
    title: "The Dynamics and Thermodynamics of Compressible Fluid Flow",
    source: "Ronald Press, New York",
    details: "Vol. 1, Chapter 15",
    note: "Oblique shock relations for a perfect gas, two-dimensional supersonic flow turning, and the maximum deflection angle for attached shocks.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 9: Oblique Shock Waves",
    note: "Oblique shock geometry, normal Mach number M₁ₙ = M₁ sin β, and downstream properties in terms of the normal shock relations.",
  },
  {
    type: "book",
    authors: "Zucrow, M.J. & Hoffman, J.D.",
    year: "1976",
    title: "Gas Dynamics",
    source: "John Wiley & Sons",
    details: "Vol. 1 — Chapter 8: Oblique Shock Waves",
    note: "Graphical θ–β–M charts, method of characteristics for supersonic flow design, and oblique shock interaction.",
  },
];

// ─── Prandtl-Meyer Expansion ──────────────────────────────────────────────────
// ν(M) = √((γ+1)/(γ−1))·arctan(√((γ−1)/(γ+1)·(M²−1))) − arctan(√(M²−1))
export const REFS_PRANDTL_MEYER: Reference[] = [
  {
    type: "book",
    authors: "Anderson, J.D.",
    year: "2003",
    title: "Modern Compressible Flow: With Historical Perspective",
    source: "McGraw-Hill",
    details: "3rd ed. — Chapter 4: Prandtl-Meyer Expansion",
    note: "Derivation of the Prandtl-Meyer function ν(M), expansion fan geometry, and the condition that expansion is isentropic (unlike oblique shocks). Includes Prandtl-Meyer tables.",
  },
  {
    type: "book",
    authors: "Shapiro, A.H.",
    year: "1953",
    title: "The Dynamics and Thermodynamics of Compressible Fluid Flow",
    source: "Ronald Press, New York",
    details: "Vol. 1, Chapter 15",
    note: "Prandtl-Meyer expansion in supersonic flow around convex corners — isentropic turning angle and Mach wave analysis.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 9: Prandtl-Meyer Expansion",
    note: "Expansion fan Mach angle, Prandtl-Meyer function values, and comparison with the compression through oblique shocks.",
  },
  {
    type: "book",
    authors: "Zucrow, M.J. & Hoffman, J.D.",
    year: "1976",
    title: "Gas Dynamics",
    source: "John Wiley & Sons",
    details: "Vol. 1 — Chapter 9: Prandtl-Meyer Flow",
    note: "Prandtl-Meyer expansion in method of characteristics and nozzle design for supersonic wind tunnels.",
  },
];

// ════════════════════════════════════════════════════════════════════════════════
// TURBOMACHINERY
// ════════════════════════════════════════════════════════════════════════════════

// ─── Specific Speed ───────────────────────────────────────────────────────────
// Ns = N√Q / H^(3/4)  (dimensional)    Ωs = ω√Q / (gH)^(3/4)  (dimensionless)
export const REFS_SPECIFIC_SPEED: Reference[] = [
  {
    type: "book",
    authors: "Gülich, J.F.",
    year: "2010",
    title: "Centrifugal Pumps",
    source: "Springer",
    details: "2nd ed. — Chapter 3: Pump Types and Performance Data",
    note: "Specific speed as the primary similarity parameter for pump and turbine classification. Dimensionless specific speed (shape number) Ωs, dimensional forms Ns, and the relationship between specific speed and best efficiency point (BEP) characteristics.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 11: Turbomachinery",
    note: "Specific speed definition, BEP selection chart (Ns vs pump type), and scale-up from model tests.",
  },
  {
    type: "standard",
    authors: "Hydraulic Institute",
    year: "2014",
    title: "ANSI/HI 1.1-1.5: Centrifugal Pumps — Nomenclature, Definitions, Application and Operation",
    source: "Hydraulic Institute, Parsippany, NJ",
    note: "Standard definition of specific speed with SI and US customary unit systems and conversion factors.",
  },
  {
    type: "book",
    authors: "Tuzson, J.",
    year: "2000",
    title: "Centrifugal Pump Design",
    source: "John Wiley & Sons",
    note: "Specific speed as a design parameter — its use in selecting impeller geometry, predicting efficiency, and identifying applicable pump type for a given duty.",
  },
];

// ─── Hydraulic Efficiency ────────────────────────────────────────────────────
// η_h = gH / (u₂c₂u)  for pumps     η_h = (u₁c₁u - u₂c₂u) / gH  for turbines
export const REFS_HYDRAULIC_EFFICIENCY: Reference[] = [
  {
    type: "book",
    authors: "Gülich, J.F.",
    year: "2010",
    title: "Centrifugal Pumps",
    source: "Springer",
    details: "2nd ed. — Chapter 3: Losses and Efficiencies",
    note: "Hydraulic, volumetric, and mechanical efficiency components; the difference between hydraulic efficiency (Euler head / actual head) and overall pump efficiency.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 11: Turbomachinery",
    note: "Euler turbomachine equation and the relationship between hydraulic efficiency, head, and shaft power.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 14: Turbomachinery",
    note: "Hydraulic efficiency definition and worked examples for centrifugal pumps and axial flow turbines.",
  },
];

// ─── Hydraulic Turbine Power ──────────────────────────────────────────────────
// P = ρgQH·η_turbine    (Pelton, Francis, Kaplan)
export const REFS_TURBINE_POWER: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 11: Hydraulic Turbines",
    note: "Pelton, Francis, and Kaplan turbine operating principles; turbine power P = ρgQHη, specific speed for turbine classification, and efficiency curves.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 14: Turbines",
    note: "Impulse and reaction turbine classification, Euler turbine equation, and power extraction from hydraulic turbines.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Cimbala, J.M.",
    year: "2014",
    title: "Fluid Mechanics: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "3rd ed. — Chapter 14: Turbomachinery",
    note: "Turbine efficiency, specific speed classification, and Francis turbine velocity triangles.",
  },
  {
    type: "standard",
    authors: "International Electrotechnical Commission",
    year: "2019",
    title: "Hydraulic turbines, storage pumps and pump-turbines — Model acceptance tests",
    source: "IEC 60193",
    note: "International standard for hydraulic turbine model testing, efficiency measurement, and performance guarantees — the basis for turbine power acceptance criteria.",
  },
];

// ─── Fan Laws (Fan Affinity Laws) ────────────────────────────────────────────
// Q∝N,  ΔP∝N²,  P∝N³   (at constant fan diameter and air density)
export const REFS_FAN_LAWS: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 11: Dimensional Analysis of Turbomachinery — Fan Laws",
    note: "Fan similarity laws derived from dimensional analysis: Q∝ND³, ΔP∝ρN²D², P∝ρN³D⁵. Density correction for altitude and temperature change.",
  },
  {
    type: "standard",
    authors: "AMCA International",
    year: "2016",
    title: "Standards Handbook — Publication 99-16",
    source: "Air Movement and Control Association International, Arlington Heights, IL",
    note: "Industry standard definitions for fan performance, testing, and rating. Fan law conventions and corrections for density, size, and speed.",
  },
  {
    type: "book",
    authors: "ASHRAE",
    year: "2021",
    title: "ASHRAE Handbook — Fundamentals",
    source: "American Society of Heating, Refrigerating and Air-Conditioning Engineers, Atlanta",
    details: "Chapter 21: Fans",
    note: "Fan performance characteristics, system curves, and affinity law application to HVAC fan selection and speed control.",
  },
  {
    type: "book",
    authors: "Bleier, F.P.",
    year: "1998",
    title: "Fan Handbook: Selection, Application, and Design",
    source: "McGraw-Hill",
    note: "Comprehensive reference for fan types, performance curves, fan law application, and system resistance — the practical engineer's guide to fan selection.",
  },
];

// ─── Impeller Tip Speed ───────────────────────────────────────────────────────
// u₂ = π·D₂·N / 60
export const REFS_IMPELLER_TIP_SPEED: Reference[] = [
  {
    type: "book",
    authors: "Gülich, J.F.",
    year: "2010",
    title: "Centrifugal Pumps",
    source: "Springer",
    details: "2nd ed. — Chapter 6: Suction Capability and Cavitation; Chapter 7: Design of the Hydraulic Components",
    note: "Impeller tip speed u₂ as a key design parameter — relationship to head coefficient ψ = gH/u₂², cavitation limits, and material stress limits for high-speed impellers.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 11: Euler Turbomachine Equation",
    note: "Tip speed in the velocity triangle (Euler equation), maximum head from peripheral velocity, and the role of u₂ in pump similarity.",
  },
  {
    type: "book",
    authors: "Tuzson, J.",
    year: "2000",
    title: "Centrifugal Pump Design",
    source: "John Wiley & Sons",
    note: "Impeller tip speed limits due to mechanical stress, cavitation, and NPSH requirements in centrifugal pump design.",
  },
];

// ─── Suction Specific Speed ───────────────────────────────────────────────────
// Ss = N√Q / NPSH^(3/4)   (US customary)    Ωss = ω√Q / (g·NPSH)^(3/4)  (SI)
export const REFS_SUCTION_SPECIFIC_SPEED: Reference[] = [
  {
    type: "standard",
    authors: "Hydraulic Institute",
    year: "2014",
    title: "ANSI/HI 1.1-1.5: Centrifugal Pumps — Nomenclature, Definitions, Application and Operation",
    source: "Hydraulic Institute, Parsippany, NJ",
    note: "Defines suction specific speed Ss = N√Q / NPSH^(3/4) and recommends limits (Ss < 11,000 in US customary units) to avoid recirculation and suction instability.",
  },
  {
    type: "book",
    authors: "Gülich, J.F.",
    year: "2010",
    title: "Centrifugal Pumps",
    source: "Springer",
    details: "2nd ed. — Chapter 6: Suction Capability and Cavitation",
    note: "Suction specific speed as a parameter linking specific speed, NPSH, and the risk of inlet recirculation at part-load operation. Recommended limits for different impeller types.",
  },
  {
    type: "book",
    authors: "Karassik, I.J., Messina, J.P., Cooper, P. & Heald, C.C.",
    year: "2001",
    title: "Pump Handbook",
    source: "McGraw-Hill",
    details: "3rd ed.",
    note: "Suction specific speed limits, the relationship between Ss and cavitation damage risk, and NPSH margin recommendations for industrial applications.",
  },
];

// ─── Pump System Curve ────────────────────────────────────────────────────────
// H_system = H_static + R·Q²
export const REFS_PUMP_SYSTEM_CURVE: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 11: Pump Selection and Matching",
    note: "System curve H = H_static + R·Q² and its intersection with the pump H-Q curve to find the operating point. Effect of pipe friction and static head on the system resistance parabola.",
  },
  {
    type: "book",
    authors: "Gülich, J.F.",
    year: "2010",
    title: "Centrifugal Pumps",
    source: "Springer",
    details: "2nd ed. — Chapter 11: Operation of Centrifugal Pumps",
    note: "System curve construction, operating point stability, and the effect of throttling vs. speed control on the pump duty point.",
  },
  {
    type: "standard",
    authors: "Hydraulic Institute",
    year: "2014",
    title: "ANSI/HI 1.1-1.5: Centrifugal Pumps",
    source: "Hydraulic Institute, Parsippany, NJ",
    note: "Procedures for determining the system head curve and selecting the pump operating point in compliance with industry standards.",
  },
  {
    type: "book",
    authors: "Karassik, I.J., Messina, J.P., Cooper, P. & Heald, C.C.",
    year: "2001",
    title: "Pump Handbook",
    source: "McGraw-Hill",
    details: "3rd ed.",
    note: "System curve analysis including static head, friction losses, and minor losses — the comprehensive reference for pump application engineering.",
  },
];

// ─── Pump Parallel and Series Operation ───────────────────────────────────────
export const REFS_PUMP_PARALLEL_SERIES: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 11: Multiple-Pump Systems",
    note: "Parallel pumps (add flows at same head — shifts H-Q curve right) vs. series pumps (add heads at same flow — shifts curve up). Operating point determination and flow distribution.",
  },
  {
    type: "book",
    authors: "Gülich, J.F.",
    year: "2010",
    title: "Centrifugal Pumps",
    source: "Springer",
    details: "2nd ed. — Chapter 11: Pumps Operating in Parallel and in Series",
    note: "Combined H-Q curve construction, stable operation criteria, load sharing between pumps, and the risk of one pump being driven backwards in parallel arrangements.",
  },
  {
    type: "book",
    authors: "Karassik, I.J., Messina, J.P., Cooper, P. & Heald, C.C.",
    year: "2001",
    title: "Pump Handbook",
    source: "McGraw-Hill",
    details: "3rd ed.",
    note: "Practical guidance for parallel and series pump selection, check valve requirements, and performance prediction for non-identical pumps.",
  },
  {
    type: "standard",
    authors: "Hydraulic Institute",
    year: "2014",
    title: "ANSI/HI 1.1-1.5: Centrifugal Pumps",
    source: "Hydraulic Institute, Parsippany, NJ",
    note: "Industry recommendations for parallel and series pump operation, minimum flow requirements, and protection against reverse rotation.",
  },
];

// ════════════════════════════════════════════════════════════════════════════════
// OPEN CHANNEL FLOW
// ════════════════════════════════════════════════════════════════════════════════

// ─── Froude Number ────────────────────────────────────────────────────────────
// Fr = V / √(gD)    D = A/T (hydraulic depth)
export const REFS_FROUDE_NUMBER: Reference[] = [
  {
    type: "book",
    authors: "Chow, V.T.",
    year: "1959",
    title: "Open-Channel Hydraulics",
    source: "McGraw-Hill, New York",
    details: "Chapter 1: Flow Regimes — Froude Number",
    note: "Froude number as the primary dimensionless parameter for open-channel flow classification: subcritical (Fr < 1), critical (Fr = 1), supercritical (Fr > 1).",
  },
  {
    type: "book",
    authors: "Chaudhry, M.H.",
    year: "2008",
    title: "Open-Channel Hydraulics",
    source: "Springer",
    details: "2nd ed. — Chapter 2: Energy Equation",
    note: "Hydraulic depth D = A/T for non-rectangular sections, Froude number in relation to specific energy and critical flow conditions.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 10: Open-Channel Flow",
    note: "Froude number in dimensional analysis of open-channel flow, wave speed c = √(gD), and the shallow-water wave analogy.",
  },
  {
    type: "book",
    authors: "Henderson, F.M.",
    year: "1966",
    title: "Open Channel Flow",
    source: "Macmillan, New York",
    details: "Chapter 2: The Energy Principle in Open Channel Flow",
    note: "Derivation of Fr from the shallow-water wave celerity and its role in determining flow response to disturbances.",
  },
];

// ─── Critical Depth ───────────────────────────────────────────────────────────
// At critical flow: Q²/g = A³/T  (minimum specific energy for given discharge)
export const REFS_CRITICAL_DEPTH: Reference[] = [
  {
    type: "book",
    authors: "Chow, V.T.",
    year: "1959",
    title: "Open-Channel Hydraulics",
    source: "McGraw-Hill, New York",
    details: "Chapter 2: Critical Flow Conditions",
    note: "Critical depth derivation from minimum specific energy: Q²/g = A³/T (general section) and y_c = (q²/g)^(1/3) (rectangular). Critical slope definition.",
  },
  {
    type: "book",
    authors: "Chaudhry, M.H.",
    year: "2008",
    title: "Open-Channel Hydraulics",
    source: "Springer",
    details: "2nd ed. — Chapter 2: Critical Flow",
    note: "Iterative solution for critical depth in trapezoidal and circular sections, critical slope, and critical velocity.",
  },
  {
    type: "book",
    authors: "Henderson, F.M.",
    year: "1966",
    title: "Open Channel Flow",
    source: "Macmillan, New York",
    details: "Chapter 2",
    note: "Critical flow conditions for non-rectangular sections and the computation of critical depth by trial.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 10: Critical Flow",
    note: "Critical depth formula, Froude number at critical conditions, and minimum energy head.",
  },
];

// ─── Weir Flow ────────────────────────────────────────────────────────────────
// Sharp-crested: Q = (2/3)·Cd·L·√(2g)·H^(3/2)    V-notch: Q = (8/15)·Cd·√(2g)·tan(θ/2)·H^(5/2)
export const REFS_WEIR_FLOW: Reference[] = [
  {
    type: "book",
    authors: "Francis, J.B.",
    year: "1855",
    title: "Lowell Hydraulic Experiments",
    source: "Little, Brown and Company, Boston",
    note: "Original experimental basis for the Francis weir formula — systematic discharge measurements on sharp-crested weirs at Lowell, Massachusetts, establishing the relationship between head and flow rate.",
  },
  {
    type: "report",
    authors: "Bureau of Reclamation, U.S. Department of the Interior",
    year: "2001",
    title: "Water Measurement Manual",
    source: "U.S. Government Printing Office, Washington, D.C.",
    details: "3rd ed., Chapter 5: Weirs",
    note: "Sharp-crested weir (Francis formula), broad-crested weir, and V-notch (Thomson) weir discharge equations with correction factors for velocity of approach and end contractions.",
  },
  {
    type: "book",
    authors: "Chow, V.T.",
    year: "1959",
    title: "Open-Channel Hydraulics",
    source: "McGraw-Hill, New York",
    details: "Chapter 10: Flow Over Spillways and Weirs",
    note: "Sharp-crested, broad-crested, and ogee weir flow equations; discharge coefficients and velocity of approach corrections.",
  },
  {
    type: "book",
    authors: "Chaudhry, M.H.",
    year: "2008",
    title: "Open-Channel Hydraulics",
    source: "Springer",
    details: "2nd ed. — Chapter 9: Flow Over Weirs",
    note: "Weir classification, V-notch (Thomson) weir, and Cipolletti trapezoidal weir discharge equations with coefficient of discharge values.",
  },
];

// ─── Specific Energy ──────────────────────────────────────────────────────────
// E = y + V²/2g = y + Q²/(2gA²)
export const REFS_SPECIFIC_ENERGY: Reference[] = [
  {
    type: "book",
    authors: "Bakhmeteff, B.A.",
    year: "1932",
    title: "Hydraulics of Open Channels",
    source: "McGraw-Hill, New York",
    note: "Introduced the concept of specific energy E = y + V²/2g for open-channel flow analysis — the foundational work for the specific energy diagram and critical depth theory.",
  },
  {
    type: "book",
    authors: "Chow, V.T.",
    year: "1959",
    title: "Open-Channel Hydraulics",
    source: "McGraw-Hill, New York",
    details: "Chapter 2: Energy in Open-Channel Flow",
    note: "Specific energy diagram, critical depth at minimum energy, alternate depths, and the energy equation for channels with gradually varying flow.",
  },
  {
    type: "book",
    authors: "Chaudhry, M.H.",
    year: "2008",
    title: "Open-Channel Hydraulics",
    source: "Springer",
    details: "2nd ed. — Chapter 2: Specific Energy",
    note: "Specific energy curves for rectangular and trapezoidal sections, transition from subcritical to supercritical flow, and the specific energy in non-prismatic channels.",
  },
  {
    type: "book",
    authors: "Henderson, F.M.",
    year: "1966",
    title: "Open Channel Flow",
    source: "Macmillan, New York",
    details: "Chapter 2: The Energy Principle",
    note: "Specific energy concept and its application to channel transitions (humps, constrictions) and choking conditions.",
  },
];

// ─── Normal Depth (Uniform Flow) ──────────────────────────────────────────────
// Manning's equation solved iteratively for y_n given Q, S, n, and cross-section
export const REFS_NORMAL_DEPTH: Reference[] = [
  {
    type: "journal",
    authors: "Manning, R.",
    year: "1891",
    title: "On the flow of water in open channels and pipes",
    source: "Transactions of the Institution of Civil Engineers of Ireland",
    details: "Vol. 20, pp. 161–207",
    note: "Original publication of the Manning roughness formula — the basis for all normal depth calculations in uniform open-channel flow.",
  },
  {
    type: "book",
    authors: "Chow, V.T.",
    year: "1959",
    title: "Open-Channel Hydraulics",
    source: "McGraw-Hill, New York",
    details: "Chapters 5–7: Uniform Flow and Normal Depth",
    note: "Manning's n values, normal depth computation by trial and graphical methods, and channel design for uniform flow.",
  },
  {
    type: "book",
    authors: "Chaudhry, M.H.",
    year: "2008",
    title: "Open-Channel Hydraulics",
    source: "Springer",
    details: "2nd ed. — Chapter 3: Uniform Flow",
    note: "Bisection and Newton-Raphson iterative methods for normal depth, most efficient section shapes.",
  },
];

// ─── Chézy Equation ───────────────────────────────────────────────────────────
// V = C · √(R_h · S)
export const REFS_CHEZY_EQUATION: Reference[] = [
  {
    type: "book",
    authors: "Chow, V.T.",
    year: "1959",
    title: "Open-Channel Hydraulics",
    source: "McGraw-Hill, New York",
    details: "Chapter 5: Development of Uniform Flow Equations — Chézy Formula",
    note: "Historical development of the Chézy formula (c. 1769), its relationship to Darcy-Weisbach (C = √(8g/f)), and the Kutter formula for C. Chézy coefficient values for common channel types.",
  },
  {
    type: "book",
    authors: "Chaudhry, M.H.",
    year: "2008",
    title: "Open-Channel Hydraulics",
    source: "Springer",
    details: "2nd ed. — Chapter 3: Uniform Flow",
    note: "Relationship between Chézy C, Manning's n, and Darcy-Weisbach f: C = R^(1/6)/n = √(8g/f).",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 10: Uniform Flow — Chézy and Manning Formulas",
    note: "Chézy equation derivation from dimensional analysis and its equivalence to the Darcy-Weisbach equation for open channels.",
  },
];

// ─── Hydraulic Radius ─────────────────────────────────────────────────────────
// R_h = A / P_w   for rectangular, trapezoidal, circular, and triangular sections
export const REFS_HYDRAULIC_RADIUS: Reference[] = [
  {
    type: "book",
    authors: "Chow, V.T.",
    year: "1959",
    title: "Open-Channel Hydraulics",
    source: "McGraw-Hill, New York",
    details: "Chapter 2: Geometric Elements of Channel Sections",
    note: "Hydraulic radius R_h = A/P_w, hydraulic depth D = A/T, and tables of geometric properties for standard section shapes — the definitive tabulation for open-channel design.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 10: Geometry of Open Channels",
    note: "Hydraulic radius for rectangular, trapezoidal, triangular, and circular sections. Role of hydraulic radius in the Manning and Chézy equations.",
  },
  {
    type: "book",
    authors: "Chaudhry, M.H.",
    year: "2008",
    title: "Open-Channel Hydraulics",
    source: "Springer",
    details: "2nd ed. — Chapter 1: Basic Definitions",
    note: "Geometric properties of channel sections including hydraulic radius, hydraulic depth, and top width for prismatic channels.",
  },
];

// ─── Wetted Perimeter ─────────────────────────────────────────────────────────
export const REFS_WETTED_PERIMETER: Reference[] = [
  {
    type: "book",
    authors: "Chow, V.T.",
    year: "1959",
    title: "Open-Channel Hydraulics",
    source: "McGraw-Hill, New York",
    details: "Chapter 2: Geometric Elements of Channel Sections",
    note: "Wetted perimeter formulae for rectangular, trapezoidal, triangular, and circular channel cross-sections. Design charts for best hydraulic section (minimum wetted perimeter for given area).",
  },
  {
    type: "book",
    authors: "Chaudhry, M.H.",
    year: "2008",
    title: "Open-Channel Hydraulics",
    source: "Springer",
    details: "2nd ed. — Chapter 1: Definitions and Basic Concepts",
    note: "Wetted perimeter in relation to hydraulic radius and the most efficient channel section (semicircular for minimum P_w).",
  },
];

// ─── Open-Channel Flow Classification ────────────────────────────────────────
// Subcritical/supercritical (Froude number), laminar/turbulent (Reynolds number)
export const REFS_FLOW_CLASSIFICATION_OC: Reference[] = [
  {
    type: "book",
    authors: "Chow, V.T.",
    year: "1959",
    title: "Open-Channel Hydraulics",
    source: "McGraw-Hill, New York",
    details: "Chapter 1: Flow Classification in Open Channels",
    note: "Classification by time variation (steady/unsteady), space variation (uniform/non-uniform), and Froude number (subcritical/supercritical). Reynolds number criteria for laminar-turbulent transition in open channels.",
  },
  {
    type: "book",
    authors: "Chaudhry, M.H.",
    year: "2008",
    title: "Open-Channel Hydraulics",
    source: "Springer",
    details: "2nd ed. — Chapter 1: Basic Concepts",
    note: "Flow type classification matrix (steady uniform, steady non-uniform, unsteady) and practical criteria for engineering design.",
  },
  {
    type: "book",
    authors: "Henderson, F.M.",
    year: "1966",
    title: "Open Channel Flow",
    source: "Macmillan, New York",
    details: "Chapter 1: The Nature of Open-Channel Flow",
    note: "Physical basis for subcritical and supercritical flow classification and the Froude number as a wave propagation parameter.",
  },
];

// ─── Trapezoidal Channel ──────────────────────────────────────────────────────
export const REFS_TRAPEZOIDAL_CHANNEL: Reference[] = [
  {
    type: "book",
    authors: "Chow, V.T.",
    year: "1959",
    title: "Open-Channel Hydraulics",
    source: "McGraw-Hill, New York",
    details: "Chapter 7: Design of Channels for Uniform Flow",
    note: "Trapezoidal section geometry, Manning's equation application, best hydraulic section (side slopes z = 1:√3 for half-hexagon), and channel lining design.",
  },
  {
    type: "book",
    authors: "Chaudhry, M.H.",
    year: "2008",
    title: "Open-Channel Hydraulics",
    source: "Springer",
    details: "2nd ed. — Chapter 3: Channel Design",
    note: "Trapezoidal channel proportions for maximum discharge or minimum excavation, and stable channel design with allowable velocity constraints.",
  },
  {
    type: "book",
    authors: "Henderson, F.M.",
    year: "1966",
    title: "Open Channel Flow",
    source: "Macmillan, New York",
    details: "Chapter 4: Channel Design",
    note: "Trapezoidal channel design for uniform flow including the most hydraulically efficient section derivation.",
  },
];

// ─── Culvert Design ───────────────────────────────────────────────────────────
export const REFS_CULVERT_DESIGN: Reference[] = [
  {
    type: "report",
    authors: "Federal Highway Administration (FHWA)",
    year: "2012",
    title: "Hydraulic Design of Highway Culverts",
    source: "Hydraulic Design Series No. 5 (HDS-5), Publication No. FHWA-HIF-12-026. U.S. Department of Transportation",
    details: "3rd ed.",
    note: "The primary US reference for culvert hydraulic design — inlet control (critical depth at inlet, headwater-discharge nomographs) and outlet control (full pipe or tailwater-controlled flow). Defines HW/D design criteria.",
  },
  {
    type: "report",
    authors: "South African National Roads Agency (SANRAL)",
    year: "2013",
    title: "Drainage Manual",
    source: "South African National Roads Agency Limited, Pretoria",
    details: "6th ed., Chapter 7: Culvert Hydraulics",
    note: "SA-specific culvert design guidance aligned with SANS standards, incorporating local IDF data and pipe material recommendations for South African conditions.",
  },
  {
    type: "book",
    authors: "Chow, V.T.",
    year: "1959",
    title: "Open-Channel Hydraulics",
    source: "McGraw-Hill, New York",
    details: "Chapter 17: Culvert Hydraulics",
    note: "Hydraulic analysis of culvert flow under inlet and outlet control conditions.",
  },
];

// ─── Sediment Transport ───────────────────────────────────────────────────────
export const REFS_SEDIMENT_TRANSPORT: Reference[] = [
  {
    type: "report",
    authors: "Shields, A.",
    year: "1936",
    title: "Anwendung der Ähnlichkeitsmechanik und der Turbulenzforschung auf die Geschiebebewegung",
    source: "Mitteilungen der Preussischen Versuchsanstalt für Wasserbau und Schiffbau, Berlin",
    details: "Vol. 26 (English translation: USACE Hydrodynamics Lab, Publication No. 167, 1936)",
    note: "Shields' doctoral dissertation — establishes the critical Shields parameter θ_c for incipient motion of sediment. The Shields diagram (θ vs Re*) remains the fundamental tool for determining whether sediment moves.",
  },
  {
    type: "journal",
    authors: "Meyer-Peter, E. & Müller, R.",
    year: "1948",
    title: "Formulas for bed-load transport",
    source: "Proceedings of the 2nd Meeting of the International Association for Hydraulic Research (IAHR), Stockholm",
    details: "pp. 39–64",
    note: "The Meyer-Peter Müller (MPM) formula for bed-load transport rate: Φ = 8(θ − θ_c)^(3/2). One of the most widely used bed-load equations in engineering practice.",
  },
  {
    type: "report",
    authors: "Einstein, H.A.",
    year: "1950",
    title: "The Bed-Load Function for Sediment Transportation in Open Channel Flows",
    source: "Technical Bulletin No. 1026, U.S. Department of Agriculture, Soil Conservation Service",
    note: "Einstein's probabilistic bed-load function — a rigorous statistical approach to sediment transport that accounts for turbulent fluctuations in shear stress.",
  },
  {
    type: "journal",
    authors: "van Rijn, L.C.",
    year: "1984",
    title: "Sediment transport, Part I: Bed load transport",
    source: "Journal of Hydraulic Engineering, ASCE",
    details: "Vol. 110, No. 10, pp. 1431–1456",
    note: "van Rijn's widely-adopted bed-load formula using the dimensionless particle parameter D* and transport parameter T — covers the full range from incipient motion to sheet flow.",
  },
];

// ─── Gradually Varied Flow (GVF) ─────────────────────────────────────────────
// dy/dx = (S₀ − Sf) / (1 − Fr²)    Sf from Manning's equation
export const REFS_GRADUALLY_VARIED_FLOW: Reference[] = [
  {
    type: "book",
    authors: "Chow, V.T.",
    year: "1959",
    title: "Open-Channel Hydraulics",
    source: "McGraw-Hill, New York",
    details: "Chapters 9–13: Gradually Varied Flow — Classification and Computation",
    note: "GVF differential equation dy/dx = (S₀ - Sf)/(1 - Fr²), water surface profile classification (M1-M3, S1-S3, C, A, H curves), and direct step / standard step computation methods.",
  },
  {
    type: "book",
    authors: "Chaudhry, M.H.",
    year: "2008",
    title: "Open-Channel Hydraulics",
    source: "Springer",
    details: "2nd ed. — Chapter 4: Gradually Varied Flow",
    note: "GVF profile classification, numerical integration methods (direct step, standard step, Runge-Kutta), and practical backwater curve computation for reservoir tailwater.",
  },
  {
    type: "book",
    authors: "Henderson, F.M.",
    year: "1966",
    title: "Open Channel Flow",
    source: "Macmillan, New York",
    details: "Chapter 5: Gradually Varied Flow",
    note: "Physical interpretation of the 12 GVF profile types, control section selection, and backwater curve computation in natural channels.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 10: Gradually Varied Flow",
    note: "GVF equation derivation, profile types, and step-by-step numerical integration for mild and steep slopes.",
  },
];

// ─── Tidal Prism ─────────────────────────────────────────────────────────────
// P = A · ΔH    (simplified for a well-mixed tidal basin)
export const REFS_TIDAL_PRISM: Reference[] = [
  {
    type: "journal",
    authors: "O'Brien, M.P.",
    year: "1969",
    title: "Equilibrium flow areas of inlets on sandy coasts",
    source: "Journal of the Waterways and Harbors Division, ASCE",
    details: "Vol. 95, No. WW1, pp. 43–52",
    note: "Establishes the empirical tidal prism–inlet cross-section relationship A_c = C·P^n that links tidal prism to inlet stability — the foundational reference for tidal prism engineering applications.",
  },
  {
    type: "book",
    authors: "Bruun, P.",
    year: "1978",
    title: "Stability of Tidal Inlets",
    source: "Elsevier, Amsterdam",
    note: "Tidal prism theory for inlet stability, sediment bypassing, and the equilibrium cross-section area relationship — the primary monograph on coastal inlet hydraulics.",
  },
  {
    type: "report",
    authors: "U.S. Army Corps of Engineers",
    year: "2011",
    title: "Coastal Engineering Manual",
    source: "Engineer Manual EM 1110-2-1100. U.S. Army Corps of Engineers, Washington D.C.",
    details: "Part II, Chapter 7: Tidal Inlets",
    note: "Tidal prism calculation methods, spring and neap tidal ranges, and the relationship between tidal prism and inlet morphology in estuaries and coastal lagoons.",
  },
  {
    type: "book",
    authors: "Dean, R.G. & Dalrymple, R.A.",
    year: "2002",
    title: "Coastal Processes with Engineering Applications",
    source: "Cambridge University Press",
    details: "Chapter 9: Tidal Inlets",
    note: "Tidal prism theory, spring-neap variation, and tidal exchange in estuaries — provides the engineering context for tidal prism calculations.",
  },
];

// ════════════════════════════════════════════════════════════════════════════════
// PIPE AND DUCT SYSTEMS
// ════════════════════════════════════════════════════════════════════════════════

// ─── Pipe Run (Fittings + Straight Sections) ──────────────────────────────────
// Darcy-Weisbach for straight pipe + K-factor method for fittings
export const REFS_PIPE_RUN: Reference[] = [
  {
    type: "report",
    authors: "Crane Co.",
    year: "2011",
    title: "Flow of Fluids Through Valves, Fittings, and Pipe",
    source: "Technical Paper No. 410. Crane Co., Stamford, CT",
    note: "The industry-standard reference for K-factors and equivalent lengths (L/D) for elbows, tees, reducers, valves, and other fittings — used by engineers worldwide to calculate total pipe system head loss.",
  },
  {
    type: "book",
    authors: "Idelchik, I.E.",
    year: "1994",
    title: "Handbook of Hydraulic Resistance",
    source: "Begell House, New York",
    details: "3rd ed.",
    note: "Comprehensive loss coefficient data for over 300 pipe fitting types and geometries including bends, branches, expansions, and contractions.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 6: Viscous Flow in Ducts",
    note: "Darcy-Weisbach friction head loss, Colebrook-White friction factor, and minor loss coefficients for pipe system design.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Cimbala, J.M.",
    year: "2014",
    title: "Fluid Mechanics: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "3rd ed. — Chapter 8: Internal Flow",
    note: "Pipe system analysis combining major and minor losses, design for required flow rate or allowable pressure drop.",
  },
];

// ─── Fan System Curve and Operating Point ────────────────────────────────────
export const REFS_FAN_SYSTEM_CURVE: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 11: Fan System Curves",
    note: "System resistance parabola H = R·Q², fan H-Q curve intersection for operating point, and effects of speed change using affinity laws.",
  },
  {
    type: "standard",
    authors: "AMCA International",
    year: "2016",
    title: "Standards Handbook — Publication 99-16",
    source: "Air Movement and Control Association International, Arlington Heights, IL",
    note: "Fan performance testing, system effect factors, and rating procedures — defines the H-Q curve measurement standard for fans.",
  },
  {
    type: "book",
    authors: "ASHRAE",
    year: "2021",
    title: "ASHRAE Handbook — Fundamentals",
    source: "American Society of Heating, Refrigerating and Air-Conditioning Engineers, Atlanta",
    details: "Chapter 21: Fans",
    note: "Fan system curves, operating point determination, duct system resistance, and fan selection for HVAC applications.",
  },
  {
    type: "book",
    authors: "Bleier, F.P.",
    year: "1998",
    title: "Fan Handbook: Selection, Application, and Design",
    source: "McGraw-Hill",
    note: "Fan H-Q characteristic curves, system resistance, surge and stall regions, and stable operating range determination.",
  },
];

// ─── Pressure Relief Valve Sizing ────────────────────────────────────────────
export const REFS_PRESSURE_RELIEF_VALVE: Reference[] = [
  {
    type: "standard",
    authors: "American Petroleum Institute",
    year: "2020",
    title: "Sizing, Selection, and Installation of Pressure-relieving Devices — Part I: Sizing and Selection",
    source: "API Standard 520, Part 1. 10th ed. American Petroleum Institute, Washington D.C.",
    note: "The primary engineering standard for sizing pressure relief valves for gas, vapour, liquid, and two-phase service. Defines the orifice area calculation, back-pressure correction factors, and certified flow coefficients Kd.",
  },
  {
    type: "standard",
    authors: "American Petroleum Institute",
    year: "2020",
    title: "Pressure-relieving and Depressuring Systems",
    source: "API Standard 521. 7th ed. American Petroleum Institute, Washington D.C.",
    note: "Relief system design basis — relieving scenarios, blocked outlet, fire case, utility failure, and selection of the controlling relief load.",
  },
  {
    type: "standard",
    authors: "American Society of Mechanical Engineers",
    year: "2023",
    title: "Boiler and Pressure Vessel Code, Section VIII, Division 1 — Pressure Relief Devices (UG-125 to UG-136)",
    source: "ASME BPVC VIII-1",
    note: "Code requirements for pressure relief valve installation on pressure vessels — set pressure limits, required capacity, and code compliance for certified devices.",
  },
  {
    type: "book",
    authors: "Leung, J.C.",
    year: "2004",
    title: "Pressure Relief System Design Using DIERS Technology",
    source: "AIChE — Design Institute for Emergency Relief Systems",
    note: "Two-phase and vapour pressure relief sizing methodology, reaction force calculation, and flare system back-pressure effects.",
  },
];

// ─── Series Pipe System ───────────────────────────────────────────────────────
// Total head loss = Σ(h_fi + Σh_minor_i)    Same Q through all sections
export const REFS_SERIES_PIPE: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 6: Series Pipe Systems",
    note: "Series pipe analysis using Darcy-Weisbach: total head loss is the sum of individual pipe and fitting losses. Continuity requires the same volumetric flow through each series section.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Cimbala, J.M.",
    year: "2014",
    title: "Fluid Mechanics: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "3rd ed. — Chapter 8: Series and Parallel Pipe Systems",
    note: "Series pipe system energy equation, effect of diameter and roughness changes, and iterative solution for unknown flow rate.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 8: Pipeline Systems",
    note: "Series pipeline design, head-loss calculation for multiple pipe segments, and graphical solution methods.",
  },
];

// ─── Parallel Pipe System ────────────────────────────────────────────────────
// Same head loss across each branch;  Q_total = Σ Q_i
export const REFS_PARALLEL_PIPE: Reference[] = [
  {
    type: "journal",
    authors: "Cross, H.",
    year: "1936",
    title: "Analysis of flow in networks of conduits or conductors",
    source: "University of Illinois Engineering Experiment Station, Bulletin No. 286",
    note: "Hardy Cross's original iterative method for solving pipe network flows — the fundamental numerical technique for parallel and looped pipe systems used in all water distribution modelling.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 6: Parallel Pipe Systems",
    note: "Parallel pipe system analysis: equal head loss across each branch, flow distribution by resistance, and the equivalent single-pipe representation.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Cimbala, J.M.",
    year: "2014",
    title: "Fluid Mechanics: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "3rd ed. — Chapter 8",
    note: "Parallel pipe head loss constraint and iterative flow distribution using Darcy-Weisbach.",
  },
];

// ─── Pipe Sizing (Velocity/Pressure Drop Method) ──────────────────────────────
export const REFS_PIPE_SIZING: Reference[] = [
  {
    type: "report",
    authors: "Crane Co.",
    year: "2011",
    title: "Flow of Fluids Through Valves, Fittings, and Pipe",
    source: "Technical Paper No. 410. Crane Co., Stamford, CT",
    note: "Pipe sizing nomographs and sizing procedures for liquids and gases — industry standard for selecting economic pipe diameter based on allowable pressure drop or velocity.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 6: Pipe Sizing",
    note: "Economic pipe diameter selection balancing capital cost (larger pipe) against operating cost (pumping energy), and velocity constraints for erosion-corrosion prevention.",
  },
  {
    type: "standard",
    authors: "American Society of Mechanical Engineers",
    year: "2022",
    title: "Process Piping",
    source: "ASME B31.3",
    note: "Velocity and pressure rating criteria for process piping — implicit maximum velocity constraints through erosion-corrosion allowances and material specifications.",
  },
  {
    type: "book",
    authors: "Nayyar, M.L.",
    year: "2000",
    title: "Piping Handbook",
    source: "McGraw-Hill",
    details: "7th ed. — Chapter B2: Pipe Sizing",
    note: "Recommended velocity ranges for liquids (1–3 m/s), gases (15–30 m/s), and steam (25–60 m/s) in process piping — practical sizing guidance used in engineering practice.",
  },
];

// ─── Hydraulic Gradient ───────────────────────────────────────────────────────
// HGL = z + P/(ρg)    EGL = z + P/(ρg) + V²/(2g)
export const REFS_HYDRAULIC_GRADIENT: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 3: Energy Grade Line and Hydraulic Grade Line",
    note: "Hydraulic grade line (HGL = piezometric head) and energy grade line (EGL = total head) — their construction, slope (= head loss per unit length), and significance in pipe system design.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 8: Energy and Hydraulic Grade Lines",
    note: "Graphical interpretation of energy losses, pump and turbine heads on the HGL/EGL, and pressure below atmospheric (siphon risk).",
  },
  {
    type: "book",
    authors: "Mays, L.W.",
    year: "2011",
    title: "Water Resources Engineering",
    source: "John Wiley & Sons",
    details: "2nd ed. — Chapter 3: Flow in Conduits",
    note: "Hydraulic gradient line in water distribution networks, pressure envelope analysis, and minimum residual pressure requirements.",
  },
];

// ─── Pipe Insulation Heat Loss ────────────────────────────────────────────────
// Q/L = 2π·k·(T_inner - T_outer) / ln(r_outer/r_inner)    (cylindrical shell)
export const REFS_PIPE_INSULATION: Reference[] = [
  {
    type: "book",
    authors: "Incropera, F.P., Dewitt, D.P., Bergman, T.L. & Lavine, A.S.",
    year: "2011",
    title: "Fundamentals of Heat and Mass Transfer",
    source: "John Wiley & Sons",
    details: "7th ed. — Chapter 3: One-Dimensional Steady-State Conduction — Cylindrical Systems",
    note: "Derivation of heat loss per unit length through a cylindrical insulation layer: Q/L = 2πk(T₁-T₂)/ln(r₂/r₁). Thermal resistance network for multi-layer insulation and convective boundaries.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A.",
    year: "2014",
    title: "Heat and Mass Transfer: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "5th ed. — Chapter 3: Steady Heat Conduction — Cylinders",
    note: "Cylindrical thermal resistance R = ln(r₂/r₁)/(2πkL), critical radius of insulation r_cr = k/h, and economic insulation thickness for pipe systems.",
  },
  {
    type: "standard",
    authors: "ASTM International",
    year: "2019",
    title: "Standard Practice for Estimate of the Heat Gain or Loss and the Surface Temperatures of Insulated Flat, Cylindrical, and Spherical Systems by Use of Computer Programs",
    source: "ASTM C680",
    note: "Standard calculation method for pipe insulation heat loss — used for energy auditing and insulation specification in process and HVAC piping.",
  },
  {
    type: "book",
    authors: "ASHRAE",
    year: "2021",
    title: "ASHRAE Handbook — Fundamentals",
    source: "American Society of Heating, Refrigerating and Air-Conditioning Engineers, Atlanta",
    details: "Chapter 26: Insulation for Mechanical Systems",
    note: "Insulation thickness selection for pipe systems, thermal conductivity of insulation materials, and condensation prevention criteria.",
  },
];

// ─── Pipe Schedule Reference ──────────────────────────────────────────────────
export const REFS_PIPE_SCHEDULE: Reference[] = [
  {
    type: "standard",
    authors: "American Society of Mechanical Engineers",
    year: "2015",
    title: "Welded and Seamless Wrought Steel Pipe",
    source: "ASME B36.10M",
    note: "Dimensional standards for carbon steel and alloy steel pipe — nominal pipe sizes, wall thickness schedules (5S through XXS), outside diameters, and pipe weights per ASME B36.10M.",
  },
  {
    type: "standard",
    authors: "American Society of Mechanical Engineers",
    year: "2018",
    title: "Stainless Steel Pipe",
    source: "ASME B36.19M",
    note: "Dimensional standards for austenitic stainless steel pipe — nominal sizes, schedule designations (5S, 10S, 40S, 80S), and outside diameters per ASME B36.19M.",
  },
  {
    type: "book",
    authors: "Nayyar, M.L.",
    year: "2000",
    title: "Piping Handbook",
    source: "McGraw-Hill",
    details: "7th ed. — Appendix: Pipe Dimensions and Weights",
    note: "Comprehensive pipe schedule data for carbon steel, stainless steel, and alloy pipe across all NPS sizes and schedule designations.",
  },
];

// ─── Flow Through Porous Media ────────────────────────────────────────────────
// Darcy: q = -(k/μ)·∇P     Ergun: ΔP/L = 150μV(1-ε)²/(d_p²ε³) + 1.75ρV²(1-ε)/(d_p·ε³)
export const REFS_FLOW_POROUS_MEDIA: Reference[] = [
  {
    type: "book",
    authors: "Darcy, H.",
    year: "1856",
    title: "Les Fontaines Publiques de la Ville de Dijon",
    source: "Victor Dalmont, Paris",
    note: "Original publication establishing Darcy's law for flow through porous media: q = -(k/μ)·(dP/dz). Darcy derived this experimentally from filter sand columns — the foundation of groundwater and porous media hydraulics.",
  },
  {
    type: "journal",
    authors: "Ergun, S.",
    year: "1952",
    title: "Fluid flow through packed columns",
    source: "Chemical Engineering Progress",
    details: "Vol. 48, pp. 89–94",
    note: "Ergun equation for pressure drop through packed beds — combines viscous (Blake-Kozeny) and inertial (Burke-Plummer) terms into a single correlation valid across all flow regimes.",
  },
  {
    type: "book",
    authors: "Bear, J.",
    year: "1972",
    title: "Dynamics of Fluids in Porous Media",
    source: "American Elsevier, New York",
    note: "The definitive theoretical reference for porous media flow — permeability, porosity, Darcy's law in 3D, non-Darcy flow, and dispersion. Used in groundwater, petroleum, and filtration engineering.",
  },
  {
    type: "book",
    authors: "McCabe, W.L., Smith, J.C. & Harriott, P.",
    year: "2005",
    title: "Unit Operations of Chemical Engineering",
    source: "McGraw-Hill",
    details: "7th ed. — Chapter 7: Flow Through Beds of Solids",
    note: "Ergun equation application to packed bed reactors, pressure drop in filter beds, and fluidisation — the standard chemical engineering treatment.",
  },
];

// ─── Pipe Roughness Reference ─────────────────────────────────────────────────
export const REFS_PIPE_ROUGHNESS: Reference[] = [
  {
    type: "journal",
    authors: "Moody, L.F.",
    year: "1944",
    title: "Friction factors for pipe flow",
    source: "Transactions of the ASME",
    details: "Vol. 66, pp. 671–684",
    note: "Moody's tabulated roughness values for commercial pipes (ε) — new wrought iron 0.046 mm, concrete 0.3–3 mm, etc. — remain the engineering standard for roughness selection.",
  },
  {
    type: "journal",
    authors: "Nikuradse, J.",
    year: "1933",
    title: "Strömungsgesetze in rauhen Rohren (Laws of flow in rough pipes)",
    source: "VDI-Forschungsheft",
    details: "No. 361 (English translation: NACA TM 1292, 1950)",
    note: "Original sand-roughness experiments — the experimental basis for all pipe roughness correlations. Defines the fully rough, transitional, and hydraulically smooth flow regimes.",
  },
  {
    type: "report",
    authors: "Crane Co.",
    year: "2011",
    title: "Flow of Fluids Through Valves, Fittings, and Pipe",
    source: "Technical Paper No. 410. Crane Co., Stamford, CT",
    details: "Appendix A: Physical Properties of Fluids and Flow Characteristics of Valves, Fittings and Pipe",
    note: "Tabulated absolute roughness values for commercial pipe materials — new steel, galvanised iron, cast iron, concrete, plastic — used directly in Colebrook-White calculation.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Table 6.1: Roughness Values for Various Pipe Materials",
    note: "Commonly cited roughness table for engineering calculations covering steel, galvanised iron, cast iron, copper, drawn tubing, plastic, and concrete.",
  },
];

// ─── Pipe Network Analysis (Hardy-Cross / Newton-Raphson) ────────────────────
export const REFS_PIPE_NETWORK: Reference[] = [
  {
    type: "report",
    authors: "Cross, H.",
    year: "1936",
    title: "Analysis of flow in networks of conduits or conductors",
    source: "University of Illinois Engineering Experiment Station, Bulletin No. 286",
    note: "Hardy Cross's original iterative method for looped pipe networks — the basis of all manual pipe network analysis and the foundation for modern water distribution simulation software (EPANET, WaterGEMS).",
  },
  {
    type: "book",
    authors: "Mays, L.W.",
    year: "2011",
    title: "Water Resources Engineering",
    source: "John Wiley & Sons",
    details: "2nd ed. — Chapter 3: Water Distribution Systems",
    note: "Hardy-Cross and Newton-Raphson methods for pipe network analysis, pressure constraints, and demand allocation in water distribution networks.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 6: Pipe Networks",
    note: "Node continuity equations, loop head-loss equations, and iterative solution for flow distribution in looped and branching pipe systems.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Cimbala, J.M.",
    year: "2014",
    title: "Fluid Mechanics: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "3rd ed. — Chapter 8: Pipe Networks",
    note: "Pipe network governing equations, equivalent resistance method, and worked examples for branching and looped systems.",
  },
];

// ─── Reference Tables (fluid properties, pipe roughness, compressible flow) ──
// Covers all 11 data tables on the /tables page
export const REFS_TABLES: Reference[] = [
  // ── Fluid Properties — Water ──────────────────────────────────────────────
  {
    type: "book",
    authors: "Incropera, F.P., Dewitt, D.P., Bergman, T.L. & Lavine, A.S.",
    year: "2011",
    title: "Fundamentals of Heat and Mass Transfer",
    source: "John Wiley & Sons",
    details: "7th ed. — Table A.4 (Air) and Table A.6 (Water): Thermophysical properties",
    note: "Primary source for water and air thermophysical properties (density, dynamic viscosity, specific heat, thermal conductivity, Prandtl number) across the temperature range 0–300 °C.",
  },
  {
    type: "online",
    authors: "National Institute of Standards and Technology (NIST)",
    year: "2023",
    title: "NIST Chemistry WebBook — Thermophysical Properties of Fluid Systems",
    source: "U.S. Department of Commerce, National Institute of Standards and Technology",
    details: "https://webbook.nist.gov/chemistry/fluid/",
    note: "Authoritative source for cross-checking water, air, and common fluid thermophysical properties. All tabulated values traceable to NIST equations of state.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Appendix A: Physical Properties of Fluids (Tables A.1–A.5)",
    note: "Properties of water, seawater, air, common gases and liquids, and pipe roughness at standard conditions.",
  },
  // ── Pipe Roughness ────────────────────────────────────────────────────────
  {
    type: "journal",
    authors: "Moody, L.F.",
    year: "1944",
    title: "Friction factors for pipe flow",
    source: "Transactions of the ASME",
    details: "Vol. 66, pp. 671–684",
    note: "Absolute roughness (ε) values for commercial pipe materials — new wrought iron 0.046 mm, galvanised iron 0.15 mm, cast iron 0.26 mm, concrete 0.3–3 mm — still the standard reference used in the roughness table.",
  },
  {
    type: "report",
    authors: "Crane Co.",
    year: "2011",
    title: "Flow of Fluids Through Valves, Fittings, and Pipe",
    source: "Technical Paper No. 410. Crane Co., Stamford, CT",
    details: "Appendix A: Physical Properties of Fluids and Flow Characteristics of Valves, Fittings, and Pipe",
    note: "Tabulated absolute roughness for commercial pipe materials and minor loss K-factors for standard fittings — both roughness and minor loss tables on this page draw on this source.",
  },
  // ── Minor Losses ──────────────────────────────────────────────────────────
  {
    type: "book",
    authors: "Idelchik, I.E.",
    year: "1994",
    title: "Handbook of Hydraulic Resistance",
    source: "Begell House, New York",
    details: "3rd ed.",
    note: "Authoritative source for K-factors for entrances, exits, expansions, contractions, bends, and valves — the primary reference for the minor loss coefficient table.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Cimbala, J.M.",
    year: "2014",
    title: "Fluid Mechanics: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "3rd ed. — Table 8-3: Loss Coefficients for Pipe Components",
    note: "Minor loss coefficients for common pipe fittings including elbows, tees, valves, entrances, and exits.",
  },
  // ── Manning's n ───────────────────────────────────────────────────────────
  {
    type: "book",
    authors: "Chow, V.T.",
    year: "1959",
    title: "Open-Channel Hydraulics",
    source: "McGraw-Hill, New York",
    details: "Tables 5-5 and 5-6: Values of Manning's n",
    note: "The most comprehensive and widely cited Manning's n tables — covers artificial channels (concrete, brick, corrugated metal), natural channels, and floodplain values. Primary source for the Manning's n reference table.",
  },
  {
    type: "journal",
    authors: "Manning, R.",
    year: "1891",
    title: "On the flow of water in open channels and pipes",
    source: "Transactions of the Institution of Civil Engineers of Ireland",
    details: "Vol. 20, pp. 161–207",
    note: "Original publication of the Manning formula — the theoretical basis for all Manning's n values tabulated here.",
  },
  // ── ISA Standard Atmosphere ───────────────────────────────────────────────
  {
    type: "standard",
    authors: "International Organization for Standardization",
    year: "1975",
    title: "Standard Atmosphere",
    source: "ISO 2533:1975",
    note: "Defines the International Standard Atmosphere (ISA): sea-level T = 288.15 K, P = 101.325 kPa, lapse rate 6.5 K/km to 11 km (tropopause), isothermal stratosphere to 20 km. The definitive source for all ISA table values.",
  },
  {
    type: "report",
    authors: "International Civil Aviation Organization (ICAO)",
    year: "1993",
    title: "Manual of the ICAO Standard Atmosphere",
    source: "ICAO Doc 7488/3, 3rd ed.",
    note: "Aviation reference for the Standard Atmosphere — identical to ISO 2533 but with extended tables to 80 km altitude. Used by aerospace engineers for altitude-density calculations.",
  },
  // ── Isentropic Flow, Normal Shock, Fanno, Rayleigh ───────────────────────
  {
    type: "book",
    authors: "Shapiro, A.H.",
    year: "1953",
    title: "The Dynamics and Thermodynamics of Compressible Fluid Flow",
    source: "Ronald Press, New York",
    details: "Vol. 1 — Appendix A: Isentropic, Normal Shock, Fanno, and Rayleigh Flow Tables (γ = 1.4)",
    note: "The definitive compressible flow tables for γ = 1.4 — isentropic flow (T/T₀, P/P₀, A/A*), normal shock (M₂, P₂/P₁, P₀₂/P₀₁), Fanno flow (4fL*/D, P/P*, T/T*), and Rayleigh flow (T₀/T₀*, P/P*). All four compressible flow tables on this page are derived from the analytical relations published in this work.",
  },
  {
    type: "book",
    authors: "Anderson, J.D.",
    year: "2003",
    title: "Modern Compressible Flow: With Historical Perspective",
    source: "McGraw-Hill",
    details: "3rd ed. — Appendix A: Isentropic, Fanno, Rayleigh, and Normal Shock Tables",
    note: "Cross-reference for all compressible flow tables — values computed from the exact analytical relations for γ = 1.4 calorically perfect gas.",
  },
];

// ════════════════════════════════════════════════════════════════════════════════
// DESIGN TOOLS
// ════════════════════════════════════════════════════════════════════════════════

// ─── Pipe System Design ───────────────────────────────────────────────────────
// Darcy-Weisbach + Colebrook-White friction · K-factor minor losses ·
// Pump system curve · ZAR cost estimation
export const REFS_PIPE_SYSTEM_DESIGN: Reference[] = [
  {
    type: "journal",
    authors: "Colebrook, C.F.",
    year: "1939",
    title: "Turbulent flow in pipes, with particular reference to the transition region between the smooth and rough pipe laws",
    source: "Journal of the Institution of Civil Engineers",
    details: "Vol. 11, No. 4, pp. 133–156",
    note: "Colebrook-White implicit equation for Darcy friction factor — used iteratively for all pipe friction calculations in this tool.",
  },
  {
    type: "journal",
    authors: "Moody, L.F.",
    year: "1944",
    title: "Friction factors for pipe flow",
    source: "Transactions of the ASME",
    details: "Vol. 66, pp. 671–684",
    note: "Moody diagram and pipe roughness data (ε) for commercial pipe materials — basis for friction factor and pipe roughness selection.",
  },
  {
    type: "report",
    authors: "Crane Co.",
    year: "2011",
    title: "Flow of Fluids Through Valves, Fittings, and Pipe",
    source: "Technical Paper No. 410. Crane Co., Stamford, CT",
    note: "K-factor resistance coefficients for all pipe fittings — elbows, tees, reducers, valves, entrances, and exits — used for minor loss calculation throughout.",
  },
  {
    type: "book",
    authors: "Idelchik, I.E.",
    year: "1994",
    title: "Handbook of Hydraulic Resistance",
    source: "Begell House, New York",
    details: "3rd ed.",
    note: "Supplementary loss coefficients for fittings and transitions not covered by Crane TP 410.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 6: Pipe Systems with Minor Losses; Chapter 11: Pump-System Curve",
    note: "Combined major and minor loss analysis, pump system curve H = H_static + R·Q², and operating point determination by intersection with pump H-Q curve.",
  },
  {
    type: "book",
    authors: "Gülich, J.F.",
    year: "2010",
    title: "Centrifugal Pumps",
    source: "Springer",
    details: "2nd ed. — Chapter 11: Operation of Centrifugal Pumps",
    note: "Pump operating point on the system curve, stability criteria, and de-rating for off-BEP operation — used for pump selection guidance in the design tool.",
  },
];

// ════════════════════════════════════════════════════════════════════════════════
// REMAINING CALCULATORS — added in bulk review pass
// ════════════════════════════════════════════════════════════════════════════════

// ─── Continuity Equation (Mass Conservation) ──────────────────────────────────
// ṁ = ρ₁A₁V₁ = ρ₂A₂V₂   (steady, 1D)
export const REFS_CONTINUITY: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 3: Integral Relations — Conservation of Mass",
    note: "Derivation of the continuity equation from the Reynolds Transport Theorem for steady and unsteady, compressible and incompressible flow.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 5: Finite Control Volume Analysis — Conservation of Mass",
    note: "Integral form of the continuity equation, pipe flow continuity (A₁V₁ = A₂V₂ for incompressible), and worked examples.",
  },
  {
    type: "book",
    authors: "Fox, R.W., McDonald, A.T. & Pritchard, P.J.",
    year: "2011",
    title: "Introduction to Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "8th ed. — Chapter 4: Basic Equations in Integral Form",
    note: "Reynolds Transport Theorem applied to mass conservation — steady and unsteady forms.",
  },
];

// ─── Reynolds Number — External Flow ─────────────────────────────────────────
// Re_L = ρVL/μ  (L = characteristic length: plate length, cylinder diameter, etc.)
export const REFS_REYNOLDS_EXTERNAL: Reference[] = [
  {
    type: "journal",
    authors: "Reynolds, O.",
    year: "1883",
    title: "An experimental investigation of the circumstances which determine whether the motion of water shall be direct or sinuous, and of the law of resistance in parallel channels",
    source: "Philosophical Transactions of the Royal Society of London",
    details: "Vol. 174, pp. 935–982",
    note: "Original paper establishing the Reynolds number — applies equally to internal and external flow as the ratio of inertial to viscous forces.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 7: External Viscous Flow",
    note: "Reynolds number for external flow over flat plates, cylinders, and spheres. Regime thresholds differ from internal flow: transition at Re_L ≈ 5×10⁵ for flat plates.",
  },
  {
    type: "book",
    authors: "Schlichting, H. & Gersten, K.",
    year: "2017",
    title: "Boundary Layer Theory",
    source: "Springer",
    details: "13th ed. — Chapter 2: Fundamentals of Boundary Layer Theory",
    note: "Reynolds number in the context of boundary layer development over external surfaces — local and average Re for laminar and turbulent regimes.",
  },
];

// ─── Pitot Tube ───────────────────────────────────────────────────────────────
// V = √(2(P_stag − P_static)/ρ)
export const REFS_PITOT_TUBE: Reference[] = [
  {
    type: "journal",
    authors: "Pitot, H.",
    year: "1732",
    title: "Description d'une machine pour mesurer la vitesse des eaux courantes et le sillage des vaisseaux",
    source: "Histoire de l'Académie Royale des Sciences, Paris",
    note: "Original description of the Pitot tube by Henri Pitot — measurement of flow velocity by converting kinetic energy to stagnation pressure at the tube entrance.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 3: Pitot Tube and Pressure Measurement",
    note: "Derivation of Pitot tube velocity from Bernoulli's equation between the free-stream and stagnation point. Compressibility correction for Ma > 0.3.",
  },
  {
    type: "standard",
    authors: "International Organization for Standardization",
    year: "2003",
    title: "Measurement of fluid flow by means of pressure differential devices — Part 1: General principles",
    source: "ISO 5167-1",
    note: "Standards context for pressure-differential flow measurement including Pitot tubes.",
  },
];

// ─── Torricelli's Theorem ─────────────────────────────────────────────────────
// V_efflux = √(2gh)  (velocity of efflux from a tank orifice at depth h)
export const REFS_TORRICELLI: Reference[] = [
  {
    type: "book",
    authors: "Torricelli, E.",
    year: "1644",
    title: "Opera Geometrica",
    source: "Typis Amatoris Massae & Laurentii de Landis, Florence",
    note: "Original publication establishing the efflux velocity law: fluid exits a tank orifice at the same speed a body acquires falling freely from the same height — the first application of energy conservation to fluid flow.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 3: Bernoulli Equation — Torricelli's Theorem",
    note: "Torricelli's theorem as a direct application of Bernoulli's equation between the free surface and the orifice exit.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 3: Bernoulli Equation Applications",
    note: "Efflux velocity derivation and the effect of the vena contracta on the actual discharge flow rate.",
  },
];

// ─── Pressure Types (Dynamic, Static, Total) and Velocity Head ────────────────
// q = ½ρV²  (dynamic)   P_total = P_static + ½ρV²   h_v = V²/2g
export const REFS_PRESSURE_TYPES: Reference[] = [
  {
    type: "book",
    authors: "Bernoulli, D.",
    year: "1738",
    title: "Hydrodynamica",
    source: "Johann Reinhold Dulsecker, Strasbourg",
    note: "Original work establishing the relationship between static pressure and fluid velocity — the theoretical basis for dynamic pressure, total pressure, and velocity head.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 3: Bernoulli Equation; Chapter 8: Pitot Tube and Pressure Probes",
    note: "Definitions and measurement of static pressure, dynamic pressure q = ½ρV², total (stagnation) pressure P₀ = P + ½ρV², and velocity head V²/2g.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 3: The Bernoulli Equation",
    note: "Pressure components in flowing fluids, velocity head, and the energy interpretation of Bernoulli's equation.",
  },
];

// ─── Pipe Flow Rate ───────────────────────────────────────────────────────────
// Q = V·A = V·πD²/4
export const REFS_PIPE_FLOW_RATE: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 6: Viscous Flow in Ducts",
    note: "Volumetric flow rate from mean velocity and cross-section area, continuity equation applied to pipe flow, and relationship between Q, V, and D.",
  },
  {
    type: "book",
    authors: "Munson, B.R., Young, D.F., Okiishi, T.H. & Huebsch, W.W.",
    year: "2009",
    title: "Fundamentals of Fluid Mechanics",
    source: "John Wiley & Sons",
    details: "6th ed. — Chapter 8: Viscous Flow in Pipes",
    note: "Flow rate–velocity–diameter relationships for fully developed pipe flow, including average velocity from the velocity profile.",
  },
];

// ─── Mass Flow Rate ───────────────────────────────────────────────────────────
// ṁ = ρ·V·A = ρ·Q
export const REFS_MASS_FLOW_RATE: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 3: Conservation of Mass",
    note: "Mass flow rate ṁ = ρVA as the fundamental form of continuity. Relationship between volumetric and mass flow for compressible and incompressible flow.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Boles, M.A.",
    year: "2015",
    title: "Thermodynamics: An Engineering Approach",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 5: Mass and Energy Analysis of Control Volumes",
    note: "Mass flow rate in the context of the first law of thermodynamics for open systems — steady-flow energy equation.",
  },
];

// ─── Tank Volume ──────────────────────────────────────────────────────────────
export const REFS_TANK_VOLUME: Reference[] = [
  {
    type: "standard",
    authors: "American Petroleum Institute",
    year: "2021",
    title: "Welded Tanks for Oil Storage",
    source: "API Standard 650, 13th ed.",
    note: "Standard for petroleum storage tanks — defines cylindrical (vertical and horizontal), conical, and dome-roof tank geometries used in process industry volume calculations.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Cimbala, J.M.",
    year: "2014",
    title: "Fluid Mechanics: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "3rd ed. — Chapter 2: Properties of Fluids",
    note: "Volume calculations for standard geometric shapes used in fluid storage — cylinders, spheres, cones, and composite heads (ellipsoidal, hemispherical, torispherical).",
  },
];

// ─── Cavitation Number ────────────────────────────────────────────────────────
// σ = (P − Pv) / (½ρV²)
export const REFS_CAVITATION_NUMBER: Reference[] = [
  {
    type: "book",
    authors: "Brennen, C.E.",
    year: "1995",
    title: "Cavitation and Bubble Dynamics",
    source: "Oxford University Press",
    note: "Cavitation number σ as the primary similarity parameter for cavitating flows — its physical interpretation, critical values for inception, and applications to pumps, propellers, and valves.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 1: Pressure and Cavitation",
    note: "Cavitation inception, vapour pressure, and the cavitation number as a dimensionless measure of the tendency of a flow to cavitate.",
  },
  {
    type: "book",
    authors: "Gülich, J.F.",
    year: "2010",
    title: "Centrifugal Pumps",
    source: "Springer",
    details: "2nd ed. — Chapter 6: Suction Capability and Cavitation",
    note: "Cavitation number in the context of pump NPSH, cavitation erosion, and the relationship between σ and NPSH₃ for centrifugal pumps.",
  },
];

// ─── Area Ratio (Compressible Nozzle) ────────────────────────────────────────
export const REFS_AREA_RATIO: Reference[] = [
  {
    type: "book",
    authors: "Anderson, J.D.",
    year: "2003",
    title: "Modern Compressible Flow: With Historical Perspective",
    source: "McGraw-Hill",
    details: "3rd ed. — Chapter 5: Quasi-One-Dimensional Flow",
    note: "Area-velocity relation for isentropic duct flow — explains why subsonic flow decelerates and supersonic flow accelerates with increasing area. Derives the critical area ratio A/A*.",
  },
  {
    type: "book",
    authors: "Shapiro, A.H.",
    year: "1953",
    title: "The Dynamics and Thermodynamics of Compressible Fluid Flow",
    source: "Ronald Press, New York",
    details: "Vol. 1",
    note: "Area-Mach number relation for isentropic nozzle and diffuser flows.",
  },
];

// ─── Flow Work ────────────────────────────────────────────────────────────────
// w_flow = P/ρ = Pv  (work done by pressure forces moving fluid across a boundary)
export const REFS_FLOW_WORK: Reference[] = [
  {
    type: "book",
    authors: "Cengel, Y.A. & Boles, M.A.",
    year: "2015",
    title: "Thermodynamics: An Engineering Approach",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 5: Mass and Energy Analysis of Control Volumes",
    note: "Flow work (Pv) as the energy required to push fluid into or out of a control volume — combined with internal energy to give enthalpy h = u + Pv in the steady-flow energy equation.",
  },
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 3: Energy Equation for Steady Flow",
    note: "Flow work in the Bernoulli and energy equations — the P/ρ term representing pressure energy per unit mass.",
  },
];

// ─── Heat Transfer Dimensionless Numbers ──────────────────────────────────────
// Covers: Nusselt (Nu), Prandtl (Pr), Grashof (Gr), Rayleigh (Ra),
//         Dittus-Boelter correlation, Natural Convection, NTU-Effectiveness
export const REFS_HEAT_TRANSFER_NUMBERS: Reference[] = [
  {
    type: "book",
    authors: "Incropera, F.P., Dewitt, D.P., Bergman, T.L. & Lavine, A.S.",
    year: "2011",
    title: "Fundamentals of Heat and Mass Transfer",
    source: "John Wiley & Sons",
    details: "7th ed. — Chapters 7–9 (external/internal convection) and Chapter 9 (free convection)",
    note: "Primary reference for Nu, Pr, Gr, Ra, and their correlations. Defines the Dittus-Boelter equation (Nu = 0.023 Re⁰·⁸ Prⁿ), Nusselt for free convection, and NTU-effectiveness method for heat exchangers.",
  },
  {
    type: "journal",
    authors: "Nusselt, W.",
    year: "1915",
    title: "Das Grundgesetz des Wärmeüberganges",
    source: "Gesundheits-Ingenieur",
    details: "Vol. 38, Nos. 42 & 43",
    note: "Original paper introducing the Nusselt number Nu = hL/k as the dimensionless heat transfer coefficient — the fundamental similarity parameter for convective heat transfer.",
  },
  {
    type: "journal",
    authors: "Dittus, F.W. & Boelter, L.M.K.",
    year: "1930",
    title: "Heat transfer in automobile radiators of the tubular type",
    source: "University of California Publications in Engineering",
    details: "Vol. 2, pp. 443–461",
    note: "Original publication of the Dittus-Boelter correlation Nu = 0.023 Re⁰·⁸ Prⁿ (n=0.4 heating, n=0.3 cooling) — the most widely used correlation for turbulent forced convection in pipes.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A.",
    year: "2014",
    title: "Heat and Mass Transfer: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "5th ed. — Chapters 8–9",
    note: "Grashof and Rayleigh numbers for natural convection: Gr = gβΔTL³/ν², Ra = Gr·Pr. Churchill-Chu correlations for vertical plates and cylinders.",
  },
  {
    type: "book",
    authors: "Shah, R.K. & Sekulic, D.P.",
    year: "2003",
    title: "Fundamentals of Heat Exchanger Design",
    source: "John Wiley & Sons",
    details: "Chapter 3: NTU-Effectiveness Method",
    note: "NTU = UA/C_min, effectiveness ε = Q_actual/Q_max — the NTU-effectiveness method for heat exchanger sizing and rating.",
  },
];

// ─── Mass Transfer Dimensionless Numbers ──────────────────────────────────────
// Covers: Lewis (Le), Schmidt (Sc), Sherwood (Sh), Péclet (Pe)
export const REFS_MASS_TRANSFER_NUMBERS: Reference[] = [
  {
    type: "book",
    authors: "Incropera, F.P., Dewitt, D.P., Bergman, T.L. & Lavine, A.S.",
    year: "2011",
    title: "Fundamentals of Heat and Mass Transfer",
    source: "John Wiley & Sons",
    details: "7th ed. — Chapter 6: Introduction to Convection; Chapter 14: Diffusion Mass Transfer",
    note: "Definitions of Schmidt (Sc = ν/D_AB), Sherwood (Sh = h_m·L/D_AB), Lewis (Le = α/D_AB = Sc/Pr), and Péclet (Pe = Re·Sc) numbers. Heat-mass transfer analogy linking Nu, Sh, Pr, and Sc.",
  },
  {
    type: "book",
    authors: "Bird, R.B., Stewart, W.E. & Lightfoot, E.N.",
    year: "2002",
    title: "Transport Phenomena",
    source: "John Wiley & Sons",
    details: "2nd ed. — Chapter 17: Diffusivity and the Mechanisms of Mass Transport",
    note: "The classic chemical engineering reference for mass transfer dimensionless numbers — rigorous derivation from the governing transport equations using the analogy between momentum, heat, and mass transfer.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A.",
    year: "2014",
    title: "Heat and Mass Transfer: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "5th ed. — Chapter 14: Mass Transfer",
    note: "Engineering applications of Schmidt, Sherwood, and Lewis numbers — evaporation, absorption, and mass transfer in boundary layers.",
  },
];

// ─── Fin Efficiency ───────────────────────────────────────────────────────────
export const REFS_FIN_EFFICIENCY: Reference[] = [
  {
    type: "book",
    authors: "Incropera, F.P., Dewitt, D.P., Bergman, T.L. & Lavine, A.S.",
    year: "2011",
    title: "Fundamentals of Heat and Mass Transfer",
    source: "John Wiley & Sons",
    details: "7th ed. — Chapter 3: Extended Surfaces (Fins)",
    note: "Fin efficiency η_f = Q_fin / Q_fin,max — derivation for straight, annular, and pin fins. Fin effectiveness ε_f and the overall surface efficiency for finned surfaces.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A.",
    year: "2014",
    title: "Heat and Mass Transfer: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "5th ed. — Chapter 3: Steady Heat Conduction — Fins",
    note: "Efficiency charts for rectangular, triangular, and annular fins. The fin parameter m = √(hP/kA_c) and its role in fin performance.",
  },
  {
    type: "book",
    authors: "Shah, R.K. & Sekulic, D.P.",
    year: "2003",
    title: "Fundamentals of Heat Exchanger Design",
    source: "John Wiley & Sons",
    note: "Overall surface efficiency for heat exchanger finned surfaces: η_o = 1 − (A_f/A)(1 − η_f). Used in the design of compact heat exchangers.",
  },
];

// ─── Fouling Factor ───────────────────────────────────────────────────────────
export const REFS_FOULING_FACTOR: Reference[] = [
  {
    type: "standard",
    authors: "Tubular Exchanger Manufacturers Association (TEMA)",
    year: "2007",
    title: "Standards of the Tubular Exchanger Manufacturers Association",
    source: "9th ed. TEMA, Tarrytown, NY",
    note: "Table RGP-T-2.4: Fouling resistances (Rf) for a wide range of process fluids, cooling water, steam, and hydrocarbon streams. The industry standard source for fouling factor values.",
  },
  {
    type: "book",
    authors: "Shah, R.K. & Sekulic, D.P.",
    year: "2003",
    title: "Fundamentals of Heat Exchanger Design",
    source: "John Wiley & Sons",
    details: "Chapter 3: Thermal Design Theory",
    note: "Fouling resistance R_f incorporated into the overall heat transfer coefficient: 1/U = 1/h_i + R_fi + t/k_w + R_fo + 1/h_o.",
  },
  {
    type: "book",
    authors: "Incropera, F.P., Dewitt, D.P., Bergman, T.L. & Lavine, A.S.",
    year: "2011",
    title: "Fundamentals of Heat and Mass Transfer",
    source: "John Wiley & Sons",
    details: "7th ed. — Chapter 11: Table 11.1 Representative fouling factors",
    note: "Fouling resistance values for common engineering fluids — seawater, river water, fuel oil, steam, and refrigerants.",
  },
];

// ─── Overall Heat Transfer Coefficient ───────────────────────────────────────
// 1/U·A = 1/h_i·A_i + R_fi/A_i + t/k·A_lm + R_fo/A_o + 1/h_o·A_o
export const REFS_OVERALL_HTC: Reference[] = [
  {
    type: "book",
    authors: "Incropera, F.P., Dewitt, D.P., Bergman, T.L. & Lavine, A.S.",
    year: "2011",
    title: "Fundamentals of Heat and Mass Transfer",
    source: "John Wiley & Sons",
    details: "7th ed. — Chapter 11: Heat Exchangers — Overall Heat Transfer Coefficient",
    note: "Thermal resistance network for the overall heat transfer coefficient including convective resistances (1/hA) on both sides, wall conduction (t/kA), and fouling resistances.",
  },
  {
    type: "book",
    authors: "Shah, R.K. & Sekulic, D.P.",
    year: "2003",
    title: "Fundamentals of Heat Exchanger Design",
    source: "John Wiley & Sons",
    note: "Overall conductance UA for shell-and-tube, plate, and compact heat exchangers — accounting for geometry, wall resistance, and fouling on both sides.",
  },
];

// ─── Thermal Resistance ───────────────────────────────────────────────────────
// R_cond = L/kA   R_conv = 1/hA   R_rad = 1/(h_r·A)
export const REFS_THERMAL_RESISTANCE: Reference[] = [
  {
    type: "book",
    authors: "Incropera, F.P., Dewitt, D.P., Bergman, T.L. & Lavine, A.S.",
    year: "2011",
    title: "Fundamentals of Heat and Mass Transfer",
    source: "John Wiley & Sons",
    details: "7th ed. — Chapter 3: Thermal Resistance Networks",
    note: "Series and parallel thermal resistance networks for composite walls, cylinders, and spheres. Contact resistance at interfaces and the concept of overall conductance.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A.",
    year: "2014",
    title: "Heat and Mass Transfer: Fundamentals and Applications",
    source: "McGraw-Hill Education",
    details: "5th ed. — Chapter 3: Steady Heat Conduction",
    note: "Thermal circuit analogy (heat flow = ΔT/R_total), conduction and convection resistances, and practical worked examples for building walls and pipe insulation.",
  },
];

// ─── Hydraulic Cylinder ───────────────────────────────────────────────────────
// F = P·A   P = F/A   extension/retraction force difference due to rod area
export const REFS_HYDRAULIC_CYLINDER: Reference[] = [
  {
    type: "book",
    authors: "White, F.M.",
    year: "2016",
    title: "Fluid Mechanics",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 2: Pascal's Law and Hydraulic Devices",
    note: "Pascal's principle: pressure applied to a confined fluid is transmitted equally in all directions — the basis for hydraulic cylinder force F = P·A.",
  },
  {
    type: "book",
    authors: "Merritt, H.E.",
    year: "1967",
    title: "Hydraulic Control Systems",
    source: "John Wiley & Sons",
    note: "Hydraulic cylinder force, velocity, and flow rate relationships including the differential area effect (extension vs. retraction) — the classic reference for hydraulic systems engineering.",
  },
  {
    type: "standard",
    authors: "International Organization for Standardization",
    year: "2012",
    title: "Hydraulic fluid power — Single rod cylinders, 16 MPa (160 bar) series — Mounting dimensions",
    source: "ISO 6020-1",
    note: "Standard mounting dimensions and pressure ratings for hydraulic cylinders — reference for standard bore diameters and rod diameters used in practice.",
  },
];

// ─── Psychrometrics ───────────────────────────────────────────────────────────
export const REFS_PSYCHROMETRIC: Reference[] = [
  {
    type: "book",
    authors: "ASHRAE",
    year: "2021",
    title: "ASHRAE Handbook — Fundamentals",
    source: "American Society of Heating, Refrigerating and Air-Conditioning Engineers, Atlanta",
    details: "Chapter 1: Psychrometrics",
    note: "The primary engineering reference for psychrometrics — definitions and equations for dry-bulb temperature, wet-bulb temperature, dew point, specific humidity, relative humidity, enthalpy, and the psychrometric chart.",
  },
  {
    type: "book",
    authors: "Cengel, Y.A. & Boles, M.A.",
    year: "2015",
    title: "Thermodynamics: An Engineering Approach",
    source: "McGraw-Hill Education",
    details: "8th ed. — Chapter 14: Gas-Vapor Mixtures and Air-Conditioning",
    note: "Psychrometric relationships derived from thermodynamics: humidity ratio ω = m_vapor/m_air, relative humidity φ = P_v/P_sat, and the adiabatic saturation process.",
  },
];

// ─── Unit Converter ───────────────────────────────────────────────────────────
// Covers all 24 categories: SI base units, derived units, and imperial/US customary
export const REFS_CONVERTER: Reference[] = [
  {
    type: "report",
    authors: "Thompson, A. & Taylor, B.N.",
    year: "2008",
    title: "Guide for the Use of the International System of Units (SI)",
    source: "NIST Special Publication 811, National Institute of Standards and Technology, Gaithersburg, MD",
    note: "The primary reference for all SI-based conversion factors used in this converter — exact definitions for SI prefixes, derived units, and conversion factors between SI and non-SI units (imperial, US customary). Includes pressure, viscosity, flow rate, energy, and power conversions.",
  },
  {
    type: "book",
    authors: "Bureau International des Poids et Mesures (BIPM)",
    year: "2019",
    title: "The International System of Units (SI)",
    source: "9th edition. BIPM, Sèvres, France",
    details: "https://www.bipm.org/en/publications/si-brochure",
    note: "Authoritative definition of the seven SI base units and all derived SI units. The 2019 revision redefined the kilogram, ampere, kelvin, and mole using fixed numerical values of fundamental physical constants.",
  },
  {
    type: "standard",
    authors: "International Organization for Standardization",
    year: "2009",
    title: "Quantities and Units — Part 1: General",
    source: "ISO 80000-1",
    note: "International standard defining the names, symbols, and definitions of physical quantities and units — the basis for all unit symbols and quantity relationships in this converter.",
  },
  {
    type: "standard",
    authors: "International Organization for Standardization",
    year: "2019",
    title: "Quantities and Units — Part 4: Mechanics",
    source: "ISO 80000-4",
    note: "Defines quantities and units for mechanics: force, pressure, viscosity, energy, power, flow rate, and surface tension — covering the majority of the engineering units in this converter.",
  },
  {
    type: "standard",
    authors: "ASTM International",
    year: "2020",
    title: "Standard Test Method for Kinematic Viscosity of Transparent and Opaque Liquids (and Calculation of Dynamic Viscosity)",
    source: "ASTM D445",
    note: "Defines the centistokes (cSt) and centipoise (cP) units for kinematic and dynamic viscosity and the relationship between them — used in the Dyn. Viscosity and Kin. Viscosity converter categories.",
  },
  {
    type: "online",
    authors: "National Institute of Standards and Technology (NIST)",
    year: "2023",
    title: "NIST Chemistry WebBook — Thermophysical Properties and Unit Conversion Data",
    source: "U.S. Department of Commerce, National Institute of Standards and Technology",
    details: "https://webbook.nist.gov/",
    note: "Cross-reference for specific conversion factors for thermodynamic quantities (specific heat, thermal conductivity, thermal diffusivity) and fluid properties used in the converter.",
  },
];

// ─── ASME B31.3 Pipe Wall Thickness ──────────────────────────────────────────
export const REFS_PIPE_WALL: Reference[] = [
  {
    type: "standard",
    authors: "American Society of Mechanical Engineers",
    year: "2022",
    title: "Process Piping",
    source: "ASME B31.3",
    note: "The governing code for pipe wall thickness calculation (Clause 304.1.2), material allowable stresses, weld joint efficiency, and hydrostatic test requirements for process piping.",
  },
  {
    type: "standard",
    authors: "American Society of Mechanical Engineers",
    year: "2020",
    title: "Power Piping",
    source: "ASME B31.1",
    note: "Pipe wall thickness formula and allowable stresses for power plant and utility piping.",
  },
  {
    type: "book",
    authors: "Becht, C.",
    year: "2009",
    title: "Process Piping: The Complete Guide to ASME B31.3",
    source: "ASME Press",
    details: "3rd ed.",
    note: "Plain-language interpretation of ASME B31.3 wall thickness requirements, materials, and pressure testing.",
  },
];

// ─── Pressure Vessel (ASME VIII) ──────────────────────────────────────────────
export const REFS_PRESSURE_VESSEL: Reference[] = [
  {
    type: "standard",
    authors: "American Society of Mechanical Engineers",
    year: "2023",
    title: "Boiler and Pressure Vessel Code, Section VIII, Division 1 — Rules for Construction of Pressure Vessels",
    source: "ASME BPVC VIII-1",
    note: "Governing code — shell thickness (UG-27), head thickness (UG-32), MAWP, hydrostatic test (UG-99), and minimum thickness (UG-16).",
  },
  {
    type: "book",
    authors: "Moss, D.R. & Basic, M.",
    year: "2013",
    title: "Pressure Vessel Design Manual",
    source: "Butterworth-Heinemann",
    details: "4th ed.",
    note: "Practical application of ASME VIII design formulas for shells, heads, and nozzles.",
  },
  {
    type: "book",
    authors: "Bednar, H.H.",
    year: "1991",
    title: "Pressure Vessel Design Handbook",
    source: "Krieger Publishing Company",
    details: "2nd ed.",
    note: "Detailed treatment of ASME VIII design equations for cylindrical shells and standard head geometries.",
  },
];

// ─── Stormwater / Rational Method ─────────────────────────────────────────────
export const REFS_STORMWATER: Reference[] = [
  {
    type: "report",
    authors: "South African National Roads Agency (SANRAL)",
    year: "2013",
    title: "Drainage Manual",
    source: "South African National Roads Agency Limited, Pretoria",
    details: "6th ed.",
    note: "South African reference for the Rational Method (Q = CiA/360), IDF curves, time of concentration (Kirpich), and design return periods.",
  },
  {
    type: "book",
    authors: "Midgley, D.C., Pitman, W.V. & Middleton, B.J.",
    year: "1994",
    title: "Surface Water Resources of South Africa — Volumes 1–6",
    source: "Water Research Commission, Pretoria",
    details: "WRC Report No. 298/1.1/94 to 298/6.1/94",
    note: "The primary South African hydrological dataset — runoff data and regional parameters used in the Rational Method.",
  },
  {
    type: "journal",
    authors: "Kirpich, Z.P.",
    year: "1940",
    title: "Time of concentration of small agricultural watersheds",
    source: "Civil Engineering",
    details: "Vol. 10, No. 6, p. 362",
    note: "The Kirpich formula for time of concentration used in the Rational Method.",
  },
];

// ─── Control Valve Sizing (IEC 60534) ────────────────────────────────────────
export const REFS_CONTROL_VALVE: Reference[] = [
  {
    type: "standard",
    authors: "International Electrotechnical Commission",
    year: "2011",
    title: "Industrial-process control valves — Part 2-1: Flow capacity — Sizing equations for fluid flow under installed conditions",
    source: "IEC 60534-2-1",
    note: "The governing standard for control valve Kv/Cv sizing: liquid service (cavitation, choked flow), gas service (expansion factor Y, choked flow), and steam service.",
  },
  {
    type: "book",
    authors: "Baumann, H.D.",
    year: "1998",
    title: "Control Valve Primer: A User's Guide",
    source: "ISA — The Instrumentation, Systems, and Automation Society",
    details: "3rd ed.",
    note: "Practical guide to IEC 60534 valve sizing, Cv definition, cavitation, and noise.",
  },
  {
    type: "standard",
    authors: "International Society of Automation",
    year: "2012",
    title: "Flow Equations for Sizing Control Valves",
    source: "ANSI/ISA-75.01.01",
    note: "ISA companion standard to IEC 60534-2-1 covering the same Kv/Cv sizing methodology.",
  },
];

// ─── Flange Rating (ASME B16.5) ───────────────────────────────────────────────
export const REFS_FLANGE_RATING: Reference[] = [
  {
    type: "standard",
    authors: "American Society of Mechanical Engineers",
    year: "2017",
    title: "Pipe Flanges and Flanged Fittings: NPS 1/2 Through NPS 24 Metric/Inch Standard",
    source: "ASME B16.5",
    note: "Pressure-temperature ratings for flanges in Classes 150 through 2500 for all ASME material groups. Tables 2-1.1 through 2-3.19 are the basis for all flange pressure rating lookups.",
  },
  {
    type: "book",
    authors: "Nayyar, M.L.",
    year: "2000",
    title: "Piping Handbook",
    source: "McGraw-Hill",
    details: "7th ed.",
    note: "Practical application of ASME B16.5 flange ratings, material group assignments, and pressure-temperature interpolation.",
  },
];

// ─── Compressor Power ─────────────────────────────────────────────────────────
export const REFS_COMPRESSOR_POWER: Reference[] = [
  {
    type: "book",
    authors: "Boyce, M.P.",
    year: "2012",
    title: "Gas Turbine Engineering Handbook",
    source: "Butterworth-Heinemann",
    details: "4th ed., Chapter 11 — Centrifugal Compressors",
    note: "Polytropic and isentropic compressor heads, shaft power from first law (adiabatic: w = Δh = Cp·ΔT), and efficiency definitions.",
  },
  {
    type: "book",
    authors: "Cumpsty, N.",
    year: "2004",
    title: "Compressor Aerodynamics",
    source: "Krieger Publishing Company",
    note: "Isentropic and polytropic work for ideal gases — theoretical basis for compressor power calculations.",
  },
  {
    type: "book",
    authors: "Çengel, Y.A. & Boles, M.A.",
    year: "2015",
    title: "Thermodynamics: An Engineering Approach",
    source: "McGraw-Hill Education",
    details: "8th ed., Chapter 7 — Entropy, and Chapter 10 — Gas Power Cycles",
    note: "First-law analysis of adiabatic compression, polytropic processes, and isentropic efficiency.",
  },
  {
    type: "standard",
    authors: "American Society of Mechanical Engineers",
    year: "2018",
    title: "Performance Test Code on Compressors and Exhausters",
    source: "ASME PTC 10",
    note: "Test procedure and calculation methods for centrifugal and axial compressor performance, including polytropic head and efficiency.",
  },
];

// ─── Orifice Plate Sizing (ISO 5167) ─────────────────────────────────────────
export const REFS_ORIFICE_PLATE_SIZING: Reference[] = [
  {
    type: "standard",
    authors: "International Organization for Standardization",
    year: "2003",
    title: "Measurement of fluid flow by means of pressure differential devices — Part 2: Orifice plates",
    source: "ISO 5167-2",
    note: "Reader-Harris/Gallagher discharge coefficient equation, beta ratio limits (0.1–0.75), Reynolds number range, and geometry tolerances.",
  },
  {
    type: "standard",
    authors: "International Organization for Standardization",
    year: "2003",
    title: "Measurement of fluid flow by means of pressure differential devices — Part 1: General principles and requirements",
    source: "ISO 5167-1",
    note: "Uncertainty analysis, flow equation derivation, and calibration requirements.",
  },
  {
    type: "book",
    authors: "Miller, R.W.",
    year: "1996",
    title: "Flow Measurement Engineering Handbook",
    source: "McGraw-Hill",
    details: "3rd ed.",
    note: "Comprehensive coverage of differential pressure flow measurement including orifice plates, nozzles, and venturi tubes.",
  },
];

// ─── Pipe Thermal Expansion ───────────────────────────────────────────────────
export const REFS_PIPE_THERMAL_EXPANSION: Reference[] = [
  {
    type: "standard",
    authors: "American Society of Mechanical Engineers",
    year: "2022",
    title: "Process Piping",
    source: "ASME B31.3",
    details: "Appendix C — Allowable Displacements and Flexibility",
    note: "Thermal expansion coefficients for piping materials, guided cantilever method for expansion loop sizing, and allowable stress range S_a.",
  },
  {
    type: "book",
    authors: "Nayyar, M.L.",
    year: "2000",
    title: "Piping Handbook",
    source: "McGraw-Hill",
    details: "7th ed., Chapter B4 — Stress Analysis of Piping Systems",
    note: "Guided cantilever beam theory for expansion loop sizing: H = √(3·E·D_o·|ΔL| / (2·S_a)).",
  },
  {
    type: "book",
    authors: "Becht, C.",
    year: "2009",
    title: "Process Piping: The Complete Guide to ASME B31.3",
    source: "ASME Press",
    details: "3rd ed.",
    note: "Thermal flexibility analysis and expansion loop design per ASME B31.3.",
  },
];
