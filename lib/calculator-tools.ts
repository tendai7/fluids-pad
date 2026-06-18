/**
 * Calculator tool definitions for Claude tool use in Ask Fluid.
 * 10 core tools covering the most frequent conversational calculation requests.
 */

import {
  calculateReynoldsNumber,
  calculateColebrookWhite,
  calculatePipeHeadLoss,
  calculatePumpPower,
  calculatePipeFlowRate,
  calculateHydrostatic,
  calculateMachNumber,
  calculateOrificeFlow,
  calculateManningsEquation,
  calculateBernoulli,
} from "./fluids";

// ─── Tool definitions (Anthropic schema) ────────────────────────────────────

export const CALC_TOOLS = [
  {
    name: "reynolds_number",
    description: "Calculate Reynolds number Re = ρVD/μ and determine whether flow is laminar, transitional, or turbulent.",
    input_schema: {
      type: "object" as const,
      properties: {
        density:   { type: "number", description: "Fluid density ρ in kg/m³" },
        velocity:  { type: "number", description: "Mean flow velocity V in m/s" },
        diameter:  { type: "number", description: "Pipe or channel diameter D in m" },
        viscosity: { type: "number", description: "Dynamic viscosity μ in Pa·s" },
      },
      required: ["density", "velocity", "diameter", "viscosity"],
    },
  },
  {
    name: "friction_factor",
    description: "Calculate Darcy friction factor f using the Colebrook-White equation given Reynolds number and pipe roughness.",
    input_schema: {
      type: "object" as const,
      properties: {
        reynolds_number:   { type: "number", description: "Reynolds number Re (dimensionless)" },
        roughness_mm:      { type: "number", description: "Pipe absolute roughness ε in mm (use 0 for smooth)" },
        diameter_m:        { type: "number", description: "Pipe inner diameter D in m" },
      },
      required: ["reynolds_number", "roughness_mm", "diameter_m"],
    },
  },
  {
    name: "pipe_head_loss",
    description: "Calculate Darcy-Weisbach head loss hf = f·(L/D)·(V²/2g) for flow through a straight pipe.",
    input_schema: {
      type: "object" as const,
      properties: {
        friction_factor: { type: "number", description: "Darcy friction factor f (dimensionless)" },
        length_m:        { type: "number", description: "Pipe length L in m" },
        diameter_m:      { type: "number", description: "Pipe diameter D in m" },
        velocity_ms:     { type: "number", description: "Mean flow velocity V in m/s" },
      },
      required: ["friction_factor", "length_m", "diameter_m", "velocity_ms"],
    },
  },
  {
    name: "pump_power",
    description: "Calculate hydraulic and shaft pump power P = ρgQH/η.",
    input_schema: {
      type: "object" as const,
      properties: {
        flow_rate_m3s: { type: "number", description: "Volume flow rate Q in m³/s" },
        head_m:        { type: "number", description: "Total pump head H in m" },
        density:       { type: "number", description: "Fluid density ρ in kg/m³" },
        efficiency:    { type: "number", description: "Overall pump efficiency η (0–1, default 1 if not given)" },
      },
      required: ["flow_rate_m3s", "head_m", "density"],
    },
  },
  {
    name: "pipe_flow_rate",
    description: "Calculate volumetric flow rate Q = (π/4)D²·V from pipe diameter and mean velocity.",
    input_schema: {
      type: "object" as const,
      properties: {
        velocity_ms:  { type: "number", description: "Mean flow velocity V in m/s" },
        diameter_m:   { type: "number", description: "Pipe internal diameter D in m" },
      },
      required: ["velocity_ms", "diameter_m"],
    },
  },
  {
    name: "hydrostatic_pressure",
    description: "Calculate gauge and absolute pressure at a given depth using P = ρgh.",
    input_schema: {
      type: "object" as const,
      properties: {
        depth_m:  { type: "number", description: "Depth below free surface h in m" },
        density:  { type: "number", description: "Fluid density ρ in kg/m³" },
      },
      required: ["depth_m", "density"],
    },
  },
  {
    name: "mach_number",
    description: "Calculate Mach number M = V/c = V/√(γRT) for a compressible gas flow and determine flow regime.",
    input_schema: {
      type: "object" as const,
      properties: {
        velocity_ms:  { type: "number", description: "Flow velocity V in m/s" },
        temperature_K:{ type: "number", description: "Static temperature T in Kelvin" },
        gamma:        { type: "number", description: "Specific heat ratio γ (default 1.4 for air)" },
      },
      required: ["velocity_ms", "temperature_K"],
    },
  },
  {
    name: "orifice_flow",
    description: "Calculate volumetric flow rate through an orifice or nozzle: Q = Cd·A·√(2ΔP/ρ).",
    input_schema: {
      type: "object" as const,
      properties: {
        discharge_coeff: { type: "number", description: "Discharge coefficient Cd (typical 0.6–0.98)" },
        area_m2:         { type: "number", description: "Orifice throat area A in m²" },
        pressure_diff_Pa:{ type: "number", description: "Pressure differential ΔP across orifice in Pa" },
        density:         { type: "number", description: "Fluid density ρ in kg/m³" },
      },
      required: ["discharge_coeff", "area_m2", "pressure_diff_Pa", "density"],
    },
  },
  {
    name: "mannings_velocity",
    description: "Calculate mean channel velocity using Manning's equation: V = (1/n)·Rh^(2/3)·S^(1/2).",
    input_schema: {
      type: "object" as const,
      properties: {
        manning_n:        { type: "number", description: "Manning's roughness coefficient n" },
        hydraulic_radius: { type: "number", description: "Hydraulic radius Rh = A/P in m" },
        slope:            { type: "number", description: "Channel bed slope S (m/m, dimensionless)" },
      },
      required: ["manning_n", "hydraulic_radius", "slope"],
    },
  },
  {
    name: "bernoulli_point2_pressure",
    description: "Apply Bernoulli's equation to find pressure at point 2 given conditions at point 1: P2 = P1 + ½ρ(V1²−V2²) + ρg(z1−z2).",
    input_schema: {
      type: "object" as const,
      properties: {
        pressure1_Pa:  { type: "number", description: "Static pressure at point 1 in Pa" },
        velocity1_ms:  { type: "number", description: "Flow velocity at point 1 in m/s" },
        elevation1_m:  { type: "number", description: "Elevation at point 1 in m" },
        velocity2_ms:  { type: "number", description: "Flow velocity at point 2 in m/s" },
        elevation2_m:  { type: "number", description: "Elevation at point 2 in m" },
        density:       { type: "number", description: "Fluid density ρ in kg/m³" },
      },
      required: ["pressure1_Pa", "velocity1_ms", "elevation1_m", "velocity2_ms", "elevation2_m", "density"],
    },
  },
] as const;

export const TOOL_LABELS: Record<string, string> = {
  reynolds_number:          "Reynolds Number Calculator",
  friction_factor:          "Colebrook-White Friction Factor",
  pipe_head_loss:           "Darcy-Weisbach Head Loss",
  pump_power:               "Pump Power Calculator",
  pipe_flow_rate:           "Pipe Flow Rate",
  hydrostatic_pressure:     "Hydrostatic Pressure",
  mach_number:              "Mach Number Calculator",
  orifice_flow:             "Orifice Flow Rate",
  mannings_velocity:        "Manning's Equation",
  bernoulli_point2_pressure:"Bernoulli Equation",
};

// ─── Tool executor ───────────────────────────────────────────────────────────

type ToolInput = Record<string, unknown>;

export function executeTool(name: string, input: ToolInput): string {
  try {
    switch (name) {
      case "reynolds_number": {
        const result = calculateReynoldsNumber({
          density:   input.density   as number,
          velocity:  input.velocity  as number,
          diameter:  input.diameter  as number,
          viscosity: input.viscosity as number,
        });
        return JSON.stringify({
          reynolds_number: +result.reynoldsNumber.toPrecision(5),
          regime: result.regime,
          interpretation: result.interpretation,
        });
      }

      case "friction_factor": {
        const Re  = input.reynolds_number as number;
        const eps = input.roughness_mm    as number;
        const D   = input.diameter_m      as number;
        const eD  = eps / (1000 * D);
        const result = calculateColebrookWhite({ reynoldsNumber: Re, relativeRoughness: eD });
        return JSON.stringify({
          darcy_friction_factor: +result.frictionFactor.toPrecision(5),
          regime: result.regime,
          relative_roughness: +eD.toPrecision(4),
          interpretation: result.interpretation,
        });
      }

      case "pipe_head_loss": {
        const result = calculatePipeHeadLoss({
          frictionFactor: input.friction_factor as number,
          length:         input.length_m        as number,
          diameter:       input.diameter_m      as number,
          velocity:       input.velocity_ms     as number,
        });
        return JSON.stringify({
          head_loss_m:    +result.headLoss.toPrecision(5),
          velocity_head_m:+result.velocityHead.toPrecision(4),
          ld_ratio:       +result.ldRatio.toPrecision(4),
          interpretation: result.interpretation,
        });
      }

      case "pump_power": {
        const result = calculatePumpPower({
          flowRate:   input.flow_rate_m3s as number,
          head:       input.head_m        as number,
          density:    input.density       as number,
          efficiency: (input.efficiency   as number | undefined) ?? 1,
        });
        return JSON.stringify({
          hydraulic_power_W:  +result.hydraulicPower.toPrecision(5),
          shaft_power_W:      +result.power.toPrecision(5),
          shaft_power_kW:     +result.powerKW.toPrecision(4),
          shaft_power_hp:     +result.powerHP.toPrecision(4),
          interpretation:     result.interpretation,
        });
      }

      case "pipe_flow_rate": {
        const result = calculatePipeFlowRate({
          velocity: input.velocity_ms as number,
          diameter: input.diameter_m  as number,
        });
        return JSON.stringify({
          flow_rate_m3s: +result.flowRate.toPrecision(5),
          area_m2:       +(Math.PI / 4 * Math.pow(input.diameter_m as number, 2)).toPrecision(4),
        });
      }

      case "hydrostatic_pressure": {
        const result = calculateHydrostatic({
          depth:   input.depth_m as number,
          density: input.density as number,
        });
        return JSON.stringify({
          gauge_pressure_Pa:    +result.gaugePressure.toPrecision(5),
          gauge_pressure_kPa:   +(result.gaugePressure / 1000).toPrecision(4),
          absolute_pressure_Pa: +result.absolutePressure.toPrecision(6),
          interpretation:       result.interpretation,
        });
      }

      case "mach_number": {
        const result = calculateMachNumber({
          velocity:    input.velocity_ms   as number,
          temperature: input.temperature_K as number,
          gamma:       (input.gamma as number | undefined) ?? 1.4,
        });
        return JSON.stringify({
          mach_number:         +result.machNumber.toPrecision(5),
          speed_of_sound_ms:   +result.speedOfSound.toPrecision(5),
          regime:              result.regime,
          stagnation_temp_K:   +result.stagnationTemp.toPrecision(5),
          interpretation:      result.interpretation,
        });
      }

      case "orifice_flow": {
        const areaSI = input.area_m2 as number;
        const result = calculateOrificeFlow({
          dischargeCoefficient: input.discharge_coeff  as number,
          diameter:             2 * Math.sqrt(areaSI / Math.PI),
          pressureDifference:   input.pressure_diff_Pa  as number,
          density:              input.density           as number,
        });
        return JSON.stringify({
          flow_rate_m3s:  +result.flowRate.toPrecision(5),
          velocity_ms:    +result.velocity.toPrecision(5),
          interpretation: result.interpretation,
        });
      }

      case "mannings_velocity": {
        const result = calculateManningsEquation({
          mode:           "findV",
          manningN:       input.manning_n        as number,
          hydraulicRadius:input.hydraulic_radius as number,
          slope:          input.slope            as number,
        });
        return JSON.stringify({
          velocity_ms:    +result.velocity.toPrecision(5),
          interpretation: result.interpretation,
        });
      }

      case "bernoulli_point2_pressure": {
        const result = calculateBernoulli({
          pressure1:  input.pressure1_Pa as number,
          velocity1:  input.velocity1_ms as number,
          elevation1: input.elevation1_m as number,
          velocity2:  input.velocity2_ms as number,
          elevation2: input.elevation2_m as number,
          density:    input.density      as number,
        });
        return JSON.stringify({
          pressure2_Pa:  +result.pressure2.toPrecision(6),
          pressure2_kPa: +(result.pressure2 / 1000).toPrecision(5),
          interpretation: result.interpretation,
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : "Calculation error",
    });
  }
}
