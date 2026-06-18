/**
 * Core fluid mechanics calculation utilities
 * All functions are pure and return structured results
 */

// ============================================================================
// Types
// ============================================================================

export type FlowRegime = "laminar" | "transitional" | "turbulent";

export interface ReynoldsInput {
  density: number;      // kg/m³
  velocity: number;     // m/s
  diameter: number;     // m
  viscosity: number;    // Pa·s (dynamic viscosity)
}

export interface ReynoldsResult {
  reynoldsNumber: number;
  regime: FlowRegime;
  interpretation: string;
}

export interface Step {
  description: string;
  formula?: string;
  calculation?: string;
  result?: string;
  unit?: string;
}

// ============================================================================
// Unit Conversions
// ============================================================================

/**
 * Convert length from mm to m
 */
export function mmToM(mm: number): number {
  return mm / 1000;
}

/**
 * Convert length from cm to m
 */
export function cmToM(cm: number): number {
  return cm / 100;
}

/**
 * Convert flow rate from L/s to m³/s
 */
export function litersPerSecondToCubicMetersPerSecond(lps: number): number {
  return lps / 1000;
}

/**
 * Convert flow rate from m³/h to m³/s
 */
export function cubicMetersPerHourToCubicMetersPerSecond(m3h: number): number {
  return m3h / 3600;
}

// ============================================================================
// Reynolds Number
// ============================================================================

/**
 * Calculate Reynolds number for internal pipe flow
 * Re = ρVD/μ
 */
export function calculateReynoldsNumber(input: ReynoldsInput): ReynoldsResult {
  const { density, velocity, diameter, viscosity } = input;

  // Validate inputs
  if (density <= 0 || velocity < 0 || diameter <= 0 || viscosity <= 0) {
    throw new Error("All inputs must be positive");
  }

  const reynoldsNumber = (density * velocity * diameter) / viscosity;

  // Classify flow regime
  let regime: FlowRegime;
  let interpretation: string;

  if (reynoldsNumber < 2300) {
    regime = "laminar";
    interpretation = "Viscous forces dominate. Flow moves in smooth, parallel layers with no lateral mixing. Velocity profile is parabolic (Hagen-Poiseuille).";
  } else if (reynoldsNumber < 4000) {
    regime = "transitional";
    interpretation = "Unstable regime that intermittently switches between laminar and turbulent. Sensitive to inlet conditions, surface roughness, and free-stream disturbances.";
  } else {
    regime = "turbulent";
    interpretation = "Inertial forces dominate. Highly disordered flow with vigorous three-dimensional velocity fluctuations and enhanced mixing across the pipe cross-section.";
  }

  return {
    reynoldsNumber,
    regime,
    interpretation,
  };
}

function fmtN(n: number, sig = 6): string {
  return parseFloat(n.toPrecision(sig)).toString();
}

/**
 * Generate step-by-step solution for Reynolds number calculation
 */
export function generateReynoldsSteps(input: ReynoldsInput, result: ReynoldsResult): Step[] {
  const { density, velocity, diameter, viscosity } = input;
  const { reynoldsNumber, regime } = result;
  const numerator = density * velocity * diameter;

  const steps: Step[] = [
    {
      description: "Write the Reynolds number formula",
      formula: "Re = (ρ × V × D) / μ",
    },
    {
      description: "Substitute the given values",
      calculation: `Re = (${fmtN(density)} kg/m³ × ${fmtN(velocity)} m/s × ${fmtN(diameter)} m) / ${fmtN(viscosity)} Pa·s`,
    },
    {
      description: "Calculate the numerator",
      calculation: `ρ × V × D = ${fmtN(density)} × ${fmtN(velocity)} × ${fmtN(diameter)} = ${fmtN(numerator)} kg/(m·s)`,
    },
    {
      description: "Divide by viscosity",
      calculation: `Re = ${fmtN(numerator)} / ${fmtN(viscosity)} = ${fmtN(reynoldsNumber)}`,
      result: `${fmtN(reynoldsNumber)}`,
      unit: "dimensionless",
    },
    {
      description: "Classify the flow regime",
      result: `Re = ${fmtN(reynoldsNumber)} → \\text{${regime} flow}`,
    },
  ];

  return steps;
}

// ============================================================================
// Common Mistakes
// ============================================================================

export const commonMistakes = {
  reynolds: [
    "Using outer pipe diameter instead of internal (inner) diameter — Re = ρVD/μ requires the inner D",
    "Forgetting unit conversions (e.g., mm → m for D; cP → Pa·s for μ; L/s → m³/s for Q)",
    "Using kinematic viscosity ν directly in Re = ρVD/μ — that formula requires dynamic viscosity μ (use Re = VD/ν instead)",
    "Using radius r instead of diameter D — Re uses full diameter, not radius",
  ],
  reynoldsExternal: [
    "Applying pipe-flow thresholds (Re < 2300) to external flow — flat-plate transition is at Re ≈ 5×10⁵; cylinder/sphere drag crisis near Re ≈ 2–5×10⁵",
    "Confusing the characteristic length: use plate length L for flat plates, diameter D for cylinders and spheres",
    "Using kinematic viscosity ν directly in Re = ρVL/μ — that formula needs dynamic μ; alternatively use Re = VL/ν",
    "Forgetting unit conversions (mm → m for L or D; cP → Pa·s for μ)",
    "Assuming fully developed flow — external flows have a growing boundary layer; there is no 'fully developed' region",
  ],
  continuity: [
    "Forgetting to convert units (e.g., cm² to m², L/s to m³/s)",
    "Using area instead of cross-sectional area",
    "Assuming velocity is constant across the cross-section (should use average velocity)",
    "Not checking if flow is incompressible (required for continuity equation)",
  ],
  bernoulli: [
    "Forgetting to convert units (pressure, velocity, elevation)",
    "Using gauge pressure when absolute pressure is needed (or vice versa)",
    "Not accounting for head losses in real flows",
    "Applying Bernoulli's equation across streamlines (only valid along a streamline)",
  ],
  hydrostatic: [
    "Forgetting to convert units (depth, density)",
    "Using gauge pressure when absolute pressure is needed",
    "Not accounting for atmospheric pressure at the surface",
    "Using wrong density (fluid vs air)",
  ],
  idealGasDensity: [
    "Using gauge pressure instead of absolute pressure — the ideal gas law requires absolute P",
    "Using Celsius or Fahrenheit instead of Kelvin — T must be in Kelvin (T<sub>K</sub> = T<sub>°C</sub> + 273.15)",
    "Confusing the specific gas constant R with the universal gas constant R<sub>u</sub> = 8.314 J/(mol·K) — R = R<sub>u</sub> / M",
    "Applying the ideal gas law to conditions near the critical point — use real-gas equations (van der Waals, etc.) at high P or low T",
  ],
  specificGravity: [
    "Using the wrong reference density — SG for liquids uses water at 4°C (999.97 kg/m³) by convention, but petroleum uses water at 15°C (999.1 kg/m³)",
    "Confusing SG with density — SG is dimensionless; always divide by the reference density, not just shift units",
    "Applying API gravity formula to non-petroleum liquids — API gravity is defined only for petroleum products relative to water at 60°F",
    "Concluding a body sinks when SG > 1 without considering shape — a hollow steel hull floats despite steel SG ≈ 7.9",
  ],
  metacentricHeight: [
    "Using the total waterplane second moment I about the vessel keel instead of I about the centroidal waterplane axis",
    "Confusing KG (height of centre of gravity above keel) with BG (distance between B and G) — GM = KB + BM − KG",
    "Forgetting that KB = D/2 only for a rectangular cross-section with uniform draft",
    "Using BM = I/V with I in m⁴ and V in m³ — units are correct; the result is in metres",
    "Concluding stability from GM alone without checking the GZ curve for large angles",
  ],
  bulkModulus: [
    "Isothermal vs isentropic confusion — K<sub>T</sub> = -V(dP/dV)<sub>T</sub> applies to slow processes; use K<sub>s</sub> = γ K<sub>T</sub> for acoustic/fast compression",
    "Forgetting unit conversions — K is in the GPa range for liquids; mixing Pa and MPa leads to large errors",
    "Using volumetric strain sign incorrectly — K = ΔP / |ΔV/V₀| requires the magnitude of the compressive strain",
    "Confusing compressibility β = 1/K (Pa⁻¹) with the isentropic exponent γ — they are unrelated quantities",
    "Applying c = √(γRT) for speed of sound in a liquid — the correct liquid formula is c = √(K<sub>s</sub>/ρ)",
  ],
  hydrostaticForce: [
    "Using depth to the top edge instead of depth to the centroid h̄ in F = ρg h̄ A",
    "Assuming center of pressure equals the centroid — they coincide only for a horizontal surface; otherwise h<sub>cp</sub> &gt; h̄",
    "Using the wrong second moment of area: I<sub>G</sub> must be about the centroidal axis parallel to the free surface, not about an edge",
    "Confusing I<sub>G</sub> (centroidal) with I<sub>x</sub> (about the axis at the free surface) — the transfer theorem shifts I<sub>G</sub>, not the other way",
    "For inclined surfaces, mixing up slant length ȳ and vertical depth h̄ — use ȳ = h̄/sin θ in the center-of-pressure formula",
    "Forgetting unit conversions (mm → m for dimensions; kN vs N for force)",
  ],
  pipeFlowRate: [
    "Forgetting to convert units (area, velocity)",
    "Using diameter instead of radius in area calculation",
    "Using velocity at center instead of average velocity",
    "Not accounting for flow direction",
  ],
  pipeHeadLoss: [
    "Forgetting to convert units (length, diameter, velocity)",
    "Using wrong friction factor (Darcy vs Fanning)",
    "Not checking Reynolds number to select correct friction factor correlation",
    "Forgetting to account for minor losses in addition to major losses",
  ],
  fanLaws: [
    "Ignoring the density correction when operating at different temperatures or altitudes — ΔP and P both scale with ρ₂/ρ₁; at 50°C (ρ ≈ 1.09 kg/m³) a fan delivers ~9% less pressure than at 20°C at the same speed",
    "Applying the same fan speed to achieve the same duct pressure at altitude — at altitude, lower air density requires higher speed; required ratio is N₂/N₁ = √(ρ₁/ρ₂) to maintain the same pressure rise",
    "Confusing volumetric flow Q (m³/s) with mass flow ṁ (kg/s) — Q scales as N₂/N₁ regardless of density; mass flow ṁ = ρQ depends on density and may change even when Q is scaled correctly",
    "Applying fan laws near stall or on the unstable part of the fan curve — similarity laws are valid only on the stable operating region; near stall, dynamic similarity breaks down and the laws give large errors",
  ],
  turbinePower: [
    "Using gross head instead of net head — net head H = gross head minus penstock friction, gate, and tailrace losses; using gross head overstates available hydraulic power by 5–15% for long penstocks",
    "Ignoring generator efficiency when reporting electrical output — turbine shaft power × η_generator (≈ 0.97–0.99) gives electrical output; turbine efficiency alone does not predict electricity generation",
    "Applying design efficiency at off-design operating points — turbine efficiency peaks near rated flow and head; at partial load or during flood conditions efficiency can drop significantly",
    "Confusing Pelton, Francis, and Kaplan applicability — Pelton suits high head (> 200 m) low flow; Francis suits medium head (20–200 m); Kaplan suits low head (< 20 m) high flow; applying the wrong type gives poor efficiency",
  ],
  hydraulicEfficiency: [
    "Confusing hydraulic efficiency with overall efficiency — ηₕ = Hₐ/Hₑ only captures flow-path losses; overall efficiency η = ρgQH/Pₛ additionally includes mechanical (bearing, seal) and volumetric (leakage) losses",
    "Using the measured pump head as both Hₐ and Hₑ — Hₑ (Euler head) must come from blade kinematics (velocity triangles); using the same head for both gives ηₕ = 100%, which is physically wrong",
    "Reporting efficiency at off-BEP conditions as the pump efficiency — efficiency varies strongly with flow rate; the quoted efficiency should always be at the best efficiency point (BEP) for fair pump comparison",
    "Assuming η (overall) = ηₕ for a centrifugal pump — overall efficiency is the product ηₕ × ηᵥ × ηₘ; mechanical and volumetric losses typically reduce overall efficiency by a further 5–15% below the hydraulic efficiency",
  ],
  affinityLaws: [
    "Forgetting that power scales with speed CUBED, not squared — halving pump speed reduces power by 87.5% (factor of 8), not 75%; this is the fundamental reason VFDs offer large energy savings",
    "Applying affinity laws to a different impeller diameter — the speed-only laws assume constant diameter; with diameter change, use Q₂/Q₁ = (D₂/D₁)(N₂/N₁) and H₂/H₁ = (D₂/D₁)²(N₂/N₁)²",
    "Applying affinity laws far from the BEP — the laws are exact only at the same flow coefficient; large speed changes shift the pump-system intersection and may move operation off the efficient range",
    "Using affinity laws for positive displacement pumps — they apply only to centrifugal pumps and fans; PD pump flow is proportional to speed but head and power do not follow the square and cube laws",
  ],
  specificSpeed: [
    "Using specific speed at off-BEP conditions — Ωs is defined at the best efficiency point (BEP); computing it at an arbitrary operating point may misclassify the pump and give misleading impeller selection",
    "Confusing the three specific speed conventions — Ωs (dimensionless SI), Ns (US: rpm-gpm-ft), and Nq (European: rpm-m³/s-m) differ by factors of ~2733 and ~52.9 respectively; mixing conventions gives completely wrong pump selection",
    "Using specific speed to select pump type without checking if geometric similarity applies — Ns is a dimensionless similarity parameter; two pumps at the same Ns are geometrically similar, but this does not guarantee the pump is optimally designed for your duty point",
    "Applying radial-flow impeller design rules for Ωs > 1.5 — mixed-flow and axial pumps have fundamentally different blade geometries and performance curves; the specific speed boundary indicates a design change, not just a scale change",
  ],
  npsh: [
    "Using gauge pressure instead of absolute for P_s — NPSH_A requires absolute suction pressure; using a gauge value gives a result that is P_atm/(ρg) ≈ 10.3 m too high for water at sea level",
    "Using vapor pressure at the wrong temperature — Pv is highly temperature-dependent; at 80°C water Pv ≈ 47 kPa vs 2.3 kPa at 20°C; always use Pv at the actual pumping temperature",
    "Forgetting suction-pipe friction losses when computing NPSH_A from system geometry — friction reduces available NPSH; NPSH_A = (P₀ − Pv)/(ρg) + z_s − h_f, where h_f must be subtracted",
    "Operating with NPSH_A = NPSH_R exactly — manufacturers recommend a margin of at least 0.5–1.0 m or NPSH_A/NPSH_R ≥ 1.1–1.3 for reliable cavitation-free operation",
  ],
  pumpHead: [
    "Using the Euler head as actual pump head — Hₑ is the theoretical blade-work head; actual head is lower due to hydraulic losses (slip, recirculation, disk friction) typically captured by a hydraulic efficiency ηₕ < 1",
    "Ignoring slip factor σ — real impellers deliver Vu₂ = σ × (U₂ − Vr₂/tan β₂) because flow cannot follow the blade perfectly; σ is typically 0.85–0.95 depending on the number of blades",
    "Confusing β₂ convention — some references measure β₂ from the tangential direction (this formula), others from the radial; if your angle is from radial, take its complement (90° − β₂) before using this calculator",
    "Using average meridional velocity instead of outlet radial velocity Vr₂ — Vr₂ = Q/(π D₂ b₂) uses the exact impeller outlet geometry; using the mean meridional velocity without b₂ gives wrong whirl velocity",
  ],
  pumpPower: [
    "Forgetting to convert units (flow rate, head, density)",
    "Not accounting for pump efficiency",
    "Using wrong density (fluid vs water)",
    "Forgetting to convert power units (W vs kW vs hp)",
  ],
  dragSphere: [
    "Forgetting to convert units (diameter, velocity, density)",
    "Using wrong drag coefficient (depends on Reynolds number)",
    "Not accounting for fluid properties (density, viscosity)",
    "Using projected area instead of cross-sectional area",
  ],
  speedOfSound: [
    "Using Celsius instead of Kelvin — T must be absolute temperature; using 20 instead of 293.15 K gives a factor of ~4 error in c",
    "Confusing the specific gas constant R with the universal gas constant Rᵤ — R = Rᵤ / M where M is the molar mass; Rᵤ = 8.314 J/(mol·K) is NOT the value to use here",
    "Applying c = √(γRT) to liquids — liquids use c = √(Kₛ/ρ) where Kₛ is the isentropic bulk modulus; the γRT formula is for ideal gases only",
    "Assuming γ is constant at high temperatures — γ decreases as vibrational modes activate above ~600 K for diatomic gases; at 1500 K, air's γ drops to ~1.3",
  ],
  prandtlMeyerExpansion: [
    "Applying Prandtl-Meyer expansion to a compression corner — P-M is for convex (expansion) corners only; concave corners produce oblique shocks, which are not isentropic",
    "Assuming total pressure changes across the expansion — P-M expansion is isentropic; P₀ and T₀ are conserved; only static pressure, temperature, and density drop",
    "Forgetting the expansion fan spans from μ₁ to μ₂, not just at the wall corner — the upstream boundary of the fan is the Mach line at angle μ₁ = arcsin(1/M₁) from the flow direction",
    "Exceeding the vacuum limit ν_max — for air ν_max ≈ 130°; attempting to expand beyond this angle would require negative absolute pressure, which is physically impossible",
  ],
  obliqueShock: [
    "Using the total upstream Mach M₁ in the Rankine-Hugoniot equations instead of the normal component M₁ₙ = M₁ sin(β) — only the component normal to the shock drives the thermodynamic jump across it",
    "Assuming the downstream flow is always subsonic — the weak oblique shock solution leaves M₂ > 1 for most cases; only the strong solution or shocks near β = 90° produce subsonic downstream flow",
    "Applying the oblique shock formulas beyond the maximum deflection angle θ_max — for θ > θ_max the shock detaches and becomes a curved bow shock; the planar oblique shock solution no longer exists",
    "Confusing the wave angle β with the flow deflection angle θ — β is the angle of the shock wave from the upstream flow direction; θ is the physical turning of the flow; they can differ significantly",
  ],
  rayleighFlow: [
    "Applying Rayleigh relations to ducts with wall friction — Rayleigh flow is frictionless; real combustors have both heat addition and friction, requiring a combined Fanno-Rayleigh approach",
    "Expecting heat addition to always accelerate subsonic flow to supersonic — subsonic Rayleigh flow chokes at M = 1; additional heat beyond q_max cannot push the flow supersonic without changing upstream conditions",
    "Confusing T₀* (stagnation temperature at choking) with T* (static temperature at M = 1) — T₀* = T* × (γ+1)/2; for air T₀* = 1.2 T*, not equal",
    "Forgetting heat removal (cooling) drives Rayleigh flow away from M = 1 — cooling decelerates subsonic flow and accelerates supersonic flow, moving both branches away from sonic conditions",
  ],
  fannoFlow: [
    "Using Fanning friction factor instead of Darcy — f_Darcy = 4 × f_Fanning; using the Fanning value in this calculator's formula gives a pipe length 4× too long",
    "Applying Fanno relations to flows with wall heat transfer — Fanno is strictly adiabatic; ducts with significant heat exchange require the Shapiro or Rayleigh approach",
    "Expecting friction to raise static pressure for all Mach numbers — friction raises static pressure only for supersonic flow (M > 1) and lowers it for subsonic (M < 1); total pressure P₀ always decreases",
    "Confusing L* (length from inlet to choking) with actual duct length L — L* is a property of the inlet state; actual L is found from ΔfL/D = fL*/D|₁ − fL*/D|₂",
  ],
  areaMachRelation: [
    "Forgetting that each A/A* > 1 has two solutions — one subsonic and one supersonic; back pressure determines which branch is realised, not the area ratio alone",
    "Using A (local area) instead of A* (throat area where M = 1) as the reference — A* must be the minimum area; using any other reference gives a meaningless ratio",
    "Applying A/A* to ducts with friction or heat addition — the isentropic area-Mach relation only holds for reversible adiabatic flow; Fanno and Rayleigh flows require their own relations",
    "Assuming A/A* = 1 always means M = 1 — A/A* = 1 at the throat only if the nozzle is choked; an unchoked converging nozzle has M < 1 at the exit even when A/A* → 1",
  ],
  chokedFlow: [
    "Using static inlet pressure instead of stagnation pressure P₀ — the formula requires total pressure; at subsonic inlets the difference is small, but at high-speed inlets it can be significant",
    "Thinking back pressure can increase ṁ beyond the choked value — once choked the mass flow is fixed by upstream P₀ and T₀ only; lowering back pressure expands the flow downstream but cannot raise ṁ",
    "Applying ρAV at the throat without using compressible critical conditions — density at the throat is ρ* = P*/(RT*) with critical values, not free-stream or stagnation density",
    "Confusing A* (throat area where M = 1) with the nozzle inlet area A — for a converging nozzle A* is the exit; for a converging-diverging nozzle A* is the minimum area between converging and diverging sections",
  ],
  stagnationProperties: [
    "Confusing static temperature T with stagnation temperature T₀ — T₀ = T × (1 + (γ−1)/2 M²); they are equal only at M = 0, and the difference grows rapidly with Mach number",
    "Assuming T₀ is conserved in any adiabatic process — T₀ is conserved only when no heat transfer occurs; friction and irreversibilities do not change T₀, but heat addition/removal does",
    "Assuming P₀ is also conserved whenever T₀ is — P₀ drops whenever entropy increases (shock, friction, mixing); only isentropic (reversible adiabatic) processes conserve both T₀ and P₀",
    "Using static density ρ = P/(RT) and treating it as stagnation density — ρ₀ = P₀/(RT₀); mixing static and stagnation values gives wrong density",
  ],
  normalShock: [
    "Applying normal shock formulas to an oblique shock without extracting the normal component — use M₁ₙ = M₁ sin(β) in the Rankine-Hugoniot equations, not the total upstream Mach number",
    "Expecting total pressure to be conserved across the shock — P₀₂/P₀₁ < 1 always; the drop measures irreversibility and is the key input to diffuser and inlet efficiency calculations",
    "Forgetting a Pitot tube in supersonic flow reads P₀₂ (post-shock stagnation), not P₀₁ — use the Rayleigh Pitot formula P₀₂/P₁ to recover freestream Mach from the probe measurement",
    "Expecting a normal shock for M₁ ≤ 1 — shocks only exist for supersonic upstream flow; the Rankine-Hugoniot equations give unphysical results for M₁ < 1",
  ],
  isentropicRelations: [
    "Applying isentropic relations across a normal shock — entropy increases through a shock; use Rankine-Hugoniot shock relations there and isentropic relations separately upstream and downstream",
    "Confusing static temperature T with stagnation temperature T₀ — T₀ = T(1 + (γ−1)/2 M²) ≥ T; at M = 0.8 the difference is already ~11%",
    "Confusing critical (*) conditions with stagnation (0) conditions — at the throat M = 1 giving T* = T₀ × 2/(γ+1) and P* = P₀ × (2/(γ+1))^(γ/(γ−1)); these are below stagnation values",
    "Using A/A* for a subsonic solution when the flow is supersonic — the same A/A* corresponds to two Mach numbers (one subsonic, one supersonic); the physical solution depends on downstream conditions",
  ],
  machNumber: [
    "Forgetting to convert units (velocity, temperature)",
    "Using wrong speed of sound formula (depends on gas and temperature)",
    "Not accounting for temperature in speed of sound calculation",
    "Using local speed of sound when free stream is needed",
  ],
  froudeNumber: [
    "Forgetting to convert units (velocity, length, gravity)",
    "Using wrong characteristic length (depth vs length)",
    "Not accounting for gravity (9.81 m/s²)",
    "Using wrong velocity (average vs maximum)",
  ],
  weberNumber: [
    "Forgetting to convert units (velocity, length, surface tension)",
    "Using wrong surface tension value",
    "Not accounting for density in calculation",
    "Using wrong characteristic length",
  ],
  stokesLaw: [
    "Forgetting to convert units (diameter, velocity, viscosity)",
    "Not checking if Reynolds number is low enough (Re < 1)",
    "Using wrong viscosity (dynamic vs kinematic)",
    "Not accounting for gravity direction",
  ],
  orificeFlow: [
    "Forgetting to convert units (diameter, pressure, density)",
    "Using wrong discharge coefficient",
    "Not accounting for pressure difference correctly",
    "Using area instead of orifice area",
  ],
  venturiFlow: [
    "Forgetting to convert units (diameters, pressure, density)",
    "Using wrong discharge coefficient",
    "Not accounting for pressure difference correctly",
    "Using wrong area ratio",
  ],
  manometer: [
    "Forgetting to convert units (height, density)",
    "Using wrong fluid density (manometer fluid vs measured fluid)",
    "Not accounting for atmospheric pressure",
    "Reading height from wrong reference point",
  ],
  buoyancy: [
    "Forgetting to convert units (volume, density)",
    "Using wrong density (fluid vs object)",
    "Not accounting for gravity correctly",
    "Using volume above surface instead of submerged volume",
  ],
  flowWork: [
    "Confusing flow work (P/ρ per unit mass) with total mechanical energy",
    "Using gauge pressure instead of absolute pressure in energy equations",
    "Forgetting that flow work is already included in enthalpy h = u + P/ρ",
    "Mixing up specific flow work [J/kg] and flow work rate [W]",
  ],
  surfaceTension: [
    "Forgetting to convert units (force, length)",
    "Using wrong surface tension coefficient",
    "Not accounting for contact angle",
    "Using wrong length (perimeter vs diameter)",
  ],
  capillaryRise: [
    "Forgetting to convert units (diameter, surface tension, density)",
    "Using wrong contact angle",
    "Not accounting for gravity",
    "Using wrong surface tension value",
  ],
  poiseuilleFlow: [
    "Forgetting to convert units (diameter, length, pressure, viscosity)",
    "Not checking if flow is laminar (Re < 2300)",
    "Using wrong pipe length",
    "Not accounting for pressure difference correctly",
  ],
  frictionFactor: [
    "Using wrong Reynolds number range (laminar vs turbulent)",
    "Not accounting for pipe roughness in turbulent flow",
    "Using Fanning friction factor instead of Darcy",
    "Not checking flow regime before selecting formula",
  ],
  minorLosses: [
    "Using wrong loss coefficient for the fitting type",
    "Forgetting to convert units (velocity)",
    "Not accounting for multiple fittings",
    "Using velocity at wrong location",
  ],
  torricelli: [
    "Forgetting to convert units (height)",
    "Not accounting for friction losses (ideal case only)",
    "Using wrong height (should be from free surface)",
    "Not checking if orifice is small enough",
  ],
  pitotTube: [
    "Forgetting to convert units (pressure, density)",
    "Using gauge pressure instead of differential",
    "Not accounting for compressibility at high speeds",
    "Using wrong density (air vs fluid)",
  ],
  velocityHead: [
    "Forgetting to convert units (velocity)",
    "Not accounting for gravity",
    "Using wrong velocity (average vs maximum)",
    "Forgetting to square the velocity",
  ],
  massFlowRate: [
    "Forgetting to convert units (density, flow rate)",
    "Using wrong density",
    "Not accounting for compressibility",
    "Mixing up mass and volumetric flow rates",
  ],
  staticPressure: [
    "Forgetting to convert units (pressure)",
    "Using gauge pressure when absolute is needed",
    "Not accounting for atmospheric pressure correctly",
    "Mixing up static and dynamic pressure",
  ],
  dynamicPressure: [
    "Forgetting to convert units (velocity, density)",
    "Not squaring the velocity",
    "Using wrong density",
    "Forgetting the 1/2 factor",
  ],
  totalPressure: [
    "Forgetting to convert units (pressure)",
    "Not accounting for all pressure components",
    "Using wrong reference pressure",
    "Mixing up total and static pressure",
  ],
  energyLoss: [
    "Forgetting to convert units (head loss, flow rate)",
    "Using wrong density",
    "Not accounting for gravity",
    "Mixing up energy and power",
  ],
  areaRatio: [
    "Forgetting to convert units (diameters, areas)",
    "Using wrong area (should be cross-sectional)",
    "Dividing in wrong order (A₂/A₁ vs A₁/A₂)",
    "Not accounting for diameter vs radius",
  ],
  chezyEquation: [
    "Treating Chezy's C as dimensionless — C has units of m^(1/2)/s in SI; the numerical value changes if working in ft/s units",
    "Using Manning's n directly in Chezy's formula — the conversion is C = R_h^(1/6) / n; n alone cannot replace C",
    "Confusing the energy slope S_f with the bed slope S_0 — for uniform flow they are equal; in gradually varied flow S_f ≠ S_0 and the Chezy equation uses S_f",
    "Assuming C is constant across depths — C = R^(1/6)/n varies with depth because R_h changes; only n is approximately constant for a given channel surface",
  ],
  normalDepth: [
    "Confusing normal depth with critical depth — normal depth depends on slope S and Manning's n; critical depth depends only on Q and channel geometry",
    "Using the wrong slope — Manning's S is the channel bed slope (rise/run); using the water surface slope of a non-uniform profile gives the wrong answer",
    "Applying Manning's equation with a single n for a compound section (main channel + floodplain) — each sub-area has a different n and must be computed separately",
    "Expecting a unique normal depth for steep slopes — on a steep slope (S > S_c), normal depth is supercritical; on a mild slope it is subcritical; a horizontal bed has no finite normal depth",
  ],
  manningsEquation: [
    "Entering slope as a percentage (e.g. 0.1) instead of a decimal (0.001) — Manning's S is always the dimensionless rise/run ratio",
    "Using hydraulic depth (A/T) instead of hydraulic radius R = A/P — hydraulic radius uses wetted perimeter P, not top width T",
    "Applying Manning's equation to non-uniform or rapidly varied flow — it is only valid for uniform (normal) depth with constant velocity",
    "Using the same Manning's n for clean and vegetated or fouled channels — n increases significantly with vegetation, sediment, or irregular bed forms",
  ],
  criticalDepth: [
    "Confusing critical depth with normal depth — critical depth depends only on Q and channel geometry (Fr = 1); normal depth depends on slope and Manning's n",
    "Applying the rectangular formula y_c = (q²/g)^(1/3) to a trapezoidal or circular channel — non-rectangular shapes require the general condition A³/T = Q²/g, solved numerically",
    "Forgetting to use unit discharge q = Q/b for rectangular channels — the formula uses q [m²/s], not the total Q [m³/s]",
    "Confusing specific energy at critical depth — for rectangular channels E_c = (3/2) × y_c; this applies only to rectangular cross-sections",
  ],
  hydraulicJump: [
    "Applying the sequent depth equation when upstream Fr < 1 — a hydraulic jump only forms when supercritical flow (Fr > 1) decelerates to subcritical; the equation gives a nonsensical y₂ < y₁ otherwise",
    "Expecting a stable jump in the oscillating range (Fr₁ = 2.5–4.5) — the jump is unsteady and may cause surface waves and vibration; stilling basins should target Fr₁ > 4.5 for a steady jump",
    "Using the rectangular sequent-depth formula for trapezoidal or circular channels — each geometry requires its own momentum equation; the rectangular formula overestimates y₂ for side-sloped channels",
    "Confusing sequent depth (conjugate depth, same momentum flux) with alternate depth (same specific energy) — they are different pairs on the E-y and M-y diagrams",
  ],
  weirFlow: [
    "Measuring head H from the channel bed instead of the weir crest — H is the depth of water above the weir crest, not the total upstream depth",
    "Using a rectangular Cd for a V-notch or broad-crested weir — each weir type has its own formula and Cd range; mixing them gives large errors",
    "Neglecting the velocity of approach — when upstream velocity Va is significant, the effective head is H + Va²/(2g), not H alone",
    "Applying the free-discharge formula when the weir is submerged — submergence (tailwater above crest) reduces discharge and requires a submergence correction factor",
  ],
  specificEnergy: [
    "Confusing specific energy E (measured from channel bed) with total energy H (measured from a fixed datum) — specific energy changes along the channel even for gradually varied flow",
    "Forgetting that for a given E there are two possible depths (subcritical and supercritical alternate depths) except at the minimum energy point where Fr = 1",
    "Using the rectangular formula E_c = (3/2) y_c for non-rectangular channels — trapezoidal and circular channels require the general condition A³/T = Q²/g for critical depth",
    "Confusing the velocity head V²/(2g) with the kinetic energy per unit mass V²/2 — the head form divides by g and has units of metres, not J/kg",
  ],
  wettedPerimeter: [
    "Including the free surface in the wetted perimeter — the water surface is in contact with air, not a solid wall; never count it as part of P",
    "Using the full circumference πD for a partially-filled pipe — only the arc in contact with water counts: P = D × arccos(1 − 2y/D)",
    "Confusing wetted perimeter P with top width T — P is the solid-boundary contact length; T is the free-surface width at the water surface",
    "Using total cross-section outline perimeter instead of submerged boundary — for a trapezoidal channel the top side (free surface) is excluded from P",
  ],
  hydraulicRadius: [
    "Using the full wetted perimeter of a closed conduit — for pipe flow use the full circumference P = πD; for partially-filled pipes use the arc length only",
    "Confusing hydraulic radius R_h = A/P with hydraulic diameter D_h = 4A/P — Manning's and Chézy use R_h; Darcy-Weisbach Re uses D_h",
    "Confusing hydraulic radius R_h with hydraulic depth D_h = A/T — hydraulic depth uses top width T and is used in the Froude number; hydraulic radius uses wetted perimeter",
    "Assuming hydraulic radius equals depth — R_h ≈ y only for very wide shallow channels (b >> y); for narrow or deep channels R_h is significantly smaller than y",
  ],
  flowCoefficient: [
    "Confusing US Cv (gal/min per √psi) with metric Kv (m³/h per √bar) — Cv = 1.156 × Kv",
    "Using wrong SG reference — Cv is based on water at 15°C (SG = 1.0, ρ = 999 kg/m³)",
    "Not converting flow rate to gal/min or pressure drop to psi before applying the Cv formula",
    "Applying liquid Cv directly to gas or steam service without correction",
  ],
  trapezoidalChannel: [
    "Entering side slope z as V:H instead of H:V — z = 1.5 means 1.5 horizontal per 1 vertical, NOT the angle",
    "Using the total channel top width as bottom width b — b is only the flat base; T = b + 2z·y is the top width",
    "Substituting slope as a percentage (e.g., 0.1 for 0.1 %) into Manning's equation — S must be the dimensionless rise/run (0.001, not 0.1 %)",
    "Confusing hydraulic radius R_h = A/P with hydraulic depth D_h = A/T — Manning's uses R_h; the Froude number uses D_h = A/T",
  ],
  dischargeCd: [
    "Confusing Cd (discharge coefficient) with Cv (contraction coefficient) or Cv (velocity coefficient)",
    "Omitting the velocity-of-approach factor E when pipe diameter D₁ is comparable to orifice D₂",
    "Using area-averaged velocity instead of measured volumetric flow rate Q when finding Cd experimentally",
    "Applying a Cd from one meter geometry to a different geometry without re-calibrating",
  ],
  flowClassification: [
    "Using geometric depth y as hydraulic depth D_h for non-rectangular channels — D_h = A/T uses top width T, not depth y directly",
    "Confusing hydraulic radius R_h = A/P (used in Reynolds number) with hydraulic depth D_h = A/T (used in Froude number)",
    "Applying open-channel Reynolds number thresholds (500/12 500) to pipe flow — pipe flow transitions at Re ≈ 2 300",
    "Treating the Froude number boundary as a sharp Fr = 1 threshold — in practice, flow near Fr = 0.9–1.1 is transitional and unstable",
  ],
  pressureRecovery: [
    "Forgetting that pressure recovery is always less than the ideal (Bernoulli) value due to losses",
    "Using outlet velocity head instead of inlet velocity head as the reference for Cp",
    "Applying the Borda-Carnot formula to a gradual diffuser — it only applies to sudden expansions",
    "Confusing diffuser efficiency η (Cp_actual/Cp_ideal) with isentropic efficiency",
  ],
  cavitationNumber: [
    "Using gauge pressure instead of absolute pressure — cavitation number requires absolute P",
    "Using the wrong vapor pressure for the fluid temperature",
    "Confusing NPSH (head in metres) with the cavitation number (dimensionless)",
    "Assuming σ > 0 means no cavitation — each geometry has its own critical σ<sub>c</sub>",
  ],
  nonCircularDuct: [
    "Using geometric diameter instead of hydraulic diameter Dh = 4A/P in Re and Darcy-Weisbach",
    "Forgetting to include all wetted surfaces in the perimeter (e.g. both sides of parallel plates)",
    "Using f = 64/Re for non-circular laminar flow — the exact constant depends on shape (ranges 53–96)",
    "Applying Dh method to laminar flow with highly non-circular shapes — errors can exceed 40%",
  ],
  liftForce: [
    "Using 2D airfoil CL data directly for a 3D finite wing — finite-span correction reduces CL",
    "Using geometric area instead of planform (projected) reference area S",
    "Assuming CL is constant — it changes significantly with angle of attack, and drops abruptly at stall",
    "Forgetting that air density varies with altitude — use ISA standard values at the operating altitude",
  ],
  boundaryLayer: [
    "Using total plate length L instead of local distance x when computing local BL thickness",
    "Applying laminar Blasius formula at Rex > 5×10⁵ (transition to turbulent has occurred)",
    "Confusing displacement thickness δ* with total BL thickness δ — δ* ≈ δ/2.9 for laminar flow",
    "Ignoring transition — mixed laminar/turbulent boundary layers are common on real plates",
  ],
  momentumFlux: [
    "Using β = 1 (uniform) for laminar pipe flow — the correct value is β = 4/3 ≈ 1.333",
    "Confusing momentum flux J (units N) with momentum (units N·s) — flux is per unit time",
    "Forgetting to include both inlet and outlet momentum fluxes in control-volume force balance",
    "Using volumetric flow Q directly in ṁV — must first convert Q to mass flow ṁ = ρQ",
  ],
  controlVolumeForce: [
    "Confusing the force the pipe exerts ON the fluid with the force the fluid exerts ON the pipe — they are equal and opposite",
    "Using absolute pressure instead of gauge pressure in the momentum equation (only pressure differences matter)",
    "Forgetting that continuity requires ṁ₁ = ṁ₂ for incompressible steady flow — V₂ ≠ V₁ if D₁ ≠ D₂",
    "Omitting the pressure-area term P·A at each port — it is as important as the momentum flux ṁV",
  ],
  eulerNumber: [
    "Confusing the two conventions: Eu = ΔP/q (with ½) vs Eu = ΔP/(ρV²) without ½ — this calculator uses Eu = ΔP/(½ρV²)",
    "For pipe fittings, Eu equals the K loss coefficient only when ΔP is the total (not static) pressure loss",
    "Using relative velocity instead of absolute velocity — Eu requires the velocity scale that generates the pressure difference",
    "Forgetting that Eu = pressure coefficient Cp — the two are the same number under the ΔP/(½ρV²) convention",
  ],
  strouhalNumber: [
    "Confusing shedding frequency f (Hz) with angular frequency ω (rad/s) — St uses f in Hz, not ω",
    "Using the wrong characteristic length — for cylinders use diameter D, not radius or length",
    "Applying St = 0.2 outside its valid Reynolds number range (Re ≈ 300–2×10⁵ for circular cylinders)",
    "Missing resonance risk: shedding frequency f ≈ structural natural frequency fn causes vortex-induced vibration (VIV)",
  ],
  nusseltNumber: [
    "Confusing Nu (uses fluid thermal conductivity k_f) with Biot number Bi (uses solid conductivity k_s)",
    "Using the wrong characteristic length — pipe flow uses diameter D; flat plate uses total length L",
    "Applying a correlation outside its valid Re and Pr range — Dittus-Boelter requires Re > 10 000",
    "Forgetting that Nu = 1 means no convective enhancement; purely conductive resistance would give Nu = 1",
  ],
  prandtlNumber: [
    "Confusing Prandtl number Pr with Nusselt number Nu — Pr is a pure fluid property (no geometry); Nu depends on geometry and flow",
    "Using dynamic viscosity μ in the formula Pr = ν/α — the diffusivity form requires kinematic viscosity ν = μ/ρ",
    "Applying a single Pr value over a wide temperature range — Pr varies strongly with temperature, especially for oils and water",
    "Forgetting that Pr governs boundary layer thickness ratio: δ_thermal/δ_velocity ≈ Pr^(−1/3) for Pr >> 1",
  ],
  grashofNumber: [
    "Using β = 1/T for liquids — the ideal-gas approximation β ≈ 1/T_film (K) is valid only for gases; liquids require tabulated β values",
    "Using Celsius temperatures for β = 1/T — β must be computed from the absolute film temperature T_film in Kelvin",
    "Confusing Grashof number Gr with Rayleigh number Ra — they are related by Ra = Gr × Pr; Nu correlations usually require Ra, not Gr directly",
    "Squaring the wrong quantity — the formula is Gr = g β ΔT L³ / ν²; it is ν (kinematic viscosity) that is squared, not L",
  ],
  lewisNumber: [
    "Assuming Le = 1 for aqueous solutions — Le ≈ 1 is only valid for gases; most liquid systems have Le >> 1 because α >> D_AB in liquids",
    "Confusing Le = α/D_AB with Sc/Pr — both forms are equivalent (Le = Sc/Pr) but the diffusivity form is more direct",
    "Using Le = 1 to assume equal thermal and concentration boundary layer thicknesses in a liquid system — boundary layers differ by Le^(1/3)",
    "Forgetting that in combustion and drying, Le governs coupling between heat and mass transfer; Le ≠ 1 requires separate energy and species equations",
  ],
  sherwoodNumber: [
    "Confusing Sh (uses fluid mass diffusivity D_AB) with Nu (uses fluid thermal conductivity k_f) — they are analogous but for different transport mechanisms",
    "Using the wrong characteristic length — pipe flow uses diameter D; flat plate uses total length L; sphere uses diameter D",
    "Forgetting that Sh = 1 means no convective enhancement over pure diffusion; Sh = D_AB/L is the baseline reference",
    "Applying a Re–Sc correlation outside its valid range — Ranz-Marshall (sphere) is valid 2 < Re < 200, 0.6 < Sc < 250",
  ],
  schmidtNumber: [
    "Confusing Schmidt number Sc = ν/D_AB with Prandtl number Pr = ν/α — Sc uses mass diffusivity D_AB, Pr uses thermal diffusivity α",
    "Using dynamic viscosity μ instead of kinematic viscosity ν — the definition is Sc = ν/D_AB where ν = μ/ρ",
    "Applying a single D_AB value across a wide concentration or temperature range — mass diffusivity varies significantly with both",
    "Forgetting that Sc governs the mass-transfer boundary layer thickness ratio: δ_c/δ_v ≈ Sc^(−1/3) for Sc >> 1",
  ],
  pecletNumber: [
    "Confusing thermal Pe (Pe = Re × Pr, uses α) with mass-transfer Pe (Pe = Re × Sc, uses D_AB) — always match the diffusivity to the transport type",
    "Using dynamic viscosity μ instead of kinematic viscosity ν when computing Re = V L / ν — they differ by density",
    "Treating Pe >> 1 as meaning diffusion is negligible — even at Pe = 100 a thin diffusive boundary layer still controls the wall flux",
    "Using a bulk diffusivity value at the wrong temperature — both α and D_AB are strongly temperature-dependent",
  ],
  rayleighNumber: [
    "Using kinematic viscosity ν instead of thermal diffusivity α in the Ra formula — Ra = g β ΔT L³ / (ν × α), not g β ΔT L³ / ν²",
    "Forgetting that α = k / (ρ cₚ) — using the wrong value for thermal diffusivity or confusing it with kinematic viscosity",
    "Using the wrong characteristic length — vertical plate uses height H; horizontal cylinder uses diameter D; horizontal plate uses area/perimeter",
    "Applying Churchill-Chu or other Nu(Ra) correlations outside their valid Ra range — always verify the regime before using a correlation",
  ],
  vortexFlow: [
    "Applying the free-vortex tangential velocity formula (Γ/2πr) inside the core of a real vortex — singularity at r = 0",
    "Confusing angular velocity ω (rad/s) with vorticity (2ω for forced vortex) — free vortex has zero vorticity everywhere except r = 0",
    "Using the free-vortex pressure formula inside the core radius of a Rankine vortex — the Rankine core uses the forced-vortex formula",
    "Forgetting that circulation Γ = 2πr × tangential velocity is constant for a free vortex — it is Γ that is conserved, not the velocity itself",
  ],
  swirlNumber: [
    "Using the wrong reference radius R in the denominator — must be the outer pipe/duct radius, not a measurement radius",
    "Using V_θ/V_x directly without a profile shape factor — this equals S only for a free-vortex tangential profile",
    "Treating S > 0.6 as a guaranteed central recirculation zone — actual CRZ formation also depends on geometry, confinement, and turbulence",
    "Confusing swirl number S (dimensionless flux ratio) with angular velocity ω (rad/s) or swirl angle φ (degrees)",
  ],
  thermalResistance: [
    "Adding resistances in series is only valid for 1D heat flow — parallel heat paths (fins, bypasses) require a parallel resistance network",
    "Using the planar formula R = t/(kA) for a thick cylindrical wall — cylinders require R = ln(r_o/r_i) / (2πkL) which differs significantly when r_o/r_i > 1.2",
    "Forgetting contact resistance between layers — imperfect interfaces add additional resistance not captured by bulk properties",
    "Confusing thermal resistance R [K/W] with thermal resistivity r [m·K/W] — R = r × thickness / area = (1/k) × t / A",
  ],
  finEfficiency: [
    "Using the adiabatic-tip formula when the fin tip is exposed to convection — use corrected length L_c = L + A_c/P (or L + t/2 for a rectangular fin) to account for tip heat loss",
    "Forgetting that fin efficiency applies to the fin surface only — the overall surface efficiency accounts for both fins and unfinned base area: η_o = 1 − (N × A_fin / A_total) × (1 − η_f)",
    "Using fin perimeter P for a rectangular fin as P = 2w instead of P = 2(w + t) — the thickness contributes to the perimeter, especially for thick fins",
    "Confusing fin efficiency (η_f = actual Q / maximum possible Q for the fin) with fin effectiveness (ratio of fin Q to bare-surface Q without the fin)",
  ],
  foulingFactor: [
    "Using R_f = 1/U_fouled alone instead of R_f = 1/U_fouled − 1/U_clean — fouling resistance is the difference in total resistance, not the fouled resistance itself",
    "Applying a single TEMA fouling factor to both sides of a double-sided HX — inner and outer fouling resistances are separate; add them independently in the overall U formula",
    "Confusing fouling resistance R_f [m²·K/W] with fouling coefficient h_f [W/(m²·K)] — they are reciprocals: h_f = 1/R_f",
    "Ignoring that TEMA fouling factors are conservative design margins — actual fouling at a given time may be much lower than the steady-state TEMA value",
  ],
  effectivenessNtu: [
    "Confusing NTU = UA/C_min with NTU = UA/C_max — always use C_min in the denominator",
    "Assuming all flow configurations give the same ε — counterflow always gives the highest effectiveness for a given NTU and C*",
    "Using C* = C_min/C_max > 1 — by definition C* ≤ 1; if you computed C* > 1 swap the two capacity rates",
    "Applying ε-NTU when outlet temperatures are known — use LMTD method instead; ε-NTU is for rating/sizing when outlets are unknown",
  ],
  naturalConvectionPlate: [
    "Using bulk fluid temperature instead of the film temperature for properties — all fluid properties (ν, α, β) must be evaluated at T_film = (T_wall + T_ambient) / 2",
    "Using β = 1/T for liquids — the ideal-gas relation β ≈ 1/T_film (K) applies only to gases; liquids require tabulated β values",
    "Confusing Gr and Ra — the Churchill-Chu correlation uses Ra = Gr × Pr, not Gr alone; always multiply by Pr before applying the Nu formula",
    "Applying the vertical-plate correlation to a horizontal plate — orientation changes the flow pattern entirely; use McAdams or Morgan correlations for horizontal surfaces",
  ],
  dittusBoelter: [
    "Applying Dittus-Boelter when Re < 10 000 — the flow is transitional or laminar and the correlation is invalid; use Gnielinski for 3 000 < Re < 5×10⁶",
    "Using Pr outside 0.6–160 — for liquid metals (Pr << 1) or very viscous oils (Pr >> 160) dedicated correlations are required",
    "Forgetting the n exponent difference: n = 0.4 when the wall is hotter than the fluid (heating), n = 0.3 when the wall is cooler (cooling) — swapping them causes ~10–20% error",
    "Applying Dittus-Boelter in the entrance region (L/D < 10) — Nu is higher near the inlet; the fully-developed assumption under-predicts h",
  ],
  overallHtc: [
    "Treating fouling resistances as fixed values — TEMA fouling factors are conservative design margins; actual fouling depends on fluid chemistry, velocity, and time",
    "Using flat-wall 1/U formula for a tube HX — the cylindrical-wall formula includes radius-ratio corrections: 1/U_o = 1/h_o + R_fo + (r_o ln(r_o/r_i))/k + (r_o/r_i)(R_fi + 1/h_i)",
    "Ignoring which resistance dominates — if 1/h_i >> all others, improving h_o or reducing fouling will barely change U; focus on the largest resistance",
    "Confusing U with h — h is a single-surface film coefficient; U combines all resistances (both films + wall + fouling) in series",
  ],
  lmtd: [
    "Using the same LMTD formula for a multi-pass shell-and-tube or crossflow HX without applying the F-factor correction: Q = U A F LMTD",
    "Mixing up ΔT₁ and ΔT₂ definitions — for counterflow: ΔT₁ = T_h,in − T_c,out ; ΔT₂ = T_h,out − T_c,in",
    "Computing LMTD when ΔT₁ ≈ ΔT₂ and getting 0/0 — by L'Hôpital's rule LMTD → ΔT when the two terminal differences are equal",
    "Using °C temperatures directly in Q = U A LMTD — ΔT differences in °C and K are numerically identical, so units are consistent, but absolute temperatures must not be used",
  ],
  sedimentTransport: [
    "Confusing the Shields parameter θ with the critical Shields parameter θcr — θ is the applied dimensionless shear; θcr ≈ 0.047 is the threshold; motion occurs only when θ > θcr",
    "Using dynamic viscosity μ instead of kinematic viscosity ν when computing particle Reynolds number Re* = u*d/ν — the two differ by density",
    "Using total boundary shear stress when form drag from bedforms (ripples, dunes) is present — only the grain-related skin friction τ' drives sediment motion; subtract form drag first",
    "Entering particle diameter in mm instead of metres — d must be in metres in SI; 0.2 mm = 0.0002 m",
  ],
  tidalPrism: [
    "Using the total basin area including land above HWL — only the area covered by water at high tide counts; upland areas never inundated must be excluded from the basin area Ab",
    "Confusing tidal prism P with the total volume of water in the basin — P is only the exchanged volume (range × area), not depth × area at HWL",
    "Applying O'Brien's law coefficients from a different coast — Pacific, Atlantic, and Gulf inlet coefficients differ; the simplified 6.25×10⁻⁴ constant is a rough approximation only",
    "Using tidal range from a tide table at a distant offshore gauge — effective tidal range inside an inlet is reduced by inlet hydraulics; use a gauge inside or at the inlet entrance",
  ],
  graduallyVariedFlow: [
    "Confusing profile type between mild and steep slopes — M profiles apply when S₀ < Sc (yₙ > yc); S profiles apply when S₀ > Sc (yₙ < yc); using M labels on a steep channel is wrong",
    "Using bed slope S₀ instead of friction slope Sf in the GVF equation — S₀ is fixed geometry; Sf = (nV/R^(2/3))² varies with depth y and must be computed at the current section",
    "Expecting a smooth numerical dy/dx near critical depth — the GVF equation has a singularity at Fr = 1 (denominator → 0); the actual transition is abrupt (hydraulic jump or free overfall)",
    "Treating dy/dx as the water surface slope relative to horizontal — dy/dx is the rate of depth change along the channel bed, not the absolute slope of the water surface; water surface slope = S₀ − dy/dx",
  ],
  impellerTipSpeed: [
    "Using diameter instead of radius — u₂ = ω × r₂ = ω × D/2; a common error is u₂ = ω × D which doubles the result",
    "Forgetting to convert rpm to rad/s — ω = N × 2π/60; using N directly in peripheral-speed formulas gives results 9.55× too large",
    "Confusing tip speed with meridional (axial) velocity — u₂ is the blade peripheral speed at the outer radius; radial/axial through-flow velocity is a separate quantity",
    "Ignoring material speed limits — cast iron impellers are typically limited to ~40 m/s; bronze to ~50 m/s; stainless steel to ~80 m/s; exceeding limits risks fatigue or burst failure",
  ],
  suctionSpecificSpeed: [
    "Using rpm directly instead of rad/s — Ωss uses angular velocity ω = N × 2π/60; inputting rpm directly gives a value 9.55× too large in SI",
    "Confusing NPSH available with NPSH required — Ωss is defined with NPSHᵣ (required); NPSHₐ is a system/installation property and must remain larger than NPSHᵣ by a safety margin",
    "Applying US customary thresholds to SI results — US practice uses N (rpm), Q (US gpm), H (ft); SI dimensionless Ωss values are ~13× smaller and have different safe-zone thresholds (S < 0.3 safe in SI, not S < 4)",
    "Evaluating at off-BEP conditions — Ωss is meaningful only at the best-efficiency point (BEP); at partial load the effective suction specific speed rises and cavitation risk increases significantly",
  ],
  hydraulicGradient: [
    "Confusing friction slope S with pipe bed slope S₀ — S = hf/L is the slope of the hydraulic grade line (friction-driven head loss per unit length); S₀ is the physical inclination of the pipe; they are equal only for uniform steady flow with no pumps or transitions",
    "Using total head difference instead of friction head loss — if the system contains pumps, turbines, or velocity changes, the total ΔH ≠ hf; the gradient S = hf/L must use only the friction component",
    "Expressing S as a percentage and substituting directly into formulas — S must be dimensionless (m/m) in Darcy-Weisbach and Manning's; inputting S% without dividing by 100 gives a slope 100× too steep",
    "Assuming S is constant along a non-uniform-flow reach — S is constant only for steady uniform flow in a single straight pipe; in gradually varied flow or branched networks, the friction slope varies with depth or velocity",
  ],
  pipeSizing: [
    "Forgetting to select the next larger standard commercial pipe size — the calculated D is the minimum hydraulic requirement; always round up to the nearest nominal bore (DN) to meet or exceed the head loss allowance",
    "Using allowable total system head instead of friction head loss — hf is only the friction term; if elevation change or differential pressure contributes to available head, subtract those first before sizing",
    "Omitting minor losses (bends, valves, reducers) — for short pipes or fittings-dense runs, minor losses can exceed major losses; add an equivalent length or K-factor contribution before using the solver",
    "Treating the solved diameter as final without checking velocity — the resulting velocity should fall within an acceptable design range (typically 0.5–3 m/s for water distribution) to avoid erosion or sedimentation",
  ],
  hazenWilliams: [
    "Applying Hazen-Williams to fluids other than water — the formula is calibrated for water near 16°C; using it for oil, hot water above 40°C, or other fluids with different viscosity gives significant velocity errors",
    "Confusing hydraulic radius Rₕ with pipe radius — Rₕ = A/P = D/4 for a full circular pipe, not D/2; using D/2 instead of D/4 overestimates Rₕ by 2× and velocity by 2^{0.63} ≈ 1.55×",
    "Using a fixed C value regardless of pipe age — C decreases with service time due to scale, corrosion, and biological growth; new PVC has C ≈ 150, but the same pipe may drop to C ≈ 100–120 after years of use",
    "Mixing US customary and SI constants — the SI coefficient is 0.8492 (R in m, V in m/s); the US form uses 1.318 (R in ft, V in ft/s); using 1.318 with SI inputs overestimates velocity by 55%",
  ],
  swameeJain: [
    "Applying Swamee-Jain outside its stated validity range — the formula is calibrated for 3×10³ < Re < 3×10⁸ and 10⁻⁶ < ε/D < 10⁻²; outside these bounds error can exceed 3% and may be unpredictable",
    "Confusing Darcy friction factor with Fanning friction factor — f_Darcy = 4 × f_Fanning; Swamee-Jain gives the Darcy (Moody) value; using it as Fanning in h_f = 4f(L/D)(V²/2g) gives the correct result but using it as Darcy in h_f = f(L/D)(V²/2g) is the standard form",
    "Using Swamee-Jain for laminar flow (Re < 2300) — the formula is derived from turbulent correlations; for laminar flow use f = 64/Re exactly",
    "Treating the 3% error as always negligible — in systems where head loss calculations cascade (long pipelines, series/parallel networks) a consistent 3% overestimate or underestimate compounds; use Colebrook-White when precision matters",
  ],
  colebrookWhite: [
    "Confusing Darcy (Moody) friction factor with Fanning friction factor — f_Darcy = 4 × f_Fanning; using the Fanning value in h_f = f(L/D)(V²/2g) gives head loss 4× too small",
    "Applying Colebrook-White below Re = 4000 — the equation is for turbulent flow; in the transitional zone (2300–4000) results are unreliable; use f = 64/Re for Re < 2300",
    "Using absolute roughness ε instead of relative roughness ε/D — a 0.05 mm roughness on a 50 mm pipe (ε/D = 0.001) is hydraulically very different from the same roughness on a 500 mm pipe (ε/D = 0.0001)",
    "Treating f as exact to many decimal places — Colebrook-White has ±5% inherent uncertainty from the original Moody data; more than 3–4 significant figures are not physically meaningful",
  ],
  parallelPipe: [
    "Assuming equal flow in all branches — flow splits in proportion to hydraulic conductance; a larger or shorter pipe carries far more than an equal share because conductance scales with D^{2.5}/√(fL)",
    "Thinking the common head loss equals the total system head — the parallel combination acts as a single equivalent resistance lower than any individual branch; hf is the drop across the junction pair, not the whole system",
    "Using the same friction factor and velocity for all branches when computing Re — each branch has a different Q and D, so V_i and Re_i must be computed separately and iterated to convergence",
    "Confusing Darcy friction factor with Fanning friction factor — f_Darcy = 4 × f_Fanning; using the Fanning value in h_f = f(L/D)(V²/2g) gives head loss 4× too small",
  ],
  seriesPipe: [
    "Assuming the same friction factor applies to all pipes — each pipe has its own Reynolds number and relative roughness, so f must be computed separately for each pipe segment",
    "Forgetting that the Darcy friction factor is 4× the Fanning friction factor — some references tabulate f_Fanning; using it directly in h_f = f(L/D)(V²/2g) underestimates head loss by 4×",
    "Omitting minor losses in short-pipe systems — for pipes shorter than ~50 diameters, fitting losses (bends, valves, sudden expansions) can dominate; the simplified major-loss-only model is only valid for long straight pipes",
    "Using the same velocity for all pipes — in series flow Q is constant, but V = Q/A changes with diameter; a smaller diameter pipe has higher velocity and disproportionately larger head loss (hf ∝ V²/D)",
  ],
  waterHammer: [
    "Applying Joukowsky to slow valve closure — the equation gives the maximum surge only for instantaneous closure; a closure time longer than 2L/a (the pipe period) produces a smaller surge proportional to the closure rate",
    "Setting ΔV = V when the valve only partially closes — ΔV is the actual change in flow velocity, not the initial velocity; partial closure reduces the surge accordingly",
    "Treating ΔP as absolute pressure — the surge adds on top of the existing operating pressure; the pipe must withstand P_operating + ΔP, so always check the combined pressure against the pipe pressure rating",
    "Ignoring the return rarefaction wave — the negative wave travelling back from the valve can drop local pressure below vapour pressure, causing cavitation and potential column separation",
    "Using the speed of sound in water (≈1480 m/s) as the wavespeed — the actual wavespeed in a pipe is lower because pipe-wall compliance reduces it; steel pipes typically give 1000–1400 m/s depending on D/t ratio",
  ],
};

// ============================================================================
// Swirl Number
// ============================================================================

export type SwirlMode    = "direct" | "velocity" | "vane";
export type SwirlProfile = "solidBody" | "freeVortex" | "uniform";
export type SwirlClass   = "weak" | "moderate" | "strong";

export interface SwirlNumberInput {
  mode: SwirlMode;
  radius: number;                 // m  pipe outer radius R
  // Direct mode
  angularMomentumFlux?: number;   // N·m  G_θ
  axialMomentumFlux?: number;     // N    G_x
  // Velocity mode
  axialVelocity?: number;         // m/s  V_x
  tangentialVelocity?: number;    // m/s  V_θ at r = R
  velocityProfile?: SwirlProfile; // default solidBody
  // Vane mode (Beer-Chigier)
  vaneAngle?: number;             // degrees  φ from axial
  innerRadius?: number;           // m  r_i (hub radius)
}

export interface SwirlNumberResult {
  swirlNumber: number;
  classification: SwirlClass;
  hasCRZ: boolean;
  profileFactor?: number;          // k: S = k × V_θ/V_x (velocity mode)
  angularMomentumFlux?: number;    // N·m
  axialMomentumFlux?: number;      // N
  interpretation: string;
}

export function calculateSwirlNumber(input: SwirlNumberInput): SwirlNumberResult {
  const { mode, radius } = input;
  if (radius <= 0) throw new Error("Radius must be positive");

  let S: number;
  let angularMomentumFlux: number | undefined;
  let axialMomentumFlux: number | undefined;
  let profileFactor: number | undefined;

  if (mode === "direct") {
    const { angularMomentumFlux: Gth, axialMomentumFlux: Gx } = input;
    if (!Gth || !Gx || Gx === 0) throw new Error("G_θ and G_x (non-zero) are required");
    angularMomentumFlux = Gth;
    axialMomentumFlux   = Gx;
    S = Gth / (Gx * radius);

  } else if (mode === "velocity") {
    const { axialVelocity: Vx, tangentialVelocity: Vth, velocityProfile = "solidBody" } = input;
    if (!Vx || Vx <= 0 || !Vth || Vth < 0) throw new Error("Axial and tangential velocities are required");
    // Shape factor k: S = k × (V_θ(R) / V_x)
    const k = velocityProfile === "solidBody" ? 0.5 : velocityProfile === "freeVortex" ? 1.0 : 2/3;
    profileFactor = k;
    S = k * (Vth / Vx);

  } else {
    // Vane — Beer-Chigier formula
    const { vaneAngle, innerRadius = 0 } = input;
    if (!vaneAngle) throw new Error("Vane angle is required");
    const ri = innerRadius, ro = radius;
    if (ri >= ro) throw new Error("Inner radius must be less than outer radius");
    const ratio = ri / ro;
    S = (2/3) * Math.tan(vaneAngle * Math.PI / 180) * (1 - ratio ** 3) / (1 - ratio ** 2);
  }

  const classification: SwirlClass = S < 0.4 ? "weak" : S <= 0.6 ? "moderate" : "strong";
  const hasCRZ = S > 0.6;

  const crzStr = hasCRZ
    ? "Strong swirl — central recirculation zone (CRZ) expected."
    : S >= 0.4
    ? "Moderate swirl — CRZ possible depending on geometry."
    : "Weak swirl — no recirculation zone expected.";

  return {
    swirlNumber: S, classification, hasCRZ,
    profileFactor, angularMomentumFlux, axialMomentumFlux,
    interpretation: `S = ${fmtN(S)}. ${crzStr}`,
  };
}

export function generateSwirlNumberSteps(input: SwirlNumberInput, result: SwirlNumberResult): Step[] {
  const { mode, radius } = input;

  function nf(x: number): string {
    if (x === 0) return "0";
    const abs = Math.abs(x);
    if (abs >= 1e-3 && abs < 1e5) return parseFloat(x.toPrecision(4)).toString();
    const e = Math.floor(Math.log10(abs));
    const m = parseFloat((x / Math.pow(10, e)).toPrecision(4));
    return `${m} \\times 10^{${e}}`;
  }

  if (mode === "direct") {
    const Gth = result.angularMomentumFlux!, Gx = result.axialMomentumFlux!;
    return [
      { description: "Swirl number definition",
        formula: "S = \\frac{G_\\theta}{G_x \\cdot R}" },
      { description: "Substitute angular momentum flux, axial momentum flux, and radius",
        calculation: `S = \\frac{${nf(Gth)}}{${nf(Gx)} \\times ${nf(radius)}} = ${nf(result.swirlNumber)}`,
        result: `${nf(result.swirlNumber)}`, unit: "dimensionless" },
    ];
  }

  if (mode === "velocity") {
    const { axialVelocity: Vx, tangentialVelocity: Vth, velocityProfile = "solidBody" } = input;
    const k = result.profileFactor!;
    const profileName = velocityProfile === "solidBody" ? "solid-body (k = 1/2)" :
                        velocityProfile === "freeVortex" ? "free-vortex (k = 1)" : "uniform (k = 2/3)";
    return [
      { description: `Velocity profile: ${profileName}`,
        formula: "S = k \\cdot \\frac{V_\\theta(R)}{V_x}" },
      { description: "Substitute profile factor and velocities",
        calculation: `S = ${nf(k)} \\times \\frac{${nf(Vth!)}}{${nf(Vx!)}} = ${nf(result.swirlNumber)}`,
        result: `${nf(result.swirlNumber)}`, unit: "dimensionless" },
    ];
  }

  // Vane
  const { vaneAngle, innerRadius = 0 } = input;
  const ratio = innerRadius / radius;
  const geomFactor = (1 - ratio ** 3) / (1 - ratio ** 2);
  return [
    { description: "Beer-Chigier swirl vane formula",
      formula: "S = \\frac{2}{3} \\tan\\varphi \\cdot \\frac{1 - (r_i/R)^3}{1 - (r_i/R)^2}" },
    { description: "Compute geometry factor",
      calculation: `\\frac{r_i}{R} = ${nf(ratio)}, \\quad \\frac{1 - ${nf(ratio)}^3}{1 - ${nf(ratio)}^2} = ${nf(geomFactor)}` },
    { description: "Apply vane angle and geometry factor",
      calculation: `S = \\frac{2}{3} \\times \\tan(${vaneAngle}^\\circ) \\times ${nf(geomFactor)} = ${nf(result.swirlNumber)}`,
      result: `${nf(result.swirlNumber)}`, unit: "dimensionless" },
  ];
}

// ============================================================================
// Vortex Flow
// ============================================================================

export type VortexType = "free" | "forced" | "rankine";

export interface VortexFlowInput {
  vortexType: VortexType;
  radius: number;            // m  query point
  density: number;           // kg/m³
  gravity?: number;          // m/s² (default 9.81)
  // Free vortex
  circulation?: number;      // m²/s  Γ (alternative: refRadius + refVelocity)
  refRadius?: number;        // m  r₀ for pressure reference
  refVelocity?: number;      // m/s  Vθ at r₀ (to derive Γ)
  // Forced vortex
  angularVelocity?: number;  // rad/s ω
  // Rankine vortex
  coreRadius?: number;       // m  rc
  maxVelocity?: number;      // m/s  Vθ_max at r = rc
}

export interface VortexFlowResult {
  tangentialVelocity: number;  // m/s  Vθ at r
  angularVelocityLocal: number;// rad/s  effective ω = Vθ/r
  centripetalAccel: number;    // m/s²  Vθ²/r
  pressureRise: number;        // Pa  p(r) − p_ref
  surfaceElevation?: number;   // m  free surface height relative to reference
  circulation?: number;        // m²/s  Γ (free & Rankine outer)
  region?: "core" | "outer";  // Rankine only
  interpretation: string;
}

export function calculateVortexFlow(input: VortexFlowInput): VortexFlowResult {
  const { vortexType, radius, density, gravity = 9.81 } = input;

  if (radius <= 0 || density <= 0) throw new Error("Radius and density must be positive");

  let Vtheta: number;
  let pressureRise: number;
  let surfaceElevation: number | undefined;
  let circulation: number | undefined;
  let region: "core" | "outer" | undefined;

  if (vortexType === "free") {
    let Gamma: number;
    if (input.circulation !== undefined && input.circulation > 0) {
      Gamma = input.circulation;
    } else if (input.refRadius !== undefined && input.refVelocity !== undefined) {
      Gamma = 2 * Math.PI * input.refRadius * input.refVelocity;
    } else {
      throw new Error("Free vortex requires Γ or (r₀, Vθ₀)");
    }
    const r0 = input.refRadius ?? 1;
    Vtheta       = Gamma / (2 * Math.PI * radius);
    const Vref   = Gamma / (2 * Math.PI * r0);
    pressureRise = 0.5 * density * (Vref * Vref - Vtheta * Vtheta);
    surfaceElevation = pressureRise / (density * gravity);
    circulation  = Gamma;

  } else if (vortexType === "forced") {
    const omega = input.angularVelocity;
    if (!omega || omega <= 0) throw new Error("Forced vortex requires angular velocity ω > 0");
    Vtheta        = omega * radius;
    pressureRise  = 0.5 * density * omega * omega * radius * radius;
    surfaceElevation = omega * omega * radius * radius / (2 * gravity);

  } else {
    // Rankine
    const rc   = input.coreRadius;
    const Vmax = input.maxVelocity;
    if (!rc || rc <= 0 || !Vmax || Vmax <= 0)
      throw new Error("Rankine vortex requires core radius rc > 0 and max velocity Vθ_max > 0");
    const omega = Vmax / rc;
    circulation  = 2 * Math.PI * rc * Vmax;

    if (radius <= rc) {
      region        = "core";
      Vtheta        = omega * radius;
      pressureRise  = 0.5 * density * omega * omega * radius * radius;
      surfaceElevation = omega * omega * radius * radius / (2 * gravity);
    } else {
      region        = "outer";
      Vtheta        = Vmax * rc / radius;
      pressureRise  = 0.5 * density * Vmax * Vmax * (2 - rc * rc / (radius * radius));
      surfaceElevation = undefined;
    }
  }

  const angularVelocityLocal = Vtheta / radius;
  const centripetalAccel     = Vtheta * Vtheta / radius;

  const regionStr = region ? ` (${region} region)` : "";
  return {
    tangentialVelocity: Vtheta,
    angularVelocityLocal, centripetalAccel, pressureRise,
    surfaceElevation, circulation, region,
    interpretation: `Tangential velocity = ${fmtN(Vtheta)} m/s${regionStr}. ΔP = ${fmtN(pressureRise)} Pa. Centripetal acc = ${fmtN(centripetalAccel)} m/s².`,
  };
}

export function generateVortexFlowSteps(input: VortexFlowInput, result: VortexFlowResult): Step[] {
  const { vortexType, radius, density } = input;
  const { tangentialVelocity: Vt, pressureRise } = result;

  function nf(x: number): string {
    if (x === 0) return "0";
    const abs = Math.abs(x);
    if (abs >= 1e-3 && abs < 1e5) return parseFloat(x.toPrecision(4)).toString();
    const e = Math.floor(Math.log10(abs));
    const m = parseFloat((x / Math.pow(10, e)).toPrecision(4));
    return `${m} \\times 10^{${e}}`;
  }

  if (vortexType === "free") {
    const Gamma = result.circulation!;
    const r0 = input.refRadius ?? 1;
    const Vref = Gamma / (2 * Math.PI * r0);
    const fromGamma = input.circulation !== undefined;
    return [
      fromGamma
        ? { description: "Circulation Γ is given directly",
            formula: "\\Gamma = 2\\pi r_0 V_{\\theta 0} = \\text{const}",
            calculation: `\\Gamma = ${nf(Gamma)} \\text{ m}^2\\text{/s}` }
        : { description: "Derive circulation from reference point",
            formula: "\\Gamma = 2\\pi r_0 V_{\\theta 0}",
            calculation: `\\Gamma = 2\\pi \\times ${nf(r0)} \\times ${nf(input.refVelocity!)} = ${nf(Gamma)} \\text{ m}^2\\text{/s}` },
      { description: "Tangential velocity at query radius",
        formula: "V_\\theta = \\frac{\\Gamma}{2\\pi r}",
        calculation: `V_\\theta = \\frac{${nf(Gamma)}}{2\\pi \\times ${nf(radius)}} = ${nf(Vt)} \\text{ m/s}`,
        result: `${nf(Vt)}`, unit: "m/s" },
      { description: "Pressure rise relative to reference radius r₀",
        formula: "\\Delta P = \\tfrac{1}{2}\\rho\\left(V_{\\theta 0}^2 - V_\\theta^2\\right)",
        calculation: `\\Delta P = \\tfrac{1}{2} \\times ${nf(density)} \\times \\left(${nf(Vref)}^2 - ${nf(Vt)}^2\\right) = ${nf(pressureRise)} \\text{ Pa}` },
    ];
  }

  if (vortexType === "forced") {
    const omega = input.angularVelocity!;
    return [
      { description: "Tangential velocity — rigid-body rotation",
        formula: "V_\\theta = \\omega r",
        calculation: `V_\\theta = ${nf(omega)} \\times ${nf(radius)} = ${nf(Vt)} \\text{ m/s}`,
        result: `${nf(Vt)}`, unit: "m/s" },
      { description: "Pressure rise from the axis",
        formula: "\\Delta P = \\tfrac{1}{2}\\rho\\omega^2 r^2",
        calculation: `\\Delta P = \\tfrac{1}{2} \\times ${nf(density)} \\times ${nf(omega)}^2 \\times ${nf(radius)}^2 = ${nf(pressureRise)} \\text{ Pa}` },
      { description: "Free-surface elevation (paraboloid)",
        formula: "z = \\frac{\\omega^2 r^2}{2g}",
        calculation: `z = \\frac{${nf(omega)}^2 \\times ${nf(radius)}^2}{2 \\times 9.81} = ${nf(result.surfaceElevation!)} \\text{ m}` },
    ];
  }

  // Rankine
  const rc = input.coreRadius!, Vmax = input.maxVelocity!;
  const omega = Vmax / rc;
  const isCore = result.region === "core";
  return [
    { description: "Determine core angular velocity and query region",
      formula: "\\omega = \\frac{V_{\\theta,\\max}}{r_c}",
      calculation: `\\omega = \\frac{${nf(Vmax)}}{${nf(rc)}} = ${nf(omega)} \\text{ rad/s}, \\quad r = ${nf(radius)} \\text{ m} ${isCore ? "\\leq" : ">"} r_c = ${nf(rc)} \\text{ m} \\Rightarrow \\text{${isCore ? "core" : "outer"} region}` },
    { description: isCore
        ? "Tangential velocity — core (forced-vortex behaviour)"
        : "Tangential velocity — outer (free-vortex behaviour)",
      formula: isCore
        ? "V_\\theta = \\omega r"
        : "V_\\theta = \\frac{V_{\\theta,\\max}\\, r_c}{r}",
      calculation: isCore
        ? `V_\\theta = ${nf(omega)} \\times ${nf(radius)} = ${nf(Vt)} \\text{ m/s}`
        : `V_\\theta = \\frac{${nf(Vmax)} \\times ${nf(rc)}}{${nf(radius)}} = ${nf(Vt)} \\text{ m/s}`,
      result: `${nf(Vt)}`, unit: "m/s" },
    { description: "Pressure rise from centre",
      formula: isCore
        ? "\\Delta P = \\tfrac{1}{2}\\rho\\omega^2 r^2"
        : "\\Delta P = \\tfrac{1}{2}\\rho V_{\\theta,\\max}^2\\!\\left(2 - \\frac{r_c^2}{r^2}\\right)",
      calculation: isCore
        ? `\\Delta P = \\tfrac{1}{2} \\times ${nf(density)} \\times ${nf(omega)}^2 \\times ${nf(radius)}^2 = ${nf(pressureRise)} \\text{ Pa}`
        : `\\Delta P = \\tfrac{1}{2} \\times ${nf(density)} \\times ${nf(Vmax)}^2 \\times \\left(2 - \\frac{${nf(rc)}^2}{${nf(radius)}^2}\\right) = ${nf(pressureRise)} \\text{ Pa}` },
  ];
}

// ============================================================================
// Control Volume Force (Pipe Bend / Nozzle / Reducer)
// ============================================================================

export interface ControlVolumeForceInput {
  diameter1: number;    // m  inlet
  diameter2: number;    // m  outlet
  pressure1: number;    // Pa gauge  inlet
  pressure2: number;    // Pa gauge  outlet
  bendAngle: number;    // degrees  angle of outlet from inlet direction (0=straight, 90=elbow, 180=U)
  flowRate: number;     // m³/s
  density: number;      // kg/m³
}

export interface ControlVolumeForceResult {
  velocity1: number;        // m/s
  velocity2: number;        // m/s
  massFlowRate: number;     // kg/s
  area1: number;            // m²
  area2: number;            // m²
  // Force components — pipe exerts ON fluid
  Rx: number;               // N  x
  Ry: number;               // N  y
  // Reaction — fluid exerts ON pipe / support
  Fx: number;               // N  = −Rx
  Fy: number;               // N  = −Ry
  totalForce: number;       // N  magnitude
  forceAngle: number;       // degrees  direction of force-on-pipe from +x axis
  // Terms breakdown
  momentumFlux1: number;    // N  ṁV₁  inlet contribution
  momentumFlux2: number;    // N  ṁV₂  outlet contribution
  pressureForce1: number;   // N  P₁A₁
  pressureForce2: number;   // N  P₂A₂
  interpretation: string;
}

export function calculateControlVolumeForce(input: ControlVolumeForceInput): ControlVolumeForceResult {
  const { diameter1, diameter2, pressure1, pressure2, bendAngle, flowRate, density } = input;

  if (diameter1 <= 0 || diameter2 <= 0 || flowRate <= 0 || density <= 0)
    throw new Error("Diameters, flow rate, and density must be positive");

  const area1 = Math.PI * Math.pow(diameter1 / 2, 2);
  const area2 = Math.PI * Math.pow(diameter2 / 2, 2);
  const velocity1 = flowRate / area1;
  const velocity2 = flowRate / area2;
  const massFlowRate = density * flowRate;

  const θ = bendAngle * Math.PI / 180;
  const cosθ = Math.cos(θ);
  const sinθ = Math.sin(θ);

  // Momentum equation — force of PIPE on FLUID
  // x: Rx + P₁A₁ − P₂A₂cosθ = ṁ(V₂cosθ − V₁)
  // y: Ry − P₂A₂sinθ = ṁV₂sinθ
  const Rx = massFlowRate * (velocity2 * cosθ - velocity1) - pressure1 * area1 + pressure2 * area2 * cosθ;
  const Ry = massFlowRate * velocity2 * sinθ + pressure2 * area2 * sinθ;

  // Reaction — force of FLUID on PIPE / support
  const Fx = -Rx;
  const Fy = -Ry;
  const totalForce = Math.sqrt(Fx * Fx + Fy * Fy);
  const forceAngle = Math.atan2(Fy, Fx) * 180 / Math.PI;

  const momentumFlux1  = massFlowRate * velocity1;
  const momentumFlux2  = massFlowRate * velocity2;
  const pressureForce1 = pressure1 * area1;
  const pressureForce2 = pressure2 * area2;

  return {
    velocity1, velocity2, massFlowRate, area1, area2,
    Rx, Ry, Fx, Fy, totalForce, forceAngle,
    momentumFlux1, momentumFlux2, pressureForce1, pressureForce2,
    interpretation: `Force on fitting: |F| = ${fmtN(totalForce)} N at ${fmtN(forceAngle)}° from +x. Fx = ${fmtN(Fx)} N, Fy = ${fmtN(Fy)} N.`,
  };
}

export function generateControlVolumeForceSteps(input: ControlVolumeForceInput, result: ControlVolumeForceResult): Step[] {
  const { bendAngle, density, flowRate, pressure1, pressure2 } = input;
  const { area1, area2, velocity1, velocity2, massFlowRate, Rx, Ry, Fx, Fy } = result;
  const cosθ = Math.cos(bendAngle * Math.PI / 180);
  const sinθ = Math.sin(bendAngle * Math.PI / 180);

  function nf(x: number): string {
    if (x === 0) return "0";
    const abs = Math.abs(x);
    if (abs >= 1e-3 && abs < 1e5) return parseFloat(x.toPrecision(4)).toString();
    const e = Math.floor(Math.log10(abs));
    const m = parseFloat((x / Math.pow(10, e)).toPrecision(4));
    return `${m} \\times 10^{${e}}`;
  }

  return [
    {
      description: "Cross-sectional areas from pipe diameters",
      formula: "A = \\frac{\\pi D^2}{4}",
      calculation: `A_1 = ${nf(area1)} \\text{ m}^2, \\quad A_2 = ${nf(area2)} \\text{ m}^2`,
    },
    {
      description: "Velocities at inlet and outlet from continuity",
      formula: "V = \\frac{Q}{A}",
      calculation: `V_1 = \\frac{${nf(flowRate)}}{${nf(area1)}} = ${nf(velocity1)} \\text{ m/s}, \\quad V_2 = \\frac{${nf(flowRate)}}{${nf(area2)}} = ${nf(velocity2)} \\text{ m/s}`,
    },
    {
      description: "Mass flow rate",
      formula: "\\dot{m} = \\rho Q",
      calculation: `\\dot{m} = ${nf(density)} \\times ${nf(flowRate)} = ${nf(massFlowRate)} \\text{ kg/s}`,
    },
    {
      description: "x-momentum equation — force of pipe on fluid",
      formula: "R_x = \\dot{m}(V_2\\cos\\theta - V_1) - P_1 A_1 + P_2 A_2\\cos\\theta",
      calculation: `R_x = ${nf(massFlowRate)}(${nf(velocity2)} \\times ${nf(cosθ)} - ${nf(velocity1)}) - ${nf(pressure1)} \\times ${nf(area1)} + ${nf(pressure2)} \\times ${nf(area2)} \\times ${nf(cosθ)} = ${nf(Rx)} \\text{ N}`,
    },
    {
      description: "y-momentum equation — force of pipe on fluid",
      formula: "R_y = \\dot{m}\\, V_2\\sin\\theta + P_2 A_2\\sin\\theta",
      calculation: `R_y = ${nf(massFlowRate)} \\times ${nf(velocity2)} \\times ${nf(sinθ)} + ${nf(pressure2)} \\times ${nf(area2)} \\times ${nf(sinθ)} = ${nf(Ry)} \\text{ N}`,
    },
    {
      description: "Reaction force on fitting — fluid exerts on pipe",
      formula: "F_x = -R_x, \\quad F_y = -R_y",
      calculation: `F_x = ${nf(Fx)} \\text{ N}, \\quad F_y = ${nf(Fy)} \\text{ N}`,
    },
    {
      description: "Total force magnitude and direction",
      formula: "|F| = \\sqrt{F_x^2 + F_y^2}",
      calculation: `|F| = \\sqrt{(${nf(Fx)})^2 + (${nf(Fy)})^2} = ${nf(result.totalForce)} \\text{ N at } ${nf(result.forceAngle)}^\\circ \\text{ from +x}`,
      result: `${nf(result.totalForce)}`,
      unit: "N",
    },
  ];
}

// ============================================================================
// Momentum Flux
// ============================================================================

export interface MomentumFluxInput {
  velocity: number;              // m/s mean velocity
  area: number;                  // m²
  density: number;               // kg/m³
  momentumCorrFactor?: number;   // β  (default 1.0)
  energyCorrFactor?: number;     // α  (default 1.0)
}

export interface MomentumFluxResult {
  momentumFlux: number;       // N   β × ρAV²  = β × ṁV
  massFlowRate: number;       // kg/s  ρAV
  volumeFlowRate: number;     // m³/s  AV
  kineticEnergyFlux: number;  // W   α × ½ρAV³
  dynamicPressure: number;    // Pa  ½ρV²
  jetForce: number;           // N   same as momentumFlux — force on perpendicular flat plate
  beta: number;               // momentum correction factor used
  alpha: number;              // energy correction factor used
  interpretation: string;
}

export function calculateMomentumFlux(input: MomentumFluxInput): MomentumFluxResult {
  const { velocity, area, density, momentumCorrFactor = 1.0, energyCorrFactor = 1.0 } = input;

  if (velocity < 0 || area <= 0 || density <= 0)
    throw new Error("Velocity must be non-negative; area and density must be positive");

  const massFlowRate     = density * area * velocity;
  const volumeFlowRate   = area * velocity;
  const dynamicPressure  = 0.5 * density * velocity * velocity;
  const momentumFlux     = momentumCorrFactor * massFlowRate * velocity;
  const kineticEnergyFlux= energyCorrFactor * 0.5 * density * area * Math.pow(velocity, 3);
  const jetForce         = momentumFlux;

  return {
    momentumFlux, massFlowRate, volumeFlowRate,
    kineticEnergyFlux, dynamicPressure, jetForce,
    beta: momentumCorrFactor, alpha: energyCorrFactor,
    interpretation: `J = ${fmtN(momentumFlux)} N, ṁ = ${fmtN(massFlowRate)} kg/s, Q = ${fmtN(volumeFlowRate * 1000)} L/s (β = ${fmtN(momentumCorrFactor)}).`,
  };
}

export function generateMomentumFluxSteps(input: MomentumFluxInput, result: MomentumFluxResult): Step[] {
  const { velocity, area, density, momentumCorrFactor = 1.0, energyCorrFactor = 1.0 } = input;

  const nf = (v: number, sig = 5): string => {
    const s = parseFloat(v.toPrecision(sig)).toString();
    return s.replace(/e([+-]?)(\d+)/i, (_m, sign, exp) =>
      `\\times 10^{${sign === "-" ? "-" : ""}${parseInt(exp)}}`
    );
  };

  return [
    {
      description: "Mass flow rate ṁ = ρAV",
      formula: "\\dot{m} = \\rho A V",
      calculation: `\\dot{m} = ${nf(density)} \\times ${nf(area)} \\times ${nf(velocity)} = ${nf(result.massFlowRate)}`,
      result: nf(result.massFlowRate),
      unit: "kg/s",
    },
    {
      description: "Momentum flux J = β × ṁ × V",
      formula: "J = \\beta \\times \\dot{m} \\times V = \\beta \\rho A V^2",
      calculation: `J = ${nf(momentumCorrFactor)} \\times ${nf(result.massFlowRate)} \\times ${nf(velocity)} = ${nf(result.momentumFlux)}`,
      result: nf(result.momentumFlux),
      unit: "N",
    },
    {
      description: "Kinetic energy flux Ek = α × ½ρAV³",
      formula: "E_k = \\alpha \\times \\tfrac{1}{2}\\rho A V^3",
      calculation: `E_k = ${nf(energyCorrFactor)} \\times \\tfrac{1}{2} \\times ${nf(density)} \\times ${nf(area)} \\times ${nf(velocity)}^3 = ${nf(result.kineticEnergyFlux)}`,
      result: nf(result.kineticEnergyFlux),
      unit: "W",
    },
    {
      description: "Jet impingement force on stationary flat plate perpendicular to jet",
      formula: "F = J = \\beta \\rho A V^2",
      calculation: `F = J = ${nf(result.jetForce)} \\text{ N} \\quad (\\text{full momentum reversal})`,
      result: nf(result.jetForce),
      unit: "N",
    },
  ];
}

// ============================================================================
// Boundary Layer Thickness (Flat Plate)
// ============================================================================

export type BoundaryLayerMode = "auto" | "laminar" | "turbulent";

export interface BoundaryLayerInput {
  x: number;            // m  distance from leading edge
  velocity: number;     // m/s free-stream
  density: number;      // kg/m³
  viscosity: number;    // Pa·s
  mode?: BoundaryLayerMode; // default "auto"
  plateLength?: number; // m  (for average CD and drag)
  plateWidth?: number;  // m  (for drag force)
}

export interface BoundaryLayerResult {
  rex: number;              // local Re_x
  regime: "laminar" | "turbulent";
  delta: number;            // m  δ — 99% BL thickness
  deltaStar: number;        // m  δ* — displacement thickness
  theta: number;            // m  θ — momentum thickness
  shapeFactor: number;      // H = δ*/θ
  localCf: number;          // local skin friction coeff.
  wallShear: number;        // Pa  τw = Cf × ½ρV²
  averageCd?: number;       // average drag coeff. over plate length
  dragForce?: number;       // N  (if plateWidth provided)
  interpretation: string;
}

const REX_TRANSITION = 5e5;

export function calculateBoundaryLayer(input: BoundaryLayerInput): BoundaryLayerResult {
  const { x, velocity, density, viscosity, mode = "auto", plateLength, plateWidth } = input;

  if (x <= 0 || velocity <= 0 || density <= 0 || viscosity <= 0)
    throw new Error("All inputs must be positive");

  const rex     = (density * velocity * x) / viscosity;
  const q       = 0.5 * density * velocity * velocity;

  const isLaminar = mode === "laminar" || (mode === "auto" && rex < REX_TRANSITION);
  const regime: BoundaryLayerResult["regime"] = isLaminar ? "laminar" : "turbulent";

  let delta: number, deltaStar: number, theta: number, localCf: number;

  if (isLaminar) {
    // Blasius solution
    delta    = 5.0  * x / Math.sqrt(rex);
    deltaStar= 1.72 * x / Math.sqrt(rex);
    theta    = 0.664 * x / Math.sqrt(rex);
    localCf  = 0.664 / Math.sqrt(rex);
  } else {
    // 1/7-power-law (Prandtl/Schlichting)
    delta    = 0.37  * x / Math.pow(rex, 0.2);
    deltaStar= delta / 8;
    theta    = 7 * delta / 72;
    localCf  = 0.0592 / Math.pow(rex, 0.2);
  }

  const shapeFactor = deltaStar / theta;
  const wallShear   = localCf * q;

  // Average drag coefficient over plate length L
  let averageCd: number | undefined;
  let dragForce: number | undefined;

  if (plateLength && plateLength > 0) {
    const reL = (density * velocity * plateLength) / viscosity;
    if (mode === "laminar" || (mode === "auto" && reL < REX_TRANSITION)) {
      averageCd = 1.328 / Math.sqrt(reL);
    } else if (mode === "turbulent") {
      averageCd = 0.074 / Math.pow(reL, 0.2);
    } else {
      // Mixed: laminar up to Rex_crit, turbulent beyond
      averageCd = 0.074 / Math.pow(reL, 0.2) - 1742 / reL;
    }
    if (plateWidth && plateWidth > 0) {
      dragForce = averageCd * q * plateLength * plateWidth;
    }
  }

  const regimeLabel = regime.charAt(0).toUpperCase() + regime.slice(1);
  return {
    rex, regime, delta, deltaStar, theta, shapeFactor, localCf, wallShear,
    averageCd, dragForce,
    interpretation: `${regimeLabel} BL at x = ${fmtN(x * 1000)} mm. δ = ${fmtN(delta * 1000)} mm, δ* = ${fmtN(deltaStar * 1000)} mm, τw = ${fmtN(wallShear)} Pa.`,
  };
}

export function generateBoundaryLayerSteps(input: BoundaryLayerInput, result: BoundaryLayerResult): Step[] {
  const { x, velocity, density, viscosity } = input;
  const { rex, regime, delta, deltaStar, theta, localCf, wallShear } = result;
  const isLaminar = regime === "laminar";
  const q = 0.5 * density * velocity * velocity;

  const nf = (v: number, sig = 5): string => {
    const s = parseFloat(v.toPrecision(sig)).toString();
    return s.replace(/e([+-]?)(\d+)/i, (_m, sign, exp) =>
      `\\times 10^{${sign === "-" ? "-" : ""}${parseInt(exp)}}`
    );
  };

  const steps: Step[] = [
    {
      description: "Local Reynolds number Re_x = ρVx / μ",
      formula: "Re_x = \\frac{\\rho V x}{\\mu}",
      calculation: `Re_x = \\frac{${nf(density)} \\times ${nf(velocity)} \\times ${nf(x)}}{${nf(viscosity)}} = ${nf(rex)}`,
      result: nf(rex),
      unit: "dimensionless",
    },
    {
      description: `Regime: ${isLaminar ? "laminar (Re_x < 5×10⁵) — Blasius solution" : "turbulent (Re_x ≥ 5×10⁵) — 1/7 power law"}`,
      calculation: `Re_x = ${nf(rex)} ${isLaminar ? "< 5 \\times 10^5" : "\\geq 5 \\times 10^5"}`,
    },
    {
      description: isLaminar ? "BL thickness δ = 5.0 x / √Re_x" : "BL thickness δ = 0.37 x / Re_x^0.2",
      formula: isLaminar
        ? "\\delta = \\frac{5.0\\, x}{\\sqrt{Re_x}}"
        : "\\delta = \\frac{0.37\\, x}{Re_x^{0.2}}",
      calculation: isLaminar
        ? `\\delta = \\frac{5.0 \\times ${nf(x)}}{\\sqrt{${nf(rex)}}} = ${nf(delta)}`
        : `\\delta = \\frac{0.37 \\times ${nf(x)}}{${nf(rex)}^{0.2}} = ${nf(delta)}`,
      result: nf(delta),
      unit: "m",
    },
    {
      description: isLaminar
        ? "Displacement thickness δ* = 1.72x/√Re_x, momentum thickness θ = 0.664x/√Re_x"
        : "Displacement thickness δ* = δ/8, momentum thickness θ = 7δ/72",
      formula: isLaminar
        ? "\\delta^* = \\frac{1.72\\, x}{\\sqrt{Re_x}}, \\quad \\theta = \\frac{0.664\\, x}{\\sqrt{Re_x}}"
        : "\\delta^* = \\frac{\\delta}{8}, \\quad \\theta = \\frac{7\\delta}{72}",
      calculation: `\\delta^* = ${nf(deltaStar)} \\text{ m}, \\quad \\theta = ${nf(theta)} \\text{ m}, \\quad H = ${nf(result.shapeFactor)}`,
    },
    {
      description: isLaminar ? "Local skin friction Cf = 0.664 / √Re_x" : "Local skin friction Cf = 0.0592 / Re_x^0.2",
      formula: isLaminar
        ? "C_f = \\frac{0.664}{\\sqrt{Re_x}}"
        : "C_f = \\frac{0.0592}{Re_x^{0.2}}",
      calculation: isLaminar
        ? `C_f = \\frac{0.664}{\\sqrt{${nf(rex)}}} = ${nf(localCf)}`
        : `C_f = \\frac{0.0592}{${nf(rex)}^{0.2}} = ${nf(localCf)}`,
      result: nf(localCf),
      unit: "dimensionless",
    },
    {
      description: "Wall shear stress τw = Cf × ½ρV²",
      formula: "\\tau_w = C_f \\times \\tfrac{1}{2}\\rho V^2",
      calculation: `\\tau_w = ${nf(localCf)} \\times ${nf(q)} = ${nf(wallShear)}`,
      result: nf(wallShear),
      unit: "Pa",
    },
  ];

  if (result.averageCd !== undefined) {
    steps.push({
      description: "Average drag coefficient over plate length",
      formula: isLaminar
        ? "C_D = \\frac{1.328}{\\sqrt{Re_L}}"
        : "C_D = \\frac{0.074}{Re_L^{0.2}}",
      calculation: `C_D = ${nf(result.averageCd)}${result.dragForce !== undefined ? `, \\quad F_D = ${nf(result.dragForce)} \\text{ N}` : ""}`,
      result: nf(result.averageCd),
      unit: "dimensionless",
    });
  }

  return steps;
}

// ============================================================================
// Lift Force
// ============================================================================

export type LiftMode = "findL" | "findCL" | "findVstall";

export interface LiftForceInput {
  mode: LiftMode;
  liftCoefficient?: number;  // CL (required for findL, findVstall)
  velocity?: number;         // m/s (required for findL, findCL)
  density: number;           // kg/m³
  wingArea: number;          // m² planform reference area
  targetLift?: number;       // N  (required for findCL, findVstall = weight in level flight)
  dragCoefficient?: number;  // CD (optional — for L/D ratio)
}

export interface LiftForceResult {
  liftForce: number;         // N
  liftCoefficient: number;   // CL
  velocity: number;          // m/s (stall speed for findVstall, input V otherwise)
  dynamicPressure: number;   // Pa
  wingLoading: number;       // N/m²
  dragForce?: number;        // N
  liftToDragRatio?: number;  // L/D = CL/CD
  interpretation: string;
}

export function calculateLiftForce(input: LiftForceInput): LiftForceResult {
  const { mode, density, wingArea, dragCoefficient } = input;

  if (density <= 0 || wingArea <= 0) throw new Error("Density and wing area must be positive");

  let liftForce: number, liftCoefficient: number, velocity: number, dynamicPressure: number;

  if (mode === "findL") {
    if (input.liftCoefficient === undefined || input.velocity === undefined)
      throw new Error("CL and velocity are required");
    liftCoefficient = input.liftCoefficient;
    velocity        = input.velocity;
    dynamicPressure = 0.5 * density * velocity * velocity;
    liftForce       = liftCoefficient * dynamicPressure * wingArea;

  } else if (mode === "findCL") {
    if (input.targetLift === undefined || input.velocity === undefined)
      throw new Error("Target lift and velocity are required");
    liftForce       = input.targetLift;
    velocity        = input.velocity;
    dynamicPressure = 0.5 * density * velocity * velocity;
    if (dynamicPressure <= 0) throw new Error("Velocity must be positive");
    liftCoefficient = liftForce / (dynamicPressure * wingArea);

  } else {
    // findVstall
    if (input.liftCoefficient === undefined || input.targetLift === undefined)
      throw new Error("CL_max and target lift are required");
    liftCoefficient = input.liftCoefficient;
    liftForce       = input.targetLift;
    velocity        = Math.sqrt((2 * liftForce) / (density * wingArea * liftCoefficient));
    dynamicPressure = 0.5 * density * velocity * velocity;
  }

  const wingLoading      = liftForce / wingArea;
  const dragForce        = dragCoefficient !== undefined ? dragCoefficient * dynamicPressure * wingArea : undefined;
  const liftToDragRatio  = (dragCoefficient !== undefined && dragCoefficient > 0)
    ? liftCoefficient / dragCoefficient : undefined;

  const ldStr = liftToDragRatio !== undefined ? ` L/D = ${fmtN(liftToDragRatio)}.` : "";
  const modeStr = mode === "findVstall" ? `Stall speed = ${fmtN(velocity)} m/s.` :
                  mode === "findCL"     ? `CL = ${fmtN(liftCoefficient)}.` :
                  `L = ${fmtN(liftForce)} N.`;

  return {
    liftForce, liftCoefficient, velocity, dynamicPressure, wingLoading,
    dragForce, liftToDragRatio,
    interpretation: `${modeStr}${ldStr} Wing loading = ${fmtN(wingLoading)} N/m².`,
  };
}

export function generateLiftForceSteps(input: LiftForceInput, result: LiftForceResult): Step[] {
  const { mode, density, wingArea, dragCoefficient } = input;
  const { liftForce, liftCoefficient, velocity, dynamicPressure } = result;

  const nf = (v: number, sig = 5): string => {
    const s = parseFloat(v.toPrecision(sig)).toString();
    return s.replace(/e([+-]?)(\d+)/i, (_m, sign, exp) =>
      `\\times 10^{${sign === "-" ? "-" : ""}${parseInt(exp)}}`
    );
  };

  if (mode === "findL") {
    const steps: Step[] = [
      {
        description: "Lift equation",
        formula: "L = C_L \\times \\tfrac{1}{2}\\rho V^2 \\times S",
      },
      {
        description: "Compute dynamic pressure q = ½ρV²",
        formula: "q = \\tfrac{1}{2}\\rho V^2",
        calculation: `q = \\tfrac{1}{2} \\times ${nf(density)} \\times ${nf(velocity)}^2 = ${nf(dynamicPressure)}`,
        result: nf(dynamicPressure),
        unit: "Pa",
      },
      {
        description: "Calculate lift force L = CL × q × S",
        formula: "L = C_L \\times q \\times S",
        calculation: `L = ${nf(liftCoefficient)} \\times ${nf(dynamicPressure)} \\times ${nf(wingArea)} = ${nf(liftForce)}`,
        result: nf(liftForce),
        unit: "N",
      },
    ];
    if (dragCoefficient !== undefined && result.dragForce !== undefined) {
      steps.push({
        description: `Drag force and L/D ratio`,
        formula: "D = C_D \\times q \\times S, \\quad L/D = C_L / C_D",
        calculation: `D = ${nf(dragCoefficient)} \\times ${nf(dynamicPressure)} \\times ${nf(wingArea)} = ${nf(result.dragForce)} \\text{ N}, \\quad L/D = ${nf(liftCoefficient)} / ${nf(dragCoefficient)} = ${nf(result.liftToDragRatio!)}`,
      });
    }
    return steps;
  }

  if (mode === "findCL") {
    return [
      {
        description: "Rearrange lift equation for CL",
        formula: "C_L = \\frac{L}{\\tfrac{1}{2}\\rho V^2 \\times S}",
      },
      {
        description: "Compute dynamic pressure q = ½ρV²",
        formula: "q = \\tfrac{1}{2}\\rho V^2",
        calculation: `q = \\tfrac{1}{2} \\times ${nf(density)} \\times ${nf(velocity)}^2 = ${nf(dynamicPressure)}`,
        result: nf(dynamicPressure),
        unit: "Pa",
      },
      {
        description: "Calculate CL",
        formula: "C_L = \\frac{L}{q \\times S}",
        calculation: `C_L = \\frac{${nf(liftForce)}}{${nf(dynamicPressure)} \\times ${nf(wingArea)}} = ${nf(liftCoefficient)}`,
        result: nf(liftCoefficient),
        unit: "dimensionless",
      },
    ];
  }

  // findVstall
  const inner = (2 * liftForce) / (density * wingArea * liftCoefficient);
  return [
    {
      description: "Stall speed from lift equation solved for V",
      formula: "V_s = \\sqrt{\\frac{2L}{\\rho \\times S \\times C_{L,\\max}}}",
    },
    {
      description: "Substitute weight, density, area, and CL,max",
      formula: "V_s = \\sqrt{\\frac{2L}{\\rho \\times S \\times C_{L,\\max}}}",
      calculation: `V_s = \\sqrt{\\frac{2 \\times ${nf(liftForce)}}{${nf(density)} \\times ${nf(wingArea)} \\times ${nf(liftCoefficient)}}} = \\sqrt{${nf(inner)}}`,
    },
    {
      description: "Calculate stall speed",
      calculation: `V_s = ${nf(velocity)} \\text{ m/s} = ${nf(velocity * 3.6)} \\text{ km/h} = ${nf(velocity / 0.514444)} \\text{ knots}`,
      result: nf(velocity),
      unit: "m/s",
    },
  ];
}

// ============================================================================
// Non-Circular Duct Flow
// ============================================================================

export type DuctShape = "rectangular" | "square" | "annular" | "circular" | "parallelPlates";

export interface NonCircularDuctInput {
  shape: DuctShape;
  // Rectangular / parallelPlates
  width?: number;       // m  (a)
  height?: number;      // m  (b)
  // Square
  side?: number;        // m
  // Circular
  diameter?: number;    // m
  // Annular
  outerDiam?: number;   // m
  innerDiam?: number;   // m
  // Flow conditions
  velocity: number;     // m/s
  density: number;      // kg/m³
  viscosity: number;    // Pa·s
  length?: number;      // m  (for head loss)
  roughness?: number;   // m  absolute roughness (default 0)
  gravity?: number;     // m/s²
}

export interface NonCircularDuctResult {
  area: number;               // m²
  wettedPerimeter: number;    // m
  hydraulicDiameter: number;  // m  Dh = 4A/P
  hydraulicRadius: number;    // m  Rh = Dh/4
  flowRate: number;           // m³/s
  reynoldsNumber: number;
  regime: "laminar" | "transitional" | "turbulent";
  frictionFactor: number;
  relativeRoughness: number;  // ε/Dh
  headLoss?: number;          // m  (only if length provided)
  interpretation: string;
}

function ductGeometry(input: NonCircularDuctInput): { area: number; wettedPerimeter: number } {
  const { shape, width, height, side, diameter, outerDiam, innerDiam } = input;
  switch (shape) {
    case "rectangular": {
      const a = width!, b = height!;
      return { area: a * b, wettedPerimeter: 2 * (a + b) };
    }
    case "square": {
      const a = side!;
      return { area: a * a, wettedPerimeter: 4 * a };
    }
    case "circular": {
      const r = diameter! / 2;
      return { area: Math.PI * r * r, wettedPerimeter: Math.PI * diameter! };
    }
    case "annular": {
      const A = Math.PI * (outerDiam! * outerDiam! - innerDiam! * innerDiam!) / 4;
      const P = Math.PI * (outerDiam! + innerDiam!);
      return { area: A, wettedPerimeter: P };
    }
    case "parallelPlates": {
      const a = width!, b = height!;
      return { area: a * b, wettedPerimeter: 2 * (a + b) };
    }
    default:
      throw new Error("Unknown duct shape");
  }
}

export function calculateNonCircularDuct(input: NonCircularDuctInput): NonCircularDuctResult {
  const { velocity, density, viscosity, length, roughness = 0, gravity = 9.81 } = input;

  const { area, wettedPerimeter } = ductGeometry(input);
  if (area <= 0 || wettedPerimeter <= 0)
    throw new Error("Invalid geometry — check dimensions");

  const hydraulicDiameter = 4 * area / wettedPerimeter;
  const hydraulicRadius   = hydraulicDiameter / 4;
  const flowRate          = velocity * area;
  const reynoldsNumber    = (density * velocity * hydraulicDiameter) / viscosity;
  const relativeRoughness = roughness / hydraulicDiameter;

  const regime: NonCircularDuctResult["regime"] =
    reynoldsNumber < 2300 ? "laminar" : reynoldsNumber < 4000 ? "transitional" : "turbulent";

  let frictionFactor: number;
  if (reynoldsNumber < 2300) {
    frictionFactor = 64 / reynoldsNumber;
  } else {
    const t1 = relativeRoughness / 3.7;
    const t2 = 5.74 / Math.pow(reynoldsNumber, 0.9);
    frictionFactor = 0.25 / Math.pow(Math.log10(t1 + t2), 2);
  }

  const headLoss = length !== undefined
    ? frictionFactor * (length / hydraulicDiameter) * (velocity * velocity) / (2 * gravity)
    : undefined;

  const regimeLabel = regime.charAt(0).toUpperCase() + regime.slice(1);
  const hlStr = headLoss !== undefined ? ` Head loss: ${fmtN(headLoss)} m over ${fmtN(length!)} m.` : "";

  return {
    area, wettedPerimeter, hydraulicDiameter, hydraulicRadius, flowRate,
    reynoldsNumber, regime, frictionFactor, relativeRoughness, headLoss,
    interpretation: `Dh = ${fmtN(hydraulicDiameter * 1000)} mm, Re = ${fmtN(reynoldsNumber)} (${regimeLabel}), f = ${fmtN(frictionFactor)}.${hlStr}`,
  };
}

export function generateNonCircularDuctSteps(input: NonCircularDuctInput, result: NonCircularDuctResult): Step[] {
  const { velocity, density, viscosity, length, roughness = 0 } = input;
  const { area, wettedPerimeter, hydraulicDiameter, reynoldsNumber, frictionFactor } = result;

  const nf = (v: number, sig = 5): string => {
    const s = parseFloat(v.toPrecision(sig)).toString();
    return s.replace(/e([+-]?)(\d+)/i, (_m, sign, exp) =>
      `\\times 10^{${sign === "-" ? "-" : ""}${parseInt(exp)}}`
    );
  };

  const steps: Step[] = [
    {
      description: "Cross-sectional area and wetted perimeter from shape dimensions",
      calculation: `A = ${nf(area)} \\text{ m}^2, \\quad P = ${nf(wettedPerimeter)} \\text{ m}`,
    },
    {
      description: "Hydraulic diameter Dh = 4A / P",
      formula: "D_h = \\frac{4A}{P}",
      calculation: `D_h = \\frac{4 \\times ${nf(area)}}{${nf(wettedPerimeter)}} = ${nf(hydraulicDiameter)}`,
      result: nf(hydraulicDiameter),
      unit: "m",
    },
    {
      description: `Reynolds number using Dh → ${result.regime}`,
      formula: "Re = \\frac{\\rho V D_h}{\\mu}",
      calculation: `Re = \\frac{${nf(density)} \\times ${nf(velocity)} \\times ${nf(hydraulicDiameter)}}{${nf(viscosity)}} = ${nf(reynoldsNumber)}`,
      result: nf(reynoldsNumber),
      unit: "dimensionless",
    },
    {
      description: result.regime === "laminar"
        ? "Laminar friction factor f = 64 / Re (circular-pipe approximation)"
        : "Turbulent friction factor f — Swamee-Jain",
      formula: result.regime === "laminar"
        ? "f = \\frac{64}{Re}"
        : "f = \\frac{0.25}{\\left[\\log_{10}\\!\\left(\\frac{\\varepsilon/D_h}{3.7} + \\frac{5.74}{Re^{0.9}}\\right)\\right]^2}",
      calculation: result.regime === "laminar"
        ? `f = \\frac{64}{${nf(reynoldsNumber)}} = ${nf(frictionFactor)}`
        : `\\varepsilon/D_h = \\frac{${nf(roughness)}}{${nf(hydraulicDiameter)}} = ${nf(result.relativeRoughness)}, \\quad f = ${nf(frictionFactor)}`,
      result: nf(frictionFactor),
      unit: "dimensionless",
    },
  ];

  if (length !== undefined && result.headLoss !== undefined) {
    steps.push({
      description: "Head loss hL = f × (L/Dh) × V²/(2g)",
      formula: "h_L = f \\frac{L}{D_h} \\frac{V^2}{2g}",
      calculation: `h_L = ${nf(frictionFactor)} \\times \\frac{${nf(length)}}{${nf(hydraulicDiameter)}} \\times \\frac{${nf(velocity)}^2}{2 \\times 9.81} = ${nf(result.headLoss)}`,
      result: nf(result.headLoss),
      unit: "m",
    });
  }

  return steps;
}

// ============================================================================
// Cavitation Number
// ============================================================================

export type CavitationRisk = "safe" | "caution" | "critical" | "cavitating";

export interface CavitationNumberInput {
  pressure: number;       // Pa  absolute local pressure
  vaporPressure: number;  // Pa  vapor pressure at fluid temperature
  density: number;        // kg/m³
  velocity: number;       // m/s  reference velocity
  gravity?: number;       // m/s² (default 9.81)
}

export interface CavitationNumberResult {
  sigma: number;          // cavitation number σ = (P − Pv) / (½ρV²)
  pressureMargin: number; // Pa  P − Pv
  dynamicPressure: number;// Pa  ½ρV²
  npsh: number;           // m   (P − Pv) / (ρg)
  npshFt: number;         // ft  NPSH in feet
  riskLevel: CavitationRisk;
  interpretation: string;
}

export function calculateCavitationNumber(input: CavitationNumberInput): CavitationNumberResult {
  const { pressure, vaporPressure, density, velocity, gravity = 9.81 } = input;

  if (density <= 0 || velocity < 0)
    throw new Error("Density must be positive and velocity non-negative");
  if (vaporPressure < 0)
    throw new Error("Vapor pressure must be non-negative");

  const pressureMargin  = pressure - vaporPressure;
  const dynamicPressure = 0.5 * density * velocity * velocity;
  const sigma           = dynamicPressure > 0 ? pressureMargin / dynamicPressure : Infinity;
  const npsh            = pressureMargin / (density * gravity);
  const npshFt          = npsh * 3.28084;

  let riskLevel: CavitationRisk;
  let interpretation: string;

  if (pressureMargin <= 0) {
    riskLevel     = "cavitating";
    interpretation = "P ≤ Pv — pressure is at or below vapor pressure. Cavitation is occurring.";
  } else if (sigma < 0.5) {
    riskLevel     = "critical";
    interpretation = `σ = ${sigma.toFixed(3)} — critical risk. Cavitation inception likely for most geometries.`;
  } else if (sigma < 2.0) {
    riskLevel     = "caution";
    interpretation = `σ = ${sigma.toFixed(3)} — caution zone. Risk depends on geometry; check against device-specific σc.`;
  } else {
    riskLevel     = "safe";
    interpretation = `σ = ${sigma.toFixed(3)} — safe margin. Cavitation unlikely for most practical geometries.`;
  }

  return { sigma, pressureMargin, dynamicPressure, npsh, npshFt, riskLevel, interpretation };
}

export function generateCavitationNumberSteps(input: CavitationNumberInput, result: CavitationNumberResult): Step[] {
  const { pressure, vaporPressure, density, velocity, gravity = 9.81 } = input;

  return [
    {
      description: "Write the cavitation number definition",
      formula: "σ = (P − Pv) / ((1/2)ρV^2)",
    },
    {
      description: "Compute pressure margin above vapor pressure",
      calculation: `P − Pv = ${pressure.toFixed(2)} − ${vaporPressure.toFixed(2)} = ${result.pressureMargin.toFixed(2)} Pa`,
    },
    {
      description: "Compute dynamic pressure  q = ½ρV²",
      calculation: `q = 0.5 × ${density.toFixed(3)} × ${velocity.toFixed(3)}² = ${result.dynamicPressure.toFixed(4)} Pa`,
    },
    {
      description: "Calculate cavitation number  σ = (P − Pv) / q",
      calculation: `σ = ${result.pressureMargin.toFixed(2)} / ${result.dynamicPressure.toFixed(4)} = ${result.sigma.toFixed(5)}`,
      result: `${result.sigma.toFixed(5)}`,
      unit: "dimensionless",
    },
    {
      description: "Compute NPSH = (P − Pv) / (ρg)",
      calculation: `NPSH = ${result.pressureMargin.toFixed(2)} / (${density.toFixed(3)} × ${gravity}) = ${result.npsh.toFixed(4)} m = ${result.npshFt.toFixed(4)} ft`,
    },
  ];
}

// ============================================================================
// Pressure Recovery (Diffuser)
// ============================================================================

export interface PressureRecoveryInput {
  diameter1: number;          // m  inlet
  diameter2: number;          // m  outlet (> diameter1 for diffuser)
  velocity1: number;          // m/s inlet velocity
  density: number;            // kg/m³
  lossCoefficient?: number;   // K referenced to inlet ½ρV₁² (0 = ideal; undefined → auto Borda-Carnot)
  useBordaCarnot?: boolean;   // override K with Borda-Carnot formula
}

export interface PressureRecoveryResult {
  pressureRise: number;       // Pa  actual ΔP = P₂ − P₁
  pressureRiseIdeal: number;  // Pa  Bernoulli ideal
  Cp: number;                 // actual pressure recovery coefficient
  CpIdeal: number;            // ideal Cp
  efficiency: number;         // η = Cp / CpIdeal (0–1)
  areaRatio: number;          // AR = A₂/A₁
  velocity2: number;          // m/s outlet
  dynamicPressure1: number;   // Pa  q₁ = ½ρV₁²
  lossCoefficient: number;    // K used in calculation
  bordaCarnotK: number;       // K_BC = (1 − 1/AR)²  reference value
  interpretation: string;
}

export function calculatePressureRecovery(input: PressureRecoveryInput): PressureRecoveryResult {
  const { diameter1, diameter2, velocity1, density, useBordaCarnot = false } = input;

  if (diameter1 <= 0 || diameter2 <= 0 || velocity1 < 0 || density <= 0)
    throw new Error("All inputs must be positive");
  if (diameter2 <= diameter1)
    throw new Error("Outlet diameter must be larger than inlet diameter for a diffuser");

  const A1 = Math.PI * Math.pow(diameter1 / 2, 2);
  const A2 = Math.PI * Math.pow(diameter2 / 2, 2);
  const AR = A2 / A1;                          // area ratio A₂/A₁ > 1
  const velocity2 = velocity1 / AR;            // continuity
  const dynamicPressure1 = 0.5 * density * velocity1 * velocity1;

  const CpIdeal = 1 - 1 / (AR * AR);          // 1 − (A₁/A₂)²
  const bordaCarnotK = Math.pow(1 - 1 / AR, 2); // (1 − A₁/A₂)²

  const K = useBordaCarnot
    ? bordaCarnotK
    : (input.lossCoefficient ?? 0);

  const Cp = CpIdeal - K;
  const pressureRiseIdeal = CpIdeal * dynamicPressure1;
  const pressureRise = Cp * dynamicPressure1;

  const efficiency = CpIdeal > 0 ? Math.max(0, Cp / CpIdeal) : 0;

  const effStr = `Diffuser efficiency η = ${(efficiency * 100).toFixed(1)}%.`;
  const warnStr = Cp < 0 ? " Pressure drop (losses exceed recovery) — consider reducing K." : "";

  return {
    pressureRise, pressureRiseIdeal, Cp, CpIdeal, efficiency,
    areaRatio: AR, velocity2, dynamicPressure1,
    lossCoefficient: K, bordaCarnotK,
    interpretation: `Cp = ${fmtN(Cp)} (ideal ${fmtN(CpIdeal)}). ${effStr}${warnStr}`,
  };
}

export function generatePressureRecoverySteps(input: PressureRecoveryInput, result: PressureRecoveryResult): Step[] {
  const { diameter1, diameter2, velocity1, density } = input;
  const { areaRatio: AR, velocity2, dynamicPressure1, CpIdeal, Cp, lossCoefficient: K, bordaCarnotK } = result;

  const nf = (v: number, sig = 5): string => {
    const s = parseFloat(v.toPrecision(sig)).toString();
    return s.replace(/e([+-]?)(\d+)/i, (_m, sign, exp) =>
      `\\times 10^{${sign === "-" ? "-" : ""}${parseInt(exp)}}`
    );
  };

  const steps: Step[] = [
    {
      description: "Compute area ratio AR = A₂/A₁ = (D₂/D₁)²",
      formula: "AR = \\left(\\frac{D_2}{D_1}\\right)^2",
      calculation: `AR = \\left(\\frac{${nf(diameter2)}}{${nf(diameter1)}}\\right)^2 = ${nf(AR)}`,
      result: nf(AR),
      unit: "dimensionless",
    },
    {
      description: "Continuity — outlet velocity V₂ = V₁ / AR",
      formula: "V_2 = \\frac{V_1}{AR}",
      calculation: `V_2 = \\frac{${nf(velocity1)}}{${nf(AR)}} = ${nf(velocity2)}`,
      result: nf(velocity2),
      unit: "m/s",
    },
    {
      description: "Inlet dynamic pressure q₁ = ½ρV₁²",
      formula: "q_1 = \\tfrac{1}{2}\\rho V_1^2",
      calculation: `q_1 = \\tfrac{1}{2} \\times ${nf(density)} \\times ${nf(velocity1)}^2 = ${nf(dynamicPressure1)}`,
      result: nf(dynamicPressure1),
      unit: "Pa",
    },
    {
      description: "Ideal pressure recovery coefficient Cp_ideal = 1 − 1/AR²",
      formula: "C_{p,\\text{ideal}} = 1 - \\frac{1}{AR^2}",
      calculation: `C_{p,\\text{ideal}} = 1 - \\frac{1}{${nf(AR)}^2} = ${nf(CpIdeal)}`,
      result: nf(CpIdeal),
      unit: "dimensionless",
    },
  ];

  if (input.useBordaCarnot) {
    steps.push({
      description: "Borda-Carnot loss coefficient (sudden expansion) K = (1 − 1/AR)²",
      formula: "K_{BC} = \\left(1 - \\frac{1}{AR}\\right)^2",
      calculation: `K_{BC} = \\left(1 - \\frac{1}{${nf(AR)}}\\right)^2 = ${nf(bordaCarnotK)}`,
      result: nf(bordaCarnotK),
      unit: "dimensionless",
    });
  } else if (K > 0) {
    steps.push({
      description: `Apply user-specified loss coefficient K = ${nf(K)}`,
      formula: "K = \\text{user-specified}",
      calculation: `K = ${nf(K)}`,
      result: nf(K),
      unit: "dimensionless",
    });
  }

  steps.push(
    {
      description: "Actual pressure recovery coefficient Cp = Cp_ideal − K",
      formula: "C_p = C_{p,\\text{ideal}} - K",
      calculation: `C_p = ${nf(CpIdeal)} - ${nf(K)} = ${nf(Cp)}`,
      result: nf(Cp),
      unit: "dimensionless",
    },
    {
      description: "Actual pressure rise ΔP = Cp × q₁",
      formula: "\\Delta P = C_p \\times q_1",
      calculation: `\\Delta P = ${nf(Cp)} \\times ${nf(dynamicPressure1)} = ${nf(result.pressureRise)}`,
      result: nf(result.pressureRise),
      unit: "Pa",
    },
    {
      description: `Diffuser efficiency η = Cp / Cp,ideal = ${(result.efficiency * 100).toFixed(1)} %`,
      formula: "\\eta = \\frac{C_p}{C_{p,\\text{ideal}}}",
      calculation: `\\eta = \\frac{${nf(Cp)}}{${nf(CpIdeal)}} = ${nf(result.efficiency)}`,
      result: nf(result.efficiency),
      unit: "dimensionless",
    },
  );

  return steps;
}

// ============================================================================
// Discharge Coefficient (Cd) Calculator
// ============================================================================

export type DischargeCdMode = "findCd" | "findQ" | "findDP";

export interface DischargeCdInput {
  mode: DischargeCdMode;
  diameter2: number;         // m  orifice/throat
  diameter1?: number;        // m  pipe (optional — for velocity-of-approach factor)
  pressureDrop?: number;     // Pa (required for findCd, findQ)
  density: number;           // kg/m³
  flowRate?: number;         // m³/s (required for findCd, findDP)
  Cd?: number;               // dimensionless (required for findQ, findDP)
}

export interface DischargeCdResult {
  Cd: number;
  area2: number;             // m²
  theoreticalVelocity?: number; // m/s  √(2ΔP/ρ) — when ΔP known
  theoreticalFlow?: number;  // m³/s  A₂ × vth (E=1) — when ΔP known
  flowRate: number;          // m³/s actual
  pressureDrop: number;      // Pa
  beta?: number;             // D₂/D₁ (when D₁ provided)
  approachFactor?: number;   // E = 1/√(1-β⁴)
  interpretation: string;
}

export function calculateDischargeCd(input: DischargeCdInput): DischargeCdResult {
  const { mode, diameter2, diameter1, density } = input;

  if (diameter2 <= 0 || density <= 0) throw new Error("Diameter and density must be positive");

  const area2  = Math.PI * Math.pow(diameter2 / 2, 2);
  const beta   = diameter1 && diameter1 > diameter2 ? diameter2 / diameter1 : undefined;
  const approachFactor = beta !== undefined ? 1 / Math.sqrt(1 - Math.pow(beta, 4)) : 1;

  let Cd: number, flowRate: number, pressureDrop: number;
  let theoreticalVelocity: number | undefined;
  let theoreticalFlow: number | undefined;

  if (mode === "findCd") {
    if (input.flowRate === undefined || input.pressureDrop === undefined)
      throw new Error("Flow rate and pressure drop are required");
    flowRate     = input.flowRate;
    pressureDrop = input.pressureDrop;
    if (pressureDrop <= 0) throw new Error("Pressure drop must be positive");
    theoreticalVelocity = Math.sqrt((2 * pressureDrop) / density);
    theoreticalFlow     = area2 * theoreticalVelocity;
    Cd = flowRate / (approachFactor * area2 * theoreticalVelocity);

  } else if (mode === "findQ") {
    if (input.Cd === undefined || input.pressureDrop === undefined)
      throw new Error("Cd and pressure drop are required");
    Cd           = input.Cd;
    pressureDrop = input.pressureDrop;
    if (pressureDrop <= 0) throw new Error("Pressure drop must be positive");
    theoreticalVelocity = Math.sqrt((2 * pressureDrop) / density);
    theoreticalFlow     = area2 * theoreticalVelocity;
    flowRate = Cd * approachFactor * area2 * theoreticalVelocity;

  } else {
    // findDP
    if (input.Cd === undefined || input.flowRate === undefined)
      throw new Error("Cd and flow rate are required");
    Cd       = input.Cd;
    flowRate = input.flowRate;
    pressureDrop = (density / 2) * Math.pow(flowRate / (Cd * approachFactor * area2), 2);
  }

  const approachStr = beta !== undefined
    ? ` β = ${fmtN(beta)}, E = ${fmtN(approachFactor)}.`
    : " (no velocity-of-approach correction applied)";

  return {
    Cd, area2, theoreticalVelocity, theoreticalFlow,
    flowRate, pressureDrop, beta,
    approachFactor: beta !== undefined ? approachFactor : undefined,
    interpretation: `Cd = ${fmtN(Cd)} for Q = ${fmtN(flowRate * 1000)} L/s at ΔP = ${fmtN(pressureDrop / 1000)} kPa.${approachStr}`,
  };
}

export function generateDischargeCdSteps(input: DischargeCdInput, result: DischargeCdResult): Step[] {
  const { mode, diameter2, pressureDrop, density } = input;

  const nf = (v: number, sig = 5): string => {
    const s = parseFloat(v.toPrecision(sig)).toString();
    return s.replace(/e([+-]?)(\d+)/i, (_m, sign, exp) =>
      `\\times 10^{${sign === "-" ? "-" : ""}${parseInt(exp)}}`
    );
  };

  const E = result.approachFactor ?? 1;

  if (mode === "findCd") {
    const steps: Step[] = [
      {
        description: "Write the discharge coefficient definition",
        formula: "C_d = \\frac{Q_{actual}}{E \\times A_2 \\times \\sqrt{2\\Delta P / \\rho}}",
      },
      {
        description: "Compute orifice area",
        formula: "A_2 = \\pi (D_2/2)^2",
        calculation: `A_2 = \\pi \\times (${nf(diameter2)}/2)^2 = ${nf(result.area2)}`,
        result: nf(result.area2),
        unit: "m²",
      },
    ];
    if (result.beta !== undefined && result.approachFactor !== undefined) {
      steps.push({
        description: "Compute β and velocity-of-approach factor  E = 1/√(1−β⁴)",
        formula: "E = 1 / \\sqrt{1 - \\beta^4}",
        calculation: `\\beta = ${nf(result.beta)}, \\quad E = 1/\\sqrt{1 - ${nf(result.beta)}^4} = ${nf(result.approachFactor)}`,
        result: nf(result.approachFactor),
        unit: "dimensionless",
      });
    }
    steps.push(
      {
        description: "Compute theoretical velocity  vth = √(2ΔP/ρ)",
        formula: "v_{th} = \\sqrt{2\\Delta P / \\rho}",
        calculation: `v_{th} = \\sqrt{2 \\times ${nf(pressureDrop!)} / ${nf(density)}} = ${nf(result.theoreticalVelocity!)}`,
        result: nf(result.theoreticalVelocity!),
        unit: "m/s",
      },
      {
        description: "Compute Cd = Q / (E × A₂ × vth)",
        formula: "C_d = Q / (E \\times A_2 \\times v_{th})",
        calculation: `C_d = ${nf(result.flowRate)} / (${nf(E)} \\times ${nf(result.area2)} \\times ${nf(result.theoreticalVelocity!)}) = ${nf(result.Cd)}`,
        result: nf(result.Cd),
        unit: "dimensionless",
      },
    );
    return steps;
  }

  if (mode === "findQ") {
    return [
      {
        description: "Write the flow equation",
        formula: "Q = C_d \\times E \\times A_2 \\times \\sqrt{2\\Delta P / \\rho}",
      },
      {
        description: "Compute orifice area",
        formula: "A_2 = \\pi (D_2/2)^2",
        calculation: `A_2 = \\pi \\times (${nf(diameter2)}/2)^2 = ${nf(result.area2)}`,
        result: nf(result.area2),
        unit: "m²",
      },
      {
        description: "Compute theoretical velocity",
        formula: "v_{th} = \\sqrt{2\\Delta P / \\rho}",
        calculation: `v_{th} = \\sqrt{2 \\times ${nf(pressureDrop!)} / ${nf(density)}} = ${nf(result.theoreticalVelocity!)}`,
        result: nf(result.theoreticalVelocity!),
        unit: "m/s",
      },
      {
        description: "Apply Cd (and E) to get flow rate",
        calculation: `Q = ${nf(result.Cd)} \\times ${nf(E)} \\times ${nf(result.area2)} \\times ${nf(result.theoreticalVelocity!)} = ${nf(result.flowRate)}`,
        result: nf(result.flowRate),
        unit: "m³/s",
      },
    ];
  }

  // findDP
  const effectiveArea = result.Cd * E * result.area2;
  return [
    {
      description: "Rearrange for pressure drop",
      formula: "\\Delta P = \\frac{\\rho}{2} \\times \\left(\\frac{Q}{C_d \\times E \\times A_2}\\right)^2",
    },
    {
      description: "Compute effective area  Cd × E × A₂",
      calculation: `C_d \\times E \\times A_2 = ${nf(result.Cd)} \\times ${nf(E)} \\times ${nf(result.area2)} = ${nf(effectiveArea)}`,
      result: nf(effectiveArea),
      unit: "m²",
    },
    {
      description: "Calculate pressure drop",
      formula: "\\Delta P = (\\rho/2) \\times (Q / (C_d E A_2))^2",
      calculation: `\\Delta P = (${nf(density)}/2) \\times (${nf(result.flowRate)} / ${nf(effectiveArea)})^2 = ${nf(result.pressureDrop)}`,
      result: nf(result.pressureDrop / 1000),
      unit: "kPa",
    },
  ];
}

// ============================================================================
// Flow Coefficient (Cv / Kv) — Valve Sizing
// ============================================================================

// Reference constants
const SG_REF_DENSITY = 999.1;  // kg/m³  water at 15 °C (Cv/Kv standard reference)
const M3S_TO_GPM     = 15852.0; // 1 m³/s = 15 852 US gal/min
const PA_TO_PSI      = 1 / 6894.76;
const CV_TO_KV       = 1 / 1.1561; // Kv = Cv / 1.1561

export type FlowCoefficientMode = "findCv" | "findQ" | "findDP";

export interface FlowCoefficientInput {
  mode: FlowCoefficientMode;
  flowRate?: number;     // m³/s  (required for findCv, findDP)
  pressureDrop?: number; // Pa    (required for findCv, findQ)
  Cv?: number;           // US flow coefficient (required for findQ, findDP)
  density: number;       // kg/m³
}

export interface FlowCoefficientResult {
  Cv: number;
  Kv: number;
  flowRate: number;      // m³/s
  pressureDrop: number;  // Pa
  specificGravity: number;
  flowRateGpm: number;   // US gal/min
  flowRateM3h: number;   // m³/h
  pressureDropPsi: number;
  pressureDropBar: number;
  interpretation: string;
}

export function calculateFlowCoefficient(input: FlowCoefficientInput): FlowCoefficientResult {
  const { mode, density } = input;
  const SG = density / SG_REF_DENSITY;

  let Cv: number, flowRate: number, pressureDrop: number;

  if (mode === "findCv") {
    if (input.flowRate === undefined || input.pressureDrop === undefined)
      throw new Error("Flow rate and pressure drop are required");
    flowRate     = input.flowRate;
    pressureDrop = input.pressureDrop;
    const Q_gpm  = flowRate * M3S_TO_GPM;
    const dP_psi = pressureDrop * PA_TO_PSI;
    if (dP_psi <= 0) throw new Error("Pressure drop must be positive");
    Cv = Q_gpm / Math.sqrt(dP_psi / SG);

  } else if (mode === "findQ") {
    if (input.pressureDrop === undefined || input.Cv === undefined)
      throw new Error("Pressure drop and Cv are required");
    pressureDrop = input.pressureDrop;
    Cv           = input.Cv;
    const dP_psi = pressureDrop * PA_TO_PSI;
    if (dP_psi <= 0) throw new Error("Pressure drop must be positive");
    const Q_gpm  = Cv * Math.sqrt(dP_psi / SG);
    flowRate     = Q_gpm / M3S_TO_GPM;

  } else {
    // findDP
    if (input.flowRate === undefined || input.Cv === undefined)
      throw new Error("Flow rate and Cv are required");
    flowRate     = input.flowRate;
    Cv           = input.Cv;
    const Q_gpm  = flowRate * M3S_TO_GPM;
    const dP_psi = SG * Math.pow(Q_gpm / Cv, 2);
    pressureDrop = dP_psi / PA_TO_PSI;
  }

  const Kv              = Cv * CV_TO_KV;
  const flowRateGpm     = flowRate * M3S_TO_GPM;
  const flowRateM3h     = flowRate * 3600;
  const pressureDropPsi = pressureDrop * PA_TO_PSI;
  const pressureDropBar = pressureDrop / 1e5;

  return {
    Cv, Kv, flowRate, pressureDrop, specificGravity: SG,
    flowRateGpm, flowRateM3h, pressureDropPsi, pressureDropBar,
    interpretation: `Cv = ${fmtN(Cv)} (Kv = ${fmtN(Kv)}) for ${fmtN(flowRateM3h)} m³/h at ${fmtN(pressureDropBar)} bar ΔP (SG = ${fmtN(SG)}).`,
  };
}

export function generateFlowCoefficientSteps(input: FlowCoefficientInput, result: FlowCoefficientResult): Step[] {
  const { mode } = input;
  const { Cv, Kv, flowRateGpm, pressureDropPsi, specificGravity: SG } = result;
  const f = (v: number, sig = 5) => fmtN(v, sig);

  if (mode === "findCv") {
    return [
      {
        description: "Write the liquid Cv formula (ISA/IEC standard)",
        formula: "C_v = Q_{gpm} / \\sqrt{\\Delta P_{psi} / SG}",
      },
      {
        description: "Compute specific gravity relative to water at 15°C",
        formula: "SG = \\rho / 999.1",
        calculation: `SG = ${f(input.density!)} / 999.1 = ${f(SG)}`,
        result: f(SG),
        unit: "dimensionless",
      },
      {
        description: "Convert Q to gal/min and ΔP to psi",
        calculation: `Q_{gpm} = ${f(flowRateGpm)}, \\quad \\Delta P_{psi} = ${f(pressureDropPsi)}`,
      },
      {
        description: "Calculate Cv",
        calculation: `C_v = ${f(flowRateGpm)} / \\sqrt{${f(pressureDropPsi)} / ${f(SG)}} = ${f(Cv)}`,
        result: f(Cv),
        unit: "dimensionless",
      },
      {
        description: "Convert to metric Kv  (Kv = Cv / 1.1561)",
        formula: "K_v = C_v / 1.1561",
        calculation: `K_v = ${f(Cv)} / 1.1561 = ${f(Kv)}`,
        result: f(Kv),
        unit: "m³/h per √bar",
      },
    ];
  }

  if (mode === "findQ") {
    return [
      {
        description: "Rearrange Cv formula to solve for flow rate",
        formula: "Q_{gpm} = C_v \\times \\sqrt{\\Delta P_{psi} / SG}",
      },
      {
        description: "Substitute values (Q in gal/min)",
        calculation: `Q_{gpm} = ${f(Cv)} \\times \\sqrt{${f(pressureDropPsi)} / ${f(SG)}} = ${f(flowRateGpm)}`,
        result: f(flowRateGpm),
        unit: "gal/min",
      },
      {
        description: "Convert to SI units",
        calculation: `Q = ${f(result.flowRateM3h)}\\text{ m}^3\\text{/h} = ${f(result.flowRate * 1000)}\\text{ L/s}`,
        result: f(result.flowRateM3h),
        unit: "m³/h",
      },
    ];
  }

  // findDP
  return [
    {
      description: "Rearrange Cv formula to solve for pressure drop",
      formula: "\\Delta P_{psi} = SG \\times (Q_{gpm} / C_v)^2",
    },
    {
      description: "Substitute values (ΔP in psi)",
      calculation: `\\Delta P_{psi} = ${f(SG)} \\times (${f(flowRateGpm)} / ${f(Cv)})^2 = ${f(pressureDropPsi)}`,
      result: f(pressureDropPsi),
      unit: "psi",
    },
    {
      description: "Convert to SI units",
      calculation: `\\Delta P = ${f(result.pressureDropBar)}\\text{ bar} = ${f(result.pressureDrop / 1000)}\\text{ kPa}`,
      result: f(result.pressureDropBar),
      unit: "bar",
    },
  ];
}

// ============================================================================
// Continuity Equation
// ============================================================================

export interface ContinuityInput {
  flowRate?: number;    // m³/s
  velocity?: number;    // m/s
  area?: number;       // m²
  diameter?: number;   // m (alternative to area)
}

export interface ContinuityResult {
  flowRate: number;
  velocity: number;
  area: number;
  interpretation: string;
}

export function calculateContinuity(input: ContinuityInput): ContinuityResult {
  const { flowRate, velocity, area, diameter } = input;

  // Resolve cross-section
  let A: number | undefined;
  if (diameter !== undefined) {
    if (diameter <= 0) throw new Error("Diameter must be positive");
    A = Math.PI * (diameter / 2) ** 2;
  } else if (area !== undefined) {
    if (area <= 0) throw new Error("Area must be positive");
    A = area;
  }

  if (flowRate !== undefined && flowRate < 0) throw new Error("Flow rate cannot be negative");
  if (velocity !== undefined && velocity < 0) throw new Error("Velocity cannot be negative");

  const Q = flowRate;
  const V = velocity;

  // Q + A → V
  if (Q !== undefined && A !== undefined && V === undefined) {
    const v = Q / A;
    return { flowRate: Q, velocity: v, area: A,
      interpretation: `V = Q / A = ${fmtN(Q)} / ${fmtN(A)} = ${fmtN(v)} m/s` };
  }

  // V + A → Q
  if (V !== undefined && A !== undefined && Q === undefined) {
    const q = V * A;
    return { flowRate: q, velocity: V, area: A,
      interpretation: `Q = A × V = ${fmtN(A)} × ${fmtN(V)} = ${fmtN(q)} m³/s` };
  }

  // Q + V → A
  if (Q !== undefined && V !== undefined && A === undefined) {
    if (V === 0) throw new Error("Cannot compute area: velocity is zero (A = Q/V → division by zero)");
    const a = Q / V;
    if (a <= 0) throw new Error("Computed area is non-positive — check that flow rate is positive");
    return { flowRate: Q, velocity: V, area: a,
      interpretation: `A = Q / V = ${fmtN(Q)} / ${fmtN(V)} = ${fmtN(a)} m²` };
  }

  throw new Error("Provide exactly two of: flow rate, velocity, and cross-sectional area (or diameter)");
}

export function generateContinuitySteps(input: ContinuityInput, result: ContinuityResult): Step[] {
  const { flowRate, velocity, area, diameter } = input;
  const A = area ?? (diameter !== undefined ? Math.PI * (diameter / 2) ** 2 : result.area);

  const steps: Step[] = [
    { description: "Write the continuity equation", formula: "Q = A × V" },
  ];

  if (diameter !== undefined && area === undefined) {
    steps.push({
      description: "Compute cross-sectional area from diameter",
      calculation: `A = π (D/2)² = π × (${fmtN(diameter)}/2)² = ${fmtN(A)} m²`,
      result: `${fmtN(A)} m²`,
    });
  }

  if (flowRate !== undefined && velocity !== undefined) {
    steps.push({
      description: "Solve for area",
      calculation: `A = Q / V = ${fmtN(flowRate)} / ${fmtN(velocity)} = ${fmtN(A)} m²`,
      result: `A = ${fmtN(A)} m²`,
    });
  } else if (flowRate !== undefined) {
    steps.push({
      description: "Solve for velocity",
      calculation: `V = Q / A = ${fmtN(flowRate)} / ${fmtN(A)} = ${fmtN(result.velocity)} m/s`,
      result: `V = ${fmtN(result.velocity)} m/s`,
    });
  } else if (velocity !== undefined) {
    steps.push({
      description: "Solve for flow rate",
      calculation: `Q = A × V = ${fmtN(A)} × ${fmtN(velocity)} = ${fmtN(result.flowRate)} m³/s`,
      result: `Q = ${fmtN(result.flowRate)} m³/s`,
    });
  }

  return steps;
}

// ============================================================================
// Bernoulli Equation
// ============================================================================

export interface BernoulliInput {
  pressure1?: number;   // Pa
  velocity1?: number;   // m/s
  elevation1?: number; // m
  pressure2?: number;   // Pa
  velocity2?: number;   // m/s
  elevation2?: number; // m
  density: number;      // kg/m³
}

export interface BernoulliResult {
  pressure1: number;
  velocity1: number;
  elevation1: number;
  pressure2: number;
  velocity2: number;
  elevation2: number;
  interpretation: string;
}

export function calculateBernoulli(input: BernoulliInput): BernoulliResult {
  const { pressure1, velocity1, elevation1, pressure2, velocity2, elevation2, density } = input;
  const g = 9.81;

  if (density <= 0) throw new Error("Density must be positive");

  const defined = [pressure1, velocity1, elevation1, pressure2, velocity2, elevation2]
    .filter(v => v !== undefined).length;
  if (defined < 5) throw new Error("Provide 5 of the 6 parameters — leave exactly one empty to solve for it");
  if (defined === 6) throw new Error("All parameters are filled in — clear one field to solve for it");

  // Shorthand aliases (safe: exactly one is undefined)
  const P1 = pressure1  ?? 0;
  const V1 = velocity1  ?? 0;
  const z1 = elevation1 ?? 0;
  const P2 = pressure2  ?? 0;
  const V2 = velocity2  ?? 0;
  const z2 = elevation2 ?? 0;

  // Total mechanical energy per unit volume at each point (Pa)
  const H = (P: number, V: number, z: number) => P + 0.5 * density * V ** 2 + density * g * z;

  const mk = (p1: number, v1: number, e1: number, p2: number, v2: number, e2: number, interp: string): BernoulliResult =>
    ({ pressure1: p1, velocity1: v1, elevation1: e1, pressure2: p2, velocity2: v2, elevation2: e2, interpretation: interp });

  if (pressure1 === undefined) {
    const val = H(P2, V2, z2) - 0.5 * density * V1 ** 2 - density * g * z1;
    return mk(val, V1, z1, P2, V2, z2, `P₁ = ${fmtN(val)} Pa`);
  }
  if (velocity1 === undefined) {
    const v1sq = 2 * (H(P2, V2, z2) - P1 - density * g * z1) / density;
    if (v1sq < 0) throw new Error("V₁² is negative — energy balance fails, check inputs");
    const val = Math.sqrt(v1sq);
    return mk(P1, val, z1, P2, V2, z2, `V₁ = ${fmtN(val)} m/s`);
  }
  if (elevation1 === undefined) {
    const val = (H(P2, V2, z2) - P1 - 0.5 * density * V1 ** 2) / (density * g);
    return mk(P1, V1, val, P2, V2, z2, `z₁ = ${fmtN(val)} m`);
  }
  if (pressure2 === undefined) {
    const val = H(P1, V1, z1) - 0.5 * density * V2 ** 2 - density * g * z2;
    return mk(P1, V1, z1, val, V2, z2, `P₂ = ${fmtN(val)} Pa`);
  }
  if (velocity2 === undefined) {
    const v2sq = 2 * (H(P1, V1, z1) - P2 - density * g * z2) / density;
    if (v2sq < 0) throw new Error("V₂² is negative — energy balance fails, check inputs");
    const val = Math.sqrt(v2sq);
    return mk(P1, V1, z1, P2, val, z2, `V₂ = ${fmtN(val)} m/s`);
  }
  // elevation2 is undefined
  const val = (H(P1, V1, z1) - P2 - 0.5 * density * V2 ** 2) / (density * g);
  return mk(P1, V1, z1, P2, V2, val, `z₂ = ${fmtN(val)} m`);
}

export function generateBernoulliSteps(input: BernoulliInput, result: BernoulliResult): Step[] {
  const { pressure1, velocity1, elevation1, pressure2, velocity2, elevation2, density } = input;
  const g = 9.81;
  const { pressure1: P1, velocity1: V1, elevation1: z1, pressure2: P2, velocity2: V2, elevation2: z2 } = result;

  const steps: Step[] = [
    {
      description: "Write Bernoulli's equation (pressure form)",
      formula: "P₁ + ρV₁²/2 + ρgz₁ = P₂ + ρV₂²/2 + ρgz₂",
    },
  ];

  if (pressure1 === undefined) {
    steps.push({ description: "Rearrange to isolate P₁", formula: "P₁ = P₂ + ρV₂²/2 + ρgz₂ - ρV₁²/2 - ρgz₁" });
    steps.push({ description: "Substitute known values",
      calculation: `P₁ = ${fmtN(P2)} + (${fmtN(density)}/2)(${fmtN(V2)})² + (${fmtN(density)})(${g})(${fmtN(z2)}) - (${fmtN(density)}/2)(${fmtN(V1)})² - (${fmtN(density)})(${g})(${fmtN(z1)})` });
    steps.push({ description: "Result", result: `P₁ = ${fmtN(P1)} Pa` });
  } else if (velocity1 === undefined) {
    steps.push({ description: "Rearrange to isolate V₁", formula: "V₁² = V₂² + (2/ρ)(P₂ - P₁) + 2g(z₂ - z₁)" });
    steps.push({ description: "Substitute known values",
      calculation: `V₁² = (${fmtN(V2)})² + (2/${fmtN(density)})(${fmtN(P2)} - ${fmtN(P1)}) + 2(${g})(${fmtN(z2)} - ${fmtN(z1)})` });
    steps.push({ description: "Take the square root", result: `V₁ = ${fmtN(V1)} m/s` });
  } else if (elevation1 === undefined) {
    steps.push({ description: "Rearrange to isolate z₁", formula: "z₁ = (P₂ + ρV₂²/2 + ρgz₂ - P₁ - ρV₁²/2) / (ρg)" });
    steps.push({ description: "Substitute known values",
      calculation: `z₁ = (${fmtN(P2)} + (${fmtN(density)}/2)(${fmtN(V2)})² + (${fmtN(density)})(${g})(${fmtN(z2)}) - ${fmtN(P1)} - (${fmtN(density)}/2)(${fmtN(V1)})²) / ((${fmtN(density)})(${g}))` });
    steps.push({ description: "Result", result: `z₁ = ${fmtN(z1)} m` });
  } else if (pressure2 === undefined) {
    steps.push({ description: "Rearrange to isolate P₂", formula: "P₂ = P₁ + ρV₁²/2 + ρgz₁ - ρV₂²/2 - ρgz₂" });
    steps.push({ description: "Substitute known values",
      calculation: `P₂ = ${fmtN(P1)} + (${fmtN(density)}/2)(${fmtN(V1)})² + (${fmtN(density)})(${g})(${fmtN(z1)}) - (${fmtN(density)}/2)(${fmtN(V2)})² - (${fmtN(density)})(${g})(${fmtN(z2)})` });
    steps.push({ description: "Result", result: `P₂ = ${fmtN(P2)} Pa` });
  } else if (velocity2 === undefined) {
    steps.push({ description: "Rearrange to isolate V₂", formula: "V₂² = V₁² + (2/ρ)(P₁ - P₂) + 2g(z₁ - z₂)" });
    steps.push({ description: "Substitute known values",
      calculation: `V₂² = (${fmtN(V1)})² + (2/${fmtN(density)})(${fmtN(P1)} - ${fmtN(P2)}) + 2(${g})(${fmtN(z1)} - ${fmtN(z2)})` });
    steps.push({ description: "Take the square root", result: `V₂ = ${fmtN(V2)} m/s` });
  } else {
    steps.push({ description: "Rearrange to isolate z₂", formula: "z₂ = (P₁ + ρV₁²/2 + ρgz₁ - P₂ - ρV₂²/2) / (ρg)" });
    steps.push({ description: "Substitute known values",
      calculation: `z₂ = (${fmtN(P1)} + (${fmtN(density)}/2)(${fmtN(V1)})² + (${fmtN(density)})(${g})(${fmtN(z1)}) - ${fmtN(P2)} - (${fmtN(density)}/2)(${fmtN(V2)})²) / ((${fmtN(density)})(${g}))` });
    steps.push({ description: "Result", result: `z₂ = ${fmtN(z2)} m` });
  }

  return steps;
}

// ============================================================================
// Hydrostatic Pressure
// ============================================================================

export interface HydrostaticInput {
  depth: number;      // m
  density: number;    // kg/m³
  atmosphericPressure?: number; // Pa (default 101325)
}

export interface HydrostaticResult {
  gaugePressure: number;  // Pa
  absolutePressure: number; // Pa
  interpretation: string;
}

export function calculateHydrostatic(input: HydrostaticInput): HydrostaticResult {
  const { depth, density, atmosphericPressure = 101325 } = input;
  const g = 9.81; // m/s²

  if (depth < 0 || density <= 0) {
    throw new Error("Depth and density must be positive");
  }

  const gaugePressure = density * g * depth;
  const absolutePressure = gaugePressure + atmosphericPressure;

  return {
    gaugePressure,
    absolutePressure,
    interpretation: `At depth ${depth.toFixed(2)} m, gauge pressure is ${gaugePressure.toFixed(2)} Pa (${(gaugePressure / 1000).toFixed(2)} kPa).`,
  };
}

export function generateHydrostaticSteps(input: HydrostaticInput, result: HydrostaticResult): Step[] {
  const { depth, density, atmosphericPressure = 101325 } = input;
  const g = 9.81;

  return [
    {
      description: "Write the hydrostatic pressure formula",
      formula: "P_{gauge} = ρgh",
    },
    {
      description: "Substitute the given values",
      calculation: `P_{gauge} = ${fmtN(density)} × ${g} × ${fmtN(depth)}`,
    },
    {
      description: "Gauge pressure",
      result: `P_{gauge} = ${fmtN(result.gaugePressure)} Pa`,
    },
    {
      description: "Add atmospheric pressure to get absolute pressure",
      calculation: `P_{abs} = P_{gauge} + P_{atm} = ${fmtN(result.gaugePressure)} + ${fmtN(atmosphericPressure)}`,
      result: `P_{abs} = ${fmtN(result.absolutePressure)} Pa`,
    },
  ];
}

// ============================================================================
// Pipe Flow Rate
// ============================================================================

export interface PipeFlowRateInput {
  velocity: number;   // m/s
  diameter?: number;  // m
  area?: number;      // m²
}

export interface PipeFlowRateResult {
  flowRate: number;   // m³/s
  area: number;      // m²
  interpretation: string;
}

export function calculatePipeFlowRate(input: PipeFlowRateInput): PipeFlowRateResult {
  const { velocity, diameter, area } = input;

  if (velocity < 0) throw new Error("Velocity must be non-negative");

  let A = area;
  if (diameter !== undefined && area === undefined) {
    if (diameter <= 0) throw new Error("Diameter must be positive");
    A = Math.PI * (diameter / 2) ** 2;
  }

  if (A === undefined || A <= 0) throw new Error("Provide a positive diameter or cross-sectional area");

  const flowRate = velocity * A;

  return {
    flowRate,
    area: A,
    interpretation: `Q = ${fmtN(flowRate)} m³/s (${fmtN(flowRate * 1000)} L/s)`,
  };
}

export function generatePipeFlowRateSteps(input: PipeFlowRateInput, result: PipeFlowRateResult): Step[] {
  const { velocity, diameter, area } = input;
  const A = result.area;

  const steps: Step[] = [
    { description: "Write the flow rate equation", formula: "Q = A × V" },
  ];

  if (diameter !== undefined && area === undefined) {
    steps.push({
      description: "Calculate cross-sectional area from diameter",
      calculation: `A = π(D/2)² = π × (${fmtN(diameter)}/2)² = ${fmtN(A)} m²`,
      result: `A = ${fmtN(A)} m²`,
    });
  }

  steps.push({
    description: "Calculate volumetric flow rate",
    calculation: `Q = A × V = ${fmtN(A)} × ${fmtN(velocity)}`,
    result: `Q = ${fmtN(result.flowRate)} m³/s`,
  });

  return steps;
}

// ============================================================================
// Pipe Head Loss (Darcy-Weisbach)
// ============================================================================

export interface PipeHeadLossInput {
  length: number;      // m
  diameter: number;    // m
  velocity: number;    // m/s
  frictionFactor: number; // dimensionless
  gravity?: number;    // m/s² (default 9.81)
}

export interface PipeHeadLossResult {
  headLoss: number;       // m
  velocityHead: number;   // m  (V²/2g)
  ldRatio: number;        // dimensionless
  interpretation: string;
}

export function calculatePipeHeadLoss(input: PipeHeadLossInput): PipeHeadLossResult {
  const { length, diameter, velocity, frictionFactor, gravity = 9.81 } = input;

  if (length <= 0 || diameter <= 0 || velocity < 0 || frictionFactor <= 0) {
    throw new Error("All inputs must be positive");
  }

  const velocityHead = Math.pow(velocity, 2) / (2 * gravity);
  const ldRatio = length / diameter;
  const headLoss = frictionFactor * ldRatio * velocityHead;

  return {
    headLoss,
    velocityHead,
    ldRatio,
    interpretation: `Head loss is ${fmtN(headLoss)} m, which is ${fmtN(frictionFactor * ldRatio)} times the velocity head.`,
  };
}

export function generatePipeHeadLossSteps(input: PipeHeadLossInput, result: PipeHeadLossResult): Step[] {
  const { length, diameter, velocity, frictionFactor, gravity = 9.81 } = input;

  return [
    {
      description: "Write the Darcy-Weisbach equation",
      formula: "hf = f × (L/D) × (V²/(2g))",
    },
    {
      description: "Calculate the velocity head",
      calculation: `V²/(2g) = ${fmtN(velocity)}² / (2 × ${gravity}) = ${fmtN(result.velocityHead)} m`,
    },
    {
      description: "Calculate the length-to-diameter ratio",
      calculation: `L/D = ${fmtN(length)} / ${fmtN(diameter)} = ${fmtN(result.ldRatio)}`,
    },
    {
      description: "Substitute all values",
      calculation: `hf = ${fmtN(frictionFactor)} × ${fmtN(result.ldRatio)} × ${fmtN(result.velocityHead)}`,
    },
    {
      description: "Final result",
      result: `hf = ${fmtN(result.headLoss)} m`,
    },
  ];
}

// ============================================================================
// Pump Power
// ============================================================================

export interface PumpPowerInput {
  flowRate: number;    // m³/s
  head: number;        // m
  density: number;     // kg/m³
  efficiency?: number; // dimensionless (0-1, default 1)
  gravity?: number;    // m/s² (default 9.81)
}

export interface PumpPowerResult {
  hydraulicPower: number;  // W  (ideal, η = 1)
  power: number;           // W  (shaft, accounting for η)
  powerKW: number;         // kW
  powerHP: number;         // hp
  interpretation: string;
}

export function calculatePumpPower(input: PumpPowerInput): PumpPowerResult {
  const { flowRate, head, density, efficiency = 1, gravity = 9.81 } = input;

  if (flowRate <= 0 || head <= 0 || density <= 0 || efficiency <= 0 || efficiency > 1) {
    throw new Error("All inputs must be positive; efficiency must be between 0 and 1");
  }

  const hydraulicPower = density * gravity * flowRate * head;
  const power          = hydraulicPower / efficiency;
  const powerKW        = power / 1000;
  const powerHP        = power / 745.7;

  return {
    hydraulicPower,
    power,
    powerKW,
    powerHP,
    interpretation: `Hydraulic power: ${fmtN(hydraulicPower / 1000)} kW. Shaft power (η = ${Math.round(efficiency * 100)}%): ${fmtN(powerKW)} kW = ${fmtN(powerHP)} hp.`,
  };
}

export function generatePumpPowerSteps(input: PumpPowerInput, result: PumpPowerResult): Step[] {
  const { flowRate, head, density, efficiency = 1, gravity = 9.81 } = input;

  return [
    {
      description: "Write the hydraulic (water) power formula",
      formula: "Ph = ρ × g × Q × H",
    },
    {
      description: "Calculate hydraulic power",
      calculation: `Ph = ${fmtN(density)} × ${gravity} × ${fmtN(flowRate)} × ${fmtN(head)} = ${fmtN(result.hydraulicPower)} W`,
    },
    {
      description: "Apply pump efficiency to get shaft power",
      formula: "P = Ph / η",
    },
    {
      description: "Divide hydraulic power by efficiency",
      calculation: `P = ${fmtN(result.hydraulicPower)} / ${fmtN(efficiency)} = ${fmtN(result.power)} W`,
    },
    {
      description: "Convert to practical units",
      calculation: `P = ${fmtN(result.powerKW)} kW = ${fmtN(result.powerHP)} hp`,
      result: `${fmtN(result.powerKW)}`,
      unit: "kW",
    },
  ];
}

// ============================================================================
// Drag on Sphere
// ============================================================================

export interface DragSphereInput {
  density: number;          // kg/m³
  velocity: number;         // m/s
  diameter: number;         // m
  dragCoefficient: number;  // dimensionless
  viscosity?: number;       // Pa·s (optional — only for Re check)
}

export interface DragSphereResult {
  dragForce: number;        // N
  projectedArea: number;    // m²
  dynamicPressure: number;  // Pa  (½ρV²)
  reynoldsNumber?: number;  // only when viscosity is provided
  interpretation: string;
}

export function calculateDragSphere(input: DragSphereInput): DragSphereResult {
  const { density, velocity, diameter, dragCoefficient, viscosity } = input;

  if (density <= 0 || velocity < 0 || diameter <= 0 || dragCoefficient <= 0) {
    throw new Error("All inputs must be positive");
  }

  const projectedArea     = Math.PI * Math.pow(diameter / 2, 2);
  const dynamicPressure   = 0.5 * density * Math.pow(velocity, 2);
  const dragForce         = dragCoefficient * dynamicPressure * projectedArea;
  const reynoldsNumber    = viscosity && viscosity > 0
    ? (density * velocity * diameter) / viscosity
    : undefined;

  const reStr = reynoldsNumber !== undefined
    ? ` Re = ${Math.round(reynoldsNumber)}.`
    : "";

  return {
    dragForce,
    projectedArea,
    dynamicPressure,
    reynoldsNumber,
    interpretation: `Drag force FD = ${fmtN(dragForce)} N on a ${fmtN(diameter * 1000)} mm sphere at ${fmtN(velocity)} m/s.${reStr}`,
  };
}

export function generateDragSphereSteps(input: DragSphereInput, result: DragSphereResult): Step[] {
  const { density, velocity, diameter, dragCoefficient, viscosity } = input;

  const nf = (v: number, sig = 5): string => {
    const s = parseFloat(v.toPrecision(sig)).toString();
    return s.replace(/e([+-]?)(\d+)/i, (_m, sign, exp) =>
      `\\times 10^{${sign === "-" ? "-" : ""}${parseInt(exp)}}`
    );
  };

  const steps = [
    {
      description: "Write the drag force equation",
      formula: "F_D = C_D \\times \\tfrac{1}{2}\\rho V^2 \\times A",
    },
    {
      description: "Compute projected (frontal) area of the sphere",
      formula: "A = \\pi (D/2)^2",
      calculation: `A = \\pi \\times (${nf(diameter)}/2)^2 = ${nf(result.projectedArea)}`,
      result: nf(result.projectedArea),
      unit: "m²",
    },
    {
      description: "Compute dynamic pressure  q = ½ρV²",
      formula: "q = \\tfrac{1}{2}\\rho V^2",
      calculation: `q = 0.5 \\times ${nf(density)} \\times ${nf(velocity)}^2 = ${nf(result.dynamicPressure)}`,
      result: nf(result.dynamicPressure),
      unit: "Pa",
    },
    {
      description: "Calculate drag force  FD = CD × q × A",
      formula: "F_D = C_D \\times q \\times A",
      calculation: `F_D = ${nf(dragCoefficient)} \\times ${nf(result.dynamicPressure)} \\times ${nf(result.projectedArea)} = ${nf(result.dragForce)}`,
      result: nf(result.dragForce),
      unit: "N",
    },
  ];

  if (viscosity && viscosity > 0 && result.reynoldsNumber !== undefined) {
    steps.push({
      description: "Compute Reynolds number to verify CD regime",
      formula: "Re = \\rho V D / \\mu",
      calculation: `Re = ${nf(density)} \\times ${nf(velocity)} \\times ${nf(diameter)} / ${nf(viscosity)} = ${nf(result.reynoldsNumber)}`,
      result: nf(result.reynoldsNumber),
      unit: "dimensionless",
    } as typeof steps[0]);
  }

  return steps;
}

// Add more calculator functions for the remaining calculators...
// (Mach Number, Froude Number, Weber Number, Stokes Law, Orifice Flow, Venturi Flow, Manometer, Buoyancy, Surface Tension, Capillary Rise, Poiseuille Flow)

// ============================================================================
// Additional Calculators (Mach Number, Froude, etc.)
// ============================================================================

export interface MachNumberInput {
  velocity: number;      // m/s
  temperature: number;   // K
  gamma?: number;        // specific heat ratio (default 1.4 for air)
  gasConstant?: number;  // J/(kg·K) (default 287 for air)
}

export type MachRegime = "incompressible" | "subsonic" | "transonic" | "supersonic" | "hypersonic";

export interface MachNumberResult {
  machNumber: number;
  speedOfSound: number;       // m/s
  regime: MachRegime;
  stagnationTempRatio: number;// T₀/T = 1 + (γ-1)/2 × M²
  stagnationTemp: number;     // K
  interpretation: string;
}

export function calculateMachNumber(input: MachNumberInput): MachNumberResult {
  const { velocity, temperature, gamma = 1.4, gasConstant = 287 } = input;

  if (velocity < 0 || temperature <= 0) {
    throw new Error("Velocity must be non-negative and temperature must be positive");
  }

  const speedOfSound        = Math.sqrt(gamma * gasConstant * temperature);
  const machNumber          = velocity / speedOfSound;
  const stagnationTempRatio = 1 + ((gamma - 1) / 2) * machNumber * machNumber;
  const stagnationTemp      = temperature * stagnationTempRatio;

  let regime: MachRegime;
  let interpretation: string;
  if (machNumber < 0.3) {
    regime = "incompressible";
    interpretation = "Incompressible regime (M < 0.3) — density changes < 5%, incompressible assumption valid.";
  } else if (machNumber < 0.8) {
    regime = "subsonic";
    interpretation = "Subsonic compressible flow (0.3 ≤ M < 0.8) — compressibility effects significant, use compressible flow equations.";
  } else if (machNumber <= 1.2) {
    regime = "transonic";
    interpretation = "Transonic flow (0.8 ≤ M ≤ 1.2) — mixed subsonic/supersonic regions, shock waves may form.";
  } else if (machNumber < 5) {
    regime = "supersonic";
    interpretation = "Supersonic flow (1.2 < M < 5) — oblique and normal shock waves, Mach cone forms.";
  } else {
    regime = "hypersonic";
    interpretation = "Hypersonic flow (M ≥ 5) — aerodynamic heating, chemical dissociation effects.";
  }

  return { machNumber, speedOfSound, regime, stagnationTempRatio, stagnationTemp, interpretation };
}

export function generateMachNumberSteps(input: MachNumberInput, result: MachNumberResult): Step[] {
  const { velocity, temperature, gamma = 1.4, gasConstant = 287 } = input;
  const gammaR = gamma * gasConstant;

  return [
    {
      description: "Write the speed-of-sound equation for an ideal gas",
      formula: "c = √(γ × R × T)",
    },
    {
      description: "Compute γ × R",
      calculation: `γ × R = ${gamma} × ${gasConstant} = ${gammaR.toFixed(2)} J/(kg·K)`,
    },
    {
      description: "Compute speed of sound",
      calculation: `c = √(${gammaR.toFixed(2)} × ${temperature.toFixed(2)}) = √(${(gammaR * temperature).toFixed(2)}) = ${result.speedOfSound.toFixed(3)} m/s`,
      result: `${result.speedOfSound.toFixed(3)}`,
      unit: "m/s",
    },
    {
      description: "Compute Mach number  M = V / c",
      calculation: `M = ${velocity.toFixed(3)} / ${result.speedOfSound.toFixed(3)} = ${result.machNumber.toFixed(4)}`,
      result: `${result.machNumber.toFixed(4)}`,
      unit: "dimensionless",
    },
    {
      description: "Compute stagnation temperature ratio  T₀/T = 1 + (γ−1)/2 × M²",
      calculation: `T₀/T = 1 + (${gamma} − 1)/2 × ${result.machNumber.toFixed(4)}² = ${result.stagnationTempRatio.toFixed(5)}  →  T₀ = ${result.stagnationTemp.toFixed(2)} K`,
    },
  ];
}

export interface FroudeNumberInput {
  velocity: number;   // m/s
  length: number;     // m (characteristic length, usually depth)
  gravity?: number;   // m/s² (default 9.81)
}

// ============================================================================
// Nusselt Number
// ============================================================================

export type NusseltMode = "findNu" | "findH" | "findK";

export interface NusseltNumberInput {
  mode: NusseltMode;
  nusseltNumber?: number;          // dimensionless
  heatTransferCoeff?: number;      // W/(m²·K)
  thermalConductivity?: number;    // W/(m·K)  fluid conductivity
  characteristicLength: number;    // m
}

export interface NusseltNumberResult {
  nusseltNumber: number;
  heatTransferCoeff: number;       // W/(m²·K)
  thermalConductivity: number;     // W/(m·K)
  conductionCoeff: number;         // W/(m²·K)  k/L — pure conduction reference
  interpretation: string;
}

export function calculateNusseltNumber(input: NusseltNumberInput): NusseltNumberResult {
  const { mode, characteristicLength: L } = input;
  if (L <= 0) throw new Error("Characteristic length must be positive");

  let Nu: number, h: number, k: number;

  if (mode === "findNu") {
    if (!input.heatTransferCoeff || !input.thermalConductivity)
      throw new Error("h and k are required");
    h  = input.heatTransferCoeff;
    k  = input.thermalConductivity;
    if (h <= 0 || k <= 0) throw new Error("h and k must be positive");
    Nu = h * L / k;

  } else if (mode === "findH") {
    if (!input.nusseltNumber || !input.thermalConductivity)
      throw new Error("Nu and k are required");
    Nu = input.nusseltNumber;
    k  = input.thermalConductivity;
    if (Nu <= 0 || k <= 0) throw new Error("Nu and k must be positive");
    h  = Nu * k / L;

  } else {
    if (!input.nusseltNumber || !input.heatTransferCoeff)
      throw new Error("Nu and h are required");
    Nu = input.nusseltNumber;
    h  = input.heatTransferCoeff;
    if (Nu <= 0 || h <= 0) throw new Error("Nu and h must be positive");
    k  = h * L / Nu;
  }

  const conductionCoeff = k / L;
  const enhancement = Nu.toFixed(2);
  return {
    nusseltNumber: Nu, heatTransferCoeff: h, thermalConductivity: k, conductionCoeff,
    interpretation: `Nu = ${enhancement}: convective h is ${enhancement}× the equivalent conduction value k/L = ${conductionCoeff.toFixed(2)} W/(m²·K).`,
  };
}

export function generateNusseltNumberSteps(input: NusseltNumberInput, result: NusseltNumberResult): Step[] {
  const { mode, characteristicLength: L } = input;
  const { nusseltNumber: Nu, heatTransferCoeff: h, thermalConductivity: k, conductionCoeff } = result;

  if (mode === "findNu") {
    return [
      { description: "Write the Nusselt number definition", formula: "Nu = h × L / k" },
      { description: "Substitute h, L, and k",
        calculation: `Nu = ${h.toFixed(4)} × ${L.toExponential(4)} / ${k.toFixed(5)} = ${Nu.toFixed(5)}`,
        result: `${Nu.toFixed(5)}`, unit: "dimensionless" },
      { description: "Conduction reference  k/L",
        calculation: `k/L = ${k.toFixed(5)} / ${L.toExponential(4)} = ${conductionCoeff.toFixed(4)} W/(m²·K)  →  h/k_L = Nu = ${Nu.toFixed(3)}` },
    ];
  }

  if (mode === "findH") {
    return [
      { description: "Rearrange for heat transfer coefficient", formula: "h = Nu × k / L" },
      { description: "Substitute Nu, k, and L",
        calculation: `h = ${Nu.toFixed(4)} × ${k.toFixed(5)} / ${L.toExponential(4)} = ${h.toFixed(4)} W/(m²·K)`,
        result: `${h.toFixed(4)}`, unit: "W/(m²·K)" },
    ];
  }

  return [
    { description: "Rearrange for thermal conductivity", formula: "k = h × L / Nu" },
    { description: "Substitute h, L, and Nu",
      calculation: `k = ${h.toFixed(4)} × ${L.toExponential(4)} / ${Nu.toFixed(4)} = ${k.toFixed(5)} W/(m·K)`,
      result: `${k.toFixed(5)}`, unit: "W/(m·K)" },
  ];
}

// ============================================================================
// Strouhal Number
// ============================================================================

export type StrouhalMode = "findSt" | "findF" | "findV";

export interface StrouhalNumberInput {
  mode: StrouhalMode;
  frequency?: number;        // Hz  shedding frequency
  length: number;            // m   characteristic length (diameter for cylinders)
  velocity?: number;         // m/s free-stream velocity
  strouhalNumber?: number;   // dimensionless
  naturalFrequency?: number; // Hz  (optional — structural resonance check)
}

export interface StrouhalNumberResult {
  strouhalNumber: number;
  frequency: number;         // Hz
  velocity: number;          // m/s
  sheddingPeriod: number;    // s   T = 1/f
  criticalVelocity?: number; // m/s Vcrit = fn×L/St
  resonanceRatio?: number;   // f / fn
  isResonanceRisk: boolean;
  interpretation: string;
}

export function calculateStrouhalNumber(input: StrouhalNumberInput): StrouhalNumberResult {
  const { mode, length, naturalFrequency } = input;
  if (length <= 0) throw new Error("Characteristic length must be positive");

  let St: number, f: number, V: number;

  if (mode === "findSt") {
    if (input.frequency === undefined || input.velocity === undefined)
      throw new Error("Frequency and velocity are required");
    f  = input.frequency;
    V  = input.velocity;
    if (f <= 0 || V <= 0) throw new Error("Frequency and velocity must be positive");
    St = (f * length) / V;

  } else if (mode === "findF") {
    if (input.strouhalNumber === undefined || input.velocity === undefined)
      throw new Error("St and velocity are required");
    St = input.strouhalNumber;
    V  = input.velocity;
    if (St <= 0 || V <= 0) throw new Error("St and velocity must be positive");
    f  = (St * V) / length;

  } else {
    // findV
    if (input.strouhalNumber === undefined || input.frequency === undefined)
      throw new Error("St and frequency are required");
    St = input.strouhalNumber;
    f  = input.frequency;
    if (St <= 0 || f <= 0) throw new Error("St and frequency must be positive");
    V  = (f * length) / St;
  }

  const sheddingPeriod = 1 / f;
  const criticalVelocity = naturalFrequency ? (naturalFrequency * length) / St : undefined;
  const resonanceRatio   = naturalFrequency ? f / naturalFrequency : undefined;
  const isResonanceRisk  = resonanceRatio !== undefined && resonanceRatio > 0.8 && resonanceRatio < 1.2;

  let interpretation = `St = ${fmtN(St)}, shedding at ${fmtN(f)} Hz (T = ${fmtN(sheddingPeriod)} s) at V = ${fmtN(V)} m/s.`;
  if (isResonanceRisk) {
    interpretation += ` WARNING: shedding frequency (${fmtN(f)} Hz) is near structural natural frequency (${fmtN(naturalFrequency!)} Hz) — vortex-induced vibration (VIV) risk!`;
  } else if (resonanceRatio !== undefined) {
    interpretation += ` f/fn = ${fmtN(resonanceRatio)} — no resonance risk.`;
  }

  return { strouhalNumber: St, frequency: f, velocity: V, sheddingPeriod, criticalVelocity, resonanceRatio, isResonanceRisk, interpretation };
}

export function generateStrouhalNumberSteps(input: StrouhalNumberInput, result: StrouhalNumberResult): Step[] {
  const { mode, length, naturalFrequency } = input;
  const { strouhalNumber: St, frequency: f, velocity: V } = result;

  const nf = (v: number, sig = 5): string => {
    const s = parseFloat(v.toPrecision(sig)).toString();
    return s.replace(/e([+-]?)(\d+)/i, (_m, sign, exp) =>
      `\\times 10^{${sign === "-" ? "-" : ""}${parseInt(exp)}}`
    );
  };

  const steps: Step[] = [];

  if (mode === "findSt") {
    steps.push(
      {
        description: "Strouhal number definition",
        formula: "St = \\frac{f \\cdot L}{V}",
      },
      {
        description: "Substitute shedding frequency, length, and velocity",
        formula: "St = \\frac{f \\cdot L}{V}",
        calculation: `St = \\frac{${nf(f)} \\times ${nf(length)}}{${nf(V)}} = ${nf(St)}`,
        result: nf(St),
        unit: "dimensionless",
      },
    );
  } else if (mode === "findF") {
    steps.push(
      {
        description: "Rearrange for shedding frequency",
        formula: "f = \\frac{St \\cdot V}{L}",
      },
      {
        description: "Substitute St, velocity, and length",
        formula: "f = \\frac{St \\cdot V}{L}",
        calculation: `f = \\frac{${nf(St)} \\times ${nf(V)}}{${nf(length)}} = ${nf(f)}`,
        result: nf(f),
        unit: "Hz",
      },
    );
  } else {
    steps.push(
      {
        description: "Rearrange for free-stream velocity",
        formula: "V = \\frac{f \\cdot L}{St}",
      },
      {
        description: "Substitute shedding frequency, length, and St",
        formula: "V = \\frac{f \\cdot L}{St}",
        calculation: `V = \\frac{${nf(f)} \\times ${nf(length)}}{${nf(St)}} = ${nf(V)}`,
        result: nf(V),
        unit: "m/s",
      },
    );
  }

  steps.push({
    description: "Shedding period T = 1/f",
    formula: "T = \\frac{1}{f}",
    calculation: `T = \\frac{1}{${nf(f)}} = ${nf(result.sheddingPeriod)}`,
    result: nf(result.sheddingPeriod),
    unit: "s",
  });

  if (naturalFrequency && result.criticalVelocity !== undefined) {
    steps.push({
      description: `Critical velocity for resonance${result.isResonanceRisk ? " — RESONANCE RISK" : ""}`,
      formula: "V_{crit} = \\frac{f_n \\cdot L}{St}",
      calculation: `V_{crit} = \\frac{${nf(naturalFrequency)} \\times ${nf(length)}}{${nf(St)}} = ${nf(result.criticalVelocity)}`,
      result: nf(result.criticalVelocity),
      unit: "m/s",
    });
  }

  return steps;
}

// ============================================================================
// Euler Number
// ============================================================================

export type EulerMode = "findEu" | "findDP" | "findV";

export interface EulerNumberInput {
  mode: EulerMode;
  pressureDrop?: number;   // Pa
  density: number;         // kg/m³
  velocity?: number;       // m/s
  eulerNumber?: number;    // dimensionless
}

export interface EulerNumberResult {
  eulerNumber: number;
  pressureDrop: number;    // Pa
  velocity: number;        // m/s
  dynamicPressure: number; // Pa  q = ½ρV²
  interpretation: string;
}

export function calculateEulerNumber(input: EulerNumberInput): EulerNumberResult {
  const { mode, density } = input;
  if (density <= 0) throw new Error("Density must be positive");

  let Eu: number, dP: number, V: number;

  if (mode === "findEu") {
    if (input.pressureDrop === undefined || input.velocity === undefined)
      throw new Error("Pressure drop and velocity are required");
    dP = input.pressureDrop;
    V  = input.velocity;
    if (V <= 0) throw new Error("Velocity must be positive");
    const q = 0.5 * density * V * V;
    Eu = dP / q;

  } else if (mode === "findDP") {
    if (input.eulerNumber === undefined || input.velocity === undefined)
      throw new Error("Eu and velocity are required");
    Eu = input.eulerNumber;
    V  = input.velocity;
    if (V <= 0) throw new Error("Velocity must be positive");
    const q = 0.5 * density * V * V;
    dP = Eu * q;

  } else {
    // findV
    if (input.eulerNumber === undefined || input.pressureDrop === undefined)
      throw new Error("Eu and pressure drop are required");
    Eu = input.eulerNumber;
    dP = input.pressureDrop;
    if (Eu <= 0) throw new Error("Eu must be positive");
    V  = Math.sqrt(2 * dP / (Eu * density));
  }

  const dynamicPressure = 0.5 * density * V * V;

  const mag = Eu > 10 ? "high" : Eu > 1 ? "moderate" : Eu > 0.1 ? "low" : "very low";
  return {
    eulerNumber: Eu, pressureDrop: dP, velocity: V, dynamicPressure,
    interpretation: `Eu = ${fmtN(Eu)} (${mag}). ΔP = ${fmtN(dP / 1000)} kPa, q = ${fmtN(dynamicPressure)} Pa. Eu = Cp = K for this flow configuration.`,
  };
}

export function generateEulerNumberSteps(input: EulerNumberInput, result: EulerNumberResult): Step[] {
  const { mode, density } = input;
  const { eulerNumber: Eu, pressureDrop: dP, velocity: V, dynamicPressure: q } = result;

  const nf = (v: number, sig = 5): string => {
    const s = parseFloat(v.toPrecision(sig)).toString();
    return s.replace(/e([+-]?)(\d+)/i, (_m, sign, exp) =>
      `\\times 10^{${sign === "-" ? "-" : ""}${parseInt(exp)}}`
    );
  };

  if (mode === "findEu") {
    return [
      {
        description: "Euler number definition",
        formula: "Eu = \\frac{\\Delta P}{\\tfrac{1}{2}\\rho V^2}",
      },
      {
        description: "Compute dynamic pressure q = ½ρV²",
        formula: "q = \\tfrac{1}{2}\\rho V^2",
        calculation: `q = \\tfrac{1}{2} \\times ${nf(density)} \\times ${nf(V)}^2 = ${nf(q)}`,
        result: nf(q),
        unit: "Pa",
      },
      {
        description: "Calculate Eu = ΔP / q",
        formula: "Eu = \\frac{\\Delta P}{q}",
        calculation: `Eu = \\frac{${nf(dP)}}{${nf(q)}} = ${nf(Eu)}`,
        result: nf(Eu),
        unit: "dimensionless",
      },
    ];
  }

  if (mode === "findDP") {
    return [
      {
        description: "Rearrange Euler number for pressure drop",
        formula: "\\Delta P = Eu \\times \\tfrac{1}{2}\\rho V^2",
      },
      {
        description: "Compute dynamic pressure q = ½ρV²",
        formula: "q = \\tfrac{1}{2}\\rho V^2",
        calculation: `q = \\tfrac{1}{2} \\times ${nf(density)} \\times ${nf(V)}^2 = ${nf(q)}`,
        result: nf(q),
        unit: "Pa",
      },
      {
        description: "Calculate ΔP = Eu × q",
        formula: "\\Delta P = Eu \\times q",
        calculation: `\\Delta P = ${nf(Eu)} \\times ${nf(q)} = ${nf(dP)}`,
        result: nf(dP),
        unit: "Pa",
      },
    ];
  }

  // findV
  const inner = 2 * dP / (Eu * density);
  return [
    {
      description: "Rearrange Euler number for velocity",
      formula: "V = \\sqrt{\\frac{2\\,\\Delta P}{Eu \\times \\rho}}",
    },
    {
      description: "Substitute known values",
      formula: "V = \\sqrt{\\frac{2\\,\\Delta P}{Eu \\times \\rho}}",
      calculation: `V = \\sqrt{\\frac{2 \\times ${nf(dP)}}{${nf(Eu)} \\times ${nf(density)}}} = \\sqrt{${nf(inner)}}`,
    },
    {
      description: "Calculate velocity V",
      calculation: `V = \\sqrt{${nf(inner)}} = ${nf(V)}`,
      result: nf(V),
      unit: "m/s",
    },
  ];
}

export type FroudeRegime = "subcritical" | "critical" | "supercritical";

export interface FroudeNumberResult {
  froudeNumber: number;
  waveCelerity: number;   // m/s  c = √(gL)
  regime: FroudeRegime;
  interpretation: string;
}

export function calculateFroudeNumber(input: FroudeNumberInput): FroudeNumberResult {
  const { velocity, length, gravity = 9.81 } = input;

  if (velocity < 0 || length <= 0) {
    throw new Error("Velocity must be non-negative and length must be positive");
  }

  const waveCelerity = Math.sqrt(gravity * length);
  const froudeNumber = velocity / waveCelerity;

  const regime: FroudeRegime =
    Math.abs(froudeNumber - 1) < 0.01 ? "critical" :
    froudeNumber < 1 ? "subcritical" : "supercritical";

  const interpretations: Record<FroudeRegime, string> = {
    subcritical:   "Subcritical flow (Fr < 1) — flow is tranquil. Gravity waves travel both upstream and downstream. Downstream conditions control the flow.",
    critical:      "Critical flow (Fr ≈ 1) — flow is at the boundary between subcritical and supercritical. Maximum discharge for a given specific energy.",
    supercritical: "Supercritical flow (Fr > 1) — flow is rapid. Gravity waves can only propagate downstream. Upstream conditions control the flow.",
  };

  return {
    froudeNumber,
    waveCelerity,
    regime,
    interpretation: interpretations[regime],
  };
}

export function generateFroudeNumberSteps(input: FroudeNumberInput, result: FroudeNumberResult): Step[] {
  const { velocity, length, gravity = 9.81 } = input;

  return [
    {
      description: "Write the Froude number equation",
      formula: "Fr = V / √(gL) = V / c",
    },
    {
      description: "Compute wave celerity (shallow-water gravity wave speed)  c = √(gL)",
      calculation: `c = √(${gravity} × ${length.toFixed(4)}) = √(${(gravity * length).toFixed(4)}) = ${result.waveCelerity.toFixed(4)} m/s`,
    },
    {
      description: "Calculate Froude number  Fr = V / c",
      calculation: `Fr = ${velocity.toFixed(4)} / ${result.waveCelerity.toFixed(4)} = ${result.froudeNumber.toFixed(5)}`,
      result: `${result.froudeNumber.toFixed(5)}`,
      unit: "dimensionless",
    },
    {
      description: `Classify flow regime — Fr ${result.froudeNumber < 1 ? "<" : result.froudeNumber > 1 ? ">" : "≈"} 1`,
      calculation: `Fr = ${result.froudeNumber.toFixed(4)} → ${result.regime} flow`,
    },
  ];
}

// ============================================================================
// Weber Number
// ============================================================================

export interface WeberNumberInput {
  density: number;      // kg/m³
  velocity: number;     // m/s
  length: number;       // m (characteristic length)
  surfaceTension: number; // N/m
}

export type WeberRegime = "surfaceTensionDominated" | "competing" | "deformation" | "breakup";

export interface WeberNumberResult {
  weberNumber: number;
  dynamicPressure: number;   // Pa  ρV²
  capillaryPressure: number; // Pa  σ/L
  regime: WeberRegime;
  interpretation: string;
}

export function calculateWeberNumber(input: WeberNumberInput): WeberNumberResult {
  const { density, velocity, length, surfaceTension } = input;

  if (density <= 0 || velocity < 0 || length <= 0 || surfaceTension <= 0) {
    throw new Error("All inputs must be positive");
  }

  const dynamicPressure  = density * velocity * velocity;   // ρV²
  const capillaryPressure= surfaceTension / length;          // σ/L
  const weberNumber      = dynamicPressure * length / surfaceTension; // = ρV²L/σ

  let regime: WeberRegime;
  let interpretation: string;

  if (weberNumber < 1) {
    regime = "surfaceTensionDominated";
    interpretation = `We = ${fmtN(weberNumber)} < 1 — surface tension dominates. Droplets/bubbles remain spherical; interface is stable.`;
  } else if (weberNumber < 12) {
    regime = "competing";
    interpretation = `We = ${fmtN(weberNumber)} (1–12) — competing forces. Droplet deformation begins; interface oscillates but may remain intact.`;
  } else if (weberNumber < 100) {
    regime = "deformation";
    interpretation = `We = ${fmtN(weberNumber)} (12–100) — inertia dominates. Droplet breakup likely (bag or stripping breakup). Critical We ≈ 12 for liquid drops in air.`;
  } else {
    regime = "breakup";
    interpretation = `We = ${fmtN(weberNumber)} > 100 — catastrophic breakup. Strong atomisation; surface tension plays a minor stabilising role.`;
  }

  return { weberNumber, dynamicPressure, capillaryPressure, regime, interpretation };
}

export function generateWeberNumberSteps(input: WeberNumberInput, result: WeberNumberResult): Step[] {
  const { density, velocity, length, surfaceTension } = input;

  const nf = (v: number, sig = 5): string => {
    const s = parseFloat(v.toPrecision(sig)).toString();
    return s.replace(/e([+-]?)(\d+)/i, (_m, sign, exp) =>
      `\\times 10^{${sign === "-" ? "-" : ""}${parseInt(exp)}}`
    );
  };

  return [
    {
      description: "Write the Weber number equation",
      formula: "We = \\frac{\\rho V^2 L}{\\sigma}",
    },
    {
      description: "Compute dynamic pressure  ρV²",
      formula: "q = \\rho V^2",
      calculation: `q = ${nf(density)} \\times ${nf(velocity)}^2 = ${nf(result.dynamicPressure)}`,
      result: nf(result.dynamicPressure),
      unit: "Pa",
    },
    {
      description: "Compute capillary pressure  σ/L",
      formula: "p_\\sigma = \\sigma / L",
      calculation: `p_\\sigma = ${nf(surfaceTension)} / ${nf(length)} = ${nf(result.capillaryPressure)}`,
      result: nf(result.capillaryPressure),
      unit: "Pa",
    },
    {
      description: "Calculate Weber number  We = ρV²L / σ",
      formula: "We = q \\times L / \\sigma",
      calculation: `We = ${nf(result.dynamicPressure)} \\times ${nf(length)} / ${nf(surfaceTension)} = ${nf(result.weberNumber)}`,
      result: nf(result.weberNumber),
      unit: "dimensionless",
    },
  ];
}

// ============================================================================
// Stokes Law (Drag on Sphere in Low Re Flow)
// ============================================================================

export interface StokesLawInput {
  viscosity: number;        // Pa·s
  velocity: number;         // m/s
  diameter: number;         // m
  fluidDensity?: number;    // kg/m³ — for Re check
  particleDensity?: number; // kg/m³ — for terminal velocity
  gravity?: number;         // m/s² (default 9.81)
}

export interface StokesLawResult {
  dragForce: number;          // N
  reynoldsNumber?: number;    // present if fluidDensity provided
  isValidRegime?: boolean;    // Re < 1?
  terminalVelocity?: number;  // m/s — present if both densities provided
  stokesCD?: number;          // C_D = 24/Re
  interpretation: string;
}

export function calculateStokesLaw(input: StokesLawInput): StokesLawResult {
  const { viscosity, velocity, diameter, fluidDensity, particleDensity, gravity = 9.81 } = input;

  if (viscosity <= 0 || velocity < 0 || diameter <= 0) {
    throw new Error("All inputs must be positive");
  }

  const dragForce = 3 * Math.PI * viscosity * velocity * diameter;

  const reynoldsNumber = fluidDensity && fluidDensity > 0
    ? (fluidDensity * velocity * diameter) / viscosity
    : undefined;

  const isValidRegime = reynoldsNumber !== undefined ? reynoldsNumber < 1 : undefined;

  const terminalVelocity = (fluidDensity && fluidDensity > 0 && particleDensity && particleDensity > 0)
    ? ((particleDensity - fluidDensity) * gravity * diameter * diameter) / (18 * viscosity)
    : undefined;

  const stokesCD = reynoldsNumber && reynoldsNumber > 0 ? 24 / reynoldsNumber : undefined;

  const regimeNote = reynoldsNumber !== undefined
    ? (isValidRegime
        ? "Stokes regime valid — Re < 1, creeping flow assumption holds."
        : "Re ≥ 1 — Stokes law may not apply. Consider the drag-sphere calculator for higher Re.")
    : "Enter fluid density to verify the Re < 1 creeping flow condition.";

  const vtNote = terminalVelocity !== undefined
    ? ` Terminal settling velocity: Vt = ${fmtN(terminalVelocity * 1000)} mm/s.`
    : "";

  return {
    dragForce,
    reynoldsNumber,
    isValidRegime,
    terminalVelocity,
    stokesCD,
    interpretation: `${regimeNote}${vtNote}`,
  };
}

export function generateStokesLawSteps(input: StokesLawInput, result: StokesLawResult): Step[] {
  const { viscosity, velocity, diameter, fluidDensity, particleDensity, gravity = 9.81 } = input;

  const nf = (v: number, sig = 5): string => {
    const s = parseFloat(v.toPrecision(sig)).toString();
    return s.replace(/e([+-]?)(\d+)/i, (_m, sign, exp) =>
      `\\times 10^{${sign === "-" ? "-" : ""}${parseInt(exp)}}`
    );
  };

  const steps: ReturnType<typeof generateStokesLawSteps> = [
    {
      description: "Write Stokes' drag law (creeping flow, Re < 1)",
      formula: "F_D = 3\\pi\\mu V D",
    },
    {
      description: "Substitute values",
      calculation: `F_D = 3 \\times \\pi \\times ${nf(viscosity)} \\times ${nf(velocity)} \\times ${nf(diameter)}`,
    },
    {
      description: "Calculate drag force",
      calculation: `F_D = ${nf(result.dragForce)}`,
      result: nf(result.dragForce),
      unit: "N",
    },
  ];

  if (fluidDensity && fluidDensity > 0 && result.reynoldsNumber !== undefined) {
    steps.push({
      description: "Verify Stokes regime: Re = ρ × V × D / μ",
      formula: "Re = \\rho_f V D / \\mu",
      calculation: `Re = ${nf(fluidDensity)} \\times ${nf(velocity)} \\times ${nf(diameter)} / ${nf(viscosity)} = ${nf(result.reynoldsNumber)} \\quad ${result.isValidRegime ? "(Re < 1 \\checkmark)" : "(Re \\geq 1 — outside Stokes regime)"}`,
      result: nf(result.reynoldsNumber),
      unit: "dimensionless",
    });
  }

  if (fluidDensity && particleDensity && result.terminalVelocity !== undefined) {
    steps.push({
      description: "Terminal settling velocity",
      formula: "V_t = \\frac{(\\rho_p - \\rho_f)\\, g\\, D^2}{18\\mu}",
    });
    steps.push({
      description: "Substitute densities, gravity, diameter, viscosity",
      calculation: `V_t = \\frac{(${nf(particleDensity)} - ${nf(fluidDensity)}) \\times ${nf(gravity)} \\times ${nf(diameter)}^2}{18 \\times ${nf(viscosity)}} = ${nf(result.terminalVelocity)}`,
      result: nf(result.terminalVelocity),
      unit: "m/s",
    });
  }

  return steps;
}

// ============================================================================
// Orifice Flow
// ============================================================================

export interface OrificeFlowInput {
  diameter: number;      // m
  pressureDifference: number; // Pa
  density: number;       // kg/m³
  dischargeCoefficient?: number; // dimensionless (default 0.6)
}

export interface OrificeFlowResult {
  flowRate: number;             // m³/s
  orificeArea: number;          // m²
  theoreticalVelocity: number;  // m/s  √(2ΔP/ρ)
  velocity: number;             // m/s  Cd × vth
  interpretation: string;
}

export function calculateOrificeFlow(input: OrificeFlowInput): OrificeFlowResult {
  const { diameter, pressureDifference, density, dischargeCoefficient = 0.6 } = input;

  if (diameter <= 0 || pressureDifference <= 0 || density <= 0 || dischargeCoefficient <= 0) {
    throw new Error("All inputs must be positive");
  }

  const orificeArea           = Math.PI * Math.pow(diameter / 2, 2);
  const theoreticalVelocity   = Math.sqrt((2 * pressureDifference) / density);
  const velocity              = dischargeCoefficient * theoreticalVelocity;
  const flowRate              = dischargeCoefficient * orificeArea * theoreticalVelocity;

  return {
    flowRate,
    orificeArea,
    theoreticalVelocity,
    velocity,
    interpretation: `Q = ${fmtN(flowRate * 1000)} L/s through a ${fmtN(diameter * 1000)} mm orifice at ${fmtN(theoreticalVelocity)} m/s (theoretical) and ${fmtN(velocity)} m/s (actual).`,
  };
}

export function generateOrificeFlowSteps(input: OrificeFlowInput, result: OrificeFlowResult): Step[] {
  const { diameter, pressureDifference, density, dischargeCoefficient = 0.6 } = input;

  const nf = (v: number, sig = 5): string => {
    const s = parseFloat(v.toPrecision(sig)).toString();
    return s.replace(/e([+-]?)(\d+)/i, (_m, sign, exp) =>
      `\\times 10^{${sign === "-" ? "-" : ""}${parseInt(exp)}}`
    );
  };

  return [
    {
      description: "Write the orifice flow equation",
      formula: "Q = C_d \\times A \\times \\sqrt{2\\Delta P / \\rho}",
    },
    {
      description: "Calculate orifice area",
      formula: "A = \\pi \\times (D/2)^{2}",
      calculation: `A = \\pi \\times (${nf(diameter)}/2)^{2} = ${nf(result.orificeArea)}`,
      result: nf(result.orificeArea),
      unit: "m²",
    },
    {
      description: "Calculate theoretical (Torricelli) velocity",
      formula: "v_{th} = \\sqrt{2\\Delta P / \\rho}",
      calculation: `v_{th} = \\sqrt{2 \\times ${nf(pressureDifference)} / ${nf(density)}} = ${nf(result.theoreticalVelocity)}`,
      result: nf(result.theoreticalVelocity),
      unit: "m/s",
    },
    {
      description: "Apply discharge coefficient to get actual velocity",
      formula: "v = C_d \\times v_{th}",
      calculation: `v = ${nf(dischargeCoefficient)} \\times ${nf(result.theoreticalVelocity)} = ${nf(result.velocity)}`,
      result: nf(result.velocity),
      unit: "m/s",
    },
    {
      description: "Calculate volume flow rate",
      formula: "Q = C_d \\times A \\times v_{th}",
      calculation: `Q = ${nf(dischargeCoefficient)} \\times ${nf(result.orificeArea)} \\times ${nf(result.theoreticalVelocity)} = ${nf(result.flowRate)}`,
      result: nf(result.flowRate),
      unit: "m³/s",
    },
  ];
}

// ============================================================================
// Venturi Flow
// ============================================================================

export interface VenturiFlowInput {
  diameter1: number;     // m (upstream)
  diameter2: number;     // m (throat)
  pressureDifference: number; // Pa
  density: number;       // kg/m³
  dischargeCoefficient?: number; // dimensionless (default 0.98)
}

export interface VenturiFlowResult {
  flowRate: number;          // m³/s
  area1: number;             // m²  upstream
  area2: number;             // m²  throat
  beta: number;              // D₂/D₁
  throatVelocity: number;    // m/s
  upstreamVelocity: number;  // m/s
  interpretation: string;
}

export function calculateVenturiFlow(input: VenturiFlowInput): VenturiFlowResult {
  const { diameter1, diameter2, pressureDifference, density, dischargeCoefficient = 0.98 } = input;

  if (diameter1 <= 0 || diameter2 <= 0 || pressureDifference <= 0 || density <= 0) {
    throw new Error("All inputs must be positive");
  }
  if (diameter2 >= diameter1) {
    throw new Error("Throat diameter must be smaller than upstream diameter");
  }

  const area1           = Math.PI * Math.pow(diameter1 / 2, 2);
  const area2           = Math.PI * Math.pow(diameter2 / 2, 2);
  const beta            = diameter2 / diameter1;
  const denom           = density * (1 - Math.pow(beta, 4));
  const flowRate        = dischargeCoefficient * area2 * Math.sqrt((2 * pressureDifference) / denom);
  const throatVelocity   = flowRate / area2;
  const upstreamVelocity = flowRate / area1;

  return {
    flowRate,
    area1,
    area2,
    beta,
    throatVelocity,
    upstreamVelocity,
    interpretation: `Q = ${fmtN(flowRate * 1000)} L/s · throat velocity ${fmtN(throatVelocity)} m/s · upstream velocity ${fmtN(upstreamVelocity)} m/s (β = ${fmtN(beta)}).`,
  };
}

export function generateVenturiFlowSteps(input: VenturiFlowInput, result: VenturiFlowResult): Step[] {
  const { diameter1, diameter2, pressureDifference, density, dischargeCoefficient = 0.98 } = input;
  const beta4  = Math.pow(result.beta, 4);
  const denom  = density * (1 - beta4);
  const videal = Math.sqrt((2 * pressureDifference) / denom);

  const nf = (v: number, sig = 5): string => {
    const s = parseFloat(v.toPrecision(sig)).toString();
    return s.replace(/e([+-]?)(\d+)/i, (_m, sign, exp) =>
      `\\times 10^{${sign === "-" ? "-" : ""}${parseInt(exp)}}`
    );
  };

  return [
    {
      description: "Write the Venturi flow equation",
      formula: "Q = C_d \\times A_2 \\times \\sqrt{\\dfrac{2\\Delta P}{\\rho(1-\\beta^4)}}",
    },
    {
      description: "Compute the diameter ratio β = D₂/D₁",
      formula: "\\beta = D_2 / D_1",
      calculation: `\\beta = ${nf(diameter2)} / ${nf(diameter1)} = ${nf(result.beta)}`,
      result: nf(result.beta),
      unit: "dimensionless",
    },
    {
      description: "Compute cross-sectional areas",
      formula: "A = \\pi (D/2)^2",
      calculation: `A_1 = \\pi(${nf(diameter1)}/2)^2 = ${nf(result.area1)}, \\quad A_2 = \\pi(${nf(diameter2)}/2)^2 = ${nf(result.area2)}`,
    },
    {
      description: "Compute approach factor  ρ(1 − β⁴)",
      calculation: `1 - \\beta^4 = 1 - ${nf(beta4)} = ${nf(1 - beta4)}, \\quad \\rho(1-\\beta^4) = ${nf(denom)}`,
    },
    {
      description: "Compute ideal throat velocity",
      formula: "v_{ideal} = \\sqrt{2\\Delta P / (\\rho(1-\\beta^4))}",
      calculation: `v_{ideal} = \\sqrt{2 \\times ${nf(pressureDifference)} / ${nf(denom)}} = ${nf(videal)}`,
      result: nf(videal),
      unit: "m/s",
    },
    {
      description: "Apply Cd and throat area to get flow rate",
      formula: "Q = C_d \\times A_2 \\times v_{ideal}",
      calculation: `Q = ${nf(dischargeCoefficient)} \\times ${nf(result.area2)} \\times ${nf(videal)} = ${nf(result.flowRate)}`,
      result: nf(result.flowRate),
      unit: "m³/s",
    },
    {
      description: "Derive throat and upstream velocities",
      formula: "v_2 = Q/A_2, \\quad v_1 = Q/A_1",
      calculation: `v_2 = ${nf(result.flowRate)} / ${nf(result.area2)} = ${nf(result.throatVelocity)} \\text{ m/s}, \\quad v_1 = ${nf(result.upstreamVelocity)} \\text{ m/s}`,
    },
  ];
}

// ============================================================================
// Manometer
// ============================================================================

export interface ManometerInput {
  height: number;       // m (height difference)
  manometerFluidDensity: number; // kg/m³
  gravity?: number;     // m/s² (default 9.81)
}

export interface ManometerResult {
  pressureDifference: number; // Pa
  interpretation: string;
}

export function calculateManometer(input: ManometerInput): ManometerResult {
  const { height, manometerFluidDensity, gravity = 9.81 } = input;

  if (height <= 0) throw new Error("Height difference must be positive");
  if (manometerFluidDensity <= 0) throw new Error("Fluid density must be positive");

  const pressureDifference = manometerFluidDensity * gravity * height;

  return {
    pressureDifference,
    interpretation: `ΔP = ${fmtN(pressureDifference)} Pa (${fmtN(pressureDifference / 1000)} kPa)`,
  };
}

export function generateManometerSteps(input: ManometerInput, result: ManometerResult): Step[] {
  const { height, manometerFluidDensity, gravity = 9.81 } = input;

  return [
    {
      description: "Write the manometer equation",
      formula: "ΔP = ρgh",
    },
    {
      description: "Substitute values",
      calculation: `ΔP = ${fmtN(manometerFluidDensity)} × ${gravity} × ${fmtN(height)}`,
    },
    {
      description: "Pressure difference",
      result: `ΔP = ${fmtN(result.pressureDifference)} Pa`,
    },
  ];
}

// ============================================================================
// Buoyancy
// ============================================================================

export interface BuoyancyInput {
  volume: number;       // m³ (submerged volume)
  fluidDensity: number; // kg/m³
  gravity?: number;     // m/s² (default 9.81)
}

export interface BuoyancyResult {
  buoyantForce: number; // N
  interpretation: string;
}

export function calculateBuoyancy(input: BuoyancyInput): BuoyancyResult {
  const { volume, fluidDensity, gravity = 9.81 } = input;

  if (volume <= 0) throw new Error("Volume must be positive");
  if (fluidDensity <= 0) throw new Error("Fluid density must be positive");

  const buoyantForce = fluidDensity * volume * gravity;

  return {
    buoyantForce,
    interpretation: `F_{b} = ${fmtN(buoyantForce)} N`,
  };
}

export function generateBuoyancySteps(input: BuoyancyInput, result: BuoyancyResult): Step[] {
  const { volume, fluidDensity, gravity = 9.81 } = input;

  return [
    {
      description: "Write Archimedes' principle",
      formula: "F_{b} = ρVg",
    },
    {
      description: "Substitute values",
      calculation: `F_{b} = ${fmtN(fluidDensity)} × ${fmtN(volume)} × ${gravity}`,
    },
    {
      description: "Buoyant force",
      result: `F_{b} = ${fmtN(result.buoyantForce)} N`,
    },
  ];
}

// ============================================================================
// Surface Tension Force
// ============================================================================

export type SurfaceTensionMode = "contactLine" | "wire" | "pressure";
export type SurfacePressureShape = "bubble" | "droplet" | "cylinder";

export interface SurfaceTensionInput {
  mode: SurfaceTensionMode;
  surfaceTension: number;         // N/m
  length?: number;                // m  perimeter (contactLine / wire modes)
  radius?: number;                // m  (pressure mode)
  contactAngle?: number;          // degrees (default 0)
  pressureShape?: SurfacePressureShape; // default "droplet"
}

export interface SurfaceTensionResult {
  force?: number;                 // N  (contactLine / wire modes)
  pressureDiff?: number;          // Pa (pressure mode)
  verticalForce?: number;         // N  σLcosθ component
  cosTheta?: number;              // cos(contactAngle)
  interpretation: string;
}

export function calculateSurfaceTension(input: SurfaceTensionInput): SurfaceTensionResult {
  const { mode, surfaceTension } = input;
  const nf = (v: number, sig = 5) => parseFloat(v.toPrecision(sig)).toString();
  if (surfaceTension <= 0) throw new Error("Surface tension must be positive");

  if (mode === "contactLine" || mode === "wire") {
    const length = input.length;
    if (!length || length <= 0) throw new Error("Length must be positive");
    const thetaDeg = input.contactAngle ?? 0;
    const cosTheta = Math.cos(thetaDeg * Math.PI / 180);
    const factor   = mode === "wire" ? 2 : 1;
    const force    = factor * surfaceTension * length * cosTheta;
    const verticalForce = force;
    const modeLabel = mode === "wire" ? "wire / film (2 surfaces)" : "contact line (1 surface)";
    return {
      force, verticalForce, cosTheta,
      interpretation: `${modeLabel}: F = ${nf(force)} N at θ = ${thetaDeg.toFixed(1)}°.`,
    };
  }

  // pressure mode
  const radius = input.radius;
  if (!radius || radius <= 0) throw new Error("Radius must be positive");
  const shape  = input.pressureShape ?? "droplet";
  const factor = shape === "bubble" ? 4 : shape === "droplet" ? 2 : 1; // Young-Laplace
  const pressureDiff = factor * surfaceTension / radius;
  const shapeLabel = shape === "bubble" ? "spherical bubble (4σ/R)" :
                     shape === "droplet" ? "spherical droplet (2σ/R)" : "cylinder (σ/R)";
  return {
    pressureDiff,
    interpretation: `${shapeLabel}: ΔP = ${nf(pressureDiff)} Pa (excess pressure inside).`,
  };
}

export function generateSurfaceTensionSteps(input: SurfaceTensionInput, result: SurfaceTensionResult): Step[] {
  const { mode, surfaceTension } = input;
  const nf = (v: number, sig = 5) => parseFloat(v.toPrecision(sig)).toString();

  if (mode === "contactLine" || mode === "wire") {
    const thetaDeg = input.contactAngle ?? 0;
    const factor   = mode === "wire" ? 2 : 1;
    const cosT     = result.cosTheta!;
    const L        = input.length!;
    const F        = result.force!;
    return [
      { description: mode === "wire"
          ? "Wire / thin film has two surfaces — factor of 2"
          : "Contact line pulls along a single surface",
        formula: mode === "wire" ? "F = 2σL cosθ" : "F = σL cosθ" },
      { description: "Compute cosθ",
        calculation: `cos(${thetaDeg.toFixed(1)}°) = ${cosT.toFixed(5)}` },
      { description: "Calculate force",
        calculation: `F = ${factor} × ${nf(surfaceTension)} × ${nf(L)} × ${cosT.toFixed(5)} = ${nf(F)} N`,
        result: nf(F), unit: "N" },
    ];
  }

  // pressure
  const R     = input.radius!;
  const shape = input.pressureShape ?? "droplet";
  const n     = shape === "bubble" ? 4 : shape === "droplet" ? 2 : 1;
  const ΔP    = result.pressureDiff!;
  return [
    { description: "Young-Laplace equation for spherical geometry",
      formula: shape === "bubble" ? "ΔP = 4σ / R" : shape === "droplet" ? "ΔP = 2σ / R" : "ΔP = σ / R" },
    { description: `Substitute σ and radius`,
      calculation: `ΔP = ${n} × ${nf(surfaceTension)} / ${nf(R)} = ${nf(ΔP)} Pa`,
      result: nf(ΔP), unit: "Pa" },
  ];
}

// ============================================================================
// Capillary Rise
// ============================================================================

export interface CapillaryRiseInput {
  surfaceTension: number; // N/m
  diameter: number;       // m
  density: number;        // kg/m³
  contactAngle?: number;  // radians (default 0)
  gravity?: number;       // m/s² (default 9.81)
}

export interface CapillaryRiseResult {
  height: number;              // m  (negative = depression)
  capillaryPressure: number;   // Pa  4σcosθ/d
  capillaryLength: number;     // m   λ = √(σ/(ρg))
  cosTheta: number;            // cosine of contact angle
  isDepression: boolean;       // h < 0
  interpretation: string;
}

export function calculateCapillaryRise(input: CapillaryRiseInput): CapillaryRiseResult {
  const { surfaceTension, diameter, density, contactAngle = 0, gravity = 9.81 } = input;
  const nf = (v: number, sig = 5) => parseFloat(v.toPrecision(sig)).toString();

  if (surfaceTension <= 0 || diameter <= 0 || density <= 0) {
    throw new Error("All inputs must be positive");
  }

  const cosTheta        = Math.cos(contactAngle);
  const height          = (4 * surfaceTension * cosTheta) / (density * gravity * diameter);
  const capillaryPressure = 4 * surfaceTension * cosTheta / diameter; // Pa
  const capillaryLength = Math.sqrt(surfaceTension / (density * gravity));
  const isDepression    = height < 0;

  const sign = isDepression ? "depression" : "rise";
  const hMm  = Math.abs(height * 1000);

  return {
    height, capillaryPressure, capillaryLength, cosTheta, isDepression,
    interpretation: `Capillary ${sign}: h = ${nf(height)} m (${nf(hMm)} mm). Capillary length λ = ${nf(capillaryLength * 1000)} mm.`,
  };
}

export function generateCapillaryRiseSteps(input: CapillaryRiseInput, result: CapillaryRiseResult): Step[] {
  const { surfaceTension, diameter, density, contactAngle = 0, gravity = 9.81 } = input;
  const { cosTheta } = result;
  const nf  = (v: number, sig = 5) => parseFloat(v.toPrecision(sig)).toString();
  const num = 4 * surfaceTension * cosTheta;
  const den = density * gravity * diameter;

  return [
    {
      description: "Write the capillary rise equation",
      formula: "h = 4σcosθ / (ρgd)",
    },
    {
      description: "Compute cosθ",
      calculation: `cos(${(contactAngle * 180 / Math.PI).toFixed(1)}°) = ${cosTheta.toFixed(5)}${cosTheta < 0 ? "  (negative → depression)" : ""}`,
    },
    {
      description: "Compute numerator  4σcosθ",
      calculation: `4 × ${nf(surfaceTension)} × ${cosTheta.toFixed(5)} = ${nf(num)} N/m`,
    },
    {
      description: "Compute denominator  ρgd",
      calculation: `${nf(density)} × ${gravity} × ${nf(diameter)} = ${nf(den)} Pa`,
    },
    {
      description: "Calculate capillary rise/depression height",
      calculation: `h = ${nf(num)} / ${nf(den)} = ${nf(result.height)} m = ${nf(result.height * 1000)} mm`,
      result: nf(result.height * 1000),
      unit: "mm",
    },
  ];
}

// ============================================================================
// Poiseuille Flow (Laminar Flow in Pipe)
// ============================================================================

export interface PoiseuilleFlowInput {
  diameter: number;          // m
  length: number;            // m
  pressureDifference: number;// Pa
  viscosity: number;         // Pa·s
  density?: number;          // kg/m³ (default 1000, for Re check)
}

export interface PoiseuilleFlowResult {
  flowRate: number;          // m³/s
  meanVelocity: number;      // m/s
  maxVelocity: number;       // m/s  (= 2 × Vmean for Poiseuille)
  reynoldsNumber: number;    // dimensionless
  isLaminar: boolean;
  interpretation: string;
}

export function calculatePoiseuilleFlow(input: PoiseuilleFlowInput): PoiseuilleFlowResult {
  const { diameter, length, pressureDifference, viscosity, density = 1000 } = input;

  if (diameter <= 0 || length <= 0 || pressureDifference <= 0 || viscosity <= 0) {
    throw new Error("All inputs must be positive");
  }

  const radius      = diameter / 2;
  const flowRate    = (Math.PI * Math.pow(radius, 4) * pressureDifference) / (8 * viscosity * length);
  const area        = Math.PI * radius * radius;
  const meanVelocity = flowRate / area;
  const maxVelocity  = 2 * meanVelocity;
  const reynoldsNumber = (density * meanVelocity * diameter) / viscosity;
  const isLaminar   = reynoldsNumber < 2300;

  return {
    flowRate,
    meanVelocity,
    maxVelocity,
    reynoldsNumber,
    isLaminar,
    interpretation: `Re = ${Math.round(reynoldsNumber)} — ${isLaminar ? "laminar ✓ Hagen-Poiseuille is valid." : "flow is NOT laminar (Re ≥ 2 300) — Hagen-Poiseuille does NOT apply."}`,
  };
}

export function generatePoiseuilleFlowSteps(input: PoiseuilleFlowInput, result: PoiseuilleFlowResult): Step[] {
  const { diameter, length, pressureDifference, viscosity } = input;
  const radius = diameter / 2;
  const r4 = Math.pow(radius, 4);
  const area = Math.PI * radius * radius;

  // Format numbers; convert JS scientific notation to LaTeX form
  const nf = (v: number, sig = 5): string => {
    const s = parseFloat(v.toPrecision(sig)).toString();
    return s.replace(/e([+-]?)(\d+)/i, (_m, sign, exp) =>
      `\\times 10^{${sign === "-" ? "-" : ""}${parseInt(exp)}}`
    );
  };

  return [
    {
      description: "Write the Hagen-Poiseuille equation",
      formula: "Q = (π × r⁴ × ΔP) / (8 × μ × L)",
    },
    {
      description: "Compute radius from diameter",
      calculation: `r = D / 2 = ${nf(diameter)} / 2 = ${nf(radius)} m`,
    },
    {
      description: "Compute r⁴",
      calculation: `r^{4} = (${nf(radius)})^{4} = ${nf(r4)} m^{4}`,
    },
    {
      description: "Substitute all values",
      calculation: `Q = (\\pi \\times ${nf(r4)} \\times ${nf(pressureDifference)}) / (8 \\times ${nf(viscosity)} \\times ${nf(length)})`,
    },
    {
      description: "Calculate flow rate",
      calculation: `Q = ${nf(result.flowRate)} m^{3}/s`,
      result: nf(result.flowRate),
      unit: "m³/s",
    },
    {
      description: "Compute mean and maximum velocity",
      calculation: `V_{mean} = Q / (\\pi r^{2}) = ${nf(result.flowRate)} / ${nf(area)} = ${nf(result.meanVelocity)} m/s,\\quad V_{max} = 2 V_{mean} = ${nf(result.maxVelocity)} m/s`,
    },
    {
      description: "Verify laminar flow assumption (Re < 2 300)",
      calculation: `Re = \\rho V_{mean} D / \\mu = ${Math.round(result.reynoldsNumber)} \\rightarrow ${result.isLaminar ? "laminar ✓" : "NOT laminar ✗"}`,
    },
  ];
}

// ============================================================================
// Friction Factor (Moody Chart)
// ============================================================================

export interface FrictionFactorInput {
  reynoldsNumber: number;
  relativeRoughness?: number; // ε/D
}

export interface FrictionFactorResult {
  frictionFactor: number;      // Darcy
  fanningFactor: number;       // Darcy / 4
  regime: "laminar" | "transitional" | "turbulent";
  method: string;
  interpretation: string;
}

export function calculateFrictionFactor(input: FrictionFactorInput): FrictionFactorResult {
  const { reynoldsNumber, relativeRoughness = 0 } = input;

  if (reynoldsNumber <= 0) throw new Error("Reynolds number must be positive");

  const regime: FrictionFactorResult["regime"] =
    reynoldsNumber < 2300 ? "laminar" :
    reynoldsNumber < 4000 ? "transitional" : "turbulent";

  let frictionFactor: number;
  let method: string;

  if (reynoldsNumber < 2300) {
    frictionFactor = 64 / reynoldsNumber;
    method = "Laminar: f = 64 / Re";
  } else {
    const term1 = relativeRoughness / 3.7;
    const term2 = 5.74 / Math.pow(reynoldsNumber, 0.9);
    frictionFactor = 0.25 / Math.pow(Math.log10(term1 + term2), 2);
    method = regime === "transitional"
      ? "Swamee-Jain (transitional — use with caution)"
      : "Swamee-Jain approximation of Colebrook-White";
  }

  const fanningFactor = frictionFactor / 4;
  const regimeLabel = regime.charAt(0).toUpperCase() + regime.slice(1);

  return {
    frictionFactor,
    fanningFactor,
    regime,
    method,
    interpretation: `${regimeLabel} flow. Darcy f = ${frictionFactor.toFixed(5)}, Fanning f = ${fanningFactor.toFixed(5)}.`,
  };
}

export function generateFrictionFactorSteps(input: FrictionFactorInput, result: FrictionFactorResult): Step[] {
  const { reynoldsNumber: re, relativeRoughness: eD = 0 } = input;
  const f = result.frictionFactor;

  const sci = (v: number, dp = 4) =>
    v.toExponential(dp).replace(/e([+-]?)(\d+)/i, (_, sign, exp) =>
      `\\times 10^{${sign === '-' ? '-' : ''}${parseInt(exp)}}`
    );

  if (re < 2300) {
    return [
      {
        description: "Identify flow regime — laminar (Re < 2 300)",
        calculation: `Re = ${re.toFixed(0)} < 2300 \\to \\text{ laminar}`,
      },
      {
        description: "Laminar friction factor formula",
        formula: "f = 64 / Re",
      },
      {
        description: "Substitute Reynolds number",
        calculation: `f = 64 / ${re.toFixed(0)} = ${f.toFixed(5)}`,
        result: `${f.toFixed(5)}`,
        unit: "dimensionless",
      },
    ];
  }

  const term1 = eD / 3.7;
  const term2 = 5.74 / Math.pow(re, 0.9);
  const sumTerms = term1 + term2;
  const logVal = Math.log10(sumTerms);

  return [
    {
      description: `Identify flow regime — ${result.regime} (Re = ${re.toFixed(0)})`,
      calculation: `Re = ${re.toFixed(0)} \\to \\text{ ${result.regime} flow}`,
    },
    {
      description: "Swamee-Jain approximation of Colebrook-White",
      formula: "f = 0.25 / [log_{10}(ε/D / 3.7 + 5.74 / Re^{0.9})]^{2}",
    },
    {
      description: "Calculate the roughness term  ε/D ÷ 3.7",
      calculation: `${sci(eD)} / 3.7 = ${sci(term1)}`,
    },
    {
      description: "Calculate the Reynolds term  5.74 / Re^{0.9}",
      calculation: `5.74 / ${re.toFixed(0)}^{0.9} = 5.74 / ${Math.pow(re, 0.9).toFixed(2)} = ${sci(term2)}`,
    },
    {
      description: "Sum both terms inside the log",
      calculation: `${sci(term1)} + ${sci(term2)} = ${sci(sumTerms)}`,
    },
    {
      description: "Apply log base-10 and square",
      calculation: `\\log_{10}(${sci(sumTerms)}) = ${logVal.toFixed(5)}, \\quad (${logVal.toFixed(5)})^{2} = ${(logVal * logVal).toFixed(5)}`,
    },
    {
      description: "Compute Darcy friction factor",
      calculation: `f = 0.25 / ${(logVal * logVal).toFixed(5)} = ${f.toFixed(5)}`,
      result: `${f.toFixed(5)}`,
      unit: "dimensionless",
    },
  ];
}

// ============================================================================
// Minor Losses
// ============================================================================

export interface MinorLossesInput {
  velocity: number; // m/s
  lossCoefficient: number; // K
  gravity?: number; // m/s²
}

export interface MinorLossesResult {
  headLoss: number;     // m
  velocityHead: number; // m  V²/(2g)
  interpretation: string;
}

export function calculateMinorLosses(input: MinorLossesInput): MinorLossesResult {
  const { velocity, lossCoefficient, gravity = 9.81 } = input;

  if (velocity < 0 || lossCoefficient < 0) {
    throw new Error("Velocity and loss coefficient must be non-negative");
  }

  const velocityHead = Math.pow(velocity, 2) / (2 * gravity);
  const headLoss = lossCoefficient * velocityHead;

  return {
    headLoss,
    velocityHead,
    interpretation: `Minor head loss is ${fmtN(headLoss)} m (= ${fmtN(lossCoefficient)} × velocity head of ${fmtN(velocityHead)} m).`,
  };
}

export function generateMinorLossesSteps(input: MinorLossesInput, result: MinorLossesResult): Step[] {
  const { velocity, lossCoefficient, gravity = 9.81 } = input;

  return [
    {
      description: "Write the minor losses equation",
      formula: "hL = K × V²/(2g)",
    },
    {
      description: "Calculate the velocity head",
      calculation: `V²/(2g) = ${fmtN(velocity)}² / (2 × ${gravity}) = ${fmtN(result.velocityHead)} m`,
    },
    {
      description: "Multiply by the loss coefficient K",
      calculation: `hL = ${fmtN(lossCoefficient)} × ${fmtN(result.velocityHead)} = ${fmtN(result.headLoss)} m`,
      result: `${fmtN(result.headLoss)}`,
      unit: "m",
    },
  ];
}

// ============================================================================
// Torricelli's Theorem
// ============================================================================

export interface TorricelliInput {
  height: number; // m
  gravity?: number; // m/s²
}

export interface TorricelliResult {
  velocity: number; // m/s
  interpretation: string;
}

export function calculateTorricelli(input: TorricelliInput): TorricelliResult {
  const { height, gravity = 9.81 } = input;

  if (height <= 0) throw new Error("Height must be positive");

  const velocity = Math.sqrt(2 * gravity * height);

  return {
    velocity,
    interpretation: `V = ${fmtN(velocity)} m/s`,
  };
}

export function generateTorricelliSteps(input: TorricelliInput, result: TorricelliResult): Step[] {
  const { height, gravity = 9.81 } = input;

  return [
    {
      description: "Write Torricelli's theorem (from Bernoulli)",
      formula: "V = √(2gh)",
    },
    {
      description: "Substitute values",
      calculation: `V = √(2 × ${gravity} × ${fmtN(height)})`,
    },
    {
      description: "Ideal exit velocity",
      result: `V = ${fmtN(result.velocity)} m/s`,
    },
  ];
}

// ============================================================================
// Pitot Tube
// ============================================================================

export interface PitotTubeInput {
  pressureDifference: number; // Pa
  density: number; // kg/m³
}

export interface PitotTubeResult {
  velocity: number; // m/s
  interpretation: string;
}

export function calculatePitotTube(input: PitotTubeInput): PitotTubeResult {
  const { pressureDifference, density } = input;

  if (pressureDifference <= 0) throw new Error("Pressure difference must be positive");
  if (density <= 0) throw new Error("Fluid density must be positive");

  const velocity = Math.sqrt((2 * pressureDifference) / density);

  return {
    velocity,
    interpretation: `V = ${fmtN(velocity)} m/s`,
  };
}

export function generatePitotTubeSteps(input: PitotTubeInput, result: PitotTubeResult): Step[] {
  const { pressureDifference, density } = input;

  return [
    {
      description: "Write the Pitot tube equation (from Bernoulli)",
      formula: "V = √(2ΔP/ρ)",
    },
    {
      description: "Substitute values",
      calculation: `V = √(2 × ${fmtN(pressureDifference)} / ${fmtN(density)})`,
    },
    {
      description: "Flow velocity",
      result: `V = ${fmtN(result.velocity)} m/s`,
    },
  ];
}

// ============================================================================
// Velocity Head
// ============================================================================

export interface VelocityHeadInput {
  velocity: number; // m/s
  gravity?: number; // m/s²
}

export interface VelocityHeadResult {
  velocityHead: number; // m
  interpretation: string;
}

export function calculateVelocityHead(input: VelocityHeadInput): VelocityHeadResult {
  const { velocity, gravity = 9.81 } = input;

  if (velocity < 0) throw new Error("Velocity must be non-negative");

  const velocityHead = velocity ** 2 / (2 * gravity);

  return {
    velocityHead,
    interpretation: `${fmtN(velocityHead)} m`,
  };
}

export function generateVelocityHeadSteps(input: VelocityHeadInput, result: VelocityHeadResult): Step[] {
  const { velocity, gravity = 9.81 } = input;

  return [
    {
      description: "Write the velocity head equation",
      formula: "h_{v} = V²/(2g)",
    },
    {
      description: "Substitute values",
      calculation: `h_{v} = (${fmtN(velocity)})² / (2 × ${gravity})`,
    },
    {
      description: "Velocity head",
      result: `h_{v} = ${fmtN(result.velocityHead)} m`,
    },
  ];
}

// ============================================================================
// Mass Flow Rate
// ============================================================================

export interface MassFlowRateInput {
  density: number; // kg/m³
  flowRate?: number; // m³/s
  velocity?: number; // m/s
  area?: number; // m²
  diameter?: number; // m
}

export interface MassFlowRateResult {
  massFlowRate: number; // kg/s
  interpretation: string;
}

export function calculateMassFlowRate(input: MassFlowRateInput): MassFlowRateResult {
  const { density, flowRate, velocity, area, diameter } = input;

  if (density <= 0) throw new Error("Density must be positive");

  let A = area;
  if (diameter !== undefined && area === undefined) {
    if (diameter <= 0) throw new Error("Diameter must be positive");
    A = Math.PI * (diameter / 2) ** 2;
  }

  let Q = flowRate;
  if (Q === undefined && velocity !== undefined && A !== undefined) {
    if (velocity < 0) throw new Error("Velocity must be non-negative");
    Q = velocity * A;
  }

  if (Q === undefined) throw new Error("Provide flow rate, or velocity with area / diameter");
  if (Q < 0) throw new Error("Flow rate cannot be negative");

  const massFlowRate = density * Q;

  return {
    massFlowRate,
    interpretation: `${fmtN(massFlowRate)} kg/s`,
  };
}

export function generateMassFlowRateSteps(input: MassFlowRateInput, result: MassFlowRateResult): Step[] {
  const { density, flowRate, velocity, area, diameter } = input;

  const A = area ?? (diameter !== undefined ? Math.PI * (diameter / 2) ** 2 : undefined);
  const Q = flowRate ?? (velocity !== undefined && A !== undefined ? velocity * A : undefined);

  const steps: Step[] = [
    { description: "Write the mass flow rate equation", formula: "ṁ = ρ × Q" },
  ];

  if (diameter !== undefined && area === undefined && A !== undefined) {
    steps.push({
      description: "Compute cross-sectional area from diameter",
      calculation: `A = π(D/2)² = π × (${fmtN(diameter)}/2)² = ${fmtN(A)} m²`,
      result: `A = ${fmtN(A)} m²`,
    });
  }

  if (flowRate === undefined && velocity !== undefined && A !== undefined && Q !== undefined) {
    steps.push({
      description: "Compute volumetric flow rate",
      calculation: `Q = A × V = ${fmtN(A)} × ${fmtN(velocity)} = ${fmtN(Q)} m³/s`,
      result: `Q = ${fmtN(Q)} m³/s`,
    });
  }

  if (Q !== undefined) {
    steps.push({
      description: "Calculate mass flow rate",
      calculation: `ṁ = ρ × Q = ${fmtN(density)} × ${fmtN(Q)}`,
      result: `ṁ = ${fmtN(result.massFlowRate)} kg/s`,
    });
  }

  return steps;
}

// ============================================================================
// Static Pressure
// ============================================================================

export interface StaticPressureInput {
  totalPressure: number;  // Pa
  dynamicPressure: number; // Pa
}

export interface StaticPressureResult {
  staticPressure: number;  // Pa
  interpretation: string;
}

export function calculateStaticPressure(input: StaticPressureInput): StaticPressureResult {
  const { totalPressure, dynamicPressure } = input;

  if (totalPressure < 0)  throw new Error("Total pressure must be non-negative");
  if (dynamicPressure < 0) throw new Error("Dynamic pressure must be non-negative");

  const staticPressure = totalPressure - dynamicPressure;

  if (staticPressure < 0)
    throw new Error("Dynamic pressure exceeds total pressure — check inputs");

  return {
    staticPressure,
    interpretation: `${fmtN(staticPressure)} Pa`,
  };
}

export function generateStaticPressureSteps(input: StaticPressureInput, result: StaticPressureResult): Step[] {
  return [
    {
      description: "Pressure decomposition from Bernoulli",
      formula: "P_{total} = P_{static} + q",
    },
    {
      description: "Rearrange for static pressure",
      formula: "P_{static} = P_{total} - q",
    },
    {
      description: "Substitute values",
      calculation: `P_{static} = ${fmtN(input.totalPressure)} - ${fmtN(input.dynamicPressure)}`,
      result: `P_{static} = ${fmtN(result.staticPressure)} Pa`,
    },
  ];
}

// ============================================================================
// Dynamic Pressure
// ============================================================================

export interface DynamicPressureInput {
  density: number;   // kg/m³
  velocity: number;  // m/s
}

export interface DynamicPressureResult {
  dynamicPressure: number; // Pa
  interpretation: string;
}

export function calculateDynamicPressure(input: DynamicPressureInput): DynamicPressureResult {
  const { density, velocity } = input;

  if (density  <= 0) throw new Error("Density must be positive");
  if (velocity <  0) throw new Error("Velocity must be non-negative");

  const dynamicPressure = 0.5 * density * velocity ** 2;

  return {
    dynamicPressure,
    interpretation: `${fmtN(dynamicPressure)} Pa`,
  };
}

export function generateDynamicPressureSteps(input: DynamicPressureInput, result: DynamicPressureResult): Step[] {
  const { density, velocity } = input;
  return [
    {
      description: "Write the dynamic pressure equation",
      formula: "q = (1/2)ρV^2",
    },
    {
      description: "Substitute values",
      calculation: `q = 0.5 × ${fmtN(density)} × (${fmtN(velocity)})^{2}`,
    },
    {
      description: "Dynamic pressure",
      result: `q = ${fmtN(result.dynamicPressure)} Pa`,
    },
  ];
}

// ============================================================================
// Total Pressure
// ============================================================================

export interface TotalPressureInput {
  staticPressure: number;  // Pa
  dynamicPressure: number; // Pa
}

export interface TotalPressureResult {
  totalPressure: number;  // Pa
  interpretation: string;
}

export function calculateTotalPressure(input: TotalPressureInput): TotalPressureResult {
  const { staticPressure, dynamicPressure } = input;

  if (staticPressure  < 0) throw new Error("Static pressure must be non-negative");
  if (dynamicPressure < 0) throw new Error("Dynamic pressure must be non-negative");

  const totalPressure = staticPressure + dynamicPressure;
  return {
    totalPressure,
    interpretation: `${fmtN(totalPressure)} Pa`,
  };
}

export function generateTotalPressureSteps(input: TotalPressureInput, result: TotalPressureResult): Step[] {
  return [
    {
      description: "Pressure decomposition from Bernoulli",
      formula: "P_{total} = P_{static} + q",
    },
    {
      description: "Substitute values",
      calculation: `P_{total} = ${fmtN(input.staticPressure)} + ${fmtN(input.dynamicPressure)}`,
    },
    {
      description: "Total (stagnation) pressure",
      result: `P_{total} = ${fmtN(result.totalPressure)} Pa`,
    },
  ];
}

// ============================================================================
// Energy Loss
// ============================================================================

export interface EnergyLossInput {
  headLoss: number;   // m
  flowRate: number;   // m³/s
  density: number;    // kg/m³
  gravity?: number;   // m/s²
}

export interface EnergyLossResult {
  powerLoss: number;            // W   P = ρgQhf
  specificEnergyLoss: number;   // J/kg  e = g × hf
  pressureEquiv: number;        // Pa    ΔP = ρg × hf
  massFlowRate: number;         // kg/s  ṁ = ρQ
  interpretation: string;
}

export function calculateEnergyLoss(input: EnergyLossInput): EnergyLossResult {
  const { headLoss, flowRate, density, gravity = 9.81 } = input;
  const massFlowRate      = density * flowRate;
  const specificEnergyLoss= gravity * headLoss;               // J/kg
  const pressureEquiv     = density * gravity * headLoss;     // Pa
  const powerLoss         = pressureEquiv * flowRate;         // W = ρgQhf

  return {
    powerLoss, specificEnergyLoss, pressureEquiv, massFlowRate,
    interpretation: `Power dissipated: ${fmtN(powerLoss / 1000)} kW = ${fmtN(powerLoss / 745.7)} hp. Pressure equivalent: ${fmtN(pressureEquiv / 1000)} kPa.`,
  };
}

export function generateEnergyLossSteps(input: EnergyLossInput, result: EnergyLossResult): Step[] {
  const { headLoss, flowRate, density, gravity = 9.81 } = input;

  function nf(x: number): string {
    if (x === 0) return "0";
    const abs = Math.abs(x);
    if (abs >= 1e-3 && abs < 1e5) return parseFloat(x.toPrecision(4)).toString();
    const e = Math.floor(Math.log10(abs));
    const m = parseFloat((x / Math.pow(10, e)).toPrecision(4));
    return `${m} \\times 10^{${e}}`;
  }

  return [
    {
      description: "Hydraulic power loss equation",
      formula: "P_{\\text{loss}} = \\rho g Q h_f",
    },
    {
      description: "Mass flow rate",
      formula: "\\dot{m} = \\rho Q",
      calculation: `\\dot{m} = ${nf(density)} \\times ${nf(flowRate)} = ${nf(result.massFlowRate)} \\text{ kg/s}`,
    },
    {
      description: "Specific energy loss",
      formula: "e = g\\, h_f",
      calculation: `e = ${nf(gravity)} \\times ${nf(headLoss)} = ${nf(result.specificEnergyLoss)} \\text{ J/kg}`,
    },
    {
      description: "Pressure equivalent",
      formula: "\\Delta P = \\rho g h_f",
      calculation: `\\Delta P = ${nf(density)} \\times ${nf(gravity)} \\times ${nf(headLoss)} = ${nf(result.pressureEquiv)} \\text{ Pa}`,
    },
    {
      description: "Hydraulic power loss",
      formula: "P_{\\text{loss}} = \\dot{m} \\times e = \\rho g Q h_f",
      calculation: `P_{\\text{loss}} = ${nf(result.massFlowRate)} \\times ${nf(result.specificEnergyLoss)} = ${nf(result.powerLoss)} \\text{ W}`,
      result: `${nf(result.powerLoss)}`,
      unit: "W",
    },
  ];
}

// ============================================================================
// Area Ratio
// ============================================================================

export interface AreaRatioInput {
  area1?: number;  // m²
  area2?: number;  // m²
  diameter1?: number; // m
  diameter2?: number; // m
}

export interface AreaRatioResult {
  areaRatio: number;
  interpretation: string;
}

export function calculateAreaRatio(input: AreaRatioInput): AreaRatioResult {
  let area1 = input.area1;
  let area2 = input.area2;

  if (input.diameter1 !== undefined && area1 === undefined) {
    if (input.diameter1 <= 0) throw new Error("Diameter 1 must be positive");
    area1 = Math.PI * (input.diameter1 / 2) ** 2;
  }
  if (input.diameter2 !== undefined && area2 === undefined) {
    if (input.diameter2 <= 0) throw new Error("Diameter 2 must be positive");
    area2 = Math.PI * (input.diameter2 / 2) ** 2;
  }

  if (!area1 || area1 <= 0) throw new Error("Provide a valid area or diameter for section 1");
  if (!area2 || area2 <= 0) throw new Error("Provide a valid area or diameter for section 2");

  const areaRatio = area1 / area2;
  return {
    areaRatio,
    interpretation: `β = ${fmtN(areaRatio)}`,
  };
}

export function generateAreaRatioSteps(input: AreaRatioInput, result: AreaRatioResult): Step[] {
  let A1 = input.area1;
  let A2 = input.area2;

  const steps: Step[] = [];

  if (input.diameter1 !== undefined && A1 === undefined) {
    A1 = Math.PI * (input.diameter1 / 2) ** 2;
    steps.push({
      description: "Compute cross-sectional area 1 from diameter",
      calculation: `A_{1} = π(D_{1}/2)² = π × (${fmtN(input.diameter1)}/2)² = ${fmtN(A1)} m²`,
      result: `A_{1} = ${fmtN(A1)} m²`,
    });
  }
  if (input.diameter2 !== undefined && A2 === undefined) {
    A2 = Math.PI * (input.diameter2 / 2) ** 2;
    steps.push({
      description: "Compute cross-sectional area 2 from diameter",
      calculation: `A_{2} = π(D_{2}/2)² = π × (${fmtN(input.diameter2)}/2)² = ${fmtN(A2)} m²`,
      result: `A_{2} = ${fmtN(A2)} m²`,
    });
  }

  steps.push({ description: "Area ratio", formula: "β = A_{1} / A_{2}" });

  if (A1 !== undefined && A2 !== undefined) {
    steps.push({
      description: "Substitute values",
      calculation: `β = ${fmtN(A1)} / ${fmtN(A2)}`,
      result: `β = ${fmtN(result.areaRatio)}`,
    });
    steps.push({
      description: "Velocity ratio from continuity  Q = A₁V₁ = A₂V₂",
      formula: "V_{2}/V_{1} = A_{1}/A_{2} = β",
      result: `V_{2}/V_{1} = ${fmtN(result.areaRatio)}`,
    });
  }

  return steps;
}

// ============================================================================
// Manning's Equation
// ============================================================================

export type ManningsMode = "findV" | "findS" | "findN" | "findRh";

export interface ManningsEquationInput {
  mode: ManningsMode;
  manningN?: number;       // roughness coefficient
  hydraulicRadius?: number;// m  R_h = A / P
  slope?: number;          // m/m  channel slope S
  velocity?: number;       // m/s  (for findS / findN / findRh)
  area?: number;           // m²  cross-section (optional — enables Q and Fr)
  depth?: number;          // m   flow depth (optional — enables Froude number)
}

export interface ManningsEquationResult {
  velocity: number;        // m/s
  manningN: number;
  hydraulicRadius: number; // m
  slope: number;           // m/m
  flowRate?: number;       // m³/s
  froudeNumber?: number;   // V / √(g·y)
  flowRegime?: string;     // subcritical / critical / supercritical
  interpretation: string;
}

export function calculateManningsEquation(input: ManningsEquationInput): ManningsEquationResult {
  const { mode, area, depth } = input;
  let V: number, n: number, R: number, S: number;

  if (mode === "findV") {
    if (!input.manningN || !input.hydraulicRadius || !input.slope)
      throw new Error("n, R, and S are required");
    n = input.manningN; R = input.hydraulicRadius; S = input.slope;
    if (n <= 0 || R <= 0 || S <= 0) throw new Error("n, R, and S must be positive");
    V = (1 / n) * Math.pow(R, 2 / 3) * Math.pow(S, 0.5);

  } else if (mode === "findS") {
    if (!input.manningN || !input.hydraulicRadius || !input.velocity)
      throw new Error("n, R, and V are required");
    n = input.manningN; R = input.hydraulicRadius; V = input.velocity;
    if (n <= 0 || R <= 0 || V <= 0) throw new Error("n, R, and V must be positive");
    S = Math.pow((n * V) / Math.pow(R, 2 / 3), 2);

  } else if (mode === "findN") {
    if (!input.velocity || !input.hydraulicRadius || !input.slope)
      throw new Error("V, R, and S are required");
    V = input.velocity; R = input.hydraulicRadius; S = input.slope;
    if (V <= 0 || R <= 0 || S <= 0) throw new Error("V, R, and S must be positive");
    n = (Math.pow(R, 2 / 3) * Math.pow(S, 0.5)) / V;

  } else {
    // findRh
    if (!input.manningN || !input.velocity || !input.slope)
      throw new Error("n, V, and S are required");
    n = input.manningN; V = input.velocity; S = input.slope;
    if (n <= 0 || V <= 0 || S <= 0) throw new Error("n, V, and S must be positive");
    R = Math.pow((n * V) / Math.pow(S, 0.5), 3 / 2);
  }

  const flowRate = area ? V * area : undefined;

  let froudeNumber: number | undefined;
  let flowRegime: string | undefined;
  if (depth && depth > 0) {
    froudeNumber = V / Math.sqrt(9.81 * depth);
    flowRegime = froudeNumber < 0.95 ? "subcritical (Fr < 1)" :
                 froudeNumber > 1.05 ? "supercritical (Fr > 1)" : "critical (Fr ≈ 1)";
  }

  return {
    velocity: V, manningN: n, hydraulicRadius: R, slope: S,
    flowRate, froudeNumber, flowRegime,
    interpretation: `V = ${V.toFixed(3)} m/s, n = ${n.toFixed(4)}, R = ${R.toFixed(4)} m, S = ${S.toExponential(4)}${flowRate !== undefined ? `, Q = ${flowRate.toFixed(3)} m³/s` : ""}${flowRegime ? ` — ${flowRegime}` : ""}.`,
  };
}

export function generateManningsEquationSteps(input: ManningsEquationInput, result: ManningsEquationResult): Step[] {
  const { mode } = input;
  const { velocity: V, manningN: n, hydraulicRadius: R, slope: S } = result;
  const steps: Step[] = [];

  if (mode === "findV") {
    steps.push(
      { description: "Write Manning's equation for velocity",
        formula: "V = (1/n) × R_h^{2/3} × S^{1/2}" },
      { description: "Substitute n, hydraulic radius, and slope",
        calculation: `V = (1/${n.toFixed(4)}) × ${R.toFixed(4)}^{2/3} × ${S.toExponential(4)}^{1/2}`,
        result: `${V.toFixed(5)}`, unit: "m/s" }
    );
  } else if (mode === "findS") {
    steps.push(
      { description: "Rearrange Manning's equation for slope",
        formula: "S = (n × V / R_h^{2/3})^{2}" },
      { description: "Substitute n, V, and R",
        calculation: `S = (${n.toFixed(4)} × ${V.toFixed(4)} / ${R.toFixed(4)}^{2/3})^{2} = ${S.toExponential(5)}`,
        result: `${S.toExponential(5)}`, unit: "m/m" }
    );
  } else if (mode === "findN") {
    steps.push(
      { description: "Rearrange Manning's equation for n",
        formula: "n = R_h^{2/3} × S^{1/2} / V" },
      { description: "Substitute V, R, and S",
        calculation: `n = ${R.toFixed(4)}^{2/3} × ${S.toExponential(4)}^{1/2} / ${V.toFixed(4)} = ${n.toFixed(5)}`,
        result: `${n.toFixed(5)}`, unit: "dimensionless" }
    );
  } else {
    steps.push(
      { description: "Rearrange Manning's equation for hydraulic radius",
        formula: "R_h = (n × V / S^{1/2})^{3/2}" },
      { description: "Substitute n, V, and S",
        calculation: `R_h = (${n.toFixed(4)} × ${V.toFixed(4)} / ${S.toExponential(4)}^{1/2})^{3/2} = ${R.toFixed(5)} m`,
        result: `${R.toFixed(5)}`, unit: "m" }
    );
  }

  if (result.flowRate !== undefined && input.area) {
    steps.push({
      description: "Flow rate  Q = V × A",
      formula: "Q = V × A",
      calculation: `Q = ${V.toFixed(4)} × ${input.area.toFixed(4)} = ${result.flowRate.toFixed(5)} m³/s`,
      result: `${result.flowRate.toFixed(5)}`, unit: "m³/s",
    });
  }

  if (result.froudeNumber !== undefined && input.depth) {
    steps.push({
      description: "Froude number  Fr = V / √(g × y)",
      formula: "Fr = V / √(g × y)",
      calculation: `Fr = ${V.toFixed(4)} / √(9.81 × ${input.depth.toFixed(4)}) = ${result.froudeNumber.toFixed(4)}`,
      result: `${result.froudeNumber.toFixed(4)}`, unit: "dimensionless",
    });
  }

  return steps;
}

// ============================================================================
// Critical Depth
// ============================================================================

export type CriticalDepthChannel = "rectangular" | "trapezoidal" | "circular";

export interface CriticalDepthInput {
  channelType?: CriticalDepthChannel; // default "rectangular"
  flowRate: number;       // m³/s
  width: number;          // m  bottom width (rectangular/trapezoidal) or diameter (circular)
  sideSlope?: number;     // z  H:V side slope (trapezoidal only, 0 = vertical walls)
  manningN?: number;      // optional — enables critical slope S_c
  gravity?: number;       // m/s²
}

export interface CriticalDepthResult {
  criticalDepth: number;    // m
  criticalVelocity: number; // m/s
  criticalArea: number;     // m²
  criticalTopWidth: number; // m  T = dA/dy at y_c
  specificEnergy: number;   // m  E_c = y_c + V_c²/(2g)
  unitDischarge?: number;   // m²/s  q = Q/b (rectangular only)
  criticalSlope?: number;   // m/m  S_c (if Manning's n provided)
  hydraulicDepth: number;   // m  D_h = A/T
  interpretation: string;
}

function _criticalGeom(y: number, Q: number, b: number, z: number, ch: CriticalDepthChannel) {
  let A: number, T: number;
  if (ch === "circular") {
    const D = b, theta = 2 * Math.acos(Math.max(-1, Math.min(1, 1 - 2 * y / D)));
    A = (D * D / 8) * (theta - Math.sin(theta));
    T = D * Math.sin(theta / 2);
  } else if (ch === "trapezoidal") {
    A = (b + z * y) * y; T = b + 2 * z * y;
  } else {
    A = b * y; T = b;
  }
  return { A, T, residual: Q * Q * T - 9.81 * A * A * A };
}

export function calculateCriticalDepth(input: CriticalDepthInput): CriticalDepthResult {
  const { flowRate: Q, width: b, sideSlope: z = 0,
          manningN: n, channelType: ch = "rectangular", gravity: g = 9.81 } = input;

  if (Q <= 0 || b <= 0) throw new Error("Flow rate and width must be positive");

  let yc: number;
  if (ch === "rectangular") {
    const q = Q / b;
    yc = Math.pow(q * q / g, 1 / 3);
  } else {
    // Bisection: solve Q²·T / (g·A³) = 1
    let lo = 1e-6, hi = (ch === "circular") ? b * 0.9999 : 100;
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      if (_criticalGeom(mid, Q, b, z, ch).residual < 0) lo = mid; else hi = mid;
    }
    yc = (lo + hi) / 2;
  }

  const { A: Ac, T: Tc } = (() => {
    const res = _criticalGeom(yc, Q, b, z, ch);
    return { A: res.A < 1e-12 ? yc * b : res.A, T: res.T < 1e-12 ? b : res.T };
  })();

  const Vc = Q / Ac;
  const Ec = yc + (Vc * Vc) / (2 * g);
  const Dh = Ac / Tc;   // hydraulic depth
  const unitDischarge = ch === "rectangular" ? Q / b : undefined;

  let criticalSlope: number | undefined;
  if (n) {
    const Pc = ch === "rectangular" ? b + 2 * yc
             : ch === "trapezoidal" ? b + 2 * yc * Math.sqrt(1 + z * z)
             : b * Math.acos(1 - 2 * yc / b);  // circular: radius × central angle
    const Rc = Ac / Pc;
    criticalSlope = Math.pow((n * Vc) / Math.pow(Rc, 2 / 3), 2);
  }

  return {
    criticalDepth: yc, criticalVelocity: Vc, criticalArea: Ac,
    criticalTopWidth: Tc, specificEnergy: Ec, unitDischarge,
    criticalSlope, hydraulicDepth: Dh,
    interpretation: `Critical depth = ${yc.toFixed(4)} m, critical velocity = ${Vc.toFixed(4)} m/s, specific energy = ${Ec.toFixed(4)} m${criticalSlope !== undefined ? `, critical slope = ${criticalSlope.toExponential(4)}` : ""}.`,
  };
}

export function generateCriticalDepthSteps(input: CriticalDepthInput, result: CriticalDepthResult): Step[] {
  const { flowRate: Q, width: b, sideSlope: z = 0,
          channelType: ch = "rectangular", gravity: g = 9.81, manningN: n } = input;
  const { criticalDepth: yc, criticalVelocity: Vc, criticalArea: Ac,
          criticalTopWidth: Tc, specificEnergy: Ec } = result;
  const steps: Step[] = [];

  if (ch === "rectangular") {
    const q = Q / b;
    steps.push(
      { description: "Unit discharge  q = Q / b",
        formula: "q = Q / b",
        calculation: `q = ${Q.toFixed(4)} / ${b.toFixed(4)} = ${q.toFixed(5)} m²/s` },
      { description: "Critical depth — rectangular channel",
        formula: "y_c = (q^{2}/g)^{1/3}",
        calculation: `y_c = (${q.toFixed(4)}^{2} / ${g})^{1/3} = ${yc.toFixed(5)} m`,
        result: `${yc.toFixed(5)}`, unit: "m" }
    );
  } else {
    steps.push(
      { description: `Critical depth — ${ch} channel (general condition A³/T = Q²/g, solved by bisection)`,
        formula: "Q^{2}/g = A^{3}/T",
        calculation: `Bisection solution: y_c = ${yc.toFixed(5)} m,  A_c = ${Ac.toFixed(5)} m²,  T_c = ${Tc.toFixed(5)} m`,
        result: `${yc.toFixed(5)}`, unit: "m" }
    );
  }

  steps.push(
    { description: "Critical velocity",
      formula: "V_c = Q / A_c",
      calculation: `V_c = ${Q.toFixed(4)} / ${Ac.toFixed(5)} = ${Vc.toFixed(5)} m/s`,
      result: `${Vc.toFixed(5)}`, unit: "m/s" },
    { description: "Specific energy at critical depth",
      formula: "E_c = y_c + V_c^{2} / (2g)",
      calculation: `E_c = ${yc.toFixed(4)} + ${Vc.toFixed(4)}^{2} / (2 × ${g}) = ${Ec.toFixed(5)} m`,
      result: `${Ec.toFixed(5)}`, unit: "m" }
  );

  if (ch === "rectangular") {
    steps.push({
      description: "Verify rectangular channel identity: specific energy = (3/2) × critical depth",
      calculation: `(3/2) × ${yc.toFixed(4)} = ${(1.5 * yc).toFixed(5)} m  ✓`,
    });
  }

  if (result.criticalSlope !== undefined && n) {
    const Pc = ch === "rectangular" ? b + 2 * yc
             : ch === "trapezoidal" ? b + 2 * yc * Math.sqrt(1 + z * z)
             : b * Math.acos(1 - 2 * yc / b);
    const Rc = Ac / Pc;
    steps.push({
      description: "Critical slope from Manning's equation",
      formula: "S_c = (n × V_c / R_c^{2/3})^{2}",
      calculation: `R_c = ${Rc.toFixed(4)} m,  S_c = (${n} × ${Vc.toFixed(4)} / ${Rc.toFixed(4)}^{2/3})^{2} = ${result.criticalSlope.toExponential(4)}`,
      result: `${result.criticalSlope.toExponential(4)}`, unit: "m/m",
    });
  }

  return steps;
}

// ============================================================================
// Hydraulic Jump
// ============================================================================

export interface HydraulicJumpInput {
  upstreamDepth: number;    // m  y₁
  upstreamVelocity: number; // m/s  V₁
  width?: number;           // m  (optional — enables Q and power)
  gravity?: number;         // m/s²
}

export interface HydraulicJumpResult {
  upstreamFroude: number;    // Fr₁
  downstreamDepth: number;   // m  y₂  (sequent/conjugate depth)
  downstreamVelocity: number;// m/s  V₂
  downstreamFroude: number;  // Fr₂
  upstreamEnergy: number;    // m  E₁ = y₁ + V₁²/(2g)
  downstreamEnergy: number;  // m  E₂
  energyLoss: number;        // m  ΔE = E₁ − E₂
  energyEfficiency: number;  // %  E₂/E₁ × 100
  jumpLength: number;        // m  L_j ≈ 6 × y₂
  depthRatio: number;        // y₂/y₁
  flowRate?: number;          // m³/s  Q = V₁ × y₁ × b
  powerDissipated?: number;  // W/m  ρg × Q/b × ΔE (per unit width) if width given
  jumpType: string;
  isValidJump: boolean;
  interpretation: string;
}

export function calculateHydraulicJump(input: HydraulicJumpInput): HydraulicJumpResult {
  const { upstreamDepth: y1, upstreamVelocity: V1, width, gravity: g = 9.81 } = input;
  if (y1 <= 0 || V1 <= 0) throw new Error("Depth and velocity must be positive");

  const Fr1 = V1 / Math.sqrt(g * y1);
  const isValidJump = Fr1 > 1;

  // Sequent depth (Belanger equation)
  const y2 = (y1 / 2) * (Math.sqrt(1 + 8 * Fr1 * Fr1) - 1);
  const V2 = (y1 * V1) / y2;
  const Fr2 = V2 / Math.sqrt(g * y2);

  const E1 = y1 + V1 * V1 / (2 * g);
  const E2 = y2 + V2 * V2 / (2 * g);
  const dE = E1 - E2;
  const efficiency = (E2 / E1) * 100;
  const Lj = 6 * y2;

  const flowRate = width ? V1 * y1 * width : undefined;
  const q = width ? V1 * y1 : V1 * y1;  // unit discharge m²/s
  const powerDissipated = width ? 1000 * g * q * dE : undefined;

  let jumpType: string;
  if (Fr1 < 1)         jumpType = "No jump (subcritical — Fr₁ < 1)";
  else if (Fr1 < 1.7)  jumpType = "Undular jump (Fr₁ = 1.0–1.7): slight surface ripples, ~0% energy loss";
  else if (Fr1 < 2.5)  jumpType = "Weak jump (Fr₁ = 1.7–2.5): smooth, ~5–15% energy loss";
  else if (Fr1 < 4.5)  jumpType = "Oscillating jump (Fr₁ = 2.5–4.5): unsteady, avoid in stilling basin design";
  else if (Fr1 < 9.0)  jumpType = "Steady jump (Fr₁ = 4.5–9.0): best for stilling basins, 45–70% energy loss";
  else                 jumpType = "Strong jump (Fr₁ > 9.0): very rough, >70% energy loss";

  return {
    upstreamFroude: Fr1, downstreamDepth: y2, downstreamVelocity: V2,
    downstreamFroude: Fr2, upstreamEnergy: E1, downstreamEnergy: E2,
    energyLoss: dE, energyEfficiency: efficiency, jumpLength: Lj,
    depthRatio: y2 / y1, flowRate, powerDissipated,
    jumpType, isValidJump,
    interpretation: `Fr₁ = ${Fr1.toFixed(3)} → ${jumpType.split(":")[0]}. Sequent depth = ${y2.toFixed(4)} m (ratio ${(y2/y1).toFixed(2)}×), energy loss = ${dE.toFixed(4)} m (${(100-efficiency).toFixed(1)}% dissipated).`,
  };
}

export function generateHydraulicJumpSteps(input: HydraulicJumpInput, result: HydraulicJumpResult): Step[] {
  const { upstreamDepth: y1, upstreamVelocity: V1, gravity: g = 9.81 } = input;
  const { upstreamFroude: Fr1, downstreamDepth: y2, downstreamVelocity: V2,
          downstreamFroude: Fr2, upstreamEnergy: E1, downstreamEnergy: E2, energyLoss: dE } = result;
  return [
    { description: "Upstream Froude number",
      formula: "Fr_1 = V_1 / √(g × y_1)",
      calculation: `Fr_1 = ${V1.toFixed(4)} / √(${g} × ${y1.toFixed(4)}) = ${Fr1.toFixed(5)}` },
    { description: "Sequent depth — Belanger equation",
      formula: "y_2 = (y_1/2) × (√(1 + 8 Fr_1^{2}) - 1)",
      calculation: `y_2 = (${y1.toFixed(4)}/2) × (√(1 + 8 × ${Fr1.toFixed(4)}^{2}) - 1) = ${y2.toFixed(5)} m`,
      result: `${y2.toFixed(5)}`, unit: "m" },
    { description: "Downstream velocity from continuity  y₁V₁ = y₂V₂",
      formula: "V_2 = y_1 × V_1 / y_2",
      calculation: `V_2 = ${y1.toFixed(4)} × ${V1.toFixed(4)} / ${y2.toFixed(4)} = ${V2.toFixed(5)} m/s`,
      result: `${V2.toFixed(5)}`, unit: "m/s" },
    { description: "Downstream Froude number",
      formula: "Fr_2 = V_2 / √(g × y_2)",
      calculation: `Fr_2 = ${V2.toFixed(4)} / √(${g} × ${y2.toFixed(4)}) = ${Fr2.toFixed(5)}` },
    { description: "Upstream specific energy",
      formula: "E_1 = y_1 + V_1^{2} / (2g)",
      calculation: `E_1 = ${y1.toFixed(4)} + ${V1.toFixed(4)}^{2} / (2 × ${g}) = ${E1.toFixed(5)} m` },
    { description: "Downstream specific energy",
      formula: "E_2 = y_2 + V_2^{2} / (2g)",
      calculation: `E_2 = ${y2.toFixed(4)} + ${V2.toFixed(4)}^{2} / (2 × ${g}) = ${E2.toFixed(5)} m` },
    { description: "Energy loss across the hydraulic jump",
      formula: "ΔE = E_1 - E_2",
      calculation: `ΔE = ${E1.toFixed(5)} - ${E2.toFixed(5)} = ${dE.toFixed(5)} m`,
      result: `${dE.toFixed(5)}`, unit: "m" },
  ];
}

// ============================================================================
// Weir Flow
// ============================================================================

export type WeirType = "rectangular" | "vnotch" | "broad_crested";
export type WeirMode = "findQ" | "findH";

export interface WeirFlowInput {
  weirType?: WeirType;          // default "rectangular"
  mode?: WeirMode;              // default "findQ"
  weirLength?: number;          // m  L (rectangular / broad-crested)
  head?: number;                // m  H (head over crest; for findQ)
  flowRate?: number;            // m³/s  Q (for findH)
  cd?: number;                  // discharge coefficient
  notchAngle?: number;          // degrees  θ (V-notch only, default 90)
  approachVelocity?: number;    // m/s  Va (optional — corrects H)
  gravity?: number;             // m/s²
}

export interface WeirFlowResult {
  flowRate: number;             // m³/s
  head: number;                 // m
  effectiveHead: number;        // m  H + Va²/(2g) if approach given
  velocityHead: number;         // m  Va²/(2g)
  unitDischarge?: number;       // m²/s  q = Q/L (rectangular/broad)
  interpretation: string;
}

export function calculateWeirFlow(input: WeirFlowInput): WeirFlowResult {
  const { weirType = "rectangular", mode = "findQ",
          notchAngle = 90, approachVelocity = 0, gravity: g = 9.81 } = input;

  const Va = approachVelocity;
  const vaHead = Va * Va / (2 * g);
  const Cd = input.cd ?? (weirType === "rectangular" ? 0.62 : weirType === "vnotch" ? 0.61 : 0.848);

  // Weir formula constants
  const k23 = (2 / 3) * Cd * Math.sqrt(2 * g);       // rectangular / broad-crested base
  const tTheta = Math.tan((notchAngle * Math.PI / 180) / 2);
  const k815 = (8 / 15) * Cd * tTheta * Math.sqrt(2 * g); // V-notch base
  const kBC = Cd * Math.pow(2 / 3, 1.5) * Math.sqrt(g); // broad-crested: Q = Cd*√g*(2/3)^1.5 * L * H^1.5

  const L = input.weirLength ?? 1;

  let H: number, Q: number;
  if (mode === "findQ") {
    if (input.head === undefined || input.head <= 0)
      throw new Error("Head H is required for Find Q mode");
    H = input.head;
    const Heff = H + vaHead;
    if (weirType === "rectangular")   Q = k23 * L * Math.pow(Heff, 1.5);
    else if (weirType === "vnotch")   Q = k815 * Math.pow(Heff, 2.5);
    else                              Q = kBC * L * Math.pow(Heff, 1.5);
  } else {
    if (input.flowRate === undefined || input.flowRate <= 0)
      throw new Error("Flow rate Q is required for Find H mode");
    Q = input.flowRate;
    let Heff: number;
    if (weirType === "rectangular")   Heff = Math.pow(Q / (k23 * L), 2 / 3);
    else if (weirType === "vnotch")   Heff = Math.pow(Q / k815, 2 / 5);
    else                              Heff = Math.pow(Q / (kBC * L), 2 / 3);
    H = Math.max(0, Heff - vaHead);  // subtract approach head back out
  }

  const Heff = H + vaHead;
  const unitDischarge = (weirType !== "vnotch" && L > 0) ? Q / L : undefined;

  return {
    flowRate: Q, head: H, effectiveHead: Heff, velocityHead: vaHead,
    unitDischarge,
    interpretation: `Q = ${Q.toFixed(4)} m³/s, H = ${H.toFixed(4)} m${vaHead > 0.0001 ? `, approach head = ${vaHead.toFixed(5)} m` : ""}.`,
  };
}

export function generateWeirFlowSteps(input: WeirFlowInput, result: WeirFlowResult): Step[] {
  const { weirType = "rectangular", mode = "findQ",
          notchAngle = 90, gravity: g = 9.81 } = input;
  const L = input.weirLength ?? 1;
  const Cd = input.cd ?? (weirType === "rectangular" ? 0.62 : weirType === "vnotch" ? 0.61 : 0.848);
  const tTheta = Math.tan((notchAngle * Math.PI / 180) / 2);
  const { flowRate: Q, head: H, effectiveHead: Heff, velocityHead: vaHead } = result;

  const steps: Step[] = [];

  if (vaHead > 0.0001) {
    steps.push({
      description: "Approach velocity head correction",
      formula: "H_{eff} = H + V_a^{2} / (2g)",
      calculation: `H_{eff} = ${H.toFixed(4)} + ${vaHead.toFixed(5)} = ${Heff.toFixed(5)} m`,
    });
  }

  if (weirType === "rectangular") {
    const formula = mode === "findQ"
      ? "Q = (2/3) × C_d × L × √(2g) × H^{3/2}"
      : "H = (Q / ((2/3) × C_d × L × √(2g)))^{2/3}";
    steps.push(
      { description: `Rectangular sharp-crested weir — ${mode === "findQ" ? "solve for Q" : "solve for H"}`,
        formula },
      mode === "findQ"
        ? { description: "Substitute values",
            calculation: `Q = (2/3) × ${Cd} × ${L.toFixed(4)} × √(2 × ${g}) × ${Heff.toFixed(4)}^{3/2} = ${Q.toFixed(5)} m³/s`,
            result: `${Q.toFixed(5)}`, unit: "m³/s" }
        : { description: "Substitute values",
            calculation: `H = (${Q.toFixed(4)} / ((2/3) × ${Cd} × ${L.toFixed(4)} × √(2 × ${g})))^{2/3} = ${H.toFixed(5)} m`,
            result: `${H.toFixed(5)}`, unit: "m" }
    );
  } else if (weirType === "vnotch") {
    const formula = mode === "findQ"
      ? "Q = (8/15) × C_d × tan(θ/2) × √(2g) × H^{5/2}"
      : "H = (Q / ((8/15) × C_d × tan(θ/2) × √(2g)))^{2/5}";
    steps.push(
      { description: `V-notch weir (${notchAngle}° notch) — ${mode === "findQ" ? "solve for Q" : "solve for H"}`,
        formula },
      { description: `tan(θ/2) = tan(${notchAngle/2}°)`,
        calculation: `tan(${notchAngle/2}°) = ${tTheta.toFixed(5)}` },
      mode === "findQ"
        ? { description: "Substitute values",
            calculation: `Q = (8/15) × ${Cd} × ${tTheta.toFixed(4)} × √(2 × ${g}) × ${Heff.toFixed(4)}^{5/2} = ${Q.toFixed(5)} m³/s`,
            result: `${Q.toFixed(5)}`, unit: "m³/s" }
        : { description: "Substitute values",
            calculation: `H = (${Q.toFixed(4)} / ((8/15) × ${Cd} × ${tTheta.toFixed(4)} × √(2 × ${g})))^{2/5} = ${H.toFixed(5)} m`,
            result: `${H.toFixed(5)}`, unit: "m" }
    );
  } else {
    const Kbc = Cd * Math.pow(2/3, 1.5) * Math.sqrt(g);
    steps.push(
      { description: `Broad-crested weir — ${mode === "findQ" ? "solve for Q" : "solve for H"}`,
        formula: mode === "findQ" ? "Q = C_d × L × √g × (2H/3)^{3/2}" : "H = (Q / (C_d × 1.705 × L))^{2/3}" },
      mode === "findQ"
        ? { description: "Substitute values",
            calculation: `Q = ${Kbc.toFixed(4)} × ${L.toFixed(4)} × ${Heff.toFixed(4)}^{3/2} = ${Q.toFixed(5)} m³/s`,
            result: `${Q.toFixed(5)}`, unit: "m³/s" }
        : { description: "Substitute values",
            calculation: `H = (${Q.toFixed(4)} / (${Kbc.toFixed(4)} × ${L.toFixed(4)}))^{2/3} = ${H.toFixed(5)} m`,
            result: `${H.toFixed(5)}`, unit: "m" }
    );
  }

  return steps;
}

// ============================================================================
// Specific Energy
// ============================================================================

export interface SpecificEnergyInput {
  depth: number;           // m  y
  velocity?: number;       // m/s  V  (provide V or unitDischarge)
  unitDischarge?: number;  // m²/s  q = Q/b  (provide V or unitDischarge)
  gravity?: number;        // m/s²
}

export interface SpecificEnergyResult {
  specificEnergy: number;  // m  E = y + V²/(2g)
  velocityHead: number;    // m  V²/(2g)
  velocity: number;        // m/s  V
  unitDischarge: number;   // m²/s  q
  froudeNumber: number;    // Fr = V/√(gy)
  criticalDepth: number;   // m  y_c = (q²/g)^(1/3)
  criticalEnergy: number;  // m  E_c = 1.5 × y_c
  alternateDepth: number;  // m  other depth on same E  (NaN if E < E_c)
  flowRegime: string;
  interpretation: string;
}

export function calculateSpecificEnergy(input: SpecificEnergyInput): SpecificEnergyResult {
  const { depth: y, gravity: g = 9.81 } = input;
  if (y <= 0) throw new Error("Depth must be positive");

  // Resolve velocity / unit discharge
  let V: number, q: number;
  if (input.velocity !== undefined) {
    V = input.velocity;
    q = V * y;
  } else if (input.unitDischarge !== undefined) {
    q = input.unitDischarge;
    V = q / y;
  } else {
    throw new Error("Either velocity V or unit discharge q is required");
  }
  if (q < 0) throw new Error("Unit discharge must be non-negative");

  const velHead = V * V / (2 * g);
  const E       = y + velHead;
  const Fr      = V / Math.sqrt(g * y);

  // Critical depth and energy (rectangular channel)
  const yc = Math.pow(q * q / g, 1 / 3);
  const Ec = 1.5 * yc;

  // Alternate depth — numerically find y' ≠ y such that y' + q²/(2g·y'²) = E
  let yAlt = NaN;
  if (E > Ec + 1e-9) {
    // Bisect on the OTHER branch from current depth
    const Efn = (yy: number) => yy + (q * q) / (2 * g * yy * yy) - E;
    if (y > yc) {
      // current is subcritical → alternate is supercritical (y' < y_c)
      let lo = 1e-6, hi = yc;
      if (Efn(lo) * Efn(hi) <= 0) {
        for (let i = 0; i < 80; i++) {
          const mid = (lo + hi) / 2;
          if (Efn(mid) * Efn(lo) <= 0) hi = mid; else lo = mid;
        }
        yAlt = (lo + hi) / 2;
      }
    } else {
      // current is supercritical → alternate is subcritical (y' > y_c)
      let lo = yc, hi = E;  // upper bound: at most E (when V→0)
      if (Efn(lo) * Efn(hi) <= 0) {
        for (let i = 0; i < 80; i++) {
          const mid = (lo + hi) / 2;
          if (Efn(mid) * Efn(lo) <= 0) hi = mid; else lo = mid;
        }
        yAlt = (lo + hi) / 2;
      }
    }
  }

  const flowRegime = Fr < 0.99 ? "subcritical (Fr < 1)" : Fr > 1.01 ? "supercritical (Fr > 1)" : "critical (Fr = 1)";
  const altStr = isNaN(yAlt) ? "" : `, alternate depth = ${yAlt.toFixed(4)} m`;

  return {
    specificEnergy: E, velocityHead: velHead, velocity: V, unitDischarge: q,
    froudeNumber: Fr, criticalDepth: yc, criticalEnergy: Ec,
    alternateDepth: yAlt, flowRegime,
    interpretation: `E = ${E.toFixed(4)} m, Fr = ${Fr.toFixed(4)} — ${flowRegime}. Critical depth = ${yc.toFixed(4)} m, minimum energy = ${Ec.toFixed(4)} m${altStr}.`,
  };
}

export function generateSpecificEnergySteps(input: SpecificEnergyInput, result: SpecificEnergyResult): Step[] {
  const { depth: y, gravity: g = 9.81 } = input;
  const { specificEnergy: E, velocityHead, velocity: V, unitDischarge: q,
          froudeNumber: Fr, criticalDepth: yc, criticalEnergy: Ec, alternateDepth: yAlt } = result;
  const steps: Step[] = [
    { description: "Velocity head",
      formula: "V^{2} / (2g)",
      calculation: `${V.toFixed(4)}^{2} / (2 × ${g}) = ${velocityHead.toFixed(5)} m` },
    { description: "Specific energy",
      formula: "E = y + V^{2} / (2g)",
      calculation: `E = ${y.toFixed(4)} + ${velocityHead.toFixed(5)} = ${E.toFixed(5)} m`,
      result: `${E.toFixed(5)}`, unit: "m" },
    { description: "Froude number",
      formula: "Fr = V / √(g × y)",
      calculation: `Fr = ${V.toFixed(4)} / √(${g} × ${y.toFixed(4)}) = ${Fr.toFixed(5)}` },
    { description: "Unit discharge  q = V × y",
      formula: "q = V × y",
      calculation: `q = ${V.toFixed(4)} × ${y.toFixed(4)} = ${q.toFixed(5)} m²/s` },
    { description: "Critical depth for rectangular channel",
      formula: "y_c = (q^{2}/g)^{1/3}",
      calculation: `y_c = (${q.toFixed(4)}^{2} / ${g})^{1/3} = ${yc.toFixed(5)} m` },
    { description: "Minimum specific energy at critical depth",
      formula: "E_c = (3/2) × y_c",
      calculation: `E_c = 1.5 × ${yc.toFixed(4)} = ${Ec.toFixed(5)} m` },
  ];
  if (!isNaN(yAlt)) {
    steps.push({
      description: "Alternate depth — numerically from E(y') = E",
      formula: "y' + q^{2} / (2g y'^{2}) = E",
      calculation: `\\text{Alternate depth} = ${yAlt.toFixed(5)} \\text{ m} \\;(\\text{${y > yc ? "supercritical branch" : "subcritical branch"}})`,
      result: `${yAlt.toFixed(5)}`, unit: "m",
    });
  }
  return steps;
}

// ============================================================================
// Hydraulic Radius
// ============================================================================

export type HydraulicRadiusShape = "manual" | "rectangular" | "trapezoidal" | "circular_full" | "circular_partial";

export interface HydraulicRadiusInput {
  shape: HydraulicRadiusShape;
  // manual
  area?: number;            // m²
  wettedPerimeter?: number; // m
  topWidth?: number;        // m  T (for hydraulic depth, manual only)
  // rectangular / trapezoidal
  bottomWidth?: number;     // m  b
  depth?: number;           // m  y (flow depth)
  sideSlope?: number;       // z  H:V (trapezoidal)
  // circular
  diameter?: number;        // m  D
  fillDepth?: number;       // m  y (partial fill; = D for full)
}

export interface HydraulicRadiusResult {
  hydraulicRadius: number;  // m  R_h = A/P
  hydraulicDiameter: number;// m  D_h = 4A/P = 4R_h
  hydraulicDepth: number;   // m  D = A/T  (NaN if T unknown)
  area: number;             // m²
  wettedPerimeter: number;  // m
  topWidth: number;         // m  T  (NaN if unknown)
  fillRatio?: number;       // y/D  (circular partial only)
  interpretation: string;
}

export function calculateHydraulicRadius(input: HydraulicRadiusInput): HydraulicRadiusResult {
  const { shape } = input;
  let A: number, P: number, T: number;

  if (shape === "manual") {
    A = input.area!;
    P = input.wettedPerimeter!;
    T = input.topWidth ?? NaN;
    if (!A || !P || A <= 0 || P <= 0) throw new Error("Area and wetted perimeter must be positive");

  } else if (shape === "rectangular") {
    const b = input.bottomWidth!, y = input.depth!;
    if (!b || !y || b <= 0 || y <= 0) throw new Error("Bottom width and depth must be positive");
    A = b * y; P = b + 2 * y; T = b;

  } else if (shape === "trapezoidal") {
    const b = input.bottomWidth!, y = input.depth!, z = input.sideSlope ?? 0;
    if (!b || !y || b <= 0 || y <= 0) throw new Error("Bottom width and depth must be positive");
    if (z < 0) throw new Error("Side slope must be ≥ 0");
    A = (b + z * y) * y;
    P = b + 2 * y * Math.sqrt(1 + z * z);
    T = b + 2 * z * y;

  } else if (shape === "circular_full") {
    const D = input.diameter!;
    if (!D || D <= 0) throw new Error("Diameter must be positive");
    A = Math.PI * D * D / 4;
    P = Math.PI * D;
    T = 0;  // at full, top width is 0 (closed top); set hydraulic depth to D/4 special case

  } else {
    // circular partial
    const D = input.diameter!, y = input.fillDepth!;
    if (!D || D <= 0) throw new Error("Diameter must be positive");
    if (!y || y <= 0 || y > D) throw new Error("Fill depth must be between 0 and D");
    const theta = 2 * Math.acos(1 - 2 * y / D);
    A = (D * D / 8) * (theta - Math.sin(theta));
    P = D * theta / 2;
    T = D * Math.sin(theta / 2);
  }

  const Rh = A / P;
  const Dh = 4 * Rh;
  const D_hyd = isNaN(T) || T <= 0 ? NaN : A / T;
  const fillRatio = (shape === "circular_partial" && input.diameter) ? (input.fillDepth! / input.diameter) : undefined;

  return {
    hydraulicRadius: Rh, hydraulicDiameter: Dh,
    hydraulicDepth: D_hyd, area: A, wettedPerimeter: P, topWidth: T,
    fillRatio,
    interpretation: `Rh = ${Rh.toFixed(5)} m, Dh = ${Dh.toFixed(5)} m, A = ${A.toFixed(5)} m², P = ${P.toFixed(5)} m.`,
  };
}

export function generateHydraulicRadiusSteps(input: HydraulicRadiusInput, result: HydraulicRadiusResult): Step[] {
  const { shape } = input;
  const { hydraulicRadius: Rh, hydraulicDiameter: Dh, area: A, wettedPerimeter: P, topWidth: T, hydraulicDepth: Dhyd } = result;
  const steps: Step[] = [];

  if (shape === "rectangular") {
    const b = input.bottomWidth!, y = input.depth!;
    steps.push(
      { description: "Rectangular channel area", formula: "A = b × y",
        calculation: `A = ${b.toFixed(4)} × ${y.toFixed(4)} = ${A.toFixed(5)} m²` },
      { description: "Wetted perimeter", formula: "P = b + 2y",
        calculation: `P = ${b.toFixed(4)} + 2 × ${y.toFixed(4)} = ${P.toFixed(5)} m` }
    );
  } else if (shape === "trapezoidal") {
    const b = input.bottomWidth!, y = input.depth!, z = input.sideSlope ?? 0;
    steps.push(
      { description: "Trapezoidal channel area", formula: "A = (b + z × y) × y",
        calculation: `A = (${b.toFixed(4)} + ${z} × ${y.toFixed(4)}) × ${y.toFixed(4)} = ${A.toFixed(5)} m²` },
      { description: "Wetted perimeter", formula: "P = b + 2y × √(1 + z^{2})",
        calculation: `P = ${b.toFixed(4)} + 2 × ${y.toFixed(4)} × √(1 + ${z}^{2}) = ${P.toFixed(5)} m` }
    );
  } else if (shape === "circular_full") {
    const D = input.diameter!;
    steps.push(
      { description: "Full circular pipe area", formula: "A = π × D² / 4",
        calculation: `A = π × ${D.toFixed(4)}² / 4 = ${A.toFixed(5)} m²` },
      { description: "Wetted perimeter (full circumference)", formula: "P = π × D",
        calculation: `P = π × ${D.toFixed(4)} = ${P.toFixed(5)} m` }
    );
  } else if (shape === "circular_partial") {
    const D = input.diameter!, y = input.fillDepth!;
    const theta = 2 * Math.acos(1 - 2 * y / D);
    steps.push(
      { description: "Central angle from fill depth",
        formula: "θ = 2 × arccos(1 − 2y/D)",
        calculation: `θ = 2 × arccos(1 − 2 × ${y.toFixed(4)} / ${D.toFixed(4)}) = ${(theta * 180 / Math.PI).toFixed(3)}° = ${theta.toFixed(5)} rad` },
      { description: "Partial-fill area", formula: "A = (D²/8)(θ − sin θ)",
        calculation: `A = (${D.toFixed(4)}²/8)(${theta.toFixed(5)} − sin(${theta.toFixed(5)})) = ${A.toFixed(5)} m²` },
      { description: "Arc length wetted perimeter", formula: "P = D × θ / 2",
        calculation: `P = ${D.toFixed(4)} × ${theta.toFixed(5)} / 2 = ${P.toFixed(5)} m` }
    );
  }

  steps.push(
    { description: "Hydraulic radius", formula: "R_h = A / P",
      calculation: `R_h = ${A.toFixed(5)} / ${P.toFixed(5)} = ${Rh.toFixed(6)} m`,
      result: `${Rh.toFixed(6)}`, unit: "m" },
    { description: "Hydraulic diameter", formula: "D_h = 4 × R_h",
      calculation: `D_h = 4 × ${Rh.toFixed(6)} = ${Dh.toFixed(6)} m`,
      result: `${Dh.toFixed(6)}`, unit: "m" }
  );

  if (!isNaN(T) && T > 0 && !isNaN(Dhyd)) {
    steps.push({
      description: "Hydraulic depth  D = A / T",
      formula: "D = A / T",
      calculation: `D = ${A.toFixed(5)} / ${T.toFixed(5)} = ${Dhyd.toFixed(6)} m`,
    });
  }

  return steps;
}

// ============================================================================
// Expanded Common Assumptions
// ============================================================================

export const commonAssumptions = {
  reynolds: [
    "Steady flow (no time dependence)",
    "Incompressible fluid (constant density)",
    "1D flow along the pipe axis",
    "Constant fluid properties (density and viscosity)",
    "Circular pipe with uniform cross-section",
  ],
  reynoldsExternal: [
    "Incompressible flow (Mach < 0.3)",
    "Steady, uniform free-stream conditions",
    "Newtonian fluid with constant density and viscosity",
    "Sharp leading edge for flat-plate geometry",
    "Transition thresholds are approximate and shift with free-stream turbulence, surface roughness, and pressure gradient",
  ],
  continuity: [
    "Incompressible flow (constant density)",
    "Steady flow",
    "One-dimensional flow",
    "No sources or sinks in the control volume",
  ],
  flowWork: [
    "Steady flow",
    "Uniform pressure across the cross-section",
    "Incompressible fluid (constant density and specific volume)",
  ],
  bernoulli: [
    "Steady flow",
    "Incompressible fluid",
    "Inviscid flow (no friction)",
    "Flow along a streamline",
    "No work or heat transfer",
  ],
  hydrostatic: [
    "Static fluid (no motion)",
    "Constant density",
    "Gravity is the only body force",
    "No shear stresses",
  ],
  idealGasDensity: [
    "Ideal gas behaviour — valid for low pressure and high temperature; breaks down near critical point",
    "Absolute pressure and absolute temperature (Kelvin)",
    "Single-component gas with constant specific gas constant R",
  ],
  specificGravity: [
    "Reference fluid at standard conditions (water at 4°C or 15°C for liquids; air at 20°C, 1 atm for gases)",
    "Homogeneous substance with uniform density",
  ],
  metacentricHeight: [
    "Small-angle stability only (GM valid for heel angles < ~10–15°)",
    "Rigid hull — no liquid free surfaces in tanks (free-surface effect reduces effective GM)",
    "Uniform water density",
    "Static conditions — dynamic rolling effects not included",
  ],
  bulkModulus: [
    "Isothermal process — use isentropic K_s = γ K_T for acoustic/fast processes",
    "Homogeneous, isotropic fluid",
    "Small pressure changes (linear response regime)",
  ],
  hydrostaticForce: [
    "Static, incompressible fluid with constant density",
    "Planar (flat) submerged surface — not valid for curved surfaces",
    "Atmospheric pressure acts equally on both faces (gauge pressures used)",
    "Gravity is constant and uniform",
    "The surface is fully submerged (no partial exposure to free surface)",
  ],
  pipeFlowRate: [
    "Steady flow",
    "Fully developed flow",
    "Uniform velocity profile (or use average velocity)",
    "Incompressible fluid",
  ],
  pipeHeadLoss: [
    "Steady flow",
    "Fully developed flow",
    "Constant pipe properties",
    "Incompressible fluid",
  ],
  pumpPower: [
    "Steady flow",
    "Incompressible fluid",
    "Constant efficiency",
    "No cavitation",
  ],
  dragSphere: [
    "Steady flow",
    "Constant fluid properties",
    "Sphere is rigid and smooth",
    "No wall effects",
  ],
  machNumber: [
    "Ideal gas",
    "Isentropic flow (for some applications)",
    "Constant specific heat ratio",
  ],
  froudeNumber: [
    "Open channel flow",
    "Constant gravity",
    "One-dimensional flow",
  ],
  weberNumber: [
    "Two-phase flow or free surface flow",
    "Constant surface tension",
    "Constant density",
  ],
  stokesLaw: [
    "Very low Reynolds number (Re < 1)",
    "Creeping flow",
    "Sphere is rigid",
    "No wall effects",
  ],
  orificeFlow: [
    "Steady flow",
    "Incompressible fluid",
    "Constant discharge coefficient",
    "Sharp-edged orifice",
  ],
  venturiFlow: [
    "Steady flow",
    "Incompressible fluid",
    "Constant discharge coefficient",
    "No energy losses",
  ],
  manometer: [
    "Static fluid",
    "Constant manometer fluid density",
    "No temperature effects",
  ],
  buoyancy: [
    "Static fluid",
    "Constant fluid density",
    "Uniform gravitational field",
  ],
  surfaceTension: [
    "Constant surface tension",
    "Equilibrium conditions",
    "Constant temperature",
  ],
  capillaryRise: [
    "Equilibrium conditions",
    "Constant surface tension",
    "Small diameter tube",
    "Wetting fluid",
  ],
  poiseuilleFlow: [
    "Laminar flow (Re < 2300)",
    "Steady flow",
    "Fully developed flow",
    "Circular pipe",
    "No-slip boundary condition",
  ],
  frictionFactor: [
    "Steady flow",
    "Fully developed flow",
    "Constant pipe roughness",
    "Incompressible fluid",
  ],
  minorLosses: [
    "Steady flow",
    "Incompressible fluid",
    "Constant loss coefficient",
    "Fully turbulent flow",
  ],
  torricelli: [
    "Steady flow",
    "Incompressible fluid",
    "No friction losses",
    "Small orifice",
  ],
  pitotTube: [
    "Steady flow",
    "Incompressible fluid",
    "Stagnation point",
    "No wall effects",
  ],
  nozzleFlow: [
    "Steady flow",
    "Incompressible fluid",
    "Adiabatic flow",
    "No friction",
  ],
  diffuserFlow: [
    "Steady flow",
    "Incompressible fluid",
    "Gradual expansion",
    "No separation",
  ],
  flatPlateDrag: [
    "Steady flow",
    "Constant fluid properties",
    "Flat plate parallel to flow",
    "No wall effects",
  ],
  liftForce: [
    "Steady flow",
    "Constant fluid properties",
    "Two-dimensional flow",
    "No stall",
  ],
  boundaryLayer: [
    "Steady flow",
    "Laminar or turbulent boundary layer",
    "Constant fluid properties",
    "Flat surface",
  ],
  velocityHead: [
    "Steady flow",
    "Incompressible fluid",
    "Uniform velocity",
  ],
  massFlowRate: [
    "Steady flow",
    "Constant density",
    "One-dimensional flow",
  ],
  momentumFlux: [
    "Steady flow",
    "Incompressible fluid",
    "Uniform velocity profile",
  ],
  controlVolumeForce: [
    "Steady flow",
    "Incompressible fluid",
    "Control volume analysis",
  ],
  vortexFlow: [
    "Steady flow",
    "Rotational flow",
    "Axisymmetric",
  ],
  swirlNumber: [
    "Steady flow",
    "Swirling flow",
    "Constant properties",
  ],
  flowCoefficient: [
    "Steady flow",
    "Incompressible fluid",
    "Constant geometry",
  ],
  dischargeCd: [
    "Steady, fully developed flow",
    "Incompressible fluid",
    "Constant meter geometry and roughness",
    "Pressure taps at standard locations",
  ],
  nonCircularDuct: [
    "Steady flow",
    "Fully developed flow",
    "Constant cross-section",
    "Incompressible fluid",
  ],
  pressureRecovery: [
    "Steady flow",
    "Incompressible fluid",
    "Gradual expansion",
  ],
  cavitationNumber: [
    "Steady flow",
    "Constant temperature",
    "Vapor pressure known",
  ],
  eulerNumber: [
    "Steady flow",
    "Incompressible fluid",
    "Pressure-driven flow",
  ],
  strouhalNumber: [
    "Unsteady flow",
    "Periodic motion",
    "Characteristic frequency",
  ],
  nusseltNumber: [
    "Forced convection",
    "Constant properties",
    "Steady state",
  ],
  prandtlNumber: [
    "Constant fluid properties",
    "Steady state",
  ],
  grashofNumber: [
    "Natural convection",
    "Constant properties",
    "Boussinesq approximation",
  ],
  rayleighNumber: [
    "Natural convection",
    "Constant properties",
    "Boussinesq approximation",
  ],
  pecletNumber: [
    "Convective-diffusive transport",
    "Constant properties",
    "Steady state",
  ],
  schmidtNumber: [
    "Dilute species (solute concentration does not significantly alter fluid properties)",
    "Constant properties",
    "Steady state",
  ],
  sherwoodNumber: [
    "Dilute species (solute concentration does not affect bulk fluid properties)",
    "Constant properties",
    "Steady state",
  ],
  lewisNumber: [
    "Dilute species (solute does not significantly alter bulk thermal properties)",
    "Constant fluid properties",
    "Steady state",
  ],
  staticPressure: [
    "Steady flow",
    "Incompressible fluid",
    "No compressibility effects",
  ],
  dynamicPressure: [
    "Steady flow",
    "Incompressible fluid",
    "Uniform velocity",
  ],
  totalPressure: [
    "Steady flow",
    "Incompressible fluid",
    "Stagnation conditions",
  ],
  energyLoss: [
    "Steady flow",
    "Incompressible fluid",
    "Constant properties",
  ],
  areaRatio: [
    "Steady flow",
    "Constant geometry",
    "Incompressible fluid",
  ],
  chezyEquation: [
    "Uniform, steady open-channel flow — Chezy V = C√(RS) applies only at normal depth",
    "Fully turbulent rough flow — C is assumed constant with depth and velocity",
    "Prismatic channel — constant cross-section and slope",
    "Single-phase water flow — no sediment transport or air entrainment",
  ],
  normalDepth: [
    "Uniform (normal) flow — constant depth, velocity, and cross-section along the channel",
    "Steady flow — no time-varying changes in depth or discharge",
    "Prismatic channel — constant shape and slope throughout",
    "Manning's n is constant and appropriate for the channel surface and condition",
  ],
  manningsEquation: [
    "Uniform flow (constant depth and velocity)",
    "Steady flow",
    "Wide channel or known hydraulic radius",
    "Constant Manning's n",
  ],
  criticalDepth: [
    "Rectangular channel",
    "Steady flow",
    "Constant width",
    "No energy losses",
  ],
  hydraulicJump: [
    "Rectangular channel",
    "Steady flow",
    "Horizontal channel",
    "No external forces",
  ],
  weirFlow: [
    "Sharp-crested weir",
    "Free discharge",
    "No submergence",
    "Constant discharge coefficient",
  ],
  specificEnergy: [
    "Steady flow",
    "Horizontal channel",
    "No energy losses",
    "Uniform velocity distribution",
  ],
  wettedPerimeter: [
    "Prismatic channel — constant cross-section along the flow direction",
    "Wetted perimeter includes only solid surfaces in contact with the fluid — the free surface is excluded",
    "No sediment, biofilm, or roughness elements that would alter the effective perimeter",
  ],
  hydraulicRadius: [
    "Prismatic channel — constant cross-section shape along the flow direction",
    "Wetted perimeter includes only surfaces in contact with the fluid, not the free surface",
    "Uniform geometry with no obstructions or transitions",
  ],
  speedOfSound: [
    "Ideal gas behavior",
    "Adiabatic process",
    "Uniform temperature",
  ],
  isentropicRelations: [
    "Ideal gas (constant γ)",
    "Isentropic (reversible adiabatic) process",
    "No heat transfer or friction",
  ],
  normalShock: [
    "Supersonic upstream flow (M1 > 1)",
    "Ideal gas",
    "Normal (perpendicular) shock wave",
    "Adiabatic flow",
  ],
  stagnationProperties: [
    "Ideal gas",
    "Adiabatic process to rest",
    "No work interactions",
  ],
  chokedFlow: [
    "Ideal gas",
    "Isentropic flow to throat",
    "Sonic conditions at throat (M=1)",
  ],
  areaMachRelation: [
    "Isentropic flow",
    "Ideal gas",
    "Quasi-one-dimensional flow",
  ],
  fannoFlow: [
    "Adiabatic pipe flow",
    "Ideal gas with constant γ",
    "Constant cross-sectional area",
    "Friction is the only irreversibility",
  ],
  rayleighFlow: [
    "Frictionless pipe flow",
    "Ideal gas with constant γ",
    "Constant cross-sectional area",
    "Heat transfer drives changes",
  ],
  obliqueShock: [
    "Supersonic upstream flow",
    "Attached shock (not detached bow shock)",
    "Ideal gas",
  ],
  prandtlMeyerExpansion: [
    "Isentropic expansion",
    "Ideal gas with constant γ",
    "2D flow turning",
  ],
  pumpHead: [
    "Steady flow",
    "No mechanical losses in impeller",
    "Euler turbomachine equation applies",
  ],
  npsh: [
    "Steady flow",
    "Liquid is incompressible",
    "Vapor pressure is for the pumped fluid",
  ],
  specificSpeed: [
    "Incompressible flow",
    "Geometrically similar pumps",
    "Best efficiency point (BEP) conditions",
  ],
  affinityLaws: [
    "Geometrically similar pumps",
    "Same fluid",
    "Negligible viscosity effects",
  ],
  hydraulicEfficiency: [
    "Steady operation",
    "All shaft power accounts for hydraulic losses",
  ],
  turbinePower: [
    "Steady flow",
    "Incompressible fluid",
    "Turbine efficiency is constant",
  ],
  fanLaws: [
    "Geometrically similar fans",
    "Same inlet conditions",
    "Incompressible flow",
  ],
  impellerTipSpeed: [
    "Rigid impeller (no blade bending)",
    "Constant rotational speed",
    "Point-mass tip (uniform radius)",
  ],
  suctionSpecificSpeed: [
    "Flow at best efficiency point (BEP)",
    "Incompressible liquid",
    "NPSHᵣ evaluated at the impeller inlet",
  ],
  seriesPipe: [
    "Steady incompressible flow",
    "Same flow rate through all pipes",
    "No intermediate inflows/outflows",
  ],
  parallelPipe: [
    "Steady incompressible flow",
    "Same head loss across parallel branches",
    "No minor losses (simplified)",
  ],
  waterHammer: [
    "Instantaneous valve closure",
    "Rigid pipe walls (simplified Joukowsky)",
    "No cavitation during transient",
  ],
  colebrookWhite: [
    "Fully turbulent or transitional turbulent flow",
    "Re > 4000",
    "Circular pipe",
  ],
  swameeJain: [
    "3000 < Re < 3×10⁸",
    "10⁻⁶ < ε/D < 10⁻²",
    "Explicit approximation (error < 3%)",
  ],
  hazenWilliams: [
    "Water at 16°C (60°F)",
    "Turbulent flow",
    "C is constant (does not vary with velocity)",
  ],
  pipeSizing: [
    "Steady incompressible flow",
    "Darcy-Weisbach with Swamee-Jain friction factor",
    "Single pipe segment",
  ],
  hydraulicGradient: [
    "Steady uniform flow",
    "Darcy-Weisbach head loss equation",
    "Constant pipe properties along length",
  ],
  lmtd: [
    "Steady-state heat exchanger operation",
    "Constant fluid properties",
    "No phase change (single-phase fluids)",
    "Negligible heat loss to surroundings",
  ],
  overallHtc: [
    "Steady-state conditions",
    "Constant fluid properties",
    "Fouling factors are uniform",
  ],
  dittusBoelter: [
    "Fully developed turbulent pipe flow (Re > 10 000)",
    "0.7 < Pr < 160  (wider range requires Gnielinski or modified correlations)",
    "L/D > 10 — entrance effects are neglected",
    "Smooth pipe wall — roughness increases f but Dittus-Boelter does not account for it",
  ],
  naturalConvectionPlate: [
    "Isothermal vertical plate in an extensive quiescent fluid",
    "Large plate — edge effects and leading-edge entrance effects are negligible",
    "Boussinesq approximation — density variation only in the buoyancy term",
    "Fluid properties evaluated at the film temperature T_film = (T_wall + T_ambient) / 2",
  ],
  effectivenessNtu: [
    "Steady-state operation with no heat loss to surroundings",
    "Constant fluid specific heats (Cp) — properties do not vary with temperature",
    "Uniform overall heat transfer coefficient U over the entire exchanger area",
    "Single-phase flow — no condensation or evaporation (phase change is handled by C* = 0)",
  ],
  foulingFactor: [
    "Uniform fouling layer over the entire heat transfer surface",
    "Steady-state fouling — deposit is fully developed and not growing",
    "Fouling modelled as a pure thermal resistance in series with other resistances",
    "Surface and fluid temperatures remain constant between clean and fouled conditions",
  ],
  finEfficiency: [
    "Uniform cross-section along the fin length — profile fins (triangular, parabolic) require separate charts",
    "Uniform and constant convection coefficient h over the entire fin surface",
    "No radiation heat transfer from the fin surface",
    "Tip condition: either adiabatic (insulated tip) or corrected length L_c = L + A_c/P accounts for tip convection",
  ],
  thermalResistance: [
    "Steady-state heat transfer — no time-varying temperature changes",
    "One-dimensional heat flow perpendicular to each layer (planar geometry)",
    "Constant thermal conductivity k and constant convection coefficient h",
    "Perfect thermal contact between layers — no contact resistance",
  ],
  culvertDesign: [
    "Full-flow (pressure flow) in the barrel — equations do not apply to partial-flow or open-channel culvert flow",
    "Manning's n is uniform along the barrel and appropriate for the pipe material and condition",
    "Headwater is measured from the culvert invert (inlet invert elevation = 0 datum)",
    "Tailwater does not submerge the inlet — inlet control equations are invalid when tailwater rises above the crown",
  ],
  trapezoidalChannel: [
    "Uniform flow (Manning's equation)",
    "Prismatic channel (constant cross-section)",
    "Steady flow",
  ],
  sedimentTransport: [
    "Non-cohesive, non-plastic sediment — cohesive (clay) beds require electrostatic / consolidation models not covered here",
    "Uniform (single-size) sediment — graded beds use d₅₀ as the representative diameter and θcr should be adjusted for hiding effects",
    "Steady, uniform flow — the depth-slope product τ₀ = ρgRₕS applies only to normal (uniform) flow",
    "Plane bed conditions — sheet flow or dune-covered beds alter the form drag and require a ripple/dune correction to τ",
  ],
  graduallyVariedFlow: [
    "Steady non-uniform flow",
    "Gradually varying water surface",
    "Hydrostatic pressure distribution",
  ],
  tidalPrism: [
    "Simplified tidal prism model",
    "Horizontal water surface at any instant",
    "No stratification effects",
  ],
  flowClassification: [
    "Open channel flow with a free surface",
    "Steady flow — depth and velocity do not change with time at a section",
    "Uniform velocity distribution (average cross-sectional velocity V = Q/A)",
    "Kinematic viscosity ν is constant at the specified temperature",
  ],
};

// ============================================================================
// COMPRESSIBLE FLOW
// ============================================================================

export interface SpeedOfSoundInput {
  gamma: number;       // specific heat ratio (dimensionless)
  R: number;           // specific gas constant (J/(kg·K))
  temperature: number; // K
}
export interface SpeedOfSoundResult {
  speedOfSound: number;      // m/s
  speedOfSoundFts: number;   // ft/s
  speedOfSoundKmh: number;   // km/h
  speedOfSoundKnots: number; // knots
  speedOfSoundMph: number;   // mph
  interpretation: string;
}
export function calculateSpeedOfSound(input: SpeedOfSoundInput): SpeedOfSoundResult {
  const { gamma, R, temperature } = input;
  const c = Math.sqrt(gamma * R * temperature);
  return {
    speedOfSound:      c,
    speedOfSoundFts:   c * 3.28084,
    speedOfSoundKmh:   c * 3.6,
    speedOfSoundKnots: c * 1.94384,
    speedOfSoundMph:   c * 2.23694,
    interpretation: `Speed of sound c = ${c.toFixed(2)} m/s at T = ${temperature.toFixed(2)} K.`,
  };
}
export function generateSpeedOfSoundSteps(input: SpeedOfSoundInput, result: SpeedOfSoundResult): Step[] {
  const gammaR    = input.gamma * input.R;
  const gammaRT   = gammaR * input.temperature;
  return [
    { description: "Speed of sound in an ideal gas", formula: "c = √(γ × R × T)" },
    { description: "Combined gas property γ × R", calculation: `γ × R = ${input.gamma} × ${input.R} = ${gammaR.toFixed(3)} J/(kg·K)`, result: `${gammaR.toFixed(3)}`, unit: "J/(kg·K)" },
    { description: "Argument of the square root γ × R × T", calculation: `γ × R × T = ${gammaR.toFixed(3)} × ${input.temperature.toFixed(2)} = ${gammaRT.toFixed(2)} m²/s²`, result: `${gammaRT.toFixed(2)}`, unit: "m²/s²" },
    { description: "Speed of sound c = √(γRT)", calculation: `c = √(${gammaRT.toFixed(2)}) = ${result.speedOfSound.toFixed(3)} m/s`, result: `${result.speedOfSound.toFixed(3)}`, unit: "m/s" },
  ];
}

export interface IsentropicRelationsInput {
  mach: number;
  gamma: number;
  totalTemperature?: number; // K (optional)
  totalPressure?: number;    // Pa (optional)
}
export interface IsentropicRelationsResult {
  temperatureRatio: number;   // T/T₀
  pressureRatio: number;      // P/P₀
  densityRatio: number;       // ρ/ρ₀
  areaRatio: number;          // A/A*  (1/M × ((2/(γ+1))(1+(γ-1)/2 M²))^((γ+1)/(2(γ-1))))
  criticalTempRatio: number;  // T*/T₀ = 2/(γ+1)
  criticalPresRatio: number;  // P*/P₀ = (2/(γ+1))^(γ/(γ-1))
  regime: string;             // "subsonic" | "sonic" | "supersonic" | "hypersonic"
  staticTemperature?: number; // K
  staticPressure?: number;    // Pa
  interpretation: string;
}
export function calculateIsentropicRelations(input: IsentropicRelationsInput): IsentropicRelationsResult {
  const { mach: M, gamma: g, totalTemperature, totalPressure } = input;
  const factor           = 1 + (g - 1) / 2 * M * M;
  const temperatureRatio = 1 / factor;
  const pressureRatio    = Math.pow(temperatureRatio, g / (g - 1));
  const densityRatio     = Math.pow(temperatureRatio, 1 / (g - 1));
  const areaRatio        = M > 0
    ? (1 / M) * Math.pow((2 / (g + 1)) * factor, (g + 1) / (2 * (g - 1)))
    : Infinity;
  const criticalTempRatio = 2 / (g + 1);
  const criticalPresRatio = Math.pow(2 / (g + 1), g / (g - 1));
  const staticTemperature = totalTemperature ? totalTemperature * temperatureRatio : undefined;
  const staticPressure    = totalPressure    ? totalPressure    * pressureRatio    : undefined;
  const regime = M === 0 ? "at rest"
    : M < 0.8  ? "subsonic"
    : M < 1.0  ? "high subsonic"
    : M === 1.0 ? "sonic"
    : M < 5.0  ? "supersonic"
    : "hypersonic";
  return {
    temperatureRatio, pressureRatio, densityRatio,
    areaRatio, criticalTempRatio, criticalPresRatio,
    regime, staticTemperature, staticPressure,
    interpretation: `M=${M} (${regime}): T/T₀=${temperatureRatio.toFixed(4)}, P/P₀=${pressureRatio.toFixed(4)}, ρ/ρ₀=${densityRatio.toFixed(4)}, A/A*=${isFinite(areaRatio) ? areaRatio.toFixed(4) : "∞"}.`,
  };
}
export function generateIsentropicRelationsSteps(input: IsentropicRelationsInput, result: IsentropicRelationsResult): Step[] {
  const { mach: M, gamma: g } = input;
  const factor    = 1 + (g - 1) / 2 * M * M;
  const gExp      = g / (g - 1);
  const rhoExp    = 1 / (g - 1);
  const aExp      = (g + 1) / (2 * (g - 1));
  return [
    { description: "Stagnation factor  1 + (γ−1)/2 × M²", formula: "f = 1 + (γ-1)/2 × M²", calculation: `f = 1 + (${g}-1)/2 × ${M}² = 1 + ${((g-1)/2).toFixed(4)} × ${(M*M).toFixed(4)} = ${factor.toFixed(5)}`, result: `${factor.toFixed(5)}`, unit: "dimensionless" },
    { description: "Temperature ratio  T/T₀ = 1/f", formula: "T/T₀ = 1 / f", calculation: `T/T₀ = 1 / ${factor.toFixed(5)} = ${result.temperatureRatio.toFixed(5)}`, result: `${result.temperatureRatio.toFixed(5)}`, unit: "dimensionless" },
    { description: "Pressure ratio  P/P₀ = (T/T₀)^(γ/(γ−1))", formula: "P/P₀ = (T/T₀)^(γ/(γ-1))", calculation: `P/P₀ = ${result.temperatureRatio.toFixed(5)}^(${gExp.toFixed(4)}) = ${result.pressureRatio.toFixed(5)}`, result: `${result.pressureRatio.toFixed(5)}`, unit: "dimensionless" },
    { description: "Density ratio  ρ/ρ₀ = (T/T₀)^(1/(γ−1))", formula: "ρ/ρ₀ = (T/T₀)^(1/(γ-1))", calculation: `ρ/ρ₀ = ${result.temperatureRatio.toFixed(5)}^(${rhoExp.toFixed(4)}) = ${result.densityRatio.toFixed(5)}`, result: `${result.densityRatio.toFixed(5)}`, unit: "dimensionless" },
    ...(M > 0 ? [{ description: "Area ratio  A/A* (isentropic nozzle throat)", formula: "A/A* = (1/M) × [(2/(γ+1)) × f]^((γ+1)/(2(γ-1)))", calculation: `A/A* = (1/${M}) × [${((2/(g+1))*factor).toFixed(5)}]^(${aExp.toFixed(4)}) = ${result.areaRatio.toFixed(5)}`, result: `${result.areaRatio.toFixed(5)}`, unit: "dimensionless" }] : []),
    ...(input.totalTemperature ? [{ description: "Static temperature  T = T₀ × (T/T₀)", calculation: `T = ${input.totalTemperature} × ${result.temperatureRatio.toFixed(5)} = ${result.staticTemperature!.toFixed(3)} K`, result: `${result.staticTemperature!.toFixed(3)}`, unit: "K" }] : []),
    ...(input.totalPressure ? [{ description: "Static pressure  P = P₀ × (P/P₀)", calculation: `P = ${input.totalPressure} × ${result.pressureRatio.toFixed(5)} = ${result.staticPressure!.toFixed(2)} Pa`, result: `${result.staticPressure!.toFixed(2)}`, unit: "Pa" }] : []),
  ];
}

export interface NormalShockInput {
  mach1: number;
  gamma: number;
  staticPressure1?: number;    // Pa — optional upstream static pressure
  staticTemperature1?: number; // K  — optional upstream static temperature
}
export interface NormalShockResult {
  mach2: number;
  pressureRatio: number;            // P₂/P₁
  temperatureRatio: number;         // T₂/T₁
  densityRatio: number;             // ρ₂/ρ₁
  velocityRatio: number;            // V₂/V₁ = ρ₁/ρ₂
  totalPressureRatio: number;       // P₀₂/P₀₁  (<1, measures irreversibility)
  pitotPressureRatio: number;       // P₀₂/P₁   (Rayleigh Pitot tube formula)
  normalizedEntropyChange: number;  // Δs/R = −ln(P₀₂/P₀₁)  (≥0)
  shockStrength: string;            // "very weak" | "weak" | "moderate" | "strong" | "very strong"
  staticPressure2?: number;         // Pa — if P₁ provided
  staticTemperature2?: number;      // K  — if T₁ provided
  interpretation: string;
}
export function calculateNormalShock(input: NormalShockInput): NormalShockResult {
  const { mach1: M1, gamma: g, staticPressure1, staticTemperature1 } = input;
  const M1sq              = M1 * M1;
  const mach2sq           = (M1sq + 2 / (g - 1)) / (2 * g / (g - 1) * M1sq - 1);
  const mach2             = Math.sqrt(mach2sq);
  const pressureRatio     = (2 * g * M1sq - (g - 1)) / (g + 1);
  const temperatureRatio  = pressureRatio * (2 + (g - 1) * M1sq) / ((g + 1) * M1sq);
  const densityRatio      = (g + 1) * M1sq / (2 + (g - 1) * M1sq);
  const velocityRatio     = 1 / densityRatio;             // continuity: ρ₁V₁ = ρ₂V₂
  const totalPressureRatio =
    Math.pow((g + 1) * M1sq / (2 + (g - 1) * M1sq), g / (g - 1)) *
    Math.pow((g + 1) / (2 * g * M1sq - (g - 1)), 1 / (g - 1));
  const isentropicFactor1 = Math.pow(1 + (g - 1) / 2 * M1sq, g / (g - 1));
  const pitotPressureRatio = totalPressureRatio * isentropicFactor1; // P₀₂/P₁
  const normalizedEntropyChange = -Math.log(totalPressureRatio);     // Δs/R ≥ 0
  const shockStrength =
    M1 <= 1.3  ? "very weak"
    : M1 <= 2.0 ? "weak"
    : M1 <= 3.0 ? "moderate"
    : M1 <= 4.5 ? "strong"
    : "very strong";
  const staticPressure2    = staticPressure1    ? staticPressure1    * pressureRatio    : undefined;
  const staticTemperature2 = staticTemperature1 ? staticTemperature1 * temperatureRatio : undefined;
  return {
    mach2, pressureRatio, temperatureRatio, densityRatio, velocityRatio,
    totalPressureRatio, pitotPressureRatio, normalizedEntropyChange,
    shockStrength, staticPressure2, staticTemperature2,
    interpretation: `M₁=${M1} → M₂=${mach2.toFixed(4)} (${shockStrength}). P₂/P₁=${pressureRatio.toFixed(3)}, T₂/T₁=${temperatureRatio.toFixed(3)}, P₀₂/P₀₁=${totalPressureRatio.toFixed(4)}.`,
  };
}
export function generateNormalShockSteps(input: NormalShockInput, result: NormalShockResult): Step[] {
  const { mach1: M1, gamma: g } = input;
  const M1sq = M1 * M1;
  const numM2 = M1sq + 2 / (g - 1);
  const denM2 = 2 * g / (g - 1) * M1sq - 1;
  return [
    { description: "Confirm supersonic upstream  (M₁ > 1 required)", formula: "M₁ > 1", calculation: `M₁ = ${M1}\\text{ — supersonic, normal shock exists}` },
    { description: "Downstream Mach number  M₂", formula: "M₂² = (M₁² + 2/(γ−1)) / (2γ/(γ−1) × M₁² − 1)", calculation: `M₂² = (${M1sq.toFixed(4)} + ${(2/(g-1)).toFixed(4)}) / (${denM2.toFixed(4)}) = ${(numM2/denM2).toFixed(5)} → M₂ = ${result.mach2.toFixed(5)}`, result: `${result.mach2.toFixed(5)}`, unit: "dimensionless" },
    { description: "Pressure ratio  P₂/P₁", formula: "P₂/P₁ = (2γM₁² − (γ−1)) / (γ+1)", calculation: `P₂/P₁ = (${(2*g*M1sq).toFixed(4)} − ${(g-1).toFixed(4)}) / ${(g+1).toFixed(4)} = ${result.pressureRatio.toFixed(5)}`, result: `${result.pressureRatio.toFixed(5)}`, unit: "dimensionless" },
    { description: "Temperature ratio  T₂/T₁", formula: "T₂/T₁ = (P₂/P₁) × (2 + (γ−1)M₁²) / ((γ+1)M₁²)", calculation: `T₂/T₁ = ${result.pressureRatio.toFixed(4)} × ${(2+(g-1)*M1sq).toFixed(4)} / ${((g+1)*M1sq).toFixed(4)} = ${result.temperatureRatio.toFixed(5)}`, result: `${result.temperatureRatio.toFixed(5)}`, unit: "dimensionless" },
    { description: "Density ratio  ρ₂/ρ₁  (= V₁/V₂ by continuity)", formula: "ρ₂/ρ₁ = (γ+1)M₁² / (2 + (γ−1)M₁²)", calculation: `ρ₂/ρ₁ = ${((g+1)*M1sq).toFixed(4)} / ${(2+(g-1)*M1sq).toFixed(4)} = ${result.densityRatio.toFixed(5)}`, result: `${result.densityRatio.toFixed(5)}`, unit: "dimensionless" },
    { description: "Total pressure ratio  P₀₂/P₀₁  (< 1 — entropy increases)", formula: "P_{02}/P_{01} = [ρ₂/ρ₁]^{γ/(γ−1)} × [(γ+1)/(2γM₁²−(γ−1))]^{1/(γ−1)}", calculation: `P_{02}/P_{01} = ${result.totalPressureRatio.toFixed(5)}  →  Δs/R = ${result.normalizedEntropyChange.toFixed(5)}`, result: `${result.totalPressureRatio.toFixed(5)}`, unit: "dimensionless" },
    ...(input.staticPressure1 ? [{ description: "Downstream static pressure  P₂ = P₁ × (P₂/P₁)", calculation: `P₂ = ${input.staticPressure1} × ${result.pressureRatio.toFixed(5)} = ${result.staticPressure2!.toFixed(2)} Pa`, result: `${result.staticPressure2!.toFixed(2)}`, unit: "Pa" }] : []),
    ...(input.staticTemperature1 ? [{ description: "Downstream static temperature  T₂ = T₁ × (T₂/T₁)", calculation: `T₂ = ${input.staticTemperature1} × ${result.temperatureRatio.toFixed(5)} = ${result.staticTemperature2!.toFixed(3)} K`, result: `${result.staticTemperature2!.toFixed(3)}`, unit: "K" }] : []),
  ];
}

export interface StagnationPropertiesInput {
  mach: number;
  gamma: number;
  staticTemperature: number; // K
  staticPressure: number;    // Pa
}
export interface StagnationPropertiesResult {
  totalTemperature: number;  // K
  totalPressure: number;     // Pa
  temperatureRatio: number;  // T₀/T = 1 + (γ-1)/2 M²
  pressureRatio: number;     // P₀/P = (T₀/T)^(γ/(γ-1))
  dynamicTempRise: number;   // T₀ - T  [K] — kinetic energy heating
  regime: string;            // "subsonic" | "transonic" | "supersonic" | "hypersonic"
  interpretation: string;
}
export function calculateStagnationProperties(input: StagnationPropertiesInput): StagnationPropertiesResult {
  const { mach: M, gamma: g, staticTemperature: T, staticPressure: P } = input;
  const factor           = 1 + (g - 1) / 2 * M * M;
  const temperatureRatio = factor;
  const pressureRatio    = Math.pow(factor, g / (g - 1));
  const totalTemperature = T * temperatureRatio;
  const totalPressure    = P * pressureRatio;
  const dynamicTempRise  = totalTemperature - T;
  const regime = M === 0 ? "at rest"
    : M < 0.8  ? "subsonic"
    : M < 1.2  ? "transonic"
    : M < 5.0  ? "supersonic"
    : "hypersonic";
  return {
    totalTemperature, totalPressure,
    temperatureRatio, pressureRatio, dynamicTempRise, regime,
    interpretation: `T₀=${totalTemperature.toFixed(2)} K, P₀=${(totalPressure / 1000).toFixed(3)} kPa. T₀/T=${temperatureRatio.toFixed(4)}, P₀/P=${pressureRatio.toFixed(4)}.`,
  };
}
export function generateStagnationPropertiesSteps(input: StagnationPropertiesInput, result: StagnationPropertiesResult): Step[] {
  const { mach: M, gamma: g, staticTemperature: T, staticPressure: P } = input;
  const factor  = result.temperatureRatio;
  const gExp    = g / (g - 1);
  return [
    { description: "Stagnation factor  f = 1 + (γ−1)/2 × M²", formula: "f = 1 + (γ-1)/2 × M²", calculation: `f = 1 + (${g}−1)/2 × ${M}² = 1 + ${((g-1)/2).toFixed(4)} × ${(M*M).toFixed(4)} = ${factor.toFixed(5)}`, result: `${factor.toFixed(5)}`, unit: "dimensionless" },
    { description: "Stagnation temperature  T₀ = T × f", formula: "T₀ = T × f", calculation: `T₀ = ${T.toFixed(3)} × ${factor.toFixed(5)} = ${result.totalTemperature.toFixed(4)} K`, result: `${result.totalTemperature.toFixed(4)}`, unit: "K" },
    { description: "Dynamic temperature rise  ΔT = T₀ − T", calculation: `ΔT = ${result.totalTemperature.toFixed(4)} − ${T.toFixed(3)} = ${result.dynamicTempRise.toFixed(4)} K`, result: `${result.dynamicTempRise.toFixed(4)}`, unit: "K" },
    { description: "Pressure ratio exponent  γ/(γ−1)", calculation: `γ/(γ−1) = ${g}/(${g}−1) = ${gExp.toFixed(5)}`, result: `${gExp.toFixed(5)}`, unit: "dimensionless" },
    { description: "Stagnation pressure  P₀ = P × f^(γ/(γ−1))", formula: "P₀ = P × f^(γ/(γ-1))", calculation: `P₀ = ${P.toFixed(2)} × ${factor.toFixed(5)}^(${gExp.toFixed(5)}) = ${result.totalPressure.toFixed(2)} Pa`, result: `${result.totalPressure.toFixed(2)}`, unit: "Pa" },
  ];
}

export interface ChokedFlowInput {
  totalPressure: number;    // Pa
  totalTemperature: number; // K
  throatArea: number;       // m²
  gamma: number;
  R: number;                // J/(kg·K)
}
export interface ChokedFlowResult {
  massFlowRate: number;       // kg/s
  massFlux: number;           // kg/(m²·s) = ṁ/A*
  flowCoefficient: number;    // Γ = √γ × (2/(γ+1))^((γ+1)/(2(γ-1))) — dimensionless
  throatTemperature: number;  // T* = T₀ × 2/(γ+1)  [K]
  throatPressure: number;     // P* = P₀ × (2/(γ+1))^(γ/(γ-1))  [Pa]
  throatDensity: number;      // ρ* = P*/(R·T*)  [kg/m³]
  throatVelocity: number;     // V* = √(γRT*)  [m/s]  (= speed of sound at throat)
  criticalPresRatio: number;  // P*/P₀
  criticalTempRatio: number;  // T*/T₀
  interpretation: string;
}
export function calculateChokedFlow(input: ChokedFlowInput): ChokedFlowResult {
  const { totalPressure: P0, totalTemperature: T0, throatArea: A, gamma: g, R } = input;
  const criticalTempRatio = 2 / (g + 1);
  const criticalPresRatio = Math.pow(criticalTempRatio, g / (g - 1));
  const flowCoefficient   = Math.sqrt(g) * Math.pow(criticalTempRatio, (g + 1) / (2 * (g - 1)));
  const massFlowRate      = A * P0 * flowCoefficient / Math.sqrt(R * T0);
  const massFlux          = massFlowRate / A;
  const throatTemperature = T0 * criticalTempRatio;
  const throatPressure    = P0 * criticalPresRatio;
  const throatDensity     = throatPressure / (R * throatTemperature);
  const throatVelocity    = Math.sqrt(g * R * throatTemperature);
  return {
    massFlowRate, massFlux, flowCoefficient,
    throatTemperature, throatPressure, throatDensity, throatVelocity,
    criticalPresRatio, criticalTempRatio,
    interpretation: `ṁ* = ${massFlowRate.toFixed(4)} kg/s. T* = ${throatTemperature.toFixed(2)} K, P* = ${(throatPressure/1000).toFixed(3)} kPa, V* = ${throatVelocity.toFixed(2)} m/s.`,
  };
}
export function generateChokedFlowSteps(input: ChokedFlowInput, result: ChokedFlowResult): Step[] {
  const { totalPressure: P0, totalTemperature: T0, throatArea: A, gamma: g, R } = input;
  const gExp = (g + 1) / (2 * (g - 1));
  return [
    { description: "Critical temperature ratio  T*/T₀ = 2/(γ+1)", formula: "T*/T₀ = 2/(γ+1)", calculation: `T*/T₀ = 2/${g + 1} = ${result.criticalTempRatio.toFixed(5)}`, result: `${result.criticalTempRatio.toFixed(5)}`, unit: "dimensionless" },
    { description: "Throat temperature  T* = T₀ × (T*/T₀)", calculation: `T* = ${T0} × ${result.criticalTempRatio.toFixed(5)} = ${result.throatTemperature.toFixed(4)} K`, result: `${result.throatTemperature.toFixed(4)}`, unit: "K" },
    { description: "Flow coefficient  Γ = √γ × (2/(γ+1))^((γ+1)/(2(γ−1)))", formula: "Γ = √γ × (2/(γ+1))^((γ+1)/(2(γ-1)))", calculation: `Γ = √${g} × ${result.criticalTempRatio.toFixed(5)}^(${gExp.toFixed(4)}) = ${result.flowCoefficient.toFixed(6)}`, result: `${result.flowCoefficient.toFixed(6)}`, unit: "dimensionless" },
    { description: "Choked mass flow rate  ṁ = A* × P₀ × Γ / √(R·T₀)", formula: "ṁ = A* × P₀ × Γ / √(R·T₀)", calculation: `ṁ = ${A.toPrecision(4)} × ${parseFloat(P0.toPrecision(5))} × ${result.flowCoefficient.toFixed(6)} / √(${R} × ${T0}) = ${parseFloat(result.massFlowRate.toPrecision(5))} kg/s`, result: `${parseFloat(result.massFlowRate.toPrecision(5))}`, unit: "kg/s" },
    { description: "Throat pressure  P* = P₀ × (T*/T₀)^(γ/(γ−1))", formula: "P*/P₀ = (T*/T₀)^(γ/(γ-1))", calculation: `P* = ${parseFloat(P0.toPrecision(5))} × ${result.criticalPresRatio.toFixed(5)} = ${result.throatPressure.toFixed(2)} Pa`, result: `${result.throatPressure.toFixed(2)}`, unit: "Pa" },
    { description: "Throat density  ρ* = P*/(R·T*)", formula: "ρ* = P* / (R·T*)", calculation: `ρ* = ${result.throatPressure.toFixed(2)} / (${R} × ${result.throatTemperature.toFixed(4)}) = ${result.throatDensity.toFixed(5)} kg/m³`, result: `${result.throatDensity.toFixed(5)}`, unit: "kg/m³" },
    { description: "Throat velocity  V* = √(γRT*)  (= speed of sound at throat)", formula: "V* = √(γ·R·T*)", calculation: `V* = √(${g} × ${R} × ${result.throatTemperature.toFixed(4)}) = ${result.throatVelocity.toFixed(3)} m/s`, result: `${result.throatVelocity.toFixed(3)}`, unit: "m/s" },
  ];
}

export interface AreaMachRelationInput {
  mach: number;
  gamma: number;
  throatArea?: number; // m²
}
export interface AreaMachRelationResult {
  areaRatio: number;        // A/A*
  alternateMach: number;    // subsonic M if input is supersonic, or vice versa
  temperatureRatio: number; // T/T₀ at input M
  pressureRatio: number;    // P/P₀ at input M
  densityRatio: number;     // ρ/ρ₀ at input M
  regime: string;           // "subsonic" | "sonic" | "supersonic"
  localArea?: number;       // m²
  interpretation: string;
}
function areaMachF(M: number, gamma: number): number {
  const exp = (gamma + 1) / (2 * (gamma - 1));
  const term = (2 / (gamma + 1)) * (1 + (gamma - 1) / 2 * M * M);
  return (1 / M) * Math.pow(term, exp);
}
function solveMachFromAreaRatio(areaRatio: number, gamma: number, subsonic: boolean): number {
  if (areaRatio <= 1) return 1.0;
  let lo = subsonic ? 1e-8 : 1.0 + 1e-8;
  let hi = subsonic ? 1.0 - 1e-8 : 100.0;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if ((areaMachF(mid, gamma) - areaRatio) * (areaMachF(lo, gamma) - areaRatio) < 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}
export function calculateAreaMachRelation(input: AreaMachRelationInput): AreaMachRelationResult {
  const { mach: M, gamma: g, throatArea } = input;
  const exp          = (g + 1) / (2 * (g - 1));
  const term         = (2 / (g + 1)) * (1 + (g - 1) / 2 * M * M);
  const areaRatio    = (1 / M) * Math.pow(term, exp);
  const factor       = 1 + (g - 1) / 2 * M * M;
  const temperatureRatio = 1 / factor;
  const pressureRatio    = Math.pow(temperatureRatio, g / (g - 1));
  const densityRatio     = Math.pow(temperatureRatio, 1 / (g - 1));
  const isSubsonic   = M < 1;
  const isSonic      = Math.abs(M - 1) < 1e-6;
  const regime       = isSonic ? "sonic" : isSubsonic ? "subsonic" : "supersonic";
  const alternateMach = isSonic ? 1.0 : solveMachFromAreaRatio(areaRatio, g, !isSubsonic);
  const localArea    = throatArea ? throatArea * areaRatio : undefined;
  return {
    areaRatio, alternateMach,
    temperatureRatio, pressureRatio, densityRatio,
    regime, localArea,
    interpretation: `A/A* = ${areaRatio.toFixed(4)} at M = ${M} (${regime}). Alternate solution: M = ${alternateMach.toFixed(4)} (${isSubsonic ? "supersonic" : "subsonic"}).`,
  };
}
export function generateAreaMachRelationSteps(input: AreaMachRelationInput, result: AreaMachRelationResult): Step[] {
  const { mach: M, gamma: g } = input;
  const exp    = (g + 1) / (2 * (g - 1));
  const term   = (2 / (g + 1)) * (1 + (g - 1) / 2 * M * M);
  const factor = 1 + (g - 1) / 2 * M * M;
  const p = (n: number) => parseFloat(n.toFixed(5)).toString(); // trim trailing zeros
  return [
    { description: "Area-Mach number relation", formula: "A/A* = (1/M) × [(2/(γ+1)) × (1 + (γ-1)/2 × M²)]^{(γ+1)/(2(γ-1))}" },
    { description: "Stagnation factor  f = 1 + (γ−1)/2 × M²", calculation: `f = 1 + (${g}−1)/2 × ${M}² = ${p(factor)}`, result: p(factor), unit: "dimensionless" },
    { description: "Inner term  (2/(γ+1)) × f", calculation: `(2/${g + 1}) × ${p(factor)} = ${p(term)}`, result: p(term), unit: "dimensionless" },
    { description: "Exponent  (γ+1)/(2(γ−1))", calculation: `(${g}+1)/(2×(${g}−1)) = ${p(exp)}`, result: p(exp), unit: "dimensionless" },
    { description: "Area ratio  A/A* = (1/M) × term^{exp}", calculation: `A/A* = (1/${M}) × ${p(term)}^{${p(exp)}} = ${p(result.areaRatio)}`, result: p(result.areaRatio), unit: "dimensionless" },
    { description: "Isentropic temperature ratio  T/T₀ = 1/f", calculation: `T/T₀ = 1/${p(factor)} = ${p(result.temperatureRatio)}`, result: p(result.temperatureRatio), unit: "dimensionless" },
    { description: `Alternate Mach — ${M < 1 ? "supersonic" : "subsonic"} solution giving same A/A* = ${p(result.areaRatio)}`, calculation: `M_{alt} = ${p(result.alternateMach)}`, result: p(result.alternateMach), unit: "dimensionless" },
    ...(input.throatArea ? [{ description: "Local area  A = A* × (A/A*)", calculation: `A = ${parseFloat(input.throatArea.toPrecision(4))} × ${p(result.areaRatio)} = ${p(result.localArea!)} m²`, result: p(result.localArea!), unit: "m²" }] : []),
  ];
}

export interface FannoFlowInput {
  mach1: number;
  gamma: number;
  diameter: number;       // m
  frictionFactor: number; // Darcy friction factor
  mach2?: number;         // optional exit Mach (between M₁ and 1) for duct length calculation
}
export interface FannoFlowResult {
  fLstarD1: number;           // fL*/D at M₁ (dimensionless Fanno parameter)
  maxLength: number;          // m — L* = fLstarD₁ × D / f
  temperatureRatio1: number;  // T/T* at M₁
  pressureRatio1: number;     // P/P* at M₁
  densityRatio1: number;      // ρ/ρ* at M₁
  totalPressureRatio1: number;// P₀/P₀* at M₁
  velocityRatio1: number;     // V/V* at M₁ (= ρ*/ρ by continuity)
  regime: string;             // "subsonic" | "sonic" | "supersonic"
  // Exit conditions — populated when mach2 is provided
  fLstarD2?: number;
  ductLength?: number;        // m — actual duct length M₁ → M₂
  temperatureRatio2?: number;
  pressureRatio2?: number;
  totalPressureRatio2?: number;
  interpretation: string;
}
function fannoRatios(M: number, g: number) {
  const M2      = M * M;
  const tRatio  = (g + 1) / (2 + (g - 1) * M2);
  const pRatio  = (1 / M) * Math.sqrt(tRatio);
  const rhoRatio= (1 / M) * Math.sqrt(1 / tRatio);
  const p0Ratio = (1 / M) * Math.pow((2 / (g + 1)) * (1 + (g - 1) / 2 * M2), (g + 1) / (2 * (g - 1)));
  const vRatio  = M * Math.sqrt(tRatio);   // V/V* = ρ*/ρ by continuity
  const fLstarD = (1 - M2) / (g * M2) + (g + 1) / (2 * g) * Math.log((g + 1) * M2 / (2 + (g - 1) * M2));
  return { tRatio, pRatio, rhoRatio, p0Ratio, vRatio, fLstarD };
}
export function calculateFannoFlow(input: FannoFlowInput): FannoFlowResult {
  const { mach1: M1, gamma: g, diameter: D, frictionFactor: f, mach2: M2 } = input;
  const r1 = fannoRatios(M1, g);
  const maxLength = r1.fLstarD * D / f;
  const regime    = Math.abs(M1 - 1) < 1e-6 ? "sonic" : M1 < 1 ? "subsonic" : "supersonic";
  let fLstarD2, ductLength, temperatureRatio2, pressureRatio2, totalPressureRatio2;
  if (M2 !== undefined) {
    const r2    = fannoRatios(M2, g);
    fLstarD2    = r2.fLstarD;
    ductLength  = (r1.fLstarD - r2.fLstarD) * D / f;
    temperatureRatio2  = r2.tRatio;
    pressureRatio2     = r2.pRatio;
    totalPressureRatio2 = r2.p0Ratio;
  }
  return {
    fLstarD1: r1.fLstarD, maxLength,
    temperatureRatio1: r1.tRatio, pressureRatio1: r1.pRatio,
    densityRatio1: r1.rhoRatio, totalPressureRatio1: r1.p0Ratio,
    velocityRatio1: r1.vRatio, regime,
    fLstarD2, ductLength, temperatureRatio2, pressureRatio2, totalPressureRatio2,
    interpretation: `M₁=${M1} (${regime}): fL*/D = ${r1.fLstarD.toFixed(4)}, L* = ${maxLength.toFixed(3)} m. T/T* = ${r1.tRatio.toFixed(4)}, P/P* = ${r1.pRatio.toFixed(4)}, P₀/P₀* = ${r1.p0Ratio.toFixed(4)}.`,
  };
}
export function generateFannoFlowSteps(input: FannoFlowInput, result: FannoFlowResult): Step[] {
  const { mach1: M1, gamma: g, diameter: D, frictionFactor: f, mach2: M2 } = input;
  const M1sq   = M1 * M1;
  const logArg = (g + 1) * M1sq / (2 + (g - 1) * M1sq);
  const term1  = (1 - M1sq) / (g * M1sq);
  const term2  = (g + 1) / (2 * g) * Math.log(logArg);
  const p = (n: number) => parseFloat(n.toFixed(5)).toString();
  const steps: Step[] = [
    { description: "Fanno parameter fL*/D at inlet M₁", formula: "fL*/D = (1−M²)/(γM²) + (γ+1)/(2γ) × ln((γ+1)M²/(2+(γ−1)M²))" },
    { description: "Term 1:  (1−M₁²)/(γM₁²)", calculation: `(1−${p(M1sq)}) / (${g} × ${p(M1sq)}) = ${p(term1)}`, result: p(term1), unit: "dimensionless" },
    { description: "Logarithm argument  (γ+1)M₁²/(2+(γ−1)M₁²)", calculation: `(${g + 1} × ${p(M1sq)}) / (2 + ${p((g - 1) * M1sq)}) = ${p(logArg)}`, result: p(logArg), unit: "dimensionless" },
    { description: "Term 2:  (γ+1)/(2γ) × ln(arg)", calculation: `${p((g + 1) / (2 * g))} × ln(${p(logArg)}) = ${p(term2)}`, result: p(term2), unit: "dimensionless" },
    { description: "Fanno parameter  fL*/D = term1 + term2", calculation: `fL*/D = ${p(term1)} + ${p(term2)} = ${p(result.fLstarD1)}`, result: p(result.fLstarD1), unit: "dimensionless" },
    { description: "Maximum duct length to choking  L* = (fL*/D) × D / f", formula: "L* = fL*/D × D / f", calculation: `L* = ${p(result.fLstarD1)} × ${parseFloat(D.toPrecision(4))} / ${f} = ${p(result.maxLength)} m`, result: p(result.maxLength), unit: "m" },
    { description: "Temperature ratio  T/T* at M₁", formula: "T/T* = (γ+1)/(2+(γ−1)M²)", calculation: `T/T* = ${g + 1} / (2 + ${p((g - 1) * M1sq)}) = ${p(result.temperatureRatio1)}`, result: p(result.temperatureRatio1), unit: "dimensionless" },
    { description: "Pressure ratio  P/P* at M₁", formula: "P/P* = (1/M) × √(T/T*)", calculation: `P/P* = (1/${M1}) × √${p(result.temperatureRatio1)} = ${p(result.pressureRatio1)}`, result: p(result.pressureRatio1), unit: "dimensionless" },
    { description: "Total pressure ratio  P₀/P₀* at M₁  (always ≥ 1)", formula: "P₀/P₀* = (1/M) × [(2/(γ+1)) × (1+(γ−1)/2 M²)]^{(γ+1)/(2(γ−1))}", calculation: `P₀/P₀* = ${p(result.totalPressureRatio1)}`, result: p(result.totalPressureRatio1), unit: "dimensionless" },
    ...(M2 !== undefined && result.fLstarD2 !== undefined && result.ductLength !== undefined ? [
      { description: `Fanno parameter fL*/D at exit M₂ = ${M2}`, calculation: `fL*/D|₂ = ${p(result.fLstarD2)}`, result: p(result.fLstarD2), unit: "dimensionless" },
      { description: "Duct length  L = (fL*/D|₁ − fL*/D|₂) × D / f", formula: "L = (fL*/D|₁ − fL*/D|₂) × D / f", calculation: `L = (${p(result.fLstarD1)} − ${p(result.fLstarD2)}) × ${parseFloat(D.toPrecision(4))} / ${f} = ${p(result.ductLength)} m`, result: p(result.ductLength), unit: "m" },
    ] : []),
  ];
  return steps;
}

export interface RayleighFlowInput {
  mach1: number;
  gamma: number;
  totalTemperature1: number; // K
  mach2?: number;            // optional exit Mach (between M₁ and 1)
}
export interface RayleighFlowResult {
  // Ratios at M₁ vs sonic state (*)
  temperatureRatio1: number;      // T/T*
  pressureRatio1: number;         // P/P*
  densityRatio1: number;          // ρ/ρ*
  velocityRatio1: number;         // V/V*
  totalTemperatureRatio1: number; // T₀/T₀*
  totalPressureRatio1: number;    // P₀/P₀*
  // Derived from T₀₁
  totalTempStar: number;  // K — stagnation temperature at M = 1 (thermal choke)
  heatToChoke: number;    // K — (T₀* − T₀₁), additional heat capacity before choking (× cₚ = q_max)
  regime: string;
  // Exit conditions (populated when mach2 is provided)
  totalTemperature2?: number;
  totalTemperatureRatio2?: number;
  totalPressureRatio2?: number;
  temperatureRatio2?: number;
  pressureRatio2?: number;
  heatAdded?: number;     // K — (T₀₂ − T₀₁) = heat added / cₚ
  interpretation: string;
}
function rayleighRatios(M: number, g: number) {
  const M2    = M * M;
  const denom = 1 + g * M2;
  const tRatio  = M2 * (g + 1) * (g + 1) / (denom * denom);                          // T/T*
  const pRatio  = (g + 1) / denom;                                                     // P/P*
  const rhoRatio= denom / ((g + 1) * M2);                                             // ρ/ρ*
  const vRatio  = (g + 1) * M2 / denom;                                               // V/V*
  const t0Ratio = 2 * (g + 1) * M2 * (1 + (g - 1) / 2 * M2) / (denom * denom);      // T₀/T₀*
  const p0Ratio = pRatio * Math.pow((1 + (g - 1) / 2 * M2) / ((g + 1) / 2), g / (g - 1)); // P₀/P₀*
  return { tRatio, pRatio, rhoRatio, vRatio, t0Ratio, p0Ratio };
}
export function calculateRayleighFlow(input: RayleighFlowInput): RayleighFlowResult {
  const { mach1: M1, gamma: g, totalTemperature1: T01, mach2: M2 } = input;
  const r1           = rayleighRatios(M1, g);
  const totalTempStar = T01 / r1.t0Ratio;      // T₀* = T₀₁ / (T₀/T₀*)
  const heatToChoke  = totalTempStar - T01;
  const regime       = Math.abs(M1 - 1) < 1e-6 ? "sonic" : M1 < 1 ? "subsonic" : "supersonic";
  let totalTemperature2, totalTemperatureRatio2, totalPressureRatio2,
      temperatureRatio2, pressureRatio2, heatAdded;
  if (M2 !== undefined) {
    const r2            = rayleighRatios(M2, g);
    totalTemperatureRatio2 = r2.t0Ratio;
    totalPressureRatio2    = r2.p0Ratio;
    temperatureRatio2      = r2.tRatio;
    pressureRatio2         = r2.pRatio;
    totalTemperature2      = totalTempStar * r2.t0Ratio;
    heatAdded              = totalTemperature2 - T01;
  }
  return {
    temperatureRatio1: r1.tRatio, pressureRatio1: r1.pRatio,
    densityRatio1: r1.rhoRatio, velocityRatio1: r1.vRatio,
    totalTemperatureRatio1: r1.t0Ratio, totalPressureRatio1: r1.p0Ratio,
    totalTempStar, heatToChoke, regime,
    totalTemperature2, totalTemperatureRatio2, totalPressureRatio2,
    temperatureRatio2, pressureRatio2, heatAdded,
    interpretation: `M₁=${M1} (${regime}): T₀/T₀*=${r1.t0Ratio.toFixed(4)}, P₀/P₀*=${r1.p0Ratio.toFixed(4)}. T₀*=${totalTempStar.toFixed(2)} K, heat to choke=${heatToChoke.toFixed(2)} K.`,
  };
}
export function generateRayleighFlowSteps(input: RayleighFlowInput, result: RayleighFlowResult): Step[] {
  const { mach1: M1, gamma: g, totalTemperature1: T01, mach2: M2 } = input;
  const M1sq  = M1 * M1;
  const denom = 1 + g * M1sq;
  const p = (n: number) => parseFloat(n.toFixed(5)).toString();
  const steps: Step[] = [
    { description: "Static temperature ratio  T/T* at M₁", formula: "T/T* = M²(γ+1)²/(1+γM²)²", calculation: `T/T* = ${p(M1sq)} × ${(g+1)*(g+1)} / ${p(denom*denom)} = ${p(result.temperatureRatio1)}`, result: p(result.temperatureRatio1), unit: "dimensionless" },
    { description: "Static pressure ratio  P/P* at M₁", formula: "P/P* = (γ+1)/(1+γM²)", calculation: `P/P* = ${g+1} / ${p(denom)} = ${p(result.pressureRatio1)}`, result: p(result.pressureRatio1), unit: "dimensionless" },
    { description: "Density ratio  ρ/ρ* at M₁  (= V*/V by continuity)", formula: "ρ/ρ* = (1+γM²)/((γ+1)M²)", calculation: `ρ/ρ* = ${p(denom)} / (${g+1} × ${p(M1sq)}) = ${p(result.densityRatio1)}`, result: p(result.densityRatio1), unit: "dimensionless" },
    { description: "Total temperature ratio  T₀/T₀* at M₁", formula: "T₀/T₀* = 2(γ+1)M²(1+(γ−1)/2·M²)/(1+γM²)²", calculation: `T₀/T₀* = 2×${g+1}×${p(M1sq)}×${p(1+(g-1)/2*M1sq)} / ${p(denom*denom)} = ${p(result.totalTemperatureRatio1)}`, result: p(result.totalTemperatureRatio1), unit: "dimensionless" },
    { description: "Total pressure ratio  P₀/P₀* at M₁", formula: "P₀/P₀* = (P/P*) × [(1+(γ−1)/2·M²)/((γ+1)/2)]^{γ/(γ−1)}", calculation: `P₀/P₀* = ${p(result.pressureRatio1)} × [${p((1+(g-1)/2*M1sq)/((g+1)/2))}]^{${p(g/(g-1))}} = ${p(result.totalPressureRatio1)}`, result: p(result.totalPressureRatio1), unit: "dimensionless" },
    { description: "Sonic stagnation temperature  T₀* = T₀₁ / (T₀/T₀*)", calculation: `T_{0}^{*} = ${parseFloat(T01.toPrecision(5))} / ${p(result.totalTemperatureRatio1)} = ${p(result.totalTempStar)} K`, result: p(result.totalTempStar), unit: "K" },
    { description: "Additional heat to reach choking  ΔT₀ = T₀* − T₀₁", calculation: `ΔT_{0} = ${p(result.totalTempStar)} − ${parseFloat(T01.toPrecision(5))} = ${p(result.heatToChoke)} K`, result: p(result.heatToChoke), unit: "K" },
    ...(M2 !== undefined && result.totalTemperature2 !== undefined ? [
      { description: `Total temperature ratio at exit M₂ = ${M2}`, calculation: `T_{0}/T_{0}^{*}|_{2} = ${p(result.totalTemperatureRatio2!)}`, result: p(result.totalTemperatureRatio2!), unit: "dimensionless" },
      { description: "Exit stagnation temperature  T₀₂ = T₀* × (T₀/T₀*)|₂", calculation: `T_{02} = ${p(result.totalTempStar)} × ${p(result.totalTemperatureRatio2!)} = ${p(result.totalTemperature2)} K`, result: p(result.totalTemperature2), unit: "K" },
      { description: "Heat added  q/cₚ = T₀₂ − T₀₁", calculation: `q/cₚ = ${p(result.totalTemperature2)} − ${parseFloat(T01.toPrecision(5))} = ${p(result.heatAdded!)} K`, result: p(result.heatAdded!), unit: "K" },
    ] : []),
  ];
  return steps;
}

export interface ObliqueShockInput {
  mach1: number;
  gamma: number;
  mode: "beta" | "theta"; // input angle type
  angle: number;           // β [deg] if mode=beta, θ [deg] if mode=theta
}
export interface ObliqueShockSolution {
  beta: number;              // shock wave angle β [deg]
  theta: number;             // flow deflection angle θ [deg]
  normalMach1: number;       // M₁ₙ = M₁ sin(β)
  normalMach2: number;       // M₂ₙ
  mach2: number;
  pressureRatio: number;     // P₂/P₁
  temperatureRatio: number;  // T₂/T₁
  densityRatio: number;      // ρ₂/ρ₁
  totalPressureRatio: number;// P₀₂/P₀₁
  type: "weak" | "strong" | "normal";
  isSupersonic: boolean;     // M₂ > 1
}
export interface ObliqueShockResult {
  primary: ObliqueShockSolution;
  strong?: ObliqueShockSolution; // populated in theta-mode when θ < θ_max
  machAngle: number;             // μ = arcsin(1/M₁) [deg]
  maxDeflectionAngle: number;    // θ_max [deg] — detachment threshold
  betaAtThetaMax: number;        // β [deg] at the detachment condition
  isDetached: boolean;           // θ > θ_max
  interpretation: string;
}
function obliqueShockFromBeta(M1: number, betaDeg: number, g: number, betaMaxDeg: number): ObliqueShockSolution {
  const beta = betaDeg * Math.PI / 180;
  const M1sq = M1 * M1;
  const sinB = Math.sin(beta);
  const M1nSq = M1sq * sinB * sinB;
  const M1n = Math.sqrt(M1nSq);
  const M2nSq = (M1nSq + 2 / (g - 1)) / (2 * g / (g - 1) * M1nSq - 1);
  const M2n   = Math.sqrt(Math.max(0, M2nSq));
  const pRatio  = (2 * g * M1nSq - (g - 1)) / (g + 1);
  const tRatio  = pRatio * (2 + (g - 1) * M1nSq) / ((g + 1) * M1nSq);
  const rhoRatio= (g + 1) * M1nSq / (2 + (g - 1) * M1nSq);
  const p0Ratio = Math.pow((g + 1) * M1nSq / (2 + (g - 1) * M1nSq), g / (g - 1)) *
                  Math.pow((g + 1) / (2 * g * M1nSq - (g - 1)), 1 / (g - 1));
  const tanTheta = (2 / Math.tan(beta)) * (M1nSq - 1) / (M1sq * (g + Math.cos(2 * beta)) + 2);
  const thetaDeg = Math.atan(tanTheta) * 180 / Math.PI;
  const betaMinusTheta = (betaDeg - thetaDeg) * Math.PI / 180;
  const M2 = M2n / Math.sin(betaMinusTheta);
  const type: ObliqueShockSolution["type"] = betaDeg >= 89.9 ? "normal"
    : betaDeg >= betaMaxDeg ? "strong" : "weak";
  return { beta: betaDeg, theta: thetaDeg, normalMach1: M1n, normalMach2: M2n, mach2: M2,
    pressureRatio: pRatio, temperatureRatio: tRatio, densityRatio: rhoRatio,
    totalPressureRatio: p0Ratio, type, isSupersonic: M2 > 1 };
}
function findMaxDeflection(M1: number, g: number): { betaMaxDeg: number; thetaMaxDeg: number } {
  const muDeg = Math.asin(1 / M1) * 180 / Math.PI;
  let best = { theta: 0, beta: muDeg };
  const N = 2000;
  for (let i = 1; i <= N; i++) {
    const bDeg = muDeg + (90 - muDeg - 0.01) * i / N;
    const beta = bDeg * Math.PI / 180;
    const M1nSq = M1 * M1 * Math.sin(beta) * Math.sin(beta);
    if (M1nSq <= 1) continue;
    const tanTh = (2 / Math.tan(beta)) * (M1nSq - 1) / (M1 * M1 * (g + Math.cos(2 * beta)) + 2);
    const th = Math.atan(tanTh) * 180 / Math.PI;
    if (th > best.theta) { best = { theta: th, beta: bDeg }; }
  }
  return { betaMaxDeg: best.beta, thetaMaxDeg: best.theta };
}
function findBetaFromTheta(M1: number, thetaDeg: number, g: number, betaMaxDeg: number, weak: boolean): number {
  const muDeg = Math.asin(1 / M1) * 180 / Math.PI;
  const lo0 = weak ? muDeg + 0.01 : betaMaxDeg;
  const hi0 = weak ? betaMaxDeg    : 89.99;
  const f = (bDeg: number) => {
    const beta = bDeg * Math.PI / 180;
    const M1nSq = M1 * M1 * Math.sin(beta) * Math.sin(beta);
    if (M1nSq <= 1) return -thetaDeg;
    const tanTh = (2 / Math.tan(beta)) * (M1nSq - 1) / (M1 * M1 * (g + Math.cos(2 * beta)) + 2);
    return Math.atan(tanTh) * 180 / Math.PI - thetaDeg;
  };
  let lo = lo0, hi = hi0;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) * f(lo) < 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}
export function calculateObliqueShock(input: ObliqueShockInput): ObliqueShockResult {
  const { mach1: M1, gamma: g, mode, angle } = input;
  const { betaMaxDeg, thetaMaxDeg } = findMaxDeflection(M1, g);
  const machAngle = Math.asin(1 / M1) * 180 / Math.PI;
  let primary: ObliqueShockSolution;
  let strong: ObliqueShockSolution | undefined;
  let isDetached = false;
  if (mode === "beta") {
    primary = obliqueShockFromBeta(M1, angle, g, betaMaxDeg);
  } else {
    if (angle >= thetaMaxDeg) {
      isDetached = true;
      primary = obliqueShockFromBeta(M1, betaMaxDeg, g, betaMaxDeg); // at detachment
    } else {
      const weakBeta   = findBetaFromTheta(M1, angle, g, betaMaxDeg, true);
      const strongBeta = findBetaFromTheta(M1, angle, g, betaMaxDeg, false);
      primary = obliqueShockFromBeta(M1, weakBeta,   g, betaMaxDeg);
      strong  = obliqueShockFromBeta(M1, strongBeta, g, betaMaxDeg);
    }
  }
  return {
    primary, strong, machAngle, maxDeflectionAngle: thetaMaxDeg, betaAtThetaMax: betaMaxDeg, isDetached,
    interpretation: `M₁=${M1}: θ=${primary.theta.toFixed(2)}°, β=${primary.beta.toFixed(2)}°, M₂=${primary.mach2.toFixed(3)} (${primary.type}${primary.isSupersonic ? ", supersonic" : ", subsonic"}).`,
  };
}
export function generateObliqueShockSteps(input: ObliqueShockInput, result: ObliqueShockResult): Step[] {
  const { mach1: M1, gamma: g, mode } = input;
  const s = result.primary;
  const p = (n: number) => parseFloat(n.toFixed(5)).toString();
  const muDeg = result.machAngle;
  const steps: Step[] = [
    { description: `Mach angle μ = arcsin(1/M₁)  (lower bound on β)`, formula: "μ = arcsin(1/M₁)", calculation: `μ = arcsin(1/${M1}) = ${p(muDeg)}°`, result: p(muDeg), unit: "deg" },
  ];
  if (mode === "theta") {
    steps.push({ description: `θ-β-M solver: find β giving θ = ${input.angle}° (weak solution)`, calculation: `β_{weak} = ${p(s.beta)}°  [numerical bisection]`, result: p(s.beta), unit: "deg" });
  }
  const M1nSq = s.normalMach1 * s.normalMach1;
  steps.push(
    { description: "Normal component of upstream Mach  M₁ₙ = M₁ sin(β)", formula: "M_{1n} = M₁ × sin(β)", calculation: `M_{1n} = ${M1} × sin(${p(s.beta)}°) = ${p(s.normalMach1)}`, result: p(s.normalMach1), unit: "dimensionless" },
    { description: "Normal downstream Mach  M₂ₙ (Rankine-Hugoniot on M₁ₙ)", formula: "M_{2n}^{2} = (M_{1n}^{2} + 2/(γ−1)) / (2γ/(γ−1) × M_{1n}^{2} − 1)", calculation: `M_{2n} = ${p(s.normalMach2)}`, result: p(s.normalMach2), unit: "dimensionless" },
    { description: "Pressure ratio  P₂/P₁ (normal shock on M₁ₙ)", formula: "P₂/P₁ = (2γM_{1n}^{2} − (γ−1))/(γ+1)", calculation: `P₂/P₁ = (2×${g}×${p(M1nSq)} − ${g-1}) / ${g+1} = ${p(s.pressureRatio)}`, result: p(s.pressureRatio), unit: "dimensionless" },
    { description: "Temperature ratio  T₂/T₁", formula: "T₂/T₁ = (P₂/P₁) × (2+(γ−1)M_{1n}^{2})/((γ+1)M_{1n}^{2})", calculation: `T₂/T₁ = ${p(s.pressureRatio)} × ${p((2+(g-1)*M1nSq)/((g+1)*M1nSq))} = ${p(s.temperatureRatio)}`, result: p(s.temperatureRatio), unit: "dimensionless" },
    { description: "Deflection angle θ from θ-β-M relation", formula: "tan(θ) = 2cot(β) × (M₁²sin²β−1) / (M₁²(γ+cos2β)+2)", calculation: `θ = ${p(s.theta)}°`, result: p(s.theta), unit: "deg" },
    { description: "Downstream Mach  M₂ = M₂ₙ / sin(β − θ)", formula: "M₂ = M_{2n} / sin(β − θ)", calculation: `M₂ = ${p(s.normalMach2)} / sin(${p(s.beta)}° − ${p(s.theta)}°) = ${p(s.mach2)} \\text{ (${s.isSupersonic ? "supersonic" : "subsonic"})}`, result: p(s.mach2), unit: "dimensionless" },
    { description: "Total pressure ratio  P₀₂/P₀₁  (< 1, entropy increase)", calculation: `P_{02}/P_{01} = ${p(s.totalPressureRatio)}`, result: p(s.totalPressureRatio), unit: "dimensionless" },
  );
  return steps;
}

export interface PrandtlMeyerExpansionInput {
  mach1: number;
  gamma: number;
  deflectionAngle: number; // degrees (turning angle θ)
}
export interface PrandtlMeyerExpansionResult {
  nu1: number;                // ν(M₁) [deg]
  nu2: number;                // ν(M₂) = ν₁ + θ [deg]
  mach2: number;
  machAngle1: number;         // μ₁ = arcsin(1/M₁) [deg]
  machAngle2: number;         // μ₂ = arcsin(1/M₂) [deg]
  pressureRatio: number;      // P₂/P₁ (isentropic)
  temperatureRatio: number;   // T₂/T₁ (isentropic)
  densityRatio: number;       // ρ₂/ρ₁ (isentropic)
  nuMax: number;              // ν_max for given γ [deg] — vacuum limit
  remainingExpansion: number; // ν_max − ν₂ [deg]
  isVacuumLimit: boolean;     // ν₂ > ν_max
  interpretation: string;
}
function prandtlMeyerFunction(mach: number, gamma: number): number {
  const term = Math.sqrt((gamma + 1) / (gamma - 1));
  const val  = term * Math.atan(Math.sqrt((gamma - 1) / (gamma + 1) * (mach * mach - 1)))
             - Math.atan(Math.sqrt(mach * mach - 1));
  return val * 180 / Math.PI;
}
function solveMachFromPrandtlMeyer(nu: number, gamma: number): number {
  let M = Math.max(1.001, nu / 10 + 1); // better initial guess
  for (let i = 0; i < 200; i++) {
    if (M <= 1) M = 1.001;
    const fn  = prandtlMeyerFunction(M, gamma);
    const dM  = 1e-5;
    const dfn = (prandtlMeyerFunction(M + dM, gamma) - fn) / dM;
    const err = fn - nu;
    if (Math.abs(err) < 1e-8) break;
    M -= err / dfn;
  }
  return M;
}
function isentropicFactor(M: number, g: number) { return 1 + (g - 1) / 2 * M * M; }
export function calculatePrandtlMeyerExpansion(input: PrandtlMeyerExpansionInput): PrandtlMeyerExpansionResult {
  const { mach1: M1, gamma: g, deflectionAngle: theta } = input;
  const nu1   = prandtlMeyerFunction(M1, g);
  const nu2   = nu1 + theta;
  const nuMax = 90 * (Math.sqrt((g + 1) / (g - 1)) - 1); // degrees
  const isVacuumLimit = nu2 >= nuMax;
  const mach2  = isVacuumLimit ? Infinity : solveMachFromPrandtlMeyer(nu2, g);
  const mu1    = Math.asin(1 / M1) * 180 / Math.PI;
  const mu2    = isVacuumLimit ? 0 : Math.asin(1 / mach2) * 180 / Math.PI;
  const f1     = isentropicFactor(M1, g);
  const f2     = isVacuumLimit ? Infinity : isentropicFactor(mach2, g);
  const gExp   = g / (g - 1);
  const pRatio = isVacuumLimit ? 0 : Math.pow(f1 / f2, gExp);
  const tRatio = isVacuumLimit ? 0 : f1 / f2;
  const rRatio = isVacuumLimit ? 0 : Math.pow(f1 / f2, 1 / (g - 1));
  return {
    nu1, nu2, mach2, machAngle1: mu1, machAngle2: mu2,
    pressureRatio: pRatio, temperatureRatio: tRatio, densityRatio: rRatio,
    nuMax, remainingExpansion: Math.max(0, nuMax - nu2), isVacuumLimit,
    interpretation: `M₁=${M1}, θ=${theta}°: ν₁=${nu1.toFixed(3)}°, ν₂=${nu2.toFixed(3)}°, M₂=${isVacuumLimit ? "∞" : mach2.toFixed(4)}.`,
  };
}
export function generatePrandtlMeyerExpansionSteps(input: PrandtlMeyerExpansionInput, result: PrandtlMeyerExpansionResult): Step[] {
  const { mach1: M1, gamma: g, deflectionAngle: theta } = input;
  const M1sq  = M1 * M1;
  const k     = Math.sqrt((g + 1) / (g - 1));
  const x     = Math.sqrt((g - 1) / (g + 1) * (M1sq - 1));
  const y     = Math.sqrt(M1sq - 1);
  const p = (n: number) => parseFloat(n.toFixed(5)).toString();
  const steps: Step[] = [
    { description: "Prandtl-Meyer function components at M₁", formula: "ν(M) = √((γ+1)/(γ−1)) × arctan(√((γ−1)/(γ+1)×(M²−1))) − arctan(√(M²−1))" },
    { description: "Scale factor  k = √((γ+1)/(γ−1))", calculation: `k = √(${g+1}/${p(g-1)}) = ${p(k)}`, result: p(k), unit: "dimensionless" },
    { description: "Inner argument  x = √((γ−1)/(γ+1) × (M₁²−1))", calculation: `x = √(${p(g-1)}/${g+1} × ${p(M1sq-1)}) = ${p(x)}`, result: p(x), unit: "dimensionless" },
    { description: "Hyperbolic argument  y = √(M₁²−1)", calculation: `y = √(${p(M1sq-1)}) = ${p(y)}`, result: p(y), unit: "dimensionless" },
    { description: "Prandtl-Meyer function  ν₁ = k × arctan(x) − arctan(y)", calculation: `ν₁ = ${p(k)} × arctan(${p(x)}) − arctan(${p(y)}) = ${p(k)} × ${p(Math.atan(x)*180/Math.PI)}° − ${p(Math.atan(y)*180/Math.PI)}° = ${p(result.nu1)}°`, result: p(result.nu1), unit: "deg" },
    { description: "Downstream ν₂ = ν₁ + θ", formula: "ν₂ = ν₁ + θ", calculation: `ν₂ = ${p(result.nu1)} + ${theta} = ${p(result.nu2)}°`, result: p(result.nu2), unit: "deg" },
    { description: `Vacuum limit check  ν_max = 90°×(k−1) = ${p(result.nuMax)}°`, calculation: result.isVacuumLimit ? `ν₂ = ${p(result.nu2)}° ≥ ν_max = ${p(result.nuMax)}° — past vacuum limit!` : `ν₂ = ${p(result.nu2)}° < ν_max = ${p(result.nuMax)}° — physically valid` },
    { description: "Solve for M₂ from ν(M₂) = ν₂  (Newton iteration)", calculation: result.isVacuumLimit ? "M₂ → ∞  (vacuum expansion)" : `M₂ = ${p(result.mach2)}`, result: result.isVacuumLimit ? "∞" : p(result.mach2), unit: "dimensionless" },
    ...(!result.isVacuumLimit ? [
      { description: "Isentropic temperature ratio  T₂/T₁ = f(M₁)/f(M₂)", formula: "T₂/T₁ = (1+(γ−1)/2·M₁²) / (1+(γ−1)/2·M₂²)", calculation: `T₂/T₁ = ${p(isentropicFactor(M1,g))} / ${p(isentropicFactor(result.mach2,g))} = ${p(result.temperatureRatio)}`, result: p(result.temperatureRatio), unit: "dimensionless" },
      { description: "Isentropic pressure ratio  P₂/P₁ = (T₂/T₁)^{γ/(γ−1)}", calculation: `P₂/P₁ = ${p(result.temperatureRatio)}^{${p(g/(g-1))}} = ${p(result.pressureRatio)}`, result: p(result.pressureRatio), unit: "dimensionless" },
      { description: "Mach angles  μ = arcsin(1/M)", formula: "μ = arcsin(1/M)", calculation: `μ₁ = arcsin(1/${M1}) = ${p(result.machAngle1)}°,   μ₂ = arcsin(1/${p(result.mach2)}) = ${p(result.machAngle2)}°` },
    ] : []),
  ];
  return steps;
}

// ============================================================================
// TURBOMACHINERY
// ============================================================================

export interface PumpHeadInput {
  impellerSpeed: number;    // rad/s (ω)
  impellerDiameter: number; // m (D₂)
  flowRate: number;         // m³/s (Q)
  bladeAngle: number;       // degrees (β₂, outlet blade angle from tangential)
  impellerWidth: number;    // m (b₂, outlet width)
  fluidDensity?: number;    // kg/m³ — optional, for power calculation
  gravity?: number;
}
export interface PumpHeadResult {
  tipSpeed: number;          // U₂ [m/s]
  outletArea: number;        // A₂ = π D₂ b₂ [m²]
  radialVelocity: number;    // Vr₂ [m/s]
  whirlVelocity: number;     // Vu₂ [m/s]
  absoluteVelocity: number;  // V₂ = √(Vr₂²+Vu₂²) [m/s]
  eulerHead: number;         // H_E [m]
  eulerPower?: number;       // P = ρgQH [W] — only when fluidDensity given
  speedRpm: number;          // n [rpm] = ω × 60/(2π)
  interpretation: string;
}
export function calculatePumpHead(input: PumpHeadInput): PumpHeadResult {
  const { impellerSpeed: omega, impellerDiameter: D2, flowRate: Q,
          bladeAngle: beta2, impellerWidth: b2, fluidDensity: rho, gravity: g = 9.81 } = input;
  const U2       = omega * D2 / 2;                              // tip speed
  const A2       = Math.PI * D2 * b2;                           // outlet annular area
  const Vr2      = Q / A2;                                      // radial velocity
  const Vu2      = U2 - Vr2 / Math.tan(beta2 * Math.PI / 180); // whirl velocity
  const V2       = Math.sqrt(Vr2 * Vr2 + Vu2 * Vu2);           // absolute velocity
  const H        = U2 * Vu2 / g;                                // Euler head
  const speedRpm = omega * 60 / (2 * Math.PI);
  const eulerPower = rho ? rho * g * Q * H : undefined;
  return {
    tipSpeed: U2, outletArea: A2, radialVelocity: Vr2, whirlVelocity: Vu2,
    absoluteVelocity: V2, eulerHead: H, eulerPower, speedRpm,
    interpretation: `Euler head H_E = ${H.toFixed(2)} m, U₂ = ${U2.toFixed(2)} m/s, Vu₂ = ${Vu2.toFixed(2)} m/s.`,
  };
}
export function generatePumpHeadSteps(input: PumpHeadInput, result: PumpHeadResult): Step[] {
  const { impellerSpeed: omega, impellerDiameter: D2, flowRate: Q,
          bladeAngle: beta2, impellerWidth: b2, gravity: g = 9.81 } = input;
  const p = (n: number) => parseFloat(n.toFixed(4)).toString();
  return [
    { description: "Tip speed  U₂ = ω × D₂/2", formula: "U₂ = ω × D₂/2", calculation: `U₂ = ${p(omega)} × ${p(D2)}/2 = ${p(result.tipSpeed)} m/s`, result: p(result.tipSpeed), unit: "m/s" },
    { description: "Outlet annular area  A₂ = π × D₂ × b₂", formula: "A₂ = π × D₂ × b₂", calculation: `A₂ = π × ${p(D2)} × ${p(b2)} = ${p(result.outletArea)} m²`, result: p(result.outletArea), unit: "m²" },
    { description: "Outlet radial velocity  Vr₂ = Q / A₂", formula: "Vr₂ = Q / A₂", calculation: `Vr₂ = ${p(Q)} / ${p(result.outletArea)} = ${p(result.radialVelocity)} m/s`, result: p(result.radialVelocity), unit: "m/s" },
    { description: "Outlet whirl velocity  Vu₂ = U₂ − Vr₂/tan(β₂)", formula: "Vu₂ = U₂ − Vr₂ / tan(β₂)", calculation: `Vu₂ = ${p(result.tipSpeed)} − ${p(result.radialVelocity)}/tan(${beta2}°) = ${p(result.tipSpeed)} − ${p(result.radialVelocity / Math.tan(beta2 * Math.PI / 180))} = ${p(result.whirlVelocity)} m/s`, result: p(result.whirlVelocity), unit: "m/s" },
    { description: "Euler head  H = U₂ × Vu₂ / g", formula: "H = U₂ × Vu₂ / g", calculation: `H = ${p(result.tipSpeed)} × ${p(result.whirlVelocity)} / ${g} = ${p(result.eulerHead)} m`, result: p(result.eulerHead), unit: "m" },
    ...(result.eulerPower !== undefined ? [{ description: "Euler power  P = ρgQH", formula: "P = ρ × g × Q × H", calculation: `P = ${p(input.fluidDensity!)} × ${g} × ${p(Q)} × ${p(result.eulerHead)} = ${p(result.eulerPower)} W`, result: p(result.eulerPower), unit: "W" }] : []),
  ];
}

export interface NpshInput {
  suctionPressure: number;  // Pa (absolute) at pump inlet flange
  vaporPressure: number;    // Pa at operating temperature
  fluidDensity: number;     // kg/m³
  npshr?: number;           // m — required NPSH from pump manufacturer (optional)
  gravity?: number;
}
export interface NpshResult {
  npsha: number;              // m — NPSH available
  pressureDifference: number; // Pa — P_s − P_v
  npshr?: number;             // m — required (if given)
  margin?: number;            // m — NPSH_A − NPSH_R (positive = safe)
  cavitationStatus?: string;  // "safe" | "marginal" | "high risk" | "cavitating"
  interpretation: string;
}
export function calculateNpsh(input: NpshInput): NpshResult {
  const { suctionPressure: Ps, vaporPressure: Pv, fluidDensity: rho, npshr, gravity: g = 9.81 } = input;
  const dP    = Ps - Pv;
  const npsha = dP / (rho * g);
  let margin: number | undefined;
  let cavitationStatus: string | undefined;
  if (npshr !== undefined) {
    margin = npsha - npshr;
    cavitationStatus = margin < 0 ? "cavitating"
      : margin < 0.5  ? "high risk"
      : margin < 1.0  ? "marginal"
      : "safe";
  }
  return {
    npsha, pressureDifference: dP, npshr, margin, cavitationStatus,
    interpretation: `NPSH_A = ${npsha.toFixed(3)} m${npshr !== undefined ? `, margin = ${margin!.toFixed(3)} m (${cavitationStatus})` : ""}. Must exceed NPSH_R to avoid cavitation.`,
  };
}
export function generateNpshSteps(input: NpshInput, result: NpshResult): Step[] {
  const { suctionPressure: Ps, vaporPressure: Pv, fluidDensity: rho, gravity: g = 9.81 } = input;
  const p = (n: number) => parseFloat(n.toFixed(4)).toString();
  const steps: Step[] = [
    { description: "Pressure difference  P_s − P_v", formula: "ΔP = P_s − P_v", calculation: `ΔP = ${Ps} − ${Pv} = ${p(result.pressureDifference)} Pa`, result: p(result.pressureDifference), unit: "Pa" },
    { description: "Denominator  ρ × g", calculation: `ρg = ${rho} × ${g} = ${p(rho * g)} Pa/m`, result: p(rho * g), unit: "Pa/m" },
    { description: "NPSH available  NPSH_A = ΔP / (ρg)", formula: "NPSH_A = (P_s − P_v) / (ρg)", calculation: `NPSH_A = ${p(result.pressureDifference)} / ${p(rho * g)} = ${p(result.npsha)} m`, result: p(result.npsha), unit: "m" },
    ...(result.npshr !== undefined ? [{ description: `Cavitation check  margin = NPSH_A − NPSH_R`, calculation: `margin = ${p(result.npsha)} − ${p(result.npshr)} = ${p(result.margin!)} m  →  ${result.cavitationStatus}`, result: p(result.margin!), unit: "m" }] : []),
  ];
  return steps;
}

export interface SpecificSpeedInput {
  rotationalSpeed: number; // rpm
  flowRate: number;        // m³/s
  head: number;            // m
}
export interface SpecificSpeedResult {
  specificSpeed: number;   // Ωs — dimensionless SI  = ω√Q/(gH)^0.75
  nsUS: number;            // Ns — US dimensional    = N[rpm]×√Q[gpm]/H[ft]^0.75  ≈ 2733 × Ωs
  nqEU: number;            // Nq — European          = N[rpm]×√Q[m³/s]/H[m]^0.75  ≈ 52.9 × Ωs
  classification: string;
  impellerShape: string;
  omega: number;           // rad/s
  sqrtQ: number;           // √Q
  ghPow: number;           // (gH)^0.75
  interpretation: string;
}
export function calculateSpecificSpeed(input: SpecificSpeedInput): SpecificSpeedResult {
  const { rotationalSpeed: N, flowRate: Q, head: H } = input;
  const g     = 9.81;
  const omega = N * 2 * Math.PI / 60;
  const sqrtQ = Math.sqrt(Q);
  const ghPow = Math.pow(g * H, 0.75);
  const Omega = omega * sqrtQ / ghPow;                      // dimensionless SI
  const nsUS  = N * Math.sqrt(Q * 15850.3) / Math.pow(H * 3.28084, 0.75); // US rpm-gpm-ft
  const nqEU  = N * sqrtQ / Math.pow(H, 0.75);             // European rpm-m³/s-m
  let classification: string;
  let impellerShape: string;
  if (Omega < 0.4)       { classification = "Centrifugal — very high head";       impellerShape = "Narrow radial, multi-stage"   ; }
  else if (Omega < 1.5)  { classification = "Centrifugal — radial flow";           impellerShape = "Radial impeller"              ; }
  else if (Omega < 4.0)  { classification = "Mixed flow";                          impellerShape = "Mixed-flow impeller (diagonal)"; }
  else                   { classification = "Axial flow";                          impellerShape = "Propeller / axial impeller"   ; }
  return {
    specificSpeed: Omega, nsUS, nqEU, classification, impellerShape,
    omega, sqrtQ, ghPow,
    interpretation: `Ωs = ${Omega.toFixed(3)} (${classification}). Ns_US = ${nsUS.toFixed(0)}, Nq = ${nqEU.toFixed(1)}.`,
  };
}
export function generateSpecificSpeedSteps(input: SpecificSpeedInput, result: SpecificSpeedResult): Step[] {
  const { rotationalSpeed: N, flowRate: Q, head: H } = input;
  const p = (n: number) => parseFloat(n.toFixed(5)).toString();
  return [
    { description: "Convert rotational speed  ω = N × 2π/60", formula: "ω = N × 2π/60", calculation: `ω = ${N} × 2π/60 = ${p(result.omega)} rad/s`, result: p(result.omega), unit: "rad/s" },
    { description: "Square root of flow rate  √Q", calculation: `√Q = √${p(Q)} = ${p(result.sqrtQ)} m^{3/2}/s^{1/2}`, result: p(result.sqrtQ), unit: "m^{3/2}/s^{1/2}" },
    { description: "Head group  (gH)^{0.75}", formula: "(gH)^{0.75}", calculation: `(9.81 × ${p(H)})^{0.75} = ${p(9.81 * H)}^{0.75} = ${p(result.ghPow)}`, result: p(result.ghPow), unit: "dimensionless" },
    { description: "Dimensionless specific speed  Ωs = ω√Q / (gH)^{0.75}", formula: "Ωs = ω√Q / (gH)^{0.75}", calculation: `Ωs = ${p(result.omega)} × ${p(result.sqrtQ)} / ${p(result.ghPow)} = ${p(result.specificSpeed)}`, result: p(result.specificSpeed), unit: "dimensionless" },
    { description: "US dimensional form  Ns = N√Q[gpm] / H[ft]^{0.75}  (≈ 2733 × Ωs)", calculation: `Ns = ${p(result.specificSpeed)} × 2733 ≈ ${Math.round(result.nsUS)}`, result: `${Math.round(result.nsUS)}`, unit: "rpm-gpm-ft" },
    { description: "European form  Nq = N√Q[m³/s] / H[m]^{0.75}  (≈ 52.9 × Ωs)", calculation: `Nq = ${N} × ${p(result.sqrtQ)} / ${p(Math.pow(H, 0.75))} = ${p(result.nqEU)}`, result: p(result.nqEU), unit: "rpm-m³/s-m" },
    { description: "Pump classification", calculation: `Ωs = ${p(result.specificSpeed)} \\to \\text{ ${result.classification} (${result.impellerShape})}` },
  ];
}

export interface AffinityLawsInput {
  speed1: number;    // rpm
  speed2: number;    // rpm
  flowRate1: number; // m³/s
  head1: number;     // m
  power1: number;    // W
}
export interface AffinityLawsResult {
  speedRatio: number;  // N₂/N₁
  flowRate2: number;   // m³/s
  head2: number;       // m
  power2: number;      // W
  flowRatio: number;   // Q₂/Q₁  = ratio
  headRatio: number;   // H₂/H₁  = ratio²
  powerRatio: number;  // P₂/P₁  = ratio³
  interpretation: string;
}
export function calculateAffinityLaws(input: AffinityLawsInput): AffinityLawsResult {
  const { speed1, speed2, flowRate1, head1, power1 } = input;
  const r = speed2 / speed1;
  return {
    speedRatio: r,
    flowRate2: flowRate1 * r,       flowRatio: r,
    head2:     head1 * r * r,       headRatio: r * r,
    power2:    power1 * r * r * r,  powerRatio: r * r * r,
    interpretation: `N₂/N₁ = ${r.toFixed(4)}: Q₂ = ${(flowRate1 * r).toFixed(4)} m³/s, H₂ = ${(head1 * r * r).toFixed(2)} m, P₂ = ${((power1 * r * r * r) / 1000).toFixed(2)} kW.`,
  };
}
export function generateAffinityLawsSteps(input: AffinityLawsInput, result: AffinityLawsResult): Step[] {
  const { speed1, speed2, flowRate1, head1, power1 } = input;
  const r = result.speedRatio;
  const p = (n: number) => parseFloat(n.toFixed(5)).toString();
  return [
    { description: "Speed ratio  N₂/N₁", formula: "r = N₂/N₁", calculation: `r = ${speed2} / ${speed1} = ${p(r)}`, result: p(r), unit: "dimensionless" },
    { description: "Flow rate law  Q₂ = Q₁ × r", formula: "Q₂/Q₁ = N₂/N₁", calculation: `Q₂ = ${p(flowRate1)} × ${p(r)} = ${p(result.flowRate2)} m³/s`, result: p(result.flowRate2), unit: "m³/s" },
    { description: "Head law  H₂ = H₁ × r²", formula: "H₂/H₁ = (N₂/N₁)^{2}", calculation: `H₂ = ${p(head1)} × (${p(r)})^{2} = ${p(head1)} × ${p(r * r)} = ${p(result.head2)} m`, result: p(result.head2), unit: "m" },
    { description: "Power law  P₂ = P₁ × r³", formula: "P₂/P₁ = (N₂/N₁)^{3}", calculation: `P₂ = ${p(power1)} × (${p(r)})^{3} = ${p(power1)} × ${p(r * r * r)} = ${p(result.power2)} W  (${p(result.power2 / 1000)} kW)`, result: p(result.power2), unit: "W" },
  ];
}

export interface HydraulicEfficiencyInput {
  actualHead: number;      // m  — measured pump head
  theoreticalHead: number; // m  — Euler head from velocity triangles
  flowRate: number;        // m³/s
  shaftPower: number;      // W
  density: number;         // kg/m³
  gravity?: number;
}
export interface HydraulicEfficiencyResult {
  hydraulicEfficiency: number;  // η_h  = H_actual / H_Euler        (fraction 0–1)
  overallEfficiency: number;    // η    = ρgQH_actual / P_shaft      (fraction 0–1)
  hydraulicPower: number;       // P_h  = ρgQH_actual [W]
  headLoss: number;             // ΔH   = H_Euler − H_actual [m]
  interpretation: string;
}
export function calculateHydraulicEfficiency(input: HydraulicEfficiencyInput): HydraulicEfficiencyResult {
  const { actualHead: Ha, theoreticalHead: He, flowRate: Q, shaftPower: Ps, density: rho, gravity: g = 9.81 } = input;
  const hydraulicPower     = rho * g * Q * Ha;
  const hydraulicEfficiency = Ha / He;
  const overallEfficiency   = hydraulicPower / Ps;
  const headLoss            = He - Ha;
  return {
    hydraulicEfficiency, overallEfficiency, hydraulicPower, headLoss,
    interpretation: `ηₕ = ${(hydraulicEfficiency * 100).toFixed(1)}%, η = ${(overallEfficiency * 100).toFixed(1)}%, Pₕ = ${(hydraulicPower / 1000).toFixed(2)} kW, ΔH = ${headLoss.toFixed(2)} m.`,
  };
}
export function generateHydraulicEfficiencySteps(input: HydraulicEfficiencyInput, result: HydraulicEfficiencyResult): Step[] {
  const { actualHead: Ha, theoreticalHead: He, flowRate: Q, shaftPower: Ps, density: rho, gravity: g = 9.81 } = input;
  const p = (n: number) => parseFloat(n.toFixed(4)).toString();
  return [
    { description: "Hydraulic efficiency  ηₕ = Hₐ / Hₑ", formula: "η_h = H_{actual} / H_{Euler}", calculation: `η_h = ${p(Ha)} / ${p(He)} = ${p(result.hydraulicEfficiency)} = ${(result.hydraulicEfficiency * 100).toFixed(2)}%`, result: p(result.hydraulicEfficiency), unit: "dimensionless" },
    { description: "Head loss  ΔH = Hₑ − Hₐ", calculation: `ΔH = ${p(He)} − ${p(Ha)} = ${p(result.headLoss)} m`, result: p(result.headLoss), unit: "m" },
    { description: "Hydraulic power  Pₕ = ρgQHₐ", formula: "P_h = ρ × g × Q × H_{actual}", calculation: `P_h = ${rho} × ${g} × ${p(Q)} × ${p(Ha)} = ${p(result.hydraulicPower)} W`, result: p(result.hydraulicPower), unit: "W" },
    { description: "Overall efficiency  η = Pₕ / Pₛ", formula: "η = ρgQH / P_{shaft}", calculation: `η = ${p(result.hydraulicPower)} / ${p(Ps)} = ${p(result.overallEfficiency)} = ${(result.overallEfficiency * 100).toFixed(2)}%`, result: p(result.overallEfficiency), unit: "dimensionless" },
  ];
}

export interface TurbinePowerInput {
  efficiency: number;    // 0-1
  flowRate: number;      // m³/s
  head: number;          // m
  density: number;       // kg/m³
  gravity?: number;
}
export interface TurbinePowerResult {
  hydraulicPower: number; // W — available water power ρgQH
  outputPower: number;    // W — shaft output = η × P_hyd
  powerLoss: number;      // W — P_hyd − P_out (friction, turbulence, leakage)
  interpretation: string;
}
export function calculateTurbinePower(input: TurbinePowerInput): TurbinePowerResult {
  const { efficiency: eta, flowRate: Q, head: H, density: rho, gravity: g = 9.81 } = input;
  const hydraulicPower = rho * g * Q * H;
  const outputPower    = eta * hydraulicPower;
  const powerLoss      = hydraulicPower - outputPower;
  return {
    hydraulicPower, outputPower, powerLoss,
    interpretation: `Pₒᵤₜ = ${(outputPower / 1000).toFixed(3)} kW (η = ${(eta * 100).toFixed(1)}%), Pₕ = ${(hydraulicPower / 1000).toFixed(3)} kW, loss = ${(powerLoss / 1000).toFixed(3)} kW.`,
  };
}
export function generateTurbinePowerSteps(input: TurbinePowerInput, result: TurbinePowerResult): Step[] {
  const { efficiency: eta, flowRate: Q, head: H, density: rho, gravity: g = 9.81 } = input;
  const p = (n: number) => parseFloat(n.toFixed(4)).toString();
  return [
    { description: "Available hydraulic power  Pₕ = ρgQH", formula: "P_h = ρ × g × Q × H", calculation: `P_h = ${p(rho)} × ${g} × ${p(Q)} × ${p(H)} = ${p(result.hydraulicPower)} W`, result: p(result.hydraulicPower), unit: "W" },
    { description: "Shaft output power  Pₒᵤₜ = η × Pₕ", formula: "P_{out} = η × P_h", calculation: `P_{out} = ${p(eta)} × ${p(result.hydraulicPower)} = ${p(result.outputPower)} W`, result: p(result.outputPower), unit: "W" },
    { description: "Power loss  ΔP = Pₕ − Pₒᵤₜ  (turbine losses)", calculation: `ΔP = ${p(result.hydraulicPower)} − ${p(result.outputPower)} = ${p(result.powerLoss)} W`, result: p(result.powerLoss), unit: "W" },
  ];
}

export interface FanLawsInput {
  speed1: number;
  speed2: number;
  flowRate1: number;
  pressure1: number;
  power1: number;
  density1?: number;
  density2?: number;
}
export interface FanLawsResult {
  speedRatio: number;    // N₂/N₁
  densityRatio: number;  // ρ₂/ρ₁
  flowRate2: number;     // m³/s
  pressure2: number;     // Pa
  power2: number;        // W
  flowRatio: number;     // Q₂/Q₁  = r
  pressureRatio: number; // ΔP₂/ΔP₁ = r² × (ρ₂/ρ₁)
  powerRatio: number;    // P₂/P₁  = r³ × (ρ₂/ρ₁)
  interpretation: string;
}
export function calculateFanLaws(input: FanLawsInput): FanLawsResult {
  const { speed1, speed2, flowRate1, pressure1, power1, density1 = 1.2, density2 = 1.2 } = input;
  const r  = speed2 / speed1;
  const dr = density2 / density1;
  const flowRate2 = flowRate1 * r;
  const pressure2 = pressure1 * r * r * dr;
  const power2    = power1    * r * r * r * dr;
  return {
    speedRatio: r, densityRatio: dr,
    flowRate2, pressure2, power2,
    flowRatio: r, pressureRatio: r * r * dr, powerRatio: r * r * r * dr,
    interpretation: `N₂/N₁=${r.toFixed(4)}, ρ₂/ρ₁=${dr.toFixed(4)}: Q₂=${flowRate2.toFixed(3)} m³/s, ΔP₂=${pressure2.toFixed(1)} Pa, P₂=${(power2/1000).toFixed(3)} kW.`,
  };
}
export function generateFanLawsSteps(input: FanLawsInput, result: FanLawsResult): Step[] {
  const { speed1, speed2, flowRate1, pressure1, power1, density1 = 1.2, density2 = 1.2 } = input;
  const r  = result.speedRatio;
  const dr = result.densityRatio;
  const p = (n: number) => parseFloat(n.toFixed(5)).toString();
  return [
    { description: "Speed ratio  r = N₂/N₁", formula: "r = N₂/N₁", calculation: `r = ${speed2} / ${speed1} = ${p(r)}`, result: p(r), unit: "dimensionless" },
    { description: "Density ratio  ρ₂/ρ₁", calculation: `ρ₂/ρ₁ = ${density2} / ${density1} = ${p(dr)}  ${Math.abs(dr - 1) < 0.001 ? "\\text{ (same density — no density correction)}" : "\\text{ (density correction applied)}"}`, result: p(dr), unit: "dimensionless" },
    { description: "Flow rate  Q₂ = Q₁ × r", formula: "Q₂/Q₁ = N₂/N₁", calculation: `Q₂ = ${p(flowRate1)} × ${p(r)} = ${p(result.flowRate2)} m³/s`, result: p(result.flowRate2), unit: "m³/s" },
    { description: "Pressure  ΔP₂ = ΔP₁ × r² × (ρ₂/ρ₁)", formula: "ΔP₂/ΔP₁ = (N₂/N₁)^{2} × (ρ₂/ρ₁)", calculation: `ΔP₂ = ${p(pressure1)} × (${p(r)})^{2} × ${p(dr)} = ${p(pressure1)} × ${p(r*r)} × ${p(dr)} = ${p(result.pressure2)} Pa`, result: p(result.pressure2), unit: "Pa" },
    { description: "Power  P₂ = P₁ × r³ × (ρ₂/ρ₁)", formula: "P₂/P₁ = (N₂/N₁)^{3} × (ρ₂/ρ₁)", calculation: `P₂ = ${p(power1)} × (${p(r)})^{3} × ${p(dr)} = ${p(power1)} × ${p(r*r*r)} × ${p(dr)} = ${p(result.power2)} W`, result: p(result.power2), unit: "W" },
  ];
}

export interface ImpellerTipSpeedInput {
  diameter: number;     // m
  rotationalSpeed: number; // rpm
}
export interface ImpellerTipSpeedResult {
  tipSpeed: number;        // m/s — u₂
  angularVelocity: number; // rad/s — ω
  centrifugalHead: number; // m — u₂²/(2g)
  eulerHead: number;       // m — u₂²/g (theoretical max Euler head)
  speedCategory: string;
  interpretation: string;
}
export function calculateImpellerTipSpeed(input: ImpellerTipSpeedInput): ImpellerTipSpeedResult {
  const { diameter, rotationalSpeed } = input;
  const angularVelocity = rotationalSpeed * 2 * Math.PI / 60;
  const tipSpeed = angularVelocity * diameter / 2;
  const centrifugalHead = tipSpeed * tipSpeed / (2 * 9.81);
  const eulerHead = tipSpeed * tipSpeed / 9.81;
  let speedCategory: string;
  let note: string;
  if (tipSpeed > 150) { speedCategory = "Very High (>150 m/s)"; note = "exceeds typical titanium limit — verify material"; }
  else if (tipSpeed > 80) { speedCategory = "High (80–150 m/s)"; note = "carbon steel / titanium range"; }
  else if (tipSpeed > 50) { speedCategory = "Medium (50–80 m/s)"; note = "stainless steel range"; }
  else if (tipSpeed > 30) { speedCategory = "Low-medium (30–50 m/s)"; note = "bronze / brass suitable"; }
  else { speedCategory = "Low (<30 m/s)"; note = "all common materials suitable"; }
  return { tipSpeed, angularVelocity, centrifugalHead, eulerHead, speedCategory, interpretation: `u₂ = ${tipSpeed.toFixed(2)} m/s — ${note}` };
}
export function generateImpellerTipSpeedSteps(input: ImpellerTipSpeedInput, result: ImpellerTipSpeedResult): Step[] {
  const p = (n: number) => parseFloat(n.toFixed(5)).toString();
  const { diameter, rotationalSpeed } = input;
  const r2 = diameter / 2;
  return [
    { description: "Convert rotational speed to angular velocity", formula: "ω = N × 2π / 60", calculation: `ω = ${rotationalSpeed} × 2π / 60 = ${p(result.angularVelocity)} rad/s` },
    { description: "Tip radius r₂ = D/2", formula: "r₂ = D / 2", calculation: `r₂ = ${p(diameter)} / 2 = ${p(r2)} m` },
    { description: "Peripheral tip speed u₂ = ω × r₂", formula: "u₂ = ω × r₂", calculation: `u₂ = ${p(result.angularVelocity)} × ${p(r2)} = ${p(result.tipSpeed)} m/s`, result: `${result.tipSpeed.toFixed(2)} m/s`, unit: "m/s" },
    { description: "Centrifugal head hc = u₂² / (2g)", formula: "h_c = u₂^{2} / (2g)", calculation: `hc = (${p(result.tipSpeed)})^{2} / (2 × 9.81) = ${p(result.centrifugalHead)} m` },
    { description: "Theoretical Euler head Hₑ = u₂² / g", formula: "H_e = u₂^{2} / g", calculation: `Hₑ = (${p(result.tipSpeed)})^{2} / 9.81 = ${p(result.eulerHead)} m`, result: `${result.eulerHead.toFixed(2)} m`, unit: "m" },
  ];
}

export interface SuctionSpecificSpeedInput {
  rotationalSpeed: number; // rpm
  flowRate: number;        // m³/s
  npsh: number;            // m
}
export interface SuctionSpecificSpeedResult {
  sss: number;
  omega: number;
  riskCategory: string;
  riskLevel: "low" | "moderate" | "high";
  interpretation: string;
}
export function calculateSuctionSpecificSpeed(input: SuctionSpecificSpeedInput): SuctionSpecificSpeedResult {
  const { rotationalSpeed, flowRate, npsh } = input;
  const omega = rotationalSpeed * 2 * Math.PI / 60;
  const sss = omega * Math.sqrt(flowRate) / Math.pow(9.81 * npsh, 0.75);
  let riskCategory: string;
  let riskLevel: "low" | "moderate" | "high";
  if (sss < 0.3) { riskCategory = "Low risk — safe cavitation margin"; riskLevel = "low"; }
  else if (sss < 0.5) { riskCategory = "Moderate risk — increase NPSHₐ margin"; riskLevel = "moderate"; }
  else { riskCategory = "High risk — cavitation-prone design"; riskLevel = "high"; }
  return { sss, omega, riskCategory, riskLevel, interpretation: `Ωss = ${sss.toFixed(4)}. ${riskCategory}.` };
}
export function generateSuctionSpecificSpeedSteps(input: SuctionSpecificSpeedInput, result: SuctionSpecificSpeedResult): Step[] {
  const p = (n: number) => parseFloat(n.toFixed(5)).toString();
  const { rotationalSpeed, flowRate, npsh } = input;
  const gNpsh = 9.81 * npsh;
  const gNpsh075 = Math.pow(gNpsh, 0.75);
  const sqrtQ = Math.sqrt(flowRate);
  return [
    { description: "Convert rotational speed to angular velocity", formula: "ω = N × 2π / 60", calculation: `ω = ${rotationalSpeed} × 2π / 60 = ${p(result.omega)} rad/s` },
    { description: "Square root of flow rate", formula: "√Q", calculation: `√${p(flowRate)} = ${p(sqrtQ)} m^{3/2}/s^{1/2}` },
    { description: "Denominator (g × NPSHᵣ)^{0.75}", formula: "(g \\cdot NPSH_r)^{0.75}", calculation: `(9.81 × ${p(npsh)})^{0.75} = (${p(gNpsh)})^{0.75} = ${p(gNpsh075)}` },
    { description: "Suction specific speed Ωss", formula: "\\Omega_{ss} = \\omega\\sqrt{Q} / (g \\cdot NPSH_r)^{0.75}", calculation: `Ωss = ${p(result.omega)} × ${p(sqrtQ)} / ${p(gNpsh075)} = ${p(result.sss)}`, result: `${result.sss.toFixed(4)}`, unit: "dimensionless" },
  ];
}

// ============================================================================
// PIPE NETWORKS
// ============================================================================

export interface SeriesPipeInput {
  pipes: Array<{
    length: number;        // m
    diameter: number;      // m
    roughness: number;     // m
  }>;
  flowRate: number;        // m³/s
  density: number;         // kg/m³
  viscosity: number;       // Pa·s
}
export interface SeriesPipeResult {
  totalHeadLoss: number;       // m
  pressureDrop: number;        // Pa — ρg × hf,total
  velocities: number[];        // m/s per pipe
  headLosses: number[];        // m per pipe
  reynoldsNumbers: number[];   // Re per pipe
  frictionFactors: number[];   // Darcy f per pipe
  regimes: string[];           // "Laminar" | "Turbulent"
  interpretation: string;
}
export function calculateSeriesPipe(input: SeriesPipeInput): SeriesPipeResult {
  const { pipes, flowRate, density, viscosity } = input;
  const headLosses: number[] = [];
  const velocities: number[] = [];
  const reynoldsNumbers: number[] = [];
  const frictionFactors: number[] = [];
  const regimes: string[] = [];
  let totalHeadLoss = 0;
  for (const pipe of pipes) {
    const area = Math.PI * Math.pow(pipe.diameter / 2, 2);
    const velocity = flowRate / area;
    const Re = density * velocity * pipe.diameter / viscosity;
    let f: number;
    let regime: string;
    if (Re < 2300) {
      f = 64 / Re;
      regime = "Laminar";
    } else {
      const eD = pipe.roughness / pipe.diameter;
      f = 0.25 / Math.pow(Math.log10(eD / 3.7 + 5.74 / Math.pow(Re, 0.9)), 2);
      regime = "Turbulent";
    }
    const hf = f * pipe.length / pipe.diameter * velocity * velocity / (2 * 9.81);
    headLosses.push(hf);
    velocities.push(velocity);
    reynoldsNumbers.push(Re);
    frictionFactors.push(f);
    regimes.push(regime);
    totalHeadLoss += hf;
  }
  const pressureDrop = density * 9.81 * totalHeadLoss;
  return { totalHeadLoss, pressureDrop, velocities, headLosses, reynoldsNumbers, frictionFactors, regimes, interpretation: `Total head loss = ${totalHeadLoss.toFixed(3)} m (ΔP = ${(pressureDrop / 1000).toFixed(2)} kPa) across ${pipes.length} pipes in series.` };
}
export function generateSeriesPipeSteps(input: SeriesPipeInput, result: SeriesPipeResult): Step[] {
  const p = (n: number) => parseFloat(n.toFixed(5)).toString();
  const steps: Step[] = [
    { description: "Series principle — same flow through every pipe", formula: "Q_1 = Q_2 = Q = \\text{const}" },
    { description: "Total head loss equals the sum of individual losses", formula: "h_{f,\\text{total}} = \\sum h_{f,i} = \\sum f_i \\frac{L_i}{D_i} \\frac{V_i^2}{2g}" },
  ];
  for (let i = 0; i < input.pipes.length; i++) {
    const pipe = input.pipes[i];
    const area = Math.PI * Math.pow(pipe.diameter / 2, 2);
    const V = result.velocities[i];
    const Re = result.reynoldsNumbers[i];
    const f = result.frictionFactors[i];
    const hf = result.headLosses[i];
    const n = i + 1;
    steps.push({ description: `Pipe ${n} — cross-section area A = π(D/2)²`, formula: `A_{${n}} = \\pi (D_{${n}}/2)^2`, calculation: `A${n} = π × (${p(pipe.diameter)}/2)² = ${p(area)} m²` });
    steps.push({ description: `Pipe ${n} — mean velocity V = Q/A`, formula: `V_{${n}} = Q / A_{${n}}`, calculation: `V${n} = ${p(input.flowRate)} / ${p(area)} = ${p(V)} m/s` });
    steps.push({ description: `Pipe ${n} — Reynolds number Re = ρVD/μ`, formula: `Re_{${n}} = \\rho V_{${n}} D_{${n}} / \\mu`, calculation: `Re${n} = ${input.density} × ${p(V)} × ${p(pipe.diameter)} / ${input.viscosity} = ${Math.round(Re)} \\to \\text{ ${result.regimes[i]}}` });
    if (result.regimes[i] === "Laminar") {
      steps.push({ description: `Pipe ${n} — friction factor (laminar): f = 64/Re`, formula: `f_{${n}} = 64 / Re_{${n}}`, calculation: `f${n} = 64 / ${Math.round(Re)} = ${p(f)}` });
    } else {
      const eD = pipe.roughness / pipe.diameter;
      steps.push({ description: `Pipe ${n} — friction factor (Swamee-Jain turbulent)`, formula: `f_{${n}} = 0.25 / [\\log_{10}(\\varepsilon/3.7D + 5.74/Re^{0.9})]^2`, calculation: `ε/D = ${p(eD)},  f${n} = ${p(f)}` });
    }
    steps.push({ description: `Pipe ${n} — Darcy-Weisbach head loss`, formula: `h_{f${n}} = f_{${n}} \\frac{L_{${n}}}{D_{${n}}} \\frac{V_{${n}}^2}{2g}`, calculation: `h_{f${n}} = ${p(f)} × ${pipe.length}/${p(pipe.diameter)} × (${p(V)})^{2}/(2×9.81) = ${p(hf)} m` });
  }
  steps.push({ description: "Total head loss — sum of pipe losses", formula: "h_{f,\\text{total}} = " + result.headLosses.map((h, i) => `h_{f${i + 1}}`).join(" + "), calculation: result.headLosses.map(h => `${p(h)}`).join(" + ") + ` = ${p(result.totalHeadLoss)} m`, result: `${result.totalHeadLoss.toFixed(3)} m`, unit: "m" });
  steps.push({ description: "Equivalent pressure drop ΔP = ρg × hf,total", formula: "\\Delta P = \\rho g h_{f,\\text{total}}", calculation: `ΔP = ${input.density} × 9.81 × ${p(result.totalHeadLoss)} = ${p(result.pressureDrop)} Pa`, result: `${(result.pressureDrop / 1000).toFixed(3)} kPa`, unit: "kPa" });
  return steps;
}

export interface ParallelPipeInput {
  pipes: Array<{
    length: number;
    diameter: number;
    roughness: number;
  }>;
  totalFlowRate: number;
  density: number;
  viscosity: number;
}
export interface ParallelPipeResult {
  headLoss: number;        // m — common head loss across all branches
  pressureDrop: number;    // Pa
  flowRates: number[];     // m³/s per branch
  velocities: number[];    // m/s per branch
  reynoldsNumbers: number[];
  frictionFactors: number[];
  conductances: number[];  // C_i = A_i √(2g D_i / (f_i L_i))
  regimes: string[];
  flowFractions: number[]; // Q_i / Q_total
  interpretation: string;
}
export function calculateParallelPipe(input: ParallelPipeInput): ParallelPipeResult {
  const { pipes, totalFlowRate, density, viscosity } = input;
  const areas = pipes.map(p => Math.PI * Math.pow(p.diameter / 2, 2));

  // Initialise friction factors from equal-distribution guess
  let fs = pipes.map((pipe, i) => {
    const V0 = (totalFlowRate / pipes.length) / areas[i];
    const Re0 = density * V0 * pipe.diameter / viscosity;
    return Re0 < 2300 ? 64 / Re0 : 0.02;
  });

  // Iterate: update f from actual branch flows until convergence
  let flowRates = pipes.map(() => totalFlowRate / pipes.length);
  for (let iter = 0; iter < 60; iter++) {
    const conductances = pipes.map((pipe, i) =>
      areas[i] * Math.sqrt(2 * 9.81 * pipe.diameter / (fs[i] * pipe.length))
    );
    const sumC = conductances.reduce((a, b) => a + b, 0);
    const sqrtHf = totalFlowRate / sumC;
    const newQ = conductances.map(C => C * sqrtHf);
    const newFs = pipes.map((pipe, i) => {
      const V = newQ[i] / areas[i];
      const Re = density * V * pipe.diameter / viscosity;
      const eD = pipe.roughness / pipe.diameter;
      return Re < 2300 ? 64 / Re : 0.25 / Math.pow(Math.log10(eD / 3.7 + 5.74 / Math.pow(Re, 0.9)), 2);
    });
    const maxChange = newQ.reduce((mx, q, i) => Math.max(mx, Math.abs(q - flowRates[i]) / totalFlowRate), 0);
    flowRates = newQ;
    fs = newFs;
    if (maxChange < 1e-9) break;
  }

  const conductances = pipes.map((pipe, i) =>
    areas[i] * Math.sqrt(2 * 9.81 * pipe.diameter / (fs[i] * pipe.length))
  );
  const sumC = conductances.reduce((a, b) => a + b, 0);
  const headLoss = Math.pow(totalFlowRate / sumC, 2);
  const finalQ = conductances.map(C => C * Math.sqrt(headLoss));
  const velocities = pipes.map((_, i) => finalQ[i] / areas[i]);
  const reynoldsNumbers = pipes.map((pipe, i) => density * velocities[i] * pipe.diameter / viscosity);
  const regimes = reynoldsNumbers.map(Re => Re < 2300 ? "Laminar" : "Turbulent");
  const flowFractions = finalQ.map(q => q / totalFlowRate);
  const pressureDrop = density * 9.81 * headLoss;

  return { headLoss, pressureDrop, flowRates: finalQ, velocities, reynoldsNumbers, frictionFactors: fs, conductances, regimes, flowFractions, interpretation: `Common head loss hf = ${headLoss.toFixed(3)} m (ΔP = ${(pressureDrop / 1000).toFixed(2)} kPa). Branch flows: ${finalQ.map((q, i) => `Q${i + 1} = ${q.toFixed(4)} m³/s`).join(', ')}.` };
}
export function generateParallelPipeSteps(input: ParallelPipeInput, result: ParallelPipeResult): Step[] {
  const p = (n: number) => parseFloat(n.toFixed(5)).toString();
  const steps: Step[] = [
    { description: "Parallel principle — equal head loss across every branch", formula: "h_{f,1} = h_{f,2} = h_f" },
    { description: "Continuity — total flow is the sum of branch flows", formula: "Q_{\\text{total}} = Q_1 + Q_2" },
    { description: "Conductance method: Q_i = C_i √(hf)  where  C_i = A_i √(2g D_i / (f_i L_i))", formula: "\\sum C_i = Q_{\\text{total}} / \\sqrt{h_f}" },
  ];
  const areas = input.pipes.map(p => Math.PI * Math.pow(p.diameter / 2, 2));
  for (let i = 0; i < input.pipes.length; i++) {
    const pipe = input.pipes[i];
    const A = areas[i];
    const f = result.frictionFactors[i];
    const C = result.conductances[i];
    const Q = result.flowRates[i];
    const Re = result.reynoldsNumbers[i];
    const n = i + 1;
    steps.push({ description: `Pipe ${n} — flow area`, formula: `A_{${n}} = \\pi (D_{${n}}/2)^2`, calculation: `A${n} = π × (${p(pipe.diameter)}/2)² = ${p(A)} m²` });
    if (result.regimes[i] === "Laminar") {
      steps.push({ description: `Pipe ${n} — friction factor (laminar, iterated)`, formula: `f_{${n}} = 64 / Re_{${n}}`, calculation: `Re${n} = ${Math.round(Re)},  f${n} = ${p(f)}` });
    } else {
      steps.push({ description: `Pipe ${n} — friction factor (Swamee-Jain, iterated)`, formula: `f_{${n}} = 0.25/[\\log_{10}(\\varepsilon/3.7D+5.74/Re^{0.9})]^2`, calculation: `Re${n} = ${Math.round(Re).toLocaleString()},  f${n} = ${p(f)}` });
    }
    steps.push({ description: `Pipe ${n} — hydraulic conductance C${n}`, formula: `C_{${n}} = A_{${n}} \\sqrt{2g D_{${n}} / (f_{${n}} L_{${n}})}`, calculation: `C${n} = ${p(A)} × √(2×9.81×${p(pipe.diameter)}/(${p(f)}×${pipe.length})) = ${p(C)}` });
  }
  const sumC = result.conductances.reduce((a, b) => a + b, 0);
  steps.push({ description: "Sum of conductances ΣC = C₁ + C₂", formula: "\\Sigma C = C_1 + C_2", calculation: result.conductances.map(c => p(c)).join(" + ") + ` = ${p(sumC)}` });
  steps.push({ description: "Common head loss hf = (Q_total / ΣC)²", formula: "h_f = (Q_{\\text{total}} / \\Sigma C)^2", calculation: `hf = (${p(input.totalFlowRate)} / ${p(sumC)})^{2} = ${p(result.headLoss)} m`, result: `${result.headLoss.toFixed(3)} m`, unit: "m" });
  for (let i = 0; i < input.pipes.length; i++) {
    const n = i + 1;
    steps.push({ description: `Pipe ${n} — branch flow Q${n} = C${n} × √hf`, formula: `Q_{${n}} = C_{${n}} \\sqrt{h_f}`, calculation: `Q${n} = ${p(result.conductances[i])} × √${p(result.headLoss)} = ${p(result.flowRates[i])} m³/s  (${(result.flowFractions[i] * 100).toFixed(1)}%)` });
  }
  steps.push({ description: "Pressure drop ΔP = ρg × hf", formula: "\\Delta P = \\rho g h_f", calculation: `ΔP = ${input.density} × 9.81 × ${p(result.headLoss)} = ${p(result.pressureDrop)} Pa`, result: `${(result.pressureDrop / 1000).toFixed(3)} kPa`, unit: "kPa" });
  return steps;
}

export interface WaterHammerInput {
  velocity: number;       // m/s (initial flow velocity)
  wavespeed: number;      // m/s (acoustic wavespeed in pipe)
  density: number;        // kg/m³
}
export interface WaterHammerResult {
  pressureSurge: number;  // Pa
  pressureSurgeBar: number;
  interpretation: string;
}
export function calculateWaterHammer(input: WaterHammerInput): WaterHammerResult {
  const { velocity, wavespeed, density } = input;
  const pressureSurge = density * wavespeed * velocity;
  const pressureSurgeBar = pressureSurge / 1e5;
  return { pressureSurge, pressureSurgeBar, interpretation: `Joukowsky pressure surge ΔP = ${pressureSurgeBar.toFixed(3)} bar (${(pressureSurge / 1000).toFixed(1)} kPa) for instantaneous valve closure.` };
}
export function generateWaterHammerSteps(input: WaterHammerInput, result: WaterHammerResult): Step[] {
  return [
    { description: "Joukowsky water hammer equation", formula: "ΔP = ρ × a × ΔV" },
    { description: "Substitute values", calculation: `ΔP = ${input.density} × ${input.wavespeed} × ${input.velocity}` },
    { description: "Pressure surge", calculation: `ΔP = ${result.pressureSurge.toFixed(0)} Pa = ${result.pressureSurgeBar.toFixed(3)} bar`, result: `${result.pressureSurge.toFixed(0)} Pa`, unit: "Pa" },
  ];
}

export interface ColebrookWhiteInput {
  reynoldsNumber: number;
  relativeRoughness: number; // ε/D
}
export interface ColebrookWhiteResult {
  frictionFactor: number;   // Darcy f (Colebrook-White)
  fanningFactor: number;    // f / 4
  swameeJainF: number;      // explicit Swamee-Jain approximation
  swameeJainError: number;  // % relative error vs CW
  regime: string;
  regimeNote: string;
  iterations: number;
  isLaminar: boolean;
  isTransitional: boolean;
  interpretation: string;
}
export function calculateColebrookWhite(input: ColebrookWhiteInput): ColebrookWhiteResult {
  const { reynoldsNumber: Re, relativeRoughness: eD } = input;

  const swameeJainF = eD > 0
    ? 0.25 / Math.pow(Math.log10(eD / 3.7 + 5.74 / Math.pow(Re, 0.9)), 2)
    : 0.316 / Math.pow(Re, 0.25); // Blasius smooth-pipe fallback

  if (Re < 2300) {
    const f = 64 / Re;
    return { frictionFactor: f, fanningFactor: f / 4, swameeJainF, swameeJainError: 0, regime: "Laminar", regimeNote: "f = 64/Re (Hagen-Poiseuille)", iterations: 0, isLaminar: true, isTransitional: false, interpretation: `Laminar flow: f = 64/Re = ${f.toFixed(5)}.` };
  }

  const isTransitional = Re < 4000;
  // Iterate Colebrook-White using Swamee-Jain as starting guess
  let f = swameeJainF;
  let iter = 0;
  for (; iter < 60; iter++) {
    const fNew = 1 / Math.pow(-2 * Math.log10(eD / 3.7 + 2.51 / (Re * Math.sqrt(f))), 2);
    if (Math.abs(fNew - f) < 1e-10) { f = fNew; break; }
    f = fNew;
  }

  // Classify turbulent sub-regime
  const smoothTerm = 2.51 / (Re * Math.sqrt(f));
  const roughTerm  = eD / 3.7;
  let regime: string;
  let regimeNote: string;
  if (isTransitional) {
    regime = "Transitional"; regimeNote = "2300 ≤ Re < 4000 — unstable; CW result is uncertain";
  } else if (eD === 0 || roughTerm < 0.001 * smoothTerm) {
    regime = "Smooth turbulent"; regimeNote = "ε/D ≈ 0; friction governed by viscous sublayer";
  } else if (smoothTerm < 0.001 * roughTerm) {
    regime = "Fully rough turbulent"; regimeNote = "f independent of Re; f = 1/(−2log(ε/3.7D))²";
  } else {
    regime = "Transitionally rough turbulent"; regimeNote = "Both roughness and Re influence f";
  }

  const swameeJainError = Math.abs(f - swameeJainF) / f * 100;
  return { frictionFactor: f, fanningFactor: f / 4, swameeJainF, swameeJainError, regime, regimeNote, iterations: iter, isLaminar: false, isTransitional, interpretation: `Darcy f = ${f.toFixed(5)} (${regime}, ${iter} iterations). Swamee-Jain error: ${swameeJainError.toFixed(2)}%.` };
}
export function generateColebrookWhiteSteps(input: ColebrookWhiteInput, result: ColebrookWhiteResult): Step[] {
  const p = (n: number) => parseFloat(n.toFixed(6)).toString();
  const { reynoldsNumber: Re, relativeRoughness: eD } = input;

  if (result.isLaminar) {
    return [
      { description: "Flow regime: Re < 2300 → Laminar flow", formula: "Re = " + Re.toFixed(0) },
      { description: "Laminar friction factor (Hagen-Poiseuille)", formula: "f = 64 / Re", calculation: `f = 64 / ${Re.toFixed(0)} = ${p(result.frictionFactor)}`, result: `${result.frictionFactor.toFixed(5)}`, unit: "dimensionless" },
      { description: "Fanning friction factor = f/4", formula: "f_{\\text{Fanning}} = f / 4", calculation: `f_F = ${p(result.frictionFactor)} / 4 = ${p(result.fanningFactor)}` },
    ];
  }

  const steps: Step[] = [
    { description: `Flow regime check: Re = ${Re.toFixed(0)} → ${result.regime}`, formula: "1/\\sqrt{f} = -2\\log_{10}\\!\\left(\\frac{\\varepsilon/D}{3.7} + \\frac{2.51}{Re\\sqrt{f}}\\right)" },
    { description: "Initial guess — Swamee-Jain explicit approximation", formula: "f_0 = 0.25 / [\\log_{10}(\\varepsilon/(3.7D) + 5.74/Re^{0.9})]^2", calculation: `f₀ = ${p(result.swameeJainF)}` },
  ];

  // Show up to 3 Colebrook-White iterations
  let f = result.swameeJainF;
  const maxShow = Math.min(3, result.iterations);
  for (let i = 1; i <= maxShow; i++) {
    const rhs = -2 * Math.log10(eD / 3.7 + 2.51 / (Re * Math.sqrt(f)));
    const fNew = 1 / (rhs * rhs);
    steps.push({
      description: `Iteration ${i}`,
      formula: `1/\\sqrt{f_{${i}}} = -2\\log_{10}\\!\\left(\\frac{${p(eD)}}{3.7} + \\frac{2.51}{${Re.toFixed(0)}\\sqrt{${p(f)}}}\\right)`,
      calculation: `RHS = ${p(rhs)},   f${i} = 1/(${p(rhs)})^{2} = ${p(fNew)}`,
    });
    f = fNew;
  }

  if (result.iterations > 3) {
    steps.push({ description: `Iterations 4–${result.iterations}: continued until |Δf| < 10⁻¹⁰`, calculation: `Converged: f = ${p(result.frictionFactor)}` });
  }

  steps.push({ description: "Darcy (Moody) friction factor", formula: "f_{\\text{Darcy}}", calculation: `f = ${p(result.frictionFactor)}`, result: `${result.frictionFactor.toFixed(5)}`, unit: "dimensionless" });
  steps.push({ description: "Fanning friction factor", formula: "f_{\\text{Fanning}} = f_{\\text{Darcy}} / 4", calculation: `f_F = ${p(result.frictionFactor)} / 4 = ${p(result.fanningFactor)}` });
  steps.push({ description: "Swamee-Jain comparison (explicit approximation)", formula: "f_{SJ} = 0.25/[\\log_{10}(\\varepsilon/3.7D + 5.74/Re^{0.9})]^2", calculation: `f_{SJ} = ${p(result.swameeJainF)},\\quad \\text{error} = ${result.swameeJainError.toFixed(3)}\\%` });

  return steps;
}

export interface SwameeJainInput {
  reynoldsNumber: number;
  relativeRoughness: number;
}
export interface SwameeJainResult {
  frictionFactor: number;   // Darcy f (Swamee-Jain explicit)
  fanningFactor: number;    // f / 4
  colebrookWhiteF: number;  // CW iterated reference
  cwError: number;          // % relative error vs CW
  inRange: boolean;         // within stated validity bounds
  rangeNote: string;
  regime: string;
  isLaminar: boolean;
  interpretation: string;
}
export function calculateSwameeJain(input: SwameeJainInput): SwameeJainResult {
  const { reynoldsNumber: Re, relativeRoughness: eD } = input;

  // Laminar branch
  if (Re < 2300) {
    const f = 64 / Re;
    return { frictionFactor: f, fanningFactor: f / 4, colebrookWhiteF: f, cwError: 0, inRange: false, rangeNote: "Laminar — use f = 64/Re; SJ not applicable", regime: "Laminar", isLaminar: true, interpretation: `Laminar flow: f = 64/Re = ${f.toFixed(5)}.` };
  }

  // Validity range check
  const reInRange  = Re  >= 3000 && Re  <= 3e8;
  const eDInRange  = eD  >= 1e-6 && eD  <= 1e-2;
  const inRange    = reInRange && eDInRange;
  const rangeNote  = inRange
    ? "Within stated validity range (3×10³ < Re < 3×10⁸, 10⁻⁶ < ε/D < 10⁻²)"
    : [
        !reInRange ? `Re = ${Re.toExponential(2)} is outside 3×10³–3×10⁸` : "",
        !eDInRange ? `ε/D = ${eD} is outside 10⁻⁶–10⁻²` : "",
      ].filter(Boolean).join("; ");

  const frictionFactor = 0.25 / Math.pow(Math.log10(eD / 3.7 + 5.74 / Math.pow(Re, 0.9)), 2);

  // CW exact reference (fixed-point iteration)
  let fCW = frictionFactor;
  for (let i = 0; i < 60; i++) {
    const fNew = 1 / Math.pow(-2 * Math.log10(eD / 3.7 + 2.51 / (Re * Math.sqrt(fCW))), 2);
    if (Math.abs(fNew - fCW) < 1e-10) { fCW = fNew; break; }
    fCW = fNew;
  }

  const cwError = Math.abs(frictionFactor - fCW) / fCW * 100;
  const regime  = Re < 4000 ? "Transitional" : "Turbulent";

  return { frictionFactor, fanningFactor: frictionFactor / 4, colebrookWhiteF: fCW, cwError, inRange, rangeNote, regime, isLaminar: false, interpretation: `f = ${frictionFactor.toFixed(5)} (explicit, ${cwError.toFixed(2)}% error vs Colebrook-White).` };
}
export function generateSwameeJainSteps(input: SwameeJainInput, result: SwameeJainResult): Step[] {
  const p = (n: number) => parseFloat(n.toFixed(6)).toString();
  const { reynoldsNumber: Re, relativeRoughness: eD } = input;

  if (result.isLaminar) {
    return [
      { description: "Flow regime: Re < 2300 — Swamee-Jain is not applicable", formula: "Re = " + Re.toFixed(0) },
      { description: "Use Hagen-Poiseuille for laminar flow instead", formula: "f = 64 / Re", calculation: `f = 64 / ${Re.toFixed(0)} = ${p(result.frictionFactor)}`, result: `${result.frictionFactor.toFixed(5)}`, unit: "dimensionless" },
    ];
  }

  const termA  = eD / 3.7;
  const termB  = 5.74 / Math.pow(Re, 0.9);
  const logArg = termA + termB;
  const logVal = Math.log10(logArg);

  return [
    { description: "Swamee-Jain explicit equation (no iteration required)", formula: "f = 0.25 / [\\log_{10}(\\varepsilon/(3.7D) + 5.74/Re^{0.9})]^{2}" },
    { description: "Roughness term  ε/(3.7D)", formula: "\\varepsilon/(3.7D) = \\varepsilon/D \\div 3.7", calculation: `${p(eD)} / 3.7 = ${p(termA)}` },
    { description: "Viscous term  5.74 / Re⁰·⁹", formula: "5.74 / Re^{0.9}", calculation: `5.74 / (${Re.toFixed(0)})^{0.9} = ${p(termB)}` },
    { description: "Sum of terms", formula: "\\varepsilon/(3.7D) + 5.74/Re^{0.9}", calculation: `${p(termA)} + ${p(termB)} = ${p(logArg)}` },
    { description: "log₁₀ of the sum", formula: "\\log_{10}(\\text{sum})", calculation: `\\log_{10}(${p(logArg)}) = ${p(logVal)}` },
    { description: "Darcy friction factor f = 0.25 / (log₁₀)²", formula: "f = 0.25 / (\\log_{10})^{2}", calculation: `f = 0.25 / (${p(logVal)})^{2} = ${p(result.frictionFactor)}`, result: `${result.frictionFactor.toFixed(5)}`, unit: "dimensionless" },
    { description: "Fanning friction factor = f / 4", formula: "f_{\\text{Fanning}} = f / 4", calculation: `f_F = ${p(result.frictionFactor)} / 4 = ${p(result.fanningFactor)}` },
    { description: "Colebrook-White exact reference (iterated)", formula: "f_{CW}", calculation: `f_{CW} = ${p(result.colebrookWhiteF)},\\quad \\text{error} = ${result.cwError.toFixed(3)}\\%` },
  ];
}

export interface HazenWilliamsInput {
  C: number;
  hydraulicRadius: number; // m — Rₕ = D/4 for full circular pipe
  slope: number;           // m/m — hydraulic gradient hf/L
  diameter?: number;       // m — optional; enables flow rate output
}
export interface HazenWilliamsResult {
  velocity: number;          // m/s
  velocityFts: number;       // ft/s
  flowRate: number | null;   // m³/s — null when diameter not given
  headLossPer100m: number;   // m per 100 m
  pressureDropPerM: number;  // Pa/m — ρ_water × g × S
  interpretation: string;
}
export function calculateHazenWilliams(input: HazenWilliamsInput): HazenWilliamsResult {
  const { C, hydraulicRadius: Rh, slope: S, diameter } = input;
  const velocity = 0.8492 * C * Math.pow(Rh, 0.63) * Math.pow(S, 0.54);
  const velocityFts = velocity * 3.28084;
  const flowRate = diameter != null ? velocity * Math.PI * Math.pow(diameter / 2, 2) : null;
  const headLossPer100m = S * 100;
  const pressureDropPerM = 998 * 9.81 * S; // water at 20°C
  return { velocity, velocityFts, flowRate, headLossPer100m, pressureDropPerM, interpretation: `V = ${velocity.toFixed(3)} m/s, hf = ${headLossPer100m.toFixed(3)} m per 100 m.` };
}
export function generateHazenWilliamsSteps(input: HazenWilliamsInput, result: HazenWilliamsResult): Step[] {
  const p = (n: number) => parseFloat(n.toFixed(5)).toString();
  const { C, hydraulicRadius: Rh, slope: S, diameter } = input;
  const Rh063 = Math.pow(Rh, 0.63);
  const S054  = Math.pow(S,  0.54);

  const steps: Step[] = [
    { description: "Hazen-Williams formula (SI)", formula: "V = 0.8492 \\times C \\times R_h^{0.63} \\times S^{0.54}" },
    { description: "Rₕ raised to power 0.63", formula: "R_h^{0.63}", calculation: `(${p(Rh)})^{0.63} = ${p(Rh063)}` },
    { description: "Slope S raised to power 0.54", formula: "S^{0.54}", calculation: `(${p(S)})^{0.54} = ${p(S054)}` },
    { description: "Flow velocity", formula: "V = 0.8492 \\times C \\times R_h^{0.63} \\times S^{0.54}", calculation: `V = 0.8492 \\times ${C} \\times ${p(Rh063)} \\times ${p(S054)} = ${p(result.velocity)}`, result: `${result.velocity.toFixed(3)} m/s`, unit: "m/s" },
    { description: "Head loss per 100 m of pipe", formula: "h_f = S \\times 100", calculation: `h_f = ${p(S)} \\times 100 = ${p(result.headLossPer100m)}` },
    { description: "Pressure drop per metre (water, 20°C)", formula: "\\Delta P/L = \\rho g S", calculation: `ΔP/L = 998 × 9.81 × ${p(S)} = ${p(result.pressureDropPerM)} Pa/m` },
  ];

  if (diameter != null && result.flowRate != null) {
    const A = Math.PI * Math.pow(diameter / 2, 2);
    steps.push({ description: "Cross-section area A = π(D/2)²", formula: "A = \\pi (D/2)^2", calculation: `A = \\pi \\times (${p(diameter)}/2)^2 = ${p(A)}` });
    steps.push({ description: "Volume flow rate Q = V × A", formula: "Q = V \\times A", calculation: `Q = ${p(result.velocity)} × ${p(A)} = ${p(result.flowRate)} m³/s`, result: `${result.flowRate.toFixed(5)} m³/s`, unit: "m³/s" });
  }

  return steps;
}

export interface PipeSizingInput {
  flowRate: number;    // m³/s
  headLoss: number;    // m
  length: number;      // m
  roughness: number;   // m
  density: number;     // kg/m³
  viscosity: number;   // Pa·s
}
export interface PipeSizingResult {
  diameter: number;          // m
  diameterMm: number;        // mm
  velocity: number;          // m/s
  frictionFactor: number;
  reynoldsNumber: number;
  relativeRoughness: number; // ε/D
  regime: string;
  pressureDrop: number;      // Pa
  verifiedHeadLoss: number;  // m — back-computed from DW to confirm convergence
  iterations: number;
  interpretation: string;
}
export function calculatePipeSizing(input: PipeSizingInput): PipeSizingResult {
  const { flowRate, headLoss, length, roughness, density, viscosity } = input;
  // Velocity-based initial guess: assume V ≈ 1.5 m/s
  let D = Math.pow(4 * flowRate / (Math.PI * 1.5), 0.5);
  let iters = 0;
  for (; iters < 60; iters++) {
    const area = Math.PI * D * D / 4;
    const V = flowRate / area;
    const Re = density * V * D / viscosity;
    const eD = roughness / D;
    const f = Re < 2300 ? 64 / Re : 0.25 / Math.pow(Math.log10(eD / 3.7 + 5.74 / Math.pow(Re, 0.9)), 2);
    const Dnew = Math.pow(f * length * 8 * flowRate * flowRate / (Math.PI * Math.PI * 9.81 * headLoss), 0.2);
    if (Math.abs(Dnew - D) / D < 1e-8) { D = Dnew; break; }
    D = Dnew;
  }
  const area = Math.PI * D * D / 4;
  const velocity = flowRate / area;
  const Re = density * velocity * D / viscosity;
  const eD = roughness / D;
  const frictionFactor = Re < 2300 ? 64 / Re : 0.25 / Math.pow(Math.log10(eD / 3.7 + 5.74 / Math.pow(Re, 0.9)), 2);
  const verifiedHeadLoss = frictionFactor * length / D * velocity * velocity / (2 * 9.81);
  const pressureDrop = density * 9.81 * verifiedHeadLoss;
  const regime = Re < 2300 ? "Laminar" : "Turbulent";
  return { diameter: D, diameterMm: D * 1000, velocity, frictionFactor, reynoldsNumber: Re, relativeRoughness: eD, regime, pressureDrop, verifiedHeadLoss, iterations: iters, interpretation: `D = ${(D * 1000).toFixed(1)} mm, V = ${velocity.toFixed(2)} m/s, Re = ${Math.round(Re).toLocaleString()} (${regime}).` };
}
export function generatePipeSizingSteps(input: PipeSizingInput, result: PipeSizingResult): Step[] {
  const p = (n: number) => parseFloat(n.toFixed(5)).toString();
  const { flowRate: Q, headLoss: hf, length: L, roughness: eps, density: rho, viscosity: mu } = input;

  // Reproduce first iteration for display
  const D0 = Math.pow(4 * Q / (Math.PI * 1.5), 0.5);
  const A0 = Math.PI * D0 * D0 / 4;
  const V0 = Q / A0;
  const Re0 = rho * V0 * D0 / mu;
  const eD0 = eps / D0;
  const f0 = Re0 < 2300 ? 64 / Re0 : 0.25 / Math.pow(Math.log10(eD0 / 3.7 + 5.74 / Math.pow(Re0, 0.9)), 2);
  const D1 = Math.pow(f0 * L * 8 * Q * Q / (Math.PI * Math.PI * 9.81 * hf), 0.2);

  const D = result.diameter;
  const V = result.velocity;
  const Re = result.reynoldsNumber;
  const f = result.frictionFactor;

  return [
    { description: "Darcy-Weisbach rearranged for D", formula: "D = \\left(\\frac{8fLQ^2}{\\pi^2 g h_f}\\right)^{1/5}" },
    { description: "Initial guess — velocity-based estimate (V₀ ≈ 1.5 m/s)", formula: "D_0 = \\sqrt{4Q/(\\pi V_0)}", calculation: `D_0 = \\sqrt{4 \\times ${p(Q)} / (\\pi \\times 1.5)} = ${p(D0)}` },
    { description: "Iteration 1 — friction factor f at D₀", formula: result.regime === "Laminar" ? "f_0 = 64/Re_0" : "f_0 = 0.25/[\\log_{10}(\\varepsilon/3.7D_0 + 5.74/Re_0^{0.9})]^2", calculation: `Re_0 = ${Math.round(Re0).toLocaleString()},\\quad f_0 = ${p(f0)}` },
    { description: "Iteration 1 — updated diameter D₁", formula: "D_1 = (8 f_0 L Q^2 / (\\pi^2 g h_f))^{1/5}", calculation: `D_1 = (8 \\times ${p(f0)} \\times ${p(L)} \\times ${p(Q)}^2 / (\\pi^2 \\times 9.81 \\times ${p(hf)}))^{0.2} = ${p(D1)}` },
    { description: `Continued for ${result.iterations} iterations until |ΔD/D| < 10⁻⁸`, calculation: `\\text{Converged: } D = ${p(D)}\\ \\text{m} = ${p(D * 1000)}\\ \\text{mm}` },
    { description: "Final velocity V = Q / A = 4Q / (πD²)", formula: "V = 4Q / (\\pi D^2)", calculation: `V = 4 \\times ${p(Q)} / (\\pi \\times ${p(D)}^2) = ${p(V)}` },
    { description: "Reynolds number Re = ρVD/μ", formula: "Re = \\rho V D / \\mu", calculation: `Re = ${rho} \\times ${p(V)} \\times ${p(D)} / ${mu} = ${Math.round(Re).toLocaleString()} \\to \\text{ ${result.regime}}` },
    { description: "Darcy friction factor (Swamee-Jain)", formula: result.regime === "Laminar" ? "f = 64/Re" : "f = 0.25/[\\log_{10}(\\varepsilon/3.7D + 5.74/Re^{0.9})]^2", calculation: `\\varepsilon/D = ${p(result.relativeRoughness)},\\quad f = ${p(f)}` },
    { description: "Required pipe diameter", formula: "D", calculation: `D = ${p(D)}\\ \\text{m} = ${p(D * 1000)}\\ \\text{mm}`, result: `${result.diameterMm.toFixed(1)} mm`, unit: "mm" },
    { description: "Verification — Darcy-Weisbach back-check", formula: "h_{f,\\text{check}} = f \\frac{L}{D} \\frac{V^2}{2g}", calculation: `h_f = ${p(f)} \\times ${p(L)} / ${p(D)} \\times ${p(V)}^2 / (2 \\times 9.81) = ${p(result.verifiedHeadLoss)}` },
    { description: "Equivalent pressure drop", formula: "\\Delta P = \\rho g h_f", calculation: `\\Delta P = ${rho} \\times 9.81 \\times ${p(result.verifiedHeadLoss)} = ${p(result.pressureDrop)}`, result: `${(result.pressureDrop / 1000).toFixed(3)} kPa`, unit: "kPa" },
  ];
}

export interface HydraulicGradientInput {
  headLoss: number;     // m
  pipeLength: number;   // m
  density?: number;     // kg/m³ — for pressure drop (defaults to 998 if omitted)
}
export interface HydraulicGradientResult {
  slope: number;              // m/m
  slopePercent: number;       // %
  slopePer100m: number;       // m per 100 m
  slopePerKm: number;         // m per km
  pressureDropPerM: number;   // Pa/m
  pressureDropTotal: number;  // Pa — over the full pipe length
  classification: string;
  classificationNote: string;
  interpretation: string;
}
export function calculateHydraulicGradient(input: HydraulicGradientInput): HydraulicGradientResult {
  const { headLoss, pipeLength, density = 998 } = input;
  const slope = headLoss / pipeLength;
  const slopePercent = slope * 100;
  const slopePer100m = slope * 100;
  const slopePerKm   = slope * 1000;
  const pressureDropPerM   = density * 9.81 * slope;
  const pressureDropTotal  = density * 9.81 * headLoss;

  let classification: string;
  let classificationNote: string;
  if (slope < 0.001) {
    classification = "Flat";        classificationNote = "S < 0.1% — risk of sedimentation in open channels; may need flushing velocity checks";
  } else if (slope < 0.005) {
    classification = "Mild";        classificationNote = "0.1%–0.5% — typical gravity water-main design range";
  } else if (slope < 0.01) {
    classification = "Moderate";    classificationNote = "0.5%–1% — efficient gravity flow for distribution mains";
  } else if (slope < 0.05) {
    classification = "Steep";       classificationNote = "1%–5% — high velocity; check for erosion and air entrainment";
  } else {
    classification = "Very steep";  classificationNote = "S > 5% — potential cavitation, water hammer, or hydraulic jump risk";
  }

  return { slope, slopePercent, slopePer100m, slopePerKm, pressureDropPerM, pressureDropTotal, classification, classificationNote, interpretation: `S = ${slope.toFixed(5)} m/m (${slopePercent.toFixed(3)}%) — ${classification}.` };
}
export function generateHydraulicGradientSteps(input: HydraulicGradientInput, result: HydraulicGradientResult): Step[] {
  const p = (n: number) => parseFloat(n.toFixed(6)).toString();
  const { headLoss: hf, pipeLength: L, density = 998 } = input;
  return [
    { description: "Hydraulic gradient — slope of the hydraulic grade line", formula: "S = h_f / L" },
    { description: "Substitute head loss and pipe length", formula: "S = h_f / L", calculation: `S = ${p(hf)} / ${p(L)} = ${p(result.slope)}`, result: `${result.slope.toFixed(6)}`, unit: "m/m" },
    { description: "Express as percentage", formula: "S_{pct} = S \\times 100", calculation: `S_{pct} = ${p(result.slope)} \\times 100 = ${p(result.slopePercent)}` },
    { description: "Head loss per 100 m of pipe", formula: "h_{f,100} = S \\times 100", calculation: `h_f \\text{ per 100 m} = ${p(result.slope)} \\times 100 = ${p(result.slopePer100m)}` },
    { description: "Head loss per kilometre", formula: "h_{f,\\text{km}} = S \\times 1000", calculation: `h_f \\text{ per km} = ${p(result.slope)} \\times 1000 = ${p(result.slopePerKm)}` },
    { description: "Pressure drop per metre (ΔP/L = ρgS)", formula: "\\Delta P / L = \\rho g S", calculation: `\\Delta P/L = ${density} \\times 9.81 \\times ${p(result.slope)} = ${p(result.pressureDropPerM)}` },
    { description: "Total pressure drop over full pipe length", formula: "\\Delta P = \\rho g h_f", calculation: `\\Delta P = ${density} \\times 9.81 \\times ${p(hf)} = ${p(result.pressureDropTotal)}`, result: `${(result.pressureDropTotal / 1000).toFixed(3)} kPa`, unit: "kPa" },
  ];
}

// ============================================================================
// HEAT & MASS TRANSFER EXTENSIONS
// ============================================================================

export interface LmtdInput {
  T_hot_in: number;            // °C
  T_hot_out: number;           // °C
  T_cold_in: number;           // °C
  T_cold_out: number;          // °C
  flowConfig: "counterflow" | "parallel";
  fFactor?: number;            // correction factor (0 < F ≤ 1); 1 = counterflow baseline
  uValue?: number;             // W/(m²·K) overall heat transfer coefficient
  area?: number;               // m² heat exchanger area
}
export interface LmtdResult {
  lmtd: number;                // °C
  deltaT1: number;             // °C
  deltaT2: number;             // °C
  correctedLmtd: number;       // °C  F × LMTD
  capacityRatioR: number;      // (T_h,in - T_h,out) / (T_c,out - T_c,in)
  effectivenessP: number;      // (T_c,out - T_c,in) / (T_h,in - T_c,in)
  heatDuty?: number;           // W  Q = U × A × F × LMTD
  interpretation: string;
}
export function calculateLmtd(input: LmtdInput): LmtdResult {
  const { T_hot_in: Thi, T_hot_out: Tho, T_cold_in: Tci, T_cold_out: Tco, flowConfig } = input;
  if (Thi <= Tho) throw new Error("Hot inlet must be hotter than hot outlet");
  if (Tco <= Tci) throw new Error("Cold outlet must be hotter than cold inlet");

  let deltaT1: number, deltaT2: number;
  if (flowConfig === "counterflow") {
    deltaT1 = Thi - Tco;
    deltaT2 = Tho - Tci;
  } else {
    deltaT1 = Thi - Tci;
    deltaT2 = Tho - Tco;
  }
  if (deltaT1 <= 0 || deltaT2 <= 0) throw new Error("Temperature cross detected — check inlet/outlet temperatures");

  // L'Hôpital's rule: LMTD → ΔT when ΔT₁ ≈ ΔT₂
  const lmtd = Math.abs(deltaT1 - deltaT2) < 1e-6
    ? deltaT1
    : (deltaT1 - deltaT2) / Math.log(deltaT1 / deltaT2);

  const F = input.fFactor ?? 1;
  const correctedLmtd = F * lmtd;

  const R = (Thi - Tho) / (Tco - Tci);
  const P = (Tco - Tci) / (Thi - Tci);
  const heatDuty = (input.uValue && input.area)
    ? input.uValue * input.area * correctedLmtd
    : undefined;

  return {
    lmtd, deltaT1, deltaT2, correctedLmtd,
    capacityRatioR: R, effectivenessP: P,
    heatDuty,
    interpretation: `LMTD = ${lmtd.toFixed(2)} °C${F !== 1 ? `, F × LMTD = ${correctedLmtd.toFixed(2)} °C` : ""} (${flowConfig}). R = ${R.toFixed(3)}, P = ${P.toFixed(3)}.`,
  };
}
export function generateLmtdSteps(input: LmtdInput, result: LmtdResult): Step[] {
  const config = input.flowConfig === "counterflow" ? "Counterflow" : "Parallel flow";
  const F = input.fFactor ?? 1;
  const steps: Step[] = [
    { description: `${config} terminal temperature differences`,
      formula: input.flowConfig === "counterflow"
        ? "ΔT₁ = T_{h,in} − T_{c,out}  ;  ΔT₂ = T_{h,out} − T_{c,in}"
        : "ΔT₁ = T_{h,in} − T_{c,in}  ;  ΔT₂ = T_{h,out} − T_{c,out}",
      calculation: `ΔT₁ = ${result.deltaT1.toFixed(2)} °C,  ΔT₂ = ${result.deltaT2.toFixed(2)} °C` },
    { description: "Log Mean Temperature Difference",
      formula: "LMTD = (ΔT₁ − ΔT₂) / ln(ΔT₁/ΔT₂)",
      calculation: `LMTD = (${result.deltaT1.toFixed(2)} − ${result.deltaT2.toFixed(2)}) / ln(${result.deltaT1.toFixed(2)}/${result.deltaT2.toFixed(2)}) = ${result.lmtd.toFixed(3)} °C`,
      result: `${result.lmtd.toFixed(3)}`, unit: "°C" },
  ];
  if (F !== 1) {
    steps.push({
      description: "Apply F-factor correction for non-counterflow HX",
      formula: "LMTD_{eff} = F × LMTD",
      calculation: `LMTD_{eff} = ${F.toFixed(3)} × ${result.lmtd.toFixed(3)} = ${result.correctedLmtd.toFixed(3)} °C`,
      result: `${result.correctedLmtd.toFixed(3)}`, unit: "°C",
    });
  }
  steps.push(
    { description: "Heat capacity ratio R = (T<sub>h,in</sub> − T<sub>h,out</sub>) / (T<sub>c,out</sub> − T<sub>c,in</sub>)",
      formula: "R = ΔT_{hot} / ΔT_{cold}",
      calculation: `R = (${input.T_hot_in} − ${input.T_hot_out}) / (${input.T_cold_out} − ${input.T_cold_in}) = ${result.capacityRatioR.toFixed(3)}` },
    { description: "Temperature effectiveness P = (T<sub>c,out</sub> − T<sub>c,in</sub>) / (T<sub>h,in</sub> − T<sub>c,in</sub>)",
      formula: "P = ΔT_{cold} / (T_{h,in} − T_{c,in})",
      calculation: `P = (${input.T_cold_out} − ${input.T_cold_in}) / (${input.T_hot_in} − ${input.T_cold_in}) = ${result.effectivenessP.toFixed(3)}` }
  );
  if (result.heatDuty !== undefined && input.uValue && input.area) {
    steps.push({
      description: "Heat duty  Q = U × A × F × LMTD",
      formula: "Q = U × A × LMTD_{eff}",
      calculation: `Q = ${input.uValue.toFixed(1)} × ${input.area.toFixed(3)} × ${result.correctedLmtd.toFixed(3)} = ${result.heatDuty.toFixed(1)} W`,
      result: `${result.heatDuty.toFixed(1)}`, unit: "W",
    });
  }
  return steps;
}

export type HtcGeometry = "flat" | "cylinder";

export interface OverallHtcInput {
  geometry?: HtcGeometry;        // default "flat"
  innerConvection: number;       // h_i  W/(m²·K)
  outerConvection: number;       // h_o  W/(m²·K)
  wallThickness?: number;        // t    m  (flat wall)
  wallConductivity: number;      // k    W/(m·K)
  innerFouling?: number;         // R_fi m²·K/W
  outerFouling?: number;         // R_fo m²·K/W
  innerRadius?: number;          // r_i  m  (cylinder)
  outerRadius?: number;          // r_o  m  (cylinder)
}
export interface OverallHtcResult {
  overallU: number;              // W/(m²·K)  fouled
  cleanU: number;                // W/(m²·K)  no fouling
  totalResistance: number;       // m²·K/W
  resistances: {
    innerConvection: number;
    innerFouling: number;
    wallConduction: number;
    outerFouling: number;
    outerConvection: number;
  };
  foulingPenalty: number;        // % U reduction due to fouling
  interpretation: string;
}
export function calculateOverallHtc(input: OverallHtcInput): OverallHtcResult {
  const {
    geometry = "flat",
    innerConvection: hi, outerConvection: ho,
    wallConductivity: k,
    innerFouling: Rfi = 0, outerFouling: Rfo = 0,
  } = input;

  if (hi <= 0 || ho <= 0 || k <= 0) throw new Error("h_i, h_o, and k must be positive");

  let rInner: number, rOuter: number, ratio: number;
  let Rwall: number, RhiEff: number, RfiEff: number;

  if (geometry === "cylinder") {
    const ri = input.innerRadius;
    const ro = input.outerRadius;
    if (!ri || !ro || ri <= 0 || ro <= 0) throw new Error("Inner and outer radius required for cylinder geometry");
    if (ro <= ri) throw new Error("Outer radius must be greater than inner radius");
    rInner = ri; rOuter = ro;
    ratio  = ro / ri;
    Rwall  = (ro * Math.log(ro / ri)) / k;
    RhiEff = ratio / hi;
    RfiEff = ratio * Rfi;
  } else {
    const t = input.wallThickness;
    if (!t || t <= 0) throw new Error("Wall thickness required for flat geometry");
    rInner = 0; rOuter = 0; ratio = 1;
    Rwall  = t / k;
    RhiEff = 1 / hi;
    RfiEff = Rfi;
  }

  const RhoEff = 1 / ho;
  const RfoEff = Rfo;

  const resistances = {
    innerConvection: RhiEff,
    innerFouling:    RfiEff,
    wallConduction:  Rwall,
    outerFouling:    RfoEff,
    outerConvection: RhoEff,
  };

  const totalResistance = RhiEff + RfiEff + Rwall + RfoEff + RhoEff;
  const overallU = 1 / totalResistance;

  const cleanResistance = RhiEff + Rwall + RhoEff;
  const cleanU = 1 / cleanResistance;
  const foulingPenalty = ((cleanU - overallU) / cleanU) * 100;

  const geomStr = geometry === "cylinder" ? " (outer-area basis)" : "";
  return {
    overallU, cleanU, totalResistance, resistances, foulingPenalty,
    interpretation: `U = ${overallU.toFixed(1)} W/(m²·K)${geomStr}. Clean U = ${cleanU.toFixed(1)}, fouling penalty = ${foulingPenalty.toFixed(1)}%.`,
  };
}
export function generateOverallHtcSteps(input: OverallHtcInput, result: OverallHtcResult): Step[] {
  const { geometry = "flat", innerConvection: hi, outerConvection: ho, wallConductivity: k } = input;
  const { resistances: R, overallU, cleanU } = result;
  const Rfi = input.innerFouling ?? 0;
  const Rfo = input.outerFouling ?? 0;
  const steps: Step[] = [];

  if (geometry === "cylinder" && input.innerRadius && input.outerRadius) {
    const ri = input.innerRadius, ro = input.outerRadius;
    steps.push(
      { description: "Cylindrical-wall overall resistance (based on outer area)",
        formula: "1/U_{o} = 1/h_{o} + R_{f,o} + (r_{o}/k)×ln(r_{o}/r_{i}) + (r_{o}/r_{i})×R_{f,i} + (r_{o}/r_{i})/h_{i}" },
      { description: "Radius ratio r<sub>o</sub>/r<sub>i</sub>",
        calculation: `r_{o}/r_{i} = ${ro.toFixed(4)} / ${ri.toFixed(4)} = ${(ro/ri).toFixed(4)}` },
      { description: "Wall conduction resistance (r<sub>o</sub>/k) × ln(r<sub>o</sub>/r<sub>i</sub>)",
        calculation: `R_{wall} = (${ro.toFixed(4)} / ${k}) × ln(${ro.toFixed(4)}/${ri.toFixed(4)}) = ${R.wallConduction.toFixed(6)} m²·K/W` },
    );
  } else {
    const t = input.wallThickness ?? 0;
    steps.push(
      { description: "Flat-wall overall resistance — resistances in series",
        formula: "1/U = 1/h_{i} + R_{f,i} + t/k + R_{f,o} + 1/h_{o}" },
      { description: "Wall conduction resistance  t/k",
        calculation: `t/k = ${t.toFixed(4)} / ${k} = ${R.wallConduction.toFixed(6)} m²·K/W` },
    );
  }

  steps.push(
    { description: "Inner convection resistance 1/h<sub>i</sub> (scaled for geometry)",
      calculation: `R_{conv,i} = ${R.innerConvection.toFixed(6)} m²·K/W  (h_{i} = ${hi} W/(m²·K))` },
    { description: "Outer convection resistance 1/h<sub>o</sub>",
      calculation: `R_{conv,o} = ${R.outerConvection.toFixed(6)} m²·K/W  (h_{o} = ${ho} W/(m²·K))` },
    { description: `Fouling resistances R<sub>f,i</sub> = ${Rfi}, R<sub>f,o</sub> = ${Rfo} m²·K/W`,
      calculation: `R_{fi,eff} = ${R.innerFouling.toFixed(6)},  R_{fo} = ${R.outerFouling.toFixed(6)} m²·K/W` },
    { description: "Total thermal resistance  ΣR",
      calculation: `ΣR = ${R.innerConvection.toFixed(5)} + ${R.innerFouling.toFixed(5)} + ${R.wallConduction.toFixed(5)} + ${R.outerFouling.toFixed(5)} + ${R.outerConvection.toFixed(5)} = ${result.totalResistance.toFixed(5)} m²·K/W` },
    { description: "Overall heat transfer coefficient  U = 1/ΣR",
      formula: "U = 1 / ΣR",
      calculation: `U = 1 / ${result.totalResistance.toFixed(5)} = ${overallU.toFixed(3)} W/(m²·K)`,
      result: `${overallU.toFixed(3)}`, unit: "W/(m²·K)" },
    { description: "Clean U (no fouling)  for penalty comparison",
      calculation: `U_{clean} = ${cleanU.toFixed(3)} W/(m²·K),  fouling penalty = ${result.foulingPenalty.toFixed(1)}%` },
  );
  return steps;
}

export interface DittusBoelterInput {
  reynoldsNumber: number;
  prandtlNumber: number;
  mode: "heating" | "cooling";    // n=0.4 heating, 0.3 cooling
  diameter?: number;              // m — enables h = Nu × k / D
  thermalConductivity?: number;   // W/(m·K) fluid k
}
export interface DittusBoelterResult {
  nusseltNumber: number;
  gnielinskiNu: number;           // Gnielinski correlation for comparison
  heatTransferCoeff?: number;     // W/(m²·K)  h = Nu × k / D
  gnielinskiH?: number;           // W/(m²·K)  from Gnielinski
  validRange: boolean;            // Re > 10 000 and 0.6 ≤ Pr ≤ 160
  warnings: string[];
  interpretation: string;
}
export function calculateDittusBoelter(input: DittusBoelterInput): DittusBoelterResult {
  const { reynoldsNumber: Re, prandtlNumber: Pr, mode, diameter: D, thermalConductivity: k } = input;
  const n = mode === "heating" ? 0.4 : 0.3;
  const nusseltNumber = 0.023 * Math.pow(Re, 0.8) * Math.pow(Pr, n);

  // Gnielinski (3 000 < Re < 5×10⁶, 0.5 < Pr < 2 000)
  const f = Math.pow(0.790 * Math.log(Re) - 1.64, -2);
  const gnielinskiNu = Re > 3000
    ? ((f / 8) * (Re - 1000) * Pr) / (1 + 12.7 * Math.sqrt(f / 8) * (Math.pow(Pr, 2 / 3) - 1))
    : nusseltNumber;

  const h  = (D && k && D > 0 && k > 0) ? nusseltNumber  * k / D : undefined;
  const hG = (D && k && D > 0 && k > 0) ? gnielinskiNu   * k / D : undefined;

  const warnings: string[] = [];
  if (Re < 10000)  warnings.push("Re < 10 000 — correlation is outside its valid range; use Gnielinski for transitional flow");
  if (Pr < 0.6)   warnings.push("Pr < 0.6 — use liquid-metal correlations (e.g. Seban-Shimazaki)");
  if (Pr > 160)   warnings.push("Pr > 160 — accuracy degrades; Sieder-Tate or Gnielinski with viscosity correction preferred");

  const validRange = Re >= 10000 && Pr >= 0.6 && Pr <= 160;
  return {
    nusseltNumber, gnielinskiNu, heatTransferCoeff: h, gnielinskiH: hG,
    validRange, warnings,
    interpretation: `Nu(DB) = ${nusseltNumber.toFixed(2)}, Nu(G) = ${gnielinskiNu.toFixed(2)} (${Math.abs(((nusseltNumber - gnielinskiNu) / gnielinskiNu) * 100).toFixed(1)}% difference).`,
  };
}
export function generateDittusBoelterSteps(input: DittusBoelterInput, result: DittusBoelterResult): Step[] {
  const { reynoldsNumber: Re, prandtlNumber: Pr, mode } = input;
  const n = mode === "heating" ? 0.4 : 0.3;
  const f = Math.pow(0.790 * Math.log(Re) - 1.64, -2);
  const steps: Step[] = [
    { description: `Dittus-Boelter correlation (${mode}, n = ${n})`,
      formula: `Nu = 0.023 × Re^{0.8} × Pr^{${n}}` },
    { description: "Substitute Re and Pr",
      calculation: `Nu = 0.023 × ${Re.toFixed(0)}^{0.8} × ${Pr.toFixed(3)}^{${n}} = ${result.nusseltNumber.toFixed(3)}`,
      result: `${result.nusseltNumber.toFixed(3)}`, unit: "dimensionless" },
    { description: "Gnielinski friction factor (Petukhov)  f = (0.790 ln Re − 1.64)^(−2)",
      formula: "f = (0.790 × ln Re − 1.64)^{-2}",
      calculation: `f = (0.790 × ln ${Re.toFixed(0)} − 1.64)^{-2} = ${f.toFixed(5)}` },
    { description: "Gnielinski Nu for comparison  (f/8)(Re−1000)Pr / [1 + 12.7√(f/8)(Pr^(2/3)−1)]",
      formula: "Nu_{G} = (f/8)(Re − 1000) Pr / [1 + 12.7√(f/8)(Pr^{2/3} − 1)]",
      calculation: `Nu_{G} = ${result.gnielinskiNu.toFixed(3)}`,
      result: `${result.gnielinskiNu.toFixed(3)}`, unit: "dimensionless" },
  ];
  if (result.heatTransferCoeff !== undefined && input.diameter && input.thermalConductivity) {
    steps.push({
      description: "Heat transfer coefficient  h = Nu × k / D",
      formula: "h = Nu × k / D",
      calculation: `h = ${result.nusseltNumber.toFixed(3)} × ${input.thermalConductivity.toFixed(4)} / ${input.diameter.toFixed(4)} = ${result.heatTransferCoeff.toFixed(2)} W/(m²·K)`,
      result: `${result.heatTransferCoeff.toFixed(2)}`, unit: "W/(m²·K)",
    });
  }
  return steps;
}

export interface NaturalConvectionPlateInput {
  length: number;               // m  plate height H
  wallTemperature: number;      // °C
  ambientTemperature: number;   // °C
  thermalExpansion: number;     // 1/K  β
  kinematicViscosity: number;   // m²/s  ν
  thermalDiffusivity: number;   // m²/s  α
  thermalConductivity?: number; // W/(m·K) k — optional, enables h output
}
export interface NaturalConvectionPlateResult {
  grashofNumber: number;
  rayleighNumber: number;
  prandtlNumber: number;        // ν/α
  nusseltNumber: number;        // Churchill-Chu
  filmTemperature: number;      // °C  (T_wall + T_ambient)/2
  deltaT: number;               // K
  heatTransferCoeff?: number;   // W/(m²·K)  h = Nu × k / L
  convectionRegime: string;
  interpretation: string;
}
export function calculateNaturalConvectionPlate(input: NaturalConvectionPlateInput): NaturalConvectionPlateResult {
  const { length: L, wallTemperature: Tw, ambientTemperature: Tinf,
          thermalExpansion: beta, kinematicViscosity: nu, thermalDiffusivity: alpha,
          thermalConductivity: k } = input;

  if (L <= 0)    throw new Error("Plate height must be positive");
  if (beta <= 0) throw new Error("Thermal expansion coefficient must be positive");
  if (nu   <= 0) throw new Error("Kinematic viscosity must be positive");
  if (alpha <= 0) throw new Error("Thermal diffusivity must be positive");

  const dT  = Math.abs(Tw - Tinf);
  const Tf  = (Tw + Tinf) / 2;
  const Pr  = nu / alpha;
  const g   = 9.81;

  const Gr  = (g * beta * dT * Math.pow(L, 3)) / (nu * nu);
  const Ra  = Gr * Pr;

  // Churchill-Chu: laminar form for Ra < 1e9, all-range form for Ra ≥ 1e9
  let Nu: number;
  if (Ra < 1e9) {
    Nu = 0.68 + 0.670 * Math.pow(Ra, 0.25) /
         Math.pow(1 + Math.pow(0.492 / Pr, 9 / 16), 4 / 9);
  } else {
    Nu = Math.pow(
      0.825 + 0.387 * Math.pow(Ra, 1 / 6) /
      Math.pow(1 + Math.pow(0.492 / Pr, 9 / 16), 8 / 27),
      2
    );
  }

  const h = (k && k > 0) ? Nu * k / L : undefined;

  let convectionRegime: string;
  if (Ra < 1e4)       convectionRegime = "negligible natural convection (Ra < 10⁴)";
  else if (Ra < 1e9)  convectionRegime = "laminar natural convection (Ra < 10⁹)";
  else if (Ra < 1e13) convectionRegime = "turbulent natural convection (Ra > 10⁹)";
  else                convectionRegime = "strongly turbulent natural convection";

  return {
    grashofNumber: Gr, rayleighNumber: Ra, prandtlNumber: Pr,
    nusseltNumber: Nu, filmTemperature: Tf, deltaT: dT,
    heatTransferCoeff: h, convectionRegime,
    interpretation: `Ra = ${Ra.toExponential(3)}, Nu = ${Nu.toFixed(2)}${h !== undefined ? `, h = ${h.toFixed(2)} W/(m²·K)` : ""} — ${convectionRegime}.`,
  };
}
export function generateNaturalConvectionPlateSteps(input: NaturalConvectionPlateInput, result: NaturalConvectionPlateResult): Step[] {
  const { length: L, wallTemperature: Tw, ambientTemperature: Tinf,
          thermalExpansion: beta, kinematicViscosity: nu } = input;
  const { grashofNumber: Gr, rayleighNumber: Ra, prandtlNumber: Pr,
          nusseltNumber: Nu, filmTemperature: Tf, deltaT: dT } = result;

  const steps: Step[] = [
    { description: "Film temperature T<sub>film</sub> = (T<sub>wall</sub> + T<sub>ambient</sub>) / 2",
      formula: "T_{film} = (T_{w} + T_{∞}) / 2",
      calculation: `T_{film} = (${Tw.toFixed(1)} + ${Tinf.toFixed(1)}) / 2 = ${Tf.toFixed(2)} °C` },
    { description: "Temperature difference  ΔT = |T_wall − T_ambient|",
      calculation: `ΔT = |${Tw.toFixed(1)} − ${Tinf.toFixed(1)}| = ${dT.toFixed(2)} K` },
    { description: "Prandtl number  Pr = ν / α",
      formula: "Pr = ν / α",
      calculation: `Pr = ${nu.toExponential(4)} / ${input.thermalDiffusivity.toExponential(4)} = ${Pr.toFixed(4)}` },
    { description: "Grashof number  Gr = g β ΔT L³ / ν²",
      formula: "Gr = g × β × ΔT × L³ / ν²",
      calculation: `Gr = 9.81 × ${beta.toExponential(4)} × ${dT.toFixed(2)} × ${L.toFixed(3)}³ / (${nu.toExponential(4)})² = ${Gr.toExponential(4)}` },
    { description: "Rayleigh number  Ra = Gr × Pr",
      formula: "Ra = Gr × Pr",
      calculation: `Ra = ${Gr.toExponential(4)} × ${Pr.toFixed(4)} = ${Ra.toExponential(4)}`,
      result: `${Ra.toExponential(4)}`, unit: "dimensionless" },
    { description: `Churchill-Chu correlation (${Ra < 1e9 ? "laminar, Ra < 10⁹" : "all-range, Ra ≥ 10⁹"})`,
      formula: Ra < 1e9
        ? "Nu = 0.68 + 0.670 Ra^{1/4} / [1 + (0.492/Pr)^{9/16}]^{4/9}"
        : "Nu = {0.825 + 0.387 Ra^{1/6} / [1 + (0.492/Pr)^{9/16}]^{8/27}}²",
      calculation: `Nu = ${Nu.toFixed(4)}`,
      result: `${Nu.toFixed(4)}`, unit: "dimensionless" },
  ];

  if (result.heatTransferCoeff !== undefined && input.thermalConductivity) {
    steps.push({
      description: "Heat transfer coefficient  h = Nu × k / L",
      formula: "h = Nu × k / L",
      calculation: `h = ${Nu.toFixed(4)} × ${input.thermalConductivity.toFixed(4)} / ${L.toFixed(4)} = ${result.heatTransferCoeff.toFixed(4)} W/(m²·K)`,
      result: `${result.heatTransferCoeff.toFixed(4)}`, unit: "W/(m²·K)",
    });
  }
  return steps;
}

export type EffectivenessNtuMode = "findEps" | "findNtu";

export interface EffectivenessNtuInput {
  mode: EffectivenessNtuMode;
  ntu?: number;                // for findEps
  effectiveness?: number;      // 0–1  for findNtu
  capacityRatio: number;       // C* = C_min/C_max  (0–1)
  flowConfig: "counterflow" | "parallel" | "crossflow";
  cMin?: number;               // W/K — enables Q output
  hotInletTemp?: number;       // °C  — enables Q_max
  coldInletTemp?: number;      // °C
}
export interface EffectivenessNtuResult {
  ntu: number;
  effectiveness: number;       // 0–1
  qMax?: number;               // W  C_min × (T_hot_in − T_cold_in)
  qActual?: number;            // W  ε × Q_max
  interpretation: string;
}

function _epsFromNtu(ntu: number, c: number, config: string): number {
  if (c < 1e-9) return 1 - Math.exp(-ntu);  // condenser / evaporator
  if (config === "counterflow") {
    return Math.abs(c - 1) < 1e-6
      ? ntu / (1 + ntu)
      : (1 - Math.exp(-ntu * (1 - c))) / (1 - c * Math.exp(-ntu * (1 - c)));
  }
  if (config === "parallel") return (1 - Math.exp(-ntu * (1 + c))) / (1 + c);
  // crossflow both unmixed (approximation)
  return 1 - Math.exp((1 / c) * (Math.exp(-c * ntu) - 1));
}

function _ntuFromEps(eps: number, c: number, config: string): number {
  if (c < 1e-9) return -Math.log(1 - eps);
  if (config === "counterflow") {
    if (Math.abs(c - 1) < 1e-6) return eps / (1 - eps);
    return Math.log((1 - c * eps) / (1 - eps)) / (1 - c);
  }
  if (config === "parallel") {
    const arg = 1 - eps * (1 + c);
    if (arg <= 0) throw new Error("Parallel flow cannot reach that effectiveness with this C*");
    return -Math.log(arg) / (1 + c);
  }
  // crossflow: bisection
  let lo = 0, hi = 20;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (_epsFromNtu(mid, c, config) < eps) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export function calculateEffectivenessNtu(input: EffectivenessNtuInput): EffectivenessNtuResult {
  const { mode, capacityRatio: c, flowConfig, cMin, hotInletTemp, coldInletTemp } = input;
  if (c < 0 || c > 1) throw new Error("Capacity ratio C* must be between 0 and 1");

  let ntu: number, eps: number;
  if (mode === "findEps") {
    if (input.ntu === undefined || input.ntu <= 0) throw new Error("NTU must be positive");
    ntu = input.ntu;
    eps = _epsFromNtu(ntu, c, flowConfig);
  } else {
    if (input.effectiveness === undefined || input.effectiveness <= 0 || input.effectiveness >= 1)
      throw new Error("Effectiveness must be between 0 and 1 (exclusive)");
    eps = input.effectiveness;
    ntu = _ntuFromEps(eps, c, flowConfig);
  }

  const dT = (hotInletTemp !== undefined && coldInletTemp !== undefined)
    ? hotInletTemp - coldInletTemp : undefined;
  const qMax    = (cMin && dT !== undefined) ? cMin * dT    : undefined;
  const qActual = (qMax !== undefined)       ? eps * qMax   : undefined;

  return {
    ntu, effectiveness: eps, qMax, qActual,
    interpretation: `ε = ${(eps * 100).toFixed(2)}%, NTU = ${ntu.toFixed(4)}, C* = ${c}, ${flowConfig}.${qActual !== undefined ? ` Q = ${qActual.toFixed(1)} W.` : ""}`,
  };
}

export function generateEffectivenessNtuSteps(input: EffectivenessNtuInput, result: EffectivenessNtuResult): Step[] {
  const { mode, capacityRatio: c, flowConfig } = input;
  const { ntu, effectiveness: eps } = result;
  const steps: Step[] = [
    { description: "Capacity ratio C* = C<sub>min</sub> / C<sub>max</sub>",
      formula: "C* = C_{min} / C_{max}",
      calculation: `C* = ${c.toFixed(4)}${c < 1e-9 ? "  (condenser / evaporator — all configurations give same ε)" : ""}` },
  ];

  let formula = "";
  if (flowConfig === "counterflow") {
    formula = Math.abs(c - 1) < 1e-6
      ? "ε = NTU / (1 + NTU)  [counterflow, C* = 1]"
      : "ε = (1 − exp(−NTU(1−C*))) / (1 − C* exp(−NTU(1−C*)))";
  } else if (flowConfig === "parallel") {
    formula = "ε = (1 − exp(−NTU(1+C*))) / (1+C*)";
  } else {
    formula = "ε = 1 − exp((1/C*)(exp(−C*·NTU) − 1))  [crossflow, both unmixed]";
  }

  if (mode === "findEps") {
    steps.push(
      { description: `Effectiveness formula — ${flowConfig}`, formula },
      { description: "Substitute NTU and C*",
        calculation: `ε = ${(eps * 100).toFixed(4)}%`,
        result: `${(eps * 100).toFixed(4)}`, unit: "%" }
    );
  } else {
    let invFormula = "";
    if (flowConfig === "counterflow") {
      invFormula = Math.abs(c - 1) < 1e-6
        ? "NTU = ε / (1 − ε)  [C* = 1]"
        : "NTU = ln((1 − C*ε) / (1 − ε)) / (1 − C*)";
    } else if (flowConfig === "parallel") {
      invFormula = "NTU = −ln(1 − ε(1+C*)) / (1+C*)";
    } else {
      invFormula = "NTU — solved numerically (bisection) from crossflow formula";
    }
    steps.push(
      { description: `Rearrange ${flowConfig} formula for NTU`, formula: invFormula },
      { description: "Compute NTU",
        calculation: `NTU = ${ntu.toFixed(5)}`,
        result: `${ntu.toFixed(5)}`, unit: "dimensionless" }
    );
  }

  if (result.qMax !== undefined && result.qActual !== undefined) {
    steps.push(
      { description: "Maximum possible heat transfer Q<sub>max</sub> = C<sub>min</sub> × (T<sub>h,in</sub> − T<sub>c,in</sub>)",
        formula: "Q_{max} = C_{min} × ΔT_{max}",
        calculation: `Q_{max} = ${input.cMin?.toFixed(2)} × ${((input.hotInletTemp ?? 0) - (input.coldInletTemp ?? 0)).toFixed(2)} = ${result.qMax.toFixed(2)} W` },
      { description: "Actual heat transfer Q = ε × Q<sub>max</sub>",
        formula: "Q = ε × Q_{max}",
        calculation: `Q = ${(eps).toFixed(4)} × ${result.qMax.toFixed(2)} = ${result.qActual.toFixed(2)} W`,
        result: `${result.qActual.toFixed(2)}`, unit: "W" }
    );
  }
  return steps;
}

export type FoulingMode = "findRf" | "findUfouled" | "findUclean";

export interface FoulingFactorInput {
  mode: FoulingMode;
  cleanHtc?: number;    // W/(m²·K)  U_clean
  fouledHtc?: number;   // W/(m²·K)  U_fouled
  foulingFactor?: number; // m²·K/W  R_f
}
export interface FoulingFactorResult {
  foulingFactor: number;   // m²·K/W
  cleanHtc: number;        // W/(m²·K)
  fouledHtc: number;       // W/(m²·K)
  cleanResistance: number; // m²·K/W  1/U_clean
  fouledResistance: number;// m²·K/W  1/U_fouled
  uPenalty: number;        // %  (U_clean - U_fouled)/U_clean × 100
  interpretation: string;
}
export function calculateFoulingFactor(input: FoulingFactorInput): FoulingFactorResult {
  const { mode } = input;
  let Uc: number, Uf: number, Rf: number;

  if (mode === "findRf") {
    if (!input.cleanHtc || !input.fouledHtc)
      throw new Error("Clean and fouled U values are required");
    Uc = input.cleanHtc;
    Uf = input.fouledHtc;
    if (Uc <= 0 || Uf <= 0) throw new Error("U values must be positive");
    if (Uf >= Uc) throw new Error("Fouled U must be less than clean U");
    Rf = 1 / Uf - 1 / Uc;

  } else if (mode === "findUfouled") {
    if (!input.cleanHtc || !input.foulingFactor)
      throw new Error("Clean U and fouling factor are required");
    Uc = input.cleanHtc;
    Rf = input.foulingFactor;
    if (Uc <= 0) throw new Error("U_clean must be positive");
    if (Rf < 0)  throw new Error("Fouling factor must be non-negative");
    Uf = 1 / (1 / Uc + Rf);

  } else {
    if (!input.fouledHtc || !input.foulingFactor)
      throw new Error("Fouled U and fouling factor are required");
    Uf = input.fouledHtc;
    Rf = input.foulingFactor;
    if (Uf <= 0) throw new Error("U_fouled must be positive");
    if (Rf < 0)  throw new Error("Fouling factor must be non-negative");
    const Rc = 1 / Uf - Rf;
    if (Rc <= 0) throw new Error("Derived clean resistance is non-positive — check inputs");
    Uc = 1 / Rc;
  }

  const uPenalty = ((Uc - Uf) / Uc) * 100;
  return {
    foulingFactor: Rf, cleanHtc: Uc, fouledHtc: Uf,
    cleanResistance: 1 / Uc, fouledResistance: 1 / Uf,
    uPenalty,
    interpretation: `Rf = ${Rf.toExponential(4)} m²·K/W. U drops from ${Uc.toFixed(1)} to ${Uf.toFixed(1)} W/(m²·K) — a ${uPenalty.toFixed(1)}% reduction in heat transfer performance.`,
  };
}
export function generateFoulingFactorSteps(input: FoulingFactorInput, result: FoulingFactorResult): Step[] {
  const { mode } = input;
  const { foulingFactor: Rf, cleanHtc: Uc, fouledHtc: Uf } = result;

  if (mode === "findRf") {
    return [
      { description: "Fouling resistance definition",
        formula: "R_{f} = 1/U_{fouled} − 1/U_{clean}" },
      { description: "Substitute U<sub>clean</sub> and U<sub>fouled</sub>",
        calculation: `R_{f} = 1/${Uf.toFixed(2)} − 1/${Uc.toFixed(2)} = ${(1/Uf).toFixed(6)} − ${(1/Uc).toFixed(6)}` },
      { description: "Fouling resistance",
        calculation: `R_{f} = ${Rf.toExponential(4)} m²·K/W`,
        result: `${Rf.toExponential(4)}`, unit: "m²·K/W" },
      { description: "U penalty due to fouling",
        calculation: `(U_{clean} − U_{fouled})/U_{clean} = (${Uc.toFixed(2)} − ${Uf.toFixed(2)}) / ${Uc.toFixed(2)} = ${result.uPenalty.toFixed(2)}%` },
    ];
  }

  if (mode === "findUfouled") {
    return [
      { description: "Rearrange: add fouling resistance to clean resistance",
        formula: "1/U_{fouled} = 1/U_{clean} + R_{f}" },
      { description: "Substitute U<sub>clean</sub> and R<sub>f</sub>",
        calculation: `1/U_{fouled} = 1/${Uc.toFixed(2)} + ${Rf.toExponential(4)} = ${(1/Uc).toFixed(6)} + ${Rf.toExponential(4)}` },
      { description: "Fouled overall heat transfer coefficient",
        calculation: `U_{fouled} = ${Uf.toFixed(4)} W/(m²·K)`,
        result: `${Uf.toFixed(4)}`, unit: "W/(m²·K)" },
      { description: "U penalty due to fouling",
        calculation: `${result.uPenalty.toFixed(2)}% reduction from clean condition` },
    ];
  }

  return [
    { description: "Rearrange: subtract fouling resistance from fouled resistance",
      formula: "1/U_{clean} = 1/U_{fouled} − R_{f}" },
    { description: "Substitute U<sub>fouled</sub> and R<sub>f</sub>",
      calculation: `1/U_{clean} = 1/${Uf.toFixed(2)} − ${Rf.toExponential(4)} = ${(1/Uf).toFixed(6)} − ${Rf.toExponential(4)}` },
    { description: "Clean overall heat transfer coefficient",
      calculation: `U_{clean} = ${Uc.toFixed(4)} W/(m²·K)`,
      result: `${Uc.toFixed(4)}`, unit: "W/(m²·K)" },
  ];
}

export type FinTipCondition = "adiabatic" | "corrected";

export interface FinEfficiencyInput {
  finLength: number;             // m  L
  heatTransferCoeff: number;     // W/(m²·K)  h
  perimeter: number;             // m  P (fin cross-section perimeter)
  crossSectionalArea: number;    // m²  Ac
  thermalConductivity: number;   // W/(m·K)  k
  tipCondition?: FinTipCondition; // default "adiabatic"
  // Overall surface efficiency (optional)
  nFins?: number;                // number of fins on the surface
  totalArea?: number;            // m²  total heat transfer surface (fins + unfinned base)
}
export interface FinEfficiencyResult {
  mParameter: number;            // m⁻¹
  mL: number;                    // dimensionless (using L or Lc)
  correctedLength?: number;      // m  Lc = L + Ac/P (for corrected tip)
  efficiency: number;            // 0–1  η_f
  overallEfficiency?: number;    // 0–1  η_o = 1 − (N·Af/At)·(1−η_f)
  finHeatRatio?: number;         // N·Af / At
  interpretation: string;
}
export function calculateFinEfficiency(input: FinEfficiencyInput): FinEfficiencyResult {
  const { finLength: L, heatTransferCoeff: h, perimeter: P,
          crossSectionalArea: Ac, thermalConductivity: k,
          tipCondition = "adiabatic", nFins, totalArea } = input;

  if (L <= 0 || h <= 0 || P <= 0 || Ac <= 0 || k <= 0)
    throw new Error("All physical dimensions and properties must be positive");

  const m = Math.sqrt((h * P) / (k * Ac));

  const Lc = tipCondition === "corrected" ? L + Ac / P : L;
  const mLc = m * Lc;
  const eta = mLc < 1e-9 ? 1 : Math.tanh(mLc) / mLc;

  // Per-fin surface area (both sides of a straight fin + tip if corrected)
  const Af = P * Lc;  // fin surface area (perimeter × effective length)

  // Overall surface efficiency
  let overallEfficiency: number | undefined;
  let finHeatRatio: number | undefined;
  if (nFins !== undefined && totalArea !== undefined && totalArea > 0) {
    const ratio = (nFins * Af) / totalArea;
    finHeatRatio = ratio;
    overallEfficiency = 1 - ratio * (1 - eta);
  }

  const tipStr = tipCondition === "corrected"
    ? ` (corrected length Lc = ${Lc.toFixed(4)} m)` : " (adiabatic tip)";
  const overallStr = overallEfficiency !== undefined
    ? `  Overall surface efficiency = ${(overallEfficiency * 100).toFixed(1)}%.` : "";
  return {
    mParameter: m, mL: mLc, correctedLength: tipCondition === "corrected" ? Lc : undefined,
    efficiency: eta, overallEfficiency, finHeatRatio,
    interpretation: `Fin efficiency = ${(eta * 100).toFixed(2)}%${tipStr}, mL = ${mLc.toFixed(3)}.${overallStr}`,
  };
}
export function generateFinEfficiencySteps(input: FinEfficiencyInput, result: FinEfficiencyResult): Step[] {
  const { finLength: L, heatTransferCoeff: h, perimeter: P,
          crossSectionalArea: Ac, thermalConductivity: k,
          tipCondition = "adiabatic" } = input;
  const { mParameter: m, mL, correctedLength: Lc, efficiency: eta } = result;

  const inner = (h * P) / (k * Ac);
  const steps: Step[] = [
    { description: "Fin parameter m = √(hP / kA<sub>c</sub>)",
      formula: "m = √(h × P / (k × A_{c}))",
      calculation: `hP/(kAc) = ${h} × ${P} / (${k} × ${Ac}) = ${inner.toFixed(6)}  →  m = √${inner.toFixed(6)} = ${m.toFixed(5)} m^{-1}` },
  ];

  if (tipCondition === "corrected") {
    steps.push({
      description: "Corrected length L<sub>c</sub> = L + A<sub>c</sub> / P (accounts for tip convection)",
      formula: "L_{c} = L + A_{c} / P",
      calculation: `L_{c} = ${L.toFixed(4)} + ${Ac.toFixed(6)} / ${P.toFixed(4)} = ${Lc!.toFixed(5)} m`,
    });
  }

  const Leff = Lc ?? L;
  steps.push(
    { description: `Dimensionless fin parameter m × L${tipCondition === "corrected" ? "<sub>c</sub>" : ""}`,
      calculation: `m × L${tipCondition === "corrected" ? "_{c}" : ""} = ${m.toFixed(5)} × ${Leff.toFixed(5)} = ${mL.toFixed(5)}` },
    { description: `Fin efficiency — ${tipCondition === "adiabatic" ? "adiabatic tip" : "corrected length"}`,
      formula: "tanh(mL) / (mL)",
      calculation: `tanh(${mL.toFixed(4)}) / ${mL.toFixed(4)} = ${(eta * 100).toFixed(4)}`,
      result: `${(eta * 100).toFixed(4)}`, unit: "%" }
  );

  if (result.overallEfficiency !== undefined && input.nFins && input.totalArea) {
    const Af = P * Leff;
    steps.push({
      description: "Overall surface efficiency of the finned array",
      formula: "1 − (N × A_{f} / A_{t}) × (1 − η)",
      calculation: `1 − (${input.nFins} × ${Af.toFixed(5)} / ${input.totalArea.toFixed(5)}) × (1 − ${eta.toFixed(5)}) = ${(result.overallEfficiency * 100).toFixed(3)}`,
      result: `${(result.overallEfficiency * 100).toFixed(3)}`, unit: "%",
    });
  }
  return steps;
}

export interface ThermalResistanceInput {
  layers: Array<{
    type: "conduction_planar" | "convection";
    value: number;      // k [W/(m·K)] for conduction, h [W/(m²·K)] for convection
    thickness?: number; // m (required for conduction_planar)
    area?: number;      // m² per-layer override
    label?: string;     // display name
  }>;
  area: number;         // m² reference area
  deltaT?: number;      // K  optional — enables Q = ΔT / R_total
}
export interface ThermalResistanceResult {
  totalResistance: number;     // K/W
  layerResistances: number[];  // K/W per layer
  percentages: number[];       // % of total
  dominantLayerIndex: number;  // index of largest resistance
  heatFlux?: number;           // W  Q = ΔT / R_total
  interpretation: string;
}
export function calculateThermalResistance(input: ThermalResistanceInput): ThermalResistanceResult {
  const { layers, area, deltaT } = input;
  const layerResistances = layers.map(layer => {
    const A = layer.area ?? area;
    if (A <= 0) throw new Error("Area must be positive");
    if (layer.type === "conduction_planar") {
      if (!layer.thickness || layer.thickness <= 0) throw new Error("Wall thickness must be positive");
      if (layer.value <= 0) throw new Error("Thermal conductivity must be positive");
      return layer.thickness / (layer.value * A);
    } else {
      if (layer.value <= 0) throw new Error("Convection coefficient must be positive");
      return 1 / (layer.value * A);
    }
  });
  const totalResistance = layerResistances.reduce((a, b) => a + b, 0);
  const percentages = layerResistances.map(r => (r / totalResistance) * 100);
  const dominantLayerIndex = layerResistances.indexOf(Math.max(...layerResistances));
  const heatFlux = deltaT !== undefined ? deltaT / totalResistance : undefined;
  return {
    totalResistance, layerResistances, percentages, dominantLayerIndex,
    heatFlux,
    interpretation: `Rtotal = ${totalResistance.toFixed(5)} K/W across ${layers.length} layers.${heatFlux !== undefined ? ` Q = ${heatFlux.toFixed(2)} W.` : ""}`,
  };
}
export function generateThermalResistanceSteps(input: ThermalResistanceInput, result: ThermalResistanceResult): Step[] {
  const { layers, area } = input;
  const steps: Step[] = [
    { description: "Thermal resistances in series — one formula per layer type",
      formula: "R_{conv} = 1 / (h × A)   |   R_{cond} = t / (k × A)" },
  ];
  layers.forEach((layer, i) => {
    const A = layer.area ?? area;
    const R = result.layerResistances[i];
    const name = layer.label ?? `Layer ${i + 1}`;
    if (layer.type === "convection") {
      steps.push({
        description: `${name}: convection resistance`,
        formula: "R = 1 / (h × A)",
        calculation: `R = 1 / (${layer.value} × ${A.toFixed(4)}) = ${R.toFixed(6)} K/W`,
      });
    } else {
      steps.push({
        description: `${name}: conduction resistance`,
        formula: "R = t / (k × A)",
        calculation: `R = ${layer.thickness!.toFixed(4)} / (${layer.value} × ${A.toFixed(4)}) = ${R.toFixed(6)} K/W`,
      });
    }
  });
  steps.push({
    description: "Total resistance — all layers in series",
    formula: "R_{total} = R_{1} + R_{2} + ... + R_{n}",
    calculation: result.layerResistances.map(r => r.toFixed(6)).join(" + ") + ` = ${result.totalResistance.toFixed(6)} K/W`,
    result: `${result.totalResistance.toFixed(6)}`, unit: "K/W",
  });
  if (result.heatFlux !== undefined && input.deltaT !== undefined) {
    steps.push({
      description: "Heat flow rate Q = ΔT / R<sub>total</sub>",
      formula: "Q = ΔT / R_{total}",
      calculation: `Q = ${input.deltaT.toFixed(2)} / ${result.totalResistance.toFixed(6)} = ${result.heatFlux.toFixed(3)} W`,
      result: `${result.heatFlux.toFixed(3)}`, unit: "W",
    });
  }
  return steps;
}

// ============================================================================
// OPEN CHANNEL FLOW EXTENSIONS
// ============================================================================

export type CulvertMode      = "findQ" | "findH" | "findD";
export type CulvertShape     = "circular" | "box";
export type CulvertInletType = "projecting" | "squareHeadwall" | "beveledHeadwall" | "grooveEnd" | "rounded" | "mitered";

export interface CulvertInletPreset {
  label: string;
  cd: number;   // discharge coefficient (inlet control)
  ke: number;   // entrance loss coefficient (outlet control)
}

export const CULVERT_INLET_PRESETS: Record<CulvertInletType, CulvertInletPreset> = {
  projecting:      { label: "Projecting (no headwall)",         cd: 0.52, ke: 0.90 },
  squareHeadwall:  { label: "Square-edge with headwall",        cd: 0.60, ke: 0.50 },
  beveledHeadwall: { label: "Beveled 30°–45° with headwall",    cd: 0.70, ke: 0.20 },
  grooveEnd:       { label: "Groove-end with headwall",         cd: 0.65, ke: 0.40 },
  rounded:         { label: "Rounded entrance (r/D ≈ 0.15)",   cd: 0.75, ke: 0.15 },
  mitered:         { label: "Mitered to embankment slope",      cd: 0.65, ke: 0.70 },
};

export interface CulvertDesignInput {
  mode:       CulvertMode;
  shape:      CulvertShape;
  diameter?:  number;   // m  circular
  boxWidth?:  number;   // m  box
  boxHeight?: number;   // m  box
  length:     number;   // m
  manningN:   number;
  inletType:  CulvertInletType;
  cdOverride?: number;  // optional manual Cd
  keOverride?: number;  // optional manual Ke
  // mode inputs
  head?:      number;   // m  HW above inlet invert  (findQ, findH uses as cross-check)
  flowRate?:  number;   // m³/s  (findH, findD)
  tailwater?: number;   // m  TW above outlet invert  (optional, reduces effective ΔH)
}

export interface CulvertDesignResult {
  // cross-section
  area:            number;   // m²
  hydraulicRadius: number;   // m
  // coefficients
  cd:  number;
  ke:  number;
  kf:  number;              // 19.63 n² L / Rh^(4/3)  friction loss coefficient
  // findQ results
  qInletControl?:  number;  // m³/s
  qOutletControl?: number;  // m³/s
  flowRate:        number;  // m³/s  governing
  velocity:        number;  // m/s
  controlMode:     "inlet" | "outlet" | "balanced";
  hwdRatio?:       number;  // HW/D  (circular findQ)
  effectiveHead?:  number;  // m  ΔH used for outlet control
  // findH results
  headInletControl?:  number; // m
  headOutletControl?: number; // m
  head?:              number; // m  governing HW
  // findD results (circular only)
  diamInletControl?:  number; // m
  diamOutletControl?: number; // m
  diameter?:          number; // m  governing design diameter
  interpretation: string;
}

function culvertArea(shape: CulvertShape, D?: number, bw?: number, bh?: number): number {
  if (shape === "circular") return Math.PI * D! * D! / 4;
  return bw! * bh!;
}

function culvertRh(shape: CulvertShape, D?: number, bw?: number, bh?: number): number {
  if (shape === "circular") return D! / 4;
  return (bw! * bh!) / (2 * (bw! + bh!));
}

function culvertKf(n: number, L: number, Rh: number): number {
  return 19.63 * n * n * L / Math.pow(Rh, 4 / 3);
}

function qOutletFormula(A: number, Ke: number, Kf: number, dH: number): number {
  const denom = 1 + Ke + Kf;
  if (dH <= 0 || denom <= 0) return 0;
  return A * Math.sqrt(2 * 9.81 * dH / denom);
}

function qInletFormula(Cd: number, A: number, HW: number): number {
  if (HW <= 0) return 0;
  return Cd * A * Math.sqrt(2 * 9.81 * HW);
}

export function calculateCulvertDesign(input: CulvertDesignInput): CulvertDesignResult {
  const { mode, shape, length: L, manningN: n, inletType, tailwater = 0 } = input;
  const g = 9.81;

  const cd = input.cdOverride ?? CULVERT_INLET_PRESETS[inletType].cd;
  const ke = input.keOverride ?? CULVERT_INLET_PRESETS[inletType].ke;

  // ── findQ ──────────────────────────────────────────────────────────────────
  if (mode === "findQ") {
    const HW = input.head!;
    const D  = input.diameter;
    const A  = culvertArea(shape, D, input.boxWidth, input.boxHeight);
    const Rh = culvertRh(shape, D, input.boxWidth, input.boxHeight);
    const Kf = culvertKf(n, L, Rh);
    const dH = Math.max(0, HW - tailwater);

    const Qi = qInletFormula(cd, A, HW);
    const Qo = qOutletFormula(A, ke, Kf, dH);
    const Q  = Math.min(Qi, Qo);
    const V  = Q / A;

    const controlMode: CulvertDesignResult["controlMode"] =
      Math.abs(Qi - Qo) / Math.max(Qi, Qo) < 0.01 ? "balanced"
      : Qi < Qo ? "inlet" : "outlet";

    const hwdRatio = shape === "circular" ? HW / D! : undefined;

    return {
      area: A, hydraulicRadius: Rh, cd, ke, kf: Kf,
      qInletControl: Qi, qOutletControl: Qo,
      flowRate: Q, velocity: V, controlMode,
      hwdRatio, effectiveHead: dH,
      interpretation: `${controlMode === "inlet" ? "Inlet" : controlMode === "outlet" ? "Outlet" : "Balanced"} control governs. Q = ${Q.toFixed(3)} m³/s, V = ${V.toFixed(3)} m/s.`,
    };
  }

  // ── findH ──────────────────────────────────────────────────────────────────
  if (mode === "findH") {
    const Q  = input.flowRate!;
    const A  = culvertArea(shape, input.diameter, input.boxWidth, input.boxHeight);
    const Rh = culvertRh(shape, input.diameter, input.boxWidth, input.boxHeight);
    const Kf = culvertKf(n, L, Rh);
    const V  = Q / A;

    // HW from inlet control: Q = Cd·A·√(2g·HW) → HW = (Q/(Cd·A))²/(2g)
    const Hi = Math.pow(Q / (cd * A), 2) / (2 * g);
    // HW from outlet control: H = V²(1+Ke+Kf)/(2g) + TW
    const Ho = V * V * (1 + ke + Kf) / (2 * g) + tailwater;
    const H  = Math.max(Hi, Ho);

    const controlMode: CulvertDesignResult["controlMode"] =
      Math.abs(Hi - Ho) / Math.max(Hi, Ho) < 0.01 ? "balanced"
      : Hi > Ho ? "inlet" : "outlet";

    const hwdRatio = shape === "circular" && input.diameter ? H / input.diameter : undefined;

    return {
      area: A, hydraulicRadius: Rh, cd, ke, kf: Kf,
      flowRate: Q, velocity: V, controlMode,
      headInletControl: Hi, headOutletControl: Ho, head: H,
      hwdRatio, effectiveHead: H - tailwater,
      interpretation: `Required headwater HW = ${H.toFixed(3)} m — governed by ${controlMode} control.`,
    };
  }

  // ── findD (circular only) ──────────────────────────────────────────────────
  const Q  = input.flowRate!;
  const HW = input.head!;
  const dH = Math.max(0, HW - tailwater);

  // Inlet control: Cd·(πD²/4)·√(2g·HW) = Q → D = √(4Q / (π·Cd·√(2g·HW)))
  const Di = Math.sqrt((4 * Q) / (Math.PI * cd * Math.sqrt(2 * g * HW)));

  // Outlet control: bisect for D
  let lo = 0.01, hi = 10;
  for (let i = 0; i < 120; i++) {
    const mid = (lo + hi) / 2;
    const Am  = Math.PI * mid * mid / 4;
    const Rhm = mid / 4;
    const Kfm = culvertKf(n, L, Rhm);
    if (qOutletFormula(Am, ke, Kfm, dH) < Q) lo = mid; else hi = mid;
  }
  const Do = (lo + hi) / 2;

  const D  = Math.max(Di, Do);
  const A  = culvertArea("circular", D);
  const Rh = D / 4;
  const Kf = culvertKf(n, L, Rh);
  const V  = Q / A;

  const controlMode: CulvertDesignResult["controlMode"] =
    Math.abs(Di - Do) / Math.max(Di, Do) < 0.01 ? "balanced"
    : Di > Do ? "inlet" : "outlet";

  return {
    area: A, hydraulicRadius: Rh, cd, ke, kf: Kf,
    flowRate: Q, velocity: V, controlMode,
    diamInletControl: Di, diamOutletControl: Do, diameter: D,
    effectiveHead: dH,
    interpretation: `Required diameter D = ${D.toFixed(3)} m — governed by ${controlMode} control. Round up to next standard size.`,
  };
}

export function generateCulvertDesignSteps(input: CulvertDesignInput, result: CulvertDesignResult): Step[] {
  const g = 9.81;
  const { shape, length: L, manningN: n } = input;
  const { area: A, hydraulicRadius: Rh, cd, ke, kf: Kf } = result;
  const steps: Step[] = [];

  // Geometry
  if (shape === "circular") {
    const D = input.diameter ?? result.diameter!;
    steps.push({
      description: "Circular barrel cross-section",
      formula: "A = π D² / 4",
      calculation: `A = π × ${D.toFixed(4)}² / 4 = ${A.toFixed(5)} m²`,
      result: `${A.toFixed(5)}`, unit: "m²",
    });
    steps.push({
      description: "Hydraulic radius (full pipe)",
      formula: "R_h = D / 4",
      calculation: `R_h = ${D.toFixed(4)} / 4 = ${Rh.toFixed(5)} m`,
      result: `${Rh.toFixed(5)}`, unit: "m",
    });
  } else {
    const B = input.boxWidth!, Hc = input.boxHeight!;
    steps.push({
      description: "Box culvert cross-section",
      formula: "A = B × H_c",
      calculation: `A = ${B.toFixed(4)} × ${Hc.toFixed(4)} = ${A.toFixed(5)} m²`,
      result: `${A.toFixed(5)}`, unit: "m²",
    });
    steps.push({
      description: "Hydraulic radius (full box)",
      formula: "R_h = B·H_c / (2(B + H_c))",
      calculation: `R_h = ${(B * Hc).toFixed(5)} / ${(2 * (B + Hc)).toFixed(5)} = ${Rh.toFixed(5)} m`,
      result: `${Rh.toFixed(5)}`, unit: "m",
    });
  }

  // Friction loss coefficient
  steps.push({
    description: "Manning-based friction loss coefficient  K_f = 19.63 n² L / R_h^(4/3)",
    formula: "K_f = 19.63 × n² × L / R_h^(4/3)",
    calculation: `K_f = 19.63 × ${n}² × ${L.toFixed(2)} / ${Rh.toFixed(5)}^(4/3) = ${Kf.toFixed(4)}`,
    result: `${Kf.toFixed(4)}`,
  });

  if (input.mode === "findQ") {
    const HW = input.head!;
    const dH = result.effectiveHead!;
    // Inlet control
    steps.push({
      description: "Inlet control flow rate  Q_i = C_d × A × √(2g × HW)",
      formula: "Q_i = C_d × A × √(2g × HW)",
      calculation: `Q_i = ${cd.toFixed(3)} × ${A.toFixed(5)} × √(2 × ${g} × ${HW.toFixed(4)}) = ${result.qInletControl!.toFixed(5)} m³/s`,
      result: `${result.qInletControl!.toFixed(5)}`, unit: "m³/s",
    });
    // Outlet control
    steps.push({
      description: "Outlet control flow rate  Q_o = A × √(2g·ΔH / (1 + K_e + K_f))",
      formula: "Q_o = A × √(2g·ΔH / (1 + K_e + K_f))",
      calculation: `Q_o = ${A.toFixed(5)} × √(2×${g}×${dH.toFixed(4)} / (1 + ${ke.toFixed(3)} + ${Kf.toFixed(4)})) = ${result.qOutletControl!.toFixed(5)} m³/s`,
      result: `${result.qOutletControl!.toFixed(5)}`, unit: "m³/s",
    });
    steps.push({
      description: `Governing flow — take minimum (${result.controlMode} control)`,
      formula: "Q = min(Q_i, Q_o)",
      calculation: `Q = min(${result.qInletControl!.toFixed(5)}, ${result.qOutletControl!.toFixed(5)}) = ${result.flowRate.toFixed(5)} m³/s`,
      result: `${result.flowRate.toFixed(5)}`, unit: "m³/s",
    });
    steps.push({
      description: "Mean barrel velocity",
      formula: "V = Q / A",
      calculation: `V = ${result.flowRate.toFixed(5)} / ${A.toFixed(5)} = ${result.velocity.toFixed(5)} m/s`,
      result: `${result.velocity.toFixed(5)}`, unit: "m/s",
    });
  }

  if (input.mode === "findH") {
    const Q = result.flowRate;
    steps.push({
      description: "Mean barrel velocity",
      formula: "V = Q / A",
      calculation: `V = ${Q.toFixed(5)} / ${A.toFixed(5)} = ${result.velocity.toFixed(5)} m/s`,
      result: `${result.velocity.toFixed(5)}`, unit: "m/s",
    });
    steps.push({
      description: "Required HW — inlet control  HW_i = (Q / (C_d·A))² / (2g)",
      formula: "HW_i = (Q / (C_d × A))² / (2g)",
      calculation: `HW_i = (${Q.toFixed(5)} / (${cd.toFixed(3)} × ${A.toFixed(5)}))² / (2×${g}) = ${result.headInletControl!.toFixed(5)} m`,
      result: `${result.headInletControl!.toFixed(5)}`, unit: "m",
    });
    steps.push({
      description: "Required HW — outlet control  HW_o = V²(1+K_e+K_f)/(2g) + TW",
      formula: "HW_o = V²(1 + K_e + K_f) / (2g) + TW",
      calculation: `HW_o = ${result.velocity.toFixed(5)}²×(1+${ke}+${Kf.toFixed(4)}) / (2×${g}) + ${(input.tailwater??0).toFixed(3)} = ${result.headOutletControl!.toFixed(5)} m`,
      result: `${result.headOutletControl!.toFixed(5)}`, unit: "m",
    });
    steps.push({
      description: `Design headwater — take maximum (${result.controlMode} control governs)`,
      formula: "HW = max(HW_i, HW_o)",
      calculation: `HW = max(${result.headInletControl!.toFixed(5)}, ${result.headOutletControl!.toFixed(5)}) = ${result.head!.toFixed(5)} m`,
      result: `${result.head!.toFixed(5)}`, unit: "m",
    });
  }

  if (input.mode === "findD") {
    const Q = result.flowRate;
    const HW = input.head!;
    steps.push({
      description: "Inlet control — solve closed-form for D",
      formula: "D_i = √(4Q / (π·C_d·√(2g·HW)))",
      calculation: `D_i = √(4×${Q.toFixed(4)} / (π×${cd.toFixed(3)}×√(2×${g}×${HW.toFixed(4)}))) = ${result.diamInletControl!.toFixed(5)} m`,
      result: `${result.diamInletControl!.toFixed(5)}`, unit: "m",
    });
    steps.push({
      description: "Outlet control — bisection for D (Q_outlet(D) = Q_target)",
      formula: "Q_o(D) = A(D) × √(2g·ΔH / (1+K_e+K_f(D)))",
      calculation: `D_o = ${result.diamOutletControl!.toFixed(5)} m  (from numerical bisection)`,
      result: `${result.diamOutletControl!.toFixed(5)}`, unit: "m",
    });
    steps.push({
      description: `Design diameter — take maximum (${result.controlMode} control governs)`,
      formula: "D = max(D_i, D_o)",
      calculation: `D = max(${result.diamInletControl!.toFixed(5)}, ${result.diamOutletControl!.toFixed(5)}) = ${result.diameter!.toFixed(5)} m`,
      result: `${result.diameter!.toFixed(5)}`, unit: "m",
    });
    steps.push({
      description: "Mean velocity at design diameter",
      formula: "V = Q / A",
      calculation: `V = ${Q.toFixed(5)} / ${A.toFixed(5)} = ${result.velocity.toFixed(5)} m/s`,
      result: `${result.velocity.toFixed(5)}`, unit: "m/s",
    });
  }

  return steps;
}

export type TrapezoidalChannelMode = "findQ" | "findS" | "findN";

export interface TrapezoidalChannelInput {
  mode: TrapezoidalChannelMode;
  bottomWidth: number;   // m
  sideSlope: number;     // z (H:V, e.g. 1.5 means 1.5H:1V)
  depth: number;         // m  normal depth y_n
  manningN?: number;     // required for findQ, findS
  bedSlope?: number;     // m/m required for findQ, findN
  flowRate?: number;     // m³/s required for findS, findN
}

export interface TrapezoidalChannelResult {
  // cross-section
  topWidth: number;          // m   T = b + 2z·y
  area: number;              // m²  A
  wettedPerimeter: number;   // m   P
  hydraulicRadius: number;   // m   Rh = A/P
  hydraulicDepth: number;    // m   Dh = A/T
  // solved quantities
  velocity: number;          // m/s V
  flowRate: number;          // m³/s Q
  manningN: number;
  bedSlope: number;          // m/m
  // derived
  froudeNumber: number;
  criticalDepth: number;     // m  yc (bisection on A³/T = Q²/g)
  criticalSlope: number;     // m/m  Sc
  specificEnergy: number;    // m  E = y + V²/(2g)
  bedShearStress: number;    // Pa τ₀ = ρgRhS
  unitDischarge: number;     // m²/s  q = Q/T
  slopeType: string;
  interpretation: string;
}

function trapCriticalDepth(Q: number, b: number, z: number): number {
  const g = 9.81;
  const target = (Q * Q) / g;
  let lo = 1e-9, hi = 1000;
  for (let i = 0; i < 120; i++) {
    const mid = (lo + hi) / 2;
    const A = (b + z * mid) * mid;
    const T = b + 2 * z * mid;
    if ((A * A * A) / T < target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function trapCriticalSlope(Q: number, b: number, z: number, n: number): number {
  const g = 9.81;
  const yc = trapCriticalDepth(Q, b, z);
  const Ac = (b + z * yc) * yc;
  const Pc = b + 2 * yc * Math.sqrt(1 + z * z);
  const Rc = Ac / Pc;
  const Tc = b + 2 * z * yc;
  const Vc = Q / Ac;
  // Fr = 1 at yc; from Manning's: V = (1/n)Rc^(2/3)Sc^(1/2) = Vc → Sc = (Vc·n/Rc^(2/3))²
  // Also relate to Froude: Vc = √(g·Dh) where Dh = Ac/Tc
  void Tc; void Vc;
  const Sc = Math.pow((Q * n) / (Ac * Math.pow(Rc, 2 / 3)), 2);
  return Sc;
}

export function calculateTrapezoidalChannel(input: TrapezoidalChannelInput): TrapezoidalChannelResult {
  const { mode, bottomWidth: b, sideSlope: z, depth: y } = input;
  const g = 9.81;
  const rho = 1000; // kg/m³ water

  const T   = b + 2 * z * y;
  const A   = (b + z * y) * y;
  const P   = b + 2 * y * Math.sqrt(1 + z * z);
  const Rh  = A / P;
  const Dh  = A / T;

  let Q: number, n: number, S: number;

  if (mode === "findQ") {
    n = input.manningN!;
    S = input.bedSlope!;
    const V = (1 / n) * Math.pow(Rh, 2 / 3) * Math.pow(S, 0.5);
    Q = V * A;
  } else if (mode === "findS") {
    Q = input.flowRate!;
    n = input.manningN!;
    const V = Q / A;
    S = Math.pow((V * n) / Math.pow(Rh, 2 / 3), 2);
  } else {
    // findN
    Q = input.flowRate!;
    S = input.bedSlope!;
    const V = Q / A;
    n = (A * Math.pow(Rh, 2 / 3) * Math.pow(S, 0.5)) / Q;
    void V;
  }

  const V  = Q / A;
  const Fr = V / Math.sqrt(g * Dh);
  const E  = y + (V * V) / (2 * g);
  const tau0 = rho * g * Rh * S;
  const q  = Q / T;

  const yc = trapCriticalDepth(Q, b, z);
  const Sc = trapCriticalSlope(Q, b, z, n);

  const diff = (y - yc) / (yc || 1);
  const slopeType =
    Math.abs(diff) < 0.005 ? "critical slope" :
    y > yc            ? "mild slope" :
                        "steep slope";

  const slopeDesc =
    slopeType === "mild slope"     ? `Mild slope (S < Sc = ${Sc.toExponential(3)}) — normal flow is subcritical (Fr < 1).` :
    slopeType === "steep slope"    ? `Steep slope (S > Sc = ${Sc.toExponential(3)}) — normal flow is supercritical (Fr > 1).` :
                                     `Critical slope (S ≈ Sc = ${Sc.toExponential(3)}) — normal depth equals critical depth.`;

  return {
    topWidth: T, area: A, wettedPerimeter: P,
    hydraulicRadius: Rh, hydraulicDepth: Dh,
    velocity: V, flowRate: Q, manningN: n, bedSlope: S,
    froudeNumber: Fr, criticalDepth: yc, criticalSlope: Sc,
    specificEnergy: E, bedShearStress: tau0, unitDischarge: q,
    slopeType,
    interpretation: slopeDesc,
  };
}

export function generateTrapezoidalChannelSteps(input: TrapezoidalChannelInput, result: TrapezoidalChannelResult): Step[] {
  const { bottomWidth: b, sideSlope: z, depth: y } = input;
  const { topWidth: T, area: A, wettedPerimeter: P, hydraulicRadius: Rh, hydraulicDepth: Dh,
          velocity: V, flowRate: Q, manningN: n, bedSlope: S,
          froudeNumber: Fr, criticalDepth: yc, specificEnergy: E } = result;
  const g = 9.81;

  const steps: Step[] = [
    {
      description: "Top width (free-surface width)",
      formula: "T = b + 2z·y",
      calculation: `T = ${b.toFixed(4)} + 2 × ${z} × ${y.toFixed(4)} = ${T.toFixed(5)} m`,
      result: `${T.toFixed(5)}`, unit: "m",
    },
    {
      description: "Flow area",
      formula: "A = (b + z·y) × y",
      calculation: `A = (${b.toFixed(4)} + ${z} × ${y.toFixed(4)}) × ${y.toFixed(4)} = ${A.toFixed(5)} m²`,
      result: `${A.toFixed(5)}`, unit: "m²",
    },
    {
      description: "Wetted perimeter",
      formula: "P = b + 2y√(1 + z²)",
      calculation: `P = ${b.toFixed(4)} + 2 × ${y.toFixed(4)} × √(1 + ${z}²) = ${P.toFixed(5)} m`,
      result: `${P.toFixed(5)}`, unit: "m",
    },
    {
      description: "Hydraulic radius  R_h = A / P",
      formula: "R_h = A / P",
      calculation: `R_h = ${A.toFixed(5)} / ${P.toFixed(5)} = ${Rh.toFixed(5)} m`,
      result: `${Rh.toFixed(5)}`, unit: "m",
    },
    {
      description: "Hydraulic depth  D_h = A / T  (for Froude number)",
      formula: "D_h = A / T",
      calculation: `D_h = ${A.toFixed(5)} / ${T.toFixed(5)} = ${Dh.toFixed(5)} m`,
      result: `${Dh.toFixed(5)}`, unit: "m",
    },
  ];

  if (input.mode === "findQ") {
    steps.push({
      description: "Manning's mean velocity",
      formula: "V = (1/n) × R_h^(2/3) × S^(1/2)",
      calculation: `V = (1/${n.toFixed(4)}) × ${Rh.toFixed(5)}^(2/3) × ${S.toExponential(3)}^(1/2) = ${V.toFixed(5)} m/s`,
      result: `${V.toFixed(5)}`, unit: "m/s",
    });
    steps.push({
      description: "Flow rate",
      formula: "Q = V × A",
      calculation: `Q = ${V.toFixed(5)} × ${A.toFixed(5)} = ${Q.toFixed(5)} m³/s`,
      result: `${Q.toFixed(5)}`, unit: "m³/s",
    });
  } else if (input.mode === "findS") {
    steps.push({
      description: "Mean velocity from continuity",
      formula: "V = Q / A",
      calculation: `V = ${Q.toFixed(5)} / ${A.toFixed(5)} = ${V.toFixed(5)} m/s`,
      result: `${V.toFixed(5)}`, unit: "m/s",
    });
    steps.push({
      description: "Required bed slope — rearrange Manning's",
      formula: "S = (V·n / R_h^(2/3))²",
      calculation: `S = (${V.toFixed(5)} × ${n.toFixed(4)} / ${Rh.toFixed(5)}^(2/3))² = ${S.toExponential(4)}`,
      result: `${S.toExponential(4)}`, unit: "m/m",
    });
  } else {
    steps.push({
      description: "Mean velocity from continuity",
      formula: "V = Q / A",
      calculation: `V = ${Q.toFixed(5)} / ${A.toFixed(5)} = ${V.toFixed(5)} m/s`,
      result: `${V.toFixed(5)}`, unit: "m/s",
    });
    steps.push({
      description: "Manning's n — rearrange Manning's equation",
      formula: "n = A × R_h^(2/3) × S^(1/2) / Q",
      calculation: `n = ${A.toFixed(5)} × ${Rh.toFixed(5)}^(2/3) × ${S.toExponential(3)}^(1/2) / ${Q.toFixed(5)} = ${n.toFixed(5)}`,
      result: `${n.toFixed(5)}`,
    });
  }

  steps.push({
    description: "Froude number  Fr = V / √(g × D_h)",
    formula: "Fr = V / √(g × D_h)",
    calculation: `Fr = ${V.toFixed(5)} / √(${g} × ${Dh.toFixed(5)}) = ${Fr.toFixed(5)}`,
    result: `${Fr.toFixed(5)}`,
  });

  steps.push({
    description: "Specific energy  E = y + V²/(2g)",
    formula: "E = y + V²/(2g)",
    calculation: `E = ${y.toFixed(4)} + ${V.toFixed(5)}² / (2 × ${g}) = ${E.toFixed(5)} m`,
    result: `${E.toFixed(5)}`, unit: "m",
  });

  steps.push({
    description: "Critical depth yc — bisection on A³/T = Q²/g",
    formula: "A(yc)³ / T(yc) = Q² / g",
    calculation: `y_c = ${yc.toFixed(5)} m`,
    result: `${yc.toFixed(5)}`, unit: "m",
  });

  steps.push({
    description: `Slope classification — compare y_n with y_c`,
    calculation: `y_n = ${y.toFixed(4)} m  vs  y_c = ${yc.toFixed(5)} m → ${result.slopeType}`,
    result: result.slopeType,
  });

  return steps;
}

export interface SedimentTransportInput {
  particleDiameter: number;   // m
  sedimentDensity: number;    // kg/m³
  fluidDensity: number;       // kg/m³
  shearStress: number;        // Pa (bed shear stress)
}
export interface SedimentTransportResult {
  shieldsCriterion: number;   // τ* = τ/((ρs-ρ)g·d)
  shieldsThreshold: number;   // typical 0.047 for sand
  criticalShearStress: number; // τ_cr = θ_cr × (ρs-ρ) × g × d  [Pa]
  mobilityRatio: number;       // θ / θ_cr  (>1 → moving)
  isMoving: boolean;
  interpretation: string;
}
export function calculateSedimentTransport(input: SedimentTransportInput): SedimentTransportResult {
  const { particleDiameter, sedimentDensity, fluidDensity, shearStress } = input;
  const g = 9.81;
  const shieldsThreshold = 0.047;
  const submergedWeight = (sedimentDensity - fluidDensity) * g * particleDiameter;
  const shieldsCriterion = shearStress / submergedWeight;
  const criticalShearStress = shieldsThreshold * submergedWeight;
  const mobilityRatio = shieldsCriterion / shieldsThreshold;
  const isMoving = shieldsCriterion > shieldsThreshold;
  return { shieldsCriterion, shieldsThreshold, criticalShearStress, mobilityRatio, isMoving, interpretation: `Shields parameter τ* = ${shieldsCriterion.toFixed(4)} — sediment ${isMoving ? "is moving (τ* > 0.047)" : "is not moving (τ* < 0.047)"}.` };
}
export function generateSedimentTransportSteps(input: SedimentTransportInput, result: SedimentTransportResult): Step[] {
  const submergedWeight = (input.sedimentDensity - input.fluidDensity) * 9.81 * input.particleDiameter;
  return [
    { description: "Shields parameter (dimensionless shear stress)", formula: "τ* = τ / ((ρs - ρ) × g × d)" },
    { description: "Substitute values", calculation: `τ* = ${input.shearStress} / ((${input.sedimentDensity} - ${input.fluidDensity}) × 9.81 × ${input.particleDiameter})` },
    { description: "Shields parameter", calculation: `τ* = ${result.shieldsCriterion.toFixed(4)}`, result: `${result.shieldsCriterion.toFixed(4)}`, unit: "dimensionless" },
    { description: "Critical shear stress (τ_cr = θ_cr × (ρs - ρ) × g × d)", formula: "τ_cr = 0.047 × (ρs - ρ) × g × d", calculation: `τ_cr = 0.047 × ${submergedWeight.toFixed(4)} = ${result.criticalShearStress.toFixed(4)} Pa`, result: `${result.criticalShearStress.toFixed(4)}`, unit: "Pa" },
    { description: "Mobility ratio", formula: "θ / θ_cr", calculation: `${result.shieldsCriterion.toFixed(4)} / 0.047 = ${result.mobilityRatio.toFixed(3)}`, result: `${result.mobilityRatio.toFixed(3)}`, unit: "dimensionless" },
    { description: "Motion criterion", calculation: result.isMoving ? `τ* (${result.shieldsCriterion.toFixed(4)}) > θ_cr (0.047) → sediment in motion` : `τ* (${result.shieldsCriterion.toFixed(4)}) < θ_cr (0.047) → bed is stable` },
  ];
}

export interface GraduallyVariedFlowInput {
  flowRate: number;      // m³/s
  channelWidth: number;  // m (rectangular)
  bedSlope: number;      // m/m
  manningN: number;
  depth: number;         // m (current depth)
}
export interface GraduallyVariedFlowResult {
  normalDepth: number;
  criticalDepth: number;
  froudeNumber: number;
  frictionSlope: number;   // S_f computed at depth y
  criticalSlope: number;   // S_c — slope at which y_n = y_c
  dydx: number;
  profile: string;         // M1, M2, M3, S1, S2, S3, C1, C3
  slopeType: string;       // "mild" | "steep" | "critical"
  profileDescription: string;
  interpretation: string;
}
export function calculateGraduallyVariedFlow(input: GraduallyVariedFlowInput): GraduallyVariedFlowResult {
  const { flowRate: Q, channelWidth: b, bedSlope: S0, manningN: n, depth: y } = input;
  const g = 9.81;

  // Flow geometry at current depth
  const A  = b * y;
  const P  = b + 2 * y;
  const R  = A / P;
  const V  = Q / A;
  const Fr = V / Math.sqrt(g * y);         // rectangular: A/T = y
  const Sf = Math.pow(n * V / Math.pow(R, 2 / 3), 2);

  // Critical depth (rectangular closed-form)
  const q  = Q / b;                        // unit discharge
  const yc = Math.pow(q * q / g, 1 / 3);

  // Critical slope (slope that makes y_n = y_c)
  const Ac  = b * yc;
  const Pc  = b + 2 * yc;
  const Rc  = Ac / Pc;
  const Vc  = Math.sqrt(g * yc);
  const Sc  = Math.pow(n * Vc / Math.pow(Rc, 2 / 3), 2);

  // Normal depth (Manning's, bisection — robust for any Q and S0)
  const normalDepth = (() => {
    let yn = yc;                            // initial guess near critical
    for (let i = 0; i < 200; i++) {
      const An = b * yn;
      const Pn = b + 2 * yn;
      const Rn = An / Pn;
      const Qn = (1 / n) * An * Math.pow(Rn, 2 / 3) * Math.sqrt(S0);
      if (Math.abs(Qn - Q) / Q < 1e-7) break;
      yn *= Math.pow(Q / Qn, 0.4);
    }
    return yn;
  })();

  const dydx = (S0 - Sf) / (1 - Fr * Fr);

  // Slope type
  const relDiff = (normalDepth - yc) / yc;
  const slopeType = Math.abs(relDiff) < 0.005 ? "critical"
    : normalDepth > yc ? "mild"
    : "steep";

  // Profile classification
  let profile: string;
  let profileDescription: string;
  if (slopeType === "mild") {
    if (y > normalDepth)      { profile = "M1"; profileDescription = "Backwater curve — depth decreases downstream toward yₙ"; }
    else if (y > yc)          { profile = "M2"; profileDescription = "Drawdown curve — depth decreases downstream toward yᴄ"; }
    else                      { profile = "M3"; profileDescription = "Supercritical — depth increases downstream after obstruction"; }
  } else if (slopeType === "steep") {
    if (y > yc)               { profile = "S1"; profileDescription = "Subcritical backwater — depth decreases downstream toward yᴄ"; }
    else if (y > normalDepth) { profile = "S2"; profileDescription = "Supercritical drawdown — depth decreases toward yₙ"; }
    else                      { profile = "S3"; profileDescription = "Supercritical — depth increases downstream"; }
  } else {
    if (y > yc)               { profile = "C1"; profileDescription = "Subcritical flow on critical slope — unstable, approaches uniform critical"; }
    else                      { profile = "C3"; profileDescription = "Supercritical flow on critical slope — unstable, approaches uniform critical"; }
  }

  return {
    normalDepth, criticalDepth: yc, froudeNumber: Fr,
    frictionSlope: Sf, criticalSlope: Sc,
    dydx, profile, slopeType, profileDescription,
    interpretation: `${profile} profile (${slopeType} slope). y=${y.toFixed(3)} m, y_n=${normalDepth.toFixed(3)} m, y_c=${yc.toFixed(3)} m. Fr=${Fr.toFixed(3)}, dy/dx=${dydx.toExponential(3)}.`,
  };
}
export function generateGraduallyVariedFlowSteps(input: GraduallyVariedFlowInput, result: GraduallyVariedFlowResult): Step[] {
  const q = input.flowRate / input.channelWidth;
  const A = input.channelWidth * input.depth;
  const P = input.channelWidth + 2 * input.depth;
  const R = A / P;
  return [
    { description: "Unit discharge q = Q / b", formula: "q = Q / b", calculation: `q = ${input.flowRate} / ${input.channelWidth} = ${q.toFixed(4)} m²/s`, result: `${q.toFixed(4)}`, unit: "m²/s" },
    { description: "Critical depth (rectangular channel)", formula: "y_c = (q² / g)^{1/3}", calculation: `y_c = (${q.toFixed(4)}² / 9.81)^{1/3} = ${result.criticalDepth.toFixed(4)} m`, result: `${result.criticalDepth.toFixed(4)}`, unit: "m" },
    { description: "Normal depth from Manning's equation (iterative)", formula: "Q = (1/n) A R^{2/3} S_0^{1/2}", calculation: `y_n = ${result.normalDepth.toFixed(4)} m  →  slope is ${result.slopeType} (y_n ${result.normalDepth > result.criticalDepth ? ">" : "<"} y_c)`, result: `${result.normalDepth.toFixed(4)}`, unit: "m" },
    { description: "Velocity and Froude number at current depth y", formula: "V = Q / A,   Fr = V / √(g·y)", calculation: `V = ${input.flowRate} / ${A.toFixed(4)} = ${(input.flowRate / A).toFixed(4)} m/s,   Fr = ${result.froudeNumber.toFixed(4)}  →  ${result.froudeNumber < 1 ? "subcritical" : "supercritical"}`, result: `${result.froudeNumber.toFixed(4)}`, unit: "dimensionless" },
    { description: "Friction slope S_f from Manning's at depth y", formula: "S_f = (n V / R^{2/3})²", calculation: `S_f = (${input.manningN} × ${(input.flowRate / A).toFixed(4)} / ${Math.pow(R, 2/3).toFixed(4)})² = ${result.frictionSlope.toExponential(4)}`, result: `${result.frictionSlope.toExponential(4)}`, unit: "m/m" },
    { description: "GVF equation — water surface slope", formula: "dy/dx = (S_0 - S_f) / (1 - Fr²)", calculation: `dy/dx = (${input.bedSlope} − ${result.frictionSlope.toExponential(3)}) / (1 − ${result.froudeNumber.toFixed(4)}²) = ${result.dydx.toExponential(4)}`, result: `${result.dydx.toExponential(4)}`, unit: "m/m" },
    { description: "Profile classification", calculation: `${result.profile} — ${result.profileDescription}`, result: result.profile },
  ];
}

export interface TidalPrismInput {
  basinArea: number;       // m²
  highWaterLevel: number;  // m (MSL reference)
  lowWaterLevel: number;   // m (MSL reference)
  tidalPeriod?: number;    // hours — optional, for average flow rate
}
export interface TidalPrismResult {
  tidalPrism: number;          // m³
  tidalRange: number;          // m
  obriensInletArea: number;    // m²  — simplified O'Brien: Ac = 6.25×10⁻⁴ × P
  averageFlowRate?: number;    // m³/s — half-period average ebb or flood flow
  interpretation: string;
}
export function calculateTidalPrism(input: TidalPrismInput): TidalPrismResult {
  const { basinArea, highWaterLevel, lowWaterLevel, tidalPeriod } = input;
  const tidalRange  = Math.abs(highWaterLevel - lowWaterLevel);
  const tidalPrism  = basinArea * tidalRange;
  const obriensInletArea = 6.25e-4 * tidalPrism;          // simplified linear O'Brien
  const averageFlowRate  = tidalPeriod
    ? tidalPrism / ((tidalPeriod / 2) * 3600)              // P / (T/2 in seconds)
    : undefined;
  return {
    tidalPrism, tidalRange, obriensInletArea, averageFlowRate,
    interpretation: `Tidal prism P = ${tidalPrism.toFixed(0)} m³ (${(tidalPrism / 1e6).toFixed(3)} × 10⁶ m³) for a tidal range of ${tidalRange.toFixed(2)} m.`,
  };
}
export function generateTidalPrismSteps(input: TidalPrismInput, result: TidalPrismResult): Step[] {
  const steps: Step[] = [
    { description: "Tidal range", formula: "R = HWL − LWL", calculation: `R = ${input.highWaterLevel} − (${input.lowWaterLevel}) = ${result.tidalRange.toFixed(3)} m`, result: `${result.tidalRange.toFixed(3)}`, unit: "m" },
    { description: "Tidal prism (volume exchanged per cycle)", formula: "P = A_b × R", calculation: `P = ${input.basinArea.toFixed(0)} × ${result.tidalRange.toFixed(3)} = ${result.tidalPrism.toFixed(0)} m³`, result: `${result.tidalPrism.toFixed(0)}`, unit: "m³" },
    { description: "O'Brien inlet area (simplified, n = 1)", formula: "A_c = 6.25 × 10^{-4} × P", calculation: `A_c = 6.25 × 10^{-4} × ${result.tidalPrism.toFixed(0)} = ${result.obriensInletArea.toFixed(2)} m²`, result: `${result.obriensInletArea.toFixed(2)}`, unit: "m²" },
  ];
  if (result.averageFlowRate !== undefined && input.tidalPeriod) {
    steps.push({
      description: `Average ebb/flood flow (half-period = ${(input.tidalPeriod / 2).toFixed(1)} h)`,
      formula: "Q = P / (T/2)",
      calculation: `Q = ${result.tidalPrism.toFixed(0)} / ${((input.tidalPeriod / 2) * 3600).toFixed(0)} s = ${result.averageFlowRate.toFixed(2)} m³/s`,
      result: `${result.averageFlowRate.toFixed(2)}`, unit: "m³/s",
    });
  }
  return steps;
}

// ============================================================================
// Flow Work
// ============================================================================

export interface FlowWorkInput {
  pressure: number;       // Pa (absolute)
  density: number;        // kg/m³
  massFlowRate?: number;  // kg/s (optional — for flow work rate)
}

export interface FlowWorkResult {
  specificFlowWork: number;  // J/kg  (= P/ρ)
  specificVolume: number;    // m³/kg (= 1/ρ)
  flowWorkRate?: number;     // W     (= ṁ × P/ρ)
  interpretation: string;
}

export function calculateFlowWork(input: FlowWorkInput): FlowWorkResult {
  const { pressure, density, massFlowRate } = input;

  if (pressure < 0)  throw new Error("Pressure must be non-negative");
  if (density <= 0)  throw new Error("Density must be positive");

  const specificVolume   = 1 / density;
  const specificFlowWork = pressure * specificVolume; // P/ρ [J/kg]
  const flowWorkRate     = massFlowRate !== undefined ? massFlowRate * specificFlowWork : undefined;

  return {
    specificFlowWork,
    specificVolume,
    flowWorkRate,
    interpretation: `${fmtN(specificFlowWork)} J/kg`,
  };
}

export function generateFlowWorkSteps(input: FlowWorkInput, result: FlowWorkResult): Step[] {
  const { pressure, density, massFlowRate } = input;

  const steps: Step[] = [
    {
      description: "Write the specific flow work equation",
      formula: "w_{flow} = P × v = P / ρ",
    },
    {
      description: "Compute specific volume",
      calculation: `v = 1 / ρ = 1 / ${fmtN(density)} = ${fmtN(result.specificVolume)} m³/kg`,
      result: `v = ${fmtN(result.specificVolume)} m³/kg`,
    },
    {
      description: "Specific flow work",
      calculation: `w_{flow} = ${fmtN(pressure)} × ${fmtN(result.specificVolume)}`,
      result: `w_{flow} = ${fmtN(result.specificFlowWork)} J/kg`,
    },
  ];

  if (massFlowRate !== undefined && result.flowWorkRate !== undefined) {
    steps.push({
      description: "Flow work rate (power)",
      calculation: `\\dot{W}_{flow} = ṁ × w_{flow} = ${fmtN(massFlowRate)} × ${fmtN(result.specificFlowWork)}`,
      result: `\\dot{W}_{flow} = ${fmtN(result.flowWorkRate)} W`,
    });
  }

  return steps;
}

// ============================================================================
// Prandtl Number
// ============================================================================

export type PrandtlMode = "findPr" | "findK" | "findMu";

export interface PrandtlNumberInput {
  mode: PrandtlMode;
  prandtlNumber?: number;        // dimensionless
  dynamicViscosity?: number;     // Pa·s
  specificHeat?: number;         // J/(kg·K)
  thermalConductivity?: number;  // W/(m·K)
  density?: number;              // kg/m³ (optional — unlocks ν and α outputs)
}

export interface PrandtlNumberResult {
  prandtlNumber: number;
  dynamicViscosity: number;      // Pa·s
  specificHeat: number;          // J/(kg·K)
  thermalConductivity: number;   // W/(m·K)
  kinematicViscosity?: number;   // m²/s = μ/ρ
  thermalDiffusivity?: number;   // m²/s = k/(ρ·cₚ)
  interpretation: string;
}

export function calculatePrandtlNumber(input: PrandtlNumberInput): PrandtlNumberResult {
  const { mode, density } = input;
  let Pr: number, mu: number, cp: number, k: number;

  if (mode === "findPr") {
    if (!input.dynamicViscosity || !input.specificHeat || !input.thermalConductivity)
      throw new Error("μ, cₚ, and k are required");
    mu = input.dynamicViscosity;
    cp = input.specificHeat;
    k  = input.thermalConductivity;
    if (mu <= 0 || cp <= 0 || k <= 0) throw new Error("All values must be positive");
    Pr = (mu * cp) / k;

  } else if (mode === "findK") {
    if (!input.prandtlNumber || !input.dynamicViscosity || !input.specificHeat)
      throw new Error("Pr, μ, and cₚ are required");
    Pr = input.prandtlNumber;
    mu = input.dynamicViscosity;
    cp = input.specificHeat;
    if (Pr <= 0 || mu <= 0 || cp <= 0) throw new Error("All values must be positive");
    k  = (mu * cp) / Pr;

  } else {
    if (!input.prandtlNumber || !input.thermalConductivity || !input.specificHeat)
      throw new Error("Pr, k, and cₚ are required");
    Pr = input.prandtlNumber;
    k  = input.thermalConductivity;
    cp = input.specificHeat;
    if (Pr <= 0 || k <= 0 || cp <= 0) throw new Error("All values must be positive");
    mu = (Pr * k) / cp;
  }

  const kinematicViscosity = density ? mu / density : undefined;
  const thermalDiffusivity = density ? k / (density * cp) : undefined;

  let regime: string;
  if (Pr < 0.01)       regime = "liquid metals (Pr << 1): thermal diffusion >> momentum diffusion";
  else if (Pr < 0.1)   regime = "mercury / liquid-metal range: thin velocity BL, thick thermal BL";
  else if (Pr < 0.7)   regime = "low-Pr fluids approaching metallic behaviour";
  else if (Pr <= 1)    regime = "gases (Pr ≈ 1): thermal and momentum boundary layers are similar in thickness";
  else if (Pr <= 10)   regime = "light oils and some organic liquids: momentum diffusion slightly dominates";
  else if (Pr <= 1000) regime = "oils: momentum diffusion >> thermal diffusion, thick velocity BL";
  else                 regime = "very viscous liquids / heavy oils (Pr >> 1)";

  return {
    prandtlNumber: Pr,
    dynamicViscosity: mu,
    specificHeat: cp,
    thermalConductivity: k,
    kinematicViscosity,
    thermalDiffusivity,
    interpretation: `Pr = ${Pr.toFixed(4)}: ${regime}.`,
  };
}

export function generatePrandtlNumberSteps(input: PrandtlNumberInput, result: PrandtlNumberResult): Step[] {
  const { mode } = input;
  const { prandtlNumber: Pr, dynamicViscosity: mu, specificHeat: cp, thermalConductivity: k } = result;

  if (mode === "findPr") {
    const stepArr: Step[] = [
      { description: "Write the Prandtl number definition", formula: "Pr = μ × c_p / k" },
      { description: "Substitute μ, cₚ, and k",
        calculation: `Pr = ${mu.toExponential(4)} × ${cp.toFixed(2)} / ${k.toFixed(6)} = ${Pr.toFixed(5)}`,
        result: `${Pr.toFixed(5)}`, unit: "dimensionless" },
    ];
    if (result.kinematicViscosity !== undefined && result.thermalDiffusivity !== undefined) {
      stepArr.push({
        description: "Equivalent diffusivity-ratio form  Pr = ν / α",
        formula: "Pr = ν / α",
        calculation: `Pr = ${result.kinematicViscosity.toExponential(4)} / ${result.thermalDiffusivity.toExponential(4)} = ${Pr.toFixed(4)}`,
      });
    }
    return stepArr;
  }

  if (mode === "findK") {
    return [
      { description: "Rearrange Prandtl definition for thermal conductivity", formula: "k = μ × c_p / Pr" },
      { description: "Substitute Pr, μ, and cₚ",
        calculation: `k = ${mu.toExponential(4)} × ${cp.toFixed(2)} / ${Pr.toFixed(4)} = ${k.toFixed(6)} W/(m·K)`,
        result: `${k.toFixed(6)}`, unit: "W/(m·K)" },
    ];
  }

  return [
    { description: "Rearrange Prandtl definition for dynamic viscosity", formula: "μ = Pr × k / c_p" },
    { description: "Substitute Pr, k, and cₚ",
      calculation: `μ = ${Pr.toFixed(4)} × ${k.toFixed(6)} / ${cp.toFixed(2)} = ${mu.toExponential(4)} Pa·s`,
      result: `${mu.toExponential(4)}`, unit: "Pa·s" },
  ];
}

// ============================================================================
// Grashof Number
// ============================================================================

export type GrashofMode = "findGr" | "findDT" | "findL" | "findNu";

export interface GrashofNumberInput {
  mode: GrashofMode;
  grashofNumber?: number;       // dimensionless
  gravity?: number;             // m/s²  (default 9.81)
  thermalExpansion: number;     // 1/K  β
  deltaT?: number;              // K or °C  |Tw - T∞|
  length: number;               // m  characteristic length
  kinematicViscosity: number;   // m²/s  ν
  prandtlNumber?: number;       // dimensionless — if provided, also compute Ra and Nu regime
}

export interface GrashofNumberResult {
  grashofNumber: number;
  rayleighNumber?: number;      // Gr × Pr (if Pr supplied)
  deltaT: number;               // K
  length: number;               // m
  convectionRegime: string;     // laminar / transitional / turbulent
  interpretation: string;
}

export function calculateGrashofNumber(input: GrashofNumberInput): GrashofNumberResult {
  const { mode, thermalExpansion: beta, kinematicViscosity: nu, prandtlNumber: Pr } = input;
  const g = input.gravity ?? 9.81;

  if (beta <= 0) throw new Error("Thermal expansion coefficient must be positive");
  if (nu <= 0)   throw new Error("Kinematic viscosity must be positive");

  let Gr: number, dT: number, L: number;

  if (mode === "findGr" || mode === "findNu") {
    if (input.deltaT === undefined || input.length === undefined)
      throw new Error("ΔT and L are required");
    dT = input.deltaT;
    L  = input.length;
    if (dT <= 0) throw new Error("ΔT must be positive");
    if (L  <= 0) throw new Error("L must be positive");
    Gr = (g * beta * dT * Math.pow(L, 3)) / (nu * nu);

  } else if (mode === "findDT") {
    if (input.grashofNumber === undefined || input.length === undefined)
      throw new Error("Gr and L are required");
    Gr = input.grashofNumber;
    L  = input.length;
    if (Gr <= 0) throw new Error("Gr must be positive");
    if (L  <= 0) throw new Error("L must be positive");
    dT = (Gr * nu * nu) / (g * beta * Math.pow(L, 3));

  } else {
    // findL
    if (input.grashofNumber === undefined || input.deltaT === undefined)
      throw new Error("Gr and ΔT are required");
    Gr = input.grashofNumber;
    dT = input.deltaT;
    if (Gr <= 0) throw new Error("Gr must be positive");
    if (dT <= 0) throw new Error("ΔT must be positive");
    L  = Math.pow((Gr * nu * nu) / (g * beta * dT), 1 / 3);
  }

  const Ra = Pr !== undefined ? Gr * Pr : undefined;

  let convectionRegime: string;
  if (Gr < 1e4)        convectionRegime = "negligible natural convection";
  else if (Gr < 1e8)   convectionRegime = "laminar natural convection";
  else if (Gr < 1e9)   convectionRegime = "transitional natural convection";
  else                 convectionRegime = "turbulent natural convection";

  const raStr = Ra !== undefined ? `  Ra = Gr × Pr = ${Ra.toExponential(3)}` : "";
  return {
    grashofNumber: Gr,
    rayleighNumber: Ra,
    deltaT: dT,
    length: L,
    convectionRegime,
    interpretation: `Gr = ${Gr.toExponential(3)}${raStr} — ${convectionRegime}.`,
  };
}

export function generateGrashofNumberSteps(input: GrashofNumberInput, result: GrashofNumberResult): Step[] {
  const { mode } = input;
  const g = input.gravity ?? 9.81;
  const beta = input.thermalExpansion;
  const nu   = input.kinematicViscosity;
  const { grashofNumber: Gr, deltaT: dT, length: L } = result;

  if (mode === "findGr" || mode === "findNu") {
    const steps: Step[] = [
      { description: "Write the Grashof number definition",
        formula: "Gr = g × β × ΔT × L³ / ν²" },
      { description: "Substitute g, β, ΔT, L, and ν",
        calculation: `Gr = ${g} × ${beta.toExponential(4)} × ${dT.toFixed(4)} × ${L.toExponential(4)}³ / (${nu.toExponential(4)})²`,
        result: `${Gr.toExponential(5)}`, unit: "dimensionless" },
    ];
    if (result.rayleighNumber !== undefined) {
      steps.push({
        description: "Rayleigh number (Gr × Pr)",
        formula: "Ra = Gr × Pr",
        calculation: `Ra = ${Gr.toExponential(4)} × ${input.prandtlNumber?.toFixed(4)} = ${result.rayleighNumber.toExponential(4)}`,
        result: `${result.rayleighNumber.toExponential(4)}`, unit: "dimensionless",
      });
    }
    return steps;
  }

  if (mode === "findDT") {
    return [
      { description: "Rearrange Grashof definition for ΔT",
        formula: "ΔT = Gr × ν² / (g × β × L³)" },
      { description: "Substitute values",
        calculation: `ΔT = ${Gr.toExponential(4)} × (${nu.toExponential(4)})² / (${g} × ${beta.toExponential(4)} × ${L.toExponential(4)}³) = ${dT.toFixed(4)} K`,
        result: `${dT.toFixed(4)}`, unit: "K" },
    ];
  }

  return [
    { description: "Rearrange Grashof definition for characteristic length",
      formula: "L = (Gr × ν² / (g × β × ΔT))^(1/3)" },
    { description: "Substitute values",
      calculation: `L = (${Gr.toExponential(4)} × (${nu.toExponential(4)})² / (${g} × ${beta.toExponential(4)} × ${dT.toFixed(4)}))^(1/3) = ${L.toExponential(4)} m`,
      result: `${L.toExponential(4)}`, unit: "m" },
  ];
}

// ============================================================================
// Rayleigh Number
// ============================================================================

export type RayleighMode = "findRa" | "findDT" | "findL";

export interface RayleighNumberInput {
  mode: RayleighMode;
  rayleighNumber?: number;       // dimensionless
  gravity?: number;              // m/s² (default 9.81)
  thermalExpansion: number;      // 1/K  β
  deltaT?: number;               // K  |Tw − T∞|
  length: number;                // m  characteristic length (for findRa / findDT modes)
  kinematicViscosity: number;    // m²/s  ν
  thermalDiffusivity: number;    // m²/s  α = k/(ρ cₚ)
  thermalConductivity?: number;  // W/(m·K) k — optional, enables h output
}

export interface RayleighNumberResult {
  rayleighNumber: number;
  grashofNumber: number;         // Ra / Pr
  prandtlNumber: number;         // ν / α
  deltaT: number;                // K
  length: number;                // m
  nusseltNumber?: number;        // Churchill-Chu vertical-plate correlation
  heatTransferCoeff?: number;    // W/(m²·K)  h = Nu × k / L
  convectionRegime: string;
  interpretation: string;
}

export function calculateRayleighNumber(input: RayleighNumberInput): RayleighNumberResult {
  const { mode, thermalExpansion: beta, kinematicViscosity: nu, thermalDiffusivity: alpha } = input;
  const g = input.gravity ?? 9.81;

  if (beta  <= 0) throw new Error("Thermal expansion coefficient must be positive");
  if (nu    <= 0) throw new Error("Kinematic viscosity must be positive");
  if (alpha <= 0) throw new Error("Thermal diffusivity must be positive");

  const Pr = nu / alpha;
  let Ra: number, dT: number, L: number;

  if (mode === "findRa") {
    if (input.deltaT === undefined) throw new Error("ΔT is required");
    if (input.length <= 0)          throw new Error("L must be positive");
    dT = input.deltaT;
    L  = input.length;
    if (dT <= 0) throw new Error("ΔT must be positive");
    Ra = (g * beta * dT * Math.pow(L, 3)) / (nu * alpha);

  } else if (mode === "findDT") {
    if (input.rayleighNumber === undefined) throw new Error("Ra is required");
    if (input.length <= 0)                  throw new Error("L must be positive");
    Ra = input.rayleighNumber;
    L  = input.length;
    if (Ra <= 0) throw new Error("Ra must be positive");
    dT = (Ra * nu * alpha) / (g * beta * Math.pow(L, 3));

  } else {
    // findL
    if (input.rayleighNumber === undefined) throw new Error("Ra is required");
    if (input.deltaT === undefined)         throw new Error("ΔT is required");
    Ra = input.rayleighNumber;
    dT = input.deltaT;
    if (Ra <= 0) throw new Error("Ra must be positive");
    if (dT <= 0) throw new Error("ΔT must be positive");
    L  = Math.pow((Ra * nu * alpha) / (g * beta * dT), 1 / 3);
  }

  const Gr = Ra / Pr;

  // Churchill-Chu correlation for vertical isothermal plate (all Ra)
  const Nu = Math.pow(
    0.825 + (0.387 * Math.pow(Ra, 1 / 6)) /
    Math.pow(1 + Math.pow(0.492 / Pr, 9 / 16), 8 / 27),
    2
  );
  const h = input.thermalConductivity !== undefined
    ? Nu * input.thermalConductivity / L
    : undefined;

  let convectionRegime: string;
  if (Ra < 1e4)        convectionRegime = "negligible natural convection";
  else if (Ra < 1e9)   convectionRegime = "laminar natural convection";
  else if (Ra < 1e13)  convectionRegime = "turbulent natural convection";
  else                 convectionRegime = "very high Ra — turbulent";

  return {
    rayleighNumber: Ra,
    grashofNumber: Gr,
    prandtlNumber: Pr,
    deltaT: dT,
    length: L,
    nusseltNumber: Nu,
    heatTransferCoeff: h,
    convectionRegime,
    interpretation: `Ra = ${Ra.toExponential(3)}, Gr = ${Gr.toExponential(3)}, Pr = ${Pr.toFixed(4)} — ${convectionRegime}. Churchill-Chu Nu = ${Nu.toFixed(3)}.`,
  };
}

export function generateRayleighNumberSteps(input: RayleighNumberInput, result: RayleighNumberResult): Step[] {
  const { mode } = input;
  const g = input.gravity ?? 9.81;
  const beta  = input.thermalExpansion;
  const nu    = input.kinematicViscosity;
  const alpha = input.thermalDiffusivity;
  const { rayleighNumber: Ra, grashofNumber: Gr, prandtlNumber: Pr, deltaT: dT, length: L, nusseltNumber: Nu } = result;

  const steps: Step[] = [];

  if (mode === "findRa") {
    steps.push(
      { description: "Write the Rayleigh number definition",
        formula: "Ra = g × β × ΔT × L³ / (ν × α)" },
      { description: "Substitute g, β, ΔT, L, ν, and α",
        calculation: `Ra = ${g} × ${beta.toExponential(4)} × ${dT.toFixed(4)} × ${L.toExponential(4)}³ / (${nu.toExponential(4)} × ${alpha.toExponential(4)})`,
        result: `${Ra.toExponential(5)}`, unit: "dimensionless" }
    );
  } else if (mode === "findDT") {
    steps.push(
      { description: "Rearrange for temperature difference",
        formula: "ΔT = Ra × ν × α / (g × β × L³)" },
      { description: "Substitute values",
        calculation: `ΔT = ${Ra.toExponential(4)} × ${nu.toExponential(4)} × ${alpha.toExponential(4)} / (${g} × ${beta.toExponential(4)} × ${L.toExponential(4)}³) = ${dT.toFixed(4)} K`,
        result: `${dT.toFixed(4)}`, unit: "K" }
    );
  } else {
    steps.push(
      { description: "Rearrange for characteristic length",
        formula: "L = (Ra × ν × α / (g × β × ΔT))^(1/3)" },
      { description: "Substitute values",
        calculation: `L = (${Ra.toExponential(4)} × ${nu.toExponential(4)} × ${alpha.toExponential(4)} / (${g} × ${beta.toExponential(4)} × ${dT.toFixed(4)}))^(1/3) = ${L.toExponential(4)} m`,
        result: `${L.toExponential(4)}`, unit: "m" }
    );
  }

  steps.push(
    { description: "Prandtl number from diffusivities",
      formula: "Pr = ν / α",
      calculation: `Pr = ${nu.toExponential(4)} / ${alpha.toExponential(4)} = ${Pr.toFixed(4)}` },
    { description: "Grashof number  Gr = Ra / Pr",
      formula: "Gr = Ra / Pr",
      calculation: `Gr = ${Ra.toExponential(4)} / ${Pr.toFixed(4)} = ${Gr.toExponential(4)}` }
  );

  if (Nu !== undefined) {
    steps.push({
      description: "Churchill-Chu correlation for vertical isothermal plate (all Ra)",
      formula: "Nu = {0.825 + 0.387 Ra^(1/6) / [1 + (0.492/Pr)^(9/16)]^(8/27)}²",
      calculation: `Nu = ${Nu.toFixed(4)}`,
      result: `${Nu.toFixed(4)}`, unit: "dimensionless",
    });
    if (result.heatTransferCoeff !== undefined && input.thermalConductivity !== undefined) {
      steps.push({
        description: "Heat transfer coefficient  h = Nu × k / L",
        formula: "h = Nu × k / L",
        calculation: `h = ${Nu.toFixed(4)} × ${input.thermalConductivity.toFixed(5)} / ${L.toExponential(4)} = ${result.heatTransferCoeff.toFixed(4)} W/(m²·K)`,
        result: `${result.heatTransferCoeff.toFixed(4)}`, unit: "W/(m²·K)",
      });
    }
  }

  return steps;
}

// ============================================================================
// Péclet Number
// ============================================================================

export type PecletType = "thermal" | "mass";
export type PecletMode = "findPe" | "findV" | "findL";

export interface PecletNumberInput {
  peType: PecletType;
  mode: PecletMode;
  pecletNumber?: number;        // dimensionless
  velocity?: number;            // m/s
  length: number;               // m  characteristic length
  diffusivity?: number;         // m²/s  α (thermal) or D_AB (mass)
  kinematicViscosity?: number;  // m²/s  ν — optional, enables Re and Pr/Sc output
}

export interface PecletNumberResult {
  pecletNumber: number;
  velocity: number;             // m/s
  length: number;               // m
  diffusivity: number;          // m²/s
  reynoldsNumber?: number;      // V·L/ν
  secondaryNumber?: number;     // Pr = Pe/Re (thermal) or Sc = Pe/Re (mass)
  interpretation: string;
}

export function calculatePecletNumber(input: PecletNumberInput): PecletNumberResult {
  const { peType, mode, kinematicViscosity: nu } = input;

  if (input.length <= 0) throw new Error("Characteristic length must be positive");

  let Pe: number, V: number, D: number;

  if (mode === "findPe") {
    if (input.velocity   === undefined) throw new Error("Velocity is required");
    if (input.diffusivity === undefined) throw new Error("Diffusivity is required");
    V = input.velocity;
    D = input.diffusivity;
    if (V <= 0) throw new Error("Velocity must be positive");
    if (D <= 0) throw new Error("Diffusivity must be positive");
    Pe = (V * input.length) / D;

  } else if (mode === "findV") {
    if (input.pecletNumber === undefined) throw new Error("Pe is required");
    if (input.diffusivity  === undefined) throw new Error("Diffusivity is required");
    Pe = input.pecletNumber;
    D  = input.diffusivity;
    if (Pe <= 0) throw new Error("Pe must be positive");
    if (D  <= 0) throw new Error("Diffusivity must be positive");
    V  = (Pe * D) / input.length;

  } else {
    // findL
    if (input.pecletNumber === undefined) throw new Error("Pe is required");
    if (input.velocity     === undefined) throw new Error("Velocity is required");
    if (input.diffusivity  === undefined) throw new Error("Diffusivity is required");
    Pe = input.pecletNumber;
    V  = input.velocity;
    D  = input.diffusivity;
    if (Pe <= 0) throw new Error("Pe must be positive");
    if (V  <= 0) throw new Error("Velocity must be positive");
    if (D  <= 0) throw new Error("Diffusivity must be positive");
  }

  const L = mode === "findL" ? (Pe * D) / V : input.length;

  const Re = nu ? (V * L) / nu : undefined;
  const secondary = (Re && Re > 0) ? Pe / Re : undefined;
  const secLabel = peType === "thermal" ? "Pr" : "Sc";

  let regime: string;
  if (Pe < 0.1)     regime = "diffusion dominated — mixing is rapid, gradients are smooth";
  else if (Pe <= 10) regime = "mixed convection-diffusion regime";
  else if (Pe <= 100) regime = "convection dominated — thin diffusive boundary layer";
  else              regime = "strongly convection dominated — diffusion confined to very thin layer";

  const secStr = secondary !== undefined ? ` ${secLabel} = ${secondary.toFixed(3)}.` : "";
  return {
    pecletNumber: Pe,
    velocity: V,
    length: L,
    diffusivity: D,
    reynoldsNumber: Re,
    secondaryNumber: secondary,
    interpretation: `Pe = ${Pe.toFixed(4)}: ${regime}.${secStr}`,
  };
}

export function generatePecletNumberSteps(input: PecletNumberInput, result: PecletNumberResult): Step[] {
  const { peType, mode } = input;
  const { pecletNumber: Pe, velocity: V, length: L, diffusivity: D } = result;
  const diffSymbol = peType === "thermal" ? "α" : "D";
  const secSymbol  = peType === "thermal" ? "Pr" : "Sc";

  const steps: Step[] = [];

  if (mode === "findPe") {
    steps.push(
      { description: `Write the ${peType === "thermal" ? "thermal" : "mass-transfer"} Péclet number definition`,
        formula: `Pe = V × L / ${diffSymbol}` },
      { description: `Substitute V, L, and ${diffSymbol}`,
        calculation: `Pe = ${V.toExponential(4)} × ${L.toExponential(4)} / ${D.toExponential(4)} = ${Pe.toFixed(5)}`,
        result: `${Pe.toFixed(5)}`, unit: "dimensionless" }
    );
  } else if (mode === "findV") {
    steps.push(
      { description: `Rearrange for velocity`,
        formula: `V = Pe × ${diffSymbol} / L` },
      { description: `Substitute Pe, ${diffSymbol}, and L`,
        calculation: `V = ${Pe.toFixed(4)} × ${D.toExponential(4)} / ${L.toExponential(4)} = ${V.toExponential(4)} m/s`,
        result: `${V.toExponential(4)}`, unit: "m/s" }
    );
  } else {
    steps.push(
      { description: `Rearrange for characteristic length`,
        formula: `L = Pe × ${diffSymbol} / V` },
      { description: `Substitute Pe, ${diffSymbol}, and V`,
        calculation: `L = ${Pe.toFixed(4)} × ${D.toExponential(4)} / ${V.toExponential(4)} = ${L.toExponential(4)} m`,
        result: `${L.toExponential(4)}`, unit: "m" }
    );
  }

  if (result.reynoldsNumber !== undefined) {
    steps.push({
      description: "Reynolds number  Re = V × L / ν",
      formula: "Re = V × L / ν",
      calculation: `Re = ${V.toExponential(4)} × ${L.toExponential(4)} / ${input.kinematicViscosity!.toExponential(4)} = ${result.reynoldsNumber.toFixed(4)}`,
    });
  }
  if (result.reynoldsNumber !== undefined && result.secondaryNumber !== undefined) {
    steps.push({
      description: `${secSymbol} = Pe / Re`,
      formula: `${secSymbol} = Pe / Re`,
      calculation: `${secSymbol} = ${Pe.toFixed(4)} / ${result.reynoldsNumber.toFixed(4)} = ${result.secondaryNumber.toFixed(4)}`,
    });
  }

  return steps;
}

// ============================================================================
// Schmidt Number
// ============================================================================

export type SchmidtMode = "findSc" | "findD" | "findNu";

export interface SchmidtNumberInput {
  mode: SchmidtMode;
  schmidtNumber?: number;       // dimensionless
  kinematicViscosity?: number;  // m²/s  ν
  massDiffusivity?: number;     // m²/s  D_AB
  density?: number;             // kg/m³ ρ — optional, enables μ = ρν output
}

export interface SchmidtNumberResult {
  schmidtNumber: number;
  kinematicViscosity: number;   // m²/s
  massDiffusivity: number;      // m²/s
  dynamicViscosity?: number;    // Pa·s  μ = ρν
  interpretation: string;
}

export function calculateSchmidtNumber(input: SchmidtNumberInput): SchmidtNumberResult {
  const { mode, density } = input;
  let Sc: number, nu: number, D: number;

  if (mode === "findSc") {
    if (input.kinematicViscosity === undefined || input.massDiffusivity === undefined)
      throw new Error("ν and D_AB are required");
    nu = input.kinematicViscosity;
    D  = input.massDiffusivity;
    if (nu <= 0 || D <= 0) throw new Error("ν and D_AB must be positive");
    Sc = nu / D;

  } else if (mode === "findD") {
    if (input.schmidtNumber === undefined || input.kinematicViscosity === undefined)
      throw new Error("Sc and ν are required");
    Sc = input.schmidtNumber;
    nu = input.kinematicViscosity;
    if (Sc <= 0 || nu <= 0) throw new Error("Sc and ν must be positive");
    D  = nu / Sc;

  } else {
    // findNu
    if (input.schmidtNumber === undefined || input.massDiffusivity === undefined)
      throw new Error("Sc and D_AB are required");
    Sc = input.schmidtNumber;
    D  = input.massDiffusivity;
    if (Sc <= 0 || D <= 0) throw new Error("Sc and D_AB must be positive");
    nu = Sc * D;
  }

  const mu = density ? nu * density : undefined;

  let regime: string;
  if (Sc < 0.1)      regime = "Sc << 1: mass diffusion >> momentum diffusion (liquid-metal analogy for mass transfer)";
  else if (Sc < 0.5) regime = "low-Sc fluid: mass diffusion faster than momentum diffusion";
  else if (Sc <= 3)  regime = "Sc ≈ 1: gases — momentum and mass boundary layers are similar in thickness";
  else if (Sc <= 100) regime = "moderate Sc: momentum diffusion dominates over mass diffusion";
  else if (Sc <= 1000) regime = "Sc >> 1: liquids — thin concentration boundary layer inside the velocity boundary layer";
  else               regime = "very high Sc: highly viscous liquid or heavy solute — extremely thin concentration BL";

  return {
    schmidtNumber: Sc,
    kinematicViscosity: nu,
    massDiffusivity: D,
    dynamicViscosity: mu,
    interpretation: `Sc = ${Sc.toFixed(4)}: ${regime}.`,
  };
}

export function generateSchmidtNumberSteps(input: SchmidtNumberInput, result: SchmidtNumberResult): Step[] {
  const { mode } = input;
  const { schmidtNumber: Sc, kinematicViscosity: nu, massDiffusivity: D } = result;

  const steps: Step[] = [];

  if (mode === "findSc") {
    steps.push(
      { description: "Write the Schmidt number definition", formula: "Sc = ν / D_{AB}" },
      { description: "Substitute ν and D<sub>AB</sub>",
        calculation: `Sc = ${nu.toExponential(4)} / ${D.toExponential(4)} = ${Sc.toFixed(5)}`,
        result: `${Sc.toFixed(5)}`, unit: "dimensionless" }
    );
  } else if (mode === "findD") {
    steps.push(
      { description: "Rearrange Schmidt definition for mass diffusivity", formula: "D_{AB} = ν / Sc" },
      { description: "Substitute Sc and ν",
        calculation: `D_{AB} = ${nu.toExponential(4)} / ${Sc.toFixed(4)} = ${D.toExponential(5)} m²/s`,
        result: `${D.toExponential(5)}`, unit: "m²/s" }
    );
  } else {
    steps.push(
      { description: "Rearrange Schmidt definition for kinematic viscosity", formula: "ν = Sc × D_{AB}" },
      { description: "Substitute Sc and D<sub>AB</sub>",
        calculation: `ν = ${Sc.toFixed(4)} × ${D.toExponential(4)} = ${nu.toExponential(5)} m²/s`,
        result: `${nu.toExponential(5)}`, unit: "m²/s" }
    );
  }

  if (result.dynamicViscosity !== undefined && input.density) {
    steps.push({
      description: "Dynamic viscosity  μ = ρ × ν",
      formula: "μ = ρ × ν",
      calculation: `μ = ${input.density.toFixed(2)} × ${nu.toExponential(4)} = ${result.dynamicViscosity.toExponential(4)} Pa·s`,
      result: `${result.dynamicViscosity.toExponential(4)}`, unit: "Pa·s",
    });
  }

  return steps;
}

// ============================================================================
// Sherwood Number
// ============================================================================

export type SherwoodMode = "findSh" | "findKc" | "findD";

export interface SherwoodNumberInput {
  mode: SherwoodMode;
  sherwoodNumber?: number;       // dimensionless
  massTransferCoeff?: number;    // m/s  k_c
  massDiffusivity?: number;      // m²/s D_AB
  characteristicLength: number;  // m    L
}

export interface SherwoodNumberResult {
  sherwoodNumber: number;
  massTransferCoeff: number;     // m/s
  massDiffusivity: number;       // m²/s
  diffusionCoeff: number;        // m/s  D_AB / L — pure-diffusion reference
  interpretation: string;
}

export function calculateSherwoodNumber(input: SherwoodNumberInput): SherwoodNumberResult {
  const { mode, characteristicLength: L } = input;
  if (L <= 0) throw new Error("Characteristic length must be positive");

  let Sh: number, kc: number, D: number;

  if (mode === "findSh") {
    if (input.massTransferCoeff === undefined || input.massDiffusivity === undefined)
      throw new Error("k_c and D_AB are required");
    kc = input.massTransferCoeff;
    D  = input.massDiffusivity;
    if (kc <= 0 || D <= 0) throw new Error("k_c and D_AB must be positive");
    Sh = (kc * L) / D;

  } else if (mode === "findKc") {
    if (input.sherwoodNumber === undefined || input.massDiffusivity === undefined)
      throw new Error("Sh and D_AB are required");
    Sh = input.sherwoodNumber;
    D  = input.massDiffusivity;
    if (Sh <= 0 || D <= 0) throw new Error("Sh and D_AB must be positive");
    kc = (Sh * D) / L;

  } else {
    if (input.sherwoodNumber === undefined || input.massTransferCoeff === undefined)
      throw new Error("Sh and k_c are required");
    Sh = input.sherwoodNumber;
    kc = input.massTransferCoeff;
    if (Sh <= 0 || kc <= 0) throw new Error("Sh and k_c must be positive");
    D  = (kc * L) / Sh;
  }

  const diffusionCoeff = D / L;
  const enhancement = Sh.toFixed(2);
  return {
    sherwoodNumber: Sh,
    massTransferCoeff: kc,
    massDiffusivity: D,
    diffusionCoeff,
    interpretation: `Sh = ${enhancement}: convective kc is ${enhancement}× the pure-diffusion reference D/L = ${diffusionCoeff.toExponential(3)} m/s.`,
  };
}

export function generateSherwoodNumberSteps(input: SherwoodNumberInput, result: SherwoodNumberResult): Step[] {
  const { mode, characteristicLength: L } = input;
  const { sherwoodNumber: Sh, massTransferCoeff: kc, massDiffusivity: D, diffusionCoeff } = result;

  if (mode === "findSh") {
    return [
      { description: "Write the Sherwood number definition", formula: "Sh = k_{c} × L / D_{AB}" },
      { description: "Substitute k<sub>c</sub>, L, and D<sub>AB</sub>",
        calculation: `Sh = ${kc.toExponential(4)} × ${L.toExponential(4)} / ${D.toExponential(5)} = ${Sh.toFixed(5)}`,
        result: `${Sh.toFixed(5)}`, unit: "dimensionless" },
      { description: "Diffusion reference D<sub>AB</sub> / L",
        calculation: `D_{AB}/L = ${D.toExponential(5)} / ${L.toExponential(4)} = ${diffusionCoeff.toExponential(4)} m/s  →  k_{c} / (D_{AB}/L) = Sh = ${Sh.toFixed(3)}` },
    ];
  }

  if (mode === "findKc") {
    return [
      { description: "Rearrange for mass transfer coefficient", formula: "k_{c} = Sh × D_{AB} / L" },
      { description: "Substitute Sh, D<sub>AB</sub>, and L",
        calculation: `k_{c} = ${Sh.toFixed(4)} × ${D.toExponential(5)} / ${L.toExponential(4)} = ${kc.toExponential(4)} m/s`,
        result: `${kc.toExponential(4)}`, unit: "m/s" },
    ];
  }

  return [
    { description: "Rearrange for mass diffusivity", formula: "D_{AB} = k_{c} × L / Sh" },
    { description: "Substitute k<sub>c</sub>, L, and Sh",
      calculation: `D_{AB} = ${kc.toExponential(4)} × ${L.toExponential(4)} / ${Sh.toFixed(4)} = ${D.toExponential(5)} m²/s`,
      result: `${D.toExponential(5)}`, unit: "m²/s" },
  ];
}

// ============================================================================
// Lewis Number
// ============================================================================

export type LewisMode = "findLe" | "findAlpha" | "findD";

export interface LewisNumberInput {
  mode: LewisMode;
  lewisNumber?: number;          // dimensionless
  thermalDiffusivity?: number;   // m²/s  α = k/(ρ cₚ)
  massDiffusivity?: number;      // m²/s  D_AB
  kinematicViscosity?: number;   // m²/s  ν — optional, enables Pr and Sc output
}

export interface LewisNumberResult {
  lewisNumber: number;
  thermalDiffusivity: number;    // m²/s
  massDiffusivity: number;       // m²/s
  prandtlNumber?: number;        // ν / α  (if ν provided)
  schmidtNumber?: number;        // ν / D_AB  (if ν provided)
  interpretation: string;
}

export function calculateLewisNumber(input: LewisNumberInput): LewisNumberResult {
  const { mode, kinematicViscosity: nu } = input;
  let Le: number, alpha: number, D: number;

  if (mode === "findLe") {
    if (input.thermalDiffusivity === undefined || input.massDiffusivity === undefined)
      throw new Error("α and D_AB are required");
    alpha = input.thermalDiffusivity;
    D     = input.massDiffusivity;
    if (alpha <= 0 || D <= 0) throw new Error("α and D_AB must be positive");
    Le = alpha / D;

  } else if (mode === "findAlpha") {
    if (input.lewisNumber === undefined || input.massDiffusivity === undefined)
      throw new Error("Le and D_AB are required");
    Le = input.lewisNumber;
    D  = input.massDiffusivity;
    if (Le <= 0 || D <= 0) throw new Error("Le and D_AB must be positive");
    alpha = Le * D;

  } else {
    if (input.lewisNumber === undefined || input.thermalDiffusivity === undefined)
      throw new Error("Le and α are required");
    Le    = input.lewisNumber;
    alpha = input.thermalDiffusivity;
    if (Le <= 0 || alpha <= 0) throw new Error("Le and α must be positive");
    D = alpha / Le;
  }

  const Pr = nu ? nu / alpha : undefined;
  const Sc = nu ? nu / D     : undefined;

  let regime: string;
  if (Le < 0.5)      regime = "Le < 1: concentration BL is thicker than thermal BL; mass diffusion is faster";
  else if (Le <= 1.5) regime = "Le ≈ 1: thermal and concentration boundary layers are similar in thickness (typical for gases)";
  else if (Le <= 10)  regime = "Le > 1: thermal BL is thicker than concentration BL; heat diffuses faster than mass";
  else               regime = "Le >> 1: strongly decoupled heat and mass transfer (typical for liquids — solute diffuses very slowly)";

  const secStr = (Pr !== undefined && Sc !== undefined)
    ? `  Pr = ${Pr.toFixed(3)}, Sc = ${Sc.toFixed(3)}.`
    : "";
  return {
    lewisNumber: Le,
    thermalDiffusivity: alpha,
    massDiffusivity: D,
    prandtlNumber: Pr,
    schmidtNumber: Sc,
    interpretation: `Le = ${Le.toFixed(4)}: ${regime}.${secStr}`,
  };
}

export function generateLewisNumberSteps(input: LewisNumberInput, result: LewisNumberResult): Step[] {
  const { mode } = input;
  const { lewisNumber: Le, thermalDiffusivity: alpha, massDiffusivity: D } = result;

  const steps: Step[] = [];

  if (mode === "findLe") {
    steps.push(
      { description: "Write the Lewis number definition", formula: "Le = α / D_{AB}" },
      { description: "Substitute α and D<sub>AB</sub>",
        calculation: `Le = ${alpha.toExponential(4)} / ${D.toExponential(4)} = ${Le.toFixed(5)}`,
        result: `${Le.toFixed(5)}`, unit: "dimensionless" }
    );
  } else if (mode === "findAlpha") {
    steps.push(
      { description: "Rearrange Lewis definition for thermal diffusivity", formula: "α = Le × D_{AB}" },
      { description: "Substitute Le and D<sub>AB</sub>",
        calculation: `α = ${Le.toFixed(4)} × ${D.toExponential(4)} = ${alpha.toExponential(5)} m²/s`,
        result: `${alpha.toExponential(5)}`, unit: "m²/s" }
    );
  } else {
    steps.push(
      { description: "Rearrange Lewis definition for mass diffusivity", formula: "D_{AB} = α / Le" },
      { description: "Substitute α and Le",
        calculation: `D_{AB} = ${alpha.toExponential(4)} / ${Le.toFixed(4)} = ${D.toExponential(5)} m²/s`,
        result: `${D.toExponential(5)}`, unit: "m²/s" }
    );
  }

  if (result.prandtlNumber !== undefined && input.kinematicViscosity) {
    steps.push(
      { description: "Prandtl number  Pr = ν / α",
        formula: "Pr = ν / α",
        calculation: `Pr = ${input.kinematicViscosity.toExponential(4)} / ${alpha.toExponential(4)} = ${result.prandtlNumber.toFixed(4)}` },
      { description: "Schmidt number Sc = ν / D<sub>AB</sub>",
        formula: "Sc = ν / D_{AB}",
        calculation: `Sc = ${input.kinematicViscosity.toExponential(4)} / ${D.toExponential(4)} = ${result.schmidtNumber!.toFixed(4)}` },
      { description: "Verify:  Le = Sc / Pr",
        formula: "Le = Sc / Pr",
        calculation: `Le = ${result.schmidtNumber!.toFixed(4)} / ${result.prandtlNumber.toFixed(4)} = ${Le.toFixed(4)}` }
    );
  }

  return steps;
}

// ============================================================================
// Normal Depth
// ============================================================================

export type NormalDepthMode   = "findYn" | "findQ" | "findN" | "findS";
export type NormalDepthShape  = "rectangular" | "trapezoidal" | "circular";

export interface NormalDepthInput {
  mode: NormalDepthMode;
  channelShape: NormalDepthShape;
  // geometry
  bottomWidth?: number;      // m  b  (rectangular / trapezoidal)
  sideSlope?: number;        // z  H:V (trapezoidal, 0 = vertical)
  diameter?: number;         // m  D  (circular)
  // flow parameters
  flowRate?: number;         // m³/s  Q  (for findYn)
  normalDepth?: number;      // m  y_n  (for findQ / findN / findS)
  manningN?: number;         // n  (for findYn / findQ / findS)
  slope?: number;            // m/m  S  (for findYn / findQ / findN)
  gravity?: number;          // m/s²
}

export interface NormalDepthResult {
  normalDepth: number;       // m
  flowRate: number;          // m³/s
  manningN: number;
  slope: number;             // m/m
  velocity: number;          // m/s
  area: number;              // m²
  wettedPerimeter: number;   // m
  hydraulicRadius: number;   // m
  froudeNumber: number;
  criticalDepth: number;     // m  (rectangular / comparable)
  slopeType: string;         // mild / steep / critical / horizontal
  interpretation: string;
}

function _normalGeom(y: number, shape: NormalDepthShape, b: number, z: number, D: number) {
  if (shape === "circular") {
    const yc = Math.max(1e-9, Math.min(y, D * 0.9999));
    const theta = 2 * Math.acos(1 - 2 * yc / D);
    const A = (D * D / 8) * (theta - Math.sin(theta));
    const P = D * theta / 2;
    const T = D * Math.sin(theta / 2);
    return { A, P, R: A / P, T };
  } else if (shape === "trapezoidal") {
    const A = (b + z * y) * y;
    const P = b + 2 * y * Math.sqrt(1 + z * z);
    const T = b + 2 * z * y;
    return { A, P, R: A / P, T };
  } else {
    const A = b * y; const P = b + 2 * y;
    return { A, P, R: A / P, T: b };
  }
}

function _manningsQ(y: number, n: number, S: number,
                    shape: NormalDepthShape, b: number, z: number, D: number): number {
  const { A, R } = _normalGeom(y, shape, b, z, D);
  return (1 / n) * A * Math.pow(R, 2 / 3) * Math.pow(S, 0.5);
}

export function calculateNormalDepth(input: NormalDepthInput): NormalDepthResult {
  const { mode, channelShape: shape, gravity: g = 9.81 } = input;
  const b = input.bottomWidth ?? 0;
  const z = input.sideSlope  ?? 0;
  const D = input.diameter   ?? 0;

  if (shape !== "circular" && b <= 0) throw new Error("Bottom width must be positive");
  if (shape === "circular"  && D <= 0) throw new Error("Diameter must be positive");

  let yn: number, Q: number, n: number, S: number;

  if (mode === "findYn") {
    Q = input.flowRate!; n = input.manningN!; S = input.slope!;
    if (!Q || !n || !S || Q <= 0 || n <= 0 || S <= 0)
      throw new Error("Q, n, and S are required and must be positive");
    // Bisection: find yn such that Manning's Q(yn) = Q
    const yMax = shape === "circular" ? D * 0.9999 : 100;
    let lo = 1e-6, hi = yMax;
    if (_manningsQ(hi, n, S, shape, b, z, D) < Q)
      throw new Error("Flow rate exceeds channel capacity at full depth");
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      if (_manningsQ(mid, n, S, shape, b, z, D) < Q) lo = mid; else hi = mid;
    }
    yn = (lo + hi) / 2;

  } else if (mode === "findQ") {
    yn = input.normalDepth!; n = input.manningN!; S = input.slope!;
    if (!yn || !n || !S || yn <= 0 || n <= 0 || S <= 0)
      throw new Error("y_n, n, and S are required and must be positive");
    Q = _manningsQ(yn, n, S, shape, b, z, D);

  } else if (mode === "findN") {
    yn = input.normalDepth!; Q = input.flowRate!; S = input.slope!;
    if (!yn || !Q || !S || yn <= 0 || Q <= 0 || S <= 0)
      throw new Error("y_n, Q, and S are required and must be positive");
    const { A, R } = _normalGeom(yn, shape, b, z, D);
    n = (A * Math.pow(R, 2 / 3) * Math.pow(S, 0.5)) / Q;

  } else { // findS
    yn = input.normalDepth!; Q = input.flowRate!; n = input.manningN!;
    if (!yn || !Q || !n || yn <= 0 || Q <= 0 || n <= 0)
      throw new Error("y_n, Q, and n are required and must be positive");
    const { A, R } = _normalGeom(yn, shape, b, z, D);
    S = Math.pow((Q * n) / (A * Math.pow(R, 2 / 3)), 2);
  }

  const { A, P, R, T } = _normalGeom(yn, shape, b, z, D);
  const V  = Q / A;
  const Fr = V / Math.sqrt(g * A / T);

  // Critical depth (rectangular approximation for comparison; circular uses y_c from bisection)
  let yc: number;
  if (shape === "rectangular") {
    yc = Math.pow((Q / b) ** 2 / g, 1 / 3);
  } else if (shape === "trapezoidal") {
    // bisect on A³/T = Q²/g
    let lo = 1e-6, hi = 50;
    const crit = (yy: number) => {
      const a = (b + z * yy) * yy; const t = b + 2 * z * yy;
      return a * a * a / t - Q * Q / g;
    };
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (crit(mid) < 0) lo = mid; else hi = mid;
    }
    yc = (lo + hi) / 2;
  } else {
    let lo = 1e-6, hi = D * 0.9999;
    const crit = (yy: number) => {
      const theta = 2 * Math.acos(1 - 2 * yy / D);
      const a = (D * D / 8) * (theta - Math.sin(theta));
      const t = D * Math.sin(theta / 2);
      return a * a * a / t - Q * Q / g;
    };
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (crit(mid) < 0) lo = mid; else hi = mid;
    }
    yc = (lo + hi) / 2;
  }

  const Sc_approx = (() => {
    const { A: Ac, P: Pc, T: Tc } = _normalGeom(yc, shape, b, z, D);
    const Vc = Q / Ac;
    const Rc = Ac / Pc;
    return Math.pow((Q * n) / (Ac * Math.pow(Rc, 2 / 3)), 2);
  })();

  let slopeType: string;
  if (S < 1e-10)         slopeType = "horizontal (no normal depth)";
  else if (Math.abs(S - Sc_approx) / Sc_approx < 0.02) slopeType = "critical slope";
  else if (yn > yc)      slopeType = `mild slope (yn > yc — subcritical normal flow)`;
  else                   slopeType = `steep slope (yn < yc — supercritical normal flow)`;

  return {
    normalDepth: yn, flowRate: Q, manningN: n, slope: S,
    velocity: V, area: A, wettedPerimeter: P, hydraulicRadius: R,
    froudeNumber: Fr, criticalDepth: yc, slopeType,
    interpretation: `Normal depth = ${yn.toFixed(4)} m, Q = ${Q.toFixed(4)} m³/s, V = ${V.toFixed(4)} m/s, Fr = ${Fr.toFixed(4)} — ${slopeType}.`,
  };
}

export function generateNormalDepthSteps(input: NormalDepthInput, result: NormalDepthResult): Step[] {
  const { mode, channelShape: shape } = input;
  const b = input.bottomWidth ?? 0;
  const z = input.sideSlope  ?? 0;
  const D = input.diameter   ?? 0;
  const { normalDepth: yn, flowRate: Q, manningN: n, slope: S,
          velocity: V, area: A, wettedPerimeter: P, hydraulicRadius: R, froudeNumber: Fr } = result;
  const { T } = _normalGeom(yn, shape, b, z, D);

  const steps: Step[] = [];

  if (mode === "findYn") {
    steps.push(
      { description: "Manning's equation — solve for depth by bisection",
        formula: "Q = (1/n) × A(y) × R(y)^{2/3} × S^{1/2}" },
      { description: `Bisection converged: normal depth`,
        calculation: `y_n = ${yn.toFixed(6)} \\text{ m} \\;(\\text{${shape} channel})`,
        result: `${yn.toFixed(6)}`, unit: "m" }
    );
  } else if (mode === "findQ") {
    steps.push(
      { description: "Manning's equation — direct computation",
        formula: "Q = (1/n) × A × R^{2/3} × S^{1/2}" },
      { description: "Cross-section geometry at normal depth",
        calculation: `A = ${A.toFixed(5)} m²,  P = ${P.toFixed(5)} m,  R = ${R.toFixed(5)} m` },
      { description: "Flow rate",
        calculation: `Q = (1/${n}) × ${A.toFixed(5)} × ${R.toFixed(5)}^{2/3} × ${S.toExponential(4)}^{1/2} = ${Q.toFixed(5)} m³/s`,
        result: `${Q.toFixed(5)}`, unit: "m³/s" }
    );
  } else if (mode === "findN") {
    steps.push(
      { description: "Rearrange Manning's equation for n",
        formula: "n = A × R^{2/3} × S^{1/2} / Q" },
      { description: "Cross-section geometry at normal depth",
        calculation: `A = ${A.toFixed(5)} m²,  R = ${R.toFixed(5)} m` },
      { description: "Manning's n",
        calculation: `n = ${A.toFixed(5)} × ${R.toFixed(5)}^{2/3} × ${S.toExponential(4)}^{1/2} / ${Q.toFixed(5)} = ${n.toFixed(6)}`,
        result: `${n.toFixed(6)}`, unit: "dimensionless" }
    );
  } else {
    steps.push(
      { description: "Rearrange Manning's equation for slope",
        formula: "S = (Q × n / (A × R^{2/3}))^{2}" },
      { description: "Cross-section geometry at normal depth",
        calculation: `A = ${A.toFixed(5)} m²,  R = ${R.toFixed(5)} m` },
      { description: "Channel slope",
        calculation: `S = (${Q.toFixed(5)} × ${n} / (${A.toFixed(5)} × ${R.toFixed(5)}^{2/3}))^{2} = ${S.toExponential(5)}`,
        result: `${S.toExponential(5)}`, unit: "m/m" }
    );
  }

  steps.push(
    { description: "Velocity at normal depth",
      formula: "V = Q / A",
      calculation: `V = ${Q.toFixed(5)} / ${A.toFixed(5)} = ${V.toFixed(5)} m/s` },
    { description: "Froude number",
      formula: "Fr = V / √(g × A / T)",
      calculation: `Fr = ${V.toFixed(5)} / √(9.81 × ${A.toFixed(5)} / ${T.toFixed(5)}) = ${Fr.toFixed(5)}` }
  );

  return steps;
}

// ============================================================================
// Chezy Equation
// ============================================================================

export type ChezyMode = "findV" | "findC" | "findS" | "findR";

export interface ChezyEquationInput {
  mode: ChezyMode;
  chezyC?: number;          // m^(1/2)/s
  hydraulicRadius?: number; // m  R_h
  slope?: number;           // m/m  S
  velocity?: number;        // m/s  V  (for findC / findS / findR)
  area?: number;            // m²  enables Q output
  gravity?: number;         // m/s²
}

export interface ChezyEquationResult {
  velocity: number;         // m/s
  chezyC: number;           // m^(1/2)/s
  hydraulicRadius: number;  // m
  slope: number;            // m/m
  flowRate?: number;        // m³/s
  froudeNumber: number;     // V / √(g × R_h)
  manningEquiv: number;     // n = R^(1/6) / C
  darcyEquiv: number;       // f = 8g / C²
  interpretation: string;
}

export function calculateChezyEquation(input: ChezyEquationInput): ChezyEquationResult {
  const { mode, area, gravity: g = 9.81 } = input;
  let V: number, C: number, R: number, S: number;

  if (mode === "findV") {
    C = input.chezyC!; R = input.hydraulicRadius!; S = input.slope!;
    if (!C || !R || !S || C <= 0 || R <= 0 || S <= 0)
      throw new Error("C, R, and S are required and must be positive");
    V = C * Math.sqrt(R * S);

  } else if (mode === "findC") {
    V = input.velocity!; R = input.hydraulicRadius!; S = input.slope!;
    if (!V || !R || !S || V <= 0 || R <= 0 || S <= 0)
      throw new Error("V, R, and S are required and must be positive");
    C = V / Math.sqrt(R * S);

  } else if (mode === "findS") {
    V = input.velocity!; C = input.chezyC!; R = input.hydraulicRadius!;
    if (!V || !C || !R || V <= 0 || C <= 0 || R <= 0)
      throw new Error("V, C, and R are required and must be positive");
    S = (V * V) / (C * C * R);

  } else {
    V = input.velocity!; C = input.chezyC!; S = input.slope!;
    if (!V || !C || !S || V <= 0 || C <= 0 || S <= 0)
      throw new Error("V, C, and S are required and must be positive");
    R = (V * V) / (C * C * S);
  }

  const flowRate  = area ? V * area : undefined;
  const Fr        = V / Math.sqrt(g * R);
  const nEquiv    = Math.pow(R, 1 / 6) / C;
  const fEquiv    = (8 * g) / (C * C);

  return {
    velocity: V, chezyC: C, hydraulicRadius: R, slope: S,
    flowRate, froudeNumber: Fr,
    manningEquiv: nEquiv, darcyEquiv: fEquiv,
    interpretation: `V = ${V.toFixed(4)} m/s, C = ${C.toFixed(3)} m^(1/2)/s, R = ${R.toFixed(4)} m, S = ${S.toExponential(4)}. Manning equivalent n = ${nEquiv.toFixed(5)}.`,
  };
}

export function generateChezyEquationSteps(input: ChezyEquationInput, result: ChezyEquationResult): Step[] {
  const { mode } = input;
  const { velocity: V, chezyC: C, hydraulicRadius: R, slope: S,
          manningEquiv: n, darcyEquiv: f } = result;

  const steps: Step[] = [];

  if (mode === "findV") {
    steps.push(
      { description: "Write Chezy's equation",
        formula: "V = C × √(R_h × S)" },
      { description: "Substitute C, R, and S",
        calculation: `V = ${C.toFixed(4)} × √(${R.toFixed(5)} × ${S.toExponential(4)}) = ${V.toFixed(5)} m/s`,
        result: `${V.toFixed(5)}`, unit: "m/s" }
    );
  } else if (mode === "findC") {
    steps.push(
      { description: "Rearrange for Chezy coefficient",
        formula: "C = V / √(R_h × S)" },
      { description: "Substitute V, R, and S",
        calculation: `C = ${V.toFixed(4)} / √(${R.toFixed(5)} × ${S.toExponential(4)}) = ${C.toFixed(5)} m^{1/2}/s`,
        result: `${C.toFixed(5)}`, unit: "m^(1/2)/s" }
    );
  } else if (mode === "findS") {
    steps.push(
      { description: "Rearrange for slope",
        formula: "S = V^{2} / (C^{2} × R_h)" },
      { description: "Substitute V, C, and R",
        calculation: `S = ${V.toFixed(4)}^{2} / (${C.toFixed(4)}^{2} × ${R.toFixed(5)}) = ${S.toExponential(5)}`,
        result: `${S.toExponential(5)}`, unit: "m/m" }
    );
  } else {
    steps.push(
      { description: "Rearrange for hydraulic radius",
        formula: "R_h = V^{2} / (C^{2} × S)" },
      { description: "Substitute V, C, and S",
        calculation: `R_h = ${V.toFixed(4)}^{2} / (${C.toFixed(4)}^{2} × ${S.toExponential(4)}) = ${R.toFixed(5)} m`,
        result: `${R.toFixed(5)}`, unit: "m" }
    );
  }

  steps.push(
    { description: "Manning's n equivalent",
      formula: "n = R_h^{1/6} / C",
      calculation: `n = ${R.toFixed(5)}^{1/6} / ${C.toFixed(4)} = ${n.toFixed(6)}` },
    { description: "Darcy-Weisbach f equivalent",
      formula: "f = 8g / C^{2}",
      calculation: `f = 8 × 9.81 / ${C.toFixed(4)}^{2} = ${f.toFixed(6)}` }
  );

  if (result.flowRate !== undefined && input.area) {
    steps.push({
      description: "Flow rate  Q = V × A",
      formula: "Q = V × A",
      calculation: `Q = ${V.toFixed(5)} × ${input.area.toFixed(5)} = ${result.flowRate.toFixed(5)} m³/s`,
      result: `${result.flowRate.toFixed(5)}`, unit: "m³/s",
    });
  }

  return steps;
}

// ============================================================================
// Wetted Perimeter
// ============================================================================

export type WettedPerimeterShape =
  | "rectangular" | "trapezoidal" | "triangular"
  | "circular_full" | "circular_partial"
  | "semicircular";

export interface WettedPerimeterInput {
  shape: WettedPerimeterShape;
  bottomWidth?: number;  // m  b  (rectangular / trapezoidal)
  depth?: number;        // m  y  (flow depth)
  sideSlope?: number;    // z  H:V  (trapezoidal / triangular)
  diameter?: number;     // m  D  (circular / semi-circular)
  fillDepth?: number;    // m  y  (circular partial)
}

export interface WettedPerimeterResult {
  wettedPerimeter: number;  // m
  area: number;             // m²
  topWidth: number;         // m  T (NaN for full/closed top)
  hydraulicRadius: number;  // m  R_h = A/P
  hydraulicDiameter: number;// m  D_h = 4R_h
  fillRatio?: number;       // y/D (circular partial)
  interpretation: string;
}

export function calculateWettedPerimeter(input: WettedPerimeterInput): WettedPerimeterResult {
  const { shape } = input;
  let P: number, A: number, T: number;

  if (shape === "rectangular") {
    const b = input.bottomWidth!, y = input.depth!;
    if (!b || !y || b <= 0 || y <= 0) throw new Error("Bottom width and depth must be positive");
    P = b + 2 * y;  A = b * y;  T = b;

  } else if (shape === "trapezoidal") {
    const b = input.bottomWidth!, y = input.depth!, z = input.sideSlope ?? 0;
    if (!b || !y || b <= 0 || y <= 0) throw new Error("Bottom width and depth must be positive");
    if (z < 0) throw new Error("Side slope must be ≥ 0");
    P = b + 2 * y * Math.sqrt(1 + z * z);
    A = (b + z * y) * y;
    T = b + 2 * z * y;

  } else if (shape === "triangular") {
    const y = input.depth!, z = input.sideSlope ?? 1;
    if (!y || y <= 0) throw new Error("Depth must be positive");
    if (z <= 0) throw new Error("Side slope must be positive for triangular channel");
    P = 2 * y * Math.sqrt(1 + z * z);
    A = z * y * y;
    T = 2 * z * y;

  } else if (shape === "circular_full") {
    const D = input.diameter!;
    if (!D || D <= 0) throw new Error("Diameter must be positive");
    P = Math.PI * D;  A = Math.PI * D * D / 4;  T = 0;

  } else if (shape === "circular_partial") {
    const D = input.diameter!, y = input.fillDepth!;
    if (!D || D <= 0) throw new Error("Diameter must be positive");
    if (!y || y <= 0 || y > D) throw new Error("Fill depth must be between 0 and D");
    const theta = 2 * Math.acos(1 - 2 * y / D);
    P = D * theta / 2;
    A = (D * D / 8) * (theta - Math.sin(theta));
    T = D * Math.sin(theta / 2);

  } else { // semicircular
    const D = input.diameter!;
    if (!D || D <= 0) throw new Error("Diameter must be positive");
    P = Math.PI * D / 2;      // half circumference — no vertical walls
    A = Math.PI * D * D / 8;  // half circle area
    T = D;                     // diameter at the open top
  }

  const Rh = A / P;
  const Dh = 4 * Rh;
  const fillRatio = shape === "circular_partial" && input.diameter
    ? input.fillDepth! / input.diameter : undefined;

  return {
    wettedPerimeter: P, area: A, topWidth: T,
    hydraulicRadius: Rh, hydraulicDiameter: Dh, fillRatio,
    interpretation: `P = ${P.toFixed(5)} m, A = ${A.toFixed(5)} m², Rh = ${Rh.toFixed(5)} m.`,
  };
}

export function generateWettedPerimeterSteps(input: WettedPerimeterInput, result: WettedPerimeterResult): Step[] {
  const { shape } = input;
  const { wettedPerimeter: P, area: A, topWidth: T, hydraulicRadius: Rh } = result;
  const steps: Step[] = [];

  if (shape === "rectangular") {
    const b = input.bottomWidth!, y = input.depth!;
    steps.push(
      { description: "Rectangular channel area", formula: "A = b × y",
        calculation: `A = ${b.toFixed(4)} × ${y.toFixed(4)} = ${A.toFixed(5)} m²` },
      { description: "Wetted perimeter — bottom + two sides (no free surface)",
        formula: "P = b + 2y",
        calculation: `P = ${b.toFixed(4)} + 2 × ${y.toFixed(4)} = ${P.toFixed(5)} m`,
        result: `${P.toFixed(5)}`, unit: "m" }
    );
  } else if (shape === "trapezoidal") {
    const b = input.bottomWidth!, y = input.depth!, z = input.sideSlope ?? 0;
    steps.push(
      { description: "Trapezoidal area", formula: "A = (b + z × y) × y",
        calculation: `A = (${b.toFixed(4)} + ${z} × ${y.toFixed(4)}) × ${y.toFixed(4)} = ${A.toFixed(5)} m²` },
      { description: "Wetted perimeter — bottom + two sloped sides",
        formula: "P = b + 2y × √(1 + z^{2})",
        calculation: `P = ${b.toFixed(4)} + 2 × ${y.toFixed(4)} × √(1 + ${z}^{2}) = ${P.toFixed(5)} m`,
        result: `${P.toFixed(5)}`, unit: "m" },
      { description: "Top width", formula: "T = b + 2zy",
        calculation: `T = ${b.toFixed(4)} + 2 × ${z} × ${y.toFixed(4)} = ${T.toFixed(5)} m` }
    );
  } else if (shape === "triangular") {
    const y = input.depth!, z = input.sideSlope ?? 1;
    steps.push(
      { description: "Triangular (V-notch) area", formula: "A = z × y^{2}",
        calculation: `A = ${z} × ${y.toFixed(4)}^{2} = ${A.toFixed(5)} m²` },
      { description: "Wetted perimeter — two sloped sides only (no bottom width)",
        formula: "P = 2y × √(1 + z^{2})",
        calculation: `P = 2 × ${y.toFixed(4)} × √(1 + ${z}^{2}) = ${P.toFixed(5)} m`,
        result: `${P.toFixed(5)}`, unit: "m" }
    );
  } else if (shape === "circular_full") {
    const D = input.diameter!;
    steps.push(
      { description: "Full circular area", formula: "A = π × D^{2} / 4",
        calculation: `A = π × ${D.toFixed(4)}^{2} / 4 = ${A.toFixed(5)} m²` },
      { description: "Wetted perimeter — full circumference (no free surface at top)",
        formula: "P = π × D",
        calculation: `P = π × ${D.toFixed(4)} = ${P.toFixed(5)} m`,
        result: `${P.toFixed(5)}`, unit: "m" }
    );
  } else if (shape === "circular_partial") {
    const D = input.diameter!, y = input.fillDepth!;
    const theta = 2 * Math.acos(1 - 2 * y / D);
    steps.push(
      { description: "Central angle subtended by water surface",
        formula: "θ = 2 × arccos(1 − 2y/D)",
        calculation: `θ = 2 × arccos(1 − 2 × ${y.toFixed(4)} / ${D.toFixed(4)}) = ${(theta * 180 / Math.PI).toFixed(3)}° = ${theta.toFixed(5)} rad` },
      { description: "Arc length in contact with water",
        formula: "P = D × θ / 2",
        calculation: `P = ${D.toFixed(4)} × ${theta.toFixed(5)} / 2 = ${P.toFixed(5)} m`,
        result: `${P.toFixed(5)}`, unit: "m" }
    );
  } else {
    const D = input.diameter!;
    steps.push(
      { description: "Semi-circular area (half circle)", formula: "A = π × D^{2} / 8",
        calculation: `A = π × ${D.toFixed(4)}^{2} / 8 = ${A.toFixed(5)} m²` },
      { description: "Wetted perimeter — half circumference only (flat top is free surface)",
        formula: "P = π × D / 2",
        calculation: `P = π × ${D.toFixed(4)} / 2 = ${P.toFixed(5)} m`,
        result: `${P.toFixed(5)}`, unit: "m" }
    );
  }

  steps.push({
    description: "Hydraulic radius from wetted perimeter",
    formula: "R_h = A / P",
    calculation: `R_h = ${A.toFixed(5)} / ${P.toFixed(5)} = ${Rh.toFixed(6)} m`,
  });

  return steps;
}

// ============================================================================
// FLOW CLASSIFICATION
// ============================================================================

export type FlowClassificationShape = "rectangular" | "trapezoidal" | "circular" | "wide";
export type FroudeRegimeFC = "subcritical" | "critical" | "supercritical";
export type ReynoldsRegimeFC = "laminar" | "transitional" | "turbulent";

export interface FlowClassificationInput {
  channelShape: FlowClassificationShape;
  bottomWidth?: number;    // m  b (rectangular, trapezoidal, wide)
  sideSlope?: number;      // z  H:V (trapezoidal)
  diameter?: number;       // m  D (circular)
  depth: number;           // m  flow depth y
  velocity?: number;       // m/s  V — provide velocity OR flowRate
  flowRate?: number;       // m³/s Q — provide velocity OR flowRate
  kinematicViscosity: number; // m²/s  ν
}

export interface FlowClassificationResult {
  flowArea: number;         // m²  A
  wettedPerimeter: number;  // m   P
  hydraulicRadius: number;  // m   Rh = A/P
  topWidth: number;         // m   T (free-surface width)
  hydraulicDepth: number;   // m   Dh = A/T
  velocity: number;         // m/s V
  flowRate: number;         // m³/s Q
  froudeNumber: number;
  froudeRegime: FroudeRegimeFC;
  reynoldsNumber: number;
  reynoldsRegime: ReynoldsRegimeFC;
  interpretation: string;
}

function channelGeometry(
  shape: FlowClassificationShape,
  y: number,
  b?: number,
  z?: number,
  D?: number,
): { A: number; P: number; T: number } {
  if (shape === "rectangular" || shape === "wide") {
    const bw = b ?? 1e6; // wide channel: effectively infinite width
    const A = bw * y;
    const P = shape === "wide" ? bw : bw + 2 * y;
    const T = bw;
    return { A, P, T };
  }
  if (shape === "trapezoidal") {
    const bw = b!;
    const zv = z ?? 0;
    const A = (bw + zv * y) * y;
    const P = bw + 2 * y * Math.sqrt(1 + zv * zv);
    const T = bw + 2 * zv * y;
    return { A, P, T };
  }
  // circular
  const Dv = D!;
  const theta = 2 * Math.acos(1 - 2 * y / Dv);
  const A = (Dv * Dv / 8) * (theta - Math.sin(theta));
  const P = Dv * theta / 2;
  const T = Dv * Math.sin(theta / 2);
  return { A, P, T };
}

export function calculateFlowClassification(input: FlowClassificationInput): FlowClassificationResult {
  const { channelShape, depth: y, kinematicViscosity: nu } = input;
  const g = 9.81;

  const { A, P, T } = channelGeometry(channelShape, y, input.bottomWidth, input.sideSlope, input.diameter);
  const Rh = A / P;
  const Dh = A / T;

  let V: number;
  let Q: number;
  if (input.velocity !== undefined) {
    V = input.velocity;
    Q = V * A;
  } else {
    Q = input.flowRate!;
    V = Q / A;
  }

  const Fr = V / Math.sqrt(g * Dh);
  const froudeRegime: FroudeRegimeFC =
    Math.abs(Fr - 1) < 0.01 ? "critical" : Fr < 1 ? "subcritical" : "supercritical";

  const Re = V * Rh / nu;
  const reynoldsRegime: ReynoldsRegimeFC =
    Re < 500 ? "laminar" : Re < 12500 ? "transitional" : "turbulent";

  const frDesc =
    froudeRegime === "subcritical"
      ? "Subcritical (tranquil) flow — gravity waves propagate upstream and downstream; downstream controls."
      : froudeRegime === "critical"
      ? "Critical flow — maximum discharge per unit specific energy; flow is unstable near this condition."
      : "Supercritical (rapid) flow — gravity waves can only travel downstream; upstream controls.";

  const reDesc =
    reynoldsRegime === "laminar"
      ? "Laminar open-channel flow — smooth, sheet-like motion with viscous forces dominant (Re < 500)."
      : reynoldsRegime === "transitional"
      ? "Transitional open-channel flow — intermittent turbulent patches (500 ≤ Re < 12 500)."
      : "Turbulent open-channel flow — fully turbulent, velocity fluctuations throughout (Re ≥ 12 500); typical for most engineering channels.";

  return {
    flowArea: A, wettedPerimeter: P, hydraulicRadius: Rh,
    topWidth: T, hydraulicDepth: Dh,
    velocity: V, flowRate: Q,
    froudeNumber: Fr, froudeRegime,
    reynoldsNumber: Re, reynoldsRegime,
    interpretation: `${frDesc} ${reDesc}`,
  };
}

export function generateFlowClassificationSteps(
  input: FlowClassificationInput,
  result: FlowClassificationResult,
): Step[] {
  const g = 9.81;
  const steps: Step[] = [];
  const { channelShape: shape, depth: y } = input;
  const { flowArea: A, wettedPerimeter: P, hydraulicRadius: Rh, topWidth: T,
          hydraulicDepth: Dh, velocity: V, flowRate: Q,
          froudeNumber: Fr, reynoldsNumber: Re } = result;

  // Step 1: cross-section geometry
  if (shape === "rectangular" || shape === "wide") {
    const b = input.bottomWidth ?? "(wide)";
    steps.push({
      description: "Flow area — rectangular cross-section",
      formula: "A = b × y",
      calculation: `A = ${b} × ${y.toFixed(4)} = ${A.toFixed(5)} m²`,
      result: `${A.toFixed(5)}`, unit: "m²",
    });
    steps.push({
      description: "Wetted perimeter",
      formula: shape === "wide" ? "P ≈ b  (wide channel — neglect side walls)" : "P = b + 2y",
      calculation: `P = ${P.toFixed(5)} m`,
      result: `${P.toFixed(5)}`, unit: "m",
    });
  } else if (shape === "trapezoidal") {
    const b = input.bottomWidth!;
    const z = input.sideSlope ?? 0;
    steps.push({
      description: "Flow area — trapezoidal cross-section",
      formula: "A = (b + z·y) × y",
      calculation: `A = (${b.toFixed(4)} + ${z} × ${y.toFixed(4)}) × ${y.toFixed(4)} = ${A.toFixed(5)} m²`,
      result: `${A.toFixed(5)}`, unit: "m²",
    });
    steps.push({
      description: "Wetted perimeter",
      formula: "P = b + 2y√(1 + z^{2})",
      calculation: `P = ${b.toFixed(4)} + 2 × ${y.toFixed(4)} × √(1 + ${z}^{2}) = ${P.toFixed(5)} m`,
      result: `${P.toFixed(5)}`, unit: "m",
    });
  } else {
    const D = input.diameter!;
    const theta = 2 * Math.acos(1 - 2 * y / D);
    steps.push({
      description: "Central angle subtended by water surface",
      formula: "θ = 2·arccos(1 − 2y/D)",
      calculation: `θ = 2·arccos(1 − 2 × ${y.toFixed(4)} / ${D.toFixed(4)}) = ${(theta * 180 / Math.PI).toFixed(3)}°`,
    });
    steps.push({
      description: "Flow area — circular section",
      formula: "A = (D^{2}/8)(θ − sin θ)",
      calculation: `A = (${D.toFixed(4)}^{2} / 8)(${theta.toFixed(5)} − sin ${theta.toFixed(5)}) = ${A.toFixed(5)} m²`,
      result: `${A.toFixed(5)}`, unit: "m²",
    });
    steps.push({
      description: "Wetted perimeter",
      formula: "P = D·θ / 2",
      calculation: `P = ${D.toFixed(4)} × ${theta.toFixed(5)} / 2 = ${P.toFixed(5)} m`,
      result: `${P.toFixed(5)}`, unit: "m",
    });
  }

  steps.push({
    description: "Top width (free-surface width)",
    formula: shape === "rectangular" || shape === "wide" ? "T = b"
            : shape === "trapezoidal" ? "T = b + 2z·y"
            : "T = D·sin(θ/2)",
    calculation: `T = ${T.toFixed(5)} m`,
    result: `${T.toFixed(5)}`, unit: "m",
  });

  steps.push({
    description: "Hydraulic radius R<sub>h</sub> = A / P",
    formula: "R_h = A / P",
    calculation: `R_h = ${A.toFixed(5)} / ${P.toFixed(5)} = ${Rh.toFixed(5)} m`,
    result: `${Rh.toFixed(5)}`, unit: "m",
  });

  steps.push({
    description: "Hydraulic depth D<sub>h</sub> = A / T (used in Froude number)",
    formula: "D_h = A / T",
    calculation: `D_h = ${A.toFixed(5)} / ${T.toFixed(5)} = ${Dh.toFixed(5)} m`,
    result: `${Dh.toFixed(5)}`, unit: "m",
  });

  // Step 2: velocity (if derived from Q)
  if (input.flowRate !== undefined) {
    steps.push({
      description: "Mean cross-sectional velocity",
      formula: "V = Q / A",
      calculation: `V = ${Q.toFixed(5)} / ${A.toFixed(5)} = ${V.toFixed(5)} m/s`,
      result: `${V.toFixed(5)}`, unit: "m/s",
    });
  }

  // Step 3: Froude number
  steps.push({
    description: "Froude number — ratio of inertial to gravitational forces",
    formula: "Fr = V / √(g × D_h)",
    calculation: `Fr = ${V.toFixed(4)} / √(${g} × ${Dh.toFixed(5)}) = ${Fr.toFixed(5)}`,
    result: `${Fr.toFixed(5)}`,
  });

  steps.push({
    description: `Froude number classification  Fr ${Fr < 1 ? "<" : Fr > 1 ? ">" : "≈"} 1`,
    calculation: `Fr = ${Fr.toFixed(4)} \\to \\text{${result.froudeRegime} flow}`,
    result: result.froudeRegime,
  });

  // Step 4: Reynolds number
  steps.push({
    description: "Open-channel Reynolds number Re = V × R<sub>h</sub> / ν",
    formula: "Re = V × R_h / ν",
    calculation: `Re = ${V.toFixed(4)} × ${Rh.toFixed(5)} / ${input.kinematicViscosity.toExponential(3)} = ${Re.toFixed(1)}`,
    result: `${Re.toFixed(1)}`,
  });

  steps.push({
    description: `Reynolds number classification (open channel: <500 laminar, 500–12 500 transitional, >12 500 turbulent)`,
    calculation: `Re = ${Re.toFixed(0)} \\to \\text{${result.reynoldsRegime} flow}`,
    result: result.reynoldsRegime,
  });

  return steps;
}

// ============================================================================
// Reynolds Number – External Flow
// ============================================================================

export type ExternalGeometry = "flatPlate" | "cylinder" | "sphere" | "aerofoil";
export type ExternalFlowRegime = "creeping" | "laminar" | "transitional" | "supercritical";

export interface ReynoldsExternalInput {
  density:  number;   // kg/m³
  velocity: number;   // m/s
  length:   number;   // m  (plate length L, or cylinder/sphere diameter D)
  viscosity: number;  // Pa·s
  geometry: ExternalGeometry;
}

export interface ReynoldsExternalResult {
  reynoldsNumber:     number;
  kinematicViscosity: number;   // m²/s
  regime:             ExternalFlowRegime;
  interpretation:     string;
  criticalLength?:    number;   // m — flat plate only: x where transition occurs
}

export function calculateReynoldsExternal(input: ReynoldsExternalInput): ReynoldsExternalResult {
  const { density, velocity, length, viscosity, geometry } = input;
  if (density  <= 0) throw new Error("Density must be positive");
  if (velocity <  0) throw new Error("Velocity must be non-negative");
  if (length   <= 0) throw new Error("Characteristic length must be positive");
  if (viscosity <= 0) throw new Error("Viscosity must be positive");

  const Re = (density * velocity * length) / viscosity;
  const nu = viscosity / density;

  let regime: ExternalFlowRegime;
  let interpretation: string;
  let criticalLength: number | undefined;

  if (geometry === "flatPlate") {
    criticalLength = velocity > 0 ? (5e5 * nu) / velocity : undefined;
    if (Re < 5e5) {
      regime = "laminar";
      interpretation =
        "Laminar boundary layer over the entire plate length. Orderly streamlines with low skin-friction drag. Boundary layer thickness grows as δ ∝ √x.";
    } else if (Re < 1e7) {
      regime = "transitional";
      interpretation =
        "Mixed boundary layer — laminar from the leading edge to x<sub>cr</sub>, then turbulent from x<sub>cr</sub> to the trailing edge. Transition point Re<sub>x,cr</sub> ≈ 5×10⁵ (standard engineering value).";
    } else {
      regime = "supercritical";
      interpretation =
        "Fully turbulent boundary layer. Higher skin-friction drag; boundary layer thickens faster than the laminar case (δ ∝ x^(4/5)).";
    }
  } else if (geometry === "cylinder") {
    if (Re < 1) {
      regime = "creeping";
      interpretation =
        "Creeping (Stokes-like) flow past cylinder. Viscous forces completely dominate; no boundary-layer separation; C<sub>D</sub> ≈ 8π/Re.";
    } else if (Re < 2e5) {
      regime = "laminar";
      interpretation =
        "Subcritical regime. Laminar boundary layer on the cylinder surface; separation near 80° from the stagnation point. Wake becomes turbulent above Re ≈ 300. C<sub>D</sub> ≈ 1.0–1.2.";
    } else if (Re < 5e5) {
      regime = "transitional";
      interpretation =
        "Critical region (drag crisis). Laminar-to-turbulent boundary-layer transition causes the separation point to move downstream (~140°), dramatically reducing the wake and C<sub>D</sub> (from ~1.2 to ~0.3).";
    } else {
      regime = "supercritical";
      interpretation =
        "Supercritical regime. Turbulent boundary layer is fully established; delayed separation, narrower wake, and lower drag coefficient C<sub>D</sub> ≈ 0.2–0.4.";
    }
  } else if (geometry === "sphere") {
    if (Re < 1) {
      regime = "creeping";
      interpretation =
        "Creeping (Stokes) flow. Drag: F<sub>D</sub> = 3πμVD. C<sub>D</sub> = 24/Re.";
    } else if (Re < 2e5) {
      regime = "laminar";
      interpretation =
        "Laminar boundary layer on sphere. Separation and large wake; C<sub>D</sub> ≈ 0.4–0.5. Newton's drag law region for Re ≈ 1000–2×10⁵.";
    } else if (Re < 5e5) {
      regime = "transitional";
      interpretation =
        "Critical region for sphere (drag crisis). BL transition moves separation downstream; C<sub>D</sub> drops sharply from ~0.5 to ~0.1.";
    } else {
      regime = "supercritical";
      interpretation =
        "Supercritical regime. Turbulent BL delays separation; smaller wake; C<sub>D</sub> ≈ 0.1–0.2.";
    }
  } else {
    // aerofoil — characteristic length is chord c
    criticalLength = velocity > 0 ? (5e5 * nu) / velocity : undefined;
    if (Re < 1e4) {
      regime = "creeping";
      interpretation =
        "Ultra-low Re (insects, micro air vehicles). Viscous forces dominate; very poor lift-to-drag ratio. Flow is laminar but highly prone to separation over most of the chord.";
    } else if (Re < 1e5) {
      regime = "laminar";
      interpretation =
        "Low Re (model aircraft, small drones, MAVs). Laminar boundary layer is prone to forming a separation bubble on the suction surface. Performance is highly sensitive to surface finish and free-stream turbulence intensity.";
    } else if (Re < 5e5) {
      regime = "transitional";
      interpretation =
        "Transitional Re (gliders, UAVs, small wind turbines). Laminar-to-turbulent BL transition occurs on the suction surface. A laminar separation bubble may persist; L/D ratio improves with increasing Re.";
    } else {
      regime = "supercritical";
      interpretation =
        "High Re (general aviation, large wind turbines, commercial aircraft). BL transitions close to the leading edge on the suction surface. Turbulent BL throughout; classical thin-aerofoil theory and panel methods apply reliably.";
    }
  }

  return { reynoldsNumber: Re, kinematicViscosity: nu, regime, interpretation, criticalLength };
}

export function generateReynoldsExternalSteps(
  input:  ReynoldsExternalInput,
  result: ReynoldsExternalResult,
): Step[] {
  const { density, velocity, length, viscosity, geometry } = input;
  const { reynoldsNumber, kinematicViscosity, criticalLength } = result;
  const L = geometry === "flatPlate" ? "L" : geometry === "aerofoil" ? "c" : "D";

  const steps: Step[] = [
    {
      description: "Reynolds number formula for external flow",
      formula: `Re = ρ V ${L} / μ = V ${L} / ν`,
    },
    {
      description: "Substitute values",
      calculation: `Re = (${fmtN(density)} kg/m³ × ${fmtN(velocity)} m/s × ${fmtN(length)} m) / ${fmtN(viscosity)} Pa·s`,
    },
    {
      description: "Reynolds number",
      calculation: `Re = ${fmtN(density * velocity * length)} / ${fmtN(viscosity)}`,
      result: `Re = ${fmtN(reynoldsNumber)}`,
      unit: "dimensionless",
    },
    {
      description: "Kinematic viscosity  ν = μ / ρ",
      calculation: `ν = ${fmtN(viscosity)} / ${fmtN(density)}`,
      result: `ν = ${kinematicViscosity.toExponential(4)} m²/s`,
    },
  ];

  if ((geometry === "flatPlate" || geometry === "aerofoil") && criticalLength !== undefined) {
    const isAerofoil = geometry === "aerofoil";
    const pct = isAerofoil
      ? ` (${parseFloat(((criticalLength / length) * 100).toPrecision(3))}% of chord)`
      : "";
    steps.push({
      description: isAerofoil
        ? `Boundary layer transition position on chord: x = (5×10⁵ × ν) / V∞ = ${fmtN(criticalLength)} m${pct}`
        : "Critical transition length: x = (5×10⁵ × ν) / V",
      formula: isAerofoil ? "x_{tr} = (5 × 10⁵ × ν) / V∞" : "x_{cr} = (5 × 10⁵ × ν) / V",
      calculation: `x = (5 \\times 10^{5} \\times ${kinematicViscosity.toExponential(4)}) / ${fmtN(velocity)}`,
      result: `x = ${fmtN(criticalLength)} \\text{ m}`,
    });
  }

  steps.push({
    description: "Classify flow regime",
    result: `Re = ${fmtN(reynoldsNumber)} → \\text{${result.regime}}`,
  });

  return steps;
}

// ============================================================================
// Hydrostatic Force on Submerged Plane Surface + Center of Pressure
// ============================================================================

export type PlaneShape = "rectangle" | "circle" | "triangle";

export interface HydrostaticForceInput {
  density:       number;   // kg/m³
  gravity?:      number;   // m/s² (default 9.81)
  depthCentroid: number;   // h̄  — vertical depth to centroid [m]
  angleDeg:      number;   // θ  — angle of surface with horizontal [deg]; 90 = vertical
  shape:         PlaneShape;
  dim1:          number;   // rectangle: width b [m]; circle: diameter D [m]; triangle: base b [m]
  dim2?:         number;   // rectangle: height H [m]; triangle: height H [m]; circle: unused
}

export interface HydrostaticForceResult {
  force:           number;  // F = ρg h̄ A  [N]
  area:            number;  // A [m²]
  secondMoment:    number;  // I_G [m⁴] — centroidal, about axis parallel to free surface
  slantCentroid:   number;  // ȳ = h̄ / sin θ  [m] (Infinity for horizontal surface)
  slantCP:         number;  // y_cp = ȳ + I_G/(ȳ A)  [m]
  depthCP:         number;  // h_cp = y_cp sin θ  [m]
  eccentricity:    number;  // e = h_cp − h̄  [m] (always ≥ 0)
  pressureCentroid: number; // ρg h̄  [Pa]
  pressureCP:      number;  // ρg h_cp  [Pa]
}

function areaAndMoment(shape: PlaneShape, dim1: number, dim2: number | undefined) {
  if (shape === "rectangle") {
    const b = dim1, H = dim2 ?? dim1;
    return { area: b * H, IG: (b * H ** 3) / 12 };
  }
  if (shape === "circle") {
    const r = dim1 / 2;
    return { area: Math.PI * r ** 2, IG: (Math.PI * r ** 4) / 4 };
  }
  // triangle (base b, height H; apex pointing away from free surface)
  const b = dim1, H = dim2 ?? dim1;
  return { area: (b * H) / 2, IG: (b * H ** 3) / 36 };
}

export function calculateHydrostaticForce(input: HydrostaticForceInput): HydrostaticForceResult {
  const { density, gravity = 9.81, depthCentroid, angleDeg, shape, dim1, dim2 } = input;

  if (density      <= 0) throw new Error("Density must be positive");
  if (depthCentroid < 0) throw new Error("Depth to centroid must be non-negative");
  if (dim1         <= 0) throw new Error("First dimension must be positive");
  if (dim2 !== undefined && dim2 <= 0) throw new Error("Second dimension must be positive");
  if (angleDeg < 0 || angleDeg > 90) throw new Error("Angle must be between 0° and 90°");

  const { area: A, IG } = areaAndMoment(shape, dim1, dim2);
  const F = density * gravity * depthCentroid * A;
  const pCentroid = density * gravity * depthCentroid;

  const theta = (angleDeg * Math.PI) / 180;
  const sinT  = Math.sin(theta);

  let slantCP: number;
  let depthCP: number;
  let slantCentroid: number;

  if (sinT < 1e-9) {
    // Horizontal surface: uniform pressure, center of pressure = centroid
    slantCentroid = Infinity;
    slantCP       = Infinity;
    depthCP       = depthCentroid;
  } else {
    slantCentroid = depthCentroid / sinT;
    slantCP       = slantCentroid + IG / (slantCentroid * A);
    depthCP       = slantCP * sinT;
  }

  const eccentricity = depthCP - depthCentroid;
  const pCP          = density * gravity * depthCP;

  return {
    force: F,
    area: A,
    secondMoment: IG,
    slantCentroid,
    slantCP,
    depthCP,
    eccentricity,
    pressureCentroid: pCentroid,
    pressureCP: pCP,
  };
}

export function generateHydrostaticForceSteps(
  input:  HydrostaticForceInput,
  result: HydrostaticForceResult,
): Step[] {
  const { density, gravity = 9.81, depthCentroid, angleDeg, shape, dim1, dim2 } = input;
  const { force, area, secondMoment, slantCentroid, slantCP, depthCP, eccentricity } = result;
  const isHorizontal = angleDeg < 0.01;
  const shapeLabel = shape === "rectangle" ? "b × H" : shape === "circle" ? "π(D/2)²" : "½ b H";
  const IGlabel    = shape === "rectangle" ? "b H³/12" : shape === "circle" ? "πD⁴/64" : "b H³/36";

  const steps: Step[] = [
    {
      description: "Compute surface area A",
      formula: `A = ${shapeLabel}`,
      calculation: shape === "circle"
        ? `A = π × (${fmtN(dim1)}/2)² = π × ${fmtN((dim1 / 2) ** 2)}`
        : `A = ${fmtN(dim1)} × ${fmtN(dim2 ?? dim1)}`,
      result: `A = ${fmtN(area)} m²`,
    },
    {
      description: "Centroidal second moment of area I<sub>G</sub>",
      formula: `I_{G} = ${IGlabel}`,
      result: `I_{G} = ${secondMoment.toExponential(4)} m⁴`,
    },
    {
      description: "Resultant hydrostatic force  F = ρ g h̄ A",
      formula: "F = ρ g h̄ A",
      calculation: `F = ${fmtN(density)} × ${gravity} × ${fmtN(depthCentroid)} × ${fmtN(area)}`,
      result: `F = ${fmtN(force)} N  (${fmtN(force / 1000)} kN)`,
      unit: "N",
    },
  ];

  if (!isHorizontal) {
    steps.push({
      description: `Slant distance to centroid  ȳ = h̄ / sin θ`,
      formula: "ȳ = h̄ / sin θ",
      calculation: `ȳ = ${fmtN(depthCentroid)} / sin(${angleDeg}°) = ${fmtN(depthCentroid)} / ${fmtN(Math.sin((angleDeg * Math.PI) / 180))}`,
      result: `ȳ = ${fmtN(slantCentroid)} m`,
    });
    steps.push({
      description: "Center of pressure (slant)  y<sub>cp</sub> = ȳ + I<sub>G</sub> / (ȳ A)",
      formula: "y_{cp} = ȳ + I_{G} / (ȳ A)",
      calculation: `y_{cp} = ${fmtN(slantCentroid)} + ${secondMoment.toExponential(4)} / (${fmtN(slantCentroid)} × ${fmtN(area)})`,
      result: `y_{cp} = ${fmtN(slantCP)} m`,
    });
    steps.push({
      description: "Vertical depth to center of pressure  h<sub>cp</sub> = y<sub>cp</sub> sin θ",
      formula: "h_{cp} = y_{cp} × sin θ",
      calculation: `h_{cp} = ${fmtN(slantCP)} × sin(${angleDeg}°)`,
      result: `h_{cp} = ${fmtN(depthCP)} m`,
    });
  } else {
    steps.push({
      description: "Horizontal surface: pressure is uniform → center of pressure = centroid",
      result: `h_{cp} = h̄ = ${fmtN(depthCentroid)} m  (e = 0)`,
    });
  }

  steps.push({
    description: "Eccentricity  e = h<sub>cp</sub> − h̄  (distance center-of-pressure is below centroid)",
    formula: "e = h_{cp} − h̄",
    calculation: `e = ${fmtN(depthCP)} − ${fmtN(depthCentroid)}`,
    result: `e = ${fmtN(eccentricity)} m`,
  });

  return steps;
}

// ============================================================================
// Bulk Modulus & Compressibility
// ============================================================================

export type BulkModulusMode = "fromDeltaP" | "direct";

export interface BulkModulusInput {
  mode:           BulkModulusMode;
  deltaP?:        number;   // Pa — pressure increase (positive)
  volumeStrain?:  number;   // dimensionless — |ΔV/V₀|, compression = positive
  K?:             number;   // Pa — bulk modulus (direct mode)
  density?:       number;   // kg/m³ — optional, for speed of sound
}

export interface BulkModulusResult {
  K:            number;   // Pa
  beta:         number;   // Pa⁻¹  (compressibility)
  speedOfSound: number | null; // m/s — null if density not provided
  volumeStrain: number;   // dimensionless — echoed or computed from ΔP/K
  deltaP:       number;   // Pa — echoed or computed from K × volumeStrain
}

export function calculateBulkModulus(input: BulkModulusInput): BulkModulusResult {
  const { mode, deltaP, volumeStrain, K: Kin, density } = input;

  let K: number;
  let strain: number;
  let dP: number;

  if (mode === "fromDeltaP") {
    if (deltaP === undefined || deltaP <= 0)       throw new Error("ΔP must be a positive number");
    if (volumeStrain === undefined || volumeStrain <= 0) throw new Error("Volume strain must be a positive number");
    K      = deltaP / volumeStrain;
    strain = volumeStrain;
    dP     = deltaP;
  } else {
    if (Kin === undefined || Kin <= 0) throw new Error("Bulk modulus must be a positive number");
    K      = Kin;
    strain = deltaP !== undefined && deltaP > 0 ? deltaP / K : 0;
    dP     = deltaP ?? 0;
  }

  const beta = 1 / K;
  const c    = density !== undefined && density > 0 ? Math.sqrt(K / density) : null;

  return { K, beta, speedOfSound: c, volumeStrain: strain, deltaP: dP };
}

export function generateBulkModulusSteps(
  input:  BulkModulusInput,
  result: BulkModulusResult,
): Step[] {
  const { mode, density } = input;
  const { K, beta, speedOfSound, volumeStrain, deltaP } = result;
  const steps: Step[] = [];

  if (mode === "fromDeltaP") {
    steps.push({
      description: "Bulk modulus from pressure and volume strain",
      formula: "K = ΔP / |ΔV/V₀|",
    });
    steps.push({
      description: "Substitute values",
      calculation: `K = ${fmtN(deltaP)} Pa / ${fmtN(volumeStrain)}`,
      result: `K = ${fmtN(K)} Pa  (${fmtN(K / 1e9)} GPa)`,
    });
  } else {
    steps.push({
      description: "Bulk modulus given directly",
      result: `K = ${fmtN(K)} Pa  (${fmtN(K / 1e9)} GPa)`,
    });
  }

  steps.push({
    description: "Compressibility  β = 1 / K",
    formula: "β = 1 / K",
    calculation: `β = 1 / ${fmtN(K)}`,
    result: `β = ${beta.toExponential(4)} Pa⁻¹`,
  });

  if (speedOfSound !== null && density !== undefined) {
    steps.push({
      description: "Speed of sound  c = √(K / ρ)",
      formula: "c = √(K / ρ)",
      calculation: `c = √(${fmtN(K)} / ${fmtN(density)})`,
      result: `c = ${fmtN(speedOfSound)} m/s`,
    });
  }

  if (mode === "fromDeltaP" || (mode === "direct" && deltaP > 0)) {
    const strainPct = volumeStrain * 100;
    steps.push({
      description: "Volume change  |ΔV/V₀| = ΔP / K",
      formula: "|ΔV/V₀| = ΔP / K",
      result: `|ΔV/V₀| = ${fmtN(volumeStrain)} = ${fmtN(strainPct)} %`,
    });
  }

  return steps;
}

// ============================================================================
// Ideal Gas Density
// ============================================================================

export interface IdealGasInput {
  pressure:    number;   // Pa — absolute
  temperature: number;   // K
  R:           number;   // J/(kg·K) — specific gas constant
}

export interface IdealGasResult {
  density:       number;  // kg/m³
  specificVolume: number; // m³/kg
  molarVolume:   number;  // m³/mol  (R_u T / P)
}

const R_UNIVERSAL = 8.314462;  // J/(mol·K)

export function calculateIdealGasDensity(input: IdealGasInput): IdealGasResult {
  const { pressure, temperature, R } = input;
  if (pressure    <= 0) throw new Error("Pressure must be positive (absolute)");
  if (temperature <= 0) throw new Error("Temperature must be positive (Kelvin)");
  if (R           <= 0) throw new Error("Specific gas constant must be positive");

  const density       = pressure / (R * temperature);
  const specificVolume = 1 / density;
  const molarVolume   = R_UNIVERSAL * temperature / pressure;

  return { density, specificVolume, molarVolume };
}

export function generateIdealGasSteps(
  input:  IdealGasInput,
  result: IdealGasResult,
): Step[] {
  const { pressure, temperature, R } = input;
  return [
    {
      description: "Ideal gas law: ρ = P / (R T)",
      formula: "ρ = P / (R T)",
    },
    {
      description: "Substitute values",
      calculation: `ρ = ${fmtN(pressure)} Pa / (${fmtN(R)} J/(kg·K) × ${fmtN(temperature)} K)`,
    },
    {
      description: "Denominator  R × T",
      calculation: `R T = ${fmtN(R)} × ${fmtN(temperature)} = ${fmtN(R * temperature)} J/kg`,
    },
    {
      description: "Density",
      calculation: `ρ = ${fmtN(pressure)} / ${fmtN(R * temperature)}`,
      result: fmtN(result.density),
      unit: "kg/m³",
    },
    {
      description: "Specific volume  v = 1 / ρ",
      formula: "v = 1 / ρ",
      result: fmtN(result.specificVolume),
      unit: "m³/kg",
    },
  ];
}

// ============================================================================
// Metacentric Height
// ============================================================================

export type FloatingShape = "rectangle" | "circle";
export type StabilityClass = "stable" | "neutral" | "unstable";

export interface MetacentricHeightInput {
  shape:      FloatingShape;
  // rectangle: beamB × lengthL × draft
  beamB:      number;   // m — waterplane breadth (transverse)
  lengthL?:   number;   // m — waterplane length (longitudinal); rectangle only
  draft:      number;   // m — depth of submersion
  KG:         number;   // m — height of centre of gravity above keel
  // optional: fluid density for displacement force
  density?:   number;   // kg/m³ — water density (default 1025)
}

export interface MetacentricHeightResult {
  KB:       number;           // m — centre of buoyancy above keel
  BM:       number;           // m — metacentric radius = I / V
  KM:       number;           // m — metacentre above keel = KB + BM
  BG:       number;           // m — distance B to G (positive if G above B)
  GM:       number;           // m — metacentric height
  stability: StabilityClass;
  interpretation: string;
  waterplaneI: number;        // m⁴ — second moment of waterplane area
  displacedV:  number;        // m³ — displaced volume
  displacement?: number;      // N  — buoyancy force (if density given)
}

export function calculateMetacentricHeight(input: MetacentricHeightInput): MetacentricHeightResult {
  const { shape, beamB, lengthL, draft, KG, density = 1025 } = input;
  if (beamB <= 0)  throw new Error("Beam must be positive");
  if (draft <= 0)  throw new Error("Draft must be positive");
  if (KG    <  0)  throw new Error("KG must be non-negative");

  let I: number;   // waterplane second moment of area (about longitudinal axis)
  let V: number;   // displaced volume

  if (shape === "rectangle") {
    const L = lengthL && lengthL > 0 ? lengthL : 1;
    I = (L * beamB ** 3) / 12;
    V = L * beamB * draft;
  } else {
    // Circle (cylinder): waterplane is a circle of diameter = beamB
    const r = beamB / 2;
    I = (Math.PI * r ** 4) / 4;
    V = Math.PI * r ** 2 * draft;
  }

  const KB  = draft / 2;          // centroid of rectangular submerged section
  const BM  = I / V;
  const KM  = KB + BM;
  const BG  = KG - KB;
  const GM  = KM - KG;

  let stability: StabilityClass;
  let interpretation: string;
  if (GM > 0.001) {
    stability = "stable";
    interpretation = `Stable (GM = ${fmtN(GM)} m > 0). The vessel will right itself after a small heel. Larger GM means a stiffer but potentially uncomfortable roll period.`;
  } else if (GM < -0.001) {
    stability = "unstable";
    interpretation = `Unstable (GM = ${fmtN(GM)} m < 0). The vessel will capsize under any small disturbance. Increase beam, reduce KG, or add ballast.`;
  } else {
    stability = "neutral";
    interpretation = `Neutral equilibrium (GM ≈ 0). Any heel angle is maintained without a restoring or overturning moment.`;
  }

  const displacement = density * 9.81 * V;

  return { KB, BM, KM, BG, GM, stability, interpretation, waterplaneI: I, displacedV: V, displacement };
}

export function generateMetacentricHeightSteps(
  input:  MetacentricHeightInput,
  result: MetacentricHeightResult,
): Step[] {
  const { shape, beamB, lengthL, draft, KG } = input;
  const { KB, BM, KM, BG, GM, waterplaneI: I, displacedV: V } = result;
  const L = (shape === "rectangle" && lengthL && lengthL > 0) ? lengthL : 1;

  const steps: Step[] = [
    {
      description: shape === "rectangle"
        ? "Waterplane second moment of area  I = L B³ / 12"
        : "Waterplane second moment of area  I = π r⁴ / 4",
      formula: shape === "rectangle" ? "I = L B³ / 12" : "I = π (B/2)⁴ / 4",
      calculation: shape === "rectangle"
        ? `I = ${fmtN(L)} × ${fmtN(beamB)}³ / 12`
        : `I = π × (${fmtN(beamB)}/2)⁴ / 4`,
      result: `I = ${fmtN(I)} m⁴`,
    },
    {
      description: shape === "rectangle"
        ? "Displaced volume  V = L × B × D"
        : "Displaced volume  V = π (B/2)² × D",
      formula: shape === "rectangle" ? "V = L B D" : "V = π r² D",
      calculation: shape === "rectangle"
        ? `V = ${fmtN(L)} × ${fmtN(beamB)} × ${fmtN(draft)}`
        : `V = π × (${fmtN(beamB)}/2)² × ${fmtN(draft)}`,
      result: `V = ${fmtN(V)} m³`,
    },
    {
      description: "Centre of buoyancy  KB = D / 2  (centroid of submerged rectangle)",
      formula: "KB = D / 2",
      calculation: `KB = ${fmtN(draft)} / 2`,
      result: `KB = ${fmtN(KB)} m`,
    },
    {
      description: "Metacentric radius  BM = I / V",
      formula: "BM = I / V",
      calculation: `BM = ${fmtN(I)} / ${fmtN(V)}`,
      result: `BM = ${fmtN(BM)} m`,
    },
    {
      description: "Height of metacentre above keel  KM = KB + BM",
      formula: "KM = KB + BM",
      calculation: `KM = ${fmtN(KB)} + ${fmtN(BM)}`,
      result: `KM = ${fmtN(KM)} m`,
    },
    {
      description: "Distance B to G  BG = KG − KB",
      formula: "BG = KG − KB",
      calculation: `BG = ${fmtN(KG)} − ${fmtN(KB)}`,
      result: `BG = ${fmtN(BG)} m  ${BG > 0 ? "(G above B)" : "(G below B)"}`,
    },
    {
      description: "Metacentric height  GM = KM − KG",
      formula: "GM = KM − KG = KB + BM − KG",
      calculation: `GM = ${fmtN(KM)} − ${fmtN(KG)}`,
      result: `GM = ${fmtN(GM)} m`,
    },
  ];

  return steps;
}
